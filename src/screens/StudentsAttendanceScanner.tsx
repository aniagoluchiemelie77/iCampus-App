import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  NativeEventEmitter,
  NativeModules,
} from 'react-native';
import BleManager from 'react-native-ble-manager';
import { SocketContext } from './HomeScreen';
import { useAppSelector } from '../components/hooks';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  PRIMARY_COLOR,
  PRIMARY_COLOR_TINT,
} from '../components/Classroomcomponent';
import { SERVICE_UUID } from '@env';
import { LogoBigger } from 'assets/images/Logo';
import {
  formatTimer,
  GetAttendanceScreenStyles,
} from './PhysicalClassGetAttendanceScreen';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../../App';

type Props = StackScreenProps<RootStackParamList, 'StudentAttendanceScanner'>;
type AttendanceStatus = 'idle' | 'joining' | 'completed' | 'success' | 'error';
const BleManagerModule = NativeModules.BleManager;
const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);


export const StudentAttendanceScanner = ({ route, navigation }: Props) => {
  const { lecture } = route.params;
  const user = useAppSelector(state => state.user);
  const socketContext = useContext(SocketContext);
  const [isScanning, setIsScanning] = useState(false);
  const [message, setMessage] = useState('Ready to join attendance');
  const [status, setStatus] = useState<AttendanceStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [secondsLeft, setSecondsLeft] = useState(300);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    BleManager.start({ showAlert: false });
  }, []);

  const startScan = async () => {
    setStatus('joining');
    setSecondsLeft(300);
    setIsScanning(true);
    setMessage("Searching for lecturer's signal...");

    try {
      timerRef.current = setInterval(() => {
        setSecondsLeft(prev => (prev <= 1 ? 0 : prev - 1));
      }, 1000);
      await BleManager.scan({
        serviceUUIDs: [SERVICE_UUID],
        seconds: 10,
        allowDuplicates: false,
      });
      console.log('Scan started successfully');
    } catch (err) {
      console.error('Scan error:', err);
      setIsScanning(false);
    }
  };
  const handleJoinAttendance = async () => {
    try {
      const state = await BleManager.checkState();
      if (state !== 'on') {
        Alert.alert(
          'Bluetooth Required',
          'Please turn on Bluetooth to scan for the lecturer’s signal.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Settings',
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
        return;
      }
      startScan();
    } catch (e) {
      console.error('Bluetooth state check failed', e);
      Alert.alert('Error', 'Could not verify Bluetooth status.');
    }
  };
  const handleStopFetching = async () => {
    setIsScanning(false);
    if (timerRef.current) clearInterval(timerRef.current);
    setStatus('completed');
  };
  const onSuccess = useCallback(() => {
    navigation.navigate('Home');
  }, [navigation]);
  useEffect(() => {
    const handleDiscover = (data: any) => {
      const name = data.name || data.advertising?.localName;
      if (name && name.startsWith('iCampus-')) {
        const detectedLectureId = name.split('iCampus-')[1];
        BleManager.stopScan();
        setIsScanning(false);
        setMessage('Signal found! Checking you in...');
        socketContext?.socket?.emit('student_mark_attendance', {
          lectureId: detectedLectureId,
          studentId: user.uid,
          timestamp: new Date().toISOString(),
        });
        onSuccess();
      }
    };
    const discoverListener = bleManagerEmitter.addListener(
      'BleManagerDiscoverPeripheral',
      handleDiscover,
    );

    return () => {
      discoverListener.remove();
    };
  }, [socketContext, user.uid, onSuccess]);
  useEffect(() => {
    if (!socketContext?.socket) return;

    const socket = socketContext.socket;
    socket.on('attendance_success', (data: { message: string }) => {
      setIsScanning(false);
      if (timerRef.current) clearInterval(timerRef.current);
      setStatus('success');
      setMessage(data.message);
      setTimeout(() => {
        onSuccess();
      }, 4000);
    });

    // Handle Error
    socket.on('error', (err: string) => {
      setIsScanning(false);
      setStatus('error');
      setErrorMessage(err);
    });

    return () => {
      socket.off('attendance_success');
      socket.off('error');
    };
  }, [socketContext, onSuccess]);
  const idle = status === 'idle';
  const fetching = status === 'joining';

  return (
    <View style={styles.container}>
      <LogoBigger />
      {idle && (
        <>
          <Icon
            name="info"
            size={100}
            color={PRIMARY_COLOR}
            style={styles.joinIcon}
          />
          <Text style={styles.joinText}>
            {' '}
            Attendance for {lecture.topicName} is ongoing, click the button
            below to scan and join
          </Text>
          <TouchableOpacity
            style={styles.joinBtn}
            onPress={handleJoinAttendance}
          >
            <Text style={styles.joinBtnText}>Join Attendance</Text>
          </TouchableOpacity>
        </>
      )}
      {isScanning && fetching && (
        <View style={GetAttendanceScreenStyles.fetchingContainer}>
          <View style={GetAttendanceScreenStyles.pulseWrapper}>
            <View style={GetAttendanceScreenStyles.timerCircle}>
              <Text style={GetAttendanceScreenStyles.timerNumber}>
                {formatTimer(secondsLeft)}
              </Text>
              <Text style={GetAttendanceScreenStyles.timerLabel}>
                Scanning...
              </Text>
            </View>
            <ActivityIndicator
              size={150}
              color={PRIMARY_COLOR}
              style={GetAttendanceScreenStyles.absoluteLoader}
            />
          </View>
          <TouchableOpacity
            style={GetAttendanceScreenStyles.fetchBtn}
            onPress={handleStopFetching}
          >
            <Text style={GetAttendanceScreenStyles.fetchBtnText}>
              Stop Scan
            </Text>
          </TouchableOpacity>
        </View>
      )}
      {/* SUCCESS STATE */}
      {status === 'success' && !isScanning && (
        <View style={styles.feedbackContainer}>
          <Icon name="check-circle" size={100} color={PRIMARY_COLOR} />
          <Text style={styles.successText}>Attendance Marked!</Text>
          <Text style={styles.subText}>
            Redirecting to home in 4 seconds...
          </Text>
        </View>
      )}

      {/* ERROR STATE */}
      {status === 'error' && (
        <View style={styles.feedbackContainer}>
          <Icon name="alert-circle" size={100} color={PRIMARY_COLOR} />
          <Text style={styles.errorText}>Failed to Mark Attendance</Text>
          <Text style={styles.subText}>{errorMessage}</Text>

          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => setStatus('idle')}
          >
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}
      <Text style={styles.statusText}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 20, alignItems: 'center', backgroundColor: '#fff' },
  statusText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
    color: '#444',
  },
  joinBtn: {
    backgroundColor: PRIMARY_COLOR,
    padding: 20,
    borderRadius: 12,
    marginTop: 20,
  },
  joinIcon: {
    marginVertical: 20,
  },
  joinBtnText: { color: '#fff', fontWeight: 'bold' },
  joinText: {
    fontSize: 18,
    color: PRIMARY_COLOR,
    fontWeight: 'bold',
  },
  feedbackContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    marginTop: 20,
  },
  successText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: PRIMARY_COLOR,
    marginTop: 15,
  },
  errorText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: PRIMARY_COLOR,
    marginTop: 15,
  },
  subText: {
    fontSize: 14,
    color: PRIMARY_COLOR_TINT,
    marginTop: 10,
    textAlign: 'center',
  },
  retryBtn: {
    backgroundColor: PRIMARY_COLOR,
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  retryBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
});
