import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  ImageStyle,
  InteractionManager,
  StyleProp,
  View,
  ViewStyle,
} from 'react-native';

interface LazyImageProps {
  /** Uri to load. While empty (or not yet visible) only a placeholder renders. */
  uri?: string | null;
  style?: StyleProp<ImageStyle>;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
  /**
   * Viewability gate. Pass false while the hosting card/slide is off-screen so
   * the image is not fetched until it becomes visible. Once a uri has started
   * loading it stays mounted even if `visible` flips back to false, so cards
   * that scroll out of view never blank out again.
   */
  visible?: boolean;
  placeholderColor?: string;
  onLoad?: () => void;
  onError?: () => void;
}

/** Max wait for interactions (scroll/settle animations) before loading anyway. */
const FALLBACK_LOAD_DELAY = 400;
const FADE_DURATION = 220;

/**
 * Drop-in replacement for `Image` that defers the network request until the
 * image is actually needed:
 *
 * 1. Renders a lightweight placeholder `View` instead of mounting the native
 *    image view immediately.
 * 2. Waits for the parent to report `visible` (viewability) when provided.
 * 3. Defers the first load until `InteractionManager` reports idle so feed
 *    scrolling/settling is never fighting image decode work (a fallback timer
 *    guarantees the load even if interactions stall).
 * 4. Fades the picture in once decoded.
 *
 * Subsequent uri swaps on the same instance (e.g. carousel rotation) load
 * immediately, since they are prefetched and delaying them would stall the
 * rotation animation.
 */
export const LazyImage = ({
  uri,
  style,
  resizeMode = 'cover',
  visible = true,
  placeholderColor = 'rgba(0,0,0,0.05)',
  onLoad,
  onError,
}: LazyImageProps) => {
  const [loadedUri, setLoadedUri] = useState<string | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const hasTriggeredOnce = useRef(false);

  useEffect(() => {
    if (!uri || !visible || loadedUri === uri) {
      return;
    }

    const trigger = () => {
      hasTriggeredOnce.current = true;
      opacity.setValue(0);
      setLoadedUri(uri);
    };

    // First load waits for idle time; later uri swaps are already prefetched
    // by their carousel and must not wait for the running fade animation.
    if (hasTriggeredOnce.current) {
      trigger();
      return;
    }

    let cancelled = false;
    const deferred = InteractionManager.runAfterInteractions(() => {
      if (!cancelled) {
        trigger();
      }
    });
    const fallback = setTimeout(() => {
      if (!cancelled) {
        trigger();
      }
    }, FALLBACK_LOAD_DELAY);

    return () => {
      cancelled = true;
      deferred.cancel();
      clearTimeout(fallback);
    };
  }, [uri, visible, loadedUri, opacity]);

  if (!uri || loadedUri !== uri) {
    return (
      <View
        style={[style as StyleProp<ViewStyle>, { backgroundColor: placeholderColor }]}
      />
    );
  }

  return (
    <Animated.Image
      source={{ uri }}
      style={[style, { opacity }]}
      resizeMode={resizeMode}
      onLoad={() => {
        Animated.timing(opacity, {
          toValue: 1,
          duration: FADE_DURATION,
          useNativeDriver: true,
        }).start(({ finished }) => {
          if (finished) onLoad?.();
        });
      }}
      onError={onError}
    />
  );
};