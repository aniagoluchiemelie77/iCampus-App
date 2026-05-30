import React, { createContext, useContext } from 'react';
import { useSelector, useDispatch } from 'react-redux'; 
import { toggleTheme } from '../components/UserSlice'; 

export const lightPalette = {
  background: '#FFFFFF',
  text: '#111827',
  tint: '#6B7280',
  border: '#E5E7EB',
  primary: '#007AFF',       
  primaryTint: '#E0F2FE',   
};

export const darkPalette = {
  background: '#111827',
  text: '#F9FAFB',
  tint: '#9CA3AF',
  border: '#374151',
  primary: '#38BDF8',       
  primaryTint: '#1E293B',
};

export type ColorsType = typeof lightPalette;

interface ThemeContextProps {
  isDarkMode: boolean;
  colors: ColorsType;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const dispatch = useDispatch();
  const isDarkMode = useSelector((state: any) => state.theme.isDarkMode);

  const handleToggle = () => {
    dispatch(toggleTheme()); 
  };

  const colors = isDarkMode ? darkPalette : lightPalette;

  return (
    <ThemeContext.Provider value={{ isDarkMode, colors, toggleTheme: handleToggle }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be implemented inside a valid wrapped <ThemeProvider /> container.');
  }
  return context;
};