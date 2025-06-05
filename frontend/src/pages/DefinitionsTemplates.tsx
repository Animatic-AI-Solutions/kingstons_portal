import React, { useState, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import FilterDropdown from '../components/ui/FilterDropdown';
import { TableSkeleton } from '../components/ui/TableSkeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorDisplay } from '../components/ui/ErrorDisplay';
import { useEntityData } from '../hooks/useEntityData';
import { 
  Portfolio, 
  PortfolioSortField, 
  SortOrder, 
  calculateAverageRisk,
  getRiskRange 
} from '../utils/definitionsShared';
import api from '../services/api';

const DefinitionsTemplates: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // State management
  const [searchQuery, setSearchQuery] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [portfolioSortField, setPortfolioSortField] = useState<PortfolioSortField>('name');
  const [portfolioSortOrder, setPortfolioSortOrder] = useState<SortOrder>('asc');
  const [riskRangeFilters, setRiskRangeFilters] = useState<(string | number)[]>([]);
  const [portfolioTypeFilters, setPortfolioTypeFilters] = useState<(string | number)[]>([]);

  // Data fetching
  const fetchPortfolios = useCallback(async (params: { signal?: AbortSignal } = {}) => {
    console.log("Fetching portfolio templates from /available_portfolios...");
    
    try {
      // Get list of all portfolio templates
      const response = await api.get('/available_portfolios', { signal: params.signal });
      console.log(`Successfully received ${response.data.length} portfolio templates`);
      console.log('Sample portfolio data:', response.data[0]);
      
      return response.data;
    } catch (err) {
      console.error('Error in fetchPortfolios:', err);
      throw err;
    }
  }, []);

  const { 
    data: portfolios, 
    loading: portfoliosLoading, 
    error: portfoliosError 
  } = useEntityData<Portfolio>(fetchPortfolios, []);

  // Filter options
  const riskRangeOptions = useMemo(() => [
    { value: 'Very Low', label: 'Very Low (0-2)' },
    { value: 'Low', label: 'Low (2-3)' },
    { value: 'Medium', label: 'Medium (3-5)' },
    { value: 'High', label: 'High (5-7)' },
    { value: 'Very High', label: 'Very High (7+)' },
    { value: 'N/A', label: 'N/A' }
  ], []);

  const portfolioTypeOptions = useMemo(() => {
    const uniqueTypes = new Set<string>();
    portfolios.forEach(portfolio => {
      if (portfolio.type) {
        uniqueTypes.add(portfolio.type);
      }
    });
    return Array.from(uniqueTypes).map(type => ({ value: type, label: type }));
  }, [portfolios]);

  // Event handlers
  const handleItemClick = useCallback((portfolioId: number) => {
    navigate(`/definitions/portfolio-templates/${portfolioId}`);
  }, [navigate]);

  const handleAddNew = useCallback(() => {
    navigate('/definitions/portfolio-templates/add');
  }, [navigate]);

  const handlePortfolioSortChange = useCallback((field: PortfolioSortField) => {
    if (field === portfolioSortField) {
      setPortfolioSortOrder(portfolioSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setPortfolioSortField(field);
      setPortfolioSortOrder('asc');
    }
  }, [portfolioSortField, portfolioSortOrder]);

  // Display weighted risk with proper formatting
  const displayWeightedRisk = useCallback((portfolio: Portfolio) => {
    const averageRisk = calculateAverageRisk(portfolio);
    const riskRange = getRiskRange(portfolio);
    
    return (
      <div className="text-sm text-gray-600 font-sans">
        <div>{averageRisk > 0 ? averageRisk.toFixed(2) : 'N/A'}</div>
        <div className="text-xs text-gray-500">({riskRange})</div>
      </div>
    );
  }, []);

  // Filter and sort portfolios
  const filteredAndSortedPortfolios = useMemo(() => {
    console.log('Processing portfolios data:', portfolios.length, 'portfolios');
    console.log('Sample portfolio:', portfolios[0]);
    
    let filtered = portfolios;
    
    // Apply text search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(portfolio => 
        portfolio.name?.toLowerCase().includes(query)
      );
    }
    
    // Apply portfolio type filter
    if (portfolioTypeFilters.length > 0) {
      filtered = filtered.filter(portfolio => 
        portfolio.type && portfolioTypeFilters.includes(portfolio.type)
      );
    }
    
    // Apply risk range filter
    if (riskRangeFilters.length > 0) {
      filtered = filtered.filter(portfolio => {
        const riskRange = getRiskRange(portfolio);
        return riskRangeFilters.includes(riskRange);
      });
    }
    
    // Apply inactive filter
    if (!showInactive) {
      console.log('Checking portfolio statuses before filtering:');
      portfolios.forEach((portfolio, index) => {
        console.log(`Portfolio ${index + 1}:`, {
          id: portfolio.id,
          name: portfolio.name,
          status: portfolio.status,
          hasStatus: 'status' in portfolio
        });
      });
      
      // Only filter if portfolios actually have status field
      const portfoliosWithStatus = portfolios.filter(p => 'status' in p && p.status);
      if (portfoliosWithStatus.length > 0) {
        filtered = filtered.filter(portfolio => portfolio.status === 'active');
        console.log('After status filter (active only):', filtered.length);
      } else {
        console.log('No status field found in portfolios, skipping status filter');
      }
    }
    
    console.log('Filtered portfolios:', filtered.length);
    
    // Sort the filtered results
    return filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;
      
      switch (portfolioSortField) {
        case 'name':
          aValue = a.name?.toLowerCase() || '';
          bValue = b.name?.toLowerCase() || '';
          break;
        case 'weighted_risk':
        case 'averageRisk':
          aValue = calculateAverageRisk(a);
          bValue = calculateAverageRisk(b);
          break;
        case 'portfolioCount':
          aValue = a.portfolioCount || 0;
          bValue = b.portfolioCount || 0;
          break;
        case 'created_at':
        default:
          aValue = a.created_at;
          bValue = b.created_at;
          break;
      }
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return portfolioSortOrder === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      } else {
        return portfolioSortOrder === 'asc' 
          ? aValue - bValue
          : bValue - aValue;
      }
    });
  }, [portfolios, searchQuery, portfolioTypeFilters, riskRangeFilters, showInactive, portfolioSortField, portfolioSortOrder]);

  if (!user) return null;

  return (
    <div className="container mx-auto px-2 py-1 bg-teal-50/40">
      <div className="flex justify-between items-center mb-3">
        <h1 className="text-3xl font-normal text-gray-900 font-sans tracking-wide">Portfolio Templates</h1>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="form-checkbox h-5 w-5 text-blue-600"
              aria-label="Show inactive items"
            />
            <span>Show Inactive</span>
          </label>
          <button
            onClick={handleAddNew}
            className="bg-teal-600 text-white px-4 py-1.5 rounded-xl font-medium hover:bg-teal-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 shadow-sm flex items-center gap-1"
            aria-label="Add new portfolio template"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Template
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
              placeholder="Search portfolio templates..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors duration-200"
              aria-label="Search portfolio templates"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Portfolio Templates Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {portfoliosLoading ? (
          <div className="p-6">
            <TableSkeleton columns={3} />
          </div>
        ) : portfoliosError ? (
          <div className="p-6">
            <ErrorDisplay message={portfoliosError} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th 
                    className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300 w-1/3 cursor-pointer hover:bg-teal-50"
                    onClick={() => handlePortfolioSortChange('name')}
                  >
                    <div className="flex items-center">
                      <span>Name</span>
                      {portfolioSortField === 'name' && (
                        <span className="ml-1">
                          {portfolioSortOrder === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300 w-1/3">
                    <div className="flex flex-col items-start gap-1">
                      <div 
                        className="flex items-center cursor-pointer hover:bg-teal-50"
                        onClick={() => handlePortfolioSortChange('weighted_risk')}
                      >
                        <span>Weighted Risk</span>
                        {portfolioSortField === 'weighted_risk' && (
                          <span className="ml-1">
                            {portfolioSortOrder === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                      <FilterDropdown
                        id="risk-range-filter"
                        options={riskRangeOptions}
                        value={riskRangeFilters}
                        onChange={setRiskRangeFilters}
                        placeholder="All Risk Ranges"
                        className="mt-1"
                      />
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300 w-1/3 cursor-pointer hover:bg-teal-50"
                    onClick={() => handlePortfolioSortChange('portfolioCount')}
                  >
                    <div className="flex items-center">
                      <span>Portfolio Count</span>
                      {portfolioSortField === 'portfolioCount' && (
                        <span className="ml-1">
                          {portfolioSortOrder === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAndSortedPortfolios.length > 0 ? (
                  filteredAndSortedPortfolios.map(portfolio => (
                    <tr 
                      key={portfolio.id} 
                      className="hover:bg-teal-50 transition-colors duration-150 cursor-pointer border-b border-gray-100"
                      onClick={() => handleItemClick(portfolio.id)}
                    >
                      <td className="px-6 py-3 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-800 font-sans tracking-tight">{portfolio.name}</div>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        {displayWeightedRisk(portfolio)}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-600 font-sans">{portfolio.portfolioCount || 0}</div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="p-6">
                      <EmptyState message="No portfolio templates found" />
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

export default DefinitionsTemplates; 