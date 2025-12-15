/**
 * EditSpecialRelationshipModal Component (Cycle 7)
 *
 * Modal for editing an existing special relationship.
 * - Pre-populates form with existing relationship data
 * - Uses ModalShell for accessibility features
 * - Uses RelationshipFormFields for form UI
 * - Uses useRelationshipValidation for validation
 * - Calls useUpdateSpecialRelationship hook for API interaction
 * - Detects changed fields (only sends changes to API)
 * - Handles loading, success, and error states
 */

import React, { useState, useEffect, useCallback } from 'react';
import ModalShell from './ModalShell';
import RelationshipFormFields from './RelationshipFormFields';
import { useRelationshipValidation, RelationshipFormData } from '@/hooks/useRelationshipValidation';
import { useUpdateSpecialRelationship } from '@/hooks/useSpecialRelationships';
import { SpecialRelationship, PROFESSIONAL_RELATIONSHIP_TYPES } from '@/types/specialRelationship';

export interface EditSpecialRelationshipModalProps {
  /** Whether modal is open */
  isOpen: boolean;
  /** Callback when modal should close */
  onClose: () => void;
  /** Relationship to edit */
  relationship: SpecialRelationship;
  /** Optional success callback */
  onSuccess?: (relationship: SpecialRelationship) => void;
}

const EditSpecialRelationshipModal: React.FC<EditSpecialRelationshipModalProps> = ({
  isOpen,
  onClose,
  relationship,
  onSuccess,
}) => {
  // Determine if professional based on relationship type
  const isProfessional = PROFESSIONAL_RELATIONSHIP_TYPES.includes(relationship.relationship_type);

  // Helper to get name from relationship
  const getNameFromRelationship = (rel: any): string => {
    // If relationship has a name field, use it
    if (rel.name) {
      return rel.name;
    }
    // Otherwise combine first and last name
    return `${rel.first_name || ''} ${rel.last_name || ''}`.trim();
  };

  // Helper to get phone number from relationship (prioritize mobile, then home, then work)
  const getPhoneFromRelationship = (rel: SpecialRelationship): string => {
    return rel.mobile_phone || rel.home_phone || rel.work_phone || '';
  };

  // Form state - initialized from relationship
  const [formData, setFormData] = useState<RelationshipFormData>({
    name: getNameFromRelationship(relationship),
    relationship_type: relationship.relationship_type,
    status: relationship.status,
    date_of_birth: relationship.date_of_birth || '',
    email: relationship.email || '',
    phone_number: getPhoneFromRelationship(relationship),
  });

  // API error state
  const [apiError, setApiError] = useState<string>('');

  // Track original form data to detect changes
  const [originalData] = useState<RelationshipFormData>({
    name: getNameFromRelationship(relationship),
    relationship_type: relationship.relationship_type,
    status: relationship.status,
    date_of_birth: relationship.date_of_birth || '',
    email: relationship.email || '',
    phone_number: getPhoneFromRelationship(relationship),
  });

  // Validation hook
  const { errors, validateField, validateForm, clearAllErrors, clearError, handleBlur, handleChange } = useRelationshipValidation();

  // Mutation hook
  const { mutateAsync, isPending } = useUpdateSpecialRelationship();

  // Reset form when relationship changes
  useEffect(() => {
    if (isOpen) {
      const newFormData = {
        name: getNameFromRelationship(relationship),
        relationship_type: relationship.relationship_type,
        status: relationship.status,
        date_of_birth: relationship.date_of_birth || '',
        email: relationship.email || '',
        phone_number: getPhoneFromRelationship(relationship),
      };
      setFormData(newFormData);
      clearAllErrors();
      setApiError('');
    }
  }, [isOpen, relationship, clearAllErrors]);

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
   * Detect changed fields
   */
  const getChangedFields = () => {
    const changes: any = {};

    if (formData.name !== originalData.name) {
      changes.name = formData.name;
    }
    if (formData.relationship_type !== originalData.relationship_type) {
      changes.relationship_type = formData.relationship_type;
    }
    if (formData.status !== originalData.status) {
      changes.status = formData.status;
    }
    if (formData.date_of_birth !== originalData.date_of_birth) {
      changes.date_of_birth = formData.date_of_birth || null;
    }
    if (formData.email !== originalData.email) {
      changes.email = formData.email || null;
    }
    if (formData.phone_number !== originalData.phone_number) {
      changes.phone_number = formData.phone_number || null;
    }

    return changes;
  };

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
      // Get only changed fields
      const changes = getChangedFields();

      // If no changes, just close
      if (Object.keys(changes).length === 0) {
        onClose();
        return;
      }

      // Update relationship
      const updatedRelationship = await mutateAsync({
        id: relationship.id,
        updates: changes,
      } as any);

      // Call success callback if provided
      if (onSuccess && updatedRelationship) {
        onSuccess(updatedRelationship);
      }

      // Close modal
      onClose();
    } catch (error: any) {
      // Display API error message
      const errorMessage = error?.message || 'An unexpected error occurred';
      setApiError(errorMessage);
      console.error('Failed to update relationship:', error);
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
      title={isProfessional ? 'Edit Professional Relationship' : 'Edit Personal Relationship'}
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
            {isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
};

export default EditSpecialRelationshipModal;
