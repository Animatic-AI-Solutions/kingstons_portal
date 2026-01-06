# UI Component Library

**Kingston's Portal - Reusable UI Components**

This directory contains truly reusable UI components that are used across multiple features and can be imported anywhere without coupling to specific business logic.

---

## 🎯 Purpose

The `ui/` directory provides:
- ✅ **Reusable primitives** - Buttons, inputs, dropdowns, badges
- ✅ **Consistent styling** - Tailwind CSS with design system tokens
- ✅ **Accessibility** - WCAG 2.1 AA compliant
- ✅ **Well-tested** - High test coverage
- ✅ **Documented** - Clear prop interfaces

---

## 📁 Directory Structure

```
ui/
├── buttons/                     # Button Components
│   ├── ActionButton.tsx
│   ├── AddButton.tsx
│   ├── Button.tsx
│   ├── DeleteButton.tsx
│   ├── EditButton.tsx
│   └── LapseButton.tsx
│
├── inputs/                      # Form Input Components
│   ├── BaseInput.tsx
│   ├── DateInput.tsx
│   ├── InputError.tsx
│   ├── InputGroup.tsx
│   ├── InputLabel.tsx
│   ├── NumberInput.tsx
│   ├── PasswordInput.tsx
│   └── TextArea.tsx
│
├── dropdowns/                   # Dropdown/Select Components
│   ├── BaseDropdown.tsx
│   ├── ComboDropdown.tsx
│   ├── CreatableDropdown.tsx
│   ├── CreatableMultiSelect.tsx
│   ├── FilterDropdown.tsx
│   └── MultiSelectDropdown.tsx
│
├── modals/                      # Modal Components
│   └── ModalShell.tsx           # Base modal wrapper
│
├── tables/                      # Table Components
│   ├── SortableColumnHeader.tsx
│   ├── StandardTable.tsx
│   ├── TableSortHeader.tsx
│   └── SkeletonTable.tsx
│
├── badges/                      # Badge Components
│   └── StatusBadge.tsx
│
├── navigation/                  # Navigation Components
│   └── TabNavigation.tsx
│
├── feedback/                    # User Feedback Components
│   ├── EmptyState.tsx
│   ├── ErrorDisplay.tsx
│   ├── ErrorStateNetwork.tsx
│   ├── ErrorStateServer.tsx
│   ├── Skeleton.tsx
│   └── TableSkeleton.tsx
│
├── search/                      # Search Components
│   ├── AutocompleteSearch.tsx
│   ├── FilterSearch.tsx
│   ├── GlobalSearch.tsx
│   └── SearchInput.tsx
│
├── data-displays/               # Data Visualization
│   ├── DataTable.tsx
│   └── FundDistributionChart.tsx
│
├── date/                        # Date/Calendar Components
│   ├── EnhancedMonthHeader.tsx
│   └── MiniYearSelector.tsx
│
├── card/                        # Card Components
│   ├── Card.tsx
│   ├── StatBox.tsx
│   ├── StatCard.tsx
│   └── ChangeIndicator.tsx
│
├── table-controls/              # Table Utilities
│   ├── TableFilter.tsx
│   └── TableSort.tsx
│
├── constants/                   # UI Constants
│   └── tableIcons.ts
│
├── ConcurrentUserModal.tsx      # Special modals
├── FieldError.tsx               # Field-level error display
├── ProfileAvatar.tsx            # User avatar
└── index.ts                     # Barrel export (✅ USE THIS)
```

---

## 📦 Barrel Export (Recommended)

**Always import from the barrel export:**

```typescript
// ✅ GOOD - Import from barrel
import {
  ActionButton,
  BaseInput,
  ModalShell,
  StatusBadge,
  TabNavigation,
  EmptyState
} from '@/components/ui';

// ❌ BAD - Direct import (harder to refactor)
import ActionButton from '@/components/ui/buttons/ActionButton';
import BaseInput from '@/components/ui/inputs/BaseInput';
```

The barrel export (`index.ts`) provides all components as named exports.

---

## 🎨 Component Categories

### Buttons

**When to use**: Any clickable action

```typescript
import { ActionButton, AddButton, EditButton, DeleteButton } from '@/components/ui';

// Primary action
<ActionButton onClick={handleSave}>Save</ActionButton>

// Add new entity
<AddButton onClick={openModal}>Add Person</AddButton>

// Edit entity
<EditButton onClick={handleEdit} />

// Delete entity (requires confirmation)
<DeleteButton onClick={handleDelete} />
```

**Available**: ActionButton, AddButton, Button, DeleteButton, EditButton, LapseButton

---

### Inputs

**When to use**: Form fields for user input

```typescript
import { BaseInput, NumberInput, DateInput, PasswordInput } from '@/components/ui';

// Text input
<BaseInput
  label="First Name"
  value={firstName}
  onChange={setFirstName}
  required
/>

// Number input
<NumberInput
  label="Age"
  value={age}
  onChange={setAge}
  min={0}
  max={150}
/>

// Date input (UK format: dd/MM/yyyy)
<DateInput
  label="Date of Birth"
  value={dob}
  onChange={setDob}
/>

// Password input (with show/hide toggle)
<PasswordInput
  label="Password"
  value={password}
  onChange={setPassword}
/>
```

**Available**: BaseInput, NumberInput, DateInput, PasswordInput, TextArea, InputLabel, InputError, InputGroup

---

### Dropdowns

**When to use**: Select from options

```typescript
import { BaseDropdown, MultiSelectDropdown, ComboDropdown } from '@/components/ui';

// Single select with keyboard search (type while focused)
<BaseDropdown
  options={countries}
  value={country}
  onChange={setCountry}
  label="Country"
  placeholder="Select country"
/>

// Multi-select
<MultiSelectDropdown
  options={productOwners}
  value={selectedOwners}
  onChange={setSelectedOwners}
  label="Product Owners"
/>

// Combo (allows custom values not in list)
<ComboDropdown
  options={cities}
  value={city}
  onChange={setCity}
  label="City"
  allowCustomValue
/>
```

**Available**: BaseDropdown, MultiSelectDropdown, ComboDropdown, CreatableDropdown, CreatableMultiSelect, FilterDropdown

---

### Modals

**When to use**: Pop-up dialogs for forms, confirmations, etc.

```typescript
import { ModalShell } from '@/components/ui';

<ModalShell
  isOpen={isOpen}
  onClose={onClose}
  title="Edit Product Owner"
  size="md"
>
  <form onSubmit={handleSubmit}>
    {/* Form content */}
  </form>
</ModalShell>
```

**Sizes**: `sm` (400px), `md` (600px), `lg` (800px), `xl` (1000px), `full` (95vw)

---

### Tables

**When to use**: Displaying tabular data

```typescript
import { StandardTable, SortableColumnHeader, TableSortHeader } from '@/components/ui';

// Standard table with sorting
<StandardTable
  data={users}
  columns={columnConfig}
  onRowClick={handleRowClick}
  isLoading={isLoading}
/>

// Custom table with sortable headers
<table>
  <thead>
    <tr>
      <SortableColumnHeader
        field="firstName"
        currentSort={sortConfig}
        onSort={handleSort}
      >
        First Name
      </SortableColumnHeader>
    </tr>
  </thead>
</table>
```

**Available**: StandardTable, SortableColumnHeader, TableSortHeader, SkeletonTable

---

### Badges

**When to use**: Status indicators, tags

```typescript
import { StatusBadge } from '@/components/ui';

<StatusBadge status="active" />    // Green
<StatusBadge status="lapsed" />    // Orange
<StatusBadge status="deceased" />  // Gray
```

---

### Navigation

**When to use**: Tab navigation within a feature

```typescript
import { TabNavigation } from '@/components/ui';

<TabNavigation
  tabs={[
    { id: 'personal', label: 'Personal' },
    { id: 'professional', label: 'Professional' }
  ]}
  activeTab={activeTab}
  onTabChange={setActiveTab}
/>
```

---

### Feedback

**When to use**: Loading states, errors, empty states

```typescript
import {
  EmptyState,
  ErrorDisplay,
  Skeleton,
  TableSkeleton
} from '@/components/ui';

// Loading state
{isLoading && <TableSkeleton rows={5} />}

// Error state
{error && (
  <ErrorDisplay
    error={error}
    onRetry={refetch}
  />
)}

// Empty state
{data.length === 0 && (
  <EmptyState
    icon={UserIcon}
    title="No people found"
    description="Add your first person to get started"
    action={<AddButton onClick={openModal}>Add Person</AddButton>}
  />
)}
```

**Available**: EmptyState, ErrorDisplay, ErrorStateNetwork, ErrorStateServer, Skeleton, TableSkeleton

---

### Search

**When to use**: Search functionality

```typescript
import { SearchInput, GlobalSearch } from '@/components/ui';

// Local search in a list
<SearchInput
  value={query}
  onChange={setQuery}
  placeholder="Search people..."
/>

// Global search across app
<GlobalSearch />
```

---

### Data Displays

**When to use**: Charts, data visualization

```typescript
import { DataTable, FundDistributionChart } from '@/components/ui';

<FundDistributionChart
  data={fundData}
  colors={providerColors}
/>
```

---

## ✅ Adding a New UI Component

### Checklist

1. **Is it truly reusable?**
   - Can it be used in 3+ unrelated features?
   - Does it have no business logic?
   - Is it a generic UI pattern?

2. **Choose the right subfolder**
   - Button? → `buttons/`
   - Input? → `inputs/`
   - Dropdown? → `dropdowns/`
   - Modal? → `modals/`
   - Table? → `tables/`
   - Badge? → `badges/`
   - Navigation? → `navigation/`
   - Feedback? → `feedback/`
   - Other? Create new category

3. **Create the component**

```typescript
/**
 * ComponentName
 *
 * Brief description of what this component does.
 *
 * @example
 * <ComponentName prop1="value" />
 */
import React from 'react';

interface ComponentNameProps {
  /** Prop description */
  prop1: string;
  /** Optional prop */
  prop2?: number;
}

const ComponentName: React.FC<ComponentNameProps> = ({
  prop1,
  prop2 = 10
}) => {
  return (
    <div className="...">
      {/* Component JSX */}
    </div>
  );
};

export default ComponentName;
export type { ComponentNameProps };
```

4. **Add to barrel export** (`index.ts`)

```typescript
export { default as ComponentName } from './subfolder/ComponentName';
export type { ComponentNameProps } from './subfolder/ComponentName';
```

5. **Write tests**

```typescript
// ComponentName.test.tsx
import { render, screen } from '@testing-library/react';
import { ComponentName } from '@/components/ui';

describe('ComponentName', () => {
  it('renders correctly', () => {
    render(<ComponentName prop1="test" />);
    expect(screen.getByText('test')).toBeInTheDocument();
  });
});
```

6. **Document usage** in this README

---

## 🎨 Styling Guidelines

### Use Tailwind CSS

```typescript
// ✅ GOOD - Tailwind classes
<button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
  Submit
</button>

// ❌ BAD - Inline styles
<button style={{ padding: '0.5rem 1rem', backgroundColor: '#2563eb' }}>
  Submit
</button>
```

### Design System Tokens

**Colors**:
- Primary: `bg-blue-600`, `text-blue-600`
- Success: `bg-green-600`, `text-green-600`
- Warning: `bg-orange-500`, `text-orange-500`
- Danger: `bg-red-600`, `text-red-600`
- Neutral: `bg-gray-600`, `text-gray-700`

**Spacing**:
- Small: `space-y-2`, `gap-2`, `p-2`
- Medium: `space-y-4`, `gap-4`, `p-4`
- Large: `space-y-6`, `gap-6`, `p-6`

**Borders**:
- Default: `border border-gray-300 rounded`
- Focus: `focus:ring-2 focus:ring-blue-500`

---

## ♿ Accessibility Requirements

All UI components must be accessible:

### Keyboard Navigation
- [ ] Tab order is logical
- [ ] All interactive elements focusable
- [ ] Focus visible (ring or outline)
- [ ] Escape closes modals
- [ ] Enter/Space activates buttons

### ARIA Labels
- [ ] `aria-label` for icon-only buttons
- [ ] `aria-labelledby` for complex components
- [ ] `aria-describedby` for error messages
- [ ] `aria-expanded` for dropdowns
- [ ] `aria-selected` for tabs

### Screen Readers
- [ ] Use semantic HTML (`<button>`, not `<div onClick>`)
- [ ] Provide text alternatives for icons
- [ ] Announce dynamic content changes
- [ ] Skip links for navigation

---

## 🧪 Testing Requirements

All UI components must have tests:

```typescript
describe('ComponentName', () => {
  // Basic rendering
  it('renders with required props', () => { /* ... */ });

  // User interactions
  it('calls onClick when clicked', () => { /* ... */ });
  it('updates value on change', () => { /* ... */ });

  // States
  it('shows loading state', () => { /* ... */ });
  it('shows error state', () => { /* ... */ });
  it('shows disabled state', () => { /* ... */ });

  // Accessibility
  it('has no accessibility violations', async () => {
    const { container } = render(<ComponentName />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

---

## 🚫 What Doesn't Belong Here

### ❌ Feature-Specific Components
```typescript
// DON'T - Too specific for ui/
components/ui/buttons/CreateProductOwnerButton.tsx

// DO - Keep generic
components/ui/buttons/ActionButton.tsx  // ✅
components/phase2/people/CreateProductOwnerModal.tsx  // ✅
```

### ❌ Business Logic
```typescript
// DON'T - Business logic in UI component
const ProductOwnerButton = () => {
  const { data } = useProductOwners();  // ❌ API call
  const validatedData = validateProductOwner(data);  // ❌ Business logic
  return <button>...</button>;
};

// DO - UI only
const ActionButton = ({ onClick, children }) => {
  return <button onClick={onClick}>{children}</button>;
};
```

### ❌ Hard-Coded Data
```typescript
// DON'T
const StatusDropdown = () => (
  <select>
    <option>Active</option>
    <option>Inactive</option>
  </select>
);

// DO
const Dropdown = ({ options }) => (
  <select>
    {options.map(opt => <option key={opt}>{opt}</option>)}
  </select>
);
```

---

## 📖 Further Reading

- [`../README.md`](../README.md) - Component organization guide
- [`../phase2/README.md`](../phase2/README.md) - How to use UI components in features
- [`../../CLAUDE.md`](../../CLAUDE.md) - Project documentation

---

**Last Updated**: 2026-01-06
**Component Count**: 50+ reusable UI components
**Status**: ✅ Active Component Library
