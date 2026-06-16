import React, { useEffect, useCallback } from 'react';
import { View, Image } from 'react-native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../../App';
import { WelcomeScreenStyles } from '../assets/styles/colors';
import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppSelector } from '../components/hooks';

type NavigationProp = StackNavigationProp<RootStackParamList, 'Welcome'>;
type RouteProps = RouteProp<RootStackParamList, 'Welcome'>;

type ValidRouteName = 'SignUp' | 'Login';

const WelcomeScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const routeParam = route.params.route as ValidRouteName;
  const user = useAppSelector(state => state.user);
  const checkAuthStatus = useCallback(async (): Promise<boolean> => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      return !!token && !!user?.uid;
    } catch (error) {
      console.error('Auth Check Failed:', error);
      return false;
    }
  }, [user?.uid]);
  useEffect(() => {
    const bootstrapAsync = async () => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const isAuthenticated = await checkAuthStatus();

      if (isAuthenticated) {
        navigation.reset({
          index: 0,
          routes: [{ name: routeParam }],
        });
      } else {
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      }
    };

    bootstrapAsync();
  }, [navigation, routeParam, checkAuthStatus]);

  return (
    <View style={WelcomeScreenStyles.container}>
      <Image
        source={{ uri: '...' }}
        style={WelcomeScreenStyles.gif}
        resizeMode="contain"
      />
    </View>
  );
};

export default WelcomeScreen;
