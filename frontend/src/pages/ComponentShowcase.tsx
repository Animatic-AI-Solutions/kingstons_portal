import React, { useState } from 'react';
import { ComponentCard } from '../components/showcase/ComponentCard';
import {
  BaseInput,
  NumberInput,
  TextArea,
  DateInput,
  PasswordInput,
  NINumberInput,
  CurrencyInput,
  InputLabel,
  InputError,
  FieldError,
  InputGroup,
  InputWithButton,
  SearchInput,
  FilterSearch,
  AutocompleteSearch,
  GlobalSearch,
  BaseDropdown,
  MultiSelectDropdown,
  CreatableDropdown,
  CreatableMultiSelect,
  ComboDropdown,
  FilterDropdown,
  ActionButton,
  EditButton,
  AddButton,
  DeleteButton,
  LapseButton,
  LapseIconButton,
  MakeDeceasedIconButton,
  ReactivateIconButton,
  DeleteIconButton,
  EditIconButton,
  Button,
  Card,
  StatCard,
  StatBox,
  ChangeIndicator,
  DataTable,
  FundDistributionChart,
  EmptyState,
  ErrorDisplay,
  ErrorStateNetwork,
  ErrorStateServer,
  Skeleton,
  StatBoxSkeleton,
  ChartSkeleton,
  TableSkeleton,
  StandardTable,
  SortableColumnHeader,
  TableSortHeader,
  SkeletonTable,
  ModalShell,
  DeleteConfirmationModal,
  TabNavigation,
  StatusBadge,
  MiniYearSelector,
  EnhancedMonthHeader,
  ProfileAvatar
} from '../components/ui';
import TableFilter from '../components/ui/table-controls/TableFilter';
import TableSort from '../components/ui/table-controls/TableSort';
import { Phase2Table } from '../components/phase2/tables';
import LapseIconButtonTable from '../components/ui/table-icons/LapseIconButton';
import MakeDeceasedIconButtonTable from '../components/ui/table-icons/MakeDeceasedIconButton';
import ReactivateIconButtonTable from '../components/ui/table-icons/ReactivateIconButton';
import DeleteIconButtonTable from '../components/ui/table-icons/DeleteIconButton';

const ComponentShowcase: React.FC = () => {
  const [search, setSearch] = useState('');

  // State for interactive input demos
  const [niNumber, setNiNumber] = useState('');
  const [currencyValue, setCurrencyValue] = useState<number | null>(50000);

  // Mock data for dropdown examples
  const mockOptions = [
    { value: '1', label: 'Option 1' },
    { value: '2', label: 'Option 2' },
    { value: '3', label: 'Option 3' }
  ];

  const mockTableData = [
    { id: 1, name: 'John Doe', role: 'Admin', status: 'Active' },
    { id: 2, name: 'Jane Smith', role: 'User', status: 'Active' }
  ];

  const mockTableColumns = [
    { key: 'name', label: 'Name', dataType: 'text' as const, control: 'auto' as const },
    { key: 'role', label: 'Role', dataType: 'category' as const, control: 'auto' as const },
    { key: 'status', label: 'Status', dataType: 'category' as const, control: 'auto' as const }
  ];

  // Mock data for Phase2Table
  const mockPhase2Data = [
    { id: 1, firstName: 'John', lastName: 'Doe', role: 'Admin', status: 'active' },
    { id: 2, firstName: 'Jane', lastName: 'Smith', role: 'User', status: 'active' },
    { id: 3, firstName: 'Bob', lastName: 'Johnson', role: 'User', status: 'lapsed' }
  ];

  const mockPhase2Columns = [
    {
      key: 'firstName',
      label: 'First Name',
      sortable: true,
      render: (row: typeof mockPhase2Data[0]) => row.firstName
    },
    {
      key: 'lastName',
      label: 'Last Name',
      sortable: true,
      render: (row: typeof mockPhase2Data[0]) => row.lastName
    },
    {
      key: 'role',
      label: 'Role',
      sortable: true,
      render: (row: typeof mockPhase2Data[0]) => row.role
    }
  ];

  // Simple filter function
  const filterComponent = (componentName: string) => {
    if (!search) return true;
    return componentName.toLowerCase().includes(search.toLowerCase());
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">UI Component Library</h1>
          <p className="text-gray-600">
            Visual reference for all shared components - find and reuse components for consistency
          </p>
        </div>

        {/* Search */}
        <div className="mb-8">
          <input
            type="text"
            className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            placeholder="Search components..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Quick Navigation */}
        <nav className="mb-8 p-4 bg-white rounded-lg border border-gray-200">
          <div className="flex flex-wrap gap-3">
            <a href="#inputs" className="text-blue-600 hover:text-blue-800 font-medium">Inputs</a>
            <span className="text-gray-300">|</span>
            <a href="#search" className="text-blue-600 hover:text-blue-800 font-medium">Search</a>
            <span className="text-gray-300">|</span>
            <a href="#dropdowns" className="text-blue-600 hover:text-blue-800 font-medium">Dropdowns</a>
            <span className="text-gray-300">|</span>
            <a href="#buttons" className="text-blue-600 hover:text-blue-800 font-medium">Buttons</a>
            <span className="text-gray-300">|</span>
            <a href="#badges" className="text-blue-600 hover:text-blue-800 font-medium">Badges</a>
            <span className="text-gray-300">|</span>
            <a href="#cards" className="text-blue-600 hover:text-blue-800 font-medium">Cards</a>
            <span className="text-gray-300">|</span>
            <a href="#data-displays" className="text-blue-600 hover:text-blue-800 font-medium">Data Displays</a>
            <span className="text-gray-300">|</span>
            <a href="#feedback" className="text-blue-600 hover:text-blue-800 font-medium">Feedback</a>
            <span className="text-gray-300">|</span>
            <a href="#tables" className="text-blue-600 hover:text-blue-800 font-medium">Tables</a>
            <span className="text-gray-300">|</span>
            <a href="#table-icons" className="text-blue-600 hover:text-blue-800 font-medium">Table Icons</a>
            <span className="text-gray-300">|</span>
            <a href="#modals" className="text-blue-600 hover:text-blue-800 font-medium">Modals</a>
            <span className="text-gray-300">|</span>
            <a href="#navigation" className="text-blue-600 hover:text-blue-800 font-medium">Navigation</a>
            <span className="text-gray-300">|</span>
            <a href="#date" className="text-blue-600 hover:text-blue-800 font-medium">Date</a>
            <span className="text-gray-300">|</span>
            <a href="#misc" className="text-blue-600 hover:text-blue-800 font-medium">Misc</a>
          </div>
        </nav>

        {/* Inputs Section */}
        <section id="inputs" className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
            Inputs
          </h2>
          <p className="text-gray-600 mb-6">Form input components for data entry</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filterComponent('BaseInput') && (
              <ComponentCard
                name="BaseInput"
                importPath="import { BaseInput } from '@/components/ui'"
                code={`<BaseInput
  placeholder="Enter text"
  value={value}
  onChange={(e) => setValue(e.target.value)}
/>`}
              >
                <BaseInput placeholder="Default input" />
                <BaseInput placeholder="Small size" size="sm" />
                <BaseInput placeholder="Large size" size="lg" />
              </ComponentCard>
            )}

            {filterComponent('NumberInput') && (
              <ComponentCard
                name="NumberInput"
                importPath="import { NumberInput } from '@/components/ui'"
                code={`<NumberInput
  format="currency"
  currency="£"
  value={value}
  onChange={setValue}
/>`}
              >
                <NumberInput format="currency" currency="£" value={1000} onChange={() => {}} />
                <NumberInput format="percentage" value={25} onChange={() => {}} />
                <NumberInput format="decimal" value={100} onChange={() => {}} showSteppers />
              </ComponentCard>
            )}

            {filterComponent('TextArea') && (
              <ComponentCard
                name="TextArea"
                importPath="import { TextArea } from '@/components/ui'"
                code={`<TextArea
  placeholder="Enter notes..."
  value={value}
  onChange={(e) => setValue(e.target.value)}
/>`}
              >
                <TextArea placeholder="Default textarea" minRows={3} />
                <TextArea placeholder="With character count" showCharacterCount maxLength={200} minRows={2} />
              </ComponentCard>
            )}

            {filterComponent('DateInput') && (
              <ComponentCard
                name="DateInput"
                importPath="import { DateInput } from '@/components/ui'"
                code={`<DateInput
  placeholder="dd/mm/yyyy"
  value={date}
  onChange={setDate}
/>`}
              >
                <DateInput placeholder="dd/mm/yyyy" value={undefined} onChange={() => {}} />
                <DateInput placeholder="Small size" size="sm" value={undefined} onChange={() => {}} />
              </ComponentCard>
            )}

            {filterComponent('PasswordInput') && (
              <ComponentCard
                name="PasswordInput"
                importPath="import { PasswordInput } from '@/components/ui'"
                code={`<PasswordInput
  placeholder="Enter password"
  value={password}
  onChange={(e) => setPassword(e.target.value)}
/>`}
              >
                <PasswordInput placeholder="Enter password" />
              </ComponentCard>
            )}

            {filterComponent('NINumberInput') && (
              <ComponentCard
                name="NINumberInput"
                importPath="import { NINumberInput } from '@/components/ui'"
                code={`<NINumberInput
  label="NI Number"
  value={niNumber}
  onChange={(value) => setNiNumber(value)}
  error={errors?.ni_number}
/>`}
              >
                <NINumberInput
                  label="National Insurance Number"
                  value={niNumber}
                  onChange={setNiNumber}
                  helperText="Format: AB 12 34 56 C"
                />
              </ComponentCard>
            )}

            {filterComponent('CurrencyInput') && (
              <ComponentCard
                name="CurrencyInput"
                importPath="import { CurrencyInput } from '@/components/ui'"
                code={`<CurrencyInput
  label="Amount"
  value={amount}
  onChange={(value) => setAmount(value)}
  error={errors?.amount}
/>`}
              >
                <CurrencyInput
                  label="Salary (try typing and pressing Enter)"
                  value={currencyValue}
                  onChange={setCurrencyValue}
                />
              </ComponentCard>
            )}

            {filterComponent('InputLabel') && (
              <ComponentCard
                name="InputLabel"
                importPath="import { InputLabel } from '@/components/ui'"
                code={`<InputLabel htmlFor="email" required>
  Email Address
</InputLabel>`}
              >
                <InputLabel htmlFor="name">Name</InputLabel>
                <InputLabel htmlFor="email" required>Email (required)</InputLabel>
              </ComponentCard>
            )}

            {filterComponent('InputError') && (
              <ComponentCard
                name="InputError"
                importPath="import { InputError } from '@/components/ui'"
                code={`<InputError>
  This field is required
</InputError>`}
              >
                <InputError>This field is required</InputError>
                <InputError>Please enter a valid email address</InputError>
              </ComponentCard>
            )}

            {filterComponent('FieldError') && (
              <ComponentCard
                name="FieldError"
                importPath="import { FieldError } from '@/components/ui'"
                code={`<FieldError error="Invalid input" />`}
              >
                <FieldError error="Invalid input value" />
                <FieldError error="This field cannot be empty" />
              </ComponentCard>
            )}

            {filterComponent('InputGroup') && (
              <ComponentCard
                name="InputGroup"
                importPath="import { InputGroup, InputWithButton } from '@/components/ui'"
                code={`<InputWithButton
  input={<BaseInput placeholder="Search..." />}
  button={<ActionButton variant="save">Go</ActionButton>}
/>`}
              >
                <InputWithButton
                  input={<BaseInput placeholder="Search..." />}
                  button={<ActionButton variant="save">Go</ActionButton>}
                />
              </ComponentCard>
            )}
          </div>
        </section>

        {/* Search Section */}
        <section id="search" className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
            Search Components
          </h2>
          <p className="text-gray-600 mb-6">Specialized search components with filtering and autocomplete</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filterComponent('SearchInput') && (
              <ComponentCard
                name="SearchInput"
                importPath="import { SearchInput } from '@/components/ui'"
                code={`<SearchInput
  placeholder="Search..."
  onSearch={handleSearch}
  showClearButton
/>`}
              >
                <SearchInput placeholder="Search products..." onSearch={() => {}} showClearButton />
                <SearchInput placeholder="Small search" size="sm" onSearch={() => {}} />
              </ComponentCard>
            )}

            {filterComponent('FilterSearch') && (
              <ComponentCard
                name="FilterSearch"
                importPath="import { FilterSearch } from '@/components/ui'"
                code={`<FilterSearch
  placeholder="Filter..."
  onFilter={handleFilter}
  showResultCount
/>`}
              >
                <FilterSearch placeholder="Filter companies..." onFilter={() => {}} showResultCount resultCount={42} />
              </ComponentCard>
            )}

            {filterComponent('AutocompleteSearch') && (
              <ComponentCard
                name="AutocompleteSearch"
                importPath="import { AutocompleteSearch } from '@/components/ui'"
                code={`<AutocompleteSearch
  placeholder="Search..."
  options={options}
  onSelect={handleSelect}
/>`}
              >
                <AutocompleteSearch
                  placeholder="Search clients..."
                  options={mockOptions.map(opt => ({ value: opt.value, label: opt.label }))}
                  onSelect={() => {}}
                />
              </ComponentCard>
            )}

            {filterComponent('GlobalSearch') && (
              <ComponentCard
                name="GlobalSearch"
                importPath="import { GlobalSearch } from '@/components/ui'"
                code={`<GlobalSearch
  placeholder="Search everywhere..."
  onSearch={handleSearch}
/>`}
              >
                <GlobalSearch placeholder="Search everything..." onSearch={() => {}} />
              </ComponentCard>
            )}
          </div>
        </section>

        {/* Dropdowns Section */}
        <section id="dropdowns" className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
            Dropdown Components
          </h2>
          <p className="text-gray-600 mb-6">Selection components for choosing from options</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filterComponent('BaseDropdown') && (
              <ComponentCard
                name="BaseDropdown"
                importPath="import { BaseDropdown } from '@/components/ui'"
                code={`<BaseDropdown
  options={options}
  value={value}
  onChange={setValue}
  placeholder="Select..."
/>`}
              >
                <BaseDropdown options={mockOptions} value="" onChange={() => {}} placeholder="Select an option..." />
                <BaseDropdown options={mockOptions} value="1" onChange={() => {}} />
              </ComponentCard>
            )}

            {filterComponent('MultiSelectDropdown') && (
              <ComponentCard
                name="MultiSelectDropdown"
                importPath="import { MultiSelectDropdown } from '@/components/ui'"
                code={`<MultiSelectDropdown
  options={options}
  values={values}
  onChange={setValues}
/>`}
              >
                <MultiSelectDropdown options={mockOptions} values={[]} onChange={() => {}} placeholder="Select multiple..." />
                <MultiSelectDropdown options={mockOptions} values={['1', '2']} onChange={() => {}} />
              </ComponentCard>
            )}

            {filterComponent('CreatableDropdown') && (
              <ComponentCard
                name="CreatableDropdown"
                importPath="import { CreatableDropdown } from '@/components/ui'"
                code={`<CreatableDropdown
  options={options}
  value={value}
  onChange={setValue}
  onCreateOption={handleCreate}
/>`}
              >
                <CreatableDropdown
                  options={mockOptions}
                  value=""
                  onChange={() => {}}
                  onCreateOption={async (val) => ({ value: val, label: val })}
                  placeholder="Select or create..."
                />
              </ComponentCard>
            )}

            {filterComponent('ComboDropdown') && (
              <ComponentCard
                name="ComboDropdown"
                importPath="import { ComboDropdown } from '@/components/ui'"
                code={`<ComboDropdown
  options={options}
  value={value}
  onChange={setValue}
  allowCustomValue
/>`}
              >
                <ComboDropdown
                  options={mockOptions}
                  value=""
                  onChange={() => {}}
                  onSelect={() => {}}
                  allowCustomValue
                  placeholder="Type or select..."
                />
              </ComponentCard>
            )}

            {filterComponent('FilterDropdown') && (
              <ComponentCard
                name="FilterDropdown"
                importPath="import { FilterDropdown } from '@/components/ui'"
                code={`<FilterDropdown
  options={options}
  value={value}
  onChange={setValue}
  label="Filter by"
/>`}
              >
                <FilterDropdown
                  options={mockOptions}
                  value=""
                  onChange={() => {}}
                  label="Filter by status"
                />
              </ComponentCard>
            )}

            {filterComponent('CreatableMultiSelect') && (
              <ComponentCard
                name="CreatableMultiSelect"
                importPath="import { CreatableMultiSelect } from '@/components/ui'"
                code={`<CreatableMultiSelect
  options={options}
  values={values}
  onChange={setValues}
  onCreateOption={handleCreate}
/>`}
              >
                <CreatableMultiSelect
                  options={mockOptions}
                  values={[]}
                  onChange={() => {}}
                  onCreateOption={async (val) => ({ value: val, label: val })}
                  placeholder="Select or create multiple..."
                />
              </ComponentCard>
            )}
          </div>
        </section>

        {/* Buttons Section */}
        <section id="buttons" className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
            Button Components
          </h2>
          <p className="text-gray-600 mb-6">Action buttons with consistent styling and behavior</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filterComponent('ActionButton') && (
              <ComponentCard
                name="ActionButton"
                importPath="import { ActionButton } from '@/components/ui'"
                code={`<ActionButton variant="save">
  Save Changes
</ActionButton>`}
              >
                <div className="flex flex-col gap-2">
                  <ActionButton variant="save">Save Changes</ActionButton>
                  <ActionButton variant="cancel">Cancel</ActionButton>
                  <ActionButton variant="delete">Delete</ActionButton>
                </div>
              </ComponentCard>
            )}

            {filterComponent('EditButton') && (
              <ComponentCard
                name="EditButton"
                importPath="import { EditButton } from '@/components/ui'"
                code={`<EditButton design="balanced" />
<EditButton design="descriptive" context="Client" />`}
              >
                <div className="flex flex-col gap-2 items-start">
                  <EditButton design="minimal" />
                  <EditButton design="balanced" />
                  <EditButton design="descriptive" context="Client" />
                </div>
              </ComponentCard>
            )}

            {filterComponent('AddButton') && (
              <ComponentCard
                name="AddButton"
                importPath="import { AddButton } from '@/components/ui'"
                code={`<AddButton design="balanced" />
<AddButton design="descriptive" context="Product" />`}
              >
                <div className="flex flex-col gap-2 items-start">
                  <AddButton design="minimal" />
                  <AddButton design="balanced" />
                  <AddButton design="descriptive" context="Product" />
                </div>
              </ComponentCard>
            )}

            {filterComponent('DeleteButton') && (
              <ComponentCard
                name="DeleteButton"
                importPath="import { DeleteButton } from '@/components/ui'"
                code={`<DeleteButton design="balanced" />
<DeleteButton design="descriptive" context="Record" />`}
              >
                <div className="flex flex-col gap-2 items-start">
                  <DeleteButton design="minimal" />
                  <DeleteButton design="balanced" />
                  <DeleteButton design="descriptive" context="Record" />
                </div>
              </ComponentCard>
            )}

            {filterComponent('LapseButton') && (
              <ComponentCard
                name="LapseButton"
                importPath="import { LapseButton } from '@/components/ui'"
                code={`<LapseButton design="minimal" />
<LapseButton design="balanced" />
<LapseButton design="descriptive" context="Policy" />`}
              >
                <div className="flex flex-col gap-2 items-start">
                  <LapseButton design="minimal" />
                  <LapseButton design="balanced" />
                  <LapseButton design="descriptive" context="Policy" />
                </div>
              </ComponentCard>
            )}

            {filterComponent('Button') && (
              <ComponentCard
                name="Button"
                importPath="import { Button } from '@/components/ui'"
                code={`<Button variant="primary">
  Primary Button
</Button>`}
              >
                <div className="flex flex-col gap-2">
                  <Button variant="primary">Primary</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="outline">Outline</Button>
                </div>
              </ComponentCard>
            )}

            {filterComponent('IconActionButtons') && (
              <ComponentCard
                name="Icon Action Buttons (Phase 2)"
                importPath="import { LapseIconButton, MakeDeceasedIconButton, ReactivateIconButton, DeleteIconButton } from '@/components/ui'"
                code={`// For Active records:
<LapseIconButton onClick={handleLapse} />
<MakeDeceasedIconButton onClick={handleMakeDeceased} />

// For Inactive records:
<ReactivateIconButton onClick={handleReactivate} />
<DeleteIconButton onClick={handleDelete} />`}
              >
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Active Status Actions:</p>
                    <div className="flex gap-2 items-center">
                      <LapseIconButton onClick={() => {}} />
                      <MakeDeceasedIconButton onClick={() => {}} />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Inactive Status Actions:</p>
                    <div className="flex gap-2 items-center">
                      <ReactivateIconButton onClick={() => {}} />
                      <DeleteIconButton onClick={() => {}} />
                    </div>
                  </div>
                </div>
              </ComponentCard>
            )}
          </div>
        </section>

        {/* Badges Section */}
        <section id="badges" className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
            Badge Components
          </h2>
          <p className="text-gray-600 mb-6">Status indicators and labels</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filterComponent('StatusBadge') && (
              <ComponentCard
                name="StatusBadge"
                importPath="import { StatusBadge } from '@/components/ui'"
                code={`<StatusBadge status="active" />
<StatusBadge status="inactive" />
<StatusBadge status="pending" />`}
              >
                <div className="flex gap-2 flex-wrap">
                  <StatusBadge status="active" />
                  <StatusBadge status="inactive" />
                  <StatusBadge status="pending" />
                  <StatusBadge status="lapsed" />
                </div>
              </ComponentCard>
            )}
          </div>
        </section>

        {/* Cards Section */}
        <section id="cards" className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
            Card Components
          </h2>
          <p className="text-gray-600 mb-6">Card containers and stat display components</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filterComponent('Card') && (
              <ComponentCard
                name="Card"
                importPath="import { Card } from '@/components/ui'"
                code={`<Card>
  <h3>Card Title</h3>
  <p>Card content goes here</p>
</Card>`}
              >
                <Card>
                  <h3 className="font-semibold mb-2">Card Title</h3>
                  <p className="text-sm text-gray-600">Card content goes here</p>
                </Card>
              </ComponentCard>
            )}

            {filterComponent('StatCard') && (
              <ComponentCard
                name="StatCard"
                importPath="import { StatCard } from '@/components/ui'"
                code={`<StatCard
  title="Total Clients"
  value={156}
  change={12}
  trend="up"
/>`}
              >
                <StatCard title="Total Clients" value={156} change={12} trend="up" />
              </ComponentCard>
            )}

            {filterComponent('StatBox') && (
              <ComponentCard
                name="StatBox"
                importPath="import { StatBox } from '@/components/ui'"
                code={`<StatBox
  label="AUM"
  value="£45.2M"
  change={8}
  trend="up"
/>`}
              >
                <StatBox label="AUM" value="£45.2M" change={8} trend="up" />
              </ComponentCard>
            )}

            {filterComponent('ChangeIndicator') && (
              <ComponentCard
                name="ChangeIndicator"
                importPath="import { ChangeIndicator } from '@/components/ui'"
                code={`<ChangeIndicator value={12} trend="up" />
<ChangeIndicator value={-5} trend="down" />`}
              >
                <div className="flex gap-4">
                  <ChangeIndicator value={12} trend="up" />
                  <ChangeIndicator value={-5} trend="down" />
                  <ChangeIndicator value={0} trend="neutral" />
                </div>
              </ComponentCard>
            )}
          </div>
        </section>

        {/* Data Displays Section */}
        <section id="data-displays" className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
            Data Display Components
          </h2>
          <p className="text-gray-600 mb-6">Charts, tables, and data visualization</p>
          <div className="grid grid-cols-1 gap-6">
            {filterComponent('DataTable') && (
              <ComponentCard
                name="DataTable"
                importPath="import { DataTable } from '@/components/ui'"
                code={`<DataTable
  data={tableData}
  columns={columns}
  onRowClick={handleRowClick}
/>`}
              >
                <DataTable data={mockTableData} columns={mockTableColumns} />
              </ComponentCard>
            )}

            {filterComponent('FundDistributionChart') && (
              <ComponentCard
                name="FundDistributionChart"
                importPath="import { FundDistributionChart } from '@/components/ui'"
                code={`<FundDistributionChart
  data={fundData}
  title="Fund Distribution"
/>`}
              >
                <div className="bg-gray-50 p-4 rounded text-sm text-gray-600 text-center">
                  FundDistributionChart - Displays fund allocation pie/bar charts
                </div>
              </ComponentCard>
            )}
          </div>
        </section>

        {/* Feedback Section */}
        <section id="feedback" className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
            Feedback Components
          </h2>
          <p className="text-gray-600 mb-6">Loading states, empty states, and error displays</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filterComponent('Skeleton') && (
              <ComponentCard
                name="Skeleton"
                importPath="import { Skeleton } from '@/components/ui'"
                code={`<Skeleton width="100%" height="20px" />
<Skeleton width="80%" height="20px" />
<Skeleton width="60%" height="20px" />`}
              >
                <Skeleton width="100%" height="20px" />
                <Skeleton width="80%" height="20px" />
                <Skeleton width="60%" height="20px" />
              </ComponentCard>
            )}

            {filterComponent('StatBoxSkeleton') && (
              <ComponentCard
                name="StatBoxSkeleton"
                importPath="import { StatBoxSkeleton } from '@/components/ui'"
                code={`<StatBoxSkeleton />`}
              >
                <StatBoxSkeleton />
              </ComponentCard>
            )}

            {filterComponent('EmptyState') && (
              <ComponentCard
                name="EmptyState"
                importPath="import { EmptyState } from '@/components/ui'"
                code={`<EmptyState
  title="No items found"
  message="Try adjusting your search"
/>`}
              >
                <EmptyState title="No items found" message="Try adjusting your search or filters" />
              </ComponentCard>
            )}

            {filterComponent('ErrorDisplay') && (
              <ComponentCard
                name="ErrorDisplay"
                importPath="import { ErrorDisplay } from '@/components/ui'"
                code={`<ErrorDisplay
  title="Error loading data"
  message="Please try again later"
/>`}
              >
                <ErrorDisplay title="Error loading data" message="Please try again later" />
              </ComponentCard>
            )}

            {filterComponent('ErrorStateNetwork') && (
              <ComponentCard
                name="ErrorStateNetwork"
                importPath="import { ErrorStateNetwork } from '@/components/ui'"
                code={`<ErrorStateNetwork onRetry={handleRetry} />`}
              >
                <ErrorStateNetwork onRetry={() => {}} />
              </ComponentCard>
            )}

            {filterComponent('ErrorStateServer') && (
              <ComponentCard
                name="ErrorStateServer"
                importPath="import { ErrorStateServer } from '@/components/ui'"
                code={`<ErrorStateServer onRetry={handleRetry} />`}
              >
                <ErrorStateServer onRetry={() => {}} />
              </ComponentCard>
            )}

            {filterComponent('ChartSkeleton') && (
              <ComponentCard
                name="ChartSkeleton"
                importPath="import { ChartSkeleton } from '@/components/ui'"
                code={`<ChartSkeleton />`}
              >
                <ChartSkeleton />
              </ComponentCard>
            )}

            {filterComponent('TableSkeleton') && (
              <ComponentCard
                name="TableSkeleton"
                importPath="import { TableSkeleton } from '@/components/ui'"
                code={`<TableSkeleton rows={5} columns={3} />`}
              >
                <TableSkeleton rows={3} columns={3} />
              </ComponentCard>
            )}
          </div>
        </section>

        {/* Tables Section */}
        <section id="tables" className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
            Table Components
          </h2>
          <p className="text-gray-600 mb-6">Table display and control components</p>
          <div className="grid grid-cols-1 gap-6">
            {filterComponent('StandardTable') && (
              <ComponentCard
                name="StandardTable"
                importPath="import { StandardTable } from '@/components/ui'"
                code={`<StandardTable
  data={tableData}
  columns={columns}
/>`}
              >
                <StandardTable data={mockTableData} columns={mockTableColumns} />
              </ComponentCard>
            )}

            {filterComponent('Phase2Table') && (
              <ComponentCard
                name="Phase2Table"
                importPath="import { Phase2Table } from '@/components/phase2/tables'"
                code={`// Define columns (Status and Actions columns auto-added)
const columns = [
  {
    key: 'firstName',
    label: 'First Name',
    sortable: true,
    render: (row) => row.firstName
  },
  {
    key: 'lastName',
    label: 'Last Name',
    sortable: true,
    render: (row) => row.lastName
  }
];

<Phase2Table
  data={data}
  columns={columns}
  isLoading={false}
  error={null}
  actionsRenderer={(row) => (
    <>
      {row.status === 'active' ? (
        <>
          <LapseIconButton onClick={() => handleLapse(row)} />
          <MakeDeceasedIconButton onClick={() => handleMakeDeceased(row)} />
        </>
      ) : (
        <>
          <ReactivateIconButton onClick={() => handleReactivate(row)} />
          <DeleteIconButton onClick={() => handleDelete(row)} />
        </>
      )}
    </>
  )}
  addButton={{
    label: 'Person',
    onClick: handleAdd
  }}
/>`}
              >
                <Phase2Table
                  data={mockPhase2Data}
                  columns={mockPhase2Columns}
                  isLoading={false}
                  error={null}
                  actionsRenderer={(row) => (
                    <>
                      {row.status === 'active' ? (
                        <>
                          <LapseIconButton onClick={() => console.log('Lapse', row)} />
                          <MakeDeceasedIconButton onClick={() => console.log('Make Deceased', row)} />
                        </>
                      ) : (
                        <>
                          <ReactivateIconButton onClick={() => console.log('Reactivate', row)} />
                          <DeleteIconButton onClick={() => console.log('Delete', row)} />
                        </>
                      )}
                    </>
                  )}
                  ariaLabel="Example Phase 2 Table"
                  emptyMessage="No items found"
                />
              </ComponentCard>
            )}

            {filterComponent('TableFilter') && (
              <ComponentCard
                name="TableFilter"
                importPath="import TableFilter from '@/components/ui/table-controls/TableFilter'"
                code={`<TableFilter
  options={options}
  values={values}
  onChange={setValues}
  title="Filter by status"
/>`}
              >
                <div className="bg-white p-4 rounded border">
                  <TableFilter
                    options={mockOptions}
                    values={[]}
                    onChange={() => {}}
                    title="Filter by status"
                  />
                </div>
              </ComponentCard>
            )}

            {filterComponent('TableSort') && (
              <ComponentCard
                name="TableSort"
                importPath="import TableSort from '@/components/ui/table-controls/TableSort'"
                code={`<TableSort
  currentSort={{ type: 'alphabetical', direction: null }}
  onSortChange={handleSort}
  title="Sort by name"
/>`}
              >
                <div className="bg-white p-4 rounded border">
                  <TableSort
                    currentSort={{ type: 'alphabetical', direction: null }}
                    onSortChange={() => {}}
                    title="Sort by name"
                    sortTypes={['alphabetical']}
                  />
                </div>
              </ComponentCard>
            )}

            {filterComponent('SortableColumnHeader') && (
              <ComponentCard
                name="SortableColumnHeader"
                importPath="import { SortableColumnHeader } from '@/components/ui'"
                code={`<SortableColumnHeader
  label="Name"
  sortKey="name"
  currentSort={{ column: 'name', direction: 'asc' }}
  onSort={handleSort}
/>`}
              >
                <div className="bg-white p-4 rounded border overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr>
                        <SortableColumnHeader
                          label="Name"
                          sortKey="name"
                          currentSort={{ column: 'name', direction: 'asc' }}
                          onSort={() => {}}
                        />
                      </tr>
                    </thead>
                  </table>
                </div>
              </ComponentCard>
            )}

            {filterComponent('TableSortHeader') && (
              <ComponentCard
                name="TableSortHeader"
                importPath="import { TableSortHeader } from '@/components/ui'"
                code={`<TableSortHeader
  label="Amount"
  column="amount"
  sortConfig={{ column: 'amount', direction: 'asc' }}
  onSort={handleSort}
/>`}
              >
                <div className="bg-white p-4 rounded border overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr>
                        <TableSortHeader
                          label="Amount"
                          column="amount"
                          sortConfig={{ column: 'amount', direction: 'asc' }}
                          onSort={() => {}}
                        />
                      </tr>
                    </thead>
                  </table>
                </div>
              </ComponentCard>
            )}

            {filterComponent('SkeletonTable') && (
              <ComponentCard
                name="SkeletonTable"
                importPath="import { SkeletonTable } from '@/components/ui'"
                code={`<SkeletonTable rows={5} columns={4} />`}
              >
                <SkeletonTable rows={3} columns={4} />
              </ComponentCard>
            )}
          </div>
        </section>

        {/* Table Action Icon Buttons Section */}
        <section id="table-icons" className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
            Table Action Icon Buttons
          </h2>
          <p className="text-gray-600 mb-6">Official icon-only action buttons for Phase2Table action columns</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filterComponent('TableActionIcons') && (
              <ComponentCard
                name="Table Action Icons (Phase 2 Table)"
                importPath="import LapseIconButton from '@/components/ui/table-icons/LapseIconButton'
import MakeDeceasedIconButton from '@/components/ui/table-icons/MakeDeceasedIconButton'
import ReactivateIconButton from '@/components/ui/table-icons/ReactivateIconButton'
import DeleteIconButton from '@/components/ui/table-icons/DeleteIconButton'"
                code={`// Usage in Phase2Table actionsRenderer:
const actionsRenderer = (row) => {
  const isInactive = row.status === 'Inactive' || row.status === 'Deceased';

  if (isInactive) {
    return (
      <>
        <ReactivateIconButton
          onClick={(e) => {
            e.stopPropagation();
            handleReactivate(row);
          }}
        />
        <DeleteIconButton
          onClick={(e) => {
            e.stopPropagation();
            handleDelete(row);
          }}
        />
      </>
    );
  }

  return (
    <>
      <LapseIconButton
        onClick={(e) => {
          e.stopPropagation();
          handleLapse(row);
        }}
      />
      <MakeDeceasedIconButton
        onClick={(e) => {
          e.stopPropagation();
          handleMakeDeceased(row);
        }}
      />
    </>
  );
};

<Phase2Table
  data={data}
  columns={columns}
  actionsRenderer={actionsRenderer}
/>`}
              >
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-900 mb-2">Active Status Actions:</p>
                    <p className="text-xs text-gray-500 mb-3">
                      For active records - allows lapsing or marking as deceased
                    </p>
                    <div className="flex gap-2 items-center p-3 bg-gray-50 rounded">
                      <LapseIconButtonTable onClick={() => console.log('Lapse clicked')} />
                      <MakeDeceasedIconButtonTable onClick={() => console.log('Make Deceased clicked')} />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 mb-2">Inactive/Deceased Status Actions:</p>
                    <p className="text-xs text-gray-500 mb-3">
                      For inactive or deceased records - allows reactivation or permanent deletion
                    </p>
                    <div className="flex gap-2 items-center p-3 bg-gray-50 rounded">
                      <ReactivateIconButtonTable onClick={() => console.log('Reactivate clicked')} />
                      <DeleteIconButtonTable onClick={() => console.log('Delete clicked')} />
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-900">
                    <p className="font-semibold mb-1">Note:</p>
                    <p>These are the official buttons for Phase2Table action columns. They feature:</p>
                    <ul className="list-disc ml-4 mt-1 space-y-0.5">
                      <li>44px WCAG 2.1 AA compliant touch targets</li>
                      <li>Loading states</li>
                      <li>Proper ARIA labels and accessibility</li>
                      <li>Color-coded actions (orange=lapse, gray=deceased, blue=reactivate, red=delete)</li>
                    </ul>
                  </div>
                </div>
              </ComponentCard>
            )}

            {filterComponent('TableActionIconsIndividual') && (
              <ComponentCard
                name="Individual Table Icon Buttons"
                importPath="See individual component imports"
                code={`// Import individually as needed:
import LapseIconButton from '@/components/ui/table-icons/LapseIconButton';
import MakeDeceasedIconButton from '@/components/ui/table-icons/MakeDeceasedIconButton';
import ReactivateIconButton from '@/components/ui/table-icons/ReactivateIconButton';
import DeleteIconButton from '@/components/ui/table-icons/DeleteIconButton';
import EditIconButton from '@/components/ui/table-icons/EditIconButton';`}
              >
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-gray-700 mb-1">LapseIconButton (Orange)</p>
                    <div className="p-2 bg-gray-50 rounded inline-flex">
                      <LapseIconButtonTable
                        onClick={() => console.log('Lapse')}
                        ariaLabel="Lapse record"
                      />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-700 mb-1">MakeDeceasedIconButton (Gray)</p>
                    <div className="p-2 bg-gray-50 rounded inline-flex">
                      <MakeDeceasedIconButtonTable
                        onClick={() => console.log('Make Deceased')}
                        ariaLabel="Mark as deceased"
                      />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-700 mb-1">ReactivateIconButton (Blue)</p>
                    <div className="p-2 bg-gray-50 rounded inline-flex">
                      <ReactivateIconButtonTable
                        onClick={() => console.log('Reactivate')}
                        ariaLabel="Reactivate record"
                      />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-700 mb-1">DeleteIconButton (Red)</p>
                    <div className="p-2 bg-gray-50 rounded inline-flex">
                      <DeleteIconButtonTable
                        onClick={() => console.log('Delete')}
                        ariaLabel="Delete record"
                      />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-700 mb-1">EditIconButton (Blue)</p>
                    <div className="p-2 bg-gray-50 rounded inline-flex">
                      <EditIconButton
                        onClick={() => console.log('Edit')}
                        ariaLabel="Edit record"
                      />
                    </div>
                  </div>
                </div>
              </ComponentCard>
            )}
          </div>
        </section>

        {/* Modals Section */}
        <section id="modals" className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
            Modal Components
          </h2>
          <p className="text-gray-600 mb-6">Dialog and modal overlays</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filterComponent('ModalShell') && (
              <ComponentCard
                name="ModalShell"
                importPath="import { ModalShell } from '@/components/ui'"
                code={`<ModalShell
  isOpen={isOpen}
  onClose={handleClose}
  title="Modal Title"
>
  Modal content here
</ModalShell>`}
              >
                <div className="bg-gray-50 p-4 rounded text-sm text-gray-600 text-center">
                  ModalShell - Customizable modal dialog container
                </div>
              </ComponentCard>
            )}

            {filterComponent('DeleteConfirmationModal') && (
              <ComponentCard
                name="DeleteConfirmationModal"
                importPath="import { DeleteConfirmationModal } from '@/components/ui'"
                code={`<DeleteConfirmationModal
  isOpen={isOpen}
  onClose={handleClose}
  onConfirm={handleDelete}
  title="Delete Record"
  message="Are you sure you want to delete this record?"
  isDeleting={isDeleting}
/>`}
              >
                <div className="bg-gray-50 p-4 rounded text-sm text-gray-600 text-center">
                  DeleteConfirmationModal - Confirmation dialog for delete actions
                </div>
              </ComponentCard>
            )}
          </div>
        </section>

        {/* Navigation Section */}
        <section id="navigation" className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
            Navigation Components
          </h2>
          <p className="text-gray-600 mb-6">Tab navigation and page navigation</p>
          <div className="grid grid-cols-1 gap-6">
            {filterComponent('TabNavigation') && (
              <ComponentCard
                name="TabNavigation"
                importPath="import { TabNavigation } from '@/components/ui'"
                code={`<TabNavigation
  tabs={[
    { id: 'tab1', label: 'Tab 1' },
    { id: 'tab2', label: 'Tab 2' }
  ]}
  activeTab="tab1"
  onTabChange={handleTabChange}
/>`}
              >
                <TabNavigation
                  tabs={[
                    { id: 'tab1', label: 'Overview' },
                    { id: 'tab2', label: 'Details' },
                    { id: 'tab3', label: 'Settings' }
                  ]}
                  activeTab="tab1"
                  onTabChange={() => {}}
                />
              </ComponentCard>
            )}
          </div>
        </section>

        {/* Date Components Section */}
        <section id="date" className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
            Date Components
          </h2>
          <p className="text-gray-600 mb-6">Date picker utilities and calendar components</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filterComponent('MiniYearSelector') && (
              <ComponentCard
                name="MiniYearSelector"
                importPath="import { MiniYearSelector } from '@/components/ui'"
                code={`<MiniYearSelector
  selectedYear={2024}
  onYearChange={handleYearChange}
/>`}
              >
                <div className="bg-gray-50 p-4 rounded text-sm text-gray-600 text-center">
                  MiniYearSelector - Compact year selection control
                </div>
              </ComponentCard>
            )}

            {filterComponent('EnhancedMonthHeader') && (
              <ComponentCard
                name="EnhancedMonthHeader"
                importPath="import { EnhancedMonthHeader } from '@/components/ui'"
                code={`<EnhancedMonthHeader
  currentMonth={new Date()}
  onMonthChange={handleMonthChange}
/>`}
              >
                <div className="bg-gray-50 p-4 rounded text-sm text-gray-600 text-center">
                  EnhancedMonthHeader - Enhanced calendar month navigation
                </div>
              </ComponentCard>
            )}
          </div>
        </section>

        {/* Miscellaneous Section */}
        <section id="misc" className="mb-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
            Miscellaneous Components
          </h2>
          <p className="text-gray-600 mb-6">Other utility components</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filterComponent('ProfileAvatar') && (
              <ComponentCard
                name="ProfileAvatar"
                importPath="import { ProfileAvatar } from '@/components/ui'"
                code={`<ProfileAvatar
  name="John Doe"
  size="md"
  imageUrl={avatarUrl}
/>`}
              >
                <div className="flex gap-3">
                  <ProfileAvatar name="John Doe" size="sm" />
                  <ProfileAvatar name="Jane Smith" size="md" />
                  <ProfileAvatar name="Bob Johnson" size="lg" />
                </div>
              </ComponentCard>
            )}
          </div>
        </section>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-gray-200 text-center text-gray-600 text-sm">
          <p>
            This is an internal developer tool for component discovery and reuse.
            <br />
            To add a new component, edit <code className="bg-gray-100 px-2 py-1 rounded">ComponentShowcase.tsx</code>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ComponentShowcase;
