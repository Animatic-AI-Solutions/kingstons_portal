import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { SearchableDropdown } from '../components/ui';
import FilterDropdown from '../components/ui/FilterDropdown';

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
  const { api } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDormant, setShowDormant] = useState(false);
  const [advisorFilter, setAdvisorFilter] = useState<string[]>([]);
  const [showAdvisorFilter, setShowAdvisorFilter] = useState(false);
  const advisorFilterRef = useRef<HTMLDivElement>(null);
  
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
    fetchClients();
    
    // Check for success message in location state
    if (location.state && location.state.message) {
      setSuccessMessage(location.state.message);
      // Clear the message from location state after displaying it
      window.history.replaceState({}, document.title);
      
      // Auto-hide the message after 5 seconds
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [location]);

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

  const fetchClients = async () => {
    try {
      setIsLoading(true);
      console.log("Fetching client groups...");
      console.log("API object:", api);

      let clientData = [];
      let fumData = [];

      if (!api || typeof api.get !== 'function') {
        console.error("API instance is not valid. Creating a direct axios request instead.");
        // Fallback to direct axios request if api is not properly initialized
        const [clientsResponse, fumResponse] = await Promise.all([
          axios.get('http://localhost:8000/clients', {
            params: { show_dormant: true },
            withCredentials: true
          }),
          axios.get('http://localhost:8000/client_group_fum_summary', { withCredentials: true })
        ]);
        clientData = clientsResponse.data;
        fumData = fumResponse.data;
      } else {
        // Use the regular api instance from context
        const [clientsResponse, fumResponse] = await Promise.all([
          api.get('/client_groups', { params: { show_dormant: true } }),
          api.get('/client_group_fum_summary')
        ]);
        clientData = clientsResponse.data;
        fumData = fumResponse.data;
      }

      // Map FUM data by client_group_id for quick lookup
      const fumMap = new Map(fumData.map((row: any) => [row.client_group_id, row.fum]));

      // Merge FUM into clients
      const clientsWithFum = clientData.map((client: Client) => ({
        ...client,
        fum: fumMap.get(client.id) ?? 0
      }));

      setClients(clientsWithFum);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch client groups');
      console.error('Error fetching client groups:', err);
    } finally {
      setIsLoading(false);
    }
  };

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
        <div className="flex flex-col sm:flex-row gap-3 mb-3">
          {/* Search Bar */}
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search client groups..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Client Groups List */}
        <div className="mt-6">
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
                          id="status-filter"
                          options={statuses}
                          value={statusFilter}
                          onChange={(vals) => setStatusFilter(vals.filter(v => typeof v === 'string'))}
                          placeholder="All Statuses"
                          className="min-w-[140px] mt-1"
                        />
                      </div>
                    </th>
                    <th className="w-[30%] px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300">
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
                        <div className="text-sm text-gray-600">{client.advisor || '-'}</div>
                        </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800`}>
                          {client.type || 'Family'}
                        </span>
                        </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          client.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {client.status}
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