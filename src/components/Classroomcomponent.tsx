import React, { useState } from 'react'; // Added useState
import { 
  View, Text, StyleSheet, TouchableOpacity, ScrollView, 
  Dimensions, Image, TextInput // Added Image and TextInput
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAppSelector } from './hooks';

const { width } = Dimensions.get('window');

// --- HELPER COMPONENTS ---

const ClassroomHeader = ({ user }: { user: any }) => (
  <View style={styles.headerWrapper}>
    <TouchableOpacity onPress={() => null}>
      <Image 
        source={{ uri: user?.profilePic?.[0] || 'https://via.placeholder.com/40' }} 
        style={styles.profileImg} 
      />
    </TouchableOpacity>

    <View style={styles.searchContainer}>
      <Icon name="search-outline" size={18} color="#666" style={styles.searchIcon} />
      <TextInput 
        placeholder="Search courses..." 
        style={styles.searchInput}
        placeholderTextColor="#999"
      />
    </View>

    <View style={styles.roleBadge}>
      <Text style={styles.roleText}>{user?.role?.toUpperCase() || 'USER'}</Text>
    </View>
  </View>
);

const GridItem = ({ icon, label, onPress }: any) => (
  <TouchableOpacity style={styles.gridItem} onPress={onPress}>
    <MaterialIcons name={icon} size={32} color="#032820" />
    <Text style={styles.gridLabel}>{label}</Text>
  </TouchableOpacity>
);
const LecturerGrid = ({ courseId }: { courseId: string }) => {
  const openLectureModal = (id: string) => console.log("Opening modal for", id);

  return (
    <View style={styles.gridContainer}>
      {/* Row 1 */}
      <View style={styles.row}>
        <GridItem 
          icon="event" 
          label="Set Lecture" 
          onPress={() => openLectureModal(courseId)} 
        />
        <GridItem 
          icon="people" 
          label="Attendance" 
          onPress={() => console.log("Attendance")} 
        />
      </View>

      {/* Row 2 */}
      <View style={styles.row}>
        <GridItem 
          icon="upload-file" 
          label="Materials" 
          onPress={() => console.log("Upload")} 
        />
        <GridItem 
          icon="analytics" 
          label="Stats" 
          onPress={() => console.log("Stats")} 
        />
      </View>
    </View>
  );
};

const StudentGrid = ({ courseId }: { courseId: string }) => {
  return (
    <View style={styles.gridContainer}>
      <View style={styles.row}>
        <GridItem 
          icon="book" 
          label="Materials" 
          onPress={() => console.log(`Fetching materials for course: ${courseId}`)} 
        />
        <GridItem 
          icon="assignment" 
          label="Assignments" 
          onPress={() => console.log(`Viewing assignments for: ${courseId}`)} 
        />
      </View>
      <View style={styles.row}>
        <GridItem 
          icon="insights" 
          label="My Grades" 
          onPress={() => console.log(`Checking grades for: ${courseId}`)} 
        />
        <GridItem 
          icon="forum" 
          label="Class Chat" 
          onPress={() => console.log(`Opening chat for: ${courseId}`)} 
        />
      </View>
    </View>
  );
};
// --- MAIN SCREEN ---

export const ClassroomScreenComponent = ({ userRole }: Props) => {
  const user = useAppSelector(state => state.user); 
  const [courses, setCourses] = useState([]);

  // Handler Placeholders
  const handleFormUpload = () => console.log("Student Uploading...");
  const handleAddCourse = () => console.log("Lecturer Adding...");

  // 1. Safety Check: If an 'otherUser' somehow gets here
  if (
    userRole !== 'student' &&
    userRole !== 'lecturer' &&
    userRole !== 'otherUser'
  ) {
    return null;
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
      {/* Header stays visible always */}
      <ClassroomHeader user={user} />

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {courses.length === 0 ? (
          /* EMPTY STATE CONTENT */
          <View style={styles.emptyStateContainer}>
            <Text style={styles.setupTitle}>
              {userRole === 'student' ? 'Course Registration' : 'Lecturer Dashboard'}
            </Text>
            
            <TouchableOpacity 
              onPress={userRole === 'student' ? handleFormUpload : handleAddCourse}
              style={styles.actionBtn}
            >
              <Text style={styles.btnText}>
                {userRole === 'student' ? 'Upload Registration Form' : 'Add New Course +'}
              </Text>
            </TouchableOpacity>

            <Text style={styles.sectionLabel}>Popular courses for you</Text>
            {/* You can map suggested courses here */}
          </View>
        ) : (
          /* ACTIVE STATE CONTENT */
          <View style={{ marginTop: 20 }}>
  {courses.map((course: any) => (
    <View key={course._id} style={{ marginBottom: 25 }}>
      {/* 1. The Main Course Card */}
      <View style={styles.lectureCard}>
        <Text style={styles.courseName}>{course.name || "Biology 201"}</Text>
        <Text style={styles.lecturerDetail}>
          {course.lecturer || "Dr. Smith"} • {course.time || "8:00 AM - 10:00 AM"}
        </Text>

        <View style={styles.cardActionRow}>
          <View style={styles.statsCircle}>
            <Text style={styles.statsNumber}>{course.totalStudents || 0}</Text>
          </View>
          
          <TouchableOpacity style={styles.joinButton}>
            <Text style={styles.joinButtonText}>
              {userRole === 'lecturer' ? 'Start Live' : 'Join Lecture'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 2. The Functional Grid (Fixes the "Unused" warning) */}
      {userRole === 'lecturer' ? (
        <LecturerGrid courseId={course._id} />
      ) : (
        <StudentGrid courseId={course._id} />
      )}
    </View>
  ))}
</View>
        )}
      </ScrollView>
    </View>
  );
};


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA', paddingHorizontal: 20 },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'baseline',
    marginTop: 40,
    marginBottom: 20 
  },
  title: { fontSize: 28, fontWeight: '800', color: '#000' },
  subLabel: { fontSize: 16, color: '#666' },
  
  lectureCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    elevation: 4, // Shadow for Android
    shadowColor: '#000', // Shadow for iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  courseName: { fontSize: 22, fontWeight: '700', color: '#000' },
  lecturerDetail: { fontSize: 14, color: '#999', marginTop: 5 },
  
  cardActionRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginTop: 20,
    justifyContent: 'space-between' 
  },
  statsCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: '#fb966b', // The orange ring
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsNumber: { fontSize: 16, fontWeight: 'bold' },
  joinButton: {
    backgroundColor: '#f54b02', // Brand Orange
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 12,
    flex: 1,
    marginLeft: 15,
    alignItems: 'center',
  },
  joinButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },

  gridContainer: { marginTop: 25 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  gridItem: {
    backgroundColor: '#FFF',
    width: (width - 55) / 2, // Sizing based on screen width minus padding/gaps
    height: 120,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  gridLabel: { marginTop: 10, fontSize: 14, fontWeight: '600', color: '#333' },
  sectionHeader: { fontSize: 18, fontWeight: 'bold', marginTop: 20, marginBottom: 10 },
  headerWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingTop: 50, // Adjust for status bar
    paddingBottom: 15,
    backgroundColor: '#fff',
  },
  profileImg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eee',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f2f5',
    borderRadius: 10,
    marginHorizontal: 12,
    paddingHorizontal: 10,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#000',
  },
  roleBadge: {
    backgroundColor: '#032820', // Darker theme color
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  roleText: {
    color: '#fb966b', // Your accent orange color
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  emptyStateContainer: {
    alignItems: 'center',
    marginTop: 40,
  },
  setupTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#032820',
    marginBottom: 10,
  },
  actionBtn: {
    backgroundColor: '#fb966b',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 12,
    marginVertical: 20,
    width: '100%',
    alignItems: 'center',
  },
  btnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  sectionLabel: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 30,
    alignSelf: 'flex-start',
    color: '#333',
  },
});