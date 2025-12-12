# Editable Dropdown Component Specification

## Document Purpose

This document addresses **Issue #6** from the critical analysis: "Editable Dropdown UX and Accessibility Is Complex." It provides a comprehensive specification for implementing accessible, editable dropdowns that allow users to type custom values while maintaining WCAG 2.1 AA compliance.

## Table of Contents

1. [Kingston Preference Context](#kingston-preference-context)
2. [Existing Component Analysis](#existing-component-analysis)
3. [ARIA Combobox Pattern](#aria-combobox-pattern)
4. [Implementation Options](#implementation-options)
5. [Custom Value Handling](#custom-value-handling)
6. [Keyboard Navigation](#keyboard-navigation)
7. [Screen Reader Support](#screen-reader-support)
8. [Visual Design](#visual-design)
9. [Testing Strategy](#testing-strategy)
10. [Implementation Checklist](#implementation-checklist)

---

## Kingston Preference Context

### User Requirement

From `kingtson_preferences.md`:
> **Editable dropdowns** - Kingston prefers dropdowns where users can type custom values, not restricted to predefined options only.

### Use Cases in Special Relationships

**Personal Relationships**:
- Relationship Type: Spouse, Child, Parent, Sibling, Grandchild, Other → **BUT also allow custom types like "Godchild", "Nephew", "Cousin"**

**Professional Relationships**:
- Relationship Type: Accountant, Solicitor, Doctor, Financial Advisor, Other → **BUT also allow custom types like "Tax Consultant", "Estate Agent", "Trustee"**

### Why This Is Complex

1. **Accessibility Challenge**: Standard HTML `<select>` doesn't support typing custom values
2. **ARIA Pattern**: Requires proper combobox implementation (role="combobox", aria-expanded, aria-controls, aria-activedescendant)
3. **Keyboard Navigation**: Type to filter, Arrow keys to navigate, Enter to select, Escape to close, Tab to move away
4. **Screen Reader Announcements**: Must announce filtered count, selected option, expanded/collapsed state
5. **Custom Value UX**: Unclear what happens when user types value not in list (save it? ignore it? add to list?)
6. **Validation**: Custom values need validation (max length, character restrictions)

**Estimated Complexity**: 2-8 hours depending on whether existing component is reusable or new implementation required.

---

## Existing Component Analysis

### Step 1: Investigate Current Codebase

**Action Required**: Examine existing `ComboDropdown` component in `frontend/src/components/ui/`.

**Questions to Answer**:

1. **Does ComboDropdown exist?**
   - Check `frontend/src/components/ui/index.ts` for ComboDropdown export
   - Check `frontend/src/components/ui/COMPONENT_GUIDE.md` for documentation

2. **Does it implement ARIA combobox pattern?**
   - Look for `role="combobox"` on input element
   - Check for `aria-expanded`, `aria-controls`, `aria-activedescendant` attributes
   - Verify listbox has `role="listbox"` and options have `role="option"`

3. **Does it support custom values?**
   - Can user type value not in predefined list and have it accepted?
   - How are custom values distinguished from predefined options?

4. **What's the keyboard navigation?**
   - Arrow keys navigate options?
   - Enter selects highlighted option?
   - Escape closes dropdown?
   - Tab moves to next field?

5. **Are there screen reader announcements?**
   - Does it announce "X options available" when filtered?
   - Does it announce selected option?
   - Does it announce when dropdown opens/closes?

### Step 2: Decision Matrix

| Existing Component Status | Decision | Effort |
|---------------------------|----------|--------|
| ✅ ComboDropdown exists with full ARIA pattern + custom values | **Use existing component** | 1-2 hours (integration + custom value persistence) |
| ⚠️ ComboDropdown exists but doesn't support custom values | **Extend existing component** | 3-4 hours (add custom value logic + testing) |
| ⚠️ ComboDropdown exists but has accessibility issues | **Fix and extend** | 4-6 hours (fix ARIA + add custom values) |
| ❌ No ComboDropdown component exists | **Implement new component** | 6-8 hours (full implementation + testing) |

---

## ARIA Combobox Pattern

### W3C Standard

The ARIA 1.2 combobox pattern is the correct approach for editable dropdowns. See: [WAI-ARIA Combobox Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/)

### Core Requirements

**HTML Structure**:
```html
<div class="combobox-wrapper">
  <label for="relationship-type-input" id="relationship-type-label">
    Relationship Type <span aria-label="required">*</span>
  </label>

  <input
    type="text"
    id="relationship-type-input"
    role="combobox"
    aria-autocomplete="list"
    aria-expanded={isOpen}
    aria-controls="relationship-type-listbox"
    aria-activedescendant={highlightedOptionId}
    aria-labelledby="relationship-type-label"
    value={inputValue}
    onChange={handleInputChange}
    onKeyDown={handleKeyDown}
  />

  <ul
    id="relationship-type-listbox"
    role="listbox"
    aria-labelledby="relationship-type-label"
    style={{ display: isOpen ? 'block' : 'none' }}
  >
    {filteredOptions.map((option, index) => (
      <li
        key={option.value}
        id={`relationship-type-option-${index}`}
        role="option"
        aria-selected={highlightedIndex === index}
        onClick={() => handleSelectOption(option)}
      >
        {option.label}
      </li>
    ))}

    {/* Custom value option */}
    {isCustomValue && (
      <li
        id={`relationship-type-option-custom`}
        role="option"
        aria-selected={highlightedIndex === filteredOptions.length}
        className="custom-value-option"
      >
        Use custom value: "{inputValue}"
      </li>
    )}
  </ul>
</div>
```

### Required ARIA Attributes

| Attribute | Element | Purpose | Example Value |
|-----------|---------|---------|---------------|
| `role="combobox"` | Input | Identifies as combobox | - |
| `aria-autocomplete="list"` | Input | Indicates autocomplete behavior | "list" |
| `aria-expanded` | Input | Indicates if dropdown is open | true / false |
| `aria-controls` | Input | Links to listbox ID | "relationship-type-listbox" |
| `aria-activedescendant` | Input | Indicates highlighted option | "relationship-type-option-2" |
| `aria-labelledby` | Input, Listbox | Associates with label | "relationship-type-label" |
| `role="listbox"` | UL | Identifies dropdown as listbox | - |
| `role="option"` | LI | Identifies each option | - |
| `aria-selected` | LI | Indicates if option is highlighted | true / false |

---

## Implementation Options

### Option 1: Use Existing ComboDropdown Component

**IF** existing component already implements ARIA pattern correctly:

```typescript
// PersonalRelationshipFormFields.tsx

import { ComboDropdown } from '@/components/ui';

const personalRelationshipTypes = [
  { value: 'Spouse', label: 'Spouse' },
  { value: 'Partner', label: 'Partner' },
  { value: 'Child', label: 'Child' },
  { value: 'Parent', label: 'Parent' },
  { value: 'Sibling', label: 'Sibling' },
  { value: 'Grandchild', label: 'Grandchild' },
  { value: 'Grandparent', label: 'Grandparent' },
  { value: 'Other Family', label: 'Other Family' },
];

export const PersonalRelationshipFormFields: React.FC<Props> = ({ formData, onChange }) => {
  return (
    <ComboDropdown
      label="Relationship Type"
      options={personalRelationshipTypes}
      value={formData.relationship_type}
      onChange={(value) => onChange({ ...formData, relationship_type: value })}
      allowCustomValue={true} // KEY FEATURE
      customValueLabel="Use custom relationship type"
      placeholder="Select or type relationship type..."
      required
    />
  );
};
```

**Validation**:
- Verify `allowCustomValue` prop exists and works
- Test that custom values are accepted and saved
- Check accessibility with axe-core and NVDA

**Effort**: 1-2 hours

---

### Option 2: Extend Existing Component

**IF** existing component doesn't support custom values but has good ARIA foundation:

```typescript
// components/ui/ComboDropdown.tsx (modifications)

interface ComboDropdownProps<T> {
  label: string;
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
  allowCustomValue?: boolean; // NEW PROP
  customValueLabel?: string; // NEW PROP
  placeholder?: string;
  required?: boolean;
  maxCustomLength?: number; // NEW PROP (default: 50)
}

export const ComboDropdown = <T extends string>({
  allowCustomValue = false,
  customValueLabel = 'Use custom value',
  maxCustomLength = 50,
  ...props
}: ComboDropdownProps<T>) => {
  const [inputValue, setInputValue] = useState(props.value || '');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  // Filter options based on input
  const filteredOptions = useMemo(() => {
    if (!inputValue) return props.options;
    const lowerInput = inputValue.toLowerCase();
    return props.options.filter(opt =>
      opt.label.toLowerCase().includes(lowerInput)
    );
  }, [inputValue, props.options]);

  // Check if input is a custom value (not in predefined options)
  const isCustomValue = useMemo(() => {
    if (!allowCustomValue || !inputValue) return false;
    const exactMatch = props.options.some(
      opt => opt.value.toLowerCase() === inputValue.toLowerCase()
    );
    return !exactMatch && inputValue.length <= maxCustomLength;
  }, [allowCustomValue, inputValue, props.options, maxCustomLength]);

  const handleSelectOption = (option: { value: T; label: string }) => {
    setInputValue(option.label);
    props.onChange(option.value);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleSelectCustomValue = () => {
    if (isCustomValue) {
      // Trim and sanitize custom value
      const customValue = inputValue.trim() as T;
      props.onChange(customValue);
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setIsOpen(true);
        const maxIndex = filteredOptions.length + (isCustomValue ? 1 : 0) - 1;
        setHighlightedIndex(prev => Math.min(prev + 1, maxIndex));
        break;

      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => Math.max(prev - 1, 0));
        break;

      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          handleSelectOption(filteredOptions[highlightedIndex]);
        } else if (isCustomValue && highlightedIndex === filteredOptions.length) {
          handleSelectCustomValue();
        }
        break;

      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;

      case 'Tab':
        // Allow default Tab behavior, but close dropdown
        setIsOpen(false);
        break;
    }
  };

  // Generate highlighted option ID for aria-activedescendant
  const highlightedOptionId = useMemo(() => {
    if (highlightedIndex < 0) return undefined;
    if (highlightedIndex < filteredOptions.length) {
      return `${listboxId}-option-${highlightedIndex}`;
    }
    if (isCustomValue && highlightedIndex === filteredOptions.length) {
      return `${listboxId}-option-custom`;
    }
    return undefined;
  }, [highlightedIndex, filteredOptions.length, isCustomValue]);

  return (
    <div className="combobox-wrapper">
      <label htmlFor={inputId} id={labelId} className="block text-sm font-medium mb-1">
        {props.label}
        {props.required && <span className="text-red-500 ml-1" aria-label="required">*</span>}
      </label>

      <input
        type="text"
        id={inputId}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-activedescendant={highlightedOptionId}
        aria-labelledby={labelId}
        aria-required={props.required}
        className="w-full px-3 py-2 border border-gray-300 rounded-md"
        placeholder={props.placeholder}
        value={inputValue}
        onChange={(e) => {
          setInputValue(e.target.value);
          setIsOpen(true);
          setHighlightedIndex(-1);
        }}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsOpen(true)}
        onBlur={(e) => {
          // Close dropdown after short delay to allow click on option
          setTimeout(() => setIsOpen(false), 200);
        }}
      />

      {isOpen && (
        <ul
          id={listboxId}
          role="listbox"
          aria-labelledby={labelId}
          className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto"
        >
          {filteredOptions.length === 0 && !isCustomValue && (
            <li className="px-3 py-2 text-gray-500">
              No matching options
            </li>
          )}

          {filteredOptions.map((option, index) => (
            <li
              key={option.value}
              id={`${listboxId}-option-${index}`}
              role="option"
              aria-selected={highlightedIndex === index}
              className={`px-3 py-2 cursor-pointer ${
                highlightedIndex === index ? 'bg-blue-100' : 'hover:bg-gray-100'
              }`}
              onClick={() => handleSelectOption(option)}
            >
              {option.label}
            </li>
          ))}

          {isCustomValue && (
            <li
              id={`${listboxId}-option-custom`}
              role="option"
              aria-selected={highlightedIndex === filteredOptions.length}
              className={`px-3 py-2 cursor-pointer border-t border-gray-200 ${
                highlightedIndex === filteredOptions.length ? 'bg-blue-100' : 'hover:bg-gray-100'
              }`}
              onClick={handleSelectCustomValue}
            >
              <span className="text-gray-600">{customValueLabel}: </span>
              <span className="font-medium">"{inputValue}"</span>
            </li>
          )}
        </ul>
      )}

      {/* Screen reader announcement region */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {isOpen && `${filteredOptions.length + (isCustomValue ? 1 : 0)} options available`}
      </div>
    </div>
  );
};
```

**Effort**: 3-4 hours (add custom value logic, test, document)

---

### Option 3: Implement New Component Using Library

**IF** existing component doesn't exist or has fundamental issues:

**Recommended Library**: `downshift` (maintained by Kent C. Dodds, excellent accessibility)

```bash
npm install downshift
```

```typescript
// components/ui/AccessibleCombobox.tsx

import { useCombobox } from 'downshift';
import { useMemo, useState } from 'react';

interface AccessibleComboboxProps<T> {
  label: string;
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
  allowCustomValue?: boolean;
  placeholder?: string;
  required?: boolean;
  maxCustomLength?: number;
}

export const AccessibleCombobox = <T extends string>({
  label,
  options,
  value,
  onChange,
  allowCustomValue = false,
  placeholder = '',
  required = false,
  maxCustomLength = 50,
}: AccessibleComboboxProps<T>) => {
  const [inputValue, setInputValue] = useState(value || '');

  // Filter options based on input
  const filteredOptions = useMemo(() => {
    if (!inputValue) return options;
    const lowerInput = inputValue.toLowerCase();
    return options.filter(opt => opt.label.toLowerCase().includes(lowerInput));
  }, [inputValue, options]);

  // Check if custom value
  const isCustomValue = useMemo(() => {
    if (!allowCustomValue || !inputValue) return false;
    const exactMatch = options.some(
      opt => opt.value.toLowerCase() === inputValue.toLowerCase()
    );
    return !exactMatch && inputValue.length > 0 && inputValue.length <= maxCustomLength;
  }, [allowCustomValue, inputValue, options, maxCustomLength]);

  // Add custom value option to filtered list
  const displayOptions = useMemo(() => {
    const opts = [...filteredOptions];
    if (isCustomValue) {
      opts.push({ value: inputValue as T, label: `Use custom: "${inputValue}"` });
    }
    return opts;
  }, [filteredOptions, isCustomValue, inputValue]);

  // Downshift hook (handles all ARIA attributes automatically)
  const {
    isOpen,
    getToggleButtonProps,
    getLabelProps,
    getMenuProps,
    getInputProps,
    highlightedIndex,
    getItemProps,
  } = useCombobox({
    items: displayOptions,
    inputValue,
    onInputValueChange: ({ inputValue }) => {
      setInputValue(inputValue || '');
    },
    onSelectedItemChange: ({ selectedItem }) => {
      if (selectedItem) {
        onChange(selectedItem.value);
        setInputValue(selectedItem.label);
      }
    },
    itemToString: (item) => item?.label || '',
  });

  return (
    <div className="relative">
      <label {...getLabelProps()} className="block text-sm font-medium mb-1">
        {label}
        {required && <span className="text-red-500 ml-1" aria-label="required">*</span>}
      </label>

      <div className="relative">
        <input
          {...getInputProps()}
          placeholder={placeholder}
          required={required}
          className="w-full px-3 py-2 border border-gray-300 rounded-md pr-8"
        />

        <button
          {...getToggleButtonProps()}
          aria-label="toggle menu"
          className="absolute right-2 top-1/2 transform -translate-y-1/2"
        >
          <span className="text-gray-400">▼</span>
        </button>
      </div>

      <ul
        {...getMenuProps()}
        className={`absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto ${
          isOpen ? 'block' : 'hidden'
        }`}
      >
        {isOpen && displayOptions.length === 0 && (
          <li className="px-3 py-2 text-gray-500">No matching options</li>
        )}

        {isOpen &&
          displayOptions.map((item, index) => (
            <li
              key={`${item.value}-${index}`}
              {...getItemProps({ item, index })}
              className={`px-3 py-2 cursor-pointer ${
                highlightedIndex === index ? 'bg-blue-100' : 'hover:bg-gray-100'
              } ${index === displayOptions.length - 1 && isCustomValue ? 'border-t border-gray-200' : ''}`}
            >
              {item.label}
            </li>
          ))}
      </ul>

      {/* Screen reader announcements */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {isOpen && `${displayOptions.length} options available`}
      </div>
    </div>
  );
};
```

**Advantages of Downshift**:
- ARIA attributes handled automatically (role, aria-expanded, aria-activedescendant, etc.)
- Keyboard navigation built-in
- Accessible by default
- Well-tested and maintained
- Small bundle size (~15KB gzipped)

**Effort**: 6-8 hours (implementation, testing, documentation, integration)

---

## Custom Value Handling

### Persistence Strategy

**Question**: What happens to custom values after they're entered?

**Option A: Session-Only Persistence** (RECOMMENDED)
- Custom values exist only in current form session
- If user creates "Nephew" as custom relationship type, it's saved to database for that relationship
- Next time user opens form, "Nephew" is NOT in dropdown (must type again or shows as current value)
- **Advantage**: Simple, no database schema changes
- **Disadvantage**: Repetitive typing for frequently used custom values

**Option B: User-Specific Persistence**
- Custom values are saved to user's preferences
- All custom values user has ever typed appear in dropdown on future forms
- **Advantage**: Reduces repetitive typing
- **Disadvantage**: Requires backend API for storing user preferences, dropdown list grows over time

**Option C: System-Wide Persistence**
- Custom values become permanent options for all users
- Requires admin approval or automatic addition after X uses
- **Advantage**: Builds comprehensive list over time
- **Disadvantage**: Complex implementation, requires moderation

**DECISION**: Use **Option A (Session-Only)** for initial implementation. Custom values are:
1. Validated (max 50 characters, trim whitespace)
2. Saved to `relationship_type` field in database
3. Displayed as current value when editing existing relationship
4. NOT added to predefined dropdown options for future forms

**Future Enhancement**: Consider Option B if users request it during UAT

---

### Validation Rules

```typescript
// utils/customValueValidation.ts

export interface CustomValueValidationResult {
  isValid: boolean;
  error?: string;
}

export const validateCustomRelationshipType = (value: string): CustomValueValidationResult => {
  // Empty check
  if (!value || value.trim().length === 0) {
    return { isValid: false, error: 'Relationship type is required' };
  }

  // Trim whitespace
  const trimmed = value.trim();

  // Length check
  if (trimmed.length > 50) {
    return { isValid: false, error: 'Relationship type must be 50 characters or less' };
  }

  if (trimmed.length < 2) {
    return { isValid: false, error: 'Relationship type must be at least 2 characters' };
  }

  // Character validation (letters, spaces, hyphens, apostrophes only)
  const validPattern = /^[a-zA-Z\s\-']+$/;
  if (!validPattern.test(trimmed)) {
    return { isValid: false, error: 'Relationship type can only contain letters, spaces, hyphens, and apostrophes' };
  }

  return { isValid: true };
};
```

**Usage**:
```typescript
const handleCustomValueSubmit = (value: string) => {
  const validation = validateCustomRelationshipType(value);
  if (!validation.isValid) {
    setError(validation.error);
    return;
  }

  onChange({ ...formData, relationship_type: value.trim() });
};
```

---

## Keyboard Navigation

### Required Key Bindings

| Key | Action | Implementation |
|-----|--------|----------------|
| **Type any character** | Opens dropdown, filters options | `onChange` triggers filter, `setIsOpen(true)` |
| **ArrowDown** | Highlights next option (wraps to first) | `setHighlightedIndex(prev => (prev + 1) % options.length)` |
| **ArrowUp** | Highlights previous option (wraps to last) | `setHighlightedIndex(prev => prev === 0 ? options.length - 1 : prev - 1)` |
| **Enter** | Selects highlighted option, closes dropdown | `handleSelectOption(options[highlightedIndex])`, `setIsOpen(false)` |
| **Escape** | Closes dropdown, clears highlight | `setIsOpen(false)`, `setHighlightedIndex(-1)` |
| **Tab** | Moves focus to next field, closes dropdown | Allow default Tab behavior, `setIsOpen(false)` in onBlur |
| **Home** (optional) | Highlights first option | `setHighlightedIndex(0)` |
| **End** (optional) | Highlights last option | `setHighlightedIndex(options.length - 1)` |

### Edge Cases

**Empty Filter Results**:
```typescript
// If user types "xyz" and no options match
{filteredOptions.length === 0 && !isCustomValue && (
  <li role="option" className="px-3 py-2 text-gray-500">
    No matching options. {allowCustomValue ? 'Press Enter to use custom value.' : 'Try different search.'}
  </li>
)}
```

**Custom Value as Last Option**:
```typescript
// Always show custom value option AFTER all predefined options
const displayOptions = [
  ...filteredOptions,
  ...(isCustomValue ? [{ value: inputValue, label: `Use custom: "${inputValue}"`, isCustom: true }] : [])
];
```

**Highlight Wrapping**:
```typescript
// Ensure highlightedIndex doesn't exceed array bounds
const maxIndex = displayOptions.length - 1;
setHighlightedIndex(prev => Math.min(Math.max(prev + delta, 0), maxIndex));
```

---

## Screen Reader Support

### Announcements Required

**When dropdown opens**:
```typescript
<div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
  {isOpen && `${filteredOptions.length} options available. Use arrow keys to navigate.`}
</div>
```

**When filtering changes results**:
```typescript
useEffect(() => {
  if (isOpen) {
    announceToScreenReader(`${filteredOptions.length} options available`);
  }
}, [filteredOptions.length, isOpen]);
```

**When option is selected**:
```typescript
const handleSelectOption = (option) => {
  onChange(option.value);
  announceToScreenReader(`${option.label} selected`);
  setIsOpen(false);
};
```

**When custom value is used**:
```typescript
const handleSelectCustomValue = () => {
  onChange(inputValue.trim());
  announceToScreenReader(`Custom relationship type "${inputValue}" entered`);
  setIsOpen(false);
};
```

### Screen Reader Helper Utility

```typescript
// utils/screenReaderAnnounce.ts

let announceTimeout: NodeJS.Timeout | null = null;

export const announceToScreenReader = (message: string) => {
  // Find or create live region
  let liveRegion = document.getElementById('screen-reader-announcements');

  if (!liveRegion) {
    liveRegion = document.createElement('div');
    liveRegion.id = 'screen-reader-announcements';
    liveRegion.setAttribute('role', 'status');
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.className = 'sr-only'; // Visually hidden but read by screen readers
    document.body.appendChild(liveRegion);
  }

  // Clear previous announcement
  if (announceTimeout) {
    clearTimeout(announceTimeout);
  }

  // Set message
  liveRegion.textContent = message;

  // Clear after 1 second to allow re-announcement of same message
  announceTimeout = setTimeout(() => {
    liveRegion!.textContent = '';
  }, 1000);
};
```

---

## Visual Design

### Component States

**Normal State**:
```css
.combobox-input {
  border: 1px solid #d1d5db; /* gray-300 */
  padding: 0.5rem 0.75rem;
  font-size: 16px; /* Kingston preference: 16px+ */
  background-color: white;
}
```

**Focus State**:
```css
.combobox-input:focus {
  outline: none;
  border-color: #3b82f6; /* blue-500 */
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); /* focus ring */
}
```

**Error State**:
```css
.combobox-input.error {
  border-color: #ef4444; /* red-500 */
}

.error-message {
  color: #ef4444;
  font-size: 14px;
  margin-top: 0.25rem;
}
```

**Disabled State**:
```css
.combobox-input:disabled {
  background-color: #f3f4f6; /* gray-100 */
  cursor: not-allowed;
  color: #6b7280; /* gray-500 */
}
```

### Dropdown Options

**Predefined Option (Normal)**:
```css
.option {
  padding: 0.5rem 0.75rem;
  cursor: pointer;
  font-size: 16px;
}

.option:hover {
  background-color: #f3f4f6; /* gray-100 */
}
```

**Highlighted Option** (keyboard navigation):
```css
.option[aria-selected="true"] {
  background-color: #dbeafe; /* blue-100 */
  outline: 2px solid #3b82f6; /* blue-500 */
  outline-offset: -2px;
}
```

**Custom Value Option**:
```css
.option.custom {
  border-top: 1px solid #e5e7eb; /* gray-200 - visual separator */
  background-color: #f9fafb; /* gray-50 - slightly different background */
}

.option.custom .custom-label {
  color: #6b7280; /* gray-500 */
  font-size: 14px;
}

.option.custom .custom-value {
  font-weight: 500;
  color: #111827; /* gray-900 */
}
```

### Custom Value Visual Indicator

**In Dropdown** (before selection):
```html
<li role="option" class="option custom">
  <span class="custom-label">Use custom value: </span>
  <span class="custom-value">"Tax Consultant"</span>
</li>
```

**After Selection** (in form):
```html
<!-- Show badge next to selected custom value -->
<div class="selected-value">
  Tax Consultant
  <span class="badge">Custom</span>
</div>
```

```css
.badge {
  display: inline-block;
  padding: 0.125rem 0.5rem;
  font-size: 12px;
  font-weight: 500;
  background-color: #fef3c7; /* yellow-100 */
  color: #92400e; /* yellow-800 */
  border-radius: 9999px;
  margin-left: 0.5rem;
}
```

---

## Testing Strategy

### Automated Tests (Jest + React Testing Library)

**Test File**: `src/tests/components/ui/ComboDropdown.test.tsx` or `AccessibleCombobox.test.tsx`

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { ComboDropdown } from '@/components/ui/ComboDropdown';

const mockOptions = [
  { value: 'Spouse', label: 'Spouse' },
  { value: 'Child', label: 'Child' },
  { value: 'Parent', label: 'Parent' },
];

describe('ComboDropdown - Custom Values', () => {
  test('should allow typing custom value when allowCustomValue is true', async () => {
    const user = userEvent.setup();
    const handleChange = jest.fn();

    render(
      <ComboDropdown
        label="Relationship Type"
        options={mockOptions}
        value=""
        onChange={handleChange}
        allowCustomValue={true}
      />
    );

    const input = screen.getByRole('combobox');

    // Type custom value
    await user.type(input, 'Nephew');

    // Verify custom value option appears
    expect(screen.getByText(/Use custom value: "Nephew"/i)).toBeInTheDocument();

    // Press Enter to select custom value
    await user.keyboard('{Enter}');

    // Verify onChange called with custom value
    expect(handleChange).toHaveBeenCalledWith('Nephew');
  });

  test('should not allow custom value when allowCustomValue is false', async () => {
    const user = userEvent.setup();

    render(
      <ComboDropdown
        label="Relationship Type"
        options={mockOptions}
        value=""
        onChange={jest.fn()}
        allowCustomValue={false}
      />
    );

    const input = screen.getByRole('combobox');
    await user.type(input, 'Nephew');

    // Custom value option should NOT appear
    expect(screen.queryByText(/Use custom value/i)).not.toBeInTheDocument();
  });

  test('should validate custom value length', async () => {
    const user = userEvent.setup();

    render(
      <ComboDropdown
        label="Relationship Type"
        options={mockOptions}
        value=""
        onChange={jest.fn()}
        allowCustomValue={true}
        maxCustomLength={10}
      />
    );

    const input = screen.getByRole('combobox');

    // Type custom value exceeding max length
    await user.type(input, 'Very Long Relationship Type Name');

    // Custom value option should NOT appear (exceeds max length)
    expect(screen.queryByText(/Use custom value/i)).not.toBeInTheDocument();
  });

  test('should have no accessibility violations', async () => {
    const { container } = render(
      <ComboDropdown
        label="Relationship Type"
        options={mockOptions}
        value=""
        onChange={jest.fn()}
        allowCustomValue={true}
      />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  test('should announce filtered options count to screen readers', async () => {
    const user = userEvent.setup();

    render(
      <ComboDropdown
        label="Relationship Type"
        options={mockOptions}
        value=""
        onChange={jest.fn()}
        allowCustomValue={true}
      />
    );

    const input = screen.getByRole('combobox');
    await user.type(input, 'Chi');

    // Check for screen reader announcement
    expect(screen.getByRole('status')).toHaveTextContent('1 option available');
  });
});

describe('ComboDropdown - Keyboard Navigation', () => {
  test('should navigate options with arrow keys', async () => {
    const user = userEvent.setup();

    render(
      <ComboDropdown
        label="Relationship Type"
        options={mockOptions}
        value=""
        onChange={jest.fn()}
      />
    );

    const input = screen.getByRole('combobox');
    await user.click(input);

    // Press ArrowDown to highlight first option
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('option', { name: 'Spouse' })).toHaveAttribute('aria-selected', 'true');

    // Press ArrowDown again to highlight second option
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('option', { name: 'Child' })).toHaveAttribute('aria-selected', 'true');
  });

  test('should select highlighted option with Enter key', async () => {
    const user = userEvent.setup();
    const handleChange = jest.fn();

    render(
      <ComboDropdown
        label="Relationship Type"
        options={mockOptions}
        value=""
        onChange={handleChange}
      />
    );

    const input = screen.getByRole('combobox');
    await user.click(input);
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}');

    expect(handleChange).toHaveBeenCalledWith('Child');
  });

  test('should close dropdown with Escape key', async () => {
    const user = userEvent.setup();

    render(
      <ComboDropdown
        label="Relationship Type"
        options={mockOptions}
        value=""
        onChange={jest.fn()}
      />
    );

    const input = screen.getByRole('combobox');
    await user.click(input);

    expect(screen.getByRole('listbox')).toBeVisible();

    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.getByRole('listbox')).not.toBeVisible();
    });
  });
});
```

### Manual Testing Checklist

**Keyboard Navigation** (30 minutes):
- [ ] Type characters to filter options
- [ ] Press ArrowDown to highlight options
- [ ] Press ArrowUp to navigate backwards
- [ ] Press Enter to select highlighted option
- [ ] Press Escape to close dropdown
- [ ] Press Tab to move to next field (dropdown closes)
- [ ] Verify focus outline visible on all interactive elements

**Screen Reader Testing (NVDA on Windows)** (15 minutes):
- [ ] Activate NVDA (Insert+N)
- [ ] Tab to combobox, verify label is announced
- [ ] Type characters, verify "X options available" is announced
- [ ] Press ArrowDown, verify highlighted option is announced
- [ ] Navigate to custom value option, verify "Use custom value" is announced
- [ ] Press Enter, verify selected value is announced
- [ ] Verify "required" is announced if field is required

**Mouse/Touch Interaction** (10 minutes):
- [ ] Click input to open dropdown
- [ ] Click option to select it
- [ ] Click custom value option to select custom value
- [ ] Click outside dropdown to close it
- [ ] Verify hover states work correctly

**Custom Value Validation** (15 minutes):
- [ ] Type value > 50 characters, verify custom option doesn't appear
- [ ] Type value with invalid characters (e.g., numbers, symbols), verify validation error
- [ ] Type empty string, verify custom option doesn't appear
- [ ] Type valid custom value, select it, verify it's saved
- [ ] Edit relationship with custom value, verify it displays correctly

**Visual Regression** (10 minutes):
- [ ] Verify dropdown aligns correctly below input
- [ ] Verify dropdown doesn't overflow viewport (scrolls if needed)
- [ ] Verify highlighted option has clear visual indicator
- [ ] Verify custom value option has visual separator (border-top)
- [ ] Test at different screen sizes (768px, 1024px, 1920px)

---

## Implementation Checklist

### Phase 1: Investigation (1 hour)

- [ ] Search codebase for existing ComboDropdown component
- [ ] Read `COMPONENT_GUIDE.md` for ComboDropdown documentation
- [ ] Test existing ComboDropdown (if exists) for:
  - [ ] ARIA combobox pattern implementation
  - [ ] Custom value support
  - [ ] Keyboard navigation
  - [ ] Screen reader compatibility
- [ ] Make decision: Use existing, extend existing, or implement new

### Phase 2: Implementation (2-8 hours, depending on decision)

**IF using existing component**:
- [ ] Add `allowCustomValue` prop usage in form components
- [ ] Test custom value persistence in database
- [ ] Add validation for custom values
- [ ] Write tests for custom value scenarios

**IF extending existing component**:
- [ ] Add `allowCustomValue`, `customValueLabel`, `maxCustomLength` props
- [ ] Implement custom value detection logic
- [ ] Implement custom value option rendering
- [ ] Add keyboard navigation for custom value option
- [ ] Add screen reader announcements
- [ ] Write comprehensive tests (unit + integration)
- [ ] Update component documentation

**IF implementing new component**:
- [ ] Install `downshift` library (`npm install downshift`)
- [ ] Create `AccessibleCombobox.tsx` component
- [ ] Implement ARIA combobox pattern (or use downshift's built-in pattern)
- [ ] Implement custom value logic
- [ ] Implement keyboard navigation
- [ ] Implement screen reader announcements
- [ ] Style component to match design system
- [ ] Write comprehensive tests
- [ ] Add to component library (`components/ui/index.ts`)
- [ ] Document in `COMPONENT_GUIDE.md`

### Phase 3: Integration (1-2 hours)

- [ ] Replace relationship type inputs in `CreateSpecialRelationshipModal`
- [ ] Replace relationship type inputs in `EditSpecialRelationshipModal`
- [ ] Add custom value validation in form submission
- [ ] Test end-to-end: type custom value → submit → verify in database → edit → verify displays correctly

### Phase 4: Testing (2-3 hours)

- [ ] Write automated tests (Jest + React Testing Library)
- [ ] Run jest-axe accessibility tests
- [ ] Perform manual keyboard navigation testing (30 min)
- [ ] Perform manual screen reader testing with NVDA (15 min)
- [ ] Test custom value edge cases (validation, max length, etc.)
- [ ] Test visual design (hover, focus, error states)

### Phase 5: Documentation (30 minutes)

- [ ] Update `COMPONENT_GUIDE.md` with ComboDropdown usage
- [ ] Document custom value behavior in implementation plan
- [ ] Add code comments explaining ARIA attributes
- [ ] Create example usage in component stories (if using Storybook)

---

## Summary

**Total Estimated Effort**: 2-8 hours depending on existing component status

### Decision Flowchart

```
Does ComboDropdown exist?
│
├─ No → Implement new with downshift (6-8 hours)
│
└─ Yes → Does it have ARIA pattern?
    │
    ├─ No → Extend with ARIA + custom values (4-6 hours)
    │
    └─ Yes → Does it support custom values?
        │
        ├─ No → Add custom value logic (3-4 hours)
        │
        └─ Yes → Use as-is (1-2 hours integration)
```

### Key Takeaways

1. **ARIA Combobox Pattern is Required**: Standard `<select>` won't work for editable dropdowns
2. **Downshift Library Recommended**: If implementing new, downshift handles accessibility automatically
3. **Custom Values = Session-Only**: Don't persist custom values to dropdown options (initial implementation)
4. **Validation is Critical**: Max length 50 characters, letters/spaces/hyphens only
5. **Screen Reader Support**: Must announce filtered count, selected option, expanded/collapsed state
6. **Keyboard Navigation**: ArrowDown, ArrowUp, Enter, Escape, Tab all required
7. **Testing is Extensive**: Automated (jest-axe) + Manual (keyboard + NVDA) = 2-3 hours

This specification addresses Issue #6 and provides a complete roadmap for implementing accessible, editable dropdowns that meet Kingston's preferences and WCAG 2.1 AA standards.
