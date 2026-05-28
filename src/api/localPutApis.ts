import { baseUrl } from '@components/HomeScreenComponents';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';

const token = await AsyncStorage.getItem('accessToken');
interface UpdateITagResponse {
  success: boolean;
  message?: string;
  data?: any;
}
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
export const customizeItag = async (
  updatePayload: Record<string, any>
): Promise<UpdateITagResponse> => {
  try {
    const response = await fetch(`${baseUrl}users/update-itag`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        updates: updatePayload
      }),
    });
    const result = await response.json();
    if (!response.ok) {
      Toast.show({
        type: 'error',
        text1: 'Update Failed',
        text2: result.message || 'Failed to update iTag configurations',
      });
      return { success: false, message: result.message };
    }

    return { success: true, data: result.data };
  } catch (error: any) {
    console.error("Update iTag Utility Error:", error);
    Toast.show({
      type: 'error',
      text1: 'Network Error',
      text2: 'Could not connect to the system configurations server.',
    });
    return { success: false, message: error.message };
  }
};