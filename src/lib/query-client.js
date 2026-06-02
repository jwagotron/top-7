import { QueryClient } from '@tanstack/react-query';

export const queryClientInstance = new QueryClient({
  defaultOptions: {
    queries: {
      // Refetch when the user returns to the tab
      refetchOnWindowFocus: true,
      // 5 s staleTime — short enough to catch updates, long enough to avoid hammering
      staleTime: 5_000,
      retry: 1,
    },
  },
});

// ── Console diagnostics (no UI) ──────────────────────────────────────────────
queryClientInstance.getQueryCache().subscribe(({ type, query, action }) => {
  if (type !== 'updated') return;
  if (action?.type === 'invalidate') {
    console.log('[QueryCache:invalidated]', JSON.stringify(query.queryKey));
  } else if (action?.type === 'fetch') {
    console.log('[QueryCache:refetch]', JSON.stringify(query.queryKey));
  }
});