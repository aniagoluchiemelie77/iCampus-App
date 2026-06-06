import React, {
  useState,
  useEffect,
  useMemo,
  useCallback
} from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLiveSession } from '../hooks/useLiveSession';
import { LecturerLiveClassSession } from '../components/LecturerLiveClassSession';
import {
  LiveLecturer,
  StudentLiveClassSession,
} from '../components/StudentLiveClassSession';
import { AccessDeniedScreen } from '../components/AccessDeniedScreen';
import { Camera, useCameraDevice } from 'react-native-vision-camera';
import { useFrameProcessor } from 'react-native-vision-camera';
import { runOnJS } from 'react-native-reanimated';
import { scanFaces } from 'vision-camera-face-detector';
import { User } from 'types/firebase';
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
  const [lecturerUser, setLecturerUser] = useState<User | null>(null);
  const [faceDetected, setFaceDetected] = useState<boolean>(false);
  const device = useCameraDevice('front');
  const [attendanceChecks, setAttendanceChecks] = useState<boolean[]>(
    new Array(7).fill(false),
  );
  const { user, course, lecture, exceptions, socket } = useLiveSession(
    lectureId,
    courseId,
  );
  const lecturerData: LiveLecturer | null = lecturerUser
    ? {
        ...lecturerUser,
        profilePic: lecturerUser?.profilePic || [],
        isMuted: lecture?.isLecturerMuted || false,
        isCameraOn: lecture?.isLecturerCameraOn || false,
        cameraStreamUrl: lecture?.location || lecture?.videoUrl,
      }
    : null;
  const isLecturer = course?.lecturerIds?.includes(user?.uid);
  const isStudent = course?.studentsEnrolled?.includes(user?.uid);
  const canJoin = useMemo(() => {
    const isEnrolled = course?.studentsEnrolled?.includes(user.uid);
    const hasStarted =
      lecture?.status === 'ongoing' ||
      lecture?.status === 'scheduled' ||
      lecture?.status === 'completed';
    if (!course || !lecture) return false;
    return (isLecturer || isEnrolled) && hasStarted;
  }, [course, lecture, user, isLecturer]);

  const isEligibleForAttendance = useMemo(() => {
    const hasApprovedException = exceptions.some(
      ex =>
        ex.studentId === user?.uid &&
        ex.lectureId === lectureId &&
        ex.status === 'approved',
    );
    if (hasApprovedException) return true;
    const totalPassed = attendanceChecks.filter(c => c).length;
    const endCheck = attendanceChecks[6];
    return totalPassed >= 5 && endCheck;
  }, [attendanceChecks, exceptions, lectureId, user?.uid]);
  const updateFaceStatus = (status: boolean) => {
    if (faceDetected !== status) {
      setFaceDetected(status);
    }
  };
  const frameProcessor = useFrameProcessor(
    frame => {
      'worklet';
      const faces = scanFaces(frame);
      // @ts-ignore
      runOnJS(updateFaceStatus)(faces.length > 0);
    },
    [faceDetected],
  );
  const saveAttendance = useCallback(async () => {
    try {
      const hasApprovedException = exceptions.some(
        ex => ex.studentId === user?.uid && ex.status === 'approved',
      );

      if (!isStudent || !user?.uid || !lectureId || hasApprovedException)
        return;
      const submissionPayload = {
        lectureId: lectureId,
        courseId: courseId,
        status: isEligibleForAttendance ? 'Present' : 'Absent',
        checkData: attendanceChecks,
      };
      const result = await submitOnlineClassAttendanceAPI(submissionPayload);
      if (result.success) {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: result.message,
        });
        navigation.navigate('Home', {
          activeTab: 'classroom',
        });
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
    isStudent,
    user?.uid,
    lectureId,
    courseId,
    isEligibleForAttendance,
    attendanceChecks,
    exceptions,
    navigation,
  ]);
  useEffect(() => {
    if (
      !lecture ||
      isLecturer ||
      lecture.lectureType !== 'Online' ||
      lecture.status !== 'ongoing'
    ) {
      return;
    }
    const startTime = new Date(lecture.startTime).getTime();
    const endTime = new Date(lecture.endTime).getTime();
    const duration = endTime - startTime;
    const intervalTime = duration / 6;

    const runCheck = () => {
      const now = Date.now();
      const currentIndex = Math.floor((now - startTime) / intervalTime);

      if (currentIndex >= 0 && currentIndex < 7) {
        setAttendanceChecks(prev => {
          const newChecks = [...prev];
          if (!newChecks[currentIndex] && faceDetected) {
            newChecks[currentIndex] = true;
            // Optional: Toast.show({ text1: `Attendance Point ${currentIndex + 1} Verified!` });
          }

          return newChecks;
        });
      }
    };

    runCheck();
    const pulse = setInterval(runCheck, 30000);

    return () => clearInterval(pulse);
  }, [lecture, isLecturer, faceDetected]);
  useEffect(() => {
    if (lecture?.status === 'completed' && isStudent) {
      saveAttendance();
    }
  }, [lecture?.status, isStudent, saveAttendance]);
  useEffect(() => {
    const fetchLecturer = async () => {
      const lecturerId = course?.lecturerIds?.[0];
      try {
        if (!lecturerId || !user?.tier || !user?.usertype) return;

        const data = await searchUsers({
          uid: lecturerId,
          viewerTier: user.tier,
          viewerRole: user.usertype,
        });
        if (data) {
          setLecturerUser(data);
        } else {
          setLecturerUser(null);
        }
      } catch (err: any) {
        console.error('Failed to fetch lecturer for iCampus:', err);
        Toast.show({
          type: 'error',
          text1: 'Network Error',
          text2: err || 'Search failed',
        });
      }
    };

    fetchLecturer();
  }, [course?.lecturerIds, user]);

  if (!canJoin) return <AccessDeniedScreen />;
  if (!isLecturer && !isStudent) {
    return <AccessDeniedScreen reason="You are not enrolled in this course." />;
  }
  if (!lecture || !course || !user) {
    return <LoadingScreen />;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {isLecturer ? (
        <LecturerLiveClassSession lecture={lecture} socket={socket} />
      ) : (
        <StudentLiveClassSession
          lecture={lecture}
          checks={attendanceChecks}
          hasException={exceptions.some(
            e => e.studentId === user.uid && e.status === 'approved',
          )}
          lecturerData={lecturerData}
          socket={socket}
        />
      )}
      {isStudent && device && (
        <Camera
          style={{ height: 1, width: 1, opacity: 0 }}
          device={device}
          isActive={true}
          frameProcessor={frameProcessor}
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