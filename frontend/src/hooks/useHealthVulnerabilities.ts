/**
 * Health and Vulnerability React Query Hooks
 *
 * Provides React Query hooks for managing health conditions and vulnerabilities
 * for product owners and special relationships in the Phase 2 Health &
 * Vulnerabilities Tab implementation.
 *
 * Features:
 * - Query hooks for fetching health and vulnerability data
 * - Mutation hooks for create/update/delete operations
 * - Automatic cache invalidation after mutations
 * - 5-minute stale time for efficient caching
 * - Conditional fetching (disabled when clientGroupId is undefined)
 *
 * Cache Strategy:
 * - staleTime: 5 minutes (300000ms)
 * - Queries are disabled when clientGroupId is null/undefined
 * - All queries are invalidated after successful mutations
 *
 * @module hooks/useHealthVulnerabilities
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchHealthProductOwners,
  fetchHealthSpecialRelationships,
  fetchVulnerabilitiesProductOwners,
  fetchVulnerabilitiesSpecialRelationships,
  createHealthRecord,
  updateHealthRecord,
  deleteHealthRecord,
  createVulnerability,
  updateVulnerability,
  deleteVulnerability,
} from '@/services/healthVulnerabilityApi';
import type {
  HealthProductOwner,
  HealthSpecialRelationship,
  VulnerabilityProductOwner,
  VulnerabilitySpecialRelationship,
  HealthProductOwnerCreate,
  HealthSpecialRelationshipCreate,
  HealthConditionUpdate,
  VulnerabilityProductOwnerCreate,
  VulnerabilitySpecialRelationshipCreate,
  VulnerabilityUpdate,
  PersonType,
} from '@/types/healthVulnerability';

// =============================================================================
// Constants
// =============================================================================

/**
 * Default stale time for queries (5 minutes)
 * Data older than this will be refetched on next access
 */
const STALE_TIME = 5 * 60 * 1000; // 5 minutes

// =============================================================================
// Query Key Factory
// =============================================================================

/**
 * Query key factory for health and vulnerability queries.
 * Provides consistent query keys for cache management and invalidation.
 *
 * Structure:
 * - all: ['healthVulnerability'] - All health/vulnerability queries
 * - health: ['healthVulnerability', 'health'] - All health queries
 * - healthProductOwners(id): ['healthVulnerability', 'health', 'productOwners', id]
 * - healthSpecialRelationships(id): ['healthVulnerability', 'health', 'specialRelationships', id]
 * - vulnerabilities: ['healthVulnerability', 'vulnerabilities'] - All vulnerability queries
 * - vulnerabilitiesProductOwners(id): ['healthVulnerability', 'vulnerabilities', 'productOwners', id]
 * - vulnerabilitiesSpecialRelationships(id): ['healthVulnerability', 'vulnerabilities', 'specialRelationships', id]
 *
 * @example
 * ```ts
 * // Invalidate all health/vulnerability queries
 * queryClient.invalidateQueries({ queryKey: healthVulnerabilityKeys.all });
 *
 * // Invalidate specific health queries for a client group
 * queryClient.invalidateQueries({
 *   queryKey: healthVulnerabilityKeys.healthProductOwners(50)
 * });
 * ```
 */
export const healthVulnerabilityKeys = {
  /** Base key for all health/vulnerability queries */
  all: ['healthVulnerability'] as const,

  /** Base key for all health queries */
  health: ['healthVulnerability', 'health'] as const,

  /**
   * Key for health records of product owners in a client group
   * @param clientGroupId - The client group ID
   */
  healthProductOwners: (clientGroupId: number) =>
    ['healthVulnerability', 'health', 'productOwners', clientGroupId] as const,

  /**
   * Key for health records of special relationships in a client group
   * @param clientGroupId - The client group ID
   */
  healthSpecialRelationships: (clientGroupId: number) =>
    ['healthVulnerability', 'health', 'specialRelationships', clientGroupId] as const,

  /** Base key for all vulnerability queries */
  vulnerabilities: ['healthVulnerability', 'vulnerabilities'] as const,

  /**
   * Key for vulnerability records of product owners in a client group
   * @param clientGroupId - The client group ID
   */
  vulnerabilitiesProductOwners: (clientGroupId: number) =>
    ['healthVulnerability', 'vulnerabilities', 'productOwners', clientGroupId] as const,

  /**
   * Key for vulnerability records of special relationships in a client group
   * @param clientGroupId - The client group ID
   */
  vulnerabilitiesSpecialRelationships: (clientGroupId: number) =>
    ['healthVulnerability', 'vulnerabilities', 'specialRelationships', clientGroupId] as const,
};

// =============================================================================
// Health Query Hooks
// =============================================================================

/**
 * Query hook for fetching health records for product owners in a client group.
 *
 * Features:
 * - Automatic caching with 5-minute stale time
 * - Disabled when clientGroupId is null/undefined
 * - Loading, error, and success states
 *
 * @param clientGroupId - Client group ID (query disabled if null/undefined)
 * @returns React Query result with health records data, loading, and error states
 *
 * @example
 * ```tsx
 * const { data, isLoading, isError } = useHealthProductOwners(50);
 *
 * if (isLoading) return <Spinner />;
 * if (isError) return <Error />;
 * return <HealthList records={data} />;
 * ```
 */
export function useHealthProductOwners(clientGroupId: number | null | undefined) {
  return useQuery<HealthProductOwner[], Error>({
    queryKey: clientGroupId != null
      ? healthVulnerabilityKeys.healthProductOwners(clientGroupId)
      : ['healthVulnerability', 'health', 'productOwners', 'disabled'],
    queryFn: () => fetchHealthProductOwners(clientGroupId!),
    enabled: clientGroupId != null,
    staleTime: STALE_TIME,
  });
}

/**
 * Query hook for fetching health records for special relationships in a client group.
 *
 * Features:
 * - Automatic caching with 5-minute stale time
 * - Disabled when clientGroupId is null/undefined
 * - Loading, error, and success states
 *
 * @param clientGroupId - Client group ID (query disabled if null/undefined)
 * @returns React Query result with health records data, loading, and error states
 *
 * @example
 * ```tsx
 * const { data, isLoading, isError } = useHealthSpecialRelationships(50);
 *
 * if (isLoading) return <Spinner />;
 * if (isError) return <Error />;
 * return <HealthList records={data} />;
 * ```
 */
export function useHealthSpecialRelationships(clientGroupId: number | null | undefined) {
  return useQuery<HealthSpecialRelationship[], Error>({
    queryKey: clientGroupId != null
      ? healthVulnerabilityKeys.healthSpecialRelationships(clientGroupId)
      : ['healthVulnerability', 'health', 'specialRelationships', 'disabled'],
    queryFn: () => fetchHealthSpecialRelationships(clientGroupId!),
    enabled: clientGroupId != null,
    staleTime: STALE_TIME,
  });
}

// =============================================================================
// Vulnerability Query Hooks
// =============================================================================

/**
 * Query hook for fetching vulnerability records for product owners in a client group.
 *
 * Features:
 * - Automatic caching with 5-minute stale time
 * - Disabled when clientGroupId is null/undefined
 * - Loading, error, and success states
 *
 * @param clientGroupId - Client group ID (query disabled if null/undefined)
 * @returns React Query result with vulnerability records data, loading, and error states
 *
 * @example
 * ```tsx
 * const { data, isLoading, isError } = useVulnerabilitiesProductOwners(50);
 *
 * if (isLoading) return <Spinner />;
 * if (isError) return <Error />;
 * return <VulnerabilityList records={data} />;
 * ```
 */
export function useVulnerabilitiesProductOwners(clientGroupId: number | null | undefined) {
  return useQuery<VulnerabilityProductOwner[], Error>({
    queryKey: clientGroupId != null
      ? healthVulnerabilityKeys.vulnerabilitiesProductOwners(clientGroupId)
      : ['healthVulnerability', 'vulnerabilities', 'productOwners', 'disabled'],
    queryFn: () => fetchVulnerabilitiesProductOwners(clientGroupId!),
    enabled: clientGroupId != null,
    staleTime: STALE_TIME,
  });
}

/**
 * Query hook for fetching vulnerability records for special relationships in a client group.
 *
 * Features:
 * - Automatic caching with 5-minute stale time
 * - Disabled when clientGroupId is null/undefined
 * - Loading, error, and success states
 *
 * @param clientGroupId - Client group ID (query disabled if null/undefined)
 * @returns React Query result with vulnerability records data, loading, and error states
 *
 * @example
 * ```tsx
 * const { data, isLoading, isError } = useVulnerabilitiesSpecialRelationships(50);
 *
 * if (isLoading) return <Spinner />;
 * if (isError) return <Error />;
 * return <VulnerabilityList records={data} />;
 * ```
 */
export function useVulnerabilitiesSpecialRelationships(clientGroupId: number | null | undefined) {
  return useQuery<VulnerabilitySpecialRelationship[], Error>({
    queryKey: clientGroupId != null
      ? healthVulnerabilityKeys.vulnerabilitiesSpecialRelationships(clientGroupId)
      : ['healthVulnerability', 'vulnerabilities', 'specialRelationships', 'disabled'],
    queryFn: () => fetchVulnerabilitiesSpecialRelationships(clientGroupId!),
    enabled: clientGroupId != null,
    staleTime: STALE_TIME,
  });
}

// =============================================================================
// Health Mutation Hooks
// =============================================================================

/**
 * Input type for creating a health record mutation
 */
interface CreateHealthRecordInput {
  /** Health record data to create */
  data: HealthProductOwnerCreate | HealthSpecialRelationshipCreate;
  /** Type of person the record belongs to */
  personType: PersonType;
}

/**
 * Input type for updating a health record mutation
 */
interface UpdateHealthRecordInput {
  /** ID of the health record to update */
  id: number;
  /** Fields to update */
  data: HealthConditionUpdate;
  /** Type of person the record belongs to */
  personType: PersonType;
}

/**
 * Input type for deleting a health record mutation
 */
interface DeleteHealthRecordInput {
  /** ID of the health record to delete */
  id: number;
  /** Type of person the record belongs to */
  personType: PersonType;
}

/**
 * Mutation hook for creating new health condition records.
 *
 * Features:
 * - Routes to correct endpoint based on person type
 * - Invalidates all health queries after successful creation
 * - Returns created record in mutation result
 *
 * @returns React Query mutation result with mutate/mutateAsync functions
 *
 * @example
 * ```tsx
 * const createMutation = useCreateHealthRecord();
 *
 * const handleCreate = () => {
 *   createMutation.mutate({
 *     data: { product_owner_id: 100, condition: 'Diabetes', status: 'Active' },
 *     personType: 'product_owner',
 *   }, {
 *     onSuccess: (newRecord) => {
 *       console.log('Created:', newRecord);
 *     }
 *   });
 * };
 * ```
 */
export function useCreateHealthRecord() {
  const queryClient = useQueryClient();

  return useMutation<
    HealthProductOwner | HealthSpecialRelationship,
    Error,
    CreateHealthRecordInput
  >({
    mutationFn: async ({ data, personType }) => {
      return await createHealthRecord(data, personType);
    },
    onSuccess: () => {
      // Invalidate all health queries to trigger refetch
      queryClient.invalidateQueries({ queryKey: healthVulnerabilityKeys.health });
    },
  });
}

/**
 * Mutation hook for updating existing health condition records.
 *
 * Features:
 * - Routes to correct endpoint based on person type
 * - Optimistic updates for instant UI feedback
 * - Automatic rollback on error
 * - Supports partial updates
 *
 * @returns React Query mutation result with mutate/mutateAsync functions
 *
 * @example
 * ```tsx
 * const updateMutation = useUpdateHealthRecord();
 *
 * const handleUpdate = () => {
 *   updateMutation.mutate({
 *     id: 1,
 *     data: { status: 'Resolved', notes: 'Condition resolved' },
 *     personType: 'product_owner',
 *   }, {
 *     onSuccess: (updated) => {
 *       console.log('Updated:', updated);
 *     }
 *   });
 * };
 * ```
 */
export function useUpdateHealthRecord() {
  const queryClient = useQueryClient();

  return useMutation<
    HealthProductOwner | HealthSpecialRelationship,
    Error,
    UpdateHealthRecordInput
  >({
    mutationFn: async ({ id, data, personType }) => {
      return await updateHealthRecord(id, data, personType);
    },
    onMutate: async ({ id, data }) => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: healthVulnerabilityKeys.health });

      // Snapshot the previous value for rollback
      const previousData = queryClient.getQueriesData({ queryKey: healthVulnerabilityKeys.health });

      // Optimistically update the item in all health queries
      queryClient.setQueriesData(
        { queryKey: healthVulnerabilityKeys.health },
        (old: unknown) => {
          if (Array.isArray(old)) {
            return old.map((item: { id: number }) =>
              item.id === id ? { ...item, ...data } : item
            );
          }
          return old;
        }
      );

      return { previousData };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error using the snapshot
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: () => {
      // Always refetch after error or success to ensure consistency
      queryClient.invalidateQueries({ queryKey: healthVulnerabilityKeys.health });
    },
  });
}

/**
 * Mutation hook for deleting health condition records.
 *
 * Features:
 * - Routes to correct endpoint based on person type
 * - Optimistic updates for instant UI feedback
 * - Automatic rollback on error
 * - Invalidates all health queries after operation
 *
 * @returns React Query mutation result with mutate/mutateAsync functions
 *
 * @example
 * ```tsx
 * const deleteMutation = useDeleteHealthRecord();
 *
 * const handleDelete = () => {
 *   deleteMutation.mutate({
 *     id: 1,
 *     personType: 'product_owner',
 *   }, {
 *     onSuccess: () => {
 *       console.log('Deleted successfully');
 *     }
 *   });
 * };
 * ```
 */
export function useDeleteHealthRecord() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, DeleteHealthRecordInput>({
    mutationFn: async ({ id, personType }) => {
      await deleteHealthRecord(id, personType);
    },
    onMutate: async ({ id }) => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: healthVulnerabilityKeys.health });

      // Snapshot the previous value for rollback
      const previousData = queryClient.getQueriesData({ queryKey: healthVulnerabilityKeys.health });

      // Optimistically remove the item from all health queries
      queryClient.setQueriesData(
        { queryKey: healthVulnerabilityKeys.health },
        (old: unknown) => {
          if (Array.isArray(old)) {
            return old.filter((item: { id: number }) => item.id !== id);
          }
          return old;
        }
      );

      return { previousData };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error using the snapshot
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: () => {
      // Always refetch after error or success to ensure consistency
      queryClient.invalidateQueries({ queryKey: healthVulnerabilityKeys.health });
    },
  });
}

// =============================================================================
// Vulnerability Mutation Hooks
// =============================================================================

/**
 * Input type for creating a vulnerability record mutation
 */
interface CreateVulnerabilityInput {
  /** Vulnerability record data to create */
  data: VulnerabilityProductOwnerCreate | VulnerabilitySpecialRelationshipCreate;
  /** Type of person the record belongs to */
  personType: PersonType;
}

/**
 * Input type for updating a vulnerability record mutation
 */
interface UpdateVulnerabilityInput {
  /** ID of the vulnerability record to update */
  id: number;
  /** Fields to update */
  data: VulnerabilityUpdate;
  /** Type of person the record belongs to */
  personType: PersonType;
}

/**
 * Input type for deleting a vulnerability record mutation
 */
interface DeleteVulnerabilityInput {
  /** ID of the vulnerability record to delete */
  id: number;
  /** Type of person the record belongs to */
  personType: PersonType;
}

/**
 * Mutation hook for creating new vulnerability records.
 *
 * Features:
 * - Routes to correct endpoint based on person type
 * - Invalidates all vulnerability queries after successful creation
 * - Returns created record in mutation result
 *
 * @returns React Query mutation result with mutate/mutateAsync functions
 *
 * @example
 * ```tsx
 * const createMutation = useCreateVulnerability();
 *
 * const handleCreate = () => {
 *   createMutation.mutate({
 *     data: {
 *       product_owner_id: 100,
 *       description: 'Cognitive decline',
 *       diagnosed: true,
 *       status: 'Active',
 *     },
 *     personType: 'product_owner',
 *   }, {
 *     onSuccess: (newRecord) => {
 *       console.log('Created:', newRecord);
 *     }
 *   });
 * };
 * ```
 */
export function useCreateVulnerability() {
  const queryClient = useQueryClient();

  return useMutation<
    VulnerabilityProductOwner | VulnerabilitySpecialRelationship,
    Error,
    CreateVulnerabilityInput
  >({
    mutationFn: async ({ data, personType }) => {
      return await createVulnerability(data, personType);
    },
    onSuccess: () => {
      // Invalidate all vulnerability queries to trigger refetch
      queryClient.invalidateQueries({ queryKey: healthVulnerabilityKeys.vulnerabilities });
    },
  });
}

/**
 * Mutation hook for updating existing vulnerability records.
 *
 * Features:
 * - Routes to correct endpoint based on person type
 * - Optimistic updates for instant UI feedback
 * - Automatic rollback on error
 * - Supports partial updates
 *
 * @returns React Query mutation result with mutate/mutateAsync functions
 *
 * @example
 * ```tsx
 * const updateMutation = useUpdateVulnerability();
 *
 * const handleUpdate = () => {
 *   updateMutation.mutate({
 *     id: 1,
 *     data: { status: 'Resolved', notes: 'Vulnerability addressed' },
 *     personType: 'product_owner',
 *   }, {
 *     onSuccess: (updated) => {
 *       console.log('Updated:', updated);
 *     }
 *   });
 * };
 * ```
 */
export function useUpdateVulnerability() {
  const queryClient = useQueryClient();

  return useMutation<
    VulnerabilityProductOwner | VulnerabilitySpecialRelationship,
    Error,
    UpdateVulnerabilityInput
  >({
    mutationFn: async ({ id, data, personType }) => {
      return await updateVulnerability(id, data, personType);
    },
    onMutate: async ({ id, data }) => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: healthVulnerabilityKeys.vulnerabilities });

      // Snapshot the previous value for rollback
      const previousData = queryClient.getQueriesData({ queryKey: healthVulnerabilityKeys.vulnerabilities });

      // Optimistically update the item in all vulnerability queries
      queryClient.setQueriesData(
        { queryKey: healthVulnerabilityKeys.vulnerabilities },
        (old: unknown) => {
          if (Array.isArray(old)) {
            return old.map((item: { id: number }) =>
              item.id === id ? { ...item, ...data } : item
            );
          }
          return old;
        }
      );

      return { previousData };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error using the snapshot
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: () => {
      // Always refetch after error or success to ensure consistency
      queryClient.invalidateQueries({ queryKey: healthVulnerabilityKeys.vulnerabilities });
    },
  });
}

/**
 * Mutation hook for deleting vulnerability records.
 *
 * Features:
 * - Routes to correct endpoint based on person type
 * - Optimistic updates for instant UI feedback
 * - Automatic rollback on error
 * - Invalidates all vulnerability queries after operation
 *
 * @returns React Query mutation result with mutate/mutateAsync functions
 *
 * @example
 * ```tsx
 * const deleteMutation = useDeleteVulnerability();
 *
 * const handleDelete = () => {
 *   deleteMutation.mutate({
 *     id: 1,
 *     personType: 'product_owner',
 *   }, {
 *     onSuccess: () => {
 *       console.log('Deleted successfully');
 *     }
 *   });
 * };
 * ```
 */
export function useDeleteVulnerability() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, DeleteVulnerabilityInput>({
    mutationFn: async ({ id, personType }) => {
      await deleteVulnerability(id, personType);
    },
    onMutate: async ({ id }) => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: healthVulnerabilityKeys.vulnerabilities });

      // Snapshot the previous value for rollback
      const previousData = queryClient.getQueriesData({ queryKey: healthVulnerabilityKeys.vulnerabilities });

      // Optimistically remove the item from all vulnerability queries
      queryClient.setQueriesData(
        { queryKey: healthVulnerabilityKeys.vulnerabilities },
        (old: unknown) => {
          if (Array.isArray(old)) {
            return old.filter((item: { id: number }) => item.id !== id);
          }
          return old;
        }
      );

      return { previousData };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error using the snapshot
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: () => {
      // Always refetch after error or success to ensure consistency
      queryClient.invalidateQueries({ queryKey: healthVulnerabilityKeys.vulnerabilities });
    },
  });
}
