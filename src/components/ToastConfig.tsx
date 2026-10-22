import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Toast, { ToastConfigParams } from 'react-native-toast-message';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

type Variant = 'success' | 'error' | 'info' | 'warning';

const ICONS: Record<Variant, string> = {
  success: 'check-circle',
  error: 'error',
  info: 'info',
  warning: 'warning-amber',
};
const DEFAULT_TITLES: Record<Variant, string> = {
  success: 'Done',
  error: 'Something went wrong',
  info: 'Heads up',
  warning: 'Check this',
};

/**
 * Modern toast card: tinted icon badge, bold title, optional message, accent
 * bar and a close button. Used app-wide (it replaced the SweetAlert modal).
 * A toast with only `text2` gets a sensible title for its type.
 */
const ToastCard = ({
  variant,
  text1,
  text2,
  colors,
  onPress,
}: {
  variant: Variant;
  text1?: string;
  text2?: string;
  colors: any;
  onPress?: () => void;
}) => {
  const accent =
    variant === 'success'
      ? colors.success
      : variant === 'error'
        ? colors.primary
        : variant === 'warning'
          ? colors.pendingDelivery || '#F59E0B'
          : colors.primaryTint || '#3B82F6';
  const title = text1 || (text2 ? DEFAULT_TITLES[variant] : '');
  const message = text1 ? text2 : text2 && text2 !== title ? text2 : undefined;

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={onPress}
      accessibilityRole="alert"
      accessibilityLabel={[title, message].filter(Boolean).join('. ')}
      style={[
        styles.card,
        { backgroundColor: colors.backgroundSecondary, borderColor: accent + '40' },
      ]}
    >
      <View style={[styles.accent, { backgroundColor: accent }]} />
      <View style={[styles.iconBadge, { backgroundColor: accent + '1F' }]}>
        <MaterialIcons name={ICONS[variant]} size={22} color={accent} />
      </View>
      <View style={styles.texts}>
        {!!title && (
          <Text style={[styles.title, { color: colors.textDarker }]} numberOfLines={2}>
            {title}
          </Text>
        )}
        {!!message && (
          <Text style={[styles.message, { color: colors.text }]} numberOfLines={4}>
            {message}
          </Text>
        )}
      </View>
      <TouchableOpacity
        onPress={() => Toast.hide()}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityLabel="Dismiss"
        style={styles.close}
      >
        <MaterialIcons name="close" size={18} color={colors.text} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

export const getToastConfig = (colors: any) => {
  const make = (variant: Variant) => (props: ToastConfigParams<any>) => (
    <ToastCard
      variant={variant}
      text1={props.text1}
      text2={props.text2}
      colors={colors}
      onPress={props.onPress}
    />
  );
  return {
    success: make('success'),
    error: make('error'),
    info: make('info'),
    warning: make('warning'),
  };
};

const styles = StyleSheet.create({
  card: {
    width: '92%',
    maxWidth: 480,
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 12,
    paddingLeft: 16,
    paddingRight: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 8,
  },
  accent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  iconBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  texts: { flex: 1 },
  title: { fontSize: 14.5, fontWeight: '800' },
  message: { fontSize: 13, lineHeight: 18, marginTop: 2, opacity: 0.85 },
  close: { padding: 4, marginLeft: 6 },
});
