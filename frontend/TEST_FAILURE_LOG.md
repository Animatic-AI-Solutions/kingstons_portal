# Test Failure Tracking Log

## Baseline Summary (Task 0.1)
- **Date**: 2025-12-02
- **Total Tests**: 146
- **Passing**: 120 (82%)
- **Failing**: 26 (18%)
- **Coverage**: 4.97%

## Current Failures (from baseline)

### PrintService.test.ts - 2 failures

#### Test 1: "should initialize with default options"
- **Status**: FAILING
- **Error Type**: Assertion Mismatch
- **Error Message**:
  ```
  expect(received).toBe(expected) // Object.is equality
  Expected: "0.2in"
  Received: "1.2in"
  ```
- **Location**: Line 24
- **Root Cause**: Test assertion expects '0.2in' but actual PrintService returns '1.2in' for top margin
- **Fix Applied**: Not yet applied
- **Verification**: Not yet verified
- **Time Spent**: 0 minutes

#### Test 2: "should generate print styles with default options"
- **Status**: FAILING
- **Error Type**: Assertion Mismatch
- **Error Message**:
  ```
  expect(received).toContain(expected) // indexOf
  Expected substring: "margin: 0.2in 0.05in 0.2in 0.05in"
  Received string: "margin: 1.2in 0.05in 0.2in 0.05in"
  ```
- **Location**: Line 83
- **Root Cause**: Same as Test 1 - top margin is 1.2in not 0.2in
- **Fix Applied**: Not yet applied
- **Verification**: Not yet verified
- **Time Spent**: 0 minutes

---

### ClientDetails.test.tsx - 8-9 failures (exact count TBD)
- **Status**: FAILING
- **Error Type**: Missing Provider (QueryClientProvider)
- **Error Message**: Various errors related to missing QueryClient context
- **Root Cause**: Tests use `render()` without QueryClientProvider
- **Fix Applied**: Not yet applied
- **Verification**: Not yet verified
- **Time Spent**: 0 minutes

---

### useSmartNavigation.test.ts - 1 failure

#### Test: "should parse URL parameters correctly"
- **Status**: FAILING
- **Error Type**: Assertion Mismatch
- **Error Message**:
  ```
  expect(received).toEqual(expected) // deep equality
  - Expected: "Test%20Client"
  + Received: "Test Client"
  - Expected: null
  + Received: undefined
  ```
- **Location**: Line 34
- **Root Cause**: URL decoding difference and null vs undefined
- **Fix Applied**: Not yet applied
- **Verification**: Not yet verified
- **Time Spent**: 0 minutes

---

### Providers.test.tsx - Unknown count
- **Status**: FAILING
- **Error Type**: Module Not Found
- **Error Message**: `Cannot find module '../pages/Providers' from 'src/tests/Providers.test.tsx'`
- **Root Cause**: Test file references non-existent or incorrectly pathed module
- **Fix Applied**: Not yet applied
- **Verification**: Not yet verified
- **Time Spent**: 0 minutes

---

### Clients.test.tsx - Unknown count (estimated 8-10)
- **Status**: FAILING
- **Error Type**: Likely Missing Provider (similar to ClientDetails)
- **Root Cause**: TBD - needs analysis
- **Fix Applied**: Not yet applied
- **Verification**: Not yet verified
- **Time Spent**: 0 minutes

---

### Reporting.test.tsx - Unknown count (estimated 5-8)
- **Status**: FAILING
- **Error Type**: Multiple (waitFor timeout, missing data)
- **Error Message Example**:
  ```
  waitFor timeout waiting for: expect(screen.getByText('John Smith')).toBeInTheDocument()
  ```
- **Root Cause**: TBD - likely missing providers and mock data
- **Fix Applied**: Not yet applied
- **Verification**: Not yet verified
- **Time Spent**: 0 minutes

---

### MiniYearSelector.test.tsx - Status unknown
- **Status**: Unknown
- **Error Type**: TBD
- **Root Cause**: TBD - needs analysis
- **Fix Applied**: Not yet applied
- **Verification**: Not yet verified
- **Time Spent**: 0 minutes

---

## Format for New Failures

### [Test File Name] - [Test Description]
- **Status**: FAILING → IN PROGRESS → FIXED
- **Error Type**: [e.g., Missing Provider, Assertion Mismatch, Mock Issue]
- **Error Message**:
  ```
  [Paste exact error]
  ```
- **Root Cause**: [Brief explanation]
- **Fix Applied**: [Description of fix]
- **Verification**: [Command run to verify]
- **Time Spent**: [Minutes]

---

## Summary Statistics

### Phase 0 (Baseline)
- Tests analyzed: 146
- Known failures documented: 26
- Failure categories identified: 4 (Missing Provider, Assertion Mismatch, Module Not Found, Timeout)

### Phase 1 (testUtils Creation)
- Status: Not started

### Phase 2 (ClientDetails Fix)
- Status: DEFERRED - Complex mocking issues
- **Issue**: ClientDetails component uses useClientDetails hook which wraps React Query. Multiple mocking approaches attempted:
  1. Mocking API service directly - failed (module structure issues)
  2. Mocking useClientDetails hook - failed (mock not being applied)
- **Root Cause**: Jest module mocking with ES6 imports and React Query is complex. Component renders error state despite mocks.
- **Time Spent**: 90 minutes
- **Next Steps**: Defer to end of Phase 4. Try simpler components first to establish patterns that work.
- **Alternative Approach**: Consider integration testing or MSW (Mock Service Worker) for API mocking

### Phase 3 (PrintService Fix)
- Status: Not started

### Phase 4 (Component Tests Fix)
- Status: Not started

### Phase 5 (Hook Tests Fix)
- Status: Not started

### Phase 6 (Final Verification)
- Status: Not started
