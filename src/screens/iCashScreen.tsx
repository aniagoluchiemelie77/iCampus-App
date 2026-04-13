import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useAppSelector } from '../components/hooks';
import { PRIMARY_COLOR, PRIMARY_COLOR_TINT } from '@components/Classroomcomponent';
import { baseUrl } from '@components/HomeScreenComponents';
import { User, Transactions } from 'types/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ActionButton = ({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) => (
  <TouchableOpacity style={styles.actionButton} onPress={onPress}>
    <View style={styles.actionIconContainer}>
      <Icon name={icon} size={24} color={PRIMARY_COLOR} />
    </View>
    <Text style={styles.actionLabel}>{label}</Text>
  </TouchableOpacity>
);
const TransactionHistory = ({ limit, user }: { limit: number, user: User }) => {
  const navigation = useNavigation<any>();
  const [history, setHistory] = useState<Transactions[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
  const fetchICashData = async () => {
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
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };
  fetchICashData();
}, [ user.uid]);

  return (
    <View style={styles.historyContainer}>
      <View style={styles.historyHeader}>
        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        <TouchableOpacity onPress={() => navigation.navigate('All Transactions')}>
          <Text style={{ color: '#f54b02', fontWeight: 'bold' }}>View All</Text>
        </TouchableOpacity>
      </View>

      {history.map((item) => (
        <View key={item.transactionId} style={styles.transactionItem}>
          <View style={styles.iconBackground}>
            <Icon 
              name={item.payType === 'in' ? 'arrow-bottom-left' : 'arrow-top-right'} 
              size={20} 
              color={item.payType === 'in' ? '#10b981' : '#ef4444'} 
            />
          </View>
          <View style={{ flex: 1, marginLeft: 15 }}>
            <Text style={styles.transactionTitle}>{item.title}</Text>
            <Text style={styles.transactionDate}>{item.createdAt}</Text>
          </View>
          <Text style={[
            styles.transactionAmount, 
            { color: item.payType === 'in' ? '#10b981' : '#1e293b' }
          ]}>
            {item.amountICash}
          </Text>
        </View>
      ))}
    </View>
  );
};
export const ICashDashboard = () => {
  const navigation = useNavigation<any>();
  const user = useAppSelector(state => state.user);
  const balance = user.pointsBalance || 0;
  const [integer, decimal] = balance.toFixed(2).split('.');

  const handleBuy = () => navigation.navigate('Buy iCash');
  const handleWithdraw = () => navigation.navigate('Withdraw iCash');
  const handleP2P = () => navigation.navigate('Transfer iCash');
  useEffect(() => {
    if (!user.twoFactorEnabled) {
      navigation.navigate('Create iCash Biometrics');
    }
  }, [navigation, user.twoFactorEnabled]);
  
  return (
    <ScrollView style={styles.container}>
        <LinearGradient
            colors={['#3b2115', '#5a3c2e', '#e05515']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iCashCard}
        >
            <View style={styles.cardHeader}>
                <View>
                    <Text style={styles.cardLabel}>iCash Balance</Text>
                    <Text style={styles.userName}>
                        {user.firstname?.toUpperCase()} {user.lastname?.toUpperCase()}
                    </Text>
                </View>
                <Icon name="chip" size={38} color="#e0c8bd" />
            </View>
            <View style={styles.balanceContainer}>
                <Icon name="diamond" size={32} color="#fff" style={styles.diamondShadow} />
                <Text style={styles.balanceValue}>
                    {integer}
                    <Text style={styles.decimalValue}>.{decimal}</Text>
                </Text>
            </View>
        </LinearGradient>
        <View style={styles.actionRow}>
            <ActionButton icon="plus-circle" label="Buy iCash" onPress={handleBuy} />
            <ActionButton icon="bank-transfer-out" label="Withdraw" onPress={handleWithdraw} />
            <ActionButton icon="send" label="Transfer" onPress={handleP2P} />
        </View>
        <TransactionHistory limit={10} user={user} />
    </ScrollView>
  );
};
const styles = StyleSheet.create({
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
    width: '100%'
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
    marginVertical: 15,
  },
  balanceValue: {
    color: '#fff',
    fontSize: 42,
    fontWeight: 'bold',
    marginLeft: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
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
    color: '#1e293b',
    marginBottom: 15,
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
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  iconBackground: {
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 12,
  },
  transactionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  transactionDate: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 15,
    fontWeight: '700',
  },
  // Statistics Styling (for the "In vs Out" section)
  statsContainer: {
    padding: 20,
    marginHorizontal: 20,
    backgroundColor: '#f8fafc',
    borderRadius: 20,
    marginBottom: 25,
  },
});