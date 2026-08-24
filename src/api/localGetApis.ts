import { User, CreateTestPayload, DropOffStation, Notification, Book, Lecture, Course, CourseException, AdItem} from '../types/firebase';
import { baseUrl } from '../components/HomeScreenComponents';
import Toast from 'react-native-toast-message';
import {getAuthHeaders} from '../utils/userTokenAuth';
import { TAB_TO_CATEGORY, TabName } from '../constants/inAppConstants.ts';
import {getAdaptiveTimeout} from '../utils/DeviceNetworkStrengthDetector.ts';

interface ApiRequestOptions {
  signal?: AbortSignal;
}
interface CheckITagResponse {
  success: boolean;
  available: boolean;
  message?: string;
}
interface OngoingLectureResponse {
  success: boolean;
  ongoing: boolean;
  lecture: Lecture | null;
}
interface SearchBooksResponse {
  success: boolean;
  books: Book[]; 
}
interface GetCourseResponse {
  success: boolean;
  data?: Course;
  error?: string;
}
interface GetExceptionsResponse {
  success: boolean;
  data?: CourseException[];
  error?: string;
}
interface FetchCourseResponse {
  success: boolean;
  course?: Course;
  message?: string;
}
interface FetchSupportedBanksParams extends ApiRequestOptions {
  countryCode: string;
}
interface GetTimelineResponse {
  success: boolean;
  data?: Lecture[];
  message?: string;
}
interface CheckAssessmentStatusResponse {
  success: boolean;
  hasSubmitted?: boolean;
  test?: CreateTestPayload | null;
  message?: string;
}
interface GetCourseDetailsParams extends ApiRequestOptions {
  courseId: string;
}
interface FetchPostsParams extends ApiRequestOptions {
  limit?: number;
  cursor?: string;
}
interface SearchUserProfileParams extends ApiRequestOptions {
  identifier: string;
  currentUser: User;
}
interface FetchLecturerCoursesParams extends FetchStudentCoursesParams, ApiRequestOptions {}
interface GetCourseDetailsOngoingParams extends ApiRequestOptions {
  courseId: string;
}
interface GetAssessmentsResponse {
  success: boolean;
  data?: CreateTestPayload[]; 
  error?: string;
}
interface SearchCoursesResponse {
  success: boolean;
  courses?: any[]; 
  error?: string;
}
interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
}
interface AdminFetchUserNotificationsParams extends ApiRequestOptions {
  userId: string;
  limit?: number;
}
interface GetTransactionByIdParams extends ApiRequestOptions {
  transactionId: string;
}
interface FetchAllLecturesParams extends ApiRequestOptions {
  courseId: string;
}
interface TransactionStatsParams extends ApiRequestOptions {
  month?: number;
  year?: number;
}
interface GetNotificationsParams extends ApiRequestOptions {
  tabName: TabName;
  page?: number;
  limit?: number;
}
interface SearchUserParams {
  q?: string;
  uid?: string;
  viewerTier: string;
  viewerRole: string;
}
interface FetchMyCoursesParams extends FetchStudentCoursesParams, ApiRequestOptions {}
interface FetchFeaturedBooksParams extends ApiRequestOptions {
  department: string;
}
interface FetchSupportTicketParams extends ApiRequestOptions {
  ticketRefId: string;
}
interface AdminFetchUserDetailsParams extends ApiRequestOptions {
  userId: string;
}
interface GetCourseExceptionsParams extends ApiRequestOptions {
  courseId: string;
}
interface GetBlockedUsersParams extends ApiRequestOptions {
  userId: string;
}
interface GetCourseAssessmentsParams extends ApiRequestOptions {
  courseId: string;
}
interface FetchTicketsParams extends ApiRequestOptions {
  limit?: number;
  cursor?: string;
}
interface GetTransactionsParams extends ApiRequestOptions {
  page: number;
  limit: number;
  searchQuery?: string;
}
interface GetLectureExceptionsParams extends ApiRequestOptions {
  lectureId: string;
}
interface FetchStudentCoursesParams {
  semester?: string;
  session?: string;
  page?: number; 
  limit?: number
}

export const searchUserProfile = async ({
  identifier,
  currentUser,
  signal,
}: SearchUserProfileParams): Promise<any> => {
  try {
    const params = new URLSearchParams({
      viewerUid: currentUser.uid,
      viewerTier: currentUser.tier || 'free',
      viewerRole: currentUser.usertype || '',
      viewerFirstname: currentUser.firstname || '',
    });
    
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${baseUrl}users/profile/search/${identifier}?${params.toString()}`,
      {
        method: 'GET',
        headers,
        signal,
      }
    );
    
    const result = await response.json();
    if (!response.ok) {
      Toast.show({
        type: 'error',
        text1: 'Fetch Error',
        text2: result.message || 'An unexpected error occurred',
      });
      return null;
    }
    return result.data;
  } catch (error: any) {
    if (error.name === 'AbortError') return null;

    console.error('Search User Profile Error:', error);
    Toast.show({
      type: 'error',
      text1: 'Connection Error',
      text2: 'Could not connect to the server',
    });
    return null;
  }
};
export const fetchSupportedBanks = async ({
  countryCode,
  signal,
}: FetchSupportedBanksParams): Promise<{ label: string; value: string }[]> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}users/payments/banks/${countryCode}`, {
      method: 'GET',
      headers,
      signal,
    });

    const json = await response.json();

    if (json.status === 'success' && Array.isArray(json.data)) {
      return json.data.map((bank: any) => ({
        label: bank.name,
        value: bank.code,
      }));
    }

    return [];
  } catch (err: any) {
    if (err.name === 'AbortError') return [];
    
    console.error('Bank fetch failed:', err);
    return [];
  }
};
export const getUserPaymentMethods = async (userId: string): Promise<any[]> => {
  if (!userId) return [];

  const TIMEOUT_MS = await getAdaptiveTimeout();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const headers = await getAuthHeaders();
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const url = `${cleanBaseUrl}/user/payment-methods/${userId}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const result = await response.json();

    if (!response.ok) {
      Toast.show({
        type: 'error',
        text1: 'Fetch Error',
        text2: result.message || 'Failed to fetch payment methods',
      });
      return [];
    }

    const methods = Array.isArray(result) ? result : result.data;
    return Array.isArray(methods) ? methods : [];
  } catch (error: any) {
    clearTimeout(timeoutId);
    console.error('PaymentMethodService Error:', error);
    return [];
  }
};
export const getBlockedUsers = async ({
  userId,
  signal,
}: GetBlockedUsersParams): Promise<any[]> => {
  if (!userId) return [];
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}users/blocked-list/${userId}`, {
      method: 'GET',
      headers,
      signal,
    });
    
    const result = await response.json();
    if (!response.ok) {
      Toast.show({
        type: 'error',
        text1: 'Fetch Error',
        text2: result.message || 'Failed to fetch blocked users',
      });
      return [];
    }
    const list = Array.isArray(result) ? result : result.blockedUsers || result.data;
    return Array.isArray(list) ? list : [];
  } catch (error: any) {
    if (error.name === 'AbortError') return [];

    console.error('BlockedUsersService Error:', error);
    Toast.show({
      type: 'error',
      text1: 'Connection Error',
      text2: 'Could not connect to the server',
    });
    return [];
  }
};
export const searchUsers = async ({
  q,
  uid,
  viewerTier,
  viewerRole,
  signal,
}: SearchUserParams & { signal?: AbortSignal }): Promise<any> => {
  if (!uid && (!q || q.length < 2)) return null;

  const TIMEOUT_MS = await getAdaptiveTimeout();
  const controller = new AbortController();

  if (signal) {
    signal.addEventListener('abort', () => controller.abort());
  }
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const queryParams = new URLSearchParams({
      viewerTier: viewerTier || '',
      viewerRole: viewerRole || '',
    });
    
    if (uid) queryParams.append('uid', uid);
    if (q) queryParams.append('q', q);

    const headers = await getAuthHeaders();
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

    const response = await fetch(
      `${cleanBaseUrl}/users/search?${queryParams.toString()}`,
      {
        method: 'GET',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);
    const result = await response.json();

    if (!response.ok || !result.success) {
      Toast.show({
        type: 'error',
        text1: 'Search Error',
        text2: result?.message || 'Search execution failed',
      });
      return null;
    }
    return result.data;
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      return null;
    }

    console.error("Search API Error:", error);
    return null;
  }
};
export const searchUsersByUid = async (
  uid: string,
  viewerTier: string,
  viewerRole: string,
  signal?: AbortSignal
): Promise<any[]> => {
  if (!uid) return [];

  const TIMEOUT_MS = await getAdaptiveTimeout();
  const controller = new AbortController();

  if (signal) {
    signal.addEventListener('abort', () => controller.abort());
  }
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const headers = await getAuthHeaders();
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

    const response = await fetch(
      `${cleanBaseUrl}/users/search?q=${encodeURIComponent(uid)}&viewerTier=${encodeURIComponent(viewerTier)}&viewerRole=${encodeURIComponent(viewerRole)}`,
      {
        method: 'GET',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);
    const result = await response.json();

    if (!response.ok || !result.success) {
      Toast.show({
        type: 'error',
        text1: 'Fetch Error',
        text2: result?.message || 'Search failed',
      });
      return [];
    }
    return Array.isArray(result.data) ? result.data : [result.data].filter(Boolean);
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      return [];
    }

    console.error("Search By UID API Error:", error);
    return [];
  }
};
export const signupFetchInstitutions = async (country: string) => {
  const TIMEOUT_MS = await getAdaptiveTimeout();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(
      `${baseUrl}users/institutions?country=${encodeURIComponent(country)}`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);
    const data = await response.json();

    if (response.ok) {
      const formatted = (data.institutions || []).map((i: any) => ({
        label: i.name,
        value: i.name,
      }));
      
      return {
        success: true,
        data: formatted,
        originalData: data,
        message: 'Institutions loaded successfully',
      };
    }

    return {
      success: false,
      message: data?.message || 'Failed to fetch institutions',
    };
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      return { success: false, aborted: true, message: 'Request timed out loading institutions.' };
    }

    return { 
      success: false, 
      message: 'Network error while fetching institutions' 
    };
  }
};
export const fetchProductsAPI = async (
  { 
    q = '', 
    category = 'all', 
    cursor = '', 
    limit = 10 
  },
  maxRetries = 3
) => {
  let attempt = 0;
  const TIMEOUT_MS = await getAdaptiveTimeout();

  while (attempt < maxRetries) {
    attempt++;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
      const categoryParam = category === 'all' ? '' : encodeURIComponent(category);
      const queryParam = encodeURIComponent(q);
      const cursorParam = encodeURIComponent(cursor);
      
      const url = `${cleanBaseUrl}/store/get-store-products?q=${queryParam}&category=${categoryParam}&cursor=${cursorParam}&limit=${limit}`;
      const headers = await getAuthHeaders();
      
      const response = await fetch(url, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const result = await response.json();

      if (!response.ok) {
        if (response.status >= 400 && response.status < 500) {
          return {
            success: false,
            message: result.message || 'Failed to fetch store items',
          };
        }
        throw new Error(result.message || `Server error: ${response.status}`);
      }

      return {
        success: true,
        data: result.products || [],
        nextCursor: result.nextCursor || null,
      };

    } catch (error: any) {
      clearTimeout(timeoutId);

      const isTimeout = error.name === 'AbortError';
      const errorMessage = isTimeout 
        ? 'Products fetch request timed out.' 
        : (error.message || 'Network error.');

      if (attempt >= maxRetries) {
        console.error("fetchProductsAPI Error after retries:", errorMessage);
        return { success: false, data: [], message: errorMessage };
      }

      const backoffDelay = Math.pow(2, attempt - 1) * 1000;
      console.warn(`Fetch products attempt ${attempt} failed (${errorMessage}). Retrying in ${backoffDelay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, backoffDelay));
    }
  }

  return { success: false, data: [], message: 'Network error occurred.' };
};
export const fetchAllProductsAPI = async (forceRefresh = false) => {
  const CACHE_KEY = "local_catalog_cache";
  if (!forceRefresh) {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) return { success: true, data: JSON.parse(cached), source: "local" };
  }

  try {
    const response = await fetch(`${baseUrl}store/fetch-all-products`, {
      method: 'GET',
      headers: await getAuthHeaders(),
    });

    const result = await response.json();
    
    if (!response.ok) throw new Error(result.message || 'Sync failed');
    localStorage.setItem(CACHE_KEY, JSON.stringify(result.products));

    return { success: true, data: result.products };
  } catch (error) {
    console.error("fetchAllProductsAPI Error:", error);
    const fallback = localStorage.getItem(CACHE_KEY);
    return { 
      success: false, 
      data: fallback ? JSON.parse(fallback) : [], 
      message: 'Network error. Using offline mode.' 
    };
  }
};
export const fetchPendingOrdersAPI = async (maxRetries = 3) => {
  let attempt = 0;
  const TIMEOUT_MS = await getAdaptiveTimeout();
  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

  while (attempt < maxRetries) {
    attempt++;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const url = `${cleanBaseUrl}/store/orders/pending`;
      const headers = await getAuthHeaders();
      const response = await fetch(url, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const result = await response.json();

      if (!response.ok || result.success === false) {
        if (response.status >= 400 && response.status < 500) {
          // Client-side errors shouldn't necessarily trigger retries
          return {
            success: false,
            data: [],
            message: result.message || 'Failed to fetch pending orders',
          };
        }
        throw new Error(result.message || `Server error: ${response.status}`);
      }

      return {
        success: true,
        data: result.data || [],
      };

    } catch (error: any) {
      clearTimeout(timeoutId);

      const isTimeout = error.name === 'AbortError';
      const errorMessage = isTimeout ? 'Request timed out.' : (error.message || 'Network error.');

      if (attempt >= maxRetries) {
        console.error("fetchPendingOrdersAPI Error (Max retries reached):", errorMessage);
        return { 
          success: false, 
          data: [], 
          message: errorMessage 
        };
      }

      const backoffDelay = Math.pow(2, attempt - 1) * 1000;
      console.warn(`Fetch pending orders attempt ${attempt} failed. Retrying in ${backoffDelay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, backoffDelay));
    }
  }

  return { success: false, data: [], message: 'Max retry attempts reached.' };
};
export const fetchSellerSalesAPI = async (maxRetries = 3) => {
  let attempt = 0;
  const TIMEOUT_MS = await getAdaptiveTimeout();
  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

  while (attempt < maxRetries) {
    attempt++;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const url = `${cleanBaseUrl}/store/sales/history`;
      const headers = await getAuthHeaders();
      const response = await fetch(url, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const result = await response.json();

      if (!response.ok || result.success === false) {
        if (response.status >= 400 && response.status < 500) {
          return {
            success: false,
            data: [],
            message: result.message || 'Failed to fetch sales history',
          };
        }
        throw new Error(result.message || `Server error: ${response.status}`);
      }

      return {
        success: true,
        data: result.data || [],
      };

    } catch (error: any) {
      clearTimeout(timeoutId);

      const isTimeout = error.name === 'AbortError';
      const errorMessage = isTimeout ? 'Request timed out.' : (error.message || 'Network error.');

      if (attempt >= maxRetries) {
        console.error("fetchSellerSalesAPI Error (Max retries reached):", errorMessage);
        return { 
          success: false, 
          data: [], 
          message: errorMessage 
        };
      }

      const backoffDelay = Math.pow(2, attempt - 1) * 1000;
      console.warn(`Fetch seller sales attempt ${attempt} failed. Retrying in ${backoffDelay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, backoffDelay));
    }
  }

  return { success: false, data: [], message: 'Max retry attempts reached.' };
};
export const fetchUserReviewsAPI = async (signal?: AbortSignal) => {
  const TIMEOUT_MS = await getAdaptiveTimeout();
  const controller = new AbortController();

  if (signal) {
    signal.addEventListener('abort', () => controller.abort());
  }
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const url = `${cleanBaseUrl}/reviews/fetch-seller-reviews`; 
    const headers = await getAuthHeaders();

    const response = await fetch(url, {
      method: 'GET',
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const result = await response.json();

    if (!response.ok || !result.success) {
      Toast.show({ 
        type: 'error', 
        text1: 'Fetch Error', 
        text2: result?.message || 'Failed to fetch sales reviews' 
      });
      return {
        success: false,
        data: [],
        message: result?.message || 'Failed to fetch sales reviews',
      };
    }

    return {
      success: true,
      data: result.data || [],
      message: result.message
    };
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      Toast.show({ type: 'error', text1: 'Timeout Error', text2: 'Request timed out.' });
      return { success: false, data: [], message: 'Reviews fetch request timed out.' };
    }

    Toast.show({ type: 'error', text1: 'Network Error', text2: 'Network error fetching reviews.' });
    return { success: false, data: [], message: 'Network error fetching reviews' };
  }
};
export const fetchPayoutHistoryAPI = async (maxRetries = 3) => {
  let attempt = 0;
  const TIMEOUT_MS = await getAdaptiveTimeout();
  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

  while (attempt < maxRetries) {
    attempt++;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const url = `${cleanBaseUrl}/store/payouts/fetch-history`; 
      const headers = await getAuthHeaders();
      const response = await fetch(url, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const result = await response.json();

      if (!response.ok || result.success === false) {
        if (response.status >= 400 && response.status < 500) {
          return {
            success: false,
            data: [],
            message: result.message || 'Failed to fetch payout history',
          };
        }
        throw new Error(result.message || `Server error: ${response.status}`);
      }

      return {
        success: true,
        data: result.data || [],
        message: result.message,
      };

    } catch (error: any) {
      clearTimeout(timeoutId);

      const isTimeout = error.name === 'AbortError';
      const errorMessage = isTimeout ? 'Request timed out.' : (error.message || 'Network error.');

      if (attempt >= maxRetries) {
        console.error("fetchPayoutHistoryAPI Error (Max retries reached):", errorMessage);
        return { 
          success: false, 
          data: [], 
          message: errorMessage 
        };
      }

      const backoffDelay = Math.pow(2, attempt - 1) * 1000;
      console.warn(`Fetch payout history attempt ${attempt} failed. Retrying in ${backoffDelay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, backoffDelay));
    }
  }

  return { success: false, data: [], message: 'Max retry attempts reached.' };
};
export const fetchDropOffStationsAPI = async (lat?: number, lng?: number, maxRetries = 3) => {
  let attempt = 0;
  const TIMEOUT_MS = await getAdaptiveTimeout();
  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

  while (attempt < maxRetries) {
    attempt++;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      let url = `${cleanBaseUrl}/store/drop-off-stations/fetch`;
      if (lat !== undefined && lng !== undefined) {
        url += `?lat=${lat}&lng=${lng}`;
      }

      const headers = await getAuthHeaders();
      const response = await fetch(url, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const result = await response.json();

      if (!response.ok || result.success === false) {
        if (response.status >= 400 && response.status < 500) {
          return {
            success: false,
            data: [],
            message: result.message || 'Failed to fetch drop-off stations',
          };
        }
        throw new Error(result.message || `Server error: ${response.status}`);
      }

      return {
        success: true,
        data: (result.data as DropOffStation[]) || [],
        message: result.message,
      };

    } catch (error: any) {
      clearTimeout(timeoutId);

      const isTimeout = error.name === 'AbortError';
      const errorMessage = isTimeout ? 'Request timed out.' : (error.message || 'Network error.');

      if (attempt >= maxRetries) {
        console.error("fetchDropOffStationsAPI Error (Max retries reached):", errorMessage);
        return { 
          success: false, 
          data: [], 
          message: errorMessage 
        };
      }

      const backoffDelay = Math.pow(2, attempt - 1) * 1000;
      console.warn(`Fetch drop-off stations attempt ${attempt} failed. Retrying in ${backoffDelay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, backoffDelay));
    }
  }

  return { success: false, data: [], message: 'Max retry attempts reached.' };
};
export const fetchUserConnections = async (
  options?: ApiRequestOptions
): Promise<{ success: boolean; message?: string; data: any }> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}users/fetch-connections`, {
      method: 'GET',
      headers,
      signal: options?.signal,
    });

    const result = await response.json();
    if (!response.ok) {
      return {
        success: false,
        message: result.message || 'Failed to fetch connections',
        data: [],
      };
    }
    return {
      success: true,
      data: result.data,
    };
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.log('Fetch connections request was cancelled.');
      return { success: false, message: 'Cancelled', data: [] };
    }
    console.error('Fetch Connections Error:', error);
    return {
      success: false,
      message: 'Check network connection.',
      data: [],
    };
  }
};
export const searchUsersByITag = async (
  tag: string,
  options?: ApiRequestOptions
): Promise<any> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${baseUrl}user/iTag/search/${encodeURIComponent(tag)}`,
      {
        method: 'GET',
        headers,
        signal: options?.signal,
      }
    );
    const result = await response.json();
    if (!response.ok) {
      Toast.show({
        type: 'error',
        text1: 'Search Error',
        text2: result.message || 'Failed to locate tag matching criteria.',
      });
      return null;
    }
    return result;
  } catch (error: any) {
    if (error.name === 'AbortError') return null; 
    
    console.error('iTag Search API Error:', error);
    Toast.show({
      type: 'error',
      text1: 'Network Anomaly',
      text2: 'Could not connect to the iCampus routing nodes.',
    });
    return null;
  }
};
export const fetchNotificationDetails = async (
  notificationId: string,
  options?: ApiRequestOptions
): Promise<{ success: boolean; notification: Notification | null }> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}users/notifications/${notificationId}`, {
      method: 'GET',
      headers,
      signal: options?.signal,
    });

    const result = await response.json();
    if (!response.ok) {
      Toast.show({
        type: 'error',
        text1: 'Notification Error',
        text2: result.message || 'Failed to fetch notification details',
      });
      return { success: false, notification: null };
    }

    return {
      success: true,
      notification: result.notification,
    };
  } catch (error: any) {
    if (error.name === 'AbortError') return { success: false, notification: null };

    console.error('Fetch Notification Detail Utility Error:', error);
    Toast.show({
      type: 'error',
      text1: 'Connection Error',
      text2: 'Could not connect to the notification server.',
    });
    return { success: false, notification: null };
  }
};
export const fetchNotificationsByTab = async (
  activeTab: 'all' | 'finance' | 'unread',
  options?: ApiRequestOptions
): Promise<{ success: boolean; notifications: Notification[] }> => {
  try {
    const params = new URLSearchParams();
    if (activeTab === 'finance') {
      params.append('category', 'finance');
    } else if (activeTab === 'unread') {
      params.append('unread', 'true');
    }
    const queryString = params.toString();
    const finalUrl = queryString
      ? `${baseUrl}users/get-notifications?${queryString}`
      : `${baseUrl}users/get-notifications`;
    const headers = await getAuthHeaders();

    const response = await fetch(finalUrl, {
      method: 'GET',
      headers,
      signal: options?.signal,
    });

    const result = await response.json();

    if (!response.ok) {
      Toast.show({
        type: 'error',
        text1: 'Fetch Error',
        text2: result.message || 'Failed to fetch notifications',
      });
      return { success: false, notifications: [] };
    }

    return {
      success: true,
      notifications: result.notifications || [],
    };
  } catch (error: any) {
    if (error.name === 'AbortError') return { success: false, notifications: [] };

    console.error('Fetch Notifications Utility Error:', error);
    Toast.show({
      type: 'error',
      text1: 'Connection Error',
      text2: 'An unexpected error occurred while loading updates.',
    });
    return { success: false, notifications: [] };
  }
};
export const checkITagAvailability = async (
  username: string,
  signal?: AbortSignal
): Promise<CheckITagResponse> => {
  const TIMEOUT_MS = await getAdaptiveTimeout();
  const controller = new AbortController();

  if (signal) {
    signal.addEventListener('abort', () => controller.abort());
  }
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const headers = await getAuthHeaders();
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    
    const response = await fetch(`${cleanBaseUrl}/users/check-itag/${encodeURIComponent(username.trim())}`, {
      method: 'GET',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const result = await response.json();

    if (!response.ok) {
      return { success: false, available: false, message: result?.message || 'Failed to check availability' };
    }

    return { 
      success: true, 
      available: result.available ?? false,
      message: result.message
    };
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      return { success: false, available: false, message: 'Request timed out.' };
    }

    console.error("Check iTag Utility Error:", error);
    return { success: false, available: false, message: error?.message || 'Network error.' };
  }
};
export const fetchOngoingLecture = async (
  options?: ApiRequestOptions
): Promise<OngoingLectureResponse> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}users/lectures/ongoing`, {
      method: 'GET',
      headers,
      signal: options?.signal,
    });
    const result = await response.json();
    if (!response.ok) {
      return { success: false, ongoing: false, lecture: null };
    }
    return {
      success: true,
      ongoing: result.ongoing ?? false,
      lecture: result.lecture || null,
    };
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return { success: false, ongoing: false, lecture: null };
    }
    console.error("Fetch Ongoing Lecture Utility Error:", error);
    return { success: false, ongoing: false, lecture: null };
  }
};
export const fetchFeaturedBooksByDepartment = async ({
  department,
  signal,
}: FetchFeaturedBooksParams): Promise<{ success: boolean; books: Book[] }> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${baseUrl}users/library/featured?department=${encodeURIComponent(department)}`,
      {
        method: 'GET',
        headers,
        signal,
      }
    );

    const data = await response.json();

    if (!response.ok) {
      Toast.show({
        type: 'error',
        text1: 'Library Error',
        text2: data.message || 'Failed to load featured books',
      });
      return { success: false, books: [] };
    }

    const booksArray = Array.isArray(data) ? data : data.books || [];

    return { 
      success: true, 
      books: booksArray 
    };
  } catch (error: any) {
    if (error.name === 'AbortError') return { success: false, books: [] };

    console.error("Fetch Featured Books Utility Error:", error);
    Toast.show({
      type: 'error',
      text1: 'Connection Error',
      text2: 'Could not connect to the library catalog.',
    });
    return { success: false, books: [] };
  }
};
export const searchLibraryBooks = async (
  query: string,
  signal?: AbortSignal
): Promise<SearchBooksResponse> => {
  const TIMEOUT_MS = await getAdaptiveTimeout();
  const controller = new AbortController();

  if (signal) {
    signal.addEventListener('abort', () => controller.abort());
  }
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const headers = await getAuthHeaders();
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

    const response = await fetch(
      `${cleanBaseUrl}/users/library/search?q=${encodeURIComponent(query.trim())}`,
      {
        method: 'GET',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);
    const data = await response.json();

    if (!response.ok || !data.success) {
      return { success: false, books: [] };
    }

    const booksArray = Array.isArray(data) ? data : data.books || [];

    return {
      success: true,
      books: booksArray,
    };
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      console.warn("Search Library Request Timed Out");
      return { success: false, books: [] };
    }

    console.error("Search Library Utility Error:", error);
    return { success: false, books: [] };
  }
};
export const getUserAccountState = async (
  signal?: AbortSignal
): Promise<{ success: boolean; user?: { uid: string; isSuspended: boolean }; error?: string }> => {
  const TIMEOUT_MS = await getAdaptiveTimeout();
  const controller = new AbortController();

  if (signal) {
    signal.addEventListener('abort', () => controller.abort());
  }
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const headers = await getAuthHeaders();
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

    const response = await fetch(`${cleanBaseUrl}/users/check-account-state`, {
      method: 'GET',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const data = await response.json();

    if (!response.ok || !data.success) {
      const errorMsg = data?.message || `Request failed with status ${response.status}`;
      Toast.show({
        type: 'error',
        text1: 'Fetch Error',
        text2: errorMsg,
      });
      return { 
        success: false, 
        error: errorMsg 
      };
    }

    return {
      success: true,
      user: data.user,
    };
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      return { success: false, error: 'Request timed out.' };
    }

    console.error("Get Account State Utility Error:", error);
    Toast.show({
      type: 'error',
      text1: 'Network Error',
      text2: 'An unknown error occurred',
    });
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'An unknown error occurred' 
    };
  }
};
export const getCourseDetailsForOngoingLecture = async ({
  courseId,
  signal,
}: GetCourseDetailsOngoingParams): Promise<GetCourseResponse> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}users/course/ongoing-lecture/${courseId}`, {
      method: 'GET',
      headers,
      signal,
    });
    const data = await response.json();
    if (!response.ok) {
      return { success: false, error: data.message || 'Failed to fetch course details' };
    }
    return { success: true, data };
  } catch (error: any) {
    if (error.name === 'AbortError') return { success: false, error: 'Request cancelled.' };

    console.error("Get Course Details Utility Error:", error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};
export const getAllExceptionsForOngoingLecture = async ({
  lectureId,
  signal,
}: GetLectureExceptionsParams): Promise<GetExceptionsResponse> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}users/exceptions/lectures/${lectureId}`, {
      method: 'GET',
      headers,
      signal,
    });
    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.message || 'Failed to fetch lecture exceptions' };
    }
    const exceptionsArray = Array.isArray(data) ? data : data.exceptions || [];
    return { success: true, data: exceptionsArray };
  } catch (error: any) {
    if (error.name === 'AbortError') return { success: false, error: 'Request cancelled.' };

    console.error("Get Lecture Exceptions Utility Error:", error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};
export const getCourseDetails = async ({
  courseId,
  signal,
}: GetCourseDetailsParams): Promise<FetchCourseResponse> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}users/courses/fetch-course-details/${courseId}`, {
      method: 'GET',
      headers,
      signal,
    });

    const result = await response.json();

    if (!response.ok) {
      return { 
        success: false, 
        message: result.message || 'Failed to refresh course' 
      };
    }

    return {
      success: true,
      course: result.data || result.course,
    };

  } catch (error: any) {
    if (error.name === 'AbortError') return { success: false, message: 'Request cancelled.' };

    console.error('Fetch Course Details Utility Error:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'An unexpected error occurred' 
    };
  }
};
export const getStudentLecturesTimeline = async (
  options?: ApiRequestOptions
): Promise<GetTimelineResponse> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}users/student/class/lectures/timeline`, {
      method: 'GET',
      headers,
      signal: options?.signal,
    });

    const result = await response.json();
    if (!response.ok) {
      return { 
        success: false, 
        message: result.message || 'Failed to retrieve lecture timeline' 
      };
    }
    return {
      success: true,
      data: result.data || []
    };
  } catch (error: any) {
    if (error.name === 'AbortError') return { success: false, message: 'Request cancelled.' };

    console.error('Get Lectures Timeline Utility Error:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'A network error occurred' 
    };
  }
};
export const getLecturersLecturesTimeline = async (
  options?: ApiRequestOptions
): Promise<GetTimelineResponse> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}users/lecturers/class/lectures/timeline`, {
      method: 'GET',
      headers,
      signal: options?.signal,
    });

    const result = await response.json();
    if (!response.ok) {
      return { 
        success: false, 
        message: result.message || 'Failed to retrieve lecture timeline' 
      };
    }
    return {
      success: true,
      data: result.data || []
    };
  } catch (error: any) {
    if (error.name === 'AbortError') return { success: false, message: 'Request cancelled.' };

    console.error('Get Lectures Timeline Utility Error:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'A network error occurred' 
    };
  }
};
export const checkAssessmentStatus = async (
  courseId: string,
  assessmentId: string,
  signal?: AbortSignal
): Promise<CheckAssessmentStatusResponse> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${baseUrl}users/student/class/courses/${courseId}/assessments/${assessmentId}/check-status`,
      {
        method: 'GET',
        headers: { ...headers, 'Content-Type': 'application/json' },
        signal,
      }
    );
    const result = await response.json();
    if (!response.ok) {
      return { 
        success: false, 
        message: result.message || 'Failed to verify assessment availability status.' 
      };
    }
    return {
      success: true,
      hasSubmitted: result.hasSubmitted,
      test: result.test || null,
    };

  } catch (error: any) {
    if (error.name === 'AbortError') return { success: false, message: 'Request cancelled.' };
    console.error('Check Assessment Status Utility Error:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'An unexpected network error occurred' 
    };
  }
};
export const getCourseExceptions = async ({
  courseId,
  signal,
}: GetCourseExceptionsParams): Promise<GetExceptionsResponse> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${baseUrl}users/exceptions?courseId=${courseId}`,
      {
        method: 'GET',
        headers,
        signal,
      }
    );

    const data = await response.json();
    if (!response.ok) {
      return { 
        success: false, 
        error: data.message || 'Failed to fetch course exceptions' 
      };
    }
    const exceptionsArray = Array.isArray(data) ? data : data.exceptions || [];
    
    return { 
      success: true, 
      data: exceptionsArray 
    };

  } catch (error: any) {
    if (error.name === 'AbortError') {
      return { success: false, error: 'Request cancelled.' };
    }
    console.error("Get Course Exceptions Utility Error:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};
export const getCourseAssessments = async ({
  courseId,
  signal,
}: GetCourseAssessmentsParams): Promise<GetAssessmentsResponse> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${baseUrl}users/lecturers/class/courses/${courseId}/assessments`,
      {
        method: 'GET',
        headers,
        signal,
      }
    );
    const result = await response.json();
    if (!response.ok) {
      return {
        success: false,
        error: result.message || 'Failed to fetch assessments for this course.',
      };
    }
    const assessmentsArray = Array.isArray(result.data) ? result.data : [];
    return {
      success: true,
      data: assessmentsArray,
    };
  } catch (error: any) {
    if (error.name === 'AbortError') return { success: false, error: 'Request cancelled.' };

    console.error("Get Assessments Utility Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown network error',
    };
  }
};
export const searchICashMarketLocal = (query: string, catalog: any[]): any[] => {
  const formattedQuery = query.toLowerCase().trim();
  
  if (!formattedQuery) return [];
  return catalog.filter(product => {
    return (
      product.title?.toLowerCase().includes(formattedQuery) ||
      product.description?.toLowerCase().includes(formattedQuery) ||
      product.category?.toLowerCase().includes(formattedQuery)
    );
  });
};
export const searchCourses = async (
  query: string,
  signal?: AbortSignal
): Promise<SearchCoursesResponse[]> => {
  if (!query || query.trim().length < 2) return [];

  const TIMEOUT_MS = await getAdaptiveTimeout();
  const controller = new AbortController();

  if (signal) {
    signal.addEventListener('abort', () => controller.abort());
  }
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const headers = await getAuthHeaders();
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

    const response = await fetch(
      `${cleanBaseUrl}/users/courses/search?q=${encodeURIComponent(query)}`,
      {
        method: 'GET',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);
    const result = await response.json();

    if (!response.ok || !result.success) {
      console.error('Unified course endpoint returned error status:', result?.message);
      return [];
    }

    return Array.isArray(result.courses) ? result.courses : [];
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      return [];
    }

    console.error("Search Courses Utility Error:", error);
    return [];
  }
};
export const searchAcademicResources = async (
  query: string,
  signal?: AbortSignal
): Promise<any[]> => {
  if (!query || query.trim().length < 2) return [];

  const TIMEOUT_MS = await getAdaptiveTimeout();
  const controller = new AbortController();

  if (signal) {
    signal.addEventListener('abort', () => controller.abort());
  }
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const encodedQuery = encodeURIComponent(query.trim());
    const headers = await getAuthHeaders();
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

    const response = await fetch(
      `${cleanBaseUrl}/users/courses/resources/search?q=${encodedQuery}`,
      {
        method: 'GET',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);
    const result = await response.json();

    if (response.ok && result.success && Array.isArray(result.resources)) {
      return result.resources;
    }
    
    return [];
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      return [];
    }

    console.error("Client side searchAcademicResources failed: ", error);
    return [];
  }
};
export const fetchAllAssignments = async (courseId: string): Promise<ApiResponse> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}users/courses/${courseId}/assignments`, {
      method: 'GET',
      headers,
    });
    
    const result = await response.json();
    if (!response.ok) {
      return { success: false, error: result.message || 'Failed to fetch assignments.' };
    }
    return { success: true, data: result.assignments };
  } catch (error: any) {
    return { success: false, error: error.message || 'Network error occurred.' };
  }
};
export const fetchAllLecturesByCourseId = async ({
  courseId,
  signal,
}: FetchAllLecturesParams): Promise<ApiResponse> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}users/courses/${courseId}/fetch-all-lectures`, {
      method: 'GET',
      headers,
      signal,
    });
    
    const result = await response.json();
    if (!response.ok) {
      return { 
        success: false, 
        error: result.error || result.message || 'Failed to fetch lectures.' 
      };
    }
    return { success: true, data: Array.isArray(result.lectures) ? result.lectures : [] };
  } catch (error: any) {
    if (error.name === 'AbortError') return { success: false, error: 'Request cancelled.' };

    return { success: false, error: error.message || 'Network error occurred.' };
  }
};
export const getAssessmentAnalysisUrl = async (
  testId: string,
  signal?: AbortSignal
): Promise<ApiResponse> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${baseUrl}users/lecturers/class/tests/${testId}/analysis-data`, 
      {
        method: 'GET',
        headers: { ...headers, 'Content-Type': 'application/json' },
        signal,
      }
    );
    const result = await response.json();  
    if (!response.ok) {
      return { 
        success: false, 
        error: result.error || result.message || 'Failed to generate report URL.' 
      };
    }
    return { success: true, data: result };
  } catch (error: any) {
    if (error.name === 'AbortError') return { success: false, error: 'Request cancelled.' };
    return { success: false, error: error.message || 'Network error occurred.' };
  }
};
export const getTransactionStats = async (
  params?: TransactionStatsParams
): Promise<ApiResponse> => {
  try {
    const queryParams = new URLSearchParams();
    if (params?.month) queryParams.append('month', params.month.toString());
    if (params?.year) queryParams.append('year', params.year.toString());

    const queryString = queryParams.toString();
    const url = `${baseUrl}user/transactions/stats${queryString ? `?${queryString}` : ''}`;
    const headers = await getAuthHeaders();

    const response = await fetch(url, {
      method: 'GET',
      headers,
      signal: params?.signal,
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.error || result.message || 'Failed to fetch statistics.',
      };
    }

    return { success: true, data: result };
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return { success: false, error: 'Request cancelled.' };
    }
    return {
      success: false,
      error: error.message || 'Network error occurred.',
    };
  }
};
export const getMyTransactions = async ({
  page,
  limit,
  searchQuery,
  signal,
}: GetTransactionsParams): Promise<ApiResponse> => {
  try {
    let url = `${baseUrl}user/my-transactions?page=${page}&limit=${limit}`;
    if (searchQuery) {
      url += `&search=${encodeURIComponent(searchQuery)}`;
    }
    const headers = await getAuthHeaders();
    const response = await fetch(url, {
      method: 'GET',
      headers,
      signal,
    });

    const result = await response.json();
    if (!response.ok || !result.success) {
      return {
        success: false,
        error: result.error || result.message || 'Failed to fetch transaction history.',
      };
    }
    return { success: true, data: result };
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return { success: false, error: 'Request cancelled.' };
    }
    return {
      success: false,
      error: error.message || 'Network error occurred.',
    };
  }
};
export const getTransactionByIdAPI = async ({
  transactionId,
  signal,
}: GetTransactionByIdParams) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}user/transactions/fetch-transaction/${transactionId}`, {
      method: 'GET',
      headers,
      signal,
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        message: data?.message || 'Failed to fetch transaction detail',
      };
    }
    
    return {
      success: true,
      data: data.data,
      message: 'Success',
    };
  } catch (error: any) {
    if (error.name === 'AbortError') return { success: false, data: null, message: 'Request cancelled.' };

    console.error("getTransactionByIdAPI Error:", error);
    return { success: false, data: null, message: 'Connection to server failed' };
  }
};
export const refreshUserProfileAPI = async (
  signal?: AbortSignal
): Promise<{ success: boolean; user?: any; accessToken?: string; refreshToken?: string; message: string }> => {
  const TIMEOUT_MS = await getAdaptiveTimeout();
  const controller = new AbortController();

  if (signal) {
    signal.addEventListener('abort', () => controller.abort());
  }
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const headers = await getAuthHeaders();
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

    const response = await fetch(`${cleanBaseUrl}/users/refresh-user-details`, {
      method: 'GET',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const data = await response.json();

    if (!response.ok || !data.success) {
      return {
        success: false,
        message: data?.message || 'Failed to sync profile data',
      };
    }

    return {
      success: true,
      user: data.user,        
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      message: data.message || 'Profile updated successfully',
    };
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      return {
        success: false,
        message: 'Profile refresh request timed out.',
      };
    }

    console.error("fetchUserProfileAPI Error:", error);
    return { 
      success: false, 
      message: 'Unable to connect to the server. Please check your internet.' 
    };
  }
};
export const fetchMyCoursesAPI = async ({ 
  semester, 
  session,
  page = 1,
  limit = 10,
  signal,
}: FetchMyCoursesParams = {}) => {
  try {
    let url = `${baseUrl}users/student/class/courses/fetch-my-courses`;
    const queryParams = new URLSearchParams();
    if (semester && semester !== 'All') queryParams.append('semester', semester);
    if (session && session !== 'All') queryParams.append('session', session);
    queryParams.append('page', page.toString());
    queryParams.append('limit', limit.toString());
    const queryString = queryParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
    
    const headers = await getAuthHeaders();
    const response = await fetch(url, {
      method: 'GET',
      headers,
      signal,
    });
    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: data?.message || 'Failed to sync enrolled course history.',
      };
    }
    return {
      success: true,
      courses: data, 
      message: 'Courses synced successfully.',
    };

  } catch (error: any) {
    if (error.name === 'AbortError') return { success: false, message: 'Request cancelled.' };

    console.error("fetchMyCoursesAPI Error:", error);
    return {
      success: false,
      message: 'Unable to connect to the server. Please check your internet.',
    };
  }
};
export const fetchLecturerCoursesAPI = async ({ 
  semester, 
  session,
  page = 1,
  limit = 10,
  signal,
}: FetchLecturerCoursesParams = {}) => {
  try {
    let url = `${baseUrl}users/lecturers/class/courses/fetch-my-courses`;
    const queryParams = new URLSearchParams();
    
    if (semester && semester !== 'All') queryParams.append('semester', semester);
    if (session && session !== 'All') queryParams.append('session', session);
    queryParams.append('page', page.toString());
    queryParams.append('limit', limit.toString());
    
    const queryString = queryParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
    const headers = await getAuthHeaders();
    const response = await fetch(url, {
      method: 'GET',
      headers,
      signal,
    });

    const data = await response.json();
    if (!response.ok) {
      return {
        success: false,
        message: data?.message || 'Failed to sync your assigned curriculum.',
      };
    }

    return {
      success: true,
      courses: data, 
      message: 'Lecturer modules synchronized successfully.',
    };

  } catch (error: any) {
    if (error.name === 'AbortError') return { success: false, message: 'Request cancelled.' };

    console.error("fetchLecturerCoursesAPI Error:", error);
    return {
      success: false,
      message: 'Unable to connect to the server. Please check your internet.',
    };
  }
};
export const getDeepgramTemporalToken = async (
  lectureId: string
): Promise<string | null> => {
  if (!lectureId) return null;

  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}v1/auth/deepgram-token?lectureId=${lectureId}`, {
      method: 'GET',
      headers,
    });
    const result = await response.json();
    if (!response.ok) {
      Toast.show({
        type: 'error',
        text1: 'Audio Sync Error',
        text2: result.message || 'Failed to authenticate your live audio track link.',
      });
      return null;
    }
    return result.token || null;

  } catch (error: any) {
    console.error('DeepgramTokenService Error:', error);
    Toast.show({
      type: 'error',
      text1: 'Connection Error',
      text2: 'Could not coordinate audio transcription channels.',
    });
    return null;
  }
};
export const getAllAdmins = async (): Promise<any[]> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}admins/fetch-all`, {
      method: 'GET',
      headers,
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      Toast.show({
        type: 'error',
        text1: 'Fetch Error',
        text2: result.message || 'Failed to fetch administrator list',
      });
      return [];
    }
    const list = Array.isArray(result) ? result : result.data;
    return Array.isArray(list) ? list : [];
  } catch (error: any) {
    console.error('AdminListService Error:', error);
    Toast.show({
      type: 'error',
      text1: 'Connection Error',
      text2: 'Could not connect to the server',
    });
    return [];
  }
};
export const getNotifications = async ({
  tabName,
  page = 1,
  limit = 20,
  signal,
}: GetNotificationsParams): Promise<any[]> => {
  try {
    const category = TAB_TO_CATEGORY[tabName];
    const headers = await getAuthHeaders();
    
    const response = await fetch(`${baseUrl}admins/get-notifications?category=${category}&page=${page}&limit=${limit}`, {
      method: 'GET',
      headers,
      signal,
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      Toast.show({
        type: 'error',
        text1: 'Fetch Error',
        text2: result.message || `Failed to fetch ${tabName} notifications`,
      });
      return [];
    }
    
    const list = Array.isArray(result) ? result : result.data;
    return Array.isArray(list) ? list : [];
    
  } catch (error: any) {
    if (error.name === 'AbortError') return [];

    console.error('NotificationService Error:', error);
    Toast.show({
      type: 'error',
      text1: 'Connection Error',
      text2: 'Could not connect to the notification server',
    });
    return [];
  }
};
export const fetchPostsAPI = async ({
  limit = 10,
  cursor = '',
  signal,
}: FetchPostsParams = {}) => {
  try {
    const url = `${baseUrl}posts/fetchPosts?limit=${limit}&cursor=${cursor}`;
    const headers = await getAuthHeaders();
    const response = await fetch(url, {
      method: 'GET',
      headers,
      signal,
    });
    const data = await response.json();
    if (!response.ok) {
      return {
        success: false,
        message: data?.message || 'Failed to fetch posts',
      };
    }
    return {
      success: response.ok,
      posts: data.posts || [],
      nextCursor: data.nextCursor || null,
    };
  } catch (error: any) {
    if (error.name === 'AbortError') return { success: false, posts: [], message: 'Request cancelled.' };

    console.error("fetchPostsAPI Error:", error);
    return { success: false, posts: [], message: 'Failed to connect to server' };
  }
};
export const searchPosts = async (query: string): Promise<any[]> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}posts/search?q=${encodeURIComponent(query)}`, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      Toast.show({
        type: 'error',
        text1: 'Fetch Error',
        text2: 'Failed to fetch posts'
      });
      return [];
    }
    const result = await response.json();
    return result.posts || [];
  } catch (error) {
    console.error('API Error inside searchPosts utility:', error);
    return [];
  }
};
export const fetchPostByIdAPI = async (postId: string) => {
  const TIMEOUT_MS = await getAdaptiveTimeout();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const headers = await getAuthHeaders();
    const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const url = `${cleanBaseUrl}/posts/${postId}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        data: null,
        message: data?.message || 'Failed to fetch post',
      };
    }

    return {
      success: true,
      data,
      message: 'Success',
    };
  } catch (error: any) {
    clearTimeout(timeoutId);
    console.error("fetchPostByIdAPI Error:", error);
    return { 
      success: false, 
      data: null, 
      message: error.name === 'AbortError' ? 'Request timed out' : 'Connection to server failed' 
    };
  }
};
export const fetchTicketsAPI = async ({
  limit = 10,
  cursor = '',
  signal,
}: FetchTicketsParams = {}) => {
  try {
    const url = `${baseUrl}support/tickets/fetch-all?limit=${limit}&cursor=${cursor}`;
    const headers = await getAuthHeaders();
    
    const response = await fetch(url, {
      method: 'GET',
      headers,
      signal,
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        message: data?.message || 'Failed to fetch support tickets',
      };
    }
    
    return {
      success: true,
      tickets: data.tickets || data.data || [], 
      nextCursor: data.nextCursor || null,
    };
  } catch (error: any) {
    if (error.name === 'AbortError') return { success: false, tickets: [], message: 'Request cancelled.' };

    console.error("fetchTicketsAPI Error:", error);
    return { 
      success: false, 
      tickets: [], 
      message: 'Failed to connect to server' 
    };
  }
};
export const adminFetchUserDetails = async ({
  userId,
  signal,
}: AdminFetchUserDetailsParams) => {
  try {
    const url = `${baseUrl}admins/fetch-user/${userId}`; 
    const headers = await getAuthHeaders();
    const response = await fetch(url, {
      method: 'GET',
      headers,
      signal,
    });
    
    const data = await response.json();
    if (!response.ok) {
      Toast.show({
        type: 'error',
        text1: 'Fetch Error',
        text2: data?.message || 'Failed to fetch user details'
      });
      return [];
    }
    return data.user || data; 
  } catch (error: any) {
    if (error.name === 'AbortError') return [];

    console.error("adminFetchUserDetails Error:", error);
    Toast.show({
      type: 'error',
      text1: 'Network Error',
      text2: 'Check your connection and retry.'
    });
    throw error;
  }
};
export const adminFetchUserNotifications = async ({
  userId,
  limit = 10,
  signal,
}: AdminFetchUserNotificationsParams) => {
  try {
    const url = `${baseUrl}admins/fetch-notifications/${userId}?limit=${limit}`;
    const headers = await getAuthHeaders();
    
    const response = await fetch(url, {
      method: 'GET',
      headers,
      signal,
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      Toast.show({
        type: 'error',
        text1: 'Fetch Error',
        text2: data?.message || 'Failed to fetch user notifications'
      });
      return []; 
    }
    return data.notifications || data || []; 
  } catch (error: any) {
    if (error.name === 'AbortError') return [];

    console.error("adminFetchUserNotifications Error:", error);
    Toast.show({
      type: 'error',
      text1: 'Network Error',
      text2: 'Check your connection and retry.'
    });
    return []; 
  }
};
export const getAdminMetricsAPI = async () => {
  try {
    const url = `${baseUrl}admins/get-overview`; 
    const headers = await getAuthHeaders();
    
    const response = await fetch(url, {
      method: 'GET',
      headers,
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      Toast.show({
        type: 'error',
        text1: 'Dashboard Error',
        text2: data?.message || 'Failed to fetch admin metrics'
      });
      return null;
    }
    
    return data; 
  } catch (error) {
    console.error("getAdminMetricsAPI Error:", error);
    Toast.show({
      type: 'error',
      text1: 'Network Error',
      text2: 'Could not connect to server.'
    });
    return null;
  }
};
export const getInstitutionsAPI = async (page: number, limit: number = 20) => {
  try {
    const url = `${baseUrl}admins/get-institutions?page=${page}&limit=${limit}`;
    const headers = await getAuthHeaders();
    
    const response = await fetch(url, {
      method: 'GET',
      headers,
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      Toast.show({
        type: 'error',
        text1: 'Fetch Error',
        text2: data?.message || 'Failed to fetch institutions'
      });
      return [];
    }
    
    return data; 
  } catch (error) {
    console.error("getInstitutionsAPI Error:", error);
    Toast.show({
      type: 'error',
      text1: 'Network Error',
      text2: 'Could not connect to server.'
    });
    return [];
  }
};
export const getDropOffStationsAPI = async (page: number, limit: number = 20) => {
  try {
    const url = `${baseUrl}admins/get-drop-off-stations?page=${page}&limit=${limit}`;
    const headers = await getAuthHeaders();
    
    const response = await fetch(url, {
      method: 'GET',
      headers,
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      Toast.show({
        type: 'error',
        text1: 'Fetch Error',
        text2: data?.message || 'Failed to fetch drop-off stations'
      });
      return [];
    }
    
    return data;
  } catch (error) {
    console.error("getDropOffStationsAPI Error:", error);
    Toast.show({
      type: 'error',
      text1: 'Network Error',
      text2: 'Could not connect to server.'
    });
    return [];
  }
};
export const getSchoolStatsApi = async (schoolId: string, signal?: AbortSignal) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}admins/institutions/${schoolId}/get-details`, {
      method: 'GET',
      headers: { ...headers, 'Content-Type': 'application/json' },
      signal,
    });

    const data = await response.json();
    return response.ok 
      ? { success: true, data } 
      : { success: false, error: data.message || 'Failed to fetch statistics.' };
  } catch (error: any) {
    if (error.name === 'AbortError') return { success: false, error: 'Request cancelled.' };
    console.error("Fetch Stats API Error:", error);
    return { success: false, error: 'Network error.' };
  }
};
export const getStationDetailsApi = async (stationId: string, signal?: AbortSignal) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}admins/stations/${stationId}/details`, {
      method: 'GET',
      headers: { ...headers },
      signal,
    });
    const data = await response.json();
    return response.ok ? { success: true, data } : { success: false, error: data.message };
  } catch (error: any) {
    if (error.name === 'AbortError') return { success: false, error: 'Request cancelled.' };
    return { success: false, error: 'Network error.' };
  }
};
export const fetchCourseGradebook = async (
  courseId: string,
  signal?: AbortSignal
) => {
  try {
    const url = `${baseUrl}users/lecturers/class/${courseId}/get-performance-analysis`; 
    const headers = await getAuthHeaders();
    
    const response = await fetch(url, {
      method: 'GET',
      headers: { ...headers, 'Content-Type': 'application/json' },
      signal,
    });
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      return {
        success: true,
        data: result.data, 
        message: 'Gradebook data loaded successfully',
      };
    }

    return {
      success: false,
      message: result?.message || 'Failed to fetch gradebook',
    };
  } catch (error: any) {
    if (error.name === 'AbortError') return { success: false, message: 'Request cancelled.' };
    console.error("Gradebook API Error:", error);
    return {
      success: false,
      message: 'Network error while fetching gradebook',
    };
  }
};
export const fetchTaxReport = async (month: string, year: string, signal?: AbortSignal) => {
  try {
    const url = `${baseUrl}admins/tax-entries/download?month=${month}&year=${year}`; 
    const headers = await getAuthHeaders();
    
    const response = await fetch(url, {
      method: 'GET',
      headers,
      signal,
    });
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      return {
        success: true,
        data: result.data, 
        message: 'Tax report downloaded successfully',
      };
    }

    return {
      success: false,
      message: result?.message || 'Failed to download tax report',
    };
  } catch (error: any) {
    if (error.name === 'AbortError') return { success: false, message: 'Request cancelled.' };
    console.error("Tax Download API Error:", error);
    return {
      success: false,
      message: 'Network error while downloading tax report',
    };
  }
};
export const fetchTaxEntries = async (page: number = 1, limit: number = 10, signal?: AbortSignal) => {
  try {
    const url = `${baseUrl}admins/tax-entries/fetch?page=${page}&limit=${limit}`; 
    const headers = await getAuthHeaders();
    
    const response = await fetch(url, {
      method: 'GET',
      headers,
      signal,
    });
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      return {
        success: true,
        data: result.data, 
        totalPages: result.totalPages || 1,
        message: 'Tax entries loaded successfully',
      };
    }

    return {
      success: false,
      data: [],
      message: result?.message || 'Failed to fetch tax entries',
    };
  } catch (error: any) {
    if (error.name === 'AbortError') return { success: false, data: [], message: 'Request cancelled.' };
    console.error("Tax Entries API Error:", error);
    return {
      success: false,
      data: [],
      message: 'Network error while fetching tax entries',
    };
  }
};
export const getAds = async (
  options?: ApiRequestOptions
): Promise<{ success: boolean; data: AdItem[] }> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}users/ads/fetch-active`, {
      headers,
      signal: options?.signal,
    });
    const result = await response.json();
    
    if (!response.ok) {
      Toast.show({
        type: 'error',
        text1: 'Fetch Error',
        text2: result.message || 'Failed to fetch advertisements',
      });
      return { success: false, data: [] };
    }

    return { 
      success: true, 
      data: result.data || [], 
    };
  } catch (error: any) {
    if (error.name === 'AbortError') return { success: false, data: [] };

    console.error("Fetch Ads Error:", error);
    return { success: false, data: [] };
  }
};
export const fetchSupportTicketByRefIdAPI = async ({
  ticketRefId,
  signal,
}: FetchSupportTicketParams) => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}admins/support-tickets/${ticketRefId}/fetch`, {
      method: 'GET',
      headers,
      signal,
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return {
        success: false,
        message: data?.message || 'Failed to fetch support ticket',
      };
    }
    
    return {
      success: true,
      ticket: data.ticket || data.data || data,
      message: 'Success',
    };
  } catch (error: any) {
    if (error.name === 'AbortError') return { success: false, ticket: null, message: 'Request cancelled.' };

    console.error("fetchSupportTicketByRefIdAPI Error:", error);
    return { 
      success: false, 
      ticket: null, 
      message: 'Connection to server failed' 
    };
  }
};