import { baseUrl } from '@components/HomeScreenComponents';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';

const token = await AsyncStorage.getItem('accessToken');
const handleTransactionError = (error: any, title: string) => {
  console.error(`${title}:`, error);
  Toast.show({
    type: 'error',
    text1: title,
    text2: error.message || 'Something went wrong',
  });
};

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
export const initiatePaymentCharge = async (
  type: 'card' | 'account',
  payload: any,
): Promise<{ success: boolean; data?: any; message?: string }> => {
  try {
    const response = await fetch(`${baseUrl}users/payments/initiate-charge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`, 
      },
      body: JSON.stringify({
        paymentType: type,
        paymentData: payload,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      Toast.show({
        type: 'error',
        text1: 'Payment Failed',
        text2: result.message || 'Error processing transaction',
      });
      return { success: false, message: result.message };
    }

    return { success: true, data: result.data };
  } catch (error: any) {
    Toast.show({
      type: 'error',
      text1: 'Connection Error',
      text2: 'Could not reach the payment server',
    });
    return { success: false, message: error.message };
  }
};
export const initializeBuyTransaction = async (payload: any) => {
  try {
    const response = await fetch(`${baseUrl}user/transactions/initialize-buy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) throw new Error(data.message || 'Failed to initialize buy');
    return { success: true, data };
  } catch (error: any) {
    handleTransactionError(error, 'Purchase Error');
    return { success: false, message: error.message };
  }
};
export const initializeWithdrawTransaction = async (payload: any) => {
  try {
    const response = await fetch(`${baseUrl}user/transactions/initialize-withdraw`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'X-Idempotency-Key': Date.now().toString(), 
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) throw new Error(data.message || 'Failed to initialize withdrawal');
    return { success: true, data };
  } catch (error: any) {
    handleTransactionError(error, 'Withdrawal Error');
    return { success: false, message: error.message };
  }
};
export const verifySubscriptionOnBackend = async (transactionId: string, tier: string, currentExchangeRate: number) => {
  try {
    const response = await fetch(`${baseUrl}user/subscriptionPayments/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ transactionId, tier, currentExchangeRate }),
    });
    const result = await response.json();
    return { success: response.ok, data: result };
  } catch (error) {
    return { success: false, error };
  }
};

