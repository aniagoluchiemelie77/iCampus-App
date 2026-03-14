import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { clearUser } from '@components/UserSlice';
import { View, TouchableOpacity, Text } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {
  ClassroomScreen,
  StoreScreen,
  RankingScreen,
  Home,
} from '../components/HomeScreenComponents';
import { useNavigation } from '@react-navigation/native';
import type { RootStackParamList } from '../../App';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAppSelector } from '../components/hooks';
import { homeStyles } from '../assets/styles/colors';
import { AppDataProvider } from '../components/EventContext';
import Toast from 'react-native-toast-message';
import toastConfig from '../components/ToastConfig';

type NavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

const HomeScreen = () => {
  const user = useAppSelector(state => state.user);
  const userType = user?.usertype;
  const dispatch = useDispatch();
  const navigation = useNavigation<NavigationProp>();

  const [activeIcon, setActiveIcon] = useState<string>('home');
  const isTokenExpired = (createdAt: number) => {
    const now = Date.now();
    return now - createdAt > 1000 * 60 * 60 * 24; // 24 hours
  };
  // Helper to check if user is allowed in the classroom
  const isClassroomAllowed =
    userType === 'student' ||
    userType === 'lecturer' ||
    userType === 'otherUser';

  // ... (keep your useEffect for token expiry)
  useEffect(() => {
    if (user?.tokenCreatedAt) {
      const createdAtTime = new Date(user.tokenCreatedAt).getTime();

      if (isTokenExpired(createdAtTime)) {
        dispatch(clearUser());
        navigation.navigate('Login');
      }
    }
  }, [dispatch, navigation, user?.tokenCreatedAt]);

  return (
    <AppDataProvider user={user}>
      <View style={homeStyles.container}>
        <View style={homeStyles.centerContent}>
          {activeIcon === 'home' && <Home />}

          {isClassroomAllowed && activeIcon === 'classroom' && (
            <ClassroomScreen />
          )}

          {activeIcon === 'store' && <StoreScreen />}
          {activeIcon === 'ranking' && <RankingScreen />}
        </View>

        <View style={homeStyles.iconBar}>
          {/* Home Tab */}
          <TouchableOpacity
            onPress={() => setActiveIcon('home')}
            style={[
              homeStyles.iconItem,
              activeIcon === 'home' && homeStyles.activeIconItem,
            ]}
          >
            <Icon
              name={activeIcon === 'home' ? 'home' : 'home-outline'}
              size={26}
              color={activeIcon === 'home' ? '#fb966b' : '#032820'}
            />
            {activeIcon === 'home' && (
              <Text style={homeStyles.activeIconLabel}>Home</Text>
            )}
          </TouchableOpacity>

          {/* 2. UI Exclusion: Only render the Tab button if user is NOT enterprise */}
          {isClassroomAllowed && (
            <TouchableOpacity
              onPress={() => setActiveIcon('classroom')}
              style={[
                homeStyles.iconItem,
                activeIcon === 'classroom' && homeStyles.activeIconItem,
              ]}
            >
              <Icon
                name={activeIcon === 'classroom' ? 'easel' : 'easel-outline'}
                size={26}
                color={activeIcon === 'classroom' ? '#fb966b' : '#032820'}
              />
              {activeIcon === 'classroom' && (
                <Text style={homeStyles.activeIconLabel}>Courses</Text>
              )}
            </TouchableOpacity>
          )}

          {/* Store and Ranking tabs remain visible for everyone */}
          <TouchableOpacity
            onPress={() => setActiveIcon('store')}
            style={[
              homeStyles.iconItem,
              activeIcon === 'store' && homeStyles.activeIconItem,
            ]}
          >
            <Icon
              name={activeIcon === 'store' ? 'cart' : 'cart-outline'}
              size={26}
              color={activeIcon === 'store' ? '#fb966b' : '#032820'}
            />
            {activeIcon === 'store' && (
              <Text style={homeStyles.activeIconLabel}>Store</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveIcon('ranking')}
            style={[
              homeStyles.iconItem,
              activeIcon === 'ranking' && homeStyles.activeIconItem,
            ]}
          >
            <Icon
              name={activeIcon === 'ranking' ? 'trophy' : 'trophy-outline'}
              size={26}
              color={activeIcon === 'ranking' ? '#fb966b' : '#032820'}
            />
            {activeIcon === 'ranking' && (
              <Text style={homeStyles.activeIconLabel}>Ranking</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
      <Toast config={toastConfig} />
    </AppDataProvider>
  );
};

export default HomeScreen;
