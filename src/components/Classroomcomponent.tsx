import React, { useState, useEffect, useCallback } from 'react';
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
import { homeStyles } from '../assets/styles/colors.ts';
import { PageHeader } from '../components/PageHeader';
import { AttachmentModal } from './ChatInput.tsx';
import {
  fetchMyCoursesAPI,
  fetchLecturerCoursesAPI,
} from '../api/localGetApis.ts';
import { createManualCourseAPI } from '../api/localPostApis.ts';
import { useAppDataContext } from '../context/EventContext.tsx';
import { ProductCard } from './ProductCard';
import { useTheme } from '../context/ThemeContext';
import { EmptyState } from '../components/EmptyFlatlistComponent';
import { PRIMARY_COLOR, PRIMARY_COLOR_TINT } from '../assets/styles/colors.ts';
import { CourseSearchCard } from './SearchScreen.tsx';
import { useMediaPicker } from '../hooks/useMediaPicker.ts';
import {
  CourseModal,
  UploadProgressModal,
  ManualCourseModal,
  SelectionModal,
} from './ClassroomScreenComponents.tsx';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2;
import { generateSessions } from '../utils/courseHelper.ts';
interface DashboardProps {
  user: User;
  userRole: 'student' | 'lecturer' | 'otherUser';
}
interface ClassroomProps {
  userRole: 'student' | 'lecturer' | 'otherUser';
}

const SESSIONS = generateSessions();

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
  const { pickImage, pickDocument, pickImageFromCamera } = useMediaPicker();

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
        onPickImage={pickImage}
        onPickDocument={pickDocument}
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
    marginVertical: 15,
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
});

export default ClassroomScreenComponent;
