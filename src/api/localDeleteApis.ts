import { baseUrl } from '../components/HomeScreenComponents';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CommonActions } from '@react-navigation/native';
import {getAuthHeaders} from '../utils/userTokenAuth';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import {getAdaptiveTimeout} from '../utils/DeviceNetworkStrengthDetector.ts';

interface DeleteLectureResponse {
  success: boolean;
  message?: string;
  error?: string;
}
interface DeleteMaterialPayload {
  materialUrl: string;
}
interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
}
export const handleFinalDelete = async (
  { navigation, reason }: { navigation: any, reason?: string },
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
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}users/account/delete`, {
      method: 'DELETE',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({
        reason: reason?.trim() || "No reason provided",
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const data = await response.json();

    if (!response.ok || !data.status) {
      Toast.show({ 
        type: 'error', 
        text1: 'Delete Error', 
        text2: data?.message || 'Failed to delete account.' 
      });
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
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      Toast.show({ type: 'error', text1: 'Timeout Error', text2: 'Account deletion request timed out.' });
      return;
    }

    console.error("Delete failed:", error);
    Toast.show({ 
      type: 'error', 
      text1: 'Network Error', 
      text2: error?.message || 'An unexpected error occurred' 
    });
  }
};
export const deleteRecoveryEmailAPI = async (
  emailToDelete: string, 
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
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}users/recovery-email`, {
      method: 'DELETE',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({ emailToDelete }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const data = await response.json();

    if (!response.ok || !data.success) {
      Toast.show({ 
        type: 'error', 
        text1: 'Delete Error', 
        text2: data?.message || 'Failed to delete recovery email.' 
      });
      return { success: false, message: data?.message || 'Failed to delete recovery email.' };
    }

    return {
      success: true,
      message: data?.message || 'Deleted successfully',
      recoveryEmails: data.recoveryEmails
    };
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      Toast.show({ type: 'error', text1: 'Timeout Error', text2: 'Request timed out.' });
      return { success: false, message: 'Recovery email deletion request timed out.' };
    }

    Toast.show({ type: 'error', text1: 'Network Error', text2: 'Network error' });
    return { success: false, message: 'Network error' };
  }
};
export const handleDeletePhone = async (
  phoneNumber: string,
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
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}users/phone-number`, {
      method: 'DELETE',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({ phoneNumber }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const data = await response.json();

    if (!response.ok || !data.success) {
      Toast.show({ 
        type: 'error', 
        text1: 'Delete Error', 
        text2: data?.message || 'Failed to delete phone number.' 
      });
      return { success: false, message: data?.message || 'Failed to delete phone number.' };
    }

    return {
      success: true,
      phoneNumbers: data.phoneNumbers,
      message: data.message
    };
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      Toast.show({ type: 'error', text1: 'Timeout Error', text2: 'Request timed out.' });
      return { success: false, message: 'Phone number deletion request timed out.' };
    }

    Toast.show({ type: 'error', text1: 'Network Error', text2: 'Network error' });
    return { success: false, message: 'Network error' };
  }
};
export const clearCartAPI = async (showToast = true) => {
  const idempotencyKey = typeof crypto !== 'undefined' && crypto.randomUUID 
    ? crypto.randomUUID() 
    : `idemp-${Date.now()}-${Math.random()}`;

  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}store/cart/delete-all`, { 
      method: 'DELETE',
      headers: {
        ...headers,
        'Idempotency-Key': idempotencyKey
      },
    });

    const data = await response.json();

    if (!response.ok) {
      if (showToast) {
        Toast.show({ 
          type: 'error', 
          text1: 'Cart Error', 
          text2: data.message || 'Failed to clear cart' 
        });
      }
      return { success: false, message: data.message };
    }

    if (showToast) {
      Toast.show({ type: 'success', text2: data.message || 'Cart cleared' });
    }
    
    return { success: true, message: data.message };
  } catch (error: any) {
    console.error("Clear Cart Error:", error);
    if (showToast) {
      Toast.show({ type: 'error', text1: 'Network Error', text2: error.message });
    }
    return { success: false, message: 'Network error' };
  }
};
export const clearFavoritesAPI = async (maxRetries = 3) => {
  const idempotencyKey = uuidv4();
  let attempt = 0;
  const TIMEOUT_MS = await getAdaptiveTimeout();

  while (attempt < maxRetries) {
    attempt++;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const headers = await getAuthHeaders();
      const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

      const response = await fetch(`${cleanBaseUrl}/store/favorites/delete-all`, {
        method: 'DELETE',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const data = await response.json();

      if (!response.ok || !data.status) {
        if (response.status >= 400 && response.status < 500) {
          Toast.show({ 
            type: 'error', 
            text1: 'Delete Error', 
            text2: data.message || 'Failed to clear favorites' 
          });
          return { success: false };
        }
        throw new Error(data.message || `Server error: ${response.status}`);
      }

      Toast.show({ type: 'success', text2: data.message || 'Favorites cleared successfully' });
      return { success: true };

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
        return { success: false };
      }

      const backoffDelay = Math.pow(2, attempt - 1) * 1000;
      console.warn(`Clear favorites attempt ${attempt} failed (${errorMessage}). Retrying in ${backoffDelay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, backoffDelay));
    }
  }

  Toast.show({ type: 'error', text1: 'Network Error', text2: 'Failed to clear favorites after retries.' });
  return { success: false };
};
export const deleteProductApi = async (
  productId: string, 
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
    const headers = await getAuthHeaders();
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const endpoint = `${cleanBaseUrl}/store/products/delete/${productId}`;

    const response = await fetch(endpoint, {
      method: 'DELETE',
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
      Toast.show({ 
        type: 'error', 
        text1: 'Delete Error', 
        text2: data?.message || 'Failed to delete product.' 
      });
      return { success: false, message: data?.message || 'Failed to delete product.' };
    }

    Toast.show({ 
      type: 'success', 
      text1: 'Success', 
      text2: data?.message || 'Product deleted successfully.' 
    });

    return {
      success: true,
      message: data?.message || 'Deleted successfully',
      data: data.data
    };
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      Toast.show({ type: 'error', text1: 'Timeout Error', text2: 'Request timed out.' });
      return { success: false, message: 'Product deletion request timed out.' };
    }

    Toast.show({ type: 'error', text1: 'Network Error', text2: 'Network error occurred.' });
    return { success: false, message: 'Network error' };
  }
};
export const deletePostApi = async (postId: string) => {
  const TIMEOUT_MS = await getAdaptiveTimeout();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const headers = await getAuthHeaders();
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const url = `${cleanBaseUrl}/posts/${postId}/delete`;

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        ...headers,
        'Idempotency-Key': uuidv4(),
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const result = await response.json();
    return result;
  } catch (error: any) {
    clearTimeout(timeoutId);
    console.error("Error invoking deletePostApi:", error);
    throw error;
  }
};
export const deleteLectureSchedule = async (
  lectureId: string, 
  signal?: AbortSignal
): Promise<DeleteLectureResponse> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${baseUrl}users/lecturers/class/lectures/${lectureId}`,
      {
        method: 'DELETE',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': uuidv4(),
        },
        signal,
      }
    );
    const result = await response.json();
    if (!response.ok) {
      return {
        success: false,
        error: result.message || 'Failed to cancel the scheduled lecture.',
      };
    }
    return {
      success: true,
      message: result.message,
    };
  } catch (error: any) {
    if (error.name === 'AbortError') return { success: false, error: 'Request cancelled.' };
    console.error("Delete Lecture Utility Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown network error',
    };
  }
};
export const deleteCourseMaterial = async (
  courseId: string,
  payload: DeleteMaterialPayload,
  signal?: AbortSignal
): Promise<{ success: boolean; message?: string; error?: string }> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${baseUrl}users/lecturers/class/courses/deleteMaterial/${courseId}`,
      {
        method: 'DELETE', 
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
        error: result.message || 'Failed to remove material from backend servers.',
      };
    }

    return {
      success: true,
      message: result.message || 'Material removed successfully.',
    };
  } catch (error: any) {
    if (error.name === 'AbortError') return { success: false, error: 'Request cancelled.' };
    console.error("Delete Material Utility Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown network error occurred',
    };
  }
};
export const deleteCourseContent = async (
  courseId: string,
  index: number,
  signal?: AbortSignal
): Promise<{ success: boolean; data?: any; error?: string }> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}users/lecturers/class/courses/deleteCourseContent/${courseId}`, {
      method: 'DELETE', 
      headers: {
        ...headers,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': uuidv4(),
      },
      body: JSON.stringify({ index }),
      signal,
    });
    const result = await response.json();
    if (!response.ok) return { success: false, error: result.message || 'Failed to delete topic.' };
    return { success: true, data: result.updatedContents };
  } catch (error: any) {
    if (error.name === 'AbortError') return { success: false, error: 'Request cancelled.' };
    return { success: false, error: error.message || 'Network error occurred' };
  }
};
export const deleteAssignment = async (courseId: string, assignmentId: string): Promise<ApiResponse> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}users/lecturers/class/courses/${courseId}/assignments/${assignmentId}`, {
      method: 'DELETE',
      headers: {
        ...headers,
      }
    });

    const result = await response.json();
    if (!response.ok) {
      return { success: false, error: result.message || 'Failed to delete assignment.' };
    }
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message || 'Network error occurred.' };
  }
};
export const deleteAdminApi = async (uid: string) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}admins/${uid}/delete`, {
      method: 'DELETE',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': uuidv4(),
      },
    });
    
    const result = await response.json();
    if (!response.ok) {
      return { success: false, error: result.error || 'Failed to delete admin.' };
    }
    return result;
  } catch (error) {
    console.error("Error invoking deleteAdminApi:", error);
    throw error;
  }
};
export const deleteInstitutionApi = async (id: string) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}admins/institutions/${id}/delete`, {
      method: 'DELETE',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': uuidv4(),
      },
    });
    
    const result = await response.json();
    if (!response.ok) {
      return { success: false, error: result.message || 'Failed to delete institution.' };
    }
    return { success: true };
  } catch (error) {
    console.error("Error invoking deleteInstitutionApi:", error);
    return { success: false, error: 'Network error occurred.' };
  }
};
export const deleteDropOffStationApi = async (id: string) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}admins/stations/${id}/delete`, {
      method: 'DELETE',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': uuidv4(),
      },
    });
    const result = await response.json();
    if (!response.ok) {
      return { success: false, error: result.message || 'Failed to delete station.' };
    }
    
    return { success: true };
  } catch (error) {
    console.error("Error invoking deleteDropOffStationApi:", error);
    return { success: false, error: 'Network error occurred.' };
  }
};
export const deleteAdApi = async (adId: string | number, signal?: AbortSignal) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}admins/ads/${adId}/delete`, {
      method: 'DELETE',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': uuidv4(),
      },
      signal,
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      return { success: false, error: result.message || 'Failed to delete advertisement.' };
    }
    
    return { success: true };
  } catch (error: any) {
    if (error.name === 'AbortError') return { success: false, error: 'Request cancelled.' };
    console.error("Error invoking deleteAdApi:", error);
    return { success: false, error: 'Network error occurred.' };
  }
};