import { User, userPreferences } from '../types/firebase';
import { baseUrl } from '../components/HomeScreenComponents';
import Toast from 'react-native-toast-message';
import { fetchWithAuth} from '../utils/userTokenAuth';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import {getAdaptiveTimeout} from '../utils/DeviceNetworkStrengthDetector.ts';
interface UpdateExceptionStatusPayload {
  status: 'approved' | 'rejected';
  lecturerComment?: string;
}
 interface UpdateExceptionStatusResponse {
  success: boolean;
  message?: string;
  newIcashBalance?: number;
  error?: string;
}

export const patchUserProfile = async (
  data: Partial<User>,
  signal?: AbortSignal
): Promise<any> => {
  const TIMEOUT_MS = await getAdaptiveTimeout();
  const controller = new AbortController();

  if (signal) {
    signal.addEventListener('abort', () => controller.abort());
  }
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const idempotencyKey = uuidv4();

  try {
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    
    const response = await fetchWithAuth(`${cleanBaseUrl}/users/update-profile`, {
      method: 'PATCH',
      headers: {
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(data),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const result = await response.json();

    // Field errors (e.g. username taken) are shown inline by the screen.
    if ((!response.ok || !result.success) && !result?.field) {
      const errorMessage = result?.message || 'Failed to update profile';
      Toast.show({
        type: 'error',
        text1: 'Update Error',
        text2: errorMessage,
      });
    }
    
    return result;
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      Toast.show({ type: 'error', text1: 'Timeout Error', text2: 'Profile update timed out.' });
      return { success: false, message: 'Request timed out.' };
    }

    console.error("Patch Profile Utility Error:", error);
    Toast.show({
      type: 'error',
      text1: 'Connection Error',
      text2: error?.message || 'Network error.',
    });
    return { success: false, message: error?.message || 'Network error.' };
  }
};
export const updatePreferences = async (
  update: Partial<userPreferences>,
  signal?: AbortSignal
): Promise<{ success: boolean; data?: any; error?: string }> => {
  const TIMEOUT_MS = await getAdaptiveTimeout();
  const controller = new AbortController();

  if (signal) {
    signal.addEventListener('abort', () => controller.abort());
  }
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const idempotencyKey = uuidv4();

  try {
    const response = await fetchWithAuth(`${baseUrl}users/preferences`, {
      method: 'PATCH', 
      headers: {
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(update),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const data = await response.json();

    if (!response.ok || !data.success) {
      const errorMessage = data?.error || data?.message || 'Failed to update preferences';
      Toast.show({
        type: 'error',
        text1: 'Update Error',
        text2: errorMessage,
      });
      return { success: false, error: errorMessage };
    }

    return { success: true, data: data.preferences || data };
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      Toast.show({ type: 'error', text1: 'Timeout Error', text2: 'Preference update request timed out.' });
      return { success: false, error: 'Request timed out.' };
    }

    console.error("Preference Update Error:", error);
    const errorMsg = error?.message || 'Failed to update preferences';
    Toast.show({
      type: 'error',
      text1: 'Network Error',
      text2: errorMsg,
    });
    return { success: false, error: errorMsg };
  }
};
export const updateEmailRecord = async (
  email: string, 
  type: string, 
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
    const response = await fetchWithAuth(`${baseUrl}users/update-emails`, {
      method: 'PATCH',
      headers: {
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({ email, type }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const result = await response.json();

    if (!response.ok || !result.success) {
      return { 
        success: false, 
        message: result?.message || 'Failed to update email record.' 
      };
    }

    return { 
      success: true, 
      message: result?.message || 'Email updated successfully.' 
    };
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      return { success: false, message: 'Email update request timed out.' };
    }

    return { success: false, message: error?.message || 'Network error. Try again.' };
  }
};
export const recordPostImpressionAPI = async (postId: string) => {
  const TIMEOUT_MS = await getAdaptiveTimeout();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const url = `${cleanBaseUrl}/posts/${postId}/impression`;

    const response = await fetchWithAuth(url, {
      method: 'PATCH',
      headers: {
        'Idempotency-Key': uuidv4(),
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: data?.message || 'Failed to add impression',
      };
    }

    return {
      success: true,
      message: data.message || 'Impression recorded',
    };
  } catch (error: any) {
    clearTimeout(timeoutId);
    console.error("recordPostImpressionAPI Error:", error);
    return { 
      success: false, 
      message: error.name === 'AbortError' ? 'Request timed out' : 'Failed to record impression' 
    };
  }
};
export const castPollVoteAPI = async (
  postId: string,
  optionId: string,
): Promise<{ success: boolean; poll?: any; message?: string }> => {
  const TIMEOUT_MS = await getAdaptiveTimeout();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    // The voter is the signed-in user; the server ignores any userId sent here.
    const response = await fetchWithAuth(`${cleanBaseUrl}/posts/${postId}/vote`, {
      method: 'PATCH',
      headers: { 'Idempotency-Key': uuidv4() },
      body: JSON.stringify({ optionId }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.success === false) {
      return { success: false, message: data?.message || data?.error || 'Failed to cast poll vote' };
    }
    return { success: true, poll: data.poll };
  } catch (error: any) {
    clearTimeout(timeoutId);
    console.error("castPollVoteAPI Error:", error);
    return {
      success: false,
      message: error.name === 'AbortError' ? 'Request timed out' : 'Connection to server failed',
    };
  }
};
export const toggleBookmarkAPI = async (
  postId: string,
): Promise<{ success: boolean; bookmarked?: boolean; bookmarks?: string[]; message?: string }> => {
  const TIMEOUT_MS = await getAdaptiveTimeout();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const response = await fetchWithAuth(`${cleanBaseUrl}/posts/${postId}/bookmark`, {
      method: 'PATCH',
      headers: { 'Idempotency-Key': uuidv4() },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.success === false) {
      return { success: false, message: data?.message || 'Bookmark sync failed' };
    }
    return { success: true, bookmarked: data.bookmarked, bookmarks: data.bookmarks, message: data.message };
  } catch (error: any) {
    clearTimeout(timeoutId);
    console.error("toggleBookmarkAPI Error:", error);
    return { success: false, message: error.name === 'AbortError' ? 'Request timed out' : 'Connection to server failed' };
  }
};
export const updateCartAPI = async (
  productId: string, 
  action: 'add' | 'remove' | 'update',
  details?: { selectedSize?: string; selectedColor?: string; quantity?: number },
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
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const endpoint = `${cleanBaseUrl}/store/cart/toggle`;

    const response = await fetchWithAuth(endpoint, {
      method: 'PATCH',
      headers: {
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({ productId, action, ...details }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const result = await response.json();
    console.log('Toggle Status: ', response.ok || result.success);

    if (!response.ok || !result.success) {
      Toast.show({ 
        type: 'error', 
        text1: 'Cart Error', 
        text2: result?.message || 'Failed to update cart.' 
      });
      return {
        success: false,
        message: result?.message || 'Failed to update cart.',
      };
    }

    return {
      success: true,
      data: result.cart, 
      message: result.message
    };
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      Toast.show({ type: 'error', text1: 'Timeout Error', text2: 'Request timed out.' });
      return { success: false, message: 'Cart update request timed out.' };
    }

    Toast.show({ type: 'error', text1: 'Network Error', text2: 'Network error occurred.' });
    return { success: false, message: "Network error" };
  }
};
export const toggleFavoriteAPI = async (
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
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const endpoint = `${cleanBaseUrl}/store/favorites/toggle`;

    const response = await fetchWithAuth(endpoint, {
      method: 'PATCH', 
      headers: {
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({ productId }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const result = await response.json();
    console.log('Toggle Action Status: ', response.ok);

    if (!response.ok || !result.success) {
      Toast.show({ 
        type: 'error', 
        text1: 'Action Failed', 
        text2: result?.message || 'Failed to update favorites.' 
      });
      return {
        success: false,
        message: result?.message || 'Failed to update favorites.',
      };
    }

    return {
      success: true,
      data: result.favorites,
      message: result.message,
    };
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      Toast.show({ type: 'error', text1: 'Timeout Error', text2: 'Request timed out.' });
      return { success: false, message: 'Favorite toggle request timed out.' };
    }

    Toast.show({ type: 'error', text1: 'Network Error', text2: 'Network error occurred.' });
    return { success: false, message: "Network error" };
  }
};
export const logProductImpressionAPI = async (productId: string, maxRetries = 3) => {
  const idempotencyKey = uuidv4();
  let attempt = 0;
  const TIMEOUT_MS = await getAdaptiveTimeout();
  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

  while (attempt < maxRetries) {
    attempt++;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetchWithAuth(`${cleanBaseUrl}/store/product/toggle-impressions`, {
        method: 'PATCH',
        headers: {
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({ productId }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const result = await response.json();

      if (!response.ok) {
        if (response.status >= 400 && response.status < 500) {
          return {
            success: false,
            message: result?.message || 'Failed to update increment impressions',
          };
        }
        throw new Error(result?.message || `Server error: ${response.status}`);
      }

      return {
        success: true,
        message: result?.message || 'Impression logged successfully',
      };

    } catch (error: any) {
      clearTimeout(timeoutId);

      const isTimeout = error.name === 'AbortError';
      const errorMessage = isTimeout ? 'Request timed out.' : (error.message || 'Network error.');

      if (attempt >= maxRetries) {
        console.error("logProductImpressionAPI Error (Max retries reached):", errorMessage);
        return { success: false, message: errorMessage };
      }

      const backoffDelay = Math.pow(2, attempt - 1) * 1000;
      await new Promise((resolve) => setTimeout(resolve, backoffDelay));
    }
  }

  return { success: false, message: 'Max retry attempts reached.' };
};
export const markAllNotificationsAsRead = async (
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
    const response = await fetchWithAuth(
      `${baseUrl}users/notifications/mark-all-read`,
      {
        method: 'PATCH',
        headers: {
          'Idempotency-Key': idempotencyKey,
        },
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);
    const result = await response.json();

    if (!response.ok || !result.success) {
      const errorMessage = result?.message || 'Failed to mark all notifications as read';
      Toast.show({
        type: 'error',
        text1: 'Action Failed',
        text2: errorMessage,
      });
      return { success: false, message: errorMessage };
    }

    return { success: true, message: result?.message };
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      Toast.show({ type: 'error', text1: 'Timeout Error', text2: 'Request timed out.' });
      return { success: false, message: 'Request timed out.' };
    }

    console.error("Mark All Read Utility Error:", error);
    Toast.show({
      type: 'error',
      text1: 'Connection Error',
      text2: 'Could not reach the server to update notifications.',
    });
    return { success: false, message: error?.message || 'Network error.' };
  }
};
export const markSingleNotificationAsRead = async (
  notificationId: string,
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
    const response = await fetchWithAuth(`${baseUrl}users/notifications/${notificationId}/read`, {
      method: 'PATCH',
      headers: {
        'Idempotency-Key': idempotencyKey,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const result = response.status !== 204 ? await response.json() : {};

    if (!response.ok || (result.success === false)) {
      const errorMessage = result?.message || 'Failed to mark notification as read';
      Toast.show({
        type: 'error',
        text1: 'Update Error',
        text2: errorMessage,
      });
      return { success: false, message: errorMessage };
    }

    return { success: true, message: result?.message };
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      return { success: false, message: 'Request timed out.' };
    }

    console.error("Mark Single Read Utility Error:", error);
    return { success: false, message: error?.message || 'Network error.' };
  }
};
export const updateExceptionStatus = async (
  id: string,
  payload: UpdateExceptionStatusPayload,
  signal?: AbortSignal
): Promise<UpdateExceptionStatusResponse> => {
  try {
    const response = await fetchWithAuth(
      `${baseUrl}users/lecturers/class/exceptions/${id}/status`,
      {
        method: 'PATCH',
        headers: {
          'X-Idempotency-Key': uuidv4(),
        },
        body: JSON.stringify(payload),
        signal,
      }
    );
    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || `Failed to update exception status to ${payload.status}`,
      };
    }
    return {
      success: true,
      message: data.message,
      newIcashBalance: data.newIcashBalance, 
    };
  } catch (error: any) {
    if (error.name === 'AbortError') return { success: false, error: 'Request cancelled.' };
    console.error("Update Exception Status Utility Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown network error',
    };
  }
};
export const markOrderAsDroppedOffAPI = async (
  orderId: string,
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
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const endpoint = `${cleanBaseUrl}/store/orders/mark-as-dropped-off`;

    const response = await fetchWithAuth(endpoint, {
      method: 'PATCH',
      headers: {
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({ orderId }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const result = await response.json();

    if (!response.ok || !result.success) {
      Toast.show({ 
        type: 'error', 
        text1: 'Update Failed', 
        text2: result?.message || "Failed to update order status." 
      });
      return {
        success: false,
        message: result?.message || "Failed to update order status.",
      };
    }

    Toast.show({ 
      type: 'success', 
      text1: 'Success', 
      text2: result?.message || "Order updated to dropped off." 
    });

    return {
      success: true,
      status: result.status, 
      message: result.message || "Order updated to dropped off.",
    };
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      Toast.show({ type: 'error', text1: 'Timeout Error', text2: 'Request timed out.' });
      return { success: false, message: 'Order status update request timed out.' };
    }

    Toast.show({ type: 'error', text1: 'Network Error', text2: 'Network error occurred.' });
    return { 
      success: false, 
      message: error instanceof Error ? error.message : "Network error" 
    };
  }
};