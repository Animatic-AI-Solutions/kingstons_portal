import React, { useState, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import FilterDropdown from '../components/ui/FilterDropdown';
import { TableSkeleton } from '../components/ui/TableSkeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorDisplay } from '../components/ui/ErrorDisplay';
import { useEntityData } from '../hooks/useEntityData';
import { 
  Provider, 
  ProviderSortField, 
  SortOrder, 
  getProviderColor 
} from '../utils/definitionsShared';
import api from '../services/api';

const DefinitionsProviders: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // State management
  const [searchQuery, setSearchQuery] = useState('');
  const [providerSortField, setProviderSortField] = useState<ProviderSortField>('name');
  const [providerSortOrder, setProviderSortOrder] = useState<SortOrder>('asc');
  const [providerStatusFilters, setProviderStatusFilters] = useState<(string | number)[]>([]);

  // Data fetching
  const fetchProviders = useCallback(async () => {
    const response = await api.get('/available_providers');
    const providers = response.data;
    
    // Fetch product count for each provider
    const providersWithCounts = await Promise.all(
      providers.map(async (provider: Provider) => {
        try {
          const productsResponse = await api.get('/client_products', {
            params: { provider_id: provider.id }
          });
          return {
            ...provider,
            product_count: productsResponse.data.length
          };
        } catch (err) {
          console.error(`Error fetching products for provider ${provider.id}:`, err);
          return {
            ...provider,
            product_count: 0
          };
        }
      })
    );
    
    return providersWithCounts;
  }, []);

  const { 
    data: providers, 
    loading: providersLoading, 
    error: providersError 
  } = useEntityData<Provider>(fetchProviders, []);

  // Filter options
  const providerStatusOptions = useMemo(() => [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' }
  ], []);

  // Event handlers
  const handleItemClick = useCallback((providerId: number) => {
    navigate(`/definitions/providers/${providerId}`);
  }, [navigate]);

  const handleAddNew = useCallback(() => {
    navigate('/definitions/providers/add');
  }, [navigate]);

  const handleProviderSortChange = useCallback((field: ProviderSortField) => {
    if (field === providerSortField) {
      setProviderSortOrder(providerSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setProviderSortField(field);
      setProviderSortOrder('asc');
    }
  }, [providerSortField, providerSortOrder]);

  // Filter and sort providers
  const filteredAndSortedProviders = useMemo(() => {
    return providers
      .filter(provider => 
        provider.status === 'active' &&
        (provider.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
         provider.status?.toLowerCase().includes(searchQuery.toLowerCase()) ||
         (provider.type && provider.type?.toLowerCase().includes(searchQuery.toLowerCase())))
      )
      .filter(provider => 
        providerStatusFilters.length === 0 || 
        (provider.status && providerStatusFilters.includes(provider.status))
      )
      .sort((a, b) => {
        let aValue: any = a[providerSortField];
        let bValue: any = b[providerSortField];
        
        // Handle string comparisons
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        }
        
        // Compare values
        if (aValue < bValue) return providerSortOrder === 'asc' ? -1 : 1;
        if (aValue > bValue) return providerSortOrder === 'asc' ? 1 : -1;
        return 0;
      });
  }, [providers, searchQuery, providerSortField, providerSortOrder, providerStatusFilters]);

  if (!user) return null;

  return (
    <div className="container mx-auto px-2 py-1 bg-pink-100/50">
      <div className="flex justify-between items-center mb-3">
        <h1 className="text-3xl font-normal text-gray-900 font-sans tracking-wide">Providers</h1>
        <div className="flex items-center gap-4">
          <button
            onClick={handleAddNew}
            className="bg-rose-600 text-white px-4 py-1.5 rounded-xl font-medium hover:bg-rose-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 shadow-sm flex items-center gap-1"
            aria-label="Add new provider"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Provider
          </button>
        </div>
      </div>

      {/* Search Controls */}
      <div className="flex flex-col sm:flex-row gap-3 mb-3">
        <div className="flex-1">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search providers..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-colors duration-200"
              aria-label="Search providers"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Providers Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {providersLoading ? (
          <div className="p-6">
            <TableSkeleton columns={3} />
          </div>
        ) : providersError ? (
          <div className="p-6">
            <ErrorDisplay message={providersError} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th 
                    className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300 w-1/3 cursor-pointer hover:bg-pink-50"
                    onClick={() => handleProviderSortChange('name')}
                  >
                    <div className="flex items-center">
                      <span>Provider</span>
                      {providerSortField === 'name' && (
                        <span className="ml-1">
                          {providerSortOrder === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300 w-1/3">
                    <div className="flex flex-col items-start gap-1">
                      <span>Status</span>
                      <FilterDropdown
                        id="provider-status-filter"
                        options={providerStatusOptions}
                        value={providerStatusFilters}
                        onChange={setProviderStatusFilters}
                        placeholder="All Statuses"
                        className="mt-1"
                      />
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300 w-1/3 cursor-pointer hover:bg-pink-50"
                    onClick={() => handleProviderSortChange('product_count')}
                  >
                    <div className="flex items-center">
                      <span>Products</span>
                      {providerSortField === 'product_count' && (
                        <span className="ml-1">
                          {providerSortOrder === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAndSortedProviders.length > 0 ? (
                  filteredAndSortedProviders.map(provider => (
                    <tr 
                      key={provider.id} 
                      className="hover:bg-pink-50 transition-colors duration-150 cursor-pointer border-b border-gray-100"
                      onClick={() => handleItemClick(provider.id)}
                    >
                      <td className="px-6 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          <div 
                            className="h-3 w-3 rounded-full mr-2 flex-shrink-0" 
                            style={{ backgroundColor: provider.theme_color || getProviderColor(provider.name) }}
                            aria-hidden="true"
                          ></div>
                          <div className="text-sm font-medium text-gray-800 font-sans tracking-tight">{provider.name}</div>
                        </div>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          provider.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {provider.status}
                        </span>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-600">
                          {provider.product_count !== undefined ? provider.product_count : 0}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="p-6">
                      <EmptyState message="No providers found" />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DefinitionsProviders; 