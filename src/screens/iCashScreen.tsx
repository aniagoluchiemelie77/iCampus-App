import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useAppSelector } from '../components/hooks';
import {
  PRIMARY_COLOR,
  PRIMARY_COLOR_TINT,
} from '@components/Classroomcomponent';
import { baseUrl } from '@components/HomeScreenComponents';
import { User, Transactions } from 'types/firebase';
import moment from 'moment';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import toastConfig from '../components/ToastConfig';
import { useDispatch } from 'react-redux';
import { useRoute } from '@react-navigation/native';
import { setUser } from '../components/userSlice';

const ActionButton = ({
  icon,
  label,
  onPress,
}: {
  icon: string;
  label: string;
  onPress: () => void;
}) => (
  <TouchableOpacity style={iCashScreenStyles.actionButton} onPress={onPress}>
    <View style={iCashScreenStyles.actionIconContainer}>
      <Icon name={icon} size={24} color={PRIMARY_COLOR} />
    </View>
    <Text style={iCashScreenStyles.actionLabel}>{label}</Text>
  </TouchableOpacity>
);
export const TransactionHistory = ({
  user,
  refresh,
}: {
  user: User;
  refresh: boolean;
}) => {
  const navigation = useNavigation<any>();
  const [history, setHistory] = useState<Transactions[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchICashData = useCallback(async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('accessToken');
      const response = await fetch(
        `${baseUrl}user/my-transactions/${user.uid}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const json = await response.json();
      if (json.success) {
        setHistory(json.data);
      }
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: 'Fetch Error',
        text2: err?.message || 'Could not load transaction details.',
      });
    } finally {
      setLoading(false);
    }
  }, [user.uid]);
  useEffect(() => {
    fetchICashData();
  }, [fetchICashData, refresh]);

  const groupTransactions = (transactions: Transactions[]) => {
    const groups: { [key: string]: Transactions[] } = {};

    transactions.forEach(item => {
      const date = moment(item.createdAt);
      let dateLabel = '';

      if (date.isSame(moment(), 'day')) {
        dateLabel = 'Today';
      } else if (date.isSame(moment().subtract(1, 'day'), 'day')) {
        dateLabel = 'Yesterday';
      } else {
        dateLabel = date.format('MMMM D, YYYY');
      }

      if (!groups[dateLabel]) groups[dateLabel] = [];
      groups[dateLabel].push(item);
    });

    return groups;
  };

  const groupedData = groupTransactions(history);
  if (loading) {
    return (
      <View style={{ padding: 20, alignItems: 'center' }}>
        <ActivityIndicator size="small" color={PRIMARY_COLOR} />
        <Text
          style={{ marginTop: 10, color: PRIMARY_COLOR_TINT, fontSize: 12 }}
        >
          Fetching transactions...
        </Text>
      </View>
    );
  }
  return (
    <View style={iCashScreenStyles.historyContainer}>
      <View style={iCashScreenStyles.historyHeader}>
        <Text style={iCashScreenStyles.sectionTitle}>Recent Transactions</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('All Transactions')}
        >
          <Text style={{ color: PRIMARY_COLOR, fontWeight: 'bold' }}>
            View All
          </Text>
        </TouchableOpacity>
      </View>

      {Object.keys(groupedData).map(date => (
        <View key={date} style={iCashScreenStyles.transactionItemContainer}>
          <Text style={iCashScreenStyles.dateGroupTitle}>{date}</Text>
          {groupedData[date].map(item => (
            <View
              key={item.transactionId}
              style={iCashScreenStyles.transactionItem}
            >
              <View style={iCashScreenStyles.iconBackground}>
                <Icon
                  name={
                    item.payType === 'in'
                      ? 'arrow-bottom-left'
                      : 'arrow-top-right'
                  }
                  size={22}
                  color={PRIMARY_COLOR}
                />
              </View>

              <View style={{ flex: 1, marginLeft: 15 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={iCashScreenStyles.transactionTitle}>
                    {item.title}
                  </Text>
                  <Text style={iCashScreenStyles.transactionTime}>
                    {moment(item.createdAt).format('hh:mm A')}
                  </Text>
                </View>
              </View>

              <Text style={iCashScreenStyles.transactionAmount}>
                {item.payType === 'in' ? '+' : '-'}
                {item.amountICash}
              </Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
};
export const ICashDashboard = () => {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const dispatch = useDispatch();
  const user = useAppSelector(state => state.user);
  const [showBalance, setShowBalance] = useState(true);
  const balance = user.pointsBalance || 0;
  const [integer, decimal] = balance.toFixed(2).split('.');

  const handleBuy = () => navigation.navigate('ICashBuyPage');
  const handleWithdraw = () => navigation.navigate('ICashWithdrawPage');
  const handleP2P = () => navigation.navigate('IcashP2PScreen');
  const needsRefresh = (route.params as any)?.refresh;

  const refreshUserData = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      const response = await fetch(`${baseUrl}user/my-profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        dispatch(setUser(data.user));
      }
    } catch (e) {
      console.log('Refresh failed', e);
    }
  }, [dispatch]);

  // 2. Now the effect is stable
  useEffect(() => {
    if (needsRefresh) {
      const timer = setTimeout(() => {
        refreshUserData();
        navigation.setParams({ refresh: undefined } as any);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [needsRefresh, refreshUserData, navigation]);
  useEffect(() => {
    if (!user.twoFactorEnabled) {
      navigation.navigate('iCash Biometrics');
    }
  }, [navigation, user.twoFactorEnabled]);

  return (
    <ScrollView style={iCashScreenStyles.container}>
      <LinearGradient
        colors={['#3b2115', '#5a3c2e', '#e05515']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={iCashScreenStyles.iCashCard}
      >
        <View style={iCashScreenStyles.cardHeader}>
          <View>
            <Text style={iCashScreenStyles.cardLabel}>iCash Balance</Text>
            <Text style={iCashScreenStyles.userName}>
              {user.firstname?.toUpperCase()} {user.lastname?.toUpperCase()}
            </Text>
          </View>
          <Icon name="chip" size={38} color="#e0c8bd" />
        </View>
        <View style={iCashScreenStyles.balance}>
          <View style={iCashScreenStyles.balanceContainer}>
            <Icon
              name="diamond"
              size={32}
              color="#fff"
              style={iCashScreenStyles.diamondShadow}
            />
            {showBalance ? (
              <Text style={iCashScreenStyles.balanceValue}>
                {integer}
                <Text style={iCashScreenStyles.decimalValue}>.{decimal}</Text>
              </Text>
            ) : (
              <Text
                style={[iCashScreenStyles.balanceValue, { letterSpacing: 2 }]}
              >
                ****
              </Text>
            )}
          </View>
          <TouchableOpacity onPress={() => setShowBalance(!showBalance)}>
            <Icon
              name={showBalance ? 'eye-outline' : 'eye-off-outline'}
              size={24}
              color="#fff"
              style={iCashScreenStyles.balanceHideBtn}
            />
          </TouchableOpacity>
        </View>
      </LinearGradient>
      <View style={iCashScreenStyles.actionRow}>
        <ActionButton
          icon="plus-circle"
          label="Buy iCash"
          onPress={handleBuy}
        />
        <ActionButton
          icon="bank-transfer-out"
          label="Withdraw"
          onPress={handleWithdraw}
        />
        <ActionButton icon="send" label="Transfer" onPress={handleP2P} />
      </View>
      <TransactionHistory user={user} refresh={!!needsRefresh} />
      <Toast config={toastConfig} />
    </ScrollView>
  );
};
export const iCashScreenStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  iCashCard: {
    margin: 20,
    padding: 25,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    height: 220,
    justifyContent: 'space-between',
    elevation: 10,
    shadowColor: '#e05515',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    width: '100%',
  },
  cardLabel: {
    color: '#e0c8bd',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.2,
  },
  userName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 5,
  },
  balanceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  balance: {
    marginVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  balanceValue: {
    color: '#fff',
    fontSize: 42,
    fontWeight: 'bold',
    marginLeft: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  balanceHideBtn: {
    marginLeft: 7,
  },
  decimalValue: {
    fontSize: 22,
    color: '#fff',
  },
  diamondShadow: {
    textShadowColor: '#e05515',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nairaEquivalent: {
    color: '#cbd5e1',
    fontSize: 16,
    fontWeight: '500',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    marginHorizontal: 20,
    borderRadius: 15,
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIconContainer: {
    backgroundColor: PRIMARY_COLOR_TINT,
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 12,
    color: PRIMARY_COLOR,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#321e15',
  },
  historyContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
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
  // Statistics Styling (for the "In vs Out" section)
  dateGroupTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: PRIMARY_COLOR,
    textTransform: 'capitalize',
    letterSpacing: 1,
    marginBottom: 10,
    marginTop: 5,
  },
  transactionTime: {
    fontSize: 11,
    color: '#cb8d6e',
    marginLeft: 8,
    fontWeight: '400',
  },
  transactionItemContainer: {
    marginBottom: 10,
  },
});
