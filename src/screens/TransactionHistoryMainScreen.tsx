import React, { useState } from 'react';
import { View, StyleSheet, useWindowDimensions, TextInput, TouchableOpacity, Text } from 'react-native';
import { TabView, SceneMap, TabBar } from 'react-native-tab-view';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { TransactionList } from '../components/TransactionHistory'; 
// import { TransactionStats } from '../components/TransactionStats';
import {PRIMARY_COLOR} from '../components/Classroomcomponent';
import { User } from 'types/firebase';

interface Props {
  user: User;
  searchQuery: string;
}
const HistoryRoute = ({ user, searchQuery, setSearchQuery }: Props) => (
  <View style={styles.tabContainer}>
    <View style={styles.searchSection}>
      <View style={styles.searchContainer}>
        <Icon name="magnify" size={20} color="#888" />
        <TextInput
          placeholder="Search by name, ID, or amount..."
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
      <TouchableOpacity style={styles.filterBtn}>
        <Icon name="calendar-range" size={24} color={PRIMARY_COLOR} />
      </TouchableOpacity>
    </View>

    <TransactionList 
      user={user} 
      variant="full" 
      limit={15} 
      searchQuery={searchQuery} 
    />
  </View>
);

const StatsRoute = () => (
  <View style={styles.tabContainer}>
    <Text>Statistics View</Text>
  </View>
);
export const AllTransactionsScreen = ({ route }: any) => {
  const layout = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [routes] = useState([
    { key: 'history', title: 'History' },
    { key: 'stats', title: 'Statistics' },
  ]);

  const renderScene = ({ route: tabRoute }: any) => {
    switch (tabRoute.key) {
      case 'history':
        return (
          <HistoryRoute 
            user={route.params.user} 
            searchQuery={searchQuery} 
            setSearchQuery={setSearchQuery} 
          />
        );
      case 'stats':
        return <StatsRoute />;
      default:
        return null;
    }
  };
  return (
    <View style={styles.container}>
      <TabView
        navigationState={{ index, routes }}
        renderScene={renderScene}
        onIndexChange={setIndex}
        initialLayout={{ width: layout.width }}
        renderTabBar={props => (
  <TabBar
    {...props}
    indicatorStyle={{ backgroundColor: PRIMARY_COLOR }}
    style={{ backgroundColor: '#FFF' }}
    activeColor={PRIMARY_COLOR}
    inactiveColor="#888"
    // Use renderLabel to style the text
    renderLabel={({ route, focused, color }) => (
      <Text style={{
        color, // This automatically uses activeColor/inactiveColor
        fontWeight: '600',
        fontSize: 14,
        margin: 8,
      }}>
        {route.title}
      </Text>
    )}
  />
)}
      />
    </View>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  tabContainer: {
    flex: 1,
  },
  searchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F3F5',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 45,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#333',
  },
  filterBtn: {
    marginLeft: 15,
    padding: 8,
    backgroundColor: '#F1F3F5',
    borderRadius: 10,
  },
});

// Update your TransactionList styles for the "Full" mode
export const iCashScreenStyles = StyleSheet.create({
  historyContainer: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F0F0F0',
  },
  iconBackground: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#F0F7FF', // Light tint of your primary color
    justifyContent: 'center',
    alignItems: 'center',
  },
  transactionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  transactionTime: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  }
});