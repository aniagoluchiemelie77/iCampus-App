import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Button,
  FlatList,
} from 'react-native';
import { Avatar, IconButton } from 'react-native-paper';
import { PRIMARY_COLOR } from './Classroomcomponent';

export const LecturerLiveClassSession = ({
  lecture,
  exceptions,
  course,
  socket,
}: any) => {
  const [activeStudents, setActiveStudents] = useState([]);
  const grantMic = (studentUid: string) => {
    // 1. Tell the server to silence everyone else and enable this student
    socket.emit('grant_mic_permission', {
      lectureId: lecture.id,
      studentUid,
    });
  };

  const muteAll = () => {
    socket.emit('revoke_all_mics', { lectureId: lecture.id });
  };

  return (
    <View style={styles.container}>
      <LecturerStreamControls url={lecture.location} />
      <View style={styles.adminControls}>
        <Text style={styles.sectionLabel}>Active Wavers</Text>
        <ScrollView horizontal>
          {wavers.map(waver => (
            <TouchableOpacity
              key={waver.uid}
              onPress={() => grantMic(waver.uid)}
              style={styles.waverCard}
            >
              <Avatar.Image size={40} source={{ uri: waver.profilePic }} />
              <IconButton
                icon="microphone-plus"
                size={20}
                iconColor={PRIMARY_COLOR}
              />
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Button mode="contained" onPress={muteAll} style={styles.muteAllBtn}>
          Reset All Mics
        </Button>
      </View>

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
