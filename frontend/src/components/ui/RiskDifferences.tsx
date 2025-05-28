import React, { useState, useEffect } from 'react';
import { getRiskDifferences } from '../../services/api';
import { 
  ExclamationTriangleIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon
} from '@heroicons/react/24/outline';

interface RiskDifference {
  product_id: number;
  product_name: string;
  client_name: string;
  target_risk: number;
  actual_risk: number;
  risk_difference: number;
  fund_count: number;
  funds_with_valuations: number;
}

const RiskDifferences: React.FC = () => {
  const [riskDifferences, setRiskDifferences] = useState<RiskDifference[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRiskDifferences();
  }, []);

  const fetchRiskDifferences = async () => {
    try {
      setLoading(true);
      const response = await getRiskDifferences(5); // Get top 5 products
      setRiskDifferences(response.data || []);
    } catch (err: any) {
      console.error('Error fetching risk differences:', err);
      setRiskDifferences([]);
    } finally {
      setLoading(false);
    }
  };

  const getRiskIcon = (difference: number) => {
    if (difference >= 0.5) {
      return <ExclamationTriangleIcon className="h-4 w-4 text-red-600" />;
    } else if (difference >= 0.1) {
      return <ExclamationTriangleIcon className="h-4 w-4 text-yellow-600" />;
    } else {
      return <ChartBarIcon className="h-4 w-4 text-green-600" />;
    }
  };

  const getRiskBadgeColor = (difference: number) => {
    if (difference >= 0.5) {
      return 'bg-red-100 text-red-800';
    } else if (difference >= 0.1) {
      return 'bg-yellow-100 text-yellow-800';
    } else {
      return 'bg-green-100 text-green-800';
    }
  };

  const getRiskTrendIcon = (targetRisk: number, actualRisk: number) => {
    if (actualRisk > targetRisk) {
      return <ArrowTrendingUpIcon className="h-3 w-3 text-red-600" />;
    } else {
      return <ArrowTrendingDownIcon className="h-3 w-3 text-green-600" />;
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-900">Risk Differences</h3>
          <ChartBarIcon className="h-4 w-4 text-gray-400" />
        </div>
        <div className="space-y-1.5">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="flex items-center space-x-2">
                <div className="h-6 w-6 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-2.5 bg-gray-200 rounded w-3/4 mb-0.5"></div>
                  <div className="h-2 bg-gray-200 rounded w-1/2"></div>
                </div>
                <div className="h-2.5 bg-gray-200 rounded w-10"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-900">Risk Differences</h3>
        <ChartBarIcon className="h-4 w-4 text-gray-400" />
      </div>

      {riskDifferences.length === 0 ? (
        <div className="text-center py-4">
          <ChartBarIcon className="h-6 w-6 text-gray-300 mx-auto mb-1" />
          <p className="text-gray-500 text-xs mb-0.5">No risk differences to display</p>
          <p className="text-gray-400 text-xs">
            Products with calculable target and actual risk will appear here
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {riskDifferences.map((item) => (
            <div
              key={item.product_id}
              className="flex items-center space-x-2 p-1.5 rounded hover:bg-gray-50 transition-colors duration-150 cursor-pointer group border border-transparent hover:border-gray-200"
              onClick={() => window.location.href = `/products/${item.product_id}`}
            >
              {/* Risk Icon */}
              <div className="flex-shrink-0">
                <div className="h-6 w-6 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-gray-200 transition-colors">
                  {getRiskIcon(item.risk_difference)}
                </div>
              </div>

              {/* Product Details */}
              <div className="flex-1 min-w-0 leading-tight">
                <div className="flex items-center space-x-1.5">
                  <p className="text-xs font-medium text-gray-900 truncate">
                    {item.product_name}
                  </p>
                  <span className={`inline-flex items-center px-1 py-0.5 rounded text-xs font-medium ${getRiskBadgeColor(item.risk_difference)}`}>
                    {item.risk_difference.toFixed(1)}
                  </span>
                </div>
                <p className="text-xs text-gray-600 truncate">
                  {item.client_name}
                </p>
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                  <span>Target: {item.target_risk.toFixed(1)}</span>
                  <span>•</span>
                  <span className="flex items-center space-x-1">
                    <span>Actual: {item.actual_risk.toFixed(1)}</span>
                    {getRiskTrendIcon(item.target_risk, item.actual_risk)}
                  </span>
                </div>
              </div>

              {/* Fund Count */}
              <div className="flex-shrink-0 text-right">
                <p className="text-xs text-gray-500">
                  {item.funds_with_valuations}/{item.fund_count} funds
                </p>
              </div>
            </div>
          ))}

          {/* View All Link */}
          <div className="pt-1.5 border-t border-gray-100">
            <button
              onClick={() => window.location.href = '/analytics'}
              className="w-full text-center text-xs text-blue-600 hover:text-blue-800 font-medium py-1 hover:bg-blue-50 rounded transition-colors duration-150"
            >
              View All Risk Analysis
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RiskDifferences; 