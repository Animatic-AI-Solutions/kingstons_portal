/**
 * PersonTable Component
 *
 * Displays product owners and special relationships with their health/vulnerability
 * counts in the Health & Vulnerabilities Tab.
 *
 * The component displays:
 * - Name column with person name and expand/collapse indicator
 * - Relationship column with relationship type
 * - Active column with count of active health conditions + vulnerabilities
 * - Inactive column with count of inactive/resolved records
 * - Actions column with add button
 *
 * Special relationships are displayed at the bottom with a purple SR badge.
 *
 * Features:
 * - Expandable rows with chevron indicator
 * - Loading skeleton state for async data
 * - Memoized rendering for performance optimization
 * - Full accessibility support (treegrid, aria-expanded, keyboard navigation)
 *
 * @module components/phase2/health-vulnerabilities/PersonTable
 *
 * @example
 * ```tsx
 * // Basic usage
 * <PersonTable
 *   productOwners={productOwners}
 *   specialRelationships={specialRelationships}
 *   onAdd={handleAdd}
 *   onRowClick={handleRowClick}
 *   expandedPersonId={selectedPersonId}
 * />
 *
 * // With loading state
 * <PersonTable
 *   productOwners={[]}
 *   specialRelationships={[]}
 *   onAdd={handleAdd}
 *   onRowClick={handleRowClick}
 *   isLoading={true}
 * />
 * ```
 */

import React, { useCallback, useMemo } from 'react';
import {
  PlusIcon,
  ChevronRightIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
import { EmptyState, Skeleton } from '@/components/ui';
import type { PersonWithCounts, PersonType } from '@/types/healthVulnerability';

// =============================================================================
// Props Interfaces
// =============================================================================

/**
 * Props for the PersonTable component
 */
export interface PersonTableProps {
  /**
   * List of product owners with health/vulnerability counts
   * @example [{id: 1, name: 'John Smith', relationship: 'Primary Owner', ...}]
   */
  productOwners: PersonWithCounts[];

  /**
   * List of special relationships with health/vulnerability counts
   * @example [{id: 10, name: 'Jane Doe', relationship: 'Child', ...}]
   */
  specialRelationships: PersonWithCounts[];

  /**
   * Callback when the add button is clicked for a person
   * @param person - The person for whom to add a health condition or vulnerability
   */
  onAdd: (person: PersonWithCounts) => void;

  /**
   * Callback when a row is clicked to expand/collapse
   * @param person - The person whose row was clicked
   */
  onRowClick: (person: PersonWithCounts) => void;

  /**
   * ID of the currently expanded person (null if none)
   * @default null
   */
  expandedPersonId?: number | null;

  /**
   * Type of the currently expanded person (null if none)
   * Used together with expandedPersonId to uniquely identify expansion state
   * @default null
   */
  expandedPersonType?: PersonType | null;

  /**
   * Whether the table is in a loading state
   * When true, displays skeleton rows instead of data
   * @default false
   */
  isLoading?: boolean;

  /**
   * Render function for expanded row content
   * Called when a row is expanded to render nested content (e.g., HealthConditionsTable)
   * @param person - The person whose row is expanded
   * @returns JSX element to render in the expanded row
   */
  renderExpandedContent?: (person: PersonWithCounts) => React.ReactNode;
}

/**
 * Props for individual row rendering
 * @internal
 */
interface PersonRowProps {
  /** The person data to render */
  person: PersonWithCounts;
  /** Whether this row is expanded */
  isExpanded: boolean;
  /** Whether this person is a special relationship */
  isSpecialRelationship: boolean;
  /** ID for the nested table element (for aria-controls) */
  nestedTableId: string;
  /** Handler for add button click */
  onAddClick: (event: React.MouseEvent<HTMLButtonElement>, person: PersonWithCounts) => void;
  /** Handler for row click */
  onRowClick: (person: PersonWithCounts) => void;
  /** Render function for expanded content */
  renderExpandedContent?: (person: PersonWithCounts) => React.ReactNode;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Generates the unique key for a row based on person type and ID
 * This ensures product owners and special relationships with the same ID
 * are rendered as separate rows without key conflicts.
 *
 * @param person - The person to generate a key for
 * @returns A unique string key combining person type and ID
 */
const getRowKey = (person: PersonWithCounts): string => {
  return `${person.personType}-${person.id}`;
};

/**
 * Generates the nested table ID for aria-controls
 * Used to link expandable rows to their expanded content.
 *
 * @param person - The person to generate the ID for
 * @returns A unique ID string for the nested table element
 */
const getNestedTableId = (person: PersonWithCounts): string => {
  return `nested-table-${person.personType}-${person.id}`;
};

// =============================================================================
// Sub-Components
// =============================================================================

/**
 * Memoized row component for individual person entries
 *
 * Renders a single row in the PersonTable with:
 * - Expand/collapse chevron indicator
 * - Person name with SR badge for special relationships
 * - Relationship type
 * - Active and inactive counts
 * - Add action button
 *
 * @param props - The row props
 * @returns A React Fragment containing the row and its nested table placeholder
 */
const PersonTableRow = React.memo<PersonRowProps>(({
  person,
  isExpanded,
  isSpecialRelationship,
  nestedTableId,
  onAddClick,
  onRowClick,
  renderExpandedContent,
}) => {
  /**
   * Handles row click event
   */
  const handleRowClick = useCallback(() => {
    onRowClick(person);
  }, [onRowClick, person]);

  /**
   * Handles keyboard events for accessibility (Enter/Space to expand)
   */
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTableRowElement>) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onRowClick(person);
      }
    },
    [onRowClick, person]
  );

  /**
   * Handles add button click with person context
   */
  const handleAddClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      onAddClick(event, person);
    },
    [onAddClick, person]
  );

  return (
    <React.Fragment>
      <tr
        className={`cursor-pointer ${
          isSpecialRelationship
            ? 'bg-purple-50 hover:bg-purple-100'
            : 'hover:bg-gray-50'
        }`}
        onClick={handleRowClick}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="row"
        aria-expanded={isExpanded}
        aria-controls={nestedTableId}
      >
        {/* Name column with expand/collapse indicator */}
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="flex items-center space-x-2">
            {/* Expand/collapse chevron with rotation transition */}
            <span
              className={`flex-shrink-0 transition-transform duration-200 ${
                isExpanded ? 'rotate-0' : ''
              }`}
              aria-hidden="true"
            >
              {isExpanded ? (
                <ChevronDownIcon className="h-4 w-4 text-gray-500" />
              ) : (
                <ChevronRightIcon className="h-4 w-4 text-gray-500" />
              )}
            </span>
            <span className="text-sm font-medium text-gray-900 truncate">
              {person.name}
            </span>
            {isSpecialRelationship && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                SR
              </span>
            )}
          </div>
        </td>

        {/* Relationship column */}
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          {person.relationship}
        </td>

        {/* Active count column */}
        <td className="px-6 py-4 whitespace-nowrap text-sm">
          <span
            className={
              person.activeCount > 0
                ? 'text-green-600 font-medium'
                : 'text-gray-400'
            }
          >
            {person.activeCount}
          </span>
        </td>

        {/* Inactive count column */}
        <td className="px-6 py-4 whitespace-nowrap text-sm">
          <span
            className={
              person.inactiveCount > 0 ? 'text-gray-600' : 'text-gray-400'
            }
          >
            {person.inactiveCount}
          </span>
        </td>

        {/* Actions column */}
        <td className="px-6 py-4 whitespace-nowrap text-sm">
          <button
            type="button"
            onClick={handleAddClick}
            aria-label={`Add health or vulnerability for ${person.name}`}
            className="inline-flex items-center p-1.5 border border-transparent rounded-md text-indigo-600 hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <PlusIcon className="h-5 w-5" aria-hidden="true" />
          </button>
        </td>
      </tr>

      {/* Nested table row - shown when expanded, used for aria-controls */}
      <tr
        id={nestedTableId}
        className={isExpanded ? '' : 'hidden'}
        aria-hidden={!isExpanded}
      >
        <td colSpan={5}>
          {isExpanded && renderExpandedContent && renderExpandedContent(person)}
        </td>
      </tr>
    </React.Fragment>
  );
});

PersonTableRow.displayName = 'PersonTableRow';

/**
 * Loading skeleton component for the PersonTable
 *
 * Renders 5 skeleton rows that mimic the structure of the actual table,
 * providing visual feedback while data is being loaded.
 *
 * @returns A table body with skeleton rows
 */
const PersonTableSkeleton: React.FC = () => {
  const skeletonRows = useMemo(() => Array.from({ length: 5 }, (_, i) => i), []);

  return (
    <tbody className="bg-white divide-y divide-gray-200" data-testid="person-table-skeleton">
      {skeletonRows.map((index) => (
        <tr key={`skeleton-row-${index}`} className="animate-pulse">
          {/* Name column skeleton */}
          <td className="px-6 py-4 whitespace-nowrap">
            <div className="flex items-center space-x-2">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-32" />
            </div>
          </td>

          {/* Relationship column skeleton */}
          <td className="px-6 py-4 whitespace-nowrap">
            <Skeleton className="h-4 w-24" />
          </td>

          {/* Active count column skeleton */}
          <td className="px-6 py-4 whitespace-nowrap">
            <Skeleton className="h-4 w-8" />
          </td>

          {/* Inactive count column skeleton */}
          <td className="px-6 py-4 whitespace-nowrap">
            <Skeleton className="h-4 w-8" />
          </td>

          {/* Actions column skeleton */}
          <td className="px-6 py-4 whitespace-nowrap">
            <Skeleton className="h-8 w-8 rounded-md" />
          </td>
        </tr>
      ))}
    </tbody>
  );
};

PersonTableSkeleton.displayName = 'PersonTableSkeleton';

// =============================================================================
// Main Component
// =============================================================================

/**
 * PersonTable displays product owners and special relationships in a table
 * with health/vulnerability counts and action buttons.
 *
 * The table supports:
 * - Expandable rows with visual indicator (chevron icon)
 * - Loading state with skeleton placeholder
 * - Special relationship highlighting with purple styling and SR badge
 * - Accessibility features including treegrid role and aria-expanded
 * - Keyboard navigation for add buttons
 *
 * @param props - The component props
 * @returns The rendered PersonTable component
 *
 * @example
 * ```tsx
 * // Standard usage with data
 * <PersonTable
 *   productOwners={[
 *     { id: 1, name: 'John Smith', relationship: 'Primary Owner', personType: 'product_owner', status: 'Active', activeCount: 3, inactiveCount: 1 }
 *   ]}
 *   specialRelationships={[
 *     { id: 10, name: 'Jane Doe', relationship: 'Spouse', personType: 'special_relationship', status: 'Active', activeCount: 1, inactiveCount: 0 }
 *   ]}
 *   onAdd={(person) => console.log('Add clicked for', person.name)}
 *   onRowClick={(person) => setExpandedPersonId(person.id)}
 *   expandedPersonId={1}
 * />
 *
 * // Loading state
 * <PersonTable
 *   productOwners={[]}
 *   specialRelationships={[]}
 *   onAdd={() => {}}
 *   onRowClick={() => {}}
 *   isLoading={true}
 * />
 *
 * // Empty state (no loading, no data)
 * <PersonTable
 *   productOwners={[]}
 *   specialRelationships={[]}
 *   onAdd={() => {}}
 *   onRowClick={() => {}}
 * />
 * ```
 */
const PersonTable: React.FC<PersonTableProps> = React.memo(({
  productOwners,
  specialRelationships,
  onAdd,
  onRowClick,
  expandedPersonId = null,
  expandedPersonType = null,
  isLoading = false,
  renderExpandedContent,
}) => {
  // Combine product owners and special relationships
  const allPeople = useMemo(
    () => [...productOwners, ...specialRelationships],
    [productOwners, specialRelationships]
  );

  /**
   * Checks if a person row is currently expanded
   * Compares both ID and personType to prevent false matches when
   * a ProductOwner and SpecialRelationship share the same ID
   */
  const isExpanded = useCallback(
    (person: PersonWithCounts): boolean => {
      return expandedPersonId === person.id && expandedPersonType === person.personType;
    },
    [expandedPersonId, expandedPersonType]
  );

  /**
   * Checks if a person is a special relationship
   */
  const isSpecialRelationship = useCallback(
    (person: PersonWithCounts): boolean => {
      return person.personType === 'special_relationship';
    },
    []
  );

  /**
   * Handles add button click with event propagation stopped
   * Prevents the row click handler from firing when the add button is clicked.
   */
  const handleAddClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>, person: PersonWithCounts): void => {
      event.stopPropagation();
      onAdd(person);
    },
    [onAdd]
  );

  /**
   * Handles row click
   */
  const handleRowClick = useCallback(
    (person: PersonWithCounts): void => {
      onRowClick(person);
    },
    [onRowClick]
  );

  // Show loading skeleton when loading
  if (isLoading) {
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200" role="treegrid">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Name
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Relationship
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Active
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Inactive
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Actions
              </th>
            </tr>
          </thead>
          <PersonTableSkeleton />
        </table>
      </div>
    );
  }

  // Empty state when no people
  if (allPeople.length === 0) {
    return (
      <EmptyState message="No people found - No product owners or special relationships in this client group" />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200" role="treegrid">
        <thead className="bg-gray-50">
          <tr>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Name
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Relationship
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Active
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Inactive
            </th>
            <th
              scope="col"
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
            >
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {allPeople.map((person) => (
            <PersonTableRow
              key={getRowKey(person)}
              person={person}
              isExpanded={isExpanded(person)}
              isSpecialRelationship={isSpecialRelationship(person)}
              nestedTableId={getNestedTableId(person)}
              onAddClick={handleAddClick}
              onRowClick={handleRowClick}
              renderExpandedContent={renderExpandedContent}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
});

PersonTable.displayName = 'PersonTable';

export default PersonTable;
