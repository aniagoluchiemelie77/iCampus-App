import AsyncStorage from '@react-native-async-storage/async-storage';
import { CommonActions } from '@react-navigation/native';
import {baseUrl} from '../components/HomeScreenComponents'

let navigationRef: any = null;
const handleLogout = async () => {
  await AsyncStorage.clear();
  if (navigationRef) {
    navigationRef.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      })
    );
  }
};
export const setNavigationRef = (ref: any) => {
  navigationRef = ref;
};
export const fetchWithAuth = async (url: string, options: RequestInit = {}): Promise<Response> => {
  let accessToken = await AsyncStorage.getItem('accessToken');
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };
  let response = await fetch(url, { ...options, headers });
  if (response.status === 401) {
    const refreshToken = await AsyncStorage.getItem('refreshToken');

    if (!refreshToken) {
      await handleLogout();
      throw new Error("Session expired. Please log in again.");
    }

    try {
      const refreshResponse = await fetch(`${baseUrl}users/refresh-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      const refreshData = await refreshResponse.json();

      if (!refreshResponse.ok || !refreshData.accessToken) {
        throw new Error("Refresh token failed");
      }
      accessToken = refreshData.accessToken;
      await AsyncStorage.setItem('accessToken', accessToken!);
      const retryHeaders = {
        ...headers,
        Authorization: `Bearer ${accessToken}`,
      };
      response = await fetch(url, { ...options, headers: retryHeaders });
    } catch (refreshError) {
      await handleLogout();
      throw new Error("Session expired. Please log in again.");
    }
  }
  return response;
};