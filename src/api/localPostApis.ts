import 'react-native-get-random-values'; 
import { v4 as uuidv4 } from 'uuid';
import { baseUrl } from '../components/HomeScreenComponents';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CommonActions } from '@react-navigation/native';
import DeviceInfo from 'react-native-device-info';
import {CartItem, CourseException, Lecture, CreateLecturePayload, CreateTestPayload} from '../types/firebase';
import ReactNativeBlobUtil from 'react-native-blob-util';
import axios from 'axios';
import {getAuthHeaders} from '../utils/userTokenAuth';

interface ServiceResponse {
  success: boolean;
  message: string;
  data?: any;
}
interface P2PTransferPayload {
  recipientId: string;
  recipientiTagName: string;
  amount: number;
  description: string;
}
interface SubmitExceptionResponse {
  success: boolean;
  exception?: CourseException;
  message?: string;
  newIcashBalance?: string
}
interface ScheduleLectureResponse {
  success: boolean;
  message?: string;
  count?: number;
  lecture?: Lecture;
  error?: string;
}
interface ExportTransactionsPayload {
  userId: string;
  startDate: Date;
  endDate: Date;
}
interface VerifyOtpPayload {
  otpCode: string;
  flw_ref: string;
  type: string;
}
interface SaveAssessmentResponse {
  success: boolean;
  message?: string;
  data?: CreateTestPayload; 
  error?: string;
}
 interface DownloadReportResponse {
  success: boolean;
  message?: string;
  localPath?: string;
  error?: string;
}
interface VerifyFaceResponse {
  verified: boolean;
  message?: string;
  similarity?: number;
}
interface UploadMaterialPayload {
  materialUrl: string;
  title?: string;
}
interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
}
 interface SubmitTestResponse {
  success: boolean;
  message: string;
  data?: any;
}
interface ManualCoursePayload {
  courseTitle: string;
  courseCode: string;
  credits: number;
}
interface UploadFilePayload {
  uri: string;
  type: string;
  name: string;
}
interface ManualCourseResponse {
  success: boolean;
  message: string;
  courseId?: string;
}
interface SystemNotificationPayload {
  recipientId: string;
  title: string;
  message: string;
  category: string;
  [key: string]: any; 
}

const handleTransactionError = (error: any, title: string) => {
  console.error(`${title}:`, error);
  Toast.show({
    type: 'error',
    text1: title,
    text2: error.message || 'Something went wrong',
  });
};

export const fetchInquiryFromBackend = async (
  userType: string,
  signal?: AbortSignal
): Promise<{ inquiryId: string }> => {
  const TIMEOUT_MS = 12000;
  const controller = new AbortController();

  if (signal) {
    signal.addEventListener('abort', () => controller.abort());
  }
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const headers = await getAuthHeaders();
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

    const response = await fetch(`${cleanBaseUrl}/verifyUser/persona/create-inquiry`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userType: userType,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const data = await response.json();

    if (!response.ok || !data.inquiryId) {
      const errorMsg = data?.error || 'Failed to create inquiry';
      console.error("Failed to create inquiry:", errorMsg);
      Toast.show({
        type: 'error',
        text1: 'Fetch Error',
        text2: errorMsg,
      });
      return { inquiryId: '' }; 
    }

    return { inquiryId: data.inquiryId }; 
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      Toast.show({
        type: 'error',
        text1: 'Timeout Error',
        text2: 'Verification initialization timed out.',
      });
      return { inquiryId: '' };
    }

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
  deviceIdToRevoke: string,
  signal?: AbortSignal
): Promise<{ success: boolean; message?: string }> => {
  const TIMEOUT_MS = 8000;
  const controller = new AbortController();

  if (signal) {
    signal.addEventListener('abort', () => controller.abort());
  }
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const idempotencyKey = uuidv4();

  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}users/revoke-session`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({ deviceIdToRevoke }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const data = await response.json();

    if (!response.ok || !data.success) {
      const errorMessage = data?.error || data?.message || 'Failed to log out device';
      console.error("Failed to revoke session:", errorMessage);
      Toast.show({
        type: 'error',
        text1: 'Revoke Error',
        text2: errorMessage,
      });
      return { success: false, message: errorMessage };
    }

    Toast.show({
      type: 'success',
      text1: 'Device Logged Out',
      text2: 'The selected session has been terminated.',
    });

    return { success: true, message: data.message };
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      Toast.show({ type: 'error', text1: 'Timeout Error', text2: 'Session revocation timed out.' });
      return { success: false, message: 'Request timed out.' };
    }

    console.error("Backend Error:", error);
    Toast.show({
      type: 'error',
      text1: 'Connection Error',
      text2: error?.message || 'Check your internet connection',
    });
    return { success: false, message: error?.message };
  }
};
export const initiatePaymentCharge = async (
  type: 'card' | 'account',
  payload: any,
): Promise<{ success: boolean; data?: any; message?: string }> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}users/payments/initiate-charge`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': uuidv4(),
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
  const TIMEOUT_MS = 8000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const headers = await getAuthHeaders();
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const url = `${cleanBaseUrl}/user/transactions/initialize-buy`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
        'Idempotency-Key': uuidv4(), 
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to initialize buy');
    }

    return { success: true, data };
  } catch (error: any) {
    clearTimeout(timeoutId);
    const errorMessage = error.name === 'AbortError' ? 'Request timed out' : (error.message || 'Failed to initialize buy');
    const customError = new Error(errorMessage);
    
    handleTransactionError(customError, 'Purchase Error');
    return { success: false, message: errorMessage };
  }
};
export const initializeWithdrawTransaction = async (payload: any): Promise<{ success: boolean; data?: any; message?: string }> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}user/transactions/initialize-withdraw`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': uuidv4(), 
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to initialize withdrawal');
    }
    return { success: true, data };
  } catch (error: any) {
    if (typeof handleTransactionError === 'function') {
      handleTransactionError(error, 'Withdrawal Error');
    }
    return { success: false, message: error.message || 'An unexpected error occurred' };
  }
};
export const verifySubscriptionOnBackend = async (
  transactionId: string, 
  tier: string, 
  currentExchangeRate: number
): Promise<{ success: boolean; data?: any; message?: string }> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}user/subscriptionPayments/verify`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': uuidv4(),
      },
      body: JSON.stringify({ transactionId, tier, currentExchangeRate }),
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      return { 
        success: false, 
        message: result.message || 'Subscription verification failed' 
      };
    }
    
    return { success: true, data: result };
  } catch (error: any) {
    console.error("Subscription Verification Network Error:", error);
    return { 
      success: false, 
      message: error.message || 'Network error during verification' 
    };
  }
};
export const toggleBlockUser = async (
  targetId: string,
  signal?: AbortSignal
): Promise<{ success: boolean; action?: 'blocked' | 'unblocked'; message?: string }> => {
  const TIMEOUT_MS = 8000;
  const controller = new AbortController();

  if (signal) {
    signal.addEventListener('abort', () => controller.abort());
  }
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const idempotencyKey = uuidv4();

  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}users/block/toggle`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({ targetUserId: targetId }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const data = await response.json();

    if (!response.ok || !data.success) {
      const errorMessage = data?.error || data?.message || 'Failed to update block status';
      Toast.show({
        type: 'error',
        text1: 'Block Error',
        text2: errorMessage,
      });
      return { success: false, message: errorMessage };
    }

    Toast.show({
      type: 'success',
      text1: data.action === 'blocked' ? 'User Blocked' : 'User Unblocked',
      text2: data.action === 'blocked' 
        ? 'You will no longer see this user.' 
        : 'You can now see this user\'s profile.',
    });

    return { success: true, action: data.action };
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      Toast.show({ type: 'error', text1: 'Timeout Error', text2: 'Block request timed out.' });
      return { success: false, message: 'Request timed out.' };
    }

    console.error("Toggle Block Utility Error:", error);
    Toast.show({
      type: 'error',
      text1: 'Connection Error',
      text2: error?.message || 'Check your internet connection',
    });
    return { success: false, message: error?.message };
  }
};
export const verifyICashPin = async (
  pin: string,
  signal?: AbortSignal
): Promise<{ success: boolean; message?: string; isSuspended?: boolean; attemptsRemaining?: number }> => {
  const TIMEOUT_MS = 8000;
  const controller = new AbortController();

  if (signal) {
    signal.addEventListener('abort', () => controller.abort());
  }
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const idempotencyKey = uuidv4();

  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}user/verify-icash-pin`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({ pin }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const data = await response.json();

    if (!response.ok || !data.success) {
      const errorMessage = data?.message || 'Verification failed';
      Toast.show({
        type: 'error',
        text1: 'PIN Error',
        text2: errorMessage,
      });
      return { 
        success: false, 
        message: errorMessage, 
        isSuspended: data?.isSuspended, 
        attemptsRemaining: data?.attemptsRemaining 
      };
    }

    return { success: true, message: data?.message };
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      Toast.show({ type: 'error', text1: 'Timeout Error', text2: 'PIN verification timed out.' });
      return { success: false, message: 'Request timed out.' };
    }

    console.error("PIN Verification Utility Error:", error);
    Toast.show({
      type: 'error',
      text1: 'Connection Error',
      text2: error?.message || 'Network error. Try again.',
    });
    return { success: false, message: error?.message || "Network error. Try again." };
  }
};
export const setupICashPin = async (
  pin: string,
  signal?: AbortSignal
): Promise<{ success: boolean; message: string }> => {
  const TIMEOUT_MS = 8000;
  const controller = new AbortController();

  if (signal) {
    signal.addEventListener('abort', () => controller.abort());
  }
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const idempotencyKey = uuidv4();

  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}user/setup-icash-pin`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({ pin }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const data = await response.json();

    if (!response.ok || !data.success) {
      const errorMessage = data?.message || 'Could not set PIN';
      Toast.show({
        type: 'error',
        text1: 'Setup Failed',
        text2: errorMessage,
      });
      return { success: false, message: errorMessage };
    }

    Toast.show({ 
      type: 'success', 
      text1: 'Secure', 
      text2: data?.message || 'iCash PIN created successfully!' 
    });
    return { success: true, message: data?.message || 'PIN created successfully' };
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      Toast.show({ type: 'error', text1: 'Timeout Error', text2: 'PIN setup request timed out.' });
      return { success: false, message: 'Request timed out.' };
    }

    console.error("PIN Setup Utility Error:", error);
    Toast.show({
      type: 'error',
      text1: 'Connection Error',
      text2: error?.message || 'Check your internet connection',
    });
    return { success: false, message: error?.message || 'Network error' };
  }
};
export const requestPinReset = async (
  signal?: AbortSignal
): Promise<{ success: boolean; message: string }> => {
  const TIMEOUT_MS = 10000;
  const controller = new AbortController();

  if (signal) {
    signal.addEventListener('abort', () => controller.abort());
  }
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const idempotencyKey = uuidv4();

  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}user/request-pin-reset`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const data = await response.json();

    if (!response.ok || !data.success) {
      const errorMessage = data?.message || 'Failed to request PIN reset';
      Toast.show({ type: 'error', text1: 'Error', text2: errorMessage });
      return { success: false, message: errorMessage };
    }

    Toast.show({ type: 'info', text1: 'OTP Sent', text2: data?.message || 'Check your registered email.' });
    return { success: true, message: data?.message || 'OTP sent successfully' };
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      Toast.show({ type: 'error', text1: 'Timeout Error', text2: 'PIN reset request timed out.' });
      return { success: false, message: 'Request timed out.' };
    }

    console.error("PIN Reset Request Utility Error:", error);
    Toast.show({ type: 'error', text1: 'Connection Error', text2: error?.message || 'Network error.' });
    return { success: false, message: error?.message || "Network error. Try again." };
  }
};
export const resetICashPin = async (
  otp: string,
  newPin: string,
  signal?: AbortSignal
): Promise<{ success: boolean; message: string }> => {
  const TIMEOUT_MS = 10000;
  const controller = new AbortController();

  if (signal) {
    signal.addEventListener('abort', () => controller.abort());
  }
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const idempotencyKey = uuidv4();

  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}user/reset-icash-pin`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({ otp, newPin }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const data = await response.json();

    if (!response.ok || !data.success) {
      const errorMessage = data?.message || 'Reset failed';
      Toast.show({ type: 'error', text1: 'Reset Failed', text2: errorMessage });
      return { success: false, message: errorMessage };
    }

    Toast.show({ type: 'success', text1: 'Success', text2: data?.message || 'PIN updated successfully.' });
    return { success: true, message: data?.message || 'PIN updated successfully.' };
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      Toast.show({ type: 'error', text1: 'Timeout Error', text2: 'PIN reset request timed out.' });
      return { success: false, message: 'Request timed out.' };
    }

    console.error("PIN Reset Utility Error:", error);
    Toast.show({
      type: 'error',
      text1: 'Connection Error',
      text2: error?.message || 'Network error. Try again.',
    });
    return { success: false, message: error?.message || "Network error. Try again." };
  }
};
export const askIAssistantAgent = async (
  params: {
    message: string;
    history: { role: 'user' | 'model'; content: string }[];
    contextType: string;
    contextData: any;
    userState?: any; 
  },
  signal?: AbortSignal
): Promise<{ success: boolean; reply?: string; ticketId?: string; error?: string }> => {
  const { message, history, contextType, contextData } = params;
  const TIMEOUT_MS = 20000;
  const controller = new AbortController();

  if (signal) {
    signal.addEventListener('abort', () => controller.abort());
  }
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const headers = await getAuthHeaders();
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

    const response = await fetch(`${cleanBaseUrl}/users/ai/chat`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        history: Array.isArray(history) ? history.map(msg => ({
          role: msg.role,
          parts: [{ text: msg.content }]
        })) : [],
        context: {
          type: contextType,
          data: contextData, 
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const data = await response.json();
    
    if (!response.ok || !data.success) {
      const errorMsg = data?.error || 'Failed to fetch academic response';
      Toast.show({ type: 'error', text1: 'AI Assistant Error', text2: errorMsg });
      return { success: false, error: errorMsg };
    }
    
    return { success: true, reply: data.reply, ticketId: data.ticketId };
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      Toast.show({ type: 'error', text1: 'Timeout Error', text2: 'AI assistant request timed out.' });
      return { success: false, error: 'Request timed out.' };
    }

    console.error("Ask AI Assistant Error:", error);
    Toast.show({ type: 'error', text1: 'Network Error', text2: error.message || 'Failed to reach AI assistant' });
    return { success: false, error: error.message };
  }
};
export const handleLogout = async (navigation: any) => {
  try {
    const currentDeviceId = await DeviceInfo.getUniqueId();
    const headers = await getAuthHeaders();
    await fetch(`${baseUrl}users/revoke-session`, {
      method: 'POST',
      headers,
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
  const TIMEOUT_MS = 8000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const idempotencyKey = uuidv4();

  try {
    const response = await fetch(`${baseUrl}users/verifyEmail`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({ email }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const data = await response.json();

    if (!response.ok) {
      return { 
        success: false, 
        message: data?.message || data?.error || 'Email verification failed',
        status: response.status 
      };
    }

    return { 
      success: true, 
      message: data?.message || 'Verification code sent successfully', 
      status: response.status,
    };
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      return { success: false, aborted: true, message: 'Email verification request timed out.' };
    }

    return { 
      success: false, 
      message: 'Network error occurred while sending verification code.' 
    };
  }
};
export const verifySignupEmailCode = async (email: string, code: string) => {
  const TIMEOUT_MS = 6000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const idempotencyKey = uuidv4();

  try {
    const response = await fetch(`${baseUrl}users/verifyEmailCode`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({ email, code }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const data = await response.json();

    if (!response.ok || !data.verified) {
      return { 
        verified: false, 
        success: false,
        message: data?.message || 'Invalid or expired code',
        status: response.status 
      };
    }

    return { 
      verified: true,
      success: true,
      message: data?.message || 'Email verified successfully',
      email: data.email,
      status: response.status,
    };
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      return { verified: false, success: false, message: 'Verification request timed out.' };
    }

    return { 
      verified: false, 
      success: false,
      message: 'Network error occurred during verification.' 
    };
  }
};
export const handleRegisterUser = async (registrationData: any, maxRetries = 3) => {
  const idempotencyKey = uuidv4();
  
  let attempt = 0;
  const TIMEOUT_MS = 10000;

  while (attempt < maxRetries) {
    attempt++;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(`${baseUrl}users/register`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey, 
        },
        body: JSON.stringify(registrationData),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const data = await response.json();
      if (!response.ok) {
        if (response.status >= 400 && response.status < 500) {
          return { 
            success: false, 
            message: data.message || data.error || 'Registration failed',
            status: response.status 
          };
        }
        throw new Error(data.message || data.error || `Server error: ${response.status}`);
      }

      return { 
        success: data?.success ?? true, 
        message: data?.message || 'Registration successful',
        user: data?.user,
        accessToken: data?.accessToken,
        refreshToken: data?.refreshToken,
        status: response.status,
      };

    } catch (error: any) {
      clearTimeout(timeoutId);

      const isTimeout = error.name === 'AbortError';
      const errorMessage = isTimeout 
        ? 'Registration timed out. Check your connection.' 
        : (error.message || 'Network error during registration.');

      if (attempt >= maxRetries) {
        return { 
          success: false, 
          message: errorMessage 
        };
      }
      const backoffDelay = Math.pow(2, attempt - 1) * 1000;
      console.warn(`Registration attempt ${attempt} failed (${errorMessage}). Retrying in ${backoffDelay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, backoffDelay));
    }
  }

  return { 
    success: false, 
    message: 'Network error during registration. Please check your connection.' 
  };
};
export const verifySignupStudent = async (
  schoolId: string, 
  matric: string, 
  signal?: AbortSignal
) => {
  const TIMEOUT_MS = 8000;
  const controller = new AbortController();
  
  if (signal) {
    signal.addEventListener('abort', () => controller.abort());
  }
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const idempotencyKey = uuidv4();

  try {
    const response = await fetch(`${baseUrl}verifyStudent/verify`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({
        school_id: schoolId, 
        matriculation_number: matric,
      }),
      signal: controller.signal, 
    });

    clearTimeout(timeoutId);
    const data = await response.json();

    if (!response.ok) {
      return { success: false, message: data.message || 'Student not found', status: response.status };
    }

    return {
      success: true,
      verified: data.isVerified,
      data, 
      message: 'Student verified',
      status: response.status,
    };
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      return { success: false, aborted: true, message: 'Student verification request timed out.' };
    }

    return { success: false, message: 'Network error during student verification.' };
  }
};
export const verifySignupInstructor = async (
  institution: string, 
  staffId: string, 
  signal?: AbortSignal
) => {
  const TIMEOUT_MS = 8000;
  const controller = new AbortController();

  if (signal) {
    signal.addEventListener('abort', () => controller.abort());
  }
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const idempotencyKey = uuidv4();

  try {
    const response = await fetch(`${baseUrl}verifyInstructor/verify-lecturer`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({
        school_name: institution,
        staff_id: staffId,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const data = await response.json();

    if (!response.ok) {
      return { success: false, message: data.message || 'Instructor not found', status: response.status };
    }

    return {
      verified: data.verified,
      success: true,
      data,
      message: data.message || 'Instructor verified',
      status: response.status,
    };
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      return { success: false, aborted: true, message: 'Instructor verification request timed out.' };
    }

    return { success: false, message: 'Network error during instructor verification.' };
  }
};
export const signupValidateInstitution = async (institution: string) => {
  const TIMEOUT_MS = 6000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const idempotencyKey = uuidv4();

  try {
    const response = await fetch(`${baseUrl}users/institutions/validate`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({ schoolName: institution }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const data = await response.json();

    if (!response.ok) {
      return { 
        success: false, 
        message: data?.message || 'Failed to validate institution',
        status: response.status 
      };
    }

    return {
      success: true,
      schoolName: data.schoolName,
      schoolCode: data.schoolCode,
      data,
      message: data.message || 'Institution validated',
      status: response.status,
    };
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      return { success: false, aborted: true, message: 'Validation request timed out.' };
    }

    return { 
      success: false, 
      message: 'Network error during institution validation' 
    };
  }
};
export const changePassword = async (
  email: string, 
  password: string, 
  confirmPassword: string, 
) => {
  const TIMEOUT_MS = 8000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const idempotencyKey = uuidv4();

  try {
    const response = await fetch(`${baseUrl}users/changePassword`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({ password, confirmPassword, email }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const data = await response.json();

    if (!response.ok) {
      return { 
        success: false, 
        message: data?.message || 'Failed to update password',
        status: response.status 
      };
    }

    return {
      success: true,
      status: response.status,
      message: data?.message || 'Password updated successfully',
    };
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      return { success: false, aborted: true, message: 'Password update request timed out.' };
    }

    return { 
      success: false, 
      message: 'Network error during password update.' 
    };
  }
};
export const handleForgotPassword = async (email: string) => {
  const TIMEOUT_MS = 8000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const idempotencyKey = uuidv4();

  try {
    const response = await fetch(`${baseUrl}users/forgotPassword`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({ email }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const data = await response.json();

    if (!response.ok) {
      return { 
        success: false, 
        message: data?.message || 'Failed to send reset code',
        status: response.status 
      };
    }

    return { 
      success: true, 
      status: response.status,
      message: data?.message || 'Verification code sent, check your email', 
      email: data.email
    };
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      return { success: false, message: 'Password reset request timed out.' };
    }

    return { success: false, message: 'Network error occurred.' };
  }
};
export const loginUser = async (credentials: any, maxRetries = 3) => {
  const idempotencyKey = uuidv4();
  let attempt = 0;
  const TIMEOUT_MS = 6000; 

  while (attempt < maxRetries) {
    attempt++;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(`${baseUrl}users/login`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey, 
        },
        body: JSON.stringify({
          credentials: credentials
        }),
        signal: controller.signal, 
      });

      clearTimeout(timeoutId); 
      const data = await response.json();
      if (!response.ok) {
        if (response.status >= 400 && response.status < 500) {
          return { 
            success: false, 
            message: data.error || data.message || 'Login failed', 
            status: response.status 
          };
        }
        throw new Error(data.error || data.message || `Server error: ${response.status}`);
      }
      return {
        success: true,
        accessToken: data.accessToken, 
        refreshToken: data.refreshToken,
        user: data.user,
        message: data.message || 'Login successful',
        status: response.status,
      };

    } catch (error: any) {
      clearTimeout(timeoutId);

      const isTimeout = error.name === 'AbortError';
      const errorMessage = isTimeout 
        ? 'Request timed out. Check your connection.' 
        : (error.message || 'Network error.');

      if (attempt >= maxRetries) {
        return {
          success: false,
          message: errorMessage,
        };
      }
      const backoffDelay = Math.pow(2, attempt - 1) * 1000;
      console.warn(`Login attempt ${attempt} failed (${errorMessage}). Retrying in ${backoffDelay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, backoffDelay));
    }
  }

  return {
    success: false,
    message: 'Network error. Please check your connection.',
  };
};
export const loginAdmin = async (credentials: any, maxRetries = 3) => {
  const idempotencyKey = uuidv4();
  let attempt = 0;
  const TIMEOUT_MS = 8000;

  while (attempt < maxRetries) {
    attempt++;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(`${baseUrl}users/admin-login`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({ credentials }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const data = await response.json();

      if (!response.ok) {
        if (response.status >= 400 && response.status < 500) {
          Toast.show({ type: 'error', text1: 'Login Failed', text2: data.message || data.error });
          return { success: false, message: data.message || data.error, status: response.status };
        }
        throw new Error(data.message || data.error || `Server error: ${response.status}`);
      }

      return {
        success: true,
        accessToken: data.accessToken, 
        refreshToken: data.refreshToken,
        user: data.admin,
        message: data.message || 'Admin login successful',
        status: response.status,
      };

    } catch (error: any) {
      clearTimeout(timeoutId);

      const isTimeout = error.name === 'AbortError';
      const errorMessage = isTimeout 
        ? 'Request timed out. Check your connection.' 
        : (error.message || 'Network error.');

      if (attempt >= maxRetries) {
        Toast.show({ type: 'error', text1: 'Login Failed', text2: errorMessage });
        return {
          success: false,
          message: errorMessage,
        };
      }
      const backoffDelay = Math.pow(2, attempt - 1) * 1000;
      await new Promise((resolve) => setTimeout(resolve, backoffDelay));
    }
  }

  return {
    success: false,
    message: 'Network error. Please check your connection.',
  };
};
export const refreshAccessToken = async (refreshToken: string) => {
  const TIMEOUT_MS = 6000; 
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${baseUrl}users/refresh-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      await AsyncStorage.setItem('accessToken', data.accessToken);
      return { success: true, accessToken: data.accessToken };
    } else {
      return { success: false, status: response.status };
    }
  } catch (error: any) {
    clearTimeout(timeoutId);
    console.warn('Refresh token network error or timeout:', error.message);
    return { success: false, error: error.message };
  }
};
export const verifyCurrentPassword = async (
  password: string, 
  signal?: AbortSignal
) => {
  const TIMEOUT_MS = 8000;
  const controller = new AbortController();

  if (signal) {
    signal.addEventListener('abort', () => controller.abort());
  }
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const idempotencyKey = uuidv4();

  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}users/password/verify`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({ password }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const result = await response.json();

    if (!response.ok || !result.success) {
      return { 
        success: false, 
        message: result?.message || 'Incorrect current password' 
      };
    }

    return { 
      success: true, 
      message: result?.message || 'Password verified' 
    };
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      return { success: false, message: 'Password verification request timed out.' };
    }

    return { success: false, message: error?.message || "Network error. Try again." };
  }
};
export const handleSendWhatsAppCode = async (
  formattedNumber: string,
  signal?: AbortSignal
): Promise<{ success: boolean; message: string; data?: any }> => {
  const TIMEOUT_MS = 10000;
  const controller = new AbortController();

  if (signal) {
    signal.addEventListener('abort', () => controller.abort());
  }
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const idempotencyKey = uuidv4();

  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}users/send-phone-otp`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({ 
        phoneNumber: formattedNumber, 
        channel: 'whatsapp' 
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const data = await response.json();

    if (!response.ok || !data.success) {
      const errorMessage = data?.message || 'WhatsApp verification failed, please retry.';
      return {
        success: false,
        message: errorMessage,
      };
    }

    return {
      success: true,
      message: 'OTP sent to your WhatsApp!',
      data,
    };
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      return { success: false, message: 'Request timed out. Check your connection.' };
    }

    console.error("WhatsApp Send Error:", error);
    Toast.show({ type: 'error', text2: 'Check your internet connection' });
    return {
      success: false,
      message: 'Check your internet connection.',
    };
  }
};
export const verifyPhoneOTPAPI = async (
  phoneNumber: string, 
  code: string, 
  signal?: AbortSignal
) => {
  const TIMEOUT_MS = 8000;
  const controller = new AbortController();

  if (signal) {
    signal.addEventListener('abort', () => controller.abort());
  }
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const idempotencyKey = uuidv4();

  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}users/verify-phone-otp`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({ 
        phoneNumber, 
        codeInput: code 
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: data?.message || 'Verification failed.',
      };
    }

    return {
      success: true,
      message: data?.message || 'Phone verified!',
      phoneNumbers: data?.phoneNumbers,
    };
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      return { success: false, message: 'OTP verification request timed out.' };
    }

    return { success: false, message: error?.message || 'Connection to server failed' };
  }
};
export const addCommentAPI = async (
  postId: string,
  text: string,
  parentId: string | null = null
) => {
  const TIMEOUT_MS = 8000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const headers = await getAuthHeaders();
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const url = `${cleanBaseUrl}/posts/${postId}/comment`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
        'Idempotency-Key': uuidv4(),
      },
      body: JSON.stringify({ 
        comment: text,
        parentId: parentId || "",
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: data?.message || 'Failed to add comment',
      };
    }

    return {
      success: true,
      data: data, 
      message: 'Comment added',
    };
  } catch (error: any) {
    clearTimeout(timeoutId);
    console.error("addCommentAPI Error:", error);
    return { success: false, message: error.name === 'AbortError' ? 'Request timed out' : 'Connection to server failed' };
  }
};
export const toggleLikeAPI = async (postId: string) => {
  const TIMEOUT_MS = 8000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const headers = await getAuthHeaders();
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const url = `${cleanBaseUrl}/posts/${postId}/like`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
        'Idempotency-Key': uuidv4(),
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: data?.message || 'Failed to sync like',
      };
    }

    return {
      success: true,
      message: data.message,
    };
  } catch (error: any) {
    clearTimeout(timeoutId);
    console.error("toggleLikeAPI Error:", error);
    return { success: false, message: error.name === 'AbortError' ? 'Request timed out' : 'Connection to server failed' };
  }
};
export const createRepostAPI = async (originalPostId: string) => {
  const TIMEOUT_MS = 8000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const headers = await getAuthHeaders();
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const url = `${cleanBaseUrl}/posts/repost`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
        'Idempotency-Key': uuidv4(),
      },
      body: JSON.stringify({
        originalPostId,
        isRepost: true,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: data?.message || 'Failed to repost',
      };
    }

    return {
      success: true,
      data: data,
      message: data.message || 'Reposted successfully!',
    };
  } catch (error: any) {
    clearTimeout(timeoutId);
    console.error("createRepostAPI Error:", error);
    return { 
      success: false, 
      message: error.name === 'AbortError' ? 'Request timed out' : 'Connection to server failed' 
    };
  }
};
export const toggleCommentLikeAPI = async (
  postId: string, 
  commentId: string
) => {
  const TIMEOUT_MS = 8000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const headers = await getAuthHeaders();
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const url = `${cleanBaseUrl}/posts/${postId}/comments/${commentId}/like`;

    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
        'Idempotency-Key': uuidv4(),
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: data?.message || 'Failed to like comment',
      };
    }

    return {
      success: true,
      message: data.message || 'Comment like updated',
    };
  } catch (error: any) {
    clearTimeout(timeoutId);
    console.error("toggleCommentLikeAPI Error:", error);
    return { 
      success: false, 
      message: error.name === 'AbortError' ? 'Request timed out' : 'Connection to server failed' 
    };
  }
};
export const bulkAddToCartApi = async (
  items: { productId: string; quantity: number }[],
  maxRetries = 3
) => {
  const idempotencyKey = uuidv4();
  let attempt = 0;
  const TIMEOUT_MS = 10000; 

  while (attempt < maxRetries) {
    attempt++;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const headers = await getAuthHeaders();
      const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

      const response = await fetch(`${cleanBaseUrl}/store/favorites-to-cart/bulk-add`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({ items }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const result = await response.json();

      if (!response.ok) {
        if (response.status >= 400 && response.status < 500) {
          Toast.show({
            type: 'error',
            text1: 'Failed to Add Items',
            text2: result.error || 'Check your selection and try again.'
          });
          return null;
        }
        throw new Error(result.error || `Server error: ${response.status}`);
      }

      Toast.show({
        type: 'success',
        text1: 'Cart Updated',
        text2: 'Items added successfully.'
      });
      return result;

    } catch (error: any) {
      clearTimeout(timeoutId);

      const isTimeout = error.name === 'AbortError';
      const errorMessage = isTimeout ? 'Request timed out.' : (error.message || 'Network error.');

      if (attempt >= maxRetries) {
        Toast.show({
          type: 'error',
          text1: 'Connection Error',
          text2: errorMessage
        });
        return null;
      }
      const backoffDelay = Math.pow(2, attempt - 1) * 1000;
      console.warn(`Bulk add attempt ${attempt} failed. Retrying in ${backoffDelay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, backoffDelay));
    }
  }
  return null;
};
export const initializeCheckoutTransaction = async (
  payload: any,
  maxRetries = 3
) => {
  const idempotencyKey = uuidv4();
  let attempt = 0;
  const TIMEOUT_MS = 10000;

  while (attempt < maxRetries) {
    attempt++;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const headers = await getAuthHeaders();
      const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

      const response = await fetch(`${cleanBaseUrl}/store/initialize-checkout`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const data = await response.json();

      if (!response.ok) {
        if (response.status >= 400 && response.status < 500) {
          Toast.show({
            type: 'error',
            text1: 'Checkout Failed',
            text2: data?.message || 'Check your selection and try again.',
          });
          return { success: false, message: data?.message || 'Failed to initialize checkout' };
        }
        throw new Error(data?.message || `Server error: ${response.status}`);
      }

      Toast.show({
        type: 'success',
        text1: 'Order Placed',
        text2: 'Checkout completed successfully.',
      });
      return { success: true, data };

    } catch (error: any) {
      clearTimeout(timeoutId);

      const isTimeout = error.name === 'AbortError';
      const errorMessage = isTimeout ? 'Request timed out.' : (error.message || 'Network error.');

      if (attempt >= maxRetries) {
        Toast.show({
          type: 'error',
          text1: 'Connection Error',
          text2: errorMessage,
        });
        return { success: false, message: errorMessage };
      }

      const backoffDelay = Math.pow(2, attempt - 1) * 1000;
      console.warn(`Checkout attempt ${attempt} failed. Retrying in ${backoffDelay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, backoffDelay));
    }
  }

  return { success: false, message: 'Max retry attempts reached.' };
};
export const completeOrderDelivery = async (orderId: string, maxRetries = 3) => {
  const idempotencyKey = uuidv4();
  let attempt = 0;
  const TIMEOUT_MS = 10000;
  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

  while (attempt < maxRetries) {
    attempt++;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${cleanBaseUrl}/store/orders/complete-delivery`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({ orderId }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const data = await response.json();

      if (!response.ok || data.success === false) {
        if (response.status >= 400 && response.status < 500) {
          Toast.show({
            type: 'error',
            text1: 'Verification Failed',
            text2: data?.message || 'Verification failed. Please try again.',
          });
          return { 
            success: false, 
            message: data?.message || 'Verification failed. Please try again.' 
          };
        }
        throw new Error(data?.message || `Server error: ${response.status}`);
      }

      Toast.show({
        type: 'success',
        text1: 'Delivery Verified',
        text2: data.message || 'Transaction completed successfully!',
      });

      return { 
        success: true, 
        message: data.message || 'Transaction completed successfully!',
        orderId: data.orderId,
        settlementAmount: data.settlementAmount,
        role: data.role,
        productName: data.productName
      };

    } catch (error: any) {
      clearTimeout(timeoutId);

      const isTimeout = error.name === 'AbortError';
      const errorMessage = isTimeout ? 'Request timed out.' : (error.message || 'Network error occurred.');

      if (attempt >= maxRetries) {
        Toast.show({
          type: 'error',
          text1: 'Connection Error',
          text2: errorMessage,
        });
        return { success: false, message: errorMessage };
      }

      const backoffDelay = Math.pow(2, attempt - 1) * 1000;
      console.warn(`Delivery completion attempt ${attempt} failed. Retrying in ${backoffDelay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, backoffDelay));
    }
  }

  return { success: false, message: 'Max retry attempts reached.' };
};
export const cancelOrderAPI = async (
  orderId: string,
  reason: string,
  maxRetries = 3
) => {
  const idempotencyKey = uuidv4();
  let attempt = 0;
  const TIMEOUT_MS = 10000;
  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

  while (attempt < maxRetries) {
    attempt++;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const url = `${cleanBaseUrl}/store/orders/cancel`;
      const headers = await getAuthHeaders();
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({ orderId, reason }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const result = await response.json();

      if (!response.ok || result.success === false) {
        if (response.status >= 400 && response.status < 500) {
          Toast.show({
            type: 'error',
            text1: 'Cancellation Failed',
            text2: result.message || 'Failed to cancel order',
          });
          return {
            success: false,
            message: result.message || 'Failed to cancel order',
          };
        }
        throw new Error(result.message || `Server error: ${response.status}`);
      }

      Toast.show({
        type: 'success',
        text1: 'Order Cancelled',
        text2: result.message || 'Order successfully cancelled and refunded.',
      });

      return {
        success: true,
        message: result.message,
      };

    } catch (error: any) {
      clearTimeout(timeoutId);

      const isTimeout = error.name === 'AbortError';
      const errorMessage = isTimeout ? 'Request timed out.' : (error.message || 'Network error.');

      if (attempt >= maxRetries) {
        Toast.show({
          type: 'error',
          text1: 'Connection Error',
          text2: errorMessage,
        });
        return { success: false, message: errorMessage };
      }

      const backoffDelay = Math.pow(2, attempt - 1) * 1000;
      console.warn(`Cancel order attempt ${attempt} failed. Retrying in ${backoffDelay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, backoffDelay));
    }
  }

  return { success: false, message: 'Max retry attempts reached.' };
};
export const requestPayoutAPI = async (amount: number, maxRetries = 3) => {
  const idempotencyKey = uuidv4();
  let attempt = 0;
  const TIMEOUT_MS = 10000;
  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

  while (attempt < maxRetries) {
    attempt++;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const url = `${cleanBaseUrl}/store/payouts/request-payout`;
      const headers = await getAuthHeaders();
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({ amount }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const result = await response.json();

      if (!response.ok || result.success === false) {
        if (response.status >= 400 && response.status < 500) {
          Toast.show({
            type: 'error',
            text1: 'Payout Failed',
            text2: result.message || 'Failed to process payout request',
          });
          return {
            success: false,
            message: result.message || 'Failed to process payout request',
          };
        }
        throw new Error(result.message || `Server error: ${response.status}`);
      }

      Toast.show({
        type: 'success',
        text1: 'Payout Successful',
        text2: `Successfully transferred ${amount.toLocaleString()} iCash to your wallet.`,
      });

      return {
        success: true,
        newPointsBalance: result.newPointsBalance,
        transactionId: result.transactionId,
      };

    } catch (error: any) {
      clearTimeout(timeoutId);

      const isTimeout = error.name === 'AbortError';
      const errorMessage = isTimeout ? 'Request timed out.' : (error.message || 'Network error.');

      if (attempt >= maxRetries) {
        Toast.show({
          type: 'error',
          text1: 'Connection Error',
          text2: errorMessage,
        });
        return { success: false, message: errorMessage };
      }

      const backoffDelay = Math.pow(2, attempt - 1) * 1000;
      console.warn(`Request payout attempt ${attempt} failed. Retrying in ${backoffDelay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, backoffDelay));
    }
  }

  return { success: false, message: 'Max retry attempts reached.' };
};
export const saveProductApiCall = async (
  payload: any, 
  productId?: string, 
  onProgress?: (percentage: number) => void
) => {
  const isEditing = !!productId;
  const token = await AsyncStorage.getItem('accessToken');
  const idempotencyKey = uuidv4();

  const multipartFields: any[] = [
    { name: 'title', data: String(payload.title) },
    { name: 'description', data: String(payload.description) },
    { name: 'productType', data: String(payload.productType) },
    { name: 'price', data: String(payload.price) },
  ];

  if (payload.productType === 'physical') {
    multipartFields.push(
      { name: 'weightKg', data: String(payload.physicalDetails?.weightKg || '') },
      { name: 'inStock', data: String(payload.physicalDetails?.inStock || '') },
      { name: 'colors', data: JSON.stringify(payload.physicalDetails?.colors || []) },
      { name: 'sizes', data: JSON.stringify(payload.physicalDetails?.sizes || []) },
      { name: 'sellerGateways', data: JSON.stringify(payload.physicalDetails?.sellerGateways || []) },
      { name: 'dropOffAddress', data: JSON.stringify(payload.physicalDetails?.dropOffAddress || []) }
    );
  }

  if (payload.mediaUrls) {
    const thumbnailData = Array.isArray(payload.mediaUrls)
      ? JSON.stringify(payload.mediaUrls)
      : String(payload.mediaUrls);
      
    multipartFields.push({ name: 'mediaUrls', data: thumbnailData });
  }

  const method = isEditing ? 'PUT' : 'POST'; 
  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const endpoint = isEditing 
    ? `${cleanBaseUrl}/store/products/edit/${productId}` 
    : `${cleanBaseUrl}/store/products/create`;

  try {
    const response = await ReactNativeBlobUtil.config({
      fileCache: true,
    })
    .fetch(
      method,
      endpoint,
      {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
        'Idempotency-Key': idempotencyKey,
      },
      multipartFields
    )
    .uploadProgress({ interval: 250 }, (written, total) => {
      if (onProgress && total > 0) {
        onProgress(Math.round((written / total) * 100));
      }
    });

    const result = await response.json();
    return result;
  } catch (error: any) {
    console.error("saveProductApiCall Error:", error);
    return { 
      success: false, 
      message: error.message || 'Network error occurred while saving product' 
    };
  }
};
export const submitReviewApi = async (
  reviewPayload: any, 
  authToken: string, 
  signal?: AbortSignal
) => {
  const TIMEOUT_MS = 8000;
  const controller = new AbortController();

  if (signal) {
    signal.addEventListener('abort', () => controller.abort());
  }
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const idempotencyKey = uuidv4();

  try {
    const response = await fetch(`${baseUrl}users/reviews/create`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({
        targetId: reviewPayload.targetId,
        targetType: reviewPayload.targetType,
        orderId: reviewPayload.orderId || null,
        rating: reviewPayload.rating,
        comment: reviewPayload.comment,
        attributes: reviewPayload.attributes,
        mediaUrls: reviewPayload.mediaUrls,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: result?.message || 'Failed to submit review.',
        status: response.status,
      };
    }

    return {
      success: true,
      message: result?.message || 'Review submitted successfully.',
      status: response.status,
      reviewId: result?.reviewId,
    };
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      return { success: false, aborted: true, message: 'Review submission request timed out.' };
    }

    console.error('Error invoking submitReviewApi:', error);
    return {
      success: false,
      message: error?.message || 'Network error during review submission.',
    };
  }
};
export const submitOrUpdatePostService = async (
  postData: any,
  isEditMode: boolean,
  postId?: string
): Promise<ServiceResponse> => { 
  const TIMEOUT_MS = 10000;
  const headers = await getAuthHeaders();
  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  
  const config = {
    headers: {
      ...headers,
      'Idempotency-Key': uuidv4(),
    },
    timeout: TIMEOUT_MS,
  };

  try {
    if (isEditMode) {
      if (!postId) {
        Toast.show({ type: 'error', text2: 'Missing crucial parameter for update operation' });
        return {
          success: false,
          message: 'Missing crucial parameter for update operation',
        };
      }
      
      const response = await axios.put(`${cleanBaseUrl}/posts/${postId}/update`, postData, config);
      const result = response.data;

      if (!result.success) {
        Toast.show({
          type: 'error',
          text2: result.message || 'Failed to edit post'
        });
        return {
          success: false,
          message: result.message || 'Failed to edit post'
        };
      }
      
      Toast.show({ type: 'success', text2: result.message || 'Post edit successful' });
      return {
        success: true,
        message: result.message || 'Post edit successful',
        data: result.data
      };

    } else {
      const response = await axios.post(`${cleanBaseUrl}/posts/create`, postData, config);
      const result = response.data;
      
      if (!result.success) {
        Toast.show({
          type: 'error',
          text2: result.message || 'Failed to create post.'
        });
        return {
          success: false,
          message: result.message || 'Failed to create post'
        };
      }
      
      Toast.show({ type: 'success', text2: result.message || 'Post creation successful' });
      return {
        success: true,
        message: result.message || 'Post creation successful',
        data: result.data
      };
    }
  } catch (error: any) {
    const serverMessage = error.code === 'ECONNABORTED' 
      ? 'Request timed out. Please try again.' 
      : error.response?.data?.message || 'Network transaction failed';
      
    Toast.show({
      type: 'error',
      text2: serverMessage
    });
    return {
      success: false,
      message: serverMessage
    };
  }
};
export const executeP2PTransfer = async (
  payload: P2PTransferPayload
): Promise<{ success: boolean; message?: string; transactionRef?: string }> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}user/transactions/p2p-transfer`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': uuidv4(),
      },
      body: JSON.stringify(payload),
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      Toast.show({
        type: 'error',
        text1: 'Transfer Error',
        text2: result.message || 'Failed to complete P2P transfer',
      });
      return { success: false, message: result.message };
    }
    
    return { success: true, transactionRef: result.transactionRef };
  } catch (error: any) {
    console.error("P2P Transfer Utility Error:", error);
    Toast.show({
      type: 'error',
      text1: 'Connection Error',
      text2: 'An unexpected error occurred during transfer.',
    });
    return { success: false, message: error.message };
  }
};
export const toggleFollowUser = async (
  targetFollowingId: string,
  signal?: AbortSignal
): Promise<{ success: boolean; action?: 'followed' | 'unfollowed'; message?: string }> => {
  const TIMEOUT_MS = 7000;
  const controller = new AbortController();

  if (signal) {
    signal.addEventListener('abort', () => controller.abort());
  }
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const idempotencyKey = uuidv4();

  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}users/follow/toggle`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({ followingId: targetFollowingId }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const result = await response.json();

    if (!response.ok || !result.success) {
      const errorMessage = result?.message || 'Failed to update follow status';
      return { success: false, message: errorMessage };
    }

    return result;
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      return { success: false, message: 'Request timed out.' };
    }

    console.error('Toggle Follow Utility Error:', error);
    return { success: false, message: error?.message || 'Network error.' };
  }
};
export const toggleBlockUserFromProfile = async (
  targetUserId: string,
  signal?: AbortSignal
): Promise<{ success: boolean; action?: 'blocked' | 'unblocked' }> => {
  const TIMEOUT_MS = 8000;
const controller = new AbortController();

if (signal) {
  signal.addEventListener('abort', () => controller.abort());
}
const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
const idempotencyKey = uuidv4();
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}users/block/toggle`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({ targetUserId }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const result = await response.json();
    return response.ok ? { success: true, action: result.action } : { success: false };
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      Toast.show({ type: 'error', text1: 'Timeout Error', text2: 'Block request timed out.' });
      return { success: false, };
    }
    console.error('Toggle Block Utility Error:', error);
    return { success: false };
  }
};
export const submitLectureException = async (
  newException: Partial<CourseException>,
  signal?: AbortSignal
): Promise<SubmitExceptionResponse> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}users/student/class/exceptions/submit`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': uuidv4(),
      },
      body: JSON.stringify(newException),
      signal,
    });

    const result = await response.json();
    if (!response.ok) {
      return { 
        success: false, 
        message: result.message || 'Failed to submit exception report' 
      };
    }
    return {
      success: true,
      exception: result.exception,
      newIcashBalance: result.newBalance
    };

  } catch (error: any) {
    if (error.name === 'AbortError') return { success: false, message: 'Request cancelled.' };
    console.error('Submit Student Exception Utility Error:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'An unknown network error occurred.' 
    };
  }
};
export const createLectureSchedule = async (
  courseId: string,
  lectureData: CreateLecturePayload,
  signal?: AbortSignal
): Promise<ScheduleLectureResponse> => {
  try {
    const finalPayload = {
      ...lectureData,
      courseId: courseId,
      location: lectureData.lectureType === 'Online' ? '' : lectureData.location,
    };
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${baseUrl}users/lecturers/class/courses/${courseId}/lectures/createSchedule`,
      {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': uuidv4(),
        },
        body: JSON.stringify(finalPayload),
        signal,
      }
    );
    const data = await response.json();
    if (!response.ok) {
      return {
        success: false,
        error: data.message || 'Check your inputs and try again.',
      };
    }
    return {
      success: true,
      message: data.message,
      count: data.count,
      lecture: data.lecture,
    };
  } catch (error: any) {
    if (error.name === 'AbortError') return { success: false, error: 'Request cancelled.' };
    console.error("Schedule Lecture Utility Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown network error',
    };
  }
};
export const saveCourseAssessment = async (
  courseId: string,
  testData: CreateTestPayload,
  signal?: AbortSignal
): Promise<SaveAssessmentResponse> => {
  try {
    const finalPayload = {
      ...testData,
      courseId: courseId,
      duration: Number(testData.duration),
      totalMarks: Number(testData.totalMarks),
      questions: testData.questions.map(q => ({
        ...q
      })),
    };
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${baseUrl}users/lecturers/class/courses/${courseId}/assessments`,
      {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': uuidv4(),
        },
        body: JSON.stringify(finalPayload),
        signal,
      }
    );
    const result = await response.json();
    if (!response.ok) {
      return {
        success: false,
        error: result.message || 'Failed to save assessment configuration.',
      };
    }
    return {
      success: true,
      message: result.message,
      data: result.data,
    };
  } catch (error: any) {
    if (error.name === 'AbortError') return { success: false, error: 'Request cancelled.' };
    console.error("Save Assessment Utility Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown network error',
    };
  }
};
export const downloadAttendanceReport = async (
  lectureId: string,
  courseTitle: string,
  exceptions: any[],
  signal?: AbortSignal
): Promise<DownloadReportResponse> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}users/lecturers/class/lectures/${lectureId}/report`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': uuidv4(),
      },
      body: JSON.stringify({ exceptions }),
      signal,
    });
    const result = await response.json();
    if (!response.ok) {
      return {
        success: false,
        error: result.message || 'Server failed to compile the attendance sheet.',
      };
    }
    if (!result.pdfUrl) {
      return {
        success: false,
        error: 'Report compiled, but no downloadable document link was returned.',
      };
    }
    const { fs } = ReactNativeBlobUtil;
    const dateStr = new Date().toISOString().split('T')[0];
    const cleanCourseCode = (courseTitle || 'Course').replace(/\s+/g, '_');
    const filename = `Attendance_${cleanCourseCode}_${dateStr}.pdf`;
    const localDestPath = `${fs.dirs.DownloadDir}/${filename}`;
    await ReactNativeBlobUtil.config({
      path: localDestPath,
      addAndroidDownloads: {
        useDownloadManager: true,
        title: filename,
        description: 'iCampus Attendance Sheet Report Document.',
        mime: 'application/pdf',
        mediaScannable: true,
        notification: true,
      },
    }).fetch('GET', result.pdfUrl);

    return {
      success: true,
      message: result.message || 'Report saved successfully.',
      localPath: localDestPath,
    };
  } catch (error: any) {
    if (error.name === 'AbortError') return { success: false, error: 'Request cancelled.' };
    console.error('Download Attendance Report Utility Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown network connection failure.',
    };
  }
};
export const verifyFacialIdentity = async (
  base64Image: string,
  schoolAvatarUrl: string,
  signal?: AbortSignal
): Promise<VerifyFaceResponse> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}users/student/class/attendance/verify-student`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': uuidv4(),
      },
      body: JSON.stringify({
        selfieBase64: base64Image,
        targetImageUrl: schoolAvatarUrl,
      }),
      signal,
    });

    if (response.status === 401) {
      return { verified: false, message: "Session expired. Please log back in." };
    }
    const result = await response.json();
    return {
      verified: response.ok && result.verified,
      message: result.message,
      similarity: result.similarity
    };
  } catch (error: any) {
    if (error.name === 'AbortError') return { verified: false, message: 'Request cancelled.' };
    console.error("API Utility Network Exception:", error);
    return {
      verified: false,
      message: "Network communication timeout. Is your internet active?",
    };
  }
};
export const saveCourseMaterial = async (
  courseId: string,
  payload: UploadMaterialPayload,
  signal?: AbortSignal
): Promise<{ success: boolean; message?: string; error?: string }> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${baseUrl}users/lecturers/class/courses/uploadMaterial/${courseId}`,
      {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': uuidv4(),
        },
        body: JSON.stringify(payload),
        signal,
      }
    );
    const result = await response.json();
    if (!response.ok) {
      return {
        success: false,
        error: result.message || 'Failed to sync material with backend servers.',
      };
    }
    return {
      success: true,
      message: result.message || 'Material synchronized successfully.',
    };
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return { success: false, error: 'Request cancelled.' };
    }
    console.error("Save Material Utility Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown network error occurred',
    };
  }
};
export const createCourseContent = async (
  courseId: string,
  topic: string,
  signal?: AbortSignal
): Promise<{ success: boolean; data?: any; error?: string }> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}users/lecturers/class/courses/addCourseContent/${courseId}`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': uuidv4(),
      },
      body: JSON.stringify({ topic }),
      signal,
    });
    const result = await response.json();
    if (!response.ok) return { success: false, error: result.message || 'Failed to add topic.' };
    return { success: true, data: result.updatedContents };
  } catch (error: any) {
    if (error.name === 'AbortError') return { success: false, error: 'Request cancelled.' };
    return { success: false, error: error.message || 'Network error occurred' };
  }
};
export const createAssignment = async (courseId: string, formData: FormData): Promise<ApiResponse> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}users/lecturers/class/courses/${courseId}/assignments`, {
      method: 'POST',
      headers: {
        ...headers,
      },
      body: formData,
    });

    const result = await response.json();
    if (!response.ok) {
      return { success: false, error: result.message || 'Failed to post assignment.' };
    }
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Network error occurred.' };
  }
};
export const submitStudentTest = async (
  payload: any,
  signal?: AbortSignal
): Promise<SubmitTestResponse> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}users/student/class/test/submit`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': uuidv4(),
      },
      body: JSON.stringify(payload),
      signal,
    });

    if (response.status === 401) {
      return { 
        success: false, 
        message: "Session expired. Please log back in." 
      };
    }

    const result = await response.json();

    if (response.ok) {
      return {
        success: true,
        message: result.message || 'Test submitted successfully.',
        data: result
      };
    } else {
      return {
        success: false,
        message: result.message || 'Submission failed on server validation.'
      };
    }
  } catch (error: any) {
    if (error.name === 'AbortError') return { success: false, message: 'Request cancelled.' };
    console.error("API Utility Network Exception (submitStudentTest):", error);
    return {
      success: false,
      message: "Network communication timeout. Is your internet active?",
    };
  }
};
export const verifyPaymentOtpAPI = async (payload: VerifyOtpPayload): Promise<{ success: boolean; data?: any; message?: string }> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}user/payments/verify-otp`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': uuidv4(),
      },
      body: JSON.stringify(payload),
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        message: result.message || 'OTP verification failed',
      };
    }

    return {
      success: true,
      data: result.data,
      message: result.message,
    };
  } catch (error: any) {
    console.error("verifyPaymentOtpAPI Error:", error);
    return { success: false, message: error.message || 'Server connection failed' };
  }
};
export const submitOnlineClassAttendanceAPI = async (
  payload: any,
  signal?: AbortSignal
) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}users/student/class/submit-attendance`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': uuidv4(),
      },
      body: JSON.stringify({
        ...payload,
        timestamp: new Date().toISOString(), 
      }),
      signal,
    });

    const result = await response.json();
    if (!response.ok) {
      return {
        success: false,
        message: result.message || 'Failed to submit class attendance.',
      };
    }
    return {
      success: true,
      data: result.data,
      message: result.message || 'Attendance submitted successfully!',
    };

  } catch (error: any) {
    if (error.name === 'AbortError') return { success: false, message: 'Request cancelled.' };
    console.error("submitAttendanceAPI Error:", error);
    return {
      success: false,
      message: error.message || 'Server connection failed. Please try again.',
    };
  }
};
export const exportTransactionsAPI = async (payload: ExportTransactionsPayload): Promise<{ success: boolean; data?: any; message?: string }> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}user/transactions/export`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': uuidv4(),
      },
      body: JSON.stringify({
        userId: payload.userId,
        startDate: payload.startDate.toISOString(),
        endDate: payload.endDate.toISOString(),
      }),
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        message: result.message || 'Failed to export transactions.',
      };
    }

    return {
      success: true,
      data: result.data,
      message: result.message || 'Statement sent to your email.',
    };
  } catch (error: any) {
    console.error("exportTransactionsAPI Error:", error);
    return {
      success: false,
      message: error.message || 'Server connection failed. Please try again.',
    };
  }
};
export const extractCourseFormAPI = async (
  fileParam: UploadFilePayload,
  onProgress: (percent: number) => void,
  signal?: AbortSignal
) => {
  const headers = await getAuthHeaders();
  const formData = new FormData();
  formData.append('file', {
    uri: fileParam.uri,
    type: fileParam.type,
    name: fileParam.name,
  } as any);

  return await axios.post(
    `${baseUrl}users/course/extract-course-details-from-uploads`,
    formData,
    {
      headers: {
        ...headers,
        'X-Idempotency-Key': uuidv4(),
      },
      signal, 
      onUploadProgress: (progressEvent) => {
        const percentCompleted = (progressEvent.loaded || 0) / (progressEvent.total || 1);
        onProgress(percentCompleted);
      },
    }
  );
};
export const createManualCourseAPI = async (
  courseData: ManualCoursePayload,
  signal?: AbortSignal
): Promise<ManualCourseResponse> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}users/courses/manual-create`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': uuidv4(),
      },
      body: JSON.stringify(courseData),
      signal,
    });

    const data = await response.json();
    if (!response.ok) {
      return {
        success: false,
        message: data?.message || 'Failed to register the course entry manually.',
      };
    }
    return {
      success: true,
      message: data?.message || 'Course compiled and tracked successfully!',
      courseId: data?.courseId,
    };
  } catch (error: any) {
    if (error.name === 'AbortError') return { success: false, message: 'Request cancelled.' };
    console.error('createManualCourseAPI Connection Error:', error);
    return {
      success: false,
      message: 'Network error encountered. Please check your connection and try again.',
    };
  }
};
export const createAdminApi = async (adminData: any) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}admins/create`, {
      method: 'POST',
      headers: { 
        ...headers, 
        'Content-Type': 'application/json',
        'X-Idempotency-Key': uuidv4(),
      },
      body: JSON.stringify(adminData),
    });
    
    const result = await response.json();
    if (!response.ok) {
      Toast.show({ type: 'error', text1: 'Create Error', text2: result.error || 'Failed to create admin' });
      return;
    }
    return result;
  } catch (error: any) {
    Toast.show({ type: 'error', text1: 'Create Error', text2: error.message });
    return;
  }
};
export const createSupportTicketApi = async (
  ticketData: { 
    message: string; 
    category: string; 
    summary?: string; 
  },
  maxRetries = 3
) => {
  const idempotencyKey = uuidv4();
  let attempt = 0;
  const TIMEOUT_MS = 8000;

  while (attempt < maxRetries) {
    attempt++;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const headers = await getAuthHeaders();
      const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

      const response = await fetch(`${cleanBaseUrl}/support/tickets/create-ticket`, {
        method: 'POST',
        headers: { 
          ...headers, 
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify(ticketData),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const result = await response.json();

      if (!response.ok) {
        if (response.status >= 400 && response.status < 500) {
          Toast.show({ 
            type: 'error', 
            text1: 'Submission Failed', 
            text2: result.error || result.message || 'Unable to contact support' 
          });
          return null;
        }
        throw new Error(result.error || result.message || `Server error: ${response.status}`);
      }

      Toast.show({ 
        type: 'success', 
        text1: 'Support Contacted', 
        text2: 'Expect a reply within 24 hours.' 
      });
      return result;

    } catch (error: any) {
      clearTimeout(timeoutId);

      const isTimeout = error.name === 'AbortError';
      const errorMessage = isTimeout 
        ? 'Support ticket submission timed out.' 
        : (error.message || 'Network error.');

      if (attempt >= maxRetries) {
        Toast.show({ 
          type: 'error', 
          text1: 'Connection Error', 
          text2: errorMessage 
        });
        return null;
      }

      const backoffDelay = Math.pow(2, attempt - 1) * 1000;
      console.warn(`Support ticket attempt ${attempt} failed (${errorMessage}). Retrying in ${backoffDelay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, backoffDelay));
    }
  }

  Toast.show({ 
    type: 'error', 
    text1: 'Connection Error', 
    text2: 'Network error occurred.' 
  });
  return null;
};
export const sendSystemNotification = async (notificationData: SystemNotificationPayload) => {
  try {
    const url = `${baseUrl}admins/support/send-notification`;
    const headers = await getAuthHeaders();
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': uuidv4(),
      },
      body: JSON.stringify(notificationData),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      Toast.show({
        type: 'error',
        text1: 'Notification Failed',
        text2: data?.message || 'Could not send the message to the user.',
      });
      return { success: false };
    }
    
    Toast.show({
      type: 'success',
      text1: 'Message Sent',
      text2: 'The user has been notified successfully.',
    });
    
    return { success: true, notification: data.notification || data };
  } catch (error) {
    console.error("sendSystemNotification Error:", error);
    Toast.show({
      type: 'error',
      text1: 'Connection Error',
      text2: 'Failed to send the notification.',
    });
    return { success: false };
  }
};
export const createPublicMeeting = async (
  meetingData: { topicName: string; date: string; startTime: string; endTime: string },
  maxRetries = 3
): Promise<{ success: boolean; meeting?: any; error?: string }> => {
  const idempotencyKey = uuidv4();
  let attempt = 0;
  const TIMEOUT_MS = 8000;

  while (attempt < maxRetries) {
    attempt++;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const headers = await getAuthHeaders();
      const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

      const response = await fetch(`${cleanBaseUrl}/users/online-classes/create`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          ...meetingData,
          lectureType: 'Online',
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const data = await response.json();

      if (!response.ok) {
        if (response.status >= 400 && response.status < 500) {
          return { 
            success: false, 
            error: data.message || 'Failed to create meeting.', 
          };
        }
        throw new Error(data.message || `Server error: ${response.status}`);
      }

      if (!data.success) {
        return { success: false, error: data.message || 'Failed to create meeting.' };
      }

      return { success: true, meeting: data.meeting };

    } catch (error: any) {
      clearTimeout(timeoutId);

      const isTimeout = error.name === 'AbortError';
      const errorMessage = isTimeout 
        ? 'Meeting creation request timed out.' 
        : (error.message || 'Network error.');

      if (attempt >= maxRetries) {
        return {
          success: false,
          error: errorMessage,
        };
      }

      const backoffDelay = Math.pow(2, attempt - 1) * 1000;
      console.warn(`Public meeting creation attempt ${attempt} failed (${errorMessage}). Retrying in ${backoffDelay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, backoffDelay));
    }
  }

  return {
    success: false,
    error: 'Network error occurred. Please check your connection.',
  };
};
export const createInstitutionApi = async (institutionData: any, signal?: AbortSignal) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}admins/institutions/create`, {
      method: 'POST',
      headers: { 
        ...headers, 
        'Content-Type': 'application/json',
        'X-Idempotency-Key': uuidv4(),
      },
      body: JSON.stringify(institutionData),
      signal,
    });

    const data = await response.json();
    return response.ok ? { success: true, data } : { success: false, error: data.message };
  } catch (error: any) {
    if (error.name === 'AbortError') return { success: false, error: 'Request cancelled.' };
    return { success: false, error: 'Network error.' };
  }
};
export const createStationApi = async (stationData: any, signal?: AbortSignal) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}admins/stations/create`, {
      method: 'POST',
      headers: { 
        ...headers, 
        'Content-Type': 'application/json',
        'X-Idempotency-Key': uuidv4(),
      },
      body: JSON.stringify(stationData),
      signal,
    });

    const data = await response.json();
    return response.ok 
      ? { success: true, data: data.station } 
      : { success: false, error: data.message || 'Failed to create station.' };
  } catch (error: any) {
    if (error.name === 'AbortError') return { success: false, error: 'Request cancelled.' };
    console.error("Create Station API Error:", error);
    return { success: false, error: 'Network error occurred.' };
  }
};
export const requestDropStationApi = async (
  stationData: {
    name: string;
    address: string;
    images: string[];
    latitude: number;
    longitude: number;
  },
  maxRetries = 3
): Promise<{ success: boolean; data?: any; error?: string }> => {
  const idempotencyKey = uuidv4();
  let attempt = 0;
  const TIMEOUT_MS = 10000;

  while (attempt < maxRetries) {
    attempt++;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const headers = await getAuthHeaders();
      const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

      const response = await fetch(`${cleanBaseUrl}/users/stations/register`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify(stationData),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const data = await response.json();

      if (!response.ok) {
        if (response.status >= 400 && response.status < 500) {
          return { 
            success: false, 
            error: data.message || 'Registration failed.' 
          };
        }
        throw new Error(data.message || `Server error: ${response.status}`);
      }

      return { success: true, data };

    } catch (error: any) {
      clearTimeout(timeoutId);

      const isTimeout = error.name === 'AbortError';
      const errorMessage = isTimeout 
        ? 'Station registration request timed out.' 
        : (error.message || 'Network error.');

      if (attempt >= maxRetries) {
        return { success: false, error: errorMessage };
      }

      const backoffDelay = Math.pow(2, attempt - 1) * 1000;
      console.warn(`Station registration attempt ${attempt} failed (${errorMessage}). Retrying in ${backoffDelay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, backoffDelay));
    }
  }

  return { success: false, error: 'Network error occurred.' };
};
export const createAdApi = async (
  adData: {
    type: 'image' | 'video';
    mediaUrl: string;
    targetUrl?: string;
    advertiserLogo: string;
    advertiserName: string;
    tagline?: string;
  },
  signal?: AbortSignal
) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}admins/ads/create`, {
      method: 'POST',
      headers: { 
        ...headers, 
        'Content-Type': 'application/json',
        'X-Idempotency-Key': uuidv4(),
      },
      body: JSON.stringify(adData),
      signal,
    });

    const data = await response.json();
    return response.ok 
      ? { success: true, data: data } 
      : { success: false, error: data.message || 'Failed to create advertisement.' };
  } catch (error: any) {
    if (error.name === 'AbortError') return { success: false, error: 'Request cancelled.' };
    console.error("Create Ad API Error:", error);
    return { success: false, error: 'Network error occurred.' };
  }
};
export const sendSupportMessageApi = async (
  ticketRefId: string, 
  messageData: {
    message: string;
    attachments?: { url: string; type: 'image' | 'file'; fileName?: string }[];
  },
  signal?: AbortSignal
) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}admins/support-tickets/${ticketRefId}/reply`, {
      method: 'POST',
      headers: { 
        ...headers, 
        'Content-Type': 'application/json',
        'X-Idempotency-Key': uuidv4(),
      },
      body: JSON.stringify(messageData),
      signal,
    });

    const data = await response.json();
    return response.ok 
      ? { success: true, data: data } 
      : { success: false, error: data.message || 'Failed to send support message.' };
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return { success: false, error: 'Request cancelled.' };
    }
    console.error("Send Support Message API Error:", error);
    return { success: false, error: 'Network error occurred.' };
  }
};
export const switchToAdminApi = async (userId: string, deviceId?: string, deviceName?: string) => {
  const TIMEOUT_MS = 8000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const idempotencyKey = uuidv4();

  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}users/switch-to-admin`, {
      method: 'POST',
      headers: { 
        ...headers, 
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({ uid: userId, deviceId, deviceName }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const result = await response.json();
    
    if (!response.ok) {
      Toast.show({ 
        type: 'error', 
        text1: 'Switch Error', 
        text2: result?.error || 'Failed to switch to admin dashboard' 
      });
      return { success: false, error: result?.error || 'Failed to switch' };
    }

    return { 
      success: true, 
      data: result?.admin || result?.data, 
      accessToken: result?.accessToken, 
      refreshToken: result?.refreshToken 
    };
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      Toast.show({ type: 'error', text1: 'Timeout Error', text2: 'Switch request timed out.' });
      return { success: false, error: 'Request timed out.' };
    }

    Toast.show({ 
      type: 'error', 
      text1: 'Network Error', 
      text2: error?.message || 'An unexpected error occurred' 
    });
    return { success: false, error: error?.message || 'Network error' };
  }
};