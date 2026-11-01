import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';

export interface WebBlurViewProps extends ViewProps {
  blurAmount?: number;
  blurType?: string;
}

export const BlurView = React.forwardRef<View, WebBlurViewProps>(
  ({ children, style, ...props }, ref) => (
    <View
      ref={ref}
      {...props}
      style={[styles.fallback, style]}
    >
      {children}
    </View>
  ),
);

export const VibrancyView = BlurView;

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
});
