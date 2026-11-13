import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  ScrollView,
  TextInput,
  Platform,
  StyleSheet,
  useWindowDimensions,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Svg, Circle } from 'react-native-svg';
import { Course, Lecture, CourseException } from '../types/firebase';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import * as Progress from 'react-native-progress';
import { generateSessions } from '../utils/courseHelper.ts';
import {
  getCourseExceptions,
  fetchAllLecturesByCourseId,
} from '../api/localGetApis.ts';
import { useTheme } from '../context/ThemeContext';
import { PRIMARY_COLOR_TINT } from '../assets/styles/colors.ts';
import DropDownPicker from 'react-native-dropdown-picker';
import { useAppDataContext } from '../context/EventContext';

interface SelectionModalProps {
  visible: boolean;
  options: string[];
  selectedValue: string;
  onSelect: (item: string) => void;
  onClose: () => void;
  title: string;
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
  course: Course;
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
const WIDE_MODAL_BREAKPOINT = 768;

const GridItem = ({ label, iconName, count, onPress }: GridItemProps) => {
  const { colors: themeColors } = useTheme();
  const { width } = useWindowDimensions();
  return (
    <TouchableOpacity
      style={[
        styles.gridBtn,
        width >= WIDE_MODAL_BREAKPOINT && styles.gridBtnWide,
        { borderColor: themeColors.primary },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <MaterialIcons name={iconName} size={28} color={themeColors.primary} />
      <Text style={[styles.gridLabel, { color: themeColors.text }]}>
        {label}
      </Text>
      {count !== undefined && count > 0 && (
        <View
          style={[styles.notifBadge, { backgroundColor: themeColors.btnColor }]}
        >
          <Text style={[styles.notifText, { color: themeColors.btnTextColor }]}>
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
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {}}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.containerModal,
            {
              backgroundColor: themeColors.backgroundSecondary,
              borderColor: themeColors.border,
            },
          ]}
        >
          <View
            style={[
              styles.uploadIconCircle,
              { backgroundColor: themeColors.primary + '1A' },
            ]}
          >
            <MaterialIcons
              name="cloud-upload"
              size={28}
              color={themeColors.primary}
            />
          </View>
          <Text style={[styles.uploadTitle, { color: themeColors.textDarker }]}>
            Adding your courses
          </Text>
          <Progress.Circle
            size={82}
            progress={progress}
            indeterminate={progress === 0 || progress === 1}
            color={themeColors.primary}
            unfilledColor={themeColors.primaryTint}
            borderWidth={0}
            thickness={6}
            showsText={progress > 0 && progress < 1}
            formatText={() => `${Math.round(progress * 100)}%`}
          />
          <Text style={[styles.statusText, { color: themeColors.primary }]}>
            {statusText}
          </Text>
          <Text
            style={[styles.uploadHint, { color: themeColors.text }]}
            numberOfLines={2}
          >
            Keep this screen open while we process your file.
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
// Per-course lectures/exceptions from the last time the modal was opened, so
// reopening a course shows its stats instantly while fresh data loads.
const courseModalCache = new Map<
  string,
  { lectures: Lecture[]; exceptions: CourseException[] }
>();

export const CourseModal = (props: CourseModalProps) =>
  // Hooks live in the body component so a missing course can't change the
  // hook order between renders.
  props.course ? <CourseModalBody {...props} /> : null;

const CourseModalBody = ({ isVisible, onClose, course }: CourseModalProps) => {
  const { colors: themeColors } = useTheme();
  const { currentUser } = useAppDataContext();
  // Tablets / desktop: a centered dialog instead of a full-width bottom sheet.
  const isWide = useWindowDimensions().width >= WIDE_MODAL_BREAKPOINT;
  const id = currentUser?.uid;
  const userRole = currentUser?.usertype;
  const navigation = useNavigation<any>();
  const courseId = course.courseId;
  const cached = courseModalCache.get(courseId);
  const [allExceptions, setAllExceptions] = useState<CourseException[]>(
    cached?.exceptions ?? [],
  );
  const [lectures, setAllLectures] = useState<Lecture[]>(
    cached?.lectures ?? [],
  );
  const [syncing, setSyncing] = useState(!cached);

  useEffect(() => {
    if (!isVisible || !courseId) return;
    let cancelled = false;
    // Switching course: show that course's cached data (or nothing), never
    // the previous course's numbers.
    const hit = courseModalCache.get(courseId);
    setAllLectures(hit?.lectures ?? []);
    setAllExceptions(hit?.exceptions ?? []);
    setSyncing(!hit);

    (async () => {
      try {
        const [exceptionsRes, lecturesRes] = await Promise.all([
          getCourseExceptions({ courseId }),
          fetchAllLecturesByCourseId({ courseId }),
        ]);
        if (cancelled) return;
        const nextExceptions =
          exceptionsRes.success && exceptionsRes.data
            ? exceptionsRes.data
            : (hit?.exceptions ?? []);
        const nextLectures =
          lecturesRes.success && lecturesRes.data
            ? lecturesRes.data
            : (hit?.lectures ?? []);
        courseModalCache.set(courseId, {
          lectures: nextLectures,
          exceptions: nextExceptions,
        });
        setAllExceptions(nextExceptions);
        setAllLectures(nextLectures);
      } catch (error) {
        console.error('Course modal data fetch failed:', error);
      } finally {
        if (!cancelled) setSyncing(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [courseId, isVisible]);

  // Every action closes the sheet and opens a CourseSubPage. Data the modal
  // already holds is handed over so the page renders at once and refreshes
  // in the background instead of starting from a spinner.
  const openSubPage = (title: string, extra: Record<string, any> = {}) => {
    onClose();
    navigation.navigate('CourseSubPage', {
      title,
      course,
      userRole: currentUser?.usertype,
      exceptions: null,
      lectures: null,
      ...extra,
    });
  };
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

  const hasInstructor = lastInstructor !== 'No Instructor Assigned';
  const pendingExceptions = allExceptions.filter(
    (e: any) => e.status === 'pending',
  ).length;

  return (
    <Modal
      visible={isVisible}
      animationType={isWide ? 'fade' : 'slide'}
      transparent
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={[styles.modalOverlay, isWide && styles.modalOverlayCentered]}
        activeOpacity={1}
        onPress={() => {
          onClose();
        }}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={[
            styles.modalContent,
            isWide && styles.modalContentDialog,
            {
              maxHeight: isWide ? '86%' : '75%',
              backgroundColor: themeColors.backgroundSecondary,
            },
          ]}
        >
          {isWide ? (
            <TouchableOpacity
              onPress={onClose}
              style={styles.modalCloseBtn}
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={8}
            >
              <MaterialIcons name="close" size={22} color={themeColors.text} />
            </TouchableOpacity>
          ) : (
            <View
              style={[
                styles.modalGrabber,
                { backgroundColor: themeColors.primaryTint },
              ]}
            />
          )}
          <View style={styles.modalHeaderInfo}>
            <View style={styles.modalCodeRow}>
              <Text
                style={[styles.modalCourseCode, { color: themeColors.primary }]}
              >
                {course.courseCode || 'COURSE'}
              </Text>
              {syncing && (
                <ActivityIndicator size="small" color={themeColors.primary} />
              )}
            </View>
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
                        style={[styles.statLabel, { color: themeColors.text }]}
                      >
                        Syllabus
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
                      { backgroundColor: themeColors.primaryTint + '40' },
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
                    onPress={() => openSubPage('Course Contents')}
                  />
                  <GridItem
                    label="Course Materials"
                    iconName="folder-copy"
                    count={totalMaterials}
                    onPress={() =>
                      openSubPage('Course Materials', { lectures })
                    }
                  />
                  <GridItem
                    label="View Lectures"
                    iconName="access-time"
                    onPress={() => openSubPage('View Lecture Schedule')}
                  />
                  <GridItem
                    label="Assignments"
                    iconName="pending-actions"
                    count={assignmentCount}
                    onPress={() => openSubPage('Assignments')}
                  />
                  <GridItem
                    label="Instructors"
                    iconName="person-pin"
                    count={instructorCount > 1 ? instructorCount : undefined}
                    onPress={() => {
                      if (!hasInstructor) return;
                      onClose();
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
                        Syllabus
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
                      { backgroundColor: themeColors.primaryTint + '40' },
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
                    label="Course Contents"
                    iconName="format-list-bulleted"
                    count={course.courseContents?.length}
                    onPress={() => openSubPage('Course Contents')}
                  />
                  <GridItem
                    label="Create Lecture"
                    iconName="add-box"
                    onPress={() => openSubPage('Set Lecture Schedule')}
                  />
                  <GridItem
                    label="Upload Materials"
                    iconName="cloud-upload"
                    onPress={() =>
                      openSubPage('Course Materials', { lectures })
                    }
                  />
                  <GridItem
                    label="Manage Exceptions"
                    iconName="verified-user"
                    count={pendingExceptions}
                    onPress={() =>
                      openSubPage('Exceptions', {
                        exceptions: allExceptions,
                        lectures,
                      })
                    }
                  />
                  <GridItem
                    label="Add Assignments"
                    iconName="assignment-add"
                    onPress={() => openSubPage('Assignments')}
                  />
                  <GridItem
                    label="Lecture Schedule"
                    iconName="access-time"
                    onPress={() => openSubPage('View Lecture Schedule')}
                  />
                  {currentUser?.institutionTier !== 'basic' && (
                    <>
                      <GridItem
                        label="Create A Test"
                        iconName="quiz"
                        onPress={() => openSubPage('Assessments')}
                      />
                      <GridItem
                        label="Performance"
                        iconName="insights"
                        onPress={() => openSubPage('Grade Accelerator')}
                      />
                    </>
                  )}
                </View>
              </>
            )}
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
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
}) => {
  const { colors } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity style={styles.modalOverlay} onPress={onClose}>
        <TouchableOpacity
          activeOpacity={1}
          style={[
            styles.bottomSheet,
            {
              backgroundColor: colors.backgroundSecondary,
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
        </TouchableOpacity>
      </TouchableOpacity>
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
  const [session, setSession] = useState(`${generateSessions()[5]}`);
  const [sessionItems] = useState(
    generateSessions().map(sess => ({ label: sess, value: sess })),
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  // Tablets / desktop: a centered dialog. A non-transparent full-screen
  // modal covered the whole browser window (WebModal leaves those alone).
  const isWide = useWindowDimensions().width >= WIDE_MODAL_BREAKPOINT;

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
      animationType={isWide ? 'fade' : 'slide'}
      transparent={isWide}
      presentationStyle={isWide ? 'overFullScreen' : 'fullScreen'}
      onRequestClose={onClose}
    >
      <View style={isWide ? styles.manualOverlay : styles.flexFill}>
        <SafeAreaView
          style={[
            styles.modalContainer,
            isWide && styles.manualDialog,
            { backgroundColor: colors.background },
          ]}
        >
          <KeyboardAvoidingView
            style={styles.flexFill}
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
                  { zIndex: 4000, marginTop: openSession ? 140 : 0 },
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
      </View>
    </Modal>
  );
};
const styles = StyleSheet.create({
  modalContainer: { flex: 1, padding: 15 },
  flexFill: { flex: 1 },
  manualOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  manualDialog: {
    flex: 0,
    width: '100%',
    maxWidth: 600,
    height: '90%',
    maxHeight: 820,
    borderRadius: 24,
    overflow: 'hidden',
  },
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
    padding: 25,
    maxHeight: '50%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  containerModal: {
    paddingHorizontal: 24,
    paddingVertical: 26,
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    width: '88%',
    maxWidth: 380,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 12,
  },
  uploadIconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  uploadTitle: { fontSize: 17, fontWeight: '800', marginBottom: 18 },
  statusText: { marginTop: 16, fontSize: 14, fontWeight: '700' },
  uploadHint: {
    marginTop: 7,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
    opacity: 0.75,
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
  modalOverlayCentered: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContentDialog: {
    width: '100%',
    maxWidth: 600,
    borderRadius: 24,
    paddingTop: 20,
    paddingBottom: 20,
  },
  modalCloseBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    zIndex: 2,
    padding: 4,
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
  modalCodeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
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
    // Left-aligned with even side margins (space-between left a hole in the
    // middle of an incomplete last row).
    justifyContent: 'flex-start',
    marginHorizontal: '-1.15%',
    marginTop: 15,
  },
  gridBtnWide: {
    aspectRatio: undefined,
    height: 104,
  },
  gridBtn: {
    position: 'relative',
    width: '31%',
    marginHorizontal: '1.15%',
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
    top: -10,
    left: 6,
    borderRadius: 10,
    minWidth: 23,
    height: 23,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifText: {
    fontSize: 12,
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
