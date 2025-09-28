import React, { useState, useEffect } from 'react';
import {  Text, View, StyleSheet, TouchableOpacity, Image, TextInput} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { homeStyles } from '../screens/HomeScreen'; // Adjust path as needed
import { useNavigation } from '@react-navigation/native';
import type { RootStackParamList } from '../../App';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAppSelector } from './hooks';
import type { ProductCategory } from '../types/firebase'; 

type NavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
};
//Home screen
export function Home() {
  const user = useAppSelector(state => state.user);
  const navigation = useNavigation<NavigationProp>();
  const [showActivities, setShowActivities] = useState(true);

  return (
    <View style={styles.bckg}>
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={[
            homeStyles.iconItem,
            styles.activityIcons,
            styles.activityIcons2,
          ]}
          onPress={() => navigation.navigate('Calender')}
        >
          <Icon name="calendar-outline" size={28} color="#fcac0eff" />
        </TouchableOpacity>
        <View style={styles.iconSubdiv}>
          <TouchableOpacity
            style={[
              homeStyles.iconItem,
              styles.activityIcons,
              styles.activityIcons2,
            ]}
          >
            <Icon name="notifications-outline" size={28} color="#fcac0eff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              homeStyles.iconItem,
              styles.activityIcons,
              styles.activityIcons2,
            ]}
            onPress={() => navigation.navigate('Settings')}
          >
            <Icon name="settings-outline" size={28} color="#fcac0eff" />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.welcomeHeader}>
        <TouchableOpacity
          style={[homeStyles.iconItem, styles.activityIcons]}
          onPress={() => navigation.navigate('Profile')}
        >
          {user?.profilePic ? (
            <Image source={{ uri: user.profilePic }} style={styles.avatar} />
          ) : (
            <Icon name="person-circle-outline" size={35} color="#000" />
          )}
        </TouchableOpacity>
        <Text style={styles.welcomeText}>
          {getGreeting()}, {user.firstname}
        </Text>
      </View>
      <View style={styles.activityDiv}>
        <View style={styles.activityDivHeader}>
          <Text style={styles.activityDivHeaderText}>Activities</Text>
          <TouchableOpacity
            style={[homeStyles.iconItem, styles.activityIcons]}
            onPress={() => setShowActivities(prev => !prev)}
          >
            <Icon
              name={
                showActivities ? 'chevron-up-outline' : 'chevron-down-outline'
              }
              size={30}
              color="#000"
            />
          </TouchableOpacity>
        </View>
        {showActivities && (
          <View style={styles.activityIconsDiv}>
            <TouchableOpacity
              style={[homeStyles.iconItem, styles.activityIcons]}
            >
              <Icon name="people-outline" size={30} color="#000" />
              <Text style={homeStyles.iconLabel}>Communities</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[homeStyles.iconItem, styles.activityIcons]}
            >
              <Icon name="list-outline" size={30} color="#000" />
              <Text style={homeStyles.iconLabel}>Create A Poll</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[homeStyles.iconItem, styles.activityIcons]}
            >
              <Icon name="chatbubble-ellipses-outline" size={30} color="#000" />
              <Text style={homeStyles.iconLabel}>Smart Help</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[homeStyles.iconItem, styles.activityIcons]}
            >
              <Icon name="calculator-outline" size={30} color="#000" />
              <Text style={homeStyles.iconLabel}>Get GPA</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[homeStyles.iconItem, styles.activityIcons]}
            >
              <Icon name="book-outline" size={30} color="#000" />
              <Text style={homeStyles.iconLabel}>Browse Materials</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[homeStyles.iconItem, styles.activityIcons]}
            >
              <Icon name="receipt-outline" size={30} color="#000" />
              <Text style={homeStyles.iconLabel}>Spend Wise</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[homeStyles.iconItem, styles.activityIcons]}
            >
              <Icon name="wallet-outline" size={30} color="#000" />
              <Text style={homeStyles.iconLabel}>My Wallet</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[homeStyles.iconItem, styles.activityIcons]}
            >
              <Icon name="time-outline" size={30} color="#000" />
              <Text style={homeStyles.iconLabel}>Go Plan</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

// ClassroomScreen.js
export function ClassroomScreen() {
  return <Text>Welcome to Classroom</Text>;
}

// StoreScreen.js
export function StoreScreen() {
  const [categories, setCategories] = useState<ProductCategory[]>([]);

  useEffect(() => {
    fetch('http://192.168.1.98:5000/store/categories')
      .then(res => res.json())
      .then(data => setCategories(data))
      .catch(err => console.error('Error fetching categories:', err));
  }, []);
  return (
    <View style={styles.bckg}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search..."
          placeholderTextColor="#838181ff"
        />
        <TouchableOpacity
          style={[
            homeStyles.iconItem,
            styles.activityIcons,
            styles.activityIcons2,
          ]}
        >
          <Icon name="notifications-outline" size={28} color="#fcac0eff" />
        </TouchableOpacity>
      </View>
      <View style={styles.activityDiv}>
        <View style={styles.activityDivHeader}>
          <Text style={styles.activityDivHeaderText}>Categories</Text>
        </View>
        <View style={styles.activityIconsDiv}>
          {categories.map(cat => (
            <>
              <TouchableOpacity
                style={[homeStyles.iconItem, styles.activityIcons]}
                key={cat.id}
              >
                <Icon name="people-outline" size={30} color="#000" />
                <Text style={homeStyles.iconLabel}>{cat.categoryName}</Text>
              </TouchableOpacity>
            </>
          ))}
        </View>
      </View>
      <View style={styles.activityDiv}>
        <View style={styles.activityDivHeader}>
          <Text style={styles.activityDivHeaderText}>Popular</Text>
        </View>
        <View style={styles.activityIconsDiv}>
          <TouchableOpacity style={[homeStyles.iconItem, styles.activityIcons]}>
            <Icon name="people-outline" size={30} color="#000" />
            <Text style={homeStyles.iconLabel}>Communities</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[homeStyles.iconItem, styles.activityIcons]}>
            <Icon name="list-outline" size={30} color="#000" />
            <Text style={homeStyles.iconLabel}>Create A Poll</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[homeStyles.iconItem, styles.activityIcons]}>
            <Icon name="chatbubble-ellipses-outline" size={30} color="#000" />
            <Text style={homeStyles.iconLabel}>Smart Help</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[homeStyles.iconItem, styles.activityIcons]}>
            <Icon name="calculator-outline" size={30} color="#000" />
            <Text style={homeStyles.iconLabel}>Get GPA</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[homeStyles.iconItem, styles.activityIcons]}>
            <Icon name="book-outline" size={30} color="#000" />
            <Text style={homeStyles.iconLabel}>Browse Materials</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ProfileScreen.js
export function ProfileScreen() {
  return <Text>Welcome to Profile</Text>;
}

const styles = StyleSheet.create({
  bckg: {
    flex: 1,
    backgroundColor: '#eee',
    width: '100%',
    alignItems: 'center',
  },
  topHeader: {
    backgroundColor: '#eee',
    paddingVertical: 10,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  welcomeHeader: {
    padding: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: '100%',
  },
  welcomeText: {
    marginLeft: 5,
    fontSize: 19,
    fontWeight: 800,
  },
  avatar: {
    height: 60,
    width: 60,
    borderRadius: 30,
    borderColor: '#fcac0eff', // Your preferred border color
    backgroundColor: '#fff',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  activityDiv: {
    padding: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    width: '90%',
    borderRadius: 15,
    margin: 7,
  },
  activityDivHeader: {
    padding: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
    flexDirection: 'row',
    width: '100%',
    borderBottomWidth: 1, // thickness of the border
    borderBottomColor: '#222',
  },
  activityDivHeaderText: {
    fontSize: 17,
    fontWeight: 800,
  },
  activityIconsDiv: {
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'space-evenly',
    flexDirection: 'row',
    width: '100%',
    flexWrap: 'wrap',
  },
  iconSubdiv: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityIcons: {
    padding: 10,
    margin: 4,
  },
  activityIcons2: {
    borderRadius: '50%',
    backgroundColor: '#fff',
  },
  searchContainer: {
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  searchInput: {
    padding: 10,
    backgroundColor: 'inherit',
    borderRadius: 15,
    paddingHorizontal: 12,
    borderWidth: 1,
    width: '82%',
    borderColor: '#838181ff',
    color: '#000',
  },
});