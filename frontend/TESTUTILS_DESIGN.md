# testUtils Architecture Design

## Provider Nesting Order (CRITICAL)

The order of provider nesting is crucial for proper React Query and routing integration:

1. **QueryClientProvider** (outermost)
2. **MemoryRouter** (react-router-dom)
3. **Children** (innermost)

### Rationale
- **QueryClientProvider wraps MemoryRouter**: This allows route-based queries to work correctly. React Query needs to be available to all components, including those that use routing.
- **MemoryRouter provides navigation context**: Components can use useLocation, useParams, useNavigate hooks.
- **Children render inside both contexts**: Components have access to both React Query and routing.

## QueryClient Configuration

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,        // No retries in tests - fail fast
      gcTime: 0,           // Immediate garbage collection - no cache persistence
      staleTime: 0,        // Always fetch fresh - no implicit caching
    },
    mutations: {
      retry: false,        // No mutation retries
    },
  },
  logger: {
    log: console.log,      // Allow normal logs
    warn: console.warn,    // Allow warnings
    error: () => {},       // Suppress error logs in tests (expected errors)
  },
});
```

### Configuration Rationale

#### `retry: false`
- **Purpose**: Tests should fail immediately on errors, not retry
- **Benefit**: Faster test execution, clearer error messages
- **Alternative considered**: `retry: 1` - rejected because it slows down tests

#### `gcTime: 0` (formerly cacheTime)
- **Purpose**: Immediate cleanup of query cache after component unmount
- **Benefit**: No cache pollution between tests, true test isolation
- **Alternative considered**: `gcTime: 1000` - rejected due to test pollution risk

#### `staleTime: 0`
- **Purpose**: Always treat data as stale, forcing fresh fetches
- **Benefit**: Predictable test behavior, no accidental cache hits
- **Alternative considered**: `staleTime: Infinity` - rejected because it hides timing bugs

#### `error: () => {}`
- **Purpose**: Suppress console error noise from expected failures
- **Benefit**: Cleaner test output, easier to spot real issues
- **Note**: Only suppresses React Query errors, not application errors

## Compatibility with setupTests.ts

### Reuse Global Mocks (DO NOT DUPLICATE)

#### AuthContext Mock (setupTests.ts lines 8-27)
- **Already mocked globally**: useAuth hook returns test user
- **testUtils action**: Do NOT add AuthContext.Provider
- **Benefit**: All tests automatically have authenticated user
- **Usage**: Tests can override via setupTests.ts mock if needed

#### react-router-dom Mocks (setupTests.ts lines 30-35)
- **Already mocked globally**: useNavigate, useParams, useLocation
- **testUtils action**: Provide MemoryRouter (compatible with mocks)
- **Benefit**: Tests get both actual Router context AND mocked hooks
- **Note**: MemoryRouter wraps mocked hooks, no conflict

#### window.matchMedia Mock (setupTests.ts lines 40-53)
- **Already mocked globally**: Media query support
- **testUtils action**: No action needed
- **Benefit**: All tests can use responsive components

### Cleanup Strategy

#### Global Cleanup (setupTests.ts line 57)
- **afterEach**: `jest.clearAllMocks()` runs after every test
- **testUtils action**: Add QueryClient cleanup in addition
- **No conflict**: Both cleanups are additive, not conflicting

```typescript
// testUtils cleanup (in addition to global)
export function cleanupQueryClient(client: QueryClient): void {
  client.clear();
  client.getQueryCache().clear();
  client.getMutationCache().clear();
}
```

## API Design

### Primary Function: `renderWithProviders`

```typescript
/**
 * Custom render function with all required providers
 *
 * @param ui - Component to render
 * @param options - Optional configuration
 * @returns Render result + queryClient for assertions
 */
export function renderWithProviders(
  ui: React.ReactElement,
  options?: {
    initialRoute?: string,      // Default: '/'
    queryClient?: QueryClient,  // Default: creates new
  }
): RenderResult & { queryClient: QueryClient }
```

#### Parameters

**`ui: React.ReactElement`**
- The component to render
- Example: `<ClientDetails />`

**`options.initialRoute?: string`**
- Initial URL for MemoryRouter
- Default: `'/'`
- Example: `'/clients/123'`
- Use case: Testing components that read URL params

**`options.queryClient?: QueryClient`**
- Custom QueryClient instance
- Default: Creates new isolated client
- Use case: Pre-populating cache with test data

#### Return Value

**`RenderResult`** (from @testing-library/react)
- All standard testing library utilities: `getByText`, `queryByRole`, etc.

**`queryClient: QueryClient`**
- The QueryClient instance used in the test
- Use for: Cache assertions, waiting for queries to complete
- Example: `expect(queryClient.isFetching()).toBe(0)`

### Helper Function: `createTestQueryClient`

```typescript
/**
 * Creates a QueryClient configured for testing
 *
 * @returns New QueryClient with test-optimized configuration
 */
export function createTestQueryClient(): QueryClient
```

**Use case**: Creating a shared QueryClient across multiple tests
**Example**:
```typescript
describe('MyComponent', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = createTestQueryClient();
  });

  it('test', () => {
    renderWithProviders(<MyComponent />, { queryClient });
  });
});
```

### Cleanup Function: `cleanupQueryClient`

```typescript
/**
 * Clears all queries and mutations from QueryClient cache
 *
 * @param client - The QueryClient to clean up
 */
export function cleanupQueryClient(client: QueryClient): void
```

**Use case**: Preventing test pollution
**Usage pattern**:
```typescript
afterEach(() => {
  cleanupQueryClient(queryClient);
});
```

### Wait Helper: `waitForQueryClient`

```typescript
/**
 * Waits for all React Query operations to complete
 *
 * @param client - The QueryClient to wait for
 */
export async function waitForQueryClient(client: QueryClient): Promise<void>
```

**Use case**: Waiting for async data loading to complete
**Example**:
```typescript
const { queryClient } = renderWithProviders(<MyComponent />);
await waitForQueryClient(queryClient);
expect(screen.getByText('Loaded Data')).toBeInTheDocument();
```

## Testing Strategy for testUtils Itself

### Isolation Tests (testUtils.test.tsx)

Must verify testUtils works correctly BEFORE applying to real tests.

#### Test Categories:

1. **QueryClient Configuration** (3 tests)
   - Verify `retry: false`
   - Verify `gcTime: 0`
   - Verify `staleTime: 0`

2. **Cleanup Functionality** (1 test)
   - Verify cache clears completely

3. **Provider Integration** (5 tests)
   - Verify component renders
   - Verify QueryClient available
   - Verify MemoryRouter available
   - Verify custom routes work
   - Verify queryClient returned for assertions

4. **Wait Helper** (1 test)
   - Verify waits for async operations

**Total**: 10+ isolation tests

**Acceptance Criteria**:
- All isolation tests must pass BEFORE using testUtils in real tests
- Tests must run in <10 seconds
- No console errors or warnings (except expected ts-jest deprecation warnings)

## Implementation Checklist

- [ ] Create `src/tests/utils/` directory
- [ ] Implement `testUtils.tsx` with all functions
- [ ] Add JSDoc comments to all exports
- [ ] Create `testUtils.test.tsx` with 10+ isolation tests
- [ ] Run isolation tests: `npm test -- testUtils.test.tsx --no-coverage`
- [ ] Verify all tests pass
- [ ] Verify TypeScript compiles: `npx tsc --noEmit`
- [ ] Run smoke tests to ensure no regressions
- [ ] Document any issues in TEST_FAILURE_LOG.md

## Success Criteria

### Must Have
- ✓ All 10+ isolation tests passing
- ✓ TypeScript compiles without errors
- ✓ Smoke tests still pass (no regressions)
- ✓ Provider nesting order correct
- ✓ QueryClient configuration matches spec

### Nice to Have
- ✓ Test execution time <5 seconds for isolation tests
- ✓ No console warnings (beyond expected ts-jest warnings)
- ✓ Comprehensive JSDoc comments

## References

- React Query Testing: https://tanstack.com/query/latest/docs/react/guides/testing
- React Testing Library: https://testing-library.com/docs/react-testing-library/setup
- setupTests.ts: `C:\Users\jacob\Documents\kingstons_portal\frontend\src\setupTests.ts`
- Test baseline: `test_baseline.txt`
