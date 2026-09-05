import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Text,
  Modal,
  ScrollView,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Toast from 'react-native-toast-message';
import { exportTransactionsAPI } from '../api/localPostApis.ts';
import { TransactionList } from '../components/TransactionHistory';
import { PRIMARY_COLOR_TINT } from '../assets/styles/colors.ts';
import { PageHeader } from '../components/PageHeader.tsx';
import { useTheme } from '../context/ThemeContext';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { CustomButton } from '../assets/components/AppUIComponents.tsx';

export const AllTransactionsScreen = ({ route }: any) => {
  const { colors } = useTheme();
  const { user } = route.params;
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [endDate, setEndDate] = useState(new Date());
  const [pickerMode, setPickerMode] = useState<'start' | 'end' | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);

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
      const result = await exportTransactionsAPI({
        userId: user.uid,
        startDate: startDate,
        endDate: endDate,
      });
      setIsExporting(false);
      if (result.success) {
        setModalVisible(false);
        Toast.show({
          type: 'success',
          text1: 'Processing',
          text2: result.message,
        });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Export Failed',
          text2: result.message,
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
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  return (
    <View
      style={[
        iCashScreenStyles.container,
        { backgroundColor: colors.background },
      ]}
    >
      <PageHeader title="Transaction History" />
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
          style={{ marginRight: 7 }}
        />
        <TextInput
          placeholder="Search history..."
          style={[iCashScreenStyles.searchInput, { color: colors.text }]}
          value={debouncedQuery}
          placeholderTextColor={colors.inputTextHolder}
          onChangeText={setSearchQuery}
        />
      </View>
      <View style={iCashScreenStyles.searchSection}>
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
            name="insert-drive-file"
            size={22}
            color={colors.btnTextColor}
          />
        </TouchableOpacity>
      </View>
      <View
        style={{
          marginHorizontal: 15,
          backgroundColor: colors.backgroundSecondary,
        }}
      >
        <TransactionList variant="full" limit={15} searchQuery={searchQuery} />
      </View>
      <Modal visible={modalVisible} transparent animationType="slide">
        <TouchableOpacity
          style={iCashScreenStyles.modalOverlay}
          onPress={() => setModalVisible(false)}
        >
          <View
            style={[
              iCashScreenStyles.modalContent,
              { backgroundColor: colors.backgroundSecondary },
            ]}
          >
            <MaterialIcons
              name="access-time"
              size={60}
              color={colors.primary}
            />
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
                  name="calendar-month"
                  size={24}
                  color={colors.primary}
                />
                <Text
                  style={[iCashScreenStyles.dateLabel, { color: colors.text }]}
                >
                  Start Date
                </Text>
                <Text
                  style={[
                    iCashScreenStyles.dateValue,
                    { color: colors.primary },
                  ]}
                >
                  {startDate.toDateString()}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={iCashScreenStyles.dateRow}
                onPress={() => setPickerMode('end')}
              >
                <MaterialIcons
                  name="calendar-month"
                  size={24}
                  color={colors.primary}
                />
                <Text
                  style={[iCashScreenStyles.dateLabel, { color: colors.text }]}
                >
                  End Date
                </Text>
                <Text
                  style={[
                    iCashScreenStyles.dateValue,
                    { color: colors.primary },
                  ]}
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
              <CustomButton
                title={isExporting ? 'Exporting...' : 'Export'}
                style={[iCashScreenStyles.modalBtnMain]}
                onPress={handleExport}
                disabled={isExporting}
              />
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
      {pickerMode && (
        <DateTimePicker
          testID="dateTimePicker"
          value={pickerMode === 'start' ? startDate : endDate}
          mode="date"
          display="default"
          onChange={handleDateConfirm}
          maximumDate={new Date()}
        />
      )}
    </View>
  );
};
export const iCashScreenStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchSection: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 20,
    marginHorizontal: 15,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    height: 50,
    borderWidth: 1,
    marginHorizontal: 15,
    paddingHorizontal: 15,
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    backgroundColor: 'transparent',
  },
  filterBtn: {
    paddingHorizontal: 15,
    borderRadius: 10,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    width: 'auto',
  },
  filterBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 3,
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
    padding: 25,
    paddingBottom: 40,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginVertical: 25,
  },
  modalSub: { fontSize: 14, marginBottom: 20, lineHeight: 20 },
  dateRow: {
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: PRIMARY_COLOR_TINT,
  },
  dateLabel: { fontSize: 14, marginVertical: 4 },
  dateValue: { fontSize: 12, fontWeight: '600' },
  modalBtn: {
    borderRadius: 10,
    paddingHorizontal: 15,
    height: 50,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: 'auto',
  },
  modalBtnMain: {
    paddingHorizontal: 15,
    width: 'auto',
  },
  rowDiv: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 20,
    width: '80%',
  },
  modalBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});
