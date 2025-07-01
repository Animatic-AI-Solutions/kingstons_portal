import React from 'react';
import ChangeIndicator from './ChangeIndicator';

interface StatBoxProps {
  title: string;
  value: number | string;
  changePercentage: number | null;
  timeframe?: string;
  format?: 'currency' | 'percentage' | 'number';
  icon?: React.ReactNode;
  colorScheme?: 'primary' | 'secondary' | 'success' | 'warning';
  className?: string;
}

const StatBox: React.FC<StatBoxProps> = ({
  title,
  value,
  changePercentage,
  timeframe,
  format = 'number',
  icon,
  colorScheme = 'primary',
  className = '',
}) => {
  // Format the value based on the format type
  const formattedValue = React.useMemo(() => {
    if (typeof value === 'string') return value;
    
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-GB', {
          style: 'currency',
          currency: 'GBP',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(value);
      case 'percentage':
        return `${value.toFixed(1)}%`;
      default:
        return new Intl.NumberFormat('en-GB').format(value);
    }
  }, [value, format]);

  // Get border color based on color scheme
  const getBorderColor = () => {
    switch (colorScheme) {
      case 'secondary':
        return 'border-blue-500';
      case 'success':
        return 'border-green-600';
      case 'warning':
        return 'border-pink-600';
      default:
        return 'border-primary-700';
    }
  };

  // Get text color for the title based on color scheme
  const getTitleColor = () => {
    switch (colorScheme) {
      case 'secondary':
        return 'text-blue-600';
      case 'success':
        return 'text-green-700';
      case 'warning':
        return 'text-pink-700';
      default:
        return 'text-primary-800';
    }
  };

  // Get icon background color based on color scheme
  const getIconBgColor = () => {
    switch (colorScheme) {
      case 'secondary':
        return 'bg-blue-50';
      case 'success':
        return 'bg-green-50';
      case 'warning':
        return 'bg-pink-50';
      default:
        return 'bg-primary-50';
    }
  };

  // Get icon color based on color scheme
  const getIconColor = () => {
    switch (colorScheme) {
      case 'secondary':
        return 'text-blue-600';
      case 'success':
        return 'text-green-600';
      case 'warning':
        return 'text-pink-600';
      default:
        return 'text-primary-700';
    }
  };

  return (
    <div 
      className={`bg-white shadow-md rounded-lg overflow-hidden border-t-4 ${getBorderColor()} 
                  hover:shadow-lg transition-shadow duration-300 ${className}`}
    >
      <div className="px-6 pt-4 pb-2">
        <h2 className={`text-lg font-semibold ${getTitleColor()}`}>{title}</h2>
      </div>
      <div className="px-6 pb-6">
        <div className="flex items-start">
          {icon && (
            <div className={`p-3 rounded-full ${getIconBgColor()} mr-4`}>
              <div className={`h-8 w-8 ${getIconColor()}`}>
                {icon}
              </div>
            </div>
          )}
          <div>
            <p className="text-4xl font-bold text-gray-800">{formattedValue}</p>
            {changePercentage !== null && (
              <ChangeIndicator 
                value={changePercentage} 
                timeframe={timeframe}
                className="mt-2" 
              />
            )}
            {changePercentage === null && timeframe && (
              <p className="text-sm text-gray-500 mt-2">{timeframe}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(StatBox); 