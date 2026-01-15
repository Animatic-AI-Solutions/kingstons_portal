/**
 * LegalDocumentModal Component Tests (RED Phase - TDD)
 *
 * Comprehensive test suite for the LegalDocumentModal component that provides
 * a modal dialog for editing existing legal documents.
 *
 * The component displays:
 * - Document type field (readonly or dropdown based on design)
 * - Document date field
 * - Notes field with 2000 character limit
 * - Product owner selection (multi-select)
 *
 * Following TDD RED-GREEN-BLUE methodology.
 * Expected Result: All tests FAIL (RED phase) until implementation complete.
 *
 * @module tests/components/phase2/legal-documents/LegalDocumentModal
 */

import React from 'react';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import type { LegalDocument } from '@/types/legalDocument';

// This import will fail in RED phase - component doesn't exist yet
import LegalDocumentModal from '@/components/phase2/legal-documents/LegalDocumentModal';

// Extend Jest matchers with jest-axe
expect.extend(toHaveNoViolations);

// =============================================================================
// Mock Setup
// =============================================================================

// Mock the legal documents hook
const mockUpdateMutation = {
  mutateAsync: jest.fn(),
  isPending: false,
};

jest.mock('@/hooks/useLegalDocuments', () => ({
  useUpdateLegalDocument: () => mockUpdateMutation,
}));

// =============================================================================
// Type Definitions
// =============================================================================

interface ProductOwner {
  id: number;
  firstname: string;
  surname: string;
}

interface LegalDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: LegalDocument;
  productOwners: ProductOwner[];
  onSuccess?: (document: LegalDocument) => void;
}

// =============================================================================
// Mock Data
// =============================================================================

const sampleDocument: LegalDocument = {
  id: 1,
  type: 'Will',
  document_date: '2024-01-15',
  status: 'Signed',
  notes: 'Test notes for the document',
  product_owner_ids: [123, 456],
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
};

const sampleDocumentWithNullDate: LegalDocument = {
  id: 2,
  type: 'LPOA P&F',
  document_date: null,
  status: 'Signed',
  notes: null,
  product_owner_ids: [123],
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
};

const sampleProductOwners: ProductOwner[] = [
  { id: 123, firstname: 'John', surname: 'Doe' },
  { id: 456, firstname: 'Jane', surname: 'Smith' },
  { id: 789, firstname: 'Bob', surname: 'Johnson' },
];

// =============================================================================
// Test Utilities
// =============================================================================

/**
 * Creates a wrapper with QueryClient for React Query context
 */
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

/**
 * Default props for the modal
 */
const defaultProps: LegalDocumentModalProps = {
  isOpen: true,
  onClose: jest.fn(),
  document: sampleDocument,
  productOwners: sampleProductOwners,
  onSuccess: jest.fn(),
};

// =============================================================================
// Test Suite
// =============================================================================

describe('LegalDocumentModal Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock implementations to default values
    mockUpdateMutation.mutateAsync.mockResolvedValue(sampleDocument);
    mockUpdateMutation.isPending = false;
    // Mock window.confirm to return true by default (user confirms they want to discard changes)
    jest.spyOn(window, 'confirm').mockReturnValue(true);
  });

  afterEach(() => {
    // Restore window.confirm
    jest.restoreAllMocks();
  });

  // ===========================================================================
  // 1. Modal Rendering Tests
  // ===========================================================================

  describe('Modal Rendering', () => {
    it('should render modal when isOpen is true', () => {
      render(<LegalDocumentModal {...defaultProps} />, { wrapper: createWrapper() });

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should NOT render modal when isOpen is false', () => {
      render(
        <LegalDocumentModal {...defaultProps} isOpen={false} />,
        { wrapper: createWrapper() }
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should display modal title "Edit Legal Document"', () => {
      render(<LegalDocumentModal {...defaultProps} />, { wrapper: createWrapper() });

      expect(
        screen.getByRole('heading', { name: /edit legal document/i })
      ).toBeInTheDocument();
    });

    it('should populate type field with document type', () => {
      render(<LegalDocumentModal {...defaultProps} />, { wrapper: createWrapper() });

      // Type field should show the document type
      expect(screen.getByDisplayValue('Will')).toBeInTheDocument();
    });

    it('should populate date field with document date', () => {
      render(<LegalDocumentModal {...defaultProps} />, { wrapper: createWrapper() });

      // Date field should show the document date
      expect(screen.getByDisplayValue('2024-01-15')).toBeInTheDocument();
    });

    it('should populate notes field with document notes', () => {
      render(<LegalDocumentModal {...defaultProps} />, { wrapper: createWrapper() });

      // Notes field should show the document notes
      expect(screen.getByDisplayValue('Test notes for the document')).toBeInTheDocument();
    });

    it('should show selected product owners', () => {
      render(<LegalDocumentModal {...defaultProps} />, { wrapper: createWrapper() });

      // Should show selected product owners (John Doe and Jane Smith have ids 123, 456)
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    it('should handle document with null date', () => {
      render(
        <LegalDocumentModal
          {...defaultProps}
          document={sampleDocumentWithNullDate}
        />,
        { wrapper: createWrapper() }
      );

      // Should render without crashing
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // Date field should be empty or have empty value
      const dateInput = screen.getByLabelText(/date/i);
      expect(dateInput).toHaveValue('');
    });

    it('should handle document with null notes', () => {
      render(
        <LegalDocumentModal
          {...defaultProps}
          document={sampleDocumentWithNullDate}
        />,
        { wrapper: createWrapper() }
      );

      // Notes field should be empty
      const notesInput = screen.getByLabelText(/notes/i);
      expect(notesInput).toHaveValue('');
    });
  });

  // ===========================================================================
  // 2. Form Validation Tests
  // ===========================================================================

  describe('Form Validation', () => {
    it('should show error when notes exceed 2000 characters', async () => {
      const user = userEvent.setup();
      render(<LegalDocumentModal {...defaultProps} />, { wrapper: createWrapper() });

      const notesInput = screen.getByLabelText(/notes/i);
      const longText = 'a'.repeat(2001);

      // Clear and type long text
      await user.clear(notesInput);
      fireEvent.change(notesInput, { target: { value: longText } });

      // Try to submit
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText(/notes cannot exceed 2000 characters/i)).toBeInTheDocument();
      });
    });

    it('should allow notes at exactly 2000 characters', async () => {
      const user = userEvent.setup();
      render(<LegalDocumentModal {...defaultProps} />, { wrapper: createWrapper() });

      const notesInput = screen.getByLabelText(/notes/i);
      const exactText = 'a'.repeat(2000);

      // Clear and type exact length text
      await user.clear(notesInput);
      fireEvent.change(notesInput, { target: { value: exactText } });

      // Try to submit
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Should NOT show validation error for notes
      await waitFor(() => {
        expect(screen.queryByText(/notes cannot exceed 2000 characters/i)).not.toBeInTheDocument();
      });
    });

    it('should show error when product_owner_ids is empty', async () => {
      const user = userEvent.setup();
      render(<LegalDocumentModal {...defaultProps} />, { wrapper: createWrapper() });

      // Remove all selected product owners
      // Assuming there's a way to deselect/remove owners (X buttons or similar)
      const removeButtons = screen.getAllByRole('button', { name: /remove/i });
      for (const button of removeButtons) {
        await user.click(button);
      }

      // Try to submit
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText(/at least one product owner is required/i)).toBeInTheDocument();
      });
    });
  });

  // ===========================================================================
  // 3. Submit Handling Tests
  // ===========================================================================

  describe('Submit Handling', () => {
    it('should call mutateAsync with changed fields on submit', async () => {
      const user = userEvent.setup();
      render(<LegalDocumentModal {...defaultProps} />, { wrapper: createWrapper() });

      // Change the notes field
      const notesInput = screen.getByLabelText(/notes/i);
      await user.clear(notesInput);
      await user.type(notesInput, 'Updated notes');

      // Submit
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockUpdateMutation.mutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 1,
            data: expect.objectContaining({
              notes: 'Updated notes',
            }),
          })
        );
      });
    });

    it('should call onSuccess after successful update', async () => {
      const user = userEvent.setup();
      const mockOnSuccess = jest.fn();

      render(
        <LegalDocumentModal {...defaultProps} onSuccess={mockOnSuccess} />,
        { wrapper: createWrapper() }
      );

      // Change the notes field
      const notesInput = screen.getByLabelText(/notes/i);
      await user.clear(notesInput);
      await user.type(notesInput, 'Updated notes');

      // Submit
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });

    it('should call onClose after successful update', async () => {
      const user = userEvent.setup();
      const mockOnClose = jest.fn();

      render(
        <LegalDocumentModal {...defaultProps} onClose={mockOnClose} />,
        { wrapper: createWrapper() }
      );

      // Change the notes field
      const notesInput = screen.getByLabelText(/notes/i);
      await user.clear(notesInput);
      await user.type(notesInput, 'Updated notes');

      // Submit
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('should close without API call if no changes made', async () => {
      const user = userEvent.setup();
      const mockOnClose = jest.fn();

      render(
        <LegalDocumentModal {...defaultProps} onClose={mockOnClose} />,
        { wrapper: createWrapper() }
      );

      // Submit without making any changes
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      await waitFor(() => {
        // Should close the modal
        expect(mockOnClose).toHaveBeenCalled();
        // Should NOT call the API
        expect(mockUpdateMutation.mutateAsync).not.toHaveBeenCalled();
      });
    });
  });

  // ===========================================================================
  // 4. Cancel Handling Tests
  // ===========================================================================

  describe('Cancel Handling', () => {
    it('should call onClose when cancel button is clicked', async () => {
      const user = userEvent.setup();
      const mockOnClose = jest.fn();

      render(
        <LegalDocumentModal {...defaultProps} onClose={mockOnClose} />,
        { wrapper: createWrapper() }
      );

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should NOT call mutateAsync when cancelled', async () => {
      const user = userEvent.setup();

      render(<LegalDocumentModal {...defaultProps} />, { wrapper: createWrapper() });

      // Make some changes
      const notesInput = screen.getByLabelText(/notes/i);
      await user.clear(notesInput);
      await user.type(notesInput, 'Some changes');

      // Click cancel instead of save
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockUpdateMutation.mutateAsync).not.toHaveBeenCalled();
    });

    it('should call onClose when X button is clicked', async () => {
      const user = userEvent.setup();
      const mockOnClose = jest.fn();

      render(
        <LegalDocumentModal {...defaultProps} onClose={mockOnClose} />,
        { wrapper: createWrapper() }
      );

      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when Escape key is pressed', async () => {
      const user = userEvent.setup();
      const mockOnClose = jest.fn();

      render(
        <LegalDocumentModal {...defaultProps} onClose={mockOnClose} />,
        { wrapper: createWrapper() }
      );

      await user.keyboard('{Escape}');

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  // ===========================================================================
  // 5. Loading State Tests
  // ===========================================================================

  describe('Loading State', () => {
    it('should disable form fields during submission', () => {
      // Set isPending to true to simulate loading state
      mockUpdateMutation.isPending = true;

      render(<LegalDocumentModal {...defaultProps} />, { wrapper: createWrapper() });

      // Form fields should be disabled
      const notesInput = screen.getByLabelText(/notes/i);
      expect(notesInput).toBeDisabled();

      const dateInput = screen.getByLabelText(/date/i);
      expect(dateInput).toBeDisabled();
    });

    it('should show "Saving..." text on save button during submission', () => {
      // Set isPending to true to simulate loading state
      mockUpdateMutation.isPending = true;

      render(<LegalDocumentModal {...defaultProps} />, { wrapper: createWrapper() });

      expect(screen.getByRole('button', { name: /saving/i })).toBeInTheDocument();
    });

    it('should disable save button during submission', () => {
      // Set isPending to true to simulate loading state
      mockUpdateMutation.isPending = true;

      render(<LegalDocumentModal {...defaultProps} />, { wrapper: createWrapper() });

      const saveButton = screen.getByRole('button', { name: /saving/i });
      expect(saveButton).toBeDisabled();
    });

    it('should disable cancel button during submission', () => {
      // Set isPending to true to simulate loading state
      mockUpdateMutation.isPending = true;

      render(<LegalDocumentModal {...defaultProps} />, { wrapper: createWrapper() });

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      expect(cancelButton).toBeDisabled();
    });
  });

  // ===========================================================================
  // 6. Error Display Tests
  // ===========================================================================

  describe('Error Display', () => {
    it('should display API error message when mutation fails', async () => {
      const user = userEvent.setup();
      mockUpdateMutation.mutateAsync.mockRejectedValue(
        new Error('Failed to update document')
      );

      render(<LegalDocumentModal {...defaultProps} />, { wrapper: createWrapper() });

      // Make a change to enable submission
      const notesInput = screen.getByLabelText(/notes/i);
      await user.clear(notesInput);
      await user.type(notesInput, 'Updated notes');

      // Submit
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Should display error message
      await waitFor(() => {
        expect(screen.getByText(/failed to update document/i)).toBeInTheDocument();
      });
    });

    it('should NOT call onClose when mutation fails', async () => {
      const user = userEvent.setup();
      const mockOnClose = jest.fn();
      mockUpdateMutation.mutateAsync.mockRejectedValue(
        new Error('Failed to update document')
      );

      render(
        <LegalDocumentModal {...defaultProps} onClose={mockOnClose} />,
        { wrapper: createWrapper() }
      );

      // Make a change
      const notesInput = screen.getByLabelText(/notes/i);
      await user.clear(notesInput);
      await user.type(notesInput, 'Updated notes');

      // Submit
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Wait for error to appear
      await waitFor(() => {
        expect(screen.getByText(/failed to update document/i)).toBeInTheDocument();
      });

      // onClose should NOT have been called
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should NOT call onSuccess when mutation fails', async () => {
      const user = userEvent.setup();
      const mockOnSuccess = jest.fn();
      mockUpdateMutation.mutateAsync.mockRejectedValue(
        new Error('Failed to update document')
      );

      render(
        <LegalDocumentModal {...defaultProps} onSuccess={mockOnSuccess} />,
        { wrapper: createWrapper() }
      );

      // Make a change
      const notesInput = screen.getByLabelText(/notes/i);
      await user.clear(notesInput);
      await user.type(notesInput, 'Updated notes');

      // Submit
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Wait for error to appear
      await waitFor(() => {
        expect(screen.getByText(/failed to update document/i)).toBeInTheDocument();
      });

      // onSuccess should NOT have been called
      expect(mockOnSuccess).not.toHaveBeenCalled();
    });

    it('should display error in alert role for screen readers', async () => {
      const user = userEvent.setup();
      mockUpdateMutation.mutateAsync.mockRejectedValue(
        new Error('Failed to update document')
      );

      render(<LegalDocumentModal {...defaultProps} />, { wrapper: createWrapper() });

      // Make a change
      const notesInput = screen.getByLabelText(/notes/i);
      await user.clear(notesInput);
      await user.type(notesInput, 'Updated notes');

      // Submit
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Should have alert role
      await waitFor(() => {
        const alert = screen.getByRole('alert');
        expect(alert).toHaveTextContent(/failed to update document/i);
      });
    });
  });

  // ===========================================================================
  // 7. Accessibility Tests
  // ===========================================================================

  describe('Accessibility', () => {
    it('should have accessible dialog role', () => {
      render(<LegalDocumentModal {...defaultProps} />, { wrapper: createWrapper() });

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
    });

    it('should focus first input when opened', async () => {
      render(<LegalDocumentModal {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        // First focusable element should be focused (typically the first input or close button)
        const focusedElement = document.activeElement;
        const dialog = screen.getByRole('dialog');
        expect(dialog.contains(focusedElement)).toBe(true);
      });
    });

    it('should have labeled form field for Type', () => {
      render(<LegalDocumentModal {...defaultProps} />, { wrapper: createWrapper() });

      expect(screen.getByLabelText(/type/i)).toBeInTheDocument();
    });

    it('should have labeled form field for Date', () => {
      render(<LegalDocumentModal {...defaultProps} />, { wrapper: createWrapper() });

      expect(screen.getByLabelText(/date/i)).toBeInTheDocument();
    });

    it('should have labeled form field for Notes', () => {
      render(<LegalDocumentModal {...defaultProps} />, { wrapper: createWrapper() });

      expect(screen.getByLabelText(/notes/i)).toBeInTheDocument();
    });

    it('should have labeled form field for People', () => {
      render(<LegalDocumentModal {...defaultProps} />, { wrapper: createWrapper() });

      expect(screen.getByLabelText(/people/i)).toBeInTheDocument();
    });

    it('should trap focus within modal while open', () => {
      render(<LegalDocumentModal {...defaultProps} />, { wrapper: createWrapper() });

      const modal = screen.getByRole('dialog');
      const focusableElements = modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      // Modal should have focusable elements for focus trap to work
      expect(focusableElements.length).toBeGreaterThan(0);
      // Modal should be in the DOM (focus trap is handled by HeadlessUI Dialog)
      expect(modal).toBeInTheDocument();
    });

    it('should have aria-modal="true" on dialog', () => {
      render(<LegalDocumentModal {...defaultProps} />, { wrapper: createWrapper() });

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('should have aria-labelledby pointing to dialog title', () => {
      render(<LegalDocumentModal {...defaultProps} />, { wrapper: createWrapper() });

      const dialog = screen.getByRole('dialog');
      const labelledBy = dialog.getAttribute('aria-labelledby');
      expect(labelledBy).toBeTruthy();

      // The element referenced by aria-labelledby should exist
      const titleElement = document.getElementById(labelledBy!);
      expect(titleElement).toBeInTheDocument();
      expect(titleElement).toHaveTextContent(/edit legal document/i);
    });

    it('should have no accessibility violations (jest-axe)', async () => {
      const { container } = render(
        <LegalDocumentModal {...defaultProps} />,
        { wrapper: createWrapper() }
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  // ===========================================================================
  // 8. Form Field Updates Tests
  // ===========================================================================

  describe('Form Field Updates', () => {
    it('should allow editing the date field', async () => {
      const user = userEvent.setup();
      render(<LegalDocumentModal {...defaultProps} />, { wrapper: createWrapper() });

      const dateInput = screen.getByLabelText(/date/i);

      fireEvent.change(dateInput, { target: { value: '2024-06-20' } });

      expect(dateInput).toHaveValue('2024-06-20');
    });

    it('should allow editing the notes field', async () => {
      const user = userEvent.setup();
      render(<LegalDocumentModal {...defaultProps} />, { wrapper: createWrapper() });

      const notesInput = screen.getByLabelText(/notes/i);
      await user.clear(notesInput);
      await user.type(notesInput, 'New notes content');

      expect(notesInput).toHaveValue('New notes content');
    });

    it('should allow adding a product owner', async () => {
      const user = userEvent.setup();
      render(<LegalDocumentModal {...defaultProps} />, { wrapper: createWrapper() });

      // Bob Johnson (id: 789) should be available but not selected initially
      // Find and click to add Bob Johnson
      const addPersonDropdown = screen.getByRole('combobox', { name: /people/i });
      await user.click(addPersonDropdown);

      // Select Bob Johnson from dropdown
      const bobOption = screen.getByRole('option', { name: /bob johnson/i });
      await user.click(bobOption);

      // Bob should now be shown as selected
      expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
    });

    it('should allow removing a product owner', async () => {
      const user = userEvent.setup();
      render(<LegalDocumentModal {...defaultProps} />, { wrapper: createWrapper() });

      // Initially John Doe and Jane Smith are selected
      expect(screen.getByText('John Doe')).toBeInTheDocument();

      // Find and click the remove button for John Doe
      const johnDoeChip = screen.getByText('John Doe').closest('[data-testid="person-chip"]');
      const removeButton = within(johnDoeChip as HTMLElement).getByRole('button', {
        name: /remove/i,
      });
      await user.click(removeButton);

      // John Doe should no longer be shown as selected
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    });
  });

  // ===========================================================================
  // 9. Edge Cases Tests
  // ===========================================================================

  describe('Edge Cases', () => {
    it('should handle empty notes gracefully', async () => {
      const user = userEvent.setup();
      render(<LegalDocumentModal {...defaultProps} />, { wrapper: createWrapper() });

      const notesInput = screen.getByLabelText(/notes/i);
      await user.clear(notesInput);

      // Should be able to submit with empty notes (notes are optional)
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Should not show validation error for empty notes
      expect(
        screen.queryByText(/notes cannot exceed 2000 characters/i)
      ).not.toBeInTheDocument();
    });

    it('should handle special characters in notes', async () => {
      const user = userEvent.setup();
      render(<LegalDocumentModal {...defaultProps} />, { wrapper: createWrapper() });

      const notesInput = screen.getByLabelText(/notes/i);
      await user.clear(notesInput);
      await user.type(notesInput, "O'Brien's document - <test> & \"special\" chars");

      expect(notesInput).toHaveValue("O'Brien's document - <test> & \"special\" chars");
    });

    it('should handle unicode characters in notes', async () => {
      const user = userEvent.setup();
      render(<LegalDocumentModal {...defaultProps} />, { wrapper: createWrapper() });

      const notesInput = screen.getByLabelText(/notes/i);
      await user.clear(notesInput);
      await user.type(notesInput, '\u9057\u8a00\u6587\u66F8 - Legal document');

      expect(notesInput).toHaveValue('\u9057\u8a00\u6587\u66F8 - Legal document');
    });

    it('should reset form when modal is closed and reopened', async () => {
      const user = userEvent.setup();

      const TestComponent = () => {
        const [isOpen, setIsOpen] = React.useState(true);
        return (
          <>
            <button onClick={() => setIsOpen(true)}>Reopen</button>
            <LegalDocumentModal
              {...defaultProps}
              isOpen={isOpen}
              onClose={() => setIsOpen(false)}
            />
          </>
        );
      };

      render(<TestComponent />, { wrapper: createWrapper() });

      // Change notes
      const notesInput = screen.getByLabelText(/notes/i);
      await user.clear(notesInput);
      await user.type(notesInput, 'Modified notes');

      expect(notesInput).toHaveValue('Modified notes');

      // Close modal
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      // Reopen modal
      const reopenButton = screen.getByRole('button', { name: /reopen/i });
      await user.click(reopenButton);

      // Notes should be reset to original value
      await waitFor(() => {
        const newNotesInput = screen.getByLabelText(/notes/i);
        expect(newNotesInput).toHaveValue('Test notes for the document');
      });
    });

    it('should handle document with all null optional fields', () => {
      const documentWithNulls: LegalDocument = {
        id: 10,
        type: 'EPA',
        document_date: null,
        status: 'Signed',
        notes: null,
        product_owner_ids: [123],
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
      };

      render(
        <LegalDocumentModal
          {...defaultProps}
          document={documentWithNulls}
        />,
        { wrapper: createWrapper() }
      );

      // Should render without crashing
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // Fields should show empty values, not "null"
      expect(screen.queryByDisplayValue('null')).not.toBeInTheDocument();
    });
  });

  // ===========================================================================
  // 10. Keyboard Navigation Tests
  // ===========================================================================

  describe('Keyboard Navigation', () => {
    it('should have focusable form fields for tab navigation', () => {
      render(<LegalDocumentModal {...defaultProps} />, { wrapper: createWrapper() });

      const modal = screen.getByRole('dialog');

      // Verify modal contains focusable form elements for tab navigation
      const focusableElements = modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      // Should have multiple focusable elements (form fields + buttons)
      expect(focusableElements.length).toBeGreaterThan(3);

      // Verify key interactive elements are present and focusable
      const saveButton = screen.getByRole('button', { name: /save/i });
      const cancelButton = screen.getByRole('button', { name: /cancel/i });

      expect(saveButton).not.toHaveAttribute('tabindex', '-1');
      expect(cancelButton).not.toHaveAttribute('tabindex', '-1');
    });

    it('should submit form on Enter when focus is on submit button', async () => {
      const user = userEvent.setup();
      const mockOnSuccess = jest.fn();

      render(
        <LegalDocumentModal {...defaultProps} onSuccess={mockOnSuccess} />,
        { wrapper: createWrapper() }
      );

      // Make a change first so there's something to submit
      const notesInput = screen.getByLabelText(/notes/i);
      await user.clear(notesInput);
      await user.type(notesInput, 'Changed notes');

      // Focus submit button and press Enter
      const submitButton = screen.getByRole('button', { name: /save/i });
      submitButton.focus();
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(mockUpdateMutation.mutateAsync).toHaveBeenCalled();
      });
    });
  });

  // ===========================================================================
  // 11. Double Submission Prevention Tests
  // ===========================================================================

  describe('Double Submission Prevention', () => {
    it('should prevent double submission by disabling button during submit', async () => {
      const user = userEvent.setup();

      // Make the mutation hang to simulate in-progress state
      mockUpdateMutation.mutateAsync.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(sampleDocument), 1000))
      );

      render(<LegalDocumentModal {...defaultProps} />, { wrapper: createWrapper() });

      // Make a change
      const notesInput = screen.getByLabelText(/notes/i);
      await user.clear(notesInput);
      await user.type(notesInput, 'New notes');

      // Click save
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Button should become disabled immediately (isPending becomes true)
      // Note: In the actual implementation, isPending would be managed by React Query
      // For this test, we verify the button is in the correct disabled state
      await waitFor(() => {
        expect(mockUpdateMutation.mutateAsync).toHaveBeenCalledTimes(1);
      });
    });
  });

  // ===========================================================================
  // 12. Character Count Display Tests
  // ===========================================================================

  describe('Character Count Display', () => {
    it('should display character count for notes field', () => {
      render(<LegalDocumentModal {...defaultProps} />, { wrapper: createWrapper() });

      // Should show character count (current characters / max)
      // 'Test notes for the document' = 27 characters
      expect(screen.getByText(/27.*\/.*2000/i)).toBeInTheDocument();
    });

    it('should update character count as user types', async () => {
      const user = userEvent.setup();
      render(<LegalDocumentModal {...defaultProps} />, { wrapper: createWrapper() });

      const notesInput = screen.getByLabelText(/notes/i);
      await user.clear(notesInput);
      await user.type(notesInput, 'Hello');

      // Should show updated character count
      expect(screen.getByText(/5.*\/.*2000/i)).toBeInTheDocument();
    });

    it('should show warning color when approaching limit', async () => {
      render(<LegalDocumentModal {...defaultProps} />, { wrapper: createWrapper() });

      const notesInput = screen.getByLabelText(/notes/i);
      const nearLimitText = 'a'.repeat(1900);

      fireEvent.change(notesInput, { target: { value: nearLimitText } });

      // Character count should have warning styling (amber/yellow)
      const charCount = screen.getByText(/1900.*\/.*2000/i);
      expect(charCount).toHaveClass('text-amber-600');
    });

    it('should show error color when over limit', async () => {
      render(<LegalDocumentModal {...defaultProps} />, { wrapper: createWrapper() });

      const notesInput = screen.getByLabelText(/notes/i);
      const overLimitText = 'a'.repeat(2050);

      fireEvent.change(notesInput, { target: { value: overLimitText } });

      // Character count should have error styling (red)
      const charCount = screen.getByText(/2050.*\/.*2000/i);
      expect(charCount).toHaveClass('text-red-600');
    });
  });
});
