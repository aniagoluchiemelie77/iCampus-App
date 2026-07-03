import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Toast from 'react-native-toast-message';
import { Course } from '../types/firebase';
import { useAppSelector } from '../hooks/hooks';
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
  QuickPublicMeeting,
} from '../components/CourseActionsComponent';
import {
  getCourseDetails,
  getStudentLecturesTimeline,
  checkAssessmentStatus,
  getCourseExceptions,
  getCourseAssessments,
  fetchAllLecturesByCourseId,
  getLecturersLecturesTimeline,
} from '../api/localGetApis';
import {
  submitLectureException,
  createLectureSchedule,
  saveCourseAssessment,
  submitStudentTest,
} from '../api/localPostApis';
import { useDispatch } from 'react-redux';
import { setUser } from '../context/UserSlice';
import { updateExceptionStatus } from '../api/localPatchApis';
import { deleteLectureSchedule } from '../api/localDeleteApis';
import { useTheme } from '../context/ThemeContext';
import { EmptyState } from '../components/EmptyFlatlistComponent';
import { RootStackParamList } from '../../App';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<RootStackParamList, 'CourseSubPage'>;
export const CourseSubPage = ({ route, navigation }: Props) => {
  const { colors } = useTheme();
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
  const [localExceptions, setLocalExceptions] = useState<any[]>(
    initialExceptions || [],
  );
  const [currentCourse, setCurrentCourse] = useState<Course | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [scheduledLecture, setScheduledLecture] = useState<any | null>(null);
  const [tests, setTests] = useState<any[]>([]);
  const [activeTest, setActiveTest] = useState<any | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [allLectures, setAllLectures] = useState<any[]>([]);
  const [lecturersLectureTimeline, setLecturersLectureTimeline] = useState<
    any[]
  >([]);

  // --- API CONSUMER SYNC LIFECYCLES (Memoized) ---

  const fetchTests = useCallback(async () => {
    if (!course?.courseId) return;
    setLoading(true);
    try {
      const result = await getCourseAssessments(course.courseId);
      if (result.success && result.data) {
        const sortedTests = result.data.sort(
          (a: any, b: any) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        setTests(sortedTests);
      } else {
        Toast.show({
          type: 'error',
          text1: 'Fetch Error',
          text2: result.error || 'Could not load assessments.',
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Sync Error',
        text2: 'Could not refresh assessments.',
      });
    } finally {
      setLoading(false);
    }
  }, [course?.courseId]);

  const fetchExceptions = useCallback(async () => {
    if (!course?.courseId) return;
    setLoading(true);
    try {
      const result = await getCourseExceptions(course.courseId);
      if (result.success && result.data) {
        setLocalExceptions(result.data);
      } else {
        Toast.show({
          type: 'error',
          text1: 'Fetch Error',
          text2: result.error || 'Failed to fetch exceptions',
        });
      }
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Fetch Error', text2: error.message });
    } finally {
      setLoading(false);
    }
  }, [course?.courseId]);

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

  const fetchLecturerLectureTimeline = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getLecturersLecturesTimeline();
      if (result.success && result.data) {
        setLecturersLectureTimeline(result.data);
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

  const fetchCourseDetails = useCallback(async () => {
    if (!course?.courseId) return;
    setLoading(true);
    try {
      const result = await getCourseDetails(course?.courseId);
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
  }, [course?.courseId]);

  const handleFetchCourseLectures = useCallback(async () => {
    if (!course?.courseId) return;
    const result = await fetchAllLecturesByCourseId(course?.courseId);
    if (result.success) {
      setAllLectures(result.data);
    } else {
      Toast.show({
        type: 'error',
        text1: 'Fetch Error',
        text2: result.error || 'Failed to fetch course lectures',
      });
    }
  }, [course?.courseId]);

  const fetchStudentTest = useCallback(
    async (assessmentId: string) => {
      setLoading(true);
      try {
        if (!course?.courseId) return;
        const result = await checkAssessmentStatus(
          course?.courseId,
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
    [course?.courseId],
  );

  // --- IMPERATIVE EVENT MUTATORS (Memoized) ---

  const handleSaveException = useCallback(
    async (newException: Partial<any>) => {
      setLoading(true);
      try {
        const result = await submitLectureException(newException);
        if (result.success && result.exception) {
          Toast.show({
            type: 'success',
            text1: 'Exception submitted successfully',
            position: 'bottom',
          });
          setLocalExceptions(prev => [result.exception, ...prev]);
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
    },
    [dispatch, user],
  );

  const handleTestSubmission = useCallback(
    async (payload: any) => {
      setLoading(true);
      try {
        const result = await submitStudentTest(payload);
        if (result.success) {
          Toast.show({
            type: 'success',
            text1: 'Test Submitted!',
            text2: 'Your grade has been recorded.',
          });
          fetchTests();
        } else {
          Toast.show({
            type: 'error',
            text1: 'Submission Failure',
            text2: result.message,
          });
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
    },
    [fetchTests],
  );

  const handleUpdateStatus = useCallback(
    async (id: string, status: 'approved' | 'rejected') => {
      setLoading(true);
      try {
        const result = await updateExceptionStatus(id, { status });
        if (result.success) {
          setLocalExceptions(prev =>
            prev.map(ex => (ex.id === id ? { ...ex, status } : ex)),
          );
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
          Toast.show({
            type: 'success',
            text1: 'Status Updated',
            text2: `Exception was successfully ${status}.`,
          });
        } else {
          Toast.show({
            type: 'error',
            text1: 'Update Failed',
            text2: result.error || 'Could not update exception status.',
          });
        }
      } catch (error) {
        Toast.show({ type: 'error', text1: 'Failed to update status' });
      } finally {
        setLoading(false);
      }
    },
    [dispatch, user],
  );

  const handleCreateLecture = useCallback(
    async (lectureData: any) => {
      if (!course?.courseId) return;
      setLoading(true);
      try {
        const result = await createLectureSchedule(
          course.courseId,
          lectureData,
        );
        if (result.success && result.lecture) {
          setScheduledLecture(result.lecture);
          setShowSuccessModal(true);
        } else {
          Toast.show({
            type: 'error',
            text1: 'Scheduling Failed',
            text2: result.error || 'Could not save schedule setup.',
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
    },
    [course?.courseId],
  );

  const handleCreateTest = useCallback(
    async (testData: any, isSilent: boolean = false) => {
      if (!course?.courseId) return;
      if (!isSilent) setLoading(true);
      try {
        const result = await saveCourseAssessment(course.courseId, testData);
        if (result.success) {
          if (!isSilent) {
            Toast.show({
              type: 'success',
              text1: testData.isPublished
                ? 'Assessment Published!'
                : 'Draft Saved',
              text2: `Successfully stored "${testData.title}"`,
            });
          }
          fetchTests();
        } else {
          Toast.show({
            type: 'error',
            text1: 'Save Failed',
            text2: result.error || 'Check your connection',
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
    },
    [course?.courseId, fetchTests],
  );

  const handleDeleteLecture = useCallback(async (lectureId: string) => {
    setLoading(true);
    try {
      const result = await deleteLectureSchedule(lectureId);
      if (result.success) {
        setAllLectures(prev => prev.filter(lec => lec.id !== lectureId));
        Toast.show({
          type: 'success',
          text2: result.message || 'Students have been notified.',
        });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Delete Error',
          text2: result.error || 'Unauthorized Access',
        });
      }
    } catch (error: any) {
      Toast.show({ type: 'error', text1: 'Error', text2: error.message });
    } finally {
      setLoading(false);
    }
  }, []);

  const handlePostponeLecture = useCallback(async (updatedLecture: any) => {
    if (!updatedLecture) return;
    setAllLectures(prev =>
      prev.map(lec => (lec.id === updatedLecture.id ? updatedLecture : lec)),
    );
  }, []);

  const handleLecturePress = useCallback(
    (item: any) => {
      if (item.lectureType === 'Online') {
        navigation.navigate('LiveClassSessions', {
          lectureId: item.id,
          courseId: item.courseId,
        });
      }
    },
    [navigation],
  );
  const displayLectures = useMemo(() => {
    return lectures && lectures.length > 0 ? lectures : allLectures;
  }, [lectures, allLectures]);

  const filteredLectures = useMemo(() => {
    if (!searchQuery) return displayLectures;
    const lowerQuery = searchQuery.toLowerCase();
    return displayLectures.filter(
      (lecture: any) =>
        lecture.topicName.toLowerCase().includes(lowerQuery) ||
        lecture.courseId.toLowerCase().includes(lowerQuery),
    );
  }, [searchQuery, displayLectures]);

  const filteredLecturersLectures = useMemo(() => {
    if (!searchQuery) return lecturersLectureTimeline;
    const lowerQuery = searchQuery.toLowerCase();
    return lecturersLectureTimeline.filter(
      (lecture: any) =>
        lecture.topicName.toLowerCase().includes(lowerQuery) ||
        lecture.courseId.toLowerCase().includes(lowerQuery),
    );
  }, [searchQuery, lecturersLectureTimeline]);

  // --- EFFECT LIFECYCLES ENGINE ---

  useEffect(() => {
    if (title === 'Exceptions') fetchExceptions();
    if (title === 'Assessments') fetchTests();
  }, [title, fetchExceptions, fetchTests]);

  useEffect(() => {
    if (title === 'Assessments' && userRole === 'student' && tests.length > 0) {
      const publishedTest = tests.find(t => t.isPublished);
      if (publishedTest) setActiveTest(publishedTest);
    }
  }, [tests, title, userRole]);

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
      if (userRole === 'student') {
        fetchTimeline();
      } else {
        fetchLecturerLectureTimeline();
      }
    }
  }, [title, userRole, fetchTimeline, fetchLecturerLectureTimeline]);

  useEffect(() => {
    if (title === 'Exceptions') handleFetchCourseLectures();
  }, [title, handleFetchCourseLectures]);

  useEffect(() => {
    if (
      title === 'Assessments' &&
      activeTest?.scheduledStart &&
      userRole === 'student'
    ) {
      const startTime = new Date(activeTest.scheduledStart).getTime();
      const now = Date.now();
      const buffer = 30000;
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

  const goBack = useCallback(() => navigation.goBack(), [navigation]);

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
            course={currentCourse!}
            userRole={userRole}
            searchQuery={searchQuery}
            onRefresh={fetchCourseDetails}
          />
        )}
        {title === 'Course Materials' && (
          <RenderMaterials
            course={currentCourse!}
            lectures={lectures || []}
            userRole={userRole}
            searchQuery={searchQuery}
            onRefresh={fetchCourseDetails}
          />
        )}
        {title === 'Assignments' && (
          <RenderAssignments
            course={currentCourse!}
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
            course={course!}
            onSave={handleCreateLecture}
            isLoading={loading}
          />
        )}
        {title === 'QuickPublicClass' && <QuickPublicMeeting />}
        {title === 'Assessments' &&
          (userRole === 'lecturer' ? (
            <RenderLecturerTestManage
              course={course!}
              refreshing={loading}
              tests={tests}
              onRefresh={fetchTests}
              onSaveTest={handleCreateTest}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
            />
          ) : hasSubmitted ? (
            <View
              style={[
                CourseActionStyles.centered,
                { backgroundColor: colors.background },
              ]}
            >
              <View
                style={[
                  CourseActionStyles.centeredSecondary,
                  { backgroundColor: colors.backgroundSecondary },
                ]}
              >
                <MaterialIcons
                  name="check-circle-outlined"
                  size={80}
                  color={colors.primary}
                />
                <Text
                  style={[
                    CourseActionStyles.successTitle,
                    { color: colors.textDarker },
                  ]}
                >
                  Assessment Completed
                </Text>
                <Text
                  style={[
                    CourseActionStyles.successText,
                    { color: colors.text },
                  ]}
                >
                  You have already submitted this assessment. Multiple attempts
                  are not allowed.
                </Text>
                <TouchableOpacity
                  style={[
                    CourseActionStyles.doneButton,
                    { backgroundColor: colors.btnColor },
                  ]}
                  onPress={goBack}
                >
                  <Text
                    style={[
                      CourseActionStyles.doneButtonText,
                      { color: colors.btnTextColor },
                    ]}
                  >
                    Back to Course
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : activeTest ? (
            (() => {
              if (!activeTest.scheduledStart) {
                return (
                  <EmptyState
                    iconName="search-off"
                    title="Assessment start time not set"
                  />
                );
              }
              const now = Date.now();
              const startTime = new Date(activeTest.scheduledStart).getTime();
              const buffer = 30000;
              if (now >= startTime - buffer) {
                return (
                  <RenderStudentTest
                    test={activeTest}
                    user={user}
                    onSubmit={handleTestSubmission}
                  />
                );
              } else {
                return (
                  <View
                    style={[
                      CourseActionStyles.centered,
                      { backgroundColor: colors.background },
                    ]}
                  >
                    <View
                      style={[
                        CourseActionStyles.centeredSecondary,
                        { backgroundColor: colors.backgroundSecondary },
                      ]}
                    >
                      <MaterialIcons
                        name="timer-outlined"
                        size={80}
                        color={colors.primary}
                      />
                      <Text
                        style={[
                          CourseActionStyles.successTitle,
                          { color: colors.textDarker },
                        ]}
                      >
                        Wait a Moment
                      </Text>
                      <Text
                        style={[
                          CourseActionStyles.successText,
                          { color: colors.text },
                        ]}
                      >
                        This assessment is scheduled to start at {'\n'}
                        <Text style={{ fontWeight: 'bold' }}>
                          {new Date(
                            activeTest.scheduledStart,
                          ).toLocaleTimeString()}
                        </Text>
                        .
                      </Text>
                      <TouchableOpacity
                        style={[
                          CourseActionStyles.doneButton,
                          { backgroundColor: colors.btnColor },
                        ]}
                        onPress={fetchTests}
                      >
                        <Text
                          style={[
                            CourseActionStyles.doneButtonText,
                            { color: colors.btnTextColor },
                          ]}
                        >
                          Refresh Status
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              }
            })()
          ) : (
            <EmptyState iconName="search-off" title="Assessment not found" />
          ))}
        {title === 'View Lecture Schedule' &&
          (userRole === 'lecturer' ? (
            <LecturerLectureScheduleView
              lectures={filteredLecturersLectures}
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
        course={course!}
        user={user}
        lectures={allLectures}
        onSave={handleSaveException}
        isSaving={loading}
      />

      <Modal visible={showSuccessModal} transparent animationType="slide">
        <View style={CourseActionStyles.successOverlay}>
          <View
            style={[
              CourseActionStyles.successBox,
              { backgroundColor: colors.backgroundSecondary },
            ]}
          >
            <MaterialIcons
              name="check-circle-outlined"
              size={70}
              color={colors.primary}
            />
            <Text
              style={[
                CourseActionStyles.successTitle,
                { color: colors.textDarker },
              ]}
            >
              Lecture Schedule Set!
            </Text>
            <Text
              style={[CourseActionStyles.successText, { color: colors.text }]}
            >
              {scheduledLecture?.topicName} has been successfully added to the
              schedule.
            </Text>
            {scheduledLecture?.lectureType === 'Online' && (
              <>
                <Text
                  style={[
                    CourseActionStyles.linkSubtitle,
                    { color: colors.text },
                  ]}
                >
                  Share Meeting Link
                </Text>
                <View style={CourseActionStyles.linkRow}>
                  <Text
                    numberOfLines={1}
                    style={[
                      CourseActionStyles.linkText,
                      { color: colors.text },
                    ]}
                  >
                    {scheduledLecture.location}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      Clipboard.setString(scheduledLecture.location || '');
                      Toast.show({ type: 'success', text1: 'Link copied!' });
                    }}
                  >
                    <MaterialIcons
                      name="content-copy-outlined"
                      size={20}
                      color={colors.primary}
                    />
                  </TouchableOpacity>
                </View>
              </>
            )}
            <TouchableOpacity
              style={CourseActionStyles.doneButton}
              onPress={() => {
                setShowSuccessModal(false);
                navigation.navigate('Home', { activeTab: 'classroom' });
              }}
            >
              <Text style={CourseActionStyles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};
