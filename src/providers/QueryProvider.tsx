/**
 * TanStack Query Provider
 *
 * Provides React Query context for data fetching, caching, and synchronization.
 * Configured with sensible defaults for a workflow automation platform.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ReactNode, useState } from 'react';

interface QueryProviderProps {
  children: ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Stale time: 30 seconds - data is considered fresh for this duration
            staleTime: 30 * 1000,
            // Cache time: 5 minutes - unused data stays in cache
            gcTime: 5 * 60 * 1000,
            // Retry failed requests 3 times with exponential backoff
            retry: 3,
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
            // Refetch on window focus for real-time data
            refetchOnWindowFocus: true,
            // Don't refetch on reconnect for stable UX
            refetchOnReconnect: 'always',
            // Network mode for offline support
            networkMode: 'offlineFirst',
          },
          mutations: {
            // Retry mutations once
            retry: 1,
            // Network mode
            networkMode: 'offlineFirst',
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* DevTools only in development */}
      {import.meta.env.DEV && (
        <ReactQueryDevtools
          initialIsOpen={false}
          position="bottom"
          buttonPosition="bottom-right"
        />
      )}
    </QueryClientProvider>
  );
}

// Export query client for use in loaders and other places
export { QueryClient };
