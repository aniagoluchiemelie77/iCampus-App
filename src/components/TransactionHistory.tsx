import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
  FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Transactions } from 'types/firebase';
import moment from 'moment';
import { getMyTransactions } from '../api/localGetApis';
import Toast from 'react-native-toast-message';
import { useTheme } from '../context/ThemeContext';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { CurrencyDisplay } from './CurrencyFormatter';

interface Props {
  refresh?: boolean;
  limit?: number;
  variant: 'compact' | 'full';
  onViewAll?: () => void;
  searchQuery?: string;
}
export const TransactionList = ({
  refresh,
  limit = 5,
  variant,
  onViewAll,
  searchQuery,
}: Props) => {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const [history, setHistory] = useState<Transactions[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchingMore, setFetchingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);

  const fetchTransactions = useCallback(
    async (pageNum: number, isInitial: boolean) => {
      try {
        if (isInitial) setLoading(true);
        else setFetchingMore(true);
        const response = await getMyTransactions({
          page: pageNum,
          limit: limit,
          searchQuery: searchQuery,
        });

        if (response.success) {
          const json = response.data;
          if (isInitial) {
            setHistory(json.data);
          } else {
            setHistory(prev => [...prev, ...json.data]);
          }
          setHasNextPage(json.pagination.hasNextPage);
        } else {
          console.error(response.error);
        }
        setLoading(false);
        setFetchingMore(false);
      } catch (err: any) {
        console.error(err);
        Toast.show({
          type: 'error',
          text1: err.message || "Couldn't fetch transaction history",
        });
      } finally {
        setLoading(false);
        setFetchingMore(false);
      }
    },
    [limit, searchQuery],
  );

  useEffect(() => {
    setPage(1);
    fetchTransactions(1, true);
  }, [fetchTransactions, refresh]);

  const loadMore = () => {
    if (!fetchingMore && hasNextPage && variant === 'full') {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchTransactions(nextPage, false);
    }
  };
  const renderFooter = useCallback(() => {
    if (!fetchingMore) return null;

    return (
      <View style={{ paddingVertical: 20 }}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }, [fetchingMore, colors.primary]);
  const renderItem = useCallback(
    ({ item }: { item: any }) => (
      <TouchableOpacity
        onPress={() =>
          navigation.navigate('TransactionDetail', {
            transactionId: item.transactionId,
          })
        }
        style={[
          styles.transactionItem,
          { backgroundColor: colors.backgroundSecondary },
        ]}
      >
        <MaterialIcons
          name={item.payType === 'in' ? 'call-received' : 'call-made'}
          size={22}
          color={item.payType === 'in' ? colors.success : colors.primary}
        />
        <View style={styles.transactionTitleDiv}>
          <Text
            style={[styles.transactionTitle, { color: colors.text }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {item.title}
          </Text>
          <Text style={[styles.transactionTime, { color: colors.text }]}>
            {moment(item.createdAt).format('hh:mm A')}
          </Text>
        </View>
        <CurrencyDisplay
          value={item.amountICash}
          size="small"
          isSuccess={item.payType === 'in' ? true : false}
        />
      </TouchableOpacity>
    ),
    [navigation, colors],
  );

  if (loading)
    return (
      <ActivityIndicator
        size="large"
        color={colors.primary}
        style={{ margin: 20 }}
      />
    );

  return (
    <View style={styles.historyContainer}>
      {variant === 'compact' && (
        <View
          style={[
            styles.historyHeader,
            { backgroundColor: colors.backgroundSecondary },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Recent Transactions
          </Text>
          <TouchableOpacity
            onPress={onViewAll}
            style={[{ backgroundColor: colors.btnColor }, styles.btnStyles]}
          >
            <Text style={[styles.btnText, { color: colors.btnTextColor }]}>
              View All
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={history}
        renderItem={renderItem}
        keyExtractor={item => item.transactionId}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        scrollEnabled={variant === 'full'}
        ListFooterComponent={renderFooter}
      />
    </View>
  );
};
export const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  btnStyles: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    alignContent: 'center',
  },
  btnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  historyContainer: {
    paddingBottom: 20,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    padding: 15,
    borderRadius: 15,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
  },
  transactionTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  transactionTime: {
    fontSize: 11,
    marginTop: 4,
  },
  transactionTitleDiv: {
    flex: 1,
    marginLeft: 15,
  },
});