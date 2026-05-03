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
export const getBlockedUsers = async (
  userId: string,
): Promise<any[]> => {
  if (!userId) return [];
  try {
    const response = await fetch(`${baseUrl}users/blocked-list/${userId}`, {
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
        text2: result.message || 'Failed to fetch blocked users',
      });
      return [];
    }
    const list = Array.isArray(result) ? result : result.blockedUsers || result.data;
    return Array.isArray(list) ? list : [];
  } catch (error: any) {
    console.error('BlockedUsersService Error:', error);
    Toast.show({
      type: 'error',
      text1: 'Connection Error',
      text2: 'Could not connect to the server',
    });
    return [];
  }
};
export const getConversations = async (
  userId: string,
  pageNum: number,
): Promise<{ success: boolean; data: any[]; hasMore: boolean }> => {
  try {
    const response = await fetch(
      `${baseUrl}users/messages/conversations/${userId}?page=${pageNum}`,
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );
    const result = await response.json();
    
    if (!response.ok) {
      Toast.show({
        type: 'error',
        text1: 'Fetch Error',
        text2: result.message || 'Failed to fetch conversations',
      });
      return { success: false, data: [], hasMore: false };
    }
    return { 
      success: true, 
      data: result.data || [], 
      hasMore: result.hasMore 
    };
  } catch (error: any) {
    console.error("Fetch Conversations Error:", error);
    return { success: false, data: [], hasMore: false };
  }
};
export const searchUsers = async (
  query: string,
  viewerTier: string,
  viewerRole: string,
): Promise<any[]> => {
  if (!query || query.length < 2) return [];

  try {
    const response = await fetch(
      `${baseUrl}users/search?q=${encodeURIComponent(query)}&viewerTier=${viewerTier}&viewerRole=${viewerRole}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    const result = await response.json();
    if (!response.ok) {
      Toast.show({
        type: 'error',
        text1: 'Fetch Error',
        text2: result.message || 'Search failed',
      });
      return [];
    }
    return result.success ? result.data : [];
  } catch (error) {
    console.error("Search API Error:", error);
    return [];
  }
};