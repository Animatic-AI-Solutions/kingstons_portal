/**
 * useProductOwners Hook
 *
 * React Query hook for fetching and managing product owners for a client group.
 * Provides automatic caching, loading states, error handling, computed values,
 * and refetch capabilities.
 *
 * Features:
 * - Automatic caching with configurable stale time (default: 5 minutes)
 * - Automatic retry on transient failures (1 retry with 1s delay)
 * - Loading and error states for UI feedback
 * - Computed values (count, activeCount, hasProductOwners)
 * - Conditional fetching (disabled when clientGroupId is null/undefined)
 * - Cache invalidation and refetch support
 *
 * @module hooks/useProductOwners
 */

import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { fetchProductOwnersForClientGroup } from '@/services/api/productOwners';
import type { ProductOwner } from '@/types/productOwner';
import {
  PRODUCT_OWNER_QUERY_KEYS,
  DEFAULT_STALE_TIME_MS,
  MAX_RETRY_ATTEMPTS,
  RETRY_DELAY_MS,
  devLog,
} from '@/utils/productOwnerConstants';

/**
 * Hook options interface
 *
 * Configuration options for customizing the useProductOwners hook behavior.
 */
interface UseProductOwnersOptions {
  /**
   * Time in milliseconds that data is considered fresh
   * After this time, data becomes stale and will be refetched on next access
   * @default DEFAULT_STALE_TIME_MS (5 minutes)
   */
  staleTime?: number;

  /**
   * Whether the query should execute automatically
   * Set to false to prevent fetching until manually triggered
   * @default true
   */
  enabled?: boolean;
}

/**
 * Hook return type with computed values
 *
 * Combines React Query state with computed business values for easy consumption.
 */
interface UseProductOwnersResult {
  // ===== Query State =====
  /**
   * Product owners data array (undefined while loading)
   */
  data: ProductOwner[] | undefined;

  /**
   * True during initial fetch (no cached data)
   */
  isLoading: boolean;

  /**
   * True if query resulted in error
   */
  isError: boolean;

  /**
   * True if query completed successfully
   */
  isSuccess: boolean;

  /**
   * True during any fetch (including background refetch)
   */
  isFetching: boolean;

  /**
   * True if cached data is stale and ready for refetch
   */
  isStale: boolean;

  /**
   * Error object if query failed, null otherwise
   */
  error: Error | null;

  // ===== Actions =====
  /**
   * Manually trigger a refetch of the data
   */
  refetch: () => Promise<any>;

  // ===== Computed Values =====
  /**
   * Total number of product owners (all statuses)
   */
  count: number;

  /**
   * Number of active product owners only
   */
  activeCount: number;

  /**
   * True if there is at least one product owner
   */
  hasProductOwners: boolean;
}

/**
 * Fetches product owners for a client group with React Query
 *
 * Provides a React Query wrapper around fetchProductOwnersForClientGroup with
 * automatic caching, retry logic, and computed values for easy UI integration.
 *
 * Caching Strategy:
 * - Default stale time: 5 minutes (configurable via options.staleTime)
 * - Data is cached per client group ID using query key factory
 * - Stale data triggers background refetch on component mount
 * - Cache is shared across all components using the same client group ID
 *
 * Retry Strategy:
 * - Automatically retries failed requests once (MAX_RETRY_ATTEMPTS)
 * - 1 second delay between retries (RETRY_DELAY_MS)
 * - Only retries on retryable errors (5xx, network issues)
 *
 * Conditional Fetching:
 * - Query is disabled when clientGroupId is null/undefined
 * - Can be manually disabled via options.enabled = false
 * - Disabled queries return empty array without making API call
 *
 * @param clientGroupId - Client group ID to fetch owners for (null/undefined disables query)
 * @param options - Optional configuration (staleTime, enabled)
 * @returns Query state, actions, and computed values (see UseProductOwnersResult)
 *
 * @example
 * // Basic usage with loading and error states
 * const { data, isLoading, isError, error } = useProductOwners(clientGroupId);
 *
 * if (isLoading) return <LoadingSpinner />;
 * if (isError) return <ErrorDisplay message={error?.message} />;
 * return <OwnersList owners={data} />;
 *
 * @example
 * // Using computed values
 * const { count, activeCount, hasProductOwners } = useProductOwners(123);
 * console.log(`${activeCount} of ${count} owners are active`);
 *
 * @example
 * // Custom stale time (1 minute)
 * const result = useProductOwners(123, { staleTime: 60000 });
 *
 * @example
 * // Conditional fetching (manual control)
 * const [shouldFetch, setShouldFetch] = useState(false);
 * const result = useProductOwners(123, { enabled: shouldFetch });
 *
 * @example
 * // Manual refetch
 * const { data, refetch } = useProductOwners(123);
 * const handleRefresh = async () => {
 *   await refetch();
 * };
 */
export function useProductOwners(
  clientGroupId: number | null | undefined,
  options?: UseProductOwnersOptions
): UseProductOwnersResult {
  // Log hook usage in development
  devLog.cache('useProductOwners hook called', { clientGroupId, options });

  const {
    data,
    isLoading,
    isError,
    isSuccess,
    isFetching,
    error,
    refetch,
    isStale,
  } = useQuery<ProductOwner[], Error>({
    // Use query key factory for consistent cache keys across the application
    // This enables cache invalidation by client group ID
    queryKey: PRODUCT_OWNER_QUERY_KEYS.byClientGroup(clientGroupId || 0),

    // Query function handles null clientGroupId gracefully
    queryFn: () => {
      // If no clientGroupId provided, return empty array (don't call API)
      // This happens when query is disabled or clientGroupId is being loaded
      if (!clientGroupId) {
        devLog.cache('Skipping fetch - no clientGroupId');
        return Promise.resolve([]);
      }

      // Fetch product owners from API
      devLog.cache('Fetching product owners', clientGroupId);
      return fetchProductOwnersForClientGroup(clientGroupId);
    },

    // Only enable query when clientGroupId is valid and not explicitly disabled
    // This prevents unnecessary API calls and errors
    enabled: clientGroupId !== null && clientGroupId !== undefined && (options?.enabled ?? true),

    // Cache configuration - use constants for consistency
    staleTime: options?.staleTime ?? DEFAULT_STALE_TIME_MS,

    // Retry configuration - use constants for consistency
    retry: MAX_RETRY_ATTEMPTS,
    retryDelay: RETRY_DELAY_MS,
  } as UseQueryOptions<ProductOwner[], Error>);

  // Compute derived values from query data
  // These provide convenient business logic without requiring
  // the consuming component to recompute

  // Total count of all product owners (any status)
  const count = data?.length ?? 0;

  // Count of active product owners only
  // Used for displaying current/active customer metrics
  const activeCount = data?.filter((owner) => owner.status === 'active').length ?? 0;

  // Boolean flag for conditional rendering
  // Cleaner than checking data?.length > 0 everywhere
  const hasProductOwners = count > 0;

  // Log cache state in development
  devLog.cache('useProductOwners result', {
    count,
    activeCount,
    isLoading,
    isStale,
    isFetching,
  });

  // Return combined query state and computed values
  return {
    data,
    isLoading,
    isError,
    isSuccess,
    isFetching,
    isStale,
    error: error ?? null,
    refetch,
    count,
    activeCount,
    hasProductOwners,
  };
}
