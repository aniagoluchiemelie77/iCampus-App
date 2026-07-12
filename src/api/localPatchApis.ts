import { User, userPreferences } from '../types/firebase';
import { baseUrl } from '@components/HomeScreenComponents';
import Toast from 'react-native-toast-message';
import {getAuthHeaders} from '../utils/userTokenAuth';
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
  const headers = await getAuthHeaders();
  const response = await fetch(`${baseUrl}/users/update-profile`, {
    method: 'PATCH',
    headers,
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
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}users/preferences/${userId}`, {
      method: 'PATCH', 
      headers,
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
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}users/update-emails`, {
      method: 'PATCH',
      headers,
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
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}posts/${postId}/impression`, {
      method: 'PATCH',
      headers,
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
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}posts/${postId}/vote`, {
      method: 'PATCH',
      headers,
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
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}posts/${postId}/bookmark`, {
      method: 'PATCH',
      headers,
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
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}store/cart/toggle`, {
      method: 'PATCH',
      headers,
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
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}store/favorites/toggle`, {
      method: 'PATCH', 
      headers,
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
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}users/downloads/update-progress`, {
      method: 'PATCH', 
      headers,
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
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}store/product/toggle-impressions`, {
      method: 'PATCH',
      headers,
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
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${baseUrl}users/notifications/mark-all-read`,
      {
        method: 'PATCH',
        headers,
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
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}users/notifications/${notificationId}/read`, {
      method: 'PATCH',
      headers,
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
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${baseUrl}users/lecturers/class/exceptions/${id}/status`,
      {
        method: 'PATCH',
        headers,
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
export const markOrderAsDroppedOffAPI = async (orderId: string) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}store/orders/mark-as-dropped-off`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ orderId }),
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: result.message || "Failed to update order status.",
      };
    }

    return {
      success: true,
      status: result.status, 
      message: result.message || "Order updated to dropped off.",
    };
  } catch (error) {
    console.error("markOrderAsDroppedOffAPI Error:", error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : "Network error" 
    };
  }
};
export const updateTicketStatus = async (ticketId: string, status: string) => {
  try {
    const url = `${baseUrl}support/tickets/${ticketId}/status`;
    const headers = await getAuthHeaders();
    
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      Toast.show({
        type: 'error',
        text1: 'Update Failed',
        text2: data?.message || 'Could not update the ticket status.',
      });
      return { success: false };
    }
    
    Toast.show({
      type: 'success',
      text1: 'Success',
      text2: `Ticket marked as ${status}.`,
    });
    
    return { success: true, ticket: data.ticket || data };
  } catch (error) {
    console.error("updateTicketStatus Error:", error);
    Toast.show({
      type: 'error',
      text1: 'Connection Error',
      text2: 'Failed to connect to the server.',
    });
    return { success: false };
  }
};
export const updateAdminUser = async (uid: string, updateData: any) => {
  try {
    const url = `${baseUrl}admins/edit-users/${uid}`;
    const headers = await getAuthHeaders();
    
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      Toast.show({
        type: 'error',
        text1: 'Update Failed',
        text2: data?.message || 'Could not update user details.',
      });
      return { success: false };
    }
    
    Toast.show({
      type: 'success',
      text1: 'Saved',
      text2: 'User context updated successfully.',
    });
    
    return { success: true, data: data.user };
  } catch (error) {
    console.error("updateAdminUser Error:", error);
    Toast.show({
      type: 'error',
      text1: 'Connection Error',
      text2: 'Failed to connect to the server.',
    });
    return { success: false };
  }
};
export const updateInstitutionApi = async (id: string, updateData: any) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}admins/institutions/${id}/update`, {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData),
    });

    const data = await response.json();
    return response.ok ? { success: true, data } : { success: false, error: data.message };
  } catch (error) {
    return { success: false, error: 'Network error.' };
  }
};
export const updateStationApi = async (stationId: string, updateData: any) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}admins/stations/${stationId}/update`, {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData),
    });

    const data = await response.json();
    return response.ok 
      ? { success: true, data: data.station } 
      : { success: false, error: data.message || 'Failed to update station.' };
  } catch (error) {
    console.error("Update Station API Error:", error);
    return { success: false, error: 'Network error occurred.' };
  }
};
export const editMessageApi = async (messageId: string, newText: string) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}users/messages/${messageId}/update`, {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: newText }),
    });

    const data = await response.json();
    return response.ok 
      ? { success: true } 
      : { success: false, error: data.message || 'Failed to edit message.' };
  } catch (error) {
    console.error("Edit Message API Error:", error);
    return { success: false, error: 'Network error occurred.' };
  }
};