/**
 * TableSortHeader Component (Cycle 6 - Refactored)
 *
 * Reusable sortable table header with WCAG 2.1 AA compliant accessibility.
 * Supports click and keyboard navigation (Enter/Space) for sorting.
 *
 * Features:
 * - ARIA attributes: aria-sort on th element, aria-label on button
 * - Keyboard support: Enter/Space to sort
 * - Visual indicator: arrow up/down
 * - Sort state management via props
 *
 * Accessibility improvements:
 * - aria-sort moved to th element (correct ARIA pattern)
 * - Button remains focusable for keyboard navigation
 *
 * @component TableSortHeader
 */

import React from 'react';

// ==========================
// Types
// ==========================

/**
 * Sort configuration for table columns
 *
 * @property {string} column - Column identifier being sorted
 * @property {'asc' | 'desc'} direction - Sort direction
 */
export interface SortConfig {
  column: string;
  direction: 'asc' | 'desc';
}

/**
 * Props for TableSortHeader component
 *
 * @property {string} label - Display label for the column header
 * @property {string} column - Column identifier for sorting
 * @property {SortConfig} sortConfig - Current sort state
 * @property {Function} onSort - Callback when header is clicked
 * @property {string} [className] - Optional additional CSS classes for the th element
 */
interface TableSortHeaderProps {
  label: string;
  column: string;
  sortConfig: SortConfig;
  onSort: (column: string) => void;
  className?: string;
}

// ==========================
// Component
// ==========================

/**
 * TableSortHeader component renders a sortable table header cell.
 * Provides accessible sorting controls with visual and screen reader feedback.
 *
 * @param {TableSortHeaderProps} props - Component props
 * @returns {JSX.Element} Rendered th element with sort button
 *
 * @example
 * ```tsx
 * <TableSortHeader
 *   label="First Name"
 *   column="first_name"
 *   sortConfig={{ column: 'first_name', direction: 'asc' }}
 *   onSort={handleSort}
 * />
 * ```
 */
const TableSortHeader: React.FC<TableSortHeaderProps> = ({
  label,
  column,
  sortConfig,
  onSort,
  className = '',
}) => {
  // Determine if this column is currently sorted
  const isSorted = sortConfig.column === column;
  const direction = isSorted ? sortConfig.direction : null;

  /**
   * Determine aria-sort value for accessibility
   * - "ascending" when sorted A-Z
   * - "descending" when sorted Z-A
   * - "none" when not sorted
   */
  const ariaSort = isSorted
    ? direction === 'asc'
      ? ('ascending' as const)
      : ('descending' as const)
    : ('none' as const);

  /**
   * Generate accessible label describing current state and next action
   * Helps screen reader users understand sort status and how to change it
   */
  const ariaLabel = isSorted
    ? `${label}, sorted ${direction === 'asc' ? 'ascending' : 'descending'}. Click to sort ${direction === 'asc' ? 'descending' : 'ascending'}.`
    : `${label}, not sorted. Sort by ${label}.`;

  /**
   * Handle sort button click
   * Calls parent onSort callback to update sort state
   */
  const handleClick = () => {
    onSort(column);
  };

  return (
    <th
      scope="col"
      aria-sort={ariaSort}
      className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${className}`}
    >
      <button
        type="button"
        onClick={handleClick}
        aria-label={ariaLabel}
        tabIndex={0}
        className="flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded"
      >
        <span>{label}</span>
        {isSorted && (
          <span aria-hidden="true" className="text-gray-700">
            {direction === 'asc' ? '↑' : '↓'}
          </span>
        )}
      </button>
    </th>
  );
};

export default TableSortHeader;
