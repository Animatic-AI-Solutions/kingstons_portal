/**
 * PeopleMultiSelect Component
 *
 * A reusable multi-select dropdown for selecting people/product owners.
 * Used by both LegalDocumentModal and CreateLegalDocumentModal.
 *
 * Features:
 * - Combobox role for accessibility
 * - Keyboard navigation (ArrowUp, ArrowDown, Enter, Escape)
 * - Selected items displayed as chips with remove buttons
 * - Outside click to close
 *
 * @module components/phase2/legal-documents/shared/PeopleMultiSelect
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';

// =============================================================================
// Types
// =============================================================================

export interface PeopleMultiSelectOption {
  value: number;
  label: string;
}

export interface PeopleMultiSelectProps {
  /** Unique ID for the component */
  id: string;
  /** Available options to select from */
  options: PeopleMultiSelectOption[];
  /** Currently selected values */
  values: number[];
  /** Callback when selection changes */
  onChange: (values: number[]) => void;
  /** Whether the component is disabled */
  disabled?: boolean;
  /** Error message to display */
  error?: string;
  /** ID of the error element for aria-describedby */
  errorId?: string;
  /** Whether the field is required */
  required?: boolean;
}

// =============================================================================
// Component
// =============================================================================

/**
 * PeopleMultiSelect Component
 *
 * A multi-select dropdown with accessibility features including
 * keyboard navigation and proper ARIA attributes.
 */
const PeopleMultiSelect: React.FC<PeopleMultiSelectProps> = ({
  id,
  options,
  values,
  onChange,
  disabled = false,
  error,
  errorId,
  required = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Filter to show only unselected options
  const availableOptions = options.filter((opt) => !values.includes(opt.value));

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: Event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    };

    if (isOpen) {
      document.addEventListener('click', handleClickOutside, true);
    }
    return () => {
      document.removeEventListener('click', handleClickOutside, true);
    };
  }, [isOpen]);

  // Reset focused index when dropdown closes
  useEffect(() => {
    if (!isOpen) {
      setFocusedIndex(-1);
    }
  }, [isOpen]);

  // Scroll focused option into view
  useEffect(() => {
    if (isOpen && focusedIndex >= 0 && listRef.current) {
      const focusedElement = listRef.current.children[focusedIndex] as HTMLElement;
      if (focusedElement && typeof focusedElement.scrollIntoView === 'function') {
        focusedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [focusedIndex, isOpen]);

  const handleSelect = useCallback(
    (optionValue: number) => {
      onChange([...values, optionValue]);
      setIsOpen(false);
      setFocusedIndex(-1);
      // Return focus to the button after selection
      buttonRef.current?.focus();
    },
    [onChange, values]
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (disabled) return;

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          if (!isOpen) {
            setIsOpen(true);
            setFocusedIndex(0);
          } else {
            setFocusedIndex((prev) =>
              prev < availableOptions.length - 1 ? prev + 1 : prev
            );
          }
          break;

        case 'ArrowUp':
          event.preventDefault();
          if (isOpen) {
            setFocusedIndex((prev) => (prev > 0 ? prev - 1 : 0));
          }
          break;

        case 'Enter':
          event.preventDefault();
          if (isOpen && focusedIndex >= 0 && focusedIndex < availableOptions.length) {
            handleSelect(availableOptions[focusedIndex].value);
          } else if (!isOpen) {
            setIsOpen(true);
            setFocusedIndex(0);
          }
          break;

        case 'Escape':
          event.preventDefault();
          setIsOpen(false);
          setFocusedIndex(-1);
          buttonRef.current?.focus();
          break;

        case ' ':
          // Space should also toggle the dropdown when closed
          if (!isOpen) {
            event.preventDefault();
            setIsOpen(true);
            setFocusedIndex(0);
          }
          break;

        default:
          break;
      }
    },
    [disabled, isOpen, focusedIndex, availableOptions, handleSelect]
  );

  const handleButtonClick = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
      if (!isOpen) {
        setFocusedIndex(0);
      }
    }
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        id={id}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={`${id}-listbox`}
        aria-label="Select people"
        aria-required={required}
        aria-describedby={error && errorId ? errorId : undefined}
        aria-invalid={error ? 'true' : undefined}
        tabIndex={0}
        onClick={handleButtonClick}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={`block w-full border rounded-md shadow-sm px-3 py-2 text-sm text-left focus:outline-none focus:ring-4 focus:ring-offset-2 ${
          error
            ? 'border-red-500 focus:border-red-600 focus:ring-red-500/10'
            : 'border-gray-300 focus:border-primary-700 focus:ring-primary-700/10'
        } ${disabled ? 'bg-gray-50 cursor-not-allowed' : 'bg-white cursor-pointer'}`}
      >
        <span className="text-gray-500">
          {availableOptions.length > 0 ? 'Select people...' : 'All people selected'}
        </span>
      </button>

      {isOpen && availableOptions.length > 0 && (
        <ul
          ref={listRef}
          id={`${id}-listbox`}
          role="listbox"
          className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto"
        >
          {availableOptions.map((option, index) => (
            <li
              key={option.value}
              role="option"
              aria-selected={index === focusedIndex}
              onClick={() => handleSelect(option.value)}
              onMouseEnter={() => setFocusedIndex(index)}
              className={`w-full text-left px-4 py-2 text-sm cursor-pointer ${
                index === focusedIndex
                  ? 'bg-primary-100 text-primary-900'
                  : 'hover:bg-primary-50'
              }`}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}

      {error && errorId && (
        <p id={errorId} className="mt-1 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
};

export default PeopleMultiSelect;
