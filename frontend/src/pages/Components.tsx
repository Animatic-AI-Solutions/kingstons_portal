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

  const handleCurrencyChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrencyValue(parseFloat(e.target.value) || 0);
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

  // No-op handlers for demo components
  const handleNoOp = useCallback(() => {}, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

        {/* Status Banner */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8"
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">Component Development Status</h3>
              <div className="mt-2 text-sm text-blue-700">
                <ul className="list-disc list-inside space-y-1">
                  <li><strong>Group 1:</strong> Text Input Family - ✅ Complete (BaseInput, NumberInput, TextArea, DateInput, InputGroup)</li>
                  <li><strong>Group 2:</strong> Search Input Family - ✅ Complete (SearchInput, GlobalSearch, FilterSearch, AutocompleteSearch)</li>
                  <li><strong>Group 3:</strong> Selection Family - ✅ Complete (BaseDropdown, MultiSelect, CreatableDropdown)</li>
                  <li><strong>Group 4:</strong> Action Button Family - ✅ Complete (ActionButton, EditButton, AddButton, DeleteButton, LapseButton)</li>
                </ul>
              </div>
            </div>
          </div>
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
                onChange={() => {}}
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