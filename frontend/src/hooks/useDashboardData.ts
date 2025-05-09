import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

// Define types for our data
export interface DashboardMetrics {
  totalFUM: number;
  companyIRR: number;
  totalClients: number;
  totalAccounts: number;
  totalActiveHoldings: number;
}

export interface Fund {
  id: string;
  name: string;
  amount: number;
  category?: string;
}

// Define type for API response data
interface PerformanceDataItem {
  id: number;
  name: string;
  type: string;
  irr: number;
  fum: number;
  startDate: string | null;
}

interface FundDistributionResponse {
  funds: Fund[];
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

export const useDashboardData = () => {
  const { api } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [funds, setFunds] = useState<Fund[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastFetched, setLastFetched] = useState<number>(0);

  const fetchData = useCallback(async (forceRefresh = false) => {
    const now = Date.now();
    
    // Use cached data if available and not forcing a refresh
    if (
      !forceRefresh && 
      metrics && 
      lastFetched > 0 && 
      now - lastFetched < CACHE_DURATION
    ) {
      return;
    }
    
    try {
      setLoading(true);
      
      // Fetch dashboard stats
      const dashboardResponse = await api.get('/analytics/dashboard_stats');
      
      // Set metrics from response data, with fallbacks for missing values
      setMetrics({
        totalFUM: dashboardResponse.data?.totalFUM || 0,
        companyIRR: dashboardResponse.data?.companyIRR || 0,
        totalClients: dashboardResponse.data?.totalClients || 0,
        totalAccounts: dashboardResponse.data?.totalAccounts || 0,
        totalActiveHoldings: dashboardResponse.data?.totalActiveHoldings || 0
      });
      
      // Fetch fund distribution data from the dedicated endpoint
      const fundsResponse = await api.get<FundDistributionResponse>('/analytics/fund_distribution');
      
      // Use the funds data directly from the response
      if (fundsResponse.data?.funds) {
        setFunds(fundsResponse.data.funds);
      } else {
        setFunds([]);
      }
      
      // Update last fetched timestamp
      setLastFetched(now);
      setError(null);
    } catch (err: any) {
      setError(
        new Error(err.response?.data?.detail || 'Failed to load dashboard data')
      );
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [api]);

  // Fetch data on component mount
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    metrics,
    funds,
    loading,
    error,
    refetch: () => fetchData(true),
    lastFetched
  };
};

export default useDashboardData; 