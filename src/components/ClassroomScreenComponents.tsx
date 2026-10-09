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
import { generateSessions } from '../utils/courseHelper.ts';
import {
  getCourseExceptions,
  fetchAllLecturesByCourseId,
} from '../api/localGetApis.ts';
import { useTheme } from '../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PRIMARY_COLOR_TINT } from '../assets/styles/colors.ts';
import DropDownPicker from 'react-native-dropdown-picker';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SESSIONS = generateSessions();

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
    semester: string;
    credits: number;
    session: string;
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
      <MaterialIcons name={iconName} size={28} color={themeColors.primary} />
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
  if (!course || !currentUser) {
    return null;
  }
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
      if (!course || !isVisible) return;
      setLoadingExceptions(true);

      try {
        const [exceptionsRes, lecturesRes] = await Promise.all([
          getCourseExceptions({ courseId: course.courseId }),
          fetchAllLecturesByCourseId({ courseId: course.courseId }),
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
                maxHeight: modalHeight,
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
            <View style={styles.modalHeaderInfo}>
              <Text
                style={[styles.modalCourseCode, { color: themeColors.primary }]}
              >
                {course.courseCode || 'COURSE'}
              </Text>
              <Text
                style={[styles.modalCourseTitle, { color: themeColors.text }]}
                numberOfLines={1}
              >
                {course.courseTitle}
              </Text>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollableModalBody}
            >
              {isStudent && (
                <>
                  <View style={styles.dashboardRow}>
                    <View style={styles.statCard}>
                      <ProgressRing percentage={syllabusPercentage} />
                      <View style={styles.statTextContainer}>
                        <Text
                          style={[
                            styles.statLabel,
                            { color: themeColors.text },
                          ]}
                        >
                          Syllabus
                        </Text>
                        <Text
                          style={[
                            styles.statSub,
                            { color: themeColors.primary },
                          ]}
                        >
                          {taughtTopics}/{totalTopics} Covered
                        </Text>
                      </View>
                    </View>
                    <View
                      style={[
                        styles.verticalDivider,
                        { backgroundColor: themeColors.primaryTint + '40' },
                      ]}
                    />
                    <View style={styles.statCard}>
                      <ProgressRing percentage={attendancePercentage} />
                      <View style={styles.statTextContainer}>
                        <Text
                          style={[
                            styles.statLabel,
                            { color: themeColors.text },
                          ]}
                        >
                          Attendance
                        </Text>
                        <Text
                          style={[
                            styles.statSub,
                            { color: themeColors.primary },
                          ]}
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
                      iconName="folder-copy"
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
                      iconName="access-time"
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
                      iconName="pending-actions"
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
                      iconName="verified-user"
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
                      iconName="person-pin"
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
                          style={[
                            styles.statLabel,
                            { color: themeColors.text },
                          ]}
                        >
                          Syllabus
                        </Text>
                        <Text
                          style={[
                            styles.statSub,
                            { color: themeColors.primary },
                          ]}
                        >
                          {taughtTopics}/{totalTopics} Covered
                        </Text>
                      </View>
                    </View>
                    <View
                      style={[
                        styles.verticalDivider,
                        { backgroundColor: themeColors.primaryTint + '40' },
                      ]}
                    />
                    <View style={styles.statCard}>
                      <ProgressRing percentage={participationPercentage} />
                      <View style={styles.statTextContainer}>
                        <Text
                          style={[
                            styles.statLabel,
                            { color: themeColors.text },
                          ]}
                        >
                          Participation
                        </Text>
                        <Text
                          style={[
                            styles.statSub,
                            { color: themeColors.primary },
                          ]}
                        >
                          {lecturesDelivered}/{totalExpectedLectures} Delivered
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.iconGrid}>
                    <GridItem
                      label="Upload Materials"
                      iconName="cloud-upload"
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
                      label="Manage Exceptions"
                      iconName="verified-user"
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
                      iconName="assignment-add"
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
                      label="Lecture Schedule"
                      iconName="access-time"
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
                    {currentUser.institutionTier !== 'free' && (
                      <>
                        <GridItem
                          label="Create A Test"
                          iconName="quiz"
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
                          label="Performance"
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
                      </>
                    )}
                  </View>
                </>
              )}
            </ScrollView>
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
}) => {
  const insets = useSafeAreaInsets();

  return (
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
              {
                backgroundColor: colors.backgroundSecondary,
                paddingBottom: Math.max(insets.bottom, 20),
              },
            ]}
          >
            <View style={styles.sheetIndicator} />
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
                    { borderBottomColor: colors.border + '33' },
                  ]}
                  onPress={() => {
                    onSelect(item);
                    onClose();
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.optionText,
                      {
                        color: isSelected ? colors.primary : colors.text,
                        fontWeight: isSelected ? '600' : '400',
                      },
                    ]}
                  >
                    {item}
                  </Text>
                  {isSelected && (
                    <MaterialIcons
                      name="check-circle"
                      size={20}
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
};
export const ManualCourseModal = ({
  isVisible,
  onClose,
  onSubmit,
  colors,
}: ManualCourseModalProps) => {
  const [courseTitle, setCourseTitle] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [credits, setCredits] = useState('');
  const [openSemester, setOpenSemester] = useState(false);
  const [semester, setSemester] = useState('First');
  const [semesterItems] = useState([
    { label: 'First Semester', value: 'First' },
    { label: 'Second Semester', value: 'Second' },
  ]);
  const [openSession, setOpenSession] = useState(false);
  const [session, setSession] = useState(`${generateSessions()[0]}`);
  const [sessionItems] = useState(
    generateSessions().map(sess => ({ label: sess, value: sess })),
  );

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
        credits: parseInt(credits, 10) || 1,
        semester: semester,
        session: session,
      });
      setCourseTitle('');
      setCourseCode('');
      setCredits('');
      setSession(`${generateSessions()[0]}`);
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
          <View style={[styles.header]}>
            <Text style={[styles.headerTitle, { color: colors.textDarker }]}>
              Add Course Manually
            </Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={24} color={colors.primary} />
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
                name="info-outline"
                size={30}
                color={colors.primary}
                style={{ marginRight: 15 }}
              />
              <View style={{ flex: 1 }}>
                <Text
                  style={[styles.warningTitle, { color: colors.textDarker }]}
                >
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
            <View style={[styles.formGroup, { zIndex: 3000 }]}>
              <Text style={[styles.label, { color: colors.text }]}>
                Academic Session
              </Text>
              <DropDownPicker
                open={openSession}
                value={session}
                items={sessionItems}
                setOpen={setOpenSession}
                setValue={callback => {
                  const val =
                    typeof callback === 'function'
                      ? callback(session)
                      : callback;
                  setSession(val);
                }}
                placeholder="Select session"
                style={[
                  styles.dropdown,
                  {
                    backgroundColor: colors.backgroundSecondary,
                    borderColor: colors.border,
                  },
                ]}
                dropDownContainerStyle={[
                  styles.dropdownContainer,
                  {
                    backgroundColor: colors.backgroundSecondary,
                    borderColor: colors.border,
                  },
                ]}
                textStyle={{ color: colors.text }}
                zIndex={3000}
                zIndexInverse={1000}
              />
            </View>
            <View
              style={[
                styles.formGroup,
                { zIndex: 2000, marginTop: openSession ? 140 : 0 },
              ]}
            >
              <Text style={[styles.label, { color: colors.text }]}>
                Semester
              </Text>
              <DropDownPicker
                open={openSemester}
                value={semester}
                items={semesterItems}
                setOpen={setOpenSemester}
                setValue={callback => {
                  const val =
                    typeof callback === 'function'
                      ? callback(semester)
                      : callback;
                  setSemester(val);
                }}
                placeholder="Select semester"
                style={[
                  styles.dropdown,
                  {
                    backgroundColor: colors.backgroundSecondary,
                    borderColor: colors.border,
                  },
                ]}
                dropDownContainerStyle={[
                  styles.dropdownContainer,
                  {
                    backgroundColor: colors.backgroundSecondary,
                    borderColor: colors.border,
                  },
                ]}
                textStyle={{ color: colors.text }}
                zIndex={2000}
                zIndexInverse={2000}
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
  progressContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  progressText: {
    position: 'absolute',
    fontWeight: 'bold',
    fontSize: 14,
  },
  bottomSheet: {
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 20,
    maxHeight: '40%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
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
  scrollContent: { padding: 20, paddingBottom: 80 },
  warningBox: {
    flexDirection: 'row',
    padding: 15,
    borderRadius: 15,
    borderLeftWidth: 1,
    marginBottom: 23,
  },
  warningTitle: { fontWeight: '700', fontSize: 14, marginBottom: 10 },
  warningText: { fontSize: 12, lineHeight: 20, fontWeight: '500' },
  formGroup: { marginBottom: 20 },
  label: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 15,
    letterSpacing: 0.5,
  },
  input: {
    height: 50,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    fontSize: 14,
    width: '100%',
    backgroundColor: 'transparent',
  },
  submitBtn: {
    width: '100%',
    borderRadius: 10,
    height: 50,
    paddingHorizontal: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  submitBtnText: { fontSize: 14, fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 30,
  },
  modalGrabber: {
    width: 40,
    height: 5,
    borderRadius: 10,
    alignSelf: 'center',
    marginBottom: 12,
  },
  modalHeaderInfo: {
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalCourseCode: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 2,
  },
  modalCourseTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  scrollableModalBody: {
    paddingBottom: 20,
  },
  dashboardRow: {
    flexDirection: 'row',
    marginVertical: 10,
    alignItems: 'center',
    justifyContent: 'space-evenly',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    flexDirection: 'column',
  },
  statTextContainer: {
    marginTop: 8,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  statSub: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  verticalDivider: {
    width: 1,
    height: 50,
    marginHorizontal: 10,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  gridBtn: {
    position: 'relative',
    width: '31%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderRadius: 12,
    padding: 8,
  },
  gridLabel: {
    fontSize: 11,
    marginTop: 6,
    textAlign: 'center',
  },
  notifBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  notifText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  sheetIndicator: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: PRIMARY_COLOR_TINT,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'left',
  },
  sheetOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionText: {
    fontSize: 16,
  },
  dropdown: {
    padding: 9,
    borderRadius: 12,
    borderBottomWidth: 0.8,
  },
  dropdownContainer: {
    borderColor: PRIMARY_COLOR_TINT,
  },
});