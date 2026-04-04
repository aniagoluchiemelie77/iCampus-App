import { useState, useEffect, useCallback } from 'react';
import { Course, Lecture, CourseException } from '../types/firebase';
import { useAppSelector } from '../components/hooks';
import { baseUrl } from '../components/HomeScreenComponents';

export const useLiveSession = (lectureId: string, courseId: string) => {
  const user = useAppSelector(state => state.user);
  const [lecture, setLecture] = useState<Lecture | null>(null);
  const [course, setCourse] = useState<Course | null>(null);
  const [exceptions, setExceptions] = useState<CourseException[]>([]);
  const [loading, setLoading] = useState(true);
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

  // Removed fetchPostById from return to satisfy ESLint
  return { user, course, lecture, exceptions, fetchLiveSessionData, loading };
};