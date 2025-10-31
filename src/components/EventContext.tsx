import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";

import type { Product, User, Notification } from '../types/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from './store';
import { setNotifications2 } from './NotificationSplice';
import { setCartItems } from './CartProductsSlice';

interface AppDataContextType {
  events: any[];
  favorites: Product[];
  notification: Notification[];
  cartProducts: Product[];
  favoriteProducts: Product[];
  cart: string[];
  errorMessage: string | null;
  fetchEvents: () => Promise<void>;
  fetchFavorites: () => Promise<void>;
  fetchCartItems: () => Promise<void>;
  fetchNotifications: () => Promise<void>;
  toggleFavorite: (productId: string) => Promise<void>;
}

interface AppDataProviderProps {
  user: User;
  children: ReactNode;
}

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

export const useAppDataContext = () => {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error('useAppDataContext must be used within an AppDataProvider');
  }
  return context;
};

export const AppDataProvider = ({ user, children }: AppDataProviderProps) => {
  const [events, setEvents] = useState<any[]>([]);
  const dispatch = useDispatch<AppDispatch>();
  const [favorites] = useState<Product[]>([]);
  const [cartProducts, setCartProducts] = useState<Product[]>([]);
  const [notification, createNotifications] = useState<Notification[]>([]);
  const [favoriteProducts, setFavoritesProducts] = useState<Product[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cart] = useState<string[]>([]);

  const fetchEvents = useCallback(async () => {
    try {
      const response = await fetch(
        `http://192.168.1.98:5000/user/events?userId=${user.uid}&department=${user.department}&level=${user.current_level}`,
      );
      if (!response.ok) throw new Error(`Status ${response.status}`);
      const data = await response.json();
      setEvents(data);
      setErrorMessage(null);
    } catch (error) {
      console.error('Error fetching events:', error);
      Toast.show({
        type: 'error',
        text1: "Error, couldn't fetch events",
        position: 'bottom',
        bottomOffset: 5,
      });
    }
  }, [user.uid, user.department, user.current_level]);

  const fetchFavorites = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetch('http://192.168.1.98:5000/store/favorites', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setFavoritesProducts(data.products);
      }
    } catch (error) {
      console.error('Error fetching favorites:', error);
      Toast.show({
        type: 'error',
        text1: "Error, couldn't fetch favorites.",
        position: 'bottom',
        bottomOffset: 5,
      });
    }
  }, []);
  const fetchNotifications = useCallback(async () => {
    const queryParams = new URLSearchParams({
      userId: user.uid,
      limit: '100',
      offset: '0',
      unread: 'true',
    });
    try {
      const res = await fetch(
        `http://192.168.1.98:5000/users/notifications?${queryParams}`,
      );
      if (res.ok) {
        const data = await res.json();
        console.log(data.notifications);
        if (Array.isArray(data.notifications)) {
          dispatch(setNotifications2(data.notifications));
          createNotifications(data.notifications);
        }
      }
    } catch (error) {
      console.error('Error fetching favorites:', error);
      Toast.show({
        type: 'error',
        text1: "Error, couldn't fetch favorites.",
        position: 'bottom',
        bottomOffset: 5,
      });
    }
  }, [user.uid, dispatch]);

  const fetchCartItems = useCallback(async () => {
    const token = await AsyncStorage.getItem('authToken');
    console.log('Token:', token);

    try {
      const response = await fetch('http://192.168.1.98:5000/store/cart', {
        headers: { Authorization: `Bearer ${token}` },
      });

      const rawData = await response.json();
      console.log('Fetched cart items:', rawData);

      // Normalize each item
      const normalizedItems = rawData.map((item: any) => ({
        ...item,
        quantity: Number(item.cartQuantity) || 1, // ✅ use cartQuantity from backend
        stock: Number(item.quantity) || 0, // ✅ preserve stock separately
      }));

      setCartProducts(normalizedItems);
      dispatch(setCartItems(normalizedItems));
    } catch (error) {
      console.warn(error);
      Toast.show({
        type: 'error',
        text1: "Error, couldn't fetch cart items.",
        position: 'bottom',
        bottomOffset: 5,
      });
    }
  }, [dispatch]);


  const toggleFavorite = async (productId: string) => {
    const token = await AsyncStorage.getItem('authToken');

    try {
      console.log('Query...');
      const res = await fetch(`http://192.168.1.98:5000/store/toggleFavorite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ productId }),
      });

      if (res.ok) {
        const data = await res.json(); // Get the response body
        Toast.show({
          type: 'success',
          text1: data.message,
          position: 'bottom',
          bottomOffset: 5, // Use server message directly
        });

        // Optional: update local favorites state if returned
        setFavoritesProducts(data.favorites);
      } else {
        const errorData = await res.json();
        Toast.show({
          type: 'error',
          text1: errorData.error || 'Failed to toggle favorite',
          position: 'bottom',
          bottomOffset: 5,
        });
      }
      fetchFavorites(); // Refresh from server
    } catch (error) {
      console.error('Toggle error:', error);
      Toast.show({
        type: 'error',
        text1: 'Failed to save product as favorite',
      });
    }
  };

  useEffect(() => {
    fetchEvents();
    fetchFavorites();
    fetchCartItems();
    fetchNotifications();
    const interval = setInterval(() => {
      fetchEvents();
      fetchFavorites();
      fetchCartItems();
      fetchNotifications();
    }, 2 * 60 * 60 * 1000);
    return () => {
      clearInterval(interval);
    };
  }, [fetchEvents, fetchFavorites, fetchCartItems, fetchNotifications]);

  return (
    <AppDataContext.Provider
      value={{
        events,
        favorites,
        notification,
        cartProducts,
        errorMessage,
        cart,
        favoriteProducts,
        fetchEvents,
        fetchFavorites,
        fetchCartItems,
        fetchNotifications,
        toggleFavorite,
      }}
    >
      {children}
    </AppDataContext.Provider>
  );
};

