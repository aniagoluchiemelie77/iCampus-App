import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
  FlatList
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import {
  PRIMARY_COLOR,
  PRIMARY_COLOR_TINT,
} from '@components/Classroomcomponent';
import { baseUrl } from '@components/HomeScreenComponents';
import { Transactions } from 'types/firebase';
import moment from 'moment';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import toastConfig from '../components/ToastConfig';
import { User } from 'types/firebase';

interface Props {
  user: User;
  refresh?: boolean;
  limit?: number; 
  variant: 'compact' | 'full'; 
  onViewAll?: () => void;
  searchQuery?: string;
}
export const TransactionList = ({ user, refresh, limit = 5, variant, onViewAll, searchQuery }: Props) => {
  const navigation = useNavigation<any>();
  const [history, setHistory] = useState<Transactions[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchingMore, setFetchingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);

  const fetchTransactions = useCallback(async (pageNum: number, isInitial: boolean) => {
    try {
      if (isInitial) setLoading(true);
      else setFetchingMore(true);
      const token = await AsyncStorage.getItem('accessToken');
      let url = `${baseUrl}user/my-transactions/${user.uid}?page=${pageNum}&limit=${limit}`;
    if (searchQuery) {
      url += `&search=${encodeURIComponent(searchQuery)}`;
    }

    const response = await fetch(url, { 
      headers: { Authorization: `Bearer ${token}` } 
    });
      const json = await response.json();
      if (json.success) {
        if (isInitial) {
          setHistory(json.data);
        } else {
          setHistory(prev => [...prev, ...json.data]);
        }
        setHasNextPage(json.pagination.hasNextPage);
      }
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
  }, [user.uid, limit, searchQuery]);

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
      <ActivityIndicator size="small" color={PRIMARY_COLOR} />
    </View>
  );
}, [fetchingMore]);
  const renderItem = useCallback(({ item }: { item: any }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('TransactionDetailScreen', { transaction: item })}
      style={styles.transactionItem}
    >
      <View style={styles.iconBackground}>
        <Icon
          name={item.payType === 'in' ? 'arrow-bottom-left' : 'arrow-top-right'}
          size={22}
          color={item.payType === 'in' ? '#4CAF50' : PRIMARY_COLOR}
        />
      </View>
      <View style={{ flex: 1, marginLeft: 15 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={styles.transactionTitle}>{item.title}</Text>
          <Text style={styles.transactionTime}>
            {moment(item.createdAt).format('hh:mm A')}
          </Text>
        </View>
      </View>
      <Text style={[
        styles.transactionAmount, 
        { color: item.payType === 'in' ? '#4CAF50' : PRIMARY_COLOR }
      ]}>
        {item.payType === 'in' ? '+' : '-'}{item.amountICash}
      </Text>
    </TouchableOpacity>
  ), [navigation]);

  if (loading) return <ActivityIndicator size="small" color={PRIMARY_COLOR} style={{ margin: 20 }} />;

  return (
    <View style={styles.historyContainer}>
      {variant === 'compact' && (
        <View style={styles.historyHeader}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          <TouchableOpacity onPress={onViewAll}>
            <Text style={{ color: PRIMARY_COLOR, fontWeight: 'bold' }}>View All</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={history}
        renderItem={renderItem}
        keyExtractor={(item) => item.transactionId}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        scrollEnabled={variant === 'full'} 
        ListFooterComponent={renderFooter}
      />
      <Toast config={toastConfig} />
    </View>
  );
};
export const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
  },
  historyContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingVertical: 15,
    paddingHorizontal: 10,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f9f2ef',
  },
  iconBackground: {
    backgroundColor: '#e1c4b8',
    padding: 10,
    borderRadius: 12,
  },
  transactionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: PRIMARY_COLOR,
  },
  transactionDate: {
    fontSize: 12,
    color: PRIMARY_COLOR_TINT,
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: PRIMARY_COLOR,
  },
  transactionTime: {
    fontSize: 11,
    color: '#cb8d6e',
    marginLeft: 8,
    fontWeight: '400',
  },
});