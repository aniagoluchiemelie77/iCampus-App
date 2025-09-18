import React, { useEffect } from 'react';
import { StyleSheet, View, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../../App';

type NavigationProp = StackNavigationProp<RootStackParamList, 'Welcome'>;

const ForgotPassword = () => {
  const navigation = useNavigation<NavigationProp>();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.navigate('SignUp');
    }, 9000);
    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/images/iCampusLoadingSpinner.gif')}
        style={styles.gif}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1, // or any color you want
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  gif: {
    width: '100%',
    height: '100%',
    zIndex: 1,
  },
});

export default ForgotPassword;
