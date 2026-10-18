import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Image,
  ImageStyle,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { LazyImage } from './LazyImage';

interface LazyRotatingImagesProps {
  urls?: string[] | null;
  /** Delay between automatic rotations. ProductCard historically used 8000ms. */
  intervalMs?: number;
  /** Pause rotation, e.g. while the hosting card is off-screen (feed/pager). */
  paused?: boolean;
  /** Overlay pagination dots (only rendered when there is more than one url). */
  showDots?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  dotContainerStyle?: StyleProp<ViewStyle>;
}

const FADE_OUT_DURATION = 800;
const FADE_IN_DURATION = 800;

/**
 * Auto-rotating image carousel in the spirit of the store card thumbnail:
 * every `intervalMs` the current picture fades slightly, swaps to the next
 * upload and fades back in. Built on top of `LazyImage`, so only the visible
 * frame is ever mounted and the next url is warmed with `Image.prefetch` for a
 * seamless swap. Rotation pauses while `paused` is true — used by the post
 * feed so only the card on screen keeps animating inside the home PagerView.
 */
export const LazyRotatingImages = ({
  urls,
  intervalMs = 8000,
  paused = false,
  showDots = false,
  containerStyle,
  imageStyle,
  dotContainerStyle,
}: LazyRotatingImagesProps) => {
  const safeUrls = useMemo(
    () => (Array.isArray(urls) ? urls.filter(u => typeof u === 'string' && u) : []),
    [urls],
  );
  const [index, setIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Clamp the active index if the url list shrinks between renders.
  useEffect(() => {
    if (index >= safeUrls.length) {
      setIndex(0);
    }
  }, [index, safeUrls.length]);

  useEffect(() => {
    if (safeUrls.length <= 1 || paused) {
      return;
    }

    const interval = setInterval(() => {
      Animated.timing(fadeAnim, {
        toValue: 0.3,
        duration: FADE_OUT_DURATION,
        useNativeDriver: true,
      }).start(() => {
        setIndex(prevIndex => (prevIndex + 1) % safeUrls.length);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: FADE_IN_DURATION,
          useNativeDriver: true,
        }).start();
      });
    }, intervalMs);

    return () => {
      clearInterval(interval);
      // A card scrolled away mid-fade must never come back dimmed.
      fadeAnim.stopAnimation();
      fadeAnim.setValue(1);
    };
  }, [safeUrls.length, paused, intervalMs, fadeAnim]);

  // Warm the upcoming frame so the rotation swap never shows a placeholder.
  useEffect(() => {
    if (safeUrls.length < 2) {
      return;
    }
    const nextUrl = safeUrls[(index + 1) % safeUrls.length];
    if (nextUrl) {
      Image.prefetch(nextUrl).catch(() => {});
    }
  }, [index, safeUrls]);

  if (!safeUrls.length) {
    return null;
  }

  return (
    <Animated.View
      style={[rotatingStyles.fill, { opacity: fadeAnim }, containerStyle]}
    >
      <LazyImage
        uri={safeUrls[index % safeUrls.length]}
        style={imageStyle ?? rotatingStyles.fill}
      />
      {showDots && safeUrls.length > 1 && (
        <View style={[rotatingStyles.pagination, dotContainerStyle]}>
          {safeUrls.map((_, i) => (
            <View
              key={i}
              style={[rotatingStyles.dot, i === index && rotatingStyles.activeDot]}
            />
          ))}
        </View>
      )}
    </Animated.View>
  );
};

const rotatingStyles = StyleSheet.create({
  fill: {
    width: '100%',
    height: '100%',
  },
  pagination: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 12,
    right: 5,
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.4)',
    marginHorizontal: 3,
  },
  activeDot: {
    backgroundColor: '#fff',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});