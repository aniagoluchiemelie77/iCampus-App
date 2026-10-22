import 'react-native-get-random-values'; 
import { v4 as uuidv4 } from 'uuid';
import { baseUrl } from '../components/HomeScreenComponents';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CommonActions } from '@react-navigation/native';
import DeviceInfo from 'react-native-device-info';
import { CourseException, Lecture, CreateLecturePayload, CreateTestPayload, PostComment, User} from '../types/firebase';
import ReactNativeBlobUtil from 'react-native-blob-util';
import axios from 'axios';
import { fetchWithAuth, refreshSessionToken } from '../utils/userTokenAuth';
import { clearSession } from '../utils/session';
import {getAdaptiveTimeout} from '../utils/DeviceNetworkStrengthDetector.ts';

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
  /** 'EXCEPTION_PAYMENT_REQUIRED' when the free allowance is used up. */
  code?: string;
  exceptionCredits?: number;
  usedThisMonth?: number;
  freeLimit?: number;
}
interface ApiOptions {
  endpoint: string;
  body?: any;
  signal?: AbortSignal;
  idempotencyKey?: string;
  successToast?: { type: 'success' | 'info'; title: string; message: string };
  errorTitle?: string;
};
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
  /** True when verification could not run (network/server/avatar issue), as opposed to a face mismatch. */
  isError?: boolean;
  faceCount?: number | null;
  lookingAtScreen?: boolean | null;
  suspicious?: string | null;
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
  semester: string;
  session: string;
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

export const fetchInquiryFromBackend = async (
  userType: string,
  signal?: AbortSignal
): Promise<{ inquiryId: string }> => {
  const TIMEOUT_MS = await getAdaptiveTimeout();
  const controller = new AbortController();

  if (signal) {
    signal.addEventListener('abort', () => controller.abort());
  }
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

    const response = await fetchWithAuth(`${cleanBaseUrl}/verifyUser/persona/create-inquiry`, {
      method: 'POST',
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
  const TIMEOUT_MS = await getAdaptiveTimeout();
  const controller = new AbortController();

  if (signal) {
    signal.addEventListener('abort', () => controller.abort());
  }
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const idempotencyKey = uuidv4();

  try {
    const response = await fetchWithAuth(`${baseUrl}users/revoke-session`, {
      method: 'POST',
      headers: {
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
  // AI replies (especially with attachments) regularly take 20–40s; the
  // generic adaptive timeout aborted them.
  const TIMEOUT_MS = Math.max(await getAdaptiveTimeout(), 60000);
  const controller = new AbortController();
  // Only the small descriptive fields: callers pass whole lecture lists or
  // course objects, which pushed the body past the server's 100kb limit and
  // made every request fail.
  const pick = (v: any) =>
    typeof v === 'string' || typeof v === 'number' ? String(v).slice(0, 300) : undefined;
  const safeContext = contextData
    ? Object.fromEntries(
        Object.entries({
          id: pick(contextData.id),
          title: pick(contextData.title),
          name: pick(contextData.name),
          courseCode: pick(contextData.courseCode ?? contextData.course?.courseCode),
          courseTitle: pick(contextData.courseTitle ?? contextData.course?.courseTitle),
          topicName: pick(contextData.topicName),
          attachmentUrl: pick(contextData.attachmentUrl),
        }).filter(([, v]) => v !== undefined),
      )
    : {};
  // The last 12 turns are plenty of context and keep the payload small.
  const recentHistory = Array.isArray(history) ? history.slice(-12) : [];

  if (signal) {
    signal.addEventListener('abort', () => controller.abort());
  }
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

    const response = await fetchWithAuth(`${cleanBaseUrl}/users/ai/chat`, {
      method: 'POST',
      body: JSON.stringify({
        message,
        history: recentHistory.map(msg => ({
          role: msg.role,
          parts: [{ text: String(msg.content || '').slice(0, 4000) }],
        })),
        context: {
          type: contextType,
          data: safeContext,
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    // A non-JSON error page (e.g. 413) used to throw here.
    let data: any = {};
    try {
      data = await response.json();
    } catch {
      data = {};
    }

    if (!response.ok || !data.success) {
      const errorMsg =
        data?.error ||
        (response.status === 413
          ? 'That message is too long. Try a shorter one.'
          : response.status === 429
            ? 'The assistant is busy right now. Try again in a moment.'
            : 'The assistant could not answer. Try again.');
      return { success: false, error: errorMsg };
    }
    
    return { success: true, reply: data.reply, ticketId: data.ticketId };
  } catch (error: any) {
    clearTimeout(timeoutId);

    // The chat screen shows these inline with a retry, so no toast here.
    if (error.name === 'AbortError') {
      return { success: false, error: 'That took too long. Tap retry to try again.' };
    }
    console.error('Ask AI Assistant Error:', error);
    return { success: false, error: "Couldn't reach the assistant. Check your connection." };
  }
};
export const handleLogout = async (navigation: any) => {
  try {
    const currentDeviceId = await DeviceInfo.getUniqueId();
    await fetchWithAuth(`${baseUrl}users/revoke-session`, {
      method: 'POST',
      body: JSON.stringify({  
        deviceIdToRevoke: currentDeviceId 
      }),
    });
  } catch (error) {
    console.error("Logout action failed", error);
  } finally {
    // Session keys only: keep app flags such as hasLaunched.
    await clearSession();
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      })
    );
  }
};
export const verifySignupEmail = async (email: string) => {
  const TIMEOUT_MS = await getAdaptiveTimeout();
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
  const TIMEOUT_MS = await getAdaptiveTimeout();
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
      // Signed proof the server requires when creating a password account.
      emailProof: data.emailProof as string | undefined,
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
  const TIMEOUT_MS = await getAdaptiveTimeout();

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
  const TIMEOUT_MS = await getAdaptiveTimeout();
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
  const TIMEOUT_MS = await getAdaptiveTimeout();
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
  const TIMEOUT_MS = await getAdaptiveTimeout();
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
  const TIMEOUT_MS = await getAdaptiveTimeout();
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
  const TIMEOUT_MS = await getAdaptiveTimeout();
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
  const TIMEOUT_MS = await getAdaptiveTimeout();

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
  const TIMEOUT_MS = await getAdaptiveTimeout();

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
  const TIMEOUT_MS = await getAdaptiveTimeout();
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
      // The server renews the refresh token periodically (sliding session).
      if (data.refreshToken) {
        await AsyncStorage.setItem('refreshToken', data.refreshToken);
      }
      return {
        success: true,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        user: data.user
      };
    } else {
      // 401/403 = the session itself was rejected; anything else is transient.
      return {
        success: false,
        status: response.status,
        rejected: response.status === 401 || response.status === 403,
      };
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
  const TIMEOUT_MS = await getAdaptiveTimeout();
  const controller = new AbortController();

  if (signal) {
    signal.addEventListener('abort', () => controller.abort());
  }
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const idempotencyKey = uuidv4();

  try {
    const response = await fetchWithAuth(`${baseUrl}users/password/verify`, {
      method: 'POST',
      headers: {
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
  const TIMEOUT_MS = await getAdaptiveTimeout();
  const controller = new AbortController();

  if (signal) {
    signal.addEventListener('abort', () => controller.abort());
  }
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const idempotencyKey = uuidv4();

  try {
    const response = await fetchWithAuth(`${baseUrl}users/send-phone-otp`, {
      method: 'POST',
      headers: {
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
  const TIMEOUT_MS = await getAdaptiveTimeout();
  const controller = new AbortController();

  if (signal) {
    signal.addEventListener('abort', () => controller.abort());
  }
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const idempotencyKey = uuidv4();

  try {
    const response = await fetchWithAuth(`${baseUrl}users/verify-phone-otp`, {
      method: 'POST',
      headers: {
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
  input: {
    text?: string;
    type?: 'text' | 'gif' | 'sticker';
    media?: { url: string; previewUrl?: string; width?: number | null; height?: number | null } | null;
    parentId?: string | null;
  },
): Promise<{ success: boolean; comment?: PostComment; commentsCount?: number; message?: string }> => {
  const TIMEOUT_MS = await getAdaptiveTimeout();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const response = await fetchWithAuth(`${cleanBaseUrl}/posts/${postId}/comment`, {
      method: 'POST',
      headers: { 'Idempotency-Key': uuidv4() },
      body: JSON.stringify({
        type: input.type || 'text',
        text: input.text || '',
        media: input.media || null,
        parentId: input.parentId || null,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.success === false) {
      return { success: false, message: data?.message || 'Failed to add comment' };
    }
    return { success: true, comment: data.comment, commentsCount: data.commentsCount };
  } catch (error: any) {
    clearTimeout(timeoutId);
    console.error("addCommentAPI Error:", error);
    return { success: false, message: error.name === 'AbortError' ? 'Request timed out' : 'Connection to server failed' };
  }
};
export const toggleLikeAPI = async (
  postId: string,
): Promise<{ success: boolean; liked?: boolean; likes?: string[]; message?: string }> => {
  const TIMEOUT_MS = await getAdaptiveTimeout();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const response = await fetchWithAuth(`${cleanBaseUrl}/posts/${postId}/like`, {
      method: 'POST',
      headers: { 'Idempotency-Key': uuidv4() },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.success === false) {
      return { success: false, message: data?.message || 'Failed to sync like' };
    }
    return { success: true, liked: data.liked, likes: data.likes, message: data.message };
  } catch (error: any) {
    clearTimeout(timeoutId);
    console.error("toggleLikeAPI Error:", error);
    return { success: false, message: error.name === 'AbortError' ? 'Request timed out' : 'Connection to server failed' };
  }
};
export const createRepostAPI = async (
  originalPostId: string,
): Promise<{
  success: boolean;
  reposted?: boolean;
  repostsCount?: number;
  reposter?: any;
  message?: string;
}> => {
  const TIMEOUT_MS = await getAdaptiveTimeout();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const response = await fetchWithAuth(`${cleanBaseUrl}/posts/repost`, {
      method: 'POST',
      headers: { 'Idempotency-Key': uuidv4() },
      body: JSON.stringify({ originalPostId }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.success === false) {
      return { success: false, message: data?.message || 'Failed to repost' };
    }
    return {
      success: true,
      reposted: data.reposted,
      repostsCount: data.repostsCount,
      reposter: data.reposter,
      message: data.message,
    };
  } catch (error: any) {
    clearTimeout(timeoutId);
    console.error("createRepostAPI Error:", error);
    return { success: false, message: error.name === 'AbortError' ? 'Request timed out' : 'Connection to server failed' };
  }
};
export const toggleCommentLikeAPI = async (
  postId: string,
  commentId: string,
): Promise<{ success: boolean; isLiked?: boolean; likes?: string[]; message?: string }> => {
  const TIMEOUT_MS = await getAdaptiveTimeout();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    // The route is POST; this used to send PATCH and always got a 404.
    const response = await fetchWithAuth(
      `${cleanBaseUrl}/posts/${postId}/comments/${commentId}/like`,
      {
        method: 'POST',
        headers: { 'Idempotency-Key': uuidv4() },
        signal: controller.signal,
      },
    );
    clearTimeout(timeoutId);
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.success === false) {
      return { success: false, message: data?.message || 'Failed to like comment' };
    }
    return { success: true, isLiked: data.isLiked, likes: data.likes };
  } catch (error: any) {
    clearTimeout(timeoutId);
    console.error("toggleCommentLikeAPI Error:", error);
    return { success: false, message: error.name === 'AbortError' ? 'Request timed out' : 'Connection to server failed' };
  }
};
export const bulkAddToCartApi = async (
  items: { productId: string; quantity: number }[],
  maxRetries = 3
) => {
  const idempotencyKey = uuidv4();
  let attempt = 0;
  const TIMEOUT_MS = await getAdaptiveTimeout();

  while (attempt < maxRetries) {
    attempt++;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

      const response = await fetchWithAuth(`${cleanBaseUrl}/store/favorites-to-cart/bulk-add`, {
        method: 'POST',
        headers: {
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
export const completeOrderDelivery = async (orderId: string, maxRetries = 3) => {
  const idempotencyKey = uuidv4();
  let attempt = 0;
  const TIMEOUT_MS = await getAdaptiveTimeout();
  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

  while (attempt < maxRetries) {
    attempt++;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetchWithAuth(`${cleanBaseUrl}/store/orders/complete-delivery`, {
        method: 'POST',
        headers: {
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
  const TIMEOUT_MS = await getAdaptiveTimeout();
  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

  while (attempt < maxRetries) {
    attempt++;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const url = `${cleanBaseUrl}/store/orders/cancel`;
      const response = await fetchWithAuth(url, {
        method: 'POST',
        headers: {
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
/**
 * Withdraws `amount` of the seller's balance. Not retried automatically:
 * the server reserves the balance before sending money, and the idempotency
 * key makes an accidental double request return the first result.
 */
export const requestPayoutAPI = async (amount: number) => {
  const result = await postJson<{
    transactionId: string;
    status: 'pending';
    newPendingSalesBalance: number;
    message?: string;
  }>('/store/payouts/request-payout', { amount }, true);
  return result;
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
  const TIMEOUT_MS = await getAdaptiveTimeout();
  const controller = new AbortController();

  if (signal) {
    signal.addEventListener('abort', () => controller.abort());
  }
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const idempotencyKey = uuidv4();
  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

  try {
    const response = await fetchWithAuth(`${cleanBaseUrl}/users/reviews/create`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
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
  const TIMEOUT_MS = await getAdaptiveTimeout();
  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const endpoint = isEditMode 
    ? `${cleanBaseUrl}/posts/${postId}/update` 
    : `${cleanBaseUrl}/posts/create`;
  const method = isEditMode ? 'PUT' : 'POST';

  try {
    if (isEditMode && !postId) {
      Toast.show({ type: 'error', text2: 'Missing crucial parameter for update operation' });
      return {
        success: false,
        message: 'Missing crucial parameter for update operation',
      };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetchWithAuth(endpoint, {
      method,
      headers: {
        'Idempotency-Key': uuidv4(),
      },
      body: JSON.stringify(postData),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const result = await response.json();

    if (!response.ok || !result.success) {
      const errMsg = result.message || (isEditMode ? 'Failed to edit post' : 'Failed to create post');
      Toast.show({ type: 'error', text2: errMsg });
      return { success: false, message: errMsg };
    }

    const successMsg = result.message || (isEditMode ? 'Post edit successful' : 'Post creation successful');
    Toast.show({ type: 'success', text2: successMsg });
    return {
      success: true,
      message: successMsg,
      data: result.data
    };

  } catch (error: any) {
    const serverMessage = error.name === 'AbortError' 
      ? 'Request timed out. Please try again.' 
      : error.message || 'Network transaction failed';
      
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
export const toggleFollowUser = async (
  targetFollowingId: string,
  signal?: AbortSignal
): Promise<{ success: boolean; action?: 'followed' | 'unfollowed'; message?: string }> => {
  const TIMEOUT_MS = await getAdaptiveTimeout();
  const controller = new AbortController();

  if (signal) {
    signal.addEventListener('abort', () => controller.abort());
  }
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const idempotencyKey = uuidv4();
  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

  try {
    const response = await fetchWithAuth(`${cleanBaseUrl}/users/follow/toggle`, {
      method: 'POST',
      headers: {
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
  const TIMEOUT_MS = await getAdaptiveTimeout();
  const controller = new AbortController();

  if (signal) {
    signal.addEventListener('abort', () => controller.abort());
  }
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const idempotencyKey = uuidv4();
  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

  try {
    const response = await fetchWithAuth(`${cleanBaseUrl}/users/block/toggle`, {
      method: 'POST',
      headers: {
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
      return { success: false };
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
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const response = await fetchWithAuth(`${cleanBaseUrl}/users/student/class/exceptions/submit`, {
      method: 'POST',
      headers: {
        'X-Idempotency-Key': uuidv4(),
      },
      body: JSON.stringify(newException),
      signal,
    });

    const result = await response.json();
    if (!response.ok) {
      return {
        success: false,
        code: result.code,
        exceptionCredits: result.exceptionCredits,
        message: result.message || 'Failed to submit exception report',
      };
    }
    return {
      success: true,
      exception: result.exception,
      exceptionCredits: result.exceptionCredits,
      usedThisMonth: result.usedThisMonth,
      freeLimit: result.freeLimit,
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
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const response = await fetchWithAuth(
      `${cleanBaseUrl}/users/lecturers/class/courses/${courseId}/lectures/createSchedule`,
      {
        method: 'POST',
        headers: {
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
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const response = await fetchWithAuth(
      `${cleanBaseUrl}/users/lecturers/class/courses/${courseId}/assessments`,
      {
        method: 'POST',
        headers: {
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
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const response = await fetchWithAuth(`${cleanBaseUrl}/users/lecturers/class/lectures/${lectureId}/report`, {
      method: 'POST',
      headers: {
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
    
    // Note: PDF downloading token authorization is handled securely via download config or fetchWithAuth if needed.
    const token = await AsyncStorage.getItem('accessToken');
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
    }).fetch('GET', result.pdfUrl, {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    });

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
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const response = await fetchWithAuth(`${cleanBaseUrl}/users/student/class/attendance/verify-student`, {
      method: 'POST',
      headers: {
        'X-Idempotency-Key': uuidv4(),
      },
      body: JSON.stringify({
        selfieBase64: base64Image,
        targetImageUrl: schoolAvatarUrl,
      }),
      signal,
    });

    let result: any = {};
    try {
      result = await response.json();
    } catch {
      result = {};
    }
    // Only a 403 is a genuine face mismatch; every other failure is a service error.
    if (!response.ok && response.status !== 403) {
      return {
        verified: false,
        isError: true,
        message: result.message || `Verification request failed (${response.status}).`,
      };
    }
    return {
      verified: response.ok && result.verified === true,
      message: result.message,
      similarity: result.similarity,
      // Attention signals (used by test proctoring snapshots).
      faceCount: typeof result.faceCount === 'number' ? result.faceCount : null,
      lookingAtScreen: typeof result.lookingAtScreen === 'boolean' ? result.lookingAtScreen : null,
      suspicious: result.suspicious || null,
    };
  } catch (error: any) {
    if (error.name === 'AbortError') return { verified: false, isError: true, message: 'Request cancelled.' };
    console.error("API Utility Network Exception:", error);
    return {
      verified: false,
      isError: true,
      message: "Network communication timeout. Is your internet active?",
    };
  }
};
export const saveCourseMaterial = async (
  courseId: string,
  payload: any,
  signal?: AbortSignal
): Promise<{ success: boolean; message?: string; error?: string }> => {
  try {
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const response = await fetchWithAuth(
      `${cleanBaseUrl}/users/lecturers/class/courses/uploadMaterial/${courseId}`,
      {
        method: 'POST',
        headers: {
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
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const response = await fetchWithAuth(`${cleanBaseUrl}/users/lecturers/class/courses/addCourseContent/${courseId}`, {
      method: 'POST',
      headers: {
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
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const accessToken = await AsyncStorage.getItem('accessToken');
    const response = await fetchWithAuth(`${cleanBaseUrl}/users/lecturers/class/courses/${courseId}/assignments`, {
      method: 'POST',
      headers: {
        'Content-Type': undefined as any,
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
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const response = await fetchWithAuth(`${cleanBaseUrl}/users/student/class/test/submit`, {
      method: 'POST',
      headers: {
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
export const submitOnlineClassAttendanceAPI = async (
  payload: any,
  signal?: AbortSignal
) => {
  try {
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const response = await fetchWithAuth(`${cleanBaseUrl}/users/student/class/submit-attendance`, {
      method: 'POST',
      headers: {
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
export const extractCourseFormAPI = async (
  fileParam: UploadFilePayload,
  onProgress: (percent: number) => void,
  signal?: AbortSignal
) => {
  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const url = `${cleanBaseUrl}/users/course/extract-course-details-from-uploads`;
  // One key per upload, reused on the post-refresh retry.
  const idempotencyKey = uuidv4();

  // Plain XHR: axios 1.x mangles React Native FormData (no multipart
  // boundary / "Network Error" on Android), and XHR reports upload progress.
  const send = (token: string | null) =>
    new Promise<{ status: number; data: any }>((resolve, reject) => {
      const formData = new FormData();
      formData.append('file', {
        uri: fileParam.uri,
        type: fileParam.type,
        name: fileParam.name,
      } as any);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', url);
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.setRequestHeader('X-Idempotency-Key', idempotencyKey);
      xhr.setRequestHeader('Accept', 'application/json');
      // Reading the form with AI can take a while on a cold server.
      xhr.timeout = 150000;

      xhr.upload.onprogress = event => {
        if (event.lengthComputable && event.total > 0) {
          onProgress(Math.min(1, event.loaded / event.total));
        }
      };
      xhr.upload.onload = () => onProgress(1);
      xhr.onload = () => {
        let data: any = {};
        try {
          data = xhr.responseText ? JSON.parse(xhr.responseText) : {};
        } catch {
          data = { message: 'The server sent an unexpected response.' };
        }
        resolve({ status: xhr.status, data });
      };
      xhr.onerror = () =>
        reject(new Error('Upload failed. Check your connection and try again.'));
      xhr.ontimeout = () =>
        reject(new Error('Reading your form took too long. Please try again.'));

      if (signal) {
        if (signal.aborted) {
          reject(new Error('Upload cancelled.'));
          return;
        }
        signal.addEventListener('abort', () => {
          xhr.abort();
          reject(new Error('Upload cancelled.'));
        });
      }
      xhr.send(formData);
    });

  let response = await send(await AsyncStorage.getItem('accessToken'));
  if (response.status === 401) {
    // Expired access token: refresh once and resend.
    const freshToken = await refreshSessionToken();
    response = await send(freshToken);
  }

  if (response.status < 200 || response.status >= 300) {
    const message =
      response.data?.message ||
      response.data?.error ||
      (response.status === 413
        ? 'File is too large. Upload a file under 15MB.'
        : response.status === 415
          ? 'Upload your course form as a PDF or a photo.'
          : 'We could not read your course form. Please try again.');
    // Same shape as an axios error so callers can read err.response.data.
    const error: any = new Error(message);
    error.response = response;
    throw error;
  }
  return response;
};
export const createManualCourseAPI = async (
  courseData: ManualCoursePayload,
  signal?: AbortSignal
): Promise<ManualCourseResponse> => {
  try {
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const response = await fetchWithAuth(`${cleanBaseUrl}/users/courses/manual-create`, {
      method: 'POST',
      headers: {
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
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const response = await fetchWithAuth(`${cleanBaseUrl}/admins/create`, {
      method: 'POST',
      headers: { 
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
  const TIMEOUT_MS = await getAdaptiveTimeout();

  while (attempt < maxRetries) {
    attempt++;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

      const response = await fetchWithAuth(`${cleanBaseUrl}/support/tickets/create-ticket`, {
        method: 'POST',
        headers: { 
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
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const url = `${cleanBaseUrl}/admins/support/send-notification`;
    
    const response = await fetchWithAuth(url, {
      method: 'POST',
      headers: {
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
  const TIMEOUT_MS = await getAdaptiveTimeout();

  while (attempt < maxRetries) {
    attempt++;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

      const response = await fetchWithAuth(`${cleanBaseUrl}/users/online-classes/create`, {
        method: 'POST',
        headers: {
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
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const response = await fetchWithAuth(`${cleanBaseUrl}/admins/institutions/create`, {
      method: 'POST',
      headers: { 
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
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const response = await fetchWithAuth(`${cleanBaseUrl}/admins/stations/create`, {
      method: 'POST',
      headers: { 
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
  const TIMEOUT_MS = await getAdaptiveTimeout();

  while (attempt < maxRetries) {
    attempt++;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

      const response = await fetchWithAuth(`${cleanBaseUrl}/users/stations/register`, {
        method: 'POST',
        headers: {
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
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const response = await fetchWithAuth(`${cleanBaseUrl}/admins/ads/create`, {
      method: 'POST',
      headers: { 
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
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const response = await fetchWithAuth(`${cleanBaseUrl}/admins/support-tickets/${ticketRefId}/reply`, {
      method: 'POST',
      headers: { 
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
  const TIMEOUT_MS = await getAdaptiveTimeout();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const idempotencyKey = uuidv4();

  try {
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const response = await fetchWithAuth(`${cleanBaseUrl}/users/switch-to-admin`, {
      method: 'POST',
      headers: { 
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
export const saveTokenToDatabase = async (
  uid: string,
  fcmToken: string,
  signal?: AbortSignal
): Promise<{ success: boolean; message?: string }> => {
  const TIMEOUT_MS = await getAdaptiveTimeout();
  const controller = new AbortController();

  if (signal) {
    signal.addEventListener('abort', () => controller.abort());
  }
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const idempotencyKey = uuidv4();

  try {
    const response = await fetchWithAuth(`${baseUrl}users/fcm-token`, {
      method: 'POST',
      headers: {
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({ uid, fcmToken }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const data = await response.json();

    if (!response.ok || !data.success) {
      const errorMessage = data?.error || data?.message || 'Failed to save notification token';
      console.error("Failed to save FCM token:", errorMessage);
      return { success: false, message: errorMessage };
    }

    return { success: true, message: data.message };
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      console.warn("FCM token save timed out.");
      return { success: false, message: 'Request timed out.' };
    }

    console.error("Backend Error:", error);
    return { success: false, message: error?.message };
  }
};

export type PaymentPurpose = 'checkout' | 'subscription' | 'exception';

export interface PaymentIntent {
  txRef: string;
  amount: number;
  currency: string;
  title: string;
  customer: { email: string; name: string };
  subtotal?: number;
  delivery?: number;
}

type ApiResult<T> =
  | ({ success: true } & T)
  | { success: false; message: string; code?: string; status?: number };

const postJson = async <T,>(path: string, body: any, idempotent = false): Promise<ApiResult<T>> => {
  try {
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const response = await fetchWithAuth(`${cleanBaseUrl}${path}`, {
      method: 'POST',
      headers: idempotent ? { 'X-Idempotency-Key': uuidv4() } : {},
      body: JSON.stringify(body),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result?.success === false) {
      return {
        success: false,
        status: response.status,
        code: result?.code,
        message: result?.message || 'Something went wrong. Please try again.',
      };
    }
    return { success: true, ...result };
  } catch (error: any) {
    return { success: false, message: error?.message || 'Check your internet connection.' };
  }
};

/**
 * Asks the server to price a purchase. The amount and currency in the reply
 * are what Flutterwave must charge; never compute them in the app.
 */
export const createPaymentIntentAPI = (
  body:
    | { purpose: 'subscription'; tier: string }
    | { purpose: 'exception' }
    | { purpose: 'checkout'; items: any[]; shippingContact?: { phone?: string; address?: string } },
) => postJson<PaymentIntent>('/users/payments/intent', body);

/**
 * Tells the server a Flutterwave payment finished. The server verifies it
 * with Flutterwave; calling it twice is safe.
 */
export const confirmPaymentAPI = (txRef: string, transactionId: string) =>
  postJson<{
    purpose: PaymentPurpose;
    amount: number;
    currency: string;
    orders?: any[];
    tier?: string;
    subscriptionExpiresAt?: string;
    exceptionCredits?: number;
    transactionId?: string;
  }>('/users/payments/confirm', { txRef, transactionId });

export const savePayoutAccountAPI = (body: {
  bankCode: string;
  accountNumber: string;
  bankName?: string;
}) =>
  postJson<{ payoutAccount: NonNullable<User['payoutAccount']> }>(
    '/users/payments/payout-account',
    body,
    true,
  );
