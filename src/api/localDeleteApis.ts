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
export const clearCartAPI = async () => {
  try {
    const response = await fetch(`${baseUrl}store/cart/delete-all`, { 
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
    });

    const data = await response.json();

    if (!response.ok || !data.status) {
      Toast.show({ 
        type: 'error', 
        text1: 'Cart Error', 
        text2: data.message || 'Failed to clear cart' 
      });
      return { success: false };
    }
    Toast.show({ type: 'success', text2: data.message });
    return {
      success: true,
      message: data.message
    };
  } catch (error: any) {
    console.error("Clear Cart Error:", error);
    Toast.show({ type: 'error', text1: 'Network Error', text2: error.message });
    return { success: false, message: 'Network error' };
  }
};
export const clearFavoritesAPI = async () => {
  try {
    const response = await fetch(`${baseUrl}store/favorites/delete-all`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    });
    const data = await response.json();
    if (!response.ok || !data.status) {
      Toast.show({ 
        type: 'error', 
        text1: 'Delete Error', 
        text2: data.message || 'Failed to clear favorites' 
      });
      return { success: false };
    }
    Toast.show({ type: 'success', text2: data.message });
    return { success: response.ok && data.status };
  } catch (e: any) { 
    Toast.show({ type: 'error', text1: 'Network Error', text2: e.message });
    return { success: false }; 
  }
};
export const deleteProductApi = async (productId: string) => {
  try {
    const response = await fetch(`${baseUrl}store/products/delete/${productId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      }
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Error invoking deleteProductApi:", error);
    throw error;
  }
};
export const deletePostApi = async (postId: string) => {
  try {
    const response = await fetch(`${baseUrl}posts/${postId}/delete`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      }
    });
    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Error invoking deletePostApi:", error);
    throw error;
  }
};