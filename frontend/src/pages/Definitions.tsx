import React, { useState, useEffect, useCallback, useMemo, createContext, useContext } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import FilterDropdown from '../components/ui/FilterDropdown';

// Provider interface
interface Provider {
  id: number;
  name: string;
  status: string;
  type?: string;
  created_at: string;
  updated_at?: string;
  theme_color?: string;
  product_count?: number;
}

// Fund interface
interface Fund {
  id: number;
  provider_id: number | null;
  fund_name: string;
  isin_number: string;
  risk_factor: number | null;
  fund_cost: number | null;
  status: string;
  created_at: string;
  provider_name?: string;
}

// Portfolio interface - updated to match API response
interface Portfolio {
  id: number;
  name: string;
  type?: string;
  risk?: string;
  performance?: number;
  weighted_risk?: number;
  allocation_count?: number;
  created_at: string;
  status?: string;
  // From API
  funds?: {
    id: number;
    fund_id: number;
    target_weighting: number;
    available_funds?: {
      id: number;
      fund_name: string;
      risk_factor?: number;
    };
  }[];
  // For calculations
  averageRisk?: number;
  // Count of portfolios using this template
  portfolioCount?: number;
}

type TabType = 'providers' | 'funds' | 'portfolio-templates';
type SortOrder = 'asc' | 'desc';
type ProviderSortField = 'name' | 'status' | 'created_at' | 'product_count';
type FundSortField = 'fund_name' | 'risk_factor' | 'isin_number' | 'fund_cost' | 'created_at';
type PortfolioSortField = 'name' | 'weighted_risk' | 'created_at' | 'averageRisk' | 'portfolioCount';

// Error helper function
const getErrorMessage = (error: any): string => {
  return error?.response?.data?.detail || error?.message || 'An unknown error occurred';
};

// Custom hook for data fetching with cancellation
function useEntityData<T>(
  fetchFn: (params: any) => Promise<T[]>,
  dependencies: any[],
  initialFilters: Record<string, any> = {}
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState(initialFilters);
  
  const fetchData = useCallback(async () => {
    const controller = new AbortController();
    setLoading(true);
    
    try {
      const result = await fetchFn({ 
        ...filters,
        signal: controller.signal 
      });
      setData(result);
      setError(null);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(getErrorMessage(err));
      }
    } finally {
      setLoading(false);
    }
    
    return controller;
  }, [fetchFn, ...dependencies, ...Object.values(filters)]);
  
  useEffect(() => {
    let controller: AbortController;
    
    const fetch = async () => {
      controller = await fetchData();
    };
    
    fetch();
    
    return () => {
      if (controller) {
        controller.abort();
      }
    };
  }, [fetchData]);
  
  return { 
    data, 
    loading, 
    error, 
    setFilters, 
    refresh: fetchData 
  };
}

// Skeleton loader component for tables
const TableSkeleton: React.FC<{ columns: number; rows?: number }> = ({ 
  columns, 
  rows = 5 
}) => {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-gray-200 rounded mb-4" />
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex space-x-2 mb-3">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div 
              key={colIndex} 
              className="h-6 bg-gray-200 rounded"
              style={{ width: `${Math.floor(100 / columns)}%` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

// Empty state component
const EmptyState: React.FC<{ message: string }> = ({ message }) => (
  <div className="text-gray-500 text-center py-8">
    <svg 
      className="mx-auto h-12 w-12 text-gray-400" 
      fill="none" 
      viewBox="0 0 24 24" 
      stroke="currentColor"
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={1} 
        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" 
      />
    </svg>
    <p className="mt-2 text-lg">{message}</p>
  </div>
);

// Error display component
const ErrorDisplay: React.FC<{ message: string }> = ({ message }) => {
  // Make sure message is a string, even if an object is passed
  const errorMessage = typeof message === 'object' 
    ? JSON.stringify(message, null, 2) 
    : message;
    
  return (
    <div className="text-red-600 text-center py-4 rounded-md bg-red-50 p-4">
      <svg 
        className="mx-auto h-8 w-8 text-red-500 mb-2" 
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
        />
      </svg>
      <p>{errorMessage}</p>
      <button 
        className="mt-2 text-sm text-red-700 underline"
        onClick={() => window.location.reload()}
      >
        Retry
      </button>
    </div>
  );
};

// Create context for definitions
interface DefinitionsContextType {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  handleItemClick: (type: TabType, id: number) => void;
  handleAddNew: () => void;
  searchQuery: string; 
  setSearchQuery: (query: string) => void;
  showInactive: boolean;
  setShowInactive: (show: boolean) => void;
}

const DefinitionsContext = createContext<DefinitionsContextType | undefined>(undefined);

const useDefinitions = () => {
  const context = useContext(DefinitionsContext);
  if (!context) {
    throw new Error('useDefinitions must be used within a DefinitionsProvider');
  }
  return context;
};

// Transition component for tab switching
const TabTransition: React.FC<{ isVisible: boolean; children: React.ReactNode }> = ({ 
  isVisible, 
  children 
}) => {
  return (
    <div 
      className={`transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0 hidden'
      }`}
    >
      {children}
    </div>
  );
};

const Definitions: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { api } = useAuth();
  
  // Common state
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    // Read from URL query params if available
    const params = new URLSearchParams(location.search);
    const tabParam = params.get('tab');
    if (tabParam === 'portfolios') return 'portfolio-templates';
    if (tabParam === 'funds') return 'funds';
    if (tabParam === 'providers') return 'providers';
    return 'providers'; // Default
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  // Update URL when tab changes
  useEffect(() => {
    const tabParam = activeTab === 'portfolio-templates' ? 'portfolios' : activeTab;
    navigate(`/definitions?tab=${tabParam}`, { replace: true });
  }, [activeTab, navigate]);
  
  // Provider sorting state
  const [providerSortField, setProviderSortField] = useState<ProviderSortField>('name');
  const [providerSortOrder, setProviderSortOrder] = useState<SortOrder>('asc');
  
  // Provider filtering state
  const [providerStatusFilters, setProviderStatusFilters] = useState<(string | number)[]>([]);
  
  // Fund sorting state
  const [fundSortField, setFundSortField] = useState<FundSortField>('fund_name');
  const [fundSortOrder, setFundSortOrder] = useState<SortOrder>('asc');
  
  // Fund filtering state
  const [fundStatusFilters, setFundStatusFilters] = useState<(string | number)[]>([]);
  const [riskLevelFilters, setRiskLevelFilters] = useState<(string | number)[]>([]);
  
  // Portfolio sorting state
  const [portfolioSortField, setPortfolioSortField] = useState<PortfolioSortField>('name');
  const [portfolioSortOrder, setPortfolioSortOrder] = useState<SortOrder>('asc');
  
  // Portfolio filtering state
  const [portfolioTypeFilters, setPortfolioTypeFilters] = useState<string[]>([]);
  const [riskRangeFilters, setRiskRangeFilters] = useState<(string|number)[]>([]);
  
  // API calls for all entity types
  const fetchProviders = useCallback(async ({ signal }: { signal?: AbortSignal } = {}) => {
    console.log("Fetching providers with product count...");
    const response = await api.get('/available_providers_with_count', { signal });
    const allProviders = response.data;
    return allProviders;
  }, [api]);

  const fetchFunds = useCallback(async ({ signal }: { signal?: AbortSignal } = {}) => {
    console.log("Fetching funds...");
    const response = await api.get('/funds', { 
      params: { 
        show_inactive: showInactive || undefined,
        include_providers: true 
      },
      signal
    });
    return response.data;
  }, [api, showInactive]);
  
  const fetchPortfolioDetails = useCallback(async (portfolioId: number, signal?: AbortSignal): Promise<Portfolio | null> => {
    try {
      const response = await api.get(`/available_portfolios/${portfolioId}`, { signal });
      
      if (response.data) {
        console.log(`Fetched details for portfolio ${portfolioId}:`, response.data);
        
        // Calculate risk if funds data is available
        const portfolioData = response.data;
        const averageRisk = calculateAverageRisk(portfolioData);
        
        // Get the count of portfolios using this template
        let portfolioCount = 0;
        try {
          const portfolioCountResponse = await api.get(`/portfolios`, {
            params: {
              original_template_id: portfolioId,
              count_only: true
            },
            signal
          });
          portfolioCount = portfolioCountResponse.data.count || 0;
        } catch (err) {
          console.warn(`Failed to fetch portfolio count for template ${portfolioId}:`, err);
        }
        
        return {
          ...portfolioData,
          averageRisk,
          // Add these fields for compatibility
          type: portfolioData.type || 'Model',
          risk: getRiskLevel(averageRisk),
          performance: 0, // Default value instead of fetching
          weighted_risk: averageRisk,
          allocation_count: portfolioData.funds?.length || 0,
          portfolioCount: portfolioCount
        };
      }
      return null;
    } catch (err) {
      console.error(`Error fetching portfolio details for ${portfolioId}:`, err);
      return null;
    }
  }, [api]);
  
  const fetchPortfolios = useCallback(async ({ signal }: { signal?: AbortSignal } = {}) => {
    console.log("Fetching portfolio templates...");
    
    try {
      // Get list of all portfolio templates
      const response = await api.get('/available_portfolios', { signal });
      console.log(`Received ${response.data.length} portfolio templates`);
      
      // We need detailed information for each portfolio to calculate risk
      const portfolioTemplates = response.data;
      const detailedPortfolios = await Promise.all(
        portfolioTemplates.map(async (portfolio: any) => {
          const detailedPortfolio = await fetchPortfolioDetails(portfolio.id, signal);
          if (detailedPortfolio) {
            return detailedPortfolio;
          }
          
          // If detail fetch fails, return basic portfolio info
          return {
            ...portfolio,
            type: portfolio.type || 'Model',
            risk: 'Unknown',
            performance: 0,
            weighted_risk: 0,
            allocation_count: 0,
            averageRisk: 0
          };
        })
      );
      
      return detailedPortfolios;
    } catch (err) {
      console.error('Error in fetchPortfolios:', err);
      throw err;
    }
  }, [api, fetchPortfolioDetails]);
  
  // Helper function to calculate average risk
  const calculateAverageRisk = (portfolio: Portfolio): number => {
    if (!portfolio.funds || portfolio.funds.length === 0) return 0;

    let totalWeightedRisk = 0;
    let totalWeight = 0;

    portfolio.funds.forEach(fund => {
      const riskFactor = fund.available_funds?.risk_factor;
      
      if (riskFactor !== undefined && fund.target_weighting) {
        totalWeightedRisk += riskFactor * fund.target_weighting;
        totalWeight += fund.target_weighting;
      }
    });

    return totalWeight > 0 ? Number((totalWeightedRisk / totalWeight).toFixed(1)) : 0;
  };
  
  // Helper function to determine risk level from numerical value
  const getRiskLevel = (riskValue: number): string => {
    if (riskValue < 3) return 'Conservative';
    if (riskValue < 5) return 'Balanced';
    if (riskValue < 7) return 'Growth';
    return 'Aggressive';
  };
  
  // Helper function to get risk range from portfolio weighted risk
  const getRiskRange = (portfolio: Portfolio): string => {
    const risk = portfolio.weighted_risk || portfolio.averageRisk || 0;
    if (risk < 3) return '0-3';
    if (risk < 5) return '3-5';
    if (risk < 7) return '5-7';
    return '7+';
  };
  
  // Use custom hooks for data fetching
  const { 
    data: providers, 
    loading: providersLoading, 
    error: providersError 
  } = useEntityData<Provider>(
    fetchProviders, 
    [api, showInactive]
  );
  
  const { 
    data: funds, 
    loading: fundsLoading, 
    error: fundsError 
  } = useEntityData<Fund>(
    fetchFunds, 
    [api, showInactive]
  );
  
  const {
    data: portfolios,
    loading: portfoliosLoading,
    error: portfoliosError
  } = useEntityData<Portfolio>(
    fetchPortfolios,
    [api, showInactive]
  );

  // Get provider color function for the color dots
  const getProviderColor = useCallback((providerName: string | undefined): string => {
    if (!providerName) return '#CCCCCC'; // Default gray for unknown providers
    
    // Define a set of vibrant colors to use for providers
    const colors = [
      '#4F46E5', // Indigo
      '#16A34A', // Green
      '#EA580C', // Orange
      '#DC2626', // Red
      '#7C3AED', // Purple
      '#0369A1', // Blue
      '#B45309', // Amber
      '#0D9488', // Teal
      '#BE185D', // Pink
      '#475569', // Slate
      '#059669', // Emerald
      '#D97706', // Yellow
      '#9333EA', // Fuchsia
      '#4338CA', // Blue-600
    ];
    
    // Use a simple hash function to get consistent colors for the same provider name
    const hash = providerName.split('').reduce((acc: number, char: string) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
    
    // Map the hash to one of our predefined colors
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  }, []);

  // Format percentage with 1 decimal place
  const formatPercentage = useCallback((value: number): string => {
    return `${value.toFixed(1)}%`;
  }, []);
  
  // Navigation functions
  const handleItemClick = useCallback((type: TabType, id: number) => {
    // Add debugging for clicked items
    console.log(`Clicked on ${type} with ID: ${id}, type: ${typeof id}`);
    
    // For funds, ensure the ID is a valid number
    if (type === 'funds') {
      // If id is not a number or is NaN, show an error
      if (typeof id !== 'number' || isNaN(id)) {
        alert(`Invalid fund ID: ${id}`);
        return;
      }
      
      // Ensure the fund exists in our loaded funds data
      const fund = funds.find(f => f.id === id);
      if (!fund) {
        console.error(`Fund with ID ${id} not found in current data`);
        // But still navigate, as it might exist in the database
      }
    }
    // For portfolio templates, only navigate if they have complete data
    else if (type === 'portfolio-templates') {
      console.log(`Trying to open portfolio template ID: ${id}`);
      // Find the portfolio in the original unfiltered array
      const portfolio = portfolios.find(p => p.id === id);
      console.log("Found portfolio:", portfolio);
      
      if (!portfolio || !portfolio.funds || portfolio.funds.length === 0) {
        // Alert user that the template is incomplete
        alert('This portfolio template has incomplete fund data and cannot be opened.');
        return;
      }
    }
    
    // Log navigation URL for debugging
    const navigationUrl = `/definitions/${type}/${id}`;
    console.log(`Navigating to: ${navigationUrl}`);
    
    navigate(navigationUrl);
  }, [navigate, portfolios, funds]);
  
  const getEntityLink = useCallback((type: TabType) => {
    switch (type) {
      case 'providers':
        return '/definitions/providers';
      case 'funds':
        return '/definitions/funds';
      case 'portfolio-templates':
        return '/definitions/portfolio-templates';
      default:
        return '/';
    }
  }, []);
  
  const getAddEntityLink = useMemo(() => {
    switch (activeTab) {
      case 'providers':
        return '/definitions/providers/add';
      case 'funds':
        return '/definitions/funds/add';
      case 'portfolio-templates':
        return '/definitions/portfolio-templates/add';
      default:
        return '/';
    }
  }, [activeTab]);
  
  const handleAddNew = useCallback(() => {
    navigate(getAddEntityLink);
  }, [navigate, getAddEntityLink]);
  
  // Provider sort function
  const handleProviderSortChange = useCallback((field: ProviderSortField) => {
    if (field === providerSortField) {
      setProviderSortOrder(providerSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setProviderSortField(field);
      setProviderSortOrder('asc');
    }
  }, [providerSortField, providerSortOrder]);
  
  // Fund sort function
  const handleFundSortChange = useCallback((field: FundSortField) => {
    if (field === fundSortField) {
      setFundSortOrder(fundSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setFundSortField(field);
      setFundSortOrder('asc');
    }
  }, [fundSortField, fundSortOrder]);
  
  // Portfolio sort function
  const handlePortfolioSortChange = useCallback((field: PortfolioSortField) => {
    if (field === portfolioSortField) {
      setPortfolioSortOrder(portfolioSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setPortfolioSortField(field);
      setPortfolioSortOrder('asc');
    }
  }, [portfolioSortField, portfolioSortOrder]);
  
  // Context value
  const contextValue = useMemo(() => ({
    activeTab,
    setActiveTab,
    handleItemClick,
    handleAddNew,
    searchQuery,
    setSearchQuery,
    showInactive,
    setShowInactive
  }), [
    activeTab, 
    handleItemClick, 
    handleAddNew, 
    searchQuery, 
    showInactive
  ]);
  
  // Helper functions for funds
  const getFundRiskLevel = (fund: Fund): string => {
    const risk = fund.risk_factor;
    if (risk === null || risk === undefined) return 'Unrated';
    if (risk < 3) return 'Low';
    if (risk < 5) return 'Medium';
    if (risk < 7) return 'High';
    return 'Very High';
  };
  
  // Filter and sort providers
  const filteredAndSortedProviders = useMemo(() => {
    return providers
      .filter(provider => 
        (showInactive || provider.status === 'active') &&
        (provider.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
         provider.status?.toLowerCase().includes(searchQuery.toLowerCase()) ||
         (provider.type && provider.type?.toLowerCase().includes(searchQuery.toLowerCase())))
      )
      .filter(provider => 
        providerStatusFilters.length === 0 || 
        (provider.status && providerStatusFilters.includes(provider.status))
      )
      .sort((a, b) => {
        let aValue: any = a[providerSortField];
        let bValue: any = b[providerSortField];
        
        // Handle string comparisons
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        }
        
        // Compare values
        if (aValue < bValue) return providerSortOrder === 'asc' ? -1 : 1;
        if (aValue > bValue) return providerSortOrder === 'asc' ? 1 : -1;
        return 0;
      });
  }, [providers, showInactive, searchQuery, providerSortField, providerSortOrder, providerStatusFilters]);
  
  // Filter and sort funds
  const filteredAndSortedFunds = useMemo(() => {
    return funds
      .filter(fund => 
        (showInactive || fund.status === 'active') &&
        ((fund.fund_name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
         (fund.isin_number?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
         (fund.provider_name && (fund.provider_name.toLowerCase() || '').includes(searchQuery.toLowerCase())))
      )
      .filter(fund => 
        fundStatusFilters.length === 0 || 
        (fund.status && fundStatusFilters.includes(fund.status))  
      )
      .filter(fund => 
        riskLevelFilters.length === 0 ||
        riskLevelFilters.includes(getFundRiskLevel(fund))
      )
      .sort((a, b) => {
        if (fundSortField === 'risk_factor' || fundSortField === 'fund_cost') {
          // For numeric values
          const aField = fundSortField === 'risk_factor' ? (a.risk_factor || 0) : (a.fund_cost || 0);
          const bField = fundSortField === 'risk_factor' ? (b.risk_factor || 0) : (b.fund_cost || 0);
          
          return fundSortOrder === 'asc' 
            ? aField - bField
            : bField - aField;
        } else if (fundSortField === 'fund_name' || fundSortField === 'isin_number') {
          // For string values
          const aValue = fundSortField === 'fund_name' 
            ? (a.fund_name || '').toLowerCase() 
            : (a.isin_number || '').toLowerCase();
          const bValue = fundSortField === 'fund_name' 
            ? (b.fund_name || '').toLowerCase() 
            : (b.isin_number || '').toLowerCase();
            
          return fundSortOrder === 'asc' 
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        } else {
          // For created_at
          const aValue = String(a.created_at).toLowerCase();
          const bValue = String(b.created_at).toLowerCase();
          return fundSortOrder === 'asc' 
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }
      });
  }, [funds, showInactive, searchQuery, fundSortField, fundSortOrder, fundStatusFilters, riskLevelFilters]);
  
  // Apply all filters for portfolios
  const filteredAndSortedPortfolios = useMemo(() => {
    // Start with all portfolios
    let filtered = portfolios;
    
    // Apply text search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(portfolio => 
        portfolio.name?.toLowerCase().includes(query)
      );
    }
    
    // Apply portfolio type filter
    if (portfolioTypeFilters.length > 0) {
      filtered = filtered.filter(portfolio => 
        portfolio.type && portfolioTypeFilters.includes(portfolio.type)
      );
    }
    
    // Apply risk range filter
    if (riskRangeFilters.length > 0) {
      filtered = filtered.filter(portfolio => {
        const riskRange = getRiskRange(portfolio);
        return riskRangeFilters.includes(riskRange);
      });
    }
    
    // Sort portfolios
    return [...filtered].sort((a, b) => {
      let aValue = a[portfolioSortField] || 0;
      let bValue = b[portfolioSortField] || 0;
      
      // Special handling for calculated fields
      if (portfolioSortField === 'averageRisk') {
        aValue = a.weighted_risk || calculateAverageRisk(a);
        bValue = b.weighted_risk || calculateAverageRisk(b);
      }
      
      // Compare values
      if (aValue < bValue) {
        return portfolioSortOrder === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return portfolioSortOrder === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [
    portfolios, 
    searchQuery, 
    portfolioTypeFilters, 
    riskRangeFilters, 
    portfolioSortField, 
    portfolioSortOrder, 
    calculateAverageRisk
  ]);
  
  // Get unique statuses for filter options
  const providerStatusOptions = useMemo(() => {
    const statuses = new Set<string>();
    providers.forEach(provider => {
      if (provider.status) {
        statuses.add(provider.status);
      }
    });
    return Array.from(statuses).map(status => ({ value: status, label: status }));
  }, [providers]);
  
  // Get unique statuses for fund filter options
  const fundStatusOptions = useMemo(() => {
    const statuses = new Set<string>();
    funds.forEach(fund => {
      if (fund.status) {
        statuses.add(fund.status);
      }
    });
    return Array.from(statuses).map(status => ({ value: status, label: status }));
  }, [funds]);
  
  // Risk level options for funds
  const riskLevelOptions = useMemo(() => [
    { value: 'Unrated', label: 'Unrated' },
    { value: 'Low', label: 'Low Risk (0-3)' },
    { value: 'Medium', label: 'Medium Risk (3-5)' },
    { value: 'High', label: 'High Risk (5-7)' },
    { value: 'Very High', label: 'Very High Risk (7+)' }
  ], []);
  
  // Risk range filter options for portfolios
  const riskRangeOptions = useMemo(() => [
    { value: '0-3', label: 'Low Risk (0-3)' },
    { value: '3-5', label: 'Medium-Low Risk (3-5)' },
    { value: '5-7', label: 'Medium-High Risk (5-7)' },
    { value: '7+', label: 'High Risk (7+)' }
  ], []);

  // Display weighted risk with N/A for missing data
  const displayWeightedRisk = useCallback((portfolio: Portfolio) => {
    if (!portfolio.funds || portfolio.funds.length === 0) {
      return (
        <div className="text-sm text-gray-600 font-sans">
          <span>N/A</span>
          <span className="ml-2 text-xs text-gray-500">
            (No fund data)
          </span>
        </div>
      );
    }

    const weightedRisk = portfolio.weighted_risk || portfolio.averageRisk || 0;

    return (
      <div className="text-sm text-gray-600 font-sans group relative">
        <div className="flex items-center">
          <span>{weightedRisk.toFixed(1)}</span>
          <span className={`ml-1 ${
            weightedRisk < 3 ? 'text-green-600' : 
            weightedRisk < 5 ? 'text-blue-600' : 
            weightedRisk < 7 ? 'text-yellow-600' : 
            'text-red-600'
          }`}>●</span>
          <span className="ml-2 text-xs text-gray-500">({portfolio.allocation_count || portfolio.funds.length} funds)</span>
        </div>
        <div className="absolute hidden group-hover:block bg-gray-800 text-white text-xs rounded p-2 mt-1 w-64 z-10">
          Weighted average risk factor calculated from {portfolio.allocation_count || portfolio.funds.length} funds in this portfolio
        </div>
      </div>
    );
  }, []);

  // Extract unique portfolio types and risk levels for filters
  const portfolioTypeOptions = useMemo(() => {
    const uniqueTypes = new Set<string>();
    portfolios.forEach(portfolio => {
      if (portfolio.type) {
        uniqueTypes.add(portfolio.type);
      }
    });
    return Array.from(uniqueTypes).map(type => ({ value: type, label: type }));
  }, [portfolios]);

  return (
    <DefinitionsContext.Provider value={contextValue}>
    <div className="container mx-auto px-4 py-3">
      <div className="flex justify-between items-center mb-3">
        <h1 className="text-3xl font-normal text-gray-900 font-sans tracking-wide">Definitions</h1>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="form-checkbox h-5 w-5 text-blue-600"
                aria-label="Show inactive items"
            />
            <span>Show Inactive</span>
          </label>
          <button
            onClick={handleAddNew}
            className="bg-primary-700 text-white px-4 py-1.5 rounded-xl font-medium hover:bg-primary-800 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-700 focus:ring-offset-2 shadow-sm flex items-center gap-1"
              aria-label={`Add new ${activeTab.slice(0, -1)}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add {activeTab.slice(0, -1)}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6">
          <nav className="flex space-x-2 px-2 py-2 bg-gray-50 rounded-lg" role="tablist">
          <button
            onClick={() => setActiveTab('providers')}
            className={`${
              activeTab === 'providers'
                ? 'bg-primary-700 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
            } rounded-lg px-4 py-2 font-medium text-base transition-all duration-200 ease-in-out`}
              role="tab"
              aria-selected={activeTab === 'providers'}
              aria-controls="providers-panel"
              id="providers-tab"
          >
            Providers
          </button>
          <button
            onClick={() => setActiveTab('funds')}
            className={`${
              activeTab === 'funds'
                ? 'bg-primary-700 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
            } rounded-lg px-4 py-2 font-medium text-base transition-all duration-200 ease-in-out`}
              role="tab"
              aria-selected={activeTab === 'funds'}
              aria-controls="funds-panel"
              id="funds-tab"
          >
            Funds
          </button>
          <button
            onClick={() => setActiveTab('portfolio-templates')}
            className={`${
              activeTab === 'portfolio-templates'
                  ? 'bg-primary-700 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
              } rounded-lg px-4 py-2 font-medium text-base transition-all duration-200 ease-in-out`}
              role="tab"
              aria-selected={activeTab === 'portfolio-templates'}
              aria-controls="portfolios-panel"
              id="portfolios-tab"
          >
            Portfolios
          </button>
        </nav>
      </div>

      {/* Search and Sort Controls */}
      <div className="flex flex-col sm:flex-row gap-3 mb-3">
        <div className="flex-1">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${activeTab}...`}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-primary-700 focus:border-primary-700 transition-colors duration-200"
                aria-label={`Search ${activeTab}`}
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Panels */}
      <div id="providers-panel" role="tabpanel" aria-labelledby="providers-tab">
        <TabTransition isVisible={activeTab === 'providers'}>
      <div className="bg-white shadow rounded-lg overflow-hidden">
            {providersLoading ? (
              <div className="p-6">
                <TableSkeleton columns={3} />
              </div>
            ) : providersError ? (
              <div className="p-6">
                <ErrorDisplay message={providersError} />
              </div>
            ) : filteredAndSortedProviders.length === 0 ? (
              <div className="p-6">
                <EmptyState message="No providers found" />
              </div>
            ) : (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-100">
            <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300 w-1/4">Provider</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300 w-1/4">
                      <div className="flex flex-col items-start gap-1">
                        <span>Status</span>
                        <FilterDropdown
                          id="provider-status-filter"
                          options={providerStatusOptions}
                          value={providerStatusFilters}
                          onChange={setProviderStatusFilters}
                          placeholder="All Statuses"
                          className="mt-1"
                        />
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300 w-1/4 cursor-pointer hover:bg-indigo-50"
                      onClick={() => handleProviderSortChange('product_count')}
                    >
                      <div className="flex items-center">
                        <span>Products</span>
                        {providerSortField === 'product_count' && (
                          <span className="ml-1">
                            {providerSortOrder === 'asc' ? '↑' : '↓'}
                          </span>
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300 w-1/4">Last Updated</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAndSortedProviders.map(provider => (
                <tr 
                  key={provider.id} 
                  className="hover:bg-indigo-50 transition-colors duration-150 cursor-pointer border-b border-gray-100"
                  onClick={() => handleItemClick('providers', provider.id)}
                >
                  <td className="px-6 py-3 whitespace-nowrap">
                    <div className="flex items-center">
                      <div 
                        className="h-3 w-3 rounded-full mr-2 flex-shrink-0" 
                        style={{ backgroundColor: provider.theme_color || getProviderColor(provider.name) }}
                        aria-hidden="true"
                      ></div>
                      <div className="text-sm font-medium text-gray-800 font-sans tracking-tight">{provider.name}</div>
                    </div>
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap">
                    <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      provider.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {provider.status}
                    </span>
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap">
                    <div className="text-sm text-gray-600">
                      {provider.product_count !== undefined ? provider.product_count : 0}
                    </div>
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap">
                    <div className="text-sm text-gray-600">
                          {new Date(provider.created_at).toLocaleDateString()}
                    </div>
                  </td>
                </tr>
                  ))}
          </tbody>
        </table>
          </div>
          )}
        </div>
      </TabTransition>
    </div>

    <div id="funds-panel" role="tabpanel" aria-labelledby="funds-tab">
      <TabTransition isVisible={activeTab === 'funds'}>
    <div className="bg-white shadow rounded-lg overflow-hidden">
          {fundsLoading ? (
            <div className="p-6">
              <TableSkeleton columns={5} />
            </div>
          ) : fundsError ? (
            <div className="p-6">
              <ErrorDisplay message={fundsError} />
            </div>
          ) : filteredAndSortedFunds.length === 0 ? (
            <div className="p-6">
              <EmptyState message="No funds found" />
            </div>
          ) : (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-100">
          <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300 w-1/5">Name</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300 w-1/5">ISIN</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300 w-1/5">
                    <div className="flex flex-col items-start gap-1">
                      <span>Risk Factor</span>
                      <FilterDropdown
                        id="risk-level-filter"
                        options={riskLevelOptions}
                        value={riskLevelFilters}
                        onChange={setRiskLevelFilters}
                        placeholder="All Risk Levels"
                        className="mt-1"
                      />
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300 w-1/5">Fund Cost</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300 w-1/5">
                    <div className="flex flex-col items-start gap-1">
                      <span>Status</span>
                      <FilterDropdown
                        id="fund-status-filter"
                        options={fundStatusOptions}
                        value={fundStatusFilters}
                        onChange={setFundStatusFilters}
                        placeholder="All Statuses"
                        className="mt-1"
                      />
                    </div>
                  </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAndSortedFunds.map(fund => (
                    <tr 
                      key={fund.id} 
                  className="hover:bg-indigo-50 transition-colors duration-150 cursor-pointer border-b border-gray-100"
                      onClick={() => handleItemClick('funds', fund.id)}
                >
                  <td className="px-6 py-3 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-800 font-sans tracking-tight">{fund.fund_name}</div>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-600 font-sans">{fund.isin_number || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-600 font-sans">{fund.risk_factor !== null ? fund.risk_factor : 'N/A'}</div>
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-600 font-sans">
                          {fund.fund_cost !== null ? `${fund.fund_cost.toFixed(1)}%` : 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap">
                    <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          fund.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                          {fund.status}
                    </span>
                  </td>
                </tr>
                  ))}
        </tbody>
      </table>
          </div>
          )}
        </div>
      </TabTransition>
    </div>

    <div id="portfolios-panel" role="tabpanel" aria-labelledby="portfolios-tab">
      <TabTransition isVisible={activeTab === 'portfolio-templates'}>
    <div className="bg-white shadow rounded-lg overflow-hidden">
          {portfoliosLoading ? (
            <div className="p-6">
              <TableSkeleton columns={3} />
            </div>
          ) : portfoliosError ? (
            <div className="p-6">
              <ErrorDisplay message={portfoliosError} />
            </div>
          ) : filteredAndSortedPortfolios.length === 0 ? (
            <div className="p-6">
              <EmptyState message="No portfolio templates found" />
            </div>
          ) : (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300 w-1/3">Name</th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300 w-1/3">
              <div className="flex flex-col items-start gap-1">
                <span>Weighted Risk</span>
                <FilterDropdown
                  id="risk-range-filter"
                  options={riskRangeOptions}
                  value={riskRangeFilters}
                  onChange={setRiskRangeFilters}
                  placeholder="All Risk Ranges"
                  className="mt-1"
                />
              </div>
            </th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300 w-1/3">
              <div className="flex items-center cursor-pointer" onClick={() => handlePortfolioSortChange('portfolioCount')}>
                <span>Portfolio Count</span>
                {portfolioSortField === 'portfolioCount' && (
                  <span className="ml-1">
                    {portfolioSortOrder === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </div>
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAndSortedPortfolios.map(portfolio => (
                    <tr 
                      key={portfolio.id} 
                      className="hover:bg-indigo-50 transition-colors duration-150 cursor-pointer border-b border-gray-100"
                      onClick={() => handleItemClick('portfolio-templates', portfolio.id)}
                    >
                      <td className="px-6 py-3 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-800 font-sans tracking-tight">{portfolio.name}</div>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        {displayWeightedRisk(portfolio)}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-600 font-sans">{portfolio.portfolioCount || 0}</div>
                      </td>
                    </tr>
                  ))}
        </tbody>
      </table>
          </div>
          )}
        </div>
      </TabTransition>
          </div>
        </div>
</DefinitionsContext.Provider>
);
};

export default Definitions;
