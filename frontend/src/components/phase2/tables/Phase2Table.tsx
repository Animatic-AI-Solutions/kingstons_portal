/**
 * Phase2Table Component
 *
 * Reusable table component for Phase 2 client group tabs based on ProductOwnerTable pattern.
 * Always includes Status and Actions columns with configurable custom columns.
 *
 * Features:
 * - Configurable columns via column definitions
 * - Always includes Status (badge) and Actions columns
 * - Sortable columns with SortableColumnHeader
 * - Memoized row rendering for performance
 * - Loading, error, and empty states
 * - Click-to-edit row functionality
 * - Optional Add button
 * - Inactive row styling (greyed out for lapsed/deceased status)
 * - WCAG 2.1 AA accessibility compliant
 *
 * @module components/phase2/tables/Phase2Table
 */

import React, { useMemo, memo, useCallback, useState, ReactNode } from 'react';
import { StatusBadge, SortableColumnHeader, AddButton } from '../../ui';

/**
 * Column Definition Interface
 *
 * Defines the structure and behavior of a table column
 */
export interface ColumnDef<T> {
  /** Unique key for the column */
  key: string;
  /** Display label for column header */
  label: string;
  /** Whether this column is sortable */
  sortable?: boolean;
  /** Function to render cell value from row data */
  render: (row: T) => ReactNode;
  /** Optional CSS classes for the column */
  className?: string;
  /** Optional sort key if different from column key */
  sortKey?: string;
}

/**
 * Sort Configuration Interface
 */
export interface SortConfig {
  column: string;
  direction: 'asc' | 'desc';
}

/**
 * Base data interface that all table data must extend
 * Requires id, status for core functionality
 */
export interface Phase2TableData {
  id: number;
  status: string;
}

/**
 * Actions Renderer Props
 * Function signature for rendering custom actions in the Actions column
 */
export type ActionsRenderer<T> = (row: T, onRefetch?: () => void) => ReactNode;

/**
 * Phase2Table Props Interface
 */
export interface Phase2TableProps<T extends Phase2TableData> {
  /** Array of data rows to display */
  data: T[];
  /** Column definitions (excludes Status and Actions which are auto-added) */
  columns: ColumnDef<T>[];
  /** Loading state flag */
  isLoading: boolean;
  /** Error object if data fetch failed */
  error: Error | null;
  /** Optional callback for retry button in error state */
  onRetry?: () => void;
  /** Optional callback for data refresh */
  onRefetch?: () => void;
  /** Optional callback when row is clicked (for edit) */
  onRowClick?: (row: T) => void;
  /** Custom actions renderer for Actions column */
  actionsRenderer?: ActionsRenderer<T>;
  /** Optional Add button config */
  addButton?: {
    label: string;
    onClick: () => void;
  };
  /** Table aria-label for accessibility */
  ariaLabel?: string;
  /** Empty state message */
  emptyMessage?: string;
  /** Empty state sub-message */
  emptySubMessage?: string;
  /** Optional callback for announcing actions to screen readers */
  onAnnounce?: (message: string) => void;
  /** Optional custom sort function */
  onSort?: (data: T[], sortConfig: SortConfig | null) => T[];
}

/**
 * Check if a row is inactive (lapsed or deceased status)
 */
const isInactive = (status: string): boolean => {
  const normalizedStatus = status.toLowerCase();
  return normalizedStatus === 'lapsed' || normalizedStatus === 'deceased';
};

/**
 * Default sort function - sorts alphabetically/numerically
 */
function defaultSort<T extends Phase2TableData>(
  data: T[],
  sortConfig: SortConfig | null,
  columns: ColumnDef<T>[]
): T[] {
  if (!sortConfig) {
    // Default: inactive at bottom
    return [...data].sort((a, b) => {
      const aInactive = isInactive(a.status);
      const bInactive = isInactive(b.status);
      if (aInactive && !bInactive) return 1;
      if (!aInactive && bInactive) return -1;
      return 0;
    });
  }

  const { column, direction } = sortConfig;

  return [...data].sort((a, b) => {
    // Always put inactive rows at bottom
    const aInactive = isInactive(a.status);
    const bInactive = isInactive(b.status);
    if (aInactive && !bInactive) return 1;
    if (!aInactive && bInactive) return -1;

    // Special handling for status column
    if (column === 'status') {
      const comparison = a.status.localeCompare(b.status);
      return direction === 'asc' ? comparison : -comparison;
    }

    // Find column definition
    const colDef = columns.find(col => col.key === column || col.sortKey === column);
    if (!colDef) return 0;

    // Extract values using render function
    const aValue = colDef.render(a);
    const bValue = colDef.render(b);

    // Handle null/undefined
    if (aValue == null && bValue == null) return 0;
    if (aValue == null) return 1;
    if (bValue == null) return -1;

    // Compare values
    let comparison = 0;
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      comparison = aValue.localeCompare(bValue);
    } else if (typeof aValue === 'number' && typeof bValue === 'number') {
      comparison = aValue - bValue;
    } else {
      comparison = String(aValue).localeCompare(String(bValue));
    }

    return direction === 'asc' ? comparison : -comparison;
  });
}

/**
 * Memoized Table Row Component
 */
interface TableRowProps<T extends Phase2TableData> {
  row: T;
  columns: ColumnDef<T>[];
  onRowClick?: (row: T) => void;
  actionsRenderer?: ActionsRenderer<T>;
  onRefetch?: () => void;
}

const TableRow = memo(<T extends Phase2TableData>({
  row,
  columns,
  onRowClick,
  actionsRenderer,
  onRefetch,
}: TableRowProps<T>) => {
  const inactive = isInactive(row.status);

  return (
    <tr
      onClick={() => onRowClick?.(row)}
      className={`hover:bg-gray-50 ${onRowClick ? 'cursor-pointer' : ''} transition-colors ${
        inactive ? 'opacity-50 grayscale-[30%]' : ''
      }`}
      data-testid={`table-row-${row.id}`}
    >
      {/* Custom Columns */}
      {columns.map((col) => (
        <td
          key={col.key}
          className={`px-2 py-0.5 whitespace-nowrap text-center text-base ${
            col.className || 'text-gray-900'
          }`}
        >
          {col.render(row)}
        </td>
      ))}

      {/* Status Column - Always included */}
      <td className="px-2 py-0.5 whitespace-nowrap text-center text-base">
        <StatusBadge status={row.status} />
      </td>

      {/* Actions Column - Always included */}
      <td className="px-2 py-0.5 whitespace-nowrap text-center text-base">
        <div
          className="flex items-center justify-center gap-0.5"
          onClick={(e) => e.stopPropagation()}
        >
          {actionsRenderer ? actionsRenderer(row, onRefetch) : null}
        </div>
      </td>
    </tr>
  );
}) as <T extends Phase2TableData>(props: TableRowProps<T>) => JSX.Element;

TableRow.displayName = 'TableRow';

/**
 * Table Header Component
 */
interface TableHeaderProps<T extends Phase2TableData> {
  columns: ColumnDef<T>[];
  sortConfig: SortConfig | null;
  onSort: (column: string, direction: 'asc' | 'desc' | null) => void;
}

const TableHeader = memo(<T extends Phase2TableData>({
  columns,
  sortConfig,
  onSort,
}: TableHeaderProps<T>) => {
  return (
    <thead className="bg-gray-50">
      <tr>
        {/* Custom Columns */}
        {columns.map((col) => {
          if (col.sortable !== false) {
            return (
              <SortableColumnHeader
                key={col.key}
                column={col.sortKey || col.key}
                label={col.label}
                currentSort={sortConfig}
                onSort={onSort}
              />
            );
          }

          return (
            <th
              key={col.key}
              scope="col"
              aria-sort="none"
              className="text-center text-sm font-bold text-gray-900 uppercase tracking-wider p-0"
            >
              <div className="px-2 py-1 leading-tight">{col.label}</div>
            </th>
          );
        })}

        {/* Status Column - Always sortable */}
        <SortableColumnHeader
          column="status"
          label="Status"
          currentSort={sortConfig}
          onSort={onSort}
        />

        {/* Actions Column - Not sortable */}
        <th
          scope="col"
          aria-sort="none"
          className="text-center text-sm font-bold text-gray-900 uppercase tracking-wider p-0"
        >
          <div className="px-2 py-1 leading-tight">Actions</div>
        </th>
      </tr>
    </thead>
  );
}) as <T extends Phase2TableData>(props: TableHeaderProps<T>) => JSX.Element;

TableHeader.displayName = 'TableHeader';

/**
 * Phase2Table Main Component
 */
function Phase2Table<T extends Phase2TableData>({
  data,
  columns,
  isLoading,
  error,
  onRetry,
  onRefetch,
  onRowClick,
  actionsRenderer,
  addButton,
  ariaLabel = 'Data table',
  emptyMessage = 'No items found',
  emptySubMessage = 'Add your first item to get started',
  onAnnounce,
  onSort: customSort,
}: Phase2TableProps<T>) {
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);

  /**
   * Handle sort state changes
   */
  const handleSort = useCallback(
    (column: string, direction: 'asc' | 'desc' | null) => {
      if (direction === null) {
        setSortConfig(null);
        if (onAnnounce) {
          onAnnounce('Sorting cleared');
          setTimeout(() => onAnnounce(''), 3000);
        }
      } else {
        setSortConfig({ column, direction });
        if (onAnnounce) {
          const directionText = direction === 'asc' ? 'ascending' : 'descending';
          onAnnounce(`Sorted by ${column} ${directionText}`);
          setTimeout(() => onAnnounce(''), 3000);
        }
      }
    },
    [onAnnounce]
  );

  /**
   * Memoize sorted data
   */
  const sortedData = useMemo(() => {
    if (customSort) {
      return customSort(data, sortConfig);
    }
    return defaultSort(data, sortConfig, columns);
  }, [data, sortConfig, columns, customSort]);

  /**
   * LOADING STATE
   */
  if (isLoading) {
    return (
      <>
        {addButton && (
          <div className="mb-4 flex justify-end">
            <AddButton
              onClick={addButton.onClick}
              context={addButton.label}
              design="balanced"
              size="md"
            />
          </div>
        )}

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200" role="table" aria-label={ariaLabel} aria-busy="true">
            <TableHeader columns={columns} sortConfig={sortConfig} onSort={handleSort} />
          </table>
          <div data-testid="table-skeleton" className="p-8" aria-live="polite" aria-busy="true">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              <div className="h-4 bg-gray-200 rounded w-4/5"></div>
            </div>
            <span className="sr-only">Loading data</span>
          </div>
        </div>
      </>
    );
  }

  /**
   * ERROR STATE
   */
  if (error) {
    return (
      <>
        {addButton && (
          <div className="mb-4 flex justify-end">
            <AddButton
              onClick={addButton.onClick}
              context={addButton.label}
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
            <h3 className="mt-4 text-lg font-medium text-gray-900">Error Loading Data</h3>
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
      </>
    );
  }

  /**
   * EMPTY STATE
   */
  if (data.length === 0) {
    return (
      <>
        {addButton && (
          <div className="mb-4 flex justify-end">
            <AddButton
              onClick={addButton.onClick}
              context={addButton.label}
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
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">{emptyMessage}</h3>
            <p className="mt-2 text-sm text-gray-500">{emptySubMessage}</p>
          </div>
        </div>
      </>
    );
  }

  /**
   * DATA STATE - Main table
   */
  return (
    <>
      {addButton && (
        <div className="mb-2 flex justify-end">
          <AddButton
            onClick={addButton.onClick}
            context={addButton.label}
            design="balanced"
            size="sm"
            aria-label={`Add new ${addButton.label}`}
          />
        </div>
      )}

      <div className="bg-white rounded-lg shadow border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200" role="table" aria-label={ariaLabel}>
            <caption className="sr-only">
              {data.length} item{data.length !== 1 ? 's' : ''}
            </caption>
            <TableHeader columns={columns} sortConfig={sortConfig} onSort={handleSort} />
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedData.map((row) => (
                <TableRow
                  key={row.id}
                  row={row}
                  columns={columns}
                  onRowClick={onRowClick}
                  actionsRenderer={actionsRenderer}
                  onRefetch={onRefetch}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

export default Phase2Table;
