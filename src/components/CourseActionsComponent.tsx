import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import Clipboard from '@react-native-clipboard/clipboard';
import { IconOutline } from '@ant-design/icons-react-native';
import { useMediaPicker } from '../hooks/useMediaPicker.ts';
import * as RNHTMLtoPDF from 'react-native-html-to-pdf';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { ActionModal } from './LogoutModal.tsx';
import { CustomButton } from '../assets/components/AppUIComponents';
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
  Alert,
  Share,
} from 'react-native';
import {
  TestSubmission,
  Course,
  Lecture,
  Assignment,
  CourseResource,
  CourseException,
  Question,
  CreateLecturePayload,
  CreateTestPayload,
  User,
} from '../types/firebase';
import { useNavigation } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { create, all } from 'mathjs';
import { PRIMARY_COLOR, PRIMARY_COLOR_TINT } from '../assets/styles/colors';
import Toast from 'react-native-toast-message';
import { baseUrl } from './HomeScreenComponents';
import { errorCodes, isErrorWithCode } from '@react-native-documents/picker';
import RNFS from 'react-native-fs';
import { PermissionsAndroid, Platform, Linking } from 'react-native';
import DatePicker from 'react-native-date-picker';
import { useAppSelector } from '../hooks/hooks';
import { Picker } from '@react-native-picker/picker';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
} from 'react-native-vision-camera';
import ImageResizer from '@bam.tech/react-native-image-resizer';
import { EmptyState } from './EmptyFlatlistComponent';
import { getUniqueId } from 'react-native-device-info';
import { callGeminiAPI } from '../services/aiServices';
import { PieChart } from 'react-native-chart-kit';
import { OngoingLectureModal } from './OngoingLiveLecturesModal';
import {
  createAssignment,
  saveCourseMaterial,
  createPublicMeeting,
} from '../api/localPostApis';
import { uploadFileToFirebaseClient } from '../utils/CloudinaryPresetHelper';
import { deleteCourseMaterial } from '../api/localDeleteApis';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { updateCourseContent, updateLectureDetails } from '../api/localPutApis';
import {
  createCourseContent,
  verifyFacialIdentity,
} from '../api/localPostApis';
import { deleteCourseContent, deleteAssignment } from '../api/localDeleteApis';
import { useTheme } from '../context/ThemeContext';
import { formatDate, parseFirestoreDate, safeParseDate, getDateKey, safeFormatDate, safeToISOString } from '../utils/dateFormatter';
import { useDateTimePicker } from '../hooks/useDateTimePicker';
import {
  fetchAllAssignments,
  getAssessmentAnalysisUrl,
  fetchCourseGradebook,
} from '../api/localGetApis';
import {
  EXCEPTION_ACCOUNT_LIMITS,
  EXCEPTION_COST_USD,
} from '../constants/inAppConstants';
import { useExchangeRate } from '../hooks/useExchangeRate';
const { width } = Dimensions.get('window');
import {
  getCourseDetailsForOngoingLecture,
  getAllExceptionsForOngoingLecture,
} from '../api/localGetApis';
const math = create(all);
import { PageHeader } from './PageHeader';
import { StudentGradeCard } from './MyQRCodeSection';
import moment from 'moment';
import { LectureDayHeader, LectureScheduleCard } from './LectureScheduleCard';
import { lectureDayKey, resolveLectureTime, todayKey } from '../utils/lectureTime';
import { openLecturerAttendance, openStudentAttendance } from '../utils/attendance';

type PageType =
  | 'Course Contents'
  | 'Course Materials'
  | 'Assignments'
  | 'Exceptions'
  | 'Assessments'
  | 'Set Lecture Schedule'
  | 'View Lecture Schedule'
  | 'View Assessment Report'
  | 'QuickPublicClass'
  | 'Grade Accelerator';
interface LecturerManageProps {
  exceptions: CourseException[];
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
  dueDate: Date | null;
  scheduledStart: Date | null;
  endTime: Date | null;
  totalMarks: string;
  questions: Question[];
}
interface LecturerTestManageProps {
  course: Course;
  refreshing: boolean;
  onRefresh: () => void;
  tests: CreateTestPayload[];
  onSaveTest: (data: CreateTestPayload) => void;
}
interface RenderScheduleProps {
  course: Course;
  onSave: (data: CreateLecturePayload) => Promise<void>;
  isLoading: boolean;
}
interface StudentExceptionsProps {
  exceptions: CourseException[];
  onAddPress: () => void;
  /** Opens the purchase sheet for an extra exception. */
  onBuyPress?: () => void;
  refreshing: boolean;
  onRefresh: () => void;
}
interface AddExceptionProps {
  visible: boolean;
  onClose: () => void;
  course: Course;
  onSave: (data: Partial<CourseException>) => void;
  isSaving: boolean;
  lectures: Lecture[];
}
interface HeaderProps {
  onBack?: () => void;
  title: PageType;
  searchQuery: string;
  setSearchQuery: (text: string) => void;
  placeholder?: string;
  userRole?: 'student' | 'lecturer' | 'otherUser';
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
  /** Resolve false when the backend did not record the submission. */
  onSubmit: (payload: any) => Promise<boolean | void>;
}
interface SearchBarProps {
  shouldShowSearch: boolean;
  textInput: string;
  setTextInput: (text: string) => void;
  placeholder?: string;
  colors: any;
  CourseActionStyles: any;
}
interface RenderMaterialsProps {
  course: Course | null;
  onRefresh: () => void;
}
export const CourseSearchBar: React.FC<SearchBarProps> = ({
  shouldShowSearch,
  textInput,
  setTextInput,
  placeholder = 'Search Course Contents...',
  colors,
  CourseActionStyles,
}) => {
  if (!shouldShowSearch) return null;

  return (
    <View
      style={[
        CourseActionStyles.searchBarWrapper,
        { backgroundColor: colors.backgroundSecondary },
      ]}
    >
      <View
        style={[
          CourseActionStyles.searchBarInner,
          { borderColor: colors.border },
        ]}
      >
        <MaterialIcons
          name="search"
          size={20}
          color={colors.inputTextHolder}
          style={CourseActionStyles.searchIcon}
        />
        <TextInput
          style={[CourseActionStyles.searchInput, { color: colors.text }]}
          placeholder={placeholder}
          value={textInput}
          onChangeText={setTextInput}
          placeholderTextColor={colors.inputTextHolder}
          clearButtonMode="while-editing"
        />
        {textInput.length > 0 && Platform.OS === 'android' && (
          <TouchableOpacity onPress={() => setTextInput('')}>
            <MaterialIcons
              name="cancel"
              size={20}
              color={colors.inputTextHolder}
              style={{ padding: 10 }}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};
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
            name="cancel"
            size={20}
            color={colors.primary}
            style={{ padding: 10 }}
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
export const getChartConfig = (colors: any, isDarkMode: boolean) => ({
  backgroundGradientFrom: isDarkMode ? colors.backgroundSecondary : '#FFFFFF',
  backgroundGradientTo: isDarkMode ? colors.backgroundSecondary : '#EFEFEF',
  decimalPlaces: 0,
  color: (opacity = 1) =>
    isDarkMode
      ? `rgba(255, 255, 255, ${opacity})`
      : `rgba(44, 62, 80, ${opacity})`,
  labelColor: (opacity = 1) =>
    isDarkMode
      ? `rgba(255, 255, 255, ${opacity})`
      : `rgba(52, 73, 94, ${opacity})`,
  style: {
    borderRadius: 16,
  },
  propsForBackgroundLines: {
    strokeDasharray: '',
    stroke: isDarkMode ? `${colors.text}20` : '#ECEFF1',
  },
});
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
  const { pickImage, pickDocument } = useMediaPicker();
  const handlePickFile = async () => {
    try {
      const fileData = await pickDocument();
      if (fileData) {
        setSelectedFile({
          uri: fileData.uri,
          name: fileData.name || 'document.pdf',
          type: fileData.type || 'application/pdf',
        });
      }
    } catch (err: any) {
      if (!(
        isErrorWithCode(err) && err.code === errorCodes.OPERATION_CANCELED
      )) {
        Toast.show({
          type: 'error',
          text1: 'Document Error',
          text2: 'Attachment process failed.',
        });
      }
    }
  };

  const handlePickImage = async () => {
    const fileData = await pickImage();
    if (fileData) {
      setSelectedFile({
        uri: fileData.uri || '',
        name: fileData.name || `${Date.now()}.jpg`,
        type: fileData.type || 'image/jpeg',
      });
    }
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
      formData.append('dueDate', safeToISOString(date) ?? new Date().toISOString());
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
          <View style={CourseActionStyles.sheetGrabber} />
          <ScrollView showsVerticalScrollIndicator={false}>
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
              name="calendar-month"
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
                name="insert-drive-file"
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
              <MaterialIcons name="image" size={18} color={colors.primary} />
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
            <CustomButton
              title={
                isUploadingMedia
                  ? 'Uploading Asset...'
                  : isSaving
                    ? 'Creating...'
                    : 'Add Assignment'
              }
              onPress={handleCreate}
              disabled={isSaving}
              isLoading={isSaving}
              style={CourseActionStyles.saveBtn}
            />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};
export const AddExceptionModal = ({
  visible,
  onClose,
  course,
  onSave,
  isSaving,
  lectures,
}: AddExceptionProps) => {
  // Hooks must run on every render, so the `course` guard comes after them.
  const user = useAppSelector(state => state.user);
  const { colors } = useTheme();
  const [category, setCategory] =
    useState<CourseException['reasonCategory']>('Personal');
  const [reason, setReason] = useState('');
  const [lectureId, setLectureId] = useState('');
  const credits = Number(user?.exceptionCredits) || 0;
  if (!course) {
    return null;
  }
  const futureLectures =
    (Array.isArray(lectures) ? lectures : []).filter(l => {
      const lectureDate = safeParseDate((l as any)?.date);
      if (!lectureDate) return false;
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
      <Pressable style={CourseActionStyles.upgradedModalOverlay} onPress={onClose}>
        <TouchableWithoutFeedback>
          <View
            style={[
              CourseActionStyles.upgradedModalSheet,
              { backgroundColor: colors.backgroundSecondary },
            ]}
          >
            <View style={CourseActionStyles.upgradedSheetHeader}>
              <View>
                <Text style={[CourseActionStyles.upgradedSheetTitle, { color: colors.textDarker }]}>
                  Request Exception
                </Text>
                <Text style={[CourseActionStyles.upgradedSheetSubtitle, { color: colors.text }]}>
                  Course Title: {course.courseTitle}
                </Text>
              </View>
              <TouchableOpacity onPress={onClose}>
                <MaterialIcons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
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
                    key={String((l as any)?.id ?? Math.random())}
                    label={`${(l as any)?.topicName ?? 'Lecture'} (${safeFormatDate((l as any)?.date)})`}
                    value={(l as any)?.id ?? ''}
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
              style={[CourseActionStyles.textArea, { color: colors.text, borderColor: colors.border }]}
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
                name="info-outline"
                size={19}
                color={colors.primary}
              />
              <Text
                style={[CourseActionStyles.costText, { color: colors.primary, flex: 1 }]}
              >
                {credits > 0
                  ? `Free while you have allowance left this month; otherwise 1 of your ${credits} extra exception${credits === 1 ? '' : 's'} is used.`
                  : `Free while you have allowance left this month. After that, you'll be asked to pay $${EXCEPTION_COST_USD} in your currency.`}
              </Text>
            </View>

            <View style={CourseActionStyles.modalActions}>
              <TouchableOpacity
                style={[
                  CourseActionStyles.cancelBtn,
                  { borderColor: colors.primary },
                ]}
                onPress={onClose}
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
              <CustomButton
                title={isSaving ? 'Submitting...' : 'Submit Request'}
                onPress={handleSubmit}
                disabled={isSaving}
                isLoading={isSaving}
                style={CourseActionStyles.saveBtn}
              />
              </View>
            </ScrollView>
          </View>
        </TouchableWithoutFeedback>
      </Pressable>
    </Modal>
  );
};
export const DetailHeader = ({
  title,
  searchQuery,
  setSearchQuery,
  placeholder,
  userRole,
}: HeaderProps) => {
  const { colors } = useTheme();
  const shouldShowSearch = !(
    title === 'Assessments' ||
    userRole === 'student' ||
    title === 'QuickPublicClass' ||
    title === 'Set Lecture Schedule' ||
    title === 'Grade Accelerator'
  );

  return (
    <>
      {shouldShowSearch && (
        <View
          style={[
            CourseActionStyles.searchBarWrapper,
            { backgroundColor: colors.backgroundSecondary },
          ]}
        >
          <View
            style={[
              CourseActionStyles.searchBarInner,
              { borderColor: colors.border },
            ]}
          >
            <MaterialIcons
              name="search"
              size={20}
              color={colors.inputTextHolder}
              style={CourseActionStyles.searchIcon}
            />
            <TextInput
              style={[CourseActionStyles.searchInput, { color: colors.text }]}
              placeholder={placeholder || `Search ${title}...`}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={colors.inputTextHolder}
              clearButtonMode="while-editing"
            />
            {/* Android Clear Button Logic */}
            {searchQuery.length > 0 && Platform.OS === 'android' && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <MaterialIcons
                  name="cancel"
                  size={18}
                  color={colors.inputTextHolder}
                  style={{ padding: 10 }}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </>
  );
};
export const RenderContents = ({
  course,
  onRefresh,
}: {
  course: Course | null;
  onRefresh: () => void;
}) => {
  if (!course) {
    console.log('Course details missing.');
    return null;
  }
  const currentUser = useAppSelector(state => state.user);
  const userRole = currentUser?.usertype;
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [contents, setContents] = useState<string[]>(
    course?.courseContents || [],
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalVisible, setModalVisible] = useState(false);
  const [currentText, setCurrentText] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const shouldShowSearch = !(userRole === 'student' || false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [selectedCourseContent, setSelectedCourseContent] = useState<{
    index: number;
    topicName: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredData = contents.filter((item: string) =>
    item.toLowerCase().includes(searchQuery.toLowerCase()),
  );
  console.log('Course Contents: ', filteredData);

  const openModal = (index: number | null = null) => {
    setEditingIndex(index);
    setCurrentText(index !== null ? contents[index] : '');
    setModalVisible(true);
  };
  const handleDeletePress = (index: number) => {
    setSelectedCourseContent({
      index,
      topicName: contents[index],
    });
    setDeleteModalVisible(true);
  };
  const confirmDelete = async () => {
    if (selectedCourseContent === null) return;

    const { index } = selectedCourseContent;

    try {
      setIsDeleting(true);

      const result = await deleteCourseContent(course.courseId, index);

      if (result.success) {
        setContents(contents.filter((_, i) => i !== index));
        setDeleteModalVisible(false);
        setSelectedCourseContent(null);
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
    } finally {
      setIsDeleting(false);
    }
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

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <PageHeader
        title={
          userRole === 'lecturer'
            ? 'Curriculum Management'
            : 'Syllabus Overview'
        }
        rightElement={
          userRole === 'lecturer' && (
            <CustomButton
              title="Add New Topic"
              onPress={openModal}
              iconName="add"
              iconColor="#fff"
              style={CourseActionStyles.addContentBtn}
            />
          )
        }
      />
      {shouldShowSearch && (
        <CourseSearchBar
          shouldShowSearch={shouldShowSearch}
          textInput={searchQuery}
          setTextInput={setSearchQuery}
          placeholder="Search topics, or notes..."
          colors={colors}
          CourseActionStyles={CourseActionStyles}
        />
      )}
      <FlatList
        data={filteredData}
        keyExtractor={(_, i) => i.toString()}
        contentContainerStyle={[
          CourseActionStyles.listPadding,
          { paddingBottom: insets.bottom + 20, flexGrow: 1 },
        ]}
        renderItem={({ item, index }) => (
          <View
            style={[
              CourseActionStyles.contentRow,
              { backgroundColor: colors.backgroundSecondary },
            ]}
          >
            <View style={CourseActionStyles.numberCircle}>
              <Text
                style={[CourseActionStyles.numberText, { color: colors.text }]}
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
                  <MaterialIcons name="edit" size={20} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDeletePress(index)}
                  style={CourseActionStyles.iconBtn}
                >
                  <MaterialIcons
                    name="delete"
                    size={20}
                    color={colors.primary}
                  />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
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
                  <CustomButton
                    title="Save Changes"
                    onPress={handleSave}
                    style={CourseActionStyles.saveBtn}
                  />
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </Pressable>
      </Modal>
      <ActionModal
        visible={deleteModalVisible}
        onClose={() => {
          if (!isDeleting) {
            setDeleteModalVisible(false);
            setSelectedCourseContent(null);
          }
        }}
        onContinue={confirmDelete}
        title="Delete Topic?"
        subtitle={`Are you sure you want to delete the selected course content? This action cannot be undone.`}
        continueText="Delete"
        loading={isDeleting}
      />
    </View>
  );
};
export const RenderMaterials: React.FC<RenderMaterialsProps> = ({
  course,
  onRefresh,
}) => {
  if (!course) {
    return null;
  }
  const currentUser = useAppSelector((state: any) => state.user);
  const userRole = currentUser?.usertype;
  const { colors } = useTheme();
  const { pickDocument } = useMediaPicker();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [isUploadModalVisible, setIsUploadModalVisible] = useState(false);
  const [uploadTitleInput, setUploadTitleInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [selectedResource, setSelectedResource] =
    useState<CourseResource | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const shouldShowSearch = userRole !== 'student';

  // Normalize resources (handles array / object-map / string / missing shapes)
  const rawResources: any = (course as any)?.resources;
  const resourceArray: any[] = Array.isArray(rawResources)
    ? rawResources
    : rawResources && typeof rawResources === 'object'
      ? Object.values(rawResources)
      : [];
  const formattedResources: CourseResource[] = resourceArray
    .filter(res => res != null && (typeof res === 'string' || typeof res === 'object'))
    .map((res: any, index) => {
      if (typeof res === 'string') {
        return {
          resourceId: `legacy_${index}`,
          resourceTitle: res.split('/').pop() || 'General Reference',
          resourceUrl: res,
          resourceSize: 'Unknown size',
          resourceMimetype: 'application/pdf',
        };
      }
      return {
        resourceId: String(res.resourceId ?? res.id ?? `res_${index}`),
        resourceTitle: String(res.resourceTitle ?? res.title ?? res.name ?? 'Untitled Document'),
        resourceUrl: String(res.resourceUrl ?? res.url ?? ''),
        resourceSize: (res.resourceSize ?? res.size ?? 'Unknown size') as any,
        resourceMimetype: String(res.resourceMimetype ?? res.mimetype ?? res.type ?? 'application/octet-stream'),
      } as CourseResource;
    })
    .filter(r => !!r.resourceUrl);
  const handleOpenPicker = async () => {
    try {
      const fileData = await pickDocument();
      if (fileData) {
        setSelectedFile(fileData);
        setUploadTitleInput(fileData.name?.replace(/\.[^/.]+$/, '') || '');
        setIsUploadModalVisible(true);
      }
    } catch (err: any) {
      if (!(
        isErrorWithCode(err) && err.code === errorCodes.OPERATION_CANCELED
      )) {
        Toast.show({
          type: 'error',
          text1: 'Document Error',
          text2: 'Could not select document.',
        });
      }
    }
  };
  const handleConfirmUpload = async () => {
    if (!selectedFile) return;

    try {
      setIsUploading(true);
      Toast.show({
        type: 'info',
        text1: 'Uploading to cloud storage...',
        position: 'bottom',
      });
      const firebaseResult = await uploadFileToFirebaseClient(
        selectedFile.uri,
        'course-materials',
      );

      if (!firebaseResult.success || !firebaseResult.data?.permanentUrl) {
        throw new Error('Cloud storage processing failed.');
      }

      Toast.show({
        type: 'info',
        text1: 'Syncing with backend...',
        position: 'bottom',
      });
      const payload = {
        resourceTitle:
          uploadTitleInput.trim() || selectedFile.name || 'Untitled Document',
        resourceUrl: firebaseResult.data.permanentUrl,
        resourceSize: selectedFile.size || 0,
        resourceMimetype:
          selectedFile.type ||
          selectedFile.mimeType ||
          'application/octet-stream',
      };
      const apiResult = await saveCourseMaterial(course.courseId, payload);
      if (apiResult.success) {
        Toast.show({
          type: 'success',
          text1: 'Material Uploaded Successfully',
        });
        setIsUploadModalVisible(false);
        setSelectedFile(null);
        setUploadTitleInput('');
        onRefresh();
      } else {
        throw new Error(apiResult.error || 'Backend synchronization failed.');
      }
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: 'Upload Failed',
        text2: err?.message || 'Please try again later.',
      });
    } finally {
      setIsUploading(false);
    }
  };
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
      Toast.show({
        type: 'info',
        text1: 'Downloading material...',
        position: 'bottom',
      });

      const result = RNFS.downloadFile({ fromUrl: url, toFile: downloadPath });
      await result.promise;
      Toast.show({
        type: 'success',
        text1: 'Download Complete',
        text2: 'Saved to Downloads folder',
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Download Failed',
        text2: 'Could not complete file download.',
      });
    }
  };
  const handleDeleteClick = (resource: CourseResource) => {
    setSelectedResource(resource);
    setDeleteModalVisible(true);
  };
  const confirmDelete = async () => {
    if (!selectedResource) return;
    try {
      setIsDeleting(true);
      const apiResult = await deleteCourseMaterial(course.courseId, {
        resourceId: selectedResource.resourceId,
      });

      if (apiResult.success) {
        Toast.show({ type: 'success', text1: 'Material Deleted Successfully' });
        setDeleteModalVisible(false);
        setSelectedResource(null);
        onRefresh();
      } else {
        throw new Error(apiResult.error || 'Backend failed to delete asset.');
      }
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: 'Deletion Failed',
        text2: err?.message || 'Please try again',
      });
    } finally {
      setIsDeleting(false);
    }
  };
  const filteredData = formattedResources.filter(
    item =>
      item?.resourceTitle?.toLowerCase().includes((searchQuery || '').toLowerCase()) ||
      item?.resourceUrl?.toLowerCase().includes((searchQuery || '').toLowerCase()),
  );
  const formatBytes = (bytes?: number | string) => {
    if (!bytes || typeof bytes !== 'number') return '';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <View
      style={[
        CourseActionStyles.container,
        { backgroundColor: colors.background },
      ]}
    >
      <PageHeader
        title="Course Materials"
        rightElement={
          userRole === 'lecturer' ? (
            <TouchableOpacity
              style={[
                CourseActionStyles.primaryButton,
                { backgroundColor: colors.primary },
              ]}
              onPress={handleOpenPicker}
              activeOpacity={0.8}
            >
              <MaterialIcons name="add" size={18} color="#fff" />
              <Text style={CourseActionStyles.primaryButtonText}>
                Add Material
              </Text>
            </TouchableOpacity>
          ) : null
        }
      />
      {shouldShowSearch && (
        <View
          style={[
            CourseActionStyles.searchContainer,
            { backgroundColor: colors.backgroundSecondary || '#f5f5f5' },
          ]}
        >
          <MaterialIcons
            name="search"
            size={20}
            color="#888"
            style={{ marginRight: 8 }}
          />
          <TextInput
            style={[CourseActionStyles.searchInput, { color: colors.text }]}
            placeholder="Search documents..."
            placeholderTextColor="#888"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <MaterialIcons name="close" size={18} color="#888" />
            </TouchableOpacity>
          )}
        </View>
      )}
      <FlatList
        data={filteredData}
        keyExtractor={item => item.resourceId}
        refreshing={refreshing}
        onRefresh={onRefresh}
        contentContainerStyle={[
          CourseActionStyles.listContent,
          { paddingBottom: insets.bottom + 24 },
        ]}
        renderItem={({ item }) => {
          const fileName =
            item?.resourceUrl?.split('/').pop() || 'document';
          const formattedSize = formatBytes(item.resourceSize as number);

          return (
            <View
              style={[
                CourseActionStyles.materialCard,
                { backgroundColor: colors.backgroundSecondary || '#ffffff' },
              ]}
            >
              <View
                style={[
                  CourseActionStyles.iconContainer,
                  { backgroundColor: `${colors.primary}15` },
                ]}
              >
                <MaterialIcons
                  name="insert-drive-file"
                  size={24}
                  color={colors.primary}
                />
              </View>

              <View style={CourseActionStyles.cardInfo}>
                <Text
                  style={[
                    CourseActionStyles.materialTitle,
                    { color: colors.text },
                  ]}
                  numberOfLines={1}
                >
                  {item.resourceTitle}
                </Text>
                <View style={CourseActionStyles.metaRow}>
                  {formattedSize ? (
                    <Text style={CourseActionStyles.metaText}>
                      {formattedSize}
                    </Text>
                  ) : null}
                  {item.resourceMimetype && (
                    <Text style={CourseActionStyles.metaText}>
                      • {item.resourceMimetype.split('/').pop()?.toUpperCase()}
                    </Text>
                  )}
                </View>
              </View>

              <View style={CourseActionStyles.actionRow}>
                <TouchableOpacity
                  style={[
                    CourseActionStyles.iconButton,
                    { backgroundColor: `${colors.primary}10` },
                  ]}
                  onPress={() => handleDownload(item.resourceUrl, fileName)}
                >
                  <MaterialIcons
                    name="file-download"
                    size={18}
                    color={colors.primary}
                  />
                </TouchableOpacity>

                {userRole === 'lecturer' && (
                  <TouchableOpacity
                    style={[
                      CourseActionStyles.iconButton,
                      CourseActionStyles.deleteIconButton,
                    ]}
                    onPress={() => handleDeleteClick(item)}
                  >
                    <MaterialIcons
                      name="delete-outline"
                      size={18}
                      color="#FF3B30"
                    />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <EmptyState
            title="No Materials Found"
            subtitle={
              userRole === 'lecturer'
                ? "You haven't uploaded any resources for this course yet."
                : "Your instructor hasn't posted any materials yet."
            }
            iconName="folder-open"
          />
        }
      />
      <Modal visible={isUploadModalVisible} transparent animationType="fade">
        <View style={CourseActionStyles.modalOverlay}>
          <View
            style={[
              CourseActionStyles.modalContent,
              { backgroundColor: colors.background },
            ]}
          >
            <Text
              style={[
                CourseActionStyles.modalHeaderTitle,
                { color: colors.text },
              ]}
            >
              Upload Material
            </Text>
            <Text
              style={[CourseActionStyles.modalSubText, { color: colors.text }]}
            >
              Provide a custom title for your document.
            </Text>

            <TextInput
              style={[
                CourseActionStyles.titleInput,
                { color: colors.text, borderColor: colors.border || '#ddd' },
              ]}
              placeholder="Resource Title (e.g., Week 1 Lecture Notes)"
              placeholderTextColor={colors.inputTextHolder}
              value={uploadTitleInput}
              onChangeText={setUploadTitleInput}
            />

            {selectedFile && (
              <View style={CourseActionStyles.filePreviewBadge}>
                <MaterialIcons
                  name="attach-file"
                  size={16}
                  color={colors.primary}
                />
                <Text
                  style={[
                    CourseActionStyles.filePreviewText,
                    { color: colors.text },
                  ]}
                  numberOfLines={1}
                >
                  {selectedFile.name} ({formatBytes(selectedFile.size)})
                </Text>
              </View>
            )}

            <View style={CourseActionStyles.modalButtonRow}>
              <TouchableOpacity
                style={[
                  CourseActionStyles.modalBtn,
                  CourseActionStyles.cancelBtn,
                ]}
                onPress={() => {
                  if (!isUploading) {
                    setIsUploadModalVisible(false);
                    setSelectedFile(null);
                  }
                }}
              >
                <Text style={CourseActionStyles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  CourseActionStyles.modalBtn,
                  CourseActionStyles.submitBtn,
                  { backgroundColor: colors.primary },
                ]}
                onPress={handleConfirmUpload}
                disabled={isUploading}
              >
                {isUploading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={CourseActionStyles.submitBtnText}>
                    Upload & Save
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <ActionModal
        visible={deleteModalVisible}
        onClose={() => {
          if (!isDeleting) {
            setDeleteModalVisible(false);
            setSelectedResource(null);
          }
        }}
        onContinue={confirmDelete}
        title="Delete Material?"
        subtitle={`Are you sure you want to permanently delete "${selectedResource?.resourceTitle}"? This action cannot be undone.`}
        continueText="Delete"
        loading={isDeleting}
      />
    </View>
  );
};
export const RenderAssignments = ({ course }: { course: Course | null }) => {
  if (!course) {
    console.log('Course details missing.');
    return null;
  }
  const { colors } = useTheme();
  const user = useAppSelector(state => state.user);
  const userRole = user?.usertype;
  const insets = useSafeAreaInsets();
  const [isModalVisible, setModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [localAssignments, setLocalAssignments] = useState<Assignment[]>(
    course?.assignments || [],
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const shouldShowSearch = !(userRole === 'student' || false);
  const filteredData = localAssignments.filter(
    (item: any) =>
      item?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item?.fileUrl
        ?.split('/')
        .pop()
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()),
  );

  const isPastDue = (dueDate: string) => {
    const d = safeParseDate(dueDate);
    if (!d) return false;
    return new Date() > d;
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
  const handleAssignmentDeletePress = (
    assignmentId: string,
    assignmentTitle: string,
  ) => {
    setSelectedAssignment({ id: assignmentId, title: assignmentTitle });
    setDeleteModalVisible(true);
  };
  const confirmAssignmentDelete = async () => {
    if (!selectedAssignment) return;
    try {
      setIsDeleting(true);
      const result = await deleteAssignment(
        course.courseId,
        selectedAssignment.id,
      );
      if (result.success) {
        Toast.show({
          type: 'success',
          text1: 'Assignment Removed',
          position: 'bottom',
          bottomOffset: insets.bottom > 0 ? insets.bottom : 20,
        });
        setDeleteModalVisible(false);
        setSelectedAssignment(null);
        if (onRefresh) onRefresh();
      } else {
        Toast.show({
          type: 'error',
          text1: 'Deletion Failed',
          text2:
            result.error || 'Could not remove assignment, please try again.',
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
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <View style={{ backgroundColor: colors.background, flex: 1 }}>
      <PageHeader
        title="Assignments"
        rightElement={
          userRole === 'lecturer' && (
            <CustomButton
              title="Create"
              onPress={() => setModalVisible(true)}
              iconName="add"
              iconColor="#fff"
              style={CourseActionStyles.addButton}
            />
          )
        }
      />
      {shouldShowSearch && (
        <CourseSearchBar
          shouldShowSearch={shouldShowSearch}
          textInput={searchQuery}
          setTextInput={setSearchQuery}
          placeholder="Search assignments..."
          colors={colors}
          CourseActionStyles={CourseActionStyles}
        />
      )}
      <FlatList
        data={filteredData || []}
        refreshing={refreshing}
        onRefresh={onRefresh}
        keyExtractor={(item, i) => item?.id || i.toString()}
        contentContainerStyle={[
          CourseActionStyles.listPadding,
          { paddingBottom: insets.bottom + 20, flexGrow: 1 },
        ]}
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
                  {overdue ? 'Past Due: ' : 'Due: '} {safeFormatDate(item?.dueDate)}
                </Text>
              </View>
              {userRole === 'lecturer' && !overdue && (
                <TouchableOpacity
                  style={[
                    CourseActionStyles.statusTag,
                    { backgroundColor: colors.btnColor },
                  ]}
                  onPress={() =>
                    handleAssignmentDeletePress(item?.id, item?.title ?? 'Assignment')
                  }
                >
                  <MaterialIcons
                    name="delete"
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
            iconName="content-paste-off"
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
      <ActionModal
        visible={deleteModalVisible}
        onClose={() => {
          if (!isDeleting) {
            setDeleteModalVisible(false);
            setSelectedAssignment(null);
          }
        }}
        onContinue={confirmAssignmentDelete}
        title="Delete Assignment?"
        subtitle={`Are you sure you want to permanently delete "${selectedAssignment?.title}"? This will also remove all student submissions and cannot be undone.`}
        continueText="Delete"
        loading={isDeleting}
      />
    </View>
  );
};
export const RenderStudentExceptions = ({
  exceptions,
  onAddPress,
  onBuyPress,
  refreshing,
  onRefresh,
}: StudentExceptionsProps) => {
  const { colors } = useTheme();
  const user = useAppSelector(state => state.user);
  const safeExceptions = Array.isArray(exceptions) ? exceptions : [];
  const currentPlan =
    user?.tier && (EXCEPTION_ACCOUNT_LIMITS as any)[user.tier] != null
      ? user.tier
      : 'free';
  const planLimit = (EXCEPTION_ACCOUNT_LIMITS as any)[currentPlan] ?? 2;
  const credits = Number(user?.exceptionCredits) || 0;
  // Display price only; the server charges the same USD price at its live rate.
  const { exchangeData, ready } = useExchangeRate(user?.country || 'Nigeria');
  const localPrice = ready
    ? `${exchangeData.symbol}${(EXCEPTION_COST_USD * exchangeData.rate).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`
    : `$${EXCEPTION_COST_USD.toFixed(2)}`;
  const [searchQuery, setSearchQuery] = useState('');
  const shouldShowSearch = true;

  const filteredData = safeExceptions.filter(item => {
    const title = item?.courseInfo?.courseTitle?.toLowerCase() ?? '';
    const code = item?.courseInfo?.courseCode?.toLowerCase() ?? '';
    const category = item?.reasonCategory?.toLowerCase() ?? '';
    const query = (searchQuery || '').toLowerCase();
    return (
      title.includes(query) || code.includes(query) || category.includes(query)
    );
  });

  const usedThisMonth = safeExceptions.filter(e => {
    const d = safeParseDate((e as any)?.createdAt);
    if (!d) return false;
    const now = new Date();
    return (
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear()
    );
  }).length;

  // Only this course's exceptions are loaded here, so this is a hint; the
  // server counts every course and asks for payment when it's needed.
  const isOverTierLimit = usedThisMonth >= planLimit;

  return (
    <FlatList
      data={filteredData}
      refreshing={refreshing}
      onRefresh={onRefresh}
      keyExtractor={item => String((item as any)?.id ?? Math.random())}

      ListHeaderComponent={
        <>
          <PageHeader
            title="My Lecture Exceptions"
            subtitle={`${planLimit} free each month${credits > 0 ? ` · ${credits} extra available` : ''}`}
            rightElement={
              <CustomButton
                title="Request Exception"
                onPress={onAddPress}
                iconName="add"
                iconColor="#fff"
                style={CourseActionStyles.addButton}
              />
            }
          />
          <View
            style={[
              CourseActionStyles.costWarning,
              { borderLeftColor: colors.primary, marginHorizontal: 15 },
            ]}
          >
            <MaterialIcons name="info-outline" size={19} color={colors.primary} />
            <Text style={[CourseActionStyles.costText, { color: colors.text, flex: 1 }]}>
              {isOverTierLimit && credits === 0
                ? `You've used this month's free exceptions. Extra ones cost ${localPrice} each.`
                : `After your free ones, extra exceptions cost ${localPrice} each.`}
            </Text>
            {onBuyPress && (
              <TouchableOpacity onPress={onBuyPress} hitSlop={8}>
                <Text style={{ color: colors.primary, fontWeight: '700' }}>Buy</Text>
              </TouchableOpacity>
            )}
          </View>
          {shouldShowSearch && (
            <CourseSearchBar
              shouldShowSearch={shouldShowSearch}
              textInput={searchQuery}
              setTextInput={setSearchQuery}
              placeholder="Search lecture exceptions..."
              colors={colors}
              CourseActionStyles={CourseActionStyles}
            />
          )}
        </>
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
              {item?.courseInfo?.courseTitle ?? 'Untitled course'}
            </Text>
            <Text
              style={[CourseActionStyles.reasonText, { color: colors.text }]}
              numberOfLines={2}
            >
              {item?.reasonCategory ?? 'Exception'}: {item?.reason ?? ''}
            </Text>
            <Text
              style={[CourseActionStyles.dateText2, { color: colors.text }]}
            >
              {safeFormatDate(item?.date)}
            </Text>
          </View>
          <View style={CourseActionStyles.statusBadge}>
            <MaterialIcons
              name={
                item?.status === 'approved'
                  ? 'check-circle'
                  : item?.status === 'rejected'
                    ? 'error-outline'
                    : 'access-time'
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
              {item?.status ?? 'pending'}
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
  refreshing,
  onRefresh,
}: LecturerManageProps) => {
  const { colors } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const shouldShowSearch = true;
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
              <CustomButton
                title="Approve"
                onPress={() => onUpdateStatus(item.id, 'approved')}
                iconName="check-circle"
                iconColor="#fff"
                style={CourseActionStyles.approveBtn}
              />
              <CustomButton
                title="Reject"
                onPress={() => onUpdateStatus(item.id, 'rejected')}
                iconName="cancel"
                iconColor="#fff"
                style={CourseActionStyles.approveBtn}
              />
            </View>
          ) : (
            <View style={CourseActionStyles.finalStatusContainer}>
              <MaterialIcons
                name={item.status === 'approved' ? 'check-circle' : 'cancel'}
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
          iconName="done-all"
          title="All Caught Up!"
          subtitle="There are no pending student exceptions requiring your approval right now."
          style={{ marginTop: 80 }}
        />
      }

      ListHeaderComponent={
        <>
          <PageHeader title="Manage Lecture Exceptions" />
          {shouldShowSearch && (
            <CourseSearchBar
              shouldShowSearch={shouldShowSearch}
              textInput={searchQuery}
              setTextInput={setSearchQuery}
              placeholder="Search assignments..."
              colors={colors}
              CourseActionStyles={CourseActionStyles}
            />
          )}
        </>
      }
    />
  );
};
export const RenderScheduleLecture = ({
  course,
  onSave,
  isLoading,
}: RenderScheduleProps) => {
  const { colors } = useTheme();
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [repeatWeeks, setRepeatWeeks] = useState(1);
  const getPlaceholder = () => {
    switch (form.lectureType) {
      case 'Online':
        return 'Auto generating icampus link...';
      case 'Physical':
      default:
        return 'e.g. Lecture Hall 1, Room 302';
    }
  };
  const [form, setForm] = useState({
    topicName: '',
    lectureType: 'Physical',
    location: '',
    startTime: new Date().toISOString(),
    endTime: new Date().toISOString(),
    date: new Date().toISOString().split('T')[0],
  });
  const validateAndSave = () => {
    const { topicName, location, date, startTime, endTime } = form;
    const venueValue = location;
    const isOnline = form.lectureType === 'Online';

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
      lectureType: form.lectureType as 'Physical' | 'Online',
      location: isOnline ? '' : form.location,
      startTime: safeParseDate(`${form.date}T${form.startTime}:00`) ?? new Date(),
      endTime: safeParseDate(`${form.date}T${form.endTime}:00`) ?? new Date(),
      date: safeParseDate(form.date!) ?? new Date(),
      repeatWeeks: repeatWeeks,
    };
    onSave(payload);
  };
  const getLabel = () => {
    switch (form.lectureType) {
      case 'Online':
        return 'Meeting Link';
      case 'Physical':
      default:
        return 'Physical Venue';
    }
  };
  const [showTopicPicker, setShowTopicPicker] = useState(false);
  const {
    pickerMode,
    showPicker,
    hidePicker,
    formatDate: formatPickerDate,
    formatTime,
  } = useDateTimePicker();
  const handleConfirm = (event: any, selectedDate?: Date) => {
    hidePicker();
    if (!selectedDate) return;

    if (pickerMode === 'date') {
      setForm({ ...form, date: formatPickerDate(selectedDate) });
    } else if (pickerMode === 'startTime') {
      const time = formatTime(selectedDate);
      setForm({ ...form, startTime: time });
    } else if (pickerMode === 'endTime') {
      const time = formatTime(selectedDate);
      setForm({ ...form, endTime: time });
    }
  };
  useEffect(() => {
    if (course?.courseId) {
      setForm(prev => ({ ...prev, courseId: course.courseId }));
    }
  }, [course?.courseId]);

  return (
    <ScrollView
      contentContainerStyle={[
        CourseActionStyles.container,
        { backgroundColor: colors.backgroundSecondary },
      ]}
    >
      <Text
        style={[CourseActionStyles.labelMain, { color: colors.textDarker }]}
      >
        Set Lecture Schedule
      </Text>
      <Text style={[CourseActionStyles.inputLabel, { color: colors.text }]}>
        Select Lecture Topic
      </Text>
      <TouchableOpacity
        style={[CourseActionStyles.textInput, { borderColor: colors.border }]}
        onPress={() => setShowTopicPicker(true)}
      >
        <Text
          style={[
            CourseActionStyles.textInputText,
            { color: form.topicName ? colors.inputTextHolder : colors.text },
          ]}
        >
          {form.topicName || 'Choose a topic from syllabus'}
        </Text>
        <MaterialIcons name="expand-more" size={20} color={colors.text} />
      </TouchableOpacity>

      <Text style={[CourseActionStyles.inputLabel, { color: colors.text }]}>
        Lecture Type
      </Text>
      <View style={CourseActionStyles.typeToggleContainer}>
        {(['Physical', 'Online'] as const).map(type => (
          <TouchableOpacity
            key={type}
            style={[
              CourseActionStyles.typeOption,
              form.lectureType === type && { backgroundColor: colors.btnColor },
            ]}
            onPress={() => setForm({ ...form, lectureType: type })}
          >
            <Text
              style={[
                CourseActionStyles.typeOptionText,
                form.lectureType === type
                  ? { color: colors.btnTextColor }
                  : { color: colors.text },
              ]}
            >
              {type}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={[CourseActionStyles.inputLabel, { color: colors.text }]}>
        {getLabel()}
      </Text>
      <View
        style={[
          CourseActionStyles.inputContainer,
          { borderColor: colors.border },
          form.lectureType === 'Online' && {
            backgroundColor: colors.btnColor,
          },
        ]}
      >
        <TextInput
          style={[
            CourseActionStyles.textInput,
            form.lectureType === 'Online' && {
              color: colors.btnTextColor,
            },
            { color: colors.text },
          ]}
          placeholder={getPlaceholder()}
          value={form.location}
          editable={form.lectureType !== 'Online'}
          onChangeText={val => {
            setForm({ ...form, location: val });
          }}
          placeholderTextColor={colors.inputTextHolder}
        />
        {form.lectureType === 'Online' && (
          <MaterialIcons
            name="check-circle"
            size={16}
            color={colors.btnTextColor}
          />
        )}
      </View>

      <View style={CourseActionStyles.dateTimeRow}>
        <TouchableOpacity
          style={[
            CourseActionStyles.dateTimeBox,
            { borderColor: colors.border },
          ]}
          onPress={() => showPicker('date')}
        >
          <MaterialIcons name="calendar-month" size={24} color={colors.text} />
          <Text style={[CourseActionStyles.microLabel, { color: colors.text }]}>
            Date
          </Text>
          <Text
            style={[CourseActionStyles.dateTimeText, { color: colors.text }]}
          >
            {form.date || 'Select Date'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            CourseActionStyles.dateTimeBox,
            { borderColor: colors.border },
          ]}
          onPress={() => showPicker('startTime')}
        >
          <MaterialIcons name="schedule" size={24} color={colors.text} />
          <Text style={[CourseActionStyles.microLabel, { color: colors.text }]}>
            Start Time
          </Text>
          <Text
            style={[CourseActionStyles.dateTimeText, { color: colors.text }]}
          >
            {form.startTime || '00:00'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            CourseActionStyles.dateTimeBox,
            { borderColor: colors.border },
          ]}
          onPress={() => showPicker('endTime')}
        >
          <MaterialIcons name="schedule" size={24} color={colors.text} />
          <Text style={[CourseActionStyles.microLabel, { color: colors.text }]}>
            Ends
          </Text>
          <Text
            style={[CourseActionStyles.dateTimeText, { color: colors.text }]}
          >
            {form.endTime || '00:00'}
          </Text>
        </TouchableOpacity>
      </View>
      <Text style={[CourseActionStyles.inputLabel, { color: colors.text }]}>
        Set Recursion?
      </Text>
      <View style={CourseActionStyles.repeatCounter}>
        <TouchableOpacity
          onPress={() => setRepeatWeeks(Math.max(1, repeatWeeks - 1))}
        >
          <MaterialIcons name="remove" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[CourseActionStyles.repeatValue, { color: colors.text }]}>
          {repeatWeeks} {repeatWeeks > 1 ? 'Weeks' : 'Week'}
        </Text>
        <TouchableOpacity
          onPress={() => setRepeatWeeks(Math.min(12, repeatWeeks + 1))}
        >
          <MaterialIcons name="add" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>
      <CustomButton
        title="Save Lecture Schedule"
        onPress={validateAndSave}
        disabled={isLoading}
        iconName="add"
        iconColor="#fff"
        style={CourseActionStyles.submitButton}
      />
      <Modal visible={showTopicPicker} transparent animationType="fade">
        <Pressable
          style={CourseActionStyles.modalOverlayEnd}
          onPress={() => setShowTopicPicker(false)}
        >
          <View
            style={[
              CourseActionStyles.pickerContainer2,
              { backgroundColor: colors.backgroundSecondary },
            ]}
          >
            <Text
              style={[
                CourseActionStyles.pickerTitle,
                { color: colors.textDarker },
              ]}
            >
              Course Syllabus
            </Text>
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
                  <Text
                    style={[
                      CourseActionStyles.pickerItemText,
                      { color: colors.text },
                    ]}
                  >
                    {item}
                  </Text>
                  {form.topicName === item && (
                    <MaterialIcons
                      name="check-circle"
                      size={18}
                      color={colors.primary}
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
          <View
            style={[
              CourseActionStyles.alertBox,
              { backgroundColor: colors.backgroundSecondary },
            ]}
          >
            <MaterialIcons
              name="error-outline"
              size={50}
              color={colors.primary}
            />
            <Text
              style={[
                CourseActionStyles.alertTitle,
                { color: colors.textDarker },
              ]}
            >
              Missing Information
            </Text>
            <Text
              style={[CourseActionStyles.alertText, { color: colors.text }]}
            >
              {errorMessage}
            </Text>
            <TouchableOpacity
              style={[
                CourseActionStyles.alertButton,
                { backgroundColor: colors.btnColor },
              ]}
              onPress={() => setShowErrorModal(false)}
            >
              <Text
                style={[
                  CourseActionStyles.alertButtonText,
                  { color: colors.btnTextColor },
                ]}
              >
                Got it
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {pickerMode && (
        <DateTimePicker
          value={new Date()}
          mode={pickerMode === 'date' ? 'date' : 'time'}
          is24Hour={true}
          display="default"
          onChange={handleConfirm}
        />
      )}
    </ScrollView>
  );
};
export const QuickPublicMeeting = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const [saving, setIsSaving] = useState(false);
  const [successData, setSuccessData] = useState<{ link: string } | null>(null);
  const [form, setForm] = useState({
    topicName: '',
    startTime: '08:00',
    endTime: '10:00',
    date: new Date().toISOString().split('T')[0],
  });
  const {
    pickerMode,
    showPicker,
    hidePicker,
    formatDate: formatPickerDate,
    formatTime,
  } = useDateTimePicker();

  const handleSave = async () => {
    if (!form.topicName.trim()) {
      Alert.alert('Missing Input', 'Please enter a meeting topic.');
      return;
    }

    setIsSaving(true);
    const result = await createPublicMeeting(form);
    setIsSaving(false);

    if (result.success && result.meeting) {
      setSuccessData({ link: result.meeting.location });
    } else {
      Alert.alert('Error', result.error || 'Could not create meeting.');
    }
  };
  const handleConfirm = (event: any, selectedDate?: Date) => {
    hidePicker();
    if (!selectedDate) return;

    if (pickerMode === 'date') {
      setForm({ ...form, date: formatPickerDate(selectedDate) });
    } else if (pickerMode === 'startTime') {
      const time = formatTime(selectedDate);
      setForm({ ...form, startTime: time });
    } else if (pickerMode === 'endTime') {
      const time = formatTime(selectedDate);
      setForm({ ...form, endTime: time });
    }
  };

  return (
    <View
      style={{
        paddingHorizontal: 15,
        flex: 1,
        backgroundColor: colors.background,
      }}
    >
      <PageHeader title={'Schedule Quick Online Class'} />

      <TextInput
        placeholder="Class Topic (e.g., Project Sync)"
        placeholderTextColor={colors.inputTextHolder}
        style={[
          CourseActionStyles.textInput2,
          {
            color: colors.text,
            borderColor: colors.border,
            marginVertical: 20,
            backgroundColor: colors.backgroundSecondary,
          },
        ]}
        value={form.topicName}
        onChangeText={val => setForm({ ...form, topicName: val })}
      />

      <View style={CourseActionStyles.dateTimeRow}>
        <TouchableOpacity
          style={[
            CourseActionStyles.dateTimeBox,
            { borderColor: colors.border },
          ]}
          onPress={() => showPicker('date')}
        >
          <MaterialIcons name="calendar-month" size={24} color={colors.text} />
          <Text style={[CourseActionStyles.microLabel, { color: colors.text }]}>
            Date
          </Text>
          <Text
            style={[CourseActionStyles.dateTimeText, { color: colors.text }]}
          >
            {form.date || 'Select Date'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            CourseActionStyles.dateTimeBox,
            { borderColor: colors.border },
          ]}
          onPress={() => showPicker('startTime')}
        >
          <MaterialIcons name="schedule" size={24} color={colors.text} />
          <Text style={[CourseActionStyles.microLabel, { color: colors.text }]}>
            Start Time
          </Text>
          <Text
            style={[CourseActionStyles.dateTimeText, { color: colors.text }]}
          >
            {form.startTime || '00:00'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            CourseActionStyles.dateTimeBox,
            { borderColor: colors.border },
          ]}
          onPress={() => showPicker('endTime')}
        >
          <MaterialIcons name="schedule" size={24} color={colors.text} />
          <Text style={[CourseActionStyles.microLabel, { color: colors.text }]}>
            Ends
          </Text>
          <Text
            style={[CourseActionStyles.dateTimeText, { color: colors.text }]}
          >
            {form.endTime || '00:00'}
          </Text>
        </TouchableOpacity>
      </View>
      <CustomButton
        title="Schedule Meeting"
        onPress={handleSave}
        disabled={saving}
        iconName="add"
        iconColor="#fff"
        style={CourseActionStyles.submitButton}
      />
      <Modal visible={!!successData} transparent animationType="slide">
        <View style={CourseActionStyles.modalOverlay}>
          <View
            style={[
              CourseActionStyles.alertBox,
              { backgroundColor: colors.backgroundSecondary },
            ]}
          >
            <MaterialIcons
              name="check-circle"
              color={colors.success}
              size={60}
            />
            <Text
              style={[
                CourseActionStyles.alertTitle,
                {
                  color: colors.textDarker,
                },
              ]}
            >
              Class Successfully Scheduled
            </Text>

            <TextInput
              value={successData?.link}
              editable={false}
              style={[
                CourseActionStyles.classLink,
                {
                  borderColor: colors.border,
                  color: colors.success,
                },
              ]}
            />

            <View style={CourseActionStyles.rowDiv}>
              <CustomButton
                title="Copy Link"
                onPress={() => Clipboard.setString(successData?.link || '')}
                iconName="content-copy"
                iconColor="#fff"
                style={CourseActionStyles.classActionBtns}
              />
              <CustomButton
                title="Share Link"
                onPress={async () => {
                  try {
                    await Share.share({
                      message: `Join my meeting: ${successData?.link}`,
                      url: successData?.link,
                      title: 'Meeting Link',
                    });
                    setSuccessData(null);
                    navigation.navigate('Home', { activeTab: 'classroom' });
                  } catch (error) {
                    console.error('Error sharing:', error);
                  }
                }}
                iconName="share"
                iconColor="#fff"
                style={CourseActionStyles.classActionBtns}
              />
            </View>
          </View>
        </View>
      </Modal>
      {pickerMode && (
        <DateTimePicker
          value={new Date()}
          mode={pickerMode === 'date' ? 'date' : 'time'}
          is24Hour={true}
          display="default"
          onChange={handleConfirm}
        />
      )}
    </View>
  );
};
export const RenderLecturerTestManage = ({
  course,
  refreshing,
  onRefresh,
  onSaveTest,
  tests,
}: LecturerTestManageProps) => {
  const { colors } = useTheme();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const initialFormState = {
    title: '',
    duration: '30',
    dueDate: null,
    scheduledStart: null,
    endTime: null,
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
  const [searchQuery, setSearchQuery] = useState('');
  const shouldShowSearch = true;
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
      dueDate: safeParseDate((test as any)?.dueDate),
      totalMarks: (test.totalMarks ?? 0).toString(),
      questions: test.questions ?? [],
      scheduledStart: safeParseDate((test as any)?.scheduledStart),
      endTime: safeParseDate((test as any)?.endTime),
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
    if (
      !testForm.title ||
      !testForm.dueDate ||
      !testForm.endTime ||
      !testForm.scheduledStart ||
      !testForm.questions ||
      !testForm.duration ||
      !testForm.totalMarks
    ) {
      Toast.show({
        type: 'error',
        text1: 'Required Fields',
        text2: 'Please provide all details for your assessment creation.',
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
      endTime: testForm.endTime,
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
        dueDate: currentForm.dueDate ?? new Date(),
        scheduledStart: currentForm.scheduledStart ?? new Date(),
        endTime: currentForm.endTime ?? new Date(),
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
  const {
    pickerMode,
    showPicker,
    hidePicker,
    formatTime,
    formatDate: formatPickeDate,
  } = useDateTimePicker();
  const handleConfirm = (event: any, selectedDate?: Date) => {
    hidePicker();
    if (event.type === 'set' && selectedDate) {
      if (pickerMode === 'date') {
        const dateString = selectedDate;
        setTestForm(prev => ({ ...prev, date: dateString }));
      } else if (pickerMode === 'startTime') {
        setTestForm(prev => ({
          ...prev,
          scheduledStart: selectedDate,
        }));
      } else if (pickerMode === 'endTime') {
        setTestForm(prev => ({ ...prev, dueDate: selectedDate }));
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
          const isPastDue = (() => {
            const d = safeParseDate((item as any)?.dueDate);
            if (!d) return false;
            return new Date() > d;
          })();
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
                <CustomButton
                  title="Download Assessment Report"
                  onPress={() =>
                    downloadAssessmentReport(item.id!, item.title!)
                  }
                  iconName="assessment"
                  iconColor="#fff"
                  style={CourseActionStyles.downloadTestBtn}
                />
              ) : (
                <View style={[CourseActionStyles.downloadTestBtn]}>
                  <MaterialIcons
                    name="access-time"
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
          <>
            <PageHeader
              title="Assessments"
              rightElement={
                <CustomButton
                  title="Create Assessment"
                  onPress={() => {
                    setEditingId(null);
                    setTestForm({
                      title: '',
                      duration: '',
                      dueDate: null,
                      totalMarks: '',
                      questions: [],
                      scheduledStart: null,
                      endTime: null,
                    });
                    setIsModalVisible(true);
                  }}
                  iconName="add"
                  iconColor="#fff"
                  style={CourseActionStyles.createCard}
                />
              }
            />
            {shouldShowSearch && (
              <CourseSearchBar
                shouldShowSearch={shouldShowSearch}
                textInput={searchQuery}
                setTextInput={setSearchQuery}
                placeholder="Search assessments..."
                colors={colors}
                CourseActionStyles={CourseActionStyles}
              />
            )}
          </>
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
                      name="cancel"
                      size={22}
                      color={colors.primary}
                      style={{ padding: 10 }}
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
                              name="cancel"
                              size={22}
                              color={colors.primary}
                              style={{ padding: 10 }}
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
            </View>
            <View style={CourseActionStyles.dateTimeRow}>
              <TouchableOpacity
                style={[
                  CourseActionStyles.dateTimeBox,
                  { borderColor: colors.border },
                ]}
                onPress={() => showPicker('date')}
              >
                <MaterialIcons
                  name="calendar-month"
                  size={24}
                  color={colors.text}
                />
                <Text
                  style={[
                    CourseActionStyles.microLabel,
                    { color: colors.text },
                  ]}
                >
                  Date
                </Text>
                <Text
                  style={[
                    CourseActionStyles.dateTimeText,
                    { color: colors.text },
                  ]}
                >
                  {testForm.dueDate instanceof Date
                    ? formatPickeDate(testForm.dueDate)
                    : testForm.dueDate || '00:00'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  CourseActionStyles.dateTimeBox,
                  { borderColor: colors.border },
                ]}
                onPress={() => showPicker('startTime')}
              >
                <MaterialIcons name="schedule" size={24} color={colors.text} />
                <Text
                  style={[
                    CourseActionStyles.microLabel,
                    { color: colors.text },
                  ]}
                >
                  Start Time
                </Text>
                <Text
                  style={[
                    CourseActionStyles.dateTimeText,
                    { color: colors.text },
                  ]}
                >
                  {testForm.scheduledStart instanceof Date
                    ? formatTime(testForm.scheduledStart)
                    : testForm.scheduledStart || '00:00'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  CourseActionStyles.dateTimeBox,
                  { borderColor: colors.border },
                ]}
                onPress={() => showPicker('endTime')}
              >
                <MaterialIcons name="schedule" size={24} color={colors.text} />
                <Text
                  style={[
                    CourseActionStyles.microLabel,
                    { color: colors.text },
                  ]}
                >
                  Ends
                </Text>
                <Text
                  style={[
                    CourseActionStyles.dateTimeText,
                    { color: colors.text },
                  ]}
                >
                  {testForm.endTime instanceof Date
                    ? formatTime(testForm.endTime)
                    : testForm.endTime || '00:00'}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[
                CourseActionStyles.addBtn2,
                { borderColor: colors.btnColor },
              ]}
              onPress={addQuestion}
            >
              <MaterialIcons name="add" size={22} color={colors.primary} />
              <Text
                style={[
                  CourseActionStyles.addBtnText3,
                  { color: colors.primary },
                ]}
              >
                Add Question
              </Text>
            </TouchableOpacity>
            <CustomButton
              title="Publish"
              onPress={() => handleFinalize(true)}
              disabled={loading}
              iconName="add"
              iconColor="#fff"
              style={CourseActionStyles.publishHeaderBtn}
            />
            <View style={{ height: 30 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
      {pickerMode && (
        <DateTimePicker
          value={new Date()}
          mode={pickerMode === 'date' ? 'date' : 'time'}
          is24Hour={true}
          display="default"
          onChange={handleConfirm}
        />
      )}
    </View>
  );
};
type TestPhase =
  | 'intro'
  | 'active'
  | 'verifying'
  | 'retryVerify'
  | 'submitting'
  | 'submitFailed'
  | 'done'
  | 'rejected';

type IdentityCheck = {
  outcome: 'verified' | 'mismatch' | 'error' | 'skipped';
  // Stored as proctoringData.entrySelfieUrl; the backend keys off the
  // "FRAUD_BLOCKED", "Skipped" and "Failed" markers in this string.
  label: string;
  message?: string;
};

type PendingSubmission = {
  payload: Partial<TestSubmission>;
  flagged: boolean;
  score: number;
  correct: number;
};

const MAX_GRACES = 3;
const MAX_VERIFY_ATTEMPTS = 3;
// Leaving the app briefly without it reaching the background (an incoming
// call screen, the notification shade) is logged but not a strike.
const BRIEF_INTERRUPTION_MS = 15 * 1000;
// Away longer than this and the test submits on return.
const MAX_AWAY_MS = 2 * 60 * 1000;
// Random proctoring snapshots.
const MIN_SNAPSHOT_GAP_MS = 45 * 1000;
const ENTRY_SNAPSHOT_DELAY_MS = 5 * 1000;

type ProctorInterruption = {
  at: string;
  seconds: number;
  kind: 'brief' | 'left';
  counted: boolean;
};
type ProctorSnapshot = {
  at: string;
  reason: 'entry' | 'random' | 'return';
  outcome: 'ok' | 'mismatch' | 'away' | 'multipleFaces' | 'error';
  faceCount?: number | null;
  lookingAtScreen?: boolean | null;
  suspicious?: string | null;
};
const OPTION_LETTERS = 'ABCDEFGH';

const formatClock = (totalSeconds: number) => {
  const safe = Math.max(0, totalSeconds);
  const m = Math.floor(safe / 60);
  const s = (safe % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

export const RenderStudentTest = ({
  test,
  user,
  onSubmit,
}: StudentTestProps) => {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const [phase, setPhase] = useState<TestPhase>('intro');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [shuffledQuestions, setShuffledQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const durationMinutes = Math.max(0, Number(test.duration) || 0);
  const hasTimeLimit = durationMinutes > 0;
  const [timeLeft, setTimeLeft] = useState(durationMinutes * 60);
  const [cheatingCount, setCheatingCount] = useState(0);
  const [finalResult, setFinalResult] = useState({
    score: 0,
    total: 0,
    correct: 0,
  });
  const [isCalcVisible, setIsCalcVisible] = useState(false);
  const [expression, setExpression] = useState('');
  const [result, setResult] = useState('');
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null);
  const [submissionMetadata, setSubmissionMetadata] = useState<{
    deviceId: string;
    startTime: string;
    isUnrecognizedDevice: boolean;
  } | null>(null);

  const appState = useRef(AppState.currentState);
  const phaseRef = useRef<TestPhase>('intro');
  // Held from the first submit attempt onward so timers, strikes and taps can
  // never send a second submission.
  const submitLockRef = useRef(false);
  const verifyAttemptsRef = useRef(0);
  const pendingRef = useRef<PendingSubmission | null>(null);
  const gradedAnswersRef = useRef<any[]>([]);
  const cameraRef = useRef<any>(null);
  const device = useCameraDevice('front');
  const { hasPermission, requestPermission } = useCameraPermission();
  // Wall-clock deadline: JS timers pause in the background, so counting down
  // with setInterval let students "stop the clock" by leaving the app.
  const deadlineRef = useRef<number | null>(null);
  const leftAtRef = useRef<number | null>(null);
  const reachedBackgroundRef = useRef(false);
  const interruptionsRef = useRef<ProctorInterruption[]>([]);
  const snapshotsRef = useRef<ProctorSnapshot[]>([]);
  const snapshotBusyRef = useRef(false);
  const snapshotTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attentionWarningsRef = useRef(0);
  const [awayNotice, setAwayNotice] = useState<{ seconds: number } | null>(null);

  const goTo = useCallback((next: TestPhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const activeQuestions: any[] =
    shuffledQuestions.length > 0 ? shuffledQuestions : test.questions || [];
  const totalQuestions = activeQuestions.length;
  const currentQuestion = activeQuestions[currentIndex];
  const answeredCount = activeQuestions.filter(q =>
    (answers[q.id] || '').trim(),
  ).length;
  const isStarted = phase !== 'intro';
  const isTestLive = phase === 'active' || phase === 'retryVerify';
  const isFinal = phase === 'done' || phase === 'rejected';
  const pointsPerQuestion =
    totalQuestions > 0
      ? Number((test.totalMarks / totalQuestions).toFixed(2))
      : 0;

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
    if (!hasPermission) {
      const granted = await requestPermission();
      if (!granted) {
        Toast.show({
          type: 'error',
          text1: 'Camera Required',
          text2: 'Camera access is needed to proctor this assessment.',
        });
        return;
      }
    }
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
      setShuffledQuestions(shuffleArray(test.questions || []));
      setSubmissionMetadata({
        deviceId: currentDeviceId,
        startTime: new Date().toISOString(),
        isUnrecognizedDevice: !isRecognizedDevice,
      });
      if (hasTimeLimit) {
        deadlineRef.current = Date.now() + durationMinutes * 60 * 1000;
        setTimeLeft(durationMinutes * 60);
      }
      // The permission dialog can flip AppState; don't count it as a strike.
      appState.current = AppState.currentState;
      leftAtRef.current = null;
      goTo('active');
      // Identity check shortly after starting, then at random moments.
      snapshotTimerRef.current = setTimeout(async () => {
        await takeSnapshotRef.current('entry');
        scheduleNextSnapshotRef.current();
      }, ENTRY_SNAPSHOT_DELAY_MS);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Device Verification',
        text2: 'Could not initialize device for assessment.',
      });
    }
  };
  const selectAnswer = (questionId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };
  const runAutoGrade = useCallback(() => {
    let totalScore = 0;
    const gradedAnswers = activeQuestions.map((q: any) => {
      const sAns = (answers[q.id] || '').trim();
      const correctAnswer = String(q.correctAnswer ?? '');
      let isCorrect = false;

      if (q.type === 'MCQ' || q.type === 'TrueFalse') {
        isCorrect = sAns === correctAnswer;
      } else if (q.type === 'ShortAnswer') {
        const cleanStudent = sAns.toLowerCase().replace(/[^a-z0-9]/g, '');
        const cleanCorrect = correctAnswer
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '');
        isCorrect = cleanCorrect.length > 0 && cleanStudent.includes(cleanCorrect);
      }

      const pointsEarned = isCorrect ? pointsPerQuestion : 0;
      totalScore += pointsEarned;

      return {
        questionId: q.id,
        questionText: q.questionText,
        correctAnswer,
        studentAnswer: sAns,
        isCorrect,
        pointsEarned,
      };
    });

    return { gradedAnswers, totalScore };
  }, [activeQuestions, answers, pointsPerQuestion]);

  const captureIdentity = async (): Promise<IdentityCheck> => {
    if (!user.schoolAvatarUrl) {
      return {
        outcome: 'skipped',
        label: 'Skipped: Missing baseline profile configuration picture.',
      };
    }
    if (!cameraRef.current) {
      return { outcome: 'error', label: 'Not Verified / Snap Failed' };
    }
    try {
      const photo = await cameraRef.current.takePhoto({
        flash: 'off',
        enableShutterSound: false,
      });
      // Full-resolution captures are several MB; 800px is plenty for matching.
      const resized = await ImageResizer.createResizedImage(
        photo.path,
        800,
        800,
        'JPEG',
        80,
      );
      const base64Image = await RNFS.readFile(resized.path, 'base64');
      const verification = await verifyFacialIdentity(
        base64Image,
        user.schoolAvatarUrl,
      );
      if (verification.verified) {
        return {
          outcome: 'verified',
          label: `Verified Successfully (Match Confidence: ${
            verification.similarity ?? 'n/a'
          })`,
        };
      }
      if (verification.isError) {
        // A service outage is not evidence of impersonation.
        return {
          outcome: 'error',
          label: `Not Verified / Verification Failed: ${verification.message}`,
          message: verification.message,
        };
      }
      const reason = verification.message || 'Face mismatch detected.';
      return {
        outcome: 'mismatch',
        label: `FRAUD_BLOCKED: ${reason}`,
        message: reason,
      };
    } catch (err) {
      console.error('Identity capture error:', err);
      return { outcome: 'error', label: 'Not Verified / Snap Failed' };
    }
  };

  // ---- Random proctoring snapshots ----------------------------------------
  // Taken at unpredictable moments (and after returning to the app) so a
  // different person can't sit the test and hand back for the final check,
  // and so looking away / extra people in frame are noticed.
  const takeProctorSnapshot = async (reason: ProctorSnapshot['reason']) => {
    if (snapshotBusyRef.current || !cameraRef.current || !user.schoolAvatarUrl) return;
    if (phaseRef.current !== 'active' || appState.current !== 'active') return;
    snapshotBusyRef.current = true;
    const at = new Date().toISOString();
    try {
      const photo = await cameraRef.current.takePhoto({ flash: 'off', enableShutterSound: false });
      const resized = await ImageResizer.createResizedImage(photo.path, 640, 640, 'JPEG', 70);
      const base64Image = await RNFS.readFile(resized.path, 'base64');
      const res = await verifyFacialIdentity(base64Image, user.schoolAvatarUrl);
      if (res.isError) {
        snapshotsRef.current.push({ at, reason, outcome: 'error' });
        return;
      }
      const noFace = res.faceCount === 0;
      const multipleFaces = (res.faceCount ?? 1) > 1;
      const away = noFace || res.lookingAtScreen === false;
      const mismatch = !res.verified && !noFace;
      const outcome: ProctorSnapshot['outcome'] = mismatch
        ? 'mismatch'
        : multipleFaces
          ? 'multipleFaces'
          : away
            ? 'away'
            : 'ok';
      snapshotsRef.current.push({
        at,
        reason,
        outcome,
        faceCount: res.faceCount ?? null,
        lookingAtScreen: res.lookingAtScreen ?? null,
        suspicious: res.suspicious ?? null,
      });
      if (outcome === 'mismatch' || outcome === 'multipleFaces') {
        Toast.show({
          type: 'error',
          text1: 'Identity check',
          text2:
            outcome === 'multipleFaces'
              ? 'Only you should be in view of the camera. This has been recorded.'
              : "We couldn't match your face to your profile. This has been recorded.",
        });
      } else if (outcome === 'away') {
        // First time is a warning; repeat look-aways count as strikes.
        attentionWarningsRef.current += 1;
        const isStrike = attentionWarningsRef.current >= 2;
        if (isStrike) setCheatingCount(c => c + 1);
        Toast.show({
          type: isStrike ? 'error' : 'info',
          text1: isStrike ? 'Strike: looking away' : 'Stay in view',
          text2: 'Keep your face in the camera and your eyes on the screen.',
        });
      }
    } catch (err) {
      console.warn('Proctor snapshot failed', err);
      snapshotsRef.current.push({ at, reason, outcome: 'error' });
    } finally {
      snapshotBusyRef.current = false;
    }
  };
  const takeSnapshotRef = useRef(takeProctorSnapshot);
  takeSnapshotRef.current = takeProctorSnapshot;

  const scheduleNextSnapshot = () => {
    if (snapshotTimerRef.current) clearTimeout(snapshotTimerRef.current);
    const p = phaseRef.current;
    if (p === 'done' || p === 'rejected' || p === 'submitting' || p === 'verifying') return;
    // Roughly one check every ~8 minutes (3–8 per test), at random offsets.
    const targetChecks = hasTimeLimit
      ? Math.min(8, Math.max(3, Math.round(durationMinutes / 8)))
      : 0;
    const averageGap = hasTimeLimit
      ? (durationMinutes * 60 * 1000) / (targetChecks + 1)
      : 3 * 60 * 1000;
    const delay = Math.max(MIN_SNAPSHOT_GAP_MS, averageGap * (0.5 + Math.random()));
    snapshotTimerRef.current = setTimeout(async () => {
      await takeSnapshotRef.current('random');
      scheduleNextSnapshotRef.current();
    }, delay);
  };
  const scheduleNextSnapshotRef = useRef(scheduleNextSnapshot);
  scheduleNextSnapshotRef.current = scheduleNextSnapshot;

  useEffect(
    () => () => {
      if (snapshotTimerRef.current) clearTimeout(snapshotTimerRef.current);
    },
    [],
  );

  const sendSubmission = useCallback(async () => {
    const pending = pendingRef.current;
    if (!pending) return;
    goTo('submitting');
    const ok = await onSubmit(pending.payload);
    if (ok === false) {
      goTo('submitFailed');
      return;
    }
    setFinalResult({
      score: pending.score,
      total: test.totalMarks,
      correct: pending.correct,
    });
    goTo(pending.flagged ? 'rejected' : 'done');
  }, [onSubmit, test.totalMarks, goTo]);

  const handleFinalSubmit = async (forced = false) => {
    if (submitLockRef.current) return;
    submitLockRef.current = true;
    if (snapshotTimerRef.current) clearTimeout(snapshotTimerRef.current);
    goTo('verifying');
    verifyAttemptsRef.current += 1;

    const identity = await captureIdentity();
    const canRetry =
      !forced && verifyAttemptsRef.current < MAX_VERIFY_ATTEMPTS;
    if (identity.outcome === 'mismatch' && canRetry) {
      setVerifyMessage(identity.message || null);
      submitLockRef.current = false;
      goTo('retryVerify');
      scheduleNextSnapshotRef.current();
      return;
    }
    const flagged = identity.outcome === 'mismatch';
    if (flagged) setVerifyMessage(identity.message || null);

    const { gradedAnswers, totalScore } = runAutoGrade();
    let finalGradedAnswers: any[] = [...gradedAnswers];
    let finalTotalScore = totalScore;

    const shortAnswersToGrade = gradedAnswers
      .filter(ans => {
        const question = activeQuestions.find(q => q.id === ans.questionId);
        return question?.type === 'ShortAnswer';
      })
      .map(ans => ({
        questionId: ans.questionId,
        studentAnswer: ans.studentAnswer,
        correctAnswer: ans.correctAnswer,
      }));

    if (!flagged && shortAnswersToGrade.length > 0) {
      try {
        const aiScores = await gradeShortAnswersWithAI(shortAnswersToGrade);
        finalGradedAnswers = gradedAnswers.map(ans => {
          const aiResult = aiScores.find(
            (res: any) => res.questionId === ans.questionId,
          );
          if (!aiResult) return ans;
          const isCorrect = aiResult.similarityScore >= 0.85;
          const points = isCorrect ? pointsPerQuestion : 0;
          finalTotalScore = finalTotalScore - ans.pointsEarned + points;
          return {
            ...ans,
            isCorrect,
            pointsEarned: points,
            aiScore: aiResult.similarityScore,
          };
        });
      } catch (error) {
        console.error('AI Grading fallback executed.', error);
      }
    }
    const sanitizedScore = flagged
      ? 0
      : Number(Math.min(finalTotalScore, test.totalMarks).toFixed(2));
    gradedAnswersRef.current = finalGradedAnswers;

    pendingRef.current = {
      flagged,
      score: sanitizedScore,
      correct: finalGradedAnswers.filter(a => a.isCorrect).length,
      payload: {
        testId: test.id || (test as any)._id,
        studentId: user.uid,
        studentName: `${user.firstname} ${user.lastname}`,
        matricNumber: user.matricNumber || 'N/A',
        answers: finalGradedAnswers,
        score: sanitizedScore,
        totalPossibleScore: test.totalMarks,
        status: 'submitted',
        submittedAt: new Date(),
        proctoringData: {
          deviceId: submissionMetadata?.deviceId || 'Unknown Device',
          entrySelfieUrl: identity.label,
          // Times the student actually left the app (strikes).
          tabSwitchCount: interruptionsRef.current.filter(i => i.counted).length,
          totalStrikes: cheatingCount,
          ipAddress: user.ipAddress?.[0] || '',
          // Every interruption, including brief ones such as an incoming
          // call screen, so the lecturer can judge them.
          interruptions: interruptionsRef.current,
          snapshots: snapshotsRef.current,
          identityMismatches: snapshotsRef.current.filter(s => s.outcome === 'mismatch').length,
          multipleFaceCount: snapshotsRef.current.filter(s => s.outcome === 'multipleFaces').length,
          lookAwayCount: snapshotsRef.current.filter(s => s.outcome === 'away').length,
        },
        startTime:
          safeParseDate((submissionMetadata as any)?.startTime) ?? undefined,
      } as Partial<TestSubmission>,
    };
    await sendSubmission();
  };
  // Effects call the latest handler through a ref so they don't re-fire
  // every time answers change.
  const finalSubmitRef = useRef(handleFinalSubmit);
  finalSubmitRef.current = handleFinalSubmit;

  const handleSubmitPress = () => {
    const unanswered = totalQuestions - answeredCount;
    Alert.alert(
      'Submit assessment?',
      unanswered > 0
        ? `You still have ${unanswered} unanswered question${
            unanswered === 1 ? '' : 's'
          }. You can't change your answers after submitting.`
        : "You can't change your answers after submitting.",
      [
        { text: 'Keep Working', style: 'cancel' },
        { text: 'Submit', onPress: () => finalSubmitRef.current() },
      ],
    );
  };
  const goHome = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Home', params: { activeTab: 'classroom' } }],
    });
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
      const gradedAnswers = gradedAnswersRef.current;
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
  // Leaving the app while the test is live. Judged on return, by how long the
  // student was away and whether the app actually went to the background:
  //  - brief and never backgrounded (incoming call screen, notification
  //    shade): logged, no strike;
  //  - otherwise: a strike, a "welcome back" notice and an identity check;
  //  - away longer than MAX_AWAY_MS: the test submits.
  // The clock keeps running throughout (wall-clock deadline).
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      const previous = appState.current;
      appState.current = nextAppState;
      const live =
        phaseRef.current === 'active' || phaseRef.current === 'retryVerify';
      if (!live) {
        leftAtRef.current = null;
        return;
      }
      if (previous === 'active' && nextAppState !== 'active') {
        leftAtRef.current = Date.now();
        reachedBackgroundRef.current = nextAppState === 'background';
        return;
      }
      if (nextAppState === 'background') reachedBackgroundRef.current = true;
      if (nextAppState !== 'active' || leftAtRef.current === null) return;

      const awayMs = Date.now() - leftAtRef.current;
      leftAtRef.current = null;
      const brief = !reachedBackgroundRef.current && awayMs < BRIEF_INTERRUPTION_MS;
      interruptionsRef.current.push({
        at: new Date().toISOString(),
        seconds: Math.round(awayMs / 1000),
        kind: brief ? 'brief' : 'left',
        counted: !brief,
      });
      if (deadlineRef.current) {
        setTimeLeft(Math.max(0, Math.round((deadlineRef.current - Date.now()) / 1000)));
      }
      if (brief) return;

      if (awayMs > MAX_AWAY_MS) {
        Toast.show({
          type: 'info',
          text1: 'Test submitted',
          text2: 'You were away from the test for too long.',
        });
        finalSubmitRef.current(true);
        return;
      }
      setCheatingCount(prev => prev + 1);
      setAwayNotice({ seconds: Math.round(awayMs / 1000) });
      // Make sure it's still the same person after being away.
      setTimeout(() => takeSnapshotRef.current('return'), 2000);
    });
    return () => subscription.remove();
  }, []);
  useEffect(() => {
    if (cheatingCount >= MAX_GRACES && !submitLockRef.current) {
      Toast.show({
        type: 'info',
        text1: 'Test Terminated',
        text2: 'Multiple security violations detected. Submitting now.',
      });
      finalSubmitRef.current(true);
    }
  }, [cheatingCount]);
  useEffect(() => {
    if (!hasTimeLimit || !isTestLive) return;
    const tick = () => {
      if (deadlineRef.current) {
        setTimeLeft(Math.max(0, Math.round((deadlineRef.current - Date.now()) / 1000)));
      }
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [hasTimeLimit, isTestLive]);
  useEffect(() => {
    if (hasTimeLimit && timeLeft === 0 && isTestLive) {
      Toast.show({
        type: 'info',
        text1: "Time's Up",
        text2: 'Your answers are being submitted automatically.',
      });
      finalSubmitRef.current(true);
    }
  }, [timeLeft, isTestLive, hasTimeLimit]);

  const warningCount = Math.max(0, MAX_GRACES - cheatingCount);
  const isUrgent = hasTimeLimit && timeLeft < 300;
  const percent =
    finalResult.total > 0
      ? Math.round((finalResult.score / finalResult.total) * 100)
      : 0;
  const advice = getAdvice(percent);
  const currentOptions: string[] =
    currentQuestion?.options?.length > 0
      ? currentQuestion.options
      : currentQuestion?.type === 'TrueFalse'
        ? ['True', 'False']
        : [];
  const isChoiceQuestion =
    currentQuestion?.type === 'MCQ' || currentQuestion?.type === 'TrueFalse';
  const isLastQuestion = currentIndex === totalQuestions - 1;

  if (totalQuestions === 0) {
    return (
      <EmptyState
        iconName="quiz"
        title="This assessment has no questions yet"
      />
    );
  }

  return (
    <SafeAreaView
      style={[
        CourseActionStyles.container,
        { backgroundColor: colors.backgroundSecondary },
      ]}
      edges={['left', 'right']}
    >
      <Modal visible={phase === 'intro'} animationType="fade" transparent>
        <View style={CourseActionStyles.testModalOverlay}>
          <View
            style={[
              CourseActionStyles.testModalCard,
              { backgroundColor: colors.backgroundSecondary },
            ]}
          >
            <ScrollView
              contentContainerStyle={CourseActionStyles.testModalScroll}
              showsVerticalScrollIndicator={false}
            >
              <View style={CourseActionStyles.testModalIconWrap}>
                <MaterialIcons name="quiz" size={34} color="#fff" />
              </View>
              <Text
                style={[
                  CourseActionStyles.testModalTitle,
                  { color: colors.textDarker },
                ]}
              >
                {test.title || 'Assessment'}
              </Text>
              <Text
                style={[
                  CourseActionStyles.testModalSubtitle,
                  { color: colors.text },
                ]}
              >
                Read the rules below before you begin.
              </Text>
              <View style={CourseActionStyles.testSummaryRow}>
                <View style={CourseActionStyles.testSummaryChip}>
                  <Text style={CourseActionStyles.testSummaryValue}>
                    {totalQuestions}
                  </Text>
                  <Text
                    style={[
                      CourseActionStyles.testSummaryLabel,
                      { color: colors.text },
                    ]}
                  >
                    Questions
                  </Text>
                </View>
                <View style={CourseActionStyles.testSummaryChip}>
                  <Text style={CourseActionStyles.testSummaryValue}>
                    {hasTimeLimit ? `${durationMinutes}m` : '—'}
                  </Text>
                  <Text
                    style={[
                      CourseActionStyles.testSummaryLabel,
                      { color: colors.text },
                    ]}
                  >
                    Duration
                  </Text>
                </View>
                <View style={CourseActionStyles.testSummaryChip}>
                  <Text style={CourseActionStyles.testSummaryValue}>
                    {test.totalMarks}
                  </Text>
                  <Text
                    style={[
                      CourseActionStyles.testSummaryLabel,
                      { color: colors.text },
                    ]}
                  >
                    Marks
                  </Text>
                </View>
              </View>

              <View style={CourseActionStyles.testInstructionBox}>
                <View style={CourseActionStyles.testInsBlock}>
                  <View style={CourseActionStyles.testInsBadge}>
                    <MaterialIcons name="verified-user" size={14} color="#fff" />
                  </View>
                  <Text style={[CourseActionStyles.testInsText, { color: colors.text }]}>
                    <Text style={CourseActionStyles.boldText}>Identity checks: </Text>
                    Your front camera stays on. Photos are taken at random times
                    and when you submit, and matched against your school profile
                    picture. Only you should be in view.
                  </Text>
                </View>
                <View style={CourseActionStyles.testInsBlock}>
                  <View style={CourseActionStyles.testInsBadge}>
                    <MaterialIcons name="wb-sunny" size={14} color="#fff" />
                  </View>
                  <Text style={[CourseActionStyles.testInsText, { color: colors.text }]}>
                    <Text style={CourseActionStyles.boldText}>Be visible: </Text>
                    Sit in good lighting and keep your face uncovered and in
                    view of the camera.
                  </Text>
                </View>
                <View style={CourseActionStyles.testInsBlock}>
                  <View style={CourseActionStyles.testInsBadge}>
                    <MaterialIcons name="screen-lock-portrait" size={14} color="#fff" />
                  </View>
                  <Text style={[CourseActionStyles.testInsText, { color: colors.text }]}>
                    <Text style={CourseActionStyles.boldText}>
                      Stay in the app:{' '}
                    </Text>
                    Leaving or minimizing the app, or repeatedly looking away,
                    counts as a strike. {MAX_GRACES} strikes and your test
                    auto-submits. The timer keeps running while you're away, and
                    being away for over {Math.round(MAX_AWAY_MS / 60000)} minutes
                    submits your test.
                  </Text>
                </View>
                <View style={CourseActionStyles.testInsBlock}>
                  <View style={CourseActionStyles.testInsBadge}>
                    <MaterialIcons name="phone-disabled" size={14} color="#fff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[CourseActionStyles.testInsText, { color: colors.text }]}>
                      <Text style={CourseActionStyles.boldText}>Phone calls: </Text>
                      Turn on Do Not Disturb first. A call screen that you
                      dismiss quickly is only logged, but answering a call takes
                      you out of the test and counts as a strike. Every
                      interruption is shown to your lecturer.
                    </Text>
                    {Platform.OS === 'android' && (
                      <TouchableOpacity
                        onPress={() =>
                          Linking.sendIntent('android.settings.ZEN_MODE_SETTINGS').catch(() =>
                            Linking.openSettings(),
                          )
                        }
                        style={CourseActionStyles.testDndBtn}
                        accessibilityRole="button"
                      >
                        <MaterialIcons name="do-not-disturb-on" size={15} color={colors.primary} />
                        <Text style={[CourseActionStyles.testLinkText, { color: colors.primary }]}>
                          Turn on Do Not Disturb
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
                <View style={[CourseActionStyles.testInsBlock, { marginBottom: 0 }]}>
                  <View style={CourseActionStyles.testInsBadge}>
                    <MaterialIcons name="celebration" size={14} color="#fff" />
                  </View>
                  <Text style={[CourseActionStyles.testInsText, { color: colors.text, fontWeight: '700' }]}>
                    Good luck, you've got this!
                  </Text>
                </View>
              </View>
              <CustomButton
                title="Verify Identity & Start"
                iconName="play-arrow"
                onPress={startTestWithSecurity}
                style={CourseActionStyles.testFullWidthBtn}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {isStarted && currentQuestion && (
        <>
          <View
            style={[
              CourseActionStyles.testHeader,
              { backgroundColor: colors.backgroundSecondary },
            ]}
          >
            {hasTimeLimit && (
              <View
                style={[
                  CourseActionStyles.testTimerChip,
                  isUrgent && CourseActionStyles.testTimerChipUrgent,
                ]}
              >
                <MaterialIcons
                  name="timer"
                  size={16}
                  color={isUrgent ? '#fff' : PRIMARY_COLOR}
                />
                <Text
                  style={[
                    CourseActionStyles.testTimer,
                    { color: isUrgent ? '#fff' : colors.textDarker },
                  ]}
                >
                  {formatClock(timeLeft)}
                </Text>
              </View>
            )}
            <View
              style={[
                CourseActionStyles.testGracePill,
                warningCount <= 1 && CourseActionStyles.testGracePillDanger,
              ]}
            >
              <MaterialIcons
                name="shield"
                size={13}
                color={warningCount <= 1 ? '#E53935' : PRIMARY_COLOR}
              />
              <Text
                style={[
                  CourseActionStyles.testGraceText,
                  { color: warningCount <= 1 ? '#E53935' : PRIMARY_COLOR },
                ]}
              >
                {warningCount} {warningCount === 1 ? 'grace' : 'graces'}
              </Text>
            </View>
            <TouchableOpacity
              style={CourseActionStyles.testCalcBtn}
              onPress={() => setIsCalcVisible(true)}
            >
              <IconOutline name="calculator" size={20} color={PRIMARY_COLOR} />
            </TouchableOpacity>
          </View>

          <View style={CourseActionStyles.testProgressRow}>
            <Text style={[CourseActionStyles.testProgress, { color: colors.text }]}>
              Question {currentIndex + 1} of {totalQuestions}
            </Text>
            <Text
              style={[
                CourseActionStyles.testAnsweredText,
                { color: colors.primary },
              ]}
            >
              {answeredCount}/{totalQuestions} answered
            </Text>
          </View>
          <View
            style={[
              CourseActionStyles.testProgressTrack,
              { backgroundColor: colors.border },
            ]}
          >
            <View
              style={[
                CourseActionStyles.testProgressFill,
                { width: `${(answeredCount / totalQuestions) * 100}%` },
              ]}
            />
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ flexGrow: 0 }}
            contentContainerStyle={CourseActionStyles.testNavigator}
          >
            {activeQuestions.map((q, i) => {
              const answered = !!(answers[q.id] || '').trim();
              const isCurrent = i === currentIndex;
              return (
                <TouchableOpacity
                  key={q.id ?? i}
                  onPress={() => setCurrentIndex(i)}
                  style={[
                    CourseActionStyles.testNavDot,
                    { borderColor: colors.border },
                    answered && CourseActionStyles.testNavDotAnswered,
                    isCurrent && CourseActionStyles.testNavDotCurrent,
                  ]}
                >
                  <Text
                    style={[
                      CourseActionStyles.testNavDotText,
                      {
                        color: answered
                          ? '#fff'
                          : isCurrent
                            ? PRIMARY_COLOR
                            : colors.text,
                      },
                    ]}
                  >
                    {i + 1}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={CourseActionStyles.testBodyScroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View
              style={[
                CourseActionStyles.testQuestionCard,
                {
                  backgroundColor: colors.backgroundSecondary,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={CourseActionStyles.testQMetaRow}>
                <View style={CourseActionStyles.testQBadge}>
                  <Text style={CourseActionStyles.testQBadgeText}>
                    Q{currentIndex + 1}
                  </Text>
                </View>
                <Text style={[CourseActionStyles.testQType, { color: colors.primary }]}>
                  {currentQuestion.type === 'TrueFalse'
                    ? 'TRUE / FALSE'
                    : currentQuestion.type === 'MCQ'
                      ? 'MULTIPLE CHOICE'
                      : 'SHORT ANSWER'}
                </Text>
                <Text style={[CourseActionStyles.testQPoints, { color: colors.text }]}>
                  {pointsPerQuestion} {pointsPerQuestion === 1 ? 'mark' : 'marks'}
                </Text>
              </View>
              <Text
                style={[CourseActionStyles.testQText, { color: colors.textDarker }]}
              >
                {currentQuestion.questionText}
              </Text>
              {isChoiceQuestion ? (
                <View style={CourseActionStyles.testOptions}>
                  {currentOptions.map((option, index) => {
                    const selected = answers[currentQuestion.id] === option;
                    return (
                      <TouchableOpacity
                        key={`${option}-${index}`}
                        activeOpacity={0.8}
                        style={[
                          CourseActionStyles.testOptionBtn,
                          selected && CourseActionStyles.testOptionSelected,
                        ]}
                        onPress={() => selectAnswer(currentQuestion.id, option)}
                      >
                        <View
                          style={[
                            CourseActionStyles.testOptionLetter,
                            selected && CourseActionStyles.testOptionLetterSelected,
                          ]}
                        >
                          <Text
                            style={[
                              CourseActionStyles.testOptionLetterText,
                              { color: selected ? '#fff' : colors.text },
                            ]}
                          >
                            {OPTION_LETTERS[index] ?? index + 1}
                          </Text>
                        </View>
                        <Text
                          style={[
                            CourseActionStyles.testOptionText,
                            { color: colors.text },
                            selected && CourseActionStyles.testOptionTextSelected,
                          ]}
                        >
                          {option}
                        </Text>
                        {selected && (
                          <MaterialIcons
                            name="check-circle"
                            size={20}
                            color={PRIMARY_COLOR}
                          />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : (
                <TextInput
                  style={[
                    CourseActionStyles.testAnswerInput,
                    { color: colors.text, borderColor: colors.border },
                  ]}
                  value={answers[currentQuestion.id] || ''}
                  onChangeText={val => selectAnswer(currentQuestion.id, val)}
                  placeholder="Type your answer here..."
                  multiline
                  placeholderTextColor={colors.inputTextHolder}
                />
              )}
            </View>

            <View style={CourseActionStyles.testNavRow}>
              <TouchableOpacity
                disabled={currentIndex === 0}
                onPress={() => setCurrentIndex(i => Math.max(0, i - 1))}
                style={[
                  CourseActionStyles.testNavSecondary,
                  { borderColor: colors.border },
                  currentIndex === 0 && { opacity: 0.4 },
                ]}
              >
                <MaterialIcons name="chevron-left" size={22} color={colors.text} />
                <Text
                  style={[
                    CourseActionStyles.testNavSecondaryText,
                    { color: colors.text },
                  ]}
                >
                  Previous
                </Text>
              </TouchableOpacity>
              {isLastQuestion ? (
                <CustomButton
                  title="Submit"
                  iconName="send"
                  onPress={handleSubmitPress}
                  disabled={!isTestLive}
                  style={CourseActionStyles.testNavBtn}
                />
              ) : (
                <CustomButton
                  title="Next"
                  iconName="chevron-right"
                  onPress={() =>
                    setCurrentIndex(i => Math.min(totalQuestions - 1, i + 1))
                  }
                  style={CourseActionStyles.testNavBtn}
                />
              )}
            </View>
          </ScrollView>
        </>
      )}

      <Modal
        visible={phase === 'verifying' || phase === 'submitting'}
        transparent
        animationType="fade"
      >
        <View style={CourseActionStyles.testModalOverlay}>
          <View
            style={[
              CourseActionStyles.testStatusCard,
              { backgroundColor: colors.backgroundSecondary },
            ]}
          >
            <ActivityIndicator size="large" color={PRIMARY_COLOR} />
            <Text
              style={[
                CourseActionStyles.testStatusTitle,
                { color: colors.textDarker },
              ]}
            >
              {phase === 'verifying'
                ? 'Verifying your identity'
                : 'Submitting your answers'}
            </Text>
            <Text
              style={[CourseActionStyles.testStatusText, { color: colors.text }]}
            >
              {phase === 'verifying'
                ? 'Hold still and look at the camera.'
                : 'Grading and saving your submission. This can take a few seconds.'}
            </Text>
          </View>
        </View>
      </Modal>

      <Modal visible={phase === 'retryVerify'} transparent animationType="slide">
        <View style={CourseActionStyles.testModalOverlay}>
          <View
            style={[
              CourseActionStyles.testResultCard,
              { backgroundColor: colors.backgroundSecondary },
            ]}
          >
            <View style={CourseActionStyles.testWarnIconWrap}>
              <MaterialIcons name="face" size={36} color="#fff" />
            </View>
            <Text
              style={[
                CourseActionStyles.testScoreTitle,
                { color: colors.textDarker, marginTop: 10 },
              ]}
            >
              We couldn't confirm it's you
            </Text>
            <Text style={[CourseActionStyles.testAdviceText, { color: colors.text }]}>
              Face the camera directly, in good lighting, with nothing covering
              your face. Your answers are saved.
            </Text>
            {verifyMessage ? (
              <Text
                style={[
                  CourseActionStyles.testStatusText,
                  { color: colors.text, marginBottom: 12 },
                ]}
              >
                “{verifyMessage}”
              </Text>
            ) : null}
            <View style={CourseActionStyles.testAttemptPill}>
              <Text style={CourseActionStyles.testAttemptText}>
                {MAX_VERIFY_ATTEMPTS - verifyAttemptsRef.current} attempt
                {MAX_VERIFY_ATTEMPTS - verifyAttemptsRef.current === 1 ? '' : 's'}{' '}
                left
              </Text>
            </View>
            <CustomButton
              title="Try Again"
              iconName="camera-alt"
              onPress={() => finalSubmitRef.current()}
              style={CourseActionStyles.testFullWidthBtn}
            />
            <TouchableOpacity
              style={CourseActionStyles.testLinkBtn}
              onPress={() => goTo('active')}
            >
              <Text style={[CourseActionStyles.testLinkText, { color: colors.primary }]}>
                Back to questions
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Shown on return after leaving the test (e.g. answering a call). */}
      <Modal
        visible={!!awayNotice && isTestLive}
        transparent
        animationType="fade"
        onRequestClose={() => setAwayNotice(null)}
      >
        <View style={CourseActionStyles.testModalOverlay}>
          <View
            style={[
              CourseActionStyles.testResultCard,
              { backgroundColor: colors.backgroundSecondary },
            ]}
          >
            <View style={CourseActionStyles.testWarnIconWrap}>
              <MaterialIcons name="phone-paused" size={34} color="#fff" />
            </View>
            <Text
              style={[
                CourseActionStyles.testScoreTitle,
                { color: colors.textDarker, marginTop: 10 },
              ]}
            >
              Welcome back
            </Text>
            <Text style={[CourseActionStyles.testAdviceText, { color: colors.text }]}>
              You left the test for {awayNotice?.seconds ?? 0} seconds. That
              counts as a strike: {warningCount}{' '}
              {warningCount === 1 ? 'strike remains' : 'strikes remain'} before
              the test submits automatically. Your answers are saved and the
              timer kept running.
              {'\n\n'}
              If this was a phone call, your lecturer can see when and for how
              long you were away. A quick identity check will run now.
            </Text>
            <CustomButton
              title="Continue test"
              iconName="play-arrow"
              onPress={() => setAwayNotice(null)}
              style={CourseActionStyles.testFullWidthBtn}
            />
          </View>
        </View>
      </Modal>

      <Modal visible={phase === 'submitFailed'} transparent animationType="slide">
        <View style={CourseActionStyles.testModalOverlay}>
          <View
            style={[
              CourseActionStyles.testResultCard,
              { backgroundColor: colors.backgroundSecondary },
            ]}
          >
            <View style={CourseActionStyles.testWarnIconWrap}>
              <MaterialIcons name="cloud-off" size={34} color="#fff" />
            </View>
            <Text
              style={[
                CourseActionStyles.testScoreTitle,
                { color: colors.textDarker, marginTop: 10 },
              ]}
            >
              Submission didn't go through
            </Text>
            <Text style={[CourseActionStyles.testAdviceText, { color: colors.text }]}>
              Your answers are safe on this device. Check your connection and
              try again.
            </Text>
            <CustomButton
              title="Retry Submission"
              iconName="refresh"
              onPress={sendSubmission}
              style={CourseActionStyles.testFullWidthBtn}
            />
          </View>
        </View>
      </Modal>

      <Modal visible={isFinal} transparent animationType="slide">
        <View style={CourseActionStyles.testModalOverlay}>
          <View
            style={[
              CourseActionStyles.testResultCard,
              { backgroundColor: colors.backgroundSecondary },
            ]}
          >
            {phase === 'rejected' ? (
              <>
                <View style={CourseActionStyles.testBlockedIconWrap}>
                  <MaterialIcons name="gpp-bad" size={34} color="#fff" />
                </View>
                <Text
                  style={[
                    CourseActionStyles.testScoreTitle,
                    { color: colors.primary, marginTop: 10 },
                  ]}
                >
                  Submission Flagged
                </Text>
                <Text
                  style={[CourseActionStyles.testAdviceText, { color: colors.text }]}
                >
                  {verifyMessage ||
                    'Your identity could not be verified against your profile picture.'}
                  {'\n\n'}
                  Your submission was recorded and flagged for your lecturer to
                  review.
                </Text>
                <CustomButton
                  title="Back to Home"
                  iconName="home"
                  onPress={goHome}
                  style={CourseActionStyles.testFullWidthBtn}
                />
              </>
            ) : (
              <>
                <View style={CourseActionStyles.testSuccessIconWrap}>
                  <MaterialIcons name="emoji-events" size={34} color="#fff" />
                </View>
                <View style={CourseActionStyles.testScoreCircle}>
                  <Text
                    style={[
                      CourseActionStyles.testScoreBig,
                      { color: colors.primary },
                    ]}
                  >
                    {finalResult.score}
                  </Text>
                  <Text
                    style={[
                      CourseActionStyles.testScoreSmall,
                      { color: colors.primaryTint },
                    ]}
                  >
                    {' '}/ {finalResult.total}
                  </Text>
                </View>
                <View style={CourseActionStyles.testResultStats}>
                  <View style={CourseActionStyles.testStatPill}>
                    <MaterialIcons name="percent" size={14} color={PRIMARY_COLOR} />
                    <Text style={[CourseActionStyles.testStatText, { color: colors.text }]}>
                      {percent}%
                    </Text>
                  </View>
                  <View style={CourseActionStyles.testStatPill}>
                    <MaterialIcons name="check" size={14} color="#4CAF50" />
                    <Text style={[CourseActionStyles.testStatText, { color: colors.text }]}>
                      {finalResult.correct}/{totalQuestions} correct
                    </Text>
                  </View>
                </View>
                <Text
                  style={[
                    CourseActionStyles.testScoreTitle,
                    { color: colors.textDarker },
                  ]}
                >
                  {advice.title}
                </Text>
                <Text
                  style={[
                    CourseActionStyles.testAdviceText,
                    { color: colors.text },
                  ]}
                >
                  {advice.msg}
                </Text>
                <View style={CourseActionStyles.testResultBtns}>
                  <CustomButton
                    title="Home"
                    iconName="home"
                    onPress={goHome}
                    style={CourseActionStyles.testResultBtn}
                  />
                  <CustomButton
                    title="Review"
                    onPress={downloadStudentResultSheet}
                    iconName="download"
                    style={CourseActionStyles.testResultBtn}
                  />
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
      {device != null && hasPermission && isStarted && !isFinal && (
        <View style={CourseActionStyles.testMiniCamera} pointerEvents="none">
          <Camera
            {...({
              ref: cameraRef,
              style: StyleSheet.absoluteFill,
              device: device,
              isActive: true,
              photo: true,
            } as any)}
          />
          <View style={CourseActionStyles.testCameraLive}>
            <View style={CourseActionStyles.testCameraLiveDot} />
            <Text style={CourseActionStyles.testCameraLiveText}>PROCTORED</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};
// ---------------------------------------------------------------------------
// Lecture schedule helpers (student + lecturer views)
// ---------------------------------------------------------------------------
type LectureListRow =
  | { type: 'HEADER'; title: string; id: string; count: number }
  | (Lecture & { type: 'ITEM' });

/** Day headers followed by that day's lectures, both in time order. */
const groupLecturesByDay = (lectures: Lecture[]): LectureListRow[] => {
  const groups: Record<string, Lecture[]> = {};
  (Array.isArray(lectures) ? lectures : []).forEach(lecture => {
    if (!lecture) return;
    const key = lectureDayKey(lecture);
    (groups[key] = groups[key] || []).push(lecture);
  });
  const startMs = (l: Lecture) => resolveLectureTime(l, 'start')?.getTime() ?? 0;
  return Object.keys(groups)
    .sort()
    .flatMap(key => [
      { type: 'HEADER' as const, title: key, id: `header-${key}`, count: groups[key].length },
      ...groups[key]
        .sort((a, b) => startMs(a) - startMs(b))
        .map(item => ({ ...item, type: 'ITEM' as const })),
    ]);
};

/** Today's header, or the next day that has lectures. */
const findTodayOrNextIndex = (rows: { type: string; title?: string }[], today: string) =>
  rows.findIndex(row => row.type === 'HEADER' && (row.title || '') >= today);

/** Rows have variable heights; scroll near the target, then retry. */
const scrollToIndexFallback = (
  ref: React.RefObject<FlatList | null>,
  info: { index: number; averageItemLength: number },
) => {
  ref.current?.scrollToOffset({
    offset: info.averageItemLength * info.index,
    animated: true,
  });
  setTimeout(() => {
    ref.current?.scrollToIndex({ index: info.index, animated: true });
  }, 250);
};

const lectureListContent = { paddingBottom: 110, flexGrow: 1 };

export const RenderViewLectureSchedule = ({
  lectures,
}: {
  lectures: Lecture[];
  onPress: (item: Lecture) => void;
}) => {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const [ongoingLecture, setOngoingLecture] = useState<Lecture | null>(null);
  const user = useAppSelector(state => state.user) || {};
  const flatListRef = useRef<FlatList>(null);
  const today = todayKey();

  type FlatListItem =
    | { type: 'HEADER'; title: string; id: string; count: number }
    | (Lecture & { type: 'ITEM' });

  const flatListData: FlatListItem[] = useMemo(
    () => groupLecturesByDay(lectures),
    [lectures],
  );

  const jumpToToday = () => {
    const index = findTodayOrNextIndex(flatListData, today);
    if (index === -1) {
      Toast.show({ type: 'info', text1: 'No lectures today or later' });
      return;
    }
    flatListRef.current?.scrollToIndex({ index, animated: true });
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
    const lecture = ongoingLecture;
    setOngoingLecture(null);
    if (user.usertype === 'lecturer') {
      await openLecturerAttendance(navigation, lecture);
    } else {
      openStudentAttendance(navigation, lecture);
    }
  };

  const renderLectureItem = ({ item }: { item: Lecture }) => {
    const isOngoing = item.status === 'ongoing';
    const isPhysical = item.lectureType === 'Physical';
    const isFinished = item.status === 'completed' || item.status === 'cancelled';
    const canMarkAttendance = isPhysical && lectureDayKey(item) === today && !isFinished;
    return (
      <LectureScheduleCard
        lecture={item}
        primaryAction={
          canMarkAttendance
            ? {
                label: 'Mark attendance',
                icon: 'how-to-reg',
                highlight: !!(item as any).attendanceOpen,
                onPress: () => openStudentAttendance(navigation, item),
              }
            : undefined
        }
        onPress={
          isOngoing && !isPhysical
            ? () => setOngoingLecture(item)
            : !isPhysical
              ? () =>
                  Toast.show({
                    type: 'info',
                    text1: "This class hasn't started yet",
                    text2: "You'll get a reminder before it begins.",
                  })
              : undefined
        }
      />
    );
  };

  const renderFlatListItem = ({ item }: { item: FlatListItem }) => {
    if (item.type === 'HEADER') {
      return <LectureDayHeader dayKey={item.title} count={item.count} />;
    }
    return renderLectureItem({ item });
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingHorizontal: 15,
      }}
    >
      <FlatList
        ref={flatListRef}
        data={flatListData}
        keyExtractor={item => item.id}
        renderItem={renderFlatListItem}
        onScrollToIndexFailed={info => scrollToIndexFallback(flatListRef, info)}
        contentContainerStyle={lectureListContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={<PageHeader title="My Lectures Schedule" />}
        ListEmptyComponent={
          <EmptyState
            title="No lectures scheduled yet"
            subtitle="All your scheduled lectures will appear here"
            iconName="access-time"
          />
        }
      />

      <TouchableOpacity
        style={[CourseActionStyles.fab, { backgroundColor: colors.btnColor }]}
        onPress={jumpToToday}
      >
        <MaterialIcons
          name="calendar-month"
          size={24}
          color={colors.btnTextColor}
        />
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
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const [ongoingLecture, setOngoingLecture] = useState<Lecture | null>(null);
  const user = useAppSelector(state => state.user) || {};
  const [selectedLecture, setSelectedLecture] = useState<Lecture | null>(null);
  const [showPostponeModal, setShowPostponeModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editTopicName, setEditTopicName] = useState('');
  const [editLectureType, setEditLectureType] = useState<
    'Physical' | 'Online' | 'Recorded'
  >('Physical');
  const [editLocation, setEditLocation] = useState('');
  const [editDate, setEditDate] = useState(new Date());
  const flatListRef = useRef<FlatList>(null);
  const today = todayKey();

  const flatListData = useMemo(() => groupLecturesByDay(lectures), [lectures]);

  const jumpToToday = () => {
    const index = findTodayOrNextIndex(flatListData, today);
    if (index === -1) {
      Toast.show({ type: 'info', text1: 'No lectures today or later' });
      return;
    }
    flatListRef.current?.scrollToIndex({ index, animated: true });
  };

  const handleEditSave = async () => {
    if (!selectedLecture) return;
    // Local calendar day and wall-clock time, plus the exact instant so the
    // server never has to guess the time zone.
    const formattedDate = moment(editDate).format('YYYY-MM-DD');
    const formattedTime = moment(editDate).format('HH:mm');

    try {
      const payload = {
        courseId: selectedLecture.courseId,
        lectureId: selectedLecture.id,
        topicName: editTopicName,
        lectureType: editLectureType,
        location: editLectureType === 'Physical' ? editLocation : undefined,
        newDate: formattedDate,
        newStartTime: formattedTime,
        newStartAt: editDate.toISOString(),
      };
      const result = await updateLectureDetails(payload);

      if (result.success) {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Lecture updated successfully!',
        });
        onUpdateLecture(result.data);
        setShowPostponeModal(false);
      } else {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: result.error,
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

  const handleOpenEditModal = (lecture: Lecture) => {
    setSelectedLecture(lecture);
    setEditTopicName(lecture.topicName);
    setEditLectureType(lecture.lectureType);
    setEditLocation(lecture.location || '');
    setEditDate(resolveLectureTime(lecture, 'start') ?? new Date());
    setShowPostponeModal(true);
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
    const lecture = ongoingLecture;
    setOngoingLecture(null);
    if (user.usertype === 'lecturer') {
      await openLecturerAttendance(navigation, lecture);
    } else {
      openStudentAttendance(navigation, lecture);
    }
  };

  const renderLecturerItem = ({ item }: { item: Lecture }) => {
    const isOngoing = item.status === 'ongoing';
    // A lecture only becomes "ongoing" when its host goes live / opens
    // attendance, so the host needs a way in before that happens.
    const isFinished = item.status === 'completed' || item.status === 'cancelled';
    const isToday = lectureDayKey(item) === today;
    const primaryAction =
      !isToday || isFinished
        ? undefined
        : item.lectureType === 'Physical'
          ? {
              label: (item as any).attendanceOpen ? 'Continue attendance' : 'Take attendance',
              icon: 'how-to-reg',
              highlight: true,
              onPress: () => openLecturerAttendance(navigation, item),
            }
          : {
              label: isOngoing ? 'Rejoin live class' : 'Start live class',
              icon: isOngoing ? 'login' : 'videocam',
              onPress: () =>
                navigation.navigate('LiveClassSessions', {
                  lectureId: item.id,
                  courseId: item.courseId,
                }),
            };
    return (
      <LectureScheduleCard
        lecture={item}
        onPress={
          isOngoing && item.lectureType === 'Online'
            ? () => setOngoingLecture(item)
            : undefined
        }
        primaryAction={primaryAction}
        onEdit={isFinished ? undefined : () => handleOpenEditModal(item)}
        onDelete={() => {
          setSelectedLecture(item);
          setShowDeleteModal(true);
        }}
      />
    );
  };

  const renderFlatListItem = ({ item }: { item: any }) => {
    if (item.type === 'HEADER') {
      return <LectureDayHeader dayKey={item.title} count={item.count} />;
    }
    return renderLecturerItem({ item });
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingHorizontal: 15,
      }}
    >
      <FlatList
        ref={flatListRef}
        data={flatListData}
        keyExtractor={item => item.id}
        renderItem={renderFlatListItem}
        onScrollToIndexFailed={info => scrollToIndexFallback(flatListRef, info)}
        contentContainerStyle={lectureListContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={<PageHeader title="Manage Lectures Schedule" />}
        ListEmptyComponent={
          <EmptyState
            title={'No Lectures scheduled yet'}
            subtitle="All your scheduled lectures will appear here"
            iconName="access-time"
          />
        }
      />
      <TouchableOpacity
        style={[CourseActionStyles.fab, { backgroundColor: colors.btnColor }]}
        onPress={jumpToToday}
      >
        <MaterialIcons
          name="calendar-month"
          size={24}
          color={colors.btnTextColor}
        />
      </TouchableOpacity>
      <Modal visible={showPostponeModal} transparent animationType="slide">
        <Pressable
          style={CourseActionStyles.modalOverlay}
          onPress={() => setShowPostponeModal(false)}
        >
          <TouchableWithoutFeedback>
            <View
              style={[
                CourseActionStyles.modalContent,
                { backgroundColor: colors.backgroundSecondary },
              ]}
            >
              <Text
                style={[
                  CourseActionStyles.modalTitle,
                  { color: colors.textDarker },
                ]}
              >
                Edit Lecture Details
              </Text>
              <Text
                style={[CourseActionStyles.modalText, { color: colors.text }]}
              >
                Topic Name:
              </Text>
              <TextInput
                style={[
                  CourseActionStyles.input,
                  { color: colors.text, borderColor: colors.border },
                ]}
                value={editTopicName}
                onChangeText={setEditTopicName}
                placeholder="Enter topic name"
                placeholderTextColor={colors.inputTextHolder}
              />
              <Text
                style={[CourseActionStyles.modalText, { color: colors.text }]}
              >
                Lecture Type:
              </Text>
              <View style={CourseActionStyles.editModalPicker}>
                <Picker
                  selectedValue={editLectureType}
                  onValueChange={itemValue => setEditLectureType(itemValue)}
                  dropdownIconColor={colors.text}
                >
                  <Picker.Item
                    label="Physical"
                    value="Physical"
                    color={colors.text}
                  />
                  <Picker.Item
                    label="Online"
                    value="Online"
                    color={colors.text}
                  />
                  <Picker.Item
                    label="Recorded"
                    value="Recorded"
                    color={colors.text}
                  />
                </Picker>
              </View>
              {editLectureType === 'Physical' && (
                <>
                  <Text
                    style={[
                      CourseActionStyles.modalText,
                      { color: colors.text },
                    ]}
                  >
                    Lecture Location:
                  </Text>
                  <TextInput
                    style={[
                      CourseActionStyles.input,
                      { color: colors.text, borderColor: colors.border },
                    ]}
                    value={editLocation}
                    onChangeText={setEditLocation}
                    placeholder="e.g. Room 402, Science Block"
                    placeholderTextColor={colors.inputTextHolder}
                  />
                </>
              )}
              <Text
                style={[CourseActionStyles.modalText, { color: colors.text }]}
              >
                Date & Start Time:
              </Text>
              <DateTimePicker
                value={editDate}
                mode="datetime"
                display="default"
                onChange={(event, date) => date && setEditDate(date)}
              />
              <View
                style={[CourseActionStyles.modalActions, { marginTop: 25 }]}
              >
                <CustomButton
                  title="Cancel"
                  onPress={() => setShowPostponeModal(false)}
                  iconName="cancel"
                  iconColor="#fff"
                  style={CourseActionStyles.approveBtn}
                />
                <CustomButton
                  title="Save Changes"
                  onPress={handleEditSave}
                  iconName="check-circle"
                  iconColor="#fff"
                  style={CourseActionStyles.approveBtn}
                />
              </View>
            </View>
          </TouchableWithoutFeedback>
        </Pressable>
      </Modal>
      <ActionModal
        visible={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedLecture(null);
        }}
        onContinue={() => {
          if (!selectedLecture) return;
          onDeleteLecture(selectedLecture.id);
          setSelectedLecture(null);
          setShowDeleteModal(false);
        }}
        title="Delete Lecture?"
        subtitle={`Are you sure you want to delete "${selectedLecture?.topicName}"? This action cannot be undone.`}
        continueText="Delete"
      />
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
  const { colors, isDarkMode } = useTheme();
  const { testId } = route.params;
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchReportAndStats = async () => {
      setLoading(true);
      const response = await getAssessmentAnalysisUrl(testId);

      if (response.success && response.data) {
        setPdfUrl(response.data.downloadUrl);
        if (response.data.assessmentAnalytics) {
          setReportData(response.data.assessmentAnalytics);
        }
      } else {
        Alert.alert(
          'Error',
          response.error || 'Could not retrieve report metrics.',
        );
      }
      setLoading(false);
    };

    fetchReportAndStats();
  }, [testId]);

  const handleDownloadPDF = async () => {
    if (!pdfUrl) {
      Alert.alert('Hold on', 'The report download link is not ready yet.');
      return;
    }
    try {
      const supported = await Linking.canOpenURL(pdfUrl);
      if (supported) {
        await Linking.openURL(pdfUrl);
      } else {
        Alert.alert(
          'Error',
          'Your device cannot open this type of URL link directly.',
        );
      }
    } catch (err) {
      console.error('Failed to open download link:', err);
    }
  };
  const passed = reportData?.analytics?.passedCount || 0;
  const failed = reportData?.analytics?.failedCount || 0;
  const pieData = [
    {
      name: 'Passed',
      population: passed,
      color: colors.success || '#27ae60',
      legendFontColor: colors.text || '#7F7F7F',
      legendFontSize: 14,
    },
    {
      name: 'Failed',
      population: failed,
      color: colors.primary || '#e74c3c',
      legendFontColor: colors.text || '#7F7F7F',
      legendFontSize: 14,
    },
  ];

  if (loading)
    return (
      <ActivityIndicator
        size="large"
        style={{ flex: 1 }}
        color={PRIMARY_COLOR}
      />
    );

  return (
    <ScrollView
      style={[
        CourseActionStyles.container,
        { backgroundColor: colors.backgroundSecondary },
      ]}
    >
      <PageHeader
        title={`Assessment Analyis Report for ${reportData.test.title}`}
        rightElement={
          <CustomButton
            title="Download Report"
            onPress={handleDownloadPDF}
            iconName="file-download"
            iconColor="#fff"
            style={CourseActionStyles.downloadBtn}
          />
        }
      />
      <View style={CourseActionStyles.row}>
        <View style={CourseActionStyles.card}>
          <Text style={[CourseActionStyles.cardLabel, { color: colors.text }]}>
            Pass Rate
          </Text>
          <Text
            style={[CourseActionStyles.cardValue, { color: colors.success }]}
          >
            {reportData.passRate}%
          </Text>
        </View>
        <View style={CourseActionStyles.card}>
          <Text style={[CourseActionStyles.cardLabel, { color: colors.text }]}>
            Total Submissions
          </Text>
          <Text style={[CourseActionStyles.cardValue, { color: colors.text }]}>
            {reportData.submissions.length}
          </Text>
        </View>
      </View>
      <Text style={[CourseActionStyles.sectionTitle2, { color: colors.text }]}>
        Performance Overview
      </Text>
      <PieChart
        data={pieData}
        width={350}
        height={200}
        chartConfig={getChartConfig(colors, isDarkMode)}
        accessor={'population'}
        backgroundColor={'transparent'}
        paddingLeft={'15'}
        center={[10, 0]}
        absolute
      />
      <Text
        style={[
          CourseActionStyles.sectionTitle2,
          { color: colors.text, marginTop: 15 },
        ]}
      >
        Top Performers
      </Text>
      {reportData?.analytics?.topPerformers?.map((s: any, i: number) => (
        <View key={i} style={CourseActionStyles.listItem}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View
              style={[
                CourseActionStyles.topPerformersdiv,
                { backgroundColor: colors.btnColor },
              ]}
            >
              <Text style={CourseActionStyles.topPerformersdivText}>
                {i + 1}
              </Text>
            </View>
            <Text style={CourseActionStyles.sectionText}>{s.studentName}</Text>
          </View>
          <Text style={[CourseActionStyles.scoreText, { color: colors.text }]}>
            {s.score}/{reportData?.test?.totalMarks || 0}
          </Text>
        </View>
      ))}
      {(!reportData?.analytics?.topPerformers ||
        reportData.analytics.topPerformers.length === 0) && (
        <Text
          style={[
            CourseActionStyles.emptyTopPerformersdivText,
            { color: colors.text },
          ]}
        >
          No top performers available.
        </Text>
      )}
    </ScrollView>
  );
};
// Nigerian 5-point scale bands on a percentage.
const gradeFor = (pct: number) =>
  pct >= 70 ? 'A' : pct >= 60 ? 'B' : pct >= 50 ? 'C' : pct >= 45 ? 'D' : pct >= 40 ? 'E' : 'F';

/**
 * Lecturer gradebook: combines attendance % (present + approved exceptions
 * over lectures held) and test % (marks over all published tests' marks)
 * with lecturer-set weights, scaled to any total (e.g. 30 for CA).
 */
export const GradeAccelerator = ({ courseId }: { courseId: string }) => {
  const { colors } = useTheme();
  const [data, setData] = useState<any[]>([]);
  const [summary, setSummary] = useState<{
    studentCount: number;
    lecturesHeld: number;
    testsCount: number;
    totalTestMarks: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [attendanceWeight, setAttendanceWeight] = useState('40');
  const [testWeight, setTestWeight] = useState('60');
  const [scaleTo, setScaleTo] = useState('100');
  const [downloading, setDownloading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const hasAttendance = (summary?.lecturesHeld ?? 0) > 0;
  const hasTests = (summary?.totalTestMarks ?? 0) > 0;
  const attW = hasAttendance ? Math.max(0, Number(attendanceWeight) || 0) : 0;
  const testW = hasTests ? Math.max(0, Number(testWeight) || 0) : 0;
  const weightTotal = attW + testW;
  const weightsValid = weightTotal > 0 && Math.abs(weightTotal - 100) < 0.01;
  const scale = Math.max(1, Number(scaleTo) || 100);

  const rows = useMemo(() => {
    const computed = data.map(s => {
      // Normalise so a missing component doesn't cap the final score.
      const pct = weightTotal
        ? ((s.attendancePct ?? 0) * attW + (s.testPct ?? 0) * testW) / weightTotal
        : 0;
      return {
        ...s,
        finalPct: Math.round(pct * 10) / 10,
        finalScaled: Math.round(((pct / 100) * scale) * 100) / 100,
        grade: gradeFor(pct),
      };
    });
    return computed.sort((a, b) => b.finalPct - a.finalPct);
  }, [data, attW, testW, weightTotal, scale]);

  const classAverage = rows.length
    ? Math.round((rows.reduce((sum, r) => sum + r.finalPct, 0) / rows.length) * 10) / 10
    : 0;
  const passCount = rows.filter(r => r.finalPct >= 40).length;
  const gradeCounts = rows.reduce((acc: Record<string, number>, r) => {
    acc[r.grade] = (acc[r.grade] || 0) + 1;
    return acc;
  }, {});

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    const result: any = await fetchCourseGradebook(courseId);
    if (result.success) {
      setData(Array.isArray(result.data) ? result.data : []);
      setSummary(result.summary);
    } else {
      setLoadError(result.message || 'Could not load the gradebook.');
    }
    setLoading(false);
  }, [courseId]);
  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDownload = async () => {
    if (!weightsValid) {
      Toast.show({ type: 'error', text1: 'Weights must add up to 100%' });
      return;
    }
    setDownloading(true);
    const esc = (v: any) =>
      String(v ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' } as any)[c]);
    const tableRows = rows
      .map(
        (s, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${esc(s.studentName)}</td>
          <td>${esc(s.matricNumber)}</td>
          ${hasAttendance ? `<td>${s.attendancePct ?? 0}%</td>` : ''}
          ${hasTests ? `<td>${s.testPct ?? 0}%</td>` : ''}
          <td><strong>${s.finalScaled}</strong> / ${scale}</td>
          <td><strong>${s.grade}</strong></td>
        </tr>`,
      )
      .join('');
    const htmlContent = `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; padding: 16px; color: #222; }
          h1 { margin-bottom: 4px; }
          p { margin: 4px 0; color: #555; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f4f4f4; }
        </style>
      </head>
      <body>
        <h1>Gradebook Report</h1>
        <p>Weights: ${hasAttendance ? `Attendance ${attW}%` : ''}${hasAttendance && hasTests ? ' · ' : ''}${hasTests ? `Tests ${testW}%` : ''} · Scaled to ${scale}</p>
        <p>Lectures held: ${summary?.lecturesHeld ?? 0} · Tests: ${summary?.testsCount ?? 0} (${summary?.totalTestMarks ?? 0} marks)</p>
        <p>Class average: ${classAverage}% · Passed (40%+): ${passCount}/${rows.length}</p>
        <table>
          <tr>
            <th>#</th><th>Name</th><th>Matric No</th>
            ${hasAttendance ? '<th>Attendance</th>' : ''}
            ${hasTests ? '<th>Tests</th>' : ''}
            <th>Score</th><th>Grade</th>
          </tr>
          ${tableRows}
        </table>
      </body>
    </html>`;
    try {
      const file = await (RNHTMLtoPDF as any).convert({
        html: htmlContent,
        fileName: `Gradebook_${courseId}`,
        directory: 'Documents',
      });
      if (file?.filePath) {
        await Share.share({ url: `file://${file.filePath}`, title: 'Gradebook report' });
      }
    } catch (error) {
      console.error('Export Error:', error);
      Toast.show({ type: 'error', text1: 'Could not create the PDF' });
    } finally {
      setDownloading(false);
    }
  };

  const weightInput = (label: string, value: string, onChange: (v: string) => void, hint: string) => (
    <View style={gradeUi.weightBox}>
      <Text style={[gradeUi.weightLabel, { color: colors.text }]}>{label}</Text>
      <View style={[gradeUi.weightField, { borderColor: colors.border, backgroundColor: colors.background }]}>
        <TextInput
          value={value}
          onChangeText={v => onChange(v.replace(/[^0-9.]/g, ''))}
          keyboardType="numeric"
          style={[gradeUi.weightInput, { color: colors.textDarker }]}
          maxLength={5}
        />
        <Text style={[gradeUi.weightSuffix, { color: colors.text }]}>{hint}</Text>
      </View>
    </View>
  );

  const header = (
    <View>
      <View style={[gradeUi.card, { backgroundColor: colors.backgroundSecondary }]}>
        <Text style={[gradeUi.cardTitle, { color: colors.textDarker }]}>Weighting</Text>
        <View style={gradeUi.weightRow}>
          {hasAttendance && weightInput('Attendance', attendanceWeight, setAttendanceWeight, '%')}
          {hasTests && weightInput('Tests', testWeight, setTestWeight, '%')}
          {weightInput('Score out of', scaleTo, setScaleTo, 'pts')}
        </View>
        {!weightsValid && (hasAttendance || hasTests) && (
          <Text style={[gradeUi.warning, { color: colors.primary }]}>
            Weights add up to {weightTotal}%. Make them total 100%.
          </Text>
        )}
        <Text style={[gradeUi.meta, { color: colors.text }]}>
          {summary?.lecturesHeld ?? 0} lectures held · {summary?.testsCount ?? 0} published{' '}
          {summary?.testsCount === 1 ? 'test' : 'tests'} ({summary?.totalTestMarks ?? 0} marks)
        </Text>
      </View>

      {rows.length > 0 && (
        <View style={gradeUi.statRow}>
          {[
            { label: 'Class average', value: `${classAverage}%` },
            { label: 'Passed (40%+)', value: `${passCount}/${rows.length}` },
            { label: 'A grades', value: String(gradeCounts.A || 0) },
          ].map(stat => (
            <View key={stat.label} style={[gradeUi.statTile, { backgroundColor: colors.backgroundSecondary }]}>
              <Text style={[gradeUi.statValue, { color: colors.textDarker }]}>{stat.value}</Text>
              <Text style={[gradeUi.statLabel, { color: colors.text }]}>{stat.label}</Text>
            </View>
          ))}
        </View>
      )}

      {(hasAttendance || hasTests) && rows.length > 0 && (
        <CustomButton
          title={downloading ? 'Preparing PDF…' : 'Download report'}
          onPress={handleDownload}
          disabled={downloading || !weightsValid}
          isLoading={downloading}
          iconName="file-download"
          style={gradeUi.downloadBtn}
        />
      )}
    </View>
  );

  return (
    <View style={[CourseActionStyles.container, { backgroundColor: colors.background }]}>
      <PageHeader title="Grade Accelerator" />
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : loadError ? (
        <EmptyState
          iconName="cloud-off"
          title="Couldn't load grades"
          subtitle={loadError}
          buttonText="Try again"
          buttonIcon="refresh"
          onPress={loadData}
        />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={item => item._id}
          ListHeaderComponent={header}
          contentContainerStyle={gradeUi.list}
          refreshing={loading}
          onRefresh={loadData}
          ListEmptyComponent={
            <EmptyState
              iconName="assessment"
              title="No students yet"
              subtitle="Grades appear once students enroll, attend lectures and take tests."
              buttonText="Refresh"
              onPress={loadData}
            />
          }
          renderItem={({ item, index }) => {
            const expanded = expandedId === item._id;
            const gradeColor =
              item.finalPct >= 50 ? colors.success : item.finalPct >= 40 ? colors.pendingDelivery : colors.primary;
            return (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setExpandedId(expanded ? null : item._id)}
                style={[gradeUi.rowCard, { backgroundColor: colors.backgroundSecondary }]}
              >
                <View style={gradeUi.rowTop}>
                  <Text style={[gradeUi.rank, { color: colors.text }]}>{index + 1}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[gradeUi.name, { color: colors.textDarker }]} numberOfLines={1}>
                      {item.studentName}
                    </Text>
                    <Text style={[gradeUi.matric, { color: colors.text }]}>{item.matricNumber}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[gradeUi.score, { color: colors.textDarker }]}>
                      {item.finalScaled}
                      <Text style={[gradeUi.scoreOf, { color: colors.text }]}> / {scale}</Text>
                    </Text>
                  </View>
                  <View style={[gradeUi.gradePill, { backgroundColor: gradeColor + '1F' }]}>
                    <Text style={[gradeUi.gradeText, { color: gradeColor }]}>{item.grade}</Text>
                  </View>
                </View>
                {expanded && (
                  <View style={[gradeUi.breakdown, { borderTopColor: colors.border + '66' }]}>
                    {hasAttendance && (
                      <Text style={[gradeUi.breakdownText, { color: colors.text }]}>
                        Attendance: {item.attendancePct ?? 0}% ({item.presentCount} present
                        {item.excusedCount ? `, ${item.excusedCount} excused` : ''} of{' '}
                        {summary?.lecturesHeld ?? 0})
                      </Text>
                    )}
                    {hasTests && (
                      <Text style={[gradeUi.breakdownText, { color: colors.text }]}>
                        Tests: {item.testPct ?? 0}% ({item.testScore} of {summary?.totalTestMarks} marks,{' '}
                        {item.testsTaken}/{summary?.testsCount} taken)
                      </Text>
                    )}
                    {item.flaggedTests > 0 && (
                      <Text style={[gradeUi.breakdownText, { color: colors.primary }]}>
                        {item.flaggedTests} flagged test {item.flaggedTests === 1 ? 'submission' : 'submissions'} to review
                      </Text>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
};
const gradeUi = StyleSheet.create({
  list: { paddingHorizontal: 15, paddingBottom: 40 },
  card: { borderRadius: 18, padding: 14, marginBottom: 12 },
  cardTitle: { fontSize: 15, fontWeight: '800', marginBottom: 10 },
  weightRow: { flexDirection: 'row', gap: 10 },
  weightBox: { flex: 1 },
  weightLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6, opacity: 0.8 },
  weightField: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    height: 44,
  },
  weightInput: { flex: 1, fontSize: 16, fontWeight: '800', padding: 0 },
  weightSuffix: { fontSize: 12, fontWeight: '700', opacity: 0.7 },
  warning: { fontSize: 12.5, fontWeight: '700', marginTop: 10 },
  meta: { fontSize: 12, marginTop: 10, opacity: 0.75 },
  statRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  statTile: { flex: 1, borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 11, marginTop: 2, opacity: 0.75 },
  downloadBtn: { marginBottom: 14, height: 46, borderRadius: 23 },
  rowCard: { borderRadius: 16, padding: 12, marginBottom: 8 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rank: { width: 22, fontSize: 13, fontWeight: '800', textAlign: 'center', opacity: 0.6 },
  name: { fontSize: 14.5, fontWeight: '700' },
  matric: { fontSize: 12, marginTop: 2, opacity: 0.7 },
  score: { fontSize: 16, fontWeight: '800' },
  scoreOf: { fontSize: 11.5, fontWeight: '600' },
  gradePill: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  gradeText: { fontSize: 15, fontWeight: '900' },
  breakdown: { marginTop: 10, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, gap: 6 },
  breakdownText: { fontSize: 12.5, lineHeight: 18 },
});
export const CourseActionStyles = StyleSheet.create({
  safeArea: { flex: 1 },
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
    borderWidth: 0.8,
    borderColor: 'rgba(0,0,0,0.04)',
    shadowColor: PRIMARY_COLOR_TINT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  numberCircle: {
    minWidth: 38,
    height: 26,
    paddingHorizontal: 8,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    backgroundColor: `${PRIMARY_COLOR}14`,
  },
  numberText: { fontSize: 12, fontWeight: '700' },
  topicText: { fontSize: 14, flex: 1 },
  topicText2: {
    fontSize: 16,
    fontWeight: '600',
    color: PRIMARY_COLOR,
    marginBottom: 4,
  },
  rowButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  downloadCircle: {
    alignItems: 'center',
    justifyContent: 'center',
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
    paddingHorizontal: 8,
    height: 40,
    width: 'auto',
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
    paddingHorizontal: 8,
    height: 40,
    width: 'auto',
  },
  addContentText: {
    fontWeight: '700',
    marginLeft: 8,
    fontSize: 14,
  },
  iconBtn: { padding: 8 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
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
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 15,
    fontSize: 14,
    marginBottom: 15,
  },
  modalActions: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  cancelBtn: {
    height: 50,
    paddingHorizontal: 15,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  saveBtn: {
    paddingHorizontal: 15,
    width: 'auto',
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
  overdueCard: {
    borderColor: '#ffccd2',
    backgroundColor: '#fffdfd',
  },
  sheetGrabber: {
    width: 44,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 14,
    backgroundColor: PRIMARY_COLOR_TINT,
  },
  assignmentModalContent: {
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 25,
    paddingTop: 14,
    width: '100%',
    position: 'absolute',
    bottom: 0,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 16,
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
    marginBottom: 20,
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
    padding: 10,
  },
  searchBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 13,
    paddingHorizontal: 10,
    height: 50,
    borderWidth: 0.8,
  },
  searchIcon: {
    marginRight: 7,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
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
    width: 'auto',
    paddingHorizontal: 15,
  },
  rejectBtn: {
    width: 'auto',
    paddingHorizontal: 15,
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
    marginBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
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
  addBtn2: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 12,
    borderWidth: 1,
  },
  exceptionCard: {
    padding: 16,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 0.8,
    borderColor: 'rgba(0,0,0,0.04)',
    shadowColor: PRIMARY_COLOR_TINT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  courseIdText: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  reasonText: {
    fontSize: 13,
    marginVertical: 4,
    lineHeight: 18,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    marginLeft: 10,
    backgroundColor: '#FDEBDF',
  },
  statusLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  exceptionModalContent: {
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 24,
    paddingTop: 14,
    width: '100%',
    position: 'absolute',
    bottom: 0,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 16,
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 20,
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
    marginLeft: 8,
    fontWeight: '600',
    lineHeight: 18,
  },
  pickerContainer: {
    marginBottom: 20,
    overflow: 'hidden',
    justifyContent: 'center',
    padding: 3,
    borderWidth: 0.8,
    borderRadius: 10,
  },
  pickerContainer2: {
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 15,
    maxHeight: '70%',
  },
  dateTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  repeatCounter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  repeatValue: {
    fontSize: 14,
    marginHorizontal: 10,
  },
  dateTimeBox: {
    alignItems: 'center',
    padding: 15,
    borderRadius: 14,
    borderWidth: 1,
  },
  microLabel: {
    fontSize: 12,
    marginVertical: 6,
  },
  labelTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  dateTimeText: {
    fontSize: 12,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 15,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'space-between',
    marginBottom: 15,
    borderWidth: 0.8,
    borderRadius: 15,
    paddingRight: 5,
  },
  textInput: {
    padding: 10,
    flex: 1,
    fontSize: 14,
  },
  textInput2: {
    padding: 10,
    width: '100%',
    fontSize: 14,
    height: 70,
  },
  textInputText: {
    fontSize: 14,
  },
  typeToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeOption: {
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  typeOptionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 20,
  },
  pickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 0.8,
    borderBottomColor: PRIMARY_COLOR_TINT,
  },
  pickerItemText: {
    fontSize: 14,
    flex: 1,
  },
  submitButton: {
    marginVertical: 20,
  },
  submitText: {
    fontSize: 14,
    fontWeight: '800',
  },
  alertOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertBox: {
    borderRadius: 25,
    padding: 30,
    alignItems: 'center',
    width: '80%',
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginVertical: 15,
  },
  rowDiv: { flexDirection: 'row', marginTop: 15, gap: 10 },
  classLink: {
    padding: 10,
    borderWidth: 1,
    borderRadius: 10,
    width: '100%',
  },
  alertText: {
    fontSize: 14,
    marginBottom: 20,
  },
  alertButton: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertButtonText: {
    fontSize: 14,
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
    paddingVertical: 20,
  },
  successOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  successBox: {
    borderRadius: 25,
    padding: 30,
    alignItems: 'center',
    elevation: 20,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginVertical: 15,
  },
  successText: {
    fontSize: 14,
    marginBottom: 15,
  },
  linkSubtitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  linkText: {
    flex: 1,
    fontSize: 14,
    marginRight: 10,
  },
  doneButton: {
    paddingHorizontal: 15,
  },
  doneButtonText: {
    fontSize: 14,
  },
  container: { flex: 1, paddingHorizontal: 15 },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  draftText: { color: '#2D5A5A', fontWeight: 'bold' },
  questionCard: {
    marginBottom: 15,
    padding: 15,
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
    paddingHorizontal: 8,
    height: 40,
    width: 'auto',
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
    padding: 16,
    marginBottom: 12,
    borderRadius: 14,
    borderWidth: 0.8,
    borderColor: 'rgba(0,0,0,0.04)',
    shadowColor: PRIMARY_COLOR_TINT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  testTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  testMeta: { fontSize: 12, color: PRIMARY_COLOR_TINT, fontWeight: '500' },
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
    paddingHorizontal: 15,
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
    alignItems: 'center',
    justifyContent: 'center',
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
  scoreBig: { fontSize: 40, fontWeight: 'bold' },
  scoreSmall: { fontSize: 20, fontWeight: 'bold' },
  adviceText: {
    marginBottom: 20,
    fontSize: 14,
    fontWeight: '700',
    width: '100%',
  },
  submitBtn: {
    paddingHorizontal: 15,
    width: 'auto',
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
    paddingHorizontal: 15,
  },
  startBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  startBtnText2: {
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
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
    width: '100%',
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
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centeredSecondary: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
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
  lectureCard: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    shadowColor: PRIMARY_COLOR_TINT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    borderLeftWidth: 2,
  },
  lectureCard2: {
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    shadowColor: PRIMARY_COLOR_TINT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    borderLeftWidth: 2,
    flexDirection: 'row',
  },
  lectureTimeColumn: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 15,
  },
  timeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  timeTextSmall: {
    fontSize: 11,
    color: '#999',
  },
  lectureInfoColumn: {
    flex: 1,
  },
  locationText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  sectionHeader: {
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  sectionHeaderText: {
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  fab: {
    position: 'absolute',
    bottom: 40,
    right: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 13,
    zIndex: 100,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: PRIMARY_COLOR_TINT,
    shadowOpacity: 0.3,
  },
  fabText: {
    marginRight: 3,
    fontSize: 14,
  },
  ongoingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15,
    alignSelf: 'flex-end',
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  ongoingText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
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
    paddingHorizontal: 8,
    height: 40,
  },
  downloadText: {
    marginLeft: 5,
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  card: {
    width: (width - 48) / 2,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 5,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    alignItems: 'center',
  },
  cardLabel: {
    fontSize: 14,
    marginBottom: 10,
  },
  cardValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  sectionTitle2: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 16,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  sectionText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#2222',
  },
  scoreText: {
    fontSize: 14,
    fontWeight: '700',
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
    alignItems: 'center',
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
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
  },
  downloadTestBtn: {
    paddingHorizontal: 16,
    width: 'auto',
  },
  downloadBtnText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  sideBySideCenteredRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sideBySideCenteredRowSB: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  cheatCount: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  testHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 18,
    marginTop: 6,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(245,75,2,0.16)',
    elevation: 3,
  },
  testTimerChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    backgroundColor: 'rgba(245,75,2,0.10)',
  },
  testTimerChipUrgent: { backgroundColor: PRIMARY_COLOR },
  testTimer: {
    fontSize: 16, fontWeight: '800', letterSpacing: 0.5,
    fontVariant: ['tabular-nums'],
  },
  testGracePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 7, borderRadius: 20,
    backgroundColor: 'rgba(245,75,2,0.08)',
  },
  testGracePillDanger: { backgroundColor: 'rgba(229,57,53,0.14)' },
  testGraceText: { fontSize: 12, fontWeight: '800' },
  testCalcBtn: {
    marginLeft: 'auto', width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(245,75,2,0.10)',
  },
  testProgressRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 8,
  },
  testProgress: { fontSize: 13, fontWeight: '700' },
  testAnsweredText: { fontSize: 12, fontWeight: '800' },
  testProgressTrack: {
    height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 12,
  },
  testProgressFill: {
    height: '100%', borderRadius: 3, backgroundColor: PRIMARY_COLOR,
  },
  testNavigator: { gap: 8, paddingBottom: 14, paddingRight: 8, paddingTop: 2 },
  testNavDot: {
    width: 36, height: 36, borderRadius: 18, borderWidth: 1.5,
    alignItems: 'center', justifyContent: 'center',
  },
  testNavDotAnswered: {
    backgroundColor: PRIMARY_COLOR, borderColor: PRIMARY_COLOR,
  },
  testNavDotCurrent: { borderColor: PRIMARY_COLOR, borderWidth: 2.5 },
  testNavDotText: { fontSize: 13, fontWeight: '800' },
  testBodyScroll: { paddingBottom: 180 },
  testQuestionCard: {
    borderRadius: 20, padding: 18, marginBottom: 16,
    borderWidth: 1, elevation: 3,
  },
  testQMetaRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14,
  },
  testQBadge: {
    backgroundColor: PRIMARY_COLOR, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  testQBadgeText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  testQType: { flex: 1, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  testQPoints: { fontSize: 11, fontWeight: '700', opacity: 0.7 },
  testQText: { fontSize: 17, fontWeight: '700', lineHeight: 25, marginBottom: 18 },
  testOptions: { gap: 12 },
  testOptionBtn: {
    borderWidth: 1.5, width: '100%', borderRadius: 14,
    paddingVertical: 13, paddingHorizontal: 14, gap: 12,
    flexDirection: 'row', alignItems: 'center',
    borderColor: 'rgba(120,120,120,0.28)',
  },
  testOptionSelected: {
    borderColor: PRIMARY_COLOR,
    backgroundColor: 'rgba(245,75,2,0.10)', borderWidth: 2,
  },
  testOptionLetter: {
    width: 32, height: 32, borderRadius: 16, borderWidth: 1.5,
    borderColor: 'rgba(120,120,120,0.35)',
    alignItems: 'center', justifyContent: 'center',
  },
  testOptionLetterSelected: {
    backgroundColor: PRIMARY_COLOR, borderColor: PRIMARY_COLOR,
  },
  testOptionLetterText: { fontSize: 13, fontWeight: '800' },
  testOptionText: { fontSize: 15, lineHeight: 22, flex: 1 },
  testOptionTextSelected: { fontWeight: '700' },
  testAnswerInput: {
    minHeight: 130, borderWidth: 1.5, borderRadius: 14,
    padding: 14, fontSize: 15, lineHeight: 22, textAlignVertical: 'top',
  },
  testNavRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4,
  },
  testNavSecondary: {
    flex: 1, height: 50, borderRadius: 14, borderWidth: 1.5,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
  },
  testNavSecondaryText: { fontSize: 15, fontWeight: '700' },
  testNavBtn: { paddingHorizontal: 15, width: 'auto', flex: 1, borderRadius: 14 },
  testModalOverlay: {
    flex: 1, backgroundColor: 'rgba(10,6,3,0.72)',
    alignItems: 'center', justifyContent: 'center', padding: 20,
  },
  testModalCard: {
    width: '92%', maxHeight: '88%', borderRadius: 24,
    padding: 24, elevation: 10,
  },
  testModalScroll: { alignItems: 'center', paddingBottom: 6 },
  testModalIconWrap: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: PRIMARY_COLOR,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
    elevation: 5,
  },
  testModalTitle: {
    fontSize: 22, fontWeight: '800', marginBottom: 12,
    textAlign: 'center',
  },
  testModalSubtitle: {
    fontSize: 14, textAlign: 'center', marginBottom: 16, opacity: 0.8,
  },
  testSummaryRow: { flexDirection: 'row', gap: 8, width: '100%', marginBottom: 16 },
  testSummaryChip: {
    flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 14,
    backgroundColor: 'rgba(245,75,2,0.08)',
  },
  testSummaryValue: { fontSize: 17, fontWeight: '800', color: PRIMARY_COLOR },
  testSummaryLabel: { fontSize: 11, fontWeight: '700', marginTop: 2, opacity: 0.75 },
  testInstructionBox: {
    width: '100%', marginBottom: 18, borderRadius: 16,
    padding: 14, backgroundColor: 'rgba(245,75,2,0.07)',
    borderWidth: 1, borderColor: 'rgba(245,75,2,0.16)',
  },
  testInsBlock: {
    flexDirection: 'row', alignItems: 'flex-start',
    marginBottom: 12, width: '100%',
  },
  testInsBadge: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: PRIMARY_COLOR,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 10, marginTop: 1,
  },
  testInsText: { flex: 1, fontSize: 14, lineHeight: 22 },
  testStartBtn: { paddingHorizontal: 15, borderRadius: 14 },
  testFullWidthBtn: { width: '100%', paddingHorizontal: 15, borderRadius: 14 },
  testStatusCard: {
    width: '82%', borderRadius: 24, paddingVertical: 30,
    paddingHorizontal: 22, alignItems: 'center', elevation: 10, gap: 10,
  },
  testStatusTitle: {
    fontSize: 18, fontWeight: '800', textAlign: 'center', marginTop: 6,
  },
  testStatusText: {
    fontSize: 14, lineHeight: 20, textAlign: 'center', opacity: 0.8,
  },
  testResultCard: {
    width: '95%', borderRadius: 24, padding: 26,
    alignItems: 'center', elevation: 8,
  },
  testSuccessIconWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#4CAF50',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 6, elevation: 4,
  },
  testBlockedIconWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: PRIMARY_COLOR,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 6, elevation: 4,
  },
  testWarnIconWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#F9A825',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 6, elevation: 4,
  },
  testAttemptPill: {
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
    backgroundColor: 'rgba(245,75,2,0.10)', marginBottom: 16,
  },
  testAttemptText: { fontSize: 12, fontWeight: '800', color: PRIMARY_COLOR },
  testLinkBtn: { paddingVertical: 12, marginTop: 4 },
  testDndBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start', marginTop: 8, paddingVertical: 4,
  },
  testLinkText: { fontSize: 14, fontWeight: '700', textAlign: 'center' },
  testScoreCircle: {
    flexDirection: 'row', alignItems: 'baseline',
    marginVertical: 16, paddingHorizontal: 26, paddingVertical: 12,
    borderRadius: 20, backgroundColor: 'rgba(245,75,2,0.08)',
    borderWidth: 1, borderColor: 'rgba(245,75,2,0.2)',
  },
  testScoreBig: { fontSize: 44, fontWeight: '800' },
  testScoreSmall: { fontSize: 20, fontWeight: '700', opacity: 0.75 },
  testResultStats: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  testStatPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    backgroundColor: 'rgba(120,120,120,0.12)',
  },
  testStatText: { fontSize: 12, fontWeight: '800' },
  testScoreTitle: {
    fontSize: 20, fontWeight: '800', marginBottom: 8,
    width: '100%', textAlign: 'center',
  },
  testAdviceText: {
    marginBottom: 20, fontSize: 14, lineHeight: 21,
    fontWeight: '500', width: '100%', textAlign: 'center',
  },
  testResultBtns: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', width: '100%', gap: 10,
  },
  testResultBtn: { flex: 1, width: 'auto', paddingHorizontal: 10, borderRadius: 14 },
  testMiniCamera: {
    position: 'absolute', bottom: 24, right: 16,
    width: 104, height: 138, borderRadius: 18,
    overflow: 'hidden', borderWidth: 2, borderColor: '#fff',
    zIndex: 999, elevation: 8, backgroundColor: '#000',
  },
  testCameraLive: {
    position: 'absolute', top: 6, left: 6,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 10,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  testCameraLiveDot: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: '#E53935',
  },
  testCameraLiveText: {
    color: '#fff', fontSize: 8, fontWeight: '800', letterSpacing: 0.6,
  },
  btnContainer: {
    flexDirection: 'row',
  },
  editModalPicker: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
  },
  topPerformersdiv: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 7,
  },
  topPerformersdivText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyTopPerformersdivText: {
    textAlign: 'center',
    marginVertical: 20,
    fontSize: 14,
  },
  classActionBtns: {
    width: 'auto',
    paddingHorizontal: 15,
  },
  classActionBtnText: { fontSize: 14, fontWeight: 'bold', marginRight: 4 },
  text: { fontSize: 14, fontWeight: 'bold', marginRight: 15 },
  mainIcon: { marginVertical: 20, alignSelf: 'center' },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 6,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 10,
    marginBottom: 16,
  },
  listContent: {
    gap: 10,
  },
  materialCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfo: {
    flex: 1,
    marginHorizontal: 12,
  },
  materialTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
    color: '#888',
    marginRight: 6,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteIconButton: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  modalContent: {
    width: '90%',
    maxWidth: 380,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
  },
  modalHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  modalSubText: {
    fontSize: 13,
    marginBottom: 16,
  },
  titleInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 46,
    fontSize: 14,
    marginBottom: 14,
    borderColor: PRIMARY_COLOR_TINT,
  },
  filePreviewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.03)',
    padding: 10,
    borderRadius: 8,
    marginBottom: 20,
  },
  filePreviewText: {
    fontSize: 13,
    marginLeft: 6,
    flex: 1,
  },
  modalButtonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modalBtn: {
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 15,
  },
  deleteIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  /* ===== Upgraded Modal Styles ===== */
  upgradedModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  upgradedModalSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingTop: 16,
    width: '100%',
    position: 'absolute',
    bottom: 0,
    maxHeight: '92%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 24,
  },
  upgradedSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  upgradedSheetTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  upgradedSheetSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  upgradedLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  upgradedInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 14,
    marginBottom: 16,
  },
  upgradedInputFocused: {
    borderColor: PRIMARY_COLOR,
    borderWidth: 1.5,
  },
  upgradedSectionCard: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    shadowColor: PRIMARY_COLOR_TINT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  upgradedSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 14,
  },
  upgradedPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 54,
    borderRadius: 14,
    backgroundColor: PRIMARY_COLOR,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: PRIMARY_COLOR_TINT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  upgradedPrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  upgradedSecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 54,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: PRIMARY_COLOR,
    overflow: 'hidden',
  },
  upgradedSecondaryBtnText: {
    color: PRIMARY_COLOR,
    fontSize: 15,
    fontWeight: '800',
  },
  upgradedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  upgradedChipActive: {
    backgroundColor: PRIMARY_COLOR,
    borderColor: PRIMARY_COLOR,
  },
  upgradedChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  upgradedChipTextActive: {
    color: '#FFFFFF',
  },
  upgradedMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  upgradedMetaText: {
    fontSize: 11,
    fontWeight: '600',
  },
  upgradedDivider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.06)',
    marginVertical: 16,
  },
  upgradedActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  upgradedWarningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: PRIMARY_COLOR,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  upgradedWarningIcon: {
    marginRight: 10,
  },
  upgradedWarningText: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
  },
  /* ===== Upgraded List Item Styles ===== */
  upgradedItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 0.8,
    borderColor: 'rgba(0,0,0,0.04)',
    shadowColor: PRIMARY_COLOR_TINT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  upgradedItemMain: {
    flex: 1,
  },
  upgradedItemTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  upgradedItemSubtitle: {
    fontSize: 12,
    marginTop: 4,
  },
  upgradedItemBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#FDEBDF',
  },
  upgradedItemBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: PRIMARY_COLOR,
    textTransform: 'uppercase',
  },
  /* ===== Upgraded Form Grid ===== */
  upgradedFormGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  upgradedFormGridItem: {
    flex: 1,
  },
});

