# Components Organization Guide

## Overview
This folder contains all React components organized by purpose: reusable UI components, Phase 2 (modern) features, Phase 1 (legacy) features, and supporting infrastructure.

---

## Folder Structure

```
components/
├── ui/                          # Reusable UI Component Library
│   ├── buttons/                 # Button components (ActionButton, AddButton, etc.)
│   ├── inputs/                  # Form inputs (BaseInput, DateInput, etc.)
│   ├── dropdowns/               # Dropdown/select components
│   ├── modals/                  # Modal components (ModalShell)
│   ├── tables/                  # Table-related components (SortableColumnHeader, etc.)
│   ├── badges/                  # Badge components (StatusBadge)
│   ├── navigation/              # Navigation components (TabNavigation)
│   ├── feedback/                # Feedback UI (EmptyState, ErrorDisplay, Skeleton)
│   ├── search/                  # Search components (GlobalSearch, SearchInput)
│   ├── data-displays/           # Data visualization (DataTable, charts)
│   ├── date/                    # Date/calendar components
│   └── constants/               # UI constants (tableIcons, tableStyles)
│
├── phase2/                      # Modern, Consistent Components (Reference Implementation)
│   ├── people/                  # People tab ✅ REFERENCE PATTERN
│   ├── special-relationships/   # Special Relationships tab
│   └── client-groups/           # Client Group Phase 2 components
│
├── phase1/                      # Legacy Components (To Be Refactored)
│   ├── reports/                 # IRR reports, print modals
│   ├── funds/                   # Fund management
│   └── activities/              # Monthly activities
│
├── layout/                      # App Layout Components
│   ├── AppLayout.tsx
│   ├── AuthLayout.tsx
│   ├── Sidebar.tsx
│   ├── TopBar.tsx
│   └── Footer.tsx
│
├── auth/                        # Authentication Components
│   ├── LoginForm.tsx
│   ├── SignupForm.tsx
│   ├── ResetPasswordForm.tsx
│   └── ProtectedRoute.tsx
│
└── _archive/                    # Deprecated Components (Don't Use)
```

---

## Component Placement Guide

### Where Should My Component Go?

Use this decision tree:

#### 1. Is it a UI primitive (button, input, dropdown, badge)?
**→ `ui/[category]/`**
- Examples: ActionButton, DateInput, ComboDropdown, StatusBadge

#### 2. Is it used by 3+ unrelated features?
**→ `ui/[category]/`**
- Examples: ModalShell (used by many modals), TabNavigation (used by multiple tabs)

#### 3. Is it Phase 2-specific (modern, consistent pattern)?
**→ `phase2/[feature]/`**
- Examples: ProductOwnerTable, CreatePersonalRelationshipModal

#### 4. Is it Phase 1-specific (legacy, to be refactored)?
**→ `phase1/[category]/`**
- Examples: IRRCalculationModal, AddFundModal

#### 5. Is it app-level infrastructure?
**→ `layout/` or `auth/` or `components/` root**
- Examples: Sidebar (layout), ProtectedRoute (auth), HolidayBanner (root)

#### 6. Is it deprecated?
**→ `_archive/`**
- Mark with clear note about replacement

---

## Import Patterns

### UI Components (Most Common)
```typescript
import {
  ModalShell,
  StatusBadge,
  ACTION_ICONS
} from '@/components/ui';
```

### Phase 2 Components
```typescript
// Direct import
import ProductOwnerTable from '@/components/phase2/people/ProductOwnerTable';

// Or using barrel export (if available)
import { ProductOwnerTable } from '@/components/phase2/people';
```

### Phase 1 Components
```typescript
import IRRCalculationModal from '@/components/phase1/reports/IRRCalculationModal';
```

### Layout/Auth
```typescript
import Sidebar from '@/components/layout/Sidebar';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
```

---

## Phase 2 Reference Pattern

**People tab (`phase2/people/`) is the REFERENCE IMPLEMENTATION** for Phase 2 patterns.

### What this means:
1. **Use similar patterns** when building new Phase 2 features:
   - Table with sortable headers
   - Status-based sorting (Active: 0, Inactive: 1, Deceased: 2)
   - Row click opens edit modal
   - Action buttons: Lapse/Deceased for active, Reactivate/Delete for inactive
   - Modal flows with validation
   - Toast notifications

2. **Don't copy code** - reference the patterns and use shared UI components from `ui/`

3. **Consistency comes from**:
   - Shared UI components (`ui/` folder)
   - Shared constants (`ui/constants/`)
   - Following established patterns

### Key Phase 2 Patterns:

**Tables:**
```typescript
import {
  ACTION_ICONS,
  ACTION_BUTTON_STYLES,
  ICON_SIZES
} from '@/components/ui';

const LapseIcon = ACTION_ICONS.lapse;

<button className={ACTION_BUTTON_STYLES.lapse}>
  <LapseIcon className={ICON_SIZES.sm} />
</button>
```

**Modals:**
```typescript
import { ModalShell } from '@/components/ui';

<ModalShell
  isOpen={isOpen}
  onClose={onClose}
  title="Edit Product Owner"
  size="md"
>
  {/* Modal content */}
</ModalShell>
```

**Forms:**
- Use `ui/inputs` components
- UK date format (dd/MM/yyyy)
- Field-level error display
- Consistent spacing (space-y-4)

---

## Phase 1 Deprecation

Phase 1 components are legacy code that will be gradually refactored to Phase 2 patterns.

### Rules:
- ❌ **No new features** in Phase 1
- ⚠️ **Bug fixes only**
- 📋 **Gradually migrate** to Phase 2 when refactoring

### Migration Priority:
1. Reports (IRR, print)
2. Funds (management, selection)
3. Activities (monthly activities)

---

## Important Notes

### Test File Imports
**⚠️ NOTE**: Test files in `frontend/src/tests/` were not updated during the reorganization.

If you encounter test failures with import errors, you'll need to update test file imports to match the new structure.

Example fix:
```typescript
// Old (broken)
import ProductOwnerTable from '@/components/ProductOwnerTable';

// New (working)
import ProductOwnerTable from '@/components/phase2/people/ProductOwnerTable';
// OR
import { ModalShell } from '@/components/ui'; // If moved to ui/
```

### Barrel Exports
The `ui/index.ts` provides convenient barrel exports for all UI components:
```typescript
// Instead of
import ModalShell from '@/components/ui/modals/ModalShell';
import StatusBadge from '@/components/ui/badges/StatusBadge';

// Use
import { ModalShell, StatusBadge } from '@/components/ui';
```

Phase 2 and Phase 1 may also have barrel exports in their index files.

---

## Adding New Components

### Checklist:
1. **Determine correct location** using decision tree above
2. **Follow Phase 2 patterns** if building new features
3. **Use existing UI components** from `ui/` folder
4. **Update barrel exports** if adding to `ui/` folder
5. **Document any new patterns** in this README
6. **Add tests** for new components

### Don't:
- ❌ Create components in wrong folders
- ❌ Duplicate UI components that already exist in `ui/`
- ❌ Add new features to Phase 1
- ❌ Use deprecated components from `_archive/`

---

## Questions?

- **"Where does this component go?"** → Use decision tree above
- **"Can I use this Phase 1 component?"** → Only if necessary, prefer Phase 2 patterns
- **"Why is this component in `ui/` not `phase2/`?"** → Because it's reusable across multiple features
- **"What's the difference between Phase 1 and Phase 2?"** → Phase 2 is modern, consistent, and follows reference patterns. Phase 1 is legacy code to be refactored.

---

## Maintenance

This organization was established in December 2024 to:
1. Separate modern (Phase 2) from legacy (Phase 1) code
2. Create clear UI component library
3. Enable gradual refactoring of legacy code
4. Improve component discoverability

For updates to this guide, contact the development team.
