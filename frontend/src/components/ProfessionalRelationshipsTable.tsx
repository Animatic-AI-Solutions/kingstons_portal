/**
 * ProfessionalRelationshipsTable Component (Cycle 6 - Refactored)
 *
 * Table for displaying professional relationships (accountants, solicitors, advisors).
 * Includes sortable columns, responsive design, and state management.
 *
 * Features:
 * - Columns: First Name, Last Name, Relationship, Company, Position, Email, Phone, Status, Actions
 * - Sortable by: First Name, Last Name, Company, Position, Status
 * - Responsive: Hide Email/Phone on tablet (768-1023px)
 * - Empty/Loading/Error states
 * - Product owner count display
 * - Row click handling with action button prevention
 * - WCAG 2.1 AA compliant accessibility
 *
 * Refactoring improvements:
 * - Extracted shared constants to relationshipTable/constants
 * - Extracted sort logic to relationshipTable/utils
 * - Added comprehensive JSDoc comments
 * - Improved DRY principle adherence
 *
 * @component ProfessionalRelationshipsTable
 */

import React, { useState, useMemo } from 'react';
import { Edit2, Trash2 } from 'lucide-react';
import { SpecialRelationship, RelationshipStatus } from '@/types/specialRelationship';
import TableSortHeader, { SortConfig } from '@/components/TableSortHeader';
import EmptyStateProfessional from '@/components/EmptyStateProfessional';
import SkeletonTable from '@/components/SkeletonTable';
import ErrorStateServer from '@/components/ErrorStateServer';
import {
  TABLE_CLASSES,
  HEADER_CLASSES,
  CELL_CLASSES,
  ROW_CLASSES,
  ACTION_CLASSES,
  STATUS_BADGE_CLASSES,
  COLUMN_LABELS,
  DEFAULT_SORT_CONFIG,
  EMPTY_VALUE_PLACEHOLDER,
} from '@/components/relationshipTable';
import {
  sortRelationships,
  getEffectiveSortConfig,
  formatPhoneNumber,
  formatProductOwnerCount,
} from '@/components/relationshipTable';

// ==========================
// Types
// ==========================

/**
 * Props for ProfessionalRelationshipsTable component
 *
 * @property {SpecialRelationship[]} relationships - Array of professional relationships to display
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
interface ProfessionalRelationshipsTableProps {
  relationships: SpecialRelationship[];
  onRowClick?: (relationship: SpecialRelationship) => void;
  onEdit: (relationship: SpecialRelationship) => void;
  onDelete: (relationship: SpecialRelationship) => void;
  onStatusChange: (id: string, status: RelationshipStatus) => void;
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
 * ProfessionalRelationshipsTable component displays professional relationships in a sortable table.
 * Handles loading, error, and empty states. Supports row click, action buttons, and product owner counts.
 *
 * @param {ProfessionalRelationshipsTableProps} props - Component props
 * @returns {JSX.Element} Rendered table or state component
 */
const ProfessionalRelationshipsTable: React.FC<ProfessionalRelationshipsTableProps> = ({
  relationships,
  onRowClick,
  onEdit,
  onDelete,
  onStatusChange,
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
   * Applies effective sort config (defaults to first_name asc)
   */
  const sortedRelationships = useMemo(() => {
    const effectiveSortConfig = getEffectiveSortConfig(sortConfig);
    return sortRelationships(relationships, effectiveSortConfig);
  }, [relationships, sortConfig]);

  // Loading state
  if (isLoading) {
    return <SkeletonTable />;
  }

  // Error state
  if (isError) {
    return <ErrorStateServer onRetry={onRetry || (() => {})} />;
  }

  // Empty state
  if (relationships.length === 0) {
    return <EmptyStateProfessional onAddClick={onAdd || (() => {})} />;
  }

  return (
    <div className={TABLE_CLASSES.container}>
      <table
        className={TABLE_CLASSES.table}
        aria-label="Professional relationships table"
      >
        <thead className={TABLE_CLASSES.thead}>
          <tr>
            <TableSortHeader
              label={COLUMN_LABELS.firstName}
              column="first_name"
              sortConfig={sortConfig}
              onSort={handleSort}
            />
            <TableSortHeader
              label={COLUMN_LABELS.lastName}
              column="last_name"
              sortConfig={sortConfig}
              onSort={handleSort}
            />
            <th scope="col" className={HEADER_CLASSES.base}>
              {COLUMN_LABELS.relationship}
            </th>
            <TableSortHeader
              label={COLUMN_LABELS.company}
              column="company_name"
              sortConfig={sortConfig}
              onSort={handleSort}
            />
            <TableSortHeader
              label={COLUMN_LABELS.position}
              column="position"
              sortConfig={sortConfig}
              onSort={handleSort}
            />
            <th
              scope="col"
              className={`${HEADER_CLASSES.base} ${HEADER_CLASSES.hiddenOnTablet}`}
            >
              {COLUMN_LABELS.email}
            </th>
            <th
              scope="col"
              className={`${HEADER_CLASSES.base} ${HEADER_CLASSES.hiddenOnTablet}`}
            >
              {COLUMN_LABELS.phone}
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
            const phone = formatPhoneNumber(relationship);
            const productOwnerCount = (relationship as any).product_owner_count;

            return (
              <tr
                key={relationship.id}
                onClick={() => onRowClick?.(relationship)}
                className={ROW_CLASSES.base}
              >
                <td className={CELL_CLASSES.base}>
                  {relationship.first_name || EMPTY_VALUE_PLACEHOLDER}
                </td>
                <td className={CELL_CLASSES.base}>
                  {relationship.last_name || EMPTY_VALUE_PLACEHOLDER}
                  {productOwnerCount !== undefined && (
                    <div className="text-xs text-gray-500 mt-1">
                      {formatProductOwnerCount(productOwnerCount)}
                    </div>
                  )}
                </td>
                <td className={CELL_CLASSES.base}>
                  {relationship.relationship_type}
                </td>
                <td className={CELL_CLASSES.base}>
                  {relationship.company_name || EMPTY_VALUE_PLACEHOLDER}
                </td>
                <td className={CELL_CLASSES.base}>
                  {relationship.position || EMPTY_VALUE_PLACEHOLDER}
                </td>
                <td className={CELL_CLASSES.hiddenOnTablet}>
                  {relationship.email || EMPTY_VALUE_PLACEHOLDER}
                </td>
                <td className={CELL_CLASSES.hiddenOnTablet}>
                  {phone}
                </td>
                <td className={CELL_CLASSES.base}>
                  <span
                    className={`${STATUS_BADGE_CLASSES.base} ${
                      STATUS_BADGE_CLASSES[relationship.status]
                    }`}
                  >
                    {relationship.status}
                  </span>
                </td>
                <td
                  className={CELL_CLASSES.base}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className={ACTION_CLASSES.container}>
                    <button
                      onClick={() => onEdit(relationship)}
                      className={ACTION_CLASSES.editButton}
                      aria-label={`Edit ${relationship.first_name} ${relationship.last_name}`}
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => onDelete(relationship)}
                      className={ACTION_CLASSES.deleteButton}
                      aria-label={`Delete ${relationship.first_name} ${relationship.last_name}`}
                    >
                      <Trash2 size={16} />
                    </button>
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

export default ProfessionalRelationshipsTable;
