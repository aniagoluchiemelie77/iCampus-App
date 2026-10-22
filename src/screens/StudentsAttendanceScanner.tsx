import React, { useState, useEffect, useContext, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Dimensions,
  ActivityIndicator,
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
import { useAppSelector } from '../hooks/hooks';
import { SocketContext } from '../hooks/useSocket';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { PRIMARY_COLOR, PRIMARY_COLOR_TINT } from '../assets/styles/colors';
import { SERVICE_UUID } from '@env';
import { GetAttendanceScreenStyles } from './PhysicalClassGetAttendanceScreen';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from '../../App';
import { formatTime } from '../utils/durationFormatter';
import { verifyFacialIdentity } from '../api/localPostApis';
import Modal from 'react-native-modal';
import ImageResizer from '@bam.tech/react-native-image-resizer';
import { CustomButton } from '../assets/components/AppUIComponents';
import { PulseEmitter } from '../components/PulsingAnimation';
import { PageHeader } from '../components/PageHeader';
import {
  ensureBluetoothOn,
  ensureBluetoothPermissions,
  isLectureBeacon,
  startBleManager,
} from '../utils/attendance';

const rnBiometrics = new ReactNativeBiometrics();
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SEARCH_SECONDS = 120;
const SCAN_BURST_SECONDS = 10;
const SUBMIT_TIMEOUT_MS = 20000;

type Props = StackScreenProps<RootStackParamList, 'StudentAttendanceScanner'>;
type Status = 'idle' | 'preparing' | 'scanning' | 'notFound' | 'verifying' | 'submitting' | 'success' | 'error';

export const StudentAttendanceScanner = ({ route, navigation }: Props) => {
  const { colors } = useTheme();
  const { lecture } = route.params;
  const user = useAppSelector(state => state.user);
  const socketContext = useContext(SocketContext);
  const [status, setStatus] = useState<Status>('idle');
  const [showCamera, setShowCamera] = useState(false);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(SEARCH_SECONDS);
  const device = useCameraDevice('front');
  const { hasPermission, requestPermission } = useCameraPermission();
  const cameraRef = useRef<any>(null);
  const statusRef = useRef<Status>(status);
  statusRef.current = status;
  const submitTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fail = useCallback((message: string) => {
    BleManager.stopScan().catch(() => {});
    setShowCamera(false);
    setIsProcessingAI(false);
    setErrorMessage(message);
    setStatus('error');
  }, []);

  // ---- Submit -------------------------------------------------------------
  const dispatchAttendancePayload = useCallback(() => {
    setStatus('submitting');
    if (!socketContext?.socket) {
      fail('You are offline. Check your connection and try again.');
      return;
    }
    socketContext.socket.emit('student_mark_attendance', {
      lectureId: lecture.id,
      studentId: user.uid,
      timestamp: new Date().toISOString(),
    });
    if (submitTimeout.current) clearTimeout(submitTimeout.current);
    submitTimeout.current = setTimeout(() => {
      if (statusRef.current === 'submitting') {
        fail('The server did not respond. Check your connection and try again.');
      }
    }, SUBMIT_TIMEOUT_MS);
  }, [socketContext, lecture.id, user.uid, fail]);

  // ---- Identity -----------------------------------------------------------
  const openIdentityCamera = useCallback(async () => {
    if (!hasPermission) {
      const granted = await requestPermission();
      if (!granted) {
        fail('Camera access is needed to verify your identity. Allow it in Settings and try again.');
        return;
      }
    }
    setStatus('verifying');
    setShowCamera(true);
  }, [hasPermission, requestPermission, fail]);

  const handleTakeSelfie = async () => {
    if (!cameraRef.current || isProcessingAI) return;
    setIsProcessingAI(true);
    try {
      const photoFile = await cameraRef.current.takePhoto({ flash: 'off', enableShutterSound: false });
      const resized = await ImageResizer.createResizedImage(photoFile.path, 800, 800, 'JPEG', 80);
      const base64Image = await RNFS.readFile(resized.path, 'base64');
      const result = await verifyFacialIdentity(base64Image, user.schoolAvatarUrl!);
      setIsProcessingAI(false);
      if (result.verified) {
        setShowCamera(false);
        dispatchAttendancePayload();
      } else {
        fail(result.message || 'We could not match your face to your school photo. Try again in good light.');
      }
    } catch (error) {
      setIsProcessingAI(false);
      Toast.show({ type: 'error', text1: 'Camera error', text2: 'Could not take the photo. Try again.' });
    }
  };

  const verifyIdentity = useCallback(async () => {
    const biometricsEnabled = await AsyncStorage.getItem('biometrics_enabled');
    if (biometricsEnabled !== 'true') {
      await openIdentityCamera();
      return;
    }
    try {
      const { available } = await rnBiometrics.isSensorAvailable();
      if (!available) {
        await openIdentityCamera();
        return;
      }
      setStatus('verifying');
      const { success } = await rnBiometrics.simplePrompt({
        promptMessage: 'Verify your identity to mark attendance',
      });
      if (success) {
        dispatchAttendancePayload();
      } else {
        Toast.show({ type: 'info', text1: 'Fingerprint not confirmed', text2: 'Take a selfie instead.' });
        await openIdentityCamera();
      }
    } catch (err) {
      console.error('Biometric validation exception:', err);
      await openIdentityCamera();
    }
  }, [openIdentityCamera, dispatchAttendancePayload]);

  // ---- Scanning -----------------------------------------------------------
  const scanBurst = () =>
    BleManager.scan({
      serviceUUIDs: [SERVICE_UUID],
      seconds: SCAN_BURST_SECONDS,
      allowDuplicates: false,
    }).catch(err => console.warn('BLE scan error', err));

  const startSearch = async () => {
    setStatus('preparing');
    const allowed = await ensureBluetoothPermissions('scan');
    if (!allowed) return setStatus('idle');
    const on = await ensureBluetoothOn('iCampus needs it to find your lecturer’s signal in the room.');
    if (!on) return setStatus('idle');
    setSecondsLeft(SEARCH_SECONDS);
    setStatus('scanning');
    scanBurst();
  };

  const cancelSearch = () => {
    BleManager.stopScan().catch(() => {});
    setStatus('idle');
  };

  // Countdown while searching.
  useEffect(() => {
    if (status !== 'scanning') return;
    if (secondsLeft <= 0) {
      BleManager.stopScan().catch(() => {});
      setStatus('notFound');
      return;
    }
    const t = setTimeout(() => setSecondsLeft(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [status, secondsLeft]);

  useEffect(() => {
    startBleManager().catch(() => {});
    const discover = BleManager.onDiscoverPeripheral((peripheral: any) => {
      if (statusRef.current !== 'scanning') return;
      const name = peripheral?.name || peripheral?.advertising?.localName;
      // The scan only returns devices advertising the iCampus service; the
      // server additionally checks this lecture's session is open.
      if (name && !isLectureBeacon(name, lecture.id)) return;
      BleManager.stopScan().catch(() => {});
      verifyIdentity();
    });
    // Each native scan ends after a few seconds; keep going until time's up.
    const stopped = BleManager.onStopScan(() => {
      if (statusRef.current === 'scanning') scanBurst();
    });
    return () => {
      discover.remove();
      stopped.remove();
      BleManager.stopScan().catch(() => {});
      if (submitTimeout.current) clearTimeout(submitTimeout.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lecture.id, verifyIdentity]);

  // ---- Server responses ---------------------------------------------------
  useEffect(() => {
    const socket = socketContext?.socket;
    if (!socket) return;
    const onSuccess = () => {
      if (submitTimeout.current) clearTimeout(submitTimeout.current);
      setStatus('success');
    };
    const onError = (err: any) => {
      if (submitTimeout.current) clearTimeout(submitTimeout.current);
      const message = typeof err === 'string' ? err : err?.message;
      fail(
        message === 'Attendance session is no longer active.'
          ? 'Attendance isn’t open for this lecture right now. Ask your lecturer to start (or reopen) it.'
          : message || 'Could not confirm your attendance.',
      );
    };
    socket.on('attendance_success', onSuccess);
    socket.on('error', onError);
    return () => {
      socket.off('attendance_success', onSuccess);
      socket.off('error', onError);
    };
  }, [socketContext, fail]);

  // ---- UI -----------------------------------------------------------------
  const goHome = () => navigation.navigate('Home', { activeTab: 'classroom' } as any);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader title="Mark Attendance" />
      <View style={styles.body}>
        <View style={[styles.infoCard, { backgroundColor: colors.backgroundSecondary }]}>
          <View style={[styles.infoIcon, { backgroundColor: colors.primary + '1A' }]}>
            <MaterialIcons name="how-to-reg" size={24} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.topic, { color: colors.textDarker }]} numberOfLines={2}>
              {lecture.topicName}
            </Text>
            {!!lecture.location && (
              <Text style={[styles.meta, { color: colors.text }]} numberOfLines={1}>
                {lecture.location}
              </Text>
            )}
          </View>
        </View>

        {(status === 'idle' || status === 'preparing') && (
          <View style={styles.center}>
            <View style={styles.steps}>
              {[
                { icon: 'meeting-room', text: 'Be in the lecture room with your lecturer.' },
                { icon: 'bluetooth-searching', text: 'Your phone finds the class signal over Bluetooth.' },
                { icon: 'face', text: 'Confirm it’s you with your fingerprint or a selfie.' },
              ].map(step => (
                <View key={step.icon} style={styles.stepRow}>
                  <MaterialIcons name={step.icon} size={20} color={colors.primary} />
                  <Text style={[styles.stepText, { color: colors.text }]}>{step.text}</Text>
                </View>
              ))}
            </View>
            <CustomButton
              title={status === 'preparing' ? 'Getting ready…' : 'Mark attendance'}
              iconName="bluetooth-searching"
              isLoading={status === 'preparing'}
              disabled={status === 'preparing'}
              style={styles.primaryBtn}
              onPress={startSearch}
            />
          </View>
        )}

        {status === 'scanning' && (
          <View style={styles.center}>
            <View style={GetAttendanceScreenStyles.pulseWrapper}>
              <PulseEmitter size={170} strokeWidth={2} color={colors.primary} />
              <View style={GetAttendanceScreenStyles.timerCircle}>
                <Text style={[GetAttendanceScreenStyles.timerNumber, { color: colors.primary }]}>
                  {formatTime(secondsLeft)}
                </Text>
                <Text style={[GetAttendanceScreenStyles.timerLabel, { color: colors.primary }]}>
                  Searching
                </Text>
              </View>
            </View>
            <Text style={[styles.title, { color: colors.textDarker }]} accessibilityLiveRegion="polite">
              Looking for your lecturer’s signal…
            </Text>
            <Text style={[styles.sub, { color: colors.text }]}>
              Stay close to the front of the room with Bluetooth on.
            </Text>
            <TouchableOpacity onPress={cancelSearch} style={styles.linkBtn} accessibilityRole="button">
              <Text style={[styles.linkText, { color: colors.primary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        {status === 'notFound' && (
          <View style={styles.center}>
            <MaterialIcons name="bluetooth-disabled" size={72} color={colors.primary} style={styles.selfCenter} />
            <Text style={[styles.title, { color: colors.textDarker }]}>Signal not found</Text>
            <View style={styles.tips}>
              {[
                'Make sure your lecturer has started attendance.',
                'Move closer to the lecturer’s phone.',
                'Turn Bluetooth off and on, then try again.',
              ].map(tip => (
                <View key={tip} style={styles.stepRow}>
                  <MaterialIcons name="chevron-right" size={18} color={colors.primary} />
                  <Text style={[styles.stepText, { color: colors.text }]}>{tip}</Text>
                </View>
              ))}
            </View>
            <CustomButton title="Search again" iconName="refresh" style={styles.primaryBtn} onPress={startSearch} />
          </View>
        )}

        {(status === 'verifying' || status === 'submitting') && !showCamera && (
          <View style={styles.center}>
            <PulseEmitter size={70} strokeWidth={3} color={colors.primary} count={3} />
            <Text style={[styles.title, { color: colors.textDarker }]}>
              {status === 'verifying' ? 'Verifying it’s you…' : 'Recording your attendance…'}
            </Text>
          </View>
        )}

        {status === 'success' && (
          <View style={styles.center}>
            <MaterialIcons name="check-circle" size={88} color={colors.success} style={styles.selfCenter} />
            <Text style={[styles.title, { color: colors.textDarker }]}>You’re marked present</Text>
            <Text style={[styles.sub, { color: colors.text }]}>{lecture.topicName}</Text>
            <CustomButton title="Done" style={styles.primaryBtn} onPress={goHome} />
          </View>
        )}

        {status === 'error' && (
          <View style={styles.center}>
            <MaterialIcons name="sync-problem" size={80} color={colors.primary} style={styles.selfCenter} />
            <Text style={[styles.title, { color: colors.textDarker }]}>Couldn’t confirm attendance</Text>
            <Text style={[styles.sub, { color: colors.text }]}>{errorMessage}</Text>
            <CustomButton title="Try again" iconName="refresh" style={styles.primaryBtn} onPress={startSearch} />
          </View>
        )}
      </View>

      <Modal
        isVisible={showCamera}
        onBackButtonPress={() => {
          setShowCamera(false);
          setStatus('idle');
        }}
        style={styles.modalOverride}
      >
        <View style={styles.cameraContainer}>
          <Text style={[styles.cameraTitleHeader, { color: '#fff' }]}>Take a selfie to verify</Text>
          {device && hasPermission ? (
            <Camera ref={cameraRef} style={styles.previewStyle} device={device} isActive={showCamera} />
          ) : (
            <View style={[styles.errorContainer, { backgroundColor: colors.backgroundSecondary }]}>
              <Text style={[styles.title, { color: colors.text }]}>
                {!device ? 'Front camera unavailable.' : 'Camera permission required.'}
              </Text>
            </View>
          )}
          <View style={[styles.cameraActionTray, { backgroundColor: colors.backgroundSecondary }]}>
            {isProcessingAI ? (
              <View style={styles.processingRow}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.sub, { color: colors.text, marginTop: 0 }]}>Checking your photo…</Text>
              </View>
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
                  style={[styles.captureBtn, { backgroundColor: colors.btnColor }]}
                  onPress={handleTakeSelfie}
                  accessibilityLabel="Take selfie"
                >
                  <MaterialIcons name="photo-camera" size={18} color={colors.btnTextColor} />
                  <Text style={[styles.captureText, { color: colors.btnTextColor }]}>Take selfie</Text>
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
  container: { flex: 1 },
  body: { flex: 1, paddingHorizontal: 16, paddingBottom: 24 },
  infoCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 18, marginTop: 4 },
  infoIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  topic: { fontSize: 16, fontWeight: '800' },
  meta: { fontSize: 12.5, marginTop: 3, opacity: 0.8 },
  center: { flex: 1, justifyContent: 'center' },
  selfCenter: { alignSelf: 'center' },
  steps: { gap: 14, marginBottom: 28 },
  tips: { gap: 10, marginVertical: 18 },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepText: { flex: 1, fontSize: 14, lineHeight: 20 },
  primaryBtn: { height: 54, borderRadius: 27, marginTop: 16 },
  title: { fontSize: 18, fontWeight: '800', textAlign: 'center', marginTop: 14 },
  sub: { fontSize: 14, textAlign: 'center', marginTop: 8, opacity: 0.8, lineHeight: 20 },
  linkBtn: { alignSelf: 'center', paddingVertical: 12, paddingHorizontal: 20, marginTop: 10 },
  linkText: { fontSize: 14.5, fontWeight: '700' },
  processingRow: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  modalOverride: { margin: 0, alignItems: 'center', justifyContent: 'center' },
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000',
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
  },
  cameraTitleHeader: { fontSize: 18, fontWeight: '700', textAlign: 'center', marginVertical: 16, zIndex: 10 },
  previewStyle: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  cameraActionTray: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 0.8,
    borderColor: PRIMARY_COLOR_TINT,
    zIndex: 10,
    position: 'absolute',
    bottom: 24,
    right: 16,
    left: 16,
    padding: 18,
    borderRadius: 18,
  },
  captureBtn: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureText: { fontSize: 14.5, fontWeight: '700' },
  cancelBtn: {
    paddingVertical: 12,
    borderRadius: 22,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: PRIMARY_COLOR,
  },
  cancelText: { color: PRIMARY_COLOR, fontSize: 14, fontWeight: '600' },
  errorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, zIndex: 10 },
});
