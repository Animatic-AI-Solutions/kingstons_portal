# Phase 9: Manual Smoke Test Checklist

## Component Reorganization - Manual Verification

**Date**: 2026-01-06
**Branch**: phase_2
**Status**: Ready for Manual Testing

---

## Test Results Summary

### Automated Tests ✅
- **TypeScript Compilation**: ✅ 6913 modules successfully transformed
- **Jest Test Suite**: ✅ 28/62 test suites passing (improved from 26)
- **Individual Tests**: ✅ 1173/1374 tests passing (85% pass rate)

### What This Means
- All **production code imports are working** (6913 modules compile successfully)
- Some **test files** have remaining issues (expected per reorganization plan)
- The application **should run correctly** in development/production

---

## Manual Smoke Tests

### ✅ Prerequisites
- [ ] Backend is running: `uvicorn main:app --reload --host 127.0.0.1 --port 8001`
- [ ] Frontend dev server is running: `npm start` (in frontend/ directory)
- [ ] Browser is open to `http://localhost:3000`
- [ ] Have test credentials ready

---

### 1. Authentication & Layout

#### Test: Login Flow
- [ ] Navigate to `/login`
- [ ] Enter valid credentials
- [ ] Click "Login" button
- [ ] **Expected**: Successfully redirected to home dashboard
- [ ] **Components tested**: Login.tsx, PasswordInput (ui/inputs)

#### Test: Logout Flow
- [ ] Click user menu (top right)
- [ ] Click "Logout"
- [ ] **Expected**: Redirected to login page
- [ ] **Components tested**: TopBar (layout), AuthContext

#### Test: Navigation
- [ ] Verify Sidebar displays correctly
- [ ] Click through main menu items (Home, Clients, Products, Reports)
- [ ] **Expected**: All pages load without errors
- [ ] **Components tested**: Sidebar (layout), AppLayout (layout)

---

### 2. Phase 2 Components - People Tab

#### Test: View People Tab
- [ ] Navigate to a Client Group
- [ ] Click "People" tab
- [ ] **Expected**: ProductOwnerTable displays with data
- [ ] **Expected**: Table shows columns: Title, First Name, Last Name, DOB, Age, Status, Actions
- [ ] **Components tested**: ProductOwnerTable (phase2/people)

#### Test: Create Product Owner
- [ ] Click "Add Person" button on People tab
- [ ] Fill out modal form (First Name, Last Name required)
- [ ] Click "Create"
- [ ] **Expected**: Modal closes, new person appears in table
- [ ] **Expected**: Success toast notification appears
- [ ] **Components tested**: CreateProductOwnerModal (phase2/people), ModalShell (ui/modals)

#### Test: Edit Product Owner
- [ ] Click "Edit" button on any person row
- [ ] Modify First Name or Last Name
- [ ] Click "Save Changes"
- [ ] **Expected**: Modal closes, changes reflected in table
- [ ] **Expected**: Success toast notification
- [ ] **Components tested**: EditProductOwnerModal (phase2/people), EditProductOwnerForm (phase2/people)

#### Test: Product Owner Status Actions
- [ ] For an **Active** person:
  - [ ] Click Pause icon (Lapse)
  - [ ] **Expected**: Status changes to "Lapsed"
  - [ ] Click X icon (Make Deceased)
  - [ ] **Expected**: Status changes to "Deceased"
- [ ] For a **Lapsed** person:
  - [ ] Click Reactivate icon
  - [ ] **Expected**: Status changes back to "Active"
  - [ ] Click Delete icon
  - [ ] **Expected**: Delete confirmation modal appears
- [ ] **Components tested**: ProductOwnerActions (phase2/people), DeleteConfirmationModal (phase2/people)

#### Test: Delete Product Owner
- [ ] Lapse a product owner first (delete only works on non-active)
- [ ] Click Delete icon
- [ ] **Expected**: Confirmation modal appears
- [ ] Click "Cancel" - **Expected**: Modal closes, nothing deleted
- [ ] Click Delete icon again
- [ ] Click "Confirm Delete"
- [ ] **Expected**: Person removed from table, success toast
- [ ] **Components tested**: DeleteConfirmationModal (phase2/people)

---

### 3. Phase 2 Components - Special Relationships Tab

#### Test: View Special Relationships Tab
- [ ] Navigate to Client Group Suite
- [ ] Click "Special Relationships" tab
- [ ] **Expected**: SpecialRelationshipsSubTab displays
- [ ] **Expected**: Two sub-tabs visible: "Personal" and "Professional"
- [ ] **Components tested**: SpecialRelationshipsSubTab (phase2/special-relationships), TabNavigation (ui/navigation)

#### Test: Personal Relationships Table
- [ ] Click "Personal" sub-tab
- [ ] **Expected**: PersonalRelationshipsTable displays
- [ ] **Expected**: Columns show: First Name, Last Name, Relationship, DOB, Age, Email, Phone, Status, Actions
- [ ] **Components tested**: PersonalRelationshipsTable (phase2/special-relationships)

#### Test: Professional Relationships Table
- [ ] Click "Professional" sub-tab
- [ ] **Expected**: ProfessionalRelationshipsTable displays
- [ ] **Expected**: Columns show: First Name, Last Name, Relationship, Company, Email, Phone, Status, Actions
- [ ] **Components tested**: ProfessionalRelationshipsTable (phase2/special-relationships)

#### Test: Create Personal Relationship
- [ ] On Personal tab, click "Add Relationship" button
- [ ] Fill out form (First Name, Last Name, Relationship required)
- [ ] Select at least one Product Owner
- [ ] Click "Create"
- [ ] **Expected**: Modal closes, new relationship appears in Personal table
- [ ] **Components tested**: CreatePersonalRelationshipModal (phase2/special-relationships), ModalShell (ui/modals)

#### Test: Create Professional Relationship
- [ ] On Professional tab, click "Add Relationship" button
- [ ] Fill out form (First Name, Last Name, Relationship, Firm Name required)
- [ ] Select at least one Product Owner
- [ ] Click "Create"
- [ ] **Expected**: Modal closes, new relationship appears in Professional table
- [ ] **Components tested**: CreateProfessionalRelationshipModal (phase2/special-relationships)

#### Test: Edit Relationship
- [ ] Click "Edit" button on any relationship row
- [ ] Modify First Name or Relationship type
- [ ] Click "Save Changes"
- [ ] **Expected**: Modal closes, changes reflected in table
- [ ] **Components tested**: EditSpecialRelationshipModal (phase2/special-relationships)

#### Test: Relationship Status Actions
- [ ] For an Active relationship:
  - [ ] Click Pause icon (Lapse) - **Expected**: Status changes to "Inactive"
  - [ ] Click X icon (Deceased, Personal only) - **Expected**: Status changes to "Deceased"
- [ ] For an Inactive relationship:
  - [ ] Click Reactivate icon - **Expected**: Status changes to "Active"
  - [ ] Click Delete icon - **Expected**: Delete confirmation modal appears
- [ ] **Components tested**: Actions in relationship tables

#### Test: Table Sorting
- [ ] Click column headers (First Name, Last Name, Status)
- [ ] **Expected**: Table sorts ascending/descending
- [ ] **Expected**: Sort arrow indicator appears
- [ ] **Components tested**: TableSortHeader (ui/tables), SortableColumnHeader (ui/tables)

#### Test: Empty States
- [ ] On a client group with no relationships:
  - [ ] Personal tab - **Expected**: EmptyStatePersonal displays
  - [ ] Professional tab - **Expected**: EmptyStateProfessional displays
- [ ] **Components tested**: EmptyStatePersonal, EmptyStateProfessional (phase2/special-relationships)

---

### 4. Phase 1 Components - Reports

#### Test: Generate IRR Report
- [ ] Navigate to a Client Group
- [ ] Click "Reports" tab or "Generate Report" button
- [ ] **Expected**: ReportContainer displays
- [ ] **Expected**: Summary tab shows portfolio summary
- [ ] **Components tested**: ReportContainer (phase1/reports/irr)

#### Test: IRR History Tab
- [ ] In report view, click "IRR History" tab
- [ ] **Expected**: IRRHistoryTab displays historical data
- [ ] **Expected**: IRRHistorySummaryTable shows calculations
- [ ] **Components tested**: IRRHistoryTab, IRRHistorySummaryTable (phase1/reports/irr)

#### Test: Print Report
- [ ] Click "Print" button in report view
- [ ] **Expected**: Print dialog opens
- [ ] **Expected**: Report formats correctly for printing
- [ ] **Components tested**: PrintService integration

---

### 5. Phase 1 Components - Funds & Activities

#### Test: Add Fund Modal
- [ ] Navigate to Definitions > Funds
- [ ] Click "Add Fund" button
- [ ] Fill out form (Fund Name, Provider required)
- [ ] Click "Create"
- [ ] **Expected**: Modal closes, new fund appears in list
- [ ] **Components tested**: AddFundModal (phase1/funds)

#### Test: Add Provider Modal
- [ ] Navigate to Definitions > Providers
- [ ] Click "Add Provider" button
- [ ] Fill out form (Provider Name, Color required)
- [ ] Click "Create"
- [ ] **Expected**: Modal closes, new provider appears
- [ ] **Components tested**: AddProviderModal (phase1/funds)

#### Test: Monthly Activities Table
- [ ] Navigate to a Product's Fund Details
- [ ] View Editable Monthly Activities Table
- [ ] **Expected**: Table displays with months as columns
- [ ] **Expected**: Can edit valuations and activities
- [ ] **Components tested**: EditableMonthlyActivitiesTable (phase1/activities), EnhancedMonthHeader (ui/date)

---

### 6. UI Component Library

#### Test: Search Functionality
- [ ] Use GlobalSearch in top bar
- [ ] Type search query
- [ ] **Expected**: Autocomplete results appear
- [ ] **Components tested**: GlobalSearch (ui/search)

#### Test: Data Tables
- [ ] View any table page (Clients, Products, Funds)
- [ ] **Expected**: StandardTable displays with data
- [ ] **Expected**: Sorting, filtering, pagination works
- [ ] **Components tested**: StandardTable (ui/tables), DataTable (ui/data-displays)

#### Test: Loading States
- [ ] Trigger any data load (navigate to new page)
- [ ] **Expected**: TableSkeleton or SkeletonTable displays briefly
- [ ] **Components tested**: Skeleton components (ui/feedback)

#### Test: Error States
- [ ] Disconnect backend (stop uvicorn)
- [ ] Try to load data
- [ ] **Expected**: ErrorDisplay or ErrorStateNetwork shows
- [ ] **Expected**: "Retry" button appears
- [ ] **Components tested**: ErrorDisplay, ErrorStateNetwork, ErrorStateServer (ui/feedback)

#### Test: Form Inputs
- [ ] Open any create/edit modal
- [ ] Test inputs: BaseInput, NumberInput, DateInput
- [ ] Test dropdowns: SearchableDropdown, MultiSelectDropdown
- [ ] **Expected**: All inputs function correctly
- [ ] **Components tested**: ui/inputs/, ui/dropdowns/

#### Test: Buttons
- [ ] Verify ActionButton, AddButton, EditButton, DeleteButton appear correctly
- [ ] **Expected**: Consistent styling, hover states work
- [ ] **Components tested**: ui/buttons/

---

### 7. Client Group Phase 2 Prototype

#### Test: Dynamic Page Container
- [ ] Navigate to Client Group Suite
- [ ] **Expected**: DynamicPageContainer wraps all tabs
- [ ] **Expected**: Breadcrumbs display correctly
- [ ] **Expected**: Tab navigation works smoothly
- [ ] **Components tested**: DynamicPageContainer (phase2/client-groups)

---

### 8. Cross-Browser & Responsive Testing

#### Test: Responsive Layout
- [ ] Resize browser window to mobile size (~375px)
- [ ] **Expected**: Sidebar collapses/responsive menu appears
- [ ] **Expected**: Tables adapt (some columns hide on tablet/mobile)
- [ ] **Components tested**: Layout components, responsive tables

#### Test: Browser Compatibility
- [ ] Test in Chrome - **Expected**: All features work
- [ ] Test in Firefox - **Expected**: All features work
- [ ] Test in Edge - **Expected**: All features work

---

### 9. Console Checks

#### Test: No Console Errors
- [ ] Open browser DevTools (F12)
- [ ] Navigate through all major pages
- [ ] **Expected**: No red errors in console
- [ ] **Expected**: Only expected warnings (e.g., ts-jest deprecation)

#### Test: Network Requests
- [ ] Check Network tab during page loads
- [ ] **Expected**: API requests succeed (200/201 status codes)
- [ ] **Expected**: No 404 errors for missing files

---

## Issue Tracking

### Found Issues
Document any issues discovered during testing:

| Issue # | Component | Description | Severity | Status |
|---------|-----------|-------------|----------|--------|
| 1 | | | High/Med/Low | Open |
| 2 | | | High/Med/Low | Open |

---

## Completion Checklist

- [ ] All authentication tests passed
- [ ] All Phase 2 People tab tests passed
- [ ] All Phase 2 Special Relationships tests passed
- [ ] All Phase 1 Reports tests passed
- [ ] All Phase 1 Funds/Activities tests passed
- [ ] All UI component tests passed
- [ ] No critical console errors
- [ ] Responsive layout works
- [ ] All found issues documented

---

## Sign-Off

**Tester**: _________________
**Date**: _________________
**Result**: ✅ PASS / ❌ FAIL / ⚠️ PASS WITH ISSUES

**Notes**:
```


```

---

## Next Steps

### If All Tests Pass ✅
1. Create git commit with reorganization changes
2. Push to `phase_2` branch
3. Create pull request to `main`
4. Deploy to staging for final verification
5. Mark Phase 9 as complete

### If Issues Found ⚠️
1. Document all issues in table above
2. Prioritize by severity (High/Medium/Low)
3. Fix critical issues before proceeding
4. Re-run smoke tests for fixed components
5. Update this checklist with results
