import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Lecture } from 'types/firebase';
import { baseUrl } from '../components/HomeScreenComponents';
import { StudentRecordedLecturesScreen } from '../components/StudentRecordedLectureScreen';
import { PRIMARY_COLOR } from '../components/Classroomcomponent';

export const VideoPlayerScreen = ({ route }: any) => {
  const { lectureId, url, title, userRole } = route.params;
  const isAdmin = userRole === 'lecturer';
  const [lectureDetails, setLectureDetails] = useState<Lecture | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLectureDetails = async () => {
      try {
        const response = await fetch(
          `${baseUrl}users/lectures/details?url=${encodeURIComponent(url)}`,
        );
        const data = await response.json();
        setLectureDetails(data);
      } catch (error) {
        console.error('Error fetching specific lecture:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchLectureDetails();
  }, [url]);

  return (
    <View style={{ flex: 1 }}>
      <StudentRecordedLecturesScreen
        lectureTitle={title}
        lectureId={lectureId}
        lectureVideoUrl={url}
        admin={isAdmin}
        extraDetails={lectureDetails}
      />

      {loading && <ActivityIndicator size="small" color={PRIMARY_COLOR} />}
    </View>
  );
};