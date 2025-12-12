/**
 * Relationship Table Utilities
 *
 * Shared utility functions for Personal and Professional relationship tables.
 * Includes sort logic, data formatting, and helper functions.
 *
 * @module relationshipTable/utils
 */

import { SpecialRelationship, STATUS_PRIORITY_ORDER } from '@/types/specialRelationship';
import { SortConfig } from '@/components/TableSortHeader';
import { EMPTY_VALUE_PLACEHOLDER } from './constants';

// ==========================
// Sort Functions
// ==========================

/**
 * Sort relationships by specified column and direction.
 * Handles string comparison (case-insensitive), date comparison, and null values.
 * CRITICAL: When sorting by status, uses STATUS_PRIORITY_ORDER (Active > Inactive > Deceased).
 *
 * @param relationships - Array of relationships to sort
 * @param sortConfig - Sort configuration (column and direction)
 * @returns Sorted array of relationships
 *
 * @example
 * ```typescript
 * const sorted = sortRelationships(relationships, { column: 'first_name', direction: 'asc' });
 * ```
 */
export const sortRelationships = (
  relationships: SpecialRelationship[],
  sortConfig: SortConfig
): SpecialRelationship[] => {
  const sorted = [...relationships];

  sorted.sort((a, b) => {
    let aValue: any;
    let bValue: any;

    switch (sortConfig.column) {
      case 'first_name':
        aValue = a.first_name?.toLowerCase() || '';
        bValue = b.first_name?.toLowerCase() || '';
        break;
      case 'last_name':
        aValue = a.last_name?.toLowerCase() || '';
        bValue = b.last_name?.toLowerCase() || '';
        break;
      case 'status':
        // Use STATUS_PRIORITY_ORDER for proper Active > Inactive > Deceased ordering
        const statusComparison = STATUS_PRIORITY_ORDER[a.status] - STATUS_PRIORITY_ORDER[b.status];
        return sortConfig.direction === 'asc' ? statusComparison : -statusComparison;
      case 'date_of_birth':
        aValue = a.date_of_birth ? new Date(a.date_of_birth).getTime() : 0;
        bValue = b.date_of_birth ? new Date(b.date_of_birth).getTime() : 0;
        break;
      case 'company_name':
        aValue = a.company_name?.toLowerCase() || '';
        bValue = b.company_name?.toLowerCase() || '';
        // Sort null values to end
        if (!a.company_name && b.company_name) return 1;
        if (a.company_name && !b.company_name) return -1;
        break;
      case 'position':
        aValue = a.position?.toLowerCase() || '';
        bValue = b.position?.toLowerCase() || '';
        // Sort null values to end
        if (!a.position && b.position) return 1;
        if (a.position && !b.position) return -1;
        break;
      default:
        return 0;
    }

    if (aValue < bValue) {
      return sortConfig.direction === 'asc' ? -1 : 1;
    }
    if (aValue > bValue) {
      return sortConfig.direction === 'asc' ? 1 : -1;
    }
    return 0;
  });

  return sorted;
};

/**
 * Get the effective sort configuration, applying defaults if needed.
 * If no column is specified, defaults to first_name ascending.
 *
 * @param sortConfig - Current sort configuration
 * @returns Effective sort configuration with defaults applied
 *
 * @example
 * ```typescript
 * const effective = getEffectiveSortConfig({ column: '', direction: 'asc' });
 * // Returns: { column: 'first_name', direction: 'asc' }
 * ```
 */
export const getEffectiveSortConfig = (sortConfig: SortConfig): SortConfig => {
  return sortConfig.column
    ? sortConfig
    : { column: 'first_name', direction: 'asc' };
};

// ==========================
// Data Formatting Functions
// ==========================

/**
 * Format phone number by prioritizing mobile > home > work.
 * Returns placeholder if all phone fields are empty.
 *
 * @param relationship - Relationship object with phone fields
 * @returns Formatted phone string or placeholder
 *
 * @example
 * ```typescript
 * const phone = formatPhoneNumber({ mobile_phone: '555-1234', home_phone: null, work_phone: null });
 * // Returns: '555-1234'
 * ```
 */
export const formatPhoneNumber = (relationship: SpecialRelationship): string => {
  return (
    relationship.mobile_phone ||
    relationship.home_phone ||
    relationship.work_phone ||
    EMPTY_VALUE_PLACEHOLDER
  );
};

/**
 * Get the CSS classes for a status badge based on status value.
 *
 * @param status - Relationship status
 * @returns CSS class string for the status badge
 *
 * @example
 * ```typescript
 * const classes = getStatusBadgeClasses('Active');
 * // Returns: 'bg-green-100 text-green-800'
 * ```
 */
export const getStatusBadgeClasses = (
  status: 'Active' | 'Inactive' | 'Deceased'
): string => {
  switch (status) {
    case 'Active':
      return 'bg-green-100 text-green-800';
    case 'Inactive':
      return 'bg-gray-100 text-gray-800';
    case 'Deceased':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

/**
 * Format product owner count for display.
 * Returns 'No Products' for 0, or 'N Product(s)' for other values.
 *
 * @param count - Number of products owned
 * @returns Formatted product count string
 *
 * @example
 * ```typescript
 * formatProductOwnerCount(0);  // Returns: 'No Products'
 * formatProductOwnerCount(1);  // Returns: '1 Product'
 * formatProductOwnerCount(5);  // Returns: '5 Products'
 * ```
 */
export const formatProductOwnerCount = (count: number): string => {
  if (count === 0) return 'No Products';
  return `${count} Product${count !== 1 ? 's' : ''}`;
};
