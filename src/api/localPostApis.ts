import { baseUrl } from '@components/HomeScreenComponents';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CommonActions } from '@react-navigation/native';
import DeviceInfo from 'react-native-device-info';
import {CartItem, CourseException, Lecture, CreateLecturePayload, CreateTestPayload} from '../types/firebase';
import ReactNativeBlobUtil from 'react-native-blob-util';
import axios from 'axios';
import {
  Platform
} from 'react-native';
import {getAuthHeaders} from '../utils/userTokenAuth';

const token = await AsyncStorage.getItem('accessToken');

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

export const fetchInquiryFromBackend = async (userType: string): Promise<{ inquiryId: string }> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}verifyUser/persona/create-inquiry`, {
      method: 'POST',
      headers,
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
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}users/revoke-session`, {
      method: 'POST',
      headers,
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
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}users/payments/initiate-charge`, {
      method: 'POST',
      headers,
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
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}user/transactions/initialize-buy`, {
      method: 'POST',
      headers: {
        ...headers,
        'X-Idempotency-Key': Date.now().toString(), 
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
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}user/transactions/initialize-withdraw`, {
      method: 'POST',
      headers: {
        ...headers,
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
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}user/subscriptionPayments/verify`, {
      method: 'POST',
      headers,
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
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}users/block/toggle`, {
      method: 'POST',
      headers,
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
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}users/messages/mark-all-read/${userId}`, {
      method: 'POST',
      headers
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
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}user/verify-icash-pin`, {
      method: 'POST',
      headers,
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
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}user/setup-icash-pin`, {
      method: 'POST',
      headers,
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
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}user/request-pin-reset`, {
      method: 'POST',
      headers
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
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}user/reset-icash-pin`, {
      method: 'POST',
      headers,
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
    message: string;
    history: { role: 'user' | 'model'; content: string }[];
    contextType: string;
    contextData: any;
    userState: any; 
  }
): Promise<{ success: boolean; reply?: string; error?: string }> => {
  const { message, history, contextType, contextData } = params;

  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}users/ai/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        message,
        history: history.map(msg => ({
          role: msg.role,
          parts: [{ text: msg.content }]
        })),
        context: {
          type: contextType,
          data: contextData, 
        },
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      Toast.show({ type: 'error', text2: data.error || 'Failed to fetch academic response' });
      return { success: false, error: data.error };
    }
    
    return { success: true, reply: data.reply };
  } catch (error: any) {
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
  try {
    const response = await fetch(`${baseUrl}users/verifyEmail`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await response.json();
    if (!data.ok) {
      return { success: false, message: data.message };
    }
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
    if (!data.ok) {
      return { success: false, message: data.message };
    }
    return { 
      verified: data.verified, 
      message: data?.message || 'Invalid or expired code',
      email: data.email
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
    if (!data.ok) {
      return { success: false, message: data.message };
    }
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
export const verifySignupStudent = async (
  schoolId: string, 
  matric: string, 
  signal?: AbortSignal
) => {
  try {
    const response = await fetch(`${baseUrl}verifyStudent/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        school_id: schoolId, 
        matriculation_number: matric,
      }),
      signal, 
    });

    const data = await response.json();
    if (!response.ok) {
      return { success: false, message: data.message || 'Student not found' };
    }
    return {
      success: true,
      verified: data.isVerified,
      data, 
      message: 'Student verified',
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
    if (!data.ok) {
      return { success: false, message: data.message };
    }
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
    if (!data.ok) {
      return { success: false, message: data.message };
    }

    return {
      success: response.ok,
      schoolName: data.schoolName,
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
export const changePassword = async (
  email: string, 
  password: string, 
  confirmPassword: string, 
) => {
  try {
    const response = await fetch(`${baseUrl}users/changePassword`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, confirmPassword, email })
    });

    const data = await response.json();
    if (!data.ok) {
      return { success: false, message: data.message };
    }
    return {
      success: response.ok,
      message: response.ok 
        ? 'Password updated successfully' 
        : (data?.message || 'Failed to update password'),
    };
  } catch (error: any) {
    if (error.name === 'AbortError') return { success: false, aborted: true };
    return { 
      success: false, 
      message: 'Network error during password update.' 
    };
  }
};
export const handleForgotPassword = async (email: string) => {
  try {
    const response = await fetch(`${baseUrl}users/forgotPassword`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await response.json();
    if (!data.ok) {
      return { success: false, message: data.message };
    }
    return { 
      success: response.ok, 
      status: response.status,
      message: data?.message || 'Email verification failed', 
      email: data.email
    };
  } catch (error) {
    return { success: false, message: 'Network error occurred.' };
  }
};
export const loginUser = async (credentials: any) => {
  try {
    const response = await fetch(`${baseUrl}users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        credentials: credentials
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      Toast.show({ type: 'error', text1: 'Login Failed', text2: data.message });
      return { success: false, message: data.message, status: response.status };
    }
    return {
      success: response.ok,
      accessToken: data.accessToken, 
      refreshToken: data.refreshToken,
      user: data.user,
      message: data.error || data.message || 'Login failed',
      status: response.status,
    };
  } catch (error) {
    return {
      success: false,
      message: 'Network error. Please check your connection.',
    };
  }
};
export const loginAdmin = async (credentials: any) => {
  try {
    const response = await fetch(`${baseUrl}users/admin-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        credentials: credentials
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      Toast.show({ type: 'error', text1: 'Login Failed', text2: data.message });
      return { success: false, message: data.message, status: response.status };
    }
    return {
      success: response.ok,
      accessToken: data.accessToken, 
      refreshToken: data.refreshToken,
      user: data.user,
      message: data.error || data.message || 'Login failed',
      status: response.status,
    };
  } catch (error) {
    return {
      success: false,
      message: 'Network error. Please check your connection.',
    };
  }
};
export const verifyCurrentPassword = async (password: string) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}users/password/verify`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ password }),
    });
    const result = await response.json();
    if (!result.ok) {
      return { success: false, message: result.message };
    }
    return { success: response.ok, message: result.message };
  } catch (error) {
    return { success: false, message: "Network error. Try again." };
  }
};
export const handleSendWhatsAppCode = async (formattedNumber: string) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}users/send-phone-otp`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ 
        phoneNumber: formattedNumber, 
        channel: 'whatsapp' 
      }),
    });
    const data = await response.json();

    if (response.ok) {
      return{
        success: response.ok,
        message: 'OTP sent to your WhatsApp!',
        data,
      };
    } else {
      return{
        success: false,
        message: 'Whatsapp verification failed, please retry.'
      };
    }
  } catch (error) {
    Toast.show({ type: 'error', text2: 'Check your internet connection' });
    return{
      success: false,
      message: 'Check your internet connection.'
    };
  } 
};
export const verifyPhoneOTPAPI = async (phoneNumber: string, code: string) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}users/verify-phone-otp`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ 
        phoneNumber, 
        codeInput: code 
      }),
    });
    const data = await response.json();
    return {
      success: response.ok,
      message: data.message,
      phoneNumbers: data.phoneNumbers
    };
  } catch (error) {
    return { success: false, message: 'Connection to server failed' };
  }
};
export const addCommentAPI = async (
  postId: string,
  text: string,
  parentId: string | null = null
) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}posts/${postId}/comment`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ 
        comment: text,
        parentId: parentId || "",
      }),
    });
    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: data?.message || 'Failed to add comment',
      };
    }
    return {
      success: response.ok,
      data: data, 
      message: 'Comment added'
    };
  } catch (error) {
    console.error("addCommentAPI Error:", error);
    return { success: false, message: 'Connection to server failed' };
  }
};
export const toggleLikeAPI = async (postId: string) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}posts/${postId}/like`, {
      method: 'POST',
      headers,
    });
    const data = await response.json();
    if (!response.ok) {
      return {
        success: false,
        message: data?.message || 'Failed to sync like',
      };
    }
    return {
      success: response.ok,
      message: data.message
    };
  } catch (error) {
    console.error("toggleLikeAPI Error:", error);
    return { success: false, message: 'Connection to server failed' };
  }
};
export const createRepostAPI = async (
  originalPostId: string,
) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}posts/repost`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        originalPostId,
        isRepost: true,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      return {
        success: false,
        message: data?.message || 'Failed to repost',
      };
    }

    return {
      success: response.ok,
      data: response.ok ? data : null,
      message: response.ok ? 'Reposted successfully!' : (data.message || 'Failed to repost'),
    };
  } catch (error) {
    console.error("createRepostAPI Error:", error);
    return { success: false, message: 'Connection to server failed' };
  }
};
export const toggleCommentLikeAPI = async (
  postId: string, 
  commentId: string
) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}posts/${postId}/comments/${commentId}/like`, {
      method: 'PATCH',
      headers
    });
    const data = await response.json();
    if (!response.ok) {
      return {
        success: false,
        message: data?.message || 'Failed to like post',
      };
    }
    return {
      success: response.ok,
      message: data.message
    };
  } catch (error) {
    console.error("toggleCommentLikeAPI Error:", error);
    return { success: false, message: 'Connection to server failed' };
  }
};
export const bulkAddtoCartAPI = async (items: CartItem[]) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}store/favorites-to-cart/bulk-add`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ items }),
    });
    const data = await response.json();
    if (!response.ok) {
      return {
        success: false,
        message: data?.message || 'Failed to move favorites to cart',
      };
    }
    Toast.show({ type: 'success', text2: data.message });
    return { success: response.ok && data.status };
  } catch (e: any) { 
    Toast.show({ type: 'error', text1: 'Network Error', text2: e.message });
    return { success: false }; 
  }
};
export const initializeCheckoutTransaction = async (payload: any) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}store/initialize-checkout`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
      return {
        success: false,
        message: data?.message || 'Failed to initialize checkout',
      };
    }
    return { success: true, data };
  } catch (error: any) {
    if (typeof handleTransactionError === 'function') {
      handleTransactionError(error, 'Purchase Error');
    }
    return { success: false, message: error.message || 'An unknown error occurred' };
  }
};
export const completeOrderDelivery = async (orderId: string) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}store/orders/complete-delivery`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ 
        orderId, 
      }),
    });
    const data = await response.json();
    if (!response.ok || data.success === false) {
      return { 
        success: false, 
        message: data?.message || 'Verification failed. Please try again.' 
      };
    }
    return { 
      success: true, 
      message: data.message || 'Transaction completed successfully!',
      orderId: data.orderId,
      settlementAmount: data.settlementAmount,
      role: data.role,
      productName: data.productName
    };
  } catch (error) {
    console.error("API Error [completeOrderDelivery]:", error);
    return { 
      success: false, 
      message: 'Network error occurred. Check your internet connection.' 
    };
  }
};
export const cancelOrderAPI = async (orderId: string, reason: string) => {
  try {
    const url = `${baseUrl}store/orders/cancel`; 
    const headers = await getAuthHeaders();
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ orderId, reason }),
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: result.message || 'Failed to cancel order',
      };
    }

    return {
      success: true,
      message: result.message,
    };
  } catch (error) {
    console.error("cancelOrderAPI Error:", error);
    return { 
      success: false, 
      message: 'Network error. Please check your connection.' 
    };
  }
};
export const generateCertificateAPI = async (productId: string) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}users/downloads/generate-certificate`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ productId }),
    });
    const data = await response.json();
    return {
      success: response.ok,
      data: data,
      message: data.message || 'Failed to generate certificate',
    };
  } catch (error) {
    return { success: false, message: 'Server connection failed' };
  }
};
export const requestPayoutAPI = async (amount: number) => {
  try {
    const url = `${baseUrl}store/payouts/request-payout`;
    const headers = await getAuthHeaders();
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ amount }),
    });
    const result = await response.json();
    if (!response.ok) {
      return {
        success: false,
        message: result.message || 'Failed to proceed with payout',
      };
    }
    return {
      success: response.ok,
      newPointsBalance: result.newPointsBalance,
      transactionId: result.transactionId,
      message: result.message,
    };
  } catch (error) {
    return { success: false, message: 'Network error during payout' };
  }
};
export const uploadLessonVideoAPI = async (fileUri: string, fileName: string, fileType: string) => {
  try {
    const url = `${baseUrl}users/lecturers/class/upload-video`;
    const formData = new FormData();
    const cleanUri = Platform.OS === 'ios' ? fileUri.replace('file://', '') : fileUri;
    formData.append('video', {
      uri: cleanUri,
      name: fileName,
      type: fileType,
    } as any);

    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: result.message || 'Failed to complete video verification process.',
        data: null,
      };
    }

    return {
      success: true,
      message: result.message,
      data: result.data, // Structure containing permanentUrl and verification status
    };
  } catch (error) {
    console.error('Multipart upload network connection failure:', error);
    return { 
      success: false, 
      message: 'Network connection failure while transmitting media file.', 
      data: null 
    };
  }
};
export const saveProductApiCall = async (
  payload: any, 
  productId?: string, 
  onProgress?: (percentage: number) => void
) => {
  const isEditing = !!productId;

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

  if (payload.productType === 'course') {
    multipartFields.push(
      { name: 'additionalLecturersRaw', data: String(payload.courseDetails?.additionalLecturersRaw || '') }
    );
    if (payload.lessons) {
      multipartFields.push({ name: 'lessons', data: JSON.stringify(payload.lessons) });
    }
  }
  if (payload.productType === 'file' && payload.fileDetails?.rawBlobOrFile?.uri) {
    const rawUri = payload.fileDetails.rawBlobOrFile.uri;
    const cleanUri = rawUri.replace('file://', ''); 
    multipartFields.push({
      name: 'digitalAsset',
      filename: payload.fileDetails.rawBlobOrFile.name || 'upload.mp4',
      type: payload.fileDetails.rawBlobOrFile.type || 'video/mp4',
      data: ReactNativeBlobUtil.wrap(cleanUri),
    });
  }
  if (payload.mediaUrls) {
    const thumbnailData = Array.isArray(payload.mediaUrls)
      ? JSON.stringify(payload.mediaUrls)
      : String(payload.mediaUrls);
      
    multipartFields.push({ name: 'mediaUrls', data: thumbnailData });
  }
  const method = isEditing ? 'PUT' : 'POST'; 
  const endpoint = isEditing 
    ? `${baseUrl}store/products/edit/${productId}` 
    : `${baseUrl}store/products/create`;

  const response = await ReactNativeBlobUtil.config({
    fileCache: true,
  })
  .fetch(
    method,
    endpoint,
    {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'multipart/form-data',
    },
    multipartFields
  )
  .uploadProgress({ interval: 250 }, (written, total) => {
    if (onProgress && total > 0) {
      onProgress(Math.round((written / total) * 100));
    }
  });

  return response.json();
};
export const submitReviewApi = async (reviewPayload: any, authToken: string) => {
  try {
    const formData = new FormData();
    formData.append('targetId', reviewPayload.targetId);
    formData.append('targetType', reviewPayload.targetType);
    formData.append('orderId', reviewPayload.orderId);
    formData.append('rating', String(reviewPayload.rating));
    formData.append('comment', reviewPayload.comment);
  
    formData.append('attributes', JSON.stringify(reviewPayload.attributes));
    formData.append('mediaUrls', JSON.stringify(reviewPayload.mediaUrls));
    const response = await fetch(`${baseUrl}users/reviews/create`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${authToken}`,
      },
      body: formData,
    });
    const result = await response.json();
    if (!response.ok) {
      return {
        success: false,
        message: result.message || 'Failed to submit review.',
      };
    }
    return {
      success: response.ok,
      message: 'Review submitted successfully.',
    };
  } catch (error) {
    console.error('Error invoking submitReviewApi:', error);
    throw error;
  }
};
export const submitOrUpdatePostService = async (
  postData: any,
  isEditMode: boolean,
  postId?: string
): Promise<ServiceResponse> => { 
  const headers = await getAuthHeaders();
  const config = {
    headers,
  };

  try {
    if (isEditMode) {
      if (!postId) {
        return {
          success: false,
          message: 'Missing crucial parameter for update operation',
        };
      }
      const response = await axios.put(`${baseUrl}posts/${postId}/update`, postData, config);
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
      
      return {
        success: true,
        message: result.message || 'Post edit successful',
        data: result.data
      };

    } else {
      const response = await axios.post(`${baseUrl}posts/create`, postData, config);
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
      
      return {
        success: true,
        message: result.message || 'Post creation successful',
        data: result.data
      };
    }
  } catch (error: any) {
    const serverMessage = error.response?.data?.message || 'Network transaction failed';
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
): Promise<{ success: boolean; message?: string }> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}user/transactions/p2p-transfer`, {
      method: 'POST',
      headers,
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
    return { success: true };
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
  targetFollowingId: string
): Promise<{ success: boolean; action?: 'followed' | 'unfollowed'; message?: string }> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}users/follow/toggle`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ followingId: targetFollowingId }),
    });

    const result = await response.json();
    return response.ok ? result : { success: false };
  } catch (error) {
    console.error('Toggle Follow Utility Error:', error);
    return { success: false };
  }
};
export const toggleBlockUserFromProfile = async (
  targetUserId: string
): Promise<{ success: boolean; action?: 'blocked' | 'unblocked' }> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}users/block/toggle`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ targetUserId }),
    });

    const result = await response.json();
    return response.ok ? { success: true, action: result.action } : { success: false };
  } catch (error) {
    console.error('Toggle Block Utility Error:', error);
    return { success: false };
  }
};
export const submitLectureException = async (
  newException: Partial<CourseException>,
): Promise<SubmitExceptionResponse> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}users/student/class/exceptions/submit`, {
      method: 'POST',
      headers,
      body: JSON.stringify(newException),
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

  } catch (error) {
    console.error('Submit Student Exception Utility Error:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'An unknown network error occurred.' 
    };
  }
};
export const createLectureSchedule = async (
  courseId: string,
  lectureData: CreateLecturePayload
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
        headers,
        body: JSON.stringify(finalPayload),
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
  } catch (error) {
    console.error("Schedule Lecture Utility Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown network error',
    };
  }
};
export const saveCourseAssessment = async (
  courseId: string,
  testData: CreateTestPayload
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
        headers,
        body: JSON.stringify(finalPayload),
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
  } catch (error) {
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
  exceptions: any[]
): Promise<DownloadReportResponse> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}users/lecturers/class/lectures/${lectureId}/report`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ exceptions }),
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
  } catch (error) {
    console.error('Download Attendance Report Utility Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown network connection failure.',
    };
  }
};
export const verifyFacialIdentity = async (
  base64Image: string,
  schoolAvatarUrl: string
): Promise<VerifyFaceResponse> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}users/student/class/attendance/verify-student`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        selfieBase64: base64Image,
        targetImageUrl: schoolAvatarUrl,
      }),
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
  } catch (error) {
    console.error("API Utility Network Exception:", error);
    return {
      verified: false,
      message: "Network communication timeout. Is your internet active?",
    };
  }
};
export const saveCourseMaterial = async (
  courseId: string,
  payload: UploadMaterialPayload
): Promise<{ success: boolean; message?: string; error?: string }> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${baseUrl}users/lecturers/class/courses/uploadMaterial/${courseId}`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
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
  } catch (error) {
    console.error("Save Material Utility Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown network error occurred',
    };
  }
};
export const createCourseContent = async (
  courseId: string,
  topic: string
): Promise<{ success: boolean; data?: any; error?: string }> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}users/lecturers/class/courses/addCourseContent/${courseId}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ topic }),
    });
    const result = await response.json();
    if (!response.ok) return { success: false, error: result.message || 'Failed to add topic.' };
    return { success: true, data: result.updatedContents };
  } catch (error: any) {
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
  payload: any
): Promise<SubmitTestResponse> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}users/student/class/test/submit`, {
      method: 'POST',
      ...headers,
      body: JSON.stringify(payload),
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
  } catch (error) {
    console.error("API Utility Network Exception (submitStudentTest):", error);
    return {
      success: false,
      message: "Network communication timeout. Is your internet active?",
    };
  }
};
export const verifyPaymentOtpAPI = async (payload: {
  otpCode: string;
  flw_ref: string;
  type: string;
}) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}user/payments/verify-otp`, {
      method: 'POST',
      headers,
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
  } catch (error) {
    console.error("verifyPaymentOtpAPI Error:", error);
    return { success: false, message: 'Server connection failed' };
  }
};
export const submitOnlineClassAttendanceAPI = async (payload: any) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}users/student/class/submit-attendance`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        ...payload,
        timestamp: new Date().toISOString(), 
      }),
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
    console.error("submitAttendanceAPI Error:", error);
    return {
      success: false,
      message: error.message || 'Server connection failed. Please try again.',
    };
  }
};
export const exportTransactionsAPI = async (payload: { userId: string; startDate: Date; endDate: Date }) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}user/transactions/export`, {
      method: 'POST',
      headers,
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
  onProgress: (percent: number) => void
) => {
  const headers = await getAuthHeaders();
  const formData = new FormData();
  formData.append('file', {
    uri: fileParam.uri,
    type: fileParam.type,
    name: fileParam.name,
  });
  return await axios.post(
    `${baseUrl}users/student/class/course/extract-course-details-from-uploads`,
    formData,
    {
      headers,
      onUploadProgress: (progressEvent) => {
        const percentCompleted = progressEvent.loaded / (progressEvent.total || 1);
        onProgress(percentCompleted);
      },
    }
  );
};
export const createManualCourseAPI = async (
  courseData: ManualCoursePayload
): Promise<ManualCourseResponse> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}users/courses/manual-create`, {
      method: 'POST',
      headers,
      body: JSON.stringify(courseData),
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
  } catch (error) {
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
      headers: { ...headers, 'Content-Type': 'application/json' },
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
export const createSupportTicketApi = async (ticketData: { 
  message: string; 
  category: string; 
  summary: string 
}) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}support/tickets/create-ticket`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(ticketData),
    });
    const result = await response.json();

    if (!response.ok) {
      Toast.show({ 
        type: 'error', 
        text1: 'Submission Failed', 
        text2: result.error || 'Unable to contact support' 
      });
      return null;
    }
    Toast.show({ 
      type: 'success', 
      text1: 'Support Contacted', 
      text2: 'Expect a reply within 24 hours.' 
    });
    return result;
  } catch (error: any) {
    Toast.show({ 
      type: 'error', 
      text1: 'Connection Error', 
      text2: error.message 
    });
    return null;
  }
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
  meetingData: { topicName: string; date: string; startTime: string; endTime: string }
) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}users/online-classes/create`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...meetingData,
        lectureType: 'Online',
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return { success: false, error: data.message || 'Failed to create meeting.' };
    }
    return { success: true, meeting: data.meeting };
  } catch (error) {
    console.error("Public Meeting API Error:", error);
    return { success: false, error: 'Network error occurred.' };
  }
};