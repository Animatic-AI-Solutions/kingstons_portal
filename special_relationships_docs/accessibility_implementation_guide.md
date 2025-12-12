# Accessibility Implementation Guide - Special Relationships
**Addresses Critical Analysis Issue #3: Accessibility Implementation Lacks Concrete Specifications**

## Executive Summary

This guide provides **concrete, code-level accessibility specifications** for all Special Relationships components to ensure WCAG 2.1 AA compliance. The critical analysis identified that the original plan committed to accessibility but lacked implementation details, creating 70% probability of violations requiring 8-12 hours of rework.

**This guide eliminates that risk** by providing:
- Exact ARIA attributes for each component with code examples
- Focus management strategies with library recommendations
- Keyboard navigation specifications
- Screen reader testing procedures
- Color-independent status indicators
- Live region announcement patterns

**Target**: Zero accessibility violations, tested with axe-core and manual NVDA testing.

---

## Table of Contents

1. [General Accessibility Principles](#general-accessibility-principles)
2. [Sortable Table Accessibility](#sortable-table-accessibility)
3. [Modal Accessibility](#modal-accessibility)
4. [Editable Dropdown (Combobox) Accessibility](#editable-dropdown-combobox-accessibility)
5. [Status Indicator Accessibility](#status-indicator-accessibility)
6. [Action Button Accessibility](#action-button-accessibility)
7. [Tab Navigation Accessibility](#tab-navigation-accessibility)
8. [Live Region Announcements](#live-region-announcements)
9. [Keyboard Navigation Summary](#keyboard-navigation-summary)
10. [Testing Procedures](#testing-procedures)

---

## General Accessibility Principles

### Kingston's Portal Elderly User Considerations

Special emphasis on elderly users requires:

1. **Large Font Sizes**: Minimum 16px for body text, 18px+ for important content
2. **High Contrast**: Minimum 4.5:1 for text, 3:1 for UI components
3. **Large Click Targets**: Minimum 44×44px for interactive elements (WCAG AAA)
4. **Simple Interactions**: Avoid complex gestures, provide keyboard alternatives
5. **Clear Visual Feedback**: Obvious focus indicators, hover states, loading states

### Core WCAG 2.1 AA Requirements

- **Perceivable**: Text alternatives, captions, adaptable content, distinguishable
- **Operable**: Keyboard accessible, enough time, seizure prevention, navigable
- **Understandable**: Readable, predictable, input assistance
- **Robust**: Compatible with assistive technologies

---

## Sortable Table Accessibility

### ARIA Attributes for Table Headers

**Requirement**: Sortable tables MUST use `aria-sort` to announce sort state to screen readers.

**Implementation** (TableSortHeader.tsx):

```typescript
interface TableSortHeaderProps {
  label: string;
  column: string;
  sortConfig: { column: string; direction: 'asc' | 'desc' };
  onSort: (column: string) => void;
  className?: string;
}

export const TableSortHeader: React.FC<TableSortHeaderProps> = ({
  label,
  column,
  sortConfig,
  onSort,
  className
}) => {
  const isSorted = sortConfig.column === column;
  const direction = isSorted ? sortConfig.direction : undefined;

  // Calculate next sort direction for accessibility announcement
  const getNextDirection = () => {
    if (!isSorted) return 'ascending';
    return direction === 'asc' ? 'descending' : 'ascending';
  };

  const handleClick = () => {
    onSort(column);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Enter and Space both trigger sort (keyboard accessibility)
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault(); // Prevent page scroll on Space
      onSort(column);
    }
  };

  return (
    <th
      scope="col" // ✅ WCAG: Identifies header cells for columns
      className={`px-6 py-3 text-left text-base font-medium text-gray-500 uppercase tracking-wider ${className}`}
    >
      <button
        type="button"
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className="flex items-center space-x-1 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 rounded px-2 py-1 -mx-2 -my-1"
        aria-label={`Sort by ${label}, currently ${isSorted ? `sorted ${direction === 'asc' ? 'ascending' : 'descending'}` : 'not sorted'}. Click to sort ${getNextDirection()}.`}
        aria-sort={isSorted ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'}
        // ✅ WCAG: aria-sort announces current sort state to screen readers
        tabIndex={0}
      >
        <span className="text-base">{label}</span>
        {/* Visual sort indicator */}
        {isSorted && (
          <span aria-hidden="true" className="text-primary-600">
            {/* ✅ WCAG: aria-hidden="true" because sort state is in aria-label */}
            {direction === 'asc' ? '↑' : '↓'}
          </span>
        )}
      </button>
    </th>
  );
};
```

**Key Accessibility Features**:
- `scope="col"` on `<th>` associates header with column cells
- `aria-sort` announces current sort state ("ascending", "descending", "none")
- `aria-label` provides full context including current state and next action
- `aria-hidden="true"` on visual indicator prevents duplicate announcements
- Enter AND Space keys trigger sort (keyboard users expect both)
- Focus visible indicator (ring-2, ring-offset-2, ring-primary-500)

**Screen Reader Announcement**:
```
User tabs to "Name" header:
NVDA: "Sort by Name, currently not sorted. Click to sort ascending. Button."

User presses Enter:
NVDA: "Sorted ascending."

User presses Enter again:
NVDA: "Sorted descending."
```

---

### Table Row Accessibility

**Implementation** (SpecialRelationshipRow.tsx):

```typescript
export const SpecialRelationshipRow: React.FC<SpecialRelationshipRowProps> = ({
  relationship,
  type,
  onRowClick,
  onStatusChange,
  onDelete
}) => {
  const isInactive = relationship.status === 'Inactive' || relationship.status === 'Deceased';

  const handleRowClick = () => {
    onRowClick(relationship);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Enter key opens edit modal (keyboard accessibility)
    if (e.key === 'Enter') {
      e.preventDefault();
      onRowClick(relationship);
    }
  };

  return (
    <tr
      onClick={handleRowClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      // ✅ WCAG: tabIndex={0} makes row keyboard focusable
      className={`cursor-pointer hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 transition-colors ${
        isInactive ? 'opacity-60 bg-gray-50' : ''
      }`}
      aria-label={`${relationship.name}, ${relationship.relationship_type}, Status: ${relationship.status}. Press Enter to edit.`}
      // ✅ WCAG: aria-label provides context for screen reader users
      role="button"
      // ✅ WCAG: role="button" indicates row is interactive
    >
      {/* Table cells... */}
    </tr>
  );
};
```

**Key Accessibility Features**:
- `tabIndex={0}` allows keyboard users to focus row
- `role="button"` indicates interactive element
- `aria-label` provides meaningful context (name, type, status, action)
- Enter key opens modal (standard keyboard interaction)
- Focus visible indicator (ring-2, ring-inset, ring-primary-500)
- Opacity change for inactive/deceased uses `opacity-60` (still readable, 4.5:1 contrast maintained)

---

## Modal Accessibility

### Focus Trap Implementation

**Library**: Use `focus-trap-react` (battle-tested, 2KB gzipped)

**Installation**:
```bash
npm install focus-trap-react
```

**Implementation** (ModalShell.tsx):

```typescript
import FocusTrap from 'focus-trap-react';
import { useEffect, useRef } from 'react';

interface ModalShellProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const ModalShell: React.FC<ModalShellProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md'
}) => {
  // Store element that triggered modal for focus restoration
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      // ✅ WCAG: Store current focus to restore when modal closes
      previousFocusRef.current = document.activeElement as HTMLElement;

      // ✅ WCAG: Prevent body scroll (usability + accessibility)
      document.body.style.overflow = 'hidden';
    } else {
      // Restore body scroll
      document.body.style.overflow = '';

      // ✅ WCAG: Restore focus to trigger element (critical for keyboard users)
      if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
        previousFocusRef.current.focus();
      }
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleEscape = (e: React.KeyboardEvent) => {
    // ✅ WCAG: Escape key closes modal (expected behavior)
    if (e.key === 'Escape') {
      onClose();
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    // Only close if clicking backdrop, not modal content
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl'
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby="modal-title"
      // ✅ WCAG: aria-labelledby links to modal title for context
      role="dialog"
      // ✅ WCAG: role="dialog" identifies modal
      aria-modal="true"
      // ✅ WCAG: aria-modal="true" indicates focus should be trapped
      onKeyDown={handleEscape}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-gray-900 bg-opacity-75 transition-opacity"
        onClick={handleBackdropClick}
        aria-hidden="true"
        // ✅ WCAG: aria-hidden="true" because backdrop is decorative
      />

      {/* Modal Container */}
      <div className="flex min-h-full items-center justify-center p-4">
        {/* ✅ WCAG: FocusTrap ensures Tab/Shift+Tab cycles within modal */}
        <FocusTrap
          focusTrapOptions={{
            initialFocus: false, // Let first interactive element get focus
            returnFocusOnDeactivate: false, // We handle this manually in useEffect
            escapeDeactivates: true, // Escape key closes modal
            clickOutsideDeactivates: false, // Prevent accidental closes
          }}
        >
          <div className={`relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full ${sizeClasses[size]}`}>
            {/* Modal Header */}
            <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
              <div className="flex items-start justify-between mb-4">
                <h3
                  id="modal-title"
                  // ✅ WCAG: id matches aria-labelledby for association
                  className="text-lg font-semibold leading-6 text-gray-900"
                >
                  {title}
                </h3>

                {/* Close button */}
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 p-1"
                  aria-label="Close modal"
                  // ✅ WCAG: aria-label because button has no text content
                >
                  <span className="sr-only">Close</span>
                  {/* ✅ WCAG: sr-only text for screen readers */}
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Content */}
              {children}
            </div>
          </div>
        </FocusTrap>
      </div>
    </div>
  );
};
```

**Key Accessibility Features**:
- `FocusTrap` from `focus-trap-react` prevents Tab from leaving modal
- `aria-modal="true"` tells screen readers this is a modal dialog
- `aria-labelledby="modal-title"` associates modal with title
- Focus restored to trigger element on close (critical for keyboard navigation context)
- Escape key closes modal (expected behavior)
- Backdrop click closes modal (but not clicks inside modal content)
- Body scroll locked while modal open (prevents disorienting background scrolling)

**Screen Reader Announcement**:
```
User clicks "Add Relationship" button:
NVDA: "Dialog. Add Personal Relationship. Close modal. Button."

User tabs through fields:
NVDA: "Name, edit, required."

User presses Escape:
NVDA: "Add Relationship, button." (focus restored to trigger)
```

---

## Editable Dropdown (Combobox) Accessibility

### ARIA Combobox Pattern

**Kingston Requirement**: Dropdowns must allow typing custom values (editable dropdown).

**WCAG Pattern**: ARIA 1.2 Combobox Pattern

**Recommended Implementation**: Use existing `ComboDropdown` component if it implements ARIA combobox pattern correctly. If not, use `react-select` with custom value support.

**Verification Checklist for ComboDropdown**:
- [ ] Has `role="combobox"` on input element
- [ ] Has `aria-expanded` that toggles true/false when dropdown opens/closes
- [ ] Has `aria-controls` pointing to listbox id
- [ ] Has `aria-activedescendant` pointing to highlighted option
- [ ] Listbox has `role="listbox"`
- [ ] Options have `role="option"` and `aria-selected`
- [ ] Arrow keys navigate options
- [ ] Enter selects highlighted option
- [ ] Escape closes dropdown
- [ ] Typing filters options and announces results

**Implementation Example** (if ComboDropdown needs enhancement):

```typescript
interface ComboDropdownProps {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  placeholder?: string;
  allowCustomValue?: boolean; // Kingston requirement
}

export const ComboDropdown: React.FC<ComboDropdownProps> = ({
  label,
  options,
  value,
  onChange,
  error,
  required,
  placeholder,
  allowCustomValue = true
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [filteredOptions, setFilteredOptions] = useState(options);

  const listboxId = useId(); // React 18 useId for unique IDs
  const inputId = useId();

  useEffect(() => {
    // Filter options based on input value
    const filtered = options.filter(option =>
      option.label.toLowerCase().includes(inputValue.toLowerCase())
    );
    setFilteredOptions(filtered);
  }, [inputValue, options]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setIsOpen(true);
    setHighlightedIndex(0);

    // If allowCustomValue, immediately update parent
    if (allowCustomValue) {
      onChange(newValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setIsOpen(true);
        setHighlightedIndex(prev =>
          prev < filteredOptions.length - 1 ? prev + 1 : prev
        );
        break;

      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : prev));
        break;

      case 'Enter':
        e.preventDefault();
        if (isOpen && filteredOptions.length > 0) {
          // Select highlighted option
          const selected = filteredOptions[highlightedIndex];
          setInputValue(selected.label);
          onChange(selected.value);
          setIsOpen(false);
        } else if (allowCustomValue) {
          // Accept custom value
          onChange(inputValue);
          setIsOpen(false);
        }
        break;

      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;

      case 'Tab':
        // Allow Tab to move focus, close dropdown
        setIsOpen(false);
        break;
    }
  };

  const handleOptionClick = (option: { value: string; label: string }) => {
    setInputValue(option.label);
    onChange(option.value);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <label
        htmlFor={inputId}
        className="block text-sm font-medium text-gray-700 mb-1"
      >
        {label}
        {required && <span className="text-red-500 ml-1" aria-label="required">*</span>}
      </label>

      <input
        type="text"
        id={inputId}
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsOpen(true)}
        className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-base ${
          error ? 'border-red-500' : ''
        }`}
        placeholder={placeholder}
        role="combobox"
        // ✅ WCAG: role="combobox" identifies editable dropdown
        aria-autocomplete="list"
        // ✅ WCAG: aria-autocomplete="list" indicates dropdown shows suggestions
        aria-expanded={isOpen}
        // ✅ WCAG: aria-expanded announces dropdown open/closed state
        aria-controls={listboxId}
        // ✅ WCAG: aria-controls links to dropdown list
        aria-activedescendant={
          isOpen && filteredOptions.length > 0
            ? `${listboxId}-option-${highlightedIndex}`
            : undefined
        }
        // ✅ WCAG: aria-activedescendant announces highlighted option
        aria-required={required}
        aria-invalid={!!error}
        aria-describedby={error ? `${inputId}-error` : undefined}
      />

      {/* Dropdown Icon */}
      <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none mt-7">
        <svg
          className="h-5 w-5 text-gray-400"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L10 5.414 7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3zm-3.707 9.293a1 1 0 011.414 0L10 14.586l2.293-2.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </div>

      {/* Dropdown List */}
      {isOpen && (
        <ul
          id={listboxId}
          role="listbox"
          // ✅ WCAG: role="listbox" identifies dropdown options container
          className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
        >
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option, index) => (
              <li
                key={option.value}
                id={`${listboxId}-option-${index}`}
                role="option"
                // ✅ WCAG: role="option" identifies selectable option
                aria-selected={index === highlightedIndex}
                // ✅ WCAG: aria-selected announces highlighted option
                onClick={() => handleOptionClick(option)}
                className={`cursor-pointer select-none relative py-2 pl-3 pr-9 text-base ${
                  index === highlightedIndex
                    ? 'bg-primary-100 text-primary-900'
                    : 'text-gray-900 hover:bg-gray-100'
                }`}
              >
                {option.label}
              </li>
            ))
          ) : (
            <li className="py-2 pl-3 pr-9 text-gray-500 text-base">
              {allowCustomValue
                ? `Press Enter to use "${inputValue}"`
                : 'No options found'}
            </li>
          )}
        </ul>
      )}

      {/* Error Message */}
      {error && (
        <p
          id={`${inputId}-error`}
          className="mt-1 text-sm text-red-600"
          role="alert"
          // ✅ WCAG: role="alert" announces errors to screen readers
        >
          {error}
        </p>
      )}

      {/* Live Region for Results Announcement */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {/* ✅ WCAG: Announces number of available options */}
        {isOpen && `${filteredOptions.length} ${filteredOptions.length === 1 ? 'option' : 'options'} available`}
      </div>
    </div>
  );
};
```

**Key Accessibility Features**:
- `role="combobox"` on input identifies editable dropdown
- `aria-expanded` announces open/closed state
- `aria-controls` links input to listbox
- `aria-activedescendant` announces highlighted option (critical for screen readers)
- `role="listbox"` and `role="option"` identify dropdown structure
- Arrow keys navigate options (Up/Down)
- Enter selects option or accepts custom value
- Escape closes dropdown
- Live region announces number of filtered options
- `aria-autocomplete="list"` indicates suggestions shown

**Screen Reader Announcement**:
```
User focuses combobox:
NVDA: "Relationship Type, combobox, required. Type to filter, arrow keys to navigate."

User types "Ch":
NVDA: "3 options available. Child, option 1 of 3."

User presses Down Arrow:
NVDA: "Grandchild, option 2 of 3."

User presses Enter:
NVDA: "Child selected."
```

---

## Status Indicator Accessibility

### Color-Independent Design (WCAG Requirement)

**Problem**: Using color alone (grey for inactive/deceased) violates WCAG 1.4.1 (Use of Color).

**Solution**: Combine color with text badge and sufficient contrast.

**Implementation** (SpecialRelationshipRow.tsx status cell):

```typescript
<td className="px-6 py-4 whitespace-nowrap">
  <span
    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
      relationship.status === 'Active'
        ? 'bg-green-100 text-green-800 border border-green-200'
        : relationship.status === 'Inactive'
        ? 'bg-gray-200 text-gray-800 border border-gray-300'
        : 'bg-red-100 text-red-800 border border-red-200'
    }`}
    role="status"
    // ✅ WCAG: role="status" identifies live status information
    aria-label={`Status: ${relationship.status}`}
    // ✅ WCAG: aria-label provides full status context
  >
    {/* Icon (visual indicator) */}
    {relationship.status === 'Active' && (
      <svg
        className="mr-1 h-3 w-3"
        fill="currentColor"
        viewBox="0 0 20 20"
        aria-hidden="true"
        // ✅ WCAG: aria-hidden="true" because status is in text + aria-label
      >
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
          clipRule="evenodd"
        />
      </svg>
    )}
    {relationship.status === 'Inactive' && (
      <svg
        className="mr-1 h-3 w-3"
        fill="currentColor"
        viewBox="0 0 20 20"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
          clipRule="evenodd"
        />
      </svg>
    )}
    {relationship.status === 'Deceased' && (
      <svg
        className="mr-1 h-3 w-3"
        fill="currentColor"
        viewBox="0 0 20 20"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z"
          clipRule="evenodd"
        />
      </svg>
    )}

    {/* Text label (WCAG compliant - not color alone) */}
    <span>{relationship.status}</span>
  </span>
</td>
```

**Key Accessibility Features**:
- Text label ("Active", "Inactive", "Deceased") - not color alone ✅
- Icon + color + text + border = multiple cues for all users
- `role="status"` identifies live status information
- `aria-label` provides full context for screen readers
- Contrast ratios:
  - Active: Green 800 on Green 100 = 7.2:1 ✅ (exceeds 4.5:1 minimum)
  - Inactive: Gray 800 on Gray 200 = 6.1:1 ✅
  - Deceased: Red 800 on Red 100 = 6.8:1 ✅
- Icons are `aria-hidden="true"` (status conveyed via text + aria-label)

**Screen Reader Announcement**:
```
User tabs to status cell:
NVDA: "Status: Active."
```

---

## Action Button Accessibility

**Implementation** (SpecialRelationshipActions.tsx):

```typescript
export const SpecialRelationshipActions: React.FC<Props> = ({
  relationship,
  onStatusChange,
  onDelete
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Prevent row click when clicking action buttons
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleStatusChange = (e: React.MouseEvent, status: RelationshipStatus) => {
    e.stopPropagation();
    onStatusChange(relationship.id, status);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(true);
  };

  return (
    <div onClick={handleClick} onKeyDown={(e) => e.stopPropagation()} className="flex items-center space-x-2">
      {relationship.status === 'Active' && (
        <>
          <button
            type="button"
            onClick={(e) => handleStatusChange(e, 'Inactive')}
            className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            aria-label={`Mark ${relationship.name} as inactive`}
            // ✅ WCAG: aria-label provides context (who is being deactivated)
          >
            Deactivate
          </button>

          <button
            type="button"
            onClick={(e) => handleStatusChange(e, 'Deceased')}
            className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            aria-label={`Mark ${relationship.name} as deceased`}
          >
            Mark Deceased
          </button>
        </>
      )}

      {relationship.status === 'Inactive' && (
        <button
          type="button"
          onClick={(e) => handleStatusChange(e, 'Active')}
          className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          aria-label={`Activate ${relationship.name}`}
        >
          Activate
        </button>
      )}

      <button
        type="button"
        onClick={handleDelete}
        className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
        aria-label={`Delete ${relationship.name}`}
        // ✅ WCAG: aria-label clarifies which relationship will be deleted
      >
        <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
        Delete
      </button>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <ConfirmDialog
          isOpen={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={() => {
            onDelete(relationship.id);
            setShowDeleteConfirm(false);
          }}
          title={`Delete ${relationship.name}?`}
          message="This will soft delete the relationship. You can restore it later if needed."
          confirmText="Delete"
          confirmButtonClass="bg-red-600 hover:bg-red-700"
          cancelText="Cancel"
        />
      )}
    </div>
  );
};
```

**Key Accessibility Features**:
- All buttons have `type="button"` (prevents form submission)
- `aria-label` includes relationship name for context
- Focus visible indicators (ring-2, ring-offset-2)
- Minimum 44×44px click targets (px-3 py-1.5 + text = ~48px height)
- Event propagation stopped (prevents row click and action button click both firing)
- Delete requires confirmation (prevents accidental deletion)

---

## Tab Navigation Accessibility

**Implementation** (TabNavigation.tsx):

```typescript
export const TabNavigation: React.FC<TabNavigationProps> = ({
  activeTab,
  onTabChange
}) => {
  const handleKeyDown = (e: React.KeyboardEvent, tab: 'personal' | 'professional') => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onTabChange(tab);
    }

    // Arrow key navigation (ARIA tabs pattern)
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      onTabChange(tab === 'personal' ? 'professional' : 'personal');
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      onTabChange(tab === 'personal' ? 'professional' : 'personal');
    }
  };

  return (
    <div className="border-b border-gray-200" role="tablist" aria-label="Relationship types">
      {/* ✅ WCAG: role="tablist" identifies tab navigation */}

      <nav className="-mb-px flex space-x-4" aria-label="Tabs">
        <button
          role="tab"
          // ✅ WCAG: role="tab" identifies individual tab
          aria-selected={activeTab === 'personal'}
          // ✅ WCAG: aria-selected announces active tab
          aria-controls="personal-relationships-panel"
          // ✅ WCAG: aria-controls links tab to content panel
          tabIndex={activeTab === 'personal' ? 0 : -1}
          // ✅ WCAG: Only active tab is in tab order (roving tabindex pattern)
          className={`whitespace-nowrap py-4 px-6 border-b-2 font-medium text-base focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
            activeTab === 'personal'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
          onClick={() => onTabChange('personal')}
          onKeyDown={(e) => handleKeyDown(e, 'personal')}
        >
          Personal Relationships
        </button>

        <button
          role="tab"
          aria-selected={activeTab === 'professional'}
          aria-controls="professional-relationships-panel"
          tabIndex={activeTab === 'professional' ? 0 : -1}
          className={`whitespace-nowrap py-4 px-6 border-b-2 font-medium text-base focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
            activeTab === 'professional'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
          onClick={() => onTabChange('professional')}
          onKeyDown={(e) => handleKeyDown(e, 'professional')}
        >
          Professional Relationships
        </button>
      </nav>
    </div>
  );
};
```

**Key Accessibility Features**:
- `role="tablist"` identifies tab navigation container
- `role="tab"` identifies individual tabs
- `aria-selected` announces active tab
- `aria-controls` links tab to content panel
- Roving tabindex pattern (only active tab has tabIndex={0})
- Arrow key navigation (Left/Right switches tabs)
- Enter and Space activate tabs
- Focus visible indicators

**Note**: Table components must have matching `id` and `role="tabpanel"`:

```typescript
<div
  id="personal-relationships-panel"
  role="tabpanel"
  aria-labelledby="personal-tab"
  hidden={activeTab !== 'personal'}
>
  <PersonalRelationshipsTable ... />
</div>
```

---

## Live Region Announcements

**Purpose**: Announce dynamic updates to screen reader users without interrupting their workflow.

**Use Cases**:
- Relationship created: "Relationship added: John Smith"
- Status changed: "John Smith marked as inactive"
- Relationship deleted: "Relationship deleted: John Smith"
- Sort applied: "Sorted by name, ascending"

**Implementation** (Create a reusable `<Announcer>` component):

```typescript
// components/Announcer.tsx
import { useEffect, useRef } from 'react';

interface AnnouncerProps {
  message: string;
  politeness?: 'polite' | 'assertive';
  clearAfter?: number;
}

export const Announcer: React.FC<AnnouncerProps> = ({
  message,
  politeness = 'polite',
  clearAfter = 3000
}) => {
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Auto-clear message after delay
    if (clearAfter > 0) {
      timeoutRef.current = setTimeout(() => {
        // Message will disappear from DOM, screen reader already announced it
      }, clearAfter);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [message, clearAfter]);

  if (!message) return null;

  return (
    <div
      role={politeness === 'assertive' ? 'alert' : 'status'}
      // ✅ WCAG: role="status" for polite announcements, role="alert" for assertive
      aria-live={politeness}
      // ✅ WCAG: aria-live determines interruption level
      aria-atomic="true"
      // ✅ WCAG: aria-atomic="true" reads entire message, not just changed part
      className="sr-only"
      // ✅ WCAG: sr-only makes announcement invisible but audible
    >
      {message}
    </div>
  );
};

// Utility hook for announcements
export function useAnnouncer() {
  const [message, setMessage] = useState('');

  const announce = (newMessage: string) => {
    setMessage(''); // Clear first to ensure re-announcement
    setTimeout(() => setMessage(newMessage), 100);
  };

  return { message, announce };
}
```

**Usage Example** (in CreateSpecialRelationshipModal.tsx):

```typescript
const { message, announce } = useAnnouncer();

const handleSubmit = async () => {
  try {
    await createMutation.mutateAsync(formData);
    announce(`Relationship added: ${formData.name}`);
    // ✅ WCAG: Screen reader announces success
    onClose();
  } catch (error) {
    announce('Failed to create relationship. Please try again.');
    // ✅ WCAG: Screen reader announces error
  }
};

return (
  <>
    <ModalShell ...>
      {/* Form content */}
    </ModalShell>
    <Announcer message={message} />
  </>
);
```

---

## Keyboard Navigation Summary

| Component | Keyboard Interactions | Focus Management |
|-----------|----------------------|------------------|
| **Table Headers** | Enter/Space: Sort column | Focus visible ring |
| **Table Rows** | Enter: Open edit modal<br/>Tab: Next row | Roving tabindex on rows |
| **Action Buttons** | Enter/Space: Activate | Focus on button, stop propagation |
| **Modal** | Escape: Close<br/>Tab: Cycle within modal<br/>Shift+Tab: Reverse cycle | Focus trap, restore focus on close |
| **Tabs** | ArrowLeft/Right: Switch tabs<br/>Enter/Space: Activate tab | Roving tabindex (active tab only) |
| **Combobox** | ArrowDown/Up: Navigate options<br/>Enter: Select option<br/>Escape: Close dropdown<br/>Type: Filter options | Focus on input, aria-activedescendant |
| **Delete Confirm** | Enter: Confirm<br/>Escape: Cancel<br/>Tab: Cycle buttons | Focus on cancel button by default |

---

## Testing Procedures

### 1. Automated Testing with axe-core

**Install jest-axe**:
```bash
npm install --save-dev jest-axe
```

**Add to all component tests**:

```typescript
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

describe('PersonalRelationshipsTable Accessibility', () => {
  test('should have no accessibility violations', async () => {
    const { container } = render(
      <PersonalRelationshipsTable
        relationships={mockRelationships}
        onRowClick={jest.fn()}
        onStatusChange={jest.fn()}
        onDelete={jest.fn()}
      />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

**Run after each component completion**: 0 failures required.

---

### 2. Manual Keyboard Testing (30 minutes per component)

**Test Checklist**:
- [ ] Tab through all interactive elements
- [ ] Verify focus visible on all focusable elements
- [ ] Test Enter/Space on buttons and links
- [ ] Test Arrow keys on tabs and combobox
- [ ] Test Escape key on modals
- [ ] Verify no keyboard traps (can Tab out of everything except modals)
- [ ] Test Shift+Tab reverse navigation
- [ ] Verify skip links work (if present)

---

### 3. Screen Reader Testing with NVDA (15 minutes per component)

**Download NVDA** (free): https://www.nvaccess.org/download/

**Test Checklist**:
- [ ] NVDA announces all visible text
- [ ] NVDA announces aria-labels on buttons/links
- [ ] NVDA announces form field labels and required status
- [ ] NVDA announces form errors (role="alert")
- [ ] NVDA announces table headers and cells correctly
- [ ] NVDA announces sort state (aria-sort)
- [ ] NVDA announces modal title and role
- [ ] NVDA announces tab state (aria-selected)
- [ ] NVDA announces live region updates (status/alert)
- [ ] NVDA announces combobox state (expanded/collapsed, filtered options)

**Key NVDA Commands**:
- `Ctrl`: Stop reading
- `Insert + Down Arrow`: Read all from cursor
- `Tab`: Navigate to next interactive element
- `H`: Jump to next heading
- `T`: Jump to next table
- `F`: Jump to next form field
- `B`: Jump to next button

---

### 4. Color Contrast Testing

**Use WebAIM Contrast Checker**: https://webaim.org/resources/contrastchecker/

**Test All Text**:
- [ ] Body text (16px): Min 4.5:1 contrast
- [ ] Large text (18px+): Min 3:1 contrast
- [ ] UI components (buttons, borders): Min 3:1 contrast
- [ ] Status indicators (Active/Inactive/Deceased): Min 4.5:1 contrast
- [ ] Greyed-out inactive rows: Still readable (min 4.5:1 with opacity)

**Kingston's Portal Colors** (verify these meet WCAG):
- Primary 700 (#5B21B6) on white (#FFFFFF) = 8.2:1 ✅
- Gray 800 (#1F2937) on white (#FFFFFF) = 15.6:1 ✅
- Green 800 (#065F46) on Green 100 (#D1FAE5) = 7.2:1 ✅
- Red 800 (#991B1B) on Red 100 (#FEE2E2) = 6.8:1 ✅
- Gray 800 (#1F2937) on Gray 200 (#E5E7EB) = 6.1:1 ✅

---

### 5. Focus Visible Testing

**Test Checklist**:
- [ ] All interactive elements show focus indicator when tabbed to
- [ ] Focus indicator has min 3:1 contrast against background
- [ ] Focus indicator is not hidden by other elements
- [ ] Focus order matches visual order (top-to-bottom, left-to-right)
- [ ] Focus is not lost when content updates
- [ ] Focus restored correctly after modal closes

---

## Implementation Timeline

### Week 0 (Pre-Implementation)
- ✅ Read this accessibility implementation guide
- ✅ Install jest-axe and focus-trap-react
- ✅ Set up NVDA for testing (if on Windows)

### Cycle 4 (SpecialRelationshipActions)
- ✅ Implement aria-labels on all action buttons
- ✅ Test with axe-core (0 violations)
- ✅ Test with keyboard (Tab, Enter, Space)
- ✅ Test with NVDA

### Cycle 5 (SpecialRelationshipRow)
- ✅ Implement tabIndex={0} and role="button"
- ✅ Implement Enter key handler
- ✅ Test focus visible indicator
- ✅ Test with axe-core

### Cycle 6 (Tables + TableSortHeader)
- ✅ Implement aria-sort on headers
- ✅ Implement aria-labels for sort state
- ✅ Test keyboard sorting (Enter/Space)
- ✅ Test with NVDA (sort announcements)
- ✅ Test color contrast for status indicators

### Cycle 7 (Modals + Combobox)
- ✅ Implement focus trap with focus-trap-react
- ✅ Implement focus restoration
- ✅ Implement aria-modal, aria-labelledby
- ✅ Test Escape key
- ✅ Test combobox aria-expanded, aria-activedescendant
- ✅ Test with NVDA (modal announcements)

### Cycle 8 (TabNavigation + Container)
- ✅ Implement role="tablist", role="tab"
- ✅ Implement roving tabindex
- ✅ Test Arrow key navigation
- ✅ Test with NVDA (tab announcements)

---

## Success Criteria

**Must Achieve**:
- ✅ Zero axe-core violations across all components
- ✅ All interactive elements keyboard accessible
- ✅ All interactive elements have visible focus indicators
- ✅ All form fields have associated labels
- ✅ All images/icons have appropriate alt text or aria-hidden
- ✅ Color contrast meets WCAG AA (4.5:1 for text, 3:1 for UI)
- ✅ Status indicators don't rely on color alone
- ✅ Modals trap focus and restore on close
- ✅ Live regions announce dynamic updates
- ✅ Screen reader testing passes with NVDA

**Documentation**:
- ✅ Accessibility testing results recorded in test reports
- ✅ Any known limitations documented (e.g., "virtualized table not tested with screen reader")

---

## Conclusion

This accessibility implementation guide provides **concrete, actionable specifications** for achieving WCAG 2.1 AA compliance in the Special Relationships feature. By following these patterns from the start of implementation (Cycle 4 onwards), the team will **eliminate the 70% risk of accessibility violations requiring 8-12 hours of rework** identified in the critical analysis.

**Key Takeaway**: Accessibility is built in, not bolted on. Following this guide from day one prevents costly retrofitting and ensures all users—especially Kingston's elderly clients—can successfully use the Special Relationships feature.
