/**
 * RelationshipFormFields Component (Phase 4 - Refactored)
 *
 * Shared form fields component for creating and editing special relationships.
 * Provides consistent field rendering with full accessibility support.
 *
 * @module RelationshipFormFields
 *
 * Features:
 * - All form fields with proper labels and ARIA attributes
 * - Conditional rendering based on relationship type (personal/professional)
 * - Split type and relationship fields for new schema
 * - Firm name field for professional relationships
 * - Dependency checkbox for personal relationships
 * - Address selection with create new option
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

import React, { useState } from 'react';
import ComboDropdown from '@/components/ui/dropdowns/ComboDropdown';
import {
  RelationshipStatus,
  RelationshipCategory,
  PERSONAL_RELATIONSHIPS,
  PROFESSIONAL_RELATIONSHIPS,
} from '@/types/specialRelationship';
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
 * Props for RelationshipFormFields component
 */
export interface RelationshipFormFieldsProps {
  /** Current form data values */
  formData: {
    name: string;
    type: RelationshipCategory;
    relationship: string;
    status: RelationshipStatus;
    date_of_birth?: string | null;
    email?: string | null;
    phone_number?: string | null;
    dependency?: boolean;
    firm_name?: string | null;
    address_id?: number | null;
    notes?: string | null;
  };
  /** Callback when field value changes */
  onChange: (formData: any) => void;
  /** Callback when field loses focus (triggers validation) */
  onBlur: (field: string, value?: any) => void;
  /** Validation errors keyed by field name */
  errors: ValidationErrors;
  /** Whether form is disabled (e.g., during submission) */
  disabled?: boolean;
  /** Available addresses for selection */
  addresses?: Address[];
  /** Callback when creating a new address */
  onCreateAddress?: (address: Omit<Address, 'id'>) => void;
}

/**
 * Shared form fields component for special relationship modals
 *
 * Renders all form fields with consistent styling, validation, and accessibility.
 * Fields are conditionally displayed based on relationship type (Personal/Professional).
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
  addresses = [],
  onCreateAddress,
}) => {
  // State for showing address creation form
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [newAddress, setNewAddress] = useState({
    line_1: '',
    line_2: '',
    line_3: '',
    line_4: '',
    line_5: '',
  });

  // Determine if professional based on type field
  const isProfessional = formData.type === 'Professional';

  // Type category options (Personal or Professional)
  const typeOptions: Array<{ label: string; value: RelationshipCategory }> = [
    { label: 'Personal', value: 'Personal' },
    { label: 'Professional', value: 'Professional' },
  ];

  // Relationship options based on selected type
  const relationshipOptions = (isProfessional
    ? PROFESSIONAL_RELATIONSHIPS
    : PERSONAL_RELATIONSHIPS
  ).map((rel) => ({
    label: rel,
    value: rel,
  }));

  // Select appropriate status options based on relationship type
  const statusOptions = isProfessional ? PROFESSIONAL_STATUS_OPTIONS : PERSONAL_STATUS_OPTIONS;

  // Address options for dropdown
  const addressOptions = addresses.map((addr) => ({
    label: `${addr.line_1}${addr.line_2 ? ', ' + addr.line_2 : ''}`,
    value: addr.id.toString(),
  }));

  /**
   * Handle type change - reset relationship field when type changes
   */
  const handleTypeChange = (value: RelationshipCategory) => {
    onChange({
      ...formData,
      type: value,
      relationship: '', // Reset relationship when type changes
    });
    setTimeout(() => onBlur('type'), 0);
  };

  /**
   * Handle creating a new address
   */
  const handleCreateAddress = () => {
    if (onCreateAddress && newAddress.line_1.trim()) {
      onCreateAddress(newAddress);
      setNewAddress({
        line_1: '',
        line_2: '',
        line_3: '',
        line_4: '',
        line_5: '',
      });
      setShowAddressForm(false);
    }
  };

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

      {/* Type Field (Personal or Professional) */}
      <div className="form-field">
        <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
          Type
          <span className="text-red-500 ml-1">*</span>
        </label>
        <select
          id="type"
          name="type"
          value={formData.type}
          onChange={(e) => handleTypeChange(e.target.value as RelationshipCategory)}
          disabled={disabled}
          aria-required="true"
          aria-invalid={!!errors.type}
          aria-describedby={errors.type ? 'type-error' : undefined}
          className="block w-full rounded-md shadow-sm sm:text-sm border border-gray-300 focus:border-primary-500 focus:ring-primary-500 focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors px-3 py-2"
        >
          <option value="">Select type...</option>
          {typeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {errors.type && (
          <p id="type-error" className="mt-1 text-xs text-red-600" role="alert">
            {errors.type}
          </p>
        )}
      </div>

      {/* Relationship Field (populated based on type) */}
      <div className="form-field">
        <label htmlFor="relationship" className="block text-sm font-medium text-gray-700 mb-1">
          Relationship
          <span className="text-red-500 ml-1">*</span>
        </label>
        <ComboDropdown
          id="relationship"
          value={formData.relationship}
          onChange={(value) => {
            onChange({ ...formData, relationship: value });
            setTimeout(() => onBlur('relationship'), 0);
          }}
          options={relationshipOptions}
          placeholder={formData.type ? 'Select or type relationship' : 'Please select a type first'}
          disabled={disabled || !formData.type}
          required
          error={errors.relationship}
          allowCustomValue={true}
        />
      </div>

      {/* Firm Name Field (only for professional relationships) */}
      {isProfessional && (
        <div className="form-field">
          <label htmlFor="firm_name" className="block text-sm font-medium text-gray-700 mb-1">
            Firm Name
          </label>
          <input
            id="firm_name"
            name="firm_name"
            type="text"
            value={formData.firm_name || ''}
            onChange={(e) => onChange({ ...formData, firm_name: e.target.value })}
            onBlur={(e) => onBlur('firm_name', e.target.value)}
            disabled={disabled}
            aria-invalid={!!errors.firm_name}
            aria-describedby={errors.firm_name ? 'firm_name-error' : undefined}
            className="block w-full rounded-md shadow-sm sm:text-sm border border-gray-300 focus:border-primary-500 focus:ring-primary-500 focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors px-3 py-2"
            placeholder="e.g., Smith & Associates"
          />
          {errors.firm_name && (
            <p id="firm_name-error" className="mt-1 text-xs text-red-600" role="alert">
              {errors.firm_name}
            </p>
          )}
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

      {/* Dependency Checkbox (only for personal relationships) */}
      {!isProfessional && (
        <div className="form-field">
          <div className="flex items-center">
            <input
              id="dependency"
              name="dependency"
              type="checkbox"
              checked={formData.dependency || false}
              onChange={(e) => onChange({ ...formData, dependency: e.target.checked })}
              disabled={disabled}
              aria-invalid={!!errors.dependency}
              aria-describedby={errors.dependency ? 'dependency-error' : undefined}
              className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 focus:ring-2 focus:ring-offset-0 transition-colors"
            />
            <label htmlFor="dependency" className="ml-2 block text-sm font-medium text-gray-700">
              Dependent?
            </label>
          </div>
          {errors.dependency && (
            <p id="dependency-error" className="mt-1 text-xs text-red-600" role="alert">
              {errors.dependency}
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

      {/* Address Field */}
      <div className="form-field">
        <label htmlFor="address_id" className="block text-sm font-medium text-gray-700 mb-1">
          Address
        </label>
        {!showAddressForm ? (
          <>
            <select
              id="address_id"
              name="address_id"
              value={formData.address_id?.toString() || ''}
              onChange={(e) => onChange({ ...formData, address_id: e.target.value ? parseInt(e.target.value) : null })}
              disabled={disabled}
              className="block w-full rounded-md shadow-sm sm:text-sm border border-gray-300 focus:border-primary-500 focus:ring-primary-500 focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors px-3 py-2"
            >
              <option value="">Select an address...</option>
              {addressOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {onCreateAddress && (
              <button
                type="button"
                onClick={() => setShowAddressForm(true)}
                disabled={disabled}
                className="mt-2 text-sm text-primary-600 hover:text-primary-700 focus:outline-none focus:underline"
              >
                + Create New Address
              </button>
            )}
          </>
        ) : (
          <div className="space-y-3 p-4 bg-gray-50 rounded-md">
            <div>
              <label htmlFor="new_address_line_1" className="block text-xs font-medium text-gray-700 mb-1">
                Address Line 1
                <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                id="new_address_line_1"
                type="text"
                value={newAddress.line_1}
                onChange={(e) => setNewAddress({ ...newAddress, line_1: e.target.value })}
                disabled={disabled}
                className="block w-full rounded-md shadow-sm sm:text-sm border border-gray-300 focus:border-primary-500 focus:ring-primary-500 focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors px-3 py-2"
                placeholder="123 Main Street"
              />
            </div>
            <div>
              <label htmlFor="new_address_line_2" className="block text-xs font-medium text-gray-700 mb-1">
                Address Line 2
              </label>
              <input
                id="new_address_line_2"
                type="text"
                value={newAddress.line_2}
                onChange={(e) => setNewAddress({ ...newAddress, line_2: e.target.value })}
                disabled={disabled}
                className="block w-full rounded-md shadow-sm sm:text-sm border border-gray-300 focus:border-primary-500 focus:ring-primary-500 focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors px-3 py-2"
                placeholder="Apartment, suite, etc."
              />
            </div>
            <div>
              <label htmlFor="new_address_line_3" className="block text-xs font-medium text-gray-700 mb-1">
                City
              </label>
              <input
                id="new_address_line_3"
                type="text"
                value={newAddress.line_3}
                onChange={(e) => setNewAddress({ ...newAddress, line_3: e.target.value })}
                disabled={disabled}
                className="block w-full rounded-md shadow-sm sm:text-sm border border-gray-300 focus:border-primary-500 focus:ring-primary-500 focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors px-3 py-2"
                placeholder="London"
              />
            </div>
            <div>
              <label htmlFor="new_address_line_4" className="block text-xs font-medium text-gray-700 mb-1">
                County
              </label>
              <input
                id="new_address_line_4"
                type="text"
                value={newAddress.line_4}
                onChange={(e) => setNewAddress({ ...newAddress, line_4: e.target.value })}
                disabled={disabled}
                className="block w-full rounded-md shadow-sm sm:text-sm border border-gray-300 focus:border-primary-500 focus:ring-primary-500 focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors px-3 py-2"
                placeholder="Greater London"
              />
            </div>
            <div>
              <label htmlFor="new_address_line_5" className="block text-xs font-medium text-gray-700 mb-1">
                Postcode
              </label>
              <input
                id="new_address_line_5"
                type="text"
                value={newAddress.line_5}
                onChange={(e) => setNewAddress({ ...newAddress, line_5: e.target.value })}
                disabled={disabled}
                className="block w-full rounded-md shadow-sm sm:text-sm border border-gray-300 focus:border-primary-500 focus:ring-primary-500 focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors px-3 py-2"
                placeholder="SW1A 1AA"
              />
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowAddressForm(false);
                  setNewAddress({
                    line_1: '',
                    line_2: '',
                    line_3: '',
                    line_4: '',
                    line_5: '',
                  });
                }}
                disabled={disabled}
                className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateAddress}
                disabled={disabled || !newAddress.line_1.trim()}
                className="px-3 py-1 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Address
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RelationshipFormFields;
