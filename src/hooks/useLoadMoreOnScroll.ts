import { useCallback, useRef } from 'react';

/**
 * FlatList fires `onEndReached` on mount when the first page is shorter than
 * the viewport, and can fire it several times for one scroll. This gates it so
 * `loadMore` runs at most once per user scroll gesture and never while a
 * previous load is still in flight.
 *
 * Spread the result onto the FlatList:
 *   const loadMoreProps = useLoadMoreOnScroll(loadNextPage);
 *   <FlatList {...loadMoreProps} onEndReachedThreshold={0.5} ... />
 */
export const useLoadMoreOnScroll = (loadMore: () => unknown) => {
  const userScrolledRef = useRef(false);
  const inFlightRef = useRef(false);
  const loadMoreRef = useRef(loadMore);
  loadMoreRef.current = loadMore;

  const onScrollBeginDrag = useCallback(() => {
    userScrolledRef.current = true;
  }, []);

  const onEndReached = useCallback(async () => {
    if (!userScrolledRef.current || inFlightRef.current) return;
    userScrolledRef.current = false;
    inFlightRef.current = true;
    try {
      await loadMoreRef.current();
    } finally {
      inFlightRef.current = false;
    }
  }, []);

  return {
    onEndReached,
    onScrollBeginDrag,
    onMomentumScrollBegin: onScrollBeginDrag,
  };
};
