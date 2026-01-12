import React, { forwardRef, useState, useCallback, useEffect } from 'react';

/**
 * CurrencyInput Component
 *
 * A specialized input for GBP currency values with:
 * - £ symbol prefix
 * - Automatic formatting with thousand separators (1,234.56)
 * - Limited to 2 decimal places
 * - Right-aligned text
 * - Raw number editing on focus, formatted display on blur
 */

export interface CurrencyInputProps {
  /** Current value as number */
  value: number | null | undefined;
  /** Callback when value changes (returns number or null) */
  onChange: (value: number | null) => void;
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
  /** Allow negative values */
  allowNegative?: boolean;
  /** Minimum value */
  min?: number;
  /** Maximum value */
  max?: number;
}

/**
 * Formats a number as currency display (1234.5 -> 1,234.50)
 */
const formatCurrency = (value: number | null | undefined): string => {
  if (value === null || value === undefined || isNaN(value)) return '';

  const fixed = value.toFixed(2);
  const parts = fixed.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
};

/**
 * Parses a string to number, handling currency formatting
 */
const parseCurrency = (str: string): number | null => {
  if (!str || str.trim() === '') return null;

  // Remove commas and any non-numeric characters except . and -
  const cleaned = str.replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);

  return isNaN(parsed) ? null : parsed;
};

const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(({
  value,
  onChange,
  onBlur,
  label,
  error,
  helperText,
  required = false,
  disabled = false,
  placeholder = '0.00',
  size = 'md',
  fullWidth = true,
  className = '',
  id,
  allowNegative = false,
  min,
  max,
}, ref) => {
  const inputId = id || `currency-input-${Math.random().toString(36).substr(2, 9)}`;

  const [displayValue, setDisplayValue] = useState(() => formatCurrency(value));
  const [isFocused, setIsFocused] = useState(false);

  // Update display when external value changes (and not focused)
  useEffect(() => {
    if (!isFocused) {
      setDisplayValue(formatCurrency(value));
    }
  }, [value, isFocused]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    // Show raw number for editing
    if (value !== null && value !== undefined) {
      setDisplayValue(value.toString());
    }
  }, [value]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);

    let numValue = parseCurrency(displayValue);

    // Apply min/max constraints
    if (numValue !== null) {
      if (min !== undefined && numValue < min) numValue = min;
      if (max !== undefined && numValue > max) numValue = max;
    }

    // Round to 2 decimal places
    if (numValue !== null) {
      numValue = Math.round(numValue * 100) / 100;
    }

    setDisplayValue(formatCurrency(numValue));
    onChange(numValue);

    if (onBlur) onBlur();
  }, [displayValue, onChange, onBlur, min, max]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;

    // Allow only valid number characters
    const regex = allowNegative ? /^-?\d*\.?\d{0,2}$/ : /^\d*\.?\d{0,2}$/;

    // Also allow intermediate states like "1." or "-"
    const intermediateRegex = allowNegative ? /^-?\d*\.?\d*$/ : /^\d*\.?\d*$/;

    if (intermediateRegex.test(inputValue) || inputValue === '') {
      // Check decimal places
      const parts = inputValue.split('.');
      if (parts.length === 2 && parts[1].length > 2) {
        // Too many decimal places, truncate
        const truncated = parts[0] + '.' + parts[1].substring(0, 2);
        setDisplayValue(truncated);
        onChange(parseCurrency(truncated));
      } else {
        setDisplayValue(inputValue);
        onChange(parseCurrency(inputValue));
      }
    }
  }, [allowNegative, onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.currentTarget.blur();
    }
    if (e.key === 'Escape') {
      e.currentTarget.blur();
    }
  }, []);

  // Styling
  const hasError = !!error;

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm h-8',
    md: 'px-3 py-2 text-sm h-10',
    lg: 'px-4 py-3 text-base h-12'
  };

  const inputClasses = `
    block border rounded-md shadow-sm transition-all duration-150 ease-in-out
    focus:outline-none focus:ring-4 focus:ring-offset-2
    text-right pl-8
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

      {/* Input with £ symbol */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <span className="text-gray-500 text-sm">£</span>
        </div>

        <input
          ref={ref}
          id={inputId}
          type="text"
          inputMode="decimal"
          value={displayValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete="off"
          aria-invalid={hasError ? 'true' : 'false'}
          aria-describedby={
            error ? `${inputId}-error` :
            helperText ? `${inputId}-helper` : undefined
          }
          className={inputClasses}
        />
      </div>

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

CurrencyInput.displayName = 'CurrencyInput';

export default CurrencyInput;
