import { QueryClient } from '@tanstack/react-query';

export const queryClientInstance = new QueryClient({
	defaultOptions: {
		queries: {
			// Refetch when the user comes back to the tab — fixes stale dashboard/coach-panel data
			refetchOnWindowFocus: true,
			// Keep data fresh for 20s before it's considered stale; prevents hammering the API
			staleTime: 20_000,
			retry: 1,
		},
	},
});