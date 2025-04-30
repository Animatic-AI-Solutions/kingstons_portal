import React from 'react';

interface SkeletonProps {
  className?: string;
  height?: string;
  width?: string;
  rounded?: boolean;
  animated?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({ 
  className = '',
  height,
  width,
  rounded = true,
  animated = true
}) => {
  return (
    <div 
      className={`bg-gray-200 ${rounded ? 'rounded-md' : ''} ${animated ? 'animate-pulse' : ''} ${className}`}
      style={{ 
        height: height || undefined,
        width: width || undefined
      }}
    />
  );
};

interface StatBoxSkeletonProps {
  className?: string;
}

export const StatBoxSkeleton: React.FC<StatBoxSkeletonProps> = ({ 
  className = '' 
}) => {
  return (
    <div className={`bg-white rounded-lg shadow-md overflow-hidden border-t-4 border-gray-200 ${className}`}>
      <div className="px-6 pt-4 pb-2">
        <div className="h-6 bg-gray-200 rounded w-1/2"></div>
      </div>
      <div className="px-6 pb-6">
        <div className="flex items-start mt-2">
          <div className="w-12 h-12 bg-gray-200 rounded-full mr-4"></div>
          <div className="flex-1">
            <div className="h-8 bg-gray-200 rounded w-3/4 mb-3"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface ChartSkeletonProps {
  className?: string;
  height?: number;
}

export const ChartSkeleton: React.FC<ChartSkeletonProps> = ({ 
  className = '',
  height = 350
}) => {
  return (
    <div className={`bg-white rounded-lg shadow-md overflow-hidden border border-gray-200 ${className}`}>
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="h-6 bg-gray-200 rounded w-1/2"></div>
      </div>
      <div className="p-6">
        <div className="h-6 bg-gray-200 rounded w-1/3 mx-auto mb-2"></div>
        <div className="h-8 bg-gray-200 rounded w-1/2 mx-auto mb-8"></div>
        <div 
          className="rounded-full animate-pulse bg-gray-200 mx-auto" 
          style={{ height: height * 0.6, width: height * 0.6 }}
        ></div>
        <div className="flex justify-center mt-8 space-x-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex items-center">
              <div className="w-3 h-3 bg-gray-300 rounded-full mr-2"></div>
              <div className="h-4 bg-gray-200 rounded w-16"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default { Skeleton, StatBoxSkeleton, ChartSkeleton }; 