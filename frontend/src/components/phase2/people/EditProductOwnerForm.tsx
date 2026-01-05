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
import FormTextField from './form/FormTextField';
import { PRODUCT_OWNER_STATUS } from '@/utils/productOwnerConstants';
import type { ProductOwner } from '@/types/productOwner';

// ============================================================================
// Constants
// ============================================================================

/**
 * Button text constants
 */
const BUTTON_TEXT = {
  CANCEL: 'Cancel',
  SAVE: 'Save',
  SAVING: 'Saving...',
  CREATE: 'Create',
  CREATING: 'Creating...',
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
 * Validation error from FastAPI 422 responses
 *
 * FastAPI returns validation errors with:
 * - loc: Array with path to field (e.g., ['body', 'email_1'])
 * - msg: Human-readable error message
 * - type: Error type (e.g., 'value_error.email')
 */
export interface ValidationError {
  loc: (string | number)[];
  msg: string;
  type: string;
}

/**
 * EditProductOwnerForm Props Interface
 *
 * @property productOwner - Existing product owner data for pre-population (optional for create mode)
 * @property onSubmit - Callback when form is submitted with valid data (changed fields for edit, all fields for create)
 * @property onCancel - Callback when user cancels editing
 * @property isSubmitting - Loading state during API submission
 * @property mode - Form mode: 'edit' (default) or 'create'
 * @property onDirtyChange - Optional callback when form dirty state changes
 * @property validationErrors - Optional array of FastAPI validation errors to display inline
 */
interface EditProductOwnerFormProps {
  /** Existing product owner data for pre-population (optional for create mode) */
  productOwner?: ProductOwner;
  /** Callback when form is submitted with valid data (changed fields for edit, all fields for create) */
  onSubmit: (data: Partial<ProductOwner>) => Promise<void>;
  /** Callback when user cancels editing */
  onCancel: () => void;
  /** Loading state during API submission */
  isSubmitting: boolean;
  /** Form mode: 'edit' (default) or 'create' */
  mode?: 'edit' | 'create';
  /** Optional callback when form dirty state changes */
  onDirtyChange?: (isDirty: boolean) => void;
  /** Optional array of FastAPI validation errors to display inline */
  validationErrors?: ValidationError[];
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
  status: yup.string().oneOf(Object.values(PRODUCT_OWNER_STATUS)).required(),

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
  address_line_1: yup.string().nullable().max(100, ERROR_MESSAGES.MAX_100),
  address_line_2: yup.string().nullable().max(100, ERROR_MESSAGES.MAX_100),
  address_line_3: yup.string().nullable().max(100, ERROR_MESSAGES.MAX_100),
  address_line_4: yup.string().nullable().max(100, ERROR_MESSAGES.MAX_100),
  address_line_5: yup.string().nullable().max(100, ERROR_MESSAGES.MAX_100),
  notes: yup.string().nullable(),

  // Deceased date (conditional field based on status)
  deceased_date: yup
    .string()
    .nullable()
    .test('is-valid-date', ERROR_MESSAGES.DATE_INVALID, isValidDate),

  // Contact Information - Additional Fields
  moved_in_date: yup
    .string()
    .nullable()
    .matches(/^\d{4}-\d{2}-\d{2}$|^$/, ERROR_MESSAGES.DATE_INVALID)
    .test('is-valid-date', ERROR_MESSAGES.DATE_INVALID, isValidDate),

  // Client Profiling Fields
  three_words: yup.string().nullable().max(200, 'Must be less than 200 characters'),
  share_data_with: yup.string().nullable().max(200, 'Must be less than 200 characters'),

  // Professional & Compliance Fields
  occupation: yup.string().nullable().max(100, ERROR_MESSAGES.MAX_100),
  ni_number: yup
    .string()
    .nullable()
    .matches(/^[A-Z]{2}[0-9]{6}[A-Z]$/, ERROR_MESSAGES.NI_NUMBER_INVALID),
  employment_status: yup.string().nullable().max(100, ERROR_MESSAGES.MAX_100),
  passport_expiry_date: yup
    .string()
    .nullable()
    .matches(/^\d{4}-\d{2}-\d{2}$|^$/, ERROR_MESSAGES.DATE_INVALID)
    .test('is-valid-date', ERROR_MESSAGES.DATE_INVALID, isValidDate),
  aml_result: yup.string().nullable().max(50, ERROR_MESSAGES.MAX_100),
  aml_date: yup
    .string()
    .nullable()
    .matches(/^\d{4}-\d{2}-\d{2}$|^$/, ERROR_MESSAGES.DATE_INVALID)
    .test('is-valid-date', ERROR_MESSAGES.DATE_INVALID, isValidDate),
});

// ============================================================================
// Component
// ============================================================================

/**
 * EditProductOwnerForm Component
 *
 * Renders comprehensive form with 4 sections and 30 fields.
 * Handles validation, dirty tracking, and submission.
 * Supports both edit mode (update existing) and create mode (new record).
 *
 * @param props - Component props
 * @returns JSX element with form sections and fields
 */
const EditProductOwnerForm: React.FC<EditProductOwnerFormProps> = ({
  productOwner,
  onSubmit,
  onCancel,
  isSubmitting,
  mode = 'edit',
  onDirtyChange,
  validationErrors,
}) => {
  // Default values for create mode (empty) or edit mode (existing data)
  const defaultValues = mode === 'create'
    ? {
        status: PRODUCT_OWNER_STATUS.ACTIVE, // Default to active for new product owners
        // All other fields will be empty/undefined
      }
    : productOwner;

  const {
    control,
    handleSubmit,
    formState: { errors, isDirty, dirtyFields, isSubmitting: formIsSubmitting },
    watch,
    setError,
  } = useForm({
    resolver: yupResolver(validationSchema),
    defaultValues,
    mode: 'all', // Validate on blur and change for best UX and test compatibility
  });

  /**
   * Watch status field to conditionally show deceased_date
   * Deceased status triggers display of deceased_date field
   */
  const statusValue = watch('status');
  const isDeceased = statusValue === PRODUCT_OWNER_STATUS.DECEASED;

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
   * Apply external validation errors from FastAPI 422 responses
   *
   * When the API returns validation errors, this effect parses them and
   * applies them to the corresponding form fields using setError.
   *
   * FastAPI validation error format:
   * {
   *   detail: [
   *     { loc: ['body', 'email_1'], msg: 'Invalid email format', type: 'value_error.email' }
   *   ]
   * }
   *
   * The loc array contains the path to the field. We extract the field name
   * (last element after 'body') and set the error message on that field.
   */
  React.useEffect(() => {
    if (validationErrors && validationErrors.length > 0) {
      validationErrors.forEach((error) => {
        // Extract field name from loc array (e.g., ['body', 'email_1'] -> 'email_1')
        const fieldName = error.loc[error.loc.length - 1] as string;

        // Set error on the field
        setError(fieldName as any, {
          type: 'server',
          message: error.msg,
        });
      });
    }
  }, [validationErrors, setError]);

  /**
   * Handle form submission
   *
   * Edit mode: Only sends changed fields to API (based on dirtyFields)
   * Create mode: Sends all filled fields to API
   *
   * Performance: Sending only changed fields reduces payload size and
   * allows for precise audit logging of what was modified.
   *
   * @param data - Form data with all field values
   */
  const handleFormSubmit = useCallback(async (data: any) => {
    try {
      if (mode === 'edit') {
        // Extract only changed fields from form data for edit mode
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
      } else {
        // Send all filled fields for create mode
        await onSubmit(data);
      }
    } catch (error) {
      console.error('Form submit error:', error);
      throw error;
    }
  }, [dirtyFields, mode, onSubmit]);

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      {/* Personal Information */}
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
            label="Relationship"
            control={control}
            placeholder="e.g., Husband, Wife, Daughter"
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
                  <option value={PRODUCT_OWNER_STATUS.ACTIVE}>Active</option>
                  <option value={PRODUCT_OWNER_STATUS.LAPSED}>Lapsed</option>
                  <option value={PRODUCT_OWNER_STATUS.DECEASED}>Deceased</option>
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

      {/* Contact Information */}
      <div className="grid grid-cols-1 gap-4">
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
          <FormTextField
            name="address_line_1"
            label="Address Line 1"
            control={control}
            placeholder="House number and street"
          />
          <FormTextField
            name="address_line_2"
            label="Address Line 2"
            control={control}
            placeholder="Optional"
          />
          <FormTextField
            name="address_line_3"
            label="Address Line 3"
            control={control}
            placeholder="Town/City"
          />
          <FormTextField
            name="address_line_4"
            label="Address Line 4"
            control={control}
            placeholder="County/State"
          />
          <FormTextField
            name="address_line_5"
            label="Address Line 5"
            control={control}
            placeholder="SW1A 1AA"
          />
          <FormTextField
            name="moved_in_date"
            label="Moved In Date"
            control={control}
            type="date"
          />
        </div>

      {/* Client Profiling */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormTextField
            name="three_words"
            label="Three Words"
            control={control}
            placeholder="e.g., Conservative, Detail-oriented, Family-focused"
          />
          <FormTextField
            name="share_data_with"
            label="Share Data With"
            control={control}
            placeholder="Data sharing preferences"
          />
        </div>

      {/* Professional & Compliance */}
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
          <FormTextField
            name="employment_status"
            label="Employment Status"
            control={control}
            placeholder="e.g., Employed, Self-employed, Retired"
          />
          <FormTextField
            name="passport_expiry_date"
            label="Passport Expiry Date"
            control={control}
            type="date"
          />
          <Controller
            name="aml_result"
            control={control}
            render={({ field, fieldState }) => (
              <div className="form-field">
                <label
                  htmlFor="aml_result"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  AML Result
                </label>
                <select
                  {...field}
                  id="aml_result"
                  value={field.value ?? ''}
                  className={`block w-full rounded-md shadow-sm sm:text-sm border ${
                    fieldState.invalid
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
                  } focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors px-3 py-2`}
                  aria-invalid={fieldState.invalid}
                  aria-describedby={fieldState.error ? 'aml_result-error' : undefined}
                >
                  <option value="">Select result</option>
                  <option value="Pass">Pass</option>
                  <option value="Fail">Fail</option>
                </select>
                {fieldState.error && (
                  <p
                    id="aml_result-error"
                    className="mt-1 text-sm text-red-600"
                    role="alert"
                  >
                    {fieldState.error.message}
                  </p>
                )}
              </div>
            )}
          />
          <FormTextField
            name="aml_date"
            label="AML Check Date"
            control={control}
            type="date"
          />
        </div>

      {/* Form Actions */}
      {/* Notes Field - Always Visible Outside Sections                     */}
      {/* ================================================================== */}
      <Controller
        name="notes"
        control={control}
        render={({ field, fieldState }) => (
          <div className="form-field mt-6">
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

      {/* ================================================================== */}
      {/* Form Actions - Cancel and Save/Create buttons                      */}
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

        {/* Submit Button - Text changes based on mode (Save for edit, Create for create) */}
        {/* Edit mode: Disabled if submitting or no changes made */}
        {/* Create mode: Disabled only if submitting */}
        <button
          type="submit"
          disabled={isSubmitting || (mode === 'edit' && !isDirty)}
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
              {mode === 'create' ? BUTTON_TEXT.CREATING : BUTTON_TEXT.SAVING}
            </>
          ) : (
            mode === 'create' ? BUTTON_TEXT.CREATE : BUTTON_TEXT.SAVE
          )}
        </button>
      </div>
    </form>
  );
};

export default EditProductOwnerForm;
