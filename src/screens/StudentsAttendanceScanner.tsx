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
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ReactNativeBiometrics from 'react-native-biometrics';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
} from 'react-native-vision-camera';
import RNFS from 'react-native-fs';
import Toast from 'react-native-toast-message';
import BleManager from 'react-native-ble-manager';
import { SocketContext } from './HomeScreen';
import { useAppSelector } from '../components/hooks';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {
  PRIMARY_COLOR,
  PRIMARY_COLOR_TINT,
} from '../components/Classroomcomponent';
import { SERVICE_UUID } from '@env';
import { LogoBigger } from 'assets/images/Logo';
import { GetAttendanceScreenStyles } from './PhysicalClassGetAttendanceScreen';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../../App';
import { formatTime } from '../utils/durationFormatter';
import { verifyFacialIdentity } from '../api/localPostApis';
import toastConfig from '../components/ToastConfig';
import Modal from 'react-native-modal';

const rnBiometrics = new ReactNativeBiometrics();
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type Props = StackScreenProps<RootStackParamList, 'StudentAttendanceScanner'>;
const BleManagerModule = NativeModules.BleManager;
const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);

export const StudentAttendanceScanner = ({ route, navigation }: Props) => {
  const { lecture } = route.params;
  const user = useAppSelector(state => state.user);
  const socketContext = useContext(SocketContext);
  const [isScanning, setIsScanning] = useState(false);
  const [message, setMessage] = useState('Ready to join attendance');
  const [status, setStatus] = useState<
    'idle' | 'joining' | 'verifying' | 'success' | 'error'
  >('idle');
  const [showCamera, setShowCamera] = useState(false);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const device = useCameraDevice('front');
  const { hasPermission, requestPermission } = useCameraPermission();

  const [secondsLeft, setSecondsLeft] = useState(300);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    BleManager.start({ showAlert: false });
  }, []);
  const cameraRef = useRef<Camera>(null);
  const detectedLectureIdRef = useRef<string | null>(null);

  const dispatchAttendancePayload = useCallback(() => {
    setStatus('joining');
    setMessage('Identity secure. Emitting presence token...');

    socketContext?.socket?.emit('student_mark_attendance', {
      lectureId: detectedLectureIdRef.current,
      studentId: user.uid,
      timestamp: new Date().toISOString(),
    });
  }, [socketContext, user.uid]);
  const openIdentityCamera = useCallback(async () => {
    if (!hasPermission) {
      const granted = await requestPermission();
      if (!granted) {
        Toast.show({
          type: 'error',
          text1: 'Permission Denied',
          text2: 'Camera access is required for AI identity verification.',
        });
        return;
      }
    }
    setShowCamera(true);
  }, [hasPermission, requestPermission]);
  const handleTakeSelfie = async () => {
    if (!cameraRef.current || isProcessingAI) return;
    setIsProcessingAI(true);
    try {
      const photoFile = await cameraRef.current.takePhoto({
        flash: 'off',
        enableShutterSound: false,
      });
      setMessage('Processing image bytes...');
      const base64Image = await RNFS.readFile(photoFile.path, 'base64');
      setMessage('Comparing face with institutional profile...');
      const result = await verifyFacialIdentity(
        base64Image,
        user.schoolAvatarUrl!,
      );
      if (result.verified) {
        setShowCamera(false);
        dispatchAttendancePayload();
      } else {
        setIsProcessingAI(false);
        setStatus('error');
        setErrorMessage(result.message || 'Facial verification failed.');
        setShowCamera(false);
      }
    } catch (error) {
      setIsProcessingAI(false);
      Toast.show({
        type: 'error',
        text1: 'Camera Error',
        text2: 'Failed to accurately capture photo payload.',
      });
    }
  };
  const executeBiometricVerification = useCallback(async () => {
    try {
      const { available } = await rnBiometrics.isSensorAvailable();
      if (!available) {
        await openIdentityCamera();
        return;
      }

      const { success } = await rnBiometrics.simplePrompt({
        promptMessage: 'Verify your identity to mark attendance',
      });

      if (success) {
        dispatchAttendancePayload();
      } else {
        Toast.show({
          type: 'error',
          text1: 'Biometric Match Failed',
          text2: 'Defaulting to selfie capture.',
        });
        await openIdentityCamera();
      }
    } catch (err) {
      console.error('Biometric validation exception:', err);
      await openIdentityCamera();
    }
  }, [openIdentityCamera, dispatchAttendancePayload]);
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
    setStatus('success');
  };
  const handleHostSignalFound = useCallback(
    async (discoveredId: string) => {
      if (discoveredId !== lecture.id) {
        console.log(
          'Found an iCampus signal, but it belongs to a different lecture session.',
        );
        return;
      }
      detectedLectureIdRef.current = discoveredId;
      BleManager.stopScan();
      setIsScanning(false);
      if (timerRef.current) clearInterval(timerRef.current);

      const biometricsEnabled = await AsyncStorage.getItem(
        'biometrics_enabled',
      );
      if (biometricsEnabled === 'true') {
        await executeBiometricVerification();
      } else {
        setMessage('Identity confirmation required.');
        setStatus('verifying');
        await openIdentityCamera();
      }
    },
    [lecture.id, openIdentityCamera, executeBiometricVerification],
  );

  // --- Core Lifecycle Bluetooth Listeners ---
  useEffect(() => {
    const handleDiscover = (data: any) => {
      const name = data.name || data.advertising?.localName;
      if (name && name.startsWith('iCampus-')) {
        const detectedLectureId = name.split('iCampus-')[1];
        handleHostSignalFound(detectedLectureId);
      }
    };
    const discoverListener = bleManagerEmitter.addListener(
      'BleManagerDiscoverPeripheral',
      handleDiscover,
    );
    return () => discoverListener.remove();
  }, [socketContext, user.schoolAvatarUrl, handleHostSignalFound]);
  useEffect(() => {
    if (!socketContext?.socket) return;
    const socket = socketContext.socket;

    socket.on('attendance_success', (data: { message: string }) => {
      setStatus('success');
      setMessage(data.message);
      setTimeout(
        () => navigation.navigate('Home', { activeTab: 'home' }),
        4000,
      );
    });

    socket.on('error', (err: string) => {
      setStatus('error');
      setErrorMessage(err);
    });

    return () => {
      socket.off('attendance_success');
      socket.off('error');
    };
  }, [socketContext, navigation]);
  const idle = status === 'idle';
  const fetching = status === 'joining';

  return (
    <View style={styles.container}>
      <LogoBigger />
      {idle && (
        <>
          <MaterialIcons
            name="info-outlined"
            size={80}
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
                {formatTime(secondsLeft)}
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
          <MaterialIcons
            name="check-circle-outlined"
            size={80}
            color={PRIMARY_COLOR}
          />
          <Text style={styles.successText}>Attendance Marked!</Text>
          <Text style={styles.subText}>
            Redirecting to home in 4 seconds...
          </Text>
        </View>
      )}

      {/* ERROR STATE */}
      {status === 'error' && (
        <View style={styles.feedbackContainer}>
          <MaterialIcons
            name="sync-problem-outlined"
            size={100}
            color={PRIMARY_COLOR}
          />
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
      <Modal
        isVisible={showCamera}
        onBackdropPress={() => {}}
        swipeDirection="down"
        onSwipeComplete={() => {
          setShowCamera(false);
          setStatus('idle');
        }}
        style={styles.modalOverride}
      >
        <View style={styles.cameraContainer}>
          <Text style={styles.cameraTitleHeader}>Identity Verification</Text>
          {device && hasPermission ? (
            <Camera
              ref={cameraRef}
              style={styles.previewStyle}
              device={device}
              isActive={showCamera}
              photo={true}
            />
          ) : (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>
                {!device
                  ? 'Front camera device initialization failed.'
                  : 'Camera permission required.'}
              </Text>
            </View>
          )}

          <View style={styles.cameraActionTray}>
            {isProcessingAI ? (
              <ActivityIndicator size="large" color={PRIMARY_COLOR} />
            ) : (
              <>
                <TouchableOpacity
                  style={styles.captureBtn}
                  onPress={handleTakeSelfie}
                >
                  <Text style={styles.captureText}>Take Selfie</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => {
                    setShowCamera(false);
                    setStatus('idle');
                  }}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
      <Toast config={toastConfig} />
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
  modalOverride: {
    margin: 0,
    alignContent: 'center',
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: '#222',
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
  },

  // --- Header Elements ---
  cameraTitleHeader: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
    textAlign: 'center',
    marginVertical: 16,
    zIndex: 10,
    textShadowColor: 'rgba(255, 255, 255, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },

  // --- Core Camera Viewport ---
  // To keep human facial proportions looking natural without stretching distortion
  previewStyle: {
    flex: 1,
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  cameraActionTray: {
    width: '100%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
    flexDirection: 'row',
    alignContent: 'center',
    gap: 16,
    borderWidth: 0.8,
    borderColor: PRIMARY_COLOR_TINT,
    zIndex: 10,
  },
  captureBtn: {
    backgroundColor: PRIMARY_COLOR,
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 14,
    alignContent: 'center',
    shadowColor: PRIMARY_COLOR_TINT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  captureText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  cancelBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: PRIMARY_COLOR,
    alignContent: 'center',
  },
  cancelText: {
    color: PRIMARY_COLOR,
    fontSize: 14,
    fontWeight: '500',
  },

  // --- Hardware Error/Fallback Interface States ---
  errorContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    backgroundColor: '#fff',
  },
});
