export const LecturerLiveClassSession = ({ lecture, exceptions, course }: any) => {
  const [activeStudents, setActiveStudents] = useState([]);

  return (
    <View style={styles.container}>
      <LecturerStreamControls url={lecture.location} />
      
      <SectionTitle title="Live Attendance" />
      <FlatList 
        data={course.studentsEnrolled}
        renderItem={({ item }) => (
          <StudentLiveStatusCard 
            studentId={item} 
            exception={exceptions.find(e => e.studentId === item)} 
          />
        )}
      />

      {/* Quick Access to the Exception Manager you built earlier */}
      <TouchableOpacity onPress={() => navigateToExceptionManage()}>
        <Text>Review Pending Excuses</Text>
      </TouchableOpacity>
    </View>
  );
};