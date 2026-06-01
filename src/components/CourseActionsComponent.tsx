import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import ReactNativeBlobUtil from 'react-native-blob-util';
import {
  View,
  TextInput,
  ScrollView,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Pressable,
  Modal,
  ActivityIndicator,
  AppState,
  Dimensions,
  SectionList,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  TestSubmission,
  Course,
  Lecture,
  Assignment,
  User,
  CourseException,
  Question,
  CreateLecturePayload,
  CreateTestPayload,
} from '../types/firebase';
import { useNavigation } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { create, all } from 'mathjs';
import { PRIMARY_COLOR, PRIMARY_COLOR_TINT } from '../assets/styles/colors';
import Logo from '../assets/images/Logo';
import Toast from 'react-native-toast-message';
import { baseUrl } from './HomeScreenComponents';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DocumentPicker from 'react-native-document-picker';
import RNFS from 'react-native-fs';
import { PermissionsAndroid, Platform, Linking } from 'react-native';
import DatePicker from 'react-native-date-picker';
import { useAppSelector } from './hooks';
import { Picker } from '@react-native-picker/picker';
import { Camera, useCameraDevice } from 'react-native-vision-camera';
import { EmptyState } from './EmptyFlatlistComponent';
import { getUniqueId } from 'react-native-device-info';
import { callGeminiAPI } from '../services/aiServices';
import { BarChart } from 'react-native-chart-kit';
import { OngoingLectureModal } from './OngoingLiveLecturesModal';
import { createAssignment, saveCourseMaterial } from '../api/localPostApis';
import { uploadFileToFirebaseClient } from '../utils/CloudinaryPresetHelper';
import { deleteCourseMaterial } from '../api/localDeleteApis';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { updateCourseContent } from '../api/localPutApis';
import {
  createCourseContent,
  verifyFacialIdentity,
} from '../api/localPostApis';
import { deleteCourseContent, deleteAssignment } from '../api/localDeleteApis';
import { useTheme } from '../context/ThemeContext';
import { formatDate } from '../utils/dateFormatter';
import {
  fetchAllAssignments,
  getAssessmentAnalysisUrl,
} from 'api/localGetApis';
import { launchImageLibrary } from 'react-native-image-picker';
import { EXCEPTION_ACCOUNT_LIMITS } from '../constants/inAppConstants';
const { width } = Dimensions.get('window');
const math = create(all);

type PageType =
  | 'Course Contents'
  | 'Course Materials'
  | 'Assignments'
  | 'Exceptions'
  | 'Assessments'
  | 'Set Lecture Schedule'
  | 'View Lecture Schedule'
  | 'View Assessment Report'
  | 'AI Assisted Learning'
  | 'Library';
interface LecturerManageProps {
  exceptions: CourseException[];
  searchQuery: string;
  refreshing: boolean;
  onRefresh: () => void;
  onUpdateStatus: (
    id: string,
    status: 'approved' | 'rejected',
  ) => Promise<void>;
}
interface TestFormState {
  title: string;
  duration: string;
  dueDate: string;
  scheduledStart: string;
  totalMarks: string;
  questions: Question[];
}
interface LecturerTestManageProps {
  course: Course;
  searchQuery: string;
  refreshing: boolean;
  onRefresh: () => void;
  tests: CreateTestPayload[];
  onSaveTest: (data: CreateTestPayload) => void;
  setSearchQuery: (query: string) => void;
}
interface RenderScheduleProps {
  course: Course;
  onSave: (data: CreateLecturePayload) => Promise<void>;
  isLoading: boolean;
}
interface StudentExceptionsProps {
  exceptions: CourseException[];
  user: User;
  onAddPress: () => void;
  searchQuery: string;
  refreshing: boolean; // <-- Add this
  onRefresh: () => void; // <-- Add this
}
interface AddExceptionProps {
  visible: boolean;
  onClose: () => void;
  course: Course;
  user: User;
  onSave: (data: Partial<CourseException>) => void;
  isSaving: boolean;
  lectures: Lecture[];
}
interface HeaderProps {
  onBack: () => void;
  title: PageType;
  searchQuery: string;
  setSearchQuery: (text: string) => void;
  placeholder?: string;
  userRole?: 'student' | 'lecturer';
}
interface CreateAssignmentProps {
  visible: boolean;
  onClose: () => void;
  courseId: string;
  onRefresh?: () => void;
  colors: any;
}
interface StudentTestProps {
  test: CreateTestPayload;
  user: any;
  onSubmit: (payload: any) => Promise<void>;
}
const shuffleArray = (array: any[]) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};
export const FloatingCalculator = ({
  visible,
  onClose,
  expression,
  result,
  handlePress,
  buttons,
  colors,
}: any) => {
  if (!visible) return null;
  return (
    <View
      style={[
        CourseActionStyles.miniCalculator,
        { backgroundColor: colors.backgroundSecondary },
      ]}
    >
      <View style={CourseActionStyles.miniCalculatorHeader}>
        <Text
          style={[
            CourseActionStyles.miniCalculatorHeaderText,
            { color: colors.text },
          ]}
        >
          Calc
        </Text>
        <TouchableOpacity onPress={onClose}>
          <MaterialIcons
            name="cancel-outlined"
            size={20}
            color={colors.primary}
          />
        </TouchableOpacity>
      </View>
      <View style={CourseActionStyles.miniCalcDisplay}>
        <Text
          numberOfLines={1}
          style={[
            CourseActionStyles.miniCalcDisplayExpressionText,
            { color: colors.text },
          ]}
        >
          {expression || '0'}
        </Text>
        <Text
          numberOfLines={1}
          style={[
            CourseActionStyles.miniCalcDisplayResultsText,
            { color: colors.text },
          ]}
        >
          {result || ''}
        </Text>
      </View>
      <View>
        {buttons.map((row: string[], i: number) => (
          <View key={i} style={CourseActionStyles.btnContainer}>
            {row.map(btn => (
              <TouchableOpacity
                key={btn}
                style={[
                  CourseActionStyles.miniButton,
                  btn === '=' && { backgroundColor: colors.btnColor },
                ]}
                onPress={() => handlePress(btn)}
              >
                <Text
                  style={[
                    CourseActionStyles.miniBtnText,
                    btn === '='
                      ? { color: colors.btnTextColor }
                      : { color: colors.text },
                  ]}
                >
                  {btn}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
};
export const chartConfig = {
  backgroundGradientFrom: '#FFFFFF',
  backgroundGradientTo: '#eee',
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(44, 62, 80, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(52, 73, 94, ${opacity})`,
  style: {
    borderRadius: 16,
  },
  propsForBackgroundLines: {
    strokeDasharray: '',
    stroke: '#ECEFF1',
  },
};
const CreateAssignmentModal = ({
  visible,
  onClose,
  courseId,
  onRefresh,
  colors,
}: CreateAssignmentProps) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submissionInfo, setSubmissionInfo] = useState(
    'Submit to your course rep',
  );
  const [date, setDate] = useState(new Date());
  const [open, setOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{
    uri: string;
    name: string;
    type: string;
  } | null>(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handlePickFile = async () => {
    try {
      const res = await DocumentPicker.pickSingle({
        type: [
          DocumentPicker.types.pdf,
          DocumentPicker.types.doc,
          DocumentPicker.types.docx,
        ],
      });
      setSelectedFile({
        uri: res.uri,
        name: res.name || 'document.pdf',
        type: res.type || 'application/pdf',
      });
    } catch (err) {
      if (!DocumentPicker.isCancel(err)) console.log(err);
    }
  };

  const handlePickImage = () => {
    launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, response => {
      if (response.didCancel || response.errorCode) return;
      if (response.assets && response.assets[0]) {
        const asset = response.assets[0];
        setSelectedFile({
          uri: asset.uri || '',
          name: asset.fileName || `${Date.now()}.jpg`,
          type: asset.type || 'image/jpeg',
        });
      }
    });
  };
  const handleCreate = async () => {
    if (!title.trim()) {
      return Toast.show({ type: 'error', text1: 'Title required' });
    }
    setIsSaving(true);
    try {
      let cloudStorageUrl = null;
      if (selectedFile) {
        setIsUploadingMedia(true);
        const uploadResult = await uploadFileToFirebaseClient(
          selectedFile.uri,
          'assignments-briefs',
        );
        if (uploadResult.success && uploadResult.data) {
          cloudStorageUrl = uploadResult.data.permanentUrl;
          setIsUploadingMedia(false);
        } else {
          setIsSaving(false);
          return Toast.show({
            type: 'error',
            text1: 'Media Upload Failed',
            text2:
              uploadResult.message ||
              'Could not verify remote attachment reference.',
          });
        }
      }
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      formData.append('dueDate', date.toISOString());
      formData.append('submissionMethod', 'Physical');
      formData.append('submissionInfo', submissionInfo.trim());
      if (cloudStorageUrl) {
        formData.append('fileUrl', cloudStorageUrl);
      }
      const result = await createAssignment(courseId, formData);
      if (result.success) {
        Toast.show({ type: 'success', text1: 'Assignment Posted' });
        setTitle('');
        setDescription('');
        setSubmissionInfo('Submit to your course rep');
        setSelectedFile(null);
        setDate(new Date());
        if (onRefresh) onRefresh();
        onClose();
      } else {
        Toast.show({
          type: 'error',
          text1: 'Creation Failed',
          text2: result.error || 'Server error occurred while executing.',
        });
      }
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'System Error',
        text2:
          error.message || 'An unexpected execution thread failure occurred.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={CourseActionStyles.modalOverlay}>
        <View
          style={[
            CourseActionStyles.assignmentModalContent,
            { backgroundColor: colors.backgroundSecondary },
          ]}
        >
          <Text
            style={[
              CourseActionStyles.modalTitle,
              { color: colors.textDarker },
            ]}
          >
            Create New Assignment
          </Text>

          <TextInput
            style={[
              CourseActionStyles.input,
              { color: colors.text, borderColor: colors.border },
            ]}
            placeholder="Assignment Title (e.g. Mid-term Project)"
            value={title}
            multiline
            onChangeText={setTitle}
            placeholderTextColor={colors.inputTextHolder}
          />
          <Text style={[CourseActionStyles.label, { color: colors.text }]}>
            Description:
          </Text>
          <TextInput
            style={[
              CourseActionStyles.input,
              { color: colors.text, borderColor: colors.border },
            ]}
            placeholder="Instructions / Description (Optional)"
            multiline
            value={description}
            onChangeText={setDescription}
            placeholderTextColor={colors.inputTextHolder}
          />

          {/* Submission Info Input Field */}
          <Text style={[CourseActionStyles.label, { color: colors.text }]}>
            Submission Routing Instructions:
          </Text>
          <TextInput
            style={[
              CourseActionStyles.input,
              { color: colors.text, borderColor: colors.border },
            ]}
            placeholder="e.g. Submit to your course rep"
            value={submissionInfo}
            onChangeText={setSubmissionInfo}
            placeholderTextColor={colors.inputTextHolder}
          />

          <TouchableOpacity
            style={[
              CourseActionStyles.dateSelector,
              { backgroundColor: colors.btnColor },
            ]}
            onPress={() => setOpen(true)}
          >
            <MaterialIcons
              name="calendar-month-outlined"
              size={20}
              color={colors.btnTextColor}
            />
            <Text
              style={[
                CourseActionStyles.dateText,
                { color: colors.btnTextColor },
              ]}
            >
              Due: {date.toDateString()}
            </Text>
          </TouchableOpacity>

          <DatePicker
            modal
            open={open}
            date={date}
            mode="datetime"
            minimumDate={new Date()}
            onConfirm={datei => {
              setOpen(false);
              setDate(datei);
            }}
            onCancel={() => setOpen(false)}
          />

          {/* Fixed Submission Mode View */}
          <Text style={[CourseActionStyles.label, { color: colors.text }]}>
            Submission Method:
          </Text>
          <Text
            style={[
              CourseActionStyles.methodBtnText,
              { color: colors.primary },
            ]}
          >
            Physical Submission Only
          </Text>

          {/* Asset Attachment Actions Panel */}
          <Text style={[CourseActionStyles.label, { color: colors.text }]}>
            Attachment Brief (Optional):
          </Text>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 15 }}>
            <TouchableOpacity
              style={[
                CourseActionStyles.filePickerBtn,
                { borderColor: colors.primary },
              ]}
              onPress={handlePickFile}
            >
              <MaterialIcons
                name="insert-drive-file-outlined"
                size={18}
                color={colors.primary}
              />
              <Text
                style={[
                  CourseActionStyles.filePickerText,
                  { color: colors.primary },
                ]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {selectedFile && selectedFile.type.includes('application')
                  ? selectedFile.name
                  : 'Pick Document'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                CourseActionStyles.filePickerBtn,
                { borderColor: colors.primary },
              ]}
              onPress={handlePickImage}
            >
              <MaterialIcons
                name="image-outlined"
                size={18}
                color={colors.primary}
              />
              <Text
                style={[
                  CourseActionStyles.filePickerText,
                  { color: colors.primary },
                ]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {selectedFile && selectedFile.type.includes('image')
                  ? selectedFile.name
                  : 'Pick Image'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={CourseActionStyles.modalActions}>
            <TouchableOpacity
              style={[
                CourseActionStyles.cancelBtn,
                { borderColor: colors.primary },
              ]}
              onPress={onClose}
              disabled={isSaving || isUploadingMedia}
            >
              <Text
                style={[
                  CourseActionStyles.cancelBtnText,
                  { color: colors.primary },
                ]}
              >
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                CourseActionStyles.saveBtn,
                { backgroundColor: colors.btnColor },
              ]}
              onPress={handleCreate}
              disabled={isUploadingMedia}
            >
              <Text
                style={[
                  CourseActionStyles.saveBtnText,
                  { color: colors.btnTextColor },
                ]}
              >
                {isUploadingMedia
                  ? 'Uploading Asset...'
                  : isSaving
                  ? 'Creating...'
                  : 'Add Assignment'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
export const AddExceptionModal = ({
  visible,
  onClose,
  course,
  user,
  onSave,
  isSaving,
  lectures,
}: AddExceptionProps) => {
  const { colors } = useTheme();
  const [category, setCategory] =
    useState<CourseException['reasonCategory']>('Personal');
  const [reason, setReason] = useState('');
  const [lectureId, setLectureId] = useState('');
  const futureLectures =
    lectures.filter(l => {
      const lectureDate = new Date(l.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return lectureDate >= today;
    }) || [];

  const handleSubmit = () => {
    if (!reason.trim() || !lectureId) {
      return Toast.show({
        type: 'error',
        text1: 'Please select a lecture and provide a reason.',
        position: 'bottom',
      });
    }

    const newException: Partial<CourseException> = {
      studentId: user.uid,
      studentInfo: {
        fullname: `${user.firstname} ${user.lastname}`,
        matricNumber: user.matricNumber,
      },
      courseInfo: {
        courseTitle: course.courseTitle,
        courseCode: course.courseCode,
      },
      courseId: course.courseId,
      lectureId: lectureId,
      reasonCategory: category,
      reason: reason,
      status: 'pending',
      date: new Date().toISOString(),
    };
    onSave(newException);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <Pressable style={CourseActionStyles.modalOverlay} onPress={onClose}>
        <TouchableWithoutFeedback>
          <View
            style={[
              CourseActionStyles.exceptionModalContent,
              { backgroundColor: colors.backgroundSecondary },
            ]}
          >
            <Text
              style={[
                CourseActionStyles.modalTitle,
                { color: colors.textDarker },
              ]}
            >
              Request Exception
            </Text>
            <Text
              style={[CourseActionStyles.modalSubtitle, { color: colors.text }]}
            >
              {course.courseTitle}
            </Text>
            <Text style={[CourseActionStyles.label, { color: colors.text }]}>
              Which lecture will you be missing?
            </Text>
            <View
              style={[
                CourseActionStyles.pickerContainer,
                { borderColor: colors.border },
              ]}
            >
              <Picker
                selectedValue={lectureId}
                onValueChange={itemValue => setLectureId(itemValue)}
              >
                <Picker.Item
                  label="Select lecture..."
                  value=""
                  color={colors.inputTextHolder}
                />
                {futureLectures.map(l => (
                  <Picker.Item
                    key={l.id}
                    label={`${l.topicName} (${new Date(
                      l.date,
                    ).toLocaleDateString()})`}
                    value={l.id}
                    color={colors.text}
                  />
                ))}
              </Picker>
            </View>
            <Text style={[CourseActionStyles.label, { color: colors.text }]}>
              Reason Category
            </Text>
            <View style={CourseActionStyles.categoryGrid}>
              {(
                [
                  'Medical',
                  'Family Emergency',
                  'Technical Issue',
                  'Personal',
                  'Other',
                ] as const
              ).map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    CourseActionStyles.catBtn,
                    { borderColor: colors.border },
                    category === cat && CourseActionStyles.catBtnActive,
                  ]}
                  onPress={() => setCategory(cat)}
                >
                  <Text
                    style={[
                      CourseActionStyles.catBtnText,
                      category === cat
                        ? { color: '#fff' }
                        : { color: colors.text },
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={[CourseActionStyles.textArea, { color: colors.text }]}
              placeholder="Explain your reason in detail..."
              multiline
              numberOfLines={5}
              value={reason}
              onChangeText={setReason}
              placeholderTextColor={colors.inputTextHolder}
            />

            <View
              style={[
                CourseActionStyles.costWarning,
                { borderLeftColor: colors.primary },
              ]}
            >
              <MaterialIcons
                name="info-outlined"
                size={16}
                color={colors.primary}
              />
              <Text
                style={[CourseActionStyles.costText, { color: colors.primary }]}
              >
                0.5 iCash will be deducted upon submission.
              </Text>
            </View>

            <View style={CourseActionStyles.modalActions}>
              <TouchableOpacity
                style={[
                  CourseActionStyles.cancelBtn,
                  { borderColor: colors.btnColor },
                ]}
                onPress={onClose}
              >
                <Text
                  style={[
                    CourseActionStyles.cancelBtnText,
                    { color: colors.btnTextColor },
                  ]}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  CourseActionStyles.saveBtn,
                  { backgroundColor: colors.btnColor },
                ]}
                onPress={handleSubmit}
                disabled={isSaving}
              >
                <Text style={CourseActionStyles.saveBtnText}>
                  {isSaving ? 'Submitting...' : 'Submit Request'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Pressable>
    </Modal>
  );
};
export const DetailHeader = ({
  onBack,
  title,
  searchQuery,
  setSearchQuery,
  placeholder,
  userRole, // Destructure userRole
}: HeaderProps) => {
  // Logic: Hide search bar ONLY if it's Assessments AND user is a student
  const shouldShowSearch = !(title === 'Assessments' && userRole === 'student');

  return (
    <View style={CourseActionStyles.headerContainer}>
      <View style={CourseActionStyles.headerTop}>
        <TouchableOpacity
          onPress={onBack}
          style={CourseActionStyles.backButton}
        >
          <Icon name="chevron-left" size={32} color={PRIMARY_COLOR} />
        </TouchableOpacity>

        <View style={CourseActionStyles.titleContainer}>
          <Text style={CourseActionStyles.headerPageTitle}>{title}</Text>
          <Logo />
        </View>
        <View style={{ width: 40 }} />
      </View>

      {shouldShowSearch && (
        <View style={CourseActionStyles.searchBarWrapper}>
          <View style={CourseActionStyles.searchBarInner}>
            <Icon
              name="magnify"
              size={20}
              color="#888"
              style={CourseActionStyles.searchIcon}
            />
            <TextInput
              style={CourseActionStyles.searchInput}
              placeholder={placeholder || `Search ${title}...`}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor="#999"
              clearButtonMode="while-editing"
            />
            {/* Android Clear Button Logic */}
            {searchQuery.length > 0 && Platform.OS === 'android' && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Icon name="close-circle" size={18} color="#999" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </View>
  );
};
export const RenderContents = ({
  course,
  userRole,
  searchQuery,
  onRefresh,
}: {
  course: Course;
  userRole: string;
  searchQuery: string;
  onRefresh: () => void;
}) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [contents, setContents] = useState<string[]>(
    course.courseContents || [],
  );
  const [isModalVisible, setModalVisible] = useState(false);
  const [currentText, setCurrentText] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const filteredData = contents.filter(
    (item: any) =>
      item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.url
        ?.split('/')
        .pop()
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()),
  );

  const openModal = (index: number | null = null) => {
    setEditingIndex(index);
    setCurrentText(index !== null ? contents[index] : '');
    setModalVisible(true);
  };
  const handleSave = async () => {
    if (!currentText.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Empty Topic',
        position: 'bottom',
        bottomOffset: insets.bottom || 20,
      });
      return;
    }

    let result;
    if (editingIndex !== null) {
      result = await updateCourseContent(
        course.courseId,
        editingIndex,
        currentText,
      );
    } else {
      result = await createCourseContent(course.courseId, currentText);
    }

    if (result.success) {
      setContents(
        result.data ||
          (editingIndex !== null
            ? contents.map((t, idx) => (idx === editingIndex ? currentText : t))
            : [...contents, currentText]),
      );

      setModalVisible(false);
      Toast.show({
        type: 'success',
        text1: editingIndex !== null ? 'Topic Updated' : 'Topic Added',
        position: 'bottom',
        bottomOffset: insets.bottom || 20,
      });
    } else {
      Toast.show({
        type: 'error',
        text1: 'Sync Error',
        text2: result.error,
        position: 'bottom',
        bottomOffset: insets.bottom || 20,
      });
    }
  };
  const confirmDelete = (index: number) => {
    Alert.alert(
      'Delete Topic?',
      `Are you sure you want to remove "${contents[index]}" from ${course.courseTitle}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteCourseContent(course.courseId, index);
            if (result.success) {
              setContents(contents.filter((_, i) => i !== index));
              Toast.show({
                type: 'success',
                text1: 'Topic Removed',
                position: 'bottom',
                bottomOffset: insets.bottom || 20,
              });
            } else {
              Toast.show({
                type: 'error',
                text1: 'Delete Failed',
                text2: result.error,
                position: 'bottom',
                bottomOffset: insets.bottom || 20,
              });
            }
          },
        },
      ],
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={filteredData}
        keyExtractor={(_, i) => i.toString()}
        contentContainerStyle={[
          CourseActionStyles.listPadding,
          { paddingBottom: insets.bottom + 20 },
        ]}
        ListHeaderComponent={
          <Text
            style={[
              CourseActionStyles.sectionSubtitle,
              { color: colors.textDarker },
            ]}
          >
            {userRole === 'lecturer'
              ? 'Curriculum Management'
              : 'Syllabus Overview'}
          </Text>
        }
        renderItem={({ item, index }) => {
          return (
            <View
              style={[
                CourseActionStyles.contentRow,
                { backgroundColor: colors.backgroundSecondary },
              ]}
            >
              <View style={CourseActionStyles.numberCircle}>
                <Text
                  style={[
                    CourseActionStyles.numberText,
                    { color: colors.text },
                  ]}
                >
                  Wk {index + 1}
                </Text>
              </View>
              <Text
                style={[CourseActionStyles.topicText, { color: colors.text }]}
              >
                {item}
              </Text>

              {userRole === 'lecturer' && (
                <View style={CourseActionStyles.actionRow}>
                  <TouchableOpacity
                    onPress={() => openModal(index)}
                    style={CourseActionStyles.iconBtn}
                  >
                    <MaterialIcons
                      name="edit"
                      size={20}
                      color={colors.primary}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => confirmDelete(index)}
                    style={CourseActionStyles.iconBtn}
                  >
                    <MaterialIcons
                      name="delete-outlined"
                      size={20}
                      color={colors.primary}
                    />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        }}
        ListFooterComponent={
          userRole === 'lecturer' ? (
            <TouchableOpacity
              style={[
                CourseActionStyles.addContentBtn,
                { borderColor: colors.primary },
              ]}
              onPress={() => openModal()}
            >
              <MaterialIcons name="add" size={20} color={colors.primary} />
              <Text
                style={[
                  CourseActionStyles.addContentText,
                  { color: colors.primary },
                ]}
              >
                Add New Topic
              </Text>
            </TouchableOpacity>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            iconName="search-off"
            title="Course Contents Not Found"
            subtitle={
              userRole === 'lecturer'
                ? "You haven't uploaded any course content yet."
                : "Your Instructor hasn't uploaded any course content for this course yet."
            }
            buttonText={userRole === 'lecturer' ? 'Add First Topic' : 'Refresh'}
            onPress={userRole === 'lecturer' ? () => openModal() : onRefresh}
          />
        }
      />
      <Modal visible={isModalVisible} transparent animationType="fade">
        <Pressable
          style={CourseActionStyles.modalOverlay}
          onPress={() => setModalVisible(false)}
        >
          <TouchableWithoutFeedback>
            <View style={CourseActionStyles.centeredView}>
              <View
                style={[
                  CourseActionStyles.editModalContent,
                  { backgroundColor: colors.backgroundSecondary },
                ]}
              >
                <Text
                  style={[
                    CourseActionStyles.modalTitle,
                    { color: colors.textDarker },
                  ]}
                >
                  {editingIndex !== null
                    ? 'Edit Existing Topic'
                    : 'Add New Topic'}
                </Text>
                <TextInput
                  style={[
                    CourseActionStyles.input,
                    { color: colors.text, borderColor: colors.border },
                  ]}
                  value={currentText}
                  onChangeText={setCurrentText}
                  placeholder="Enter topic name..."
                  autoFocus
                  placeholderTextColor={colors.primaryTint}
                />
                <View style={CourseActionStyles.modalActions}>
                  <TouchableOpacity
                    style={[
                      CourseActionStyles.cancelBtn,
                      { borderColor: colors.border },
                    ]}
                    onPress={() => setModalVisible(false)}
                  >
                    <Text
                      style={[
                        CourseActionStyles.cancelBtnText,
                        { color: colors.primary },
                      ]}
                    >
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      CourseActionStyles.saveBtn,
                      { backgroundColor: colors.btnColor },
                    ]}
                    onPress={handleSave}
                  >
                    <Text
                      style={[
                        CourseActionStyles.saveBtnText,
                        { color: colors.btnTextColor },
                      ]}
                    >
                      Save Changes
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </Pressable>
      </Modal>
    </View>
  );
};
export const RenderMaterials = ({
  course,
  lectures,
  userRole,
  searchQuery,
  onRefresh,
}: {
  course: Course;
  searchQuery: string;
  lectures: Lecture[];
  userRole: string;
  onRefresh: () => void;
}) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [isUploading, setIsUploading] = useState(false);
  const [refreshing, _setRefreshing] = useState(false);
  const combinedResources = [
    ...(course.resources || []).map(res => ({
      title: 'General Reference',
      url: res,
      type: 'Course',
    })),
    ...lectures.flatMap(l =>
      (l.resources || []).map(res => ({
        title: l.topicName,
        url: res,
        type: 'Lecture',
      })),
    ),
  ];
  const handleDownload = async (url: string, fileName: string) => {
    try {
      if (Platform.OS === 'ios') {
        await Linking.openURL(url);
        return;
      }
      if (Platform.OS === 'android' && Platform.Version < 33) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) return;
      }

      const downloadPath = `${RNFS.DownloadDirectoryPath}/${fileName}`;
      Toast.show({ type: 'info', text1: 'Downloading...', position: 'bottom' });

      const result = RNFS.downloadFile({
        fromUrl: url,
        toFile: downloadPath,
      });
      await result.promise;
      Toast.show({
        type: 'success',
        text1: 'Download Complete',
        text2: `Saved to Downloads`,
      });
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Download Failed' });
    }
  };
  const handleAddMaterial = async () => {
    try {
      const pickerResult = await DocumentPicker.pickSingle({
        type: [
          DocumentPicker.types.pdf,
          DocumentPicker.types.images,
          DocumentPicker.types.docx,
        ],
      });

      setIsUploading(true);
      const firebaseResult = await uploadFileToFirebaseClient(
        pickerResult.uri,
        'course-materials',
      );

      if (!firebaseResult.success || !firebaseResult.data?.permanentUrl) {
        throw new Error(
          firebaseResult.message || 'Cloud storage processing failed.',
        );
      }
      Toast.show({ type: 'info', text1: 'Finalizing setup with server...' });
      const apiResult = await saveCourseMaterial(course.courseId, {
        materialUrl: firebaseResult.data.permanentUrl,
        title: pickerResult.name || 'Untitled Document',
      });
      if (apiResult.success) {
        onRefresh();
        Toast.show({
          type: 'success',
          text1: 'Material Uploaded Successfully',
        });
      } else {
        throw new Error(
          apiResult.error || 'Backend pipeline synchronization failed.',
        );
      }
    } catch (err) {
      if (DocumentPicker.isCancel(err)) {
        // Intentional exit execution if user cancels file context explorer
        return;
      }
      console.error('Pipeline breakdown caught: ', err);
      Toast.show({
        type: 'error',
        text1: 'Upload failed',
        text2: err instanceof Error ? err.message : 'Please try again later',
      });
    } finally {
      setIsUploading(false);
    }
  };
  const processDeletion = async (url: string) => {
    try {
      setIsUploading(true);
      const apiResult = await deleteCourseMaterial(course.courseId, {
        materialUrl: url,
      });
      if (apiResult.success) {
        Toast.show({ type: 'success', text1: 'Material Deleted Successfully' });
        onRefresh();
      } else {
        throw new Error(apiResult.error || 'Backend failed to delete asset.');
      }
    } catch (err) {
      console.error('Deletion Pipeline Failure: ', err);
      Toast.show({
        type: 'error',
        text1: 'Deletion failed',
        text2: err instanceof Error ? err.message : 'Please try again',
      });
    } finally {
      setIsUploading(false);
    }
  };
  const handleDelete = (url: string) => {
    const fileName = url.split('/').pop() || 'this document';

    Alert.alert(
      'Delete Material',
      `Are you sure you want to permanently delete "${fileName}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => processDeletion(url),
        },
      ],
      { cancelable: true },
    );
  };
  const filteredData = combinedResources.filter(
    item =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.url
        .split('/')
        .pop()
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()),
  );

  return (
    <FlatList
      data={filteredData}
      keyExtractor={(_, i) => i.toString()}
      refreshing={refreshing}
      onRefresh={onRefresh}
      contentContainerStyle={[
        CourseActionStyles.listPadding,
        { paddingBottom: insets.bottom + 20 },
      ]}
      ListHeaderComponent={
        <View
          style={[
            CourseActionStyles.rowBetween,
            { backgroundColor: colors.backgroundSecondary },
          ]}
        >
          <Text
            style={[
              CourseActionStyles.sectionSubtitle,
              { color: colors.textDarker },
            ]}
          >
            Course Materials
          </Text>
          {userRole === 'lecturer' && (
            <TouchableOpacity
              style={[
                CourseActionStyles.addButton,
                { backgroundColor: colors.btnColor },
              ]}
              onPress={handleAddMaterial}
              disabled={isUploading}
            >
              <Text
                style={[
                  CourseActionStyles.addBtnText,
                  { color: colors.btnTextColor },
                ]}
              >
                {isUploading ? 'Uploading...' : 'Add Material'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      }
      renderItem={({ item }) => {
        const fileName = item.url.split('/').pop() || 'document.pdf';
        return (
          <View
            style={[
              CourseActionStyles.materialCard,
              { backgroundColor: colors.backgroundSecondary },
            ]}
          >
            <MaterialIcons
              name="picture-as-pdf-outlined"
              size={32}
              color={colors.primary}
            />
            <View style={{ flex: 1, marginLeft: 12, paddingHorizontal: 4 }}>
              <Text
                style={[
                  CourseActionStyles.materialTitle,
                  { color: colors.textDarker },
                ]}
                numberOfLines={2}
              >
                {item.title}
              </Text>
              <View style={CourseActionStyles.rowButtons}>
                <TouchableOpacity
                  style={CourseActionStyles.downloadCircle}
                  onPress={() => handleDownload(item.url, fileName)}
                >
                  <MaterialIcons
                    name="file-download-outlined"
                    size={20}
                    color={colors.primary}
                  />
                </TouchableOpacity>
                {userRole === 'lecturer' && (
                  <TouchableOpacity
                    style={CourseActionStyles.downloadCircle}
                    onPress={() => handleDelete(item.url)}
                  >
                    <MaterialIcons
                      name="delete-outlined"
                      size={20}
                      color={colors.primary}
                    />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        );
      }}
      ListEmptyComponent={
        <EmptyState
          iconName="search-off"
          title="No Materials Found"
          subtitle={
            userRole === 'lecturer'
              ? "You haven't uploaded any resources yet."
              : "Your Instructor hasn't uploaded any materials for this course yet."
          }
          buttonText={userRole === 'lecturer' ? 'Upload PDF' : undefined}
          onPress={handleAddMaterial}
        />
      }
    />
  );
};
export const RenderAssignments = ({
  course,
  userRole,
  searchQuery,
}: {
  course: Course;
  userRole: string;
  searchQuery: string;
}) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [isModalVisible, setModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [localAssignments, setLocalAssignments] = useState<Assignment[]>(
    course.assignments || [],
  );
  const filteredData = localAssignments.filter(
    (item: any) =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.url
        .split('/')
        .pop()
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()),
  );
  const isPastDue = (dueDate: string) => {
    return new Date() > new Date(dueDate);
  };
  const fetchAssignments = async () => {
    try {
      const response = await fetchAllAssignments(course.courseId);
      if (response.success) {
        setLocalAssignments(response.data);
      }
    } catch (error) {
      console.error('Refresh assignments failed:', error);
    }
  };
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAssignments();
    setRefreshing(false);
  };
  const handleAssignmentDelete = (
    assignmentId: string,
    assignmentTitle: string,
  ) => {
    Alert.alert(
      'Delete Assignment?',
      `Are you sure you want to permanently delete "${assignmentTitle}"? This will also remove all student submissions and cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await deleteAssignment(
                course.courseId,
                assignmentId,
              );
              if (result.success) {
                Toast.show({
                  type: 'success',
                  text1: 'Assignment Removed',
                  position: 'bottom',
                  bottomOffset: insets.bottom > 0 ? insets.bottom : 20,
                });
                if (onRefresh) onRefresh();
              } else {
                Toast.show({
                  type: 'error',
                  text1: 'Deletion Failed',
                  text2:
                    result.error ||
                    'Could not remove assignment, please try again.',
                  position: 'bottom',
                  bottomOffset: insets.bottom > 0 ? insets.bottom : 20,
                });
              }
            } catch (error: any) {
              Toast.show({
                type: 'error',
                text1: 'Network Error',
                text2: error.message || 'Server connection timed out.',
                position: 'bottom',
                bottomOffset: insets.bottom > 0 ? insets.bottom : 20,
              });
            }
          },
        },
      ],
      { cancelable: true },
    );
  };

  return (
    <>
      <FlatList
        data={filteredData || []}
        refreshing={refreshing}
        onRefresh={onRefresh}
        keyExtractor={(item, i) => item.id || i.toString()}
        contentContainerStyle={[
          CourseActionStyles.listPadding,
          { paddingBottom: insets.bottom + 20 },
        ]}
        ListHeaderComponent={
          <View
            style={[
              CourseActionStyles.rowBetween,
              { backgroundColor: colors.backgroundSecondary },
            ]}
          >
            <Text
              style={[
                CourseActionStyles.sectionSubtitle,
                { color: colors.textDarker },
              ]}
            >
              Assignments & Tasks
            </Text>
            {userRole === 'lecturer' && (
              <TouchableOpacity
                style={[
                  CourseActionStyles.addButton,
                  { backgroundColor: colors.btnColor },
                ]}
                onPress={() => setModalVisible(true)}
              >
                <Text
                  style={[
                    CourseActionStyles.addBtnText,
                    { color: colors.btnTextColor },
                  ]}
                >
                  Create
                </Text>
              </TouchableOpacity>
            )}
          </View>
        }
        renderItem={({ item }) => {
          const overdue = isPastDue(item.dueDate);

          return (
            <View
              style={[
                CourseActionStyles.assignmentCard,
                { backgroundColor: colors.backgroundSecondary },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={[
                    CourseActionStyles.assignmentName,
                    { color: colors.text },
                  ]}
                >
                  {item.title}
                </Text>
                <Text
                  style={[
                    CourseActionStyles.methodText,
                    { color: colors.text },
                  ]}
                >
                  Method of Submission: {item.submissionMethod}
                </Text>
                <Text
                  style={[
                    CourseActionStyles.dueDate,
                    overdue
                      ? { color: colors.primary }
                      : { color: colors.text },
                  ]}
                >
                  {overdue ? 'Past Due: ' : 'Due: '} {formatDate(item.dueDate)}
                </Text>
              </View>
              {userRole === 'lecturer' && !overdue && (
                <TouchableOpacity
                  style={[
                    CourseActionStyles.statusTag,
                    { backgroundColor: colors.btnColor },
                  ]}
                  onPress={() => handleAssignmentDelete(item.id, item.title)}
                >
                  <MaterialIcons
                    name="delete-outlined"
                    color={colors.primary}
                    size={20}
                  />
                </TouchableOpacity>
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            iconName="content-paste-off-outlined"
            title="No Assignments Posted"
            subtitle="Check back later for upcoming tasks and deadlines."
            buttonText={
              userRole === 'lecturer' ? 'Create Assignment' : undefined
            }
            onPress={() => setModalVisible(true)}
          />
        }
      />
      <CreateAssignmentModal
        visible={isModalVisible}
        courseId={course.courseId}
        onClose={() => setModalVisible(false)}
        onRefresh={onRefresh}
        colors={colors}
      />
    </>
  );
};
export const RenderStudentExceptions = ({
  exceptions,
  user,
  onAddPress,
  searchQuery,
  refreshing,
  onRefresh,
}: StudentExceptionsProps) => {
  const { colors } = useTheme();
  const currentPlan = user.tier || 'free';
  const planLimit = EXCEPTION_ACCOUNT_LIMITS[currentPlan];
  const filteredData = exceptions.filter(item => {
    const title = item.courseInfo?.courseTitle?.toLowerCase() ?? '';
    const code = item.courseInfo?.courseCode?.toLowerCase() ?? '';
    const category = item.reasonCategory?.toLowerCase() ?? '';
    const query = searchQuery.toLowerCase();
    return (
      title.includes(query) || code.includes(query) || category.includes(query)
    );
  });
  const usedThisMonth = exceptions.filter(e => {
    const date = new Date(e.createdAt);
    const now = new Date();
    return (
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear()
    );
  }).length;
  const hasExceededLimit = usedThisMonth >= planLimit;
  const hasInsufficientPoints = (user.pointsBalance || 0) < 1.0;
  const isDisabled = hasExceededLimit || hasInsufficientPoints;
  const getDisabledReason = () => {
    if (hasExceededLimit)
      return `Monthly ${currentPlan} tier limit reached (${planLimit}/${planLimit})`;
    if (hasInsufficientPoints) return 'Insufficient iCash (0.5 iCash required)';
    return '';
  };

  return (
    <FlatList
      data={filteredData}
      refreshing={refreshing}
      onRefresh={onRefresh}
      keyExtractor={item => item.id}
      contentContainerStyle={CourseActionStyles.listPadding}
      ListHeaderComponent={
        <View
          style={[
            CourseActionStyles.headerWrapper,
            { backgroundColor: colors.backgroundSecondary },
          ]}
        >
          <View style={CourseActionStyles.tierInfoCard}>
            <View style={CourseActionStyles.usageHeader}>
              <Text
                style={[
                  CourseActionStyles.tierLabel,
                  { color: colors.textDarker },
                ]}
              >
                {currentPlan.toUpperCase()} plan
              </Text>
              <Text
                style={[CourseActionStyles.usageText, { color: colors.text }]}
              >
                {usedThisMonth} / {planLimit} used
              </Text>
            </View>
            <Text
              style={[CourseActionStyles.resetText, { color: colors.primary }]}
            >
              {isDisabled
                ? getDisabledReason()
                : 'Resets on the 1st of next month'}
            </Text>
          </View>
          {!isDisabled && (
            <TouchableOpacity
              style={[
                CourseActionStyles.addBtn,
                { backgroundColor: colors.btnColor },
              ]}
              onPress={onAddPress}
            >
              <MaterialIcons name="add" size={20} color={colors.primary} />
              <Text
                style={[
                  CourseActionStyles.addBtnText2,
                  { color: colors.btnTextColor },
                ]}
              >
                Request Exception
              </Text>
            </TouchableOpacity>
          )}
        </View>
      }
      renderItem={({ item }) => (
        <View
          style={[
            CourseActionStyles.exceptionCard,
            { backgroundColor: colors.backgroundSecondary },
          ]}
        >
          <View style={{ flex: 1 }}>
            <Text
              style={[CourseActionStyles.courseIdText, { color: colors.text }]}
            >
              {item.courseInfo.courseTitle}
            </Text>
            <Text
              style={[CourseActionStyles.reasonText, { color: colors.text }]}
              numberOfLines={2}
            >
              {item.reasonCategory}: {item.reason}
            </Text>
            <Text
              style={[CourseActionStyles.dateText2, { color: colors.text }]}
            >
              {new Date(item.date).toLocaleDateString()}
            </Text>
          </View>
          <View style={CourseActionStyles.statusBadge}>
            <MaterialIcons
              name={
                item.status === 'approved'
                  ? 'check-circle-outlined'
                  : item.status === 'rejected'
                  ? 'error-outline-outlined'
                  : 'access-time-outlined'
              }
              size={14}
              color={colors.primary}
              style={{ marginRight: 4 }}
            />
            <Text
              style={[
                CourseActionStyles.statusLabel,
                { color: colors.primary },
              ]}
            >
              {item.status}
            </Text>
          </View>
        </View>
      )}
      ListEmptyComponent={
        <EmptyState
          iconName="search-off"
          title="No Exceptions Found"
          subtitle="All your course registrations are currently within normal limits."
        />
      }
    />
  );
};
export const RenderLecturerExceptionsManage = ({
  exceptions,
  onUpdateStatus,
  searchQuery,
  refreshing,
  onRefresh,
}: LecturerManageProps) => {
  const { colors } = useTheme();
  const filteredData = exceptions.filter(item => {
    const title = item.courseInfo?.courseTitle?.toLowerCase() ?? '';
    const code = item.courseInfo?.courseCode?.toLowerCase() ?? '';
    const category = item.reasonCategory?.toLowerCase() ?? '';
    const query = searchQuery.toLowerCase();
    return (
      title.includes(query) || code.includes(query) || category.includes(query)
    );
  });
  return (
    <FlatList
      data={filteredData}
      refreshing={refreshing}
      onRefresh={onRefresh}
      keyExtractor={item => item.id}
      renderItem={({ item }) => (
        <View
          style={[
            CourseActionStyles.manageCard,
            {
              backgroundColor: colors.backgroundSecondary,
              borderBottomColor: colors.border,
            },
          ]}
        >
          <View style={CourseActionStyles.rowBetween}>
            <Text
              style={[
                CourseActionStyles.studentName,
                { color: colors.textDarker },
              ]}
            >
              {item.studentInfo.fullname || 'Unknown Student'}
            </Text>
            <Text
              style={[CourseActionStyles.matricText, { color: colors.text }]}
            >
              {item.studentInfo.matricNumber}
            </Text>
          </View>
          {item.reasonCategory && (
            <Text
              style={[
                CourseActionStyles.categoryLabel,
                { color: colors.primary },
              ]}
            >
              {item.reasonCategory}
            </Text>
          )}
          <Text style={[CourseActionStyles.reasonBody, { color: colors.text }]}>
            {item.reason}
          </Text>

          {item.status === 'pending' ? (
            <View style={CourseActionStyles.actionRow2}>
              <TouchableOpacity
                style={CourseActionStyles.approveBtn}
                onPress={() => onUpdateStatus(item.id, 'approved')}
              >
                <MaterialIcons
                  name="check-circle-outlined"
                  size={22}
                  color={colors.primary}
                />
                <Text
                  style={[
                    CourseActionStyles.btnText,
                    { color: colors.primary, marginTop: 4 },
                  ]}
                >
                  Approve
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={CourseActionStyles.rejectBtn}
                onPress={() => onUpdateStatus(item.id, 'rejected')}
              >
                <MaterialIcons
                  name="cancel-outlined"
                  size={22}
                  color={colors.primary}
                />
                <Text
                  style={[
                    CourseActionStyles.btnText,
                    { color: colors.primary, marginTop: 4 },
                  ]}
                >
                  Reject
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={CourseActionStyles.finalStatusContainer}>
              <MaterialIcons
                name={
                  item.status === 'approved'
                    ? 'check-circle-outlined'
                    : 'cancel-outlined'
                }
                size={22}
                color={colors.primary}
                style={{ marginRight: 8 }}
              />
              <Text
                style={[
                  CourseActionStyles.finalStatusText,
                  { color: colors.primary },
                ]}
              >
                {item.status === 'approved' ? 'Approved' : 'Rejected'}
              </Text>
            </View>
          )}
        </View>
      )}
      ListEmptyComponent={
        <EmptyState
          iconName="done-all-outlined"
          title="All Caught Up!"
          subtitle="There are no pending student exceptions requiring your approval right now."
          style={{ marginTop: 80 }}
        />
      }
    />
  );
};
export const RenderScheduleLecture = ({
  course,
  onSave,
  isLoading,
}: RenderScheduleProps) => {
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [repeatWeeks, setRepeatWeeks] = useState(1);
  const [form, setForm] = useState({
    topicName: '',
    lectureType: 'Physical',
    location: '',
    videoUrl: '',
    startTime: '08:00',
    endTime: '10:00',
    date: new Date().toISOString().split('T')[0],
  });
  const getPlaceholder = () => {
    switch (form.lectureType) {
      case 'Online':
        return 'Paste iCampus or Google Meet link';
      case 'Recorded':
        return 'Paste lectures link';
      case 'Physical':
      default:
        return 'e.g. Lecture Hall 1, Room 302';
    }
  };
  const validateAndSave = () => {
    const {
      topicName,
      location,
      videoUrl,
      date,
      startTime,
      endTime,
      lectureType,
    } = form;
    const isRecorded = lectureType === 'Recorded';
    const venueValue = isRecorded ? videoUrl : location;

    if (!topicName || !date || !startTime || !endTime || !venueValue) {
      setErrorMessage(
        "All fields are required. Please ensure you've selected a topic, date, and venue/link.",
      );
      setShowErrorModal(true);
      return;
    }

    const startVal = parseInt(startTime.replace(':', ''), 10);
    const endVal = parseInt(endTime.replace(':', ''), 10);

    if (endVal <= startVal) {
      setErrorMessage(
        'The end time cannot be earlier than or equal to the start time.',
      );
      setShowErrorModal(true);
      return;
    }
    const payload: CreateLecturePayload = {
      courseId: course.courseId,
      topicName: form.topicName!,
      lectureType: form.lectureType as 'Physical' | 'Online' | 'Recorded',
      location: form.location,
      videoUrl: form.videoUrl,
      startTime: form.startTime!,
      endTime: form.endTime!,
      date: form.date!,
      repeatWeeks: repeatWeeks,
    };
    onSave(payload);
  };
  const getLabel = () => {
    switch (form.lectureType) {
      case 'Online':
        return 'Meeting Link';
      case 'Recorded':
        return 'Video URL';
      case 'Physical':
      default:
        return 'Physical Venue';
    }
  };
  const [pickerMode, setPickerMode] = useState<
    'date' | 'startTime' | 'endTime' | null
  >(null);
  const [showTopicPicker, setShowTopicPicker] = useState(false);
  const handleConfirm = (event: any, selectedDate?: Date) => {
    setPickerMode(null); // Hide picker
    if (!selectedDate) return;

    if (pickerMode === 'date') {
      setForm({ ...form, date: selectedDate.toISOString().split('T')[0] });
    } else if (pickerMode === 'startTime') {
      const time = selectedDate.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      setForm({ ...form, startTime: time });
    } else if (pickerMode === 'endTime') {
      const time = selectedDate.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      setForm({ ...form, endTime: time });
    }
  };
  useEffect(() => {
    if (course?.courseId) {
      setForm(prev => ({ ...prev, courseId: course.courseId }));
    }
  }, [course?.courseId]);
  useEffect(() => {
    if (form.lectureType === 'Online') {
      const randomHash = Math.random().toString(36).substring(7);
      const generatedLink = `https://live.icampus.com/${course.courseId}/${randomHash}`;
      setForm(prev => ({
        ...prev,
        location: generatedLink,
        videoUrl: '',
      }));
    } else if (form.lectureType === 'Recorded') {
      setForm(prev => ({ ...prev, location: 'iCampus Video Player' }));
    }
  }, [form.lectureType, course.courseId]);

  return (
    <ScrollView contentContainerStyle={{ padding: 20 }}>
      <Text style={CourseActionStyles.labelMain}>Set Lecture Schedule</Text>
      <Text style={CourseActionStyles.inputLabel}>Select Lecture Topic</Text>
      <TouchableOpacity
        style={CourseActionStyles.textInput}
        onPress={() => setShowTopicPicker(true)}
      >
        <Text style={{ color: form.topicName ? PRIMARY_COLOR_TINT : '#999' }}>
          {form.topicName || 'Choose a topic from syllabus'}
        </Text>
        <Icon name="chevron-down" size={20} color="#666" />
      </TouchableOpacity>

      <Text style={CourseActionStyles.inputLabel}>Lecture Type</Text>
      <View style={CourseActionStyles.typeToggleContainer}>
        {(['Physical', 'Online', 'Recorded'] as const).map(type => (
          <TouchableOpacity
            key={type}
            style={[
              CourseActionStyles.typeOption,
              form.lectureType === type && CourseActionStyles.typeOptionActive,
            ]}
            onPress={() => setForm({ ...form, lectureType: type })}
          >
            <Text
              style={[
                CourseActionStyles.typeOptionText,
                form.lectureType === type &&
                  CourseActionStyles.typeOptionTextActive,
              ]}
            >
              {type}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {/* 2. Dynamic Input Field */}
      <Text style={CourseActionStyles.inputLabel}>{getLabel()}</Text>
      <View style={CourseActionStyles.inputContainer}>
        <TextInput
          style={[
            CourseActionStyles.textInput,
            form.lectureType === 'Online' && {
              backgroundColor: '#E0EAEA',
              color: PRIMARY_COLOR_TINT,
            },
          ]}
          placeholder={getPlaceholder()}
          value={
            form.lectureType === 'Recorded' ? form.videoUrl : form.location
          }
          editable={form.lectureType !== 'Online'}
          onChangeText={val => {
            if (form.lectureType === 'Recorded') {
              setForm({ ...form, videoUrl: val });
            } else {
              setForm({ ...form, location: val });
            }
          }}
        />
        {form.lectureType === 'Recorded' &&
          form.videoUrl.includes('icampus.com') && (
            <View
              style={{
                backgroundColor: PRIMARY_COLOR,
                padding: 10,
                borderRadius: 10,
              }}
            >
              <Icon name="medal" size={16} color="#fff" />
            </View>
          )}
      </View>

      <View style={CourseActionStyles.dateTimeRow}>
        <TouchableOpacity
          style={CourseActionStyles.dateTimeBox}
          onPress={() => setPickerMode('date')}
        >
          <Icon name="calendar-month" size={22} color="#fff" />
          <View>
            <Text style={CourseActionStyles.microLabel}>Date</Text>
            <Text style={CourseActionStyles.dateTimeText}>
              {form.date || 'Select'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* START TIME */}
        <TouchableOpacity
          style={CourseActionStyles.dateTimeBox}
          onPress={() => setPickerMode('startTime')}
        >
          <Icon name="clock-start" size={22} color="#fff" />
          <View>
            <Text style={CourseActionStyles.microLabel}>Starts</Text>
            <Text style={CourseActionStyles.dateTimeText}>
              {form.startTime || '00:00'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* END TIME */}
        <TouchableOpacity
          style={CourseActionStyles.dateTimeBox}
          onPress={() => setPickerMode('endTime')}
        >
          <Icon name="clock-end" size={22} color="#fff" />
          <View>
            <Text style={CourseActionStyles.microLabel}>Ends</Text>
            <Text style={CourseActionStyles.dateTimeText}>
              {form.endTime || '00:00'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {pickerMode && (
        <DateTimePicker
          value={new Date()} // Current date as starting point for picker
          mode={pickerMode === 'date' ? 'date' : 'time'}
          is24Hour={true}
          display="default"
          onChange={handleConfirm}
        />
      )}
      <View style={CourseActionStyles.repeatContainer}>
        <Text style={CourseActionStyles.inputLabel}>Set Recursion?</Text>
        <View style={CourseActionStyles.repeatCounter}>
          <TouchableOpacity
            onPress={() => setRepeatWeeks(Math.max(1, repeatWeeks - 1))}
          >
            <Icon
              name="minus-circle-outline"
              size={30}
              color={PRIMARY_COLOR_TINT}
            />
          </TouchableOpacity>
          <Text style={CourseActionStyles.repeatValue}>
            {repeatWeeks} {repeatWeeks > 1 ? 'Weeks' : 'Week'}
          </Text>
          <TouchableOpacity
            onPress={() => setRepeatWeeks(Math.min(12, repeatWeeks + 1))}
          >
            <Icon
              name="plus-circle-outline"
              size={30}
              color={PRIMARY_COLOR_TINT}
            />
          </TouchableOpacity>
        </View>
      </View>
      {/* Main Confirm Button */}
      <TouchableOpacity
        style={[
          CourseActionStyles.submitButton,
          isLoading && CourseActionStyles.submitButtonDisabled,
        ]}
        onPress={validateAndSave} // Trigger the validation first
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={CourseActionStyles.submitText}>Confirm Schedule</Text>
        )}
      </TouchableOpacity>
      <Modal visible={showTopicPicker} transparent animationType="fade">
        <Pressable
          style={CourseActionStyles.modalOverlayEnd}
          onPress={() => setShowTopicPicker(false)}
        >
          <View style={CourseActionStyles.pickerContainer2}>
            <Text style={CourseActionStyles.pickerTitle}>Course Syllabus</Text>
            <FlatList
              data={course.courseContents || []}
              keyExtractor={(item, index) => index.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={CourseActionStyles.pickerItem}
                  onPress={() => {
                    setForm({ ...form, topicName: item });
                    setShowTopicPicker(false);
                  }}
                >
                  <Text style={CourseActionStyles.pickerItemText}>{item}</Text>
                  {form.topicName === item && (
                    <Icon
                      name="check-circle"
                      size={20}
                      color={PRIMARY_COLOR_TINT}
                    />
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <EmptyState
                  iconName="search-off"
                  title="No syllabus topics found."
                  subtitle={`Please add topics to the course curriculum first.`}
                />
              }
            />
          </View>
        </Pressable>
      </Modal>
      <Modal visible={showErrorModal} transparent animationType="fade">
        <View style={CourseActionStyles.alertOverlay}>
          <View style={CourseActionStyles.alertBox}>
            <Icon name="alert-circle-outline" size={50} color={PRIMARY_COLOR} />
            <Text style={CourseActionStyles.alertTitle}>
              Missing Information
            </Text>
            <Text style={CourseActionStyles.alertText}>{errorMessage}</Text>
            <TouchableOpacity
              style={CourseActionStyles.alertButton}
              onPress={() => setShowErrorModal(false)}
            >
              <Text style={CourseActionStyles.alertButtonText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};
export const RenderLecturerTestManage = ({
  course,
  refreshing,
  onRefresh,
  onSaveTest,
  tests,
  searchQuery,
  setSearchQuery,
}: LecturerTestManageProps) => {
  const { colors } = useTheme();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [pickerMode, setPickerMode] = useState<
    'date' | 'startTime' | 'endTime' | null
  >(null);
  const [loading, setLoading] = useState(false);
  const initialFormState = {
    title: '',
    duration: '30',
    dueDate: '',
    scheduledStart: '',
    totalMarks: '0',
    questions: [
      {
        id: Date.now().toString(),
        type: 'MCQ' as const,
        questionText: '',
        options: ['', '', '', ''],
        correctAnswer: '',
      },
    ],
  };
  const [testForm, setTestForm] = useState<TestFormState>(initialFormState);
  const [editingId, setEditingId] = useState<string | null>(null);
  const filteredTests = tests.filter(t =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );
  const formRef = useRef(testForm);
  useEffect(() => {
    formRef.current = testForm;
  }, [testForm]);
  const openEditModal = (test: CreateTestPayload) => {
    setTestForm({
      title: test.title,
      duration: (test.duration ?? 0).toString(),
      dueDate: test.dueDate ?? '',
      totalMarks: (test.totalMarks ?? 0).toString(),
      questions: test.questions ?? [],
      scheduledStart: test.scheduledStart ?? '',
    });
    setEditingId(test.id ?? null);
    setIsModalVisible(true);
  };
  const addQuestion = () => {
    setTestForm({
      ...testForm,
      questions: [
        ...testForm.questions,
        {
          id: (Date.now() + Math.random()).toString(),
          type: 'MCQ' as const,
          questionText: '',
          options: ['', '', '', ''],
          correctAnswer: '',
        },
      ],
    });
  };
  const updateQuestion = (id: string, updates: Partial<Question>) => {
    setTestForm(prev => ({
      ...prev,
      questions: prev.questions.map(q =>
        q.id === id ? { ...q, ...updates } : q,
      ),
    }));
  };
  const updateOption = (qId: string, optIdx: number, val: string) => {
    setTestForm(prev => ({
      ...prev,
      questions: prev.questions.map(q => {
        if (q.id === qId) {
          const newOpts = [...(q.options ?? ['', '', '', ''])];
          newOpts[optIdx] = val;
          return { ...q, options: newOpts };
        }
        return q;
      }),
    }));
  };
  const handleFinalize = (isPublished: boolean) => {
    if (!testForm.title || !testForm.dueDate) {
      Toast.show({
        type: 'error',
        text1: 'Required Fields',
        text2: 'Please provide a title and a due date.',
      });
      return;
    }
    setLoading(true);
    const currentCourse = Array.isArray(course) ? course[0] : course;
    const finalPayload: CreateTestPayload = {
      id: editingId || undefined,
      courseId: currentCourse.courseId,
      title: testForm.title,
      duration: Number(testForm.duration),
      totalMarks: Number(testForm.totalMarks),
      questions: testForm.questions as Question[],
      isPublished,
      status: isPublished ? 'published' : 'draft',
      createdAt: new Date().toISOString(),
      scheduledStart: testForm.scheduledStart,
      dueDate: testForm.dueDate,
    };
    onSaveTest(finalPayload);
    setLoading(false);
    setIsModalVisible(false);
    setTestForm(initialFormState);
    setEditingId(null);
  };
  const autoSaveDraft = useCallback(async () => {
    try {
      const currentForm = formRef.current;
      const payload: CreateTestPayload = {
        ...currentForm,
        courseId: Array.isArray(course) ? course[0]?.courseId : course.courseId,
        status: 'draft',
        isPublished: false,
        createdAt: new Date().toISOString(),
        duration: Number(currentForm.duration),
        totalMarks: Number(currentForm.totalMarks),
        questions: currentForm.questions as Question[],
      };
      onSaveTest(payload);
    } catch (err: any) {
      console.error('Auto-save sync failure', err);
    }
  }, [course, onSaveTest]);
  const removeQuestion = (id: string) => {
    setTestForm(prev => ({
      ...prev,
      questions: prev.questions.filter(q => q.id !== id),
    }));
  };
  const addOption = (qId: string) => {
    setTestForm(prev => ({
      ...prev,
      questions: prev.questions.map(q =>
        q.id === qId ? { ...q, options: [...(q.options ?? []), ''] } : q,
      ),
    }));
  };
  const removeOption = (qId: string, optIdx: number) => {
    setTestForm(prev => ({
      ...prev,
      questions: prev.questions.map(q => {
        if (q.id === qId) {
          const newOpts = (q.options ?? []).filter(
            (_, index) => index !== optIdx,
          );
          return { ...q, options: newOpts };
        }
        return q;
      }),
    }));
  };
  const handleConfirm = (event: any, selectedDate?: Date) => {
    setPickerMode(null);
    if (event.type === 'set' && selectedDate) {
      if (pickerMode === 'date') {
        const dateString = selectedDate.toISOString().split('T')[0];
        setTestForm(prev => ({ ...prev, date: dateString }));
        setTimeout(() => setPickerMode('startTime'), 500);
      } else if (pickerMode === 'startTime') {
        setTestForm(prev => ({
          ...prev,
          scheduledStart: selectedDate.toISOString(),
        }));
        setTimeout(() => setPickerMode('endTime'), 500);
      } else if (pickerMode === 'endTime') {
        setTestForm(prev => ({ ...prev, dueDate: selectedDate.toISOString() }));
      }
    }
  };
  const downloadAssessmentReport = async (
    testId: string,
    testTitle: string,
  ) => {
    try {
      if (Platform.OS === 'android' && Platform.Version < 29) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Toast.show({
            type: 'info',
            text1: 'Permission Denied',
            text2: 'Cannot save PDF without storage access.',
          });
          return;
        }
      }
      const apiResponse = await getAssessmentAnalysisUrl(testId);
      if (!apiResponse.success || !apiResponse.data?.downloadUrl) {
        Toast.show({
          type: 'error',
          text1: 'Generation Failed',
          text2:
            apiResponse.error || 'Could not retrieve report download link.',
        });
        return;
      }
      const fileUrl = apiResponse.data.downloadUrl;
      const { config, fs } = ReactNativeBlobUtil;
      const dateStr = new Date().toISOString().split('T')[0];
      const fileName = `Analysis_${testTitle.replace(
        /\s+/g,
        '_',
      )}_${dateStr}.pdf`;
      const localSavePath = `${fs.dirs.DownloadDir}/${fileName}`;
      config({
        fileCache: true,
        addAndroidDownloads: {
          useDownloadManager: true,
          notification: true,
          path: localSavePath,
          description: 'Downloading Academic Analysis Report',
          mime: 'application/pdf',
          mediaScannable: true,
        },
      })
        .fetch('GET', fileUrl)
        .then(() => {
          Toast.show({
            type: 'success',
            text1: 'Download Complete',
            text2: 'Assessment Report saved to your Downloads directory.',
          });
        })
        .catch(err => {
          console.error('File Download Engine Exception:', err);
          Toast.show({
            type: 'error',
            text1: 'Download Error',
            text2: 'Could not successfully write the file to system storage.',
          });
        });
    } catch (error) {
      console.error('Download Logic Error:', error);
      Toast.show({
        type: 'error',
        text1: 'Unexpected Error',
        text2: 'An unexpected execution issue occurred.',
      });
    }
  };
  useEffect(() => {
    if (testForm.title.trim().length === 0) return;

    const delayDebounceFn = setTimeout(() => {
      autoSaveDraft();
    }, 2000);

    return () => clearTimeout(delayDebounceFn);
  }, [testForm.title, testForm.questions.length, autoSaveDraft]);

  return (
    <View
      style={[
        CourseActionStyles.container,
        { backgroundColor: colors.backgroundSecondary },
      ]}
    >
      <FlatList
        data={filteredTests}
        refreshing={refreshing}
        onRefresh={onRefresh}
        keyExtractor={(item, index) => item.id || item._id || index.toString()}
        ListEmptyComponent={
          <EmptyState
            iconName="text-box-search-outline"
            title="No Assessments Found"
            subtitle={`No results found matching "${searchQuery}". Try a different search term.`}
            buttonText="Clear Search"
            onPress={() => setSearchQuery('')}
          />
        }
        renderItem={({ item }) => {
          const isPastDue = new Date() > new Date(item.dueDate);
          return (
            <View style={CourseActionStyles.pastTestCard}>
              <TouchableOpacity
                style={{ flex: 1 }}
                onPress={() => !isPastDue && openEditModal(item)}
                activeOpacity={isPastDue ? 1 : 0.7}
              >
                <Text
                  style={[
                    CourseActionStyles.testTitle,
                    { color: colors.textDarker },
                  ]}
                >
                  {item.title}
                </Text>
                <Text style={CourseActionStyles.testMeta}>
                  {item.questions.length} Questions •{' '}
                  {item.isPublished ? 'Published' : 'Draft'}
                </Text>
              </TouchableOpacity>
              {isPastDue && item.isPublished ? (
                <TouchableOpacity
                  style={[
                    CourseActionStyles.downloadTestBtn,
                    { backgroundColor: colors.btnColor },
                  ]}
                  onPress={() =>
                    downloadAssessmentReport(item.id!, item.title!)
                  }
                >
                  <MaterialIcons
                    name="assessment-outlined"
                    size={20}
                    color={colors.btnTextColor}
                  />
                  <Text
                    style={[
                      CourseActionStyles.downloadBtnText,
                      { color: colors.btnTextColor },
                    ]}
                  >
                    Download Assessment Analysis
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={[CourseActionStyles.downloadTestBtn]}>
                  <MaterialIcons
                    name="access-time-outlined"
                    size={20}
                    color={colors.primary}
                  />
                  <Text
                    style={[
                      CourseActionStyles.downloadBtnText,
                      { color: colors.primary },
                    ]}
                  >
                    Report pending
                  </Text>
                </View>
              )}
            </View>
          );
        }}
        ListHeaderComponent={
          <View
            style={[
              CourseActionStyles.rowBetween,
              {
                backgroundColor: colors.backgroundSecondary,
                borderBottomColor: colors.border,
              },
            ]}
          >
            <Text
              style={[
                CourseActionStyles.sectionTitle,
                { color: colors.textDarker },
              ]}
            >
              Past Assessments
            </Text>
            <TouchableOpacity
              style={[
                CourseActionStyles.createCard,
                { backgroundColor: colors.btnColor },
              ]}
              onPress={() => {
                setEditingId(null);
                setTestForm({
                  title: '',
                  duration: '',
                  dueDate: '',
                  totalMarks: '',
                  questions: [],
                  scheduledStart: '',
                });
                setIsModalVisible(true);
              }}
            >
              <MaterialIcons name="add" size={24} color={colors.btnTextColor} />
              <Text
                style={[
                  CourseActionStyles.createCardText,
                  { color: colors.btnTextColor },
                ]}
              >
                Create New Assessment
              </Text>
            </TouchableOpacity>
          </View>
        }
      />
      <Modal
        visible={isModalVisible}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <SafeAreaView
          style={{ flex: 1, backgroundColor: colors.backgroundSecondary }}
        >
          <Text
            style={[
              CourseActionStyles.headerTitle,
              { color: colors.textDarker },
            ]}
          >
            Build Assessment
          </Text>
          <ScrollView
            style={CourseActionStyles.modalBody}
            showsVerticalScrollIndicator={false}
          >
            <View style={CourseActionStyles.settingsCard}>
              <TextInput
                style={[CourseActionStyles.titleInput, { color: colors.text }]}
                placeholder="Assessment Title (e.g. Test 1)"
                placeholderTextColor={colors.inputTextHolder}
                value={testForm.title}
                onChangeText={t => setTestForm({ ...testForm, title: t })}
              />
              <View style={CourseActionStyles.settingsRow}>
                <View style={CourseActionStyles.settingItem}>
                  <Text
                    style={[
                      CourseActionStyles.microLabel2,
                      { color: colors.text },
                    ]}
                  >
                    Duration (Minutes)
                  </Text>
                  <TextInput
                    style={[
                      CourseActionStyles.settingInput,
                      { color: colors.text },
                    ]}
                    keyboardType="numeric"
                    value={testForm.duration}
                    onChangeText={val =>
                      setTestForm({ ...testForm, duration: val })
                    }
                    placeholder="eg. 30"
                    placeholderTextColor={colors.inputTextHolder}
                  />
                </View>
                <View style={CourseActionStyles.settingItem}>
                  <Text
                    style={[
                      CourseActionStyles.microLabel2,
                      { color: colors.text },
                    ]}
                  >
                    Total Marks
                  </Text>
                  <TextInput
                    style={[
                      CourseActionStyles.settingInput,
                      { color: colors.text },
                    ]}
                    keyboardType="numeric"
                    placeholder="eg. 30"
                    value={testForm.totalMarks}
                    onChangeText={val =>
                      setTestForm({ ...testForm, totalMarks: val })
                    }
                    placeholderTextColor={colors.inputTextHolder}
                  />
                </View>
              </View>
            </View>
            {testForm.questions.map((q, idx) => (
              <View key={q.id} style={CourseActionStyles.questionCard}>
                <View style={CourseActionStyles.qHeader}>
                  <Text
                    style={[
                      CourseActionStyles.qNumber,
                      { color: colors.textDarker },
                    ]}
                  >
                    Question {idx + 1}
                  </Text>
                  <TouchableOpacity onPress={() => removeQuestion(q.id)}>
                    <MaterialIcons
                      name="cancel-outlined"
                      size={22}
                      color={colors.primary}
                    />
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={[CourseActionStyles.qInput, { color: colors.text }]}
                  placeholder="Type your question here..."
                  multiline
                  value={q.questionText}
                  onChangeText={t => updateQuestion(q.id, { questionText: t })}
                  placeholderTextColor={colors.inputTextHolder}
                />
                <View style={CourseActionStyles.typeGroup}>
                  <TouchableOpacity
                    style={[
                      CourseActionStyles.typeBtn,
                      q.type === 'MCQ' && {
                        backgroundColor: colors.btnColor,
                      },
                    ]}
                    onPress={() =>
                      updateQuestion(q.id, {
                        type: 'MCQ',
                        options: ['', '', '', ''],
                      })
                    }
                  >
                    <Text
                      style={[
                        CourseActionStyles.typeText,
                        q.type === 'MCQ'
                          ? { color: colors.btnTextColor }
                          : { color: colors.text },
                      ]}
                    >
                      Multiple Choice Options
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      CourseActionStyles.typeBtn,
                      q.type === 'ShortAnswer' && {
                        backgroundColor: colors.btnColor,
                      },
                    ]}
                    onPress={() =>
                      updateQuestion(q.id, {
                        type: 'ShortAnswer',
                        options: [],
                      })
                    }
                  >
                    <Text
                      style={[
                        CourseActionStyles.typeText,
                        q.type === 'ShortAnswer'
                          ? { color: colors.btnTextColor }
                          : { color: colors.text },
                      ]}
                    >
                      Text
                    </Text>
                  </TouchableOpacity>
                </View>
                {q.type === 'MCQ' ? (
                  <>
                    {(q.options ?? []).map((opt, oIdx) => (
                      <View key={oIdx} style={CourseActionStyles.optionRow}>
                        <TouchableOpacity
                          onPress={() =>
                            updateQuestion(q.id, { correctAnswer: opt })
                          }
                          style={[
                            CourseActionStyles.radio,
                            q.correctAnswer === opt &&
                              CourseActionStyles.radioActive,
                          ]}
                        >
                          {q.correctAnswer === opt && (
                            <View style={CourseActionStyles.radioInner} />
                          )}
                        </TouchableOpacity>
                        <TextInput
                          style={[
                            CourseActionStyles.optInput,
                            { color: colors.text },
                          ]}
                          placeholder={`Option ${oIdx + 1} value...`}
                          value={opt}
                          placeholderTextColor={colors.inputTextHolder}
                          onChangeText={v => updateOption(q.id, oIdx, v)}
                        />
                        {(q.options?.length ?? 0) > 3 && (
                          <TouchableOpacity
                            onPress={() => removeOption(q.id, oIdx)}
                          >
                            <MaterialIcons
                              name="cancel-outlined"
                              size={22}
                              color={colors.primary}
                            />
                          </TouchableOpacity>
                        )}
                      </View>
                    ))}
                    <TouchableOpacity
                      onPress={() => addOption(q.id)}
                      style={[
                        CourseActionStyles.addOptionBtn,
                        { backgroundColor: colors.btnColor },
                      ]}
                    >
                      <Text
                        style={[
                          CourseActionStyles.addOptionText,
                          { color: colors.btnTextColor },
                        ]}
                      >
                        Add More Options
                      </Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <View style={CourseActionStyles.shortAnswerPreview}>
                      <Text
                        style={[
                          CourseActionStyles.previewLabel,
                          { color: colors.text },
                        ]}
                      >
                        Expected Answer
                      </Text>
                      <TextInput
                        style={[
                          CourseActionStyles.correctAnswerInput,
                          { color: colors.text },
                        ]}
                        placeholder="Set correct answer/keywords (optional for auto-grade)"
                        placeholderTextColor={colors.inputTextHolder}
                        value={q.correctAnswer}
                        onChangeText={t =>
                          updateQuestion(q.id, { correctAnswer: t })
                        }
                      />
                    </View>
                  </>
                )}
              </View>
            ))}
            <View style={CourseActionStyles.settingsCard}>
              <Text
                style={[CourseActionStyles.labelTitle, { color: colors.text }]}
              >
                Set Deadline
              </Text>
              <TouchableOpacity
                style={[
                  CourseActionStyles.datePickerTrigger,
                  { backgroundColor: colors.btnColor },
                ]}
                onPress={() => setPickerMode('date')}
              >
                <Text
                  style={[
                    CourseActionStyles.dateText,
                    { color: colors.btnTextColor },
                  ]}
                >
                  {testForm.dueDate || 'Set deadline...'}
                </Text>
                <MaterialIcons
                  name="calendar-month-outlined"
                  size={22}
                  color={colors.btnTextColor}
                />
              </TouchableOpacity>
            </View>
            {pickerMode && (
              <DateTimePicker
                value={new Date()}
                mode={pickerMode === 'date' ? 'date' : 'time'}
                is24Hour={true}
                display="default"
                onChange={handleConfirm}
              />
            )}
            <TouchableOpacity
              style={[
                CourseActionStyles.addBtn,
                { backgroundColor: colors.btnColor },
              ]}
              onPress={addQuestion}
            >
              <MaterialIcons name="add" size={22} color={colors.btnTextColor} />
              <Text
                style={[
                  CourseActionStyles.addBtnText3,
                  { color: colors.btnTextColor },
                ]}
              >
                Add Question
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleFinalize(true)}
              disabled={loading}
              style={[
                CourseActionStyles.publishHeaderBtn,
                { backgroundColor: colors.btnColor },
              ]}
            >
              <Text
                style={[
                  CourseActionStyles.publishHeaderText,
                  { color: colors.btnTextColor },
                ]}
              >
                Publish
              </Text>
            </TouchableOpacity>
            <View style={{ height: 30 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
};
export const RenderStudentTest = ({
  test,
  user,
  onSubmit,
}: StudentTestProps) => {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [shuffledQuestions, setShuffledQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isStarted, setIsStarted] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState(test.duration * 60);
  const [cheatingCount, setCheatingCount] = useState(0);
  const [finalResult, setFinalResult] = useState({ score: 0, total: 0 });
  const [isCalcVisible, setIsCalcVisible] = useState(false);
  const [expression, setExpression] = useState('');
  const [result, setResult] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const MAX_GRACES = 3;
  const activeQuestions =
    shuffledQuestions.length > 0 ? shuffledQuestions : test.questions;
  const [impersonationError, setImpersonationError] = useState<string | null>(
    null,
  );

  const [submissionMetadata, setSubmissionMetadata] = useState<{
    deviceId: string;
    startTime: string;
    isUnrecognizedDevice: boolean;
  } | null>(null);

  const appState = useRef(AppState.currentState);
  const lookAwayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cameraRef = useRef<Camera>(null);
  const device = useCameraDevice('front');
  const [isUploading, setIsUploading] = useState(false);
  const gradeShortAnswersWithAI = async (shortAnswerPairs: any[]) => {
    const prompt = `
    You are an academic grader. Compare the Student Answer against the Correct Answer for each question.
    Rate the semantic similarity on a scale of 0 to 1.
    - 1.0: Perfectly synonymous or correct.
    - 0.85+: Correct, just phrased differently.
    - Below 0.8: Incorrect or missing key information.

    Return ONLY a JSON array of objects: [{"questionId": "...", "similarityScore": 0.95}]
    
    Data: ${JSON.stringify(shortAnswerPairs)}
  `;
    const response = await callGeminiAPI(prompt);
    return JSON.parse(response);
  };
  const handlePress = (val: string) => {
    if (val === '=') {
      try {
        const evalResult = math.evaluate(expression);
        setResult(String(evalResult));
      } catch (e) {
        setResult('Error');
      }
    } else if (val === 'AC') {
      setExpression('');
      setResult('');
    } else if (val === '⌫') {
      setExpression(prev => prev.slice(0, -1));
    } else {
      setExpression(prev => prev + val);
    }
  };
  const buttons = [
    ['sin(', 'cos(', 'log(', '^'],
    ['7', '8', '9', '/'],
    ['4', '5', '6', '*'],
    ['1', '2', '3', '-'],
    ['0', '.', 'AC', '+'],
    ['pi', 'e', '⌫', '='],
  ];
  const startTestWithSecurity = async () => {
    try {
      const currentDeviceId = await getUniqueId();
      const isRecognizedDevice =
        user.sessions?.deviceType?.includes(currentDeviceId);
      if (!isRecognizedDevice) {
        Toast.show({
          type: 'error',
          text1: 'Identity Verification',
          text2:
            'This device is not recognized. Please contact your administrator.',
        });
      }
      setShuffledQuestions(shuffleArray(test.questions));
      setSubmissionMetadata({
        deviceId: currentDeviceId,
        startTime: new Date().toISOString(),
        isUnrecognizedDevice: !isRecognizedDevice,
      });
      setIsStarted(true);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Device Verification',
        text2: 'Could not initialize device for assessment.',
      });
    }
  };
  const runAutoGrade = useCallback(() => {
    let totalScore = 0;
    const gradedAnswers = activeQuestions.map((q: any) => {
      const sAns = (answers[q.id] || '').trim();
      let isCorrect = false;

      if (q.type === 'MCQ' || q.type === 'TrueFalse') {
        isCorrect = sAns === q.correctAnswer;
      } else if (q.type === 'ShortAnswer') {
        const cleanStudent = sAns.toLowerCase().replace(/[^a-z0-9]/g, '');
        const cleanCorrect = q.correctAnswer
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '');
        isCorrect =
          cleanStudent.includes(cleanCorrect) || cleanStudent === cleanCorrect;
      }

      const pointsEarned = isCorrect ? q.points : 0;
      totalScore += pointsEarned;

      return {
        questionId: q.id,
        questionText: q.questionText,
        correctAnswer: q.correctAnswer,
        studentAnswer: sAns,
        isCorrect,
        pointsEarned,
      };
    });

    return { gradedAnswers, totalScore };
  }, [activeQuestions, answers]);
  const handleFinalSubmit = useCallback(async () => {
    if (isSubmitting) return;
    setImpersonationError(null);
    setIsSubmitting(true);
    let facialVerificationStatus = 'Not Verified / Snap Failed';
    let isImpersonator = false;
    let verificationErrorMessage = '';
    try {
      if (cameraRef.current) {
        const photo = await cameraRef.current.takePhoto({
          flash: 'off',
          enableShutterSound: false,
        });
        const base64Image = await ReactNativeBlobUtil.fs.readFile(
          photo.path,
          'base64',
        );

        setIsUploading(true);
        if (user.schoolAvatarUrl) {
          const verificationResult = await verifyFacialIdentity(
            base64Image,
            user.schoolAvatarUrl,
          );
          if (verificationResult.verified === false) {
            isImpersonator = true;
            verificationErrorMessage =
              verificationResult.message || 'Face mismatch detected.';
            facialVerificationStatus = `FRAUD_BLOCKED: ${verificationErrorMessage}`;
          } else {
            facialVerificationStatus = `Verified Successfully (Match Confidence: ${verificationResult.similarity})`;
          }
        } else {
          facialVerificationStatus =
            'Skipped: Missing baseline profile configuration picture.';
        }
        setIsUploading(false);
      }
    } catch (picErr) {
      console.error('Silent authentication background error:', picErr);
    }
    if (isImpersonator) {
      setImpersonationError(verificationErrorMessage);
      setFinalResult({ score: 0, total: test.totalMarks });
      setIsFinished(true);
      setIsSubmitting(false);
      return;
    }
    const totalQuestionsCount = activeQuestions.length;
    const pointsPerQuestion =
      totalQuestionsCount > 0
        ? Number((test.totalMarks / totalQuestionsCount).toFixed(2))
        : 0;
    const normalizedQuestions = activeQuestions.map(q => ({
      ...q,
      points: pointsPerQuestion,
    }));
    const { gradedAnswers, totalScore } = runAutoGrade();
    const shortAnswersToGrade = gradedAnswers
      .filter(ans => {
        const question = normalizedQuestions.find(q => q.id === ans.questionId);
        return question?.type === 'ShortAnswer';
      })
      .map(ans => ({
        questionId: ans.questionId,
        studentAnswer: ans.studentAnswer,
        correctAnswer: ans.correctAnswer,
      }));

    let finalGradedAnswers = [...gradedAnswers];
    let finalTotalScore = totalScore;

    if (shortAnswersToGrade.length > 0) {
      try {
        const aiScores = await gradeShortAnswersWithAI(shortAnswersToGrade);
        finalGradedAnswers = gradedAnswers.map(ans => {
          const aiResult = aiScores.find(
            (res: any) => res.questionId === ans.questionId,
          );
          if (aiResult) {
            const isCorrect = aiResult.similarityScore >= 0.85;
            const targetQ = normalizedQuestions.find(
              q => q.id === ans.questionId,
            );
            const points = isCorrect ? targetQ?.points || 0 : 0;

            finalTotalScore = finalTotalScore - ans.pointsEarned + points;
            return {
              ...ans,
              isCorrect,
              pointsEarned: points,
              aiScore: aiResult.similarityScore,
            };
          }
          return ans;
        });
      } catch (error) {
        console.error('AI Grading fallback executed.', error);
      }
    }
    const sanitizedScore = Number(
      Math.min(finalTotalScore, test.totalMarks).toFixed(2),
    );

    const finalPayload: Partial<TestSubmission> = {
      testId: test.id || test._id,
      studentId: user.uid,
      studentName: `${user.firstname} ${user.lastname}`,
      matricNumber: user.matricNumber || 'N/A',
      answers: finalGradedAnswers,
      score: sanitizedScore,
      totalPossibleScore: test.totalMarks,
      status: 'submitted',
      submittedAt: new Date().toISOString(),
      proctoringData: {
        deviceId: submissionMetadata?.deviceId || 'Unknown Device',
        entrySelfieUrl: facialVerificationStatus,
        tabSwitchCount: cheatingCount,
        ipAddress: user.ipAddress?.[0] || '',
      },
      startTime: submissionMetadata?.startTime,
    };
    await onSubmit(finalPayload);
    setFinalResult({
      score: sanitizedScore,
      total: test.totalMarks,
    });
    setIsFinished(true);
    setIsSubmitting(false);
  }, [
    test,
    activeQuestions,
    user,
    runAutoGrade,
    cheatingCount,
    submissionMetadata,
    onSubmit,
    isSubmitting,
  ]);
  const onFaceStatusChange = (isLookingAtScreen: boolean) => {
    if (!isLookingAtScreen) {
      if (!lookAwayTimer.current) {
        lookAwayTimer.current = setTimeout(() => {
          setCheatingCount(prev => prev + 1);
          Toast.show({
            type: 'info',
            text1: 'Focus Warning',
            text2: 'Please keep your eyes on the screen.',
          });
        }, 7000);
      }
    } else {
      if (lookAwayTimer.current) {
        clearTimeout(lookAwayTimer.current);
        lookAwayTimer.current = null;
      }
    }
  };
  const getAdvice = (percent: number) => {
    if (percent >= 80)
      return {
        title: 'Excellent Work!',
        msg: "You've mastered this course!",
      };
    if (percent >= 50)
      return {
        title: 'Good Effort!',
        msg: 'You passed, but a little more practice will help.',
      };
    return {
      title: 'Keep Practicing',
      msg: 'Review the course materials and try again.',
    };
  };
  const downloadStudentResultSheet = async () => {
    try {
      const { gradedAnswers } = runAutoGrade();
      const dateString = new Date().toISOString().split('T')[0];

      let txtContent = `==================================================\n`;
      txtContent += `ASSESSMENT REVIEW SHEET: ${test.title}\n`;
      txtContent += `Student: ${user.firstname} ${user.lastname} (${
        user.matricNumber || 'N/A'
      })\n`;
      txtContent += `Score Captured: ${finalResult.score} / ${finalResult.total}\n`;
      txtContent += `Date: ${dateString}\n`;
      txtContent += `==================================================\n\n`;

      gradedAnswers.forEach((item, index) => {
        txtContent += `Q${index + 1}: ${item.questionText}\n`;
        txtContent += `Your Answer: ${
          item.studentAnswer || '[No Answer Provided]'
        }\n`;
        txtContent += `Correct Answer: ${item.correctAnswer}\n`;
        txtContent += `Outcome: ${item.isCorrect ? 'CORRECT' : 'INCORRECT'} (+${
          item.pointsEarned
        } Marks)\n`;
        txtContent += `--------------------------------------------------\n`;
      });

      const { fs } = ReactNativeBlobUtil;
      const sanitizeTitle = test.title.replace(/\s+/g, '_');
      const targetPath = `${
        fs.dirs.DownloadDir
      }/${sanitizeTitle}_Review_${Date.now()}.txt`;

      await fs.writeFile(targetPath, txtContent, 'utf8');

      Toast.show({
        type: 'success',
        text1: 'Saved Successfully',
        text2: 'Review paper stored inside your Downloads directory.',
      });
    } catch (err) {
      console.error('File compilation error:', err);
      Toast.show({
        type: 'error',
        text1: 'Download Failed',
        text2: 'Could not construct script record file.',
      });
    }
  };
  // 1. Detect App Switching (Minimize/Tab-out)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (
        appState.current === 'active' &&
        nextAppState.match(/inactive|background/)
      ) {
        setCheatingCount(prev => prev + 1);
        Toast.show({
          type: 'warning',
          text1: 'Warning',
          text2:
            'No switching/minimizing during tests. 3 strikes and test auto-submits.',
        });
      }
      appState.current = nextAppState;
    });
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    if (cheatingCount >= 3 || (isStarted && timeLeft === 0)) {
      handleFinalSubmit();
    }
  }, [cheatingCount, timeLeft, handleFinalSubmit, isStarted]);

  // 3. Timer Ticker
  useEffect(() => {
    if (!isStarted || isFinished) return;
    const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [isStarted, isFinished]);
  useEffect(() => {
    if (cheatingCount >= 3) {
      Toast.show({
        type: 'info',
        text1: 'Test Terminated',
        text2: 'Multiple security violations detected.',
      });
      handleFinalSubmit();
      navigation.navigate('Home', { activeTab: 'classroom' });
    }
  }, [cheatingCount, handleFinalSubmit, navigation]);
  const warningCount = MAX_GRACES - cheatingCount;
  return (
    <SafeAreaView
      style={[
        CourseActionStyles.container,
        { backgroundColor: colors.backgroundSecondary },
      ]}
    >
      <Modal visible={!isStarted} animationType="fade" transparent>
        <View style={CourseActionStyles.modalOverlay}>
          <View style={CourseActionStyles.modalContainer}>
            <ScrollView
              contentContainerStyle={CourseActionStyles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              <MaterialIcons
                name="info-outlined"
                size={50}
                color={colors.primary}
                style={CourseActionStyles.centerIcon}
              />
              <Text
                style={[
                  CourseActionStyles.modalTitle,
                  { color: colors.textDarker },
                ]}
              >
                Test Instructions
              </Text>

              <View style={CourseActionStyles.instructionBox}>
                <Text
                  style={[CourseActionStyles.insText, { color: colors.text }]}
                >
                  <Text style={CourseActionStyles.boldText}>
                    Identity Verification:
                  </Text>{' '}
                  Your front camera will stay on throughout the test to make
                  sure it's really you taking the test.
                </Text>
                <Text
                  style={[CourseActionStyles.insText, { color: colors.text }]}
                >
                  <Text style={CourseActionStyles.boldText}>Stay Focused:</Text>
                  Try not to look away from the screen for too long, as the
                  system monitors your attention.
                </Text>
                <Text
                  style={[CourseActionStyles.insText, { color: colors.text }]}
                >
                  <Text style={CourseActionStyles.boldText}>
                    App Switching/minimizing:{' '}
                  </Text>
                  If you leave this app or minimize it, your assessment wil
                  auto-submit.
                </Text>
                <Text
                  style={[CourseActionStyles.insText, { color: colors.text }]}
                >
                  Goodluck and we hope you have a good test!
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  CourseActionStyles.startBtn,
                  { backgroundColor: colors.btnColor },
                  isUploading && CourseActionStyles.disabledBtn,
                ]}
                onPress={startTestWithSecurity}
                disabled={isUploading}
              >
                {isUploading ? (
                  <ActivityIndicator
                    color={colors.btnTextColor}
                    size={'small'}
                  />
                ) : (
                  <Text
                    style={[
                      CourseActionStyles.startBtnText,
                      { color: colors.btnTextColor },
                    ]}
                  >
                    Verify Identity & Start
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
      <View style={CourseActionStyles.header}>
        <View style={CourseActionStyles.sideBySideCenteredRow}>
          <MaterialIcons
            name="access-time-outlined"
            size={20}
            color={colors.text}
          />
          <Text
            style={[
              CourseActionStyles.timer,
              { marginLeft: 3 },
              timeLeft < 600
                ? CourseActionStyles.timerUrgent
                : { color: colors.text },
            ]}
          >
            {Math.floor(timeLeft / 60)}:{' '}
            {(timeLeft % 60).toString().padStart(2, '0')}
          </Text>
        </View>
        <Text
          style={[
            CourseActionStyles.cheatCount,
            { color: warningCount <= 2 ? colors.primary : colors.text },
          ]}
        >
          {warningCount} {warningCount === 1 ? 'grace' : 'graces'} left
        </Text>
        <Text style={[CourseActionStyles.progress, { color: colors.text }]}>
          Question {currentIndex + 1} of {activeQuestions.length}
        </Text>
        <TouchableOpacity onPress={() => setIsCalcVisible(true)}>
          <MaterialIcons
            name="calculate-outlined"
            size={22}
            color={colors.primary}
          />
        </TouchableOpacity>
      </View>
      {isStarted && !isFinished && (
        <>
          <View style={CourseActionStyles.questionCard}>
            <Text
              style={[CourseActionStyles.qText, { color: colors.textDarker }]}
            >
              {activeQuestions[currentIndex].questionText}
            </Text>
            {/* Conditional Rendering Logic */}
            {activeQuestions[currentIndex].type === 'MCQ' ||
            activeQuestions[currentIndex].type === 'TrueFalse' ? (
              <View style={CourseActionStyles.optionsContainer}>
                {activeQuestions[currentIndex].options?.map(
                  (option: any, index: any) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        CourseActionStyles.optionButton,
                        answers[activeQuestions[currentIndex].id] === option &&
                          CourseActionStyles.selectedOption,
                      ]}
                      onPress={() =>
                        setAnswers({
                          ...answers,
                          [activeQuestions[currentIndex].id]: option,
                        })
                      }
                    >
                      <Text
                        style={[
                          CourseActionStyles.optionText,
                          { color: colors.text },
                          answers[activeQuestions[currentIndex].id] ===
                            option && CourseActionStyles.selectedOptionText,
                        ]}
                      >
                        {option}
                      </Text>
                    </TouchableOpacity>
                  ),
                )}
              </View>
            ) : (
              <TextInput
                style={[
                  CourseActionStyles.input,
                  { color: colors.text, borderColor: colors.border },
                ]}
                value={answers[activeQuestions[currentIndex].id] || ''}
                onChangeText={val =>
                  setAnswers({
                    ...answers,
                    [activeQuestions[currentIndex].id]: val,
                  })
                }
                placeholder="Type your answer here..."
                placeholderTextColor={colors.inputTextHolder}
              />
            )}
          </View>

          <View style={CourseActionStyles.testSideBySide}>
            <TouchableOpacity
              style={[
                CourseActionStyles.submitBtn,
                { backgroundColor: colors.btnColor },
              ]}
              onPress={() =>
                currentIndex > 0 && setCurrentIndex(currentIndex - 1)
              }
            >
              <Text
                style={[
                  CourseActionStyles.submitBtnText,
                  { color: colors.btnTextColor },
                ]}
              >
                Prev
              </Text>
            </TouchableOpacity>

            {currentIndex === activeQuestions.length - 1 ? (
              <TouchableOpacity
                style={[
                  CourseActionStyles.submitBtn,
                  { backgroundColor: colors.btnColor },
                ]}
                onPress={handleFinalSubmit}
              >
                <Text
                  style={[
                    CourseActionStyles.submitBtnText,
                    { color: colors.btnTextColor },
                  ]}
                >
                  Submit Test
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[
                  CourseActionStyles.submitBtn,
                  { backgroundColor: colors.btnColor },
                ]}
                onPress={() => setCurrentIndex(currentIndex + 1)}
              >
                <Text
                  style={[
                    CourseActionStyles.submitBtnText,
                    { color: colors.btnTextColor },
                  ]}
                >
                  Next
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </>
      )}
      <Modal visible={isFinished} transparent animationType="slide">
        <View style={CourseActionStyles.modalOverlay}>
          <View
            style={[
              CourseActionStyles.resultCard,
              { backgroundColor: colors.backgroundSecondary },
            ]}
          >
            {impersonationError ? (
              <>
                <MaterialIcons
                  name="cancel-outlined"
                  size={60}
                  color={colors.primary}
                />
                <Text
                  style={[
                    CourseActionStyles.scoreTitle,
                    { color: colors.primary },
                  ]}
                >
                  Test Submission Rejected
                </Text>

                <Text
                  style={[
                    CourseActionStyles.adviceText,
                    { textAlign: 'center', marginVertical: 15 },
                  ]}
                >
                  {impersonationError ||
                    'Your identity could not be verified on suspicions of impersonation.'}
                </Text>
                <TouchableOpacity
                  style={[
                    CourseActionStyles.startBtn,
                    { backgroundColor: colors.btnColor },
                  ]}
                  onPress={startTestWithSecurity}
                >
                  <Text
                    style={[
                      CourseActionStyles.startBtnText,
                      { color: colors.btnTextColor },
                    ]}
                  >
                    Redo Test (Contact Admin if issue persists)
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <MaterialIcons
                  name="check-circle-outlined"
                  size={50}
                  color={colors.primary}
                />
                <View style={CourseActionStyles.scoreCircle}>
                  <Text
                    style={[
                      CourseActionStyles.scoreBig,
                      { color: colors.primary },
                    ]}
                  >
                    {finalResult.score}
                  </Text>
                  <Text
                    style={[
                      CourseActionStyles.scoreSmall,
                      { color: colors.primaryTint },
                    ]}
                  >
                    / {finalResult.total}
                  </Text>
                </View>
                <Text
                  style={[
                    CourseActionStyles.scoreTitle,
                    { color: colors.textDarker },
                  ]}
                >
                  {
                    getAdvice((finalResult.score / finalResult.total) * 100)
                      .title
                  }
                </Text>
                <Text
                  style={[
                    CourseActionStyles.adviceText,
                    { color: colors.text },
                  ]}
                >
                  {getAdvice((finalResult.score / finalResult.total) * 100).msg}
                </Text>
                <View style={CourseActionStyles.sideBySideCenteredRowSB}>
                  <TouchableOpacity
                    style={[
                      CourseActionStyles.startBtn,
                      { backgroundColor: colors.btnColor },
                    ]}
                    onPress={() => {
                      navigation.reset({
                        index: 0,
                        routes: [
                          {
                            name: 'Home',
                            params: {
                              activeTab: 'classroom',
                            },
                          },
                        ],
                      });
                    }}
                  >
                    <Text
                      style={[
                        CourseActionStyles.startBtnText,
                        { color: colors.btnTextColor },
                      ]}
                    >
                      Back to Home
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      CourseActionStyles.startBtn,
                      { backgroundColor: colors.btnColor },
                    ]}
                    onPress={downloadStudentResultSheet}
                  >
                    <MaterialIcons
                      name="download-outlined"
                      size={20}
                      color={colors.btnTextColor}
                    />
                    <Text
                      style={[
                        CourseActionStyles.startBtnText,
                        { color: colors.btnTextColor },
                      ]}
                    >
                      Download Test Review
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
      <FloatingCalculator
        visible={isCalcVisible}
        onClose={() => setIsCalcVisible(false)}
        expression={expression}
        result={result}
        handlePress={handlePress}
        buttons={buttons}
        colors={colors}
      />
      {device != null && (
        <Camera
          {...({
            ref: cameraRef,
            style: isStarted
              ? CourseActionStyles.miniCamera
              : CourseActionStyles.fullCamera,
            device: device,
            isActive: true,
            photo: true,
            onFacesDetected: (faces: any) => {
              onFaceStatusChange(faces.length > 0);
            },
          } as any)}
        />
      )}
    </SafeAreaView>
  );
};
export const RenderViewLectureSchedule = ({
  lectures,
}: {
  lectures: Lecture[];
  onPress: (item: Lecture) => void;
}) => {
  const navigation = useNavigation<any>();
  const [ongoingLecture, setOngoingLecture] = useState<Lecture | null>(null);
  const user = useAppSelector(state => state.user);
  const sectionListRef = useRef<SectionList>(null);
  const today = new Date().toISOString().split('T')[0];

  const sections = useMemo(() => {
    const groups = lectures.reduce((acc, lecture) => {
      const date = lecture.date;
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(lecture);
      return acc;
    }, {} as Record<string, Lecture[]>);
    return Object.keys(groups)
      .sort()
      .map(date => ({
        title: date,
        data: groups[date],
      }));
  }, [lectures]);

  const jumpToToday = () => {
    const todayIndex = sections.findIndex(s => s.title === today);
    if (todayIndex !== -1) {
      sectionListRef.current?.scrollToLocation({
        sectionIndex: todayIndex,
        itemIndex: 0,
        animated: true,
      });
    }
  };
  const handleJoinLecture = async () => {
    if (!ongoingLecture) return;
    if (ongoingLecture.lectureType !== 'Physical') {
      navigation.navigate('LiveClassSessions', {
        lectureId: ongoingLecture.id,
        courseId: ongoingLecture.courseId,
      });
      setOngoingLecture(null);
      return;
    }
    try {
      if (user.usertype === 'lecturer') {
        const [courseRes, exceptionsRes] = await Promise.all([
          fetch(`${baseUrl}users/courses/${ongoingLecture.courseId}`),
          fetch(`${baseUrl}users/exceptions/lectures/${ongoingLecture.id}`),
        ]);
        const courseData = await courseRes.json();
        const exceptionsData = await exceptionsRes.json();

        navigation.navigate('PhysicalAttendanceManager', {
          lecture: ongoingLecture,
          course: courseData,
          exceptions: exceptionsData,
        });
      } else if (user.usertype === 'student') {
        navigation.navigate('StudentAttendanceScanner', {
          lecture: ongoingLecture,
          onSuccess: () => navigation.navigate('Home'),
        });
      }
      setOngoingLecture(null);
    } catch (err) {
      console.error('Failed to fetch attendance requirements', err);
      Toast.show({
        type: 'error',
        text1: 'Connection Error',
        text2: 'Could not load lecture details.',
      });
    }
  };
  const renderLectureItem = ({ item }: { item: Lecture }) => {
    const isOngoing = item.status === 'ongoing';
    const isClickable =
      item.lectureType === 'Online' || item.lectureType === 'Recorded';
    const handlePress = async () => {
      if (isOngoing) {
        setOngoingLecture(item);
      } else if (item.lectureType === 'Recorded') {
        navigation.navigate('VideoPlayerScreen', {
          lectureId: item.id,
          url: item.videoUrl,
          title: item.topicName,
          userRole: user.usertype,
        });
      }
    };
    return (
      <TouchableOpacity
        disabled={!isClickable}
        onPress={handlePress}
        style={[
          CourseActionStyles.lectureCard,
          isOngoing && { borderColor: PRIMARY_COLOR, borderWidth: 2 },
        ]}
      >
        <View style={CourseActionStyles.lectureInfoColumn}>
          <View style={CourseActionStyles.rowBetween}>
            <Text style={CourseActionStyles.topicText}>{item.topicName}</Text>
            <View style={[CourseActionStyles.badge]}>
              <Text style={CourseActionStyles.badgeText}>
                {item.lectureType}
              </Text>
            </View>
          </View>

          <Text style={CourseActionStyles.locationText}>
            {item.lectureType === 'Physical'
              ? ` ${item.location}`
              : ` ${item.lectureType} Class Session`}
          </Text>

          {isOngoing && (
            <View style={CourseActionStyles.ongoingIndicator}>
              <View style={CourseActionStyles.pulseDot} />
              <Text style={CourseActionStyles.ongoingText}>Happening Now</Text>
            </View>
          )}
        </View>
        <View style={CourseActionStyles.lectureTimeColumn}>
          <Text style={CourseActionStyles.timeText}>{item.startTime}</Text>
          <View style={CourseActionStyles.timeLine} />
          <Text style={CourseActionStyles.timeTextSmall}>{item.endTime}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <SectionList
        ref={sectionListRef}
        sections={sections}
        keyExtractor={item => item.id}
        renderItem={renderLectureItem}
        renderSectionHeader={({ section: { title } }) => (
          <View style={CourseActionStyles.sectionHeader}>
            <Text style={CourseActionStyles.sectionHeaderText}>
              {title === today ? "Today's Lectures" : title}
            </Text>
          </View>
        )}
        stickySectionHeadersEnabled
      />

      <TouchableOpacity style={CourseActionStyles.fab} onPress={jumpToToday}>
        <Icon name="calendar-today" size={24} color="#fff" />
      </TouchableOpacity>
      <OngoingLectureModal
        visible={!!ongoingLecture}
        lecture={ongoingLecture}
        onJoin={handleJoinLecture}
        onDismiss={() => setOngoingLecture(null)}
      />
    </View>
  );
};
export const LecturerLectureScheduleView = ({
  lectures,
  onUpdateLecture,
  onDeleteLecture,
}: {
  lectures: Lecture[];
  onUpdateLecture: (updated: Lecture) => void;
  onDeleteLecture: (id: string) => void;
}) => {
  const navigation = useNavigation<any>();
  const [ongoingLecture, setOngoingLecture] = useState<Lecture | null>(null);
  const user = useAppSelector(state => state.user);
  const [selectedLecture, setSelectedLecture] = useState<Lecture | null>(null);
  const [showPostponeModal, setShowPostponeModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [newDate, setNewDate] = useState(new Date());
  const sectionListRef = useRef<SectionList>(null);
  const today = new Date().toISOString().split('T')[0];

  // Memoized sections remain the same as your student view
  const sections = useMemo(() => {
    const groups = lectures.reduce((acc, lecture) => {
      const date = lecture.date;
      if (!acc[date]) acc[date] = [];
      acc[date].push(lecture);
      return acc;
    }, {} as Record<string, Lecture[]>);

    return Object.keys(groups)
      .sort()
      .map(date => ({
        title: date,
        data: groups[date],
      }));
  }, [lectures]);

  const handlePostponeSave = async () => {
    if (!selectedLecture) return;

    const formattedDate = newDate.toISOString().split('T')[0];
    const formattedTime = newDate.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false, // Ensure 24hr format if your DB expects it
    });

    try {
      const token = await AsyncStorage.getItem('accessToken');
      const response = await fetch(
        `${baseUrl}users/lecturers/class/courses/${selectedLecture.courseId}/lectures/${selectedLecture.id}/postpone`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            newDate: formattedDate,
            newStartTime: formattedTime,
            topicName: selectedLecture.topicName,
          }),
        },
      );

      const result = await response.json();

      if (response.ok) {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Lecture postponed and students notified!',
        });
        onUpdateLecture(result.updatedLecture);
        setShowPostponeModal(false);
      } else {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: result.message,
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to connect to server',
      });
    }
  };
  const handleJoinLecture = async () => {
    if (!ongoingLecture) return;
    if (ongoingLecture.lectureType !== 'Physical') {
      navigation.navigate('LiveClassSessions', {
        lectureId: ongoingLecture.id,
        courseId: ongoingLecture.courseId,
      });
      setOngoingLecture(null);
      return;
    }
    try {
      if (user.usertype === 'lecturer') {
        const [courseRes, exceptionsRes] = await Promise.all([
          fetch(`${baseUrl}users/courses/${ongoingLecture.courseId}`),
          fetch(`${baseUrl}users/exceptions/lectures/${ongoingLecture.id}`),
        ]);
        const courseData = await courseRes.json();
        const exceptionsData = await exceptionsRes.json();

        navigation.navigate('PhysicalAttendanceManager', {
          lecture: ongoingLecture,
          course: courseData,
          exceptions: exceptionsData,
        });
      } else if (user.usertype === 'student') {
        navigation.navigate('StudentAttendanceScanner', {
          lecture: ongoingLecture,
          onSuccess: () => navigation.navigate('Home'),
        });
      }
      setOngoingLecture(null);
    } catch (err) {
      console.error('Failed to fetch attendance requirements', err);
      Toast.show({
        type: 'error',
        text1: 'Connection Error',
        text2: 'Could not load lecture details.',
      });
    }
  };
  const renderLecturerItem = ({ item }: { item: Lecture }) => {
    const isOngoing = item.status === 'ongoing';
    const isPostponed = item.status === 'postponed';
    const isClickable =
      item.lectureType === 'Online' || item.lectureType === 'Recorded';
    const handlePress = () => {
      if (isOngoing && item.lectureType === 'Online') {
        setOngoingLecture(item);
      } else if (item.lectureType === 'Recorded') {
        navigation.navigate('VideoPlayerScreen', {
          lectureId: item.id,
          url: item.videoUrl,
          title: item.topicName,
          userRole: user.usertype,
        });
      }
    };
    return (
      <TouchableOpacity
        disabled={!isClickable}
        onPress={handlePress}
        style={[
          CourseActionStyles.lectureCard2,
          isOngoing && { borderColor: PRIMARY_COLOR, borderWidth: 2 },
          isPostponed && { opacity: 0.6, backgroundColor: '#f8f9fa' },
        ]}
      >
        <View style={CourseActionStyles.lectureInfoColumn}>
          <View style={CourseActionStyles.rowBetween}>
            <Text
              style={[
                CourseActionStyles.topicText,
                isPostponed && { textDecorationLine: 'line-through' },
              ]}
            >
              {item.topicName}
            </Text>
            {/* ACTION MENU: The key difference for lecturers */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <TouchableOpacity
                style={[CourseActionStyles.startBtn]}
                onPress={() => {
                  setSelectedLecture(item);
                  setShowPostponeModal(true);
                }}
              >
                <Icon name="calendar-clock" size={22} color="#fff" />
                <Text style={CourseActionStyles.startBtnText2}>Postpone</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[CourseActionStyles.startBtn, { marginLeft: 10 }]}
                onPress={() => {
                  setSelectedLecture(item);
                  setShowDeleteModal(true);
                }}
              >
                <Icon name="trash-can-outline" size={22} color="#fff" />
                <Text style={CourseActionStyles.startBtnText2}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View
            style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}
          >
            <View
              style={[CourseActionStyles.badge, { backgroundColor: '#eee' }]}
            >
              <Text style={CourseActionStyles.badgeText} numberOfLines={2}>
                {item.lectureType}
              </Text>
            </View>
            {isPostponed && (
              <Text
                style={{
                  color: PRIMARY_COLOR,
                  fontSize: 12,
                  marginLeft: 8,
                  fontWeight: 'bold',
                }}
              >
                POSTPONED
              </Text>
            )}
          </View>

          <Text style={CourseActionStyles.locationText}>
            {item.lectureType === 'Physical'
              ? ` ${item.location}`
              : ` Online Class Session`}
          </Text>
        </View>

        <View style={CourseActionStyles.lectureTimeColumn}>
          <Text style={CourseActionStyles.timeText}>{item.startTime}</Text>
          <View style={CourseActionStyles.timeLine} />
          <Text style={CourseActionStyles.timeTextSmall}>{item.endTime}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <SectionList
        ref={sectionListRef}
        sections={sections}
        keyExtractor={item => item.id}
        renderItem={renderLecturerItem}
        renderSectionHeader={({ section: { title } }) => (
          <View style={CourseActionStyles.sectionHeader}>
            <Text style={CourseActionStyles.sectionHeaderText}>
              {title === today ? 'Teaching Today' : title}
            </Text>
          </View>
        )}
        stickySectionHeadersEnabled
      />
      {/* Postpone Modal */}
      <Modal visible={showPostponeModal} transparent animationType="slide">
        <Pressable
          style={CourseActionStyles.modalOverlay}
          onPress={() => setShowPostponeModal(false)}
        >
          <TouchableWithoutFeedback>
            <View style={CourseActionStyles.modalContent}>
              <Text style={CourseActionStyles.modalTitle}>
                Postpone: {selectedLecture?.topicName}
              </Text>

              <Text style={CourseActionStyles.modalText}>
                Select New Date & Time:
              </Text>
              <DateTimePicker
                value={newDate}
                mode="datetime"
                display="default"
                onChange={(event, date) => date && setNewDate(date)}
              />

              <View style={CourseActionStyles.modalActions}>
                <TouchableOpacity
                  onPress={handlePostponeSave}
                  style={CourseActionStyles.approveBtn}
                >
                  <Text style={CourseActionStyles.btnText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </Pressable>
      </Modal>

      {/* DELETE MODAL */}
      <Modal visible={showDeleteModal} transparent animationType="fade">
        <Pressable
          style={CourseActionStyles.modalOverlay}
          onPress={() => setShowDeleteModal(false)}
        >
          <TouchableWithoutFeedback>
            <View style={CourseActionStyles.modalContent}>
              <Text style={CourseActionStyles.modalTitle}>Delete Lecture?</Text>
              <Text style={CourseActionStyles.modalText}>
                Are you sure you want to delete "{selectedLecture?.topicName}
                "? This action cannot be undone.
              </Text>
              <View style={CourseActionStyles.modalActions}>
                <TouchableOpacity
                  onPress={() => setShowDeleteModal(false)}
                  style={CourseActionStyles.rejectBtn}
                >
                  <Text style={CourseActionStyles.btnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    onDeleteLecture(selectedLecture!.id);
                    setShowDeleteModal(false);
                  }}
                  style={CourseActionStyles.approveBtn}
                >
                  <Text style={CourseActionStyles.btnText}>Confirm Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </Pressable>
      </Modal>
      <OngoingLectureModal
        visible={!!ongoingLecture}
        lecture={ongoingLecture}
        onJoin={handleJoinLecture}
        onDismiss={() => setOngoingLecture(null)}
      />
    </View>
  );
};
export const AssessmentReportScreen = ({ route }: any) => {
  const { testId } = route.params;
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchReportData = useCallback(async () => {
    setLoading(true); // Ensure loading state is set when called manually
    try {
      const token = await AsyncStorage.getItem('accessToken');
      const response = await fetch(
        `${baseUrl}users/lecturers/class/tests/${testId}/analysis-data`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const result = await response.json();
      setReportData(result);
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Could not load report data' });
    } finally {
      setLoading(false);
    }
  }, [testId]); // Memoizes the function

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  const handleDownloadPDF = async () => {
    const token = await AsyncStorage.getItem('accessToken');
    const downloadUrl = `${baseUrl}users/lecturers/class/tests/${testId}/download-analysis?token=${token}`;
    Linking.openURL(downloadUrl);
  };

  if (loading)
    return (
      <ActivityIndicator
        size="large"
        style={{ flex: 1 }}
        color={PRIMARY_COLOR}
      />
    );

  return (
    <ScrollView style={CourseActionStyles.container}>
      <View style={CourseActionStyles.header}>
        <TouchableOpacity>
          <Icon name="chevron-left" color={PRIMARY_COLOR} size={23} />
        </TouchableOpacity>
        <View style={CourseActionStyles.sideBySide}>
          <Text style={CourseActionStyles.title}>{reportData.test.title}</Text>
          <TouchableOpacity
            style={CourseActionStyles.downloadBtn}
            onPress={handleDownloadPDF}
          >
            <Icon name="file-pdf-box" size={24} color="#fff" />
            <Text style={CourseActionStyles.downloadText}>Download PDF</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Summary Cards */}
      <View style={CourseActionStyles.row}>
        <View style={CourseActionStyles.card}>
          <Text style={CourseActionStyles.cardLabel}>Pass Rate</Text>
          <Text style={[CourseActionStyles.cardValue, { color: '#27ae60' }]}>
            {reportData.passRate}%
          </Text>
        </View>
        <View style={CourseActionStyles.card}>
          <Text style={CourseActionStyles.cardLabel}>Submissions</Text>
          <Text style={CourseActionStyles.cardValue}>
            {reportData.submissions.length}
          </Text>
        </View>
      </View>

      {/* Performance Chart */}
      <Text style={CourseActionStyles.sectionTitle2}>Performance Overview</Text>
      <BarChart
        data={{
          labels: ['Passed', 'Failed'],
          datasets: [
            { data: [reportData.passedCount, reportData.failedCount] },
          ],
        }}
        width={350}
        height={250}
        yAxisLabel=""
        yAxisSuffix=""
        chartConfig={chartConfig}
        verticalLabelRotation={0}
      />

      {/* Top Performers */}
      <Text style={CourseActionStyles.sectionTitle2}>Top Performers</Text>
      {reportData.topPerformers.map((s: any, i: number) => (
        <View key={i} style={CourseActionStyles.listItem}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {/* Trophy Icons for Top 3 */}
            <Icon
              name={
                i === 0
                  ? 'trophy'
                  : i === 1
                  ? 'trophy-outline'
                  : 'medal-outline'
              }
              size={22}
              color={i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : '#CD7F32'} // Gold, Silver, Bronze
              style={{ marginRight: 8 }}
            />
            <Text style={CourseActionStyles.sectionText}>{s.studentName}</Text>
          </View>

          <View style={CourseActionStyles.scoreBadge}>
            <Text style={CourseActionStyles.scoreText}>
              {s.score}/{reportData.test.totalMarks}
            </Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
};
export const CourseActionStyles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  headerContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 5,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  titleContainer: { flex: 1, alignItems: 'center' },
  headerPageTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  body: { flex: 1 },
  listPadding: { paddingHorizontal: 20, paddingBottom: 30 },
  sectionSubtitle: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 1,
    marginTop: 20,
    marginBottom: 15,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    marginBottom: 10,
    borderBottomWidth: 0.8,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
  },
  numberCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignContent: 'center',
    marginRight: 12,
  },
  numberText: { fontSize: 14, fontWeight: 'bold' },
  topicText: { flex: 1, fontSize: 14 },
  topicText2: {
    fontSize: 16,
    fontWeight: '600',
    color: PRIMARY_COLOR_TINT,
    marginBottom: 4,
  },
  materialCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
  },
  materialTitle: { fontSize: 14, fontWeight: '600' },
  rowButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  downloadCircle: {
    alignContent: 'center',
  },
  assignmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: PRIMARY_COLOR_TINT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  assignmentName: { fontSize: 14, fontWeight: '700' },
  dueDate: {
    fontSize: 14,
    marginTop: 5,
    fontWeight: '500',
  },

  statusTag: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  addButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
  },
  addBtnText: { fontSize: 14, fontWeight: 'bold' },
  addBtnText3: {
    marginLeft: 4,
    fontSize: 14,
  },
  addBtnText2: {
    marginLeft: 4,
    fontWeight: '700',
    fontSize: 14,
  },
  addContentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    marginTop: 20,
  },
  addContentText: {
    fontWeight: '700',
    marginLeft: 8,
    fontSize: 14,
  },
  actionRow: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { padding: 8 },

  // Centered Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Modals & Pickers
  modalOverlayEnd: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  centeredView: {
    width: '90%',
  },
  editModalContent: {
    borderRadius: 20,
    padding: 24,
    shadowColor: PRIMARY_COLOR_TINT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2222',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 15,
    fontSize: 14,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 12,
    alignContent: 'center',
    borderWidth: 1,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  saveBtn: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 12,
    alignContent: 'center',
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  deleteModalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center', // Center everything for a delete prompt
  },
  warningIconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#fff1f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalSubText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 25,
  },
  deleteConfirmBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: PRIMARY_COLOR, // Bold red for danger
  },
  completedTopicText: {
    color: PRIMARY_COLOR,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 50,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: PRIMARY_COLOR_TINT,
    marginTop: 15,
  },
  emptySubtitle: {
    fontSize: 14,
    color: PRIMARY_COLOR_TINT,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  overdueCard: {
    borderColor: '#ffccd2',
    backgroundColor: '#fffdfd',
  },
  assignmentModalContent: {
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 25,
    width: '100%',
    position: 'absolute',
    bottom: 0,
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
  },
  dateText: {
    marginRight: 5,
    fontSize: 14,
    fontWeight: '500',
  },
  dateText2: {
    fontSize: 11,
  },
  filePickerBtn: {
    padding: 15,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 25,
    alignItems: 'center',
  },
  filePickerText: {
    marginTop: 4,
    fontSize: 14,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  methodBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  methodText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  searchBarWrapper: {
    paddingHorizontal: 16,
    marginTop: 5,
  },
  searchBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f7fa',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    height: '100%',
  },
  manageCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: PRIMARY_COLOR_TINT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderBottomWidth: 0.8,
  },
  studentName: {
    fontSize: 14,
    fontWeight: '700',
  },
  reasonBody: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 15,
  },
  actionRow2: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  approveBtn: {
    borderWidth: 0.8,
    borderColor: PRIMARY_COLOR,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignContent: 'center',
  },
  rejectBtn: {
    borderWidth: 0.8,
    borderColor: PRIMARY_COLOR_TINT,
    paddingVertical: 10,
    borderRadius: 12,
    paddingHorizontal: 16,
    alignContent: 'center',
  },
  btnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  finalStatusText: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  matricText: {
    fontSize: 12,
    fontWeight: '500',
  },
  categoryLabel: {
    marginBottom: 10,
    fontSize: 12,
    fontWeight: 'bold',
  },
  finalStatusContainer: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerWrapper: {
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 13,
  },
  tierInfoCard: {
    flex: 1,
  },
  usageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  tierLabel: {
    fontSize: 18,
    fontWeight: '800',
  },
  usageText: {
    fontSize: 14,
    marginLeft: 10,
  },
  resetText: {
    fontSize: 12,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 12,
  },
  exceptionCard: {
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  courseIdText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  reasonText: {
    fontSize: 14,
    marginVertical: 4,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginLeft: 10,
  },
  statusLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'capitalize',
    marginTop: 4,
  },
  exceptionModalContent: {
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 24,
    width: '100%',
    position: 'absolute',
    bottom: 0,
    maxHeight: '80%',
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  catBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 0.8,
  },
  catBtnActive: {
    backgroundColor: PRIMARY_COLOR,
    borderColor: PRIMARY_COLOR,
  },
  catBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  textArea: {
    borderRadius: 12,
    padding: 12,
    height: 100,
    textAlignVertical: 'top',
    borderWidth: 0.8,
    marginBottom: 15,
  },
  costWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginBottom: 20,
    borderLeftWidth: 1,
  },
  costText: {
    fontSize: 12,
    marginLeft: 6,
    fontWeight: '600',
  },
  pickerContainer: {
    marginBottom: 15,
    overflow: 'hidden',
    justifyContent: 'center',
    padding: 6,
    borderWidth: 0.8,
  },
  pickerContainer2: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 25,
    maxHeight: '70%',
  },
  dateTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginVertical: 15,
  },
  repeatContainer: {
    marginVertical: 15,
  },
  repeatCounter: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  repeatValue: {
    color: '#2222',
    marginHorizontal: 7,
  },
  dateTimeBox: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: PRIMARY_COLOR,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E5E5',
  },
  microLabel: {
    fontSize: 10,
    color: '#fff',
    textTransform: 'capitalize',
    letterSpacing: 0.5,
    fontWeight: '700',
    marginTop: 7,
  },
  labelTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  dateTimeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2222',
    marginTop: 20,
    marginBottom: 8,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'space-between',
  },
  textInput: {
    backgroundColor: '#999',
    borderRadius: 15,
    padding: 15,
    fontSize: 14,
    color: '#333',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  // Type Toggle (Physical | Online | Recorded)
  typeToggleContainer: {
    flexDirection: 'row',
    borderRadius: 15,
    padding: 4,
  },
  typeOption: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
  },
  typeOptionActive: {
    backgroundColor: PRIMARY_COLOR,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  typeOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: PRIMARY_COLOR_TINT,
  },
  typeOptionTextActive: {
    color: '#fff',
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2222',
    marginBottom: 20,
    textAlign: 'center',
  },
  pickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 18,
    borderBottomWidth: 0.8,
    borderBottomColor: PRIMARY_COLOR_TINT,
  },
  pickerItemText: {
    fontSize: 16,
    color: '#2222',
    flex: 1,
  },

  // Action Button
  submitButton: {
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 18,
    padding: 18,
    marginTop: 35,
    marginBottom: 30,
    alignItems: 'center',
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: '#A0B2B2',
    elevation: 0,
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  // Alert Modal
  alertOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 25,
  },
  alertBox: {
    backgroundColor: '#fff',
    borderRadius: 25,
    padding: 30,
    alignItems: 'center',
  },
  alertTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: PRIMARY_COLOR_TINT,
    marginTop: 15,
  },
  alertText: {
    fontSize: 15,
    color: PRIMARY_COLOR_TINT,
    textAlign: 'center',
    marginVertical: 15,
  },
  alertButton: {
    backgroundColor: PRIMARY_COLOR,
    paddingVertical: 14,
    paddingHorizontal: 45,
    borderRadius: 14,
  },
  alertButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  emptyText: {
    textAlign: 'center',
    color: '#2222',
    marginVertical: 20,
  },
  labelMain: {
    fontSize: 18,
    fontWeight: '700',
    alignSelf: 'center',
    paddingTop: 13,
    color: '#2222',
  },
  successOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 20,
  },
  successBox: {
    backgroundColor: '#fff',
    borderRadius: 30,
    padding: 30,
    alignItems: 'center',
    elevation: 20,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: PRIMARY_COLOR,
    marginVertical: 15,
  },
  successText: {
    fontSize: 15,
    color: PRIMARY_COLOR,
    textAlign: 'center',
    marginBottom: 15,
  },
  linkShareBox: {
    width: '100%',
    backgroundColor: '#F0F5F5',
    padding: 15,
    borderRadius: 15,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#DDE7E7',
  },
  linkSubtitle: {
    fontSize: 12,
    fontWeight: '700',
    color: PRIMARY_COLOR_TINT,
    marginBottom: 5,
    textTransform: 'uppercase',
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  linkText: {
    flex: 1,
    fontSize: 13,
    color: '#555',
    marginRight: 10,
  },
  doneButton: {
    backgroundColor: PRIMARY_COLOR,
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  container: { flex: 1 },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  draftText: { color: '#2D5A5A', fontWeight: 'bold' },
  titleInput: {
    fontSize: 14,
    borderWidth: 0.8,
    borderColor: PRIMARY_COLOR_TINT,
    padding: 10,
    marginBottom: 20,
  },
  questionCard: {
    marginBottom: 15,
    padding: 15
  },
  qNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  qInput: { fontSize: 14, marginBottom: 15 },
  optionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: PRIMARY_COLOR_TINT,
    marginRight: 10,
  },
  radioActive: { backgroundColor: PRIMARY_COLOR },
  optInput: {
    flex: 1,
    borderWidth: 0.8,
    borderColor: PRIMARY_COLOR_TINT,
    padding: 10,
    fontSize: 14,
  },
  publishBtn: {
    backgroundColor: '#2D5A5A',
    padding: 18,
    borderRadius: 15,
    marginTop: 25,
    alignItems: 'center',
  },
  publishBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  createCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 15,
  },
  createCardText: {
    marginLeft: 5,
    fontSize: 14,
    fontWeight: 'bold',
  },
  pastTestCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 0.8,
    borderBottomColor: PRIMARY_COLOR_TINT,
  },
  testTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  testMeta: { fontSize: 12, color: PRIMARY_COLOR_TINT },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
    marginBottom: 15,
  },
  settingItem: {
    flex: 1,
  },
  microLabel2: {
    fontSize: 14,
    marginBottom: 8,
  },
  settingInput: {
    fontSize: 14,
    fontWeight: '700',
    borderWidth: 0.8,
    borderColor: PRIMARY_COLOR_TINT,
  },
  publishHeaderBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 13,
    alignContent: 'center',
    width: '80%',
    alignSelf: 'center',
    marginTop: 20,
  },
  publishHeaderText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Style for the "disabled" state if the form is incomplete or loading
  disabledBtn: {
    opacity: 0.7,
  },
  disabledBtnText: {
    color: '#999',
  },
  modalBody: {
    padding: 16,
  },
  settingsCard: {
    marginBottom: 15,
  },
  qHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  pointsInput: {
    borderRadius: 4,
    padding: 10,
    width: 40,
    textAlign: 'center',
    borderColor: PRIMARY_COLOR_TINT,
    borderWidth: 0.8,
  },
  pointsLabel: {
    fontSize: 14,
    marginLeft: 4,
    fontWeight: '600',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  sideBySide: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  testSideBySide: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addOptionBtn: {
    marginTop: 15,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    alignContent: 'center',
  },
  addOptionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  shortAnswerPreview: {
    marginBottom: 15,
  },
  previewLabel: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '700',
  },
  correctAnswerInput: {
    borderWidth: 0.8,
    borderColor: PRIMARY_COLOR_TINT,
    padding: 10,
    fontSize: 14,
  },
  typeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  typeBtn: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 13,
    borderWidth: 0.8,
    borderColor: PRIMARY_COLOR_TINT,
    shadowColor: PRIMARY_COLOR_TINT,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  typeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  activeTypeText: {
    color: '#fff', // Highlight the text of the active one
  },
  datePickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 4,
  },
  cameraMiniPreview: {
    width: 80,
    height: 110,
    backgroundColor: '#000',
    borderRadius: 8,
    overflow: 'hidden',
  },
  camLabel: {
    color: 'red',
    fontSize: 10,
    position: 'absolute',
    bottom: 5,
    left: 5,
    fontWeight: 'bold',
  },
  resultCard: {
    width: '95%',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  scoreCircle: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginVertical: 20,
  },
  scoreBig: { fontSize: 40, fontWeight: 'bold', },
  scoreSmall: { fontSize: 20, fontWeight: 'bold' },
  adviceText: {
    marginBottom: 20,
    fontSize: 14,
    fontWeight: '700',
    width: '100%'
  },
  submitBtn: {
    paddingHorizontal: 15,
    paddingVertical: 13,
    borderRadius: 12,
  },
  submitBtnText: { fontSize: 14, fontWeight: 'bold' },
  //
  modalContainer: {
    width: '90%',
    borderRadius: 20,
    padding: 20,
    elevation: 5,
    shadowColor: PRIMARY_COLOR_TINT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  scrollContent: {
    alignItems: 'center',
    paddingBottom: 10,
  },
  centerIcon: {
    marginBottom: 15,
  },
  instructionBox: {
    width: '100%',
    marginBottom: 20,
  },
  insText: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 10,
  },
  startBtn: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 13,
    alignItems: 'center',
  },
  startBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  startBtnText2: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
    marginTop: 5,
  },
  boldText: {
    fontWeight: 'bold',
  },
  //
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
  },
  timer: {
    fontSize: 14,
    fontWeight: '700',
    flexDirection: 'row',
    alignItems: 'center',
  },
  timerUrgent: {
    color: PRIMARY_COLOR,
  },
  progress: {
    fontSize: 14,
    fontWeight: '600',
  },
  qText: {
    fontSize: 14,
    fontWeight: '700',
  },
  optionsContainer: {
    gap: 12,
  },
  optionButton: {
    borderWidth: 0.8,
    width: '100%',
    borderRadius: 8,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedOption: {
    borderColor: PRIMARY_COLOR,
    backgroundColor: PRIMARY_COLOR,
    borderWidth: 2,
  },
  optionText: {
    fontSize: 14,
  },
  selectedOptionText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  scoreTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 9,
    width: '100%'
  },
  fullCamera: {
    flex: 1,
    width: '100%',
  },
  miniCamera: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 100,
    height: 130,
    borderRadius: 15,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: PRIMARY_COLOR_TINT,
    zIndex: 999,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
    backgroundColor: '#fff',
  },
  emptyDivContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyDivContainerText: {
    color: PRIMARY_COLOR_TINT,
    marginTop: 10,
    textAlign: 'center',
    fontSize: 16,
  },
  // Add these to your CourseActionStyles object
  lectureCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    borderLeftWidth: 4,
    width: '95%',
  },
  lectureCard2: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    borderLeftWidth: 4,
    width: '95%',
  },
  lectureTimeColumn: {
    width: 60,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 1,
    borderLeftColor: PRIMARY_COLOR_TINT,
    marginLeft: 15,
  },
  timeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2222',
  },
  timeTextSmall: {
    fontSize: 11,
    color: '#999',
  },
  timeLine: {
    height: 20,
    width: 1,
    backgroundColor: PRIMARY_COLOR_TINT,
    marginVertical: 4,
  },
  lectureInfoColumn: {
    flex: 1,
  },
  locationText: {
    fontSize: 13,
    color: '#666',
  },
  sectionHeader: {
    backgroundColor: '#F8F9FA',
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  sectionHeaderText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#888',
    textTransform: 'capitalize',
    letterSpacing: 1,
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: PRIMARY_COLOR,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.3,
  },
  ongoingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: PRIMARY_COLOR,
    marginRight: 6,
  },
  ongoingText: {
    fontSize: 12,
    color: PRIMARY_COLOR,
    fontWeight: 'bold',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginLeft: 8,
  },
  badgeText: {
    color: PRIMARY_COLOR,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  modalContent: {
    padding: 15,
    borderRadius: 10,
    backgroundColor: '#fff',
    width: '80%',
  },
  //Start
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2C3E50',
    flex: 1,
    marginRight: 10,
  },
  downloadBtn: {
    backgroundColor: PRIMARY_COLOR, // Professional Red for PDF/Action
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginLeft: 8,
  },
  downloadText: {
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 6,
    fontSize: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    width: (width - 48) / 2,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 5, // The color-coded accent
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  cardLabel: {
    fontSize: 12,
    color: '#7F8C8D',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  cardValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  sectionTitle2: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2222',
    marginBottom: 16,
    marginTop: 8,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 0.8,
    borderColor: PRIMARY_COLOR_TINT,
  },
  sectionText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#2222',
  },
  scoreBadge: {
    backgroundColor: '#F0F3F4',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  scoreText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2222',
  },
  //
  miniCalculator: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    width: 160,
    padding: 10,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: PRIMARY_COLOR,
    zIndex: 900,
    elevation: 5,
    shadowColor: PRIMARY_COLOR_TINT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  miniCalculatorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
    alignItems: 'center'
  },
  miniCalculatorHeaderText: {
    fontSize: 14,
    fontWeight: '700',
  },
  miniCalcDisplay: {
    borderRadius: 5,
    padding: 5,
    marginBottom: 8,
    alignItems: 'flex-end',
  },
  miniCalcDisplayExpressionText: {
    fontSize: 10,
  },
  miniCalcDisplayResultsText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  miniBtnText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  miniButton: {
    flex: 1,
    height: 30,
    margin: 1,
    alignContent: 'center',
    borderRadius: 4,
  },
  downloadTestBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  downloadBtnText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  sideBySideCenteredRow:{
    flexDirection: 'row',
    alignItems: 'center'
  },
  sideBySideCenteredRowSB:{
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%'
  },
  cheatCount:{
    fontSize: 14,
    fontWeight: 'bold',
  },
  btnContainer:{
    flexDirection: 'row',
  }
});
