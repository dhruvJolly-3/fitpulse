import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { errorMessage } from './api';
import { cache } from './cache';

// Screen data loader, stale-while-revalidate:
//   1. render cached data immediately (memory, then on-device storage)
//   2. fetch fresh data in the background whenever the screen gains focus
//   3. swap it in without a loader or layout jump
// `key` identifies the data, including its parameters (e.g. `water:2026-11-09:7`);
// a new key loads that data. `setData` updates the screen and the cache
// together, which is what optimistic updates use.
export function useLoad<T>(key: string, loader: () => Promise<T>) {
  // Data is stored with the key it belongs to, so a new key never shows old data
  const [slot, setSlot] = useState<{ key: string; data: T | null }>(() => ({ key, data: cache.peek<T>(key) ?? null }));
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const loaderRef = useRef(loader);
  const keyRef = useRef(key);
  useEffect(() => { loaderRef.current = loader; keyRef.current = key; });

  // New key: switch during render to whatever is cached for it in memory
  if (slot.key !== key) setSlot({ key, data: cache.peek<T>(key) ?? null });

  // Not in memory: try on-device storage (a cold start), unless fresh data wins first
  useEffect(() => {
    let active = true;
    if (cache.peek<T>(key) === undefined) {
      cache.read<T>(key).then(v => {
        if (active && v !== undefined) setSlot(cur => (cur.key === key && cur.data == null ? { key, data: v } : cur));
      });
    }
    return () => { active = false; };
  }, [key]);

  const reload = useCallback(async (showSpinner = false) => {
    const k = keyRef.current;
    if (showSpinner) setRefreshing(true);
    try {
      const fresh = await loaderRef.current();
      cache.write(k, fresh);
      setSlot(cur => (cur.key === k ? { key: k, data: fresh } : cur)); // ignore if the user moved on
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setRefreshing(false);
    }
  }, []);

  // `key` is a deliberate trigger: new parameters must refetch even though reload is stable
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useFocusEffect(useCallback(() => { reload(); }, [reload, key]));

  const setData = useCallback((update: (prev: T | null) => T | null) => {
    setSlot(cur => {
      const next = update(cur.data);
      if (next != null) cache.write(cur.key, next);
      return { key: cur.key, data: next };
    });
  }, []);

  const data = slot.key === key ? slot.data : null;
  return { data, setData, error, refreshing, reload, refresh: () => reload(true) };
}
