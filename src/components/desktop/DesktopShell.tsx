/**
 * Desktop web layout: three columns on every screen.
 *
 *   [ profile menu ]  [ the current screen ]  [ actions for this screen ]
 *
 * The shell sits around the stack navigator (and the providers that draw
 * full-window overlays such as the live class), so the middle column is the
 * whole app as phones see it and the side columns stay put while you move
 * between screens.
 *
 * Right rail content, most specific first:
 *  1. whatever the focused screen registers with `useRightRail`,
 *  2. a default for the route (`DefaultRail`),
 *  3. the ads banner.
 *
 * On phones, tablets and narrow browser windows nothing changes: the shell
 * renders its children only.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Platform, StyleSheet, View, useWindowDimensions } from 'react-native';
import {
  NavigationContext,
  NavigationRouteContext,
} from '@react-navigation/native';
import { useAppSelector } from '../../hooks/hooks';
import { useTheme } from '../../context/ThemeContext';

export const SIDEBAR_WIDTH = 280;
export const RAIL_WIDTH = 320;
const COLUMN_GAP = 16;
const OUTER_PADDING = 16;
const BODY_MAX_WIDTH = 1600;
/** Below this the left sidebar is hidden (the avatar opens the drawer). */
export const SIDEBAR_BREAKPOINT = 1024;
/** Below this the right rail is hidden. */
export const RAIL_BREAKPOINT = 1280;

/** Screens drawn edge to edge, without the side columns. */
const FULL_SCREEN_ROUTES = new Set([
  'SignUp',
  'SignupPage',
  'Login',
  'ForgotPasswordScreen',
  'SuspendedScreen',
]);

type ActiveScreen = { navigation: any; route: any };
type RailEntry = { id: number; element: React.ReactNode };

type ShellContextValue = {
  /** Side columns are showing. */
  isDesktop: boolean;
  showRail: boolean;
  /** Width of the middle column (the window width when not on desktop). */
  contentWidth: number;
  setActiveScreen: (screen: ActiveScreen) => void;
  setRail: (id: number, element: React.ReactNode) => void;
  clearRail: (id: number) => void;
};

const ShellContext = createContext<ShellContextValue | null>(null);

export const useDesktopShell = () => useContext(ShellContext);

/**
 * Width available to the current screen. Use this instead of the window
 * width to size cards and grids: on desktop the screen is only the middle
 * column.
 */
export const useContentWidth = () => {
  const shell = useContext(ShellContext);
  const { width } = useWindowDimensions();
  return shell?.isDesktop ? shell.contentWidth : width;
};

/** Tracks focus without throwing outside a navigator (e.g. overlays). */
const useSafeIsFocused = () => {
  const navigation = useContext(NavigationContext) as any;
  const [focused, setFocused] = useState(() =>
    navigation ? navigation.isFocused() : true,
  );
  useEffect(() => {
    if (!navigation) return;
    setFocused(navigation.isFocused());
    const offFocus = navigation.addListener('focus', () => setFocused(true));
    const offBlur = navigation.addListener('blur', () => setFocused(false));
    return () => {
      offFocus();
      offBlur();
    };
  }, [navigation]);
  return focused;
};

let nextRailId = 1;

/**
 * Puts content in the right rail while this screen is focused (desktop
 * only). The element keeps this screen's navigation context, so components
 * inside it can use `useNavigation()` as usual.
 *
 *   useRightRail(() => <ProfileRail profile={profile} />, [profile]);
 */
export const useRightRail = (
  render: () => React.ReactNode,
  deps: React.DependencyList,
  enabled = true,
) => {
  const shell = useContext(ShellContext);
  const navigation = useContext(NavigationContext);
  const route = useContext(NavigationRouteContext);
  const focused = useSafeIsFocused();
  const idRef = useRef<number>(0);
  if (!idRef.current) idRef.current = nextRailId++;
  const active = !!shell?.showRail && enabled && focused;

  useEffect(() => {
    if (!shell || !active) return;
    let element = render();
    if (navigation) {
      element = (
        <NavigationContext.Provider value={navigation}>
          <NavigationRouteContext.Provider value={route}>
            {element}
          </NavigationRouteContext.Provider>
        </NavigationContext.Provider>
      );
    }
    shell.setRail(idRef.current, element);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, shell?.setRail, navigation, route, ...deps]);

  useEffect(() => {
    if (active || !shell) return;
    shell.clearRail(idRef.current);
  }, [active, shell]);

  useEffect(() => {
    const id = idRef.current;
    return () => shell?.clearRail(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shell?.clearRail]);
};

/**
 * Navigator `screenLayout`: tells the shell which screen is focused, so the
 * side columns can use that screen's navigation and pick a default rail.
 */
export const ScreenFrame = ({
  children,
  navigation,
  route,
}: {
  children: React.ReactNode;
  navigation: any;
  route: any;
}) => {
  const shell = useContext(ShellContext);
  const report = useCallback(() => {
    shell?.setActiveScreen({ navigation, route });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shell?.setActiveScreen, navigation, route]);
  useEffect(() => {
    if (!shell) return;
    if (navigation.isFocused()) report();
    return navigation.addListener('focus', report);
  }, [shell, navigation, report]);
  return <>{children}</>;
};

type Props = {
  children: React.ReactNode;
  /** Left column (rendered with the focused screen's navigation). */
  renderSidebar: () => React.ReactNode;
  /** Right column fallback for a route when no screen registered one. */
  renderDefaultRail: (routeName: string | undefined) => React.ReactNode;
};

export const DesktopShell = ({
  children,
  renderSidebar,
  renderDefaultRail,
}: Props) => {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const signedIn = !!useAppSelector((state: any) => state.user?.uid);
  const [active, setActive] = useState<ActiveScreen | null>(null);
  const [rails, setRails] = useState<RailEntry[]>([]);
  const [measuredCenter, setMeasuredCenter] = useState(0);

  const routeName: string | undefined = active?.route?.name;
  const wideEnough = Platform.OS === 'web' && width >= SIDEBAR_BREAKPOINT;
  const isDesktop =
    wideEnough && signedIn && !FULL_SCREEN_ROUTES.has(routeName || '');
  const showRail = isDesktop && width >= RAIL_BREAKPOINT;

  const bodyWidth = Math.min(width, BODY_MAX_WIDTH);
  const computedCenter =
    bodyWidth -
    OUTER_PADDING * 2 -
    SIDEBAR_WIDTH -
    COLUMN_GAP -
    (showRail ? RAIL_WIDTH + COLUMN_GAP : 0);
  const contentWidth = measuredCenter || computedCenter;

  const setActiveScreen = useCallback((screen: ActiveScreen) => {
    setActive(prev =>
      prev?.route?.key === screen.route?.key &&
      prev?.navigation === screen.navigation
        ? prev
        : screen,
    );
  }, []);
  const setRail = useCallback((id: number, element: React.ReactNode) => {
    setRails(prev => [...prev.filter(r => r.id !== id), { id, element }]);
  }, []);
  const clearRail = useCallback((id: number) => {
    setRails(prev =>
      prev.some(r => r.id === id) ? prev.filter(r => r.id !== id) : prev,
    );
  }, []);

  const value = useMemo<ShellContextValue>(
    () => ({
      isDesktop,
      showRail,
      contentWidth: isDesktop ? contentWidth : width,
      setActiveScreen,
      setRail,
      clearRail,
    }),
    [isDesktop, showRail, contentWidth, width, setActiveScreen, setRail, clearRail],
  );

  const withScreenNavigation = (node: React.ReactNode) =>
    active ? (
      <NavigationContext.Provider value={active.navigation}>
        <NavigationRouteContext.Provider value={active.route}>
          {node}
        </NavigationRouteContext.Provider>
      </NavigationContext.Provider>
    ) : (
      node
    );

  const registered = rails.length ? rails[rails.length - 1].element : null;

  return (
    <ShellContext.Provider value={value}>
      <View
        style={[
          styles.root,
          isDesktop && { backgroundColor: colors.background },
        ]}
      >
        <View style={[styles.body, isDesktop && styles.bodyDesktop]}>
          {isDesktop && (
            <View style={styles.sidebar}>
              {withScreenNavigation(renderSidebar())}
            </View>
          )}
          <View
            style={styles.center}
            onLayout={
              isDesktop
                ? e => setMeasuredCenter(Math.round(e.nativeEvent.layout.width))
                : undefined
            }
          >
            {children}
          </View>
          {showRail && (
            <View style={styles.rail}>
              {registered ?? withScreenNavigation(renderDefaultRail(routeName))}
            </View>
          )}
        </View>
      </View>
    </ShellContext.Provider>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { flex: 1 },
  bodyDesktop: {
    flexDirection: 'row',
    width: '100%',
    maxWidth: BODY_MAX_WIDTH,
    alignSelf: 'center',
    paddingHorizontal: OUTER_PADDING,
    columnGap: COLUMN_GAP,
  },
  sidebar: {
    width: SIDEBAR_WIDTH,
    paddingVertical: 12,
  },
  // `position: relative` + overflow so full-window overlays drawn by the
  // providers inside (live class, uploads) fill this column only.
  center: {
    flex: 1,
    minWidth: 0,
    position: 'relative',
    overflow: 'hidden',
  },
  rail: {
    width: RAIL_WIDTH,
    paddingVertical: 12,
  },
});
