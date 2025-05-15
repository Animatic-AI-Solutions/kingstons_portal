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

interface ProviderDistributionResponse {
  providers: Provider[];
}

interface TemplateDistributionResponse {
  templates: Template[];
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
      
      // Fetch provider distribution data
      const providersResponse = await api.get<ProviderDistributionResponse>('/analytics/provider_distribution');
      
      // Use the providers data directly from the response
      if (providersResponse.data?.providers) {
        setProviders(providersResponse.data.providers);
      } else {
        // If the endpoint isn't implemented yet, create mock data based on fund data
        // This is a temporary solution until the backend endpoint is available
        const providerMap = new Map<string, number>();
        
        fundsResponse.data?.funds?.forEach(fund => {
          // Extract provider name from fund name (this is a fallback strategy)
          // In a real implementation, the API would provide proper provider data
          const providerName = fund.name.split(' ')[0]; // Simplified - assuming first word is provider
          const currentAmount = providerMap.get(providerName) || 0;
          providerMap.set(providerName, currentAmount + fund.amount);
        });
        
        const mockProviders: Provider[] = Array.from(providerMap).map(([name, amount], index) => ({
          id: `provider-${index}`,
          name,
          amount
        }));
        
        setProviders(mockProviders);
      }
      
      // Fetch portfolio template distribution data
      const templatesResponse = await api.get<TemplateDistributionResponse>('/analytics/portfolio_template_distribution');
      
      // Use the templates data directly from the response
      if (templatesResponse.data?.templates) {
        setTemplates(templatesResponse.data.templates);
      } else {
        setTemplates([]);
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
    providers,
    templates,
    loading,
    error,
    refetch: () => fetchData(true),
    lastFetched
  };
};

export default useDashboardData; 