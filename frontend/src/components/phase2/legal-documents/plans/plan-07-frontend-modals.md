# Plan 07: Frontend Edit and Create Modals

## Overview

This plan covers the modal components for editing and creating legal documents. The LegalDocumentsTable from Plan 06 must be implemented before this plan.

## Prerequisites

- TypeScript interfaces in `types/legalDocument.ts`
- React Query hooks in `hooks/useLegalDocuments.ts`
- ModalShell, ComboDropdown, MultiSelectDropdown, DateInput from `components/ui/`

---

## Modal Requirements

### Edit Modal (LegalDocumentModal)

- Opens when row is clicked
- Shows all document fields in editable form
- Fields: Type, Status, People (multi-select), Date, Notes
- Save button updates document
- Cancel button closes without saving

### Create Modal (CreateLegalDocumentModal)

- Opens when Add button is clicked
- ComboDropdown for type selection (standard types + custom option)
- Multi-select for product owners
- Date picker for document date
- Notes textarea
- Create button creates document

---

## TDD Cycle 1: Edit Modal

### Red Phase

**Agent**: Tester-Agent
**Task**: Write failing tests for edit modal
**Files to create**: `frontend/src/tests/components/phase2/legal-documents/LegalDocumentModal.test.tsx`

```typescript
/**
 * Test suite for LegalDocumentModal Component
 *
 * Tests the edit modal for legal documents.
 *
 * Test Coverage:
 * - Modal rendering with document data
 * - Form field population
 * - Form validation (notes 2000 char max)
 * - Submit handling
 * - Cancel handling
 * - Loading state during submission
 * - Error display
 * - Accessibility (focus management)
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import LegalDocumentModal from '@/components/phase2/legal-documents/LegalDocumentModal';
import type { LegalDocument } from '@/types/legalDocument';

// Sample test data
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

const sampleProductOwners = [
  { id: 123, firstname: 'John', surname: 'Doe' },
  { id: 456, firstname: 'Jane', surname: 'Smith' },
  { id: 789, firstname: 'Bob', surname: 'Johnson' },
];

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  document: sampleDocument,
  productOwners: sampleProductOwners,
  onSuccess: vi.fn(),
};

// Mock the mutation hook
const mockMutateAsync = vi.fn();
vi.mock('@/hooks/useLegalDocuments', () => ({
  useUpdateLegalDocument: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}));

describe('LegalDocumentModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMutateAsync.mockResolvedValue({ ...sampleDocument, notes: 'Updated' });
  });

  // ===========================================================================
  // Rendering Tests
  // ===========================================================================

  describe('Rendering', () => {
    it('should render modal when isOpen is true', () => {
      render(<LegalDocumentModal {...defaultProps} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should NOT render modal when isOpen is false', () => {
      render(<LegalDocumentModal {...defaultProps} isOpen={false} />);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should display modal title', () => {
      render(<LegalDocumentModal {...defaultProps} />);

      expect(screen.getByText(/edit legal document/i)).toBeInTheDocument();
    });

    it('should populate type field with document type', () => {
      render(<LegalDocumentModal {...defaultProps} />);

      // ComboDropdown should show the current type
      expect(screen.getByDisplayValue('Will')).toBeInTheDocument();
    });

    it('should populate date field with document date', () => {
      render(<LegalDocumentModal {...defaultProps} />);

      const dateInput = screen.getByLabelText(/date/i);
      expect(dateInput).toHaveValue('2024-01-15');
    });

    it('should populate notes field with document notes', () => {
      render(<LegalDocumentModal {...defaultProps} />);

      const notesInput = screen.getByLabelText(/notes/i);
      expect(notesInput).toHaveValue('Test notes for the document');
    });

    it('should show selected product owners', () => {
      render(<LegalDocumentModal {...defaultProps} />);

      // MultiSelectDropdown should show selected owners
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Form Validation Tests
  // ===========================================================================

  describe('Form Validation', () => {
    it('should show error when notes exceed 2000 characters', async () => {
      const user = userEvent.setup();
      render(<LegalDocumentModal {...defaultProps} />);

      const notesInput = screen.getByLabelText(/notes/i);
      const longNotes = 'x'.repeat(2001);

      await user.clear(notesInput);
      await user.type(notesInput, longNotes);

      // Try to submit
      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      expect(screen.getByText(/notes must be 2000 characters or less/i)).toBeInTheDocument();
      expect(mockMutateAsync).not.toHaveBeenCalled();
    });

    it('should allow notes at exactly 2000 characters', async () => {
      const user = userEvent.setup();
      render(<LegalDocumentModal {...defaultProps} />);

      const notesInput = screen.getByLabelText(/notes/i);
      const maxNotes = 'x'.repeat(2000);

      await user.clear(notesInput);
      await user.type(notesInput, maxNotes);

      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Should not show validation error
      expect(screen.queryByText(/notes must be 2000 characters or less/i)).not.toBeInTheDocument();
    });

    it('should show error when product_owner_ids is empty', async () => {
      const user = userEvent.setup();
      render(
        <LegalDocumentModal
          {...defaultProps}
          document={{ ...sampleDocument, product_owner_ids: [] }}
        />
      );

      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      expect(screen.getByText(/at least one product owner/i)).toBeInTheDocument();
      expect(mockMutateAsync).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Submit Handling Tests
  // ===========================================================================

  describe('Submit Handling', () => {
    it('should call mutateAsync with changed fields on submit', async () => {
      const user = userEvent.setup();
      render(<LegalDocumentModal {...defaultProps} />);

      const notesInput = screen.getByLabelText(/notes/i);
      await user.clear(notesInput);
      await user.type(notesInput, 'Updated notes');

      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      expect(mockMutateAsync).toHaveBeenCalledWith({
        id: 1,
        data: expect.objectContaining({ notes: 'Updated notes' }),
      });
    });

    it('should call onSuccess after successful update', async () => {
      const user = userEvent.setup();
      render(<LegalDocumentModal {...defaultProps} />);

      const notesInput = screen.getByLabelText(/notes/i);
      await user.clear(notesInput);
      await user.type(notesInput, 'Updated notes');

      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(defaultProps.onSuccess).toHaveBeenCalled();
      });
    });

    it('should call onClose after successful update', async () => {
      const user = userEvent.setup();
      render(<LegalDocumentModal {...defaultProps} />);

      const notesInput = screen.getByLabelText(/notes/i);
      await user.clear(notesInput);
      await user.type(notesInput, 'Updated notes');

      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(defaultProps.onClose).toHaveBeenCalled();
      });
    });

    it('should close without API call if no changes made', async () => {
      const user = userEvent.setup();
      render(<LegalDocumentModal {...defaultProps} />);

      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      // Should close without calling API
      expect(mockMutateAsync).not.toHaveBeenCalled();
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Cancel Handling Tests
  // ===========================================================================

  describe('Cancel Handling', () => {
    it('should call onClose when cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(<LegalDocumentModal {...defaultProps} />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('should NOT call mutateAsync when cancelled', async () => {
      const user = userEvent.setup();
      render(<LegalDocumentModal {...defaultProps} />);

      // Make some changes
      const notesInput = screen.getByLabelText(/notes/i);
      await user.clear(notesInput);
      await user.type(notesInput, 'Changed notes');

      // Cancel
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockMutateAsync).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Loading State Tests
  // ===========================================================================

  describe('Loading State', () => {
    it('should disable form fields during submission', async () => {
      // Mock pending state
      vi.doMock('@/hooks/useLegalDocuments', () => ({
        useUpdateLegalDocument: () => ({
          mutateAsync: mockMutateAsync,
          isPending: true,
        }),
      }));

      render(<LegalDocumentModal {...defaultProps} />);

      const saveButton = screen.getByRole('button', { name: /saving/i });
      expect(saveButton).toBeDisabled();
    });

    it('should show loading text on save button during submission', async () => {
      vi.doMock('@/hooks/useLegalDocuments', () => ({
        useUpdateLegalDocument: () => ({
          mutateAsync: mockMutateAsync,
          isPending: true,
        }),
      }));

      render(<LegalDocumentModal {...defaultProps} />);

      expect(screen.getByText(/saving/i)).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Error Display Tests
  // ===========================================================================

  describe('Error Display', () => {
    it('should display API error message', async () => {
      mockMutateAsync.mockRejectedValue(new Error('Failed to update document'));
      const user = userEvent.setup();
      render(<LegalDocumentModal {...defaultProps} />);

      const notesInput = screen.getByLabelText(/notes/i);
      await user.clear(notesInput);
      await user.type(notesInput, 'Updated notes');

      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to update document/i)).toBeInTheDocument();
      });
    });
  });

  // ===========================================================================
  // Accessibility Tests
  // ===========================================================================

  describe('Accessibility', () => {
    it('should have accessible dialog role', () => {
      render(<LegalDocumentModal {...defaultProps} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should focus first input when opened', async () => {
      render(<LegalDocumentModal {...defaultProps} />);

      await waitFor(() => {
        const firstInput = screen.getByLabelText(/type/i);
        expect(document.activeElement).toBe(firstInput);
      });
    });

    it('should have labeled form fields', () => {
      render(<LegalDocumentModal {...defaultProps} />);

      expect(screen.getByLabelText(/type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/notes/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/people/i)).toBeInTheDocument();
    });

    it('should return focus to trigger element when closed via cancel', async () => {
      const user = userEvent.setup();

      // Create a trigger button to track focus
      const TriggerWrapper = () => {
        const [isOpen, setIsOpen] = React.useState(false);
        const triggerRef = React.useRef<HTMLButtonElement>(null);

        return (
          <>
            <button ref={triggerRef} onClick={() => setIsOpen(true)} data-testid="trigger">
              Open Modal
            </button>
            <LegalDocumentModal
              {...defaultProps}
              isOpen={isOpen}
              onClose={() => setIsOpen(false)}
              triggerRef={triggerRef}
            />
          </>
        );
      };

      render(<TriggerWrapper />);

      // Open modal
      const trigger = screen.getByTestId('trigger');
      await user.click(trigger);

      // Wait for modal to open and focus to move
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Close modal via cancel button
      await user.click(screen.getByRole('button', { name: /cancel/i }));

      // Wait for modal to close and focus to return to trigger
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(document.activeElement).toBe(trigger);
      });
    });

    it('should return focus to trigger element when closed via escape key', async () => {
      const user = userEvent.setup();

      const TriggerWrapper = () => {
        const [isOpen, setIsOpen] = React.useState(false);
        const triggerRef = React.useRef<HTMLButtonElement>(null);

        return (
          <>
            <button ref={triggerRef} onClick={() => setIsOpen(true)} data-testid="trigger">
              Open Modal
            </button>
            <LegalDocumentModal
              {...defaultProps}
              isOpen={isOpen}
              onClose={() => setIsOpen(false)}
              triggerRef={triggerRef}
            />
          </>
        );
      };

      render(<TriggerWrapper />);

      // Open modal
      await user.click(screen.getByTestId('trigger'));

      // Wait for modal to open
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Close modal via escape key
      await user.keyboard('{Escape}');

      // Focus should return to trigger
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(document.activeElement).toBe(screen.getByTestId('trigger'));
      });
    });

    it('should trap focus within modal while open', async () => {
      const user = userEvent.setup();
      render(<LegalDocumentModal {...defaultProps} />);

      // Tab through all focusable elements
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      const saveButton = screen.getByRole('button', { name: /save/i });

      // Tab should cycle through elements without leaving modal
      await user.tab();
      await user.tab();
      await user.tab();
      await user.tab();

      // Focus should still be within the dialog
      const dialog = screen.getByRole('dialog');
      expect(dialog.contains(document.activeElement)).toBe(true);
    });
  });
});
```

### Green Phase

**Agent**: coder-agent
**Task**: Implement LegalDocumentModal component to pass tests
**Files to create**: `frontend/src/components/phase2/legal-documents/LegalDocumentModal.tsx`

```typescript
/**
 * LegalDocumentModal Component
 *
 * Modal dialog for editing an existing legal document.
 * Pre-populates form with existing data and tracks changes for efficient updates.
 *
 * Features:
 * - Pre-populates form with existing document data
 * - Change detection (only sends modified fields to API)
 * - Form validation (notes max 2000 chars, at least one product owner)
 * - API integration via useUpdateLegalDocument hook
 * - Loading, success, and error state management
 * - Automatic focus management for accessibility
 *
 * @component LegalDocumentModal
 */

import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { ModalShell, ComboDropdown, MultiSelectDropdown, DateInput, TextArea } from '@/components/ui';
import { useUpdateLegalDocument } from '@/hooks/useLegalDocuments';
import type { LegalDocument, LegalDocumentStatus, LegalDocumentFormData } from '@/types/legalDocument';
import { LEGAL_DOCUMENT_TYPES, LEGAL_DOCUMENT_STATUSES } from '@/types/legalDocument';

// ==========================
// Types
// ==========================

interface ProductOwner {
  id: number;
  firstname: string;
  surname: string;
}

interface LegalDocumentModalProps {
  /** Whether modal is currently open */
  isOpen: boolean;
  /** Callback invoked when modal should close */
  onClose: () => void;
  /** Document object to edit (pre-populates form) */
  document: LegalDocument;
  /** Reference to the element that triggered the modal (for focus return) */
  triggerRef?: React.RefObject<HTMLElement>;
  /** All product owners for multi-select */
  productOwners: ProductOwner[];
  /** Callback invoked after successful update */
  onSuccess?: (document: LegalDocument) => void;
}

interface FormErrors {
  notes?: string;
  product_owner_ids?: string;
}

// ==========================
// Component
// ==========================

const LegalDocumentModal: React.FC<LegalDocumentModalProps> = ({
  isOpen,
  onClose,
  document,
  productOwners,
  onSuccess,
}) => {
  // Form state
  const [formData, setFormData] = useState<LegalDocumentFormData>({
    type: document.type,
    document_date: document.document_date,
    status: document.status,
    notes: document.notes,
    product_owner_ids: document.product_owner_ids,
  });

  // Track original data for change detection
  const [originalData, setOriginalData] = useState<LegalDocumentFormData>({
    type: document.type,
    document_date: document.document_date,
    status: document.status,
    notes: document.notes,
    product_owner_ids: document.product_owner_ids,
  });

  // Error state
  const [errors, setErrors] = useState<FormErrors>({});
  const [apiError, setApiError] = useState<string>('');

  // Mutation hook
  const { mutateAsync, isPending } = useUpdateLegalDocument();

  // Reset form when document changes or modal opens
  useEffect(() => {
    if (isOpen) {
      const newFormData: LegalDocumentFormData = {
        type: document.type,
        document_date: document.document_date,
        status: document.status,
        notes: document.notes,
        product_owner_ids: document.product_owner_ids,
      };
      setFormData(newFormData);
      setOriginalData(newFormData);
      setErrors({});
      setApiError('');
    }
  }, [isOpen, document]);

  /**
   * Handle form field changes
   */
  const handleChange = useCallback(
    (field: keyof LegalDocumentFormData, value: unknown) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      // Clear error when field changes
      if (errors[field as keyof FormErrors]) {
        setErrors((prev) => ({ ...prev, [field]: undefined }));
      }
      if (apiError) {
        setApiError('');
      }
    },
    [errors, apiError]
  );

  /**
   * Validate form data
   */
  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    // Notes validation (max 2000 chars)
    if (formData.notes && formData.notes.length > 2000) {
      newErrors.notes = 'Notes must be 2000 characters or less';
    }

    // Product owners validation
    if (!formData.product_owner_ids || formData.product_owner_ids.length === 0) {
      newErrors.product_owner_ids = 'At least one product owner is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Get changed fields for efficient update
   */
  const getChangedFields = () => {
    const changes: Partial<LegalDocumentFormData> = {};

    if (formData.type !== originalData.type) {
      changes.type = formData.type;
    }
    if (formData.document_date !== originalData.document_date) {
      changes.document_date = formData.document_date;
    }
    if (formData.status !== originalData.status) {
      changes.status = formData.status;
    }
    if (formData.notes !== originalData.notes) {
      changes.notes = formData.notes;
    }

    // Compare product_owner_ids arrays
    const currentIds = JSON.stringify([...formData.product_owner_ids].sort());
    const originalIds = JSON.stringify([...originalData.product_owner_ids].sort());
    if (currentIds !== originalIds) {
      changes.product_owner_ids = formData.product_owner_ids;
    }

    return changes;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError('');

    // Validate
    if (!validate()) {
      return;
    }

    // Check for changes
    const changes = getChangedFields();
    if (Object.keys(changes).length === 0) {
      // No changes, just close
      toast.success('No changes to save');
      onClose();
      return;
    }

    try {
      const toastId = toast.loading('Saving changes...');

      const updatedDocument = await mutateAsync({
        id: document.id,
        data: changes,
      });

      toast.success('Document updated successfully', { id: toastId });

      if (onSuccess && updatedDocument) {
        onSuccess(updatedDocument);
      }

      onClose();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'An unexpected error occurred';
      setApiError(errorMessage);
      toast.error(errorMessage);
    }
  };

  /**
   * Handle cancel
   */
  const handleCancel = () => {
    setErrors({});
    setApiError('');
    onClose();
  };

  // Product owner options for MultiSelectDropdown
  const productOwnerOptions = productOwners.map((po) => ({
    value: po.id,
    label: `${po.firstname} ${po.surname}`,
  }));

  // Document type options for ComboDropdown
  const typeOptions = LEGAL_DOCUMENT_TYPES.map((type) => ({
    value: type,
    label: type,
  }));

  // Status options
  const statusOptions = LEGAL_DOCUMENT_STATUSES.map((status) => ({
    value: status,
    label: status,
  }));

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={handleCancel}
      title="Edit Legal Document"
      size="md"
      closeOnBackdropClick={!isPending}
    >
      <form onSubmit={handleSubmit}>
        {/* API Error Display */}
        {apiError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md" role="alert">
            <p className="text-sm text-red-800">{apiError}</p>
          </div>
        )}

        {/* Type Field */}
        <div className="mb-4">
          <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
            Type
          </label>
          <ComboDropdown
            id="type"
            options={typeOptions}
            value={formData.type}
            onChange={(value) => handleChange('type', value)}
            placeholder="Select document type"
            allowCustom={true}
            disabled={isPending}
          />
        </div>

        {/* Date Field */}
        <div className="mb-4">
          <label htmlFor="document_date" className="block text-sm font-medium text-gray-700 mb-1">
            Date
          </label>
          <DateInput
            id="document_date"
            value={formData.document_date || ''}
            onChange={(value) => handleChange('document_date', value || null)}
            disabled={isPending}
          />
        </div>

        {/* People (Product Owners) Field */}
        <div className="mb-4">
          <label htmlFor="product_owners" className="block text-sm font-medium text-gray-700 mb-1">
            People
          </label>
          <MultiSelectDropdown
            id="product_owners"
            options={productOwnerOptions}
            value={formData.product_owner_ids}
            onChange={(value) => handleChange('product_owner_ids', value)}
            placeholder="Select product owners"
            disabled={isPending}
          />
          {errors.product_owner_ids && (
            <p className="mt-1 text-sm text-red-600">{errors.product_owner_ids}</p>
          )}
        </div>

        {/* Status Field */}
        <div className="mb-4">
          <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            id="status"
            value={formData.status}
            onChange={(e) => handleChange('status', e.target.value as LegalDocumentStatus)}
            disabled={isPending}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Notes Field */}
        <div className="mb-4">
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <TextArea
            id="notes"
            value={formData.notes || ''}
            onChange={(e) => handleChange('notes', e.target.value || null)}
            rows={4}
            maxLength={2000}
            disabled={isPending}
            placeholder="Additional notes about the document"
          />
          {errors.notes && <p className="mt-1 text-sm text-red-600">{errors.notes}</p>}
          <p className="mt-1 text-xs text-gray-500">
            {(formData.notes?.length || 0)} / 2000 characters
          </p>
        </div>

        {/* Form Actions */}
        <div className="mt-6 flex justify-end space-x-3">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isPending}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
};

export default LegalDocumentModal;
```

### Blue Phase

**Agent**: coder-agent
**Task**: Refactor and ensure consistency

---

## TDD Cycle 2: Create Modal

### Red Phase

**Agent**: Tester-Agent
**Task**: Write failing tests for create modal
**Files to create**: `frontend/src/tests/components/phase2/legal-documents/CreateLegalDocumentModal.test.tsx`

```typescript
/**
 * Test suite for CreateLegalDocumentModal Component
 *
 * Tests the create modal for legal documents.
 *
 * Test Coverage:
 * - Modal rendering
 * - ComboDropdown for type selection (with custom option)
 * - Form validation
 * - Submit handling
 * - Cancel handling
 * - Loading state
 * - Accessibility
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import CreateLegalDocumentModal from '@/components/phase2/legal-documents/CreateLegalDocumentModal';

const sampleProductOwners = [
  { id: 123, firstname: 'John', surname: 'Doe' },
  { id: 456, firstname: 'Jane', surname: 'Smith' },
];

const defaultProps = {
  isOpen: true,
  onClose: vi.fn(),
  productOwners: sampleProductOwners,
  onSuccess: vi.fn(),
};

// Mock the mutation hook
const mockMutateAsync = vi.fn();
vi.mock('@/hooks/useLegalDocuments', () => ({
  useCreateLegalDocument: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}));

describe('CreateLegalDocumentModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMutateAsync.mockResolvedValue({
      id: 1,
      type: 'Will',
      status: 'Signed',
      product_owner_ids: [123],
    });
  });

  // ===========================================================================
  // Rendering Tests
  // ===========================================================================

  describe('Rendering', () => {
    it('should render modal when isOpen is true', () => {
      render(<CreateLegalDocumentModal {...defaultProps} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should display modal title', () => {
      render(<CreateLegalDocumentModal {...defaultProps} />);

      expect(screen.getByText(/add legal document/i)).toBeInTheDocument();
    });

    it('should render type selector with standard options', () => {
      render(<CreateLegalDocumentModal {...defaultProps} />);

      // ComboDropdown should show document types
      const typeInput = screen.getByLabelText(/type/i);
      expect(typeInput).toBeInTheDocument();
    });

    it('should render all form fields', () => {
      render(<CreateLegalDocumentModal {...defaultProps} />);

      expect(screen.getByLabelText(/type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/people/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/notes/i)).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Type Selection Tests
  // ===========================================================================

  describe('Type Selection', () => {
    it('should allow selecting standard document types', async () => {
      const user = userEvent.setup();
      render(<CreateLegalDocumentModal {...defaultProps} />);

      // Open combo dropdown and select a type
      const typeInput = screen.getByLabelText(/type/i);
      await user.click(typeInput);

      // Standard types should be available
      expect(screen.getByText('Will')).toBeInTheDocument();
      expect(screen.getByText('LPOA P&F')).toBeInTheDocument();
      expect(screen.getByText('EPA')).toBeInTheDocument();
    });

    it('should allow entering custom document type', async () => {
      const user = userEvent.setup();
      render(<CreateLegalDocumentModal {...defaultProps} />);

      const typeInput = screen.getByLabelText(/type/i);
      await user.type(typeInput, 'Custom: Family Trust');

      // Custom type should be accepted
      expect(typeInput).toHaveValue('Custom: Family Trust');
    });
  });

  // ===========================================================================
  // Form Validation Tests
  // ===========================================================================

  describe('Form Validation', () => {
    it('should show error when type is empty', async () => {
      const user = userEvent.setup();
      render(<CreateLegalDocumentModal {...defaultProps} />);

      // Select a product owner but leave type empty
      const createButton = screen.getByRole('button', { name: /create/i });
      await user.click(createButton);

      expect(screen.getByText(/type is required/i)).toBeInTheDocument();
      expect(mockMutateAsync).not.toHaveBeenCalled();
    });

    it('should show error when product owners not selected', async () => {
      const user = userEvent.setup();
      render(<CreateLegalDocumentModal {...defaultProps} />);

      // Enter type but no product owners
      const typeInput = screen.getByLabelText(/type/i);
      await user.type(typeInput, 'Will');

      const createButton = screen.getByRole('button', { name: /create/i });
      await user.click(createButton);

      expect(screen.getByText(/at least one product owner/i)).toBeInTheDocument();
      expect(mockMutateAsync).not.toHaveBeenCalled();
    });

    it('should show error when notes exceed 2000 characters', async () => {
      const user = userEvent.setup();
      render(<CreateLegalDocumentModal {...defaultProps} />);

      const notesInput = screen.getByLabelText(/notes/i);
      const longNotes = 'x'.repeat(2001);
      await user.type(notesInput, longNotes);

      const createButton = screen.getByRole('button', { name: /create/i });
      await user.click(createButton);

      expect(screen.getByText(/notes must be 2000 characters or less/i)).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Submit Handling Tests
  // ===========================================================================

  describe('Submit Handling', () => {
    it('should call mutateAsync with form data on submit', async () => {
      const user = userEvent.setup();
      render(<CreateLegalDocumentModal {...defaultProps} />);

      // Fill in required fields
      const typeInput = screen.getByLabelText(/type/i);
      await user.type(typeInput, 'Will');

      // Select product owner (assuming MultiSelectDropdown interaction)
      // This may need adjustment based on actual component implementation

      const createButton = screen.getByRole('button', { name: /create/i });
      await user.click(createButton);

      // Verify mutation was called
      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalled();
      });
    });

    it('should call onSuccess after successful creation', async () => {
      const user = userEvent.setup();
      render(<CreateLegalDocumentModal {...defaultProps} />);

      // Fill and submit form
      const typeInput = screen.getByLabelText(/type/i);
      await user.type(typeInput, 'Will');

      const createButton = screen.getByRole('button', { name: /create/i });
      await user.click(createButton);

      await waitFor(() => {
        expect(defaultProps.onSuccess).toHaveBeenCalled();
      });
    });

    it('should call onClose after successful creation', async () => {
      const user = userEvent.setup();
      render(<CreateLegalDocumentModal {...defaultProps} />);

      // Fill and submit form
      const typeInput = screen.getByLabelText(/type/i);
      await user.type(typeInput, 'Will');

      const createButton = screen.getByRole('button', { name: /create/i });
      await user.click(createButton);

      await waitFor(() => {
        expect(defaultProps.onClose).toHaveBeenCalled();
      });
    });
  });

  // ===========================================================================
  // Cancel Handling Tests
  // ===========================================================================

  describe('Cancel Handling', () => {
    it('should call onClose when cancel button is clicked', async () => {
      const user = userEvent.setup();
      render(<CreateLegalDocumentModal {...defaultProps} />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('should reset form when reopened', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<CreateLegalDocumentModal {...defaultProps} />);

      // Enter some data
      const typeInput = screen.getByLabelText(/type/i);
      await user.type(typeInput, 'Will');

      // Close modal
      rerender(<CreateLegalDocumentModal {...defaultProps} isOpen={false} />);

      // Reopen modal
      rerender(<CreateLegalDocumentModal {...defaultProps} isOpen={true} />);

      // Form should be reset
      const newTypeInput = screen.getByLabelText(/type/i);
      expect(newTypeInput).toHaveValue('');
    });
  });

  // ===========================================================================
  // Accessibility Tests
  // ===========================================================================

  describe('Accessibility', () => {
    it('should have accessible dialog role', () => {
      render(<CreateLegalDocumentModal {...defaultProps} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should have labeled form fields', () => {
      render(<CreateLegalDocumentModal {...defaultProps} />);

      expect(screen.getByLabelText(/type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/people/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/notes/i)).toBeInTheDocument();
    });

    it('should return focus to trigger element when closed', async () => {
      const user = userEvent.setup();

      const TriggerWrapper = () => {
        const [isOpen, setIsOpen] = React.useState(false);
        const triggerRef = React.useRef<HTMLButtonElement>(null);

        return (
          <>
            <button ref={triggerRef} onClick={() => setIsOpen(true)} data-testid="trigger">
              Add Document
            </button>
            <CreateLegalDocumentModal
              {...defaultProps}
              isOpen={isOpen}
              onClose={() => setIsOpen(false)}
              triggerRef={triggerRef}
            />
          </>
        );
      };

      render(<TriggerWrapper />);

      // Open modal
      const trigger = screen.getByTestId('trigger');
      await user.click(trigger);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Close via cancel
      await user.click(screen.getByRole('button', { name: /cancel/i }));

      // Focus should return to trigger
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(document.activeElement).toBe(trigger);
      });
    });

    it('should focus first interactive element when opened', async () => {
      render(<CreateLegalDocumentModal {...defaultProps} />);

      await waitFor(() => {
        const typeInput = screen.getByLabelText(/type/i);
        expect(document.activeElement).toBe(typeInput);
      });
    });

    it('should trap focus within modal while open', async () => {
      const user = userEvent.setup();
      render(<CreateLegalDocumentModal {...defaultProps} />);

      // Tab through all focusable elements
      await user.tab();
      await user.tab();
      await user.tab();
      await user.tab();

      // Focus should still be within the dialog
      const dialog = screen.getByRole('dialog');
      expect(dialog.contains(document.activeElement)).toBe(true);
    });
  });
});
```

### Green Phase

**Agent**: coder-agent
**Task**: Implement CreateLegalDocumentModal component
**Files to create**: `frontend/src/components/phase2/legal-documents/CreateLegalDocumentModal.tsx`

```typescript
/**
 * CreateLegalDocumentModal Component
 *
 * Modal dialog for creating a new legal document.
 * Uses ComboDropdown for type selection with support for custom types.
 *
 * Features:
 * - ComboDropdown for type selection (standard types + custom)
 * - MultiSelectDropdown for product owner selection
 * - DateInput for document date
 * - TextArea for notes with character count
 * - Form validation (type required, at least one product owner, notes max 2000)
 * - API integration via useCreateLegalDocument hook
 *
 * @component CreateLegalDocumentModal
 */

import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { ModalShell, ComboDropdown, MultiSelectDropdown, DateInput, TextArea } from '@/components/ui';
import { useCreateLegalDocument } from '@/hooks/useLegalDocuments';
import type { LegalDocument, CreateLegalDocumentData } from '@/types/legalDocument';
import { LEGAL_DOCUMENT_TYPES } from '@/types/legalDocument';

// ==========================
// Types
// ==========================

interface ProductOwner {
  id: number;
  firstname: string;
  surname: string;
}

interface CreateLegalDocumentModalProps {
  /** Whether modal is currently open */
  isOpen: boolean;
  /** Callback invoked when modal should close */
  onClose: () => void;
  /** Reference to the element that triggered the modal (for focus return) */
  triggerRef?: React.RefObject<HTMLElement>;
  /** All product owners for multi-select */
  productOwners: ProductOwner[];
  /** Callback invoked after successful creation */
  onSuccess?: (document: LegalDocument) => void;
}

interface FormData {
  type: string;
  document_date: string | null;
  notes: string | null;
  product_owner_ids: number[];
}

interface FormErrors {
  type?: string;
  notes?: string;
  product_owner_ids?: string;
}

const initialFormData: FormData = {
  type: '',
  document_date: null,
  notes: null,
  product_owner_ids: [],
};

// ==========================
// Component
// ==========================

const CreateLegalDocumentModal: React.FC<CreateLegalDocumentModalProps> = ({
  isOpen,
  onClose,
  productOwners,
  onSuccess,
}) => {
  // Form state
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<FormErrors>({});
  const [apiError, setApiError] = useState<string>('');

  // Mutation hook
  const { mutateAsync, isPending } = useCreateLegalDocument();

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData(initialFormData);
      setErrors({});
      setApiError('');
    }
  }, [isOpen]);

  /**
   * Handle form field changes
   */
  const handleChange = (field: keyof FormData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when field changes
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    if (apiError) {
      setApiError('');
    }
  };

  /**
   * Validate form data
   */
  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    // Type validation (required)
    if (!formData.type || !formData.type.trim()) {
      newErrors.type = 'Type is required';
    }

    // Product owners validation
    if (!formData.product_owner_ids || formData.product_owner_ids.length === 0) {
      newErrors.product_owner_ids = 'At least one product owner is required';
    }

    // Notes validation (max 2000 chars)
    if (formData.notes && formData.notes.length > 2000) {
      newErrors.notes = 'Notes must be 2000 characters or less';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError('');

    // Validate
    if (!validate()) {
      return;
    }

    try {
      const toastId = toast.loading('Creating document...');

      const createData: CreateLegalDocumentData = {
        type: formData.type.trim(),
        product_owner_ids: formData.product_owner_ids,
        document_date: formData.document_date,
        notes: formData.notes,
      };

      const newDocument = await mutateAsync(createData);

      toast.success('Document created successfully', { id: toastId });

      if (onSuccess && newDocument) {
        onSuccess(newDocument);
      }

      onClose();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'An unexpected error occurred';
      setApiError(errorMessage);
      toast.error(errorMessage);
    }
  };

  /**
   * Handle cancel
   */
  const handleCancel = () => {
    setFormData(initialFormData);
    setErrors({});
    setApiError('');
    onClose();
  };

  // Product owner options for MultiSelectDropdown
  const productOwnerOptions = productOwners.map((po) => ({
    value: po.id,
    label: `${po.firstname} ${po.surname}`,
  }));

  // Document type options for ComboDropdown
  const typeOptions = LEGAL_DOCUMENT_TYPES.map((type) => ({
    value: type,
    label: type,
  }));

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={handleCancel}
      title="Add Legal Document"
      size="md"
      closeOnBackdropClick={!isPending}
    >
      <form onSubmit={handleSubmit}>
        {/* API Error Display */}
        {apiError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md" role="alert">
            <p className="text-sm text-red-800">{apiError}</p>
          </div>
        )}

        {/* Type Field */}
        <div className="mb-4">
          <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
            Type <span className="text-red-500">*</span>
          </label>
          <ComboDropdown
            id="type"
            options={typeOptions}
            value={formData.type}
            onChange={(value) => handleChange('type', value)}
            placeholder="Select or enter document type"
            allowCustom={true}
            disabled={isPending}
          />
          {errors.type && <p className="mt-1 text-sm text-red-600">{errors.type}</p>}
        </div>

        {/* Date Field */}
        <div className="mb-4">
          <label htmlFor="document_date" className="block text-sm font-medium text-gray-700 mb-1">
            Date
          </label>
          <DateInput
            id="document_date"
            value={formData.document_date || ''}
            onChange={(value) => handleChange('document_date', value || null)}
            disabled={isPending}
          />
        </div>

        {/* People (Product Owners) Field */}
        <div className="mb-4">
          <label htmlFor="product_owners" className="block text-sm font-medium text-gray-700 mb-1">
            People <span className="text-red-500">*</span>
          </label>
          <MultiSelectDropdown
            id="product_owners"
            options={productOwnerOptions}
            value={formData.product_owner_ids}
            onChange={(value) => handleChange('product_owner_ids', value)}
            placeholder="Select product owners"
            disabled={isPending}
          />
          {errors.product_owner_ids && (
            <p className="mt-1 text-sm text-red-600">{errors.product_owner_ids}</p>
          )}
        </div>

        {/* Notes Field */}
        <div className="mb-4">
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <TextArea
            id="notes"
            value={formData.notes || ''}
            onChange={(e) => handleChange('notes', e.target.value || null)}
            rows={4}
            maxLength={2000}
            disabled={isPending}
            placeholder="Additional notes about the document"
          />
          {errors.notes && <p className="mt-1 text-sm text-red-600">{errors.notes}</p>}
          <p className="mt-1 text-xs text-gray-500">
            {(formData.notes?.length || 0)} / 2000 characters
          </p>
        </div>

        {/* Form Actions */}
        <div className="mt-6 flex justify-end space-x-3">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isPending}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? 'Creating...' : 'Create'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
};

export default CreateLegalDocumentModal;
```

### Blue Phase

**Agent**: coder-agent
**Task**: Refactor, update barrel export, and ensure consistency
**Changes**:
1. Update `index.ts` to export both modals
2. Ensure consistent styling with other modals
3. Add comprehensive JSDoc comments

**Update**: `frontend/src/components/phase2/legal-documents/index.ts`

```typescript
/**
 * Legal Documents Components Barrel Export
 *
 * @module components/phase2/legal-documents
 */

export { default as LegalDocumentsTable } from './LegalDocumentsTable';
export { default as LegalDocumentModal } from './LegalDocumentModal';
export { default as CreateLegalDocumentModal } from './CreateLegalDocumentModal';
```

---

## Running Tests

```bash
# Run edit modal tests
cd frontend
npm test -- src/tests/components/phase2/legal-documents/LegalDocumentModal.test.tsx

# Run create modal tests
npm test -- src/tests/components/phase2/legal-documents/CreateLegalDocumentModal.test.tsx

# Run all modal tests with coverage
npm test -- --coverage src/tests/components/phase2/legal-documents/*.test.tsx
```

## Next Steps

Once all tests pass:
1. Proceed to Plan 08: Integration Testing
2. All components will be integrated and tested together
