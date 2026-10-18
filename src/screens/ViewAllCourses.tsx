
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  fetchMyCoursesAPI,
  fetchLecturerCoursesAPI,
} from '../api/localGetApis.ts';
import { Course } from '../types/firebase';
import {
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { CourseSearchCard } from '../components/SearchScreenComponents';
import { generateSessions } from '../utils/courseHelper.ts';
import { useTheme } from '../context/ThemeContext';
import { PageHeader } from '../components/PageHeader';
import { useNavigation } from '@react-navigation/native';
import { useAppSelector } from '../hooks/hooks';
import Toast from 'react-native-toast-message';
import {
  CourseModal,
  SelectionModal
} from '../components/ClassroomScreenComponents.tsx';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useLoadMoreOnScroll } from '../hooks/useLoadMoreOnScroll';

const SESSIONS = generateSessions();
const PAGE_SIZE = 10;

export const ViewAllCoursesScreen = () => {
  const navigation = useNavigation<any>();
  const currentUser = useAppSelector(state => state.user) || {};
  const { colors } = useTheme();
  const [selectedSemester, setSelectedSemester] = useState('First');
  const [selectedSession, setSelectedSession] = useState(SESSIONS[2]);
  const [isSessionModalVisible, setSessionModalVisible] = useState(false);
  const [isSemesterModalVisible, setSemesterModalVisible] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isLoading, setLoading] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  // Refs, not state: the guards must see the latest values immediately, not
  // after the next render.
  const pageRef = useRef(1);
  const hasMoreRef = useRef(true);
  // Bumped on every page-1 load so a slow response for an old filter can't
  // overwrite the list for the new one.
  const requestIdRef = useRef(0);
  const usertype = currentUser?.usertype;

  const fetchPage = useCallback(
    async (pageNum: number) => {
      const requestId =
        pageNum === 1 ? ++requestIdRef.current : requestIdRef.current;
      if (pageNum === 1) setLoading(true);
      else setIsFetchingMore(true);

      try {
        const params = {
          semester: selectedSemester,
          session: selectedSession,
          page: pageNum,
          limit: PAGE_SIZE,
        };
        const result =
          usertype === 'lecturer'
            ? await fetchLecturerCoursesAPI(params)
            : await fetchMyCoursesAPI(params);
        if (requestId !== requestIdRef.current) return;

        if (result.success) {
          const pageCourses = result.courses || [];
          setCourses(prev =>
            pageNum === 1 ? pageCourses : [...prev, ...pageCourses],
          );
          pageRef.current = pageNum;
          hasMoreRef.current = pageCourses.length === PAGE_SIZE;
        }
      } catch (error) {
        console.error(error);
        Toast.show({
          type: 'error',
          text1: 'Failed to fetch courses',
          position: 'bottom',
          bottomOffset: 5,
        });
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
          setIsFetchingMore(false);
        }
      }
    },
    [selectedSemester, selectedSession, usertype],
  );

  // Runs once on mount, then once per filter change (fetchPage only changes
  // when the semester, session or user type does).
  useEffect(() => {
    hasMoreRef.current = true;
    fetchPage(1);
  }, [fetchPage]);

  const loadMoreProps = useLoadMoreOnScroll(() => {
    if (!hasMoreRef.current || isLoading) return;
    return fetchPage(pageRef.current + 1);
  });

  const filters = (
    <View style={styles.filterContainer}>
      <TouchableOpacity
        style={[styles.selectorButton, { borderColor: colors.primary }]}
        onPress={() => setSessionModalVisible(true)}
      >
        <View style={styles.selectorTextContainer}>
          <Text style={[styles.selectorLabel, { color: colors.text }]}>
            Session
          </Text>
          {selectedSession && (
            <Text style={[styles.selectorValue, { color: colors.primary }]}>
              {selectedSession}
            </Text>
          )}
        </View>
        <MaterialIcons
          name="arrow-drop-down"
          size={24}
          color={colors.textDarker}
        />
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.selectorButton, { borderColor: colors.primary }]}
        onPress={() => setSemesterModalVisible(true)}
      >
        <View style={styles.selectorTextContainer}>
          <Text style={[styles.selectorLabel, { color: colors.text }]}>
            Semester
          </Text>
          <Text style={[styles.selectorValue, { color: colors.primary }]}>
            {selectedSemester || 'All'}
          </Text>
        </View>
        <MaterialIcons
          name="arrow-drop-down"
          size={24}
          color={colors.textDarker}
        />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader
        title={usertype === 'lecturer' ? 'Manage Courses' : 'Enrolled Courses'}
        showBackButton={false}
      />
      {/* The FlatList is the scroll container: nesting it in a ScrollView
          disabled virtualization and made onEndReached fire continuously. */}
      <FlatList
        data={isLoading ? [] : courses}
        keyExtractor={item => item.courseId}
        renderItem={({ item }) => (
          <CourseSearchCard
            item={item}
            navigation={navigation}
            colors={colors}
            onPress={() => {
              setSelectedCourse(item);
              setModalVisible(true);
            }}
          />
        )}
        ListHeaderComponent={filters}
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator
              color={colors.primary}
              style={{ alignSelf: 'center', marginTop: 20 }}
              size="small"
            />
          ) : (
            <Text style={[styles.emptyText, { color: colors.text }]}>
              No courses for this session and semester.
            </Text>
          )
        }
        ListFooterComponent={
          isFetchingMore ? (
            <ActivityIndicator
              color={colors.primary}
              style={{ marginVertical: 16 }}
            />
          ) : null
        }
        {...loadMoreProps}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
      <CourseModal
        isVisible={modalVisible}
        onClose={() => setModalVisible(false)}
        course={selectedCourse!}
      />
      <SelectionModal
        title="Select Session"
        visible={isSessionModalVisible}
        options={SESSIONS}
        selectedValue={selectedSession}
        onSelect={val => setSelectedSession(val)}
        onClose={() => setSessionModalVisible(false)}
      />
      <SelectionModal
        title="Select Semester"
        visible={isSemesterModalVisible}
        options={['All', 'First', 'Second']}
        selectedValue={selectedSemester}
        onSelect={val => setSelectedSemester(val)}
        onClose={() => setSemesterModalVisible(false)}
      />
    </View>
  );
};
const styles = StyleSheet.create({
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    marginVertical: 15,
  },
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 15,
    borderWidth: 1,
  },
  selectorTextContainer: {
    alignItems: 'center',
  },
  selectorLabel: {
    fontSize: 14,
  },
  selectorValue: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: 'bold',
  },
  container: {
    flex: 1,
  },
  listContent: {
    marginHorizontal: 15,
    paddingBottom: 30,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 14,
  },
});