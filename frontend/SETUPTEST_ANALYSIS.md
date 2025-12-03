# setupTests.ts Analysis

## Global Mocks Present

### AuthContext Mock (lines 8-27)
- **Location**: `./context/AuthContext`
- **Mocked Functions**:
  - `api.get` - Returns empty array `{ data: [] }`
  - `api.post`, `api.put`, `api.delete` - Return empty object `{ data: {} }`
  - `login`, `logout`, `register` - Jest mock functions
- **Mocked Values**:
  - `isAuthenticated: true`
  - `user`: `{ id: 1, username: 'testuser', email: 'test@example.com' }`

### react-router-dom Mocks (lines 30-35)
- **Mocked Hooks**:
  - `useNavigate()` - Returns jest.fn()
  - `useParams()` - Returns `{ id: '1' }`
  - `useLocation()` - Returns `{ pathname: '/', search: '', hash: '', state: null }`

### window.matchMedia Mock (lines 40-53)
- **Setup**: Global window.matchMedia definition
- **Returns**: Mock implementation with:
  - `matches: false`
  - Event listeners (legacy and modern)
  - `dispatchEvent` mock

### Global Cleanup (lines 55-58)
- **afterEach**: Calls `jest.clearAllMocks()` after every test

## Potential Conflicts with testUtils

### No Conflicts Identified
1. **AuthContext**: testUtils does not provide AuthContext - will use global mock
2. **react-router-dom**: testUtils provides MemoryRouter which works alongside mocked hooks
3. **QueryClient**: No existing QueryClient mock - testUtils will add this

## Required Compatibility Measures

### For testUtils Implementation:
1. **Do NOT mock AuthContext** - already globally mocked
2. **Do NOT mock react-router-dom** - already globally mocked
3. **Provide MemoryRouter** - Compatible with existing mocks
4. **Add QueryClientProvider** - No conflict, currently missing
5. **Respect jest.clearAllMocks()** - Already handled globally

## Strategy for testUtils

### Provider Nesting Order (compatible):
1. QueryClientProvider (new - no conflict)
2. MemoryRouter (new - wraps existing navigation mocks)
3. Children

### Notes:
- testUtils should provide **additional** context (QueryClient, Router)
- testUtils should **not duplicate** existing global mocks
- All tests using testUtils will still benefit from global AuthContext mock
- MemoryRouter will provide actual routing context for components that need location/navigation

## Conclusion
testUtils is fully compatible with setupTests.ts. No changes to setupTests.ts required.
