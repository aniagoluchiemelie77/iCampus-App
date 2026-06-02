import React, { useState, useRef } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import Video, { VideoRef } from 'react-native-video';
import * as Progress from 'react-native-progress'; 
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { PRIMARY_COLOR, PRIMARY_COLOR_TINT } from 'assets/styles/colors';
import {updateCourseProgressAPI} from '../api/localPatchApis';
import Toast from 'react-native-toast-message';
import { generateCertificateAPI } from '../api/localPostApis';
import { useNavigation } from '@react-navigation/native';
import Modal from 'react-native-modal';

export const CourseLearningScreen = ({ route }: any) => {
  const { courseProduct, userProgress } = route.params;
  const navigation = useNavigation<any>();
  const videoPlayer = useRef<VideoRef>(null);
  const [isPaused, _setIsPaused] = useState(false);
  const [loading, setIsLoading] = useState(false);
  const [activeLessonIndex, setActiveLessonIndex] = useState(0);
  const [completedLessons, setCompletedLessons] = useState<string[]>(
    userProgress?.completedLessons || [],
  );
  const currentLesson = courseProduct.courseDetails.content[activeLessonIndex];

  const handleLessonEnd = () => {
    const isLastLesson =
      activeLessonIndex === courseProduct.courseDetails.content.length - 1;
    let updatedCompleted = completedLessons;
    if (!completedLessons.includes(currentLesson.title)) {
      updatedCompleted = [...completedLessons, currentLesson.title];
      setCompletedLessons(updatedCompleted);
      updateBackendProgress(updatedCompleted);
    }
    if (!isLastLesson) {
      setActiveLessonIndex(prev => prev + 1);
    } else {
      const totalLessons = courseProduct.courseDetails.totalLessons;
      if (updatedCompleted.length >= totalLessons) {
        triggerCertificateCelebration();
      }
    }
  };

  const triggerCertificateCelebration = async () => {
    setIsLoading(true);
    const result = await generateCertificateAPI(courseProduct.productId);
    setIsLoading(false);
    if (result.success) {
      navigation.navigate('CertificateScreen', {
        certificateUrl: result.data.pdfUrl,
        certificateId: result.data.certificateId,
        details: result.data.composition,
      });
    } else {
      Toast.show({
        type: 'error',
        text1: 'Certification Error',
        text2: result.message,
      });
    }
  };
  const updateBackendProgress = async (completed: string[]) => {
    const totalLessons = courseProduct.courseDetails.totalLessons;
    const percentage = Math.round((completed.length / totalLessons) * 100);
    const result = await updateCourseProgressAPI(
      courseProduct.productId,
      percentage,
      completed,
    );
    if (!result.success) {
      Toast.show({
        type: 'error',
        text1: 'Update Error',
        text2: `Couldn't update progress.`,
      });
      console.warn(result.message);
    }
  };
  const renderLessonItem = ({ item, index }: any) => {
    const isActive = index === activeLessonIndex;
    const isFinished = completedLessons.includes(item.title);
    return (
      <TouchableOpacity
        style={[styles.lessonRow, isActive && styles.activeRow]}
        onPress={() => setActiveLessonIndex(index)}
      >
        {isFinished && (
          <MaterialIcons
            name={'check-circle-outlined'}
            size={24}
            color={PRIMARY_COLOR}
          />
        )}
        <View style={[styles.lessonInfo, isFinished && styles.leftMargin]}>
          <Text
            numberOfLines={1}
            ellipsizeMode="tail"
            style={[styles.lessonTitle, isActive && styles.activeText]}
          >
            {item.title}
          </Text>
          <Text style={styles.lessonDuration}>
            {Math.floor(item.duration / 60)} mins
          </Text>
        </View>
      </TouchableOpacity>
    );
  };
  return (
    <View style={styles.container}>
      <View style={styles.playerWrapper}>
        <Video
          ref={videoPlayer}
          source={{ uri: currentLesson.videoUrl }}
          style={styles.video}
          controls={true}
          resizeMode="contain"
          onEnd={handleLessonEnd}
          paused={isPaused}
          playInBackground={false}
          playWhenInactive={false}
        />
      </View>
      <View style={styles.header}>
        <Text style={styles.courseTitle}>{courseProduct.title}</Text>
        {courseProduct.description && (
          <Text style={styles.courseTitle}>{courseProduct.description}</Text>
        )}
        <View style={styles.progressRow}>
          <Progress.Bar
            progress={
              completedLessons.length / courseProduct.courseDetails.totalLessons
            }
            width={Dimensions.get('window').width - 100}
            color={PRIMARY_COLOR}
          />
          <Text style={styles.percentageText}>
            {Math.round(
              (completedLessons.length /
                courseProduct.courseDetails.totalLessons) *
                100,
            )}
            %
          </Text>
        </View>
      </View>
      <FlatList
        data={courseProduct.courseDetails.content}
        keyExtractor={item => item.title}
        renderItem={renderLessonItem}
        ListHeaderComponent={
          <Text style={styles.listHeader}>Course Content</Text>
        }
      />
      <Modal
        isVisible={loading}
        onBackdropPress={() => {}}
        onSwipeComplete={() => {}}
      >
        <View style={styles.modalBackground}>
          <View style={styles.modalContent}>
            <ActivityIndicator size="large" color={PRIMARY_COLOR} />
            <Text style={styles.largeLoadingText}>
              Preparing your official certificate...
            </Text>
            <Text style={styles.subLoadingText}>
              Stamping your credentials on the iCampus ledger.
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
};
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  playerWrapper: { width: '100%', aspectRatio: 16 / 9, backgroundColor: PRIMARY_COLOR },
  video: { width: '100%', height: '100%' },
  header: { padding: 15, borderBottomWidth: .8, borderBottomColor: PRIMARY_COLOR_TINT, marginVertical: 8 },
  courseTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: '#222' },
  courseSubtitle: { fontSize: 14, marginBottom: 10, color: '#2222' },
  progressRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' },
  percentageText: { fontWeight: 'bold', color: PRIMARY_COLOR_TINT, fontSize: 14 },
  listHeader: { padding: 15, fontSize: 16, fontWeight: '600', backgroundColor: '#f9f9f9' },
  lessonRow: { flexDirection: 'row', padding: 15, alignItems: 'center', borderBottomWidth: .8, borderBottomColor: PRIMARY_COLOR_TINT },
  activeRow: { backgroundColor: '#fadccc' },
  activeText: { color: PRIMARY_COLOR, fontWeight: 'bold' },
  lessonInfo: { flex: 1 },
  leftMargin: { marginLeft: 15},
  lessonTitle: { fontSize: 14, color: '#222' },
  lessonDuration: { fontSize: 11, color: PRIMARY_COLOR_TINT, marginTop: 3 },
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignContent: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 25,
    padding: 20,
    alignItems: 'center'
  },
  largeLoadingText: {
    fontSize: 20,
    color: PRIMARY_COLOR,
    fontWeight: 'bold',
    marginBottom: 15
  },
  subLoadingText:{
    fontSize: 14,
    color: PRIMARY_COLOR_TINT
  }
});