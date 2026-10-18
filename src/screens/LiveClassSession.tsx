import React, {
  useState,
  useEffect,
  useMemo,
  useCallback
} from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLiveSession } from '../hooks/useLiveSession';
import { LecturerLiveClassSession } from '../components/LecturerLiveClassSession';
import { StudentLiveClassSession } from '../components/StudentLiveClassSession';
import { AccessDeniedScreen } from '../components/AccessDeniedScreen';
import { ActivityIndicator } from 'react-native-paper';
import Toast from 'react-native-toast-message';
import { submitOnlineClassAttendanceAPI } from '../api/localPostApis';
import { searchUsers } from '../api/localGetApis';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { CustomButton } from '../assets/components/AppUIComponents';

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

export const LiveClassSessions = ({ route }: any) => {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const { lectureId, courseId } = route.params;
  const [lecturerUser, setLecturerUser] = useState<any | null>(null);

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

  const isEligibleForAttendance = useMemo(() => {
    if (!user?.uid) return false;
    if (!isSchoolCourse) return false;

    const hasApprovedException = exceptions.some(
      ex =>
        ex.studentId === user.uid &&
        ex.lectureId === lectureId &&
        ex.status === 'approved',
    );
    if (hasApprovedException) return true;
    return true;
  }, [exceptions, lectureId, user?.uid, isSchoolCourse]);
  const hostData = useMemo(() => {
    const activeHostUser = isHost ? user : lecturerUser;

    if (!activeHostUser) return null;

    return {
      ...activeHostUser,
      displayName:
        `${activeHostUser.firstname} ${activeHostUser.lastname}`.trim(),
      profilePic: activeHostUser?.profilePic || [],
      isMuted: lecture?.isLecturerMuted ?? false,
      isCameraOn: lecture?.isLecturerCameraOn ?? false,
      cameraStreamUrl: lecture?.location || lecture?.videoUrl,
    };
  }, [lecture, user, isHost, lecturerUser]);

  const saveAttendance = useCallback(async () => {
    try {
      const hasApprovedException = exceptions.some(
        ex => ex.studentId === user?.uid && ex.status === 'approved',
      );
      if (
        isLecturer ||
        !isStudent ||
        !user?.uid ||
        !lectureId ||
        hasApprovedException
      ) {
        return;
      }
      const submissionPayload = {
        lectureId,
        courseId,
        status: isEligibleForAttendance ? 'Present' : 'Absent',
        checkData: [],
      };
      const result = await submitOnlineClassAttendanceAPI(submissionPayload);
      if (result.success) {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: result.message,
        });
        navigation.navigate('Home', { activeTab: 'classroom' });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Submission Failed',
          text2: result.message,
        });
      }
    } catch (err) {
      console.error('iCampus: Failed to save attendance:', err);
    }
  }, [
    isLecturer,
    isStudent,
    user?.uid,
    lectureId,
    courseId,
    isEligibleForAttendance,
    exceptions,
    navigation,
  ]);

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
        navigation.navigate('Home', { activeTab: 'classroom' });
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
  }, [socket, lecture?.id, lecture?.topicName, isSchoolCourse, saveAttendance, navigation]);
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
        setLecturerUser(data);
      } catch (err) {
        console.error('Failed to fetch host:', err);
      }
    };

    fetchHostData();
  }, [lecture?.hostId, user]);

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
      {(!isConnected || !joinState.joined) && (
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
        />
      ) : (
        <StudentLiveClassSession
          lecture={lecture}
          lecturerLiveData={hostData}
          socket={socket}
          joined={joinState.joined}
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