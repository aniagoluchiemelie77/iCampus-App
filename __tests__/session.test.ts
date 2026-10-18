import { normalizeIdentifier, passwordAttempts } from '../src/utils/loginInput';

// ---- in-memory AsyncStorage (v3 API) -------------------------------------
const store: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (k: string) => (k in store ? store[k] : null)),
    setItem: jest.fn(async (k: string, v: string) => { store[k] = v; }),
    removeItem: jest.fn(async (k: string) => { delete store[k]; }),
    getMany: jest.fn(async (keys: string[]) =>
      Object.fromEntries(keys.map(k => [k, k in store ? store[k] : null]))),
    setMany: jest.fn(async (entries: Record<string, string>) => { Object.assign(store, entries); }),
    removeMany: jest.fn(async (keys: string[]) => { keys.forEach(k => delete store[k]); }),
    clear: jest.fn(async () => { Object.keys(store).forEach(k => delete store[k]); }),
  },
}));
jest.mock('@react-navigation/native', () => ({
  CommonActions: { reset: (payload: any) => ({ type: 'RESET', payload }) },
}));
jest.mock('../src/components/HomeScreenComponents', () => ({ baseUrl: 'https://api.test/' }));
jest.mock('../src/api/localPostApis', () => ({ saveTokenToDatabase: jest.fn() }));
jest.mock('@react-native-firebase/messaging', () => ({ getMessaging: jest.fn(), getToken: jest.fn() }));
const mockDispatch = jest.fn();
jest.mock('../src/context/navigationContext', () => ({
  navigationRef: { isReady: () => true, dispatch: (...a: any[]) => mockDispatch(...a) },
}));

const { fetchWithAuth } = require('../src/utils/userTokenAuth');

const json = (status: number, body: any = {}) =>
  ({ status, ok: status >= 200 && status < 300, json: async () => body }) as any;

const resetStore = () => {
  Object.keys(store).forEach(k => delete store[k]);
  Object.assign(store, {
    accessToken: 'old-access',
    refreshToken: 'refresh-1',
    user: JSON.stringify({ uid: 'u1' }),
    sessionType: 'user',
    hasLaunched: 'true',
  });
};

describe('login input', () => {
  it('trims the email', () => {
    expect(normalizeIdentifier('  ada@uni.edu \n')).toBe('ada@uni.edu');
  });
  it('tries the trimmed password first, then the exact one', () => {
    expect(passwordAttempts('secret ')).toEqual(['secret', 'secret ']);
    expect(passwordAttempts('secret')).toEqual(['secret']);
    expect(passwordAttempts('   ')).toEqual([]);
  });
});

describe('fetchWithAuth session handling', () => {
  beforeEach(() => {
    resetStore();
    mockDispatch.mockClear();
  });

  it('parallel 401s share ONE refresh and all retry with the new token', async () => {
    let refreshCalls = 0;
    (global as any).fetch = jest.fn(async (url: string, opts: any) => {
      if (url.endsWith('users/refresh-token')) {
        refreshCalls++;
        await new Promise(r => setTimeout(r, 10));
        return json(200, { accessToken: 'new-access', refreshToken: 'refresh-2' });
      }
      return opts.headers.Authorization === 'Bearer new-access' ? json(200, { ok: 1 }) : json(401);
    });
    const results = await Promise.all([
      fetchWithAuth('https://api.test/a'),
      fetchWithAuth('https://api.test/b'),
      fetchWithAuth('https://api.test/c'),
    ]);
    expect(refreshCalls).toBe(1);
    expect(results.map((r: any) => r.status)).toEqual([200, 200, 200]);
    // Sliding session: the rotated refresh token is persisted.
    expect(store.accessToken).toBe('new-access');
    expect(store.refreshToken).toBe('refresh-2');
  });

  it('a network failure during refresh does NOT log the user out', async () => {
    (global as any).fetch = jest.fn(async (url: string) => {
      if (url.endsWith('users/refresh-token')) throw new TypeError('Network request failed');
      return json(401);
    });
    await expect(fetchWithAuth('https://api.test/a')).rejects.toThrow('Could not reach the server');
    expect(store.refreshToken).toBe('refresh-1');
    expect(store.user).toBeDefined();
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('a server error (500) during refresh does NOT log the user out', async () => {
    (global as any).fetch = jest.fn(async (url: string) =>
      url.endsWith('users/refresh-token') ? json(500) : json(401));
    await expect(fetchWithAuth('https://api.test/a')).rejects.toThrow();
    expect(store.refreshToken).toBe('refresh-1');
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('a rejected refresh token logs out, clearing only session keys', async () => {
    (global as any).fetch = jest.fn(async (url: string) =>
      url.endsWith('users/refresh-token') ? json(403) : json(401));
    await expect(fetchWithAuth('https://api.test/a')).rejects.toThrow('Session expired');
    expect(store.accessToken).toBeUndefined();
    expect(store.refreshToken).toBeUndefined();
    expect(store.user).toBeUndefined();
    expect(store.hasLaunched).toBe('true'); // no onboarding again
    expect(mockDispatch).toHaveBeenCalledTimes(1);
    expect(mockDispatch.mock.calls[0][0].payload.routes[0].name).toBe('Login');
  });
});
