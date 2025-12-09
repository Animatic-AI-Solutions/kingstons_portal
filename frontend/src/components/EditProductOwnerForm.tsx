/**
 * EditProductOwnerForm Component
 *
 * Comprehensive form for editing product owner data with 30+ fields across 4 sections.
 * Uses react-hook-form for state management and yup for validation.
 *
 * Features:
 * - Progressive disclosure with 4 collapsible sections
 * - Validation on blur and submit with yup schema
 * - Conditional field rendering (deceased_date based on status)
 * - Dirty tracking for unsaved changes detection
 * - Loading state during submission
 * - Comprehensive field validation
 *
 * @module components/EditProductOwnerForm
 */

import React, { useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import FormSection from './form/FormSection';
import FormTextField from './form/FormTextField';
import type { ProductOwner } from '@/types/productOwner';

// ============================================================================
// Constants
// ============================================================================

/**
 * Form section configuration
 * Defines the 4 progressive disclosure sections with titles and default states
 */
const FORM_SECTIONS = {
  PERSONAL: {
    TITLE: 'Personal Information',
    DEFAULT_OPEN: true,
  },
  CONTACT: {
    TITLE: 'Contact Information',
    DEFAULT_OPEN: false,
  },
  HEALTH: {
    TITLE: 'Health Information',
    DEFAULT_OPEN: false,
  },
  PROFESSIONAL: {
    TITLE: 'Professional Information',
    DEFAULT_OPEN: false,
  },
} as const;

/**
 * Button text constants
 */
const BUTTON_TEXT = {
  CANCEL: 'Cancel',
  SAVE: 'Save',
  SAVING: 'Saving...',
} as const;

/**
 * Status values for the status dropdown
 */
const STATUS_VALUES = {
  ACTIVE: 'active',
  LAPSED: 'lapsed',
  DECEASED: 'deceased',
} as const;

/**
 * Validation error messages
 * Provides user-friendly error messages with examples
 */
const ERROR_MESSAGES = {
  FIRSTNAME_REQUIRED: 'First name is required',
  FIRSTNAME_MAX: 'First name must be less than 100 characters',
  SURNAME_REQUIRED: 'Surname is required',
  SURNAME_MAX: 'Surname must be less than 100 characters',
  EMAIL_INVALID: 'Please enter a valid email address (e.g., name@example.com)',
  EMAIL_MAX: 'Email must be less than 255 characters',
  PHONE_INVALID: 'Please enter a valid phone number (e.g., 07700 900 123)',
  DATE_INVALID: 'Please enter a valid date in YYYY-MM-DD format',
  NI_NUMBER_INVALID: 'Invalid NI number format (e.g., AB123456C)',
  MAX_100: 'Must be less than 100 characters',
  MAX_200: 'Must be less than 200 characters',
} as const;

// ============================================================================
// Types & Interfaces
// ============================================================================

/**
 * EditProductOwnerForm Props Interface
 *
 * @property productOwner - Existing product owner data for pre-population
 * @property onSubmit - Callback when form is submitted with valid data (only changed fields)
 * @property onCancel - Callback when user cancels editing
 * @property isSubmitting - Loading state during API submission
 * @property onDirtyChange - Optional callback when form dirty state changes
 */
interface EditProductOwnerFormProps {
  /** Existing product owner data for pre-population */
  productOwner: ProductOwner;
  /** Callback when form is submitted with valid data (only changed fields) */
  onSubmit: (data: Partial<ProductOwner>) => Promise<void>;
  /** Callback when user cancels editing */
  onCancel: () => void;
  /** Loading state during API submission */
  isSubmitting: boolean;
  /** Optional callback when form dirty state changes */
  onDirtyChange?: (isDirty: boolean) => void;
}

// ============================================================================
// Validation Schema
// ============================================================================

/**
 * Date validation test function
 * Validates that a date string is a valid date in ISO format (YYYY-MM-DD)
 *
 * @param value - Date string to validate
 * @returns True if valid or null, false otherwise
 */
const isValidDate = (value: string | null | undefined): boolean => {
  if (!value) return true; // Allow null/undefined
  const date = new Date(value);
  return !isNaN(date.getTime());
};

/**
 * Validation Schema for Product Owner Form
 *
 * Defines validation rules for all editable fields.
 * Uses yup for declarative schema-based validation.
 *
 * Field Categories:
 * 1. Core Identity: firstname*, surname*, known_as, status*
 * 2. Personal Details: title, middle_names, relationship_status, gender, previous_names, dob, place_of_birth
 * 3. Contact Information: email_1, email_2, phone_1, phone_2, address_id, notes
 * 4. Health Information: vulnerability, health_notes, deceased_date
 * 5. Professional Information: occupation, ni_number
 *
 * (* = required field)
 *
 * Validation Rules:
 * - firstname: Required, max 100 characters
 * - surname: Required, max 100 characters
 * - email_1, email_2: Valid email format, optional, max 255 characters
 * - phone_1, phone_2: UK phone format (digits, spaces, hyphens, parentheses), optional
 * - dob, deceased_date: Valid date in YYYY-MM-DD format, optional
 * - ni_number: UK NI format (2 letters, 6 digits, 1 letter), optional
 */
const validationSchema = yup.object({
  // Core Identity Fields
  firstname: yup
    .string()
    .required(ERROR_MESSAGES.FIRSTNAME_REQUIRED)
    .max(100, ERROR_MESSAGES.FIRSTNAME_MAX),
  surname: yup
    .string()
    .required(ERROR_MESSAGES.SURNAME_REQUIRED)
    .max(100, ERROR_MESSAGES.SURNAME_MAX),
  known_as: yup.string().nullable().max(100, ERROR_MESSAGES.MAX_100),
  status: yup.string().oneOf([STATUS_VALUES.ACTIVE, STATUS_VALUES.LAPSED, STATUS_VALUES.DECEASED]).required(),

  // Personal Details Fields
  title: yup.string().nullable().max(20, ERROR_MESSAGES.MAX_100),
  middle_names: yup.string().nullable().max(100, ERROR_MESSAGES.MAX_100),
  relationship_status: yup.string().nullable().max(50, ERROR_MESSAGES.MAX_100),
  gender: yup.string().nullable().max(50, ERROR_MESSAGES.MAX_100),
  previous_names: yup.string().nullable().max(200, ERROR_MESSAGES.MAX_200),
  dob: yup
    .string()
    .nullable()
    .matches(/^\d{4}-\d{2}-\d{2}$|^$/, ERROR_MESSAGES.DATE_INVALID)
    .test('is-valid-date', ERROR_MESSAGES.DATE_INVALID, isValidDate),
  place_of_birth: yup.string().nullable().max(100, ERROR_MESSAGES.MAX_100),

  // Contact Information Fields
  email_1: yup
    .string()
    .nullable()
    .email(ERROR_MESSAGES.EMAIL_INVALID)
    .max(255, ERROR_MESSAGES.EMAIL_MAX),
  email_2: yup
    .string()
    .nullable()
    .email(ERROR_MESSAGES.EMAIL_INVALID)
    .max(255, ERROR_MESSAGES.EMAIL_MAX),
  phone_1: yup
    .string()
    .nullable()
    .matches(/^[0-9\s\-()]{0,20}$/, ERROR_MESSAGES.PHONE_INVALID),
  phone_2: yup
    .string()
    .nullable()
    .matches(/^[0-9\s\-()]{0,20}$/, ERROR_MESSAGES.PHONE_INVALID),
  address_id: yup.number().nullable(),
  notes: yup.string().nullable(),

  // Health Information Fields
  vulnerability: yup.string().nullable(),
  health_notes: yup.string().nullable(),
  deceased_date: yup
    .string()
    .nullable()
    .test('is-valid-date', ERROR_MESSAGES.DATE_INVALID, isValidDate),

  // Professional Information Fields
  occupation: yup.string().nullable().max(100, ERROR_MESSAGES.MAX_100),
  ni_number: yup
    .string()
    .nullable()
    .matches(/^[A-Z]{2}[0-9]{6}[A-Z]$/, ERROR_MESSAGES.NI_NUMBER_INVALID),
});

// ============================================================================
// Component
// ============================================================================

/**
 * EditProductOwnerForm Component
 *
 * Renders comprehensive form with 4 sections and 30 fields.
 * Handles validation, dirty tracking, and submission.
 *
 * @param props - Component props
 * @returns JSX element with form sections and fields
 */
const EditProductOwnerForm: React.FC<EditProductOwnerFormProps> = ({
  productOwner,
  onSubmit,
  onCancel,
  isSubmitting,
  onDirtyChange,
}) => {
  const {
    control,
    handleSubmit,
    formState: { errors, isDirty, dirtyFields, isSubmitting: formIsSubmitting },
    watch,
  } = useForm({
    resolver: yupResolver(validationSchema),
    defaultValues: productOwner,
    mode: 'onChange', // Validate on change to clear errors immediately
  });

  /**
   * Watch status field to conditionally show deceased_date
   * Deceased status triggers display of deceased_date field
   */
  const statusValue = watch('status');
  const isDeceased = statusValue === STATUS_VALUES.DECEASED;

  /**
   * Notify parent component of dirty state changes
   * Enables unsaved changes warning in modal
   */
  React.useEffect(() => {
    if (onDirtyChange) {
      onDirtyChange(isDirty);
    }
  }, [isDirty, onDirtyChange]);

  /**
   * Handle form submission
   * Only sends changed fields to API (based on dirtyFields)
   *
   * Performance: Sending only changed fields reduces payload size and
   * allows for precise audit logging of what was modified.
   *
   * @param data - Form data with all field values
   */
  const handleFormSubmit = useCallback(async (data: any) => {
    // Extract only changed fields from form data
    // dirtyFields can be { fieldName: true } or { fieldName: { ... } } for nested fields
    const changedData: Partial<ProductOwner> = {};

    Object.keys(dirtyFields).forEach((key) => {
      const typedKey = key as keyof ProductOwner;
      // Check if the field is actually dirty (could be boolean or object for nested fields)
      if (dirtyFields[typedKey]) {
        changedData[typedKey] = data[key];
      }
    });

    await onSubmit(changedData);
  }, [dirtyFields, onSubmit]);

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-0">
      {/* ================================================================== */}
      {/* Section 1: Personal Information (expanded by default)              */}
      {/* ================================================================== */}
      <FormSection title={FORM_SECTIONS.PERSONAL.TITLE} defaultOpen={FORM_SECTIONS.PERSONAL.DEFAULT_OPEN}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormTextField
            name="title"
            label="Title"
            control={control}
            placeholder="Mr, Mrs, Ms, Dr"
          />
          <FormTextField
            name="firstname"
            label="First Name"
            control={control}
            required
          />
          <FormTextField
            name="middle_names"
            label="Middle Name(s)"
            control={control}
            placeholder="Optional"
          />
          <FormTextField
            name="surname"
            label="Surname"
            control={control}
            required
          />
          <FormTextField
            name="previous_names"
            label="Previous Name(s)"
            control={control}
            placeholder="Maiden name, etc."
          />
          <FormTextField
            name="dob"
            label="Date of Birth"
            control={control}
            type="date"
          />
          <FormTextField
            name="place_of_birth"
            label="Place of Birth"
            control={control}
            placeholder="City, Country"
          />
          <FormTextField
            name="relationship_status"
            label="Relationship Status"
            control={control}
            placeholder="Single, Married, etc."
          />
          <Controller
            name="status"
            control={control}
            render={({ field, fieldState }) => (
              <div className="form-field">
                <label
                  htmlFor="status"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Status <span className="text-red-500 ml-1">*</span>
                </label>
                <select
                  {...field}
                  id="status"
                  className={`block w-full rounded-md shadow-sm sm:text-sm border ${
                    fieldState.invalid
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
                  } focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors px-3 py-2`}
                  aria-invalid={fieldState.invalid}
                  aria-required
                  aria-describedby={fieldState.error ? 'status-error' : undefined}
                >
                  <option value={STATUS_VALUES.ACTIVE}>Active</option>
                  <option value={STATUS_VALUES.LAPSED}>Lapsed</option>
                  <option value={STATUS_VALUES.DECEASED}>Deceased</option>
                </select>
                {fieldState.error && (
                  <p
                    id="status-error"
                    className="mt-1 text-sm text-red-600"
                    role="alert"
                  >
                    {fieldState.error.message}
                  </p>
                )}
              </div>
            )}
          />
        </div>
      </FormSection>

      {/* ================================================================== */}
      {/* Section 2: Contact Information (collapsed by default)              */}
      {/* ================================================================== */}
      <FormSection title={FORM_SECTIONS.CONTACT.TITLE} defaultOpen={FORM_SECTIONS.CONTACT.DEFAULT_OPEN}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormTextField
            name="email_1"
            label="Primary Email"
            control={control}
            type="email"
            placeholder="john@example.com"
          />
          <FormTextField
            name="email_2"
            label="Secondary Email"
            control={control}
            type="email"
            placeholder="Optional"
          />
          <FormTextField
            name="phone_1"
            label="Primary Phone"
            control={control}
            type="tel"
            placeholder="07700 900 123"
          />
          <FormTextField
            name="phone_2"
            label="Secondary Phone"
            control={control}
            type="tel"
            placeholder="Optional"
          />
          <Controller
            name="address_id"
            control={control}
            render={({ field, fieldState }) => (
              <div className="form-field sm:col-span-2">
                <label
                  htmlFor="address_id"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Address
                </label>
                <input
                  {...field}
                  id="address_id"
                  type="number"
                  value={field.value ?? ''}
                  placeholder="Address ID"
                  className={`block w-full rounded-md shadow-sm sm:text-sm border ${
                    fieldState.invalid
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
                  } focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors px-3 py-2`}
                  aria-invalid={fieldState.invalid}
                  aria-describedby={fieldState.error ? 'address_id-error' : undefined}
                />
                {fieldState.error && (
                  <p
                    id="address_id-error"
                    className="mt-1 text-sm text-red-600"
                    role="alert"
                  >
                    {fieldState.error.message}
                  </p>
                )}
              </div>
            )}
          />
          <Controller
            name="notes"
            control={control}
            render={({ field, fieldState }) => (
              <div className="form-field sm:col-span-2">
                <label
                  htmlFor="notes"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Notes
                </label>
                <textarea
                  {...field}
                  id="notes"
                  rows={3}
                  value={field.value ?? ''}
                  placeholder="Additional notes"
                  className={`block w-full rounded-md shadow-sm sm:text-sm border ${
                    fieldState.invalid
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
                  } focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors px-3 py-2`}
                  aria-invalid={fieldState.invalid}
                  aria-describedby={fieldState.error ? 'notes-error' : undefined}
                />
                {fieldState.error && (
                  <p
                    id="notes-error"
                    className="mt-1 text-sm text-red-600"
                    role="alert"
                  >
                    {fieldState.error.message}
                  </p>
                )}
              </div>
            )}
          />
        </div>
      </FormSection>

      {/* ================================================================== */}
      {/* Section 3: Health Information (collapsed by default)               */}
      {/* ================================================================== */}
      <FormSection title={FORM_SECTIONS.HEALTH.TITLE} defaultOpen={FORM_SECTIONS.HEALTH.DEFAULT_OPEN}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormTextField
            name="vulnerability"
            label="Vulnerability"
            control={control}
            placeholder="Any vulnerabilities"
          />
          <FormTextField
            name="health_notes"
            label="Health Notes"
            control={control}
            placeholder="Health-related notes"
          />
          {/* Conditional deceased_date field - only shown when status is 'deceased' */}
          {/* Business rule: Deceased date is required context for deceased status */}
          {isDeceased && (
            <FormTextField
              name="deceased_date"
              label="Deceased Date"
              control={control}
              type="date"
            />
          )}
        </div>
      </FormSection>

      {/* ================================================================== */}
      {/* Section 4: Professional Information (collapsed by default)         */}
      {/* ================================================================== */}
      <FormSection title={FORM_SECTIONS.PROFESSIONAL.TITLE} defaultOpen={FORM_SECTIONS.PROFESSIONAL.DEFAULT_OPEN}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormTextField
            name="occupation"
            label="Occupation"
            control={control}
            placeholder="Job title or profession"
          />
          <FormTextField
            name="ni_number"
            label="NI Number"
            control={control}
            placeholder="AB123456C"
            pattern="[A-Z]{2}[0-9]{6}[A-Z]"
          />
        </div>
      </FormSection>

      {/* ================================================================== */}
      {/* Form Actions - Cancel and Save buttons                             */}
      {/* ================================================================== */}
      <div className="modal-footer flex justify-end gap-3 pt-6 border-t border-gray-200 mt-6">
        {/* Cancel Button - Triggers unsaved changes warning if form is dirty */}
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {BUTTON_TEXT.CANCEL}
        </button>

        {/* Save Button - Disabled if submitting or no changes made */}
        <button
          type="submit"
          disabled={isSubmitting || !isDirty}
          className="inline-flex justify-center items-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? (
            <>
              {/* Loading spinner SVG */}
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              {BUTTON_TEXT.SAVING}
            </>
          ) : (
            BUTTON_TEXT.SAVE
          )}
        </button>
      </div>
    </form>
  );
};

export default EditProductOwnerForm;
