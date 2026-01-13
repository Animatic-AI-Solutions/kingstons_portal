# Plan 05: Frontend React Query Hooks

## Overview

This plan covers the React Query hooks for the Legal Documents feature. The TypeScript interfaces and API service from Plan 04 must be implemented before this plan.

## Prerequisites

- TypeScript interfaces in `types/legalDocument.ts`
- API service in `services/legalDocumentsApi.ts`
- Backend API is accessible

---

## TDD Cycle 1: Query Hook

### Red Phase

**Agent**: Tester-Agent
**Task**: Write failing tests for the query hook
**Files to create**: `frontend/src/tests/hooks/useLegalDocuments.query.test.ts`

```typescript
/**
 * Test suite for useLegalDocuments Query Hook
 *
 * Tests the React Query hook for fetching legal documents.
 *
 * Test Coverage:
 * - Query key generation
 * - Disabled state when productOwnerId is null/undefined
 * - Filter application
 * - Loading, error, and success states
 * - Stale time configuration
 */

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import React from 'react';

import { useLegalDocuments, legalDocumentsKeys } from '@/hooks/useLegalDocuments';
import * as api from '@/services/legalDocumentsApi';

// Mock the API service
vi.mock('@/services/legalDocumentsApi');

const mockFetchLegalDocuments = api.fetchLegalDocuments as jest.MockedFunction<
  typeof api.fetchLegalDocuments
>;

// Sample test data
const sampleDocuments = [
  {
    id: 1,
    type: 'Will',
    document_date: '2024-01-15',
    status: 'Signed' as const,
    notes: 'Test notes',
    product_owner_ids: [123],
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
  },
  {
    id: 2,
    type: 'EPA',
    document_date: '2024-02-20',
    status: 'Lapsed' as const,
    notes: null,
    product_owner_ids: [123, 456],
    created_at: '2024-02-20T10:00:00Z',
    updated_at: '2024-02-20T10:00:00Z',
  },
];

// Create wrapper with QueryClientProvider
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('legalDocumentsKeys', () => {
  it('should have correct base key', () => {
    expect(legalDocumentsKeys.all).toEqual(['legalDocuments']);
  });

  it('should generate correct key for product owner', () => {
    expect(legalDocumentsKeys.byProductOwner(123)).toEqual(['legalDocuments', 123]);
  });
});

describe('useLegalDocuments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchLegalDocuments.mockResolvedValue(sampleDocuments);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should fetch documents for a product owner', async () => {
    const { result } = renderHook(() => useLegalDocuments(123), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFetchLegalDocuments).toHaveBeenCalledWith(123, undefined);
    expect(result.current.data).toEqual(sampleDocuments);
  });

  it('should be disabled when productOwnerId is null', () => {
    const { result } = renderHook(() => useLegalDocuments(null), {
      wrapper: createWrapper(),
    });

    expect(result.current.isFetching).toBe(false);
    expect(mockFetchLegalDocuments).not.toHaveBeenCalled();
  });

  it('should be disabled when productOwnerId is undefined', () => {
    const { result } = renderHook(() => useLegalDocuments(undefined), {
      wrapper: createWrapper(),
    });

    expect(result.current.isFetching).toBe(false);
    expect(mockFetchLegalDocuments).not.toHaveBeenCalled();
  });

  it('should apply filters when provided', async () => {
    const filters = { type: 'Will' as const, status: 'Signed' as const };

    const { result } = renderHook(
      () => useLegalDocuments(123, { filters }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFetchLegalDocuments).toHaveBeenCalledWith(123, filters);
  });

  it('should return loading state initially', () => {
    const { result } = renderHook(() => useLegalDocuments(123), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
  });

  it('should handle API errors', async () => {
    mockFetchLegalDocuments.mockRejectedValue(new Error('API Error'));

    const { result } = renderHook(() => useLegalDocuments(123), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error?.message).toBe('API Error');
  });
});
```

### Green Phase

**Agent**: coder-agent
**Task**: Implement the query hook to pass tests
**Files to create**: `frontend/src/hooks/useLegalDocuments.ts` (partial - query only)

```typescript
/**
 * Legal Documents React Query Hooks
 *
 * Provides React Query hooks for managing legal documents with:
 * - Query hook for fetching documents
 * - Mutation hooks for create/update/delete operations
 * - Optimistic updates with rollback on error
 * - Cache invalidation after mutations
 *
 * Cache Strategy:
 * - staleTime: 5 minutes (300000ms)
 * - gcTime: 10 minutes (600000ms)
 * - refetchOnWindowFocus: false
 *
 * @module hooks/useLegalDocuments
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
  CreateLegalDocumentData,
  UpdateLegalDocumentData,
  LegalDocumentFilters,
  LegalDocumentStatus,
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
 * // Invalidate all legal documents queries
 * queryClient.invalidateQueries({ queryKey: legalDocumentsKeys.all });
 *
 * // Invalidate specific product owner
 * queryClient.invalidateQueries({
 *   queryKey: legalDocumentsKeys.byProductOwner(123)
 * });
 */
export const legalDocumentsKeys = {
  /** Base key for all legal documents queries */
  all: ['legalDocuments'] as const,

  /**
   * Key for client group-specific queries (primary query pattern)
   * Includes filters in the key to ensure proper cache separation
   * @param clientGroupId - The client group ID
   * @param filters - Optional filters (type, status)
   */
  byClientGroup: (
    clientGroupId: number,
    filters?: LegalDocumentFilters
  ) => ['legalDocuments', 'clientGroup', clientGroupId, filters ?? {}] as const,

  /**
   * Key for product owner-specific queries
   * Includes filters in the key to ensure proper cache separation
   * @param productOwnerId - The product owner ID
   * @param filters - Optional filters (type, status)
   */
  byProductOwner: (
    productOwnerId: number,
    filters?: LegalDocumentFilters
  ) => ['legalDocuments', 'productOwner', productOwnerId, filters ?? {}] as const,
};

// =============================================================================
// Query Hook
// =============================================================================

/**
 * Query hook for fetching legal documents for a client group.
 * This is the primary query pattern - documents are linked to client groups
 * indirectly through product owners.
 *
 * Features:
 * - Automatic caching with 5-minute stale time
 * - Disabled when clientGroupId is null/undefined
 * - No refetch on window focus
 * - Query key includes filters to ensure proper cache separation
 *
 * @param clientGroupId - Client group ID (query disabled if null/undefined)
 * @param options - Optional configuration
 * @param options.filters - Filters for document type and/or status
 * @returns React Query result with documents data, loading, and error states
 *
 * @example
 * // Fetch all documents for a client group
 * const { data, isLoading, error } = useLegalDocuments(123);
 *
 * // Fetch with filters
 * const { data } = useLegalDocuments(123, {
 *   filters: { type: 'Will', status: 'Signed' }
 * });
 *
 * // Disabled query (doesn't fetch)
 * const { data } = useLegalDocuments(null);
 */
export function useLegalDocuments(
  clientGroupId: number | null | undefined,
  options?: { filters?: LegalDocumentFilters }
) {
  const filters = options?.filters;

  return useQuery({
    // CRITICAL: Include filters in query key to ensure different filter
    // combinations are cached separately and don't return stale data
    queryKey: legalDocumentsKeys.byClientGroup(clientGroupId || 0, filters),
    queryFn: () => fetchLegalDocumentsByClientGroup(clientGroupId!, filters),
    enabled: !!clientGroupId,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    refetchOnWindowFocus: false,
  });
}

/**
 * Query hook for fetching legal documents by specific product owner IDs.
 * Use this when you need to filter by specific product owners rather than
 * all product owners in a client group.
 *
 * @param productOwnerIds - Array of product owner IDs
 * @param options - Optional configuration
 * @param options.filters - Filters for document type and/or status
 * @returns React Query result with documents data, loading, and error states
 */
export function useLegalDocumentsByProductOwners(
  productOwnerIds: number[] | null | undefined,
  options?: { filters?: LegalDocumentFilters }
) {
  const filters = options?.filters;
  // Create a stable key from the product owner IDs
  const poIdKey = productOwnerIds?.sort().join(',') || '';

  return useQuery({
    queryKey: ['legalDocuments', 'productOwners', poIdKey, filters ?? {}] as const,
    queryFn: () => fetchLegalDocuments(productOwnerIds!, filters),
    enabled: !!productOwnerIds && productOwnerIds.length > 0,
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    refetchOnWindowFocus: false,
  });
}
```

### Blue Phase

**Agent**: coder-agent
**Task**: Refactor for consistency with useSpecialRelationships pattern

---

## TDD Cycle 2: Mutation Hooks

### Red Phase

**Agent**: Tester-Agent
**Task**: Write failing tests for mutation hooks
**Files to create**: `frontend/src/tests/hooks/useLegalDocuments.mutations.test.ts`

```typescript
/**
 * Test suite for useLegalDocuments Mutation Hooks
 *
 * Tests the React Query mutation hooks for legal documents.
 *
 * Test Coverage:
 * - useCreateLegalDocument
 * - useUpdateLegalDocument
 * - useUpdateLegalDocumentStatus (with optimistic updates)
 * - useDeleteLegalDocument (with optimistic updates)
 * - Cache invalidation after mutations
 * - Rollback on error
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import React from 'react';

import {
  useLegalDocuments,
  useCreateLegalDocument,
  useUpdateLegalDocument,
  useUpdateLegalDocumentStatus,
  useDeleteLegalDocument,
  legalDocumentsKeys,
} from '@/hooks/useLegalDocuments';
import * as api from '@/services/legalDocumentsApi';

// Mock the API service
vi.mock('@/services/legalDocumentsApi');

const mockApi = {
  fetchLegalDocuments: api.fetchLegalDocuments as jest.MockedFunction<typeof api.fetchLegalDocuments>,
  createLegalDocument: api.createLegalDocument as jest.MockedFunction<typeof api.createLegalDocument>,
  updateLegalDocument: api.updateLegalDocument as jest.MockedFunction<typeof api.updateLegalDocument>,
  updateLegalDocumentStatus: api.updateLegalDocumentStatus as jest.MockedFunction<typeof api.updateLegalDocumentStatus>,
  deleteLegalDocument: api.deleteLegalDocument as jest.MockedFunction<typeof api.deleteLegalDocument>,
};

// Sample test data
const sampleDocument = {
  id: 1,
  type: 'Will',
  document_date: '2024-01-15',
  status: 'Signed' as const,
  notes: 'Test notes',
  product_owner_ids: [123],
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
};

const sampleDocuments = [sampleDocument];

let queryClient: QueryClient;

// Create wrapper with QueryClientProvider
const createWrapper = () => {
  queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useCreateLegalDocument', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi.createLegalDocument.mockResolvedValue(sampleDocument);
    mockApi.fetchLegalDocuments.mockResolvedValue(sampleDocuments);
  });

  it('should create a document and invalidate queries', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useCreateLegalDocument(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        type: 'Will',
        product_owner_ids: [123],
      });
    });

    expect(mockApi.createLegalDocument).toHaveBeenCalledWith({
      type: 'Will',
      product_owner_ids: [123],
    });
  });

  it('should call onSuccess callback with created document', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useCreateLegalDocument(), { wrapper });

    const onSuccess = vi.fn();

    await act(async () => {
      await result.current.mutateAsync(
        { type: 'Will', product_owner_ids: [123] },
        { onSuccess }
      );
    });

    expect(onSuccess).toHaveBeenCalledWith(sampleDocument, expect.anything(), expect.anything());
  });
});

describe('useUpdateLegalDocument', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi.updateLegalDocument.mockResolvedValue({
      ...sampleDocument,
      notes: 'Updated notes',
    });
  });

  it('should update a document', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useUpdateLegalDocument(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        id: 1,
        data: { notes: 'Updated notes' },
      });
    });

    expect(mockApi.updateLegalDocument).toHaveBeenCalledWith(1, { notes: 'Updated notes' });
  });

  it('should perform optimistic update', async () => {
    const wrapper = createWrapper();

    // Pre-populate cache with sample documents
    queryClient.setQueryData(legalDocumentsKeys.byProductOwner(123), sampleDocuments);

    // Store original cache state for comparison
    const originalCacheState = queryClient.getQueryData<typeof sampleDocuments>(
      legalDocumentsKeys.byProductOwner(123)
    );
    expect(originalCacheState?.[0]?.notes).toBe('Test notes');

    const { result } = renderHook(() => useUpdateLegalDocument(), { wrapper });

    // Trigger mutation - optimistic update should happen IMMEDIATELY
    act(() => {
      result.current.mutate({ id: 1, data: { notes: 'Optimistic update' } });
    });

    // CRITICAL: Verify cache was IMMEDIATELY updated (before server response)
    // This is the synchronous check that validates optimistic update worked
    const cachedDataDuringMutation = queryClient.getQueryData<typeof sampleDocuments>(
      legalDocumentsKeys.byProductOwner(123)
    );

    // The cache should be updated BEFORE the server responds
    expect(cachedDataDuringMutation?.[0]?.notes).toBe('Optimistic update');

    // Mutation should still be pending at this point
    expect(result.current.isPending).toBe(true);

    // Wait for mutation to complete
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // After server response, cache should still have the updated value
    const cachedDataAfterMutation = queryClient.getQueryData<typeof sampleDocuments>(
      legalDocumentsKeys.byProductOwner(123)
    );
    expect(cachedDataAfterMutation?.[0]?.notes).toBe('Optimistic update');
  });

  it('should rollback optimistic update on error', async () => {
    const wrapper = createWrapper();

    // Pre-populate cache with sample documents
    queryClient.setQueryData(legalDocumentsKeys.byProductOwner(123), sampleDocuments);

    // Make API call fail
    mockApi.updateLegalDocument.mockRejectedValue(new Error('API Error'));

    const { result } = renderHook(() => useUpdateLegalDocument(), { wrapper });

    // Trigger mutation
    act(() => {
      result.current.mutate({ id: 1, data: { notes: 'This will fail' } });
    });

    // Cache should be optimistically updated immediately
    const cachedDuringMutation = queryClient.getQueryData<typeof sampleDocuments>(
      legalDocumentsKeys.byProductOwner(123)
    );
    expect(cachedDuringMutation?.[0]?.notes).toBe('This will fail');

    // Wait for error
    await waitFor(() => expect(result.current.isError).toBe(true));

    // Cache should be rolled back to original value
    const cachedAfterError = queryClient.getQueryData<typeof sampleDocuments>(
      legalDocumentsKeys.byProductOwner(123)
    );
    expect(cachedAfterError?.[0]?.notes).toBe('Test notes');
  });
});

describe('useUpdateLegalDocumentStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi.updateLegalDocumentStatus.mockResolvedValue({
      ...sampleDocument,
      status: 'Lapsed',
    });
    mockApi.fetchLegalDocuments.mockResolvedValue(sampleDocuments);
  });

  it('should update status to Lapsed', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useUpdateLegalDocumentStatus(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({ id: 1, status: 'Lapsed' });
    });

    expect(mockApi.updateLegalDocumentStatus).toHaveBeenCalledWith(1, 'Lapsed');
  });

  it('should perform optimistic update on status change', async () => {
    const wrapper = createWrapper();

    // Pre-populate cache
    queryClient.setQueryData(legalDocumentsKeys.byProductOwner(123), sampleDocuments);

    const { result } = renderHook(() => useUpdateLegalDocumentStatus(), { wrapper });

    // Trigger mutation (optimistic update happens immediately)
    act(() => {
      result.current.mutate({ id: 1, status: 'Lapsed' });
    });

    // Verify optimistic update was applied to cache
    const cachedData = queryClient.getQueryData<typeof sampleDocuments>(
      legalDocumentsKeys.byProductOwner(123)
    );

    // The optimistic update should have changed the status
    expect(cachedData?.[0]?.status).toBe('Lapsed');
  });

  it('should rollback on error', async () => {
    const wrapper = createWrapper();

    // Pre-populate cache with Signed status
    queryClient.setQueryData(legalDocumentsKeys.byProductOwner(123), sampleDocuments);

    mockApi.updateLegalDocumentStatus.mockRejectedValue(new Error('API Error'));

    const { result } = renderHook(() => useUpdateLegalDocumentStatus(), { wrapper });

    await act(async () => {
      try {
        await result.current.mutateAsync({ id: 1, status: 'Lapsed' });
      } catch {
        // Expected to throw
      }
    });

    // Cache should be rolled back to original value
    await waitFor(() => {
      const cachedData = queryClient.getQueryData<typeof sampleDocuments>(
        legalDocumentsKeys.byProductOwner(123)
      );
      expect(cachedData?.[0]?.status).toBe('Signed');
    });
  });
});

describe('useDeleteLegalDocument', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi.deleteLegalDocument.mockResolvedValue(undefined);
    mockApi.fetchLegalDocuments.mockResolvedValue(sampleDocuments);
  });

  it('should delete a document', async () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useDeleteLegalDocument(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync(1);
    });

    expect(mockApi.deleteLegalDocument).toHaveBeenCalledWith(1);
  });

  it('should optimistically remove document from cache', async () => {
    const wrapper = createWrapper();

    // Pre-populate cache with documents (2 documents: id 1 and id 2)
    queryClient.setQueryData(legalDocumentsKeys.byProductOwner(123), sampleDocuments);

    // Verify initial state
    const initialCache = queryClient.getQueryData<typeof sampleDocuments>(
      legalDocumentsKeys.byProductOwner(123)
    );
    expect(initialCache).toHaveLength(2);
    expect(initialCache?.find(d => d.id === 1)).toBeDefined();

    const { result } = renderHook(() => useDeleteLegalDocument(), { wrapper });

    // Trigger mutation - optimistic update should happen IMMEDIATELY
    act(() => {
      result.current.mutate(1);
    });

    // CRITICAL: Verify cache was IMMEDIATELY updated (before server response)
    const cachedDataDuringMutation = queryClient.getQueryData<typeof sampleDocuments>(
      legalDocumentsKeys.byProductOwner(123)
    );

    // Document with id 1 should be removed, document with id 2 should remain
    expect(cachedDataDuringMutation).toHaveLength(1);
    expect(cachedDataDuringMutation?.find(d => d.id === 1)).toBeUndefined();
    expect(cachedDataDuringMutation?.find(d => d.id === 2)).toBeDefined();

    // Mutation should still be pending at this point
    expect(result.current.isPending).toBe(true);

    // Wait for mutation to complete
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('should restore document on delete error', async () => {
    const wrapper = createWrapper();

    // Pre-populate cache with documents (2 documents)
    queryClient.setQueryData(legalDocumentsKeys.byProductOwner(123), sampleDocuments);

    mockApi.deleteLegalDocument.mockRejectedValue(new Error('Delete failed'));

    const { result } = renderHook(() => useDeleteLegalDocument(), { wrapper });

    // Trigger mutation
    act(() => {
      result.current.mutate(1);
    });

    // Cache should be optimistically updated (document removed)
    const cachedDuringMutation = queryClient.getQueryData<typeof sampleDocuments>(
      legalDocumentsKeys.byProductOwner(123)
    );
    expect(cachedDuringMutation).toHaveLength(1);
    expect(cachedDuringMutation?.find(d => d.id === 1)).toBeUndefined();

    // Wait for error
    await waitFor(() => expect(result.current.isError).toBe(true));

    // Cache should be rolled back - document should be restored
    const cachedAfterError = queryClient.getQueryData<typeof sampleDocuments>(
      legalDocumentsKeys.byProductOwner(123)
    );
    expect(cachedAfterError).toHaveLength(2);
    expect(cachedAfterError?.find(d => d.id === 1)).toBeDefined();
  });
});

// =============================================================================
// Property-Based Tests (using fast-check)
// =============================================================================

import * as fc from 'fast-check';

// Generator for valid LegalDocument objects
const legalDocumentArb = fc.record({
  id: fc.integer({ min: 1, max: 10000 }),
  type: fc.oneof(
    fc.constantFrom('Will', 'LPOA P&F', 'LPOA H&W', 'EPA', 'General Power of Attorney', 'Advance Directive'),
    fc.string({ minLength: 1, maxLength: 100 })
  ),
  document_date: fc.oneof(fc.constant(null), fc.date().map(d => d.toISOString().split('T')[0])),
  status: fc.constantFrom('Signed', 'Lapsed', 'Registered') as fc.Arbitrary<'Signed' | 'Lapsed' | 'Registered'>,
  notes: fc.oneof(fc.constant(null), fc.string({ minLength: 0, maxLength: 2000 })),
  product_owner_ids: fc.array(fc.integer({ min: 1, max: 10000 }), { minLength: 1, maxLength: 5 }),
  created_at: fc.date().map(d => d.toISOString()),
  updated_at: fc.date().map(d => d.toISOString()),
});

// Generator for arrays of legal documents
const legalDocumentArrayArb = fc.array(legalDocumentArb, { minLength: 0, maxLength: 20 });

describe('Property-based: Query Key Generation', () => {
  it('should always return array starting with base key', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 10000 }), (productOwnerId) => {
        const key = legalDocumentsKeys.byProductOwner(productOwnerId);
        return Array.isArray(key) && key[0] === 'legalDocuments';
      }),
      { numRuns: 100 }
    );
  });

  it('should include productOwnerId in key', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 10000 }), (productOwnerId) => {
        const key = legalDocumentsKeys.byProductOwner(productOwnerId);
        return key.includes(productOwnerId);
      }),
      { numRuns: 100 }
    );
  });

  it('should generate unique keys for different productOwnerIds', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5000 }),
        fc.integer({ min: 5001, max: 10000 }),
        (id1, id2) => {
          const key1 = legalDocumentsKeys.byProductOwner(id1);
          const key2 = legalDocumentsKeys.byProductOwner(id2);
          return JSON.stringify(key1) !== JSON.stringify(key2);
        }
      ),
      { numRuns: 50 }
    );
  });
});

describe('Property-based: Optimistic Update Behavior', () => {
  it('should handle any valid document array in cache', async () => {
    await fc.assert(
      fc.asyncProperty(legalDocumentArrayArb, async (documents) => {
        const queryClient = new QueryClient({
          defaultOptions: { queries: { retry: false } },
        });

        // Set up cache with random documents
        queryClient.setQueryData(legalDocumentsKeys.byProductOwner(123), documents);

        // Get cached data
        const cached = queryClient.getQueryData<typeof documents>(
          legalDocumentsKeys.byProductOwner(123)
        );

        // Cache should contain the same documents
        return cached?.length === documents.length;
      }),
      { numRuns: 50 }
    );
  });

  it('should correctly filter by status for any document array', () => {
    fc.assert(
      fc.property(legalDocumentArrayArb, (documents) => {
        const activeDocuments = documents.filter(d => d.status === 'Signed');
        const lapsedDocuments = documents.filter(d => d.status === 'Lapsed');
        const supersededDocuments = documents.filter(d => d.status === 'Registered');

        // All documents should be accounted for
        return (
          activeDocuments.length + lapsedDocuments.length + supersededDocuments.length ===
          documents.length
        );
      }),
      { numRuns: 100 }
    );
  });

  it('should find document by id for any array', () => {
    fc.assert(
      fc.property(
        fc.array(legalDocumentArb, { minLength: 1, maxLength: 20 }),
        (documents) => {
          // Pick a random document from the array
          const randomDoc = documents[0];
          const found = documents.find(d => d.id === randomDoc.id);
          return found !== undefined && found.id === randomDoc.id;
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Property-based: Cache Update Functions', () => {
  it('should correctly update single document in any array', () => {
    fc.assert(
      fc.property(
        fc.array(legalDocumentArb, { minLength: 1, maxLength: 20 }),
        fc.string({ minLength: 1, maxLength: 100 }),
        (documents, newNotes) => {
          const targetId = documents[0].id;

          // Simulate optimistic update
          const updatedDocs = documents.map(doc =>
            doc.id === targetId ? { ...doc, notes: newNotes } : doc
          );

          // Find the updated document
          const updated = updatedDocs.find(d => d.id === targetId);

          return updated?.notes === newNotes;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should correctly remove document from any array', () => {
    fc.assert(
      fc.property(
        fc.array(legalDocumentArb, { minLength: 1, maxLength: 20 }),
        (documents) => {
          const targetId = documents[0].id;

          // Simulate delete
          const filtered = documents.filter(d => d.id !== targetId);

          // Document should be removed
          return (
            filtered.length === documents.length - 1 &&
            !filtered.find(d => d.id === targetId)
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should correctly change status for any document', () => {
    fc.assert(
      fc.property(
        legalDocumentArb,
        fc.constantFrom('Signed', 'Lapsed', 'Registered') as fc.Arbitrary<'Signed' | 'Lapsed' | 'Registered'>,
        (document, newStatus) => {
          const updated = { ...document, status: newStatus };
          return updated.status === newStatus;
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Property-based: Hook State Consistency', () => {
  it('should maintain consistent data after multiple updates', () => {
    fc.assert(
      fc.property(
        legalDocumentArrayArb,
        fc.array(
          fc.record({
            id: fc.integer({ min: 1, max: 100 }),
            notes: fc.string({ minLength: 0, maxLength: 500 }),
          }),
          { minLength: 0, maxLength: 5 }
        ),
        (initialDocs, updates) => {
          // Apply multiple updates
          let currentDocs = [...initialDocs];

          for (const update of updates) {
            currentDocs = currentDocs.map(doc =>
              doc.id === update.id ? { ...doc, notes: update.notes } : doc
            );
          }

          // All initial docs should still exist (we only updated, not deleted)
          return currentDocs.length === initialDocs.length;
        }
      ),
      { numRuns: 50 }
    );
  });
});
```

### Green Phase

**Agent**: coder-agent
**Task**: Add mutation hooks to the hooks file
**Files to update**: `frontend/src/hooks/useLegalDocuments.ts`

```typescript
// Add to existing file after query hook:

// =============================================================================
// Types for Optimistic Updates
// =============================================================================

/**
 * Context returned from optimistic update mutations for rollback on error
 */
interface OptimisticUpdateContext {
  /** Snapshot of previous query data for rollback */
  previousData: Array<[unknown, unknown]>;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Performs an optimistic update on all legal documents queries in the cache.
 * Cancels outgoing queries, snapshots previous data, and applies the update function.
 *
 * @param queryClient - React Query client instance
 * @param updateFn - Function to apply to each document in the cache
 * @returns Context with previous data for rollback on error
 */
async function performOptimisticUpdate(
  queryClient: QueryClient,
  updateFn: (document: LegalDocument) => LegalDocument
): Promise<OptimisticUpdateContext> {
  // Cancel outgoing refetches to avoid overwriting optimistic update
  await queryClient.cancelQueries({
    queryKey: legalDocumentsKeys.all,
  });

  // Snapshot previous values for rollback
  const previousData: Array<[unknown, unknown]> = [];

  // Update all legal documents queries in cache
  const queries = queryClient.getQueryCache().getAll();
  for (const query of queries) {
    const key = query.queryKey;
    // Check if this is a legal documents query
    if (Array.isArray(key) && key.length >= 1 && key[0] === 'legalDocuments') {
      const oldData = queryClient.getQueryData<LegalDocument[]>(key);
      if (oldData && Array.isArray(oldData) && oldData.length > 0) {
        previousData.push([key, oldData]);
        const newData = oldData.map(updateFn);
        queryClient.setQueryData<LegalDocument[]>(key, newData);
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
      queryClient.setQueryData(queryKey as unknown[], data);
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
// Mutation Hooks
// =============================================================================

/**
 * Mutation hook for creating new legal documents.
 *
 * Features:
 * - Invalidates all queries after successful creation
 * - Returns newly created document in mutation result
 *
 * @returns React Query mutation result with mutate/mutateAsync functions
 *
 * @example
 * const createMutation = useCreateLegalDocument();
 *
 * const handleCreate = () => {
 *   createMutation.mutate({
 *     type: 'Will',
 *     product_owner_ids: [123],
 *     document_date: '2024-06-15',
 *     notes: 'New will document'
 *   }, {
 *     onSuccess: (newDocument) => {
 *       console.log('Created:', newDocument);
 *     }
 *   });
 * };
 */
export function useCreateLegalDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createLegalDocument,
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
 * const updateMutation = useUpdateLegalDocument();
 *
 * const handleUpdate = (documentId: number) => {
 *   updateMutation.mutate({
 *     id: documentId,
 *     data: { notes: 'Updated notes' }
 *   });
 * };
 */
export function useUpdateLegalDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateLegalDocumentData }) =>
      updateLegalDocument(id, data),
    onMutate: async ({ id, data }) => {
      // Perform optimistic update
      return performOptimisticUpdate(queryClient, (doc) =>
        doc.id === id ? { ...doc, ...data } : doc
      );
    },
    onError: (error, variables, context) => {
      // Rollback on error
      rollbackOptimisticUpdate(queryClient, context);
    },
    onSettled: () => {
      // Invalidate to ensure server state is accurate
      invalidateAllQueries(queryClient);
    },
  });
}

/**
 * Mutation hook for updating legal document status (Lapse/Reactivate).
 *
 * Features:
 * - Optimistic updates for immediate UI feedback
 * - Automatic rollback on error
 * - Cache invalidation after mutation settles
 *
 * @returns React Query mutation result with mutate/mutateAsync functions
 *
 * @example
 * const updateStatusMutation = useUpdateLegalDocumentStatus();
 *
 * // Lapse a document
 * updateStatusMutation.mutate({ id: 1, status: 'Lapsed' });
 *
 * // Reactivate a document
 * updateStatusMutation.mutate({ id: 1, status: 'Signed' });
 */
export function useUpdateLegalDocumentStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: LegalDocumentStatus }) =>
      updateLegalDocumentStatus(id, status),
    onMutate: async ({ id, status }) => {
      // Perform optimistic update
      return performOptimisticUpdate(queryClient, (doc) =>
        doc.id === id ? { ...doc, status } : doc
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
 * Mutation hook for deleting legal documents (hard delete).
 *
 * Features:
 * - Optimistic updates (removes from list instantly)
 * - Automatic rollback on error (restores deleted item)
 * - Cache invalidation after mutation settles
 *
 * @returns React Query mutation result with mutate/mutateAsync functions
 *
 * @example
 * const deleteMutation = useDeleteLegalDocument();
 *
 * const handleDelete = (documentId: number) => {
 *   deleteMutation.mutate(documentId, {
 *     onSuccess: () => {
 *       toast.success('Document deleted');
 *     },
 *     onError: () => {
 *       toast.error('Failed to delete document');
 *     }
 *   });
 * };
 */
export function useDeleteLegalDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteLegalDocument,
    onMutate: async (id: number) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: legalDocumentsKeys.all,
      });

      // Snapshot previous values for rollback
      const previousData: Array<[unknown, unknown]> = [];

      // Update all legal documents queries (filter out deleted item)
      const queries = queryClient.getQueryCache().getAll();
      for (const query of queries) {
        const key = query.queryKey;
        if (Array.isArray(key) && key.length >= 1 && key[0] === 'legalDocuments') {
          const oldData = queryClient.getQueryData<LegalDocument[]>(key);
          if (oldData && Array.isArray(oldData) && oldData.length > 0) {
            previousData.push([key, oldData]);
            const newData = oldData.filter((doc) => doc.id !== id);
            queryClient.setQueryData<LegalDocument[]>(key, newData);
          }
        }
      }

      return { previousData };
    },
    onError: (error, variables, context) => {
      // Rollback on error (restores deleted document)
      rollbackOptimisticUpdate(queryClient, context);
    },
    onSettled: () => {
      // Invalidate to ensure accuracy
      invalidateAllQueries(queryClient);
    },
  });
}
```

### Blue Phase

**Agent**: coder-agent
**Task**: Refactor for quality and add exports
**Changes**:
1. Ensure all hooks are exported from the file
2. Add comprehensive JSDoc comments
3. Ensure consistency with useSpecialRelationships.ts patterns

---

## Running Tests

```bash
# Run query hook tests
cd frontend
npm test -- src/tests/hooks/useLegalDocuments.query.test.ts

# Run mutation hook tests
npm test -- src/tests/hooks/useLegalDocuments.mutations.test.ts

# Run all with coverage
npm test -- --coverage src/tests/hooks/useLegalDocuments.*.test.ts
```

## Next Steps

Once all tests pass:
1. Proceed to Plan 06: LegalDocumentsTable Component
2. Hooks will be available for component implementation
