/**
 * PersonalRelationshipsTable Component (Cycle 6 - Refactored)
 *
 * Table for displaying personal relationships (family members, dependents).
 * Includes sortable columns, responsive design, and state management.
 *
 * Features:
 * - Columns: First Name, Last Name, Relationship, DOB, Age, Email, Phone, Status, Actions
 * - Sortable by: First Name, Last Name, Status, DOB
 * - Responsive: Hide Email/Phone/DOB on tablet (768-1023px)
 * - Empty/Loading/Error states
 * - Row click handling with action button prevention
 * - WCAG 2.1 AA compliant accessibility
 *
 * Refactoring improvements:
 * - Extracted shared constants to relationshipTable/constants
 * - Extracted sort logic to relationshipTable/utils
 * - Added comprehensive JSDoc comments
 * - Improved DRY principle adherence
 *
 * @component PersonalRelationshipsTable
 */

import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { TrashIcon, PauseCircleIcon, XCircleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { SpecialRelationship, RelationshipStatus } from '@/types/specialRelationship';
import TableSortHeader, { SortConfig } from '@/components/TableSortHeader';
import EmptyStatePersonal from '@/components/EmptyStatePersonal';
import SkeletonTable from '@/components/SkeletonTable';
import ErrorStateNetwork from '@/components/ErrorStateNetwork';
import { calculateAge } from '@/utils/specialRelationshipUtils';
import {
  TABLE_CLASSES,
  HEADER_CLASSES,
  CELL_CLASSES,
  ROW_CLASSES,
  ACTION_CLASSES,
  STATUS_BADGE_CLASSES,
  PRODUCT_OWNER_BADGE_CLASSES,
  COLUMN_LABELS,
  DEFAULT_SORT_CONFIG,
  EMPTY_VALUE_PLACEHOLDER,
} from '@/components/relationshipTable';
import {
  sortRelationships,
  getEffectiveSortConfig,
} from '@/components/relationshipTable';

// ==========================
// Types
// ==========================

/**
 * Props for PersonalRelationshipsTable component
 *
 * @property {SpecialRelationship[]} relationships - Array of personal relationships to display
 * @property {Function} [onRowClick] - Optional callback when row is clicked
 * @property {Function} onEdit - Callback when edit button is clicked
 * @property {Function} onDelete - Callback when delete button is clicked
 * @property {Function} onStatusChange - Callback when status changes
 * @property {Function} [onAdd] - Optional callback for add button in empty state
 * @property {boolean} [isLoading] - Loading state flag
 * @property {boolean} [isError] - Error state flag
 * @property {Error | null} [error] - Error object if applicable
 * @property {Function} [onRetry] - Optional callback for retry button in error state
 */
interface ProductOwner {
  id: number;
  firstname: string;
  surname: string;
}

interface PersonalRelationshipsTableProps {
  relationships: SpecialRelationship[];
  productOwners?: ProductOwner[];
  onRowClick?: (relationship: SpecialRelationship) => void;
  onLapse?: (relationship: SpecialRelationship) => void;
  onMakeDeceased?: (relationship: SpecialRelationship) => void;
  onReactivate?: (relationship: SpecialRelationship) => void;
  onDelete: (relationship: SpecialRelationship) => void;
  onAdd?: () => void;
  isLoading?: boolean;
  isError?: boolean;
  error?: Error | null;
  onRetry?: () => void;
}

// ==========================
// Component
// ==========================

/**
 * PersonalRelationshipsTable component displays personal relationships in a sortable table.
 * Handles loading, error, and empty states. Supports row click and action buttons.
 *
 * @param {PersonalRelationshipsTableProps} props - Component props
 * @returns {JSX.Element} Rendered table or state component
 */
const PersonalRelationshipsTable: React.FC<PersonalRelationshipsTableProps> = ({
  relationships,
  productOwners = [],
  onRowClick,
  onLapse,
  onMakeDeceased,
  onReactivate,
  onDelete,
  onAdd,
  isLoading = false,
  isError = false,
  error = null,
  onRetry,
}) => {
  // Sort state - start with no explicit sort (data will be sorted but header shows "none")
  const [sortConfig, setSortConfig] = useState<SortConfig>(DEFAULT_SORT_CONFIG);

  /**
   * Handle sort column click
   * Toggles direction if same column, otherwise starts with ascending
   *
   * @param {string} column - Column identifier to sort by
   */
  const handleSort = (column: string) => {
    setSortConfig((prev) => {
      if (prev.column === column) {
        // Toggle direction for same column
        return { column, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      } else {
        // New column, start with ascending
        return { column, direction: 'asc' };
      }
    });
  };

  /**
   * Memoized sorted relationships
   * Sort by status first (Active at top, Inactive/Deceased at bottom), then apply user sorting
   */
  const sortedRelationships = useMemo(() => {
    const effectiveSortConfig = getEffectiveSortConfig(sortConfig);
    const sorted = sortRelationships(relationships, effectiveSortConfig);

    // Sort by status: Active first, then Inactive, then Deceased
    return sorted.sort((a, b) => {
      const statusOrder = { 'Active': 0, 'Inactive': 1, 'Deceased': 2 };
      const statusA = statusOrder[a.status] ?? 0;
      const statusB = statusOrder[b.status] ?? 0;
      return statusA - statusB;
    });
  }, [relationships, sortConfig]);

  // Loading state
  if (isLoading) {
    return <SkeletonTable />;
  }

  // Error state
  if (isError) {
    return <ErrorStateNetwork onRetry={onRetry || (() => {})} />;
  }

  // Empty state
  if (relationships.length === 0) {
    return <EmptyStatePersonal onAddClick={onAdd || (() => {})} />;
  }

  return (
    <div className={TABLE_CLASSES.container}>
      <table
        className={TABLE_CLASSES.table}
        aria-label="Personal relationships table"
      >
        <thead className={TABLE_CLASSES.thead}>
          <tr>
            <TableSortHeader
              label={COLUMN_LABELS.name}
              column="name"
              sortConfig={sortConfig}
              onSort={handleSort}
            />
            <th scope="col" className={HEADER_CLASSES.base}>
              {COLUMN_LABELS.relationship}
            </th>
            <TableSortHeader
              label={COLUMN_LABELS.dateOfBirth}
              column="date_of_birth"
              sortConfig={sortConfig}
              onSort={handleSort}
            />
            <th scope="col" className={HEADER_CLASSES.base}>
              {COLUMN_LABELS.age}
            </th>
            <th scope="col" className={HEADER_CLASSES.base}>
              {COLUMN_LABELS.dependency}
            </th>
            <th scope="col" className={HEADER_CLASSES.base}>
              {COLUMN_LABELS.productOwners}
            </th>
            <th scope="col" className={HEADER_CLASSES.base}>
              {COLUMN_LABELS.contactDetails}
            </th>
            <TableSortHeader
              label={COLUMN_LABELS.status}
              column="status"
              sortConfig={sortConfig}
              onSort={handleSort}
            />
            <th scope="col" className={HEADER_CLASSES.base}>
              {COLUMN_LABELS.actions}
            </th>
          </tr>
        </thead>
        <tbody className={TABLE_CLASSES.tbody}>
          {sortedRelationships.map((relationship) => {
            const age = relationship.date_of_birth ? calculateAge(relationship.date_of_birth) : null;
            const dob = relationship.date_of_birth
              ? format(new Date(relationship.date_of_birth), 'dd/MM/yyyy')
              : EMPTY_VALUE_PLACEHOLDER;

            // Check if relationship is inactive
            const isInactive = relationship.status === 'Inactive' || relationship.status === 'Deceased';

            // Get product owners for pills
            const owners = (relationship.product_owner_ids || [])
              .map(id => productOwners.find(po => po.id === id))
              .filter(Boolean);

            // Combine contact details
            const contactDetails = [
              relationship.phone_number,
              relationship.email
            ].filter(Boolean).join(' • ') || EMPTY_VALUE_PLACEHOLDER;

            return (
              <tr
                key={relationship.id}
                onClick={() => onRowClick?.(relationship)}
                className={`${ROW_CLASSES.base} ${
                  isInactive ? 'opacity-50 grayscale-[30%]' : ''
                }`}
              >
                {/* Name */}
                <td className={CELL_CLASSES.base}>
                  {relationship.name || EMPTY_VALUE_PLACEHOLDER}
                </td>
                {/* Relationship */}
                <td className={CELL_CLASSES.base}>
                  {relationship.relationship}
                </td>
                {/* Date of Birth */}
                <td className={CELL_CLASSES.base}>
                  {dob}
                </td>
                {/* Age */}
                <td className={CELL_CLASSES.base}>
                  {age !== null ? age : EMPTY_VALUE_PLACEHOLDER}
                </td>
                {/* Dependency */}
                <td className={CELL_CLASSES.base}>
                  {relationship.dependency ? 'Yes' : 'No'}
                </td>
                {/* Product Owners (pills) */}
                <td className={CELL_CLASSES.base}>
                  <div className={PRODUCT_OWNER_BADGE_CLASSES.container}>
                    {owners.length > 0 ? (
                      owners.map((owner) => (
                        <span key={owner.id} className={PRODUCT_OWNER_BADGE_CLASSES.badge}>
                          {owner.firstname} {owner.surname}
                        </span>
                      ))
                    ) : (
                      <span>{EMPTY_VALUE_PLACEHOLDER}</span>
                    )}
                  </div>
                </td>
                {/* Contact Details */}
                <td className={CELL_CLASSES.base}>
                  {contactDetails}
                </td>
                {/* Status */}
                <td className={CELL_CLASSES.base}>
                  <span
                    className={`${STATUS_BADGE_CLASSES.base} ${
                      STATUS_BADGE_CLASSES[relationship.status]
                    }`}
                  >
                    {relationship.status}
                  </span>
                </td>
                {/* Actions */}
                <td
                  className={CELL_CLASSES.base}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className={ACTION_CLASSES.container}>
                    {isInactive ? (
                      <>
                        {onReactivate && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onReactivate(relationship);
                            }}
                            className={ACTION_CLASSES.reactivateButton}
                            aria-label={`Reactivate ${relationship.name}`}
                            title="Reactivate"
                          >
                            <ArrowPathIcon className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(relationship);
                          }}
                          className={ACTION_CLASSES.deleteButton}
                          aria-label={`Delete ${relationship.name}`}
                          title="Delete"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        {onLapse && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onLapse(relationship);
                            }}
                            className={ACTION_CLASSES.lapseButton}
                            aria-label={`Lapse ${relationship.name}`}
                            title="Lapse"
                          >
                            <PauseCircleIcon className="w-4 h-4" />
                          </button>
                        )}
                        {onMakeDeceased && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onMakeDeceased(relationship);
                            }}
                            className={ACTION_CLASSES.deceasedButton}
                            aria-label={`Mark ${relationship.name} as deceased`}
                            title="Deceased"
                          >
                            <XCircleIcon className="w-4 h-4" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default PersonalRelationshipsTable;
