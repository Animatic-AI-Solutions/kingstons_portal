import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { SearchableDropdown, FilterSearch } from '../components/ui';
import FilterDropdown from '../components/ui/FilterDropdown';
import { useClientData } from '../hooks/useClientData';

interface Client {
  id: string;
  name: string | null;
  status: string;
  advisor: string | null;
  type: string | null;
  created_at: string;
  updated_at: string;
  fum?: number;
}

type SortField = 'name' | 'fum' | 'type' | 'status' | 'advisor';
type SortOrder = 'asc' | 'desc';

const Clients: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [showDormant, setShowDormant] = useState(false);
  const [advisorFilter, setAdvisorFilter] = useState<string[]>([]);
  const [showAdvisorFilter, setShowAdvisorFilter] = useState(false);
  const advisorFilterRef = useRef<HTMLDivElement>(null);
  
  // Use React Query hook for optimized client data fetching
  const { data: bulkClientData, isLoading, error: queryError, refetch, forceRefresh } = useClientData();
  
  // Refs for positioning dropdown menus
  const [advisorDropdownPosition, setAdvisorDropdownPosition] = useState({ top: 0, left: 0 });
  
  // Add typeFilter state in the component state declarations
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Function to calculate and set dropdown positions
  const updateAdvisorDropdownPosition = () => {
    if (advisorFilterRef.current) {
      const rect = advisorFilterRef.current.getBoundingClientRect();
      setAdvisorDropdownPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX
      });
    }
  };
  
  // Update positions when dropdown opens
  useEffect(() => {
    if (showAdvisorFilter) {
      updateAdvisorDropdownPosition();
      window.addEventListener('scroll', updateAdvisorDropdownPosition);
      window.addEventListener('resize', updateAdvisorDropdownPosition);
    }
    
    return () => {
      window.removeEventListener('scroll', updateAdvisorDropdownPosition);
      window.removeEventListener('resize', updateAdvisorDropdownPosition);
    };
  }, [showAdvisorFilter]);

  useEffect(() => {
    // Check for success message in location state
    if (location.state && location.state.message) {
      setSuccessMessage(location.state.message);
      // Clear the message from location state after displaying it
      window.history.replaceState({}, document.title);
      
      // Force refresh data when there's a success message (likely from deletion or other actions)
      forceRefresh();
      
      // Auto-hide the message after 5 seconds
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [location, forceRefresh]);

  // Add page visibility listener to refresh data when page becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      // Only refresh if page becomes visible and we have data
      if (!document.hidden && bulkClientData) {
        console.log('Page became visible, checking for fresh data...');
        refetch();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refetch, bulkClientData]);

  // Handle click outside to close the filter dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (advisorFilterRef.current && !advisorFilterRef.current.contains(event.target as Node)) {
        setShowAdvisorFilter(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Transform React Query data to match component expectations
  const clients: Client[] = bulkClientData?.client_groups.map((client) => ({
    id: client.id,
    name: client.name,
    status: client.status,
    advisor: client.advisor,
    type: client.type,
    created_at: client.created_at,
    updated_at: client.created_at, // Use created_at as fallback for updated_at
    fum: client.fum
  })) || [];

  // Convert React Query error to string for component compatibility
  const error = queryError ? (queryError as any).response?.data?.detail || 'Failed to fetch client groups' : null;

  const handleSortFieldChange = (field: SortField) => {
    if (field === sortField) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleAddClient = () => {
    navigate('/client_groups/add');
  };

  const handleClientClick = (clientId: string) => {
    navigate(`/client_groups/${clientId}`);
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

  // Update the filteredAndSortedClients to include filtering by type
  const filteredAndSortedClients = clients
    .filter(client => 
      (client.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (client.type?.toLowerCase() || '').includes(searchQuery.toLowerCase())
    )
    .filter(client => 
      advisorFilter.length === 0 ||
      (client.advisor && advisorFilter.includes(client.advisor))
    )
    .filter(client => 
      typeFilter.length === 0 ||
      (client.type && typeFilter.includes(client.type))
    )
    .filter(client =>
      statusFilter.length === 0 ||
      (client.status && statusFilter.includes(client.status))
    )
    .sort((a, b) => {
      if (sortField === 'fum') {
        const aValue = a.fum || 0;
        const bValue = b.fum || 0;
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      } else {
        // Sort by the selected field
          const aValue = String(a[sortField] || '').toLowerCase();
          const bValue = String(b[sortField] || '').toLowerCase();
          return sortOrder === 'asc' 
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
      }
    });

  // Extract unique advisor names
  const advisors = [...new Set(clients
    .map(client => client.advisor)
    .filter(advisor => advisor !== null))] as string[];

  const types = ['Family', 'Business', 'Trust'];
  const statuses = [{value: 'active', label: 'Active'}, {value: 'dormant', label: 'Dormant'}];

  return (
    <div className="container mx-auto px-4 py-3">
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

      <div className="bg-white shadow rounded-lg p-4 overflow-visible">
        {/* Search and Sort Controls */}
        <div className="flex flex-col sm:flex-row gap-3 mb-1">
          {/* Search Bar */}
          <div className="flex-1">
            <FilterSearch
              placeholder="Filter client groups by name or type..."
              onFilter={setSearchQuery}
              showResultCount={true}
              resultCount={filteredAndSortedClients.length}
              filterLabel="Client Group"
              size="md"
              fullWidth={true}
              debounceMs={150}
              className="!border-gray-300 focus:!border-indigo-500 focus:!ring-indigo-500/10 hover:!border-indigo-400"
            />
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
          ) : filteredAndSortedClients.length === 0 ? (
            <div className="text-gray-500 text-center py-4">No client groups found</div>
          ) : (
            <div className="overflow-x-auto overflow-visible">
              <table className="min-w-full table-fixed divide-y divide-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="w-[25%] px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300">
                      <div className="flex items-center group cursor-pointer hover:bg-indigo-50 rounded py-1 px-1 transition-colors duration-150" onClick={() => handleSortFieldChange('name')} title="Click to sort by Name">
                        Name
                        <span className="ml-1 text-gray-400 group-hover:text-indigo-500">
                          {sortField === 'name' ? (
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
                    <th className="w-[15%] px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300">
                      <div className="flex flex-col items-start">
                        <span className="flex items-center group cursor-pointer" onClick={() => handleSortFieldChange('type')}>
                          Type
                          <span className="ml-1 text-gray-400 group-hover:text-indigo-500">
                            {sortField === 'type' ? (
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
                          id="type-filter"
                          options={types.map(t => ({ value: t, label: t }))}
                          value={typeFilter}
                          onChange={(vals) => setTypeFilter(vals.filter(v => typeof v === 'string'))}
                          placeholder="All Types"
                          className="min-w-[140px] mt-1"
                        />
                      </div>
                    </th>
                    <th className="w-[20%] px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300">
                      <div className="flex items-center group cursor-pointer hover:bg-indigo-50 rounded py-1 px-1 transition-colors duration-150" onClick={() => handleSortFieldChange('fum')} title="Click to sort by FUM">
                        FUM
                        <span className="ml-1 text-gray-400 group-hover:text-indigo-500">
                          {sortField === 'fum' ? (
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
                        <span className="flex items-center group cursor-pointer" onClick={() => handleSortFieldChange('advisor')}>
                          Advisor
                          <span className="ml-1 text-gray-400 group-hover:text-indigo-500">
                            {sortField === 'advisor' ? (
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
                          id="advisor-filter"
                          options={advisors.map(a => ({ value: a, label: a }))}
                          value={advisorFilter}
                          onChange={(vals) => setAdvisorFilter(vals.filter(v => typeof v === 'string'))}
                          placeholder="All Advisors"
                          className="min-w-[140px] mt-1"
                        />
                      </div>
                    </th>
                    <th className="w-[20%] px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300">
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
                          id="status-filter"
                          options={statuses}
                          value={statusFilter}
                          onChange={(vals) => setStatusFilter(vals.filter(v => typeof v === 'string'))}
                          placeholder="All Statuses"
                          className="min-w-[140px] mt-1"
                        />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAndSortedClients.map((client) => (
                    <tr 
                      key={client.id} 
                        className="hover:bg-indigo-50 transition-colors duration-150 cursor-pointer border-b border-gray-100"
                      onClick={() => handleClientClick(client.id)}
                    >
                      <td className="px-6 py-3 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-800 font-sans tracking-tight">{client.name || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800`}>
                          {client.type || 'Family'}
                        </span>
                        </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                          {client.fum ? (
                            <div className="text-sm font-medium text-indigo-600">
                            {formatCurrency(client.fum)}
                            </div>
                          ) : (
                          <div className="text-sm text-gray-500">£0</div>
                          )}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-600">{client.advisor || '-'}</div>
                        </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          client.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {client.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Clients; 