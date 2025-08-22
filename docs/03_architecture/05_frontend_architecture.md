# Frontend Architecture

## Overview

Kingston's Portal frontend implements a **comprehensive React/TypeScript architecture** with shared modules, smart navigation, and concurrent user features. The architecture prioritizes code reuse, performance, and maintainable patterns across 38+ pages and 42+ components.

## Architecture Components

### 1. Shared Modules Pattern

Kingston's Portal implements a sophisticated **Shared Modules Pattern** that eliminates code duplication across the frontend codebase through centralized utility modules, type definitions, and domain-specific functions. This pattern has eliminated an estimated **200+ lines of duplicate code** while improving maintainability and consistency.

#### Problem Solved

Before implementing shared modules, the codebase suffered from:
- **Code Duplication**: Same formatting functions copied across multiple components
- **Inconsistent Behavior**: Similar operations implemented differently in different files
- **Maintenance Burden**: Changes required updates in multiple locations
- **Testing Complexity**: Duplicate logic required duplicate tests

#### Utility Modules Structure (`frontend/src/utils/`)

```
utils/
├── index.ts                    # Centralized exports
├── definitionsShared.ts       # Types and utilities for definitions pages
├── formatters.ts              # General formatting functions
├── formatMoney.ts             # Currency formatting utilities
├── reportFormatters.ts        # Report-specific formatting functions
├── reportConstants.ts         # Report configuration constants
├── productTitleUtils.ts       # Product title generation logic
├── productOwnerUtils.ts       # Product owner display utilities
└── fundUtils.ts               # Fund identification and filtering
```

#### Code Elimination Examples

**Currency Formatting Consolidation**:
```typescript
// Before: Duplicate currency formatting in multiple files
// After: Centralized in utils/formatMoney.ts
export const formatMoney = (
  amount: number | null | undefined,
  showDecimals: boolean = true,
  showPoundSign: boolean = true
): string => {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return showPoundSign ? '£0' : '0';
  }

  const decimals = showDecimals ? 2 : 0;
  const formattedNumber = new Intl.NumberFormat('en-GB', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: true
  }).format(amount);

  return showPoundSign ? `£${formattedNumber}` : formattedNumber;
};

// Usage: Now imported by 15+ components
import { formatMoney } from '../utils';
```

### 2. Smart Navigation Pattern

**Priority-Based Page Navigation** system that adapts navigation breadcrumbs and routing based on user context and page hierarchy.

#### Navigation Intelligence Features

**Context-Aware Breadcrumbs**:
```typescript
// useSmartNavigation hook provides intelligent breadcrumb generation
const { breadcrumbs, navigateWithContext } = useSmartNavigation();

// Automatic breadcrumb generation based on route hierarchy
// /clients/123/products/456 → Home > Clients > John Smith > Products > ISA Portfolio
```

**Preferred Landing Pages**:
```typescript
// User preferences for post-login navigation
interface UserPreferences {
  preferred_landing_page: '/' | '/client_groups';
}

// Automatic redirection after authentication
if (isAuthenticated && user?.preferred_landing_page && location.pathname === '/') {
  navigate(user.preferred_landing_page);
}
```

### 3. Concurrent User Detection

**Real-Time Presence System** that tracks user activity across different pages and provides notifications for concurrent access to shared resources.

#### Presence Management Architecture

**User Presence Tracking**:
```typescript
// usePresence hook for real-time user tracking
const { currentUsers, updatePresence } = usePresence(pageIdentifier);

// Database schema for presence tracking
CREATE TABLE user_page_presence (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES profiles(id),
    page_identifier VARCHAR(255),
    last_seen TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, page_identifier)
);
```

**Presence Notifications**:
```typescript
// PresenceIndicator component shows concurrent users
<PresenceIndicator 
  currentUsers={currentUsers}
  showNotifications={true}
  pageContext="client-details"
/>

// Real-time updates via polling (WebSocket-ready architecture)
const PRESENCE_UPDATE_INTERVAL = 30000; // 30 seconds
```

## Component Library Architecture

### 1. UI Component Hierarchy

```
components/
├── ui/                         # Base UI components (42+ components)
│   ├── buttons/                # Button variants (ActionButton, AddButton, etc.)
│   ├── card/                   # Card components (StatBox, ChangeIndicator, etc.)
│   ├── data-displays/          # Data visualization (DataTable, FundDistributionChart)
│   ├── dropdowns/              # Dropdown variants (SearchableDropdown, etc.)
│   ├── feedback/               # User feedback (EmptyState, ErrorDisplay, etc.)
│   ├── inputs/                 # Input components (BaseInput, DateInput, etc.)
│   ├── search/                 # Search components (GlobalSearch, FilterSearch)
│   └── table-controls/         # Table functionality (TableFilter, TableSort)
├── auth/                       # Authentication components
├── layout/                     # Layout components (AppLayout, AuthLayout)
├── report/                     # Report generation components
└── generation/                 # Portfolio generation components
```

### 2. Component Design Patterns

**Consistent Component Interface**:
```typescript
// Standard component props pattern
interface ComponentProps {
  className?: string;
  children?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
}

// Example: ActionButton with consistent interface
<ActionButton 
  variant="primary" 
  size="md" 
  loading={isSubmitting}
  onClick={handleSubmit}
>
  Save Changes
</ActionButton>
```

## State Management Architecture

### 1. React Query Integration

**Centralized Server State Management**:
```typescript
// App.tsx - Global query configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,        // 5 minutes default cache
      cacheTime: 10 * 60 * 1000,       // 10 minutes memory retention
      retry: 1,                        // Single retry for failed requests
      refetchOnWindowFocus: false,     // Prevent unnecessary refetches
    },
  },
});

// Usage patterns across application
const { data, isLoading, error } = useQuery(
  ['clients', 'active'],
  () => api.get('/client_groups?status=active'),
  { staleTime: 5 * 60 * 1000 }
);
```

**Cache Strategy by Data Type**:
```typescript
// Static reference data - long cache
const { data: providers } = useQuery(['providers'], fetchProviders, {
  staleTime: 30 * 60 * 1000,  // 30 minutes
});

// Dynamic dashboard data - short cache  
const { data: analytics } = useQuery(['analytics'], fetchAnalytics, {
  staleTime: 1 * 60 * 1000,   // 1 minute
});

// User-specific data - medium cache
const { data: clientData } = useQuery(['client', clientId], 
  () => fetchClientData(clientId), {
  staleTime: 5 * 60 * 1000,   // 5 minutes
});
```

### 2. Local State Patterns

**Component State Management**:
```typescript
// Form state with validation
const [formData, setFormData] = useState<ProductForm>(initialValues);
const [errors, setErrors] = useState<FormErrors>({});
const [isSubmitting, setIsSubmitting] = useState(false);

// List management state
const [filteredItems, setFilteredItems] = useState<Item[]>([]);
const [searchQuery, setSearchQuery] = useState('');
const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'name', direction: 'asc' });

// Modal/dialog state
const [isModalOpen, setIsModalOpen] = useState(false);
const [selectedItem, setSelectedItem] = useState<Item | null>(null);
```

## Performance Architecture

### 1. Code Splitting Strategy

**Route-Based Splitting**:
```typescript
// Lazy loading for major pages
const LazyReportGenerator = lazy(() => import('./pages/ReportGenerator'));
const LazyAnalytics = lazy(() => import('./pages/Analytics'));
const LazyProductDetails = lazy(() => import('./pages/ProductDetails'));

// Suspense boundaries for loading states
<Suspense fallback={<PageSkeleton />}>
  <Routes>
    <Route path="/reports" element={<LazyReportGenerator />} />
    <Route path="/analytics" element={<LazyAnalytics />} />
  </Routes>
</Suspense>
```

### 2. Memoization Patterns

**Performance Optimization**:
```typescript
// Expensive calculation memoization
const ExpensiveComponent = memo(({ data }: { data: Portfolio[] }) => {
  const totalValue = useMemo(() => {
    return data.reduce((sum, portfolio) => sum + portfolio.value, 0);
  }, [data]);

  return <div>Total: {formatMoney(totalValue)}</div>;
});

// Callback memoization for stable references
const handleItemClick = useCallback((itemId: string) => {
  onItemSelect(itemId);
}, [onItemSelect]);
```

## Testing Architecture

### 1. Component Testing Strategy

**Comprehensive Test Coverage** (92 tests total):
```typescript
// Component testing with React Testing Library
describe('ActionButton', () => {
  test('renders with correct variant classes', () => {
    render(<ActionButton variant="primary">Click me</ActionButton>);
    expect(screen.getByRole('button')).toHaveClass('btn-primary');
  });

  test('handles loading state correctly', () => {
    render(<ActionButton loading={true}>Submit</ActionButton>);
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});
```

### 2. Shared Module Testing

**Utility Function Testing**:
```typescript
// Testing shared utilities ensures code reuse reliability
describe('formatMoney', () => {
  test('handles null and undefined values', () => {
    expect(formatMoney(null)).toBe('£0');
    expect(formatMoney(undefined)).toBe('£0');
  });

  test('formats with and without decimals', () => {
    expect(formatMoney(1234.56, true)).toBe('£1,234.56');
    expect(formatMoney(1234.56, false)).toBe('£1,235');
  });
});
```

## Architecture Benefits

### 1. Code Quality Improvements
- **DRY Compliance**: No duplicate business logic
- **Single Source of Truth**: Consistent behavior across components  
- **Error Handling**: Centralized null/undefined handling
- **Type Safety**: Shared interfaces prevent inconsistencies

### 2. Developer Experience
- **Predictable APIs**: Consistent component interfaces
- **Auto-completion**: Better IDE support with centralized exports
- **Documentation**: JSDoc comments shared across usage
- **Testing**: Higher confidence with centralized test coverage

### 3. Maintenance Benefits
- **Bug Fixes**: Fix once, apply everywhere
- **Feature Enhancement**: Add capabilities globally
- **Refactoring**: Safe to modify with comprehensive tests
- **Performance**: Optimize algorithms once for all consumers

This frontend architecture demonstrates enterprise-level organization that scales effectively while maintaining high code quality and developer productivity across the wealth management application.