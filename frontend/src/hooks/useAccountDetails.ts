import { useQuery, useQueries } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';

// Use types from the AccountDetails component
interface Client {
  id: number;
  name: string;
}

interface Product {
  id: number;
  product_name: string;
  product_type: string;
  available_providers_id: number;
}

interface Provider {
  id: number;
  name: string;
  status: string;
  created_at: string;
}

interface Account {
  id: number;
  client_account_id: number;
  client_id: number;
  client_name?: string;
  account_name: string;
  status: string;
  start_date: string;
  end_date?: string;
  weighting?: number;
  irr?: number;
  total_value?: number;
  provider_name?: string;
  product_name?: string;
  product_type?: string;
  current_portfolio?: {
    id: number;
    portfolio_name: string;
    assignment_start_date: string;
  };
}

interface ActivityLog {
  id: number;
  account_holding_id: number;
  portfolio_fund_id: number;
  activity_timestamp: string;
  activity_type: string;
  amount: number;
  units_transacted?: number;
  market_value_held?: number;
  cash_flow_amount?: number;
  description?: string;
  total_units_held?: number;
}

interface AccountHolding {
  id: number;
  client_account_id: number;
  portfolio_id?: number;
  status: string;
  start_date: string;
  end_date?: string;
}

interface Portfolio {
  id: number;
  portfolio_name: string;
}

interface PortfolioFund {
  id: number;
  portfolio_id: number;
  available_funds_id: number;
  target_weighting?: number;
  start_date: string;
  end_date?: string;
  amount_invested?: number;
}

interface Holding {
  // Database fields
  id: number;
  portfolio_id?: number;
  portfolio_name?: string;
  status: string;
  start_date: string;
  end_date?: string;
  fund_id?: number;
  fund_name?: string;
  isin_number?: string;
  target_weighting?: string;
  amount_invested: number;
  
  // Calculated fields
  units: number;
  market_value: number;
  irr?: number;
  activities: ActivityLog[];
  account_holding_id: number;
  irr_calculation_date?: string;
  isin?: string;
  risk_level?: string;
}

// Export all interfaces for use in other components
export type {
  Client,
  Product,
  Provider,
  Account,
  ActivityLog,
  AccountHolding,
  Portfolio,
  PortfolioFund,
  Holding
};

/**
 * Custom hook to fetch account details data with caching and loading states
 */
export function useAccountDetails(accountId: string | undefined) {
  const { api } = useAuth();
  
  // Skip queries if no accountId provided
  const enabled = !!accountId;

  // Core account data
  const accountQuery = useQuery({
    queryKey: ['account', accountId],
    queryFn: async () => {
      const response = await api.get(`/client_accounts/${accountId}`);
      return response.data;
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });

  // Base data resources that don't change frequently
  const resourcesQueries = useQueries({
    queries: [
      {
        queryKey: ['clients'],
        queryFn: async () => {
          const response = await api.get('/clients');
          return response.data;
        },
        enabled,
        staleTime: 10 * 60 * 1000, // 10 minutes cache
      },
      {
        queryKey: ['products'],
        queryFn: async () => {
          const response = await api.get('/available_products');
          return response.data;
        },
        enabled,
        staleTime: 10 * 60 * 1000,
      },
      {
        queryKey: ['providers'],
        queryFn: async () => {
          const response = await api.get('/available_providers');
          return response.data;
        },
        enabled,
        staleTime: 10 * 60 * 1000,
      },
      {
        queryKey: ['portfolios'],
        queryFn: async () => {
          const response = await api.get('/portfolios');
          return response.data;
        },
        enabled,
        staleTime: 10 * 60 * 1000,
      },
      {
        queryKey: ['funds'],
        queryFn: async () => {
          const response = await api.get('/funds');
          return response.data;
        },
        enabled,
        staleTime: 10 * 60 * 1000,
      },
      {
        queryKey: ['portfolio_funds'],
        queryFn: async () => {
          const response = await api.get('/portfolio_funds');
          return response.data;
        },
        enabled,
        staleTime: 5 * 60 * 1000, // This might change more frequently
      },
    ],
  });
  
  // Account-specific data
  const accountSpecificQueries = useQueries({
    queries: [
      {
        queryKey: ['account_holdings', accountId],
        queryFn: async () => {
          const response = await api.get(`/account_holdings?client_account_id=${accountId}`);
          return response.data;
        },
        enabled,
        staleTime: 1 * 60 * 1000, // 1 minute cache for more frequently changing data
      },
      {
        queryKey: ['account_activities', accountId],
        queryFn: async () => {
          const response = await api.get(`/holding_activity_logs?client_account_id=${accountId}`);
          return response.data;
        },
        enabled,
        staleTime: 1 * 60 * 1000,
      },
      {
        queryKey: ['account_irr', accountId],
        queryFn: async () => {
          try {
            const response = await api.get(`/analytics/account/${accountId}/irr`);
            return response.data;
          } catch (error) {
            console.error(`Error fetching account IRR:`, error);
            return { irr: 0 }; // Default value on error
          }
        },
        enabled,
        staleTime: 5 * 60 * 1000,
        retry: 1, // Only retry once if it fails
      },
    ],
  });

  // Map fetched data
  const [clientsQuery, productsQuery, providersQuery, portfoliosQuery, fundsQuery, portfolioFundsQuery] = resourcesQueries;
  const [holdingsQuery, activitiesQuery, irrQuery] = accountSpecificQueries;

  // Process data into usable maps once data is available
  const processedData = useQuery({
    queryKey: ['processed_account_data', accountId],
    queryFn: async () => {
      // Create maps for quick lookups
      const clientsMap = new Map<number, Client>(
        clientsQuery.data?.map((client: Client) => [client.id, client]) || []
      );
      
      const productsMap = new Map<number, Product>(
        productsQuery.data?.map((product: Product) => [product.id, product]) || []
      );
      
      const portfoliosMap = new Map<number, Portfolio>(
        portfoliosQuery.data?.map((portfolio: Portfolio) => [portfolio.id, portfolio]) || []
      );
      
      const providersMap = new Map<number, Provider>(
        providersQuery.data?.map((provider: Provider) => [provider.id, provider]) || []
      );
      
      const fundsMap = new Map<number, any>(
        fundsQuery.data?.map((fund: any) => [fund.id, fund]) || []
      );

      // Process account data
      let enrichedAccount: Account | null = null;
      if (accountQuery.data) {
        const accountData = { ...accountQuery.data };
        
        // Enrich with client info
        const client = clientsMap.get(accountData.client_id);
        accountData.client_name = client?.name || 'Unknown Client';

        // Enrich with product and provider info
        const product = productsMap.get(accountData.available_products_id);
        if (product) {
          accountData.product_name = product.product_name || 'Unknown Product';
          accountData.product_type = product.product_type;
          
          // Get provider info from the product's available_providers_id
          const provider = providersMap.get(product.available_providers_id);
          accountData.provider_name = provider?.name || 'Unknown Provider';
        } else {
          accountData.product_name = 'Unknown Product';
          accountData.product_type = undefined;
          accountData.provider_name = 'Unknown Provider';
        }

        // Get current holding and portfolio
        const currentHolding = holdingsQuery.data?.find((h: AccountHolding) => h.status === 'active');
        if (currentHolding && currentHolding.portfolio_id) {
          const portfolio = portfoliosMap.get(currentHolding.portfolio_id);
          accountData.current_portfolio = {
            id: currentHolding.portfolio_id,
            portfolio_name: portfolio?.portfolio_name || 'Unknown Portfolio',
            assignment_start_date: currentHolding.start_date
          };
        }

        // Add account IRR
        accountData.irr = irrQuery.data?.irr || 0;
        enrichedAccount = accountData;
      }

      // Process holdings
      const processedHoldings: Holding[] = [];
      
      if (holdingsQuery.data && Array.isArray(holdingsQuery.data)) {
        // Simple first-pass processing - we'll do detailed processing later for visible holdings
        for (const holding of holdingsQuery.data) {
          if (!holding.portfolio_id) {
            // Skip holdings without portfolio
            continue;
          }

          const portfolio = portfoliosMap.get(holding.portfolio_id);
          
          // Get portfolio funds for this holding's portfolio
          const portfolioFunds = portfolioFundsQuery.data?.filter(
            (pf: PortfolioFund) => pf.portfolio_id === holding.portfolio_id
          ) || [];
          
          // Get activity logs for these portfolio funds
          const activities = activitiesQuery.data?.filter(
            (log: ActivityLog) => 
              portfolioFunds.some((pf: PortfolioFund) => pf.id === log.portfolio_fund_id)
          ) || [];

          // Basic processing for each fund
          for (const pf of portfolioFunds) {
            const fund = fundsMap.get(pf.available_funds_id);
            
            const processedHolding: Holding = {
              id: pf.id,
              portfolio_id: holding.portfolio_id,
              portfolio_name: portfolio?.portfolio_name || 'Unknown Portfolio',
              fund_id: pf.available_funds_id,
              fund_name: fund?.fund_name || 'Unknown Fund',
              isin_number: fund?.isin_number || 'N/A',
              target_weighting: pf.target_weighting?.toString(),
              status: holding.status,
              start_date: pf.start_date,
              end_date: pf.end_date,
              units: 0, // These will be calculated on-demand 
              market_value: 0,
              amount_invested: pf.amount_invested || 0,
              activities: activities.filter((a: ActivityLog) => a.portfolio_fund_id === pf.id),
              account_holding_id: holding.id,
              irr: 0, // Will be fetched on-demand
              risk_level: fund?.risk_factor?.toString() || 'N/A'
            };
            
            processedHoldings.push(processedHolding);
          }
        }
      }

      return {
        account: enrichedAccount,
        holdings: processedHoldings,
        activities: activitiesQuery.data || [],
        maps: {
          clients: clientsMap,
          products: productsMap,
          portfolios: portfoliosMap,
          providers: providersMap,
          funds: fundsMap
        }
      };
    },
    enabled: 
      enabled && 
      accountQuery.isSuccess && 
      clientsQuery.isSuccess && 
      productsQuery.isSuccess && 
      providersQuery.isSuccess && 
      portfoliosQuery.isSuccess && 
      fundsQuery.isSuccess && 
      portfolioFundsQuery.isSuccess && 
      holdingsQuery.isSuccess && 
      activitiesQuery.isSuccess,
    staleTime: 1 * 60 * 1000 // 1 minute cache
  });

  // Calculate loading state based on all queries
  const isLoading = 
    accountQuery.isLoading || 
    clientsQuery.isLoading || 
    productsQuery.isLoading || 
    providersQuery.isLoading || 
    portfoliosQuery.isLoading || 
    fundsQuery.isLoading || 
    portfolioFundsQuery.isLoading || 
    holdingsQuery.isLoading || 
    activitiesQuery.isLoading || 
    processedData.isLoading;
  
  // Get any error from the queries
  const errorQueries = [
    accountQuery, 
    clientsQuery, 
    productsQuery, 
    providersQuery, 
    portfoliosQuery, 
    fundsQuery, 
    portfolioFundsQuery, 
    holdingsQuery, 
    activitiesQuery, 
    processedData
  ].filter(query => query.isError);
  
  const error = errorQueries.length > 0 
    ? errorQueries[0].error
    : null;

  // Function to refresh all data
  const refreshData = () => {
    accountQuery.refetch();
    clientsQuery.refetch();
    productsQuery.refetch();
    providersQuery.refetch();
    portfoliosQuery.refetch();
    fundsQuery.refetch();
    portfolioFundsQuery.refetch();
    holdingsQuery.refetch();
    activitiesQuery.refetch();
    irrQuery.refetch();
    processedData.refetch();
  };

  return {
    data: processedData.data,
    isLoading,
    error,
    refreshData
  };
} 