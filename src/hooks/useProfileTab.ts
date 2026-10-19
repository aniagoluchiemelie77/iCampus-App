import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchProfileContentAPI } from '../api/localGetApis';

type TabPage = { items: any[]; nextCursor: string | null };

/**
 * One profile tab, loaded a page at a time from /users/profile/:uid/content.
 * `initial` (the Posts page bundled with the profile) avoids a second
 * request on first paint. Pages are cached per tab while the screen lives.
 */
export const useProfileTab = (
  uid: string | undefined,
  tab: string,
  initial?: { tab: string } & TabPage,
  pageSize = 5,
) => {
  const cache = useRef<Record<string, TabPage>>({});
  const seededFor = useRef<string | null>(null);
  if (uid && initial && seededFor.current !== uid) {
    seededFor.current = uid;
    cache.current = { [initial.tab]: { items: initial.items, nextCursor: initial.nextCursor } };
  }
  const [page, setPage] = useState<TabPage | null>(cache.current[tab] || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const load = useCallback(
    async (mode: 'first' | 'more') => {
      if (!uid) return;
      const current = cache.current[tab];
      if (mode === 'more' && !current?.nextCursor) return;
      const id = ++requestId.current;
      setLoading(true);
      setError(null);
      const res = await fetchProfileContentAPI({
        uid,
        tab,
        limit: pageSize,
        cursor: mode === 'more' ? current?.nextCursor : null,
      });
      if (id !== requestId.current) return;
      if (res.success) {
        const next: TabPage =
          mode === 'more' && current
            ? { items: [...current.items, ...res.items], nextCursor: res.nextCursor }
            : { items: res.items, nextCursor: res.nextCursor };
        cache.current[tab] = next;
        setPage(next);
      } else {
        setError(res.message || 'Could not load this tab.');
      }
      setLoading(false);
    },
    [uid, tab, pageSize],
  );

  // Switching tabs: show the cached page instantly, otherwise fetch it.
  useEffect(() => {
    const cached = cache.current[tab];
    setPage(cached || null);
    if (!cached) load('first');
  }, [tab, uid, load]);

  return {
    items: page?.items || [],
    hasMore: !!page?.nextCursor,
    loading,
    error,
    loadMore: () => load('more'),
    reload: () => {
      delete cache.current[tab];
      return load('first');
    },
  };
};
