import React from 'react';

interface ChangeIndicatorProps {
  value: number;
  timeframe?: string;
  className?: string;
}

const ChangeIndicator: React.FC<ChangeIndicatorProps> = ({
  value,
  timeframe = "since start of business year",
  className = "",
}) => {
  const isPositive = value >= 0;
  const formattedValue = `${Math.abs(value).toFixed(1)}%`;
  
  return (
    <div className={`flex items-center ${className}`} data-testid="change-indicator">
      <div className={`flex items-center justify-center rounded-full px-2 py-1 ${isPositive ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
        <svg 
          className="w-3 h-3 mr-1" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d={isPositive 
              ? "M5 10l7-7m0 0l7 7m-7-7v18" 
              : "M19 14l-7 7m0 0l-7-7m7 7V3"
            } 
          />
        </svg>
        <span className="text-sm font-medium">{formattedValue}</span>
      </div>
      {timeframe && <span className="text-sm text-gray-500 ml-2">{timeframe}</span>}
    </div>
  );
};

export default ChangeIndicator; 