---
title: "Frontend Development Consistency"
tags: ["standards", "development", "frontend", "consistency", "components", "patterns"]
related_docs:
  - "./01_coding_principles.md"
  - "./02_naming_conventions.md"
  - "../3_architecture/05_shared_modules_pattern.md"
  - "../5_frontend_guide/01_design_philosophy.md"
---
# Frontend Development Consistency

This document provides essential guidelines for implementing new features using frontend patterns and components consistent with the rest of Kingston's Portal codebase. Following these patterns ensures maintainability, consistency, and adherence to established architectural principles.

## 1. Core Principle

**Always use frontend patterns and components consistent with the rest of the codebase when implementing new features.**

This principle ensures:
- Consistent user experience across the application
- Reduced code duplication and maintenance overhead
- Adherence to established design patterns and architectural decisions
- Faster development through reuse of proven components and patterns

## 2. Component Library Usage

### Before Creating New Components
Always check the existing UI component library located in `frontend/src/components/ui/` before creating new components.

#### Available Component Categories

**Buttons (`buttons/`):**
- `ActionButton.tsx`: Standard action buttons with consistent styling
- `AddButton.tsx`: Specialized add/create functionality buttons
- `DeleteButton.tsx`: Deletion confirmation buttons with safety patterns
- `EditButton.tsx`: Edit mode toggle buttons
- `LapseButton.tsx`: Status change buttons for lapsing items

**Cards (`card/`):**
- `Card.tsx`: Base card component for content grouping
- `StatBox.tsx`: Metric display containers
- `StatCard.tsx`: Statistical information cards
- `ChangeIndicator.tsx`: Visual indicators for data changes

**Data Displays (`data-displays/`):**
- `DataTable.tsx`: Standardized table component with sorting and filtering
- `FundDistributionChart.tsx`: Financial chart components

**Dropdowns (`dropdowns/`):**
- `BaseDropdown.tsx`: Foundation dropdown component
- `ComboDropdown.tsx`: Searchable dropdown with typing support
- `CreatableDropdown.tsx`: Dropdown allowing new option creation
- `CreatableMultiSelect.tsx`: Multi-selection with creation capability
- `FilterDropdown.tsx`: Filter-specific dropdown functionality

**Inputs (`inputs/`):**
- `BaseInput.tsx`: Standard form input with validation
- `DateInput.tsx`: Date picker with consistent formatting
- `SearchableDropdown.tsx`: Combined search and selection input
- `InputError.tsx`: Standardized error display for form validation

**Feedback (`feedback/`):**
- `EmptyState.tsx`: No-data state display
- `ErrorDisplay.tsx`: Error handling and display component
- `Skeleton.tsx`: Loading state placeholder components

**Search (`search/`):**
- `AutocompleteSearch.tsx`: Type-ahead search functionality
- `FilterSearch.tsx`: Search with filtering capabilities
- `GlobalSearch.tsx`: Application-wide search component

### Component Selection Guidelines

```typescript
// ✅ Good: Using existing components
import { ActionButton } from '../ui/buttons/ActionButton';
import { Card } from '../ui/card/Card';
import { DataTable } from '../ui/data-displays/DataTable';

const MyNewFeature = () => {
  return (
    <Card>
      <DataTable data={myData} />
      <ActionButton onClick={handleAction}>
        Process Data
      </ActionButton>
    </Card>
  );
};

// ❌ Avoid: Creating duplicate functionality
const MyCustomButton = () => { /* reinventing ActionButton */ };
const MyCustomTable = () => { /* reinventing DataTable */ };
```

## 3. Shared Modules Integration

### Use Existing Shared Modules for Consistency

Always leverage the established shared modules pattern documented in [Shared Modules Pattern](../3_architecture/05_shared_modules_pattern.md):

**Shared Types (`types/reportTypes.ts`):**
- Use existing TypeScript interfaces for data structures
- Extend existing interfaces rather than creating duplicates
- Maintain consistent naming conventions

**Shared Formatters (`utils/reportFormatters.ts`):**
- Use `formatCurrencyWithTruncation()` for currency display
- Use `formatIrrWithPrecision()` for percentage formatting with smart decimals
- Use `formatWithdrawalAmount()` for withdrawal displays
- Use `calculateNetFundSwitches()` for fund switch calculations

**Shared Constants (`utils/reportConstants.ts`):**
- Use `PRODUCT_TYPE_ORDER` for consistent product ordering
- Use `normalizeProductType()` for product type handling
- Reference existing configuration constants

**Report Services (`services/report/`):**
- Use `ReportStateManager` for state management patterns
- Use `ReportFormatter` for advanced data formatting
- Use `IRRCalculationService` for financial calculations
- Use `PrintService` for document generation

### Implementation Examples

```typescript
// ✅ Good: Using shared modules
import { ProductPeriodSummary } from '../types/reportTypes';
import { formatCurrencyWithTruncation, formatIrrWithPrecision } from '../utils/reportFormatters';
import { PRODUCT_TYPE_ORDER } from '../utils/reportConstants';

const MyFinancialComponent = ({ data }: { data: ProductPeriodSummary[] }) => {
  const sortedData = data.sort((a, b) => 
    PRODUCT_TYPE_ORDER.indexOf(a.type) - PRODUCT_TYPE_ORDER.indexOf(b.type)
  );

  return (
    <div>
      {sortedData.map(item => (
        <div key={item.id}>
          <span>{formatCurrencyWithTruncation(item.value, true)}</span>
          <span>{formatIrrWithPrecision(item.irr)}</span>
        </div>
      ))}
    </div>
  );
};

// ❌ Avoid: Recreating existing functionality
const formatMoney = (value: number) => { /* duplicating formatCurrencyWithTruncation */ };
const formatPercent = (value: number) => { /* duplicating formatIrrWithPrecision */ };
```

## 4. API Integration Patterns

### Follow Established Service Patterns

When adding new API integrations, follow existing patterns found in `frontend/src/services/`:

**Service Organization:**
- `api.ts`: Core API client configuration
- `auth.ts`: Authentication service patterns
- Entity-specific services (e.g., `clientCacheService.ts`, `portfolioFundsService.ts`)
- Report services in `services/report/` directory

**API Call Patterns:**
```typescript
// ✅ Good: Following established patterns
import { apiClient } from '../services/api';

const useMyEntityData = () => {
  return useQuery({
    queryKey: ['myEntity'],
    queryFn: () => apiClient.get('/api/my-entity'),
    staleTime: 5 * 60 * 1000, // 5 minutes (consistent with app standard)
  });
};

// ❌ Avoid: Custom API configurations
const customFetch = async () => { /* reinventing API client */ };
```

## 5. State Management Consistency

### React Query Patterns

Follow established React Query patterns for server state management:

**Custom Hooks Location:** `frontend/src/hooks/`

**Naming Conventions:**
- `useEntityData.ts`: For data fetching hooks
- `useEntityMutations.ts`: For data modification hooks
- `useEntityDetails.ts`: For detailed entity views

**Implementation Pattern:**
```typescript
// ✅ Good: Following established patterns
// hooks/useMyEntityData.ts
export const useMyEntityData = () => {
  return useQuery({
    queryKey: ['myEntity'],
    queryFn: fetchMyEntityData,
    staleTime: 5 * 60 * 1000,
  });
};

// hooks/useMyEntityMutations.ts
export const useCreateMyEntity = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createMyEntity,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myEntity'] });
    },
  });
};
```

### Client State Management

Use established patterns for client-side state:
- `useState` for simple component state
- `useReducer` for complex state logic
- Context providers for shared state (following patterns in `context/`)

## 6. Component Size and Architecture Standards

### File Size Limits
Maintain established code quality standards:
- **Components**: ≤500 lines per file
- **Functions**: ≤50 lines per function
- **Single Responsibility**: Each component should have one clear purpose

### Architecture Patterns
Follow the modular architecture established in successful refactoring projects:

```typescript
// ✅ Good: Modular component structure
// MyFeature/index.ts - Main export
// MyFeature/MyFeatureContainer.tsx - Layout and state
// MyFeature/MyFeatureContent.tsx - Content display
// MyFeature/MyFeatureActions.tsx - User actions
// MyFeature/hooks/useMyFeatureData.ts - Data management

// ❌ Avoid: Monolithic components
// MyFeature.tsx (2000+ lines) - Everything in one file
```

## 7. Accessibility and Design Consistency

### WCAG 2.1 AA Compliance
Ensure all new components maintain accessibility standards:

```typescript
// ✅ Good: Accessible component
const MyAccessibleButton = ({ onClick, children, disabled = false }) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="min-h-[44px] text-lg contrast-high focus:ring-2"
      aria-label={typeof children === 'string' ? children : undefined}
    >
      {children}
    </button>
  );
};

// ❌ Avoid: Inaccessible components
const SmallButton = () => (
  <button className="h-6 text-xs">Click</button> // Too small, low contrast
);
```

### Design System Consistency
Follow established design patterns:
- High contrast color schemes
- Large fonts (16px+ base)
- Consistent spacing using Tailwind utilities
- Hover and focus states for interactive elements

## 8. Testing Integration

### Test Pattern Consistency
Follow established testing patterns when adding new features:

```typescript
// ✅ Good: Following established test patterns
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MyNewComponent } from './MyNewComponent';

const createTestQueryClient = () => new QueryClient({
  defaultOptions: { queries: { retry: false } }
});

describe('MyNewComponent', () => {
  it('renders correctly with data', () => {
    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <MyNewComponent />
      </QueryClientProvider>
    );
    
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});
```

## 9. Implementation Checklist

### Before Starting New Feature Development

**Component Assessment:**
- [ ] Checked existing UI components in `components/ui/`
- [ ] Identified reusable patterns in similar features
- [ ] Reviewed shared modules for applicable functionality
- [ ] Confirmed component size will stay under 500 lines

**API Integration:**
- [ ] Reviewed existing service patterns
- [ ] Planned React Query integration following established hooks
- [ ] Considered caching strategy (default 5-minute staleTime)

**Design and Accessibility:**
- [ ] Confirmed design follows established patterns
- [ ] Planned for WCAG 2.1 AA compliance
- [ ] Ensured high contrast and large font usage

**Testing Strategy:**
- [ ] Planned test coverage following existing patterns
- [ ] Identified shared module test requirements
- [ ] Considered integration test needs

### During Development

**Code Quality:**
- [ ] Components remain focused and under size limits
- [ ] Following established naming conventions
- [ ] Using TypeScript properly with existing interfaces
- [ ] Implementing proper error handling

**Integration:**
- [ ] Using existing services and utilities
- [ ] Following established state management patterns
- [ ] Maintaining consistency with existing user flows

### Before Code Review

**Final Consistency Check:**
- [ ] All components use established UI library elements
- [ ] No duplicate functionality created
- [ ] Shared modules integrated where applicable
- [ ] API patterns follow existing service structure
- [ ] Accessibility standards maintained
- [ ] Test coverage follows established patterns

## 10. Common Anti-Patterns to Avoid

### Component Duplication
```typescript
// ❌ Avoid: Creating duplicate functionality
const MyCustomModal = () => { /* reinventing existing modal */ };
const MySpecialButton = () => { /* reinventing ActionButton */ };

// ✅ Good: Extending existing components
const SpecializedActionButton = ({ specialProp, ...props }) => (
  <ActionButton {...props} className={getSpecializedStyles(specialProp)}>
    {props.children}
  </ActionButton>
);
```

### State Management Inconsistency
```typescript
// ❌ Avoid: Custom state management
const [data, setData] = useState();
useEffect(() => {
  fetch('/api/data').then(/* custom logic */);
}, []);

// ✅ Good: Following React Query patterns
const { data, isLoading } = useMyData();
```

### Formatting Inconsistency
```typescript
// ❌ Avoid: Custom formatting
const formatCurrency = (value) => `$${value.toFixed(2)}`;

// ✅ Good: Using shared formatters
import { formatCurrencyWithTruncation } from '../utils/reportFormatters';
const formattedValue = formatCurrencyWithTruncation(value, true);
```

## Conclusion

Following these frontend development consistency guidelines ensures that new features integrate seamlessly with Kingston's Portal's existing architecture. By leveraging established patterns, components, and services, developers can deliver features faster while maintaining the high-quality, accessible, and maintainable codebase that defines the application.

Remember: **Consistency is not just about code quality—it's about creating a predictable, professional user experience that meets the needs of wealth management professionals.** 