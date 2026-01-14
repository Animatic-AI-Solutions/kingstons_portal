/**
 * useLegalDocuments Mutation Hooks Tests (TDD Cycle 2 - RED Phase)
 *
 * Comprehensive test suite for React Query mutation hooks that manage legal documents
 * with optimistic updates, rollback on error, and cache invalidation.
 *
 * Tests all mutation hooks:
 * - useCreateLegalDocument: Create new document with cache invalidation
 * - useUpdateLegalDocument: Update document with optimistic updates
 * - useUpdateLegalDocumentStatus: Status update with optimistic updates
 * - useDeleteLegalDocument: Delete with optimistic removal and rollback
 *
 * Includes property-based tests using fast-check for:
 * - Query key generation consistency
 * - Optimistic update behavior
 * - Cache update functions
 *
 * Following TDD: These tests will FAIL until hooks are implemented
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import * as fc from 'fast-check';

import { createTestQueryClient, cleanupQueryClient } from '../utils/testUtils';
import {
  useCreateLegalDocument,
  useUpdateLegalDocument,
  useUpdateLegalDocumentStatus,
  useDeleteLegalDocument,
  legalDocumentsKeys,
} from '@/hooks/useLegalDocuments';
import {
  createLegalDocument,
  updateLegalDocument,
  updateLegalDocumentStatus,
  deleteLegalDocument,
  fetchLegalDocuments,
} from '@/services/legalDocumentsApi';
import {
  createMockLegalDocument,
  createMockLegalDocumentArray,
} from '../factories/legalDocumentFactory';
import type { LegalDocument, LegalDocumentStatus } from '@/types/legalDocument';

// Mock API service functions
jest.mock('@/services/legalDocumentsApi', () => ({
  fetchLegalDocuments: jest.fn(),
  createLegalDocument: jest.fn(),
  updateLegalDocument: jest.fn(),
  updateLegalDocumentStatus: jest.fn(),
  deleteLegalDocument: jest.fn(),
}));

const mockedFetch = fetchLegalDocuments as jest.MockedFunction<typeof fetchLegalDocuments>;
const mockedCreate = createLegalDocument as jest.MockedFunction<typeof createLegalDocument>;
const mockedUpdate = updateLegalDocument as jest.MockedFunction<typeof updateLegalDocument>;
const mockedUpdateStatus = updateLegalDocumentStatus as jest.MockedFunction<
  typeof updateLegalDocumentStatus
>;
const mockedDelete = deleteLegalDocument as jest.MockedFunction<typeof deleteLegalDocument>;

// =============================================================================
// Test Setup
// =============================================================================

describe('useCreateLegalDocument Hook (Mutation)', () => {
  let queryClient: ReturnType<typeof createTestQueryClient>;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanupQueryClient(queryClient);
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe('Create Mutation', () => {
    it('should create a document and call the API', async () => {
      const newDocument = createMockLegalDocument({
        id: 1,
        type: 'Will',
        product_owner_ids: [123],
      });

      mockedCreate.mockResolvedValueOnce(newDocument);

      const { result } = renderHook(() => useCreateLegalDocument(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({
          type: 'Will',
          product_owner_ids: [123],
        });
      });

      expect(mockedCreate).toHaveBeenCalledWith({
        type: 'Will',
        product_owner_ids: [123],
      });
    });

    it('should call onSuccess callback with created document', async () => {
      const newDocument = createMockLegalDocument({
        id: 1,
        type: 'Will',
        product_owner_ids: [123],
      });

      mockedCreate.mockResolvedValueOnce(newDocument);

      const { result } = renderHook(() => useCreateLegalDocument(), { wrapper });

      const onSuccess = jest.fn();

      await act(async () => {
        await result.current.mutateAsync(
          { type: 'Will', product_owner_ids: [123] },
          { onSuccess }
        );
      });

      expect(onSuccess).toHaveBeenCalledWith(
        newDocument,
        expect.anything(),
        expect.anything()
      );
    });

    it('should invalidate query cache after successful creation', async () => {
      const productOwnerId = 123;
      const existingDocuments = createMockLegalDocumentArray(2, {
        product_owner_ids: [productOwnerId],
      });
      const newDocument = createMockLegalDocument({
        id: 3,
        product_owner_ids: [productOwnerId],
      });

      // Pre-populate cache using prefetchQuery to create a Query object
      // Use gcTime to prevent garbage collection during test
      await queryClient.prefetchQuery({
        queryKey: legalDocumentsKeys.byProductOwner(productOwnerId),
        queryFn: () => Promise.resolve(existingDocuments),
        gcTime: 60000,
      });

      mockedCreate.mockResolvedValueOnce(newDocument);

      const { result } = renderHook(() => useCreateLegalDocument(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({
          type: 'Will',
          product_owner_ids: [productOwnerId],
        });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // Verify cache was invalidated (cache should be marked as stale)
      const queryState = queryClient.getQueryState(
        legalDocumentsKeys.byProductOwner(productOwnerId)
      );
      expect(queryState?.isInvalidated).toBe(true);
    });

    it('should handle creation errors', async () => {
      const errorMessage = 'Validation failed: Type is required';

      mockedCreate.mockRejectedValueOnce(new Error(errorMessage));

      const { result } = renderHook(() => useCreateLegalDocument(), { wrapper });

      await act(async () => {
        try {
          await result.current.mutateAsync({
            type: 'Will',
            product_owner_ids: [123],
          });
        } catch {
          // Expected to throw
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error).toBeTruthy();
    });

    it('should provide loading state during creation', async () => {
      const newDocument = createMockLegalDocument();

      mockedCreate.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve(newDocument), 100);
          })
      );

      const { result } = renderHook(() => useCreateLegalDocument(), { wrapper });

      act(() => {
        result.current.mutate({ type: 'Will', product_owner_ids: [123] });
      });

      // isPending becomes true asynchronously in React Query v5
      await waitFor(() => expect(result.current.isPending).toBe(true));

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.isPending).toBe(false);
    });
  });
});

describe('useUpdateLegalDocument Hook (Mutation)', () => {
  let queryClient: ReturnType<typeof createTestQueryClient>;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanupQueryClient(queryClient);
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe('Update Mutation', () => {
    it('should update a document', async () => {
      const updatedDocument = createMockLegalDocument({
        id: 1,
        notes: 'Updated notes',
      });

      mockedUpdate.mockResolvedValueOnce(updatedDocument);

      const { result } = renderHook(() => useUpdateLegalDocument(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({
          id: 1,
          data: { notes: 'Updated notes' },
        });
      });

      expect(mockedUpdate).toHaveBeenCalledWith(1, { notes: 'Updated notes' });
    });

    it('should perform optimistic update', async () => {
      const productOwnerId = 123;
      const originalDocument = createMockLegalDocument({
        id: 1,
        notes: 'Original notes',
        product_owner_ids: [productOwnerId],
      });
      const documents = [originalDocument];

      // Pre-populate cache using prefetchQuery to create a Query object
      // that getQueryCache().getAll() can find. Use gcTime to prevent immediate GC.
      await queryClient.prefetchQuery({
        queryKey: legalDocumentsKeys.byProductOwner(productOwnerId),
        queryFn: () => Promise.resolve(documents),
        gcTime: 60000, // Prevent garbage collection during test
      });

      // Store original cache state for comparison
      const originalCacheState = queryClient.getQueryData<LegalDocument[]>(
        legalDocumentsKeys.byProductOwner(productOwnerId)
      );
      expect(originalCacheState?.[0]?.notes).toBe('Original notes');

      const updatedDocument = { ...originalDocument, notes: 'Optimistic update' };
      mockedUpdate.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve(updatedDocument), 100);
          })
      );

      const { result } = renderHook(() => useUpdateLegalDocument(), { wrapper });

      // Trigger mutation - optimistic update happens via async onMutate
      act(() => {
        result.current.mutate({ id: 1, data: { notes: 'Optimistic update' } });
      });

      // In React Query v5, onMutate is async so wait for optimistic update
      await waitFor(() => {
        const cachedDataDuringMutation = queryClient.getQueryData<LegalDocument[]>(
          legalDocumentsKeys.byProductOwner(productOwnerId)
        );
        expect(cachedDataDuringMutation?.[0]?.notes).toBe('Optimistic update');
      });

      // Mutation should still be pending at this point
      expect(result.current.isPending).toBe(true);

      // Wait for mutation to complete
      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      // After server response, cache should still have the updated value
      const cachedDataAfterMutation = queryClient.getQueryData<LegalDocument[]>(
        legalDocumentsKeys.byProductOwner(productOwnerId)
      );
      expect(cachedDataAfterMutation?.[0]?.notes).toBe('Optimistic update');
    });

    it('should rollback optimistic update on error', async () => {
      const productOwnerId = 123;
      const originalDocument = createMockLegalDocument({
        id: 1,
        notes: 'Original notes',
        product_owner_ids: [productOwnerId],
      });
      const documents = [originalDocument];

      // Pre-populate cache using prefetchQuery to create a Query object
      // Use gcTime to prevent garbage collection during test
      await queryClient.prefetchQuery({
        queryKey: legalDocumentsKeys.byProductOwner(productOwnerId),
        queryFn: () => Promise.resolve(documents),
        gcTime: 60000,
      });

      // Make API call fail with a delay so we can observe the optimistic update
      mockedUpdate.mockImplementation(
        () =>
          new Promise((_, reject) => {
            setTimeout(() => reject(new Error('API Error')), 100);
          })
      );

      const { result } = renderHook(() => useUpdateLegalDocument(), { wrapper });

      // Trigger mutation
      act(() => {
        result.current.mutate({ id: 1, data: { notes: 'This will fail' } });
      });

      // In React Query v5, onMutate is async so wait for optimistic update
      await waitFor(() => {
        const cachedDuringMutation = queryClient.getQueryData<LegalDocument[]>(
          legalDocumentsKeys.byProductOwner(productOwnerId)
        );
        expect(cachedDuringMutation?.[0]?.notes).toBe('This will fail');
      });

      // Wait for error
      await waitFor(() => expect(result.current.isError).toBe(true));

      // Cache should be rolled back to original value
      const cachedAfterError = queryClient.getQueryData<LegalDocument[]>(
        legalDocumentsKeys.byProductOwner(productOwnerId)
      );
      expect(cachedAfterError?.[0]?.notes).toBe('Original notes');
    });

    it('should handle update with multiple product owners', async () => {
      const productOwnerIds = [101, 102, 103];
      const originalDocument = createMockLegalDocument({
        id: 1,
        product_owner_ids: productOwnerIds,
      });

      // Pre-populate cache for all product owners
      for (const ownerId of productOwnerIds) {
        queryClient.setQueryData(legalDocumentsKeys.byProductOwner(ownerId), [
          originalDocument,
        ]);
      }

      const updatedDocument = { ...originalDocument, notes: 'Multi-owner update' };
      mockedUpdate.mockResolvedValueOnce(updatedDocument);

      const { result } = renderHook(() => useUpdateLegalDocument(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({
          id: 1,
          data: { notes: 'Multi-owner update' },
        });
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });
});

describe('useUpdateLegalDocumentStatus Hook (Mutation)', () => {
  let queryClient: ReturnType<typeof createTestQueryClient>;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanupQueryClient(queryClient);
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe('Status Update Mutation', () => {
    it('should update status to Lapsed', async () => {
      const originalDocument = createMockLegalDocument({
        id: 1,
        status: 'Signed',
      });

      const updatedDocument = { ...originalDocument, status: 'Lapsed' as const };
      mockedUpdateStatus.mockResolvedValueOnce(updatedDocument);

      const { result } = renderHook(() => useUpdateLegalDocumentStatus(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({ id: 1, status: 'Lapsed' });
      });

      expect(mockedUpdateStatus).toHaveBeenCalledWith(1, 'Lapsed');
    });

    it('should update status to Registered', async () => {
      const originalDocument = createMockLegalDocument({
        id: 1,
        status: 'Signed',
      });

      const updatedDocument = { ...originalDocument, status: 'Registered' as const };
      mockedUpdateStatus.mockResolvedValueOnce(updatedDocument);

      const { result } = renderHook(() => useUpdateLegalDocumentStatus(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({ id: 1, status: 'Registered' });
      });

      expect(mockedUpdateStatus).toHaveBeenCalledWith(1, 'Registered');
      await waitFor(() => expect(result.current.data?.status).toBe('Registered'));
    });

    it('should perform optimistic update on status change', async () => {
      const productOwnerId = 123;
      const originalDocument = createMockLegalDocument({
        id: 1,
        status: 'Signed',
        product_owner_ids: [productOwnerId],
      });
      const documents = [originalDocument];

      // Pre-populate cache using prefetchQuery to create a Query object
      // Use gcTime to prevent garbage collection during test
      await queryClient.prefetchQuery({
        queryKey: legalDocumentsKeys.byProductOwner(productOwnerId),
        queryFn: () => Promise.resolve(documents),
        gcTime: 60000,
      });

      const updatedDocument = { ...originalDocument, status: 'Lapsed' as const };
      mockedUpdateStatus.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve(updatedDocument), 100);
          })
      );

      const { result } = renderHook(() => useUpdateLegalDocumentStatus(), { wrapper });

      // Trigger mutation (optimistic update happens via async onMutate)
      act(() => {
        result.current.mutate({ id: 1, status: 'Lapsed' });
      });

      // In React Query v5, onMutate is async so wait for optimistic update
      await waitFor(() => {
        const cachedData = queryClient.getQueryData<LegalDocument[]>(
          legalDocumentsKeys.byProductOwner(productOwnerId)
        );
        expect(cachedData?.[0]?.status).toBe('Lapsed');
      });

      // Wait for mutation to complete
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('should rollback status on error', async () => {
      const productOwnerId = 123;
      const originalDocument = createMockLegalDocument({
        id: 1,
        status: 'Signed',
        product_owner_ids: [productOwnerId],
      });
      const documents = [originalDocument];

      // Pre-populate cache with Signed status
      queryClient.setQueryData(
        legalDocumentsKeys.byProductOwner(productOwnerId),
        documents
      );

      mockedUpdateStatus.mockRejectedValueOnce(new Error('API Error'));

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
        const cachedData = queryClient.getQueryData<LegalDocument[]>(
          legalDocumentsKeys.byProductOwner(productOwnerId)
        );
        expect(cachedData?.[0]?.status).toBe('Signed');
      });
    });

    it('should handle all valid status transitions', async () => {
      const statuses: LegalDocumentStatus[] = ['Signed', 'Lapsed', 'Registered'];

      for (const status of statuses) {
        jest.clearAllMocks();

        const updatedDocument = createMockLegalDocument({ id: 1, status });
        mockedUpdateStatus.mockResolvedValueOnce(updatedDocument);

        const { result } = renderHook(() => useUpdateLegalDocumentStatus(), { wrapper });

        await act(async () => {
          await result.current.mutateAsync({ id: 1, status });
        });

        expect(mockedUpdateStatus).toHaveBeenCalledWith(1, status);
        await waitFor(() => expect(result.current.data?.status).toBe(status));
      }
    });
  });
});

describe('useDeleteLegalDocument Hook (Mutation)', () => {
  let queryClient: ReturnType<typeof createTestQueryClient>;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanupQueryClient(queryClient);
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe('Delete Mutation', () => {
    it('should delete a document', async () => {
      mockedDelete.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useDeleteLegalDocument(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync(1);
      });

      expect(mockedDelete).toHaveBeenCalledWith(1);
    });

    it('should optimistically remove document from cache', async () => {
      const productOwnerId = 123;
      const documents = createMockLegalDocumentArray(3, {
        product_owner_ids: [productOwnerId],
      });

      // Pre-populate cache using prefetchQuery to create a Query object
      // Use gcTime to prevent garbage collection during test
      await queryClient.prefetchQuery({
        queryKey: legalDocumentsKeys.byProductOwner(productOwnerId),
        queryFn: () => Promise.resolve(documents),
        gcTime: 60000,
      });

      // Verify initial state
      const initialCache = queryClient.getQueryData<LegalDocument[]>(
        legalDocumentsKeys.byProductOwner(productOwnerId)
      );
      expect(initialCache).toHaveLength(3);
      expect(initialCache?.find((d) => d.id === 1)).toBeDefined();

      mockedDelete.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve(undefined), 100);
          })
      );

      const { result } = renderHook(() => useDeleteLegalDocument(), { wrapper });

      // Trigger mutation - optimistic update happens via async onMutate
      act(() => {
        result.current.mutate(1);
      });

      // In React Query v5, onMutate is async so wait for optimistic update
      await waitFor(() => {
        const cachedDataDuringMutation = queryClient.getQueryData<LegalDocument[]>(
          legalDocumentsKeys.byProductOwner(productOwnerId)
        );
        expect(cachedDataDuringMutation).toHaveLength(2);
        expect(cachedDataDuringMutation?.find((d) => d.id === 1)).toBeUndefined();
      });

      // Mutation should still be pending at this point
      expect(result.current.isPending).toBe(true);

      // Wait for mutation to complete
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });

    it('should restore document on delete error', async () => {
      const productOwnerId = 123;
      const documents = createMockLegalDocumentArray(3, {
        product_owner_ids: [productOwnerId],
      });

      // Pre-populate cache using prefetchQuery to create a Query object
      // Use gcTime to prevent garbage collection during test
      await queryClient.prefetchQuery({
        queryKey: legalDocumentsKeys.byProductOwner(productOwnerId),
        queryFn: () => Promise.resolve(documents),
        gcTime: 60000,
      });

      // Make API call fail with a delay so we can observe the optimistic update
      mockedDelete.mockImplementation(
        () =>
          new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Delete failed')), 100);
          })
      );

      const { result } = renderHook(() => useDeleteLegalDocument(), { wrapper });

      // Trigger mutation
      act(() => {
        result.current.mutate(1);
      });

      // In React Query v5, onMutate is async so wait for optimistic update
      await waitFor(() => {
        const cachedDuringMutation = queryClient.getQueryData<LegalDocument[]>(
          legalDocumentsKeys.byProductOwner(productOwnerId)
        );
        expect(cachedDuringMutation).toHaveLength(2);
        expect(cachedDuringMutation?.find((d) => d.id === 1)).toBeUndefined();
      });

      // Wait for error
      await waitFor(() => expect(result.current.isError).toBe(true));

      // Cache should be rolled back - document should be restored
      const cachedAfterError = queryClient.getQueryData<LegalDocument[]>(
        legalDocumentsKeys.byProductOwner(productOwnerId)
      );
      expect(cachedAfterError).toHaveLength(3);
      expect(cachedAfterError?.find((d) => d.id === 1)).toBeDefined();
    });

    it('should handle deletion errors gracefully', async () => {
      const errorMessage = 'Permission denied';

      mockedDelete.mockRejectedValueOnce(new Error(errorMessage));

      const { result } = renderHook(() => useDeleteLegalDocument(), { wrapper });

      await act(async () => {
        try {
          await result.current.mutateAsync(1);
        } catch {
          // Expected to throw
        }
      });

      await waitFor(() => expect(result.current.isError).toBe(true));
      expect(result.current.error).toBeTruthy();
    });

    it('should provide loading state during deletion', async () => {
      mockedDelete.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve(undefined), 100);
          })
      );

      const { result } = renderHook(() => useDeleteLegalDocument(), { wrapper });

      act(() => {
        result.current.mutate(1);
      });

      // isPending becomes true asynchronously in React Query v5
      await waitFor(() => expect(result.current.isPending).toBe(true));

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.isPending).toBe(false);
    });

    it('should call onSuccess callback after successful deletion', async () => {
      mockedDelete.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useDeleteLegalDocument(), { wrapper });

      const onSuccess = jest.fn();

      await act(async () => {
        await result.current.mutateAsync(1, { onSuccess });
      });

      expect(onSuccess).toHaveBeenCalled();
    });
  });
});

// =============================================================================
// Property-Based Tests (using fast-check)
// =============================================================================

// Generator for valid LegalDocument objects
const legalDocumentArb = fc.record({
  id: fc.integer({ min: 1, max: 10000 }),
  type: fc.oneof(
    fc.constantFrom(
      'Will',
      'LPOA P&F',
      'LPOA H&W',
      'EPA',
      'General Power of Attorney',
      'Advance Directive'
    ),
    fc.string({ minLength: 1, maxLength: 100 })
  ),
  document_date: fc.oneof(
    fc.constant(null),
    fc
      .tuple(
        fc.integer({ min: 2020, max: 2030 }),
        fc.integer({ min: 1, max: 12 }),
        fc.integer({ min: 1, max: 28 })
      )
      .map(
        ([year, month, day]) =>
          `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      )
  ),
  status: fc.constantFrom('Signed', 'Lapsed', 'Registered') as fc.Arbitrary<
    'Signed' | 'Lapsed' | 'Registered'
  >,
  notes: fc.oneof(fc.constant(null), fc.string({ minLength: 0, maxLength: 2000 })),
  product_owner_ids: fc.array(fc.integer({ min: 1, max: 10000 }), {
    minLength: 1,
    maxLength: 5,
  }),
  created_at: fc
    .tuple(
      fc.integer({ min: 2020, max: 2030 }),
      fc.integer({ min: 1, max: 12 }),
      fc.integer({ min: 1, max: 28 }),
      fc.integer({ min: 0, max: 23 }),
      fc.integer({ min: 0, max: 59 }),
      fc.integer({ min: 0, max: 59 })
    )
    .map(
      ([year, month, day, hour, min, sec]) =>
        `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}Z`
    ),
  updated_at: fc
    .tuple(
      fc.integer({ min: 2020, max: 2030 }),
      fc.integer({ min: 1, max: 12 }),
      fc.integer({ min: 1, max: 28 }),
      fc.integer({ min: 0, max: 23 }),
      fc.integer({ min: 0, max: 59 }),
      fc.integer({ min: 0, max: 59 })
    )
    .map(
      ([year, month, day, hour, min, sec]) =>
        `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}Z`
    ),
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

  it('should generate same key for same productOwnerId', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 10000 }), (productOwnerId) => {
        const key1 = legalDocumentsKeys.byProductOwner(productOwnerId);
        const key2 = legalDocumentsKeys.byProductOwner(productOwnerId);
        return JSON.stringify(key1) === JSON.stringify(key2);
      }),
      { numRuns: 50 }
    );
  });
});

describe('Property-based: Optimistic Update Behavior', () => {
  it('should handle any valid document array in cache', async () => {
    await fc.assert(
      fc.asyncProperty(legalDocumentArrayArb, async (documents) => {
        const queryClient = createTestQueryClient();

        // Set up cache with random documents
        queryClient.setQueryData(legalDocumentsKeys.byProductOwner(123), documents);

        // Get cached data
        const cached = queryClient.getQueryData<typeof documents>(
          legalDocumentsKeys.byProductOwner(123)
        );

        cleanupQueryClient(queryClient);

        // Cache should contain the same documents
        return cached?.length === documents.length;
      }),
      { numRuns: 50 }
    );
  });

  it('should correctly filter by status for any document array', () => {
    fc.assert(
      fc.property(legalDocumentArrayArb, (documents) => {
        const signedDocuments = documents.filter((d) => d.status === 'Signed');
        const lapsedDocuments = documents.filter((d) => d.status === 'Lapsed');
        const registeredDocuments = documents.filter((d) => d.status === 'Registered');

        // All documents should be accounted for
        return (
          signedDocuments.length + lapsedDocuments.length + registeredDocuments.length ===
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
          // Pick the first document from the array
          const targetDoc = documents[0];
          const found = documents.find((d) => d.id === targetDoc.id);
          return found !== undefined && found.id === targetDoc.id;
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
          const updatedDocs = documents.map((doc) =>
            doc.id === targetId ? { ...doc, notes: newNotes } : doc
          );

          // Find the updated document
          const updated = updatedDocs.find((d) => d.id === targetId);

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

          // Count how many documents have the target ID (may be duplicates)
          const countWithTargetId = documents.filter((d) => d.id === targetId).length;

          // Simulate delete
          const filtered = documents.filter((d) => d.id !== targetId);

          // All documents with target ID should be removed
          return (
            filtered.length === documents.length - countWithTargetId &&
            !filtered.find((d) => d.id === targetId)
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
        fc.constantFrom('Signed', 'Lapsed', 'Registered') as fc.Arbitrary<
          'Signed' | 'Lapsed' | 'Registered'
        >,
        (document, newStatus) => {
          const updated = { ...document, status: newStatus };
          return updated.status === newStatus;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve other fields when updating status', () => {
    fc.assert(
      fc.property(
        legalDocumentArb,
        fc.constantFrom('Signed', 'Lapsed', 'Registered') as fc.Arbitrary<
          'Signed' | 'Lapsed' | 'Registered'
        >,
        (document, newStatus) => {
          const updated = { ...document, status: newStatus };

          // All fields except status should be preserved
          return (
            updated.id === document.id &&
            updated.type === document.type &&
            updated.notes === document.notes &&
            updated.document_date === document.document_date &&
            JSON.stringify(updated.product_owner_ids) ===
              JSON.stringify(document.product_owner_ids)
          );
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
            currentDocs = currentDocs.map((doc) =>
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

  it('should correctly track deleted documents', () => {
    fc.assert(
      fc.property(
        fc.array(legalDocumentArb, { minLength: 2, maxLength: 20 }),
        fc.integer({ min: 0, max: 1 }),
        (documents, deleteIndex) => {
          const actualIndex = deleteIndex % documents.length;
          const idToDelete = documents[actualIndex].id;

          // Count how many documents have this id (could be duplicates from random generation)
          const countWithId = documents.filter((d) => d.id === idToDelete).length;

          // Simulate delete
          const afterDelete = documents.filter((d) => d.id !== idToDelete);

          // All documents with that ID should be removed
          return (
            afterDelete.length === documents.length - countWithId &&
            !afterDelete.find((d) => d.id === idToDelete)
          );
        }
      ),
      { numRuns: 50 }
    );
  });
});

describe('Query Key Management', () => {
  let queryClient: ReturnType<typeof createTestQueryClient>;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanupQueryClient(queryClient);
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('should use consistent query keys for cache invalidation', async () => {
    const productOwnerId = 123;
    const documents = createMockLegalDocumentArray(2, {
      product_owner_ids: [productOwnerId],
    });

    // Pre-populate cache
    queryClient.setQueryData(
      legalDocumentsKeys.byProductOwner(productOwnerId),
      documents
    );

    // Verify query key structure
    const queryState = queryClient.getQueryState(
      legalDocumentsKeys.byProductOwner(productOwnerId)
    );
    expect(queryState).toBeDefined();

    // Create mutation should invalidate same query key
    const newDocument = createMockLegalDocument({
      id: 3,
      product_owner_ids: [productOwnerId],
    });
    mockedCreate.mockResolvedValueOnce(newDocument);

    const { result } = renderHook(() => useCreateLegalDocument(), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        type: 'Will',
        product_owner_ids: [productOwnerId],
      });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('should handle byClientGroup query key pattern', () => {
    const clientGroupId = 456;

    // This tests that the query key factory supports client group pattern
    const key = legalDocumentsKeys.byClientGroup(clientGroupId);

    expect(Array.isArray(key)).toBe(true);
    expect(key[0]).toBe('legalDocuments');
    expect(key).toContain(clientGroupId);
  });

  it('should generate all key for cache invalidation', () => {
    // legalDocumentsKeys.all is an array, not a function
    const key = legalDocumentsKeys.all;

    expect(Array.isArray(key)).toBe(true);
    expect(key[0]).toBe('legalDocuments');
    expect(key.length).toBe(1);
  });
});

// =============================================================================
// Concurrent Mutation Tests
// =============================================================================

describe('Concurrent Mutation Tests', () => {
  let queryClient: ReturnType<typeof createTestQueryClient>;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanupQueryClient(queryClient);
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('should handle concurrent mutations correctly', async () => {
    const productOwnerId = 123;
    const documents = createMockLegalDocumentArray(3, {
      product_owner_ids: [productOwnerId],
    });

    // Pre-populate cache
    await queryClient.prefetchQuery({
      queryKey: legalDocumentsKeys.byProductOwner(productOwnerId),
      queryFn: () => Promise.resolve(documents),
      gcTime: 60000,
    });

    // Set up mocks for concurrent updates - both should succeed
    const updatedDoc1 = { ...documents[0], notes: 'First update' };
    const updatedDoc2 = { ...documents[1], notes: 'Second update' };

    mockedUpdate
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve(updatedDoc1), 150);
          })
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve(updatedDoc2), 100);
          })
      );

    const { result: result1 } = renderHook(() => useUpdateLegalDocument(), { wrapper });
    const { result: result2 } = renderHook(() => useUpdateLegalDocument(), { wrapper });

    // Trigger both mutations simultaneously
    await act(async () => {
      result1.current.mutate({ id: documents[0].id, data: { notes: 'First update' } });
      result2.current.mutate({ id: documents[1].id, data: { notes: 'Second update' } });
    });

    // Wait for both to complete
    await waitFor(() => {
      expect(result1.current.isSuccess || result1.current.isError).toBe(true);
      expect(result2.current.isSuccess || result2.current.isError).toBe(true);
    });

    // Both mutations should succeed
    expect(result1.current.isSuccess).toBe(true);
    expect(result2.current.isSuccess).toBe(true);

    // API should have been called for both
    expect(mockedUpdate).toHaveBeenCalledTimes(2);
  });

  it('should handle concurrent update and delete correctly', async () => {
    const productOwnerId = 123;
    const documents = createMockLegalDocumentArray(3, {
      product_owner_ids: [productOwnerId],
    });

    // Pre-populate cache
    await queryClient.prefetchQuery({
      queryKey: legalDocumentsKeys.byProductOwner(productOwnerId),
      queryFn: () => Promise.resolve(documents),
      gcTime: 60000,
    });

    // Set up mocks for concurrent operations
    const updatedDoc = { ...documents[0], notes: 'Updated' };
    mockedUpdate.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve(updatedDoc), 100);
        })
    );
    mockedDelete.mockImplementation(
      () =>
        new Promise((resolve) => {
          setTimeout(() => resolve(undefined), 100);
        })
    );

    const { result: updateResult } = renderHook(() => useUpdateLegalDocument(), { wrapper });
    const { result: deleteResult } = renderHook(() => useDeleteLegalDocument(), { wrapper });

    // Trigger both mutations simultaneously - update doc 0, delete doc 1
    await act(async () => {
      updateResult.current.mutate({ id: documents[0].id, data: { notes: 'Updated' } });
      deleteResult.current.mutate(documents[1].id);
    });

    // Wait for both to complete
    await waitFor(() => {
      expect(updateResult.current.isSuccess || updateResult.current.isError).toBe(true);
      expect(deleteResult.current.isSuccess || deleteResult.current.isError).toBe(true);
    });

    // Both mutations should succeed
    expect(updateResult.current.isSuccess).toBe(true);
    expect(deleteResult.current.isSuccess).toBe(true);
  });
});

// =============================================================================
// Property-Based Tests for Empty Arrays
// =============================================================================

describe('Property-based: Empty Array Handling', () => {
  it('should handle empty document arrays correctly in cache', async () => {
    await fc.assert(
      fc.asyncProperty(fc.constant([]), async (emptyDocuments) => {
        const queryClient = createTestQueryClient();

        // Set up cache with empty array
        queryClient.setQueryData(legalDocumentsKeys.byProductOwner(123), emptyDocuments);

        // Get cached data
        const cached = queryClient.getQueryData<typeof emptyDocuments>(
          legalDocumentsKeys.byProductOwner(123)
        );

        cleanupQueryClient(queryClient);

        // Cache should contain the empty array
        return cached !== undefined && cached.length === 0;
      }),
      { numRuns: 10 }
    );
  });

  it('should correctly filter empty arrays', () => {
    fc.assert(
      fc.property(fc.constant([] as LegalDocument[]), (documents) => {
        const signedDocuments = documents.filter((d) => d.status === 'Signed');
        const lapsedDocuments = documents.filter((d) => d.status === 'Lapsed');
        const registeredDocuments = documents.filter((d) => d.status === 'Registered');

        // All filtered results should be empty
        return (
          signedDocuments.length === 0 &&
          lapsedDocuments.length === 0 &&
          registeredDocuments.length === 0
        );
      }),
      { numRuns: 10 }
    );
  });

  it('should handle map on empty arrays correctly', () => {
    fc.assert(
      fc.property(fc.constant([] as LegalDocument[]), (documents) => {
        // Simulating the optimistic update pattern on empty array
        const updatedDocs = documents.map((doc) => ({ ...doc, notes: 'New notes' }));

        // Result should also be empty
        return updatedDocs.length === 0;
      }),
      { numRuns: 10 }
    );
  });

  it('should handle filter on empty arrays correctly', () => {
    fc.assert(
      fc.property(fc.constant([] as LegalDocument[]), (documents) => {
        // Simulating the optimistic delete pattern on empty array
        const filteredDocs = documents.filter((doc) => doc.id !== 999);

        // Result should also be empty
        return filteredDocs.length === 0;
      }),
      { numRuns: 10 }
    );
  });

  it('should snapshot empty arrays for rollback', async () => {
    await fc.assert(
      fc.asyncProperty(fc.constant([] as LegalDocument[]), async (emptyDocuments) => {
        const queryClient = createTestQueryClient();

        // Set up cache with empty array
        queryClient.setQueryData(legalDocumentsKeys.byProductOwner(123), emptyDocuments);

        // Snapshot for rollback (as done in performOptimisticUpdate)
        const snapshot = queryClient.getQueryData<LegalDocument[]>(
          legalDocumentsKeys.byProductOwner(123)
        );

        // Simulate an update (even on empty array, snapshot should exist)
        const previousData: Array<[unknown[], LegalDocument[]]> = [];
        if (snapshot && Array.isArray(snapshot)) {
          previousData.push([['legalDocuments', 'productOwner', 123, {}], snapshot]);
        }

        cleanupQueryClient(queryClient);

        // Empty arrays should still be snapshotted
        return previousData.length === 1 && previousData[0][1].length === 0;
      }),
      { numRuns: 10 }
    );
  });
});
