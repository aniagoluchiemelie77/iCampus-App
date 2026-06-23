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

const LoadingScreen = () => {
  const { colors } = useTheme();
  return (
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
  );
};

export const LiveClassSessions = ({ route }: any) => {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const { lectureId, courseId } = route.params;
  const [lecturerUser, setLecturerUser] = useState<any | null>(null);

  const { user, course, lecture, exceptions, socket } = useLiveSession(
    lectureId,
    courseId,
  );

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
    return (isHost || isEnrolled) && lecture.status !== 'cancelled';
  }, [isHost, isEnrolled, lecture, course, user?.uid]);

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
          text2: `Session ended. Topic: ${data.summary.topicName}`,
        });
        navigation.navigate('Home', { activeTab: 'classroom' });
      }
    };

    socket.on('lecture_ended_by_host', handleLectureEnded);

    return () => {
      socket.off('lecture_ended_by_host', handleLectureEnded);
    };
  }, [socket, lecture?.id, isSchoolCourse, saveAttendance, navigation]);
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

  if (!canJoin) {
    return (
      <AccessDeniedScreen reason="You do not have permission to join this live session. Make sure you are enrolled or listed as a session host." />
    );
  }
  if (!lecture || !course || !user) {
    return <LoadingScreen />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {isHost ? (
        <LecturerLiveClassSession lecture={lecture} socket={socket} />
      ) : (
        <StudentLiveClassSession
          lecture={lecture}
          lecturerLiveData={hostData}
          socket={socket}
        />
      )}
    </View>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 15,
  },
  subContainer: {
    padding: 20,
    alignContent: 'center',
    borderRadius: 15,
  },
  loadingText: {
    fontSize: 14,
    marginTop: 15,
    fontWeight: 'bold',
  },
});