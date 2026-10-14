import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Animated,
  useWindowDimensions,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { CurrencyDisplay } from './CurrencyFormatter';
import { useTheme } from '../context/ThemeContext';
import { PRIMARY_COLOR, withAlpha } from '../assets/styles/colors';

/**
 * Shared building blocks for the Favorites and Cart list items.
 *
 * Both screens render the same "product row" concept, so the visual language
 * lives here once: radii, shadows, chips, tinted pills and the press-scale
 * animation. Keeping it in one place is what stops the two lists from
 * drifting apart again.
 */

/** Below this card width the item stacks its media above its text instead of beside it. */
export const STACK_BREAKPOINT = 300;

/** Design tokens — the single source of truth for this family of cards. */
export const ProductListItemTokens = {
  radius: 20,
  mediaSize: 104,
  mediaRadius: 16,
  gap: 14,
  pressScale: 0.975,
} as const;

/** Spring-based press feedback. Native driver, so it never blocks the JS thread. */
export const usePressScale = (toValue = ProductListItemTokens.pressScale) => {
  const scale = useMemo(() => new Animated.Value(1), []);

  const onPressIn = useCallback(() => {
    Animated.spring(scale, {
      toValue,
      useNativeDriver: true,
      speed: 40,
      bounciness: 0,
    }).start();
  }, [scale, toValue]);

  const onPressOut = useCallback(() => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 8,
    }).start();
  }, [scale]);

  return { scale, onPressIn, onPressOut };
};

/** Horizontal screen chrome around list content (15px per side). */
export const LIST_HORIZONTAL_CHROME = 30;

/** Gutter between grid columns — matches FavoritesScreen's column wrapper. */
export const COLUMN_GAP = 12;

/**
 * Resolves a list card's real rendered width and whether it has room for the
 * side-by-side (media beside text) layout.
 *
 * Window width alone is misleading: inside the 2-column favorites grid a card
 * is only about half the screen wide, so the available width is divided by
 * `columns` before comparing against `STACK_BREAKPOINT`. The concrete
 * `cardWidth` is meant to be set on the card itself so grid rows never depend
 * on content-based sizing inside the row wrapper.
 *
 * `columns` must match the list's `numColumns`, and both list screens keep
 * `paddingHorizontal: 15` in their `listContent` for the math to line up.
 */
export const useResponsiveCardLayout = (columns = 1) => {
  const { width } = useWindowDimensions();
  const gutters = columns > 1 ? COLUMN_GAP * (columns - 1) : 0;
  const cardWidth = Math.max(
    0,
    (width - LIST_HORIZONTAL_CHROME - gutters) / columns,
  );
  return {
    cardWidth,
    isStacked: cardWidth < STACK_BREAKPOINT,
  };
};

/** Soft "floating card" elevation that works on both iOS and Android. */
export const cardShadow = (shadowColor: string): ViewStyle => ({
  shadowColor,
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.1,
  shadowRadius: 14,
  elevation: 4,
});

/** Tinted, uppercase category pill — e.g. "FASHION". */
export const NichePill = ({ label }: { label?: string }) => {
  const { colors } = useTheme();
  return (
    <View
      style={[
        listStyles.pill,
        { backgroundColor: withAlpha(PRIMARY_COLOR, 0.1) },
      ]}
    >
      <Text style={[listStyles.pillText, { color: colors.primary }]}>
        {(label || 'Item').toUpperCase()}
      </Text>
    </View>
  );
};

/** Small outlined metadata chip used for size / colour variants. */
export const VariantChip = ({
  children,
  accentColor,
}: {
  children: React.ReactNode;
  accentColor?: string;
}) => {
  const { colors } = useTheme();
  return (
    <View
      style={[
        listStyles.chip,
        {
          backgroundColor: withAlpha(colors.textMuted, 0.1),
          borderColor: withAlpha(colors.textMuted, 0.22),
        },
      ]}
    >
      {accentColor ? (
        <View style={[listStyles.chipDot, { backgroundColor: accentColor }]} />
      ) : null}
      <Text style={[listStyles.chipText, { color: colors.text }]}>{children}</Text>
    </View>
  );
};

/** Circular icon button used for the remove/delete affordance. */
export const RoundIconButton = ({
  iconName,
  onPress,
  tone = 'danger',
  accessibilityLabel,
}: {
  iconName: string;
  onPress: () => void;
  tone?: 'danger' | 'brand';
  accessibilityLabel?: string;
}) => {
  const { colors } = useTheme();
  const accent = tone === 'danger' ? '#e53935' : colors.primary;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[
        listStyles.iconButton,
        {
          backgroundColor: withAlpha(accent, 0.12),
          borderColor: withAlpha(accent, 0.2),
        },
      ]}
    >
      <MaterialIcons name={iconName} size={18} color={accent} />
    </TouchableOpacity>
  );
};

/**
 * Product media with a gradient scrim so overlaid controls stay readable
 * regardless of how light or busy the underlying photo is. Falls back to a
 * neutral icon when a listing has no media yet.
 */
export const ProductMedia = ({
  uri,
  style,
  children,
}: {
  uri?: string;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}) => {
  const { colors } = useTheme();
  const source: ImageSourcePropType | null = uri ? { uri } : null;

  return (
    <View style={[listStyles.media, { backgroundColor: colors.tint }, style]}>
      {source ? (
        <Image source={source} style={listStyles.mediaImage} resizeMode="cover" />
      ) : (
        <View style={listStyles.mediaFallback}>
          <MaterialIcons
            name="image-not-supported"
            size={26}
            color={colors.textMuted}
          />
        </View>
      )}
      {children ? (
        <>
          <LinearGradient
            colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.38)']}
            style={listStyles.mediaScrim}
            pointerEvents="none"
          />
          {children}
        </>
      ) : null}
    </View>
  );
};

const listStyles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  pillText: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  media: {
    overflow: 'hidden',
    position: 'relative',
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  mediaFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaScrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '55%',
  },
});
