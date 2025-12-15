/**
 * RelationshipFormFields Component (Cycle 7)
 *
 * Shared form fields component for creating and editing special relationships.
 * Provides consistent field rendering with full accessibility support.
 *
 * @module RelationshipFormFields
 *
 * Features:
 * - All form fields with proper labels and ARIA attributes
 * - Conditional rendering based on relationship type (personal/professional)
 * - Editable dropdown for Relationship Type using ComboDropdown
 * - Error message display with role="alert" for screen readers
 * - Field-level validation error display
 * - Disabled state support during form submission
 *
 * Accessibility:
 * - All fields have proper labels associated via htmlFor/id
 * - Required fields marked with visual (*) and aria-required
 * - Error fields have aria-invalid and aria-describedby
 * - Error messages have role="alert" for immediate screen reader announcement
 */

import React from 'react';
import ComboDropdown from '@/components/ui/dropdowns/ComboDropdown';
import MultiSelectDropdown from '@/components/ui/dropdowns/MultiSelectDropdown';
import { RelationshipStatus, PERSONAL_RELATIONSHIP_TYPES, PROFESSIONAL_RELATIONSHIP_TYPES } from '@/types/specialRelationship';
import { ValidationErrors } from '@/hooks/useRelationshipValidation';

// ============================================================================
// Constants
// ============================================================================

/**
 * Status options for personal relationships (includes Deceased)
 */
const PERSONAL_STATUS_OPTIONS: Array<{ label: string; value: RelationshipStatus }> = [
  { label: 'Active', value: 'Active' },
  { label: 'Inactive', value: 'Inactive' },
  { label: 'Deceased', value: 'Deceased' },
];

/**
 * Status options for professional relationships (excludes Deceased)
 */
const PROFESSIONAL_STATUS_OPTIONS: Array<{ label: string; value: RelationshipStatus }> = [
  { label: 'Active', value: 'Active' },
  { label: 'Inactive', value: 'Inactive' },
];

/**
 * Product owner interface for relationship_with field
 */
export interface ProductOwner {
  id: string;
  firstname: string;
  surname: string;
}

/**
 * Props for RelationshipFormFields component
 */
export interface RelationshipFormFieldsProps {
  /** Current form data values */
  formData: {
    name: string;
    relationship_type: string;
    status: RelationshipStatus;
    date_of_birth?: string;
    email?: string;
    phone_number?: string;
    is_dependent?: boolean;
    relationship_with?: string[];
    is_professional?: boolean;  // Added to match test expectations
  };
  /** Callback when field value changes */
  onChange: (formData: any) => void;  // Changed to match test expectations
  /** Callback when field loses focus (triggers validation) */
  onBlur: (field: string, value?: any) => void;
  /** Validation errors keyed by field name */
  errors: ValidationErrors;
  /** Whether form is disabled (e.g., during submission) */
  disabled?: boolean;
  /** Product owners for relationship_with field (professional relationships only) */
  productOwners?: ProductOwner[];
}

/**
 * Shared form fields component for special relationship modals
 *
 * Renders all form fields with consistent styling, validation, and accessibility.
 * Date of birth field is only shown for personal relationships.
 *
 * @param props - Component props
 * @returns Form fields for special relationship data entry
 */
const RelationshipFormFields: React.FC<RelationshipFormFieldsProps> = ({
  formData,
  onChange,
  onBlur,
  errors,
  disabled = false,
  productOwners = [],
}) => {
  // Determine if professional from formData
  const isProfessional = formData.is_professional || false;

  // Relationship type options based on isProfessional
  const relationshipTypeOptions = (isProfessional
    ? PROFESSIONAL_RELATIONSHIP_TYPES
    : PERSONAL_RELATIONSHIP_TYPES
  ).map((type) => ({
    label: type,
    value: type,
  }));

  // Select appropriate status options based on relationship type
  const statusOptions = isProfessional ? PROFESSIONAL_STATUS_OPTIONS : PERSONAL_STATUS_OPTIONS;

  // Product owner options for relationship_with field
  const productOwnerOptions = productOwners.map((owner) => ({
    label: `${owner.firstname} ${owner.surname}`.trim(),
    value: owner.id,
  }));

  return (
    <div className="space-y-4">
      {/* Name Field */}
      <div className="form-field">
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          Name
          <span className="text-red-500 ml-1">*</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          value={formData.name}
          onChange={(e) => onChange({ ...formData, name: e.target.value })}
          onBlur={(e) => onBlur('name', e.target.value)}
          disabled={disabled}
          aria-required="true"
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? 'name-error' : undefined}
          className={`block w-full rounded-md shadow-sm sm:text-sm border focus:border-primary-500 focus:ring-primary-500 focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors px-3 py-2 ${
            errors.name ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="e.g., John Smith"
        />
        {errors.name && (
          <p id="name-error" className="mt-1 text-xs text-red-600" role="alert">
            {errors.name}
          </p>
        )}
      </div>

      {/* Relationship Type Field */}
      <div className="form-field">
        <label htmlFor="relationship_type" className="block text-sm font-medium text-gray-700 mb-1">
          Relationship Type
          <span className="text-red-500 ml-1">*</span>
        </label>
        <ComboDropdown
          id="relationship_type"
          value={formData.relationship_type}
          onChange={(value) => {
            onChange({ ...formData, relationship_type: value });
            // Trigger validation on change for relationship type
            setTimeout(() => onBlur('relationship_type'), 0);
          }}
          options={relationshipTypeOptions}
          placeholder="Select or type relationship type"
          disabled={disabled}
          required
          error={errors.relationship_type}
          allowCustomValue={true}
        />
      </div>

      {/* Relationship With Field (only for professional relationships) */}
      {isProfessional && (
        <div className="form-field">
          <MultiSelectDropdown
            id="relationship_with"
            label="Relationship With"
            options={productOwnerOptions}
            values={formData.relationship_with || []}
            onChange={(values) => onChange({ ...formData, relationship_with: values as string[] })}
            placeholder="Select product owners..."
            disabled={disabled}
            searchable={true}
            error={errors.relationship_with}
          />
        </div>
      )}

      {/* Status Field */}
      <div className="form-field">
        <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
          Status
          <span className="text-red-500 ml-1">*</span>
        </label>
        <select
          id="status"
          name="status"
          value={formData.status}
          onChange={(e) => onChange({ ...formData, status: e.target.value as RelationshipStatus })}
          onBlur={(e) => onBlur('status', e.target.value)}
          disabled={disabled}
          aria-required="true"
          aria-invalid={!!errors.status}
          aria-describedby={errors.status ? 'status-error' : undefined}
          className="block w-full rounded-md shadow-sm sm:text-sm border border-gray-300 focus:border-primary-500 focus:ring-primary-500 focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors px-3 py-2"
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {errors.status && (
          <p id="status-error" className="mt-1 text-xs text-red-600" role="alert">
            {errors.status}
          </p>
        )}
      </div>

      {/* Date of Birth (only for personal relationships) */}
      {!isProfessional && (
        <div className="form-field">
          <label htmlFor="date_of_birth" className="block text-sm font-medium text-gray-700 mb-1">
            Date of Birth
          </label>
          <input
            id="date_of_birth"
            name="date_of_birth"
            type="date"
            value={formData.date_of_birth || ''}
            onChange={(e) => onChange({ ...formData, date_of_birth: e.target.value })}
            onBlur={(e) => onBlur('date_of_birth', e.target.value)}
            disabled={disabled}
            aria-invalid={!!errors.date_of_birth}
            aria-describedby={errors.date_of_birth ? 'date_of_birth-error' : undefined}
            className="block w-full rounded-md shadow-sm sm:text-sm border border-gray-300 focus:border-primary-500 focus:ring-primary-500 focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors px-3 py-2"
          />
          {errors.date_of_birth && (
            <p id="date_of_birth-error" className="mt-1 text-xs text-red-600" role="alert">
              {errors.date_of_birth}
            </p>
          )}
        </div>
      )}

      {/* Is Dependent Checkbox (only for personal relationships) */}
      {!isProfessional && (
        <div className="form-field">
          <div className="flex items-center">
            <input
              id="is_dependent"
              name="is_dependent"
              type="checkbox"
              checked={formData.is_dependent || false}
              onChange={(e) => onChange({ ...formData, is_dependent: e.target.checked })}
              disabled={disabled}
              aria-invalid={!!errors.is_dependent}
              aria-describedby={errors.is_dependent ? 'is_dependent-error' : undefined}
              className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 focus:ring-2 focus:ring-offset-0 transition-colors"
            />
            <label htmlFor="is_dependent" className="ml-2 block text-sm font-medium text-gray-700">
              Is Dependent?
            </label>
          </div>
          {errors.is_dependent && (
            <p id="is_dependent-error" className="mt-1 text-xs text-red-600" role="alert">
              {errors.is_dependent}
            </p>
          )}
        </div>
      )}

      {/* Email Field */}
      <div className="form-field">
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          value={formData.email || ''}
          onChange={(e) => onChange({ ...formData, email: e.target.value })}
          onBlur={(e) => onBlur('email', e.target.value)}
          disabled={disabled}
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? 'email-error' : undefined}
          className="block w-full rounded-md shadow-sm sm:text-sm border border-gray-300 focus:border-primary-500 focus:ring-primary-500 focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors px-3 py-2"
          placeholder="email@example.com"
        />
        {errors.email && (
          <p id="email-error" className="mt-1 text-xs text-red-600" role="alert">
            {errors.email}
          </p>
        )}
      </div>

      {/* Phone Number Field */}
      <div className="form-field">
        <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700 mb-1">
          Phone Number
        </label>
        <input
          id="phone_number"
          name="phone_number"
          type="tel"
          value={formData.phone_number || ''}
          onChange={(e) => onChange({ ...formData, phone_number: e.target.value })}
          onBlur={(e) => onBlur('phone_number', e.target.value)}
          disabled={disabled}
          aria-invalid={!!errors.phone_number}
          aria-describedby={errors.phone_number ? 'phone_number-error' : undefined}
          className="block w-full rounded-md shadow-sm sm:text-sm border border-gray-300 focus:border-primary-500 focus:ring-primary-500 focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors px-3 py-2"
          placeholder="01234567890"
        />
        {errors.phone_number && (
          <p id="phone_number-error" className="mt-1 text-xs text-red-600" role="alert">
            {errors.phone_number}
          </p>
        )}
      </div>
    </div>
  );
};

export default RelationshipFormFields;
