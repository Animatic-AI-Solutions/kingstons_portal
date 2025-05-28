import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

// Types
interface DashboardMetrics {
  totalFUM: number;
  companyIRR: number;
  totalClients: number;
  totalAccounts: number;
  totalActiveHoldings: number;
}

interface DistributionData {
  id: string;
  name: string;
  amount: number;
  percentage?: number;
}

interface PerformanceData {
  id: number | string;
  name: string;
  type: 'client' | 'product' | 'portfolio' | 'fund';
  irr: number;
  fum: number;
  startDate?: string;
  advisor?: string;
}

interface ClientRisk {
  client_id: number;
  client_name: string;
  risk_score: number;
  total_investment: number;
}

// Loading Skeleton Components
const MetricCardSkeleton = () => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 animate-pulse">
    <div className="flex items-center justify-between">
      <div>
        <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
        <div className="h-8 bg-gray-200 rounded w-32"></div>
      </div>
      <div className="h-12 w-12 bg-gray-200 rounded-lg"></div>
    </div>
  </div>
);

const ChartSkeleton = () => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 animate-pulse">
    <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
    <div className="h-64 bg-gray-200 rounded"></div>
  </div>
);

const TableSkeleton = () => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 animate-pulse">
    <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
    <div className="space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex space-x-4">
          <div className="h-4 bg-gray-200 rounded flex-1"></div>
          <div className="h-4 bg-gray-200 rounded w-20"></div>
          <div className="h-4 bg-gray-200 rounded w-16"></div>
        </div>
      ))}
    </div>
  </div>
);

// Icon Components
const TrendingUpIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

const CurrencyIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
  </svg>
);

const UsersIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
  </svg>
);

const PortfolioIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
  </svg>
);

const RefreshIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

// Metric Card Component
const MetricCard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: { value: number; isPositive: boolean };
  color: 'blue' | 'green' | 'purple' | 'orange';
}> = ({ title, value, icon, trend, color }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    green: 'bg-green-50 text-green-600 border-green-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
    orange: 'bg-orange-50 text-orange-600 border-orange-100'
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {trend && (
            <div className={`flex items-center mt-2 text-sm ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
              <TrendingUpIcon />
              <span className="ml-1">{Math.abs(trend.value)}%</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

// Simple Chart Component
const SimpleChart: React.FC<{
  title: string;
  data: DistributionData[];
  type: 'pie' | 'bar';
}> = ({ title, data, type }) => {
  const total = data.reduce((sum, item) => sum + item.amount, 0);
  
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="space-y-3">
        {data.slice(0, 5).map((item, index) => {
          const percentage = total > 0 ? (item.amount / total) * 100 : 0;
          return (
            <div key={item.id} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: `hsl(${index * 60}, 70%, 50%)` }}
                />
                <span className="text-sm font-medium text-gray-700 truncate max-w-32">
                  {item.name}
                </span>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-gray-900">
                  £{item.amount.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500">
                  {percentage.toFixed(1)}%
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Performance Table Component
const PerformanceTable: React.FC<{
  title: string;
  data: PerformanceData[];
  showType?: boolean;
}> = ({ title, data, showType = false }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      {data.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>Performance data temporarily unavailable</p>
          <p className="text-sm mt-2">Please try refreshing the page</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-700">Rank</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Name</th>
                {showType && <th className="text-left py-3 px-4 font-medium text-gray-700">Type</th>}
                <th className="text-left py-3 px-4 font-medium text-gray-700">FUM</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">IRR</th>
              </tr>
            </thead>
            <tbody>
              {data.slice(0, 5).map((item, index) => (
                <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-medium text-gray-900 truncate max-w-48">{item.name}</div>
                  </td>
                  {showType && (
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 capitalize">
                        {item.type}
                      </span>
                    </td>
                  )}
                  <td className="py-3 px-4 text-gray-900">
                    £{item.fum.toLocaleString()}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`font-medium ${item.irr >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {item.irr.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// Risk Analysis Component
const RiskAnalysis: React.FC<{ data: ClientRisk[] }> = ({ data }) => {
  const getRiskColor = (score: number) => {
    if (score >= 5) return 'text-red-600 bg-red-50';
    if (score >= 3) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  const getRiskLabel = (score: number) => {
    if (score >= 5) return 'High Risk';
    if (score >= 3) return 'Medium Risk';
    return 'Low Risk';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Client Risk Analysis</h3>
      <div className="space-y-3">
        {data.slice(0, 5).map((client) => (
          <div key={client.client_id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100">
            <div>
              <div className="font-medium text-gray-900">{client.client_name}</div>
              <div className="text-sm text-gray-500">
                Investment: £{client.total_investment.toLocaleString()}
              </div>
            </div>
            <div className="text-right">
              <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getRiskColor(client.risk_score)}`}>
                {getRiskLabel(client.risk_score)}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                Score: {client.risk_score.toFixed(1)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Main Reporting Component (now using Analytics design)
const Reporting: React.FC = () => {
  const { api } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  
  // Data states
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [funds, setFunds] = useState<DistributionData[]>([]);
  const [providers, setProviders] = useState<DistributionData[]>([]);
  const [templates, setTemplates] = useState<DistributionData[]>([]);
  const [topPerformers, setTopPerformers] = useState<PerformanceData[]>([]);
  const [clientRisks, setClientRisks] = useState<ClientRisk[]>([]);

  // Filters
  const [selectedTimeframe, setSelectedTimeframe] = useState<'all' | 'ytd' | '12m' | '3y'>('all');
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch dashboard data first (most important)
      const dashboardResponse = await api.get('/analytics/dashboard_all', {
        params: { fund_limit: 10, provider_limit: 10, template_limit: 10 }
      });

      // Set dashboard metrics
      setMetrics(dashboardResponse.data.metrics);
      setFunds(dashboardResponse.data.funds || []);
      setProviders(dashboardResponse.data.providers || []);
      setTemplates(dashboardResponse.data.templates || []);

      // Try to fetch performance data, but don't fail if it errors
      try {
        const performanceResponse = await api.get('/analytics/performance_data', {
          params: { entity_type: 'overview', sort_order: 'highest', limit: 10 }
        });
        setTopPerformers(performanceResponse.data.performanceData || []);
      } catch (perfErr) {
        console.warn('Performance data failed, continuing without it:', perfErr);
        setTopPerformers([]);
      }

      // Fetch client risks
      const clientRisksResponse = await api.get('/analytics/client_risks');
      setClientRisks(clientRisksResponse.data || []);

      setLastUpdated(new Date());
    } catch (err: any) {
      console.error('Error fetching analytics data:', err);
      setError(err.response?.data?.detail || 'Failed to fetch analytics data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAnalyticsData();
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, [selectedTimeframe]);

  // Format currency
  const formatCurrency = (amount: number): string => {
    return `£${amount.toLocaleString()}`;
  };

  // Format percentage
  const formatPercentage = (value: number): string => {
    return `${value.toFixed(1)}%`;
  };

  if (loading && !metrics) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header Skeleton */}
          <div className="mb-8">
            <div className="h-8 bg-gray-200 rounded w-48 mb-2 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-96 animate-pulse"></div>
          </div>

          {/* Metrics Grid Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <MetricCardSkeleton key={i} />
            ))}
          </div>

          {/* Charts Grid Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {[...Array(3)].map((_, i) => (
              <ChartSkeleton key={i} />
            ))}
          </div>

          {/* Tables Grid Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(2)].map((_, i) => (
              <TableSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <div className="text-red-600 text-lg font-medium mb-2">Error Loading Analytics</div>
            <div className="text-red-500 mb-4">{error}</div>
            <button
              onClick={fetchAnalyticsData}
              className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <RefreshIcon />
              <span className="ml-2">Try Again</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-normal text-gray-900 font-sans tracking-wide">Analytics Dashboard</h1>
            <p className="text-gray-600">
              Comprehensive insights into your portfolio performance and client metrics
            </p>
          </div>
          <div className="flex items-center space-x-4 mt-4 sm:mt-0">
            {/* Timeframe Filter */}
            <select
              value={selectedTimeframe}
              onChange={(e) => setSelectedTimeframe(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Time</option>
              <option value="ytd">Year to Date</option>
              <option value="12m">Last 12 Months</option>
              <option value="3y">Last 3 Years</option>
            </select>

            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <RefreshIcon />
              <span className="ml-2">{refreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Total FUM"
            value={formatCurrency(metrics?.totalFUM || 0)}
            icon={<CurrencyIcon />}
            color="blue"
          />
          <MetricCard
            title="Company IRR"
            value={formatPercentage(metrics?.companyIRR || 0)}
            icon={<TrendingUpIcon />}
            color="green"
          />
          <MetricCard
            title="Total Clients"
            value={metrics?.totalClients || 0}
            icon={<UsersIcon />}
            color="purple"
          />
          <MetricCard
            title="Active Holdings"
            value={metrics?.totalActiveHoldings || 0}
            icon={<PortfolioIcon />}
            color="orange"
          />
        </div>

        {/* Distribution Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <SimpleChart
            title="Fund Distribution"
            data={funds}
            type="pie"
          />
          <SimpleChart
            title="Provider Distribution"
            data={providers}
            type="pie"
          />
          <SimpleChart
            title="Template Distribution"
            data={templates}
            type="pie"
          />
        </div>

        {/* Performance and Risk Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <PerformanceTable
            title="Top Performers"
            data={topPerformers}
            showType={true}
          />
          <RiskAnalysis data={clientRisks} />
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 mt-8">
          Last updated: {lastUpdated.toLocaleString()}
        </div>
      </div>
    </div>
  );
};

export default Reporting; 