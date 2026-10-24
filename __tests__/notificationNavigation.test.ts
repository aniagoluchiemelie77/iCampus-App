import { Alert } from 'react-native';
import {
  navigateForNotification,
  notificationGroupKey,
} from '../src/utils/notificationNavigation';

jest.mock('../src/utils/lectureAttendance', () => ({
  openLecturerAttendance: jest.fn(),
}));

import { openLecturerAttendance } from '../src/utils/lectureAttendance';

const user = { uid: 'u1', usertype: 'student' };
const nav = () => ({ navigate: jest.fn() });

beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('navigateForNotification', () => {
  it('opens course pages with the course from the payload', () => {
    const navigation = nav();
    navigateForNotification(
      navigation,
      { actionType: 'CONTENT_MUTATED', payload: { course: { courseId: 'C1', title: 'Thermo' } } },
      user,
    );
    expect(navigation.navigate).toHaveBeenCalledWith('CourseSubPage', {
      title: 'Course Contents',
      course: { courseId: 'C1', title: 'Thermo' },
      userRole: 'student',
    });
  });

  it('uses relatedEntity when the payload has no course (materials)', () => {
    const navigation = nav();
    navigateForNotification(
      navigation,
      { actionType: 'MATERIAL_UPLOADED', payload: {}, relatedEntity: { entityId: 'C9', entityType: 'course' } },
      user,
    );
    expect(navigation.navigate.mock.calls[0][1].course).toEqual({ courseId: 'C9' });
  });

  it('passes the assessment id for new tests', () => {
    const navigation = nav();
    navigateForNotification(
      navigation,
      {
        actionType: 'TEST_CREATED',
        payload: { course: { courseId: 'C1' } },
        relatedEntity: { entityId: 'A7', entityType: 'assessment' },
      },
      user,
    );
    expect(navigation.navigate.mock.calls[0][1]).toMatchObject({ title: 'Assessments', assessmentId: 'A7' });
  });

  it('falls back to the details screen instead of a broken course page', () => {
    const navigation = nav();
    const item = { actionType: 'EXCEPTION_UPDATED', payload: { exceptionId: 'E1' } };
    navigateForNotification(navigation, item, user);
    expect(navigation.navigate).toHaveBeenCalledWith('NotificationDetails', { notification: item });
  });

  it('routes a push with flattened string data (courseId lifted by the server)', () => {
    const navigation = nav();
    navigateForNotification(
      navigation,
      { actionType: 'ASSIGNMENT_CREATED', payload: { courseId: 'C3' } },
      user,
    );
    expect(navigation.navigate.mock.calls[0][1]).toMatchObject({ title: 'Assignments', course: { courseId: 'C3' } });
  });

  it('falls back when a post notification has no postId', () => {
    const navigation = nav();
    navigateForNotification(navigation, { actionType: 'POST_LIKED', payload: {} }, user);
    expect(navigation.navigate.mock.calls[0][0]).toBe('NotificationDetails');
  });

  it('prompts before joining an online lecture reminder', () => {
    const navigation = nav();
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    navigateForNotification(
      navigation,
      {
        actionType: 'LECTURE_REMINDER',
        message: 'Your online lecture starts soon.',
        payload: { lectureId: 'L1', courseId: 'C1', lectureType: 'Online' },
      },
      user,
    );

    expect(alert).toHaveBeenCalledWith(
      'Online lecture reminder',
      'Your online lecture starts soon.',
      expect.any(Array),
    );
    const joinLecture = alert.mock.calls[0]?.[2]?.[1]?.onPress;
    expect(joinLecture).toBeDefined();
    joinLecture?.();
    expect(navigation.navigate).toHaveBeenCalledWith('LiveClassSessions', {
      lectureId: 'L1',
      courseId: 'C1',
    });
  });

  it('offers lecturers the attendance manager for a physical lecture reminder', async () => {
    const navigation = nav();
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    navigateForNotification(
      navigation,
      {
        actionType: 'LECTURE_REMINDER',
        payload: {
          lectureId: 'L2',
          courseId: 'C1',
          lectureType: 'Physical',
          isLecturer: 'true',
        },
      },
      user,
    );

    expect(alert).toHaveBeenCalledWith(
      'Physical lecture starting soon',
      expect.stringContaining('Would you like to take attendance online?'),
      expect.any(Array),
    );
    const startAttendance = alert.mock.calls[0]?.[2]?.[1]?.onPress;
    expect(startAttendance).toBeDefined();
    await startAttendance?.();
    expect(openLecturerAttendance).toHaveBeenCalledWith(
      navigation,
      expect.objectContaining({ id: 'L2', courseId: 'C1' }),
    );
  });
});

describe('notificationGroupKey', () => {
  it('matches the backend grouping (same action + same post)', () => {
    const a = { actionType: 'POST_LIKED', notificationId: 'n1', payload: { postId: 'P1' } };
    const b = { actionType: 'POST_LIKED', notificationId: 'n2', payload: { postId: 'P1' } };
    const c = { actionType: 'POST_COMMENTED', notificationId: 'n3', payload: { postId: 'P1' } };
    expect(notificationGroupKey(a)).toBe(notificationGroupKey(b));
    expect(notificationGroupKey(a)).not.toBe(notificationGroupKey(c));
  });
});
