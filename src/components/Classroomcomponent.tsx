import React, { useState, useEffect, useCallback } from 'react';
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
  ScrollView,
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import DocumentPicker from 'react-native-document-picker';
import { Svg, Circle } from 'react-native-svg';
import { Course, User, Lecture, CourseException } from '../types/firebase';
import { useAppSelector } from './hooks';
import { SafeAreaView } from 'react-native-safe-area-context';
import Logo from '../assets/images/Logo.tsx';
import { baseUrl } from 'screens/Profile.tsx';
import Toast from 'react-native-toast-message';
import toastConfig from './ToastConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Gem } from 'lucide-react-native';
import * as Progress from 'react-native-progress';
import axios from 'axios';
const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const PRIMARY_COLOR = '#f54b02';
const PRIMARY_COLOR_TINT = '#fc8350';

// --- Sub-Components ---
interface CourseModalProps {
  isVisible: boolean;
  onClose: () => void;
  id: string;
  course: Course; // Ensure Course is imported from your firebase types
  lectures: Lecture[];
  currentUser: User;
  userRole: 'student' | 'lecturer' | 'otherUser';
}
interface DashboardProps {
  user: User; // Assuming User is your existing type
  userRole: 'student' | 'lecturer' | 'otherUser'; // Add this line!
}
interface ClassroomProps {
  userRole: 'student' | 'lecturer' | 'otherUser';
}
interface SelectionModalProps {
  visible: boolean;
  options: string[];
  onSelect: (item: string) => void;
  onClose: () => void;
  title: string;
  selectedValue?: string; // Added this so you know which one to highlight!
}
interface UploadProgressModalProps {
  visible: boolean;
  progress: number; // 0 to 1
  statusText: string;
}
interface GridItemProps {
  label: string;
  iconName: string; // Changed from 'icon' (emoji) to 'iconName' (MCI)
  count?: number;
  onPress?: () => void; // Added click handler
}
const GridItem = ({ label, iconName, count, onPress }: GridItemProps) => {
  const capitalize = (str: string = '') => {
    return str
      .toLowerCase()
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };
  return (
    <TouchableOpacity
      style={styles.gridBtn}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.iconCircle}>
        <Icon name={iconName} size={26} color={PRIMARY_COLOR_TINT} />

        {count !== undefined && count > 0 && (
          <View style={styles.notifBadge}>
            <Text style={styles.notifText}>{count}</Text>
          </View>
        )}
      </View>
      {/* Using your capitalize logic here too */}
      <Text style={styles.gridLabel}>{capitalize(label)}</Text>
    </TouchableOpacity>
  );
};
const UploadProgressModal = ({
  visible,
  progress,
  statusText,
}: UploadProgressModalProps) => (
  <Modal visible={visible} transparent animationType="fade">
    <View style={styles.overlay}>
      <View style={styles.containerModal}>
        <Progress.Circle
          size={80}
          progress={progress}
          indeterminate={progress === 0 || progress === 1}
          color={PRIMARY_COLOR}
          borderWidth={2}
          thickness={4}
          showsText={progress > 0 && progress < 1}
          formatText={() => `${Math.round(progress * 100)}%`}
        />
        <Text style={styles.statusText}>{statusText}</Text>
      </View>
    </View>
  </Modal>
);
const ProgressRing = ({ percentage }: { percentage: number }) => {
  const radius = 40;
  const stroke = 8;
  const normalizedRadius = radius - stroke; // Adjusted slightly for better fit
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <View style={styles.progressContainer}>
      <Svg
        height={radius * 2}
        width={radius * 2}
        viewBox={`0 0 ${radius * 2} ${radius * 2}`}
      >
        {/* Track Circle */}
        <Circle
          stroke="#F0F0F0"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        {/* Active Progress Circle */}
        <Circle
          stroke={PRIMARY_COLOR}
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
      <Text style={styles.progressText}>{Math.round(percentage)}%</Text>
    </View>
  );
};
const generateSessions = () => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-11

  // If we are in or after September (Month 8), the current session is 2023/2024
  // Otherwise, we are still in the 2022/2023 session.
  const academicYear = currentMonth >= 8 ? currentYear : currentYear - 1;

  return [
    'All',
    `${academicYear - 1}/${academicYear}`, // Preceding
    `${academicYear}/${academicYear + 1}`, // Default/Current
    `${academicYear + 1}/${academicYear + 2}`, // Upcoming
  ];
};
const renderStars = (rating: number | string | undefined) => {
  const numericRating = Math.round(Number(rating || 0));
  const stars = [];

  for (let i = 1; i <= 5; i++) {
    stars.push(
      <Text
        key={i}
        style={[
          styles.starIcon,
          i <= numericRating ? styles.starFilled : styles.starEmpty,
        ]}
      >
        ★
      </Text>,
    );
  }
  return stars;
};
const SESSIONS = generateSessions();
const ForYouCard = ({ course }: { course: Course }) => {
  const isFree = course.price === 0;

  // --- ADD THIS LINE HERE ---
  const showRating = !!course.rating || (course.totalReviews ?? 0) > 0;

  return (
    <TouchableOpacity style={styles.forYouCard}>
      <View>
        <Image
          source={{
            uri: course.thumbnailUrl || 'https://via.placeholder.com/150',
          }}
          style={styles.forYouImage}
        />
        {/* Only show duration badge if it exists */}
        {course.courseDuration && (
          <View style={styles.durationBadge}>
            <Text style={styles.durationText}>{course.courseDuration}</Text>
          </View>
        )}
      </View>

      <View style={styles.forYouInfo}>
        <Text style={styles.forYouTitle} numberOfLines={2}>
          {course.courseTitle}
        </Text>
        {course.department && (
          <Text style={styles.forYouCategory}>{course.department}</Text>
        )}

        {/* Conditional Instructor Name */}
        {course.instructorName ? (
          <Text style={styles.instructorName}>{course.instructorName}</Text>
        ) : null}

        {/* Only show Rating Row if there is a rating or reviews */}
        {showRating && (
          <View style={styles.ratingRow}>
            <View style={styles.starsContainer}>
              {renderStars(course.rating)}
            </View>
            {course.totalReviews !== undefined && course.totalReviews > 0 && (
              <Text style={styles.reviewText}>({course.totalReviews})</Text>
            )}
          </View>
        )}

        <View style={styles.priceContainer}>
          {!isFree && (
            <>
              {/* The Gem icon for iCash */}
              <Gem
                size={16}
                color={PRIMARY_COLOR} // A vibrant cyan/aqua border
                fill={PRIMARY_COLOR} // Filling it makes it look like a physical currency
                strokeWidth={2.5}
              />
              <Text style={styles.priceText}>
                {course.price?.toLocaleString()}
              </Text>
            </>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};
const getExceptionLimit = (plan: string) => {
  switch (plan) {
    case 'premium':
      return 8;
    case 'pro':
      return 5;
    default:
      return 3; // free trial
  }
};
const getStatusConfig = (status: Lecture['status']) => {
  switch (status) {
    case 'completed':
      return { name: 'check-circle', color: '#f54b02' };
    case 'ongoing':
      return { name: 'play-circle', color: '#f54b02' };
    case 'scheduled':
      return { name: 'clock-outline', color: '#f54b02' };
    case 'cancelled':
      return { name: 'close-circle', color: '#f54b02' };
    case 'postponed':
      return { name: 'calendar-clock', color: '#f54b02' };
    default:
      return { name: 'help-circle', color: '#f54b02' };
  }
};
const CourseModal = ({
  isVisible,
  onClose,
  course,
  lectures,
  id,
  currentUser,
  userRole,
}: CourseModalProps) => {
  const [allExceptions, setAllExceptions] = useState<CourseException[]>([]);
  const [loadingExceptions, setLoadingExceptions] = useState(false);
  useEffect(() => {
    const fetchExceptions = async () => {
      if (!course.courseId || !isVisible) return;

      setLoadingExceptions(true);
      try {
        const token = await AsyncStorage.getItem('accessToken');
        const response = await fetch(
          `${baseUrl}exceptions/course/${course.courseId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        const data = await response.json();
        setAllExceptions(data);
      } catch (error) {
        console.error('Error fetching exceptions:', error);
      } finally {
        setLoadingExceptions(false);
      }
    };
    fetchExceptions();
  }, [course.courseId, isVisible]);
  // 1. Syllabus Progress (Instructor side)
  if (!course) return null;
  const isLecturer = userRole === 'lecturer';
  const isStudent = userRole === 'student';
  const totalTopics = course.courseContents?.length || 0;
  const taughtTopics = new Set(
    lectures.filter(l => l.isTaught).map(l => l.topicName.toLowerCase()),
  ).size;
  const syllabusPercentage =
    totalTopics > 0 ? (taughtTopics / totalTopics) * 100 : 0;

  // 2. User Attendance (Student side)
  const lecturesHeld = lectures.filter(l => l.isTaught).length;
  const lecturesAttended = lectures.filter(l =>
    l.attendance?.includes(id),
  ).length;
  const attendancePercentage =
    lecturesHeld > 0 ? (lecturesAttended / lecturesHeld) * 100 : 0;
  // 3. Materials
  const totalMaterials =
    (course.resources?.length || 0) +
    lectures.reduce(
      (acc, lecture) => acc + (lecture.resources?.length || 0),
      0,
    );
  // 4. Assignments
  const assignmentCount = course.assignments?.length || 0;
  // 5. Exceptions: Business Logic (Max 3 per month)
  const userPlan = currentUser.plan || 'free';
  const limit = getExceptionLimit(userPlan);
  const usedThisMonth = allExceptions.filter(
    ex =>
      ex.studentId === currentUser.uid &&
      new Date(ex.date).getMonth() === new Date().getMonth() &&
      ex.status !== 'rejected',
  ).length;
  const remaining = Math.max(0, limit - usedThisMonth);
  // 6. Instructors count
  const instructorCount = course.lecturerIds?.length || 0;
  // LECTURER LOGIC: Participation / Coverage
  const lecturesDelivered = lectures.filter(l => l.isTaught).length;
  const totalExpectedLectures = course.courseContents?.length || 0;

  // Calculate percentage based on syllabus coverage
  const participationPercentage =
    totalExpectedLectures > 0
      ? (lecturesDelivered / totalExpectedLectures) * 100
      : 0;

  const pendingExceptionsCount = allExceptions.filter(
    ex => ex.status === 'pending',
  ).length;

  return (
    <Modal visible={isVisible} animationType="slide" transparent>
      {/* 1. This Pressable handles the "click outside" to close */}
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        {/* 2. TouchableWithoutFeedback prevents closing when clicking INSIDE the content */}
        <TouchableOpacity activeOpacity={1} onPress={e => e.stopPropagation()}>
          <View style={styles.modalContent}>
            {/* Grabber handle (Visual hint that user can swipe down or tap away) */}
            <View style={styles.modalGrabber} />
            {isStudent && (
              <>
                <View style={styles.dashboardRow}>
                  {/* Syllabus Widget */}
                  <View style={styles.statCard}>
                    <ProgressRing percentage={syllabusPercentage} />
                    <View style={styles.statTextContainer}>
                      <Text style={styles.statLabel}>Syllables</Text>
                      <Text style={styles.statSub}>
                        {taughtTopics}/{totalTopics} Covered
                      </Text>
                    </View>
                  </View>
                  <View style={styles.verticalDivider} />
                  {/* Attendance Widget */}
                  <View style={styles.statCard}>
                    <ProgressRing percentage={attendancePercentage} />
                    <View style={styles.statTextContainer}>
                      <Text style={styles.statLabel}>Attendance</Text>
                      <Text style={styles.statSub}>
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
                    onPress={() => {}}
                  />
                  <GridItem
                    label="Course Materials"
                    iconName="folder-outline"
                    count={totalMaterials}
                    onPress={() => {}}
                  />
                  <GridItem
                    label="Assignments"
                    iconName="clipboard-edit-outline"
                    count={assignmentCount}
                    onPress={() => {}}
                  />
                  <GridItem
                    label="Exceptions"
                    iconName="shield-alert-outline"
                    count={remaining}
                    onPress={() => {
                      if (remaining <= 0) {
                        console.log(
                          'Free trial limit reached! Upgrade for more exceptions.',
                        );
                      }
                    }}
                  />
                  <GridItem
                    label="Instructors"
                    iconName="account-tie"
                    count={instructorCount > 1 ? instructorCount : undefined}
                    onPress={() => {}}
                  />
                </View>

                <View style={styles.historyHeader}>
                  <Text style={styles.sectionTitle}>Lecture History</Text>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      Total: {lectures.length}
                    </Text>
                  </View>
                </View>
              </>
            )}
            {isLecturer && (
              <>
                <View style={styles.dashboardRow}>
                  {/* Syllabus Widget */}
                  <View style={styles.statCard}>
                    <ProgressRing percentage={syllabusPercentage} />
                    <View style={styles.statTextContainer}>
                      <Text style={styles.statLabel}>Syllables</Text>
                      <Text style={styles.statSub}>
                        {taughtTopics}/{totalTopics} Covered
                      </Text>
                    </View>
                  </View>
                  <View style={styles.verticalDivider} />
                  {/* Attendance Widget */}
                  <View style={styles.statCard}>
                    <ProgressRing percentage={participationPercentage} />
                    <View style={styles.statTextContainer}>
                      <Text style={styles.statLabel}>Participation</Text>
                      <Text style={styles.statSub}>
                        {lecturesDelivered}/{totalExpectedLectures} Delivered
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.iconGrid}>
                  <GridItem
                    label="Upload Course Materials"
                    iconName="cloud-upload-outline"
                    onPress={() => {
                      /* Open Material Upload Logic */
                    }}
                  />
                  <GridItem
                    label="Manage Exceptions"
                    iconName="shield-check-outline"
                    count={
                      loadingExceptions
                        ? undefined
                        : userRole === 'lecturer'
                        ? pendingExceptionsCount
                        : remaining
                    }
                    onPress={() => {
                      if (loadingExceptions) return; // Prevent clicks while loading
                      // ... navigation logic
                    }}
                  />
                  <GridItem
                    label="Add Assignments"
                    iconName="file-tray-plus-outline"
                    onPress={() => {
                      /* Open Assignment Creation Modal */
                    }}
                  />
                  <GridItem
                    label="Manage Lectures Schedule"
                    iconName="calendar-clock-outline"
                    onPress={() => {
                      /* Open Scheduling Tool */
                    }}
                  />
                  <GridItem
                    label="Create A Test"
                    iconName="pencil-box-multiple-outline"
                    onPress={() => {
                      /* Open Quiz Builder */
                    }}
                  />
                </View>

                <View style={styles.historyHeader}>
                  <Text style={styles.sectionTitle}>Lecture History</Text>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      Total: {lectures.length}
                    </Text>
                  </View>
                </View>
              </>
            )}

            <FlatList
              data={lectures}
              keyExtractor={item => item.id} // Use the actual ID instead of index for better performance
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const statusConfig = getStatusConfig(item.status);
                const isOnline = item.lectureType === 'Online';
                return (
                  <View style={styles.lectureItem}>
                    {/* Dynamic Status Icon */}
                    <View style={styles.statusIconContainer}>
                      <Icon
                        name={statusConfig.name}
                        size={22}
                        color={statusConfig.color}
                      />
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      {/* Dynamic Topic Name */}
                      <Text style={styles.topicText}>
                        {item.topicName || 'No Topic Assigned'}
                      </Text>
                      <View
                        style={[
                          styles.venueBadge,
                          isOnline ? styles.onlineBadge : styles.physicalBadge,
                        ]}
                      >
                        <Text
                          style={[
                            styles.venueText,
                            { color: isOnline ? '#fff' : '#222' },
                          ]}
                        >
                          {isOnline ? 'Online Session' : ` ${item.location}`}
                        </Text>
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.statusBadge}>{item.status}</Text>
                      <Text style={styles.timeText}>
                        {item.startTime} - {item.endTime}
                      </Text>
                    </View>
                  </View>
                );
              }}
            />
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};
export const fetchCoursesFromDB = async (
  courseIds: string[],
): Promise<Course[]> => {
  if (!courseIds || courseIds.length === 0) return [];

  try {
    const token = await AsyncStorage.getItem('accessToken');
    const response = await fetch(`${baseUrl}courses/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ ids: courseIds }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      console.log(errorData.message || 'Failed to fetch courses');
    }

    const data = await response.json();
    return data as Course[];
  } catch (error) {
    console.error('Fetch error:', error);
    return []; // Return empty array so the UI doesn't crash
  }
};
const SelectionModal: React.FC<SelectionModalProps> = ({
  visible,
  options,
  onSelect,
  onClose,
  title,
}) => (
  <Modal visible={visible} transparent animationType="slide">
    <TouchableOpacity style={styles.modalOverlay} onPress={onClose}>
      <View style={styles.bottomSheet}>
        <Text style={styles.sheetTitle}>{title}</Text>
        {options.map(item => (
          <TouchableOpacity
            key={item}
            style={styles.sheetOption}
            onPress={() => {
              onSelect(item);
              onClose();
            }}
          >
            <Text style={styles.optionText}>{item}</Text>
            {/* Show a checkmark if selected */}
            <Icon name="check-circle" size={20} color={PRIMARY_COLOR} />
          </TouchableOpacity>
        ))}
      </View>
    </TouchableOpacity>
  </Modal>
);

// --- Main Dashboard ---

const Dashboard: React.FC<DashboardProps> = ({ user, userRole }) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [suggestedCourses, setSuggestedCourses] = useState<Course[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setLoading] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const isStudent = userRole === 'student';
  const isInstructor = userRole === 'lecturer';
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('First'); // Default or 'All'
  const [selectedSession, setSelectedSession] = useState(SESSIONS[2]);
  const [isSessionModalVisible, setSessionModalVisible] = useState(false);
  const [isSemesterModalVisible, setSemesterModalVisible] = useState(false);
  const fetchMyCourses = useCallback(
    async (semester: string, session: string) => {
      setLoading(true);
      try {
        const token = await AsyncStorage.getItem('accessToken');

        let url = `${baseUrl}courses?studentId=${user.uid}`;
        if (semester !== 'All') url += `&semester=${semester}`;
        if (session !== 'All') url += `&session=${session}`;

        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        const data = await response.json();
        setCourses(data);
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
    [user.uid],
  );
  const fetchLecturerCourses = useCallback(
    async (semester: string, session: string) => {
      setLoading(true);
      try {
        const token = await AsyncStorage.getItem('accessToken');

        // We pass the lecturer's UID to find courses where they are listed in lecturerIds
        let url = `${baseUrl}courses/lecturer-view?lecturerId=${user.uid}`;

        if (semester !== 'All') url += `&semester=${semester}`;
        if (session !== 'All') url += `&session=${session}`;

        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        const data = await response.json();
        setCourses(data);
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
    [user.uid],
  );

  const handleAIPopulate = async () => {
    try {
      const res = await DocumentPicker.pickSingle({
        type: [DocumentPicker.types.pdf, DocumentPicker.types.images],
      });

      setUploading(true);
      setStatus('Uploading document...');
      setProgress(0);

      const formData = new FormData();
      // @ts-ignore (Formdata types in RN can be finicky)
      formData.append('file', { uri: res.uri, type: res.type, name: res.name });

      const token = await AsyncStorage.getItem('accessToken');

      const response = await axios.post(
        `${baseUrl}ai/extract-course`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`,
          },
          onUploadProgress: progressEvent => {
            const percentCompleted =
              progressEvent.loaded / (progressEvent.total || 1);
            setProgress(percentCompleted);
            if (percentCompleted === 1) {
              setStatus('Course extraction in progress...');
            }
          },
        },
      );
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
          text1: 'File processed, but no courses were detected. please retry.',
          position: 'bottom',
          bottomOffset: 5,
        });
      }
    } catch (err) {
      if (!DocumentPicker.isCancel(err)) {
        Toast.show({
          type: 'error',
          text1: 'Failed to process document, please retry.',
          position: 'bottom',
          bottomOffset: 5,
        });
      }
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const renderHeader = () => {
    const formatUserType = (type: string) => {
      if (!type) return '';
      return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
    };
    const isOtherUser = user.usertype === 'otherUser';
    return (
      <View style={styles.header}>
        <View style={styles.userInfoRow}>
          <TouchableOpacity
            onPress={() => {
              /* Navigate to Profile */
            }}
          >
            <Image
              source={{
                uri: user.profilePic?.[0] || 'https://via.placeholder.com/100',
              }}
              style={styles.profileFrame}
            />
          </TouchableOpacity>
          <Logo />
          {!isOtherUser && (
            <>
              <Text style={styles.userTypeText}>
                {formatUserType(user.usertype || 'Student')}
              </Text>
            </>
          )}
        </View>
        {/* Search Bar */}
        <View style={styles.searchBar}>
          <MaterialIcons
            name="search"
            size={20}
            color="#838181"
            style={styles.searchBarIcon}
          />
          <TextInput
            placeholder="Search for courses..."
            value={search}
            onChangeText={setSearch}
            style={styles.searchInput}
          />
        </View>
      </View>
    );
  };
  // --- Inside your Dashboard Component ---
  const renderForYou = () => (
    <View>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>For you</Text>
        <TouchableOpacity>
          <Text style={{ color: PRIMARY_COLOR }}>See all</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingLeft: 20, paddingBottom: 20 }}
      >
        {suggestedCourses.map(item => (
          <ForYouCard key={item.id} course={item} />
        ))}
      </ScrollView>

      <View style={[styles.sectionHeader, { marginTop: 10 }]}>
        <Text style={styles.sectionTitle}>My Courses</Text>
      </View>
    </View>
  );

  const displayedCourses = courses.filter(course => {
    // 1. Check Search Query (Title, Code, or Instructor)
    const query = search.toLowerCase().trim();
    const matchesSearch =
      course.courseTitle?.toLowerCase().includes(query) ||
      course.courseCode?.toLowerCase().includes(query) ||
      course.instructorName?.toLowerCase().includes(query);

    // 2. Check Session Filter
    const matchesSession =
      selectedSession === 'All' || course.session === selectedSession;

    // 3. Check Semester Filter
    const matchesSemester =
      selectedSemester === 'All' || course.semester === selectedSemester;

    // ONLY return true if ALL conditions are met
    return matchesSearch && matchesSession && matchesSemester;
  });
  useEffect(() => {
    if (!user?.uid || !selectedSession || !selectedSemester) return;

    const performFetch = async () => {
      if (userRole === 'lecturer') {
        await fetchLecturerCourses(selectedSemester, selectedSession);
      } else {
        const enrolledIds = user?.coursesEnrolled || [];
        if (enrolledIds.length === 0) {
          setCourses([]);
          setLoading(false);
          return;
        }
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
  useEffect(() => {
    const fetchDiscoverCourses = async () => {
      try {
        const response = await fetch(`${baseUrl}courses/discover`);
        const data = await response.json();
        setSuggestedCourses(data);
      } catch (error) {
        console.error('Error loading marketplace:', error);
      }
    };

    fetchDiscoverCourses();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      {isLoading ? (
        <ActivityIndicator
          size="large"
          color={PRIMARY_COLOR}
          style={{ flex: 1 }}
        />
      ) : (
        <>
          {isStudent && (
            <>
              {courses.length > 0 && (
                <>
                  <SelectionModal
                    title="Select Session"
                    visible={isSessionModalVisible}
                    options={SESSIONS}
                    onSelect={val => setSelectedSession(val)}
                    onClose={() => setSessionModalVisible(false)}
                  />
                  <SelectionModal
                    title="Select Semester"
                    visible={isSemesterModalVisible}
                    options={['All', 'First', 'Second']}
                    onSelect={val => setSelectedSemester(val)}
                    onClose={() => setSemesterModalVisible(false)}
                  />
                </>
              )}

              {/* 2. Check if the course list is empty */}
              {courses.length === 0 ? (
                <View style={styles.emptyState}>
                  <Image
                    source={{
                      uri: 'https://res.cloudinary.com/dbdw3zftx/image/upload/v1773253135/undraw_educator_6dgp_1_xzimrk.png',
                    }}
                    style={styles.illustration}
                  />
                  <Text style={styles.title}>Get Started with iCampus</Text>
                  <Text style={styles.subtitle}>
                    Let's populate your academic calendar.
                  </Text>
                  <View style={styles.actionRow}>
                    {/* 1. Course Upload */}
                    <TouchableOpacity
                      style={styles.btn}
                      onPress={handleAIPopulate}
                    >
                      <MaterialIcons
                        name="cloud-upload"
                        size={32}
                        color="#fff"
                      />
                      <Text style={styles.btnText}>Upload{'\n'}Form</Text>
                    </TouchableOpacity>
                    {/* 2. Manual Entry */}
                    <TouchableOpacity style={styles.btn} onPress={() => {}}>
                      <MaterialIcons name="keyboard" size={32} color="#fff" />
                      <Text style={styles.btnText}>Manual{'\n'}Entry</Text>
                    </TouchableOpacity>
                    {/* 3. Meet Instructor */}
                    <TouchableOpacity style={styles.btn} onPress={() => {}}>
                      <MaterialIcons
                        name="people-outline"
                        size={32}
                        color="#fff"
                      />
                      <Text style={styles.btnText}>Meet{'\n'}Instructors</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <FlatList
                  data={displayedCourses}
                  contentContainerStyle={{ padding: 20, paddingBottom: 100 }} // Extra space at bottom
                  keyExtractor={item => item.id}
                  renderItem={({ item }) => {
                    const capitalize = (str: string = '') => {
                      return str
                        .toLowerCase()
                        .trim()
                        .split(' ')
                        .map(
                          word => word.charAt(0).toUpperCase() + word.slice(1),
                        )
                        .join(' ');
                    };

                    return (
                      <TouchableOpacity
                        onPress={() => {
                          setSelectedCourse(item);
                          setModalVisible(true);
                        }}
                        style={styles.courseCard}
                      >
                        {/* Top Section: Title and Units */}
                        <View style={styles.cardHeader}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.cardTitle}>
                              {capitalize(item.courseTitle)}
                            </Text>
                            <Text style={styles.cardCode}>
                              {item.courseCode?.toUpperCase()}
                            </Text>
                          </View>
                          <View style={styles.creditBadge}>
                            <Text style={styles.creditText}>
                              {item.credits || 0} Units
                            </Text>
                          </View>
                        </View>

                        {/* Divider */}
                        <View style={styles.cardDivider} />

                        {/* Bottom Section: Metadata */}
                        <View style={styles.cardFooter}>
                          <View style={styles.metaInfo}>
                            <Icon
                              name="human-male-board"
                              size={23}
                              color="#fff"
                            />
                            <Text style={styles.metaText}>
                              {capitalize(
                                item.instructorName || 'Not Asigned...',
                              )}
                            </Text>
                          </View>

                          <View style={styles.metaInfo}>
                            <MaterialIcons
                              name="people-outline"
                              size={23}
                              color="#fff"
                            />
                            <Text style={styles.metaText}>
                              {item.studentsEnrolled?.length || 0} participants
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  }}
                />
              )}

              {/* 3. Modal remains accessible within the student view */}
              <CourseModal
                isVisible={modalVisible}
                onClose={() => setModalVisible(false)}
                course={selectedCourse!}
                lectures={[]} // Fetch these based on selectedCourse.id
                id={user.uid}
                currentUser={user}
                userRole={userRole}
              />
              <UploadProgressModal
                visible={uploading}
                progress={progress}
                statusText={status}
              />
            </>
          )}
          {isInstructor && (
            <>
              {courses.length > 0 && (
                <>
                  <SelectionModal
                    title="Select Session"
                    visible={isSessionModalVisible}
                    options={SESSIONS}
                    onSelect={val => setSelectedSession(val)}
                    onClose={() => setSessionModalVisible(false)}
                  />
                  <SelectionModal
                    title="Select Semester"
                    visible={isSemesterModalVisible}
                    options={['All', 'First', 'Second']}
                    onSelect={val => setSelectedSemester(val)}
                    onClose={() => setSemesterModalVisible(false)}
                  />
                </>
              )}

              {/* 2. Check if the course list is empty */}
              {courses.length === 0 ? (
                <View style={styles.emptyState}>
                  <Image
                    source={{
                      uri: 'https://res.cloudinary.com/dbdw3zftx/image/upload/v1773253135/undraw_educator_6dgp_1_xzimrk.png',
                    }}
                    style={styles.illustration}
                  />
                  <Text style={styles.title}>
                    Manage your iCampus courses effortlessly
                  </Text>
                  <Text style={styles.subtitle}>
                    Prepare your syllabus and lectures
                  </Text>
                  <View style={styles.actionRow}>
                    {/* 1. Course Upload */}
                    <TouchableOpacity style={styles.btn} onPress={() => {}}>
                      <MaterialIcons
                        name="cloud-upload"
                        size={32}
                        color="#fff"
                      />
                      <Text style={styles.btnText}>
                        Create New{'\n'}Course{'\n'}Syllabus
                      </Text>
                    </TouchableOpacity>
                    {/* 2. Manual Entry */}
                    <TouchableOpacity style={styles.btn} onPress={() => {}}>
                      <MaterialIcons name="keyboard" size={32} color="#fff" />
                      <Text style={styles.btnText}>
                        Assign{'\n'}Grades &{'\n'}Feedback
                      </Text>
                    </TouchableOpacity>
                    {/* 3. Meet Instructor */}
                    <TouchableOpacity style={styles.btn} onPress={() => {}}>
                      <MaterialIcons
                        name="people-outline"
                        size={32}
                        color="#fff"
                      />
                      <Text style={styles.btnText}>
                        Monitor{'\n'}Class{'\n'}Performance
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <FlatList
                  data={displayedCourses}
                  contentContainerStyle={{ padding: 20, paddingBottom: 100 }} // Extra space at bottom
                  keyExtractor={item => item.id}
                  renderItem={({ item }) => {
                    const capitalize = (str: string = '') => {
                      return str
                        .toLowerCase()
                        .trim()
                        .split(' ')
                        .map(
                          word => word.charAt(0).toUpperCase() + word.slice(1),
                        )
                        .join(' ');
                    };

                    return (
                      <TouchableOpacity
                        onPress={() => {
                          setSelectedCourse(item);
                          setModalVisible(true);
                        }}
                        style={styles.courseCard}
                      >
                        {/* Top Section: Title and Units */}
                        <View style={styles.cardHeader}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.cardTitle}>
                              {capitalize(item.courseTitle)}
                            </Text>
                            <Text style={styles.cardCode}>
                              {item.courseCode?.toUpperCase()}
                            </Text>
                          </View>
                          <View style={styles.creditBadge}>
                            <Text style={styles.creditText}>
                              {item.credits || 0} Units
                            </Text>
                          </View>
                        </View>

                        {/* Divider */}
                        <View style={styles.cardDivider} />

                        {/* Bottom Section: Metadata */}
                        <View style={styles.cardFooter}>
                          <View style={styles.metaInfo}>
                            <Icon
                              name="human-male-board"
                              size={23}
                              color="#fff"
                            />
                            <Text style={styles.metaText}>
                              {capitalize(
                                item.instructorName || 'Not Asigned...',
                              )}
                            </Text>
                          </View>

                          <View style={styles.metaInfo}>
                            <MaterialIcons
                              name="people-outline"
                              size={23}
                              color="#fff"
                            />
                            <Text style={styles.metaText}>
                              {item.studentsEnrolled?.length || 0} participants
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  }}
                />
              )}

              {/* 3. Modal remains accessible within the student view */}
              <CourseModal
                isVisible={modalVisible}
                onClose={() => setModalVisible(false)}
                course={selectedCourse!}
                lectures={[]} // Fetch these based on selectedCourse.id
                id={user.uid}
                currentUser={user}
                userRole={userRole}
              />
              <UploadProgressModal
                visible={uploading}
                progress={progress}
                statusText={status}
              />
            </>
          )}
        </>
      )}
      {renderForYou()}
      <Toast config={toastConfig} />
    </SafeAreaView>
  );
};
const ClassroomScreenComponent: React.FC<ClassroomProps> = ({ userRole }) => {
  const user = useAppSelector(state => state.user);
  if (!user) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#f54b02" />
      </View>
    );
  }
  // Passing userRole here clears the "unused variable" error
  return <Dashboard user={user} userRole={userRole} />;
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fdfdfd' },
  header: {
    paddingTop: 10,
    paddingBottom: 15,
    backgroundColor: '#fee3d6',
    borderBottomWidth: 1,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    alignItems: 'center',
  },
  userInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    marginBottom: 15,
    width: '100%',
  },
  userType: { fontSize: 12, color: '#888' },
  searchBar: {
    flexDirection: 'row',
    borderRadius: 15,
    marginHorizontal: 20,
    paddingHorizontal: 15,
    height: 50,
    alignItems: 'center',
    width: '75%',
  },
  searchBarIcon: {
    marginRight: 8,
  },
  searchInput: { height: 45, flex: 1 },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  illustration: {
    width: 250,
    height: 180,
    marginBottom: 15,
    resizeMode: 'contain',
  },
  title: { fontSize: 24, fontWeight: 'bold', color: PRIMARY_COLOR },
  subtitle: { fontSize: 14, color: '#666', marginTop: 10 },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    width: '100%',
    paddingHorizontal: 20, // Add padding to the container
  },
  btn: {
    padding: 10,
    borderRadius: 16,
    width: '31%', // Slightly wider
    height: 100, // Your new height
    backgroundColor: PRIMARY_COLOR_TINT,
    alignItems: 'center',
    justifyContent: 'center', // Centers icon and text vertically
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  btnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 11, // Smaller font allows for 2 lines
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 14,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    height: SCREEN_HEIGHT * 0.85,
    padding: 25,
    paddingTop: 15, // Reduced to make room for grabber
  },
  attendanceBox: { alignItems: 'center' },
  progressContainer: { alignItems: 'center', justifyContent: 'center' },
  progressText: {
    position: 'absolute',
    fontWeight: 'bold',
    color: PRIMARY_COLOR,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#222',
  },
  statSub: { fontSize: 10, color: '#222', letterSpacing: 1, fontWeight: 700 },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  gridBtn: { width: '30%', alignItems: 'center', marginBottom: 15 },
  iconCircle: {
    width: 65,
    height: 65,
    backgroundColor: '#F9F9F9',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
  },
  gridLabel: { fontSize: 12, color: '#222', marginTop: 8, fontWeight: '500' },
  notifBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: PRIMARY_COLOR_TINT,
    borderRadius: 12,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  badge: {
    backgroundColor: '#FFF0EA',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  badgeText: { color: PRIMARY_COLOR, fontSize: 12, fontWeight: 'bold' },
  lectureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  topicText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222',
  },
  venueText: {
    fontSize: 11,
    fontWeight: '600',
  },
  typeText: {
    fontSize: 11,
    color: PRIMARY_COLOR,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  timeText: {
    fontSize: 12,
    color: '#666',
    fontWeight: 'bold',
  },
  courseCard: {
    backgroundColor: PRIMARY_COLOR,
    padding: 20,
    borderRadius: 18,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#f54b02',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 6,
  },
  cardCode: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
  },
  forYouCard: {
    width: 160,
    backgroundColor: '#fff',
    borderRadius: 15,
    marginRight: 15,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    overflow: 'hidden',
  },
  forYouImage: {
    width: '100%',
    height: 90,
    backgroundColor: '#eee',
  },
  forYouInfo: {
    padding: 12,
  },
  forYouCategory: {
    fontSize: 10,
    color: PRIMARY_COLOR,
    fontWeight: 'bold',
    textTransform: 'capitalize',
    marginBottom: 4,
  },
  forYouTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  profileFrame: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    borderWidth: 1,
    borderColor: '#fff',
  },
  userTypeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#222',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 10,
  },
  creditBadge: {
    marginLeft: 10,
  },
  creditText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#f5f5f5',
    marginVertical: 15,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaInfo: {
    alignItems: 'center',
  },
  metaIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  metaText: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '600',
    marginTop: 5,
  },
  modalGrabber: {
    width: 40,
    height: 5,
    backgroundColor: '#E0E0E0',
    borderRadius: 10,
    alignSelf: 'center',
  },
  dashboardRow: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
    borderRadius: 20,
    padding: 15,
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
    marginTop: 8,
    alignItems: 'center',
  },
  verticalDivider: {
    width: 1,
    height: '70%',
    backgroundColor: '#DDD',
  },
  statusIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadge: {
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.7,
    marginBottom: 5,
    color: PRIMARY_COLOR,
  },
  venueBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
  },
  onlineBadge: {
    backgroundColor: '#f54b02', // Very light blue
    borderWidth: 1,
  },
  physicalBadge: {
    backgroundColor: 'inherit', // Light grey for physical
  },
  filterContainer: {
    paddingVertical: 12,
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  filterPill: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 25,
    backgroundColor: '#F2F2F7',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  activePill: {
    backgroundColor: PRIMARY_COLOR,
    borderColor: PRIMARY_COLOR,
  },
  filterText: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500',
  },
  activeFilterText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  semesterRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 10,
  },
  semBtn: {
    paddingHorizontal: 20,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeSemBtn: {
    borderBottomColor: PRIMARY_COLOR,
  },
  semBtnText: {
    fontSize: 13,
    color: '#999',
    paddingBottom: 5,
  },
  activeSemBtnText: {
    color: PRIMARY_COLOR,
    fontWeight: 'bold',
  },
  filterScroll: {
    paddingLeft: 15, // Gives the first item some breathing room
    marginBottom: 10,
  },
  durationBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  instructorName: {
    fontSize: 14,
    color: '#888',
    marginBottom: 6,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    alignSelf: 'flex-end',
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  reviewText: {
    fontSize: 12,
    color: '#aaa',
    marginLeft: 4,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: '#fff5f0', // Very light orange wash
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20, // Rounded pill shape looks more modern
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#f54b0220', // 20% opacity of your brand color
  },
  priceText: {
    fontSize: 15,
    fontWeight: '700',
    color: PRIMARY_COLOR, // Darker shade of the cyan for readability
    marginLeft: 6,
  },
  starsContainer: {
    flexDirection: 'row',
    marginRight: 6,
  },
  starIcon: {
    fontSize: 14,
  },
  starFilled: {
    color: '#FFD700', // Gold color for filled stars
  },
  starEmpty: {
    color: '#E0E0E0', // Grey color for empty stars
  },
  pickerRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: -15, // Overlap the header slightly for a 3D effect
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    paddingVertical: 10,
  },
  pickerTrigger: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
  },
  pickerDivider: {
    width: 1,
    height: '60%',
    backgroundColor: '#eee',
    alignSelf: 'center',
  },
  pickerLabel: {
    fontSize: 10,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pickerValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 2,
  },
  // Bottom Sheet Styles
  bottomSheet: {
    backgroundColor: '#fff',
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
    color: '#333',
  },
  sheetOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f9f9f9',
  },
  optionText: {
    fontSize: 16,
    color: '#444',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  containerModal: {
    backgroundColor: '#fff',
    padding: 30,
    borderRadius: 15,
    alignItems: 'center',
    width: '80%',
  },
  statusText: {
    marginTop: 20,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    color: PRIMARY_COLOR,
  },
  // Add these for the For You section inside header
});

export default ClassroomScreenComponent;
