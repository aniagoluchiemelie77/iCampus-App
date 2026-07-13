
import React, { useState, useEffect, useCallback } from 'react';
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
  ScrollView
} from 'react-native';
import { CourseSearchCard } from '../components/SearchScreen.tsx';
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

const SESSIONS = generateSessions();

export const ViewAllCoursesScreen = () => {
    const navigation = useNavigation<any>();
    const currentUser = useAppSelector(state => state.user);
    const { colors } = useTheme();
    const [hasMore, setHasMore] = useState(true);
    const [isFetchingMore, setIsFetchingMore] = useState(false);
    const [selectedSemester, setSelectedSemester] = useState('First');
    const [selectedSession, setSelectedSession] = useState(SESSIONS[2]);
    const [isSessionModalVisible, setSessionModalVisible] = useState(false);
    const [isSemesterModalVisible, setSemesterModalVisible] = useState(false);
    const [page, setPage] = useState(1);
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [isLoading, setLoading] = useState(false);

    const [courses, setCourses] = useState<Course[]>([]);
    const fetchCourses = useCallback(async (isLoadMore = false) => {
        if (isLoadMore && (!hasMore || isFetchingMore)) return;
        const nextPage = isLoadMore ? page + 1 : 1;
        if (!isLoadMore) setLoading(true);
        else setIsFetchingMore(true);
        try {
            const params = {
                semester: selectedSemester, 
                session: selectedSession,
                page: nextPage,
                limit: 10,
            };
            const result = currentUser?.usertype === 'lecturer' 
                ? await fetchLecturerCoursesAPI(params) 
                : await fetchMyCoursesAPI(params);
            if (result.success) {
                setCourses(prev => isLoadMore ? [...prev, ...result.courses] : result.courses);
                setPage(nextPage);
                setHasMore(result.courses.length === 10);
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
            setLoading(false);
            setIsFetchingMore(false);
        }
    }, [hasMore, isFetchingMore, page, selectedSemester, selectedSession, currentUser?.usertype]);

    useEffect(() => {
        setPage(1);
        setHasMore(true);
        fetchCourses(false);
    }, [selectedSemester, selectedSession, fetchCourses]);

    return(
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.container, {backgroundColor: colors.background}]} >
        <PageHeader title={currentUser?.usertype === 'lecturer' ? 'Manage Courses' : 'Enrolled Courses'} showBackButton={false} />
        <View style={styles.filterContainer}>
           <TouchableOpacity
                style={[
                    styles.selectorButton,
                    { borderColor: colors.primary },
                ]}
                onPress={() => setSessionModalVisible(true)}
            >
                <View style={styles.selectorTextContainer}>
                    <Text
                        style={[styles.selectorLabel, { color: colors.text }]}
                    >
                        Session
                    </Text>
                    {selectedSession && (
                        <Text
                            style={[
                              styles.selectorValue,
                              { color: colors.primary },
                            ]}
                          >
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
                style={[
                    styles.selectorButton,
                    { borderColor: colors.primary },
                ]}
                onPress={() => setSemesterModalVisible(true)}
            >
                <View style={styles.selectorTextContainer}>
                    <Text
                        style={[styles.selectorLabel, { color: colors.text }]}
                    >
                        Semester
                    </Text>
                    <Text
                        style={[
                            styles.selectorValue,
                            { color: colors.primary },
                        ]}
                    >
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
        {isLoading ? 
            <ActivityIndicator color={colors.primary} style={{alignSelf: 'center'}} size={'small'}/> 
            : 
            (
                <FlatList
                    data={courses}
                    keyExtractor={(item) => item.courseId}
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
                    onEndReached={() => fetchCourses(true)}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={isFetchingMore ? <ActivityIndicator /> : null}
                /> 
            )
        }
        <CourseModal
            isVisible={modalVisible}
            onClose={() => setModalVisible(false)}
            course={selectedCourse!}
            id={currentUser?.uid}
            currentUser={currentUser}
            userRole={currentUser.usertype && currentUser.usertype as 'student' || 'lecturer'}
        />
        <SelectionModal
            title="Select Session"
            visible={isSessionModalVisible}
            options={SESSIONS}
            selectedValue={selectedSession}
            onSelect={val => setSelectedSession(val)}
            onClose={() => setSessionModalVisible(false)}
            colors={colors}
        />
        <SelectionModal
            title="Select Semester"
            visible={isSemesterModalVisible}
            options={['All', 'First', 'Second']}
            selectedValue={selectedSemester}
            onSelect={val => setSelectedSemester(val)}
            onClose={() => setSemesterModalVisible(false)}
            colors={colors}
        />
    </ScrollView>
    )
}
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
    paddingHorizontal: 15
  }
});