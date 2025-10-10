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
 * Custom hook for fetching client data with React Query for optimal caching and performance
 * Features:
 * - Single bulk API call (replacing multiple sequential calls)
 * - 5-minute cache duration for fast subsequent loads
 * - Background refetching for fresh data when navigating back
 * - Request deduplication (eliminates duplicate calls)
 * - Automatic retry on failure
 * - Manual refresh capability for post-action updates
 */
export const useClientData = () => {
  const queryClient = useQueryClient();
  
  const query = useQuery({
    queryKey: ['client-bulk-data'],
    queryFn: async () => {
      const response = await getBulkClientData();
      return response.data as BulkClientDataResponse;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - data stays fresh
    gcTime: 10 * 60 * 1000, // 10 minutes - cache retention
    refetchOnWindowFocus: false, // Don't refetch on window focus to avoid unnecessary requests
    refetchOnMount: true, // Enable refetch on mount to get fresh data when navigating back
    retry: 2, // Retry failed requests 2 times
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });

  // Function to force refresh the data (useful after deletions, etc.)
  const forceRefresh = () => {
    return queryClient.invalidateQueries({ queryKey: ['client-bulk-data'] });
  };

  // Function to refresh data in background without affecting UI
  const refreshInBackground = () => {
    return queryClient.refetchQueries({ queryKey: ['client-bulk-data'] });
  };

  return {
    ...query,
    forceRefresh,
    refreshInBackground
  };
};

export default useClientData; 