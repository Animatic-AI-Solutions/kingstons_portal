# Create Client Group Implementation Plan - UPDATED

**Date**: 2025-12-03
**Status**: Ready for Implementation
**Estimated Time**: 41 hours

---

## Database Schema Update (COMPLETED ✅)

**Migration Applied**: Added 3 fields to `product_owners` table
- `title` (text) - Honorific title
- `middle_names` (text) - Middle name(s)
- `relationship_status` (text) - Marital status

**Result**: product_owners table now has **25 fields** (was 22)

---

## Phase 1: SPECIFICATION

### 1.1 Updated Product Owner Form Data (25 fields)

```typescript
interface ProductOwnerFormData {
  // Core Identity (6 fields)
  status: 'active' | 'inactive';
  firstname: string;
  surname: string;
  known_as: string;

  // Personal Details (8 fields) ← UPDATED: was 5, now 8
  title: string;                         // ✨ NEW: Mr, Mrs, Miss, Ms, Dr, Prof, etc.
  middle_names: string;                  // ✨ NEW: Middle name(s)
  relationship_status: string;           // ✨ NEW: Single, Married, etc.
  gender: 'Male' | 'Female' | 'Other' | 'Prefer not to say';
  previous_names: string;
  dob: string;  // ISO date (YYYY-MM-DD)
  // age: auto-calculated by database
  place_of_birth: string;

  // Contact Information (4 fields)
  email_1: string;
  email_2: string;
  phone_1: string;
  phone_2: string;

  // Residential Information (2 fields)
  moved_in_date: string;  // ISO date
  address_id: number | null;

  // Client Profiling (2 fields)
  three_words: string;
  share_data_with: string;

  // Employment Information (2 fields)
  employment_status: 'Employed' | 'Self-Employed' | 'Retired' | 'Unemployed' | 'Student' | 'Other';
  occupation: string;

  // Identity & Compliance (4 fields)
  passport_expiry_date: string;  // ISO date
  ni_number: string;
  aml_result: 'Pass' | 'Fail' | 'Pending' | null;
  aml_date: string;  // ISO date
}
```

### 1.2 Dropdown Options for New Fields

```typescript
// constants/clientGroup.ts

export const TITLE_OPTIONS = [
  'Mr',
  'Mrs',
  'Miss',
  'Ms',
  'Dr',
  'Prof',
  'Rev',
  'Sir',
  'Dame',
  'Lord',
  'Lady',
  'Other'
] as const;

export const RELATIONSHIP_STATUS_OPTIONS = [
  'Single',
  'Married',
  'Divorced',
  'Widowed',
  'Civil Partnership',
  'Separated',
  'Cohabiting'
] as const;

export const GENDER_OPTIONS = [
  'Male',
  'Female',
  'Other',
  'Prefer not to say'
] as const;

export const EMPLOYMENT_STATUS_OPTIONS = [
  'Employed',
  'Self-Employed',
  'Retired',
  'Unemployed',
  'Student',
  'Other'
] as const;
```

### 1.3 Updated Validation Requirements

**New Field Validations:**
- `title`: Optional, must be from TITLE_OPTIONS if provided
- `middle_names`: Optional, free text, max 100 characters
- `relationship_status`: Optional, must be from RELATIONSHIP_STATUS_OPTIONS if provided

**Existing Validations (unchanged):**
- `firstname`: Required, min 1 character
- `surname`: Required, min 1 character
- `dob`: Required, valid date, not in future
- `email_1`: Required, valid email format
- `phone_1`: Required, valid phone format
- `ni_number`: Optional, UK NI format if provided

---

## Phase 2: FORM LAYOUT

### 2.1 Product Owner Form Structure (Updated)

```
┌─────────────────────────────────────────────────────────┐
│ Product Owner Form                                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Personal Details                                        │
│ ├─ Row 1: [Title ▼] [First Name    ] [Middle Names  ] │ ← NEW: title & middle_names
│ ├─ Row 2: [Surname         ] [Known As           ]     │
│ ├─ Row 3: [Gender ▼] [Relationship Status ▼]           │ ← NEW: relationship_status
│ ├─ Row 4: [Date of Birth] [Place of Birth]             │
│ └─ Row 5: [Previous Names (if any)              ]      │
│                                                         │
│ Contact Information                                     │
│ ├─ Row 1: [Primary Email  ] [Secondary Email  ]        │
│ └─ Row 2: [Primary Phone  ] [Secondary Phone  ]        │
│                                                         │
│ Residential Information                                 │
│ ├─ Address Line 1: [                          ]        │
│ ├─ Address Line 2: [                          ]        │
│ ├─ Address Line 3: [                          ]        │
│ ├─ Address Line 4: [                          ]        │
│ ├─ Address Line 5: [                          ]        │
│ └─ Date Moved In:  [          ]                        │
│                                                         │
│ Client Profiling                                        │
│ ├─ Three Words: [                              ]       │
│ └─ Share Data With: [                          ]       │
│                                                         │
│ Employment Information                                  │
│ ├─ Employment Status: [Employed ▼]                     │
│ └─ Occupation: [                               ]       │
│                                                         │
│ Identity & Compliance                                   │
│ ├─ NI Number: [          ] Passport Expiry: [      ]   │
│ └─ AML Result: [Pass ▼] AML Date: [           ]        │
│                                                         │
│ [Cancel] [Save Product Owner]                           │
└─────────────────────────────────────────────────────────┘
```

### 2.2 Field Display Logic

**Title Field:**
- Dropdown with 12 options
- Positioned BEFORE firstname
- Optional field (no required asterisk)
- Default: empty/unselected

**Middle Names Field:**
- Text input
- Positioned AFTER firstname, BEFORE surname
- Optional field
- Placeholder: "Enter middle name(s)"

**Relationship Status Field:**
- Dropdown with 7 options
- Positioned in Personal Details section, row with gender
- Optional field
- Default: empty/unselected

---

## Phase 3: IMPLEMENTATION UPDATES

### 3.1 File Structure (Updated)

```
frontend/src/
├── types/
│   └── clientGroupForm.ts (UPDATE - 25 fields for ProductOwner)
│
├── constants/
│   └── clientGroup.ts (NEW - Add TITLE_OPTIONS, RELATIONSHIP_STATUS_OPTIONS)
│
├── utils/
│   └── validation/
│       └── productOwnerValidation.ts (UPDATE - Add title/relationship_status validation)
│
├── pages/
│   └── CreateClientGroupPrototype.tsx (UPDATE - Add 3 new fields to form)
│
└── tests/
    ├── utils/
    │   └── productOwnerValidation.test.ts (UPDATE - Test new fields)
    └── pages/
        └── CreateClientGroupPrototype.test.tsx (UPDATE - Test new fields)
```

### 3.2 Step-by-Step Changes

#### Step 1: Update Type Definitions (30 minutes)

**File**: `frontend/src/types/clientGroupForm.ts`

```typescript
export interface ProductOwnerFormData {
  // Core Identity (6 fields)
  status: 'active' | 'inactive';
  firstname: string;
  surname: string;
  known_as: string;

  // Personal Details (8 fields) ← Changed from 5 to 8
  title: string;                    // ✨ NEW
  middle_names: string;             // ✨ NEW
  relationship_status: string;      // ✨ NEW
  gender: string;
  previous_names: string;
  dob: string;
  place_of_birth: string;

  // ... rest of fields unchanged
}
```

#### Step 2: Add Constants (15 minutes)

**File**: `frontend/src/constants/clientGroup.ts`

```typescript
export const TITLE_OPTIONS = [
  'Mr', 'Mrs', 'Miss', 'Ms', 'Dr', 'Prof',
  'Rev', 'Sir', 'Dame', 'Lord', 'Lady', 'Other'
] as const;

export const RELATIONSHIP_STATUS_OPTIONS = [
  'Single', 'Married', 'Divorced', 'Widowed',
  'Civil Partnership', 'Separated', 'Cohabiting'
] as const;
```

#### Step 3: Update Validation (45 minutes)

**File**: `frontend/src/utils/validation/productOwnerValidation.ts`

```typescript
import { TITLE_OPTIONS, RELATIONSHIP_STATUS_OPTIONS } from '@/constants/clientGroup';

export const validateProductOwner = (data: ProductOwnerFormData): ValidationErrors => {
  const errors: Record<string, string> = {};

  // Existing validations...
  if (!data.firstname?.trim()) errors.firstname = 'First name is required';
  if (!data.surname?.trim()) errors.surname = 'Surname is required';

  // NEW: Title validation (optional, but must be valid if provided)
  if (data.title && !TITLE_OPTIONS.includes(data.title as any)) {
    errors.title = 'Please select a valid title';
  }

  // NEW: Middle names validation (optional, max length)
  if (data.middle_names && data.middle_names.length > 100) {
    errors.middle_names = 'Middle names must be less than 100 characters';
  }

  // NEW: Relationship status validation (optional, but must be valid if provided)
  if (data.relationship_status && !RELATIONSHIP_STATUS_OPTIONS.includes(data.relationship_status as any)) {
    errors.relationship_status = 'Please select a valid relationship status';
  }

  // ... rest of validations

  return Object.keys(errors).length > 0 ? errors : null;
};
```

#### Step 4: Update Form UI (1 hour)

**File**: `frontend/src/pages/CreateClientGroupPrototype.tsx`

```typescript
import { TITLE_OPTIONS, RELATIONSHIP_STATUS_OPTIONS } from '@/constants/clientGroup';
import { BaseInput, BaseDropdown } from '@/components/ui';

// Inside render function:

{/* Personal Details Section */}
<div className="mb-6">
  <h4 className="text-sm font-semibold text-gray-700 uppercase mb-4">
    Personal Details
  </h4>
  <div className="grid grid-cols-3 gap-4">
    {/* Row 1: Title, Firstname, Middle Names */}
    <BaseDropdown
      label="Title"
      value={ownerData.title}
      onChange={(val) => handleFieldChange('title', val)}
      options={TITLE_OPTIONS.map(opt => ({ value: opt, label: opt }))}
      placeholder="Select title"
      error={errors.title}
    />
    <BaseInput
      label="First Name"
      value={ownerData.firstname}
      onChange={(e) => handleFieldChange('firstname', e.target.value)}
      required
      error={errors.firstname}
    />
    <BaseInput
      label="Middle Names"
      value={ownerData.middle_names}
      onChange={(e) => handleFieldChange('middle_names', e.target.value)}
      placeholder="Enter middle name(s)"
      error={errors.middle_names}
    />
  </div>

  <div className="grid grid-cols-2 gap-4 mt-4">
    {/* Row 2: Surname, Known As */}
    <BaseInput
      label="Surname"
      value={ownerData.surname}
      onChange={(e) => handleFieldChange('surname', e.target.value)}
      required
      error={errors.surname}
    />
    <BaseInput
      label="Known As"
      value={ownerData.known_as}
      onChange={(e) => handleFieldChange('known_as', e.target.value)}
      placeholder="Nickname or preferred name"
      error={errors.known_as}
    />
  </div>

  <div className="grid grid-cols-2 gap-4 mt-4">
    {/* Row 3: Gender, Relationship Status */}
    <BaseDropdown
      label="Gender"
      value={ownerData.gender}
      onChange={(val) => handleFieldChange('gender', val)}
      options={GENDER_OPTIONS.map(opt => ({ value: opt, label: opt }))}
      error={errors.gender}
    />
    <BaseDropdown
      label="Relationship Status"
      value={ownerData.relationship_status}
      onChange={(val) => handleFieldChange('relationship_status', val)}
      options={RELATIONSHIP_STATUS_OPTIONS.map(opt => ({ value: opt, label: opt }))}
      placeholder="Select status"
      error={errors.relationship_status}
    />
  </div>

  {/* ... rest of personal details fields */}
</div>
```

#### Step 5: Update Initial State (15 minutes)

```typescript
const getEmptyProductOwnerForm = (): ProductOwnerFormData => ({
  status: 'active',
  firstname: '',
  surname: '',
  known_as: '',

  // NEW fields
  title: '',
  middle_names: '',
  relationship_status: '',

  gender: '',
  previous_names: '',
  dob: '',
  place_of_birth: '',

  // ... rest of fields
});
```

#### Step 6: Update Tests (1 hour)

**File**: `frontend/src/tests/utils/productOwnerValidation.test.ts`

```typescript
describe('productOwnerValidation', () => {
  // ... existing tests

  describe('title validation', () => {
    it('should accept valid titles', () => {
      const data = { ...validData, title: 'Dr' };
      const errors = validateProductOwner(data);
      expect(errors).toBeNull();
    });

    it('should reject invalid titles', () => {
      const data = { ...validData, title: 'Invalid Title' };
      const errors = validateProductOwner(data);
      expect(errors).toHaveProperty('title');
    });

    it('should allow empty title (optional field)', () => {
      const data = { ...validData, title: '' };
      const errors = validateProductOwner(data);
      expect(errors).toBeNull();
    });
  });

  describe('middle_names validation', () => {
    it('should accept valid middle names', () => {
      const data = { ...validData, middle_names: 'Alexander James' };
      const errors = validateProductOwner(data);
      expect(errors).toBeNull();
    });

    it('should reject middle names over 100 characters', () => {
      const data = { ...validData, middle_names: 'a'.repeat(101) };
      const errors = validateProductOwner(data);
      expect(errors).toHaveProperty('middle_names');
    });

    it('should allow empty middle names (optional field)', () => {
      const data = { ...validData, middle_names: '' };
      const errors = validateProductOwner(data);
      expect(errors).toBeNull();
    });
  });

  describe('relationship_status validation', () => {
    it('should accept valid relationship statuses', () => {
      const data = { ...validData, relationship_status: 'Married' };
      const errors = validateProductOwner(data);
      expect(errors).toBeNull();
    });

    it('should reject invalid relationship statuses', () => {
      const data = { ...validData, relationship_status: 'Invalid Status' };
      const errors = validateProductOwner(data);
      expect(errors).toHaveProperty('relationship_status');
    });

    it('should allow empty relationship status (optional field)', () => {
      const data = { ...validData, relationship_status: '' };
      const errors = validateProductOwner(data);
      expect(errors).toBeNull();
    });
  });
});
```

---

## Phase 4: FIELD MAPPING REFERENCE (UPDATED)

### Complete Product Owner Fields (25 total)

| # | UI Label | Form Field | DB Column | Type | Required | Section |
|---|----------|------------|-----------|------|----------|---------|
| 1 | Status | status | status | text | Yes | Core |
| 2 | First Name | firstname | firstname | text | Yes | Core |
| 3 | Surname | surname | surname | text | Yes | Core |
| 4 | Known As | known_as | known_as | text | No | Core |
| 5 | **Title** ✨ | **title** | **title** | **text** | **No** | **Personal** |
| 6 | **Middle Names** ✨ | **middle_names** | **middle_names** | **text** | **No** | **Personal** |
| 7 | **Relationship Status** ✨ | **relationship_status** | **relationship_status** | **text** | **No** | **Personal** |
| 8 | Gender | gender | gender | text | No | Personal |
| 9 | Previous Names | previous_names | previous_names | text | No | Personal |
| 10 | Date of Birth | dob | dob | date | Yes | Personal |
| 11 | Place of Birth | place_of_birth | place_of_birth | text | No | Personal |
| 12 | Primary Email | email_1 | email_1 | text | Yes | Contact |
| 13 | Secondary Email | email_2 | email_2 | text | No | Contact |
| 14 | Primary Phone | phone_1 | phone_1 | text | Yes | Contact |
| 15 | Secondary Phone | phone_2 | phone_2 | text | No | Contact |
| 16 | Date Moved In | moved_in_date | moved_in_date | date | No | Residential |
| 17 | Address ID | address_id | address_id | bigint | No | Residential |
| 18 | Three Words | three_words | three_words | text | No | Profiling |
| 19 | Share Data With | share_data_with | share_data_with | text | No | Profiling |
| 20 | Employment Status | employment_status | employment_status | text | No | Employment |
| 21 | Occupation | occupation | occupation | text | No | Employment |
| 22 | Passport Expiry | passport_expiry_date | passport_expiry_date | date | No | Compliance |
| 23 | NI Number | ni_number | ni_number | text | No | Compliance |
| 24 | AML Result | aml_result | aml_result | text | No | Compliance |
| 25 | AML Date | aml_date | aml_date | date | No | Compliance |

---

## Phase 5: UPDATED TIMELINE

### Revised Time Estimates

**Foundation Work** (13.5 hours - was 12):
- Type definitions: 30 min (was 3h, reduced due to simple additions)
- Constants file: 15 min (new)
- Validation utilities: 3h (was 3h)
- API service layer: 2h (unchanged)
- Form state hook: 3h (unchanged)
- API orchestration hook: 4h (unchanged)
- Backend verification: 30 min (new - verify new fields accepted)

**UI Implementation** (12 hours - was 11):
- FieldError component: 1h (unchanged)
- Refactor page: 7h (was 6h, +1h for new fields)
- Backend endpoints: 4h (unchanged)

**Testing & Polish** (18 hours - unchanged):
- Integration testing: 5h
- Unit tests: 8h
- Manual testing: 3h
- Documentation: 2h

**Total: 43.5 hours** (was 41 hours)

---

## Phase 6: VERIFICATION CHECKLIST

### New Field Integration Checklist

- [ ] Type definitions include title, middle_names, relationship_status
- [ ] Constants file created with TITLE_OPTIONS, RELATIONSHIP_STATUS_OPTIONS
- [ ] Validation handles optional fields correctly
- [ ] Form renders title dropdown before firstname
- [ ] Form renders middle_names between firstname and surname
- [ ] Form renders relationship_status in Personal Details section
- [ ] Initial state includes empty strings for new fields
- [ ] Tests cover valid/invalid/empty values for new fields
- [ ] Backend API accepts new fields (verify with test POST)
- [ ] Database correctly stores new field values

### Backend Verification

Run this test to verify backend accepts new fields:

```bash
# Test API endpoint
curl -X POST http://localhost:8001/api/product-owners \
  -H "Content-Type: application/json" \
  -d '{
    "firstname": "Jane",
    "surname": "Smith",
    "title": "Dr",
    "middle_names": "Marie",
    "relationship_status": "Married",
    "email_1": "jane@example.com",
    "phone_1": "+44 7700 900123",
    "dob": "1985-03-15",
    "status": "active"
  }'
```

Expected response should include the new fields in the returned object.

---

## Summary of Changes

### What Changed
- ✅ product_owners table schema: 22 → 25 fields
- ✅ ProductOwnerFormData interface: 22 → 25 fields
- ✅ Personal Details section: 5 → 8 fields
- ✅ New constants: TITLE_OPTIONS, RELATIONSHIP_STATUS_OPTIONS
- ✅ Updated validation rules for 3 new optional fields
- ✅ Updated form layout with proper positioning
- ✅ Timeline: 41h → 43.5h (+2.5h for integration)

### What Stayed the Same
- Address table structure (5 fields)
- Client Group table structure (10 fields)
- API integration flow (4-step process)
- React Query integration approach
- Testing strategy (70% coverage target)
- Component extraction strategy
- Error handling approach

---

## Next Steps

1. **Review this updated plan** - Confirm the 3 new fields are positioned correctly
2. **Begin implementation** - Start with Step 1 (Type Definitions)
3. **Test backend compatibility** - Verify API accepts new fields
4. **Continue with remaining steps** - Follow the 43.5-hour plan

The plan is now fully updated and ready for implementation! 🚀
