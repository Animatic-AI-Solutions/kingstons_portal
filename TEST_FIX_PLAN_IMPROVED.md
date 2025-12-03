# IMPROVED COMPREHENSIVE TEST FIX PLAN FOR KINGSTON'S PORTAL

## Executive Summary

**Total Timeline:** 8-10 hours (with 2-hour buffer)
**Success Criteria:** 95%+ tests passing, testUtils verified, no regressions
**Escalation Limit:** 3 hours stuck on any single issue
**Rollback Strategy:** Git branching with verification checkpoints

---

## PHASE 0: PRE-IMPLEMENTATION VERIFICATION (60-90 minutes)

### Objective
Establish baseline, verify dependencies, review existing infrastructure, and set up safety nets before any code changes.

### Task 0.1: Establish Test Baseline (10 min)
```bash
# Capture current test status
cd C:\Users\jacob\Documents\kingstons_portal\frontend
npm test 2>&1 | tee test_baseline.txt

# Capture coverage baseline
npm test -- --coverage --no-cache 2>&1 | tee coverage_baseline.txt
```

**Acceptance Criteria:**
- Confirm exact number of passing/failing tests
- Document which test suites are failing
- Capture error messages for each failure
- Save baseline files for comparison

**Verification:**
- Open `test_baseline.txt` and confirm readability
- Count actual failures vs. claimed 26 failures
- Identify patterns in failures (missing providers, outdated assertions, etc.)

### Task 0.2: Verify Dependencies (10 min)
```bash
# Check installed versions
npm list @tanstack/react-query @testing-library/react @testing-library/jest-dom jest-environment-jsdom react react-dom

# Verify package.json dependencies match
cat package.json | grep -A 20 "devDependencies"
```

**Acceptance Criteria:**
- All required testing libraries present
- React Query version confirmed (expected: 5.75.1)
- No peer dependency warnings
- jest-environment-jsdom installed

**Decision Point:** If dependencies missing/mismatched, stop and install before proceeding.

### Task 0.3: Review setupTests.ts (20 min)

**Read and analyze:**
```bash
# View current global mocks
cat src/setupTests.ts
```

**Analysis Checklist:**
- [ ] Document all global mocks (lines 8-27 known)
- [ ] Identify AuthContext mock structure
- [ ] Identify react-router-dom mocks (useNavigate, useLocation, etc.)
- [ ] Check window.matchMedia mock
- [ ] Note any QueryClient configuration
- [ ] Check for global fetch mocks

**Create compatibility notes document:**
```
SETUPTEST_ANALYSIS.md:
- Global mocks present: [list]
- Potential conflicts with testUtils: [list]
- Required compatibility measures: [list]
```

**Acceptance Criteria:**
- Complete understanding of global mock structure
- Identified potential conflicts with planned testUtils
- Strategy defined for avoiding duplicate mocks

### Task 0.4: Create Smoke Test Suite Definition (15 min)

**Define 8-10 critical tests representing core functionality:**

```yaml
smoke_tests:
  utilities:
    - reportFormatters.test.ts (formatMoney, formatPercentage)
    - reportConstants.test.ts (IRR_HISTORY_COLUMNS)

  services:
    - ReportFormatter.test.ts (formatIRRHistory - 5 tests)

  components:
    - ClientDetails.test.tsx (renders without crashing)
    - Clients.test.tsx (renders list)

  hooks:
    - useSmartNavigation.test.ts (basic navigation)
```

**Smoke Test Command:**
```bash
# Run only smoke tests
npm test -- --testPathPattern="(reportFormatters|reportConstants|ReportFormatter)" --no-coverage
```

**Acceptance Criteria:**
- Smoke tests defined (8-10 tests)
- Command to run smoke tests documented
- Smoke tests should run in <30 seconds
- Baseline smoke test pass rate established

### Task 0.5: Set Up Git Safety Branch (5 min)

```bash
# Create dedicated feature branch
git checkout -b fix/comprehensive-test-infrastructure
git push -u origin fix/comprehensive-test-infrastructure

# Commit baseline documentation
git add test_baseline.txt coverage_baseline.txt SETUPTEST_ANALYSIS.md
git commit -m "docs: establish test baseline before infrastructure changes"
```

**Acceptance Criteria:**
- New branch created and pushed
- Baseline files committed
- Clean working directory

### Task 0.6: Create Test Failure Log Template (10 min)

**Create `TEST_FAILURE_LOG.md`:**
```markdown
# Test Failure Tracking Log

## Format for Each Failure

### [Test File Name] - [Test Description]
- **Status:** FAILING → IN PROGRESS → FIXED
- **Error Type:** [e.g., Missing Provider, Assertion Mismatch, Mock Issue]
- **Error Message:**
  ```
  [Paste exact error]
  ```
- **Root Cause:** [Brief explanation]
- **Fix Applied:** [Description of fix]
- **Verification:** [Command run to verify]
- **Time Spent:** [Minutes]

---

## Current Failures (from baseline)

[Populate from Task 0.1 baseline]
```

**Acceptance Criteria:**
- Template created
- Initial failures documented from baseline
- Template ready for tracking fixes

### Task 0.7: Define Escalation Procedure (5 min)

**Create `ESCALATION_PROCEDURE.md`:**
```markdown
# Test Fix Escalation Procedure

## Time Limits
- **Single Test Investigation:** 30 minutes maximum
- **Single Task/Phase Stuck:** 90 minutes maximum
- **Total Blocked Time:** 3 hours cumulative

## When to Escalate
1. Test failure root cause unclear after 30 min investigation
2. TypeScript compilation errors preventing test execution
3. Circular dependency errors in testUtils
4. More than 5 new test failures introduced by testUtils
5. Performance degradation (tests taking >5 min to run)

## Escalation Actions
1. **Document current state:**
   - What was attempted
   - Error messages (full stack traces)
   - Files modified
   - Git diff output

2. **Revert to last known good state:**
   ```bash
   git stash
   npm test -- --testPathPattern="smoke_tests"
   ```

3. **Contact:** [Project maintainer/team lead]
   - Provide: TEST_FAILURE_LOG.md + git diff
   - Include: Exact error messages + reproduction steps

4. **Decision Points:**
   - 1 hour stuck → Review approach, consider alternative
   - 2 hours stuck → Revert changes, seek help
   - 3 hours stuck → STOP, escalate, and wait for guidance
```

**Acceptance Criteria:**
- Clear time limits defined
- Escalation triggers documented
- Revert procedures ready
- Contact information specified (if available)

### Task 0.8: Phase 0 Verification Checkpoint (5 min)

**Checklist:**
- [ ] Test baseline established (test_baseline.txt exists)
- [ ] Dependencies verified (all present)
- [ ] setupTests.ts analyzed (SETUPTEST_ANALYSIS.md exists)
- [ ] Smoke tests defined and baseline run
- [ ] Git branch created and baseline committed
- [ ] Test failure log template created
- [ ] Escalation procedure documented
- [ ] All Phase 0 files committed to git

**Verification Command:**
```bash
# Confirm smoke tests still pass
npm test -- --testPathPattern="(reportFormatters|reportConstants)" --no-coverage

# Verify git status clean except for new docs
git status
```

**Decision Point:** Do not proceed to Phase 1 until all Phase 0 checkboxes are complete.

---

## PHASE 1: CREATE TESTUTILS INFRASTRUCTURE (90-120 minutes)

### Objective
Create robust, tested testUtils with proper provider nesting, QueryClient configuration, and compatibility with existing setupTests.ts.

### Task 1.1: Design testUtils Architecture (20 min)

**Create `TESTUTILS_DESIGN.md`:**
```markdown
# testUtils Architecture Design

## Provider Nesting Order (CRITICAL)
1. QueryClientProvider (outermost)
2. MemoryRouter (react-router-dom)
3. AuthContext.Provider (innermost)

## QueryClient Configuration
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,        // No retries in tests
      gcTime: 0,           // Immediate garbage collection
      staleTime: 0,        // Always fetch fresh
    },
    mutations: {
      retry: false,
    },
  },
  logger: {
    log: console.log,
    warn: console.warn,
    error: () => {}, // Suppress error logs in tests
  },
});
```

## Compatibility with setupTests.ts
- **Reuse global AuthContext mock** from setupTests.ts (lines 8-20)
- **Reuse global react-router-dom mocks** (navigate, location)
- **Add cleanup** for QueryClient cache after each test

## API Design
```typescript
// Primary function
renderWithProviders(
  ui: React.ReactElement,
  options?: {
    authContextValue?: Partial<AuthContextType>,
    initialRoute?: string,
    queryClient?: QueryClient,
  }
): RenderResult & { queryClient: QueryClient }

// Cleanup function
cleanupQueryClient(client: QueryClient): void
```
```

**Acceptance Criteria:**
- Provider nesting order specified
- QueryClient config defined with rationale
- Compatibility strategy with setupTests.ts documented
- API surface designed

### Task 1.2: Implement testUtils.tsx (30 min)

**Create `src/tests/utils/testUtils.tsx`:**
```typescript
import React from 'react';
import { render, RenderOptions, RenderResult } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

/**
 * Creates a QueryClient configured for testing
 *
 * Configuration rationale:
 * - retry: false - Tests should fail fast, no retry logic
 * - gcTime: 0 - Immediate cleanup, no cache persistence between tests
 * - staleTime: 0 - Always treat data as stale, no implicit caching
 * - Suppressed error logger - Avoid console noise from expected errors
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
    logger: {
      log: console.log,
      warn: console.warn,
      error: () => {}, // Suppress expected errors
    },
  });
}

/**
 * Cleans up QueryClient cache and removes all queries/mutations
 *
 * Usage: Call in afterEach() to prevent test pollution
 */
export function cleanupQueryClient(client: QueryClient): void {
  client.clear();
  client.getQueryCache().clear();
  client.getMutationCache().clear();
}

interface TestProvidersProps {
  children: React.ReactNode;
  queryClient: QueryClient;
  initialRoute?: string;
}

/**
 * AllTheProviders wrapper with correct nesting order
 *
 * Nesting: QueryClientProvider > MemoryRouter
 * Rationale: Query provider needs to wrap router for route-based queries
 */
function AllTheProviders({
  children,
  queryClient,
  initialRoute = '/',
}: TestProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialRoute]}>
        {children}
      </MemoryRouter>
    </QueryClientProvider>
  );
}

export interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  initialRoute?: string;
  queryClient?: QueryClient;
}

export interface RenderWithProvidersResult extends RenderResult {
  queryClient: QueryClient;
}

/**
 * Custom render function with all required providers
 *
 * Usage:
 * ```typescript
 * const { getByText, queryClient } = renderWithProviders(<MyComponent />);
 * await waitFor(() => expect(queryClient.isFetching()).toBe(0));
 * ```
 *
 * @param ui - Component to render
 * @param options - Optional route and queryClient overrides
 * @returns Render result + queryClient for assertions
 */
export function renderWithProviders(
  ui: React.ReactElement,
  {
    initialRoute = '/',
    queryClient: providedQueryClient,
    ...renderOptions
  }: RenderWithProvidersOptions = {}
): RenderWithProvidersResult {
  // Create new QueryClient if not provided (isolated per test)
  const queryClient = providedQueryClient ?? createTestQueryClient();

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <AllTheProviders
      queryClient={queryClient}
      initialRoute={initialRoute}
    >
      {children}
    </AllTheProviders>
  );

  const renderResult = render(ui, { wrapper: Wrapper, ...renderOptions });

  return {
    ...renderResult,
    queryClient,
  };
}

/**
 * Helper to wait for all React Query operations to complete
 *
 * Usage:
 * ```typescript
 * await waitForQueryClient(queryClient);
 * expect(screen.getByText('Loaded data')).toBeInTheDocument();
 * ```
 */
export async function waitForQueryClient(client: QueryClient): Promise<void> {
  const { waitFor } = await import('@testing-library/react');
  await waitFor(() => expect(client.isFetching()).toBe(0));
}

// Re-export testing library utilities for convenience
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
```

**Acceptance Criteria:**
- All functions implemented with JSDoc comments
- QueryClient configuration matches design
- Provider nesting order correct
- Compatible with setupTests.ts mocks
- TypeScript compiles without errors

### Task 1.3: Create testUtils.test.tsx (Isolation Test) (30 min)

**Create `src/tests/utils/testUtils.test.tsx`:**
```typescript
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import {
  renderWithProviders,
  createTestQueryClient,
  cleanupQueryClient,
  waitForQueryClient,
  screen,
} from './testUtils';

describe('testUtils', () => {
  describe('createTestQueryClient', () => {
    it('creates QueryClient with retry disabled', () => {
      const client = createTestQueryClient();
      expect(client.getDefaultOptions().queries?.retry).toBe(false);
    });

    it('creates QueryClient with zero gcTime', () => {
      const client = createTestQueryClient();
      expect(client.getDefaultOptions().queries?.gcTime).toBe(0);
    });

    it('creates QueryClient with zero staleTime', () => {
      const client = createTestQueryClient();
      expect(client.getDefaultOptions().queries?.staleTime).toBe(0);
    });
  });

  describe('cleanupQueryClient', () => {
    it('clears all queries from cache', () => {
      const client = createTestQueryClient();
      client.setQueryData(['test'], { data: 'value' });
      expect(client.getQueryCache().getAll()).toHaveLength(1);

      cleanupQueryClient(client);
      expect(client.getQueryCache().getAll()).toHaveLength(0);
    });
  });

  describe('renderWithProviders', () => {
    it('renders component with default providers', () => {
      const TestComponent = () => <div>Test Content</div>;
      renderWithProviders(<TestComponent />);
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('provides QueryClient to components', async () => {
      const TestComponent = () => {
        const { data } = useQuery({
          queryKey: ['test'],
          queryFn: async () => 'query-data',
        });
        return <div>{data || 'loading'}</div>;
      };

      const { queryClient } = renderWithProviders(<TestComponent />);
      await waitForQueryClient(queryClient);
      expect(screen.getByText('query-data')).toBeInTheDocument();
    });

    it('provides MemoryRouter with default route', () => {
      const TestComponent = () => {
        const location = useLocation();
        return <span>{location.pathname}</span>;
      };

      renderWithProviders(<TestComponent />);
      expect(screen.getByText('/')).toBeInTheDocument();
    });

    it('allows custom initial route', () => {
      const TestComponent = () => {
        const location = useLocation();
        return <span>{location.pathname}</span>;
      };

      renderWithProviders(<TestComponent />, {
        initialRoute: '/clients/123',
      });

      expect(screen.getByText('/clients/123')).toBeInTheDocument();
    });

    it('returns queryClient for test assertions', () => {
      const TestComponent = () => <div>Test</div>;
      const { queryClient } = renderWithProviders(<TestComponent />);
      expect(queryClient).toBeDefined();
      expect(queryClient.isFetching()).toBe(0);
    });
  });

  describe('waitForQueryClient', () => {
    it('waits for all fetches to complete', async () => {
      const TestComponent = () => {
        const { data, isLoading } = useQuery({
          queryKey: ['async'],
          queryFn: async () => {
            await new Promise(resolve => setTimeout(resolve, 50));
            return 'async-data';
          },
        });
        return <div>{isLoading ? 'loading' : data}</div>;
      };

      const { queryClient } = renderWithProviders(<TestComponent />);
      expect(screen.getByText('loading')).toBeInTheDocument();

      await waitForQueryClient(queryClient);
      expect(screen.getByText('async-data')).toBeInTheDocument();
    });
  });
});
```

**Acceptance Criteria:**
- All 10+ tests pass independently
- Tests verify provider nesting order
- Tests verify QueryClient configuration
- Tests verify Router integration
- No console errors or warnings

### Task 1.4: Run testUtils Tests in Isolation (10 min)

```bash
# Run ONLY testUtils tests
npm test -- testUtils.test.tsx --no-coverage --verbose

# Verify no failures
echo $?  # Should be 0
```

**Acceptance Criteria:**
- All testUtils tests pass (10+/10+)
- No TypeScript errors
- No console warnings
- Test execution time <10 seconds

**Decision Point:** If testUtils tests fail, STOP. Debug before proceeding. Do not apply testUtils to other tests until these pass.

### Task 1.5: Phase 1 Verification Checkpoint (10 min)

**Checklist:**
- [ ] TESTUTILS_DESIGN.md created and reviewed
- [ ] testUtils.tsx implemented with all functions
- [ ] testUtils.test.tsx created with 10+ tests
- [ ] All testUtils tests passing (run twice to confirm)
- [ ] TypeScript compilation successful
- [ ] No console errors or warnings

**Smoke Test:**
```bash
# Confirm original smoke tests still pass
npm test -- --testPathPattern="(reportFormatters|reportConstants)" --no-coverage
```

**Verification Command:**
```bash
# Run testUtils tests again
npm test -- testUtils.test.tsx --no-coverage

# Check for any new TypeScript errors
npx tsc --noEmit
```

**Git Checkpoint:**
```bash
git add src/tests/utils/testUtils.tsx src/tests/utils/testUtils.test.tsx TESTUTILS_DESIGN.md
git commit -m "feat(tests): add comprehensive testUtils with provider nesting

- QueryClient configured with retry: false, gcTime: 0
- Provider nesting: QueryClientProvider > MemoryRouter
- Compatible with setupTests.ts global mocks
- 10+ isolation tests verifying all functionality
- Includes cleanup utilities and waitFor helpers"
```

**Decision Point:** Do not proceed to Phase 2 until:
1. All testUtils tests pass
2. Smoke tests still pass
3. Changes committed to git

---

## PHASE 2: FIX CLIENT DETAILS TESTS (60-90 minutes)

### Objective
Apply testUtils to ClientDetails.test.tsx, fix all 8-9 failing tests, verify no regressions.

### Task 2.1: Analyze ClientDetails.test.tsx Current State (15 min)

**Read test file:**
```bash
cat src/tests/ClientDetails.test.tsx
```

**Analysis Checklist:**
- [ ] Count total tests (expected: 8-9)
- [ ] Identify local mocks (lines 6-86 known)
- [ ] Check for duplicate mocks vs setupTests.ts
- [ ] Identify missing QueryClientProvider errors
- [ ] Document expected data structures
- [ ] Note any hardcoded IDs or dates

**Create fix plan in TEST_FAILURE_LOG.md:**
```markdown
## ClientDetails.test.tsx Fix Plan

### Current State
- Total tests: [X]
- Failing tests: [Y]
- Error pattern: Missing QueryClientProvider

### Fixes Required
1. Replace render() with renderWithProviders()
2. Remove duplicate mocks (AuthContext, react-router-dom)
3. Add mock API responses using queryClient.setQueryData()
4. Add waitFor() for async rendering
5. Update assertions for actual DOM structure

### Files to Modify
- src/tests/ClientDetails.test.tsx

### Expected Outcome
- All ClientDetails tests passing
- Test execution time <5 seconds
- No console warnings
```

### Task 2.2: Refactor ClientDetails.test.tsx to Use testUtils (30 min)

**Key Changes:**
1. **Replace imports:**
```typescript
// OLD
import { render, screen, waitFor } from '@testing-library/react';

// NEW
import { renderWithProviders, screen, waitFor } from '../utils/testUtils';
```

2. **Remove duplicate mocks (lines 6-86):**
   - Remove local AuthContext mock (already in setupTests.ts)
   - Remove local react-router-dom mocks (already in setupTests.ts)
   - Keep only component-specific mocks (API responses, etc.)

3. **Replace render() calls:**
```typescript
// OLD
render(<ClientDetails />);

// NEW
const { queryClient } = renderWithProviders(<ClientDetails />, {
  initialRoute: '/clients/1',
});
```

4. **Add waitFor for async operations:**
```typescript
// After rendering
await waitFor(() => {
  expect(screen.getByText('John Smith')).toBeInTheDocument();
});
```

**Acceptance Criteria:**
- All render() replaced with renderWithProviders()
- Duplicate mocks removed (50-80 lines removed)
- waitFor() added for async assertions
- TypeScript compiles without errors

### Task 2.3: Run ClientDetails Tests Individually (20 min)

```bash
# Run ClientDetails tests with verbose output
npm test -- ClientDetails.test.tsx --no-coverage --verbose 2>&1 | tee clientdetails_test_run.txt

# Check exit code
echo $?
```

**Debug Checklist (if failures):**
- [ ] Check error messages in clientdetails_test_run.txt
- [ ] Verify mock data structure matches expectations
- [ ] Check for missing waitFor() on async operations
- [ ] Verify initialRoute matches component expectations
- [ ] Check for hardcoded IDs in component vs test

**Update TEST_FAILURE_LOG.md** with results for each test.

**Time Limit:** 30 minutes debugging. If stuck, escalate per ESCALATION_PROCEDURE.md.

### Task 2.4: Fix Individual Test Failures (20 min)

**For each failing test:**
1. Read error message carefully
2. Identify root cause (missing data, wrong assertion, timing issue)
3. Apply minimal fix
4. Re-run test individually
5. Document fix in TEST_FAILURE_LOG.md

**Common Fixes:**
- Add waitFor: `await waitFor(() => expect(...).toBeInTheDocument())`
- Update assertions: Check actual DOM structure vs expected
- Add cleanup: `cleanupQueryClient(queryClient)` in afterEach

**Acceptance Criteria:**
- All ClientDetails tests passing
- No console errors
- Test execution time <5 seconds

### Task 2.5: Phase 2 Verification Checkpoint (5 min)

**Checklist:**
- [ ] All ClientDetails tests passing (run 3 times to confirm stability)
- [ ] Smoke tests still passing
- [ ] No new console errors or warnings
- [ ] Test execution time acceptable (<5 sec for ClientDetails)

**Verification Commands:**
```bash
# Run ClientDetails tests 3 times
npm test -- ClientDetails.test.tsx --no-coverage
npm test -- ClientDetails.test.tsx --no-coverage
npm test -- ClientDetails.test.tsx --no-coverage

# Run smoke tests
npm test -- --testPathPattern="(reportFormatters|reportConstants)" --no-coverage

# Full test suite count
npm test -- --passWithNoTests 2>&1 | grep "Tests:"
```

**Git Checkpoint:**
```bash
git add src/tests/ClientDetails.test.tsx TEST_FAILURE_LOG.md
git commit -m "fix(tests): refactor ClientDetails tests to use testUtils

- Replaced render() with renderWithProviders()
- Removed 50+ lines of duplicate mocks
- Added waitFor() for async operations
- All 8-9 ClientDetails tests now passing"
```

**Decision Point:** If ClientDetails tests still failing after 90 minutes, STOP and escalate.

---

## PHASE 3: FIX PRINTSERVICE TESTS (30-45 minutes)

### Objective
Fix PrintService.test.ts assertion mismatches (known: line 24 expects '0.2in' but actual is '1.2in').

### Task 3.1: Analyze PrintService.test.ts (10 min)

**Read test file:**
```bash
cat src/tests/services/report/PrintService.test.ts
```

**Analysis:**
- [ ] Identify all assertion mismatches
- [ ] Check if assertions need updating OR code needs fixing
- [ ] Verify expected values are correct business requirements
- [ ] Note any dependencies on other services

**Decision Point:** Are the test assertions wrong, or is the code wrong?
- If tests wrong → Update assertions
- If code wrong → Fix PrintService implementation

### Task 3.2: Fix Assertion Mismatches (15 min)

**For line 24 (and similar):**
```typescript
// OLD (failing)
expect(options.margins?.top).toBe('0.2in');

// NEW (if 1.2in is correct)
expect(options.margins?.top).toBe('1.2in');
```

**Verification:**
- Check PrintService implementation for actual margin values
- Verify against business requirements (if available)
- Ensure consistency across all margin-related tests

**Acceptance Criteria:**
- All assertions match actual PrintService behavior
- No changes to PrintService implementation (unless code bug found)
- All PrintService tests passing

### Task 3.3: Run PrintService Tests (5 min)

```bash
npm test -- PrintService.test.ts --no-coverage --verbose
```

**Acceptance Criteria:**
- All PrintService tests passing (expected: 33 tests)
- No console errors
- Test execution time <3 seconds

### Task 3.4: Phase 3 Verification Checkpoint (5 min)

**Checklist:**
- [ ] PrintService tests passing (run twice)
- [ ] ClientDetails tests still passing
- [ ] Smoke tests still passing
- [ ] No new failures introduced

**Git Checkpoint:**
```bash
git add src/tests/services/report/PrintService.test.ts TEST_FAILURE_LOG.md
git commit -m "fix(tests): update PrintService assertions to match actual values

- Fixed line 24: updated expected margin from '0.2in' to '1.2in'
- Verified assertions match PrintService implementation
- All PrintService tests now passing"
```

---

## PHASE 4: FIX REMAINING COMPONENT TESTS (90-120 minutes)

### Objective
Apply testUtils to Clients.test.tsx, Providers.test.tsx, Reporting.test.tsx, and MiniYearSelector.test.tsx.

### Task 4.1: Prioritize Remaining Tests (10 min)

**Priority Order:**
1. **Clients.test.tsx** (high-value, likely similar to ClientDetails)
2. **MiniYearSelector.test.tsx** (smaller component, quick win)
3. **Providers.test.tsx** (medium complexity)
4. **Reporting.test.tsx** (potentially complex, highest risk)

**Time Allocation:**
- Clients: 30 min
- MiniYearSelector: 20 min
- Providers: 30 min
- Reporting: 30 min

### Task 4.2: Fix Clients.test.tsx (30 min)

**Apply same pattern as ClientDetails:**
1. Analyze current state (5 min)
2. Replace render with renderWithProviders (10 min)
3. Add mock data (10 min)
4. Run and fix individual failures (10 min)

**Verification:**
```bash
npm test -- Clients.test.tsx --no-coverage --verbose
```

**Git Checkpoint after passing:**
```bash
git add src/tests/Clients.test.tsx TEST_FAILURE_LOG.md
git commit -m "fix(tests): refactor Clients tests to use testUtils"
```

### Task 4.3: Fix MiniYearSelector.test.tsx (20 min)

**Likely simpler (no API dependencies):**
1. Analyze (5 min)
2. Apply testUtils if needed (10 min)
3. Fix any assertion issues (5 min)

**Verification:**
```bash
npm test -- MiniYearSelector.test.tsx --no-coverage --verbose
```

**Git Checkpoint after passing.**

### Task 4.4: Fix Providers.test.tsx (30 min)

**Similar to Clients pattern:**
1. Analyze (5 min)
2. Apply testUtils (10 min)
3. Mock provider data (10 min)
4. Fix failures (5 min)

**Verification + Git Checkpoint.**

### Task 4.5: Fix Reporting.test.tsx (30 min)

**Potentially most complex:**
1. Analyze (10 min)
2. Apply testUtils (10 min)
3. Mock report data structures (10 min)
4. Fix failures (10 min)

**Decision Point:** If Reporting.test.tsx requires >45 min, defer to Phase 5 for deeper investigation.

**Verification + Git Checkpoint.**

### Task 4.6: Phase 4 Verification Checkpoint (10 min)

**Checklist:**
- [ ] All component tests passing:
  - [ ] Clients.test.tsx
  - [ ] MiniYearSelector.test.tsx
  - [ ] Providers.test.tsx
  - [ ] Reporting.test.tsx
- [ ] All previous tests still passing (smoke, ClientDetails, PrintService)
- [ ] No new failures introduced
- [ ] All fixes documented in TEST_FAILURE_LOG.md

**Full Test Run:**
```bash
npm test -- --no-coverage 2>&1 | tee phase4_complete.txt
```

**Count passing tests:**
```bash
grep "Tests:" phase4_complete.txt
# Should be significantly higher than baseline (target: 90%+)
```

**Git Checkpoint:**
```bash
git add TEST_FAILURE_LOG.md
git commit -m "docs: update test failure log after Phase 4 completion"
```

---

## PHASE 5: FIX HOOK TESTS (30-45 minutes)

### Objective
Fix useSmartNavigation.test.ts using React Testing Library hook testing patterns.

### Task 5.1: Analyze useSmartNavigation.test.ts (10 min)

**Read test file:**
```bash
cat src/tests/hooks/useSmartNavigation.test.ts
```

**Analysis:**
- [ ] Check if using @testing-library/react-hooks (deprecated in React 18)
- [ ] Identify dependencies (AuthContext, Router, etc.)
- [ ] Note any async operations

**Common Issue:** Deprecated `renderHook` from react-hooks library.

### Task 5.2: Update Hook Testing Approach (20 min)

**Modern React 18 pattern:**
```typescript
import { renderHook } from '@testing-library/react'; // NEW location
import { renderWithProviders } from '../utils/testUtils';

describe('useSmartNavigation', () => {
  it('returns navigation helpers', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => {
      const { container } = renderWithProviders(<div>{children}</div>);
      return container;
    };

    const { result } = renderHook(() => useSmartNavigation(), { wrapper });
    expect(result.current).toBeDefined();
  });
});
```

**OR use wrapper component:**
```typescript
function TestComponent() {
  const navigation = useSmartNavigation();
  return <div data-testid="nav">{JSON.stringify(navigation)}</div>;
}

it('provides navigation context', () => {
  renderWithProviders(<TestComponent />);
  expect(screen.getByTestId('nav')).toBeInTheDocument();
});
```

**Acceptance Criteria:**
- No deprecated library usage
- Hook tested with proper providers
- All assertions passing

### Task 5.3: Run Hook Tests (5 min)

```bash
npm test -- useSmartNavigation.test.ts --no-coverage --verbose
```

**Verification + Git Checkpoint.**

### Task 5.4: Phase 5 Verification Checkpoint (5 min)

**Full test suite run:**
```bash
npm test -- --no-coverage 2>&1 | tee phase5_complete.txt
```

**Target:** 95%+ tests passing (139+/146).

---

## PHASE 6: COMPREHENSIVE VERIFICATION (30-45 minutes)

### Objective
Run full test suite, verify coverage, confirm no regressions, validate all acceptance criteria met.

### Task 6.1: Full Test Suite Run (10 min)

```bash
# Full run with coverage
npm test -- --coverage --no-cache 2>&1 | tee final_test_run.txt

# Save coverage report
cp -r coverage/ coverage_final/
```

**Metrics to capture:**
- Total tests: X/146
- Pass rate: X%
- Coverage: X% (goal: 70%+)
- Test execution time: X seconds

### Task 6.2: Compare Baseline vs Final (15 min)

**Create comparison report:**
```bash
# Compare test counts
diff test_baseline.txt final_test_run.txt > test_comparison.txt

# Analyze differences
cat test_comparison.txt
```

**Comparison Checklist:**
- [ ] Tests passing: [baseline] → [final] (target: +20%)
- [ ] Coverage: 4.97% → [final] (target: 70%+)
- [ ] No new failures introduced
- [ ] All originally passing tests still pass

**Document in TEST_FAILURE_LOG.md:**
```markdown
## Final Results

### Baseline (Phase 0)
- Tests: 120/146 passing (82%)
- Coverage: 4.97%
- Known failures: 26

### Final (Phase 6)
- Tests: [X]/146 passing ([Y]%)
- Coverage: [Z]%
- Remaining failures: [N]

### Improvements
- Tests fixed: [X - 120]
- Coverage gained: [Z - 4.97]%
- Success rate: +[Y - 82]%
```

### Task 6.3: Run Smoke Tests 5 Times (10 min)

**Verify stability:**
```bash
for i in {1..5}; do
  echo "Smoke test run $i/5"
  npm test -- --testPathPattern="(reportFormatters|reportConstants)" --no-coverage
done
```

**Acceptance Criteria:**
- All 5 runs pass with identical results
- No flaky tests
- No intermittent failures

### Task 6.4: Validate All Phase Checkpoints (5 min)

**Review checklist:**
- [ ] Phase 0: Baseline established
- [ ] Phase 1: testUtils created and tested
- [ ] Phase 2: ClientDetails fixed
- [ ] Phase 3: PrintService fixed
- [ ] Phase 4: Component tests fixed
- [ ] Phase 5: Hook tests fixed
- [ ] All git commits made
- [ ] All documentation updated

### Task 6.5: Phase 6 Final Git Checkpoint (5 min)

```bash
# Commit final documentation
git add TEST_FAILURE_LOG.md final_test_run.txt test_comparison.txt
git commit -m "docs: final test suite verification results

- Tests passing: [X]/146 ([Y]%)
- Coverage: [Z]%
- All critical tests fixed and verified stable
- Comprehensive comparison vs baseline documented"

# Push feature branch
git push origin fix/comprehensive-test-infrastructure
```

---

## PHASE 7: DOCUMENTATION & CLEANUP (30-45 minutes)

### Objective
Create comprehensive documentation for testUtils, clean up temporary files, prepare for PR.

### Task 7.1: Create testUtils API Documentation (20 min)

**Create `src/tests/utils/README.md`:**
```markdown
# Test Utilities Documentation

## Overview
Comprehensive test utilities for Kingston's Portal providing QueryClient and Router context to all component tests.

## Quick Start

```typescript
import { renderWithProviders, screen, waitFor } from '@/tests/utils/testUtils';

describe('MyComponent', () => {
  it('renders with data', async () => {
    const { queryClient } = renderWithProviders(<MyComponent />);

    await waitFor(() => {
      expect(screen.getByText('test')).toBeInTheDocument();
    });
  });
});
```

## API Reference

### `renderWithProviders(ui, options)`
Custom render function with all required providers.

**Parameters:**
- `ui` (ReactElement): Component to render
- `options` (RenderWithProvidersOptions):
  - `initialRoute` (string): Initial URL for MemoryRouter (default: '/')
  - `queryClient` (QueryClient): Custom QueryClient instance (default: creates new)
  - ...other RenderOptions from @testing-library/react

**Returns:** RenderResult & { queryClient: QueryClient }

**Example:**
```typescript
const { getByText, queryClient } = renderWithProviders(<MyComponent />, {
  initialRoute: '/clients/123',
});
```

### `createTestQueryClient()`
Creates a QueryClient configured for testing.

**Configuration:**
- `retry: false` - No retries, fail fast
- `gcTime: 0` - Immediate garbage collection
- `staleTime: 0` - Always fetch fresh
- Suppressed error logger

**Example:**
```typescript
const queryClient = createTestQueryClient();
queryClient.setQueryData(['key'], { data: 'value' });
```

### `cleanupQueryClient(client)`
Clears all queries and mutations from QueryClient cache.

**Usage:** Call in `afterEach()` to prevent test pollution.

```typescript
afterEach(() => {
  cleanupQueryClient(queryClient);
});
```

### `waitForQueryClient(client)`
Waits for all React Query operations to complete.

**Example:**
```typescript
await waitForQueryClient(queryClient);
expect(screen.getByText('Loaded')).toBeInTheDocument();
```

## Provider Nesting Order

**Critical:** Providers are nested in this order:
1. QueryClientProvider (outermost)
2. MemoryRouter (innermost)

**Rationale:**
- Query provider wraps router for route-based queries

## Common Patterns

### Testing Components with API Data
```typescript
it('displays client data', async () => {
  const { queryClient } = renderWithProviders(<ClientDetails />);

  queryClient.setQueryData(['client', '1'], {
    id: 1,
    name: 'Test Client',
  });

  await waitFor(() => {
    expect(screen.getByText('Test Client')).toBeInTheDocument();
  });
});
```

### Testing Components with Routes
```typescript
it('displays client ID from URL', () => {
  renderWithProviders(<ClientDetails />, {
    initialRoute: '/clients/456',
  });

  expect(screen.getByText(/Client 456/i)).toBeInTheDocument();
});
```

### Testing Hooks
```typescript
function TestComponent() {
  const { data } = useMyHook();
  return <div>{data}</div>;
}

it('hook returns data', () => {
  renderWithProviders(<TestComponent />);
  expect(screen.getByText('expected data')).toBeInTheDocument();
});
```

## Cleanup Best Practices

Always clean up QueryClient between tests:

```typescript
describe('MyComponent', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
  });

  afterEach(() => {
    cleanupQueryClient(queryClient);
  });

  it('test case', () => {
    renderWithProviders(<MyComponent />, { queryClient });
    // ...
  });
});
```

## Troubleshooting

### "QueryClient not provided" error
- Ensure using `renderWithProviders()` not `render()`

### Tests passing individually but failing in suite
- Add `cleanupQueryClient()` in `afterEach()`
- Check for shared QueryClient instances

### Async data not appearing
- Use `waitFor()` or `waitForQueryClient()`
- Verify mock data set before render

## Compatibility with setupTests.ts

testUtils is compatible with existing global mocks in setupTests.ts:
- react-router-dom mocks preserved
- window.matchMedia mock preserved

No changes to setupTests.ts required.
```

### Task 7.2: Clean Up Temporary Files (5 min)

**Remove investigation files:**
```bash
# Keep essential documentation
rm test_baseline.txt coverage_baseline.txt
rm phase4_complete.txt phase5_complete.txt
rm clientdetails_test_run.txt

# Keep for PR:
# - final_test_run.txt
# - test_comparison.txt
# - TEST_FAILURE_LOG.md
# - TESTUTILS_DESIGN.md
# - SETUPTEST_ANALYSIS.md
# - ESCALATION_PROCEDURE.md
```

### Task 7.3: Phase 7 Final Checkpoint (5 min)

**Checklist:**
- [ ] src/tests/utils/README.md created (testUtils API docs)
- [ ] Temporary files cleaned up
- [ ] All documentation reviewed for accuracy

**Final Git Commit:**
```bash
git add src/tests/utils/README.md
git commit -m "docs: add comprehensive testUtils documentation

- Complete API reference for testUtils
- Common patterns and troubleshooting guide
- Ready for team adoption"

git push origin fix/comprehensive-test-infrastructure
```

---

## ROLLBACK PROCEDURES

### If testUtils Breaks Existing Tests

**Immediate Actions:**
```bash
# Stash all changes
git stash

# Verify baseline tests pass
npm test -- --testPathPattern="(reportFormatters|reportConstants)" --no-coverage

# If baseline passes, inspect stashed changes
git stash show -p

# Identify problematic changes
# Fix issues in isolation
# Reapply selectively
```

### If Stuck on Single Test for >30 Minutes

**Decision Tree:**
1. **Document current state** in TEST_FAILURE_LOG.md
2. **Move to next test** (come back later with fresh perspective)
3. **If >3 tests stuck** → ESCALATE per ESCALATION_PROCEDURE.md

### If Timeline Exceeds 10 Hours

**Partial Success Strategy:**
1. **Merge what works** (e.g., if testUtils + ClientDetails + PrintService fixed)
2. **Document remaining issues** in TEST_FAILURE_LOG.md
3. **Create follow-up tickets** for deferred tests
4. **Define MVP:** 90%+ passing (131+/146) is acceptable interim success

---

## SMOKE TEST DEFINITION

### Critical Tests (Run After Each Phase)
```bash
npm test -- --testPathPattern="(reportFormatters|reportConstants|ReportFormatter)" --no-coverage
```

**Expected:**
- reportFormatters.test.ts: 26/26 passing
- reportConstants.test.ts: 13/13 passing
- ReportFormatter.test.ts: 15/15 passing
- **Total: 54/54 passing**
- **Execution time: <30 seconds**

---

## SUCCESS METRICS

### Minimum Viable Success (90%)
- Tests passing: 131+/146 (90%+)
- Coverage: 60%+ (approaching target)
- No regressions: All baseline passing tests still pass
- testUtils validated: 10+ testUtils tests passing

### Target Success (95%)
- Tests passing: 139+/146 (95%+)
- Coverage: 70%+ (at target)
- Smoke tests stable: 5 consecutive runs pass
- All component tests using testUtils

### Stretch Success (100%)
- Tests passing: 146/146 (100%)
- Coverage: 75%+
- Comprehensive documentation
- Migration guide for future tests

---

## TIMELINE SUMMARY

| Phase | Duration | Tasks | Cumulative |
|-------|----------|-------|------------|
| Phase 0: Pre-Implementation | 60-90 min | 8 tasks | 1.5 hr |
| Phase 1: Infrastructure | 90-120 min | 5 tasks | 3.5 hr |
| Phase 2: ClientDetails | 60-90 min | 5 tasks | 5.0 hr |
| Phase 3: PrintService | 30-45 min | 4 tasks | 5.75 hr |
| Phase 4: Components | 90-120 min | 6 tasks | 7.75 hr |
| Phase 5: Hooks | 30-45 min | 4 tasks | 8.5 hr |
| Phase 6: Verification | 30-45 min | 5 tasks | 9.25 hr |
| Phase 7: Documentation | 30-45 min | 3 tasks | 10 hr |
| **Total** | **8-10 hr** | **40 tasks** | **10 hr max** |

**Buffer:** 2 hours built into estimates for context switching and unexpected issues.

---

## READY TO EXECUTE

This plan is complete and ready for execution. Begin with **Phase 0, Task 0.1** (Establish Test Baseline).
