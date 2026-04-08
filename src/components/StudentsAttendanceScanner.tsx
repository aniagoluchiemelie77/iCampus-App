import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  NativeEventEmitter,
  NativeModules,
} from 'react-native';
import BleManager from 'react-native-ble-manager';
import { SocketContext } from '../screens/HomeScreen';
import { useAppSelector } from '../components/hooks';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  PRIMARY_COLOR,
  PRIMARY_COLOR_TINT,
} from '../components/Classroomcomponent';
import { SERVICE_UUID } from '@env';
import { LogoBigger } from 'assets/images/Logo';
import { Lecture } from 'types/firebase';

const BleManagerModule = NativeModules.BleManager;
const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);
interface StudentAttendanceScannerProps {
  onSuccess: () => void;
  onCancel: () => void;
  lecture: Lecture;
}

export const StudentAttendanceScanner: React.FC<
  StudentAttendanceScannerProps
> = ({ onSuccess, onCancel, lecture }) => {
  const user = useAppSelector(state => state.user);
  const socketContext = useContext(SocketContext);
  const [isScanning, setIsScanning] = useState(false);
  const [message, setMessage] = useState('Ready to join attendance');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    BleManager.start({ showAlert: false });
  }, []);

  const startScan = async () => {
    setIsScanning(true);
    setError(null);
    setMessage("Searching for lecturer's signal...");

    try {
      // UPDATED: Use the options object format
      await BleManager.scan({
        serviceUUIDs: [SERVICE_UUID], // The UUIDs to filter by
        seconds: 10, // Duration of scan
        allowDuplicates: false, // Usually false for performance
      });

      console.log('Scan started successfully');
    } catch (err) {
      console.error('Scan error:', err);
      setError('Failed to start scanner. Is Bluetooth on?');
      setIsScanning(false);
    }
  };
  const handleJoinAttendance = async () => {
    try {
      await BleManager.checkState();
      startScan();
    } catch (e) {
      Alert.alert(
        'Bluetooth Off',
        'Please turn on Bluetooth to join the physical attendance.',
        [
          {
            text: 'Go to Settings',
            onPress: () =>
              Linking.sendIntent('android.settings.BLUETOOTH_SETTINGS'),
          },
        ],
      );
    }
  };
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

  return (
    <View style={styles.container}>
      <LogoBigger />
      <Text style={styles.statusText}>{message}</Text>

      {error && <Text style={styles.errorText}>{error}</Text>}

      {isScanning ? (
        <ActivityIndicator
          size="large"
          color={PRIMARY_COLOR}
          style={{ marginTop: 20 }}
        />
      ) : (
        <>
          <Icon
            name="info"
            size={60}
            color={PRIMARY_COLOR}
            style={styles.joinIcon}
          />
          <Text style={styles.joinText}>
            {' '}
            Attendance for {lecture.topicName} is ongoing, click the button
            below to join
          </Text>
          <TouchableOpacity
            style={styles.joinBtn}
            onPress={handleJoinAttendance}
          >
            <Text style={styles.joinBtnText}>Scan for Class</Text>
          </TouchableOpacity>
        </>
      )}

      <TouchableOpacity onPress={onCancel} style={styles.cancelBtn}>
        <Text style={styles.cancelBtnText}>Close</Text>
      </TouchableOpacity>
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
  errorText: { color: 'red', marginTop: 10, fontSize: 12 },
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
  cancelBtn: { marginTop: 20 },
  cancelBtnText: { color: '#888' },
});