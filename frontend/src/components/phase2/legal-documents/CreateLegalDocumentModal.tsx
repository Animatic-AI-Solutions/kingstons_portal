/**
 * CreateLegalDocumentModal Component
 *
 * Modal dialog for creating new legal documents.
 * Displays form fields for type, date, people, and notes.
 *
 * Features:
 * - Accessible modal with ARIA labels and focus trap via ModalShell
 * - Empty form fields initialized on open
 * - Real-time validation with error display
 * - Character count for notes field with warning/error colors
 * - Loading states to prevent double-submission
 * - Form reset when modal opens
 * - Unsaved changes warning on close
 * - Success toast notification after save
 *
 * @module components/phase2/legal-documents/CreateLegalDocumentModal
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import {
  ModalShell,
  TextArea,
  ComboDropdown,
  MultiSelectDropdown,
} from '@/components/ui';
import { useCreateLegalDocument } from '@/hooks/useLegalDocuments';
import type {
  LegalDocument,
  CreateLegalDocumentData,
} from '@/types/legalDocument';
import { LEGAL_DOCUMENT_TYPES } from '@/types/legalDocument';
import {
  NOTES_MAX_LENGTH,
  NOTES_WARNING_THRESHOLD,
  sanitizeErrorMessage,
} from './shared';

// =============================================================================
// Types
// =============================================================================

/**
 * Product owner data structure
 */
interface ProductOwner {
  id: number;
  firstname: string;
  surname: string;
}

/**
 * Props for CreateLegalDocumentModal component
 */
export interface CreateLegalDocumentModalProps {
  /** Whether the modal is currently open */
  isOpen: boolean;
  /** Callback when modal should close */
  onClose: () => void;
  /** Available product owners for selection */
  productOwners: ProductOwner[];
  /** Callback invoked after successful creation */
  onSuccess?: (document: LegalDocument) => void;
}

/**
 * Form state for the legal document
 */
interface FormState {
  type: string;
  document_date: string;
  product_owner_ids: number[];
  notes: string;
}

/**
 * Form validation errors
 */
interface FormErrors {
  type?: string;
  notes?: string;
  product_owner_ids?: string;
}

/**
 * Initial empty form state
 */
const INITIAL_FORM_STATE: FormState = {
  type: '',
  document_date: '',
  product_owner_ids: [],
  notes: '',
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Check if form has been modified from initial state
 */
function isFormDirty(form: FormState): boolean {
  return (
    form.type !== '' ||
    form.document_date !== '' ||
    form.product_owner_ids.length > 0 ||
    form.notes !== ''
  );
}

// =============================================================================
// Component
// =============================================================================

/**
 * CreateLegalDocumentModal Component
 *
 * Renders accessible modal dialog with form for creating legal documents.
 *
 * @param props - Component props
 * @returns JSX element with modal dialog
 */
const CreateLegalDocumentModal: React.FC<CreateLegalDocumentModalProps> = ({
  isOpen,
  onClose,
  productOwners,
  onSuccess,
}) => {
  // ============================================================
  // Form State
  // ============================================================
  const [form, setForm] = useState<FormState>({ ...INITIAL_FORM_STATE });
  const [errors, setErrors] = useState<FormErrors>({});
  const [apiError, setApiError] = useState<string | null>(null);

  // ============================================================
  // Mutation Hook
  // ============================================================
  const createMutation = useCreateLegalDocument();
  const { isPending } = createMutation;

  // ============================================================
  // Reset form when modal opens
  // ============================================================
  useEffect(() => {
    if (isOpen) {
      setForm({ ...INITIAL_FORM_STATE });
      setErrors({});
      setApiError(null);
    }
  }, [isOpen]);

  // ============================================================
  // Close Handler with Dirty Check
  // ============================================================
  const handleClose = useCallback(() => {
    if (isPending) return;

    if (isFormDirty(form)) {
      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to close?'
      );
      if (!confirmed) return;
    }

    onClose();
  }, [isPending, form, onClose]);

  // ============================================================
  // Validation
  // ============================================================
  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    // Type is required
    if (!form.type || form.type.trim() === '') {
      newErrors.type = 'Type is required';
    }

    if (form.notes.length > NOTES_MAX_LENGTH) {
      newErrors.notes = 'Notes cannot exceed 2000 characters';
    }

    if (form.product_owner_ids.length === 0) {
      newErrors.product_owner_ids = 'At least one product owner is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [form.type, form.notes, form.product_owner_ids]);

  // ============================================================
  // Form Change Handlers
  // ============================================================
  const handleTypeChange = useCallback((value: string | number) => {
    const strValue = String(value);
    setForm((prev) => ({ ...prev, type: strValue }));
    // Clear error when user enters a value
    if (strValue && strValue.trim() !== '') {
      setErrors((prev) => {
        const { type, ...rest } = prev;
        return rest;
      });
    }
  }, []);

  const handlePeopleChange = useCallback((values: (string | number)[]) => {
    // Filter to only numbers (product owner IDs)
    const numericValues = values.filter((v): v is number => typeof v === 'number');
    setForm((prev) => ({ ...prev, product_owner_ids: numericValues }));
    // Clear error when user selects someone
    if (numericValues.length > 0) {
      setErrors((prev) => {
        const { product_owner_ids, ...rest } = prev;
        return rest;
      });
    }
  }, []);

  const handleNotesChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setForm((prev) => ({ ...prev, notes: value }));
    // Clear error if within limit
    if (value.length <= NOTES_MAX_LENGTH) {
      setErrors((prev) => {
        const { notes, ...rest } = prev;
        return rest;
      });
    }
  }, []);

  // ============================================================
  // Submit Handler
  // ============================================================
  const handleSubmit = useCallback(async () => {
    setApiError(null);

    // Validate form
    if (!validateForm()) {
      return;
    }

    // Build create data
    const createData: CreateLegalDocumentData = {
      type: form.type,
      product_owner_ids: form.product_owner_ids,
      document_date: form.document_date || null,
      notes: form.notes || null,
    };

    try {
      const createdDocument = await createMutation.mutateAsync(createData);

      toast.success('Document created successfully');
      onSuccess?.(createdDocument);
      onClose();
    } catch (error) {
      const errorMessage = sanitizeErrorMessage(error);
      setApiError(errorMessage);
    }
  }, [validateForm, form, createMutation, onSuccess, onClose]);

  // ============================================================
  // Computed Values
  // ============================================================
  const typeOptions = useMemo(
    () =>
      LEGAL_DOCUMENT_TYPES.map((type) => ({
        value: type,
        label: type,
      })),
    []
  );

  const peopleOptions = useMemo(
    () =>
      productOwners.map((po) => ({
        value: po.id,
        label: `${po.firstname} ${po.surname}`,
      })),
    [productOwners]
  );

  // Character count styling
  const getCharCountClass = useCallback((count: number): string => {
    if (count > NOTES_MAX_LENGTH) {
      return 'text-red-600';
    }
    if (count > NOTES_WARNING_THRESHOLD) {
      return 'text-amber-600';
    }
    return 'text-gray-500';
  }, []);

  // ============================================================
  // Render
  // ============================================================
  return (
    <ModalShell
      isOpen={isOpen}
      onClose={handleClose}
      title="Add Legal Document"
      size="md"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
        className="space-y-4"
      >
        {/* API Error Display */}
        {apiError && (
          <div
            role="alert"
            className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm"
          >
            {apiError}
          </div>
        )}

        {/* Type Field - ComboDropdown allows custom values */}
        <ComboDropdown
          id="type"
          label="Type"
          options={typeOptions}
          value={form.type}
          onChange={handleTypeChange}
          disabled={isPending}
          error={errors.type}
          placeholder="Select or type a document type..."
          required
          allowCustomValue
        />

        {/* Document Date Field */}
        <div>
          <label htmlFor="document-date" className="block text-sm font-medium text-gray-700 mb-1">
            Document Date
          </label>
          <input
            type="date"
            id="document-date"
            value={form.document_date}
            onChange={(e) => setForm((prev) => ({ ...prev, document_date: e.target.value }))}
            disabled={isPending}
            className="block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 text-sm focus:outline-none focus:ring-4 focus:ring-offset-2 focus:border-primary-700 focus:ring-primary-700/10 disabled:bg-gray-50 disabled:cursor-not-allowed"
          />
        </div>

        {/* People Field - MultiSelectDropdown with search */}
        <MultiSelectDropdown
          id="people"
          label="People"
          options={peopleOptions}
          values={form.product_owner_ids}
          onChange={handlePeopleChange}
          disabled={isPending}
          error={errors.product_owner_ids}
          placeholder="Search and select people..."
          required
          searchable
        />

        {/* Notes Field */}
        <div>
          <TextArea
            id="notes"
            label="Notes"
            value={form.notes}
            onChange={handleNotesChange}
            disabled={isPending}
            placeholder="Additional notes..."
            minRows={3}
            error={errors.notes}
          />
          <div
            className={`mt-1 text-xs text-right ${getCharCountClass(form.notes.length)}`}
            aria-live="polite"
          >
            {`${form.notes.length} / ${NOTES_MAX_LENGTH}`}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={handleClose}
            disabled={isPending}
            tabIndex={0}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            tabIndex={0}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
};

export default CreateLegalDocumentModal;
