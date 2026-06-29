import { useState, useEffect, useCallback, useRef } from 'react';
import { Course, Lecture, CourseException } from '../types/firebase';
import { useAppSelector } from './hooks';
import { baseUrl } from '../components/HomeScreenComponents';
import { io, Socket } from 'socket.io-client';
import {fetchOngoingLecture, getCourseDetailsForOngoingLecture, getAllExceptionsForOngoingLecture} from '../api/localGetApis';

export const useLiveSession = (lectureId: string, courseId: string) => {
  const user = useAppSelector(state => state.user);
  const [lecture, setLecture] = useState<Lecture | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [exceptions, setExceptions] = useState<CourseException[]>([]);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef<Socket | null>(null);
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

    const socket = io(baseUrl, { 
      transports: ['websocket'],
      query: { userId: user.uid } 
    });
    socketRef.current = socket;

    socket.emit('join_user_room', user.uid);
    socket.emit('join_lecture', { 
      lectureId, 
      user: { firstname: user.firstname, uid: user.uid } 
    });
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user?.uid, lectureId, user?.firstname]);

  return { user, course, lecture, exceptions, fetchLiveSessionData, loading, socket: socketRef.current };
};