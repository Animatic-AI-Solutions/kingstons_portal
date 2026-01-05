/**
 * CreateSpecialRelationshipModal Component (Phase 4 - Refactored)
 *
 * Modal dialog for creating a new special relationship (personal or professional).
 * Provides full form validation, error handling, and accessibility features.
 *
 * @module CreateSpecialRelationshipModal
 *
 * Features:
 * - Form validation using useRelationshipValidation hook
 * - API integration via useCreateSpecialRelationship hook
 * - Loading, success, and error state management
 * - Automatic focus management for validation errors
 * - Form reset on modal close
 * - API error display
 * - Support for new schema with type + relationship fields
 * - Product owner IDs instead of client group ID
 *
 * Accessibility:
 * - Uses ModalShell for focus trap and keyboard navigation
 * - Focuses first invalid field on validation error
 * - Disabled state prevents interaction during submission
 *
 * Architecture:
 * - ModalShell: Provides modal container with accessibility
 * - RelationshipFormFields: Renders form fields consistently
 * - useRelationshipValidation: Handles all validation logic
 * - useCreateSpecialRelationship: Manages API mutation
 */

import React, { useState, useEffect, useCallback } from 'react';
import ModalShell from './ModalShell';
import RelationshipFormFields from './RelationshipFormFields';
import { useRelationshipValidation, RelationshipFormData } from '@/hooks/useRelationshipValidation';
import { focusFirstError, detectChangedField } from '@/hooks/useRelationshipFormHandlers';
import { useCreateSpecialRelationship } from '@/hooks/useSpecialRelationships';
import { SpecialRelationship, RelationshipCategory } from '@/types/specialRelationship';

/**
 * Props for CreateSpecialRelationshipModal component
 */
export interface CreateSpecialRelationshipModalProps {
  /** Whether modal is currently open */
  isOpen: boolean;
  /** Callback invoked when modal should close */
  onClose: () => void;
  /** Product owner IDs to associate the relationship with */
  productOwnerIds: number[];
  /** Initial relationship type (Personal or Professional) */
  initialType?: RelationshipCategory;
  /** Optional callback invoked after successful creation with the new relationship */
  onSuccess?: (relationship: SpecialRelationship) => void;
}

const CreateSpecialRelationshipModal: React.FC<CreateSpecialRelationshipModalProps> = ({
  isOpen,
  onClose,
  productOwnerIds,
  initialType = 'Personal',
  onSuccess,
}) => {
  // Form state
  const [formData, setFormData] = useState<RelationshipFormData>({
    name: '',
    type: initialType,
    relationship: '',
    status: 'Active',
    date_of_birth: null,
    email: null,
    phone_number: null,
    dependency: false,
    firm_name: null,
    address_id: null,
    notes: null,
  });

  // API error state
  const [apiError, setApiError] = useState<string>('');

  // Validation hook
  const { errors, validateField, validateForm, clearAllErrors, clearError, handleBlur, handleChange } = useRelationshipValidation();

  // Mutation hook
  const { mutateAsync, isPending } = useCreateSpecialRelationship();

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        name: '',
        type: initialType,
        relationship: '',
        status: 'Active',
        date_of_birth: null,
        email: null,
        phone_number: null,
        dependency: false,
        firm_name: null,
        address_id: null,
        notes: null,
      });
      clearAllErrors();
      setApiError('');
    }
  }, [isOpen, clearAllErrors, initialType]);

  // Focus first invalid field when errors change
  useEffect(() => {
    focusFirstError(errors);
  }, [errors]);

  /**
   * Handle field value change
   * Clears API error when user makes changes to allow retry
   * @param newFormData - Updated form data object
   */
  const handleFieldChange = useCallback(
    (newFormData: RelationshipFormData) => {
      const changedField = detectChangedField(formData, newFormData);
      setFormData(newFormData);

      // Use hook's handleChange for validation if we identified the changed field
      if (changedField) {
        handleChange(changedField, newFormData[changedField]);
      }

      // Clear API error when user makes changes
      if (apiError) {
        setApiError('');
      }
    },
    [formData, handleChange, apiError]
  );

  /**
   * Handle field blur event - triggers validation
   * @param field - Field name that was blurred
   * @param value - Current field value (uses formData if not provided)
   */
  const handleFieldBlur = useCallback(
    (field: string, value?: any) => {
      const valueToValidate = value !== undefined ? value : formData[field as keyof RelationshipFormData];
      handleBlur(field as keyof RelationshipFormData, valueToValidate);
    },
    [formData, handleBlur]
  );

  /**
   * Prepare form data for API submission
   * @returns API-ready object with required and optional fields
   */
  const prepareCreateData = useCallback(() => {
    return {
      product_owner_ids: productOwnerIds,
      name: formData.name,
      type: formData.type,
      relationship: formData.relationship,
      status: formData.status,
      ...(formData.date_of_birth && { date_of_birth: formData.date_of_birth }),
      ...(formData.email && { email: formData.email }),
      ...(formData.phone_number && { phone_number: formData.phone_number }),
      ...(formData.dependency !== undefined && { dependency: formData.dependency }),
      ...(formData.firm_name && { firm_name: formData.firm_name }),
      ...(formData.address_id && { address_id: formData.address_id }),
      ...(formData.notes && { notes: formData.notes }),
    };
  }, [productOwnerIds, formData]);

  /**
   * Handle form submission
   * Validates form, calls API, and handles success/error cases
   * @param e - Form submit event
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError('');

    // Validate form and focus first invalid field if errors exist
    const formErrors = validateForm(formData);
    if (Object.keys(formErrors).length > 0) {
      focusFirstError(formErrors);
      return;
    }

    try {
      const createData = prepareCreateData();
      const newRelationship = await mutateAsync(createData as any);

      if (onSuccess && newRelationship) {
        onSuccess(newRelationship);
      }

      onClose();
    } catch (error: any) {
      const errorMessage = error?.message || 'An unexpected error occurred';
      setApiError(errorMessage);
    }
  };

  /**
   * Handle cancel button click
   * Clears errors and closes modal
   */
  const handleCancel = () => {
    clearAllErrors();
    onClose();
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={handleCancel}
      title={formData.type === 'Professional' ? 'Add Professional Relationship' : 'Add Personal Relationship'}
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

        <RelationshipFormFields
          formData={formData}
          onChange={handleFieldChange}
          onBlur={handleFieldBlur}
          errors={errors}
          disabled={isPending}
          addresses={[]}  // TODO: Fetch actual addresses
          onCreateAddress={undefined}  // TODO: Implement address creation
        />

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
            {isPending ? 'Adding...' : 'Add Relationship'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
};

export default CreateSpecialRelationshipModal;
