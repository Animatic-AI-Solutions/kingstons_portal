import React from 'react';

interface SwitchDestination {
  fundId: number;
  fundName: string;
  amount: number;
}

interface SwitchGroup {
  id: string;
  sourceAmount: number;
  sourceFundId: number;
  sourceFundName: string;
  destinations: SwitchDestination[];
  month: string;
  colorIndex: number;
}

interface SwitchTooltipProps {
  switchGroup: SwitchGroup;
  isSource: boolean; // true for "Switch Out", false for "Switch In"
  currentFundId: number;
  children: React.ReactNode;
}

const SwitchTooltip: React.FC<SwitchTooltipProps> = ({
  switchGroup,
  isSource,
  currentFundId,
  children
}) => {
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const getTooltipContent = () => {
    if (isSource) {
      // For Fund Switch Out cells
      return (
        <div className="text-sm">
          <div className="font-semibold mb-2">
            Total Fund Switch: {formatCurrency(switchGroup.sourceAmount)}
          </div>
          <div className="space-y-1">
            {switchGroup.destinations.map((dest) => (
              <div key={dest.fundId} className="flex justify-between">
                <span>{dest.fundName}:</span>
                <span className="font-medium">{formatCurrency(dest.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      );
    } else {
      // For Fund Switch In cells
      const currentDestination = switchGroup.destinations.find(d => d.fundId === currentFundId);
      const otherDestinations = switchGroup.destinations.filter(d => d.fundId !== currentFundId);
      
      return (
        <div className="text-sm">
          <div className="font-semibold mb-2">
            From {switchGroup.sourceFundName}: {formatCurrency(currentDestination?.amount || 0)}
          </div>
          <div className="text-gray-600 mb-1">
            Total Switch: {formatCurrency(switchGroup.sourceAmount)}
          </div>
          {otherDestinations.length > 0 && (
            <>
              <div className="text-gray-600 mb-1">Other destinations:</div>
              <div className="space-y-1">
                {otherDestinations.map((dest) => (
                  <div key={dest.fundId} className="flex justify-between text-gray-600">
                    <span>{dest.fundName}:</span>
                    <span>{formatCurrency(dest.amount)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      );
    }
  };

  return (
    <div className="relative group">
      {children}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 whitespace-nowrap min-w-max">
        {getTooltipContent()}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
      </div>
    </div>
  );
};

export default SwitchTooltip; 