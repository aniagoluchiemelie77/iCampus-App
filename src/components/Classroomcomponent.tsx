import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Image,
  Alert,
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
import { Course, User, Lecture } from '../types/firebase';
import { useAppSelector } from './hooks';
import { SafeAreaView } from 'react-native-safe-area-context';
import Logo from '../assets/images/Logo.tsx';
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
const ForYouCard = ({ course }: { course: Course }) => {
  const isFree = course.price === 0;

  return (
    <TouchableOpacity style={styles.forYouCard}>
      <View>
        <Image
          source={{
            uri: course.thumbnailUrl || 'https://via.placeholder.com/150',
          }}
          style={styles.forYouImage}
        />
        {/* YouTube-like duration badge */}
        <View style={styles.durationBadge}>
          <Text style={styles.durationText}>
            {course.courseDuration || 'Video'}
          </Text>
        </View>
      </View>
      <View style={styles.forYouInfo}>
        <Text style={styles.forYouCategory}>{course.department}</Text>
        <Text style={styles.forYouTitle} numberOfLines={2}>
          {course.courseTitle}
        </Text>
        <Text style={styles.instructorName}>
          {course.instructorName || 'iCampus Lecturer'}
        </Text>

        <View style={styles.ratingRow}>
          <Text style={styles.ratingText}>{course.rating || '5.0'} ⭐</Text>
          <Text style={styles.reviewText}>({course.totalReviews || 0})</Text>
        </View>

        <Text style={styles.priceText}>
          {isFree ? 'FREE' : `₦${course.price.toLocaleString()}`}
        </Text>
      </View>
    </TouchableOpacity>
  );
};
const getExceptionLimit = (plan: string) => {
  switch (plan) {
    case 'premium': return 8;
    case 'pro': return 5;
    default: return 3; // free trial
  }
};

const CourseModal = ({
  isVisible,
  onClose,
  course,
  lectures,
  id,
  currentUser
}: CourseModalProps) => {
  if (!course) return null;
  // 1. Syllabus Progress (Instructor side)
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
  const userPlan = currentUser.plan; // e.g., 'free'
  const limit = getExceptionLimit(userPlan ?? 'fr');

// Count how many exceptions the user has ALREADY requested this month
const usedThisMonth = allExceptions.filter(ex => 
  ex.studentId === currentUser.uid &&
  new Date(ex.date).getMonth() === new Date().getMonth() &&
  ex.status !== 'rejected'
).length;

const remaining = Math.max(0, limit - usedThisMonth);
  // 4. Instructors: Count of unique IDs in the lecturerIds array
  const instructorCount = course.lecturerIds?.length || 0;

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
                label="Contents"
                iconName="format-list-bulleted"
                count={course.courseContents?.length}
                onPress={() => {}}
              />
              <GridItem
                label="Materials"
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
                count={remainingExceptions}
                onPress={() => {
                  if (remainingExceptions <= 0) {
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
                <Text style={styles.badgeText}>Total: {lectures.length}</Text>
              </View>
            </View>

            <FlatList
              data={lectures}
              keyExtractor={(_, index) => index.toString()}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <View style={styles.lectureItem}>
                  <View style={styles.checkCircle}>
                    <Text style={{ color: '#fff', fontSize: 10 }}>✓</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.topicText}>Topic Name</Text>
                    <Text style={styles.venueText}>
                      {item.location || 'Online'}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.typeText}>{item.lectureType}</Text>
                    <Text style={styles.timeText}>
                      {item.startTime || '12:00'}
                    </Text>
                  </View>
                </View>
              )}
            />
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

// --- Main Dashboard ---

const Dashboard = ({ user }: { user: User }) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [search, setSearch] = useState('');
  const [_loading, setLoading] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const isStudent = user.usertype === 'student';

  const fetchMyCourses = async (semester: string, session: string) => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://api.icampus.com/courses?semester=${semester}&session=${session}&studentId=${user.uid}`,
        { headers: { Authorization: `Bearer ${user.accessToken}` } },
      );
      const data = await response.json();
      setCourses(data);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch courses');
    } finally {
      setLoading(false);
    }
  };

  const handleAIPopulate = async () => {
    try {
      const res = await DocumentPicker.pickSingle({
        type: [DocumentPicker.types.pdf, DocumentPicker.types.images],
      });
      setLoading(true);
      const formData = new FormData();
      formData.append('file', { uri: res.uri, type: res.type, name: res.name });

      const response = await fetch(
        'https://api.icampus.com/ai/extract-course',
        {
          method: 'POST',
          body: formData,
          headers: {
            Authorization: `Bearer ${user.accessToken}`,
            'Content-Type': 'multipart/form-data',
          },
        },
      );

      const aiData = await response.json();
      Alert.alert('Gemini Success', `Extracted: ${aiData.courseTitle}`);
      fetchMyCourses('1', '2025/2026');
    } catch (err) {
      if (!DocumentPicker.isCancel(err)) console.log(err);
    } finally {
      setLoading(false);
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

  const filteredCourses = courses.filter(c => {
    const query = search.toLowerCase();
    return (
      c.courseTitle?.toLowerCase().includes(query) ||
      c.courseCode?.toLowerCase().includes(query) ||
      c.instructorName?.toLowerCase().includes(query)
    );
  });

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      {isStudent && (
        <>
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
                <TouchableOpacity style={styles.btn} onPress={handleAIPopulate}>
                  <MaterialIcons name="cloud-upload" size={32} color="#fff" />
                  <Text style={styles.btnText}>Upload{'\n'}Form</Text>
                </TouchableOpacity>
                {/* 2. Manual Entry */}
                <TouchableOpacity style={styles.btn} onPress={() => {}}>
                  <MaterialIcons name="keyboard" size={32} color="#fff" />
                  <Text style={styles.btnText}>Manual{'\n'}Entry</Text>
                </TouchableOpacity>
                {/* 3. Meet Instructor */}
                <TouchableOpacity style={styles.btn} onPress={() => {}}>
                  <MaterialIcons name="people-outline" size={32} color="#fff" />
                  <Text style={styles.btnText}>Meet{'\n'}Instructors</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <FlatList
              data={filteredCourses}
              contentContainerStyle={{ padding: 20, paddingBottom: 100 }} // Extra space at bottom
              keyExtractor={item => item.id}
              renderItem={({ item }) => {
                // UI Formatter: CAPITALIZE for display
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
                        <Icon name="human-male-board" size={23} color="#fff" />
                        <Text style={styles.metaText}>
                          {capitalize(item.instructorName || 'Not Asigned...')}
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
          />
        </>
      )}
      {renderForYou()}
    </SafeAreaView>
  );
};
const ClassroomScreenComponent = () => {
  const user = useAppSelector(state => state.user);
  if (!user) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#f54b02" />
      </View>
    );
  }
  return <Dashboard user={user} />;
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
    paddingHorizontal: 12,
    paddingVertical: 4,
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
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#27AE60',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topicText: { fontWeight: '700', fontSize: 15 },
  venueText: { fontSize: 12, color: '#888' },
  typeText: {
    fontSize: 11,
    color: PRIMARY_COLOR,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  timeText: { fontWeight: 'bold', color: '#333' },
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
    color: '#333',
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
    padding: 10,
  },
  forYouCategory: {
    fontSize: 10,
    color: PRIMARY_COLOR,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  forYouTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#444',
    lineHeight: 18,
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
  // Add these for the For You section inside header
});

export default ClassroomScreenComponent;
