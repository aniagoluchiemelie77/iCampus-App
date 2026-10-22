import AsyncStorage from '@react-native-async-storage/async-storage';
import { CommonActions } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { setUser } from '../context/UserSlice';
import { requestUserPermissionAndGetToken } from './userTokenAuth';

/** Error toast for the signup flows (replaces the old SweetAlert modal). */
export const signupError = (message?: string, title = "Couldn't continue") =>
  Toast.show({
    type: 'error',
    text1: title,
    text2: message || 'Please try again.',
    visibilityTime: 4500,
  });

/** Translates a register response into a toast, true on success. */
export const describeSignupFailure = (response: any) => {
  if (response?.status === 409) {
    signupError(response.message || 'An account with these details already exists.', 'Account exists');
  } else if (response?.status === 401) {
    signupError(response.message, 'Verification expired');
  } else {
    signupError(response?.message || 'Account creation failed.');
  }
};

/**
 * Finishes a successful registration: persists the session, registers this
 * device for push notifications, and replaces the whole signup stack with
 * Home (navigate() used to leave Back pointing at the signup steps).
 */
export const completeSignup = async (
  response: { accessToken: string; refreshToken: string; user: any },
  dispatch: (action: any) => void,
  navigation: any,
  welcome = 'Your account is ready.',
) => {
  const { accessToken, refreshToken, user } = response;
  await Promise.all([
    AsyncStorage.setItem('hasLaunched', 'true'),
    AsyncStorage.setItem('accessToken', accessToken),
    AsyncStorage.setItem('refreshToken', refreshToken),
    AsyncStorage.setItem('user', JSON.stringify(user)),
  ]);
  dispatch(setUser({ ...user, accessToken, tokenCreatedAt: Date.now().toString() }));
  // Push token: bootstrap only did this on app start, so new accounts got no
  // notifications until the next launch.
  requestUserPermissionAndGetToken(user.uid).catch(() => {});
  Toast.show({
    type: 'success',
    text1: `Welcome to iCampus${user?.firstname ? `, ${user.firstname}` : ''}!`,
    text2: welcome,
  });
  navigation.dispatch(
    CommonActions.reset({ index: 0, routes: [{ name: 'Home', params: { activeTab: 'home' } }] }),
  );
};

/** Upload errors used to be unhandled promise rejections. */
export const safeUpload = async <T,>(fn: () => Promise<T>): Promise<T | null> => {
  try {
    return await fn();
  } catch (error) {
    console.error('Upload failed:', error);
    signupError('Check your connection and try again.', 'Photo upload failed');
    return null;
  }
};
