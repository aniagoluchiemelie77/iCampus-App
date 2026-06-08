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
import DateTimePicker from '@react-native-community/datetimepicker';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TransactionList } from '../components/TransactionHistory';
import { TransactionStats } from '../components/TransactionStats';
import { PRIMARY_COLOR } from '../components/Classroomcomponent';
import { baseUrl } from '../components/HomeScreenComponents';
import { PageHeader } from '../components/PageHeader.tsx';
import { useTheme } from '../context/ThemeContext';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

export const AllTransactionsScreen = ({ route }: any) => {
  const { colors } = useTheme();
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
    <ScrollView
      style={[
        iCashScreenStyles.container,
        { backgroundColor: colors.background },
      ]}
    >
      <PageHeader title="Transaction History" />
      <View
        style={[
          iCashScreenStyles.customTabBar,
          { backgroundColor: colors.backgroundSecondary },
        ]}
      >
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
              activeTab === 'history'
                ? { color: colors.primary }
                : { color: colors.text },
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
              activeTab === 'stats'
                ? { color: colors.primary }
                : { color: colors.text },
            ]}
          >
            Statistics
          </Text>
        </TouchableOpacity>
      </View>
      {activeTab === 'history' ? (
        <View
          style={[
            iCashScreenStyles.tabContainer,
            { backgroundColor: colors.backgroundSecondary },
          ]}
        >
          <View style={iCashScreenStyles.searchSection}>
            <View
              style={[
                iCashScreenStyles.searchContainer,
                { borderColor: colors.border },
              ]}
            >
              <MaterialIcons
                name="search"
                size={20}
                color={colors.inputTextHolder}
                style={{ marginHorizontal: 4 }}
              />
              <TextInput
                placeholder="Search history..."
                style={[iCashScreenStyles.searchInput, { color: colors.text }]}
                value={searchQuery}
                placeholderTextColor={colors.inputTextHolder}
                onChangeText={setSearchQuery}
              />
            </View>
            <TouchableOpacity
              style={[
                iCashScreenStyles.filterBtn,
                { backgroundColor: colors.btnColor },
              ]}
              onPress={() => setModalVisible(true)}
            >
              <Text
                style={[
                  iCashScreenStyles.filterBtnText,
                  { color: colors.btnTextColor },
                ]}
              >
                Export to PDF
              </Text>
              <MaterialIcons
                name="insert-drive-file-outlined"
                size={22}
                color={colors.btnTextColor}
              />
            </TouchableOpacity>
          </View>
          <TransactionList
            variant="full"
            limit={15}
            searchQuery={searchQuery}
          />
        </View>
      ) : (
        <TransactionStats data={initialStats} />
      )}

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={iCashScreenStyles.modalOverlay}>
          <View
            style={[
              iCashScreenStyles.modalContent,
              { backgroundColor: colors.backgroundSecondary },
            ]}
          >
            <Text
              style={[
                iCashScreenStyles.modalTitle,
                { color: colors.textDarker },
              ]}
            >
              Export Statement
            </Text>
            <Text style={[iCashScreenStyles.modalSub, { color: colors.text }]}>
              Select date range to receive a PDF via email.
            </Text>
            <View style={iCashScreenStyles.rowDiv}>
              <TouchableOpacity
                style={iCashScreenStyles.dateRow}
                onPress={() => setPickerMode('start')}
              >
                <MaterialIcons
                  name="calendar-month-outlined"
                  size={24}
                  color={colors.text}
                />
                <Text
                  style={[iCashScreenStyles.dateLabel, { color: colors.text }]}
                >
                  Start Date
                </Text>
                <Text
                  style={[iCashScreenStyles.dateValue, { color: colors.text }]}
                >
                  {startDate.toDateString()}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={iCashScreenStyles.dateRow}
                onPress={() => setPickerMode('end')}
              >
                <MaterialIcons
                  name="calendar-month-outlined"
                  size={24}
                  color={colors.text}
                />
                <Text
                  style={[iCashScreenStyles.dateLabel, { color: colors.text }]}
                >
                  End Date
                </Text>
                <Text
                  style={[iCashScreenStyles.dateValue, { color: colors.text }]}
                >
                  {endDate.toDateString()}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={iCashScreenStyles.rowDiv}>
              <TouchableOpacity
                style={[
                  iCashScreenStyles.modalBtn,
                  { borderColor: colors.primary },
                ]}
                onPress={() => setModalVisible(false)}
              >
                <Text
                  style={[
                    iCashScreenStyles.modalBtnText,
                    { color: colors.primary },
                  ]}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  iCashScreenStyles.modalBtn,
                  { backgroundColor: colors.btnColor },
                ]}
                onPress={handleExport}
              >
                {isExporting ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text
                    style={[
                      iCashScreenStyles.modalBtnText,
                      { color: colors.btnTextColor },
                    ]}
                  >
                    Export
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {pickerMode && (
        <DateTimePicker
          value={pickerMode === 'start' ? startDate : endDate}
          mode="date"
          display="spinner"
          onChange={handleDateConfirm}
          maximumDate={new Date()}
        />
      )}
    </ScrollView>
  );
};
export const iCashScreenStyles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 15,
  },
  tabContainer: {
    flex: 1,
  },
  searchSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 15,
    height: 60,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  filterBtn: {
    marginLeft: 15,
    paddingHorizontal: 16,
    borderRadius: 15,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 3,
  },
  customTabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tabItem: {
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTabItem: {
    borderBottomColor: PRIMARY_COLOR,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 20,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 15,
  },
  modalSub: { fontSize: 12, marginBottom: 15 },
  dateRow: {
    alignItems: 'center',
    padding: 15,
    borderRadius: 15,
  },
  dateLabel: { fontSize: 14 },
  dateValue: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  modalBtn: {
    borderRadius: 15,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    alignContent: 'center',
  },
  rowDiv: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  modalBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});