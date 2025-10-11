import React, { useEffect } from 'react';
import { View, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../../App';
import { WelcomeScreenStyles } from '../assets/styles/colors';

type NavigationProp = StackNavigationProp<RootStackParamList, 'Welcome'>;

const WelcomeScreen = () => {
  const navigation = useNavigation<NavigationProp>();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.navigate('SignUp');
    }, 5000);
    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={WelcomeScreenStyles.container}>
      <Image
        source={{
          uri: 'https://res.cloudinary.com/dbdw3zftx/image/upload/v1759354003/Black_And_White_King_Logo_ydy68f.png',
        }} // Replace with your actual image URL
        style={WelcomeScreenStyles.gif} // You can rename this style to something more appropriate like WelcomeScreenStyles.image
        resizeMode="contain"
      />
    </View>
  );
};


export default WelcomeScreen;
