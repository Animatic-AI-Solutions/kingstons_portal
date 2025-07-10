import React, { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon, ChevronUpIcon, MagnifyingGlassIcon, XMarkIcon, PlusIcon } from '@heroicons/react/24/outline';
import { DropdownOption } from './BaseDropdown';

export interface CreatableMultiSelectProps {
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
  onCreateOption?: (inputValue: string) => Promise<DropdownOption> | DropdownOption;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  searchable?: boolean;
  id?: string;
  className?: string;
  maxSelectedDisplay?: number;
  createLabel?: string;
  allowCreate?: boolean;
}

const CreatableMultiSelect = React.forwardRef<HTMLDivElement, CreatableMultiSelectProps>(({
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
  onCreateOption,
  placeholder = 'Select or create options...',
  disabled = false,
  loading = false,
  searchable = true,
  id,
  className = '',
  maxSelectedDisplay = 3,
  createLabel = 'Create',
  allowCreate = true,
  ...props
}, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [isCreating, setIsCreating] = useState(false);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const tagsContainerRef = useRef<HTMLDivElement>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);
  const dropdownMenuRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Generate unique ID if not provided
  const dropdownId = id || `creatable-multiselect-${Math.random().toString(36).substr(2, 9)}`;
  
  // Determine variant based on error state
  const currentVariant = error ? 'error' : variant;
  
  // Get selected options
  const selectedOptions = options.filter(option => values.includes(option.value));
  
  // Filter options based on search term
  const filteredOptions = searchable && searchTerm
    ? options.filter(option => 
        option.label.toLowerCase().includes(searchTerm.toLowerCase()) && !option.disabled
      )
    : options.filter(option => !option.disabled);
  
  // Check if search term matches any existing option exactly
  const exactMatch = options.find(option => 
    option.label.toLowerCase() === searchTerm.toLowerCase()
  );
  
  // Show create option when there's a search term, no exact match, and creation is allowed
  const showCreateOption = allowCreate && searchTerm && !exactMatch && searchTerm.trim().length > 0;
  
  // Calculate total options for keyboard navigation
  const totalOptions = filteredOptions.length + (showCreateOption ? 1 : 0);
  
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
      if (!isOpen) {
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
      newValues = values.filter(v => v !== optionValue);
    } else {
      newValues = [...values, optionValue];
    }
    onChange(newValues);
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
  
  const handleCreate = async () => {
    if (!onCreateOption || !searchTerm.trim() || isCreating) return;
    
    setIsCreating(true);
    try {
      const newOption = await onCreateOption(searchTerm.trim());
      if (newOption && onChange) {
        // Add the new option to current selection
        const newValues = [...values, newOption.value];
        onChange(newValues);
      }
      setSearchTerm('');
      setFocusedIndex(-1);
    } catch (error) {
      console.error('Failed to create option:', error);
    } finally {
      setIsCreating(false);
    }
  };
  
  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => (prev < totalOptions - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIndex >= 0) {
          if (focusedIndex < filteredOptions.length) {
            // Select existing option
            handleSelect(filteredOptions[focusedIndex].value);
          } else if (showCreateOption) {
            // Create new option
            handleCreate();
          }
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
      
      {/* Dropdown Container */}
      <div
        ref={(element) => {
          // Forward the ref to the parent component
          if (typeof ref === 'function') {
            ref(element);
          } else if (ref) {
            ref.current = element;
          }
          // Also set our internal ref for click-outside detection
          if (inputContainerRef) {
            inputContainerRef.current = element;
          }
        }}
        id={dropdownId}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        tabIndex={disabled ? -1 : 0}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={
          error ? `${dropdownId}-error` : 
          helperText ? `${dropdownId}-helper` : undefined
        }
        className={containerClasses}
        {...props}
      >
        {/* Selected Items / Placeholder */}
        <div ref={tagsContainerRef} className="flex-1 flex items-center flex-wrap gap-1 min-w-0">
          {selectedOptions.length > 0 ? (
            <>
              {displayedOptions.map((option) => (
                <div
                  key={option.value}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-700 text-white"
                  data-tag-item
                >
                  <span className="truncate max-w-24">{option.label}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(option.value);
                    }}
                    className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-primary-600 focus:outline-none"
                    aria-label={`Remove ${option.label}`}
                  >
                    <XMarkIcon className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {remainingCount > 0 && (
                <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-700">
                  +{remainingCount} more
                </div>
              )}
            </>
          ) : (
            <span className="text-gray-500 truncate">{placeholder}</span>
          )}
        </div>
        
        {/* Clear Button & Dropdown Icon */}
        <div className="flex items-center gap-2 ml-2">
          {selectedOptions.length > 0 && !disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              className="inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-gray-200 focus:outline-none text-gray-400 hover:text-gray-600"
              aria-label="Clear all selections"
            >
              <XMarkIcon className="h-3 w-3" />
            </button>
          )}
          
          <div className="h-4 w-4 text-gray-400 flex-shrink-0">
            {loading || isCreating ? loadingIcon : (
              isOpen ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />
            )}
          </div>
        </div>
      </div>
      
      {/* Dropdown Menu */}
      {isOpen && (
        <div ref={dropdownMenuRef} className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {/* Search Input */}
          {searchable && (
            <div className="p-2 border-b border-gray-200">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search or type to create..."
                  className="block w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-700 focus:border-primary-700"
                />
              </div>
            </div>
          )}
          
          {/* Options List */}
          <ul ref={listRef} role="listbox" className="py-1" aria-multiselectable="true">
            {/* Existing Options */}
            {filteredOptions.length > 0 && filteredOptions.map((option, index) => {
              const isSelected = values.includes(option.value);
              return (
                <li
                  key={option.value}
                  role="option"
                  aria-selected={isSelected}
                >
                  <button
                    type="button"
                    onClick={() => handleSelect(option.value)}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 focus:bg-gray-50 focus:outline-none transition-colors duration-150 flex items-center gap-3 ${
                      focusedIndex === index ? 'bg-gray-50' : ''
                    }`}
                  >
                    {/* Checkbox */}
                    <div className={`w-4 h-4 border-2 rounded flex items-center justify-center flex-shrink-0 ${
                      isSelected 
                        ? 'bg-primary-700 border-primary-700' 
                        : 'border-gray-300'
                    }`}>
                      {isSelected && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    
                    <span className="truncate">{option.label}</span>
                  </button>
                </li>
              );
            })}
            
            {/* Create New Option */}
            {showCreateOption && onCreateOption && (
              <>
                {filteredOptions.length > 0 && (
                  <li className="border-t border-gray-200 my-1"></li>
                )}
                <li role="option">
                  <button
                    type="button"
                    onClick={handleCreate}
                    disabled={isCreating}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-primary-50 focus:bg-primary-50 focus:outline-none transition-colors duration-150 flex items-center gap-3 text-primary-700 ${
                      focusedIndex === filteredOptions.length ? 'bg-primary-50' : ''
                    } ${isCreating ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <PlusIcon className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">
                      {isCreating ? 'Creating...' : `${createLabel} "${searchTerm}"`}
                    </span>
                  </button>
                </li>
              </>
            )}
            
            {/* No Options Message */}
            {filteredOptions.length === 0 && !showCreateOption && (
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
        </p>
      )}
    </div>
  );
});

CreatableMultiSelect.displayName = 'CreatableMultiSelect';

export default CreatableMultiSelect; 