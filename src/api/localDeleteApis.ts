import { baseUrl } from '../components/HomeScreenComponents';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CommonActions } from '@react-navigation/native';
import {getAuthHeaders} from '../utils/userTokenAuth';

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
export const handleFinalDelete = async ({navigation, reason}: {navigation: any, reason?: string}) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}users/account/delete`, {
        method: 'DELETE',
        headers,
        body: JSON.stringify({
            reason: reason?.trim() || "No reason provided"
        }),
    });
    const data = await response.json();
    if (!response.ok || !data.status) {
        Toast.show({ type: 'error', text1: 'Delete Error', text2: data.message });
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
    console.error("Delete failed", error);
    Toast.show({ type: 'error', text1: 'Network Error', text2: error });
    return;
  }
};
export const deleteRecoveryEmailAPI = async (emailToDelete: string) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}users/recovery-email`, {
      method: 'DELETE',
      headers,
      body: JSON.stringify({ emailToDelete }),
    });
    const data = await response.json();
    if (!response.ok || !data.status) {
        Toast.show({ type: 'error', text1: 'Delete Error', text2: data.message });
        return;
    }
    return {
      success: response.ok,
      recoveryEmails: data.recoveryEmails
    };
  } catch (error) {
    return { success: false, message: 'Network error' };
  }
};
export const handleDeletePhone = async (phoneNumber: string) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}users/phone-number`, {
      method: 'DELETE',
      headers,
      body: JSON.stringify({ phoneNumber }),
    });

    const data = await response.json();
    if (!response.ok || !data.status) {
        Toast.show({ type: 'error', text1: 'Delete Error', text2: data.message });
        return;
    }
    return {
      success: response.ok,
      phoneNumbers: data.phoneNumbers,
      message: data.message
    };
  } catch (error) {
    return { success: false, message: 'Network error' };
  }
};
export const clearCartAPI = async () => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}store/cart/delete-all`, { 
      method: 'DELETE',
      headers,
    });

    const data = await response.json();

    if (!response.ok || !data.status) {
      Toast.show({ 
        type: 'error', 
        text1: 'Cart Error', 
        text2: data.message || 'Failed to clear cart' 
      });
      return { success: false };
    }
    Toast.show({ type: 'success', text2: data.message });
    return {
      success: true,
      message: data.message
    };
  } catch (error: any) {
    console.error("Clear Cart Error:", error);
    Toast.show({ type: 'error', text1: 'Network Error', text2: error.message });
    return { success: false, message: 'Network error' };
  }
};
export const clearFavoritesAPI = async () => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}store/favorites/delete-all`, {
      method: 'DELETE',
      headers
    });
    const data = await response.json();
    if (!response.ok || !data.status) {
      Toast.show({ 
        type: 'error', 
        text1: 'Delete Error', 
        text2: data.message || 'Failed to clear favorites' 
      });
      return { success: false };
    }
    Toast.show({ type: 'success', text2: data.message });
    return { success: response.ok && data.status };
  } catch (e: any) { 
    Toast.show({ type: 'error', text1: 'Network Error', text2: e.message });
    return { success: false }; 
  }
};
export const deleteProductApi = async (productId: string) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}store/products/delete/${productId}`, {
      method: 'DELETE',
      headers
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Error invoking deleteProductApi:", error);
    throw error;
  }
};
export const deletePostApi = async (postId: string) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}posts/${postId}/delete`, {
      method: 'DELETE',
      headers
    });
    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Error invoking deletePostApi:", error);
    throw error;
  }
};
export const deleteLectureSchedule = async (lectureId: string): Promise<DeleteLectureResponse> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${baseUrl}users/lecturers/class/lectures/${lectureId}`,
      {
        method: 'DELETE',
        headers,
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
  } catch (error) {
    console.error("Delete Lecture Utility Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown network error',
    };
  }
};
export const deleteCourseMaterial = async (
  courseId: string,
  payload: DeleteMaterialPayload
): Promise<{ success: boolean; message?: string; error?: string }> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${baseUrl}users/lecturers/class/courses/deleteMaterial/${courseId}`,
      {
        method: 'DELETE', 
        headers,
        body: JSON.stringify(payload),
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
  } catch (error) {
    console.error("Delete Material Utility Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown network error occurred',
    };
  }
};
export const deleteCourseContent = async (
  courseId: string,
  index: number
): Promise<{ success: boolean; data?: any; error?: string }> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}users/lecturers/class/courses/deleteCourseContent/${courseId}`, {
      method: 'DELETE', 
      headers,
      body: JSON.stringify({ index }),
    });
    const result = await response.json();
    if (!response.ok) return { success: false, error: result.message || 'Failed to delete topic.' };
    return { success: true, data: result.updatedContents };
  } catch (error: any) {
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