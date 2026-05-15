import { User, EnrichedCourseProduct } from '../types/firebase';
import { baseUrl } from '@components/HomeScreenComponents';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';

const token = await AsyncStorage.getItem('accessToken');

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
    const response = await fetch(`${baseUrl}users/fetchLeaderBoards`);
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
    const url = `${baseUrl}store/products?q=${queryParam}&category=${categoryParam}&cursor=${cursor}&limit=${limit}`;
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