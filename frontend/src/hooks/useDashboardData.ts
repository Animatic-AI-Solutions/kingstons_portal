import { useQuery } from '@tanstack/react-query';
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

// Refactored hook using React Query
export const useDashboardData = () => {
  const { api } = useAuth();

  // Define the async fetch function
  const fetchDashboardData = async (): Promise<DashboardAllResponse> => {
    console.log('Fetching dashboard data with React Query...');
    const { data } = await api.get<DashboardAllResponse>('/analytics/dashboard_all', {
      params: {
        fund_limit: 50,  // INCREASED: Get more items to avoid truncation issues
        provider_limit: 50,  // INCREASED: Get more items to avoid truncation issues  
        template_limit: 50,  // INCREASED: Get more items to avoid truncation issues
      },
    });

    if (data.performance?.optimization_stats) {
      const stats = data.performance.optimization_stats;
      console.log(`🚀 Dashboard optimized! ${stats.total_db_queries} queries (was 50+), processed ${stats.total_portfolio_funds} funds with ${stats.valuations_used} valuations`);
    }

    return data;
  };

  // Use the useQuery hook to manage the data fetching
  const { 
    data, 
    error, 
    isLoading, 
    refetch,
    isFetching,
    isSuccess,
   } = useQuery({
    queryKey: ['dashboardData'],
    queryFn: fetchDashboardData,
    // staleTime is already set globally in App.tsx, but can be overridden here
    // staleTime: 5 * 60 * 1000, 
  });
  
  // Log any errors
  if (error) {
    console.error('Error fetching dashboard data via React Query:', error);
  }

  // Return data in a structured way that matches the previous hook's API
  return {
    metrics: data?.metrics,
    funds: data?.funds || [],
    providers: data?.providers || [],
    templates: data?.templates || [],
    performanceStats: data?.performance?.optimization_stats,
    loading: isLoading || isFetching,
    error,
    isSuccess,
    refetch,
  };
};

export default useDashboardData; 