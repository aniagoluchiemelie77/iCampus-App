import { baseUrl } from '@components/HomeScreenComponents';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CommonActions } from '@react-navigation/native';

const token = await AsyncStorage.getItem('accessToken');

export const handleFinalDelete = async ({navigation, reason}: {navigation: any, reason?: string}) => {
  try {
    const response = await fetch(`${baseUrl}users/account/delete`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
            reason: reason?.trim() || "No reason provided"
        }),
    });
    const data = await response.json();
    if (!response.ok || !data.status) {
        Toast.show({ type: 'error', text1: 'Delete Error', text2: data.message });
        return;
    }
    await AsyncStorage.clear(); 
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'SignUp' }], 
      })
    );
  } catch (error: any) {
    console.error("Delete failed", error);
    Toast.show({ type: 'error', text1: 'Network Error', text2: error });
    return;
  }
};
export const deleteRecoveryEmailAPI = async (emailToDelete: string) => {
  try {
    const response = await fetch(`${baseUrl}users/recovery-email`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ emailToDelete }),
    });
    const data = await response.json();
    if (!response.ok || !data.status) {
        Toast.show({ type: 'error', text1: 'Delete Error', text2: data.message });
        return;
    }
    return {
      success: response.ok,
      recoveryEmails: data.recoveryEmails
    };
  } catch (error) {
    return { success: false, message: 'Network error' };
  }
};
export const handleDeletePhone = async (phoneNumber: string) => {
  try {
    const response = await fetch(`${baseUrl}users/phone-number`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ phoneNumber }),
    });

    const data = await response.json();
    if (!response.ok || !data.status) {
        Toast.show({ type: 'error', text1: 'Delete Error', text2: data.message });
        return;
    }
    return {
      success: response.ok,
      phoneNumbers: data.phoneNumbers,
      message: data.message
    };
  } catch (error) {
    return { success: false, message: 'Network error' };
  }
};