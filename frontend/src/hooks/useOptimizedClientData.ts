import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getBulkClientData } from '../services/api';

export interface ClientGroup {
  id: string;
  name: string | null;
  status: string;
  advisor: string | null;
  type: string | null;
  created_at: string;
  updated_at: string;
  fum: number;
  active_products: number;
  total_funds: number;
  products: Product[];
}

export interface Product {
  id: string;
  product_name: string;
  product_type: string;
  start_date: string;
  end_date: string | null;
  status: string;
  portfolio_id: string | null;
  provider_id: string | null;
  provider_name: string | null;
  provider_theme_color: string | null;
  portfolio_name: string | null;
  active_fund_count: number;
  inactive_fund_count: number;
  product_total_value: number;
}

export interface BulkClientDataResponse {
  client_groups: ClientGroup[];
  total_count: number;
  total_fum: number;
  metadata: {
    query_time: string;
    cache_eligible: boolean;
  };
}

/**
 * Optimized client data hook with strategic caching for performance
 * 
 * Key optimizations:
 * - 15-minute stale time (client data changes rarely)
 * - 30-minute cache retention for fast subsequent loads
 * - Disabled window focus refetching (prevents unnecessary API calls)
 * - Smart retry logic with exponential backoff
 * - Manual cache invalidation capabilities
 */
export const useOptimizedClientData = () => {
  const queryClient = useQueryClient();
  
  const query = useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      console.log('🚀 Fetching optimized client data...');
      const response = await getBulkClientData();
      console.log(`✅ Loaded ${response.data.client_groups.length} clients with total FUM: £${response.data.total_fum?.toLocaleString() || 0}`);
      return response.data as BulkClientDataResponse;
    },
    staleTime: 15 * 60 * 1000, // 15 minutes - client data changes rarely
    gcTime: 30 * 60 * 1000, // 30 minutes - keep in cache longer
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnReconnect: false, // Don't refetch on network reconnect
    retry: 3, // Retry failed requests 3 times
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });

  // Manual cache invalidation for post-action updates
  const invalidateClients = () => {
    console.log('🔄 Invalidating clients cache...');
    return queryClient.invalidateQueries({ queryKey: ['clients'] });
  };

  // Background refresh without affecting loading states
  const refreshInBackground = () => {
    console.log('🔄 Refreshing clients in background...');
    return queryClient.refetchQueries({ queryKey: ['clients'] });
  };

  // Prefetch client details for performance
  const prefetchClientDetails = (clientId: string) => {
    queryClient.prefetchQuery({
      queryKey: ['clients', clientId],
      queryFn: () => import('../services/api').then(api => api.default.get(`/client_groups/${clientId}/complete`)),
      staleTime: 10 * 60 * 1000, // 10 minutes
    });
  };

  return {
    ...query,
    invalidateClients,
    refreshInBackground,
    prefetchClientDetails,
  };
};

export default useOptimizedClientData; 