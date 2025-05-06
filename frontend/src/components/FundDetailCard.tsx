import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { Holding } from '../hooks/useAccountDetails';
import { formatCurrency } from '../utils/formatters';

interface FundDetailCardProps {
  holding: Holding;
  onLoadComplete?: () => void;
}

const FundDetailCard: React.FC<FundDetailCardProps> = ({ holding, onLoadComplete }) => {
  const { api } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);

  // Fetch valuations and IRR only when card is expanded
  const { data: valuation, isLoading: isLoadingValuation } = useQuery({
    queryKey: ['fund_valuation', holding.id],
    queryFn: async () => {
      try {
        const response = await api.get(`/fund_valuations/latest/${holding.id}`);
        return response.data?.value || 0;
      } catch (error) {
        console.error('Error fetching valuation:', error);
        return 0;
      }
    },
    enabled: isExpanded,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: irrData, isLoading: isLoadingIrr } = useQuery({
    queryKey: ['fund_irr', holding.id],
    queryFn: async () => {
      try {
        const response = await api.get(`/portfolio_funds/${holding.id}/latest-irr`);
        return {
          irr: response.data?.irr || 0,
          calculationDate: response.data?.calculation_date
        };
      } catch (error) {
        console.error('Error fetching IRR:', error);
        return { irr: 0, calculationDate: null };
      }
    },
    enabled: isExpanded,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Calculate fund stats
  const isLoading = isLoadingValuation || isLoadingIrr;
  const marketValue = valuation || 0;
  const irr = irrData?.irr || 0;
  
  useEffect(() => {
    if (isExpanded && !isLoading && onLoadComplete) {
      onLoadComplete();
    }
  }, [isExpanded, isLoading, onLoadComplete]);

  // Function to format percentage
  const formatPercentage = (value: number): string => {
    return `${(value * 100).toFixed(2)}%`;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm mb-4 overflow-hidden">
      {/* Fund header - always visible */}
      <div 
        className="p-4 cursor-pointer flex justify-between items-center hover:bg-gray-50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div>
          <h3 className="font-medium text-gray-900">{holding.fund_name}</h3>
          <p className="text-sm text-gray-500">ISIN: {holding.isin_number || 'N/A'}</p>
        </div>
        <div className="flex items-center">
          <div className="text-right mr-4">
            <p className="text-sm font-medium">{formatCurrency(holding.amount_invested)}</p>
            <p className="text-xs text-gray-500">Invested</p>
          </div>
          <svg 
            className={`w-5 h-5 text-gray-500 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 20 20" 
            fill="currentColor"
          >
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </div>
      </div>

      {/* Expanded details section */}
      {isExpanded && (
        <div className="p-4 border-t border-gray-100">
          {isLoading ? (
            <div className="animate-pulse flex space-x-4">
              <div className="flex-1 space-y-4 py-1">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-500">Current Value</p>
                  <p className="text-lg font-medium">{formatCurrency(marketValue)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">IRR</p>
                  <p className="text-lg font-medium">{formatPercentage(irr)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Risk Level</p>
                  <p className="text-lg font-medium">{holding.risk_level || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Target %</p>
                  <p className="text-lg font-medium">{holding.target_weighting || 'N/A'}</p>
                </div>
              </div>
              
              {irrData?.calculationDate && (
                <div className="text-xs text-gray-500 mt-2">
                  IRR calculated on {new Date(irrData.calculationDate).toLocaleDateString()}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default FundDetailCard; 