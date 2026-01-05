/**
 * PersonalRelationshipFormFields Component
 *
 * Form fields specifically for Personal relationships.
 * Shows only fields relevant to personal relationships (family, friends, pets, etc.)
 *
 * Features:
 * - Name field (required)
 * - Relationship field with ComboDropdown (required)
 * - Product Owners multi-select (required - at least one)
 * - Date of Birth field
 * - Dependency checkbox
 * - Email and phone fields
 * - Address selection
 * - Status dropdown
 * - Notes textarea
 *
 * @module components/PersonalRelationshipFormFields
 */

import React, { useState } from 'react';
import ComboDropdown from '../../ui/dropdowns/ComboDropdown';
import MultiSelectDropdown from '../../ui/dropdowns/MultiSelectDropdown';
import {
  RelationshipStatus,
  PERSONAL_RELATIONSHIPS,
} from '@/types/specialRelationship';

// ==========================
// Types
// ==========================

export interface PersonalRelationshipFormData {
  name: string;
  relationship: string;
  product_owner_ids: number[];
  status: RelationshipStatus;
  date_of_birth?: string | null;
  dependency?: boolean;
  email?: string | null;
  phone_number?: string | null;
  address_id?: number | null;
  notes?: string | null;
}

export interface Address {
  id: number;
  line_1: string;
  line_2?: string;
  line_3?: string;
  line_4?: string;
  line_5?: string;
}

export interface ProductOwner {
  id: number;
  firstname: string;
  surname: string;
}

export interface PersonalRelationshipFormFieldsProps {
  formData: PersonalRelationshipFormData;
  onChange: (updates: Partial<PersonalRelationshipFormData>) => void;
  onBlur: (field: string, value?: any) => void;
  errors: Partial<Record<keyof PersonalRelationshipFormData, string>>;
  disabled?: boolean;
  addresses?: Address[];
  productOwners: ProductOwner[];
  onCreateAddress?: (address: Omit<Address, 'id'>) => Promise<Address>;
}

// ==========================
// Constants
// ==========================

const PERSONAL_STATUS_OPTIONS = [
  { label: 'Active', value: 'Active' },
  { label: 'Inactive', value: 'Inactive' },
  { label: 'Deceased', value: 'Deceased' },
];

// ==========================
// Component
// ==========================

const PersonalRelationshipFormFields: React.FC<PersonalRelationshipFormFieldsProps> = ({
  formData,
  onChange,
  onBlur,
  errors,
  disabled = false,
  addresses = [],
  productOwners,
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

  // Relationship options
  const relationshipOptions = PERSONAL_RELATIONSHIPS.map((rel) => ({
    label: rel,
    value: rel,
  }));

  // Status options
  const statusOptions = PERSONAL_STATUS_OPTIONS;

  // Address options for dropdown
  const addressOptions = addresses.map((addr) => ({
    label: `${addr.line_1}${addr.line_2 ? ', ' + addr.line_2 : ''}`,
    value: addr.id.toString(),
  }));

  // Product owner options
  const productOwnerOptions = productOwners.map((po) => ({
    label: `${po.firstname} ${po.surname}`,
    value: po.id,
  }));

  /**
   * Handle creating a new address
   */
  const handleCreateAddress = async () => {
    if (onCreateAddress && newAddress.line_1.trim()) {
      try {
        const createdAddress = await onCreateAddress(newAddress);

        // Auto-populate the newly created address in the dropdown
        if (createdAddress && createdAddress.id) {
          onChange({ address_id: createdAddress.id });
        }

        setNewAddress({
          line_1: '',
          line_2: '',
          line_3: '',
          line_4: '',
          line_5: '',
        });
        setShowAddressForm(false);
      } catch (error) {
        // Error is already handled by parent component with toast
        console.error('Failed to create address:', error);
      }
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
          onChange={(e) => onChange({ name: e.target.value })}
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

      {/* Relationship Field */}
      <div className="form-field">
        <label htmlFor="relationship" className="block text-sm font-medium text-gray-700 mb-1">
          Relationship
          <span className="text-red-500 ml-1">*</span>
        </label>
        <ComboDropdown
          id="relationship"
          value={formData.relationship}
          onChange={(value) => {
            onChange({ relationship: value });
            setTimeout(() => onBlur('relationship', value), 0);
          }}
          options={relationshipOptions}
          placeholder="Select or type relationship"
          disabled={disabled}
          required
          error={errors.relationship}
          allowCustomValue={true}
        />
      </div>

      {/* Product Owners Multi-Select (REQUIRED) */}
      <div className="form-field">
        <MultiSelectDropdown
          label="Product Owners"
          required
          options={productOwnerOptions}
          values={formData.product_owner_ids}
          onChange={(values) => {
            onChange({ product_owner_ids: values as number[] });
            setTimeout(() => onBlur('product_owner_ids', values), 0);
          }}
          disabled={disabled}
          error={errors.product_owner_ids}
          placeholder="Select at least one product owner"
          searchable
          id="product_owner_ids"
        />
        <p className="mt-1 text-xs text-gray-500">
          Special relationships must be associated with at least one product owner
        </p>
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
          onChange={(e) => onChange({ status: e.target.value as RelationshipStatus })}
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

      {/* Date of Birth */}
      <div className="form-field">
        <label htmlFor="date_of_birth" className="block text-sm font-medium text-gray-700 mb-1">
          Date of Birth
        </label>
        <input
          id="date_of_birth"
          name="date_of_birth"
          type="date"
          value={formData.date_of_birth || ''}
          onChange={(e) => onChange({ date_of_birth: e.target.value })}
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

      {/* Dependency Checkbox */}
      <div className="form-field">
        <div className="flex items-center">
          <input
            id="dependency"
            name="dependency"
            type="checkbox"
            checked={formData.dependency || false}
            onChange={(e) => onChange({ dependency: e.target.checked })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onChange({ dependency: !formData.dependency });
              }
            }}
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
          onChange={(e) => onChange({ email: e.target.value })}
          onBlur={(e) => onBlur('email', e.target.value)}
          disabled={disabled}
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? 'email-error' : undefined}
          className="block w-full rounded-md shadow-sm sm:text-sm border border-gray-300 focus:border-primary-500 focus:ring-primary-500 focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors px-3 py-2"
          placeholder="example@email.com"
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
          onChange={(e) => onChange({ phone_number: e.target.value })}
          onBlur={(e) => onBlur('phone_number', e.target.value)}
          disabled={disabled}
          aria-invalid={!!errors.phone_number}
          aria-describedby={errors.phone_number ? 'phone_number-error' : undefined}
          className="block w-full rounded-md shadow-sm sm:text-sm border border-gray-300 focus:border-primary-500 focus:ring-primary-500 focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors px-3 py-2"
          placeholder="0123 456 7890"
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
          <div className="space-y-2">
            <select
              id="address_id"
              name="address_id"
              value={formData.address_id || ''}
              onChange={(e) => onChange({ address_id: e.target.value ? Number(e.target.value) : null })}
              onBlur={(e) => onBlur('address_id', e.target.value ? Number(e.target.value) : null)}
              disabled={disabled}
              aria-invalid={!!errors.address_id}
              aria-describedby={errors.address_id ? 'address_id-error' : undefined}
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
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                + Create New Address
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3 p-4 bg-gray-50 rounded-md border border-gray-200">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-900">Create New Address</span>
              <button
                type="button"
                onClick={() => setShowAddressForm(false)}
                className="text-sm text-gray-600 hover:text-gray-700"
              >
                Cancel
              </button>
            </div>
            <input
              type="text"
              placeholder="Address Line 1 *"
              value={newAddress.line_1}
              onChange={(e) => setNewAddress({ ...newAddress, line_1: e.target.value })}
              className="block w-full rounded-md shadow-sm sm:text-sm border border-gray-300 focus:border-primary-500 focus:ring-primary-500 px-3 py-2"
            />
            <input
              type="text"
              placeholder="Address Line 2"
              value={newAddress.line_2}
              onChange={(e) => setNewAddress({ ...newAddress, line_2: e.target.value })}
              className="block w-full rounded-md shadow-sm sm:text-sm border border-gray-300 focus:border-primary-500 focus:ring-primary-500 px-3 py-2"
            />
            <input
              type="text"
              placeholder="Address Line 3"
              value={newAddress.line_3}
              onChange={(e) => setNewAddress({ ...newAddress, line_3: e.target.value })}
              className="block w-full rounded-md shadow-sm sm:text-sm border border-gray-300 focus:border-primary-500 focus:ring-primary-500 px-3 py-2"
            />
            <input
              type="text"
              placeholder="City/Town"
              value={newAddress.line_4}
              onChange={(e) => setNewAddress({ ...newAddress, line_4: e.target.value })}
              className="block w-full rounded-md shadow-sm sm:text-sm border border-gray-300 focus:border-primary-500 focus:ring-primary-500 px-3 py-2"
            />
            <input
              type="text"
              placeholder="Postcode"
              value={newAddress.line_5}
              onChange={(e) => setNewAddress({ ...newAddress, line_5: e.target.value })}
              className="block w-full rounded-md shadow-sm sm:text-sm border border-gray-300 focus:border-primary-500 focus:ring-primary-500 px-3 py-2"
            />
            <button
              type="button"
              onClick={handleCreateAddress}
              disabled={!newAddress.line_1.trim()}
              className="w-full px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save Address
            </button>
          </div>
        )}
        {errors.address_id && (
          <p id="address_id-error" className="mt-1 text-xs text-red-600" role="alert">
            {errors.address_id}
          </p>
        )}
      </div>

      {/* Notes Field */}
      <div className="form-field">
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          value={formData.notes || ''}
          onChange={(e) => onChange({ notes: e.target.value })}
          onBlur={(e) => onBlur('notes', e.target.value)}
          disabled={disabled}
          aria-invalid={!!errors.notes}
          aria-describedby={errors.notes ? 'notes-error' : undefined}
          className="block w-full rounded-md shadow-sm sm:text-sm border border-gray-300 focus:border-primary-500 focus:ring-primary-500 focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors px-3 py-2"
          placeholder="Additional notes..."
        />
        {errors.notes && (
          <p id="notes-error" className="mt-1 text-xs text-red-600" role="alert">
            {errors.notes}
          </p>
        )}
      </div>
    </div>
  );
};

export default PersonalRelationshipFormFields;
