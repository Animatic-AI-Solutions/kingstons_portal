import React, { useMemo } from 'react';
import { findCashFund, isCashFund } from '../../../../utils/fundUtils';
import SelectedFundsPanel from './SelectedFundsPanel';
import AvailableFundsPanel from './AvailableFundsPanel';

interface Fund {
  id: number;
  fund_name: string;
  isin_number?: string;
  risk_factor?: number;
  fund_cost?: number;
  status: string;
}

interface FundSelectionManagerProps {
  availableFunds: Fund[];
  selectedFunds: number[];
  fundWeightings: Record<string, string>;
  onFundSelect: (fundId: number) => void;
  onFundDeselect: (fundId: number) => void;
  onWeightingChange: (fundId: number, weight: string) => void;
  onClearAll: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  isLoading: boolean;
  error?: string;
  onAddFund?: () => void;
  weightedRisk?: number | null;
}

const FundSelectionManager: React.FC<FundSelectionManagerProps> = ({
  availableFunds,
  selectedFunds,
  fundWeightings,
  onFundSelect,
  onFundDeselect,
  onWeightingChange,
  onClearAll,
  searchQuery,
  onSearchChange,
  isLoading,
  error,
  onAddFund,
  weightedRisk
}) => {
  // Calculate total weighting for progress display
  const totalWeighting = useMemo(() => {
    return Object.values(fundWeightings).reduce((total, weight) => {
      const numValue = parseFloat(weight) || 0;
      return total + numValue;
    }, 0);
  }, [fundWeightings]);

  // Get selected fund objects
  const selectedFundObjects = useMemo(() => {
    return selectedFunds.map(fundId => 
      availableFunds.find(fund => fund.id === fundId)
    ).filter(Boolean) as Fund[];
  }, [selectedFunds, availableFunds]);

  // Filter available funds based on search query
  const filteredAvailableFunds = useMemo(() => {
    if (!searchQuery.trim()) return availableFunds;
    
    const query = searchQuery.toLowerCase();
    return availableFunds.filter(fund => 
      (fund.fund_name && fund.fund_name.toLowerCase().includes(query)) || 
      (fund.isin_number && fund.isin_number.toLowerCase().includes(query))
    );
  }, [availableFunds, searchQuery]);

  // Calculate progress bar color based on total weighting
  const getProgressBarColor = () => {
    if (Math.abs(totalWeighting - 100) < 0.01) return 'bg-green-500'; // Perfect at 100%
    if (totalWeighting > 100) return 'bg-red-500'; // Too high
    if (totalWeighting > 90) return 'bg-yellow-500'; // Close to target
    return 'bg-blue-500'; // Still collecting
  };

  // Get risk level color based on weighted risk value
  const getRiskLevelColor = (risk: number) => {
    if (risk <= 2) return 'text-green-700 bg-green-100 border-green-200';
    if (risk <= 4) return 'text-blue-700 bg-blue-100 border-blue-200';
    if (risk <= 6) return 'text-yellow-700 bg-yellow-100 border-yellow-200';
    return 'text-red-700 bg-red-100 border-red-200';
  };

  return (
    <div className="space-y-3">
      {/* Progress Bar */}
      <div className="flex items-center justify-between bg-gray-50 p-2.5 rounded-lg">
        <div className="flex items-center space-x-3">
          <span className="text-sm text-gray-600">Total Allocation:</span>
          <div className="w-48 bg-gray-200 rounded-full h-2.5">
            <div 
              className={`h-2.5 rounded-full ${getProgressBarColor()}`} 
              style={{ width: `${Math.min(totalWeighting, 100)}%` }}
            />
          </div>
          <span className={`text-sm font-medium ${
            Math.abs(totalWeighting - 100) < 0.01 ? 'text-green-700' : 
            totalWeighting > 100 ? 'text-red-700' : 'text-gray-700'
          }`}>
            {totalWeighting.toFixed(1)}%
          </span>
        </div>
        <div className="text-sm text-gray-500">
          {selectedFunds.length} fund{selectedFunds.length !== 1 ? 's' : ''} selected
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-2.5">
          <div className="flex items-center">
            <svg className="h-4 w-4 text-red-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Side-by-side Layout */}
      <div className="grid grid-cols-2 gap-3">
        {/* Selected Funds Panel - Left Side */}
        <SelectedFundsPanel
          selectedFunds={selectedFundObjects}
          fundWeightings={fundWeightings}
          onFundRemove={onFundDeselect}
          onWeightingChange={onWeightingChange}
          onClearAll={onClearAll}
          totalWeighting={totalWeighting}
          isLoading={isLoading}
          weightedRisk={weightedRisk}
        />

        {/* Available Funds Panel - Right Side */}
        <AvailableFundsPanel
          availableFunds={filteredAvailableFunds}
          selectedFundIds={selectedFunds}
          onFundSelect={onFundSelect}
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          isLoading={isLoading}
          onAddFund={onAddFund}
        />
      </div>
    </div>
  );
};

export default FundSelectionManager; 