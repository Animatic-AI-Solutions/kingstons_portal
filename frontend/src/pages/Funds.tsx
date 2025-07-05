import React, { useState, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import FilterDropdown from '../components/ui/dropdowns/FilterDropdown';
import { TableSkeleton } from '../components/ui/feedback/TableSkeleton';
import { EmptyState } from '../components/ui/feedback/EmptyState';
import { ErrorDisplay } from '../components/ui/feedback/ErrorDisplay';
import { useEntityData } from '../hooks/useEntityData';
import { 
  Fund, 
  FundSortField, 
  SortOrder, 
  getFundRiskLevel 
} from '../utils/definitionsShared';
import api from '../services/api';
import StandardTable, { ColumnConfig } from '../components/StandardTable';
import AddFundModal from '../components/AddFundModal';

const DefinitionsFunds: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // State management - removed manual sorting/filtering state
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddFundModal, setShowAddFundModal] = useState(false);

  // Data fetching
  const fetchFunds = useCallback(async () => {
    const response = await api.get('/funds');
    return response.data;
  }, []);

  const { 
    data: funds, 
    loading: fundsLoading, 
    error: fundsError,
    refresh: refreshFunds
  } = useEntityData<Fund>(fetchFunds, []);

  // Event handlers
  const handleItemClick = useCallback((fund: Fund) => {
    navigate(`/definitions/funds/${fund.id}`);
  }, [navigate]);

  const handleAddNew = useCallback(() => {
    setShowAddFundModal(true);
  }, []);

  const handleAddFundSuccess = useCallback((newFund: any) => {
    // Refresh the funds list to include the new fund
    refreshFunds();
  }, [refreshFunds]);

  // Apply search filtering only - StandardTable will handle column filtering and sorting
  const searchFilteredFunds = useMemo(() => {
    return funds.filter(fund => 
        fund.status === 'active' &&
        ((fund.fund_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
         (fund.isin_number?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
         (fund.provider_name && (fund.provider_name.toLowerCase() || '').includes(searchQuery.toLowerCase())))
    );
  }, [funds, searchQuery]);

  // Column configuration for StandardTable
  const columns: ColumnConfig[] = [
    {
      key: 'fund_name',
      label: 'Fund Name',
      dataType: 'text',
      alignment: 'left',
      control: 'sort'
    },
    {
      key: 'isin_number',
      label: 'ISIN',
      dataType: 'text',
      alignment: 'left',
      control: 'sort',
      format: (value) => value || 'N/A'
    },
    {
      key: 'risk_factor',
      label: 'Risk Factor',
      dataType: 'number',
      alignment: 'left',
      control: 'filter',
      format: (value) => value !== null ? value.toString() : 'N/A'
    },
    {
      key: 'fund_cost',
      label: 'Fund Cost',
      dataType: 'percentage',
      alignment: 'left',
      control: 'sort',
      format: (value) => value !== null ? `${value.toFixed(1)}%` : 'N/A'
    },
    {
      key: 'status',
      label: 'Status',
      dataType: 'category',
      alignment: 'left',
      control: 'filter'
    }
  ];

  if (!user) return null;

  return (
    <div className="container mx-auto px-2 py-1">
      <div className="flex justify-between items-center mb-3">
        <h1 className="text-3xl font-normal text-gray-900 font-sans tracking-wide">Funds</h1>
        <div className="flex items-center gap-4">
          <button
            onClick={handleAddNew}
            className="bg-primary-600 text-white px-4 py-1.5 rounded-xl font-medium hover:bg-primary-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 shadow-sm flex items-center gap-1"
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
        ) : searchFilteredFunds.length === 0 ? (
          <div className="p-6">
                      <EmptyState message="No funds found" />
          </div>
        ) : (
          <StandardTable
            data={searchFilteredFunds}
            columns={columns}
            className="cursor-pointer"
            onRowClick={handleItemClick}
          />
        )}
      </div>

      {/* Add Fund Modal */}
      <AddFundModal
        isOpen={showAddFundModal}
        onClose={() => setShowAddFundModal(false)}
        onSuccess={handleAddFundSuccess}
      />
    </div>
  );
};

export default DefinitionsFunds; 