import AsyncStorage from '@react-native-async-storage/async-storage';
import { CommonActions } from '@react-navigation/native';
import {baseUrl} from '../components/HomeScreenComponents'
import {saveTokenToDatabase} from '../api/localPostApis';
import '@react-native-firebase/messaging'; // ensures it initializes
import { PermissionsAndroid, Platform } from 'react-native';
import {
  AuthorizationStatus,
  deleteToken,
  getMessaging,
  getToken,
  onTokenRefresh,
  requestPermission,
} from '@react-native-firebase/messaging';
import { clearSession } from './session';
import { navigationRef } from '../context/navigationContext';

let customNavigationRef: any = null;
let unsubscribeTokenRefresh: (() => void) | null = null;

/** The device's current push token, or null when it can't be read. */
export const getCurrentPushToken = async () => {
  try {
    return (await getToken(getMessaging())) || null;
  } catch {
    return null;
  }
};

/**
 * Detaches this device from the signed-out account's pushes. Stops the
 * token-refresh listener (it would keep re-saving the token under the old
 * uid) and deletes the token, so the old account's stored token goes dead
 * and the next login on this phone registers a fresh one.
 */
export const teardownPushNotifications = async () => {
  unsubscribeTokenRefresh?.();
  unsubscribeTokenRefresh = null;
  try {
    await deleteToken(getMessaging());
  } catch (error) {
    console.warn('Could not delete FCM token on logout:', error);
  }
};

const handleLogout = async () => {
  await teardownPushNotifications();
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
const FCM_SAVE_RETRY_DELAYS_MS = [5000, 20000, 60000];

/** Saves the token, retrying with backoff (a cold server often times out). */
const saveTokenWithRetry = async (uid: string, fcmToken: string) => {
  for (let attempt = 0; attempt <= FCM_SAVE_RETRY_DELAYS_MS.length; attempt++) {
    const result = await saveTokenToDatabase(uid, fcmToken);
    if (result.success) return true;
    const delay = FCM_SAVE_RETRY_DELAYS_MS[attempt];
    if (delay === undefined) break;
    await new Promise<void>(resolve => setTimeout(() => resolve(), delay));
  }
  console.warn('FCM token could not be saved; push notifications may not arrive.');
  return false;
};

/**
 * Asks once for permission to show notifications. Android 13+ needs the
 * POST_NOTIFICATIONS runtime grant; iOS shows nothing without requestPermission.
 * Returns false when the user said no (the token is still registered so pushes
 * start working if they enable notifications later in Settings).
 */
const ensureNotificationPermission = async (messagingInstance: ReturnType<typeof getMessaging>) => {
  try {
    if (Platform.OS === 'android') {
      if (Number(Platform.Version) < 33) return true;
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      );
      return result === PermissionsAndroid.RESULTS.GRANTED;
    }
    const status = await requestPermission(messagingInstance, {
      alert: true,
      sound: true,
      badge: true,
    });
    return (
      status === AuthorizationStatus.AUTHORIZED ||
      status === AuthorizationStatus.PROVISIONAL
    );
  } catch (error) {
    console.warn('Notification permission request failed:', error);
    return false;
  }
};

export async function requestUserPermissionAndGetToken(uid: string) {
  try {
    const messagingInstance = getMessaging();
    const allowed = await ensureNotificationPermission(messagingInstance);
    if (!allowed) console.log('Notifications are turned off for iCampus.');
    const fcmToken = await getToken(messagingInstance);
    if (fcmToken) {
      await saveTokenWithRetry(uid, fcmToken);
    }
    // Firebase rotates tokens; without this the server keeps a dead one and
    // pushes (lecture reminders included) silently stop arriving.
    unsubscribeTokenRefresh?.();
    unsubscribeTokenRefresh = onTokenRefresh(messagingInstance, newToken => {
      saveTokenWithRetry(uid, newToken).catch(() => {});
    });
  } catch (error) {
    console.error("Error getting FCM token:", error);
  }
}