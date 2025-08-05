import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export interface ClientProductOwner {
  id: number;
  firstname?: string;
  surname?: string;
  known_as?: string;
  status: string;
  created_at: string;
  association_id?: number;
}

export interface ClientAccount {
  id: number;
  client_id: number;
  product_name: string;
  status: string;
  start_date: string;
  end_date?: string;
  weighting?: number;
  plan_number?: string;
  provider_id?: number;
  provider_name?: string;
  product_type?: string;
  portfolio_id?: number;
  total_value?: number;
  previous_value?: number;
  irr?: number | string;
  risk_rating?: number;
  provider_theme_color?: string;
  template_generation_id?: number;
  template_info?: {
    id: number;
    generation_name: string;
    name?: string;
  };
  product_owners?: ProductOwner[];
  fixed_cost?: number;
  percentage_fee?: number;
}

export interface ProductOwner {
  id: number;
  firstname?: string;
  surname?: string;
  known_as?: string;
  status: string;
  created_at: string;
}

export interface ClientDetailsData {
  id: string;
  name: string | null;
  status: string;
  advisor: string | null;
  type: string | null;
  created_at: string;
  updated_at: string;
  age?: number;
  gender?: string;
  product_owners?: ClientProductOwner[];
  accounts?: ClientAccount[];
  total_value?: number;
  total_irr?: number | string;
}

/**
 * Client details hook with optimized caching for individual client data
 * 
 * Key optimizations:
 * - 10-minute stale time (client details change less frequently than lists)
 * - 20-minute cache retention for fast navigation
 * - Conditional fetching (only when clientId is available)
 * - Smart retry logic for failed requests
 * - Background refetching capabilities
 */
export const useClientDetails = (clientId: string | undefined) => {
  const queryClient = useQueryClient();
  
  const query = useQuery({
    queryKey: ['clients', clientId],
    queryFn: async () => {
      if (!clientId) throw new Error('Client ID is required');
      
      console.log(`🚀 Fetching client details for ID: ${clientId}`);
      try {
        const response = await api.get(`/client_groups/${clientId}/complete`);
        console.log(`✅ Loaded client details for: ${response.data.name || 'Unknown'}`);
        return response.data as ClientDetailsData;
      } catch (error: any) {
        // Handle 404 errors specifically - client was likely deleted
        if (error.response?.status === 404) {
          console.warn(`⚠️ Client ${clientId} not found (404) - may have been deleted`);
          throw new Error(`Client with ID ${clientId} not found`);
        }
        throw error;
      }
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - client details change occasionally
    gcTime: 20 * 60 * 1000, // 20 minutes - keep in cache for fast navigation
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnReconnect: false, // Don't refetch on network reconnect
    enabled: !!clientId, // Only fetch when clientId is available
    retry: (failureCount, error: any) => {
      // Don't retry 404 errors (client deleted/not found)
      if (error.response?.status === 404) {
        return false;
      }
      // Retry other errors up to 3 times
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });

  // Manual cache invalidation for this specific client
  const invalidateClient = () => {
    if (clientId) {
      console.log(`🔄 Invalidating cache for client: ${clientId}`);
      return queryClient.invalidateQueries({ queryKey: ['clients', clientId] });
    }
  };

  // Background refresh without affecting loading states
  const refreshInBackground = () => {
    if (clientId) {
      console.log(`🔄 Background refreshing client: ${clientId}`);
      return queryClient.refetchQueries({ queryKey: ['clients', clientId] });
    }
  };

  // Update client data optimistically
  const updateClientInCache = (updatedData: Partial<ClientDetailsData>) => {
    if (clientId) {
      console.log(`🔄 Optimistically updating client cache: ${clientId}`);
      queryClient.setQueryData(['clients', clientId], (oldData: ClientDetailsData | undefined) => {
        if (!oldData) return oldData;
        return { ...oldData, ...updatedData };
      });
    }
  };

  return {
    ...query,
    invalidateClient,
    refreshInBackground,
    updateClientInCache,
  };
};

export default useClientDetails; 