import React, { InputHTMLAttributes, ReactNode, forwardRef, useState, useEffect, useCallback } from 'react';

export interface FilterSearchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'> {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'error';
  fullWidth?: boolean;
  // Filter-specific props
  onFilter?: (value: string) => void;
  debounceMs?: number;
  showClearButton?: boolean;
  filterIcon?: ReactNode;
  clearIcon?: ReactNode;
  loading?: boolean;
  resultCount?: number;
  showResultCount?: boolean;
  filterLabel?: string;
}

const FilterSearch = forwardRef<HTMLInputElement, FilterSearchProps>(({
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
  onFilter,
  debounceMs = 150, // Faster for filtering
  showClearButton = true,
  filterIcon,
  clearIcon,
  loading = false,
  resultCount,
  showResultCount = false,
  filterLabel = 'Filter',
  ...props
}, ref) => {
  const [filterValue, setFilterValue] = useState(value || '');
  
  // Generate unique ID if not provided
  const inputId = id || `filter-search-${Math.random().toString(36).substr(2, 9)}`;
  
  // Determine variant based on error state
  const currentVariant = error ? 'error' : variant;
  
  // Debounced filter function
  const debouncedFilter = useCallback(
    debounceMs > 0 
      ? (() => {
          let timeoutId: NodeJS.Timeout;
          return (filterTerm: string) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
              if (onFilter) {
                onFilter(filterTerm);
              }
            }, debounceMs);
          };
        })()
      : (filterTerm: string) => {
          if (onFilter) {
            onFilter(filterTerm);
          }
        },
    [onFilter, debounceMs]
  );
  
  // Update filter value when value prop changes
  useEffect(() => {
    if (value !== undefined && value !== filterValue) {
      setFilterValue(value.toString());
    }
  }, [value]);
  
  // Trigger filter when filterValue changes
  useEffect(() => {
    debouncedFilter(filterValue.toString());
  }, [filterValue, debouncedFilter]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setFilterValue(newValue);
    
    if (onChange) {
      onChange(e);
    }
  };
  
  const handleClear = () => {
    setFilterValue('');
    
    if (onChange) {
      const syntheticEvent = {
        target: { value: '' }
      } as React.ChangeEvent<HTMLInputElement>;
      onChange(syntheticEvent);
    }
    
    if (onFilter) {
      onFilter('');
    }
  };
  
  // Base classes - matching Group 1 design system
  const baseClasses = 'block border rounded-md shadow-sm transition-all duration-150 ease-in-out focus:outline-none focus:ring-4 focus:ring-offset-2';
  
  // Size classes - consistent with Group 1 heights (32px, 40px, 48px)
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm h-8', // 32px height
    md: 'px-3 py-2 text-sm h-10',  // 40px height  
    lg: 'px-4 py-3 text-base h-12' // 48px height
  };
  
  // Variant classes - matching Group 1 purple theme
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
  
  // Icon padding - filter icon on left, clear button on right when needed
  const leftPadding = 'pl-10';
  const rightPadding = (showClearButton && filterValue) ? 'pr-10' : 'pr-3';
  
  const inputClasses = `
    ${baseClasses}
    ${sizeClasses[size]}
    ${variantClasses[currentVariant]}
    ${disabledClasses}
    ${widthClasses}
    ${leftPadding}
    ${rightPadding}
    ${className}
  `.trim().replace(/\s+/g, ' ');
  
  // Default icons - 16px size matching Group 1
  const defaultFilterIcon = (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z" />
    </svg>
  );
  
  const defaultClearIcon = (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
  
  const loadingIcon = (
    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );

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
        {/* Filter Icon */}
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <div className="h-4 w-4 text-gray-400">
            {loading ? loadingIcon : (filterIcon || defaultFilterIcon)}
          </div>
        </div>
        
        {/* Input Field */}
        <input
          ref={ref}
          id={inputId}
          type="text"
          disabled={disabled}
          value={filterValue}
          onChange={handleChange}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={
            error ? `${inputId}-error` : 
            helperText ? `${inputId}-helper` : undefined
          }
          className={inputClasses}
          placeholder={`${filterLabel}...`}
          {...props}
        />
        
        {/* Clear Button */}
        {showClearButton && filterValue && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors duration-150"
            aria-label="Clear filter"
          >
            <div className="h-4 w-4">
              {clearIcon || defaultClearIcon}
            </div>
          </button>
        )}
      </div>
      
      {/* Result Count */}
      {showResultCount && resultCount !== undefined && (
        <p className="mt-1 text-xs text-gray-500">
          {resultCount === 0 ? 'No results' : `${resultCount} result${resultCount === 1 ? '' : 's'}`}
          {filterValue && ` for "${filterValue}"`}
        </p>
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

FilterSearch.displayName = 'FilterSearch';

export default FilterSearch; 