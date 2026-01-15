/**
 * LegalDocumentModal Component
 *
 * Modal dialog for editing existing legal documents.
 * Displays form fields for type, status, date, people, and notes.
 *
 * Features:
 * - Accessible modal with ARIA labels and focus trap via ModalShell
 * - Pre-populated form fields from existing document
 * - Change detection - only sends changed fields to API
 * - Real-time validation with error display
 * - Character count for notes field with warning/error colors
 * - Loading states to prevent double-submission
 * - Form reset to original values on modal close/reopen
 * - Unsaved changes warning on close
 * - Success toast notification after save
 *
 * @module components/phase2/legal-documents/LegalDocumentModal
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import {
  ModalShell,
  BaseDropdown,
  TextArea,
} from '@/components/ui';
import { useUpdateLegalDocument } from '@/hooks/useLegalDocuments';
import type {
  LegalDocument,
  LegalDocumentStatus,
  UpdateLegalDocumentData,
} from '@/types/legalDocument';
import { LEGAL_DOCUMENT_TYPES, LEGAL_DOCUMENT_STATUSES } from '@/types/legalDocument';
import {
  NOTES_MAX_LENGTH,
  NOTES_WARNING_THRESHOLD,
  TYPE_MAX_LENGTH,
  sanitizeErrorMessage,
  PeopleMultiSelect,
} from './shared';
import type { PeopleMultiSelectOption } from './shared';

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
 * Props for LegalDocumentModal component
 */
export interface LegalDocumentModalProps {
  /** Whether the modal is currently open */
  isOpen: boolean;
  /** Callback when modal should close */
  onClose: () => void;
  /** Document to edit (null when modal is closed for unified mounting) */
  document: LegalDocument | null;
  /** Available product owners for selection */
  productOwners: ProductOwner[];
  /** Callback invoked after successful save */
  onSuccess?: (document: LegalDocument) => void;
}

/**
 * Form state for the legal document
 */
interface FormState {
  type: string;
  status: LegalDocumentStatus;
  document_date: string;
  product_owner_ids: number[];
  notes: string;
}

/**
 * Form validation errors
 */
interface FormErrors {
  notes?: string;
  product_owner_ids?: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Default empty form state for when document is null
 */
const EMPTY_FORM_STATE: FormState = {
  type: '',
  status: 'Signed',
  document_date: '',
  product_owner_ids: [],
  notes: '',
};

/**
 * Initialize form state from document
 */
function initFormState(doc: LegalDocument | null): FormState {
  if (!doc) return EMPTY_FORM_STATE;
  return {
    type: doc.type,
    status: doc.status,
    document_date: doc.document_date || '',
    product_owner_ids: [...doc.product_owner_ids],
    notes: doc.notes || '',
  };
}

/**
 * Compare two arrays for equality (order-independent)
 */
function arraysEqual(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort((x, y) => x - y);
  const sortedB = [...b].sort((x, y) => x - y);
  return sortedA.every((val, idx) => val === sortedB[idx]);
}

/**
 * Get changed fields between form state and original document
 */
function getChangedFields(
  form: FormState,
  original: LegalDocument | null
): UpdateLegalDocumentData | null {
  if (!original) return null;

  const changes: UpdateLegalDocumentData = {};

  if (form.type !== original.type) {
    changes.type = form.type;
  }

  if (form.status !== original.status) {
    changes.status = form.status;
  }

  const originalDate = original.document_date || '';
  if (form.document_date !== originalDate) {
    changes.document_date = form.document_date || null;
  }

  if (!arraysEqual(form.product_owner_ids, original.product_owner_ids)) {
    changes.product_owner_ids = form.product_owner_ids;
  }

  const originalNotes = original.notes || '';
  if (form.notes !== originalNotes) {
    changes.notes = form.notes || null;
  }

  return Object.keys(changes).length > 0 ? changes : null;
}

/**
 * Check if form has been modified from original state
 */
function isFormDirty(form: FormState, original: LegalDocument | null): boolean {
  if (!original) return false;
  return getChangedFields(form, original) !== null;
}

// =============================================================================
// Component
// =============================================================================

/**
 * LegalDocumentModal Component
 *
 * Renders accessible modal dialog with form for editing legal documents.
 *
 * @param props - Component props
 * @returns JSX element with modal dialog
 */
const LegalDocumentModal: React.FC<LegalDocumentModalProps> = ({
  isOpen,
  onClose,
  document,
  productOwners,
  onSuccess,
}) => {
  // ============================================================
  // Form State
  // ============================================================
  const [form, setForm] = useState<FormState>(() => initFormState(document));
  const [errors, setErrors] = useState<FormErrors>({});
  const [apiError, setApiError] = useState<string | null>(null);

  // ============================================================
  // Mutation Hook
  // ============================================================
  const updateMutation = useUpdateLegalDocument();
  const { isPending } = updateMutation;

  // ============================================================
  // Reset form when modal opens
  // ============================================================
  useEffect(() => {
    if (isOpen) {
      setForm(initFormState(document));
      setErrors({});
      setApiError(null);
    }
  }, [isOpen, document]);

  // ============================================================
  // Close Handler with Dirty Check
  // ============================================================
  const handleClose = useCallback(() => {
    if (isPending) return;

    if (isFormDirty(form, document)) {
      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to close?'
      );
      if (!confirmed) return;
    }

    onClose();
  }, [isPending, form, document, onClose]);

  // ============================================================
  // Validation
  // ============================================================
  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    if (form.notes.length > NOTES_MAX_LENGTH) {
      newErrors.notes = 'Notes cannot exceed 2000 characters';
    }

    if (form.product_owner_ids.length === 0) {
      newErrors.product_owner_ids = 'At least one product owner is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [form.notes, form.product_owner_ids]);

  // ============================================================
  // Form Change Handlers
  // ============================================================
  const handleTypeChange = useCallback((value: string | number) => {
    setForm((prev) => ({ ...prev, type: String(value) }));
  }, []);

  const handleStatusChange = useCallback((value: string | number) => {
    setForm((prev) => ({ ...prev, status: value as LegalDocumentStatus }));
  }, []);

  const handlePeopleChange = useCallback((values: number[]) => {
    setForm((prev) => ({ ...prev, product_owner_ids: values }));
    // Clear error when user selects someone
    if (values.length > 0) {
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
    // Guard against null document (shouldn't happen when modal is open)
    if (!document) return;

    setApiError(null);

    // Validate form
    if (!validateForm()) {
      return;
    }

    // Get changed fields
    const changes = getChangedFields(form, document);

    // If no changes, just close
    if (!changes) {
      onClose();
      return;
    }

    try {
      const updatedDocument = await updateMutation.mutateAsync({
        id: document.id,
        data: changes,
      });

      toast.success('Document updated successfully');
      onSuccess?.(updatedDocument);
      onClose();
    } catch (error) {
      const errorMessage = sanitizeErrorMessage(error);
      setApiError(errorMessage);
    }
  }, [validateForm, form, document, updateMutation, onSuccess, onClose]);

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

  const statusOptions = useMemo(
    () =>
      LEGAL_DOCUMENT_STATUSES.map((status) => ({
        value: status,
        label: status,
      })),
    []
  );

  const peopleOptions: PeopleMultiSelectOption[] = useMemo(
    () =>
      productOwners.map((po) => ({
        value: po.id,
        label: `${po.firstname} ${po.surname}`,
      })),
    [productOwners]
  );

  // Get selected people for display
  const selectedPeople = useMemo(
    () =>
      productOwners.filter((po) => form.product_owner_ids.includes(po.id)),
    [productOwners, form.product_owner_ids]
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
      title="Edit Legal Document"
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

        {/* Type Field - use text input for test compatibility */}
        <div>
          <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
            Type
          </label>
          <input
            type="text"
            id="type"
            value={form.type}
            onChange={(e) => handleTypeChange(e.target.value)}
            disabled={isPending}
            list="type-options"
            autoFocus
            tabIndex={0}
            maxLength={TYPE_MAX_LENGTH}
            className="block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 text-sm focus:outline-none focus:ring-4 focus:ring-offset-2 focus:border-primary-700 focus:ring-primary-700/10 disabled:bg-gray-50 disabled:cursor-not-allowed"
            placeholder="Select or enter a type..."
          />
          <datalist id="type-options">
            {LEGAL_DOCUMENT_TYPES.map((type) => (
              <option key={type} value={type} />
            ))}
          </datalist>
        </div>

        {/* Status Field */}
        <BaseDropdown
          id="status"
          label="Status"
          options={statusOptions}
          value={form.status}
          onChange={handleStatusChange}
          disabled={isPending}
          searchable={false}
        />

        {/* Date Field - native date input for test compatibility */}
        <div>
          <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
            Date
          </label>
          <input
            type="date"
            id="date"
            value={form.document_date}
            onChange={(e) => setForm((prev) => ({ ...prev, document_date: e.target.value }))}
            disabled={isPending}
            tabIndex={0}
            className="block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 text-sm focus:outline-none focus:ring-4 focus:ring-offset-2 focus:border-primary-700 focus:ring-primary-700/10 disabled:bg-gray-50 disabled:cursor-not-allowed"
          />
        </div>

        {/* People Field - custom rendering for test compatibility */}
        <div>
          <label htmlFor="people" className="block text-sm font-medium text-gray-700 mb-1">
            People
          </label>
          {/* Selected People Chips with data-testid for tests */}
          {selectedPeople.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {selectedPeople.map((person) => {
                const fullName = `${person.firstname} ${person.surname}`;
                return (
                  <div
                    key={person.id}
                    data-testid="person-chip"
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800 border border-primary-300"
                  >
                    <span>{fullName}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const newIds = form.product_owner_ids.filter((id) => id !== person.id);
                        handlePeopleChange(newIds);
                      }}
                      disabled={isPending}
                      className="ml-1.5 text-primary-600 hover:text-red-600 focus:outline-none focus:text-red-600 disabled:opacity-50"
                      aria-label={`Remove ${fullName}`}
                    >
                      <span aria-hidden="true">&times;</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          {/* People selection dropdown */}
          <PeopleMultiSelect
            id="people"
            options={peopleOptions}
            values={form.product_owner_ids}
            onChange={handlePeopleChange}
            disabled={isPending}
            error={errors.product_owner_ids}
            errorId="people-error"
            required
          />
        </div>

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

export default LegalDocumentModal;
