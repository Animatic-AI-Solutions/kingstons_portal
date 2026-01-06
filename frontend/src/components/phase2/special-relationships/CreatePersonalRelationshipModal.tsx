/**
 * CreatePersonalRelationshipModal Component
 *
 * Modal for creating Personal relationships (family, friends, pets, etc.)
 * Shows only fields relevant to personal relationships.
 *
 * Features:
 * - Product Owners multi-select (required - at least one)
 * - Personal-specific fields (date_of_birth, dependency)
 * - Hardcodes type: 'Personal' in API payload
 * - Comprehensive error handling with inline API error display
 * - React Query cache invalidation after successful creation
 * - Loading states to prevent double-submission
 * - Success feedback (ready for toast integration)
 * - Defensive input validation
 *
 * @module components/CreatePersonalRelationshipModal
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ModalShell } from '../../ui';
import PersonalRelationshipFormFields, {
  PersonalRelationshipFormData,
  ProductOwner,
  Address,
} from './PersonalRelationshipFormFields';
import { useCreateSpecialRelationship } from '@/hooks/useSpecialRelationships';
import { SpecialRelationship } from '@/types/specialRelationship';

// ==========================
// Types
// ==========================

export interface CreatePersonalRelationshipModalProps {
  /** Whether modal is open */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** List of available product owners for multi-select */
  productOwners: ProductOwner[];
  /** Pre-selected product owner IDs (defaults to empty array) */
  initialProductOwnerIds?: number[];
  /** Success callback with created relationship */
  onSuccess?: (relationship: SpecialRelationship) => void;
  /** Optional addresses for address selection */
  addresses?: Address[];
  /** Optional address creation callback - returns created address with ID */
  onCreateAddress?: (address: Omit<Address, 'id'>) => Promise<Address>;
}

// ==========================
// Component
// ==========================

const CreatePersonalRelationshipModal: React.FC<CreatePersonalRelationshipModalProps> = ({
  isOpen,
  onClose,
  productOwners,
  initialProductOwnerIds = [],
  onSuccess,
  addresses = [],
  onCreateAddress,
}) => {
  const queryClient = useQueryClient();

  // ============================================================
  // CRITICAL FIX #7: Defensive Input Validation
  // ============================================================
  // Validate productOwners array is not empty when modal opens
  if (isOpen && productOwners.length === 0) {
    console.error('[CreatePersonalRelationshipModal] No product owners available');
    onClose();
    return null;
  }

  // Ensure initialProductOwnerIds is a valid array
  const defaultProductOwnerIds = Array.isArray(initialProductOwnerIds)
    ? initialProductOwnerIds.filter((id) => typeof id === 'number' && !isNaN(id))
    : [];

  // ============================================================
  // Form State (CRITICAL FIX #2: Type Safety - product_owner_ids REQUIRED)
  // ============================================================
  const [formData, setFormData] = useState<PersonalRelationshipFormData>({
    name: '',
    relationship: '',
    product_owner_ids: defaultProductOwnerIds, // REQUIRED field
    status: 'Active',
    date_of_birth: null,
    dependency: false,
    email: null,
    phone_number: null,
    address_id: null,
    notes: null,
  });

  // ============================================================
  // Validation State (CRITICAL FIX #1: Complete Validation)
  // ============================================================
  const [errors, setErrors] = useState<Partial<Record<keyof PersonalRelationshipFormData, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof PersonalRelationshipFormData, boolean>>>({});

  // ============================================================
  // API Error State (CRITICAL FIX #3: Error Handling)
  // ============================================================
  const [apiError, setApiError] = useState<string | null>(null);

  // ============================================================
  // CRITICAL FIX #4: React Query Mutation with Cache Invalidation
  // ============================================================
  const { mutateAsync, isPending } = useCreateSpecialRelationship();

  // ============================================================
  // Reset form when modal opens/closes
  // ============================================================
  useEffect(() => {
    if (isOpen) {
      // Reset form to initial state
      setFormData({
        name: '',
        relationship: '',
        product_owner_ids: defaultProductOwnerIds,
        status: 'Active',
        date_of_birth: null,
        dependency: false,
        email: null,
        phone_number: null,
        address_id: null,
        notes: null,
      });
      setErrors({});
      setTouched({});
      setApiError(null);
    }
  }, [isOpen, defaultProductOwnerIds.join(',')]);

  // ============================================================
  // CRITICAL FIX #1: Form Validation (including product_owner_ids)
  // ============================================================
  const validateForm = useCallback((): boolean => {
    const newErrors: Partial<Record<keyof PersonalRelationshipFormData, string>> = {};

    // Name (required)
    if (!formData.name?.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.length > 200) {
      newErrors.name = 'Name must be 200 characters or less';
    }

    // Relationship (required)
    if (!formData.relationship?.trim()) {
      newErrors.relationship = 'Relationship is required';
    } else if (formData.relationship.length > 50) {
      newErrors.relationship = 'Relationship must be 50 characters or less';
    }

    // Product Owner IDs (REQUIRED - at least one)
    if (!formData.product_owner_ids || formData.product_owner_ids.length === 0) {
      newErrors.product_owner_ids = 'At least one product owner is required';
    }

    // Email (optional but must be valid if provided)
    if (formData.email && formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        newErrors.email = 'Please enter a valid email address';
      }
    }

    // Phone (optional but must be valid if provided)
    if (formData.phone_number && formData.phone_number.trim()) {
      const digits = formData.phone_number.replace(/[^\d]/g, '');
      if (digits.length < 10) {
        newErrors.phone_number = 'Phone number must be at least 10 digits';
      } else if (digits.length > 15) {
        newErrors.phone_number = 'Phone number must be no more than 15 digits';
      }
    }

    // Date of Birth (optional but must be valid if provided)
    if (formData.date_of_birth) {
      const date = new Date(formData.date_of_birth);
      const now = new Date();
      if (isNaN(date.getTime())) {
        newErrors.date_of_birth = 'Please enter a valid date';
      } else if (date > now) {
        newErrors.date_of_birth = 'Date cannot be in the future';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // ============================================================
  // Field Change Handler
  // ============================================================
  const handleChange = useCallback((updates: Partial<PersonalRelationshipFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
    // Clear API error when user makes changes
    setApiError(null);
  }, []);

  // ============================================================
  // Field Blur Handler
  // ============================================================
  const handleBlur = useCallback((field: string, value?: any) => {
    setTouched((prev) => ({ ...prev, [field]: true }));

    // Validate individual field on blur
    const newErrors = { ...errors };

    if (field === 'name') {
      const nameValue = value !== undefined ? value : formData.name;
      if (!nameValue?.trim()) {
        newErrors.name = 'Name is required';
      } else if (nameValue.length > 200) {
        newErrors.name = 'Name must be 200 characters or less';
      } else {
        delete newErrors.name;
      }
    }

    if (field === 'relationship') {
      const relationshipValue = value !== undefined ? value : formData.relationship;
      if (!relationshipValue?.trim()) {
        newErrors.relationship = 'Relationship is required';
      } else if (relationshipValue.length > 50) {
        newErrors.relationship = 'Relationship must be 50 characters or less';
      } else {
        delete newErrors.relationship;
      }
    }

    if (field === 'product_owner_ids') {
      const ownerIds = value !== undefined ? value : formData.product_owner_ids;
      if (!ownerIds || ownerIds.length === 0) {
        newErrors.product_owner_ids = 'At least one product owner is required';
      } else {
        delete newErrors.product_owner_ids;
      }
    }

    setErrors(newErrors);
  }, [formData, errors]);

  // ============================================================
  // API Payload Preparation (HARDCODED type: 'Personal')
  // ============================================================
  const prepareCreateData = useCallback(() => {
    // CRITICAL: Type is hardcoded to 'Personal'
    const payload: any = {
      product_owner_ids: formData.product_owner_ids, // ALWAYS include (required)
      name: formData.name.trim(),
      type: 'Personal' as const, // HARDCODED
      relationship: formData.relationship.trim(),
      status: formData.status,
    };

    // Add optional fields only if they have values
    if (formData.date_of_birth) {
      payload.date_of_birth = formData.date_of_birth;
    }

    if (formData.dependency !== undefined && formData.dependency !== null) {
      payload.dependency = formData.dependency;
    }

    if (formData.email && formData.email.trim()) {
      payload.email = formData.email.trim();
    }

    if (formData.phone_number && formData.phone_number.trim()) {
      payload.phone_number = formData.phone_number.trim();
    }

    if (formData.address_id) {
      payload.address_id = formData.address_id;
    }

    if (formData.notes && formData.notes.trim()) {
      payload.notes = formData.notes.trim();
    }

    return payload;
  }, [formData]);

  // ============================================================
  // Form Submission Handler
  // ============================================================
  const handleSubmit = useCallback(async () => {
    // Clear API error on new submission
    setApiError(null);

    // Validate form
    if (!validateForm()) {
      console.warn('[CreatePersonalRelationshipModal] Validation failed:', errors);
      return;
    }

    // CRITICAL FIX #7: Defensive check before submission
    if (!formData.product_owner_ids || formData.product_owner_ids.length === 0) {
      setApiError('At least one product owner is required');
      return;
    }

    // Prepare payload
    const createData = prepareCreateData();

    console.log('[CreatePersonalRelationshipModal] Submitting:', createData);

    try {
      // CRITICAL FIX #5: Loading state handled by isPending
      const createdRelationship = await mutateAsync(createData);

      // Call success callback if provided
      if (onSuccess && createdRelationship) {
        onSuccess(createdRelationship);
      } else {
        // Fallback: close modal if no onSuccess callback
        onClose();
      }
    } catch (error: any) {
      // Display API error
      const errorMessage = error?.message || 'Failed to create personal relationship';
      setApiError(errorMessage);
      console.error('[CreatePersonalRelationshipModal] Submission failed:', error);
    }
  }, [formData, validateForm, prepareCreateData, mutateAsync, errors, onSuccess, onClose]);

  // ============================================================
  // Render
  // ============================================================
  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Create Personal Relationship"
      size="md"
      closeOnBackdropClick={!isPending}
    >
      <div className="space-y-4">
        {/* CRITICAL FIX #3: API Error Display */}
        {apiError && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3" role="alert">
            <div className="flex items-start">
              <svg
                className="h-5 w-5 text-red-400 mt-0.5 mr-2 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-red-800">Failed to create relationship</h3>
                <p className="text-sm text-red-700 mt-1">{apiError}</p>
              </div>
            </div>
          </div>
        )}

        {/* Form Fields */}
        <PersonalRelationshipFormFields
          formData={formData}
          onChange={handleChange}
          onBlur={handleBlur}
          errors={errors}
          disabled={isPending} // CRITICAL FIX #5: Disable fields during submission
          addresses={addresses}
          productOwners={productOwners} // CRITICAL FIX #6: Data flow
          onCreateAddress={onCreateAddress}
        />

        {/* Form Actions */}
        <div className="mt-6 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? 'Creating...' : 'Create Relationship'}
          </button>
        </div>
      </div>
    </ModalShell>
  );
};

export default CreatePersonalRelationshipModal;
