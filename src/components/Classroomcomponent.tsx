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
import { PageHeader } from '../components/PageHeader';
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

const Dashboard: React.FC<DashboardProps> = ({ user, userRole }) => {
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
  const [selectedSemester, setSelectedSemester] = useState('First');
  const [isManualModalVisible, setIsManualModalVisible] = useState(false);
  const [selectedSession, setSelectedSession] = useState(SESSIONS[2]);
  const [isSessionModalVisible, setSessionModalVisible] = useState(false);
  const [isSemesterModalVisible, setSemesterModalVisible] = useState(false);
  const [isAttachmentModalVisible, setIsAttachmentModalVisible] =
    useState(false);
  const [isFabMenuVisible, setFabMenuVisible] = useState(false);
  const toggleFab = () => setFabMenuVisible(!isFabMenuVisible);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const { pickImage, pickDocument, pickImageFromCamera } = useMediaPicker();
  const stateRef = useRef({ hasMore, isFetchingMore });
  stateRef.current = { hasMore, isFetchingMore };
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
          type: 'application/pdf', // or fallback depending on file type
          name: fileData.name || `document_${Date.now()}.pdf`,
        });
      }
    } catch (err) {
      console.log('Document picker window dismissed');
    }
  };

  const fetchMyCourses = useCallback(
    async (semester?: string, session?: string) => {
      const { hasMore, isFetchingMore } = stateRef.current;
      if (!hasMore || isFetchingMore) return;

      setLoading(true);
      setIsFetchingMore(true);
      try {
        const result = await fetchMyCoursesAPI({
          semester,
          session,
          page: 1,
          limit: 10,
        });

        if (result.success) {
          console.log('Fetch successful...');
          setCourses(result.courses);
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
    [setCourses, setHasMore, setLoading, setIsFetchingMore],
  );

  const fetchLecturerCourses = useCallback(
    async (semester: string, session: string) => {
      const { hasMore, isFetchingMore } = stateRef.current;
      if (!hasMore || isFetchingMore) return;

      setLoading(true);
      setIsFetchingMore(true);
      try {
        const result = await fetchLecturerCoursesAPI({
          semester,
          session,
          page: 1,
          limit: 10,
        });

        if (result.success) {
          console.log('Fetch successful...');
          setCourses(result.courses);
          setHasMore(result.courses.length === 10);
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
    [setCourses, setHasMore, setLoading, setIsFetchingMore],
  );
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
      <PageHeader title="iCampus Classroom" showBackButton={false} />
      {isLoading ? (
        <ActivityIndicator
          size="small"
          color={colors.primary}
          style={{ flex: 1 }}
        />
      ) : (
        <View style={{ flex: 1, marginHorizontal: 15 }}>
          {isStudent && (
            <>
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
                  <MaterialIcons
                    name="keyboard"
                    size={32}
                    color={colors.primary}
                  />
                  <Text style={[styles.btnText, { color: colors.primary }]}>
                    Manual{'\n'}Entry
                  </Text>
                </TouchableOpacity>
              </View>
              {courses.length === 0 ? (
                <View
                  style={[
                    styles.emptyState,
                    { backgroundColor: colors.backgroundSecondary },
                  ]}
                >
                  <Image
                    source={{
                      uri: 'https://res.cloudinary.com/dbdw3zftx/image/upload/v1788549467/The_Little_Things_-_Exam_Studying_wdspiv.png',
                    }}
                    style={styles.illustration}
                  />
                  <Text style={[styles.title, { color: colors.textDarker }]}>
                    Get Started with iCampus
                  </Text>
                  <Text style={[styles.subtitle, { color: colors.text }]}>
                    Let's populate your academic calendar.
                  </Text>
                </View>
              ) : (
                <>
                  <View style={styles.headerContainer}>
                    <Text style={[styles.title, { color: colors.textDarker }]}>
                      Enrolled Courses
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
                        name="chevron-down"
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
                        name="chevron-down"
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
                  <MaterialIcons
                    name="keyboard"
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
                    name="people-line"
                    size={32}
                    color={colors.primary}
                  />
                  <Text style={[styles.btnText, { color: colors.primary }]}>
                    Schedule{'\n'}Quick Online{'\n'}Class
                  </Text>
                </TouchableOpacity>
              </View>
              {courses.length === 0 ? (
                <View
                  style={[
                    styles.emptyState,
                    { backgroundColor: colors.backgroundSecondary },
                  ]}
                >
                  <Image
                    source={{
                      uri: 'https://res.cloudinary.com/dbdw3zftx/image/upload/v1788549420/Fresh_Folk_-_Teaching_y1k0ov.png',
                    }}
                    style={styles.illustration}
                  />
                  <Text style={[styles.title, { color: colors.textDarker }]}>
                    Manage your iCampus courses effortlessly
                  </Text>
                  <Text style={[styles.subtitle, { color: colors.text }]}>
                    Prepare your syllabus and lectures
                  </Text>
                </View>
              ) : (
                <>
                  <View style={styles.headerContainer}>
                    <Text style={[styles.title, { color: colors.textDarker }]}>
                      Manage Courses
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
                        name="chevron-down"
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
                        name="chevron-down"
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
        </View>
      )}
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
  container: { flex: 1 },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    padding: 20,
    borderRadius: 15,
  },
  illustration: {
    width: 250,
    height: 200,
    marginBottom: 25,
    resizeMode: 'contain',
  },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 20 },
  subtitle: { fontSize: 14, marginBottom: 15 },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
  },
  btn: {
    padding: 15,
    borderRadius: 15,
    width: '30%',
    alignItems: 'center',
    borderWidth: 1,
  },
  btnText: {
    fontWeight: '700',
    fontSize: 12,
    marginTop: 10,
    lineHeight: 20,
  },
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
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ctaBtn: {
    paddingHorizontal: 15,
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
});

export default ClassroomScreenComponent;
