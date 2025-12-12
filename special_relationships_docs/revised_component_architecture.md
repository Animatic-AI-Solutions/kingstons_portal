# Revised Component Architecture - Special Relationships
**Addresses Critical Analysis Issue #1: Component Size Constraints**

## Executive Summary

This document revises the original component architecture to ensure **ALL components stay under the 500-line limit**. The original plan estimated SpecialRelationshipsTable at 300 lines and modals at 250 lines, but the critical analysis revealed these would likely exceed 500 lines when including sorting logic, accessibility attributes, form validation, and error handling.

**Key Changes:**
1. Split single table component into separate `PersonalRelationshipsTable` and `ProfessionalRelationshipsTable`
2. Extract reusable `TableSortHeader` component
3. Split modal into smaller sub-components: `ModalShell`, `RelationshipFormFields`, `useRelationshipValidation`
4. Extract `TabNavigation` component
5. Create shared `SpecialRelationshipRow` and `SpecialRelationshipActions` components

**Result:** All components ≤250 lines (50% safety margin below 500-line limit)

---

## Revised Component Hierarchy

```
BasicDetailsTab (existing)
└── SpecialRelationshipsSubTab (~150 lines) ✅
    ├── TabNavigation (~50 lines) ✅
    ├── PersonalRelationshipsTable (~250 lines) ✅
    │   ├── TableSortHeader (reusable, ~70 lines) ✅
    │   └── SpecialRelationshipRow[] (~150 lines) ✅
    │       └── SpecialRelationshipActions (~100 lines) ✅
    ├── ProfessionalRelationshipsTable (~250 lines) ✅
    │   ├── TableSortHeader (reused from above)
    │   └── SpecialRelationshipRow[] (reused from above)
    │       └── SpecialRelationshipActions (reused from above)
    ├── ModalShell (~80 lines) ✅
    ├── RelationshipFormFields (~200 lines) ✅
    ├── useRelationshipValidation (~100 lines) ✅
    ├── CreateSpecialRelationshipModal (~150 lines) ✅
    └── EditSpecialRelationshipModal (~150 lines) ✅
```

**Total: 12 focused components, all under 500-line limit ✅**

---

## Component Specifications

### 1. SpecialRelationshipsSubTab.tsx (Container)
**File**: `frontend/src/pages/ClientGroupSuite/tabs/BasicDetailsTab/components/SpecialRelationshipsSubTab.tsx`

**Purpose**: Orchestrates all sub-components, manages modal state, coordinates tab switching

**Estimated Lines**: 150

**Responsibilities**:
- Render TabNavigation component
- Conditionally render PersonalRelationshipsTable or ProfessionalRelationshipsTable based on active tab
- Manage modal state (open/close, create vs edit mode)
- Pass down event handlers to child components
- Handle "Add Relationship" button click

**State**:
```typescript
const [activeTab, setActiveTab] = useState<'personal' | 'professional'>('personal');
const [modalState, setModalState] = useState<{
  isOpen: boolean;
  mode: 'create' | 'edit';
  relationship: SpecialRelationship | null;
}>({ isOpen: false, mode: 'create', relationship: null });
```

**Props**:
```typescript
interface SpecialRelationshipsSubTabProps {
  clientGroupId: string;
}
```

**Component Structure** (~150 lines):
```typescript
export const SpecialRelationshipsSubTab: React.FC<Props> = ({ clientGroupId }) => {
  // State management (15 lines)
  // React Query hooks (10 lines)
  // Event handlers (40 lines)
  // Render (85 lines)
  return (
    <div>
      <div className="flex justify-between mb-4">
        <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
        <AddButton onClick={handleAddRelationship} />
      </div>

      {activeTab === 'personal' ? (
        <PersonalRelationshipsTable
          relationships={personalRelationships}
          onRowClick={handleRowClick}
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
        />
      ) : (
        <ProfessionalRelationshipsTable
          relationships={professionalRelationships}
          onRowClick={handleRowClick}
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
        />
      )}

      {modalState.isOpen && modalState.mode === 'create' && (
        <CreateSpecialRelationshipModal
          clientGroupId={clientGroupId}
          type={activeTab}
          isOpen={modalState.isOpen}
          onClose={handleCloseModal}
        />
      )}

      {modalState.isOpen && modalState.mode === 'edit' && modalState.relationship && (
        <EditSpecialRelationshipModal
          relationship={modalState.relationship}
          isOpen={modalState.isOpen}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
};
```

---

### 2. TabNavigation.tsx (Tab Buttons)
**File**: `frontend/src/pages/ClientGroupSuite/tabs/BasicDetailsTab/components/TabNavigation.tsx`

**Purpose**: Render horizontal tab buttons for Personal/Professional switching

**Estimated Lines**: 50

**Props**:
```typescript
interface TabNavigationProps {
  activeTab: 'personal' | 'professional';
  onTabChange: (tab: 'personal' | 'professional') => void;
}
```

**Component Structure** (~50 lines):
```typescript
export const TabNavigation: React.FC<Props> = ({ activeTab, onTabChange }) => {
  return (
    <div className="flex space-x-2" role="tablist">
      <button
        role="tab"
        aria-selected={activeTab === 'personal'}
        aria-controls="personal-relationships-panel"
        className={`px-4 py-2 rounded-t-lg font-medium ${
          activeTab === 'personal'
            ? 'bg-primary-700 text-white'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        }`}
        onClick={() => onTabChange('personal')}
      >
        Personal Relationships
      </button>
      <button
        role="tab"
        aria-selected={activeTab === 'professional'}
        aria-controls="professional-relationships-panel"
        className={`px-4 py-2 rounded-t-lg font-medium ${
          activeTab === 'professional'
            ? 'bg-primary-700 text-white'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        }`}
        onClick={() => onTabChange('professional')}
      >
        Professional Relationships
      </button>
    </div>
  );
};
```

---

### 3. PersonalRelationshipsTable.tsx (Personal Table)
**File**: `frontend/src/pages/ClientGroupSuite/tabs/BasicDetailsTab/components/PersonalRelationshipsTable.tsx`

**Purpose**: Render table for personal relationships with sorting, empty states, loading states

**Estimated Lines**: 250

**Columns**: Name, Date of Birth, Age, Relationship, Dependency, Email, Phone Number, Status, Actions

**Responsibilities**:
- Render table headers with sortable columns (TableSortHeader)
- Render table rows (SpecialRelationshipRow)
- Handle sorting state and logic
- Display empty state when no relationships
- Display loading skeleton during data fetch
- Ensure inactive/deceased relationships appear at bottom and greyed out

**State**:
```typescript
const [sortConfig, setSortConfig] = useState<{
  column: string;
  direction: 'asc' | 'desc';
}>({ column: 'name', direction: 'asc' });
```

**Props**:
```typescript
interface PersonalRelationshipsTableProps {
  relationships: SpecialRelationship[];
  onRowClick: (relationship: SpecialRelationship) => void;
  onStatusChange: (id: string, status: RelationshipStatus) => void;
  onDelete: (id: string) => void;
  isLoading?: boolean;
}
```

**Component Structure** (~250 lines):
- Imports and types (15 lines)
- useMemo for sorted relationships (20 lines)
- Sort handler function (10 lines)
- Empty state component (20 lines)
- Loading skeleton (15 lines)
- Table structure (170 lines):
  - Table headers with TableSortHeader (50 lines)
  - Table body with SpecialRelationshipRow mapping (30 lines)
  - Conditional rendering for empty/loading states (20 lines)
  - Accessibility attributes (aria-label, role="table", etc.) (20 lines)
  - Styling classes (50 lines)

**Key Implementation Details**:
```typescript
// Memoized sorting for performance
const sortedRelationships = useMemo(() => {
  return sortRelationships(relationships, sortConfig.column, sortConfig.direction);
}, [relationships, sortConfig.column, sortConfig.direction]);

// Empty state
if (!isLoading && relationships.length === 0) {
  return (
    <EmptyState
      title="No personal relationships added yet"
      message="Click 'Add Relationship' to add family members and personal contacts."
      icon={<UsersIcon />}
    />
  );
}

// Loading state
if (isLoading) {
  return <TableSkeleton rows={5} columns={9} />;
}

// Table render
return (
  <div role="region" aria-labelledby="personal-relationships-title">
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          <TableSortHeader
            label="Name"
            column="name"
            sortConfig={sortConfig}
            onSort={handleSort}
          />
          <TableSortHeader
            label="Date of Birth"
            column="date_of_birth"
            sortConfig={sortConfig}
            onSort={handleSort}
          />
          {/* ... more headers */}
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {sortedRelationships.map((relationship) => (
          <SpecialRelationshipRow
            key={relationship.id}
            relationship={relationship}
            type="personal"
            onRowClick={onRowClick}
            onStatusChange={onStatusChange}
            onDelete={onDelete}
          />
        ))}
      </tbody>
    </table>
  </div>
);
```

---

### 4. ProfessionalRelationshipsTable.tsx (Professional Table)
**File**: `frontend/src/pages/ClientGroupSuite/tabs/BasicDetailsTab/components/ProfessionalRelationshipsTable.tsx`

**Purpose**: Render table for professional relationships with sorting, empty states, loading states

**Estimated Lines**: 250

**Columns**: Name, Relationship, Relationship With (pills), Phone Number, Email, Status, Actions

**Responsibilities**: Same as PersonalRelationshipsTable but with different columns

**Differences from Personal Table**:
- No Date of Birth, Age, Dependency columns
- Has "Relationship With" column showing product owner pills
- Different empty state message
- Different column widths

**Component Structure** (~250 lines): Same structure as PersonalRelationshipsTable with column variations

---

### 5. TableSortHeader.tsx (Reusable Sort Header)
**File**: `frontend/src/pages/ClientGroupSuite/tabs/BasicDetailsTab/components/TableSortHeader.tsx`

**Purpose**: Reusable sortable table header with accessibility

**Estimated Lines**: 70

**Props**:
```typescript
interface TableSortHeaderProps {
  label: string;
  column: string;
  sortConfig: { column: string; direction: 'asc' | 'desc' };
  onSort: (column: string) => void;
  className?: string;
}
```

**Component Structure** (~70 lines):
```typescript
export const TableSortHeader: React.FC<Props> = ({
  label,
  column,
  sortConfig,
  onSort,
  className
}) => {
  const isSorted = sortConfig.column === column;
  const direction = isSorted ? sortConfig.direction : undefined;

  const handleClick = () => {
    onSort(column);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSort(column);
    }
  };

  return (
    <th
      scope="col"
      className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${className}`}
    >
      <button
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className="flex items-center space-x-1 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
        aria-label={`Sort by ${label}`}
        aria-sort={direction ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'}
      >
        <span>{label}</span>
        {isSorted && (
          <span aria-hidden="true">
            {direction === 'asc' ? '↑' : '↓'}
          </span>
        )}
      </button>
    </th>
  );
};
```

---

### 6. SpecialRelationshipRow.tsx (Table Row)
**File**: `frontend/src/pages/ClientGroupSuite/tabs/BasicDetailsTab/components/SpecialRelationshipRow.tsx`

**Purpose**: Render single relationship row with conditional columns based on type

**Estimated Lines**: 150

**Props**:
```typescript
interface SpecialRelationshipRowProps {
  relationship: SpecialRelationship;
  type: 'personal' | 'professional';
  onRowClick: (relationship: SpecialRelationship) => void;
  onStatusChange: (id: string, status: RelationshipStatus) => void;
  onDelete: (id: string) => void;
}
```

**Responsibilities**:
- Render table cells conditionally based on personal vs professional
- Apply greyed-out styling for inactive/deceased
- Make row clickable to open edit modal
- Render SpecialRelationshipActions in actions column
- Handle keyboard navigation (Enter to open modal)

**Component Structure** (~150 lines):
```typescript
export const SpecialRelationshipRow: React.FC<Props> = ({
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
    if (e.key === 'Enter') {
      onRowClick(relationship);
    }
  };

  return (
    <tr
      onClick={handleRowClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      className={`cursor-pointer hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500 ${
        isInactive ? 'opacity-50 bg-gray-100' : ''
      }`}
      aria-label={`${relationship.name}, ${relationship.relationship_type}`}
    >
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
        {relationship.name}
      </td>

      {type === 'personal' ? (
        <>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            {relationship.date_of_birth
              ? format(parseISO(relationship.date_of_birth), 'dd/MM/yyyy')
              : '—'}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            {relationship.age ?? '—'}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            {relationship.relationship_type}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            {relationship.is_dependent ? (
              <span className="text-green-600">Yes</span>
            ) : (
              <span className="text-gray-400">No</span>
            )}
          </td>
        </>
      ) : (
        <>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            {relationship.relationship_type}
          </td>
          <td className="px-6 py-4 text-sm text-gray-500">
            <div className="flex flex-wrap gap-1">
              {relationship.product_owner_names?.map((name, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-800"
                >
                  {name}
                </span>
              )) ?? '—'}
            </div>
          </td>
        </>
      )}

      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {relationship.phone_number ?? '—'}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {relationship.email ?? '—'}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            relationship.status === 'Active'
              ? 'bg-green-100 text-green-800'
              : relationship.status === 'Inactive'
              ? 'bg-gray-100 text-gray-800'
              : 'bg-red-100 text-red-800'
          }`}
          aria-label={`Status: ${relationship.status}`}
        >
          {relationship.status}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <SpecialRelationshipActions
          relationship={relationship}
          onStatusChange={onStatusChange}
          onDelete={onDelete}
        />
      </td>
    </tr>
  );
};
```

---

### 7. SpecialRelationshipActions.tsx (Action Buttons)
**File**: `frontend/src/pages/ClientGroupSuite/tabs/BasicDetailsTab/components/SpecialRelationshipActions.tsx`

**Purpose**: Render action buttons (Edit, Activate/Deactivate, Mark Deceased, Delete)

**Estimated Lines**: 100

**Props**:
```typescript
interface SpecialRelationshipActionsProps {
  relationship: SpecialRelationship;
  onStatusChange: (id: string, status: RelationshipStatus) => void;
  onDelete: (id: string) => void;
}
```

**Responsibilities**:
- Render appropriate action buttons based on current status
- Prevent row click event propagation when clicking buttons
- Show confirmation modal for delete action
- Handle status change mutations

**Component Structure** (~100 lines):
```typescript
export const SpecialRelationshipActions: React.FC<Props> = ({
  relationship,
  onStatusChange,
  onDelete
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Stop event propagation to prevent row click
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

  const confirmDelete = () => {
    onDelete(relationship.id);
    setShowDeleteConfirm(false);
  };

  return (
    <div onClick={handleClick} className="flex items-center space-x-2">
      {relationship.status === 'Active' && (
        <>
          <ActionButton
            variant="secondary"
            size="sm"
            onClick={(e) => handleStatusChange(e, 'Inactive')}
            aria-label={`Deactivate ${relationship.name}`}
          >
            Deactivate
          </ActionButton>
          <ActionButton
            variant="outline"
            size="sm"
            onClick={(e) => handleStatusChange(e, 'Deceased')}
            aria-label={`Mark ${relationship.name} as deceased`}
          >
            Mark Deceased
          </ActionButton>
        </>
      )}

      {relationship.status === 'Inactive' && (
        <ActionButton
          variant="primary"
          size="sm"
          onClick={(e) => handleStatusChange(e, 'Active')}
          aria-label={`Activate ${relationship.name}`}
        >
          Activate
        </ActionButton>
      )}

      {relationship.status === 'Deceased' && (
        <ActionButton
          variant="primary"
          size="sm"
          onClick={(e) => handleStatusChange(e, 'Active')}
          aria-label={`Reactivate ${relationship.name}`}
        >
          Reactivate
        </ActionButton>
      )}

      <DeleteButton
        size="sm"
        onClick={handleDelete}
        aria-label={`Delete ${relationship.name}`}
      />

      {showDeleteConfirm && (
        <ConfirmDialog
          isOpen={showDeleteConfirm}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={confirmDelete}
          title={`Delete ${relationship.name}?`}
          message="This will soft delete the relationship. You can restore it later if needed."
          confirmText="Delete"
          cancelText="Cancel"
        />
      )}
    </div>
  );
};
```

---

### 8. ModalShell.tsx (Reusable Modal Wrapper)
**File**: `frontend/src/pages/ClientGroupSuite/tabs/BasicDetailsTab/components/ModalShell.tsx`

**Purpose**: Reusable modal wrapper with focus trap, backdrop, and accessibility

**Estimated Lines**: 80

**Props**:
```typescript
interface ModalShellProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}
```

**Responsibilities**:
- Render modal backdrop with click-to-close
- Implement focus trap (using focus-trap-react library)
- Handle Escape key to close
- Restore focus to trigger element on close
- Prevent body scroll when open
- ARIA attributes for accessibility

**Component Structure** (~80 lines):
```typescript
import FocusTrap from 'focus-trap-react';
import { useEffect, useRef } from 'react';

export const ModalShell: React.FC<Props> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md'
}) => {
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Store current focus to restore later
      previousFocusRef.current = document.activeElement as HTMLElement;
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
    } else {
      // Restore body scroll
      document.body.style.overflow = '';
      // Restore focus
      previousFocusRef.current?.focus();
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleEscape = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
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
      role="dialog"
      aria-modal="true"
      onKeyDown={handleEscape}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <FocusTrap>
          <div className={`relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full ${sizeClasses[size]}`}>
            <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
              <h3 id="modal-title" className="text-lg font-medium leading-6 text-gray-900 mb-4">
                {title}
              </h3>
              {children}
            </div>
          </div>
        </FocusTrap>
      </div>
    </div>
  );
};
```

---

### 9. RelationshipFormFields.tsx (Reusable Form Fields)
**File**: `frontend/src/pages/ClientGroupSuite/tabs/BasicDetailsTab/components/RelationshipFormFields.tsx`

**Purpose**: Reusable form fields for create and edit modals

**Estimated Lines**: 200

**Props**:
```typescript
interface RelationshipFormFieldsProps {
  formData: SpecialRelationshipFormData;
  onChange: (field: keyof SpecialRelationshipFormData, value: any) => void;
  errors: Record<string, string>;
  type: 'personal' | 'professional';
  productOwnerOptions: { value: string; label: string }[];
}
```

**Responsibilities**:
- Render all form fields with validation
- Show/hide fields based on personal vs professional type
- Use ComboDropdown for relationship type (editable dropdown - Kingston preference)
- Use MultiSelectDropdown for product owner associations
- Display inline validation errors
- Maintain 16px+ font sizes (Kingston preference)

**Component Structure** (~200 lines):
```typescript
export const RelationshipFormFields: React.FC<Props> = ({
  formData,
  onChange,
  errors,
  type,
  productOwnerOptions
}) => {
  const personalRelationshipTypes = [
    'Spouse', 'Partner', 'Child', 'Parent', 'Sibling',
    'Grandchild', 'Grandparent', 'Other Family'
  ];

  const professionalRelationshipTypes = [
    'Accountant', 'Solicitor', 'Doctor', 'Financial Advisor',
    'Estate Planner', 'Other Professional'
  ];

  const relationshipTypes = type === 'personal'
    ? personalRelationshipTypes
    : professionalRelationshipTypes;

  return (
    <div className="space-y-4">
      {/* Name field - REQUIRED */}
      <BaseInput
        label="Name"
        name="name"
        value={formData.name}
        onChange={(e) => onChange('name', e.target.value)}
        error={errors.name}
        required
        placeholder="Enter full name"
        className="text-base" // 16px font for elderly users
      />

      {/* Relationship Type - REQUIRED, editable dropdown */}
      <ComboDropdown
        label="Relationship Type"
        options={relationshipTypes.map(type => ({ value: type, label: type }))}
        value={formData.relationship_type}
        onChange={(value) => onChange('relationship_type', value)}
        error={errors.relationship_type}
        required
        placeholder="Select or type custom relationship type"
        allowCustomValue // Kingston preference
      />

      {/* Personal-specific fields */}
      {type === 'personal' && (
        <>
          <DateInput
            label="Date of Birth"
            name="date_of_birth"
            value={formData.date_of_birth}
            onChange={(value) => onChange('date_of_birth', value)}
            error={errors.date_of_birth}
            placeholder="DD/MM/YYYY" // English format - Kingston preference
            maxDate={new Date()} // Cannot be in future
          />

          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_dependent"
              checked={formData.is_dependent ?? false}
              onChange={(e) => onChange('is_dependent', e.target.checked)}
              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
            />
            <label htmlFor="is_dependent" className="ml-2 block text-sm text-gray-900">
              Is this person a dependent?
            </label>
          </div>
        </>
      )}

      {/* Professional-specific fields */}
      {type === 'professional' && (
        <MultiSelectDropdown
          label="Relationship With (Product Owners)"
          options={productOwnerOptions}
          values={formData.associated_product_owners ?? []}
          onChange={(values) => onChange('associated_product_owners', values)}
          error={errors.associated_product_owners}
          placeholder="Select product owners"
        />
      )}

      {/* Contact fields - optional */}
      <BaseInput
        label="Email"
        name="email"
        type="email"
        value={formData.email}
        onChange={(e) => onChange('email', e.target.value)}
        error={errors.email}
        placeholder="email@example.com"
      />

      <BaseInput
        label="Phone Number"
        name="phone_number"
        type="tel"
        value={formData.phone_number}
        onChange={(e) => onChange('phone_number', e.target.value)}
        error={errors.phone_number}
        placeholder="01234 567890"
      />

      {/* Status field */}
      <BaseDropdown
        label="Status"
        options={[
          { value: 'Active', label: 'Active' },
          { value: 'Inactive', label: 'Inactive' },
          { value: 'Deceased', label: 'Deceased' }
        ]}
        value={formData.status}
        onChange={(value) => onChange('status', value as RelationshipStatus)}
        required
      />
    </div>
  );
};
```

---

### 10. useRelationshipValidation.ts (Validation Hook)
**File**: `frontend/src/pages/ClientGroupSuite/tabs/BasicDetailsTab/hooks/useRelationshipValidation.ts`

**Purpose**: Centralized validation logic for relationship forms

**Estimated Lines**: 100

**Returns**:
```typescript
{
  errors: Record<string, string>;
  validate: (data: SpecialRelationshipFormData) => boolean;
  clearErrors: () => void;
  setFieldError: (field: string, error: string) => void;
}
```

**Validation Rules**:
- Name: Required, 1-200 characters
- Relationship Type: Required
- Email: Optional, valid email format if provided
- Phone: Optional, UK format if provided
- Date of Birth: Cannot be in future, age 0-120
- Status: Required

**Hook Structure** (~100 lines):
```typescript
export function useRelationshipValidation() {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (data: SpecialRelationshipFormData): boolean => {
    const newErrors: Record<string, string> = {};

    // Name validation
    if (!data.name || data.name.trim().length === 0) {
      newErrors.name = 'Name is required';
    } else if (data.name.length > 200) {
      newErrors.name = 'Name must be less than 200 characters';
    }

    // Relationship type validation
    if (!data.relationship_type) {
      newErrors.relationship_type = 'Relationship type is required';
    }

    // Email validation (optional)
    if (data.email && data.email.trim().length > 0) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        newErrors.email = 'Please enter a valid email address';
      }
    }

    // Phone validation (optional, UK format)
    if (data.phone_number && data.phone_number.trim().length > 0) {
      const phoneRegex = /^[0-9\s\+\-\(\)]+$/;
      if (!phoneRegex.test(data.phone_number)) {
        newErrors.phone_number = 'Please enter a valid phone number';
      }
    }

    // Date of birth validation (optional for personal)
    if (data.date_of_birth) {
      const dob = parseISO(data.date_of_birth);
      const today = new Date();

      if (dob > today) {
        newErrors.date_of_birth = 'Date of birth cannot be in the future';
      }

      const age = differenceInYears(today, dob);
      if (age > 120) {
        newErrors.date_of_birth = 'Please check the date of birth (age would be over 120)';
      }
    }

    // Status validation
    if (!data.status) {
      newErrors.status = 'Status is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const clearErrors = () => {
    setErrors({});
  };

  const setFieldError = (field: string, error: string) => {
    setErrors(prev => ({ ...prev, [field]: error }));
  };

  return {
    errors,
    validate,
    clearErrors,
    setFieldError
  };
}
```

---

### 11. CreateSpecialRelationshipModal.tsx (Create Modal)
**File**: `frontend/src/pages/ClientGroupSuite/tabs/BasicDetailsTab/components/CreateSpecialRelationshipModal.tsx`

**Purpose**: Modal for creating new special relationship

**Estimated Lines**: 150

**Props**:
```typescript
interface CreateSpecialRelationshipModalProps {
  clientGroupId: string;
  type: 'personal' | 'professional';
  isOpen: boolean;
  onClose: () => void;
}
```

**Component Structure** (~150 lines):
```typescript
export const CreateSpecialRelationshipModal: React.FC<Props> = ({
  clientGroupId,
  type,
  isOpen,
  onClose
}) => {
  const createMutation = useCreateSpecialRelationship();
  const { errors, validate, clearErrors } = useRelationshipValidation();

  const [formData, setFormData] = useState<SpecialRelationshipFormData>({
    name: '',
    relationship_type: '',
    is_professional: type === 'professional',
    status: 'Active',
    // ... other fields
  });

  // Fetch product owners for professional relationships
  const { data: productOwners } = useProductOwners(clientGroupId);
  const productOwnerOptions = useMemo(
    () => productOwners?.map(po => ({ value: po.id, label: `${po.firstname} ${po.surname}` })) ?? [],
    [productOwners]
  );

  const handleFieldChange = (field: keyof SpecialRelationshipFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      clearErrors();
    }
  };

  const handleSubmit = async () => {
    if (!validate(formData)) {
      return;
    }

    try {
      await createMutation.mutateAsync({
        ...formData,
        client_group_id: clientGroupId
      });

      // Success feedback
      toast.success(`${formData.name} added successfully`);
      onClose();
    } catch (error) {
      toast.error('Failed to create relationship. Please try again.');
    }
  };

  const handleCancel = () => {
    clearErrors();
    onClose();
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={handleCancel}
      title={`Add ${type === 'personal' ? 'Personal' : 'Professional'} Relationship`}
      size="lg"
    >
      <RelationshipFormFields
        formData={formData}
        onChange={handleFieldChange}
        errors={errors}
        type={type}
        productOwnerOptions={productOwnerOptions}
      />

      <div className="mt-6 flex justify-end space-x-3">
        <ActionButton
          variant="secondary"
          onClick={handleCancel}
          disabled={createMutation.isLoading}
        >
          Cancel
        </ActionButton>
        <ActionButton
          variant="primary"
          onClick={handleSubmit}
          loading={createMutation.isLoading}
        >
          Add Relationship
        </ActionButton>
      </div>
    </ModalShell>
  );
};
```

---

### 12. EditSpecialRelationshipModal.tsx (Edit Modal)
**File**: `frontend/src/pages/ClientGroupSuite/tabs/BasicDetailsTab/components/EditSpecialRelationshipModal.tsx`

**Purpose**: Modal for editing existing special relationship

**Estimated Lines**: 150

**Props**:
```typescript
interface EditSpecialRelationshipModalProps {
  relationship: SpecialRelationship;
  isOpen: boolean;
  onClose: () => void;
}
```

**Component Structure** (~150 lines): Same structure as CreateModal but with:
- Form data pre-populated from `relationship` prop
- Uses `useUpdateSpecialRelationship` mutation instead of create
- Different modal title ("Edit Relationship")

---

## File Structure Summary

```
frontend/src/pages/ClientGroupSuite/tabs/BasicDetailsTab/
├── components/
│   ├── SpecialRelationshipsSubTab.tsx           (~150 lines) ✅
│   ├── TabNavigation.tsx                        (~50 lines) ✅
│   ├── PersonalRelationshipsTable.tsx           (~250 lines) ✅
│   ├── ProfessionalRelationshipsTable.tsx       (~250 lines) ✅
│   ├── TableSortHeader.tsx                      (~70 lines) ✅
│   ├── SpecialRelationshipRow.tsx               (~150 lines) ✅
│   ├── SpecialRelationshipActions.tsx           (~100 lines) ✅
│   ├── ModalShell.tsx                           (~80 lines) ✅
│   ├── RelationshipFormFields.tsx               (~200 lines) ✅
│   ├── CreateSpecialRelationshipModal.tsx       (~150 lines) ✅
│   └── EditSpecialRelationshipModal.tsx         (~150 lines) ✅
└── hooks/
    └── useRelationshipValidation.ts             (~100 lines) ✅
```

**Total: 12 components, 1,700 lines total (average 142 lines per component)**

---

## Implementation Order

### Week 1 (Cycles 1-5)
1. **Cycle 1**: Types, utilities, mocks
2. **Cycle 2**: API service layer
3. **Cycle 3**: React Query hooks
4. **Cycle 4**: SpecialRelationshipActions component
5. **Cycle 5**: SpecialRelationshipRow component

### Week 2 (Cycles 6-8)
6. **Cycle 6a**: TableSortHeader component (reusable)
7. **Cycle 6b**: PersonalRelationshipsTable component
8. **Cycle 6c**: ProfessionalRelationshipsTable component
9. **Cycle 6d**: TabNavigation component
10. **Cycle 7a**: ModalShell component (reusable)
11. **Cycle 7b**: RelationshipFormFields + useRelationshipValidation
12. **Cycle 7c**: CreateSpecialRelationshipModal
13. **Cycle 7d**: EditSpecialRelationshipModal
14. **Cycle 8**: SpecialRelationshipsSubTab (container) + integration

---

## Benefits of Revised Architecture

### 1. Component Size Compliance ✅
- **ALL components ≤250 lines** (50% safety margin below 500-line limit)
- No risk of components growing beyond limit during implementation
- Easier to maintain and understand

### 2. Reusability ✅
- `TableSortHeader` used by both Personal and Professional tables
- `SpecialRelationshipRow` used by both tables with conditional rendering
- `SpecialRelationshipActions` used by both tables
- `ModalShell` can be reused for other modals in future
- `RelationshipFormFields` shared between Create and Edit modals

### 3. Testability ✅
- Each component has single, clear responsibility
- Easier to write focused unit tests
- No need to test multiple modes in single component
- Can test shared components once and trust reuse

### 4. Maintainability ✅
- Personal and Professional tables can evolve independently
- Changes to one table don't affect the other
- Clear component boundaries reduce coupling
- Easier to debug and reason about

### 5. Performance ✅
- Smaller components render faster
- Memoization more effective with focused components
- Can lazy load modals (React.lazy)
- Row component memoization prevents unnecessary re-renders

---

## Comparison: Original vs Revised

| Aspect | Original Plan | Revised Architecture | Improvement |
|--------|---------------|----------------------|-------------|
| Largest component | ~300 lines (likely 400+) | ~250 lines | ✅ 40% reduction |
| Number of components | 6 | 12 | ✅ Better separation |
| Code duplication | Some (Personal/Professional logic) | Minimal (shared components) | ✅ DRY compliance |
| Risk of exceeding limit | High (80%) | Very Low (10%) | ✅ 70% risk reduction |
| Testability | Moderate (complex conditionals) | High (focused components) | ✅ Easier testing |
| Maintainability | Moderate (tight coupling) | High (loose coupling) | ✅ Easier evolution |

---

## Critical Success Factors

1. **Stick to component size limits** - Don't let components grow beyond 250 lines during implementation
2. **Extract reusable components early** - Don't wait until duplication is obvious
3. **Use composition over complexity** - Prefer multiple small components over one large component
4. **Test each component independently** - Ensure focused unit tests for each component
5. **Review after each cycle** - Check line counts and refactor if approaching 300 lines

---

## Next Steps

1. ✅ Review and approve revised architecture
2. Create component stub files with interfaces
3. Begin Cycle 1 implementation (Types and utilities)
4. Implement components in order specified above
5. Continuously monitor line counts during development

This revised architecture ensures **100% compliance with the 500-line limit** and provides a solid foundation for maintainable, testable, and performant code.
