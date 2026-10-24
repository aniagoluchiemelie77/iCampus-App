import Toast from 'react-native-toast-message';
import type { Lecture } from '../types/firebase';
import {
  getAllExceptionsForOngoingLecture,
  getCourseDetailsForOngoingLecture,
} from '../api/localGetApis';

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
