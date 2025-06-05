import React, { useState, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import FilterDropdown from '../components/ui/FilterDropdown';
import { TableSkeleton } from '../components/ui/TableSkeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorDisplay } from '../components/ui/ErrorDisplay';
import { useEntityData } from '../hooks/useEntityData';
import { 
  Fund, 
  FundSortField, 
  SortOrder, 
  getFundRiskLevel 
} from '../utils/definitionsShared';
import api from '../services/api';

const DefinitionsFunds: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // State management
  const [searchQuery, setSearchQuery] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [fundSortField, setFundSortField] = useState<FundSortField>('fund_name');
  const [fundSortOrder, setFundSortOrder] = useState<SortOrder>('asc');
  const [fundStatusFilters, setFundStatusFilters] = useState<(string | number)[]>([]);
  const [riskLevelFilters, setRiskLevelFilters] = useState<(string | number)[]>([]);

  // Data fetching
  const fetchFunds = useCallback(async () => {
    const response = await api.get('/funds');
    return response.data;
  }, []);

  const { 
    data: funds, 
    loading: fundsLoading, 
    error: fundsError 
  } = useEntityData<Fund>(fetchFunds, []);

  // Filter options
  const fundStatusOptions: Array<{ value: string | number; label: string }> = useMemo(() => [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' }
  ], []);

  const riskFactorFilterOptions = useMemo(() => {
    const uniqueRiskFactors = new Set<number | string>();
    funds.forEach(fund => {
      if (fund.risk_factor !== null && fund.risk_factor !== undefined) {
        uniqueRiskFactors.add(fund.risk_factor);
      } else {
        uniqueRiskFactors.add('Unrated');
      }
    });
    
    const sortedRiskFactors = Array.from(uniqueRiskFactors)
      .filter(factor => typeof factor === 'number')
      .sort((a, b) => (a as number) - (b as number));
    
    const options: Array<{ value: string | number; label: string }> = sortedRiskFactors.map(factor => ({
      value: factor,
      label: `${factor}`
    }));
    
    if (uniqueRiskFactors.has('Unrated')) {
      options.push({ value: 'Unrated', label: 'Unrated' });
    }
    
    return options;
  }, [funds]);

  // Event handlers
  const handleItemClick = useCallback((fundId: number) => {
    navigate(`/definitions/funds/${fundId}`);
  }, [navigate]);

  const handleAddNew = useCallback(() => {
    navigate('/definitions/funds/add');
  }, [navigate]);

  const handleFundSortChange = useCallback((field: FundSortField) => {
    if (field === fundSortField) {
      setFundSortOrder(fundSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setFundSortField(field);
      setFundSortOrder('asc');
    }
  }, [fundSortField, fundSortOrder]);

  // Filter and sort funds
  const filteredAndSortedFunds = useMemo(() => {
    return funds
      .filter(fund => 
        (showInactive || fund.status === 'active') &&
        ((fund.fund_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
         (fund.isin_number?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
         (fund.provider_name && (fund.provider_name.toLowerCase() || '').includes(searchQuery.toLowerCase())))
      )
      .filter(fund => 
        fundStatusFilters.length === 0 || 
        (fund.status && fundStatusFilters.includes(fund.status))  
      )
      .filter(fund => {
        if (riskLevelFilters.length === 0) return true;
        
        const unratedSelected = riskLevelFilters.includes('Unrated');
        if (unratedSelected && (fund.risk_factor === null || fund.risk_factor === undefined)) {
          return true;
        }
        
        if (fund.risk_factor !== null && fund.risk_factor !== undefined) {
          return riskLevelFilters.includes(fund.risk_factor);
        }
        
        return false;
      })
      .sort((a, b) => {
        if (fundSortField === 'risk_factor' || fundSortField === 'fund_cost') {
          const aField = fundSortField === 'risk_factor' ? (a.risk_factor || 0) : (a.fund_cost || 0);
          const bField = fundSortField === 'risk_factor' ? (b.risk_factor || 0) : (b.fund_cost || 0);
          
          return fundSortOrder === 'asc' 
            ? aField - bField
            : bField - aField;
        } else if (fundSortField === 'fund_name' || fundSortField === 'isin_number') {
          const aValue = fundSortField === 'fund_name' 
            ? (a.fund_name || '').toLowerCase() 
            : (a.isin_number || '').toLowerCase();
          const bValue = fundSortField === 'fund_name' 
            ? (b.fund_name || '').toLowerCase() 
            : (b.isin_number || '').toLowerCase();
            
          return fundSortOrder === 'asc' 
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        } else {
          const aValue = String(a.created_at).toLowerCase();
          const bValue = String(b.created_at).toLowerCase();
          return fundSortOrder === 'asc' 
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }
      });
  }, [funds, showInactive, searchQuery, fundSortField, fundSortOrder, fundStatusFilters, riskLevelFilters]);

  if (!user) return null;

  return (
    <div className="container mx-auto px-2 py-1 bg-blue-100/70">
      <div className="flex justify-between items-center mb-3">
        <h1 className="text-3xl font-normal text-gray-900 font-sans tracking-wide">Funds</h1>
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
            className="bg-blue-600 text-white px-4 py-1.5 rounded-xl font-medium hover:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-sm flex items-center gap-1"
            aria-label="Add new fund"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Fund
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
              placeholder="Search funds..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
              aria-label="Search funds"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Funds Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {fundsLoading ? (
          <div className="p-6">
            <TableSkeleton columns={5} />
          </div>
        ) : fundsError ? (
          <div className="p-6">
            <ErrorDisplay message={fundsError} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th 
                    className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300 w-1/5 cursor-pointer hover:bg-blue-50"
                    onClick={() => handleFundSortChange('fund_name')}
                  >
                    <div className="flex items-center">
                      <span>Fund Name</span>
                      {fundSortField === 'fund_name' && (
                        <span className="ml-1">
                          {fundSortOrder === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300 w-1/5 cursor-pointer hover:bg-blue-50"
                    onClick={() => handleFundSortChange('isin_number')}
                  >
                    <div className="flex items-center">
                      <span>ISIN</span>
                      {fundSortField === 'isin_number' && (
                        <span className="ml-1">
                          {fundSortOrder === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300 w-1/5">
                    <div className="flex flex-col items-start gap-1">
                      <div 
                        className="flex items-center cursor-pointer hover:bg-blue-50"
                        onClick={() => handleFundSortChange('risk_factor')}
                      >
                        <span>Risk Factor</span>
                        {fundSortField === 'risk_factor' && (
                          <span className="ml-1">
                            {fundSortOrder === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                      <FilterDropdown
                        id="risk-level-filter"
                        options={riskFactorFilterOptions} 
                        value={riskLevelFilters}
                        onChange={setRiskLevelFilters}
                        placeholder="All Risk Factors" 
                        className="mt-1"
                      />
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300 w-1/5 cursor-pointer hover:bg-blue-50"
                    onClick={() => handleFundSortChange('fund_cost')}
                  >
                    <div className="flex items-center">
                      <span>Fund Cost</span>
                      {fundSortField === 'fund_cost' && (
                        <span className="ml-1">
                          {fundSortOrder === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300 w-1/5">
                    <div className="flex flex-col items-start gap-1">
                      <span>Status</span>
                      <FilterDropdown
                        id="fund-status-filter"
                        options={fundStatusOptions}
                        value={fundStatusFilters}
                        onChange={setFundStatusFilters}
                        placeholder="All Statuses"
                        className="mt-1"
                      />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAndSortedFunds.length > 0 ? (
                  filteredAndSortedFunds.map(fund => (
                    <tr 
                      key={fund.id} 
                      className="hover:bg-blue-50 transition-colors duration-150 cursor-pointer border-b border-gray-100"
                      onClick={() => handleItemClick(fund.id)}
                    >
                      <td className="px-6 py-3 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-800 font-sans tracking-tight">{fund.fund_name}</div>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-600 font-sans">{fund.isin_number || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-600 font-sans">{fund.risk_factor !== null ? fund.risk_factor : 'N/A'}</div>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-600 font-sans">
                          {fund.fund_cost !== null ? `${fund.fund_cost.toFixed(1)}%` : 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          fund.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {fund.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="p-6">
                      <EmptyState message="No funds found" />
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

export default DefinitionsFunds; 