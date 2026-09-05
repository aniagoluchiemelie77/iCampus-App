import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useAppSelector } from '../hooks/hooks';
import {
  PRIMARY_COLOR,
  DEFAULT_GRADIENT,
  PRIMARY_COLOR_TINT_MAIN,
} from '../assets/styles/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch } from 'react-redux';
import { useRoute } from '@react-navigation/native';
import { setUser } from '../context/UserSlice';
import { TransactionList } from '../components/TransactionHistory';
import { refreshUserProfileAPI } from '../api/localGetApis';
import { useTheme } from '../context/ThemeContext';

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
    <MaterialIcons name={icon} size={24} color={PRIMARY_COLOR_TINT_MAIN} />
    <Text
      style={[
        iCashScreenStyles.actionLabel,
        { color: PRIMARY_COLOR_TINT_MAIN },
      ]}
    >
      {label}
    </Text>
  </TouchableOpacity>
);
export const ICashDashboard = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute();
  const dispatch = useDispatch();
  const user = useAppSelector(state => state.user) || {};
  const [showBalance, setShowBalance] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { integer, decimal } = useMemo(() => {
    const [i, d] = (user.pointsBalance || 0).toFixed(2).split('.');
    return { integer: i, decimal: d };
  }, [user.pointsBalance]);

  const handleBuy = () => navigation.navigate('ICashBuyPage');
  const handleWithdraw = () => navigation.navigate('ICashWithdrawPage');
  const handleP2P = () => navigation.navigate('IcashP2PScreen');
  const needsRefresh = (route.params as any)?.refresh;

  const refreshUserData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const result = await refreshUserProfileAPI();
      if (result?.success) {
        dispatch(setUser(result.user));
        if (result.accessToken && result.refreshToken) {
          await Promise.all([
            AsyncStorage.setItem('accessToken', result.accessToken),
            AsyncStorage.setItem('refreshToken', result.refreshToken),
          ]);
        }
      }
    } catch (e) {
      console.error('Refresh failed', e);
    } finally {
      setIsRefreshing(false);
      navigation.setParams({ refresh: undefined });
    }
  }, [dispatch, navigation]);
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
    const checkSecuritySetup = async () => {
      if (!user) return;
      try {
        const biometricsStored =
          await AsyncStorage.getItem('biometrics_enabled');
        const isBiometricsActive = biometricsStored === 'true';
        const hasPin = user.hasIcashPin || false;
        if (!hasPin && !isBiometricsActive) {
          navigation.replace('iCashSecurity');
        }
      } catch (error) {
        console.error('Failed to check security settings', error);
      }
    };
    checkSecuritySetup();
  }, [user, navigation]);

  return (
    <ScrollView
      style={[
        iCashScreenStyles.container,
        { backgroundColor: colors.background },
      ]}
    >
      {isRefreshing && (
        <ActivityIndicator
          size="small"
          color={colors.primary}
          style={{ marginVertical: 10 }}
        />
      )}
      <LinearGradient
        colors={DEFAULT_GRADIENT}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={iCashScreenStyles.iCashCard}
      >
        <View style={iCashScreenStyles.cardHeader}>
          <View>
            <Text style={[iCashScreenStyles.cardLabel, { color: colors.tint }]}>
              iCash Balance
            </Text>
            <Text style={[iCashScreenStyles.userName, { color: colors.tint }]}>
              @{user.itagusername}
            </Text>
          </View>
          <MaterialIcons name="account-balance" size={38} color={colors.tint} />
        </View>
        <View style={iCashScreenStyles.balance}>
          <View style={iCashScreenStyles.balanceContainer}>
            <MaterialIcons name="diamond" size={28} color={colors.tint} />
            {showBalance ? (
              <Text
                style={[iCashScreenStyles.balanceValue, { color: colors.tint }]}
              >
                {integer}
                <Text
                  style={[
                    iCashScreenStyles.decimalValue,
                    { color: colors.tint },
                  ]}
                >
                  .{decimal}
                </Text>
              </Text>
            ) : (
              <Text
                style={[
                  iCashScreenStyles.balanceValue,
                  { letterSpacing: 2, color: colors.tint },
                ]}
              >
                ****
              </Text>
            )}
          </View>
          <TouchableOpacity onPress={() => setShowBalance(!showBalance)}>
            <MaterialIcons
              name={showBalance ? 'visibility' : 'visibility-off'}
              size={24}
              color={colors.tint}
              style={iCashScreenStyles.balanceHideBtn}
            />
          </TouchableOpacity>
        </View>
        <View style={iCashScreenStyles.actionRow}>
          <ActionButton
            icon="local-mall"
            label="Buy iCash"
            onPress={handleBuy}
          />
          <ActionButton
            icon="account-balance"
            label="Withdraw iCash"
            onPress={handleWithdraw}
          />
          <ActionButton icon="send" label="Transfer" onPress={handleP2P} />
        </View>
      </LinearGradient>
      <TransactionList
        variant="compact"
        limit={7}
        onViewAll={() =>
          navigation.navigate('AllTransactionsScreen', {
            user,
          })
        }
      />
    </ScrollView>
  );
};
export const iCashScreenStyles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 15,
  },
  iCashCard: {
    padding: 25,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    elevation: 10,
    shadowColor: PRIMARY_COLOR,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    marginHorizontal: -15,
    position: 'relative',
    marginBottom: 25,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardLabel: {
    fontSize: 18,
    fontWeight: '600',
  },
  userName: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 5,
  },
  balanceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  balance: {
    marginTop: 25,
    flexDirection: 'row',
    alignItems: 'center',
  },
  balanceValue: {
    fontSize: 40,
    fontWeight: 'bold',
    marginLeft: 9,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  balanceHideBtn: {
    marginLeft: 12,
  },
  decimalValue: {
    fontSize: 22,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginTop: 30,
    width: '90%',
    alignSelf: 'center',
  },
  actionButton: {
    alignItems: 'center',
  },
  actionLabel: {
    fontSize: 12,
    marginTop: 5,
    fontWeight: '600',
  },
});
