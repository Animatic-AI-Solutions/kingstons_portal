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

export interface Provider {
  id: string;
  name: string;
  amount: number;
}

export interface Template {
  id: string;
  name: string;
  amount: number;
}

// New interface for the optimized response
interface DashboardAllResponse {
  metrics: DashboardMetrics;
  funds: Fund[];
  providers: Provider[];
  templates: Template[];
  performance: {
    optimization_stats: {
      total_db_queries: number;
      total_portfolio_funds: number;
      total_valuations: number;
      valuations_used: number;
      fum_source: string;
    };
  };
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

export const useDashboardData = () => {
  const { api } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [funds, setFunds] = useState<Fund[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastFetched, setLastFetched] = useState<number>(0);
  const [performanceStats, setPerformanceStats] = useState<any>(null);

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
      
      // SINGLE OPTIMIZED API CALL instead of 4+ separate calls
      console.log('Fetching dashboard data with optimized single endpoint...');
      
      const response = await api.get<DashboardAllResponse>('/analytics/dashboard_all', {
        params: {
          fund_limit: 10,
          provider_limit: 10,
          template_limit: 10
        }
      });
      
      // Set all data from the single response
      setMetrics(response.data.metrics);
      setFunds(response.data.funds || []);
      setProviders(response.data.providers || []);
      setTemplates(response.data.templates || []);
      setPerformanceStats(response.data.performance?.optimization_stats);
      
      // Update last fetched timestamp
      setLastFetched(now);
      setError(null);
      
      // Log performance improvement
      if (response.data.performance?.optimization_stats) {
        const stats = response.data.performance.optimization_stats;
        console.log(`🚀 Dashboard optimized! ${stats.total_db_queries} queries (was 50+), processed ${stats.total_portfolio_funds} funds with ${stats.valuations_used} valuations`);
      }
      
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
    providers,
    templates,
    loading,
    error,
    refetch: () => fetchData(true),
    lastFetched,
    performanceStats // Expose performance stats for debugging
  };
};

export default useDashboardData; 