import { baseUrl } from '@components/HomeScreenComponents';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CommonActions } from '@react-navigation/native';
import DeviceInfo from 'react-native-device-info';

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
export const toggleBlockUser = async (
  targetUid: string,
): Promise<{ success: boolean; action?: 'blocked' | 'unblocked'; message?: string }> => {
  try {
    const response = await fetch(`${baseUrl}users/block/toggle`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ targetUid }),
    });
    const data = await response.json();
    if (!response.ok) {
      console.error("Failed to toggle block:", data.error);
      Toast.show({
        type: 'error',
        text1: 'Block Error',
        text2: data.error || 'Failed to update block status',
      });
      return { success: false, message: data.error };
    }
    // Success Toast
    Toast.show({
      type: 'success',
      text1: data.action === 'blocked' ? 'User Blocked' : 'User Unblocked',
      text2: data.action === 'blocked' 
        ? 'You will no longer see this user.' 
        : 'You can now see this user\'s profile.',
    });

    return { success: true, action: data.action };
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
export const markAllMessagesRead = async (
  userId: string,
): Promise<{ success: boolean }> => {
  try {
    const response = await fetch(`${baseUrl}users/messages/mark-all-read/${userId}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      const data = await response.json();
      Toast.show({
        type: 'error',
        text1: 'Mark Error',
        text2: data.error || 'Failed to update',
      });
      return { success: false };
    }

    Toast.show({ type: 'success', text1: 'All messages marked as read' });
    return { success: true };
  } catch (error: any) {
    Toast.show({
      type: 'error',
      text1: 'Update Error',
      text2: error.message || 'Check your connection',
    });
    return { success: false };
  }
};
export const verifyICashPin = async (
  pin: string,
): Promise<{ success: boolean; message?: string; isSuspended?: boolean; attemptsRemaining?: number }> => {
  try {
    const response = await fetch(`${baseUrl}user/verify-icash-pin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ pin }),
    });

    const data = await response.json();
    if (!response.ok) {
      Toast.show({
        type: 'error',
        text1: 'PIN Error',
        text2: data.message || 'Verification failed',
      });
      return { 
        success: false, 
        message: data.message, 
        isSuspended: data.isSuspended, 
        attemptsRemaining: data.attemptsRemaining 
      };
    }
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};
export const setupICashPin = async (
  pin: string,
): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await fetch(`${baseUrl}user/setup-icash-pin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ pin }),
    });

    const data = await response.json();

    if (!response.ok) {
      Toast.show({
        type: 'error',
        text1: 'Setup Failed',
        text2: data.message || 'Could not set PIN',
      });
      return { success: false, message: data.message };
    }
    Toast.show({ type: 'success', text1: 'Secure', text2: 'iCash PIN created successfully!' });
    return { success: true, message: data.message };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};
export const requestPinReset = async (): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await fetch(`${baseUrl}user/request-pin-reset`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
    });

    const data = await response.json();

    if (!response.ok) {
      Toast.show({ type: 'error', text1: 'Error', text2: data.message });
      return { success: false, message: data.message };
    }
    Toast.show({ type: 'info', text1: 'OTP Sent', text2: 'Check your registered email.' });
    return { success: true, message: data.message };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};
export const resetICashPin = async (
  otp: string,
  newPin: string,
): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await fetch(`${baseUrl}user/reset-icash-pin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ otp, newPin }),
    });

    const data = await response.json();

    if (!response.ok) {
      Toast.show({ type: 'error', text1: 'Reset Failed', text2: data.message });
      return { success: false, message: data.message };
    }
    Toast.show({ type: 'success', text1: 'Success', text2: 'PIN updated successfully.' });
    return { success: true, message: data.message };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};
export const askIAssistantAgent = async (
  params: {
    message: string,
    history: { role: 'user' | 'model', content: string }[],
    contextType: string,
    contextData: any,
    userState: any, 
  }
): Promise<{ success: boolean; reply?: string; error?: string }> => {
  const { message, history, contextType, contextData, userState } = params;

  try {
    const response = await fetch(`${baseUrl}users/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        message,
        history,
        context: {
          type: contextType,
          data: contextData,
          appMetadata: {
            tier: userState.tier,
            isVerified: userState.isVerified,
            usertype: userState.usertype,
            appVersion: userState.appVersion,
            hasSubscribed: userState.hasSubscribed,
          }
        },
        userId: userState.uid
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      Toast.show({ type: 'error', text2: data.error });
    }
    return { success: true, reply: data.reply };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
};
export const handleLogout = async (navigation: any) => {
  try {
    const currentDeviceId = await DeviceInfo.getUniqueId();
    await fetch(`${baseUrl}users/revoke-session`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify({  
        deviceIdToRevoke: currentDeviceId 
      }),
    });
  } catch (error) {
    console.error("Logout action failed", error);
  } finally {
    await AsyncStorage.clear(); 
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'SignUp' }], 
      })
    );
  }
};
export const verifySignupEmail = async (email: string) => {
  try {
    const response = await fetch(`${baseUrl}users/verifyEmail`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await response.json();
    return { 
      success: response.ok, 
      message: data?.message || 'Email verification failed', 
    };
  } catch (error) {
    return { success: false, message: 'Network error occurred.' };
  }
};

export const verifySignupEmailCode = async (email: string, code: string) => {
  try {
    const response = await fetch(`${baseUrl}users/verifyEmailCode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    });
    const data = await response.json();
    return { 
      verified: data.verified, 
      message: data?.message || 'Invalid or expired code',
    };
  } catch (error) {
    return { verified: false, message: 'Network error occurred.' };
  }
};

export const handleRegisterUser = async (registrationData: any) => {
  try {
    const response = await fetch(`${baseUrl}users/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(registrationData),
    });
    const data = await response.json();
    return { 
      success: data?.success, 
      message: data?.message,
      user: data?.user,
      accessToken: data?.accessToken,
      refreshToken: data?.refreshToken,
      status: response.status,
    };
  } catch (error) {
    return { success: false, message: 'Network error during registration.' };
  }
};

export const verifySignupStudent = async (institution: string, matric: string, signal?: AbortSignal) => {
  try {
    const response = await fetch(`${baseUrl}verifyStudent/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        school_name: institution,
        matriculation_number: matric,
      }),
      signal, 
    });

    const data = await response.json();
    return {
      success: response.ok,
      verified: data.verified,
      data,
      message: response.ok ? 'Student verified' : (data.message || 'Student not found'),
    };
  } catch (error: any) {
    if (error.name === 'AbortError') return { success: false, aborted: true };
    return { success: false, message: 'Network error during student verification.' };
  }
};
export const verifySignupInstructor = async (institution: string, staffId: string, signal?: AbortSignal) => {
  try {
    const response = await fetch(`${baseUrl}verifyInstructor/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        school_name: institution,
        staff_id: staffId,
      }),
      signal,
    });

    const data = await response.json();
    return {
      verified: data.verified,
      success: response.ok,
      data,
      message: response.ok ? 'Instructor verified' : (data.message || 'Instructor not found'),
    };
  } catch (error: any) {
    if (error.name === 'AbortError') return { success: false, aborted: true };
    return { success: false, message: 'Network error during instructor verification.' };
  }
};

export const signupValidateInstitution = async (institution: string) => {
  try {
    const response = await fetch(`${baseUrl}users/institutions/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ schoolName: institution }),
    });

    const data = await response.json();

    return {
      success: response.ok,
      schoolCode: data.schoolCode,
      data,
      message: response.ok 
        ? 'Institution validated' 
        : (data?.message || 'Failed to validate institution'),
    };
  } catch (error: any) {
    if (error.name === 'AbortError') return { success: false, aborted: true };
    return { 
      success: false, 
      message: 'Network error during institution validation' 
    };
  }
};