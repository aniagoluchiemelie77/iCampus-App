import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import DateTimePicker from '@react-native-community/datetimepicker';
import { getTransactionStats } from '../api/localGetApis';
import Toast from 'react-native-toast-message';
import { StatsData } from '../types/firebase';
import { useTheme } from '../context/ThemeContext';
import { CurrencyDisplay } from './CurrencyFormatter';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

const screenWidth = Dimensions.get('window').width;
interface transactionStats {
  data: StatsData | null;
}

export const TransactionStats = ({ data }: transactionStats) => {
  const { colors } = useTheme();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [stats, setStats] = useState<StatsData | null>(data);

  useEffect(() => {
    setStats(data);
  }, [data, setStats]);
  const onDateChange = async (event: any, date?: Date) => {
    setShowPicker(false);
    setIsLoading(true);
    if (date && event.type !== 'dismissed') {
      setSelectedDate(date);
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      try {
        const response = await getTransactionStats({ month, year });
        if (response.success) {
          setStats(response.data);
        } else {
          Toast.show({
            type: 'error',
            text1: 'Fetch Error',
            text2: response.error || 'Failed to fetch statistics',
          });
        }
      } catch (error: any) {
        console.error('Stats Fetch Error:', error);
        Toast.show({
          type: 'error',
          text1: 'Connection Error',
          text2:
            error.message || 'Could not update statistics. Please try again.',
          position: 'bottom',
        });
      } finally {
        setIsLoading(false);
      }
    }
  };
  const formatMonthYear = (date: Date) => {
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  };
  if (!stats) return <Text style={styles.centerText}>Loading stats...</Text>;
  const pieData = [
    {
      name: 'Received',
      population: stats.flow.find(f => f._id === 'in')?.total || 0,
      color: colors.success,
      legendFontColor: colors.text,
      legendFontSize: 12,
    },
    {
      name: 'Expenses',
      population: stats.flow.find(f => f._id === 'out')?.total || 0,
      color: colors.primary,
      legendFontColor: colors.text,
      legendFontSize: 12,
    },
  ];
  const income = stats.flow.find(f => f._id === 'in')?.total || 0;
  const expense = stats.flow.find(f => f._id === 'out')?.total || 0;
  const chartConfig = {
    backgroundGradientFrom: colors.backgroundSecondary,
    backgroundGradientTo: colors.backgroundSecondary,
    color: (opacity = 1) =>
      colors.textDarker ? `${colors.textDarker}` : `rgba(0, 0, 0, ${opacity})`,
    strokeWidth: 2,
    decimalPlaces: 0,
  };
  return (
    <>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View
          style={[
            styles.chartCard,
            { backgroundColor: colors.backgroundSecondary },
          ]}
        >
          <View style={styles.chartHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textDarker }]}>
              Transaction Overview
            </Text>
            <TouchableOpacity
              style={[
                styles.filterSelector,
                { backgroundColor: colors.btnColor },
              ]}
              onPress={() => setShowPicker(true)}
            >
              <Text style={[styles.filterText, { color: colors.btnTextColor }]}>
                {formatMonthYear(selectedDate)}
              </Text>
              <MaterialIcons
                name="calendar-month"
                size={16}
                color={colors.btnTextColor}
              />
            </TouchableOpacity>
          </View>
          {isLoading ? (
            <ActivityIndicator size="large" color={colors.primary} />
          ) : (
            <PieChart
              data={pieData}
              width={screenWidth - 40}
              height={200}
              chartConfig={chartConfig}
              accessor={'population'}
              backgroundColor={'transparent'}
              paddingLeft={'15'}
              center={[10, 0]}
              absolute
            />
          )}
        </View>
        <View
          style={[
            styles.summaryRow,
            { backgroundColor: colors.backgroundSecondary },
          ]}
        >
          <View style={styles.summaryCard}>
            <MaterialIcons
              name="arrow-downward"
              size={22}
              color={colors.success}
            />
            <Text style={[styles.label, { color: colors.text }]}>
              Total Received
            </Text>
            <CurrencyDisplay value={income} size="large" isSuccess={true} />
          </View>
          <View style={styles.summaryCard}>
            <MaterialIcons
              name="arrow-upward"
              size={22}
              color={colors.primary}
            />
            <Text style={[styles.label, { color: colors.text }]}>
              Total Spent
            </Text>
            <CurrencyDisplay value={expense} size="large" />
          </View>
        </View>
        <View
          style={[
            styles.section,
            { backgroundColor: colors.backgroundSecondary },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.textDarker }]}>
            Frequent Transfers
          </Text>
          {stats.topRecipients.map((item, index) => (
            <View
              key={index}
              style={[styles.recipientRow, { borderBottomColor: colors.text }]}
            >
              <View style={styles.recipientInfo}>
                <Text style={[styles.recipientName, { color: colors.text }]}>
                  {item.name || 'Unknown User'}
                </Text>
                <Text style={[styles.countText, { color: colors.text }]}>
                  {item.count} transfers
                </Text>
              </View>
              <CurrencyDisplay value={item.total} size="small" />
            </View>
          ))}
        </View>
      </View>
      {showPicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date" // Use date mode
          display="spinner"
          onChange={onDateChange}
          maximumDate={new Date()}
        />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10 },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    borderRadius: 12,
    padding: 15,
  },
  summaryCard: {
    width: '48%',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  label: { fontSize: 14, marginVertical: 6 },
  section: { borderRadius: 12, padding: 15, marginBottom: 40 },
  recipientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
  recipientInfo: { flexDirection: 'row', alignItems: 'center' },
  recipientId: { fontSize: 14, fontWeight: '600' },
  countText: { fontSize: 14, marginLeft: 6 },
  centerText: { textAlign: 'center', marginTop: 50 },
  filterSelector: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    alignItems: 'center',
  },
  filterText: { marginRight: 5, fontWeight: '600', fontSize: 14 },
  recipientName: { fontSize: 14, fontWeight: '700' },
  menuText: { fontSize: 14, color: '#333' },
  chartCard: {
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
});

