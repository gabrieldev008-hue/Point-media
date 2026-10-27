import { useQuery } from '@tanstack/react-query';
import type { CurrentUser } from '@pointmedia/shared';
import { api, ApiError } from '../../services/api';
export const sessionKey = ['session'] as const;
export function useSession() {
  return useQuery({ queryKey: sessionKey, queryFn: async () => {
    try { return await api<CurrentUser>('/auth/me'); }
    catch (error) { if (error instanceof ApiError && error.status === 401) return null; throw error; }
  }, retry: false, staleTime: 0, refetchInterval: 60000 });
}
