import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDownIcon, ChevronUpIcon, MagnifyingGlassIcon, CheckIcon } from '@heroicons/react/24/outline';

export interface DropdownOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface BaseDropdownProps {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'error';
  fullWidth?: boolean;
  options: DropdownOption[];
  value?: string | number;
  onChange?: (value: string | number) => void;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  searchable?: boolean;
  id?: string;
  className?: string;
}

const BaseDropdown = React.forwardRef<HTMLButtonElement, BaseDropdownProps>(({
  label,
  error,
  helperText,
  required = false,
  size = 'md',
  variant = 'default',
  fullWidth = true,
  options = [],
  value,
  onChange,
  placeholder = 'Select an option...',
  disabled = false,
  loading = false,
  searchable = true,
  id,
  className = '',
  ...props
}, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Generate unique ID if not provided
  const dropdownId = id || `dropdown-${Math.random().toString(36).substr(2, 9)}`;
  
  // Determine variant based on error state
  const currentVariant = error ? 'error' : variant;
  
  // Find selected option
  const selectedOption = options.find(option => option.value === value);
  const displayValue = selectedOption ? selectedOption.label : placeholder;
  
  // Filter options based on search term
  const filteredOptions = searchable && searchTerm
    ? options.filter(option => 
        option.label.toLowerCase().includes(searchTerm.toLowerCase()) && !option.disabled
      )
    : options.filter(option => !option.disabled);
  
  // Close dropdown when clicking outside - improved reliability
  useEffect(() => {
    const handleClickOutside = (event: Event) => {
      const target = event.target as Node;
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setIsOpen(false);
        setSearchTerm('');
        setFocusedIndex(-1);
      }
    };

    if (isOpen) {
      // Use capture phase to ensure this fires before other handlers
      document.addEventListener('click', handleClickOutside, true);
      document.addEventListener('mousedown', handleClickOutside, true);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside, true);
      document.removeEventListener('mousedown', handleClickOutside, true);
    };
  }, [isOpen]);
  
  // Reset focused index when filtered options change
  useEffect(() => {
    setFocusedIndex(-1);
  }, [searchTerm]);
  
  // Scroll focused option into view
  useEffect(() => {
    if (focusedIndex >= 0 && listRef.current) {
      const focusedElement = listRef.current.children[focusedIndex] as HTMLElement;
      if (focusedElement) {
        focusedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [focusedIndex]);
  
  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      setFocusedIndex(-1);
      if (!isOpen) {
        setSearchTerm('');
      }
    }
  };
  
  const handleSelect = (optionValue: string | number) => {
    if (onChange) {
      onChange(optionValue);
    }
    setIsOpen(false);
    setSearchTerm('');
    setFocusedIndex(-1);
  };
  
  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle typing for search when closed
    if (!isOpen && searchable) {
      // Open dropdown and start search on alphanumeric keys
      if (e.key.length === 1 && /[a-zA-Z0-9\s]/.test(e.key)) {
        e.preventDefault();
        setIsOpen(true);
        setSearchTerm(e.key);
        return;
      }
      // Open dropdown on navigation keys
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    // Handle keys when dropdown is open
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => (prev < filteredOptions.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIndex >= 0 && filteredOptions[focusedIndex]) {
          handleSelect(filteredOptions[focusedIndex].value);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSearchTerm('');
        setFocusedIndex(-1);
        break;
      case 'Tab':
        setIsOpen(false);
        setSearchTerm('');
        setFocusedIndex(-1);
        break;
      case 'Backspace':
        if (searchable && searchTerm) {
          e.preventDefault();
          setSearchTerm(prev => prev.slice(0, -1));
        }
        break;
      default:
        // Add characters to search term
        if (searchable && e.key.length === 1 && /[a-zA-Z0-9\s]/.test(e.key)) {
          e.preventDefault();
          setSearchTerm(prev => prev + e.key);
        }
        break;
    }
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
    default: 'border-gray-300 focus:border-primary-700 focus:ring-primary-700/10 bg-white',
    success: 'border-green-500 focus:border-green-600 focus:ring-green-500/10 bg-white',
    error: 'border-red-500 focus:border-red-600 focus:ring-red-500/10 bg-red-50'
  };
  
  // Disabled classes
  const disabledClasses = disabled 
    ? 'bg-gray-50 text-gray-500 cursor-not-allowed border-gray-200' 
    : 'cursor-pointer';
  
  // Width classes
  const widthClasses = fullWidth ? 'w-full' : '';
  
  const buttonClasses = `
    ${baseClasses}
    ${sizeClasses[size]}
    ${variantClasses[currentVariant]}
    ${disabledClasses}
    ${widthClasses}
    ${className}
    flex items-center justify-between
  `.trim().replace(/\s+/g, ' ');
  
  // Loading icon
  const loadingIcon = (
    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );

  return (
    <div ref={dropdownRef} className={`${fullWidth ? 'w-full' : ''} relative`}>
      {/* Label */}
      {label && (
        <label 
          htmlFor={dropdownId}
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      {/* Dropdown Button */}
      <button
        ref={ref}
        id={dropdownId}
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={
          error ? `${dropdownId}-error` : 
          helperText ? `${dropdownId}-helper` : undefined
        }
        className={buttonClasses}
        {...props}
      >
        <span className={`block truncate font-normal ${!selectedOption ? 'text-gray-500' : 'text-gray-900'}`}>
          {displayValue}
        </span>
        
        <div className="h-4 w-4 text-gray-400">
          {loading ? loadingIcon : (
            isOpen ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />
          )}
        </div>
      </button>
      
      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-[60] w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {/* Search Input - Only show if searchable and has search term */}
          {searchable && searchTerm && (
            <div className="px-3 py-2 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center text-xs text-gray-600">
                <MagnifyingGlassIcon className="h-3 w-3 mr-2" />
                <span>Searching for: "{searchTerm}"</span>
                                 <button 
                   onClick={() => setSearchTerm('')}
                   className="ml-auto text-gray-400 hover:text-primary-600 hover:bg-primary-100 rounded-full w-4 h-4 flex items-center justify-center text-xs transition-colors duration-200"
                 >
                   ✕
                 </button>
              </div>
            </div>
          )}
          
          {/* Options List */}
          <ul ref={listRef} role="listbox" className="py-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => (
                <li
                  key={option.value}
                  role="option"
                  aria-selected={option.value === value}
                >
                  <button
                    type="button"
                    onClick={() => handleSelect(option.value)}
                    className={`w-full text-left px-4 py-2 text-sm font-normal hover:bg-primary-100 hover:text-primary-900 focus:bg-primary-100 focus:text-primary-900 focus:outline-none transition-colors duration-200 flex items-center justify-between ${
                      focusedIndex === index ? 'bg-primary-100 text-primary-900' : ''
                    } ${
                      option.value === value ? 'bg-primary-50 text-primary-800' : ''
                    }`}
                  >
                    <span className="truncate">{option.label}</span>
                    {option.value === value && (
                      <CheckIcon className="h-4 w-4 text-primary-700 flex-shrink-0" />
                    )}
                  </button>
                </li>
              ))
            ) : (
              <li className="px-4 py-2 text-sm font-normal text-gray-500 text-center">
                {searchTerm ? `No options found for "${searchTerm}"` : 'No options available'}
              </li>
            )}
          </ul>
        </div>
      )}
      
      {/* Error Message */}
      {error && (
        <p 
          id={`${dropdownId}-error`}
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
          id={`${dropdownId}-helper`}
          className="mt-1 text-xs text-gray-500"
        >
          {helperText}
        </p>
      )}
    </div>
  );
});

BaseDropdown.displayName = 'BaseDropdown';

export default BaseDropdown; 