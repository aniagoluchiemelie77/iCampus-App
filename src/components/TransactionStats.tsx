import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import { PieChart } from "react-native-chart-kit";
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { PRIMARY_COLOR, PRIMARY_COLOR_TINT } from './Classroomcomponent';
import { baseUrl } from './/HomeScreenComponents';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';

const screenWidth = Dimensions.get("window").width;
interface StatsData {
  flow: Array<{ _id: 'in' | 'out'; total: number }>;
  topRecipients: Array<{ _id: string; count: number; total: number, name: string }>;
  monthly: Array<{ _id: number; total: number }>;
  currency: string;
}
interface transactionStats {
    data: StatsData | null,
    userId: string
}

export const TransactionStats = ({ data, userId }: transactionStats) => {
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
            const token = await AsyncStorage.getItem('accessToken');
            const response = await fetch(
                `${baseUrl}user/transactions/stats/${userId}?month=${month}&year=${year}`,
                {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}` 
                    },
                }
            );
            if (!response.ok) {
                Toast.show({
                    type: 'error',
                    text1: 'Fetch Error',
                    text2: `Failed to fetch statistics`,
                });
            }
            const json = await response.json();
            setStats(json);
        } catch (error: any) {
            console.error("Stats Fetch Error:", error);
            Toast.show({
                type: 'error',
                text1: 'Connection Error',
                text2: error.message || 'Could not update statistics. Please try again.',
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
      name: "Received",
      population: stats.flow.find(f => f._id === 'in')?.total || 0,
      color: "#4CAF50",
      legendFontColor: "#7F7F7F",
      legendFontSize: 12
    },
    {
      name: "Expenses",
      population: stats.flow.find(f => f._id === 'out')?.total || 0,
      color: PRIMARY_COLOR,
      legendFontColor: "#7F7F7F",
      legendFontSize: 12
    }
  ];
  const income = stats.flow.find(f => f._id === 'in')?.total || 0;
  const expense = stats.flow.find(f => f._id === 'out')?.total || 0;
  return (
    <View style={styles.container}>
        <View style={styles.chartCard}>
            <View style={styles.chartHeader}>
                <Text style={styles.sectionTitle}>Transaction Overview</Text>    
                <TouchableOpacity 
                    style={styles.filterSelector} 
                    onPress={() => setShowPicker(true)}
                >
                    <Text style={styles.filterText}>{formatMonthYear(selectedDate)}</Text>
                    <Icon name="calendar-month" size={16} color={PRIMARY_COLOR} />
                </TouchableOpacity>
            </View>
            {isLoading ? (
                <ActivityIndicator size="large" color={PRIMARY_COLOR} />
            ) : (
                <PieChart
                    data={pieData}
                    width={screenWidth - 40}
                    height={200}
                    chartConfig={chartConfig}
                    accessor={"population"}
                    backgroundColor={"transparent"}
                    paddingLeft={"15"}
                    center={[10, 0]}
                    absolute
                />
            )}
            {showPicker && (
                <DateTimePicker
                    value={selectedDate}
                    mode="date" // Use date mode
                    display="spinner" 
                    onChange={onDateChange}
                    maximumDate={new Date()} 
                />
            )}
        </View>
        <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
                <Icon name="arrow-bottom-left" size={20} color="#4CAF50" />
                <Text style={styles.label}>Total Received</Text>
                <View style={styles.currencyRow}>
                    <Icon name="diamonds" size={16} color="#4CAF50" />
                    <Text style={[styles.amount, {color: "#4CAF50"}]}>{income.toLocaleString()}</Text>
                </View>
            </View>
            <View style={styles.summaryCard}>
                <Icon name="arrow-top-right" size={20} color={PRIMARY_COLOR} />
                <Text style={styles.label}>Total Spent</Text>
                <View style={styles.currencyRow}>
                    <Icon name="diamonds" size={16} color={PRIMARY_COLOR} />
                    <Text style={[styles.amount, {color: PRIMARY_COLOR}]}>{expense.toLocaleString()}</Text>
                </View>
            </View>
        </View>
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>Frequent Transfers</Text>
            {stats.topRecipients.map((item, index) => (
                <View key={index} style={styles.recipientRow}>
                    <View style={styles.recipientInfo}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>{item.name?.charAt(0) || 'U'}</Text>
                        </View>
                        <View style={{ marginLeft: 12 }}>
                            <Text style={styles.recipientName}>{item.name || 'Unknown User'}</Text>
                            <Text style={styles.countText}>{item.count} transfers</Text>
                        </View>
                    </View>
                    <View style={styles.currencyRow}>
                        <Icon name="diamonds" size={14} color={PRIMARY_COLOR} />
                        <Text style={styles.recipientTotal}>{item.total.toLocaleString()}</Text>
                    </View>
                </View>
            ))}
        </View>
    </View>
  );
};

const chartConfig = {
  backgroundGradientFrom: "#fadccc",
  backgroundGradientTo: "#fadccc",
  color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
  strokeWidth: 2,
  decimalPlaces: 0,
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, },
  chartStyle: { marginVertical: 8, borderRadius: 16 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  summaryCard: { width: '48%', padding: 15, borderRadius: 12 },
  label: { fontSize: 12, color: '#888', marginVertical: 4 },
  currencyRow: { flexDirection: 'row', alignItems: 'center' },
  amount: { fontSize: 18, fontWeight: 'bold', marginLeft: 4 },
  downloadBtn: { 
    flexDirection: 'row', backgroundColor: PRIMARY_COLOR, 
    padding: 15, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 20 
  },
  downloadBtnText: { color: '#FFF', fontWeight: 'bold', marginLeft: 8 },
  section: { backgroundColor: '#fadccc', borderRadius: 12, padding: 15, marginBottom: 40 },
  recipientRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: PRIMARY_COLOR_TINT },
  recipientInfo: { flexDirection: 'row', alignItems: 'center' },
  recipientId: { fontSize: 14, fontWeight: '600' },
  countText: { fontSize: 12, color: '#888' },
  recipientTotal: { fontSize: 14, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', padding: 25, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 10, color: '#222' },
  modalSub: { color: '#666', marginBottom: 20 },
  intervalOption: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  intervalText: { fontSize: 16, color: '#333' },
  centerText: { textAlign: 'center', marginTop: 50 },
  filterSelector: {
    flexDirection: 'row',
    alignSelf: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: .8,
    borderColor: PRIMARY_COLOR_TINT
  },
  filterText: { marginRight: 5, fontWeight: '600', color: PRIMARY_COLOR },
  avatar: { 
    width: 40, height: 40, borderRadius: 20, 
    backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' 
  },
  avatarText: { fontWeight: 'bold', color: PRIMARY_COLOR },
  recipientName: { fontSize: 15, fontWeight: '700', color: '#2222' },
  dropdownMenu: { backgroundColor: '#FFF', borderRadius: 10, width: 150, elevation: 5, paddingVertical: 5 },
  menuItem: { padding: 15, borderBottomWidth: 0.5, borderBottomColor: PRIMARY_COLOR_TINT },
  menuText: { fontSize: 14, color: '#333' },
  activeMenuText: { fontSize: 14, color: PRIMARY_COLOR, fontWeight: 'bold' },
  chartCard: {
    backgroundColor: '#fadccc',
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
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  dateRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: 15,
  backgroundColor: '#fadccc',
  borderRadius: 12,
  marginBottom: 12,
  borderWidth: .8,
  borderColor: PRIMARY_COLOR_TINT,
},
dateLabel: {
  fontSize: 12,
  color: '#888',
  marginBottom: 2,
},
dateValue: {
  fontSize: 16,
  fontWeight: '600',
  color: PRIMARY_COLOR_TINT,
},
modalActions: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  marginTop: 20,
},
modalBtn: {
  flex: 1,
  height: 50,
  borderRadius: 12,
  justifyContent: 'center',
  alignItems: 'center',
  marginHorizontal: 5,
},
});

