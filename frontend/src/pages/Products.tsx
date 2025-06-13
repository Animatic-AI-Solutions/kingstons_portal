import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api, { getActiveTemplatePortfolioGenerations } from '../services/api';
import { getProviderColor } from '../services/providerColors';
import FilterDropdown from '../components/ui/FilterDropdown';
import { FilterSearch } from '../components/ui';

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
  product_owners?: Array<{id: number, name: string, type?: string}>;
  current_portfolio?: {
    id: number;
    portfolio_name: string;
    assignment_start_date: string;
  };
}

type SortField = 'product_name' | 'client_name' | 'total_value' | 'irr' | 'portfolio_type_display';
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
  const [groupByClient, setGroupByClient] = useState(false);

  // State for portfolio type filtering
  const [portfolioTypes, setPortfolioTypes] = useState<{value: string, label: string}[]>([]);
  const [selectedPortfolioTypes, setSelectedPortfolioTypes] = useState<string[]>([]);

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
      
      // Client-side filtering by portfolio types if selected
      if (selectedPortfolioTypes.length > 0) {
        productsData = productsData.filter((product: Product) => 
          selectedPortfolioTypes.includes(product.portfolio_type_display || '')
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
    fetchActiveTemplateGenerations();
  }, [api]);

  useEffect(() => {
    fetchProducts();
  }, [api, selectedPortfolioTypes]);

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

  // Group products by client if the option is selected
  const groupedProducts = groupByClient
    ? filteredAndSortedProducts.reduce((groups: Record<string, Product[]>, product) => {
        const clientName = product.client_name || 'Unknown Client Group';
        if (!groups[clientName]) {
          groups[clientName] = [];
        }
        groups[clientName].push(product);
        return groups;
      }, {})
    : {};

  return (
    <div className="container mx-auto px-4 py-3">
      <div className="flex justify-between items-center mb-3">
        <h1 className="text-3xl font-normal text-gray-900 font-sans tracking-wide">Products</h1>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={groupByClient}
              onChange={(e) => setGroupByClient(e.target.checked)}
              className="form-checkbox h-5 w-5 text-blue-600"
            />
            <span>Group by Client Group</span>
          </label>
          <button
            onClick={handleCreateClientGroupProducts}
            className="bg-primary-700 text-white px-4 py-1.5 rounded-xl font-medium hover:bg-primary-800 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-700 focus:ring-offset-2 shadow-sm flex items-center gap-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Client Group Products
          </button>
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
          ) : groupByClient ? (
            // Grouped by client view
            filteredAndSortedProducts.length === 0 ? (
              <div className="text-gray-500 text-center py-4">No products found</div>
            ) : (
              <div className="space-y-4">
                {Object.entries(groupedProducts).map(([clientName, clientProducts]) => (
                  <div key={clientName} className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                      <div>
                        <h3 className="text-base font-medium text-gray-900 font-sans tracking-tight">{clientName}</h3>
                        <p className="text-sm text-gray-500">{clientProducts.length} product(s)</p>
                      </div>
                    </div>
                    <div className="overflow-x-auto overflow-visible">
                      <table className="min-w-full table-fixed divide-y divide-gray-200">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="w-[35%] px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300">
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
                            <th className="w-[20%] px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300">
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
                                  id="portfolio-type-filter-grouped"
                                  options={portfolioTypes}
                                  value={selectedPortfolioTypes}
                                  onChange={handlePortfolioTypeFilterChange}
                                  placeholder="All Types"
                                  className="min-w-[140px] mt-1"
                                />
                              </div>
                            </th>
                            <th className="w-[22.5%] px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300">Value</th>
                            <th className="w-[22.5%] px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300">
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
                          {clientProducts.map((product) => (
                            <tr 
                              key={product.id} 
                              className="hover:bg-indigo-50 transition-colors duration-150 cursor-pointer border-b border-gray-100"
                              onClick={() => handleProductClick(product.id)}
                            >
                              <td className="px-6 py-3 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-800 font-sans tracking-tight">{product.product_name}</div>
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
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            // Regular table view
            <div className="overflow-x-auto overflow-visible">
              <table className="min-w-full table-fixed divide-y divide-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="w-[35%] px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300">
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
                    <th className="w-[20%] px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300">
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
                    <th className="w-[22.5%] px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300">Value</th>
                    <th className="w-[22.5%] px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300">
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
                      <td colSpan={4} className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-500 border-b border-gray-200">
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
