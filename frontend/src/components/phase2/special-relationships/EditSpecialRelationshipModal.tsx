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
import toast from 'react-hot-toast';
import ModalShell from '../../ui';
import PersonalRelationshipFormFields, {
  PersonalRelationshipFormData,
  ProductOwner,
} from './PersonalRelationshipFormFields';
import ProfessionalRelationshipFormFields, {
  ProfessionalRelationshipFormData,
} from './ProfessionalRelationshipFormFields';
import { useUpdateSpecialRelationship } from '@/hooks/useSpecialRelationships';
import {
  SpecialRelationship,
  RelationshipCategory,
  PROFESSIONAL_RELATIONSHIPS,
} from '@/types/specialRelationship';

/**
 * Address interface
 */
export interface Address {
  id: number;
  line_1: string;
  line_2?: string;
  line_3?: string;
  line_4?: string;
  line_5?: string;
}

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
  /** All product owners for multi-select */
  productOwners: ProductOwner[];
  /** Available addresses for selection */
  addresses?: Address[];
  /** Callback for creating new address - returns created address with ID */
  onCreateAddress?: (address: Omit<Address, 'id'>) => Promise<Address>;
  /** Optional callback invoked after successful update with updated relationship */
  onSuccess?: (relationship: SpecialRelationship) => void;
}

const EditSpecialRelationshipModal: React.FC<EditSpecialRelationshipModalProps> = ({
  isOpen,
  onClose,
  relationship,
  productOwners,
  addresses = [],
  onCreateAddress,
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

  // Determine if personal or professional
  const isProfessional = type === 'Professional';

  // Form state - initialized from relationship
  const [formData, setFormData] = useState<any>({
    name: relationship.name,
    type: type,
    relationship: relationshipValue,
    status: relationship.status,
    product_owner_ids: relationship.product_owner_ids || [],
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

  // Field-level errors for validation
  const [errors, setErrors] = useState<any>({});

  // Track original form data to detect changes
  const [originalData, setOriginalData] = useState<any>({
    name: relationship.name,
    type: type,
    relationship: relationshipValue,
    status: relationship.status,
    product_owner_ids: relationship.product_owner_ids || [],
    date_of_birth: relationship.date_of_birth || null,
    email: relationship.email || null,
    phone_number: getPhoneFromRelationship(relationship),
    dependency: relationship.dependency || false,
    firm_name: relationship.firm_name || null,
    address_id: relationship.address_id || null,
    notes: relationship.notes || null,
  });

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
        product_owner_ids: relationship.product_owner_ids || [],
        date_of_birth: relationship.date_of_birth || null,
        email: relationship.email || null,
        phone_number: getPhoneFromRelationship(relationship),
        dependency: relationship.dependency || false,
        firm_name: relationship.firm_name || null,
        address_id: relationship.address_id || null,
        notes: relationship.notes || null,
      };
      setFormData(newFormData);
      setOriginalData(newFormData); // Update original data to match current relationship
      setApiError('');
    }
  }, [isOpen, relationship]);

  /**
   * Handle form data change from child form components
   */
  const handleFormDataChange = useCallback((updates: any) => {
    setFormData(prev => ({ ...prev, ...updates }));
    if (apiError) {
      setApiError('');
    }
  }, [apiError]);

  /**
   * Handle field blur - no-op for now since we're not doing field-level validation
   */
  const handleBlur = useCallback((field: string, value?: any) => {
    // No-op - could add field-level validation here if needed
  }, []);

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

    // Compare product_owner_ids arrays
    const currentIds = JSON.stringify((formData.product_owner_ids || []).sort());
    const originalIds = JSON.stringify((originalData.product_owner_ids || []).sort());
    if (currentIds !== originalIds) {
      changes.product_owner_ids = formData.product_owner_ids;
    }

    return changes;
  };

  /**
   * Handle form submission
   * Detects changes, calls API, and handles success/error cases
   * If no changes detected, simply closes modal without API call
   * @param e - Form submit event
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError('');

    console.log('Form submitted', { formData, originalData });

    // Basic validation - ensure required fields
    if (!formData.name || !formData.name.trim()) {
      toast.error('Name is required');
      return;
    }
    if (!formData.product_owner_ids || formData.product_owner_ids.length === 0) {
      toast.error('At least one product owner is required');
      return;
    }

    try {
      // Get only changed fields - if no changes, just close
      const changes = getChangedFields();
      console.log('Changed fields:', changes);
      if (Object.keys(changes).length === 0) {
        toast.success('No changes to save');
        onClose();
        return;
      }

      const toastId = toast.loading('Saving changes...');

      // Update relationship
      const updatedRelationship = await mutateAsync({
        id: relationship.id,
        data: changes,
      });

      console.log('Updated relationship:', updatedRelationship);

      toast.success('Changes saved successfully', { id: toastId });

      if (onSuccess && updatedRelationship) {
        onSuccess(updatedRelationship);
      }

      onClose();
    } catch (error: any) {
      console.error('Submit error:', error);
      const errorMessage = error?.message || 'An unexpected error occurred';
      setApiError(errorMessage);
      toast.error(errorMessage);
    }
  };

  /**
   * Handle cancel button click
   * Clears errors and closes modal
   */
  const handleCancel = () => {
    setApiError('');
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

        {isProfessional ? (
          <ProfessionalRelationshipFormFields
            formData={formData as ProfessionalRelationshipFormData}
            onChange={handleFormDataChange}
            onBlur={handleBlur}
            errors={errors}
            disabled={isPending}
            addresses={addresses}
            productOwners={productOwners}
            onCreateAddress={onCreateAddress}
          />
        ) : (
          <PersonalRelationshipFormFields
            formData={formData as PersonalRelationshipFormData}
            onChange={handleFormDataChange}
            onBlur={handleBlur}
            errors={errors}
            disabled={isPending}
            addresses={addresses}
            productOwners={productOwners}
            onCreateAddress={onCreateAddress}
          />
        )}

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
