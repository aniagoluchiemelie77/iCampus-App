import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  Alert,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import NativeProperty from 'react-native-ble-peripheral';
import { useAppSelector } from '../hooks/hooks';
import { baseUrl } from '../components/HomeScreenComponents';
import { SERVICE_UUID } from '@env';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../../App';
import { formatTime } from '../utils/durationFormatter';
import Toast from 'react-native-toast-message';
import { downloadAttendanceReport } from '../api/localPostApis';
import { useTheme } from '../context/ThemeContext';
import { EmptyState } from '../components/EmptyFlatlistComponent';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useSocketConnection } from '../hooks/useSocket.ts';
import { CustomButton } from '../assets/components/AppUIComponents';
import { PulseRadar } from '../components/PulsingAnimation';
import { PageHeader } from '../components/PageHeader';
import {
  beaconNameFor,
  ensureBluetoothOn,
  ensureBluetoothPermissions,
} from '../utils/attendance';
import { formatClock, resolveLectureTime } from '../utils/lectureTime';

type AttendanceStatus = 'idle' | 'starting' | 'fetching' | 'completed';
type Props = StackScreenProps<RootStackParamList, 'PhysicalAttendanceManager'>;
interface PresentStudent {
  uid: string;
  firstname: string;
  lastname: string;
  matricNumber: string;
  department: string;
  timestamp: string;
  isException?: boolean;
}
interface GroupedSection {
  title: string;
  data: any[];
}

const FIRST_SESSION_SECONDS = 300;
const EXTRA_SECONDS = 120;

export const PhysicalAttendanceManager = ({ route, navigation }: Props) => {
  const { colors } = useTheme();
  const { lecture, course, exceptions: rawExceptions } = route.params;
  const exceptions = useMemo(() => (Array.isArray(rawExceptions) ? rawExceptions : []), [rawExceptions]);
  const user = useAppSelector(state => state.user) || {};
  const socketRef = useSocketConnection({ baseUrl, userId: user?.uid });
  const [presentStudents, setPresentStudents] = useState<PresentStudent[]>([]);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [status, setStatus] = useState<AttendanceStatus>('idle');
  const [isDownloading, setIsDownloading] = useState(false);
  const statusRef = useRef(status);
  statusRef.current = status;

  const startAt = resolveLectureTime(lecture, 'start');

  // ---- Beacon -------------------------------------------------------------
  const startBeacon = async () => {
    try {
      NativeProperty.setName(beaconNameFor(lecture.id));
      NativeProperty.addService(SERVICE_UUID, true);
      await NativeProperty.start();
      return true;
    } catch (error) {
      console.error('BLE advertising failed:', error);
      Alert.alert(
        'Could not broadcast',
        'Your phone could not start the Bluetooth attendance signal. Turn Bluetooth off and on, then try again.',
      );
      return false;
    }
  };
  const stopBeacon = () => {
    try {
      NativeProperty.stop();
    } catch {
      // Already stopped.
    }
  };

  // ---- Session ------------------------------------------------------------
  const openSession = useCallback(() => {
    socketRef.current?.emit('start_attendance_session', {
      lectureId: lecture.id,
      lecturerId: user.uid,
    });
  }, [socketRef, lecture.id, user.uid]);

  const beginBroadcast = async (seconds: number) => {
    setStatus('starting');
    const allowed = await ensureBluetoothPermissions('advertise');
    if (!allowed) return setStatus(presentStudents.length ? 'completed' : 'idle');
    const on = await ensureBluetoothOn('Students can only find your class signal over Bluetooth.');
    if (!on) return setStatus(presentStudents.length ? 'completed' : 'idle');
    const started = await startBeacon();
    if (!started) return setStatus(presentStudents.length ? 'completed' : 'idle');
    openSession();
    setSecondsLeft(seconds);
    setStatus('fetching');
  };

  const endSession = useCallback(() => {
    stopBeacon();
    socketRef.current?.emit('end_attendance_session', { lectureId: lecture.id });
    setSecondsLeft(0);
    setStatus('completed');
  }, [socketRef, lecture.id]);

  // Countdown; ends the session at zero.
  useEffect(() => {
    if (status !== 'fetching') return;
    if (secondsLeft <= 0) {
      endSession();
      return;
    }
    const t = setTimeout(() => setSecondsLeft(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [status, secondsLeft, endSession]);

  // ---- Socket -------------------------------------------------------------
  useEffect(() => {
    const socket = socketRef.current;
    if (!user?.uid || !socket) return;

    const onCheckedIn = (student: PresentStudent) => {
      setPresentStudents(prev => (prev.some(s => s.uid === student.uid) ? prev : [...prev, student]));
    };
    const onError = (err: any) => {
      Toast.show({
        type: 'error',
        text1: 'Attendance server error',
        text2: err?.message || 'Please try again.',
      });
    };
    // A reconnect drops room membership; rejoin so check-ins keep arriving.
    const onConnect = () => {
      if (statusRef.current === 'fetching') openSession();
    };

    socket.on('student_checked_in', onCheckedIn);
    socket.on('error_response', onError);
    socket.on('connect', onConnect);
    return () => {
      socket.off('student_checked_in', onCheckedIn);
      socket.off('error_response', onError);
      socket.off('connect', onConnect);
    };
  }, [user?.uid, socketRef, openSession]);

  // Always stop broadcasting and close the session when leaving.
  useEffect(
    () => () => {
      stopBeacon();
      if (statusRef.current === 'fetching') {
        socketRef.current?.emit('end_attendance_session', { lectureId: lecture.id });
      }
      socketRef.current?.disconnect();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Confirm before leaving mid-session.
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e: any) => {
      if (statusRef.current !== 'fetching') return;
      e.preventDefault();
      Alert.alert('End attendance?', 'Students will no longer be able to check in.', [
        { text: 'Keep going', style: 'cancel' },
        {
          text: 'End and leave',
          style: 'destructive',
          onPress: () => {
            endSession();
            navigation.dispatch(e.data.action);
          },
        },
      ]);
    });
    return unsubscribe;
  }, [navigation, endSession]);

  // ---- Report -------------------------------------------------------------
  const handleDownloadReport = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    const result = await downloadAttendanceReport(lecture.id, course?.courseTitle!, exceptions);
    Toast.show(
      result.success
        ? { type: 'success', text1: 'Report downloaded', text2: 'Saved to your Downloads folder.' }
        : { type: 'error', text1: 'Download failed', text2: result.error || 'Could not save the report.' },
    );
    setIsDownloading(false);
  };

  const groupedData = useMemo((): GroupedSection[] => {
    const departments = new Set<string>([
      ...presentStudents.map(s => s.department || 'General'),
      ...exceptions.map((e: any) => e.department || 'General'),
    ]);
    return Array.from(departments).map(dept => ({
      title: dept,
      data: [
        ...presentStudents.filter(s => (s.department || 'General') === dept),
        ...exceptions
          .filter((e: any) => (e.department || 'General') === dept)
          .map((e: any) => {
            const nameParts = e.studentInfo?.fullname?.split(' ') ?? [];
            return {
              uid: e.studentId,
              firstname: nameParts[0] ?? 'Unknown',
              lastname: nameParts.slice(1).join(' ') || 'Student',
              matricNumber: e.studentInfo?.matricNumber,
              isException: true,
              reasonCategory: e.reasonCategory,
            };
          }),
      ],
    }));
  }, [presentStudents, exceptions]);

  // ---- UI -----------------------------------------------------------------
  const lectureCard = (
    <View style={[styles.infoCard, { backgroundColor: colors.backgroundSecondary }]}>
      <View style={[styles.infoIcon, { backgroundColor: colors.primary + '1A' }]}>
        <MaterialIcons name="how-to-reg" size={24} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.courseCode, { color: colors.primary }]}>{course?.courseCode}</Text>
        <Text style={[styles.topic, { color: colors.textDarker }]} numberOfLines={2}>
          {lecture.topicName}
        </Text>
        <Text style={[styles.meta, { color: colors.text }]} numberOfLines={1}>
          {[lecture.location, startAt ? formatClock(startAt) : null].filter(Boolean).join(' · ')}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader title="Take Attendance" />
      <View style={styles.body}>
        {lectureCard}

        {(status === 'idle' || status === 'starting') && (
          <View style={styles.centerBlock}>
            <View style={styles.steps}>
              {[
                { icon: 'bluetooth', text: 'Your phone broadcasts a short-range class signal.' },
                { icon: 'notifications-active', text: 'Enrolled students are notified that attendance is open.' },
                { icon: 'verified-user', text: 'Students in the room tap "Mark attendance" and verify their identity.' },
              ].map(step => (
                <View key={step.icon} style={styles.stepRow}>
                  <MaterialIcons name={step.icon} size={20} color={colors.primary} />
                  <Text style={[styles.stepText, { color: colors.text }]}>{step.text}</Text>
                </View>
              ))}
            </View>
            <CustomButton
              title={status === 'starting' ? 'Starting…' : 'Start attendance'}
              iconName="sensors"
              isLoading={status === 'starting'}
              disabled={status === 'starting'}
              style={styles.primaryBtn}
              onPress={() => beginBroadcast(FIRST_SESSION_SECONDS)}
            />
            <Text style={[styles.hint, { color: colors.text }]}>
              Keep the app open and Bluetooth on until you end the session.
            </Text>
          </View>
        )}

        {status === 'fetching' && (
          <View style={styles.flexBlock}>
            <View style={styles.pulseWrapper}>
              <PulseRadar size={170} strokeWidth={2} color={colors.primary} />
              <View style={styles.timerCircle}>
                <Text
                  style={[styles.timerNumber, { color: colors.primary }]}
                  accessibilityLabel={`${secondsLeft} seconds left`}
                >
                  {formatTime(secondsLeft)}
                </Text>
                <Text style={[styles.timerLabel, { color: colors.primary }]}>Broadcasting</Text>
              </View>
            </View>
            <Text
              style={[styles.statsCount, { color: colors.textDarker }]}
              accessibilityLiveRegion="polite"
            >
              {presentStudents.length} {presentStudents.length === 1 ? 'student' : 'students'} checked in
            </Text>
            <FlatList
              data={[...presentStudents].reverse()}
              keyExtractor={s => s.uid}
              style={styles.liveList}
              ListEmptyComponent={
                <Text style={[styles.hint, { color: colors.text }]}>
                  Waiting for students in the room to check in…
                </Text>
              }
              renderItem={({ item }) => (
                <View style={[styles.liveRow, { borderColor: colors.border + '66' }]}>
                  <MaterialIcons name="check-circle" size={18} color={colors.success} />
                  <Text style={[styles.liveName, { color: colors.textDarker }]} numberOfLines={1}>
                    {item.firstname} {item.lastname}
                  </Text>
                  <Text style={[styles.liveMatric, { color: colors.text }]}>{item.matricNumber}</Text>
                </View>
              )}
            />
            <View style={styles.row}>
              <TouchableOpacity
                style={[styles.secondaryBtn, { borderColor: colors.primary }]}
                onPress={() => setSecondsLeft(s => s + EXTRA_SECONDS)}
                accessibilityRole="button"
              >
                <MaterialIcons name="more-time" size={18} color={colors.primary} />
                <Text style={[styles.secondaryText, { color: colors.primary }]}>+2 min</Text>
              </TouchableOpacity>
              <CustomButton
                title="End & view list"
                iconName="stop-circle"
                style={styles.flexBtn}
                onPress={endSession}
              />
            </View>
          </View>
        )}

        {status === 'completed' && (
          <View style={styles.flexBlock}>
            <View style={styles.summaryRow}>
              <View style={[styles.summaryTile, { backgroundColor: colors.backgroundSecondary }]}>
                <Text style={[styles.summaryValue, { color: colors.success }]}>{presentStudents.length}</Text>
                <Text style={[styles.summaryLabel, { color: colors.text }]}>Present</Text>
              </View>
              <View style={[styles.summaryTile, { backgroundColor: colors.backgroundSecondary }]}>
                <Text style={[styles.summaryValue, { color: colors.primary }]}>{exceptions.length}</Text>
                <Text style={[styles.summaryLabel, { color: colors.text }]}>Excused</Text>
              </View>
            </View>
            <SectionList
              style={styles.flexBlock}
              sections={groupedData}
              keyExtractor={(item, i) => item.uid || item.studentId || String(i)}
              stickySectionHeadersEnabled={false}
              renderSectionHeader={({ section: { title } }) => (
                <Text style={[styles.sectionTitle, { color: colors.textDarker }]}>{title}</Text>
              )}
              renderItem={({ item }) => (
                <View style={[styles.studentRow, { borderBottomColor: colors.border + '66' }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.studentName, { color: colors.textDarker }]}>
                      {item.firstname} {item.lastname}
                    </Text>
                    <Text style={[styles.matricNumber, { color: colors.text }]}>
                      {item.matricNumber || item.studentInfo?.matricNumber}
                    </Text>
                  </View>
                  {item.isException ? (
                    <View style={[styles.pill, { backgroundColor: colors.primary + '1A' }]}>
                      <Text style={[styles.pillText, { color: colors.primary }]}>Excused</Text>
                    </View>
                  ) : (
                    <MaterialIcons name="check-circle" size={22} color={colors.success} />
                  )}
                </View>
              )}
              ListEmptyComponent={
                <EmptyState
                  iconName="person-search"
                  title="No students checked in"
                  subtitle="Ask students to open iCampus and tap Mark attendance, then reopen the session."
                />
              }
            />
            <View style={styles.row}>
              <TouchableOpacity
                style={[styles.secondaryBtn, { borderColor: colors.primary }]}
                onPress={() => beginBroadcast(EXTRA_SECONDS)}
                accessibilityRole="button"
              >
                <MaterialIcons name="replay" size={18} color={colors.primary} />
                <Text style={[styles.secondaryText, { color: colors.primary }]}>Reopen 2 min</Text>
              </TouchableOpacity>
              <CustomButton
                title={isDownloading ? 'Saving…' : 'Download report'}
                iconName="file-download"
                isLoading={isDownloading}
                style={styles.flexBtn}
                onPress={handleDownloadReport}
              />
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate('Home', { activeTab: 'classroom' } as any)}
              style={styles.doneLink}
            >
              <Text style={[styles.secondaryText, { color: colors.primary }]}>Done</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

// Kept for StudentsAttendanceScanner, which reuses the timer styles.
export const GetAttendanceScreenStyles = StyleSheet.create({
  pulseWrapper: { alignItems: 'center', justifyContent: 'center', height: 230, marginVertical: 10 },
  timerCircle: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  timerNumber: { fontSize: 30, fontWeight: '800' },
  timerLabel: { fontSize: 13, fontWeight: '700' },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  body: { flex: 1, paddingHorizontal: 16, paddingBottom: 20 },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 18,
    marginTop: 4,
  },
  infoIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  courseCode: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  topic: { fontSize: 16, fontWeight: '800', marginTop: 2 },
  meta: { fontSize: 12.5, marginTop: 3, opacity: 0.8 },
  centerBlock: { flex: 1, justifyContent: 'center' },
  flexBlock: { flex: 1 },
  steps: { gap: 14, marginBottom: 28 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepText: { flex: 1, fontSize: 14, lineHeight: 20 },
  primaryBtn: { height: 54, borderRadius: 27 },
  hint: { fontSize: 12.5, textAlign: 'center', opacity: 0.7, marginTop: 12 },
  pulseWrapper: GetAttendanceScreenStyles.pulseWrapper,
  timerCircle: GetAttendanceScreenStyles.timerCircle,
  timerNumber: GetAttendanceScreenStyles.timerNumber,
  timerLabel: GetAttendanceScreenStyles.timerLabel,
  statsCount: { fontSize: 17, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  liveList: { flex: 1 },
  liveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  liveName: { flex: 1, fontSize: 14, fontWeight: '600' },
  liveMatric: { fontSize: 12, opacity: 0.75 },
  row: { flexDirection: 'row', gap: 10, marginTop: 12 },
  flexBtn: { flex: 1, width: 'auto', height: 48, borderRadius: 24 },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 16,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.3,
  },
  secondaryText: { fontSize: 14, fontWeight: '700' },
  summaryRow: { flexDirection: 'row', gap: 10, marginVertical: 14 },
  summaryTile: { flex: 1, borderRadius: 16, paddingVertical: 12, alignItems: 'center' },
  summaryValue: { fontSize: 24, fontWeight: '800' },
  summaryLabel: { fontSize: 12, marginTop: 2, opacity: 0.8 },
  sectionTitle: { fontSize: 13, fontWeight: '800', marginTop: 12, marginBottom: 4, opacity: 0.8 },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  studentName: { fontSize: 14.5, fontWeight: '600' },
  matricNumber: { fontSize: 12, marginTop: 3, opacity: 0.75 },
  pill: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 10 },
  pillText: { fontSize: 11, fontWeight: '800' },
  doneLink: { alignSelf: 'center', paddingVertical: 12, paddingHorizontal: 20 },
});
