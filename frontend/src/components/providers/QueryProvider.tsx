'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 3 * 60 * 1000,   // 3 dk — önce cache göster
            gcTime: 10 * 60 * 1000,      // 10 dk — bellekte tut
            retry: 1,
            // Sekme odaklandığında otomatik refetch KAPALI
            // Bu ayar 3-4 saniyelik gecikmenin başlıca sebebiydi
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
