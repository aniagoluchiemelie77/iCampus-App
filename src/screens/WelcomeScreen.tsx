import React, { useEffect } from 'react';
import { View, Image } from 'react-native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../../App';
import { WelcomeScreenStyles } from '../assets/styles/colors';
import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';

type NavigationProp = StackNavigationProp<RootStackParamList, 'Welcome'>;
type RouteProps = RouteProp<RootStackParamList, 'Welcome'>;

type ValidRouteName = 'SignUp' | 'Login';

const WelcomeScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const routeParam = route.params.route as ValidRouteName;

  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.navigate(routeParam);
    }, 5000);
    return () => clearTimeout(timer);
  }, [navigation, routeParam]);

  return (
    <View style={WelcomeScreenStyles.container}>
      <Image
        source={{
          uri: 'https://res.cloudinary.com/dbdw3zftx/image/upload/v1759354003/Black_And_White_King_Logo_ydy68f.png',
        }}
        style={WelcomeScreenStyles.gif}
        resizeMode="contain"
      />
    </View>
  );
};

export default WelcomeScreen;
