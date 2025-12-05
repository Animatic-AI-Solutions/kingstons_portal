# Phase 2 People Tab Implementation Plan

## Executive Summary

This is a comprehensive implementation plan for building the **People Tab** feature within the Basic Details section of the Client Group Suite. The implementation follows **SPARC methodology** with strict **Test-Driven Development (TDD)** using RED-GREEN-BLUE phases, adhering to all project standards.

**Timeline**: 20-28 days (revised based on critical analysis)
**Test Coverage Target**: ≥70% (project standard)
**File Size Limit**: ≤500 lines per file, ≤50 lines per function

**Revision Note**: This plan has been updated based on comprehensive critical analysis to address timeline underestimates, testing gaps, and accessibility concerns identified by the 7-expert panel review.

---

## Critical Issues Addressed (v2.0 Updates)

Based on the 7-expert panel critical analysis, the following issues have been fixed:

### 1. Timeline Realism ✅ FIXED
- **Before**: 13-19 days (underestimated by 40-50%)
- **After**: 20-28 days (realistic estimate)
- **Reason**: Modal complexity, comprehensive testing, and accessibility work properly allocated

### 2. Error Handling & Testing ✅ FIXED
- **Added**: Phase 0 - Backend API validation (1 day upfront)
- **Added**: ErrorBoundary component tests and implementation
- **Added**: Shared error handling utility
- **Doubled**: Negative test cases across all API integrations
- **Added**: Edge case tests for null/undefined handling
- **Result**: Test count increased from 200+ to 280+ cases

### 3. Accessibility Compliance ✅ FIXED
- **Added**: Icons to status badges (not color-only) with CheckCircle, PauseCircle, XCircle icons
- **Added**: ARIA relationships (aria-controls, aria-selected for tabs)
- **Added**: aria-live announcements for status changes, saves, errors
- **Added**: Touch target size tests (44x44px minimum)
- **Added**: 20+ WCAG-specific accessibility tests
- **Result**: Progressive accessibility implementation, not deferred to final iteration

### 4. Modal Complexity ✅ FIXED
- **Added**: Preemptive architectural splitting strategy
- **Created**: BaseProductOwnerModal.tsx (shared between Create/Edit)
- **Increased**: Iteration 6 from 4-5 days to 6-8 days
- **Result**: Modal stays within 500-line limit by design

### 5. Performance Validation ✅ FIXED
- **Added**: Performance test suite (PeopleTabPerformance.test.tsx)
- **Added**: Tests for <2s load, <100ms sort, <200ms modal open
- **Added**: Memory leak detection tests
- **Result**: Performance benchmarks validated, not assumed

### 6. Integration Testing ✅ FIXED
- **Split**: Iteration 8 into 8A (Accessibility & Integration) and 8B (Performance & Polish)
- **Increased**: From 2-3 days to 4-5 days total
- **Added**: Error recovery flow tests
- **Added**: 100-record stress tests
- **Result**: Comprehensive integration coverage

### Success Probability Improvement
- **Before Plan Updates**: 60% success probability
- **After Plan Updates**: 85% success probability
- **Confidence**: High - addresses all critical issues identified

---

## Plan Structure Overview

The implementation is organized into **1 validation phase + 8 major iterations**, each following the TDD cycle:

1. **RED Phase** (Tester-Agent): Write failing tests
2. **GREEN Phase** (Coder-Agent): Implement minimal code to pass tests
3. **BLUE Phase** (Coder-Agent): Refactor, optimize, document

---

## PHASE 0: Pre-Development Validation
**Duration**: 1 day
**Agent**: Coder-Agent

### Objective
Validate critical assumptions before starting development to reduce risk of late-stage rework.

### Tasks

**Backend API Contract Validation** (0.5 days)
1. Create API integration test suite: `frontend/src/tests/api/apiContractValidation.test.ts`
2. Test each endpoint returns expected schema:
   - `GET /client-groups/{id}/product-owners` → ProductOwner[]
   - `POST /product-owners` → ProductOwner
   - `PUT /product-owners/{id}` → ProductOwner
   - `DELETE /product-owners/{id}` → 204 No Content
   - `POST /client-group-product-owners` → Association object
3. Validate TypeScript interfaces match backend response shapes
4. Document any discrepancies requiring backend changes

**Dependency Installation & Verification** (0.25 days)
```bash
npm install @headlessui/react
npm install react-hook-form
npm install @faker-js/faker --save-dev  # For test data factories
```

**Test Data Factory Setup** (0.25 days)
1. Create `frontend/src/tests/factories/productOwnerFactory.ts`
2. Generate realistic mock data for testing (names, emails, dates, addresses)
3. Export factory functions for use across test files

**Deliverables**:
- ✅ All 5 backend endpoints validated and documented
- ✅ Dependencies installed and verified
- ✅ Test data factory ready for use in Iteration 1
- ✅ Go/No-go decision: Proceed only if all API contracts match expectations

---

## ITERATION 1: Core Data Layer & API Integration
**Duration**: 2.5-3.5 days (increased for comprehensive error handling)
**Agent Sequence**: Tester-Agent → Coder-Agent → Coder-Agent

### RED PHASE (Tester-Agent) - Day 1 Morning

**Objective**: Define expected behavior through failing tests

**Test Files to Create**:

1. **`frontend/src/tests/api/productOwners.test.ts`** (API integration tests - EXPANDED)
   ```typescript
   describe('Product Owners API', () => {
     // Happy path tests
     test('fetches product owners for client group')
     test('handles empty product owner list')
     test('includes address information in response')

     // Error handling tests (ADDED)
     test('handles 401 unauthorized error')
     test('handles 403 forbidden error')
     test('handles 404 not found error')
     test('handles 500 server error')
     test('handles network timeout')
     test('handles malformed JSON response')
     test('retries failed requests once')
     test('shows user-friendly error messages')
   })
   ```

2. **`frontend/src/tests/utils/productOwnerHelpers.test.ts`** (Helper function tests - EXPANDED)
   ```typescript
   describe('Product Owner Helpers', () => {
     // Happy path tests
     test('calculateAge returns correct age from DOB')
     test('formatFullName concatenates title, firstname, surname')

     // Edge case tests (ADDED)
     test('calculateAge handles missing DOB (returns null)')
     test('calculateAge handles invalid dates (returns null)')
     test('calculateAge handles future dates (returns null)')
     test('calculateAge handles null DOB')
     test('calculateAge handles undefined DOB')
     test('formatFullName handles missing title')
     test('formatFullName handles null surname')
     test('formatFullName handles undefined firstname')
     test('formatFullName handles all null fields')
   })
   ```

3. **`frontend/src/tests/hooks/useProductOwners.test.ts`** (Custom hook tests - EXPANDED)
   ```typescript
   describe('useProductOwners Hook', () => {
     // Happy path tests
     test('fetches data on mount with correct client group ID')
     test('returns loading state during fetch')
     test('returns error state on fetch failure')
     test('returns product owners array on success')
     test('refetches when client group ID changes')

     // Error handling tests (ADDED)
     test('handles network error gracefully')
     test('shows error message on API failure')
     test('allows retry after error')
     test('clears error state on successful retry')
   })
   ```

4. **`frontend/src/tests/components/ErrorBoundary.test.tsx`** (NEW - Error boundary tests)
   ```typescript
   describe('Product Owner Error Boundary', () => {
     test('catches component errors and shows fallback UI')
     test('displays user-friendly error message')
     test('provides "Try Again" button')
     test('resets error state on retry')
     test('logs error details for debugging')
     test('does not crash entire app on component error')
   })
   ```

5. **`frontend/src/tests/utils/errorHandling.test.ts`** (NEW - Shared error utility tests)
   ```typescript
   describe('Error Handling Utilities', () => {
     test('formatApiError extracts message from error response')
     test('formatApiError handles network errors')
     test('formatApiError provides fallback message')
     test('isRetryableError identifies temporary errors')
     test('isRetryableError excludes 4xx errors')
   })
   ```

**Expected Test Results**: All tests should FAIL (no implementation yet)

**Deliverables**:
- 5 test files with ~45 total test cases (up from 30)
- All tests failing with clear "not implemented" errors
- Comprehensive coverage of error scenarios and edge cases

---

### GREEN PHASE (Coder-Agent) - Day 1-2

**Objective**: Write minimal implementation to pass all tests

**Files to Create**:

1. **`frontend/src/utils/productOwnerHelpers.ts`** (~80 lines)
   ```typescript
   export function calculateAge(dob: string | null | undefined): number | null
   export function formatFullName(title: string | null, firstname: string, surname: string): string
   // Handle all null/undefined edge cases identified in tests
   ```

2. **`frontend/src/utils/errorHandling.ts`** (~60 lines) **NEW**
   ```typescript
   export function formatApiError(error: any): string
   export function isRetryableError(error: any): boolean
   export const ERROR_MESSAGES: Record<string, string>
   ```

3. **`frontend/src/components/ErrorBoundary.tsx`** (~80 lines) **NEW**
   ```typescript
   export class ProductOwnerErrorBoundary extends React.Component {
     // Catch and handle component errors
     // Display fallback UI with retry option
   }
   ```

4. **`frontend/src/hooks/useProductOwners.ts`** (~80 lines - expanded for error handling)
   ```typescript
   export function useProductOwners(clientGroupId: string) {
     // React Query hook with retry logic and error handling
     return useQuery(
       ['productOwners', clientGroupId],
       fetchProductOwners,
       {
         retry: 1,
         onError: (error) => formatApiError(error),
         staleTime: 5 * 60 * 1000,
       }
     )
   }
   ```

5. **`frontend/src/services/api/productOwners.ts`** (~70 lines - expanded for error handling)
   ```typescript
   export async function fetchProductOwners(clientGroupId: string): Promise<ProductOwner[]>
   // Includes try-catch, timeout handling, response validation
   ```

6. **`frontend/src/types/productOwner.ts`** (~150 lines)
   ```typescript
   export interface ProductOwner {
     // All 30 fields from specification
   }
   export interface ProductOwnerCreate extends Omit<ProductOwner, 'id' | 'created_at'> {}
   export interface ValidationErrors { [key: string]: string }
   ```

**Success Criteria**:
- All 45 tests pass
- Error boundaries catch component crashes
- Comprehensive error handling for all API calls
- TypeScript strict mode compliance
- No production code beyond what's needed to pass tests

---

### BLUE PHASE (Coder-Agent) - Day 2

**Objective**: Refactor, optimize, and document

**Tasks**:
1. Add JSDoc comments to all functions
2. Extract magic numbers to constants
3. Add error boundary wrapper for API calls
4. Optimize React Query cache configuration
5. Add logging for debugging (development only)
6. Create comprehensive code comments explaining business logic

**Code Quality Checks**:
- ESLint passes with no errors
- All functions ≤50 lines
- All files ≤500 lines
- Test coverage ≥70% for this iteration

**Deliverables**:
- Refactored code with excellent documentation
- Performance optimizations in place
- All tests still passing

---

## ITERATION 2: Product Owners Table Component
**Duration**: 2-3 days
**Agent Sequence**: Tester-Agent → Coder-Agent → Coder-Agent

### RED PHASE (Tester-Agent) - Day 3 Morning

**Objective**: Define table rendering and display behavior through tests

**Test Files to Create**:

1. **`frontend/src/tests/components/ProductOwnerTable.test.tsx`** (Component tests)
   ```typescript
   describe('ProductOwnerTable', () => {
     test('renders semantic HTML table with thead, tbody, th, tr, td')
     test('renders 7 columns with correct headers')
     test('applies aria-sort="none" to all headers initially')
     test('displays product owner name correctly formatted')
     test('displays calculated age in Age column')
     test('displays DOB in correct format')
     test('displays email_1 in Email column')
     test('displays status badge with correct color')
     test('renders action buttons in Actions column')
     test('applies greyed out styling to inactive rows')
     test('positions inactive rows at bottom of table')
     test('shows loading skeleton during data fetch')
     test('shows empty state when no product owners')
     test('shows error state on API failure')
   })
   ```

2. **`frontend/src/tests/components/StatusBadge.test.tsx`** (Badge component tests - ACCESSIBILITY ENHANCED)
   ```typescript
   describe('StatusBadge', () => {
     test('renders green badge for active status')
     test('renders orange badge for lapsed status')
     test('renders grey badge for deceased status')
     test('includes proper aria-label for screen readers')

     // Accessibility tests (ADDED for WCAG compliance)
     test('displays checkmark icon for active status')
     test('displays pause icon for lapsed status')
     test('displays cross icon for deceased status')
     test('status is identifiable without color (icon + text)')
     test('meets 4.5:1 color contrast ratio')
   })
   ```

**Expected Test Results**: All tests should FAIL

---

### GREEN PHASE (Coder-Agent) - Day 3-4

**Objective**: Implement table component to pass all tests

**Files to Create**:

1. **`frontend/src/pages/ClientGroupSuite/tabs/components/ProductOwnerTable.tsx`** (~250 lines)
   - Semantic HTML table structure
   - 7 columns: Name, Relationship, Age, DOB, Email, Status, Actions
   - Loading states with skeleton
   - Empty states
   - Error states

2. **`frontend/src/pages/ClientGroupSuite/tabs/components/StatusBadge.tsx`** (~60 lines - EXPANDED for accessibility)
   - Color-coded badges for active/lapsed/deceased
   - **Icon + text for each status** (WCAG compliance - not color-only)
     - Active: Green badge + CheckCircleIcon + "Active" text
     - Lapsed: Orange badge + PauseCircleIcon + "Lapsed" text
     - Deceased: Grey badge + XCircleIcon + "Deceased" text
   - Proper ARIA labels
   - 4.5:1 minimum color contrast ratio

3. **`frontend/src/pages/ClientGroupSuite/tabs/components/PeopleSubTab.tsx`** (~150 lines)
   - Container component
   - Data fetching integration
   - "Add Person" button
   - Table integration

**Files to Modify**:

1. **`frontend/src/pages/ClientGroupSuite/tabs/BasicDetailsTab.tsx`**
   - Replace "People content coming soon" with `<PeopleSubTab />` import

**Success Criteria**:
- All table tests pass
- Renders actual data from API
- Accessibility attributes in place
- Matches design specification

---

### BLUE PHASE (Coder-Agent) - Day 4

**Objective**: Refactor table component for performance and maintainability

**Tasks**:
1. Extract reusable TableHeader component if >50 lines
2. Memoize row rendering with `React.memo`
3. Add comprehensive comments for complex rendering logic
4. Optimize re-renders using `useMemo` for derived data
5. Add PropTypes/TypeScript strict types
6. Ensure responsive design foundations

**Performance Optimizations**:
- Memoize formatFullName calls
- Cache age calculations
- Lazy load action button components

---

## ITERATION 3: Sorting Functionality
**Duration**: 1-2 days
**Agent Sequence**: Tester-Agent → Coder-Agent → Coder-Agent

### RED PHASE (Tester-Agent) - Day 5 Morning

**Test Files to Create**:

1. **`frontend/src/tests/utils/sortProductOwners.test.ts`**
   ```typescript
   describe('Sort Product Owners', () => {
     test('sorts by name alphabetically ascending')
     test('sorts by name alphabetically descending')
     test('sorts by age numerically ascending')
     test('sorts by age numerically descending')
     test('sorts by date chronologically')
     test('sorts by status (active → lapsed → deceased)')
     test('inactive rows always sort to bottom')
     test('maintains active/inactive separation')
     test('handles null values in sorting')
     test('returns to default order on third click')
   })
   ```

2. **`frontend/src/tests/components/SortableColumnHeader.test.tsx`**
   ```typescript
   describe('SortableColumnHeader', () => {
     test('displays sort arrow when sorted')
     test('applies aria-sort attribute correctly')
     test('cycles through asc → desc → default on clicks')
     test('calls onSort callback with correct parameters')
     test('shows visual indicator for current sort')
   })
   ```

**Expected Test Results**: All tests FAIL

---

### GREEN PHASE (Coder-Agent) - Day 5 Afternoon

**Files to Create**:

1. **`frontend/src/utils/sortProductOwners.ts`** (~100 lines)
   ```typescript
   export function sortProductOwners(
     productOwners: ProductOwner[],
     sortConfig: SortConfig | null
   ): ProductOwner[]
   ```

2. **`frontend/src/pages/ClientGroupSuite/tabs/components/SortableColumnHeader.tsx`** (~80 lines)
   - Clickable column headers
   - Sort direction indicators (arrows)
   - Dynamic aria-sort attributes

**Files to Modify**:

1. **`ProductOwnerTable.tsx`**
   - Add sort state management
   - Integrate SortableColumnHeader
   - Apply sorting before rendering rows

**Success Criteria**:
- All sorting tests pass
- Clicking headers cycles through sort states
- Visual indicators clear and consistent
- Inactive rows always at bottom

---

### BLUE PHASE (Coder-Agent) - Day 6 Morning

**Tasks**:
1. Extract sort comparison logic to separate functions
2. Add memoization for sorted arrays
3. Optimize sort performance for large datasets
4. Add keyboard navigation for column headers
5. Document sort algorithm choices

---

## ITERATION 4: Status Management (Lapse/Deceased/Reactivate)
**Duration**: 1-2 days
**Agent Sequence**: Tester-Agent → Coder-Agent → Coder-Agent

### RED PHASE (Tester-Agent) - Day 6 Afternoon

**Test Files to Create**:

1. **`frontend/src/tests/components/ProductOwnerActions.test.tsx`**
   ```typescript
   describe('ProductOwnerActions', () => {
     test('shows Lapse button for active product owners')
     test('shows Make Deceased button for active product owners')
     test('shows Reactivate button for inactive product owners')
     test('hides Delete button for active product owners')
     test('calls status change API on Lapse click')
     test('calls status change API on Make Deceased click')
     test('calls status change API on Reactivate click')
     test('shows loading state during status change')
     test('displays success notification on successful change')
     test('displays error notification on failed change')
     test('refetches product owners after status change')
   })
   ```

2. **`frontend/src/tests/api/updateProductOwnerStatus.test.ts`**
   ```typescript
   describe('Update Product Owner Status', () => {
     test('sends PUT request with status payload')
     test('handles successful status update')
     test('handles API errors')
     test('includes proper authentication headers')
   })
   ```

**Expected Test Results**: All tests FAIL

---

### GREEN PHASE (Coder-Agent) - Day 7

**Files to Create**:

1. **`frontend/src/pages/ClientGroupSuite/tabs/components/ProductOwnerActions.tsx`** (~120 lines)
   - Conditional button rendering based on status
   - Status change handlers
   - Loading states per action

2. **`frontend/src/services/api/updateProductOwner.ts`** (~40 lines)
   ```typescript
   export async function updateProductOwnerStatus(
     id: number,
     status: 'active' | 'lapsed' | 'deceased'
   ): Promise<ProductOwner>
   ```

**Files to Modify**:

1. **`ProductOwnerTable.tsx`**
   - Integrate ProductOwnerActions component
   - Pass refetch callback

**Success Criteria**:
- All status tests pass
- Correct buttons shown per status
- API integration working
- Optimistic UI updates

---

### BLUE PHASE (Coder-Agent) - Day 7 Afternoon

**Tasks**:
1. Add confirmation tooltips for destructive actions
2. Implement optimistic UI updates
3. Add keyboard shortcuts for common actions
4. Document status transition flow
5. Add analytics tracking (if applicable)

---

## ITERATION 5: Delete Functionality with Confirmation
**Duration**: 1 day
**Agent Sequence**: Tester-Agent → Coder-Agent → Coder-Agent

### RED PHASE (Tester-Agent) - Day 8 Morning

**Test Files to Create**:

1. **`frontend/src/tests/components/DeleteConfirmationModal.test.tsx`**
   ```typescript
   describe('DeleteConfirmationModal', () => {
     test('renders modal with product owner name')
     test('shows warning icon and message')
     test('has Cancel and Delete buttons')
     test('closes modal on Cancel click')
     test('calls delete API on Delete click')
     test('shows loading state during deletion')
     test('closes modal on successful deletion')
     test('keeps modal open on deletion error')
     test('displays error message on failure')
     test('refetches product owners after deletion')
     test('closes on Escape key press')
     test('traps focus within modal')
   })
   ```

**Expected Test Results**: All tests FAIL

---

### GREEN PHASE (Coder-Agent) - Day 8 Afternoon

**Files to Create**:

1. **`frontend/src/pages/ClientGroupSuite/tabs/components/DeleteConfirmationModal.tsx`** (~100 lines)
   - HeadlessUI Dialog component
   - Warning message with product owner name
   - Cancel/Delete buttons
   - Loading state
   - Focus trap

2. **`frontend/src/services/api/deleteProductOwner.ts`** (~30 lines)
   ```typescript
   export async function deleteProductOwner(id: number): Promise<void>
   ```

**Files to Modify**:

1. **`ProductOwnerActions.tsx`**
   - Add Delete button for inactive owners
   - Trigger modal on click

**Success Criteria**:
- All delete tests pass
- Modal opens/closes correctly
- Deletion only works for inactive owners
- Confirmation prevents accidental deletes

---

### BLUE PHASE (Coder-Agent) - Day 8 Evening

**Tasks**:
1. Add animations for modal open/close
2. Improve error messaging specificity
3. Add undo functionality (optional stretch goal)
4. Document deletion workflow
5. Add audit logging preparation

---

## ITERATION 6: Edit Modal with Progressive Disclosure
**Duration**: 6-8 days (INCREASED - addresses modal complexity underestimate)
**Agent Sequence**: Planner-Agent → Tester-Agent → Coder-Agent → Coder-Agent

### Planning Phase (Planner-Agent) - Day 9 Morning

**Objective**: Break down 30-field modal into manageable components with preemptive splitting strategy

**Critical Architectural Decision**:
⚠️ **Preemptive Modal Splitting Strategy** - EditProductOwnerModal.tsx will exceed 500-line limit without proper architecture:
- Predicted size: 400-450 lines for main modal
- Predicted size per section: PersonalDetailsSection (~150), ContactAddressSection (~150), EmploymentComplianceSection (~150)
- Total before refactor: ~850 lines across 4 files (within limits)

**Breakdown Plan**:
1. **BaseProductOwnerModal.tsx** (~200 lines) - Shared modal shell for Create/Edit
   - HeadlessUI Dialog wrapper
   - Modal header with dynamic title
   - Tab navigation structure
   - Save/Cancel footer
   - Focus management and keyboard handlers

2. **Tab Section Components** (3 separate files)
   - PersonalDetailsSection.tsx (~150 lines) - 10 fields
   - ContactAddressSection.tsx (~150 lines) - 10 fields
   - EmploymentComplianceSection.tsx (~150 lines) - 9 fields

3. **Form State Management** (React Hook Form)
   - Centralized validation schema
   - Form context provider

4. **EditProductOwnerModal.tsx** (~150 lines) - Orchestration only
   - Wraps BaseProductOwnerModal
   - Provides pre-populated values from product owner
   - Handles update API call

---

### RED PHASE (Tester-Agent) - Day 9 Afternoon to Day 10

**Test Files to Create**:

1. **`frontend/src/tests/components/EditProductOwnerModal.test.tsx`** (Comprehensive)
   ```typescript
   describe('EditProductOwnerModal', () => {
     // Modal behavior
     test('opens modal on Edit button click')
     test('closes modal on Cancel button click')
     test('closes modal on Escape key press')
     test('traps focus within modal')
     test('returns focus to trigger on close')

     // Tab navigation
     test('renders three tabs: Personal, Contact, Employment')
     test('Personal Details tab is active by default')
     test('switches tabs on click')
     test('maintains form state when switching tabs')

     // Form fields - Personal Details tab
     test('displays all 10 personal fields')
     test('pre-populates fields with product owner data')
     test('firstname field is marked required')
     test('surname field is marked required')

     // Form fields - Contact & Address tab
     test('displays all 10 contact/address fields')
     test('email fields validate email format')

     // Form fields - Employment & Compliance tab
     test('displays all 9 employment/compliance fields')
     test('NI Number validates UK format')
     test('date fields validate date format')

     // Validation
     test('shows error for empty required field')
     test('shows error for invalid email')
     test('shows error for invalid NI number')
     test('prevents submission with validation errors')

     // Save functionality
     test('calls update API with all form data on save')
     test('shows loading state on save button')
     test('closes modal on successful save')
     test('refetches product owners on successful save')
     test('shows success notification on save')
     test('shows error notification on save failure')
     test('keeps modal open on save failure')
   })
   ```

2. **`frontend/src/tests/components/FormFieldPersonal.test.tsx`**
3. **`frontend/src/tests/components/FormFieldContact.test.tsx`**
4. **`frontend/src/tests/components/FormFieldEmployment.test.tsx`**

**Expected Test Results**: All 50+ tests FAIL

---

### GREEN PHASE (Coder-Agent) - Day 11-12

**Files to Create**:

1. **`frontend/src/pages/ClientGroupSuite/tabs/components/EditProductOwnerModal.tsx`** (~400 lines split into sections)
   - HeadlessUI Dialog wrapper
   - Tab navigation using HeadlessUI Tabs
   - Form structure with React Hook Form

2. **`frontend/src/pages/ClientGroupSuite/tabs/components/modal-sections/PersonalDetailsSection.tsx`** (~150 lines)
   - 10 form fields: Title, Firstname, Surname, Middle Names, Known As, Gender, DOB, Place of Birth, Relationship Status, Previous Names, Status

3. **`frontend/src/pages/ClientGroupSuite/tabs/components/modal-sections/ContactAddressSection.tsx`** (~150 lines)
   - 10 form fields: Email 1, Email 2, Phone 1, Phone 2, Address Lines 1-5, Moved In Date

4. **`frontend/src/pages/ClientGroupSuite/tabs/components/modal-sections/EmploymentComplianceSection.tsx`** (~150 lines)
   - 9 form fields: Employment Status, Occupation, Three Words, Share Data With, NI Number, Passport Expiry, AML Result, AML Date

5. **`frontend/src/utils/validation/productOwnerValidation.ts`** (~100 lines)
   ```typescript
   export function validateProductOwner(data: Partial<ProductOwner>): ValidationErrors
   export function isValidEmail(email: string): boolean
   export function isValidNINumber(niNumber: string): boolean
   ```

**Files to Modify**:

1. **`ProductOwnerTable.tsx`**
   - Add row click handler to open edit modal
   - Pass edit handler to ProductOwnerActions

**Key Implementation Details**:
- Use `react-hook-form` for form state management
- Use existing `BaseInput`, `DateInput`, `NumberInput` components
- Implement HeadlessUI `Tab.Group`, `Tab.List`, `Tab.Panels`
- Two-column grid layout within each tab section
- Real-time validation on blur

**Success Criteria**:
- All 50+ modal tests pass
- Modal opens/closes smoothly
- All 30 fields render correctly
- Validation works properly
- Form state persists across tabs
- Save functionality works

---

### BLUE PHASE (Coder-Agent) - Day 13

**Tasks**:
1. Extract form sections into separate files if >500 lines
2. Add field-level help text/tooltips
3. Optimize form rendering with field-level memoization
4. Add unsaved changes warning
5. Implement keyboard shortcuts (Ctrl+S to save)
6. Add comprehensive form documentation
7. Optimize tab switching performance
8. Add field dependencies (e.g., show Ongoing Client Date only if Type = "Ongoing")

**Performance Optimizations**:
- Lazy load tab content
- Debounce validation
- Memoize field components

---

## ITERATION 7: Create Product Owner Modal
**Duration**: 2-3 days
**Agent Sequence**: Tester-Agent → Coder-Agent → Coder-Agent

### RED PHASE (Tester-Agent) - Day 14 Morning

**Test Files to Create**:

1. **`frontend/src/tests/components/CreateProductOwnerModal.test.tsx`**
   ```typescript
   describe('CreateProductOwnerModal', () => {
     test('opens modal on Add Person button click')
     test('displays "Add New Person" title')
     test('renders all three tabs like Edit modal')
     test('all fields start empty')
     test('status defaults to active')
     test('validates required fields on submit')
     test('calls create API with form data')
     test('calls associate API with client group ID')
     test('shows loading state during creation')
     test('closes modal on successful creation')
     test('refetches product owners after creation')
     test('shows success notification with person name')
     test('shows error notification on failure')
     test('keeps modal open on failure')
   })
   ```

2. **`frontend/src/tests/api/createProductOwner.test.ts`**
   ```typescript
   describe('Create Product Owner', () => {
     test('sends POST request to /product-owners')
     test('sends POST request to /client-group-product-owners')
     test('handles successful creation')
     test('handles API errors')
     test('validates required fields')
   })
   ```

**Expected Test Results**: All tests FAIL

---

### GREEN PHASE (Coder-Agent) - Day 14 Afternoon to Day 15

**Files to Create**:

1. **`frontend/src/pages/ClientGroupSuite/tabs/components/CreateProductOwnerModal.tsx`** (~200 lines)
   - Reuse form sections from Edit modal
   - Empty initial values
   - Two-step creation workflow

2. **`frontend/src/services/api/createProductOwner.ts`** (~60 lines)
   ```typescript
   export async function createProductOwner(data: ProductOwnerCreate): Promise<ProductOwner>
   export async function associateProductOwner(clientGroupId: string, productOwnerId: number): Promise<void>
   ```

**Files to Modify**:

1. **`PeopleSubTab.tsx`**
   - Add "+ Add Person" button
   - Modal state management
   - Open modal handler

**Success Criteria**:
- All create tests pass
- Modal opens from Add button
- Two-step API workflow works
- Product owner appears in table after creation
- Proper error handling

---

### BLUE PHASE (Coder-Agent) - Day 15 Afternoon

**Tasks**:
1. Extract shared modal logic between Create/Edit
2. Add "Save & Add Another" button option
3. Optimize API calls (consider batch operations)
4. Add success animation/feedback
5. Document creation workflow
6. Add field auto-population (e.g., same address as another person)

---

## ITERATION 8: Accessibility, Integration Testing & Polish
**Duration**: 4-5 days (INCREASED and SPLIT into Phase 8A and 8B)
**Agent Sequence**: Tester-Agent → Coder-Agent → Coder-Agent

**Note**: This iteration is split into two sub-phases due to comprehensive scope:
- **Phase 8A** (Days 16-17): Accessibility & Integration Testing
- **Phase 8B** (Days 18-20): Performance, Polish & Final QA

---

### PHASE 8A: Accessibility & Integration

#### RED PHASE (Tester-Agent) - Day 16

**Test Files to Create**:

1. **`frontend/src/tests/accessibility/PeopleTab.a11y.test.tsx`** (EXPANDED)
   ```typescript
   describe('People Tab Accessibility', () => {
     // Semantic HTML tests
     test('table has proper ARIA roles and labels')
     test('column headers have scope="col"')
     test('sort buttons have aria-sort attributes')
     test('status badges have aria-label')
     test('action buttons have descriptive aria-label (e.g., "Edit John Smith")')

     // Modal accessibility
     test('modals have aria-labelledby and aria-describedby')
     test('focus trap works in modals')
     test('focus returns to trigger on modal close')
     test('modal tabs have proper aria-controls and aria-selected')

     // Keyboard navigation
     test('keyboard navigation works for table rows')
     test('all interactive elements keyboard accessible')
     test('Tab key cycles through interactive elements')
     test('Escape key closes modals')

     // Visual accessibility
     test('color contrast meets WCAG 2.1 AA (4.5:1)')
     test('status is identifiable without color (icons present)')
     test('touch targets meet 44x44px minimum')

     // Screen reader support
     test('screen reader announces row count')
     test('aria-live region announces status changes')
     test('aria-live region announces successful saves')
     test('aria-live region announces errors')
     test('form validation errors announced to screen readers')
   })
   ```

2. **`frontend/src/tests/integration/PeopleTabFlow.test.tsx`** (E2E scenarios - EXPANDED)
   ```typescript
   describe('People Tab Complete Flows', () => {
     // CRUD flows
     test('complete flow: create new product owner')
     test('complete flow: edit existing product owner')
     test('complete flow: lapse active product owner')
     test('complete flow: reactivate lapsed product owner')
     test('complete flow: delete inactive product owner')

     // Sorting flows
     test('complete flow: sort by multiple columns')
     test('complete flow: inactive rows stay at bottom when sorting')

     // Error recovery flows
     test('error recovery: handle network failure gracefully')
     test('error recovery: handle validation errors')
     test('error recovery: recover from 500 server error')
     test('error recovery: retry failed API calls')

     // Performance flows
     test('complete flow: handle 50 product owners smoothly')
     test('complete flow: handle 100 product owners (stress test)')
   })
   ```

3. **`frontend/src/tests/performance/PeopleTabPerformance.test.tsx`** (NEW - Performance tests)
   ```typescript
   describe('People Tab Performance', () => {
     test('table loads in <2 seconds with 50 product owners')
     test('sorting completes in <100ms')
     test('modal opens in <200ms')
     test('form submission completes in <500ms')
     test('no memory leaks after 10 CRUD operations')
   })
   ```

**Expected Test Results**: Accessibility tests MAY pass partially; integration/performance tests will FAIL

---

#### GREEN PHASE (Coder-Agent) - Day 17

**Accessibility Fixes**:
1. **Add missing ARIA attributes throughout**
   - `aria-labelledby` and `aria-describedby` on modals
   - `aria-controls` and `aria-selected` on tabs
   - `aria-label` with context on action buttons (e.g., "Edit John Smith")

2. **Add aria-live announcements** (NEW - Critical for screen readers)
   - Create `<div role="status" aria-live="polite" aria-atomic="true" className="sr-only">` in PeopleSubTab
   - Announce status changes: "Status changed to lapsed"
   - Announce successful saves: "Product owner details saved successfully"
   - Announce errors: "Failed to save changes. Please try again."
   - Announce table updates: "Table sorted by name ascending"

3. **Fix keyboard navigation issues**
   - Ensure Tab key cycles through all interactive elements
   - Escape key closes modals
   - Modal tabs keyboard navigable with Arrow keys

4. **Ensure proper focus management**
   - Focus returns to trigger element after modal close
   - Focus trap working in modals
   - Skip links for keyboard users

5. **Fix color contrast issues** (if any found)
   - Ensure all text meets 4.5:1 ratio
   - Button states have sufficient contrast

6. **Touch target compliance**
   - All interactive elements ≥44x44px
   - Add CSS to increase touch targets on mobile

**Integration & Performance Improvements**:
1. Ensure all flows work end-to-end
2. Add proper error recovery
3. Implement retry logic for failed API calls
4. Add network status indicators
5. Improve loading state clarity
6. Validate performance benchmarks met

**Success Criteria**:
- All accessibility tests pass
- Lighthouse accessibility score 100%
- All integration tests pass
- Performance benchmarks met (<2s load, <100ms sort)
- Complete user flows work seamlessly

---

### PHASE 8B: Performance & Final Polish

#### BLUE PHASE (Coder-Agent) - Day 18-20

**Final Polish Tasks**:

1. **Performance Optimization**
   - Run Lighthouse performance audit
   - Optimize bundle size (code splitting)
   - Lazy load modals and heavy components
   - Add React Query optimizations
   - Implement virtualization if needed (>100 rows)

2. **Visual Polish**
   - Consistent spacing and alignment
   - Smooth animations and transitions
   - Loading skeletons for all async operations
   - Empty states with helpful illustrations
   - Error states with actionable messages

3. **Code Quality**
   - Run full ESLint check
   - Fix all TypeScript strict mode errors
   - Ensure all files ≤500 lines
   - Ensure all functions ≤50 lines
   - Add missing documentation
   - Remove debug logs

4. **Documentation**
   - Add inline code comments
   - Create component usage examples
   - Document complex business logic
   - Update architecture documentation
   - Create user-facing help text

5. **Final Testing**
   - Run full test suite
   - Verify ≥70% coverage
   - Manual QA testing
   - Cross-browser testing (Chrome, Firefox, Safari)
   - Responsive design testing (desktop, tablet, mobile)
   - Accessibility testing with screen reader

**Final Deliverables**:
- Fully functional People Tab feature
- ≥70% test coverage
- 100% accessibility score
- All code standards met
- Comprehensive documentation

---

## Dependencies Between Iterations

```
ITERATION 1 (Data Layer)
    ↓ (Required for table data)
ITERATION 2 (Table Display)
    ↓ (Required for interactive table)
ITERATION 3 (Sorting)
    ↓ (Required for action buttons)
ITERATION 4 (Status Management)
    ↓ (Required for delete modal)
ITERATION 5 (Delete Functionality)
    ↓ (Required for edit modal)
ITERATION 6 (Edit Modal)
    ↓ (Reuses edit modal components)
ITERATION 7 (Create Modal)
    ↓ (Polishes all features)
ITERATION 8 (Accessibility & Polish)
```

**Critical Path**: Iterations 1→2→6→7 (longest dependency chain)

---

## File Organization Structure

```
frontend/src/
├── pages/ClientGroupSuite/
│   └── tabs/
│       ├── BasicDetailsTab.tsx (MODIFY)
│       └── components/
│           ├── PeopleSubTab.tsx (CREATE - main container)
│           ├── ProductOwnerTable.tsx (CREATE - table display)
│           ├── ProductOwnerRow.tsx (CREATE - individual row - optional)
│           ├── ProductOwnerActions.tsx (CREATE - action buttons)
│           ├── StatusBadge.tsx (CREATE - status display)
│           ├── SortableColumnHeader.tsx (CREATE - sortable headers)
│           ├── EditProductOwnerModal.tsx (CREATE - edit modal)
│           ├── CreateProductOwnerModal.tsx (CREATE - create modal)
│           ├── DeleteConfirmationModal.tsx (CREATE - delete modal)
│           └── modal-sections/
│               ├── PersonalDetailsSection.tsx (CREATE)
│               ├── ContactAddressSection.tsx (CREATE)
│               └── EmploymentComplianceSection.tsx (CREATE)
├── hooks/
│   └── useProductOwners.ts (CREATE - data fetching hook)
├── services/api/
│   ├── productOwners.ts (CREATE - API client)
│   ├── updateProductOwner.ts (CREATE)
│   ├── createProductOwner.ts (CREATE)
│   └── deleteProductOwner.ts (CREATE)
├── utils/
│   ├── productOwnerHelpers.ts (CREATE - helper functions)
│   ├── sortProductOwners.ts (CREATE - sorting logic)
│   └── validation/
│       └── productOwnerValidation.ts (CREATE - validation)
├── types/
│   └── productOwner.ts (CREATE - TypeScript interfaces)
└── tests/
    ├── api/
    │   ├── productOwners.test.ts (CREATE)
    │   ├── updateProductOwnerStatus.test.ts (CREATE)
    │   └── createProductOwner.test.ts (CREATE)
    ├── hooks/
    │   └── useProductOwners.test.ts (CREATE)
    ├── utils/
    │   ├── productOwnerHelpers.test.ts (CREATE)
    │   └── sortProductOwners.test.ts (CREATE)
    ├── components/
    │   ├── ProductOwnerTable.test.tsx (CREATE)
    │   ├── StatusBadge.test.tsx (CREATE)
    │   ├── SortableColumnHeader.test.tsx (CREATE)
    │   ├── ProductOwnerActions.test.tsx (CREATE)
    │   ├── DeleteConfirmationModal.test.tsx (CREATE)
    │   ├── EditProductOwnerModal.test.tsx (CREATE)
    │   ├── CreateProductOwnerModal.test.tsx (CREATE)
    │   ├── FormFieldPersonal.test.tsx (CREATE)
    │   ├── FormFieldContact.test.tsx (CREATE)
    │   └── FormFieldEmployment.test.tsx (CREATE)
    ├── accessibility/
    │   └── PeopleTab.a11y.test.tsx (CREATE)
    └── integration/
        └── PeopleTabFlow.test.tsx (CREATE)
```

**Total New Files**: ~40 files
**Modified Files**: 1 file (BasicDetailsTab.tsx)

---

## Technology Stack & Dependencies

### Existing Dependencies (Already in Project)
- React 18.x
- TypeScript 4.x+
- Tailwind CSS
- React Query
- @heroicons/react
- Jest + React Testing Library
- Existing UI components (`ActionButton`, `BaseInput`, `DateInput`, etc.)

### New Dependencies to Install
```bash
npm install @headlessui/react
npm install react-hook-form
```

**Rationale**:
- **@headlessui/react**: Accessible modal dialogs with built-in focus management (specified in spec)
- **react-hook-form**: Best practice for complex forms (30 fields), better performance than manual state

---

## Risk Assessment & Mitigation

### Risk 1: Modal Form Complexity (30 Fields)
**Probability**: High
**Impact**: High
**Mitigation**:
- Use progressive disclosure (tabs) to reduce cognitive load
- Implement react-hook-form for performance
- Create reusable form field components
- Test each tab section independently
- Add field-level validation to catch errors early

### Risk 2: Test Coverage Not Meeting 70% Threshold
**Probability**: Medium
**Impact**: High
**Mitigation**:
- Write tests FIRST (TDD approach ensures coverage)
- Track coverage after each iteration
- Focus on critical paths first (CRUD operations)
- Use coverage reports to identify gaps
- Add integration tests for complex flows

### Risk 3: Performance Issues with Large Tables (>100 rows)
**Probability**: Low (most client groups have <20 product owners)
**Impact**: Medium
**Mitigation**:
- Implement memoization for expensive calculations
- Add virtualization if needed (stretch goal)
- Optimize re-renders with React.memo
- Use React Query caching effectively
- Monitor performance with React DevTools Profiler

### Risk 4: Accessibility Failures
**Probability**: Low (following WCAG 2.1 AA standards)
**Impact**: High
**Mitigation**:
- Use semantic HTML throughout
- Add ARIA attributes from the start
- Test with screen readers during development
- Run Lighthouse accessibility audits
- Use HeadlessUI for accessible modals

### Risk 5: Backend API Issues
**Probability**: Low (all endpoints verified to exist)
**Impact**: Medium
**Mitigation**:
- Add comprehensive error handling
- Implement retry logic for network failures
- Show clear error messages to users
- Add fallback UI states
- Mock API responses for testing

---

## Success Metrics

### Functional Completeness
- ✅ All user stories from specification implemented
- ✅ All CRUD operations working
- ✅ Sorting works on all columns
- ✅ Status transitions work correctly
- ✅ Modals open/close smoothly
- ✅ Create product owner functionality complete

### Code Quality
- ✅ Test coverage ≥70%
- ✅ All files ≤500 lines
- ✅ All functions ≤50 lines
- ✅ ESLint passes with zero errors
- ✅ TypeScript strict mode enabled

### Performance
- ✅ Table loads in <2 seconds for 50 product owners
- ✅ Sorting completes in <100ms
- ✅ Modal opens in <200ms
- ✅ API responses in <500ms

### Accessibility
- ✅ Lighthouse accessibility score: 100%
- ✅ Keyboard navigation fully functional
- ✅ Screen reader compatible
- ✅ WCAG 2.1 AA compliant
- ✅ Color contrast ratios meet standards

### User Experience
- ✅ Clear loading states
- ✅ Helpful error messages
- ✅ Intuitive navigation
- ✅ Responsive design (desktop/tablet/mobile)
- ✅ Smooth animations and transitions

---

## Agent Assignment Summary

### Tester-Agent Tasks (RED Phases)
**Total Time**: ~7-9 days across all iterations (increased for comprehensive testing)

**Responsibilities**:
1. Write comprehensive test suites before implementation
2. Define expected behavior through test cases
3. **Ensure tests cover edge cases and error scenarios** (doubled negative test cases)
4. Create accessibility test suites with WCAG compliance tests
5. Write integration tests for complete flows
6. **Add performance test suites** (NEW)

**Key Deliverables**:
- **~18 test files** (up from 15)
- **~280+ individual test cases** (up from 200+)
  - Added: 45 error handling tests (Iteration 1)
  - Added: 10 accessibility tests (Iteration 2)
  - Added: 12 integration tests (Iteration 8)
  - Added: 5 performance tests (Iteration 8)
- Accessibility test suite with 20+ WCAG tests
- Integration test suite with error recovery scenarios
- **Performance test suite** (NEW)

---

### Coder-Agent Tasks (GREEN Phases)
**Total Time**: ~11-14 days across all iterations (increased for implementation complexity)

**Responsibilities**:
1. Implement minimal code to pass tests
2. Create component structures
3. Integrate with APIs
4. Build UI components
5. Implement business logic
6. **Add error boundaries and error handling** (NEW - Iteration 1)
7. **Implement accessibility features progressively** (icons, ARIA, aria-live)

**Key Deliverables**:
- **~30 production files** (up from 25)
  - Added: ErrorBoundary.tsx, errorHandling.ts (Iteration 1)
  - Added: BaseProductOwnerModal.tsx (Iteration 6)
  - Added: Performance optimization files (Iteration 8)
- All tests passing
- Working features
- **Comprehensive error handling throughout**

---

### Coder-Agent Tasks (BLUE Phases)
**Total Time**: ~5-7 days across all iterations (increased for quality and polish)

**Responsibilities**:
1. Refactor code for maintainability
2. Optimize performance (including benchmarking)
3. Add comprehensive documentation
4. Extract reusable components
5. Polish UI/UX
6. Final quality assurance
7. **Accessibility polish** (aria-live, touch targets, contrast)
8. **Performance optimization** (bundle size, lazy loading, memoization)

**Key Deliverables**:
- Optimized codebase
- Comprehensive documentation
- Production-ready features
- **100% Lighthouse accessibility score**
- **Performance benchmarks met** (<2s load, <100ms sort)

---

### Planner-Agent Tasks
**Total Time**: ~0.5 days

**Responsibilities**:
1. Break down complex features (Edit Modal)
2. Create component hierarchies
3. Plan file organization
4. Review overall progress

**Key Deliverables**:
- Feature breakdown plans
- Component architecture diagrams

---

## Timeline Summary (REVISED)

| Iteration | Duration | Cumulative | Agent(s) | Phase | Change |
|-----------|----------|------------|----------|-------|--------|
| **Phase 0: API Validation** | 1 day | Day 1 | Coder | Validation | **NEW** |
| 1: Data Layer | 2.5-3.5 days | Day 2-4.5 | Tester → Coder → Coder | RED-GREEN-BLUE | +0.5 days (error handling) |
| 2: Table | 2-3 days | Day 4.5-7.5 | Tester → Coder → Coder | RED-GREEN-BLUE | No change |
| 3: Sorting | 1-2 days | Day 7.5-9.5 | Tester → Coder → Coder | RED-GREEN-BLUE | No change |
| 4: Status | 1-2 days | Day 9.5-11.5 | Tester → Coder → Coder | RED-GREEN-BLUE | No change |
| 5: Delete | 1 day | Day 11.5-12.5 | Tester → Coder → Coder | RED-GREEN-BLUE | No change |
| 6: Edit Modal | **6-8 days** | Day 12.5-20.5 | Planner → Tester → Coder → Coder | Plan-RED-GREEN-BLUE | **+2-3 days** (complexity) |
| 7: Create Modal | 2-3 days | Day 20.5-23.5 | Tester → Coder → Coder | RED-GREEN-BLUE | No change |
| 8A: Accessibility & Integration | 2 days | Day 23.5-25.5 | Tester → Coder | RED-GREEN | **SPLIT** from Iteration 8 |
| 8B: Performance & Polish | 2-3 days | Day 25.5-28.5 | Coder | BLUE | **SPLIT** from Iteration 8 |

**Total Duration**: 20-28 days (revised from 13-19 days)
**Average**: 24 days (~4.8 weeks / 1 month)

**Key Changes**:
- ✅ Added Phase 0 for upfront API validation (reduces risk)
- ✅ Increased Iteration 1 for comprehensive error handling
- ✅ Increased Iteration 6 by 40% (6-8 days) for modal complexity
- ✅ Split Iteration 8 into 8A and 8B for proper allocation
- ✅ Total increase: +7-9 days (+54% more realistic)

---

## Post-Implementation Checklist

### Before Considering Complete
- [ ] All tests passing (≥70% coverage)
- [ ] No ESLint errors or warnings
- [ ] No TypeScript errors
- [ ] All files ≤500 lines
- [ ] All functions ≤50 lines
- [ ] Lighthouse accessibility score: 100%
- [ ] Manual QA testing completed
- [ ] Cross-browser testing completed
- [ ] Responsive design verified
- [ ] Screen reader testing completed
- [ ] Documentation updated
- [ ] Code reviewed by peer (if applicable)
- [ ] Feature demo prepared

### Deployment Readiness
- [ ] All API endpoints tested in staging
- [ ] Database migrations (if any) prepared
- [ ] Rollback plan documented
- [ ] Performance benchmarks met
- [ ] Security review completed
- [ ] User training materials created (if needed)
- [ ] Feature flag configured (optional)

---

## Future Enhancements (Post-Launch)

### Phase 2 Features (Not in Current Plan)
1. Search & filtering across all fields
2. Bulk operations (multi-select)
3. Drag-and-drop ordering
4. Export to CSV/Excel
5. Audit history tracking
6. Column customization
7. Advanced filters
8. Duplicate detection

### Performance Optimizations
1. Virtual scrolling for 100+ rows
2. Server-side pagination
3. Progressive loading
4. Prefetching on hover
5. Service worker caching

---

## Conclusion

This implementation plan provides a **structured, test-driven approach** to building the Phase 2 People Tab feature. By following the **RED-GREEN-BLUE TDD methodology** across 1 validation phase + 8 well-defined iterations, we ensure:

✅ **High Code Quality**: Every feature backed by 280+ comprehensive tests
✅ **Maintainability**: Small, focused components under size limits (preemptive splitting)
✅ **Accessibility**: WCAG 2.1 AA compliance from day one (progressive implementation)
✅ **Performance**: Optimized rendering and API calls (validated with performance tests)
✅ **Predictability**: Clear timeline with defined deliverables
✅ **Error Resilience**: Comprehensive error handling and recovery
✅ **Risk Mitigation**: Upfront API validation reduces late-stage surprises

The plan adheres to all project standards including the **SPARC methodology**, **70% test coverage**, and **file/function size limits**. Each iteration builds on the previous one, with clear dependencies and agent assignments.

**Estimated completion**: 20-28 days (average 24 days / ~1 month) with proper agent collaboration following this plan.

**Success Probability**: 85% (high confidence based on critical analysis and implemented improvements)

---

## Document Version History

| Version | Date | Changes | Reason |
|---------|------|---------|--------|
| 1.0 | 2025-12-05 | Initial plan created | Based on Phase2_People_Tab_Specification.md |
| 2.0 | 2025-12-05 | **Major revision based on 7-expert critical analysis** | Fixed timeline underestimates, testing gaps, and accessibility concerns |

**v2.0 Key Changes**:
- Timeline: 13-19 days → 20-28 days (+54% increase)
- Test cases: 200+ → 280+ (+40% increase)
- Added: Phase 0 (API validation), ErrorBoundary, aria-live, performance tests
- Fixed: Modal splitting strategy, accessibility compliance, error handling
- Success probability: 60% → 85%

---

**Plan Location**: `docs/implementation_plans/Phase2_People_Tab_Implementation_Plan.md`
**Critical Analysis**: `critical_analysis/analysis_20251205_144259.md`
**Specification**: `docs/specifications/Phase2_People_Tab_Specification.md`
