# Phase 1 Components

**Legacy Code - Scheduled for Refactoring**

⚠️ **DEPRECATION NOTICE**: Phase 1 components are legacy code that will be gradually refactored to Phase 2 standards. Do not add new features to this directory.

---

## 🚨 What is Phase 1?

Phase 1 components are:
- ⚠️ **Legacy** - Built before Phase 2 standards were established
- ⚠️ **Inconsistent** - Various patterns and approaches
- ⚠️ **Functional** - They work, but need modernization
- ⚠️ **Scheduled for refactoring** - Will be migrated to Phase 2
- ⚠️ **Bug fixes only** - No new features

---

## 📁 Directory Structure

```
phase1/
├── reports/                     # IRR Reports & Print Modals
│   ├── irr/
│   │   ├── IRRHistorySummaryTable.tsx
│   │   ├── IRRHistoryTab.tsx
│   │   ├── ProductOwnerModal.tsx
│   │   ├── ProductTitleModal.tsx
│   │   ├── ReportContainer.tsx
│   │   ├── ReportErrorBoundary.tsx
│   │   ├── SummaryTab.tsx
│   │   └── index.ts
│   ├── shared/
│   │   ├── ReportFormatters.tsx
│   │   └── ReportTypes.ts
│   ├── IRRCalculationModal.tsx
│   └── PrintInstructionsModal.tsx
│
├── funds/                       # Fund & Provider Management
│   ├── AddFundModal.tsx
│   ├── AddProviderModal.tsx
│   └── generation/
│       ├── AvailableFundsPanel.tsx
│       ├── FundSelectionManager.tsx
│       └── SelectedFundsPanel.tsx
│
├── activities/                  # Monthly Activities
│   ├── BulkMonthActivitiesModal.tsx
│   └── EditableMonthlyActivitiesTable.tsx
│
└── forms/                       # Legacy Form Components
    ├── form/
    │   ├── FormSection.tsx
    │   └── FormTextField.tsx
    └── index.ts
```

---

## ⛔ Development Rules

### ❌ DO NOT
- Add new features to Phase 1
- Copy Phase 1 patterns for new components
- Extend Phase 1 components with new functionality
- Create new files in this directory

### ✅ DO
- Fix critical bugs only
- Extract reusable logic to `@/utils` or `@/components/ui`
- Plan migration to Phase 2 when making major changes
- Document technical debt

---

## 🔄 Migration Strategy

When working with Phase 1 components:

### Minor Bug Fix (< 50 lines changed)
1. Fix the bug in Phase 1
2. Add comment: `// TODO: Migrate to Phase 2`
3. Document in technical debt log

### Major Bug Fix or Feature Request
1. **Don't fix in Phase 1** - migrate instead
2. Create new Phase 2 version following modern patterns
3. Update imports throughout codebase
4. Move old component to `_archive/`
5. Test thoroughly

---

## 📋 Migration Priority

Components will be migrated in this order:

### High Priority
1. **Reports** (`reports/`)
   - IRR report generation
   - Print modals
   - Report formatting
   - **Why**: Core business functionality, high usage

2. **Funds** (`funds/`)
   - Add fund modal
   - Add provider modal
   - Fund selection
   - **Why**: Critical data management

3. **Activities** (`activities/`)
   - Monthly activities table
   - Bulk activities modal
   - **Why**: Complex UI, needs modernization

### Medium Priority
4. **Forms** (`forms/`)
   - Legacy form components
   - **Why**: Being replaced by `@/components/ui` inputs

---

## 🎯 Migration Checklist

When migrating a Phase 1 component to Phase 2:

### Planning
- [ ] Review existing Phase 1 component
- [ ] Identify business logic to preserve
- [ ] Design Phase 2 version (reference People tab patterns)
- [ ] List required UI components from `@/components/ui`
- [ ] Plan data flow and state management

### Implementation
- [ ] Create new component in `@/components/phase2/[feature]/`
- [ ] Use TypeScript with proper interfaces
- [ ] Use UI components from `@/components/ui`
- [ ] Add JSDoc comments
- [ ] Implement accessibility features
- [ ] Add loading/empty/error states

### Testing
- [ ] Write component tests
- [ ] Test user interactions
- [ ] Test accessibility with jest-axe
- [ ] Manual testing in dev environment
- [ ] Verify no regressions

### Deployment
- [ ] Update all imports to point to Phase 2 version
- [ ] Test in staging environment
- [ ] Move Phase 1 component to `_archive/`
- [ ] Update documentation
- [ ] Deploy to production

---

## 📝 Known Issues & Technical Debt

### Reports
- IRR calculations could be optimized
- Print layout needs CSS cleanup
- Error handling could be more user-friendly
- Missing loading states in some modals

### Funds
- Fund selection UI is complex and confusing
- Provider color picker is inconsistent
- Missing form validation in places
- No empty states

### Activities
- Monthly activities table has performance issues with large datasets
- Bulk modal doesn't show progress
- UK date format not consistently applied
- Confusing UX for switching/canceling activities

### Forms
- Legacy form components inconsistent with Phase 2 UI
- Being gradually replaced by `@/components/ui` inputs
- Missing field-level validation
- Accessibility issues (missing ARIA labels)

---

## 🔗 Related Documentation

- [`../phase2/README.md`](../phase2/README.md) - Target patterns for migration
- [`../ui/README.md`](../ui/README.md) - UI components to use
- [`../README.md`](../README.md) - Component organization guide
- [`../../CLAUDE.md`](../../CLAUDE.md) - Project documentation

---

## ❓ FAQs

**Q: Can I add a new feature to a Phase 1 component?**
A: No. Migrate to Phase 2 first, then add the feature.

**Q: I need to fix a bug. Should I migrate?**
A: If it's a small fix (< 50 lines), fix in Phase 1. If it's major, migrate to Phase 2.

**Q: How do I know if a component is Phase 1?**
A: If it's in this directory (`phase1/`), it's Phase 1.

**Q: Can I use Phase 1 components in new pages?**
A: Only if absolutely necessary. Prefer Phase 2 or create new Phase 2 components.

**Q: When will Phase 1 be fully migrated?**
A: Gradually over the next 6-12 months as features are touched.

---

## 📞 Support

If you need to work with Phase 1 components:
1. Check this README for guidance
2. Reference Phase 2 patterns for migration
3. Discuss migration plan with team
4. Document any workarounds or technical debt

---

**Last Updated**: 2026-01-06
**Status**: ⚠️ Legacy - Bug Fixes Only
**Migration Progress**: 0% (To be tracked)
