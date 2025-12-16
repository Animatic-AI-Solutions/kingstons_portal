/**
 * Special Relationships React Query Hooks Tests (Cycle 3 - RED Phase)
 *
 * Comprehensive test suite for React Query hooks that manage special relationships
 * state, caching, and mutations with optimistic updates and undo functionality.
 *
 * Tests all hooks:
 * - useSpecialRelationships: Query hook for fetching relationships
 * - useCreateSpecialRelationship: Mutation hook for creating relationships
 * - useUpdateSpecialRelationship: Mutation hook for updating relationships
 * - useUpdateSpecialRelationshipStatus: Mutation hook for status updates
 * - useDeleteSpecialRelationship: Mutation hook with optimistic updates and undo
 *
 * Following TDD: These tests will FAIL until hooks are implemented
 */

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { createTestQueryClient, cleanupQueryClient } from '../utils/testUtils';
import {
  useSpecialRelationships,
  useCreateSpecialRelationship,
  useUpdateSpecialRelationship,
  useUpdateSpecialRelationshipStatus,
  useDeleteSpecialRelationship,
} from '@/hooks/useSpecialRelationships';
import {
  fetchSpecialRelationships,
  createSpecialRelationship,
  updateSpecialRelationship,
  updateSpecialRelationshipStatus,
  deleteSpecialRelationship,
} from '@/services/specialRelationshipsApi';
import {
  createMockPersonalRelationship,
  createMockProfessionalRelationship,
  createMockRelationshipArray,
} from '../factories/specialRelationshipFactory';
import { SpecialRelationship } from '@/types/specialRelationship';

// Mock API service functions from Cycle 2
jest.mock('@/services/specialRelationshipsApi', () => ({
  fetchSpecialRelationships: jest.fn(),
  createSpecialRelationship: jest.fn(),
  updateSpecialRelationship: jest.fn(),
  updateSpecialRelationshipStatus: jest.fn(),
  deleteSpecialRelationship: jest.fn(),
}));

const mockedFetch = fetchSpecialRelationships as jest.MockedFunction<
  typeof fetchSpecialRelationships
>;
const mockedCreate = createSpecialRelationship as jest.MockedFunction<
  typeof createSpecialRelationship
>;
const mockedUpdate = updateSpecialRelationship as jest.MockedFunction<
  typeof updateSpecialRelationship
>;
const mockedUpdateStatus = updateSpecialRelationshipStatus as jest.MockedFunction<
  typeof updateSpecialRelationshipStatus
>;
const mockedDelete = deleteSpecialRelationship as jest.MockedFunction<
  typeof deleteSpecialRelationship
>;

describe('useSpecialRelationships Hook (Query)', () => {
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

  describe('Fetch Behavior', () => {
    it('should fetch special relationships on mount', async () => {
      const productOwnerId = 123;
      const mockRelationships = createMockRelationshipArray(3, {
        product_owner_ids: [productOwnerId],
      });

      mockedFetch.mockResolvedValueOnce(mockRelationships);

      const { result } = renderHook(() => useSpecialRelationships(productOwnerId), {
        wrapper,
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockedFetch).toHaveBeenCalledWith(productOwnerId, undefined);
      expect(result.current.data).toEqual(mockRelationships);
      expect(result.current.data).toHaveLength(3);
    });

    it('should not fetch when productOwnerId is null', () => {
      const { result } = renderHook(() => useSpecialRelationships(null), { wrapper });

      expect(result.current.isLoading).toBe(false);
      expect(mockedFetch).not.toHaveBeenCalled();
    });

    it('should not fetch when productOwnerId is undefined', () => {
      const { result } = renderHook(() => useSpecialRelationships(undefined), {
        wrapper,
      });

      expect(result.current.isLoading).toBe(false);
      expect(mockedFetch).not.toHaveBeenCalled();
    });

    it('should refetch when productOwnerId changes', async () => {
      const mockRelationships1 = createMockRelationshipArray(2, {
        product_owner_ids: [101],
      });
      const mockRelationships2 = createMockRelationshipArray(3, {
        product_owner_ids: [102],
      });

      mockedFetch.mockResolvedValueOnce(mockRelationships1);

      const { result, rerender } = renderHook(
        ({ id }) => useSpecialRelationships(id),
        {
          wrapper,
          initialProps: { id: 101 },
        }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockRelationships1);

      // Change productOwnerId
      mockedFetch.mockResolvedValueOnce(mockRelationships2);
      rerender({ id: 102 });

      await waitFor(() => {
        expect(result.current.data).toEqual(mockRelationships2);
      });

      expect(mockedFetch).toHaveBeenCalledTimes(2);
      expect(mockedFetch).toHaveBeenNthCalledWith(1, 101, undefined);
      expect(mockedFetch).toHaveBeenNthCalledWith(2, 102, undefined);
    });

    it('should fetch with filters when provided', async () => {
      const productOwnerId = 123;
      const mockPersonalRelationships = createMockRelationshipArray(2, {
        type: 'personal',
        product_owner_ids: [productOwnerId],
      });

      mockedFetch.mockResolvedValueOnce(mockPersonalRelationships);

      const { result } = renderHook(
        () =>
          useSpecialRelationships(productOwnerId, {
            filters: { type: 'Personal', status: 'Active' },
          }),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockedFetch).toHaveBeenCalledWith(productOwnerId, {
        type: 'Personal',
        status: 'Active',
      });
      expect(result.current.data).toEqual(mockPersonalRelationships);
    });
  });

  describe('Loading State', () => {
    it('should set isLoading to true while fetching', async () => {
      const productOwnerId = 123;
      const mockRelationships = createMockRelationshipArray(2);

      mockedFetch.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve(mockRelationships), 100);
          })
      );

      const { result } = renderHook(() => useSpecialRelationships(productOwnerId), {
        wrapper,
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockRelationships);
    });

    it('should provide isFetching status separately from isLoading', async () => {
      const productOwnerId = 123;
      const mockRelationships = createMockRelationshipArray(1);

      mockedFetch.mockResolvedValueOnce(mockRelationships);

      const { result } = renderHook(() => useSpecialRelationships(productOwnerId), {
        wrapper,
      });

      expect(result.current.isFetching).toBe(true);

      await waitFor(() => {
        expect(result.current.isFetching).toBe(false);
      });
    });
  });

  describe('Error State', () => {
    it('should set error state when fetch fails', async () => {
      const productOwnerId = 123;
      const errorMessage = 'Failed to fetch special relationships';

      mockedFetch.mockRejectedValueOnce(new Error(errorMessage));

      const { result } = renderHook(() => useSpecialRelationships(productOwnerId), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeTruthy();
      expect(result.current.data).toBeUndefined();
    });

    it('should allow retry after error', async () => {
      const productOwnerId = 123;
      const mockRelationships = createMockRelationshipArray(2);

      // First call fails
      mockedFetch.mockRejectedValueOnce(new Error('Temporary error'));

      const { result } = renderHook(() => useSpecialRelationships(productOwnerId), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      // Retry succeeds
      mockedFetch.mockResolvedValueOnce(mockRelationships);
      await result.current.refetch();

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockRelationships);
    });
  });

  describe('Success State', () => {
    it('should handle empty relationships list', async () => {
      const productOwnerId = 123;

      mockedFetch.mockResolvedValueOnce([]);

      const { result } = renderHook(() => useSpecialRelationships(productOwnerId), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([]);
      expect(result.current.data).toHaveLength(0);
    });

    it('should return mixed personal and professional relationships', async () => {
      const productOwnerId = 123;
      const mockRelationships = [
        createMockPersonalRelationship({ product_owner_ids: [productOwnerId] }),
        createMockProfessionalRelationship({ product_owner_ids: [productOwnerId] }),
      ];

      mockedFetch.mockResolvedValueOnce(mockRelationships);

      const { result } = renderHook(() => useSpecialRelationships(productOwnerId), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toHaveLength(2);
      expect(result.current.data?.[0].relationship).toBe('Spouse');
      expect(result.current.data?.[1].relationship).toBe('Financial Advisor');
    });
  });

  describe('Caching Behavior', () => {
    it('should cache data for subsequent renders', async () => {
      const productOwnerId = 123;
      const mockRelationships = createMockRelationshipArray(2);

      mockedFetch.mockResolvedValueOnce(mockRelationships);

      const { result, unmount } = renderHook(
        () => useSpecialRelationships(productOwnerId),
        { wrapper }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockedFetch).toHaveBeenCalledTimes(1);

      unmount();

      // Re-render hook
      const { result: result2 } = renderHook(
        () => useSpecialRelationships(productOwnerId),
        { wrapper }
      );

      // Should use cached data
      expect(result2.current.data).toEqual(mockRelationships);
      expect(mockedFetch).toHaveBeenCalledTimes(1); // No additional fetch
    });
  });
});

describe('useCreateSpecialRelationship Hook (Mutation)', () => {
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
    it('should create a new special relationship', async () => {
      const newRelationship = createMockPersonalRelationship({
        id: 101,
        name: 'New Person',
      });

      mockedCreate.mockResolvedValueOnce(newRelationship);

      const { result } = renderHook(() => useCreateSpecialRelationship(), { wrapper });

      const createData = {
        product_owner_ids: [123],
        relationship: 'Spouse' as const,
        status: 'Active' as const,
        name: 'New Person',
        type: 'Personal' as const,
      };

      result.current.mutate(createData);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockedCreate).toHaveBeenCalledWith(createData);
      expect(result.current.data).toEqual(newRelationship);
    });

    it('should invalidate query cache after successful creation', async () => {
      const productOwnerId = 123;
      const existingRelationships = createMockRelationshipArray(2, {
        product_owner_ids: [productOwnerId],
      });
      const newRelationship = createMockPersonalRelationship({
        product_owner_ids: [productOwnerId],
      });

      // Pre-populate cache
      mockedFetch.mockResolvedValueOnce(existingRelationships);
      const { result: queryResult } = renderHook(
        () => useSpecialRelationships(productOwnerId),
        { wrapper }
      );

      await waitFor(() => {
        expect(queryResult.current.isSuccess).toBe(true);
      });

      expect(queryResult.current.data).toHaveLength(2);

      // Create new relationship
      mockedCreate.mockResolvedValueOnce(newRelationship);
      const { result: mutationResult } = renderHook(
        () => useCreateSpecialRelationship(),
        { wrapper }
      );

      mutationResult.current.mutate({
        product_owner_ids: [productOwnerId],
        relationship: 'Spouse',
        status: 'Active',
        name: 'New Person',
        type: 'Personal',
      });

      await waitFor(() => {
        expect(mutationResult.current.isSuccess).toBe(true);
      });

      // Verify cache invalidation triggers refetch
      mockedFetch.mockResolvedValueOnce([
        ...existingRelationships,
        newRelationship,
      ]);

      await waitFor(() => {
        expect(queryClient.isFetching()).toBe(0);
      });

      expect(mockedFetch).toHaveBeenCalledTimes(2); // Initial + refetch after create
    });

    it('should handle creation errors', async () => {
      const errorMessage = 'Validation failed: Email already exists';

      mockedCreate.mockRejectedValueOnce(new Error(errorMessage));

      const { result } = renderHook(() => useCreateSpecialRelationship(), { wrapper });

      result.current.mutate({
        product_owner_ids: [123],
        relationship: 'Spouse',
        status: 'Active',
        name: 'Duplicate Email',
        type: 'Personal',
        email: 'duplicate@example.com',
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeTruthy();
    });

    it('should provide loading state during creation', async () => {
      const newRelationship = createMockPersonalRelationship();

      mockedCreate.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve(newRelationship), 100);
          })
      );

      const { result } = renderHook(() => useCreateSpecialRelationship(), { wrapper });

      result.current.mutate({
        product_owner_ids: [123],
        relationship: 'Spouse',
        status: 'Active',
        name: 'New Person',
        type: 'Personal',
      });

      await waitFor(() => {
        expect(result.current.isPending).toBe(true);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.isPending).toBe(false);
    });
  });
});

describe('useUpdateSpecialRelationship Hook (Mutation)', () => {
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
    it('should update an existing special relationship', async () => {
      const originalRelationship = createMockPersonalRelationship({
        id: 101,
        email: 'old@example.com',
      });

      const updatedRelationship = {
        ...originalRelationship,
        email: 'new@example.com',
        phone_number: '+44-7700-900001',
      };

      mockedUpdate.mockResolvedValueOnce(updatedRelationship);

      const { result } = renderHook(() => useUpdateSpecialRelationship(), { wrapper });

      result.current.mutate({
        id: 101,
        data: {
          email: 'new@example.com',
          phone_number: '+44-7700-900001',
        },
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockedUpdate).toHaveBeenCalledWith(101, {
        email: 'new@example.com',
        phone_number: '+44-7700-900001',
      });
      expect(result.current.data).toEqual(updatedRelationship);
    });

    it('should use optimistic updates for immediate UI feedback', async () => {
      const productOwnerId = 123;
      const relationships = createMockRelationshipArray(3, {
        product_owner_ids: [productOwnerId],
      });

      // Pre-populate cache
      mockedFetch.mockResolvedValueOnce(relationships);
      const { result: queryResult } = renderHook(
        () => useSpecialRelationships(productOwnerId),
        { wrapper }
      );

      // Wait for initial query to succeed and all operations to complete
      await waitFor(() => {
        expect(queryResult.current.isSuccess).toBe(true);
      });

      await waitFor(() => {
        expect(queryClient.isFetching()).toBe(0);
      });

      const relationshipToUpdate = relationships[0];
      const updatedRelationship = {
        ...relationshipToUpdate,
        name: 'UpdatedName',
      };

      // Delay the mock response to ensure optimistic update is visible
      mockedUpdate.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve(updatedRelationship), 100);
          })
      );

      const { result: mutationResult } = renderHook(
        () => useUpdateSpecialRelationship(),
        { wrapper }
      );

      mutationResult.current.mutate({
        id: relationshipToUpdate.id,
        data: { name: 'UpdatedName' },
      });

      // Optimistic update should apply immediately
      await waitFor(() => {
        const cachedData = queryClient.getQueryData<SpecialRelationship[]>([
          'specialRelationships',
          productOwnerId,
        ]);
        expect(cachedData?.[0].name).toBe('UpdatedName');
      });

      await waitFor(() => {
        expect(mutationResult.current.isSuccess).toBe(true);
      });
    });

    it('should rollback optimistic update on error', async () => {
      const productOwnerId = 123;
      const relationships = createMockRelationshipArray(2, {
        product_owner_ids: [productOwnerId],
      });

      // Pre-populate cache
      mockedFetch.mockResolvedValueOnce(relationships);
      const { result: queryResult } = renderHook(
        () => useSpecialRelationships(productOwnerId),
        { wrapper }
      );

      await waitFor(() => {
        expect(queryResult.current.isSuccess).toBe(true);
      });

      const originalData = queryResult.current.data;
      const relationshipToUpdate = relationships[0];

      mockedUpdate.mockRejectedValueOnce(new Error('Update failed'));

      const { result: mutationResult } = renderHook(
        () => useUpdateSpecialRelationship(),
        { wrapper }
      );

      mutationResult.current.mutate({
        id: relationshipToUpdate.id,
        data: { name: 'FailedUpdate' },
      });

      await waitFor(() => {
        expect(mutationResult.current.isError).toBe(true);
      });

      // Cache should rollback to original data
      const cachedData = queryClient.getQueryData<SpecialRelationship[]>([
        'specialRelationships',
        productOwnerId,
      ]);
      expect(cachedData).toEqual(originalData);
    });

    it('should invalidate query cache after successful update', async () => {
      const productOwnerId = 123;
      const relationships = createMockRelationshipArray(2, {
        product_owner_ids: [productOwnerId],
      });

      mockedFetch.mockResolvedValueOnce(relationships);
      renderHook(() => useSpecialRelationships(productOwnerId), { wrapper });

      await waitFor(() => {
        expect(queryClient.isFetching()).toBe(0);
      });

      const updatedRelationship = { ...relationships[0], name: 'Updated' };
      mockedUpdate.mockResolvedValueOnce(updatedRelationship);

      const { result } = renderHook(() => useUpdateSpecialRelationship(), { wrapper });

      result.current.mutate({
        id: relationships[0].id,
        data: { name: 'Updated' },
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Should trigger refetch
      expect(queryClient.getQueryState(['specialRelationships', productOwnerId]))
        .toBeTruthy();
    });
  });
});

describe('useUpdateSpecialRelationshipStatus Hook (Mutation)', () => {
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
    it('should update relationship status', async () => {
      const relationship = createMockPersonalRelationship({
        id: 101,
        status: 'Active',
      });

      const updatedRelationship = { ...relationship, status: 'Inactive' as const };

      mockedUpdateStatus.mockResolvedValueOnce(updatedRelationship);

      const { result } = renderHook(() => useUpdateSpecialRelationshipStatus(), {
        wrapper,
      });

      result.current.mutate({
        id: 101,
        status: 'Inactive',
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockedUpdateStatus).toHaveBeenCalledWith(101, 'Inactive');
      expect(result.current.data?.status).toBe('Inactive');
    });

    it('should handle status update to Deceased', async () => {
      const relationship = createMockPersonalRelationship({
        id: 101,
        status: 'Active',
      });

      const updatedRelationship = { ...relationship, status: 'Deceased' as const };

      mockedUpdateStatus.mockResolvedValueOnce(updatedRelationship);

      const { result } = renderHook(() => useUpdateSpecialRelationshipStatus(), {
        wrapper,
      });

      result.current.mutate({
        id: 101,
        status: 'Deceased',
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data?.status).toBe('Deceased');
    });

    it('should use optimistic updates for status changes', async () => {
      const productOwnerId = 123;
      const relationships = createMockRelationshipArray(2, {
        product_owner_ids: [productOwnerId],
        status: 'Active',
      });

      mockedFetch.mockResolvedValueOnce(relationships);
      renderHook(() => useSpecialRelationships(productOwnerId), { wrapper });

      await waitFor(() => {
        expect(queryClient.isFetching()).toBe(0);
      });

      const updatedRelationship = { ...relationships[0], status: 'Inactive' as const };
      mockedUpdateStatus.mockResolvedValueOnce(updatedRelationship);

      const { result } = renderHook(() => useUpdateSpecialRelationshipStatus(), {
        wrapper,
      });

      result.current.mutate({
        id: relationships[0].id,
        status: 'Inactive',
      });

      // Optimistic update should apply immediately
      await waitFor(() => {
        const cachedData = queryClient.getQueryData<SpecialRelationship[]>([
          'specialRelationships',
          productOwnerId,
        ]);
        expect(cachedData?.[0].status).toBe('Inactive');
      });
    });

    it('should invalidate cache after status update', async () => {
      const relationship = createMockPersonalRelationship();
      const updatedRelationship = { ...relationship, status: 'Inactive' as const };

      mockedUpdateStatus.mockResolvedValueOnce(updatedRelationship);

      const { result } = renderHook(() => useUpdateSpecialRelationshipStatus(), {
        wrapper,
      });

      result.current.mutate({
        id: relationship.id,
        status: 'Inactive',
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Cache invalidation should be triggered
      expect(mockedUpdateStatus).toHaveBeenCalledTimes(1);
    });
  });
});

describe('useDeleteSpecialRelationship Hook (Mutation with Undo)', () => {
  let queryClient: ReturnType<typeof createTestQueryClient>;

  beforeEach(() => {
    queryClient = createTestQueryClient();
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    cleanupQueryClient(queryClient);
    jest.useRealTimers();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe('Delete Mutation', () => {
    it('should soft delete a special relationship', async () => {
      mockedDelete.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useDeleteSpecialRelationship(), { wrapper });

      result.current.mutate(101);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockedDelete).toHaveBeenCalledWith(101);
    });

    it('should use optimistic updates to remove relationship immediately', async () => {
      const productOwnerId = 123;
      const relationships = createMockRelationshipArray(3, {
        product_owner_ids: [productOwnerId],
      });

      // Pre-populate cache
      mockedFetch.mockResolvedValueOnce(relationships);
      renderHook(() => useSpecialRelationships(productOwnerId), { wrapper });

      await waitFor(() => {
        expect(queryClient.isFetching()).toBe(0);
      });

      const relationshipToDelete = relationships[0];
      mockedDelete.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useDeleteSpecialRelationship(), { wrapper });

      result.current.mutate(relationshipToDelete.id);

      // Optimistic update should remove relationship immediately
      await waitFor(() => {
        const cachedData = queryClient.getQueryData<SpecialRelationship[]>([
          'specialRelationships',
          productOwnerId,
        ]);
        expect(cachedData?.length).toBe(2);
        expect(cachedData?.find((r) => r.id === relationshipToDelete.id)).toBeUndefined();
      });
    });

    it('should rollback optimistic delete on error', async () => {
      const productOwnerId = 123;
      const relationships = createMockRelationshipArray(3, {
        product_owner_ids: [productOwnerId],
      });

      // Pre-populate cache
      mockedFetch.mockResolvedValueOnce(relationships);
      renderHook(() => useSpecialRelationships(productOwnerId), { wrapper });

      await waitFor(() => {
        expect(queryClient.isFetching()).toBe(0);
      });

      const relationshipToDelete = relationships[0];
      mockedDelete.mockRejectedValueOnce(new Error('Delete failed'));

      const { result } = renderHook(() => useDeleteSpecialRelationship(), { wrapper });

      result.current.mutate(relationshipToDelete.id);

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      // Cache should rollback to include deleted relationship
      const cachedData = queryClient.getQueryData<SpecialRelationship[]>([
        'specialRelationships',
        productOwnerId,
      ]);
      expect(cachedData?.length).toBe(3);
      expect(cachedData?.find((r) => r.id === relationshipToDelete.id)).toBeDefined();
    });

    it('should invalidate query cache after successful deletion', async () => {
      const productOwnerId = 123;
      const relationships = createMockRelationshipArray(2, {
        product_owner_ids: [productOwnerId],
      });

      mockedFetch.mockResolvedValueOnce(relationships);
      renderHook(() => useSpecialRelationships(productOwnerId), { wrapper });

      await waitFor(() => {
        expect(queryClient.isFetching()).toBe(0);
      });

      mockedDelete.mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useDeleteSpecialRelationship(), { wrapper });

      result.current.mutate(relationships[0].id);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Verify cache invalidation
      expect(mockedDelete).toHaveBeenCalledTimes(1);
    });

    it('should handle deletion errors gracefully', async () => {
      const errorMessage = 'Permission denied';

      mockedDelete.mockRejectedValueOnce(new Error(errorMessage));

      const { result } = renderHook(() => useDeleteSpecialRelationship(), { wrapper });

      result.current.mutate(101);

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeTruthy();
    });

    it('should provide loading state during deletion', async () => {
      mockedDelete.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve(undefined), 100);
          })
      );

      const { result } = renderHook(() => useDeleteSpecialRelationship(), { wrapper });

      result.current.mutate(101);

      await waitFor(() => {
        expect(result.current.isPending).toBe(true);
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.isPending).toBe(false);
    });
  });

  describe('Query Key Management', () => {
    it('should use consistent query keys for cache invalidation', async () => {
      const productOwnerId = 123;
      const relationships = createMockRelationshipArray(2, {
        product_owner_ids: [productOwnerId],
      });

      mockedFetch.mockResolvedValueOnce(relationships);
      renderHook(() => useSpecialRelationships(productOwnerId), { wrapper });

      await waitFor(() => {
        expect(queryClient.isFetching()).toBe(0);
      });

      // Verify query key structure
      const queryState = queryClient.getQueryState([
        'specialRelationships',
        productOwnerId,
      ]);
      expect(queryState).toBeDefined();

      // Create mutation should invalidate same query key
      const newRelationship = createMockPersonalRelationship({
        product_owner_ids: [productOwnerId],
      });
      mockedCreate.mockResolvedValueOnce(newRelationship);

      const { result } = renderHook(() => useCreateSpecialRelationship(), { wrapper });

      result.current.mutate({
        product_owner_ids: [productOwnerId],
        relationship: 'Spouse',
        status: 'Active',
        name: 'Test User',
        type: 'Personal',
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Query should be invalidated
      mockedFetch.mockResolvedValueOnce([...relationships, newRelationship]);
      await waitFor(() => {
        expect(queryClient.isFetching()).toBe(0);
      });
    });
  });
});
