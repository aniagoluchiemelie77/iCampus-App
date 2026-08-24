import React, { useEffect, useCallback } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../../App';
import { PRIMARY_COLOR } from '../assets/styles/colors';
import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppSelector } from '../hooks/hooks';

type NavigationProp = StackNavigationProp<RootStackParamList, 'Welcome'>;
type RouteProps = RouteProp<RootStackParamList, 'Welcome'>;

const WelcomeScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const routeParam = route.params?.route || 'Login';
  const user = useAppSelector(state => state.user) || {};
  const checkAuthStatus = useCallback(async (): Promise<boolean> => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      return !!token && !!user?.uid;
    } catch (error) {
      console.error('Auth Check Failed:', error);
      return false;
    }
  }, [user?.uid]);
  useEffect(() => {
    const bootstrapAsync = async () => {
      await new Promise(resolve => setTimeout(resolve, 4000));
      const isAuthenticated = await checkAuthStatus();

      if (isAuthenticated) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Home' }],
        });
      } else {
        navigation.reset({
          index: 0,
          routes: [{ name: routeParam as any }],
        });
      }
    };

    bootstrapAsync();
  }, [navigation, routeParam, checkAuthStatus]);

  return (
    <View style={styles.container}>
      <Image
        source={{
          uri: 'https://res.cloudinary.com/dbdw3zftx/image/upload/v1759354003/Black_And_White_King_Logo_ydy68f.png',
        }}
        style={styles.gif}
        resizeMode="contain"
      />
    </View>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: PRIMARY_COLOR,
  },
  gif: {
    width: '100%',
    height: '100%',
  },
});
export default WelcomeScreen;
