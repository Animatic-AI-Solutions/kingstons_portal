# Phase 2 Components

**Modern, Consistent Implementation - Reference Standard**

Phase 2 components represent the modern, consistent approach to building features in Kingston's Portal. These components follow established patterns, best practices, and serve as the reference implementation for all new development.

---

## 🎯 What is Phase 2?

Phase 2 components are:
- ✅ **Modern** - Built with current React patterns and hooks
- ✅ **Consistent** - Follow established UI/UX patterns
- ✅ **Well-tested** - Comprehensive test coverage
- ✅ **Accessible** - WCAG 2.1 AA compliant
- ✅ **Documented** - Clear JSDoc comments and prop interfaces
- ✅ **Maintainable** - DRY principles, shared utilities

---

## 📁 Directory Structure

```
phase2/
├── people/                      # People Tab (✅ REFERENCE IMPLEMENTATION)
│   ├── ProductOwnerTable.tsx
│   ├── ProductOwnerActions.tsx
│   ├── CreateProductOwnerModal.tsx
│   ├── EditProductOwnerModal.tsx
│   ├── EditProductOwnerForm.tsx
│   ├── DeleteConfirmationModal.tsx
│   ├── PresenceIndicator.tsx
│   ├── PresenceNotifications.tsx
│   └── index.ts
│
├── special-relationships/       # Special Relationships Tab
│   ├── SpecialRelationshipsSubTab.tsx
│   ├── PersonalRelationshipsTable.tsx
│   ├── ProfessionalRelationshipsTable.tsx
│   ├── PersonalRelationshipFormFields.tsx
│   ├── ProfessionalRelationshipFormFields.tsx
│   ├── CreatePersonalRelationshipModal.tsx
│   ├── CreateProfessionalRelationshipModal.tsx
│   ├── EditSpecialRelationshipModal.tsx
│   ├── EmptyStatePersonal.tsx
│   ├── EmptyStateProfessional.tsx
│   ├── relationshipTable/
│   │   ├── constants.ts
│   │   ├── utils.ts
│   │   └── index.ts
│   └── index.ts
│
└── client-groups/               # Client Group Phase 2 Features
    └── DynamicPageContainer.tsx
```

---

## 🌟 Reference Implementation: People Tab

The **People tab** (`people/`) is the gold standard for Phase 2 development. Study and reference these components when building new features.

### Key Patterns

#### 1. Table Implementation
**See**: `ProductOwnerTable.tsx`
- Sortable columns with visual indicators
- Status-based row styling
- Row click opens edit modal
- Action buttons based on status
- Empty/loading/error state handling

#### 2. Status-Based Actions
**See**: `ProductOwnerActions.tsx`
- Active status: Show Lapse + Make Deceased
- Inactive status: Show Reactivate + Delete
- Per-action loading states
- Success toast notifications

#### 3. Modal Flows
**See**: `CreateProductOwnerModal.tsx`, `EditProductOwnerModal.tsx`
- Use `ModalShell` from `@/components/ui`
- Separate form component for reusability
- Field-level validation
- React Query integration

---

## 📋 Phase 2 Standards Checklist

### Code Quality
- [ ] TypeScript with proper prop interfaces
- [ ] JSDoc comments
- [ ] No `any` types
- [ ] Extract constants
- [ ] DRY principles
- [ ] Max 500 lines per file

### UI/UX
- [ ] Uses `@/components/ui` components
- [ ] Follows People tab patterns
- [ ] Consistent Tailwind spacing
- [ ] Loading states (skeleton loaders)
- [ ] Empty states (meaningful messages)
- [ ] Error states (user-friendly with retry)

### Functionality
- [ ] React Query for data fetching
- [ ] Toast notifications
- [ ] Form validation
- [ ] Error handling
- [ ] Loading indicators

### Accessibility
- [ ] Keyboard navigation
- [ ] ARIA labels
- [ ] Semantic HTML
- [ ] Focus management in modals
- [ ] Screen reader support

### Testing
- [ ] Component tests
- [ ] User interaction tests
- [ ] Accessibility tests (jest-axe)
- [ ] 70%+ coverage

---

## 🚫 Anti-Patterns

❌ **Don't create custom UI components** - use `@/components/ui`
❌ **Don't hardcode styles** - use Tailwind classes
❌ **Don't skip TypeScript types** - always define interfaces
❌ **Don't skip error handling** - wrap API calls in try/catch
❌ **Don't skip accessibility** - add ARIA labels and keyboard support

---

**Last Updated**: 2026-01-06
**Reference**: `people/` (People Tab)
**Status**: ✅ Active Development Standard
