import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { View, TouchableOpacity, Text } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {
  ClassroomScreen,
  StoreScreen,
  ProfileScreen,
  Home,
} from '../components/HomeScreenComponents';
import { useNavigation } from '@react-navigation/native';
import type { RootStackParamList } from '../../App';
import { StackNavigationProp } from '@react-navigation/stack';
import { clearUser } from '../components/UserSlice';
import { useAppSelector } from '../components/hooks';
import { homeStyles } from '../assets/styles/colors';
import { AppDataProvider } from '../components/EventContext';
import Toast from 'react-native-toast-message';
import toastConfig from '../components/toastConfig';

type NavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

const HomeScreen = () => {
  const user = useAppSelector(state => state.user);
  const dispatch = useDispatch();
  const navigation = useNavigation<NavigationProp>();
  const isTokenExpired = (createdAt: number) => {
    const now = Date.now();
    return now - createdAt > 1000 * 60 * 60 * 24; // 24 hours
  };
  const [activeIcon, setActiveIcon] = useState<string>('home'); // ✅ default to 'home'
  useEffect(() => {
    if (
      user?.tokenCreatedAt &&
      isTokenExpired(new Date(user.tokenCreatedAt).getTime())
    ) {
      dispatch(clearUser());
      navigation.navigate('SignUp');
    }
  }, [dispatch, navigation, user.tokenCreatedAt]);

  return (
    <AppDataProvider user={user}>
      <View style={homeStyles.container}>
        <View style={homeStyles.centerContent}>
          {activeIcon === 'home' && <Home />}
          {activeIcon === 'classroom' && <ClassroomScreen />}
          {activeIcon === 'store' && <StoreScreen />}
          {activeIcon === 'profile' && <ProfileScreen />}
        </View>

        <View style={homeStyles.iconBar}>
          <TouchableOpacity
            onPress={() => setActiveIcon('home')}
            style={homeStyles.iconItem}
          >
            <Icon
              name={activeIcon === 'home' ? 'home' : 'home-outline'}
              size={28}
              color="#000"
            />
            <Text
              style={[
                homeStyles.iconLabel,
                activeIcon === 'home' && homeStyles.activeIconLabel,
              ]}
            >
              Home
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveIcon('classroom')}
            style={homeStyles.iconItem}
          >
            <Icon
              name={activeIcon === 'classroom' ? 'school' : 'school-outline'}
              size={28}
              color="#000"
            />
            <Text
              style={[
                homeStyles.iconLabel,
                activeIcon === 'classroom' && homeStyles.activeIconLabel,
              ]}
            >
              Classroom
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveIcon('store')}
            style={homeStyles.iconItem}
          >
            <Icon
              name={activeIcon === 'store' ? 'cart' : 'cart-outline'}
              size={28}
              color="#000"
            />
            <Text
              style={[
                homeStyles.iconLabel,
                activeIcon === 'store' && homeStyles.activeIconLabel,
              ]}
            >
              Store
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveIcon('profile')}
            style={homeStyles.iconItem}
          >
            <Icon
              name={activeIcon === 'profile' ? 'person' : 'person-outline'}
              size={28}
              color="#000"
            />
            <Text
              style={[
                homeStyles.iconLabel,
                activeIcon === 'profile' && homeStyles.activeIconLabel,
              ]}
            >
              Profile
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      <Toast config={toastConfig} />
    </AppDataProvider>
  );
};

export default HomeScreen;
