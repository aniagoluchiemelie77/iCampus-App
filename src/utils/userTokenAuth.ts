import AsyncStorage from '@react-native-async-storage/async-storage';
import { CommonActions } from '@react-navigation/native';
import {baseUrl} from '../components/HomeScreenComponents'
import {saveTokenToDatabase} from '../api/localPostApis';
import '@react-native-firebase/messaging'; // ensures it initializes
import { getMessaging, getToken } from '@react-native-firebase/messaging';
import { clearSession } from './session';
import { navigationRef } from '../context/navigationContext';

let customNavigationRef: any = null;
const handleLogout = async () => {
  await clearSession();
  // Fall back to the app-wide container ref (setNavigationRef is optional).
  const ref = customNavigationRef || navigationRef;
  if (ref?.isReady?.() ?? !!ref) {
    ref.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      })
    );
  }
};
export const setNavigationRef = (ref: any) => {
  customNavigationRef = ref;
};

class SessionRejectedError extends Error {}

// One refresh at a time: when several requests hit 401 together they all
// wait on the same refresh instead of racing each other.
let refreshInFlight: Promise<string> | null = null;

/**
 * Gets a new access token. Throws SessionRejectedError only when the server
 * explicitly rejects the refresh token; network trouble throws a plain Error
 * so a flaky connection never signs the user out.
 */
export const refreshSessionToken = (): Promise<string> => {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      if (!refreshToken) throw new SessionRejectedError('No refresh token');

      const refreshResponse = await fetch(`${baseUrl}users/refresh-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (refreshResponse.status === 401 || refreshResponse.status === 403) {
        throw new SessionRejectedError('Refresh token rejected');
      }
      const refreshData = await refreshResponse.json().catch(() => ({}));
      if (!refreshResponse.ok || !refreshData.accessToken) {
        throw new Error(`Refresh failed (${refreshResponse.status})`);
      }
      // The server renews the refresh token periodically (sliding session).
      await AsyncStorage.setMany({
        accessToken: refreshData.accessToken,
        ...(refreshData.refreshToken
          ? { refreshToken: refreshData.refreshToken }
          : {}),
      });
      return refreshData.accessToken as string;
    })().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
};

export const isSessionRejected = (error: unknown) =>
  error instanceof SessionRejectedError;

export const fetchWithAuth = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const accessToken = await AsyncStorage.getItem('accessToken');
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };
  let response = await fetch(url, { ...options, headers });
  if (response.status === 401) {
    let newAccessToken: string;
    try {
      newAccessToken = await refreshSessionToken();
    } catch (refreshError) {
      if (isSessionRejected(refreshError)) {
        await handleLogout();
        throw new Error('Session expired. Please log in again.');
      }
      // Offline or server hiccup: keep the session; this request just fails.
      throw new Error('Could not reach the server. Please try again.');
    }
    response = await fetch(url, {
      ...options,
      headers: { ...headers, Authorization: `Bearer ${newAccessToken}` },
    });
  }
  return response;
};
export async function requestUserPermissionAndGetToken(uid: string) {
  try {
    const messagingInstance = getMessaging();
    const fcmToken = await getToken(messagingInstance);
    if (fcmToken) {
      await saveTokenToDatabase(uid, fcmToken);
    }
  } catch (error) {
    console.error("Error getting FCM token:", error);
  }
}