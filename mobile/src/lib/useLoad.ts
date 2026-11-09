import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { errorMessage } from './api';

// Loads data whenever the screen comes into focus (so numbers logged on
// another screen are fresh when you come back), reloads when `deps` change,
// and supports pull-to-refresh.
export function useLoad<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const loaderRef = useRef(loader);
  useEffect(() => { loaderRef.current = loader; });

  const reload = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    try {
      setData(await loaderRef.current());
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setRefreshing(false);
    }
  }, []);

  // A stable key for the caller's dependency values (dates, ranges)
  const depsKey = JSON.stringify(deps);
  // depsKey is intentional: a new date/range must refetch even though reload itself is stable
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useFocusEffect(useCallback(() => { reload(); }, [reload, depsKey]));

  return { data, setData, error, refreshing, reload, refresh: () => reload(true) };
}
