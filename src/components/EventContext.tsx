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
  const [favorites, setFavorites] = useState<Product[]>([]);
  const [cartProducts, setCartProducts] = useState<Product[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
      setErrorMessage('Error retrieving events, please retry');
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
      if (!response.ok) throw new Error(`Status ${response.status}`);
      const data = await response.json();
      setFavorites(data);
    } catch (error) {
      console.error('Error fetching favorites:', error);
    }
  }, []);

  const fetchCartItems = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetch('http://192.168.1.98:5000/store/cart', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error(`Status ${response.status}`);
      const data = await response.json();
      setCartProducts(data);
    } catch (error) {
      console.error('Error fetching cart items:', error);
    }
  }, []);
  const toggleFavorite = async (productId: string) => {
    const isFavoriting = !favorites.some(p => p._id === productId);
    const token = await AsyncStorage.getItem('authToken');

    Toast.show({
      type: 'success',
      text1: isFavoriting
        ? 'Product added to favorites'
        : 'Product removed from favorites',
    });

    try {
      await fetch(`https://your-api.com/products/${productId}/favorite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ increment: isFavoriting }),
      });

      const stored = await AsyncStorage.getItem('favorites');
      const favoritesArray: string[] = stored ? JSON.parse(stored) : [];

      let updatedFavorites;
      if (isFavoriting) {
        updatedFavorites = [...new Set([...favoritesArray, productId])];
      } else {
        updatedFavorites = favoritesArray.filter(id => id !== productId);
      }

      await AsyncStorage.setItem('favorites', JSON.stringify(updatedFavorites));
      fetchFavorites(); // refresh from server
    } catch (error) {
      console.error('Error updating favorite count or storage:', error);
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

