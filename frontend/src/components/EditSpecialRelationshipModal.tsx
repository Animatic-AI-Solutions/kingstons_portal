/**
 * EditSpecialRelationshipModal Component (Phase 4 - Refactored)
 *
 * Modal dialog for editing an existing special relationship.
 * Pre-populates form with existing data and tracks changes for efficient updates.
 * Supports both old and new schema for backwards compatibility during migration.
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
 * - Backwards compatibility with old schema
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
import {
  SpecialRelationship,
  RelationshipCategory,
  PROFESSIONAL_RELATIONSHIPS,
} from '@/types/specialRelationship';

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
  /**
   * Extract type and relationship from relationship object
   * Handles both old schema (relationship_type only) and new schema (type + relationship)
   * @param rel - Relationship object
   * @returns Tuple of [type, relationship]
   */
  const getTypeAndRelationship = (rel: any): [RelationshipCategory, string] => {
    // New schema: has both type and relationship fields
    if (rel.type && rel.relationship) {
      return [rel.type as RelationshipCategory, rel.relationship];
    }

    // Old schema: only has relationship_type field
    // Determine type based on whether it's in professional list
    const isProfessional = PROFESSIONAL_RELATIONSHIPS.includes(rel.relationship_type);
    const type: RelationshipCategory = isProfessional ? 'Professional' : 'Personal';
    return [type, rel.relationship_type];
  };

  /**
   * Extract phone number from relationship object
   * Handles both old schema (mobile_phone, home_phone, work_phone) and new schema (phone_number)
   * @param rel - Relationship object
   * @returns First available phone number or null
   */
  const getPhoneFromRelationship = (rel: any): string | null => {
    // New schema
    if (rel.phone_number !== undefined) {
      return rel.phone_number;
    }
    // Old schema - prioritize mobile, then home, then work
    return rel.mobile_phone || rel.home_phone || rel.work_phone || null;
  };

  const [type, relationshipValue] = getTypeAndRelationship(relationship);

  // Form state - initialized from relationship
  const [formData, setFormData] = useState<RelationshipFormData>({
    name: relationship.name,
    type: type,
    relationship: relationshipValue,
    status: relationship.status,
    date_of_birth: relationship.date_of_birth || null,
    email: relationship.email || null,
    phone_number: getPhoneFromRelationship(relationship),
    dependency: relationship.dependency || false,
    firm_name: relationship.firm_name || null,
    address_id: relationship.address_id || null,
    notes: relationship.notes || null,
  });

  // API error state
  const [apiError, setApiError] = useState<string>('');

  // Track original form data to detect changes
  const [originalData] = useState<RelationshipFormData>({
    name: relationship.name,
    type: type,
    relationship: relationshipValue,
    status: relationship.status,
    date_of_birth: relationship.date_of_birth || null,
    email: relationship.email || null,
    phone_number: getPhoneFromRelationship(relationship),
    dependency: relationship.dependency || false,
    firm_name: relationship.firm_name || null,
    address_id: relationship.address_id || null,
    notes: relationship.notes || null,
  });

  // Validation hook
  const { errors, validateField, validateForm, clearAllErrors, clearError, handleBlur, handleChange } = useRelationshipValidation();

  // Mutation hook
  const { mutateAsync, isPending } = useUpdateSpecialRelationship();

  // Reset form when relationship changes
  useEffect(() => {
    if (isOpen) {
      const [newType, newRelationshipValue] = getTypeAndRelationship(relationship);
      const newFormData = {
        name: relationship.name,
        type: newType,
        relationship: newRelationshipValue,
        status: relationship.status,
        date_of_birth: relationship.date_of_birth || null,
        email: relationship.email || null,
        phone_number: getPhoneFromRelationship(relationship),
        dependency: relationship.dependency || false,
        firm_name: relationship.firm_name || null,
        address_id: relationship.address_id || null,
        notes: relationship.notes || null,
      };
      setFormData(newFormData);
      clearAllErrors();
      setApiError('');
    }
  }, [isOpen, relationship, clearAllErrors]);

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
   * @returns Object containing only the fields that changed, with null for cleared values
   */
  const getChangedFields = () => {
    const changes: any = {};

    if (formData.name !== originalData.name) {
      changes.name = formData.name;
    }
    if (formData.type !== originalData.type) {
      changes.type = formData.type;
    }
    if (formData.relationship !== originalData.relationship) {
      changes.relationship = formData.relationship;
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
    if (formData.dependency !== originalData.dependency) {
      changes.dependency = formData.dependency;
    }
    if (formData.firm_name !== originalData.firm_name) {
      changes.firm_name = formData.firm_name || null;
    }
    if (formData.address_id !== originalData.address_id) {
      changes.address_id = formData.address_id || null;
    }
    if (formData.notes !== originalData.notes) {
      changes.notes = formData.notes || null;
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
      title={formData.type === 'Professional' ? 'Edit Professional Relationship' : 'Edit Personal Relationship'}
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
            {isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </ModalShell>
  );
};

export default EditSpecialRelationshipModal;
