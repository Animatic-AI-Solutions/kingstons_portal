import React, { InputHTMLAttributes, ReactNode, forwardRef, useState, useEffect, useCallback, useRef } from 'react';

export interface AutocompleteOption {
  value: string;
  label: string;
  description?: string;
  icon?: ReactNode;
  disabled?: boolean;
}

export interface AutocompleteSearchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'> {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'error';
  fullWidth?: boolean;
  // Autocomplete-specific props
  options: AutocompleteOption[];
  onSearch?: (value: string) => void;
  onSelect?: (option: AutocompleteOption) => void;
  debounceMs?: number;
  showClearButton?: boolean;
  searchIcon?: ReactNode;
  clearIcon?: ReactNode;
  loading?: boolean;
  minSearchLength?: number;
  maxResults?: number;
  noOptionsText?: string;
  emptySearchText?: string;
  allowCustomValue?: boolean;
  filterFunction?: (options: AutocompleteOption[], searchTerm: string) => AutocompleteOption[];
}

const AutocompleteSearch = forwardRef<HTMLInputElement, AutocompleteSearchProps>(({
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
  options = [],
  onSearch,
  onSelect,
  debounceMs = 200,
  showClearButton = true,
  searchIcon,
  clearIcon,
  loading = false,
  minSearchLength = 1,
  maxResults = 10,
  noOptionsText = 'No options found',
  emptySearchText = 'Start typing to search...',
  allowCustomValue = false,
  filterFunction,
  ...props
}, ref) => {
  const [searchValue, setSearchValue] = useState(value || '');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [filteredOptions, setFilteredOptions] = useState<AutocompleteOption[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  
  // Generate unique ID if not provided
  const inputId = id || `autocomplete-search-${Math.random().toString(36).substr(2, 9)}`;
  
  // Determine variant based on error state
  const currentVariant = error ? 'error' : variant;
  
  // Default filter function
  const defaultFilterFunction = useCallback((opts: AutocompleteOption[], searchTerm: string) => {
    if (!searchTerm || searchTerm.length < minSearchLength) return [];
    
    const term = searchTerm.toLowerCase();
    return opts
      .filter(option => 
        !option.disabled && 
        (option.label.toLowerCase().includes(term) || 
         option.value.toLowerCase().includes(term) ||
         (option.description && option.description.toLowerCase().includes(term)))
      )
      .slice(0, maxResults);
  }, [minSearchLength, maxResults]);
  
  // Filter options based on search value
  useEffect(() => {
    const filterFunc = filterFunction || defaultFilterFunction;
    let filtered;
    
    // If search is empty, show first 5 options
    if (!searchValue || searchValue.toString().trim() === '') {
      filtered = options.filter(option => !option.disabled).slice(0, 5);
    } else {
      filtered = filterFunc(options, searchValue.toString());
    }
    
    setFilteredOptions(filtered);
    setSelectedIndex(-1);
  }, [searchValue, options, filterFunction, defaultFilterFunction, minSearchLength]);
  
  // Debounced search function
  const debouncedSearch = useCallback(
    debounceMs > 0 
      ? (() => {
          let timeoutId: NodeJS.Timeout;
          return (searchTerm: string) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
              if (onSearch) {
                onSearch(searchTerm);
              }
            }, debounceMs);
          };
        })()
      : (searchTerm: string) => {
          if (onSearch) {
            onSearch(searchTerm);
          }
        },
    [onSearch, debounceMs]
  );
  
  // Update search value when value prop changes
  useEffect(() => {
    if (value !== undefined && value !== searchValue) {
      setSearchValue(value.toString());
    }
  }, [value]);
  
  // Trigger search when searchValue changes
  useEffect(() => {
    debouncedSearch(searchValue.toString());
  }, [searchValue, debouncedSearch]);
  
  // Close dropdown when clicking outside - improved reliability
  useEffect(() => {
    const handleClickOutside = (event: Event) => {
      const target = event.target as Node;
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setIsOpen(false);
        setSelectedIndex(-1);
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
  
  // Scroll selected option into view
  useEffect(() => {
    if (selectedIndex >= 0 && listRef.current) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchValue(newValue);
    
    if (onChange) {
      onChange(e);
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    // Select all text when input is focused/clicked
    e.target.select();
    
    // Always show dropdown when focused (will show 5 options if empty, or filtered results if has text)
    setIsOpen(true);
  };
  
  const handleClear = () => {
    setSearchValue('');
    setIsOpen(false);
    setSelectedIndex(-1);
    
    if (onChange) {
      const syntheticEvent = {
        target: { value: '' }
      } as React.ChangeEvent<HTMLInputElement>;
      onChange(syntheticEvent);
    }
    
    if (onSearch) {
      onSearch('');
    }
  };
  
  const handleOptionSelect = (option: AutocompleteOption) => {
    setSearchValue(option.label);
    setIsOpen(false);
    setSelectedIndex(-1);
    
    if (onSelect) {
      onSelect(option);
    }
    
    if (onChange) {
      const syntheticEvent = {
        target: { value: option.value }
      } as React.ChangeEvent<HTMLInputElement>;
      onChange(syntheticEvent);
    }
  };
  
  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' && filteredOptions.length > 0) {
        e.preventDefault();
        setIsOpen(true);
        setSelectedIndex(0);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev < filteredOptions.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && filteredOptions[selectedIndex]) {
          handleOptionSelect(filteredOptions[selectedIndex]);
        } else if (allowCustomValue && searchValue.trim()) {
          // Allow custom value selection
          const customOption: AutocompleteOption = {
            value: searchValue,
            label: searchValue
          };
          handleOptionSelect(customOption);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
      case 'Tab':
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
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
  
  // Icon padding - search icon on left, clear button on right when needed
  const leftPadding = 'pl-10';
  const rightPadding = (showClearButton && searchValue) ? 'pr-10' : 'pr-3';
  
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
  const defaultSearchIcon = (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
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
    <div ref={dropdownRef} className={`${fullWidth ? 'w-full' : ''} relative`}>
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
        {/* Search Icon */}
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <div className="h-4 w-4 text-gray-400">
            {loading ? loadingIcon : (searchIcon || defaultSearchIcon)}
          </div>
        </div>
        
        {/* Input Field */}
        <input
          ref={ref}
          id={inputId}
          type="text"
          disabled={disabled}
          value={searchValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          aria-invalid={error ? 'true' : 'false'}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          aria-activedescendant={selectedIndex >= 0 ? `${inputId}-option-${selectedIndex}` : undefined}
          aria-describedby={
            error ? `${inputId}-error` : 
            helperText ? `${inputId}-helper` : undefined
          }
          className={inputClasses}
          placeholder="Search..."
          role="searchbox"
          {...props}
        />
        
        {/* Clear Button */}
        {showClearButton && searchValue && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors duration-150"
            aria-label="Clear search"
          >
            <div className="h-4 w-4">
              {clearIcon || defaultClearIcon}
            </div>
          </button>
        )}
      </div>
      
      {/* Dropdown Options */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          {filteredOptions.length > 0 ? (
            <ul ref={listRef} role="listbox" className="py-1">
              {filteredOptions.map((option, index) => (
                <li
                  key={`${option.value}-${index}`}
                  role="option"
                  id={`${inputId}-option-${index}`}
                  aria-selected={selectedIndex === index}
                >
                  <button
                    type="button"
                    onClick={() => handleOptionSelect(option)}
                    disabled={option.disabled}
                    className={`w-full text-left px-4 py-2 text-sm font-normal hover:bg-primary-100 hover:text-primary-900 focus:bg-primary-100 focus:text-primary-900 focus:outline-none transition-colors duration-200 flex items-center justify-between ${
                      selectedIndex === index ? 'bg-primary-100 text-primary-900' : ''
                    } ${option.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <span className="truncate">{option.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : searchValue.length >= minSearchLength ? (
            <div className="px-4 py-2 text-sm font-normal text-gray-500 text-center">
              {noOptionsText}
            </div>
          ) : (
            <div className="px-4 py-2 text-sm font-normal text-gray-500 text-center">
              {emptySearchText}
            </div>
          )}
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

AutocompleteSearch.displayName = 'AutocompleteSearch';

export default AutocompleteSearch; 