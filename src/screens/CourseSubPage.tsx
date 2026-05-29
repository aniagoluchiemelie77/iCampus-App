import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  Lecture,
  CourseException,
  CreateLecturePayload,
  CreateTestPayload,
} from '../types/firebase';
import Clipboard from '@react-native-clipboard/clipboard';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  PRIMARY_COLOR,
  PRIMARY_COLOR_TINT,
} from '../components/Classroomcomponent';
import Toast from 'react-native-toast-message';
import { baseUrl } from '../components/HomeScreenComponents';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppSelector } from '../components/hooks';
import {
  RenderViewLectureSchedule,
  DetailHeader,
  AddExceptionModal,
  RenderStudentTest,
  RenderContents,
  RenderMaterials,
  RenderAssignments,
  RenderStudentExceptions,
  RenderLecturerExceptionsManage,
  RenderScheduleLecture,
  RenderLecturerTestManage,
  CourseActionStyles,
  LecturerLectureScheduleView,
} from '../components/CourseActionsComponent';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import toastConfig from '../components/ToastConfig';
import {
  getCourseDetails,
  getStudentLecturesTimeline,
  checkAssessmentStatus,
} from '../api/localGetApis';
import { submitLectureException } from '../api/localPostApis';
import { useDispatch } from 'react-redux';
import { setUser } from '../components/UserSlice';

const EmptyState = ({ message }: { message: string }) => (
  <View style={CourseActionStyles.emptyDivContainer}>
    <MaterialCommunityIcons
      name="clipboard-text-off-outline"
      size={60}
      color={PRIMARY_COLOR_TINT}
    />
    <Text style={CourseActionStyles.emptyDivContainerText}>{message}</Text>
  </View>
);
export const CourseSubPage = ({ route, navigation }: any) => {
  const user = useAppSelector(state => state.user);
  const dispatch = useDispatch();
  const {
    title,
    course,
    lectures,
    userRole,
    exceptions: initialExceptions,
  } = route.params;

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localExceptions, setLocalExceptions] = useState<CourseException[]>(
    initialExceptions || [],
  );
  const [currentCourse, setCurrentCourse] = useState(course);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [scheduledLecture, setScheduledLecture] = useState<Lecture | null>(
    null,
  );
  const [tests, setTests] = useState<CreateTestPayload[]>([]);
  const [activeTest, setActiveTest] = useState<CreateTestPayload | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [allLectures, setAllLectures] = useState<Lecture[]>([]);

  // --- STUDENT: Submit New Exception ---
  const handleSaveException = async (
    newException: Partial<CourseException>,
  ) => {
    setLoading(true);
    try {
      const result = await submitLectureException(newException);
      if (result.success && result.exception) {
        Toast.show({
          type: 'success',
          text1: 'Exception submitted successfully',
          position: 'bottom',
        });
        setLocalExceptions([result.exception, ...localExceptions]);
        dispatch(
          setUser({
            ...user,
            pointsBalance:
              result.newIcashBalance !== null &&
              result.newIcashBalance !== undefined
                ? Number(result.newIcashBalance)
                : user.pointsBalance,
          }),
        );
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
  const fetchTimeline = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getStudentLecturesTimeline();
      if (result.success && result.data) {
        setAllLectures(result.data);
      } else {
        Toast.show({
          type: 'error',
          text1: 'Timeline Error',
          text2: result.message || 'Could not load upcoming schedule.',
          position: 'bottom',
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);
  const handleLecturePress = (item: Lecture) => {
    if (item.lectureType === 'Online') {
      navigation.navigate('LiveSessionScreen', {
        lectureId: item.id,
        courseId: item.courseId,
        topic: item.topicName,
        streamUrl: item.location,
      });
    } else if (item.lectureType === 'Recorded') {
      navigation.navigate('VideoPlayerScreen', {
        url: item.videoUrl,
        title: item.topicName,
      });
    }
  };
  const fetchStudentTest = useCallback(
    async (assessmentId: string) => {
      setLoading(true);
      try {
        const result = await checkAssessmentStatus(
          course.courseId,
          assessmentId,
        );
        if (result.success) {
          if (result.hasSubmitted) {
            setHasSubmitted(true);
          } else {
            setActiveTest(result.test!);
          }
        } else {
          Toast.show({
            type: 'error',
            text1: 'Assessment Error',
            text2:
              result.message || 'Could not verify test access requirements.',
            position: 'bottom',
          });
        }
      } catch (error: any) {
        Toast.show({ type: 'error', text1: 'Error', text2: error.message });
      } finally {
        setLoading(false);
      }
    },
    [course.courseId],
  );
  // --- All (Student & Lecturer)
  const fetchCourseDetails = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getCourseDetails(course.courseId);
      if (result.success && result.course) {
        setCurrentCourse(result.course);
      } else {
        Toast.show({
          type: 'error',
          text1: 'Refresh Failed',
          text2: result.message || 'Could not update course details.',
        });
      }
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: 'Refresh Failed',
        text2: err.message,
      });
    } finally {
      setLoading(false);
    }
  }, [course.courseId]);
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
    if (!isSilent) setLoading(true);

    try {
      const token = await AsyncStorage.getItem('accessToken');
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
        if (!isSilent) {
          Toast.show({
            type: 'success',
            text1: testData.isPublished
              ? 'Assessment Published!'
              : 'Draft Saved',
            text2: `Successfully stored "${testData.title}"`,
          });
          setModalVisible(false);
        }
        fetchTests();
      } else {
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
  }, [course.courseId]);
  const handleDeleteLecture = async (lectureId: string) => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('accessToken');
      const response = await fetch(
        `${baseUrl}users/lecturers/class/lectures/${lectureId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.ok) {
        // Remove from local state immediately
        setAllLectures(prev => prev.filter(lec => lec.id !== lectureId));
        Toast.show({ type: 'success', text1: 'Lecture Deleted' });
      } else {
        const result = await response.json();
        throw new Error(result.message || 'Failed to delete');
      }
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: error.message });
    } finally {
      setLoading(false);
    }
  };
  const handlePostponeLecture = async (updatedLecture: Lecture) => {
    if (!updatedLecture) return;
    setAllLectures(prev =>
      prev.map(lec => (lec.id === updatedLecture.id ? updatedLecture : lec)),
    );
  };
  const displayLectures = useMemo(() => {
    return lectures && lectures.length > 0 ? lectures : allLectures;
  }, [lectures, allLectures]);
  const filteredLectures = useMemo(() => {
    if (!searchQuery) return displayLectures;

    return displayLectures.filter(
      (lecture: Lecture) =>
        lecture.topicName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lecture.courseId.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [searchQuery, displayLectures]);
  useEffect(() => {
    if (title === 'Exceptions') {
      fetchExceptions();
    }
    if (title === 'Assessments') {
      fetchTests(); // <--- Fetch tests when the Assessment page is active
    }
  }, [title, fetchExceptions, fetchTests]);
  useEffect(() => {
    if (title === 'Assessments' && userRole === 'student' && tests.length > 0) {
      const publishedTest = tests.find(t => t.isPublished);
      if (publishedTest) {
        setActiveTest(publishedTest);
      }
    }
  }, [tests, title, userRole]); // Trigger whenever the 'tests' array is updated from fetchTests()
  useEffect(() => {
    const specificId = (route.params as any)?.assessmentId;

    if (title === 'Assessments' && userRole === 'student') {
      if (specificId) {
        fetchStudentTest(specificId);
      } else {
        fetchTests();
      }
    }
  }, [title, userRole, route.params, fetchStudentTest, fetchTests]);
  useEffect(() => {
    if (title === 'View Lecture Schedule') {
      if (!lectures || lectures.length === 0) {
        fetchTimeline();
      }
    }
  }, [title, lectures, fetchTimeline]);
  useEffect(() => {
    if (
      title === 'Assessments' &&
      activeTest?.scheduledStart &&
      userRole === 'student'
    ) {
      const startTime = new Date(activeTest.scheduledStart).getTime();
      const now = Date.now();
      const buffer = 30000; // 30s network buffer
      const delay = startTime - buffer - now;
      if (delay > 0) {
        const timer = setTimeout(() => {
          fetchTests();
        }, delay);
        return () => clearTimeout(timer);
      } else {
        fetchTests();
      }
    }
  }, [activeTest, fetchTests, userRole, title]);

  const goBack = () => navigation.goBack();
  return (
    <SafeAreaView
      style={CourseActionStyles.safeArea}
      edges={['top', 'left', 'right']}
    >
      <DetailHeader
        title={title}
        onBack={goBack}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        placeholder={`Search ${title.toLowerCase()}...`}
        userRole={userRole}
      />

      <View style={CourseActionStyles.body}>
        {title === 'Course Contents' && (
          <RenderContents
            course={currentCourse}
            userRole={userRole}
            searchQuery={searchQuery}
            onRefresh={fetchCourseDetails}
          />
        )}
        {title === 'Course Materials' && (
          <RenderMaterials
            course={currentCourse}
            lectures={lectures}
            userRole={userRole}
            searchQuery={searchQuery}
            onRefresh={fetchCourseDetails}
          />
        )}
        {title === 'Assignments' && (
          <RenderAssignments
            course={currentCourse}
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
              setSearchQuery={setSearchQuery}
            />
          ) : hasSubmitted ? (
            <View style={CourseActionStyles.centered}>
              <Icon name="check-circle" size={80} color={PRIMARY_COLOR} />
              <Text style={CourseActionStyles.successTitle}>
                Assessment Completed
              </Text>
              <Text style={CourseActionStyles.successText}>
                You have already submitted this assessment. Multiple attempts
                are not allowed.
              </Text>
              <TouchableOpacity
                style={CourseActionStyles.doneButton}
                onPress={() => navigation.goBack()}
              >
                <Text style={CourseActionStyles.doneButtonText}>
                  Back to Course
                </Text>
              </TouchableOpacity>
            </View>
          ) : activeTest ? (
            (() => {
              if (!activeTest.scheduledStart) {
                return <EmptyState message="Assessment start time not set." />;
              }
              const now = Date.now();
              const startTime = new Date(activeTest.scheduledStart).getTime();
              const buffer = 30000; // 30-second buffer for network/clock sync

              const isTimeReady = now >= startTime - buffer;

              if (isTimeReady) {
                return (
                  <RenderStudentTest
                    test={activeTest}
                    user={user}
                    onSubmit={handleTestSubmission}
                  />
                );
              } else {
                return (
                  <View style={CourseActionStyles.centered}>
                    <Icon
                      name="timer-sand"
                      size={80}
                      color={PRIMARY_COLOR_TINT}
                    />
                    <Text style={CourseActionStyles.successTitle}>
                      Wait a Moment
                    </Text>
                    <Text style={CourseActionStyles.successText}>
                      This assessment is scheduled to start at {'\n'}
                      <Text style={{ fontWeight: 'bold' }}>
                        {new Date(
                          activeTest.scheduledStart,
                        ).toLocaleTimeString()}
                      </Text>
                      .
                    </Text>
                    <TouchableOpacity
                      style={CourseActionStyles.doneButton}
                      onPress={fetchTests} // Allow them to manual refresh
                    >
                      <Text style={CourseActionStyles.doneButtonText}>
                        Refresh Status
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              }
            })()
          ) : (
            <EmptyState message="No assessments currently available." />
          ))}

        {title === 'View Lecture Schedule' &&
          (userRole === 'lecturer' ? (
            <LecturerLectureScheduleView
              lectures={filteredLectures}
              onUpdateLecture={handlePostponeLecture}
              onDeleteLecture={handleDeleteLecture}
            />
          ) : (
            <RenderViewLectureSchedule
              lectures={filteredLectures}
              onPress={handleLecturePress}
            />
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
        <View style={CourseActionStyles.successOverlay}>
          <View style={CourseActionStyles.successBox}>
            <Icon
              name="check-circle-outline"
              size={70}
              color={PRIMARY_COLOR_TINT}
            />
            <Text style={CourseActionStyles.successTitle}>
              Lecture Scheduled Set!
            </Text>
            <Text style={CourseActionStyles.successText}>
              {scheduledLecture?.topicName} has been successfully added to the
              schedule.
            </Text>
            {scheduledLecture?.lectureType === 'Online' && (
              <View style={CourseActionStyles.linkShareBox}>
                <Text style={CourseActionStyles.linkSubtitle}>
                  Share Meeting Link
                </Text>
                <View style={CourseActionStyles.linkRow}>
                  <Text numberOfLines={1} style={CourseActionStyles.linkText}>
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
              style={CourseActionStyles.doneButton}
              onPress={() => {
                setShowSuccessModal(false);
                navigation.goBack(); // Return to the main course page
              }}
            >
              <Text style={CourseActionStyles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Toast config={toastConfig} />
    </SafeAreaView>
  );
};
