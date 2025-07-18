import React from 'react';
import { isCashFund } from '../../utils/fundUtils';

interface Fund {
  id: number;
  fund_name: string;
  isin_number?: string;
  risk_factor?: number;
  fund_cost?: number;
  status: string;
}

interface AvailableFundsPanelProps {
  availableFunds: Fund[];
  selectedFundIds: number[];
  onFundSelect: (fundId: number) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  isLoading: boolean;
  onAddFund?: () => void;
}

const AvailableFundsPanel: React.FC<AvailableFundsPanelProps> = ({
  availableFunds,
  selectedFundIds,
  onFundSelect,
  searchQuery,
  onSearchChange,
  isLoading,
  onAddFund
}) => {
  // Function to get risk color indicator
  const getRiskColor = (riskFactor?: number) => {
    if (riskFactor === undefined || riskFactor === null) return 'bg-gray-300';
    
    if (riskFactor <= 2) return 'bg-green-500';
    if (riskFactor <= 4) return 'bg-blue-500';
    if (riskFactor <= 6) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-1">
      {/* Empty space for alignment */}
      <div className="h-6"></div>
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-700">Available Funds</h4>
        <div className="flex items-center gap-2">
          {onAddFund && (
            <button
              type="button"
              onClick={onAddFund}
              className="bg-primary-600 text-white px-2 py-1 rounded text-xs hover:bg-primary-700 transition-colors duration-150 inline-flex items-center gap-1"
              title="Add new fund"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add
            </button>
          )}
        <div className="text-xs text-gray-500">
          {availableFunds.length} fund{availableFunds.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>
      
      {/* Search Bar */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          disabled={isLoading}
          placeholder="Search funds by name or ISIN..."
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm disabled:opacity-50"
        />
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            disabled={isLoading}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      
      {/* Available Funds List */}
      <div className="h-[500px] sm:h-[600px] lg:h-[700px] xl:h-[800px] overflow-y-auto border rounded bg-gray-50 p-1.5">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : availableFunds.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-gray-500">
            {searchQuery ? 'No funds found matching your search.' : 'No funds available.'}
          </div>
        ) : (
          <div className="space-y-1">
            {availableFunds.map((fund) => {
              const isSelected = selectedFundIds.includes(fund.id);
              const isCash = isCashFund(fund);
              
              return (
                <div
                  key={fund.id}
                  className={`flex items-center space-x-2 p-2 rounded-lg cursor-pointer transition-all duration-200 ${
                    isCash 
                      ? 'bg-blue-50 border border-blue-200 hover:bg-blue-100' 
                      : isSelected 
                        ? 'bg-primary-50 border border-primary-200 hover:bg-primary-100' 
                        : 'bg-white border border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => !isLoading && onFundSelect(fund.id)}
                >
                  {/* Selection Indicator */}
                  <div className="flex-shrink-0">
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                      isSelected 
                        ? 'bg-primary-600 border-primary-600' 
                        : 'border-gray-300 hover:border-gray-400'
                    }`}>
                      {isSelected && (
                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                  
                  {/* Fund Information */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <div className={`text-sm font-medium truncate ${
                          isCash ? 'text-blue-900' : 'text-gray-900'
                        }`} title={fund.fund_name}>
                          {fund.fund_name}
                          {isCash && (
                            <span className="ml-2 text-xs text-blue-600 font-normal">
                              (Always included)
                            </span>
                          )}
                        </div>
                        {fund.isin_number && (
                          <div className={`text-xs truncate ${
                            isCash ? 'text-blue-700' : 'text-gray-500'
                          }`} title={fund.isin_number}>
                            {fund.isin_number}
                          </div>
                        )}
                      </div>
                      
                      {/* Risk Factor and Status */}
                      <div className="flex items-center space-x-1.5 flex-shrink-0">
                        {/* Risk Factor */}
                        {fund.risk_factor !== undefined && fund.risk_factor !== null && (
                          <div className="flex items-center space-x-1">
                            <span className="text-xs text-gray-600">Risk:</span>
                            <div className="flex items-center space-x-0.5">
                              <span className="text-xs font-medium text-gray-800">
                                {fund.risk_factor}
                              </span>
                              <div className={`w-1.5 h-1.5 rounded-full ${getRiskColor(fund.risk_factor)}`}></div>
                            </div>
                          </div>
                        )}
                        
                        {/* Status Badge */}
                        <span className={`px-1.5 py-0.5 text-xs rounded-full font-medium ${
                          fund.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {fund.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {/* Quick Actions */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>Click to select/deselect funds</span>
        {selectedFundIds.length > 0 && (
          <span>{selectedFundIds.length} selected</span>
        )}
      </div>
    </div>
  );
};

export default AvailableFundsPanel; 