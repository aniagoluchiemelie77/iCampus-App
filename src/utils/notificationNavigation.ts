// Where a notification leads. Shared by the Notifications list and push taps
// (FCM delivers the same actionType/payload fields, flattened to strings).

import { Alert } from 'react-native';
import { openLecturerAttendance } from './lectureAttendance';

export interface NotificationLike {
  actionType?: string;
  payload?: Record<string, any>;
  relatedEntity?: { entityId?: string | null; entityType?: string | null };
  [key: string]: any;
}

// Course notifications carry the course in different places depending on
// which controller sent them.
const resolveCourse = (item: NotificationLike) => {
  const payload = item.payload || {};
  if (payload.course?.courseId) return payload.course;
  const courseId =
    payload.courseId ||
    (item.relatedEntity?.entityType === 'course'
      ? item.relatedEntity.entityId
      : undefined);
  return courseId ? { courseId } : null;
};

/** The same grouping key the backend uses (utils/notificationGrouping.js). */
export const notificationGroupKey = (item: NotificationLike) => {
  const payload = item.payload || {};
  const entityId =
    payload.postId ||
    payload.followerId ||
    payload.viewerUid ||
    item.notificationId ||
    item.id;
  return `${item.actionType || 'unknown'}_${entityId}`;
};

export const showLectureReminderPrompt = (
  navigation: any,
  item: NotificationLike,
  user: { uid?: string; usertype?: string },
) => {
  if (item.actionType !== 'LECTURE_REMINDER') return false;

  const payload = item.payload || {};
  const lectureId = payload.lectureId;
  const courseId = payload.courseId;
  if (!lectureId || !courseId) return false;

  const normalizedType = String(payload.lectureType || '').toLowerCase();
  if (normalizedType === 'recorded') return false;
  const lectureType =
    normalizedType === 'online' ? 'Online' : 'Physical';
  const reminderMessage =
    item.message ||
    `Your ${lectureType.toLowerCase()} lecture "${payload.topicName || 'Lecture'}" is starting soon.`;

  if (lectureType === 'Online') {
    Alert.alert('Online lecture reminder', reminderMessage, [
      { text: 'Later', style: 'cancel' },
      {
        text: 'Join lecture',
        onPress: () =>
          navigation.navigate('LiveClassSessions', { lectureId, courseId }),
      },
    ]);
    return true;
  }

  if (
    user.usertype === 'lecturer' ||
    payload.isLecturer === true ||
    payload.isLecturer === 'true'
  ) {
    const lecture = {
      id: lectureId,
      courseId,
      topicName: payload.topicName || 'Lecture',
      lectureType: 'Physical' as const,
      location: payload.location || '',
      startTime: payload.startTime || new Date().toISOString(),
      endTime: payload.endTime || payload.startTime || new Date().toISOString(),
      date: payload.date || payload.startTime || new Date().toISOString(),
      status: 'scheduled' as const,
      isTaught: false,
    };
    Alert.alert(
      'Physical lecture starting soon',
      `${reminderMessage}\n\nWould you like to take attendance online?`,
      [
        { text: 'Not now', style: 'cancel' },
        {
          text: 'Start attendance',
          onPress: () => {
            void openLecturerAttendance(navigation, lecture);
          },
        },
      ],
    );
    return true;
  }

  Alert.alert('Physical lecture reminder', reminderMessage, [{ text: 'OK' }]);
  return true;
};

export const navigateForNotification = (
  navigation: any,
  item: NotificationLike,
  user: { uid?: string; usertype?: string },
) => {
  const payload = item.payload || {};
  const course = resolveCourse(item);
  const openCoursePage = (title: string, extra: Record<string, any> = {}) => {
    // Course pages need a course; without one, show the notification itself.
    if (!course) {
      navigation.navigate('NotificationDetails', { notification: item });
      return;
    }
    navigation.navigate('CourseSubPage', {
      title,
      course,
      userRole: user.usertype,
      ...extra,
    });
  };

  switch (item.actionType) {
    case 'POST_UPDATED':
    case 'NEW_POST':
    case 'POST_MENTION':
    case 'POST_LIKED':
    case 'POST_COMMENTED':
    case 'POLL_MILESTONE':
    case 'POST_REPOSTED':
      if (payload.postId) {
        navigation.navigate('PostDetailScreen', { postId: payload.postId });
        return;
      }
      break;

    case 'PRODUCT_DELETION':
    case 'PRODUCT_CREATION':
    case 'PRODUCT_UPDATE':
      navigation.navigate('SalesHub');
      return;

    case 'NEW_PRODUCT':
      if (payload.productId) {
        navigation.navigate('ProductDetails', { productId: payload.productId });
        return;
      }
      break;

    case 'LIVE_CLASS_STARTED':
      if (payload.lectureId) {
        navigation.navigate('LiveClassSessions', {
          lectureId: payload.lectureId,
          courseId: payload.courseId,
        });
        return;
      }
      break;

    case 'LECTURE_CANCELLED':
    case 'LECTURE_UPDATED':
    case 'LECTURE_POSTPONED':
    case 'LECTURE_VENUE_CHANGE':
    case 'LECTURE_TYPE_CHANGE':
    case 'LECTURE_SCHEDULED':
    case 'LECTURE_REMINDER':
      if (
        item.actionType === 'LECTURE_REMINDER' &&
        showLectureReminderPrompt(navigation, item, user)
      ) {
        return;
      }
      navigation.navigate('CourseSubPage', {
        title: 'View Lecture Schedule',
        userRole: user.usertype,
      });
      return;

    case 'ATTENDANCE_OPEN': {
      // Straight to the scanner: the payload has what it needs.
      const lectureId =
        payload.lectureId ||
        (item.relatedEntity?.entityType === 'lecture' ? item.relatedEntity.entityId : null);
      if (lectureId && user.usertype === 'student') {
        navigation.navigate('StudentAttendanceScanner', {
          lecture: {
            id: lectureId,
            courseId: payload.courseId,
            topicName: payload.topicName || 'Lecture',
            location: payload.location,
            lectureType: 'Physical',
            status: 'ongoing',
          },
        });
        return;
      }
      navigation.navigate('CourseSubPage', {
        title: 'View Lecture Schedule',
        userRole: user.usertype,
      });
      return;
    }

    case 'CONTENT_MUTATED':
    case 'CONTENT_DELETION':
    case 'CONTENT_ADDED':
      openCoursePage('Course Contents');
      return;

    case 'EXCEPTION_UPDATED':
      openCoursePage('Exceptions');
      return;

    case 'TEST_CREATED':
      openCoursePage('Assessments', {
        assessmentId:
          item.relatedEntity?.entityType === 'assessment'
            ? item.relatedEntity.entityId
            : payload.assessmentId,
      });
      return;

    case 'ASSIGNMENT_CREATED':
    case 'ASSIGNMENT_REMOVED':
      openCoursePage('Assignments');
      return;

    case 'MATERIAL_UPLOADED':
    case 'MATERIAL_DELETED':
      openCoursePage('Course Materials');
      return;

    case 'PROFILE_VIEW':
    case 'PROFILE_UPDATED':
      navigation.navigate('Profile', { identifier: user.uid });
      return;

    case 'NEW_FOLLOWER':
      if (payload.followerId) {
        navigation.navigate('Profile', { identifier: payload.followerId });
        return;
      }
      break;

    case 'SALES_PAYOUT_SUCCESS':
    case 'MARKET_PURCHASE_DEBIT':
    case 'ICASH_PURCHASE':
    case 'ICASH_WITHDRAWAL':
      if (payload.transactionId) {
        navigation.navigate('TransactionDetail', {
          transactionId: payload.transactionId,
        });
        return;
      }
      break;

    case 'ORDER_REVIEW_REQUEST':
      navigation.navigate('CreateReviewScreen', {
        targetId: payload.targetId,
        productType: 'product',
      });
      return;

    case 'LECTURER_REVIEW_REQUEST':
      navigation.navigate('CreateReviewScreen', {
        targetId: payload.targetId,
        productType: 'lecturer',
      });
      return;
  }
  navigation.navigate('NotificationDetails', { notification: item });
};
