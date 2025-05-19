import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';

interface Option {
  value: string | number;
  label: string;
}

interface SearchableDropdownProps {
  id: string;
  options: Option[];
  value: string | number;
  onChange: (value: string | number) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
}

// Multi-select version
export interface MultiSelectSearchableDropdownProps {
  id: string;
  options: Option[];
  values: (string | number)[];
  onChange: (values: (string | number)[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
}

/**
 * SearchableDropdown Component
 * 
 * A dropdown component with search functionality that allows users to filter options by typing.
 * 
 * @param {SearchableDropdownProps} props - Component props
 * @returns {JSX.Element} - Rendered component
 */
const SearchableDropdown: React.FC<SearchableDropdownProps> = ({
  id,
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  className = '',
  disabled = false,
  required = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const optionsRef = useRef<HTMLUListElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Find the selected option label
  const selectedOption = options.find(option => option.value === value);
  const displayValue = selectedOption ? selectedOption.label : placeholder;
  
  // Filter options based on search term
  const filteredOptions = options.filter(option => 
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Reset focused index when filtered options change
  useEffect(() => {
    setFocusedIndex(-1);
  }, [searchTerm]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Scroll focused option into view
  useEffect(() => {
    if (focusedIndex >= 0 && optionsRef.current) {
      const focusedOption = optionsRef.current.children[focusedIndex] as HTMLElement;
      if (focusedOption) {
        focusedOption.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [focusedIndex]);
  
  // Handle option selection
  const handleSelect = (optionValue: string | number) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchTerm('');
  };
  
  // Handle keyboard navigation
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const { key } = e;
    
    // Prevent default behavior for arrow keys to avoid moving cursor in input
    if (['ArrowUp', 'ArrowDown', 'Enter', 'Escape'].includes(key)) {
      e.preventDefault();
    }
    
    if (key === 'Escape') {
      setIsOpen(false);
    } else if (key === 'Tab') {
      // Close dropdown when tabbing out
      setIsOpen(false);
    } else if (key === 'ArrowDown') {
      if (filteredOptions.length > 0) {
        setFocusedIndex(prev => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
      }
    } else if (key === 'ArrowUp') {
      if (filteredOptions.length > 0) {
        setFocusedIndex(prev => (prev > 0 ? prev - 1 : filteredOptions.length - 1));
      }
    } else if (key === 'Enter') {
      if (focusedIndex >= 0 && focusedIndex < filteredOptions.length) {
        handleSelect(filteredOptions[focusedIndex].value);
      }
    }
  };
  
  // Toggle dropdown
  const toggleDropdown = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      if (!isOpen) {
        setSearchTerm('');
        setFocusedIndex(-1);
      } else {
        // Focus the search input when opening
        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 0);
      }
    }
  };
  
  return (
    <div 
      ref={dropdownRef} 
      className={`relative ${className}`}
    >
      {/* Dropdown trigger button */}
      <button
        type="button"
        id={id}
        className={`flex justify-between items-center w-full px-3 py-2 text-left border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
          disabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white hover:bg-gray-50'
        }`}
        onClick={toggleDropdown}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleDropdown();
          }
        }}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="block truncate">{displayValue}</span>
        <span className="ml-2 pointer-events-none">
          <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </span>
      </button>
      
      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
          {/* Search input */}
          <div className="sticky top-0 z-10 bg-white px-2 py-2">
            <input
              ref={searchInputRef}
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
              onClick={(e) => e.stopPropagation()}
              autoFocus
            />
          </div>
          
          {/* Options list */}
          <ul ref={optionsRef} className="py-1" role="listbox">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => (
                <li
                  key={option.value}
                  className={`cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-indigo-100 ${
                    option.value === value ? 'bg-indigo-50 text-indigo-700' : 'text-gray-900'
                  } ${index === focusedIndex ? 'bg-indigo-100' : ''}`}
                  onClick={() => handleSelect(option.value)}
                  onMouseEnter={() => setFocusedIndex(index)}
                  role="option"
                  aria-selected={option.value === value}
                  tabIndex={index === focusedIndex ? 0 : -1}
                  data-focused={index === focusedIndex ? 'true' : 'false'}
                >
                  <span className="block truncate font-normal">
                    {option.label}
                  </span>
                  {option.value === value && (
                    <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-indigo-600">
                      <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </span>
                  )}
                </li>
              ))
            ) : (
              <li className="text-gray-500 py-2 px-3">No options found</li>
            )}
          </ul>
        </div>
      )}
      
      {/* Hidden select for form submission */}
      <select
        name={id}
        id={`${id}-hidden`}
        value={value}
        onChange={() => {}} // Controlled by the custom dropdown
        required={required}
        className="sr-only" // Hidden but still part of the form
        aria-hidden="true"
      >
        <option value="" disabled hidden>
          {placeholder}
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

// Multi-select version
export const MultiSelectSearchableDropdown: React.FC<MultiSelectSearchableDropdownProps> = ({
  id,
  options,
  values,
  onChange,
  placeholder = 'Select options',
  className = '',
  disabled = false,
  required = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const optionsRef = useRef<HTMLUListElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filter options based on search term
  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Reset focused index when filtered options change
  useEffect(() => {
    setFocusedIndex(-1);
  }, [searchTerm]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Scroll focused option into view
  useEffect(() => {
    if (focusedIndex >= 0 && optionsRef.current) {
      const focusedOption = optionsRef.current.children[focusedIndex] as HTMLElement;
      if (focusedOption) {
        focusedOption.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [focusedIndex]);

  // Handle option selection/deselection
  const handleSelect = (optionValue: string | number) => {
    if (values.includes(optionValue)) {
      onChange(values.filter(v => v !== optionValue));
    } else {
      onChange([...values, optionValue]);
    }
    setSearchTerm('');
  };

  // Remove tag
  const handleRemove = (optionValue: string | number) => {
    onChange(values.filter(v => v !== optionValue));
  };

  // Keyboard navigation
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const { key } = e;
    if (["ArrowUp", "ArrowDown", "Enter", "Escape"].includes(key)) {
      e.preventDefault();
    }
    if (key === "Escape") {
      setIsOpen(false);
    } else if (key === "Tab") {
      setIsOpen(false);
    } else if (key === "ArrowDown") {
      if (filteredOptions.length > 0) {
        setFocusedIndex(prev => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
      }
    } else if (key === "ArrowUp") {
      if (filteredOptions.length > 0) {
        setFocusedIndex(prev => (prev > 0 ? prev - 1 : filteredOptions.length - 1));
      }
    } else if (key === "Enter") {
      if (focusedIndex >= 0 && focusedIndex < filteredOptions.length) {
        handleSelect(filteredOptions[focusedIndex].value);
      }
    }
  };

  // Toggle dropdown
  const toggleDropdown = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      if (!isOpen) {
        setSearchTerm('');
        setFocusedIndex(-1);
      } else {
        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 0);
      }
    }
  };

  // Get selected options
  const selectedOptions = options.filter(option => values.includes(option.value));

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <div className="flex flex-wrap gap-2 mb-1">
        {selectedOptions.map(option => (
          <span key={option.value} className="flex items-center bg-primary-50 border border-primary-200 text-primary-700 rounded-md px-2.5 py-1 text-sm">
            <span className="truncate max-w-[180px]">{option.label}</span>
            <button
              type="button"
              onClick={() => handleRemove(option.value)}
              className="ml-1.5 text-primary-400 hover:text-primary-600 transition-colors"
              tabIndex={-1}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </span>
        ))}
      </div>
      
      <button
        type="button"
        id={id}
        className={`flex justify-between items-center w-full px-3 py-2.5 text-left border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all ${
          disabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'hover:border-primary-400'
        }`}
        onClick={toggleDropdown}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleDropdown();
          }
        }}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="block truncate text-gray-500">{selectedOptions.length === 0 ? placeholder : `${selectedOptions.length} selected`}</span>
        <span className="ml-2 pointer-events-none">
          <svg className={`h-5 w-5 text-gray-400 transition-transform ${isOpen ? 'transform rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </span>
      </button>
      
      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
          <div className="sticky top-0 z-10 bg-white px-2 py-2">
            <input
              ref={searchInputRef}
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              placeholder="Search..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
              onClick={e => e.stopPropagation()}
              autoFocus
            />
          </div>
          <ul ref={optionsRef} className="py-1" role="listbox">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => (
                <li
                  key={option.value}
                  className={`cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-primary-50 ${
                    values.includes(option.value) ? 'bg-primary-50 text-primary-700' : 'text-gray-900'
                  } ${index === focusedIndex ? 'bg-primary-100' : ''}`}
                  onClick={() => handleSelect(option.value)}
                  onMouseEnter={() => setFocusedIndex(index)}
                  role="option"
                  aria-selected={values.includes(option.value)}
                  tabIndex={index === focusedIndex ? 0 : -1}
                  data-focused={index === focusedIndex ? 'true' : 'false'}
                >
                  <span className="block truncate font-normal">
                    {option.label}
                  </span>
                  {values.includes(option.value) && (
                    <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-primary-600">
                      <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </span>
                  )}
                </li>
              ))
            ) : (
              <li className="text-gray-500 py-2 px-3">No options found</li>
            )}
          </ul>
        </div>
      )}
      {/* Hidden select for form submission */}
      <select
        name={id}
        id={`${id}-hidden`}
        multiple
        value={values.map(String)}
        onChange={() => {}}
        required={required}
        className="sr-only"
        aria-hidden="true"
      >
        <option value="" disabled hidden>
          {placeholder}
        </option>
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default SearchableDropdown;