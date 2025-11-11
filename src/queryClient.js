import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000, // Data fresh for 2 minutes
      cacheTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
      refetchOnWindowFocus: false, // Don't refetch when user returns to tab
      refetchOnMount: true, // ✅ Refetch if data is stale (smart refetching)
      retry: 1, // Only retry failed requests once
    },
  },
});