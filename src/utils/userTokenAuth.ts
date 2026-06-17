import { navigate } from '../context/navigationContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const getAuthHeaders = async () => {
  const token = await AsyncStorage.getItem('userToken'); 
  if (!token) {
    navigate('Login');
  }
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
};