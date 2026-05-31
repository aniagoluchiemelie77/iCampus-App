import React, { createContext, useContext } from 'react';
import { useSelector, useDispatch } from 'react-redux'; 
import { toggleTheme } from '../components/UserSlice';
import {
  PRIMARY_COLOR,
  PRIMARY_COLOR_TINT,
  PRIMARY_COLOR_TINT_MAIN,
} from '../assets/styles/colors';

export const lightPalette = {
  background: '#FFFFFF',
  backgroundSecondary: '#fadccc',
  text: '#333333',
  textDarker: '#222222',
  tint: '#6B7280',
  inputTextHolder: PRIMARY_COLOR_TINT,
  border: PRIMARY_COLOR_TINT,
  primary: PRIMARY_COLOR,
  primaryTint: PRIMARY_COLOR_TINT,
};

export const darkPalette = {
  background: '#111',
  backgroundSecondary: '#222',
  text: PRIMARY_COLOR_TINT_MAIN,
  textDarker: PRIMARY_COLOR_TINT_MAIN,
  tint: '#9CA3AF',
  inputTextHolder: PRIMARY_COLOR_TINT_MAIN,
  border: PRIMARY_COLOR_TINT,
  primary: PRIMARY_COLOR,
  primaryTint: PRIMARY_COLOR_TINT,
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