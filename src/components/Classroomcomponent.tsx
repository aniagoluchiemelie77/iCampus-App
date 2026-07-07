import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Image,
  StyleSheet,
  Modal,
  Dimensions,
  ActivityIndicator,
  Pressable,
  Animated,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  ScrollView,
  TextInput,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import DocumentPicker from 'react-native-document-picker';
import { Svg, Circle } from 'react-native-svg';
import { Course, User, Lecture, CourseException } from '../types/firebase';
import { useAppSelector } from '../hooks/hooks.ts';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import * as Progress from 'react-native-progress';
import { extractCourseFormAPI } from '../api/localPostApis.ts';
import ExpandableFAB from './ExpandableFAB.tsx';
import { homeStyles } from '../assets/styles/colors.ts';
import { PageHeader } from '../components/PageHeader';
import ImagePicker from 'react-native-image-crop-picker';
import { AttachmentModal } from './ChatInput.tsx';
import {
  fetchMyCoursesAPI,
  fetchLecturerCoursesAPI,
  getCourseExceptions,
  fetchAllLecturesByCourseId,
} from '../api/localGetApis.ts';
import { createManualCourseAPI } from '../api/localPostApis.ts';
import { useAppDataContext } from '../context/EventContext.tsx';
import { ProductCard } from './ProductCard';
import { useTheme } from '../context/ThemeContext';
import { EmptyState } from '../components/EmptyFlatlistComponent';
import { PRIMARY_COLOR, PRIMARY_COLOR_TINT } from '../assets/styles/colors.ts';
import { EXCEPTION_ACCOUNT_LIMITS } from '../constants/inAppConstants.ts';
import { CourseSearchCard } from './SearchScreen.tsx';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;
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
interface DashboardProps {
  user: User;
  userRole: 'student' | 'lecturer' | 'otherUser';
}
interface ClassroomProps {
  userRole: 'student' | 'lecturer' | 'otherUser';
}
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
const UploadProgressModal = ({
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
const generateSessions = () => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-11

  const academicYear = currentMonth >= 8 ? currentYear : currentYear - 1;

  return [
    'All',
    `${academicYear - 1}/${academicYear}`, // Preceding
    `${academicYear}/${academicYear + 1}`, // Default/Current
    `${academicYear + 1}/${academicYear + 2}`, // Upcoming
  ];
};
const SESSIONS = generateSessions();

const CourseModal = ({
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

const Dashboard: React.FC<DashboardProps> = ({ user, userRole }) => {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const [courses, setCourses] = useState<Course[]>([]);
  const { allProducts } = useAppDataContext();
  const [isLoading, setLoading] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const isStudent = userRole === 'student';
  const isInstructor = userRole === 'lecturer';
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('First');
  const [isManualModalVisible, setIsManualModalVisible] = useState(false);
  const [selectedSession, setSelectedSession] = useState(SESSIONS[2]);
  const [isSessionModalVisible, setSessionModalVisible] = useState(false);
  const [isSemesterModalVisible, setSemesterModalVisible] = useState(false);
  const [isAttachmentModalVisible, setIsAttachmentModalVisible] =
    useState(false);
  const [isFabMenuVisible, setFabMenuVisible] = useState(false);
  const toggleFab = () => setFabMenuVisible(!isFabMenuVisible);

  const fetchMyCourses = useCallback(
    async (semester?: string, session?: string) => {
      setLoading(true);
      try {
        const result = await fetchMyCoursesAPI({
          semester,
          session,
        });

        if (result.success) {
          setCourses(result.courses);
        } else {
          Toast.show({
            type: 'error',
            text1: 'Fetch Error',
            text2: result.message,
          });
        }
      } catch (error) {
        console.error(error);
        Toast.show({
          type: 'error',
          text1: 'Failed to fetch courses',
          position: 'bottom',
          bottomOffset: 5,
        });
      } finally {
        setLoading(false);
      }
    },
    [],
  );
  const fetchLecturerCourses = useCallback(
    async (semester: string, session: string) => {
      setLoading(true);
      try {
        const result = await fetchLecturerCoursesAPI({
          semester,
          session,
        });

        if (result.success) {
          setCourses(result.courses);
        } else {
          Toast.show({
            type: 'error',
            text1: 'Fetch Error',
            text2: result.message,
          });
        }
      } catch (error) {
        console.error('Lecturer Fetch Error:', error);
        Toast.show({
          type: 'error',
          text1: 'Failed to fetch your assigned courses',
          position: 'bottom',
        });
      } finally {
        setLoading(false);
      }
    },
    [],
  );
  const handlePickDocument = async () => {
    try {
      const res = await DocumentPicker.pickSingle({
        type: [DocumentPicker.types.pdf, DocumentPicker.types.images],
      });
      if (res.uri) {
        await uploadAndExtractCourseFile({
          uri: res.uri,
          type: res.type || 'application/pdf',
          name: res.name || 'document.pdf',
        });
      }
    } catch (err) {
      if (!DocumentPicker.isCancel(err)) console.error(err);
    }
  };
  const handlePickImage = async () => {
    try {
      const image = await ImagePicker.openPicker({
        mediaType: 'photo',
        compressImageQuality: 0.8,
      });
      if (image.path) {
        await uploadAndExtractCourseFile({
          uri: image.path,
          type: image.mime || 'image/jpeg',
          name: image.filename || `gallery_image_${Date.now()}.jpg`,
        });
      }
    } catch (err) {
      console.log('Gallery picker dropped or failed');
    }
  };
  const handleCaptureCamera = async () => {
    try {
      const image = await ImagePicker.openCamera({
        mediaType: 'photo',
        compressImageQuality: 0.8,
      });
      if (image.path) {
        await uploadAndExtractCourseFile({
          uri: image.path,
          type: image.mime || 'image/jpeg',
          name: `camera_snap_${Date.now()}.jpg`,
        });
      }
    } catch (err) {
      console.log('Camera window dismissed');
    }
  };
  const uploadAndExtractCourseFile = async (fileData: {
    uri: string;
    type: string;
    name: string;
  }) => {
    setUploading(true);
    setStatus('Uploading document...');
    setProgress(0);

    try {
      const response = await extractCourseFormAPI(fileData, percent => {
        setProgress(percent);
        if (percent === 1) {
          setStatus('Course extraction in progress...');
        }
      });

      const { message, courses: extractedCourses } = response.data;

      if (extractedCourses && extractedCourses.length > 0) {
        const { semester, session } = extractedCourses[0];
        fetchMyCourses(String(semester), session);
        Toast.show({
          type: 'success',
          text1: message,
          position: 'bottom',
          bottomOffset: 5,
        });
      } else {
        Toast.show({
          type: 'error',
          text1: 'File processed, but no courses were detected. Please retry.',
          position: 'bottom',
          bottomOffset: 5,
        });
      }
    } catch (err) {
      console.error('AI Extraction Pipeline Error:', err);
      Toast.show({
        type: 'error',
        text1: 'Failed to process document, please retry.',
        position: 'bottom',
        bottomOffset: 5,
      });
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };
  const renderDiscover = () => {
    const courseProducts = allProducts.filter(
      product => product.type === 'course',
    );

    return (
      <View style={styles.discoverWrapper}>
        <Text style={[styles.sectionTitleText, { color: colors.textDarker }]}>
          For You
        </Text>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={courseProducts}
          keyExtractor={item => item.productId}
          renderItem={({ item: product }) => (
            <View style={styles.productCardWrapper}>
              <ProductCard
                product={product}
                onPress={() =>
                  navigation.navigate('ProductDetails', {
                    productId: product.productId,
                  })
                }
              />
            </View>
          )}
          ListEmptyComponent={
            <EmptyState
              iconName="production-quantity-limits-outlined"
              title="Courses not Found"
              subtitle="Looks like there's no courses created yet."
            />
          }
        />
      </View>
    );
  };
  const handleManualCourseSubmit = async (newCourseData: {
    courseTitle: string;
    courseCode: string;
    credits: number;
  }) => {
    try {
      const response = await createManualCourseAPI(newCourseData);
      if (response.success) {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: response.message,
        });
        if (typeof fetchMyCourses === 'function') {
          fetchMyCourses();
        }
      } else {
        Toast.show({
          type: 'error',
          text1: 'Manual Entry Failed',
          text2: response.message,
        });
      }
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Failed to record manual tracking entity.',
      });
    }
  };

  useEffect(() => {
    if (!user?.uid || !selectedSession || !selectedSemester) return;

    const performFetch = async () => {
      if (userRole === 'lecturer') {
        await fetchLecturerCourses(selectedSemester, selectedSession);
      } else {
        await fetchMyCourses(selectedSemester, selectedSession);
      }
    };
    performFetch();
  }, [
    selectedSession,
    selectedSemester,
    userRole,
    user?.uid,
    fetchMyCourses,
    fetchLecturerCourses,
    user?.coursesEnrolled,
  ]);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <PageHeader title="iCampus Classroom" showBackButton={false} />
      {isLoading ? (
        <ActivityIndicator
          size="small"
          color={colors.primary}
          style={{ flex: 1 }}
        />
      ) : (
        <>
          {isStudent && (
            <>
              {courses.length === 0 ? (
                <View
                  style={[
                    styles.emptyState,
                    { backgroundColor: colors.backgroundSecondary },
                  ]}
                >
                  <Image
                    source={{
                      uri: 'https://res.cloudinary.com/dbdw3zftx/image/upload/v1773253135/undraw_educator_6dgp_1_xzimrk.png',
                    }}
                    style={styles.illustration}
                  />
                  <Text style={[styles.title, { color: colors.textDarker }]}>
                    Get Started with iCampus
                  </Text>
                  <Text style={[styles.subtitle, { color: colors.text }]}>
                    Let's populate your academic calendar.
                  </Text>
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={[styles.btn, { borderColor: colors.primary }]}
                      onPress={() => setIsAttachmentModalVisible(true)}
                    >
                      <MaterialIcons
                        name="cloud-upload-outlined"
                        size={32}
                        color={colors.primary}
                      />
                      <Text style={[styles.btnText, { color: colors.primary }]}>
                        Upload{'\n'}Form
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.btn, { borderColor: colors.primary }]}
                      onPress={() => setIsManualModalVisible(true)}
                    >
                      <MaterialIcons
                        name="keyboard-alt-outlined"
                        size={32}
                        color={colors.primary}
                      />
                      <Text style={[styles.btnText, { color: colors.primary }]}>
                        Manual{'\n'}Entry
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <>
                  <View style={styles.filterContainer}>
                    <TouchableOpacity
                      style={[
                        styles.selectorButton,
                        { borderColor: colors.primary },
                      ]}
                      onPress={() => setSessionModalVisible(true)}
                    >
                      <View style={styles.selectorTextContainer}>
                        <Text
                          style={[styles.selectorLabel, { color: colors.text }]}
                        >
                          Session
                        </Text>
                        {selectedSession && (
                          <Text
                            style={[
                              styles.selectorValue,
                              { color: colors.primary },
                            ]}
                          >
                            {selectedSession}
                          </Text>
                        )}
                      </View>
                      <MaterialIcons
                        name="arrow-drop-down"
                        size={24}
                        color={colors.textDarker}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.selectorButton,
                        { borderColor: colors.primary },
                      ]}
                      onPress={() => setSemesterModalVisible(true)}
                    >
                      <View style={styles.selectorTextContainer}>
                        <Text
                          style={[styles.selectorLabel, { color: colors.text }]}
                        >
                          Semester
                        </Text>
                        <Text
                          style={[
                            styles.selectorValue,
                            { color: colors.primary },
                          ]}
                        >
                          {selectedSemester || 'All'}
                        </Text>
                      </View>
                      <MaterialIcons
                        name="arrow-drop-down"
                        size={24}
                        color={colors.textDarker}
                      />
                    </TouchableOpacity>
                  </View>
                  <FlatList
                    data={courses}
                    contentContainerStyle={{ paddingBottom: 40 }}
                    keyExtractor={item => item.courseId}
                    renderItem={({ item }) => {
                      return (
                        <CourseSearchCard
                          item={item}
                          navigation={navigation}
                          colors={colors}
                          onPress={() => {
                            setSelectedCourse(item);
                            setModalVisible(true);
                          }}
                        />
                      );
                    }}
                  />
                </>
              )}
            </>
          )}
          {isInstructor && (
            <>
              {courses.length === 0 ? (
                <View
                  style={[
                    styles.emptyState,
                    { backgroundColor: colors.backgroundSecondary },
                  ]}
                >
                  <Image
                    source={{
                      uri: 'https://res.cloudinary.com/dbdw3zftx/image/upload/v1773253135/undraw_educator_6dgp_1_xzimrk.png',
                    }}
                    style={styles.illustration}
                  />
                  <Text style={[styles.title, { color: colors.textDarker }]}>
                    Manage your iCampus courses effortlessly
                  </Text>
                  <Text style={[styles.subtitle, { color: colors.text }]}>
                    Prepare your syllabus and lectures
                  </Text>
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={[styles.btn, { borderColor: colors.primary }]}
                      onPress={() => {}}
                    >
                      <MaterialIcons
                        name="cloud-upload-outlined"
                        size={32}
                        color={colors.primary}
                      />
                      <Text style={[styles.btnText, { color: colors.primary }]}>
                        Create New{'\n'}Course{'\n'}Syllabus
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.btn, { borderColor: colors.primary }]}
                      onPress={() => setIsManualModalVisible(true)}
                    >
                      <MaterialIcons
                        name="keyboard-alt-outlined"
                        size={32}
                        color={colors.primary}
                      />
                      <Text style={[styles.btnText, { color: colors.primary }]}>
                        Manual{'\n'}Entry
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.btn, { borderColor: colors.primary }]}
                      onPress={() =>
                        navigation.navigate('CourseSubPage', {
                          title: 'QuickPublicClass',
                          userRole: user.usertype,
                        })
                      }
                    >
                      <MaterialIcons
                        name="people-outlined"
                        size={32}
                        color={colors.primary}
                      />
                      <Text style={[styles.btnText, { color: colors.primary }]}>
                        Schedule{'\n'}Quick Online{'\n'}Class
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <>
                  <View style={styles.filterContainer}>
                    <TouchableOpacity
                      style={[
                        styles.selectorButton,
                        { borderColor: colors.primary },
                      ]}
                      onPress={() => setSessionModalVisible(true)}
                    >
                      <View style={styles.selectorTextContainer}>
                        <Text
                          style={[styles.selectorLabel, { color: colors.text }]}
                        >
                          Session
                        </Text>
                        {selectedSession && (
                          <Text
                            style={[
                              styles.selectorValue,
                              { color: colors.primary },
                            ]}
                          >
                            {selectedSession}
                          </Text>
                        )}
                      </View>
                      <MaterialIcons
                        name="arrow-drop-down"
                        size={24}
                        color={colors.textDarker}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.selectorButton,
                        { borderColor: colors.primary },
                      ]}
                      onPress={() => setSemesterModalVisible(true)}
                    >
                      <View style={styles.selectorTextContainer}>
                        <Text
                          style={[styles.selectorLabel, { color: colors.text }]}
                        >
                          Semester
                        </Text>
                        <Text
                          style={[
                            styles.selectorValue,
                            { color: colors.primary },
                          ]}
                        >
                          {selectedSemester || 'All'}
                        </Text>
                      </View>
                      <MaterialIcons
                        name="arrow-drop-down"
                        size={24}
                        color={colors.textDarker}
                      />
                    </TouchableOpacity>
                  </View>
                  <FlatList
                    data={courses}
                    contentContainerStyle={{ paddingBottom: 30 }}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => {
                      return (
                        <CourseSearchCard
                          item={item}
                          navigation={navigation}
                          colors={colors}
                          onPress={() => {
                            setSelectedCourse(item);
                            setModalVisible(true);
                          }}
                        />
                      );
                    }}
                  />
                </>
              )}
            </>
          )}
        </>
      )}
      {renderDiscover()}
      {!isFabMenuVisible && (
        <TouchableOpacity
          style={homeStyles.fab}
          onPress={() => setFabMenuVisible(true)}
        >
          <MaterialIcons
            name="widgets-outlined"
            size={28}
            color={colors.btnTextColor}
          />
        </TouchableOpacity>
      )}
      <ExpandableFAB
        isVisible={isFabMenuVisible}
        onClose={toggleFab}
        actions={['iAssistant', 'View Lectures', 'Library']}
        userRole={user.usertype}
      />
      <CourseModal
        isVisible={modalVisible}
        onClose={() => setModalVisible(false)}
        course={selectedCourse!}
        id={user.uid}
        currentUser={user}
        userRole={userRole}
      />
      <UploadProgressModal
        visible={uploading}
        progress={progress}
        statusText={status}
      />
      <AttachmentModal
        isVisible={isAttachmentModalVisible}
        onClose={() => setIsAttachmentModalVisible(false)}
        onPickImage={handlePickImage}
        onPickDocument={handlePickDocument}
        onTakePhoto={handleCaptureCamera}
        colors={colors}
      />
      <ManualCourseModal
        isVisible={isManualModalVisible}
        onClose={() => setIsManualModalVisible(false)}
        onSubmit={handleManualCourseSubmit}
        colors={colors}
      />
      <SelectionModal
        title="Select Session"
        visible={isSessionModalVisible}
        options={SESSIONS}
        selectedValue={selectedSession}
        onSelect={val => setSelectedSession(val)}
        onClose={() => setSessionModalVisible(false)}
        colors={colors}
      />
      <SelectionModal
        title="Select Semester"
        visible={isSemesterModalVisible}
        options={['All', 'First', 'Second']}
        selectedValue={selectedSemester}
        onSelect={val => setSelectedSemester(val)}
        onClose={() => setSemesterModalVisible(false)}
        colors={colors}
      />
    </SafeAreaView>
  );
};
const ClassroomScreenComponent: React.FC<ClassroomProps> = ({ userRole }) => {
  const { colors: themeColors } = useTheme();
  const user = useAppSelector(state => state.user);
  if (!user) {
    return (
      <View
        style={[
          styles.emptyState,
          { backgroundColor: themeColors.backgroundSecondary },
        ]}
      >
        <ActivityIndicator size="large" color={themeColors.primary} />
      </View>
    );
  }
  return <Dashboard user={user} userRole={userRole} />;
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 15 },
  modalContainer: { flex: 1, padding: 15 },
  emptyState: {
    flex: 1,
    alignContent: 'center',
    padding: 20,
    borderRadius: 15,
  },
  illustration: {
    width: 250,
    height: 180,
    marginBottom: 15,
    resizeMode: 'contain',
  },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  subtitle: { fontSize: 14, marginBottom: 15 },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 15,
    width: '100%',
  },
  btn: {
    padding: 10,
    borderRadius: 15,
    width: '30%',
    alignItems: 'center',
    borderWidth: 1,
    elevation: 4,
    shadowColor: PRIMARY_COLOR_TINT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  btnText: {
    fontWeight: '700',
    fontSize: 12,
    marginTop: 6,
    lineHeight: 14,
  },
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
  attendanceBox: { alignItems: 'center' },
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
  typeText: {
    fontSize: 11,
    color: PRIMARY_COLOR,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
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
  discoverWrapper: {
    marginVertical: 15,
  },
  sectionTitleText: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 15,
  },
  productCardWrapper: {
    width: CARD_WIDTH,
    marginBottom: 15,
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
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    marginVertical: 15,
  },
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 15,
    borderWidth: 1,
  },
  selectorTextContainer: {
    alignItems: 'center',
  },
  selectorLabel: {
    fontSize: 14,
  },
  selectorValue: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: 'bold',
  },
});

export default ClassroomScreenComponent;
