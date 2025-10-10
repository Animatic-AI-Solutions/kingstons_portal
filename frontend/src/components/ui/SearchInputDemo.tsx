import React, { useState } from 'react';
import { 
  SearchInput, 
  GlobalSearch, 
  FilterSearch, 
  AutocompleteSearch,
  AutocompleteOption 
} from './index';
import {
  UserIcon,
  BuildingOffice2Icon,
  CubeIcon,
  ArrowTrendingUpIcon,
  TagIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';

/**
 * SearchInputDemo Component
 * 
 * Interactive demonstration of all Group 2 Search Input Family components:
 * - SearchInput: Standard search with debouncing and clear functionality
 * - GlobalSearch: System-wide search with dropdown results
 * - FilterSearch: Real-time filtering with result counts
 * - AutocompleteSearch: Search with dropdown suggestions and keyboard navigation
 * 
 * All components follow the Group 1 design system standards for visual consistency.
 */
const SearchInputDemo: React.FC = () => {
  // SearchInput demo state
  const [searchValue, setSearchValue] = useState('');
  const [searchResults, setSearchResults] = useState<string[]>([]);

  // FilterSearch demo state
  const [filterValue, setFilterValue] = useState('');
  const sampleData = [
    'Apple Inc.', 'Microsoft Corporation', 'Amazon.com Inc.', 'Alphabet Inc.',
    'Tesla Inc.', 'Meta Platforms Inc.', 'NVIDIA Corporation', 'JPMorgan Chase',
    'Johnson & Johnson', 'Procter & Gamble', 'Visa Inc.', 'Home Depot',
    'Mastercard Inc.', 'UnitedHealth Group', 'Bank of America', 'Pfizer Inc.'
  ];
  const filteredData = sampleData.filter(item => 
    item.toLowerCase().includes(filterValue.toLowerCase())
  );

  // AutocompleteSearch demo state
  const [selectedOption, setSelectedOption] = useState<AutocompleteOption | null>(null);
  
  const autocompleteOptions: AutocompleteOption[] = [
    {
      value: 'client-1',
      label: 'Acme Corporation',
      description: 'Technology company with $2.5M portfolio',
      icon: <BuildingOffice2Icon className="h-4 w-4" />
    },
    {
      value: 'client-2',
      label: 'Beta Industries',
      description: 'Manufacturing company with $1.8M portfolio',
      icon: <BuildingOffice2Icon className="h-4 w-4" />
    },
    {
      value: 'product-1',
      label: 'Growth Fund Portfolio',
      description: 'Aggressive growth strategy fund',
      icon: <ArrowTrendingUpIcon className="h-4 w-4" />
    },
    {
      value: 'product-2',
      label: 'Conservative Bond Fund',
      description: 'Low-risk fixed income fund',
      icon: <ArrowTrendingUpIcon className="h-4 w-4" />
    },
    {
      value: 'fund-1',
      label: 'S&P 500 Index Fund',
      description: 'Tracks the S&P 500 index',
      icon: <CubeIcon className="h-4 w-4" />
    },
    {
      value: 'fund-2',
      label: 'International Equity Fund',
      description: 'Global diversification fund',
      icon: <CubeIcon className="h-4 w-4" />
    },
    {
      value: 'user-1',
      label: 'John Smith',
      description: 'Portfolio Manager',
      icon: <UserIcon className="h-4 w-4" />
    },
    {
      value: 'user-2',
      label: 'Sarah Johnson',
      description: 'Financial Advisor',
      icon: <UserIcon className="h-4 w-4" />
    }
  ];

  const handleSearch = (value: string) => {
    setSearchValue(value);
    // Simulate search results
    if (value.length > 0) {
      const mockResults = [
        `Results for "${value}"`,
        `Found ${Math.floor(Math.random() * 20) + 1} items`,
        `Search completed in ${Math.random().toFixed(2)}s`
      ];
      setSearchResults(mockResults);
    } else {
      setSearchResults([]);
    }
  };

  const handleFilter = (value: string) => {
    setFilterValue(value);
  };

  const handleAutocompleteSelect = (option: AutocompleteOption) => {
    setSelectedOption(option);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Group 2: Search Input Family
        </h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Interactive demonstration of standardized search input components. 
          All components follow the Group 1 design system with consistent styling, 
          40px height, purple theme (#4B2D83), and unified behavior patterns.
        </p>
      </div>

      {/* Component Demonstrations */}
      <div className="space-y-12">
        
        {/* SearchInput Demo */}
        <section className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2 flex items-center">
              <TagIcon className="h-5 w-5 mr-2 text-purple-600" />
              SearchInput Component
            </h2>
            <p className="text-gray-600">
              Standard search input with debouncing, clear button, and loading states. 
              Perfect for general search functionality with optional callbacks.
            </p>
          </div>

          <div className="space-y-6">
            {/* Basic Search */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">Basic Search</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <SearchInput
                  label="Search with label"
                  placeholder="Search anything..."
                  onSearch={handleSearch}
                  helperText="Debounced search with 300ms delay"
                />
                <SearchInput
                  size="sm"
                  placeholder="Small size search"
                  onSearch={handleSearch}
                />
              </div>
            </div>

            {/* Search with States */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">Different States</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <SearchInput
                  placeholder="Loading state"
                  loading={true}
                />
                <SearchInput
                  placeholder="Error state"
                  error="Search failed"
                />
                <SearchInput
                  placeholder="Success state"
                  variant="success"
                />
              </div>
            </div>

            {/* Search Results Display */}
            {searchResults.length > 0 && (
              <div className="mt-4 p-4 bg-gray-50 rounded-md">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Search Results:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  {searchResults.map((result, index) => (
                    <li key={index}>• {result}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>

        {/* GlobalSearch Demo */}
        <section className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2 flex items-center">
              <TagIcon className="h-5 w-5 mr-2 text-purple-600" />
              GlobalSearch Component
            </h2>
            <p className="text-gray-600">
              System-wide search with dropdown results, entity icons, and navigation. 
              Searches across all entities in the application with keyboard navigation.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">Global Search</h3>
              <div className="max-w-md">
                <GlobalSearch />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Type to search across clients, products, funds, providers, and portfolios. 
                Use arrow keys to navigate, Enter to select, Escape to close.
              </p>
            </div>
          </div>
        </section>

        {/* FilterSearch Demo */}
        <section className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2 flex items-center">
              <TagIcon className="h-5 w-5 mr-2 text-purple-600" />
              FilterSearch Component
            </h2>
            <p className="text-gray-600">
              Real-time filtering for tables and lists with result counts and fast debouncing. 
              Optimized for filtering large datasets with immediate visual feedback.
            </p>
          </div>

          <div className="space-y-6">
            {/* Filter with Result Count */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">Filter with Result Count</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FilterSearch
                  label="Filter companies"
                  placeholder="Filter by company name..."
                  onFilter={handleFilter}
                  showResultCount={true}
                  resultCount={filteredData.length}
                  helperText="Fast filtering with 150ms debounce"
                />
                <FilterSearch
                  size="sm"
                  placeholder="Small filter"
                  filterLabel="Quick filter"
                  onFilter={handleFilter}
                />
              </div>
            </div>

            {/* Filtered Results Display */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">
                Filtered Results ({filteredData.length} of {sampleData.length})
              </h3>
              <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-md">
                {filteredData.length > 0 ? (
                  <ul className="divide-y divide-gray-200">
                    {filteredData.map((item, index) => (
                      <li key={index} className="px-4 py-2 text-sm text-gray-900">
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="px-4 py-8 text-center text-gray-500 text-sm">
                    No companies match your filter
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* AutocompleteSearch Demo */}
        <section className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2 flex items-center">
              <TagIcon className="h-5 w-5 mr-2 text-purple-600" />
              AutocompleteSearch Component
            </h2>
            <p className="text-gray-600">
              Search with dropdown suggestions, icons, descriptions, and keyboard navigation. 
              Supports custom filtering, selection callbacks, and custom value entry.
            </p>
          </div>

          <div className="space-y-6">
            {/* Basic Autocomplete */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">Autocomplete Search</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AutocompleteSearch
                  label="Search entities"
                  placeholder="Search clients, products, funds..."
                  options={autocompleteOptions}
                  onSelect={handleAutocompleteSelect}
                  helperText="Type to see suggestions with icons"
                />
                <AutocompleteSearch
                  size="sm"
                  placeholder="Compact autocomplete"
                  options={autocompleteOptions.slice(0, 4)}
                  maxResults={3}
                  allowCustomValue={true}
                />
              </div>
            </div>

            {/* Different Configurations */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">Configuration Options</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AutocompleteSearch
                  placeholder="Min 2 characters"
                  options={autocompleteOptions}
                  minSearchLength={2}
                  noOptionsText="No matches found"
                />
                <AutocompleteSearch
                  placeholder="Custom values allowed"
                  options={autocompleteOptions}
                  allowCustomValue={true}
                  emptySearchText="Start typing or enter custom value"
                />
              </div>
            </div>

            {/* Selection Display */}
            {selectedOption && (
              <div className="mt-4 p-4 bg-gray-50 rounded-md">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Selected Option:</h4>
                <div className="flex items-center space-x-3">
                  {selectedOption.icon && (
                    <div className="h-4 w-4 text-gray-500">
                      {selectedOption.icon}
                    </div>
                  )}
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {selectedOption.label}
                    </div>
                    {selectedOption.description && (
                      <div className="text-xs text-gray-500">
                        {selectedOption.description}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Design System Showcase */}
        <section className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2 flex items-center">
              <CalendarIcon className="h-5 w-5 mr-2 text-purple-600" />
              Design System Consistency
            </h2>
            <p className="text-gray-600">
              All Group 2 components share consistent design tokens with Group 1.
            </p>
          </div>

          <div className="space-y-6">
            {/* Size Comparison */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">Size Consistency</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-4">
                  <span className="w-16 text-xs text-gray-600">Small:</span>
                  <SearchInput size="sm" placeholder="32px height" className="flex-1" />
                </div>
                <div className="flex items-center space-x-4">
                  <span className="w-16 text-xs text-gray-600">Medium:</span>
                  <FilterSearch size="md" placeholder="40px height (default)" className="flex-1" />
                </div>
                <div className="flex items-center space-x-4">
                  <span className="w-16 text-xs text-gray-600">Large:</span>
                  <AutocompleteSearch size="lg" placeholder="48px height" options={[]} className="flex-1" />
                </div>
              </div>
            </div>

            {/* Theme Showcase */}
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-3">Purple Theme (#4B2D83)</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <SearchInput placeholder="Focus to see purple ring" />
                <FilterSearch placeholder="Consistent focus states" />
                <AutocompleteSearch placeholder="Unified styling" options={[]} />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Click any input to see the consistent purple focus ring and border color.
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* Footer */}
      <div className="text-center text-sm text-gray-500 pt-8 border-t border-gray-200">
        <p>
          Group 2 Search Input Family • Consistent Design System • 
          40px Default Height • Purple Theme (#4B2D83) • 16px Icons
        </p>
      </div>
    </div>
  );
};

export default SearchInputDemo; 