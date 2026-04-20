import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import toastConfig from '../components/ToastConfig';
import { useDispatch } from 'react-redux';
import { useRoute } from '@react-navigation/native';
import { setUser } from '../components/userSlice';
import { TransactionList } from '../components/TransactionHistory';

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
      <TransactionList
        user={user}
        variant="compact"
        limit={5}
        onViewAll={() => navigation.navigate('All Transactions')}
      />
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
});
