/**
 * CreateSpecialRelationshipModal Component (Cycle 7)
 *
 * Modal for creating a new special relationship (personal or professional).
 * - Uses ModalShell for accessibility features
 * - Uses RelationshipFormFields for form UI
 * - Uses useRelationshipValidation for validation
 * - Calls useCreateSpecialRelationship hook for API interaction
 * - Handles loading, success, and error states
 * - Focuses first invalid field on validation error
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import ModalShell from './ModalShell';
import RelationshipFormFields from './RelationshipFormFields';
import { useRelationshipValidation, RelationshipFormData } from '@/hooks/useRelationshipValidation';
import { useCreateSpecialRelationship } from '@/hooks/useSpecialRelationships';
import { SpecialRelationship, RelationshipStatus } from '@/types/specialRelationship';

export interface CreateSpecialRelationshipModalProps {
  /** Whether modal is open */
  isOpen: boolean;
  /** Callback when modal should close */
  onClose: () => void;
  /** Client group ID to associate relationship with */
  clientGroupId: string;
  /** Whether this is a professional relationship */
  isProfessional: boolean;
  /** Optional success callback */
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
  });

  // API error state
  const [apiError, setApiError] = useState<string>('');

  // Validation hook
  const { errors, validateField, validateForm, clearAllErrors, clearError, handleBlur, handleChange } = useRelationshipValidation();

  // Mutation hook
  const { mutateAsync, isPending } = useCreateSpecialRelationship();

  // Ref for first invalid field
  const nameInputRef = useRef<HTMLInputElement>(null);

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
      });
      clearAllErrors();
      setApiError('');
    }
  }, [isOpen, clearAllErrors]);

  // Focus first invalid field when errors change
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      const firstErrorField = Object.keys(errors)[0];
      if (firstErrorField === 'name') {
        const nameInput = document.getElementById('name') as HTMLInputElement;
        if (nameInput) {
          nameInput.focus();
        }
      }
    }
  }, [errors]);

  /**
   * Handle field change
   */
  const handleFieldChange = useCallback((field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Use hook's handleChange for validation
    handleChange(field as keyof RelationshipFormData, value);
    // Clear API error when user makes changes
    if (apiError) {
      setApiError('');
    }
  }, [handleChange, apiError]);

  /**
   * Handle field blur - validate field
   */
  const handleFieldBlur = useCallback((field: string, value?: any) => {
    const valueToValidate = value !== undefined ? value : formData[field as keyof RelationshipFormData];
    // Use hook's handleBlur for validation
    handleBlur(field as keyof RelationshipFormData, valueToValidate);
  }, [handleBlur, formData]);

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear any previous API errors
    setApiError('');

    // Validate form
    const formErrors = validateForm(formData);
    const isValid = Object.keys(formErrors).length === 0;

    if (!isValid) {
      // Focus first invalid field
      const firstErrorField = Object.keys(formErrors)[0];
      const input = document.getElementById(firstErrorField) as HTMLInputElement;
      if (input) {
        input.focus();
      }
      return;
    }

    try {
      // Prepare data for API
      const createData = {
        client_group_id: clientGroupId,
        name: formData.name,
        relationship_type: formData.relationship_type,
        status: formData.status,
        is_professional: isProfessional,
        ...(formData.date_of_birth && { date_of_birth: formData.date_of_birth }),
        ...(formData.email && { email: formData.email }),
        ...(formData.phone_number && { phone_number: formData.phone_number }),
      };

      const newRelationship = await mutateAsync(createData as any);

      // Call success callback if provided
      if (onSuccess && newRelationship) {
        onSuccess(newRelationship);
      }

      // Close modal
      onClose();
    } catch (error: any) {
      // Display API error message
      const errorMessage = error?.message || 'An unexpected error occurred';
      setApiError(errorMessage);
      console.error('Failed to create relationship:', error);
    }
  };

  /**
   * Handle cancel
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
