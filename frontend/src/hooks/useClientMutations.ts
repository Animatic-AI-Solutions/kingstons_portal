import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { ClientDetailsData } from './useClientDetails';
import { BulkClientDataResponse } from './useOptimizedClientData';

export interface ClientFormData {
  name: string | null;
  status: string;
  advisor: string | null;
  type: string | null;
}

export interface ClientUpdateData {
  id: string;
  updates: Partial<ClientFormData>;
}

export interface ProductOwnerUpdateData {
  clientId: string;
  productOwnerId: number;
  action: 'add' | 'remove';
  associationId?: number; // Required for remove action
}

/**
 * Client mutations hook with smart cache invalidation
 * 
 * Provides optimized mutations for:
 * - Client updates (with optimistic updates)
 * - Client deletion (with cache cleanup)
 * - Product owner management (add/remove)
 * - Smart cache invalidation across related queries
 */
export const useClientMutations = () => {
  const queryClient = useQueryClient();
  const { api } = useAuth(); // Use authenticated API instance

  // Update client mutation
  const updateClient = useMutation({
    mutationFn: async (data: ClientUpdateData) => {
      const response = await api.put(`/client_groups/${data.id}`, data.updates);
      return response.data;
    },
    onMutate: async (data: ClientUpdateData) => {
      // Cancel any outgoing refetches for this client
      await queryClient.cancelQueries({ queryKey: ['clients', data.id] });
      
      // Snapshot the previous value
      const previousClient = queryClient.getQueryData(['clients', data.id]);
      
      // Optimistically update the client details cache
      queryClient.setQueryData(['clients', data.id], (old: ClientDetailsData | undefined) => {
        if (!old) return old;
        return { ...old, ...data.updates };
      });
      
      // Optimistically update the clients list cache
      queryClient.setQueryData(['clients'], (old: BulkClientDataResponse | undefined) => {
        if (!old) return old;
        return {
          ...old,
          client_groups: old.client_groups.map(client => 
            client.id === data.id ? { ...client, ...data.updates } : client
          )
        };
      });
      
      return { previousClient };
    },
    onError: (err, data, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      console.error('Client update failed, rolling back optimistic update:', err);
      if (context?.previousClient) {
        queryClient.setQueryData(['clients', data.id], context.previousClient);
      }
    },
    onSettled: (data, error, variables) => {
      // Always refetch after error or success to ensure server state
      queryClient.invalidateQueries({ queryKey: ['clients', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    }
  });

  // Delete client mutation
  const deleteClient = useMutation({
    mutationFn: async (clientId: string) => {
      const response = await api.delete(`/client_groups/${clientId}`);
      return response.data;
    },
    onMutate: async (clientId: string) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['clients'] });
      
      // Snapshot the previous value
      const previousClients = queryClient.getQueryData(['clients']);
      
      // Optimistically remove from clients list
      queryClient.setQueryData(['clients'], (old: BulkClientDataResponse | undefined) => {
        if (!old) return old;
        return {
          ...old,
          client_groups: old.client_groups.filter(client => client.id !== clientId),
          total_count: old.total_count - 1
        };
      });
      
      return { previousClients };
    },
    onError: (err, clientId, context) => {
      // If the mutation fails, use the context to roll back
      console.error('Client deletion failed, rolling back optimistic update:', err);
      if (context?.previousClients) {
        queryClient.setQueryData(['clients'], context.previousClients);
      }
    },
    onSuccess: (data, clientId) => {
      // Remove the specific client from cache
      queryClient.removeQueries({ queryKey: ['clients', clientId] });
      // Invalidate the clients list to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    }
  });

  // Product owner mutations
  const manageProductOwner = useMutation({
    mutationFn: async (data: ProductOwnerUpdateData) => {
      if (data.action === 'add') {
        // Add product owner using authenticated API
        const response = await api.post('client_group_product_owners', {
          client_group_id: Number(data.clientId),
          product_owner_id: data.productOwnerId
        });
        return response.data;
      } else {
        // Remove product owner using authenticated API
        if (!data.associationId) {
          throw new Error('Association ID is required for removing product owner');
        }
        const response = await api.delete(`client_group_product_owners/${data.associationId}`);
        return response.data;
      }
    },
    onSuccess: (data, variables) => {
      // Invalidate client details to refresh product owners
      queryClient.invalidateQueries({ queryKey: ['clients', variables.clientId] });
    },
    onError: (error, variables) => {
      console.error(`❌ Failed to ${variables.action} product owner:`, error);
    }
  });

  // Status change mutations (dormant/active)
  const changeClientStatus = useMutation({
    mutationFn: async (data: { clientId: string; status: string }) => {
      const response = await api.put(`/client_groups/${data.clientId}`, { status: data.status });
      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate both client details and list
      queryClient.invalidateQueries({ queryKey: ['clients', variables.clientId] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
    onError: (error, variables) => {
      console.error(`❌ Failed to change client status:`, error);
    }
  });

  // Global cache invalidation function
  const invalidateAllClientData = () => {
    queryClient.invalidateQueries({ queryKey: ['clients'] });
  };

  return {
    updateClient,
    deleteClient,
    manageProductOwner,
    changeClientStatus,
    invalidateAllClientData,
    
    // Expose loading and error states
    isUpdating: updateClient.isPending,
    isDeleting: deleteClient.isPending,
    isManagingProductOwner: manageProductOwner.isPending,
    isChangingStatus: changeClientStatus.isPending,
    
    updateError: updateClient.error,
    deleteError: deleteClient.error,
    productOwnerError: manageProductOwner.error,
    statusError: changeClientStatus.error,
  };
};

export default useClientMutations; 