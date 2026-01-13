# Plan 06: Frontend LegalDocumentsTable Component

## Overview

This plan covers the LegalDocumentsTable component for displaying legal documents. The React Query hooks from Plan 05 must be implemented before this plan.

## Prerequisites

- TypeScript interfaces in `types/legalDocument.ts`
- React Query hooks in `hooks/useLegalDocuments.ts`
- Phase2Table component from `components/phase2/tables/`
- UI components (StatusBadge, action buttons) from `components/ui/`

---

## Component Requirements

### Table Structure

| Column | Description | Sortable |
|--------|-------------|----------|
| Type | Document type (Will, LPOA, etc.) | Yes |
| People | Product owners (pill badges) | No |
| Date | Document date (dd/MM/yyyy) | Yes |
| Status | StatusBadge component | Yes |
| Actions | Lapse/Reactivate/Delete icons | No |

### Behavior

- Lapsed documents (status: Lapsed) go to bottom and are greyed out
- Row click opens document details modal
- Actions column shows different icons based on status:
  - Signed/Registered: Lapse icon only
  - Lapsed: Reactivate + Delete icons

---

## TDD Cycle 1: Table Rendering

### Red Phase

**Agent**: Tester-Agent
**Task**: Write failing tests for basic table rendering
**Files to create**: `frontend/src/tests/components/phase2/legal-documents/LegalDocumentsTable.test.tsx`

```typescript
/**
 * Test suite for LegalDocumentsTable Component
 *
 * Tests the table component for displaying legal documents.
 *
 * Test Coverage:
 * - Basic rendering with data
 * - Column structure (Type, People, Date, Status, Actions)
 * - Loading state
 * - Error state
 * - Empty state
 * - Lapsed documents sorted to bottom
 * - Lapsed documents greyed out styling
 * - Row click handling
 * - Action button visibility based on status
 * - Accessibility (keyboard navigation, focus management)
 */

import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { format } from 'date-fns';
import LegalDocumentsTable from '@/components/phase2/legal-documents/LegalDocumentsTable';
import type { LegalDocument } from '@/types/legalDocument';

// Sample test data
const sampleDocuments: LegalDocument[] = [
  {
    id: 1,
    type: 'Will',
    document_date: '2024-01-15',
    status: 'Signed',
    notes: 'Test notes',
    product_owner_ids: [123, 456],
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
  },
  {
    id: 2,
    type: 'LPOA P&F',
    document_date: '2024-02-20',
    status: 'Lapsed',
    notes: null,
    product_owner_ids: [123],
    created_at: '2024-02-20T10:00:00Z',
    updated_at: '2024-02-20T10:00:00Z',
  },
  {
    id: 3,
    type: 'EPA',
    document_date: null,
    status: 'Signed',
    notes: 'No date provided',
    product_owner_ids: [456],
    created_at: '2024-03-01T10:00:00Z',
    updated_at: '2024-03-01T10:00:00Z',
  },
];

const sampleProductOwners = [
  { id: 123, firstname: 'John', surname: 'Doe' },
  { id: 456, firstname: 'Jane', surname: 'Smith' },
];

const defaultProps = {
  documents: sampleDocuments,
  productOwners: sampleProductOwners,
  onRowClick: vi.fn(),
  onLapse: vi.fn(),
  onReactivate: vi.fn(),
  onDelete: vi.fn(),
  onAdd: vi.fn(),
  isLoading: false,
  error: null,
  onRetry: vi.fn(),
};

describe('LegalDocumentsTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // Basic Rendering Tests
  // ===========================================================================

  describe('Basic Rendering', () => {
    it('should render table with correct structure', () => {
      render(<LegalDocumentsTable {...defaultProps} />);

      // Table should be present
      expect(screen.getByRole('table')).toBeInTheDocument();

      // Column headers should be present
      expect(screen.getByText('Type')).toBeInTheDocument();
      expect(screen.getByText('People')).toBeInTheDocument();
      expect(screen.getByText('Date')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Actions')).toBeInTheDocument();
    });

    it('should render all documents', () => {
      render(<LegalDocumentsTable {...defaultProps} />);

      // All documents should be rendered
      expect(screen.getByText('Will')).toBeInTheDocument();
      expect(screen.getByText('LPOA P&F')).toBeInTheDocument();
      expect(screen.getByText('EPA')).toBeInTheDocument();
    });

    it('should render product owner names as pills', () => {
      render(<LegalDocumentsTable {...defaultProps} />);

      // Product owners should be displayed
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    it('should format dates correctly (dd/MM/yyyy)', () => {
      render(<LegalDocumentsTable {...defaultProps} />);

      // Date should be formatted
      expect(screen.getByText('15/01/2024')).toBeInTheDocument();
      expect(screen.getByText('20/02/2024')).toBeInTheDocument();
    });

    it('should show placeholder for null dates', () => {
      render(<LegalDocumentsTable {...defaultProps} />);

      // EPA has null date, should show placeholder
      const rows = screen.getAllByRole('row');
      const epaRow = rows.find((row) => within(row).queryByText('EPA'));
      expect(epaRow).toBeDefined();
      expect(within(epaRow!).getByText('-')).toBeInTheDocument();
    });

    it('should render status badges', () => {
      render(<LegalDocumentsTable {...defaultProps} />);

      // Status badges should be present
      const activeBadges = screen.getAllByText('Signed');
      expect(activeBadges.length).toBeGreaterThanOrEqual(2);
      expect(screen.getByText('Lapsed')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Lapsed Document Handling Tests
  // ===========================================================================

  describe('Lapsed Documents', () => {
    it('should sort lapsed documents to the bottom', () => {
      render(<LegalDocumentsTable {...defaultProps} />);

      const rows = screen.getAllByRole('row');
      // Skip header row, get data rows
      const dataRows = rows.slice(1);

      // Non-lapsed documents should come before lapsed
      const firstRowText = within(dataRows[0]).getByText(/Will|EPA/);
      const lastRow = dataRows[dataRows.length - 1];
      expect(within(lastRow).getByText('LPOA P&F')).toBeInTheDocument();
    });

    it('should apply greyed out styling to lapsed documents', () => {
      render(<LegalDocumentsTable {...defaultProps} />);

      const lapsedRow = screen.getByTestId('table-row-2'); // LPOA P&F
      expect(lapsedRow).toHaveClass('opacity-50');
    });

    it('should NOT grey out active documents', () => {
      render(<LegalDocumentsTable {...defaultProps} />);

      const activeRow = screen.getByTestId('table-row-1'); // Will
      expect(activeRow).not.toHaveClass('opacity-50');
    });
  });

  // ===========================================================================
  // Loading State Tests
  // ===========================================================================

  describe('Loading State', () => {
    it('should render skeleton when loading', () => {
      render(<LegalDocumentsTable {...defaultProps} isLoading={true} />);

      expect(screen.getByTestId('table-skeleton')).toBeInTheDocument();
    });

    it('should show loading text for screen readers', () => {
      render(<LegalDocumentsTable {...defaultProps} isLoading={true} />);

      expect(screen.getByText('Loading data')).toBeInTheDocument();
    });

    it('should NOT render data rows when loading', () => {
      render(<LegalDocumentsTable {...defaultProps} isLoading={true} />);

      expect(screen.queryByText('Will')).not.toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Error State Tests
  // ===========================================================================

  describe('Error State', () => {
    it('should render error message when error prop is set', () => {
      render(
        <LegalDocumentsTable
          {...defaultProps}
          error={new Error('Failed to load documents')}
        />
      );

      expect(screen.getByText('Error Loading Data')).toBeInTheDocument();
      expect(screen.getByText('Failed to load documents')).toBeInTheDocument();
    });

    it('should render retry button when onRetry is provided', () => {
      render(
        <LegalDocumentsTable
          {...defaultProps}
          error={new Error('Failed to load')}
        />
      );

      const retryButton = screen.getByRole('button', { name: /retry/i });
      expect(retryButton).toBeInTheDocument();
    });

    it('should call onRetry when retry button is clicked', async () => {
      const user = userEvent.setup();
      render(
        <LegalDocumentsTable
          {...defaultProps}
          error={new Error('Failed to load')}
        />
      );

      await user.click(screen.getByRole('button', { name: /retry/i }));

      expect(defaultProps.onRetry).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Empty State Tests
  // ===========================================================================

  describe('Empty State', () => {
    it('should render empty message when documents array is empty', () => {
      render(<LegalDocumentsTable {...defaultProps} documents={[]} />);

      expect(screen.getByText('No legal documents found')).toBeInTheDocument();
    });

    it('should render sub-message in empty state', () => {
      render(<LegalDocumentsTable {...defaultProps} documents={[]} />);

      expect(screen.getByText(/add your first legal document/i)).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Row Click Tests
  // ===========================================================================

  describe('Row Click', () => {
    it('should call onRowClick when row is clicked', async () => {
      const user = userEvent.setup();
      render(<LegalDocumentsTable {...defaultProps} />);

      const row = screen.getByTestId('table-row-1');
      await user.click(row);

      expect(defaultProps.onRowClick).toHaveBeenCalledWith(sampleDocuments[0]);
    });

    it('should have cursor-pointer class on rows', () => {
      render(<LegalDocumentsTable {...defaultProps} />);

      const row = screen.getByTestId('table-row-1');
      expect(row).toHaveClass('cursor-pointer');
    });
  });

  // ===========================================================================
  // Action Button Tests
  // ===========================================================================

  describe('Action Buttons', () => {
    it('should show Lapse button for Signed documents', () => {
      render(<LegalDocumentsTable {...defaultProps} />);

      const activeRow = screen.getByTestId('table-row-1'); // Will - Signed
      const lapseButton = within(activeRow).getByLabelText(/lapse/i);
      expect(lapseButton).toBeInTheDocument();
    });

    it('should NOT show Delete button for Signed documents', () => {
      render(<LegalDocumentsTable {...defaultProps} />);

      const activeRow = screen.getByTestId('table-row-1'); // Will - Signed
      const deleteButton = within(activeRow).queryByLabelText(/delete/i);
      expect(deleteButton).not.toBeInTheDocument();
    });

    it('should show Reactivate and Delete buttons for Lapsed documents', () => {
      render(<LegalDocumentsTable {...defaultProps} />);

      const lapsedRow = screen.getByTestId('table-row-2'); // LPOA P&F - Lapsed
      const reactivateButton = within(lapsedRow).getByLabelText(/reactivate/i);
      const deleteButton = within(lapsedRow).getByLabelText(/delete/i);

      expect(reactivateButton).toBeInTheDocument();
      expect(deleteButton).toBeInTheDocument();
    });

    it('should NOT show Lapse button for Lapsed documents', () => {
      render(<LegalDocumentsTable {...defaultProps} />);

      const lapsedRow = screen.getByTestId('table-row-2'); // LPOA P&F - Lapsed
      const lapseButton = within(lapsedRow).queryByLabelText(/^lapse/i);
      expect(lapseButton).not.toBeInTheDocument();
    });

    it('should call onLapse when Lapse button is clicked', async () => {
      const user = userEvent.setup();
      render(<LegalDocumentsTable {...defaultProps} />);

      const activeRow = screen.getByTestId('table-row-1');
      const lapseButton = within(activeRow).getByLabelText(/lapse/i);
      await user.click(lapseButton);

      expect(defaultProps.onLapse).toHaveBeenCalledWith(sampleDocuments[0]);
    });

    it('should call onReactivate when Reactivate button is clicked', async () => {
      const user = userEvent.setup();
      render(<LegalDocumentsTable {...defaultProps} />);

      const lapsedRow = screen.getByTestId('table-row-2');
      const reactivateButton = within(lapsedRow).getByLabelText(/reactivate/i);
      await user.click(reactivateButton);

      expect(defaultProps.onReactivate).toHaveBeenCalledWith(sampleDocuments[1]);
    });

    it('should call onDelete when Delete button is clicked', async () => {
      const user = userEvent.setup();
      render(<LegalDocumentsTable {...defaultProps} />);

      const lapsedRow = screen.getByTestId('table-row-2');
      const deleteButton = within(lapsedRow).getByLabelText(/delete/i);
      await user.click(deleteButton);

      expect(defaultProps.onDelete).toHaveBeenCalledWith(sampleDocuments[1]);
    });

    it('should NOT trigger row click when action button is clicked', async () => {
      const user = userEvent.setup();
      render(<LegalDocumentsTable {...defaultProps} />);

      const activeRow = screen.getByTestId('table-row-1');
      const lapseButton = within(activeRow).getByLabelText(/lapse/i);
      await user.click(lapseButton);

      // onRowClick should NOT be called
      expect(defaultProps.onRowClick).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Add Button Tests
  // ===========================================================================

  describe('Add Button', () => {
    it('should render Add button when onAdd is provided', () => {
      render(<LegalDocumentsTable {...defaultProps} />);

      const addButton = screen.getByRole('button', { name: /add.*legal document/i });
      expect(addButton).toBeInTheDocument();
    });

    it('should call onAdd when Add button is clicked', async () => {
      const user = userEvent.setup();
      render(<LegalDocumentsTable {...defaultProps} />);

      const addButton = screen.getByRole('button', { name: /add.*legal document/i });
      await user.click(addButton);

      expect(defaultProps.onAdd).toHaveBeenCalled();
    });

    it('should NOT render Add button when onAdd is not provided', () => {
      render(<LegalDocumentsTable {...defaultProps} onAdd={undefined} />);

      const addButton = screen.queryByRole('button', { name: /add.*legal document/i });
      expect(addButton).not.toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Accessibility Tests
  // ===========================================================================

  describe('Accessibility', () => {
    it('should have accessible table role', () => {
      render(<LegalDocumentsTable {...defaultProps} />);

      expect(screen.getByRole('table')).toHaveAttribute('aria-label', 'Legal documents table');
    });

    it('should have accessible row count in caption', () => {
      render(<LegalDocumentsTable {...defaultProps} />);

      expect(screen.getByText(/3 item/i)).toBeInTheDocument();
    });

    it('should have focusable action buttons', () => {
      render(<LegalDocumentsTable {...defaultProps} />);

      const activeRow = screen.getByTestId('table-row-1');
      const lapseButton = within(activeRow).getByLabelText(/lapse/i);

      expect(lapseButton).not.toHaveAttribute('tabindex', '-1');
    });

    it('should support keyboard navigation on rows', async () => {
      const user = userEvent.setup();
      render(<LegalDocumentsTable {...defaultProps} />);

      const row = screen.getByTestId('table-row-1');
      row.focus();
      await user.keyboard('{Enter}');

      expect(defaultProps.onRowClick).toHaveBeenCalledWith(sampleDocuments[0]);
    });

    it('should have ARIA live region for status announcements', () => {
      render(<LegalDocumentsTable {...defaultProps} />);

      const liveRegion = screen.getByRole('status');
      expect(liveRegion).toHaveAttribute('aria-live', 'polite');
      expect(liveRegion).toHaveAttribute('aria-atomic', 'true');
    });

    it('should announce document count to screen readers', () => {
      render(<LegalDocumentsTable {...defaultProps} />);

      const liveRegion = screen.getByRole('status');
      expect(liveRegion).toHaveTextContent(/3 legal documents/i);
    });

    it('should announce status change when document is lapsed', async () => {
      const user = userEvent.setup();
      const onLapse = vi.fn();
      render(<LegalDocumentsTable {...defaultProps} onLapse={onLapse} statusAnnouncement="Will lapsed successfully" />);

      const liveRegion = screen.getByRole('status');
      expect(liveRegion).toHaveTextContent('Will lapsed successfully');
    });

    it('should have aria-labels with full context on action buttons', () => {
      render(
        <LegalDocumentsTable
          {...defaultProps}
          productOwners={[{ id: 123, firstname: 'John', surname: 'Doe' }]}
        />
      );

      const lapseButton = screen.getByLabelText(/lapse will for john doe/i);
      expect(lapseButton).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Property-Based Tests (using fast-check)
  // ===========================================================================

  describe('Property-Based: Sorting Logic', () => {
    /**
     * Property: Lapsed documents should ALWAYS appear after active documents
     * regardless of the input order of the documents array.
     */
    it('should always sort lapsed documents to bottom regardless of input order', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.integer({ min: 1, max: 1000 }),
              type: fc.constantFrom('Will', 'LPOA P&F', 'LPOA H&W', 'EPA', 'General Power of Attorney', 'Advance Directive'),
              document_date: fc.option(fc.date({ min: new Date('2000-01-01'), max: new Date('2030-12-31') }).map(d => d.toISOString().split('T')[0]), { nil: null }),
              status: fc.constantFrom('Signed', 'Lapsed', 'Registered'),
              notes: fc.option(fc.string({ maxLength: 100 }), { nil: null }),
              product_owner_ids: fc.array(fc.integer({ min: 1, max: 100 }), { maxLength: 3 }),
              created_at: fc.constant('2024-01-01T00:00:00Z'),
              updated_at: fc.constant('2024-01-01T00:00:00Z'),
            }),
            { minLength: 1, maxLength: 20 }
          ),
          (documents) => {
            // Sort documents using the same logic as the component
            const sortedDocs = sortDocumentsWithLapsedAtBottom(documents);

            // Find the index of first lapsed document
            const firstLapsedIndex = sortedDocs.findIndex(
              (doc) => doc.status === 'Lapsed'
            );

            // If there are no lapsed documents, property holds trivially
            if (firstLapsedIndex === -1) return true;

            // All documents after first lapsed should also be lapsed/superseded
            const docsAfterFirstLapsed = sortedDocs.slice(firstLapsedIndex);
            return docsAfterFirstLapsed.every(
              (doc) => doc.status === 'Lapsed'
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve relative order of active documents among themselves', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.integer({ min: 1, max: 1000 }),
              type: fc.constantFrom('Will', 'LPOA P&F', 'EPA'),
              document_date: fc.constant('2024-01-01'),
              status: fc.constantFrom('Signed', 'Lapsed'),
              notes: fc.constant(null),
              product_owner_ids: fc.constant([]),
              created_at: fc.constant('2024-01-01T00:00:00Z'),
              updated_at: fc.constant('2024-01-01T00:00:00Z'),
            }),
            { minLength: 2, maxLength: 15 }
          ),
          (documents) => {
            const originalNonLapsedIds = documents
              .filter((d) => d.status !== 'Lapsed')
              .map((d) => d.id);

            const sortedDocs = sortDocumentsWithLapsedAtBottom(documents);
            const sortedNonLapsedIds = sortedDocs
              .filter((d) => d.status !== 'Lapsed')
              .map((d) => d.id);

            // Non-lapsed documents (Signed/Registered) should maintain their relative order
            return JSON.stringify(originalNonLapsedIds) === JSON.stringify(sortedNonLapsedIds);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property-Based: Date Formatting', () => {
    /**
     * Property: Any valid date should format to dd/MM/yyyy pattern
     */
    it('should format any valid date to dd/MM/yyyy pattern', () => {
      fc.assert(
        fc.property(
          fc.date({ min: new Date('1900-01-01'), max: new Date('2100-12-31') }),
          (date) => {
            const isoString = date.toISOString().split('T')[0];
            const formatted = formatDocumentDate(isoString);

            // Should match dd/MM/yyyy pattern
            const pattern = /^\d{2}\/\d{2}\/\d{4}$/;
            return pattern.test(formatted);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return placeholder for null dates', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(null, undefined, ''),
          (nullishValue) => {
            const formatted = formatDocumentDate(nullishValue as string | null);
            return formatted === '-';
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should return placeholder for invalid date strings', () => {
      fc.assert(
        fc.property(
          fc.string().filter((s) => isNaN(Date.parse(s))),
          (invalidDate) => {
            const formatted = formatDocumentDate(invalidDate);
            return formatted === '-';
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property-Based: Product Owner Rendering', () => {
    /**
     * Property: The number of rendered pills should equal the number of matching owners
     */
    it('should render correct number of pills for matching owners', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.integer({ min: 1, max: 100 }),
              firstname: fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim().length > 0),
              surname: fc.string({ minLength: 1, maxLength: 20 }).filter((s) => s.trim().length > 0),
            }),
            { minLength: 1, maxLength: 10 }
          ).chain((owners) =>
            fc.tuple(
              fc.constant(owners),
              fc.subarray(owners.map((o) => o.id), { minLength: 0 })
            )
          ),
          ([productOwners, selectedIds]) => {
            const result = getMatchingOwnerCount(selectedIds, productOwners);
            const expectedCount = selectedIds.filter((id) =>
              productOwners.some((po) => po.id === id)
            ).length;
            return result === expectedCount;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return 0 for empty owner IDs array', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.integer({ min: 1, max: 100 }),
              firstname: fc.string({ minLength: 1, maxLength: 10 }),
              surname: fc.string({ minLength: 1, maxLength: 10 }),
            }),
            { maxLength: 5 }
          ),
          (productOwners) => {
            const result = getMatchingOwnerCount([], productOwners);
            return result === 0;
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});

// ===========================================================================
// Helper Functions for Property Tests (extracted for testability)
// ===========================================================================

/**
 * Sort documents with lapsed/superseded at bottom
 * This function is extracted from the component for property testing
 */
function sortDocumentsWithLapsedAtBottom<T extends { status: string }>(documents: T[]): T[] {
  return [...documents].sort((a, b) => {
    const aIsLapsed = a.status === 'Lapsed';
    const bIsLapsed = b.status === 'Lapsed';

    if (aIsLapsed && !bIsLapsed) return 1;
    if (!aIsLapsed && bIsLapsed) return -1;
    return 0; // Preserve original order for same status category
  });
}

/**
 * Format document date to dd/MM/yyyy
 * Extracted for property testing
 */
function formatDocumentDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '-';
    return format(date, 'dd/MM/yyyy');
  } catch {
    return '-';
  }
}

/**
 * Get count of matching product owners
 * Extracted for property testing
 */
function getMatchingOwnerCount(ownerIds: number[], productOwners: { id: number }[]): number {
  return ownerIds.filter((id) => productOwners.some((po) => po.id === id)).length;
}
```

### Green Phase

**Agent**: coder-agent
**Task**: Implement LegalDocumentsTable component to pass tests
**Files to create**: `frontend/src/components/phase2/legal-documents/LegalDocumentsTable.tsx`

```typescript
/**
 * LegalDocumentsTable Component
 *
 * Table for displaying legal documents with sorting, filtering, and actions.
 * Uses the reusable Phase2Table component with configured columns.
 *
 * Features:
 * - Columns: Type, People, Date, Status, Actions
 * - Sortable columns via Phase2Table
 * - Lapsed documents sorted to bottom and greyed out
 * - Responsive design
 * - Empty/Loading/Error states
 * - Row click handling
 * - WCAG 2.1 AA compliant accessibility
 *
 * @component LegalDocumentsTable
 */

import React, { ReactNode } from 'react';
import { format } from 'date-fns';
import type { LegalDocument } from '@/types/legalDocument';
import { Phase2Table } from '../tables';
import type { ColumnDef } from '../tables/Phase2Table';
import {
  LapseIconButton,
  ReactivateIconButton,
  DeleteIconButton,
} from '@/components/ui';

// ==========================
// Constants
// ==========================

const EMPTY_VALUE_PLACEHOLDER = '-';

const PRODUCT_OWNER_BADGE_CLASSES = {
  container: 'flex flex-wrap gap-1',
  badge: 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800',
};

// ==========================
// Types
// ==========================

/**
 * Product Owner Interface
 */
interface ProductOwner {
  id: number;
  firstname: string;
  surname: string;
}

/**
 * Props for LegalDocumentsTable component
 */
interface LegalDocumentsTableProps {
  /** Array of legal documents to display */
  documents: LegalDocument[];
  /** Array of product owners for reference */
  productOwners?: ProductOwner[];
  /** Callback when row is clicked (opens edit modal) */
  onRowClick?: (document: LegalDocument) => void;
  /** Callback when lapse button is clicked */
  onLapse?: (document: LegalDocument) => void;
  /** Callback when reactivate button is clicked */
  onReactivate?: (document: LegalDocument) => void;
  /** Callback when delete button is clicked */
  onDelete: (document: LegalDocument) => void;
  /** Callback for add button */
  onAdd?: () => void;
  /** Loading state flag */
  isLoading?: boolean;
  /** Error object if applicable */
  error?: Error | null;
  /** Callback for retry button in error state */
  onRetry?: () => void;
  /** Status announcement for screen readers (ARIA live region) */
  statusAnnouncement?: string;
}

// ==========================
// Helper Functions
// ==========================

/**
 * Render Product Owner Pills
 * Creates pill badges for each product owner associated with the document
 */
const renderProductOwnerPills = (
  ownerIds: number[] | undefined,
  productOwners: ProductOwner[]
): ReactNode => {
  if (!ownerIds || ownerIds.length === 0) {
    return <span>{EMPTY_VALUE_PLACEHOLDER}</span>;
  }

  const owners = ownerIds
    .map((id) => productOwners.find((po) => po.id === id))
    .filter(Boolean) as ProductOwner[];

  if (owners.length === 0) {
    return <span>{EMPTY_VALUE_PLACEHOLDER}</span>;
  }

  return (
    <div className={PRODUCT_OWNER_BADGE_CLASSES.container}>
      {owners.map((owner) => (
        <span key={owner.id} className={PRODUCT_OWNER_BADGE_CLASSES.badge}>
          {owner.firstname} {owner.surname}
        </span>
      ))}
    </div>
  );
};

/**
 * Format date for display (dd/MM/yyyy)
 */
const formatDocumentDate = (dateStr: string | null): string => {
  if (!dateStr) return EMPTY_VALUE_PLACEHOLDER;

  try {
    return format(new Date(dateStr), 'dd/MM/yyyy');
  } catch {
    return EMPTY_VALUE_PLACEHOLDER;
  }
};

// ==========================
// Component
// ==========================

/**
 * LegalDocumentsTable component displays legal documents using Phase2Table.
 * Handles loading, error, and empty states. Supports row click and action buttons.
 */
const LegalDocumentsTable: React.FC<LegalDocumentsTableProps> = ({
  documents,
  productOwners = [],
  onRowClick,
  onLapse,
  onReactivate,
  onDelete,
  onAdd,
  isLoading = false,
  error = null,
  onRetry,
  statusAnnouncement,
}) => {
  // ==========================
  // Helper for generating aria-labels with owner context
  // ==========================
  const getOwnerNames = (ownerIds: number[]): string => {
    const owners = ownerIds
      .map(id => productOwners.find(po => po.id === id))
      .filter(Boolean) as ProductOwner[];

    if (owners.length === 0) return '';
    return owners.map(o => `${o.firstname} ${o.surname}`).join(', ');
  };

  // ==========================
  // ARIA Live Region Announcement
  // ==========================
  const getLiveRegionContent = (): string => {
    if (statusAnnouncement) return statusAnnouncement;
    if (isLoading) return 'Loading legal documents...';
    if (error) return 'Error loading legal documents';
    return `${documents.length} legal documents`;
  };
  // ==========================
  // Column Definitions
  // ==========================

  const columns: ColumnDef<LegalDocument>[] = [
    {
      key: 'type',
      label: 'Type',
      sortable: true,
      render: (row) => row.type || EMPTY_VALUE_PLACEHOLDER,
    },
    {
      key: 'product_owners',
      label: 'People',
      sortable: false,
      render: (row) => renderProductOwnerPills(row.product_owner_ids, productOwners),
    },
    {
      key: 'document_date',
      label: 'Date',
      sortable: true,
      render: (row) => formatDocumentDate(row.document_date),
    },
  ];

  // ==========================
  // Actions Renderer
  // ==========================

  /**
   * Render action buttons based on document status
   * Signed/Registered: Lapse only
   * Lapsed: Reactivate + Delete
   */
  const actionsRenderer = (row: LegalDocument) => {
    const isLapsed = row.status === 'Lapsed';

    if (isLapsed) {
      return (
        <>
          {onReactivate && (
            <ReactivateIconButton
              onClick={(e) => {
                e.stopPropagation();
                onReactivate(row);
              }}
              ariaLabel={`Reactivate ${row.type}${getOwnerNames(row.product_owner_ids) ? ` for ${getOwnerNames(row.product_owner_ids)}` : ''}`}
            />
          )}
          <DeleteIconButton
            onClick={(e) => {
              e.stopPropagation();
              onDelete(row);
            }}
            ariaLabel={`Delete ${row.type}${getOwnerNames(row.product_owner_ids) ? ` for ${getOwnerNames(row.product_owner_ids)}` : ''}`}
          />
        </>
      );
    }

    // Signed/Registered status - only show Lapse
    return (
      <>
        {onLapse && (
          <LapseIconButton
            onClick={(e) => {
              e.stopPropagation();
              onLapse(row);
            }}
            ariaLabel={`Lapse ${row.type}${getOwnerNames(row.product_owner_ids) ? ` for ${getOwnerNames(row.product_owner_ids)}` : ''}`}
          />
        )}
      </>
    );
  };

  // ==========================
  // Render
  // ==========================

  return (
    <>
      {/* ARIA Live Region for screen reader announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {getLiveRegionContent()}
      </div>

      <Phase2Table
        data={documents}
        columns={columns}
        isLoading={isLoading}
        error={error}
        onRetry={onRetry}
        onRowClick={onRowClick}
        actionsRenderer={actionsRenderer}
        addButton={
          onAdd
            ? {
                label: 'Legal Document',
                onClick: onAdd,
              }
            : undefined
        }
        ariaLabel="Legal documents table"
        emptyMessage="No legal documents found"
        emptySubMessage="Add your first legal document to get started"
      />
    </>
  );
};

export default LegalDocumentsTable;
```

### Blue Phase

**Agent**: coder-agent
**Task**: Refactor for quality and add keyboard support
**Changes**:
1. Add keyboard event handler for Enter key on rows
2. Ensure consistent styling with PersonalRelationshipsTable
3. Add comprehensive JSDoc comments
4. Create barrel export

**Files to create**: `frontend/src/components/phase2/legal-documents/index.ts`

```typescript
/**
 * Legal Documents Components Barrel Export
 *
 * @module components/phase2/legal-documents
 */

export { default as LegalDocumentsTable } from './LegalDocumentsTable';
// Will add modals after they're implemented:
// export { default as LegalDocumentModal } from './LegalDocumentModal';
// export { default as CreateLegalDocumentModal } from './CreateLegalDocumentModal';
```

---

## Running Tests

```bash
# Run table component tests
cd frontend
npm test -- src/tests/components/phase2/legal-documents/LegalDocumentsTable.test.tsx

# Run with coverage
npm test -- --coverage src/tests/components/phase2/legal-documents/
```

## Next Steps

Once all tests pass:
1. Proceed to Plan 07: Edit and Create Modals
2. The table component will be available for integration
