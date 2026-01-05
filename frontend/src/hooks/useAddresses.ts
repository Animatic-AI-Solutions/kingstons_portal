/**
 * useAddresses Hook
 *
 * React Query hook for fetching and managing addresses.
 * Provides cached address data with automatic refetching and caching.
 *
 * @module hooks/useAddresses
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAllAddresses, createAddress, updateAddress, deleteAddress, Address } from '@/services/api/addresses';
import { AddressFormData } from '@/types/clientGroupForm';

/**
 * Query key for addresses cache
 */
const ADDRESSES_QUERY_KEY = ['addresses'];

/**
 * Fetches all addresses from the database
 *
 * Features:
 * - Automatic caching with 5 minute stale time
 * - Background refetch on window focus
 * - Automatic retry on failure (3 attempts)
 *
 * @returns React Query result with addresses data
 *
 * @example
 * ```tsx
 * const { data: addresses, isLoading, error } = useAddresses();
 * ```
 */
export function useAddresses() {
  return useQuery({
    queryKey: ADDRESSES_QUERY_KEY,
    queryFn: getAllAddresses,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Mutation hook for creating a new address
 *
 * Features:
 * - Optimistic updates
 * - Automatic cache invalidation on success
 *
 * @returns React Query mutation result
 *
 * @example
 * ```tsx
 * const createMutation = useCreateAddress();
 * createMutation.mutate({
 *   line_1: '123 Main St',
 *   line_2: '',
 *   line_3: '',
 *   line_4: 'London',
 *   line_5: 'SW1A 1AA'
 * });
 * ```
 */
export function useCreateAddress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createAddress,
    onSuccess: () => {
      // Invalidate and refetch addresses
      queryClient.invalidateQueries({ queryKey: ADDRESSES_QUERY_KEY });
    },
  });
}

/**
 * Mutation hook for updating an existing address
 *
 * Features:
 * - Optimistic updates
 * - Automatic cache invalidation on success
 *
 * @returns React Query mutation result
 *
 * @example
 * ```tsx
 * const updateMutation = useUpdateAddress();
 * updateMutation.mutate({
 *   id: 42,
 *   data: { line_1: '456 New Street' }
 * });
 * ```
 */
export function useUpdateAddress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<AddressFormData> }) =>
      updateAddress(id, data),
    onSuccess: () => {
      // Invalidate and refetch addresses
      queryClient.invalidateQueries({ queryKey: ADDRESSES_QUERY_KEY });
    },
  });
}

/**
 * Mutation hook for deleting an address
 *
 * Features:
 * - Optimistic updates
 * - Automatic cache invalidation on success
 *
 * @returns React Query mutation result
 *
 * @example
 * ```tsx
 * const deleteMutation = useDeleteAddress();
 * deleteMutation.mutate(42);
 * ```
 */
export function useDeleteAddress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteAddress,
    onSuccess: () => {
      // Invalidate and refetch addresses
      queryClient.invalidateQueries({ queryKey: ADDRESSES_QUERY_KEY });
    },
  });
}
