import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Linking } from 'react-native';
import BleManager from 'react-native-ble-manager';
import { SocketContext } from '../screens/HomeScreen';
import { useAppSelector } from '../components/hooks';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { PRIMARY_COLOR, PRIMARY_COLOR_TINT } from '../components/Classroomcomponent';
import { SERVICE_UUID } from '@env';

interface StudentAttendanceScannerProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export const StudentAttendanceScanner: React.FC<StudentAttendanceScannerProps> = ({ onSuccess, onCancel }) => {
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
    setMessage('Searching for lecturer\'s signal...');

    try {
      await BleManager.scan([SERVICE_UUID], 10, true);
      // The actual detection happens in the 'BleManagerDiscoverPeripheral' event listener
    } catch (err) {
      setError('Failed to start scanner. Is Bluetooth on?');
      setIsScanning(false);
    }
  };
  const handleJoinAttendance = async () => {
  try {
    await BleManager.checkState(); 
    setModalVisible(true);
  } catch (e) {
    Alert.alert(
      "Bluetooth Off",
      "Please turn on Bluetooth to join the physical attendance.",
      [{ text: "Go to Settings", onPress: () => Linking.sendIntent('android.settings.BLUETOOTH_SETTINGS') }]
    );
  }
};
  useEffect(() => {
    const handleDiscover = (data: any) => {
      // Logic: The peripheral name is set by the lecturer as 'iCampus-lectureId'
      const name = data.name || data.advertising?.localName;
      
      if (name && name.startsWith('iCampus-')) {
        const detectedLectureId = name.split('iCampus-')[1];
        
        // 2. Stop scanning immediately once found
        BleManager.stopScan();
        setIsScanning(false);
        setMessage('Signal found! Checking you in...');

        // 3. Inform the server via Socket
        socketContext?.socket?.emit('student_mark_attendance', {
          lectureId: detectedLectureId,
          studentId: user.uid,
          timestamp: new Date().toISOString(),
        });

        onSuccess();
      }
    };

    // Add listener
    const discoverListener = BleManager.addListener('BleManagerDiscoverPeripheral', handleDiscover);

    return () => {
      discoverListener.remove();
    };
  }, [socketContext, user.uid, onSuccess]);

  return (
    <View style={styles.container}>
      <Icon name="radar" size={80} color={isScanning ? PRIMARY_COLOR : '#ccc'} />
      <Text style={styles.statusText}>{message}</Text>
      
      {error && <Text style={styles.errorText}>{error}</Text>}

      {isScanning ? (
        <ActivityIndicator size="large" color={PRIMARY_COLOR} style={{ marginTop: 20 }} />
      ) : (
        <TouchableOpacity style={styles.joinBtn} onPress={startScan}>
          <Text style={styles.joinBtnText}>Scan for Class</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity onPress={onCancel} style={styles.cancelBtn}>
        <Text style={styles.cancelBtnText}>Close</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 30, alignItems: 'center', backgroundColor: '#fff', borderRadius: 20 },
  statusText: { fontSize: 16, textAlign: 'center', marginTop: 20, color: '#444' },
  errorText: { color: 'red', marginTop: 10, fontSize: 12 },
  joinBtn: { 
    backgroundColor: PRIMARY_COLOR, 
    paddingHorizontal: 40, 
    paddingVertical: 15, 
    borderRadius: 12, 
    marginTop: 30 
  },
  joinBtnText: { color: '#fff', fontWeight: 'bold' },
  cancelBtn: { marginTop: 20 },
  cancelBtnText: { color: '#888' }
});