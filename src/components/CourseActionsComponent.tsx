import React, {useState} from 'react';
import { View,TextInput, Text, FlatList, StyleSheet, TouchableOpacity, TouchableWithoutFeedback, Pressable, Modal } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Course, Lecture } from '../types/firebase';
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

// Using a type that matches your page names
type PageType = 'Course Contents' | 'Course Materials' | 'Assignments';

interface HeaderProps {
  onBack: () => void;
  title: PageType;
}
interface CreateAssignmentProps {
  visible: boolean;
  onClose: () => void;
  onSave: (formData: FormData) => void;
  isSaving: boolean;
}
const CreateAssignmentModal = ({ visible, onClose, onSave, isSaving }: CreateAssignmentProps) => {
  const [title, setTitle] = useState('');
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
// 1. Static Header: Shows only the current page context
const DetailHeader = ({ onBack, title }: HeaderProps) => (
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
  </View>
);

// 2. Course Contents View
const RenderContents = ({ course, userRole }: { course: Course; userRole: string }) => {
  const insets = useSafeAreaInsets();
  const [contents, setContents] = useState<string[]>(course.courseContents || []);
  const [isDeleteModalVisible, setDeleteModalVisible] = useState(false);
  const [indexToDelete, setIndexToDelete] = useState<number | null>(null);
  const [isModalVisible, setModalVisible] = useState(false);
  const [currentText, setCurrentText] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
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
        data={contents}
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
              <Text style={styles.numberText}>{index + 1}</Text>
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
const RenderMaterials = ({ course, lectures, userRole }: { course: Course; lectures: Lecture[]; userRole: string }) => {
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

  return (
    <FlatList
      data={localResources}
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
        <Icon name="file-search-outline" size={60} color="#ccc" />
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
const RenderAssignments = ({ course, userRole }: { course: Course; userRole: string }) => {
  const insets = useSafeAreaInsets();
  const [isModalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const isPastDue = (dueDate: string) => {
    return new Date() > new Date(dueDate);
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

  return (
    <FlatList
      data={course.assignments || []}
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
        
        return (
          <View style={[styles.assignmentCard, overdue && styles.overdueCard]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.assignmentName}>{item.title}</Text>
              <Text style={[styles.dueDate, overdue && { color: '#ff4d4d' }]}>
                {overdue ? 'Past Due: ' : 'Due: '} {formatDate(item.dueDate)}
              </Text>
            </View>

            <TouchableOpacity 
              style={[
                styles.statusTag, 
                userRole === 'lecturer' ? styles.lecturerStatus : (overdue ? styles.overdueTag : styles.pendingTag)
              ]}
            >
              <Text style={styles.statusText}>
                {userRole === 'lecturer' 
                  ? `${item.submissions?.length || 0} Submissions` 
                  : overdue ? 'Missed' : 'Submit'}
              </Text>
            </TouchableOpacity>
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

export const CourseSubPage = ({ route, navigation }: any) => {
  const { title, course, lectures, userRole } = route.params;
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <DetailHeader onBack={() => navigation.goBack()} title={title} />
      
      <View style={styles.body}>
        {title === 'Course Contents' && <RenderContents course={course} userRole={userRole} />}
        {title === 'Course Materials' && <RenderMaterials course={course} lectures={lectures} userRole={userRole} />}
        {title === 'Assignments' && <RenderAssignments course={course} userRole={userRole} />}
      </View>
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
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
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
    color: '#333',
    marginTop: 15,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  overdueCard: {
    borderColor: '#ffccd2',
    backgroundColor: '#fffdfd',
  },
  overdueTag: {
    backgroundColor: '#ff4d4d',
  },
  pendingTag: {
    backgroundColor: PRIMARY_COLOR,
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
    color: '#333',
    fontWeight: '500',
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
  }
});