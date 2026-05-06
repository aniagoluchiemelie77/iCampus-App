import { baseUrl } from '@components/HomeScreenComponents';
import AsyncStorage from '@react-native-async-storage/async-storage';

const token = await AsyncStorage.getItem('accessToken');
export const updatePassword = async (newPassword: string) => {
  try {
    const response = await fetch(`${baseUrl}users/password/update`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ newPassword }),
    });
    const result = await response.json();
    if (!result.ok) {
      return { success: false, message: result.message };
    }
    return { success: response.ok, message: result.message };
  } catch (error) {
    return { success: false, message: "Update failed. Try again." };
  }
};