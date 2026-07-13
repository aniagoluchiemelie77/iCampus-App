import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Dimensions,
  Pressable,
  Animated,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  ScrollView,
  TextInput,
  Platform,
  StyleSheet
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Svg, Circle } from 'react-native-svg';
import { Course, User, Lecture, CourseException } from '../types/firebase';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import * as Progress from 'react-native-progress';
import {
  getCourseExceptions,
  fetchAllLecturesByCourseId,
} from '../api/localGetApis.ts';
import { useTheme } from '../context/ThemeContext';
import { EXCEPTION_ACCOUNT_LIMITS } from '../constants/inAppConstants.ts';


const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface SelectionModalProps {
  visible: boolean;
  options: string[];
  selectedValue: string;
  onSelect: (item: string) => void;
  onClose: () => void;
  title: string;
  colors: any;
}
interface UploadProgressModalProps {
  visible: boolean;
  progress: number;
  statusText: string;
}
interface GridItemProps {
  label: string;
  iconName: string;
  count?: number;
  onPress?: () => void;
}
interface CourseModalProps {
  isVisible: boolean;
  onClose: () => void;
  id: string;
  course: Course;
  currentUser: User;
  userRole: 'student' | 'lecturer' | 'otherUser';
}
interface ManualCourseModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSubmit: (courseData: {
    courseTitle: string;
    courseCode: string;
    credits: number;
  }) => Promise<void>;
  colors: any;
}
const GridItem = ({ label, iconName, count, onPress }: GridItemProps) => {
  const { colors: themeColors } = useTheme();
  return (
    <TouchableOpacity
      style={[styles.gridBtn, { borderColor: themeColors.primary }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <MaterialIcons name={iconName} size={26} color={themeColors.primary} />
      <Text style={[styles.gridLabel, { color: themeColors.text }]}>
        {label}
      </Text>
      {count !== undefined && count > 0 && (
        <View
          style={[
            styles.notifBadge,
            { backgroundColor: themeColors.backgroundSecondary },
          ]}
        >
          <Text style={[styles.notifText, { color: themeColors.primary }]}>
            {count}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};
export const UploadProgressModal = ({
  visible,
  progress,
  statusText,
}: UploadProgressModalProps) => {
  const { colors: themeColors } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View
          style={[
            styles.containerModal,
            { backgroundColor: themeColors.backgroundSecondary },
          ]}
        >
          <Progress.Circle
            size={80}
            progress={progress}
            indeterminate={progress === 0 || progress === 1}
            color={themeColors.primary}
            borderWidth={2}
            thickness={4}
            showsText={progress > 0 && progress < 1}
            formatText={() => `${Math.round(progress * 100)}%`}
          />
          <Text style={[styles.statusText, { color: themeColors.primary }]}>
            {statusText}
          </Text>
        </View>
      </View>
    </Modal>
  );
};
const ProgressRing = ({ percentage }: { percentage: number }) => {
  const { colors: themeColors } = useTheme();
  const radius = 40;
  const stroke = 8;
  const normalizedRadius = radius - stroke;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <View style={styles.progressContainer}>
      <Svg
        height={radius * 2}
        width={radius * 2}
        viewBox={`0 0 ${radius * 2} ${radius * 2}`}
      >
        <Circle
          stroke={themeColors.primaryTint}
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <Circle
          stroke={themeColors.primary}
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          transform={`rotate(-90, ${radius}, ${radius})`}
        />
      </Svg>
      <Text style={[styles.progressText, { color: themeColors.primary }]}>
        {Math.round(percentage)}%
      </Text>
    </View>
  );
};
export const CourseModal = ({
  isVisible,
  onClose,
  course,
  id,
  currentUser,
  userRole,
}: CourseModalProps) => {
  const { colors: themeColors } = useTheme();
  const navigation = useNavigation<any>();
  const [allExceptions, setAllExceptions] = useState<CourseException[]>([]);
  const [lectures, setAllLectures] = useState<Lecture[]>([]);
  const [loadingExceptions, setLoadingExceptions] = useState(false);
  const modalHeight = useRef(new Animated.Value(SCREEN_HEIGHT * 0.7)).current;
  const setFullScreen = (isFull: boolean) => {
    Animated.spring(modalHeight, {
      toValue: isFull ? SCREEN_HEIGHT : SCREEN_HEIGHT * 0.8,
      useNativeDriver: false,
      friction: 8,
    }).start();
  };

  useEffect(() => {
    const fetchCourseData = async () => {
      if (!course.courseId || !isVisible) return;
      setLoadingExceptions(true);

      try {
        const [exceptionsRes, lecturesRes] = await Promise.all([
          getCourseExceptions(course.courseId),
          fetchAllLecturesByCourseId(course.courseId),
        ]);
        if (exceptionsRes.success && exceptionsRes.data) {
          setAllExceptions(exceptionsRes.data);
        } else {
          setAllExceptions([]);
          Toast.show({
            type: 'error',
            text2: exceptionsRes.error || 'No exceptions found',
          });
        }
        if (lecturesRes.success && lecturesRes.data) {
          setAllLectures(lecturesRes.data);
        } else {
          setAllLectures([]);
          Toast.show({
            type: 'error',
            text2:
              lecturesRes.error ||
              `No lectures found for ${course.courseTitle}`,
          });
        }
      } catch (error) {
        console.error('Critical Error fetching data dependencies:', error);
      } finally {
        setLoadingExceptions(false);
      }
    };

    fetchCourseData();
  }, [course.courseId, course.courseTitle, isVisible]);
  if (!course) return null;
  const isLecturer = userRole === 'lecturer';
  const isStudent = userRole === 'student';
  const totalTopics = course.courseContents?.length || 0;
  const taughtTopics = new Set(
    lectures.filter(l => l.isTaught).map(l => l.topicName.toLowerCase()),
  ).size;
  const syllabusPercentage =
    totalTopics > 0 ? (taughtTopics / totalTopics) * 100 : 0;

  const lecturesHeld = lectures.filter(l => l.isTaught).length;
  const lecturesAttended = lectures.filter(l =>
    l.attendance?.includes(id),
  ).length;
  const attendancePercentage =
    lecturesHeld > 0 ? (lecturesAttended / lecturesHeld) * 100 : 0;

  const totalMaterials =
    (course.resources?.length || 0) +
    lectures.reduce(
      (acc, lecture) => acc + (lecture.resources?.length || 0),
      0,
    );
  const assignmentCount = course.assignments?.length || 0;
  const userPlan = currentUser.tier || 'free';
  const limit = EXCEPTION_ACCOUNT_LIMITS[userPlan];
  const usedThisMonth = allExceptions.filter(
    ex =>
      ex.studentId === currentUser.uid &&
      new Date(ex.date).getMonth() === new Date().getMonth() &&
      ex.status !== 'rejected',
  ).length;
  const remaining = Math.max(0, limit - usedThisMonth);
  const instructorCount = course.lecturerIds?.length || 0;
  const lastInstructor =
    course.lecturerIds && course.lecturerIds.length > 0
      ? course.lecturerIds[course.lecturerIds.length - 1]
      : 'No Instructor Assigned';
  const lecturesDelivered = lectures.filter(l => l.isTaught).length;
  const totalExpectedLectures = course.courseContents?.length || 0;
  const participationPercentage =
    totalExpectedLectures > 0
      ? (lecturesDelivered / totalExpectedLectures) * 100
      : 0;

  const pendingExceptionsCount = allExceptions.filter(
    ex => ex.status === 'pending',
  ).length;

  return (
    <Modal visible={isVisible} animationType="slide" transparent>
      <Pressable
        style={styles.modalOverlay}
        onPress={() => {
          onClose();
          setFullScreen(false);
        }}
      >
        <TouchableWithoutFeedback>
          <Animated.View
            style={[
              styles.modalContent,
              {
                height: modalHeight,
                backgroundColor: themeColors.backgroundSecondary,
              },
            ]}
          >
            <View
              style={[
                styles.modalGrabber,
                { backgroundColor: themeColors.primaryTint },
              ]}
            />
            {isStudent && (
              <>
                <View style={styles.dashboardRow}>
                  <View style={styles.statCard}>
                    <ProgressRing percentage={syllabusPercentage} />
                    <View style={styles.statTextContainer}>
                      <Text
                        style={[styles.statLabel, { color: themeColors.text }]}
                      >
                        Syllables
                      </Text>
                      <Text
                        style={[styles.statSub, { color: themeColors.primary }]}
                      >
                        {taughtTopics}/{totalTopics} Covered
                      </Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.verticalDivider,
                      { backgroundColor: themeColors.primaryTint },
                    ]}
                  />
                  <View style={styles.statCard}>
                    <ProgressRing percentage={attendancePercentage} />
                    <View style={styles.statTextContainer}>
                      <Text
                        style={[styles.statLabel, { color: themeColors.text }]}
                      >
                        Attendance
                      </Text>
                      <Text
                        style={[styles.statSub, { color: themeColors.primary }]}
                      >
                        {lecturesAttended}/{lecturesHeld} attended
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={styles.iconGrid}>
                  <GridItem
                    label="Course Contents"
                    iconName="format-list-bulleted"
                    count={course.courseContents?.length}
                    onPress={() =>
                      navigation.navigate('CourseSubPage', {
                        title: 'Course Contents',
                        course: course,
                        userRole: currentUser.usertype,
                      })
                    }
                  />
                  <GridItem
                    label="Course Materials"
                    iconName="folder-outlined"
                    count={totalMaterials}
                    onPress={() =>
                      navigation.navigate('CourseSubPage', {
                        title: 'Course Materials',
                        course,
                        lectures: lectures,
                        userRole: currentUser.usertype,
                        exceptions: null,
                      })
                    }
                  />
                  <GridItem
                    label="View Lectures"
                    iconName="access-time-outlined"
                    onPress={() =>
                      navigation.navigate('CourseSubPage', {
                        title: 'View Lecture Schedule',
                        course,
                        userRole: currentUser.usertype,
                        exceptions: null,
                        lectures: null,
                      })
                    }
                  />
                  <GridItem
                    label="Assignments"
                    iconName="pending-actions-outlined"
                    count={assignmentCount}
                    onPress={() =>
                      navigation.navigate('CourseSubPage', {
                        title: 'Assignments',
                        course,
                        userRole: currentUser.usertype,
                        exceptions: null,
                        lectures: null,
                      })
                    }
                  />
                  <GridItem
                    label="Exceptions"
                    iconName="verified-user-outlined"
                    count={remaining}
                    onPress={() => {
                      navigation.navigate('CourseSubPage', {
                        title: 'Exceptions',
                        course,
                        userRole: currentUser.usertype,
                        exceptions: allExceptions,
                        lectures: null,
                      });
                    }}
                  />
                  <GridItem
                    label="Instructors"
                    iconName="person-pin-outlined"
                    count={instructorCount > 1 ? instructorCount : undefined}
                    onPress={() => {
                      if (
                        !lastInstructor ||
                        lastInstructor === 'No Instructor Assigned' ||
                        lastInstructor === 'Unknown Instructor'
                      ) {
                        return;
                      }
                      navigation.navigate('Profile', {
                        identifier: lastInstructor,
                      });
                    }}
                  />
                </View>
              </>
            )}
            {isLecturer && (
              <>
                <View style={styles.dashboardRow}>
                  <View style={styles.statCard}>
                    <ProgressRing percentage={syllabusPercentage} />
                    <View style={styles.statTextContainer}>
                      <Text
                        style={[styles.statLabel, { color: themeColors.text }]}
                      >
                        Syllables
                      </Text>
                      <Text
                        style={[styles.statSub, { color: themeColors.primary }]}
                      >
                        {taughtTopics}/{totalTopics} Covered
                      </Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.verticalDivider,
                      { backgroundColor: themeColors.primaryTint },
                    ]}
                  />
                  <View style={styles.statCard}>
                    <ProgressRing percentage={participationPercentage} />
                    <View style={styles.statTextContainer}>
                      <Text
                        style={[styles.statLabel, { color: themeColors.text }]}
                      >
                        Participation
                      </Text>
                      <Text
                        style={[styles.statSub, { color: themeColors.primary }]}
                      >
                        {lecturesDelivered}/{totalExpectedLectures} Delivered
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={styles.iconGrid}>
                  <GridItem
                    label="Upload Course Materials"
                    iconName="cloud-upload-outlined"
                    onPress={() =>
                      navigation.navigate('CourseSubPage', {
                        title: 'Course Materials',
                        course,
                        userRole: currentUser.usertype,
                        exceptions: null,
                        lectures: null,
                      })
                    }
                  />
                  <GridItem
                    label="Manage Lecture Exceptions"
                    iconName="verified-user-outlined"
                    count={
                      loadingExceptions
                        ? undefined
                        : userRole === 'lecturer'
                        ? pendingExceptionsCount
                        : remaining
                    }
                    onPress={() => {
                      if (loadingExceptions) return;
                      navigation.navigate('CourseSubPage', {
                        title: 'Exceptions',
                        course,
                        userRole: currentUser.usertype,
                        exceptions: null,
                        lectures: null,
                      });
                    }}
                  />
                  <GridItem
                    label="Add Assignments"
                    iconName="note-alt-outlined"
                    onPress={() =>
                      navigation.navigate('CourseSubPage', {
                        title: 'Assignments',
                        course,
                        userRole: currentUser.usertype,
                        exceptions: null,
                        lectures: null,
                      })
                    }
                  />
                  <GridItem
                    label="Manage Lectures Schedule"
                    iconName="access-time-outlined"
                    onPress={() =>
                      navigation.navigate('CourseSubPage', {
                        title: 'View Lecture Schedule',
                        course,
                        userRole: currentUser.usertype,
                        exceptions: null,
                        lectures: null,
                      })
                    }
                  />
                  <GridItem
                    label="Create A Test"
                    iconName="edit-calendar-outlined"
                    onPress={() =>
                      navigation.navigate('CourseSubPage', {
                        title: 'Assessments',
                        course,
                        userRole: currentUser.usertype,
                        exceptions: null,
                        lectures: null,
                      })
                    }
                  />
                  <GridItem
                    label="Performance Insights"
                    iconName="insights"
                    onPress={() =>
                      navigation.navigate('CourseSubPage', {
                        title: 'Grade Accelerator',
                        course,
                        userRole: currentUser.usertype,
                        exceptions: null,
                        lectures: null,
                      })
                    }
                  />
                </View>
              </>
            )}
          </Animated.View>
        </TouchableWithoutFeedback>
      </Pressable>
    </Modal>
  );
};
export const SelectionModal: React.FC<SelectionModalProps> = ({
  visible,
  options,
  selectedValue,
  onSelect,
  onClose,
  title,
  colors,
}) => (
  <Modal
    visible={visible}
    transparent={true}
    animationType="slide"
    onRequestClose={onClose}
  >
    <Pressable style={styles.modalOverlay} onPress={onClose}>
      <TouchableWithoutFeedback>
        <View
          style={[
            styles.bottomSheet,
            { backgroundColor: colors.backgroundSecondary },
          ]}
        >
          <Text style={[styles.sheetTitle, { color: colors.textDarker }]}>
            {title}
          </Text>

          {options.map(item => {
            const isSelected = item === selectedValue;

            return (
              <TouchableOpacity
                key={item}
                style={[
                  styles.sheetOption,
                  { borderBottomColor: colors.border },
                ]}
                onPress={() => {
                  onSelect(item);
                  onClose();
                }}
              >
                <Text
                  style={[
                    styles.optionText,
                    { color: isSelected ? colors.primary : colors.text },
                  ]}
                >
                  {item}
                </Text>
                {isSelected && (
                  <MaterialIcons
                    name="check-circle-outlined"
                    size={22}
                    color={colors.primary}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </TouchableWithoutFeedback>
    </Pressable>
  </Modal>
);
export const ManualCourseModal = ({
  isVisible,
  onClose,
  onSubmit,
  colors,
}: ManualCourseModalProps) => {
  const [courseTitle, setCourseTitle] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [credits, setCredits] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async () => {
    if (!courseTitle.trim() || !courseCode.trim() || !credits.trim()) {
      Toast.show({
        type: 'error',
        text2: 'Please fill in all details.',
      });
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmit({
        courseTitle: courseTitle.trim(),
        courseCode: courseCode.trim().toUpperCase(),
        credits: parseInt(credits, 10) || 0,
      });
      setCourseTitle('');
      setCourseCode('');
      setCredits('');
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={[styles.modalContainer, { backgroundColor: colors.background }]}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View
            style={[
              styles.header,
              { backgroundColor: colors.backgroundSecondary },
            ]}
          >
            <Text style={[styles.headerTitle, { color: colors.textDarker }]}>
              Add Course Manually
            </Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons
                name="close-outlined"
                size={24}
                color={colors.primary}
              />
            </TouchableOpacity>
          </View>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View
              style={[styles.warningBox, { borderLeftColor: colors.primary }]}
            >
              <MaterialIcons
                name="info-outlined"
                size={24}
                color={colors.primary}
                style={{ marginRight: 10 }}
              />
              <View style={{ flex: 1 }}>
                <Text style={[styles.warningTitle, { color: colors.text }]}>
                  Double Check Fields
                </Text>
                <Text style={[styles.warningText, { color: colors.text }]}>
                  Please ensure the course code and title match your official
                  syllabus exactly. Automated system extractions, attendance
                  records, and exam updates rely heavily on these accurate
                  matching parameters.
                </Text>
              </View>
            </View>
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>
                Course Code
              </Text>
              <TextInput
                style={[
                  styles.input,
                  { color: colors.text, borderColor: colors.border },
                ]}
                placeholder="e.g., COS 301"
                placeholderTextColor={colors.inputTextHolder || '#888'}
                value={courseCode}
                onChangeText={setCourseCode}
                autoCapitalize="characters"
                autoCorrect={false}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>
                Course Title
              </Text>
              <TextInput
                style={[
                  styles.input,
                  { color: colors.text, borderColor: colors.border },
                ]}
                placeholder="e.g., Database Management Systems"
                placeholderTextColor={colors.inputTextHolder || '#888'}
                value={courseTitle}
                onChangeText={setCourseTitle}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={[styles.label, { color: colors.text }]}>
                Credit Unit Load
              </Text>
              <TextInput
                style={[
                  styles.input,
                  { color: colors.text, borderColor: colors.border },
                ]}
                placeholder="e.g., 3"
                placeholderTextColor={colors.inputTextHolder || '#888'}
                value={credits}
                onChangeText={setCredits}
                keyboardType="numeric"
                maxLength={2}
              />
            </View>
            <TouchableOpacity
              style={[
                styles.submitBtn,
                {
                  backgroundColor: colors.btnColor,
                  opacity: isSubmitting ? 0.7 : 1,
                },
              ]}
              onPress={handleSave}
              disabled={isSubmitting}
            >
              <Text
                style={[styles.submitBtnText, { color: colors.btnTextColor }]}
              >
                {isSubmitting ? 'Saving Course...' : 'Create Course Entry'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};
const styles = StyleSheet.create({
  modalContainer: { flex: 1, padding: 15 },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 25,
    overflow: 'hidden',
    position: 'absolute',
    bottom: 0,
  },
  progressContainer: { alignContent: 'center', position: 'relative' },
  progressText: {
    position: 'absolute',
    fontWeight: 'bold',
    fontSize: 14,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  statSub: { fontSize: 12, fontWeight: 'bold' },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
  },
  gridBtn: {
    position: 'relative',
    width: '30%',
    alignItems: 'center',
    marginBottom: 15,
    marginRight: 10,
    borderWidth: 1,
    borderRadius: 10,
  },
  gridLabel: { fontSize: 12, marginTop: 6, fontWeight: 'bold' },
  notifBadge: {
    position: 'absolute',
    top: -5,
    left: 5,
    borderRadius: 4,
    padding: 7,
    alignContent: 'center',
  },
  notifText: { fontSize: 10, fontWeight: 'bold' },
  modalGrabber: {
    width: 40,
    height: 5,
    borderRadius: 10,
    alignSelf: 'center',
  },
  dashboardRow: {
    flexDirection: 'row',
    marginVertical: 15,
    alignItems: 'center',
    justifyContent: 'space-evenly',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    flexDirection: 'column',
  },
  statTextContainer: {
    marginTop: 10,
    alignItems: 'center',
  },
  verticalDivider: {
    width: 1,
    height: '90%',
  },
  bottomSheet: {
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 20,
    maxHeight: '40%',
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  sheetOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionText: {
    fontSize: 14,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignContent: 'center',
  },
  containerModal: {
    padding: 30,
    borderRadius: 15,
    alignItems: 'center',
    width: '90%',
  },
  statusText: {
    marginTop: 20,
    fontSize: 14,
    fontWeight: 'bold',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    marginBottom: 15,
  },
  headerTitle: { fontSize: 18, fontWeight: '600' },
  scrollContent: { padding: 20 },
  warningBox: {
    flexDirection: 'row',
    padding: 15,
    borderRadius: 15,
    borderLeftWidth: 1,
    marginBottom: 15,
  },
  warningTitle: { fontWeight: '700', fontSize: 14, marginBottom: 3 },
  warningText: { fontSize: 12, lineHeight: 17, fontWeight: '500' },
  formGroup: { marginBottom: 15 },
  label: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  input: {
    height: 60,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 6,
    fontSize: 14,
    width: '100%',
  },
  submitBtn: {
    width: '80%',
    alignSelf: 'center',
    borderRadius: 10,
    paddingVertical: 15,
    alignContent: 'center',
    marginTop: 15,
  },
  submitBtnText: { fontSize: 14, fontWeight: '600' },
});