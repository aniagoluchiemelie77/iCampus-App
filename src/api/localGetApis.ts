import { User } from '../types/firebase';
import { baseUrl } from '@components/HomeScreenComponents';
import Toast from 'react-native-toast-message';

export const searchUserProfile = async (identifier: string, currentUser: User, token: string) => {
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