import { baseUrl } from '../components/HomeScreenComponents';
import Toast from 'react-native-toast-message';
import {ThemeType} from '../types/firebase';
import {getAuthHeaders} from '../utils/userTokenAuth';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import {getAdaptiveTimeout} from '../utils/DeviceNetworkStrengthDetector.ts';

interface UpdateITagResponse {
  success: boolean;
  message?: string;
  data?: any;
}
export const updatePassword = async (newPassword: string, signal?: AbortSignal) => {
  const TIMEOUT_MS = await getAdaptiveTimeout();
  const controller = new AbortController();

  if (signal) {
    signal.addEventListener('abort', () => controller.abort());
  }
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const idempotencyKey = uuidv4();

  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}users/password/update`, {
      method: 'PUT',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({ newPassword }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const result = await response.json();

    if (!response.ok) {
      return { 
        success: false, 
        message: result?.message || 'Failed to update password.' 
      };
    }

    return { 
      success: true, 
      message: result?.message || 'Password updated successfully.' 
    };
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      return { success: false, message: 'Password update request timed out.' };
    }

    return { success: false, message: error?.message || 'Update failed. Try again.' };
  }
};
export const customizeItag = async (
  updatePayload: Record<string, any>,
  signal?: AbortSignal
): Promise<UpdateITagResponse> => {
  const TIMEOUT_MS = await getAdaptiveTimeout();
  const controller = new AbortController();

  if (signal) {
    signal.addEventListener('abort', () => controller.abort());
  }
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const idempotencyKey = uuidv4();

  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}users/update-itag`, {
      method: 'PUT',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({
        updates: updatePayload
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const result = await response.json();

    if (!response.ok || !result.success) {
      const errorMessage = result?.message || 'Failed to update iTag configurations';
      Toast.show({
        type: 'error',
        text1: 'Update Failed',
        text2: errorMessage,
      });
      return { success: false, message: errorMessage };
    }

    return { success: true, data: result.data };
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      Toast.show({ type: 'error', text1: 'Timeout Error', text2: 'iTag update request timed out.' });
      return { success: false, message: 'Request timed out.' };
    }

    console.error("Update iTag Utility Error:", error);
    Toast.show({
      type: 'error',
      text1: 'Network Error',
      text2: 'Could not connect to the system configurations server.',
    });
    return { success: false, message: error?.message || 'Network error' };
  }
};
export const updateCourseContent = async (
  courseId: string,
  index: number,
  updatedTopic: string,
  signal?: AbortSignal
): Promise<{ success: boolean; data?: any; error?: string }> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}users/lecturers/class/courses/editCourseContent/${courseId}`, {
      method: 'PUT', 
      headers: {
        ...headers,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': uuidv4(),
      },
      body: JSON.stringify({ index, updatedTopic }),
      signal,
    });
    const result = await response.json();
    if (!response.ok) return { success: false, error: result.message || 'Failed to edit topic.' };
    return { success: true, data: result.updatedContents };
  } catch (error: any) {
    if (error.name === 'AbortError') return { success: false, error: 'Request cancelled.' };
    return { success: false, error: error.message || 'Network error occurred' };
  }
};
export const updateUserThemePreference = async (
  theme: ThemeType,
  signal?: AbortSignal
): Promise<{ success: boolean; data?: any; error?: string }> => {
  const TIMEOUT_MS = await getAdaptiveTimeout();
  const controller = new AbortController();

  if (signal) {
    signal.addEventListener('abort', () => controller.abort());
  }
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const headers = await getAuthHeaders();
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

    const response = await fetch(`${cleanBaseUrl}/users/preferences/toggleTheme`, {
      method: 'PUT',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ theme }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const result = await response.json();

    if (!response.ok || !result.success) {
      return { 
        success: false, 
        error: result?.message || 'Failed to synchronize theme state with the server.' 
      };
    }

    return { 
      success: true, 
      data: result 
    };
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      return { success: false, error: 'Theme synchronization request timed out.' };
    }

    return { 
      success: false, 
      error: error.message || 'A network error occurred while updating theme profiles.' 
    };
  }
};
export const updateLectureDetails = async (
  payload: any,
  signal?: AbortSignal
): Promise<{ success: boolean; data?: any; error?: string }> => {
  try {
    const { courseId, lectureId } = payload;
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${baseUrl}users/lecturers/class/courses/${courseId}/lectures/${lectureId}/edit`,
      {
        method: 'PUT',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': uuidv4(),
        },
        body: JSON.stringify({
          payload
        }),
        signal,
      }
    );
    const result = await response.json();
    if (!response.ok) {
      return { 
        success: false, 
        error: result.message || 'Failed to postpone lecture.' 
      };
    }
    return { success: true, data: result.updatedLecture };
  } catch (error: any) {
    if (error.name === 'AbortError') return { success: false, error: 'Request cancelled.' };
    return { 
      success: false, 
      error: error.message || 'Network error occurred' 
    };
  }
};
export const updateAdminApi = async (uid: string, updateData: any) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}admins/${uid}/update`, {
      method: 'PUT',
      headers: { 
        ...headers, 
        'Content-Type': 'application/json',
        'X-Idempotency-Key': uuidv4(),
      },
      body: JSON.stringify(updateData),
    });
    
    const result = await response.json();
    if (!response.ok) {
      Toast.show({ type: 'error', text1: 'Update Error', text2: result.error || 'Failed to update admin' });
      return;
    }
    return result;
  } catch (error: any) {
    Toast.show({ type: 'error', text1: 'Update Error', text2: error.message });
    return;
  }
};