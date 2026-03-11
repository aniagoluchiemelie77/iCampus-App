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
  course: Course; // Ensure Course is imported from your firebase types
  lectures: Lecture[]; // Ensure Lecture is imported from your firebase types
}
const GridItem = ({
  label,
  icon,
  count,
}: {
  label: string;
  icon: string;
  count?: number;
}) => (
  <TouchableOpacity style={styles.gridBtn}>
    <View style={styles.iconCircle}>
      <Text style={{ fontSize: 24 }}>{icon}</Text>
      {count && (
        <View style={styles.notifBadge}>
          <Text style={styles.notifText}>{count}</Text>
        </View>
      )}
    </View>
    <Text style={styles.gridLabel}>{label}</Text>
  </TouchableOpacity>
);

const ProgressRing = ({ percentage }: { percentage: number }) => {
  const radius = 40;
  const stroke = 8;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <View style={styles.progressContainer}>
      <Svg height={radius * 2} width={radius * 2}>
        <Circle
          stroke="#e6e6e6"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <Circle
          stroke={PRIMARY_COLOR}
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={`${circumference} ${circumference}`}
          style={{ strokeDashoffset }}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
      </Svg>
      <Text style={styles.progressText}>{percentage}%</Text>
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

const CourseModal = ({
  isVisible,
  onClose,
  course,
  lectures,
}: CourseModalProps) => {
  if (!course) return null;

  return (
    <Modal visible={isVisible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Course Modal</Text>
              <Text style={styles.courseSubtext}>
                {course.courseCode} - {course.courseTitle}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={{ fontSize: 22, color: '#666' }}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.attendanceBox}>
              <ProgressRing percentage={85} />
              <View style={{ marginLeft: 15 }}>
                <Text style={styles.statLabel}>Attendance</Text>
                <Text style={styles.statSub}>ATTENDED / TOTAL LECTURES</Text>
              </View>
            </View>
          </View>

          <View style={styles.iconGrid}>
            <GridItem label="Contents" icon="📋" />
            <GridItem label="Materials" icon="📚" />
            <GridItem label="Assignments" icon="📝" count={5} />
            <GridItem label="Exceptions" icon="🛡️" />
            <GridItem label="Instructor" icon="🎓" />
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
      </View>
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

  const filteredCourses = courses.filter(
  c =>
    c.courseTitle?.toLowerCase().includes(search.toLowerCase()) ||
    c.courseCode?.toLowerCase().includes(search.toLowerCase()) ||
    c.instructorName?.toLowerCase().includes(search.toLowerCase())
);

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
              contentContainerStyle={{ padding: 20 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    setSelectedCourse(item);
                    setModalVisible(true);
                  }}
                  style={styles.courseCard}
                >
                  <Text style={styles.cardTitle}>{item.courseTitle}</Text>
                  <Text style={styles.cardCode}>{item.courseCode}</Text>
                </TouchableOpacity>
              )}
              keyExtractor={item => item.id}
            />
          )}

          {/* 3. Modal remains accessible within the student view */}
          <CourseModal
            isVisible={modalVisible}
            onClose={() => setModalVisible(false)}
            course={selectedCourse!}
            lectures={[]} // Fetch these based on selectedCourse.id
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
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 25,
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  courseSubtext: { color: '#f54b02', fontWeight: '600' },
  statsRow: { marginBottom: 25 },
  attendanceBox: { flexDirection: 'row', alignItems: 'center' },
  progressContainer: { alignItems: 'center', justifyContent: 'center' },
  progressText: {
    position: 'absolute',
    fontWeight: 'bold',
    color: PRIMARY_COLOR,
  },
  statLabel: { fontWeight: 'bold', fontSize: 18 },
  statSub: { fontSize: 10, color: '#999', letterSpacing: 1 },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  gridBtn: { width: '30%', alignItems: 'center', marginBottom: 20 },
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
  gridLabel: { fontSize: 12, color: '#555', marginTop: 8, fontWeight: '500' },
  notifBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: PRIMARY_COLOR,
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
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 15,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardTitle: { fontSize: 18, fontWeight: 'bold' },
  cardCode: { color: PRIMARY_COLOR, marginTop: 4 },
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
  // Add these for the For You section inside header
});

export default ClassroomScreenComponent;
