import { baseUrl } from '@components/HomeScreenComponents';
import Toast from 'react-native-toast-message';
import {ThemeType} from '../types/firebase';
import {getAuthHeaders} from '../utils/userTokenAuth';

interface UpdateITagResponse {
  success: boolean;
  message?: string;
  data?: any;
}
export const updatePassword = async (newPassword: string) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}users/password/update`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ newPassword }),
    });
    const result = await response.json();
    if (!result.ok) {
      return { success: false, message: result.message };
    }
    return { success: response.ok, message: result.message };
  } catch (error) {
    return { success: false, message: "Update failed. Try again." };
  }
};
export const customizeItag = async (
  updatePayload: Record<string, any>
): Promise<UpdateITagResponse> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}users/update-itag`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        updates: updatePayload
      }),
    });
    const result = await response.json();
    if (!response.ok) {
      Toast.show({
        type: 'error',
        text1: 'Update Failed',
        text2: result.message || 'Failed to update iTag configurations',
      });
      return { success: false, message: result.message };
    }

    return { success: true, data: result.data };
  } catch (error: any) {
    console.error("Update iTag Utility Error:", error);
    Toast.show({
      type: 'error',
      text1: 'Network Error',
      text2: 'Could not connect to the system configurations server.',
    });
    return { success: false, message: error.message };
  }
};
export const updateCourseContent = async (
  courseId: string,
  index: number,
  updatedTopic: string
): Promise<{ success: boolean; data?: any; error?: string }> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}users/lecturers/class/courses/editCourseContent/${courseId}`, {
      method: 'PUT', 
      headers,
      body: JSON.stringify({ index, updatedTopic }),
    });
    const result = await response.json();
    if (!response.ok) return { success: false, error: result.message || 'Failed to edit topic.' };
    return { success: true, data: result.updatedContents };
  } catch (error: any) {
    return { success: false, error: error.message || 'Network error occurred' };
  }
};
export const updateUserThemePreference = async (
  theme: ThemeType
): Promise<{ success: boolean; data?: any; error?: string }> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}users/preferences/toggleTheme`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ theme }),
    });
    const result = await response.json();
    if (!response.ok) {
      return { 
        success: false, 
        error: result.message || 'Failed to synchronize theme state with the server.' 
      };
    }
    return { 
      success: true, 
      data: result 
    };
  } catch (error: any) {
    return { 
      success: false, 
      error: error.message || 'A network error occurred while updating theme profiles.' 
    };
  }
};
export const updateLectureDetails = async (
  payload: any
): Promise<{ success: boolean; data?: any; error?: string }> => {
  try {
    const {courseId, lectureId} = payload;
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${baseUrl}users/lecturers/class/courses/${courseId}/lectures/${lectureId}/edit`,
      {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          payload
        }),
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
    return { 
      success: false, 
      error: error.message || 'Network error occurred' 
    };
  }
};