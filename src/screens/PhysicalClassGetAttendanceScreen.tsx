import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, SectionList, TouchableOpacity, Alert, Linking, Platform} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import NativeProperty from 'react-native-ble-peripheral';
import { useAppSelector } from '../components/hooks';
import { io, Socket } from 'socket.io-client';
import { baseUrl } from '../components/HomeScreenComponents';
import { SERVICE_UUID } from '@env';
import {PRIMARY_COLOR_TINT, PRIMARY_COLOR} from '../components/Classroomcomponent';
import {LogoBigger} from 'assets/images/Logo';
import { Course, CourseException, Lecture } from 'types/firebase';
import BleManager from 'react-native-ble-manager';
import { requestMultiple, PERMISSIONS } from 'react-native-permissions';

type AttendanceStatus = 'idle' | 'fetching' | 'completed';
interface PresentStudent {
  uid: string;
  firstname: string;
  lastname: string;
  matricNumber: string;
  department: string;
  timestamp: string;
  isException?: boolean;
}
interface PhysicalAttendanceManagerProps {
  lecture: Lecture;
  course: Course;
  exceptions: CourseException[];
}

interface GroupedSection {
  title: string;
  data: any[];
}

export const PhysicalAttendanceManager: React.FC<PhysicalAttendanceManagerProps> = ({ 
  lecture, 
  course, 
  exceptions 
}) => {
  const user = useAppSelector(state => state.user);
  const socketRef = useRef<Socket | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [presentStudents, setPresentStudents] = useState<PresentStudent[]>([]);
  const [secondsLeft, setSecondsLeft] = useState(300); // 5 Minutes default
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [status, setStatus] = useState<AttendanceStatus>('idle');
  const startAttendanceBroadcast = async (lectureId: string) => {
  try {
    await NativeProperty.addService(SERVICE_UUID, true);
    await NativeProperty.startSales('iCampus-' + lectureId); 
    console.log("Beacon Started");
  } catch (error) {
    console.error("Bluetooth start failed", error);
  }
};
const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };
const handleStartFetching = async () => {
    setStatus('fetching');
    setSecondsLeft(300);
    socketRef.current?.emit('start_attendance_session', { lectureId: lecture.id, lecturerId: user.uid });
    try {
      await NativeProperty.addService(SERVICE_UUID, true);
      await NativeProperty.startSales('iCampus-' + lecture.id);
    } catch (e) { console.error(e); }
    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
  };

  const handleStopFetching = async () => {
    setIsFetching(false);
    if (timerRef.current) clearInterval(timerRef.current);
    await NativeProperty.stopSales();
    socketRef.current?.emit('end_attendance_session', { lectureId: lecture.id });
    setStatus('completed');
  };

  const handleDownload = () => {
    console.log("Downloading attendance list...");
  };
  const checkBluetoothAndStart = async () => {
  try {
    await BleManager.checkState(); 
    handleStartFetching();
  } catch (error) {
    Alert.alert(
      "Bluetooth Required",
      "iCampus needs Bluetooth to broadcast the attendance signal to students nearby.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Turn On", 
          onPress: () => {
            if (Platform.OS === 'android') {
              Linking.sendIntent('android.settings.BLUETOOTH_SETTINGS');
            } else {
              Linking.openURL('App-Prefs:Bluetooth');
            }
          } 
        }
      ]
    );
  }
};


useEffect(() => {
    if (!user?.uid) return;
    socketRef.current = io(baseUrl, { transports: ['websocket'], query: { userId: user.uid } });
    
    socketRef.current.on('student_checked_in', (newStudent: PresentStudent) => {
      setPresentStudents(prev => prev.find(s => s.uid === newStudent.uid) ? prev : [...prev, newStudent]);
    });

    return () => { socketRef.current?.disconnect(); };
  }, [user.uid]);
  useEffect(() => {
  if (Platform.OS === 'android' && Platform.Version >= 31) {
    requestMultiple([
      PERMISSIONS.ANDROID.BLUETOOTH_ADVERTISE,
      PERMISSIONS.ANDROID.BLUETOOTH_CONNECT,
      PERMISSIONS.ANDROID.BLUETOOTH_SCAN,
    ]).then((statuses) => {
      console.log('Permissions statuses:', statuses);
    });
  }
}, []);

const getGroupedData = (): GroupedSection[] => {
    const allDepartments = new Set([
      ...presentStudents.map(s => s.department),
      ...exceptions.map(e => e.department)
    ]);

    return Array.from(allDepartments).map(dept => ({
      title: dept || 'General',
      data: [
        ...presentStudents.filter(s => s.department === dept),
        ...exceptions
          .filter(e => e.department === dept)
          .map(e => ({
            uid: e.studentId,
            firstname: e.studentInfo?.fullname?.split(' ')[0] ?? 'Unknown',
            lastname: e.studentInfo?.fullname?.split(' ')[1] ?? 'Student',
            matricNumber: e.studentInfo.matricNumber,
            isException: true,
            reasonCategory: e.reasonCategory
          }))
      ]
    }));
  };
  const groupedData = getGroupedData(); 
  const idle = status === 'idle';
  const fetching = status === 'fetching';
  const completed = status === 'completed';
    return (
        <View style={styles.container}>
            <LogoBigger />
            {idle && (
                <>
                    <Text style={styles.courseTitle}>{course.courseCode}: {course.courseTitle}</Text>
                    <Text style={styles.topicName}>{lecture.topicName}</Text>
                    <Text style={styles.timestamp}>{new Date().toLocaleString()}</Text>
                    <TouchableOpacity style={styles.fetchBtn} onPress={() => {
                        setIsFetching(true)
                        startAttendanceBroadcast(lecture.id)
                        checkBluetoothAndStart();
                    }}>
                        <Text style={styles.fetchBtnText}>Take Attendance</Text>
                    </TouchableOpacity>
                </>
            )}     
           {isFetching && fetching && (
                <View style={styles.fetchingContainer}>
                    {/* Visual Pulse Animation Area */}
                    <View style={styles.pulseWrapper}>
                        <View style={styles.timerCircle}>
                            <Text style={styles.timerNumber}>{formatTimer(secondsLeft)}</Text>
                            <Text style={styles.timerLabel}>Scanning...</Text>
                        </View>
                        <ActivityIndicator 
                            size={150} 
                            color={PRIMARY_COLOR} 
                            style={styles.absoluteLoader} 
                        />
                    </View>
                    <Text style={styles.statsCount}>
                        {presentStudents.length} Students Detected
                    </Text>
                    <TouchableOpacity 
                        style={styles.fetchBtn}
                        onPress={handleStopFetching}
                    >
                        <Text style={styles.fetchBtnText}>End & Show Final List</Text>
                    </TouchableOpacity>
                </View>
            )}
            {!isFetching && completed && (
                <>
                <SectionList
                    sections={groupedData}
                    keyExtractor={(item) => item.studentId || item.uid}
                    renderSectionHeader={({ section: { title } }) => (
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>{title}</Text>
                        </View>
                    )}
                   renderItem={({ item }) => (
                        <View style={styles.studentRow}>
                            <View>
                                <Text style={styles.studentName}>{item.firstname} {item.lastname}</Text>
                                <Text style={styles.matricNumber}>{item.matricNumber || item.studentInfo?.matricNumber}</Text>
                            </View>
                            {item.isException ? (
                                <View style={styles.exceptionBadge}>
                                    <Text style={styles.exceptionText}>{item.reasonCategory}</Text>
                                </View>
                            ) : (
                                <Icon name="check-decagram" size={24} color={PRIMARY_COLOR} />
                            )}
                        </View>
                    )}
                    ListEmptyComponent={
                        <View style={styles.emptyCommentsContainer}>
                            <Icon
                                name="comment-question-outline"
                                size={40}
                                color={PRIMARY_COLOR_TINT}
                            />
                            <Text style={styles.emptyCommentsText}>No Student found</Text>
                            <Text style={styles.emptyCommentsSubtext}>
                               No student within proximity, please retry.
                            </Text>
                        </View>
                    }
                />
                <TouchableOpacity 
                    style={styles.fetchBtn} 
                    onPress={() => {
                        console.log("Exporting...");
                        handleDownload()
                    }}
                >
                    <Icon name="download" size={20} color="#fff" />
                    <Text style={styles.fetchBtnText}>Download</Text>
                </TouchableOpacity>
                </>
            )}
        </View>
    );
};
const styles = StyleSheet.create({
    container:{
        flex: 1,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20
    },
  fetchingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 250,
  },
  timerCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  timerNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: PRIMARY_COLOR,
  },
  timerLabel: {
    fontSize: 12,
    color: PRIMARY_COLOR,
    opacity: 0.8,
  },
  absoluteLoader: {
    position: 'absolute',
    opacity: 0.3,
  },
  statsCount: {
    fontSize: 20,
    fontWeight: '600',
    marginVertical: 15,
    color: PRIMARY_COLOR_TINT,
  },
  miniList: {
    height: 60,
    marginTop: 10,
  },
  miniStudentName: {
    color: '#666',
    fontSize: 14,
    fontStyle: 'italic',
  },
  courseTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    color: PRIMARY_COLOR,
    marginVertical: 10,
    textAlign: 'center',
    width: '100%'
  },
  topicName: {
    fontSize: 15,
    color: PRIMARY_COLOR,
    marginBottom: 10,
    textAlign: 'center',
    width: '100%'
  },
  timestamp: {
    fontSize: 13,
    color: PRIMARY_COLOR_TINT,
    marginBottom: 10,
    width: '100%'
  },
  fetchBtn: {
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center'
  },
  fetchBtnText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: 'bold'
  },
  sectionHeader:{
    marginVertical: 10,
    width: '100%'
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: PRIMARY_COLOR,
    textTransform: 'uppercase'
  },
  studentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 5,
    borderBottomWidth: 1,
    borderBottomColor: PRIMARY_COLOR_TINT
  },
  studentName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333'
  },
  matricNumber: {
    fontSize: 13,
    color: '#888',
    marginTop: 3
  },
  exceptionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  exceptionText: {
    fontSize: 11,
    color: PRIMARY_COLOR_TINT,
    fontWeight: 'bold'
  },
  emptyCommentsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  emptyCommentsText: {
    fontSize: 16,
    fontWeight: '600',
    color: PRIMARY_COLOR_TINT,
    marginTop: 10,
  },
  emptyCommentsSubtext: {
    fontSize: 13,
    color: PRIMARY_COLOR_TINT,
    marginTop: 5,
  },
});