# Cycle 6: API Services & React Query Hooks

**Goal**: Create API service functions and React Query hooks for data fetching and mutations

---

## RED Phase - Write Failing Tests

**Agent**: `Tester-Agent`

**Instructions**: Use the Tester-Agent to write failing tests for API services and hooks.

**File 1**: `frontend/src/tests/services/healthVulnerabilityApi.test.ts`

```typescript
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
import api from '@/services/api';

jest.mock('@/services/api');
const mockedApi = api as jest.Mocked<typeof api>;

describe('healthVulnerabilityApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchHealthProductOwners', () => {
    it('should fetch health records for a client group', async () => {
      const mockData = [{ id: 1, condition: 'Smoking' }];
      mockedApi.get.mockResolvedValue({ data: mockData });

      const result = await fetchHealthProductOwners({ clientGroupId: 1 });

      expect(mockedApi.get).toHaveBeenCalledWith('/health/product-owners', {
        params: { client_group_id: 1 }
      });
      expect(result).toEqual(mockData);
    });

    it('should fetch health records for a specific product owner', async () => {
      mockedApi.get.mockResolvedValue({ data: [] });

      await fetchHealthProductOwners({ productOwnerId: 123 });

      expect(mockedApi.get).toHaveBeenCalledWith('/health/product-owners', {
        params: { product_owner_id: 123 }
      });
    });
  });

  describe('fetchHealthSpecialRelationships', () => {
    it('should fetch health records for special relationships', async () => {
      mockedApi.get.mockResolvedValue({ data: [] });

      await fetchHealthSpecialRelationships({ clientGroupId: 1 });

      expect(mockedApi.get).toHaveBeenCalledWith('/health/special-relationships', {
        params: { client_group_id: 1 }
      });
    });
  });

  describe('createHealthRecord', () => {
    it('should create a health record for product owner', async () => {
      const mockData = { id: 1, condition: 'Diabetes' };
      mockedApi.post.mockResolvedValue({ data: mockData });

      const result = await createHealthRecord({
        product_owner_id: 1,
        condition: 'Diabetes',
        status: 'Active'
      });

      expect(mockedApi.post).toHaveBeenCalledWith('/health/product-owners', expect.any(Object));
      expect(result).toEqual(mockData);
    });

    it('should create a health record for special relationship', async () => {
      mockedApi.post.mockResolvedValue({ data: { id: 1 } });

      await createHealthRecord({
        special_relationship_id: 2,
        condition: 'Diabetes',
        status: 'Active'
      });

      expect(mockedApi.post).toHaveBeenCalledWith('/health/special-relationships', expect.any(Object));
    });
  });

  describe('deleteHealthRecord', () => {
    it('should delete health record for product owner', async () => {
      mockedApi.delete.mockResolvedValue({});

      await deleteHealthRecord(1, 'product_owner');

      expect(mockedApi.delete).toHaveBeenCalledWith('/health/product-owners/1');
    });

    it('should delete health record for special relationship', async () => {
      mockedApi.delete.mockResolvedValue({});

      await deleteHealthRecord(1, 'special_relationship');

      expect(mockedApi.delete).toHaveBeenCalledWith('/health/special-relationships/1');
    });
  });

  // Similar tests for vulnerabilities...
});
```

**File 2**: `frontend/src/tests/hooks/useHealthVulnerabilities.test.ts`

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useHealthProductOwners,
  useHealthSpecialRelationships,
  useVulnerabilitiesProductOwners,
  useVulnerabilitiesSpecialRelationships,
  useCreateHealthRecord,
  useDeleteHealthRecord,
} from '@/hooks/useHealthVulnerabilities';
import * as api from '@/services/healthVulnerabilityApi';

jest.mock('@/services/healthVulnerabilityApi');

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useHealthVulnerabilities hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('useHealthProductOwners', () => {
    it('should fetch health records for client group', async () => {
      const mockData = [{ id: 1, condition: 'Smoking' }];
      (api.fetchHealthProductOwners as jest.Mock).mockResolvedValue(mockData);

      const { result } = renderHook(
        () => useHealthProductOwners(1),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockData);
    });

    it('should handle loading state', () => {
      (api.fetchHealthProductOwners as jest.Mock).mockReturnValue(new Promise(() => {}));

      const { result } = renderHook(
        () => useHealthProductOwners(1),
        { wrapper: createWrapper() }
      );

      expect(result.current.isLoading).toBe(true);
    });
  });

  describe('useCreateHealthRecord', () => {
    it('should create health record and invalidate queries', async () => {
      (api.createHealthRecord as jest.Mock).mockResolvedValue({ id: 1 });

      const { result } = renderHook(
        () => useCreateHealthRecord(),
        { wrapper: createWrapper() }
      );

      await result.current.mutateAsync({
        product_owner_id: 1,
        condition: 'Test',
        status: 'Active'
      });

      expect(api.createHealthRecord).toHaveBeenCalled();
    });
  });
});
```

---

## GREEN Phase - Implement Services and Hooks

**Agent**: `coder-agent`

**Instructions**: Use the coder-agent to implement the API services and hooks to pass all tests.

**File 1**: `frontend/src/services/healthVulnerabilityApi.ts`

```typescript
/**
 * @fileoverview Health and Vulnerability API Service
 * @description Provides API functions for managing health conditions and vulnerabilities
 * for product owners and special relationships.
 * @module services/healthVulnerabilityApi
 */

import api from '@/services/api';
import {
  HealthCondition,
  HealthConditionFormData,
  Vulnerability,
  VulnerabilityFormData,
  PersonType,
} from '@/types/healthVulnerability';

// =============================================================================
// Health API Functions
// =============================================================================

/**
 * Parameters for fetching health records
 * @interface FetchHealthParams
 * @property {number} [productOwnerId] - Filter by specific product owner
 * @property {number} [specialRelationshipId] - Filter by specific special relationship
 * @property {number} [clientGroupId] - Filter by client group (returns all records for group)
 */
interface FetchHealthParams {
  productOwnerId?: number;
  specialRelationshipId?: number;
  clientGroupId?: number;
}

/**
 * Fetches health records for product owners
 *
 * @async
 * @param {FetchHealthParams} params - Filter parameters
 * @param {number} [params.productOwnerId] - Filter by specific product owner
 * @param {number} [params.clientGroupId] - Filter by client group
 * @returns {Promise<HealthCondition[]>} Array of health condition records
 * @throws {ApiError} When the API request fails
 *
 * @example
 * // Fetch all health records for a client group
 * const health = await fetchHealthProductOwners({ clientGroupId: 1 });
 *
 * @example
 * // Fetch health records for a specific product owner
 * const health = await fetchHealthProductOwners({ productOwnerId: 123 });
 */
export const fetchHealthProductOwners = async (
  params: FetchHealthParams
): Promise<HealthCondition[]> => {
  const queryParams: Record<string, number> = {};
  if (params.productOwnerId) queryParams.product_owner_id = params.productOwnerId;
  if (params.clientGroupId) queryParams.client_group_id = params.clientGroupId;

  const response = await api.get('/health/product-owners', { params: queryParams });
  return response.data;
};

/**
 * Fetches health records for special relationships
 *
 * @async
 * @param {FetchHealthParams} params - Filter parameters
 * @param {number} [params.specialRelationshipId] - Filter by specific special relationship
 * @param {number} [params.clientGroupId] - Filter by client group
 * @returns {Promise<HealthCondition[]>} Array of health condition records
 * @throws {ApiError} When the API request fails
 */
export const fetchHealthSpecialRelationships = async (
  params: FetchHealthParams
): Promise<HealthCondition[]> => {
  const queryParams: Record<string, number> = {};
  if (params.specialRelationshipId) queryParams.special_relationship_id = params.specialRelationshipId;
  if (params.clientGroupId) queryParams.client_group_id = params.clientGroupId;

  const response = await api.get('/health/special-relationships', { params: queryParams });
  return response.data;
};

/**
 * Creates a new health record for a product owner or special relationship
 *
 * @async
 * @param {Object} data - Health record data
 * @param {string} data.condition - Condition type
 * @param {HealthStatus} data.status - Current status
 * @param {number} [data.product_owner_id] - Product owner ID (mutually exclusive with special_relationship_id)
 * @param {number} [data.special_relationship_id] - Special relationship ID
 * @returns {Promise<HealthCondition>} The created health record
 * @throws {ApiError} When the API request fails or validation fails
 *
 * @example
 * const record = await createHealthRecord({
 *   product_owner_id: 1,
 *   condition: 'Smoking',
 *   name: 'Current Smoker',
 *   status: 'Active'
 * });
 */
export const createHealthRecord = async (
  data: HealthConditionFormData & { product_owner_id?: number; special_relationship_id?: number }
): Promise<HealthCondition> => {
  const endpoint = data.product_owner_id
    ? '/health/product-owners'
    : '/health/special-relationships';

  const response = await api.post(endpoint, data);
  return response.data;
};

/**
 * Updates an existing health record
 *
 * @async
 * @param {number} id - The health record ID to update
 * @param {Partial<HealthConditionFormData>} data - Fields to update
 * @param {PersonType} personType - Whether this belongs to a product owner or special relationship
 * @returns {Promise<HealthCondition>} The updated health record
 * @throws {ApiError} When the API request fails or record not found
 */
export const updateHealthRecord = async (
  id: number,
  data: Partial<HealthConditionFormData>,
  personType: PersonType
): Promise<HealthCondition> => {
  const endpoint = personType === 'product_owner'
    ? `/health/product-owners/${id}`
    : `/health/special-relationships/${id}`;

  const response = await api.put(endpoint, data);
  return response.data;
};

/**
 * Deletes a health record
 *
 * @async
 * @param {number} id - The health record ID to delete
 * @param {PersonType} personType - Whether this belongs to a product owner or special relationship
 * @returns {Promise<void>} Resolves when deleted successfully
 * @throws {ApiError} When the API request fails or record not found
 */
export const deleteHealthRecord = async (
  id: number,
  personType: PersonType
): Promise<void> => {
  const endpoint = personType === 'product_owner'
    ? `/health/product-owners/${id}`
    : `/health/special-relationships/${id}`;

  await api.delete(endpoint);
};

// =============================================================================
// Vulnerability API Functions
// =============================================================================

export const fetchVulnerabilitiesProductOwners = async (
  params: FetchHealthParams
): Promise<Vulnerability[]> => {
  const queryParams: Record<string, number> = {};
  if (params.productOwnerId) queryParams.product_owner_id = params.productOwnerId;
  if (params.clientGroupId) queryParams.client_group_id = params.clientGroupId;

  const response = await api.get('/vulnerabilities/product-owners', { params: queryParams });
  return response.data;
};

export const fetchVulnerabilitiesSpecialRelationships = async (
  params: FetchHealthParams
): Promise<Vulnerability[]> => {
  const queryParams: Record<string, number> = {};
  if (params.specialRelationshipId) queryParams.special_relationship_id = params.specialRelationshipId;
  if (params.clientGroupId) queryParams.client_group_id = params.clientGroupId;

  const response = await api.get('/vulnerabilities/special-relationships', { params: queryParams });
  return response.data;
};

export const createVulnerability = async (
  data: VulnerabilityFormData & { product_owner_id?: number; special_relationship_id?: number }
): Promise<Vulnerability> => {
  const endpoint = data.product_owner_id
    ? '/vulnerabilities/product-owners'
    : '/vulnerabilities/special-relationships';

  const response = await api.post(endpoint, data);
  return response.data;
};

export const updateVulnerability = async (
  id: number,
  data: Partial<VulnerabilityFormData>,
  personType: PersonType
): Promise<Vulnerability> => {
  const endpoint = personType === 'product_owner'
    ? `/vulnerabilities/product-owners/${id}`
    : `/vulnerabilities/special-relationships/${id}`;

  const response = await api.put(endpoint, data);
  return response.data;
};

export const deleteVulnerability = async (
  id: number,
  personType: PersonType
): Promise<void> => {
  const endpoint = personType === 'product_owner'
    ? `/vulnerabilities/product-owners/${id}`
    : `/vulnerabilities/special-relationships/${id}`;

  await api.delete(endpoint);
};
```

**File 2**: `frontend/src/hooks/useHealthVulnerabilities.ts`

```typescript
/**
 * @fileoverview Health and Vulnerability React Query Hooks
 * @description Provides data fetching and mutation hooks with caching
 * for health conditions and vulnerabilities.
 * @module hooks/useHealthVulnerabilities
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '@/services/healthVulnerabilityApi';
import { HealthConditionFormData, VulnerabilityFormData, PersonType } from '@/types/healthVulnerability';

/** @constant {number} STALE_TIME - Cache stale time in milliseconds (5 minutes) */
const STALE_TIME = 5 * 60 * 1000;

// =============================================================================
// Query Key Factory
// =============================================================================

/**
 * Query key factory for health and vulnerability queries
 * Provides consistent, hierarchical query keys for React Query cache management
 *
 * @constant
 * @example
 * // Invalidate all health queries
 * queryClient.invalidateQueries({ queryKey: healthVulnerabilityKeys.health.all });
 *
 * @example
 * // Invalidate health queries for specific client group
 * queryClient.invalidateQueries({
 *   queryKey: healthVulnerabilityKeys.health.productOwners(clientGroupId)
 * });
 */
export const healthVulnerabilityKeys = {
  all: ['healthVulnerability'] as const,
  health: {
    all: ['healthVulnerability', 'health'] as const,
    productOwners: (clientGroupId: number) =>
      ['healthVulnerability', 'health', 'productOwners', clientGroupId] as const,
    specialRelationships: (clientGroupId: number) =>
      ['healthVulnerability', 'health', 'specialRelationships', clientGroupId] as const,
  },
  vulnerabilities: {
    all: ['healthVulnerability', 'vulnerabilities'] as const,
    productOwners: (clientGroupId: number) =>
      ['healthVulnerability', 'vulnerabilities', 'productOwners', clientGroupId] as const,
    specialRelationships: (clientGroupId: number) =>
      ['healthVulnerability', 'vulnerabilities', 'specialRelationships', clientGroupId] as const,
  },
};

// =============================================================================
// Query Hooks
// =============================================================================

/**
 * Hook for fetching health records for product owners in a client group
 *
 * @param {number} clientGroupId - The client group ID to fetch health records for
 * @returns {UseQueryResult<HealthCondition[]>} React Query result object
 * @returns {HealthCondition[]} returns.data - Array of health conditions
 * @returns {boolean} returns.isLoading - True while fetching
 * @returns {boolean} returns.isError - True if fetch failed
 * @returns {Error|null} returns.error - Error object if fetch failed
 *
 * @example
 * const { data: healthRecords, isLoading, error } = useHealthProductOwners(clientGroupId);
 */
export function useHealthProductOwners(clientGroupId: number) {
  return useQuery({
    queryKey: healthVulnerabilityKeys.health.productOwners(clientGroupId),
    queryFn: () => api.fetchHealthProductOwners({ clientGroupId }),
    staleTime: STALE_TIME,
    refetchOnWindowFocus: false,
  });
}

export function useHealthSpecialRelationships(clientGroupId: number) {
  return useQuery({
    queryKey: healthVulnerabilityKeys.health.specialRelationships(clientGroupId),
    queryFn: () => api.fetchHealthSpecialRelationships({ clientGroupId }),
    staleTime: STALE_TIME,
    refetchOnWindowFocus: false,
  });
}

export function useVulnerabilitiesProductOwners(clientGroupId: number) {
  return useQuery({
    queryKey: healthVulnerabilityKeys.vulnerabilities.productOwners(clientGroupId),
    queryFn: () => api.fetchVulnerabilitiesProductOwners({ clientGroupId }),
    staleTime: STALE_TIME,
    refetchOnWindowFocus: false,
  });
}

export function useVulnerabilitiesSpecialRelationships(clientGroupId: number) {
  return useQuery({
    queryKey: healthVulnerabilityKeys.vulnerabilities.specialRelationships(clientGroupId),
    queryFn: () => api.fetchVulnerabilitiesSpecialRelationships({ clientGroupId }),
    staleTime: STALE_TIME,
    refetchOnWindowFocus: false,
  });
}

// =============================================================================
// Helper Functions for Optimistic Updates
// =============================================================================

/**
 * Context returned from optimistic update mutations for rollback on error
 */
interface OptimisticUpdateContext {
  /** Snapshot of previous query data for rollback */
  previousData: Array<[any, any]>;
}

/**
 * Performs an optimistic update on all health queries in the cache.
 * Cancels outgoing queries, snapshots previous data, and applies the update function.
 *
 * @param queryClient - React Query client instance
 * @param updateFn - Function to apply to each record in the cache
 * @param keyPrefix - Query key prefix to filter queries
 * @returns Context with previous data for rollback on error
 */
async function performOptimisticUpdate<T>(
  queryClient: QueryClient,
  updateFn: (record: T) => T | null,
  keyPrefix: readonly string[]
): Promise<OptimisticUpdateContext> {
  await queryClient.cancelQueries({ queryKey: keyPrefix });

  const previousData: Array<[any, any]> = [];
  const queries = queryClient.getQueryCache().getAll();

  for (const query of queries) {
    const key = query.queryKey;
    if (Array.isArray(key) && key[0] === keyPrefix[0] && key[1] === keyPrefix[1]) {
      const oldData = queryClient.getQueryData<T[]>(key);
      if (oldData && Array.isArray(oldData)) {
        previousData.push([key, oldData]);
        const newData = oldData.map(updateFn).filter((item): item is T => item !== null);
        queryClient.setQueryData<T[]>(key, newData);
      }
    }
  }

  return { previousData };
}

/**
 * Rolls back optimistic updates by restoring previous query data.
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

// =============================================================================
// Mutation Hooks
// =============================================================================

/**
 * Hook for creating a new health record
 * Automatically invalidates health queries on success
 *
 * @returns {UseMutationResult} React Query mutation result
 *
 * @example
 * const createHealth = useCreateHealthRecord();
 * createHealth.mutate({
 *   product_owner_id: 1,
 *   condition: 'Diabetes',
 *   name: 'Type 2',
 *   status: 'Active'
 * });
 */
export function useCreateHealthRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.createHealthRecord,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: healthVulnerabilityKeys.health.all });
    },
  });
}

/**
 * Hook for updating an existing health record
 * Includes optimistic updates for immediate UI feedback with rollback on error
 */
export function useUpdateHealthRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data, personType }: { id: number; data: Partial<HealthConditionFormData>; personType: PersonType }) =>
      api.updateHealthRecord(id, data, personType),
    onMutate: async ({ id, data }) => {
      // Optimistic update - immediately reflect changes in UI
      return performOptimisticUpdate(
        queryClient,
        (record: HealthCondition) => record.id === id ? { ...record, ...data } : record,
        healthVulnerabilityKeys.health.all
      );
    },
    onError: (error, variables, context) => {
      // Rollback on error
      rollbackOptimisticUpdate(queryClient, context);
    },
    onSettled: () => {
      // Always refetch to ensure server state accuracy
      queryClient.invalidateQueries({ queryKey: healthVulnerabilityKeys.health.all });
    },
  });
}

/**
 * Hook for deleting a health record
 * Includes optimistic updates - record disappears immediately from UI
 */
export function useDeleteHealthRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, personType }: { id: number; personType: PersonType }) =>
      api.deleteHealthRecord(id, personType),
    onMutate: async ({ id }) => {
      // Optimistic delete - remove from UI immediately
      return performOptimisticUpdate(
        queryClient,
        (record: HealthCondition) => record.id === id ? null : record,
        healthVulnerabilityKeys.health.all
      );
    },
    onError: (error, variables, context) => {
      rollbackOptimisticUpdate(queryClient, context);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: healthVulnerabilityKeys.health.all });
    },
  });
}

/**
 * Hook for creating a new vulnerability
 */
export function useCreateVulnerability() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.createVulnerability,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: healthVulnerabilityKeys.vulnerabilities.all });
    },
  });
}

/**
 * Hook for updating an existing vulnerability
 * Includes optimistic updates for immediate UI feedback
 */
export function useUpdateVulnerability() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data, personType }: { id: number; data: Partial<VulnerabilityFormData>; personType: PersonType }) =>
      api.updateVulnerability(id, data, personType),
    onMutate: async ({ id, data }) => {
      return performOptimisticUpdate(
        queryClient,
        (record: Vulnerability) => record.id === id ? { ...record, ...data } : record,
        healthVulnerabilityKeys.vulnerabilities.all
      );
    },
    onError: (error, variables, context) => {
      rollbackOptimisticUpdate(queryClient, context);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: healthVulnerabilityKeys.vulnerabilities.all });
    },
  });
}

/**
 * Hook for deleting a vulnerability
 * Includes optimistic updates - record disappears immediately from UI
 */
export function useDeleteVulnerability() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, personType }: { id: number; personType: PersonType }) =>
      api.deleteVulnerability(id, personType),
    onMutate: async ({ id }) => {
      return performOptimisticUpdate(
        queryClient,
        (record: Vulnerability) => record.id === id ? null : record,
        healthVulnerabilityKeys.vulnerabilities.all
      );
    },
    onError: (error, variables, context) => {
      rollbackOptimisticUpdate(queryClient, context);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: healthVulnerabilityKeys.vulnerabilities.all });
    },
  });
}
```

---

## BLUE Phase - Refactor

- [ ] Add optimistic updates for mutations
- [ ] Add error handling with rollback
- [ ] Add comprehensive JSDoc documentation
- [ ] Export hooks from `frontend/src/hooks/index.ts`

---

## Acceptance Criteria

- [ ] All API service tests pass
- [ ] All hook tests pass
- [ ] Hooks properly invalidate queries on mutations
- [ ] Loading and error states handled
- [ ] Query keys properly structured for cache management
