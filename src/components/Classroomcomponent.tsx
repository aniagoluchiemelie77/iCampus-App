import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Image,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Course, User } from '../types/firebase';
import { useAppSelector } from '../hooks/hooks.ts';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { extractCourseFormAPI } from '../api/localPostApis.ts';
import ExpandableFAB from './ExpandableFAB.tsx';
import { AttachmentModal } from './ChatInput.tsx';
import {
  fetchMyCoursesAPI,
  fetchLecturerCoursesAPI,
} from '../api/localGetApis.ts';
import { createManualCourseAPI } from '../api/localPostApis.ts';
import { initialState } from '../context/UserSlice.ts';
import { useTheme } from '../context/ThemeContext';
import { PRIMARY_COLOR, PRIMARY_COLOR_TINT } from '../assets/styles/colors.ts';
import { CourseSearchCard } from './SearchScreenComponents.tsx';
import { useMediaPicker } from '../hooks/useMediaPicker.ts';
import {
  CourseModal,
  UploadProgressModal,
  ManualCourseModal,
  SelectionModal,
} from './ClassroomScreenComponents.tsx';
import { CustomButton } from '../assets/components/AppUIComponents';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;
import { generateSessions } from '../utils/courseHelper.ts';
interface DashboardProps {
  user: User;
  userRole: 'student' | 'lecturer';
}
interface ClassroomProps {
  userRole: 'student' | 'lecturer';
}

const SESSIONS = generateSessions();

export const Dashboard: React.FC<DashboardProps> = ({ user, userRole }) => {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setLoading] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const isStudent = userRole === 'student';
  const isInstructor = userRole === 'lecturer';

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('All');
  const [selectedSession, setSelectedSession] = useState('All');

  const [isManualModalVisible, setIsManualModalVisible] = useState(false);
  const [isSessionModalVisible, setSessionModalVisible] = useState(false);
  const [isSemesterModalVisible, setSemesterModalVisible] = useState(false);
  const [isAttachmentModalVisible, setIsAttachmentModalVisible] =
    useState(false);
  const [isFabMenuVisible, setFabMenuVisible] = useState(false);
  const toggleFab = () => setFabMenuVisible(!isFabMenuVisible);

  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [page, setPage] = useState(1);

  const { pickImage, pickDocument, pickImageFromCamera } = useMediaPicker();
  const stateRef = useRef({ hasMore, isFetchingMore, page });
  stateRef.current = { hasMore, isFetchingMore, page };

  const handlePickImage = async () => {
    try {
      const fileData = await pickImage();
      if (fileData) {
        await uploadAndExtractCourseFile({
          uri: fileData.uri,
          type: fileData.type === 'image' ? 'image/jpeg' : fileData.type,
          name: fileData.name || `gallery_image_${Date.now()}.jpg`,
        });
      }
    } catch (err) {
      console.log('Image picker window dismissed');
    }
  };

  const handlePickDocument = async () => {
    try {
      const fileData = await pickDocument();
      if (fileData) {
        await uploadAndExtractCourseFile({
          uri: fileData.uri,
          type: 'application/pdf',
          name: fileData.name || `document_${Date.now()}.pdf`,
        });
      }
    } catch (err) {
      console.log('Document picker window dismissed');
    }
  };

  const handleCaptureCamera = async () => {
    try {
      const fileData = await pickImageFromCamera();
      if (fileData) {
        await uploadAndExtractCourseFile({
          uri: fileData.uri,
          type: fileData.type || 'image/jpeg',
          name: fileData.name || `camera_snap_${Date.now()}.jpg`,
        });
      }
    } catch (err) {
      console.log('Camera window dismissed');
    }
  };

  const fetchMyCourses = useCallback(
    async (
      semester: string = 'All',
      session: string = 'All',
      pageNumber: number = 1,
    ) => {
      const { hasMore, isFetchingMore } = stateRef.current;
      if (pageNumber > 1 && (!hasMore || isFetchingMore)) return;

      setLoading(pageNumber === 1);
      setIsFetchingMore(true);
      try {
        const result = await fetchMyCoursesAPI({
          semester,
          session,
          page: pageNumber,
          limit: 10,
        });

        if (result.success) {
          setCourses(result.courses);
          setPage(pageNumber);
          setHasMore(result.courses.length === 10);
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
        setIsFetchingMore(false);
      }
    },
    [],
  );

  const fetchLecturerCourses = useCallback(
    async (semester: string, session: string, pageNumber: number = 1) => {
      const { hasMore, isFetchingMore } = stateRef.current;
      if (pageNumber > 1 && (!hasMore || isFetchingMore)) return;

      setLoading(pageNumber === 1);
      setIsFetchingMore(true);
      try {
        const result = await fetchLecturerCoursesAPI({
          semester,
          session,
          page: pageNumber,
          limit: 10,
        });

        if (result.success) {
          setCourses(result.courses);
          setHasMore(result.courses.length === 10);
          setPage(pageNumber);
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
        setIsFetchingMore(false);
      }
    },
    [],
  );

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
        setSelectedSemester(String(semester));
        setSelectedSession(session);
        if (userRole === 'lecturer') {
          fetchLecturerCourses(String(semester), session);
        } else {
          fetchMyCourses(String(semester), session);
        }
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

  const handleManualCourseSubmit = async (newCourseData: {
    courseTitle: string;
    courseCode: string;
    credits: number;
    semester: string;
    session: string;
  }) => {
    try {
      const response = await createManualCourseAPI(newCourseData);
      if (response.success) {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: response.message,
        });
        if (userRole === 'lecturer') {
          fetchLecturerCourses(selectedSemester, selectedSession);
        } else {
          fetchMyCourses(selectedSemester, selectedSession);
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

    if (userRole === 'lecturer') {
      fetchLecturerCourses(selectedSemester, selectedSession);
    } else {
      fetchMyCourses(selectedSemester, selectedSession);
    }
  }, [
    selectedSession,
    selectedSemester,
    userRole,
    user?.uid,
    fetchMyCourses,
    fetchLecturerCourses,
  ]);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={{ flex: 1, marginHorizontal: 15 }}>
        {isStudent && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.btn, { borderColor: colors.primary }]}
              onPress={() => setIsAttachmentModalVisible(true)}
            >
              <MaterialIcons
                name="cloud-upload"
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
              <MaterialIcons name="keyboard" size={32} color={colors.primary} />
              <Text style={[styles.btnText, { color: colors.primary }]}>
                Manual{'\n'}Entry
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {isInstructor && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.btn, { borderColor: colors.primary }]}
              onPress={() => setIsAttachmentModalVisible(true)}
            >
              <MaterialIcons
                name="cloud-upload"
                size={32}
                color={colors.primary}
              />
              <Text style={[styles.btnText, { color: colors.primary }]}>
                Upload{'\n'}Course{'\n'}Allocation Form
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, { borderColor: colors.primary }]}
              onPress={() => setIsManualModalVisible(true)}
            >
              <MaterialIcons name="keyboard" size={32} color={colors.primary} />
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
                name="people-line"
                size={32}
                color={colors.primary}
              />
              <Text style={[styles.btnText, { color: colors.primary }]}>
                Schedule{'\n'}Quick Online{'\n'}Class
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Persistent Header & Filter Selectors (Always visible so users can change filters even if list is empty) */}
        <View style={styles.headerContainer}>
          <Text style={[styles.title, { color: colors.textDarker }]}>
            {isStudent ? 'Enrolled Courses' : 'Manage Courses'}
          </Text>
          <CustomButton
            title="View All"
            onPress={() => navigation.navigate('ViewAllCourses')}
            disabled={isLoading}
            isLoading={isLoading}
            style={styles.ctaBtn}
          />
        </View>

        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[styles.selectorButton, { borderColor: colors.primary }]}
            onPress={() => setSessionModalVisible(true)}
          >
            <View style={styles.selectorTextContainer}>
              <Text style={[styles.selectorLabel, { color: colors.text }]}>
                Session
              </Text>
              {selectedSession && (
                <Text style={[styles.selectorValue, { color: colors.primary }]}>
                  {selectedSession}
                </Text>
              )}
            </View>
            <MaterialIcons
              name="keyboard-arrow-down"
              size={24}
              color={colors.textDarker}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.selectorButton, { borderColor: colors.primary }]}
            onPress={() => setSemesterModalVisible(true)}
          >
            <View style={styles.selectorTextContainer}>
              <Text style={[styles.selectorLabel, { color: colors.text }]}>
                Semester
              </Text>
              <Text style={[styles.selectorValue, { color: colors.primary }]}>
                {selectedSemester || 'All'}
              </Text>
            </View>
            <MaterialIcons
              name="keyboard-arrow-down"
              size={24}
              color={colors.textDarker}
            />
          </TouchableOpacity>
        </View>

        {/* Content Area: Loader, Empty State, or Course List */}
        {isLoading && courses.length === 0 ? (
          <ActivityIndicator
            size="small"
            color={colors.primary}
            style={{ flex: 1, marginTop: 40 }}
          />
        ) : courses.length === 0 ? (
          <View
            style={[
              styles.emptyState,
              { backgroundColor: colors.backgroundSecondary },
            ]}
          >
            <Image
              source={{
                uri: isStudent
                  ? 'https://res.cloudinary.com/dbdw3zftx/image/upload/v1788549467/The_Little_Things_-_Exam_Studying_wdspiv.png'
                  : 'https://res.cloudinary.com/dbdw3zftx/image/upload/v1788549420/Fresh_Folk_-_Teaching_y1k0ov.png',
              }}
              style={styles.illustration}
            />
            <Text style={[styles.title, { color: colors.textDarker }]}>
              {isStudent
                ? 'Get Started with iCampus'
                : 'Manage your iCampus courses effortlessly'}
            </Text>
            <Text style={[styles.subtitle, { color: colors.text }]}>
              {isStudent
                ? "Let's populate your academic calendar."
                : 'Prepare your syllabus and lectures'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={courses}
            contentContainerStyle={{ paddingBottom: 40 }}
            keyExtractor={item => item.courseId || item.id}
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
        )}
      </View>

      {!isFabMenuVisible && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setFabMenuVisible(true)}
        >
          <MaterialIcons name="widgets" size={34} color={colors.btnTextColor} />
        </TouchableOpacity>
      )}

      <ExpandableFAB
        isVisible={isFabMenuVisible}
        onClose={toggleFab}
        actions={['iAssistant', 'View Lectures']}
        userRole={user.usertype}
      />

      {selectedCourse && (
        <CourseModal
          isVisible={modalVisible}
          onClose={() => setModalVisible(false)}
          course={selectedCourse}
          id={user.uid}
          currentUser={user}
          userRole={userRole}
        />
      )}

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
        options={['All', ...SESSIONS]}
        selectedValue={selectedSession}
        onSelect={val => {
          setHasMore(true);
          setPage(1);
          setSelectedSession(val);
        }}
        onClose={() => setSessionModalVisible(false)}
        colors={colors}
      />

      <SelectionModal
        title="Select Semester"
        visible={isSemesterModalVisible}
        options={['All', 'First', 'Second']}
        selectedValue={selectedSemester}
        onSelect={val => {
          setHasMore(true);
          setPage(1);
          setSelectedSemester(val);
        }}
        onClose={() => setSemesterModalVisible(false)}
        colors={colors}
      />
    </SafeAreaView>
  );
};
const ClassroomScreenComponent: React.FC<ClassroomProps> = ({ userRole }) => {
  const { colors: themeColors } = useTheme();
  const user = useAppSelector(state => state.user) || initialState;
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
  return <Dashboard user={user} userRole={userRole || 'student'} />;
};

const styles = StyleSheet.create({
  typeText: {
    fontSize: 11,
    color: PRIMARY_COLOR,
    fontWeight: 'bold',
    textTransform: 'uppercase',
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
  ctaBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  fab: {
    position: 'absolute',
    right: 20,
    backgroundColor: PRIMARY_COLOR,
    bottom: 80,
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: PRIMARY_COLOR_TINT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 100,
  },
  container: { flex: 1 },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 10,
  },
  btn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  btnText: {
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
  },
  ctaBtn: {
    paddingHorizontal: 12,
    height: 36,
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  selectorButton: {
    flex: 1,
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 4,
  },
  selectorTextContainer: {
    flex: 1,
  },
  selectorLabel: {
    fontSize: 10,
    opacity: 0.7,
  },
  selectorValue: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    padding: 20,
    marginVertical: 10,
  },
  illustration: {
    width: 150,
    height: 150,
    resizeMode: 'contain',
    marginBottom: 15,
  },
});

export default ClassroomScreenComponent;
