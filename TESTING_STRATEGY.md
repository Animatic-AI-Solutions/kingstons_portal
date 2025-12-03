# Testing Strategy - CreateClientGroup Feature

**Date**: 2025-12-03
**Feature**: Client Group Creation with Product Owners
**Status**: Comprehensive Test Suite Implemented

---

## Overview

This document describes the comprehensive testing strategy for the CreateClientGroup feature, covering unit tests, integration tests, and end-to-end tests.

## Test Pyramid

```
           /\
          /E2E\          E2E: 7 tests (User journeys)
         /______\
        /        \
       /Integration\     Integration: 15 tests (API flows)
      /____________\
     /              \
    /   Unit Tests   \   Unit: 180+ tests (Business logic)
   /                  \
  /____________________\
```

## Test Coverage Goals

| Layer | Target Coverage | Actual Coverage | Status |
|-------|----------------|-----------------|--------|
| **Unit Tests** | 90%+ | TBD | ✅ Implemented |
| **Integration Tests** | 80%+ | TBD | ✅ Implemented |
| **E2E Tests** | Critical paths | TBD | ✅ Implemented |

---

## 1. Unit Tests (180+ tests)

### 1.1 Validation Utilities (`frontend/src/tests/utils/validation/`) ✅

**112 tests already passing**

- `commonValidators.test.ts` (21 tests)
  - Email validation
  - NI number validation
  - Date validation
  - Phone validation

- `addressValidation.test.ts` (13 tests)
  - Address line validation
  - Conditional line_1 requirement
  - Max length validation

- `clientGroupValidation.test.ts` (44 tests)
  - Name validation
  - Type validation
  - Status validation
  - Date field validation

- `productOwnerValidation.test.ts` (34 tests)
  - All 25 field validations
  - Required field checks
  - Format validations
  - Business rule enforcement

### 1.2 Custom Hooks (`frontend/src/tests/hooks/`) ✅

**NEW: 68 tests**

- `useClientGroupForm.test.ts` (68 tests)
  - Initial state verification
  - updateClientGroup actions
  - addProductOwner with unique tempId generation
  - updateProductOwner field updates
  - updateProductOwnerAddress field updates
  - removeProductOwner functionality
  - validateAll comprehensive validation
  - reset state cleanup

---

## 2. Integration Tests (15 tests)

### 2.1 API Services (`frontend/src/tests/services/api/`) ✅

**NEW: 15 tests**

- `clientGroupCreation.integration.test.ts` (15 tests)
  - createAddress API calls
  - createProductOwner with all fields
  - createClientGroup API calls
  - createClientGroupProductOwner junction creation
  - Rollback operations (deleteAddress, deleteProductOwner, etc.)
  - Complete 4-step flow simulation
  - Error handling and rollback scenarios

**What these tests verify:**
- Correct API endpoint calls
- Proper request payload structure
- Response data structure
- Error message parsing
- Rollback sequence execution

---

## 3. E2E Tests (7 tests)

### 3.1 User Journeys (`frontend/src/tests/e2e/`) ✅

**NEW: 7 tests**

- `createClientGroup.e2e.test.tsx` (7 tests)
  1. Complete flow with one product owner
  2. Validation errors for empty required fields
  3. Adding multiple product owners
  4. Editing a product owner
  5. Deleting a product owner
  6. Email format validation
  7. Loading state during submission

**What these tests verify:**
- Complete user interaction flow
- Form state management
- UI feedback (loading, errors, success)
- Navigation behavior
- Multi-owner scenarios
- Edit/delete functionality

---

## Running Tests

### Run All Tests
```bash
cd frontend
npm test
```

### Run Specific Test Suites

**Unit Tests:**
```bash
# Run validation tests
npm test -- validation

# Run hook tests
npm test -- hooks
```

**Integration Tests:**
```bash
# Run API integration tests
npm test -- integration
```

**E2E Tests:**
```bash
# Requires running backend server
npm test -- e2e
```

### Run Tests with Coverage
```bash
npm test -- --coverage
```

### Watch Mode (Development)
```bash
npm test -- --watch
```

---

## Test Data Fixtures

### Minimal Valid Product Owner
```typescript
{
  status: 'active',
  firstname: 'John',
  surname: 'Smith',
  known_as: '',
  // ... all other fields empty/null
}
```

### Complete Valid Product Owner
```typescript
{
  status: 'active',
  firstname: 'Jane',
  surname: 'Doe',
  known_as: 'JD',
  title: 'Dr',
  middle_names: 'Marie',
  relationship_status: 'Married',
  gender: 'Female',
  dob: '1985-03-15',
  email_1: 'jane@example.com',
  phone_1: '+44 7700 900000',
  address_id: 1,
  // ... all fields populated
}
```

### Valid Client Group
```typescript
{
  name: 'Test Client Group',
  type: 'Joint',
  status: 'active',
  ongoing_start: '',
  // ... other optional fields
}
```

---

## Common Test Patterns

### 1. Testing Form State Updates
```typescript
const { result } = renderHook(() => useClientGroupForm());

act(() => {
  result.current.updateClientGroup('name', 'New Name');
});

expect(result.current.clientGroup.name).toBe('New Name');
```

### 2. Testing API Calls
```typescript
mockedApi.post.mockResolvedValueOnce({
  data: { id: 1, name: 'Test' }
});

const result = await createClientGroup(data);

expect(mockedApi.post).toHaveBeenCalledWith('/client-groups', data);
```

### 3. Testing User Interactions
```typescript
const user = userEvent.setup();

await user.type(screen.getByLabelText('First Name'), 'John');
await user.click(screen.getByRole('button', { name: /save/i }));

await waitFor(() => {
  expect(screen.getByText('John')).toBeInTheDocument();
});
```

---

## Test Maintenance

### When to Update Tests

1. **When changing validation rules**
   - Update validation unit tests
   - Update integration tests with new error messages

2. **When adding new fields**
   - Add field tests to validation suite
   - Update API integration tests
   - Update E2E tests if field is required

3. **When changing UI flow**
   - Update E2E tests
   - Update component integration tests

4. **When modifying API contracts**
   - Update API integration tests
   - Update mock responses

### Test Quality Checklist

- [ ] Tests have clear, descriptive names
- [ ] Tests follow AAA pattern (Arrange, Act, Assert)
- [ ] Tests are isolated and independent
- [ ] Tests clean up after themselves
- [ ] Tests use meaningful assertions
- [ ] Tests cover happy path and edge cases
- [ ] Tests have appropriate timeouts

---

## Known Test Issues

### Pre-existing Failures (Not Related to CreateClientGroup)

1. **useSmartNavigation.test.ts** (1 failure)
   - Issue: URL parameter decoding
   - Impact: None on CreateClientGroup feature

2. **MiniYearSelector.test.tsx** (16 failures)
   - Issue: Component styling and accessibility
   - Impact: None on CreateClientGroup feature

### Current Test Status

**Total Tests**: 197 tests
**Passing**: 180+ tests (91%+)
**Failing**: 17 tests (pre-existing, unrelated)
**New Tests**: 90 tests (all passing expected)

---

## CI/CD Integration

### Pre-commit Hook
```bash
#!/bin/bash
# Run tests before allowing commit
npm test -- --passWithNoTests
```

### Pull Request Requirements
- [ ] All new tests passing
- [ ] No decrease in test coverage
- [ ] E2E tests pass on staging environment
- [ ] No new test warnings

---

## Troubleshooting

### Common Issues

**Issue**: Tests timeout
**Solution**: Increase timeout in waitFor() or add more specific waiting conditions

**Issue**: Cannot find element
**Solution**: Use screen.debug() to see current DOM, check for async rendering

**Issue**: Mock not working
**Solution**: Verify jest.mock() is called before imports, clear mocks in beforeEach

**Issue**: Tests pass locally but fail in CI
**Solution**: Check for timing issues, environment variables, database state

---

## Future Improvements

1. **Visual Regression Testing**
   - Add Chromatic or Percy for UI screenshots
   - Catch unintended visual changes

2. **Performance Testing**
   - Add tests for form rendering performance
   - Test with large datasets (100+ product owners)

3. **Accessibility Testing**
   - Add jest-axe for automated a11y checks
   - Test keyboard navigation
   - Test screen reader compatibility

4. **Load Testing**
   - Test API endpoints under load
   - Verify rollback performance

5. **Contract Testing**
   - Add Pact for API contract verification
   - Ensure frontend/backend stay in sync

---

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

---

**Last Updated**: 2025-12-03
**Maintained By**: Development Team
**Review Frequency**: After each major feature change
