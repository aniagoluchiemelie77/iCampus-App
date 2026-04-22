import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Text,
  Modal,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { TransactionList } from '../components/TransactionHistory';
import { TransactionStats } from '../components/TransactionStats';
import {
  PRIMARY_COLOR,
  PRIMARY_COLOR_TINT,
} from '../components/Classroomcomponent';
import { baseUrl } from '../components/HomeScreenComponents';
import { PageHeader } from '../components/PageHeader.tsx';

export const AllTransactionsScreen = ({ route }: any) => {
  const { user, stats: initialStats } = route.params;
  const [activeTab, setActiveTab] = useState<'history' | 'stats'>('history');
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [endDate, setEndDate] = useState(new Date());
  const [pickerMode, setPickerMode] = useState<'start' | 'end' | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleDateConfirm = (event: any, date?: Date) => {
    setPickerMode(null);
    if (date) {
      if (pickerMode === 'start') setStartDate(date);
      if (pickerMode === 'end') setEndDate(date);
    }
  };

  const handleExport = async () => {
    if (startDate > endDate) {
      return Toast.show({
        type: 'error',
        text1: 'Invalid Range',
        text2: 'Start date cannot be after end date',
      });
    }

    try {
      setIsExporting(true);
      const token = await AsyncStorage.getItem('accessToken');
      const response = await fetch(`${baseUrl}user/transactions/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: user.uid,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        }),
      });

      if (response.ok) {
        setModalVisible(false);
        Toast.show({
          type: 'success',
          text1: 'Processing',
          text2: 'Statement sent to your email.',
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Export Failed',
        text2: 'Please try again later.',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <ScrollView style={iCashScreenStyles.container}>
      <PageHeader title="Transaction History" />
      <View style={iCashScreenStyles.customTabBar}>
        <TouchableOpacity
          style={[
            iCashScreenStyles.tabItem,
            activeTab === 'history' && iCashScreenStyles.activeTabItem,
          ]}
          onPress={() => setActiveTab('history')}
        >
          <Text
            style={[
              iCashScreenStyles.tabText,
              activeTab === 'history' && { color: PRIMARY_COLOR },
            ]}
          >
            History
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            iCashScreenStyles.tabItem,
            activeTab === 'stats' && iCashScreenStyles.activeTabItem,
          ]}
          onPress={() => setActiveTab('stats')}
        >
          <Text
            style={[
              iCashScreenStyles.tabText,
              activeTab === 'stats' && { color: PRIMARY_COLOR },
            ]}
          >
            Statistics
          </Text>
        </TouchableOpacity>
      </View>
      {activeTab === 'history' ? (
        <View style={iCashScreenStyles.tabContainer}>
          <View style={iCashScreenStyles.searchSection}>
            <View style={iCashScreenStyles.searchContainer}>
              <Icon name="magnify" size={20} color="#888" />
              <TextInput
                placeholder="Search history..."
                style={iCashScreenStyles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
            <TouchableOpacity
              style={iCashScreenStyles.filterBtn}
              onPress={() => setModalVisible(true)}
            >
              <Icon
                name="file-export-outline"
                size={22}
                color={PRIMARY_COLOR}
              />
            </TouchableOpacity>
          </View>
          <TransactionList
            user={user}
            variant="full"
            limit={15}
            searchQuery={searchQuery}
          />
        </View>
      ) : (
        <TransactionStats data={initialStats} userId={user.uid} />
      )}

      {/* Export Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={iCashScreenStyles.modalOverlay}>
          <View style={iCashScreenStyles.modalContent}>
            <Text style={iCashScreenStyles.modalTitle}>Export Statement</Text>
            <Text style={iCashScreenStyles.modalSub}>
              Select date range to receive a PDF via email.
            </Text>

            <TouchableOpacity
              style={iCashScreenStyles.dateRow}
              onPress={() => setPickerMode('start')}
            >
              <View>
                <Text style={iCashScreenStyles.dateLabel}>Start Date</Text>
                <Text style={iCashScreenStyles.dateValue}>
                  {startDate.toDateString()}
                </Text>
              </View>
              <Icon name="calendar-import" size={22} color={PRIMARY_COLOR} />
            </TouchableOpacity>

            <TouchableOpacity
              style={iCashScreenStyles.dateRow}
              onPress={() => setPickerMode('end')}
            >
              <View>
                <Text style={iCashScreenStyles.dateLabel}>End Date</Text>
                <Text style={iCashScreenStyles.dateValue}>
                  {endDate.toDateString()}
                </Text>
              </View>
              <Icon name="calendar-export" size={22} color={PRIMARY_COLOR} />
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', marginTop: 20 }}>
              <TouchableOpacity
                style={[
                  iCashScreenStyles.modalBtn,
                  { backgroundColor: '#EEE' },
                ]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={{ color: '#333', fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  iCashScreenStyles.modalBtn,
                  { backgroundColor: PRIMARY_COLOR },
                ]}
                onPress={handleExport}
              >
                {isExporting ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={{ color: '#FFF', fontWeight: '600' }}>
                    Export
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
        {pickerMode && (
          <DateTimePicker
            value={pickerMode === 'start' ? startDate : endDate}
            mode="date"
            display="spinner"
            onChange={handleDateConfirm}
            maximumDate={new Date()}
          />
        )}
      </Modal>
    </ScrollView>
  );
};
export const iCashScreenStyles = StyleSheet.create({
  historyContainer: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F0F0F0',
  },
  iconBackground: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#F0F7FF', // Light tint of your primary color
    justifyContent: 'center',
    alignItems: 'center',
  },
  transactionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  transactionTime: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  tabContainer: {
    flex: 1,
  },
  searchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F3F5',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 45,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#333',
  },
  filterBtn: {
    marginLeft: 15,
    padding: 8,
    backgroundColor: '#F1F3F5',
    borderRadius: 10,
  },
  customTabBar: {
    flexDirection: 'row',
    backgroundColor: '#fadccc',
    paddingTop: 10,
    borderBottomWidth: 0.8,
    borderBottomColor: PRIMARY_COLOR_TINT,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTabItem: {
    borderBottomColor: PRIMARY_COLOR,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2222',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 5,
  },
  modalSub: { fontSize: 13, color: '#666', marginBottom: 20 },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginBottom: 10,
  },
  dateLabel: { fontSize: 11, color: '#888' },
  dateValue: { fontSize: 15, fontWeight: '600', color: '#333' },
  modalBtn: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 5,
  },
});