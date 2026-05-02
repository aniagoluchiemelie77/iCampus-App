import { baseUrl } from '@components/HomeScreenComponents';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';

const token = await AsyncStorage.getItem('accessToken');

export const fetchInquiryFromBackend = async (userType: string): Promise<{ inquiryId: string }> => {
  try {
    const response = await fetch(`${baseUrl}verifyUser/persona/create-inquiry`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        userType: userType,
      }),
    });
    if (!response.ok) {
        console.error("Failed to create inquiry");
        Toast.show({
            type: 'error',
            text1: 'Fetch Error',
            text2: 'Failed to create inquiry',
        });
        return { inquiryId: '' }; 
    }
    const data = await response.json();
    return { inquiryId: data.inquiryId }; 
  } catch (error: any) {
    console.error("Backend Error:", error);
    Toast.show({
        type: 'error',
        text1: 'Fetch Error',
        text2: error.message || 'Failed to create inquiry',
    });
    return { inquiryId: '' };
  }
};

export const revokeDeviceSession = async (
  userId: string, 
  deviceIdToRevoke: string
): Promise<{ success: boolean; message?: string }> => {
  try {
    const response = await fetch(`${baseUrl}users/revoke-session`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify({ userId, deviceIdToRevoke }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Failed to revoke session:", data.error);
      Toast.show({
        type: 'error',
        text1: 'Revoke Error',
        text2: data.error || 'Failed to log out device',
      });
      return { success: false, message: data.error };
    }

    return { success: true };
  } catch (error: any) {
    console.error("Backend Error:", error);
    Toast.show({
      type: 'error',
      text1: 'Connection Error',
      text2: error.message || 'Check your internet connection',
    });
    return { success: false, message: error.message };
  }
};