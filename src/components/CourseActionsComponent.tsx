import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';
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
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  TestSubmission,
  Course,
  Lecture,
  Assignment,
  User,
  CourseException,
  LecturerExceptionView,
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
import { PRIMARY_COLOR, PRIMARY_COLOR_TINT } from './Classroomcomponent';
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
import { getUniqueId } from 'react-native-device-info';
import { callGeminiAPI } from '../services/aiServices';
import { BarChart } from 'react-native-chart-kit';
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
interface AIScoreResult {
  questionId: string;
  similarityScore: number;
}
interface LecturerManageProps {
  exceptions: LecturerExceptionView[];
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
  questions: Question[]; // Uses the strict Question interface we defined
}
interface LecturerTestManageProps {
  course: Course;
  searchQuery: string;
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
  onSave: (formData: FormData) => void;
  isSaving: boolean;
}
interface StudentTestProps {
  test: CreateTestPayload;
  user: any;
  onSubmit: (payload: any) => Promise<void>; // Use 'onSave' to match your JSX
}
export const FloatingCalculator = ({
  visible,
  onClose,
  expression,
  result,
  handlePress,
  buttons,
}: any) => {
  if (!visible) return null;

  return (
    <View style={CourseActionStyles.miniCalculator}>
      <View style={CourseActionStyles.miniCalculatorHeader}>
        <Text style={CourseActionStyles.miniCalculatorHeaderText}>Calc</Text>
        <TouchableOpacity onPress={onClose}>
          <Icon name="close-circle" size={16} color={PRIMARY_COLOR} />
        </TouchableOpacity>
      </View>

      <View style={CourseActionStyles.miniCalcDisplay}>
        <Text
          numberOfLines={1}
          style={CourseActionStyles.miniCalcDisplayExpressionText}
        >
          {expression || '0'}
        </Text>
        <Text
          numberOfLines={1}
          style={CourseActionStyles.miniCalcDisplayResultsText}
        >
          {result || ''}
        </Text>
      </View>

      <View>
        {buttons.map((row: string[], i: number) => (
          <View key={i} style={{ flexDirection: 'row' }}>
            {row.map(btn => (
              <TouchableOpacity
                key={btn}
                style={[
                  CourseActionStyles.miniButton,
                  btn === '=' && { backgroundColor: PRIMARY_COLOR },
                ]}
                onPress={() => handlePress(btn)}
              >
                <Text
                  style={[
                    CourseActionStyles.miniBtnText,
                    btn === '=' && { color: '#fff' },
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
    strokeDasharray: '', // solid background lines
    stroke: '#ECEFF1',
  },
};
const CreateAssignmentModal = ({
  visible,
  onClose,
  onSave,
  isSaving,
}: CreateAssignmentProps) => {
  const [title, setTitle] = useState('');
  const [submissionMethod, setSubmissionMethod] = useState<
    'Online' | 'Physical' | 'Both'
  >('Online');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date());
  const [open, setOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<any>(null);

  const handlePickFile = async () => {
    try {
      const res = await DocumentPicker.pickSingle({
        type: [
          DocumentPicker.types.pdf,
          DocumentPicker.types.doc,
          DocumentPicker.types.docx,
        ],
      });
      setSelectedFile(res);
    } catch (err) {
      if (!DocumentPicker.isCancel(err)) console.log(err);
    }
  };

  const handleCreate = () => {
    if (!title.trim())
      return Toast.show({ type: 'error', text1: 'Title required' });

    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('dueDate', date.toISOString());

    if (selectedFile) {
      formData.append('file', {
        uri:
          Platform.OS === 'android'
            ? selectedFile.uri
            : selectedFile.uri.replace('file://', ''),
        name: selectedFile.name,
        type: selectedFile.type,
      } as any);
    }
    onSave(formData);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={CourseActionStyles.modalOverlay}>
        <View style={CourseActionStyles.assignmentModalContent}>
          <Text style={CourseActionStyles.modalTitle}>
            Create New Assignment
          </Text>

          <TextInput
            style={CourseActionStyles.input}
            placeholder="Assignment Title (e.g. Mid-term Project)"
            value={title}
            multiline
            onChangeText={setTitle}
          />

          <TextInput
            style={[CourseActionStyles.input, { height: 80 }]}
            placeholder="Instructions / Description (Optional)"
            multiline
            value={description}
            onChangeText={setDescription}
          />

          <TouchableOpacity
            style={CourseActionStyles.dateSelector}
            onPress={() => setOpen(true)}
          >
            <Icon name="calendar-clock" size={20} color={PRIMARY_COLOR} />
            <Text style={CourseActionStyles.dateText}>
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
          <Text style={CourseActionStyles.label}>Submission Method:</Text>
          <View style={CourseActionStyles.methodRow}>
            {['Online', 'Physical', 'Both'].map(method => (
              <TouchableOpacity
                key={method}
                style={[
                  CourseActionStyles.methodBtn,
                  submissionMethod === method &&
                    CourseActionStyles.methodBtnActive,
                ]}
                onPress={() => setSubmissionMethod(method as any)}
              >
                <Text
                  style={[
                    CourseActionStyles.methodBtnText,
                    submissionMethod === method && { color: '#fff' },
                  ]}
                >
                  {method}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={CourseActionStyles.filePickerBtn}
            onPress={handlePickFile}
          >
            <Icon name="paperclip" size={20} color={PRIMARY_COLOR_TINT} />
            <Text style={CourseActionStyles.filePickerText}>
              {selectedFile
                ? selectedFile.name
                : 'Attach Brief (Optional PDF/Doc)'}
            </Text>
          </TouchableOpacity>

          <View style={CourseActionStyles.modalActions}>
            <TouchableOpacity
              style={CourseActionStyles.cancelBtn}
              onPress={onClose}
            >
              <Text style={CourseActionStyles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                CourseActionStyles.saveBtn,
                { backgroundColor: PRIMARY_COLOR },
              ]}
              onPress={handleCreate}
              disabled={isSaving}
            >
              <Text style={CourseActionStyles.saveBtnText}>
                {isSaving ? 'Creating...' : 'Add Assignment'}
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
}: AddExceptionProps) => {
  const [category, setCategory] =
    useState<CourseException['reasonCategory']>('Personal');
  const [reason, setReason] = useState('');
  const [lectureId, setLectureId] = useState('');
  const futureLectures =
    course.Lectures?.filter(l => {
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
          <View style={CourseActionStyles.exceptionModalContent}>
            <Text style={CourseActionStyles.modalTitle}>Request Exception</Text>
            <Text style={CourseActionStyles.modalSubtitle}>
              {course.courseTitle}
            </Text>

            {/* Lecture Selector */}
            <Text style={CourseActionStyles.label}>
              Which lecture will you be missing?
            </Text>
            <View style={CourseActionStyles.pickerContainer}>
              <Picker
                selectedValue={lectureId}
                onValueChange={itemValue => setLectureId(itemValue)}
              >
                <Picker.Item label="Select lecture..." value="" />
                {futureLectures.map(l => (
                  <Picker.Item
                    key={l.id}
                    label={`${l.topicName} (${new Date(
                      l.date,
                    ).toLocaleDateString()})`}
                    value={l.id}
                  />
                ))}
              </Picker>
            </View>

            {/* Category Selector */}
            <Text style={CourseActionStyles.label}>Reason Category</Text>
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
                    category === cat && CourseActionStyles.catBtnActive,
                  ]}
                  onPress={() => setCategory(cat)}
                >
                  <Text
                    style={[
                      CourseActionStyles.catBtnText,
                      category === cat && { color: '#fff' },
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={CourseActionStyles.textArea}
              placeholder="Explain your reason in detail..."
              multiline
              numberOfLines={5}
              value={reason}
              onChangeText={setReason}
            />

            <View style={CourseActionStyles.costWarning}>
              <Icon
                name="information-outline"
                size={16}
                color={PRIMARY_COLOR_TINT}
              />
              <Text style={CourseActionStyles.costText}>
                1 iCash will be deducted upon submission.
              </Text>
            </View>

            <View style={CourseActionStyles.modalActions}>
              <TouchableOpacity
                style={CourseActionStyles.cancelBtn}
                onPress={onClose}
              >
                <Text style={CourseActionStyles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  CourseActionStyles.saveBtn,
                  { backgroundColor: PRIMARY_COLOR },
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
// 1. Static Header: Shows only the current page context
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
// 2. Course Contents View
export const RenderContents = ({
  course,
  userRole,
  searchQuery,
}: {
  course: Course;
  userRole: string;
  searchQuery: string;
}) => {
  const insets = useSafeAreaInsets();
  const [contents, setContents] = useState<string[]>(
    course.courseContents || [],
  );
  const [isDeleteModalVisible, setDeleteModalVisible] = useState(false);
  const [indexToDelete, setIndexToDelete] = useState<number | null>(null);
  const [isModalVisible, setModalVisible] = useState(false);
  const [currentText, setCurrentText] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const filteredData = contents.filter(
    (item: any) =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.url
        .split('/')
        .pop()
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()),
  );
  const isTopicCompleted = (topicName: string) => {
    return course.Lectures?.some(
      lecture =>
        lecture.topicName.toLowerCase() === topicName.toLowerCase() &&
        (lecture.status === 'completed' || lecture.isTaught),
    );
  };

  const openModal = (index: number | null = null) => {
    setEditingIndex(index);
    setCurrentText(index !== null ? contents[index] : '');
    setModalVisible(true);
  };
  const syncContentWithBackend = async (updatedList: string[]) => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      const response = await fetch(
        `${baseUrl}users/lecturers/class/courses/updateContent/${course.courseId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ updatedContents: updatedList }),
        },
      );
      const data = await response.json();
      if (!response.ok) {
        Toast.show({
          type: 'error',
          text1: 'Sync Error',
          text2: data.message || 'Could not save course changes, please retry.',
          position: 'bottom',
          bottomOffset: insets.bottom > 0 ? insets.bottom : 20,
        });
      }
      setContents(updatedList);
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Sync Error',
        text2: error.message || 'Could not save changes to server',
        position: 'bottom',
        bottomOffset: insets.bottom > 0 ? insets.bottom : 20,
      });
      setContents(course.courseContents ?? []);
    }
  };
  const handleSave = async () => {
    if (!currentText.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Empty Topic',
        position: 'bottom',
        bottomOffset: insets.bottom > 0 ? insets.bottom : 20,
      });
      return;
    }
    let updated = [...contents];
    if (editingIndex !== null) {
      updated[editingIndex] = currentText;
    } else {
      updated.push(currentText);
    }
    setModalVisible(false);
    await syncContentWithBackend(updated);
    Toast.show({
      type: 'success',
      text1: editingIndex !== null ? 'Topic Updated' : 'Topic Added',
      position: 'bottom',
      bottomOffset: insets.bottom > 0 ? insets.bottom : 20,
    });
  };

  const executeDelete = async () => {
    if (indexToDelete !== null) {
      const updated = contents.filter((_, i) => i !== indexToDelete);
      setDeleteModalVisible(false);
      await syncContentWithBackend(updated);
      Toast.show({
        type: 'success',
        text1: 'Topic Removed',
        position: 'bottom',
        bottomOffset: insets.bottom > 0 ? insets.bottom : 20,
      });
      setIndexToDelete(null);
    }
  };
  const confirmDelete = (index: number) => {
    setIndexToDelete(index);
    setDeleteModalVisible(true);
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
          <Text style={CourseActionStyles.sectionSubtitle}>
            {userRole === 'lecturer'
              ? 'Curriculum Management'
              : 'Syllabus Overview'}
          </Text>
        }
        renderItem={({ item, index }) => {
          const completed = isTopicCompleted(item);
          return (
            <View style={CourseActionStyles.contentRow}>
              <View style={CourseActionStyles.numberCircle}>
                <Text style={CourseActionStyles.numberText}>
                  Wk {index + 1}
                </Text>
              </View>
              <Text
                style={[
                  CourseActionStyles.topicText,
                  completed && CourseActionStyles.completedTopicText,
                ]}
              >
                {item}
              </Text>

              {userRole === 'lecturer' && (
                <View style={CourseActionStyles.actionRow}>
                  <TouchableOpacity
                    onPress={() => openModal(index)}
                    style={CourseActionStyles.iconBtn}
                  >
                    <Icon
                      name="pencil-outline"
                      size={20}
                      color={PRIMARY_COLOR_TINT}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => confirmDelete(index)}
                    style={CourseActionStyles.iconBtn}
                  >
                    <Icon
                      name="trash-can-outline"
                      size={20}
                      color={PRIMARY_COLOR_TINT}
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
              style={CourseActionStyles.addContentBtn}
              onPress={() => openModal()}
            >
              <Icon name="plus" size={20} color={PRIMARY_COLOR} />
              <Text style={CourseActionStyles.addContentText}>
                Add New Topic
              </Text>
            </TouchableOpacity>
          ) : null
        }
        ListEmptyComponent={
          <View style={CourseActionStyles.emptyContainer}>
            <Icon name="file-search-outline" size={60} color="#ccc" />
            <Text style={CourseActionStyles.emptyTitle}>
              Course Contents Not Found
            </Text>
            <Text style={CourseActionStyles.emptySubtitle}>
              {userRole === 'lecturer'
                ? "You haven't uploaded any course content yet."
                : "Your Instructor hasn't uploaded any course content for this course yet."}
            </Text>
          </View>
        }
      />

      <Modal visible={isModalVisible} transparent animationType="fade">
        <Pressable
          style={CourseActionStyles.modalOverlay}
          onPress={() => setModalVisible(false)}
        >
          <TouchableWithoutFeedback>
            <View style={CourseActionStyles.centeredView}>
              <View style={CourseActionStyles.editModalContent}>
                <Text style={CourseActionStyles.modalTitle}>
                  {editingIndex !== null
                    ? 'Edit Existing Topic'
                    : 'Add New Topic'}
                </Text>

                <TextInput
                  style={CourseActionStyles.input}
                  value={currentText}
                  onChangeText={setCurrentText}
                  placeholder="Enter topic name..."
                  autoFocus
                />

                <View style={CourseActionStyles.modalActions}>
                  <TouchableOpacity
                    style={CourseActionStyles.cancelBtn}
                    onPress={() => setModalVisible(false)}
                  >
                    <Text style={CourseActionStyles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      CourseActionStyles.saveBtn,
                      { backgroundColor: PRIMARY_COLOR },
                    ]}
                    onPress={handleSave}
                  >
                    <Text style={CourseActionStyles.saveBtnText}>
                      Save Changes
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </Pressable>
      </Modal>
      <Modal visible={isDeleteModalVisible} transparent animationType="fade">
        <Pressable
          style={CourseActionStyles.modalOverlay}
          onPress={() => setDeleteModalVisible(false)}
        >
          <TouchableWithoutFeedback>
            <View style={CourseActionStyles.centeredView}>
              <View style={CourseActionStyles.deleteModalContent}>
                <View style={CourseActionStyles.warningIconCircle}>
                  <Icon
                    name="alert-outline"
                    size={40}
                    color={PRIMARY_COLOR_TINT}
                  />
                </View>
                <Text style={CourseActionStyles.modalTitle}>Delete Topic?</Text>
                <Text style={CourseActionStyles.modalSubText}>
                  Are you sure you want to remove{' '}
                  <Text style={{ fontWeight: '700' }}>
                    "{indexToDelete !== null ? contents[indexToDelete] : ''}"
                  </Text>{' '}
                  from{' '}
                  <Text style={{ fontWeight: '700' }}>
                    {course.courseTitle}
                  </Text>
                  ? This action cannot be undone.
                </Text>
                <View style={CourseActionStyles.modalActions}>
                  <TouchableOpacity
                    style={CourseActionStyles.cancelBtn}
                    onPress={() => setDeleteModalVisible(false)}
                  >
                    <Text style={CourseActionStyles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={CourseActionStyles.deleteConfirmBtn}
                    onPress={executeDelete}
                  >
                    <Text style={CourseActionStyles.saveBtnText}>Delete</Text>
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
// 3. Materials View
export const RenderMaterials = ({
  course,
  lectures,
  userRole,
  searchQuery,
}: {
  course: Course;
  searchQuery: string;
  lectures: Lecture[];
  userRole: string;
}) => {
  const insets = useSafeAreaInsets();
  const [isUploading, setIsUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const allResources = [
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
  const [localResources, setLocalResources] = useState(allResources);
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

      const formData = new FormData();
      formData.append('file', {
        uri:
          Platform.OS === 'android'
            ? pickerResult.uri
            : pickerResult.uri.replace('file://', ''),
        name: pickerResult.name || 'upload.pdf',
        type: pickerResult.type || 'application/pdf',
      } as any);

      const token = await AsyncStorage.getItem('accessToken');
      const response = await fetch(
        `${baseUrl}users/lecturers/class/courses/uploadMaterial/${course.courseId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        },
      );

      if (response.ok) {
        const data = await response.json();
        const newResources = data.resources.map((res: string) => ({
          title: 'Course Material',
          url: res,
          type: 'Course',
        }));
        setLocalResources(newResources);
        Toast.show({ type: 'success', text1: 'Material Uploaded' });
      }
    } catch (err) {
      if (DocumentPicker.isCancel(err)) {
        // User cancelled the picker
      } else {
        Toast.show({ type: 'error', text1: 'Upload failed' });
      }
    } finally {
      setIsUploading(false);
    }
  };
  const fetchCourseData = async () => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      const response = await fetch(
        `${baseUrl}users/courses/${course.courseId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (response.ok) {
        const updatedCourse: Course = await response.json();

        const newResources = [
          ...(updatedCourse.resources || []).map(res => ({
            title: 'General Material',
            url: res,
            type: 'Course',
          })),
          // Accessing the nested Lectures array directly
          ...(updatedCourse.Lectures || []).flatMap(lecture =>
            (lecture.resources || []).map(res => ({
              title: lecture.topicName,
              url: res,
              type: 'Lecture',
            })),
          ),
        ];

        setLocalResources(newResources);
      }
    } catch (error) {
      console.error('Refresh failed:', error);
    }
  };
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCourseData();
    setRefreshing(false);
  };
  const filteredData = localResources.filter(
    (item: any) =>
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
        <View style={CourseActionStyles.rowBetween}>
          <Text style={CourseActionStyles.sectionSubtitle}>
            Downloadable Course Materials
          </Text>
          {userRole === 'lecturer' && (
            <TouchableOpacity
              style={CourseActionStyles.addButton}
              onPress={handleAddMaterial}
              disabled={isUploading}
            >
              <Text style={CourseActionStyles.addBtnText}>
                {isUploading ? 'Uploading...' : 'Add Material'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      }
      renderItem={({ item }) => {
        const fileName = item.url.split('/').pop() || 'document.pdf';
        return (
          <View style={CourseActionStyles.materialCard}>
            <Icon name="file-pdf-box" size={32} color={PRIMARY_COLOR} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={CourseActionStyles.materialTitle}>{item.title}</Text>
              <Text style={CourseActionStyles.materialSub} numberOfLines={1}>
                {item.url.split('/').pop()}
              </Text>
            </View>
            <TouchableOpacity
              style={CourseActionStyles.downloadCircle}
              onPress={() => handleDownload(item.url, fileName)}
            >
              <Icon
                name="download-outline"
                size={20}
                color={PRIMARY_COLOR_TINT}
              />
            </TouchableOpacity>
          </View>
        );
      }}
      ListEmptyComponent={
        <View style={CourseActionStyles.emptyContainer}>
          <Icon
            name="file-search-outline"
            size={60}
            color={PRIMARY_COLOR_TINT}
          />
          <Text style={CourseActionStyles.emptyTitle}>No Materials Found</Text>
          <Text style={CourseActionStyles.emptySubtitle}>
            {userRole === 'lecturer'
              ? "You haven't uploaded any resources yet."
              : "Your Instructor hasn't uploaded any materials for this course yet."}
          </Text>
        </View>
      }
    />
  );
};
// 4. Assignments View
export const RenderAssignments = ({
  course,
  userRole,
  searchQuery,
}: {
  course: Course;
  userRole: string;
  searchQuery: string;
}) => {
  const user = useAppSelector(state => state.user);
  const insets = useSafeAreaInsets();
  const [isModalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
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
      const token = await AsyncStorage.getItem('accessToken');
      const response = await fetch(
        `${baseUrl}users/courses/${course.courseId}/assignments`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (response.ok) {
        const data: Assignment[] = await response.json();
        setLocalAssignments(data);
      }
    } catch (error) {
      console.error('Refresh assignments failed:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };
  const handleSaveAssignment = async (formData: FormData) => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('accessToken');
      const response = await fetch(
        `${baseUrl}users/lecturers/class/courses/${course.courseId}/assignments`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        },
      );

      if (response.ok) {
        Toast.show({ type: 'success', text1: 'Assignment Posted' });
        setModalVisible(false);
        // refresh data logic here
      }
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Failed to post assignment' });
    } finally {
      setLoading(false);
    }
  };
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAssignments();
    setRefreshing(false);
  };

  return (
    <FlatList
      data={filteredData || []}
      refreshing={refreshing}
      onRefresh={onRefresh}
      keyExtractor={(item, i) => item._id || i.toString()}
      contentContainerStyle={[
        CourseActionStyles.listPadding,
        { paddingBottom: insets.bottom + 20 },
      ]}
      ListHeaderComponent={
        <View style={CourseActionStyles.rowBetween}>
          <Text style={CourseActionStyles.sectionSubtitle}>
            Assignments & Tasks
          </Text>
          {userRole === 'lecturer' && (
            <TouchableOpacity
              style={CourseActionStyles.addButton}
              onPress={() => setModalVisible(true)}
            >
              <Text style={CourseActionStyles.addBtnText}>Create</Text>
            </TouchableOpacity>
          )}
        </View>
      }
      renderItem={({ item }) => {
        const overdue = isPastDue(item.dueDate);
        const hasSubmitted = item.submissions?.some(
          s => s.studentId === user.uid,
        );

        return (
          <View style={CourseActionStyles.assignmentCard}>
            <View style={{ flex: 1 }}>
              <Text style={CourseActionStyles.assignmentName}>
                {item.title}
              </Text>
              <Text style={CourseActionStyles.methodText}>
                Method: {item.submissionMethod}
              </Text>
              <Text
                style={[
                  CourseActionStyles.dueDate,
                  overdue && { color: '#ff4d4d' },
                ]}
              >
                {overdue ? 'Past Due: ' : 'Due: '} {formatDate(item.dueDate)}
              </Text>
            </View>
            <View
              style={[
                CourseActionStyles.statusTag,
                userRole === 'lecturer'
                  ? CourseActionStyles.lecturerStatus
                  : hasSubmitted
                  ? CourseActionStyles.successTag
                  : CourseActionStyles.pendingTag,
              ]}
            >
              <Text style={CourseActionStyles.statusText}>
                {userRole === 'lecturer'
                  ? `${item.submissions?.length || 0} Records`
                  : hasSubmitted
                  ? 'Turned In'
                  : item.submissionMethod === 'Physical'
                  ? 'Hand-in'
                  : overdue
                  ? 'Missed'
                  : 'Submit'}
              </Text>
            </View>
            <CreateAssignmentModal
              visible={isModalVisible}
              onClose={() => setModalVisible(false)}
              onSave={handleSaveAssignment}
              isSaving={loading}
            />
          </View>
        );
      }}
      ListEmptyComponent={
        <View style={CourseActionStyles.emptyContainer}>
          <Text style={CourseActionStyles.emptySubtitle}>
            No assignments posted yet.
          </Text>
        </View>
      }
    />
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
  const limits = { free: 2, pro: 4, premium: 6 };
  const currentPlan = user.plan || 'free';
  const planLimit = limits[currentPlan];
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
        <View style={CourseActionStyles.headerWrapper}>
          <View style={CourseActionStyles.tierInfoCard}>
            <View style={CourseActionStyles.usageHeader}>
              <Text style={CourseActionStyles.tierLabel}>
                {currentPlan.toUpperCase()} plan
              </Text>
              <Text style={CourseActionStyles.usageText}>
                {usedThisMonth} / {planLimit} used
              </Text>
            </View>
            <Text style={CourseActionStyles.resetText}>
              Resets on the 1st of next month
            </Text>
          </View>
          {!isDisabled && (
            <TouchableOpacity
              style={CourseActionStyles.addBtn}
              onPress={onAddPress}
            >
              <Icon name="plus-circle" size={20} color={PRIMARY_COLOR_TINT} />
              <Text style={CourseActionStyles.addBtnText2}>
                Request Exception
              </Text>
            </TouchableOpacity>
          )}
          {isDisabled && (
            <View style={CourseActionStyles.errorContainer}>
              <Icon name="alert-circle-outline" size={14} color="#fff" />
              <Text style={CourseActionStyles.errorText}>
                {getDisabledReason()}
              </Text>
            </View>
          )}
        </View>
      }
      renderItem={({ item }) => (
        <View style={CourseActionStyles.exceptionCard}>
          <View style={{ flex: 1 }}>
            <Text style={CourseActionStyles.courseIdText}>
              {item.courseInfo.courseCode}: {item.courseInfo.courseTitle}
            </Text>
            <Text style={CourseActionStyles.reasonText} numberOfLines={2}>
              <Text style={{ fontWeight: '700' }}>{item.reasonCategory}: </Text>
              {item.reason}
            </Text>
            <Text style={CourseActionStyles.dateText2}>
              {new Date(item.date).toLocaleDateString()}
            </Text>
          </View>
          <View style={CourseActionStyles.statusBadge}>
            <Icon
              name={
                item.status === 'approved'
                  ? 'check-decagram'
                  : item.status === 'rejected'
                  ? 'close-octagon'
                  : 'clock-fast'
              }
              size={14}
              color={PRIMARY_COLOR_TINT}
              style={{ marginRight: 4 }}
            />
            <Text style={CourseActionStyles.statusLabel}>{item.status}</Text>
          </View>
        </View>
      )}
      ListEmptyComponent={
        <View style={CourseActionStyles.emptyContainer}>
          <Icon
            name="file-search-outline"
            size={60}
            color={PRIMARY_COLOR_TINT}
          />
          <Text style={CourseActionStyles.emptyTitle}>No Exceptions Found</Text>
        </View>
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
        <View style={CourseActionStyles.manageCard}>
          <View style={CourseActionStyles.rowBetween}>
            <View>
              <Text style={CourseActionStyles.studentName}>
                {item.studentName || 'Unknown Student'}
              </Text>
              <Text style={CourseActionStyles.matricText}>
                {item.matricNumber}
              </Text>
            </View>
            {item.status === 'pending' && (
              <View style={CourseActionStyles.pendingIndicator} />
            )}
          </View>

          <View style={CourseActionStyles.infoRow}>
            <Text style={CourseActionStyles.exceptionDetails}>
              {item.courseId}
            </Text>
            <View style={CourseActionStyles.dot} />
            <Text style={CourseActionStyles.categoryLabel}>
              {item.reasonCategory}
            </Text>
          </View>

          <Text style={CourseActionStyles.reasonBody}>{item.reason}</Text>

          {item.status === 'pending' ? (
            <View style={CourseActionStyles.actionRow2}>
              <TouchableOpacity
                style={CourseActionStyles.approveBtn}
                onPress={() => onUpdateStatus(item.id, 'approved')}
              >
                <Text style={CourseActionStyles.btnText}>Approve</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={CourseActionStyles.rejectBtn}
                onPress={() => onUpdateStatus(item.id, 'rejected')}
              >
                <Text style={CourseActionStyles.btnText}>Reject</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={CourseActionStyles.finalStatusContainer}>
              <Icon
                name={
                  item.status === 'approved' ? 'check-circle' : 'close-circle'
                }
                size={20}
                color={PRIMARY_COLOR_TINT}
                style={{ marginRight: 8 }}
              />
              <Text style={CourseActionStyles.finalStatusText}>
                {item.status === 'approved' ? 'Approved' : 'Rejected'}
              </Text>
            </View>
          )}
        </View>
      )}
      ListEmptyComponent={
        <View style={{ alignItems: 'center', marginTop: 50 }}>
          <Icon
            name="check-decagram-outline"
            size={60}
            color={PRIMARY_COLOR_TINT}
          />
          <Text style={{ color: PRIMARY_COLOR_TINT, marginTop: 10 }}>
            No pending exceptions.
          </Text>
        </View>
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

    // 1. Validation Logic
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
      repeatWeeks: repeatWeeks, // Match the new type definition
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
      setForm(prev => ({ ...prev, location: '' }));
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
                <Text style={CourseActionStyles.emptyText}>
                  No syllabus topics found.
                </Text>
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
}: LecturerTestManageProps) => {
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
        type: 'MCQ' as const, // Strict type for literal
        questionText: '',
        options: ['', '', '', ''],
        correctAnswer: '',
        points: 5,
      },
    ],
  };
  const [testForm, setTestForm] = useState<TestFormState>(initialFormState);
  const [editingId, setEditingId] = useState<string | null>(null);
  const filteredTests = tests.filter(t =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );
  const openEditModal = (test: CreateTestPayload) => {
    setTestForm({
      title: test.title,
      duration: (test.duration ?? 0).toString(), // Safety for duration
      dueDate: test.dueDate ?? '', // Fallback to empty string
      totalMarks: (test.totalMarks ?? 0).toString(),
      questions: test.questions ?? [], // Fallback to empty array
      scheduledStart: test.scheduledStart ?? '', // FIX: Fallback to empty string
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
          id: (Date.now() + Math.random()).toString(), // Ensure unique ID
          type: 'MCQ' as const, // Fixed type casting
          questionText: '',
          options: ['', '', '', ''],
          correctAnswer: '',
          points: 5,
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
      const payload: CreateTestPayload = {
        ...testForm,
        courseId: course.courseId,
        status: 'draft',
        isPublished: false,
        createdAt: new Date().toISOString(),
        duration: Number(testForm.duration),
        totalMarks: Number(testForm.totalMarks),
        questions: testForm.questions as Question[],
      };
      onSaveTest(payload);
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: 'Sync Failed',
        text2: 'Draft could not be auto-saved. Check your connection.',
      });
    }
  }, [testForm, course.courseId, onSaveTest]);
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
        // Set date for both
        setTestForm(prev => ({ ...prev, date: dateString }));
        setTimeout(() => setPickerMode('startTime'), 500);
      } else if (pickerMode === 'startTime') {
        // Set Start Time
        setTestForm(prev => ({
          ...prev,
          scheduledStart: selectedDate.toISOString(),
        }));
        setTimeout(() => setPickerMode('endTime'), 500);
      } else if (pickerMode === 'endTime') {
        // Set Deadline
        setTestForm(prev => ({ ...prev, dueDate: selectedDate.toISOString() }));
      }
    }
  };
  const downloadAssessmentReport = async (testId: string) => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      // We target the specific testId from the array item
      const downloadUrl = `${baseUrl}users/lecturers/class/tests/${testId}/download-analysis?token=${token}`;

      const supported = await Linking.canOpenURL(downloadUrl);
      if (supported) {
        await Linking.openURL(downloadUrl);
      } else {
        Toast.show({
          type: 'error',
          text1: 'Download Error',
          text2: 'Cannot open download link',
        });
      }
    } catch (error) {
      console.error('Download Link Error:', error);
    }
  };
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (testForm.title.trim().length > 0) {
        autoSaveDraft();
      }
    }, 2000);

    return () => clearTimeout(delayDebounceFn);
  }, [testForm, autoSaveDraft]);

  return (
    <View style={CourseActionStyles.container}>
      <View style={CourseActionStyles.rowBetween}>
        <Text style={CourseActionStyles.sectionTitle}>Past Assessments</Text>
        <TouchableOpacity
          style={CourseActionStyles.createCard}
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
          <Icon name="plus-circle" size={24} color="#fff" />
          <Text style={CourseActionStyles.createCardText}>
            Create New Assessment
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredTests}
        refreshing={refreshing}
        onRefresh={onRefresh}
        keyExtractor={(item, index) => item.id || item._id || index.toString()}
        ListEmptyComponent={
          <Text style={CourseActionStyles.emptyText}>
            No assessments found matching "{searchQuery}"
          </Text>
        }
        renderItem={({ item }) => {
          const isPastDue = new Date() > new Date(item.dueDate);
          return (
            <View style={CourseActionStyles.pastTestCard}>
              <TouchableOpacity
                style={{ flex: 1 }}
                onPress={() => !isPastDue && openEditModal(item)}
                activeOpacity={isPastDue ? 1 : 0.7} // Visual feedback: no "tap" look if past due
              >
                <Text style={CourseActionStyles.testTitle}>{item.title}</Text>
                <Text style={CourseActionStyles.testMeta}>
                  {item.questions.length} Questions •{' '}
                  <Text style={{ color: PRIMARY_COLOR_TINT }}>
                    {item.isPublished ? 'Published' : 'Draft'}
                  </Text>
                </Text>
                {isPastDue && (
                  <Text
                    style={[
                      CourseActionStyles.testMeta,
                      { color: PRIMARY_COLOR_TINT },
                    ]}
                  >
                    Locked (Past Due)
                  </Text>
                )}
              </TouchableOpacity>
              {isPastDue && item.isPublished ? (
                <TouchableOpacity
                  style={{
                    borderWidth: 0.8,
                    borderColor: PRIMARY_COLOR_TINT,
                    paddingVertical: 12,
                    paddingHorizontal: 7,
                    borderRadius: 8,
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: PRIMARY_COLOR_TINT, // Subtle background to make it look clickable
                  }}
                  // FIXED: Changed 'test.testid' to 'item.id'
                  onPress={() => downloadAssessmentReport(item.id!)}
                >
                  <Icon
                    name="chart-bar"
                    size={20}
                    color={PRIMARY_COLOR}
                    style={{ marginRight: 4 }}
                  />
                  <Text
                    style={{
                      color: PRIMARY_COLOR,
                      fontSize: 12,
                      fontWeight: 'bold',
                    }}
                  >
                    Analysis Report
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={{ opacity: 0.5, alignItems: 'flex-end' }}>
                  <Icon name="clock-outline" size={20} color="#888" />
                  <Text style={{ fontSize: 10, color: '#888' }}>
                    Report pending
                  </Text>
                </View>
              )}
            </View>
          );
        }}
      />

      {/* CREATION MODAL */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <SafeAreaView style={{ flex: 1 }}>
          <View style={CourseActionStyles.modalHeader}>
            <TouchableOpacity
              onPress={() => setIsModalVisible(false)}
              style={{ width: 40, justifyContent: 'center' }}
            >
              <Icon name="chevron-left" size={26} color={PRIMARY_COLOR_TINT} />
            </TouchableOpacity>

            <Text style={CourseActionStyles.headerTitle}>Build Assessment</Text>

            <TouchableOpacity
              onPress={() => handleFinalize(true)}
              disabled={loading}
              style={CourseActionStyles.publishHeaderBtn}
            >
              <Text style={CourseActionStyles.publishHeaderText}>Publish</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={CourseActionStyles.modalBody}
            showsVerticalScrollIndicator={false}
          >
            {/* Settings Card */}
            <View style={CourseActionStyles.settingsCard}>
              <TextInput
                style={CourseActionStyles.titleInput}
                placeholder="Assessment Title (e.g. Test 1)"
                placeholderTextColor="#999999e2"
                value={testForm.title}
                onChangeText={t => setTestForm({ ...testForm, title: t })}
              />
              <View style={CourseActionStyles.settingsRow}>
                <View style={CourseActionStyles.settingItem}>
                  <Text style={CourseActionStyles.microLabel2}>Minutes</Text>
                  <TextInput
                    style={CourseActionStyles.settingInput}
                    keyboardType="numeric"
                    value={testForm.duration}
                    onChangeText={val =>
                      setTestForm({ ...testForm, duration: val })
                    }
                  />
                </View>
                <View style={CourseActionStyles.settingItem}>
                  <Text style={CourseActionStyles.microLabel2}>
                    Total Marks
                  </Text>
                  <TextInput
                    style={CourseActionStyles.settingInput}
                    keyboardType="numeric"
                    placeholder="Score"
                    value={testForm.totalMarks}
                    onChangeText={val =>
                      setTestForm({ ...testForm, totalMarks: val })
                    }
                  />
                </View>
              </View>
            </View>
            {testForm.questions.map((q, idx) => (
              <View key={q.id} style={CourseActionStyles.questionCard}>
                <View style={CourseActionStyles.qHeader}>
                  <Text style={CourseActionStyles.qNumber}>
                    Question {idx + 1}
                  </Text>
                  <View style={CourseActionStyles.sideBySide}>
                    <TextInput
                      style={CourseActionStyles.pointsInput}
                      keyboardType="numeric"
                      value={q.points.toString()}
                      onChangeText={p =>
                        updateQuestion(q.id, { points: Number(p) })
                      }
                    />
                    <Text style={CourseActionStyles.pointsLabel}>pts</Text>
                  </View>
                  <TouchableOpacity onPress={() => removeQuestion(q.id)}>
                    <Icon
                      name="delete-outline"
                      size={22}
                      color={PRIMARY_COLOR_TINT}
                    />
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={CourseActionStyles.qInput}
                  placeholder="Type your question here..."
                  multiline
                  value={q.questionText}
                  onChangeText={t => updateQuestion(q.id, { questionText: t })}
                />
                <View style={CourseActionStyles.typeGroup}>
                  <TouchableOpacity
                    style={[
                      CourseActionStyles.typeBtn,
                      q.type === 'MCQ' && CourseActionStyles.activeTypeBtn,
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
                        q.type === 'MCQ' && CourseActionStyles.activeTypeText,
                      ]}
                    >
                      Multiple Choice
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      CourseActionStyles.typeBtn,
                      q.type === 'ShortAnswer' &&
                        CourseActionStyles.activeTypeBtn,
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
                        q.type === 'ShortAnswer' &&
                          CourseActionStyles.activeTypeText,
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
                          style={CourseActionStyles.optInput}
                          placeholder={`Option ${oIdx + 1}`}
                          value={opt}
                          onChangeText={v => updateOption(q.id, oIdx, v)}
                        />
                        {(q.options?.length ?? 0) > 3 && ( // Keep at least 3 options
                          <TouchableOpacity
                            onPress={() => removeOption(q.id, oIdx)}
                          >
                            <Icon
                              name="minus-circle-outline"
                              size={22}
                              color={PRIMARY_COLOR_TINT}
                            />
                          </TouchableOpacity>
                        )}
                      </View>
                    ))}
                    <TouchableOpacity
                      onPress={() => addOption(q.id)}
                      style={CourseActionStyles.addOptionBtn}
                    >
                      <Text style={CourseActionStyles.addOptionText}>
                        {' '}
                        Add Options
                      </Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <View style={CourseActionStyles.shortAnswerPreview}>
                      <Text style={CourseActionStyles.previewLabel}>
                        Student Response Area
                      </Text>
                      <View style={CourseActionStyles.disabledInputPlaceholder}>
                        <Text style={CourseActionStyles.placeholderText}>
                          Students will type their answer here...
                        </Text>
                      </View>
                      <TextInput
                        style={CourseActionStyles.correctAnswerInput}
                        placeholder="Set correct answer/keywords (optional for auto-grade)"
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
            <View style={CourseActionStyles.settingItem}>
              <Text style={CourseActionStyles.labelTitle}>Deadline</Text>
              <TouchableOpacity
                style={CourseActionStyles.datePickerTrigger}
                onPress={() => setPickerMode('date')}
              >
                <Text
                  style={[
                    CourseActionStyles.dateText,
                    !testForm.dueDate && { color: PRIMARY_COLOR_TINT }, // Dim color if empty
                  ]}
                >
                  {testForm.dueDate || 'Set deadline...'}
                </Text>
                <Icon
                  name="calendar-clock"
                  size={22}
                  color={PRIMARY_COLOR_TINT}
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
              style={CourseActionStyles.addBtn}
              onPress={addQuestion}
            >
              <Icon name="plus" size={22} color={PRIMARY_COLOR_TINT} />
              <Text style={CourseActionStyles.addBtnText3}>Add Question</Text>
            </TouchableOpacity>
            <View style={{ height: 100 }} />
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
  const navigation = useNavigation<any>();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isStarted, setIsStarted] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState(test.duration * 60);
  const [cheatingCount, setCheatingCount] = useState(0);
  const [finalResult, setFinalResult] = useState({ score: 0, total: 0 });
  const [isCalcVisible, setIsCalcVisible] = useState(false);
  const [expression, setExpression] = useState('');
  const [result, setResult] = useState('');
  const MAX_GRACES = 3;

  const [selfieUrl, setSelfieUrl] = useState<string>('');

  // 2. To store the session metadata (Device ID, Start Time, etc.)
  const [submissionMetadata, setSubmissionMetadata] = useState<{
    deviceId: string;
    entrySelfie: string;
    startTime: string;
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

    // Call your Gemini API / Backend here
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

  // Engineering-focused button layout
  const buttons = [
    ['sin(', 'cos(', 'log(', '^'],
    ['7', '8', '9', '/'],
    ['4', '5', '6', '*'],
    ['1', '2', '3', '-'],
    ['0', '.', 'AC', '+'],
    ['pi', 'e', '⌫', '='],
  ];
  const uploadSelfieToStorage = async (path: string): Promise<string> => {
    setIsUploading(true);
    try {
      const uri =
        Platform.OS === 'android' ? path : path.replace('file://', '');
      /** * --- FIREBASE LOGIC (Commented Out) ---
       * * // 1. Create a reference in your storage bucket
       * const fileName = `selfies/${user.uid}_${Date.now()}.jpg`;
       * const reference = storage().ref(fileName);
       * * // 2. Upload the file from the local disk path
       * await reference.putFile(path);
       * * // 3. Get the public download URL
       * const url = await reference.getDownloadURL();
       * return url;
       */
      const formData = new FormData();
      formData.append('file', {
        uri: uri,
        type: 'image/jpeg',
        name: `proctor_${user.uid}_${Date.now()}.jpg`,
      } as any);
      formData.append('upload_preset', 'presetOne');
      formData.append('cloud_name', 'dbdw3zftx');
      const response = await fetch(
        'https://api.cloudinary.com/v1_1/dbdw3zftx/image/upload',
        {
          method: 'POST',
          body: formData,
          headers: {
            Accept: 'application/json',
            'Content-Type': 'multipart/form-data',
          },
        },
      );

      const data = await response.json();

      if (data.secure_url) {
        return data.secure_url;
      } else {
        Toast.show({
          type: 'error',
          text1: 'Upload Error',
          text2: 'Upload failed, please retry.',
        });
        throw new Error(data.error?.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload failed:', error);
      throw new Error('Failed to upload proctoring image.');
    } finally {
      setIsUploading(false);
    }
  };
  const startTestWithSecurity = async () => {
    try {
      const currentDeviceId = await getUniqueId();
      if (!user.deviceType?.includes(currentDeviceId)) {
        Toast.show({
          type: 'error',
          text1: 'Identity Verification',
          text2:
            'This device is not recognized. Please contact your administrator.',
        });
        return;
      }
      let finalSelfieUrl = '';
      if (cameraRef.current) {
        const photo = await cameraRef.current.takePhoto({ flash: 'off' });
        finalSelfieUrl = await uploadSelfieToStorage(photo.path);
        setSelfieUrl(finalSelfieUrl);
      }
      setSubmissionMetadata({
        deviceId: currentDeviceId,
        entrySelfie: finalSelfieUrl,
        startTime: new Date().toISOString(),
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

    const gradedAnswers = test.questions.map((q: Question) => {
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
        studentAnswer: sAns,
        isCorrect,
        pointsEarned,
      };
    });

    return { gradedAnswers, totalScore };
  }, [test.questions, answers]);
  const handleFinalSubmit = useCallback(async () => {
    const { gradedAnswers, totalScore } = runAutoGrade();
    const shortAnswersToGrade = gradedAnswers
      .filter(ans => {
        const question = test.questions.find(q => q.id === ans.questionId);
        return question?.type === 'ShortAnswer';
      })
      .map(ans => ({
        questionId: ans.questionId,
        studentAnswer: ans.studentAnswer,
        correctAnswer: test.questions.find(q => q.id === ans.questionId)
          ?.correctAnswer,
      }));

    let finalGradedAnswers = [...gradedAnswers];
    let finalTotalScore = totalScore;
    if (shortAnswersToGrade.length > 0) {
      try {
        const aiScores = await gradeShortAnswersWithAI(shortAnswersToGrade);

        // 4. Update the scores based on AI feedback
        finalGradedAnswers = gradedAnswers.map(ans => {
          // Explicitly type 'res' here, or type the array itself
          const aiResult = aiScores.find(
            (res: AIScoreResult) => res.questionId === ans.questionId,
          );

          if (aiResult) {
            const isCorrect = aiResult.similarityScore >= 0.85;
            const points = isCorrect
              ? test.questions.find(q => q.id === ans.questionId)?.points || 0
              : 0;

            // Update the running total
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
        console.error(
          'AI Grading failed, falling back to literal match',
          error,
        );
      }
    }

    const finalPayload: Partial<TestSubmission> = {
      testId: test.id || test._id,
      studentId: user.uid,
      studentName: `${user.firstname} ${user.lastname}`,
      matricNumber: user.matricNumber || 'N/A',
      answers: finalGradedAnswers,
      score: finalTotalScore,
      totalPossibleScore: test.totalMarks,
      status: 'submitted',
      submittedAt: new Date().toISOString(),
      proctoringData: {
        deviceId: submissionMetadata?.deviceId || 'Unknown Device',
        entrySelfieUrl: submissionMetadata?.entrySelfie || selfieUrl || '',
        tabSwitchCount: cheatingCount,
        ipAddress: user.ipAddress?.[0] || '',
      },
      startTime: submissionMetadata?.startTime,
    };
    await onSubmit(finalPayload);
    setFinalResult({
      score: finalTotalScore,
      total: test.totalMarks,
    });
    setIsFinished(true);
  }, [
    submissionMetadata?.entrySelfie,
    submissionMetadata?.deviceId,
    submissionMetadata?.startTime,
    test,
    user,
    runAutoGrade,
    selfieUrl,
    cheatingCount,
    onSubmit,
    setIsFinished,
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

  // 2. Auto-Submit Watcher
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
      navigation.navigate('Home');
    }
  }, [cheatingCount, handleFinalSubmit, navigation]);

  return (
    <SafeAreaView style={CourseActionStyles.container}>
      {/* INSTRUCTIONS MODAL */}
      <Modal visible={!isStarted} animationType="fade" transparent>
        <View style={CourseActionStyles.modalOverlay}>
          <View style={CourseActionStyles.modalContainer}>
            <ScrollView
              contentContainerStyle={CourseActionStyles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              <Icon
                name="information-outline"
                size={50}
                color={PRIMARY_COLOR}
                style={CourseActionStyles.centerIcon}
              />
              <Text style={CourseActionStyles.modalTitle}>
                Test Instructions
              </Text>

              <View style={CourseActionStyles.instructionBox}>
                <Text style={CourseActionStyles.insText}>
                  <Text style={CourseActionStyles.boldText}>
                    Identity Verification:
                  </Text>{' '}
                  Your front camera will stay on to make sure it's really you
                  taking the test.
                </Text>
                <Text style={CourseActionStyles.insText}>
                  <Text style={CourseActionStyles.boldText}>Stay Focused:</Text>
                  Try not to look away from the screen for too long, as the
                  system monitors your attention.
                </Text>
                <Text style={CourseActionStyles.insText}>
                  No Switching Apps/minimizing:
                  <Text style={CourseActionStyles.boldText}>
                    No Switching Apps/minimization:{' '}
                  </Text>
                  If you leave this app or minimize it, your assessment wil
                  auto-submit.
                </Text>
                <Text style={CourseActionStyles.insText}>
                  <Text style={CourseActionStyles.boldText}>
                    Identity Check (Selfie):
                  </Text>
                  We’ll take a quick photo of you now to verify your identity
                  before the test starts.
                </Text>
                <Text style={CourseActionStyles.insText}>
                  Goodluck and we hope you have a good test!
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  CourseActionStyles.startBtn,
                  isUploading && CourseActionStyles.disabledBtn,
                ]}
                onPress={startTestWithSecurity}
                disabled={isUploading}
              >
                {isUploading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={CourseActionStyles.startBtnText}>
                    Verify Identity & Start
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* QUIZ HEADER */}
      <View style={CourseActionStyles.header}>
        <Text
          style={[
            CourseActionStyles.timer,
            timeLeft < 600 && CourseActionStyles.timerUrgent,
          ]}
        >
          <Icon name="clock-outline" size={20} color="#2222" />
          {Math.floor(timeLeft / 60)}:{' '}
          {(timeLeft % 60).toString().padStart(2, '0')}
        </Text>
        <View
          style={{
            flexDirection: 'row',
            marginHorizontal: 5,
            alignItems: 'center',
          }}
        >
          {[...Array(MAX_GRACES)].map((_, i) => (
            <Icon
              key={i}
              name={
                i < MAX_GRACES - cheatingCount ? 'shield-check' : 'shield-off'
              }
              size={18}
              color={
                i < MAX_GRACES - cheatingCount
                  ? PRIMARY_COLOR_TINT
                  : PRIMARY_COLOR
              }
              style={{ marginRight: 2 }}
            />
          ))}
          <Text style={{ fontSize: 10, color: '#2222' }}>Security Status</Text>
        </View>
        <Text style={CourseActionStyles.progress}>
          Question {currentIndex + 1} of {test.questions.length}
        </Text>
        <TouchableOpacity onPress={() => setIsCalcVisible(true)}>
          <Icon name="calculator" size={20} color={PRIMARY_COLOR} />
        </TouchableOpacity>
      </View>

      {/* QUESTION UI */}
      {isStarted && !isFinished && (
        <>
          <View style={CourseActionStyles.questionCard}>
            <Text style={CourseActionStyles.qText}>
              {test.questions[currentIndex].questionText}
            </Text>
            {/* Conditional Rendering Logic */}
            {test.questions[currentIndex].type === 'MCQ' ||
            test.questions[currentIndex].type === 'TrueFalse' ? (
              <View style={CourseActionStyles.optionsContainer}>
                {test.questions[currentIndex].options?.map((option, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      CourseActionStyles.optionButton,
                      answers[test.questions[currentIndex].id] === option &&
                        CourseActionStyles.selectedOption,
                    ]}
                    onPress={() =>
                      setAnswers({
                        ...answers,
                        [test.questions[currentIndex].id]: option,
                      })
                    }
                  >
                    <Text
                      style={[
                        CourseActionStyles.optionText,
                        answers[test.questions[currentIndex].id] === option &&
                          CourseActionStyles.selectedOptionText,
                      ]}
                    >
                      {option}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              /* Fallback to ShortAnswer / TextInput */
              <TextInput
                style={CourseActionStyles.input}
                value={answers[test.questions[currentIndex].id] || ''}
                onChangeText={val =>
                  setAnswers({
                    ...answers,
                    [test.questions[currentIndex].id]: val,
                  })
                }
                placeholder="Type your answer here..."
                placeholderTextColor={'#999'}
              />
            )}
          </View>

          <View style={CourseActionStyles.testSideBySide}>
            <TouchableOpacity
              style={CourseActionStyles.submitBtn}
              onPress={() =>
                currentIndex > 0 && setCurrentIndex(currentIndex - 1)
              }
            >
              <Text style={CourseActionStyles.submitBtnText}>Prev</Text>
            </TouchableOpacity>

            {currentIndex === test.questions.length - 1 ? (
              <TouchableOpacity
                style={CourseActionStyles.submitBtn}
                onPress={handleFinalSubmit}
              >
                <Text style={CourseActionStyles.submitBtnText}>
                  Submit Test
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => setCurrentIndex(currentIndex + 1)}
              >
                <Text style={CourseActionStyles.submitBtnText}>Next</Text>
              </TouchableOpacity>
            )}
          </View>
        </>
      )}

      {/* FINAL SCORE MODAL */}
      <Modal visible={isFinished} transparent animationType="slide">
        <View style={CourseActionStyles.modalOverlay}>
          <View style={CourseActionStyles.resultCard}>
            <Icon name="trophy-outline" size={50} color={PRIMARY_COLOR} />

            <View style={CourseActionStyles.scoreCircle}>
              <Text style={CourseActionStyles.scoreBig}>
                {finalResult.score}
              </Text>
              <Text style={CourseActionStyles.scoreSmall}>
                / {finalResult.total}
              </Text>
            </View>

            <Text style={CourseActionStyles.scoreTitle}>
              {getAdvice((finalResult.score / finalResult.total) * 100).title}
            </Text>

            <Text style={CourseActionStyles.adviceText}>
              {getAdvice((finalResult.score / finalResult.total) * 100).msg}
            </Text>

            <TouchableOpacity
              style={CourseActionStyles.startBtn}
              onPress={() => {
                navigation.navigate('Home');
              }}
            >
              <Text style={CourseActionStyles.startBtnText}>
                Back to Courses
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {/* SCIENTIFIC CALCULATOR MODAL */}
      <FloatingCalculator
        visible={isCalcVisible}
        onClose={() => setIsCalcVisible(false)}
        expression={expression}
        result={result}
        handlePress={handlePress}
        buttons={buttons}
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
  onPress,
}: {
  lectures: Lecture[];
  onPress: (item: Lecture) => void;
}) => {
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

  const renderLectureItem = ({ item }: { item: Lecture }) => {
    const isOngoing = item.status === 'ongoing';
    const isClickable =
      item.lectureType === 'Online' || item.lectureType === 'Recorded';

    return (
      <TouchableOpacity
        disabled={!isClickable}
        onPress={() => onPress(item)}
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
    </View>
  );
};
export const LecturerLectureScheduleView = ({
  lectures,
  onUpdateLecture, // Callback to refresh data in parent
  onDeleteLecture,
}: {
  lectures: Lecture[];
  onUpdateLecture: (updated: Lecture) => void;
  onDeleteLecture: (id: string) => void;
}) => {
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
  const renderLecturerItem = ({ item }: { item: Lecture }) => {
    const isOngoing = item.status === 'ongoing';
    const isPostponed = item.status === 'postponed';
    return (
      <View
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
      </View>
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
    fontSize: 14,
    fontWeight: '600',
    color: PRIMARY_COLOR_TINT,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 20,
    marginBottom: 15,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F7F9FC',
    borderRadius: 14,
    marginBottom: 12,
  },
  numberCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: PRIMARY_COLOR,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  numberText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  topicText: { flex: 1, fontSize: 15, fontWeight: '500', color: '#2222' },
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
    backgroundColor: '#fff',
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  materialTitle: { fontSize: 15, fontWeight: '600', color: '#333' },
  materialSub: { fontSize: 12, color: '#999', marginTop: 2 },
  downloadCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  assignmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  assignmentName: { fontSize: 16, fontWeight: '700', color: '#333' },
  dueDate: {
    fontSize: 12,
    color: PRIMARY_COLOR,
    marginTop: 5,
    fontWeight: '500',
  },

  statusTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FFF4F0',
  },
  lecturerStatus: {
    backgroundColor: '#e3f2fd',
    borderColor: PRIMARY_COLOR_TINT,
    borderWidth: 1,
  },
  statusText: { fontSize: 11, fontWeight: 'bold', color: PRIMARY_COLOR },
  addButton: {
    backgroundColor: PRIMARY_COLOR,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
  },
  addBtnText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  addBtnText3: {
    marginLeft: 10,
    color: PRIMARY_COLOR_TINT,
    fontWeight: 'bold',
    fontSize: 12,
  },
  addBtnText2: {
    color: PRIMARY_COLOR_TINT,
    fontWeight: '700',
    fontSize: 16,
  },
  addContentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: PRIMARY_COLOR,
    borderStyle: 'dashed',
    backgroundColor: '#fff7f4',
    marginTop: 20,
  },
  addContentText: {
    color: PRIMARY_COLOR,
    fontWeight: '700',
    marginLeft: 8,
    fontSize: 15,
  },
  actionRow: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { padding: 8, marginLeft: 4 },

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
    width: '85%',
    maxWidth: 400,
  },
  editModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2222',
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    marginRight: 8,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#666',
    fontWeight: '600',
  },
  saveBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#fff',
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
  pendingTag: {
    backgroundColor: PRIMARY_COLOR,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  assignmentModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
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
    backgroundColor: '#f8f9fa',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#eee',
  },
  dateText: {
    marginLeft: 10,
    fontSize: 15,
    color: '#2222',
    fontWeight: '500',
  },
  dateText2: {
    fontSize: 11,
    color: '#2222',
  },
  filePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 12,
    marginBottom: 25,
  },
  filePickerText: {
    marginLeft: 10,
    color: '#666',
    fontSize: 14,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#444',
    marginBottom: 8,
    marginTop: 10,
  },
  methodRow: {
    flexDirection: 'row',
    backgroundColor: '#f1f3f5',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  methodBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  methodBtnActive: {
    backgroundColor: PRIMARY_COLOR,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  methodBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  successTag: {
    backgroundColor: '#48bb78', // Green for completed/submitted
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  methodText: {
    fontSize: 11,
    color: PRIMARY_COLOR,
    fontWeight: '600',
    backgroundColor: '#eef2ff',
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
    textTransform: 'uppercase',
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
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: PRIMARY_COLOR_TINT,
  },
  studentName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#222',
  },
  pendingIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: PRIMARY_COLOR,
  },
  exceptionDetails: {
    fontSize: 13,
    fontWeight: '600',
    color: PRIMARY_COLOR,
    marginBottom: 6,
  },
  reasonBody: {
    fontSize: 14,
    color: '#2222',
    lineHeight: 20,
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
    fontStyle: 'italic',
  },
  actionRow2: {
    flexDirection: 'row',
    gap: 12,
  },
  approveBtn: {
    flex: 1,
    borderWidth: 0.8,
    borderColor: PRIMARY_COLOR_TINT,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectBtn: {
    flex: 1,
    borderWidth: 0.8,
    borderColor: PRIMARY_COLOR_TINT,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    fontSize: 13,
    fontWeight: '700',
    color: PRIMARY_COLOR,
  },
  // Overriding text color for the outline button
  rejectBtnText: {
    color: '#e53e3e',
  },
  finalStatusText: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: 8,
    borderRadius: 6,
    color: PRIMARY_COLOR_TINT,
    textTransform: 'capitalize',
  },
  matricText: {
    fontSize: 12,
    color: '#888',
    fontWeight: '500',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: PRIMARY_COLOR_TINT,
    marginHorizontal: 8,
  },
  categoryLabel: {
    fontSize: 12,
    color: PRIMARY_COLOR,
    fontWeight: 'bold',
  },
  finalStatusContainer: {
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  headerWrapper: {
    marginBottom: 20,
    backgroundColor: '#f4f1f1',
  },
  tierInfoCard: {
    backgroundColor: PRIMARY_COLOR, // Dark slate
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  usageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  tierLabel: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  usageText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  resetText: {
    color: '#fff',
    fontSize: 11,
    marginTop: 8,
    textAlign: 'center',
  },
  addBtn: {
    backgroundColor: 'inherit',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    gap: 4,
  },
  errorText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  exceptionCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: PRIMARY_COLOR_TINT,
  },
  courseIdText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2d3748',
  },
  reasonText: {
    fontSize: 13,
    color: '#4a5568',
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
    textTransform: 'uppercase',
    color: PRIMARY_COLOR_TINT,
  },
  exceptionModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    width: '100%',
    position: 'absolute',
    bottom: 0,
    maxHeight: '90%',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#718096',
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
    backgroundColor: '#edf2f7',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  catBtnActive: {
    backgroundColor: PRIMARY_COLOR,
    borderColor: PRIMARY_COLOR,
  },
  catBtnText: {
    fontSize: 12,
    color: '#4a5568',
    fontWeight: '600',
  },
  textArea: {
    backgroundColor: '#f7fafc',
    borderRadius: 12,
    padding: 12,
    height: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 15,
  },
  costWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ebf8ff',
    padding: 10,
    borderRadius: 8,
    marginBottom: 20,
    gap: 8,
  },
  costText: {
    fontSize: 12,
    color: '#2b6cb0',
    fontWeight: '600',
  },
  pickerContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: PRIMARY_COLOR_TINT,
    marginBottom: 20,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  pickerContainer2: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
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
    fontSize: 15,
    color: '#2222',
    textTransform: 'capitalize',
    letterSpacing: 0.5,
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
    borderWidth: 1,
    borderColor: '#E0E5E5',
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
  container: { flex: 1, padding: 15, backgroundColor: '#fff' },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#2222' },
  draftText: { color: '#2D5A5A', fontWeight: 'bold' },
  titleInput: {
    fontSize: 22,
    fontWeight: '800',
    borderBottomWidth: 1,
    borderColor: '#eee',
    paddingBottom: 10,
    marginBottom: 20,
  },
  questionCard: {
    backgroundColor: 'inherit',
    padding: 15,
    borderRadius: 15,
    marginBottom: 15,
    borderWidth: 0.8,
    borderColor: PRIMARY_COLOR_TINT,
  },
  qNumber: {
    fontSize: 12,
    color: '#2222',
    fontWeight: 'bold',
    marginBottom: 5,
  },
  qInput: { fontSize: 16, color: '#2222', marginBottom: 15 },
  optionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: PRIMARY_COLOR_TINT,
    marginRight: 10,
  },
  radioActive: { backgroundColor: PRIMARY_COLOR_TINT },
  optInput: {
    flex: 1,
    borderBottomWidth: 0.8,
    borderColor: PRIMARY_COLOR_TINT,
    padding: 5,
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
    fontSize: 19,
    color: '#2222',
    marginLeft: 5,
    fontWeight: '700',
  },
  createCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 15,
    marginBottom: 20,
    marginRight: 5,
  },
  createCardText: {
    marginLeft: 15,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
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
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2222',
    marginBottom: 10,
  },
  testMeta: { fontSize: 12, color: '#2222' },
  settingsRow: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 20,
    backgroundColor: 'inherit',
    padding: 15,
    borderRadius: 12,
  },
  settingItem: {
    flex: 1,
  },
  microLabel2: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#2222',
    textTransform: 'capitalize',
    marginBottom: 5,
  },
  settingInput: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2222',
    borderBottomWidth: 1,
    borderBottomColor: PRIMARY_COLOR_TINT,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  publishHeaderBtn: {
    backgroundColor: PRIMARY_COLOR, // Your iCampus primary green
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  publishHeaderText: {
    color: '#FFFFFF',
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
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  settingsCard: {
    backgroundColor: 'inherit',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderBottomColor: '#EEE',
  },
  qHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  pointsInput: {
    backgroundColor: 'inherit',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    width: 40,
    textAlign: 'center',
    fontWeight: 'bold',
    marginLeft: 'auto',
    borderColor: PRIMARY_COLOR_TINT,
    borderWidth: 0.7,
  },
  pointsLabel: {
    fontSize: 12,
    color: '#2222',
    marginLeft: 4,
    fontWeight: '600',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: PRIMARY_COLOR_TINT, // Matches your iCampus theme
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
    marginTop: 10,
    padding: 8,
    alignItems: 'flex-start',
    backgroundColor: PRIMARY_COLOR_TINT,
  },
  addOptionText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  shortAnswerPreview: {
    marginTop: 10,
    padding: 12,
    backgroundColor: 'inherit',
    borderRadius: 8,
    borderStyle: 'dashed',
    borderWidth: 0.8,
    borderColor: PRIMARY_COLOR_TINT,
  },
  previewLabel: {
    fontSize: 11,
    color: '#2222',
    textTransform: 'capitalize',
    marginBottom: 8,
    fontWeight: '700',
  },
  disabledInputPlaceholder: {
    height: 40,
    backgroundColor: '#efeded',
    justifyContent: 'center',
    paddingHorizontal: 10,
    borderRadius: 5,
    marginBottom: 10,
  },
  placeholderText: {
    color: '#2222',
    fontSize: 13,
    fontStyle: 'italic',
  },
  correctAnswerInput: {
    borderBottomWidth: 0.8,
    borderBottomColor: PRIMARY_COLOR_TINT,
    paddingVertical: 5,
    fontSize: 14,
    color: '#2222',
  },
  typeGroup: {
    flexDirection: 'row',
    backgroundColor: 'inherit',
    alignItems: 'center',
    marginBottom: 15,
  },
  typeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 6,
  },
  activeTypeBtn: {
    backgroundColor: PRIMARY_COLOR,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '600',
    color: PRIMARY_COLOR_TINT,
  },
  activeTypeText: {
    color: '#fff', // Highlight the text of the active one
  },
  datePickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'inherit',
    paddingHorizontal: 12,
    paddingVertical: 10,
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
    width: '85%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  scoreCircle: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginVertical: 20,
  },
  scoreBig: { fontSize: 40, fontWeight: 'bold', color: PRIMARY_COLOR },
  scoreSmall: { fontSize: 20, color: PRIMARY_COLOR_TINT, fontWeight: 'bold' },
  adviceText: {
    textAlign: 'center',
    color: PRIMARY_COLOR_TINT,
    marginBottom: 30,
    fontSize: 14,
    fontWeight: '700',
  },
  submitBtn: {
    backgroundColor: PRIMARY_COLOR,
    paddingHorizontal: 25,
    paddingVertical: 10,
    borderRadius: 8,
  },
  submitBtnText: { color: '#fff', fontWeight: 'bold' },
  //
  modalContainer: {
    width: '88%',
    maxHeight: '80%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
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
    backgroundColor: 'inherit',
    padding: 8,
    marginBottom: 20,
  },
  insText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#2222',
    marginBottom: 10,
  },
  startBtn: {
    backgroundColor: PRIMARY_COLOR,
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    alignItems: 'center',
  },
  startBtnText: {
    color: '#fff',
    fontSize: 16,
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
    color: '#222',
  },
  //
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 15,
  },
  timer: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2222',
    flexDirection: 'row',
    alignItems: 'center',
  },
  timerUrgent: {
    color: PRIMARY_COLOR,
  },
  progress: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2222',
    overflow: 'hidden',
  },
  qText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2222',
  },
  optionsContainer: {
    gap: 12,
  },
  optionButton: {
    borderWidth: 0.8,
    borderColor: '#2222',
    borderRadius: 8,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedOption: {
    borderColor: PRIMARY_COLOR,
    backgroundColor: PRIMARY_COLOR_TINT,
    borderWidth: 2,
  },
  optionText: {
    fontSize: 15,
    color: '#2222',
  },
  selectedOptionText: {
    color: PRIMARY_COLOR,
    fontWeight: 'bold',
  },
  scoreTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: PRIMARY_COLOR_TINT,
    marginBottom: 9,
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
    borderWidth: 2,
    borderColor: '#FFFFFF',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: PRIMARY_COLOR,
    zIndex: 900,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  miniCalculatorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
    paddingHorizontal: 5,
  },
  miniCalculatorHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2222',
  },
  miniCalcDisplay: {
    backgroundColor: '#f8f9fa',
    borderRadius: 5,
    padding: 4,
    marginBottom: 8,
    alignItems: 'flex-end',
  },
  miniCalcDisplayExpressionText: {
    fontSize: 10,
    color: '#6c6c6c22',
  },
  miniCalcDisplayResultsText: {
    fontSize: 14,
    color: '#2222',
    fontWeight: 'bold',
  },
  miniBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#2222',
  },
  miniButton: {
    flex: 1,
    height: 30,
    margin: 1,
    backgroundColor: '#eeeeee',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
  },
});
