import { AppState, type AppStateStatus } from 'react-native';
import { focusManager, QueryClient } from '@tanstack/react-query';

import { isApiError } from './client';

export const STALE_LIST_MS = 15_000;
export const STALE_USER_MS = 60_000;
export const POLL_DETAIL_MS = 10_000;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      networkMode: 'always',
      staleTime: STALE_LIST_MS,
      refetchOnReconnect: false,
      retry: (count, error) => {
        if (count >= 1) return false;
        // une seule nouvelle tentative sur coupure reseau / 5xx
        return isApiError(error) && (error.status === 0 || error.status >= 500);
      },
      retryDelay: 800,
    },
    mutations: { networkMode: 'always', retry: false },
  },
});

// React Query : "focus" = app au premier plan (pas de window en RN).
function onAppState(status: AppStateStatus) {
  focusManager.setFocused(status === 'active');
}
AppState.addEventListener('change', onAppState);
