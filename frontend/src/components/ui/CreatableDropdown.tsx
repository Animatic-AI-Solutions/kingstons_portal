import React, { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon, ChevronUpIcon, MagnifyingGlassIcon, CheckIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { DropdownOption } from './BaseDropdown';

export interface CreatableDropdownProps {
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
  onCreateOption?: (inputValue: string) => Promise<DropdownOption> | DropdownOption;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  searchable?: boolean;
  id?: string;
  className?: string;
  createLabel?: string;
  allowCreate?: boolean;
}

const CreatableDropdown = React.forwardRef<HTMLButtonElement, CreatableDropdownProps>(({
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
  onCreateOption,
  placeholder = 'Select or create an option...',
  disabled = false,
  loading = false,
  searchable = true,
  id,
  className = '',
  createLabel = 'Create',
  allowCreate = true,
  ...props
}, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [isCreating, setIsCreating] = useState(false);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Generate unique ID if not provided
  const dropdownId = id || `creatable-dropdown-${Math.random().toString(36).substr(2, 9)}`;
  
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
  
  // Check if search term matches any existing option exactly
  const exactMatch = options.find(option => 
    option.label.toLowerCase() === searchTerm.toLowerCase()
  );
  
  // Show create option when there's a search term, no exact match, and creation is allowed
  const showCreateOption = allowCreate && searchTerm && !exactMatch && searchTerm.trim().length > 0;
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
        setFocusedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
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
    if (onChange) {
      onChange(optionValue);
    }
    setIsOpen(false);
    setSearchTerm('');
    setFocusedIndex(-1);
  };
  
  const handleCreate = async () => {
    if (!onCreateOption || !searchTerm.trim() || isCreating) return;
    
    setIsCreating(true);
    try {
      const newOption = await onCreateOption(searchTerm.trim());
      if (newOption && onChange) {
        onChange(newOption.value);
      }
      setIsOpen(false);
      setSearchTerm('');
      setFocusedIndex(-1);
    } catch (error) {
      console.error('Failed to create option:', error);
    } finally {
      setIsCreating(false);
    }
  };
  
  // Calculate total options for keyboard navigation
  const totalOptions = filteredOptions.length + (showCreateOption ? 1 : 0);
  
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
  const baseClasses = 'block border rounded-md shadow-sm transition-all duration-150 ease-in-out focus:outline-none focus:ring-3 focus:ring-offset-2';
  
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
    : 'hover:border-gray-400 cursor-pointer';
  
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

      {/* Selected Option Tag */}
      {selectedOption && (
        <div className="inline-flex flex-wrap gap-1.5 mb-2">
          <div className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-primary-50 text-primary-700 border border-primary-200">
            <span className="truncate">{selectedOption.label}</span>
            <button
              type="button"
              onClick={() => onChange && onChange('')}
              className="ml-1.5 inline-flex items-center justify-center w-3.5 h-3.5 rounded hover:bg-primary-100 focus:outline-none focus:ring-1 focus:ring-primary-300"
              aria-label={`Remove ${selectedOption.label}`}
            >
              <XMarkIcon className="h-2.5 w-2.5" />
            </button>
          </div>
        </div>
      )}
      
      {/* Input Container */}
      <div className="relative">
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
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
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
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          <div className="h-4 w-4 text-gray-400">
            {loading ? loadingIcon : (
              isOpen ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />
            )}
          </div>
        </div>
      </div>
      
      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
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
                    className={`
                      w-full text-left px-4 py-2 text-sm font-normal
                      transition-colors duration-150
                      flex items-center justify-between
                      ${option.value === value 
                        ? 'bg-primary-50 text-primary-900 border-l-2 border-primary-500' 
                        : 'hover:bg-gray-50 text-gray-900'
                      }
                      ${focusedIndex === index && option.value !== value 
                        ? 'bg-gray-50' 
                        : ''
                      }
                      focus:outline-none focus:bg-gray-50
                    `.trim().replace(/\s+/g, ' ')}
                  >
                    <span className="truncate">{option.label}</span>
                    {option.value === value && (
                      <CheckIcon className="h-4 w-4 text-primary-600 flex-shrink-0" />
                    )}
                  </button>
                </li>
              ))
            ) : (
              <li className="px-4 py-2 text-sm text-gray-500 text-center">
                {searchTerm ? 'No options found' : 'No options available'}
              </li>
            )}

            {/* Create Option */}
            {showCreateOption && (
              <li>
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={isCreating}
                  className={`
                    w-full text-left px-4 py-2 text-sm font-normal
                    transition-colors duration-150
                    flex items-center gap-2
                    ${focusedIndex === filteredOptions.length 
                      ? 'bg-gray-50' 
                      : 'hover:bg-gray-50'
                    }
                    focus:outline-none focus:bg-gray-50
                    text-primary-700
                  `.trim().replace(/\s+/g, ' ')}
                >
                  <PlusIcon className="h-4 w-4 flex-shrink-0" />
                  <span>{createLabel} "{searchTerm}"</span>
                  {isCreating && (
                    <div className="ml-auto">
                      <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                  )}
                </button>
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

CreatableDropdown.displayName = 'CreatableDropdown';

export default CreatableDropdown; 