# Phase 2 Documentation Update Checklist

**Date Created:** 2025-10-08
**Reason:** Product Owner Definition Clarification & Item Type Product Owner Linkage
**Status:** Pending Implementation

---

## Overview of Changes Required

Based on the clarifications from `phase2_item_types_specification.md`:

1. **Product Owner Definition**: Basic Personal Details (Title, Forename, Middle Names, Surname, etc.) define Product Owners - they are NOT a client group item type
2. **Simple Product Owner References**: Address, Email, Phone Number, and ALL Income/Expenditure items have a simple `product_owners` array field
3. **Complex Product Owner References**: Only Assets/Liabilities items have the complex `associated_product_owners` structure with ownership percentages

---

## Files Requiring Updates

### 1. Database Schema Documentation

**File:** `docs/03_architecture/10_phase2_database_schema.md`

#### Critical Changes:

**Line 333 - Remove from CHECK constraint:**
```sql
-- REMOVE THIS LINE:
'Basic Personal Details',

-- REASON: Not an item type - it defines product owners
```

**Lines 437-586 - Update JSON Structure Examples:**

**Current Issue:** All examples show complex `associated_product_owners` structure
**Required:** Two distinct patterns:

**Pattern 1 - Simple Product Owner Reference (for basic_detail & income_expenditure):**
```json
// Address (item_type="Address", category="basic_detail")
{
  "name": "Home Address",
  "product_owners": [123, 456],  // Simple array of product owner IDs
  "address_line_one": "1 New Street",
  "address_line_two": "Neverland",
  "postcode": "N0TH 3R3",
  "notes": "Current primary residence"
}

// Email Address (item_type="Email Address", category="basic_detail")
{
  "name": "Personal Email",
  "product_owners": [123],  // Simple array
  "email_address": "john.smith@email.com",
  "notes": ""
}

// Phone Number (item_type="Phone Number", category="basic_detail")
{
  "name": "Primary Mobile",
  "product_owners": [123],  // Simple array
  "phone_number": "07712345678",
  "phone_type": "Mobile",
  "notes": "Primary contact number"
}

// Basic Salary (item_type="Basic Salary", category="income_expenditure")
{
  "name": "Main Employment",
  "product_owners": [123],  // Simple array
  "description": "Tech Solutions Ltd",
  "amount": 45000.00,
  "frequency": "Annually",
  "date": "15/03/2024",
  "notes": "Annual salary review due in March"
}

// Income Tax (item_type="Income Tax", category="income_expenditure")
{
  "name": "Annual Income Tax",
  "product_owners": [123],  // Simple array
  "description": "PAYE deductions",
  "amount": 12500.00,
  "frequency": "Annually",
  "date": "05/04/2024",
  "notes": ""
}
```

**Pattern 2 - Complex Ownership Structure (ONLY for assets_liabilities):**
```json
// Cash Accounts (item_type="Cash Accounts", category="assets_liabilities")
{
  "name": "Barclays Premier Current Account",
  "provider": "Barclays",
  "current_value": 2500.00,
  "value_date": "15/03/2024",
  "start_date": "15/03/2020",
  "account_number": "12345678",
  "associated_product_owners": {  // Complex structure with percentages
    "association_type": "tenants_in_common",
    "123": 60.00,
    "456": 40.00
  },
  "notes": "Main household account"
}

// Property (item_type="Land and Property", category="assets_liabilities")
{
  "name": "Family Home",
  "address": {
    "address_line_one": "123 Oak Street",
    "address_line_two": "Manchester",
    "postcode": "M1 1AA"
  },
  "current_value": 450000.00,
  "value_date": "01/09/2024",
  "start_date": "01/06/2018",
  "type_of_property": "Residential",
  "associated_product_owners": {  // Complex structure with percentages
    "association_type": "joint_tenants",
    "123": 50.00,
    "456": 50.00
  },
  "notes": "Family home, recent valuation"
}
```

**Lines 580-586 - Update "Product Owner Relationships" Section:**

**Current:** Single structure for all item types
**Required:** Clarify two distinct patterns

```markdown
**Product Owner Relationships** (TWO standardized patterns based on category):

**Pattern 1: Simple Product Owner Array** (basic_detail & income_expenditure categories):
```json
{
  "product_owners": [123, 456]  // Array of product_owner IDs
}
```
Used by:
- Address, Email Address, Phone Number (basic_detail)
- ALL income/expenditure items (Basic Salary, Bonuses, Benefits, State Pension, Drawdown Income, UFPLS, Annuities, State Benefits, Rental Profit, Interest, Dividends, Non-Taxable Income, Chargeable Event, Other Income, Income Tax, Salary Sacrifice)

**Pattern 2: Complex Ownership Structure** (assets_liabilities category ONLY):
```json
{
  "associated_product_owners": {
    "association_type": "tenants_in_common", // or "joint_tenants"
    "123": 60.00, // product_owner_id: percentage (must total 100.00)
    "456": 40.00
  }
}
```
Used by:
- ALL assets_liabilities items (Cash Accounts, Premium Bonds, ISAs, Investment Accounts, Bonds, Shares, Pensions, Property, Mortgage, Loans, Credit Cards, Student Loans, Tax Debt, etc.)
```

**NEW SECTION REQUIRED - Add after line 319:**

```markdown
### Product Owner Definition vs. Item Types

**IMPORTANT DISTINCTION:**

**Product Owners** are defined by Basic Personal Details fields:
- Title, Forename, Middle Names, Surname, Known As, Date of Birth, Previous Name(s)
- These fields exist in the `product_owners` table
- They are NOT client information items

**Client Information Items** reference product owners:
- Items have a `product_owners` field (simple array) OR
- Items have an `associated_product_owners` field (complex ownership structure)
- Basic Personal Details is NOT in the `item_type` CHECK constraint
```

#### Additional Changes:

**Line 547 (Big 5 Category Integration table):**
- Remove "Basic Personal Details" from basic_detail item types list
- Add note: "Note: Basic Personal Details define product owners, not client information items"

**Lines throughout - Search and verify:**
- Ensure no other references to "Basic Personal Details" as an item_type
- Verify all JSON examples use correct product owner pattern

---

### 2. API Endpoints Documentation

**File:** `docs/03_architecture/11_phase2_api_endpoints.md`

#### Critical Changes:

**Lines 382-386, 448-452, 494-498, etc. - Update JSON Examples:**

**Current:** All `data_content` examples show `associated_product_owners`
**Required:** Update based on category

**Example corrections needed:**

**Line 448-452 (Basic Salary example):**
```json
// CHANGE FROM:
{
  "current_amount": 45000.00,
  "frequency": "Annual",
  "associated_product_owners": {
    "association_type": "joint_tenants",
    "123": 100.00
  }
}

// CHANGE TO:
{
  "product_owners": [123],  // Simple array for income_expenditure
  "description": "Tech Solutions Ltd",
  "amount": 45000.00,
  "frequency": "Annually",
  "date": "15/03/2024",
  "notes": "Annual salary review"
}
```

**Line 586-594 (POST /api/client_groups/{client_group_id}/information_items request body):**
```json
// CHANGE FROM (for Address item):
{
  "item_type": "Address",
  "name": "Home Address",
  "priority": "standard",
  "status": "current",
  "data_content": {
    "address_line_one": "123 High Street",
    "address_line_two": "Manchester",
    "postcode": "M1 1AA",
    // Missing product_owners field!
  }
}

// CHANGE TO:
{
  "item_type": "Address",
  "category": "basic_detail",
  "name": "Home Address",
  "priority": "standard",
  "status": "current",
  "data_content": {
    "product_owners": [123, 456],  // ADD THIS
    "address_line_one": "123 High Street",
    "address_line_two": "Manchester",
    "postcode": "M1 1AA",
    "notes": ""
  }
}
```

**Line 750-752 (Validation Error Examples):**
```json
// ADD NEW VALIDATION ERRORS:
| 422 | Invalid item_type for category | `{"detail": "item_type 'Basic Personal Details' is not valid - this defines product owners, not client items"}` |
| 422 | Missing product_owners | `{"detail": "product_owners field required for basic_detail and income_expenditure items"}` |
| 422 | Missing associated_product_owners | `{"detail": "associated_product_owners field required for assets_liabilities items"}` |
```

#### Additional Changes:

**Throughout file - Systematic review required:**
- Every JSON example with `data_content` needs category-appropriate product owner structure
- All income/expenditure examples: Use `product_owners: [...]`
- All assets/liabilities examples: Use `associated_product_owners: {...}`
- All basic_detail examples (Address, Email, Phone): Use `product_owners: [...]`

**Search terms to find all occurrences:**
- `"data_content": {`
- `"associated_product_owners"`
- `"item_type": "Basic Salary"`
- `"item_type": "Address"`
- `"item_type": "Email"`

---

### 3. Frontend Architecture Documentation

**File:** `docs/03_architecture/12_phase2_frontend_architecture.md`

#### Changes Required:

**Search for component examples showing:**
- Product owner selection dropdowns
- Item creation/editing forms
- Data structure handling

**Update locations with:**
- Multi-select dropdown for product owners (basic_detail, income_expenditure)
- Complex ownership editor (assets_liabilities only)
- Form validation examples

**Specific updates needed:**
- Component props that accept product owner data
- Form field examples
- Data transformation utilities

---

### 4. Phase 2 Specification

**File:** `docs/specifications/Phase2_Client_Data_Enhancement_Specification.md`

#### Changes Required:

**Lines 76-99 - Update JSON Structure Examples:**

Similar to database schema doc:
- Update all examples to show correct product owner pattern
- Separate simple vs. complex patterns clearly
- Add explanatory notes about when to use each pattern

**Lines throughout:**
- Verify no references to "Basic Personal Details" as an item type
- Clarify product owner definition section
- Update any data model diagrams or examples

---

### 5. Database Implementation Guide

**File:** `docs/09_database/02_phase2_database_implementation.md`

#### Changes Required:

**Migration scripts:**
- Verify `client_information_items` table creation doesn't include 'Basic Personal Details' in CHECK constraint
- Add migration notes about product owner field patterns
- Update any seed data or test data examples

**Validation procedures:**
- Add stored procedure or trigger to validate product owner fields based on category
- Ensure data integrity checks for:
  - `product_owners` array exists for basic_detail and income_expenditure
  - `associated_product_owners` structure exists for assets_liabilities
  - Percentages total 100% for tenants_in_common

---

### 6. Developer Quick Reference

**File:** `docs/10_reference/04_phase2_developer_quick_reference.md`

#### Changes Required:

**Line 37 - Update Example:**
```typescript
// CURRENT:
  "associated_product_owners": { /* ownership object */ },

// CHANGE TO:
// For basic_detail and income_expenditure:
  "product_owners": [123, 456],

// For assets_liabilities only:
  "associated_product_owners": {
    "association_type": "tenants_in_common",
    "123": 60.00,
    "456": 40.00
  },
```

**Line 301 - Update Type Definition:**
```typescript
// ADD category-specific types:
type BasicDetailItemData = {
  product_owners: number[];  // Simple array
  // ... other fields
}

type IncomeExpenditureItemData = {
  product_owners: number[];  // Simple array
  // ... other fields
}

type AssetsLiabilitiesItemData = {
  associated_product_owners: {
    association_type: "joint_tenants" | "tenants_in_common";
    [product_owner_id: string]: number | string;  // ID -> percentage
  };
  // ... other fields
}
```

**Add new section:**
```markdown
### Product Owner Field Patterns

**Rule:** Product owner field structure depends on item category:

| Category | Field Name | Structure | Example |
|----------|-----------|-----------|---------|
| basic_detail | `product_owners` | Array of IDs | `[123, 456]` |
| income_expenditure | `product_owners` | Array of IDs | `[123]` |
| assets_liabilities | `associated_product_owners` | Ownership object | `{"association_type": "tenants_in_common", "123": 60.00, "456": 40.00}` |
| protection | `associated_product_owners` | Ownership object | Same as assets |
| vulnerability_health | `product_owners` | Array of IDs | `[123, 456]` |
```

---

### 7. Testing Specifications

**File:** `docs/05_development_standards/04_phase2_testing_specifications.md`

#### Changes Required:

**Add test cases for:**
1. Validation rejects "Basic Personal Details" as item_type
2. Validation requires `product_owners` for basic_detail items
3. Validation requires `product_owners` for income_expenditure items
4. Validation requires `associated_product_owners` for assets_liabilities items
5. Validation ensures ownership percentages total 100% for tenants_in_common

**Example test cases to add:**
```typescript
describe('Client Information Items Validation', () => {
  test('rejects Basic Personal Details as item_type', () => {
    expect(() => createItem({
      item_type: 'Basic Personal Details',
      category: 'basic_detail'
    })).toThrow('Basic Personal Details is not a valid item type');
  });

  test('requires product_owners for Address item', () => {
    expect(() => createItem({
      item_type: 'Address',
      category: 'basic_detail',
      data_content: { address_line_one: '123 Main St' }
      // Missing product_owners
    })).toThrow('product_owners required for basic_detail category');
  });

  test('requires associated_product_owners for Cash Account', () => {
    expect(() => createItem({
      item_type: 'Cash Accounts',
      category: 'assets_liabilities',
      data_content: { current_value: 5000 }
      // Missing associated_product_owners
    })).toThrow('associated_product_owners required for assets_liabilities category');
  });
});
```

---

### 8. User Workflows Documentation

**File:** `docs/10_reference/03_phase2_user_workflows.md`

#### Changes Required:

**Update workflow examples:**
- Creating Address item: Show product owner multi-select
- Creating Income item: Show product owner multi-select
- Creating Asset item: Show complex ownership editor

**Add clarification:**
```markdown
## Product Owner Setup Workflow

**Step 1:** Create Product Owners (Basic Personal Details)
- Navigate to Client Group
- Add product owners with: Title, Forename, Surname, Date of Birth, etc.
- These become selectable in all item types

**Step 2:** Create Client Information Items
- Items reference product owners created in Step 1
- Simple items (Address, Income): Multi-select from product owner list
- Complex items (Assets, Liabilities): Define ownership percentages
```

---

### 9. Additional Files to Check

**Other potential files:**
- `docs/01_introduction/03_phase2_enhancement_overview.md` - May have item type examples
- `docs/04_development_workflow/05_phase2_implementation_sequence.md` - May have implementation examples
- `docs/06_performance/03_phase2_performance_baselines.md` - May have query examples
- `docs/08_operations/04_phase2_deployment_operations.md` - May have migration scripts
- Any README files in subdirectories

---

## Summary Checklist

### Database & Schema
- [ ] Remove 'Basic Personal Details' from item_type CHECK constraint
- [ ] Add Product Owner Definition vs Item Types section
- [ ] Update all JSON examples with correct product owner patterns
- [ ] Update Big 5 category table to remove Basic Personal Details
- [ ] Add validation notes for product owner field requirements

### API Documentation
- [ ] Update all POST/PUT request examples with correct product owner fields
- [ ] Update all response examples with correct product owner structures
- [ ] Add validation error examples for product owner fields
- [ ] Systematic review of all `data_content` examples

### Frontend Documentation
- [ ] Update component examples with correct product owner handling
- [ ] Add multi-select dropdown examples for simple product owners
- [ ] Add complex ownership editor examples for assets/liabilities
- [ ] Update form validation examples

### Specifications & Implementation
- [ ] Update Phase 2 specification with correct patterns
- [ ] Update database implementation migration scripts
- [ ] Add validation procedures for product owner fields
- [ ] Update seed/test data with correct structures

### Developer Resources
- [ ] Update quick reference with two product owner patterns
- [ ] Add TypeScript type definitions for each pattern
- [ ] Update code examples throughout
- [ ] Add troubleshooting guide for common product owner errors

### Testing
- [ ] Add validation test cases
- [ ] Add integration test examples
- [ ] Update test data fixtures

### User Documentation
- [ ] Update user workflow guides
- [ ] Add product owner setup instructions
- [ ] Clarify item creation workflows

---

## Implementation Priority

**HIGH PRIORITY (Breaking changes):**
1. Database schema item_type CHECK constraint
2. API endpoint validation and examples
3. Database implementation migration scripts

**MEDIUM PRIORITY (Critical for developers):**
4. Developer quick reference
5. Frontend architecture guide
6. Testing specifications

**LOWER PRIORITY (Documentation completeness):**
7. User workflows
8. Specification document
9. Additional reference materials

---

## Validation After Changes

After making all updates, verify:
1. No references to "Basic Personal Details" as an item_type in CHECK constraints or validation
2. All basic_detail and income_expenditure examples use `product_owners: [...]`
3. All assets_liabilities examples use `associated_product_owners: {...}`
4. All API examples include appropriate product owner fields
5. Validation error messages are consistent
6. Type definitions match implementation
7. Test cases cover both product owner patterns

---

**Notes:**
- This checklist is based on the updated `phase2_item_types_specification.md` and `Phase2_Item_Types_Review.html`
- All changes should maintain backward compatibility where possible
- Focus on clarity for both developers and business users
- Update related diagrams and flowcharts as needed
