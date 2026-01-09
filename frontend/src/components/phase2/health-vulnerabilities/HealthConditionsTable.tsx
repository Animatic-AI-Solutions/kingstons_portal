/**
 * HealthConditionsTable Component
 *
 * Displays health conditions using Phase2Table with columns for:
 * - Condition type
 * - Name (descriptive name)
 * - Diagnosed date (formatted as dd/MM/yyyy)
 * - Medication/Dosage
 * - Status (auto-added by Phase2Table)
 * - Actions (auto-added by Phase2Table)
 *
 * Features:
 * - Smoking Status conditions sorted to top of list
 * - Row click to edit
 * - Delete with confirmation modal
 * - Empty state display
 * - Loading skeleton state
 * - Accessible table semantics via Phase2Table
 *
 * @module components/phase2/health-vulnerabilities/HealthConditionsTable
 */

import React, { useState, useCallback, useMemo } from 'react';
import { format, isValid, parseISO } from 'date-fns';
import type { HealthCondition, PersonType } from '@/types/healthVulnerability';
import { isSmokingCondition } from '@/types/healthVulnerability';
import { DeleteIconButton, DeleteConfirmationModal } from '@/components/ui';
import Phase2Table, { ColumnDef, Phase2TableData, SortConfig } from '@/components/phase2/tables/Phase2Table';

// =============================================================================
// Types
// =============================================================================

export interface HealthConditionsTableProps {
  /** Array of health conditions to display */
  conditions: HealthCondition[];
  /** ID of the person who owns these conditions */
  personId: number;
  /** Whether person is product_owner or special_relationship */
  personType: PersonType;
  /** Callback when row is clicked to edit */
  onRowClick?: (condition: HealthCondition) => void;
  /** Callback when delete is confirmed */
  onDelete: (condition: HealthCondition) => void;
  /** Loading state - show skeleton when true */
  isLoading?: boolean;
  /** Error object if data fetch failed */
  error?: Error | null;
  /** Optional callback for retry button in error state */
  onRetry?: () => void;
}

/**
 * Row data type extending Phase2TableData for health conditions
 */
interface HealthConditionRow extends Phase2TableData {
  condition: string;
  name: string | null;
  date_of_diagnosis: string | null;
  medication: string | null;
  notes: string | null;
  created_at: string;
  date_recorded: string | null;
  /** Original health condition for callbacks */
  _original: HealthCondition;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Safely format a date string to dd/MM/yyyy format
 * Returns en-dash for null, undefined, or invalid dates
 */
function formatDiagnosisDate(dateString: string | null | undefined): string {
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
 * Transform HealthCondition to HealthConditionRow for Phase2Table
 */
function toTableRow(condition: HealthCondition): HealthConditionRow {
  return {
    id: condition.id,
    status: condition.status,
    condition: condition.condition,
    name: condition.name ?? null,
    date_of_diagnosis: condition.date_of_diagnosis ?? null,
    medication: condition.medication ?? null,
    notes: condition.notes ?? null,
    created_at: condition.created_at,
    date_recorded: condition.date_recorded ?? null,
    _original: condition,
  };
}

// =============================================================================
// Column Definitions
// =============================================================================

/**
 * Column definitions for health conditions table
 * Status and Actions are auto-added by Phase2Table
 */
const columns: ColumnDef<HealthConditionRow>[] = [
  {
    key: 'condition',
    label: 'Condition',
    sortable: true,
    render: (row) => row.condition,
  },
  {
    key: 'name',
    label: 'Name',
    sortable: true,
    render: (row) => row.name || '-',
  },
  {
    key: 'diagnosed',
    label: 'Diagnosed',
    sortable: true,
    sortKey: 'date_of_diagnosis',
    render: (row) => formatDiagnosisDate(row.date_of_diagnosis),
  },
  {
    key: 'medication',
    label: 'Medication/Dosage',
    sortable: false,
    render: (row) => row.medication || '-',
  },
];

// =============================================================================
// Main Component
// =============================================================================

/**
 * HealthConditionsTable Component
 *
 * Renders a table of health conditions using Phase2Table with sorting,
 * row click handling, and delete functionality with confirmation modal.
 */
const HealthConditionsTable: React.FC<HealthConditionsTableProps> = ({
  conditions,
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
  const [conditionToDelete, setConditionToDelete] = useState<HealthCondition | null>(null);

  // Transform conditions to table rows (memoized for performance)
  const tableData = useMemo(() => conditions.map(toTableRow), [conditions]);

  // Handle row click - pass original condition to callback
  const handleRowClick = useCallback(
    (row: HealthConditionRow) => {
      if (onRowClick) {
        onRowClick(row._original);
      }
    },
    [onRowClick]
  );

  // Handle delete button click - open confirmation modal
  const handleDeleteClick = useCallback(
    (row: HealthConditionRow) => {
      setConditionToDelete(row._original);
      setDeleteModalOpen(true);
    },
    []
  );

  // Handle delete confirmation
  const handleDeleteConfirm = useCallback(() => {
    if (conditionToDelete) {
      onDelete(conditionToDelete);
    }
    setDeleteModalOpen(false);
    setConditionToDelete(null);
  }, [conditionToDelete, onDelete]);

  // Handle delete cancellation
  const handleDeleteCancel = useCallback(() => {
    setDeleteModalOpen(false);
    setConditionToDelete(null);
  }, []);

  /**
   * Custom sort function to put Smoking Status conditions at top
   */
  const customSort = useCallback(
    (data: HealthConditionRow[], sortConfig: SortConfig | null): HealthConditionRow[] => {
      // First separate smoking conditions from others
      const smokingRows: HealthConditionRow[] = [];
      const nonSmokingRows: HealthConditionRow[] = [];

      data.forEach(row => {
        if (isSmokingCondition(row._original)) {
          smokingRows.push(row);
        } else {
          nonSmokingRows.push(row);
        }
      });

      // Apply sort to non-smoking rows if sortConfig provided
      if (sortConfig) {
        const { column, direction } = sortConfig;
        const multiplier = direction === 'asc' ? 1 : -1;

        nonSmokingRows.sort((a, b) => {
          let aValue: string | null = null;
          let bValue: string | null = null;

          switch (column) {
            case 'condition':
              aValue = a.condition;
              bValue = b.condition;
              break;
            case 'name':
              aValue = a.name;
              bValue = b.name;
              break;
            case 'date_of_diagnosis':
              aValue = a.date_of_diagnosis;
              bValue = b.date_of_diagnosis;
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

          return aValue.localeCompare(bValue) * multiplier;
        });
      }

      // Smoking conditions always at top, followed by sorted non-smoking conditions
      return [...smokingRows, ...nonSmokingRows];
    },
    []
  );

  /**
   * Actions renderer for delete button
   */
  const actionsRenderer = useCallback(
    (row: HealthConditionRow) => (
      <DeleteIconButton
        ariaLabel={`Delete ${row.name || row.condition} condition`}
        onClick={() => handleDeleteClick(row)}
      />
    ),
    [handleDeleteClick]
  );

  return (
    <>
      <Phase2Table<HealthConditionRow>
        data={tableData}
        columns={columns}
        isLoading={isLoading}
        error={error}
        onRetry={onRetry}
        onRowClick={handleRowClick}
        actionsRenderer={actionsRenderer}
        onSort={customSort}
        ariaLabel="Health conditions table"
        emptyMessage="No health conditions recorded"
        emptySubMessage="Add a health condition to get started"
      />

      {/* Delete Confirmation Modal - only render when there's a condition to delete */}
      {conditionToDelete && (
        <DeleteConfirmationModal
          isOpen={deleteModalOpen}
          onCancel={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
          entityType="Health Condition"
          entityName={conditionToDelete.name || conditionToDelete.condition}
        />
      )}
    </>
  );
};

export default HealthConditionsTable;
