/**
 * SortableColumnHeader Component
 *
 * Interactive table header that provides sorting functionality with visual indicators.
 * Clicking cycles through sort states: none → asc → desc → none
 *
 * Features:
 * - Visual sort indicators (up/down arrows)
 * - Click cycling through sort states
 * - ARIA attributes for accessibility
 * - Full keyboard support (Tab, Enter, Space)
 * - Responsive styling with Tailwind CSS
 * - Focus management with visible focus rings
 *
 * Keyboard Navigation:
 * - Tab: Navigate between sortable column headers (standard browser behavior)
 * - Shift+Tab: Navigate backwards through headers
 * - Enter: Activate sorting on focused header (cycle through states)
 * - Space: Activate sorting on focused header (cycle through states)
 * - Escape: Return focus to table (standard browser behavior)
 *
 * Sort State Cycling:
 * - First activation: Sort ascending (↑)
 * - Second activation: Sort descending (↓)
 * - Third activation: Clear sort (return to unsorted state)
 * - Activating different column: Starts at ascending
 *
 * Accessibility Features:
 * - Semantic button element with proper type="button"
 * - aria-sort attribute announces current sort state to screen readers
 * - aria-label provides descriptive context including next action
 * - Visible focus ring (2px primary-500) for keyboard users
 * - Focus offset prevents overlap with surrounding elements
 * - Visual indicators (arrows) marked aria-hidden to avoid duplication
 *
 * @module components/SortableColumnHeader
 */

import React from 'react';

/**
 * Sort Configuration Interface
 * Matches the interface from sortProductOwners utility
 */
export interface SortConfig {
  column: 'name' | 'relationship' | 'age' | 'dob' | 'email' | 'status';
  direction: 'asc' | 'desc';
}

/**
 * Sort direction constants for improved type safety
 */
const SORT_ASCENDING = 'asc' as const;
const SORT_DESCENDING = 'desc' as const;

/**
 * ARIA sort attribute values for screen reader announcements
 */
const ARIA_SORT_ASCENDING = 'ascending' as const;
const ARIA_SORT_DESCENDING = 'descending' as const;
const ARIA_SORT_NONE = 'none' as const;

/**
 * Visual indicators for sort direction
 * Using Unicode arrows for lightweight rendering without icon libraries
 */
const SORT_INDICATOR_ASCENDING = '↑';
const SORT_INDICATOR_DESCENDING = '↓';

/**
 * Keyboard event key constants
 */
const KEY_ENTER = 'Enter';
const KEY_SPACE = ' ';

/**
 * SortableColumnHeader Props
 *
 * @property column - The column identifier this header represents
 * @property label - Display text for the column header
 * @property currentSort - Current sort configuration (null if no sorting active)
 * @property onSort - Callback function when sort state changes
 */
interface SortableColumnHeaderProps {
  /** Column identifier for this header */
  column: SortConfig['column'];
  /** Display text for the column header */
  label: string;
  /** Current sort configuration (null if no sorting) */
  currentSort: SortConfig | null;
  /** Callback when sort state changes (receives column and direction/null) */
  onSort: (column: SortConfig['column'], direction: 'asc' | 'desc' | null) => void;
}

/**
 * SortableColumnHeader Component
 *
 * Renders an interactive table header with sorting capabilities.
 *
 * Behavior:
 * - First click: Sets to ascending
 * - Second click: Sets to descending
 * - Third click: Clears sort (returns to none)
 * - Clicking different column: Starts at ascending
 *
 * Visual Indicators:
 * - Unsorted: No arrow, neutral styling
 * - Ascending: Up arrow (↑), highlighted
 * - Descending: Down arrow (↓), highlighted
 *
 * Accessibility:
 * - Rendered as semantic button element
 * - aria-sort attribute for screen readers
 * - Keyboard support (Enter and Space keys)
 * - Descriptive aria-label with current state
 *
 * @param props - Component props
 * @returns Interactive table header button
 */
const SortableColumnHeader: React.FC<SortableColumnHeaderProps> = ({
  column,
  label,
  currentSort,
  onSort,
}) => {
  /**
   * Determine if this column is currently sorted
   */
  const isSorted = currentSort?.column === column;

  /**
   * Get current sort direction for this column
   */
  const direction = isSorted ? currentSort.direction : null;

  /**
   * Determine ARIA sort attribute value for screen readers
   *
   * Maps internal sort state to ARIA-compliant attribute values:
   * - 'ascending': Column sorted A-Z, 0-9, oldest-newest
   * - 'descending': Column sorted Z-A, 9-0, newest-oldest
   * - 'none': Column not currently sorted
   */
  const ariaSortValue = isSorted
    ? direction === SORT_ASCENDING
      ? ARIA_SORT_ASCENDING
      : ARIA_SORT_DESCENDING
    : ARIA_SORT_NONE;

  /**
   * Handle click to cycle through sort states
   *
   * Sort State Cycle (3-state toggle):
   * 1. none → asc (First click: sort ascending)
   * 2. asc → desc (Second click: sort descending)
   * 3. desc → none (Third click: clear sort, return to original order)
   * 4. Different column → asc (Clicking new column starts at ascending)
   *
   * Business Rule: This cycling allows users to quickly toggle between
   * common sort orders without needing multiple UI controls.
   */
  const handleClick = () => {
    if (!isSorted) {
      // First click on unsorted column: set to ascending
      onSort(column, SORT_ASCENDING);
    } else if (direction === SORT_ASCENDING) {
      // Second click: change to descending
      onSort(column, SORT_DESCENDING);
    } else {
      // Third click: clear sort (return to unsorted state)
      onSort(column, null);
    }
  };

  /**
   * Handle keyboard activation (Enter and Space keys)
   *
   * Accessibility Requirement: Buttons must respond to both Enter and Space.
   * - Enter: Standard button activation
   * - Space: Alternative button activation (common for screen reader users)
   *
   * preventDefault() prevents page scroll on Space key activation.
   *
   * @param event - Keyboard event from React synthetic event system
   */
  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === KEY_ENTER || event.key === KEY_SPACE) {
      event.preventDefault(); // Prevent page scroll on Space
      handleClick();
    }
  };

  /**
   * Generate descriptive aria-label for accessibility
   *
   * Provides screen reader users with:
   * 1. Column name
   * 2. Current sort state
   * 3. What will happen on next activation
   *
   * Example outputs:
   * - "Name, not sorted. Click to sort ascending"
   * - "Age, sorted ascending. Click to sort descending"
   * - "Email, sorted descending. Click to clear sort"
   */
  const ariaLabel = isSorted
    ? `${label}, sorted ${direction === SORT_ASCENDING ? 'ascending' : 'descending'}. Click to ${
        direction === SORT_ASCENDING ? 'sort descending' : 'clear sort'
      }`
    : `${label}, not sorted. Click to sort ascending`;

  /**
   * Get visual sort indicator (arrow)
   *
   * Returns appropriate Unicode arrow based on sort direction.
   * Only shown when column is actively sorted.
   */
  const sortIndicator = direction === SORT_ASCENDING
    ? SORT_INDICATOR_ASCENDING
    : SORT_INDICATOR_DESCENDING;

  return (
    <th
      scope="col"
      aria-sort={ariaSortValue}
      className="text-center text-sm font-bold text-gray-900 uppercase tracking-wider p-0"
    >
      <button
        type="button"
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        aria-label={ariaLabel}
        className={`
          flex items-center justify-center gap-1
          w-full text-center
          px-2 py-1
          min-w-[44px]
          hover:text-gray-700
          focus:outline-none
          focus:ring-2
          focus:ring-primary-500
          focus:ring-offset-2
          rounded
          transition-colors
          leading-tight
          ${isSorted ? 'font-bold' : ''}
        `}
      >
        <span>{label}</span>

        {/* Sort Direction Indicator - Visual only, hidden from screen readers */}
        {isSorted && (
          <span className="text-primary-600" aria-hidden="true">
            {sortIndicator}
          </span>
        )}
      </button>
    </th>
  );
};

export default SortableColumnHeader;
