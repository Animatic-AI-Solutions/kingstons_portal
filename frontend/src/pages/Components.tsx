import React, { useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  BaseInput,
  NumberInput,
  TextArea,
  DateInput,
  InputLabel,
  InputError,
  InputGroup,
  InputRow,
  SearchInput,
  GlobalSearch,
  FilterSearch,
  AutocompleteSearch,
  BaseDropdown,
  MultiSelectDropdown,
  CreatableDropdown,
  CreatableMultiSelect,
  ComboDropdown,
  ActionButton,
  EditButton,
  AddButton,
  DeleteButton,
  LapseButton
} from '../components/ui';
import TableFilter from '../components/ui/table-controls/TableFilter';
import TableSort from '../components/ui/table-controls/TableSort';
import StandardTable from '../components/StandardTable';
import { 
  UserIcon, 
  EnvelopeIcon, 
  PhoneIcon,
  BuildingOfficeIcon,
  CurrencyDollarIcon,
  MagnifyingGlassIcon,
  TagIcon,
  UserGroupIcon,
  BriefcaseIcon
} from '@heroicons/react/24/outline';

// Move these components outside to prevent recreation on every render
const ComponentSection: React.FC<{ title: string; description: string; children: React.ReactNode }> = ({ 
  title, 
  description, 
  children 
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
    className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8"
  >
    <div className="mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {children}
    </div>
  </motion.div>
);

const ExampleCard: React.FC<{ title: string; description: string; children: React.ReactNode }> = ({ 
  title, 
  description, 
  children 
}) => (
  <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
    <div className="mb-3">
      <h4 className="text-sm font-medium text-gray-900 mb-1">{title}</h4>
      <p className="text-xs text-gray-500">{description}</p>
    </div>
    <div className="space-y-3">
      {children}
    </div>
  </div>
);

const Components: React.FC = () => {
  // State for examples
  const [textValue, setTextValue] = useState('');
  const [emailValue, setEmailValue] = useState('');
  const [currencyValue, setCurrencyValue] = useState(0);
  const [textAreaValue, setTextAreaValue] = useState('');
  const [dateValue, setDateValue] = useState<Date | undefined>(undefined);
  const [searchValue, setSearchValue] = useState('');
  const [filterValue, setFilterValue] = useState('');
  const [dropdownValue, setDropdownValue] = useState('');
  const [multiSelectValues, setMultiSelectValues] = useState<string[]>([]);
  
  // Group 5: Filter and Sort states
  const [tableFilterValues, setTableFilterValues] = useState<(string | number)[]>([]);
  const [tableSortState, setTableSortState] = useState<{ type: 'alphabetical' | 'numerical' | 'date' | 'custom'; direction: 'asc' | 'desc' | null }>({ type: 'alphabetical', direction: null });
  
  // Mock table states for comprehensive testing
  const [clientFilterValues, setClientFilterValues] = useState<(string | number)[]>([]);
  const [statusFilterValues, setStatusFilterValues] = useState<(string | number)[]>([]);
  const [valueFilterValues, setValueFilterValues] = useState<(string | number)[]>([]);
  const [dateFilterValues, setDateFilterValues] = useState<(string | number)[]>([]);
  
  const [clientSort, setClientSort] = useState<{ type: 'alphabetical' | 'numerical' | 'date' | 'custom'; direction: 'asc' | 'desc' | null }>({ type: 'alphabetical', direction: null });
  const [valueSort, setValueSort] = useState<{ type: 'alphabetical' | 'numerical' | 'date' | 'custom'; direction: 'asc' | 'desc' | null }>({ type: 'numerical', direction: null });
  const [statusSort, setStatusSort] = useState<{ type: 'alphabetical' | 'numerical' | 'date' | 'custom'; direction: 'asc' | 'desc' | null }>({ type: 'alphabetical', direction: null });
  const [dateSort, setDateSort] = useState<{ type: 'alphabetical' | 'numerical' | 'date' | 'custom'; direction: 'asc' | 'desc' | null }>({ type: 'date', direction: null });

  // Sample data - memoized to prevent recreation
  const countryOptions = useMemo(() => [
    { value: 'us', label: 'United States' },
    { value: 'uk', label: 'United Kingdom' },
    { value: 'ca', label: 'Canada' },
    { value: 'au', label: 'Australia' }
  ], []);

  const skillOptions = useMemo(() => [
    { value: 'javascript', label: 'JavaScript' },
    { value: 'typescript', label: 'TypeScript' },
    { value: 'react', label: 'React' },
    { value: 'nodejs', label: 'Node.js' }
  ], []);

  // Group 5: Filter options for table components
  const statusFilterOptions = useMemo(() => [
    { value: 'active', label: 'Active' },
    { value: 'pending', label: 'Pending' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' }
  ], []);

  const categoryFilterOptions = useMemo(() => [
    { value: 'equity', label: 'Equity Funds' },
    { value: 'bond', label: 'Bond Funds' },
    { value: 'mixed', label: 'Mixed Assets' },
    { value: 'property', label: 'Property' },
    { value: 'alternative', label: 'Alternative Investments' }
  ], []);

  // Mock table filter options
  const clientFilterOptions = useMemo(() => [
    { value: 'acme', label: 'Acme Corporation' },
    { value: 'global', label: 'Global Investments Ltd' },
    { value: 'tech', label: 'Tech Solutions Inc' },
    { value: 'financial', label: 'Financial Holdings' },
    { value: 'property', label: 'Property Partners' }
  ], []);

  const tableStatusFilterOptions = useMemo(() => [
    { value: 'active', label: 'Active' },
    { value: 'pending', label: 'Pending Review' },
    { value: 'completed', label: 'Completed' },
    { value: 'on-hold', label: 'On Hold' }
  ], []);

  const valueRangeFilterOptions = useMemo(() => [
    { value: 'high', label: '> £100k' },
    { value: 'medium-high', label: '£50k - £100k' },
    { value: 'medium', label: '£25k - £50k' },
    { value: 'low', label: '< £25k' }
  ], []);

  const dateRangeFilterOptions = useMemo(() => [
    { value: 'this-week', label: 'This Week' },
    { value: 'this-month', label: 'This Month' },
    { value: 'last-month', label: 'Last Month' },
    { value: 'this-quarter', label: 'This Quarter' },
    { value: 'last-quarter', label: 'Last Quarter' }
  ], []);

  // Mock table data
  const mockTableData = useMemo(() => [
    { id: 1, client: 'Acme Corporation', value: 125000, status: 'active', lastUpdated: '2024-01-15' },
    { id: 2, client: 'Global Investments Ltd', value: 89500, status: 'pending', lastUpdated: '2024-01-12' },
    { id: 3, client: 'Tech Solutions Inc', value: 156750, status: 'active', lastUpdated: '2024-01-18' },
    { id: 4, client: 'Financial Holdings', value: 45200, status: 'completed', lastUpdated: '2024-01-10' },
    { id: 5, client: 'Property Partners', value: 203400, status: 'on-hold', lastUpdated: '2024-01-14' }
  ], []);

  // StandardTable mock data - comprehensive test data
  const standardTableData = useMemo(() => [
    {
      clientName: "Smith Family Trust",
      type: "Family",
      status: "Active",
      aum: 2450000,
      fundCount: 5,
      lastReview: "2024-01-15",
      riskLevel: "Conservative",
      advisor: "John Davidson",
      performanceYTD: 0.125
    },
    {
      clientName: "Global Tech Industries Ltd",
      type: "Corporate",
      status: "Active",
      aum: 5200000,
      fundCount: 12,
      lastReview: "2024-01-20",
      riskLevel: "Aggressive",
      advisor: "Sarah Mitchell",
      performanceYTD: 0.186
    },
    {
      clientName: "Johnson Pension Scheme",
      type: "Pension",
      status: "Pending",
      aum: 1850000,
      fundCount: 8,
      lastReview: "2024-01-10",
      riskLevel: "Moderate",
      advisor: "David Wilson",
      performanceYTD: 0.092
    },
    {
      clientName: "Williams Investment Trust",
      type: "Trust",
      status: "Active",
      aum: 3750000,
      fundCount: 7,
      lastReview: "2024-01-25",
      riskLevel: "Balanced",
      advisor: "Emma Thompson",
      performanceYTD: 0.154
    },
    {
      clientName: "Brown Holdings Ltd",
      type: "Corporate",
      status: "Inactive",
      aum: 890000,
      fundCount: 3,
      lastReview: "2023-12-15",
      riskLevel: "Conservative",
      advisor: "Michael Clark",
      performanceYTD: 0.067
    },
    {
      clientName: "Davis Charitable Foundation",
      type: "Foundation",
      status: "Active",
      aum: 6200000,
      fundCount: 15,
      lastReview: "2024-01-22",
      riskLevel: "Balanced",
      advisor: "Laura Anderson",
      performanceYTD: 0.143
    },
    {
      clientName: "Miller Retirement Fund",
      type: "Pension",
      status: "Active",
      aum: 4100000,
      fundCount: 9,
      lastReview: "2024-01-18",
      riskLevel: "Moderate",
      advisor: "Robert Taylor",
      performanceYTD: 0.118
    },
    {
      clientName: "Wilson Family Office",
      type: "Family",
      status: "Pending",
      aum: 8500000,
      fundCount: 20,
      lastReview: "2024-01-12",
      riskLevel: "Aggressive",
      advisor: "Jennifer White",
      performanceYTD: 0.201
    }
  ], []);

  const standardTableColumns = useMemo(() => [
    { key: 'clientName', label: 'Client Name', dataType: 'text' as const, control: 'auto' as const },
    { key: 'type', label: 'Type', dataType: 'category' as const, control: 'auto' as const },
    { key: 'status', label: 'Status', dataType: 'category' as const, control: 'auto' as const },
    { key: 'aum', label: 'AUM', dataType: 'currency' as const, control: 'auto' as const },
    { key: 'fundCount', label: 'Funds', dataType: 'number' as const, control: 'auto' as const },
    { key: 'lastReview', label: 'Last Review', dataType: 'date' as const, control: 'auto' as const },
    { key: 'riskLevel', label: 'Risk Level', dataType: 'category' as const, control: 'auto' as const },
    { key: 'advisor', label: 'Advisor', dataType: 'text' as const, control: 'auto' as const },
    { key: 'performanceYTD', label: 'YTD Performance', dataType: 'percentage' as const, control: 'auto' as const }
  ], []);

  // Memoized callback functions to prevent re-renders
  const handleSearch = useCallback((value: string) => {
    console.log('Search:', value);
  }, []);

  const handleFilter = useCallback((value: string) => {
    console.log('Filter:', value);
  }, []);

  const handleSelect = useCallback((option: any) => {
    console.log('Selected:', option);
  }, []);

  const handleCreateOption = useCallback(async (inputValue: string) => {
    console.log('Creating new option:', inputValue);
    return {
      value: inputValue.toLowerCase().replace(/\s/g, '-'),
      label: inputValue
    };
  }, []);

  // Memoized state setters
  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTextValue(e.target.value);
  }, []);

  const handleEmailChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEmailValue(e.target.value);
  }, []);

  const handleCurrencyChange = useCallback((value: number | null) => {
    setCurrencyValue(value || 0);
  }, []);

  const handleTextAreaChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTextAreaValue(e.target.value);
  }, []);

  const handleDateChange = useCallback((date: Date | null, formatted: string) => {
    setDateValue(date || undefined);
    console.log('Date selected:', date, 'Formatted:', formatted);
  }, []);

  const handleDropdownChange = useCallback((value: string | number) => {
    setDropdownValue(value as string);
  }, []);

  const handleMultiSelectChange = useCallback((values: (string | number)[]) => {
    setMultiSelectValues(values as string[]);
  }, []);

  // Group 5: Filter and Sort handlers
  const handleTableFilterChange = useCallback((values: (string | number)[]) => {
    setTableFilterValues(values);
    console.log('Table filter changed:', values);
  }, []);

  const handleTableSortChange = useCallback((type: 'alphabetical' | 'numerical' | 'date' | 'custom', direction: 'asc' | 'desc' | null) => {
    setTableSortState({ type, direction });
    console.log('Table sort changed:', { type, direction });
  }, []);

  // Mock table handlers
  const handleClientFilterChange = useCallback((values: (string | number)[]) => {
    setClientFilterValues(values);
    console.log('Client filter changed:', values);
  }, []);

  const handleStatusFilterChange = useCallback((values: (string | number)[]) => {
    setStatusFilterValues(values);
    console.log('Status filter changed:', values);
  }, []);

  const handleValueFilterChange = useCallback((values: (string | number)[]) => {
    setValueFilterValues(values);
    console.log('Value filter changed:', values);
  }, []);

  const handleDateFilterChange = useCallback((values: (string | number)[]) => {
    setDateFilterValues(values);
    console.log('Date filter changed:', values);
  }, []);

  const handleClientSortChange = useCallback((type: 'alphabetical' | 'numerical' | 'date' | 'custom', direction: 'asc' | 'desc' | null) => {
    setClientSort({ type, direction });
    console.log('Client sort changed:', { type, direction });
  }, []);

  const handleValueSortChange = useCallback((type: 'alphabetical' | 'numerical' | 'date' | 'custom', direction: 'asc' | 'desc' | null) => {
    setValueSort({ type, direction });
    console.log('Value sort changed:', { type, direction });
  }, []);

  const handleStatusSortChange = useCallback((type: 'alphabetical' | 'numerical' | 'date' | 'custom', direction: 'asc' | 'desc' | null) => {
    setStatusSort({ type, direction });
    console.log('Status sort changed:', { type, direction });
  }, []);

  const handleDateSortChange = useCallback((type: 'alphabetical' | 'numerical' | 'date' | 'custom', direction: 'asc' | 'desc' | null) => {
    setDateSort({ type, direction });
    console.log('Date sort changed:', { type, direction });
  }, []);

  // No-op handlers for demo components
  const handleNoOp = useCallback(() => {}, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Status Banner */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-green-50 border border-green-200 rounded-lg p-4 mb-8"
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">All Component Groups Complete</h3>
              <div className="mt-2 text-sm text-green-700">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <ul className="space-y-1">
                    <li><strong>Group 1:</strong> Text Input Family - ✅ Complete</li>
                    <li><strong>Group 2:</strong> Search Input Family - ✅ Complete</li>
                    <li><strong>Group 3:</strong> Selection Family - ✅ Complete</li>
                  </ul>
                  <ul className="space-y-1">
                    <li><strong>Group 4:</strong> Action Button Family - ✅ Complete</li>
                    <li><strong>Group 5:</strong> Filter and Sort - ✅ Complete</li>
                    <li className="text-green-600 font-medium">🎉 Ready for Production</li>
                  </ul>
                </div>
                <p className="mt-3 text-xs text-green-600 font-medium">Modern, professional icons with clean design patterns applied across all components.</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Component Library</h1>
          <p className="text-lg text-gray-600">
            UI/UX Design Finalization - Test and refine all components in one place
          </p>
        </motion.div>

        {/* Group 1: Text Input Family */}
        <ComponentSection
          title="Group 1: Text Input Family"
          description="Universal text input components for all text-based inputs with consistent styling and behavior"
        >
          <ExampleCard
            title="BaseInput Examples"
            description="Standard text inputs with various configurations"
          >
            <div className="space-y-3">
              <BaseInput
                label="Client Name"
                placeholder="Enter client name"
                value={textValue}
                onChange={handleTextChange}
                leftIcon={<UserIcon className="h-4 w-4" />}
              />
              <BaseInput
                label="Email Address"
                type="email"
                placeholder="Enter email"
                value={emailValue}
                onChange={handleEmailChange}
                leftIcon={<EnvelopeIcon className="h-4 w-4" />}
                size="sm"
              />
              <BaseInput
                label="Error State"
                placeholder="Required field"
                error="This field is required"
                variant="error"
                value=""
                onChange={handleNoOp}
              />
            </div>
          </ExampleCard>

          <ExampleCard
            title="NumberInput Examples"
            description="Numeric inputs with formatting and validation"
          >
            <div className="space-y-3">
              <NumberInput
                label="Portfolio Value"
                format="currency"
                currency="£"
                value={currencyValue}
                onChange={handleCurrencyChange}
                thousandSeparator
                decimalPlaces={2}
              />
              <NumberInput
                label="Growth Rate"
                format="percentage"
                value={currencyValue}
                onChange={handleCurrencyChange}
                min={0}
                max={100}
                step={0.1}
              />
              <NumberInput
                label="Quantity"
                format="decimal"
                value={currencyValue}
                onChange={handleCurrencyChange}
                showSteppers
              />
            </div>
          </ExampleCard>

          <ExampleCard
            title="TextArea Examples"
            description="Multi-line text inputs with auto-resize"
          >
            <div className="space-y-3">
              <TextArea
                label="Investment Strategy"
                placeholder="Describe the investment approach..."
                value={textAreaValue}
                onChange={handleTextAreaChange}
                minRows={3}
                maxRows={6}
              />
              <TextArea
                label="Notes"
                placeholder="Additional notes..."
                value={textAreaValue}
                onChange={handleTextAreaChange}
                showCharacterCount
                maxLength={500}
                minRows={2}
                resize="vertical"
                size="sm"
              />
            </div>
          </ExampleCard>

          <ExampleCard
            title="DateInput Examples"
            description="Date inputs with dd/mm/yyyy format and validation"
          >
            <div className="space-y-3">
                             <DateInput
                 label="Start Date"
                 placeholder="dd/mm/yyyy"
                 value={dateValue}
                 onChange={handleDateChange}
                 showCalendarIcon={true}
                 helperText="Enter date in dd/mm/yyyy format"
               />
               <DateInput
                 label="End Date"
                 placeholder="dd/mm/yyyy"
                 value={dateValue}
                 onChange={handleDateChange}
                 size="sm"
                 minDate={new Date()}
                 helperText="Must be today or later"
               />
               <DateInput
                 label="Error State"
                 placeholder="dd/mm/yyyy"
                 value={undefined}
                 onChange={handleNoOp}
                 error="Invalid date format"
                 variant="error"
                 required
               />
            </div>
          </ExampleCard>
        </ComponentSection>

        {/* Group 2: Search Input Family */}
        <ComponentSection
          title="Group 2: Search Input Family"
          description="Specialized search components with debouncing, filtering, and autocomplete functionality"
        >
          <ExampleCard
            title="SearchInput Examples"
            description="Standard search with debouncing and clear button"
          >
            <div className="space-y-3">
              <SearchInput
                label="Search Products"
                placeholder="Enter product name..."
                onSearch={handleSearch}
                showClearButton={true}
                helperText="Search triggered after 300ms"
              />
              <SearchInput
                placeholder="Loading example..."
                loading={true}
                size="sm"
                onSearch={handleNoOp}
              />
            </div>
          </ExampleCard>

          <ExampleCard
            title="FilterSearch Examples"
            description="Real-time filtering with result counts"
          >
            <div className="space-y-3">
              <FilterSearch
                label="Filter Companies"
                placeholder="Filter by name..."
                onFilter={handleFilter}
                showResultCount={true}
                resultCount={42}
                filterLabel="Company"
              />
              <FilterSearch
                placeholder="Quick filter..."
                onFilter={handleFilter}
                size="sm"
              />
            </div>
          </ExampleCard>

          <ExampleCard
            title="AutocompleteSearch"
            description="Search with dropdown suggestions"
          >
            <AutocompleteSearch
              label="Select Client"
              placeholder="Search clients..."
              options={[
                {
                  value: 'client-1',
                  label: 'Acme Corporation',
                  description: 'Technology company',
                  icon: <BuildingOfficeIcon className="h-4 w-4" />
                },
                {
                  value: 'client-2',
                  label: 'Global Investments Ltd',
                  description: 'Investment firm',
                  icon: <CurrencyDollarIcon className="h-4 w-4" />
                },
                {
                  value: 'client-3',
                  label: 'Innovation Partners',
                  description: 'Venture capital',
                  icon: <BriefcaseIcon className="h-4 w-4" />
                }
              ]}
              onSelect={handleSelect}
              minSearchLength={2}
              allowCustomValue={false}
                         />
          </ExampleCard>

          <ExampleCard
            title="GlobalSearch"
            description="System-wide search with dropdown results"
          >
            <GlobalSearch />
            <p className="text-xs text-gray-500 mt-2">
              Searches across clients, products, funds, and more
            </p>
          </ExampleCard>
        </ComponentSection>

        {/* Group 3: Selection Family */}
        <ComponentSection
          title="Group 3: Selection Family"
          description="Dropdown components for selecting options with support for creation and multi-selection"
        >
          <ExampleCard
            title="BaseDropdown"
            description="Single selection dropdown"
          >
            <BaseDropdown
              label="Country"
              options={countryOptions}
              value={dropdownValue}
              onChange={handleDropdownChange}
              placeholder="Select a country..."
              required
            />
          </ExampleCard>

          <ExampleCard
            title="MultiSelect Dropdown"
            description="Multiple selection with tags"
          >
            <MultiSelectDropdown
              label="Skills"
              options={skillOptions}
              values={multiSelectValues}
              onChange={handleMultiSelectChange}
              placeholder="Select skills..."
              maxSelectedDisplay={3}
            />
          </ExampleCard>

          <ExampleCard
            title="CreatableDropdown"
            description="Selection with option creation"
          >
            <CreatableDropdown
              label="Product Owner"
              options={[
                { value: 'john', label: 'John Smith' },
                { value: 'jane', label: 'Jane Doe' },
                { value: 'bob', label: 'Bob Johnson' }
              ]}
              value=""
              onChange={() => {}}
              onCreateOption={handleCreateOption}
              placeholder="Select or create owner..."
              createLabel="Create new owner"
                         />
          </ExampleCard>

          <ExampleCard
            title="CreatableMultiSelect"
            description="Multi-select with option creation"
          >
            <CreatableMultiSelect
              label="Tags"
              options={[
                { value: 'urgent', label: 'Urgent' },
                { value: 'review', label: 'Review' },
                { value: 'approved', label: 'Approved' }
              ]}
              values={[]}
              onChange={() => {}}
              onCreateOption={handleCreateOption}
              placeholder="Select or create tags..."
            />
          </ExampleCard>

          <ExampleCard
            title="ComboDropdown"
            description="Editable dropdown with suggestions"
          >
            <ComboDropdown
              label="Company"
              options={[
                { value: 'acme', label: 'Acme Corp' },
                { value: 'global', label: 'Global Inc' },
                { value: 'tech', label: 'Tech Solutions' }
              ]}
              value=""
              onChange={() => {}}
              onSelect={handleSelect}
              allowCustomValue={true}
              placeholder="Type company name..."
            />
          </ExampleCard>
        </ComponentSection>

        {/* Group 4: Action Button Family */}
        <ComponentSection
          title="Group 4: Action Button Family"
          description="Specialized action buttons with consistent styling, multiple design patterns, and context-aware sizing"
        >
          <ExampleCard
            title="Design Patterns"
            description="Three design approaches for different use cases"
          >
            <div className="space-y-4">
              <div>
                <h5 className="text-xs font-medium text-gray-700 mb-2">Minimal Design (Table/Inline)</h5>
                <div className="flex flex-wrap gap-2">
                  <EditButton design="minimal" size="xs" />
                  <AddButton design="minimal" size="xs" />
                  <DeleteButton design="minimal" size="xs" />
                  <LapseButton design="minimal" size="xs" />
                </div>
              </div>
              <div>
                <h5 className="text-xs font-medium text-gray-700 mb-2">Balanced Design (Standard)</h5>
                <div className="flex flex-wrap gap-2">
                  <EditButton design="balanced" />
                  <AddButton design="balanced" />
                  <DeleteButton design="balanced" />
                  <LapseButton design="balanced" />
                </div>
              </div>
              <div>
                <h5 className="text-xs font-medium text-gray-700 mb-2">Descriptive Design (Clear Actions)</h5>
                <div className="flex flex-wrap gap-2">
                  <EditButton design="descriptive" context="Client" />
                  <AddButton design="descriptive" context="Product" />
                  <DeleteButton design="descriptive" context="Record" />
                  <LapseButton design="descriptive" context="Policy" />
                </div>
              </div>
            </div>
          </ExampleCard>

          <ExampleCard
            title="Size Variations"
            description="Complete size range from mini to large"
          >
            <div className="space-y-4">
              <div>
                <h5 className="text-xs font-medium text-gray-700 mb-2">Table Sizes</h5>
                <div className="flex items-center gap-2">
                  <EditButton size="mini" />
                  <EditButton size="xs" />
                  <EditButton size="icon" iconOnly />
                </div>
              </div>
              <div>
                <h5 className="text-xs font-medium text-gray-700 mb-2">Standard Sizes</h5>
                <div className="flex items-center gap-2">
                  <EditButton size="sm" />
                  <EditButton size="md" />
                  <EditButton size="lg" />
                </div>
              </div>
            </div>
          </ExampleCard>

          <ExampleCard
            title="Context-Aware Buttons"
            description="Smart labeling based on context"
          >
            <div className="space-y-3">
              <AddButton context="Client" design="balanced" />
              <EditButton context="Portfolio" design="balanced" />
              <DeleteButton context="Transaction" design="balanced" />
              <LapseButton context="Policy" design="balanced" />
            </div>
          </ExampleCard>

          <ExampleCard
            title="Table Integration"
            description="Optimized for table row actions"
          >
            <div className="bg-white border rounded-lg overflow-hidden">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Client</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Value</th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr>
                    <td className="px-4 py-2 text-sm text-gray-900">Acme Corp</td>
                    <td className="px-4 py-2 text-sm text-gray-900">£125,000</td>
                    <td className="px-4 py-2">
                      <div className="flex justify-center gap-1">
                        <EditButton tableContext size="xs" />
                        <DeleteButton tableContext size="xs" />
                        <LapseButton tableContext size="xs" />
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-sm text-gray-900">Global Inc</td>
                    <td className="px-4 py-2 text-sm text-gray-900">£89,500</td>
                    <td className="px-4 py-2">
                      <div className="flex justify-center gap-1">
                        <EditButton tableContext size="icon" iconOnly />
                        <DeleteButton tableContext size="icon" iconOnly />
                        <LapseButton tableContext size="icon" iconOnly />
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </ExampleCard>

          <ExampleCard
            title="Loading & Disabled States"
            description="Interactive states for better UX"
          >
            <div className="space-y-3">
              <div className="flex gap-2">
                <EditButton loading />
                <AddButton disabled />
                <DeleteButton loading size="sm" />
              </div>
              <div className="flex gap-2">
                <ActionButton variant="save" loading />
                <ActionButton variant="cancel" disabled />
              </div>
            </div>
          </ExampleCard>

          <ExampleCard
            title="Full Width & Custom"
            description="Layout and customization options"
          >
            <div className="space-y-3">
              <AddButton context="New Client" design="descriptive" fullWidth />
              <div className="flex gap-2">
                <ActionButton variant="save" className="flex-1" />
                <ActionButton variant="cancel" className="flex-1" />
              </div>
            </div>
          </ExampleCard>
        </ComponentSection>

        {/* Group 5: Filter and Sort */}
        <ComponentSection
          title="Group 5: Filter and Sort"
          description="Compact table components for filtering and sorting columns with consistent design patterns"
        >
          <ExampleCard
            title="Table Filter"
            description="Multi-select filter with search for table columns"
          >
            <div className="space-y-4">
              {/* Mock table header to show context */}
              <div className="bg-white border rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Status</span>
                    <TableFilter
                      options={statusFilterOptions}
                      values={tableFilterValues}
                      onChange={handleTableFilterChange}
                      title="Filter by status"
                      placeholder="Search status..."
                    />
                  </div>
                </div>
                <div className="px-4 py-2 text-xs text-gray-500">
                  {tableFilterValues.length > 0 
                    ? `Filtered by: ${statusFilterOptions.filter(opt => tableFilterValues.includes(opt.value)).map(opt => opt.label).join(', ')}`
                    : 'No filters applied'
                  }
                </div>
              </div>
              
              {/* Standalone examples */}
              <div className="flex items-center gap-3 p-3 bg-gray-100 rounded">
                <span className="text-sm text-gray-600">Category:</span>
                <TableFilter
                  options={categoryFilterOptions}
                  values={[]}
                  onChange={() => {}}
                  title="Filter by category"
                  placeholder="Search categories..."
                />
              </div>
            </div>
          </ExampleCard>

          <ExampleCard
            title="Table Sort"
            description="Multi-type sorting for table columns"
          >
            <div className="space-y-4">
              {/* Mock table header to show context */}
              <div className="bg-white border rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Client Name</span>
                    <TableSort
                      currentSort={tableSortState}
                      onSortChange={handleTableSortChange}
                      title="Sort client names"
                      sortTypes={['alphabetical']}
                    />
                  </div>
                </div>
                <div className="px-4 py-2 text-xs text-gray-500">
                  {tableSortState.direction 
                    ? `Sorted ${tableSortState.direction === 'asc' ? 'ascending' : 'descending'} (${tableSortState.type})`
                    : 'No sort applied'
                  }
                </div>
              </div>

              {/* Different sort types */}
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-3 bg-gray-100 rounded">
                  <span className="text-sm text-gray-600">Value (Numerical):</span>
                  <TableSort
                    currentSort={{ type: 'numerical', direction: null }}
                    onSortChange={() => {}}
                    title="Sort by value"
                    sortTypes={['numerical']}
                  />
                </div>
                <div className="flex items-center gap-3 p-3 bg-gray-100 rounded">
                  <span className="text-sm text-gray-600">Date:</span>
                  <TableSort
                    currentSort={{ type: 'date', direction: 'desc' }}
                    onSortChange={() => {}}
                    title="Sort by date"
                    sortTypes={['date']}
                  />
                </div>
              </div>
            </div>
          </ExampleCard>

          <ExampleCard
            title="Table Integration"
            description="Combined filter and sort in a complete table header"
          >
            <div className="bg-white border rounded-lg overflow-hidden">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2">
                      <div className="flex items-center justify-between">
                        <span className="text-left text-xs font-medium text-gray-500">Client</span>
                        <div className="flex items-center gap-1">
                          <TableFilter
                            options={[
                              { value: 'acme', label: 'Acme Corp' },
                              { value: 'global', label: 'Global Inc' },
                              { value: 'tech', label: 'Tech Solutions' }
                            ]}
                            values={[]}
                            onChange={() => {}}
                            title="Filter clients"
                          />
                          <TableSort
                            currentSort={{ type: 'alphabetical', direction: 'asc' }}
                            onSortChange={() => {}}
                            title="Sort clients"
                            sortTypes={['alphabetical']}
                          />
                        </div>
                      </div>
                    </th>
                    <th className="px-4 py-2">
                      <div className="flex items-center justify-between">
                        <span className="text-left text-xs font-medium text-gray-500">Value</span>
                        <div className="flex items-center gap-1">
                          <TableFilter
                            options={[
                              { value: 'high', label: '> £100k' },
                              { value: 'medium', label: '£50k - £100k' },
                              { value: 'low', label: '< £50k' }
                            ]}
                            values={['high']}
                            onChange={() => {}}
                            title="Filter by value range"
                          />
                          <TableSort
                            currentSort={{ type: 'numerical', direction: null }}
                            onSortChange={() => {}}
                            title="Sort by value"
                            sortTypes={['numerical']}
                          />
                        </div>
                      </div>
                    </th>
                    <th className="px-4 py-2">
                      <div className="flex items-center justify-between">
                        <span className="text-left text-xs font-medium text-gray-500">Status</span>
                        <div className="flex items-center gap-1">
                          <TableFilter
                            options={statusFilterOptions.slice(0, 3)}
                            values={['active', 'pending']}
                            onChange={() => {}}
                            title="Filter by status"
                          />
                          <TableSort
                            currentSort={{ type: 'alphabetical', direction: null }}
                            onSortChange={() => {}}
                            title="Sort by status"
                            sortTypes={['alphabetical']}
                          />
                        </div>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr>
                    <td className="px-4 py-2 text-sm text-gray-900">Acme Corp</td>
                    <td className="px-4 py-2 text-sm text-gray-900">£125,000</td>
                    <td className="px-4 py-2">
                      <span className="inline-flex px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                        Active
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-sm text-gray-900">Global Inc</td>
                    <td className="px-4 py-2 text-sm text-gray-900">£89,500</td>
                    <td className="px-4 py-2">
                      <span className="inline-flex px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                        Pending
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-sm text-gray-900">Tech Solutions</td>
                    <td className="px-4 py-2 text-sm text-gray-900">£156,750</td>
                    <td className="px-4 py-2">
                      <span className="inline-flex px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                        Active
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </ExampleCard>

          <ExampleCard
            title="States & Variations"
            description="Different states and configurations"
          >
            <div className="space-y-4">
              {/* Disabled state */}
              <div className="flex items-center gap-3 p-3 bg-gray-100 rounded">
                <span className="text-sm text-gray-400">Disabled:</span>
                <TableFilter
                  options={statusFilterOptions}
                  values={[]}
                  onChange={() => {}}
                  disabled={true}
                />
                <TableSort
                  currentSort={{ type: 'alphabetical', direction: null }}
                  onSortChange={() => {}}
                  disabled={true}
                />
              </div>

              {/* Active states */}
              <div className="flex items-center gap-3 p-3 bg-gray-100 rounded">
                <span className="text-sm text-gray-600">Active Filter:</span>
                <TableFilter
                  options={categoryFilterOptions}
                  values={['equity', 'bond']}
                  onChange={() => {}}
                />
                <span className="text-sm text-gray-600">Active Sort:</span>
                <TableSort
                  currentSort={{ type: 'numerical', direction: 'desc' }}
                  onSortChange={() => {}}
                  sortTypes={['numerical', 'alphabetical']}
                />
              </div>

              {/* Multi-type sort */}
              <div className="flex items-center gap-3 p-3 bg-gray-100 rounded">
                <span className="text-sm text-gray-600">Multi-type Sort:</span>
                <TableSort
                  currentSort={{ type: 'custom', direction: 'asc' }}
                  onSortChange={() => {}}
                  sortTypes={['alphabetical', 'numerical', 'date', 'custom']}
                />
              </div>
            </div>
          </ExampleCard>


        </ComponentSection>

        {/* Full Width Interactive Table Demo */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8"
        >
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Complete Interactive Table Demo</h3>
            <p className="text-sm text-gray-600">Full working table with all Group 5 filter and sort functionality - Click the icons to test!</p>
          </div>

          <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
            <table className="min-w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left">
                    <div className="flex items-center justify-between min-w-0">
                      <span className="text-sm font-medium text-gray-700 truncate">Client Name</span>
                      <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                        <TableFilter
                          options={clientFilterOptions}
                          values={clientFilterValues}
                          onChange={handleClientFilterChange}
                          title="Filter by client"
                          placeholder="Search clients..."
                        />
                        <TableSort
                          currentSort={clientSort}
                          onSortChange={handleClientSortChange}
                          title="Sort client names"
                          sortTypes={['alphabetical']}
                        />
                      </div>
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left">
                    <div className="flex items-center justify-between min-w-0">
                      <span className="text-sm font-medium text-gray-700 truncate">Portfolio Value</span>
                      <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                        <TableFilter
                          options={valueRangeFilterOptions}
                          values={valueFilterValues}
                          onChange={handleValueFilterChange}
                          title="Filter by value range"
                          placeholder="Search ranges..."
                        />
                        <TableSort
                          currentSort={valueSort}
                          onSortChange={handleValueSortChange}
                          title="Sort by portfolio value"
                          sortTypes={['numerical']}
                        />
                      </div>
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left">
                    <div className="flex items-center justify-between min-w-0">
                      <span className="text-sm font-medium text-gray-700 truncate">Status</span>
                      <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                        <TableFilter
                          options={tableStatusFilterOptions}
                          values={statusFilterValues}
                          onChange={handleStatusFilterChange}
                          title="Filter by status"
                          placeholder="Search status..."
                        />
                        <TableSort
                          currentSort={statusSort}
                          onSortChange={handleStatusSortChange}
                          title="Sort by status"
                          sortTypes={['alphabetical']}
                        />
                      </div>
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left">
                    <div className="flex items-center justify-between min-w-0">
                      <span className="text-sm font-medium text-gray-700 truncate">Last Updated</span>
                      <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                        <TableFilter
                          options={dateRangeFilterOptions}
                          values={dateFilterValues}
                          onChange={handleDateFilterChange}
                          title="Filter by date range"
                          placeholder="Search dates..."
                        />
                        <TableSort
                          currentSort={dateSort}
                          onSortChange={handleDateSortChange}
                          title="Sort by date"
                          sortTypes={['date']}
                        />
                      </div>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {mockTableData.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50 transition-colors duration-150">
                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                      {row.client}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 font-mono text-right">
                      £{row.value.toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${
                        row.status === 'active' 
                          ? 'bg-green-100 text-green-800'
                          : row.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : row.status === 'completed'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {row.status === 'active' ? 'Active' 
                         : row.status === 'pending' ? 'Pending Review'
                         : row.status === 'completed' ? 'Completed'
                         : 'On Hold'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(row.lastUpdated).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Filter Summary */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h5 className="text-sm font-medium text-blue-900 mb-3">Active Filters & Sorts</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-blue-800">
              {clientFilterValues.length > 0 && (
                <div>
                  <strong>Clients:</strong> {clientFilterOptions.filter(opt => clientFilterValues.includes(opt.value)).map(opt => opt.label).join(', ')}
                </div>
              )}
              {valueFilterValues.length > 0 && (
                <div>
                  <strong>Value Range:</strong> {valueRangeFilterOptions.filter(opt => valueFilterValues.includes(opt.value)).map(opt => opt.label).join(', ')}
                </div>
              )}
              {statusFilterValues.length > 0 && (
                <div>
                  <strong>Status:</strong> {tableStatusFilterOptions.filter(opt => statusFilterValues.includes(opt.value)).map(opt => opt.label).join(', ')}
                </div>
              )}
              {dateFilterValues.length > 0 && (
                <div>
                  <strong>Date Range:</strong> {dateRangeFilterOptions.filter(opt => dateFilterValues.includes(opt.value)).map(opt => opt.label).join(', ')}
                </div>
              )}
              {clientSort.direction && (
                <div>
                  <strong>Client Sort:</strong> {clientSort.direction === 'asc' ? 'A to Z' : 'Z to A'}
                </div>
              )}
              {valueSort.direction && (
                <div>
                  <strong>Value Sort:</strong> {valueSort.direction === 'asc' ? 'Low to High' : 'High to Low'}
                </div>
              )}
              {statusSort.direction && (
                <div>
                  <strong>Status Sort:</strong> {statusSort.direction === 'asc' ? 'A to Z' : 'Z to A'}
                </div>
              )}
              {dateSort.direction && (
                <div>
                  <strong>Date Sort:</strong> {dateSort.direction === 'asc' ? 'Oldest First' : 'Newest First'}
                </div>
              )}
              {!clientFilterValues.length && !valueFilterValues.length && !statusFilterValues.length && !dateFilterValues.length && 
               !clientSort.direction && !valueSort.direction && !statusSort.direction && !dateSort.direction && (
                <div className="col-span-full text-blue-600 text-center p-4 border-2 border-dashed border-blue-300 rounded-lg">
                  <strong>No filters or sorts applied</strong><br />
                  <span className="text-sm">Try clicking the filter (funnel) and sort (arrows) icons in the table headers above!</span>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* StandardTable Demo */}
        <ComponentSection
          title="StandardTable - Intelligent Adaptive Table"
          description="Auto-detecting table component that intelligently chooses filters or sorts based on data types with responsive behavior"
        >
          <div className="col-span-full">
            <ExampleCard
              title="Smart Column Detection"
              description="Automatically detects data types and applies appropriate controls (filter for categories, sort for text/numbers/dates)"
            >
              <div className="space-y-4">
                <StandardTable
                  data={standardTableData}
                  columns={standardTableColumns}
                  className="border border-gray-200 rounded-lg"
                />
                
                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h5 className="text-sm font-medium text-blue-900 mb-2">Auto-Detection Features:</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm text-blue-800">
                    <div>
                      <strong>Client Name:</strong> Text → Sort (A-Z)
                    </div>
                    <div>
                      <strong>Type:</strong> Category → Filter (Multi-select)
                    </div>
                    <div>
                      <strong>Status:</strong> Category → Filter (Multi-select)
                    </div>
                    <div>
                      <strong>AUM:</strong> Currency → Sort (Low-High)
                    </div>
                    <div>
                      <strong>Fund Count:</strong> Number → Sort (Numerical)
                    </div>
                    <div>
                      <strong>Last Review:</strong> Date → Sort (Date)
                    </div>
                    <div>
                      <strong>Risk Level:</strong> Category → Filter (Multi-select)
                    </div>
                    <div>
                      <strong>Advisor:</strong> Text → Sort (A-Z)
                    </div>
                    <div>
                      <strong>YTD Performance:</strong> Percentage → Sort (Numerical)
                    </div>
                  </div>
                </div>
              </div>
            </ExampleCard>
          </div>

          <div className="col-span-full">
            <ExampleCard
              title="Column Alignment & Layout"
              description="First column left-aligned, all others right-aligned with even spacing and adaptive row heights"
            >
              <div className="space-y-4">
                <div className="text-sm text-gray-600 p-3 bg-gray-50 rounded">
                  <strong>Layout Features:</strong>
                  <ul className="mt-2 space-y-1 ml-4 list-disc">
                    <li>First column (Client Name) is left-aligned</li>
                    <li>All other columns are right-aligned</li>
                    <li>Controls positioned on right side of column headers</li>
                    <li>Even column spacing with responsive font sizing</li>
                    <li>Adaptive row heights based on content length</li>
                  </ul>
                </div>
              </div>
            </ExampleCard>
          </div>

          <div className="col-span-full">
            <ExampleCard
              title="Responsive Behavior"
              description="Progressive compression with font and padding adjustments before horizontal scroll"
            >
              <div className="space-y-4">
                <div className="text-sm text-gray-600 p-3 bg-gray-50 rounded">
                  <strong>Responsive Strategy:</strong>
                  <ul className="mt-2 space-y-1 ml-4 list-disc">
                    <li>Large screens: 14px font, 16px padding</li>
                    <li>Medium compression: 13px font, 12px padding</li>
                    <li>Small compression: 12px font, 8px padding</li>
                    <li>Horizontal scroll only when absolutely necessary</li>
                    <li>Maintains readability at all screen sizes</li>
                  </ul>
                </div>
                
                <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                  <p className="text-sm text-yellow-800">
                    <strong>Try resizing your browser window</strong> to see the responsive behavior in action!
                  </p>
                </div>
              </div>
            </ExampleCard>
          </div>

          <div className="col-span-full">
            <ExampleCard
              title="Data Type Support"
              description="Handles all common data types with appropriate formatting and intelligent control selection"
            >
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                  <div className="p-3 bg-green-50 border border-green-200 rounded">
                    <strong className="text-green-800">Currency Data</strong>
                    <p className="text-green-700 mt-1">Auto-formats as £2,450,000 with numerical sorting</p>
                  </div>
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                    <strong className="text-blue-800">Percentage Data</strong>
                    <p className="text-blue-700 mt-1">Displays as 12.5% with numerical sorting</p>
                  </div>
                  <div className="p-3 bg-purple-50 border border-purple-200 rounded">
                    <strong className="text-purple-800">Date Data</strong>
                    <p className="text-purple-700 mt-1">Formats as DD/MM/YYYY with date sorting</p>
                  </div>
                  <div className="p-3 bg-orange-50 border border-orange-200 rounded">
                    <strong className="text-orange-800">Category Data</strong>
                    <p className="text-orange-700 mt-1">Multi-select filters for discrete values</p>
                  </div>
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded">
                    <strong className="text-gray-800">Text Data</strong>
                    <p className="text-gray-700 mt-1">Alphabetical sorting for names/descriptions</p>
                  </div>
                  <div className="p-3 bg-red-50 border border-red-200 rounded">
                    <strong className="text-red-800">Number Data</strong>
                    <p className="text-red-700 mt-1">Thousand separators with numerical sorting</p>
                  </div>
                </div>
              </div>
            </ExampleCard>
          </div>
        </ComponentSection>

        {/* Size Examples */}
        <ComponentSection
          title="Size Variations"
          description="All components support three sizes: small (32px), medium (40px), and large (48px)"
        >
          <ExampleCard
            title="Small Size (32px)"
            description="Compact for dense layouts"
          >
            <div className="space-y-3">
              <BaseInput
                placeholder="Small input"
                size="sm"
                leftIcon={<UserIcon className="h-4 w-4" />}
              />
              <SearchInput
                placeholder="Small search"
                size="sm"
                showClearButton
                onSearch={handleSearch}
              />
              <BaseDropdown
                options={countryOptions}
                value=""
                onChange={() => {}}
                placeholder="Small dropdown"
                size="sm"
              />
            </div>
          </ExampleCard>

          <ExampleCard
            title="Medium Size (40px)"
            description="Default size for most cases"
          >
            <div className="space-y-3">
              <BaseInput
                placeholder="Medium input (default)"
                size="md"
                leftIcon={<EnvelopeIcon className="h-4 w-4" />}
              />
              <NumberInput
                placeholder="£0.00"
                format="currency"
                currency="£"
                value={0}
                onChange={(value: number | null) => {}}
                size="md"
              />
              <BaseDropdown
                options={countryOptions}
                value=""
                onChange={() => {}}
                placeholder="Medium dropdown"
                size="md"
              />
            </div>
          </ExampleCard>

          <ExampleCard
            title="Large Size (48px)"
            description="Prominent for key interactions"
          >
            <div className="space-y-3">
              <BaseInput
                placeholder="Large input"
                size="lg"
                leftIcon={<BuildingOfficeIcon className="h-4 w-4" />}
              />
              <SearchInput
                placeholder="Large search"
                size="lg"
                showClearButton
                onSearch={handleSearch}
              />
              <BaseDropdown
                options={countryOptions}
                value=""
                onChange={() => {}}
                placeholder="Large dropdown"
                size="lg"
              />
            </div>
          </ExampleCard>
        </ComponentSection>

        {/* Usage Guidelines */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-blue-50 rounded-lg p-6 border border-blue-200"
        >
          <h3 className="text-lg font-semibold text-blue-900 mb-4">Usage Guidelines & Design System</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <h4 className="font-medium text-blue-800 mb-2">Colors</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Purple theme: #4B2D83</li>
                <li>• Focus ring: purple-500</li>
                <li>• Error: red-500</li>
                <li>• Success: green-500</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-blue-800 mb-2">Typography</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Input text: 14px (text-sm)</li>
                <li>• Labels: 14px medium</li>
                <li>• Helper text: 12px (text-xs)</li>
                <li>• Error messages: 12px red</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-blue-800 mb-2">Spacing</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Small: 8px padding</li>
                <li>• Medium: 12px padding</li>
                <li>• Large: 16px padding</li>
                <li>• Label margin: 4px bottom</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-blue-800 mb-2">Accessibility</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• ARIA labels & roles</li>
                <li>• Keyboard navigation</li>
                <li>• Screen reader support</li>
                <li>• High contrast compliance</li>
              </ul>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Components; 