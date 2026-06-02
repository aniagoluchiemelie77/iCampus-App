import { User, CreateTestPayload, EnrichedCourseProduct, DropOffStation, Notification, Book, Lecture, Course, CourseException} from '../types/firebase';
import { baseUrl } from '@components/HomeScreenComponents';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';

const token = await AsyncStorage.getItem('accessToken');
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
interface TransactionStatsParams {
  month: string | number;
  year: string | number;
}
 interface GetTransactionsParams {
  page: number;
  limit: number;
  searchQuery?: string;
}
const getAuthHeaders = async () => {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
};

export const searchUserProfile = async (identifier: string, currentUser: User) => {
  const params = new URLSearchParams({
    viewerUid: currentUser.uid,
    viewerTier: currentUser.tier || 'free',
    viewerRole: currentUser.usertype || '',
    viewerFirstname: currentUser.firstname || '',
  });
  const response = await fetch(`${baseUrl}users/profile/search/${identifier}?${params.toString()}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });
  const result = await response.json();
  if (!response.ok) {
    Toast.show({
      type: 'error',
      text1: 'Fetch Error',
      text2: result.message || 'An unexpected error occurred',
    });
  }
  return result.data; 
};
export const fetchSupportedBanks = async (
  countryCode: string,
): Promise<{ label: string; value: string }[]> => {
  try {
    const response = await fetch(`${baseUrl}users/payments/banks/${countryCode}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      },
    });

    const json = await response.json();

    if (json.status === 'success' && Array.isArray(json.data)) {
      return json.data.map((bank: any) => ({
        label: bank.name,
        value: bank.code,
      }));
    }

    return [];
  } catch (err) {
    console.error('Bank fetch failed:', err);
    return [];
  }
};
export const getUserPaymentMethods = async (userId: string): Promise<any[]> => {
  if (!userId) return [];

  try {
    const response = await fetch(`${baseUrl}user/payment-methods/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    const result = await response.json();
    if (!response.ok) {
      Toast.show({
        type: 'error',
        text1: 'Fetch Error',
        text2: result.message || 'Failed to fetch payment methods',
      });
    }
    const methods = Array.isArray(result) ? result : result.data;
    return Array.isArray(methods) ? methods : [];
  } catch (error) {
    console.error('PaymentMethodService Error:', error);
    return [];
  }
};
export const getBlockedUsers = async (
  userId: string,
): Promise<any[]> => {
  if (!userId) return [];
  try {
    const response = await fetch(`${baseUrl}users/blocked-list/${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
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
    console.error('BlockedUsersService Error:', error);
    Toast.show({
      type: 'error',
      text1: 'Connection Error',
      text2: 'Could not connect to the server',
    });
    return [];
  }
};
export const getConversations = async (
  userId: string,
  pageNum: number,
): Promise<{ success: boolean; data: any[]; hasMore: boolean }> => {
  try {
    const response = await fetch(
      `${baseUrl}users/messages/conversations/${userId}?page=${pageNum}`,
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );
    const result = await response.json();
    
    if (!response.ok) {
      Toast.show({
        type: 'error',
        text1: 'Fetch Error',
        text2: result.message || 'Failed to fetch conversations',
      });
      return { success: false, data: [], hasMore: false };
    }
    return { 
      success: true, 
      data: result.data || [], 
      hasMore: result.hasMore 
    };
  } catch (error: any) {
    console.error("Fetch Conversations Error:", error);
    return { success: false, data: [], hasMore: false };
  }
};
export const fetchMessages = async (
  recipientId: string,
  pageNum: number,
  limit: number = 20
): Promise<{ success: boolean; data: any[]; hasMore: boolean }> => {
  try {
    const response = await fetch(
      `${baseUrl}users/messages/fetchMessage/${recipientId}?page=${pageNum}&limit=${limit}`,
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );
    
    const result = await response.json();

    if (!response.ok) {
      Toast.show({
        type: 'error',
        text1: 'Fetch Error',
        text2: result.message || 'Failed to fetch messages',
      });
      return { success: false, data: [], hasMore: false };
    }

    return {
      success: true,
      data: result.data || [],
      hasMore: result.hasMore ?? false
    };
  } catch (error: any) {
    console.error("Fetch Messages Error:", error);
    Toast.show({
      type: 'error',
      text1: 'Connection Error',
      text2: 'An unexpected error occurred while loading messages.',
    });
    return { success: false, data: [], hasMore: false };
  }
};
export const searchUsers = async (
  query: string,
  viewerTier: string,
  viewerRole: string,
): Promise<any[]> => {
  if (!query || query.length < 2) return [];

  try {
    const response = await fetch(
      `${baseUrl}users/search?q=${encodeURIComponent(query)}&viewerTier=${viewerTier}&viewerRole=${viewerRole}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    const result = await response.json();
    if (!response.ok) {
      Toast.show({
        type: 'error',
        text1: 'Fetch Error',
        text2: result.message || 'Search failed',
      });
      return [];
    }
    return Array.isArray(result.data) ? result.data : [result.data];
  } catch (error) {
    console.error("Search API Error:", error);
    return [];
  }
};
export const searchUsersByUid = async (
  uid: string,
  viewerTier: string,
  viewerRole: string,
): Promise<any[]> => {
  try {
    const response = await fetch(
      `${baseUrl}users/search?q=${encodeURIComponent(uid)}&viewerTier=${viewerTier}&viewerRole=${viewerRole}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    const result = await response.json();
    if (!response.ok) {
      Toast.show({
        type: 'error',
        text1: 'Fetch Error',
        text2: result.message || 'Search failed',
      });
      return [];
    }
    return Array.isArray(result.data) ? result.data : [result.data];
  } catch (error) {
    console.error("Search API Error:", error);
    return [];
  }
};
export const signupFetchInstitutions = async (country: string) => {
  try {
    const response = await fetch(
      `${baseUrl}users/institutions?country=${country}`
    );
    const data = await response.json();

    if (response.ok) {
      const formatted = data.institutions.map((i: any) => ({
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
    if (error.name === 'AbortError') return { success: false, aborted: true };
    return { 
      success: false, 
      message: 'Network error while fetching institutions' 
    };
  }
};
export const fetchLeaderboards = async () => {
  try {
    const url = `${baseUrl}users/fetchLeaderBoards`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
    });
    const data = await response.json();
    if (response.ok && data.success) {
      return {
        success: true,
        data: {
          students: data.data.students || [],
          instructors: data.data.instructors || [],
          institutions: data.data.institutions || [],
        },
        message: 'Leaderboards loaded successfully',
      };
    }

    return {
      success: false,
      message: data?.message || 'Failed to fetch leaderboards',
    };
  } catch (error: any) {
    console.error("Leaderboard API Error:", error);
    return {
      success: false,
      message: 'Network error while fetching leaderboards',
    };
  }
};
export const fetchPostsAPI = async (limit: number = 10, cursor: string = '') => {
  try {
    const url = `${baseUrl}posts/fetchPosts?limit=${limit}&cursor=${cursor}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
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
  } catch (error) {
    console.error("fetchPostsAPI Error:", error);
    return { success: false, posts: [], message: 'Failed to connect to server' };
  }
};
export const fetchPostByIdAPI = async (postId: string) => {
  try {
    const response = await fetch(`${baseUrl}posts/${postId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    const data = await response.json();
    if (!response.ok) {
      return {
        success: false,
        message: data?.message || 'Failed to fetch post',
      };
    }
    return {
      success: response.ok,
      data,
      message: response.ok ? 'Success' : (data.error || 'Post not found on server'),
    };
  } catch (error) {
    console.error("fetchPostByIdAPI Error:", error);
    return { success: false, data: null, message: 'Connection to server failed' };
  }
};
export const fetchProductsAPI = async ({ 
  q = '', 
  category = 'all', 
  cursor = '', 
  limit = 10 
}) => {
  try {
    const categoryParam = category === 'all' ? '' : encodeURIComponent(category);
    const queryParam = encodeURIComponent(q);
    const url = `${baseUrl}store/get-store-products?q=${queryParam}&category=${categoryParam}&cursor=${cursor}&limit=${limit}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    const result = await response.json();
    if (!response.ok) {
      return {
        success: false,
        message: result.message || 'Failed to fetch store items',
      };
    }
    return {
      success: response.ok,
      data: result.products || [],
      nextCursor: result.nextCursor || null,
    };
  } catch (error) {
    console.error("fetchProductsAPI Error:", error);
    return { success: false, data: [], message: 'Network error' };
  }
};
export const fetchAllProductsAPI = async () => {
  try {
    const url = `${baseUrl}store/fetch-all-products`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`, 
      },
    });
    const result = await response.json();
    if (!response.ok) {
      return {
        success: false,
        message: result.message || 'Failed to sync store catalog',
      };
    }
    return {
      success: true,
      data: result.products,
    };
  } catch (error) {
    console.error("fetchAllProductsAPI Error:", error);
    return { 
      success: false, 
      data: [], 
      message: 'Network error while syncing catalog' 
    };
  }
};
export const fetchPendingOrdersAPI = async () => {
  try {
    const url = `${baseUrl}store/orders/pending`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`, 
      },
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: result.message || 'Failed to fetch pending orders',
      };
    }

    return {
      success: true,
      data: result.data || [],
    };
  } catch (error) {
    console.error("fetchPendingOrdersAPI Error:", error);
    return { 
      success: false, 
      data: [], 
      message: 'Network error occurred while fetching orders' 
    };
  }
};
export const getUserDownloads = async (): Promise<{ success: boolean; data: EnrichedCourseProduct[] }> => {
  try {
    const response = await fetch(`${baseUrl}users/downloads/fetch-all`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    });
    const result = await response.json();
    if (!response.ok) {
      Toast.show({
        type: 'error',
        text1: 'Download Error',
        text2: result.message || 'Could not load your library',
      });
      return { success: false, data: [] };
    }
    return { success: true, data: result.data }; 
  } catch (error) {
    console.error("Fetch Downloads Error:", error);
    return { success: false, data: [] };
  }
};
export const fetchSellerSalesAPI = async () => {
  try {
    const url = `${baseUrl}store/sales/history`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`, 
      },
    });
    const result = await response.json();
    if (!response.ok) {
      return {
        success: false,
        message: result.message || 'Failed to fetch sales history',
      };
    }
    return {
      success: true,
      data: result.data || [],
    };
  } catch (error) {
    console.error("fetchSellerSalesAPI Error:", error);
    return { 
      success: false, 
      data: [], 
      message: 'Network error occurred while fetching sales' 
    };
  }
};
export const fetchUserReviewsAPI = async () => {
  try {
    const url = `${baseUrl}reviews/fetch-seller-reviews`; 
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    const result = await response.json();
    if (!response.ok) {
      return {
        success: false,
        message: result.message || 'Failed to fetch sales reviews',
      };
    }
    return {
      success: response.ok,
      data: result.data || [],
      message: result.message
    };
  } catch (error) {
    return { success: false, data: [], message: 'Network error fetching reviews' };
  }
};
export const fetchPayoutHistoryAPI = async () => {
  try {
    const url = `${baseUrl}payouts/fetch-history`; 
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    const result = await response.json();
    if (!response.ok) {
      return {
        success: false,
        message: result.message || 'Failed to fetch payout history',
      };
    }
    return {
      success: response.ok,
      data: result.data || [],
      message: result.message,
    };
  } catch (error) {
    return { success: false, data: [], message: 'Network error fetching payouts' };
  }
};
export const fetchDropOffStationsAPI = async (lat?: number, lng?: number) => {
  try {
    let url = `${baseUrl}store/drop-off-stations/fetch`;
    if (lat !== undefined && lng !== undefined) {
      url += `?lat=${lat}&lng=${lng}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`, 
      },
    });
    const result = await response.json();
    if (!response.ok) {
      return {
        success: false,
        message: result.message || 'Failed to fetch drop-off stations',
        data: [],
      };
    }

    return {
      success: true,
      data: (result.data as DropOffStation[]) || [],
      message: result.message,
    };
  } catch (error) {
    return { 
      success: false, 
      data: [], 
      message: 'Network error fetching drop-off stations' 
    };
  }
};
export const fetchUserConnections = async (): Promise<{success: boolean; message?: string; data: any}> => {
  try {
    const response = await fetch(`${baseUrl}users/fetch-connections`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
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
      data: result.data
    } 
      
  } catch (error) {
    console.error("Fetch Connections Error:", error);
    return {
      success: false,
      message: 'Check network connection.',
      data: [],
    };
  }
};
export const searchUsersByITag = async (tag: string): Promise<any> => {
  try {
    const response = await fetch(
      `${baseUrl}user/iTag/search/${encodeURIComponent(tag)}`, 
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
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
  } catch (error) {
    console.error("iTag Search API Error:", error);
    Toast.show({
      type: 'error',
      text1: 'Network Anomaly',
      text2: 'Could not connect to the iCampus routing nodes.',
    });
    return null;
  }
};
export const fetchNotificationDetails = async (
  notificationId: string
): Promise<{ success: boolean; notification: Notification | null }> => {
  try {
    const response = await fetch(`${baseUrl}users/notifications/${notificationId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
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
      notification: result.notification 
    };
  } catch (error: any) {
    console.error("Fetch Notification Detail Utility Error:", error);
    Toast.show({
      type: 'error',
      text1: 'Connection Error',
      text2: 'Could not connect to the notification server.',
    });
    return { success: false, notification: null };
  }
};
export const fetchNotificationsByTab = async (
  activeTab: 'all' | 'finance' | 'unread'
): Promise<{ success: boolean; notifications: Notification[] }> => {
  try {
    const params = new URLSearchParams();
    if (activeTab === 'finance') {
      params.append('category', 'finance');
    } else if (activeTab === 'unread') {
      params.append('unread', 'true');
    }
    const queryString = params.toString();
    const finalUrl = queryString ? `${baseUrl}users/get-notifications?${queryString}` : `${baseUrl}users/get-notifications`;

    const response = await fetch(finalUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
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
    console.error("Fetch Notifications Utility Error:", error);
    Toast.show({
      type: 'error',
      text1: 'Connection Error',
      text2: 'An unexpected error occurred while loading updates.',
    });
    return { success: false, notifications: [] };
  }
};
export const checkITagAvailability = async (
  username: string
): Promise<CheckITagResponse> => {
  try {
    const response = await fetch(`${baseUrl}users/check-itag/${encodeURIComponent(username)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    const result = await response.json();
    if (!response.ok) {
      return { success: false, available: false, message: result.message };
    }
    return { 
      success: true, 
      available: result.available ?? false 
    };
  } catch (error: any) {
    console.error("Check iTag Utility Error:", error);
    return { success: false, available: false, message: error.message };
  }
};
export const fetchOngoingLecture = async (): Promise<OngoingLectureResponse> => {
  try {
    const response = await fetch(`${baseUrl}users/lectures/ongoing`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
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
  } catch (error) {
    console.error("Fetch Ongoing Lecture Utility Error:", error);
    return { success: false, ongoing: false, lecture: null };
  }
};
export const fetchFeaturedBooksByDepartment = async (
  department: string
): Promise<{ success: boolean; books: Book[] }> => {
  try {
    const response = await fetch(
      `${baseUrl}users/library/featured?department=${encodeURIComponent(department)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
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

    // Checking if the backend returns the array directly or wrapped inside an object
    const booksArray = Array.isArray(data) ? data : data.books || [];

    return { 
      success: true, 
      books: booksArray 
    };
  } catch (error: any) {
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
  query: string
): Promise<SearchBooksResponse> => {
  try {
    const response = await fetch(
      `${baseUrl}users/library/search?q=${encodeURIComponent(query)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return { success: false, books: [] };
    }
    const booksArray = Array.isArray(data) ? data : data.books || [];

    return {
      success: true,
      books: booksArray,
    };
  } catch (error) {
    console.error("Search Library Utility Error:", error);
    return { success: false, books: [] };
  }
};
export const getUserAccountState = async (): Promise<any> => {
  try {
    const response = await fetch(`${baseUrl}users/check-account-state`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();
    if (!response.ok) {
      Toast.show({
        type: 'error',
        text1: 'Fetch Error',
        text2: `Request failed with status ${response.status}`
      });
      return { 
        success: false, 
        error: data.message || `Request failed with status ${response.status}` 
      };
    }
    return {
      success: true,
      user: data.user,
    };

  } catch (error) {
    console.error("Get User Profile Utility Error:", error);
    Toast.show({
        type: 'error',
        text1: 'Network Error',
        text2: 'An unknown error occurred'
      });
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'An unknown error occurred' 
    };
  }
};
export const getCourseDetailsForOngoingLecture = async (courseId: string): Promise<GetCourseResponse> => {
  try {
    const response = await fetch(`${baseUrl}users/course/ongoing-lecture/${courseId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await response.json();
    if (!response.ok) {
      return { success: false, error: data.message || 'Failed to fetch course details' };
    }
    return { success: true, data };
  } catch (error) {
    console.error("Get Course Details Utility Error:", error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};
export const getAllExceptionsForOngoingLecture = async (lectureId: string): Promise<GetExceptionsResponse> => {
  try {
    const response = await fetch(`${baseUrl}users/exceptions/lectures/${lectureId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.message || 'Failed to fetch lecture exceptions' };
    }
    const exceptionsArray = Array.isArray(data) ? data : data.exceptions || [];
    return { success: true, data: exceptionsArray };
  } catch (error) {
    console.error("Get Lecture Exceptions Utility Error:", error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};
export const getCourseDetails = async (courseId: string): Promise<FetchCourseResponse> => {
  try {
    if (!token) {
      return { success: false, message: 'Authentication token not found' };
    }

    const response = await fetch(`${baseUrl}users/courses/fetch-course-details/${courseId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
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

  } catch (error) {
    console.error('Fetch Course Details Utility Error:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'An unexpected error occurred' 
    };
  }
};
export const getStudentLecturesTimeline = async (): Promise<GetTimelineResponse> => {
  try {
    const response = await fetch(`${baseUrl}users/student/class/lectures/timeline`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
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
  } catch (error) {
    console.error('Get Lectures Timeline Utility Error:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'A network error occurred' 
    };
  }
};
export const checkAssessmentStatus = async (
  courseId: string,
  assessmentId: string
): Promise<CheckAssessmentStatusResponse> => {
  try {
    const response = await fetch(
      `${baseUrl}users/student/class/courses/${courseId}/assessments/${assessmentId}/check-status`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
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

  } catch (error) {
    console.error('Check Assessment Status Utility Error:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'An unexpected network error occurred' 
    };
  }
};
export const getCourseExceptions = async (courseId: string): Promise<GetExceptionsResponse> => {
  try {
    const response = await fetch(
      `${baseUrl}users/exceptions?courseId=${courseId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
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

  } catch (error) {
    console.error("Get Course Exceptions Utility Error:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};
export const getCourseAssessments = async (courseId: string): Promise<GetAssessmentsResponse> => {
  try {
    const response = await fetch(
      `${baseUrl}users/lecturers/class/courses/${courseId}/assessments`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
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
  } catch (error) {
    console.error("Get Assessments Utility Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown network error',
    };
  }
};
export const searchPosts = async (query: string): Promise<any[]> => {
  try {
    const response = await fetch(`${baseUrl}posts/search?q=${encodeURIComponent(query)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
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
export const searchCourses = async (query: string): Promise<SearchCoursesResponse[]> => {
  try {
    const response = await fetch(
      `${baseUrl}users/courses/search?q=${encodeURIComponent(query)}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    const result = await response.json();
    if (!response.ok) {
      console.error('Unified course endpoint returned error status:', result.message);
      return [];
    }
    return Array.isArray(result.courses) ? result.courses : [];
    
  } catch (error) {
    console.error("Search Courses Utility Error:", error);
    return [];
  }
};
export const searchAcademicResources = async (query: string): Promise<any[]> => {
  try {
    const encodedQuery = encodeURIComponent(query);
    const response = await fetch(
      `${baseUrl}users/courses/resources/search?q=${encodedQuery}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      }
    );

    const result = await response.json();
    if (response.ok && result.success) {
      return result.resources;
    }
    
    return [];
  } catch (error) {
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
export const fetchAllLecturesByCourseId = async (courseId: string): Promise<ApiResponse> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${baseUrl}users/courses/${courseId}/fetch-all-lectures`, {
      method: 'GET',
      headers,
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
    return { success: false, error: error.message || 'Network error occurred.' };
  }
};
export const getAssessmentAnalysisUrl = async (testId: string): Promise<ApiResponse> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${baseUrl}users/lecturers/class/tests/${testId}/download-analysis`, 
      {
        method: 'GET',
        headers
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
    return { success: false, error: error.message || 'Network error occurred.' };
  }
};
export const getTransactionStats = async ({ 
  month, 
  year 
}: TransactionStatsParams): Promise<ApiResponse> => {
  try {
     const headers = await getAuthHeaders();
    const response = await fetch(
      `${baseUrl}user/transactions/stats?month=${month}&year=${year}`,
      {
        method: 'GET',
        headers
      }
    );
    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.error || result.message || 'Failed to fetch statistics.'
      };
    }

    return { success: true, data: result };
  } catch (error: any) {
    return { 
      success: false, 
      error: error.message || 'Network error occurred.' 
    };
  }
};
export const getMyTransactions = async ({
  page,
  limit,
  searchQuery
}: GetTransactionsParams): Promise<ApiResponse> => {
  try {
    let url = `${baseUrl}user/my-transactions?page=${page}&limit=${limit}`;
    if (searchQuery) {
      url += `&search=${encodeURIComponent(searchQuery)}`;
    }
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();
    if (!response.ok || !result.success) {
      return {
        success: false,
        error: result.error || result.message || 'Failed to fetch transaction history.'
      };
    }
    return { success: true, data: result };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Network error occurred.'
    };
  }
};