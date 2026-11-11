import { useColorScheme } from 'react-native';
import { useDispatch } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { useAppSelector } from './hooks';
import { updateThemeState } from '../context/UserSlice';
import { updateUserThemePreference } from '../api/localPutApis';

/** Light/dark switch shared by Settings and its desktop side panel. */
export const useThemeToggle = () => {
  const user = useAppSelector(state => state.user) || ({} as any);
  const dispatch = useDispatch();
  const deviceColorScheme = useColorScheme();
  const isDark =
    user.theme === 'dark' ||
    (user.theme === 'system' && deviceColorScheme === 'dark');

  const writeStoredTheme = async (theme: string) => {
    const storedUser = await AsyncStorage.getItem('user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      parsedUser.theme = theme;
      await AsyncStorage.setItem('user', JSON.stringify(parsedUser));
    }
  };

  const toggleTheme = async () => {
    const previousTheme = user.theme;
    const newTheme = isDark ? 'light' : 'dark';
    dispatch(updateThemeState(newTheme));
    try {
      await writeStoredTheme(newTheme);
      const result = await updateUserThemePreference(newTheme);
      if (!result.success) throw new Error(result.error || 'Failed to sync');
    } catch (error) {
      console.error('Theme sync error, rolling back:', error);
      dispatch(updateThemeState(previousTheme));
      await writeStoredTheme(previousTheme).catch(() => {});
      Toast.show({
        type: 'error',
        text1: 'Sync Connection Loss',
        text2: 'Theme could not be saved to your account cloud.',
      });
    }
  };

  return { isDark, theme: user.theme, toggleTheme };
};
