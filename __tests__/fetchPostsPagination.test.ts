const mockFetchWithAuth = jest.fn();

jest.mock('../src/components/HomeScreenComponents', () => ({
  baseUrl: 'https://example.test/',
}));
jest.mock('../src/utils/userTokenAuth', () => ({
  fetchWithAuth: (...args: any[]) => mockFetchWithAuth(...args),
}));
jest.mock('../src/hooks/useSQLiteDb', () => ({ db: {} }));
jest.mock('react-native-toast-message', () => ({ show: jest.fn() }));
jest.mock('../src/utils/DeviceNetworkStrengthDetector', () => ({
  getAdaptiveTimeout: jest.fn(),
}));
jest.mock('@react-native-async-storage/async-storage', () => ({}));

import { fetchPostsAPI } from '../src/api/localGetApis';

describe('fetchPostsAPI pagination', () => {
  beforeEach(() => {
    mockFetchWithAuth.mockReset();
  });

  it('encodes opaque cursors when requesting the next page', async () => {
    mockFetchWithAuth.mockResolvedValue({
      ok: true,
      json: async () => ({ posts: [], nextCursor: null }),
    });

    await fetchPostsAPI({ limit: 10, cursor: 'post+id/with?symbols=' });

    expect(mockFetchWithAuth).toHaveBeenCalledWith(
      'https://example.test/posts/fetchPosts?limit=10&cursor=post%2Bid%2Fwith%3Fsymbols%3D',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('preserves an API-level failure in a successful HTTP response', async () => {
    mockFetchWithAuth.mockResolvedValue({
      ok: true,
      json: async () => ({ success: false, message: 'Invalid cursor' }),
    });

    await expect(fetchPostsAPI({ cursor: 'bad-cursor' })).resolves.toEqual({
      success: false,
      message: 'Invalid cursor',
    });
  });
});
