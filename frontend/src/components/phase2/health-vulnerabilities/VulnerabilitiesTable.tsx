/**
 * VulnerabilitiesTable Component
 *
 * Displays vulnerabilities using Phase2Table with columns for:
 * - Description
 * - Adjustments (accommodations text)
 * - Diagnosed (Yes/No boolean display)
 * - Recorded (date formatted as dd/MM/yyyy)
 * - Status (auto-added by Phase2Table)
 * - Actions (auto-added by Phase2Table)
 *
 * Features:
 * - Lapsed vulnerabilities sorted to bottom of list
 * - Row click to edit
 * - Delete with confirmation modal
 * - Empty state display
 * - Loading skeleton state
 * - Accessible table semantics via Phase2Table
 *
 * @module components/phase2/health-vulnerabilities/VulnerabilitiesTable
 */

import React, { useState, useCallback, useMemo } from 'react';
import { format, isValid, parseISO } from 'date-fns';
import type { Vulnerability, PersonType } from '@/types/healthVulnerability';
import { DeleteIconButton, DeleteConfirmationModal } from '@/components/ui';
import Phase2Table, { ColumnDef, Phase2TableData, SortConfig } from '@/components/phase2/tables/Phase2Table';

// =============================================================================
// Types
// =============================================================================

export interface VulnerabilitiesTableProps {
  /** Array of vulnerabilities to display */
  vulnerabilities: Vulnerability[];
  /** ID of the person who owns these vulnerabilities */
  personId: number;
  /** Whether person is product_owner or special_relationship */
  personType: PersonType;
  /** Callback when row is clicked to edit */
  onRowClick?: (vulnerability: Vulnerability) => void;
  /** Callback when delete is confirmed */
  onDelete: (vulnerability: Vulnerability) => void;
  /** Loading state - show skeleton when true */
  isLoading?: boolean;
  /** Error object if data fetch failed */
  error?: Error | null;
  /** Optional callback for retry button in error state */
  onRetry?: () => void;
}

/**
 * Row data type extending Phase2TableData for vulnerabilities
 */
interface VulnerabilityRow extends Phase2TableData {
  description: string;
  adjustments: string | null;
  diagnosed: boolean;
  date_recorded: string | null;
  notes: string | null;
  created_at: string;
  /** Original vulnerability for callbacks */
  _original: Vulnerability;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Safely format a date string to dd/MM/yyyy format
 * Returns en-dash for null, undefined, or invalid dates
 */
function formatRecordedDate(dateString: string | null | undefined): string {
  if (!dateString) return '–';

  try {
    const date = parseISO(dateString);
    if (!isValid(date)) return '–';
    return format(date, 'dd/MM/yyyy');
  } catch {
    return '–';
  }
}

/**
 * Transform Vulnerability to VulnerabilityRow for Phase2Table
 */
function toTableRow(vulnerability: Vulnerability): VulnerabilityRow {
  return {
    id: vulnerability.id,
    status: vulnerability.status,
    description: vulnerability.description,
    adjustments: vulnerability.adjustments ?? null,
    diagnosed: vulnerability.diagnosed,
    date_recorded: vulnerability.date_recorded ?? null,
    notes: vulnerability.notes ?? null,
    created_at: vulnerability.created_at,
    _original: vulnerability,
  };
}

/**
 * Comparator function for sorting vulnerability rows
 * Extracts common sorting logic to avoid duplication
 */
function compareRows(
  a: VulnerabilityRow,
  b: VulnerabilityRow,
  column: string,
  multiplier: number
): number {
  let aValue: string | boolean | null = null;
  let bValue: string | boolean | null = null;

  switch (column) {
    case 'description':
      aValue = a.description;
      bValue = b.description;
      break;
    case 'diagnosed':
      aValue = a.diagnosed ? 'Yes' : 'No';
      bValue = b.diagnosed ? 'Yes' : 'No';
      break;
    case 'date_recorded':
      aValue = a.date_recorded;
      bValue = b.date_recorded;
      break;
    case 'status':
      aValue = a.status;
      bValue = b.status;
      break;
    default:
      return 0;
  }

  if (aValue == null && bValue == null) return 0;
  if (aValue == null) return 1;
  if (bValue == null) return -1;

  if (typeof aValue === 'string' && typeof bValue === 'string') {
    return aValue.localeCompare(bValue) * multiplier;
  }

  return 0;
}

// =============================================================================
// Column Definitions
// =============================================================================

/**
 * Column definitions for vulnerabilities table
 * Status and Actions are auto-added by Phase2Table
 */
const columns: ColumnDef<VulnerabilityRow>[] = [
  {
    key: 'description',
    label: 'Description',
    sortable: true,
    render: (row) => row.description,
  },
  {
    key: 'adjustments',
    label: 'Adjustments',
    sortable: false,
    render: (row) => row.adjustments || '-',
  },
  {
    key: 'diagnosed',
    label: 'Diagnosed',
    sortable: true,
    render: (row) => (row.diagnosed ? 'Yes' : 'No'),
  },
  {
    key: 'recorded',
    label: 'Recorded',
    sortable: true,
    sortKey: 'date_recorded',
    render: (row) => formatRecordedDate(row.date_recorded),
  },
];

// =============================================================================
// Main Component
// =============================================================================

/**
 * VulnerabilitiesTable Component
 *
 * Renders a table of vulnerabilities using Phase2Table with sorting,
 * row click handling, and delete functionality with confirmation modal.
 */
const VulnerabilitiesTable: React.FC<VulnerabilitiesTableProps> = ({
  vulnerabilities,
  personId,
  personType,
  onRowClick,
  onDelete,
  isLoading = false,
  error = null,
  onRetry,
}) => {
  // State for delete confirmation modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [vulnerabilityToDelete, setVulnerabilityToDelete] = useState<Vulnerability | null>(null);

  // Transform vulnerabilities to table rows (memoized for performance)
  const tableData = useMemo(() => vulnerabilities.map(toTableRow), [vulnerabilities]);

  // Handle row click - pass original vulnerability to callback
  const handleRowClick = useCallback(
    (row: VulnerabilityRow) => {
      if (onRowClick) {
        onRowClick(row._original);
      }
    },
    [onRowClick]
  );

  // Handle delete button click - open confirmation modal
  const handleDeleteClick = useCallback(
    (row: VulnerabilityRow) => {
      setVulnerabilityToDelete(row._original);
      setDeleteModalOpen(true);
    },
    []
  );

  // Handle delete confirmation
  const handleDeleteConfirm = useCallback(() => {
    if (vulnerabilityToDelete) {
      onDelete(vulnerabilityToDelete);
    }
    setDeleteModalOpen(false);
    setVulnerabilityToDelete(null);
  }, [vulnerabilityToDelete, onDelete]);

  // Handle delete cancellation
  const handleDeleteCancel = useCallback(() => {
    setDeleteModalOpen(false);
    setVulnerabilityToDelete(null);
  }, []);

  /**
   * Custom sort function to put Lapsed vulnerabilities at bottom
   * Uses extracted compareRows helper for DRY code
   */
  const customSort = useCallback(
    (data: VulnerabilityRow[], sortConfig: SortConfig | null): VulnerabilityRow[] => {
      // Separate active from lapsed
      const activeRows: VulnerabilityRow[] = [];
      const lapsedRows: VulnerabilityRow[] = [];

      data.forEach(row => {
        if (row.status.toLowerCase() === 'lapsed') {
          lapsedRows.push(row);
        } else {
          activeRows.push(row);
        }
      });

      // Apply sort if sortConfig provided
      if (sortConfig) {
        const { column, direction } = sortConfig;
        const multiplier = direction === 'asc' ? 1 : -1;
        const sorter = (a: VulnerabilityRow, b: VulnerabilityRow) =>
          compareRows(a, b, column, multiplier);

        activeRows.sort(sorter);
        lapsedRows.sort(sorter);
      }

      // Active rows first, followed by lapsed rows
      return [...activeRows, ...lapsedRows];
    },
    []
  );

  /**
   * Actions renderer for delete button
   * Aria-label includes action context for better screen reader experience
   */
  const actionsRenderer = useCallback(
    (row: VulnerabilityRow) => (
      <DeleteIconButton
        ariaLabel={`Delete vulnerability: ${row.description}`}
        onClick={() => handleDeleteClick(row)}
      />
    ),
    [handleDeleteClick]
  );

  return (
    <>
      <Phase2Table<VulnerabilityRow>
        data={tableData}
        columns={columns}
        isLoading={isLoading}
        error={error}
        onRetry={onRetry}
        onRowClick={handleRowClick}
        actionsRenderer={actionsRenderer}
        onSort={customSort}
        ariaLabel="Vulnerabilities table"
        emptyMessage="No vulnerabilities recorded"
        emptySubMessage="Add a vulnerability to get started"
      />

      {/* Delete Confirmation Modal - only render when there's a vulnerability to delete */}
      {vulnerabilityToDelete && (
        <DeleteConfirmationModal
          isOpen={deleteModalOpen}
          onCancel={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
          entityType="Vulnerability"
          entityName={vulnerabilityToDelete.description}
        />
      )}
    </>
  );
};

export default VulnerabilitiesTable;
