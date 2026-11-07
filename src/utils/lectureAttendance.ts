import Toast from 'react-native-toast-message';
import type { Lecture } from '../types/firebase';
import {
  getAllExceptionsForOngoingLecture,
  getCourseDetailsForOngoingLecture,
} from '../api/localGetApis';

// Sessions the lecturer finished during this app run. The server also records
// `attendanceTakenAt`, but the Classroom card reloads the moment the lecturer
// comes back, which can be before that write lands.
const endedThisRun = new Set<string>();

/** Call when a lecturer's attendance session ends. */
export const markAttendanceSessionEnded = (lectureId: string) => {
  if (lectureId) endedThisRun.add(String(lectureId));
};

/** Call when a session (re)opens, so the card shows Continue, not Redo. */
export const markAttendanceSessionStarted = (lectureId: string) => {
  endedThisRun.delete(String(lectureId));
};

/** True when this lecture's session was ended in this app run. */
export const wasAttendanceEndedThisRun = (lectureId: string) =>
  endedThisRun.has(String(lectureId));

/** True once attendance has been taken at least once for this lecture. */
export const hasTakenAttendance = (lecture: Lecture) =>
  wasAttendanceEndedThisRun(lecture.id) ||
  !!lecture.attendanceTakenAt ||
  // Before attendanceTakenAt existed: opening a session marks the lecture
  // "ongoing", so ongoing + closed means a session already ran.
  (lecture.status === 'ongoing' && !lecture.attendanceOpen);

/** Loads the lecture context required by the lecturer attendance manager. */
export const openLecturerAttendance = async (
  navigation: any,
  lecture: Lecture,
) => {
  const courseId = lecture.courseId;
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
