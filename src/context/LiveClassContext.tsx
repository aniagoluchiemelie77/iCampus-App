import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  BackHandler,
  LayoutAnimation,
  PanResponder,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppSelector } from '../hooks/hooks';
import { useTheme } from './ThemeContext';
import { navigationRef } from './navigationContext';
import { LiveClassSessionHost } from '../screens/LiveClassSession';

export const MINI_PLAYER_WIDTH = 196;
export const MINI_PLAYER_HEIGHT = 110 + 44; // 16:9 video + control strip
const EDGE = 12;
// Clears the home screen's bottom tab bar.
const BOTTOM_CLEARANCE = 84;

interface ActiveLiveClass {
  lectureId: string;
  courseId: string;
}

interface LiveClassContextValue {
  active: ActiveLiveClass | null;
  expanded: boolean;
  /** Opens (or re-opens) a class full screen. Replaces any other active class. */
  startLiveClass: (session: ActiveLiveClass) => void;
  expand: () => void;
  /** Shrinks to the floating player; the class keeps running. */
  minimize: () => void;
  /** Tears the class down (after leaving or ending it). */
  endLiveClass: () => void;
  /** Used by the LiveClassSessions route when it loses focus. */
  setExpanded: (expanded: boolean) => void;
}

const LiveClassContext = createContext<LiveClassContextValue | null>(null);

export const useLiveClass = () => {
  const ctx = useContext(LiveClassContext);
  if (!ctx) throw new Error('useLiveClass must be used inside LiveClassProvider');
  return ctx;
};

const animateLayout = () =>
  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

/**
 * Keeps a live class mounted above the navigator so it survives leaving the
 * class screen. Full screen while the LiveClassSessions route is focused (or
 * after tapping the mini player); otherwise a draggable floating player, so a
 * lecturer can open their materials and a student can browse without leaving.
 */
export const LiveClassProvider = ({ children }: { children: React.ReactNode }) => {
  const userUid = useAppSelector(state => state.user?.uid);
  const [active, setActive] = useState<ActiveLiveClass | null>(null);
  const [expanded, setExpandedState] = useState(false);

  const setExpanded = useCallback((next: boolean) => {
    setExpandedState(prev => {
      if (prev !== next) animateLayout();
      return next;
    });
  }, []);

  const startLiveClass = useCallback(
    (session: ActiveLiveClass) => {
      setActive(prev =>
        prev?.lectureId === session.lectureId && prev.courseId === session.courseId
          ? prev
          : session,
      );
      setExpanded(true);
    },
    [setExpanded],
  );

  const minimize = useCallback(() => {
    // The class route is just a blank anchor; leave it rather than show it.
    if (navigationRef.isReady() && navigationRef.getCurrentRoute()?.name === 'LiveClassSessions') {
      if (navigationRef.canGoBack()) navigationRef.goBack();
      else (navigationRef.navigate as any)('Home', { activeTab: 'classroom' });
    }
    setExpanded(false);
  }, [setExpanded]);

  const endLiveClass = useCallback(() => {
    setActive(null);
    setExpandedState(false);
  }, []);

  // Logging out ends the class.
  useEffect(() => {
    if (!userUid) endLiveClass();
  }, [userUid, endLiveClass]);

  // Hardware back shrinks the class instead of closing it.
  useEffect(() => {
    if (!active || !expanded) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      minimize();
      return true;
    });
    return () => sub.remove();
  }, [active, expanded, minimize]);

  const value = useMemo(
    () => ({
      active,
      expanded,
      startLiveClass,
      expand: () => setExpanded(true),
      minimize,
      endLiveClass,
      setExpanded,
    }),
    [active, expanded, startLiveClass, minimize, endLiveClass, setExpanded],
  );

  return (
    <LiveClassContext.Provider value={value}>
      {children}
      {active && (
        // Own provider: the app root has none, and this sits outside the
        // navigator's screens. Absolute so it never takes the navigator's space.
        <SafeAreaProvider style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <LiveClassOverlay
            key={active.lectureId}
            session={active}
            expanded={expanded}
          />
        </SafeAreaProvider>
      )}
    </LiveClassContext.Provider>
  );
};

/**
 * One container for both sizes: swapping wrapper components would remount the
 * class and drop the Agora/socket connection, so only the style changes.
 */
const LiveClassOverlay = ({
  session,
  expanded,
}: {
  session: ActiveLiveClass;
  expanded: boolean;
}) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const pan = useRef(new Animated.ValueXY()).current;

  // Offsets are relative to the bottom-right anchor, so x/y only go negative.
  const bounds = useRef({ minX: 0, minY: 0 });
  bounds.current = {
    minX: -(width - MINI_PLAYER_WIDTH - EDGE * 2),
    minY: -(height - insets.top - insets.bottom - MINI_PLAYER_HEIGHT - BOTTOM_CLEARANCE - EDGE * 2),
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        // Small movements stay taps for the buttons inside.
        onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 6 || Math.abs(g.dy) > 6,
        onPanResponderGrant: () => pan.extractOffset(),
        onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
          useNativeDriver: false,
        }),
        onPanResponderRelease: () => {
          pan.flattenOffset();
          const { minX, minY } = bounds.current;
          const x = (pan.x as any)._value as number;
          const y = (pan.y as any)._value as number;
          // Snap to the nearer side, keep it on screen vertically.
          Animated.spring(pan, {
            toValue: {
              x: x < minX / 2 ? minX : 0,
              y: Math.min(0, Math.max(minY, y)),
            },
            useNativeDriver: false,
            friction: 7,
          }).start();
        },
      }),
    [pan],
  );

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <Animated.View
        style={
          expanded
            ? [StyleSheet.absoluteFill, { backgroundColor: colors.background }]
            : [
                styles.mini,
                {
                  bottom: insets.bottom + BOTTOM_CLEARANCE,
                  backgroundColor: colors.backgroundSecondary,
                  transform: pan.getTranslateTransform(),
                },
              ]
        }
        {...(expanded ? {} : panResponder.panHandlers)}
      >
        <LiveClassSessionHost
          lectureId={session.lectureId}
          courseId={session.courseId}
          minimized={!expanded}
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  mini: {
    position: 'absolute',
    right: EDGE,
    width: MINI_PLAYER_WIDTH,
    height: MINI_PLAYER_HEIGHT,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
});
