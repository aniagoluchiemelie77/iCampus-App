import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useSocket } from '../hooks/useSocket';
import { fetchLectureById, fetchOngoingLecture } from '../api/localGetApis';
import { useAppSelector } from '../hooks/hooks';
import { initialState } from './UserSlice';
import { useTheme } from './ThemeContext';
import { navigate, navigationRef } from './navigationContext';
import { Lecture } from '../types/firebase';
import { openLecturerAttendance } from '../utils/lectureAttendance';
import { resolveLectureTime } from '../utils/lectureTime';
import { safeParseDate } from '../utils/dateFormatter';

type ActionKind = 'join-class' | 'start-assessment' | 'mark-attendance';

export interface PersistentAction {
  id: string;
  kind: ActionKind;
  title: string;
  message: string;
  lecture?: Lecture | null;
  course?: any;
  assessmentId?: string;
  /** Epoch ms after which the prompt is stale and must not be shown. */
  expiresAt: number;
}

interface AssessmentPrompt {
  assessmentId: string;
  course: any;
  title?: string;
  message?: string;
  /** When the assessment closes (e.g. its due date). */
  expiresAt?: Date | string | number | null;
}

interface PersistentActionContextValue {
  showAssessmentPrompt: (prompt: AssessmentPrompt) => void;
}

interface StoredState {
  actions: PersistentAction[];
  /** id -> epoch ms until which a dismissed prompt stays suppressed. */
  dismissed: Record<string, number>;
}

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
// A lecturer's attendance session is 5 min plus 2-min extensions.
const ATTENDANCE_TTL = 30 * MINUTE;
// Live class with no usable end time.
const LIVE_CLASS_TTL = 3 * HOUR;
// Assessment reminder with no due date.
const ASSESSMENT_TTL = 6 * HOUR;
// How long after the scheduled end a server-reported "ongoing" lecture is still believable.
const ONGOING_GRACE = 30 * MINUTE;
// How often expired prompts are swept while one is pending.
const SWEEP_INTERVAL = 30 * 1000;

const LEGACY_STORAGE_KEY = 'icampus_persistent_classroom_actions';
const storageKeyFor = (uid: string) => `${LEGACY_STORAGE_KEY}:${uid}`;

const PersistentActionContext = createContext<PersistentActionContextValue>({
  showAssessmentPrompt: () => undefined,
});

const normalizeLecture = (lecture: any): Lecture => lecture as Lecture;

const toMs = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const d = safeParseDate(value as any);
  return d ? d.getTime() : null;
};

const isClosedStatus = (lecture: any) =>
  lecture?.status === 'completed' || lecture?.status === 'cancelled' || lecture?.status === 'postponed';

/** Lecture end, or null when it can't be worked out. */
const lectureEndMs = (lecture: any) => resolveLectureTime(lecture, 'end')?.getTime() ?? null;

/** Real-time "class is live" event: valid until the class ends. */
const liveClassExpiry = (lecture: any, now: number) => {
  const end = lectureEndMs(lecture);
  // The lecturer may start late and overrun; never expire before now + 15 min.
  return end && end > now ? end : now + (end ? 15 * MINUTE : LIVE_CLASS_TTL);
};

const isUsable = (action: PersistentAction, dismissed: Record<string, number>, now: number) =>
  typeof action?.expiresAt === 'number' &&
  action.expiresAt > now &&
  !(dismissed[action.id] && dismissed[action.id] > now) &&
  !isClosedStatus(action.lecture);

const pruneState = (state: StoredState, now: number): StoredState => ({
  actions: state.actions.filter(a => isUsable(a, state.dismissed, now)),
  dismissed: Object.fromEntries(
    Object.entries(state.dismissed).filter(([, until]) => until > now),
  ),
});

const EMPTY_STATE: StoredState = { actions: [], dismissed: {} };

export const PersistentActionProvider = ({ children }: { children: ReactNode }) => {
  const { colors } = useTheme();
  const socket = useSocket()?.socket;
  const user = useAppSelector(state => state.user) || initialState;
  const uid = user?.uid || '';
  const [state, setState] = useState<StoredState>(EMPTY_STATE);
  const [now, setNow] = useState(() => Date.now());
  // The uid whose saved state has been loaded; writes wait for it.
  const hydratedForRef = useRef<string | null>(null);

  // Load this user's prompts (dropping anything already stale).
  useEffect(() => {
    hydratedForRef.current = null;
    setState(EMPTY_STATE);
    // Prompts used to be stored for every account under one key, with no
    // expiry; that is how a days-old attendance prompt kept coming back.
    AsyncStorage.removeItem(LEGACY_STORAGE_KEY).catch(() => {});
    if (!uid) return;
    let cancelled = false;
    AsyncStorage.getItem(storageKeyFor(uid))
      .then(value => {
        if (cancelled || !value) return;
        const saved = JSON.parse(value);
        if (saved && Array.isArray(saved.actions)) {
          setState(pruneState({ actions: saved.actions, dismissed: saved.dismissed || {} }, Date.now()));
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) hydratedForRef.current = uid;
      });
    return () => {
      cancelled = true;
    };
  }, [uid]);

  useEffect(() => {
    if (!uid || hydratedForRef.current !== uid) return;
    AsyncStorage.setItem(storageKeyFor(uid), JSON.stringify(state)).catch(() => {});
  }, [state, uid]);

  // While something is pending, re-check the clock so a prompt disappears
  // once its class/session/assessment is over, even if the modal is open.
  const hasActions = state.actions.length > 0;
  useEffect(() => {
    if (!hasActions) return;
    setNow(Date.now());
    const timer = setInterval(() => {
      const t = Date.now();
      setNow(t);
      setState(prev => {
        const next = pruneState(prev, t);
        return next.actions.length === prev.actions.length &&
          Object.keys(next.dismissed).length === Object.keys(prev.dismissed).length
          ? prev
          : next;
      });
    }, SWEEP_INTERVAL);
    return () => clearInterval(timer);
  }, [hasActions]);

  const addAction = useCallback((action: PersistentAction) => {
    const t = Date.now();
    setState(prev => {
      if (!isUsable(action, prev.dismissed, t)) return prev;
      const existing = prev.actions.findIndex(item => item.id === action.id);
      if (existing === -1) return { ...prev, actions: [...prev.actions, action] };
      // Same prompt again (e.g. a reopened session): refresh its expiry.
      const actions = [...prev.actions];
      actions[existing] = { ...actions[existing], ...action };
      return { ...prev, actions };
    });
  }, []);

  /** Removes a prompt and keeps it from being re-added until it would have expired. */
  const dismiss = useCallback((id: string) => {
    setState(prev => {
      const action = prev.actions.find(item => item.id === id);
      const until = Math.max(action?.expiresAt ?? 0, Date.now() + HOUR);
      return {
        actions: prev.actions.filter(item => item.id !== id),
        dismissed: { ...prev.dismissed, [id]: until },
      };
    });
  }, []);

  /** Drops prompts for a lecture that just ended (without suppressing future ones). */
  const dropLecture = useCallback((lectureId?: string, kind?: ActionKind) => {
    if (!lectureId) return;
    setState(prev => {
      const actions = prev.actions.filter(
        a => !(String(a.lecture?.id) === String(lectureId) && (!kind || a.kind === kind)),
      );
      return actions.length === prev.actions.length ? prev : { ...prev, actions };
    });
  }, []);

  const showAssessmentPrompt = useCallback((prompt: AssessmentPrompt) => {
    if (!prompt.assessmentId || !prompt.course) return;
    const t = Date.now();
    const due = toMs(prompt.expiresAt);
    addAction({
      id: `assessment-${prompt.course.courseId || prompt.course.id}-${prompt.assessmentId}`,
      kind: 'start-assessment',
      title: prompt.title || 'Assessment ready',
      message: prompt.message || 'Your assessment is ready to start.',
      assessmentId: prompt.assessmentId,
      course: prompt.course,
      // A past due date means the assessment is closed: isUsable rejects it.
      expiresAt: due ?? t + ASSESSMENT_TTL,
    });
  }, [addAction]);

  useEffect(() => {
    if (!socket || !uid) return;

    const handleLectureStarted = (lecture: Lecture) => {
      if (!lecture?.id) return;
      addAction({
        id: `lecture-${lecture.id}`,
        kind: 'join-class',
        title: lecture.topicName || 'Live class',
        message: 'Your online class is currently live. Would you like to join now?',
        lecture,
        expiresAt: liveClassExpiry(lecture, Date.now()),
      });
    };

    const handleAttendanceStarted = async (payload: { lectureId?: string }) => {
      if (!payload?.lectureId || user.usertype !== 'student') return;
      const receivedAt = Date.now();
      const result = await fetchLectureById(payload.lectureId);
      const lecture = result.success && result.lecture
        ? normalizeLecture(result.lecture)
        : normalizeLecture({ id: payload.lectureId });
      addAction({
        id: `attendance-${payload.lectureId}`,
        kind: 'mark-attendance',
        title: lecture.topicName || 'Attendance open',
        message: 'Your lecturer has started an attendance session.',
        lecture,
        expiresAt: receivedAt + ATTENDANCE_TTL,
      });
    };

    const handleAttendanceEnded = (payload: { lectureId?: string }) =>
      dropLecture(payload?.lectureId, 'mark-attendance');
    const handleLectureEnded = (payload: { lectureId?: string; summary?: { lectureId?: string } }) =>
      dropLecture(payload?.lectureId || payload?.summary?.lectureId, 'join-class');

    socket.on('lecture_started', handleLectureStarted);
    socket.on('attendance_session_started', handleAttendanceStarted);
    socket.on('attendance_session_ended', handleAttendanceEnded);
    socket.on('lecture_ended_by_host', handleLectureEnded);
    return () => {
      socket.off('lecture_started', handleLectureStarted);
      socket.off('attendance_session_started', handleAttendanceStarted);
      socket.off('attendance_session_ended', handleAttendanceEnded);
      socket.off('lecture_ended_by_host', handleLectureEnded);
    };
  }, [addAction, dropLecture, socket, uid, user?.usertype]);

  useEffect(() => {
    if (!uid || user.usertype === 'lecturer') return;
    fetchOngoingLecture().then(result => {
      if (!result.success || !result.ongoing || !result.lecture) return;
      handleOngoingLecture(result.lecture, addAction);
    });
  }, [addAction, uid, user.usertype]);

  const visibleActions = state.actions.filter(a => isUsable(a, state.dismissed, now));
  const current = visibleActions[0];

  const handlePrimary = () => {
    if (!current) return;
    if (current.kind === 'join-class' && current.lecture) {
      navigate('LiveClassSessions', {
        lectureId: current.lecture.id,
        courseId: current.lecture.courseId,
      });
    } else if (current.kind === 'mark-attendance' && current.lecture) {
      if (user.usertype === 'lecturer') {
        void openLecturerAttendance({ navigate: navigationRef.navigate.bind(navigationRef) }, current.lecture);
      } else if (navigationRef.isReady()) {
        navigationRef.navigate('StudentAttendanceScanner', { lecture: current.lecture });
      }
    } else if (current.kind === 'start-assessment' && current.course) {
      navigate('CourseSubPage', {
        title: 'Assessments',
        course: current.course,
        userRole: user.usertype === 'lecturer' || user.usertype === 'student'
          ? user.usertype
          : 'student',
        assessmentId: current.assessmentId,
      });
    }
    dismiss(current.id);
  };

  const primaryLabel =
    current?.kind === 'join-class'
      ? 'Join Class'
      : current?.kind === 'mark-attendance'
        ? 'Mark Attendance'
        : 'Start Assessment';

  return (
    <PersistentActionContext.Provider value={{ showAssessmentPrompt }}>
      {children}
      <Modal
        visible={!!current}
        transparent
        animationType="fade"
        onRequestClose={() => current && dismiss(current.id)}
      >
        <View style={styles.overlay}>
          <View style={[styles.card, { backgroundColor: colors.backgroundSecondary }]}>
            <MaterialIcons
              name={current?.kind === 'mark-attendance' ? 'fact-check' : current?.kind === 'start-assessment' ? 'assignment' : 'sensors'}
              size={52}
              color={colors.primary}
            />
            <Text style={[styles.title, { color: colors.textDarker }]}>{current?.title}</Text>
            <Text style={[styles.message, { color: colors.text }]}>{current?.message}</Text>
            <View style={styles.actions}>
              <TouchableOpacity style={[styles.secondary, { borderColor: colors.primary }]} onPress={() => current && dismiss(current.id)}>
                <Text style={{ color: colors.primary, fontWeight: '600' }}>Not Now</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.primary, { backgroundColor: colors.primary }]} onPress={handlePrimary}>
                <Text style={styles.primaryText}>{primaryLabel}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </PersistentActionContext.Provider>
  );
};

/**
 * The server's "ongoing" lecture is only a hint: a lecture's status stays
 * 'ongoing' after attendance was taken (and if the lecturer's app closed
 * without ending the session), so it can be days old. Only prompt when the
 * class is actually happening now.
 */
const handleOngoingLecture = (lecture: Lecture, addAction: (action: PersistentAction) => void) => {
  if (!lecture?.id || isClosedStatus(lecture)) return;
  const now = Date.now();
  const start = resolveLectureTime(lecture, 'start')?.getTime() ?? null;
  const end = lectureEndMs(lecture);
  // Not scheduled for today-ish: a stale record.
  if (end !== null && now > end + ONGOING_GRACE) return;
  if (end === null && (start === null || now > start + LIVE_CLASS_TTL)) return;

  if (lecture.lectureType === 'Physical') {
    // Students can only check in while the lecturer's session is open.
    if (!lecture.attendanceOpen) return;
    addAction({
      id: `attendance-${lecture.id}`,
      kind: 'mark-attendance',
      title: lecture.topicName || 'Attendance open',
      message: 'An attendance session is in progress.',
      lecture,
      expiresAt: Math.min(now + ATTENDANCE_TTL, (end ?? now) + ONGOING_GRACE),
    });
    return;
  }

  if (lecture.isLive === false) return;
  addAction({
    id: `lecture-${lecture.id}`,
    kind: 'join-class',
    title: lecture.topicName || 'Class in progress',
    message: 'Your online class is currently live. Would you like to join now?',
    lecture,
    expiresAt: end ? Math.max(end, now + 5 * MINUTE) : now + LIVE_CLASS_TTL,
  });
};

export const usePersistentActions = () => useContext(PersistentActionContext);

const styles = StyleSheet.create({
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.55)', padding: 20 },
  card: { width: '100%', maxWidth: 420, borderRadius: 24, padding: 24, alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '700', textAlign: 'center', marginTop: 18 },
  message: { fontSize: 14, lineHeight: 20, textAlign: 'center', marginVertical: 16 },
  actions: { flexDirection: 'row', gap: 12, width: '100%', justifyContent: 'center' },
  secondary: { height: 48, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  primary: { height: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  primaryText: { color: '#fff', fontWeight: '700' },
});
