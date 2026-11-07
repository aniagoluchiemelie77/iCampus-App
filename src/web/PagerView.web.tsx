/**
 * Web version of react-native-pager-view (which is native-only).
 * Shows one page at a time and supports the ref API the app uses
 * (setPage / setPageWithoutAnimation) plus onPageSelected.
 * No swipe gestures; pages change from the tab bar.
 */
import React, {
  Children,
  forwardRef,
  useImperativeHandle,
  useState,
} from 'react';
import { View, ViewProps } from 'react-native';

type Props = ViewProps & {
  initialPage?: number;
  onPageSelected?: (e: { nativeEvent: { position: number } }) => void;
  children?: React.ReactNode;
};

export type PagerViewHandle = {
  setPage: (index: number) => void;
  setPageWithoutAnimation: (index: number) => void;
  setScrollEnabled: (enabled: boolean) => void;
};

const PagerView = forwardRef<PagerViewHandle, Props>(
  ({ initialPage = 0, onPageSelected, children, style, ...rest }, ref) => {
    const [page, setPageState] = useState(initialPage);
    const pages = Children.toArray(children);

    const goTo = (index: number) => {
      const next = Math.min(Math.max(index, 0), pages.length - 1);
      setPageState(next);
      onPageSelected?.({ nativeEvent: { position: next } });
    };

    useImperativeHandle(ref, () => ({
      setPage: goTo,
      setPageWithoutAnimation: goTo,
      setScrollEnabled: () => {},
    }));

    return (
      <View {...rest} style={style}>
        {pages.map((child, index) => (
          // Keep every page mounted (like the native pager) but show one.
          <View
            key={index}
            style={{ flex: 1, display: index === page ? 'flex' : 'none' }}
          >
            {child}
          </View>
        ))}
      </View>
    );
  },
);

export default PagerView;
export { PagerView };
