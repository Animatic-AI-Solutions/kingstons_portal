# Special Relationships Documentation

## Overview

This folder contains comprehensive specifications for the Special Relationships feature implementation. All documents were created to address critical and medium priority issues identified in the architectural analysis, transforming a high-level plan into production-ready specifications.

**Purpose**: Prevent 50-80 hours of rework by addressing all architectural concerns before implementation begins.

---

## Quick Navigation

### 🚀 Start Here

**First time reading?** Start with:
1. [`special_relationships_implementation_plan.md`](./special_relationships_implementation_plan.md) - Main implementation plan with SPARC methodology
2. This README - Navigation guide for all documentation

**During implementation?** Jump to the [Implementation Phase Guide](#implementation-phase-guide) below.

---

## Documentation Index

### Critical Priority (MUST Read Before Implementation)

| Document | Purpose | When to Read | Effort |
|----------|---------|--------------|--------|
| **[revised_component_architecture.md](./revised_component_architecture.md)** | Component breakdown (12 components, all <500 lines) | **Phase 2** (Architecture) | 2h planning |
| **[special_relationships_api_spec.yaml](./special_relationships_api_spec.yaml)** | OpenAPI 3.0 backend contract | **Week 0** (Pre-development) | 3h |
| **[accessibility_implementation_guide.md](./accessibility_implementation_guide.md)** | WCAG 2.1 AA patterns with code | **Cycle 4+** (Before components) | 4h |
| **[integration_test_scenarios.md](./integration_test_scenarios.md)** | 15 detailed test scenarios | **Cycle 8-10** (Integration testing) | 2h |

### High Priority (SHOULD Read During Implementation)

| Document | Purpose | When to Read | Effort |
|----------|---------|--------------|--------|
| **[editable_dropdown_specification.md](./editable_dropdown_specification.md)** | ARIA combobox pattern, custom values | **Cycle 7** (Modals) | 2-8h |
| **[performance_optimization_guide.md](./performance_optimization_guide.md)** | Memoization, React Query, code splitting | **Cycle 1-8** (Built into arch) | Ongoing |

### Medium Priority (Reference as Needed)

| Document | Purpose | When to Read | Effort |
|----------|---------|--------------|--------|
| **[empty_states_specification.md](./empty_states_specification.md)** | Empty, loading, error states | **Cycle 6** (Tables) | 5-6h |
| **[delete_confirmation_undo_specification.md](./delete_confirmation_undo_specification.md)** | Delete modal, undo toast, soft delete | **Cycle 4** (Actions) | 4-5h |
| **[ux_and_validation_specifications.md](./ux_and_validation_specifications.md)** | Form validation, responsive design, UAT checklist, data validation | **Cycle 7** (Modals) & **Week 3** (UAT) | 14-17h |

---

## Implementation Phase Guide

### Week 0: Pre-Development Planning (8-10 hours)

**Goal**: Define API contract and architecture before coding begins

#### Tasks
1. **Review Main Plan** (1 hour)
   - Read: [`special_relationships_implementation_plan.md`](./special_relationships_implementation_plan.md)
   - Understand SPARC methodology and 10 TDD cycles
   - Note revised timeline: 45-50 hours (not 25-30)

2. **Backend Coordination** (5 hours)
   - Read: [`special_relationships_api_spec.yaml`](./special_relationships_api_spec.yaml)
   - Hold kickoff with backend developer
   - Agree on API endpoints, validation rules, error responses
   - Set up MSW mocks using OpenAPI spec
   - **Critical**: Backend must develop in parallel (Week 1)

3. **Architecture Review** (3-5 hours)
   - Read: [`revised_component_architecture.md`](./revised_component_architecture.md)
   - Understand 12-component structure (not single large files)
   - Note reusable components: ModalShell, TableSortHeader, RelationshipFormFields
   - Create stub files for all components

4. **Accessibility Preparation** (4 hours)
   - Read: [`accessibility_implementation_guide.md`](./accessibility_implementation_guide.md)
   - Bookmark ARIA patterns for sortable tables, modals, comboboxes
   - Install jest-axe for automated testing
   - Prepare screen reader (NVDA) for manual testing

---

### Week 1: Foundation & Backend (Cycles 1-5, 20-25 hours)

#### Cycle 1: Type Definitions and Utilities (3 hours)

**Goal**: Create TypeScript types and utility functions with tests

**Read First**:
- [`special_relationships_implementation_plan.md`](./special_relationships_implementation_plan.md) - Lines 287-526 (Cycle 1 details)
- [`ux_and_validation_specifications.md`](./ux_and_validation_specifications.md#data-validation-service-layer) - Validation logic

**Deliverables**:
- `types/specialRelationship.ts` (RelationshipType, SpecialRelationship, FormData)
- `utils/specialRelationshipUtils.ts` (calculateAge, sortRelationships, filterRelationshipsByType)
- `tests/mocks/specialRelationshipMocks.ts` (Test data generators)
- `tests/utils/specialRelationshipUtils.test.ts` (Unit tests)

**Testing**: All tests pass (RED → GREEN → REFACTOR)

---

#### Cycle 2: API Service Layer (2.5 hours)

**Goal**: Implement API client with MSW mocks

**Read First**:
- [`special_relationships_api_spec.yaml`](./special_relationships_api_spec.yaml) - Complete API contract
- [`special_relationships_implementation_plan.md`](./special_relationships_implementation_plan.md) - Lines 528-700 (Cycle 2 details)

**Deliverables**:
- `services/specialRelationshipsApi.ts` (fetchSpecialRelationships, create, update, updateStatus, delete)
- `tests/services/specialRelationshipsApi.test.ts` (API tests with MSW)

**Testing**: Mock all API responses using MSW based on OpenAPI spec

---

#### Cycle 3: React Query Hooks (3 hours)

**Goal**: Create custom hooks for data fetching and mutations

**Read First**:
- [`special_relationships_implementation_plan.md`](./special_relationships_implementation_plan.md) - Lines 702-897 (Cycle 3 details)
- [`performance_optimization_guide.md`](./performance_optimization_guide.md#react-query-cache-strategy) - Cache configuration

**Deliverables**:
- `hooks/useSpecialRelationships.ts` (useQuery hook with 5-minute staleTime)
- `hooks/useCreateSpecialRelationship.ts` (mutation with cache invalidation)
- `hooks/useUpdateSpecialRelationshipStatus.ts` (optimistic updates with rollback)
- `hooks/useDeleteWithUndo.ts` (soft delete with undo support)
- `tests/hooks/useSpecialRelationships.test.tsx` (Hook tests)

**Key Pattern**: Optimistic updates for status changes (see performance guide)

---

#### Cycle 4: Actions Component (2 hours)

**Goal**: Create action buttons (Edit, Delete, Status change)

**Read First**:
- [`accessibility_implementation_guide.md`](./accessibility_implementation_guide.md#button-accessibility) - ARIA labels for buttons
- [`delete_confirmation_undo_specification.md`](./delete_confirmation_undo_specification.md) - Delete confirmation modal

**Deliverables**:
- `components/SpecialRelationshipActions.tsx` (~100 lines)
- `components/DeleteConfirmationModal.tsx` (~150 lines)
- `tests/components/SpecialRelationshipActions.test.tsx`

**Accessibility**:
- Buttons have `aria-label="Edit [Name]"` for screen readers
- Delete button triggers confirmation modal (not immediate delete)

---

#### Cycle 5: Row Component (3 hours)

**Goal**: Create table row with conditional rendering for Personal/Professional

**Read First**:
- [`revised_component_architecture.md`](./revised_component_architecture.md#specialrelationshiprow) - Row component spec
- [`performance_optimization_guide.md`](./performance_optimization_guide.md#react-rendering-optimizations) - React.memo usage

**Deliverables**:
- `components/SpecialRelationshipRow.tsx` (~150 lines)
- Wrapped in `React.memo` for performance
- Conditional columns based on `is_professional` flag

---

#### Parallel: Backend API Development (4-5 hours, Backend Developer)

**Read**:
- [`special_relationships_api_spec.yaml`](./special_relationships_api_spec.yaml) - Implement ALL endpoints
- [`ux_and_validation_specifications.md`](./ux_and_validation_specifications.md#data-validation-service-layer) - Validation rules

**Deliverables**:
- `backend/app/api/routes/special_relationships.py`
- Database migration (add `special_relationships` table + `deleted_at` column)
- Pydantic models with validation
- pytest tests

**Deploy to development environment by end of Week 1**

---

### Week 2: Tables & Modals (Cycles 6-8, 15-20 hours)

#### Cycle 6: Table Components (5 hours)

**Goal**: Create separate PersonalRelationshipsTable and ProfessionalRelationshipsTable

**Read First**:
- [`revised_component_architecture.md`](./revised_component_architecture.md#table-components) - Split table architecture
- [`empty_states_specification.md`](./empty_states_specification.md) - Empty/loading/error states
- [`accessibility_implementation_guide.md`](./accessibility_implementation_guide.md#sortable-table-accessibility) - Sortable table ARIA
- [`responsive_design_specification.md`](./ux_and_validation_specifications.md#responsive-design-for-tablet) - Tablet design (768-1023px)

**Deliverables**:
- `components/PersonalRelationshipsTable.tsx` (~250 lines)
- `components/ProfessionalRelationshipsTable.tsx` (~250 lines)
- `components/TableSortHeader.tsx` (~70 lines, reusable)
- `components/EmptyStatePersonal.tsx`
- `components/EmptyStateProfessional.tsx`
- `components/SkeletonTable.tsx` (loading state)
- `components/ErrorStateNetwork.tsx`

**Key Features**:
- Sortable columns with `aria-sort` attribute
- Empty states with "Add Relationship" call-to-action
- Loading skeleton on initial fetch
- Responsive: Hide Email/Phone/DOB on tablet, show expand button

---

#### Cycle 7: Modal Components (7-10 hours)

**Goal**: Create form modals with validation and accessibility

**Read First**:
- [`revised_component_architecture.md`](./revised_component_architecture.md#modal-components) - Modal decomposition
- [`ux_and_validation_specifications.md`](./ux_and_validation_specifications.md#modal-form-validation-specification) - Complete form validation
- [`editable_dropdown_specification.md`](./editable_dropdown_specification.md) - Editable dropdown implementation
- [`accessibility_implementation_guide.md`](./accessibility_implementation_guide.md#modal-focus-management) - Focus trap pattern

**Deliverables**:
- `components/ModalShell.tsx` (~80 lines, reusable with focus trap)
- `components/RelationshipFormFields.tsx` (~200 lines, shared form fields)
- `hooks/useRelationshipValidation.ts` (~100 lines, validation logic)
- `components/CreateSpecialRelationshipModal.tsx` (~150 lines)
- `components/EditSpecialRelationshipModal.tsx` (~150 lines)

**Critical Steps**:
1. **Investigate Existing ComboDropdown** (1 hour)
   - Check `frontend/src/components/ui/` for ComboDropdown
   - Test if it supports custom values
   - Decision: Use existing (2h), extend (3-4h), or implement new with downshift (6-8h)

2. **Implement Form Validation** (2 hours)
   - On-blur validation for each field
   - Required field indicators (* asterisk + sr-only text)
   - Inline error messages below fields
   - Focus first invalid field on submit

3. **Add Focus Management** (1 hour)
   - Use `focus-trap-react` library
   - Focus returns to trigger button on close
   - Escape key closes modal

**Validation Rules** (from ux_and_validation_specifications.md):
- Name: required, 1-200 chars
- Relationship Type: required, editable dropdown, 1-50 chars
- Date of Birth: optional, not in future, age 0-120
- Email: optional, valid format
- Phone: optional, UK format, 10-15 digits
- Status: required, Active/Inactive/Deceased

---

#### Cycle 8: Container Component (3 hours)

**Goal**: Integrate all components into SpecialRelationshipsSubTab

**Read First**:
- [`revised_component_architecture.md`](./revised_component_architecture.md#specialrelationshipssubtab) - Container spec
- [`special_relationships_implementation_plan.md`](./special_relationships_implementation_plan.md) - Lines 899-954 (Cycle 8 details)

**Deliverables**:
- `components/SpecialRelationshipsSubTab.tsx` (~150 lines)
- `components/TabNavigation.tsx` (~50 lines)
- Integration tests verifying all components work together

**Key Features**:
- Tab switching between Personal/Professional
- Modal state management (show/hide create/edit modals)
- Pass clientGroupId to all child components

---

### Week 3: Integration, Testing, UAT (Cycles 9-10, 10-15 hours)

#### Cycle 9: Backend Integration (2 hours)

**Goal**: Replace MSW mocks with real backend API

**Read First**:
- [`special_relationships_api_spec.yaml`](./special_relationships_api_spec.yaml) - Verify backend matches spec
- [`integration_test_scenarios.md`](./integration_test_scenarios.md) - Integration test scenarios

**Tasks**:
- Remove MSW mocks from production code
- Test against real backend API (development environment)
- Verify all CRUD operations work
- Test error scenarios (404, 500, validation errors)
- Fix any discrepancies between mock and real API

---

#### Cycle 10: End-to-End Testing (4 hours)

**Goal**: Comprehensive integration testing

**Read First**:
- [`integration_test_scenarios.md`](./integration_test_scenarios.md) - All 15 scenarios
- [`accessibility_implementation_guide.md`](./accessibility_implementation_guide.md#testing-procedures) - Accessibility testing

**Test Scenarios** (execute all 15):
1. Create personal relationship → verify in table
2. Edit existing relationship → verify changes
3. Delete with confirmation → verify undo works
4. Change status (optimistic update)
5. Create professional with product owner associations
6. Cache synchronization after create
7. Optimistic update rollback on API failure
8. Cross-tab data synchronization
9. Focus trap in create modal
10. Focus restoration after edit modal close
11. Modal backdrop click behavior
12. Sort by multiple columns
13. Tab switching preserves sort state
14. Form validation errors display
15. API error handling

**Accessibility Testing**:
- Run jest-axe on all components (automated)
- Keyboard navigation testing (30 min per component)
- NVDA screen reader testing (15 min per component)

---

#### User Acceptance Testing (8-10 hours)

**Read First**:
- [`ux_and_validation_specifications.md`](./ux_and_validation_specifications.md#uat-process-and-checklist) - Complete UAT process

**Schedule**: End of Week 2 / Start of Week 3

**Prepare** (2 hours):
- Deploy to staging environment
- Create test data (5 personal, 3 professional relationships)
- Prepare 40-item UAT checklist
- Test all functionality yourself first

**UAT Session** (2 hours with Kingston):
- 0:00-0:10 Introduction
- 0:10-0:30 Guided walkthrough
- 0:30-1:00 Kingston independent testing
- 1:00-1:30 Feedback discussion
- 1:30-1:45 Edge case testing
- 1:45-2:00 Next steps

**Post-UAT** (4-6 hours):
- Categorize feedback (P0 blocker, P1 critical, P2 important, P3 nice-to-have)
- Implement P0/P1 fixes
- Schedule final review (1 hour)
- Kingston sign-off

---

## Common Patterns & Best Practices

### When Implementing Any Component

**Always**:
1. ✅ Read component specification in `revised_component_architecture.md`
2. ✅ Check accessibility guide for ARIA patterns
3. ✅ Write tests FIRST (TDD red-green-refactor)
4. ✅ Verify component stays under 500 lines
5. ✅ Use existing UI components from `@/components/ui`
6. ✅ Follow Kingston preferences (16px+ fonts, DD/MM/YYYY dates)

**Never**:
1. ❌ Skip writing tests to save time
2. ❌ Implement without reading accessibility guide
3. ❌ Create new UI components without checking existing library
4. ❌ Use hard-coded values (extract to constants)
5. ❌ Forget to add ARIA attributes for screen readers

### Component Size Limits

If component approaches 500 lines:
1. Extract sub-components (e.g., FormFields, ValidationLogic)
2. Create custom hooks for complex logic (e.g., useRelationshipValidation)
3. Move utility functions to utils folder
4. **Never** exceed 500 lines - this is a hard project requirement

### Accessibility Checklist (Every Component)

- [ ] Keyboard navigation works (Tab, Enter, Escape, Arrow keys)
- [ ] Screen reader announces all interactive elements
- [ ] Focus outline visible on all focused elements
- [ ] Color contrast meets WCAG 2.1 AA (4.5:1 minimum)
- [ ] ARIA attributes correct (role, aria-label, aria-expanded, etc.)
- [ ] Run jest-axe tests (no violations)
- [ ] Manual testing with NVDA screen reader

### Performance Checklist (Every Component)

- [ ] Memoize expensive calculations with `useMemo`
- [ ] Wrap components in `React.memo` if passed as props
- [ ] Use `useCallback` for event handlers
- [ ] Lazy load modals with `React.lazy`
- [ ] Test with 50+ relationships (performance target: <200ms initial render)

---

## Testing Strategy

### Test Pyramid

```
           /\
          /  \
         / E2E \ (10% - Integration scenarios)
        /______\
       /        \
      /Integration\ (30% - Component + hooks)
     /____________\
    /              \
   /  Unit Tests    \ (60% - Utils, validation, logic)
  /________________\
```

**Target**: 70% code coverage minimum

### Test Files Organization

```
tests/
├── utils/
│   ├── specialRelationshipUtils.test.ts
│   └── specialRelationshipValidation.test.ts
├── services/
│   └── specialRelationshipsApi.test.ts
├── hooks/
│   ├── useSpecialRelationships.test.tsx
│   └── useRelationshipValidation.test.tsx
├── components/
│   ├── SpecialRelationshipRow.test.tsx
│   ├── PersonalRelationshipsTable.test.tsx
│   ├── CreateSpecialRelationshipModal.test.tsx
│   └── DeleteConfirmationModal.test.tsx
└── integration/
    ├── SpecialRelationshipsCRUD.test.tsx
    ├── OptimisticUpdates.test.tsx
    └── ModalFocusManagement.test.tsx
```

---

## Troubleshooting

### Issue: Component exceeds 500 lines
**Solution**: See [`revised_component_architecture.md`](./revised_component_architecture.md) for decomposition patterns

### Issue: Accessibility violations in jest-axe
**Solution**: See [`accessibility_implementation_guide.md`](./accessibility_implementation_guide.md) for correct ARIA patterns

### Issue: Integration tests failing
**Solution**: See [`integration_test_scenarios.md`](./integration_test_scenarios.md) for step-by-step expected behavior

### Issue: Backend API doesn't match frontend expectations
**Solution**: See [`special_relationships_api_spec.yaml`](./special_relationships_api_spec.yaml) for correct contract

### Issue: Form validation not working correctly
**Solution**: See [`ux_and_validation_specifications.md`](./ux_and_validation_specifications.md#modal-form-validation-specification)

### Issue: Performance slow with 50+ relationships
**Solution**: See [`performance_optimization_guide.md`](./performance_optimization_guide.md) for memoization patterns

---

## Quick Reference Links

### Critical Patterns

- **Sortable Table ARIA**: [`accessibility_implementation_guide.md#sortable-table-accessibility`](./accessibility_implementation_guide.md#sortable-table-accessibility)
- **Modal Focus Trap**: [`accessibility_implementation_guide.md#modal-focus-management`](./accessibility_implementation_guide.md#modal-focus-management)
- **Editable Dropdown**: [`editable_dropdown_specification.md#aria-combobox-pattern`](./editable_dropdown_specification.md#aria-combobox-pattern)
- **Optimistic Updates**: [`performance_optimization_guide.md#react-query-cache-strategy`](./performance_optimization_guide.md#react-query-cache-strategy)
- **Delete with Undo**: [`delete_confirmation_undo_specification.md#delete-flow-overview`](./delete_confirmation_undo_specification.md#delete-flow-overview)
- **Empty States**: [`empty_states_specification.md#empty-state-designs`](./empty_states_specification.md#empty-state-designs)

### Code Examples

- **Component Structure**: All specs include complete TypeScript code examples
- **Test Examples**: See integration_test_scenarios.md for 15 complete test implementations
- **API Requests**: See special_relationships_api_spec.yaml for request/response examples

---

## Success Criteria

### Definition of Done

A cycle is complete when:
- [ ] All components implemented and under 500 lines
- [ ] All tests pass (unit + integration)
- [ ] jest-axe accessibility tests pass (zero violations)
- [ ] Code coverage ≥ 70%
- [ ] Manual keyboard navigation works
- [ ] NVDA screen reader testing complete
- [ ] Code review approved
- [ ] Deployed to staging environment

### Ready for Production

Feature is ready when:
- [ ] All 10 cycles complete
- [ ] All 40 UAT checklist items pass
- [ ] Kingston sign-off obtained
- [ ] Performance targets met (<200ms table render, <50ms status change)
- [ ] Zero accessibility violations
- [ ] Integration with existing Client Group Suite verified
- [ ] Feature flag configured for safe rollout

---

## Estimated Timeline

| Phase | Duration | Deliverables |
|-------|----------|--------------|
| **Week 0: Pre-Development** | 8-10 hours | API spec, architecture review, MSW setup |
| **Week 1: Foundation** | 20-25 hours | Cycles 1-5 + Backend API (parallel) |
| **Week 2: UI Components** | 15-20 hours | Cycles 6-8 (tables, modals, container) |
| **Week 3: Integration & UAT** | 10-15 hours | Cycles 9-10, UAT session, fixes |
| **TOTAL** | **45-50 hours** | Production-ready feature |

---

## Contact & Support

**Questions about this documentation?**
- Review main implementation plan first
- Check troubleshooting section above
- Refer to specific documentation for detailed guidance

**Found an issue in the specs?**
- Document it in GitHub issues
- Tag with "special-relationships" label
- Reference specific line numbers

---

## Revision History

| Date | Version | Changes |
|------|---------|---------|
| 2025-12-12 | 1.0 | Initial documentation created addressing all critical and medium priority issues |

---

**Remember**: These specs prevent 50-80 hours of rework. Take time to read the relevant documents before each cycle - it's an investment that pays off exponentially.

Happy coding! 🚀
