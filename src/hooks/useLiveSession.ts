import { useState, useEffect, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import { Course, Lecture, CourseException } from '../types/firebase';
import { useAppSelector } from './hooks';
import { baseUrl } from '../components/HomeScreenComponents';
import { useSocketConnection } from './useSocket';
import {
  fetchLectureById,
  getCourseDetailsForOngoingLecture,
  getAllExceptionsForOngoingLecture,
} from '../api/localGetApis';

export interface LiveSessionJoinState {
  /** True once the server has placed this socket in the lecture room. */
  joined: boolean;
  /** Role as decided by the server from the lecture record. */
  isHost: boolean;
  error: string | null;
}

export const useLiveSession = (lectureId: string, courseId: string) => {
  const user = useAppSelector(state => state.user);
  const [lecture, setLecture] = useState<Lecture | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [exceptions, setExceptions] = useState<CourseException[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [joinState, setJoinState] = useState<LiveSessionJoinState>({
    joined: false,
    isHost: false,
    error: null,
  });
  // useSocketConnection owns the socket's lifecycle (creates + disconnects it).
  const socketRef = useSocketConnection({ baseUrl, userId: user?.uid });

  const fetchLiveSessionData = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const [lectureRes, courseRes, exceptionsRes] = await Promise.all([
        fetchLectureById(lectureId),
        getCourseDetailsForOngoingLecture({ courseId }),
        getAllExceptionsForOngoingLecture({ lectureId }),
      ]);
      setLecture(lectureRes.success ? lectureRes.lecture : null);
      setCourse(courseRes.success && courseRes.data ? courseRes.data : null);
      setExceptions(
        exceptionsRes.success && exceptionsRes.data ? exceptionsRes.data : [],
      );
      if (!lectureRes.success) {
        setLoadError(lectureRes.message || 'Lecture not found.');
      } else if (!courseRes.success) {
        setLoadError(courseRes.error || 'Course not found.');
      }
    } catch (error) {
      console.error('Failed to sync live session:', error);
      setLoadError('Could not load this live session.');
    } finally {
      setLoading(false);
    }
  }, [lectureId, courseId]);

  useEffect(() => {
    fetchLiveSessionData();
  }, [fetchLiveSessionData]);

  // Mirror the ref into state so consumers re-render once the socket exists.
  // This effect runs after useSocketConnection's, so the ref is populated.
  useEffect(() => {
    setSocket(socketRef.current);
  }, [socketRef, user?.uid]);

  // Join (and re-join after every reconnect: the server forgets rooms on drop).
  useEffect(() => {
    if (!socket || !user?.uid || !lectureId) return;

    const join = async () => {
      setIsConnected(true);
      try {
        const ack = await socket.timeout(10000).emitWithAck(
          'join_lecture_session',
          {
            lectureId,
            user: {
              uid: user.uid,
              firstname: user.firstname,
              lastname: user.lastname,
              username: user.username,
              tier: user.tier || 'free',
              profilePic: user.profilePic || '',
            },
          },
        );
        setJoinState({
          joined: !!ack?.ok,
          isHost: !!ack?.isHost,
          error: ack?.ok ? null : ack?.message || 'Could not join session.',
        });
      } catch {
        setJoinState(prev => ({
          ...prev,
          joined: false,
          error: 'The live server did not respond. Retrying…',
        }));
      }
    };
    const handleDisconnect = () => {
      setIsConnected(false);
      setJoinState(prev => ({ ...prev, joined: false }));
    };

    socket.on('connect', join);
    socket.on('disconnect', handleDisconnect);
    if (socket.connected) join();

    return () => {
      socket.off('connect', join);
      socket.off('disconnect', handleDisconnect);
    };
  }, [
    socket,
    lectureId,
    user?.uid,
    user?.firstname,
    user?.lastname,
    user?.username,
    user?.tier,
    user?.profilePic,
  ]);

  return {
    user,
    course,
    lecture,
    exceptions,
    fetchLiveSessionData,
    loading,
    loadError,
    socket,
    isConnected,
    joinState,
  };
};
