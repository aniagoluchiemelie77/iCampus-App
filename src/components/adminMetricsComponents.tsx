import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { CurrencyDisplay } from './CurrencyFormatter';
import { useTheme } from '../context/ThemeContext';
import { TaxEntry, EntityItem, SchoolMetrics } from '../types/firebase';
import { useNavigation } from '@react-navigation/native';
import { getAds } from '../api/localGetApis';
import AdBanner from './AdsBanner';
import { AdItem } from '../types/firebase';
import { StatusCard } from './SellerManagementComps';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {
  PRIMARY_COLOR_TINT,
  PRIMARY_COLOR_TINT_MAIN,
} from '../assets/styles/colors';
import { CustomButton } from '../assets/components/AppUIComponents';
interface SchoolAdminDashboardViewProps {
  metrics: SchoolMetrics;
}

interface SparklineProps {
  data: number[];
  color: string;
  bgFrom?: string;
  bgTo?: string;
}

interface EntityPreviewProps {
  title: string;
  items: EntityItem[];
  total: number;
  onViewAll: () => void;
  onItemPress: (item: EntityItem) => void;
}
interface TaxEntryPreviewProps {
  title: string;
  items: TaxEntry[];
  onViewAll: () => void;
}
interface AdsPreviewProps {
  title: string;
  onViewAll: () => void;
}
interface FinanceSectionProps {
  trendData: {
    labels: string[];
    inFlow: number[];
    outFlow: number[];
  };
}
interface LocationStat {
  _id: string; // The location name
  count: number;
}

interface SystemHealthProps {
  latency: number;
  locations: LocationStat[];
}

export const Sparkline = ({
  data,
  color,
  bgFrom = '#ffffff',
  bgTo = '#ffffff',
}: SparklineProps) => {
  return (
    <LineChart
      data={{
        labels: data.map(() => ''),
        datasets: [{ data }],
      }}
      width={80}
      height={30}
      chartConfig={
        {
          backgroundGradientFrom: bgFrom,
          backgroundGradientTo: bgTo,
          color: (_opacity = 1) => color,
          strokeWidth: 2,
        } as any
      }
      withDots={false}
      withInnerLines={false}
      withOuterLines={false}
      withShadow={false}
      withVerticalLabels={false}
      withHorizontalLabels={false}
    />
  );
};
export const EntityPreviewSection = ({
  title,
  items,
  total,
  onViewAll,
  onItemPress,
}: EntityPreviewProps) => {
  const { colors } = useTheme();

  return (
    <View
      style={[styles.listCard, { backgroundColor: colors.backgroundSecondary }]}
    >
      <View style={styles.headerRow}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {title} ({total})
        </Text>
        <CustomButton
          title="View All"
          onPress={onViewAll}
          style={styles.viewAllBtn}
        />
      </View>

      {items.map(item => (
        <TouchableOpacity
          key={item.id}
          style={[styles.row, { borderBottomColor: colors.border }]}
          onPress={() => onItemPress(item)}
        >
          <Text style={[styles.rowText, { color: colors.text, flex: 1 }]}>
            {item.name || item.schoolName}
          </Text>
          {item.address && (
            <Text style={styles.rowTextMini}>{item.address}</Text>
          )}
          <Text style={[styles.dateText, { color: colors.text }]}>
            {item.createdAt
              ? new Date(item.createdAt).toLocaleDateString()
              : ''}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};
export const DashboardSummary = ({ stats }: { stats: any }) => {
  const { colors } = useTheme();
  return (
    <View style={styles.summaryContainer}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.backgroundSecondary,
            borderColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.label, { color: colors.text }]}>Active Users</Text>
        <Text style={[styles.value, { color: colors.textDarker }]}>
          {stats.activeUsers}
        </Text>
      </View>
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.backgroundSecondary,
            borderColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.label, { color: colors.text }]}>
          Total Liquidity
        </Text>
        <CurrencyDisplay
          value={stats.platformLiquidity}
          size="large"
          isSuccess={true}
        />
        <View style={styles.sparklineWrapper}>
          <Sparkline
            data={stats.liquidityTrend}
            color={colors.success}
            bgFrom={colors.backgroundSecondary}
            bgTo={colors.backgroundSecondary}
          />
        </View>
      </View>
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.backgroundSecondary,
            borderColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.label, { color: colors.text }]}>Open Tickets</Text>
        <Text style={[styles.value, { color: colors.textDarker }]}>
          {stats.pendingTickets}
        </Text>
        <View style={styles.sparklineWrapper}>
          <Sparkline
            data={stats.ticketTrend}
            color={colors.primary}
            bgFrom={colors.backgroundSecondary}
            bgTo={colors.backgroundSecondary}
          />
        </View>
      </View>
    </View>
  );
};
export const FinanceSection = ({ trendData }: FinanceSectionProps) => {
  const { colors } = useTheme();
  const totalIn = trendData.inFlow.reduce((sum, val) => sum + val, 0);
  const totalOut = trendData.outFlow.reduce((sum, val) => sum + val, 0);

  return (
    <View
      style={[styles.listCard, { backgroundColor: colors.backgroundSecondary }]}
    >
      <Text
        style={[styles.value, { color: colors.textDarker, marginBottom: 15 }]}
      >
        iCampus Flow Analysis
      </Text>

      <View style={styles.summaryContainer}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.backgroundSecondary,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.label, { color: colors.text }]}>Total Ins</Text>
          <CurrencyDisplay value={totalIn} size="large" isSuccess={true} />
        </View>
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.backgroundSecondary,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.label, { color: colors.text }]}>Total Outs</Text>
          <CurrencyDisplay value={totalOut} size="large" isSuccess={false} />
        </View>
      </View>
      <LineChart
        data={{
          labels: trendData.labels,
          datasets: [
            {
              data: trendData.inFlow,
              color: () => colors.success,
              strokeWidth: 2,
            },
            {
              data: trendData.outFlow,
              color: () => colors.primary,
              strokeWidth: 2,
            },
          ],
        }}
        width={320}
        height={180}
        chartConfig={{
          backgroundGradientFrom: colors.backgroundSecondary,
          backgroundGradientTo: colors.backgroundSecondary,
          color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
        }}
        bezier
      />
    </View>
  );
};
export const SystemHealthSection = ({
  latency,
  locations,
}: SystemHealthProps) => {
  const { colors } = useTheme();

  return (
    <View
      style={[styles.listCard, { backgroundColor: colors.backgroundSecondary }]}
    >
      <Text
        style={[styles.value, { color: colors.textDarker, marginBottom: 15 }]}
      >
        System Performance & Activity
      </Text>
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.backgroundSecondary,
            borderColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.label, { color: colors.text }]}>
          Average Latency
        </Text>
        <Text
          style={[
            styles.value,
            { color: latency > 300 ? colors.success : colors.primary },
          ]}
        >
          {latency.toFixed(0)} ms
        </Text>
      </View>

      {/* Top Locations Section */}
      <Text style={[styles.subTitle, { color: colors.text }]}>
        Top Active User Locations
      </Text>
      {locations.map((loc, index) => (
        <View
          key={index}
          style={[styles.locationRow, { borderBottomColor: colors.border }]}
        >
          <Text style={[styles.rowText, { color: colors.text, flex: 1 }]}>
            {loc._id || 'Unknown'}
          </Text>
          <Text style={[styles.rowText2, { color: colors.primary }]}>
            {loc.count} users
          </Text>
        </View>
      ))}
    </View>
  );
};
export const TaxEntryPreviewSection = ({
  title = 'Tax Entries',
  items,
  onViewAll,
}: TaxEntryPreviewProps) => {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();

  return (
    <View
      style={[styles.listCard, { backgroundColor: colors.backgroundSecondary }]}
    >
      <View style={styles.headerRow}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {title}
        </Text>
        <CustomButton
          title="View All"
          onPress={onViewAll}
          style={styles.viewAllBtn}
        />
      </View>

      {items.map(item => {
        const handlePress = () => {
          if (item.taxType !== 'product_tax') {
            navigation.navigate('TransactionDetail', {
              transactionId: item.sourceDetails?.relatedTransactionId,
            });
          }
        };
        return (
          <View
            key={item.transactionReference}
            style={[styles.row, { borderBottomColor: colors.border }]}
          >
            <View style={styles.rowDiv}>
              <Text
                style={[
                  styles.rowText,
                  { color: colors.text, fontWeight: '600' },
                ]}
              >
                {item.taxType.replace('_', ' ').toUpperCase()}
              </Text>
              {item.sourceDetails?.relatedTransactionId && (
                <TouchableOpacity onPress={handlePress}>
                  <Text
                    style={[
                      styles.rowText,
                      {
                        color: colors.primary,
                        textDecorationLine: 'underline',
                      },
                    ]}
                  >
                    Ref: {item.sourceDetails.relatedTransactionId}
                  </Text>
                </TouchableOpacity>
              )}
              <CurrencyDisplay
                value={item.amount}
                size="small"
                isSuccess={true}
              />
            </View>

            {/* Amount & Currency */}
            <View style={{ alignItems: 'flex-end', marginLeft: 8 }}>
              <Text style={[styles.dateText, { color: colors.text }]}>
                {item.date ? new Date(item.date).toLocaleDateString() : ''}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
};
export const AdsPreviewSection = ({
  title = 'Tax Entries',
  onViewAll,
}: AdsPreviewProps) => {
  const { colors } = useTheme();
  const [ads, setAds] = useState<AdItem[]>([]);
  const [loadingAds, setLoadingAds] = useState(true);
  useEffect(() => {
    const fetchAdvertisements = async () => {
      setLoadingAds(true);
      const result = await getAds();
      if (result.success) {
        setAds(result.data);
      }
      setLoadingAds(false);
    };

    fetchAdvertisements();
  }, []);

  return (
    <View
      style={[styles.listCard, { backgroundColor: colors.backgroundSecondary }]}
    >
      <View style={styles.headerRow}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {title}
        </Text>
        <CustomButton
          title="View All"
          onPress={onViewAll}
          style={styles.viewAllBtn}
        />
      </View>

      {!loadingAds && ads.length > 0 && <AdBanner ads={ads} />}
    </View>
  );
};

export const SchoolAdminDashboardView = ({
  metrics,
}: SchoolAdminDashboardViewProps) => {
  const { colors } = useTheme();
  const { users, courses, academics } = metrics;

  const studentGrowthData = users.onboardingGrowth.map(item => item.students);
  const lecturerGrowthData = users.onboardingGrowth.map(item => item.lecturers);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={[styles.sectionHeader, { color: colors.textDarker }]}>
        Institutional Overview
      </Text>

      <View style={styles.gridRow}>
        <StatusCard
          label="Verified Students"
          count={users.verifiedStudents.toString()}
          color={colors.success}
          icon="school-outlined"
        />
        <StatusCard
          label="Verified Lecturers"
          count={users.verifiedLecturers.toString()}
          color={colors.success}
          icon="person-outlined"
        />
        <StatusCard
          label="Active Courses"
          count={courses.totalActiveCourses.toString()}
          color={colors.success}
          icon="menu-book-outlined"
        />
        <StatusCard
          label="Student Enrollments"
          count={courses.studentEnrollmentDensity.toString()}
          color={colors.success}
          icon="groups-outlined"
        />
      </View>

      <Text style={[styles.sectionHeader, { color: colors.textDarker }]}>
        Onboarding Trends
      </Text>
      <View
        style={[
          styles.cardContainer,
          { backgroundColor: colors.backgroundSecondary },
        ]}
      >
        <View style={styles.trendRow}>
          <Sparkline
            data={studentGrowthData.length > 0 ? studentGrowthData : [0]}
            color={colors.success}
          />
          <View>
            <Text style={[styles.trendLabel, { color: colors.text }]}>
              Student Growth Trend
            </Text>
            <Text style={[styles.trendLabel, { color: colors.text }]}>
              Last {studentGrowthData.length} months
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.trendRow}>
          <Sparkline
            data={lecturerGrowthData.length > 0 ? lecturerGrowthData : [0]}
            color={colors.success}
          />
          <View>
            <Text style={[styles.trendLabel, { color: colors.text }]}>
              Lecturer Growth Trend
            </Text>
            <Text style={[styles.trendLabel, { color: colors.text }]}>
              Last {lecturerGrowthData.length} months
            </Text>
          </View>
        </View>
      </View>

      <Text style={[styles.sectionHeader, { color: colors.textDarker }]}>
        Academic & Allocation Status
      </Text>
      <View style={styles.gridRow}>
        <StatusCard
          label="Assigned Courses"
          count={courses.allocationStatus.assigned.toString()}
          color={colors.success}
          icon="check-circle"
        />
        <StatusCard
          label="Unassigned / Pending"
          count={courses.allocationStatus.unassigned.toString()}
          color={colors.pendingDelivery}
          icon="warning"
        />
      </View>

      <View
        style={[
          styles.cardContainer,
          { backgroundColor: colors.backgroundSecondary },
        ]}
      >
        <View style={styles.statRowItem}>
          <MaterialIcons name="assignment" size={20} color={colors.text} />
          <Text style={[styles.statItemLabel, { color: colors.text }]}>
            Total Assessments Created
          </Text>
          <Text style={[styles.statItemValue, { color: colors.textDarker }]}>
            {academics.totalAssessmentsCreated}
          </Text>
        </View>
        <View style={styles.statRowItem}>
          <MaterialIcons name="check-circle" size={20} color={colors.success} />
          <Text style={[styles.statItemLabel, { color: colors.text }]}>
            Test Submissions Logged
          </Text>
          <Text style={[styles.statItemValue, { color: colors.textDarker }]}>
            {academics.testSubmissionsCount}
          </Text>
        </View>
        <View style={styles.statRowItem}>
          <MaterialIcons name="verified-user" size={20} color={colors.text} />
          <Text style={[styles.statItemLabel, { color: colors.text }]}>
            Attendance Sync Volume
          </Text>
          <Text style={[styles.statItemValue, { color: colors.textDarker }]}>
            {academics.attendanceSyncVolume}
          </Text>
        </View>
      </View>

      {/* Row 4: Department Breakdown */}
      <Text style={[styles.sectionHeader, { color: colors.textDarker }]}>
        Courses by Department
      </Text>
      <View
        style={[
          styles.cardContainer,
          { backgroundColor: colors.backgroundSecondary },
        ]}
      >
        {Object.keys(courses.departmentBreakdown).length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.text }]}>
            No department data available.
          </Text>
        ) : (
          Object.entries(courses.departmentBreakdown).map(
            ([dept, count], index) => (
              <View key={dept}>
                <View style={styles.deptRow}>
                  <Text style={[styles.deptName, { color: colors.text }]}>
                    {dept}
                  </Text>
                  <Text style={[styles.deptCount, { color: colors.text }]}>
                    {count} courses
                  </Text>
                </View>
                {index <
                  Object.keys(courses.departmentBreakdown).length - 1 && (
                  <View style={styles.divider} />
                )}
              </View>
            ),
          )
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  card: {
    padding: 15,
    borderRadius: 15,
    borderWidth: 1,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  listCard: { padding: 15, borderRadius: 15, marginBottom: 15, width: '100%' },
  label: { fontSize: 14, fontWeight: 'bold', marginBottom: 7 },
  value: { fontSize: 18, fontWeight: 'bold' },
  sparklineWrapper: { marginTop: 8 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 18, fontWeight: 'bold' },
  viewAllBtn: {
    paddingHorizontal: 15,
    width: 'auto'
  },
  viewAllText: { fontSize: 14, fontWeight: 'bold' },
  row: { paddingVertical: 8, borderBottomWidth: 1 },
  rowText: { fontSize: 14 },
  rowText2: { fontSize: 14, marginRight: 8, fontWeight: 'bold' },
  rowTextMini: { fontSize: 12, marginTop: 4 },
  dateText: { fontSize: 11, alignSelf: 'flex-end', marginTop: 5 },
  locationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  subTitle: { fontSize: 15, fontWeight: 'bold', marginVertical: 15 },
  rowDiv: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '700',
    alignSelf: 'center',
    marginBottom: 15,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  cardContainer: {
    marginBottom: 15,
    shadowColor: PRIMARY_COLOR_TINT,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  trendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  trendLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  trendSubtext: {
    fontSize: 12,
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: PRIMARY_COLOR_TINT_MAIN,
    marginVertical: 8,
  },
  statRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 10,
  },
  statItemLabel: {
    flex: 1,
    fontSize: 14,
    marginHorizontal: 8,
  },
  statItemValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  deptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 15,
  },
  deptName: {
    fontSize: 14,
  },
  deptCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4F46E5',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 15,
  },
  container: {
    paddingHorizontal: 15,
    paddingBottom: 32,
    marginTop: 5,
  },
});
