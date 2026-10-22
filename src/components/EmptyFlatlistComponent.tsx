import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  StyleProp,
  Image,
  ImageSourcePropType,
  Animated,
  Easing,
  AccessibilityInfo,
  ActivityIndicator,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../context/ThemeContext';

export interface EmptyStateChip {
  label: string;
  icon?: string;
  onPress: () => void;
}

interface EmptyStateProps {
  iconName?: string;
  title: string;
  subtitle?: string;
  /** Primary call to action. */
  buttonText?: string;
  buttonIcon?: string;
  onPress?: () => void;
  /** Shows a spinner in the primary button and ignores presses (e.g. while retrying). */
  buttonLoading?: boolean;
  /** Optional lower-emphasis action shown under the primary button. */
  secondaryButtonText?: string;
  onSecondaryPress?: () => void;
  /** Shown instead of the icon halo when provided. */
  illustration?: ImageSourcePropType;
  /** Quick suggestions, e.g. "Try another tab". */
  chips?: EmptyStateChip[];
  chipsLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/** Gentle up-and-down drift; skipped when the OS asks for reduced motion. */
const useFloatAnimation = () => {
  const offset = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then(reduceMotion => {
        if (cancelled || reduceMotion) return;
        loop = Animated.loop(
          Animated.sequence([
            Animated.timing(offset, {
              toValue: -6,
              duration: 1600,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
            Animated.timing(offset, {
              toValue: 0,
              duration: 1600,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
          ]),
        );
        loop.start();
      });
    return () => {
      cancelled = true;
      loop?.stop();
    };
  }, [offset]);
  return offset;
};

export const EmptyState: React.FC<EmptyStateProps> = ({
  iconName = 'find-in-page',
  title,
  subtitle,
  buttonText,
  buttonIcon,
  onPress,
  buttonLoading = false,
  secondaryButtonText,
  onSecondaryPress,
  illustration,
  chips,
  chipsLabel,
  style,
}) => {
  const { colors } = useTheme();
  const float = useFloatAnimation();

  return (
    <View style={[styles.container, style]}>
      <Animated.View style={{ transform: [{ translateY: float }] }}>
        {illustration ? (
          <Image source={illustration} style={styles.illustration} />
        ) : (
          <View style={styles.halo}>
            <View
              style={[styles.haloRing, styles.haloOuter, { backgroundColor: colors.primary }]}
            />
            <View
              style={[styles.haloRing, styles.haloInner, { backgroundColor: colors.primary }]}
            />
            <View style={[styles.iconBadge, { backgroundColor: colors.primary }]}>
              <MaterialIcons name={iconName} size={34} color="#fff" />
            </View>
          </View>
        )}
      </Animated.View>

      <Text style={[styles.title, { color: colors.textDarker }]}>{title}</Text>
      {!!subtitle && (
        <Text style={[styles.subtitle, { color: colors.text }]}>{subtitle}</Text>
      )}

      {!!chips?.length && (
        <View style={styles.chipsBlock}>
          {!!chipsLabel && (
            <Text style={[styles.chipsLabel, { color: colors.text }]}>
              {chipsLabel}
            </Text>
          )}
          <View style={styles.chipsRow}>
            {chips.map(chip => (
              <TouchableOpacity
                key={chip.label}
                onPress={chip.onPress}
                activeOpacity={0.75}
                style={[styles.chip, { borderColor: colors.primary }]}
              >
                {!!chip.icon && (
                  <MaterialIcons name={chip.icon} size={15} color={colors.primary} />
                )}
                <Text style={[styles.chipText, { color: colors.primary }]}>
                  {chip.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {!!buttonText && !!onPress && (
        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: colors.btnColor },
            buttonLoading && styles.buttonBusy,
          ]}
          onPress={onPress}
          disabled={buttonLoading}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityState={{ busy: buttonLoading, disabled: buttonLoading }}
        >
          {buttonLoading ? (
            <ActivityIndicator size="small" color={colors.btnTextColor} />
          ) : (
            !!buttonIcon && (
              <MaterialIcons name={buttonIcon} size={18} color={colors.btnTextColor} />
            )
          )}
          <Text style={[styles.buttonText, { color: colors.btnTextColor }]}>
            {buttonText}
          </Text>
        </TouchableOpacity>
      )}
      {!!secondaryButtonText && !!onSecondaryPress && (
        <TouchableOpacity style={styles.secondaryButton} onPress={onSecondaryPress}>
          <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>
            {secondaryButtonText}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const HALO = 128;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingVertical: 32,
    marginTop: 24,
  },
  halo: {
    width: HALO,
    height: HALO,
    alignItems: 'center',
    justifyContent: 'center',
  },
  haloRing: { position: 'absolute', borderRadius: HALO / 2 },
  haloOuter: { width: HALO, height: HALO, opacity: 0.07 },
  haloInner: { width: HALO * 0.72, height: HALO * 0.72, opacity: 0.12 },
  iconBadge: {
    width: 68,
    height: 68,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-6deg' }],
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  illustration: {
    width: 170,
    height: 170,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    marginTop: 22,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 21,
    opacity: 0.8,
    maxWidth: 320,
  },
  chipsBlock: { marginTop: 20, alignItems: 'center' },
  chipsLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    opacity: 0.6,
    marginBottom: 10,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1.2,
    borderRadius: 20,
    paddingHorizontal: 13,
    paddingVertical: 7,
  },
  chipText: { fontSize: 13, fontWeight: '700' },
  button: {
    marginTop: 24,
    minHeight: 48,
    paddingHorizontal: 22,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
  },
  buttonBusy: { opacity: 0.8 },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: { marginTop: 12, paddingVertical: 8, paddingHorizontal: 12 },
  secondaryButtonText: { fontSize: 14, fontWeight: '700' },
});
