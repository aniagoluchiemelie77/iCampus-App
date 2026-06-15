import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import Video, { VideoRef } from 'react-native-video';
import * as Progress from 'react-native-progress';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { updateCourseProgressAPI } from '../api/localPatchApis';
import Toast from 'react-native-toast-message';
import { generateCertificateAPI } from '../api/localPostApis';
import { useNavigation } from '@react-navigation/native';
import Modal from 'react-native-modal';
import { useTheme } from '../context/ThemeContext';
import { RootStackParamList } from '../../App';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

interface Lesson {
  title: string;
  duration: number;
  videoUrl: string;
}
type Props = NativeStackScreenProps<RootStackParamList, 'CourseLearningScreen'>;

export const CourseLearningScreen = ({ route }: Props) => {
  const { colors } = useTheme();
  const { courseProduct, userProgress } = route.params;
  const navigation = useNavigation<any>();

  const videoPlayer = useRef<VideoRef>(null);
  const isMounted = useRef(true);

  const [isPaused] = useState(false);
  const [loading, setIsLoading] = useState(false);
  const [activeLessonIndex, setActiveLessonIndex] = useState(0);
  const [completedLessons, setCompletedLessons] = useState<string[]>(
    () => userProgress?.completedLessons || [], // Lazy initialization
  );

  const totalLessons = courseProduct.courseDetails.totalLessons;
  const currentLesson = courseProduct.courseDetails.content[activeLessonIndex];

  // Separate API call logic cleanly
  const triggerCertificateCelebration = async () => {
    setIsLoading(true);
    try {
      const result = await generateCertificateAPI(courseProduct.productId);
      if (!isMounted.current) return;

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
    } catch (error) {
      if (isMounted.current) setIsLoading(false);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Something went wrong.',
      });
    }
  };

  const updateBackendProgress = async (completed: string[]) => {
    try {
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
    } catch (error) {
      console.error('Failed to update progress', error);
    }
  };

  const handleLessonEnd = () => {
    const isLastLesson =
      activeLessonIndex === courseProduct.courseDetails.content.length - 1;

    // Check completion instantly without waiting for state mutations
    const alreadyCompleted = completedLessons.includes(currentLesson.title);
    let updatedCompleted = completedLessons;

    if (!alreadyCompleted) {
      updatedCompleted = [...completedLessons, currentLesson.title];
      setCompletedLessons(updatedCompleted);
      updateBackendProgress(updatedCompleted);
    }

    if (!isLastLesson) {
      setActiveLessonIndex(prev => prev + 1);
    } else {
      if (updatedCompleted.length >= totalLessons) {
        triggerCertificateCelebration();
      }
    }
  };

  const renderLessonItem = useCallback(
    ({ item, index }: { item: Lesson; index: number }) => {
      const isActive = index === activeLessonIndex;
      const isFinished = completedLessons.includes(item.title);

      return (
        <TouchableOpacity
          style={[
            styles.lessonRow,
            isActive && { borderWidth: 1, borderColor: colors.primary },
            { backgroundColor: colors.backgroundSecondary },
          ]}
          onPress={() => setActiveLessonIndex(index)}
          activeOpacity={0.7}
        >
          {/* Placeholder container keeps layout consistent whether checked or not */}
          <View style={styles.iconContainer}>
            {isFinished && (
              <MaterialIcons
                name="check-circle-outline"
                size={24}
                color={colors.primary}
              />
            )}
          </View>

          <View style={styles.lessonInfo}>
            <Text
              numberOfLines={1}
              ellipsizeMode="tail"
              style={[
                styles.lessonTitle,
                isActive
                  ? { color: colors.primary, fontWeight: '600' }
                  : { color: colors.text },
              ]}
            >
              {item.title}
            </Text>
            <Text
              style={[
                styles.lessonDuration,
                isActive ? { color: colors.primary } : { color: colors.text },
              ]}
            >
              {Math.floor(item.duration / 60)} mins
            </Text>
          </View>
        </TouchableOpacity>
      );
    },
    [activeLessonIndex, completedLessons, colors],
  );

  // Safe Math breakdown to avoid dividing by 0 errors dynamically
  const progressRatio =
    totalLessons > 0 ? completedLessons.length / totalLessons : 0;

  // Cleanup component mount token on unmount
  React.useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
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

      <View
        style={[styles.header, { backgroundColor: colors.backgroundSecondary }]}
      >
        <Text style={[styles.courseTitle, { color: colors.textDarker }]}>
          {courseProduct.title}
        </Text>
        {courseProduct.description && (
          <Text style={[styles.subTitle, { color: colors.text }]}>
            {courseProduct.description}
          </Text>
        )}
        <View style={styles.progressRow}>
          <Progress.Bar
            progress={progressRatio}
            width={Dimensions.get('window').width - 100}
            color={colors.primary}
          />
          <Text style={[styles.percentageText, { color: colors.text }]}>
            {Math.round(progressRatio * 100)}%
          </Text>
        </View>
      </View>

      <FlatList
        data={courseProduct.courseDetails.content}
        keyExtractor={item => item.title}
        renderItem={renderLessonItem}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        ListHeaderComponent={
          <Text style={[styles.listHeader, { color: colors.text }]}>
            Course Content
          </Text>
        }
      />

      <Modal
        isVisible={loading}
        animationIn="fadeIn"
        animationOut="fadeOut"
        backdropTransitionOutTiming={0} // Fixes android modal flicker
      >
        <View style={styles.modalBackground}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.backgroundSecondary },
            ]}
          >
            <ActivityIndicator size="large" color={colors.primary} />
            <Text
              style={[styles.largeLoadingText, { color: colors.textDarker }]}
            >
              Preparing your official certificate...
            </Text>
            <Text style={[styles.subLoadingText, { color: colors.text }]}>
              Stamping your credentials on the iCampus ledger.
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
};
const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 15 },
  playerWrapper: { width: '100%', aspectRatio: 16 / 9 },
  video: { width: '100%', height: '100%' },
  header: { padding: 15, marginBottom: 15, borderRadius: 15 },
  courseTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  subTitle: { fontSize: 14, marginBottom: 10 },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  percentageText: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  listHeader: {
    padding: 15,
    fontSize: 14,
    fontWeight: '600',
  },
  lessonRow: {
    flexDirection: 'row',
    padding: 15,
    alignItems: 'center',
    borderRadius: 15,
  },
  lessonInfo: { flex: 1 },
  leftMargin: { marginLeft: 10 },
  lessonTitle: { fontSize: 14 },
  lessonDuration: { fontSize: 12, marginTop: 4 },
  modalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignContent: 'center',
  },
  modalContent: {
    borderRadius: 25,
    padding: 20,
    alignItems: 'center',
  },
  largeLoadingText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 15,
  },
  subLoadingText: {
    fontSize: 14,
  },
  iconContainer: {
    width: 30,
    justifyContent: 'center',
    alignItems: 'flex-start',
  }, // Fixes layout jumps
});
