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

interface SelectedFundsPanelProps {
  selectedFunds: Fund[];
  fundWeightings: Record<string, string>;
  onFundRemove: (fundId: number) => void;
  onWeightingChange: (fundId: number, weight: string) => void;
  onClearAll: () => void;
  totalWeighting: number;
  isLoading: boolean;
}

const SelectedFundsPanel: React.FC<SelectedFundsPanelProps> = ({
  selectedFunds,
  fundWeightings,
  onFundRemove,
  onWeightingChange,
  onClearAll,
  totalWeighting,
  isLoading
}) => {
  // Separate cash funds from other funds and sort non-cash funds alphabetically
  const cashFunds = selectedFunds.filter(fund => isCashFund(fund));
  const nonCashFunds = selectedFunds
    .filter(fund => !isCashFund(fund))
    .sort((a, b) => a.fund_name.localeCompare(b.fund_name));

  // Calculate weighted risk
  const calculateWeightedRisk = (): number | null => {
    if (totalWeighting === 0) return null;
    
    let totalRiskWeighted = 0;
    let totalWeightingWithRisk = 0;
    
    selectedFunds.forEach(fund => {
      const weight = parseFloat(fundWeightings[fund.id.toString()] || '0');
      if (weight > 0 && fund.risk_factor !== undefined && fund.risk_factor !== null) {
        totalRiskWeighted += fund.risk_factor * weight;
        totalWeightingWithRisk += weight;
      }
    });
    
    return totalWeightingWithRisk > 0 ? totalRiskWeighted / totalWeightingWithRisk : null;
  };

  // Get color based on risk value (1-7 scale) - green to red gradient
  const getRiskColor = (riskValue: number): { textClass: string; bgClass: string } => {
    if (riskValue <= 0) return { textClass: 'text-gray-500', bgClass: 'bg-gray-300' };
    
    // Clamp the value between 1 and 7
    const clampedRisk = Math.max(1, Math.min(7, riskValue));
    
    // Calculate color intensity based on position between 1 and 7
    const normalizedRisk = (clampedRisk - 1) / 6; // 0 to 1 scale
    
    if (normalizedRisk <= 0.16) {
      return { textClass: 'text-green-600', bgClass: 'bg-green-500' };
    } else if (normalizedRisk <= 0.33) {
      return { textClass: 'text-lime-600', bgClass: 'bg-lime-500' };
    } else if (normalizedRisk <= 0.5) {
      return { textClass: 'text-yellow-600', bgClass: 'bg-yellow-500' };
    } else if (normalizedRisk <= 0.66) {
      return { textClass: 'text-orange-600', bgClass: 'bg-orange-500' };
    } else if (normalizedRisk <= 0.83) {
      return { textClass: 'text-red-500', bgClass: 'bg-red-400' };
    } else {
      return { textClass: 'text-red-600', bgClass: 'bg-red-500' };
    }
  };

  const weightedRisk = calculateWeightedRisk();

  return (
    <div className="space-y-1">
      {/* Empty space for alignment */}
      <div className="h-6"></div>
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <h4 className="text-sm font-medium text-gray-700">Selected Funds</h4>
          <div className="bg-primary-100 text-primary-800 px-2 py-0.5 rounded-full text-xs font-medium">
            {selectedFunds.length}
          </div>
          <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${
            (() => {
              if (totalWeighting > 100) return 'bg-red-100 text-red-800';
              if (Math.abs(totalWeighting - 100) < 0.01) return 'bg-green-100 text-green-800';
              if (totalWeighting > 0) return 'bg-blue-100 text-blue-800';
              return 'bg-gray-100 text-gray-600';
            })()
          }`}>
            Weight: {totalWeighting.toFixed(1)}%
          </div>
          {weightedRisk !== null && (
            <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              weightedRisk !== null ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-600'
            }`}>
              <span className="flex items-center space-x-1">
                <span>Risk: {weightedRisk.toFixed(1)}/7</span>
                <div className={`w-2 h-2 rounded-full ${
                  weightedRisk !== null ? getRiskColor(weightedRisk).bgClass : 'bg-gray-300'
                }`}></div>
              </span>
            </div>
          )}
        </div>
        {selectedFunds.length > 0 && (
          <button
            type="button"
            onClick={onClearAll}
            disabled={isLoading}
            className="text-gray-400 hover:text-red-500 text-xs disabled:opacity-50"
            title="Clear all selected funds"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Selected Funds List */}
      <div className="h-[500px] sm:h-[600px] lg:h-[700px] xl:h-[800px] overflow-y-auto border rounded bg-white">
        {selectedFunds.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-gray-500">
            No funds selected
          </div>
        ) : (
          <div className="p-1.5 space-y-1">
            {/* Non-cash funds */}
            {nonCashFunds.map((fund) => (
              <div key={fund.id} className="bg-gray-50 border border-gray-200 rounded-lg p-2 hover:bg-gray-100 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                    <div className="w-1.5 h-1.5 bg-primary-500 rounded-full flex-shrink-0"></div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-gray-900 truncate" title={fund.fund_name}>
                            {fund.fund_name}
                          </div>
                          {fund.isin_number && (
                            <div className="text-xs text-gray-500 truncate" title={fund.isin_number}>
                              {fund.isin_number}
                            </div>
                          )}
                        </div>
                        {fund.risk_factor !== undefined && (
                          <div className="flex items-center space-x-0.5 flex-shrink-0 ml-2">
                            <span className="text-xs text-gray-600">Risk:</span>
                            <span className="text-xs font-medium text-gray-800">{fund.risk_factor}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-1.5 flex-shrink-0 ml-2">
                    <input
                      type="text"
                      value={fundWeightings[fund.id.toString()] || ''}
                      onChange={(e) => onWeightingChange(fund.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          e.currentTarget.blur();
                        }
                      }}
                      disabled={isLoading}
                      className="w-14 text-xs text-center border border-gray-300 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50"
                      placeholder="0.00"
                    />
                    <span className="text-xs text-gray-500">%</span>
                    <button
                      type="button"
                      onClick={() => onFundRemove(fund.id)}
                      disabled={isLoading}
                      className="text-gray-400 hover:text-red-500 p-0.5 rounded hover:bg-red-50 transition-colors disabled:opacity-50"
                      title="Remove fund"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Cash funds - always last with special styling */}
            {cashFunds.map((fund) => (
              <div key={fund.id} className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0"></div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-blue-900 truncate" title={fund.fund_name}>
                        {fund.fund_name}
                      </div>
                      <div className="text-xs text-blue-700">Required for allocation</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-1.5 flex-shrink-0 ml-2">
                    <input
                      type="text"
                      value={fundWeightings[fund.id.toString()] || ''}
                      onChange={(e) => onWeightingChange(fund.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          e.currentTarget.blur();
                        }
                      }}
                      disabled={isLoading}
                      className="w-14 text-xs text-center border border-blue-300 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white disabled:opacity-50"
                      placeholder="0.00"
                    />
                    <span className="text-xs text-blue-700">%</span>
                    <div className="w-5 h-5 flex items-center justify-center">
                      <svg className="h-3.5 w-3.5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
    </div>
  );
};

export default SelectedFundsPanel; 