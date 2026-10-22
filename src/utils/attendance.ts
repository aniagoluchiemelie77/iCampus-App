import { Alert, Linking, Platform } from 'react-native';
import BleManager from 'react-native-ble-manager';
import {
  PERMISSIONS,
  RESULTS,
  openSettings,
  requestMultiple,
  Permission,
} from 'react-native-permissions';
import Toast from 'react-native-toast-message';
import { Lecture } from '../types/firebase';
import {
  getAllExceptionsForOngoingLecture,
  getCourseDetailsForOngoingLecture,
} from '../api/localGetApis';

// ---------------------------------------------------------------------------
// Beacon naming
// ---------------------------------------------------------------------------
// The lecturer's phone advertises its Bluetooth name next to the 128-bit
// iCampus service UUID, and the whole advert must fit in 31 bytes. That leaves
// at most 8 bytes for the name ("iCampus-<lectureId>" made Android reject the
// advert), so the beacon is "iC" + a 5-character code derived from the id.
const djb2 = (value: string) => {
  let hash = 5381;
  for (let i = 0; i < value.length; i++) {
    hash = ((hash << 5) + hash + value.charCodeAt(i)) >>> 0;
  }
  return hash;
};

export const beaconNameFor = (lectureId: string) =>
  `iC${djb2(String(lectureId)).toString(36).toUpperCase().padStart(5, '0').slice(-5)}`;

/** True when a discovered device name is this lecture's beacon. */
export const isLectureBeacon = (deviceName: string | undefined | null, lectureId: string) => {
  if (!deviceName) return false;
  const name = deviceName.trim();
  // Current short beacon, or the old long "iCampus-<id>" name.
  return name === beaconNameFor(lectureId) || name === `iCampus-${lectureId}`;
};

// ---------------------------------------------------------------------------
// Permissions + Bluetooth state
// ---------------------------------------------------------------------------
const permissionsFor = (mode: 'advertise' | 'scan'): Permission[] => {
  if (Platform.OS === 'ios') return [PERMISSIONS.IOS.BLUETOOTH];
  if (Number(Platform.Version) >= 31) {
    return mode === 'advertise'
      ? [PERMISSIONS.ANDROID.BLUETOOTH_ADVERTISE, PERMISSIONS.ANDROID.BLUETOOTH_CONNECT]
      : [PERMISSIONS.ANDROID.BLUETOOTH_SCAN, PERMISSIONS.ANDROID.BLUETOOTH_CONNECT];
  }
  // Android 11 and below: BLE scanning is gated behind location.
  return [PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION];
};

/** Asks for what attendance needs; explains and offers Settings if blocked. */
export const ensureBluetoothPermissions = async (mode: 'advertise' | 'scan') => {
  const statuses = await requestMultiple(permissionsFor(mode));
  const values = Object.values(statuses);
  if (values.every(s => s === RESULTS.GRANTED || s === RESULTS.LIMITED)) return true;

  const blocked = values.some(s => s === RESULTS.BLOCKED);
  Alert.alert(
    'Bluetooth permission needed',
    mode === 'advertise'
      ? 'iCampus needs Bluetooth access to broadcast your class signal so students in the room can mark attendance.'
      : 'iCampus needs Bluetooth access to find your lecturer’s signal and confirm you are in the room.',
    blocked
      ? [
          { text: 'Not now', style: 'cancel' },
          { text: 'Open Settings', onPress: () => openSettings().catch(() => {}) },
        ]
      : [{ text: 'OK' }],
  );
  return false;
};

let bleStarted = false;
export const startBleManager = async () => {
  if (bleStarted) return;
  await BleManager.start({ showAlert: false });
  bleStarted = true;
};

/** Makes sure Bluetooth is on, prompting the user to turn it on if not. */
export const ensureBluetoothOn = async (purpose: string) => {
  await startBleManager();
  const state = await BleManager.checkState().catch(() => 'unknown');
  if (state === 'on') return true;

  if (Platform.OS === 'android') {
    try {
      // System "Turn on Bluetooth?" dialog.
      await BleManager.enableBluetooth();
      return true;
    } catch {
      // Declined: fall through to the explanation below.
    }
  }
  Alert.alert('Turn on Bluetooth', `Bluetooth is off. ${purpose}`, [
    { text: 'Cancel', style: 'cancel' },
    {
      text: 'Open Settings',
      onPress: () => {
        if (Platform.OS === 'android') {
          Linking.sendIntent('android.settings.BLUETOOTH_SETTINGS').catch(() => {});
        } else {
          Linking.openURL('App-Prefs:Bluetooth').catch(() => openSettings());
        }
      },
    },
  ]);
  return false;
};

// ---------------------------------------------------------------------------
// Entry points (schedule, Classroom tab, ongoing-lecture modal, push)
// ---------------------------------------------------------------------------
/** Lecturer: loads the course + approved exceptions, then opens the manager. */
export const openLecturerAttendance = async (navigation: any, lecture: Lecture) => {
  const courseId =
    typeof (lecture as any).courseId === 'object'
      ? (lecture as any).courseId?.courseId
      : lecture.courseId;
  try {
    const [courseResult, exceptionsResult] = await Promise.all([
      getCourseDetailsForOngoingLecture({ courseId }),
      getAllExceptionsForOngoingLecture({ lectureId: lecture.id }),
    ]);
    if (!courseResult.success || !courseResult.data) {
      Toast.show({
        type: 'error',
        text1: 'Could not open attendance',
        text2: courseResult.error || 'Course details failed to load. Try again.',
      });
      return false;
    }
    navigation.navigate('PhysicalAttendanceManager', {
      lecture: { ...lecture, courseId },
      course: courseResult.data,
      // Exceptions are optional; attendance still works without them.
      exceptions: exceptionsResult.success ? exceptionsResult.data || [] : [],
    });
    return true;
  } catch (err) {
    console.error('openLecturerAttendance failed', err);
    Toast.show({
      type: 'error',
      text1: 'Connection error',
      text2: 'Could not load the lecture. Check your connection.',
    });
    return false;
  }
};

/** Student: opens the scanner for a lecture. */
export const openStudentAttendance = (navigation: any, lecture: Lecture) => {
  navigation.navigate('StudentAttendanceScanner', { lecture });
};
