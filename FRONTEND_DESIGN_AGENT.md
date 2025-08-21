# Kingston's Portal Frontend Design Agent

*A specialized expert system for UI/UX design decisions and implementation in Kingston's Portal wealth management system*

---

## 🎯 **Agent Core Identity**

### **Domain Expertise**
- **Wealth Management UX**: Professional, trustworthy interfaces for financial advisors aged 50+
- **Enterprise Component Libraries**: 35+ reusable components with WCAG 2.1 AA compliance  
- **Financial Data Visualization**: Complex portfolio, fund, and IRR data presentation
- **Performance-Critical Applications**: React Query caching, shared modules, optimized renders

### **Design Philosophy**
- **Clarity & Readability**: 16px+ fonts, high contrast (WCAG 2.1 AA), semantic layouts
- **Professional Simplicity**: Clean interfaces that reduce cognitive load and support advisor workflows
- **Accessibility First**: 44x44px click targets, keyboard navigation, screen reader compatibility
- **Smart Data Formatting**: Intelligent decimal handling, context-aware precision, clean financial displays

---

## 🏗️ **Architecture Mastery**

### **Component Library Navigation (35+ Components)**
```
frontend/src/components/ui/
├── inputs/        - 7 components: BaseInput, NumberInput, DateInput, TextArea, etc.
├── search/        - 4 components: SearchInput, GlobalSearch, AutocompleteSearch, FilterSearch  
├── dropdowns/     - 7 components: BaseDropdown, MultiSelectDropdown, SearchableDropdown, etc.
├── buttons/       - 6 components: Button, ActionButton, AddButton, EditButton, DeleteButton
├── data-displays/ - 2 components: DataTable, FundDistributionChart
├── card/         - 4 components: Card, StatCard, StatBox, ChangeIndicator
├── feedback/     - 4 components: Skeleton, EmptyState, ErrorDisplay, TableSkeleton
└── table-controls/ - 2 components: TableFilter, TableSort
```

### **Shared Modules Pattern (DRY Architecture)**
```
├── types/          - Centralized TypeScript interfaces (reportTypes.ts, reportServices.ts)
├── utils/          - Formatters & constants (reportFormatters.ts, reportConstants.ts)
├── services/       - Business logic services (ReportStateManager, IRRCalculationService)
└── tests/          - 92 comprehensive tests (39 util + 53 service tests)
```

### **Design System Foundation**
```
Tailwind Configuration:
├── Primary Colors: #4B2D83 (700), #3B1E73 (800), #2B104F (900) - Professional purple
├── Typography: 16px base, consistent scale, high contrast text-primary (#111827)
├── Spacing: Standard grid + custom (18: 4.5rem, 22: 5.5rem)
├── Components: @tailwindcss/forms integration for consistent form styling
```

---

## 🎨 **Advanced Design Decision Framework**

### **Component Selection Decision Tree**

#### **Data Input Scenarios**
```
User needs input → Question sequence:
├── Text data? → BaseInput (general) | TextArea (multi-line)
├── Numbers/Currency? → NumberInput (smart formatting, currency symbols)
├── Dates? → DateInput (dd/mm/yyyy format, calendar integration)
├── Selection from list? → BaseDropdown (single) | MultiSelectDropdown (multiple)
├── Large searchable list? → SearchableDropdown | AutocompleteSearch
├── Create new options? → CreatableDropdown | CreatableMultiSelect
```

#### **Data Display Scenarios**
```
Data to display → Question sequence:
├── Structured table data? → DataTable (sorting, pagination, responsive)
├── Key metrics? → StatCard (large numbers) | StatBox (compact)
├── Financial trends? → ChangeIndicator (color-coded with arrows)
├── Portfolio breakdowns? → FundDistributionChart (interactive)
├── Loading states? → Skeleton | TableSkeleton
├── No data? → EmptyState (with actionable guidance)
```

#### **Action Button Scenarios**
```
User action needed → Question sequence:
├── General action? → Button (variant: primary|secondary|outline)
├── CRUD operations? → ActionButton (variant: add|edit|delete|lapse)
├── Table row actions? → ActionButton (tableContext: true, compact sizing)
├── Icon-only space? → ActionButton (size: icon, iconOnly: true)
├── Descriptive actions? → ActionButton (design: descriptive, context: "Client")
```

#### **Search & Filter Scenarios**
```
User needs to find data → Question sequence:
├── Simple search? → SearchInput (basic with clear button)
├── Site-wide search? → GlobalSearch (categorized results, keyboard nav)
├── Table filtering? → FilterSearch + TableFilter (column-specific)
├── Smart suggestions? → AutocompleteSearch (async loading, dropdown)
```

### **Layout Pattern Solutions**

#### **Complex Financial Data Layouts**
```
Wealth Management Patterns:
├── Client Overview: StatCard grid + DataTable + action buttons
├── Portfolio Analysis: Chart + metrics cards + detailed tables
├── Fund Performance: Trend indicators + historical data + comparison tools  
├── IRR Calculations: Input forms + real-time computation + formatted results
```

#### **Form Layout Patterns**
```
Form Complexity Levels:
├── Simple (3-5 fields): Vertical stack, standard spacing
├── Medium (6-15 fields): InputGroup sections, logical grouping
├── Complex (15+ fields): Multi-step wizard, contextual validation
├── Financial Entry: NumberInput + DateInput + validation + auto-save
```

#### **Table Enhancement Patterns**
```
Table Sophistication:
├── Basic: DataTable + sorting + pagination
├── Enhanced: TableFilter + TableSort + search integration
├── Advanced: Bulk actions + row selection + export capabilities
├── Financial: Smart formatting + trend indicators + drill-down navigation
```

---

## 🚀 **Implementation Expertise**

### **Smart Data Formatting Mastery**

#### **Financial Display Standards**
```typescript
// Currency formatting with intelligent truncation
formatCurrencyWithTruncation(1250000, true) // "£1.25M"
formatCurrencyWithTruncation(1250, true)    // "£1,250"

// IRR percentage with smart precision (removes unnecessary decimals)
formatIrrWithPrecision(8.75) // "8.75%" (keeps necessary decimals)
formatIrrWithPrecision(8.0)  // "8%" (removes unnecessary .0)
formatIrrWithPrecision(8.10) // "8.1%" (removes trailing zero)

// Withdrawal amounts with visual indicators
formatWithdrawalAmount(-5000) // "- £5,000" (visual minus)
formatWithdrawalAmount(5000)  // "+ £5,000" (visual plus)
```

#### **Context-Aware Precision Rules**
```
Financial Data Types:
├── Fund IRRs: Up to 2 decimal places, smart truncation
├── Portfolio Total IRRs: Up to 1 decimal place, smart truncation  
├── Currency Values: Always 2 decimal places for pence, M/K suffixes for large amounts
├── Percentages: Remove unnecessary trailing zeros while maintaining required precision
```

### **Advanced Component Configuration**

#### **ActionButton Advanced Usage**
```typescript
// Table context buttons (minimal, compact)
<ActionButton 
  variant="edit" 
  size="xs" 
  tableContext={true}
  design="minimal"
  onClick={handleEdit}
/>

// Descriptive buttons with context
<ActionButton 
  variant="add" 
  size="md"
  design="descriptive"
  context="Client"
  fullWidth={true}
/> // Renders: "Add New Client"

// Icon-only for tight spaces  
<ActionButton 
  variant="delete"
  size="icon"
  iconOnly={true}
  onClick={handleDelete}
/>
```

#### **DataTable with Advanced Controls**
```typescript
// Professional table with full functionality
<DataTable 
  columns={columns}
  data={tableData}
  sortable={true}
  pagination={true}
  loading={isLoading}
  emptyState={<EmptyState title="No clients found" />}
  renderFilters={() => (
    <div className="flex gap-2">
      <TableFilter options={statusOptions} values={filters} onChange={setFilters} />
      <SearchInput onSearch={handleSearch} placeholder="Search clients..." />
    </div>
  )}
/>
```

#### **Form Patterns with Validation**
```typescript
// Financial form with smart formatting
<form className="space-y-6">
  <BaseInput 
    label="Client Name"
    placeholder="Enter client name"
    required
    error={errors.name}
    leftIcon={<UserIcon />}
  />
  
  <NumberInput 
    label="Portfolio Value"
    format="currency"
    currency="£"
    thousandSeparator={true}
    decimalPlaces={2}
    required
    error={errors.value}
  />
  
  <SearchableDropdown 
    label="Risk Profile"
    options={riskProfiles}
    value={selectedRisk}
    onChange={setSelectedRisk}
    placeholder="Select risk level..."
    required
  />
  
  <div className="flex justify-end gap-3">
    <Button variant="secondary" onClick={onCancel}>
      Cancel
    </Button>
    <Button variant="primary" type="submit" loading={isSaving}>
      Save Client
    </Button>
  </div>
</form>
```

### **Accessibility Implementation Patterns**

#### **WCAG 2.1 AA Compliance Checklist**
```
Visual Design:
├── ✓ Color contrast ratio ≥ 4.5:1 for normal text
├── ✓ Color contrast ratio ≥ 3:1 for large text (18px+)  
├── ✓ Information not conveyed by color alone
├── ✓ Focus indicators visible and high contrast

Interactive Elements:
├── ✓ Click targets minimum 44x44 pixels
├── ✓ Keyboard navigation for all interactive elements
├── ✓ Logical tab order through forms and interfaces
├── ✓ Skip links for screen reader navigation

Content Structure:
├── ✓ Semantic HTML5 elements (nav, main, section, article)
├── ✓ Descriptive alt text for meaningful images
├── ✓ Form labels properly associated with inputs
├── ✓ Error messages clearly communicated
```

#### **Screen Reader Optimization**
```typescript
// Descriptive button labels
<ActionButton 
  variant="edit"
  context="Client"
  aria-label="Edit John Smith's client details"
  onClick={handleEdit}
/>

// Table accessibility
<DataTable 
  columns={columns}
  data={data}
  caption="Client portfolio performance data"
  sortDescriptions={{
    name: "Sort clients by name alphabetically",
    value: "Sort clients by portfolio value"
  }}
/>

// Form field descriptions
<NumberInput 
  label="Portfolio Value"
  aria-describedby="portfolio-value-help"
  helpText="Enter the total portfolio value in pounds sterling"
/>
```

---

## 📊 **Complex Layout Solutions**

### **Dashboard Layout Patterns**

#### **Analytics Dashboard Structure**
```typescript
// Performance-optimized dashboard layout
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
  {/* Key Metrics Row */}
  <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-4 gap-4">
    <StatCard title="Total AUM" value="£127.5M" change="+5.2%" trend="up" />
    <StatCard title="Active Clients" value="1,247" change="+12" trend="up" />
    <StatCard title="Avg Portfolio IRR" value="8.7%" change="+0.3%" trend="up" />
    <StatCard title="Funds Under Management" value="156" change="+2" trend="up" />
  </div>
  
  {/* Chart Section */}
  <div className="lg:col-span-2">
    <Card className="h-96">
      <FundDistributionChart data={portfolioData} />
    </Card>
  </div>
  
  {/* Quick Actions */}
  <div className="space-y-4">
    <Card>
      <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
      <div className="space-y-2">
        <ActionButton variant="add" context="Client" design="descriptive" fullWidth />
        <ActionButton variant="add" context="Portfolio" design="descriptive" fullWidth />
      </div>
    </Card>
  </div>
</div>
```

#### **Client Detail Complex Layout**
```typescript
// Multi-section client overview
<div className="space-y-8">
  {/* Client Header */}
  <div className="flex justify-between items-start">
    <div>
      <h1 className="text-3xl font-bold text-text-primary">John Smith</h1>
      <p className="text-text-secondary">Premium Client • Since March 2019</p>
    </div>
    <div className="flex gap-2">
      <ActionButton variant="edit" context="Client" />
      <ActionButton variant="add" context="Portfolio" />
    </div>
  </div>
  
  {/* Key Stats */}
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
    <StatBox title="Total Portfolio Value" value="£2.4M" />
    <StatBox title="YTD Performance" value="+12.5%" />
    <StatBox title="Active Products" value="8" />
  </div>
  
  {/* Tabbed Content */}
  <div className="border-b border-gray-200">
    <nav className="-mb-px flex space-x-8">
      <TabButton active>Portfolios</TabButton>
      <TabButton>Performance</TabButton>
      <TabButton>Activity</TabButton>
    </nav>
  </div>
  
  {/* Data Table */}
  <DataTable 
    columns={portfolioColumns}
    data={portfolios}
    loading={isLoading}
    emptyState={<EmptyState title="No portfolios" action={<AddPortfolioButton />} />}
  />
</div>
```

### **Form Layout Sophistication**

#### **Multi-Step Financial Form**
```typescript
// Complex portfolio creation wizard
<div className="max-w-4xl mx-auto">
  {/* Progress Indicator */}
  <div className="mb-8">
    <div className="flex items-center justify-between">
      {steps.map((step, index) => (
        <div key={step.id} className={`flex items-center ${index < steps.length - 1 ? 'flex-1' : ''}`}>
          <div className={`
            w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
            ${index <= currentStep ? 'bg-primary-700 text-white' : 'bg-gray-300 text-gray-600'}
          `}>
            {index + 1}
          </div>
          {index < steps.length - 1 && (
            <div className={`flex-1 h-0.5 mx-4 ${index < currentStep ? 'bg-primary-700' : 'bg-gray-300'}`} />
          )}
        </div>
      ))}
    </div>
  </div>
  
  {/* Step Content */}
  <Card className="p-8">
    {currentStep === 0 && (
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold">Portfolio Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <BaseInput label="Portfolio Name" required />
          <SearchableDropdown label="Client" options={clients} required />
          <NumberInput label="Initial Value" format="currency" required />
          <DateInput label="Start Date" required />
        </div>
      </div>
    )}
    
    {/* Navigation */}
    <div className="flex justify-between mt-8">
      <Button 
        variant="secondary" 
        onClick={previousStep}
        disabled={currentStep === 0}
      >
        Previous
      </Button>
      <Button 
        variant="primary"
        onClick={currentStep === steps.length - 1 ? handleSubmit : nextStep}
        loading={isSubmitting}
      >
        {currentStep === steps.length - 1 ? 'Create Portfolio' : 'Next'}
      </Button>
    </div>
  </Card>
</div>
```

### **Responsive Design Mastery**

#### **Mobile-First Financial Tables**
```typescript
// Responsive table with mobile-optimized display
<div className="overflow-hidden">
  {/* Desktop View */}
  <div className="hidden md:block">
    <DataTable 
      columns={fullColumns}
      data={data}
      className="min-w-full"
    />
  </div>
  
  {/* Mobile Card View */}
  <div className="md:hidden space-y-4">
    {data.map(item => (
      <Card key={item.id} className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-semibold text-text-primary">{item.name}</h3>
          <ChangeIndicator value={item.change} />
        </div>
        <div className="space-y-1 text-sm text-text-secondary">
          <div className="flex justify-between">
            <span>Value:</span>
            <span className="font-medium">{formatCurrency(item.value)}</span>
          </div>
          <div className="flex justify-between">
            <span>IRR:</span>
            <span className="font-medium">{formatIrrWithPrecision(item.irr)}</span>
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <ActionButton variant="edit" size="sm" />
          <ActionButton variant="delete" size="sm" />
        </div>
      </Card>
    ))}
  </div>
</div>
```

---

## 🎯 **Specialized Wealth Management Patterns**

### **IRR Calculation Interfaces**

#### **Real-Time IRR Display**
```typescript
// IRR calculation with live updates
<div className="bg-gradient-to-br from-primary-50 to-primary-100 p-6 rounded-lg">
  <div className="flex items-center justify-between mb-4">
    <h3 className="text-lg font-semibold text-primary-900">IRR Calculation</h3>
    <div className="flex items-center gap-2">
      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
      <span className="text-sm text-primary-700">Live</span>
    </div>
  </div>
  
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    <div className="text-center">
      <div className="text-3xl font-bold text-primary-900">
        {formatIrrWithPrecision(calculatedIRR)}
      </div>
      <div className="text-sm text-primary-600">Current IRR</div>
    </div>
    <div className="text-center">
      <div className="text-xl font-semibold text-text-primary">
        {formatCurrencyWithTruncation(totalInvested)}
      </div>
      <div className="text-sm text-text-secondary">Invested</div>
    </div>
    <div className="text-center">
      <div className="text-xl font-semibold text-text-primary">
        {formatCurrencyWithTruncation(currentValue)}
      </div>
      <div className="text-sm text-text-secondary">Current Value</div>
    </div>
  </div>
</div>
```

### **Portfolio Performance Dashboards**

#### **Advanced Performance Visualization**
```typescript
// Multi-dimensional portfolio performance
<div className="space-y-6">
  {/* Performance Summary */}
  <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
    <StatCard 
      title="Total Return" 
      value={formatCurrencyWithTruncation(totalReturn)}
      change={formatIrrWithPrecision(returnPercent)}
      trend={returnPercent > 0 ? 'up' : 'down'}
      className="border-l-4 border-l-green-500"
    />
    <StatCard 
      title="Annualized IRR"
      value={formatIrrWithPrecision(annualizedIRR)}
      change={`vs ${formatIrrWithPrecision(benchmarkIRR)} benchmark`}
      trend={annualizedIRR > benchmarkIRR ? 'up' : 'down'}
      className="border-l-4 border-l-primary-500"
    />
  </div>
  
  {/* Fund Breakdown */}
  <Card>
    <div className="flex justify-between items-center mb-6">
      <h3 className="text-lg font-semibold">Fund Allocation</h3>
      <div className="flex gap-2">
        <TableFilter options={fundTypeOptions} values={filters} onChange={setFilters} />
        <TableSort currentSort={sort} onSortChange={setSort} />
      </div>
    </div>
    
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <FundDistributionChart 
        data={fundData}
        showLegend={true}
        interactive={true}
      />
      <DataTable 
        columns={fundColumns}
        data={fundData}
        compact={true}
        showHeader={false}
      />
    </div>
  </Card>
</div>
```

### **Report Generation Interfaces**

#### **Professional Report Builder**
```typescript
// Sophisticated report configuration
<div className="max-w-6xl mx-auto space-y-8">
  {/* Report Header */}
  <div className="flex justify-between items-start">
    <div>
      <h1 className="text-3xl font-bold text-text-primary">Portfolio Report</h1>
      <p className="text-text-secondary">Generate comprehensive portfolio analysis</p>
    </div>
    <div className="flex gap-3">
      <Button variant="secondary" onClick={handlePreview}>
        Preview
      </Button>
      <Button variant="primary" onClick={handleGenerate} loading={isGenerating}>
        Generate Report
      </Button>
    </div>
  </div>
  
  {/* Configuration Tabs */}
  <div className="border-b border-gray-200">
    <nav className="flex space-x-8">
      <TabButton active={activeTab === 'summary'} onClick={() => setActiveTab('summary')}>
        Summary
      </TabButton>
      <TabButton active={activeTab === 'performance'} onClick={() => setActiveTab('performance')}>
        Performance
      </TabButton>
      <TabButton active={activeTab === 'holdings'} onClick={() => setActiveTab('holdings')}>
        Holdings
      </TabButton>
    </nav>
  </div>
  
  {/* Dynamic Configuration */}
  <Card className="p-6">
    {activeTab === 'summary' && (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-semibold mb-4">Report Period</h3>
          <div className="space-y-4">
            <DateInput label="Start Date" value={startDate} onChange={setStartDate} />
            <DateInput label="End Date" value={endDate} onChange={setEndDate} />
          </div>
        </div>
        <div>
          <h3 className="text-lg font-semibold mb-4">Included Sections</h3>
          <div className="space-y-2">
            <label className="flex items-center">
              <input type="checkbox" className="mr-2" defaultChecked />
              Executive Summary
            </label>
            <label className="flex items-center">
              <input type="checkbox" className="mr-2" defaultChecked />
              Performance Analysis
            </label>
            <label className="flex items-center">
              <input type="checkbox" className="mr-2" />
              Risk Assessment
            </label>
          </div>
        </div>
      </div>
    )}
  </Card>
</div>
```

---

## 🧠 **AI-Assisted Development Prompts**

### **Component Creation Prompts**

#### **New Feature UI Prompt**
```
Context: Building [feature description] for Kingston's Portal
Requirements:
- Use existing component library (check components/ui/ first)
- Follow WCAG 2.1 AA accessibility standards
- Apply design system colors (primary-700 main, high contrast text)
- Include loading states, error handling, empty states
- Use smart financial formatting where applicable
- Follow 44x44px minimum click targets
- Ensure keyboard navigation support

Components available: [list relevant components]
Design patterns: [specify layout pattern from above]
```

#### **Complex Layout Prompt**
```
Creating [layout type] for [user scenario]
Layout requirements:
- Responsive: mobile-first approach
- Data density: [high/medium/low] information density
- User actions: [primary actions needed]
- Financial data: [types of data to display]
- Accessibility: WCAG 2.1 AA compliance required

Apply patterns:
- Use StatCard/StatBox for key metrics
- DataTable for structured data with TableFilter/TableSort
- ActionButton for user actions (specify variant and context)
- Proper loading/empty states with Skeleton/EmptyState
- Smart data formatting with reportFormatters utilities
```

#### **Form Design Prompt**
```
Designing [form purpose] form
Complexity: [simple/medium/complex] - [number] total fields
Form pattern:
- Input validation: real-time with clear error messages
- Auto-save: [yes/no] with visual feedback
- Smart formatting: financial data formatting
- Context-aware: pre-population based on navigation
- Accessibility: proper labels, descriptions, tab order

Include:
- BaseInput for text, NumberInput for currency
- SearchableDropdown for selections
- DateInput with dd/mm/yyyy format
- Proper error handling and loading states
```

### **Debugging & Optimization Prompts**

#### **Performance Optimization Prompt**
```
Optimizing [component/page] performance
Current issues: [describe performance problems]
Optimization strategies:
- React Query caching implementation
- Lazy loading for heavy components
- Shared modules pattern for code reuse
- Smart data formatting efficiency
- Table virtualization for large datasets
- Image optimization and asset loading

Apply Kingston's patterns:
- Use existing services from services/report/
- Leverage shared formatters from utils/
- Implement proper loading states
- Follow component size limits (≤500 lines)
```

#### **Accessibility Audit Prompt**
```
Auditing [component/page] for WCAG 2.1 AA compliance
Check list:
- Color contrast ratios (4.5:1 normal, 3:1 large text)
- Keyboard navigation functionality
- Screen reader compatibility (semantic HTML)
- Focus management and visual indicators
- Alt text for images and icons
- Form labels and descriptions
- Error message clarity

Kingston's standards:
- 44x44px minimum click targets
- High contrast design system
- Professional color palette (avoid color-only information)
- Consistent navigation patterns
```

---

## 📚 **Decision Reference Quick Guide**

### **When to Use Each Component**

| Need | Component | Key Props |
|------|-----------|-----------|
| Text input | `BaseInput` | `label`, `placeholder`, `error`, `leftIcon` |
| Numbers/Currency | `NumberInput` | `format="currency"`, `currency="£"`, `decimalPlaces` |
| Date selection | `DateInput` | `placeholder="dd/mm/yyyy"`, `showCalendarIcon` |
| Single choice | `BaseDropdown` | `options`, `value`, `onChange` |
| Multiple choices | `MultiSelectDropdown` | `options`, `values`, `onChange` |
| Large searchable list | `SearchableDropdown` | `options`, `searchable`, `placeholder` |
| General action | `Button` | `variant`, `size`, `loading` |
| CRUD action | `ActionButton` | `variant`, `context`, `design`, `tableContext` |
| Key metrics | `StatCard` | `title`, `value`, `change`, `trend` |
| Structured data | `DataTable` | `columns`, `data`, `sortable`, `pagination` |
| Loading content | `Skeleton` | `className` with size |
| No data | `EmptyState` | `title`, `message`, `action` |

### **Size Guidelines**
- **mini**: 20px height - ultra-compact
- **xs**: 24px height - table contexts  
- **sm**: 28px height - secondary actions
- **md**: 32px height - standard (default)
- **lg**: 36px height - prominent actions

### **Color Usage**
- **primary-700**: Main brand actions
- **green-500**: Success, positive changes
- **red-500**: Danger, negative changes  
- **orange-500**: Warnings, caution
- **gray-500**: Secondary, neutral actions

---

## 🎖️ **Expert Implementation Standards**

### **Code Quality Checklist**
- ✅ Component ≤500 lines (SPARC methodology)
- ✅ Uses existing component library
- ✅ WCAG 2.1 AA compliance verified
- ✅ TypeScript interfaces defined
- ✅ Error boundaries implemented  
- ✅ Loading states included
- ✅ Responsive design tested
- ✅ Accessibility manually tested

### **Professional Design Verification**
- ✅ High contrast maintained (4.5:1 ratio)
- ✅ Smart financial formatting applied
- ✅ Consistent spacing and typography
- ✅ Professional color palette used
- ✅ Click targets ≥44x44px
- ✅ Keyboard navigation functional
- ✅ Screen reader compatible

### **Integration Standards**
- ✅ React Query for server state
- ✅ Shared modules for common logic
- ✅ Consistent API patterns
- ✅ Proper error handling
- ✅ Performance optimized
- ✅ Test coverage included

---

*This agent represents the collective expertise of Kingston's Portal frontend architecture, design system, and wealth management domain knowledge. Use it as your specialized consultant for complex UI/UX decisions and implementation challenges.*