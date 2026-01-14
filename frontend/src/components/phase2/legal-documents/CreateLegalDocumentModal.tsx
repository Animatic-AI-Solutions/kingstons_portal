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
// Type Dropdown Component (inline for test compatibility)
// =============================================================================

interface TypeDropdownProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: string;
  errorId?: string;
}

/**
 * Dropdown for selecting document type with custom entry support
 * Uses combobox role and option roles for accessibility tests
 */
const TypeDropdown: React.FC<TypeDropdownProps> = ({
  id,
  value,
  onChange,
  disabled = false,
  error,
  errorId,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [focusedIndex, setFocusedIndex] = React.useState(-1);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLUListElement>(null);

  // Close on outside click - use mousedown to allow click on options to complete
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    };

    if (isOpen) {
      // Use mousedown instead of click to avoid race conditions
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Scroll focused option into view
  React.useEffect(() => {
    if (isOpen && focusedIndex >= 0 && listRef.current) {
      const focusedElement = listRef.current.children[focusedIndex] as HTMLElement;
      if (focusedElement && typeof focusedElement.scrollIntoView === 'function') {
        focusedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [focusedIndex, isOpen]);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setFocusedIndex(-1);
    inputRef.current?.focus();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    // Keep dropdown open while typing for filtering (if desired in future)
  };

  const handleInputClick = () => {
    if (!disabled) {
      setIsOpen(true);
      setFocusedIndex(0);
    }
  };

  const handleInputFocus = () => {
    if (!disabled) {
      setIsOpen(true);
      setFocusedIndex(0);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (disabled) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setFocusedIndex(0);
        } else {
          setFocusedIndex((prev) =>
            prev < LEGAL_DOCUMENT_TYPES.length - 1 ? prev + 1 : prev
          );
        }
        break;

      case 'ArrowUp':
        event.preventDefault();
        if (isOpen) {
          setFocusedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        }
        break;

      case 'Enter':
        event.preventDefault();
        if (isOpen && focusedIndex >= 0 && focusedIndex < LEGAL_DOCUMENT_TYPES.length) {
          handleSelect(LEGAL_DOCUMENT_TYPES[focusedIndex]);
        }
        break;

      case 'Escape':
        event.preventDefault();
        setIsOpen(false);
        setFocusedIndex(-1);
        break;

      default:
        break;
    }
  };

  return (
    <div ref={dropdownRef} className="relative">
      <input
        type="text"
        id={id}
        ref={inputRef}
        value={value}
        onChange={handleInputChange}
        onClick={handleInputClick}
        onFocus={handleInputFocus}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        autoFocus
        tabIndex={0}
        maxLength={TYPE_MAX_LENGTH}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={`${id}-listbox`}
        aria-required="true"
        aria-describedby={error && errorId ? errorId : undefined}
        aria-invalid={error ? 'true' : undefined}
        className={`block w-full border rounded-md shadow-sm px-3 py-2 text-sm focus:outline-none focus:ring-4 focus:ring-offset-2 ${
          error
            ? 'border-red-500 focus:border-red-600 focus:ring-red-500/10'
            : 'border-gray-300 focus:border-primary-700 focus:ring-primary-700/10'
        } ${disabled ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'}`}
        placeholder="Select or enter a type..."
      />
      {isOpen && (
        <ul
          ref={listRef}
          id={`${id}-listbox`}
          role="listbox"
          className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto"
        >
          {LEGAL_DOCUMENT_TYPES.map((type, index) => (
            <li
              key={type}
              role="option"
              aria-selected={index === focusedIndex}
              onClick={() => handleSelect(type)}
              onMouseEnter={() => setFocusedIndex(index)}
              className={`w-full text-left px-4 py-2 text-sm cursor-pointer ${
                index === focusedIndex
                  ? 'bg-primary-100 text-primary-900'
                  : 'hover:bg-primary-50'
              }`}
            >
              {type}
            </li>
          ))}
        </ul>
      )}
      {error && errorId && (
        <p id={errorId} className="mt-1 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
};

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
      newErrors.product_owner_ids = 'At least one person must be selected';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [form.type, form.notes, form.product_owner_ids]);

  // ============================================================
  // Form Change Handlers
  // ============================================================
  const handleTypeChange = useCallback((value: string) => {
    setForm((prev) => ({ ...prev, type: value }));
    // Clear error when user enters a value
    if (value && value.trim() !== '') {
      setErrors((prev) => {
        const { type, ...rest } = prev;
        return rest;
      });
    }
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

        {/* Type Field - custom dropdown with text input for custom types */}
        <div>
          <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
            Type
          </label>
          <TypeDropdown
            id="type"
            value={form.type}
            onChange={handleTypeChange}
            disabled={isPending}
            error={errors.type}
            errorId="type-error"
          />
        </div>

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

export default CreateLegalDocumentModal;
