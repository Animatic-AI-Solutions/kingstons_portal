import React, { forwardRef, useState, useCallback } from 'react';

/**
 * NINumberInput Component
 *
 * A specialized input for UK National Insurance numbers with:
 * - Automatic formatting with spaces (AB 12 34 56 C)
 * - Real-time validation
 * - Invalid prefix detection
 *
 * UK NI Number Format:
 * - 2 letters (prefix) + 6 digits + 1 letter (suffix)
 * - Display format: AB 12 34 56 C
 * - Storage format: AB123456C (no spaces)
 *
 * Invalid Prefixes: BG, GB, NK, KN, TN, NT, ZZ
 */

export interface NINumberInputProps {
  /** Current value (stored without spaces) */
  value: string | null | undefined;
  /** Callback when value changes (returns value without spaces) */
  onChange: (value: string) => void;
  /** Optional callback when input loses focus */
  onBlur?: () => void;
  /** Field label */
  label?: string;
  /** Error message to display */
  error?: string;
  /** Helper text shown below input */
  helperText?: string;
  /** Whether field is required */
  required?: boolean;
  /** Whether field is disabled */
  disabled?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Input size */
  size?: 'sm' | 'md' | 'lg';
  /** Full width */
  fullWidth?: boolean;
  /** Additional className */
  className?: string;
  /** Input id */
  id?: string;
}

// Invalid NI number prefixes
const INVALID_PREFIXES = ['BG', 'GB', 'NK', 'KN', 'TN', 'NT', 'ZZ'];


/**
 * Formats an NI number with spaces for display
 * Input: AB123456C -> Output: AB 12 34 56 C
 */
const formatNINumber = (value: string): string => {
  // Remove all spaces and convert to uppercase
  const clean = value.replace(/\s/g, '').toUpperCase();

  if (clean.length === 0) return '';

  // Build formatted string with spaces
  let formatted = '';

  // First 2 characters (prefix letters)
  if (clean.length >= 1) formatted += clean.substring(0, Math.min(2, clean.length));

  // Add space after prefix
  if (clean.length > 2) formatted += ' ';

  // Next 2 digits
  if (clean.length > 2) formatted += clean.substring(2, Math.min(4, clean.length));

  // Add space
  if (clean.length > 4) formatted += ' ';

  // Next 2 digits
  if (clean.length > 4) formatted += clean.substring(4, Math.min(6, clean.length));

  // Add space
  if (clean.length > 6) formatted += ' ';

  // Next 2 digits
  if (clean.length > 6) formatted += clean.substring(6, Math.min(8, clean.length));

  // Add space before suffix
  if (clean.length > 8) formatted += ' ';

  // Suffix letter
  if (clean.length > 8) formatted += clean.substring(8, 9);

  return formatted;
};

/**
 * Removes spaces from NI number for storage
 */
const unformatNINumber = (value: string): string => {
  return value.replace(/\s/g, '').toUpperCase();
};

/**
 * Validates NI number and returns error message if invalid
 */
export const validateNINumber = (value: string | null | undefined): string | null => {
  if (!value || value.trim() === '') {
    return null; // Empty is valid (not required validation handled separately)
  }

  const clean = value.replace(/\s/g, '').toUpperCase();

  // Check length
  if (clean.length !== 9) {
    return 'NI number must be 9 characters (e.g., AB123456C)';
  }

  // Check format: 2 letters + 6 digits + 1 letter
  const formatRegex = /^[A-Z]{2}[0-9]{6}[A-Z]$/;
  if (!formatRegex.test(clean)) {
    return 'Invalid format. Must be 2 letters, 6 digits, 1 letter (e.g., AB123456C)';
  }

  // Check for invalid prefixes
  const prefix = clean.substring(0, 2);
  if (INVALID_PREFIXES.includes(prefix)) {
    return `Invalid prefix "${prefix}". Cannot use: ${INVALID_PREFIXES.join(', ')}`;
  }

  return null;
};

const NINumberInput = forwardRef<HTMLInputElement, NINumberInputProps>(({
  value,
  onChange,
  onBlur,
  label = 'NI Number',
  error,
  helperText = 'Format: AB 12 34 56 C',
  required = false,
  disabled = false,
  placeholder = 'AB 12 34 56 C',
  size = 'md',
  fullWidth = true,
  className = '',
  id,
}, ref) => {
  // Generate unique ID if not provided
  const inputId = id || `ni-input-${Math.random().toString(36).substr(2, 9)}`;

  // Local state for display value (formatted with spaces)
  const [displayValue, setDisplayValue] = useState(() => formatNINumber(value || ''));

  // Update display value when external value changes
  React.useEffect(() => {
    const formatted = formatNINumber(value || '');
    if (formatted !== displayValue) {
      setDisplayValue(formatted);
    }
  }, [value]);

  // Handle input change
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;

    // Remove all non-alphanumeric characters except spaces
    let clean = inputValue.replace(/[^A-Za-z0-9\s]/g, '').toUpperCase();

    // Remove spaces for processing
    const unformatted = clean.replace(/\s/g, '');

    // Enforce character restrictions at each position
    let validChars = '';
    for (let i = 0; i < Math.min(unformatted.length, 9); i++) {
      const char = unformatted[i];

      if (i < 2) {
        // First two positions: letters only
        if (/[A-Z]/.test(char)) {
          validChars += char;
        }
      } else if (i < 8) {
        // Positions 2-7: digits only
        if (/[0-9]/.test(char)) {
          validChars += char;
        }
      } else {
        // Position 8: letter only
        if (/[A-Z]/.test(char)) {
          validChars += char;
        }
      }
    }

    // Format for display
    const formatted = formatNINumber(validChars);
    setDisplayValue(formatted);

    // Send unformatted value to parent
    onChange(validChars);
  }, [onChange]);

  // Handle blur
  const handleBlur = useCallback(() => {
    if (onBlur) {
      onBlur();
    }
  }, [onBlur]);

  // Determine variant based on error state
  const hasError = !!error;

  // Size classes
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm h-8',
    md: 'px-3 py-2 text-sm h-10',
    lg: 'px-4 py-3 text-base h-12'
  };

  // Base input classes
  const inputClasses = `
    block border rounded-md shadow-sm transition-all duration-150 ease-in-out
    focus:outline-none focus:ring-4 focus:ring-offset-2
    font-mono tracking-wider
    ${sizeClasses[size]}
    ${hasError
      ? 'border-red-500 focus:border-red-600 focus:ring-red-500/10 bg-red-50'
      : 'border-gray-300 focus:border-primary-700 focus:ring-primary-700/10 bg-white'
    }
    ${disabled ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : 'hover:border-gray-400'}
    ${fullWidth ? 'w-full' : ''}
    ${className}
  `.trim().replace(/\s+/g, ' ');

  return (
    <div className={fullWidth ? 'w-full' : ''}>
      {/* Label */}
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* Input */}
      <input
        ref={ref}
        id={inputId}
        type="text"
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        disabled={disabled}
        placeholder={placeholder}
        maxLength={13} // "AB 12 34 56 C" = 13 chars with spaces
        autoComplete="off"
        spellCheck={false}
        aria-invalid={hasError ? 'true' : 'false'}
        aria-describedby={
          error ? `${inputId}-error` :
          helperText ? `${inputId}-helper` : undefined
        }
        className={inputClasses}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            e.currentTarget.blur();
          }
          if (e.key === 'Escape') {
            e.currentTarget.blur();
          }
        }}
      />

      {/* Error Message */}
      {error && (
        <p
          id={`${inputId}-error`}
          className="mt-1 text-xs text-red-600 flex items-center"
        >
          <svg className="h-4 w-4 mr-1 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 15.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          {error}
        </p>
      )}

      {/* Helper Text */}
      {helperText && !error && (
        <p
          id={`${inputId}-helper`}
          className="mt-1 text-xs text-gray-500"
        >
          {helperText}
        </p>
      )}
    </div>
  );
});

NINumberInput.displayName = 'NINumberInput';

export default NINumberInput;
