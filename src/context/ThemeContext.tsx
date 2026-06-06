import React, { createContext, useContext } from 'react';
import { useColorScheme } from 'react-native';
import { useSelector } from 'react-redux';
import { ThemeType } from '../types/firebase';
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
  tint: 'rgba(248, 246, 246, 0.81)',
  inputTextHolder: PRIMARY_COLOR_TINT,
  success: '#4CAF50',
  btnColor: PRIMARY_COLOR,
  btnTextColor: '#fff',
  border: PRIMARY_COLOR_TINT,
  primary: PRIMARY_COLOR,
  primaryTint: PRIMARY_COLOR_TINT,
};

export const darkPalette = {
  background: '#111',
  backgroundSecondary: '#222',
  text: PRIMARY_COLOR_TINT_MAIN,
  textDarker: PRIMARY_COLOR_TINT_MAIN,
  tint: PRIMARY_COLOR_TINT_MAIN,
  inputTextHolder: PRIMARY_COLOR_TINT_MAIN,
  success: '#4CAF50',
  border: PRIMARY_COLOR_TINT_MAIN,
  btnTextColor: '#fff',
  btnColor: PRIMARY_COLOR,
  primary: PRIMARY_COLOR,
  primaryTint: PRIMARY_COLOR_TINT,
};

export type ColorsType = typeof lightPalette;

interface ThemeContextProps {
  themeMode: ThemeType;
  isDarkMode: boolean;
  colors: ColorsType;
}

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const themeMode = useSelector((state: any) => state.user.theme || 'system');
  const deviceColorScheme = useColorScheme();
  const isDarkMode =
    themeMode === 'dark' ||
    (themeMode === 'system' && deviceColorScheme === 'dark');

  const colors = isDarkMode ? darkPalette : lightPalette;

  return (
    <ThemeContext.Provider
      value={{
        themeMode,
        isDarkMode,
        colors,
      }}
    >
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