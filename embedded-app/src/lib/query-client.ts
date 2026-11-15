import { QueryClient } from '@tanstack/react-query';

export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 60_000 } },
  });
