# Integration Test Scenarios - Special Relationships
**Addresses Critical Analysis Issue #5: Integration Testing Is Underspecified**

## Executive Summary

This document provides **15 detailed integration test scenarios** with exact steps, expected behaviors, and React Query cache expectations. The critical analysis identified that Cycle 10 (Integration) allocated only 2 hours with no concrete test scenarios, creating risk of bugs discovered during UAT requiring 8-10 hours of debugging.

**This document eliminates that risk** by providing:
- Detailed user flows from start to finish
- Expected UI states at each step
- React Query cache behavior verification
- Error handling scenarios
- Accessibility integration checks
- Cross-tab data synchronization tests

**Target**: All scenarios pass automated integration tests + manual verification.

---

## Table of Contents

1. [Test Environment Setup](#test-environment-setup)
2. [Core CRUD Scenarios (1-5)](#core-crud-scenarios)
3. [React Query Integration Scenarios (6-8)](#react-query-integration-scenarios)
4. [Modal & Focus Management Scenarios (9-11)](#modal--focus-management-scenarios)
5. [Sorting & Filtering Scenarios (12-13)](#sorting--filtering-scenarios)
6. [Error Handling Scenarios (14-15)](#error-handling-scenarios)
7. [Automated Test Implementation](#automated-test-implementation)

---

## Test Environment Setup

### Prerequisites

```typescript
// Test setup file (setupTests.ts)
import '@testing-library/jest-dom';
import { server } from './mocks/server';

// Establish API mocking before all tests
beforeAll(() => server.listen());

// Reset handlers after each test
afterEach(() => server.resetHandlers());

// Cleanup after all tests
afterAll(() => server.close());
```

### Mock Data Factory

```typescript
// mocks/specialRelationshipMocks.ts
export function createMockPersonalRelationship(overrides = {}) {
  return {
    id: 'rel-personal-1',
    client_group_id: 'cg-1',
    name: 'John Doe',
    relationship_type: 'Child',
    is_professional: false,
    date_of_birth: '1990-01-15',
    age: 34,
    is_dependent: false,
    email: 'john.doe@example.com',
    phone_number: '01234 567890',
    status: 'Active',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides
  };
}

export function createMockProfessionalRelationship(overrides = {}) {
  return {
    id: 'rel-prof-1',
    client_group_id: 'cg-1',
    name: 'Jane Smith',
    relationship_type: 'Accountant',
    is_professional: true,
    email: 'jane.smith@accounting.com',
    phone_number: '07890 123456',
    associated_product_owners: ['po-1', 'po-2'],
    product_owner_names: ['Alice Johnson', 'Bob Williams'],
    status: 'Active',
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-02T00:00:00Z',
    ...overrides
  };
}
```

---

## Core CRUD Scenarios

### Scenario 1: Create Personal Relationship - Full Flow

**Purpose**: Verify complete create flow from button click to table display.

**Steps**:

1. **Navigate to Special Relationships tab**
   - User clicks "Special Relationships" sub-tab in BasicDetailsTab
   - Expected: SpecialRelationshipsSubTab renders with Personal tab active by default

2. **Click Add Relationship button**
   - User clicks "Add Relationship" button
   - Expected: CreateSpecialRelationshipModal opens
   - Expected: Focus moves to first form field (Name input)
   - Expected: Modal has `aria-modal="true"`, `role="dialog"`

3. **Fill out personal relationship form**
   - User enters:
     - Name: "Sarah Doe"
     - Relationship Type: "Daughter" (select from dropdown)
     - Date of Birth: "20/06/2005" (English format)
     - Dependency: Check "Is this person a dependent?"
     - Email: "sarah.doe@example.com"
     - Phone: "07123 456789"
     - Status: "Active" (default)
   - Expected: Form fields update as user types
   - Expected: No validation errors shown (all valid inputs)

4. **Submit form**
   - User clicks "Add Relationship" button
   - Expected: Loading state shown on button ("Adding...")
   - Expected: POST request sent to `/api/special_relationships`
   - Expected: Request body matches form data

5. **Verify successful creation**
   - Expected: Modal closes automatically
   - Expected: Focus restored to "Add Relationship" button
   - Expected: Toast notification: "Sarah Doe added successfully"
   - Expected: Live region announces: "Relationship added: Sarah Doe"
   - Expected: New row appears in Personal table (Sarah Doe at correct sort position)
   - Expected: Row is NOT greyed out (status is Active)

6. **Verify React Query cache**
   - Expected: Query key `['specialRelationships', 'cg-1']` invalidated
   - Expected: Fresh data fetched from API
   - Expected: New relationship included in cached data

**Automated Test**:

```typescript
test('Scenario 1: Create personal relationship - full flow', async () => {
  const { user } = render(<SpecialRelationshipsSubTab clientGroupId="cg-1" />);

  // Step 1: Wait for initial load
  await waitFor(() => {
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });

  // Step 2: Click Add Relationship
  const addButton = screen.getByRole('button', { name: /add relationship/i });
  await user.click(addButton);

  // Step 3: Verify modal opens and has focus
  const modal = screen.getByRole('dialog', { name: /add personal relationship/i });
  expect(modal).toBeInTheDocument();
  expect(modal).toHaveAttribute('aria-modal', 'true');

  // Step 4: Fill form
  const nameInput = screen.getByLabelText(/name/i);
  await user.type(nameInput, 'Sarah Doe');

  const relationshipTypeInput = screen.getByLabelText(/relationship type/i);
  await user.type(relationshipTypeInput, 'Daughter');
  await user.keyboard('{Enter}');

  const dobInput = screen.getByLabelText(/date of birth/i);
  await user.type(dobInput, '20/06/2005');

  const dependencyCheckbox = screen.getByLabelText(/is this person a dependent/i);
  await user.click(dependencyCheckbox);

  const emailInput = screen.getByLabelText(/email/i);
  await user.type(emailInput, 'sarah.doe@example.com');

  const phoneInput = screen.getByLabelText(/phone/i);
  await user.type(phoneInput, '07123 456789');

  // Step 5: Submit form
  const submitButton = screen.getByRole('button', { name: /add relationship/i });
  await user.click(submitButton);

  // Step 6: Verify modal closes
  await waitFor(() => {
    expect(modal).not.toBeInTheDocument();
  });

  // Step 7: Verify toast notification
  expect(await screen.findByText(/sarah doe added successfully/i)).toBeInTheDocument();

  // Step 8: Verify new row in table
  const sarahRow = await screen.findByRole('row', { name: /sarah doe.*daughter/i });
  expect(sarahRow).toBeInTheDocument();
  expect(sarahRow).not.toHaveClass('opacity-60'); // Not greyed out

  // Step 9: Verify focus restored
  expect(addButton).toHaveFocus();
});
```

---

### Scenario 2: Edit Existing Relationship - Full Flow

**Purpose**: Verify edit flow with pre-populated data and updates.

**Steps**:

1. **Click on relationship row**
   - User clicks on "John Doe" row in Personal table
   - Expected: EditSpecialRelationshipModal opens
   - Expected: Form fields pre-populated with existing data
   - Expected: Focus moves to first form field

2. **Modify fields**
   - User changes:
     - Email: "john.doe.updated@example.com"
     - Phone: "07999 888777"
   - Expected: Fields update as user types

3. **Submit changes**
   - User clicks "Save Changes" button
   - Expected: PUT request sent to `/api/special_relationships/{id}`
   - Expected: Request body contains updated fields

4. **Verify successful update**
   - Expected: Modal closes
   - Expected: Toast notification: "Changes saved successfully"
   - Expected: Table row shows updated email/phone (if visible columns)
   - Expected: React Query cache updated optimistically

**Automated Test**:

```typescript
test('Scenario 2: Edit existing relationship - full flow', async () => {
  const { user } = render(<SpecialRelationshipsSubTab clientGroupId="cg-1" />);

  await waitFor(() => {
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });

  // Step 1: Click row to edit
  const johnRow = screen.getByRole('row', { name: /john doe/i });
  await user.click(johnRow);

  // Step 2: Verify modal opens with pre-populated data
  const modal = await screen.findByRole('dialog', { name: /edit relationship/i });
  expect(modal).toBeInTheDocument();

  const emailInput = screen.getByLabelText(/email/i);
  expect(emailInput).toHaveValue('john.doe@example.com'); // Pre-populated

  // Step 3: Modify fields
  await user.clear(emailInput);
  await user.type(emailInput, 'john.doe.updated@example.com');

  const phoneInput = screen.getByLabelText(/phone/i);
  await user.clear(phoneInput);
  await user.type(phoneInput, '07999 888777');

  // Step 4: Submit
  const saveButton = screen.getByRole('button', { name: /save changes/i });
  await user.click(saveButton);

  // Step 5: Verify modal closes and toast shown
  await waitFor(() => {
    expect(modal).not.toBeInTheDocument();
  });
  expect(await screen.findByText(/changes saved successfully/i)).toBeInTheDocument();

  // Step 6: Verify row updated (if columns visible)
  const updatedRow = await screen.findByRole('row', { name: /john doe/i });
  expect(updatedRow).toHaveTextContent('john.doe.updated@example.com');
});
```

---

### Scenario 3: Delete Relationship with Confirmation

**Purpose**: Verify delete flow with confirmation dialog and undo option.

**Steps**:

1. **Click Delete button on relationship**
   - User clicks delete button (trash icon) on "John Doe" row
   - Expected: Confirmation dialog appears
   - Expected: Dialog message: "Delete John Doe? This will soft delete the relationship."

2. **Confirm deletion**
   - User clicks "Delete" button in confirmation dialog
   - Expected: DELETE request sent to `/api/special_relationships/{id}`
   - Expected: Dialog closes

3. **Verify successful deletion**
   - Expected: Toast notification: "Relationship deleted" with "Undo" button
   - Expected: Row removed from table
   - Expected: Live region announces: "Relationship deleted: John Doe"
   - Expected: React Query cache updated (relationship removed)

4. **Verify undo functionality** (optional - if implemented)
   - User clicks "Undo" button in toast (within 5 seconds)
   - Expected: POST request to restore relationship
   - Expected: Row reappears in table

**Automated Test**:

```typescript
test('Scenario 3: Delete relationship with confirmation', async () => {
  const { user } = render(<SpecialRelationshipsSubTab clientGroupId="cg-1" />);

  await waitFor(() => {
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });

  // Step 1: Find and click delete button
  const johnRow = screen.getByRole('row', { name: /john doe/i });
  const deleteButton = within(johnRow).getByRole('button', { name: /delete john doe/i });
  await user.click(deleteButton);

  // Step 2: Verify confirmation dialog
  const confirmDialog = await screen.findByRole('dialog', { name: /delete john doe/i });
  expect(confirmDialog).toBeInTheDocument();
  expect(confirmDialog).toHaveTextContent(/this will soft delete the relationship/i);

  // Step 3: Confirm deletion
  const confirmButton = within(confirmDialog).getByRole('button', { name: /delete/i });
  await user.click(confirmButton);

  // Step 4: Verify dialog closes
  await waitFor(() => {
    expect(confirmDialog).not.toBeInTheDocument();
  });

  // Step 5: Verify toast notification
  expect(await screen.findByText(/relationship deleted/i)).toBeInTheDocument();

  // Step 6: Verify row removed from table
  await waitFor(() => {
    expect(screen.queryByRole('row', { name: /john doe/i })).not.toBeInTheDocument();
  });
});
```

---

### Scenario 4: Change Relationship Status (Activate/Deactivate)

**Purpose**: Verify optimistic UI update for status changes.

**Steps**:

1. **Click Deactivate button**
   - User clicks "Deactivate" button on "John Doe" (Active status)
   - Expected: PATCH request sent to `/api/special_relationships/{id}/status`
   - Expected: Request body: `{ "status": "Inactive" }`

2. **Verify optimistic update**
   - Expected: Row immediately moves to bottom of table (inactive relationships at bottom)
   - Expected: Row greyed out (opacity-60 class applied)
   - Expected: Status badge changes to "Inactive" with grey background
   - Expected: "Deactivate" button replaced with "Activate" button
   - Expected: Live region announces: "John Doe marked as inactive"

3. **Verify React Query cache**
   - Expected: Cache updated optimistically (before API response)
   - Expected: On API response, cache re-validated
   - Expected: If API fails, cache reverted (rollback)

4. **Reactivate relationship**
   - User clicks "Activate" button on "John Doe"
   - Expected: Row moves back to top (active relationships first)
   - Expected: Row no longer greyed out
   - Expected: Status badge changes to "Active" with green background

**Automated Test**:

```typescript
test('Scenario 4: Change relationship status - optimistic update', async () => {
  const { user } = render(<SpecialRelationshipsSubTab clientGroupId="cg-1" />);

  await waitFor(() => {
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });

  // Step 1: Find active relationship
  const johnRow = screen.getByRole('row', { name: /john doe/i });
  expect(johnRow).not.toHaveClass('opacity-60'); // Not greyed out initially

  // Step 2: Click Deactivate
  const deactivateButton = within(johnRow).getByRole('button', { name: /deactivate john doe/i });
  await user.click(deactivateButton);

  // Step 3: Verify optimistic update (immediate, before API responds)
  await waitFor(() => {
    const updatedRow = screen.getByRole('row', { name: /john doe/i });
    expect(updatedRow).toHaveClass('opacity-60'); // Greyed out
  });

  // Step 4: Verify status badge changed
  const statusBadge = within(johnRow).getByText(/inactive/i);
  expect(statusBadge).toBeInTheDocument();
  expect(statusBadge).toHaveClass('bg-gray-200'); // Grey background

  // Step 5: Verify button changed to Activate
  const activateButton = await within(johnRow).findByRole('button', { name: /activate john doe/i });
  expect(activateButton).toBeInTheDocument();

  // Step 6: Reactivate
  await user.click(activateButton);

  // Step 7: Verify row returns to normal
  await waitFor(() => {
    const updatedRow = screen.getByRole('row', { name: /john doe/i });
    expect(updatedRow).not.toHaveClass('opacity-60'); // No longer greyed out
  });
});
```

---

### Scenario 5: Create Professional Relationship with Product Owner Associations

**Purpose**: Verify professional relationship creation with multi-select product owners.

**Steps**:

1. **Switch to Professional tab**
   - User clicks "Professional Relationships" tab
   - Expected: Tab becomes active (aria-selected="true")
   - Expected: Professional table shown (empty if no relationships)

2. **Click Add Relationship**
   - User clicks "Add Relationship" button
   - Expected: CreateSpecialRelationshipModal opens with type="professional"

3. **Fill professional relationship form**
   - User enters:
     - Name: "Dr. James Wilson"
     - Relationship Type: "Doctor"
     - Relationship With: Select "Alice Johnson" and "Bob Williams" (multi-select)
     - Email: "j.wilson@medical.com"
     - Phone: "01234 567890"
     - Status: "Active"

4. **Submit form**
   - User clicks "Add Relationship"
   - Expected: POST request with `associated_product_owners: ["po-1", "po-2"]`

5. **Verify successful creation**
   - Expected: Modal closes
   - Expected: New row in Professional table
   - Expected: "Relationship With" column shows pills: "Alice Johnson", "Bob Williams"
   - Expected: Clicking pill does NOT navigate (pills are non-interactive)

**Automated Test**:

```typescript
test('Scenario 5: Create professional relationship with product owner associations', async () => {
  const { user } = render(<SpecialRelationshipsSubTab clientGroupId="cg-1" />);

  await waitFor(() => {
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });

  // Step 1: Switch to Professional tab
  const professionalTab = screen.getByRole('tab', { name: /professional relationships/i });
  await user.click(professionalTab);

  // Step 2: Click Add Relationship
  const addButton = screen.getByRole('button', { name: /add relationship/i });
  await user.click(addButton);

  // Step 3: Fill form
  const nameInput = screen.getByLabelText(/name/i);
  await user.type(nameInput, 'Dr. James Wilson');

  const relationshipTypeInput = screen.getByLabelText(/relationship type/i);
  await user.type(relationshipTypeInput, 'Doctor');
  await user.keyboard('{Enter}');

  // Multi-select product owners
  const productOwnerSelect = screen.getByLabelText(/relationship with/i);
  await user.click(productOwnerSelect);

  const aliceOption = await screen.findByRole('option', { name: /alice johnson/i });
  await user.click(aliceOption);

  const bobOption = await screen.findByRole('option', { name: /bob williams/i });
  await user.click(bobOption);

  const emailInput = screen.getByLabelText(/email/i);
  await user.type(emailInput, 'j.wilson@medical.com');

  // Step 4: Submit
  const submitButton = screen.getByRole('button', { name: /add relationship/i });
  await user.click(submitButton);

  // Step 5: Verify modal closes
  await waitFor(() => {
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  // Step 6: Verify row with pills
  const drWilsonRow = await screen.findByRole('row', { name: /dr\. james wilson/i });
  expect(drWilsonRow).toBeInTheDocument();

  expect(within(drWilsonRow).getByText(/alice johnson/i)).toBeInTheDocument();
  expect(within(drWilsonRow).getByText(/bob williams/i)).toBeInTheDocument();
});
```

---

## React Query Integration Scenarios

### Scenario 6: Cache Synchronization After Create

**Purpose**: Verify React Query cache updates correctly after creating relationship.

**Steps**:

1. **Inspect initial cache state**
   - Query key: `['specialRelationships', 'cg-1']`
   - Expected: Contains 2 relationships (1 personal, 1 professional)

2. **Create new relationship**
   - User creates "Sarah Doe" (personal)
   - Expected: `createSpecialRelationship` mutation fires

3. **Verify cache invalidation**
   - Expected: Query key `['specialRelationships', 'cg-1']` invalidated
   - Expected: Refetch triggered automatically
   - Expected: Cache now contains 3 relationships (2 personal, 1 professional)

4. **Verify table re-renders**
   - Expected: Personal table shows 2 rows (John Doe, Sarah Doe)
   - Expected: Professional table still shows 1 row (Jane Smith)

**Automated Test**:

```typescript
test('Scenario 6: Cache synchronization after create', async () => {
  const queryClient = new QueryClient();
  const { user } = render(
    <QueryClientProvider client={queryClient}>
      <SpecialRelationshipsSubTab clientGroupId="cg-1" />
    </QueryClientProvider>
  );

  await waitFor(() => {
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });

  // Step 1: Check initial cache
  const initialCache = queryClient.getQueryData(['specialRelationships', 'cg-1']);
  expect(initialCache).toHaveLength(2); // 1 personal, 1 professional

  // Step 2: Create new relationship
  const addButton = screen.getByRole('button', { name: /add relationship/i });
  await user.click(addButton);

  const nameInput = screen.getByLabelText(/name/i);
  await user.type(nameInput, 'Sarah Doe');

  const submitButton = screen.getByRole('button', { name: /add relationship/i });
  await user.click(submitButton);

  // Step 3: Verify cache updated
  await waitFor(() => {
    const updatedCache = queryClient.getQueryData(['specialRelationships', 'cg-1']);
    expect(updatedCache).toHaveLength(3); // 2 personal, 1 professional
  });

  // Step 4: Verify table shows new relationship
  expect(await screen.findByRole('row', { name: /sarah doe/i })).toBeInTheDocument();
});
```

---

### Scenario 7: Optimistic Update Rollback on API Failure

**Purpose**: Verify React Query rolls back optimistic update if API fails.

**Steps**:

1. **Mock API failure**
   - Configure MSW to return 500 error on PATCH `/api/special_relationships/{id}/status`

2. **Attempt status change**
   - User clicks "Deactivate" on "John Doe"
   - Expected: Row immediately greyed out (optimistic update)

3. **API fails**
   - Expected: Request fails with 500 error

4. **Verify rollback**
   - Expected: Row returns to original state (not greyed out)
   - Expected: Status badge remains "Active"
   - Expected: Toast notification: "Failed to update status. Please try again."
   - Expected: React Query cache reverted to original data

**Automated Test**:

```typescript
test('Scenario 7: Optimistic update rollback on API failure', async () => {
  // Mock API failure
  server.use(
    rest.patch('/api/special_relationships/:id/status', (req, res, ctx) => {
      return res(ctx.status(500), ctx.json({ error: 'Internal Server Error' }));
    })
  );

  const { user } = render(<SpecialRelationshipsSubTab clientGroupId="cg-1" />);

  await waitFor(() => {
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });

  // Step 1: Verify initial state
  const johnRow = screen.getByRole('row', { name: /john doe/i });
  expect(johnRow).not.toHaveClass('opacity-60'); // Not greyed out

  // Step 2: Click Deactivate
  const deactivateButton = within(johnRow).getByRole('button', { name: /deactivate john doe/i });
  await user.click(deactivateButton);

  // Step 3: Verify optimistic update (immediate)
  await waitFor(() => {
    expect(johnRow).toHaveClass('opacity-60'); // Greyed out
  });

  // Step 4: Verify rollback after API failure
  await waitFor(() => {
    expect(johnRow).not.toHaveClass('opacity-60'); // Reverted to not greyed out
  });

  // Step 5: Verify error toast
  expect(await screen.findByText(/failed to update status/i)).toBeInTheDocument();

  // Step 6: Verify status still Active
  const statusBadge = within(johnRow).getByText(/active/i);
  expect(statusBadge).toBeInTheDocument();
});
```

---

### Scenario 8: Cross-Tab Data Synchronization

**Purpose**: Verify data updates persist when switching between Personal/Professional tabs.

**Steps**:

1. **User on Personal tab**
   - Expected: Personal table shown with 2 relationships

2. **Create new personal relationship**
   - User creates "Sarah Doe"
   - Expected: Personal table shows 3 relationships

3. **Switch to Professional tab**
   - User clicks "Professional Relationships" tab
   - Expected: Professional table shown (1 relationship)

4. **Switch back to Personal tab**
   - User clicks "Personal Relationships" tab
   - Expected: Personal table STILL shows 3 relationships (including Sarah Doe)
   - Expected: Data NOT refetched (within staleTime)

5. **Verify cache reuse**
   - Expected: No additional GET request to `/api/special_relationships`
   - Expected: Data served from React Query cache

**Automated Test**:

```typescript
test('Scenario 8: Cross-tab data synchronization', async () => {
  const { user } = render(<SpecialRelationshipsSubTab clientGroupId="cg-1" />);

  await waitFor(() => {
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });

  // Step 1: Verify Personal tab active
  const personalTab = screen.getByRole('tab', { name: /personal relationships/i });
  expect(personalTab).toHaveAttribute('aria-selected', 'true');

  // Count initial rows
  const initialRows = screen.getAllByRole('row').length - 1; // Exclude header
  expect(initialRows).toBe(2); // 2 personal relationships

  // Step 2: Create new relationship
  const addButton = screen.getByRole('button', { name: /add relationship/i });
  await user.click(addButton);

  const nameInput = screen.getByLabelText(/name/i);
  await user.type(nameInput, 'Sarah Doe');

  const submitButton = screen.getByRole('button', { name: /add relationship/i });
  await user.click(submitButton);

  // Wait for new row
  await waitFor(() => {
    const updatedRows = screen.getAllByRole('row').length - 1;
    expect(updatedRows).toBe(3); // 3 personal relationships
  });

  // Step 3: Switch to Professional tab
  const professionalTab = screen.getByRole('tab', { name: /professional relationships/i });
  await user.click(professionalTab);

  // Verify Professional table shown
  await waitFor(() => {
    const profRows = screen.getAllByRole('row').length - 1;
    expect(profRows).toBe(1); // 1 professional relationship
  });

  // Step 4: Switch back to Personal tab
  await user.click(personalTab);

  // Step 5: Verify Personal table STILL shows 3 relationships
  await waitFor(() => {
    const finalRows = screen.getAllByRole('row').length - 1;
    expect(finalRows).toBe(3); // Data persisted
  });

  // Verify Sarah Doe still present
  expect(screen.getByRole('row', { name: /sarah doe/i })).toBeInTheDocument();
});
```

---

## Modal & Focus Management Scenarios

### Scenario 9: Focus Trap in Create Modal

**Purpose**: Verify focus stays within modal and cycles correctly.

**Steps**:

1. **Open Create modal**
   - User clicks "Add Relationship"
   - Expected: Modal opens, focus on Name field

2. **Tab through all form fields**
   - User presses Tab repeatedly
   - Expected: Focus cycles: Name → Relationship Type → DOB → Dependency → Email → Phone → Status → Cancel → Add Relationship → (back to Name)
   - Expected: Focus NEVER leaves modal

3. **Shift+Tab reverse cycle**
   - User presses Shift+Tab repeatedly
   - Expected: Focus cycles in reverse order

4. **Close modal with Escape**
   - User presses Escape key
   - Expected: Modal closes
   - Expected: Focus restored to "Add Relationship" button

**Automated Test**:

```typescript
test('Scenario 9: Focus trap in create modal', async () => {
  const { user } = render(<SpecialRelationshipsSubTab clientGroupId="cg-1" />);

  await waitFor(() => {
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });

  // Step 1: Open modal
  const addButton = screen.getByRole('button', { name: /add relationship/i });
  await user.click(addButton);

  // Step 2: Verify focus on Name field
  const nameInput = await screen.findByLabelText(/name/i);
  await waitFor(() => {
    expect(nameInput).toHaveFocus();
  });

  // Step 3: Tab through fields (verify focus trap)
  await user.keyboard('{Tab}'); // → Relationship Type
  expect(screen.getByLabelText(/relationship type/i)).toHaveFocus();

  await user.keyboard('{Tab}'); // → Date of Birth
  expect(screen.getByLabelText(/date of birth/i)).toHaveFocus();

  await user.keyboard('{Tab}'); // → Dependency checkbox
  expect(screen.getByLabelText(/is this person a dependent/i)).toHaveFocus();

  await user.keyboard('{Tab}'); // → Email
  expect(screen.getByLabelText(/email/i)).toHaveFocus();

  await user.keyboard('{Tab}'); // → Phone
  expect(screen.getByLabelText(/phone/i)).toHaveFocus();

  await user.keyboard('{Tab}'); // → Status dropdown
  expect(screen.getByLabelText(/status/i)).toHaveFocus();

  await user.keyboard('{Tab}'); // → Cancel button
  expect(screen.getByRole('button', { name: /cancel/i })).toHaveFocus();

  await user.keyboard('{Tab}'); // → Add Relationship button
  expect(screen.getByRole('button', { name: /add relationship/i })).toHaveFocus();

  await user.keyboard('{Tab}'); // → Should cycle back to Name
  await waitFor(() => {
    expect(nameInput).toHaveFocus();
  });

  // Step 4: Close with Escape
  await user.keyboard('{Escape}');

  // Step 5: Verify modal closed and focus restored
  await waitFor(() => {
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  expect(addButton).toHaveFocus();
});
```

---

### Scenario 10: Focus Restoration After Edit Modal Close

**Purpose**: Verify focus returns to correct row after editing.

**Steps**:

1. **Click row to edit**
   - User clicks "John Doe" row
   - Expected: Edit modal opens
   - Expected: Focus stored (row element)

2. **Close modal with Cancel**
   - User clicks "Cancel" button
   - Expected: Modal closes
   - Expected: Focus restored to "John Doe" row

3. **Verify keyboard navigation continues**
   - User presses Arrow Down
   - Expected: Focus moves to next row

**Automated Test**:

```typescript
test('Scenario 10: Focus restoration after edit modal close', async () => {
  const { user } = render(<SpecialRelationshipsSubTab clientGroupId="cg-1" />);

  await waitFor(() => {
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });

  // Step 1: Click row to edit
  const johnRow = screen.getByRole('row', { name: /john doe/i });
  await user.click(johnRow);

  // Step 2: Verify modal opens
  const modal = await screen.findByRole('dialog', { name: /edit relationship/i });
  expect(modal).toBeInTheDocument();

  // Step 3: Close with Cancel
  const cancelButton = screen.getByRole('button', { name: /cancel/i });
  await user.click(cancelButton);

  // Step 4: Verify modal closed
  await waitFor(() => {
    expect(modal).not.toBeInTheDocument();
  });

  // Step 5: Verify focus restored to row
  await waitFor(() => {
    expect(johnRow).toHaveFocus();
  });
});
```

---

### Scenario 11: Modal Backdrop Click Does NOT Close Modal Accidentally

**Purpose**: Verify clicking inside modal content doesn't close modal, but clicking backdrop does.

**Steps**:

1. **Open Create modal**
   - User clicks "Add Relationship"

2. **Click inside modal content**
   - User clicks on form field area (not on input, just container)
   - Expected: Modal stays open
   - Expected: No action taken

3. **Click modal backdrop (outside modal)**
   - User clicks on grey backdrop area
   - Expected: Modal closes (intentional dismiss)

**Automated Test**:

```typescript
test('Scenario 11: Modal backdrop click behavior', async () => {
  const { user } = render(<SpecialRelationshipsSubTab clientGroupId="cg-1" />);

  await waitFor(() => {
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });

  // Step 1: Open modal
  const addButton = screen.getByRole('button', { name: /add relationship/i });
  await user.click(addButton);

  const modal = await screen.findByRole('dialog');
  expect(modal).toBeInTheDocument();

  // Step 2: Click inside modal content (should NOT close)
  const modalContent = modal.querySelector('.bg-white'); // Modal content area
  await user.click(modalContent!);

  // Verify modal still open
  expect(modal).toBeInTheDocument();

  // Step 3: Click backdrop (should close)
  const backdrop = modal.parentElement?.querySelector('.bg-gray-900'); // Backdrop
  await user.click(backdrop!);

  // Verify modal closed
  await waitFor(() => {
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
```

---

## Sorting & Filtering Scenarios

### Scenario 12: Sort Personal Table by Multiple Columns

**Purpose**: Verify sorting works correctly and persists inactive/deceased at bottom.

**Steps**:

1. **Default sort**
   - Expected: Relationships sorted by Name ascending
   - Expected: Inactive/Deceased at bottom

2. **Sort by Age descending**
   - User clicks "Age" column header
   - Expected: aria-sort="descending"
   - Expected: Relationships sorted: Age 34 → Age 19 → Inactive/Deceased at bottom

3. **Sort by Age ascending**
   - User clicks "Age" column header again
   - Expected: aria-sort="ascending"
   - Expected: Relationships sorted: Age 19 → Age 34 → Inactive/Deceased at bottom

4. **Sort by Status**
   - User clicks "Status" column header
   - Expected: Active → Inactive → Deceased

**Automated Test**:

```typescript
test('Scenario 12: Sort personal table by multiple columns', async () => {
  const { user } = render(<SpecialRelationshipsSubTab clientGroupId="cg-1" />);

  await waitFor(() => {
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });

  // Step 1: Verify default sort (Name ascending)
  const nameHeader = screen.getByRole('button', { name: /sort by name/i });
  expect(nameHeader).toHaveAttribute('aria-sort', 'ascending');

  // Step 2: Click Age header to sort descending
  const ageHeader = screen.getByRole('button', { name: /sort by age/i });
  await user.click(ageHeader);

  // Verify aria-sort
  await waitFor(() => {
    expect(ageHeader).toHaveAttribute('aria-sort', 'descending');
  });

  // Step 3: Click Age header again to sort ascending
  await user.click(ageHeader);

  await waitFor(() => {
    expect(ageHeader).toHaveAttribute('aria-sort', 'ascending');
  });

  // Step 4: Verify inactive/deceased still at bottom
  const rows = screen.getAllByRole('row');
  const lastRow = rows[rows.length - 1]; // Last row should be inactive/deceased
  expect(lastRow).toHaveClass('opacity-60'); // Greyed out
});
```

---

### Scenario 13: Tab Switching Preserves Sort State

**Purpose**: Verify sort state is preserved independently per tab.

**Steps**:

1. **Sort Personal table by Age**
   - User clicks "Age" header on Personal tab
   - Expected: Sorted by Age descending

2. **Switch to Professional tab**
   - User clicks "Professional Relationships" tab
   - Expected: Professional table shown with default sort (Name ascending)

3. **Sort Professional table by Relationship Type**
   - User clicks "Relationship" header
   - Expected: Sorted by Relationship Type ascending

4. **Switch back to Personal tab**
   - User clicks "Personal Relationships" tab
   - Expected: Personal table STILL sorted by Age descending (state preserved)

**Automated Test**:

```typescript
test('Scenario 13: Tab switching preserves sort state', async () => {
  const { user } = render(<SpecialRelationshipsSubTab clientGroupId="cg-1" />);

  await waitFor(() => {
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });

  // Step 1: Sort Personal by Age
  const ageHeader = screen.getByRole('button', { name: /sort by age/i });
  await user.click(ageHeader);

  await waitFor(() => {
    expect(ageHeader).toHaveAttribute('aria-sort', 'descending');
  });

  // Step 2: Switch to Professional tab
  const professionalTab = screen.getByRole('tab', { name: /professional relationships/i });
  await user.click(professionalTab);

  // Step 3: Verify Professional has default sort
  const professionalNameHeader = screen.getByRole('button', { name: /sort by name/i });
  expect(professionalNameHeader).toHaveAttribute('aria-sort', 'ascending');

  // Step 4: Sort Professional by Relationship
  const relationshipHeader = screen.getByRole('button', { name: /sort by relationship/i });
  await user.click(relationshipHeader);

  await waitFor(() => {
    expect(relationshipHeader).toHaveAttribute('aria-sort', 'ascending');
  });

  // Step 5: Switch back to Personal tab
  const personalTab = screen.getByRole('tab', { name: /personal relationships/i });
  await user.click(personalTab);

  // Step 6: Verify Personal STILL sorted by Age
  const ageHeaderAgain = screen.getByRole('button', { name: /sort by age/i });
  expect(ageHeaderAgain).toHaveAttribute('aria-sort', 'descending');
});
```

---

## Error Handling Scenarios

### Scenario 14: Form Validation Errors - Inline Display

**Purpose**: Verify form validation shows inline errors and prevents submission.

**Steps**:

1. **Open Create modal**
   - User clicks "Add Relationship"

2. **Submit form with missing required fields**
   - User leaves Name blank
   - User clicks "Add Relationship" button
   - Expected: Form does NOT submit
   - Expected: Validation error shown below Name field: "Name is required"
   - Expected: Name field has red border (aria-invalid="true")

3. **Enter invalid email**
   - User enters Name: "John Doe"
   - User enters Email: "invalid-email"
   - User clicks "Add Relationship"
   - Expected: Validation error: "Please enter a valid email address"

4. **Fix validation errors**
   - User corrects Email: "john.doe@example.com"
   - Expected: Validation error disappears
   - Expected: Red border removed

5. **Submit valid form**
   - User clicks "Add Relationship"
   - Expected: Form submits successfully

**Automated Test**:

```typescript
test('Scenario 14: Form validation errors - inline display', async () => {
  const { user } = render(<SpecialRelationshipsSubTab clientGroupId="cg-1" />);

  await waitFor(() => {
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });

  // Step 1: Open modal
  const addButton = screen.getByRole('button', { name: /add relationship/i });
  await user.click(addButton);

  // Step 2: Submit without Name
  const submitButton = screen.getByRole('button', { name: /add relationship/i });
  await user.click(submitButton);

  // Step 3: Verify validation error
  const nameError = await screen.findByText(/name is required/i);
  expect(nameError).toBeInTheDocument();
  expect(nameError).toHaveAttribute('role', 'alert'); // Announced to screen readers

  const nameInput = screen.getByLabelText(/name/i);
  expect(nameInput).toHaveAttribute('aria-invalid', 'true');

  // Step 4: Enter name but invalid email
  await user.type(nameInput, 'John Doe');

  const emailInput = screen.getByLabelText(/email/i);
  await user.type(emailInput, 'invalid-email');

  await user.click(submitButton);

  // Step 5: Verify email error
  const emailError = await screen.findByText(/please enter a valid email address/i);
  expect(emailError).toBeInTheDocument();

  // Step 6: Fix email
  await user.clear(emailInput);
  await user.type(emailInput, 'john.doe@example.com');

  // Verify error disappears
  await waitFor(() => {
    expect(screen.queryByText(/please enter a valid email address/i)).not.toBeInTheDocument();
  });

  // Step 7: Submit valid form
  await user.click(submitButton);

  // Modal should close
  await waitFor(() => {
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
```

---

### Scenario 15: API Error Handling - Network Failure

**Purpose**: Verify graceful error handling when API requests fail.

**Steps**:

1. **Mock network failure**
   - Configure MSW to return network error on POST `/api/special_relationships`

2. **Attempt to create relationship**
   - User fills out form and clicks "Add Relationship"
   - Expected: POST request fails

3. **Verify error handling**
   - Expected: Modal stays open (user can retry)
   - Expected: Loading state stops
   - Expected: Toast notification: "Failed to create relationship. Please try again."
   - Expected: Error announced to screen readers (role="alert")

4. **User can retry**
   - User clicks "Add Relationship" again
   - Expected: Request retried

**Automated Test**:

```typescript
test('Scenario 15: API error handling - network failure', async () => {
  // Mock API failure
  server.use(
    rest.post('/api/special_relationships', (req, res, ctx) => {
      return res.networkError('Network connection failed');
    })
  );

  const { user } = render(<SpecialRelationshipsSubTab clientGroupId="cg-1" />);

  await waitFor(() => {
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });

  // Step 1: Open modal and fill form
  const addButton = screen.getByRole('button', { name: /add relationship/i });
  await user.click(addButton);

  const nameInput = screen.getByLabelText(/name/i);
  await user.type(nameInput, 'John Doe');

  // Step 2: Submit form
  const submitButton = screen.getByRole('button', { name: /add relationship/i });
  await user.click(submitButton);

  // Step 3: Verify error toast
  const errorToast = await screen.findByText(/failed to create relationship/i);
  expect(errorToast).toBeInTheDocument();
  expect(errorToast.closest('[role="alert"]')).toBeInTheDocument(); // Announced to screen readers

  // Step 4: Verify modal stays open
  expect(screen.getByRole('dialog')).toBeInTheDocument();

  // Step 5: Verify submit button no longer loading
  expect(submitButton).not.toBeDisabled();
  expect(submitButton).toHaveTextContent(/add relationship/i); // Not "Adding..."
});
```

---

## Automated Test Implementation

### Test File Structure

```
frontend/src/tests/integration/
├── SpecialRelationships.create.test.tsx       # Scenarios 1, 5
├── SpecialRelationships.edit.test.tsx         # Scenario 2
├── SpecialRelationships.delete.test.tsx       # Scenario 3
├── SpecialRelationships.status.test.tsx       # Scenario 4
├── SpecialRelationships.cache.test.tsx        # Scenarios 6, 7, 8
├── SpecialRelationships.focus.test.tsx        # Scenarios 9, 10, 11
├── SpecialRelationships.sorting.test.tsx      # Scenarios 12, 13
└── SpecialRelationships.errors.test.tsx       # Scenarios 14, 15
```

### Running Integration Tests

```bash
# Run all integration tests
npm test -- --testPathPattern=integration

# Run specific scenario
npm test -- SpecialRelationships.create.test.tsx

# Run with coverage
npm test -- --coverage --testPathPattern=integration
```

### Success Criteria

- ✅ All 15 scenarios pass automated tests
- ✅ 70%+ code coverage maintained
- ✅ Manual verification for accessibility (keyboard, NVDA)
- ✅ Manual verification for visual regressions (if Chromatic available)

---

## Conclusion

These **15 detailed integration test scenarios** provide comprehensive coverage of the Special Relationships feature, addressing the critical analysis finding that integration testing was underspecified. By implementing these scenarios in Cycle 10, the team will **eliminate the 60% probability of integration failures costing 10+ hours** identified in the critical analysis.

**Next Steps**:
1. Review and approve integration test scenarios
2. Set up test environment (MSW, jest-axe, React Testing Library)
3. Implement automated tests during Cycle 10 (4 hours allocated)
4. Manual verification for accessibility and visual regressions (2 hours)
5. Document any edge cases discovered during testing
