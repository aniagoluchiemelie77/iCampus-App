import React, {
  useState,
  useEffect,
  useMemo,
  useCallback
} from 'react';
import {
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLiveSession } from '../hooks/useLiveSession';
import { baseUrl } from '../components/HomeScreenComponents';
import { LecturerLiveClassSession } from '../components/LecturerLiveClassSession';
import { StudentLiveClassSession } from '../components/StudentLiveClassSession';
import { AccessDeniedScreen } from '../components/AccessDeniedScreen';
import { Camera, useCameraDevice } from 'react-native-vision-camera';
import { useFrameProcessor } from 'react-native-vision-camera';
import { runOnJS } from 'react-native-reanimated';
import { scanFaces } from 'vision-camera-face-detector';
import { User } from 'types/firebase';

export const LiveClassSessions = ({ route }: any) => {
  const { lectureId, courseId } = route.params;
  const [lecturerUser, setLecturerUser] = useState<User | null>(null);
  const [faceDetected, setFaceDetected] = useState<boolean>(false);
  const device = useCameraDevice('front'); // Use the front camera for students
  const [attendanceChecks, setAttendanceChecks] = useState<boolean[]>(
    new Array(7).fill(false),
  );
  const { user, course, lecture, exceptions, socket } = useLiveSession(
    lectureId,
    courseId,
  );
  const lecturerData = {
    profilePic: lecturerUser?.profilePic || [],
    isMuted: lecture?.isLecturerMuted || false,
    isCameraOn: lecture?.isLecturerCameraOn || false,
    cameraStreamUrl: lecture?.location || lecture?.videoUrl,
  };
  // Guard: Check if user is Enrolled or a Lecturer
  const isLecturer = course?.lecturerIds?.includes(user?.uid);
  const isStudent = course?.studentsEnrolled?.includes(user?.uid);
  const canJoin = useMemo(() => {
    const isEnrolled = course?.studentsEnrolled?.includes(user.uid);
    const hasStarted =
      lecture?.status === 'ongoing' ||
      lecture?.status === 'scheduled' ||
      lecture?.status === 'completed'; // Allow the 'save' phase to finish
    // Add a base check: if course/lecture don't exist yet, they can't join
    if (!course || !lecture) return false;
    return (isLecturer || isEnrolled) && hasStarted;
  }, [course, lecture, user, isLecturer]);
  const isEligibleForAttendance = useMemo(() => {
    // 1. Check for a specific approved exception for THIS student and THIS lecture
    const hasApprovedException = exceptions.some(
      ex =>
        ex.studentId === user?.uid &&
        ex.lectureId === lectureId &&
        ex.status === 'approved',
    );

    // 2. If they have an exception, they are automatically eligible (Present)
    if (hasApprovedException) return true;

    // 3. Otherwise, fall back to the "5 out of 7" + "Final Check" rule
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
      // 1. Guard: Only proceed if student is enrolled AND NOT an exception holder
      // (Because the backend handles approved exceptions automatically)
      const hasApprovedException = exceptions.some(
        ex => ex.studentId === user?.uid && ex.status === 'approved',
      );

      if (!isStudent || !user?.uid || !lectureId || hasApprovedException)
        return;

      // 2. Only submit for students who actually attended the live stream
      await fetch(`${baseUrl}users/student/class/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: user.uid,
          lectureId: lectureId,
          courseId: courseId,
          status: isEligibleForAttendance ? 'Present' : 'Absent',
          checkData: attendanceChecks,
          timestamp: new Date().toISOString(),
        }),
      });
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
    exceptions, // Added to dependencies
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
    // Only trigger when the lecture status actually flips to 'completed'
  }, [lecture?.status, isStudent, saveAttendance]);
  useEffect(() => {
    const fetchLecturer = async () => {
      const lecturerId = course?.lecturerIds?.[0];
      if (!lecturerId) return;
      try {
        const token = await AsyncStorage.getItem('accessToken');
        const response = await fetch(`${baseUrl}users/${lecturerId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`, // Use the token from your User interface
          },
        });

        const data = await response.json();
        setLecturerUser(data);
      } catch (err) {
        console.error('Failed to fetch lecturer for iCampus:', err);
      }
    };

    fetchLecturer();
  }, [course?.lecturerIds]);

  if (!canJoin) return <AccessDeniedScreen />;
  if (!isLecturer && !isStudent) {
    return <AccessDeniedScreen reason="You are not enrolled in this course." />;
  }

  return (
    <View style={{ flex: 1 }}>
      {isLecturer ? (
        <LecturerLiveClassSession
          lecture={lecture}
          exceptions={exceptions}
          course={course}
          socket={socket}
        />
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
          style={{ height: 1, width: 1, opacity: 0 }} // Hidden background tracker
          device={device}
          isActive={true}
          frameProcessor={frameProcessor}
        />
      )}
    </View>
  );
};