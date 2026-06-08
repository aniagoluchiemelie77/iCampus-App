import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  SectionList,
  TouchableOpacity,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import NativeProperty from 'react-native-ble-peripheral';
import { useAppSelector } from '../components/hooks';
import { io, Socket } from 'socket.io-client';
import { baseUrl } from '../components/HomeScreenComponents';
import { SERVICE_UUID } from '@env';
import { PRIMARY_COLOR_TINT } from '../components/Classroomcomponent';
import { LogoBigger } from 'assets/images/Logo';
import BleManager from 'react-native-ble-manager';
import { requestMultiple, PERMISSIONS } from 'react-native-permissions';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../../App';
import { formatTime } from '../utils/durationFormatter';
import Toast from 'react-native-toast-message';
import { downloadAttendanceReport } from '../api/localPostApis';
import { useTheme } from '../context/ThemeContext';
import { EmptyState } from '@components/EmptyFlatlistComponent';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

type AttendanceStatus = 'idle' | 'fetching' | 'completed';
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

export const PhysicalAttendanceManager = ({ route, navigation }: Props) => {
  const { colors } = useTheme();
  const { lecture, course, exceptions } = route.params;
  const user = useAppSelector(state => state.user);
  const socketRef = useRef<Socket | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [presentStudents, setPresentStudents] = useState<PresentStudent[]>([]);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [status, setStatus] = useState<AttendanceStatus>('idle');
  const [isDownloading, setIsDownloading] = useState(false);

  const startCountdownTimer = (duration: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setSecondsLeft(duration);

    timerRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleStopFetching();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };
  const initHardwareSession = async () => {
    try {
      await NativeProperty.addService(SERVICE_UUID, true);
      await NativeProperty.startSales('iCampus-' + lecture.id);
      console.log('BLE Beacon Hardware Transmitting Signal');
    } catch (error) {
      console.error('Bluetooth hardware driver assignment failed:', error);
    }
  };
  const handleStartFetching = async () => {
    setStatus('fetching');
    socketRef.current?.emit('start_attendance_session', {
      lectureId: lecture.id,
      lecturerId: user.uid,
    });
    await initHardwareSession();
    startCountdownTimer(300);
  };
  const handleStopFetching = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    await NativeProperty.stopSales();
    socketRef.current?.emit('end_attendance_session', {
      lectureId: lecture.id,
    });
    setStatus('completed');
  };
  const handleDownloadReport = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    const result = await downloadAttendanceReport(
      lecture.id,
      course?.courseTitle!,
      exceptions,
    );
    if (result.success) {
      Toast.show({
        type: 'success',
        text1: 'Report Downloaded',
        text2: 'Saved directly to your Downloads folder.',
      });
    } else {
      Toast.show({
        type: 'error',
        text1: 'Download Failed',
        text2: result.error || 'Could not preserve document.',
      });
    }

    setIsDownloading(false);
  };
  const checkBluetoothAndStart = async () => {
    try {
      await BleManager.checkState();
      handleStartFetching();
    } catch (error) {
      Alert.alert(
        'Bluetooth Required',
        'iCampus needs Bluetooth to broadcast the attendance signal to students nearby.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Turn On',
            onPress: () => {
              if (Platform.OS === 'android') {
                Linking.sendIntent('android.settings.BLUETOOTH_SETTINGS');
              } else {
                Linking.openURL('App-Prefs:Bluetooth');
              }
            },
          },
        ],
      );
    }
  };
  const handleRetryFetching = async () => {
    Toast.show({
      type: 'info',
      text1: 'Rescanning...',
      text2: 'Bluetooth broadcast restarted for 2 mins.',
    });
    setStatus('fetching');

    socketRef.current?.emit('start_attendance_session', {
      lectureId: lecture.id,
      lecturerId: user.uid,
    });
    await initHardwareSession();
    startCountdownTimer(120);
  };
  const getGroupedData = (): GroupedSection[] => {
    const allDepartments = new Set([
      ...presentStudents.map(s => s.department),
      ...exceptions.map(e => e.department),
    ]);

    return Array.from(allDepartments).map(dept => ({
      title: dept || 'General',
      data: [
        ...presentStudents.filter(s => s.department === dept),
        ...exceptions
          .filter(e => e.department === dept)
          .map(e => ({
            uid: e.studentId,
            firstname: e.studentInfo?.fullname?.split(' ')[0] ?? 'Unknown',
            lastname: e.studentInfo?.fullname?.split(' ')[1] ?? 'Student',
            matricNumber: e.studentInfo?.matricNumber,
            isException: true,
            reasonCategory: e.reasonCategory,
          })),
      ],
    }));
  };
  useEffect(() => {
    if (!user?.uid) return;
    socketRef.current = io(baseUrl, {
      transports: ['websocket'],
      query: { userId: user.uid },
    });

    socketRef.current.on('student_checked_in', (newStudent: PresentStudent) => {
      setPresentStudents(prev =>
        prev.find(s => s.uid === newStudent.uid) ? prev : [...prev, newStudent],
      );
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [user.uid]);
  useEffect(() => {
    if (Platform.OS === 'android' && Platform.Version >= 31) {
      requestMultiple([
        PERMISSIONS.ANDROID.BLUETOOTH_ADVERTISE,
        PERMISSIONS.ANDROID.BLUETOOTH_CONNECT,
        PERMISSIONS.ANDROID.BLUETOOTH_SCAN,
      ]).then(statuses => {
        console.log('Permissions statuses:', statuses);
      });
    }
  }, []);

  const groupedData = getGroupedData();
  const idle = status === 'idle';
  const fetching = status === 'fetching';
  const completed = status === 'completed';
  return (
    <View
      style={[
        GetAttendanceScreenStyles.container,
        { backgroundColor: colors.background },
      ]}
    >
      <View
        style={[
          GetAttendanceScreenStyles.subContainer,
          { backgroundColor: colors.backgroundSecondary },
        ]}
      >
        <LogoBigger />
        {idle && (
          <>
            <Text
              style={[
                GetAttendanceScreenStyles.courseTitle,
                { color: colors.textDarker },
              ]}
            >
              {course.courseCode}: {course.courseTitle}
            </Text>
            <Text
              style={[
                GetAttendanceScreenStyles.topicName,
                { color: colors.text },
              ]}
            >
              {lecture.topicName}
            </Text>
            <Text
              style={[
                GetAttendanceScreenStyles.timestamp,
                { color: colors.text },
              ]}
            >
              {new Date().toLocaleString()}
            </Text>
            <TouchableOpacity
              style={[
                GetAttendanceScreenStyles.fetchBtn,
                { backgroundColor: colors.btnColor },
              ]}
              onPress={() => {
                setIsFetching(true);
                checkBluetoothAndStart();
              }}
            >
              <Text
                style={[
                  GetAttendanceScreenStyles.fetchBtnText,
                  { color: colors.btnTextColor },
                ]}
              >
                Take Attendance
              </Text>
            </TouchableOpacity>
          </>
        )}
        {isFetching && fetching && (
          <>
            <View style={GetAttendanceScreenStyles.pulseWrapper}>
              <View style={GetAttendanceScreenStyles.timerCircle}>
                <Text
                  style={[
                    GetAttendanceScreenStyles.timerNumber,
                    { color: colors.primary },
                  ]}
                >
                  {formatTime(secondsLeft)}
                </Text>
                <Text
                  style={[
                    GetAttendanceScreenStyles.timerLabel,
                    { color: colors.primary },
                  ]}
                >
                  Scanning...
                </Text>
              </View>
              <ActivityIndicator
                size={150}
                color={colors.primary}
                style={GetAttendanceScreenStyles.absoluteLoader}
              />
            </View>
            <Text
              style={[
                GetAttendanceScreenStyles.statsCount,
                { color: colors.text },
              ]}
            >
              {presentStudents.length} Students Detected
            </Text>
            <TouchableOpacity
              style={[
                GetAttendanceScreenStyles.fetchBtn,
                { backgroundColor: colors.btnColor },
              ]}
              onPress={handleStopFetching}
            >
              <Text
                style={[
                  GetAttendanceScreenStyles.fetchBtnText,
                  { color: colors.btnTextColor },
                ]}
              >
                End & Show Final List
              </Text>
            </TouchableOpacity>
          </>
        )}
        {!isFetching && completed && (
          <>
            <SectionList
              sections={groupedData}
              keyExtractor={item => item.studentId || item.uid}
              renderSectionHeader={({ section: { title } }) => (
                <View style={GetAttendanceScreenStyles.sectionHeader}>
                  <Text
                    style={[
                      GetAttendanceScreenStyles.sectionTitle,
                      { color: colors.textDarker },
                    ]}
                  >
                    {title}
                  </Text>
                </View>
              )}
              renderItem={({ item }) => (
                <View style={GetAttendanceScreenStyles.studentRow}>
                  <View>
                    <Text
                      style={[
                        GetAttendanceScreenStyles.studentName,
                        { color: colors.text },
                      ]}
                    >
                      {item.firstname} {item.lastname}
                    </Text>
                    <Text
                      style={[
                        GetAttendanceScreenStyles.matricNumber,
                        { color: colors.text },
                      ]}
                    >
                      {item.matricNumber || item.studentInfo?.matricNumber}
                    </Text>
                  </View>
                  {item.isException ? (
                    <Text
                      style={[
                        GetAttendanceScreenStyles.exceptionText,
                        { color: colors.primary },
                      ]}
                    >
                      EXCP
                    </Text>
                  ) : (
                    <MaterialIcons
                      name="check-circle-outlined"
                      size={24}
                      color={colors.primary}
                    />
                  )}
                </View>
              )}
              ListEmptyComponent={
                <EmptyState
                  iconName="info-outlined"
                  title="No Student found"
                  subtitle=" No student within proximity, please retry."
                />
              }
            />
            <View style={GetAttendanceScreenStyles.rowDiv}>
              <TouchableOpacity
                style={[
                  GetAttendanceScreenStyles.fetchBtn,
                  { backgroundColor: colors.btnColor },
                ]}
                onPress={() => {
                  handleDownloadReport();
                }}
              >
                <MaterialIcons
                  name="download-outlined"
                  size={20}
                  color={colors.btnTextColor}
                />
                <Text
                  style={[
                    GetAttendanceScreenStyles.fetchBtnText,
                    { color: colors.btnTextColor, marginLeft: 4 },
                  ]}
                >
                  Download
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={GetAttendanceScreenStyles.fetchBtn}
                onPress={handleRetryFetching}
              >
                <MaterialIcons
                  name="replay-outlined"
                  size={20}
                  color={colors.btnTextColor}
                />
                <Text
                  style={[
                    GetAttendanceScreenStyles.fetchBtnText,
                    { color: colors.btnTextColor, marginLeft: 4 },
                  ]}
                >
                  Rescan / Retry
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={GetAttendanceScreenStyles.fetchBtn}
                onPress={() => {
                  navigation.navigate('Home', { activeTab: 'home' });
                }}
              >
                <MaterialIcons
                  name="home-outlined"
                  size={20}
                  color={colors.btnTextColor}
                />
                <Text
                  style={[
                    GetAttendanceScreenStyles.fetchBtnText,
                    { color: colors.btnTextColor, marginLeft: 4 },
                  ]}
                >
                  Back to Home
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </View>
  );
};
export const GetAttendanceScreenStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignContent: 'center',
    padding: 20,
  },
  subContainer: {
    borderRadius: 15,
    alignContent: 'center',
    padding: 20,
  },
  pulseWrapper: {
    alignContent: 'center',
    height: 250,
    marginVertical: 15,
  },
  timerCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignContent: 'center',
    zIndex: 2,
  },
  timerNumber: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  timerLabel: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  absoluteLoader: {
    position: 'absolute',
    opacity: 0.3,
  },
  statsCount: {
    fontSize: 18,
    fontWeight: '600',
    marginVertical: 15,
  },
  miniList: {
    height: 60,
    marginTop: 10,
  },
  miniStudentName: {
    color: '#666',
    fontSize: 14,
    fontStyle: 'italic',
  },
  courseTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 15,
  },
  topicName: {
    fontSize: 14,
    marginBottom: 15,
  },
  timestamp: {
    fontSize: 12,
    marginBottom: 15,
  },
  fetchBtn: {
    borderRadius: 15,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 10,
    alignContent: 'center',
    flexDirection: 'row',
  },
  fetchBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  sectionHeader: {
    marginVertical: 10,
    width: '100%',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  studentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 5,
    borderBottomWidth: 0.8,
    borderBottomColor: PRIMARY_COLOR_TINT,
    marginBottom: 10,
  },
  studentName: {
    fontSize: 14,
    fontWeight: '500',
  },
  matricNumber: {
    fontSize: 12,
    marginTop: 5,
  },
  exceptionText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyCommentsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  emptyCommentsText: {
    fontSize: 16,
    fontWeight: '600',
    color: PRIMARY_COLOR_TINT,
    marginTop: 10,
  },
  emptyCommentsSubtext: {
    fontSize: 13,
    color: PRIMARY_COLOR_TINT,
    marginTop: 5,
  },
  rowDiv: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
  },
});