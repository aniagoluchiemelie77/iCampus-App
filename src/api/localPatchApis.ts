import { User } from '../types/firebase';
import { baseUrl } from '@components/HomeScreenComponents';
import Toast from 'react-native-toast-message';

export const patchUserProfile = async (data: Partial<User>, authToken: string) => {
  const response = await fetch(`${baseUrl}/users/update-profile`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json();
    Toast.show({
      type: 'error',
      text1: 'Update Error',
      text2: errorData.message || 'Failed to update profile',
    });
  }
  return await response.json();
};