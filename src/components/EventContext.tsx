import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";

import type { Product, User } from '../types/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';

interface AppDataContextType {
  events: any[];
  favorites: Product[];
  cartProducts: Product[];
  favoriteProducts: Product[];
  cart: string[];
  errorMessage: string | null;
  fetchEvents: () => Promise<void>;
  fetchFavorites: () => Promise<void>;
  fetchCartItems: () => Promise<void>;
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
  const [favorites] = useState<Product[]>([]);
  const [cartProducts, setCartProducts] = useState<Product[]>([]);
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
        bottomOffset: 30,
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
        bottomOffset: 30,
      });
    }
  }, []);
  const fetchCartItems = useCallback(async () => {
    const token = await AsyncStorage.getItem('authToken');
    try {
      const response = await fetch('http://192.168.1.98:5000/store/cart', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setCartProducts(data);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: "Error, couldn't fetch cart items.",
        position: 'bottom',
        bottomOffset: 30,
      });
    }
  }, []);

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
          bottomOffset: 30, // Use server message directly
        });

        // Optional: update local favorites state if returned
        setFavoritesProducts(data.favorites);
      } else {
        const errorData = await res.json();
        Toast.show({
          type: 'error',
          text1: errorData.error || 'Failed to toggle favorite',
          position: 'bottom',
          bottomOffset: 30,
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
    const interval = setInterval(() => {
      fetchEvents();
      fetchFavorites();
      fetchCartItems();
    }, 2 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchEvents, fetchFavorites, fetchCartItems]);

  return (
    <AppDataContext.Provider
      value={{
        events,
        favorites,
        cartProducts,
        errorMessage,
        cart,
        favoriteProducts,
        fetchEvents,
        fetchFavorites,
        fetchCartItems,
        toggleFavorite,
      }}
    >
      {children}
    </AppDataContext.Provider>
  );
};

