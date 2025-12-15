/**
 * EditSpecialRelationshipModal Component (Cycle 7)
 *
 * Modal dialog for editing an existing special relationship.
 * Pre-populates form with existing data and tracks changes for efficient updates.
 *
 * @module EditSpecialRelationshipModal
 *
 * Features:
 * - Pre-populates form with existing relationship data
 * - Change detection (only sends modified fields to API)
 * - Form validation using useRelationshipValidation hook
 * - API integration via useUpdateSpecialRelationship hook
 * - Loading, success, and error state management
 * - Automatic focus management for validation errors
 * - Form reset when relationship changes
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
 * - useUpdateSpecialRelationship: Manages API mutation
 */

import React, { useState, useEffect, useCallback } from 'react';
import ModalShell from './ModalShell';
import RelationshipFormFields from './RelationshipFormFields';
import { useRelationshipValidation, RelationshipFormData } from '@/hooks/useRelationshipValidation';
import { focusFirstError, detectChangedField } from '@/hooks/useRelationshipFormHandlers';
import { useUpdateSpecialRelationship } from '@/hooks/useSpecialRelationships';
import { SpecialRelationship, PROFESSIONAL_RELATIONSHIP_TYPES } from '@/types/specialRelationship';

/**
 * Props for EditSpecialRelationshipModal component
 */
export interface EditSpecialRelationshipModalProps {
  /** Whether modal is currently open */
  isOpen: boolean;
  /** Callback invoked when modal should close */
  onClose: () => void;
  /** Relationship object to edit (pre-populates form) */
  relationship: SpecialRelationship;
  /** Optional callback invoked after successful update with updated relationship */
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

  /**
   * Extract name from relationship object
   * Uses 'name' field if present, otherwise combines first_name and last_name
   * @param rel - Relationship object
   * @returns Combined name string
   */
  const getNameFromRelationship = (rel: any): string => {
    // If relationship has a name field, use it
    if (rel.name) {
      return rel.name;
    }
    // Otherwise combine first and last name
    return `${rel.first_name || ''} ${rel.last_name || ''}`.trim();
  };

  /**
   * Extract phone number from relationship object
   * Prioritizes mobile_phone, falls back to home_phone, then work_phone
   * @param rel - Relationship object
   * @returns First available phone number or empty string
   */
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
    is_dependent: (relationship as any).is_dependent || false,
    relationship_with: (relationship as any).relationship_with || [],
    is_professional: isProfessional,
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
    is_dependent: (relationship as any).is_dependent || false,
    relationship_with: (relationship as any).relationship_with || [],
    is_professional: isProfessional,
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
        is_dependent: (relationship as any).is_dependent || false,
        relationship_with: (relationship as any).relationship_with || [],
        is_professional: isProfessional,
      };
      setFormData(newFormData);
      clearAllErrors();
      setApiError('');
    }
  }, [isOpen, relationship, clearAllErrors, isProfessional]);

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
   * Detect which fields have changed from original values.
   * Only changed fields are sent to API for efficient updates.
   *
   * Compares current form data against original data and returns an object
   * containing only the fields that have been modified. Empty/null values
   * are properly handled to allow clearing optional fields.
   *
   * For array fields (relationship_with), performs deep comparison after sorting
   * to detect changes regardless of order.
   *
   * @returns Object containing only the fields that changed, with null for cleared values
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
    if (formData.is_dependent !== originalData.is_dependent) {
      changes.is_dependent = formData.is_dependent;
    }
    // Compare arrays for relationship_with
    const originalRelWith = originalData.relationship_with || [];
    const currentRelWith = formData.relationship_with || [];
    if (JSON.stringify(originalRelWith.sort()) !== JSON.stringify(currentRelWith.sort())) {
      changes.relationship_with = currentRelWith;
    }

    return changes;
  };

  /**
   * Handle form submission
   * Validates form, detects changes, calls API, and handles success/error cases
   * If no changes detected, simply closes modal without API call
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
      // Get only changed fields - if no changes, just close
      const changes = getChangedFields();
      if (Object.keys(changes).length === 0) {
        onClose();
        return;
      }

      // Update relationship
      const updatedRelationship = await mutateAsync({
        id: relationship.id,
        updates: changes,
      } as any);

      if (onSuccess && updatedRelationship) {
        onSuccess(updatedRelationship);
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
            {isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
};

export default EditSpecialRelationshipModal;
