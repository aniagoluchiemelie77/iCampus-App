import { User } from '../types/firebase';
import { baseUrl } from '@components/HomeScreenComponents';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';

const token = await AsyncStorage.getItem('accessToken');

export const searchUserProfile = async (identifier: string, currentUser: User) => {
  const params = new URLSearchParams({
    viewerUid: currentUser.uid,
    viewerTier: currentUser.tier || 'free',
    viewerRole: currentUser.usertype || '',
    viewerFirstname: currentUser.firstname || '',
  });
  const response = await fetch(`${baseUrl}users/profile/search/${identifier}?${params.toString()}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });
  const result = await response.json();
  if (!response.ok) {
    Toast.show({
      type: 'error',
      text1: 'Fetch Error',
      text2: result.message || 'An unexpected error occurred',
    });
  }
  return result.data; 
};
export const fetchSupportedBanks = async (
  countryCode: string,
): Promise<{ label: string; value: string }[]> => {
  try {
    const response = await fetch(`${baseUrl}users/payments/banks/${countryCode}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      },
    });

    const json = await response.json();

    if (json.status === 'success' && Array.isArray(json.data)) {
      return json.data.map((bank: any) => ({
        label: bank.name,
        value: bank.code,
      }));
    }

    return [];
  } catch (err) {
    console.error('Bank fetch failed:', err);
    return [];
  }
};
export const getUserPaymentMethods = async (userId: string): Promise<any[]> => {
  if (!userId) return [];

  try {
    const response = await fetch(`${baseUrl}user/payment-methods/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    const result = await response.json();
    if (!response.ok) {
      Toast.show({
        type: 'error',
        text1: 'Fetch Error',
        text2: result.message || 'Failed to fetch payment methods',
      });
    }
    const methods = Array.isArray(result) ? result : result.data;
    return Array.isArray(methods) ? methods : [];
  } catch (error) {
    console.error('PaymentMethodService Error:', error);
    return [];
  }
};