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

### Agent Collaboration Workflow

**How to Use Sub-Agents During TDD**:

Each TDD cycle follows the **RED → GREEN → REFACTOR** pattern with specific agent assignments:

```
┌─────────────────────────────────────────────────────────────┐
│ CYCLE START: Planner-Agent Reviews Acceptance Criteria      │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ RED PHASE: Tester-Agent Writes Failing Tests                │
│ • Invoke: Tester-Agent                                      │
│ • Task: Write comprehensive test suite (unit + integration) │
│ • Output: Test files that fail (no implementation yet)      │
│ • Verify: Tests run and fail for the right reasons          │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ GREEN PHASE: Coder-Agent Implements Minimal Code            │
│ • Invoke: Coder-Agent                                       │
│ • Task: Write minimal code to make tests pass               │
│ • Input: Test suite from Tester-Agent                       │
│ • Output: Implementation that passes all tests              │
│ • Verify: All tests pass (npm test)                         │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ REFACTOR PHASE: Coder-Agent Optimizes Code                  │
│ • Invoke: Coder-Agent                                       │
│ • Task: Refactor for clarity, performance, maintainability  │
│ • Constraint: All tests must still pass                     │
│ • Output: Optimized code with same behavior                 │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ VERIFY PHASE: Tester-Agent Validates Quality                │
│ • Invoke: Tester-Agent                                      │
│ • Task: Run all tests, check coverage, verify accessibility │
│ • Checks: 70%+ coverage, zero axe violations, all tests pass│
│ • Output: Quality report with pass/fail                     │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ CYCLE END: Planner-Agent Reviews Completion                 │
│ • Updates todo list (mark cycle complete)                   │
│ • Verifies acceptance criteria met                          │
│ • Identifies any blockers or issues                         │
│ • Proceeds to next cycle or addresses issues                │
└─────────────────────────────────────────────────────────────┘
```

### Agent Invocation Examples

**Starting a Cycle** (Planner-Agent):
```typescript
// You (as Planner-Agent) start the cycle
- Review cycle acceptance criteria
- Update todo list: Set current cycle to "in_progress"
- Invoke Tester-Agent for RED phase
```

**RED Phase** (Tester-Agent):
```
Use Task tool:
- subagent_type: "Tester-Agent"
- prompt: "Write comprehensive test suite for Cycle 1 (Type Definitions and Utilities).

  Requirements:
  - Create tests for SpecialRelationship types (personal and professional)
  - Create tests for utility functions (calculateAge, sortRelationships, filterRelationshipsByType)
  - Create mock data generators for testing
  - Tests should FAIL initially (no implementation yet)
  - Follow TDD red-green-refactor pattern
  - Ensure tests cover edge cases (null values, invalid dates, empty arrays)

  Test files to create:
  - src/tests/types/specialRelationship.test.ts
  - src/tests/utils/specialRelationshipUtils.test.ts
  - src/tests/mocks/specialRelationshipMocks.ts

  Expected output: Test files that run and fail with clear error messages."
```

**GREEN Phase** (Coder-Agent):
```
Use Task tool:
- subagent_type: "coder-agent"
- prompt: "Implement minimal code to pass tests from Cycle 1 (Type Definitions and Utilities).

  Context:
  - Tests have been written by Tester-Agent (see test files in src/tests/)
  - All tests currently fail
  - Need to implement types and utility functions

  Requirements:
  - Create src/types/specialRelationship.ts with all type definitions
  - Create src/utils/specialRelationshipUtils.ts with utility functions
  - Write MINIMAL code to make tests pass (no premature optimization)
  - Follow existing code patterns in the codebase
  - Ensure all tests pass (run npm test)

  Reference documentation:
  - See special_relationships_docs/ux_and_validation_specifications.md for validation rules
  - See special_relationships_docs/performance_optimization_guide.md for sorting patterns

  Expected output: Implementation files that make all tests pass."
```

**REFACTOR Phase** (Coder-Agent):
```
Use Task tool:
- subagent_type: "coder-agent"
- prompt: "Refactor Cycle 1 implementation for code quality while keeping all tests passing.

  Current state:
  - Tests pass with minimal implementation
  - Code may have duplication or lack clarity

  Refactoring tasks:
  - Add JSDoc comments to all exported functions
  - Extract magic numbers/strings to constants
  - Improve variable names for clarity
  - Consider performance optimizations (memoization if needed)
  - Ensure functions are <50 lines each

  Constraints:
  - ALL tests must still pass after refactoring
  - Do not change function signatures (breaks tests)
  - Follow project coding standards from CLAUDE.md

  Expected output: Refactored code with all tests still passing."
```

**VERIFY Phase** (Tester-Agent):
```
Use Task tool:
- subagent_type: "Tester-Agent"
- prompt: "Verify Cycle 1 completion and quality metrics.

  Verification checklist:
  - [ ] Run full test suite (npm test) - all tests pass?
  - [ ] Check code coverage (npm run test:coverage) - ≥70%?
  - [ ] Run build (npm run build) - no TypeScript errors?
  - [ ] Check file sizes - all files <500 lines?
  - [ ] Review code quality - follows coding standards?

  If any checks fail:
  - Document specific failures
  - Recommend fixes
  - Do NOT proceed to next cycle

  If all checks pass:
  - Mark cycle as complete
  - Provide summary report

  Expected output: Quality report with pass/fail for each check."
```

---

### Cycle 1: Type Definitions and Utilities (3 hours)

**📖 READ BEFORE STARTING**:
- **[`ux_and_validation_specifications.md`](./ux_and_validation_specifications.md#data-validation-service-layer)** - Validation rules for all fields
- **[`performance_optimization_guide.md`](./performance_optimization_guide.md#sorting-and-filtering-optimizations)** - Memoized sorting patterns

---

#### 🔴 RED Phase: Write Failing Tests (Tester-Agent)

**🤖 INVOKE TESTER-AGENT**:
```
Use Task tool with:
- subagent_type: "Tester-Agent"
- description: "Write failing tests for Cycle 1"
- prompt: "Write comprehensive test suite for Special Relationships Type Definitions and Utilities (Cycle 1).

CONTEXT:
- This is Cycle 1 of TDD implementation for Special Relationships feature
- No implementation exists yet - tests should fail
- Follow red-green-refactor TDD pattern

REQUIREMENTS:
1. Create test file: src/tests/types/specialRelationship.test.ts
   - Test SpecialRelationship interface structure
   - Test personal vs professional relationship type validation
   - Test required vs optional fields

2. Create test file: src/tests/utils/specialRelationshipUtils.test.ts
   - Test calculateAge() function (valid dates, invalid dates, edge cases)
   - Test sortRelationships() function (ascending, descending, status-based sorting)
   - Test filterRelationshipsByType() function (personal vs professional filtering)
   - Test edge cases: null values, empty arrays, invalid data

3. Create test file: src/tests/mocks/specialRelationshipMocks.ts
   - Mock data generator: createMockPersonalRelationship()
   - Mock data generator: createMockProfessionalRelationship()
   - Generators should accept overrides parameter

DOCUMENTATION REFERENCES:
- See special_relationships_docs/ux_and_validation_specifications.md for validation rules
- See special_relationships_docs/revised_component_architecture.md for type definitions

TEST REQUIREMENTS:
- All tests must FAIL initially (no implementation yet)
- Tests must have clear, descriptive names
- Tests must cover happy path AND edge cases
- Use Jest and React Testing Library
- Follow existing test patterns in frontend/src/tests/

EXPECTED OUTPUT:
- 3 test files created
- Tests run with 'npm test' and ALL FAIL
- Failure messages clearly indicate what implementation is missing

ACCEPTANCE CRITERIA:
- Minimum 15 test cases across all files
- Tests fail for the RIGHT reasons (missing implementation, not syntax errors)
- Test code follows project standards (see CLAUDE.md)"
```

**Expected Result**: Test files created, all tests fail with clear error messages

---

#### 🟢 GREEN Phase: Minimal Implementation (Coder-Agent)

**🤖 INVOKE CODER-AGENT**:
```
Use Task tool with:
- subagent_type: "coder-agent"
- description: "Implement code for Cycle 1"
- prompt: "Implement minimal code to pass all tests for Special Relationships Type Definitions and Utilities (Cycle 1).

CONTEXT:
- Tester-Agent has written comprehensive tests
- All tests currently fail
- Need to implement types and utility functions with MINIMAL code

REQUIREMENTS:
1. Create file: frontend/src/types/specialRelationship.ts
   - Export RelationshipType union type (all personal and professional types)
   - Export RelationshipStatus union type (Active, Inactive, Deceased)
   - Export SpecialRelationship interface (all fields from spec)
   - Export SpecialRelationshipFormData interface

2. Create file: frontend/src/utils/specialRelationshipUtils.ts
   - Implement calculateAge(dateOfBirth: string): number | undefined
     • Use date-fns library (parseISO, differenceInYears)
     • Handle invalid dates gracefully

   - Implement sortRelationships(relationships, column, direction)
     • Sort active relationships first, then inactive, then deceased
     • Apply column sort within each group
     • Use stable sort (preserve order for equal elements)

   - Implement filterRelationshipsByType(relationships, type)
     • Filter by is_professional flag
     • Return filtered array

3. Update imports in test mock file to use new types

CODE QUALITY:
- Write MINIMAL code to pass tests (no premature optimization)
- Follow existing code patterns in codebase
- Use TypeScript strict mode
- Add basic JSDoc comments
- Functions should be <50 lines

CONSTRAINTS:
- Do NOT add features not required by tests
- Do NOT optimize prematurely
- Ensure ALL tests pass

RUN TESTS:
- Execute 'npm test' from frontend directory
- All tests must pass before completing

EXPECTED OUTPUT:
- 2 implementation files created
- All tests pass (npm test shows 0 failures)
- No TypeScript errors (npm run build succeeds)"
```

**Expected Result**: Implementation complete, all tests pass

---

#### 🔵 REFACTOR Phase: Optimize Code (Coder-Agent)

**🤖 INVOKE CODER-AGENT**:
```
Use Task tool with:
- subagent_type: "coder-agent"
- description: "Refactor Cycle 1 code"
- prompt: "Refactor Special Relationships Type Definitions and Utilities (Cycle 1) for code quality while keeping all tests passing.

CURRENT STATE:
- Implementation exists and all tests pass
- Code may have duplication, unclear naming, or lack documentation
- Need to improve quality without changing behavior

REFACTORING TASKS:
1. Code Clarity:
   - Improve variable and function names
   - Add comprehensive JSDoc comments to all exported functions
   - Add inline comments for complex logic

2. Extract Constants:
   - Extract magic numbers/strings to named constants
   - Example: Status values → STATUS_ACTIVE, STATUS_INACTIVE, STATUS_DECEASED
   - Example: Relationship types → RELATIONSHIP_TYPES_PERSONAL, RELATIONSHIP_TYPES_PROFESSIONAL

3. Performance Optimization (if applicable):
   - Consider memoization for sortRelationships if called frequently
   - Optimize date calculations if needed
   - Refer to performance_optimization_guide.md

4. Code Standards:
   - Ensure functions are <50 lines each
   - Follow SOLID principles (especially Single Responsibility)
   - Remove any code duplication

CONSTRAINTS:
- ALL tests must STILL PASS after refactoring
- Do NOT change function signatures (will break tests)
- Do NOT add new features
- Follow project coding standards from CLAUDE.md

VERIFICATION:
- Run 'npm test' after each refactoring step
- Run 'npm run build' to check TypeScript errors
- Ensure test coverage remains ≥70%

EXPECTED OUTPUT:
- Refactored code with improved readability
- All tests still pass
- Code follows project standards"
```

**Expected Result**: Refactored code, all tests still pass

---

#### ✅ VERIFY Phase: Quality Check (Tester-Agent)

**🤖 INVOKE TESTER-AGENT**:
```
Use Task tool with:
- subagent_type: "Tester-Agent"
- description: "Verify Cycle 1 completion"
- prompt: "Verify Cycle 1 (Type Definitions and Utilities) is complete and meets all quality standards.

VERIFICATION CHECKLIST:

1. Test Execution:
   - [ ] Run 'npm test' from frontend directory
   - [ ] All tests pass (0 failures)?
   - [ ] No skipped tests?

2. Code Coverage:
   - [ ] Run 'npm run test:coverage'
   - [ ] Overall coverage ≥70%?
   - [ ] Types file coverage ≥90%?
   - [ ] Utils file coverage ≥90%?

3. Build Verification:
   - [ ] Run 'npm run build'
   - [ ] No TypeScript errors?
   - [ ] No ESLint errors?

4. File Size Check:
   - [ ] specialRelationship.ts <500 lines?
   - [ ] specialRelationshipUtils.ts <500 lines?

5. Code Quality:
   - [ ] All functions <50 lines?
   - [ ] JSDoc comments present?
   - [ ] No TODO/FIXME comments?
   - [ ] Follows coding standards from CLAUDE.md?

6. Test Quality:
   - [ ] Tests have descriptive names?
   - [ ] Tests cover edge cases?
   - [ ] Minimum 15 test cases?

FAILURE HANDLING:
If ANY check fails:
- Document specific failure
- Provide detailed recommendation for fix
- Do NOT mark cycle as complete
- Do NOT proceed to next cycle

SUCCESS CRITERIA:
If ALL checks pass:
- Mark cycle as COMPLETE
- Provide summary report
- Ready to proceed to Cycle 2

EXPECTED OUTPUT:
- Quality report with pass/fail for each checklist item
- If failures: specific recommendations
- If success: approval to proceed to next cycle"
```

**Expected Result**: Quality report confirming cycle completion or identifying issues

---

**Example Test**: `src/tests/types/specialRelationship.test.ts`

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

---

#### 🔴 RED Phase: Write Failing Tests (Tester-Agent)

**Agent Invocation**:

Use Task tool with:
- **subagent_type**: `"Tester-Agent"`
- **description**: `"Write failing tests for Cycle 2"`
- **prompt**: `"Write comprehensive test suite for Special Relationships API Service Layer (Cycle 2).

CONTEXT:
- This is Cycle 2 of TDD implementation for Special Relationships feature
- Cycle 1 (Types and Utilities) is complete
- No API service implementation exists yet - tests should fail
- Follow red-green-refactor TDD pattern
- Reference the OpenAPI spec: special_relationships_api_spec.yaml

REQUIREMENTS:
1. Create test file: frontend/src/tests/services/specialRelationshipsApi.test.ts
2. Test all API functions based on OpenAPI spec:
   - fetchSpecialRelationships(clientGroupId)
   - createSpecialRelationship(data)
   - updateSpecialRelationship(id, data)
   - updateSpecialRelationshipStatus(id, status)
   - deleteSpecialRelationship(id)
3. Test error scenarios:
   - Network failures (500 errors)
   - Validation errors (400 errors)
   - Unauthorized errors (401 errors)
   - Not found errors (404 errors)
4. Mock fetch API using jest.fn()
5. Verify correct HTTP methods, headers, and request bodies

CONSTRAINTS:
- Tests must FAIL because services/specialRelationshipsApi.ts does not exist
- Use mocks from src/tests/mocks/specialRelationshipMocks.ts (created in Cycle 1)
- Include credentials: 'include' for all fetch calls (cookie auth)
- Verify Content-Type: application/json headers

EXPECTED OUTPUT:
- 1 test file created with ~15-20 test cases
- Tests run with 'npm test' and ALL FAIL with clear error messages
- Failure messages indicate missing API service file
- Test coverage for all CRUD operations and error scenarios

ACCEPTANCE CRITERIA:
- ✅ Minimum 15 test cases covering all API functions
- ✅ Tests fail for the RIGHT reasons (missing implementation)
- ✅ No syntax errors or import issues
- ✅ Clear assertion messages for debugging"
`

---

#### 🟢 GREEN Phase: Implement Minimal Code (Coder-Agent)

**Agent Invocation**:

Use Task tool with:
- **subagent_type**: `"coder-agent"`
- **description**: `"Implement API service for Cycle 2"`
- **prompt**: `"Implement minimal API service code to pass all tests for Cycle 2 (Special Relationships API Service Layer).

CONTEXT:
- Cycle 1 (Types and Utilities) is complete
- Tests from RED phase are failing
- This is the GREEN phase - write MINIMAL code to pass tests
- Reference OpenAPI spec: special_relationships_api_spec.yaml

REQUIREMENTS:
1. Create file: frontend/src/services/specialRelationshipsApi.ts
2. Implement all API functions to match OpenAPI spec:
   - fetchSpecialRelationships(clientGroupId): GET /api/special_relationships?client_group_id={id}
   - createSpecialRelationship(data): POST /api/special_relationships
   - updateSpecialRelationship(id, data): PUT /api/special_relationships/{id}
   - updateSpecialRelationshipStatus(id, status): PATCH /api/special_relationships/{id}/status
   - deleteSpecialRelationship(id): DELETE /api/special_relationships/{id}
3. Use TypeScript types from src/types/specialRelationship.ts
4. Include proper error handling with throw statements
5. Use credentials: 'include' for all fetch calls
6. Set Content-Type: application/json headers

CODE QUALITY:
- Write MINIMAL code to pass tests (no premature optimization)
- Each function should be <50 lines
- Use async/await pattern
- Clear error messages with HTTP status codes
- No hardcoded values - use const API_BASE_URL

FILE SIZE CHECK:
- Target file size: ~100-150 lines
- Must be <500 lines (component size limit)

RUN TESTS:
- Execute 'npm test specialRelationshipsApi' from frontend directory
- All tests must pass before completing
- If tests fail, debug and fix until all pass

ACCEPTANCE CRITERIA:
- ✅ All API functions implemented and working
- ✅ All tests passing (0 failures)
- ✅ Proper TypeScript typing
- ✅ Error handling for all HTTP error codes
- ✅ File size <500 lines"
`

---

#### 🔵 REFACTOR Phase: Optimize Code (Coder-Agent)

**Agent Invocation**:

Use Task tool with:
- **subagent_type**: `"coder-agent"`
- **description**: `"Refactor API service for Cycle 2"`
- **prompt**: `"Refactor Special Relationships API Service Layer code (Cycle 2) while maintaining all passing tests.

CONTEXT:
- GREEN phase is complete - all tests passing
- Now optimize code quality, maintainability, and performance
- Follow Kingston's Portal coding standards from CLAUDE.md

REFACTORING TASKS:
1. **Error Handling**:
   - Extract common error handling into shared utility function
   - Add specific error types for different HTTP status codes
   - Include response body in error messages when available

2. **Code Organization**:
   - Extract API_BASE_URL to constants if not already done
   - Add JSDoc comments for all exported functions
   - Ensure consistent parameter naming

3. **Performance**:
   - Consider adding request timeout handling (AbortController)
   - Add proper TypeScript return type annotations
   - Ensure fetch options are properly typed

4. **Standards Compliance**:
   - Verify SOLID principles (single responsibility per function)
   - Check DRY - eliminate any duplication
   - Ensure file is <500 lines (should be ~100-150)
   - Each function <50 lines

5. **Future-Proofing**:
   - Add TODO comments for retry logic (defer to later cycle)
   - Add TODO for request caching headers (defer to later cycle)
   - Document any OpenAPI spec deviations

CONSTRAINTS:
- ALL tests must STILL PASS after refactoring
- Do NOT add new features or functionality
- Do NOT change function signatures (breaking change)
- Keep file size minimal (<200 lines after refactoring)

RUN TESTS:
- Execute 'npm test specialRelationshipsApi' after each refactoring change
- Verify 0 failures before moving to next refactoring task

ACCEPTANCE CRITERIA:
- ✅ All tests still passing
- ✅ Code follows DRY principle
- ✅ JSDoc comments added
- ✅ Error handling extracted to utility
- ✅ File remains <500 lines"
`

---

#### ✅ VERIFY Phase: Quality Check (Tester-Agent)

**Agent Invocation**:

Use Task tool with:
- **subagent_type**: `"Tester-Agent"`
- **description**: `"Verify Cycle 2 completion"`
- **prompt**: `"Verify Cycle 2 (API Service Layer) is complete and meets all quality standards before proceeding to Cycle 3.

CONTEXT:
- Cycle 2: API Service Layer implementation
- Files created: src/services/specialRelationshipsApi.ts
- Tests created: src/tests/services/specialRelationshipsApi.test.ts

VERIFICATION CHECKLIST:

1. **Test Execution**:
   - Run: npm test specialRelationshipsApi
   - Expected: 0 failures, 15+ passing tests
   - Check: Coverage ≥70% for specialRelationshipsApi.ts

2. **Code Coverage**:
   - Run: npm test -- --coverage --collectCoverageFrom='src/services/specialRelationshipsApi.ts'
   - Verify all functions covered (fetch, create, update, updateStatus, delete)
   - Check edge cases tested (errors, network failures)

3. **Build Verification**:
   - Run: npm run build
   - Expected: No TypeScript errors
   - Check: No eslint errors in API service file

4. **File Size Check**:
   - Verify: src/services/specialRelationshipsApi.ts <500 lines (target: ~100-150 lines)
   - Check: No single function >50 lines

5. **Code Quality**:
   - Verify: All functions have JSDoc comments
   - Check: Error handling properly implemented
   - Verify: No hardcoded URLs or magic strings
   - Check: Proper TypeScript types used

6. **API Contract Compliance**:
   - Compare implementation against special_relationships_api_spec.yaml
   - Verify: All endpoints match OpenAPI spec
   - Check: Request/response types align with spec
   - Verify: Error codes match spec (400, 401, 404, 500)

7. **Test Quality**:
   - Verify: Tests cover all CRUD operations
   - Check: Error scenarios tested
   - Verify: Mock data uses Cycle 1 utilities
   - Check: Clear assertion messages

FAILURE HANDLING:
If ANY check fails:
- Document the specific failure with line numbers
- Create a numbered list of issues found
- Do NOT proceed to Cycle 3
- Return detailed failure report

SUCCESS CRITERIA:
- ✅ All tests passing (0 failures)
- ✅ Code coverage ≥70%
- ✅ Build succeeds with no errors
- ✅ File size <500 lines
- ✅ All functions <50 lines
- ✅ API contract matches OpenAPI spec
- ✅ 15+ test cases implemented

EXPECTED OUTPUT:
Provide a summary report with:
- Test results (pass/fail counts)
- Coverage percentage
- File size metrics
- List of verified quality checks
- GO/NO-GO decision for Cycle 3"
`

---

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

---

#### 🔴 RED Phase: Write Failing Tests (Tester-Agent)

**Agent Invocation**:

Use Task tool with:
- **subagent_type**: `"Tester-Agent"`
- **description**: `"Write failing tests for Cycle 3"`
- **prompt**: `"Write comprehensive test suite for React Query Hooks (Cycle 3).

CONTEXT:
- This is Cycle 3 of TDD implementation for Special Relationships feature
- Cycle 1 (Types and Utilities) is complete
- Cycle 2 (API Service Layer) is complete
- No React Query hooks implementation exists yet - tests should fail
- Follow red-green-refactor TDD pattern
- Reference performance_optimization_guide.md for React Query best practices

REQUIREMENTS:
1. Create test file: frontend/src/tests/hooks/useSpecialRelationships.test.tsx
2. Test all React Query hooks:
   - useSpecialRelationships(clientGroupId) - query hook
   - useCreateSpecialRelationship() - mutation hook
   - useUpdateSpecialRelationship() - mutation hook
   - useUpdateSpecialRelationshipStatus() - mutation hook
   - useDeleteSpecialRelationship() - mutation hook with undo
3. Test React Query features:
   - Cache invalidation after mutations
   - Optimistic updates for create/update/delete
   - Rollback on mutation failure
   - Loading and error states
   - Query key management
4. Use @testing-library/react-hooks for testing
5. Create QueryClient wrapper for tests
6. Mock API service functions from Cycle 2

CONSTRAINTS:
- Tests must FAIL because hooks/useSpecialRelationships.ts does not exist
- Use mocks from src/tests/mocks/specialRelationshipMocks.ts (Cycle 1)
- Mock services from src/services/specialRelationshipsApi.ts (Cycle 2)
- Test optimistic update patterns from delete_confirmation_undo_specification.md
- Verify cache invalidation using queryClient.invalidateQueries

EXPECTED OUTPUT:
- 1 test file created with ~20-25 test cases
- Tests run with 'npm test' and ALL FAIL with clear error messages
- Failure messages indicate missing hooks file
- Test coverage for all hooks and React Query patterns

ACCEPTANCE CRITERIA:
- ✅ Minimum 20 test cases covering all hooks
- ✅ Tests fail for the RIGHT reasons (missing implementation)
- ✅ No syntax errors or import issues
- ✅ Clear assertion messages for debugging
- ✅ QueryClient properly set up in test wrapper"
`

---

#### 🟢 GREEN Phase: Implement Minimal Code (Coder-Agent)

**Agent Invocation**:

Use Task tool with:
- **subagent_type**: `"coder-agent"`
- **description**: `"Implement React Query hooks for Cycle 3"`
- **prompt**: `"Implement minimal React Query hooks code to pass all tests for Cycle 3.

CONTEXT:
- Cycle 1 (Types and Utilities) is complete
- Cycle 2 (API Service Layer) is complete
- Tests from RED phase are failing
- This is the GREEN phase - write MINIMAL code to pass tests
- Reference performance_optimization_guide.md for cache strategy

REQUIREMENTS:
1. Create file: frontend/src/hooks/useSpecialRelationships.ts
2. Implement query hook:
   - useSpecialRelationships(clientGroupId)
   - staleTime: 5 minutes
   - gcTime: 10 minutes
   - refetchOnWindowFocus: false
3. Implement mutation hooks:
   - useCreateSpecialRelationship() with optimistic update
   - useUpdateSpecialRelationship() with optimistic update
   - useUpdateSpecialRelationshipStatus() with optimistic update
   - useDeleteSpecialRelationship() with undo capability (5-second window)
4. Implement cache invalidation:
   - Invalidate queries after successful mutations
   - Use query keys: ['specialRelationships', clientGroupId]
5. Import API functions from services/specialRelationshipsApi.ts (Cycle 2)
6. Import types from types/specialRelationship.ts (Cycle 1)

CODE QUALITY:
- Write MINIMAL code to pass tests (no premature optimization)
- Each hook should be <50 lines
- Use React Query best practices (staleTime, gcTime, onSuccess, onError)
- Clear error handling with rollback on failure
- Export query key factory for reuse

FILE SIZE CHECK:
- Target file size: ~200-250 lines
- Must be <500 lines (component size limit)

OPTIMISTIC UPDATE PATTERN:
For delete with undo (from delete_confirmation_undo_specification.md):
1. onMutate: Save previous data, update cache optimistically
2. onError: Rollback using saved data
3. onSettled: Invalidate queries
4. Return undo function that calls updateStatus('Active')

RUN TESTS:
- Execute 'npm test useSpecialRelationships' from frontend directory
- All tests must pass before completing
- If tests fail, debug and fix until all pass

ACCEPTANCE CRITERIA:
- ✅ All hooks implemented and working
- ✅ All tests passing (0 failures)
- ✅ Proper TypeScript typing
- ✅ Optimistic updates with rollback
- ✅ Cache invalidation working
- ✅ File size <500 lines"
`

---

#### 🔵 REFACTOR Phase: Optimize Code (Coder-Agent)

**Agent Invocation**:

Use Task tool with:
- **subagent_type**: `"coder-agent"`
- **description**: `"Refactor React Query hooks for Cycle 3"`
- **prompt**: `"Refactor React Query Hooks code (Cycle 3) while maintaining all passing tests.

CONTEXT:
- GREEN phase is complete - all tests passing
- Now optimize code quality, maintainability, and performance
- Follow Kingston's Portal coding standards from CLAUDE.md
- Reference performance_optimization_guide.md for React Query optimizations

REFACTORING TASKS:
1. **Query Key Management**:
   - Extract query keys into factory object
   - Example: specialRelationshipsKeys.byClientGroup(id)
   - Export keys for external use (cache invalidation from other components)

2. **Code Organization**:
   - Add JSDoc comments for all exported hooks
   - Group related hooks together (queries, then mutations)
   - Extract common onSuccess/onError handlers

3. **Performance**:
   - Verify staleTime and gcTime settings match spec (5min, 10min)
   - Ensure optimistic updates are properly typed
   - Verify cache invalidation is specific (not invalidating too much)

4. **Standards Compliance**:
   - Verify SOLID principles (single responsibility per hook)
   - Check DRY - eliminate any duplication in mutation hooks
   - Ensure file is <500 lines (target: ~200-250)
   - Each hook <50 lines

5. **Error Handling**:
   - Consistent error messages across all mutations
   - Ensure rollback works for all optimistic updates
   - Add toast notifications for mutation success/failure (import from components/ui)

6. **Undo Pattern**:
   - Refactor delete undo to be reusable
   - Ensure 5-second undo window is configurable
   - Verify undo cancels pending deletion

CONSTRAINTS:
- ALL tests must STILL PASS after refactoring
- Do NOT add new features or functionality
- Do NOT change hook signatures (breaking change)
- Keep file size minimal (<300 lines after refactoring)

RUN TESTS:
- Execute 'npm test useSpecialRelationships' after each refactoring change
- Verify 0 failures before moving to next refactoring task

ACCEPTANCE CRITERIA:
- ✅ All tests still passing
- ✅ Query keys extracted to factory
- ✅ JSDoc comments added
- ✅ Optimistic updates optimized
- ✅ Error handling consistent
- ✅ File remains <500 lines"
`

---

#### ✅ VERIFY Phase: Quality Check (Tester-Agent)

**Agent Invocation**:

Use Task tool with:
- **subagent_type**: `"Tester-Agent"`
- **description**: `"Verify Cycle 3 completion"`
- **prompt**: `"Verify Cycle 3 (React Query Hooks) is complete and meets all quality standards before proceeding to Cycle 4.

CONTEXT:
- Cycle 3: React Query Hooks implementation
- Files created: src/hooks/useSpecialRelationships.ts
- Tests created: src/tests/hooks/useSpecialRelationships.test.tsx

VERIFICATION CHECKLIST:

1. **Test Execution**:
   - Run: npm test useSpecialRelationships
   - Expected: 0 failures, 20+ passing tests
   - Check: Coverage ≥70% for useSpecialRelationships.ts

2. **Code Coverage**:
   - Run: npm test -- --coverage --collectCoverageFrom='src/hooks/useSpecialRelationships.ts'
   - Verify all hooks covered (query + 4 mutations)
   - Check edge cases tested (optimistic updates, rollback, undo)

3. **Build Verification**:
   - Run: npm run build
   - Expected: No TypeScript errors
   - Check: No eslint errors in hooks file

4. **File Size Check**:
   - Verify: src/hooks/useSpecialRelationships.ts <500 lines (target: ~200-250 lines)
   - Check: No single hook >50 lines

5. **Code Quality**:
   - Verify: All hooks have JSDoc comments
   - Check: Query key factory exported
   - Verify: Optimistic updates properly implemented
   - Check: Proper TypeScript types used
   - Verify: Error handling with rollback

6. **React Query Best Practices**:
   - Verify: staleTime = 5 * 60 * 1000 (5 minutes)
   - Check: gcTime = 10 * 60 * 1000 (10 minutes)
   - Verify: refetchOnWindowFocus = false
   - Check: Cache invalidation uses specific query keys
   - Verify: Optimistic updates save previous state for rollback

7. **Undo Pattern Compliance**:
   - Verify: Delete mutation has undo capability
   - Check: 5-second undo window implemented
   - Verify: Undo cancels pending deletion
   - Check: Toast notification shows undo button

8. **Test Quality**:
   - Verify: Tests cover all hooks
   - Check: Optimistic update scenarios tested
   - Verify: Rollback on error tested
   - Check: Cache invalidation tested
   - Verify: Undo functionality tested

FAILURE HANDLING:
If ANY check fails:
- Document the specific failure with line numbers
- Create a numbered list of issues found
- Do NOT proceed to Cycle 4
- Return detailed failure report

SUCCESS CRITERIA:
- ✅ All tests passing (0 failures)
- ✅ Code coverage ≥70%
- ✅ Build succeeds with no errors
- ✅ File size <500 lines
- ✅ All hooks <50 lines
- ✅ React Query best practices followed
- ✅ 20+ test cases implemented
- ✅ Undo pattern properly implemented

EXPECTED OUTPUT:
Provide a summary report with:
- Test results (pass/fail counts)
- Coverage percentage
- File size metrics
- React Query configuration verification
- List of verified quality checks
- GO/NO-GO decision for Cycle 4"
`

---

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

**📖 READ BEFORE STARTING**:
- **[`delete_confirmation_undo_specification.md`](./delete_confirmation_undo_specification.md)** - Delete confirmation modal design
- **[`accessibility_implementation_guide.md`](./accessibility_implementation_guide.md#button-accessibility)** - ARIA labels for action buttons

---

**🔴 RED Phase (Tester-Agent)**: Write failing tests for SpecialRelationshipActions.tsx and DeleteConfirmationModal.tsx with accessibility validation (jest-axe)

**Agent Invocation**: Use Task tool with subagent_type `"Tester-Agent"`, description `"Write failing tests for Cycle 4"`, prompt:
```
Write comprehensive test suite for SpecialRelationshipActions Component (Cycle 4).

CONTEXT:
- Cycles 1-3 complete (Types, API, Hooks)
- Create component tests for Actions and Delete Confirmation Modal
- Include accessibility testing with jest-axe

REQUIREMENTS:
1. Test file: frontend/src/tests/components/SpecialRelationshipActions.test.tsx
2. Test file: frontend/src/tests/components/DeleteConfirmationModal.test.tsx
3. Test scenarios: Button rendering, onClick handlers, keyboard navigation, ARIA labels, delete confirmation flow
4. Use jest-axe for accessibility checks
5. Minimum 15 test cases across both files

ACCEPTANCE CRITERIA:
- Tests FAIL (components don't exist yet)
- No syntax/import errors
- Clear failure messages
```

**🟢 GREEN Phase (Coder-Agent)**: Implement minimal SpecialRelationshipActions.tsx (~100 lines) and DeleteConfirmationModal.tsx (~150 lines) to pass tests

**Agent Invocation**: Use Task tool with subagent_type `"coder-agent"`, description `"Implement Actions component for Cycle 4"`, prompt:
```
Implement SpecialRelationshipActions and DeleteConfirmationModal components (Cycle 4).

CONTEXT:
- Cycles 1-3 complete
- RED phase tests are failing
- Write MINIMAL code to pass tests

REQUIREMENTS:
1. Create: frontend/src/components/SpecialRelationshipActions.tsx (~100 lines)
   - Edit, Delete, Change Status buttons
   - ARIA labels from accessibility_implementation_guide.md
2. Create: frontend/src/components/DeleteConfirmationModal.tsx (~150 lines)
   - Confirmation modal with Cancel/Delete buttons
   - Focus trap pattern
3. Run tests - all must pass

ACCEPTANCE CRITERIA:
- All tests passing
- File sizes <500 lines
- Proper ARIA attributes
- TypeScript types correct
```

**🔵 REFACTOR Phase (Coder-Agent)**: Extract common button patterns, add JSDoc, verify accessibility

**Agent Invocation**: Use Task tool with subagent_type `"coder-agent"`, description `"Refactor Actions component for Cycle 4"`, prompt:
```
Refactor SpecialRelationshipActions and DeleteConfirmationModal (Cycle 4) while maintaining passing tests.

REFACTORING TASKS:
1. Extract common button styles/patterns
2. Add JSDoc comments
3. Verify ARIA compliance (check against accessibility_implementation_guide.md)
4. Ensure keyboard navigation works
5. Check DRY principle

CONSTRAINTS:
- All tests must STILL PASS
- Files remain <500 lines
- No breaking changes

RUN TESTS after each change - verify 0 failures
```

**✅ VERIFY Phase (Tester-Agent)**: Run tests, verify coverage ≥70%, check build, confirm file sizes <500 lines, validate WCAG 2.1 AA compliance

**Agent Invocation**: Use Task tool with subagent_type `"Tester-Agent"`, description `"Verify Cycle 4 completion"`, prompt:
```
Verify Cycle 4 (SpecialRelationshipActions Component) meets all quality standards.

VERIFICATION CHECKLIST:
1. Test Execution: npm test SpecialRelationshipActions (0 failures?)
2. Coverage: ≥70%?
3. Build: npm run build (no errors?)
4. File Sizes: <500 lines each?
5. Accessibility: jest-axe passes? ARIA labels present?
6. Test Quality: 15+ test cases?

FAILURE HANDLING:
If ANY check fails, document failure and DO NOT proceed to Cycle 5.

SUCCESS CRITERIA:
✅ All checks passing → GO for Cycle 5
```

---

**Deliverables**:
- SpecialRelationshipActions.tsx (~100 lines)
- DeleteConfirmationModal.tsx (~150 lines)
- Tests with accessibility validation

---

#### Cycle 5: SpecialRelationshipRow Component (3 hours)

**📖 READ BEFORE STARTING**:
- **[`performance_optimization_guide.md`](./performance_optimization_guide.md#memoize-table-rows)** - React.memo with custom comparison
- **[`ux_and_validation_specifications.md`](./ux_and_validation_specifications.md#age-display-enhancement)** - Age display pattern

---

**🔴 RED Phase (Tester-Agent)**: Write failing tests for SpecialRelationshipRow.tsx with both Personal/Professional views, conditional rendering tests

**Agent Invocation**: Use Task tool with subagent_type `"Tester-Agent"`, description `"Write failing tests for Cycle 5"`, prompt:
```
Write comprehensive test suite for SpecialRelationshipRow Component (Cycle 5).

CONTEXT:
- Cycles 1-4 complete
- Row component displays different fields for Personal vs Professional relationships
- Must test React.memo optimization

REQUIREMENTS:
1. Test file: frontend/src/tests/components/SpecialRelationshipRow.test.tsx
2. Test scenarios:
   - Personal relationship rendering (shows DOB, age, is_dependent)
   - Professional relationship rendering (shows associated_product_owners)
   - Status-based styling (Active/Inactive/Deceased)
   - Action buttons integration
   - React.memo preventing unnecessary re-renders
3. Minimum 15 test cases

ACCEPTANCE CRITERIA:
- Tests FAIL (component doesn't exist yet)
- No syntax/import errors
- Tests cover both relationship types
```

**🟢 GREEN Phase (Coder-Agent)**: Implement SpecialRelationshipRow.tsx (~150 lines) wrapped in React.memo with custom comparison function

**Agent Invocation**: Use Task tool with subagent_type `"coder-agent"`, description `"Implement Row component for Cycle 5"`, prompt:
```
Implement SpecialRelationshipRow component (Cycle 5).

CONTEXT:
- Cycles 1-4 complete
- RED phase tests are failing
- Write MINIMAL code to pass tests
- Reference performance_optimization_guide.md for React.memo pattern

REQUIREMENTS:
1. Create: frontend/src/components/SpecialRelationshipRow.tsx (~150 lines)
   - Conditional rendering: Personal shows DOB/age/is_dependent, Professional shows associated_product_owners
   - Status-based styling (green for Active, gray for Inactive, black for Deceased)
   - Integrate SpecialRelationshipActions component (from Cycle 4)
   - Wrap in React.memo with custom arePropsEqual comparison
2. Run tests - all must pass

ACCEPTANCE CRITERIA:
- All tests passing
- File size <500 lines
- React.memo properly implemented
- Conditional rendering works for both types
```

**🔵 REFACTOR Phase (Coder-Agent)**: Optimize React.memo comparison, extract status styling, add JSDoc

**Agent Invocation**: Use Task tool with subagent_type `"coder-agent"`, description `"Refactor Row component for Cycle 5"`, prompt:
```
Refactor SpecialRelationshipRow (Cycle 5) while maintaining passing tests.

REFACTORING TASKS:
1. Optimize arePropsEqual function (only check necessary fields)
2. Extract status styling to utility function
3. Add JSDoc comments
4. Verify conditional rendering is clear and maintainable
5. Check DRY principle

CONSTRAINTS:
- All tests must STILL PASS
- File remains <500 lines
- React.memo optimization verified

RUN TESTS after each change - verify 0 failures
```

**✅ VERIFY Phase (Tester-Agent)**: Run tests, verify coverage ≥70%, check build, confirm React.memo optimization working (no unnecessary re-renders)

**Agent Invocation**: Use Task tool with subagent_type `"Tester-Agent"`, description `"Verify Cycle 5 completion"`, prompt:
```
Verify Cycle 5 (SpecialRelationshipRow Component) meets all quality standards.

VERIFICATION CHECKLIST:
1. Test Execution: npm test SpecialRelationshipRow (0 failures?)
2. Coverage: ≥70%?
3. Build: npm run build (no errors?)
4. File Size: <500 lines?
5. React.memo: Verified preventing unnecessary re-renders?
6. Conditional Rendering: Both Personal/Professional types work?
7. Test Quality: 15+ test cases?

FAILURE HANDLING:
If ANY check fails, document failure and DO NOT proceed to Cycle 6.

SUCCESS CRITERIA:
✅ All checks passing → GO for Cycle 6
```

---

**Deliverables**:
- SpecialRelationshipRow.tsx (~150 lines, wrapped in React.memo)
- Conditional rendering for Personal/Professional views
- Tests for both relationship types

---

#### Cycle 6: Table Components (5 hours)

**📖 READ BEFORE STARTING**:
- **[`empty_states_specification.md`](./empty_states_specification.md)** - All empty/loading/error states
- **[`accessibility_implementation_guide.md`](./accessibility_implementation_guide.md#sortable-table-accessibility)** - Sortable table ARIA patterns
- **[`ux_and_validation_specifications.md`](./ux_and_validation_specifications.md#responsive-design-for-tablet)** - Tablet responsive design (768-1023px)

---

**🔴 RED Phase (Tester-Agent)**: Write failing tests for PersonalRelationshipsTable, ProfessionalRelationshipsTable, TableSortHeader, and all empty states with ARIA validation

**Agent Invocation**: Use Task tool with subagent_type `"Tester-Agent"`, description `"Write failing tests for Cycle 6"`, prompt:
```
Write comprehensive test suite for Table Components (Cycle 6).

CONTEXT:
- Cycles 1-5 complete
- Two table components (Personal/Professional) with sortable headers
- Empty states for no data, loading, errors
- Responsive design for tablet (768-1023px)

REQUIREMENTS:
1. Test files:
   - frontend/src/tests/components/PersonalRelationshipsTable.test.tsx
   - frontend/src/tests/components/ProfessionalRelationshipsTable.test.tsx
   - frontend/src/tests/components/TableSortHeader.test.tsx
   - frontend/src/tests/components/EmptyStatePersonal.test.tsx (and other empty states)
2. Test scenarios:
   - Table rendering with data
   - Sorting by columns (Name, Status, DOB for Personal; Product Owners for Professional)
   - ARIA attributes for sortable headers (aria-sort, aria-label)
   - Keyboard navigation (Enter/Space to sort)
   - Empty states (no data, loading, error)
   - Responsive tablet design (hide columns on 768-1023px)
3. Use jest-axe for accessibility
4. Minimum 25 test cases across all files

ACCEPTANCE CRITERIA:
- Tests FAIL (components don't exist yet)
- ARIA patterns from accessibility_implementation_guide.md
- Empty states match empty_states_specification.md
```

**🟢 GREEN Phase (Coder-Agent)**: Implement PersonalRelationshipsTable (~250 lines), ProfessionalRelationshipsTable (~250 lines), TableSortHeader (~70 lines), empty state components

**Agent Invocation**: Use Task tool with subagent_type `"coder-agent"`, description `"Implement Table components for Cycle 6"`, prompt:
```
Implement Table Components (Cycle 6).

CONTEXT:
- Cycles 1-5 complete
- RED phase tests are failing
- Write MINIMAL code to pass tests
- Reference accessibility_implementation_guide.md for sortable table ARIA pattern

REQUIREMENTS:
1. Create: frontend/src/components/PersonalRelationshipsTable.tsx (~250 lines)
   - Columns: Name, Relationship Type, DOB, Age, Dependent, Email, Phone, Status, Actions
   - Sortable by Name, Status, DOB (Age calculated)
   - Responsive: Hide Email/Phone/DOB on 768-1023px
2. Create: frontend/src/components/ProfessionalRelationshipsTable.tsx (~250 lines)
   - Columns: Name, Relationship Type, Associated Product Owners, Email, Phone, Status, Actions
   - Sortable by Name, Status
3. Create: frontend/src/components/TableSortHeader.tsx (~70 lines, reusable)
   - ARIA attributes: aria-sort, aria-label
   - Keyboard support: Enter/Space to sort
   - Visual indicator: arrow up/down
4. Create empty state components:
   - EmptyStatePersonal, EmptyStateProfessional
   - SkeletonTable, ErrorState
5. Run tests - all must pass

ACCEPTANCE CRITERIA:
- All tests passing
- File sizes <500 lines each
- ARIA compliance verified
- Responsive design works
```

**🔵 REFACTOR Phase (Coder-Agent)**: Extract common table patterns, optimize sort logic, verify accessibility and responsive design

**Agent Invocation**: Use Task tool with subagent_type `"coder-agent"`, description `"Refactor Table components for Cycle 6"`, prompt:
```
Refactor Table Components (Cycle 6) while maintaining passing tests.

REFACTORING TASKS:
1. Extract common table styles/structure (DRY between Personal/Professional tables)
2. Optimize sort logic (ensure Active > Inactive > Deceased ordering preserved)
3. Add JSDoc comments
4. Verify ARIA compliance (sortable table pattern)
5. Test responsive design (768-1023px breakpoint)
6. Ensure empty states follow specification

CONSTRAINTS:
- All tests must STILL PASS
- Files remain <500 lines each
- Accessibility verified

RUN TESTS after each change - verify 0 failures
```

**✅ VERIFY Phase (Tester-Agent)**: Run tests, verify coverage ≥70%, check build, validate ARIA for sortable tables, test responsive design on tablet width

**Agent Invocation**: Use Task tool with subagent_type `"Tester-Agent"`, description `"Verify Cycle 6 completion"`, prompt:
```
Verify Cycle 6 (Table Components) meets all quality standards.

VERIFICATION CHECKLIST:
1. Test Execution: npm test *Table (0 failures?)
2. Coverage: ≥70%?
3. Build: npm run build (no errors?)
4. File Sizes: All <500 lines?
5. Accessibility: jest-axe passes? Sortable table ARIA correct?
6. Responsive Design: Columns hide on 768-1023px?
7. Empty States: All 4+ states implemented?
8. Test Quality: 25+ test cases?

FAILURE HANDLING:
If ANY check fails, document failure and DO NOT proceed to Cycle 7.

SUCCESS CRITERIA:
✅ All checks passing → GO for Cycle 7
```

---

**Deliverables**:
- PersonalRelationshipsTable.tsx (~250 lines)
- ProfessionalRelationshipsTable.tsx (~250 lines)
- TableSortHeader.tsx (~70 lines, reusable)
- Empty state components (EmptyStatePersonal, EmptyStateProfessional, SkeletonTable, ErrorState)
- Responsive design for tablet (hide Email/Phone/DOB, show expand button)

---

#### Cycle 7: Create/Edit Modal Components (7-10 hours)

**📖 READ BEFORE STARTING**:
- **[`ux_and_validation_specifications.md`](./ux_and_validation_specifications.md#modal-form-validation-specification)** - Complete form validation guide
- **[`editable_dropdown_specification.md`](./editable_dropdown_specification.md)** - Editable dropdown implementation (CRITICAL)
- **[`accessibility_implementation_guide.md`](./accessibility_implementation_guide.md#modal-focus-management)** - Focus trap pattern

**⚠️ CRITICAL DECISION POINT** (1 hour):
Investigate existing ComboDropdown component:
- If supports custom values: Use as-is (2h total)
- If needs extension: Extend component (3-4h total)
- If doesn't exist/broken: Implement with downshift library (6-8h total)

---

**🔴 RED Phase (Tester-Agent)**: Write failing tests for ModalShell, RelationshipFormFields, useRelationshipValidation hook, CreateModal, EditModal with accessibility (focus trap) and validation tests

**Agent Invocation**: Use Task tool with subagent_type `"Tester-Agent"`, description `"Write failing tests for Cycle 7"`, prompt:
```
Write comprehensive test suite for Modal Components (Cycle 7).

CONTEXT:
- Cycles 1-6 complete
- Complex modals with form validation, focus management, editable dropdowns
- Most complex cycle - requires thorough testing

REQUIREMENTS:
1. Test files:
   - frontend/src/tests/components/ModalShell.test.tsx
   - frontend/src/tests/components/RelationshipFormFields.test.tsx
   - frontend/src/tests/hooks/useRelationshipValidation.test.ts
   - frontend/src/tests/components/CreateSpecialRelationshipModal.test.tsx
   - frontend/src/tests/components/EditSpecialRelationshipModal.test.tsx
2. Test scenarios:
   - Modal open/close with focus trap (focus returns to trigger button on close)
   - Form field validation (on blur, on submit)
   - Error messages display (Name required, Email format, Phone UK format, DOB not future)
   - Editable dropdown (select existing or type custom value)
   - Conditional fields (Personal vs Professional)
   - Submit with valid/invalid data
   - Cancel button
3. Use jest-axe for accessibility
4. Minimum 35 test cases across all files

ACCEPTANCE CRITERIA:
- Tests FAIL (components don't exist yet)
- Focus trap pattern tested
- Form validation comprehensive
- Editable dropdown functionality tested
```

**🟢 GREEN Phase (Coder-Agent)**: Implement ModalShell (~80 lines) with focus trap, RelationshipFormFields (~200 lines), useRelationshipValidation (~100 lines), CreateModal (~150 lines), EditModal (~150 lines)

**Agent Invocation**: Use Task tool with subagent_type `"coder-agent"`, description `"Implement Modal components for Cycle 7"`, prompt:
```
Implement Modal Components (Cycle 7).

CONTEXT:
- Cycles 1-6 complete
- RED phase tests are failing
- Write MINIMAL code to pass tests
- Reference editable_dropdown_specification.md for dropdown implementation decision

REQUIREMENTS:
1. FIRST: Investigate existing ComboDropdown component (1 hour)
   - Check if supports custom values
   - Choose implementation path (use, extend, or implement new)
2. Create: frontend/src/components/ModalShell.tsx (~80 lines)
   - Focus trap using focus-trap-react library
   - Save previous focus, restore on close
   - ESC key to close
3. Create: frontend/src/components/RelationshipFormFields.tsx (~200 lines)
   - All form fields with labels
   - Conditional rendering (Personal shows DOB/Dependent, Professional shows Product Owners)
   - Use editable dropdown for Relationship Type
4. Create: frontend/src/hooks/useRelationshipValidation.ts (~100 lines)
   - Validation on blur for each field
   - Validation on submit
   - Error state management
5. Create: frontend/src/components/CreateSpecialRelationshipModal.tsx (~150 lines)
   - Use ModalShell, RelationshipFormFields, useRelationshipValidation
   - Call useCreateSpecialRelationship hook (Cycle 3)
6. Create: frontend/src/components/EditSpecialRelationshipModal.tsx (~150 lines)
   - Similar to Create but pre-populates fields
7. Run tests - all must pass

ACCEPTANCE CRITERIA:
- All tests passing
- File sizes <500 lines each
- Focus trap works
- Form validation works
- Editable dropdown implemented
```

**🔵 REFACTOR Phase (Coder-Agent)**: Extract validation rules to constants, optimize form field rendering, verify focus management and ARIA

**Agent Invocation**: Use Task tool with subagent_type `"coder-agent"`, description `"Refactor Modal components for Cycle 7"`, prompt:
```
Refactor Modal Components (Cycle 7) while maintaining passing tests.

REFACTORING TASKS:
1. Extract validation rules to constants file (DRY)
2. Optimize form field rendering (reduce duplication between Create/Edit)
3. Add JSDoc comments
4. Verify focus trap pattern correct
5. Verify ARIA compliance (labels, error messages linked with aria-describedby)
6. Ensure validation messages match UX spec

CONSTRAINTS:
- All tests must STILL PASS
- Files remain <500 lines each
- Focus management verified

RUN TESTS after each change - verify 0 failures
```

**✅ VERIFY Phase (Tester-Agent)**: Run tests, verify coverage ≥70%, check build, validate focus trap, test form validation with all edge cases, verify editable dropdown works

**Agent Invocation**: Use Task tool with subagent_type `"Tester-Agent"`, description `"Verify Cycle 7 completion"`, prompt:
```
Verify Cycle 7 (Modal Components) meets all quality standards.

VERIFICATION CHECKLIST:
1. Test Execution: npm test *Modal (0 failures?)
2. Coverage: ≥70%?
3. Build: npm run build (no errors?)
4. File Sizes: All <500 lines?
5. Accessibility: jest-axe passes? Focus trap works? ARIA labels correct?
6. Form Validation: All validation rules working?
7. Editable Dropdown: Can select existing AND type custom value?
8. Conditional Fields: Personal/Professional fields show correctly?
9. Test Quality: 35+ test cases?

FAILURE HANDLING:
If ANY check fails, document failure and DO NOT proceed to Cycle 8.

SUCCESS CRITERIA:
✅ All checks passing → GO for Cycle 8
```

---

**Deliverables**:
- ModalShell.tsx (~80 lines, reusable wrapper with focus trap)
- RelationshipFormFields.tsx (~200 lines, shared form fields)
- useRelationshipValidation.ts (~100 lines, validation hook)
- CreateSpecialRelationshipModal.tsx (~150 lines)
- EditSpecialRelationshipModal.tsx (~150 lines)

---

#### Cycle 8: Container Component (3 hours)

**📖 READ BEFORE STARTING**:
- **[`revised_component_architecture.md`](./revised_component_architecture.md#specialrelationshipssubtab)** - Container component spec

---

**🔴 RED Phase (Tester-Agent)**: Write failing tests for SpecialRelationshipsSubTab container and TabNavigation with integration tests for full component tree

**Agent Invocation**: Use Task tool with subagent_type `"Tester-Agent"`, description `"Write failing tests for Cycle 8"`, prompt:
```
Write comprehensive test suite for Container Component (Cycle 8).

CONTEXT:
- Cycles 1-7 complete
- Final frontend component - integrates all previous cycles
- Container orchestrates Personal/Professional tabs, modals, data fetching

REQUIREMENTS:
1. Test files:
   - frontend/src/tests/components/SpecialRelationshipsSubTab.test.tsx
   - frontend/src/tests/components/TabNavigation.test.tsx
2. Test scenarios:
   - Tab switching between Personal/Professional
   - Data fetching with useSpecialRelationships hook (Cycle 3)
   - Create button opens CreateModal (Cycle 7)
   - Loading state shows skeleton
   - Error state shows error component
   - Empty state shows appropriate empty state
   - Integration: Full component tree renders without errors
3. Use jest-axe for accessibility
4. Minimum 20 test cases

ACCEPTANCE CRITERIA:
- Tests FAIL (components don't exist yet)
- Integration tests cover full component tree
- All states tested (loading, error, empty, data)
```

**🟢 GREEN Phase (Coder-Agent)**: Implement SpecialRelationshipsSubTab (~150 lines) and TabNavigation (~50 lines) integrating all previous components

**Agent Invocation**: Use Task tool with subagent_type `"coder-agent"`, description `"Implement Container component for Cycle 8"`, prompt:
```
Implement Container Component (Cycle 8).

CONTEXT:
- Cycles 1-7 complete
- RED phase tests are failing
- Write MINIMAL code to pass tests
- This is the final frontend integration component

REQUIREMENTS:
1. Create: frontend/src/components/SpecialRelationshipsSubTab.tsx (~150 lines)
   - Use useSpecialRelationships hook (Cycle 3) to fetch data
   - Tab navigation (Personal/Professional)
   - Create button opens CreateModal (Cycle 7)
   - Render PersonalRelationshipsTable or ProfessionalRelationshipsTable (Cycle 6)
   - Handle loading, error, empty states
2. Create: frontend/src/components/TabNavigation.tsx (~50 lines)
   - Two tabs: Personal, Professional
   - ARIA attributes (role="tablist", aria-selected)
   - Keyboard navigation (Arrow keys)
3. Run tests - all must pass

ACCEPTANCE CRITERIA:
- All tests passing
- File sizes <500 lines each
- Full integration working (data flows from hook → table → modals)
- All states render correctly
```

**🔵 REFACTOR Phase (Coder-Agent)**: Optimize state management, extract tab logic if needed, verify integration with all child components

**Agent Invocation**: Use Task tool with subagent_type `"coder-agent"`, description `"Refactor Container component for Cycle 8"`, prompt:
```
Refactor Container Component (Cycle 8) while maintaining passing tests.

REFACTORING TASKS:
1. Optimize state management (minimize re-renders)
2. Verify tab navigation ARIA compliance
3. Add JSDoc comments
4. Ensure error handling is comprehensive
5. Check DRY principle
6. Verify all child components integrated correctly

CONSTRAINTS:
- All tests must STILL PASS
- Files remain <500 lines each
- Integration verified

RUN TESTS after each change - verify 0 failures
```

**✅ VERIFY Phase (Tester-Agent)**: Run all tests (entire test suite), verify coverage ≥70%, check build, test full user flow end-to-end

**Agent Invocation**: Use Task tool with subagent_type `"Tester-Agent"`, description `"Verify Cycle 8 completion"`, prompt:
```
Verify Cycle 8 (Container Component) meets all quality standards.

VERIFICATION CHECKLIST:
1. Test Execution: npm test SpecialRelationships (0 failures?)
2. ALL Tests: npm test (run entire test suite - 0 failures?)
3. Coverage: npm test -- --coverage (≥70%?)
4. Build: npm run build (no errors?)
5. File Sizes: All <500 lines?
6. Accessibility: jest-axe passes for container?
7. Integration: Full component tree renders?
8. User Flow: Can create/edit/delete relationship end-to-end?
9. Test Quality: 20+ test cases for container?

FAILURE HANDLING:
If ANY check fails, document failure. Fix before proceeding to backend (Cycle 9).

SUCCESS CRITERIA:
✅ All checks passing
✅ Complete frontend implementation verified
✅ GO for Cycle 9 (Backend API Implementation)
```

---

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

   **📖 READ BEFORE STARTING**:
   - **[`special_relationships_api_spec.yaml`](./special_relationships_api_spec.yaml)** - Implement ALL endpoints exactly as specified
   - **[`ux_and_validation_specifications.md`](./ux_and_validation_specifications.md#data-validation-service-layer)** - Backend validation rules
   - **[`delete_confirmation_undo_specification.md`](./delete_confirmation_undo_specification.md#soft-delete-implementation)** - Soft delete pattern

   **⚠️ CRITICAL**: Develop in parallel with frontend using OpenAPI spec contract

   ---

   **🔴 RED Phase (Tester-Agent)**: Write failing backend tests for all API endpoints with pytest

   **Agent Invocation**: Use Task tool with subagent_type `"Tester-Agent"`, description `"Write failing backend tests"`, prompt:
   ```
   Write comprehensive pytest test suite for Backend API (Cycle 9).

   CONTEXT:
   - Frontend Cycles 1-8 complete (or in progress)
   - Backend API developed in parallel using OpenAPI spec contract
   - Python/FastAPI backend with PostgreSQL database

   REQUIREMENTS:
   1. Test file: backend/tests/test_special_relationships_routes.py
   2. Test all endpoints from OpenAPI spec:
      - GET /api/special_relationships?client_group_id={id}
      - POST /api/special_relationships
      - PUT /api/special_relationships/{id}
      - PATCH /api/special_relationships/{id}/status
      - DELETE /api/special_relationships/{id}
   3. Test scenarios:
      - Successful CRUD operations
      - Validation errors (400) - Name too long, invalid email, invalid phone, future DOB
      - Authentication errors (401)
      - Not found errors (404)
      - Server errors (500)
      - Soft delete (deleted_at timestamp set, not hard delete)
   4. Use pytest fixtures for database setup/teardown
   5. Minimum 20 test cases

   ACCEPTANCE CRITERIA:
   - Tests FAIL (routes don't exist yet)
   - No syntax errors
   - Database fixtures properly configured
   ```

   **🟢 GREEN Phase (Coder-Agent)**: Implement FastAPI routes and database operations

   **Agent Invocation**: Use Task tool with subagent_type `"coder-agent"`, description `"Implement backend API"`, prompt:
   ```
   Implement Backend API for Special Relationships (Cycle 9).

   CONTEXT:
   - RED phase tests are failing
   - Frontend using OpenAPI spec contract (can develop in parallel)
   - Write MINIMAL code to pass tests

   REQUIREMENTS:
   1. Create: backend/app/api/routes/special_relationships.py
   2. Implement all endpoints matching OpenAPI spec exactly:
      - GET endpoint with client_group_id filter
      - POST endpoint with Pydantic validation
      - PUT endpoint for full updates
      - PATCH endpoint for status updates only
      - DELETE endpoint with soft delete (set deleted_at timestamp)
   3. Create Pydantic models: backend/app/models/special_relationship.py
   4. Database operations:
      - Add deleted_at column to special_relationships table (migration if needed)
      - Create indexes on client_group_id and deleted_at
      - Filter out soft-deleted records in GET endpoint
   5. Validation rules from ux_and_validation_specifications.md:
      - Name: 1-200 chars, required
      - Email: valid format or empty
      - Phone: UK format or empty
      - DOB: not in future, age 0-120
   6. Run tests - all must pass

   ACCEPTANCE CRITERIA:
   - All tests passing
   - OpenAPI spec compliance verified
   - Soft delete working (not hard delete)
   - Validation errors return 400 with error messages
   ```

   **🔵 REFACTOR Phase (Coder-Agent)**: Extract validation to service layer, optimize queries, add database indexes

   **Agent Invocation**: Use Task tool with subagent_type `"coder-agent"`, description `"Refactor backend API"`, prompt:
   ```
   Refactor Backend API (Cycle 9) while maintaining passing tests.

   REFACTORING TASKS:
   1. Extract validation logic to service layer (DRY)
   2. Optimize database queries (add indexes, use joins for product_owner_names)
   3. Add error handling for database connection failures
   4. Add logging for all operations
   5. Verify SQL injection prevention (parameterized queries)
   6. Add API documentation docstrings

   CONSTRAINTS:
   - All tests must STILL PASS
   - OpenAPI spec compliance maintained

   RUN TESTS after each change - verify 0 failures
   ```

   **✅ VERIFY Phase (Tester-Agent)**: Run backend tests, verify OpenAPI compliance, test with Postman/curl, check database soft deletes

   **Agent Invocation**: Use Task tool with subagent_type `"Tester-Agent"`, description `"Verify backend API completion"`, prompt:
   ```
   Verify Backend API (Cycle 9) meets all quality standards.

   VERIFICATION CHECKLIST:
   1. Test Execution: pytest backend/tests/test_special_relationships_routes.py (0 failures?)
   2. Coverage: ≥70% for routes file?
   3. OpenAPI Compliance: All endpoints match spec exactly?
   4. Database: deleted_at column exists? Indexes created?
   5. Soft Delete: DELETE sets deleted_at, doesn't remove row?
   6. Validation: All validation rules working (Name, Email, Phone, DOB)?
   7. Manual Testing: Test with Postman/curl - all endpoints work?
   8. Error Handling: 400/401/404/500 errors return correct formats?

   FAILURE HANDLING:
   If ANY check fails, document failure and DO NOT proceed to Cycle 10.

   SUCCESS CRITERIA:
   ✅ All checks passing
   ✅ Backend ready for frontend integration
   ✅ GO for Cycle 10 (Integration & E2E Testing)
   ```

   ---

   **Deliverables**:
   - backend/app/api/routes/special_relationships.py
   - backend/app/models/special_relationship.py
   - backend/tests/test_special_relationships_routes.py
   - Database migration (if needed) for deleted_at column and indexes

10. **Integration & End-to-End Testing** (Estimated: 3 hours, +50% buffer)

    **📖 READ BEFORE STARTING**:
    - **[`integration_test_scenarios.md`](./integration_test_scenarios.md)** - Execute ALL 15 test scenarios
    - **[`accessibility_implementation_guide.md`](./accessibility_implementation_guide.md#testing-procedures)** - Accessibility testing checklist

    ---

    **🔴 RED Phase (Tester-Agent)**: Write failing integration and E2E tests covering all 15 scenarios from integration_test_scenarios.md

    **Agent Invocation**: Use Task tool with subagent_type `"Tester-Agent"`, description `"Write integration & E2E tests"`, prompt:
    ```
    Write comprehensive Integration and E2E test suite (Cycle 10).

    CONTEXT:
    - Cycles 1-9 complete (frontend and backend)
    - Final testing cycle before UAT
    - Must verify full stack integration

    REQUIREMENTS:
    1. Test file: frontend/src/tests/integration/SpecialRelationships.integration.test.tsx
    2. Execute ALL 15 test scenarios from integration_test_scenarios.md:
       - Scenario 1: Create personal relationship - full flow
       - Scenario 2: Create professional relationship with product owners
       - Scenario 3: Edit relationship and verify persistence
       - Scenario 4: Status change flow (Active → Inactive → Deceased)
       - Scenario 5: Delete with undo (5-second window)
       - Scenario 6: Delete undo timeout (permanent deletion)
       - Scenario 7: Optimistic update rollback on API failure
       - Scenario 8: Sort by multiple columns
       - Scenario 9: Focus trap in create modal
       - Scenario 10: Tab navigation between Personal/Professional
       - Scenario 11: Empty state → Create → Data state
       - Scenario 12: Form validation errors
       - Scenario 13: Responsive design (tablet view)
       - Scenario 14: Page refresh data persistence
       - Scenario 15: API error handling - network failure
    3. Use real backend (not mocks) or MSW for realistic API simulation
    4. Minimum 15 test cases (one per scenario)

    ACCEPTANCE CRITERIA:
    - Tests FAIL (integration not complete yet)
    - All 15 scenarios covered
    - Tests use realistic data flows
    ```

    **🟢 GREEN Phase (Coder-Agent)**: Integrate SpecialRelationshipsSubTab into BasicDetailsTab, fix integration issues to pass tests

    **Agent Invocation**: Use Task tool with subagent_type `"coder-agent"`, description `"Complete integration"`, prompt:
    ```
    Complete Integration of Special Relationships feature (Cycle 10).

    CONTEXT:
    - Cycles 1-9 complete
    - RED phase integration tests are failing
    - Need to integrate into existing Client Group Suite

    REQUIREMENTS:
    1. Integrate SpecialRelationshipsSubTab into BasicDetailsTab.tsx:
       ```typescript
       case 'relationships':
         return (
           <div className="bg-white rounded-lg shadow p-6">
             <SpecialRelationshipsSubTab clientGroupId={clientGroupId} />
           </div>
         );
       ```
    2. Fix any integration issues discovered by tests:
       - CORS issues
       - Authentication/cookie issues
       - Data format mismatches between frontend/backend
       - React Query cache conflicts
    3. Verify end-to-end flows work:
       - Create → persists to database → shows in UI
       - Edit → updates database → UI updates
       - Delete → soft delete in database → UI removes with undo
       - Status change → database updated → UI reflects change
    4. Run all integration tests - all must pass

    ACCEPTANCE CRITERIA:
    - All integration tests passing
    - Feature integrated into existing app
    - No regressions in existing features
    - Full user flow working end-to-end
    ```

    **🔵 REFACTOR Phase (Coder-Agent)**: Optimize integration code, remove debug logs, verify no memory leaks

    **Agent Invocation**: Use Task tool with subagent_type `"coder-agent"`, description `"Refactor integration"`, prompt:
    ```
    Refactor Integration code (Cycle 10) while maintaining passing tests.

    REFACTORING TASKS:
    1. Remove all debug console.logs added during integration
    2. Verify no memory leaks (close modals properly, clean up listeners)
    3. Optimize React Query cache settings
    4. Remove any temporary workarounds
    5. Verify error handling is production-ready
    6. Check for any hardcoded values that should be config

    CONSTRAINTS:
    - All tests must STILL PASS
    - No regressions in existing features

    RUN TESTS after each change - verify 0 failures
    ```

    **✅ VERIFY Phase (Tester-Agent)**: Run COMPLETE test suite (frontend + backend), accessibility testing (jest-axe + manual), performance testing, final quality check

    **Agent Invocation**: Use Task tool with subagent_type `"Tester-Agent"`, description `"Final verification"`, prompt:
    ```
    Final Verification - Special Relationships feature complete (Cycle 10).

    VERIFICATION CHECKLIST:

    1. **Complete Test Suite**:
       - Frontend: npm test (0 failures?)
       - Backend: pytest (0 failures?)
       - Integration: All 15 scenarios passing?
       - Coverage: ≥70% overall?

    2. **Accessibility Testing**:
       - jest-axe: Run on all components (0 violations?)
       - Manual keyboard navigation: Test all components (30 min)
       - NVDA screen reader: Test all components (15 min)
       - Color contrast: Verify 4.5:1 minimum
       - Focus management: Modal focus trap works?

    3. **Performance Testing**:
       - Table render: <100ms with 50 relationships?
       - Sort performance: Acceptable with large dataset?
       - Memory leaks: None detected?
       - React Query cache: Working efficiently?

    4. **User Flow Testing**:
       - Create personal relationship → Success?
       - Create professional relationship → Success?
       - Edit relationship → Success?
       - Status change → Success?
       - Delete with undo → Success?
       - Page refresh → Data persists?

    5. **Cross-Browser Testing**:
       - Chrome: All features work?
       - Firefox: All features work?
       - Edge: All features work?

    6. **Build Verification**:
       - npm run build: No errors?
       - Backend starts: No errors?
       - Production mode: All features work?

    7. **Code Quality**:
       - All files <500 lines?
       - All functions <50 lines?
       - No hardcoded secrets?
       - Kingston preferences met (fonts, dates, etc.)?

    FAILURE HANDLING:
    If ANY check fails, document failure and DO NOT proceed to UAT.

    SUCCESS CRITERIA:
    ✅ All checks passing
    ✅ Feature complete and production-ready
    ✅ GO for UAT (User Acceptance Testing)

    EXPECTED OUTPUT:
    Provide comprehensive report with:
    - Test results summary
    - Accessibility audit results
    - Performance metrics
    - Any issues found and resolved
    - Final GO/NO-GO decision for UAT
    ```

    ---

    **Deliverables**:
    - Integration of SpecialRelationshipsSubTab into BasicDetailsTab
    - Complete integration test suite
    - Accessibility testing report (zero violations)
    - Performance testing report
    - Production-ready feature

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