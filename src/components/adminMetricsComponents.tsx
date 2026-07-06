import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LineChart } from "react-native-chart-kit";
import { CurrencyDisplay } from './CurrencyFormatter';
import { useTheme } from '../context/ThemeContext';
import { AbstractChartConfig } from 'react-native-chart-kit/dist/AbstractChart';

interface SparklineProps {
  data: number[];
  color: string;
  bgFrom?: string;
  bgTo?: string;
}
interface EntityItem {
  id: string;
  name?: string;
  schoolName?: string;
  address?: string;
  createdAt?: string | Date;
}

interface EntityPreviewProps {
  title: string;
  items: EntityItem[];
  total: number;
  onViewAll: () => void;
  onItemPress: (item: EntityItem) => void;
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
  bgFrom = "#ffffff", 
  bgTo = "#ffffff" 
}: SparklineProps) => {
  return (
    <LineChart
      data={{
        labels: data.map(() => ""), 
        datasets: [{ data }]
      }}
      width={80}
      height={30}
      chartConfig={{
        backgroundGradientFrom: bgFrom,
        backgroundGradientTo: bgTo,
        color: (_opacity = 1) => color,
        strokeWidth: 2,
      } as AbstractChartConfig}
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
  onItemPress 
}: EntityPreviewProps) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.listCard, { backgroundColor: colors.backgroundSecondary }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>{title} ({total})</Text>
          <TouchableOpacity onPress={onViewAll} style={styles.viewAllBtn}>
            <Text style={{ color: colors.btnTextColor }}>View All</Text>
          </TouchableOpacity>
      </View>

      {items.map((item) => (
        <TouchableOpacity 
          key={item.id} 
          style={[styles.row, { borderBottomColor: colors.border }]} 
          onPress={() => onItemPress(item)} 
        >
          <Text style={[styles.rowText, { color: colors.text, flex: 1 }]}>
            {item.name || item.schoolName}
          </Text>
          {item.address && <Text style={styles.rowTextMini}>{item.address}</Text>}
          <Text style={[styles.dateText, { color: colors.text }]}>
            {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ''}
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
      <View style={[styles.card, {backgroundColor: colors.backgroundSecondary, borderColor: colors.border}]}>
        <Text style={[styles.label, {color: colors.text}]}>Active Users</Text>
        <Text style={[styles.value, {color: colors.textDarker}]}>{stats.activeUsers}</Text>
      </View>
      <View style={[styles.card, {backgroundColor: colors.backgroundSecondary, borderColor: colors.border}]}>
        <Text style={[styles.label, {color: colors.text}]}>Total Liquidity</Text>
        <CurrencyDisplay value={stats.platformLiquidity} size="large" isSuccess={true} />
        <View style={styles.sparklineWrapper}>
          <Sparkline data={stats.liquidityTrend} color={colors.success} bgFrom={colors.backgroundSecondary} bgTo={colors.backgroundSecondary} />
        </View>
      </View>
      <View style={[styles.card, {backgroundColor: colors.backgroundSecondary, borderColor: colors.border}]}>
        <Text style={[styles.label, {color: colors.text}]}>Open Tickets</Text>
        <Text style={[styles.value, {color: colors.textDarker}]}>{stats.pendingTickets}</Text>
        <View style={styles.sparklineWrapper}>
          <Sparkline data={stats.ticketTrend} color={colors.primary} bgFrom={colors.backgroundSecondary} bgTo={colors.backgroundSecondary} />
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
    <View style={[styles.listCard, { backgroundColor: colors.backgroundSecondary }]}>
      <Text style={[styles.value, {color: colors.textDarker, marginBottom: 15}]}>iCampus Flow Analysis</Text>
      
      <View style={styles.summaryContainer}>
        <View style={[styles.card, {backgroundColor: colors.backgroundSecondary, borderColor: colors.border}]}>
          <Text style={[styles.label, {color: colors.text}]}>Total Ins</Text>
          <CurrencyDisplay value={totalIn} size="large" isSuccess={true} />
        </View>
        <View style={[styles.card, {backgroundColor: colors.backgroundSecondary, borderColor: colors.border}]}>
          <Text style={[styles.label, {color: colors.text}]}>Total Outs</Text>
          <CurrencyDisplay value={totalOut} size="large" isSuccess={false} />
        </View>
      </View>
      <LineChart
        data={{
          labels: trendData.labels, 
          datasets: [
            { data: trendData.inFlow, color: () => colors.success, strokeWidth: 2 },
            { data: trendData.outFlow, color: () => colors.primary, strokeWidth: 2 }
          ]
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
export const SystemHealthSection = ({ latency, locations }: SystemHealthProps) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.listCard, { backgroundColor: colors.backgroundSecondary }]}>
      <Text style={[styles.value, {color: colors.textDarker, marginBottom: 15}]}>System Performance & Activity</Text>
      <View style={[styles.card, {backgroundColor: colors.backgroundSecondary, borderColor: colors.border}]}>
        <Text style={[styles.label, {color: colors.text}]}>Average Latency</Text>
        <Text style={[styles.value, { color: latency > 300 ? colors.success : colors.primary }]}>
          {latency.toFixed(0)} ms
        </Text>
      </View>

      {/* Top Locations Section */}
      <Text style={[styles.subTitle, { color: colors.text }]}>Top Active User Locations</Text>
      {locations.map((loc, index) => (
        <View key={index} style={[styles.locationRow, {borderBottomColor: colors.border}]}>
          <Text style={[styles.rowText, { color: colors.text, flex: 1 }]}>{loc._id || 'Unknown'}</Text>
          <Text style={[styles.rowText2, { color: colors.primary }]}>{loc.count} users</Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  summaryContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15  },
  card: { padding: 15, borderRadius: 15, borderWidth: 1, marginHorizontal: 5, alignItems: 'center' },
  listCard: { padding: 15, borderRadius: 15, marginBottom: 15, width: '100%' },
  label: { fontSize: 14, fontWeight: 'bold', marginBottom: 7 },
  value: { fontSize: 18, fontWeight: 'bold' },
  sparklineWrapper: { marginTop: 8 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold' },
  viewAllBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 15, alignContent: 'center' },
  viewAllText: { fontSize: 14, fontWeight: 'bold' },
  row: { paddingVertical: 8, borderBottomWidth: 1, },
  rowText: { fontSize: 14 },
  rowText2: { fontSize: 14, marginRight: 8, fontWeight: 'bold', },
  rowTextMini: { fontSize: 12, marginTop: 4 },
  dateText: { fontSize: 11, alignSelf: 'flex-end', marginTop: 5 },
  locationRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1,  },
  subTitle: { fontSize: 15, fontWeight: 'bold', marginVertical: 15 },
});