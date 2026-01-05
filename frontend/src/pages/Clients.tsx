import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { SearchableDropdown, FilterSearch, StandardTable } from '../components/ui';
import type { ColumnConfig } from '../components/ui/tables/StandardTable';
import FilterDropdown from '../components/ui/dropdowns/FilterDropdown';
import { useOptimizedClientData } from '../hooks/useOptimizedClientData';
import DynamicPageContainer from '../components/phase2/client-groups/DynamicPageContainer';


interface Client {
  id: string;
  name: string | null;
  status: string;
  advisor: string | null; // Legacy text field
  advisor_id?: number | null; // New advisor relationship field
  advisor_name?: string | null;
  advisor_email?: string | null;
  advisor_first_name?: string | null;
  advisor_last_name?: string | null;
  type: string | null;
  created_at: string;
  updated_at: string;
  fum?: number;
}

const Clients: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  
  // Use React Query hook for optimized client data fetching
  const { data: bulkClientData, isLoading, error: queryError, refetch, invalidateClients } = useOptimizedClientData();
  
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    // Check for success message in location state
    if (location.state && location.state.message) {
      setSuccessMessage(location.state.message);
      // Clear the message from location state after displaying it
      window.history.replaceState({}, document.title);
      
      // Force refresh data when there's a success message (likely from deletion or other actions)
      invalidateClients();
      
      // Auto-hide the message after 5 seconds
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [location]); // Removed forceRefresh from dependencies to prevent infinite loop

  // Add page visibility listener to refresh data when page becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      // Only refresh if page becomes visible (don't check for existing data)
      if (!document.hidden) {
        console.log('Page became visible, checking for fresh data...');
        refetch();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refetch]);



  // Transform React Query data to match component expectations
  const clients: Client[] = bulkClientData?.client_groups.map((client: any) => ({
    id: client.id,
    name: client.name,
    status: client.status,
    advisor: client.advisor, // Legacy text field
    advisor_id: client.advisor_id || null, // New advisor relationship fields (from Priority 1)
    advisor_name: client.advisor_name || null,
    advisor_email: client.advisor_email || null,
    advisor_first_name: client.advisor_first_name || null,
    advisor_last_name: client.advisor_last_name || null,
    type: client.type,
    created_at: client.created_at,
    updated_at: client.created_at, // Use created_at as fallback for updated_at
    fum: client.fum
  })) || [];

  // Convert React Query error to string for component compatibility
  const error = queryError ? (queryError as any).response?.data?.detail || 'Failed to fetch client groups' : null;

  const handleAddClient = () => {
    navigate('/client-groups/add');
  };

  const handleClientClick = (clientId: string) => {
    navigate(`/client-groups/${clientId}/suite`);
  };



  // Format currency with commas and no decimal places
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Apply search filtering only - StandardTable will handle column filtering and sorting
  const searchFilteredClients = clients.filter(client => 
    searchQuery === '' || 
      (client.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (client.type?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  // Column configuration for StandardTable
  const columns: ColumnConfig[] = [
    {
      key: 'name',
      label: 'Name',
      dataType: 'text',
      alignment: 'left',
      control: 'sort'
    },
    {
      key: 'type', 
      label: 'Type',
      dataType: 'category',
      alignment: 'left',
      control: 'filter'
    },
    // FUM column removed for performance - was causing 30s load times
    // {
    //   key: 'fum',
    //   label: 'FUM', 
    //   dataType: 'currency',
    //   alignment: 'left',
    //   control: 'sort'
    // },
    {
      key: 'advisor_name', // Use the new advisor_name field instead of legacy advisor
      label: 'Advisor',
      dataType: 'category', 
      alignment: 'left',
      control: 'filter'
    },
    {
      key: 'status',
      label: 'Status',
      dataType: 'category',
      alignment: 'left', 
      control: 'filter'
    }
  ];

  return (
    <DynamicPageContainer 
      maxWidth="2800px"
      className="py-3"
    >
      <div className="flex justify-between items-center mb-3">
        <h1 className="text-3xl font-normal text-gray-900 font-sans tracking-wide">Client Groups</h1>
        <div className="flex items-center gap-4">
          <button
            onClick={handleAddClient}
            className="bg-primary-700 text-white px-4 py-1.5 rounded-xl font-medium hover:bg-primary-800 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-700 focus:ring-offset-2 shadow-sm flex items-center gap-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Client Group
          </button>
        </div>
      </div>

      {/* Success message */}
      {successMessage && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-green-700 text-base">
                {successMessage}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filter section */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="flex-1">
            <FilterSearch
              placeholder="Search client groups..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>
          </div>
        </div>

        {/* Client Groups List */}
        <div className="mt-3">
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : error ? (
            <div className="text-red-600 text-center py-4">{error}</div>
          ) : searchFilteredClients.length === 0 ? (
            <div className="text-gray-500 text-center py-4">No client groups found</div>
          ) : (
            <StandardTable
              data={searchFilteredClients}
              columns={columns}
              className="cursor-pointer"
              onRowClick={(client) => handleClientClick(client.id)}
            />
          )}
        </div>
    </DynamicPageContainer>
  );
};

export default Clients; 