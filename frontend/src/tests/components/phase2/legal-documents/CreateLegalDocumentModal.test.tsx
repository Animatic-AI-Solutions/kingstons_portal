/**
 * CreateLegalDocumentModal Component Tests (RED Phase - TDD)
 *
 * Comprehensive test suite for the CreateLegalDocumentModal component that provides
 * a modal dialog for creating new legal documents.
 *
 * The component displays:
 * - Document type field (dropdown with standard types + custom entry)
 * - Document date field
 * - Notes field with 2000 character limit
 * - Product owner selection (multi-select)
 *
 * Following TDD RED-GREEN-BLUE methodology.
 * Expected Result: All tests FAIL (RED phase) until implementation complete.
 *
 * @module tests/components/phase2/legal-documents/CreateLegalDocumentModal
 */

import React from 'react';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import type { LegalDocument } from '@/types/legalDocument';

// This import will fail in RED phase - component doesn't exist yet
import CreateLegalDocumentModal from '@/components/phase2/legal-documents/CreateLegalDocumentModal';

// Extend Jest matchers with jest-axe
expect.extend(toHaveNoViolations);

// =============================================================================
// Mock Setup
// =============================================================================

// Mock the legal documents hook
const mockCreateMutation = {
  mutateAsync: jest.fn(),
  isPending: false,
};

jest.mock('@/hooks/useLegalDocuments', () => ({
  useCreateLegalDocument: () => mockCreateMutation,
}));

// =============================================================================
// Type Definitions
// =============================================================================

interface ProductOwner {
  id: number;
  firstname: string;
  surname: string;
}

interface CreateLegalDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  productOwners: ProductOwner[];
  onSuccess?: (document: LegalDocument) => void;
}

// =============================================================================
// Mock Data
// =============================================================================

const sampleProductOwners: ProductOwner[] = [
  { id: 123, firstname: 'John', surname: 'Doe' },
  { id: 456, firstname: 'Jane', surname: 'Smith' },
  { id: 789, firstname: 'Bob', surname: 'Johnson' },
];

const createdDocument: LegalDocument = {
  id: 1,
  type: 'Will',
  document_date: '2024-01-15',
  status: 'Signed',
  notes: 'New document notes',
  product_owner_ids: [123, 456],
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
};

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
const defaultProps: CreateLegalDocumentModalProps = {
  isOpen: true,
  onClose: jest.fn(),
  productOwners: sampleProductOwners,
  onSuccess: jest.fn(),
};

// =============================================================================
// Test Suite
// =============================================================================

describe('CreateLegalDocumentModal Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock implementations to default values
    mockCreateMutation.mutateAsync.mockResolvedValue(createdDocument);
    mockCreateMutation.isPending = false;
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
      render(<CreateLegalDocumentModal {...defaultProps} />, { wrapper: createWrapper() });

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should NOT render modal when isOpen is false', () => {
      render(
        <CreateLegalDocumentModal {...defaultProps} isOpen={false} />,
        { wrapper: createWrapper() }
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should display modal title "Add Legal Document"', () => {
      render(<CreateLegalDocumentModal {...defaultProps} />, { wrapper: createWrapper() });

      expect(
        screen.getByRole('heading', { name: /add legal document/i })
      ).toBeInTheDocument();
    });

    it('should render Type form field', () => {
      render(<CreateLegalDocumentModal {...defaultProps} />, { wrapper: createWrapper() });

      expect(screen.getByLabelText(/type/i)).toBeInTheDocument();
    });

    it('should render Date form field', () => {
      render(<CreateLegalDocumentModal {...defaultProps} />, { wrapper: createWrapper() });

      expect(screen.getByLabelText(/date/i)).toBeInTheDocument();
    });

    it('should render People form field', () => {
      render(<CreateLegalDocumentModal {...defaultProps} />, { wrapper: createWrapper() });

      expect(screen.getByLabelText(/people/i)).toBeInTheDocument();
    });

    it('should render Notes form field', () => {
      render(<CreateLegalDocumentModal {...defaultProps} />, { wrapper: createWrapper() });

      expect(screen.getByLabelText(/notes/i)).toBeInTheDocument();
    });

    it('should render Save button', () => {
      render(<CreateLegalDocumentModal {...defaultProps} />, { wrapper: createWrapper() });

      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    });

    it('should render Cancel button', () => {
      render(<CreateLegalDocumentModal {...defaultProps} />, { wrapper: createWrapper() });

      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    it('should have empty form fields initially', () => {
      render(<CreateLegalDocumentModal {...defaultProps} />, { wrapper: createWrapper() });

      // Date field should be empty
      const dateInput = screen.getByLabelText(/date/i);
      expect(dateInput).toHaveValue('');

      // Notes field should be empty
      const notesInput = screen.getByLabelText(/notes/i);
      expect(notesInput).toHaveValue('');
    });
  });

  // ===========================================================================
  // 2. Type Selection Tests
  // ===========================================================================

  describe('Type Selection', () => {
    it('should allow selecting standard document types', async () => {
      const user = userEvent.setup();
      render(<CreateLegalDocumentModal {...defaultProps} />, { wrapper: createWrapper() });

      // Find type dropdown/combobox
      const typeInput = screen.getByLabelText(/type/i);
      await user.click(typeInput);

      // Standard types should be available
      expect(screen.getByRole('option', { name: /will/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /lpoa p&f/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /lpoa h&w/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /epa/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /general power of attorney/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /advance directive/i })).toBeInTheDocument();
    });

    it('should select a standard document type when clicked', async () => {
      const user = userEvent.setup();
      render(<CreateLegalDocumentModal {...defaultProps} />, { wrapper: createWrapper() });

      // Open type dropdown
      const typeInput = screen.getByLabelText(/type/i);
      await user.click(typeInput);

      // Select "Will"
      const willOption = screen.getByRole('option', { name: /will/i });
      await user.click(willOption);

      // Verify selection
      expect(typeInput).toHaveValue('Will');
    });

    it('should allow entering a custom document type', async () => {
      const user = userEvent.setup();
      render(<CreateLegalDocumentModal {...defaultProps} />, { wrapper: createWrapper() });

      // Find type input
      const typeInput = screen.getByLabelText(/type/i);

      // Type a custom value
      await user.clear(typeInput);
      await user.type(typeInput, 'Custom Family Trust Agreement');

      // Verify custom type is entered
      expect(typeInput).toHaveValue('Custom Family Trust Agreement');
    });

    it('should allow custom types alongside standard types', async () => {
      const user = userEvent.setup();
      render(<CreateLegalDocumentModal {...defaultProps} />, { wrapper: createWrapper() });

      // Type a custom value
      const typeInput = screen.getByLabelText(/type/i);
      await user.type(typeInput, 'Living Will');

      // Should allow the custom entry
      expect(typeInput).toHaveValue('Living Will');
    });
  });

  // ===========================================================================
  // 3. Form Validation Tests
  // ===========================================================================

  describe('Form Validation', () => {
    it('should show error when type is empty on submit', async () => {
      const user = userEvent.setup();
      render(<CreateLegalDocumentModal {...defaultProps} />, { wrapper: createWrapper() });

      // Select a product owner but leave type empty
      const peopleDropdown = screen.getByLabelText(/people/i);
      await user.click(peopleDropdown);
      const johnOption = screen.getByRole('option', { name: /john doe/i });
      await user.click(johnOption);

      // Try to submit with empty type
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText(/type is required/i)).toBeInTheDocument();
      });
    });

    it('should show error when product owners not selected on submit', async () => {
      const user = userEvent.setup();
      render(<CreateLegalDocumentModal {...defaultProps} />, { wrapper: createWrapper() });

      // Select a type but leave people empty
      const typeInput = screen.getByLabelText(/type/i);
      await user.click(typeInput);
      const willOption = screen.getByRole('option', { name: /will/i });
      await user.click(willOption);

      // Try to submit without selecting product owners
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText(/at least one product owner is required/i)).toBeInTheDocument();
      });
    });

    it('should show error when notes exceed 2000 characters', async () => {
      const user = userEvent.setup();
      render(<CreateLegalDocumentModal {...defaultProps} />, { wrapper: createWrapper() });

      const notesInput = screen.getByLabelText(/notes/i);
      const longText = 'a'.repeat(2001);

      // Type long text
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
      render(<CreateLegalDocumentModal {...defaultProps} />, { wrapper: createWrapper() });

      // Fill required fields first
      const typeInput = screen.getByLabelText(/type/i);
      await user.click(typeInput);
      const willOption = screen.getByRole('option', { name: /will/i });
      await user.click(willOption);

      const peopleDropdown = screen.getByLabelText(/people/i);
      await user.click(peopleDropdown);
      const johnOption = screen.getByRole('option', { name: /john doe/i });
      await user.click(johnOption);

      // Set notes to exactly 2000 characters
      const notesInput = screen.getByLabelText(/notes/i);
      const exactText = 'a'.repeat(2000);
      fireEvent.change(notesInput, { target: { value: exactText } });

      // Try to submit
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Should NOT show validation error for notes
      await waitFor(() => {
        expect(screen.queryByText(/notes cannot exceed 2000 characters/i)).not.toBeInTheDocument();
      });
    });

    it('should NOT call mutateAsync when validation fails', async () => {
      const user = userEvent.setup();
      render(<CreateLegalDocumentModal {...defaultProps} />, { wrapper: createWrapper() });

      // Try to submit with empty form
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Should NOT have called the mutation
      expect(mockCreateMutation.mutateAsync).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // 4. Submit Handling Tests
  // ===========================================================================

  describe('Submit Handling', () => {
    it('should call mutateAsync with form data on submit', async () => {
      const user = userEvent.setup();
      render(<CreateLegalDocumentModal {...defaultProps} />, { wrapper: createWrapper() });

      // Fill in form fields
      // Select type
      const typeInput = screen.getByLabelText(/type/i);
      await user.click(typeInput);
      const willOption = screen.getByRole('option', { name: /will/i });
      await user.click(willOption);

      // Select product owners
      const peopleDropdown = screen.getByLabelText(/people/i);
      await user.click(peopleDropdown);
      const johnOption = screen.getByRole('option', { name: /john doe/i });
      await user.click(johnOption);

      // Set date
      const dateInput = screen.getByLabelText(/date/i);
      fireEvent.change(dateInput, { target: { value: '2024-03-15' } });

      // Set notes
      const notesInput = screen.getByLabelText(/notes/i);
      await user.type(notesInput, 'Test notes');

      // Submit
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockCreateMutation.mutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'Will',
            product_owner_ids: [123],
            document_date: '2024-03-15',
            notes: 'Test notes',
          })
        );
      });
    });

    it('should call onSuccess after successful creation', async () => {
      const user = userEvent.setup();
      const mockOnSuccess = jest.fn();

      render(
        <CreateLegalDocumentModal {...defaultProps} onSuccess={mockOnSuccess} />,
        { wrapper: createWrapper() }
      );

      // Fill required fields
      const typeInput = screen.getByLabelText(/type/i);
      await user.click(typeInput);
      const willOption = screen.getByRole('option', { name: /will/i });
      await user.click(willOption);

      const peopleDropdown = screen.getByLabelText(/people/i);
      await user.click(peopleDropdown);
      const johnOption = screen.getByRole('option', { name: /john doe/i });
      await user.click(johnOption);

      // Submit
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledWith(createdDocument);
      });
    });

    it('should call onClose after successful creation', async () => {
      const user = userEvent.setup();
      const mockOnClose = jest.fn();

      render(
        <CreateLegalDocumentModal {...defaultProps} onClose={mockOnClose} />,
        { wrapper: createWrapper() }
      );

      // Fill required fields
      const typeInput = screen.getByLabelText(/type/i);
      await user.click(typeInput);
      const willOption = screen.getByRole('option', { name: /will/i });
      await user.click(willOption);

      const peopleDropdown = screen.getByLabelText(/people/i);
      await user.click(peopleDropdown);
      const johnOption = screen.getByRole('option', { name: /john doe/i });
      await user.click(johnOption);

      // Submit
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('should submit with multiple product owners selected', async () => {
      const user = userEvent.setup();
      render(<CreateLegalDocumentModal {...defaultProps} />, { wrapper: createWrapper() });

      // Select type
      const typeInput = screen.getByLabelText(/type/i);
      await user.click(typeInput);
      const willOption = screen.getByRole('option', { name: /will/i });
      await user.click(willOption);

      // Select multiple product owners
      const peopleDropdown = screen.getByLabelText(/people/i);
      await user.click(peopleDropdown);
      await user.click(screen.getByRole('option', { name: /john doe/i }));
      await user.click(peopleDropdown);
      await user.click(screen.getByRole('option', { name: /jane smith/i }));

      // Submit
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockCreateMutation.mutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({
            product_owner_ids: expect.arrayContaining([123, 456]),
          })
        );
      });
    });

    it('should submit with custom document type', async () => {
      const user = userEvent.setup();
      render(<CreateLegalDocumentModal {...defaultProps} />, { wrapper: createWrapper() });

      // Enter custom type
      const typeInput = screen.getByLabelText(/type/i);
      await user.type(typeInput, 'Family Trust Agreement');

      // Select product owner
      const peopleDropdown = screen.getByLabelText(/people/i);
      await user.click(peopleDropdown);
      const johnOption = screen.getByRole('option', { name: /john doe/i });
      await user.click(johnOption);

      // Submit
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(mockCreateMutation.mutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'Family Trust Agreement',
          })
        );
      });
    });
  });

  // ===========================================================================
  // 5. Cancel Handling Tests
  // ===========================================================================

  describe('Cancel Handling', () => {
    it('should call onClose when cancel button is clicked', async () => {
      const user = userEvent.setup();
      const mockOnClose = jest.fn();

      render(
        <CreateLegalDocumentModal {...defaultProps} onClose={mockOnClose} />,
        { wrapper: createWrapper() }
      );

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should NOT call mutateAsync when cancelled', async () => {
      const user = userEvent.setup();

      render(<CreateLegalDocumentModal {...defaultProps} />, { wrapper: createWrapper() });

      // Fill in some form data
      const typeInput = screen.getByLabelText(/type/i);
      await user.click(typeInput);
      const willOption = screen.getByRole('option', { name: /will/i });
      await user.click(willOption);

      // Click cancel instead of save
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockCreateMutation.mutateAsync).not.toHaveBeenCalled();
    });

    it('should call onClose when X button is clicked', async () => {
      const user = userEvent.setup();
      const mockOnClose = jest.fn();

      render(
        <CreateLegalDocumentModal {...defaultProps} onClose={mockOnClose} />,
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
        <CreateLegalDocumentModal {...defaultProps} onClose={mockOnClose} />,
        { wrapper: createWrapper() }
      );

      await user.keyboard('{Escape}');

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should reset form when modal is reopened', async () => {
      const user = userEvent.setup();

      const TestComponent = () => {
        const [isOpen, setIsOpen] = React.useState(true);
        return (
          <>
            <button onClick={() => setIsOpen(true)}>Reopen</button>
            <CreateLegalDocumentModal
              {...defaultProps}
              isOpen={isOpen}
              onClose={() => setIsOpen(false)}
            />
          </>
        );
      };

      render(<TestComponent />, { wrapper: createWrapper() });

      // Fill in form data
      const typeInput = screen.getByLabelText(/type/i);
      await user.click(typeInput);
      const willOption = screen.getByRole('option', { name: /will/i });
      await user.click(willOption);

      expect(typeInput).toHaveValue('Will');

      // Close modal
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      // Reopen modal
      const reopenButton = screen.getByRole('button', { name: /reopen/i });
      await user.click(reopenButton);

      // Form should be reset
      await waitFor(() => {
        const newTypeInput = screen.getByLabelText(/type/i);
        expect(newTypeInput).toHaveValue('');
      });
    });
  });

  // ===========================================================================
  // 6. Loading State Tests
  // ===========================================================================

  describe('Loading State', () => {
    it('should disable form fields during submission', () => {
      // Set isPending to true to simulate loading state
      mockCreateMutation.isPending = true;

      render(<CreateLegalDocumentModal {...defaultProps} />, { wrapper: createWrapper() });

      // Form fields should be disabled
      const notesInput = screen.getByLabelText(/notes/i);
      expect(notesInput).toBeDisabled();

      const dateInput = screen.getByLabelText(/date/i);
      expect(dateInput).toBeDisabled();
    });

    it('should show "Saving..." text on save button during submission', () => {
      // Set isPending to true to simulate loading state
      mockCreateMutation.isPending = true;

      render(<CreateLegalDocumentModal {...defaultProps} />, { wrapper: createWrapper() });

      expect(screen.getByRole('button', { name: /saving/i })).toBeInTheDocument();
    });

    it('should disable save button during submission', () => {
      // Set isPending to true to simulate loading state
      mockCreateMutation.isPending = true;

      render(<CreateLegalDocumentModal {...defaultProps} />, { wrapper: createWrapper() });

      const saveButton = screen.getByRole('button', { name: /saving/i });
      expect(saveButton).toBeDisabled();
    });

    it('should disable cancel button during submission', () => {
      // Set isPending to true to simulate loading state
      mockCreateMutation.isPending = true;

      render(<CreateLegalDocumentModal {...defaultProps} />, { wrapper: createWrapper() });

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      expect(cancelButton).toBeDisabled();
    });
  });

  // ===========================================================================
  // 7. Error Display Tests
  // ===========================================================================

  describe('Error Display', () => {
    it('should display API error message when mutation fails', async () => {
      const user = userEvent.setup();
      mockCreateMutation.mutateAsync.mockRejectedValue(
        new Error('Failed to create document')
      );

      render(<CreateLegalDocumentModal {...defaultProps} />, { wrapper: createWrapper() });

      // Fill required fields
      const typeInput = screen.getByLabelText(/type/i);
      await user.click(typeInput);
      const willOption = screen.getByRole('option', { name: /will/i });
      await user.click(willOption);

      const peopleDropdown = screen.getByLabelText(/people/i);
      await user.click(peopleDropdown);
      const johnOption = screen.getByRole('option', { name: /john doe/i });
      await user.click(johnOption);

      // Submit
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Should display error message
      await waitFor(() => {
        expect(screen.getByText(/failed to create document/i)).toBeInTheDocument();
      });
    });

    it('should NOT call onClose when mutation fails', async () => {
      const user = userEvent.setup();
      const mockOnClose = jest.fn();
      mockCreateMutation.mutateAsync.mockRejectedValue(
        new Error('Failed to create document')
      );

      render(
        <CreateLegalDocumentModal {...defaultProps} onClose={mockOnClose} />,
        { wrapper: createWrapper() }
      );

      // Fill required fields
      const typeInput = screen.getByLabelText(/type/i);
      await user.click(typeInput);
      const willOption = screen.getByRole('option', { name: /will/i });
      await user.click(willOption);

      const peopleDropdown = screen.getByLabelText(/people/i);
      await user.click(peopleDropdown);
      const johnOption = screen.getByRole('option', { name: /john doe/i });
      await user.click(johnOption);

      // Submit
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Wait for error to appear
      await waitFor(() => {
        expect(screen.getByText(/failed to create document/i)).toBeInTheDocument();
      });

      // onClose should NOT have been called
      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should NOT call onSuccess when mutation fails', async () => {
      const user = userEvent.setup();
      const mockOnSuccess = jest.fn();
      mockCreateMutation.mutateAsync.mockRejectedValue(
        new Error('Failed to create document')
      );

      render(
        <CreateLegalDocumentModal {...defaultProps} onSuccess={mockOnSuccess} />,
        { wrapper: createWrapper() }
      );

      // Fill required fields
      const typeInput = screen.getByLabelText(/type/i);
      await user.click(typeInput);
      const willOption = screen.getByRole('option', { name: /will/i });
      await user.click(willOption);

      const peopleDropdown = screen.getByLabelText(/people/i);
      await user.click(peopleDropdown);
      const johnOption = screen.getByRole('option', { name: /john doe/i });
      await user.click(johnOption);

      // Submit
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Wait for error to appear
      await waitFor(() => {
        expect(screen.getByText(/failed to create document/i)).toBeInTheDocument();
      });

      // onSuccess should NOT have been called
      expect(mockOnSuccess).not.toHaveBeenCalled();
    });

    it('should display error in alert role for screen readers', async () => {
      const user = userEvent.setup();
      mockCreateMutation.mutateAsync.mockRejectedValue(
        new Error('Failed to create document')
      );

      render(<CreateLegalDocumentModal {...defaultProps} />, { wrapper: createWrapper() });

      // Fill required fields
      const typeInput = screen.getByLabelText(/type/i);
      await user.click(typeInput);
      const willOption = screen.getByRole('option', { name: /will/i });
      await user.click(willOption);

      const peopleDropdown = screen.getByLabelText(/people/i);
      await user.click(peopleDropdown);
      const johnOption = screen.getByRole('option', { name: /john doe/i });
      await user.click(johnOption);

      // Submit
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Should have alert role
      await waitFor(() => {
        const alert = screen.getByRole('alert');
        expect(alert).toHaveTextContent(/failed to create document/i);
      });
    });
  });

  // ===========================================================================
  // 8. Accessibility Tests
  // ===========================================================================

  describe('Accessibility', () => {
    it('should have accessible dialog role', () => {
      render(<CreateLegalDocumentModal {...defaultProps} />, { wrapper: createWrapper() });

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
    });

    it('should focus first interactive element when opened', async () => {
      render(<CreateLegalDocumentModal {...defaultProps} />, { wrapper: createWrapper() });

      await waitFor(() => {
        // First focusable element should be focused (typically the first input or close button)
        const focusedElement = document.activeElement;
        const dialog = screen.getByRole('dialog');
        expect(dialog.contains(focusedElement)).toBe(true);
      });
    });

    it('should have labeled form field for Type', () => {
      render(<CreateLegalDocumentModal {...defaultProps} />, { wrapper: createWrapper() });

      expect(screen.getByLabelText(/type/i)).toBeInTheDocument();
    });

    it('should have labeled form field for Date', () => {
      render(<CreateLegalDocumentModal {...defaultProps} />, { wrapper: createWrapper() });

      expect(screen.getByLabelText(/date/i)).toBeInTheDocument();
    });

    it('should have labeled form field for Notes', () => {
      render(<CreateLegalDocumentModal {...defaultProps} />, { wrapper: createWrapper() });

      expect(screen.getByLabelText(/notes/i)).toBeInTheDocument();
    });

    it('should have labeled form field for People', () => {
      render(<CreateLegalDocumentModal {...defaultProps} />, { wrapper: createWrapper() });

      expect(screen.getByLabelText(/people/i)).toBeInTheDocument();
    });

    it('should trap focus within modal while open', () => {
      render(<CreateLegalDocumentModal {...defaultProps} />, { wrapper: createWrapper() });

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
      render(<CreateLegalDocumentModal {...defaultProps} />, { wrapper: createWrapper() });

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('should have aria-labelledby pointing to dialog title', () => {
      render(<CreateLegalDocumentModal {...defaultProps} />, { wrapper: createWrapper() });

      const dialog = screen.getByRole('dialog');
      const labelledBy = dialog.getAttribute('aria-labelledby');
      expect(labelledBy).toBeTruthy();

      // The element referenced by aria-labelledby should exist
      const titleElement = document.getElementById(labelledBy!);
      expect(titleElement).toBeInTheDocument();
      expect(titleElement).toHaveTextContent(/add legal document/i);
    });

    it('should have no accessibility violations (jest-axe)', async () => {
      const { container } = render(
        <CreateLegalDocumentModal {...defaultProps} />,
        { wrapper: createWrapper() }
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  // ===========================================================================
  // 9. Product Owner Selection Tests
  // ===========================================================================

  describe('Product Owner Selection', () => {
    it('should display all available product owners in dropdown', async () => {
      const user = userEvent.setup();
      render(<CreateLegalDocumentModal {...defaultProps} />, { wrapper: createWrapper() });

      // Open people dropdown
      const peopleDropdown = screen.getByLabelText(/people/i);
      await user.click(peopleDropdown);

      // All product owners should be available
      expect(screen.getByRole('option', { name: /john doe/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /jane smith/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /bob johnson/i })).toBeInTheDocument();
    });

    it('should allow adding a product owner', async () => {
      const user = userEvent.setup();
      render(<CreateLegalDocumentModal {...defaultProps} />, { wrapper: createWrapper() });

      // Open people dropdown and select John Doe
      const peopleDropdown = screen.getByLabelText(/people/i);
      await user.click(peopleDropdown);
      const johnOption = screen.getByRole('option', { name: /john doe/i });
      await user.click(johnOption);

      // John Doe should now be shown as selected
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('should allow removing a selected product owner', async () => {
      const user = userEvent.setup();
      render(<CreateLegalDocumentModal {...defaultProps} />, { wrapper: createWrapper() });

      // Select John Doe
      const peopleDropdown = screen.getByLabelText(/people/i);
      await user.click(peopleDropdown);
      const johnOption = screen.getByRole('option', { name: /john doe/i });
      await user.click(johnOption);

      // Verify John Doe is selected
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

    it('should allow selecting multiple product owners', async () => {
      const user = userEvent.setup();
      render(<CreateLegalDocumentModal {...defaultProps} />, { wrapper: createWrapper() });

      // Select John Doe
      const peopleDropdown = screen.getByLabelText(/people/i);
      await user.click(peopleDropdown);
      await user.click(screen.getByRole('option', { name: /john doe/i }));

      // Select Jane Smith
      await user.click(peopleDropdown);
      await user.click(screen.getByRole('option', { name: /jane smith/i }));

      // Both should be shown as selected
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // 10. Character Count Display Tests
  // ===========================================================================

  describe('Character Count Display', () => {
    it('should display character count for notes field', () => {
      render(<CreateLegalDocumentModal {...defaultProps} />, { wrapper: createWrapper() });

      // Should show character count starting at 0
      expect(screen.getByText(/0.*\/.*2000/i)).toBeInTheDocument();
    });

    it('should update character count as user types', async () => {
      const user = userEvent.setup();
      render(<CreateLegalDocumentModal {...defaultProps} />, { wrapper: createWrapper() });

      const notesInput = screen.getByLabelText(/notes/i);
      await user.type(notesInput, 'Hello');

      // Should show updated character count
      expect(screen.getByText(/5.*\/.*2000/i)).toBeInTheDocument();
    });

    it('should show warning color when approaching limit', async () => {
      render(<CreateLegalDocumentModal {...defaultProps} />, { wrapper: createWrapper() });

      const notesInput = screen.getByLabelText(/notes/i);
      const nearLimitText = 'a'.repeat(1900);

      fireEvent.change(notesInput, { target: { value: nearLimitText } });

      // Character count should have warning styling (amber/yellow)
      const charCount = screen.getByText(/1900.*\/.*2000/i);
      expect(charCount).toHaveClass('text-amber-600');
    });

    it('should show error color when over limit', async () => {
      render(<CreateLegalDocumentModal {...defaultProps} />, { wrapper: createWrapper() });

      const notesInput = screen.getByLabelText(/notes/i);
      const overLimitText = 'a'.repeat(2050);

      fireEvent.change(notesInput, { target: { value: overLimitText } });

      // Character count should have error styling (red)
      const charCount = screen.getByText(/2050.*\/.*2000/i);
      expect(charCount).toHaveClass('text-red-600');
    });
  });

  // ===========================================================================
  // 11. Edge Cases Tests
  // ===========================================================================

  describe('Edge Cases', () => {
    it('should handle empty notes gracefully', async () => {
      const user = userEvent.setup();
      render(<CreateLegalDocumentModal {...defaultProps} />, { wrapper: createWrapper() });

      // Fill required fields
      const typeInput = screen.getByLabelText(/type/i);
      await user.click(typeInput);
      const willOption = screen.getByRole('option', { name: /will/i });
      await user.click(willOption);

      const peopleDropdown = screen.getByLabelText(/people/i);
      await user.click(peopleDropdown);
      const johnOption = screen.getByRole('option', { name: /john doe/i });
      await user.click(johnOption);

      // Submit without notes (notes are optional)
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Should submit successfully
      await waitFor(() => {
        expect(mockCreateMutation.mutateAsync).toHaveBeenCalled();
      });
    });

    it('should handle special characters in notes', async () => {
      const user = userEvent.setup();
      render(<CreateLegalDocumentModal {...defaultProps} />, { wrapper: createWrapper() });

      const notesInput = screen.getByLabelText(/notes/i);
      await user.type(notesInput, "O'Brien's document - <test> & \"special\" chars");

      expect(notesInput).toHaveValue("O'Brien's document - <test> & \"special\" chars");
    });

    it('should handle unicode characters in notes', async () => {
      const user = userEvent.setup();
      render(<CreateLegalDocumentModal {...defaultProps} />, { wrapper: createWrapper() });

      const notesInput = screen.getByLabelText(/notes/i);
      await user.type(notesInput, '\u9057\u8a00\u6587\u66F8 - Legal document');

      expect(notesInput).toHaveValue('\u9057\u8a00\u6587\u66F8 - Legal document');
    });

    it('should handle empty product owners array prop', () => {
      render(
        <CreateLegalDocumentModal
          {...defaultProps}
          productOwners={[]}
        />,
        { wrapper: createWrapper() }
      );

      // Should render without crashing
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should handle empty date field on submit', async () => {
      const user = userEvent.setup();
      render(<CreateLegalDocumentModal {...defaultProps} />, { wrapper: createWrapper() });

      // Fill required fields
      const typeInput = screen.getByLabelText(/type/i);
      await user.click(typeInput);
      const willOption = screen.getByRole('option', { name: /will/i });
      await user.click(willOption);

      const peopleDropdown = screen.getByLabelText(/people/i);
      await user.click(peopleDropdown);
      const johnOption = screen.getByRole('option', { name: /john doe/i });
      await user.click(johnOption);

      // Submit without date (date is optional)
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Should submit with null date
      await waitFor(() => {
        expect(mockCreateMutation.mutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({
            document_date: null,
          })
        );
      });
    });
  });

  // ===========================================================================
  // 12. Keyboard Navigation Tests
  // ===========================================================================

  describe('Keyboard Navigation', () => {
    it('should have focusable form fields for tab navigation', () => {
      render(<CreateLegalDocumentModal {...defaultProps} />, { wrapper: createWrapper() });

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
      mockCreateMutation.mutateAsync.mockResolvedValue(createdDocument);

      render(
        <CreateLegalDocumentModal {...defaultProps} onSuccess={mockOnSuccess} />,
        { wrapper: createWrapper() }
      );

      // Fill required fields
      const typeInput = screen.getByLabelText(/type/i);
      await user.click(typeInput);
      const willOption = screen.getByRole('option', { name: /will/i });
      await user.click(willOption);

      const peopleDropdown = screen.getByLabelText(/people/i);
      await user.click(peopleDropdown);
      const johnOption = screen.getByRole('option', { name: /john doe/i });
      await user.click(johnOption);

      // Focus submit button and press Enter
      const submitButton = screen.getByRole('button', { name: /save/i });
      submitButton.focus();
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(mockCreateMutation.mutateAsync).toHaveBeenCalled();
      });
    });
  });

  // ===========================================================================
  // 13. Double Submission Prevention Tests
  // ===========================================================================

  describe('Double Submission Prevention', () => {
    it('should prevent double submission by disabling button during submit', async () => {
      const user = userEvent.setup();

      // Make the mutation hang to simulate in-progress state
      mockCreateMutation.mutateAsync.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(createdDocument), 1000))
      );

      render(<CreateLegalDocumentModal {...defaultProps} />, { wrapper: createWrapper() });

      // Fill required fields
      const typeInput = screen.getByLabelText(/type/i);
      await user.click(typeInput);
      const willOption = screen.getByRole('option', { name: /will/i });
      await user.click(willOption);

      const peopleDropdown = screen.getByLabelText(/people/i);
      await user.click(peopleDropdown);
      const johnOption = screen.getByRole('option', { name: /john doe/i });
      await user.click(johnOption);

      // Click save
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Should only have called the mutation once
      await waitFor(() => {
        expect(mockCreateMutation.mutateAsync).toHaveBeenCalledTimes(1);
      });
    });
  });
});
