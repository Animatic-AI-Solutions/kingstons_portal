/**
 * LegalDocumentsTable Component Tests (RED Phase - TDD)
 *
 * Comprehensive test suite for the LegalDocumentsTable component that displays
 * legal documents in a table with columns: Type, People, Date, Status, Actions.
 *
 * The component displays:
 * - Type column with document type
 * - People column with product owner names as pill badges
 * - Date column formatted as dd/MM/yyyy
 * - Status column with appropriate badge styling
 * - Actions column with Lapse, Reactivate, Delete buttons based on status
 *
 * Lapsed documents are sorted to the bottom and displayed with reduced opacity.
 *
 * Following TDD RED-GREEN-BLUE methodology.
 * Expected Result: All tests FAIL (RED phase) until implementation complete.
 *
 * @module tests/components/phase2/legal-documents/LegalDocumentsTable
 */

import React from 'react';
import { render, screen, within, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import * as fc from 'fast-check';
import { format, parseISO, isValid } from 'date-fns';

import type { LegalDocument, LegalDocumentStatus } from '@/types/legalDocument';
import type { ProductOwner } from '@/types/productOwner';

// This import will fail in RED phase - component doesn't exist yet
import LegalDocumentsTable from '@/components/phase2/legal-documents/LegalDocumentsTable';

// Extend Jest matchers with jest-axe
expect.extend(toHaveNoViolations);

// =============================================================================
// Type Definitions
// =============================================================================

interface LegalDocumentsTableProps {
  documents: LegalDocument[];
  productOwners?: ProductOwner[];
  onRowClick?: (document: LegalDocument) => void;
  onLapse?: (document: LegalDocument) => void;
  onReactivate?: (document: LegalDocument) => void;
  onDelete: (document: LegalDocument) => void;
  onAdd?: () => void;
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  statusAnnouncement?: string;
}

// =============================================================================
// Mock Data
// =============================================================================

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

const sampleProductOwners: Partial<ProductOwner>[] = [
  { id: 123, firstname: 'John', surname: 'Doe' },
  { id: 456, firstname: 'Jane', surname: 'Smith' },
];

// Default props for rendering
const defaultProps: LegalDocumentsTableProps = {
  documents: sampleDocuments,
  productOwners: sampleProductOwners as ProductOwner[],
  onRowClick: jest.fn(),
  onLapse: jest.fn(),
  onReactivate: jest.fn(),
  onDelete: jest.fn(),
  onAdd: jest.fn(),
  isLoading: false,
  error: null,
  onRetry: jest.fn(),
};

// =============================================================================
// Test Suite
// =============================================================================

describe('LegalDocumentsTable Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================================================
  // 1. Basic Rendering Tests
  // ===========================================================================

  describe('Basic Rendering', () => {
    it('should render table structure with proper semantic HTML', () => {
      render(<LegalDocumentsTable {...defaultProps} />);

      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    it('should render all 5 column headers (Type, People, Date, Status, Actions)', () => {
      render(<LegalDocumentsTable {...defaultProps} />);

      expect(screen.getByRole('columnheader', { name: /type/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /people/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /date/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /status/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /actions/i })).toBeInTheDocument();
    });

    it('should render all documents', () => {
      render(<LegalDocumentsTable {...defaultProps} />);

      expect(screen.getByText('Will')).toBeInTheDocument();
      expect(screen.getByText('LPOA P&F')).toBeInTheDocument();
      expect(screen.getByText('EPA')).toBeInTheDocument();
    });

    it('should render correct number of data rows', () => {
      render(<LegalDocumentsTable {...defaultProps} />);

      const rows = screen.getAllByRole('row');
      // 3 data rows + 1 header row = 4 rows
      expect(rows).toHaveLength(4);
    });
  });

  // ===========================================================================
  // 2. Product Owner Pills
  // ===========================================================================

  describe('Product Owner Pills', () => {
    it('should display product owner names as pill badges', () => {
      render(<LegalDocumentsTable {...defaultProps} />);

      // Use getAllByText since owners can appear in multiple rows
      expect(screen.getAllByText('John Doe').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Jane Smith').length).toBeGreaterThan(0);
    });

    it('should display multiple pills for documents with multiple owners', () => {
      render(<LegalDocumentsTable {...defaultProps} />);

      // Find the row with Will document (has 2 owners: John Doe and Jane Smith)
      const rows = screen.getAllByRole('row');
      const willRow = rows.find(row => within(row).queryByText('Will'));

      if (willRow) {
        expect(within(willRow).getByText('John Doe')).toBeInTheDocument();
        expect(within(willRow).getByText('Jane Smith')).toBeInTheDocument();
      }
    });

    it('should handle documents with single owner', () => {
      render(<LegalDocumentsTable {...defaultProps} />);

      // LPOA P&F has only one owner (id: 123 = John Doe)
      const rows = screen.getAllByRole('row');
      const lpoaRow = rows.find(row => within(row).queryByText('LPOA P&F'));

      if (lpoaRow) {
        expect(within(lpoaRow).getByText('John Doe')).toBeInTheDocument();
        expect(within(lpoaRow).queryByText('Jane Smith')).not.toBeInTheDocument();
      }
    });

    it('should handle missing product owners gracefully', () => {
      const documentsWithUnknownOwner: LegalDocument[] = [
        {
          id: 10,
          type: 'Will',
          document_date: '2024-01-15',
          status: 'Signed',
          notes: null,
          product_owner_ids: [999], // Non-existent owner
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-01-15T10:00:00Z',
        },
      ];

      render(
        <LegalDocumentsTable
          {...defaultProps}
          documents={documentsWithUnknownOwner}
        />
      );

      // Should not throw and should render the document
      expect(screen.getByText('Will')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // 3. Date Formatting
  // ===========================================================================

  describe('Date Formatting', () => {
    it('should format dates as dd/MM/yyyy', () => {
      render(<LegalDocumentsTable {...defaultProps} />);

      // 2024-01-15 should be formatted as 15/01/2024
      expect(screen.getByText('15/01/2024')).toBeInTheDocument();
      // 2024-02-20 should be formatted as 20/02/2024
      expect(screen.getByText('20/02/2024')).toBeInTheDocument();
    });

    it('should display placeholder for null dates', () => {
      render(<LegalDocumentsTable {...defaultProps} />);

      // EPA document has null date
      const rows = screen.getAllByRole('row');
      const epaRow = rows.find(row => within(row).queryByText('EPA'));

      if (epaRow) {
        // Should display dash or similar placeholder
        expect(within(epaRow).getByText('-')).toBeInTheDocument();
      }
    });

    it('should handle invalid date strings gracefully', () => {
      const documentsWithInvalidDate: LegalDocument[] = [
        {
          id: 10,
          type: 'Will',
          document_date: 'invalid-date',
          status: 'Signed',
          notes: null,
          product_owner_ids: [123],
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-01-15T10:00:00Z',
        },
      ];

      render(
        <LegalDocumentsTable
          {...defaultProps}
          documents={documentsWithInvalidDate}
        />
      );

      // Should display placeholder for invalid date
      const rows = screen.getAllByRole('row');
      const dataRow = rows[1];
      expect(within(dataRow).getByText('-')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // 4. Status Badges
  // ===========================================================================

  describe('Status Badges', () => {
    it('should render status badges for each document', () => {
      render(<LegalDocumentsTable {...defaultProps} />);

      // Should have Signed and Lapsed status badges
      const signedBadges = screen.getAllByText('Signed');
      expect(signedBadges.length).toBeGreaterThanOrEqual(2); // 2 signed documents

      expect(screen.getByText('Lapsed')).toBeInTheDocument();
    });

    it('should render Registered status badge', () => {
      const documentsWithRegistered: LegalDocument[] = [
        {
          id: 10,
          type: 'Will',
          document_date: '2024-01-15',
          status: 'Registered',
          notes: null,
          product_owner_ids: [123],
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-01-15T10:00:00Z',
        },
      ];

      render(
        <LegalDocumentsTable
          {...defaultProps}
          documents={documentsWithRegistered}
        />
      );

      expect(screen.getByText('Registered')).toBeInTheDocument();
    });

    it('should display all valid status types', () => {
      const allStatusDocuments: LegalDocument[] = [
        {
          id: 1,
          type: 'Will',
          document_date: '2024-01-15',
          status: 'Signed',
          notes: null,
          product_owner_ids: [123],
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
          document_date: '2024-03-01',
          status: 'Registered',
          notes: null,
          product_owner_ids: [123],
          created_at: '2024-03-01T10:00:00Z',
          updated_at: '2024-03-01T10:00:00Z',
        },
      ];

      render(
        <LegalDocumentsTable
          {...defaultProps}
          documents={allStatusDocuments}
        />
      );

      expect(screen.getByText('Signed')).toBeInTheDocument();
      expect(screen.getByText('Lapsed')).toBeInTheDocument();
      expect(screen.getByText('Registered')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // 5. Lapsed Documents Sorting and Styling
  // ===========================================================================

  describe('Lapsed Documents', () => {
    it('should sort lapsed documents to the bottom of the table', () => {
      render(<LegalDocumentsTable {...defaultProps} />);

      const rows = screen.getAllByRole('row');
      // Skip header row (index 0)
      const dataRows = rows.slice(1);

      // Last row should be the lapsed document (LPOA P&F)
      const lastRow = dataRows[dataRows.length - 1];
      expect(within(lastRow).getByText('LPOA P&F')).toBeInTheDocument();
      expect(within(lastRow).getByText('Lapsed')).toBeInTheDocument();
    });

    it('should display lapsed documents with opacity-50 class (greyed out)', () => {
      render(<LegalDocumentsTable {...defaultProps} />);

      const rows = screen.getAllByRole('row');
      // Skip header row (index 0)
      const dataRows = rows.slice(1);

      // Last row should be lapsed and have opacity-50 class
      const lastRow = dataRows[dataRows.length - 1];
      expect(lastRow).toHaveClass('opacity-50');
    });

    it('should not apply opacity-50 class to active documents', () => {
      render(<LegalDocumentsTable {...defaultProps} />);

      const rows = screen.getAllByRole('row');
      // Skip header row (index 0)
      const dataRows = rows.slice(1);

      // First rows should be active (Signed status) and not have opacity-50
      const firstRow = dataRows[0];
      expect(firstRow).not.toHaveClass('opacity-50');
    });

    it('should sort multiple lapsed documents to bottom while preserving their relative order', () => {
      const documentsWithMultipleLapsed: LegalDocument[] = [
        {
          id: 1,
          type: 'Will',
          document_date: '2024-01-15',
          status: 'Signed',
          notes: null,
          product_owner_ids: [123],
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
          document_date: '2024-03-01',
          status: 'Signed',
          notes: null,
          product_owner_ids: [123],
          created_at: '2024-03-01T10:00:00Z',
          updated_at: '2024-03-01T10:00:00Z',
        },
        {
          id: 4,
          type: 'Advance Directive',
          document_date: '2024-04-01',
          status: 'Lapsed',
          notes: null,
          product_owner_ids: [123],
          created_at: '2024-04-01T10:00:00Z',
          updated_at: '2024-04-01T10:00:00Z',
        },
      ];

      render(
        <LegalDocumentsTable
          {...defaultProps}
          documents={documentsWithMultipleLapsed}
        />
      );

      const rows = screen.getAllByRole('row');
      const dataRows = rows.slice(1);

      // First two rows should be active documents (Will, EPA)
      expect(within(dataRows[0]).getByText('Will')).toBeInTheDocument();
      expect(within(dataRows[1]).getByText('EPA')).toBeInTheDocument();

      // Last two rows should be lapsed documents (LPOA P&F, Advance Directive)
      expect(within(dataRows[2]).getByText('LPOA P&F')).toBeInTheDocument();
      expect(within(dataRows[3]).getByText('Advance Directive')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // 6. Loading State
  // ===========================================================================

  describe('Loading State', () => {
    it('should show loading skeleton when isLoading is true', () => {
      render(<LegalDocumentsTable {...defaultProps} isLoading={true} />);

      // Should show skeleton/loading indicator
      const skeletons = document.querySelectorAll('.animate-pulse, [role="progressbar"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should have sr-only loading text for screen readers', () => {
      render(<LegalDocumentsTable {...defaultProps} isLoading={true} />);

      // Should have screen reader text for loading
      expect(screen.getByText(/loading/i, { selector: '.sr-only' })).toBeInTheDocument();
    });

    it('should not show data rows when loading', () => {
      render(<LegalDocumentsTable {...defaultProps} isLoading={true} />);

      // Should not show actual document data
      expect(screen.queryByText('Will')).not.toBeInTheDocument();
      expect(screen.queryByText('LPOA P&F')).not.toBeInTheDocument();
      expect(screen.queryByText('EPA')).not.toBeInTheDocument();
    });
  });

  // ===========================================================================
  // 7. Error State
  // ===========================================================================

  describe('Error State', () => {
    it('should display error message when error prop is provided', () => {
      const error = new Error('Failed to load documents');

      render(<LegalDocumentsTable {...defaultProps} error={error} />);

      expect(screen.getByText(/failed to load documents/i)).toBeInTheDocument();
    });

    it('should render retry button when error is displayed', () => {
      const error = new Error('Failed to load documents');

      render(<LegalDocumentsTable {...defaultProps} error={error} />);

      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('should call onRetry callback when retry button is clicked', async () => {
      const error = new Error('Failed to load documents');
      const mockOnRetry = jest.fn();
      const user = userEvent.setup();

      render(
        <LegalDocumentsTable
          {...defaultProps}
          error={error}
          onRetry={mockOnRetry}
        />
      );

      await user.click(screen.getByRole('button', { name: /retry/i }));

      expect(mockOnRetry).toHaveBeenCalledTimes(1);
    });
  });

  // ===========================================================================
  // 8. Empty State
  // ===========================================================================

  describe('Empty State', () => {
    it('should show empty message when documents array is empty', () => {
      render(<LegalDocumentsTable {...defaultProps} documents={[]} />);

      expect(screen.getByText(/no legal documents/i)).toBeInTheDocument();
    });

    it('should show sub-message in empty state', () => {
      render(<LegalDocumentsTable {...defaultProps} documents={[]} />);

      // Should have a sub-message or description
      expect(
        screen.getByText(/add a document|no documents have been added/i)
      ).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // 9. Row Click Behavior
  // ===========================================================================

  describe('Row Click Behavior', () => {
    it('should call onRowClick when row is clicked', async () => {
      const mockOnRowClick = jest.fn();
      const user = userEvent.setup();

      render(<LegalDocumentsTable {...defaultProps} onRowClick={mockOnRowClick} />);

      const rows = screen.getAllByRole('row');
      // Click the first data row
      await user.click(rows[1]);

      expect(mockOnRowClick).toHaveBeenCalledTimes(1);
    });

    it('should pass the correct document to onRowClick callback', async () => {
      const mockOnRowClick = jest.fn();
      const user = userEvent.setup();

      render(<LegalDocumentsTable {...defaultProps} onRowClick={mockOnRowClick} />);

      const rows = screen.getAllByRole('row');
      // Click the first data row (Will document, sorted before lapsed LPOA)
      await user.click(rows[1]);

      expect(mockOnRowClick).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'Will',
          status: 'Signed',
        })
      );
    });

    it('should have cursor-pointer class on data rows', () => {
      render(<LegalDocumentsTable {...defaultProps} />);

      const rows = screen.getAllByRole('row');
      // Skip header row
      const dataRows = rows.slice(1);

      dataRows.forEach(row => {
        expect(row).toHaveClass('cursor-pointer');
      });
    });

    it('should not have tabIndex on rows when onRowClick is undefined', () => {
      render(<LegalDocumentsTable {...defaultProps} onRowClick={undefined} />);

      const rows = screen.getAllByRole('row');
      // Skip header row
      const dataRows = rows.slice(1);

      // Rows should not be focusable when there's no click handler
      dataRows.forEach(row => {
        expect(row).not.toHaveAttribute('tabindex');
      });
    });

    it('should have tabIndex=0 on rows when onRowClick is provided', () => {
      const mockOnRowClick = jest.fn();
      render(<LegalDocumentsTable {...defaultProps} onRowClick={mockOnRowClick} />);

      const rows = screen.getAllByRole('row');
      // Skip header row
      const dataRows = rows.slice(1);

      // Rows should be focusable when there is a click handler
      dataRows.forEach(row => {
        expect(row).toHaveAttribute('tabindex', '0');
      });
    });
  });

  // ===========================================================================
  // 10. Action Buttons
  // ===========================================================================

  describe('Action Buttons', () => {
    describe('Signed/Registered Documents', () => {
      it('should show Lapse button for Signed documents', () => {
        const signedOnlyDocs: LegalDocument[] = [
          {
            id: 1,
            type: 'Will',
            document_date: '2024-01-15',
            status: 'Signed',
            notes: null,
            product_owner_ids: [123],
            created_at: '2024-01-15T10:00:00Z',
            updated_at: '2024-01-15T10:00:00Z',
          },
        ];

        render(
          <LegalDocumentsTable
            {...defaultProps}
            documents={signedOnlyDocs}
          />
        );

        expect(screen.getByRole('button', { name: /lapse/i })).toBeInTheDocument();
      });

      it('should show Lapse button for Registered documents', () => {
        const registeredDocs: LegalDocument[] = [
          {
            id: 1,
            type: 'Will',
            document_date: '2024-01-15',
            status: 'Registered',
            notes: null,
            product_owner_ids: [123],
            created_at: '2024-01-15T10:00:00Z',
            updated_at: '2024-01-15T10:00:00Z',
          },
        ];

        render(
          <LegalDocumentsTable
            {...defaultProps}
            documents={registeredDocs}
          />
        );

        expect(screen.getByRole('button', { name: /lapse/i })).toBeInTheDocument();
      });

      it('should NOT show Delete button for Signed documents', () => {
        const signedOnlyDocs: LegalDocument[] = [
          {
            id: 1,
            type: 'Will',
            document_date: '2024-01-15',
            status: 'Signed',
            notes: null,
            product_owner_ids: [123],
            created_at: '2024-01-15T10:00:00Z',
            updated_at: '2024-01-15T10:00:00Z',
          },
        ];

        render(
          <LegalDocumentsTable
            {...defaultProps}
            documents={signedOnlyDocs}
          />
        );

        expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
      });

      it('should NOT show Reactivate button for Signed documents', () => {
        const signedOnlyDocs: LegalDocument[] = [
          {
            id: 1,
            type: 'Will',
            document_date: '2024-01-15',
            status: 'Signed',
            notes: null,
            product_owner_ids: [123],
            created_at: '2024-01-15T10:00:00Z',
            updated_at: '2024-01-15T10:00:00Z',
          },
        ];

        render(
          <LegalDocumentsTable
            {...defaultProps}
            documents={signedOnlyDocs}
          />
        );

        expect(screen.queryByRole('button', { name: /reactivate/i })).not.toBeInTheDocument();
      });

      it('should call onLapse when Lapse button is clicked', async () => {
        const mockOnLapse = jest.fn();
        const user = userEvent.setup();
        const signedOnlyDocs: LegalDocument[] = [
          {
            id: 1,
            type: 'Will',
            document_date: '2024-01-15',
            status: 'Signed',
            notes: null,
            product_owner_ids: [123],
            created_at: '2024-01-15T10:00:00Z',
            updated_at: '2024-01-15T10:00:00Z',
          },
        ];

        render(
          <LegalDocumentsTable
            {...defaultProps}
            documents={signedOnlyDocs}
            onLapse={mockOnLapse}
          />
        );

        await user.click(screen.getByRole('button', { name: /lapse/i }));

        expect(mockOnLapse).toHaveBeenCalledTimes(1);
        expect(mockOnLapse).toHaveBeenCalledWith(
          expect.objectContaining({ id: 1, type: 'Will' })
        );
      });
    });

    describe('Lapsed Documents', () => {
      it('should show Reactivate button for Lapsed documents', () => {
        const lapsedDocs: LegalDocument[] = [
          {
            id: 1,
            type: 'Will',
            document_date: '2024-01-15',
            status: 'Lapsed',
            notes: null,
            product_owner_ids: [123],
            created_at: '2024-01-15T10:00:00Z',
            updated_at: '2024-01-15T10:00:00Z',
          },
        ];

        render(
          <LegalDocumentsTable
            {...defaultProps}
            documents={lapsedDocs}
          />
        );

        expect(screen.getByRole('button', { name: /reactivate/i })).toBeInTheDocument();
      });

      it('should show Delete button for Lapsed documents', () => {
        const lapsedDocs: LegalDocument[] = [
          {
            id: 1,
            type: 'Will',
            document_date: '2024-01-15',
            status: 'Lapsed',
            notes: null,
            product_owner_ids: [123],
            created_at: '2024-01-15T10:00:00Z',
            updated_at: '2024-01-15T10:00:00Z',
          },
        ];

        render(
          <LegalDocumentsTable
            {...defaultProps}
            documents={lapsedDocs}
          />
        );

        expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
      });

      it('should NOT show Lapse button for Lapsed documents', () => {
        const lapsedOnlyDocs: LegalDocument[] = [
          {
            id: 1,
            type: 'Will',
            document_date: '2024-01-15',
            status: 'Lapsed',
            notes: null,
            product_owner_ids: [123],
            created_at: '2024-01-15T10:00:00Z',
            updated_at: '2024-01-15T10:00:00Z',
          },
        ];

        render(
          <LegalDocumentsTable
            {...defaultProps}
            documents={lapsedOnlyDocs}
          />
        );

        expect(screen.queryByRole('button', { name: /^lapse$/i })).not.toBeInTheDocument();
      });

      it('should NOT show Reactivate button for Lapsed documents when onReactivate is not provided', () => {
        const lapsedOnlyDocs: LegalDocument[] = [
          {
            id: 1,
            type: 'Will',
            document_date: '2024-01-15',
            status: 'Lapsed',
            notes: null,
            product_owner_ids: [123],
            created_at: '2024-01-15T10:00:00Z',
            updated_at: '2024-01-15T10:00:00Z',
          },
        ];

        render(
          <LegalDocumentsTable
            {...defaultProps}
            documents={lapsedOnlyDocs}
            onReactivate={undefined}
          />
        );

        // Reactivate button should NOT be shown when onReactivate prop is not provided
        expect(screen.queryByRole('button', { name: /reactivate/i })).not.toBeInTheDocument();
        // Delete button should still be shown
        expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
      });

      it('should call onReactivate when Reactivate button is clicked', async () => {
        const mockOnReactivate = jest.fn();
        const user = userEvent.setup();
        const lapsedDocs: LegalDocument[] = [
          {
            id: 1,
            type: 'Will',
            document_date: '2024-01-15',
            status: 'Lapsed',
            notes: null,
            product_owner_ids: [123],
            created_at: '2024-01-15T10:00:00Z',
            updated_at: '2024-01-15T10:00:00Z',
          },
        ];

        render(
          <LegalDocumentsTable
            {...defaultProps}
            documents={lapsedDocs}
            onReactivate={mockOnReactivate}
          />
        );

        await user.click(screen.getByRole('button', { name: /reactivate/i }));

        expect(mockOnReactivate).toHaveBeenCalledTimes(1);
        expect(mockOnReactivate).toHaveBeenCalledWith(
          expect.objectContaining({ id: 1, type: 'Will' })
        );
      });

      it('should call onDelete when Delete button is clicked', async () => {
        const mockOnDelete = jest.fn();
        const user = userEvent.setup();
        const lapsedDocs: LegalDocument[] = [
          {
            id: 1,
            type: 'Will',
            document_date: '2024-01-15',
            status: 'Lapsed',
            notes: null,
            product_owner_ids: [123],
            created_at: '2024-01-15T10:00:00Z',
            updated_at: '2024-01-15T10:00:00Z',
          },
        ];

        render(
          <LegalDocumentsTable
            {...defaultProps}
            documents={lapsedDocs}
            onDelete={mockOnDelete}
          />
        );

        await user.click(screen.getByRole('button', { name: /delete/i }));

        expect(mockOnDelete).toHaveBeenCalledTimes(1);
        expect(mockOnDelete).toHaveBeenCalledWith(
          expect.objectContaining({ id: 1, type: 'Will' })
        );
      });
    });

    describe('Action Button Event Propagation', () => {
      it('should NOT trigger row click when Lapse button is clicked (stopPropagation)', async () => {
        const mockOnRowClick = jest.fn();
        const mockOnLapse = jest.fn();
        const user = userEvent.setup();
        const signedDocs: LegalDocument[] = [
          {
            id: 1,
            type: 'Will',
            document_date: '2024-01-15',
            status: 'Signed',
            notes: null,
            product_owner_ids: [123],
            created_at: '2024-01-15T10:00:00Z',
            updated_at: '2024-01-15T10:00:00Z',
          },
        ];

        render(
          <LegalDocumentsTable
            {...defaultProps}
            documents={signedDocs}
            onRowClick={mockOnRowClick}
            onLapse={mockOnLapse}
          />
        );

        await user.click(screen.getByRole('button', { name: /lapse/i }));

        expect(mockOnLapse).toHaveBeenCalledTimes(1);
        expect(mockOnRowClick).not.toHaveBeenCalled();
      });

      it('should NOT trigger row click when Reactivate button is clicked (stopPropagation)', async () => {
        const mockOnRowClick = jest.fn();
        const mockOnReactivate = jest.fn();
        const user = userEvent.setup();
        const lapsedDocs: LegalDocument[] = [
          {
            id: 1,
            type: 'Will',
            document_date: '2024-01-15',
            status: 'Lapsed',
            notes: null,
            product_owner_ids: [123],
            created_at: '2024-01-15T10:00:00Z',
            updated_at: '2024-01-15T10:00:00Z',
          },
        ];

        render(
          <LegalDocumentsTable
            {...defaultProps}
            documents={lapsedDocs}
            onRowClick={mockOnRowClick}
            onReactivate={mockOnReactivate}
          />
        );

        await user.click(screen.getByRole('button', { name: /reactivate/i }));

        expect(mockOnReactivate).toHaveBeenCalledTimes(1);
        expect(mockOnRowClick).not.toHaveBeenCalled();
      });

      it('should NOT trigger row click when Delete button is clicked (stopPropagation)', async () => {
        const mockOnRowClick = jest.fn();
        const mockOnDelete = jest.fn();
        const user = userEvent.setup();
        const lapsedDocs: LegalDocument[] = [
          {
            id: 1,
            type: 'Will',
            document_date: '2024-01-15',
            status: 'Lapsed',
            notes: null,
            product_owner_ids: [123],
            created_at: '2024-01-15T10:00:00Z',
            updated_at: '2024-01-15T10:00:00Z',
          },
        ];

        render(
          <LegalDocumentsTable
            {...defaultProps}
            documents={lapsedDocs}
            onRowClick={mockOnRowClick}
            onDelete={mockOnDelete}
          />
        );

        await user.click(screen.getByRole('button', { name: /delete/i }));

        expect(mockOnDelete).toHaveBeenCalledTimes(1);
        expect(mockOnRowClick).not.toHaveBeenCalled();
      });
    });
  });

  // ===========================================================================
  // 11. Add Button
  // ===========================================================================

  describe('Add Button', () => {
    it('should render Add button when onAdd prop is provided', () => {
      render(<LegalDocumentsTable {...defaultProps} onAdd={jest.fn()} />);

      expect(screen.getByRole('button', { name: /add/i })).toBeInTheDocument();
    });

    it('should NOT render Add button when onAdd prop is not provided', () => {
      render(<LegalDocumentsTable {...defaultProps} onAdd={undefined} />);

      expect(screen.queryByRole('button', { name: /add/i })).not.toBeInTheDocument();
    });

    it('should call onAdd when Add button is clicked', async () => {
      const mockOnAdd = jest.fn();
      const user = userEvent.setup();

      render(<LegalDocumentsTable {...defaultProps} onAdd={mockOnAdd} />);

      await user.click(screen.getByRole('button', { name: /add/i }));

      expect(mockOnAdd).toHaveBeenCalledTimes(1);
    });
  });

  // ===========================================================================
  // 12. Accessibility
  // ===========================================================================

  describe('Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(<LegalDocumentsTable {...defaultProps} />);

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have table aria-label for screen readers', () => {
      render(<LegalDocumentsTable {...defaultProps} />);

      const table = screen.getByRole('table');
      expect(table).toHaveAttribute('aria-label');
    });

    it('should have focusable action buttons', () => {
      render(<LegalDocumentsTable {...defaultProps} />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).not.toHaveAttribute('tabindex', '-1');
      });
    });

    it('should allow keyboard Enter to activate row navigation', async () => {
      const mockOnRowClick = jest.fn();
      const user = userEvent.setup();

      render(<LegalDocumentsTable {...defaultProps} onRowClick={mockOnRowClick} />);

      const rows = screen.getAllByRole('row');
      const firstDataRow = rows[1];

      // Focus the row
      firstDataRow.focus();
      await user.keyboard('{Enter}');

      expect(mockOnRowClick).toHaveBeenCalledTimes(1);
    });

    it('should have ARIA live region with status announcements', () => {
      render(
        <LegalDocumentsTable
          {...defaultProps}
          statusAnnouncement="Document saved successfully"
        />
      );

      // Should have an ARIA live region
      const liveRegion = document.querySelector('[aria-live]');
      expect(liveRegion).toBeInTheDocument();
      expect(liveRegion).toHaveTextContent('Document saved successfully');
    });

    it('should have no accessibility violations in empty state', async () => {
      const { container } = render(
        <LegalDocumentsTable {...defaultProps} documents={[]} />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no accessibility violations in loading state', async () => {
      const { container } = render(
        <LegalDocumentsTable {...defaultProps} isLoading={true} />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no accessibility violations in error state', async () => {
      const { container } = render(
        <LegalDocumentsTable
          {...defaultProps}
          error={new Error('Test error')}
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  // ===========================================================================
  // 13. Edge Cases
  // ===========================================================================

  describe('Edge Cases', () => {
    it('should handle document with empty product_owner_ids array', () => {
      const documentsWithEmptyOwners: LegalDocument[] = [
        {
          id: 1,
          type: 'Will',
          document_date: '2024-01-15',
          status: 'Signed',
          notes: null,
          product_owner_ids: [],
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-01-15T10:00:00Z',
        },
      ];

      render(
        <LegalDocumentsTable
          {...defaultProps}
          documents={documentsWithEmptyOwners}
        />
      );

      expect(screen.getByText('Will')).toBeInTheDocument();
    });

    it('should handle special characters in document types', () => {
      const documentsWithSpecialChars: LegalDocument[] = [
        {
          id: 1,
          type: "Custom: O'Brien's Trust & Agreement",
          document_date: '2024-01-15',
          status: 'Signed',
          notes: null,
          product_owner_ids: [123],
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-01-15T10:00:00Z',
        },
      ];

      render(
        <LegalDocumentsTable
          {...defaultProps}
          documents={documentsWithSpecialChars}
        />
      );

      expect(screen.getByText("Custom: O'Brien's Trust & Agreement")).toBeInTheDocument();
    });

    it('should handle unicode characters in document types', () => {
      const documentsWithUnicode: LegalDocument[] = [
        {
          id: 1,
          type: '\u9057\u8a00', // Will in Japanese
          document_date: '2024-01-15',
          status: 'Signed',
          notes: null,
          product_owner_ids: [123],
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-01-15T10:00:00Z',
        },
      ];

      render(
        <LegalDocumentsTable
          {...defaultProps}
          documents={documentsWithUnicode}
        />
      );

      expect(screen.getByText('\u9057\u8a00')).toBeInTheDocument();
    });

    it('should handle many rows (50) efficiently (<500ms)', () => {
      const manyDocuments: LegalDocument[] = Array.from({ length: 50 }, (_, i) => ({
        id: i + 1,
        type: `Document ${i + 1}`,
        document_date: '2024-01-15',
        status: (i % 3 === 0 ? 'Lapsed' : 'Signed') as LegalDocumentStatus,
        notes: null,
        product_owner_ids: [123],
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
      }));

      const startTime = performance.now();

      render(
        <LegalDocumentsTable
          {...defaultProps}
          documents={manyDocuments}
        />
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Render should complete in under 500ms
      expect(renderTime).toBeLessThan(500);

      // Verify all rows rendered
      const rows = screen.getAllByRole('row');
      // 50 data rows + 1 header row = 51
      expect(rows).toHaveLength(51);
    });

    it('should handle productOwners being undefined', () => {
      render(
        <LegalDocumentsTable
          {...defaultProps}
          productOwners={undefined}
        />
      );

      // Should render without crashing
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    it('should handle productOwners being empty array', () => {
      render(
        <LegalDocumentsTable
          {...defaultProps}
          productOwners={[]}
        />
      );

      // Should render without crashing
      expect(screen.getByRole('table')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // 14. Keyboard Navigation
  // ===========================================================================

  describe('Keyboard Navigation', () => {
    it('should allow tab navigation to action buttons', async () => {
      const user = userEvent.setup();
      render(<LegalDocumentsTable {...defaultProps} />);

      // Tab through elements until we reach an action button
      await user.tab();
      let iterations = 0;
      const maxIterations = 30;

      while (
        iterations < maxIterations &&
        document.activeElement?.tagName !== 'BUTTON'
      ) {
        await user.tab();
        iterations++;
      }

      // Should have focused a button
      expect(document.activeElement?.tagName).toBe('BUTTON');
    });

    it('should allow Enter key to activate action buttons', async () => {
      const mockOnLapse = jest.fn();
      const user = userEvent.setup();
      const signedDocs: LegalDocument[] = [
        {
          id: 1,
          type: 'Will',
          document_date: '2024-01-15',
          status: 'Signed',
          notes: null,
          product_owner_ids: [123],
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-01-15T10:00:00Z',
        },
      ];

      render(
        <LegalDocumentsTable
          {...defaultProps}
          documents={signedDocs}
          onLapse={mockOnLapse}
        />
      );

      // Focus the Lapse button
      const lapseButton = screen.getByRole('button', { name: /lapse/i });
      lapseButton.focus();

      // Press Enter
      await user.keyboard('{Enter}');

      expect(mockOnLapse).toHaveBeenCalledTimes(1);
    });
  });
});

// =============================================================================
// Property-Based Tests (using fast-check)
// =============================================================================

describe('Property-based Tests', () => {
  // ---------------------------------------------------------------------------
  // Generator for valid LegalDocument objects
  // ---------------------------------------------------------------------------
  const legalDocumentArb = fc.record({
    id: fc.integer({ min: 1, max: 10000 }),
    type: fc.oneof(
      fc.constantFrom(
        'Will',
        'LPOA P&F',
        'LPOA H&W',
        'EPA',
        'General Power of Attorney',
        'Advance Directive'
      ),
      fc.string({ minLength: 1, maxLength: 100 })
    ),
    document_date: fc.oneof(
      fc.constant(null),
      fc
        .tuple(
          fc.integer({ min: 2020, max: 2030 }),
          fc.integer({ min: 1, max: 12 }),
          fc.integer({ min: 1, max: 28 })
        )
        .map(
          ([year, month, day]) =>
            `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        )
    ),
    status: fc.constantFrom('Signed', 'Lapsed', 'Registered') as fc.Arbitrary<
      'Signed' | 'Lapsed' | 'Registered'
    >,
    notes: fc.oneof(fc.constant(null), fc.string({ minLength: 0, maxLength: 2000 })),
    product_owner_ids: fc.array(fc.integer({ min: 1, max: 10000 }), {
      minLength: 0,
      maxLength: 5,
    }),
    created_at: fc
      .tuple(
        fc.integer({ min: 2020, max: 2030 }),
        fc.integer({ min: 1, max: 12 }),
        fc.integer({ min: 1, max: 28 }),
        fc.integer({ min: 0, max: 23 }),
        fc.integer({ min: 0, max: 59 }),
        fc.integer({ min: 0, max: 59 })
      )
      .map(
        ([year, month, day, hour, min, sec]) =>
          `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}Z`
      ),
    updated_at: fc
      .tuple(
        fc.integer({ min: 2020, max: 2030 }),
        fc.integer({ min: 1, max: 12 }),
        fc.integer({ min: 1, max: 28 }),
        fc.integer({ min: 0, max: 23 }),
        fc.integer({ min: 0, max: 59 }),
        fc.integer({ min: 0, max: 59 })
      )
      .map(
        ([year, month, day, hour, min, sec]) =>
          `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}Z`
      ),
  });

  // Generator for arrays of legal documents
  const legalDocumentArrayArb = fc.array(legalDocumentArb, { minLength: 0, maxLength: 20 });

  // ---------------------------------------------------------------------------
  // Lapsed Documents Sorting
  // ---------------------------------------------------------------------------
  describe('Lapsed Documents Sorting', () => {
    it('should always place lapsed documents at the bottom', () => {
      fc.assert(
        fc.property(legalDocumentArrayArb, (documents) => {
          const sorted = sortDocumentsWithLapsedAtBottom(documents);

          // Find the index of the first lapsed document
          const firstLapsedIndex = sorted.findIndex((doc) => doc.status === 'Lapsed');

          if (firstLapsedIndex === -1) {
            // No lapsed documents, so all documents should be in original relative order
            return true;
          }

          // All documents after the first lapsed should also be lapsed
          const afterFirstLapsed = sorted.slice(firstLapsedIndex);
          return afterFirstLapsed.every((doc) => doc.status === 'Lapsed');
        }),
        { numRuns: 100 }
      );
    });

    it('should preserve relative order of active documents', () => {
      fc.assert(
        fc.property(legalDocumentArrayArb, (documents) => {
          const sorted = sortDocumentsWithLapsedAtBottom(documents);

          // Get active documents from original array (preserving order)
          const originalActive = documents.filter((doc) => doc.status !== 'Lapsed');

          // Get active documents from sorted array (should be at the beginning)
          const sortedActive = sorted.filter((doc) => doc.status !== 'Lapsed');

          // The order of active documents should be preserved
          if (originalActive.length !== sortedActive.length) {
            return false;
          }

          return originalActive.every((doc, index) => doc.id === sortedActive[index].id);
        }),
        { numRuns: 100 }
      );
    });

    it('should preserve relative order of lapsed documents among themselves', () => {
      fc.assert(
        fc.property(legalDocumentArrayArb, (documents) => {
          const sorted = sortDocumentsWithLapsedAtBottom(documents);

          // Get lapsed documents from original array (preserving order)
          const originalLapsed = documents.filter((doc) => doc.status === 'Lapsed');

          // Get lapsed documents from sorted array
          const sortedLapsed = sorted.filter((doc) => doc.status === 'Lapsed');

          // The order of lapsed documents should be preserved
          if (originalLapsed.length !== sortedLapsed.length) {
            return false;
          }

          return originalLapsed.every((doc, index) => doc.id === sortedLapsed[index].id);
        }),
        { numRuns: 100 }
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Date Formatting
  // ---------------------------------------------------------------------------
  describe('Date Formatting', () => {
    it('should always format valid dates as dd/MM/yyyy pattern', () => {
      fc.assert(
        fc.property(
          fc.tuple(
            fc.integer({ min: 2020, max: 2030 }),
            fc.integer({ min: 1, max: 12 }),
            fc.integer({ min: 1, max: 28 })
          ),
          ([year, month, day]) => {
            const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const formatted = formatDocumentDate(dateString);

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
        fc.property(fc.constant(null), (nullDate) => {
          const formatted = formatDocumentDate(nullDate);
          return formatted === '-';
        }),
        { numRuns: 10 }
      );
    });

    it('should return placeholder for invalid date strings', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant('invalid-date'),
            fc.constant(''),
            fc.constant('not-a-date'),
            fc.constant('2024-13-45'), // Invalid month/day
            fc.constant('abc')
          ),
          (invalidDate) => {
            const formatted = formatDocumentDate(invalidDate);
            return formatted === '-';
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Product Owner Pills
  // ---------------------------------------------------------------------------
  describe('Product Owner Pill Count', () => {
    it('should return correct count of matching owners', () => {
      fc.assert(
        fc.property(
          fc.array(fc.integer({ min: 1, max: 100 }), { minLength: 0, maxLength: 10 }),
          fc.array(
            fc.record({
              id: fc.integer({ min: 1, max: 100 }),
              firstname: fc.string({ minLength: 1, maxLength: 20 }),
              surname: fc.string({ minLength: 1, maxLength: 20 }),
            }),
            { minLength: 0, maxLength: 10 }
          ),
          (productOwnerIds, productOwners) => {
            const matchingCount = getMatchingOwnerCount(productOwnerIds, productOwners);

            // Count should be the number of IDs that have a matching owner
            const expectedCount = productOwnerIds.filter((id) =>
              productOwners.some((owner) => owner.id === id)
            ).length;

            return matchingCount === expectedCount;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return 0 for empty product owner IDs', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.integer({ min: 1, max: 100 }),
              firstname: fc.string({ minLength: 1, maxLength: 20 }),
              surname: fc.string({ minLength: 1, maxLength: 20 }),
            }),
            { minLength: 0, maxLength: 10 }
          ),
          (productOwners) => {
            const matchingCount = getMatchingOwnerCount([], productOwners);
            return matchingCount === 0;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should return 0 for empty product owners array', () => {
      fc.assert(
        fc.property(
          fc.array(fc.integer({ min: 1, max: 100 }), { minLength: 1, maxLength: 10 }),
          (productOwnerIds) => {
            const matchingCount = getMatchingOwnerCount(productOwnerIds, []);
            return matchingCount === 0;
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});

// =============================================================================
// Helper Functions for Property-Based Tests
// =============================================================================

/**
 * Sort documents with lapsed documents at the bottom while preserving
 * relative order within active and lapsed groups.
 */
function sortDocumentsWithLapsedAtBottom(documents: LegalDocument[]): LegalDocument[] {
  const active = documents.filter((doc) => doc.status !== 'Lapsed');
  const lapsed = documents.filter((doc) => doc.status === 'Lapsed');
  return [...active, ...lapsed];
}

/**
 * Format a document date string to dd/MM/yyyy format.
 * Returns '-' for null or invalid dates.
 */
function formatDocumentDate(dateString: string | null): string {
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
}

/**
 * Get the count of product owners that match the given IDs.
 */
function getMatchingOwnerCount(
  productOwnerIds: number[],
  productOwners: Array<{ id: number; firstname: string; surname: string }>
): number {
  return productOwnerIds.filter((id) =>
    productOwners.some((owner) => owner.id === id)
  ).length;
}
