import React, { useState, useRef, useEffect, forwardRef } from 'react';

export interface FilterOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface TableFilterProps {
  options: FilterOption[];
  values?: (string | number)[];
  onChange?: (values: (string | number)[]) => void;
  disabled?: boolean;
  loading?: boolean;
  placeholder?: string;
  className?: string;
  id?: string;
  title?: string;
}

const TableFilter = forwardRef<HTMLButtonElement, TableFilterProps>(({
  options,
  values = [],
  onChange,
  disabled = false,
  loading = false,
  placeholder = "Filter...",
  className = '',
  id,
  title = "Filter column"
}, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  const filterId = id || `table-filter-${Math.random().toString(36).substr(2, 9)}`;
  const selectedOptions = options.filter(option => values.includes(option.value));
  
  const filteredOptions = searchTerm
    ? options.filter(option => 
        option.label.toLowerCase().includes(searchTerm.toLowerCase()) && !option.disabled
      )
    : options.filter(option => !option.disabled);
  
  const updateDropdownPosition = () => {
    if (dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      const dropdownWidth = 256; // w-64
      
      // Calculate dynamic height for position calculation
      const optionCount = filteredOptions.length;
      const optionHeight = 40;
      const headerHeight = 80;
      const footerHeight = selectedOptions.length > 0 ? 40 : 0;
      const padding = 8;
      const idealListHeight = Math.min(
        optionCount * optionHeight,
        Math.max(160, Math.min(400, window.innerHeight * 0.4))
      );
      const dropdownHeight = Math.min(
        headerHeight + idealListHeight + footerHeight + padding,
        window.innerHeight * 0.6
      );
      
      let top = rect.bottom + 4;
      let left = rect.right - dropdownWidth;
      
      // Adjust if dropdown would go off right edge
      if (left < 8) {
        left = rect.left;
      }
      
      // Adjust if dropdown would go off bottom edge
      if (top + dropdownHeight > window.innerHeight - 8) {
        top = rect.top - dropdownHeight - 4;
      }
      
      // Ensure dropdown doesn't go off top edge
      if (top < 8) {
        top = 8;
      }
      
      setDropdownPosition({ top, left });
    }
  };
  
  useEffect(() => {
    const handleClickOutside = (event: Event) => {
      const target = event.target as Node;
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setIsOpen(false);
        setSearchTerm('');
        setFocusedIndex(-1);
      }
    };

    const handlePositionUpdate = () => {
      if (isOpen) {
        updateDropdownPosition();
      }
    };

    if (isOpen) {
      updateDropdownPosition();
      document.addEventListener('click', handleClickOutside, true);
      document.addEventListener('mousedown', handleClickOutside, true);
      window.addEventListener('scroll', handlePositionUpdate, true);
      window.addEventListener('resize', handlePositionUpdate);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside, true);
      document.removeEventListener('mousedown', handleClickOutside, true);
      window.removeEventListener('scroll', handlePositionUpdate, true);
      window.removeEventListener('resize', handlePositionUpdate);
    };
  }, [isOpen]);
  
  useEffect(() => {
    setFocusedIndex(-1);
  }, [searchTerm]);

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      if (!isOpen) {
        setSearchTerm('');
        setFocusedIndex(-1);
        setTimeout(() => {
          if (searchInputRef.current) {
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
  
  const handleClear = () => {
    if (!onChange) return;
    onChange([]);
    setIsOpen(false);
  };
  
  const isActive = selectedOptions.length > 0;

  // Calculate dynamic height based on number of options
  const calculateDropdownHeight = () => {
    const optionCount = filteredOptions.length;
    const optionHeight = 40; // Each option is roughly 40px tall
    const headerHeight = 80; // Header section with search
    const footerHeight = selectedOptions.length > 0 ? 40 : 0; // Footer if items selected
    const padding = 8; // Some padding
    
    // Calculate ideal height for options list
    const idealListHeight = Math.min(
      optionCount * optionHeight, // Height needed for all options
      Math.max(160, Math.min(400, window.innerHeight * 0.4)) // Min 160px, max 400px or 40% of screen
    );
    
    const totalHeight = headerHeight + idealListHeight + footerHeight + padding;
    
    return {
      containerMaxHeight: Math.min(totalHeight, window.innerHeight * 0.6), // Max 60% of screen height
      listMaxHeight: idealListHeight
    };
  };

  const dropdownHeights = calculateDropdownHeight();

  return (
    <div ref={dropdownRef} className={`relative inline-block ${className}`}>
      <button
        ref={ref}
        id={filterId}
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        title={title || "Filter"}
        className={`
          inline-flex items-center justify-center w-9 h-9 rounded-md
          transition-all duration-200 ease-in-out
          focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary-500/20
          ${disabled 
            ? 'text-gray-300 cursor-not-allowed' 
            : isActive
            ? 'text-primary-700 bg-primary-50 border border-primary-200 shadow-sm'
            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50 hover:border hover:border-gray-200'
          }
        `.trim().replace(/\s+/g, ' ')}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <div className="flex items-center justify-center text-lg font-medium">
          ≡
        </div>
        {isActive && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-primary-600 text-white text-xs font-medium rounded-full flex items-center justify-center leading-none">
            {selectedOptions.length}
          </span>
        )}
      </button>
      
      {isOpen && (
        <div className="fixed z-[9999] w-64 bg-white border border-gray-300 rounded-md shadow-xl overflow-hidden"
             style={{
               top: dropdownPosition.top,
               left: dropdownPosition.left,
               maxHeight: `${dropdownHeights.containerMaxHeight}px`
             }}>
          <div className="p-2 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-700">Filter Options</span>
              {selectedOptions.length > 0 && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-xs text-red-600 hover:text-red-800 font-medium"
                >
                  Clear All
                </button>
              )}
            </div>
            
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                <span className="text-gray-400 text-sm font-medium">⌕</span>
              </div>
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={placeholder}
                className="block w-full pl-7 pr-2 py-1.5 text-xs border border-gray-300 rounded-md shadow-sm bg-white
                         transition-all duration-150 ease-in-out
                         focus:outline-none focus:ring-4 focus:ring-offset-2 focus:ring-primary-700/10 focus:border-primary-700
                         hover:border-gray-400"
              />
            </div>
          </div>
          
          <div className="overflow-y-auto" style={{ maxHeight: `${dropdownHeights.listMaxHeight}px` }}>
            <ul ref={listRef} role="listbox" className="py-1">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option, index) => {
                  const isSelected = values.includes(option.value);
                  return (
                    <li key={option.value} role="option" aria-selected={isSelected}>
                      <button
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
                          focus:outline-none focus:bg-gray-50
                        `.trim().replace(/\s+/g, ' ')}
                      >
                        <span className="truncate">{option.label}</span>
                        {isSelected && (
                          <span className="text-primary-600 text-sm font-medium">✓</span>
                        )}
                      </button>
                    </li>
                  );
                })
              ) : (
                <li className="px-3 py-2 text-xs text-gray-500 text-center">
                  {searchTerm ? `No options found for "${searchTerm}"` : 'No options available'}
                </li>
              )}
            </ul>
          </div>
          
          {selectedOptions.length > 0 && (
            <div className="px-3 py-2 border-t border-gray-100 bg-gray-50">
              <span className="text-xs text-gray-600">
                {selectedOptions.length} item{selectedOptions.length !== 1 ? 's' : ''} selected
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

TableFilter.displayName = 'TableFilter';

export default TableFilter; 