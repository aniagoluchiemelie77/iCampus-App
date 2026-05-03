import { User, userPreferences } from '../types/firebase';
import { baseUrl } from '@components/HomeScreenComponents';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';

const token = await AsyncStorage.getItem('accessToken');

export const patchUserProfile = async (data: Partial<User>) => {
  const response = await fetch(`${baseUrl}/users/update-profile`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
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
export const updatePreferences = async (
  userId: string,
  update: Partial<userPreferences>,
) => {
  try {
    const response = await fetch(`${baseUrl}users/preferences/${userId}`, {
      method: 'PATCH', 
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(update),
    });

    const data = await response.json();
    if (!response.ok) {
      Toast.show({
        type: 'error',
        text1: 'Update Error',
        text2: data.error || 'Failed to update preferences',
      });
    };
    return { success: true, data };
  } catch (error: any) {
    console.error("Preference Update Error:", error);
    Toast.show({
      type: 'error',
      text1: 'Network Error',
      text2: error || 'Failed to update preferences',
    });
    return { success: false, error: error.message };
  }
};