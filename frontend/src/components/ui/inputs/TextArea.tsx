import React, { TextareaHTMLAttributes, forwardRef, useState, useEffect } from 'react';

export interface TextAreaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'> {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'error';
  fullWidth?: boolean;
  showCharacterCount?: boolean;
  maxLength?: number;
  minRows?: number;
  maxRows?: number;
  resize?: 'none' | 'vertical' | 'horizontal' | 'both';
}

const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(({
  label,
  error,
  helperText,
  required = false,
  size = 'md',
  variant = 'default',
  fullWidth = true,
  className = '',
  disabled = false,
  id,
  value,
  onChange,
  showCharacterCount = false,
  maxLength,
  minRows = 3,
  maxRows,
  resize = 'vertical',
  ...props
}, ref) => {
  const [characterCount, setCharacterCount] = useState(0);
  
  // Generate unique ID if not provided
  const inputId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;
  
  // Determine variant based on error state
  const currentVariant = error ? 'error' : variant;
  
  // Update character count
  useEffect(() => {
    if (value !== undefined && value !== null) {
      setCharacterCount(value.toString().length);
    }
  }, [value]);
  
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCharacterCount(e.target.value.length);
    if (onChange) {
      onChange(e);
    }
  };
  
  // Base classes
  const baseClasses = 'block w-full border rounded-md shadow-sm transition-all duration-150 ease-in-out focus:outline-none focus:ring-4 focus:ring-offset-2';
  
  // Size classes
  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-3 py-2.5 text-sm',
    lg: 'px-4 py-3 text-base'
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
  
  // Resize classes
  const resizeClasses = {
    none: 'resize-none',
    vertical: 'resize-y',
    horizontal: 'resize-x',
    both: 'resize'
  };
  
  // Min height based on rows and size
  const getMinHeight = () => {
    const lineHeights = {
      sm: 20, // 1.25rem
      md: 20, // 1.25rem  
      lg: 24  // 1.5rem
    };
    const paddings = {
      sm: 16, // py-2 (8px top + 8px bottom)
      md: 20, // py-2.5 (10px top + 10px bottom)
      lg: 24  // py-3 (12px top + 12px bottom)
    };
    
    return (lineHeights[size] * minRows) + paddings[size];
  };
  
  const getMaxHeight = () => {
    if (!maxRows) return undefined;
    
    const lineHeights = {
      sm: 20,
      md: 20,
      lg: 24
    };
    const paddings = {
      sm: 16,
      md: 20,
      lg: 24
    };
    
    return (lineHeights[size] * maxRows) + paddings[size];
  };
  
  const textareaClasses = `
    ${baseClasses}
    ${sizeClasses[size]}
    ${variantClasses[currentVariant]}
    ${disabledClasses}
    ${widthClasses}
    ${resizeClasses[resize]}
    ${className}
  `.trim().replace(/\s+/g, ' ');
  
  const minHeight = getMinHeight();
  const maxHeight = getMaxHeight();

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
      
      {/* Textarea Field */}
      <textarea
        ref={ref}
        id={inputId}
        disabled={disabled}
        maxLength={maxLength}
        value={value}
        onChange={handleChange}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={
          error ? `${inputId}-error` : 
          helperText ? `${inputId}-helper` : undefined
        }
        style={{
          minHeight: `${minHeight}px`,
          maxHeight: maxHeight ? `${maxHeight}px` : undefined
        }}
        className={textareaClasses}
        {...props}
      />
      
      {/* Character Count */}
      {showCharacterCount && (
        <div className="mt-1 flex justify-end">
          <span className={`text-xs ${
            maxLength && characterCount > maxLength 
              ? 'text-red-600' 
              : characterCount > (maxLength || 0) * 0.9 
              ? 'text-yellow-600' 
              : 'text-gray-500'
          }`}>
            {characterCount}{maxLength && `/${maxLength}`}
          </span>
        </div>
      )}
      
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

TextArea.displayName = 'TextArea';

export default TextArea; 