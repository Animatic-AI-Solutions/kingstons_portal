import React, { useState, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import FilterDropdown from '../components/ui/dropdowns/FilterDropdown';
import { TableSkeleton } from '../components/ui/feedback/TableSkeleton';
import { EmptyState } from '../components/ui/feedback/EmptyState';
import { ErrorDisplay } from '../components/ui/feedback/ErrorDisplay';
import { AddButton, SearchInput } from '../components/ui';
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
import DynamicPageContainer from '../components/DynamicPageContainer';

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
    <DynamicPageContainer 
      maxWidth="2800px"
      className="py-1"
    >
      <div className="flex justify-between items-center mb-3">
        <h1 className="text-3xl font-normal text-gray-900 font-sans tracking-wide">Providers</h1>
        <div className="flex items-center gap-4">
          <AddButton 
            context="Provider"
            design="balanced"
            size="md"
            onClick={handleAddNew}
          />
        </div>
      </div>

      {/* Search Controls */}
      <div className="flex flex-col sm:flex-row gap-3 mb-3">
        <SearchInput
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search providers..."
          size="md"
          className="flex-1"
        />
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
    </DynamicPageContainer>
  );
};

export default DefinitionsProviders; 