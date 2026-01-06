/**
 * Relationship Table Utilities
 *
 * Shared utility functions for Personal and Professional relationship tables.
 * Includes sort logic, data formatting, and helper functions.
 *
 * @module relationshipTable/utils
 */

import { SpecialRelationship, STATUS_PRIORITY_ORDER } from '@/types/specialRelationship';
import { SortConfig } from '@/components/ui/tables/TableSortHeader';
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
      case 'first_name': {
        // Split name into first name (first word)
        const aNameParts = (a.name || '').trim().split(/\s+/);
        const bNameParts = (b.name || '').trim().split(/\s+/);
        aValue = (aNameParts[0] || '').toLowerCase();
        bValue = (bNameParts[0] || '').toLowerCase();
        break;
      }
      case 'last_name': {
        // Split name into last name (everything after first word)
        const aNameParts = (a.name || '').trim().split(/\s+/);
        const bNameParts = (b.name || '').trim().split(/\s+/);
        aValue = (aNameParts.length > 1 ? aNameParts.slice(1).join(' ') : '').toLowerCase();
        bValue = (bNameParts.length > 1 ? bNameParts.slice(1).join(' ') : '').toLowerCase();
        break;
      }
      case 'status':
        // Use STATUS_PRIORITY_ORDER for proper Active > Inactive > Deceased ordering
        const statusComparison = STATUS_PRIORITY_ORDER[a.status] - STATUS_PRIORITY_ORDER[b.status];
        return sortConfig.direction === 'asc' ? statusComparison : -statusComparison;
      case 'date_of_birth':
        aValue = a.date_of_birth ? new Date(a.date_of_birth).getTime() : 0;
        bValue = b.date_of_birth ? new Date(b.date_of_birth).getTime() : 0;
        break;
      case 'company_name':
        aValue = a.firm_name?.toLowerCase() || '';
        bValue = b.firm_name?.toLowerCase() || '';
        // Sort null values to end
        if (!a.firm_name && b.firm_name) return 1;
        if (a.firm_name && !b.firm_name) return -1;
        break;
      case 'position':
        aValue = (a as any).position?.toLowerCase() || '';
        bValue = (b as any).position?.toLowerCase() || '';
        // Sort null values to end
        if (!(a as any).position && (b as any).position) return 1;
        if ((a as any).position && !(b as any).position) return -1;
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
