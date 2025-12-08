/**
 * Product Owner Sorting Utility
 *
 * Provides sorting functionality for product owner tables with critical business rule:
 * INACTIVE ROWS (lapsed/deceased) MUST ALWAYS BE POSITIONED AT THE BOTTOM.
 *
 * Sorting Strategy:
 * 1. Separate active and inactive product owners
 * 2. Sort only the active owners based on sortConfig
 * 3. Concatenate: [...sortedActive, ...inactive]
 *
 * This ensures inactive rows never participate in sorting, maintaining
 * visual hierarchy where current customers are prioritized.
 *
 * Performance Characteristics:
 * - Time Complexity: O(n log n) - Uses native JavaScript Array.sort (typically Timsort)
 * - Space Complexity: O(n) - Creates new sorted arrays without mutating originals
 * - Stable Sort: Modern browsers use stable sort, maintaining relative order for equal elements
 *
 * @module utils/sortProductOwners
 */

import { calculateAge } from './productOwnerHelpers';
import type { ProductOwner } from '@/types/productOwner';

/**
 * Sort Configuration Interface
 *
 * Defines the column and direction for sorting operations.
 * Null sortConfig returns the original unsorted array.
 */
export interface SortConfig {
  /** Column to sort by */
  column: 'name' | 'relationship' | 'age' | 'dob' | 'email' | 'status';
  /** Sort direction: ascending or descending */
  direction: 'asc' | 'desc';
}

/**
 * Sort direction constants for improved type safety and readability
 */
const SORT_ASCENDING = 'asc' as const;
const SORT_DESCENDING = 'desc' as const;

/**
 * Status classification constants
 * Used for checking inactive status and status column sorting
 */
const STATUS_ACTIVE = 'active';
const STATUS_LAPSED = 'lapsed';
const STATUS_DECEASED = 'deceased';

/**
 * Status order for status column sorting
 * Active (0) → Lapsed (1) → Deceased (2)
 * Lower numbers appear first in ascending sort
 */
const STATUS_ORDER: Record<string, number> = {
  [STATUS_ACTIVE]: 0,
  [STATUS_LAPSED]: 1,
  [STATUS_DECEASED]: 2,
};

/**
 * Default fallback order for unknown status values
 * Ensures unknown statuses sort to the end
 */
const STATUS_ORDER_UNKNOWN = 999;

/**
 * Check if a product owner is inactive (lapsed or deceased)
 *
 * Business Rule: Inactive product owners (lapsed or deceased) are always
 * positioned at the bottom of the table for visual hierarchy.
 *
 * @param owner - Product owner to check
 * @returns True if status is lapsed or deceased, false otherwise
 *
 * @example
 * isInactive({ status: 'active', ... }); // false
 * isInactive({ status: 'Lapsed', ... }); // true (case-insensitive)
 * isInactive({ status: 'DECEASED', ... }); // true
 */
function isInactive(owner: ProductOwner): boolean {
  const status = owner.status.toLowerCase();
  return status === STATUS_LAPSED || status === STATUS_DECEASED;
}

/**
 * Type definition for comparator function
 * Returns -1 (a < b), 0 (a === b), or 1 (a > b) based on comparison result
 */
type Comparator<T> = (a: T, b: T) => number;

/**
 * Compare two values for sorting with null handling
 *
 * Null Handling Strategy:
 * - In ascending order: nulls sort to the end (data completeness prioritized)
 * - In descending order: nulls sort to the beginning
 * - Empty strings are treated as null values
 *
 * This ensures that incomplete data (nulls/empty values) don't interfere
 * with viewing complete records, while still being visible when needed.
 *
 * @template T - Type of values being compared (string, number, Date, etc.)
 * @param a - First value to compare
 * @param b - Second value to compare
 * @param direction - Sort direction ('asc' or 'desc')
 * @returns Comparison result: -1 (a before b), 0 (equal), 1 (a after b)
 *
 * @example
 * // Ascending: nulls to end
 * compareWithNulls('Alice', 'Bob', 'asc'); // -1 (Alice before Bob)
 * compareWithNulls('Alice', null, 'asc'); // -1 (Alice before null)
 * compareWithNulls(null, 'Bob', 'asc'); // 1 (null after Bob)
 *
 * @example
 * // Descending: nulls to beginning
 * compareWithNulls('Alice', null, 'desc'); // 1 (Alice after null)
 * compareWithNulls(null, 'Bob', 'desc'); // -1 (null before Bob)
 */
function compareWithNulls<T>(
  a: T | null | undefined,
  b: T | null | undefined,
  direction: 'asc' | 'desc'
): number {
  // Check for null, undefined, or empty string values
  const aIsNull = a === null || a === undefined || a === '';
  const bIsNull = b === null || b === undefined || b === '';

  // Both null: equal
  if (aIsNull && bIsNull) return 0;

  // One is null: position based on direction
  if (aIsNull) return direction === SORT_ASCENDING ? 1 : -1; // Nulls last in asc, first in desc
  if (bIsNull) return direction === SORT_ASCENDING ? -1 : 1;

  // Both have values: compare using < and > operators
  // Works for strings (alphabetical), numbers (numerical), dates (chronological)
  if (a < b) return direction === SORT_ASCENDING ? -1 : 1;
  if (a > b) return direction === SORT_ASCENDING ? 1 : -1;
  return 0;
}

/**
 * Comparator: Compare two product owners by name (firstname + surname)
 *
 * Name Comparison Strategy:
 * 1. Records with missing firstname sort first (data quality indicator)
 * 2. Then sorted alphabetically by full name (case-insensitive)
 * 3. Whitespace normalized for consistent comparison
 *
 * Business Reason: Missing firstname likely indicates incomplete data entry.
 * Sorting these first helps identify records that need attention.
 *
 * @param a - First product owner
 * @param b - Second product owner
 * @param direction - Sort direction ('asc' or 'desc')
 * @returns Comparison result: -1 (a before b), 0 (equal), 1 (a after b)
 *
 * @example
 * compareByName(
 *   { firstname: 'Alice', surname: 'Smith', ... },
 *   { firstname: 'Bob', surname: 'Jones', ... },
 *   'asc'
 * ); // -1 (Alice before Bob)
 */
function compareByName(a: ProductOwner, b: ProductOwner, direction: 'asc' | 'desc'): number {
  // Check for missing firstname (empty, null, or whitespace-only)
  const aNoFirstname = !a.firstname || a.firstname.trim() === '';
  const bNoFirstname = !b.firstname || b.firstname.trim() === '';

  // Records with no firstname sort first in ascending (data quality indicator)
  if (aNoFirstname && !bNoFirstname) return direction === SORT_ASCENDING ? -1 : 1;
  if (!aNoFirstname && bNoFirstname) return direction === SORT_ASCENDING ? 1 : -1;

  // Both have or both lack firstname: sort alphabetically by full name
  // Normalize: trim whitespace and convert to lowercase for case-insensitive comparison
  const aName = `${a.firstname || ''} ${a.surname || ''}`.trim().toLowerCase();
  const bName = `${b.firstname || ''} ${b.surname || ''}`.trim().toLowerCase();

  // Alphabetical comparison
  if (aName < bName) return direction === SORT_ASCENDING ? -1 : 1;
  if (aName > bName) return direction === SORT_ASCENDING ? 1 : -1;
  return 0;
}

/**
 * Sort product owners by name (firstname + surname)
 *
 * Wrapper function that applies name comparison to an array.
 * Creates a new sorted array without mutating the original.
 *
 * @param owners - Array of product owners to sort
 * @param direction - Sort direction ('asc' or 'desc')
 * @returns New sorted array (original array unchanged)
 */
function sortByName(owners: ProductOwner[], direction: 'asc' | 'desc'): ProductOwner[] {
  return [...owners].sort((a, b) => compareByName(a, b, direction));
}

/**
 * Comparator: Compare two product owners by relationship status
 *
 * Compares relationship_status field alphabetically (case-insensitive).
 * Null values handled by compareWithNulls helper.
 *
 * @param a - First product owner
 * @param b - Second product owner
 * @param direction - Sort direction ('asc' or 'desc')
 * @returns Comparison result: -1 (a before b), 0 (equal), 1 (a after b)
 */
function compareByRelationship(a: ProductOwner, b: ProductOwner, direction: 'asc' | 'desc'): number {
  const aRel = (a.relationship_status || '').toLowerCase();
  const bRel = (b.relationship_status || '').toLowerCase();
  return compareWithNulls(aRel, bRel, direction);
}

/**
 * Sort product owners by relationship status
 *
 * @param owners - Array of product owners to sort
 * @param direction - Sort direction ('asc' or 'desc')
 * @returns New sorted array (original array unchanged)
 */
function sortByRelationship(owners: ProductOwner[], direction: 'asc' | 'desc'): ProductOwner[] {
  return [...owners].sort((a, b) => compareByRelationship(a, b, direction));
}

/**
 * Comparator: Compare two product owners by age (calculated from DOB)
 *
 * Age Comparison Strategy:
 * - Ascending: youngest first (18 before 65)
 * - Descending: oldest first (65 before 18)
 * - Different from DOB sort which compares dates chronologically
 *
 * Performance: Age calculated once per comparison, not memoized in this comparator.
 * For better performance, use enrichedProductOwners with pre-calculated ages.
 *
 * @param a - First product owner
 * @param b - Second product owner
 * @param direction - Sort direction ('asc' or 'desc')
 * @returns Comparison result: -1 (a before b), 0 (equal), 1 (a after b)
 *
 * @example
 * // Alice (30) vs Bob (45), ascending = youngest first
 * compareByAge(alice, bob, 'asc'); // -1 (Alice before Bob)
 *
 * @example
 * // Alice (30) vs Bob (45), descending = oldest first
 * compareByAge(alice, bob, 'desc'); // 1 (Alice after Bob)
 */
function compareByAge(a: ProductOwner, b: ProductOwner, direction: 'asc' | 'desc'): number {
  const aAge = calculateAge(a.dob);
  const bAge = calculateAge(b.dob);
  return compareWithNulls(aAge, bAge, direction);
}

/**
 * Sort product owners by age (calculated from DOB)
 *
 * @param owners - Array of product owners to sort
 * @param direction - Sort direction ('asc' or 'desc')
 * @returns New sorted array (original array unchanged)
 */
function sortByAge(owners: ProductOwner[], direction: 'asc' | 'desc'): ProductOwner[] {
  return [...owners].sort((a, b) => compareByAge(a, b, direction));
}

/**
 * Comparator: Compare two product owners by date of birth (chronological)
 *
 * DOB Comparison Strategy:
 * - Ascending: oldest first (1950-01-01 before 2000-01-01)
 * - Descending: newest first (2000-01-01 before 1950-01-01)
 * - Different from age sort which compares calculated age numbers
 *
 * Technical: ISO date strings (YYYY-MM-DD) allow direct string comparison
 * without parsing to Date objects, improving performance.
 *
 * @param a - First product owner
 * @param b - Second product owner
 * @param direction - Sort direction ('asc' or 'desc')
 * @returns Comparison result: -1 (a before b), 0 (equal), 1 (a after b)
 *
 * @example
 * // DOB sort (chronological)
 * compareByDOB(
 *   { dob: '1980-05-15', ... },
 *   { dob: '1990-03-20', ... },
 *   'asc'
 * ); // -1 (1980 before 1990)
 */
function compareByDOB(a: ProductOwner, b: ProductOwner, direction: 'asc' | 'desc'): number {
  // Compare as ISO date strings (YYYY-MM-DD format allows direct string comparison)
  return compareWithNulls(a.dob, b.dob, direction);
}

/**
 * Sort product owners by date of birth (chronological)
 *
 * @param owners - Array of product owners to sort
 * @param direction - Sort direction ('asc' or 'desc')
 * @returns New sorted array (original array unchanged)
 */
function sortByDOB(owners: ProductOwner[], direction: 'asc' | 'desc'): ProductOwner[] {
  return [...owners].sort((a, b) => compareByDOB(a, b, direction));
}

/**
 * Comparator: Compare two product owners by email (email_1)
 *
 * Compares primary email field alphabetically (case-insensitive).
 * Null values handled by compareWithNulls helper.
 *
 * @param a - First product owner
 * @param b - Second product owner
 * @param direction - Sort direction ('asc' or 'desc')
 * @returns Comparison result: -1 (a before b), 0 (equal), 1 (a after b)
 */
function compareByEmail(a: ProductOwner, b: ProductOwner, direction: 'asc' | 'desc'): number {
  const aEmail = (a.email_1 || '').toLowerCase();
  const bEmail = (b.email_1 || '').toLowerCase();
  return compareWithNulls(aEmail, bEmail, direction);
}

/**
 * Sort product owners by email (email_1)
 *
 * @param owners - Array of product owners to sort
 * @param direction - Sort direction ('asc' or 'desc')
 * @returns New sorted array (original array unchanged)
 */
function sortByEmail(owners: ProductOwner[], direction: 'asc' | 'desc'): ProductOwner[] {
  return [...owners].sort((a, b) => compareByEmail(a, b, direction));
}

/**
 * Comparator: Compare two product owners by status (active → lapsed → deceased)
 *
 * Status Comparison Strategy:
 * - Uses STATUS_ORDER map for consistent ordering
 * - Ascending: active (0) → lapsed (1) → deceased (2)
 * - Descending: deceased (2) → lapsed (1) → active (0)
 * - Unknown statuses sort to the end (999)
 *
 * Special Case: When status column is used for sorting, ALL rows participate
 * (including inactive). This is different from other columns where inactive
 * rows are always at the bottom.
 *
 * @param a - First product owner
 * @param b - Second product owner
 * @param direction - Sort direction ('asc' or 'desc')
 * @returns Comparison result: -1 (a before b), 0 (equal), 1 (a after b)
 */
function compareByStatus(a: ProductOwner, b: ProductOwner, direction: 'asc' | 'desc'): number {
  const aStatus = a.status.toLowerCase();
  const bStatus = b.status.toLowerCase();
  const aOrder = STATUS_ORDER[aStatus] ?? STATUS_ORDER_UNKNOWN;
  const bOrder = STATUS_ORDER[bStatus] ?? STATUS_ORDER_UNKNOWN;

  // Numerical comparison of status order values
  if (direction === SORT_ASCENDING) {
    return aOrder - bOrder;
  } else {
    return bOrder - aOrder;
  }
}

/**
 * Sort product owners by status (active → lapsed → deceased)
 *
 * Note: This is the ONLY sort function that includes ALL rows (active + inactive).
 * For other sorts, inactive rows are filtered out and always placed at the bottom.
 *
 * @param owners - Array of product owners to sort
 * @param direction - Sort direction ('asc' or 'desc')
 * @returns New sorted array (original array unchanged)
 */
function sortByStatus(owners: ProductOwner[], direction: 'asc' | 'desc'): ProductOwner[] {
  return [...owners].sort((a, b) => compareByStatus(a, b, direction));
}

/**
 * Sort product owners with critical business rule enforcement
 *
 * CRITICAL BUSINESS RULE:
 * Inactive rows (lapsed/deceased) MUST ALWAYS be positioned at the bottom
 * of the table, regardless of the sort column or direction or even if NO sorting is active.
 * Only active rows participate in sorting.
 *
 * Sorting Algorithm:
 * 1. Separate active and inactive product owners
 * 2. If sortConfig is null, return [active, inactive] without sorting
 * 3. If sortConfig provided, sort only the active owners based on sortConfig
 * 4. Concatenate: [...sortedActive, ...inactive]
 *
 * Why inactive rows are always at bottom:
 * - Business Rule: Inactive clients (lapsed/deceased) are less relevant for daily operations
 * - Visual Hierarchy: Active clients should be immediately visible
 * - User Experience: Prevents confusion by separating active from inactive
 *
 * Supported Sort Columns:
 * - name: Alphabetically by firstname + surname
 * - relationship: Alphabetically by relationship_status
 * - age: Numerically by calculated age (youngest first = asc)
 * - dob: Chronologically by date of birth (oldest first = asc)
 * - email: Alphabetically by email_1
 * - status: By status order (active → lapsed → deceased)
 *
 * Null Handling:
 * - Null values sort to the end in ascending order
 * - Null values sort to the beginning in descending order
 *
 * @param productOwners - Array of product owners to sort
 * @param sortConfig - Sort configuration (column + direction) or null for no sorting
 * @returns Array with inactive rows always at the bottom (sorted or unsorted)
 *
 * @example
 * // Sort by name ascending
 * const sorted = sortProductOwners(owners, { column: 'name', direction: 'asc' });
 *
 * @example
 * // Sort by age descending (oldest first)
 * const sorted = sortProductOwners(owners, { column: 'age', direction: 'desc' });
 *
 * @example
 * // No sorting but inactive rows still at bottom
 * const reordered = sortProductOwners(owners, null);
 * // Returns: [active1, active2, ..., lapsed1, deceased1, ...]
 */
export function sortProductOwners(
  productOwners: ProductOwner[],
  sortConfig: SortConfig | null
): ProductOwner[] {
  // Handle empty array
  if (productOwners.length === 0) {
    return [];
  }

  // CRITICAL BUSINESS RULE: ALWAYS separate active and inactive owners
  // Inactive rows (lapsed/deceased) must be at bottom even with no sorting
  const activeOwners = productOwners.filter((owner) => !isInactive(owner));
  const inactiveOwners = productOwners.filter((owner) => isInactive(owner));

  // If no sort configuration, return active + inactive without sorting
  if (!sortConfig) {
    return [...activeOwners, ...inactiveOwners];
  }

  // SPECIAL CASE: Status sorting
  // When sorting by status column, ALL rows participate in sorting (including inactive)
  // This allows users to explicitly group by status when they want to
  if (sortConfig.column === 'status') {
    return sortByStatus(productOwners, sortConfig.direction);
  }

  // For all OTHER sorts (name, age, email, etc.), only active owners participate
  // Sort only the active owners based on column and direction
  let sortedActive: ProductOwner[];

  switch (sortConfig.column) {
    case 'name':
      sortedActive = sortByName(activeOwners, sortConfig.direction);
      break;
    case 'relationship':
      sortedActive = sortByRelationship(activeOwners, sortConfig.direction);
      break;
    case 'age':
      sortedActive = sortByAge(activeOwners, sortConfig.direction);
      break;
    case 'dob':
      sortedActive = sortByDOB(activeOwners, sortConfig.direction);
      break;
    case 'email':
      sortedActive = sortByEmail(activeOwners, sortConfig.direction);
      break;
    default:
      sortedActive = activeOwners;
  }

  // Concatenate sorted active owners + unsorted inactive owners
  // Inactive owners maintain their original order at the bottom
  return [...sortedActive, ...inactiveOwners];
}
