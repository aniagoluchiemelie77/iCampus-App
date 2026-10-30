import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useLiveSession } from '../hooks/useLiveSession';
import { LecturerLiveClassSession } from '../components/LecturerLiveClassSession';
import { StudentLiveClassSession } from '../components/StudentLiveClassSession';
import { AccessDeniedScreen } from '../components/AccessDeniedScreen';
import Toast from 'react-native-toast-message';
import { submitOnlineClassAttendanceAPI } from '../api/localPostApis';
import { searchUsers } from '../api/localGetApis';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { CustomButton } from '../assets/components/AppUIComponents';
import { useLiveClass } from '../context/LiveClassContext';
import { LiveMiniPlayerCard } from '../components/liveClassComponents';

// Students count as present after this long in the class (or at the end).
const ATTENDANCE_AFTER_MS = 10 * 60 * 1000;

const LoadingScreen = () => {
  const { colors } = useTheme();
  return (
    <View style={[styles.centered, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.subContainer,
          { backgroundColor: colors.backgroundSecondary },
        ]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>
          Initializing Class Session...
        </Text>
      </View>
    </View>
  );
};

/**
 * The route only anchors the class: the class itself is rendered by
 * LiveClassProvider above the navigator, full screen while this route is
 * focused and as a floating mini player once the user moves elsewhere.
 */
export const LiveClassSessions = ({ route }: any) => {
  const { colors } = useTheme();
  const { startLiveClass, setExpanded } = useLiveClass();
  const lectureId: string = route.params?.lectureId;
  // Some entry points (ongoing-lecture modal, /lectures/ongoing) pass the
  // populated course object here; the loaders need the id string.
  const rawCourseId = route.params?.courseId;
  const courseId: string =
    rawCourseId && typeof rawCourseId === 'object'
      ? rawCourseId.courseId || rawCourseId.id || ''
      : String(rawCourseId || '');

  useFocusEffect(
    useCallback(() => {
      if (lectureId) startLiveClass({ lectureId, courseId });
      return () => setExpanded(false);
    }, [lectureId, courseId, startLiveClass, setExpanded]),
  );

  return <View style={[styles.container, { backgroundColor: colors.background }]} />;
};

export const LiveClassSessionHost = ({
  lectureId,
  courseId,
  minimized,
}: {
  lectureId: string;
  courseId: string;
  minimized: boolean;
}) => {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const { expand, endLiveClass } = useLiveClass();
  const [lecturerUser, setLecturerUser] = useState<any | null>(null);
  const attendanceSavedRef = useRef(false);

  const {
    user,
    course,
    lecture,
    exceptions,
    socket,
    loading,
    loadError,
    isConnected,
    joinState,
    fetchLiveSessionData,
  } = useLiveSession(lectureId, courseId);

  const isLecturer = useMemo(() => {
    if (!user?.uid) return false;
    const isCourseLecturer = course?.lecturerIds?.includes(user.uid);
    const isLectureHost = lecture?.hostId === user.uid;
    return !!(isCourseLecturer || isLectureHost);
  }, [course?.lecturerIds, lecture?.hostId, user?.uid]);
  const isSchoolCourse = useMemo(() => {
    return (
      Array.isArray(course?.studentsEnrolled) &&
      course.studentsEnrolled.length > 0
    );
  }, [course?.studentsEnrolled]);
  const isHost = useMemo(() => {
    if (!user?.uid || !lecture?.hostId) return false;
    return lecture.hostId === user.uid;
  }, [lecture?.hostId, user?.uid]);
  const isStudent = useMemo(() => {
    if (!user?.uid) return false;
    return !!course?.studentsEnrolled?.includes(user.uid);
  }, [course?.studentsEnrolled, user?.uid]);
  const isEnrolled = useMemo(() => {
    if (!user?.uid || !course?.studentsEnrolled) return false;
    return course.studentsEnrolled.includes(user.uid);
  }, [course?.studentsEnrolled, user?.uid]);
  const canJoin = useMemo(() => {
    if (!course || !lecture || !user?.uid) return false;
    return (
      (isHost || isEnrolled || isLecturer) &&
      lecture.status !== 'cancelled' &&
      lecture.status !== 'completed'
    );
  }, [isHost, isEnrolled, isLecturer, lecture, course, user?.uid]);

  const hostData = useMemo(() => {
    const activeHostUser = isHost ? user : lecturerUser;

    if (!activeHostUser) return null;

    return {
      ...activeHostUser,
      displayName:
        [activeHostUser.firstname, activeHostUser.lastname]
          .filter(Boolean)
          .join(' ')
          .trim() ||
        activeHostUser.username ||
        'Lecturer',
      profilePic: activeHostUser?.profilePic || [],
      isMuted: lecture?.isLecturerMuted ?? false,
      isCameraOn: lecture?.isLecturerCameraOn ?? false,
      cameraStreamUrl: lecture?.location || lecture?.videoUrl,
    };
  }, [lecture, user, isHost, lecturerUser]);

  /**
   * Marks the student present once. Called after they've been in the class
   * for ATTENDANCE_AFTER_MS, or when the host ends it while they're in. Before,
   * attendance was only sent if the student was still on this screen at the
   * very end, so anyone who left a minute early got nothing.
   */
  const saveAttendance = useCallback(
    async (silent = false) => {
      if (attendanceSavedRef.current) return;
      const hasApprovedException = exceptions.some(
        ex =>
          ex.studentId === user?.uid &&
          ex.lectureId === lectureId &&
          ex.status === 'approved',
      );
      if (isLecturer || !isStudent || !isSchoolCourse || !user?.uid || hasApprovedException) {
        return;
      }
      attendanceSavedRef.current = true;
      try {
        const result = await submitOnlineClassAttendanceAPI({
          lectureId,
          courseId: (lecture?.courseId as any) || courseId,
          status: 'Present',
          checkData: [],
        });
        if (!result.success) {
          attendanceSavedRef.current = false;
          if (!silent) {
            Toast.show({ type: 'error', text1: 'Attendance not saved', text2: result.message });
          }
        } else if (!silent) {
          Toast.show({ type: 'success', text1: 'Attendance recorded' });
        }
      } catch (err) {
        attendanceSavedRef.current = false;
        console.error('iCampus: Failed to save attendance:', err);
      }
    },
    [isLecturer, isStudent, isSchoolCourse, user?.uid, lectureId, courseId, lecture?.courseId, exceptions],
  );

  // Present after staying in the live class for a while.
  useEffect(() => {
    if (!joinState.joined || !isStudent || lecture?.status === 'completed') return;
    const timer = setTimeout(() => saveAttendance(true), ATTENDANCE_AFTER_MS);
    return () => clearTimeout(timer);
  }, [joinState.joined, isStudent, lecture?.status, saveAttendance]);

  useEffect(() => {
    if (!socket) return;

    const handleLectureEnded = (data: {
      lectureId: string;
      status: string;
      summary: any;
    }) => {
      if (data.lectureId === lecture?.id) {
        if (isSchoolCourse) {
          saveAttendance();
        }
        Toast.show({
          type: 'info',
          text1: 'Class Concluded',
          text2: `Session ended. Topic: ${data.summary?.topicName || lecture?.topicName}`,
        });
        endLiveClass();
        // From the mini player, leave the student wherever they are.
        if (!minimized) navigation.navigate('Home', { activeTab: 'classroom' });
      }
    };
    const handleServerError = (data: { action: string; message: string }) => {
      console.warn(`[LIVE_CLASS] ${data.action} failed: ${data.message}`);
    };

    socket.on('lecture_ended_by_host', handleLectureEnded);
    socket.on('error_response', handleServerError);

    return () => {
      socket.off('lecture_ended_by_host', handleLectureEnded);
      socket.off('error_response', handleServerError);
    };
  }, [socket, lecture?.id, lecture?.topicName, isSchoolCourse, saveAttendance, navigation, endLiveClass, minimized]);
  useEffect(() => {
    const fetchHostData = async () => {
      const targetId = lecture?.hostId;
      try {
        if (!targetId || !user?.tier || !user?.usertype) return;

        const data = await searchUsers({
          uid: targetId,
          viewerTier: user.tier,
          viewerRole: user.usertype,
        });
        // The uid search returns a one-item array.
        setLecturerUser(Array.isArray(data) ? data[0] ?? null : data);
      } catch (err) {
        console.error('Failed to fetch host:', err);
      }
    };

    fetchHostData();
  }, [lecture?.hostId, user]);

  // Backing out of an error / access-denied screen closes the class: there
  // is nothing to keep running.
  const cannotEnter = !loading && (!!loadError || !lecture || !course || !user || !canJoin);
  useEffect(() => {
    if (minimized && cannotEnter) endLiveClass();
  }, [minimized, cannotEnter, endLiveClass]);

  if (minimized && cannotEnter) return null;
  if (minimized && loading) {
    return (
      <LiveMiniPlayerCard
        title={lecture?.topicName || 'Live class'}
        isLive={false}
        onExpand={expand}
        video={<ActivityIndicator color="#fff" />}
        actions={[{ icon: 'close', onPress: endLiveClass }]}
      />
    );
  }

  // Order matters: never show "access denied" while data is still loading.
  if (loading) {
    return <LoadingScreen />;
  }
  if (loadError || !lecture || !course || !user) {
    return (
      <View
        style={[styles.centered, { backgroundColor: colors.background }]}
      >
        <View
          style={[
            styles.subContainer,
            { backgroundColor: colors.backgroundSecondary },
          ]}
        >
          <MaterialIcons name="wifi-off" size={44} color={colors.primary} />
          <Text style={[styles.errorTitle, { color: colors.textDarker }]}>
            Couldn't open this class
          </Text>
          <Text style={[styles.loadingText, { color: colors.text }]}>
            {loadError || 'The lecture details could not be loaded.'}
          </Text>
          <CustomButton
            title="Try Again"
            iconName="refresh"
            onPress={fetchLiveSessionData}
            style={styles.retryButton}
          />
        </View>
      </View>
    );
  }
  if (!canJoin) {
    return (
      <AccessDeniedScreen
        reason={
          lecture.status === 'completed'
            ? 'This live session has already ended.'
            : 'You do not have permission to join this live session. Make sure you are enrolled or listed as a session host.'
        }
      />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {!minimized && (!isConnected || !joinState.joined) && (
        <View
          style={[
            styles.connectionBanner,
            { backgroundColor: joinState.error ? '#E53935' : colors.primary },
          ]}
        >
          <ActivityIndicator size="small" color="#fff" />
          <Text style={styles.connectionBannerText}>
            {joinState.error ||
              (isConnected ? 'Joining class…' : 'Connecting to live server…')}
          </Text>
        </View>
      )}
      {isHost ? (
        <LecturerLiveClassSession
          lecture={lecture}
          socket={socket}
          joined={joinState.joined}
          minimized={minimized}
        />
      ) : (
        <StudentLiveClassSession
          lecture={lecture}
          lecturerLiveData={hostData}
          socket={socket}
          joined={joinState.joined}
          minimized={minimized}
        />
      )}
    </View>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  subContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    width: '100%',
  },
  loadingText: {
    fontSize: 14,
    marginTop: 12,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 12,
  },
  retryButton: {
    marginTop: 18,
    paddingHorizontal: 22,
    borderRadius: 14,
    width: 'auto',
  },
  connectionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  connectionBannerText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
});