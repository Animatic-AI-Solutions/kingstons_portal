/**
 * FormTextField Component
 *
 * Reusable text input field component integrated with react-hook-form.
 * Provides consistent styling, validation, and accessibility across all forms.
 *
 * Features:
 * - Full react-hook-form integration via Controller
 * - Automatic error message display
 * - Required field indicator (asterisk)
 * - ARIA attributes for accessibility
 * - Support for text, email, tel, date input types
 * - Optional pattern validation for specialized formats
 *
 * @module components/form/FormTextField
 */

import React from 'react';
import { Controller, Control, FieldValues, Path } from 'react-hook-form';

/**
 * FormTextField Props Interface
 *
 * Generic type T extends FieldValues for type-safe field names
 *
 * @property label - Field label text displayed above input
 * @property name - Field name (must match form schema property)
 * @property control - react-hook-form control object
 * @property required - Whether field is required (shows asterisk, adds aria-required)
 * @property type - HTML input type (text, email, tel, date)
 * @property placeholder - Placeholder text shown in empty input
 * @property pattern - HTML5 pattern attribute for validation
 */
interface FormTextFieldProps<T extends FieldValues> {
  /** Field label text displayed above input */
  label: string;
  /** Field name (must match form schema property) */
  name: Path<T>;
  /** react-hook-form control object */
  control: Control<T>;
  /** Whether field is required (shows asterisk, adds aria-required) */
  required?: boolean;
  /** HTML input type (text, email, tel, date) */
  type?: 'text' | 'email' | 'tel' | 'date';
  /** Placeholder text shown in empty input */
  placeholder?: string;
  /** HTML5 pattern attribute for validation */
  pattern?: string;
}

/**
 * FormTextField Component
 *
 * Renders a labeled text input field with validation and error display.
 * Integrates with react-hook-form for form state management.
 *
 * Performance: Memoized to prevent unnecessary re-renders.
 * Only re-renders when props change (label, name, control, required, type, placeholder, pattern).
 *
 * Note: React.memo works with generic functions by wrapping the implementation.
 * The generic type parameter is preserved in the function signature.
 *
 * @param props - Component props
 * @returns JSX element with Controller wrapping input
 *
 * @example
 * // Basic text field
 * <FormTextField
 *   name="firstname"
 *   label="First Name"
 *   control={control}
 *   required
 * />
 *
 * @example
 * // Email field with placeholder
 * <FormTextField
 *   name="email_1"
 *   label="Primary Email"
 *   control={control}
 *   type="email"
 *   placeholder="john@example.com"
 * />
 *
 * @example
 * // Phone field with pattern validation
 * <FormTextField
 *   name="phone_1"
 *   label="Primary Phone"
 *   control={control}
 *   type="tel"
 *   pattern="[0-9]{10,11}"
 * />
 */
const FormTextFieldComponent = <T extends FieldValues>({
  label,
  name,
  control,
  required = false,
  type = 'text',
  placeholder,
  pattern,
}: FormTextFieldProps<T>): JSX.Element => {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <div className="form-field">
          <label
            htmlFor={name}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <input
            {...field}
            id={name}
            type={type}
            placeholder={placeholder}
            pattern={pattern}
            value={field.value ?? ''}
            className={`block w-full rounded-md shadow-sm sm:text-sm border ${
              fieldState.invalid
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:border-primary-500 focus:ring-primary-500'
            } focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors px-3 py-2`}
            aria-invalid={fieldState.invalid}
            aria-required={required}
            aria-describedby={fieldState.error ? `${name}-error` : undefined}
          />
          {fieldState.error && (
            <p
              id={`${name}-error`}
              className="mt-1 text-sm text-red-600"
              role="alert"
            >
              {fieldState.error.message}
            </p>
          )}
        </div>
      )}
    />
  );
};

// Memoize the component for performance
// Note: React.memo preserves the generic type parameter
const FormTextField = React.memo(FormTextFieldComponent) as typeof FormTextFieldComponent;

// Display name for React DevTools
FormTextField.displayName = 'FormTextField';

export default FormTextField;
