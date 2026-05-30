import { User, userPreferences } from '../types/firebase';
import { baseUrl } from '@components/HomeScreenComponents';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';

const token = await AsyncStorage.getItem('accessToken');
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
export const patchUserProfile = async (data: Partial<User>) => {
  const response = await fetch(`${baseUrl}/users/update-profile`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorData = await response.json();
    Toast.show({
      type: 'error',
      text1: 'Update Error',
      text2: errorData.message || 'Failed to update profile',
    });
  }
  return await response.json();
};
export const updatePreferences = async (
  userId: string,
  update: Partial<userPreferences>,
) => {
  try {
    const response = await fetch(`${baseUrl}users/preferences/${userId}`, {
      method: 'PATCH', 
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(update),
    });

    const data = await response.json();
    if (!response.ok) {
      Toast.show({
        type: 'error',
        text1: 'Update Error',
        text2: data.error || 'Failed to update preferences',
      });
    };
    return { success: true, data };
  } catch (error: any) {
    console.error("Preference Update Error:", error);
    Toast.show({
      type: 'error',
      text1: 'Network Error',
      text2: error || 'Failed to update preferences',
    });
    return { success: false, error: error.message };
  }
};
export const updateEmailRecord = async (email: string, type: string) => {
  try {
    const response = await fetch(`${baseUrl}users/update-emails`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ email, type }),
    });
    const result = await response.json();
    if (!result.ok) {
      return { success: result.success, message: result.message };
    }
    return { success: response.ok, message: result.message };
  }catch (error) {
     return { success: false, message: "Network error. Try again." };
  }
};
export const recordPostImpressionAPI = async (postId: string) => {
  try {
    const response = await fetch(`${baseUrl}posts/${postId}/impression`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
    });
    const data = await response.json();
    if (!response.ok) {
      return {
        success: false,
        message: data?.message || 'Failed to add impression',
      };
    }
    return {
      success: response.ok,
      message: data.message,
    };
  } catch (error) {
    console.error("recordPostImpressionAPI Error:", error);
    return { success: false, message: 'Failed to record impression' };
  }
};
export const castPollVoteAPI = async (postId: string, optionId: string, userId: string) => {
  try {
    const response = await fetch(`${baseUrl}posts/${postId}/vote`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        optionId,
        userId,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return {
        success: false,
        message: data?.message || 'Failed to cast poll vote',
      };
    }
    return {
      success: response.ok,
      data: data,
      message: response.ok ? 'Vote registered' : (data.message || 'Failed to register vote'),
    };
  } catch (error) {
    console.error("castPollVoteAPI Error:", error);
    return { success: false, message: 'Connection to server failed' };
  }
};
export const toggleBookmarkAPI = async (postId: string) => {
  try {
    const response = await fetch(`${baseUrl}posts/${postId}/bookmark`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    const data = await response.json();
    if (!response.ok) {
      return {
        success: false,
        message: data?.message || 'Bookmark sync failed',
      };
    }
    return {
      success: response.ok,
      message: data.message
    };
  } catch (error) {
    console.error("toggleBookmarkAPI Error:", error);
    return { success: false, message: 'Connection to server failed' };
  }
};
export const updateCartAPI = async (
  productId: string, 
  action: 'add' | 'remove' | 'update',
  details?: { selectedSize?: string; selectedColor?: string; quantity?: number }
) => {
  try {
    const response = await fetch(`${baseUrl}store/cart/toggle`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ productId, action, ...details }),
    });
    const result = await response.json();
    if (!response.ok) {
      return {
        success: false,
        message: result.message,
      };
    }
    return {
      success: response.ok,
      data: result.cart, 
      message: result.message
    };
  } catch (error) {
    console.error("updateCartAPI Error:", error);
    return { success: false, message: "Network error" };
  }
};
export const toggleFavoriteAPI = async (productId: string) => {
  try {
    const response = await fetch(`${baseUrl}store/favorites/toggle`, {
      method: 'PATCH', 
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ productId }),
    });

    const result = await response.json();
    if (!response.ok) {
      return {
        success: false,
        message: result.message,
      };
    }
    return {
      success: response.ok,
      data: result.favorites,
      message: result.message,
    };
  } catch (error) {
    console.error("toggleFavoriteAPI Error:", error);
    return { success: false, message: "Network error" };
  }
};
export const updateCourseProgressAPI = async (
  productId: string,
  progress: number,
  completedLessons: string[]
) => {
  try {
    const response = await fetch(`${baseUrl}users/downloads/update-progress`, {
      method: 'PATCH', 
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`, 
      },
      body: JSON.stringify({
        productId,
        progress, 
        completedLessons, 
        lastWatched: new Date().toISOString(),
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      return {
        success: false,
        message: data?.message || 'Failed to update course progress',
      };
    }
    return {
      success: true,
      data: data,
      message: 'Progress saved successfully',
    };
  } catch (error) {
    console.error("updateCourseProgressAPI Error:", error);
    return { 
      success: false, 
      message: 'Connection to server failed. Please check your data.' 
    };
  }
};
export const logProductImpressionAPI = async (productId: string) => {
  try {
    const response = await fetch(`${baseUrl}store/product/toggle-impressions`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ productId }),
    });
    const result = await response.json();
    if (!response.ok) {
      return {
        success: false,
        message: result?.message || 'Failed to update increment impressions',
      };
    }
  } catch (error) {
    console.error("logProductImpressionAPI Error:", error);
    return { success: false, message: "Network error" };
  }
};
export const markAllNotificationsAsRead = async (
): Promise<{ success: boolean; message?: string }> => {
  try {
    const response = await fetch(
      `${baseUrl}users/notifications/mark-all-read`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    const result = await response.json();

    if (!response.ok) {
      Toast.show({
        type: 'error',
        text1: 'Action Failed',
        text2: result.message || 'Failed to mark all notifications as read',
      });
      return { success: false, message: result.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error("Mark All Read Utility Error:", error);
    Toast.show({
      type: 'error',
      text1: 'Connection Error',
      text2: 'Could not reach the server to update notifications.',
    });
    return { success: false, message: error.message };
  }
};
export const markSingleNotificationAsRead = async (
  notificationId: string
): Promise<{ success: boolean; message?: string }> => {
  try {
    const response = await fetch(`${baseUrl}users/notifications/${notificationId}/read`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    const result = response.status !== 204 ? await response.json() : {};
    if (!response.ok) {
      Toast.show({
        type: 'error',
        text1: 'Update Error',
        text2: result.message || 'Failed to mark notification as read',
      });
      return { success: false, message: result.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error("Mark Single Read Utility Error:", error);
    return { success: false, message: error.message };
  }
};
export const updateExceptionStatus = async (
  id: string,
  payload: UpdateExceptionStatusPayload
): Promise<UpdateExceptionStatusResponse> => {
  try {
    const response = await fetch(
      `${baseUrl}users/lecturers/class/exceptions/${id}/status`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
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
  } catch (error) {
    console.error("Update Exception Status Utility Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown network error',
    };
  }
};