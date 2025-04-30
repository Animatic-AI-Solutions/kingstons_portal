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

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

export const useDashboardData = () => {
  const { api } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [funds, setFunds] = useState<Fund[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastFetched, setLastFetched] = useState<number>(0);

  // Mock fund data for demonstration
  const mockFunds: Fund[] = [
    { id: '1', name: 'Global Equity Fund', amount: 12500000, category: 'equity' },
    { id: '2', name: 'UK Bond Fund', amount: 8200000, category: 'bond' },
    { id: '3', name: 'Emerging Markets', amount: 4500000, category: 'equity' },
    { id: '4', name: 'Property Fund', amount: 3100000, category: 'property' },
    { id: '5', name: 'Cash Fund', amount: 1800000, category: 'cash' },
    { id: '6', name: 'Alternative Assets', amount: 900000, category: 'alternative' },
    { id: '7', name: 'Tech Growth Fund', amount: 450000, category: 'equity' },
    { id: '8', name: 'Infrastructure Fund', amount: 350000, category: 'alternative' },
  ];

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
      const response = await api.get('/analytics/dashboard_stats');
      
      // Set metrics from response data, with fallbacks for missing values
      setMetrics({
        totalFUM: response.data?.totalFUM || 0,
        companyIRR: response.data?.companyIRR || 0,
        totalClients: response.data?.totalClients || 0,
        totalAccounts: response.data?.totalAccounts || 0,
        totalActiveHoldings: response.data?.totalActiveHoldings || 0
      });
      
      // In a real implementation, we would fetch fund data from the API
      // For now, use mock data
      setFunds(mockFunds);
      
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