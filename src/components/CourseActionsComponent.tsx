import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import Clipboard from '@react-native-clipboard/clipboard';
import { useNavigation } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { PRIMARY_COLOR, PRIMARY_COLOR_TINT } from './Classroomcomponent';
import Logo from '../assets/images/Logo';
import Toast from 'react-native-toast-message';
import toastConfig from './ToastConfig';
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

// Using a type that matches your page names
// Ensure your type looks like this:
type PageType =
  | 'Course Contents'
  | 'Course Materials'
  | 'Assignments'
  | 'Exceptions'
  | 'Assessments'
  | 'Set Lecture Schedule';
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
      <View style={styles.modalOverlay}>
        <View style={styles.assignmentModalContent}>
          <Text style={styles.modalTitle}>Create New Assignment</Text>

          <TextInput
            style={styles.input}
            placeholder="Assignment Title (e.g. Mid-term Project)"
            value={title}
            multiline
            onChangeText={setTitle}
          />

          <TextInput
            style={[styles.input, { height: 80 }]}
            placeholder="Instructions / Description (Optional)"
            multiline
            value={description}
            onChangeText={setDescription}
          />

          <TouchableOpacity
            style={styles.dateSelector}
            onPress={() => setOpen(true)}
          >
            <Icon name="calendar-clock" size={20} color={PRIMARY_COLOR} />
            <Text style={styles.dateText}>Due: {date.toDateString()}</Text>
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
          <Text style={styles.label}>Submission Method:</Text>
          <View style={styles.methodRow}>
            {['Online', 'Physical', 'Both'].map(method => (
              <TouchableOpacity
                key={method}
                style={[
                  styles.methodBtn,
                  submissionMethod === method && styles.methodBtnActive,
                ]}
                onPress={() => setSubmissionMethod(method as any)}
              >
                <Text
                  style={[
                    styles.methodBtnText,
                    submissionMethod === method && { color: '#fff' },
                  ]}
                >
                  {method}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={styles.filePickerBtn}
            onPress={handlePickFile}
          >
            <Icon name="paperclip" size={20} color={PRIMARY_COLOR_TINT} />
            <Text style={styles.filePickerText}>
              {selectedFile
                ? selectedFile.name
                : 'Attach Brief (Optional PDF/Doc)'}
            </Text>
          </TouchableOpacity>

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: PRIMARY_COLOR }]}
              onPress={handleCreate}
              disabled={isSaving}
            >
              <Text style={styles.saveBtnText}>
                {isSaving ? 'Creating...' : 'Add Assignment'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
const AddExceptionModal = ({
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
      today.setHours(0, 0, 0, 0); // Reset time to start of day for fair comparison
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
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <TouchableWithoutFeedback>
          <View style={styles.exceptionModalContent}>
            <Text style={styles.modalTitle}>Request Exception</Text>
            <Text style={styles.modalSubtitle}>{course.courseTitle}</Text>

            {/* Lecture Selector */}
            <Text style={styles.label}>Which lecture will you be missing?</Text>
            <View style={styles.pickerContainer}>
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
            <Text style={styles.label}>Reason Category</Text>
            <View style={styles.categoryGrid}>
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
                    styles.catBtn,
                    category === cat && styles.catBtnActive,
                  ]}
                  onPress={() => setCategory(cat)}
                >
                  <Text
                    style={[
                      styles.catBtnText,
                      category === cat && { color: '#fff' },
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.textArea}
              placeholder="Explain your reason in detail..."
              multiline
              numberOfLines={5}
              value={reason}
              onChangeText={setReason}
            />

            <View style={styles.costWarning}>
              <Icon
                name="information-outline"
                size={16}
                color={PRIMARY_COLOR_TINT}
              />
              <Text style={styles.costText}>
                1 iCash will be deducted upon submission.
              </Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: PRIMARY_COLOR }]}
                onPress={handleSubmit}
                disabled={isSaving}
              >
                <Text style={styles.saveBtnText}>
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
    <View style={styles.headerContainer}>
      <View style={styles.headerTop}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Icon name="chevron-left" size={32} color={PRIMARY_COLOR} />
        </TouchableOpacity>

        <View style={styles.titleContainer}>
          <Text style={styles.headerPageTitle}>{title}</Text>
          <Logo />
        </View>
        <View style={{ width: 40 }} />
      </View>

      {shouldShowSearch && (
        <View style={styles.searchBarWrapper}>
          <View style={styles.searchBarInner}>
            <Icon
              name="magnify"
              size={20}
              color="#888"
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
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
          styles.listPadding,
          { paddingBottom: insets.bottom + 20 },
        ]}
        ListHeaderComponent={
          <Text style={styles.sectionSubtitle}>
            {userRole === 'lecturer'
              ? 'Curriculum Management'
              : 'Syllabus Overview'}
          </Text>
        }
        renderItem={({ item, index }) => {
          const completed = isTopicCompleted(item);
          return (
            <View style={styles.contentRow}>
              <View style={styles.numberCircle}>
                <Text style={styles.numberText}>Wk {index + 1}</Text>
              </View>
              <Text
                style={[
                  styles.topicText,
                  completed && styles.completedTopicText,
                ]}
              >
                {item}
              </Text>

              {userRole === 'lecturer' && (
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    onPress={() => openModal(index)}
                    style={styles.iconBtn}
                  >
                    <Icon
                      name="pencil-outline"
                      size={20}
                      color={PRIMARY_COLOR_TINT}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => confirmDelete(index)}
                    style={styles.iconBtn}
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
              style={styles.addContentBtn}
              onPress={() => openModal()}
            >
              <Icon name="plus" size={20} color={PRIMARY_COLOR} />
              <Text style={styles.addContentText}>Add New Topic</Text>
            </TouchableOpacity>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="file-search-outline" size={60} color="#ccc" />
            <Text style={styles.emptyTitle}>Course Contents Not Found</Text>
            <Text style={styles.emptySubtitle}>
              {userRole === 'lecturer'
                ? "You haven't uploaded any course content yet."
                : "Your Instructor hasn't uploaded any course content for this course yet."}
            </Text>
          </View>
        }
      />

      <Modal visible={isModalVisible} transparent animationType="fade">
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setModalVisible(false)}
        >
          <TouchableWithoutFeedback>
            <View style={styles.centeredView}>
              <View style={styles.editModalContent}>
                <Text style={styles.modalTitle}>
                  {editingIndex !== null
                    ? 'Edit Existing Topic'
                    : 'Add New Topic'}
                </Text>

                <TextInput
                  style={styles.input}
                  value={currentText}
                  onChangeText={setCurrentText}
                  placeholder="Enter topic name..."
                  autoFocus
                />

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => setModalVisible(false)}
                  >
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.saveBtn, { backgroundColor: PRIMARY_COLOR }]}
                    onPress={handleSave}
                  >
                    <Text style={styles.saveBtnText}>Save Changes</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </Pressable>
      </Modal>
      <Modal visible={isDeleteModalVisible} transparent animationType="fade">
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setDeleteModalVisible(false)}
        >
          <TouchableWithoutFeedback>
            <View style={styles.centeredView}>
              <View style={styles.deleteModalContent}>
                <View style={styles.warningIconCircle}>
                  <Icon
                    name="alert-outline"
                    size={40}
                    color={PRIMARY_COLOR_TINT}
                  />
                </View>
                <Text style={styles.modalTitle}>Delete Topic?</Text>
                <Text style={styles.modalSubText}>
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
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => setDeleteModalVisible(false)}
                  >
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteConfirmBtn}
                    onPress={executeDelete}
                  >
                    <Text style={styles.saveBtnText}>Delete</Text>
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
        styles.listPadding,
        { paddingBottom: insets.bottom + 20 },
      ]}
      ListHeaderComponent={
        <View style={styles.rowBetween}>
          <Text style={styles.sectionSubtitle}>
            Downloadable Course Materials
          </Text>
          {userRole === 'lecturer' && (
            <TouchableOpacity
              style={styles.addButton}
              onPress={handleAddMaterial}
              disabled={isUploading}
            >
              <Text style={styles.addBtnText}>
                {isUploading ? 'Uploading...' : 'Add Material'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      }
      renderItem={({ item }) => {
        const fileName = item.url.split('/').pop() || 'document.pdf';
        return (
          <View style={styles.materialCard}>
            <Icon name="file-pdf-box" size={32} color={PRIMARY_COLOR} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.materialTitle}>{item.title}</Text>
              <Text style={styles.materialSub} numberOfLines={1}>
                {item.url.split('/').pop()}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.downloadCircle}
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
        <View style={styles.emptyContainer}>
          <Icon
            name="file-search-outline"
            size={60}
            color={PRIMARY_COLOR_TINT}
          />
          <Text style={styles.emptyTitle}>No Materials Found</Text>
          <Text style={styles.emptySubtitle}>
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
        styles.listPadding,
        { paddingBottom: insets.bottom + 20 },
      ]}
      ListHeaderComponent={
        <View style={styles.rowBetween}>
          <Text style={styles.sectionSubtitle}>Assignments & Tasks</Text>
          {userRole === 'lecturer' && (
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setModalVisible(true)}
            >
              <Text style={styles.addBtnText}>Create</Text>
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
          <View style={styles.assignmentCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.assignmentName}>{item.title}</Text>
              <Text style={styles.methodText}>
                Method: {item.submissionMethod}
              </Text>
              <Text style={[styles.dueDate, overdue && { color: '#ff4d4d' }]}>
                {overdue ? 'Past Due: ' : 'Due: '} {formatDate(item.dueDate)}
              </Text>
            </View>
            <View
              style={[
                styles.statusTag,
                userRole === 'lecturer'
                  ? styles.lecturerStatus
                  : hasSubmitted
                  ? styles.successTag
                  : styles.pendingTag,
              ]}
            >
              <Text style={styles.statusText}>
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
        <View style={styles.emptyContainer}>
          <Text style={styles.emptySubtitle}>No assignments posted yet.</Text>
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
  const limits = { free: 3, pro: 5, premium: 7 };
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
  // Determine the reason for the disabled state
  const getDisabledReason = () => {
    if (hasExceededLimit)
      return `Monthly ${currentPlan} tier limit reached (${planLimit}/${planLimit})`;
    if (hasInsufficientPoints) return 'Insufficient iCash (1 pts required)';
    return '';
  };

  return (
    <FlatList
      data={filteredData}
      refreshing={refreshing}
      onRefresh={onRefresh}
      keyExtractor={item => item.id}
      contentContainerStyle={styles.listPadding}
      ListHeaderComponent={
        <View style={styles.headerWrapper}>
          <View style={styles.tierInfoCard}>
            <View style={styles.usageHeader}>
              <Text style={styles.tierLabel}>
                {currentPlan.toUpperCase()} plan
              </Text>
              <Text style={styles.usageText}>
                {usedThisMonth} / {planLimit} used
              </Text>
            </View>
            <Text style={styles.resetText}>
              Resets on the 1st of next month
            </Text>
          </View>
          {!isDisabled && (
            <TouchableOpacity style={styles.addBtn} onPress={onAddPress}>
              <Icon name="plus-circle" size={20} color={PRIMARY_COLOR_TINT} />
              <Text style={styles.addBtnText2}>Request Exception</Text>
            </TouchableOpacity>
          )}
          {isDisabled && (
            <View style={styles.errorContainer}>
              <Icon name="alert-circle-outline" size={14} color="#fff" />
              <Text style={styles.errorText}>{getDisabledReason()}</Text>
            </View>
          )}
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.exceptionCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.courseIdText}>
              {item.courseInfo.courseCode}: {item.courseInfo.courseTitle}
            </Text>
            <Text style={styles.reasonText} numberOfLines={2}>
              <Text style={{ fontWeight: '700' }}>{item.reasonCategory}: </Text>
              {item.reason}
            </Text>
            <Text style={styles.dateText2}>
              {new Date(item.date).toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.statusBadge}>
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
            <Text style={styles.statusLabel}>{item.status}</Text>
          </View>
        </View>
      )}
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Icon
            name="file-search-outline"
            size={60}
            color={PRIMARY_COLOR_TINT}
          />
          <Text style={styles.emptyTitle}>No Exceptions Found</Text>
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
        <View style={styles.manageCard}>
          <View style={styles.rowBetween}>
            <View>
              <Text style={styles.studentName}>
                {item.studentName || 'Unknown Student'}
              </Text>
              <Text style={styles.matricText}>{item.matricNumber}</Text>
            </View>
            {item.status === 'pending' && (
              <View style={styles.pendingIndicator} />
            )}
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.exceptionDetails}>{item.courseId}</Text>
            <View style={styles.dot} />
            <Text style={styles.categoryLabel}>{item.reasonCategory}</Text>
          </View>

          <Text style={styles.reasonBody}>{item.reason}</Text>

          {item.status === 'pending' ? (
            <View style={styles.actionRow2}>
              <TouchableOpacity
                style={styles.approveBtn}
                onPress={() => onUpdateStatus(item.id, 'approved')}
              >
                <Text style={styles.btnText}>Approve</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.rejectBtn}
                onPress={() => onUpdateStatus(item.id, 'rejected')}
              >
                <Text style={styles.btnText}>Reject</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.finalStatusContainer}>
              <Icon
                name={
                  item.status === 'approved' ? 'check-circle' : 'close-circle'
                }
                size={20}
                color={PRIMARY_COLOR_TINT}
                style={{ marginRight: 8 }}
              />
              <Text style={styles.finalStatusText}>
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
      const generatedLink = `https://live.iCampus.com/${course.courseId}/${randomHash}`;
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
      <Text style={styles.labelMain}>Set Lecture Schedule</Text>
      <Text style={styles.inputLabel}>Select Lecture Topic</Text>
      <TouchableOpacity
        style={styles.textInput}
        onPress={() => setShowTopicPicker(true)}
      >
        <Text style={{ color: form.topicName ? PRIMARY_COLOR_TINT : '#999' }}>
          {form.topicName || 'Choose a topic from syllabus'}
        </Text>
        <Icon name="chevron-down" size={20} color="#666" />
      </TouchableOpacity>

      <Text style={styles.inputLabel}>Lecture Type</Text>
      <View style={styles.typeToggleContainer}>
        {(['Physical', 'Online', 'Recorded'] as const).map(type => (
          <TouchableOpacity
            key={type}
            style={[
              styles.typeOption,
              form.lectureType === type && styles.typeOptionActive,
            ]}
            onPress={() => setForm({ ...form, lectureType: type })}
          >
            <Text
              style={[
                styles.typeOptionText,
                form.lectureType === type && styles.typeOptionTextActive,
              ]}
            >
              {type}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {/* 2. Dynamic Input Field */}
      <Text style={styles.inputLabel}>{getLabel()}</Text>
      <View style={styles.inputContainer}>
        <TextInput
          style={[
            styles.textInput,
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

      <View style={styles.dateTimeRow}>
        <TouchableOpacity
          style={styles.dateTimeBox}
          onPress={() => setPickerMode('date')}
        >
          <Icon name="calendar-month" size={22} color="#fff" />
          <View>
            <Text style={styles.microLabel}>Date</Text>
            <Text style={styles.dateTimeText}>{form.date || 'Select'}</Text>
          </View>
        </TouchableOpacity>

        {/* START TIME */}
        <TouchableOpacity
          style={styles.dateTimeBox}
          onPress={() => setPickerMode('startTime')}
        >
          <Icon name="clock-start" size={22} color="#fff" />
          <View>
            <Text style={styles.microLabel}>Starts</Text>
            <Text style={styles.dateTimeText}>{form.startTime || '00:00'}</Text>
          </View>
        </TouchableOpacity>

        {/* END TIME */}
        <TouchableOpacity
          style={styles.dateTimeBox}
          onPress={() => setPickerMode('endTime')}
        >
          <Icon name="clock-end" size={22} color="#fff" />
          <View>
            <Text style={styles.microLabel}>Ends</Text>
            <Text style={styles.dateTimeText}>{form.endTime || '00:00'}</Text>
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
      <View style={styles.repeatContainer}>
        <Text style={styles.inputLabel}>Set Recursion?</Text>
        <View style={styles.repeatCounter}>
          <TouchableOpacity
            onPress={() => setRepeatWeeks(Math.max(1, repeatWeeks - 1))}
          >
            <Icon
              name="minus-circle-outline"
              size={30}
              color={PRIMARY_COLOR_TINT}
            />
          </TouchableOpacity>
          <Text style={styles.repeatValue}>
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
        style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
        onPress={validateAndSave} // Trigger the validation first
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitText}>Confirm Schedule</Text>
        )}
      </TouchableOpacity>
      <Modal visible={showTopicPicker} transparent animationType="fade">
        <Pressable
          style={styles.modalOverlayEnd}
          onPress={() => setShowTopicPicker(false)}
        >
          <View style={styles.pickerContainer2}>
            <Text style={styles.pickerTitle}>Course Syllabus</Text>
            <FlatList
              data={course.courseContents || []}
              keyExtractor={(item, index) => index.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.pickerItem}
                  onPress={() => {
                    setForm({ ...form, topicName: item });
                    setShowTopicPicker(false);
                  }}
                >
                  <Text style={styles.pickerItemText}>{item}</Text>
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
                <Text style={styles.emptyText}>No syllabus topics found.</Text>
              }
            />
          </View>
        </Pressable>
      </Modal>
      <Modal visible={showErrorModal} transparent animationType="fade">
        <View style={styles.alertOverlay}>
          <View style={styles.alertBox}>
            <Icon name="alert-circle-outline" size={50} color={PRIMARY_COLOR} />
            <Text style={styles.alertTitle}>Missing Information</Text>
            <Text style={styles.alertText}>{errorMessage}</Text>
            <TouchableOpacity
              style={styles.alertButton}
              onPress={() => setShowErrorModal(false)}
            >
              <Text style={styles.alertButtonText}>Got it</Text>
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
  const filteredTests = tests.filter(t =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );

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
      courseId: currentCourse.courseId,
      title: testForm.title,
      duration: Number(testForm.duration),
      totalMarks: Number(testForm.totalMarks),
      questions: testForm.questions as Question[],
      isPublished,
      status: isPublished ? 'published' : 'draft',
      createdAt: new Date().toISOString(),
      dueDate: testForm.dueDate,
    };
    onSaveTest(finalPayload);
    setLoading(false);
    setIsModalVisible(false);
    setTestForm(initialFormState);
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
        setTestForm(prev => ({ ...prev, dueDate: dateString }));
        setTimeout(() => setPickerMode('startTime'), 500);
      } else if (pickerMode === 'startTime') {
        const timeString = selectedDate.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });
        setTestForm(prev => ({
          ...prev,
          dueDate: `${prev.dueDate} at ${timeString}`,
        }));
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
    <View style={styles.container}>
      <View style={styles.rowBetween}>
        <Text style={styles.sectionTitle}>Past Assessments</Text>
        <TouchableOpacity
          style={styles.createCard}
          onPress={() => setIsModalVisible(true)}
        >
          <Icon name="plus-circle" size={24} color="#fff" />
          <Text style={styles.createCardText}>Create New Assessment</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredTests}
        refreshing={refreshing}
        onRefresh={onRefresh}
        keyExtractor={(item, index) => item.id || item._id || index.toString()}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            No assessments found matching "{searchQuery}"
          </Text>
        }
        renderItem={({ item }) => {
          const isPastDue = new Date() > new Date(item.dueDate);
          return (
            <View style={styles.pastTestCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.testTitle}>{item.title}</Text>
                <Text style={styles.testMeta}>
                  {item.questions.length} Questions •{' '}
                  <Text style={{ color: PRIMARY_COLOR_TINT }}>
                    {item.isPublished ? 'Published' : 'Draft'}
                  </Text>
                </Text>
              </View>
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
            <Icon name="chart-bar" size={20} color={PRIMARY_COLOR} style={{ marginRight: 4 }} />
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
             <Text style={{ fontSize: 10, color: '#888' }}>Report pending</Text>
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
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setIsModalVisible(false)}
              style={{ width: 40, justifyContent: 'center' }}
            >
              <Icon name="chevron-left" size={26} color={PRIMARY_COLOR_TINT} />
            </TouchableOpacity>

            <Text style={styles.headerTitle}>Build Assessment</Text>

            <TouchableOpacity
              onPress={() => handleFinalize(true)}
              disabled={loading}
              style={styles.publishHeaderBtn}
            >
              <Text style={styles.publishHeaderText}>Publish</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalBody}
            showsVerticalScrollIndicator={false}
          >
            {/* Settings Card */}
            <View style={styles.settingsCard}>
              <TextInput
                style={styles.titleInput}
                placeholder="Assessment Title (e.g. Test 1)"
                placeholderTextColor="#999999e2"
                value={testForm.title}
                onChangeText={t => setTestForm({ ...testForm, title: t })}
              />
              <View style={styles.settingsRow}>
                <View style={styles.settingItem}>
                  <Text style={styles.microLabel2}>Minutes</Text>
                  <TextInput
                    style={styles.settingInput}
                    keyboardType="numeric"
                    value={testForm.duration}
                    onChangeText={val =>
                      setTestForm({ ...testForm, duration: val })
                    }
                  />
                </View>
                <View style={styles.settingItem}>
                  <Text style={styles.microLabel2}>Total Marks</Text>
                  <TextInput
                    style={styles.settingInput}
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
              <View key={q.id} style={styles.questionCard}>
                <View style={styles.qHeader}>
                  <Text style={styles.qNumber}>Question {idx + 1}</Text>
                  <View style={styles.sideBySide}>
                    <TextInput
                      style={styles.pointsInput}
                      keyboardType="numeric"
                      value={q.points.toString()}
                      onChangeText={p =>
                        updateQuestion(q.id, { points: Number(p) })
                      }
                    />
                    <Text style={styles.pointsLabel}>pts</Text>
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
                  style={styles.qInput}
                  placeholder="Type your question here..."
                  multiline
                  value={q.questionText}
                  onChangeText={t => updateQuestion(q.id, { questionText: t })}
                />
                <View style={styles.typeGroup}>
                  <TouchableOpacity
                    style={[
                      styles.typeBtn,
                      q.type === 'MCQ' && styles.activeTypeBtn,
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
                        styles.typeText,
                        q.type === 'MCQ' && styles.activeTypeText,
                      ]}
                    >
                      Multiple Choice
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.typeBtn,
                      q.type === 'ShortAnswer' && styles.activeTypeBtn,
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
                        styles.typeText,
                        q.type === 'ShortAnswer' && styles.activeTypeText,
                      ]}
                    >
                      Text
                    </Text>
                  </TouchableOpacity>
                </View>
                {q.type === 'MCQ' ? (
                  <>
                    {(q.options ?? []).map((opt, oIdx) => (
                      <View key={oIdx} style={styles.optionRow}>
                        <TouchableOpacity
                          onPress={() =>
                            updateQuestion(q.id, { correctAnswer: opt })
                          }
                          style={[
                            styles.radio,
                            q.correctAnswer === opt && styles.radioActive,
                          ]}
                        >
                          {q.correctAnswer === opt && (
                            <View style={styles.radioInner} />
                          )}
                        </TouchableOpacity>
                        <TextInput
                          style={styles.optInput}
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
                      style={styles.addOptionBtn}
                    >
                      <Text style={styles.addOptionText}> Add Options</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <View style={styles.shortAnswerPreview}>
                      <Text style={styles.previewLabel}>
                        Student Response Area
                      </Text>
                      <View style={styles.disabledInputPlaceholder}>
                        <Text style={styles.placeholderText}>
                          Students will type their answer here...
                        </Text>
                      </View>
                      <TextInput
                        style={styles.correctAnswerInput}
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
            <View style={styles.settingItem}>
              <Text style={styles.labelTitle}>Deadline</Text>
              <TouchableOpacity
                style={styles.datePickerTrigger}
                onPress={() => setPickerMode('date')}
              >
                <Text
                  style={[
                    styles.dateText,
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

            <TouchableOpacity style={styles.addBtn} onPress={addQuestion}>
              <Icon name="plus" size={22} color={PRIMARY_COLOR_TINT} />
              <Text style={styles.addBtnText3}>Add Question</Text>
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
    <SafeAreaView style={styles.container}>
      {/* INSTRUCTIONS MODAL */}
      <Modal visible={!isStarted} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              <Icon
                name="information-outline"
                size={50}
                color={PRIMARY_COLOR}
                style={styles.centerIcon}
              />
              <Text style={styles.modalTitle}>Test Instructions</Text>

              <View style={styles.instructionBox}>
                <Text style={styles.insText}>
                  <Text style={styles.boldText}>Identity Verification:</Text>{' '}
                  Your front camera will stay on to make sure it's really you
                  taking the test.
                </Text>
                <Text style={styles.insText}>
                  <Text style={styles.boldText}>Stay Focused:</Text>
                  Try not to look away from the screen for too long, as the
                  system monitors your attention.
                </Text>
                <Text style={styles.insText}>
                  No Switching Apps/minimizing:
                  <Text style={styles.boldText}>
                    No Switching Apps/minimization:{' '}
                  </Text>
                  If you leave this app or minimize it, your assessment wil
                  auto-submit.
                </Text>
                <Text style={styles.insText}>
                  <Text style={styles.boldText}>Identity Check (Selfie):</Text>
                  We’ll take a quick photo of you now to verify your identity
                  before the test starts.
                </Text>
                <Text style={styles.insText}>
                  Goodluck and we hope you have a good test!
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.startBtn, isUploading && styles.disabledBtn]}
                onPress={startTestWithSecurity}
                disabled={isUploading}
              >
                {isUploading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.startBtnText}>
                    Verify Identity & Start
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* QUIZ HEADER */}
      <View style={styles.header}>
        <Text style={[styles.timer, timeLeft < 600 && styles.timerUrgent]}>
          <Icon name="clock-outline" size={20} color="#2222" />
          {Math.floor(timeLeft / 60)}:{' '}
          {(timeLeft % 60).toString().padStart(2, '0')}
        </Text>

        <Text style={styles.progress}>
          Question {currentIndex + 1} of {test.questions.length}
        </Text>
      </View>

      {/* QUESTION UI */}
      {isStarted && !isFinished && (
        <>
          <View style={styles.questionCard}>
            <Text style={styles.qText}>
              {test.questions[currentIndex].questionText}
            </Text>
            {/* Conditional Rendering Logic */}
            {test.questions[currentIndex].type === 'MCQ' ||
            test.questions[currentIndex].type === 'TrueFalse' ? (
              <View style={styles.optionsContainer}>
                {test.questions[currentIndex].options?.map((option, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.optionButton,
                      answers[test.questions[currentIndex].id] === option &&
                        styles.selectedOption,
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
                        styles.optionText,
                        answers[test.questions[currentIndex].id] === option &&
                          styles.selectedOptionText,
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
                style={styles.input}
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

          <View style={styles.testSideBySide}>
            <TouchableOpacity
              style={styles.submitBtn}
              onPress={() =>
                currentIndex > 0 && setCurrentIndex(currentIndex - 1)
              }
            >
              <Text style={styles.submitBtnText}>Prev</Text>
            </TouchableOpacity>

            {currentIndex === test.questions.length - 1 ? (
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleFinalSubmit}
              >
                <Text style={styles.submitBtnText}>Submit Test</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => setCurrentIndex(currentIndex + 1)}
              >
                <Text style={styles.submitBtnText}>Next</Text>
              </TouchableOpacity>
            )}
          </View>
        </>
      )}

      {/* FINAL SCORE MODAL */}
      <Modal visible={isFinished} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.resultCard}>
            <Icon name="trophy-outline" size={50} color={PRIMARY_COLOR} />

            <View style={styles.scoreCircle}>
              <Text style={styles.scoreBig}>{finalResult.score}</Text>
              <Text style={styles.scoreSmall}>/ {finalResult.total}</Text>
            </View>

            <Text style={styles.scoreTitle}>
              {getAdvice((finalResult.score / finalResult.total) * 100).title}
            </Text>

            <Text style={styles.adviceText}>
              {getAdvice((finalResult.score / finalResult.total) * 100).msg}
            </Text>

            <TouchableOpacity
              style={styles.startBtn}
              onPress={() => {
                navigation.navigate('Home');
              }}
            >
              <Text style={styles.startBtnText}>Back to Courses</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {device != null && (
        <Camera
          {...({
            ref: cameraRef,
            style: isStarted ? styles.miniCamera : styles.fullCamera,
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
export const CourseSubPage = ({ route, navigation }: any) => {
  const user = useAppSelector(state => state.user);
  const {
    title,
    course,
    lectures,
    userRole,
    exceptions: initialExceptions,
  } = route.params;

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false); // Added missing loading state
  const [localExceptions, setLocalExceptions] = useState<CourseException[]>(
    initialExceptions || [],
  );
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [scheduledLecture, setScheduledLecture] = useState<Lecture | null>(
    null,
  );
  const [tests, setTests] = useState<CreateTestPayload[]>([]);
  const [activeTest, setActiveTest] = useState<CreateTestPayload | null>(null);

  // --- STUDENT: Submit New Exception ---
  const handleSaveException = async (
    newException: Partial<CourseException>,
  ) => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('accessToken');
      const response = await fetch(
        `${baseUrl}users/student/class/exceptions/submit`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(newException),
        },
      );

      const result = await response.json();

      if (response.ok) {
        Toast.show({
          type: 'success',
          text1: 'Exception submitted successfully',
          position: 'bottom',
        });
        setLocalExceptions([result.exception, ...localExceptions]);
        setModalVisible(false);
      } else {
        Toast.show({
          type: 'error',
          text1: 'Submission Error',
          text2: result.message,
          position: 'bottom',
        });
      }
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Submission Error',
        text2: error.message,
        position: 'bottom',
      });
    } finally {
      setLoading(false);
    }
  };
  const handleTestSubmission = async (payload: any) => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('accessToken');
      const response = await fetch(
        `${baseUrl}users/student/class/test/submit`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        },
      );

      if (response.ok) {
        Toast.show({
          type: 'success',
          text1: 'Test Submitted!',
          text2: 'Your grade has been recorded.',
        });
        fetchTests();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Submission failed');
      }
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Submission Error',
        text2: error.message,
      });
    } finally {
      setLoading(false);
    }
  };
  // --- All (Student & Lecturer)
  const fetchExceptions = useCallback(async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('accessToken');

      const response = await fetch(
        `${baseUrl}users/exceptions?courseId=${course.courseId}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );
      const result: { success: boolean; exceptions: CourseException[] } =
        await response.json();
      if (response.ok) {
        setLocalExceptions(result.exceptions);
      } else {
        Toast.show({
          type: 'error',
          text1: 'Fetch Error',
          text2: 'Failed to fetch exceptions',
        });
      }
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Fetch Error',
        text2: error.message,
      });
    } finally {
      setLoading(false);
    }
  }, [course.courseId]);
  // --- LECTURER: Handle Creating a New Lecture ---
  const handleUpdateStatus = async (
    id: string,
    status: 'approved' | 'rejected',
  ) => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('accessToken');
      const response = await fetch(
        `${baseUrl}users/lecturers/class/exceptions/${id}/status`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status }),
        },
      );

      if (response.ok) {
        setLocalExceptions(prev =>
          prev.map(ex => (ex.id === id ? { ...ex, status } : ex)),
        );
        Toast.show({ type: 'success', text1: `Exception ${status}` });
      }
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Failed to update status' });
    } finally {
      setLoading(false);
    }
  };
  const handleCreateLecture = async (
    lectureData: CreateLecturePayload, // One argument, matches the prop
  ) => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('accessToken');

      // Clean up payload: if it's physical, remove videoUrl, etc.
      const finalPayload = {
        ...lectureData,
        courseId: course.courseId,
        location:
          lectureData.lectureType === 'Recorded' ? '' : lectureData.location,
        videoUrl:
          lectureData.lectureType === 'Recorded' ? lectureData.videoUrl : '',
      };

      const response = await fetch(
        `${baseUrl}users/lecturers/class/courses/${course.courseId}/lectures/createSchedule`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(finalPayload),
        },
      );
      const result = await response.json();
      if (response.ok) {
        setScheduledLecture(result.lecture);
        setShowSuccessModal(true);
      } else {
        Toast.show({
          type: 'error',
          text1: 'Scheduling Failed',
          text2: result.message || 'Check your inputs',
        });
      }
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Network Error',
        text2: error.message,
      });
    } finally {
      setLoading(false);
    }
  };
  const handleCreateTest = async (
    testData: CreateTestPayload,
    isSilent: boolean = false,
  ) => {
    // Only show the global loading spinner if it's NOT a silent auto-save
    if (!isSilent) setLoading(true);

    try {
      const token = await AsyncStorage.getItem('accessToken');

      // Clean the payload: Ensure numbers are numbers before sending to MongoDB
      const finalPayload = {
        ...testData,
        courseId: course.courseId,
        duration: Number(testData.duration),
        totalMarks: Number(testData.totalMarks),
        questions: testData.questions.map(q => ({
          ...q,
          points: Number(q.points),
        })),
      };

      const response = await fetch(
        `${baseUrl}users/lecturers/class/courses/${course.courseId}/assessments`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(finalPayload),
        },
      );

      const result = await response.json();

      if (response.ok) {
        // Only show success toast for manual clicks (Publish/Save Draft)
        if (!isSilent) {
          Toast.show({
            type: 'success',
            text1: testData.isPublished
              ? 'Assessment Published!'
              : 'Draft Saved',
            text2: `Successfully stored "${testData.title}"`,
          });
          setModalVisible(false); // Close modal on manual success
        }
        fetchTests();
      } else {
        // Always show error toast, even if silent
        Toast.show({
          type: 'error',
          text1: 'Save Failed',
          text2: result.message || 'Check your connection',
        });
      }
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Network Error',
        text2: error.message,
      });
    } finally {
      if (!isSilent) setLoading(false);
    }
  };
  const fetchTests = useCallback(async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('accessToken');
      const response = await fetch(
        `${baseUrl}users/lecturers/class/courses/${course.courseId}/assessments`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );
      const result = await response.json();
      if (response.ok) {
        const sortedTests = result.data.sort(
          (a: any, b: any) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        setTests(sortedTests);
      } else {
        Toast.show({
          type: 'error',
          text1: 'Fetch Error',
          text2: result.message,
        });
      }
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Sync Error',
        text2: 'Could not refresh assessments.',
      });
    } finally {
      setLoading(false);
    }
  }, [course.courseId]); // Dependency: Only recreate if courseId changes
  useEffect(() => {
    if (title === 'Exceptions') {
      fetchExceptions();
    }
    if (title === 'Assessments') {
      fetchTests(); // <--- Fetch tests when the Assessment page is active
    }
  }, [title, fetchExceptions, fetchTests]);
  useEffect(() => {
    // Only run this logic for students on the Assessments tab
    if (title === 'Assessments' && userRole === 'student' && tests.length > 0) {
      // Find the first published test from the list we just fetched
      const publishedTest = tests.find(t => t.isPublished);

      if (publishedTest) {
        setActiveTest(publishedTest);
      }
    }
  }, [tests, title, userRole]); // Trigger whenever the 'tests' array is updated from fetchTests()

  const goBack = () => navigation.goBack();
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <DetailHeader
        title={title}
        onBack={goBack}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        placeholder={`Search ${title.toLowerCase()}...`}
        userRole={userRole} // Pass the userRole here
      />

      <View style={styles.body}>
        {title === 'Course Contents' && (
          <RenderContents
            course={course}
            userRole={userRole}
            searchQuery={searchQuery}
          />
        )}
        {title === 'Course Materials' && (
          <RenderMaterials
            course={course}
            lectures={lectures}
            userRole={userRole}
            searchQuery={searchQuery}
          />
        )}
        {title === 'Assignments' && (
          <RenderAssignments
            course={course}
            userRole={userRole}
            searchQuery={searchQuery}
          />
        )}
        {title === 'Exceptions' &&
          (userRole === 'lecturer' ? (
            <RenderLecturerExceptionsManage
              exceptions={localExceptions}
              onUpdateStatus={handleUpdateStatus}
              searchQuery={searchQuery}
              refreshing={loading}
              onRefresh={fetchExceptions}
            />
          ) : (
            <RenderStudentExceptions
              exceptions={localExceptions}
              user={user}
              refreshing={loading}
              onRefresh={fetchExceptions}
              onAddPress={() => setModalVisible(true)}
              searchQuery={searchQuery}
            />
          ))}
        {title === 'Set Lecture Schedule' && (
          <RenderScheduleLecture
            course={course}
            onSave={handleCreateLecture}
            isLoading={loading}
          />
        )}

        {title === 'Assessments' &&
          (userRole === 'lecturer' ? (
            <RenderLecturerTestManage
              course={course}
              refreshing={loading}
              tests={tests}
              onRefresh={fetchTests}
              onSaveTest={handleCreateTest}
              searchQuery={searchQuery}
            />
          ) : activeTest ? ( // Check if activeTest exists before rendering
            <RenderStudentTest
              test={activeTest}
              user={user}
              onSubmit={handleTestSubmission}
            />
          ) : (
            // Show this if fetching is done but no test is published
            <View
              style={{
                flex: 1,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              {loading ? (
                <ActivityIndicator size="large" color={PRIMARY_COLOR} />
              ) : (
                <Text style={{ color: '#666' }}>
                  No assessments currently available.
                </Text>
              )}
            </View>
          ))}
      </View>

      <AddExceptionModal
        visible={isModalVisible}
        onClose={() => setModalVisible(false)}
        course={course}
        user={user}
        onSave={handleSaveException}
        isSaving={loading}
      />
      <Modal visible={showSuccessModal} transparent animationType="slide">
        <View style={styles.successOverlay}>
          <View style={styles.successBox}>
            <Icon
              name="check-circle-outline"
              size={70}
              color={PRIMARY_COLOR_TINT}
            />
            <Text style={styles.successTitle}>Lecture Scheduled Set!</Text>
            <Text style={styles.successText}>
              {scheduledLecture?.topicName} has been successfully added to the
              schedule.
            </Text>
            {scheduledLecture?.lectureType === 'Online' && (
              <View style={styles.linkShareBox}>
                <Text style={styles.linkSubtitle}>Share Meeting Link</Text>
                <View style={styles.linkRow}>
                  <Text numberOfLines={1} style={styles.linkText}>
                    {scheduledLecture.location}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      Clipboard.setString(scheduledLecture.location || '');
                      Toast.show({ type: 'success', text1: 'Link copied!' });
                    }}
                  >
                    <Icon
                      name="content-copy"
                      size={20}
                      color={PRIMARY_COLOR_TINT}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            )}
            <TouchableOpacity
              style={styles.doneButton}
              onPress={() => {
                setShowSuccessModal(false);
                navigation.goBack(); // Return to the main course page
              }}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Toast config={toastConfig} />
    </SafeAreaView>
  );
};
const styles = StyleSheet.create({
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
    marginBottom: 8,
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
  topicText: { flex: 1, fontSize: 15, fontWeight: '500' },
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
  modalTitle: {
    fontSize: 21,
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
    backgroundColor: '#ff4d4d', // Bold red for danger
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
    flex: 2,
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
    color: PRIMARY_COLOR_TINT,
    marginTop: 10,
  },
  successText: {
    fontSize: 15,
    color: PRIMARY_COLOR_TINT,
    textAlign: 'center',
    marginVertical: 10,
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
    width: '100%',
    padding: 16,
    borderRadius: 15,
    marginTop: 25,
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
    width: '100%',
    alignItems: 'center',
  },
  startBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
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
    top: 20,
    right: 20,
    width: 100,
    height: 130,
    borderRadius: 15,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    zIndex: 999,
  },
});
