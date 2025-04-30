import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface Fund {
  id: number;
  provider_id: number | null;
  fund_name: string;
  isin_number: string;
  risk_factor: number | null;
  fund_cost: number | null;
  status: string;
  created_at: string;
}

type SortField = 'fund_name' | 'risk_factor' | 'isin_number' | 'fund_cost' | 'created_at';
type SortOrder = 'asc' | 'desc';

const Funds: React.FC = () => {
  const navigate = useNavigate();
  const { api } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('fund_name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [funds, setFunds] = useState<Fund[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [showInactive, setShowInactive] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<number | 'all'>('all');

  useEffect(() => {
    fetchFunds();
  }, [statusFilter, showInactive, selectedProvider]);

  const fetchFunds = async () => {
    try {
      setIsLoading(true);
      console.log("Fetching funds data...");
      
      const response = await api.get('/funds', {
        params: {
          show_inactive: showInactive || undefined,
          provider_id: selectedProvider !== 'all' ? selectedProvider : undefined,
          include_providers: true
        }
      });
      console.log(`Received ${response.data.length} funds`);
      
      setFunds(response.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch funds');
      console.error('Error fetching funds:', err);
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

  const handleAddFund = () => {
    navigate('/funds/add');
  };

  const handleFundClick = (fundId: number) => {
    navigate(`/funds/${fundId}`);
  };

  const filteredAndSortedFunds = funds
    .filter(fund => {
      return (
        (fund.fund_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (fund.isin_number?.toLowerCase() || '').includes(searchQuery.toLowerCase())
      );
    })
    .sort((a, b) => {
      if (sortField === 'risk_factor' || sortField === 'fund_cost') {
        // For numeric values
        const aField = sortField === 'risk_factor' ? (a.risk_factor || 0) : (a.fund_cost || 0);
        const bField = sortField === 'risk_factor' ? (b.risk_factor || 0) : (b.fund_cost || 0);
        
        return sortOrder === 'asc' 
          ? aField - bField
          : bField - aField;
      } else if (sortField === 'fund_name' || sortField === 'isin_number') {
        // For string values
        const aValue = sortField === 'fund_name' 
          ? (a.fund_name || '').toLowerCase() 
          : (a.isin_number || '').toLowerCase();
        const bValue = sortField === 'fund_name' 
          ? (b.fund_name || '').toLowerCase() 
          : (b.isin_number || '').toLowerCase();
          
        return sortOrder === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      } else {
        // For created_at
        const aValue = String(a.created_at).toLowerCase();
        const bValue = String(b.created_at).toLowerCase();
        return sortOrder === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
    });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Funds</h1>
        <div className="flex items-center gap-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="active">Active Funds</option>
            <option value="inactive">Inactive Funds</option>
            <option value="dormant">Dormant Funds</option>
            <option value="all">All Funds</option>
          </select>
          <button
            onClick={handleAddFund}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Add Fund
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
                placeholder="Search funds..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="fund_name">Name</option>
              <option value="risk_factor">Risk Factor</option>
              <option value="isin_number">ISIN</option>
              <option value="fund_cost">Fund Cost</option>
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

        {/* Fund List */}
        <div className="mt-6">
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : error ? (
            <div className="text-red-600 text-center py-4">{error}</div>
          ) : filteredAndSortedFunds.length === 0 ? (
            <div className="text-gray-500 text-center py-4">No funds found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Risk Factor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ISIN
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fund Cost
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAndSortedFunds.map((fund) => (
                    <tr 
                      key={fund.id} 
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => handleFundClick(fund.id)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{fund.fund_name || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{fund.risk_factor || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{fund.isin_number || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {fund.fund_cost !== null ? `${fund.fund_cost.toFixed(4)}%` : 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          fund.status === 'active' ? 'bg-green-100 text-green-800' : 
                          fund.status === 'dormant' ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {fund.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {new Date(fund.created_at).toLocaleDateString()}
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

export default Funds;
