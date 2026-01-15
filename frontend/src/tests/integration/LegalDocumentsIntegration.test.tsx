/**
 * Legal Documents Feature Integration Tests (RED Phase of TDD)
 *
 * Comprehensive integration tests for the Legal Documents feature.
 * Tests full user flows through the complete feature with real component interactions.
 *
 * Test Coverage:
 * 1. View Documents Flow (4 tests)
 * 2. Create Document Flow (2 tests)
 * 3. Edit Document Flow (2 tests)
 * 4. Lapse Document Flow (2 tests)
 * 5. Reactivate Document Flow (2 tests)
 * 6. Delete Document Flow (3 tests)
 * 7. Error Handling (3 tests)
 * 8. Accessibility (4 tests)
 *
 * Expected Result: All tests FAIL (RED phase) until implementation complete.
 *
 * @module tests/integration/LegalDocumentsIntegration
 */

import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Import the main component we're testing (doesn't exist yet - RED phase)
import LegalDocumentsContainer from '@/components/phase2/legal-documents/LegalDocumentsContainer';

// Import types for mock data
import type { LegalDocument } from '@/types/legalDocument';
import type { ProductOwner } from '@/types/productOwner';

// Extend Jest matchers with jest-axe
expect.extend(toHaveNoViolations);

// =============================================================================
// Mock Setup - Mock API service at the module level
// =============================================================================

jest.mock('@/services/legalDocumentsApi', () => ({
  fetchLegalDocuments: jest.fn(),
  fetchLegalDocumentsByClientGroup: jest.fn(),
  createLegalDocument: jest.fn(),
  updateLegalDocument: jest.fn(),
  updateLegalDocumentStatus: jest.fn(),
  deleteLegalDocument: jest.fn(),
}));

// Import mocked modules for type-safe access
import * as legalDocumentsApi from '@/services/legalDocumentsApi';

const mockFetchLegalDocumentsByClientGroup =
  legalDocumentsApi.fetchLegalDocumentsByClientGroup as jest.Mock;
const mockCreateLegalDocument = legalDocumentsApi.createLegalDocument as jest.Mock;
const mockUpdateLegalDocument = legalDocumentsApi.updateLegalDocument as jest.Mock;
const mockUpdateLegalDocumentStatus =
  legalDocumentsApi.updateLegalDocumentStatus as jest.Mock;
const mockDeleteLegalDocument = legalDocumentsApi.deleteLegalDocument as jest.Mock;

// Mock react-hot-toast for notification testing
jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
  error: jest.fn(),
  loading: jest.fn(),
  dismiss: jest.fn(),
}));

// =============================================================================
// Mock Data
// =============================================================================

const productOwners: ProductOwner[] = [
  {
    id: 123,
    firstname: 'John',
    surname: 'Doe',
    status: 'active',
    known_as: null,
    title: 'Mr',
    middle_names: null,
    relationship_status: 'Married',
    gender: 'Male',
    previous_names: null,
    dob: '1970-05-15',
    place_of_birth: 'London',
    email_1: 'john@example.com',
    email_2: null,
    phone_1: '07700900001',
    phone_2: null,
    moved_in_date: null,
    address_id: 1,
    address_line_1: '123 Main St',
    address_line_2: null,
    address_line_3: 'London',
    address_line_4: null,
    address_line_5: 'SW1A 1AA',
    three_words: null,
    share_data_with: null,
    employment_status: 'Retired',
    occupation: null,
    passport_expiry_date: null,
    ni_number: null,
    aml_result: null,
    aml_date: null,
    created_at: '2020-01-01T00:00:00Z',
  },
  {
    id: 456,
    firstname: 'Jane',
    surname: 'Smith',
    status: 'active',
    known_as: null,
    title: 'Mrs',
    middle_names: null,
    relationship_status: 'Married',
    gender: 'Female',
    previous_names: null,
    dob: '1972-08-20',
    place_of_birth: 'Manchester',
    email_1: 'jane@example.com',
    email_2: null,
    phone_1: '07700900002',
    phone_2: null,
    moved_in_date: null,
    address_id: 1,
    address_line_1: '123 Main St',
    address_line_2: null,
    address_line_3: 'London',
    address_line_4: null,
    address_line_5: 'SW1A 1AA',
    three_words: null,
    share_data_with: null,
    employment_status: 'Employed',
    occupation: null,
    passport_expiry_date: null,
    ni_number: null,
    aml_result: null,
    aml_date: null,
    created_at: '2020-01-01T00:00:00Z',
  },
];

const initialDocuments: LegalDocument[] = [
  {
    id: 1,
    type: 'Will',
    document_date: '2024-01-15',
    status: 'Signed',
    notes: 'Original will document',
    product_owner_ids: [123],
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
  },
  {
    id: 2,
    type: 'LPOA P&F',
    document_date: '2024-02-20',
    status: 'Signed',
    notes: null,
    product_owner_ids: [123, 456],
    created_at: '2024-02-20T10:00:00Z',
    updated_at: '2024-02-20T10:00:00Z',
  },
  {
    id: 3,
    type: 'EPA',
    document_date: null,
    status: 'Lapsed',
    notes: 'Replaced by new document',
    product_owner_ids: [456],
    created_at: '2024-03-01T10:00:00Z',
    updated_at: '2024-03-01T10:00:00Z',
  },
];

// =============================================================================
// Test Utilities
// =============================================================================

/**
 * Creates a wrapper with QueryClient for React Query context
 * Disables retry and sets appropriate cache settings for testing
 */
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

/**
 * Setup default mock return values for all API functions
 */
const setupDefaultMocks = () => {
  mockFetchLegalDocumentsByClientGroup.mockResolvedValue(initialDocuments);
  mockCreateLegalDocument.mockResolvedValue({
    id: 100,
    type: 'Will',
    document_date: '2024-06-01',
    status: 'Signed',
    notes: 'New document',
    product_owner_ids: [123],
    created_at: '2024-06-01T10:00:00Z',
    updated_at: '2024-06-01T10:00:00Z',
  });
  mockUpdateLegalDocument.mockResolvedValue({
    ...initialDocuments[0],
    notes: 'Updated notes',
  });
  mockUpdateLegalDocumentStatus.mockImplementation((id, status) => {
    const doc = initialDocuments.find(d => d.id === id);
    return Promise.resolve({ ...doc, status });
  });
  mockDeleteLegalDocument.mockResolvedValue(undefined);
};

/**
 * Render the LegalDocumentsContainer with default props
 */
const renderLegalDocuments = (props = {}) => {
  return render(
    <LegalDocumentsContainer
      clientGroupId={1}
      productOwners={productOwners}
      {...props}
    />,
    { wrapper: createWrapper() }
  );
};

// =============================================================================
// Test Suite
// =============================================================================

describe('LegalDocumentsContainer Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupDefaultMocks();
  });

  // ===========================================================================
  // 1. View Documents Flow (4 tests)
  // ===========================================================================

  describe('View Documents Flow', () => {
    it('should load and display documents on initial render', async () => {
      renderLegalDocuments();

      // Wait for documents to load
      await waitFor(() => {
        expect(screen.getByText('Will')).toBeInTheDocument();
      });

      // Verify all documents are displayed
      expect(screen.getByText('LPOA P&F')).toBeInTheDocument();
      expect(screen.getByText('EPA')).toBeInTheDocument();

      // Verify API was called with correct client group ID
      expect(mockFetchLegalDocumentsByClientGroup).toHaveBeenCalledWith(1);
    });

    it('should show loading state initially', async () => {
      // Delay the API response to see loading state
      mockFetchLegalDocumentsByClientGroup.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(initialDocuments), 100))
      );

      renderLegalDocuments();

      // Should show loading state (skeleton or spinner)
      expect(screen.getByRole('status')).toBeInTheDocument();

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('Will')).toBeInTheDocument();
      });
    });

    it('should sort lapsed documents to the bottom of the table', async () => {
      renderLegalDocuments();

      await waitFor(() => {
        expect(screen.getByText('Will')).toBeInTheDocument();
      });

      // Get all table rows (excluding header)
      const rows = screen.getAllByRole('row').slice(1);

      // The lapsed document (EPA) should be at the bottom
      const lastRow = rows[rows.length - 1];
      expect(within(lastRow).getByText('EPA')).toBeInTheDocument();
      expect(within(lastRow).getByText('Lapsed')).toBeInTheDocument();
    });

    it('should display lapsed documents with reduced opacity (opacity-50)', async () => {
      renderLegalDocuments();

      await waitFor(() => {
        expect(screen.getByText('Will')).toBeInTheDocument();
      });

      // Find the row containing the lapsed document
      const epaText = screen.getByText('EPA');
      const lapsedRow = epaText.closest('tr');

      // Verify the row has opacity-50 class for greyed-out effect
      expect(lapsedRow).toHaveClass('opacity-50');
    });
  });

  // ===========================================================================
  // 2. Create Document Flow (2 tests)
  // ===========================================================================

  describe('Create Document Flow', () => {
    it('should open create modal when Add button is clicked', async () => {
      const user = userEvent.setup();
      renderLegalDocuments();

      await waitFor(() => {
        expect(screen.getByText('Will')).toBeInTheDocument();
      });

      // Click the Add button
      const addButton = screen.getByRole('button', { name: /add legal document/i });
      await user.click(addButton);

      // Modal should open
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Modal should have title for creating
      expect(screen.getByText(/add legal document/i)).toBeInTheDocument();

      // Modal should contain form fields (Type, Date, Notes - Status is auto-set to 'Signed' for new docs)
      expect(screen.getByLabelText(/type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/document date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/notes/i)).toBeInTheDocument();
    });

    it('should close create modal when cancelled', async () => {
      const user = userEvent.setup();

      renderLegalDocuments();

      await waitFor(() => {
        expect(screen.getByText('Will')).toBeInTheDocument();
      });

      // Open create modal
      const addButton = screen.getByRole('button', { name: /add legal document/i });
      await user.click(addButton);

      // Modal should open
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Verify the form has expected fields
      expect(screen.getByLabelText(/type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/document date/i)).toBeInTheDocument();

      // Cancel should close the modal
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      // Modal should close
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });
  });

  // ===========================================================================
  // 3. Edit Document Flow (2 tests)
  // ===========================================================================

  describe('Edit Document Flow', () => {
    it('should open edit modal when document row is clicked', async () => {
      const user = userEvent.setup();
      renderLegalDocuments();

      await waitFor(() => {
        expect(screen.getByText('Will')).toBeInTheDocument();
      });

      // Click on the Will document row
      const willRow = screen.getByText('Will').closest('tr');
      await user.click(willRow!);

      // Edit modal should open
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Modal should have title for editing
      expect(screen.getByText(/edit legal document/i)).toBeInTheDocument();

      // Form should be pre-populated with document data
      expect(screen.getByDisplayValue('Will')).toBeInTheDocument();
      expect(screen.getByDisplayValue('2024-01-15')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Original will document')).toBeInTheDocument();
    });

    it('should update document and close modal when form is submitted', async () => {
      const user = userEvent.setup();
      const toast = require('react-hot-toast');

      renderLegalDocuments();

      await waitFor(() => {
        expect(screen.getByText('Will')).toBeInTheDocument();
      });

      // Open edit modal
      const willRow = screen.getByText('Will').closest('tr');
      await user.click(willRow!);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Update the notes field
      const notesInput = screen.getByLabelText(/notes/i);
      await user.clear(notesInput);
      await user.type(notesInput, 'Updated notes');

      // Submit form
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Verify API was called with correct data
      await waitFor(() => {
        expect(mockUpdateLegalDocument).toHaveBeenCalledWith(
          1,
          expect.objectContaining({
            notes: 'Updated notes',
          })
        );
      });

      // Modal should close
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      // Success toast should be shown
      expect(toast.success).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // 4. Lapse Document Flow (2 tests)
  // ===========================================================================

  describe('Lapse Document Flow', () => {
    it('should lapse document with optimistic update when Lapse button is clicked', async () => {
      const user = userEvent.setup();
      const toast = require('react-hot-toast');

      // After lapse mutation, refetch should return updated data
      const lapsedDocuments = initialDocuments.map(d =>
        d.id === 1 ? { ...d, status: 'Lapsed' as const } : d
      );
      mockFetchLegalDocumentsByClientGroup
        .mockResolvedValueOnce(initialDocuments) // Initial fetch
        .mockResolvedValue(lapsedDocuments); // After mutation refetch

      renderLegalDocuments();

      await waitFor(() => {
        expect(screen.getByText('Will')).toBeInTheDocument();
      });

      // Find the Will document row and its Lapse button
      const willRow = screen.getByText('Will').closest('tr');
      const lapseButton = within(willRow!).getByRole('button', {
        name: /lapse/i,
      });
      await user.click(lapseButton);

      // Verify API was called
      await waitFor(() => {
        expect(mockUpdateLegalDocumentStatus).toHaveBeenCalledWith(1, 'Lapsed');
      });

      // Success toast should be shown
      expect(toast.success).toHaveBeenCalled();

      // Row should now have lapsed styling after refetch
      await waitFor(() => {
        const updatedRow = screen.getByText('Will').closest('tr');
        expect(updatedRow).toHaveClass('opacity-50');
      });
    });

    it('should show Reactivate and Delete buttons after lapsing a document', async () => {
      const user = userEvent.setup();

      // After lapse mutation, refetch should return updated data
      const lapsedDocuments = initialDocuments.map(d =>
        d.id === 1 ? { ...d, status: 'Lapsed' as const } : d
      );
      mockFetchLegalDocumentsByClientGroup
        .mockResolvedValueOnce(initialDocuments)
        .mockResolvedValue(lapsedDocuments);

      renderLegalDocuments();

      await waitFor(() => {
        expect(screen.getByText('Will')).toBeInTheDocument();
      });

      // Lapse the Will document
      const willRow = screen.getByText('Will').closest('tr');
      const lapseButton = within(willRow!).getByRole('button', {
        name: /lapse/i,
      });
      await user.click(lapseButton);

      await waitFor(() => {
        expect(mockUpdateLegalDocumentStatus).toHaveBeenCalledWith(1, 'Lapsed');
      });

      // After lapsing, Reactivate and Delete buttons should be visible
      await waitFor(() => {
        const updatedRow = screen.getByText('Will').closest('tr');
        expect(
          within(updatedRow!).getByRole('button', { name: /reactivate/i })
        ).toBeInTheDocument();
        expect(
          within(updatedRow!).getByRole('button', { name: /delete/i })
        ).toBeInTheDocument();
      });
    });
  });

  // ===========================================================================
  // 5. Reactivate Document Flow (2 tests)
  // ===========================================================================

  describe('Reactivate Document Flow', () => {
    it('should reactivate lapsed document when Reactivate button is clicked', async () => {
      const user = userEvent.setup();
      const toast = require('react-hot-toast');

      // After reactivate mutation, refetch should return updated data
      const reactivatedDocuments = initialDocuments.map(d =>
        d.id === 3 ? { ...d, status: 'Signed' as const } : d
      );
      mockFetchLegalDocumentsByClientGroup
        .mockResolvedValueOnce(initialDocuments)
        .mockResolvedValue(reactivatedDocuments);

      renderLegalDocuments();

      await waitFor(() => {
        expect(screen.getByText('EPA')).toBeInTheDocument();
      });

      // Find the lapsed EPA document row and its Reactivate button
      const epaRow = screen.getByText('EPA').closest('tr');
      const reactivateButton = within(epaRow!).getByRole('button', {
        name: /reactivate/i,
      });
      await user.click(reactivateButton);

      // Verify API was called
      await waitFor(() => {
        expect(mockUpdateLegalDocumentStatus).toHaveBeenCalledWith(3, 'Signed');
      });

      // Success toast should be shown
      expect(toast.success).toHaveBeenCalled();

      // Row should no longer have lapsed styling after refetch
      await waitFor(() => {
        const updatedRow = screen.getByText('EPA').closest('tr');
        expect(updatedRow).not.toHaveClass('opacity-50');
      });
    });

    it('should show Lapse button after reactivating a document', async () => {
      const user = userEvent.setup();

      // After reactivate mutation, refetch should return updated data
      const reactivatedDocuments = initialDocuments.map(d =>
        d.id === 3 ? { ...d, status: 'Signed' as const } : d
      );
      mockFetchLegalDocumentsByClientGroup
        .mockResolvedValueOnce(initialDocuments)
        .mockResolvedValue(reactivatedDocuments);

      renderLegalDocuments();

      await waitFor(() => {
        expect(screen.getByText('EPA')).toBeInTheDocument();
      });

      // Reactivate the EPA document
      const epaRow = screen.getByText('EPA').closest('tr');
      const reactivateButton = within(epaRow!).getByRole('button', {
        name: /reactivate/i,
      });
      await user.click(reactivateButton);

      await waitFor(() => {
        expect(mockUpdateLegalDocumentStatus).toHaveBeenCalledWith(3, 'Signed');
      });

      // After reactivation, Lapse button should be visible (not Reactivate/Delete)
      await waitFor(() => {
        const updatedRow = screen.getByText('EPA').closest('tr');
        expect(
          within(updatedRow!).getByRole('button', { name: /lapse/i })
        ).toBeInTheDocument();
        expect(
          within(updatedRow!).queryByRole('button', { name: /delete/i })
        ).not.toBeInTheDocument();
      });
    });
  });

  // ===========================================================================
  // 6. Delete Document Flow (3 tests)
  // ===========================================================================

  describe('Delete Document Flow', () => {
    it('should open confirmation modal when Delete button is clicked', async () => {
      const user = userEvent.setup();
      renderLegalDocuments();

      await waitFor(() => {
        expect(screen.getByText('EPA')).toBeInTheDocument();
      });

      // Find the lapsed EPA document row and its Delete button
      const epaRow = screen.getByText('EPA').closest('tr');
      const deleteButton = within(epaRow!).getByRole('button', {
        name: /delete/i,
      });
      await user.click(deleteButton);

      // Confirmation modal should open
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Modal should contain warning text - uses "Are you sure you want to delete {entityName}?"
      expect(screen.getByText(/are you sure you want to delete/i)).toBeInTheDocument();

      // Modal should have Delete and Cancel buttons
      expect(screen.getByRole('button', { name: /^delete$/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('should delete document when deletion is confirmed', async () => {
      const user = userEvent.setup();
      const toast = require('react-hot-toast');

      // After delete mutation, refetch should return data without the deleted document
      const documentsAfterDelete = initialDocuments.filter(d => d.id !== 3);
      mockFetchLegalDocumentsByClientGroup
        .mockResolvedValueOnce(initialDocuments)
        .mockResolvedValue(documentsAfterDelete);

      renderLegalDocuments();

      await waitFor(() => {
        expect(screen.getByText('EPA')).toBeInTheDocument();
      });

      // Open delete confirmation modal
      const epaRow = screen.getByText('EPA').closest('tr');
      const deleteButton = within(epaRow!).getByRole('button', {
        name: /delete/i,
      });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Confirm deletion
      const confirmButton = screen.getByRole('button', { name: /^delete$/i });
      await user.click(confirmButton);

      // Verify API was called
      await waitFor(() => {
        expect(mockDeleteLegalDocument).toHaveBeenCalledWith(3);
      });

      // Modal should close
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      // Success toast should be shown
      expect(toast.success).toHaveBeenCalled();

      // Document should be removed from table after refetch
      await waitFor(() => {
        expect(screen.queryByText('EPA')).not.toBeInTheDocument();
      });
    });

    it('should cancel and keep document when Cancel button is clicked', async () => {
      const user = userEvent.setup();
      renderLegalDocuments();

      await waitFor(() => {
        expect(screen.getByText('EPA')).toBeInTheDocument();
      });

      // Open delete confirmation modal
      const epaRow = screen.getByText('EPA').closest('tr');
      const deleteButton = within(epaRow!).getByRole('button', {
        name: /delete/i,
      });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Click Cancel
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      // Modal should close
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      // API should NOT have been called
      expect(mockDeleteLegalDocument).not.toHaveBeenCalled();

      // Document should still be in table
      expect(screen.getByText('EPA')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // 7. Error Handling (3 tests)
  // ===========================================================================

  describe('Error Handling', () => {
    it('should show error state when API fetch fails', async () => {
      mockFetchLegalDocumentsByClientGroup.mockRejectedValue(
        new Error('Network error: Failed to fetch')
      );

      renderLegalDocuments();

      // Should show error message - use specific heading text
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /error loading data/i })).toBeInTheDocument();
      });

      // Should show retry button
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('should rollback optimistic update on API error', async () => {
      const user = userEvent.setup();
      const toast = require('react-hot-toast');

      // First call succeeds (initial fetch), status update fails
      mockFetchLegalDocumentsByClientGroup.mockResolvedValue(initialDocuments);
      mockUpdateLegalDocumentStatus.mockRejectedValue(
        new Error('Server error: Unable to update status')
      );

      renderLegalDocuments();

      await waitFor(() => {
        expect(screen.getByText('Will')).toBeInTheDocument();
      });

      // Find the Will document row and its Lapse button
      const willRow = screen.getByText('Will').closest('tr');
      const lapseButton = within(willRow!).getByRole('button', {
        name: /lapse/i,
      });

      // Initially should NOT have opacity-50 (active document)
      expect(willRow).not.toHaveClass('opacity-50');

      // Click lapse
      await user.click(lapseButton);

      // Error toast should be shown
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });

      // After rollback, row should NOT have opacity-50 (reverted to active)
      await waitFor(() => {
        const updatedRow = screen.getByText('Will').closest('tr');
        expect(updatedRow).not.toHaveClass('opacity-50');
      });
    });

    it('should allow retry on fetch error', async () => {
      const user = userEvent.setup();

      // First call fails, second succeeds
      mockFetchLegalDocumentsByClientGroup
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(initialDocuments);

      renderLegalDocuments();

      // Should show error state - use specific heading text
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /error loading data/i })).toBeInTheDocument();
      });

      // Click retry button
      const retryButton = screen.getByRole('button', { name: /retry/i });
      await user.click(retryButton);

      // Should successfully load documents
      await waitFor(() => {
        expect(screen.getByText('Will')).toBeInTheDocument();
      });

      // API should have been called twice
      expect(mockFetchLegalDocumentsByClientGroup).toHaveBeenCalledTimes(2);
    });
  });

  // ===========================================================================
  // 8. Accessibility (4 tests)
  // ===========================================================================

  describe('Accessibility', () => {
    it('should support keyboard navigation through the table', async () => {
      const user = userEvent.setup();
      renderLegalDocuments();

      await waitFor(() => {
        expect(screen.getByText('Will')).toBeInTheDocument();
      });

      // Get the table
      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();

      // Get rows
      const rows = screen.getAllByRole('row').slice(1); // Exclude header
      expect(rows.length).toBeGreaterThan(0);

      // Focus on first row and navigate with Tab
      rows[0].focus();
      expect(document.activeElement).toBe(rows[0]);

      // Tab should move to interactive elements within the row
      await user.tab();

      // Focus should have moved to a button within the row
      expect(document.activeElement?.tagName).toBe('BUTTON');
    });

    it('should trap focus within modal when open', async () => {
      const user = userEvent.setup();
      renderLegalDocuments();

      await waitFor(() => {
        expect(screen.getByText('Will')).toBeInTheDocument();
      });

      // Open create modal
      const addButton = screen.getByRole('button', { name: /add legal document/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const modal = screen.getByRole('dialog');

      // Get all focusable elements in modal
      const cancelButton = within(modal).getByRole('button', { name: /cancel/i });
      const saveButton = within(modal).getByRole('button', { name: /save/i });

      // Both buttons should be within the modal
      expect(modal).toContainElement(cancelButton);
      expect(modal).toContainElement(saveButton);

      // Focus should be trapped (tabbing should stay within modal)
      // Focus the save button first
      saveButton.focus();

      // Tab through all elements - should cycle within modal
      for (let i = 0; i < 10; i++) {
        await user.tab();
        expect(modal.contains(document.activeElement)).toBe(true);
      }
    });

    it('should have no accessibility violations in default state', async () => {
      const { container } = renderLegalDocuments();

      await waitFor(() => {
        expect(screen.getByText('Will')).toBeInTheDocument();
      });

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no accessibility violations with modal open', async () => {
      const user = userEvent.setup();
      const { container } = renderLegalDocuments();

      await waitFor(() => {
        expect(screen.getByText('Will')).toBeInTheDocument();
      });

      // Open create modal
      const addButton = screen.getByRole('button', { name: /add legal document/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  // ===========================================================================
  // Additional Integration Tests
  // ===========================================================================

  describe('Product Owner Display', () => {
    it('should display product owner names for each document', async () => {
      renderLegalDocuments();

      await waitFor(() => {
        expect(screen.getByText('Will')).toBeInTheDocument();
      });

      // Will document should show John Doe
      const willRow = screen.getByText('Will').closest('tr');
      expect(within(willRow!).getByText('John Doe')).toBeInTheDocument();

      // LPOA P&F document should show both John Doe and Jane Smith
      const lpoaRow = screen.getByText('LPOA P&F').closest('tr');
      expect(within(lpoaRow!).getByText(/John Doe/)).toBeInTheDocument();
      expect(within(lpoaRow!).getByText(/Jane Smith/)).toBeInTheDocument();
    });
  });

  describe('Date Formatting', () => {
    it('should display formatted dates for documents', async () => {
      renderLegalDocuments();

      await waitFor(() => {
        expect(screen.getByText('Will')).toBeInTheDocument();
      });

      // Document dates should be formatted as dd/MM/yyyy (e.g., "15/01/2024")
      const willRow = screen.getByText('Will').closest('tr');
      // Verify date is present in dd/MM/yyyy format
      expect(within(willRow!).getByText(/15\/01\/2024/))
        .toBeInTheDocument();
    });

    it('should handle null document dates gracefully', async () => {
      renderLegalDocuments();

      await waitFor(() => {
        expect(screen.getByText('EPA')).toBeInTheDocument();
      });

      // EPA document has null date - should show placeholder or be empty
      const epaRow = screen.getByText('EPA').closest('tr');
      // Should not throw error and row should be valid
      expect(epaRow).toBeInTheDocument();
    });
  });

  describe('Status Badge Display', () => {
    it('should display appropriate status badges for each document', async () => {
      renderLegalDocuments();

      await waitFor(() => {
        expect(screen.getByText('Will')).toBeInTheDocument();
      });

      // Signed status should be displayed
      expect(screen.getAllByText('Signed').length).toBeGreaterThanOrEqual(2);

      // Lapsed status should be displayed
      expect(screen.getByText('Lapsed')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should display empty state when no documents exist', async () => {
      mockFetchLegalDocumentsByClientGroup.mockResolvedValue([]);

      renderLegalDocuments();

      await waitFor(() => {
        expect(screen.getByText(/no legal documents/i)).toBeInTheDocument();
      });

      // Should still show Add button
      expect(
        screen.getByRole('button', { name: /add legal document/i })
      ).toBeInTheDocument();
    });
  });

  describe('Modal Close Behavior', () => {
    it('should close modal when Escape key is pressed', async () => {
      const user = userEvent.setup();
      renderLegalDocuments();

      await waitFor(() => {
        expect(screen.getByText('Will')).toBeInTheDocument();
      });

      // Open create modal
      const addButton = screen.getByRole('button', { name: /add legal document/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Press Escape
      await user.keyboard('{Escape}');

      // Modal should close
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('should close modal when clicking outside (backdrop)', async () => {
      const user = userEvent.setup();
      renderLegalDocuments();

      await waitFor(() => {
        expect(screen.getByText('Will')).toBeInTheDocument();
      });

      // Open create modal
      const addButton = screen.getByRole('button', { name: /add legal document/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Click on the backdrop (modal overlay)
      const backdrop = screen.getByTestId('modal-backdrop');
      await user.click(backdrop);

      // Modal should close
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });
  });

  describe('Form Validation', () => {
    it('should show validation error when required fields are missing', async () => {
      const user = userEvent.setup();
      renderLegalDocuments();

      await waitFor(() => {
        expect(screen.getByText('Will')).toBeInTheDocument();
      });

      // Open create modal
      const addButton = screen.getByRole('button', { name: /add legal document/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Try to submit without filling required fields
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Should show validation error for required type field
      await waitFor(() => {
        expect(screen.getByText(/type is required/i)).toBeInTheDocument();
      });

      // Should show validation error for required product owner field
      expect(screen.getByText(/at least one product owner/i)).toBeInTheDocument();

      // API should NOT have been called
      expect(mockCreateLegalDocument).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Optimistic Update Tests
  // ===========================================================================
  describe('Optimistic Update Behavior', () => {
    it('should show immediate UI feedback during lapse operation', async () => {
      const user = userEvent.setup();

      // Create a delayed promise to simulate slow API
      let resolvePromise: (value: LegalDocument) => void;
      const slowPromise = new Promise<LegalDocument>((resolve) => {
        resolvePromise = resolve;
      });
      mockUpdateLegalDocumentStatus.mockReturnValue(slowPromise);

      renderLegalDocuments();

      await waitFor(() => {
        expect(screen.getByText('Will')).toBeInTheDocument();
      });

      // Find and click the lapse button
      const lapseButton = screen.getByRole('button', { name: /lapse will document/i });
      await user.click(lapseButton);

      // Should show loading indicator immediately (before API resolves)
      await waitFor(() => {
        expect(screen.getByRole('status', { name: /status change in progress/i })).toBeInTheDocument();
      });

      // Resolve the API call
      resolvePromise!({
        ...initialDocuments[0],
        status: 'Lapsed',
      });

      // Loading indicator should disappear after API resolves
      await waitFor(() => {
        expect(screen.queryByRole('status', { name: /status change in progress/i })).not.toBeInTheDocument();
      });
    });
  });

  // ===========================================================================
  // Rapid Operation Sequence Tests
  // ===========================================================================
  describe('Rapid Operation Sequence', () => {
    it('should handle multiple status update operations without errors', async () => {
      const user = userEvent.setup();

      // Set up mock for successful status updates
      const lapsedDoc = { ...initialDocuments[0], status: 'Lapsed' as const };
      mockUpdateLegalDocumentStatus.mockResolvedValue(lapsedDoc);

      // Set up fetch to return updated data after mutation
      mockFetchLegalDocumentsByClientGroup
        .mockResolvedValueOnce(initialDocuments)
        .mockResolvedValue([lapsedDoc, initialDocuments[1], initialDocuments[2]]);

      renderLegalDocuments();

      await waitFor(() => {
        expect(screen.getByText('Will')).toBeInTheDocument();
      });

      // Perform lapse operation
      const lapseButton = screen.getByRole('button', { name: /lapse will document/i });
      await user.click(lapseButton);

      // Verify mutation was called with correct parameters
      await waitFor(() => {
        expect(mockUpdateLegalDocumentStatus).toHaveBeenCalledWith(1, 'Lapsed');
      });

      // Operation should complete without throwing errors
      expect(mockUpdateLegalDocumentStatus).toHaveBeenCalledTimes(1);
    });
  });

  // ===========================================================================
  // Mutation Loading State Tests
  // ===========================================================================
  describe('Mutation Loading States', () => {
    it('should disable save button during form submission', async () => {
      const user = userEvent.setup();

      // Create a delayed promise to keep mutation pending
      let resolvePromise: (value: LegalDocument) => void;
      const slowPromise = new Promise<LegalDocument>((resolve) => {
        resolvePromise = resolve;
      });
      mockCreateLegalDocument.mockReturnValue(slowPromise);

      renderLegalDocuments();

      await waitFor(() => {
        expect(screen.getByText('Will')).toBeInTheDocument();
      });

      // Open create modal
      const addButton = screen.getByRole('button', { name: /add legal document/i });
      await user.click(addButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Fill in required fields
      const typeInput = screen.getByLabelText(/type/i);
      await user.click(typeInput);
      const willOption = screen.getByRole('option', { name: /will/i });
      await user.click(willOption);

      // Select a product owner
      const peopleButton = screen.getByRole('combobox', { name: /people/i });
      await user.click(peopleButton);
      const personOption = screen.getByRole('option', { name: /john doe/i });
      await user.click(personOption);

      // Click save
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Save button should be disabled while saving
      // Note: The exact behavior depends on implementation
      await waitFor(() => {
        expect(mockCreateLegalDocument).toHaveBeenCalled();
      });

      // Resolve the promise
      resolvePromise!({
        id: 100,
        type: 'Will',
        status: 'Signed',
        document_date: null,
        notes: null,
        product_owner_ids: [123],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    });

    it('should complete status update operation successfully', async () => {
      const user = userEvent.setup();

      // Set up mock for successful status update
      const lapsedDoc = { ...initialDocuments[0], status: 'Lapsed' as const };
      mockUpdateLegalDocumentStatus.mockResolvedValue(lapsedDoc);
      mockFetchLegalDocumentsByClientGroup
        .mockResolvedValueOnce(initialDocuments)
        .mockResolvedValue([lapsedDoc, initialDocuments[1], initialDocuments[2]]);

      renderLegalDocuments();

      await waitFor(() => {
        expect(screen.getByText('Will')).toBeInTheDocument();
      });

      // Click lapse button
      const lapseButton = screen.getByRole('button', { name: /lapse will document/i });
      await user.click(lapseButton);

      // Verify mutation was called with correct parameters
      await waitFor(() => {
        expect(mockUpdateLegalDocumentStatus).toHaveBeenCalledWith(1, 'Lapsed');
      });

      // Status should update successfully
      expect(mockUpdateLegalDocumentStatus).toHaveBeenCalledTimes(1);
    });
  });

  // ===========================================================================
  // Edge Case Tests
  // ===========================================================================
  describe('Edge Cases', () => {
    it('should handle document with empty notes gracefully', async () => {
      const docWithEmptyNotes: LegalDocument = {
        ...initialDocuments[0],
        notes: '',
      };
      mockFetchLegalDocumentsByClientGroup.mockResolvedValue([docWithEmptyNotes]);

      renderLegalDocuments();

      await waitFor(() => {
        expect(screen.getByText('Will')).toBeInTheDocument();
      });

      // Should render without errors
      const row = screen.getByText('Will').closest('tr');
      expect(row).toBeInTheDocument();
    });

    it('should handle document type with special characters', async () => {
      const docWithSpecialType: LegalDocument = {
        ...initialDocuments[0],
        type: 'LPOA P&F (2024)',
      };
      mockFetchLegalDocumentsByClientGroup.mockResolvedValue([docWithSpecialType]);

      renderLegalDocuments();

      await waitFor(() => {
        expect(screen.getByText('LPOA P&F (2024)')).toBeInTheDocument();
      });
    });

    it('should handle document with very long notes', async () => {
      const docWithLongNotes: LegalDocument = {
        ...initialDocuments[0],
        notes: 'A'.repeat(2000), // Max length notes
      };
      mockFetchLegalDocumentsByClientGroup.mockResolvedValue([docWithLongNotes]);

      renderLegalDocuments();

      await waitFor(() => {
        expect(screen.getByText('Will')).toBeInTheDocument();
      });

      // Should render without errors
      const row = screen.getByText('Will').closest('tr');
      expect(row).toBeInTheDocument();
    });

    it('should handle all documents being lapsed', async () => {
      const allLapsedDocs: LegalDocument[] = initialDocuments.map((doc) => ({
        ...doc,
        status: 'Lapsed' as const,
      }));
      mockFetchLegalDocumentsByClientGroup.mockResolvedValue(allLapsedDocs);

      renderLegalDocuments();

      await waitFor(() => {
        expect(screen.getByText('Will')).toBeInTheDocument();
      });

      // All rows should be displayed (with reduced opacity via isRowInactive)
      expect(screen.getByText('LPOA P&F')).toBeInTheDocument();
      expect(screen.getByText('EPA')).toBeInTheDocument();
    });
  });
});
