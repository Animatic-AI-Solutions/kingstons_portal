# Component Reorganization Plan

## Overview
Reorganize `frontend/src/components/` to separate Phase 2 (modern, consistent) from Phase 1 (legacy) and create a clear UI component library.

---

## NEW FOLDER STRUCTURE

```
components/
├── ui/                          # Truly reusable UI components
│   ├── buttons/
│   ├── inputs/
│   ├── dropdowns/
│   ├── modals/                  # NEW - ModalShell goes here
│   ├── tables/                  # NEW - Table-related UI components
│   ├── badges/                  # NEW - StatusBadge and similar
│   ├── navigation/              # NEW - TabNavigation and similar
│   ├── feedback/
│   ├── search/                  # GlobalSearch goes here
│   ├── data-displays/           # DataTable, charts go here
│   ├── date/                    # NEW - Date/calendar components
│   └── constants/
├── phase2/                      # NEW - Modern, consistent components
│   ├── people/
│   ├── special-relationships/
│   └── client-groups/
├── phase1/                      # NEW - Legacy components (to be refactored)
│   ├── reports/
│   ├── funds/
│   └── activities/
├── layout/                      # App layout components
├── auth/                        # Authentication components
└── _archive/                    # NEW - Deprecated/unused components
```

---

## DETAILED FILE MAPPING

### 📁 **ui/** (Truly Reusable Components)
**Keep and organize existing UI components**

#### ✅ KEEP AS IS:
```
ui/
├── buttons/
│   ├── ActionButton.tsx              ✅ Keep
│   ├── AddButton.tsx                 ✅ Keep
│   ├── Button.tsx                    ✅ Keep
│   ├── DeleteButton.tsx              ✅ Keep
│   ├── EditButton.tsx                ✅ Keep
│   └── LapseButton.tsx               ✅ Keep
├── inputs/
│   ├── BaseInput.tsx                 ✅ Keep
│   ├── DateInput.tsx                 ✅ Keep
│   ├── NumberInput.tsx               ✅ Keep
│   ├── TextArea.tsx                  ✅ Keep
│   ├── InputError.tsx                ✅ Keep
│   ├── InputLabel.tsx                ✅ Keep
│   └── InputGroup.tsx                ✅ Keep
├── dropdowns/
│   ├── BaseDropdown.tsx              ✅ Keep
│   ├── ComboDropdown.tsx             ✅ Keep
│   ├── CreatableDropdown.tsx         ✅ Keep
│   ├── CreatableMultiSelect.tsx      ✅ Keep
│   ├── FilterDropdown.tsx            ✅ Keep
│   ├── MultiSelectDropdown.tsx       ✅ Keep
│   └── SearchableDropdown.tsx        ✅ Keep
├── feedback/
│   ├── EmptyState.tsx                ✅ Keep
│   ├── ErrorDisplay.tsx              ✅ Keep
│   ├── Skeleton.tsx                  ✅ Keep
│   └── TableSkeleton.tsx             ✅ Keep
├── search/
│   ├── AutocompleteSearch.tsx        ✅ Keep
│   ├── FilterSearch.tsx              ✅ Keep
│   └── SearchInput.tsx               ✅ Keep
├── card/
│   ├── Card.tsx                      ✅ Keep
│   ├── StatBox.tsx                   ✅ Keep
│   ├── StatCard.tsx                  ✅ Keep
│   └── ChangeIndicator.tsx           ✅ Keep
├── table-controls/
│   ├── TableFilter.tsx               ✅ Keep
│   └── TableSort.tsx                 ✅ Keep
├── constants/
│   ├── tableIcons.ts                 ✅ Keep (already created)
│   ├── tableStyles.ts                📝 TO CREATE
│   ├── formStyles.ts                 📝 TO CREATE
│   └── modalStyles.ts                📝 TO CREATE
├── FieldError.tsx                    ✅ Keep
├── ProfileAvatar.tsx                 ✅ Keep
├── ConcurrentUserModal.tsx           ✅ Keep
└── index.ts                          ✅ Keep (update exports)
```

#### 🔄 MOVE INTO ui/:
```
FROM: components/PasswordInput.tsx
TO:   components/ui/inputs/PasswordInput.tsx

FROM: components/ModalShell.tsx
TO:   components/ui/modals/ModalShell.tsx

FROM: components/StatusBadge.tsx
TO:   components/ui/badges/StatusBadge.tsx

FROM: components/TabNavigation.tsx
TO:   components/ui/navigation/TabNavigation.tsx

FROM: components/SortableColumnHeader.tsx
TO:   components/ui/tables/SortableColumnHeader.tsx

FROM: components/TableSortHeader.tsx
TO:   components/ui/tables/TableSortHeader.tsx

FROM: components/SkeletonTable.tsx
TO:   components/ui/tables/SkeletonTable.tsx

FROM: components/StandardTable.tsx
TO:   components/ui/tables/StandardTable.tsx

FROM: components/GlobalSearch.tsx
TO:   components/ui/search/GlobalSearch.tsx

FROM: components/data-displays/DataTable.tsx
TO:   components/ui/data-displays/DataTable.tsx

FROM: components/data-displays/FundDistributionChart.tsx
TO:   components/ui/data-displays/FundDistributionChart.tsx

FROM: components/ErrorStateNetwork.tsx
TO:   components/ui/feedback/ErrorStateNetwork.tsx

FROM: components/ErrorStateServer.tsx
TO:   components/ui/feedback/ErrorStateServer.tsx

FROM: components/EnhancedMonthHeader.tsx
TO:   components/ui/date/EnhancedMonthHeader.tsx

FROM: components/MiniYearSelector.tsx
TO:   components/ui/date/MiniYearSelector.tsx
```

---

### 📁 **phase2/** (NEW - Modern, Consistent Components)

#### phase2/people/ (People Tab - ✅ Reference Implementation)
```
FROM: components/ProductOwnerTable.tsx
TO:   components/phase2/people/ProductOwnerTable.tsx

FROM: components/ProductOwnerActions.tsx
TO:   components/phase2/people/ProductOwnerActions.tsx

FROM: components/CreateProductOwnerModal.tsx
TO:   components/phase2/people/CreateProductOwnerModal.tsx

FROM: components/EditProductOwnerModal.tsx
TO:   components/phase2/people/EditProductOwnerModal.tsx

FROM: components/EditProductOwnerForm.tsx
TO:   components/phase2/people/EditProductOwnerForm.tsx

FROM: components/DeleteConfirmationModal.tsx
TO:   components/phase2/people/DeleteConfirmationModal.tsx
```

#### phase2/special-relationships/ (Special Relationships Tab)
```
FROM: components/SpecialRelationshipsSubTab.tsx
TO:   components/phase2/special-relationships/SpecialRelationshipsSubTab.tsx

FROM: components/PersonalRelationshipsTable.tsx
TO:   components/phase2/special-relationships/PersonalRelationshipsTable.tsx

FROM: components/ProfessionalRelationshipsTable.tsx
TO:   components/phase2/special-relationships/ProfessionalRelationshipsTable.tsx

FROM: components/PersonalRelationshipFormFields.tsx
TO:   components/phase2/special-relationships/PersonalRelationshipFormFields.tsx

FROM: components/ProfessionalRelationshipFormFields.tsx
TO:   components/phase2/special-relationships/ProfessionalRelationshipFormFields.tsx

FROM: components/CreatePersonalRelationshipModal.tsx
TO:   components/phase2/special-relationships/CreatePersonalRelationshipModal.tsx

FROM: components/CreateProfessionalRelationshipModal.tsx
TO:   components/phase2/special-relationships/CreateProfessionalRelationshipModal.tsx

FROM: components/EditSpecialRelationshipModal.tsx
TO:   components/phase2/special-relationships/EditSpecialRelationshipModal.tsx

FROM: components/EmptyStatePersonal.tsx
TO:   components/phase2/special-relationships/EmptyStatePersonal.tsx

FROM: components/EmptyStateProfessional.tsx
TO:   components/phase2/special-relationships/EmptyStateProfessional.tsx
```

#### phase2/people/ (Additional Phase 2-Specific Components)
```
FROM: components/PresenceIndicator.tsx
TO:   components/phase2/people/PresenceIndicator.tsx
NOTE: Used specifically in People tab for concurrent user presence

FROM: components/PresenceNotifications.tsx
TO:   components/phase2/people/PresenceNotifications.tsx
NOTE: Used specifically in People tab for concurrent user notifications

FROM: components/DynamicPageContainer.tsx
TO:   components/phase2/client-groups/DynamicPageContainer.tsx
NOTE: Client group Phase 2 specific container
```

#### phase2/client-groups/ (Client Group Phase 2)
```
NOTE: These are likely in pages/ not components/
If found in components/, move to phase2/client-groups/
```

---

### 📁 **phase1/** (NEW - Legacy Components to be Refactored)

#### phase1/reports/
```
FROM: components/report/
TO:   components/phase1/reports/irr/
  - IRRHistorySummaryTable.tsx
  - IRRHistoryTab.tsx
  - ProductOwnerModal.tsx
  - ProductTitleModal.tsx
  - ReportContainer.tsx
  - ReportErrorBoundary.tsx
  - SummaryTab.tsx
  - index.ts

FROM: components/reports/shared/
TO:   components/phase1/reports/shared/
  - ReportFormatters.tsx
  - ReportTypes.ts

FROM: components/IRRCalculationModal.tsx
TO:   components/phase1/reports/IRRCalculationModal.tsx

FROM: components/PrintInstructionsModal.tsx
TO:   components/phase1/reports/PrintInstructionsModal.tsx
```

#### phase1/funds/
```
FROM: components/AddFundModal.tsx
TO:   components/phase1/funds/AddFundModal.tsx

FROM: components/AddProviderModal.tsx
TO:   components/phase1/funds/AddProviderModal.tsx

FROM: components/generation/
TO:   components/phase1/funds/generation/
  - AvailableFundsPanel.tsx
  - FundSelectionManager.tsx
  - SelectedFundsPanel.tsx
```

#### phase1/activities/
```
FROM: components/BulkMonthActivitiesModal.tsx
TO:   components/phase1/activities/BulkMonthActivitiesModal.tsx

FROM: components/EditableMonthlyActivitiesTable.tsx
TO:   components/phase1/activities/EditableMonthlyActivitiesTable.tsx
```

#### phase1/forms/
```
FROM: components/form/
TO:   components/phase1/forms/
  - FormSection.tsx
  - FormTextField.tsx
```

---

### 📁 **layout/** (Keep - Already well organized)
```
layout/
├── AppLayout.tsx                     ✅ Keep
└── AuthLayout.tsx                    ✅ Keep

FROM: components/Sidebar.tsx
TO:   components/layout/Sidebar.tsx

FROM: components/TopBar.tsx
TO:   components/layout/TopBar.tsx

FROM: components/Footer.tsx
TO:   components/layout/Footer.tsx
```

---

### 📁 **auth/** (Keep - Already well organized)
```
auth/
├── LoginForm.tsx                     ✅ Keep
├── ResetPasswordForm.tsx             ✅ Keep
├── SetNewPasswordForm.tsx            ✅ Keep
└── SignupForm.tsx                    ✅ Keep

FROM: components/ProtectedRoute.tsx
TO:   components/auth/ProtectedRoute.tsx
```

---

### 📁 **Root Level / Feature-Specific** (Components that don't fit categories)
```
FROM: components/RiskDifferences.tsx
TO:   components/RiskDifferences.tsx
NOTE: Keep at root - dashboard/report specific widget

FROM: components/UpcomingMeetings.tsx
TO:   components/UpcomingMeetings.tsx
NOTE: Keep at root - dashboard specific widget

FROM: components/HolidayBanner.tsx
TO:   components/HolidayBanner.tsx
NOTE: Keep at root - app-level banner
```

---

### 📁 **_archive/** (NEW - Deprecated/Unused)
```
FROM: components/BaseModal.tsx
TO:   components/_archive/BaseModal.tsx
NOTE: Replaced by ModalShell.tsx

FROM: components/CreateSpecialRelationshipModal.tsx
TO:   components/_archive/CreateSpecialRelationshipModal.tsx
NOTE: Replaced by CreatePersonalRelationshipModal and CreateProfessionalRelationshipModal

FROM: components/RelationshipFormFields.tsx
TO:   components/_archive/RelationshipFormFields.tsx
NOTE: Replaced by PersonalRelationshipFormFields and ProfessionalRelationshipFormFields

FROM: components/SpecialRelationshipActions.tsx
TO:   components/_archive/SpecialRelationshipActions.tsx
NOTE: Superseded by table-level actions

FROM: components/SpecialRelationshipRow.tsx
TO:   components/_archive/SpecialRelationshipRow.tsx
NOTE: Superseded by table implementations

FROM: components/ClientsOptimizationTest.tsx
TO:   components/_archive/ClientsOptimizationTest.tsx
NOTE: Test component, not production code
```

---

### 📁 **Root Level** (Keep)
```
components/ErrorBoundary.tsx          ✅ Keep at root (app-level utility)
```

---

### 📁 **KEEP / REORGANIZE** (Special handling)
```
components/relationshipTable/         🔄 MOVE TO PHASE2
  FROM: components/relationshipTable/
  TO:   components/phase2/special-relationships/relationshipTable/
  NOTE: Keep constants.ts, utils.ts, index.ts together
        These are DOMAIN-SPECIFIC relationship constants, not general UI constants
        Do NOT consolidate into ui/constants/ - maintains proper coupling boundaries
```

### 📁 **DELETE** (Empty folders after reorganization)
```
components/data-displays/             ❌ DELETE (after moving contents to ui/)
components/form/                      ❌ DELETE (after moving contents to phase1/)
components/generation/                ❌ DELETE (after moving contents to phase1/funds/)
components/report/                    ❌ DELETE (after moving contents to phase1/reports/)
components/reports/                   ❌ DELETE (after moving contents to phase1/reports/)
```

---

## MIGRATION CHECKLIST

### Phase 1: Create New Structure (30 minutes)
- [ ] Create `phase2/` folder: `people/`, `special-relationships/`, `client-groups/`
- [ ] Create `phase1/` folder: `reports/`, `funds/`, `activities/`
- [ ] Create new `ui/` subfolders: `modals/`, `tables/`, `badges/`, `navigation/`, `date/`
- [ ] Create `_archive/` folder

### Phase 2: Move UI Components (4 hours)
- [ ] Move modal components to `ui/modals/` (ModalShell)
- [ ] Move table components to `ui/tables/` (SortableColumnHeader, TableSortHeader, SkeletonTable, StandardTable)
- [ ] Move badge components to `ui/badges/` (StatusBadge)
- [ ] Move navigation components to `ui/navigation/` (TabNavigation)
- [ ] Move search components to `ui/search/` (GlobalSearch)
- [ ] Move data displays to `ui/data-displays/` (DataTable, FundDistributionChart)
- [ ] Move date components to `ui/date/` (EnhancedMonthHeader, MiniYearSelector)
- [ ] Move error states to `ui/feedback/` (ErrorStateNetwork, ErrorStateServer)
- [ ] Move PasswordInput to `ui/inputs/`
- [ ] Update imports in moved files
- [ ] Update `ui/index.ts` barrel export

### Phase 3: Move Phase 2 Components (4 hours)
- [ ] Move People tab components to `phase2/people/` (6 files + PresenceIndicator, PresenceNotifications)
- [ ] Move Special Relationships components to `phase2/special-relationships/` (10 files)
- [ ] Move `relationshipTable/` folder to `phase2/special-relationships/relationshipTable/`
- [ ] Move DynamicPageContainer to `phase2/client-groups/`
- [ ] Update imports in moved files
- [ ] Update page imports

### Phase 4: Move Phase 1 Components (4 hours)
- [ ] Move report components to `phase1/reports/` (8 files)
- [ ] Move fund components to `phase1/funds/` (5 files)
- [ ] Move activity components to `phase1/activities/` (2 files)
- [ ] Move form components to `phase1/forms/` (2 files)
- [ ] Update imports in moved files
- [ ] Update page imports

### Phase 5: Move Layout & Auth (2 hours)
- [ ] Move layout components to `layout/` (Sidebar, TopBar, Footer)
- [ ] Move auth guard to `auth/` (ProtectedRoute)
- [ ] Keep dashboard widgets at root (RiskDifferences, UpcomingMeetings, HolidayBanner)
- [ ] Update imports in moved files

### Phase 6: Archive & Cleanup (1 hour)
- [ ] Move deprecated components to `_archive/` (6 files)
- [ ] Delete empty folders (data-displays, form, generation, report, reports)
- [ ] Verify no broken imports with TypeScript compiler

### Phase 7: Update Barrel Exports (1 hour)
- [ ] Update `ui/index.ts` with new subfolder exports
- [ ] Create `phase2/index.ts` for convenient imports
- [ ] Create `phase1/index.ts` for convenient imports
- [ ] Create subfolder indexes (ui/modals/index.ts, ui/tables/index.ts, etc.)

### Phase 8: Testing (4 hours)
- [ ] Run TypeScript compiler (`npm run build`)
- [ ] Run test suite (`npm test`) - NOTE: Test file imports need separate update pass
- [ ] Manual smoke tests:
  - [ ] Login/logout flow
  - [ ] View People tab
  - [ ] Create/edit product owner
  - [ ] View Special Relationships tab
  - [ ] Create/edit personal relationship
  - [ ] Create/edit professional relationship
  - [ ] Delete relationship with confirmation
  - [ ] Generate IRR report
  - [ ] Navigate between client groups
- [ ] Fix any issues found
- [ ] Deploy to staging for final verification

### Phase 9: Documentation (2 hours)
- [ ] Create `components/README.md` with organization guide
- [ ] Update CLAUDE.md import patterns
- [ ] Document component placement decision tree
- [ ] Note that test file imports need future update

---

## IMPORT PATTERN CHANGES

### Before:
```typescript
import ProductOwnerTable from '@/components/ProductOwnerTable';
import ModalShell from '@/components/ModalShell';
import StatusBadge from '@/components/StatusBadge';
import { ACTION_ICONS } from '@/components/ui';
```

### After:
```typescript
import ProductOwnerTable from '@/components/phase2/people/ProductOwnerTable';
import { ModalShell } from '@/components/ui'; // Now in ui/modals
import { StatusBadge } from '@/components/ui'; // Now in ui/badges
import { ACTION_ICONS } from '@/components/ui';
```

### Alternatively (using barrel exports):
```typescript
import { ProductOwnerTable } from '@/components/phase2/people';
import { ModalShell, StatusBadge, ACTION_ICONS } from '@/components/ui';
```

---

## DOCUMENTATION TO CREATE

1. **`components/phase2/README.md`** - Phase 2 patterns and standards
2. **`components/phase1/README.md`** - Phase 1 deprecation notice
3. **`components/ui/README.md`** - UI component library guide
4. **`components/_archive/README.md`** - Archive explanation

---

## BENEFITS

✅ **Clear separation** - Phase 2 vs Phase 1 vs reusable UI
✅ **Feature-based organization** - Easy to find related components
✅ **Safe refactoring** - Phase 1 isolated, won't affect Phase 2
✅ **Consistent patterns** - Phase 2 folder enforces consistency
✅ **Smooth migration** - Move Phase 1 features to Phase 2 gradually
✅ **Clean UI library** - Only truly reusable components in ui/
✅ **Archive for reference** - Old code preserved but clearly marked

---

## ESTIMATED EFFORT (REVISED)

- **Create folders**: 30 minutes
- **Move UI components + update imports**: 4 hours
- **Move Phase 2 components + update imports**: 4 hours
- **Move Phase 1 components + update imports**: 4 hours
- **Move layout/auth + update imports**: 2 hours
- **Archive & cleanup**: 1 hour
- **Update barrel exports**: 1 hour
- **Testing & verification**: 4 hours
- **Documentation**: 2 hours

**Total**: ~22-24 hours (spread across 3-4 days)

**Note**: Original estimate of 6-8 hours was significantly underestimated. Import updates alone require 6-10 hours across 38+ pages and 69+ components.
