import React, { useState, useRef, useEffect, forwardRef } from 'react';
import { 
  ArrowsUpDownIcon, 
  ArrowUpIcon, 
  ArrowDownIcon,
  Bars3Icon,
  CalendarIcon,
  HashtagIcon
} from '@heroicons/react/24/outline';

export type SortDirection = 'asc' | 'desc' | null;
export type SortType = 'alphabetical' | 'numerical' | 'date' | 'custom';

export interface SortOption {
  type: SortType;
  label: string;
  direction: SortDirection;
  icon?: React.ReactNode;
}

export interface TableSortProps {
  currentSort?: { type: SortType; direction: SortDirection };
  onSortChange?: (type: SortType, direction: SortDirection) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
  title?: string;
  sortTypes?: SortType[]; // Which sort types to show
}

const TableSort = forwardRef<HTMLButtonElement, TableSortProps>(({
  currentSort,
  onSortChange,
  disabled = false,
  className = '',
  id,
  title = "Sort column",
  sortTypes = ['alphabetical', 'numerical']
}, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const sortId = id || `table-sort-${Math.random().toString(36).substr(2, 9)}`;
  
  useEffect(() => {
    const handleClickOutside = (event: Event) => {
      const target = event.target as Node;
      if (dropdownRef.current && !dropdownRef.current.contains(target)) {
        setIsOpen(false);
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

  const updateDropdownPosition = () => {
    if (dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      const dropdownWidth = 224; // w-56
      const dropdownHeight = 300; // estimated height
      
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

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };
  
  const handleSortSelect = (type: SortType, direction: SortDirection) => {
    if (onSortChange) {
      onSortChange(type, direction);
    }
    setIsOpen(false);
  };
  
  const handleQuickSort = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!disabled && onSortChange) {
      // Quick toggle: if same type, toggle direction; if different type or no sort, start with asc
      if (currentSort?.type === sortTypes[0]) {
        const newDirection = currentSort.direction === 'asc' ? 'desc' : 'asc';
        onSortChange(sortTypes[0], newDirection);
      } else {
        onSortChange(sortTypes[0], 'asc');
      }
    }
  };
  
  // Available sort options
  const sortOptions: Record<SortType, { label: string; icon: React.ReactNode; directions: { label: string; value: SortDirection }[] }> = {
    alphabetical: {
      label: 'Alphabetical',
      icon: <span className="text-base font-medium text-gray-600">Aa</span>,
      directions: [
        { label: 'A to Z', value: 'asc' },
        { label: 'Z to A', value: 'desc' }
      ]
    },
    numerical: {
      label: 'Numerical',
      icon: <span className="text-base font-medium text-gray-600">123</span>,
      directions: [
        { label: 'Low to High', value: 'asc' },
        { label: 'High to Low', value: 'desc' }
      ]
    },
    date: {
      label: 'Date',
      icon: <span className="text-base font-medium text-gray-600">📆</span>,
      directions: [
        { label: 'Oldest First', value: 'asc' },
        { label: 'Newest First', value: 'desc' }
      ]
    },
    custom: {
      label: 'Custom',
      icon: <span className="text-base font-medium text-gray-600">⚪</span>,
      directions: [
        { label: 'Ascending', value: 'asc' },
        { label: 'Descending', value: 'desc' }
      ]
    }
  };
  
  // Filter options based on allowed types
  const availableOptions = sortTypes.map(type => ({
    type,
    ...sortOptions[type]
  }));
  
  // Determine current state
  const isActive = currentSort?.direction !== null && currentSort?.direction !== undefined;
  const currentIcon = () => {
    if (!isActive) return (
      <div className="flex items-center justify-center text-lg font-medium">
        ⇅
      </div>
    );
    return currentSort?.direction === 'asc' 
      ? <div className="flex items-center justify-center text-lg font-medium">⤴</div>
      : <div className="flex items-center justify-center text-lg font-medium">⤵</div>;
  };

  return (
    <div ref={dropdownRef} className={`relative inline-block ${className}`}>
      {/* Sort Button */}
      <button
        ref={ref}
        id={sortId}
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        onDoubleClick={handleQuickSort}
        title={title || "Sort"}
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
        aria-haspopup="menu"
        aria-label={`Sort column ${isActive ? `(${currentSort?.direction})` : ''}`}
      >
        {currentIcon()}
        {/* Active indicator */}
        {isActive && (
          <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 bg-primary-600 rounded-full"></span>
        )}
      </button>
      
      {/* Dropdown Menu */}
      {isOpen && (
        <div className="fixed z-[9999] w-56 bg-white border border-gray-300 rounded-md shadow-xl overflow-hidden"
             style={{
               top: dropdownPosition.top,
               left: dropdownPosition.left,
             }}>
          {/* Header */}
          <div className="px-3 py-2 border-b border-gray-100 bg-gray-50">
            <span className="text-xs font-medium text-gray-700">Sort Options</span>
          </div>
          
          {/* Sort Options */}
          <div className="py-1">
            {availableOptions.map((option) => (
              <div key={option.type} className="border-b border-gray-50 last:border-b-0">
                {/* Sort Type Header */}
                <div className="px-3 py-1.5 bg-gray-25">
                  <div className="flex items-center text-xs font-medium text-gray-600">
                    {option.icon}
                    <span className="ml-2">{option.label}</span>
                  </div>
                </div>
                
                {/* Direction Options */}
                <div className="pl-6">
                  {option.directions.map((direction) => (
                    <button
                      key={direction.value}
                      type="button"
                      onClick={() => handleSortSelect(option.type, direction.value)}
                      className={`
                        w-full text-left px-3 py-1.5 text-xs
                        transition-colors duration-150
                        flex items-center justify-between
                        ${currentSort?.type === option.type && currentSort?.direction === direction.value
                          ? 'bg-primary-50 text-primary-900 border-l-2 border-primary-500' 
                          : 'hover:bg-gray-50 text-gray-700'
                        }
                        focus:outline-none focus:bg-gray-50
                      `.trim().replace(/\s+/g, ' ')}
                    >
                      <span>{direction.label}</span>
                      {currentSort?.type === option.type && currentSort?.direction === direction.value && (
                        <div className="text-primary-600 text-base font-medium">
                          {direction.value === 'asc' ? '⤴' : '⤵'}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            
            {/* Clear Sort Option */}
            {isActive && (
              <>
                <div className="border-t border-gray-200 my-1"></div>
                <button
                  type="button"
                  onClick={() => handleSortSelect(currentSort!.type, null)}
                  className="w-full text-left px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 hover:text-red-600 
                           transition-colors duration-150 focus:outline-none focus:bg-gray-50"
                >
                  Clear Sort
                </button>
              </>
            )}
          </div>
          
          {/* Footer with tip */}
          <div className="px-3 py-2 border-t border-gray-100 bg-gray-50">
            <span className="text-xs text-gray-500">
              Double-click for quick sort toggle
            </span>
          </div>
        </div>
      )}
    </div>
  );
});

TableSort.displayName = 'TableSort';

export default TableSort; 