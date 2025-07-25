import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getConsolidatedRevenueData, getCompanyRevenueAnalytics, getClientGroupRevenueBreakdown, getRevenueRateAnalytics, refreshRevenueRateCache } from '../services/api';
import DynamicPageContainer from '../components/DynamicPageContainer';


// Types
interface CompanyRevenueData {
  total_annual_revenue: number;
  active_products: number;
  revenue_generating_products: number;
  avg_revenue_per_product: number;
  active_providers: number;
}

interface RevenueRateData {
  total_revenue: number;
  total_fum: number;
  revenue_rate_percentage: number;
  complete_client_groups_count: number;
  total_client_groups: number;
}

interface ClientRevenueData {
  id: number;
  name: string;
  status: string;
  total_fum: number;
  total_revenue: number;
  revenue_percentage_of_total: number;
  product_count: number;
  products_with_revenue: number;
  revenue_status: 'complete' | 'needs_valuation';
}

// Loading Components - Consistent with other pages
const LoadingSkeleton = () => (
  <div className="flex justify-center items-center py-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
  </div>
);

// Compact Summary Card Component
const SummaryCard: React.FC<{
  title: string;
  value: string | number;
  subtitle?: string;
  color?: 'green' | 'blue' | 'purple' | 'orange' | 'teal' | 'indigo' | 'cyan';
}> = ({ title, value, subtitle, color = 'blue' }) => {
  const colorClasses = {
    green: 'text-green-600',
    blue: 'text-blue-600',
    purple: 'text-purple-600',
    orange: 'text-orange-600',
    teal: 'text-teal-600',
    indigo: 'text-indigo-600',
    cyan: 'text-cyan-600'
  };

  return (
    <div className="bg-white rounded-lg p-3 shadow border border-gray-200">
      <div className="text-xs font-medium text-gray-600 mb-1">{title}</div>
      <div className={`text-lg font-bold ${colorClasses[color]}`}>{value}</div>
      {subtitle && <div className="text-xs text-gray-500 mt-1">{subtitle}</div>}
    </div>
  );
};

// Compact Sortable Header Component
const SortableHeader: React.FC<{
  title: string;
  sortKey: string;
  currentSort?: { key: string; direction: 'asc' | 'desc' };
  onSort: (key: string) => void;
}> = ({ title, sortKey, currentSort, onSort }) => {
  const isActive = currentSort?.key === sortKey;
  
  return (
    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300">
      <div 
        className="flex items-center group cursor-pointer hover:bg-indigo-50 rounded py-1 px-1 transition-colors duration-150" 
        onClick={() => onSort(sortKey)}
        title={`Click to sort by ${title}`}
      >
        <span>{title}</span>
        <span className="ml-1 text-gray-400 group-hover:text-indigo-500">
          {isActive ? (
            currentSort?.direction === 'asc' ? (
              <svg className="h-3 w-3 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            ) : (
              <svg className="h-3 w-3 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            )
          ) : (
            <svg className="h-3 w-3 opacity-0 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4" />
            </svg>
          )}
        </span>
      </div>
    </th>
  );
};

const Revenue: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revenueData, setRevenueData] = useState<CompanyRevenueData | null>(null);
  const [revenueRateData, setRevenueRateData] = useState<RevenueRateData | null>(null);
  const [clientRevenueData, setClientRevenueData] = useState<ClientRevenueData[]>([]);
  const [sortConfig, setSortConfig] = useState<{key: string, direction: 'asc' | 'desc'}>({
    key: 'total_revenue', 
    direction: 'desc'
  });
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'dormant'>('all');
  const [revenueFilter, setRevenueFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all');

  // Performance monitoring
  const [loadingTime, setLoadingTime] = useState<number | null>(null);

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Format percentage
  const formatPercentage = (value: number): string => {
    return `${value.toFixed(1)}%`;
  };

  // Get revenue rate color based on performance thresholds
  const getRevenueRateColor = (rate?: number): 'green' | 'orange' | 'teal' => {
    if (!rate) return 'teal';
    if (rate >= 1.0) return 'green';
    if (rate >= 0.5) return 'orange';
    return 'teal';
  };

  // Fetch revenue data - OPTIMIZED VERSION
  const fetchRevenueData = async () => {
    try {
      setLoading(true);
      setError(null);
      const startTime = performance.now();

      console.time('⚡ Revenue Data Fetch');
      
      // Single consolidated API call instead of 3 separate calls
      const consolidatedData = await getConsolidatedRevenueData();
      
      console.timeEnd('⚡ Revenue Data Fetch');
      
      const endTime = performance.now();
      setLoadingTime(endTime - startTime);
      console.log(`🚀 Revenue page loaded in ${(endTime - startTime).toFixed(2)}ms`);
      
      setRevenueData(consolidatedData.company);
      setClientRevenueData(consolidatedData.clients);
      setRevenueRateData(consolidatedData.revenueRate);

    } catch (err: any) {
      console.error('❌ Error fetching revenue data:', err);
      if (err.response?.status === 404) {
        setError('Revenue analytics features are coming soon. The backend APIs need to be implemented first.');
      } else {
        setError(err.response?.data?.detail || 'Failed to fetch revenue data');
      }
    } finally {
      setLoading(false);
    }
  };

  // Refresh revenue cache and reload data
  const handleRefreshCache = async () => {
    try {
      await refreshRevenueRateCache();
      await fetchRevenueData();
    } catch (err: any) {
      console.error('Error refreshing cache:', err);
      setError('Failed to refresh revenue data');
    }
  };

  useEffect(() => {
    fetchRevenueData();
  }, []);

  // Handle sorting
  const handleSort = (key: string) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  // Sort and filter data
  const sortedAndFilteredData = React.useMemo(() => {
    let filtered = clientRevenueData;
    
    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(client => client.status === filterStatus);
    }

    // Filter by revenue amount
    if (revenueFilter !== 'all') {
      filtered = filtered.filter(client => {
        const revenue = client.total_revenue;
        switch (revenueFilter) {
          case 'low':
            return revenue < 950;
          case 'medium':
            return revenue >= 950 && revenue <= 11400;
          case 'high':
            return revenue > 11400;
          default:
            return true;
        }
      });
    }

    return [...filtered].sort((a, b) => {
      let aValue: any;
      let bValue: any;
      
      // Handle special case for fee_percentage_achieved
      if (sortConfig.key === 'fee_percentage_achieved') {
        aValue = a.total_fum > 0 ? (a.total_revenue / a.total_fum) * 100 : 0;
        bValue = b.total_fum > 0 ? (b.total_revenue / b.total_fum) * 100 : 0;
      } else {
        aValue = a[sortConfig.key as keyof ClientRevenueData];
        bValue = b[sortConfig.key as keyof ClientRevenueData];
      }
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      return 0;
    });
  }, [clientRevenueData, sortConfig, filterStatus, revenueFilter]);

  // Calculate totals for the filtered data
  const totals = React.useMemo(() => {
    return sortedAndFilteredData.reduce((acc, client) => {
      acc.totalFum += client.total_fum;
      acc.totalRevenue += client.total_revenue;
      return acc;
    }, {
      totalFum: 0,
      totalRevenue: 0
    });
  }, [sortedAndFilteredData]);

  // Totals Row Component
  const TotalsRow: React.FC<{ position: 'top' | 'bottom' }> = ({ position }) => (
    <tr className={`bg-indigo-50 font-semibold border-2 border-indigo-200 ${position === 'top' ? 'border-b-2' : 'border-t-2'}`}>
      <td className="px-4 py-2 whitespace-nowrap text-sm font-bold text-indigo-900">
        TOTAL ({sortedAndFilteredData.length} clients)
      </td>
      <td className="px-4 py-2 whitespace-nowrap text-sm font-bold text-indigo-900">
        {formatCurrency(totals.totalFum)}
      </td>
      <td className="px-4 py-2 whitespace-nowrap text-sm font-bold text-green-700">
        {formatCurrency(totals.totalRevenue)}
      </td>
      <td className="px-4 py-2 whitespace-nowrap text-sm font-bold text-indigo-900">
        {totals.totalFum > 0 ? formatPercentage((totals.totalRevenue / totals.totalFum) * 100) : '0.0%'}
      </td>
      <td className="px-4 py-2 whitespace-nowrap"></td>
    </tr>
  );

  // Calculate effective fee rate
  const effectiveFeeRate = revenueData && revenueData.total_annual_revenue > 0
    ? ((revenueData.total_annual_revenue / (revenueData.total_annual_revenue * 20)) * 100) // Approximate FUM calculation
    : 0;

  // Get revenue status indicator - Only show amber dots, hide green (most will be green)
  const getRevenueStatusIndicator = (revenueStatus: string) => {
    switch (revenueStatus) {
      case 'complete':
        return null; // Hide green dots to reduce visual clutter
      case 'needs_valuation':
        return { color: 'bg-amber-500', tooltip: 'Needs latest valuation to complete revenue calculation' };
      default:
        return null; // Hide unknown status too
    }
  };

  return (

    <DynamicPageContainer 
      maxWidth="2800px"
      className="py-3"
    >
      {/* Header - Consistent with Products page */}

      <div className="flex justify-between items-center mb-3">
        <div>
          <h1 className="text-3xl font-normal text-gray-900 font-sans tracking-wide">Revenue Analytics</h1>
          {loadingTime && (
            <div className="text-xs text-gray-500 mt-1">
              ⚡ Loaded in {loadingTime.toFixed(0)}ms
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <LoadingSkeleton />
      ) : error ? (
        <div className="text-red-600 text-center py-4">{error}</div>
      ) : (
        <>
          {/* Compact Revenue Summary */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
            <SummaryCard 
              title="Total Revenue" 
              value={revenueData ? formatCurrency(revenueData.total_annual_revenue) : '£0'}
              color="green"
            />
            <SummaryCard 
              title="Active Products" 
              value={revenueData?.active_products || 0}
              color="indigo"
            />
            <SummaryCard 
              title="Avg per Product" 
              value={revenueData ? formatCurrency(revenueData.avg_revenue_per_product || 0) : '£0'}
              color="purple"
            />
            <SummaryCard 
              title="Avg per Client" 
              value={revenueData && clientRevenueData.length > 0 
                ? formatCurrency(revenueData.total_annual_revenue / clientRevenueData.length) 
                : '£0'}
              color="cyan"
            />
            <SummaryCard 
              title="% Fee Achieved" 
              value={revenueRateData ? `${revenueRateData.revenue_rate_percentage.toFixed(2)}%` : '0.00%'}
              color={getRevenueRateColor(revenueRateData?.revenue_rate_percentage)}
            />
          </div>

          {/* Client Revenue Table - Consistent with Products page */}
          <div className="bg-white shadow rounded-lg p-4 overflow-visible">
            <div className="flex justify-between items-center mb-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Client Revenue Breakdown</h2>
                {/* Updated Revenue Status Legend - Only amber dots shown */}
                <div className="flex items-center space-x-4 mt-1">
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                    <span className="text-xs text-gray-600">Needs Valuation</span>
                  </div>
                  <span className="text-xs text-gray-500 italic">No dot = Complete</span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {/* Status Filter */}
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Clients</option>
                  <option value="active">Active Only</option>
                  <option value="dormant">Dormant Only</option>
                </select>

                {/* Revenue Amount Filter */}
                <select
                  value={revenueFilter}
                  onChange={(e) => setRevenueFilter(e.target.value as any)}
                  className="px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Revenue</option>
                  <option value="low">&lt; £950</option>
                  <option value="medium">£950 - £11,400</option>
                  <option value="high">&gt; £11,400</option>
                </select>
                
                {/* Refresh button */}
                <button 
                  onClick={handleRefreshCache}
                  className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
                  disabled={loading}
                >
                  {loading ? 'Loading...' : 'Refresh'}
                </button>
                
                {/* Export button placeholder */}
                <button className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50">
                  Export
                </button>
              </div>
            </div>
            
                        <div className="overflow-x-auto overflow-visible">
              <table className="min-w-full table-fixed divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-100">
                  <tr>
                    <SortableHeader title="Client Name" sortKey="name" currentSort={sortConfig} onSort={handleSort} />
                    <SortableHeader title="Total FUM" sortKey="total_fum" currentSort={sortConfig} onSort={handleSort} />
                    <SortableHeader title="Annual Revenue" sortKey="total_revenue" currentSort={sortConfig} onSort={handleSort} />
                    <SortableHeader title="% Fee Achieved" sortKey="fee_percentage_achieved" currentSort={sortConfig} onSort={handleSort} />
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {/* Top Totals Row */}
                  <TotalsRow position="top" />
                  
                  {sortedAndFilteredData.map((client) => {
                    const statusIndicator = getRevenueStatusIndicator(client.revenue_status);
                    return (
                      <tr 
                        key={client.id} 
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => navigate(`/client_groups/${client.id}`)}
                      >
                        <td className="px-4 py-2 whitespace-nowrap">
                          <div className="flex items-center">
                            {statusIndicator && (
                              <div 
                                className={`w-2 h-2 rounded-full mr-2 ${statusIndicator.color} cursor-help`}
                                title={statusIndicator.tooltip}
                                aria-label={statusIndicator.tooltip}
                              ></div>
                            )}
                            <div>
                              <div className="text-sm font-medium text-gray-900">{client.name}</div>
                              <div className="text-xs text-gray-500 capitalize">{client.status}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(client.total_fum)}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <div className="text-sm font-semibold text-green-600">
                            {formatCurrency(client.total_revenue)}
                          </div>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                          {client.total_fum > 0 ? formatPercentage((client.total_revenue / client.total_fum) * 100) : '0.0%'}
                        </td>
                      </tr>
                  );
                  })}
                  
                  {/* Bottom Totals Row */}
                  <TotalsRow position="bottom" />
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </DynamicPageContainer>
  );
};

export default Revenue; 