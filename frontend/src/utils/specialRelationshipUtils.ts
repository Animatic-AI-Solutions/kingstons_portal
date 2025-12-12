/**
 * Special Relationship Utility Functions
 * Provides helper functions for managing and manipulating special relationship data
 */

import { parseISO, differenceInYears, isValid } from 'date-fns';
import {
  SpecialRelationship,
  RelationshipType,
  RelationshipStatus,
  PROFESSIONAL_RELATIONSHIP_TYPES,
  STATUS_PRIORITY_ORDER,
} from '@/types/specialRelationship';

/**
 * Calculate age from date of birth
 * Uses date-fns to compute the difference in years between DOB and current date
 * @param dateOfBirth - ISO format date string (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SSZ) or null
 * @returns Age in years (non-negative integer), or undefined if date is invalid/null
 * @example
 * calculateAge('1980-05-15') // Returns age in years (e.g., 45 in 2025)
 * calculateAge(null) // Returns undefined
 * calculateAge('invalid') // Returns undefined
 */
export function calculateAge(dateOfBirth: string | null): number | undefined {
  if (!dateOfBirth || dateOfBirth === '') {
    return undefined;
  }

  try {
    const dob = parseISO(dateOfBirth);
    if (!isValid(dob)) {
      return undefined;
    }
    const age = differenceInYears(new Date(), dob);
    return age >= 0 ? age : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Compare two values for sorting
 * Handles string, number, and boolean comparisons
 * @param aValue - First value to compare
 * @param bValue - Second value to compare
 * @param direction - Sort direction
 * @returns Comparison result (-1, 0, 1)
 */
function compareValues(
  aValue: string | number | boolean,
  bValue: string | number | boolean,
  direction: 'asc' | 'desc'
): number {
  let comparison = 0;

  // String comparison using locale-aware sorting
  if (typeof aValue === 'string' && typeof bValue === 'string') {
    comparison = aValue.localeCompare(bValue);
    return direction === 'asc' ? comparison : -comparison;
  }
  // Number comparison
  if (typeof aValue === 'number' && typeof bValue === 'number') {
    return direction === 'asc' ? aValue - bValue : bValue - aValue;
  }
  // Boolean comparison (true > false)
  if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
    const boolComparison = aValue === bValue ? 0 : aValue ? -1 : 1;
    return direction === 'asc' ? boolComparison : -boolComparison;
  }

  return comparison;
}

/**
 * Sort relationships by specified column and direction
 * CRITICAL: Always maintains status ordering (Active > Inactive > Deceased) within each sort
 * @param relationships - Array of relationships to sort
 * @param column - Column to sort by
 * @param direction - Sort direction ('asc' or 'desc')
 * @returns Sorted array of relationships (new array, does not mutate input)
 * @example
 * sortRelationships(relationships, 'first_name', 'asc')
 * // Returns relationships sorted alphabetically by first name, with Active before Inactive
 */
export function sortRelationships(
  relationships: SpecialRelationship[],
  column: keyof SpecialRelationship,
  direction: 'asc' | 'desc'
): SpecialRelationship[] {
  return [...relationships].sort((a, b) => {
    // Special handling for status column - use priority order
    if (column === 'status') {
      const statusComparison = STATUS_PRIORITY_ORDER[a.status] - STATUS_PRIORITY_ORDER[b.status];
      return direction === 'asc' ? statusComparison : -statusComparison;
    }

    const aValue = a[column];
    const bValue = b[column];

    // Handle null/undefined values (always sort to end)
    if (aValue === undefined || aValue === null) {
      if (bValue === undefined || bValue === null) {
        // Both null/undefined, use status ordering
        return STATUS_PRIORITY_ORDER[a.status] - STATUS_PRIORITY_ORDER[b.status];
      }
      return 1; // a is null/undefined, sort to end
    }
    if (bValue === undefined || bValue === null) {
      return -1; // b is null/undefined, sort to end
    }

    // Compare non-null values
    const comparison = compareValues(
      aValue as string | number | boolean,
      bValue as string | number | boolean,
      direction
    );

    // If values are equal, use status ordering as tiebreaker
    return comparison === 0
      ? STATUS_PRIORITY_ORDER[a.status] - STATUS_PRIORITY_ORDER[b.status]
      : comparison;
  });
}

/**
 * Filter relationships by personal or professional type
 * @param relationships - Array of relationships to filter
 * @param type - 'personal' for family/personal connections, 'professional' for advisors/professionals
 * @returns Filtered array of relationships (new array, does not mutate input)
 * @example
 * const personalOnly = filterRelationshipsByType(allRelationships, 'personal');
 * // Returns only Spouse, Partner, Child, Parent, Sibling, etc.
 */
export function filterRelationshipsByType(
  relationships: SpecialRelationship[],
  type: 'personal' | 'professional'
): SpecialRelationship[] {
  return relationships.filter(
    (relationship) => getRelationshipCategory(relationship.relationship_type) === type
  );
}

/**
 * Get the category of a relationship type
 * Determines if a relationship is personal (family) or professional (advisor/service provider)
 * @param relationshipType - The type of relationship to categorize
 * @returns 'personal' for family relationships, 'professional' for advisor relationships
 * @example
 * getRelationshipCategory('Spouse') // Returns 'personal'
 * getRelationshipCategory('Solicitor') // Returns 'professional'
 */
export function getRelationshipCategory(
  relationshipType: RelationshipType
): 'personal' | 'professional' {
  return PROFESSIONAL_RELATIONSHIP_TYPES.includes(relationshipType)
    ? 'professional'
    : 'personal';
}

/**
 * Format relationship name for display
 * Combines title, first name, and last name into a formatted display string
 * @param relationship - The relationship object containing name fields
 * @returns Formatted string like "Mr John Doe" or "Jane Smith" (without title)
 * @example
 * formatRelationshipName({ title: 'Dr', first_name: 'Jane', last_name: 'Smith', ... })
 * // Returns "Dr Jane Smith"
 */
export function formatRelationshipName(
  relationship: SpecialRelationship
): string {
  const parts: string[] = [];

  if (relationship.title) {
    parts.push(relationship.title);
  }

  if (relationship.first_name) {
    parts.push(relationship.first_name);
  }

  if (relationship.last_name) {
    parts.push(relationship.last_name);
  }

  return parts.join(' ').trim();
}
