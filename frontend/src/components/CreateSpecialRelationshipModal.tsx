/**
 * CreateSpecialRelationshipModal Component (Cycle 7)
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

import React, { useState, useRef, useEffect, useCallback } from 'react';
import ModalShell from './ModalShell';
import RelationshipFormFields from './RelationshipFormFields';
import { useRelationshipValidation, RelationshipFormData } from '@/hooks/useRelationshipValidation';
import { focusFirstError, detectChangedField } from '@/hooks/useRelationshipFormHandlers';
import { useCreateSpecialRelationship } from '@/hooks/useSpecialRelationships';
import { SpecialRelationship, RelationshipStatus } from '@/types/specialRelationship';

/**
 * Props for CreateSpecialRelationshipModal component
 */
export interface CreateSpecialRelationshipModalProps {
  /** Whether modal is currently open */
  isOpen: boolean;
  /** Callback invoked when modal should close */
  onClose: () => void;
  /** Client group ID to associate the new relationship with */
  clientGroupId: string;
  /** Whether this is a professional relationship (affects available fields) */
  isProfessional: boolean;
  /** Optional callback invoked after successful creation with the new relationship */
  onSuccess?: (relationship: SpecialRelationship) => void;
}

const CreateSpecialRelationshipModal: React.FC<CreateSpecialRelationshipModalProps> = ({
  isOpen,
  onClose,
  clientGroupId,
  isProfessional,
  onSuccess,
}) => {
  // Form state
  const [formData, setFormData] = useState<RelationshipFormData>({
    name: '',
    relationship_type: '',
    status: 'Active',
    date_of_birth: '',
    email: '',
    phone_number: '',
    is_dependent: false,          // Default false for personal relationships
    relationship_with: [],         // Default empty array for professional relationships
    is_professional: isProfessional,
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
        relationship_type: '',
        status: 'Active',
        date_of_birth: '',
        email: '',
        phone_number: '',
        is_dependent: false,
        relationship_with: [],
        is_professional: isProfessional,
      });
      clearAllErrors();
      setApiError('');
    }
  }, [isOpen, clearAllErrors, isProfessional]);

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
      client_group_id: clientGroupId,
      name: formData.name,
      relationship_type: formData.relationship_type,
      status: formData.status,
      is_professional: isProfessional,
      ...(formData.date_of_birth && { date_of_birth: formData.date_of_birth }),
      ...(formData.email && { email: formData.email }),
      ...(formData.phone_number && { phone_number: formData.phone_number }),
      // Include is_dependent for personal relationships
      ...(!isProfessional && { is_dependent: formData.is_dependent || false }),
      // Include relationship_with for professional relationships
      ...(isProfessional && formData.relationship_with && formData.relationship_with.length > 0 && {
        relationship_with: formData.relationship_with
      }),
    };
  }, [clientGroupId, formData, isProfessional]);

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
      title={isProfessional ? 'Add Professional Relationship' : 'Add Personal Relationship'}
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
          isProfessional={isProfessional}
          disabled={isPending}
          productOwners={[]}  // TODO: Fetch actual product owners from client group
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
