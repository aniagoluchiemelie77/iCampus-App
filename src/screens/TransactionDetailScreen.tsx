import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  ActivityIndicator,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import moment from 'moment';
import { useTheme } from '../context/ThemeContext';
import { CurrencyDisplay } from '../components/CurrencyFormatter';
import { Transactions } from '../types/firebase';
import { getTransactionByIdAPI } from '../api/localGetApis';
import { useExchangeRate } from '../hooks/useExchangeRate.ts';
import { useAppSelector } from '../hooks/hooks';
import ViewShot, { captureRef } from 'react-native-view-shot';
import { PageHeader } from '../components/PageHeader';
import Clipboard from '@react-native-clipboard/clipboard';
import Toast from 'react-native-toast-message';
import { IcampusWatermark } from '../assets/styles/Watermark.tsx';
import { EmptyState } from '../components/EmptyFlatlistComponent.tsx';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useConvertedCurrency } from '../hooks/useCurrencyConverter.ts';

export const TransactionDetailScreen = () => {
  const { colors } = useTheme();
  const route = useRoute<any>();
  const navigation = useNavigation();
  const currentUser = useAppSelector((state: any) => state.user) || {};
  const { transactionId } = route.params;

  const [transaction, setTransaction] = useState<Transactions | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const viewShotRef = useRef<any>(null);

  const handleShareReceipt = async () => {
    try {
      const uri = await captureRef(viewShotRef, {
        format: 'png',
        quality: 0.9,
        result: 'tmpfile',
      });
      await Share.share({
        url: uri,
        message: `Transaction Receipt for ${transaction?.reference || 'Transaction'}`,
      });
    } catch (err) {
      console.error('Error capturing or sharing receipt shot: ', err);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadTransactionDetails = async () => {
      setLoading(true);
      const response = await getTransactionByIdAPI(transactionId);
      if (isMounted) {
        if (response.success && response.data) {
          setTransaction(response.data);
        } else {
          setError(response.message || 'Failed to load data.');
        }
        setLoading(false);
      }
    };

    if (transactionId) loadTransactionDetails();
    return () => {
      isMounted = false;
    };
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
      <View
        style={[
          styles.center,
          { backgroundColor: colors.background, padding: 20 },
        ]}
      >
        <EmptyState
          iconName="receipt-long"
          title="Transaction Not Found"
          subtitle={
            error || 'We could not retrieve details for this transaction.'
          }
          buttonText="Go Back"
          onPress={() => navigation.goBack()}
        />
      </View>
    );
  }

  const renderLocalCurrencyRow = () => {
    if (transaction.amount === undefined || transaction.amount === null) {
      return null;
    }
    const viewerCountry = currentUser.country || 'Nigeria';
    const { exchangeData } = useExchangeRate(currentUser.country || 'Nigeria');
    const { code, symbol } = exchangeData;
    const { convertedValue, loading } = useConvertedCurrency(
      transaction.amount,
      transaction.currency || 'NGN',
      viewerCountry,
    );
    if (loading) {
      return (
        <DetailRow label={`Local Value (${code})`} value="Converting..." />
      );
    }

    const formattedAmount = `${symbol}${convertedValue.toLocaleString(
      undefined,
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      },
    )}`;

    return (
      <DetailRow label={`Local Value (${code})`} value={formattedAmount} />
    );
  };

  const isIncome = transaction.payType === 'in';
  const getStatusBadgeStyle = (status?: string) => {
    switch (status) {
      case 'success':
        return { bg: `${colors.success}15`, text: colors.success };
      case 'pending':
        return { bg: '#f59e0b15', text: '#f59e0b' };
      case 'failed':
        return { bg: '#ef444415', text: '#ef4444' };
      default:
        return { bg: `${colors.primary}15`, text: colors.primary };
    }
  };

  const statusStyle = getStatusBadgeStyle(transaction.status);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <PageHeader title="Transaction Detail" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 0.9 }}>
          <IcampusWatermark />
          <View
            style={[
              styles.subContainer,
              { backgroundColor: colors.backgroundSecondary },
            ]}
          >
            {/* Top Icon & Status Badge */}
            <View style={styles.headerTopRow}>
              <View
                style={[
                  styles.iconWrapper,
                  {
                    backgroundColor: isIncome
                      ? `${colors.success}20`
                      : `${colors.primary}20`,
                  },
                ]}
              >
                <MaterialIcons
                  name={isIncome ? 'call-received' : 'call-made'}
                  size={28}
                  color={isIncome ? colors.success : colors.primary}
                />
              </View>

              {transaction.status && (
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: statusStyle.bg },
                  ]}
                >
                  <Text
                    style={[styles.statusText, { color: statusStyle.text }]}
                  >
                    {transaction.status.toUpperCase()}
                  </Text>
                </View>
              )}
            </View>

            <Text
              style={[
                styles.title,
                { color: colors.textDarker || colors.text },
              ]}
            >
              {transaction.title || 'Transaction'}
            </Text>

            <View style={styles.amountContainer}>
              <Text
                style={[
                  styles.sign,
                  { color: isIncome ? colors.success : colors.text },
                ]}
              >
                {isIncome ? '+' : '-'}
              </Text>
              <CurrencyDisplay value={transaction.amount || 0} size="large" />
            </View>

            <Text style={[styles.dateText, { color: colors.text }]}>
              {transaction.createdAt
                ? moment(transaction.createdAt).format(
                    'MMMM DD, YYYY • hh:mm A',
                  )
                : 'N/A'}
            </Text>

            <View style={styles.divider} />

            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Transaction Information
            </Text>

            <View
              style={[
                styles.detailsCard,
                { backgroundColor: colors.background },
              ]}
            >
              <DetailRow
                label="Reference ID"
                value={transaction.reference || 'N/A'}
                copyable
              />

              <DetailRow
                label="Transaction Type"
                value={
                  transaction.type ? transaction.type.toUpperCase() : 'N/A'
                }
              />

              <DetailRow
                label="Currency"
                value={transaction.currency || 'N/A'}
              />

              {renderLocalCurrencyRow()}

              {transaction.metadata?.note ? (
                <DetailRow
                  label="Note / Description"
                  value={transaction.metadata.note}
                />
              ) : null}
            </View>

            <TouchableOpacity
              style={[
                styles.shareButton,
                { backgroundColor: colors.btnColor || colors.primary },
              ]}
              onPress={handleShareReceipt}
              activeOpacity={0.8}
            >
              <MaterialIcons
                name="share"
                size={18}
                color={colors.btnTextColor || '#fff'}
                style={{ marginRight: 8 }}
              />
              <Text
                style={[
                  styles.shareButtonText,
                  { color: colors.btnTextColor || '#fff' },
                ]}
              >
                Share Receipt Image
              </Text>
            </TouchableOpacity>
          </View>
        </ViewShot>
      </ScrollView>
    </View>
  );
};

const DetailRow = ({
  label,
  value,
  copyable,
}: {
  label: string;
  value: string;
  copyable?: boolean;
}) => {
  const { colors } = useTheme();
  const handleCopy = () => {
    Clipboard.setString(value);
    Toast.show({
      type: 'info',
      text1: 'Copied!',
      text2: `${label} has been copied to clipboard.`,
    });
  };

  return (
    <View style={[styles.row, { borderBottomColor: `${colors.text}10` }]}>
      <Text style={[styles.rowLabel, { color: colors.text, opacity: 0.7 }]}>
        {label}
      </Text>
      <View style={styles.rowValueContainer}>
        <Text
          style={[styles.rowValue, { color: colors.text }]}
          numberOfLines={2}
        >
          {value}
        </Text>
        {copyable && (
          <TouchableOpacity
            style={{ marginLeft: 6 }}
            onPress={handleCopy}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialIcons
              name="content-copy"
              size={14}
              color={colors.primary}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: {
    marginHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 40,
  },
  subContainer: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  headerTopRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconWrapper: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  dateText: { fontSize: 13, opacity: 0.6, marginBottom: 20 },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  sign: { fontSize: 26, fontWeight: '700', marginRight: 2 },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginVertical: 16,
  },
  sectionTitle: {
    width: '100%',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    opacity: 0.7,
  },
  detailsCard: {
    width: '100%',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 24,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  rowLabel: { fontSize: 13 },
  rowValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '60%',
  },
  rowValue: { fontSize: 13, fontWeight: '600', textAlign: 'right' },
  shareButton: {
    flexDirection: 'row',
    width: '100%',
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  shareButtonText: { fontSize: 14, fontWeight: '600' },
});
