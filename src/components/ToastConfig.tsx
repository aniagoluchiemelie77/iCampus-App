import React from 'react';
import { BaseToast, ErrorToast } from 'react-native-toast-message';
import { StyleSheet } from 'react-native';

export const getToastConfig = (colors: any) => ({
  success: (props: any) => (
    <BaseToast
      {...props}
      style={[
        styles.toastDiv,
        {
          borderLeftColor: colors.success,
          backgroundColor: colors.backgroundSecondary,
        },
      ]}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={[styles.toastText, { color: colors.success }]}
      text2Style={[styles.toastTextTwo, { color: colors.text }]}
    />
  ),
  error: (props: any) => (
    <ErrorToast
      {...props}
      style={[
        styles.toastDiv,
        {
          borderLeftColor: colors.primary,
          backgroundColor: colors.backgroundSecondary,
        },
      ]}
      text1Style={[styles.toastText, { color: colors.primary }]}
      text2Style={[styles.toastTextTwo, { color: colors.text }]}
    />
  ),
  info: (props: any) => (
    <BaseToast
      {...props}
      style={[
        styles.toastDiv,
        {
          borderLeftColor: colors.pendingDelivery,
          backgroundColor: colors.backgroundSecondary,
        },
      ]}
      contentContainerStyle={{ paddingHorizontal: 15 }}
      text1Style={[styles.toastText, { color: colors.pendingDelivery }]}
      text2Style={[styles.toastTextTwo, { color: colors.text }]}
    />
  ),
});
const styles = StyleSheet.create({
  toastDiv: {
    position: 'static',
    bottom: 70,
    left: 7,
  },
  toastText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  toastTextTwo: {
    fontSize: 12,
  },
});
