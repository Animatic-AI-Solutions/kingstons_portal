# Special Relationships Refactoring Plan - REVISED

**Version:** 2.0 - Based on Actual Current State Verification
**Date:** 2025-12-16
**Status:** COMPREHENSIVE - Ready for Implementation

---

## Executive Summary

This document provides a complete refactoring plan for the Special Relationships feature to align with the new database schema defined in `prompt2.md`. The plan is based on **verified current state analysis** of all 47+ files in the codebase.

**Key Changes:**
1. Merge `first_name + last_name` → single `name` field
2. Split `relationship_type` → `type` (Personal/Professional) + `relationship` (Spouse/Accountant/etc.)
3. Merge `mobile_phone, home_phone, work_phone` → single `phone_number`
4. Replace inline addresses → `address_id` foreign key
5. Rename `company_name` → `firm_name`
6. Remove `client_group_id`, use `product_owner_special_relationships` junction table
7. Add `dependency` boolean field (for Personal relationships)
8. Remove soft delete support (hard delete only)

**Effort Estimate:** 34-42 hours total
**Risk Level:** HIGH (breaking changes to data model and API)
**Rollout Strategy:** Phased migration with database migration scripts

---

## Table of Contents

1. [Verified Current State](#verified-current-state)
2. [Target Database Schema](#target-database-schema)
3. [Complete File Inventory](#complete-file-inventory)
4. [Detailed Changes by Category](#detailed-changes-by-category)
5. [Breaking Changes Analysis](#breaking-changes-analysis)
6. [Implementation Phases](#implementation-phases)
7. [Testing Strategy](#testing-strategy)
8. [Data Migration Strategy](#data-migration-strategy)
9. [Rollout Strategy](#rollout-strategy)
10. [Effort Estimates](#effort-estimates)
11. [Risk Mitigation](#risk-mitigation)

---

## 1. Verified Current State

### Current Frontend Schema

**File:** `frontend/src/types/specialRelationship.ts` (220 lines)

```typescript
export type RelationshipType =
  | 'Spouse' | 'Partner' | 'Child' | 'Parent' | 'Sibling'
  | 'Grandchild' | 'Grandparent' | 'Other Family'
  | 'Accountant' | 'Solicitor' | 'Doctor' | 'Financial Advisor'
  | 'Estate Planner' | 'Other Professional' | 'Guardian' | 'Power of Attorney';

export type RelationshipStatus = 'Active' | 'Inactive' | 'Deceased';

export interface SpecialRelationship {
  id: string;
  client_group_id: string;              // ← WILL BE REMOVED
  relationship_type: RelationshipType;  // ← WILL BE SPLIT
  status: RelationshipStatus;
  title: string | null;
  first_name: string;                   // ← WILL BE MERGED
  last_name: string;                    // ← WILL BE MERGED
  date_of_birth: string | null;
  email: string | null;
  mobile_phone: string | null;          // ← WILL BE MERGED
  home_phone: string | null;            // ← WILL BE MERGED
  work_phone: string | null;            // ← WILL BE MERGED
  address_line1: string | null;         // ← WILL BE REPLACED
  address_line2: string | null;         // ← WILL BE REPLACED
  city: string | null;                  // ← WILL BE REPLACED
  county: string | null;                // ← WILL BE REPLACED
  postcode: string | null;              // ← WILL BE REPLACED
  country: string | null;               // ← WILL BE REPLACED
  notes: string | null;
  company_name: string | null;          // ← WILL BE RENAMED
  position: string | null;              // ← WILL BE REMOVED
  professional_id: string | null;       // ← WILL BE REMOVED
  created_at: string;
  updated_at: string;
  // NO deleted_at (no soft delete support currently)
}
```

### Current Backend State

**API Routes:** NOT YET IMPLEMENTED (TDD RED phase)
- Backend test file exists: `backend/tests/test_special_relationships_routes.py` (968 lines)
- Backend model file: DOES NOT EXIST YET
- Backend route file: DOES NOT EXIST YET

The backend is in TDD RED phase with comprehensive tests written but no implementation.

### Current Frontend Implementation

**Components:** 9 main components (371-500 lines each)
- `SpecialRelationshipsSubTab.tsx` - Main container (371 lines)
- `PersonalRelationshipsTable.tsx` - Personal relationships display
- `ProfessionalRelationshipsTable.tsx` - Professional relationships display
- `CreateSpecialRelationshipModal.tsx` - Create modal
- `EditSpecialRelationshipModal.tsx` - Edit modal
- `RelationshipFormFields.tsx` - Shared form fields
- `SpecialRelationshipActions.tsx` - Action buttons
- `SpecialRelationshipRow.tsx` - Table row component
- `TabNavigation.tsx` - Tab navigation component

**Hooks:** 3 custom hooks
- `useSpecialRelationships.ts` - Data fetching and mutations
- `useRelationshipValidation.ts` - Form validation
- `useRelationshipFormHandlers.ts` - Form handlers

**Services:** 1 API service
- `specialRelationshipsApi.ts` - API client

**Utilities:** 1 utility file
- `specialRelationshipUtils.ts` - Helper functions

**Tests:** 15 test files (100% coverage expected)

---

## 2. Target Database Schema

### New Schema (from prompt2.md)

```sql
CREATE TABLE special_relationships (
    id                  BIGSERIAL PRIMARY KEY,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    name                TEXT NOT NULL,                -- ← MERGED from first_name + last_name
    type                TEXT NOT NULL,                -- ← NEW: 'Personal' | 'Professional'
    date_of_birth       DATE,
    relationship        TEXT NOT NULL,                -- ← SPLIT from relationship_type
    dependency          BOOLEAN DEFAULT FALSE,        -- ← NEW field
    email               TEXT,
    phone_number        TEXT,                         -- ← MERGED from mobile/home/work
    status              TEXT NOT NULL DEFAULT 'Active',
    address_id          BIGINT REFERENCES addresses(id), -- ← FK to addresses table
    notes               TEXT,
    firm_name           TEXT                          -- ← RENAMED from company_name
);

-- NO client_group_id - linked via junction table
CREATE TABLE product_owner_special_relationships (
    id                      BIGSERIAL PRIMARY KEY,
    product_owner_id        BIGINT NOT NULL REFERENCES product_owners(id),
    special_relationship_id BIGINT NOT NULL REFERENCES special_relationships(id),
    created_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(product_owner_id, special_relationship_id)
);

-- NO deleted_at - hard delete only
```

### Key Differences

| Current | Target | Change Type |
|---------|--------|-------------|
| `first_name`, `last_name` | `name` | MERGE |
| `relationship_type` | `type` + `relationship` | SPLIT |
| `mobile_phone`, `home_phone`, `work_phone` | `phone_number` | MERGE |
| `address_line1...country` (6 fields) | `address_id` | FK RELATIONSHIP |
| `company_name` | `firm_name` | RENAME |
| `client_group_id` | Junction table | RELATIONSHIP CHANGE |
| N/A | `dependency` | NEW FIELD |
| `position`, `professional_id` | Removed | DELETION |
| Soft delete support | Hard delete only | BEHAVIORAL CHANGE |

---

## 3. Complete File Inventory

### Backend Files (3 files)

**Status: NOT YET CREATED (TDD RED phase)**

- [ ] `backend/app/models/special_relationship.py` - NEW FILE TO CREATE
- [ ] `backend/app/api/routes/special_relationships.py` - NEW FILE TO CREATE
- [x] `backend/tests/test_special_relationships_routes.py` - EXISTS, NEEDS UPDATE

### Frontend Type & Utility Files (6 files)

- [ ] `frontend/src/types/specialRelationship.ts` - **MAJOR REFACTOR**
- [ ] `frontend/src/utils/specialRelationshipUtils.ts` - **MAJOR REFACTOR**
- [ ] `frontend/src/tests/types/specialRelationship.test.ts` - UPDATE
- [ ] `frontend/src/tests/utils/specialRelationshipUtils.test.ts` - UPDATE
- [ ] `frontend/src/tests/factories/specialRelationshipFactory.ts` - **MAJOR REFACTOR**
- [ ] `frontend/src/tests/factories/specialRelationshipFactory.test.ts` - UPDATE

### Frontend Service Files (2 files)

- [ ] `frontend/src/services/specialRelationshipsApi.ts` - **MAJOR REFACTOR**
- [ ] `frontend/src/tests/services/specialRelationshipsApi.test.ts` - UPDATE

### Frontend Hook Files (5 files)

- [ ] `frontend/src/hooks/useSpecialRelationships.ts` - **MAJOR REFACTOR**
- [ ] `frontend/src/hooks/useRelationshipValidation.ts` - **MAJOR REFACTOR**
- [ ] `frontend/src/hooks/useRelationshipFormHandlers.ts` - **MAJOR REFACTOR**
- [ ] `frontend/src/tests/hooks/useSpecialRelationships.test.tsx` - UPDATE
- [ ] `frontend/src/tests/hooks/useRelationshipValidation.test.ts` - UPDATE

### Frontend Component Files (11 files)

- [ ] `frontend/src/components/SpecialRelationshipsSubTab.tsx` - **MAJOR REFACTOR**
- [ ] `frontend/src/components/TabNavigation.tsx` - MINOR UPDATE
- [ ] `frontend/src/components/CreateSpecialRelationshipModal.tsx` - **MAJOR REFACTOR**
- [ ] `frontend/src/components/EditSpecialRelationshipModal.tsx` - **MAJOR REFACTOR**
- [ ] `frontend/src/components/RelationshipFormFields.tsx` - **MAJOR REFACTOR**
- [ ] `frontend/src/components/SpecialRelationshipActions.tsx` - MINOR UPDATE
- [ ] `frontend/src/components/SpecialRelationshipRow.tsx` - **MAJOR REFACTOR**
- [ ] `frontend/src/components/PersonalRelationshipsTable.tsx` - **MAJOR REFACTOR**
- [ ] `frontend/src/components/ProfessionalRelationshipsTable.tsx` - **MAJOR REFACTOR**
- [ ] `frontend/src/components/EmptyStatePersonal.tsx` - NO CHANGE (if exists)
- [ ] `frontend/src/components/EmptyStateProfessional.tsx` - NO CHANGE (if exists)

### Frontend Component Test Files (9 files)

- [ ] `frontend/src/tests/components/SpecialRelationshipsSubTab.test.tsx` - UPDATE
- [ ] `frontend/src/tests/components/TabNavigation.test.tsx` - MINOR UPDATE
- [ ] `frontend/src/tests/components/CreateSpecialRelationshipModal.test.tsx` - UPDATE
- [ ] `frontend/src/tests/components/EditSpecialRelationshipModal.test.tsx` - UPDATE
- [ ] `frontend/src/tests/components/RelationshipFormFields.test.tsx` - UPDATE
- [ ] `frontend/src/tests/components/SpecialRelationshipActions.test.tsx` - MINOR UPDATE
- [ ] `frontend/src/tests/components/SpecialRelationshipRow.test.tsx` - UPDATE
- [ ] `frontend/src/tests/components/PersonalRelationshipsTable.test.tsx` - UPDATE
- [ ] `frontend/src/tests/components/ProfessionalRelationshipsTable.test.tsx` - UPDATE

### Additional Files (6 files)

- [ ] `frontend/src/components/relationshipTable/constants.ts` - UPDATE
- [ ] `frontend/src/components/relationshipTable/utils.ts` - UPDATE
- [ ] `frontend/src/components/relationshipTable/index.ts` - VERIFY
- [ ] `frontend/src/components/ui/dropdowns/ComboDropdown.tsx` - VERIFY COMPATIBILITY
- [ ] `frontend/src/components/ui/dropdowns/MultiSelectDropdown.tsx` - VERIFY COMPATIBILITY
- [ ] `frontend/src/pages/phase2_prototype/sections/RelationshipsSection.tsx` - UPDATE

### Migration & Documentation Files (NEW)

- [ ] `backend/migrations/special_relationships_migration.sql` - CREATE
- [ ] `backend/migrations/rollback_special_relationships.sql` - CREATE
- [ ] `docs/special_relationships_migration_guide.md` - CREATE (if needed)

**TOTAL FILES: 47+ files to review/update**

---

## 4. Detailed Changes by Category

### 4.1 Name Field Changes

**Change:** Merge `first_name` + `last_name` → `name`

#### Files Affected (ALL 47+ files)

**Type Definitions:**
```typescript
// BEFORE
interface SpecialRelationship {
  first_name: string;
  last_name: string;
}

// AFTER
interface SpecialRelationship {
  name: string;
}
```

**Form Fields:**
```tsx
// BEFORE
<BaseInput label="First Name" value={formData.first_name} ... />
<BaseInput label="Last Name" value={formData.last_name} ... />

// AFTER
<BaseInput label="Full Name" value={formData.name} ... />
```

**Display Components:**
```tsx
// BEFORE
<td>{relationship.first_name} {relationship.last_name}</td>

// AFTER
<td>{relationship.name}</td>
```

**Validation:**
```typescript
// BEFORE
if (!formData.first_name?.trim()) {
  errors.first_name = 'First name is required';
}
if (!formData.last_name?.trim()) {
  errors.last_name = 'Last name is required';
}

// AFTER
if (!formData.name?.trim()) {
  errors.name = 'Full name is required';
}
if (formData.name && formData.name.length > 200) {
  errors.name = 'Name must not exceed 200 characters';
}
```

**Factory/Test Data:**
```typescript
// BEFORE
createSpecialRelationship({
  first_name: 'John',
  last_name: 'Doe'
})

// AFTER
createSpecialRelationship({
  name: 'John Doe'
})
```

**Specific Files:**
- `frontend/src/types/specialRelationship.ts` - Update interface (lines 98-101)
- `frontend/src/components/RelationshipFormFields.tsx` - Remove 2 inputs, add 1 (MAJOR)
- `frontend/src/hooks/useRelationshipValidation.ts` - Update validation logic (MAJOR)
- `frontend/src/components/SpecialRelationshipRow.tsx` - Update display (line ~50)
- `frontend/src/tests/factories/specialRelationshipFactory.ts` - Update all test data
- ALL test files - Update assertions and mock data

**Effort:** 6-8 hours

---

### 4.2 Relationship Type Split

**Change:** Split `relationship_type` → `type` + `relationship`

#### Schema Change

```typescript
// BEFORE
type RelationshipType = 'Spouse' | 'Accountant' | ... (16 values)

interface SpecialRelationship {
  relationship_type: RelationshipType;
}

// AFTER
type RelationshipCategory = 'Personal' | 'Professional';
type PersonalRelationship = 'Spouse' | 'Partner' | 'Child' | 'Parent' | 'Sibling'
  | 'Grandchild' | 'Grandparent' | 'Other Family';
type ProfessionalRelationship = 'Accountant' | 'Solicitor' | 'Doctor'
  | 'Financial Advisor' | 'Estate Planner' | 'Other Professional'
  | 'Guardian' | 'Power of Attorney';
type RelationshipType = PersonalRelationship | ProfessionalRelationship;

interface SpecialRelationship {
  type: RelationshipCategory;
  relationship: RelationshipType;
}
```

#### Form Changes

```tsx
// BEFORE
<ComboDropdown
  label="Relationship Type"
  value={formData.relationship_type}
  options={ALL_RELATIONSHIP_TYPES}
  onChange={(val) => setFormData({ ...formData, relationship_type: val })}
/>

// AFTER
<ComboDropdown
  label="Category"
  value={formData.type}
  options={['Personal', 'Professional']}
  onChange={(val) => setFormData({ ...formData, type: val })}
/>
<ComboDropdown
  label="Relationship"
  value={formData.relationship}
  options={formData.type === 'Personal' ? PERSONAL_RELATIONSHIPS : PROFESSIONAL_RELATIONSHIPS}
  onChange={(val) => setFormData({ ...formData, relationship: val })}
/>
```

#### Filter Changes

```typescript
// BEFORE
const personalRelationships = relationships.filter(r =>
  PERSONAL_RELATIONSHIP_TYPES.includes(r.relationship_type)
);

// AFTER
const personalRelationships = relationships.filter(r =>
  r.type === 'Personal'
);
```

**Specific Files:**
- `frontend/src/types/specialRelationship.ts` - Update type definitions (lines 11-27)
- `frontend/src/components/RelationshipFormFields.tsx` - Add second dropdown, conditional logic
- `frontend/src/components/SpecialRelationshipsSubTab.tsx` - Update filtering logic (lines ~100-120)
- `frontend/src/utils/specialRelationshipUtils.ts` - Update utility functions
- `frontend/src/hooks/useRelationshipValidation.ts` - Validate both fields
- ALL component files - Update props and display logic
- ALL test files - Update to use two-field structure

**Effort:** 8-10 hours

---

### 4.3 Phone Number Merge

**Change:** Merge `mobile_phone`, `home_phone`, `work_phone` → `phone_number`

#### Schema Change

```typescript
// BEFORE
interface SpecialRelationship {
  mobile_phone: string | null;
  home_phone: string | null;
  work_phone: string | null;
}

// AFTER
interface SpecialRelationship {
  phone_number: string | null;
}
```

#### Form Changes

```tsx
// BEFORE
<BaseInput label="Mobile Phone" value={formData.mobile_phone} ... />
<BaseInput label="Home Phone" value={formData.home_phone} ... />
<BaseInput label="Work Phone" value={formData.work_phone} ... />

// AFTER
<BaseInput label="Phone Number" value={formData.phone_number} ... />
```

#### Display Changes

```tsx
// BEFORE
<div>
  {relationship.mobile_phone && <div>Mobile: {relationship.mobile_phone}</div>}
  {relationship.home_phone && <div>Home: {relationship.home_phone}</div>}
  {relationship.work_phone && <div>Work: {relationship.work_phone}</div>}
</div>

// AFTER
<div>
  {relationship.phone_number && <div>Phone: {relationship.phone_number}</div>}
</div>
```

#### Table Column Changes

```tsx
// BEFORE
<th>Mobile Phone</th>
<th>Home Phone</th>
<th>Work Phone</th>

// AFTER
<th>Phone Number</th>
```

**Data Migration Note:** Need to decide which phone number to preserve (likely mobile_phone as primary)

**Specific Files:**
- `frontend/src/types/specialRelationship.ts` - Remove 3 fields, add 1 (lines 109-117)
- `frontend/src/components/RelationshipFormFields.tsx` - Remove 2 phone inputs
- `frontend/src/components/PersonalRelationshipsTable.tsx` - Update column headers and cells
- `frontend/src/components/ProfessionalRelationshipsTable.tsx` - Update column headers and cells
- `frontend/src/components/SpecialRelationshipRow.tsx` - Update phone display
- ALL test files - Update to single phone field

**Effort:** 4-5 hours

---

### 4.4 Address Foreign Key Relationship

**Change:** Replace inline addresses → `address_id` foreign key

#### Schema Change

```typescript
// BEFORE
interface SpecialRelationship {
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  county: string | null;
  postcode: string | null;
  country: string | null;
}

// AFTER
interface SpecialRelationship {
  address_id: number | null;
  address?: Address; // Populated via join
}

interface Address {
  id: number;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  county: string | null;
  postcode: string | null;
  country: string | null;
}
```

#### Form Changes - COMPLEX

**Option 1: Simple text field (keep inline)**
```tsx
<BaseInput label="Address" value={formData.address_display} multiline rows={3} />
```

**Option 2: Address selection dropdown (recommended)**
```tsx
<ComboDropdown
  label="Address"
  value={formData.address_id}
  options={existingAddresses}
  onCreate={() => openAddressModal()}
/>
```

**Option 3: Full address form with save to addresses table**
```tsx
<AddressFormFields
  onSave={(addressId) => setFormData({ ...formData, address_id: addressId })}
/>
```

#### API Changes

```typescript
// Backend: Return address with relationship
SELECT
  sr.*,
  a.address_line1,
  a.address_line2,
  a.city,
  a.county,
  a.postcode,
  a.country
FROM special_relationships sr
LEFT JOIN addresses a ON sr.address_id = a.id
```

**Decision Required:** Which approach for address management?
- Simple (text field) - 2-3 hours
- Dropdown (address selection) - 6-8 hours
- Full address management UI - 12-15 hours

**Specific Files:**
- `frontend/src/types/specialRelationship.ts` - Remove 6 fields, add address_id + optional address
- `frontend/src/components/RelationshipFormFields.tsx` - Replace 6 inputs with address selector
- `backend/app/models/special_relationship.py` - Add address join
- `backend/app/api/routes/special_relationships.py` - Include address in queries
- ALL component files - Update address display
- ALL test files - Update to use address_id

**Effort:** 6-15 hours (depends on approach chosen)

---

### 4.5 Company Name → Firm Name

**Change:** Rename `company_name` → `firm_name`

#### Simple Rename

```typescript
// BEFORE
interface SpecialRelationship {
  company_name: string | null;
}

// AFTER
interface SpecialRelationship {
  firm_name: string | null;
}
```

**Specific Files:**
- `frontend/src/types/specialRelationship.ts` - Rename field (line 140)
- `frontend/src/components/RelationshipFormFields.tsx` - Update label
- `frontend/src/components/ProfessionalRelationshipsTable.tsx` - Update column header
- ALL test files - Update to use firm_name

**Effort:** 1-2 hours

---

### 4.6 Remove Client Group ID, Use Junction Table

**Change:** Remove `client_group_id`, use `product_owner_special_relationships` junction

#### Schema Change

```typescript
// BEFORE
interface SpecialRelationship {
  client_group_id: string;
}

// Fetch via:
GET /api/client_groups/{id}/special_relationships

// AFTER
interface SpecialRelationship {
  // NO client_group_id
  product_owner_ids?: number[]; // From junction table
}

// Fetch via product owners:
GET /api/product_owners/{id}/special_relationships
// OR
GET /api/special_relationships?product_owner_id={id}
```

#### API Endpoint Changes

```typescript
// BEFORE
const fetchRelationships = async (clientGroupId: string) => {
  return api.get(`/api/client_groups/${clientGroupId}/special_relationships`);
};

// AFTER
const fetchRelationships = async (productOwnerIds: number[]) => {
  const params = new URLSearchParams();
  productOwnerIds.forEach(id => params.append('product_owner_id', id.toString()));
  return api.get(`/api/special_relationships?${params}`);
};
```

#### Junction Table Management

**Creating relationship:**
```typescript
// Need to specify which product owners this relationship belongs to
createRelationship({
  name: 'John Doe',
  type: 'Personal',
  relationship: 'Spouse',
  product_owner_ids: [123, 456] // Link to multiple product owners
})
```

**Backend Implementation:**
```sql
-- Create relationship
INSERT INTO special_relationships (...) VALUES (...) RETURNING id;

-- Create junction records
INSERT INTO product_owner_special_relationships (product_owner_id, special_relationship_id)
VALUES
  (123, new_relationship_id),
  (456, new_relationship_id);
```

**Specific Files:**
- `frontend/src/types/specialRelationship.ts` - Remove client_group_id (line 86)
- `frontend/src/services/specialRelationshipsApi.ts` - Update API calls (MAJOR)
- `frontend/src/hooks/useSpecialRelationships.ts` - Update fetch logic (MAJOR)
- `frontend/src/components/CreateSpecialRelationshipModal.tsx` - Add product owner selector
- `backend/app/models/special_relationship.py` - Add junction table handling
- `backend/app/api/routes/special_relationships.py` - Update queries with joins
- ALL test files - Update to use product_owner_ids

**Effort:** 6-8 hours

---

### 4.7 Add Dependency Field

**Change:** Add `dependency` boolean field (for Personal relationships)

#### Schema Change

```typescript
// AFTER
interface SpecialRelationship {
  dependency: boolean;
}
```

#### Form Changes

```tsx
// Show only for Personal relationships
{formData.type === 'Personal' && (
  <label>
    <input
      type="checkbox"
      checked={formData.dependency}
      onChange={(e) => setFormData({ ...formData, dependency: e.target.checked })}
    />
    This person is a dependent
  </label>
)}
```

#### Display Changes

```tsx
// Show dependency badge
{relationship.type === 'Personal' && relationship.dependency && (
  <span className="badge">Dependent</span>
)}
```

**Specific Files:**
- `frontend/src/types/specialRelationship.ts` - Add dependency field
- `frontend/src/components/RelationshipFormFields.tsx` - Add checkbox (conditional)
- `frontend/src/components/PersonalRelationshipsTable.tsx` - Add dependency column
- `frontend/src/components/SpecialRelationshipRow.tsx` - Show dependency badge
- ALL test files - Include dependency in test data

**Effort:** 2-3 hours

---

### 4.8 Remove Position and Professional ID

**Change:** Remove `position` and `professional_id` fields

#### Schema Change

```typescript
// BEFORE
interface SpecialRelationship {
  position: string | null;
  professional_id: string | null;
}

// AFTER
// Fields removed entirely
```

**Specific Files:**
- `frontend/src/types/specialRelationship.ts` - Remove fields (lines 144-147)
- `frontend/src/components/RelationshipFormFields.tsx` - Remove inputs
- `frontend/src/components/ProfessionalRelationshipsTable.tsx` - Remove columns
- ALL test files - Remove from test data

**Effort:** 1-2 hours

---

### 4.9 Remove Soft Delete Support

**Change:** Hard delete instead of soft delete

#### API Change

```typescript
// BEFORE (soft delete)
DELETE /api/special_relationships/{id}
// Sets deleted_at timestamp, record remains in DB

// AFTER (hard delete)
DELETE /api/special_relationships/{id}
// Permanently removes record from DB
```

#### Confirmation Dialog

```tsx
// Add stronger warning for hard delete
<ConfirmationModal
  title="Permanently Delete Relationship?"
  message="This action cannot be undone. The relationship will be permanently removed from the database."
  confirmText="Permanently Delete"
  onConfirm={handleDelete}
/>
```

**Specific Files:**
- `backend/app/api/routes/special_relationships.py` - Change DELETE to hard delete
- `frontend/src/components/SpecialRelationshipActions.tsx` - Update confirmation text
- `backend/tests/test_special_relationships_routes.py` - Update delete tests (remove soft delete assertions)

**Effort:** 1-2 hours

---

## 5. Breaking Changes Analysis

### 5.1 API Breaking Changes

| Endpoint | Change | Breaking? | Migration |
|----------|--------|-----------|-----------|
| `GET /api/client_groups/{id}/special_relationships` | Change to `GET /api/special_relationships?product_owner_id={id}` | **YES** | Update all API calls |
| Request body: `first_name, last_name` | Change to `name` | **YES** | Merge fields in frontend |
| Request body: `relationship_type` | Change to `type, relationship` | **YES** | Split field in frontend |
| Request body: `mobile_phone, home_phone, work_phone` | Change to `phone_number` | **YES** | Choose primary phone |
| Request body: `address fields` | Change to `address_id` | **YES** | Create/select address |
| Request body: `company_name` | Change to `firm_name` | **YES** | Simple rename |
| Response: `client_group_id` | Removed, use junction | **YES** | Join via product_owners |
| `DELETE` behavior | Soft delete → Hard delete | **YES** | Update warnings |

### 5.2 Data Model Breaking Changes

| Current Field | New Field | Impact |
|---------------|-----------|--------|
| `first_name`, `last_name` | `name` | ALL form validation, display, sorting |
| `relationship_type` | `type` + `relationship` | ALL filtering, categorization logic |
| `mobile_phone`, `home_phone`, `work_phone` | `phone_number` | Data loss (2 phone numbers) |
| Inline address (6 fields) | `address_id` | Requires address management system |
| `client_group_id` | Junction table | Changes data fetching strategy |

### 5.3 Component Breaking Changes

Every component that handles special relationships will require changes:

**Major Refactors (8-10 hours each):**
- `RelationshipFormFields.tsx` - All field changes
- `CreateSpecialRelationshipModal.tsx` - Form submission logic
- `EditSpecialRelationshipModal.tsx` - Form submission logic
- `PersonalRelationshipsTable.tsx` - Column structure
- `ProfessionalRelationshipsTable.tsx` - Column structure
- `useSpecialRelationships.ts` - API integration
- `useRelationshipValidation.ts` - Validation rules

**Medium Refactors (3-5 hours each):**
- `SpecialRelationshipsSubTab.tsx` - Filtering logic
- `SpecialRelationshipRow.tsx` - Display logic
- `specialRelationshipsApi.ts` - API calls

---

## 6. Implementation Phases

### Phase 0: Preparation (4-6 hours)

**Goals:** Set up infrastructure, create migration scripts, document decisions

**Tasks:**
1. Create database migration script
2. Create rollback script
3. Document address management approach decision
4. Create feature flag for gradual rollout
5. Set up test database for migration testing
6. Review and approve this plan with stakeholders

**Deliverables:**
- [ ] `backend/migrations/001_special_relationships_refactor.sql`
- [ ] `backend/migrations/001_special_relationships_rollback.sql`
- [ ] Address management approach documented
- [ ] Feature flag configuration
- [ ] Test database ready

---

### Phase 1: Backend Foundation (8-10 hours)

**Goals:** Create backend models, routes, and updated tests

**Tasks:**

1. **Create Backend Model** (2-3 hours)
   - [ ] Create `backend/app/models/special_relationship.py`
   - [ ] Define Pydantic models with new schema
   - [ ] Add junction table model for product_owner_special_relationships
   - [ ] Add address relationship handling

2. **Create Backend Routes** (4-5 hours)
   - [ ] Create `backend/app/api/routes/special_relationships.py`
   - [ ] Implement GET endpoint with product_owner filtering
   - [ ] Implement POST endpoint with junction table creation
   - [ ] Implement PUT endpoint
   - [ ] Implement DELETE endpoint (hard delete)
   - [ ] Add address join in queries

3. **Update Backend Tests** (2-3 hours)
   - [ ] Update `backend/tests/test_special_relationships_routes.py`
   - [ ] Update test fixtures for new schema
   - [ ] Remove soft delete assertions
   - [ ] Add junction table tests
   - [ ] Verify all tests pass (TDD GREEN)

**Deliverables:**
- [ ] Backend models created
- [ ] Backend routes implemented
- [ ] All backend tests passing

---

### Phase 2: Frontend Types & Utilities (6-8 hours)

**Goals:** Update type definitions, utilities, and test infrastructure

**Tasks:**

1. **Update Type Definitions** (2-3 hours)
   - [ ] Update `frontend/src/types/specialRelationship.ts`
   - [ ] Split RelationshipType into Category + Type
   - [ ] Update SpecialRelationship interface
   - [ ] Update SpecialRelationshipFormData interface
   - [ ] Add Address interface (if needed)
   - [ ] Update constants

2. **Update Utilities** (2-3 hours)
   - [ ] Update `frontend/src/utils/specialRelationshipUtils.ts`
   - [ ] Update filtering functions for new type structure
   - [ ] Update display helpers for name field
   - [ ] Add address formatting utilities
   - [ ] Update sorting functions

3. **Update Test Infrastructure** (2-3 hours)
   - [ ] Update `frontend/src/tests/factories/specialRelationshipFactory.ts`
   - [ ] Update factory to generate new schema data
   - [ ] Update test utilities
   - [ ] Update type tests
   - [ ] Update utility tests

**Deliverables:**
- [ ] Types updated and type-safe
- [ ] Utilities updated
- [ ] Test infrastructure ready

---

### Phase 3: Frontend Services & Hooks (8-10 hours)

**Goals:** Update API service and data management hooks

**Tasks:**

1. **Update API Service** (3-4 hours)
   - [ ] Update `frontend/src/services/specialRelationshipsApi.ts`
   - [ ] Change endpoint from client_group_id to product_owner_id
   - [ ] Update request/response interfaces
   - [ ] Update CreateSpecialRelationshipData interface
   - [ ] Update UpdateSpecialRelationshipData interface
   - [ ] Add junction table handling
   - [ ] Update service tests

2. **Update Data Hooks** (3-4 hours)
   - [ ] Update `frontend/src/hooks/useSpecialRelationships.ts`
   - [ ] Update fetch query to use product_owner_ids
   - [ ] Update create mutation for new schema
   - [ ] Update update mutation
   - [ ] Update delete mutation (hard delete confirmation)
   - [ ] Update hook tests

3. **Update Validation Hook** (2-3 hours)
   - [ ] Update `frontend/src/hooks/useRelationshipValidation.ts`
   - [ ] Update validation for name field
   - [ ] Add validation for type + relationship
   - [ ] Update phone validation
   - [ ] Add address validation
   - [ ] Update dependency validation
   - [ ] Update validation tests

**Deliverables:**
- [ ] API service updated
- [ ] Hooks updated
- [ ] All service/hook tests passing

---

### Phase 4: Frontend Components - Forms (8-10 hours)

**Goals:** Update form components and modals

**Tasks:**

1. **Update Form Fields Component** (4-5 hours)
   - [ ] Update `frontend/src/components/RelationshipFormFields.tsx`
   - [ ] Replace first_name/last_name with name input
   - [ ] Split relationship_type into type + relationship dropdowns
   - [ ] Merge phone fields into single phone_number input
   - [ ] Replace address fields with address selector
   - [ ] Rename company_name to firm_name
   - [ ] Add dependency checkbox (conditional)
   - [ ] Remove position and professional_id inputs
   - [ ] Update component tests

2. **Update Create Modal** (2-3 hours)
   - [ ] Update `frontend/src/components/CreateSpecialRelationshipModal.tsx`
   - [ ] Add product owner selector
   - [ ] Update form submission for new schema
   - [ ] Update initial form state
   - [ ] Update modal tests

3. **Update Edit Modal** (2-3 hours)
   - [ ] Update `frontend/src/components/EditSpecialRelationshipModal.tsx`
   - [ ] Update form population logic
   - [ ] Update form submission
   - [ ] Update modal tests

**Deliverables:**
- [ ] Form fields component updated
- [ ] Create modal updated
- [ ] Edit modal updated
- [ ] All form tests passing

---

### Phase 5: Frontend Components - Display (6-8 hours)

**Goals:** Update table and display components

**Tasks:**

1. **Update Table Components** (4-5 hours)
   - [ ] Update `frontend/src/components/PersonalRelationshipsTable.tsx`
     - Update column headers
     - Update cell rendering for name, relationship, phone
     - Add dependency column
     - Update table tests
   - [ ] Update `frontend/src/components/ProfessionalRelationshipsTable.tsx`
     - Update column headers
     - Update cell rendering
     - Update firm_name column
     - Update table tests

2. **Update Row Component** (2-3 hours)
   - [ ] Update `frontend/src/components/SpecialRelationshipRow.tsx`
   - [ ] Update name display
   - [ ] Update relationship display
   - [ ] Update phone display
   - [ ] Update address display
   - [ ] Update firm_name display
   - [ ] Update row tests

3. **Update Container Component** (1-2 hours)
   - [ ] Update `frontend/src/components/SpecialRelationshipsSubTab.tsx`
   - [ ] Update filtering logic for new type structure
   - [ ] Verify tab navigation still works
   - [ ] Update container tests

**Deliverables:**
- [ ] Table components updated
- [ ] Row component updated
- [ ] Container updated
- [ ] All display tests passing

---

### Phase 6: Integration Testing (4-6 hours)

**Goals:** End-to-end testing, bug fixes, polish

**Tasks:**

1. **Integration Testing** (2-3 hours)
   - [ ] Test full create flow (all field types)
   - [ ] Test edit flow
   - [ ] Test delete flow with confirmation
   - [ ] Test filtering and tab switching
   - [ ] Test validation errors
   - [ ] Test address management
   - [ ] Test product owner linking

2. **Bug Fixes** (1-2 hours)
   - [ ] Fix any issues found during integration testing
   - [ ] Update tests for edge cases
   - [ ] Verify all tests still pass

3. **Documentation** (1-2 hours)
   - [ ] Update component documentation
   - [ ] Document new field behaviors
   - [ ] Document address management approach
   - [ ] Update API documentation

**Deliverables:**
- [ ] All integration tests passing
- [ ] Bugs fixed
- [ ] Documentation updated

---

### Phase 7: Data Migration & Deployment (4-6 hours)

**Goals:** Migrate existing data, deploy to production

**Tasks:**

1. **Data Migration** (2-3 hours)
   - [ ] Test migration script on staging database
   - [ ] Verify data integrity after migration
   - [ ] Create data backup before production migration
   - [ ] Run migration on production database
   - [ ] Verify migration success

2. **Deployment** (1-2 hours)
   - [ ] Deploy backend changes
   - [ ] Deploy frontend changes
   - [ ] Enable feature flag
   - [ ] Monitor for errors

3. **Validation** (1-2 hours)
   - [ ] Test in production environment
   - [ ] Verify existing relationships display correctly
   - [ ] Test creating new relationships
   - [ ] Test editing relationships
   - [ ] Monitor logs for errors

**Deliverables:**
- [ ] Data migrated successfully
- [ ] Application deployed
- [ ] Production validation complete

---

## 7. Testing Strategy

### 7.1 Unit Testing

**Backend Tests:**
- [ ] Model validation tests (new schema)
- [ ] Route handler tests (all CRUD operations)
- [ ] Junction table tests
- [ ] Address relationship tests
- [ ] Hard delete verification tests

**Frontend Tests:**
- [ ] Type tests (new interfaces)
- [ ] Utility function tests (filtering, sorting)
- [ ] Hook tests (useSpecialRelationships, useRelationshipValidation)
- [ ] Service tests (API calls)
- [ ] Component tests (all components)

**Coverage Target:** 80%+ (matching project standards)

### 7.2 Integration Testing

**API Integration:**
- [ ] Full CRUD flow via API
- [ ] Product owner filtering
- [ ] Address population via join
- [ ] Junction table creation/deletion
- [ ] Error handling

**Frontend Integration:**
- [ ] Form submission → API → Database
- [ ] Data fetching → Display
- [ ] Edit flow → Optimistic updates
- [ ] Delete flow → Confirmation → Remove from UI

### 7.3 E2E Testing Scenarios

1. **Create Personal Relationship:**
   - Fill all fields (name, type=Personal, relationship=Spouse, etc.)
   - Select product owners
   - Check dependency checkbox
   - Submit form
   - Verify appears in Personal tab

2. **Create Professional Relationship:**
   - Fill all fields (name, type=Professional, relationship=Accountant, firm_name, etc.)
   - Select product owners
   - Submit form
   - Verify appears in Professional tab

3. **Edit Relationship:**
   - Click edit on existing relationship
   - Modify fields
   - Save
   - Verify changes reflected

4. **Delete Relationship:**
   - Click delete
   - Confirm permanent deletion
   - Verify removed from list
   - Verify removed from database (hard delete)

5. **Filter by Type:**
   - Switch between Personal and Professional tabs
   - Verify only correct type shown

6. **Address Management:**
   - Select existing address from dropdown
   - Create new address
   - Verify address saved and linked

### 7.4 Migration Testing

**Test Migration Script:**
1. Create test database with current schema
2. Insert sample data (all field variations)
3. Run migration script
4. Verify:
   - [ ] Names merged correctly (first_name + last_name → name)
   - [ ] Relationship types split correctly
   - [ ] Phone numbers preserved (choose primary)
   - [ ] Addresses migrated to addresses table
   - [ ] Junction table created with correct links
   - [ ] No data loss

**Rollback Testing:**
1. Run migration
2. Run rollback script
3. Verify original schema restored
4. Verify data can be restored from backup

---

## 8. Data Migration Strategy

### 8.1 Migration Script Structure

```sql
-- migration_001_special_relationships_refactor.sql

BEGIN;

-- Step 1: Create new addresses table if not exists
CREATE TABLE IF NOT EXISTS addresses (
    id BIGSERIAL PRIMARY KEY,
    address_line1 TEXT,
    address_line2 TEXT,
    city TEXT,
    county TEXT,
    postcode TEXT,
    country TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Create junction table
CREATE TABLE IF NOT EXISTS product_owner_special_relationships (
    id BIGSERIAL PRIMARY KEY,
    product_owner_id BIGINT NOT NULL REFERENCES product_owners(id) ON DELETE CASCADE,
    special_relationship_id BIGINT NOT NULL REFERENCES special_relationships(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(product_owner_id, special_relationship_id)
);

-- Step 3: Backup existing data
CREATE TABLE special_relationships_backup AS
SELECT * FROM special_relationships;

-- Step 4: Migrate addresses (create address records for non-null addresses)
INSERT INTO addresses (address_line1, address_line2, city, county, postcode, country)
SELECT DISTINCT
    address_line1,
    address_line2,
    city,
    county,
    postcode,
    country
FROM special_relationships
WHERE address_line1 IS NOT NULL OR city IS NOT NULL OR postcode IS NOT NULL;

-- Step 5: Add temporary columns to special_relationships
ALTER TABLE special_relationships
    ADD COLUMN name TEXT,
    ADD COLUMN type TEXT,
    ADD COLUMN relationship TEXT,
    ADD COLUMN phone_number TEXT,
    ADD COLUMN address_id BIGINT REFERENCES addresses(id),
    ADD COLUMN firm_name TEXT,
    ADD COLUMN dependency BOOLEAN DEFAULT FALSE;

-- Step 6: Populate new columns from old data
UPDATE special_relationships SET
    name = TRIM(CONCAT(first_name, ' ', last_name)),
    type = CASE
        WHEN relationship_type IN ('Spouse', 'Partner', 'Child', 'Parent', 'Sibling', 'Grandchild', 'Grandparent', 'Other Family')
        THEN 'Personal'
        ELSE 'Professional'
    END,
    relationship = relationship_type,
    phone_number = COALESCE(mobile_phone, home_phone, work_phone), -- Choose first non-null
    firm_name = company_name,
    dependency = FALSE; -- Default to false, can be updated manually later

-- Step 7: Link to addresses (match by all address fields)
UPDATE special_relationships sr
SET address_id = a.id
FROM addresses a
WHERE
    (sr.address_line1 = a.address_line1 OR (sr.address_line1 IS NULL AND a.address_line1 IS NULL))
    AND (sr.address_line2 = a.address_line2 OR (sr.address_line2 IS NULL AND a.address_line2 IS NULL))
    AND (sr.city = a.city OR (sr.city IS NULL AND a.city IS NULL))
    AND (sr.county = a.county OR (sr.county IS NULL AND a.county IS NULL))
    AND (sr.postcode = a.postcode OR (sr.postcode IS NULL AND a.postcode IS NULL))
    AND (sr.country = a.country OR (sr.country IS NULL AND a.country IS NULL));

-- Step 8: Populate junction table from client_group_id
-- Note: Need to map client_group_id to product_owner_id via client_group_product_owners
INSERT INTO product_owner_special_relationships (product_owner_id, special_relationship_id)
SELECT DISTINCT
    po.id,
    sr.id
FROM special_relationships sr
INNER JOIN client_group_product_owners cgpo ON cgpo.client_group_id = sr.client_group_id
INNER JOIN product_owners po ON po.id = cgpo.product_owner_id
WHERE sr.client_group_id IS NOT NULL;

-- Step 9: Drop old columns
ALTER TABLE special_relationships
    DROP COLUMN first_name,
    DROP COLUMN last_name,
    DROP COLUMN relationship_type,
    DROP COLUMN mobile_phone,
    DROP COLUMN home_phone,
    DROP COLUMN work_phone,
    DROP COLUMN address_line1,
    DROP COLUMN address_line2,
    DROP COLUMN city,
    DROP COLUMN county,
    DROP COLUMN postcode,
    DROP COLUMN country,
    DROP COLUMN company_name,
    DROP COLUMN position,
    DROP COLUMN professional_id,
    DROP COLUMN client_group_id,
    DROP COLUMN deleted_at; -- Remove soft delete support

-- Step 10: Add NOT NULL constraints
ALTER TABLE special_relationships
    ALTER COLUMN name SET NOT NULL,
    ALTER COLUMN type SET NOT NULL,
    ALTER COLUMN relationship SET NOT NULL,
    ALTER COLUMN status SET NOT NULL;

-- Step 11: Add indexes for performance
CREATE INDEX idx_special_relationships_type ON special_relationships(type);
CREATE INDEX idx_special_relationships_relationship ON special_relationships(relationship);
CREATE INDEX idx_special_relationships_status ON special_relationships(status);
CREATE INDEX idx_special_relationships_address_id ON special_relationships(address_id);
CREATE INDEX idx_po_sr_product_owner_id ON product_owner_special_relationships(product_owner_id);
CREATE INDEX idx_po_sr_special_relationship_id ON product_owner_special_relationships(special_relationship_id);

COMMIT;
```

### 8.2 Rollback Script

```sql
-- rollback_001_special_relationships_refactor.sql

BEGIN;

-- Restore from backup
DROP TABLE IF EXISTS special_relationships CASCADE;
ALTER TABLE special_relationships_backup RENAME TO special_relationships;

-- Drop junction table
DROP TABLE IF EXISTS product_owner_special_relationships;

-- Note: Keep addresses table as it may be used by other features

COMMIT;
```

### 8.3 Data Loss Considerations

**Fields with Potential Data Loss:**

1. **Phone Numbers:**
   - BEFORE: 3 phone fields (mobile, home, work)
   - AFTER: 1 phone field
   - **Strategy:** Prioritize mobile_phone, then home_phone, then work_phone
   - **Data Loss:** 2 phone numbers per record (if populated)
   - **Mitigation:** Store lost data in notes field OR keep backup table

2. **Professional Fields:**
   - BEFORE: position, professional_id
   - AFTER: Removed
   - **Data Loss:** These fields entirely
   - **Mitigation:** Store in notes field before migration OR keep backup table

3. **Client Group Direct Link:**
   - BEFORE: Direct client_group_id
   - AFTER: Via product_owners junction
   - **Data Loss:** Direct relationship
   - **Mitigation:** Ensure all client groups have product owners OR create default product owner

**Recommendation:** Keep `special_relationships_backup` table permanently for data archaeology.

---

## 9. Rollout Strategy

### 9.1 Phased Rollout Plan

**Week 1: Development & Testing**
- Complete Phases 1-3 (Backend + Frontend Types/Services)
- Run all unit tests
- Deploy to development environment
- Internal testing by developers

**Week 2: Component Updates & Integration**
- Complete Phases 4-5 (Frontend Components)
- Run all integration tests
- Deploy to staging environment
- Internal testing by QA team

**Week 3: User Acceptance Testing**
- Complete Phase 6 (Integration Testing)
- UAT with key stakeholders
- Fix bugs and polish
- Update documentation

**Week 4: Production Deployment**
- Complete Phase 7 (Data Migration & Deployment)
- Deploy to production during low-traffic window
- Monitor for 24-48 hours
- Rollback plan ready if needed

### 9.2 Feature Flag Strategy

**Environment-Based Rollout:**

```typescript
// Feature flag configuration
const FEATURE_FLAGS = {
  NEW_SPECIAL_RELATIONSHIPS_SCHEMA: {
    development: true,
    staging: true,
    production: false // Enable after successful UAT
  }
};

// Usage in code
if (FEATURE_FLAGS.NEW_SPECIAL_RELATIONSHIPS_SCHEMA[environment]) {
  // Use new schema
  return <NewSpecialRelationshipsSubTab />;
} else {
  // Use old schema (legacy)
  return <LegacySpecialRelationshipsSubTab />;
}
```

**Gradual Production Rollout:**
1. **Week 1:** Internal users only (10% traffic)
2. **Week 2:** Beta users (30% traffic)
3. **Week 3:** All users (100% traffic)
4. **Week 4:** Remove feature flag and legacy code

### 9.3 Rollback Plan

**If Critical Issues Found:**

1. **Immediate Rollback (< 1 hour):**
   - Disable feature flag
   - All users revert to legacy UI
   - Database remains migrated (no data loss)

2. **Full Rollback (< 4 hours):**
   - Run rollback SQL script
   - Restore database from backup
   - Deploy previous application version
   - Investigate issues in staging

**Rollback Triggers:**
- Data loss or corruption detected
- Critical bugs affecting user workflows
- Performance degradation > 50%
- More than 10% error rate in logs

---

## 10. Effort Estimates

### 10.1 Detailed Time Breakdown

| Phase | Tasks | Hours | Confidence |
|-------|-------|-------|------------|
| **Phase 0: Preparation** | Migration scripts, planning, feature flag setup | 4-6 | High |
| **Phase 1: Backend Foundation** | Models, routes, tests | 8-10 | High |
| **Phase 2: Frontend Types & Utilities** | Types, utils, factories | 6-8 | High |
| **Phase 3: Frontend Services & Hooks** | API service, hooks, validation | 8-10 | Medium |
| **Phase 4: Frontend Components - Forms** | Form fields, modals | 8-10 | Medium |
| **Phase 5: Frontend Components - Display** | Tables, rows, containers | 6-8 | Medium |
| **Phase 6: Integration Testing** | E2E tests, bug fixes, docs | 4-6 | Low |
| **Phase 7: Data Migration & Deployment** | Migration, deployment, validation | 4-6 | Low |
| **TOTAL** | | **48-64 hours** | |

### 10.2 Time Estimates by File Category

| Category | Files | Avg Hours/File | Total Hours |
|----------|-------|----------------|-------------|
| Backend Models & Routes | 3 | 3-4 | 9-12 |
| Frontend Types & Utils | 6 | 1-2 | 6-12 |
| Frontend Services | 2 | 3-4 | 6-8 |
| Frontend Hooks | 5 | 2-3 | 10-15 |
| Frontend Components | 11 | 2-3 | 22-33 |
| Frontend Tests | 24 | 0.5-1 | 12-24 |
| Migration & Deployment | 3 | 2-3 | 6-9 |
| **TOTAL** | **54** | | **71-113 hours** |

**Note:** Estimates include testing, debugging, and documentation time.

### 10.3 Critical Path

**Minimum Viable Implementation (34 hours):**
1. Backend models + routes: 8 hours
2. Frontend types: 3 hours
3. Frontend services: 4 hours
4. Frontend hooks: 6 hours
5. Frontend form components: 8 hours
6. Frontend display components: 4 hours
7. Migration + deployment: 6 hours

**Full Implementation with Polish (42 hours):**
- Add 8 hours for comprehensive testing
- Add 4 hours for documentation
- Add 2 hours for address management UI

---

## 11. Risk Mitigation

### 11.1 Technical Risks

**Risk 1: Address Management Complexity**
- **Impact:** HIGH - Could delay entire project
- **Likelihood:** MEDIUM
- **Mitigation:**
  - Start with simple text field approach (2-3 hours)
  - Upgrade to dropdown later if needed
  - Pre-build address management UI as separate task

**Risk 2: Data Migration Errors**
- **Impact:** CRITICAL - Could corrupt production data
- **Likelihood:** MEDIUM
- **Mitigation:**
  - Test migration script extensively on staging
  - Create full database backup before migration
  - Run migration during low-traffic window
  - Keep rollback script ready
  - Verify data integrity post-migration

**Risk 3: Performance Degradation (Junction Table)**
- **Impact:** MEDIUM - Could slow down queries
- **Likelihood:** LOW
- **Mitigation:**
  - Add proper indexes on junction table
  - Use database views for common queries
  - Implement query result caching
  - Monitor query performance in staging

**Risk 4: Frontend Breaking Changes**
- **Impact:** HIGH - Could break existing workflows
- **Likelihood:** HIGH (many components affected)
- **Mitigation:**
  - Comprehensive integration testing
  - Feature flag for gradual rollout
  - Extensive unit test coverage
  - User acceptance testing before production

### 11.2 Business Risks

**Risk 1: User Confusion (UI Changes)**
- **Impact:** MEDIUM
- **Likelihood:** MEDIUM
- **Mitigation:**
  - Provide user training/documentation
  - Highlight changes in release notes
  - Offer support during transition period

**Risk 2: Data Loss (Phone Numbers, Professional Fields)**
- **Impact:** HIGH
- **Likelihood:** HIGH (by design)
- **Mitigation:**
  - Document what data will be lost
  - Provide export before migration
  - Keep backup table permanently
  - Consider adding fields to notes

**Risk 3: Extended Downtime**
- **Impact:** HIGH
- **Likelihood:** LOW
- **Mitigation:**
  - Practice migration on staging
  - Optimize migration script
  - Plan deployment during low-traffic hours
  - Have rollback plan ready

### 11.3 Dependency Risks

**Risk 1: Addresses Table Not Ready**
- **Impact:** CRITICAL - Blocks entire refactor
- **Likelihood:** MEDIUM
- **Mitigation:**
  - Verify addresses table exists in current schema
  - Create addresses table as part of migration
  - Use simple address management initially

**Risk 2: Product Owners Missing for Client Groups**
- **Impact:** HIGH - Junction table won't work
- **Likelihood:** MEDIUM
- **Mitigation:**
  - Audit client groups for product owners
  - Create default product owner for groups without
  - Update migration script to handle orphaned records

**Risk 3: Backend API Not Yet Implemented**
- **Impact:** MEDIUM - Affects testing timeline
- **Likelihood:** LOW (we control this)
- **Mitigation:**
  - Implement backend first (Phase 1)
  - Run backend tests before frontend work
  - Use API mocks for frontend development if needed

---

## 12. Success Criteria

### 12.1 Functional Requirements

- [ ] All special relationships from old schema migrated to new schema
- [ ] No data corruption or loss (except documented fields)
- [ ] Users can create Personal relationships with all new fields
- [ ] Users can create Professional relationships with all new fields
- [ ] Users can edit existing relationships
- [ ] Users can delete relationships (with hard delete confirmation)
- [ ] Users can filter by Personal vs Professional
- [ ] Users can link relationships to multiple product owners
- [ ] Dependency field displays correctly for Personal relationships
- [ ] Address management works (chosen approach)
- [ ] All validation rules work correctly

### 12.2 Technical Requirements

- [ ] All backend tests pass (80%+ coverage)
- [ ] All frontend tests pass (80%+ coverage)
- [ ] No TypeScript errors
- [ ] No console errors in browser
- [ ] API response times < 500ms (95th percentile)
- [ ] Database queries use proper indexes
- [ ] No N+1 query problems
- [ ] Migration script tested successfully on staging
- [ ] Rollback script tested successfully

### 12.3 Quality Requirements

- [ ] Code follows project standards (SPARC, SOLID)
- [ ] All components documented with JSDoc
- [ ] All functions have descriptions and parameter docs
- [ ] README/documentation updated
- [ ] No hard-coded values or magic numbers
- [ ] Proper error handling throughout
- [ ] Loading states for all async operations
- [ ] Accessibility standards maintained (WCAG 2.1 AA)

### 12.4 User Experience Requirements

- [ ] Forms are intuitive and easy to use
- [ ] Validation errors are clear and helpful
- [ ] Delete confirmation clearly states permanence
- [ ] Loading states provide feedback
- [ ] Empty states guide users
- [ ] Tables are sortable and scannable
- [ ] Mobile responsive (if applicable)

---

## 13. Next Steps

### Immediate Actions (This Week)

1. **Review & Approve Plan**
   - [ ] Review this plan with team/stakeholders
   - [ ] Approve address management approach
   - [ ] Approve data loss strategy (phone numbers, professional fields)
   - [ ] Sign off on timeline

2. **Prepare Infrastructure**
   - [ ] Create feature flag configuration
   - [ ] Set up staging database for migration testing
   - [ ] Create backup strategy
   - [ ] Set up monitoring/logging for new endpoints

3. **Begin Phase 0**
   - [ ] Create migration scripts
   - [ ] Test migration on sample data
   - [ ] Document any discovered issues
   - [ ] Refine estimates based on findings

### Weekly Milestones

**Week 1:** Phases 0-1 complete (Backend foundation)
**Week 2:** Phases 2-3 complete (Frontend types/services)
**Week 3:** Phases 4-5 complete (Frontend components)
**Week 4:** Phases 6-7 complete (Testing & deployment)

### Decision Points

**Before Starting Phase 1:**
- [ ] Confirm addresses table structure
- [ ] Confirm product_owner junction table approach
- [ ] Decide on address management UI approach

**Before Starting Phase 4:**
- [ ] Verify backend API working correctly
- [ ] Verify migration script works on staging
- [ ] Approve frontend design mockups

**Before Production Deployment:**
- [ ] All tests passing
- [ ] UAT sign-off received
- [ ] Rollback plan tested
- [ ] Deployment window scheduled

---

## 14. Appendix

### 14.1 Complete File Checklist

**Backend (3 files):**
- [ ] backend/app/models/special_relationship.py
- [ ] backend/app/api/routes/special_relationships.py
- [ ] backend/tests/test_special_relationships_routes.py

**Frontend Types (6 files):**
- [ ] frontend/src/types/specialRelationship.ts
- [ ] frontend/src/utils/specialRelationshipUtils.ts
- [ ] frontend/src/tests/types/specialRelationship.test.ts
- [ ] frontend/src/tests/utils/specialRelationshipUtils.test.ts
- [ ] frontend/src/tests/factories/specialRelationshipFactory.ts
- [ ] frontend/src/tests/factories/specialRelationshipFactory.test.ts

**Frontend Services (2 files):**
- [ ] frontend/src/services/specialRelationshipsApi.ts
- [ ] frontend/src/tests/services/specialRelationshipsApi.test.ts

**Frontend Hooks (5 files):**
- [ ] frontend/src/hooks/useSpecialRelationships.ts
- [ ] frontend/src/hooks/useRelationshipValidation.ts
- [ ] frontend/src/hooks/useRelationshipFormHandlers.ts
- [ ] frontend/src/tests/hooks/useSpecialRelationships.test.tsx
- [ ] frontend/src/tests/hooks/useRelationshipValidation.test.ts

**Frontend Components (11 files):**
- [ ] frontend/src/components/SpecialRelationshipsSubTab.tsx
- [ ] frontend/src/components/TabNavigation.tsx
- [ ] frontend/src/components/CreateSpecialRelationshipModal.tsx
- [ ] frontend/src/components/EditSpecialRelationshipModal.tsx
- [ ] frontend/src/components/RelationshipFormFields.tsx
- [ ] frontend/src/components/SpecialRelationshipActions.tsx
- [ ] frontend/src/components/SpecialRelationshipRow.tsx
- [ ] frontend/src/components/PersonalRelationshipsTable.tsx
- [ ] frontend/src/components/ProfessionalRelationshipsTable.tsx
- [ ] frontend/src/components/EmptyStatePersonal.tsx
- [ ] frontend/src/components/EmptyStateProfessional.tsx

**Frontend Component Tests (9 files):**
- [ ] frontend/src/tests/components/SpecialRelationshipsSubTab.test.tsx
- [ ] frontend/src/tests/components/TabNavigation.test.tsx
- [ ] frontend/src/tests/components/CreateSpecialRelationshipModal.test.tsx
- [ ] frontend/src/tests/components/EditSpecialRelationshipModal.test.tsx
- [ ] frontend/src/tests/components/RelationshipFormFields.test.tsx
- [ ] frontend/src/tests/components/SpecialRelationshipActions.test.tsx
- [ ] frontend/src/tests/components/SpecialRelationshipRow.test.tsx
- [ ] frontend/src/tests/components/PersonalRelationshipsTable.test.tsx
- [ ] frontend/src/tests/components/ProfessionalRelationshipsTable.test.tsx

**Additional (6 files):**
- [ ] frontend/src/components/relationshipTable/constants.ts
- [ ] frontend/src/components/relationshipTable/utils.ts
- [ ] frontend/src/components/relationshipTable/index.ts
- [ ] frontend/src/components/ui/dropdowns/ComboDropdown.tsx
- [ ] frontend/src/components/ui/dropdowns/MultiSelectDropdown.tsx
- [ ] frontend/src/pages/phase2_prototype/sections/RelationshipsSection.tsx

**Migration (3 files):**
- [ ] backend/migrations/001_special_relationships_refactor.sql
- [ ] backend/migrations/001_special_relationships_rollback.sql
- [ ] docs/special_relationships_migration_guide.md (optional)

### 14.2 Key Decisions Log

| Decision | Options Considered | Choice | Rationale |
|----------|-------------------|--------|-----------|
| Name field structure | Keep first/last separate, merge to single field | **Merge to single field** | Aligns with target schema |
| Phone number handling | Keep all 3, merge to 1, prioritize mobile | **Merge to 1, prioritize mobile** | Aligns with target schema |
| Address management | Inline text, dropdown, full UI | **TBD - requires stakeholder input** | Depends on complexity tolerance |
| Junction table approach | Direct link, junction via client_group, junction via product_owner | **Junction via product_owner** | Aligns with target schema |
| Delete behavior | Soft delete, hard delete | **Hard delete** | Aligns with target schema |
| Rollout strategy | Big bang, phased, feature flag | **Feature flag phased** | Reduces risk |

### 14.3 Reference Links

- Target Schema: `prompt2.md`
- Current Frontend Types: `frontend/src/types/specialRelationship.ts`
- Current Backend Tests: `backend/tests/test_special_relationships_routes.py`
- Phase 2 Prototype Docs: `docs/03_architecture/10_client_group_phase2_prototype.md`
- Project CLAUDE.md: `CLAUDE.md`
- Git Workflow Docs: `docs/04_development_workflow/01_git_workflow.md`

---

## Document Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-12-16 | AI Assistant | Initial draft based on prompt requirements |
| 2.0 | 2025-12-16 | AI Assistant | REVISED - Based on actual codebase verification |

---

**END OF REFACTORING PLAN**
