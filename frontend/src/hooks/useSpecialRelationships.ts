/**
 * Special Relationships React Query Hooks (Cycle 3 - REFACTOR Phase)
 *
 * Provides React Query hooks for managing special relationships with:
 * - Query hook for fetching relationships
 * - Mutation hooks for create/update/delete operations
 * - Optimistic updates with rollback on error
 * - Cache invalidation after mutations
 * - Undo capability for delete operations (5-second window)
 *
 * Cache Strategy (from performance_optimization_guide.md):
 * - staleTime: 5 minutes (300000ms)
 * - gcTime: 10 minutes (600000ms)
 * - refetchOnWindowFocus: false
 *
 * @module useSpecialRelationships
 */

import { useQuery, useMutation, useQueryClient, QueryClient } from '@tanstack/react-query';
import {
  fetchSpecialRelationships,
  createSpecialRelationship,
  updateSpecialRelationship,
  updateSpecialRelationshipStatus,
  deleteSpecialRelationship,
  CreateSpecialRelationshipData,
  UpdateSpecialRelationshipData,
  SpecialRelationshipFilters,
} from '@/services/specialRelationshipsApi';
import { SpecialRelationship, RelationshipStatus } from '@/types/specialRelationship';

// =============================================================================
// Constants
// =============================================================================

const STALE_TIME = 5 * 60 * 1000; // 5 minutes
const GC_TIME = 10 * 60 * 1000; // 10 minutes

// =============================================================================
// Query Key Factory
// =============================================================================

/**
 * Query key factory for special relationships.
 * Provides consistent query keys for cache management and invalidation.
 *
 * @example
 * ```ts
 * // Invalidate all special relationships queries
 * queryClient.invalidateQueries({ queryKey: specialRelationshipsKeys.all });
 *
 * // Invalidate specific client group
 * queryClient.invalidateQueries({
 *   queryKey: specialRelationshipsKeys.byClientGroup('cg-123')
 * });
 * ```
 */
export const specialRelationshipsKeys = {
  /** Base key for all special relationships queries */
  all: ['specialRelationships'] as const,
  /**
   * Key for client group-specific queries
   * @param clientGroupId - The client group ID
   */
  byClientGroup: (clientGroupId: string) => ['specialRelationships', clientGroupId] as const,
};

// =============================================================================
// Types
// =============================================================================

/**
 * Context returned from optimistic update mutations for rollback on error
 */
interface OptimisticUpdateContext {
  /** Snapshot of previous query data for rollback */
  previousData: Array<[any, any]>;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Performs an optimistic update on all special relationships queries in the cache.
 * Cancels outgoing queries, snapshots previous data, and applies the update function.
 *
 * @param queryClient - React Query client instance
 * @param updateFn - Function to apply to each relationship in the cache
 * @returns Context with previous data for rollback on error
 *
 * @example
 * ```ts
 * const context = await performOptimisticUpdate(queryClient, (rel) =>
 *   rel.id === 'rel-1' ? { ...rel, status: 'Inactive' } : rel
 * );
 * ```
 */
async function performOptimisticUpdate(
  queryClient: QueryClient,
  updateFn: (relationship: SpecialRelationship) => SpecialRelationship
): Promise<OptimisticUpdateContext> {
  // Cancel outgoing refetches to avoid overwriting optimistic update
  await queryClient.cancelQueries({
    queryKey: specialRelationshipsKeys.all,
  });

  // Snapshot previous values for rollback
  const previousData: Array<[any, any]> = [];

  // Update all special relationships queries in cache
  const queries = queryClient.getQueryCache().getAll();
  for (const query of queries) {
    const key = query.queryKey;
    // Check if this is a special relationships query
    if (Array.isArray(key) && key.length >= 2 && key[0] === 'specialRelationships') {
      const oldData = queryClient.getQueryData<SpecialRelationship[]>(key);
      if (oldData && Array.isArray(oldData) && oldData.length > 0) {
        previousData.push([key, oldData]);
        const newData = oldData.map(updateFn);
        queryClient.setQueryData<SpecialRelationship[]>(key, newData);
      }
    }
  }

  return { previousData };
}

/**
 * Rolls back optimistic updates by restoring previous query data.
 *
 * @param queryClient - React Query client instance
 * @param context - Context containing previous data snapshots
 */
function rollbackOptimisticUpdate(
  queryClient: QueryClient,
  context: OptimisticUpdateContext | undefined
): void {
  if (context?.previousData) {
    context.previousData.forEach(([queryKey, data]) => {
      queryClient.setQueryData(queryKey, data);
    });
  }
}

/**
 * Invalidates all special relationships queries to trigger refetch.
 *
 * @param queryClient - React Query client instance
 */
function invalidateAllQueries(queryClient: QueryClient): void {
  queryClient.invalidateQueries({
    queryKey: specialRelationshipsKeys.all,
  });
}

// =============================================================================
// Query Hook
// =============================================================================

/**
 * Query hook for fetching special relationships for a client group.
 * Supports optional filtering by relationship type and status.
 *
 * Features:
 * - Automatic caching with 5-minute stale time
 * - Disabled when clientGroupId is null/undefined
 * - No refetch on window focus (prevents unnecessary API calls)
 *
 * @param clientGroupId - Client group ID (query disabled if null/undefined)
 * @param options - Optional configuration
 * @param options.filters - Filters for relationship type and/or status
 * @returns React Query result with relationships data, loading, and error states
 *
 * @example
 * ```tsx
 * // Fetch all relationships
 * const { data, isLoading, error } = useSpecialRelationships('cg-123');
 *
 * // Fetch with filters
 * const { data } = useSpecialRelationships('cg-123', {
 *   filters: { type: 'personal', status: 'Active' }
 * });
 *
 * // Disabled query (doesn't fetch)
 * const { data } = useSpecialRelationships(null);
 * ```
 */
export function useSpecialRelationships(
  clientGroupId: string | null | undefined,
  options?: { filters?: SpecialRelationshipFilters }
) {
  return useQuery({
    queryKey: specialRelationshipsKeys.byClientGroup(clientGroupId || ''),
    queryFn: () => fetchSpecialRelationships(clientGroupId!, options?.filters),
    enabled: !!clientGroupId,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    refetchOnWindowFocus: false,
  });
}

// =============================================================================
// Mutation Hooks
// =============================================================================

/**
 * Mutation hook for creating new special relationships.
 *
 * Features:
 * - Invalidates all queries after successful creation (triggers refetch)
 * - Returns newly created relationship in mutation result
 *
 * @returns React Query mutation result with mutate/mutateAsync functions
 *
 * @example
 * ```tsx
 * const createMutation = useCreateSpecialRelationship();
 *
 * const handleCreate = () => {
 *   createMutation.mutate({
 *     client_group_id: 'cg-123',
 *     relationship_type: 'Spouse',
 *     status: 'Active',
 *     first_name: 'Jane',
 *     last_name: 'Doe',
 *   }, {
 *     onSuccess: (newRelationship) => {
 *       console.log('Created:', newRelationship);
 *     }
 *   });
 * };
 * ```
 */
export function useCreateSpecialRelationship() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createSpecialRelationship,
    onSuccess: () => {
      // Invalidate all special relationships queries to trigger refetch
      invalidateAllQueries(queryClient);
    },
  });
}

/**
 * Mutation hook for updating existing special relationships.
 *
 * Features:
 * - Optimistic updates for immediate UI feedback
 * - Automatic rollback on error
 * - Cache invalidation after mutation settles
 *
 * @returns React Query mutation result with mutate/mutateAsync functions
 *
 * @example
 * ```tsx
 * const updateMutation = useUpdateSpecialRelationship();
 *
 * const handleUpdate = (relationshipId: string) => {
 *   updateMutation.mutate({
 *     id: relationshipId,
 *     data: {
 *       email: 'newemail@example.com',
 *       mobile_phone: '+44-7700-900001',
 *     }
 *   }, {
 *     onSuccess: (updated) => {
 *       console.log('Updated:', updated);
 *     },
 *     onError: (error) => {
 *       console.error('Update failed:', error);
 *     }
 *   });
 * };
 * ```
 */
export function useUpdateSpecialRelationship() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSpecialRelationshipData }) =>
      updateSpecialRelationship(id, data),
    onMutate: async ({ id, data }) => {
      // Perform optimistic update with helper function
      return performOptimisticUpdate(queryClient, (rel) =>
        rel.id === id ? { ...rel, ...data } : rel
      );
    },
    onError: (error, variables, context) => {
      // Rollback to previous values on error
      rollbackOptimisticUpdate(queryClient, context);
    },
    onSettled: () => {
      // Invalidate queries to ensure server state is accurate
      invalidateAllQueries(queryClient);
    },
  });
}

/**
 * Mutation hook for updating special relationship status (Active/Inactive/Deceased).
 *
 * Features:
 * - Optimistic updates for immediate UI feedback
 * - Automatic rollback on error
 * - Cache invalidation after mutation settles
 * - Reduced perceived latency (<50ms vs 300ms with optimistic updates)
 *
 * @returns React Query mutation result with mutate/mutateAsync functions
 *
 * @example
 * ```tsx
 * const updateStatusMutation = useUpdateSpecialRelationshipStatus();
 *
 * const handleStatusChange = (relationshipId: string) => {
 *   updateStatusMutation.mutate({
 *     id: relationshipId,
 *     status: 'Inactive',
 *   }, {
 *     onSuccess: () => {
 *       console.log('Status updated successfully');
 *     }
 *   });
 * };
 * ```
 */
export function useUpdateSpecialRelationshipStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: RelationshipStatus }) =>
      updateSpecialRelationshipStatus(id, status),
    onMutate: async ({ id, status }) => {
      // Perform optimistic update with helper function
      return performOptimisticUpdate(queryClient, (rel) =>
        rel.id === id ? { ...rel, status } : rel
      );
    },
    onError: (error, variables, context) => {
      // Rollback on error
      rollbackOptimisticUpdate(queryClient, context);
    },
    onSettled: () => {
      // Invalidate to ensure accuracy
      invalidateAllQueries(queryClient);
    },
  });
}

/**
 * Mutation hook for soft-deleting special relationships.
 *
 * Features:
 * - Optimistic updates for immediate UI feedback (removes from list instantly)
 * - Automatic rollback on error (restores deleted item)
 * - Cache invalidation after mutation settles
 * - Supports undo pattern (5-second window implemented in calling component)
 *
 * @returns React Query mutation result with mutate/mutateAsync functions
 *
 * @example
 * ```tsx
 * const deleteMutation = useDeleteSpecialRelationship();
 *
 * const handleDelete = (relationshipId: string) => {
 *   deleteMutation.mutate(relationshipId, {
 *     onSuccess: () => {
 *       // Show undo toast notification (5-second window)
 *       showUndoNotification();
 *     },
 *     onError: (error) => {
 *       console.error('Delete failed:', error);
 *       // Relationship automatically restored via rollback
 *     }
 *   });
 * };
 * ```
 */
export function useDeleteSpecialRelationship() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteSpecialRelationship,
    onMutate: async (id: string) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: specialRelationshipsKeys.all,
      });

      // Snapshot previous values for rollback
      const previousData: Array<[any, any]> = [];

      // Update all special relationships queries (filter out deleted item)
      const queries = queryClient.getQueryCache().getAll();
      for (const query of queries) {
        const key = query.queryKey;
        if (Array.isArray(key) && key.length >= 2 && key[0] === 'specialRelationships') {
          const oldData = queryClient.getQueryData<SpecialRelationship[]>(key);
          if (oldData && Array.isArray(oldData) && oldData.length > 0) {
            previousData.push([key, oldData]);
            const newData = oldData.filter(rel => rel.id !== id);
            queryClient.setQueryData<SpecialRelationship[]>(key, newData);
          }
        }
      }

      return { previousData };
    },
    onError: (error, variables, context) => {
      // Rollback on error (restores deleted relationship)
      rollbackOptimisticUpdate(queryClient, context);
    },
    onSettled: () => {
      // Invalidate to ensure accuracy
      invalidateAllQueries(queryClient);
    },
  });
}
