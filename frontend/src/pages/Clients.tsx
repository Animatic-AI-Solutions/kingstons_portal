import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { SearchableDropdown } from '../components/ui';
import FilterDropdown from '../components/ui/FilterDropdown';

interface Client {
  id: string;
  forname: string | null;
  surname: string | null;
  relationship: string;
  status: string;
  advisor: string | null;
  created_at: string;
  updated_at: string;
  fum?: number;
}

type SortField = 'surname' | 'relationship' | 'fum';
type SortOrder = 'asc' | 'desc';

const Clients: React.FC = () => {
  const navigate = useNavigate();
  const { api } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('surname');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDormant, setShowDormant] = useState(false);
  const [advisorFilter, setAdvisorFilter] = useState<string[]>([]);
  const [showAdvisorFilter, setShowAdvisorFilter] = useState(false);
  const [relationshipFilter, setRelationshipFilter] = useState<string[]>([]);
  const [showRelationshipFilter, setShowRelationshipFilter] = useState(false);
  const advisorFilterRef = useRef<HTMLDivElement>(null);
  const relationshipFilterRef = useRef<HTMLDivElement>(null);
  
  // Refs for positioning dropdown menus
  const [relationshipDropdownPosition, setRelationshipDropdownPosition] = useState({ top: 0, left: 0 });
  const [advisorDropdownPosition, setAdvisorDropdownPosition] = useState({ top: 0, left: 0 });
  
  // Function to calculate and set dropdown positions
  const updateRelationshipDropdownPosition = () => {
    if (relationshipFilterRef.current) {
      const rect = relationshipFilterRef.current.getBoundingClientRect();
      setRelationshipDropdownPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX
      });
    }
  };
  
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
    if (showRelationshipFilter) {
      updateRelationshipDropdownPosition();
      window.addEventListener('scroll', updateRelationshipDropdownPosition);
      window.addEventListener('resize', updateRelationshipDropdownPosition);
    }
    
    return () => {
      window.removeEventListener('scroll', updateRelationshipDropdownPosition);
      window.removeEventListener('resize', updateRelationshipDropdownPosition);
    };
  }, [showRelationshipFilter]);
  
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
  }, [showDormant]);

  // Handle click outside to close the filter dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (advisorFilterRef.current && !advisorFilterRef.current.contains(event.target as Node)) {
        setShowAdvisorFilter(false);
      }
      if (relationshipFilterRef.current && !relationshipFilterRef.current.contains(event.target as Node)) {
        setShowRelationshipFilter(false);
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
      console.log("Fetching clients...");
      console.log("API object:", api);

      let clientData = [];
      let fumData = [];

      if (!api || typeof api.get !== 'function') {
        console.error("API instance is not valid. Creating a direct axios request instead.");
        // Fallback to direct axios request if api is not properly initialized
        const [clientsResponse, fumResponse] = await Promise.all([
          axios.get('http://localhost:8000/clients', {
            params: { show_dormant: showDormant },
            withCredentials: true
          }),
          axios.get('http://localhost:8000/client_fum_summary', { withCredentials: true })
        ]);
        clientData = clientsResponse.data;
        fumData = fumResponse.data;
      } else {
        // Use the regular api instance from context
        const [clientsResponse, fumResponse] = await Promise.all([
          api.get('/clients', { params: { show_dormant: showDormant } }),
          api.get('/client_fum_summary')
        ]);
        clientData = clientsResponse.data;
        fumData = fumResponse.data;
      }

      // Map FUM data by client_id for quick lookup
      const fumMap = new Map(fumData.map((row: any) => [row.client_id, row.fum]));

      // Merge FUM into clients
      const clientsWithFum = clientData.map((client: Client) => ({
        ...client,
        fum: fumMap.get(client.id) ?? 0
      }));

      setClients(clientsWithFum);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch clients');
      console.error('Error fetching clients:', err);
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
    navigate('/clients/add');
  };

  const handleClientClick = (clientId: string) => {
    navigate(`/clients/${clientId}`);
  };

  const filteredAndSortedClients = clients
    .filter(client => 
      (client.forname?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (client.surname?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      client.relationship.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .filter(client => 
      advisorFilter.length === 0 ||
      (client.advisor && advisorFilter.includes(client.advisor))
    )
    .filter(client => 
      relationshipFilter.length === 0 ||
      (client.relationship && relationshipFilter.includes(client.relationship))
    )
    .sort((a, b) => {
      if (sortField === 'fum') {
        const aValue = a.fum || 0;
        const bValue = b.fum || 0;
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      } else {
        // Always sort by surname first, then by forname as a tiebreaker
        if (sortField === 'surname') {
          const aSurname = String(a.surname || '').toLowerCase();
          const bSurname = String(b.surname || '').toLowerCase();
          const surnameCompare = sortOrder === 'asc' 
            ? aSurname.localeCompare(bSurname)
            : bSurname.localeCompare(aSurname);
            
          // If surnames are the same, compare by forname as tiebreaker
          if (surnameCompare === 0) {
            const aForname = String(a.forname || '').toLowerCase();
            const bForname = String(b.forname || '').toLowerCase();
            return sortOrder === 'asc' 
              ? aForname.localeCompare(bForname)
              : bForname.localeCompare(aForname);
          }
          return surnameCompare;
        } else {
          // For other fields, sort normally
          const aValue = String(a[sortField] || '').toLowerCase();
          const bValue = String(b[sortField] || '').toLowerCase();
          return sortOrder === 'asc' 
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }
      }
    });

  // Extract unique advisor names
  const advisors = [...new Set(clients
    .map(client => client.advisor)
    .filter(advisor => advisor !== null))] as string[];

  // Extract unique relationship types
  const relationships = [...new Set(clients
    .map(client => client.relationship)
    .filter(relationship => relationship !== null))] as string[];

  return (
    <div className="container mx-auto px-4 py-3">
      <div className="flex justify-between items-center mb-3">
        <h1 className="text-3xl font-normal text-gray-900 font-sans tracking-wide">Clients</h1>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showDormant}
              onChange={(e) => setShowDormant(e.target.checked)}
              className="form-checkbox h-5 w-5 text-blue-600"
            />
            <span>Show Dormant Clients</span>
          </label>
          <button
            onClick={handleAddClient}
            className="bg-primary-700 text-white px-4 py-1.5 rounded-xl font-medium hover:bg-primary-800 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-700 focus:ring-offset-2 shadow-sm flex items-center gap-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Client
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
                placeholder="Search clients..."
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

        {/* Client List */}
        <div className="mt-3 overflow-visible">
          {isLoading ? (
            <div className="flex justify-center items-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : error ? (
            <div className="text-red-600 text-center py-3">{error}</div>
          ) : (
            <div className="overflow-x-auto overflow-visible">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider w-1/4 border-b-2 border-indigo-300">
                      <div className="flex items-center group cursor-pointer" onClick={() => handleSortFieldChange('surname')}>
                        Client Name
                        <span className="ml-1 text-gray-400 group-hover:text-indigo-500">
                          {sortField === 'surname' ? (
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
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider w-1/4 border-b-2 border-indigo-300">
                      <div className="flex flex-col items-start">
                        <span className="flex items-center group cursor-pointer" onClick={() => handleSortFieldChange('relationship')}>
                          Relationship
                          <span className="ml-1 text-gray-400 group-hover:text-indigo-500">
                            {sortField === 'relationship' ? (
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
                          id="relationship-filter"
                          options={relationships.map(r => ({ value: r, label: r }))}
                          value={relationshipFilter}
                          onChange={vals => setRelationshipFilter(vals.filter(v => typeof v === 'string'))}
                          placeholder="All Relationships"
                          className="min-w-[140px] mt-1"
                        />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider w-1/4 border-b-2 border-indigo-300">
                      <div className="flex flex-col items-start">
                        <span>Advisor</span>
                        <FilterDropdown
                          id="advisor-filter"
                          options={advisors.map(a => ({ value: a, label: a }))}
                          value={advisorFilter}
                          onChange={vals => setAdvisorFilter(vals.filter(v => typeof v === 'string'))}
                          placeholder="All Advisors"
                          className="min-w-[140px] mt-1"
                        />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider w-1/4 border-b-2 border-indigo-300">
                      <div className="flex items-center group cursor-pointer" onClick={() => handleSortFieldChange('fum')}>
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
                  {filteredAndSortedClients.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-4 whitespace-nowrap text-sm text-center text-gray-500 border-b border-gray-200">
                        No clients found
                      </td>
                    </tr>
                  ) : (
                    filteredAndSortedClients.map((client) => (
                    <tr 
                      key={client.id} 
                        className="hover:bg-indigo-50 transition-colors duration-150 cursor-pointer border-b border-gray-100"
                      onClick={() => handleClientClick(client.id)}
                    >
                        <td className="px-4 py-3 whitespace-nowrap w-1/4">
                          <div className="text-sm font-medium text-gray-800 font-sans tracking-tight">
                            {client.forname || ''} {client.surname || ''}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap w-1/4">
                          <div className="text-sm text-gray-600 font-sans">{client.relationship}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600 w-1/4 font-sans">
                          {client.advisor ? (
                            <div className="flex items-center">
                              <span className={`inline-block h-2 w-2 rounded-full mr-2 ${
                                client.advisor.toLowerCase().includes('jan') ? 'bg-pink-400' :
                                client.advisor.toLowerCase().includes('debbie') ? 'bg-green-400' : 'bg-blue-400'
                              }`}></span>
                              {client.advisor}
                            </div>
                          ) : (
                            <div className="flex items-center">
                              <span className="inline-block h-2 w-2 rounded-full bg-gray-300 mr-2"></span>
                              <span className="text-gray-500">Not assigned</span>
                            </div>
                          )}
                      </td>
                        <td className="px-4 py-3 whitespace-nowrap w-1/4">
                          {client.fum ? (
                            <div className="text-sm font-medium text-indigo-600">
                              £{client.fum.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
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

export default Clients; 