import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import {
  fetchMyCoursesAPI,
  fetchLecturerCoursesAPI,
} from '../api/localGetApis.ts';
import { Course } from '../types/firebase';
import { CourseSearchCard } from '../components/SearchScreenComponents';
import { generateSessions } from '../utils/courseHelper.ts';
import { useTheme } from '../context/ThemeContext';
import { PageHeader } from '../components/PageHeader';
import { useAppSelector } from '../hooks/hooks';
import { CourseModal } from '../components/ClassroomScreenComponents.tsx';
import {
  ALL,
  CourseFilterCard,
  useCourseFilters,
} from '../components/CourseFilters';
import { EmptyState } from '../components/EmptyFlatlistComponent';
import { centeredColumn, PAGE_WIDTH } from '../utils/layout';

// The current academic session (the recap is for sessions already finished).
const CURRENT_SESSION = generateSessions()[1];
// One request for every course, as on the Classroom tab; filtering is local.
const ALL_COURSES_LIMIT = 200;

export const ViewAllCoursesScreen = () => {
  const navigation = useNavigation<any>();
  const currentUser = useAppSelector(state => state.user) || {};
  const { colors } = useTheme();
  const usertype = currentUser?.usertype;
  const [courses, setCourses] = useState<Course[]>([]);
  const [status, setStatus] = useState<'loading' | 'refreshing' | 'ready' | 'error'>(
    'loading',
  );
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const fetchingRef = useRef(false);
  const filters = useCourseFilters(courses);
  const { visibleCourses, sessionFilter, isFiltered, clearFilters } = filters;

  const load = useCallback(
    async (mode: 'loading' | 'refreshing' = 'loading') => {
      if (fetchingRef.current) return;
      fetchingRef.current = true;
      setStatus(mode);
      try {
        const fetcher =
          usertype === 'lecturer' ? fetchLecturerCoursesAPI : fetchMyCoursesAPI;
        const result = await fetcher({
          semester: 'All',
          session: 'All',
          page: 1,
          limit: ALL_COURSES_LIMIT,
        });
        if (result.success) {
          setCourses(Array.isArray(result.courses) ? result.courses : []);
          setStatus('ready');
        } else {
          setErrorMessage(result.message || 'We could not load your courses.');
          setStatus('error');
        }
      } catch (error: any) {
        setErrorMessage(error?.message || 'Check your connection and try again.');
        setStatus('error');
      } finally {
        fetchingRef.current = false;
      }
    },
    [usertype],
  );

  useEffect(() => {
    load('loading');
  }, [load]);

  const showRecap =
    sessionFilter !== ALL &&
    sessionFilter !== CURRENT_SESSION &&
    visibleCourses.length > 0;

  const header = (
    <View>
      {status !== 'loading' && courses.length > 0 && (
        <Text style={[styles.count, { color: colors.text }]}>
          {isFiltered
            ? `${visibleCourses.length} of ${courses.length} courses`
            : `${courses.length} ${courses.length === 1 ? 'course' : 'courses'}`}
        </Text>
      )}
      {courses.length > 0 && <CourseFilterCard filters={filters} />}
      {showRecap && (
        <View
          style={[
            styles.recap,
            { backgroundColor: colors.primary + '12', borderColor: colors.primary + '35' },
          ]}
        >
          <MaterialIcons name="celebration" size={22} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.recapTitle, { color: colors.text }]}>
              Session recap: {sessionFilter}
            </Text>
            <Text style={[styles.recapText, { color: colors.text }]}>
              You took part in {visibleCourses.length} course
              {visibleCourses.length === 1 ? '' : 's'} this session. Well done for
              staying engaged.
            </Text>
          </View>
        </View>
      )}
    </View>
  );

  const empty =
    status === 'loading' ? (
      <View style={styles.loadingBox}>
        <ActivityIndicator color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>Loading your courses…</Text>
      </View>
    ) : status === 'error' ? (
      <EmptyState
        iconName="wifi-off"
        title="Couldn't load your courses"
        subtitle={errorMessage}
        buttonText="Try again"
        buttonIcon="refresh"
        onPress={() => load('refreshing')}
      />
    ) : isFiltered ? (
      <EmptyState
        iconName="filter-alt-off"
        title="No courses match these filters"
        subtitle="Try another session or semester."
        buttonText="Clear filters"
        buttonIcon="close"
        onPress={clearFilters}
      />
    ) : (
      <EmptyState
        iconName="school"
        title="No courses yet"
        subtitle="Add courses from the Classroom tab by uploading your form or entering them manually."
      />
    );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader
        title={usertype === 'lecturer' ? 'Manage Courses' : 'Enrolled Courses'}
      />
      <FlatList
        data={status === 'error' ? [] : visibleCourses}
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
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        refreshControl={
          <RefreshControl
            refreshing={status === 'refreshing'}
            onRefresh={() => load('refreshing')}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.listContent, centeredColumn(PAGE_WIDTH)]}
      />
      {selectedCourse && (
        <CourseModal
          isVisible={modalVisible}
          onClose={() => setModalVisible(false)}
          course={selectedCourse}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { paddingHorizontal: 15, paddingTop: 12, paddingBottom: 30, flexGrow: 1 },
  count: { fontSize: 12.5, marginBottom: 8, opacity: 0.75 },
  recap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  recapTitle: { fontSize: 15, fontWeight: '700', marginBottom: 3 },
  recapText: { fontSize: 13, lineHeight: 18 },
  loadingBox: { alignItems: 'center', paddingTop: 48, gap: 10 },
  loadingText: { fontSize: 13, opacity: 0.75 },
});
