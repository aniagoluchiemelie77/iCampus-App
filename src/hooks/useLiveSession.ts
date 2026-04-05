import { useState, useEffect, useCallback, useRef } from 'react';
import { Course, Lecture, CourseException } from '../types/firebase';
import { useAppSelector } from '../components/hooks';
import { baseUrl } from '../components/HomeScreenComponents';
import { io, Socket } from 'socket.io-client';

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
        fetch(`${baseUrl}users/courses/lectures/${lectureId}`).then(res => res.json()),
        fetch(`${baseUrl}users/courses/${courseId}`).then(res => res.json()),
        fetch(`${baseUrl}users/exceptions/course/${courseId}`).then(res => res.json()),
      ]);
      setLecture(lectureRes);
      setCourse(courseRes);
      setExceptions(exceptionsRes);
    } catch (error) {
      console.error("Failed to sync live session:", error);
    } finally {
      setLoading(false);
    }
  }, [lectureId, courseId]); // Only recreate if IDs change

  // 2. Trigger fetch on mount
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

    // 2. Join Rooms
    socket.emit('join_user_room', user.uid);
    socket.emit('join_lecture', { 
      lectureId, 
      firstName: user.firstname 
    });

    // 3. Cleanup on unmount
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user?.uid, lectureId, user?.firstname]);

  // Removed fetchPostById from return to satisfy ESLint
  return { user, course, lecture, exceptions, fetchLiveSessionData, loading, socket: socketRef.current };
};