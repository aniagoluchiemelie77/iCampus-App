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
import { useTheme } from '../context/ThemeContext';
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
import { useAppSelector } from '../hooks/hooks';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { PRIMARY_COLOR, PRIMARY_COLOR_TINT } from '../assets/styles/colors';
import { SERVICE_UUID } from '@env';
import { LogoBigger } from '../assets/images/Logo';
import { GetAttendanceScreenStyles } from './PhysicalClassGetAttendanceScreen';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../../App';
import { formatTime } from '../utils/durationFormatter';
import { verifyFacialIdentity } from '../api/localPostApis';
import Modal from 'react-native-modal';
import ImageResizer from '@bam.tech/react-native-image-resizer';

const rnBiometrics = new ReactNativeBiometrics();
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type Props = StackScreenProps<RootStackParamList, 'StudentAttendanceScanner'>;
const BleManagerModule = NativeModules.BleManager;
const bleManagerEmitter = new NativeEventEmitter(BleManagerModule);

export const StudentAttendanceScanner = ({ route, navigation }: Props) => {
  const { colors } = useTheme();
  const { lecture } = route.params;
  const user = useAppSelector(state => state.user);
  const socketContext = useContext(SocketContext);
  const [isScanning, setIsScanning] = useState(false);
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
  const cameraRef = useRef<Camera>(null);
  const detectedLectureIdRef = useRef<string | null>(null);

  const dispatchAttendancePayload = useCallback(() => {
    setStatus('joining');
    setIsScanning(false);
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
      const resized = await ImageResizer.createResizedImage(
        photoFile.path,
        800,
        800,
        'JPEG',
        80,
      );
      const base64Image = await RNFS.readFile(resized.path, 'base64');
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
    if (timerRef.current) clearInterval(timerRef.current);
    try {
      const intervalId = setInterval(() => {
        setSecondsLeft(prev => (prev <= 1 ? 0 : prev - 1));
      }, 1000);
      timerRef.current = intervalId;
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
        setStatus('verifying');
        await openIdentityCamera();
      }
    },
    [lecture.id, openIdentityCamera, executeBiometricVerification],
  );
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
  }, [handleHostSignalFound]);
  useEffect(() => {
    if (!socketContext?.socket) return;
    const socket = socketContext.socket;

    socket.on('attendance_success', () => {
      setStatus('success');
      setTimeout(
        () => navigation.navigate('Home', { activeTab: 'home' }),
        4000,
      );
    });

    socket.on('error', (err: string) => {
      setIsScanning(false);
      BleManager.stopScan().catch(() => {});

      if (timerRef.current) clearInterval(timerRef.current);

      setStatus('error');
      setErrorMessage(err);
    });

    return () => {
      socket.off('attendance_success');
      socket.off('error');
    };
  }, [socketContext, navigation]);
  useEffect(() => {
    BleManager.start({ showAlert: false });

    return () => {
      BleManager.stopScan().catch(err =>
        console.log('BLE cleanup ignored:', err),
      );
    };
  }, []);

  const idle = status === 'idle';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.subContainer,
          { backgroundColor: colors.backgroundSecondary },
        ]}
      >
        <LogoBigger />
        {idle && (
          <>
            <MaterialIcons
              name="info-outlined"
              size={80}
              color={colors.primary}
            />
            <Text style={[styles.joinText, { color: colors.text }]}>
              Attendance for {lecture.topicName} is ongoing, click the button
              below to scan and join
            </Text>
            <TouchableOpacity
              style={[styles.joinBtn, { backgroundColor: colors.btnColor }]}
              onPress={handleJoinAttendance}
            >
              <Text
                style={[styles.joinBtnText, { color: colors.btnTextColor }]}
              >
                Join Attendance
              </Text>
            </TouchableOpacity>
          </>
        )}
        {isScanning && status === 'joining' && (
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
                Stop Scan
              </Text>
            </TouchableOpacity>
          </>
        )}
        {status === 'success' && !isScanning && (
          <View style={styles.feedbackContainer}>
            <MaterialIcons
              name="check-circle-outlined"
              size={80}
              color={colors.success}
            />
            <Text style={[styles.successText, { color: colors.textDarker }]}>
              Attendance Confirmed
            </Text>
            <Text style={[styles.subText, { color: colors.text }]}>
              Redirecting to home in 4 seconds...
            </Text>
          </View>
        )}
        {status === 'error' && (
          <View style={styles.feedbackContainer}>
            <MaterialIcons
              name="sync-problem-outlined"
              size={100}
              color={colors.primary}
            />
            <Text style={[styles.errorText, { color: colors.textDarker }]}>
              Failed to Confirm Attendance
            </Text>
            <Text style={[styles.subText, { color: colors.text }]}>
              {errorMessage}
            </Text>
            <TouchableOpacity
              style={[styles.retryBtn, { backgroundColor: colors.btnColor }]}
              onPress={() => setStatus('idle')}
            >
              <Text
                style={[styles.retryBtnText, { color: colors.btnTextColor }]}
              >
                Retry
              </Text>
            </TouchableOpacity>
          </View>
        )}
        {!isScanning && status === 'joining' && (
          <View style={styles.feedbackContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.joinText, { color: colors.text }]}>
              Submitting your verified attendance attendance record...
            </Text>
          </View>
        )}
      </View>
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
          <Text
            style={[styles.cameraTitleHeader, { color: colors.btnTextColor }]}
          >
            Identity Verification
          </Text>
          {device && hasPermission ? (
            <Camera
              ref={cameraRef}
              style={styles.previewStyle}
              device={device}
              isActive={showCamera}
              photo={true}
            />
          ) : (
            <View
              style={[
                styles.errorContainer,
                { backgroundColor: colors.backgroundSecondary },
              ]}
            >
              <Text style={[styles.errorText, { color: colors.text }]}>
                {!device
                  ? 'Front camera device initialization failed.'
                  : 'Camera permission required.'}
              </Text>
            </View>
          )}
          <View
            style={[
              styles.cameraActionTray,
              { backgroundColor: colors.backgroundSecondary },
            ]}
          >
            {isProcessingAI ? (
              <ActivityIndicator size="large" color={colors.primary} />
            ) : (
              <>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => {
                    setShowCamera(false);
                    setStatus('idle');
                  }}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.captureBtn,
                    { backgroundColor: colors.btnColor },
                  ]}
                  onPress={handleTakeSelfie}
                >
                  <Text
                    style={[styles.captureText, { color: colors.btnTextColor }]}
                  >
                    Take Selfie
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 15, flex: 1, alignContent: 'center' },
  subContainer: { padding: 20, borderRadius: 15, alignContent: 'center' },
  joinBtn: {
    paddingHorizontal: 16,
    borderRadius: 15,
    paddingVertical: 10,
  },
  joinBtnText: { fontSize: 14, fontWeight: 'bold' },
  joinText: {
    fontSize: 14,
    marginVertical: 25,
    fontWeight: 'bold',
  },
  feedbackContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginTop: 20,
  },
  successText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 15,
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  subText: {
    fontSize: 14,
  },
  retryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 15,
    marginTop: 20,
  },
  retryBtnText: {
    fontWeight: '600',
    fontSize: 14,
  },
  modalOverride: {
    margin: 0,
    alignContent: 'center',
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000',
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    position: 'relative',
  },
  cameraTitleHeader: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginVertical: 16,
    zIndex: 10,
    textShadowColor: 'rgba(255, 255, 255, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  previewStyle: {
    flex: 1,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  cameraActionTray: {
    width: '100%',
    flexDirection: 'row',
    alignContent: 'center',
    justifyContent: 'space-between',
    borderWidth: 0.8,
    borderColor: PRIMARY_COLOR_TINT,
    zIndex: 10,
    position: 'absolute',
    bottom: 10,
    right: 10,
    left: 10,
    padding: 20,
    borderRadius: 15,
  },
  captureBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 15,
    alignContent: 'center',
    shadowColor: PRIMARY_COLOR_TINT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  captureText: {
    fontSize: 14,
    fontWeight: '600',
  },

  cancelBtn: {
    paddingVertical: 10,
    borderRadius: 15,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: PRIMARY_COLOR,
    alignContent: 'center',
  },
  cancelText: {
    color: PRIMARY_COLOR,
    fontSize: 14,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    alignContent: 'center',
    padding: 32,
    zIndex: 10,
  },
});
