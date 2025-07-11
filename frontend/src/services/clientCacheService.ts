import { QueryClient } from '@tanstack/react-query';
import { ClientDetailsData } from '../hooks/useClientDetails';
import { BulkClientDataResponse } from '../hooks/useOptimizedClientData';

/**
 * Centralized cache service for client-related data
 * 
 * Provides a clean API for:
 * - Cache invalidation strategies
 * - Optimistic updates
 * - Cache cleanup
 * - Performance optimization
 */
export class ClientCacheService {
  constructor(private queryClient: QueryClient) {}

  /**
   * Invalidate client list data
   * Use when: Client is added, deleted, or list needs refresh
   */
  invalidateClientList() {
    console.log('🔄 Invalidating client list cache...');
    return this.queryClient.invalidateQueries({ queryKey: ['clients'] });
  }

  /**
   * Invalidate specific client details
   * Use when: Client details are modified
   */
  invalidateClientDetails(clientId: string) {
    console.log(`🔄 Invalidating client details cache for: ${clientId}`);
    return this.queryClient.invalidateQueries({ queryKey: ['clients', clientId] });
  }

  /**
   * Invalidate all client-related data
   * Use when: Major data changes that affect multiple clients
   */
  invalidateAllClientData() {
    console.log('🔄 Invalidating all client data...');
    return this.queryClient.invalidateQueries({ queryKey: ['clients'] });
  }

  /**
   * Optimistically update client in list cache
   * Use when: Client data is updated and you want immediate UI feedback
   */
  updateClientInList(clientId: string, updates: Partial<any>) {
    console.log(`🔄 Optimistically updating client in list: ${clientId}`);
    
    this.queryClient.setQueryData(['clients'], (oldData: BulkClientDataResponse | undefined) => {
      if (!oldData) return oldData;
      
      return {
        ...oldData,
        client_groups: oldData.client_groups.map(client => 
          client.id === clientId ? { ...client, ...updates } : client
        )
      };
    });
  }

  /**
   * Optimistically update client details cache
   * Use when: Client details are updated and you want immediate UI feedback
   */
  updateClientDetails(clientId: string, updates: Partial<ClientDetailsData>) {
    console.log(`🔄 Optimistically updating client details: ${clientId}`);
    
    this.queryClient.setQueryData(['clients', clientId], (oldData: ClientDetailsData | undefined) => {
      if (!oldData) return oldData;
      return { ...oldData, ...updates };
    });
  }

  /**
   * Remove client from all caches
   * Use when: Client is deleted
   */
  removeClientFromCache(clientId: string) {
    console.log(`🗑️ Removing client from cache: ${clientId}`);
    
    // Remove client details cache
    this.queryClient.removeQueries({ queryKey: ['clients', clientId] });
    
    // Remove client from list cache
    this.queryClient.setQueryData(['clients'], (oldData: BulkClientDataResponse | undefined) => {
      if (!oldData) return oldData;
      
      return {
        ...oldData,
        client_groups: oldData.client_groups.filter(client => client.id !== clientId),
        total_count: oldData.total_count - 1
      };
    });
  }

  /**
   * Prefetch client details for performance
   * Use when: User hovers over client or navigates to client-related page
   */
  prefetchClientDetails(clientId: string) {
    console.log(`⚡ Prefetching client details: ${clientId}`);
    
    return this.queryClient.prefetchQuery({
      queryKey: ['clients', clientId],
      queryFn: () => import('../services/api').then(api => api.default.get(`/client_groups/${clientId}/complete`)),
      staleTime: 10 * 60 * 1000, // 10 minutes
    });
  }

  /**
   * Get current client data from cache (without triggering fetch)
   * Use when: Need to check current cached data
   */
  getCurrentClientData(clientId: string): ClientDetailsData | undefined {
    return this.queryClient.getQueryData(['clients', clientId]);
  }

  /**
   * Get current client list from cache (without triggering fetch)
   * Use when: Need to check current cached list
   */
  getCurrentClientList(): BulkClientDataResponse | undefined {
    return this.queryClient.getQueryData(['clients']);
  }

  /**
   * Cancel all outgoing client requests
   * Use when: Need to prevent race conditions during mutations
   */
  cancelClientRequests(clientId?: string) {
    console.log(`⏹️ Canceling client requests${clientId ? ` for: ${clientId}` : ''}`);
    
    if (clientId) {
      return this.queryClient.cancelQueries({ queryKey: ['clients', clientId] });
    }
    
    return this.queryClient.cancelQueries({ queryKey: ['clients'] });
  }

  /**
   * Background refresh without affecting loading states
   * Use when: Want to refresh data silently
   */
  backgroundRefresh(clientId?: string) {
    console.log(`🔄 Background refresh${clientId ? ` for client: ${clientId}` : ' all clients'}`);
    
    if (clientId) {
      return this.queryClient.refetchQueries({ queryKey: ['clients', clientId] });
    }
    
    return this.queryClient.refetchQueries({ queryKey: ['clients'] });
  }

  /**
   * Clear all client caches
   * Use when: Major system changes or logout
   */
  clearAllClientCaches() {
    console.log('🧹 Clearing all client caches...');
    this.queryClient.removeQueries({ queryKey: ['clients'] });
  }

  /**
   * Handle navigation-based cache updates
   * Use when: User navigates back after an action
   */
  handleNavigationCacheUpdate(
    actions: {
      invalidate?: string[][];
      remove?: string[][];
      update?: { queryKey: string[]; data: any }[];
    }
  ) {
    console.log('🔄 Handling navigation-based cache updates...');
    
    // Invalidate queries
    actions.invalidate?.forEach(queryKey => {
      this.queryClient.invalidateQueries({ queryKey });
    });
    
    // Remove queries
    actions.remove?.forEach(queryKey => {
      this.queryClient.removeQueries({ queryKey });
    });
    
    // Update queries
    actions.update?.forEach(({ queryKey, data }) => {
      this.queryClient.setQueryData(queryKey, data);
    });
  }

  /**
   * Get cache statistics for debugging
   * Use when: Need to debug cache issues
   */
  getCacheStats() {
    const cache = this.queryClient.getQueryCache();
    const clientQueries = cache.getAll().filter(query => 
      query.queryKey[0] === 'clients'
    );
    
    return {
      totalClientQueries: clientQueries.length,
      clientListCached: !!this.queryClient.getQueryData(['clients']),
      clientDetailsCached: clientQueries.filter(q => q.queryKey.length === 2).length,
      lastUpdate: new Date().toISOString(),
    };
  }
}

/**
 * Hook to use the client cache service
 * Use this instead of creating the service directly
 */
export const useClientCacheService = () => {
  const queryClient = new QueryClient();
  return new ClientCacheService(queryClient);
};

export default ClientCacheService; 