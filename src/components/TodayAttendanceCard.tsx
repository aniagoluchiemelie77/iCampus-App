import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Toast from 'react-native-toast-message';
import { Lecture } from '../types/firebase';
import { useTheme } from '../context/ThemeContext';
import { SocketContext } from '../hooks/useSocket';
import {
  getLecturersLecturesTimeline,
  getStudentLecturesTimeline,
} from '../api/localGetApis';
import { openLecturerAttendance, openStudentAttendance } from '../utils/attendance';
import {
  hasTakenAttendance,
  wasAttendanceEndedThisRun,
} from '../utils/lectureAttendance';
import { addLectureToCalendar } from '../utils/lectureCalendar';
import {
  formatClock,
  isLectureWithinScheduledTime,
  lectureDayKey,
  resolveLectureTime,
  todayKey,
} from '../utils/lectureTime';

/**
 * Classroom tab shortcut for today's classes: physical lectures get a one-tap
 * attendance button once the class has started (lecturers: Start, Continue
 * while a session is open, Redo only after one has run; students: Mark, only
 * while the lecturer's Bluetooth session is open); online lectures a Start / Join
 * button during their scheduled time. Renders nothing when there are no
 * classes today.
 */
export const TodayAttendanceCard = ({
  role,
  refreshKey = 0,
}: {
  role: 'student' | 'lecturer';
  /** Bump to reload (e.g. on pull-to-refresh). */
  refreshKey?: number;
}) => {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [clock, setClock] = useState(Date.now());
  const socket = useContext(SocketContext)?.socket;

  const load = useCallback(async () => {
    const fetcher = role === 'lecturer' ? getLecturersLecturesTimeline : getStudentLecturesTimeline;
    try {
      const result = await fetcher();
      if (result.success && Array.isArray(result.data)) setLectures(result.data);
    } catch {
      // Optional shortcut; the schedule screen surfaces errors.
    }
  }, [role]);

  useEffect(() => {
    load();
    // Refresh when Home regains focus (e.g. after taking attendance). The
    // clock tick re-renders even if the reload fails, so the label updates.
    const unsubscribe = navigation.addListener('focus', () => {
      setClock(Date.now());
      load();
    });
    return unsubscribe;
  }, [load, navigation, refreshKey]);

  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  // Students only get "Mark" while a session is open, so follow the
  // lecturer opening and closing it live instead of waiting for a reload.
  useEffect(() => {
    if (!socket) return;
    const setOpen = (lectureId: string | undefined, attendanceOpen: boolean) => {
      if (!lectureId) return;
      setLectures(prev =>
        prev.map(l => (l?.id === lectureId ? { ...l, attendanceOpen } : l)),
      );
    };
    const onStarted = (payload: { lectureId?: string }) => {
      setOpen(payload?.lectureId, true);
      load();
    };
    const onEnded = (payload: { lectureId?: string }) => {
      setOpen(payload?.lectureId, false);
      load();
    };
    socket.on('attendance_session_started', onStarted);
    socket.on('attendance_session_ended', onEnded);
    return () => {
      socket.off('attendance_session_started', onStarted);
      socket.off('attendance_session_ended', onEnded);
    };
  }, [socket, load]);

  const today = todayKey();
  const todays = useMemo(
    () =>
      lectures
        .filter(
          l =>
            !!l &&
            lectureDayKey(l) === today &&
            l.status !== 'cancelled' &&
            l.status !== 'completed',
        )
        .sort(
          (a, b) =>
            (resolveLectureTime(a, 'start')?.getTime() ?? 0) -
            (resolveLectureTime(b, 'start')?.getTime() ?? 0),
        ),
    [lectures, today],
  );

  if (todays.length === 0) return null;

  const handleOpen = async (lecture: Lecture) => {
    if (lecture.lectureType !== 'Physical') {
      if (!isLectureWithinScheduledTime(lecture)) {
        Toast.show({
          type: 'info',
          text1: "This class hasn't started yet",
          text2: "You'll be able to join during its scheduled time.",
        });
        return;
      }
      // Students wait inside the class screen until the lecturer goes live.
      navigation.navigate('LiveClassSessions', {
        lectureId: lecture.id,
        courseId: (lecture as any).courseId?.courseId || lecture.courseId,
      });
      return;
    }
    if (role === 'lecturer') {
      setOpeningId(lecture.id);
      await openLecturerAttendance(navigation, lecture);
      setOpeningId(null);
    } else {
      openStudentAttendance(navigation, lecture);
    }
  };

  const handleAddToCalendar = async (lecture: Lecture) => {
    try {
      const result = await addLectureToCalendar(lecture);
      Toast.show({
        type: result === 'added' ? 'success' : 'info',
        text1:
          result === 'added'
            ? 'Lecture added to calendar'
            : 'Lecture is already in your calendar',
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Could not add lecture',
        text2:
          error instanceof Error
            ? error.message
            : 'Please check calendar permissions and try again.',
      });
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '40' }]}>
      <View style={styles.header}>
        <MaterialIcons name="today" size={20} color={colors.primary} />
        <Text style={[styles.title, { color: colors.textDarker }]}>
          {role === 'lecturer' ? 'Teaching today' : "Today's classes"}
        </Text>
        <TouchableOpacity
          onPress={() =>
            navigation.navigate('CourseSubPage', { title: 'View Lecture Schedule', userRole: role })
          }
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={[styles.link, { color: colors.primary }]}>Schedule</Text>
        </TouchableOpacity>
      </View>
      {todays.map(lecture => {
        const start = resolveLectureTime(lecture, 'start');
        const isOnline = lecture.lectureType !== 'Physical';
        const withinScheduledTime = isLectureWithinScheduledTime(lecture, clock);
        const hasStarted = !!start && start.getTime() <= clock;
        // A session ended in this run wins over a stale "open" from the server.
        const open = isOnline
          ? (lecture.status === 'ongoing' || !!lecture.isLive) &&
            withinScheduledTime
          : !!lecture.attendanceOpen && !wasAttendanceEndedThisRun(lecture.id);
        const attendanceTaken = !isOnline && hasTakenAttendance(lecture);
        // Physical: lecturers from the start time on (late attendance is
        // allowed); students only while the lecturer's session is open.
        const showClassAction = isOnline
          ? withinScheduledTime
          : role === 'lecturer'
            ? hasStarted
            : open;
        const canAddToCalendar =
          !!start &&
          start.getTime() > clock &&
          lecture.status !== 'cancelled' &&
          lecture.status !== 'completed';
        const buttonLabel = isOnline
          ? role === 'lecturer'
            ? open ? 'Rejoin' : 'Start'
            : 'Join'
          : role === 'lecturer'
            ? open ? 'Continue' : attendanceTaken ? 'Redo' : 'Start'
            : 'Mark';
        return (
          <View key={lecture.id} style={[styles.row, { backgroundColor: colors.backgroundSecondary }]}>
            <View style={styles.timeCol}>
              <Text style={[styles.time, { color: colors.textDarker }]}>{formatClock(start)}</Text>
              {open && (
                <View style={[styles.openPill, { backgroundColor: colors.success + '22' }]}>
                  <View style={[styles.liveDot, { backgroundColor: colors.success }]} />
                  <Text style={[styles.openText, { color: colors.success }]}>
                    {isOnline ? 'Live' : 'Open'}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.info}>
              <Text style={[styles.topic, { color: colors.textDarker }]} numberOfLines={1}>
                {lecture.topicName}
              </Text>
              <View style={styles.venueRow}>
                <MaterialIcons
                  name={isOnline ? 'videocam' : 'how-to-reg'}
                  size={12}
                  color={colors.text}
                />
                <Text style={[styles.venue, { color: colors.text }]} numberOfLines={1}>
                  {isOnline ? 'Online class' : lecture.location || 'Physical class · attendance'}
                </Text>
              </View>
            </View>
            {showClassAction && (
              <TouchableOpacity
                onPress={() => handleOpen(lecture)}
                disabled={openingId === lecture.id}
                style={[styles.button, { backgroundColor: colors.btnColor }]}
                accessibilityRole="button"
                accessibilityLabel={`${buttonLabel} ${isOnline ? 'online class' : 'attendance'} for ${lecture.topicName}`}
              >
                {openingId === lecture.id ? (
                  <ActivityIndicator size="small" color={colors.btnTextColor} />
                ) : (
                  <Text style={[styles.buttonText, { color: colors.btnTextColor }]}>{buttonLabel}</Text>
                )}
              </TouchableOpacity>
            )}
            {canAddToCalendar && (
              <TouchableOpacity
                onPress={() => handleAddToCalendar(lecture)}
                style={[
                  styles.calendarButton,
                  { backgroundColor: colors.primary + '14' },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Add ${lecture.topicName} to calendar`}
              >
                <MaterialIcons
                  name="event-available"
                  size={19}
                  color={colors.primary}
                />
              </TouchableOpacity>
            )}
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  card: { borderRadius: 18, borderWidth: 1, padding: 12, marginTop: 12, gap: 8 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  title: { flex: 1, fontSize: 15, fontWeight: '800' },
  link: { fontSize: 13, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, padding: 10 },
  timeCol: { width: 64 },
  time: { fontSize: 13.5, fontWeight: '800' },
  openPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  openText: { fontSize: 10.5, fontWeight: '800' },
  info: { flex: 1 },
  topic: { fontSize: 14, fontWeight: '700' },
  venueRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  venue: { fontSize: 12, opacity: 0.75, flexShrink: 1 },
  button: { minWidth: 76, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  calendarButton: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontSize: 13, fontWeight: '800' },
});
