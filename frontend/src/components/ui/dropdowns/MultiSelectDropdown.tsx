import React, { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon, ChevronUpIcon, MagnifyingGlassIcon, XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';
import { DropdownOption } from './BaseDropdown';

export interface MultiSelectDropdownProps {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'error';
  fullWidth?: boolean;
  options: DropdownOption[];
  values?: (string | number)[];
  onChange?: (values: (string | number)[]) => void;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  searchable?: boolean;
  id?: string;
  className?: string;
  maxSelectedDisplay?: number;
}

/**
 * MultiSelectDropdown Component
 * 
 * A multi-select dropdown with search functionality and tag display.
 * Features:
 * - Options are automatically sorted alphabetically for better user experience
 * - Search text persists after selecting options for easy multi-selection
 * - Used in Report Generator for client group selection and other multi-select scenarios
 */
const MultiSelectDropdown = React.forwardRef<HTMLDivElement, MultiSelectDropdownProps>(({
  label,
  error,
  helperText,
  required = false,
  size = 'md',
  variant = 'default',
  fullWidth = true,
  options = [],
  values = [],
  onChange,
  placeholder = 'Select options...',
  disabled = false,
  loading = false,
  searchable = true,
  id,
  className = '',
  maxSelectedDisplay = 3,
  ...props
}, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const tagsContainerRef = useRef<HTMLDivElement>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);
  const dropdownMenuRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Generate unique ID if not provided
  const dropdownId = id || `multiselect-${Math.random().toString(36).substr(2, 9)}`;
  
  // Determine variant based on error state
  const currentVariant = error ? 'error' : variant;
  
  // Get selected options
  const selectedOptions = options.filter(option => values.includes(option.value));
  
  // Filter options based on search term and sort alphabetically
  const filteredOptions = searchable && searchTerm
    ? options
        .filter(option => 
          option.label.toLowerCase().includes(searchTerm.toLowerCase()) && !option.disabled
        )
        .sort((a, b) => a.label.localeCompare(b.label))
    : options
        .filter(option => !option.disabled)
        .sort((a, b) => a.label.localeCompare(b.label));
  
  // Improved click-outside detection - more granular
  useEffect(() => {
    const handleClickOutside = (event: Event) => {
      const target = event.target as HTMLElement;
      
      // Check if click is on specific interactive elements
      const isClickOnTag = tagsContainerRef.current?.contains(target) && 
                          (target.closest('[data-tag-item]') || target.closest('button'));
      const isClickOnInput = inputContainerRef.current?.contains(target);
      const isClickOnDropdown = dropdownMenuRef.current?.contains(target);
      const isClickOnLabel = target.closest(`[for="${dropdownId}"]`);
      
      // If click is not on any of these specific elements, close the dropdown
      if (!isClickOnTag && !isClickOnInput && !isClickOnDropdown && !isClickOnLabel) {
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
  }, [isOpen, dropdownId]);
  
  // Reset focused index when filtered options change
  useEffect(() => {
    // Auto-focus the first option when there are filtered results and user has typed something
    if (filteredOptions.length > 0 && searchTerm.length > 0) {
      setFocusedIndex(0);
    } else {
      setFocusedIndex(-1);
    }
  }, [searchTerm, filteredOptions.length]);
  
  // Scroll focused option into view
  useEffect(() => {
    if (focusedIndex >= 0 && listRef.current) {
      const focusedElement = listRef.current.children[focusedIndex] as HTMLElement;
      if (focusedElement) {
        focusedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [focusedIndex]);
  
  const handleInputClick = () => {
    if (!disabled && !isOpen) {
      setIsOpen(true);
      setSearchTerm('');
      setFocusedIndex(-1);
      // Focus search input when opening
      setTimeout(() => {
        if (searchable && searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 0);
    }
  };

  const handleArrowClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      if (isOpen) {
        setIsOpen(false);
        setSearchTerm('');
        setFocusedIndex(-1);
      } else {
        setIsOpen(true);
        setSearchTerm('');
        setFocusedIndex(-1);
        // Focus search input when opening
        setTimeout(() => {
          if (searchable && searchInputRef.current) {
            searchInputRef.current.focus();
          }
        }, 0);
      }
    }
  };
  
  const handleSelect = (optionValue: string | number) => {
    if (!onChange) return;

    let newValues: (string | number)[];
    if (values.includes(optionValue)) {
      // Removing existing selection (toggle off)
      newValues = values.filter(v => v !== optionValue);
    } else {
      // Adding new selection (multi-select behavior)
      newValues = [...values, optionValue];
    }
    onChange(newValues);
    
    // Keep search term after selection so user can continue typing for multiple selections
    // This allows users to type a common prefix and select multiple matching options
    
    // Keep dropdown open so user can continue typing for next selection
    // Focus back to input for immediate typing
    setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, 0);
  };
  
  const handleRemove = (optionValue: string | number) => {
    if (!onChange) return;
    const newValues = values.filter(v => v !== optionValue);
    onChange(newValues);
  };
  
  const handleClear = () => {
    if (!onChange) return;
    onChange([]);
  };
  
  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
        // Focus search input when opening
        setTimeout(() => {
          if (searchInputRef.current) {
            searchInputRef.current.focus();
          }
        }, 0);
      }
      // Auto-open dropdown when user starts typing
      if (e.key.length === 1 && /[a-zA-Z0-9\s]/.test(e.key)) {
        e.preventDefault();
        setIsOpen(true);
        setSearchTerm(e.key);
        setTimeout(() => {
          if (searchInputRef.current) {
            searchInputRef.current.focus();
          }
        }, 0);
      }
      return;
    }

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
          // setSearchTerm(''); // Clear search term after selection - REMOVED
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
        if (searchTerm) {
          e.preventDefault(); // Prevent default browser backspace behavior to avoid double deletion
          // Remove characters from search term if we're searching
          setSearchTerm(prev => prev.slice(0, -1));
        } else if (values.length > 0 && onChange) {
          // Remove the last selected item if there's no search term but there are selected values
          e.preventDefault();
          const newValues = [...values];
          newValues.pop(); // Remove last item
          onChange(newValues);
          // Keep dropdown open and focus on input for continued typing
          setTimeout(() => {
            if (searchInputRef.current) {
              searchInputRef.current.focus();
            }
          }, 0);
        }
        break;
      default:
        // Add characters to search term when typing
        if (e.key.length === 1 && /[a-zA-Z0-9\s]/.test(e.key)) {
          e.preventDefault();
          setSearchTerm(prev => prev + e.key);
        }
        break;
    }
  };
  
  // Base classes - matching Group 1 design system
  const baseClasses = 'block border rounded-md shadow-sm transition-all duration-150 ease-in-out focus:outline-none focus:ring-4 focus:ring-offset-2';
  
  // Size classes - consistent with Group 1 heights (min 32px, 40px, 48px)
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm min-h-8', // 32px min height
    md: 'px-3 py-2 text-sm min-h-10',  // 40px min height  
    lg: 'px-4 py-3 text-base min-h-12' // 48px min height
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
    : 'hover:border-gray-400 cursor-pointer';
  
  // Width classes
  const widthClasses = fullWidth ? 'w-full' : '';
  
  const containerClasses = `
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

  // Display logic for selected items
  const displayedOptions = selectedOptions.slice(0, maxSelectedDisplay);
  const remainingCount = selectedOptions.length - maxSelectedDisplay;

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

      {/* Selected Options Tags */}
      {selectedOptions.length > 0 && (
        <div ref={tagsContainerRef} className="inline-flex flex-wrap gap-1.5 mb-2">
          {selectedOptions.map((option) => (
            <div
              key={option.value}
              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800 border border-primary-300 shadow-sm"
              data-tag-item
            >
              <span>{option.label}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  handleRemove(option.value);
                }}
                className="ml-1.5 text-xs text-primary-600 hover:text-red-600 focus:outline-none focus:text-red-600 transition-colors duration-150 cursor-pointer"
                aria-label={`Remove ${option.label}`}
                title={`Remove ${option.label}`}
              >
                ×
              </button>
            </div>
          ))}
          {selectedOptions.length > 1 && (
            <div className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-300">
              {selectedOptions.length} selected
            </div>
          )}
        </div>
      )}
      
      {/* Input Container */}
      <div ref={inputContainerRef} className="relative">
        {/* Search Icon */}
        {searchable && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
          </div>
        )}
        
        {/* Input Field */}
        <input
          ref={searchInputRef}
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onClick={handleInputClick}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          aria-expanded={isOpen}
          aria-activedescendant={focusedIndex >= 0 ? `${dropdownId}-option-${focusedIndex}` : undefined}
          aria-describedby={
            error ? `${dropdownId}-error` : 
            helperText ? `${dropdownId}-helper` : undefined
          }
          className={`
            ${baseClasses}
            ${sizeClasses[size]}
            ${variantClasses[currentVariant]}
            ${disabledClasses}
            ${widthClasses}
            ${searchable ? 'pl-10' : ''}
            ${className}
            text-left
          `.trim().replace(/\s+/g, ' ')}
        />
        
        {/* Dropdown Icon */}
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
          <div
            onClick={handleArrowClick}
            className="h-4 w-4 text-gray-400 cursor-pointer"
          >
            {loading ? loadingIcon : (
              isOpen ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />
            )}
          </div>
        </div>
      </div>
      
      {/* Dropdown Menu */}
      {isOpen && (
        <div ref={dropdownMenuRef} className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {/* Options List */}
          <ul ref={listRef} role="listbox" className="py-1" aria-multiselectable="true">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => {
                const isSelected = values.includes(option.value);
                return (
                  <li
                    key={option.value}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <button
                      id={`${dropdownId}-option-${index}`}
                      type="button"
                      onClick={() => handleSelect(option.value)}
                      className={`
                        w-full text-left px-4 py-2 text-sm font-normal
                        transition-colors duration-150
                        flex items-center justify-between
                        ${isSelected 
                          ? 'bg-primary-50 text-primary-900 border-l-2 border-primary-500' 
                          : 'hover:bg-gray-50 text-gray-900'
                        }
                        ${focusedIndex === index 
                          ? 'bg-primary-100 text-primary-900 ring-2 ring-primary-500 ring-inset' 
                          : ''
                        }
                        focus:outline-none focus:bg-gray-50
                      `.trim().replace(/\s+/g, ' ')}
                    >
                      <span className="truncate">{option.label}</span>
                      {isSelected && (
                        <CheckIcon className="h-4 w-4 text-primary-600 flex-shrink-0" />
                      )}
                    </button>
                  </li>
                );
              })
            ) : (
              <li className="px-4 py-2 text-sm text-gray-500 text-center">
                {searchTerm ? 'No options found' : 'No options available'}
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
          {isOpen && (
            <span className="ml-2 text-gray-400">
              • Type to search • Enter to select • Backspace to remove
            </span>
          )}
        </p>
      )}
    </div>
  );
});

MultiSelectDropdown.displayName = 'MultiSelectDropdown';

export default MultiSelectDropdown; 