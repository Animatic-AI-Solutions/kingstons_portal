import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';

interface Option {
  value: string | number;
  label: string;
}

interface FilterDropdownProps {
  id: string;
  options: Option[];
  value: (string | number)[];
  onChange: (value: (string | number)[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

const FilterDropdown: React.FC<FilterDropdownProps> = ({
  id,
  options,
  value,
  onChange,
  placeholder = 'All',
  className = '',
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 200 });
  const [calculatedWidth, setCalculatedWidth] = useState(200);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const optionsRef = useRef<HTMLUListElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);

  // Ensure value is always an array
  const selectedValues = Array.isArray(value) ? value : value !== undefined && value !== null ? [value] : [];
  const selectedOptions = options.filter(option => selectedValues.includes(option.value));
  const displayValue = selectedOptions.length > 0
    ? selectedOptions.map(opt => opt.label).join(', ')
    : placeholder;

  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate the width needed to fit the longest option
  const calculateOptimalWidth = () => {
    if (!measureRef.current || options.length === 0) {
      return 200; // fallback minimum width
    }

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (!context) {
      return 200;
    }

    // Use the same font style as the dropdown options
    context.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

    let maxWidth = 0;
    
    // Measure all option labels
    options.forEach(option => {
      const width = context.measureText(option.label).width;
      maxWidth = Math.max(maxWidth, width);
    });
    
    // Also measure the placeholder text
    const placeholderWidth = context.measureText(placeholder).width;
    maxWidth = Math.max(maxWidth, placeholderWidth);
    
    // Add padding for checkbox (24px), spacing (16px), and general padding (24px)
    // Plus some extra space for scrollbar and safety margin
    const finalWidth = Math.max(200, maxWidth + 96);
    
    return Math.min(finalWidth, 600); // Increase cap to 600px to allow longer text
  };

  // Calculate dropdown position
  const calculateDropdownPosition = () => {
    if (dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      const optimalWidth = calculatedWidth;
      
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: optimalWidth
      });
    }
  };

  // Calculate optimal width when options change
  useEffect(() => {
    const optimalWidth = calculateOptimalWidth();
    setCalculatedWidth(optimalWidth);
  }, [options, placeholder]);

  // Recalculate position when dropdown opens
  useEffect(() => {
    if (isOpen) {
      calculateDropdownPosition();
      
      // Add event listeners for scroll and resize
      const handlePositionUpdate = () => calculateDropdownPosition();
      window.addEventListener('scroll', handlePositionUpdate);
      window.addEventListener('resize', handlePositionUpdate);
      
      return () => {
        window.removeEventListener('scroll', handlePositionUpdate);
        window.removeEventListener('resize', handlePositionUpdate);
      };
    }
  }, [isOpen, calculatedWidth]);

  useEffect(() => {
    setFocusedIndex(-1);
  }, [searchTerm, isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: Event) => {
      const target = event.target as Node;
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setIsOpen(false);
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

  useEffect(() => {
    if (focusedIndex >= 0 && optionsRef.current) {
      const focusedOption = optionsRef.current.children[focusedIndex] as HTMLElement;
      if (focusedOption) {
        focusedOption.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [focusedIndex]);

  const handleSelect = (optionValue: string | number) => {
    let newSelected: (string | number)[];
    if (selectedValues.includes(optionValue)) {
      newSelected = selectedValues.filter(v => v !== optionValue);
    } else {
      newSelected = [...selectedValues, optionValue];
    }
    onChange(newSelected);
  };

  const handleClear = () => {
    onChange([]);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const { key } = e;
    if (["ArrowUp", "ArrowDown", "Enter", "Escape"].includes(key)) {
      e.preventDefault();
    }
    if (key === 'Escape') {
      setIsOpen(false);
    } else if (key === 'Tab') {
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

  const toggleDropdown = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      if (!isOpen) {
        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 0);
        setSearchTerm('');
        setFocusedIndex(-1);
      }
    }
  };

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* Hidden span for text measurement - not actually used since we're using canvas */}
      <span ref={measureRef} className="absolute invisible whitespace-nowrap text-sm" aria-hidden="true"></span>
      
      <button
        type="button"
        id={id}
                  className={`flex items-center px-3 py-1.5 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-3 focus:ring-indigo-500 focus:border-indigo-500 ${
          disabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white hover:bg-indigo-50'
        }`}
        style={{ width: `${calculatedWidth}px` }}
        onClick={toggleDropdown}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        {selectedOptions.length > 0 ? (
          <div className="flex flex-wrap gap-1 flex-1 min-w-0">
            {selectedOptions.map(opt => (
              <span key={opt.value} className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full text-xs">
                {opt.label}
              </span>
            ))}
          </div>
        ) : (
          <span className="truncate mr-2 flex-1">{placeholder}</span>
        )}
        {selectedOptions.length > 0 && (
          <span
            className="ml-1 text-gray-400 hover:text-red-500 cursor-pointer flex-shrink-0"
            onClick={e => { e.stopPropagation(); handleClear(); }}
            title="Clear all"
          >
            ×
          </span>
        )}
        <span className="ml-1 pointer-events-none flex-shrink-0">
          <svg className="h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </span>
      </button>
      {isOpen && (
        <div 
          className="z-50 bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm" 
          style={{ 
            position: 'fixed',
            zIndex: 9999,
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            width: dropdownPosition.width
          }}
        >
          <div className="sticky top-0 z-10 bg-white px-2 py-2 flex items-center gap-2">
            <input
              ref={searchInputRef}
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Search..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
              onClick={e => e.stopPropagation()}
              autoFocus
            />
            {selectedOptions.length > 0 && (
              <button
                className="text-xs text-red-500 px-2 py-1 rounded hover:bg-red-50 border border-red-200"
                onClick={e => { e.stopPropagation(); handleClear(); }}
                type="button"
              >
                Clear All
              </button>
            )}
          </div>
          <ul ref={optionsRef} className="py-1" role="listbox">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => (
                <li
                  key={option.value}
                  className={`cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-indigo-100 flex items-center gap-2 w-full ${
                    selectedValues.includes(option.value) ? 'bg-indigo-50 text-indigo-700' : 'text-gray-900'
                  } ${index === focusedIndex ? 'bg-indigo-100' : ''}`}
                  onClick={() => handleSelect(option.value)}
                  onMouseEnter={() => setFocusedIndex(index)}
                  role="option"
                  aria-selected={selectedValues.includes(option.value)}
                  tabIndex={index === focusedIndex ? 0 : -1}
                  data-focused={index === focusedIndex ? 'true' : 'false'}
                >
                  <input
                    type="checkbox"
                    checked={selectedValues.includes(option.value)}
                    readOnly
                    className="mr-2 flex-shrink-0"
                  />
                  <span className="block font-normal flex-1">{option.label}</span>
                </li>
              ))
            ) : (
              <li className="text-gray-500 px-3 py-2">No options found</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default FilterDropdown; 