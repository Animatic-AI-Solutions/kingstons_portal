import React, { InputHTMLAttributes, ReactNode, forwardRef, useState, useEffect } from 'react';
import { CalendarIcon } from '@heroicons/react/24/outline';

export interface DateInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'type' | 'value' | 'onChange'> {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'error';
  fullWidth?: boolean;
  // Date-specific props
  value?: Date | string;
  onChange?: (date: Date | null, formattedDate: string) => void;
  minDate?: Date | string;
  maxDate?: Date | string;
  showCalendarIcon?: boolean;
  placeholder?: string;
}

const DateInput = forwardRef<HTMLInputElement, DateInputProps>(({
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
  minDate,
  maxDate,
  showCalendarIcon = true,
  placeholder = 'dd/mm/yyyy',
  ...props
}, ref) => {
  const [displayValue, setDisplayValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  
  // Generate unique ID if not provided
  const inputId = id || `date-input-${Math.random().toString(36).substr(2, 9)}`;
  
  // Determine variant based on error state
  const currentVariant = error ? 'error' : variant;
  
  // Format date to dd/mm/yyyy
  const formatDate = (date: Date | string | null): string => {
    if (!date) return '';
    
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return '';
    
    const day = dateObj.getDate().toString().padStart(2, '0');
    const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
    const year = dateObj.getFullYear();
    
    return `${day}/${month}/${year}`;
  };
  
  // Parse dd/mm/yyyy to Date
  const parseDate = (dateString: string): Date | null => {
    if (!dateString) return null;
    
    // Remove any non-digit characters except /
    const cleaned = dateString.replace(/[^\d/]/g, '');
    const parts = cleaned.split('/');
    
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
      const year = parseInt(parts[2], 10);
      
      // Basic validation
      if (day >= 1 && day <= 31 && month >= 0 && month <= 11 && year >= 1900 && year <= 2100) {
        const date = new Date(year, month, day);
        // Check if the date is valid (handles invalid dates like 31/02/2023)
        if (date.getDate() === day && date.getMonth() === month && date.getFullYear() === year) {
          return date;
        }
      }
    }
    
    return null;
  };
  
  // Validate date against min/max constraints
  const isDateValid = (date: Date): boolean => {
    if (minDate) {
      const minDateObj = typeof minDate === 'string' ? new Date(minDate) : minDate;
      if (date < minDateObj) return false;
    }
    
    if (maxDate) {
      const maxDateObj = typeof maxDate === 'string' ? new Date(maxDate) : maxDate;
      if (date > maxDateObj) return false;
    }
    
    return true;
  };
  
  // Update display value when value prop changes
  useEffect(() => {
    if (value !== undefined && value !== null) {
      setDisplayValue(formatDate(value));
    } else {
      setDisplayValue('');
    }
  }, [value]);
  
  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle backspace and delete more intelligently
    if (e.key === 'Backspace' || e.key === 'Delete') {
      const input = e.target as HTMLInputElement;
      const cursorPosition = input.selectionStart || 0;
      const currentValue = displayValue;
      
      // If cursor is right after a slash, delete the slash and the digit before it
      if (e.key === 'Backspace' && cursorPosition > 0 && currentValue[cursorPosition - 1] === '/') {
        e.preventDefault();
        const newValue = currentValue.slice(0, cursorPosition - 2) + currentValue.slice(cursorPosition);
        setDisplayValue(newValue);
        
        // Set cursor position after the deletion
        setTimeout(() => {
          input.setSelectionRange(cursorPosition - 2, cursorPosition - 2);
        }, 0);
      }
    }
  };
  
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    
    const parsedDate = parseDate(e.target.value);
    
    if (parsedDate && isDateValid(parsedDate)) {
      const formatted = formatDate(parsedDate);
      setDisplayValue(formatted);
      
      if (onChange) {
        onChange(parsedDate, formatted);
      }
    } else if (e.target.value === '') {
      setDisplayValue('');
      if (onChange) {
        onChange(null, '');
      }
    } else {
      // Invalid date - keep the input but call onChange with null so parent can handle validation
      setDisplayValue(e.target.value);
      if (onChange) {
        // Pass the raw input value as the formatted string so parent can validate it
        onChange(null, e.target.value);
      }
    }
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    const currentValue = displayValue;
    
    // Allow only digits and forward slashes, limit length to 10 characters
    const filtered = inputValue.replace(/[^\d/]/g, '').slice(0, 10);
    
    // If user is deleting (input is shorter than current), allow it
    if (filtered.length < currentValue.replace(/[^\d/]/g, '').length) {
      setDisplayValue(filtered);
      return;
    }
    
    // Auto-format as user types (only when adding characters)
    let formatted = filtered;
    
    // Add first slash after 2 digits (dd/)
    if (filtered.length === 2 && !filtered.includes('/')) {
      formatted = filtered + '/';
    }
    // Add second slash after 5 characters (dd/mm/)
    else if (filtered.length === 5 && filtered.split('/').length === 2) {
      formatted = filtered + '/';
    }
    // Handle case where user types digits after existing slashes
    else if (filtered.length > 2 && filtered.length <= 10) {
      const digitsOnly = filtered.replace(/\//g, '');
      
      if (digitsOnly.length <= 2) {
        formatted = digitsOnly;
      } else if (digitsOnly.length <= 4) {
        formatted = digitsOnly.slice(0, 2) + '/' + digitsOnly.slice(2);
      } else {
        formatted = digitsOnly.slice(0, 2) + '/' + digitsOnly.slice(2, 4) + '/' + digitsOnly.slice(4, 8);
      }
    }
    
    setDisplayValue(formatted);
  };
  
  // Base classes - matching Group 1 design system
  const baseClasses = 'block border rounded-md shadow-sm transition-all duration-150 ease-in-out focus:outline-none focus:ring-4 focus:ring-offset-2';
  
  // Size classes - consistent with Group 1 heights (32px, 40px, 48px)
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm h-8 font-normal', // 32px height
    md: 'px-3 py-2 text-sm h-10 font-normal',  // 40px height  
    lg: 'px-4 py-3 text-base h-12 font-normal' // 48px height
  };
  
  // Variant classes - matching Group 1 purple theme
  const variantClasses = {
    default: 'border-gray-300 focus:border-primary-700 focus:ring-primary-700/10 bg-white text-gray-900 placeholder:text-gray-500',
    success: 'border-green-500 focus:border-green-600 focus:ring-green-500/10 bg-white text-gray-900 placeholder:text-gray-500',
    error: 'border-red-500 focus:border-red-600 focus:ring-red-500/10 bg-red-50 text-gray-900 placeholder:text-gray-500'
  };
  
  // Disabled classes
  const disabledClasses = disabled 
    ? 'bg-gray-50 text-gray-500 cursor-not-allowed border-gray-200' 
    : 'hover:border-gray-400';
  
  // Width classes
  const widthClasses = fullWidth ? 'w-full' : '';
  
  // Icon padding adjustments
  const hasLeftIcon = leftIcon || showCalendarIcon;
  const hasRightIcon = rightIcon;
  
  const iconPaddingClasses = hasLeftIcon && hasRightIcon 
    ? 'pl-10 pr-10' 
    : hasLeftIcon 
    ? 'pl-10' 
    : hasRightIcon 
    ? 'pr-10' 
    : '';
  
  const inputClasses = `
    ${baseClasses}
    ${sizeClasses[size]}
    ${variantClasses[currentVariant]}
    ${disabledClasses}
    ${widthClasses}
    ${iconPaddingClasses}
    ${className}
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
        {/* Left Icon */}
        {hasLeftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <div className="h-4 w-4 text-gray-400">
              {leftIcon || (showCalendarIcon && <CalendarIcon className="h-4 w-4" />)}
            </div>
          </div>
        )}
        
        {/* Input Field */}
        <input
          ref={ref}
          id={inputId}
          type="text"
          inputMode="numeric"
          disabled={disabled}
          value={displayValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={
            error ? `${inputId}-error` : 
            helperText ? `${inputId}-helper` : undefined
          }
          className={inputClasses}
          {...props}
        />
        
        {/* Right Icon */}
        {hasRightIcon && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <div className="h-4 w-4 text-gray-400">
              {rightIcon}
            </div>
          </div>
        )}
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

DateInput.displayName = 'DateInput';

export default DateInput; 