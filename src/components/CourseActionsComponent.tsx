import React, {useState, useEffect, useCallback} from 'react';
import { View,TextInput, Text, FlatList, StyleSheet, TouchableOpacity, TouchableWithoutFeedback, Pressable, Modal } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Course, Lecture, Assignment, User, CourseException, LecturerExceptionView } from '../types/firebase';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { PRIMARY_COLOR, PRIMARY_COLOR_TINT } from './Classroomcomponent';
import Logo from '../assets/images/Logo';
import Toast from 'react-native-toast-message';
import toastConfig from './ToastConfig';
import {baseUrl} from './HomeScreenComponents';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DocumentPicker from 'react-native-document-picker';
import RNFS from 'react-native-fs';
import { PermissionsAndroid, Platform, Linking } from 'react-native';
import DatePicker from 'react-native-date-picker';
import { useAppSelector } from './hooks';
import { Picker } from '@react-native-picker/picker';

// Using a type that matches your page names
type PageType = 'Course Contents' | 'Course Materials' | 'Assignments';
interface LecturerManageProps {
  exceptions: LecturerExceptionView[];
  searchQuery: string;
  refreshing: boolean;  
  onRefresh: () => void;
  onUpdateStatus: (id: string, status: 'approved' | 'rejected') => Promise<void>;
}
interface StudentExceptionsProps {
  exceptions: CourseException[];
  user: User;
  onAddPress: () => void;
  searchQuery: string;
  refreshing: boolean;   // <-- Add this
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
}
interface CreateAssignmentProps {
  visible: boolean;
  onClose: () => void;
  onSave: (formData: FormData) => void;
  isSaving: boolean;
}
const CreateAssignmentModal = ({ visible, onClose, onSave, isSaving }: CreateAssignmentProps) => {
  const [title, setTitle] = useState('');
  const [submissionMethod, setSubmissionMethod] = useState<'Online' | 'Physical' | 'Both'>('Online');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date());
  const [open, setOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<any>(null);

  const handlePickFile = async () => {
    try {
      const res = await DocumentPicker.pickSingle({
        type: [DocumentPicker.types.pdf, DocumentPicker.types.doc, DocumentPicker.types.docx],
      });
      setSelectedFile(res);
    } catch (err) {
      if (!DocumentPicker.isCancel(err)) console.log(err);
    }
  };

  const handleCreate = () => {
    if (!title.trim()) return Toast.show({ type: 'error', text1: 'Title required' });
    
    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('dueDate', date.toISOString());
    
    if (selectedFile) {
      formData.append('file', {
        uri: Platform.OS === 'android' ? selectedFile.uri : selectedFile.uri.replace('file://', ''),
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

          <TouchableOpacity style={styles.dateSelector} onPress={() => setOpen(true)}>
            <Icon name="calendar-clock" size={20} color={PRIMARY_COLOR} />
            <Text style={styles.dateText}>Due: {date.toDateString()}</Text>
          </TouchableOpacity>

          <DatePicker
            modal
            open={open}
            date={date}
            mode="datetime"
            minimumDate={new Date()}
            onConfirm={(datei) => { setOpen(false); setDate(datei); }}
            onCancel={() => setOpen(false)}
          />
          <Text style={styles.label}>Submission Method:</Text>
            <View style={styles.methodRow}>
              {['Online', 'Physical', 'Both'].map((method) => (
                <TouchableOpacity 
                  key={method}
                  style={[styles.methodBtn, submissionMethod === method && styles.methodBtnActive]}
                  onPress={() => setSubmissionMethod(method as any)}
                >
                  <Text style={[styles.methodBtnText, submissionMethod === method && { color: '#fff' }]}>
                    {method}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          <TouchableOpacity style={styles.filePickerBtn} onPress={handlePickFile}>
            <Icon name="paperclip" size={20} color={PRIMARY_COLOR_TINT} />
            <Text style={styles.filePickerText}>
              {selectedFile ? selectedFile.name : "Attach Brief (Optional PDF/Doc)"}
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
              <Text style={styles.saveBtnText}>{isSaving ? "Creating..." : "Add Assignment"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
const AddExceptionModal = ({ visible, onClose, course, user, onSave, isSaving }: AddExceptionProps) => {
  const [category, setCategory] = useState<CourseException['reasonCategory']>('Personal');
  const [reason, setReason] = useState('');
  const [lectureId, setLectureId] = useState(''); 
  const futureLectures = course.Lectures?.filter((l) => {
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
        matricNumber: user.matricNumber
      },
      courseInfo: {
        courseTitle: course.courseTitle,
        courseCode: course.courseCode
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
              onValueChange={(itemValue) => setLectureId(itemValue)}
            >
              <Picker.Item label="Select lecture..." value="" />
              {futureLectures.map((l) => (
                <Picker.Item 
                  key={l.id} 
                  label={`${l.topicName} (${new Date(l.date).toLocaleDateString()})`} 
                  value={l.id} 
                />
              ))}
            </Picker>
          </View>

          {/* Category Selector */}
          <Text style={styles.label}>Reason Category</Text>
          <View style={styles.categoryGrid}>
            {(['Medical', 'Family Emergency', 'Technical Issue', 'Personal', 'Other'] as const).map((cat) => (
              <TouchableOpacity 
                key={cat}
                style={[styles.catBtn, category === cat && styles.catBtnActive]}
                onPress={() => setCategory(cat)}
              >
                <Text style={[styles.catBtnText, category === cat && { color: '#fff' }]}>{cat}</Text>
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
            <Icon name="information-outline" size={16} color={PRIMARY_COLOR_TINT} />
            <Text style={styles.costText}>1 iCash will be deducted upon submission.</Text>
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
              <Text style={styles.saveBtnText}>{isSaving ? "Submitting..." : "Submit Request"}</Text>
            </TouchableOpacity>
          </View>
        </View>
        </TouchableWithoutFeedback>
      </Pressable>
    </Modal>
  );
};
// 1. Static Header: Shows only the current page context
const DetailHeader = ({ onBack, title, searchQuery, setSearchQuery, placeholder }: HeaderProps) => (
  <View style={styles.headerContainer}>
    <View style={styles.headerTop}>
      <TouchableOpacity onPress={onBack} style={styles.backButton} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
        <Icon name="chevron-left" size={32} color={PRIMARY_COLOR} />
      </TouchableOpacity>   
      <View style={styles.titleContainer}>
        <Text style={styles.headerPageTitle}>{title}</Text>
        <Logo />
      </View>
      <View style={{ width: 40 }} /> 
    </View>
    <View style={styles.searchBarWrapper}>
      <View style={styles.searchBarInner}>
        <Icon name="magnify" size={20} color="#888" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder={placeholder || `Search ${title}...`}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
          clearButtonMode="while-editing" // iOS native clear button
        />
        {searchQuery.length > 0 && Platform.OS === 'android' && (
           <TouchableOpacity onPress={() => setSearchQuery('')}>
             <Icon name="close-circle" size={18} color="#999" />
           </TouchableOpacity>
        )}
      </View>
    </View>
  </View>
);
// 2. Course Contents View
const RenderContents = ({ course, userRole, searchQuery }: { course: Course; userRole: string; searchQuery: string; }) => {
  const insets = useSafeAreaInsets();
  const [contents, setContents] = useState<string[]>(course.courseContents || []);
  const [isDeleteModalVisible, setDeleteModalVisible] = useState(false);
  const [indexToDelete, setIndexToDelete] = useState<number | null>(null);
  const [isModalVisible, setModalVisible] = useState(false);
  const [currentText, setCurrentText] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const filteredData = contents.filter((item: any) => 
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.url.split('/').pop()?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const isTopicCompleted = (topicName: string) => {
    return course.Lectures?.some(
      (lecture) => 
        lecture.topicName.toLowerCase() === topicName.toLowerCase() && 
        (lecture.status === 'completed' || lecture.isTaught)
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
      const response = await fetch(`${baseUrl}users/lecturers/class/courses/updateContent/${course.courseId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`, 
        },
        body: JSON.stringify({ updatedContents: updatedList }),
      });
      const data = await response.json();
      if (!response.ok) {
        Toast.show({
          type: 'error',
          text1: 'Sync Error',
          text2: data.message || 'Could not save course changes, please retry.',
          position: 'bottom',
          bottomOffset: insets.bottom > 0 ? insets.bottom : 20
        });
      }
      setContents(updatedList);
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Sync Error',
        text2: error.message || 'Could not save changes to server',
        position: 'bottom',
        bottomOffset: insets.bottom > 0 ? insets.bottom : 20
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
        bottomOffset: insets.bottom > 0 ? insets.bottom : 20
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
      bottomOffset: insets.bottom > 0 ? insets.bottom : 20
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
        bottomOffset: insets.bottom > 0 ? insets.bottom : 20
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
        contentContainerStyle={[styles.listPadding, { paddingBottom: insets.bottom + 20 }]}
        ListHeaderComponent={
          <Text style={styles.sectionSubtitle}>
            {userRole === 'lecturer' ? 'Curriculum Management' : 'Syllabus Overview'}
          </Text>
        }
        renderItem={({ item, index }) => {
          const completed = isTopicCompleted(item);
          return(
          <View style={styles.contentRow}>
            <View style={styles.numberCircle}>
              <Text style={styles.numberText}>Wk {index + 1}</Text>
            </View>
            <Text style={[styles.topicText, completed && styles.completedTopicText]}>
              {item}
            </Text>
            
            {userRole === 'lecturer' && (
              <View style={styles.actionRow}>
                <TouchableOpacity onPress={() => openModal(index)} style={styles.iconBtn}>
                  <Icon name="pencil-outline" size={20} color={PRIMARY_COLOR_TINT} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => confirmDelete(index)} style={styles.iconBtn}>
                  <Icon name="trash-can-outline" size={20} color={PRIMARY_COLOR_TINT} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      }
        ListFooterComponent={
          userRole === 'lecturer' ? (
            <TouchableOpacity style={styles.addContentBtn} onPress={() => openModal()}>
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
            : "Your Instructor hasn't uploaded any course content for this course yet."
          }
        </Text>
      </View>
    }
      />

      <Modal visible={isModalVisible} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
          <TouchableWithoutFeedback>
            <View style={styles.centeredView}>
              <View style={styles.editModalContent}>
                <Text style={styles.modalTitle}>
                  {editingIndex !== null ? 'Edit Existing Topic' : 'Add New Topic'}
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
        <Pressable style={styles.modalOverlay} onPress={() => setDeleteModalVisible(false)}>
          <TouchableWithoutFeedback>
            <View style={styles.centeredView}>
              <View style={styles.deleteModalContent}>
                <View style={styles.warningIconCircle}>
                  <Icon name="alert-outline" size={40} color={PRIMARY_COLOR_TINT} />
                </View>
                <Text style={styles.modalTitle}>Delete Topic?</Text>
                  <Text style={styles.modalSubText}>
                    Are you sure you want to remove <Text style={{fontWeight: '700'}}>"{indexToDelete !== null ? contents[indexToDelete] : ''}"</Text> from <Text style={{fontWeight: '700'}}>{course.courseTitle}</Text>? This action cannot be undone.
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
const RenderMaterials = ({ course, lectures, userRole, searchQuery }: { course: Course; searchQuery: string; lectures: Lecture[]; userRole: string }) => {
  const insets = useSafeAreaInsets();
  const [isUploading, setIsUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const allResources = [
    ...(course.resources || []).map(res => ({ title: 'General Reference', url: res, type: 'Course' })),
    ...lectures.flatMap(l => (l.resources || []).map(res => ({ title: l.topicName, url: res, type: 'Lecture' })))
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
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
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
      Toast.show({ type: 'success', text1: 'Download Complete', text2: `Saved to Downloads` });
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Download Failed' });
    }
  };
  const handleAddMaterial = async () => {
    try {
      const pickerResult = await DocumentPicker.pickSingle({
        type: [DocumentPicker.types.pdf, DocumentPicker.types.images, DocumentPicker.types.docx],
      });

      setIsUploading(true);

      const formData = new FormData();
      formData.append('file', {
        uri: Platform.OS === 'android' ? pickerResult.uri : pickerResult.uri.replace('file://', ''),
        name: pickerResult.name || 'upload.pdf',
        type: pickerResult.type || 'application/pdf',
      } as any);

      const token = await AsyncStorage.getItem('accessToken');
      const response = await fetch(`${baseUrl}users/lecturers/class/courses/uploadMaterial/${course.courseId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        const newResources = data.resources.map((res: string) => ({ 
          title: 'Course Material', 
          url: res, 
          type: 'Course' 
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
    const response = await fetch(`${baseUrl}users/courses/${course.courseId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
   if (response.ok) {
  const updatedCourse: Course = await response.json();
  
  const newResources = [
    ...(updatedCourse.resources || []).map(res => ({ 
      title: 'General Material', 
      url: res, 
      type: 'Course' 
    })),
    // Accessing the nested Lectures array directly
    ...(updatedCourse.Lectures || []).flatMap(lecture => 
      (lecture.resources || []).map(res => ({ 
        title: lecture.topicName, 
        url: res, 
        type: 'Lecture' 
      }))
    )
  ];
  
  setLocalResources(newResources);
}
  } catch (error) {
    console.error("Refresh failed:", error);
  }
};
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCourseData(); 
    setRefreshing(false);
  };
  const filteredData = localResources.filter((item: any) => 
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.url.split('/').pop()?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <FlatList
      data={filteredData}
      keyExtractor={(_, i) => i.toString()}
      refreshing={refreshing}
      onRefresh={onRefresh}
      contentContainerStyle={[styles.listPadding, { paddingBottom: insets.bottom + 20 }]}
      ListHeaderComponent={
        <View style={styles.rowBetween}>
          <Text style={styles.sectionSubtitle}>Downloadable Course Materials</Text>
          {userRole === 'lecturer' && (
            <TouchableOpacity 
              style={styles.addButton}
              onPress={handleAddMaterial}
              disabled={isUploading}
            >
              <Text style={styles.addBtnText}>{isUploading ? 'Uploading...' : 'Add Material'}</Text>
            </TouchableOpacity>
          )}
        </View>
      }
      renderItem={({ item }) => {
        const fileName = item.url.split('/').pop() || 'document.pdf';
        return(
        <View style={styles.materialCard}>
          <Icon name="file-pdf-box" size={32} color={PRIMARY_COLOR} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.materialTitle}>{item.title}</Text>
            <Text style={styles.materialSub} numberOfLines={1}>{item.url.split('/').pop()}</Text>
          </View>
          <TouchableOpacity 
            style={styles.downloadCircle}
            onPress={() => handleDownload(item.url, fileName)}
          >
            <Icon name="download-outline" size={20} color={PRIMARY_COLOR_TINT} />
          </TouchableOpacity>
        </View>
      )}
    }
    ListEmptyComponent={
      <View style={styles.emptyContainer}>
        <Icon name="file-search-outline" size={60} color={PRIMARY_COLOR_TINT} />
        <Text style={styles.emptyTitle}>No Materials Found</Text>
        <Text style={styles.emptySubtitle}>
          {userRole === 'lecturer' 
            ? "You haven't uploaded any resources yet." 
            : "Your Instructor hasn't uploaded any materials for this course yet."
          }
        </Text>
      </View>
    }
    />
  );
};
// 4. Assignments View
const RenderAssignments = ({ course, userRole, searchQuery }: { course: Course; userRole: string, searchQuery: string; }) => {
  const user = useAppSelector(state => state.user);
  const insets = useSafeAreaInsets();
  const [isModalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [localAssignments, setLocalAssignments] = useState<Assignment[]>(course.assignments || []);
  const filteredData = localAssignments.filter((item: any) => 
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.url.split('/').pop()?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const isPastDue = (dueDate: string) => {
    return new Date() > new Date(dueDate);
  };
  const fetchAssignments = async () => {
  try {
    const token = await AsyncStorage.getItem('accessToken');
    const response = await fetch(`${baseUrl}users/courses/${course.courseId}/assignments`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      const data: Assignment[] = await response.json();
      setLocalAssignments(data); 
    }
  } catch (error) {
    console.error("Refresh assignments failed:", error);
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
      const response = await fetch(`${baseUrl}users/lecturers/class/courses/${course.courseId}/assignments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

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
      contentContainerStyle={[styles.listPadding, { paddingBottom: insets.bottom + 20 }]}
      ListHeaderComponent={
        <View style={styles.rowBetween}>
          <Text style={styles.sectionSubtitle}>Assignments & Tasks</Text>
          {userRole === 'lecturer' && (
            <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
              <Text style={styles.addBtnText}>Create</Text>
            </TouchableOpacity>
          )}
        </View>
      }
      renderItem={({ item }) => {
        const overdue = isPastDue(item.dueDate);
        const hasSubmitted = item.submissions?.some(s => s.studentId === user.uid);
        
        return (
          <View style={styles.assignmentCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.assignmentName}>{item.title}</Text>
              <Text style={styles.methodText}>Method: {item.submissionMethod}</Text>
              <Text style={[styles.dueDate, overdue && { color: '#ff4d4d' }]}>
                {overdue ? 'Past Due: ' : 'Due: '} {formatDate(item.dueDate)}
              </Text>
            </View>
            <View style={[
              styles.statusTag, 
              userRole === 'lecturer' ? styles.lecturerStatus : (hasSubmitted ? styles.successTag : styles.pendingTag)
            ]}>
              <Text style={styles.statusText}>
                {userRole === 'lecturer' 
                  ? `${item.submissions?.length || 0} Records` 
                    : hasSubmitted 
                  ? 'Turned In' 
                    : item.submissionMethod === 'Physical' 
                  ? 'Hand-in' 
                    : overdue ? 'Missed' : 'Submit'}
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
const RenderStudentExceptions = ({ exceptions, user, onAddPress, searchQuery, refreshing, 
  onRefresh }: StudentExceptionsProps) => {
  const limits = { free: 3, pro: 5, premium: 7 };
  const currentPlan = user.plan || 'free';
  const planLimit = limits[currentPlan];
  const filteredData = exceptions.filter(item => {
    const title = item.courseInfo?.courseTitle?.toLowerCase() ?? '';
    const code = item.courseInfo?.courseCode?.toLowerCase() ?? '';
    const category = item.reasonCategory?.toLowerCase() ?? '';
    const query = searchQuery.toLowerCase();
    return title.includes(query) || code.includes(query) || category.includes(query);
  });
  const usedThisMonth = exceptions.filter(e => {
    const date = new Date(e.createdAt);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }).length;
  const hasExceededLimit = usedThisMonth >= planLimit;
  const hasInsufficientPoints = (user.pointsBalance || 0) < 1.0;
  const isDisabled = hasExceededLimit || hasInsufficientPoints;
  // Determine the reason for the disabled state
  const getDisabledReason = () => {
    if (hasExceededLimit) return `Monthly ${currentPlan} tier limit reached (${planLimit}/${planLimit})`;
    if (hasInsufficientPoints) return "Insufficient iCash (1 pts required)";
    return "";
  };

  return (
    <FlatList
      data={filteredData}
      refreshing={refreshing}
      onRefresh={onRefresh}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listPadding}
      ListHeaderComponent={
        <View style={styles.headerWrapper}>
          <View style={styles.tierInfoCard}>
            <View style={styles.usageHeader}>
              <Text style={styles.tierLabel}>{currentPlan.toUpperCase()} plan</Text>
              <Text style={styles.usageText}>{usedThisMonth} / {planLimit} used</Text>
            </View>
            <Text style={styles.resetText}>Resets on the 1st of next month</Text>
          </View>
          {!isDisabled && (
            <TouchableOpacity 
              style={styles.addBtn} 
              onPress={onAddPress}
            >
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
            <Text style={styles.dateText2}>{new Date(item.date).toLocaleDateString()}</Text>
          </View>
          <View 
            style={
              styles.statusBadge
            }
          >
            <Icon 
              name={
                item.status === 'approved' ? "check-decagram" : 
                item.status === 'rejected' ? "close-octagon" : "clock-fast"
              } 
              size={14} 
              color={PRIMARY_COLOR_TINT} 
              style={{ marginRight: 4 }}
            />
            <Text 
              style={
                styles.statusLabel
              }
            >
              {item.status}
            </Text>
          </View>
        </View>
      )}
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Icon name="file-search-outline" size={60} color={PRIMARY_COLOR_TINT} />
          <Text style={styles.emptyTitle}>No Exceptions Found</Text>
        </View>
      }
    />
  );
};
const RenderLecturerExceptionsManage = ({ exceptions, onUpdateStatus, searchQuery, refreshing, 
  onRefresh }: LecturerManageProps) => {
  const filteredData = exceptions.filter(item => {
    const title = item.courseInfo?.courseTitle?.toLowerCase() ?? '';
    const code = item.courseInfo?.courseCode?.toLowerCase() ?? '';
    const category = item.reasonCategory?.toLowerCase() ?? '';
    const query = searchQuery.toLowerCase();
    return title.includes(query) || code.includes(query) || category.includes(query);
  });
  return(
  <FlatList
    data={filteredData}
    refreshing={refreshing}
    onRefresh={onRefresh}
    keyExtractor={(item) => item.id}
    renderItem={({ item }) => (
      <View style={styles.manageCard}>
        <View style={styles.rowBetween}>
          <View>
            <Text style={styles.studentName}>{item.studentName || 'Unknown Student'}</Text>
            <Text style={styles.matricText}>{item.matricNumber}</Text>
          </View>
          {item.status === 'pending' && <View style={styles.pendingIndicator} />}
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
          <View 
            style={
              styles.finalStatusContainer
            }
          >
            <Icon 
              name={item.status === 'approved' ? "check-circle" : "close-circle"} 
              size={20} 
              color={PRIMARY_COLOR_TINT} 
              style={{ marginRight: 8 }}
            />
            <Text style={
              styles.finalStatusText
            }>
              {item.status === 'approved' ? 'Approved' : 'Rejected'}
            </Text>
          </View>
        )}
      </View>
    )}
    ListEmptyComponent={
      <View style={{ alignItems: 'center', marginTop: 50 }}>
        <Icon name="check-decagram-outline" size={60} color={PRIMARY_COLOR_TINT} />
        <Text style={{ color: PRIMARY_COLOR_TINT, marginTop: 10 }}>No pending exceptions.</Text>
      </View>
    }
  />
)};
export const CourseSubPage = ({ route, navigation }: any) => {
  const user = useAppSelector(state => state.user);
  const { title, course, lectures, userRole, exceptions: initialExceptions } = route.params;
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false); // Added missing loading state
  const [localExceptions, setLocalExceptions] = useState<CourseException[]>(initialExceptions || []); // Manage local state

  // --- LECTURER: Handle Approval/Rejection ---
  const handleUpdateStatus = async (id: string, status: 'approved' | 'rejected') => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('accessToken');
      const response = await fetch(`${baseUrl}users/lecturers/class/exceptions/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        setLocalExceptions(prev => prev.map(ex => 
          ex.id === id ? { ...ex, status } : ex
        ));
        Toast.show({ type: 'success', text1: `Exception ${status}` });
      }
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Failed to update status' });
    } finally {
      setLoading(false);
    }
  };

  // --- STUDENT: Submit New Exception ---
  const handleSaveException = async (newException: Partial<CourseException>) => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('accessToken');
      const response = await fetch(`${baseUrl}users/student/class/exceptions/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newException),
      });

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
  const fetchExceptions = useCallback(async () => {
  setLoading(true);
  try {
    const token = await AsyncStorage.getItem('accessToken');
    
    const response = await fetch(`${baseUrl}users/exceptions?courseId=${course.courseId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    const result: { success: boolean; exceptions: CourseException[] } = await response.json();
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

// Call it when the component mounts
useEffect(() => {
  if (title === 'Exceptions') {
    fetchExceptions();
  }
}, [title, fetchExceptions]);

  const goBack = () => navigation.goBack();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <DetailHeader 
        title={title} 
        onBack={goBack} 
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        placeholder={`Search ${title.toLowerCase()}...`}
      />
      
      <View style={styles.body}>
        {title === 'Course Contents' && (
          <RenderContents course={course} userRole={userRole} searchQuery={searchQuery} />
        )}
        {title === 'Course Materials' && (
          <RenderMaterials course={course} lectures={lectures} userRole={userRole} searchQuery={searchQuery} />
        )}
        {title === 'Assignments' && (
          <RenderAssignments course={course} userRole={userRole} searchQuery={searchQuery} />
        )}
        {title === 'Exceptions' && (
          userRole === 'lecturer' ? (
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
          )
        )}
      </View>

      <AddExceptionModal 
        visible={isModalVisible} 
        onClose={() => setModalVisible(false)}
        course={course}
        user={user}
        onSave={handleSaveException} 
        isSaving={loading} 
      />
      
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
    paddingBottom: 5 
  },
  headerTop: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 15, 
    paddingVertical: 12 
  },
  titleContainer: { flex: 1, alignItems: 'center' },
  headerPageTitle: { 
    fontSize: 18, 
    fontWeight: '700', 
    color: '#333' 
  },
  backButton: { 
    width: 40, 
    height: 40, 
    justifyContent: 'center' 
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
    marginBottom: 15
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
    marginBottom: 12 
  },
  numberCircle: { 
    width: 26, 
    height: 26, 
    borderRadius: 13, 
    backgroundColor: PRIMARY_COLOR, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 12 
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
    borderColor: '#eee' 
  },
  materialTitle: { fontSize: 15, fontWeight: '600', color: '#333' },
  materialSub: { fontSize: 12, color: '#999', marginTop: 2 },
  downloadCircle: { 
    width: 36, 
    height: 36, 
    borderRadius: 18, 
    backgroundColor: '#f5f5f5', 
    justifyContent: 'center', 
    alignItems: 'center' 
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
    elevation: 2
  },
  assignmentName: { fontSize: 16, fontWeight: '700', color: '#333' },
  dueDate: { fontSize: 12, color: PRIMARY_COLOR, marginTop: 5, fontWeight: '500' },
  
  statusTag: { 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 8, 
    backgroundColor: '#FFF4F0' 
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
    borderRadius: 10 
  },
  addBtnText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
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
    alignItems: 'center'
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
    shadowColor: "#000",
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
    borderWidth: .8,
    borderColor: PRIMARY_COLOR_TINT,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectBtn: {
    flex: 1,
    borderWidth: .8,
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
    backgroundColor: "#fff",
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
    color: PRIMARY_COLOR_TINT
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
    backgroundColor: '#f7fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 20,
    overflow: 'hidden', // Required for border radius to show on Android
    justifyContent: 'center',
  },
});