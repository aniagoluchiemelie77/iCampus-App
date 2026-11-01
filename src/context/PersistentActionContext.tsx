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

type ActionKind = 'join-class' | 'start-assessment' | 'mark-attendance';

export interface PersistentAction {
  id: string;
  kind: ActionKind;
  title: string;
  message: string;
  lecture?: Lecture | null;
  course?: any;
  assessmentId?: string;
}

interface AssessmentPrompt {
  assessmentId: string;
  course: any;
  title?: string;
  message?: string;
}

interface PersistentActionContextValue {
  showAssessmentPrompt: (prompt: AssessmentPrompt) => void;
}

const STORAGE_KEY = 'icampus_persistent_classroom_actions';
const PersistentActionContext = createContext<PersistentActionContextValue>({
  showAssessmentPrompt: () => undefined,
});

const normalizeLecture = (lecture: any): Lecture => lecture as Lecture;

export const PersistentActionProvider = ({ children }: { children: ReactNode }) => {
  const { colors } = useTheme();
  const socket = useSocket()?.socket;
  const user = useAppSelector(state => state.user) || initialState;
  const [actions, setActions] = useState<PersistentAction[]>([]);
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (hydratedRef.current) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(actions)).catch(() => {});
    }
  }, [actions]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(value => {
        if (value) {
          const saved = JSON.parse(value);
          if (Array.isArray(saved)) setActions(saved);
        }
      })
      .catch(() => {})
      .finally(() => {
        hydratedRef.current = true;
      });
  }, []);

  const addAction = useCallback((action: PersistentAction) => {
    setActions(current => {
      if (current.some(item => item.id === action.id)) return current;
      return [...current, action];
    });
  }, []);

  const dismiss = useCallback((id: string) => {
    setActions(current => current.filter(item => item.id !== id));
  }, []);

  const showAssessmentPrompt = useCallback((prompt: AssessmentPrompt) => {
    if (!prompt.assessmentId || !prompt.course) return;
    addAction({
      id: `assessment-${prompt.course.courseId || prompt.course.id}-${prompt.assessmentId}`,
      kind: 'start-assessment',
      title: prompt.title || 'Assessment ready',
      message: prompt.message || 'Your assessment is ready to start.',
      assessmentId: prompt.assessmentId,
      course: prompt.course,
    });
  }, [addAction]);

  useEffect(() => {
    if (!socket || !user?.uid) return;

    const handleLectureStarted = (lecture: Lecture) => {
      if (!lecture) return;
      addAction({
        id: `lecture-${lecture.id}`,
        kind: 'join-class',
        title: lecture.topicName || 'Live class',
        message: 'Your online class is currently live. Would you like to join now?',
        lecture,
      });
    };

    const handleAttendanceStarted = async (payload: { lectureId?: string }) => {
      if (!payload?.lectureId || user.usertype !== 'student') return;
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
      });
    };

    socket.on('lecture_started', handleLectureStarted);
    socket.on('attendance_session_started', handleAttendanceStarted);
    return () => {
      socket.off('lecture_started', handleLectureStarted);
      socket.off('attendance_session_started', handleAttendanceStarted);
    };
  }, [addAction, socket, user?.uid, user?.usertype]);

  useEffect(() => {
    if (!user?.uid || user.usertype === 'lecturer') return;
    fetchOngoingLecture().then(result => {
      if (!result.success || !result.ongoing || !result.lecture) return;
      handleOngoingLecture(result.lecture, addAction);
    });
  }, [addAction, user?.uid, user.usertype]);

  const current = actions[0];

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

const handleOngoingLecture = (lecture: Lecture, addAction: (action: PersistentAction) => void) => {
  addAction({
    id: `lecture-${lecture.id}`,
    kind: lecture.lectureType === 'Physical' ? 'mark-attendance' : 'join-class',
    title: lecture.topicName || 'Class in progress',
    message: lecture.lectureType === 'Physical'
      ? 'An attendance session is in progress.'
      : 'Your online class is currently live. Would you like to join now?',
    lecture,
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
