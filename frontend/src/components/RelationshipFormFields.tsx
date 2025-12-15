/**
 * RelationshipFormFields Component (Cycle 7)
 *
 * Shared form fields for creating and editing special relationships.
 * - All form fields with labels
 * - Conditional rendering based on relationship type
 * - Editable dropdown for Relationship Type
 * - Error message display with role="alert"
 * - Field-level ARIA attributes
 */

import React from 'react';
import ComboDropdown from '@/components/ui/dropdowns/ComboDropdown';
import { RelationshipStatus, PERSONAL_RELATIONSHIP_TYPES, PROFESSIONAL_RELATIONSHIP_TYPES } from '@/types/specialRelationship';
import { ValidationErrors } from '@/hooks/useRelationshipValidation';

export interface RelationshipFormFieldsProps {
  /** Form data */
  formData: {
    name: string;
    relationship_type: string;
    status: RelationshipStatus;
    date_of_birth?: string;
    email?: string;
    phone_number?: string;
  };
  /** Field change handler */
  onChange: (field: string, value: string) => void;
  /** Field blur handler for validation */
  onBlur: (field: string, value?: any) => void;
  /** Validation errors */
  errors: ValidationErrors;
  /** Whether this is a professional relationship */
  isProfessional: boolean;
  /** Whether form is disabled (e.g., during submission) */
  disabled?: boolean;
}

const RelationshipFormFields: React.FC<RelationshipFormFieldsProps> = ({
  formData,
  onChange,
  onBlur,
  errors,
  isProfessional,
  disabled = false,
}) => {
  // Relationship type options based on isProfessional
  const relationshipTypeOptions = (isProfessional
    ? PROFESSIONAL_RELATIONSHIP_TYPES
    : PERSONAL_RELATIONSHIP_TYPES
  ).map((type) => ({
    label: type,
    value: type,
  }));

  // Status options
  const statusOptions: Array<{ label: string; value: RelationshipStatus }> = [
    { label: 'Active', value: 'Active' },
    { label: 'Inactive', value: 'Inactive' },
    { label: 'Deceased', value: 'Deceased' },
  ];

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
          onChange={(e) => onChange('name', e.target.value)}
          onBlur={(e) => onBlur('name', e.target.value)}
          disabled={disabled}
          aria-required="true"
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? 'name-error' : undefined}
          className="block w-full rounded-md shadow-sm sm:text-sm border border-gray-300 focus:border-primary-500 focus:ring-primary-500 focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors px-3 py-2"
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
            onChange('relationship_type', value);
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
          onChange={(e) => onChange('status', e.target.value as RelationshipStatus)}
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
            onChange={(e) => onChange('date_of_birth', e.target.value)}
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
          onChange={(e) => onChange('email', e.target.value)}
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
          onChange={(e) => onChange('phone_number', e.target.value)}
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
