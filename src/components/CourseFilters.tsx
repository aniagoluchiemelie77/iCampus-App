/**
 * Session / semester chip filters for course lists (Classroom dashboard and
 * View All Courses). Courses are loaded once and filtered on the device, so
 * switching is instant.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../context/ThemeContext';

export const ALL = 'All';

export const uniqueValues = (values: any[]) =>
  Array.from(
    new Set(
      values
        .filter(v => v !== undefined && v !== null && String(v).trim() !== '')
        .map(v => String(v).trim()),
    ),
  );

export const semesterLabel = (value: string) =>
  /^\d+$/.test(value) ? `Semester ${value}` : `${value} semester`;

/** A labelled row of choice chips ("All" first). Wraps instead of scrolling sideways. */
export const FilterRow = ({
  label,
  icon,
  options,
  value,
  onChange,
  format = (v: string) => v,
}: {
  label: string;
  icon: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
  format?: (v: string) => string;
}) => {
  const { colors } = useTheme();
  return (
    <View style={styles.filterRow}>
      <View style={styles.filterLabelRow}>
        <MaterialIcons name={icon} size={15} color={colors.primary} />
        <Text style={[styles.filterLabel, { color: colors.textDarker }]}>{label}</Text>
      </View>
      <View style={styles.chipWrap}>
        {[ALL, ...options].map(option => {
          const selected = option === value;
          return (
            <TouchableOpacity
              key={option}
              onPress={() => onChange(option)}
              style={[
                styles.chip,
                selected
                  ? { backgroundColor: colors.primary, borderColor: colors.primary }
                  : { borderColor: colors.border, backgroundColor: colors.background },
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected }}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: selected ? colors.btnTextColor || '#fff' : colors.textDarker },
                ]}
              >
                {option === ALL ? 'All' : format(option)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

/** Filter state + the filtered list for a set of courses. */
export const useCourseFilters = (courses: any[]) => {
  const [sessionFilter, setSessionFilter] = useState<string>(ALL);
  const [semesterFilter, setSemesterFilter] = useState<string>(ALL);
  const sessionOptions = useMemo(
    () =>
      uniqueValues(courses.map(c => c.session)).sort((a, b) =>
        b.localeCompare(a, undefined, { numeric: true }),
      ),
    [courses],
  );
  const semesterOptions = useMemo(
    () =>
      uniqueValues(courses.map(c => c.semester)).sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true }),
      ),
    [courses],
  );
  // Drop a selection that no longer exists after a refresh.
  useEffect(() => {
    if (sessionFilter !== ALL && !sessionOptions.includes(sessionFilter)) setSessionFilter(ALL);
    if (semesterFilter !== ALL && !semesterOptions.includes(semesterFilter)) setSemesterFilter(ALL);
  }, [sessionOptions, semesterOptions, sessionFilter, semesterFilter]);
  const visibleCourses = useMemo(
    () =>
      courses.filter(
        c =>
          (sessionFilter === ALL || String(c.session ?? '').trim() === sessionFilter) &&
          (semesterFilter === ALL || String(c.semester ?? '').trim() === semesterFilter),
      ),
    [courses, sessionFilter, semesterFilter],
  );
  const isFiltered = sessionFilter !== ALL || semesterFilter !== ALL;
  const clearFilters = () => {
    setSessionFilter(ALL);
    setSemesterFilter(ALL);
  };
  return {
    sessionFilter,
    setSessionFilter,
    semesterFilter,
    setSemesterFilter,
    sessionOptions,
    semesterOptions,
    visibleCourses,
    isFiltered,
    clearFilters,
  };
};

/** The card holding both filter rows and "Clear filters". */
export const CourseFilterCard = ({
  filters,
}: {
  filters: ReturnType<typeof useCourseFilters>;
}) => {
  const { colors } = useTheme();
  const {
    sessionOptions,
    semesterOptions,
    sessionFilter,
    setSessionFilter,
    semesterFilter,
    setSemesterFilter,
    isFiltered,
    clearFilters,
  } = filters;
  if (sessionOptions.length === 0 && semesterOptions.length === 0) return null;
  return (
    <View
      style={[
        styles.filterCard,
        { backgroundColor: colors.backgroundSecondary, borderColor: colors.border },
      ]}
    >
      {sessionOptions.length > 0 && (
        <FilterRow
          label="Session"
          icon="date-range"
          options={sessionOptions}
          value={sessionFilter}
          onChange={setSessionFilter}
        />
      )}
      {semesterOptions.length > 0 && (
        <FilterRow
          label="Semester"
          icon="event-note"
          options={semesterOptions}
          value={semesterFilter}
          onChange={setSemesterFilter}
          format={semesterLabel}
        />
      )}
      {isFiltered && (
        <TouchableOpacity
          onPress={clearFilters}
          style={styles.clearFilters}
          accessibilityRole="button"
        >
          <MaterialIcons name="filter-alt-off" size={16} color={colors.primary} />
          <Text style={[styles.clearFiltersText, { color: colors.primary }]}>Clear filters</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  filterCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    gap: 10,
  },
  filterRow: { gap: 6 },
  filterLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  filterLabel: { fontSize: 12.5, fontWeight: '800', letterSpacing: 0.2 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: { fontSize: 12.5, fontWeight: '700' },
  clearFilters: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
  clearFiltersText: { fontSize: 12.5, fontWeight: '700' },
});
