/**
 * PeopleSubTab Component (BLUE Phase - Refactored)
 *
 * Container component for the People sub-tab within BasicDetailsTab.
 * Displays product owners for a client group with comprehensive CRUD functionality.
 *
 * Features:
 * - Add Person button for creating new product owners
 * - ProductOwnerTable with full display of 7 columns
 * - Loading, error, and empty states handled by ProductOwnerTable
 * - Retry functionality on error
 * - Integration with React Query for data fetching and caching
 *
 * Data Flow:
 * 1. Extracts clientGroupId from route params
 * 2. Fetches product owners via useProductOwners hook (React Query)
 * 3. Passes data and states to ProductOwnerTable for rendering
 * 4. Provides refetch callback for error recovery
 *
 * User Actions:
 * - View all product owners in sortable table
 * - Add new person (TODO: Phase 3 implementation)
 * - Edit existing person (TODO: Phase 3 implementation)
 * - Delete person (TODO: Phase 3 implementation)
 * - Retry on data fetch errors
 *
 * Performance:
 * - React Query caching reduces redundant API calls
 * - Memoized child components prevent unnecessary re-renders
 * - Efficient data fetching with automatic background updates
 *
 * @module pages/ClientGroupSuite/tabs/components/PeopleSubTab
 */

import React, { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import ProductOwnerTable from '@/components/ProductOwnerTable';
import { useProductOwners } from '@/hooks/useProductOwners';

/**
 * Route parameters interface for type-safe param extraction
 *
 * @property clientGroupId - Client group ID from URL route parameter
 */
interface RouteParams {
  /** Client group ID from URL route parameter (string) */
  clientGroupId: string;
}

/**
 * PeopleSubTab Component
 *
 * Displays the People sub-tab with product owners table and management actions.
 * Integrates with React Query for efficient data fetching and caching.
 *
 * Architecture:
 * - Extracts clientGroupId from route params for data fetching
 * - Uses useProductOwners hook for React Query integration
 * - Delegates rendering to ProductOwnerTable component
 * - Provides Add Person action button for future implementation
 *
 * Error Handling:
 * - Invalid/missing clientGroupId: Hook returns empty data with error
 * - Network errors: ProductOwnerTable displays error with retry button
 * - No product owners: ProductOwnerTable displays empty state
 *
 * State Management:
 * - React Query manages server state (fetching, caching, updates)
 * - No local component state needed (stateless container)
 * - Automatic background refetch on window focus/network reconnect
 *
 * Future Enhancements (Phase 3):
 * - Add Person modal for creating new product owners
 * - Edit Person modal for updating existing product owners
 * - Delete confirmation modal with cascade handling
 * - Bulk actions (import, export, bulk delete)
 *
 * @returns PeopleSubTab JSX element
 */
const PeopleSubTab: React.FC = () => {
  /**
   * Extract clientGroupId from route params
   *
   * Route structure: /client-groups/:clientGroupId/...
   * Example: /client-groups/123/... → clientGroupId = '123'
   */
  const { clientGroupId } = useParams<RouteParams>();

  /**
   * Parse clientGroupId to number for API calls
   *
   * Memoized to avoid reparsing on every render.
   * Returns null if clientGroupId is missing or invalid (non-numeric).
   *
   * Null handling:
   * - If null, useProductOwners hook will not fetch data
   * - ProductOwnerTable will display appropriate error state
   */
  const clientGroupIdNumber = useMemo<number | null>(() => {
    if (!clientGroupId) return null;

    const parsed = parseInt(clientGroupId, 10);
    // Check for NaN (invalid numeric string)
    return isNaN(parsed) ? null : parsed;
  }, [clientGroupId]);

  /**
   * Fetch product owners using React Query hook
   *
   * Hook provides:
   * - data: Array of product owners (or undefined if loading/error)
   * - isLoading: Boolean loading state
   * - error: Error object (or null if no error)
   * - refetch: Function to manually trigger data refetch
   *
   * React Query features:
   * - Automatic caching (5 minutes default)
   * - Background refetch on window focus
   * - Automatic retry on network errors (3 retries)
   * - Stale-while-revalidate pattern
   */
  const {
    data: productOwners,
    isLoading,
    error,
    refetch,
  } = useProductOwners(clientGroupIdNumber);

  /**
   * Dynamic announcement state for aria-live region
   * Used to announce user actions like sorts, status changes, and saves
   */
  const [announcement, setAnnouncement] = useState<string>('');

  return (
    <div>
      {/* Screen Reader Announcements - aria-live region */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement || (
          isLoading ? "Loading product owners" :
          error ? `Error: ${error.message}` :
          productOwners ? `${productOwners.length} product owner${productOwners.length !== 1 ? 's' : ''} found` : ''
        )}
      </div>

      {/* Product Owner Table */}
      {/*
        Delegates all rendering logic to ProductOwnerTable component:
        - Loading state: Shows skeleton loader
        - Error state: Shows error message with retry button
        - Empty state: Shows "No Product Owners" message
        - Data state: Shows full table with all product owners

        ProductOwnerTable handles:
        - Sorting (active first, inactive last)
        - Memoization for performance
        - Accessibility (WCAG 2.1 AA)
        - Responsive design
        - Add Person button and modal
      */}
      <ProductOwnerTable
        productOwners={productOwners || []}
        isLoading={isLoading}
        error={error}
        onRetry={refetch}
        onRefetch={refetch}
        clientGroupId={clientGroupIdNumber || undefined}
        onAnnounce={setAnnouncement}
      />
    </div>
  );
};

export default PeopleSubTab;
