import React, { InputHTMLAttributes, ReactNode, forwardRef } from 'react';

export interface BaseInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'error';
  fullWidth?: boolean;
}

const BaseInput = forwardRef<HTMLInputElement, BaseInputProps>(({
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
  ...props
}, ref) => {
  // Generate unique ID if not provided
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  
  // Determine variant based on error state
  const currentVariant = error ? 'error' : variant;
  
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
  const iconPaddingClasses = leftIcon && rightIcon 
    ? 'pl-10 pr-10' 
    : leftIcon 
    ? 'pl-10' 
    : rightIcon 
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
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <div className="h-4 w-4 text-gray-400">
              {leftIcon}
            </div>
          </div>
        )}
        
        {/* Input Field */}
        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={
            error ? `${inputId}-error` : 
            helperText ? `${inputId}-helper` : undefined
          }
          onKeyDown={(e) => {
            // Prevent form submission on Enter key to avoid premature submissions
            if (e.key === 'Enter') {
              e.preventDefault();
              // Optionally blur the field to simulate moving to next field
              e.currentTarget.blur();
            }
            // Blur on Escape key for better UX
            if (e.key === 'Escape') {
              e.currentTarget.blur();
            }
            // Call any existing onKeyDown handler
            if (props.onKeyDown) {
              props.onKeyDown(e);
            }
          }}
          className={inputClasses}
          {...props}
        />
        
        {/* Right Icon */}
        {rightIcon && (
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

BaseInput.displayName = 'BaseInput';

export default BaseInput; 