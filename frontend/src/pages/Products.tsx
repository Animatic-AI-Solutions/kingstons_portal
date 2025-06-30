import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api, { getActiveTemplatePortfolioGenerations } from '../services/api';
import { getProviderColor } from '../services/providerColors';
import FilterDropdown from '../components/ui/FilterDropdown';
import { FilterSearch } from '../components/ui';
import ActionButton from '../components/ui/ActionButton';
import { getProductOwnerDisplayName } from '../utils/productOwnerUtils';

interface Product {
  id: number;
  client_id: number;
  client_name: string;
  product_name: string;
  status: string;
  start_date: string;
  end_date?: string;
  irr?: number;
  irr_date?: string | null;
  total_value?: number;
  provider_name?: string;
  provider_id?: number;
  provider_theme_color?: string;
  portfolio_name?: string;
  product_type?: string;
  plan_number?: string;
  is_bespoke?: boolean;
  template_generation_id?: number;
  template_info?: {
    id: number;
    generation_name: string;
    name?: string;
  };
  portfolio_type_display?: string;
  target_risk?: number;
  portfolio_id?: number;
  notes?: string;
  product_owners?: Array<{id: number, firstname?: string, surname?: string, known_as?: string, type?: string}>;
  current_portfolio?: {
    id: number;
    portfolio_name: string;
    assignment_start_date: string;
  };
}

type SortField = 'product_name' | 'client_name' | 'total_value' | 'irr' | 'portfolio_type_display' | 'provider_name' | 'product_type';
type SortOrder = 'asc' | 'desc';

const Products: React.FC = () => {
  const navigate = useNavigate();
  const { api } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('product_name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


  // State for portfolio type filtering
  const [portfolioTypes, setPortfolioTypes] = useState<{value: string, label: string}[]>([]);
  const [selectedPortfolioTypes, setSelectedPortfolioTypes] = useState<string[]>([]);

  // State for other filters
  const [clientGroups, setClientGroups] = useState<{value: string, label: string}[]>([]);
  const [selectedClientGroups, setSelectedClientGroups] = useState<string[]>([]);
  
  const [productOwners, setProductOwners] = useState<{value: string, label: string}[]>([]);
  const [selectedProductOwners, setSelectedProductOwners] = useState<string[]>([]);
  
  const [productTypes, setProductTypes] = useState<{value: string, label: string}[]>([]);
  const [selectedProductTypes, setSelectedProductTypes] = useState<string[]>([]);
  
  const [providers, setProviders] = useState<{value: string, label: string}[]>([]);
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);

  // State for active template portfolio generations
  const [activeTemplateGenerations, setActiveTemplateGenerations] = useState<{generation_name: string}[]>([]);

  const fetchPortfolioTypes = async () => {
    try {
      console.log("Fetching portfolio types for filtering...");
      const response = await api.get('/portfolio_types');
      console.log("Portfolio types response:", response.data);
      
      const portfolioTypeOptions = response.data.map((type: string) => ({
        value: type,
        label: type
      }));
      
      setPortfolioTypes(portfolioTypeOptions);
    } catch (err: any) {
      console.error('Error fetching portfolio types:', err);
    }
  };

  const fetchFilterData = async () => {
    try {
      console.log("Fetching filter data...");
      
      const [
        clientGroupsRes,
        productOwnersRes,
        providersRes
      ] = await Promise.all([
        api.get('/client_groups'),
        api.get('/product_owners'),
        api.get('/available_providers')
      ]);

      // Client Groups
      const clientGroupOptions = clientGroupsRes.data.map((group: any) => ({
        value: group.name,
        label: group.name
      }));
      setClientGroups(clientGroupOptions);

      // Product Owners
      const productOwnerOptions = productOwnersRes.data.map((owner: any) => ({
        value: getProductOwnerDisplayName(owner),
        label: getProductOwnerDisplayName(owner)
      }));
      setProductOwners(productOwnerOptions);

      // Providers
      const providerOptions = providersRes.data.map((provider: any) => ({
        value: provider.name,
        label: provider.name
      }));
      setProviders(providerOptions);

    } catch (err: any) {
      console.error('Error fetching filter data:', err);
    }
  };

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      console.log("Fetching products data with optimized endpoint...");
      
      // Use the enhanced endpoint with portfolio type filtering
      let url = '/client_products_with_owners';
      const params = new URLSearchParams();
      
      // Add portfolio type filter if selected
      if (selectedPortfolioTypes.length > 0) {
        // For now, we'll fetch all and filter client-side since backend expects single portfolio_type
        // In future, we could enhance backend to support multiple portfolio types
      }
      
      const [
        productsWithOwnersRes,
        providersRes
      ] = await Promise.all([
        api.get(url),
        api.get('/available_providers')
      ]);
      
      // Set products directly from the optimized endpoint response
      let productsData = productsWithOwnersRes.data || [];
      
      // Extract unique product types for filtering
      const uniqueProductTypes = [...new Set(productsData.map((product: Product) => product.product_type).filter(Boolean))] as string[];
      const productTypeOptions = uniqueProductTypes.map((type: string) => ({
        value: type,
        label: type
      }));
      setProductTypes(productTypeOptions);
      
      // Apply all filters
      if (selectedPortfolioTypes.length > 0) {
        productsData = productsData.filter((product: Product) => 
          selectedPortfolioTypes.includes(product.portfolio_type_display || '')
        );
      }
      
      if (selectedClientGroups.length > 0) {
        productsData = productsData.filter((product: Product) => 
          selectedClientGroups.includes(product.client_name || '')
        );
      }
      
      if (selectedProductTypes.length > 0) {
        productsData = productsData.filter((product: Product) => 
          selectedProductTypes.includes(product.product_type || '')
        );
      }
      
      if (selectedProviders.length > 0) {
        productsData = productsData.filter((product: Product) => 
          selectedProviders.includes(product.provider_name || '')
        );
      }
      
      if (selectedProductOwners.length > 0) {
        productsData = productsData.filter((product: Product) => 
          product.product_owners?.some(owner => selectedProductOwners.includes(getProductOwnerDisplayName(owner)))
        );
      }
      
      // Log summary for debugging
      console.log(`Received ${productsData.length} products with portfolio type information`);
      if (productsData.length > 0) {
        const sampleProduct = productsData[0];
        console.log('Sample product:', {
          id: sampleProduct.id,
          name: sampleProduct.product_name,
          client: sampleProduct.client_name,
          portfolioType: sampleProduct.portfolio_type_display,
          ownerCount: sampleProduct.product_owners?.length || 0
        });
      }
      
      setProducts(productsData);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch products');
      console.error('Error fetching products:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchActiveTemplateGenerations = async () => {
    try {
      console.log("Fetching active template portfolio generations...");
      const response = await getActiveTemplatePortfolioGenerations();
      console.log("Active template generations response:", response.data);
      setActiveTemplateGenerations(response.data || []);
    } catch (err: any) {
      console.error('Error fetching active template generations:', err);
    }
  };

  useEffect(() => {
    fetchPortfolioTypes();
    fetchFilterData();
    fetchActiveTemplateGenerations();
  }, [api]);

  useEffect(() => {
    fetchProducts();
  }, [api, selectedPortfolioTypes, selectedClientGroups, selectedProductTypes, selectedProviders, selectedProductOwners]);

  const handleSortFieldChange = (field: SortField) => {
    if (field === sortField) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleProductClick = (productId: number) => {
    navigate(`/products/${productId}`, {
      state: {
        from: {
          pathname: '/products',
          label: 'Products'
        }
      }
    });
  };

  const handlePortfolioTypeFilterChange = (values: (string | number)[]) => {
    setSelectedPortfolioTypes(values as string[]);
  };

  const handleClientGroupFilterChange = (values: (string | number)[]) => {
    setSelectedClientGroups(values as string[]);
  };

  const handleProductOwnerFilterChange = (values: (string | number)[]) => {
    setSelectedProductOwners(values as string[]);
  };

  const handleProductTypeFilterChange = (values: (string | number)[]) => {
    setSelectedProductTypes(values as string[]);
  };

  const handleProviderFilterChange = (values: (string | number)[]) => {
    setSelectedProviders(values as string[]);
  };

  // Format currency with commas and 2 decimal places
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Format percentage with 1 decimal place
  const formatPercentage = (value: number | string | null | undefined): string => {
    if (value === null || value === undefined) {
      return 'N/A';
    }
    if (typeof value === 'string') {
      return value; // Return string values as-is (like "-")
    }
    return `${value.toFixed(1)}%`;
  };

  // Add a new handler function to navigate to the create client products page
  const handleCreateClientGroupProducts = () => {
    navigate(`/create-client-group-products?returnTo=${encodeURIComponent('/products')}`);
  };

  const filteredAndSortedProducts = products
    .filter(product => 
      (product.product_name && product.product_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (product.client_name && product.client_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (product.provider_name && product.provider_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (product.status && product.status.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (product.portfolio_type_display && product.portfolio_type_display.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    .sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];
      
      // Handle string comparisons
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      // Handle undefined values
      if (aValue === undefined) return 1;
      if (bValue === undefined) return -1;
      
      // Compare values
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });



  return (
    <div className="container mx-auto px-4 py-3">
      <div className="flex justify-between items-center mb-3">
        <h1 className="text-3xl font-normal text-gray-900 font-sans tracking-wide">Products</h1>
        <div className="flex items-center gap-4">
          <ActionButton
            variant="add"
            size="md"
            context="Client Group Products"
            design="descriptive"

            onClick={handleCreateClientGroupProducts}
          />
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-4 overflow-visible">
        {/* Search and Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-3 mb-3">
          {/* Search Bar - Using Group 2 FilterSearch */}
          <div className="flex-1">
            <FilterSearch
              placeholder="Filter products by name, client, provider, or status..."
              onFilter={setSearchQuery}
              showResultCount={true}
              resultCount={filteredAndSortedProducts.length}
              filterLabel="Product"
            />
          </div>
        </div>

        {/* product List */}
        <div className="mt-6">
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : error ? (
            <div className="text-red-600 text-center py-4">{error}</div>
          ) : (
            // Products table view
            <div className="overflow-x-auto overflow-visible">
              <table className="min-w-full table-fixed divide-y divide-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="w-[20%] px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300">
                      <div className="flex items-center group cursor-pointer hover:bg-indigo-50 rounded py-1 px-1 transition-colors duration-150" onClick={() => handleSortFieldChange('product_name')} title="Click to sort by Product">
                      Product
                        <span className="ml-1 text-gray-400 group-hover:text-indigo-500">
                          {sortField === 'product_name' ? (
                            sortOrder === 'asc' ? (
                              <svg className="h-4 w-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                              </svg>
                            ) : (
                              <svg className="h-4 w-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            )
                          ) : (
                            <svg className="h-4 w-4 opacity-0 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4" />
                            </svg>
                          )}
                        </span>
                      </div>
                    </th>
                                                <th className="w-[12%] px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300">
                              <div className="flex flex-col items-start">
                                <span className="flex items-center group cursor-pointer" onClick={() => handleSortFieldChange('client_name')}>
                                  Client Group
                                  <span className="ml-1 text-gray-400 group-hover:text-indigo-500">
                                    {sortField === 'client_name' ? (
                                      sortOrder === 'asc' ? (
                                        <svg className="h-4 w-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                        </svg>
                                      ) : (
                                        <svg className="h-4 w-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                      )
                                    ) : (
                                      <svg className="h-4 w-4 opacity-0 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4" />
                                      </svg>
                                    )}
                                  </span>
                                </span>
                                <FilterDropdown
                                  id="client-group-filter"
                                  options={clientGroups}
                                  value={selectedClientGroups}
                                  onChange={handleClientGroupFilterChange}
                                  placeholder="All Groups"
                                  className="min-w-[120px] mt-1"
                                />
                              </div>
                            </th>
                                                <th className="w-[12%] px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300">
                              <div className="flex flex-col items-start">
                                <span className="flex items-center group cursor-pointer" onClick={() => handleSortFieldChange('product_type')}>
                                  Product Type
                                  <span className="ml-1 text-gray-400 group-hover:text-indigo-500">
                                    {sortField === 'product_type' ? (
                                      sortOrder === 'asc' ? (
                                        <svg className="h-4 w-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                        </svg>
                                      ) : (
                                        <svg className="h-4 w-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                      )
                                    ) : (
                                      <svg className="h-4 w-4 opacity-0 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4" />
                                      </svg>
                                    )}
                                  </span>
                                </span>
                                <FilterDropdown
                                  id="product-type-filter"
                                  options={productTypes}
                                  value={selectedProductTypes}
                                  onChange={handleProductTypeFilterChange}
                                  placeholder="All Types"
                                  className="min-w-[120px] mt-1"
                                />
                              </div>
                            </th>
                                                <th className="w-[12%] px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300">
                              <div className="flex flex-col items-start">
                                <span className="flex items-center group cursor-pointer" onClick={() => handleSortFieldChange('provider_name')}>
                                  Provider
                                  <span className="ml-1 text-gray-400 group-hover:text-indigo-500">
                                    {sortField === 'provider_name' ? (
                                      sortOrder === 'asc' ? (
                                        <svg className="h-4 w-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                        </svg>
                                      ) : (
                                        <svg className="h-4 w-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                      )
                                    ) : (
                                      <svg className="h-4 w-4 opacity-0 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4" />
                                      </svg>
                                    )}
                                  </span>
                                </span>
                                <FilterDropdown
                                  id="provider-filter"
                                  options={providers}
                                  value={selectedProviders}
                                  onChange={handleProviderFilterChange}
                                  placeholder="All Providers"
                                  className="min-w-[120px] mt-1"
                                />
                              </div>
                            </th>
                                                <th className="w-[16%] px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300">
                              <div className="flex flex-col items-start">
                                <span>Product Owners</span>
                                <FilterDropdown
                                  id="product-owners-filter"
                                  options={productOwners}
                                  value={selectedProductOwners}
                                  onChange={handleProductOwnerFilterChange}
                                  placeholder="All Owners"
                                  className="min-w-[120px] mt-1"
                                />
                              </div>
                            </th>
                    <th className="w-[12%] px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300">
                      <div className="flex flex-col items-start">
                        <span className="flex items-center group cursor-pointer" onClick={() => handleSortFieldChange('portfolio_type_display')}>
                          Portfolio
                          <span className="ml-1 text-gray-400 group-hover:text-indigo-500">
                            {sortField === 'portfolio_type_display' ? (
                              sortOrder === 'asc' ? (
                                <svg className="h-4 w-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                </svg>
                              ) : (
                                <svg className="h-4 w-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              )
                            ) : (
                              <svg className="h-4 w-4 opacity-0 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4" />
                              </svg>
                            )}
                          </span>
                        </span>
                        <FilterDropdown
                          id="portfolio-type-filter-regular"
                          options={portfolioTypes}
                          value={selectedPortfolioTypes}
                          onChange={handlePortfolioTypeFilterChange}
                          placeholder="All Types"
                          className="min-w-[140px] mt-1"
                        />
                      </div>
                    </th>
                    <th className="w-[8%] px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300">Value</th>
                    <th className="w-[8%] px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300">
                      <div className="flex flex-col items-start">
                        <span className="flex items-center group cursor-pointer" onClick={() => handleSortFieldChange('irr')}>
                          IRR
                          <span className="ml-1 text-gray-400 group-hover:text-indigo-500">
                            {sortField === 'irr' ? (
                              sortOrder === 'asc' ? (
                                <svg className="h-4 w-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                </svg>
                              ) : (
                                <svg className="h-4 w-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              )
                            ) : (
                              <svg className="h-4 w-4 opacity-0 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4" />
                              </svg>
                            )}
                          </span>
                        </span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAndSortedProducts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-500 border-b border-gray-200">
                        No products found
                      </td>
                    </tr>
                  ) : (
                    filteredAndSortedProducts.map((product) => (
                    <tr 
                      key={product.id} 
                        className="hover:bg-indigo-50 transition-colors duration-150 cursor-pointer border-b border-gray-100"
                      onClick={() => handleProductClick(product.id)}
                    >
                        <td className="px-6 py-3 whitespace-nowrap">
                          <div className="text-sm text-gray-600 font-sans">{product.product_name}</div>
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap">
                          <div className="text-sm text-gray-600 font-sans">{product.client_name || 'N/A'}</div>
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap">
                          <div className="text-sm text-gray-600 font-sans">
                            {product.product_type || 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap">
                          <div className="text-sm text-gray-600 font-sans">
                            {product.provider_name || 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap">
                          <div className="text-sm text-gray-600 font-sans">
                            {product.product_owners && product.product_owners.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {product.product_owners.map((owner, index) => (
                                  <span key={owner.id} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    {getProductOwnerDisplayName(owner)}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              'N/A'
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap">
                          <div className="text-sm text-gray-600 font-sans">
                            {product.portfolio_type_display || 'Bespoke'}
                          </div>
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap">
                          {product.total_value !== undefined ? (
                            <div className="text-sm font-medium text-indigo-600">
                              {formatCurrency(product.total_value)}
                            </div>
                          ) : (
                            <div className="text-sm text-gray-500">N/A</div>
                          )}
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap">
                          {product.irr !== undefined && product.irr !== null ? (
                          <div>
                              <div className={`text-sm font-medium ${(product.irr ?? 0) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                              {formatPercentage(product.irr)}
                              </div>
                              {product.irr_date && (
                                <div className="text-xs text-gray-500 mt-1">
                                  as of {new Date(product.irr_date).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-sm text-gray-500">-</div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Products;
