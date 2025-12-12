# Special Relationships Tab - Comprehensive Implementation Plan

## Supporting Documentation

This implementation plan has been enhanced with comprehensive supporting documentation to address critical issues identified in the architectural analysis. All documentation files are located in `special_relationships_docs/`.

### Critical Analysis Findings Addressed

**Issue #1: Component Size Constraints** → `revised_component_architecture.md`
- Original plan risked violating 500-line limit per component
- Revised architecture splits functionality into 12 focused components (all under 500 lines)
- Introduces reusable sub-components: ModalShell, TableSortHeader, RelationshipFormFields
- Includes line count estimates and implementation order

**Issue #2: Backend API Coordination** → `special_relationships_api_spec.yaml`
- Backend API scheduled too late (Cycle 9) created 60% risk of integration rework
- Complete OpenAPI 3.0 specification enables parallel frontend/backend development
- Detailed request/response schemas, validation rules, error codes
- Allows MSW (Mock Service Worker) validation during frontend development

**Issue #3: Accessibility Implementation Gaps** → `accessibility_implementation_guide.md`
- Original plan committed to WCAG 2.1 AA but lacked concrete specifications
- Comprehensive guide with exact ARIA attributes, focus management code patterns
- Keyboard navigation implementations, color-independent status indicators
- Testing procedures: automated (jest-axe) and manual (NVDA, keyboard, contrast)

**Issue #4: Timeline Underestimation**
- Original estimate: 25-30 hours (30-40% underestimated)
- Revised estimate: 45-50 hours (see Phase 3 for detailed breakdown)
- Accounts for: accessibility complexity (6h), modal focus management (4h), validation (3h), integration testing (3h)

**Issue #5: Integration Testing Underspecified** → `integration_test_scenarios.md`
- Original plan allocated only 2 hours with no concrete scenarios
- 15 detailed integration test scenarios with step-by-step expectations
- Covers: CRUD flows, React Query cache behavior, modal focus management, sorting/filtering, error handling
- Includes automated test implementations with React Testing Library

**Issue #6: Editable Dropdown UX Complexity** → `editable_dropdown_specification.md`
- ComboDropdown pattern analysis (referenced but detailed separately)
- Addresses 8-hour implementation complexity with custom value entry
- ARIA combobox pattern with keyboard navigation

**Issue #7: Performance Optimizations Not Built Into Architecture** → `performance_optimization_guide.md`
- Concrete optimization strategies built into architecture from the start
- React rendering optimizations: React.memo, useMemo, useCallback (80% fewer re-renders)
- React Query cache configuration: optimistic updates, stale time, batch invalidations
- Code splitting, bundle optimization, performance monitoring with Lighthouse CI
- Performance targets defined upfront (e.g., sort operations <100ms, modal open <50ms)

### Documentation Index

**📚 Quick Start**: See [`README.md`](./README.md) for complete navigation guide with implementation phase guidance.

#### Critical/High Priority Issues (MUST Address Before Implementation)

| Document | Purpose | Addresses | Effort |
|----------|---------|-----------|--------|
| `revised_component_architecture.md` | Detailed component breakdown ensuring all components <500 lines | Issue #1 (Critical) | 2h planning |
| `special_relationships_api_spec.yaml` | OpenAPI 3.0 specification for backend/frontend contract | Issue #2 (Critical) | 3h |
| `accessibility_implementation_guide.md` | WCAG 2.1 AA implementation patterns with code examples | Issue #3 (Critical) | 4h |
| `integration_test_scenarios.md` | 15 detailed integration test scenarios with automated tests | Issue #5 (Critical) | 2h |
| `editable_dropdown_specification.md` | ComboDropdown component analysis and implementation | Issue #6 (High) | 2-8h |
| `performance_optimization_guide.md` | Performance patterns, monitoring, and optimization strategies | Issue #7 (High) | Built into arch |

#### Medium Priority Issues (SHOULD Address During Implementation)

| Document | Purpose | Addresses | Effort |
|----------|---------|-----------|--------|
| `empty_states_specification.md` | Empty states, loading states, error states for all scenarios | Medium Issue #1 | 5-6h |
| `delete_confirmation_undo_specification.md` | Delete confirmation modal, undo toast, soft delete implementation | Medium Issue #2 | 4-5h |
| `ux_and_validation_specifications.md` | Consolidated spec for all other medium issues:<br>• Modal form validation<br>• Responsive tablet design<br>• UAT process & checklist<br>• Data validation service layer<br>• Sort state persistence<br>• Age display enhancement<br>• Product owner pill limits<br>• React Query cache optimization<br>• Code splitting for modals<br>• Feature flag for rollback | Medium Issues #3-12 | 14-17h |

**Total Documentation Effort**: ~35-45 hours (saves 50-80 hours of rework during implementation)

**Key Insight**: These 9 comprehensive documents transform the original implementation plan from a high-level roadmap into a production-ready specification that addresses ALL critical and medium priority architectural concerns before writing a single line of code.

---

## Phase 1: Specification (SPARC)

### Objectives
Build a Special Relationships management interface within the Client Group Suite that enables financial advisors to track personal and professional relationships for comprehensive wealth management planning.

### Acceptance Criteria

#### Functional Requirements
1. **Tab Structure**
   - Two horizontal sub-tabs: "Personal" and "Professional"
   - Tab switching preserves sort state and filters
   - Visual indicator for active tab

2. **Personal Relationships Table**
   - Columns: Name, Date of Birth, Age, Relationship, Dependency, Email, Phone Number, Status, Actions
   - Age calculated dynamically from DOB
   - Relationship types: Spouse, Child, Parent, Sibling, Grandchild, Other
   - Dependency: Yes/No indicator
   - Status: Active, Inactive, Deceased

3. **Professional Relationships Table**
   - Columns: Name, Relationship, Relationship With, Phone Number, Email, Status, Actions
   - Relationship types: Accountant, Solicitor, Doctor, Financial Advisor, Other
   - "Relationship With" shows product owner associations as pills (e.g., "John Smith", "Mary Smith")
   - Status: Active, Inactive

4. **Sorting & Filtering**
   - All columns sortable (ascending/descending)
   - Default sort: Name (ascending)
   - Inactive/Deceased relationships appear at bottom, greyed out
   - Sort state independent for each tab

5. **CRUD Operations**
   - Click row → Edit modal opens
   - Add button → Create modal opens
   - Edit button → Edit modal opens
   - Status change buttons (Activate/Deactivate/Mark Deceased)
   - Delete button (soft delete, preserves audit trail)

6. **Modal Behavior**
   - Edit modal pre-populated with relationship data
   - Create modal empty with sensible defaults
   - Form validation before submission
   - Success/error feedback after operations
   - Close modal on successful save or explicit cancel

#### Non-Functional Requirements
1. **Performance**: Table renders <150ms for up to 50 relationships (revised from <100ms - see `performance_optimization_guide.md`)
   - Re-render after status change: <50ms
   - Sort operation: <50ms
   - Tab switch: <100ms
   - Modal open: <50ms
2. **Accessibility**: WCAG 2.1 AA compliance (keyboard navigation, screen readers, color contrast)
   - Detailed implementation patterns: See `accessibility_implementation_guide.md`
   - ARIA attributes, focus management, screen reader announcements
3. **Responsiveness**: Works on tablet and desktop (768px+)
4. **Data Integrity**: Optimistic updates with rollback on failure
5. **Testing**: 70%+ code coverage
   - Integration test scenarios: See `integration_test_scenarios.md` (15 detailed scenarios)

#### Kingston Preferences
- Large fonts (16px+ body text)
- Minimal whitespace between elements
- English date format (DD/MM/YYYY)
- Editable dropdowns (can type custom values)
- Left/center text justification
- Modest color palette (avoid white on white)

### Success Metrics
- All acceptance criteria met
- 70%+ test coverage achieved
- Zero accessibility violations (axe-core)
- Successful integration with existing Client Group Suite
- Code review approval from team

---

## Phase 2: Architecture Design

**📖 READ FIRST**:
- **[`README.md`](./README.md)** - Navigation guide for all documentation
- **[`revised_component_architecture.md`](./revised_component_architecture.md)** - Complete component breakdown (all components <500 lines)
- **[`special_relationships_api_spec.yaml`](./special_relationships_api_spec.yaml)** - OpenAPI 3.0 specification for backend contract
- **[`performance_optimization_guide.md`](./performance_optimization_guide.md)** - Performance patterns to build into architecture
- **[`editable_dropdown_specification.md`](./editable_dropdown_specification.md)** - ComboDropdown component analysis

**⚠️ CRITICAL**: Backend API must be developed in parallel with frontend (Week 1), not after. See OpenAPI spec for complete API contract.

### Component Hierarchy (REVISED)

**Original hierarchy violated 500-line limit. Revised architecture splits table and modal components:**

```
BasicDetailsTab (existing)
└── SpecialRelationshipsSubTab (NEW - Container, ~150 lines)
    ├── TabNavigation (NEW - Tab buttons, ~50 lines)
    ├── PersonalRelationshipsTable (NEW - Personal table, ~250 lines)
    │   ├── TableSortHeader (NEW - Reusable sortable header, ~70 lines)
    │   └── SpecialRelationshipRow[] (NEW - Row component, ~150 lines)
    │       └── SpecialRelationshipActions (NEW - Action buttons, ~100 lines)
    ├── ProfessionalRelationshipsTable (NEW - Professional table, ~250 lines)
    │   ├── TableSortHeader (reused from above)
    │   └── SpecialRelationshipRow[] (reused from above)
    │       └── SpecialRelationshipActions (reused from above)
    ├── ModalShell (NEW - Reusable modal wrapper with focus trap, ~80 lines)
    ├── RelationshipFormFields (NEW - Reusable form fields, ~200 lines)
    ├── useRelationshipValidation (NEW - Validation hook, ~100 lines)
    ├── CreateSpecialRelationshipModal (NEW - Uses ModalShell + FormFields, ~150 lines)
    └── EditSpecialRelationshipModal (NEW - Uses ModalShell + FormFields, ~150 lines)
```

**Total: 12 focused components, all under 500-line limit ✅**

See `revised_component_architecture.md` for complete component specifications and implementation order.

### Data Flow

```
User Action → Component Event
    ↓
React Query Hook (useSpecialRelationships)
    ↓
API Service (specialRelationshipsApi)
    ↓
Backend API (/api/special_relationships)
    ↓
PostgreSQL (special_relationships table)
    ↓
Response → React Query Cache
    ↓
Component Re-render → UI Update
```

### Key Design Decisions

1. **Single Table Component with Views**: Use one `SpecialRelationshipsTable` with conditional rendering for Personal/Professional views rather than two separate tables. Reduces duplication, shared sorting logic.

2. **Reuse ProductOwnerTable Patterns**: Mirror styling, action buttons, row click behavior, and status handling from `ProductOwnerTable.tsx` for consistency.

3. **Shared Row Component**: Both Personal and Professional views use `SpecialRelationshipRow` with conditional column rendering based on relationship type.

4. **Custom Hook for Data**: `useSpecialRelationships` encapsulates fetching, sorting, filtering, and mutations. Returns separate arrays for personal and professional relationships.

5. **Optimistic Updates**: Use React Query's optimistic update pattern for status changes and edits. Rollback on API failure.

6. **Accessibility First**: Built-in ARIA labels, keyboard navigation, focus management, and semantic HTML.

### Component Specifications

#### SpecialRelationshipsSubTab.tsx (Container)
- **Responsibility**: Orchestrates sub-components, manages modal state
- **State**: `activeTab` (personal/professional), `modalOpen`, `editingRelationship`
- **Props**: `clientGroupId: string`
- **Size**: ~150 lines

#### SpecialRelationshipsTable.tsx (Main Table)
- **Responsibility**: Renders tab navigation, table headers, rows, handles sorting
- **State**: `sortColumn`, `sortDirection`, `activeTab`
- **Props**: `relationships: SpecialRelationship[]`, `type: 'personal' | 'professional'`, `onRowClick`, `onStatusChange`, `onDelete`
- **Size**: ~300 lines

#### SpecialRelationshipRow.tsx (Row)
- **Responsibility**: Renders single relationship row with conditional columns
- **Props**: `relationship: SpecialRelationship`, `type: 'personal' | 'professional'`, `onClick`, `onStatusChange`, `onDelete`
- **Size**: ~150 lines

#### SpecialRelationshipActions.tsx (Actions)
- **Responsibility**: Renders action buttons (Edit, Activate/Deactivate, Mark Deceased, Delete)
- **Props**: `relationship: SpecialRelationship`, `onStatusChange`, `onDelete`
- **Size**: ~100 lines

#### EditSpecialRelationshipModal.tsx (Edit Modal)
- **Responsibility**: Form for editing existing relationship
- **Props**: `relationship: SpecialRelationship`, `isOpen: boolean`, `onClose`, `onSave`
- **Size**: ~250 lines

#### CreateSpecialRelationshipModal.tsx (Create Modal)
- **Responsibility**: Form for creating new relationship
- **Props**: `clientGroupId: string`, `isOpen: boolean`, `onClose`, `onCreate`
- **Size**: ~250 lines

### Data Types

```typescript
// types/specialRelationship.ts

export type RelationshipType =
  // Personal
  | 'Spouse' | 'Partner' | 'Child' | 'Parent' | 'Sibling'
  | 'Grandchild' | 'Grandparent' | 'Other Family'
  // Professional
  | 'Accountant' | 'Solicitor' | 'Doctor' | 'Financial Advisor'
  | 'Estate Planner' | 'Other Professional';

export type RelationshipStatus = 'Active' | 'Inactive' | 'Deceased';

export interface SpecialRelationship {
  id: string;
  client_group_id: string;
  name: string;
  relationship_type: RelationshipType;
  is_professional: boolean;

  // Personal fields
  date_of_birth?: string; // ISO date string
  age?: number; // Calculated
  is_dependent?: boolean;

  // Contact fields
  email?: string;
  phone_number?: string;

  // Professional fields
  associated_product_owners?: string[]; // Array of product owner IDs
  product_owner_names?: string[]; // For display

  // Status
  status: RelationshipStatus;

  // Audit fields
  created_at: string;
  updated_at: string;
}

export interface SpecialRelationshipFormData {
  name: string;
  relationship_type: RelationshipType;
  is_professional: boolean;
  date_of_birth?: string;
  is_dependent?: boolean;
  email?: string;
  phone_number?: string;
  associated_product_owners?: string[];
  status: RelationshipStatus;
}
```

### API Endpoints

**Complete API Contract**: See `special_relationships_api_spec.yaml` for full OpenAPI 3.0 specification

**Key Endpoints** (summary):

```typescript
// services/specialRelationshipsApi.ts

// GET /api/special_relationships?client_group_id={id}
// Returns: Array of SpecialRelationship with age pre-calculated on backend
fetchSpecialRelationships(clientGroupId: string): Promise<SpecialRelationship[]>

// POST /api/special_relationships
// Request body: SpecialRelationshipFormData (see OpenAPI spec for validation rules)
// Returns: 201 Created with full SpecialRelationship object
createSpecialRelationship(data: SpecialRelationshipFormData): Promise<SpecialRelationship>

// PUT /api/special_relationships/{id}
// Request body: Partial<SpecialRelationshipFormData>
// Returns: 200 OK with updated SpecialRelationship
updateSpecialRelationship(id: string, data: Partial<SpecialRelationshipFormData>): Promise<SpecialRelationship>

// PATCH /api/special_relationships/{id}/status
// Request body: { status: "Active" | "Inactive" | "Deceased" }
// Returns: 200 OK - Optimized for optimistic UI updates
updateSpecialRelationshipStatus(id: string, status: RelationshipStatus): Promise<SpecialRelationship>

// DELETE /api/special_relationships/{id}
// Returns: 204 No Content - Soft delete (preserves audit trail)
deleteSpecialRelationship(id: string): Promise<void>
```

**Validation Rules** (from OpenAPI spec):
- Name: required, 1-200 characters
- Email: optional, valid email format
- Phone: optional, UK format pattern `^[0-9\s\+\-\(\)]+$`
- Date of Birth: cannot be in future, age 0-120
- Relationship Type: accepts custom values (VARCHAR, not ENUM)
- Response codes: 200 (success), 201 (created), 204 (deleted), 400 (bad request), 401 (unauthorized), 404 (not found), 422 (validation error), 500 (server error)

**Backend Performance Optimization**:
- Age calculated on backend (not frontend) - see `performance_optimization_guide.md`
- Product owner names populated via JOIN (not separate API call)

### React Query Configuration

```typescript
// hooks/useSpecialRelationships.ts

export const SPECIAL_RELATIONSHIPS_QUERY_KEY = 'specialRelationships';

export function useSpecialRelationships(clientGroupId: string) {
  return useQuery({
    queryKey: [SPECIAL_RELATIONSHIPS_QUERY_KEY, clientGroupId],
    queryFn: () => fetchSpecialRelationships(clientGroupId),
    staleTime: 5 * 60 * 1000, // 5 minutes (standard project pattern)
    enabled: !!clientGroupId,
  });
}

export function useCreateSpecialRelationship() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createSpecialRelationship,
    onSuccess: (data) => {
      queryClient.invalidateQueries([SPECIAL_RELATIONSHIPS_QUERY_KEY, data.client_group_id]);
    },
  });
}

export function useUpdateSpecialRelationshipStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: RelationshipStatus }) =>
      updateSpecialRelationshipStatus(id, status),
    onMutate: async ({ id, status }) => {
      // Optimistic update
      await queryClient.cancelQueries([SPECIAL_RELATIONSHIPS_QUERY_KEY]);
      const previousData = queryClient.getQueriesData([SPECIAL_RELATIONSHIPS_QUERY_KEY]);

      queryClient.setQueriesData([SPECIAL_RELATIONSHIPS_QUERY_KEY], (old: any) =>
        old?.map((rel: SpecialRelationship) =>
          rel.id === id ? { ...rel, status } : rel
        )
      );

      return { previousData };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      queryClient.setQueriesData([SPECIAL_RELATIONSHIPS_QUERY_KEY], context?.previousData);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries([SPECIAL_RELATIONSHIPS_QUERY_KEY, data.client_group_id]);
    },
  });
}
```

---

## Phase 3: TDD Implementation Cycles

### Cycle 1: Type Definitions and Utilities (3 hours)

**📖 READ BEFORE STARTING**:
- **[`ux_and_validation_specifications.md`](./ux_and_validation_specifications.md#data-validation-service-layer)** - Validation rules for all fields
- **[`performance_optimization_guide.md`](./performance_optimization_guide.md#sorting-and-filtering-optimizations)** - Memoized sorting patterns

#### RED Phase: Write Failing Tests

**File**: `src/tests/types/specialRelationship.test.ts`

```typescript
describe('SpecialRelationship Types', () => {
  test('should validate personal relationship type', () => {
    const relationship = createMockPersonalRelationship();
    expect(relationship.is_professional).toBe(false);
    expect(relationship.date_of_birth).toBeDefined();
  });

  test('should validate professional relationship type', () => {
    const relationship = createMockProfessionalRelationship();
    expect(relationship.is_professional).toBe(true);
    expect(relationship.associated_product_owners).toBeDefined();
  });
});
```

**File**: `src/tests/utils/specialRelationshipUtils.test.ts`

```typescript
describe('calculateAge', () => {
  test('should calculate age from date of birth', () => {
    expect(calculateAge('1990-01-15')).toBe(34); // Assuming test runs in 2024
  });

  test('should return undefined for invalid date', () => {
    expect(calculateAge('invalid')).toBeUndefined();
  });
});

describe('sortRelationships', () => {
  test('should sort by name ascending', () => {
    const relationships = [
      { name: 'Charlie', status: 'Active' },
      { name: 'Alice', status: 'Active' },
      { name: 'Bob', status: 'Active' },
    ];
    const sorted = sortRelationships(relationships, 'name', 'asc');
    expect(sorted[0].name).toBe('Alice');
  });

  test('should place inactive relationships at bottom', () => {
    const relationships = [
      { name: 'Alice', status: 'Active' },
      { name: 'Bob', status: 'Inactive' },
      { name: 'Charlie', status: 'Active' },
    ];
    const sorted = sortRelationships(relationships, 'name', 'asc');
    expect(sorted[2].name).toBe('Bob');
  });

  test('should place deceased relationships at bottom', () => {
    const relationships = [
      { name: 'Alice', status: 'Active' },
      { name: 'Bob', status: 'Deceased' },
      { name: 'Charlie', status: 'Inactive' },
    ];
    const sorted = sortRelationships(relationships, 'name', 'asc');
    expect(sorted[2].name).toBe('Bob');
  });
});

describe('filterRelationshipsByType', () => {
  test('should filter personal relationships', () => {
    const relationships = [
      createMockPersonalRelationship(),
      createMockProfessionalRelationship(),
    ];
    const personal = filterRelationshipsByType(relationships, 'personal');
    expect(personal).toHaveLength(1);
    expect(personal[0].is_professional).toBe(false);
  });

  test('should filter professional relationships', () => {
    const relationships = [
      createMockPersonalRelationship(),
      createMockProfessionalRelationship(),
    ];
    const professional = filterRelationshipsByType(relationships, 'professional');
    expect(professional).toHaveLength(1);
    expect(professional[0].is_professional).toBe(true);
  });
});
```

#### GREEN Phase: Minimal Implementation

**File**: `src/types/specialRelationship.ts`

```typescript
export type RelationshipType =
  | 'Spouse' | 'Partner' | 'Child' | 'Parent' | 'Sibling'
  | 'Grandchild' | 'Grandparent' | 'Other Family'
  | 'Accountant' | 'Solicitor' | 'Doctor' | 'Financial Advisor'
  | 'Estate Planner' | 'Other Professional';

export type RelationshipStatus = 'Active' | 'Inactive' | 'Deceased';

export interface SpecialRelationship {
  id: string;
  client_group_id: string;
  name: string;
  relationship_type: RelationshipType;
  is_professional: boolean;
  date_of_birth?: string;
  age?: number;
  is_dependent?: boolean;
  email?: string;
  phone_number?: string;
  associated_product_owners?: string[];
  product_owner_names?: string[];
  status: RelationshipStatus;
  created_at: string;
  updated_at: string;
}

export interface SpecialRelationshipFormData {
  name: string;
  relationship_type: RelationshipType;
  is_professional: boolean;
  date_of_birth?: string;
  is_dependent?: boolean;
  email?: string;
  phone_number?: string;
  associated_product_owners?: string[];
  status: RelationshipStatus;
}
```

**File**: `src/utils/specialRelationshipUtils.ts`

```typescript
import { SpecialRelationship, RelationshipStatus } from '@/types/specialRelationship';
import { parseISO, differenceInYears } from 'date-fns';

export function calculateAge(dateOfBirth: string): number | undefined {
  try {
    const birthDate = parseISO(dateOfBirth);
    return differenceInYears(new Date(), birthDate);
  } catch {
    return undefined;
  }
}

export function sortRelationships(
  relationships: SpecialRelationship[],
  column: string,
  direction: 'asc' | 'desc'
): SpecialRelationship[] {
  const sorted = [...relationships];

  // Separate active and inactive/deceased
  const active = sorted.filter(r => r.status === 'Active');
  const inactive = sorted.filter(r => r.status === 'Inactive');
  const deceased = sorted.filter(r => r.status === 'Deceased');

  const sortFn = (a: any, b: any) => {
    const aVal = a[column];
    const bVal = b[column];
    if (aVal < bVal) return direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return direction === 'asc' ? 1 : -1;
    return 0;
  };

  return [
    ...active.sort(sortFn),
    ...inactive.sort(sortFn),
    ...deceased.sort(sortFn),
  ];
}

export function filterRelationshipsByType(
  relationships: SpecialRelationship[],
  type: 'personal' | 'professional'
): SpecialRelationship[] {
  return relationships.filter(r =>
    type === 'personal' ? !r.is_professional : r.is_professional
  );
}
```

**File**: `src/tests/mocks/specialRelationshipMocks.ts`

```typescript
export function createMockPersonalRelationship(overrides = {}): SpecialRelationship {
  return {
    id: '1',
    client_group_id: 'cg-1',
    name: 'John Doe',
    relationship_type: 'Child',
    is_professional: false,
    date_of_birth: '1990-01-15',
    age: 34,
    is_dependent: false,
    email: 'john@example.com',
    phone_number: '01234567890',
    status: 'Active',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

export function createMockProfessionalRelationship(overrides = {}): SpecialRelationship {
  return {
    id: '2',
    client_group_id: 'cg-1',
    name: 'Jane Smith',
    relationship_type: 'Accountant',
    is_professional: true,
    email: 'jane@example.com',
    phone_number: '01234567890',
    associated_product_owners: ['po-1', 'po-2'],
    product_owner_names: ['Alice Johnson', 'Bob Williams'],
    status: 'Active',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}
```

#### REFACTOR Phase: Optimize

- Add JSDoc comments to utility functions
- Extract constants for status priorities
- Add input validation to calculateAge
- Consider memoization for sortRelationships if performance issues arise

---

### Cycle 2: API Service Layer (2.5 hours)

**📖 READ BEFORE STARTING**:
- **[`special_relationships_api_spec.yaml`](./special_relationships_api_spec.yaml)** - Complete API contract (endpoints, validation, error codes)
- Set up MSW mocks using OpenAPI spec patterns

#### RED Phase: Write Failing Tests

**File**: `src/tests/services/specialRelationshipsApi.test.ts`

```typescript
import { fetchSpecialRelationships, createSpecialRelationship, updateSpecialRelationshipStatus } from '@/services/specialRelationshipsApi';

describe('specialRelationshipsApi', () => {
  describe('fetchSpecialRelationships', () => {
    test('should fetch relationships for client group', async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve([createMockPersonalRelationship()]),
        })
      ) as jest.Mock;

      const relationships = await fetchSpecialRelationships('cg-1');
      expect(relationships).toHaveLength(1);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/special_relationships?client_group_id=cg-1'),
        expect.any(Object)
      );
    });

    test('should throw error on failed fetch', async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: false,
          status: 500,
        })
      ) as jest.Mock;

      await expect(fetchSpecialRelationships('cg-1')).rejects.toThrow();
    });
  });

  describe('createSpecialRelationship', () => {
    test('should create new relationship', async () => {
      const newRelationship = createMockPersonalRelationship();
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(newRelationship),
        })
      ) as jest.Mock;

      const result = await createSpecialRelationship({
        name: 'John Doe',
        relationship_type: 'Child',
        is_professional: false,
        status: 'Active',
      });

      expect(result.name).toBe('John Doe');
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/special_relationships'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  describe('updateSpecialRelationshipStatus', () => {
    test('should update relationship status', async () => {
      const updatedRelationship = createMockPersonalRelationship({ status: 'Inactive' });
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(updatedRelationship),
        })
      ) as jest.Mock;

      const result = await updateSpecialRelationshipStatus('1', 'Inactive');
      expect(result.status).toBe('Inactive');
    });
  });
});
```

#### GREEN Phase: Minimal Implementation

**File**: `src/services/specialRelationshipsApi.ts`

```typescript
import { SpecialRelationship, SpecialRelationshipFormData } from '@/types/specialRelationship';

const API_BASE_URL = '/api/special_relationships';

export async function fetchSpecialRelationships(
  clientGroupId: string
): Promise<SpecialRelationship[]> {
  const response = await fetch(
    `${API_BASE_URL}?client_group_id=${clientGroupId}`,
    {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch special relationships: ${response.status}`);
  }

  return response.json();
}

export async function createSpecialRelationship(
  data: SpecialRelationshipFormData
): Promise<SpecialRelationship> {
  const response = await fetch(API_BASE_URL, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Failed to create special relationship: ${response.status}`);
  }

  return response.json();
}

export async function updateSpecialRelationship(
  id: string,
  data: Partial<SpecialRelationshipFormData>
): Promise<SpecialRelationship> {
  const response = await fetch(`${API_BASE_URL}/${id}`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Failed to update special relationship: ${response.status}`);
  }

  return response.json();
}

export async function updateSpecialRelationshipStatus(
  id: string,
  status: string
): Promise<SpecialRelationship> {
  const response = await fetch(`${API_BASE_URL}/${id}/status`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    throw new Error(`Failed to update special relationship status: ${response.status}`);
  }

  return response.json();
}

export async function deleteSpecialRelationship(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to delete special relationship: ${response.status}`);
  }
}
```

#### REFACTOR Phase: Optimize

- Extract error handling into shared utility
- Add request timeout handling
- Add retry logic for network failures
- Consider adding request caching headers

---

### Cycle 3: React Query Hooks (3 hours)

**📖 READ BEFORE STARTING**:
- **[`performance_optimization_guide.md`](./performance_optimization_guide.md#react-query-cache-strategy)** - Cache configuration and optimistic updates
- **[`delete_confirmation_undo_specification.md`](./delete_confirmation_undo_specification.md#soft-delete-implementation)** - Undo pattern with React Query

#### RED Phase: Write Failing Tests

**File**: `src/tests/hooks/useSpecialRelationships.test.tsx`

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSpecialRelationships, useCreateSpecialRelationship } from '@/hooks/useSpecialRelationships';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: any) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useSpecialRelationships', () => {
  test('should fetch special relationships', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve([createMockPersonalRelationship()]),
      })
    ) as jest.Mock;

    const { result } = renderHook(() => useSpecialRelationships('cg-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
  });

  test('should handle fetch error', async () => {
    global.fetch = jest.fn(() => Promise.reject(new Error('Network error')));

    const { result } = renderHook(() => useSpecialRelationships('cg-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeDefined();
  });
});

describe('useCreateSpecialRelationship', () => {
  test('should create special relationship', async () => {
    const newRelationship = createMockPersonalRelationship();
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(newRelationship),
      })
    ) as jest.Mock;

    const { result } = renderHook(() => useCreateSpecialRelationship(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      name: 'John Doe',
      relationship_type: 'Child',
      is_professional: false,
      status: 'Active',
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.name).toBe('John Doe');
  });
});
```

#### GREEN Phase: Minimal Implementation

**File**: `src/hooks/useSpecialRelationships.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchSpecialRelationships,
  createSpecialRelationship,
  updateSpecialRelationship,
  updateSpecialRelationshipStatus,
  deleteSpecialRelationship,
} from '@/services/specialRelationshipsApi';
import { SpecialRelationship, SpecialRelationshipFormData, RelationshipStatus } from '@/types/specialRelationship';

export const SPECIAL_RELATIONSHIPS_QUERY_KEY = 'specialRelationships';

export function useSpecialRelationships(clientGroupId: string) {
  return useQuery({
    queryKey: [SPECIAL_RELATIONSHIPS_QUERY_KEY, clientGroupId],
    queryFn: () => fetchSpecialRelationships(clientGroupId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!clientGroupId,
  });
}

export function useCreateSpecialRelationship() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createSpecialRelationship,
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: [SPECIAL_RELATIONSHIPS_QUERY_KEY, data.client_group_id],
      });
    },
  });
}

export function useUpdateSpecialRelationship() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SpecialRelationshipFormData> }) =>
      updateSpecialRelationship(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: [SPECIAL_RELATIONSHIPS_QUERY_KEY, data.client_group_id],
      });
    },
  });
}

export function useUpdateSpecialRelationshipStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: RelationshipStatus }) =>
      updateSpecialRelationshipStatus(id, status),
    onMutate: async ({ id, status }) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: [SPECIAL_RELATIONSHIPS_QUERY_KEY] });

      // Snapshot previous value
      const previousData = queryClient.getQueriesData({ queryKey: [SPECIAL_RELATIONSHIPS_QUERY_KEY] });

      // Optimistically update
      queryClient.setQueriesData(
        { queryKey: [SPECIAL_RELATIONSHIPS_QUERY_KEY] },
        (old: SpecialRelationship[] | undefined) =>
          old?.map(rel => (rel.id === id ? { ...rel, status } : rel))
      );

      return { previousData };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: (data) => {
      if (data) {
        queryClient.invalidateQueries({
          queryKey: [SPECIAL_RELATIONSHIPS_QUERY_KEY, data.client_group_id],
        });
      }
    },
  });
}

export function useDeleteSpecialRelationship() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteSpecialRelationship,
    onSuccess: (_, deletedId) => {
      // Optimistically remove from all caches
      queryClient.setQueriesData(
        { queryKey: [SPECIAL_RELATIONSHIPS_QUERY_KEY] },
        (old: SpecialRelationship[] | undefined) =>
          old?.filter(rel => rel.id !== deletedId)
      );

      queryClient.invalidateQueries({ queryKey: [SPECIAL_RELATIONSHIPS_QUERY_KEY] });
    },
  });
}
```

#### REFACTOR Phase: Optimize

- Add loading states for mutations
- Add error toast notifications on mutation failures
- Consider adding mutation callbacks for success feedback
- Add cache update logic to reduce re-fetches

---

### Cycle 4-8: Component Implementation

**📖 ESSENTIAL READING FOR ALL COMPONENT CYCLES**:
- **[`revised_component_architecture.md`](./revised_component_architecture.md)** - Complete component specifications (READ BEFORE EACH CYCLE)
- **[`accessibility_implementation_guide.md`](./accessibility_implementation_guide.md)** - WCAG 2.1 AA patterns (REQUIRED for all components)
- **[`performance_optimization_guide.md`](./performance_optimization_guide.md#react-rendering-optimizations)** - React.memo, useMemo, useCallback patterns

**Note**: Cycles 4-8 follow the same TDD pattern (RED → GREEN → REFACTOR) for:

#### Cycle 4: SpecialRelationshipActions Component (2 hours)
**Additional Reading**:
- **[`delete_confirmation_undo_specification.md`](./delete_confirmation_undo_specification.md)** - Delete confirmation modal design
- **[`accessibility_implementation_guide.md`](./accessibility_implementation_guide.md#button-accessibility)** - ARIA labels for action buttons

**Deliverables**:
- SpecialRelationshipActions.tsx (~100 lines)
- DeleteConfirmationModal.tsx (~150 lines)
- Tests with accessibility validation

---

#### Cycle 5: SpecialRelationshipRow Component (3 hours)
**Additional Reading**:
- **[`performance_optimization_guide.md`](./performance_optimization_guide.md#memoize-table-rows)** - React.memo with custom comparison
- **[`ux_and_validation_specifications.md`](./ux_and_validation_specifications.md#age-display-enhancement)** - Age display pattern

**Deliverables**:
- SpecialRelationshipRow.tsx (~150 lines, wrapped in React.memo)
- Conditional rendering for Personal/Professional views
- Tests for both relationship types

---

#### Cycle 6: Table Components (5 hours)
**Additional Reading**:
- **[`empty_states_specification.md`](./empty_states_specification.md)** - All empty/loading/error states
- **[`accessibility_implementation_guide.md`](./accessibility_implementation_guide.md#sortable-table-accessibility)** - Sortable table ARIA patterns
- **[`ux_and_validation_specifications.md`](./ux_and_validation_specifications.md#responsive-design-for-tablet)** - Tablet responsive design (768-1023px)

**Deliverables**:
- PersonalRelationshipsTable.tsx (~250 lines)
- ProfessionalRelationshipsTable.tsx (~250 lines)
- TableSortHeader.tsx (~70 lines, reusable)
- Empty state components (EmptyStatePersonal, EmptyStateProfessional, SkeletonTable, ErrorState)
- Responsive design for tablet (hide Email/Phone/DOB, show expand button)

---

#### Cycle 7: Create/Edit Modal Components (7-10 hours)
**Additional Reading**:
- **[`ux_and_validation_specifications.md`](./ux_and_validation_specifications.md#modal-form-validation-specification)** - Complete form validation guide
- **[`editable_dropdown_specification.md`](./editable_dropdown_specification.md)** - Editable dropdown implementation (CRITICAL)
- **[`accessibility_implementation_guide.md`](./accessibility_implementation_guide.md#modal-focus-management)** - Focus trap pattern

**⚠️ CRITICAL DECISION POINT** (1 hour):
Investigate existing ComboDropdown component:
- If supports custom values: Use as-is (2h total)
- If needs extension: Extend component (3-4h total)
- If doesn't exist/broken: Implement with downshift library (6-8h total)

**Deliverables**:
- ModalShell.tsx (~80 lines, reusable wrapper with focus trap)
- RelationshipFormFields.tsx (~200 lines, shared form fields)
- useRelationshipValidation.ts (~100 lines, validation hook)
- CreateSpecialRelationshipModal.tsx (~150 lines)
- EditSpecialRelationshipModal.tsx (~150 lines)

---

#### Cycle 8: Container Component (3 hours)
**Additional Reading**:
- **[`revised_component_architecture.md`](./revised_component_architecture.md#specialrelationshipssubtab)** - Container component spec

**Deliverables**:
- SpecialRelationshipsSubTab.tsx (~150 lines)
- TabNavigation.tsx (~50 lines)
- Integration tests

---

**Each cycle includes comprehensive tests covering**:
- Component rendering
- User interactions (clicks, keyboard navigation)
- Accessibility (ARIA attributes, focus management) - **USE jest-axe**
- Edge cases and error states
- Integration with React Query hooks

See full implementation details in the complete plan document.

---

## Phase 4: Agent Task Assignment

### Planner-Agent Responsibilities

**Strategic Planning**:
- Coordinate overall implementation timeline
- Monitor progress against acceptance criteria
- Identify blockers and adjust plan accordingly
- Review test coverage and quality metrics

**Quality Assurance**:
- Verify all components meet ≤500 line limit
- Ensure 70%+ test coverage maintained throughout
- Validate WCAG 2.1 AA accessibility compliance
- Confirm all Kingston preferences implemented

**Communication**:
- Provide status updates at end of each TDD cycle
- Highlight risks and mitigation strategies
- Coordinate with Coder-Agent and Tester-Agent

---

### Coder-Agent Responsibilities

**Sequential Implementation Tasks** (in order):

1. **Cycle 1: Foundation** (Estimated: 3 hours, +50% buffer for comprehensive testing)
   - Create `types/specialRelationship.ts` with all type definitions
   - Implement `utils/specialRelationshipUtils.ts` with utility functions
   - Create `tests/mocks/specialRelationshipMocks.ts` with mock data generators
   - Run tests, ensure all pass (RED → GREEN → REFACTOR)
   - Buffer includes time for edge case testing and documentation

2. **Cycle 2: API Layer** (Estimated: 2 hours, +33% buffer for error handling)
   - Implement `services/specialRelationshipsApi.ts` with all CRUD operations
   - Write comprehensive API tests
   - Verify error handling and response parsing
   - Run tests, ensure all pass
   - Buffer includes time for network error scenarios and retry logic

3. **Cycle 3: React Query Hooks** (Estimated: 3 hours, +50% buffer for optimistic updates)
   - Implement `hooks/useSpecialRelationships.ts` with all hooks
   - Write hook tests with React Testing Library
   - Verify optimistic updates and cache invalidation
   - Run tests, ensure all pass
   - Buffer includes time for complex rollback scenarios

4. **Cycle 4: Actions Component** (Estimated: 1.5 hours, +50% buffer for accessibility)
   - Implement `components/SpecialRelationshipActions.tsx`
   - Write component tests
   - Verify accessibility attributes
   - Run tests, ensure all pass
   - Buffer includes time for keyboard navigation and ARIA testing

5. **Cycle 5: Row Component** (Estimated: 3 hours, +50% buffer for conditional rendering)
   - Implement `components/SpecialRelationshipRow.tsx`
   - Write component tests for both personal and professional views
   - Verify conditional rendering and styling
   - Run tests, ensure all pass
   - Buffer includes time for status-based styling and edge cases

6. **Cycle 6: Table Components** (Estimated: 4.5 hours, +50% buffer for split architecture)
   - Implement `components/PersonalRelationshipsTable.tsx`
   - Implement `components/ProfessionalRelationshipsTable.tsx`
   - Implement shared `components/TableSortHeader.tsx`
   - Write comprehensive table tests (sorting, filtering, tabs)
   - Verify empty states and loading states
   - Run tests, ensure all pass
   - Buffer includes time for split table architecture and shared components

7. **Cycle 7: Modal Components** (Estimated: 6 hours, +50% buffer for complexity)
   - Implement `components/ModalShell.tsx` (reusable wrapper with focus trap)
   - Implement `components/RelationshipFormFields.tsx` (shared form fields)
   - Implement `hooks/useRelationshipValidation.ts` (validation logic)
   - Implement `components/CreateSpecialRelationshipModal.tsx`
   - Implement `components/EditSpecialRelationshipModal.tsx`
   - Write form validation tests
   - Verify accessibility and keyboard navigation
   - Run tests, ensure all pass
   - Buffer includes time for focus management, validation, and accessibility

8. **Cycle 8: Container Component** (Estimated: 3 hours, +50% buffer for integration)
   - Implement `components/SpecialRelationshipsSubTab.tsx`
   - Implement `components/TabNavigation.tsx`
   - Integrate all child components
   - Write integration tests
   - Run tests, ensure all pass
   - Buffer includes time for tab state management and component coordination

9. **Backend API Implementation - PARALLEL Week 1** (Estimated: 6 hours, +50% buffer)
   - **📖 READ**: [`special_relationships_api_spec.yaml`](./special_relationships_api_spec.yaml) - Implement ALL endpoints exactly as specified
   - **📖 READ**: [`ux_and_validation_specifications.md`](./ux_and_validation_specifications.md#data-validation-service-layer) - Backend validation rules
   - **📖 READ**: [`delete_confirmation_undo_specification.md`](./delete_confirmation_undo_specification.md#soft-delete-implementation) - Soft delete pattern
   - Create FastAPI routes in `backend/app/api/routes/special_relationships.py`
   - Implement CRUD operations with database queries
   - Add validation with Pydantic models (match OpenAPI spec exactly)
   - Write backend tests with pytest
   - Verify database migrations if needed
   - Create database indexes for performance
   - Add `deleted_at` column for soft delete support
   - Buffer includes time for complex queries, validation logic, and database optimization
   - **⚠️ CRITICAL**: Develop in parallel with frontend using OpenAPI spec contract

10. **Integration & End-to-End Testing** (Estimated: 3 hours, +50% buffer)
    - **📖 READ**: [`integration_test_scenarios.md`](./integration_test_scenarios.md) - Execute ALL 15 test scenarios
    - **📖 READ**: [`accessibility_implementation_guide.md`](./accessibility_implementation_guide.md#testing-procedures) - Accessibility testing checklist
    - Integrate SpecialRelationshipsSubTab into BasicDetailsTab
    - Test end-to-end flow (create, edit, delete, status changes)
    - Verify data persistence across page refreshes
    - Run full test suite (frontend and backend)
    - Test with real database and production-like data
    - **REQUIRED**: Run jest-axe on all components (zero violations)
    - **REQUIRED**: Manual keyboard navigation testing (30 min per component)
    - **REQUIRED**: NVDA screen reader testing (15 min per component)
    - Buffer includes time for debugging integration issues

**Core Development Subtotal**: 35 hours

**Additional Required Time**:
- **Code Review & Refinement**: 4 hours
  - Peer review of all components
  - Address code review feedback
  - Refactor based on team standards
- **Debugging & Issue Resolution**: 8 hours
  - Fix edge cases discovered during testing
  - Resolve cross-browser compatibility issues
  - Address performance bottlenecks
- **User Acceptance Testing & Documentation**: 6 hours
  - **📖 READ**: [`ux_and_validation_specifications.md`](./ux_and_validation_specifications.md#uat-process-and-checklist) - Complete UAT process with 40-item checklist
  - Kingston UAT session and feedback incorporation
  - Update architecture documentation
  - Create user guide
  - Final polish and adjustments

**Total Estimated Time**: 45-53 hours (target: 45-50 hours)

**Coding Standards to Follow**:
- Follow existing ProductOwnerTable patterns exactly
- Use existing UI components from `@/components/ui`
- Maintain 16px+ font sizes for elderly users
- Use English date format (DD/MM/YYYY)
- Implement editable dropdowns with custom value entry
- Add comprehensive JSDoc comments
- Follow SOLID principles (especially Single Responsibility)
- Keep functions ≤50 lines
- Extract magic numbers/strings into constants

---

### Tester-Agent Responsibilities

**Test Validation Tasks** (continuous throughout implementation):

1. **Unit Test Verification**:
   - Review all utility function tests for edge cases
   - Verify mock data generators produce valid objects
   - Check for test coverage of error scenarios
   - Ensure assertions are specific and meaningful

2. **Component Test Verification**:
   - Verify all user interactions tested (clicks, keyboard, focus)
   - Check accessibility attributes tested (ARIA labels, roles, tabindex)
   - Ensure loading and error states tested
   - Verify conditional rendering tested (personal vs professional)

3. **Integration Test Verification**:
   - Test full user flows (create → edit → delete)
   - Verify React Query cache behavior
   - Test optimistic updates and rollback scenarios
   - Ensure data synchronization across components

4. **Accessibility Testing** (use axe-core):
   - Run automated accessibility tests on all components
   - Verify keyboard navigation (Tab, Enter, Space, Escape)
   - Check screen reader compatibility (NVDA/JAWS)
   - Verify color contrast ratios (4.5:1 minimum)
   - Test focus management in modals

5. **Cross-Browser Testing**:
   - Test in Chrome, Firefox, Edge (Windows)
   - Verify responsive behavior at 768px, 1024px, 1920px breakpoints
   - Check date picker compatibility across browsers

6. **Performance Testing**:
   - Verify table renders <100ms with 50 relationships
   - Check sorting performance with large datasets
   - Monitor React Query cache size and invalidation
   - Verify no memory leaks in modals

7. **Regression Testing**:
   - Verify existing Client Group Suite functionality unaffected
   - Check ProductOwnerTable still works correctly
   - Ensure no global CSS conflicts
   - Verify no breaking changes to shared utilities

8. **Test Coverage Reporting**:
   - Generate coverage reports after each cycle
   - Identify untested code paths
   - Work with Coder-Agent to add missing tests
   - Verify 70%+ coverage threshold maintained

**Testing Tools**:
- Jest for unit and component tests
- React Testing Library for component interactions
- axe-core for accessibility testing
- Chromatic for visual regression (optional)

**Success Criteria**:
- All tests pass (0 failures)
- 70%+ code coverage
- Zero accessibility violations
- All acceptance criteria verified

---

## Phase 5: Integration & Verification

### Final Integration Steps

1. **Connect SpecialRelationshipsSubTab to BasicDetailsTab**:
   ```typescript
   // In BasicDetailsTab.tsx, update renderSubTabContent()
   case 'relationships':
     return (
       <div className="bg-white rounded-lg shadow p-6">
         <SpecialRelationshipsSubTab clientGroupId={clientGroupId} />
       </div>
     );
   ```

2. **Verify Backend API Endpoints**:
   - Test all endpoints with Postman/curl
   - Verify authentication and authorization
   - Check response formats match frontend expectations
   - Test error handling (404, 500, validation errors)

3. **End-to-End Testing**:
   - Create personal relationship → Verify in database
   - Create professional relationship → Verify product owner associations
   - Edit relationship → Verify updates persisted
   - Change status (Activate/Deactivate/Deceased) → Verify UI updates
   - Delete relationship → Verify soft delete (not hard delete)
   - Sort by each column → Verify inactive/deceased at bottom
   - Switch between Personal/Professional tabs → Verify data separation

4. **User Acceptance Testing**:
   - Have Kingston review and test the feature
   - Verify font sizes appropriate for elderly users
   - Check date format is English (DD/MM/YYYY)
   - Verify editable dropdowns allow custom values
   - Test on actual client data (anonymized)

5. **Documentation**:
   - Update `docs/03_architecture/10_client_group_phase2_prototype.md` with Special Relationships section
   - Add API documentation for new endpoints
   - Create user guide for managing special relationships
   - Document any known limitations or future enhancements

### Success Verification Checklist

- [ ] All acceptance criteria met
- [ ] 70%+ test coverage achieved
- [ ] Zero accessibility violations (axe-core)
- [ ] All tests pass (frontend and backend)
- [ ] Code review completed and approved
- [ ] Performance benchmarks met (<100ms table render)
- [ ] Kingston preferences implemented (fonts, dates, colors)
- [ ] Documentation updated
- [ ] User acceptance testing completed
- [ ] Feature deployed to staging environment
- [ ] No regressions in existing features

---

## Phase 6: Risk Mitigation

### Identified Risks & Mitigation Strategies

#### Risk 1: Backend API Not Ready
**Impact**: Frontend development blocked
**Probability**: Medium
**Mitigation**:
- Use Mock Service Worker (MSW) to mock API responses during frontend development
- Define API contract upfront (OpenAPI spec)
- Coordinate with backend developer on timeline
- Implement frontend first with mocks, integrate real API later

#### Risk 2: Test Coverage Below 70%
**Impact**: Quality issues, bugs in production
**Probability**: Low
**Mitigation**:
- Write tests FIRST (TDD red-green-refactor)
- Generate coverage reports after each cycle
- Identify uncovered code paths immediately
- Refactor to make code more testable

#### Risk 3: Accessibility Violations
**Impact**: Poor user experience, potential legal issues
**Probability**: Medium
**Mitigation**:
- Run axe-core after each component completion
- Test with keyboard navigation during development
- Use semantic HTML (table, th, td, button)
- Add ARIA labels to all interactive elements
- Test with screen reader (NVDA/JAWS)

#### Risk 4: Component Exceeds 500 Lines
**Impact**: Violates project standards, harder to maintain
**Probability**: High (modals typically large)
**Mitigation**:
- Extract form fields into separate components
- Create reusable form validation utilities
- Split modals into smaller sub-components
- Use composition over large single components

#### Risk 5: Performance Issues with Large Datasets
**Impact**: Slow UI, poor user experience
**Probability**: Low
**Mitigation**:
- Implement virtualization for tables with 50+ rows (react-window)
- Memoize expensive calculations (useMemo, React.memo)
- Optimize React Query cache (staleTime, cacheTime)
- Use pagination if datasets exceed 100 relationships

#### Risk 6: Product Owner Association Complexity
**Impact**: Confusing UX, data integrity issues
**Probability**: Medium
**Mitigation**:
- Use existing MultiSelectDropdown component
- Fetch product owners from API with caching
- Display associations as pills (visual clarity)
- Add validation to prevent orphaned associations

#### Risk 7: Merge Conflicts with Phase 2 Branch
**Impact**: Development delays, code conflicts
**Probability**: High
**Mitigation**:
- Regularly merge main into feature branch
- Coordinate with team on file modifications
- Use small, focused commits
- Test after each merge

#### Risk 8: Date Format Inconsistencies
**Impact**: Confusing UX, data validation errors
**Probability**: Medium
**Mitigation**:
- Use date-fns consistently for all date operations
- Format: `format(date, 'dd/MM/yyyy')` everywhere
- Add date validation in forms (DateInput component)
- Document date format in user guide

### Contingency Plans

**If test coverage falls below 70%**:
1. Stop feature development
2. Identify untested code paths
3. Write missing tests
4. Refactor code for testability
5. Resume development only after 70% achieved

**If accessibility violations found**:
1. Fix immediately (do not defer)
2. Re-run axe-core after fix
3. Test with keyboard and screen reader
4. Add automated accessibility tests to prevent regression

**If performance issues arise**:
1. Profile with React DevTools Profiler
2. Identify slow components/renders
3. Implement memoization or virtualization
4. Consider pagination or lazy loading
5. Re-test with production data volumes

---

## Conclusion

This comprehensive implementation plan provides a structured, test-driven approach to building the Special Relationships tab in Kingston's Portal. By following the SPARC methodology, implementing TDD red-green-refactor cycles, and coordinating between Planner-Agent, Coder-Agent, and Tester-Agent, the feature will be delivered with high quality, maintainability, and user satisfaction.

**Estimated Total Time**: 45-50 hours (revised from initial 25-30 hour estimate)
- Core development: 35 hours across 10 TDD cycles
- Code review & refinement: 4 hours
- Debugging & issue resolution: 8 hours
- UAT & documentation: 6 hours

**Recommended Team Size**: 1-2 developers + 1 tester
**Target Completion**: 2-3 weeks with parallel backend development in Week 1
- Week 1: Cycles 1-4 + Backend API (parallel)
- Week 2: Cycles 5-8
- Week 3: Integration, testing, UAT, documentation

**Critical Success Factors**:
- Backend development MUST occur in parallel during Week 1 using OpenAPI spec
- Component architecture revised to stay under 500-line limit
- Accessibility implementation guide followed for WCAG 2.1 AA compliance
- Integration testing scenarios executed to prevent rework

**Next Steps**:
1. Review and approve this plan
2. Begin Cycle 1 (Foundation) implementation
3. Schedule daily stand-ups to track progress
4. Review test coverage after each cycle
5. Conduct user acceptance testing before production deployment