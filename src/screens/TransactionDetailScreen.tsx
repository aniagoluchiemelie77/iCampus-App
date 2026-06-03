import React, {useState, useEffect} from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Share, ActivityIndicator } from 'react-native';
import { 
    useRoute, 
 } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import moment from 'moment';
import { useTheme } from '../context/ThemeContext';
import { CurrencyDisplay } from '../components/CurrencyFormatter';
import {Transactions} from '../types/firebase';
import {getTransactionByIdAPI} from '../api/localGetApis';
import { PRIMARY_COLOR_TINT } from 'assets/styles/colors';
import { getCurrencyDetails } from '../utils/UserTransactionsHelpers';
import { useAppSelector } from '../components/hooks';
import { PageHeader } from '../components/PageHeader';

export const TransactionDetailScreen = () => {
  const { colors } = useTheme();
  const route = useRoute<any>();
  const currentUser = useAppSelector(state => state.user);
  const { transactionId } = route.params;
  const [transaction, setTransaction] = useState<Transactions | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTransactionDetails = async () => {
      setLoading(true);
      setError(null);
      const response = await getTransactionByIdAPI(transactionId);
      
      if (response.success && response.data) {
        setTransaction(response.data);
      } else {
        setError(response.message || "Failed to load transaction data.");
      }
      setLoading(false);
    };

    if (transactionId) {
      loadTransactionDetails();
    }
  }, [transactionId]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !transaction) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.primary, marginBottom: 12 }}>{error || "No data available"}</Text>
      </View>
    );
  }
  const renderLocalCurrencyRow = () => {
    if (!transaction || transaction.amountLocal === undefined || transaction.amountLocal === null) {
      return null;
    }
    const { code, symbol } = getCurrencyDetails(currentUser.country!);
    const formattedAmount = `${symbol}${transaction.amountLocal.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

    return (
      <DetailRow 
        label={`Local Value (${code})`} 
        value={formattedAmount} 
      />
    );
  };

  const isIncome = transaction.payType === 'in';

  const handleShareReceipt = async () => {
    try {
      await Share.share({
        message: `Transaction Receipt\nTitle: ${transaction.title}\nRef: ${transaction.reference}\nAmount: ${transaction.amountICash} iCash\nStatus: ${transaction.status!.toUpperCase()}`,
      });
    } catch (err) {
      console.error("Error sharing receipt: ", err);
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader title="Transaction Detail" />
      <View style={[styles.subContainer, { backgroundColor: colors.backgroundSecondary }]}>
        <MaterialIcons
            name={isIncome ? 'call-received' : 'call-made'}
            size={40}
            color={isIncome ? colors.success : colors.primary}
        />
        <Text style={[styles.title, { color: colors.textDarker }]}>{transaction.title || "Transaction"}</Text>
        <View style={styles.amountContainer}>
          <Text style={[styles.sign, { color: isIncome ? colors.success : colors.text }]}>
            {isIncome ? '+' : '-'}
          </Text>
          <CurrencyDisplay
            value={transaction.amountICash || 0}
            size="large"
            isSuccess={isIncome}
          />
        </View>
        <Text style={[styles.dateText, { color: colors.text }]}>
          {moment(transaction.createdAt).format('MMMM DD, YYYY - hh:mm A')}
        </Text>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Transaction Details</Text>
      
      <View style={styles.detailsCard}>
        <DetailRow label="Reference ID" value={transaction.reference || 'N/A'} copyable />
        
        {renderLocalCurrencyRow()}

        {transaction.type === 'p2p_sent' && transaction.metadata?.recipientItag && (
          <DetailRow label="Recipients iTag username" value={`@${transaction.metadata.recipientItag}`} copyable />
        )}

        {transaction.type === 'p2p_received' && transaction.metadata?.senderItag && (
          <DetailRow label="Sender iTag username" value={`@${transaction.metadata.senderItag}`} copyable />
        )}


        {transaction.metadata?.note ? (
          <DetailRow label="Note / Description" value={transaction.metadata.note} />
        ) : null}
      </View>

      <TouchableOpacity 
        style={[styles.shareButton, { backgroundColor: colors.primary }]} 
        onPress={handleShareReceipt}
      >
        <MaterialIcons name="share" size={20} color="#FFF" style={{ marginRight: 8 }} />
        <Text style={styles.shareButtonText}>Share Receipt</Text>
      </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const DetailRow = ({ label, value, copyable }: { label: string; value: string; copyable?: boolean }) => {
  const { colors } = useTheme();
  
  return (
    <View style={[styles.row, { borderBottomColor: `${colors.text}10` }]}>
      <Text style={[styles.rowLabel, { color: colors.text }]}>{label}</Text>
      <View style={styles.rowValueContainer}>
        <Text style={[styles.rowValue, { color: colors.text }]} numberOfLines={2}>
          {value}
        </Text>
        {copyable && (
          <TouchableOpacity style={{ marginLeft: 6 }}>
            <MaterialIcons name="content-copy" size={14} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 15, alignContent: 'center' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  subContainer: {
    borderRadius: 15,
    padding: 20,
    alignContent: 'center',
    shadowColor: PRIMARY_COLOR_TINT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  title: { fontSize: 18, fontWeight: '600', marginVertical: 15 },
  dateText: { fontSize: 12, opacity: 0.6, marginBottom: 15 },
  amountContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  sign: { fontSize: 24, fontWeight: 'bold', marginRight: 3 },
  sectionTitle: { fontSize: 14, fontWeight: '600', marginBottom: 15 },
  detailsCard: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 24,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  rowLabel: { fontSize: 14, },
  rowValueContainer: { flexDirection: 'row', alignItems: 'center', maxWidth: '65%' },
  rowValue: { fontSize: 14, fontWeight: '500', textAlign: 'right' },
  shareButton: {
    flexDirection: 'row',
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  shareButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
});