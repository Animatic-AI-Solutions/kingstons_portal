# UI Component Guide & Standards

*A comprehensive guide to Kingston's Portal UI component library for consistent development*

---

## 📋 **Quick Reference**

| Group | Purpose | Component Count | Key Use Cases |
|-------|---------|-----------------|---------------|
| [inputs/](#inputs) | Basic form inputs | 7 | Forms, data entry, user input |
| [search/](#search) | Search interfaces | 4 | Finding data, filtering, autocomplete |
| [dropdowns/](#dropdowns) | Selection menus | 7 | Choose options, multi-select, filtering |
| [buttons/](#buttons) | User actions | 6 | Triggers, submissions, operations |
| [table-controls/](#table-controls) | Table interactions | 2 | Sorting columns, filtering table data |
| [card/](#card) | Data containers | 4 | Displaying metrics, grouped information |
| [data-displays/](#data-displays) | Charts & tables | 2 | Visualizing data, presenting information |
| [feedback/](#feedback) | Loading states | 4 | Progress, empty states, errors |

---

## 🎯 **Design Principles**

### **Consistency Standards**
- **Purple Theme**: Primary colors use `primary-700`, `primary-600`, `primary-500`
- **Gray Scale**: Supporting colors from `gray-50` to `gray-900`
- **Typography**: Consistent sizing with `text-sm` (14px) for inputs, `text-xs` (12px) for helpers
- **Spacing**: Standard padding patterns across size variants (sm, md, lg)
- **Focus Rings**: All interactive elements use `ring-4 ring-offset-2 ring-primary-700/10`

### **Size Variants**
- **Small (sm)**: 32px height - compact spaces, secondary actions
- **Medium (md)**: 40px height - default size for most components
- **Large (lg)**: 48px height - prominent actions, important inputs

---

## 📁 **Component Groups**

## inputs/

> **Purpose**: Core form input components for data entry and user interaction
> **Design Philosophy**: Clean, accessible, consistent validation patterns

### **BaseInput.tsx**
- **Use When**: Standard text input needed
- **Features**: Left/right icons, validation states, helper text
- **Examples**: Name fields, descriptions, general text entry
```tsx
<BaseInput 
  label="Client Name" 
  placeholder="Enter client name"
  leftIcon={<UserIcon />}
  error="This field is required"
/>
```

### **NumberInput.tsx**
- **Use When**: Numeric data entry required
- **Features**: Currency formatting, percentage display, step controls, right-aligned text
- **Examples**: Portfolio values, percentages, quantities, financial data
```tsx
<NumberInput 
  label="Portfolio Value"
  format="currency"
  currency="£"
  thousandSeparator
  decimalPlaces={2}
/>
```

### **DateInput.tsx**
- **Use When**: Date selection needed
- **Features**: dd/mm/yyyy format, calendar icon, date validation
- **Examples**: Start dates, deadlines, reporting periods
```tsx
<DateInput 
  label="Start Date"
  placeholder="dd/mm/yyyy"
  showCalendarIcon={true}
  minDate={new Date()}
/>
```

### **TextArea.tsx**
- **Use When**: Multi-line text input required
- **Features**: Auto-resize, character counting, min/max rows
- **Examples**: Comments, descriptions, notes, strategy explanations
```tsx
<TextArea 
  label="Investment Strategy"
  placeholder="Describe the approach..."
  maxLength={500}
  showCharacterCount
/>
```

### **InputLabel.tsx**
- **Use When**: Standalone labels needed
- **Features**: Required indicators, consistent styling
- **Examples**: Custom form layouts, grouped inputs

### **InputError.tsx**
- **Use When**: Displaying validation errors
- **Features**: Red text, error icon, accessibility support
- **Examples**: Form validation feedback

### **InputGroup.tsx**
- **Use When**: Grouping related inputs
- **Features**: Horizontal/vertical layouts, consistent spacing
- **Examples**: Address forms, contact information, grouped data entry

---

## search/

> **Purpose**: Specialized search and filtering interfaces
> **Design Philosophy**: Fast, intuitive search experiences with clear results

### **SearchInput.tsx**
- **Use When**: Basic search functionality needed
- **Features**: Search icon, clear button, loading states
- **Examples**: General site search, simple filtering
```tsx
<SearchInput 
  placeholder="Search clients..."
  onSearch={handleSearch}
  loading={isSearching}
/>
```

### **GlobalSearch.tsx**
- **Use When**: Site-wide search with multiple result types
- **Features**: Advanced search, result categorization, keyboard navigation
- **Examples**: Main navigation search, comprehensive data finding
```tsx
<GlobalSearch 
  placeholder="Search everything..."
  categories={['clients', 'portfolios', 'funds']}
/>
```

### **FilterSearch.tsx**
- **Use When**: Search within filtered datasets
- **Features**: Quick filtering, real-time results
- **Examples**: Table filtering, list searching, data refinement

### **AutocompleteSearch.tsx**
- **Use When**: Search with suggested completions
- **Features**: Dropdown suggestions, keyboard navigation, async loading
- **Examples**: Client lookup, fund selection, smart data entry
```tsx
<AutocompleteSearch 
  placeholder="Find client..."
  options={clientOptions}
  onSelect={handleClientSelect}
/>
```

---

## dropdowns/

> **Purpose**: Selection components for choosing from predefined options
> **Design Philosophy**: Clear options, smooth interactions, scalable for large datasets

### **BaseDropdown.tsx**
- **Use When**: Single selection from a list
- **Features**: Search within options, keyboard navigation
- **Examples**: Status selection, category picking, single choice fields
```tsx
<BaseDropdown 
  label="Status"
  options={statusOptions}
  value={selectedStatus}
  onChange={setSelectedStatus}
/>
```

### **MultiSelectDropdown.tsx**
- **Use When**: Multiple selections needed
- **Features**: Checkboxes, select all, clear all, search
- **Examples**: Tag selection, multiple categories, permission sets
```tsx
<MultiSelectDropdown 
  label="Categories"
  options={categoryOptions}
  values={selectedCategories}
  onChange={setSelectedCategories}
/>
```

### **CreatableDropdown.tsx**
- **Use When**: Allow creating new options while selecting
- **Features**: Add new items, validation, dynamic options
- **Examples**: Tag creation, dynamic categories, custom values

### **CreatableMultiSelect.tsx**
- **Use When**: Multi-select with ability to create new options
- **Features**: Create multiple new items, tag-like interface
- **Examples**: Skill tags, custom categories, flexible labeling

### **ComboDropdown.tsx**
- **Use When**: Hybrid typing and selection needed
- **Features**: Type-ahead, selection from dropdown
- **Examples**: Smart forms, flexible input, enhanced user experience

### **FilterDropdown.tsx**
- **Use When**: Filtering data with multiple criteria
- **Features**: Advanced filtering, multiple conditions
- **Examples**: Report filters, advanced search, data refinement

---

## buttons/

> **Purpose**: Action triggers and user interactions
> **Design Philosophy**: Clear intent, consistent sizing, intuitive iconography

### **Button.tsx**
- **Use When**: General actions and form submissions
- **Features**: Multiple variants, loading states, icon support
- **Examples**: Save, Cancel, Submit, primary actions
```tsx
<Button 
  variant="primary" 
  size="md"
  loading={isSaving}
  onClick={handleSave}
>
  Save Changes
</Button>
```

### **ActionButton.tsx**
- **Use When**: Complex actions with icons and descriptions
- **Features**: Icon + text, tooltips, advanced styling
- **Examples**: Dashboard actions, complex operations, featured buttons

### **AddButton.tsx**
- **Use When**: Creating new items
- **Features**: Plus icon, consistent Add styling
- **Examples**: Add client, Create portfolio, New fund
```tsx
<AddButton onClick={handleAddClient} />
```

### **EditButton.tsx**
- **Use When**: Editing existing items
- **Features**: Edit icon, consistent Edit styling
- **Examples**: Edit profile, Modify portfolio, Update details
```tsx
<EditButton onClick={handleEdit} />
```

### **DeleteButton.tsx**
- **Use When**: Removing items (with caution)
- **Features**: Trash icon, warning styling
- **Examples**: Delete records, Remove items, Clear data
```tsx
<DeleteButton onClick={handleDelete} />
```

### **LapseButton.tsx**
- **Use When**: Marking items as lapsed/inactive
- **Features**: Specific to business logic, status changes
- **Examples**: Lapse policies, Deactivate accounts

---

## table-controls/

> **Purpose**: Interactive table management and data manipulation
> **Design Philosophy**: Intuitive icons, smart positioning, non-intrusive until needed

### **TableFilter.tsx**
- **Use When**: Filtering table columns
- **Features**: Multi-select filtering, search within options, smart positioning
- **Icon**: `≡` (three lines) - universally recognized filter symbol
- **Examples**: Filter by status, category, date range, value ranges
```tsx
<TableFilter 
  options={statusOptions}
  values={filterValues}
  onChange={setFilterValues}
  title="Filter by status"
/>
```

### **TableSort.tsx**
- **Use When**: Sorting table columns
- **Features**: Multiple sort types (alphabetical, numerical, date), quick toggle
- **Icons**: `⇅` (inactive), `⤴` (ascending), `⤵` (descending)
- **Examples**: Sort by name, value, date, custom criteria
```tsx
<TableSort 
  currentSort={sortState}
  onSortChange={setSortState}
  sortTypes={['alphabetical', 'numerical']}
  title="Sort client names"
/>
```

**Implementation Example:**
```tsx
<th className="px-4 py-2">
  <div className="flex items-center justify-between">
    <span className="text-xs font-medium text-gray-500">Client Name</span>
    <div className="flex items-center gap-1">
      <TableFilter options={clientOptions} values={filters} onChange={setFilters} />
      <TableSort currentSort={sort} onSortChange={setSort} sortTypes={['alphabetical']} />
    </div>
  </div>
</th>
```

---

## card/

> **Purpose**: Structured data presentation and metric display
> **Design Philosophy**: Clean layouts, consistent spacing, clear visual hierarchy

### **Card.tsx**
- **Use When**: General content containers
- **Features**: Padding, borders, shadows, flexible content
- **Examples**: Dashboard sections, grouped information, content blocks

### **StatCard.tsx**
- **Use When**: Displaying key metrics and statistics
- **Features**: Large numbers, trends, comparisons
- **Examples**: Portfolio values, performance metrics, key indicators
```tsx
<StatCard 
  title="Total Portfolio Value"
  value="£2,450,000"
  change="+12.5%"
  trend="up"
/>
```

### **StatBox.tsx**
- **Use When**: Compact metric display
- **Features**: Smaller format, dense information
- **Examples**: Secondary metrics, dashboard summaries

### **ChangeIndicator.tsx**
- **Use When**: Showing percentage changes and trends
- **Features**: Color coding, directional arrows
- **Examples**: Performance changes, value fluctuations

---

## data-displays/

> **Purpose**: Complex data visualization and presentation
> **Design Philosophy**: Clear information hierarchy, interactive when appropriate

### **DataTable.tsx**
- **Use When**: Structured data presentation
- **Features**: Sorting, pagination, responsive design
- **Examples**: Client lists, transaction tables, portfolio holdings
```tsx
<DataTable 
  columns={columns}
  data={tableData}
  sortable
  pagination
/>
```

### **FundDistributionChart.tsx**
- **Use When**: Visualizing portfolio or fund distributions
- **Features**: Interactive charts, tooltips, legends
- **Examples**: Asset allocation, portfolio breakdown, fund analysis

---

## feedback/

> **Purpose**: User feedback and system state communication
> **Design Philosophy**: Clear communication, non-blocking, helpful guidance

### **Skeleton.tsx**
- **Use When**: Content is loading
- **Features**: Animated placeholders, multiple shapes
- **Examples**: Loading states, data fetching, async operations
```tsx
<Skeleton className="h-4 w-32" />
<Skeleton className="h-8 w-full" />
```

### **TableSkeleton.tsx**
- **Use When**: Table data is loading
- **Features**: Table-specific loading states
- **Examples**: Loading table rows, data fetching

### **EmptyState.tsx**
- **Use When**: No data to display
- **Features**: Helpful messages, action suggestions
- **Examples**: Empty lists, no search results, cleared filters
```tsx
<EmptyState 
  title="No clients found"
  message="Try adjusting your search or filters"
  action={<Button>Add New Client</Button>}
/>
```

### **ErrorDisplay.tsx**
- **Use When**: Showing error states
- **Features**: Error messages, retry actions
- **Examples**: API failures, validation errors, system issues

---

## 🏠 **Specialized Components** *(Remain in main ui/ folder)*

### **ProfileAvatar.tsx**
- **Use When**: User profile display needed
- **Features**: Initials, images, status indicators
- **Examples**: User menus, profile sections, team displays

### **RiskDifferences.tsx** 
- **Use When**: Displaying risk analysis
- **Features**: Business-specific risk calculations
- **Examples**: Portfolio analysis, risk assessments

### **UpcomingMeetings.tsx**
- **Use When**: Showing scheduled events
- **Features**: Calendar integration, meeting details
- **Examples**: Dashboard widgets, scheduling interfaces

---

## 🎨 **Usage Guidelines**

### **Do's**
- ✅ **Consistency**: Always use the same component for the same purpose
- ✅ **Size Variants**: Use appropriate sizes for context (sm for compact, lg for prominent)
- ✅ **Validation**: Include proper error handling and user feedback
- ✅ **Accessibility**: Ensure all components work with screen readers and keyboard navigation
- ✅ **Performance**: Use loading states and skeleton components for async operations

### **Don'ts**
- ❌ **Mix Styles**: Don't create custom variants that break the design system
- ❌ **Skip Validation**: Always include proper error states and user feedback
- ❌ **Ignore Loading**: Don't leave users wondering if something is processing
- ❌ **Inconsistent Sizing**: Use the defined size variants rather than custom dimensions

### **When to Create New Components**
- 🆕 **High Reusability**: Pattern appears 3+ times across the application
- 🆕 **Complex Logic**: Component has sophisticated behavior worth abstracting
- 🆕 **Design System Extension**: New pattern fits within existing design principles
- 🆕 **Team Request**: Multiple developers need the same functionality

---

## 🔄 **Component Selection Decision Tree**

### **For Data Input:**
1. **Text?** → inputs/BaseInput
2. **Numbers/Currency?** → inputs/NumberInput  
3. **Dates?** → inputs/DateInput
4. **Multi-line?** → inputs/TextArea

### **For Selection:**
1. **Single choice?** → dropdowns/BaseDropdown (has built-in keyboard search)
2. **Multiple choices?** → dropdowns/MultiSelectDropdown
3. **Can create new options?** → dropdowns/CreatableDropdown
4. **Allow custom values not in list?** → dropdowns/ComboDropdown

### **For Search:**
1. **Simple search?** → search/SearchInput
2. **Global site search?** → search/GlobalSearch
3. **Autocomplete needed?** → search/AutocompleteSearch
4. **Filter existing data?** → search/FilterSearch

### **For Actions:**
1. **General action?** → buttons/Button
2. **Add new item?** → buttons/AddButton
3. **Edit existing?** → buttons/EditButton
4. **Delete/Remove?** → buttons/DeleteButton

### **For Tables:**
1. **Filter column?** → table-controls/TableFilter
2. **Sort column?** → table-controls/TableSort
3. **Display data?** → data-displays/DataTable

### **For Loading/Empty States:**
1. **Content loading?** → feedback/Skeleton
2. **No data found?** → feedback/EmptyState
3. **Error occurred?** → feedback/ErrorDisplay

---

## 📝 **Implementation Examples**

### **Complete Form Example**
```tsx
<form className="space-y-4">
  <BaseInput 
    label="Client Name" 
    placeholder="Enter client name"
    required
  />
  <NumberInput 
    label="Initial Investment"
    format="currency"
    currency="£"
    required
  />
  <BaseDropdown 
    label="Risk Profile"
    options={riskOptions}
    required
  />
  <DateInput 
    label="Start Date"
    placeholder="dd/mm/yyyy"
    required
  />
  <div className="flex gap-2">
    <Button variant="primary" type="submit">
      Save Client
    </Button>
    <Button variant="secondary" type="button">
      Cancel
    </Button>
  </div>
</form>
```

### **Table with Controls Example**
```tsx
<table className="min-w-full">
  <thead>
    <tr>
      <th className="px-4 py-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-gray-500">Client</span>
          <div className="flex gap-1">
            <TableFilter options={clientFilters} values={filters} onChange={setFilters} />
            <TableSort currentSort={sort} onSortChange={setSort} sortTypes={['alphabetical']} />
          </div>
        </div>
      </th>
    </tr>
  </thead>
  <tbody>
    {loading ? (
      <TableSkeleton rows={5} columns={4} />
    ) : data.length === 0 ? (
      <EmptyState 
        title="No clients found" 
        message="Try adjusting your filters"
      />
    ) : (
      data.map(client => (
        <tr key={client.id}>
          <td className="px-4 py-2">{client.name}</td>
        </tr>
      ))
    )}
  </tbody>
</table>
```

---

## 🚀 **For AI Development**

When building new features or pages, follow this decision process:

1. **Identify the user need** (input, selection, display, action)
2. **Choose from existing components** using this guide
3. **Use consistent patterns** from the examples above
4. **Include proper states** (loading, error, empty, success)
5. **Follow the design system** (colors, spacing, typography)
6. **Test accessibility** (keyboard, screen readers, contrast)

**Remember**: The goal is consistency and user experience. When in doubt, use the most standard component that meets the requirement rather than creating something custom.

---

*This guide is living documentation. Update it when new components are added or patterns change.* 