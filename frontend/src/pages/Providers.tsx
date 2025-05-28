import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface Provider {
  id: number;
  name: string;
  status: string;
  created_at: string;
}

type SortField = 'name' | 'status' | 'created_at';
type SortOrder = 'asc' | 'desc';

const Providers: React.FC = () => {
  const navigate = useNavigate();
  const { api } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [providers, setProviders] = useState<Provider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  useEffect(() => {
    fetchProviders();
  }, [showInactive]);

  const fetchProviders = async () => {
    try {
      setIsLoading(true);
      console.log("Fetching providers...");
      
      // Make API call to get providers - let the interceptor handle the /api prefix
      const response = await api.get('/available_providers');
      console.log("Providers response:", response.data);
      
      // Filter out inactive providers if showInactive is false
      const allProviders = response.data;
      const filteredProviders = showInactive 
        ? allProviders 
        : allProviders.filter((provider: Provider) => provider.status === 'active');
      
      setProviders(filteredProviders);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch providers');
      console.error('Error fetching providers:', err);
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

  const handleAddProvider = () => {
    navigate('/definitions/providers/add');
  };

  const handleProviderClick = (providerId: number) => {
    navigate(`/definitions/providers/${providerId}`);
  };

  const filteredAndSortedProviders = providers
    .filter(provider => 
      provider.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      provider.status.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];
      
      // Handle string comparisons
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      // Compare values
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-normal text-gray-900 font-sans tracking-wide">Providers</h1>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="form-checkbox h-5 w-5 text-blue-600"
            />
            <span className="text-base">Show Inactive Providers</span>
          </label>
          <button
            onClick={handleAddProvider}
            className="bg-indigo-600 text-white px-5 py-2 rounded-md text-base font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            + Add Provider
          </button>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        {/* Search and Sort Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          {/* Search Bar */}
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search providers..."
                className="w-full pl-10 pr-4 py-3 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Sort Controls */}
          <div className="flex gap-2">
            <select
              value={sortField}
              onChange={(e) => handleSortFieldChange(e.target.value as SortField)}
              className="border border-gray-300 rounded-md px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="name">Name</option>
              <option value="status">Status</option>
              <option value="created_at">Created Date</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="border border-gray-300 rounded-md px-3 py-2 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              {sortOrder === 'asc' ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Provider List */}
        <div className="mt-6">
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : error ? (
            <div className="text-red-600 text-center py-4">{error}</div>
          ) : filteredAndSortedProviders.length === 0 ? (
            <div className="text-gray-500 text-center py-4">No providers found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">
                      Provider
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAndSortedProviders.map((provider) => (
                    <tr 
                      key={provider.id} 
                      className="hover:bg-gray-50 transition-colors duration-150 cursor-pointer"
                      onClick={() => handleProviderClick(provider.id)}
                    >
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="text-base font-medium text-gray-900">{provider.name}</div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-sm leading-5 font-semibold rounded-full ${
                          provider.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {provider.status}
                        </span>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="text-base text-gray-900">
                          {new Date(provider.created_at).toLocaleDateString()}
                        </div>
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

export default Providers;
