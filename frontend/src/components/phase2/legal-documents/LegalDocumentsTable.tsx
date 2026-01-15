/**
 * LegalDocumentsTable Component
 *
 * Table component for displaying legal documents with columns:
 * Type, People, Date, Status, Actions.
 *
 * Features:
 * - Sorts lapsed documents to bottom with opacity-50 styling
 * - Product owner names displayed as pill badges
 * - Date formatting as dd/MM/yyyy
 * - Status-based action buttons (Lapse, Reactivate, Delete)
 * - Loading, error, and empty states
 * - Keyboard navigation support (Enter on rows)
 * - ARIA live region for status announcements
 * - WCAG 2.1 AA accessibility compliant
 *
 * Refactored to use Phase2Table component for consistency.
 *
 * @module components/phase2/legal-documents/LegalDocumentsTable
 */

import React, { useMemo, useCallback, memo } from 'react';
import { format, parseISO, isValid } from 'date-fns';

import { Phase2Table } from '../tables';
import type { ColumnDef, SortConfig } from '../tables/Phase2Table';
import {
  LapseIconButton,
  ReactivateIconButton,
  DeleteIconButton,
  AddButton,
} from '@/components/ui';
import type { LegalDocument } from '@/types/legalDocument';
import { isDocumentLapsed } from '@/types/legalDocument';
import type { ProductOwner } from '@/types/productOwner';

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * Extended LegalDocument type for Phase2Table compatibility
 * Phase2Table requires id and status fields on the data type
 */
interface LegalDocumentTableData extends LegalDocument {
  id: number;
  status: string;
}

export interface LegalDocumentsTableProps {
  /** Array of legal documents to display */
  documents: LegalDocument[];
  /** Product owners for displaying names in People column */
  productOwners?: ProductOwner[];
  /** Callback when a row is clicked (for editing) */
  onRowClick?: (document: LegalDocument) => void;
  /** Callback for lapsing a document (Signed/Registered only) */
  onLapse?: (document: LegalDocument) => void;
  /** Callback for reactivating a lapsed document */
  onReactivate?: (document: LegalDocument) => void;
  /** Callback for deleting a document (required) */
  onDelete: (document: LegalDocument) => void;
  /** Callback for adding a new document */
  onAdd?: () => void;
  /** Loading state flag */
  isLoading?: boolean;
  /** Error object if data fetch failed */
  error?: Error | null;
  /** Callback for retry button in error state */
  onRetry?: () => void;
  /** Status announcement for ARIA live region */
  statusAnnouncement?: string;
  /** Document ID currently having a status change operation (shows loading indicator) */
  pendingStatusDocumentId?: number | null;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Format a document date to dd/MM/yyyy format (e.g., "15/01/2024")
 * Returns '-' for null or invalid dates
 */
const formatDocumentDate = (dateString: string | null): string => {
  if (!dateString) {
    return '-';
  }

  try {
    const parsedDate = parseISO(dateString);
    if (!isValid(parsedDate)) {
      return '-';
    }
    return format(parsedDate, 'dd/MM/yyyy');
  } catch {
    return '-';
  }
};

/**
 * Sort documents with lapsed at bottom, preserving relative order
 */
const sortDocumentsWithLapsedAtBottom = (
  documents: LegalDocument[],
  _sortConfig: SortConfig | null
): LegalDocument[] => {
  // For legal documents, we always keep lapsed at bottom and don't apply column sorting
  // This is the custom sort behavior for this table
  const active = documents.filter((doc) => doc.status !== 'Lapsed');
  const lapsed = documents.filter((doc) => doc.status === 'Lapsed');
  return [...active, ...lapsed];
};

/**
 * Create a Map of product owner ID to ProductOwner for O(1) lookup
 */
const createOwnerMap = (productOwners: ProductOwner[] | undefined): Map<number, ProductOwner> => {
  const map = new Map<number, ProductOwner>();
  productOwners?.forEach(owner => map.set(owner.id, owner));
  return map;
};

/**
 * Get product owner name from the owner map
 */
const getOwnerNameFromMap = (ownerId: number, ownerMap: Map<number, ProductOwner>): string | null => {
  const owner = ownerMap.get(ownerId);
  if (!owner) return null;
  return `${owner.firstname} ${owner.surname}`;
};

// =============================================================================
// Memoized Sub-Components
// =============================================================================

/**
 * Product Owner Pill Badge
 */
interface OwnerPillProps {
  name: string;
}

const OwnerPill = memo(({ name }: OwnerPillProps) => (
  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 mr-1 mb-0.5">
    {name}
  </span>
));

OwnerPill.displayName = 'OwnerPill';

/**
 * Product Owners Cell
 */
interface OwnersCellProps {
  productOwnerIds: number[];
  ownerMap: Map<number, ProductOwner>;
}

const OwnersCell = memo(({ productOwnerIds, ownerMap }: OwnersCellProps) => {
  // Create array of [id, name] pairs for stable keys
  const ownerEntries = productOwnerIds
    .map((id) => ({ id, name: getOwnerNameFromMap(id, ownerMap) }))
    .filter((entry): entry is { id: number; name: string } => entry.name !== null);

  if (ownerEntries.length === 0) {
    return <span className="text-gray-400">-</span>;
  }

  return (
    <div className="flex flex-wrap justify-center">
      {ownerEntries.map(({ id, name }) => (
        <OwnerPill key={id} name={name} />
      ))}
    </div>
  );
});

OwnersCell.displayName = 'OwnersCell';

// =============================================================================
// Main Component
// =============================================================================

/**
 * LegalDocumentsTable Component
 *
 * Displays legal documents in a table with Type, People, Date, Status, and Actions columns.
 * Lapsed documents are sorted to the bottom and displayed with reduced opacity.
 *
 * Uses Phase2Table for consistent table rendering across Phase 2 features.
 */
const LegalDocumentsTable: React.FC<LegalDocumentsTableProps> = ({
  documents,
  productOwners,
  onRowClick,
  onLapse,
  onReactivate,
  onDelete,
  onAdd,
  isLoading = false,
  error = null,
  onRetry,
  statusAnnouncement,
  pendingStatusDocumentId = null,
}) => {
  // Create owner map for O(1) lookup instead of O(n) .find() calls
  const ownerMap = useMemo(
    () => createOwnerMap(productOwners),
    [productOwners]
  );

  // Define column configurations for Phase2Table
  const columns: ColumnDef<LegalDocumentTableData>[] = useMemo(() => [
    {
      key: 'type',
      label: 'Type',
      sortable: false,
      render: (row) => row.type,
    },
    {
      key: 'people',
      label: 'People',
      sortable: false,
      render: (row) => (
        <OwnersCell productOwnerIds={row.product_owner_ids} ownerMap={ownerMap} />
      ),
    },
    {
      key: 'date',
      label: 'Date',
      sortable: false,
      render: (row) => formatDocumentDate(row.document_date),
    },
  ], [ownerMap]);

  // Custom sort function that keeps Lapsed documents at bottom
  const handleSort = useCallback((data: LegalDocumentTableData[], sortConfig: SortConfig | null) => {
    return sortDocumentsWithLapsedAtBottom(data as LegalDocument[], sortConfig) as LegalDocumentTableData[];
  }, []);

  // Custom inactive check - Lapsed documents are greyed out
  const checkIsRowInactive = useCallback((row: LegalDocumentTableData) => {
    return row.status === 'Lapsed';
  }, []);

  // Handle row click - convert back to LegalDocument type
  const handleRowClick = useCallback((row: LegalDocumentTableData) => {
    onRowClick?.(row as LegalDocument);
  }, [onRowClick]);

  // Actions renderer for Phase2Table
  const actionsRenderer = useCallback((row: LegalDocumentTableData) => {
    const document = row as LegalDocument;
    const docIsLapsed = isDocumentLapsed(document);
    const isRowPending = pendingStatusDocumentId === document.id;

    const handleLapse = (e: React.MouseEvent) => {
      e.stopPropagation();
      onLapse?.(document);
    };

    const handleReactivate = (e: React.MouseEvent) => {
      e.stopPropagation();
      onReactivate?.(document);
    };

    const handleDelete = (e: React.MouseEvent) => {
      e.stopPropagation();
      onDelete(document);
    };

    // Show loading spinner when status change is in progress for this row
    if (isRowPending) {
      return (
        <div
          className="flex items-center justify-center"
          role="status"
          aria-label="Status change in progress"
        >
          <svg
            className="animate-spin h-5 w-5 text-primary-600"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </div>
      );
    }

    if (docIsLapsed) {
      // Lapsed: Show Reactivate + Delete buttons, NO Lapse button
      return (
        <>
          {onReactivate && (
            <ReactivateIconButton
              onClick={handleReactivate}
              ariaLabel={`Reactivate ${document.type} document`}
              title={`Reactivate ${document.type} document`}
            />
          )}
          <DeleteIconButton
            onClick={handleDelete}
            ariaLabel={`Delete ${document.type} document`}
            title={`Delete ${document.type} document`}
          />
        </>
      );
    }

    // Signed/Registered: Show Lapse button only
    return (
      <>
        {onLapse && (
          <LapseIconButton
            onClick={handleLapse}
            ariaLabel={`Lapse ${document.type} document`}
            title={`Lapse ${document.type} document`}
          />
        )}
      </>
    );
  }, [onLapse, onReactivate, onDelete, pendingStatusDocumentId]);

  return (
    <>
      {/* ARIA live region for status announcements (Phase2Table doesn't have this) */}
      <div role="status" aria-live="polite" className="sr-only">
        {statusAnnouncement}
      </div>

      {/* Custom Add button with specific aria-label to match integration tests */}
      {onAdd && (
        <div className="mb-2 flex justify-end">
          <AddButton
            onClick={onAdd}
            design="minimal"
            size="sm"
            aria-label="Add Legal Document"
          />
        </div>
      )}

      <Phase2Table<LegalDocumentTableData>
        data={documents as LegalDocumentTableData[]}
        columns={columns}
        isLoading={isLoading}
        error={error}
        onRetry={onRetry}
        onRowClick={onRowClick ? handleRowClick : undefined}
        actionsRenderer={actionsRenderer}
        ariaLabel="Legal documents table"
        emptyMessage="No Legal Documents"
        emptySubMessage="No documents have been added yet. Add a document to get started."
        onSort={handleSort}
        isRowInactive={checkIsRowInactive}
      />
    </>
  );
};

export default LegalDocumentsTable;
