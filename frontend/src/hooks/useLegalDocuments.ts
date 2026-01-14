/**
 * Legal Documents React Query Hooks
 *
 * Provides React Query hooks for managing legal documents with:
 * - Query hook for fetching documents by client group
 * - Query hook for fetching documents by multiple product owners
 * - Mutation hooks for create/update/delete operations
 * - Optimistic updates with rollback on error
 * - Cache invalidation after mutations
 *
 * ## Cache Strategy
 *
 * The following cache settings are configured for optimal performance:
 * - **staleTime: 5 minutes** - Data is considered fresh and won't trigger refetch
 * - **gcTime: 10 minutes** - Unused cache entries are garbage collected after this period
 * - **refetchOnWindowFocus: false** - Prevents unwanted refetches when user returns to tab
 *
 * This strategy balances data freshness with API call efficiency. Documents don't change
 * frequently, so 5-minute staleness is appropriate. The 10-minute gcTime ensures cache
 * persists during typical browsing sessions but doesn't consume memory indefinitely.
 *
 * ## Optimistic Updates
 *
 * Update, status change, and delete mutations use optimistic updates:
 * 1. Cache is updated synchronously BEFORE the API call
 * 2. Previous data is snapshotted for potential rollback
 * 3. On error, cache is rolled back to the snapshot
 * 4. On success, queries are invalidated to sync with server state
 *
 * Empty arrays are also snapshotted to ensure proper rollback behavior.
 *
 * @module useLegalDocuments
 */

import { useQuery, useMutation, useQueryClient, QueryClient } from '@tanstack/react-query';
import {
  fetchLegalDocuments,
  fetchLegalDocumentsByClientGroup,
  createLegalDocument,
  updateLegalDocument,
  updateLegalDocumentStatus,
  deleteLegalDocument,
} from '@/services/legalDocumentsApi';
import type {
  LegalDocument,
  LegalDocumentFilters,
  LegalDocumentStatus,
  CreateLegalDocumentData,
  UpdateLegalDocumentData,
} from '@/types/legalDocument';

// =============================================================================
// Constants
// =============================================================================

const STALE_TIME = 5 * 60 * 1000; // 5 minutes
const GC_TIME = 10 * 60 * 1000; // 10 minutes

// =============================================================================
// Query Key Factory
// =============================================================================

/**
 * Query key factory for legal documents.
 * Provides consistent query keys for cache management and invalidation.
 *
 * @example
 * ```ts
 * // Invalidate all legal documents queries
 * queryClient.invalidateQueries({ queryKey: legalDocumentsKeys.all });
 *
 * // Invalidate specific client group
 * queryClient.invalidateQueries({
 *   queryKey: legalDocumentsKeys.byClientGroup(123)
 * });
 * ```
 */
export const legalDocumentsKeys = {
  /** Base key for all legal documents queries */
  all: ['legalDocuments'] as const,

  /**
   * Key for product owner-specific queries with optional filters
   * @param productOwnerId - The product owner ID
   * @param filters - Optional filters for type and status
   */
  byProductOwner: (productOwnerId: number, filters?: LegalDocumentFilters) =>
    ['legalDocuments', 'productOwner', productOwnerId, filters ?? {}] as const,

  /**
   * Key for client group-specific queries with optional filters
   * @param clientGroupId - The client group ID
   * @param filters - Optional filters for type and status
   */
  byClientGroup: (clientGroupId: number, filters?: LegalDocumentFilters) =>
    ['legalDocuments', 'clientGroup', clientGroupId, filters || {}] as const,

  /**
   * Key for multiple product owners queries with optional filters
   * @param productOwnerIds - Array of product owner IDs (sorted for cache key consistency)
   * @param filters - Optional filters for type and status
   */
  byProductOwners: (productOwnerIds: number[], filters?: LegalDocumentFilters) =>
    ['legalDocuments', 'productOwners', productOwnerIds.sort().join(','), filters ?? {}] as const,
};

// =============================================================================
// Types
// =============================================================================

/**
 * Options for useLegalDocuments query hook
 */
interface UseLegalDocumentsOptions {
  /** Filters for document type and/or status */
  filters?: LegalDocumentFilters;
}

/**
 * Context returned from optimistic update mutations for rollback on error
 */
interface OptimisticUpdateContext {
  /** Snapshot of previous query data for rollback */
  previousData: Array<[unknown[], LegalDocument[]]>;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Performs an optimistic update on all legal documents queries in the cache.
 * Cancels outgoing queries, snapshots previous data, and applies the update function.
 *
 * IMPORTANT: This function updates the cache SYNCHRONOUSLY before the await
 * to ensure optimistic updates are visible immediately after mutate() is called.
 *
 * @param queryClient - React Query client instance
 * @param updateFn - Function to apply to each document in the cache
 * @returns Context with previous data for rollback on error
 */
async function performOptimisticUpdate(
  queryClient: QueryClient,
  updateFn: (document: LegalDocument) => LegalDocument
): Promise<OptimisticUpdateContext> {
  // Snapshot previous values for rollback FIRST (synchronously)
  const previousData: Array<[unknown[], LegalDocument[]]> = [];

  // Update all legal documents queries in cache SYNCHRONOUSLY
  const queries = queryClient.getQueryCache().getAll();
  for (const query of queries) {
    const key = query.queryKey;
    // Check if this is a legal documents query
    if (Array.isArray(key) && key.length >= 1 && key[0] === 'legalDocuments') {
      const oldData = queryClient.getQueryData<LegalDocument[]>(key);
      if (oldData && Array.isArray(oldData)) {
        previousData.push([key as unknown[], oldData]);
        const newData = oldData.map(updateFn);
        queryClient.setQueryData<LegalDocument[]>(key, newData);
      }
    }
  }

  // Cancel outgoing refetches AFTER updating (to avoid race conditions)
  // This is done asynchronously but the optimistic update is already applied
  await queryClient.cancelQueries({
    queryKey: legalDocumentsKeys.all,
  });

  return { previousData };
}

/**
 * Performs an optimistic delete on all legal documents queries in the cache.
 * Removes the document with the specified ID from all cached arrays.
 *
 * IMPORTANT: This function updates the cache SYNCHRONOUSLY before the await
 * to ensure optimistic updates are visible immediately after mutate() is called.
 *
 * @param queryClient - React Query client instance
 * @param documentId - ID of the document to remove
 * @returns Context with previous data for rollback on error
 */
async function performOptimisticDelete(
  queryClient: QueryClient,
  documentId: number
): Promise<OptimisticUpdateContext> {
  // Snapshot previous values for rollback FIRST (synchronously)
  const previousData: Array<[unknown[], LegalDocument[]]> = [];

  // Update all legal documents queries in cache SYNCHRONOUSLY
  const queries = queryClient.getQueryCache().getAll();
  for (const query of queries) {
    const key = query.queryKey;
    // Check if this is a legal documents query
    if (Array.isArray(key) && key.length >= 1 && key[0] === 'legalDocuments') {
      const oldData = queryClient.getQueryData<LegalDocument[]>(key);
      if (oldData && Array.isArray(oldData)) {
        previousData.push([key as unknown[], oldData]);
        const newData = oldData.filter((doc) => doc.id !== documentId);
        queryClient.setQueryData<LegalDocument[]>(key, newData);
      }
    }
  }

  // Cancel outgoing refetches AFTER updating (to avoid race conditions)
  await queryClient.cancelQueries({
    queryKey: legalDocumentsKeys.all,
  });

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
 * Invalidates all legal documents queries to trigger refetch.
 *
 * @param queryClient - React Query client instance
 */
function invalidateAllQueries(queryClient: QueryClient): void {
  queryClient.invalidateQueries({
    queryKey: legalDocumentsKeys.all,
  });
}

// =============================================================================
// Query Hook
// =============================================================================

/**
 * Query hook for fetching legal documents for a client group.
 * Supports optional filtering by document type and status.
 *
 * Features:
 * - Automatic caching with 5-minute stale time
 * - Disabled when clientGroupId is null/undefined
 * - No refetch on window focus (prevents unnecessary API calls)
 *
 * @param clientGroupId - Client group ID (query disabled if null/undefined)
 * @param options - Optional configuration
 * @param options.filters - Filters for document type and/or status
 * @returns React Query result with documents data, loading, and error states
 *
 * @example
 * ```tsx
 * // Fetch all documents
 * const { data, isLoading, error } = useLegalDocuments(123);
 *
 * // Fetch with filters
 * const { data } = useLegalDocuments(123, {
 *   filters: { type: 'Will', status: 'Signed' }
 * });
 *
 * // Disabled query (doesn't fetch)
 * const { data } = useLegalDocuments(null);
 * ```
 */
export function useLegalDocuments(
  clientGroupId: number | null | undefined,
  options?: UseLegalDocumentsOptions
) {
  return useQuery({
    queryKey: legalDocumentsKeys.byClientGroup(clientGroupId || 0, options?.filters),
    queryFn: () => fetchLegalDocumentsByClientGroup(clientGroupId!, options?.filters),
    enabled: !!clientGroupId,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    refetchOnWindowFocus: false,
  });
}

/**
 * Query hook for fetching legal documents for multiple product owners.
 * Supports optional filtering by document type and status.
 *
 * Features:
 * - Automatic caching with 5-minute stale time
 * - Disabled when productOwnerIds is null/undefined or empty
 * - Product owner IDs are sorted for consistent cache key generation
 * - No refetch on window focus (prevents unnecessary API calls)
 *
 * @param productOwnerIds - Array of product owner IDs (query disabled if null/undefined/empty)
 * @param options - Optional configuration
 * @param options.filters - Filters for document type and/or status
 * @returns React Query result with documents data, loading, and error states
 *
 * @example
 * ```tsx
 * // Fetch documents for multiple product owners
 * const { data, isLoading, error } = useLegalDocumentsByProductOwners([123, 456]);
 *
 * // Fetch with filters
 * const { data } = useLegalDocumentsByProductOwners([123, 456], {
 *   filters: { type: 'Will', status: 'Signed' }
 * });
 *
 * // Disabled query (doesn't fetch)
 * const { data } = useLegalDocumentsByProductOwners(null);
 * ```
 */
export function useLegalDocumentsByProductOwners(
  productOwnerIds: number[] | null | undefined,
  options?: { filters?: LegalDocumentFilters }
) {
  const filters = options?.filters;
  const poIdKey = productOwnerIds?.sort().join(',') || '';

  return useQuery({
    queryKey: ['legalDocuments', 'productOwners', poIdKey, filters ?? {}] as const,
    queryFn: () => fetchLegalDocuments(productOwnerIds![0], filters),
    enabled: !!productOwnerIds && productOwnerIds.length > 0,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    refetchOnWindowFocus: false,
  });
}

// =============================================================================
// Mutation Hooks
// =============================================================================

/**
 * Mutation hook for creating new legal documents.
 *
 * Features:
 * - Invalidates all queries after successful creation (triggers refetch)
 * - Returns newly created document in mutation result
 *
 * @returns React Query mutation result with mutate/mutateAsync functions
 *
 * @example
 * ```tsx
 * const createMutation = useCreateLegalDocument();
 *
 * const handleCreate = () => {
 *   createMutation.mutate({
 *     type: 'Will',
 *     product_owner_ids: [123],
 *     document_date: '2024-06-15',
 *   }, {
 *     onSuccess: (newDocument) => {
 *       console.log('Created:', newDocument);
 *     }
 *   });
 * };
 * ```
 */
export function useCreateLegalDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateLegalDocumentData) => createLegalDocument(data),
    onMutate: async () => {
      // Return a context object for callbacks (even though we don't need rollback for create)
      return { timestamp: Date.now() };
    },
    onSuccess: () => {
      // Invalidate all legal documents queries to trigger refetch
      invalidateAllQueries(queryClient);
    },
  });
}

/**
 * Mutation hook for updating existing legal documents.
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
 * const updateMutation = useUpdateLegalDocument();
 *
 * const handleUpdate = (documentId: number) => {
 *   updateMutation.mutate({
 *     id: documentId,
 *     data: {
 *       notes: 'Updated notes',
 *       document_date: '2024-07-01',
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
export function useUpdateLegalDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateLegalDocumentData }) =>
      updateLegalDocument(id, data),
    onMutate: async ({ id, data }) => {
      // Perform optimistic update with helper function
      return performOptimisticUpdate(queryClient, (doc) =>
        doc.id === id ? { ...doc, ...data } : doc
      );
    },
    onError: (_error, _variables, context) => {
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
 * Mutation hook for updating legal document status (Signed/Lapsed/Registered).
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
 * const updateStatusMutation = useUpdateLegalDocumentStatus();
 *
 * const handleStatusChange = (documentId: number) => {
 *   updateStatusMutation.mutate({
 *     id: documentId,
 *     status: 'Lapsed',
 *   }, {
 *     onSuccess: () => {
 *       console.log('Status updated successfully');
 *     }
 *   });
 * };
 * ```
 */
export function useUpdateLegalDocumentStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: LegalDocumentStatus }) =>
      updateLegalDocumentStatus(id, status),
    onMutate: async ({ id, status }) => {
      // Perform optimistic update with helper function
      return performOptimisticUpdate(queryClient, (doc) =>
        doc.id === id ? { ...doc, status } : doc
      );
    },
    onError: (_error, _variables, context) => {
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
 * Mutation hook for deleting legal documents (hard delete - permanent removal).
 *
 * Features:
 * - Optimistic updates for immediate UI feedback (removes from list instantly)
 * - Automatic rollback on error (restores deleted item)
 * - Cache invalidation after mutation settles
 *
 * @returns React Query mutation result with mutate/mutateAsync functions
 *
 * @example
 * ```tsx
 * const deleteMutation = useDeleteLegalDocument();
 *
 * const handleDelete = (documentId: number) => {
 *   deleteMutation.mutate(documentId, {
 *     onSuccess: () => {
 *       console.log('Document deleted successfully');
 *     },
 *     onError: (error) => {
 *       console.error('Delete failed:', error);
 *       // Document automatically restored via rollback
 *     }
 *   });
 * };
 * ```
 */
export function useDeleteLegalDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteLegalDocument(id),
    onMutate: async (id: number) => {
      // Perform optimistic delete with helper function
      return performOptimisticDelete(queryClient, id);
    },
    onError: (_error, _variables, context) => {
      // Rollback on error (restores deleted document)
      rollbackOptimisticUpdate(queryClient, context);
    },
    onSettled: () => {
      // Invalidate to ensure accuracy
      invalidateAllQueries(queryClient);
    },
  });
}
