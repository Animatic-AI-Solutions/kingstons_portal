import React, { useState, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import FilterDropdown from '../components/ui/dropdowns/FilterDropdown';
import { TableSkeleton } from '../components/ui/feedback/TableSkeleton';
import { EmptyState } from '../components/ui/feedback/EmptyState';
import { ErrorDisplay } from '../components/ui/feedback/ErrorDisplay';
import AddProviderModal from '../components/AddProviderModal';
import { useEntityData } from '../hooks/useEntityData';
import { 
  Provider, 
  ProviderSortField, 
  SortOrder, 
  getProviderColor 
} from '../utils/definitionsShared';
import api from '../services/api';
import StandardTable, { ColumnConfig } from '../components/StandardTable';

const DefinitionsProviders: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // State management
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddProviderModal, setShowAddProviderModal] = useState(false);

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
    error: providersError,
    refresh: refreshProviders
  } = useEntityData<Provider>(fetchProviders, []);

  // Event handlers
  const handleItemClick = useCallback((provider: Provider) => {
    navigate(`/definitions/providers/${provider.id}`);
  }, [navigate]);

  const handleAddNew = useCallback(() => {
    setShowAddProviderModal(true);
  }, []);

  const handleAddProviderSuccess = useCallback((newProvider: any) => {
    // Refresh the providers list to include the new provider
    refreshProviders();
  }, [refreshProviders]);

  // Apply search filtering only - StandardTable will handle column filtering and sorting
  const searchFilteredProviders = useMemo(() => {
    return providers.filter(provider => 
      provider.status === 'active' &&
      (provider.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
       provider.status?.toLowerCase().includes(searchQuery.toLowerCase()) ||
       (provider.type && provider.type?.toLowerCase().includes(searchQuery.toLowerCase())))
    );
  }, [providers, searchQuery]);

  // Column configuration for StandardTable
  const columns: ColumnConfig[] = [
    {
      key: 'name',
      label: 'Provider',
      dataType: 'provider',
      alignment: 'left',
      control: 'sort'
    },
    {
      key: 'status',
      label: 'Status',
      dataType: 'category',
      alignment: 'left',
      control: 'filter'
    },
    {
      key: 'product_count',
      label: 'Products',
      dataType: 'number',
      alignment: 'left',
      control: 'sort',
      format: (value) => value !== undefined ? value.toString() : '0'
    }
  ];

  if (!user) return null;

  return (
    <div className="container mx-auto px-2 py-1">
      <div className="flex justify-between items-center mb-3">
        <h1 className="text-3xl font-normal text-gray-900 font-sans tracking-wide">Providers</h1>
        <div className="flex items-center gap-4">
          <button
            onClick={handleAddNew}
            className="bg-primary-600 text-white px-4 py-1.5 rounded-xl font-medium hover:bg-primary-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 shadow-sm flex items-center gap-1"
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
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200"
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
        ) : searchFilteredProviders.length === 0 ? (
          <div className="p-6">
            <EmptyState message="No providers found" />
          </div>
        ) : (
          <StandardTable
            data={searchFilteredProviders}
            columns={columns}
            className="cursor-pointer"
            onRowClick={handleItemClick}
          />
        )}
      </div>

      {/* Add Provider Modal */}
      <AddProviderModal
        isOpen={showAddProviderModal}
        onClose={() => setShowAddProviderModal(false)}
        onSuccess={handleAddProviderSuccess}
      />
    </div>
  );
};

export default DefinitionsProviders; 