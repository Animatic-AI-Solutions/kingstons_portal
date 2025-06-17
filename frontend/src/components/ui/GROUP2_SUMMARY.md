# Group 2: Search Input Family Components

## Overview

Group 2 consists of 4 standardized search input components that follow the established Group 1 design system. These components provide consistent search functionality across the Kingstons Portal application while maintaining visual and behavioral coherence.

## Design System Consistency

### Visual Standards
- **Heights**: 32px (sm), 40px (md), 48px (lg) - consistent with Group 1
- **Colors**: Purple theme (#4B2D83) with matching focus states
- **Typography**: 14px input text, 12px helper text, consistent font weights
- **Icons**: 16px size, consistent positioning and colors
- **Border Radius**: 6px (rounded-md) for modern appearance
- **Shadows**: Consistent shadow-sm for subtle depth

### Behavioral Standards
- **Focus States**: 3px purple ring with offset
- **Hover Effects**: Border color transitions
- **Transitions**: 150ms ease-in-out for all state changes
- **Accessibility**: Full ARIA support, keyboard navigation
- **Error Handling**: Consistent error styling and messaging

## Component Specifications

### 1. SearchInput
**Purpose**: Standard search functionality with debouncing and clear button

**Features**:
- Debounced search (300ms default)
- Clear button with hover effects
- Loading state with spinner
- Optional search and clear icons
- Comprehensive error handling

**Props**:
```typescript
interface SearchInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'error';
  fullWidth?: boolean;
  onSearch?: (value: string) => void;
  debounceMs?: number;
  showClearButton?: boolean;
  searchIcon?: ReactNode;
  clearIcon?: ReactNode;
  loading?: boolean;
}
```

**Usage Example**:
```tsx
<SearchInput
  label="Search products"
  placeholder="Enter product name..."
  onSearch={handleSearch}
  helperText="Search will be triggered after 300ms"
  showClearButton={true}
/>
```

### 2. GlobalSearch
**Purpose**: System-wide search with dropdown results and navigation

**Features**:
- Cross-entity search (clients, products, funds, etc.)
- Dropdown with categorized results
- Entity icons and type badges
- Keyboard navigation (↑↓ to navigate, Enter to select)
- Result highlighting with search term emphasis
- Auto-navigation to selected entities

**Key Capabilities**:
- Searches multiple entity types simultaneously
- Visual feedback with loading states
- Smart routing based on entity type
- Click outside to close functionality
- Escape key support

**Usage**:
```tsx
<GlobalSearch />
```

### 3. FilterSearch
**Purpose**: Real-time filtering for tables and lists

**Features**:
- Fast debouncing (150ms for responsive filtering)
- Result count display
- Optimized for table/list filtering
- Clear filter functionality
- Custom filter labels

**Props**:
```typescript
interface FilterSearchProps {
  onFilter?: (value: string) => void;
  debounceMs?: number; // Default: 150ms
  resultCount?: number;
  showResultCount?: boolean;
  filterLabel?: string; // Default: "Filter"
  // ... extends SearchInputProps
}
```

**Usage Example**:
```tsx
<FilterSearch
  label="Filter companies"
  placeholder="Filter by name..."
  onFilter={handleFilter}
  showResultCount={true}
  resultCount={filteredItems.length}
  filterLabel="Company"
/>
```

### 4. AutocompleteSearch
**Purpose**: Search with dropdown suggestions and selection

**Features**:
- Configurable option list with icons and descriptions
- Keyboard navigation support
- Custom value entry option
- Flexible filtering function
- Rich option display with metadata

**Option Interface**:
```typescript
interface AutocompleteOption {
  value: string;
  label: string;
  description?: string;
  icon?: ReactNode;
  disabled?: boolean;
}
```

**Props**:
```typescript
interface AutocompleteSearchProps {
  options: AutocompleteOption[];
  onSelect?: (option: AutocompleteOption) => void;
  minSearchLength?: number; // Default: 1
  maxResults?: number; // Default: 10
  allowCustomValue?: boolean;
  filterFunction?: (options: AutocompleteOption[], searchTerm: string) => AutocompleteOption[];
  // ... extends SearchInputProps
}
```

**Usage Example**:
```tsx
const options = [
  {
    value: 'client-1',
    label: 'Acme Corp',
    description: 'Technology company',
    icon: <BuildingIcon className="h-4 w-4" />
  }
];

<AutocompleteSearch
  label="Select client"
  placeholder="Search clients..."
  options={options}
  onSelect={handleClientSelect}
  minSearchLength={2}
  allowCustomValue={false}
/>
```

## Integration Guidelines

### Import Statement
```typescript
import { 
  SearchInput, 
  GlobalSearch, 
  FilterSearch, 
  AutocompleteSearch,
  AutocompleteOption 
} from './components/ui';
```

### Common Patterns

**1. Basic Search**:
```tsx
<SearchInput
  placeholder="Search..."
  onSearch={handleSearch}
  showClearButton={true}
/>
```

**2. Table Filtering**:
```tsx
<FilterSearch
  placeholder="Filter table..."
  onFilter={setFilterTerm}
  showResultCount={true}
  resultCount={filteredData.length}
/>
```

**3. Entity Selection**:
```tsx
<AutocompleteSearch
  placeholder="Select entity..."
  options={entityOptions}
  onSelect={handleEntitySelect}
  minSearchLength={2}
/>
```

### Error Handling
All components support consistent error display:

```tsx
<SearchInput
  error="Search failed to execute"
  variant="error"
/>
```

### Loading States
Loading indicators are built-in and consistent:

```tsx
<SearchInput
  loading={isSearching}
  placeholder="Searching..."
/>
```

## Accessibility Features

### Keyboard Navigation
- **Tab**: Focus navigation between components
- **Enter**: Execute search or select option
- **Escape**: Close dropdowns or clear focus
- **Arrow Keys**: Navigate dropdown options
- **Space**: Alternative selection in some contexts

### Screen Reader Support
- Proper ARIA labels and descriptions
- Live region updates for dynamic content
- Role-based navigation hints
- Error announcement capabilities

### WCAG Compliance
- AA color contrast ratios
- Keyboard-only navigation support
- Focus indicator visibility
- Semantic markup structure

## Performance Considerations

### Debouncing
- **SearchInput**: 300ms (balanced for user experience)
- **FilterSearch**: 150ms (optimized for real-time filtering)
- **AutocompleteSearch**: 200ms (balanced for suggestion display)
- **GlobalSearch**: 300ms (optimized for API calls)

### Memory Management
- Automatic cleanup of debounce timers
- Event listener cleanup on unmount
- Minimal re-render optimization

### Network Optimization
- Debounced API calls prevent excessive requests
- Search term caching where applicable
- Graceful error handling for network failures

## Testing Considerations

### Unit Tests
- Component rendering with various props
- Event handler execution
- State management verification
- Error boundary testing

### Integration Tests
- User interaction flows
- Keyboard navigation sequences
- Search result handling
- Network request mocking

### Accessibility Tests
- Screen reader compatibility
- Keyboard navigation verification
- Color contrast validation
- ARIA attribute correctness

## Migration from Legacy Components

### SearchInput Migration
```typescript
// Old
<input type="search" onChange={handleChange} />

// New
<SearchInput onSearch={handleSearch} />
```

### GlobalSearch Migration
- Existing GlobalSearch updated to Group 1 standards
- No breaking changes to API
- Enhanced visual consistency

### Filter Integration
```typescript
// Old
<input placeholder="Filter..." onChange={(e) => setFilter(e.target.value)} />

// New
<FilterSearch onFilter={setFilter} showResultCount={true} />
```

## Future Enhancements

### Planned Features
1. **Advanced filtering**: Multiple criteria support
2. **Search history**: Recent searches dropdown
3. **Saved searches**: Bookmark frequently used searches
4. **Voice search**: Speech-to-text integration
5. **Smart suggestions**: AI-powered search completion

### Extensibility
- Plugin architecture for custom search providers
- Themeable component variants
- Custom icon support
- Advanced filtering operators

## Support and Maintenance

### Version Compatibility
- Compatible with React 17+
- TypeScript 4.5+ support
- Modern browser support (ES2020+)

### Breaking Changes
- None introduced in this implementation
- Backward compatible with existing integrations
- Progressive enhancement approach

### Documentation Updates
- Component API documentation
- Storybook integration planned
- Usage example library
- Performance benchmarking results

---

**Group 2 Summary**: 4 components delivered with full Group 1 design system consistency, comprehensive accessibility support, and production-ready integration capabilities. 