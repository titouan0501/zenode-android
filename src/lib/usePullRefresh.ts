import { useCallback, useState } from 'react';

/** Etat « refreshing » du pull-to-refresh : vrai seulement pendant le geste utilisateur. */
export function usePullRefresh(refetchers: Array<() => unknown | Promise<unknown>>) {
  const [refreshing, setRefreshing] = useState(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.allSettled(refetchers.map((fn) => fn()));
    } finally {
      setRefreshing(false);
    }
  }, refetchers);

  return { refreshing, onRefresh };
}
