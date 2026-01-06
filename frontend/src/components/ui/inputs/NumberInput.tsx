import React, { InputHTMLAttributes, ReactNode, forwardRef, useState, useEffect, useRef } from 'react';

export interface NumberInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'type' | 'value' | 'onChange'> {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'error';
  fullWidth?: boolean;
  // Number-specific props
  format?: 'decimal' | 'percentage' | 'currency';
  currency?: string;
  decimalPlaces?: number;
  thousandSeparator?: boolean;
  allowNegative?: boolean;
  showSteppers?: boolean;
  suffix?: string;
  prefix?: string;
  // Override value and onChange to be number-specific
  value?: number | string;
  onChange?: (value: number | null) => void;
  // Allow onKeyDown to be passed through
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(({
  label,
  error,
  helperText,
  required = false,
  leftIcon,
  rightIcon,
  size = 'md',
  variant = 'default',
  fullWidth = true,
  className = '',
  disabled = false,
  id,
  value,
  onChange,
  onBlur,
  onKeyDown,
  // Number-specific props
  format = 'decimal',
  currency = '£',
  decimalPlaces = 2,
  thousandSeparator = true,
  allowNegative = false,
  showSteppers = false,
  suffix,
  prefix,
  min,
  max,
  step,
  ...restProps
}, ref) => {
  const [displayValue, setDisplayValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isUserTyping, setIsUserTyping] = useState(false);
  const lastValueRef = useRef(value);
  
  // Generate unique ID if not provided
  const inputId = id || `number-input-${Math.random().toString(36).substr(2, 9)}`;
  
  // Determine variant based on error state
  const currentVariant = error ? 'error' : variant;
  
  // Format number for display
  const formatNumber = (num: number | string): string => {
    if (num === '' || num === null || num === undefined) return '';
    
    const numValue = typeof num === 'string' ? parseFloat(num) : num;
    if (isNaN(numValue)) return '';
    
    // Handle zero values properly
    if (numValue === 0) return '0';
    
    let formatted = numValue.toFixed(decimalPlaces);
    
    if (thousandSeparator) {
      const parts = formatted.split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      formatted = parts.join('.');
    }
    
    return formatted;
  };
  
  // Parse formatted string back to number
  const parseNumber = (str: string): number | null => {
    if (!str || str.trim() === '') return null;
    
    // Handle the case where user types just "0"
    if (str.trim() === '0') return 0;
    
    const cleaned = str.replace(/[^\d.-]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  };
  
  // Initialize display value when component mounts
  useEffect(() => {
    if (value !== undefined && value !== null) {
      setDisplayValue(formatNumber(value));
    } else {
      setDisplayValue('');
    }
    lastValueRef.current = value;
  }, []); // Only run on mount
  
  // Update display value when value prop changes from outside (not from user input)
  useEffect(() => {
    // Only update if the value changed from outside the component (not from user typing)
    if (value !== lastValueRef.current && !isUserTyping) {
      if (value !== undefined && value !== null) {
        if (isFocused) {
          // Show raw number when focused
          setDisplayValue(value.toString());
        } else {
          // Show formatted number when not focused
          setDisplayValue(formatNumber(value));
        }
      } else {
        // Handle null/undefined values
        setDisplayValue('');
      }
    }
    lastValueRef.current = value;
  }, [value, isFocused, decimalPlaces, thousandSeparator, isUserTyping]);
  
  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    setIsUserTyping(false);
    // Show raw number for editing
    if (value !== undefined && value !== null) {
      setDisplayValue(value.toString());
    }
  };
  
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    setIsUserTyping(false);
    const numValue = parseNumber(e.target.value);
    
    // Validate min/max
    let validatedValue = numValue;
    if (min !== undefined && numValue !== null && numValue < Number(min)) {
      validatedValue = Number(min);
    }
    if (max !== undefined && numValue !== null && numValue > Number(max)) {
      validatedValue = Number(max);
    }
    
    // Format for display
    setDisplayValue(validatedValue !== null ? formatNumber(validatedValue) : '');
    
    // Call onChange with validated number
    if (onChange) {
      onChange(validatedValue);
    }
    
    if (onBlur) {
      onBlur(e);
    }
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    // Allow only numbers, decimal point, and minus (if negative allowed)
    const regex = allowNegative ? /^-?\d*\.?\d*$/ : /^\d*\.?\d*$/;
    
    if (regex.test(inputValue) || inputValue === '') {
      setIsUserTyping(true);
      setDisplayValue(inputValue);
      
      if (onChange) {
        // Convert to number if valid, otherwise pass null
        const numValue = parseNumber(inputValue);
        onChange(numValue);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Set user typing flag when user starts typing
    setIsUserTyping(true);

    // Prevent form submission when Enter is pressed unless specifically overridden
    if (e.key === 'Enter') {
      e.preventDefault();
      // Optionally blur the field to simulate moving to next field
      e.currentTarget.blur();
    }

    // Blur on Escape key for better UX
    if (e.key === 'Escape') {
      e.currentTarget.blur();
    }

    // Call custom onKeyDown handler if provided
    if (onKeyDown) {
      onKeyDown(e);
    }
  };
  
  const handleStepUp = () => {
    const currentValue = parseNumber(displayValue);
    const stepValue = step ? Number(step) : 1;
    const newValue = currentValue !== null ? currentValue + stepValue : stepValue;
    
    if (max === undefined || newValue <= Number(max)) {
      setDisplayValue(newValue.toString());
      if (onChange) {
        onChange(newValue);
      }
    }
  };
  
  const handleStepDown = () => {
    const currentValue = parseNumber(displayValue);
    const stepValue = step ? Number(step) : 1;
    const newValue = currentValue !== null ? currentValue - stepValue : -stepValue;
    
    if (min === undefined || newValue >= Number(min)) {
      setDisplayValue(newValue.toString());
      if (onChange) {
        onChange(newValue);
      }
    }
  };
  
  // Base classes
  const baseClasses = 'block border rounded-md shadow-sm transition-all duration-150 ease-in-out focus:outline-none focus:ring-4 focus:ring-offset-2';
  
  // Size classes - consistent with Group 1 heights (32px, 40px, 48px)
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm h-8 font-normal', // 32px height
    md: 'px-3 py-2 text-sm h-10 font-normal',  // 40px height  
    lg: 'px-4 py-3 text-base h-12 font-normal' // 48px height
  };
  
  // Variant classes
  const variantClasses = {
    default: 'border-gray-300 focus:border-primary-700 focus:ring-primary-700/10 bg-white',
    success: 'border-green-500 focus:border-green-600 focus:ring-green-500/10 bg-white',
    error: 'border-red-500 focus:border-red-600 focus:ring-red-500/10 bg-red-50'
  };
  
  // Disabled classes
  const disabledClasses = disabled 
    ? 'bg-gray-50 text-gray-500 cursor-not-allowed border-gray-200' 
    : 'hover:border-gray-400';
  
  // Width classes
  const widthClasses = fullWidth ? 'w-full' : '';
  
  // Calculate padding based on icons and format
  let paddingClasses = '';
  const hasLeftContent = leftIcon || format === 'currency' || prefix;
  const hasRightContent = rightIcon || format === 'percentage' || suffix || showSteppers;
  
  if (hasLeftContent && hasRightContent) {
    paddingClasses = showSteppers ? 'pl-10 pr-16' : 'pl-10 pr-10';
  } else if (hasLeftContent) {
    paddingClasses = 'pl-10';
  } else if (hasRightContent) {
    paddingClasses = showSteppers ? 'pr-16' : 'pr-10';
  }
  
  const inputClasses = `
    ${baseClasses}
    ${sizeClasses[size]}
    ${variantClasses[currentVariant]}
    ${disabledClasses}
    ${widthClasses}
    ${paddingClasses}
    ${className}
    text-right
  `.trim().replace(/\s+/g, ' ');

  return (
    <div className={`${fullWidth ? 'w-full' : ''}`}>
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
      
      {/* Input Container */}
      <div className="relative">
        {/* Left Content (Icon, Currency, Prefix) */}
        {(leftIcon || format === 'currency' || prefix) && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <div className="h-3 w-3 text-gray-500 text-sm flex items-center justify-center">
              {leftIcon || (format === 'currency' && currency) || prefix}
            </div>
          </div>
        )}
        
        {/* Input Field */}
        <input
          ref={ref}
          id={inputId}
          type="text"
          inputMode="decimal"
          disabled={disabled}
          value={displayValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={
            error ? `${inputId}-error` : 
            helperText ? `${inputId}-helper` : undefined
          }
          className={inputClasses}
        />
        
        {/* Right Content (Icon, Percentage, Suffix, Steppers) */}
        <div className="absolute inset-y-0 right-0 flex items-center">
          {/* Steppers */}
          {showSteppers && !disabled && (
            <div className="flex flex-col mr-1">
              <button
                type="button"
                onClick={handleStepUp}
                className="px-1 py-0.5 text-gray-400 hover:text-gray-600 focus:outline-none"
                tabIndex={-1}
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 15l7-7 7 7" />
                </svg>
              </button>
              <button
                type="button"
                onClick={handleStepDown}
                className="px-1 py-0.5 text-gray-400 hover:text-gray-600 focus:outline-none"
                tabIndex={-1}
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          )}
          
          {/* Right Icon/Suffix */}
          {(rightIcon || format === 'percentage' || suffix) && (
            <div className="pr-3 flex items-center pointer-events-none">
              <div className="h-3 w-3 text-gray-500 text-sm flex items-center justify-center">
                {rightIcon || (format === 'percentage' && '%') || suffix}
              </div>
            </div>
          )}
        </div>
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

NumberInput.displayName = 'NumberInput';

export default NumberInput; 