import React, { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
  trend?: {
    value: string | number;
    isPositive: boolean;
    label?: string;
  };
  className?: string;
  iconBgClass?: string;
  iconColorClass?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  trend,
  className = '',
  iconBgClass = 'bg-primary-100',
  iconColorClass = 'text-primary-700',
}) => {
  return (
    <div className={`bg-white shadow-md rounded-lg p-6 border border-gray-100 ${className}`}>
      <div className="flex items-center">
        {icon && (
          <div className={`p-3 rounded-full ${iconBgClass} mr-4`}>
            <div className={`h-8 w-8 ${iconColorClass}`}>
              {icon}
            </div>
          </div>
        )}
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-1 text-3xl font-semibold text-primary-800">{value}</p>
          {trend && (
            <div className="flex items-center mt-1">
              <span className={`flex items-center ${trend.isPositive ? 'text-green-600' : 'text-red-600'} text-sm`}>
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
                    d={trend.isPositive 
                      ? "M5 10l7-7m0 0l7 7m-7-7v18" 
                      : "M19 14l-7 7m0 0l-7-7m7 7V3"
                    } 
                  />
                </svg>
                {trend.value}
              </span>
              {trend.label && <span className="text-sm text-gray-500 ml-2">{trend.label}</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatCard; 