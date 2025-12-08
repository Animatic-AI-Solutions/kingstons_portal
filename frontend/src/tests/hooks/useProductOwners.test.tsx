/**
 * useProductOwners Hook Tests (RED Phase)
 *
 * Tests for the custom React Query hook that manages product owner data fetching
 * and state management.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { useProductOwners } from '@/hooks/useProductOwners';
import { fetchProductOwnersForClientGroup } from '@/services/api/productOwners';
import { createTestQueryClient, cleanupQueryClient } from '../utils/testUtils';
import { QueryClientProvider } from '@tanstack/react-query';
import { createProductOwner } from '../factories/productOwnerFactory';

// Mock the API service
jest.mock('@/services/api/productOwners', () => ({
  fetchProductOwnersForClientGroup: jest.fn(),
}));

const mockedFetch = fetchProductOwnersForClientGroup as jest.MockedFunction<
  typeof fetchProductOwnersForClientGroup
>;

describe('useProductOwners Hook', () => {
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
    it('should fetch product owners on mount', async () => {
      const clientGroupId = 1;
      const mockProductOwners = [createProductOwner(), createProductOwner()];

      mockedFetch.mockResolvedValueOnce(mockProductOwners);

      const { result } = renderHook(() => useProductOwners(clientGroupId), { wrapper });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockedFetch).toHaveBeenCalledWith(clientGroupId);
      expect(result.current.data).toEqual(mockProductOwners);
    });

    it('should not fetch when clientGroupId is null', () => {
      const { result } = renderHook(() => useProductOwners(null), { wrapper });

      expect(result.current.isLoading).toBe(false);
      expect(mockedFetch).not.toHaveBeenCalled();
    });

    it('should not fetch when clientGroupId is undefined', () => {
      const { result } = renderHook(() => useProductOwners(undefined), { wrapper });

      expect(result.current.isLoading).toBe(false);
      expect(mockedFetch).not.toHaveBeenCalled();
    });

    it('should refetch when clientGroupId changes', async () => {
      const mockProductOwners1 = [createProductOwner({ firstname: 'John' })];
      const mockProductOwners2 = [createProductOwner({ firstname: 'Jane' })];

      mockedFetch.mockResolvedValueOnce(mockProductOwners1);

      const { result, rerender } = renderHook(
        ({ id }) => useProductOwners(id),
        {
          wrapper,
          initialProps: { id: 1 },
        }
      );

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockProductOwners1);

      // Change clientGroupId
      mockedFetch.mockResolvedValueOnce(mockProductOwners2);
      rerender({ id: 2 });

      await waitFor(() => {
        expect(result.current.data).toEqual(mockProductOwners2);
      });

      expect(mockedFetch).toHaveBeenCalledTimes(2);
      expect(mockedFetch).toHaveBeenNthCalledWith(1, 1);
      expect(mockedFetch).toHaveBeenNthCalledWith(2, 2);
    });
  });

  describe('Loading State', () => {
    it('should set isLoading to true while fetching', async () => {
      const clientGroupId = 1;
      const mockProductOwners = [createProductOwner()];

      mockedFetch.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve(mockProductOwners), 100);
          })
      );

      const { result } = renderHook(() => useProductOwners(clientGroupId), { wrapper });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockProductOwners);
    });

    it('should set isLoading to false after successful fetch', async () => {
      const clientGroupId = 1;
      const mockProductOwners = [createProductOwner()];

      mockedFetch.mockResolvedValueOnce(mockProductOwners);

      const { result } = renderHook(() => useProductOwners(clientGroupId), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isSuccess).toBe(true);
    });

    it('should provide isFetching status separately from isLoading', async () => {
      const clientGroupId = 1;
      const mockProductOwners = [createProductOwner()];

      mockedFetch.mockResolvedValueOnce(mockProductOwners);

      const { result } = renderHook(() => useProductOwners(clientGroupId), { wrapper });

      expect(result.current.isFetching).toBe(true);

      await waitFor(() => {
        expect(result.current.isFetching).toBe(false);
      });
    });
  });

  describe('Error State', () => {
    it('should set error state when fetch fails', async () => {
      const clientGroupId = 1;
      const errorMessage = 'Failed to fetch product owners';

      mockedFetch.mockRejectedValueOnce(new Error(errorMessage));

      const { result } = renderHook(() => useProductOwners(clientGroupId), { wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeTruthy();
      expect(result.current.data).toBeUndefined();
    });

    it('should set isLoading to false after error', async () => {
      const clientGroupId = 1;

      mockedFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useProductOwners(clientGroupId), { wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Success State', () => {
    it('should set success state with data after successful fetch', async () => {
      const clientGroupId = 1;
      const mockProductOwners = [createProductOwner(), createProductOwner()];

      mockedFetch.mockResolvedValueOnce(mockProductOwners);

      const { result } = renderHook(() => useProductOwners(clientGroupId), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockProductOwners);
      expect(result.current.isError).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle empty product owner list', async () => {
      const clientGroupId = 1;

      mockedFetch.mockResolvedValueOnce([]);

      const { result } = renderHook(() => useProductOwners(clientGroupId), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([]);
      expect(result.current.data).toHaveLength(0);
    });
  });

  describe('Refetch Functionality', () => {
    it('should provide refetch function', async () => {
      const clientGroupId = 1;
      const mockProductOwners = [createProductOwner()];

      mockedFetch.mockResolvedValueOnce(mockProductOwners);

      const { result } = renderHook(() => useProductOwners(clientGroupId), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.refetch).toBeDefined();
      expect(typeof result.current.refetch).toBe('function');
    });

    it('should refetch data when refetch is called', async () => {
      const clientGroupId = 1;
      const initialData = [createProductOwner({ firstname: 'John' })];
      const updatedData = [createProductOwner({ firstname: 'Jane' })];

      mockedFetch.mockResolvedValueOnce(initialData);

      const { result } = renderHook(() => useProductOwners(clientGroupId), { wrapper });

      await waitFor(() => {
        expect(result.current.data).toEqual(initialData);
      });

      // Refetch with new data
      mockedFetch.mockResolvedValueOnce(updatedData);
      await result.current.refetch();

      await waitFor(() => {
        expect(result.current.data).toEqual(updatedData);
      });

      expect(mockedFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      const clientGroupId = 1;
      const networkError = new Error('Network error');

      mockedFetch.mockRejectedValueOnce(networkError);

      const { result } = renderHook(() => useProductOwners(clientGroupId), { wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeTruthy();
    });

    it('should handle API errors with status codes', async () => {
      const clientGroupId = 1;
      const apiError = new Error('Not Found');
      (apiError as any).response = { status: 404 };

      mockedFetch.mockRejectedValueOnce(apiError);

      const { result } = renderHook(() => useProductOwners(clientGroupId), { wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeTruthy();
    });

    it('should allow retry after error', async () => {
      const clientGroupId = 1;
      const mockProductOwners = [createProductOwner()];

      // First call fails
      mockedFetch.mockRejectedValueOnce(new Error('Temporary error'));

      const { result } = renderHook(() => useProductOwners(clientGroupId), { wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      // Retry succeeds
      mockedFetch.mockResolvedValueOnce(mockProductOwners);
      await result.current.refetch();

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockProductOwners);
    });

    it('should clear error state on successful refetch', async () => {
      const clientGroupId = 1;
      const mockProductOwners = [createProductOwner()];

      // First call fails
      mockedFetch.mockRejectedValueOnce(new Error('Error'));

      const { result } = renderHook(() => useProductOwners(clientGroupId), { wrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.error).toBeTruthy();

      // Refetch succeeds
      mockedFetch.mockResolvedValueOnce(mockProductOwners);
      await result.current.refetch();

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.error).toBeNull();
      expect(result.current.isError).toBe(false);
    });
  });

  describe('Caching Behavior', () => {
    it('should cache data for subsequent renders', async () => {
      const clientGroupId = 1;
      const mockProductOwners = [createProductOwner()];

      mockedFetch.mockResolvedValueOnce(mockProductOwners);

      const { result, unmount } = renderHook(() => useProductOwners(clientGroupId), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockedFetch).toHaveBeenCalledTimes(1);

      unmount();

      // Re-render hook
      const { result: result2 } = renderHook(() => useProductOwners(clientGroupId), { wrapper });

      // Should use cached data
      expect(result2.current.data).toEqual(mockProductOwners);
      expect(mockedFetch).toHaveBeenCalledTimes(1); // No additional fetch
    });

    it('should use staleTime configuration', async () => {
      const clientGroupId = 1;
      const mockProductOwners = [createProductOwner()];

      mockedFetch.mockResolvedValueOnce(mockProductOwners);

      const { result } = renderHook(() => useProductOwners(clientGroupId, { staleTime: 60000 }), {
        wrapper,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      // Data should be considered fresh for 60 seconds
      expect(result.current.isStale).toBe(false);
    });
  });

  describe('Computed Values', () => {
    it('should provide product owner count', async () => {
      const clientGroupId = 1;
      const mockProductOwners = [createProductOwner(), createProductOwner(), createProductOwner()];

      mockedFetch.mockResolvedValueOnce(mockProductOwners);

      const { result } = renderHook(() => useProductOwners(clientGroupId), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.count).toBe(3);
    });

    it('should provide active product owner count', async () => {
      const clientGroupId = 1;
      const mockProductOwners = [
        createProductOwner({ status: 'active' }),
        createProductOwner({ status: 'active' }),
        createProductOwner({ status: 'lapsed' }),
      ];

      mockedFetch.mockResolvedValueOnce(mockProductOwners);

      const { result } = renderHook(() => useProductOwners(clientGroupId), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.activeCount).toBe(2);
    });

    it('should indicate if product owners exist', async () => {
      const clientGroupId = 1;
      const mockProductOwners = [createProductOwner()];

      mockedFetch.mockResolvedValueOnce(mockProductOwners);

      const { result } = renderHook(() => useProductOwners(clientGroupId), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.hasProductOwners).toBe(true);
    });

    it('should indicate when no product owners exist', async () => {
      const clientGroupId = 1;

      mockedFetch.mockResolvedValueOnce([]);

      const { result } = renderHook(() => useProductOwners(clientGroupId), { wrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.hasProductOwners).toBe(false);
    });
  });
});
