import AsyncStorage from '@react-native-async-storage/async-storage';

// Everything that makes up a signed-in session. Logging out removes only
// these, so app-level flags like `hasLaunched` survive (wiping all storage
// sent returning users back through onboarding).
const SESSION_KEYS = ['accessToken', 'refreshToken', 'user', 'sessionType'];

export type SessionType = 'user' | 'admin';

export const saveSession = async ({
  accessToken,
  refreshToken,
  user,
  sessionType,
}: {
  accessToken: string;
  refreshToken?: string | null;
  user: any;
  sessionType: SessionType;
}) => {
  await AsyncStorage.setMany({
    accessToken,
    user: JSON.stringify(user),
    sessionType,
    ...(refreshToken ? { refreshToken } : {}),
  });
};

export const clearSession = () => AsyncStorage.removeMany(SESSION_KEYS);
