import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api, { getActiveTemplatePortfolioGenerations } from '../services/api';
import { getProviderColor } from '../services/providerColors';
import FilterDropdown from '../components/ui/FilterDropdown';

interface Product {
  id: number;
  client_id: number;
  client_name?: string;
  product_name: string;
  provider_name?: string;
  provider_id?: number;
  provider_theme_color?: string;
  portfolio_name?: string;
  status: string;
  start_date: string;
  irr?: number | null;
  irr_date?: string | null;
  total_value?: number;
  product_owners?: Array<{id: number, name: string, type?: string}>;
  original_template_id?: number;
  original_template_name?: string;
  template_info?: any;
}

type SortField = 'product_name' | 'provider_name' | 'client_name' | 'total_value' | 'status' | 'irr' | 'product_owners' | 'original_template_name';
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<{id: number, name: string} | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [providerFilter, setProviderFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [productOwnerFilter, setProductOwnerFilter] = useState<string[]>([]);
  const [templatePortfolioFilter, setTemplatePortfolioFilter] = useState<string[]>([]);

  // State for active template portfolio generations
  const [activeTemplateGenerations, setActiveTemplateGenerations] = useState<{generation_name: string}[]>([]);

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      console.log("Fetching products data with optimized endpoint...");
      
      // Use the new optimized endpoint that returns products with owners
      // This eliminates the N+1 query problem
      const [
        productsWithOwnersRes,
        providersRes
      ] = await Promise.all([
        api.get('/client_products_with_owners'),
        api.get('/available_providers')
      ]);
      
      // Set products directly from the optimized endpoint response
      // The backend now handles all the data joining
      const productsData = productsWithOwnersRes.data || [];
      
      // Log summary for debugging
      console.log(`Received ${productsData.length} products with their owners already populated`);
      if (productsData.length > 0) {
        const sampleProduct = productsData[0];
        console.log('Sample product:', {
          id: sampleProduct.id,
          name: sampleProduct.product_name,
          client: sampleProduct.client_name,
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
    fetchProducts();
    fetchActiveTemplateGenerations();
  }, [api]);

  const handleSortFieldChange = (field: SortField) => {
    if (field === sortField) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleProductClick = (productId: number) => {
    navigate(`/products/${productId}`);
  };

  const handleDeleteClientGroupProducts = (clientName: string) => {
    // Find the client ID from products
    const clientProduct = products.find(product => product.client_name === clientName);
    if (clientProduct) {
      setClientToDelete({
        id: clientProduct.client_id,
        name: clientName
      });
      setShowDeleteConfirm(true);
    }
  };

  const handleConfirmDelete = async () => {
    if (!clientToDelete) return;
    
    try {
      setIsDeleting(true);
      
      // Call API to delete all products, portfolios, and products for this client
      await api.delete(`/client_groups/${clientToDelete.id}/products`);
      
      // Refresh the products list
      await fetchProducts();
      
      // Close the modal
      setShowDeleteConfirm(false);
      setClientToDelete(null);
    } catch (err: any) {
      console.error('Error deleting client products:', err);
      setError(err.response?.data?.detail || 'Failed to delete client products');
    } finally {
      setIsDeleting(false);
    }
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
  const formatPercentage = (value: number | null | undefined): string => {
    if (value === null || value === undefined) {
      return 'N/A';
    }
    return `${value.toFixed(1)}%`;
  };

  // Update this helper function to format product owners as a vertical stack when more than one
  const formatProductOwners = (owners?: Array<{id: number, name: string, type?: string}>): React.ReactNode => {
    if (!owners || owners.length === 0) {
      return 'None';
    }
    
    // If there's only one owner, display as text
    if (owners.length === 1) {
      return owners[0].name;
    }
    
    // If multiple owners, return them stacked vertically
    return (
      <div className="flex flex-col space-y-1">
        {owners.map(owner => (
          <div key={owner.id} className="text-sm">
            {owner.name}
          </div>
        ))}
      </div>
    );
  };

  const filteredAndSortedProducts = products
    .filter(product => 
      (product.product_name && product.product_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (product.client_name && product.client_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (product.provider_name && product.provider_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (product.status && product.status.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    .filter(product => 
      providerFilter.length === 0 ||
      (product.provider_name && providerFilter.includes(product.provider_name))
    )
    .filter(product => 
      statusFilter.length === 0 ||
      (product.status && statusFilter.includes(product.status))
    )
    .filter(product => 
      productOwnerFilter.length === 0 ||
      (product.product_owners && product.product_owners.some(owner => 
        productOwnerFilter.includes(owner.name)
      ))
    )
    .filter(product => 
      templatePortfolioFilter.length === 0 ||
      (product.original_template_name && templatePortfolioFilter.includes(product.original_template_name)) ||
      (templatePortfolioFilter.includes('Bespoke') && !product.original_template_id)
    )
    .sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];
      
      // Handle special sorting for product_owners
      if (sortField === 'product_owners') {
        const aOwners = a.product_owners || [];
        const bOwners = b.product_owners || [];
        aValue = aOwners.map(o => o.name).join(', ').toLowerCase();
        bValue = bOwners.map(o => o.name).join(', ').toLowerCase();
      }
      // Handle string comparisons
      else if (typeof aValue === 'string' && typeof bValue === 'string') {
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

  // Add a new handler function to navigate to the create client products page
  const handleCreateClientGroupProducts = () => {
    navigate('/create-client-group-products');
  };

  // Extract unique values for filters
  const providers = [...new Set(products
    .map(product => product.provider_name)
    .filter(provider => provider !== undefined && provider !== null))] as string[];
    
  const statuses = [...new Set(products
    .map(product => product.status)
    .filter(status => status !== undefined && status !== null))] as string[];
  
  const productOwners = [...new Set(
    products.flatMap(product => 
      (product.product_owners || []).map(owner => owner.name)
    ).filter(name => name !== undefined && name !== null)
  )] as string[];
  
  const templatePortfolios = [
    'Bespoke',
    ...activeTemplateGenerations.map(gen => gen.generation_name).filter(Boolean)
  ] as string[];

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
        {/* Search and Sort Controls */}
        <div className="flex flex-col sm:flex-row gap-3 mb-3">
          {/* Search Bar */}
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors duration-200"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
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
                      <button
                        onClick={() => handleDeleteClientGroupProducts(clientName)}
                        className="text-red-600 hover:text-red-800 text-sm font-medium flex items-center"
                        title="Delete all products for this client group"
                      >
                        <svg className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete
                      </button>
                    </div>
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
                            <th className="w-[20%] px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300">
                              <div className="flex flex-col items-start">
                                <span className="flex items-center group cursor-pointer" onClick={() => handleSortFieldChange('product_owners')}>
                                  Product Owners
                                  <span className="ml-1 text-gray-400 group-hover:text-indigo-500">
                                    {sortField === 'product_owners' ? (
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
                                  id="product-owner-filter-grouped"
                                  options={productOwners.map(o => ({ value: o, label: o }))}
                                  value={productOwnerFilter}
                                  onChange={(vals) => setProductOwnerFilter(vals.filter(v => typeof v === 'string'))}
                                  placeholder="All Owners"
                                  className="mt-1"
                                />
                              </div>
                            </th>
                            <th className="w-[20%] px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300">
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
                                  id="provider-filter-grouped"
                                  options={providers.map(p => ({ value: p, label: p }))}
                                  value={providerFilter}
                                  onChange={(vals) => setProviderFilter(vals.filter(v => typeof v === 'string'))}
                                  placeholder="All Providers"
                                  className="mt-1"
                                />
                              </div>
                            </th>
                            <th className="w-[15%] px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300">
                              <div className="flex flex-col items-start">
                                <span className="flex items-center group cursor-pointer" onClick={() => handleSortFieldChange('original_template_name')}>
                                  Template Portfolio
                                  <span className="ml-1 text-gray-400 group-hover:text-indigo-500">
                                    {sortField === 'original_template_name' ? (
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
                                  id="template-portfolio-filter-grouped"
                                  options={templatePortfolios.map(t => ({ value: t, label: t }))}
                                  value={templatePortfolioFilter}
                                  onChange={(vals) => setTemplatePortfolioFilter(vals.filter(v => typeof v === 'string'))}
                                  placeholder="All Templates"
                                  className="mt-1"
                                />
                              </div>
                            </th>
                            <th className="w-[15%] px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300">Value</th>
                            <th className="w-[15%] px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300">IRR</th>
                            <th className="w-[15%] px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300">
                              <div className="flex flex-col items-start">
                                <span className="flex items-center group cursor-pointer" onClick={() => handleSortFieldChange('status')}>
                                  Status
                                  <span className="ml-1 text-gray-400 group-hover:text-indigo-500">
                                    {sortField === 'status' ? (
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
                                  id="status-filter-grouped"
                                  options={statuses.map(s => ({ value: s, label: s }))}
                                  value={statusFilter}
                                  onChange={(vals) => setStatusFilter(vals.filter(v => typeof v === 'string'))}
                                  placeholder="All Statuses"
                                  className="mt-1"
                                />
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
                                <div className="text-sm text-gray-600">
                                  {formatProductOwners(product.product_owners)}
                                </div>
                              </td>
                              <td className="px-6 py-3 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div 
                                    className="h-3 w-3 rounded-full mr-2 flex-shrink-0" 
                                    style={{ backgroundColor: getProviderColor(product.provider_id, product.provider_name, product.provider_theme_color) }}
                                  ></div>
                                  <div className="text-sm text-gray-600 font-sans">{product.provider_name || 'Unknown'}</div>
                                </div>
                              </td>
                              <td className="px-6 py-3 whitespace-nowrap">
                                <div className="text-sm text-gray-600 font-sans">{product.original_template_name || (product.original_template_id ? 'Template' : 'Bespoke')}</div>
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
                              <td className="px-6 py-3 whitespace-nowrap">
                                <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  product.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {product.status}
                                </span>
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
                    <th className="w-[18%] px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300">
                      <div className="flex flex-col items-start">
                        <span className="flex items-center group cursor-pointer" onClick={() => handleSortFieldChange('product_owners')}>
                          Product Owners
                          <span className="ml-1 text-gray-400 group-hover:text-indigo-500">
                            {sortField === 'product_owners' ? (
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
                          id="product-owner-filter-regular"
                          options={productOwners.map(o => ({ value: o, label: o }))}
                          value={productOwnerFilter}
                          onChange={(vals) => setProductOwnerFilter(vals.filter(v => typeof v === 'string'))}
                          placeholder="All Owners"
                          className="mt-1"
                        />
                      </div>
                    </th>
                    <th className="w-[18%] px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300">
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
                    <th className="w-[18%] px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300">
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
                          id="provider-filter-regular"
                          options={providers.map(p => ({ value: p, label: p }))}
                          value={providerFilter}
                          onChange={(vals) => setProviderFilter(vals.filter(v => typeof v === 'string'))}
                          placeholder="All Providers"
                          className="mt-1"
                        />
                      </div>
                    </th>
                    <th className="w-[18%] px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300">
                      <div className="flex flex-col items-start">
                        <span className="flex items-center group cursor-pointer" onClick={() => handleSortFieldChange('original_template_name')}>
                          Template Portfolio
                          <span className="ml-1 text-gray-400 group-hover:text-indigo-500">
                            {sortField === 'original_template_name' ? (
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
                          id="template-portfolio-filter-regular"
                          options={templatePortfolios.map(t => ({ value: t, label: t }))}
                          value={templatePortfolioFilter}
                          onChange={(vals) => setTemplatePortfolioFilter(vals.filter(v => typeof v === 'string'))}
                          placeholder="All Templates"
                          className="mt-1"
                        />
                      </div>
                    </th>
                    <th className="w-[14%] px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300">Value</th>
                    <th className="w-[14%] px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300">
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
                    <th className="w-[14%] px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300">
                      <div className="flex flex-col items-start">
                        <span className="flex items-center group cursor-pointer" onClick={() => handleSortFieldChange('status')}>
                          Status
                          <span className="ml-1 text-gray-400 group-hover:text-indigo-500">
                            {sortField === 'status' ? (
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
                          id="status-filter-regular"
                          options={statuses.map(s => ({ value: s, label: s }))}
                          value={statusFilter}
                          onChange={(vals) => setStatusFilter(vals.filter(v => typeof v === 'string'))}
                          placeholder="All Statuses"
                          className="mt-1"
                        />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAndSortedProducts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-500 border-b border-gray-200">
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
                          <div className="text-sm text-gray-600">
                            {formatProductOwners(product.product_owners)}
                          </div>
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap">
                          <div className="text-sm text-gray-600 font-sans">{product.product_name}</div>
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap">
                          <div className="flex items-center">
                            <div 
                              className="h-3 w-3 rounded-full mr-2 flex-shrink-0" 
                              style={{ backgroundColor: getProviderColor(product.provider_id, product.provider_name, product.provider_theme_color) }}
                            ></div>
                            <div className="text-sm text-gray-600 font-sans">{product.provider_name || 'Unknown'}</div>
                          </div>
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap">
                          <div className="text-sm text-gray-600 font-sans">{product.original_template_name || (product.original_template_id ? 'Template' : 'Bespoke')}</div>
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
                        <td className="px-6 py-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            product.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {product.status}
                          </span>
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

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="relative mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg leading-6 font-medium text-gray-900 mt-4">Delete All Products</h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  Are you sure you want to delete all products for "{clientToDelete?.name}" client group?
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  This will delete all products, portfolios, and products associated with this client group.
                  <span className="font-medium"> This action cannot be undone.</span>
                </p>
              </div>
              <div className="flex justify-center gap-4 mt-4">
                <button 
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setClientToDelete(null);
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-800 text-base font-medium rounded-md shadow-sm hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-300"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className={`px-4 py-2 bg-red-600 text-white text-base font-medium rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 ${isDeleting ? 'opacity-75 cursor-not-allowed' : ''}`}
                >
                  {isDeleting ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Deleting...
                    </span>
                  ) : "Delete All"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;
