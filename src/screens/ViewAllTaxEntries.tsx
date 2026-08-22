import React, { useState, useEffect, useCallback } from 'react';
import { 
    View, 
    Text, 
    TouchableOpacity, 
    StyleSheet, 
    FlatList, 
    Modal, 
    ActivityIndicator, 
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../context/ThemeContext';
import { PageHeader } from '../components/PageHeader'; 
import { CurrencyDisplay } from '../components/CurrencyFormatter';
import {TaxEntry} from '../types/firebase';
import {fetchTaxReport, fetchTaxEntries} from '../api/localGetApis';
import Toast from 'react-native-toast-message';
import { Picker } from '@react-native-picker/picker';
import { CustomButton } from '../assets/components/AppUIComponents';

export const AllTaxEntriesScreen = () => {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>('01');
  const [selectedYear, setSelectedYear] = useState<string>('2026');
  const [isDownloading, setIsDownloading] = useState(false);
  const [items, setItems] = useState<TaxEntry[]>([]);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [isFetchingMore, setIsFetchingMore] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const months = [
    { label: 'January', value: '01' },
    { label: 'February', value: '02' },
    { label: 'March', value: '03' },
    { label: 'April', value: '04' },
    { label: 'May', value: '05' },
    { label: 'June', value: '06' },
    { label: 'July', value: '07' },
    { label: 'August', value: '08' },
    { label: 'September', value: '09' },
    { label: 'October', value: '10' },
    { label: 'November', value: '11' },
    { label: 'December', value: '12' },
  ];
  const currentYear = new Date().getFullYear();
  const years = Array.from(
    { length: Math.max(5, currentYear - 2025 + 1) },
    (_, index) => {
      const yearStr = String(2026 + index);
      return { label: yearStr, value: yearStr };
    },
  );
  const handleDownloadSubmit = async () => {
    setIsDownloading(true);
    const response = await fetchTaxReport(selectedMonth, selectedYear);
    setIsDownloading(false);
    if (response.success) {
      setIsModalVisible(false);
      Toast.show({
        type: 'success',
        text2: 'The tax report has been generated and will be sent via email.',
      });
    } else {
      Toast.show({
        type: 'error',
        text1: 'Fetch Error',
        text2: response.message || 'Error fetching tax entries, please retry',
      });
    }
  };
  const loadData = useCallback(
    async (targetPage: number, isRefresh = false) => {
      if (isRefresh) {
        setIsLoading(true);
      } else {
        setIsFetchingMore(true);
      }

      const response = await fetchTaxEntries(targetPage, 10);

      if (response.success) {
        const fetchedData = response.data?.items || response.data || [];
        setItems(prev => (isRefresh ? fetchedData : [...prev, ...fetchedData]));
        setTotalPages(response.totalPages || 1);
      } else {
        Toast.show({
          type: 'error',
          text1: 'Fetch Error',
          text2: response.message,
        });
      }

      setIsLoading(false);
      setIsFetchingMore(false);
    },
    [],
  );

  useEffect(() => {
    loadData(1, true);
  }, [loadData]);

  const handleLoadMore = () => {
    if (!isFetchingMore && page < totalPages) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadData(nextPage, false);
    }
  };

  const renderItem = ({ item }: { item: TaxEntry }) => {
    const handlePress = () => {
      if (
        item.taxType !== 'product_tax' &&
        item.sourceDetails?.relatedTransactionId
      ) {
        navigation.navigate('TransactionDetail', {
          transactionId: item.sourceDetails.relatedTransactionId,
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
            style={[styles.rowText, { color: colors.text, fontWeight: '600' }]}
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
          <CurrencyDisplay value={item.amount} size="small" isSuccess={true} />
        </View>
        <Text style={[styles.dateText, { color: colors.text }]}>
          {item.date ? new Date(item.date).toLocaleDateString() : ''}
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader
        title="iCampus Tax Entries"
        subtitle="All recorded tax transactions"
        showBackButton={true}
        rightElement={
          <CustomButton
            title="Download"
            onPress={handleDownloadSubmit}
            style={[styles.downloadButton]}
            iconName="file-download"
            iconColor="#fff"
          />
        }
      />
      {isLoading ? (
        <View
          style={[
            styles.loaderContainer,
            { backgroundColor: colors.backgroundSecondary },
          ]}
        >
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={(item, index) =>
            `${item.transactionReference}-${index}`
          }
          contentContainerStyle={styles.listContainer}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={{ color: colors.text }}>No tax entries found.</Text>
            </View>
          }
        />
      )}
      <Modal
        visible={isModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.backgroundSecondary },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.textDarker }]}>
              Select Period to Download
            </Text>

            <Text style={[styles.label, { color: colors.text }]}>Month</Text>
            <View
              style={[
                styles.pickerContainer,
                {
                  backgroundColor: colors.backgroundSecondary,
                  borderColor: colors.border,
                },
              ]}
            >
              <Picker
                selectedValue={selectedMonth}
                onValueChange={itemValue => setSelectedMonth(itemValue)}
                style={{ color: colors.text }}
                dropdownIconColor={colors.primary}
              >
                {months.map(m => (
                  <Picker.Item key={m.value} label={m.label} value={m.value} />
                ))}
              </Picker>
            </View>

            {/* Year Selector */}
            <Text style={[styles.label, { color: colors.text }]}>Year</Text>
            <View
              style={[
                styles.pickerContainer,
                {
                  backgroundColor: colors.backgroundSecondary,
                  borderColor: colors.border,
                },
              ]}
            >
              <Picker
                selectedValue={selectedYear}
                onValueChange={itemValue => setSelectedYear(itemValue)}
                style={{ color: colors.text }}
                dropdownIconColor={colors.primary}
              >
                {years.map(y => (
                  <Picker.Item key={y.value} label={y.label} value={y.value} />
                ))}
              </Picker>
            </View>

            {/* Action Button */}
            <CustomButton
              title={isDownloading ? 'Downloading...' : 'Download'}
              style={[
                styles.actionButton,
                { backgroundColor: colors.btnColor },
              ]}
              onPress={handleDownloadSubmit}
              disabled={isDownloading}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 15,
  },
  listContainer: {
    padding: 16,
  },
  row: {
    padding: 15,
    borderRadius: 15,
    borderBottomWidth: 1,
  },
  rowDiv: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 7,
  },
  rowText: {
    fontSize: 14,
  },
  dateText: {
    fontSize: 12,
    alignSelf: 'flex-end',
  },
  downloadButton: {
    paddingHorizontal: 15,
    width: 'auto',
  },
  downloadButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 3,
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
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
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 15,
  },
  pickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 6,
  },
  actionButton: {
    paddingVertical: 12,
    width: '80%',
    borderRadius: 15,
    alignSelf: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  pickerContainer: {
    borderWidth: 1,
    borderRadius: 10,
    overflow: 'hidden',
    justifyContent: 'center',
    marginBottom: 15,
  },
  loaderContainer: {
    flex: 1,
    padding: 30,
  },
});