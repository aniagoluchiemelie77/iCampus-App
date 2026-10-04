import { useWindowDimensions, ViewStyle } from 'react-native';

export const useResponsiveModalWidth = (): {
  modalWidthStyle: ViewStyle;
  isLargeScreen: boolean;
} => {
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 768;

  return {
    modalWidthStyle: {
      width: isLargeScreen ? 440 : '100%',
      alignSelf: 'center',
    },
    isLargeScreen,
  };
};