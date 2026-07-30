import { useState, useEffect, useCallback } from 'react';
import { Course, Lecture, CourseException } from '../types/firebase';
import { useAppSelector } from './hooks';
import { baseUrl } from '../components/HomeScreenComponents';
import { useSocketConnection } from './useSocket';
import {fetchOngoingLecture, getCourseDetailsForOngoingLecture, getAllExceptionsForOngoingLecture} from '../api/localGetApis';

export const useLiveSession = (lectureId: string, courseId: string) => {
  const user = useAppSelector(state => state.user);
  const [lecture, setLecture] = useState<Lecture | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [exceptions, setExceptions] = useState<CourseException[]>([]);
  const [loading, setLoading] = useState(true);
  const socketRef = useSocketConnection({
    baseUrl,
    userId: user?.uid,
  });
  const fetchLiveSessionData = useCallback(async () => {
    try {
      setLoading(true);
      const [lectureRes, courseRes, exceptionsRes] = await Promise.all([
    fetchOngoingLecture(),
    getCourseDetailsForOngoingLecture(courseId),
    getAllExceptionsForOngoingLecture(lectureId),
  ]);
      if (lectureRes.success && lectureRes.lecture) {
    setLecture(lectureRes.lecture); 
  } else {
    setLecture(null);
  }
      if (courseRes.success && courseRes.data) {
    setCourse(courseRes.data); 
  } else {
    setCourse(null);
  }
      if (exceptionsRes.success && exceptionsRes.data) {
    setExceptions(exceptionsRes.data); 
  } else {
    setExceptions([]); 
  }
    } catch (error) {
      console.error("Failed to sync live session:", error);
    } finally {
      setLoading(false);
    }
  }, [lectureId, courseId]); 

  useEffect(() => {
    fetchLiveSessionData();
  }, [fetchLiveSessionData]);
  useEffect(() => {
    if (!user?.uid || !lectureId) return;

    socketRef.current?.emit('join_user_room', user.uid);
    socketRef.current?.emit('join_lecture', { 
      lectureId, 
      user: { firstname: user.firstname, uid: user.uid } 
    });
    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [user?.uid, lectureId, user?.firstname, socketRef]);

  return { user, course, lecture, exceptions, fetchLiveSessionData, loading, socketRef };
};