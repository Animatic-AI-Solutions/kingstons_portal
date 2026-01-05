import React, { useState, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import FilterDropdown from '../components/ui/dropdowns/FilterDropdown';
import { TableSkeleton } from '../components/ui/feedback/TableSkeleton';
import { EmptyState } from '../components/ui/feedback/EmptyState';
import { ErrorDisplay } from '../components/ui/feedback/ErrorDisplay';
import { AddButton, SearchInput } from '../components/ui';
import { useEntityData } from '../hooks/useEntityData';
import { 
  Fund, 
  FundSortField, 
  SortOrder, 
  getFundRiskLevel
} from '../utils/definitionsShared';
import api from '../services/api';
import { StandardTable } from '../components/ui';
import type { ColumnConfig } from '../components/ui/tables/StandardTable';
import { AddFundModal } from '../components/phase1';
import DynamicPageContainer from '../components/phase2/client-groups/DynamicPageContainer';

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
    <DynamicPageContainer 
      maxWidth="2800px"
      className="py-1"
    >
      <div className="flex justify-between items-center mb-3">
        <h1 className="text-3xl font-normal text-gray-900 font-sans tracking-wide">Funds</h1>
        <div className="flex items-center gap-4">
          <AddButton 
            context="Fund"
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
          placeholder="Search funds..."
          size="md"
          className="flex-1"
        />
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
    </DynamicPageContainer>
  );
};

export default DefinitionsFunds; 