/**
 * ProductOwnerTable Component (BLUE Phase - Refactored)
 *
 * High-performance semantic HTML table for displaying product owners with:
 * - 7 columns: Name, Relationship, Age, DOB, Email, Status, Actions
 * - Memoized row rendering for optimal performance
 * - WCAG 2.1 AA accessibility (semantic HTML, ARIA labels, proper contrast)
 * - Loading, error, and empty states with appropriate UI feedback
 * - Inactive row styling and automatic positioning (lapsed/deceased at bottom)
 * - Responsive design with horizontal scroll on mobile/tablet
 *
 * Performance Optimizations:
 * - Memoized sorting calculation to avoid re-computation on every render
 * - Memoized row component with React.memo to prevent unnecessary re-renders
 * - Cached expensive calculations (age, full name) using useMemo
 * - Optimized key props for efficient list reconciliation
 *
 * @module components/ProductOwnerTable
 */

import React, { useMemo, memo, useCallback, useState } from 'react';
import { StatusBadge, SortableColumnHeader } from '../../ui';
import ActionButton from '../../ui/buttons/ActionButton';
import AddButton from '../../ui/buttons/AddButton';
import ProductOwnerActions from './ProductOwnerActions';
import EditProductOwnerModal from './EditProductOwnerModal';
import CreateProductOwnerModal from './CreateProductOwnerModal';
import { formatFullName, calculateAge } from '@/utils/productOwnerHelpers';
import { sortProductOwners, type SortConfig } from '@/utils/sortProductOwners';
import type { ProductOwner } from '@/types/productOwner';

/**
 * ProductOwnerTable Props Interface
 *
 * @property productOwners - Array of product owner records to display
 * @property isLoading - Loading state flag (shows skeleton loader when true)
 * @property error - Error object if data fetch failed, null otherwise
 * @property onRetry - Optional callback function for retry button in error state
 * @property onRefetch - Optional callback function for data refresh after status changes
 * @property clientGroupId - Client group ID for creating new product owners
 * @property onAnnounce - Optional callback function for announcing actions to screen readers
 */
interface ProductOwnerTableProps {
  /** Array of product owner records to display in the table */
  productOwners: ProductOwner[];
  /** Loading state flag - shows skeleton loader when true */
  isLoading: boolean;
  /** Error object if data fetch failed, null otherwise */
  error: Error | null;
  /** Optional callback function for retry button in error state */
  onRetry?: () => void;
  /** Optional callback function for data refresh after status changes */
  onRefetch?: () => void;
  /** Client group ID for creating new product owners */
  clientGroupId?: number;
  /** Optional callback function for announcing actions to screen readers via aria-live */
  onAnnounce?: (message: string) => void;
}

/**
 * Enriched Product Owner Row Data Interface
 *
 * Extends ProductOwner with pre-computed display fields for performance.
 * These cached values prevent recalculation on every render.
 *
 * @property fullName - Pre-formatted full name (title + firstname + surname)
 * @property age - Pre-calculated age from date of birth
 * @property formattedDOB - Pre-formatted date of birth (DD/MM/YYYY)
 * @property isInactive - Pre-computed inactive status (lapsed or deceased)
 */
interface EnrichedProductOwner extends ProductOwner {
  /** Pre-formatted full name (title + firstname + surname) */
  fullName: string;
  /** Pre-calculated age from date of birth */
  age: number | null;
  /** Pre-formatted date of birth (DD/MM/YYYY) */
  formattedDOB: string;
  /** Pre-computed inactive status (lapsed or deceased) */
  isInactive: boolean;
}

/**
 * Date formatting constants for consistent display
 */
const DATE_FORMAT_SEPARATOR = '/';
const EMPTY_VALUE_PLACEHOLDER = '-';

/**
 * Status classification constants for sorting and styling
 */
const ACTIVE_STATUS = 'active';
const LAPSED_STATUS = 'lapsed';
const DECEASED_STATUS = 'deceased';

/**
 * Format date of birth from ISO format (YYYY-MM-DD) to display format (DD/MM/YYYY)
 *
 * Converts ISO date strings to UK-style DD/MM/YYYY format for display.
 * Returns placeholder for null/invalid dates.
 *
 * @param dob - Date of birth in ISO format (YYYY-MM-DD) or null
 * @returns Formatted date string (DD/MM/YYYY) or placeholder '-'
 *
 * @example
 * formatDOB('1980-05-15'); // '15/05/1980'
 * formatDOB(null); // '-'
 * formatDOB('invalid'); // '-'
 */
const formatDOB = (dob: string | null): string => {
  if (!dob) return EMPTY_VALUE_PLACEHOLDER;

  try {
    const date = new Date(dob);
    // Check for invalid date (NaN)
    if (isNaN(date.getTime())) {
      return EMPTY_VALUE_PLACEHOLDER;
    }

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}${DATE_FORMAT_SEPARATOR}${month}${DATE_FORMAT_SEPARATOR}${year}`;
  } catch {
    // Catch any parsing errors and return placeholder
    return EMPTY_VALUE_PLACEHOLDER;
  }
};

/**
 * Check if a product owner is inactive (lapsed or deceased)
 *
 * Inactive owners are displayed with greyed-out styling and positioned
 * at the bottom of the table for visual hierarchy.
 *
 * @param status - Product owner status string
 * @returns True if status is lapsed or deceased, false otherwise
 *
 * @example
 * isInactive('active'); // false
 * isInactive('lapsed'); // true
 * isInactive('deceased'); // true
 * isInactive('LAPSED'); // true (case-insensitive)
 */
const isInactive = (status: string): boolean => {
  const normalizedStatus = status.toLowerCase();
  return normalizedStatus === LAPSED_STATUS || normalizedStatus === DECEASED_STATUS;
};

/**
 * Memoized Product Owner Table Row Component
 *
 * Renders single table row. Memoized to prevent unnecessary re-renders.
 * Only re-renders if owner or onRefetch props change (by reference).
 *
 * @param props.owner - Enriched product owner with pre-computed fields
 * @param props.onRefetch - Optional callback for data refresh after status changes
 */
interface ProductOwnerRowProps {
  owner: EnrichedProductOwner;
  onRefetch?: () => void;
  onEdit: (owner: ProductOwner) => void;
  onAnnounce?: (message: string) => void;
}

const ProductOwnerRow = memo<ProductOwnerRowProps>(({ owner, onRefetch, onEdit, onAnnounce }) => {
  return (
    <tr
      onClick={() => onEdit(owner)}
      className={`hover:bg-gray-50 cursor-pointer transition-colors ${
        owner.isInactive ? 'opacity-50 grayscale-[30%]' : ''
      }`}
      data-testid={`product-owner-row-${owner.id}`}
    >
      {/* Name Column - Pre-formatted full name */}
      <td className="px-3 py-1 whitespace-nowrap text-center text-base font-medium text-gray-900">
        {owner.fullName}
      </td>

      {/* Relationship Column */}
      <td className="px-3 py-1 whitespace-nowrap text-center text-base text-gray-900">
        {owner.relationship_status || EMPTY_VALUE_PLACEHOLDER}
      </td>

      {/* Age Column - Pre-calculated age */}
      <td className="px-3 py-1 whitespace-nowrap text-center text-base text-gray-900">
        {owner.age !== null ? owner.age : EMPTY_VALUE_PLACEHOLDER}
      </td>

      {/* DOB Column - Pre-formatted date */}
      <td className="px-3 py-1 whitespace-nowrap text-center text-base text-gray-900">
        {owner.formattedDOB}
      </td>

      {/* Email Column - Primary email */}
      <td className="px-3 py-1 whitespace-nowrap text-center text-base text-gray-900">
        {owner.email_1 || EMPTY_VALUE_PLACEHOLDER}
      </td>

      {/* Status Column - Badge component */}
      <td className="px-3 py-1 whitespace-nowrap text-center text-base">
        <StatusBadge status={owner.status} />
      </td>

      {/* Actions Column - Status management buttons */}
      <td className="px-3 py-1 whitespace-nowrap text-center text-base">
        <div
          className="flex items-center justify-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <ProductOwnerActions
            productOwner={owner}
            onStatusChange={onRefetch}
            onAnnounce={onAnnounce}
          />
        </div>
      </td>
    </tr>
  );
});

// Display name for React DevTools
ProductOwnerRow.displayName = 'ProductOwnerRow';

/**
 * Table Header with 7 columns (6 sortable, 1 actions)
 */
interface TableHeaderProps {
  sortConfig: SortConfig | null;
  onSort: (column: SortConfig['column'], direction: 'asc' | 'desc' | null) => void;
}

const TableHeader: React.FC<TableHeaderProps> = memo(({ sortConfig, onSort }) => {
  return (
    <thead className="bg-gray-50">
      <tr>
        <SortableColumnHeader
          column="name"
          label="Name"
          currentSort={sortConfig}
          onSort={onSort}
        />
        <SortableColumnHeader
          column="relationship"
          label="Relationship"
          currentSort={sortConfig}
          onSort={onSort}
        />
        <SortableColumnHeader
          column="age"
          label="Age"
          currentSort={sortConfig}
          onSort={onSort}
        />
        <SortableColumnHeader
          column="dob"
          label="DOB"
          currentSort={sortConfig}
          onSort={onSort}
        />
        <SortableColumnHeader
          column="email"
          label="Email"
          currentSort={sortConfig}
          onSort={onSort}
        />
        <SortableColumnHeader
          column="status"
          label="Status"
          currentSort={sortConfig}
          onSort={onSort}
        />
        {/* Actions column is not sortable - aria-sort="none" indicates it's not sortable */}
        <th
          scope="col"
          aria-sort="none"
          className="text-center text-sm font-bold text-gray-900 uppercase tracking-wider"
        >
          <div className="px-3 py-1">
            Actions
          </div>
        </th>
      </tr>
    </thead>
  );
});

TableHeader.displayName = 'TableHeader';

/**
 * ProductOwnerTable Main Component
 *
 * High-performance semantic table with loading/error/empty/data states.
 * Memoized enrichment and sorting. Responsive with horizontal scroll.
 * Full accessibility with ARIA labels and keyboard navigation.
 *
 * @param props - productOwners, isLoading, error, onRetry
 */
const ProductOwnerTable: React.FC<ProductOwnerTableProps> = ({
  productOwners,
  isLoading,
  error,
  onRetry,
  onRefetch,
  clientGroupId,
  onAnnounce,
}) => {
  /**
   * Sort state management
   * Tracks the current sort column and direction (null = no sorting)
   */
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);

  /**
   * Edit modal state management
   * Tracks which product owner is being edited (null = modal closed)
   */
  const [editingProductOwner, setEditingProductOwner] = useState<ProductOwner | null>(null);
  const isEditModalOpen = editingProductOwner !== null;

  /**
   * Create modal state management
   * Tracks whether create modal is open
   */
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  /**
   * Handle sort state changes from SortableColumnHeader
   *
   * @param column - Column to sort by
   * @param direction - Sort direction or null to clear
   */
  const handleSort = useCallback((column: SortConfig['column'], direction: 'asc' | 'desc' | null) => {
    if (direction === null) {
      setSortConfig(null);
      // Announce sort clear to screen readers
      if (onAnnounce) {
        onAnnounce('Sorting cleared');
        setTimeout(() => onAnnounce(''), 3000);
      }
    } else {
      setSortConfig({ column, direction });
      // Announce sort change to screen readers
      if (onAnnounce) {
        const directionText = direction === 'asc' ? 'ascending' : 'descending';
        onAnnounce(`Sorted by ${column} ${directionText}`);
        setTimeout(() => onAnnounce(''), 3000);
      }
    }
  }, [onAnnounce]);

  /**
   * Handle Edit button click
   *
   * Opens edit modal with selected product owner data
   */
  const handleEdit = useCallback((owner: ProductOwner) => {
    setEditingProductOwner(owner);
  }, []);

  /**
   * Handle edit modal close
   *
   * Closes edit modal and clears selected product owner
   */
  const handleEditModalClose = useCallback(() => {
    setEditingProductOwner(null);
  }, []);

  /**
   * Handle successful update from edit modal
   *
   * Closes modal and triggers data refresh
   */
  const handleEditSuccess = useCallback(() => {
    if (onAnnounce) {
      onAnnounce('Product owner updated successfully');
      setTimeout(() => onAnnounce(''), 3000);
    }
    if (onRefetch) {
      onRefetch();
    }
  }, [onRefetch, onAnnounce]);

  /**
   * Handle Add Person button click
   *
   * Opens create modal
   */
  const handleAddPerson = useCallback(() => {
    setIsCreateModalOpen(true);
  }, []);

  /**
   * Handle create modal close
   *
   * Closes create modal
   */
  const handleCreateModalClose = useCallback(() => {
    setIsCreateModalOpen(false);
  }, []);

  /**
   * Handle successful creation from create modal
   *
   * Closes modal and triggers data refresh
   */
  const handleCreateSuccess = useCallback(() => {
    if (onRefetch) {
      onRefetch();
    }
  }, [onRefetch]);

  /**
   * PERFORMANCE OPTIMIZATION 1: Memoize enriched product owners
   *
   * Pre-computes display fields (full name, age, formatted DOB, inactive status)
   * to avoid recalculation on every render. Important for large lists.
   *
   * Re-computes only when productOwners data changes
   */
  const enrichedProductOwners = useMemo<EnrichedProductOwner[]>(() => {
    return productOwners.map(owner => ({
      ...owner,
      fullName: formatFullName(owner),
      age: calculateAge(owner.dob),
      formattedDOB: formatDOB(owner.dob),
      isInactive: isInactive(owner.status),
    }));
  }, [productOwners]);

  /**
   * PERFORMANCE OPTIMIZATION 2: Memoize sorted product owners
   *
   * Applies sortProductOwners utility with business rule:
   * inactive rows (lapsed/deceased) always at bottom.
   *
   * Performance: O(n log n) Timsort. Memoization prevents re-sorting
   * on every render. For 100 rows, saves ~664 comparisons per render.
   *
   * Re-computes only when data or sort configuration changes
   */
  const sortedProductOwners = useMemo<EnrichedProductOwner[]>(() => {
    return sortProductOwners(enrichedProductOwners, sortConfig);
  }, [enrichedProductOwners, sortConfig]);

  /**
   * LOADING STATE: Shows skeleton loader to maintain layout consistency
   */
  if (isLoading) {
    return (
      <>
        {/* Add Person Button - Only show if clientGroupId is provided */}
        {clientGroupId && (
          <div className="mb-4 flex justify-end">
            <AddButton
              onClick={handleAddPerson}
              context="Person"
              design="balanced"
              size="md"
            />
          </div>
        )}

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table
            className="min-w-full divide-y divide-gray-200"
            role="table"
            aria-label="Product Owners"
            aria-busy="true"
          >
            <TableHeader sortConfig={sortConfig} onSort={handleSort} />
          </table>
          <div data-testid="table-skeleton" className="p-8" aria-live="polite" aria-busy="true">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              <div className="h-4 bg-gray-200 rounded w-4/5"></div>
            </div>
            <span className="sr-only">Loading product owners</span>
          </div>
        </div>

        {/* Create Product Owner Modal */}
        {clientGroupId && (
          <CreateProductOwnerModal
            isOpen={isCreateModalOpen}
            onClose={handleCreateModalClose}
            clientGroupId={clientGroupId}
            onCreate={handleCreateSuccess}
            includeProductSelection={false}
          />
        )}
      </>
    );
  }

  /**
   * ERROR STATE: Shows error message with optional retry button
   */
  if (error) {
    return (
      <>
        {/* Add Person Button - Only show if clientGroupId is provided */}
        {clientGroupId && (
          <div className="mb-4 flex justify-end">
            <AddButton
              onClick={handleAddPerson}
              context="Person"
              design="balanced"
              size="md"
            />
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-8">
          <div className="text-center" role="alert" aria-live="assertive">
            <svg
              className="mx-auto h-12 w-12 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              Error Loading Product Owners
            </h3>
            <p className="mt-2 text-sm text-gray-500">{error.message}</p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
              >
                Retry
              </button>
            )}
          </div>
        </div>

        {/* Create Product Owner Modal */}
        {clientGroupId && (
          <CreateProductOwnerModal
            isOpen={isCreateModalOpen}
            onClose={handleCreateModalClose}
            clientGroupId={clientGroupId}
            onCreate={handleCreateSuccess}
            includeProductSelection={false}
          />
        )}
      </>
    );
  }

  /**
   * EMPTY STATE: Shows when no product owners exist yet
   */
  if (productOwners.length === 0) {
    return (
      <>
        {/* Add Person Button - Only show if clientGroupId is provided */}
        {clientGroupId && (
          <div className="mb-4 flex justify-end">
            <AddButton
              onClick={handleAddPerson}
              context="Person"
              design="balanced"
              size="md"
            />
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-8">
          <div className="text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              No Product Owners Found
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              Add your first product owner to get started
            </p>
          </div>
        </div>

        {/* Create Product Owner Modal */}
        {clientGroupId && (
          <CreateProductOwnerModal
            isOpen={isCreateModalOpen}
            onClose={handleCreateModalClose}
            clientGroupId={clientGroupId}
            onCreate={handleCreateSuccess}
            includeProductSelection={false}
          />
        )}
      </>
    );
  }

  /**
   * DATA STATE: Main table with sorted product owners
   * Inactive rows always at bottom. Each row memoized for performance.
   */
  return (
    <>
      {/* Add Person Button - Only show if clientGroupId is provided */}
      {clientGroupId && (
        <div className="mb-3 flex justify-end">
          <AddButton
            onClick={handleAddPerson}
            context="Person"
            design="balanced"
            size="sm"
            aria-label="Add new person to client group"
          />
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table
            className="min-w-full divide-y divide-gray-200"
            role="table"
            aria-label="Product Owners"
          >
            <caption className="sr-only">
              {productOwners.length} product owner{productOwners.length !== 1 ? 's' : ''}
            </caption>
            <TableHeader sortConfig={sortConfig} onSort={handleSort} />
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedProductOwners.map((owner) => (
                <ProductOwnerRow
                  key={owner.id}
                  owner={owner}
                  onRefetch={onRefetch}
                  onEdit={handleEdit}
                  onAnnounce={onAnnounce}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Product Owner Modal */}
      {editingProductOwner && (
        <EditProductOwnerModal
          isOpen={isEditModalOpen}
          onClose={handleEditModalClose}
          productOwner={editingProductOwner}
          onUpdate={handleEditSuccess}
        />
      )}

      {/* Create Product Owner Modal */}
      {clientGroupId && (
        <CreateProductOwnerModal
          isOpen={isCreateModalOpen}
          onClose={handleCreateModalClose}
          clientGroupId={clientGroupId}
          onCreate={handleCreateSuccess}
          includeProductSelection={false}
        />
      )}
    </>
  );
};

export default ProductOwnerTable;
