import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Course, User } from '../types/firebase';
import { useAppSelector } from '../hooks/hooks.ts';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { extractCourseFormAPI } from '../api/localPostApis.ts';
import { AttachmentModal } from './ChatInput.tsx';
import {
  fetchMyCoursesAPI,
  fetchLecturerCoursesAPI,
} from '../api/localGetApis.ts';
import { createManualCourseAPI } from '../api/localPostApis.ts';
import { initialState } from '../context/UserSlice.ts';
import { useTheme } from '../context/ThemeContext';
import { CourseSearchCard } from './SearchScreenComponents.tsx';
import { useMediaPicker } from '../hooks/useMediaPicker.ts';
import {
  CourseModal,
  UploadProgressModal,
  ManualCourseModal,
} from './ClassroomScreenComponents.tsx';
import { CustomButton } from '../assets/components/AppUIComponents';
import { EmptyState } from './EmptyFlatlistComponent';
import { TodayAttendanceCard } from './TodayAttendanceCard';

interface DashboardProps {
  user: User;
  userRole: 'student' | 'lecturer';
}
interface ClassroomProps {
  userRole: 'student' | 'lecturer';
}

// One request for every course; a student's or lecturer's list is small.
const ALL_COURSES_LIMIT = 200;

type LoadState = 'idle' | 'loading' | 'refreshing' | 'loaded' | 'error';

export const Dashboard: React.FC<DashboardProps> = ({ user, userRole }) => {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const isStudent = userRole === 'student';
  const isInstructor = userRole === 'lecturer';

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');

  const [isManualModalVisible, setIsManualModalVisible] = useState(false);
  const [isAttachmentModalVisible, setIsAttachmentModalVisible] =
    useState(false);

  const fetchingRef = useRef(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const { pickImage, pickDocument, pickImageFromCamera } = useMediaPicker();

  /** Loads every course in one go (no filters, no paging). */
  const loadCourses = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (fetchingRef.current) return;
      fetchingRef.current = true;
      setLoadState(mode === 'refresh' ? 'refreshing' : 'loading');
      try {
        const fetcher = userRole === 'lecturer' ? fetchLecturerCoursesAPI : fetchMyCoursesAPI;
        const result = await fetcher({
          semester: 'All',
          session: 'All',
          page: 1,
          limit: ALL_COURSES_LIMIT,
        });
        if (result.success) {
          setCourses(Array.isArray(result.courses) ? result.courses : []);
          setErrorMessage('');
          setLoadState('loaded');
        } else {
          setErrorMessage(result.message || 'We could not load your courses.');
          setLoadState('error');
        }
      } catch (error: any) {
        console.error('Course fetch error:', error);
        setErrorMessage(error?.message || 'Check your connection and try again.');
        setLoadState('error');
      } finally {
        fetchingRef.current = false;
      }
    },
    [userRole],
  );

  useEffect(() => {
    if (!user?.uid) return;
    loadCourses('initial');
  }, [user?.uid, loadCourses]);

  /** Real MIME type from the file extension; the pickers only say "image"/"file". */
  const mimeFromName = (name: string) => {
    const extension = name.split('?')[0].split('.').pop()?.toLowerCase() || '';
    const mimeByExtension: Record<string, string> = {
      pdf: 'application/pdf',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      heic: 'image/heic',
      heif: 'image/heif',
    };
    return mimeByExtension[extension];
  };

  /** Photo from gallery/camera: name it after its real extension (the crop picker can return PNG). */
  const photoUpload = (uri: string, prefix: string) => {
    const mime = mimeFromName(uri) || 'image/jpeg';
    const extension = mime === 'image/jpeg' ? 'jpg' : mime.split('/')[1];
    return { uri, type: mime, name: `${prefix}_${Date.now()}.${extension}` };
  };

  const handlePickImage = async () => {
    try {
      const fileData = await pickImage();
      if (fileData) {
        await uploadAndExtractCourseFile(photoUpload(fileData.uri, 'course_form'));
      }
    } catch (err) {
      console.log('Image picker window dismissed');
    }
  };
  const handlePickDocument = async () => {
    try {
      const fileData = await pickDocument();
      if (fileData) {
        // The picker allows any file; only PDFs and images can be read.
        const name = fileData.name || `document_${Date.now()}.pdf`;
        const mimeType = mimeFromName(name);
        if (!mimeType) {
          Toast.show({
            type: 'error',
            text1: 'Unsupported file',
            text2: 'Upload your course form as a PDF or a photo.',
          });
          return;
        }
        await uploadAndExtractCourseFile({ uri: fileData.uri, type: mimeType, name });
      }
    } catch (err) {
      console.log('Document picker window dismissed');
    }
  };
  const handleCaptureCamera = async () => {
    try {
      const fileData = await pickImageFromCamera();
      if (fileData) {
        // fileData.type is "image", which the server rejects as a MIME type.
        await uploadAndExtractCourseFile(photoUpload(fileData.uri, 'course_form_camera'));
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
    if (uploading) return;
    setUploading(true);
    setStatus('Uploading document...');
    setProgress(0);

    try {
      const response = await extractCourseFormAPI(fileData, percent => {
        setProgress(percent);
        if (percent >= 1) {
          setStatus('Reading your courses...');
        }
      });

      const { message, courses: extractedCourses } = response.data || {};

      if (extractedCourses && extractedCourses.length > 0) {
        loadCourses('refresh');
        Toast.show({
          type: 'success',
          text1: 'Courses added',
          text2: message,
          position: 'bottom',
          bottomOffset: 5,
        });
      } else {
        Toast.show({
          type: 'warning',
          text1: 'No courses found',
          text2: 'The file was read, but no courses were detected. Try a clearer copy.',
          position: 'bottom',
          bottomOffset: 5,
        });
      }
    } catch (err: any) {
      console.error('AI Extraction Pipeline Error:', err);
      // Show the server's reason (matric mismatch, unsupported file, AI busy…)
      // instead of a generic failure.
      Toast.show({
        type: 'error',
        text1: 'Could not process your form',
        text2:
          err?.response?.data?.message ||
          err?.message ||
          'Please check your connection and try again.',
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
        loadCourses('refresh');
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

  const isBusy = loadState === 'loading' || loadState === 'refreshing';

  const renderHeader = () => (
    <View>
      {isStudent && (
        <View style={styles.actionRow}>
          <ActionTile
            icon="cloud-upload"
            label={'Upload\nForm'}
            onPress={() => setIsAttachmentModalVisible(true)}
            colors={colors}
          />
          <ActionTile
            icon="keyboard"
            label={'Manual\nEntry'}
            onPress={() => setIsManualModalVisible(true)}
            colors={colors}
          />
        </View>
      )}

      {isInstructor && (
        <View style={styles.actionRow}>
          <ActionTile
            icon="cloud-upload"
            label={'Upload\nAllocation Form'}
            onPress={() => setIsAttachmentModalVisible(true)}
            colors={colors}
          />
          <ActionTile
            icon="keyboard"
            label={'Manual\nEntry'}
            onPress={() => setIsManualModalVisible(true)}
            colors={colors}
          />
          <ActionTile
            icon="video-call"
            label={'Quick Online\nClass'}
            onPress={() =>
              navigation.navigate('CourseSubPage', {
                title: 'QuickPublicClass',
                userRole: user.usertype,
              })
            }
            colors={colors}
          />
        </View>
      )}

      <TodayAttendanceCard role={userRole} refreshKey={refreshKey} />

      <View style={styles.headerContainer}>
        <View>
          <Text style={[styles.title, { color: colors.textDarker }]}>
            {isStudent ? 'Enrolled Courses' : 'Manage Courses'}
          </Text>
          {loadState === 'loaded' && courses.length > 0 && (
            <Text style={[styles.titleCount, { color: colors.text }]}>
              {courses.length} {courses.length === 1 ? 'course' : 'courses'}
            </Text>
          )}
        </View>
        <CustomButton
          title="View All"
          onPress={() => navigation.navigate('ViewAllCourses')}
          style={styles.ctaBtn}
        />
      </View>
    </View>
  );

  const renderEmpty = () => {
    if (loadState === 'idle' || loadState === 'loading') {
      return (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Loading your courses…
          </Text>
        </View>
      );
    }
    if (loadState === 'error') {
      return (
        <EmptyState
          iconName="wifi-off"
          title="Couldn't load your courses"
          subtitle={errorMessage || 'Check your internet connection, then try again.'}
          buttonText="Try again"
          buttonIcon="refresh"
          buttonLoading={isBusy}
          onPress={() => loadCourses('refresh')}
          style={styles.emptyState}
        />
      );
    }
    return (
      <EmptyState
        illustration={{
          uri: isStudent
            ? 'https://res.cloudinary.com/dbdw3zftx/image/upload/v1788549467/The_Little_Things_-_Exam_Studying_wdspiv.png'
            : 'https://res.cloudinary.com/dbdw3zftx/image/upload/v1788549420/Fresh_Folk_-_Teaching_y1k0ov.png',
        }}
        title={isStudent ? 'No courses yet' : 'No courses assigned yet'}
        subtitle={
          isStudent
            ? 'Upload your course registration form and we’ll fill in your courses for you. Already did? Check again.'
            : 'Upload your course allocation form to prepare your syllabus and lectures. Already did? Check again.'
        }
        buttonText="Check again"
        buttonIcon="refresh"
        buttonLoading={isBusy}
        onPress={() => loadCourses('refresh')}
        chipsLabel="Or add your courses"
        chips={[
          {
            label: isStudent ? 'Upload course form' : 'Upload allocation form',
            icon: 'cloud-upload',
            onPress: () => setIsAttachmentModalVisible(true),
          },
          {
            label: 'Add manually',
            icon: 'keyboard',
            onPress: () => setIsManualModalVisible(true),
          },
        ]}
        style={styles.emptyState}
      />
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['left', 'right']}
    >
      <FlatList
        data={loadState === 'error' ? [] : courses}
        keyExtractor={item => item.courseId}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loadState === 'refreshing'}
            onRefresh={() => {
              setRefreshKey(k => k + 1);
              loadCourses('refresh');
            }}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        renderItem={({ item }) => (
          <CourseSearchCard
            item={item}
            navigation={navigation}
            colors={colors}
            onPress={() => {
              setSelectedCourse(item);
              setModalVisible(true);
            }}
          />
        )}
      />

      {selectedCourse && (
        <CourseModal
          isVisible={modalVisible}
          onClose={() => setModalVisible(false)}
          course={selectedCourse}
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
    </SafeAreaView>
  );
};

const ActionTile = ({
  icon,
  label,
  onPress,
  colors,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  colors: any;
}) => (
  <TouchableOpacity
    style={[
      styles.btn,
      { borderColor: colors.primary + '55', backgroundColor: colors.backgroundSecondary },
    ]}
    onPress={onPress}
    activeOpacity={0.8}
    accessibilityRole="button"
    accessibilityLabel={label.replace(/\n/g, ' ')}
  >
    <View style={[styles.btnIcon, { backgroundColor: colors.primary + '1A' }]}>
      <MaterialIcons name={icon} size={24} color={colors.primary} />
    </View>
    <Text style={[styles.btnText, { color: colors.textDarker }]}>{label}</Text>
  </TouchableOpacity>
);

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
  listContent: { paddingHorizontal: 15, paddingBottom: 110, flexGrow: 1 },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 12,
    marginBottom: 6,
  },
  btn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  btnIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    textAlign: 'center',
    fontSize: 12.5,
    fontWeight: '700',
    marginTop: 8,
    lineHeight: 16,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 12,
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
  },
  titleCount: { fontSize: 12.5, marginTop: 2, opacity: 0.75 },
  ctaBtn: {
    paddingHorizontal: 14,
    height: 36,
    width: 'auto',
  },
  loadingBox: { alignItems: 'center', paddingTop: 48, gap: 10 },
  loadingText: { fontSize: 13, opacity: 0.75 },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 0,
    paddingVertical: 20,
  },
});

export default ClassroomScreenComponent;
