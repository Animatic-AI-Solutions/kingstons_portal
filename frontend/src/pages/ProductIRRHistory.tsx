import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getFundIRRValues, getBatchFundIRRValues, calculateStandardizedMultipleFundsIRR, getPortfolioHistoricalIRR } from '../services/api';

interface Account {
  id: number;
  client_product_id: number;
  client_id: number;
  client_name: string;
  product_name: string;
  status: string;
  start_date: string;
  end_date?: string;
  irr?: number;
  total_value?: number;
  provider_name?: string;
  product_type?: string;
  portfolio_id?: number;
  portfolio_name?: string;
}

interface Holding {
  id: number;
  fund_name?: string;
  irr?: number;
  portfolio_fund_id: number;
  status?: string;
  end_date?: string;
}

interface ActivityLog {
  id: number;
  product_id: number;
  portfolio_fund_id: number;
  activity_timestamp: string;
  activity_type: string;
  amount: number;
}

interface IrrCalculationDetail {
  portfolio_fund_id: number;
  status: 'calculated' | 'skipped' | 'error';
  message: string;
  irr_value?: number;
  existing_irr?: number;
  date_info?: string;
}

interface IrrCalculationResult {
  portfolio_id: number;
  calculation_date: string;
  total_funds: number;
  successful: number;
  skipped: number;
  failed: number;
  details: IrrCalculationDetail[];
}

interface IRRValue {
  id: number;
  fund_id: number;
  irr: number;
  date: string;
  created_at: string;
  fund_valuation_id?: number;
}

interface IRRTableData {
  [portfolioFundId: string]: {
    fundName: string;
    values: {
      [monthYear: string]: number;
    };
    isPreviousFunds?: boolean;
  };
}

// Interfaces for the new aggregated data structure
interface AggregatedIRRData {
  columns: string[];  // Array of month/year strings
  funds: {
    id: number;
    name: string;
    details?: {
      risk_level?: number;
      fund_type?: string;
      weighting?: number;
      start_date?: string;
      status?: string;
      available_fund?: {
        id: number;
        name: string;
        description?: string;
        provider?: string;
      };
    };
    values: {
      [monthYear: string]: number;  // Map of month/year to IRR value
    };
  }[];
  portfolio_info?: {
    id: number;
    portfolio_name: string;
    target_risk_level?: number;
  };
  portfolio_irr?: {
    [monthYear: string]: number;  // Portfolio IRR values by month/year
  };
}

// Helper function to convert ActivityLog[] to Activity[]
const convertActivityLogs = (logs: ActivityLog[]): any[] => {
  return logs.map(log => ({
    ...log,
    amount: log.amount.toString() // Convert number to string
  }));
};

// Add this new function to filter activity logs by year
const filterActivitiesByYear = (activities: ActivityLog[], year: number): ActivityLog[] => {
  return activities.filter(activity => {
    const activityDate = new Date(activity.activity_timestamp);
    return activityDate.getFullYear() === year;
  });
};

// Helper function to filter inactive holdings
const filterInactiveHoldings = (holdings: Holding[]): Holding[] => {
  return holdings.filter(holding => {
    // Check if the holding has an end_date (explicitly ended)
    if (holding.end_date) {
      return true;
    }
    
    // Check if the holding status is inactive
    if (holding.status && holding.status !== 'active') {
      return true;
    }
    
    return false;
  });
};

// Helper function to filter active holdings
const filterActiveHoldings = (holdings: Holding[]): Holding[] => {
  return holdings.filter(holding => {
    // Check if the holding has no end_date and status is active
    return !holding.end_date && (!holding.status || holding.status === 'active');
  });
};

// Format date to display month and year
const formatMonthYear = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleString('default', { month: 'short', year: 'numeric' });
};

interface AccountIRRHistoryProps {
  accountId?: string;
}

const AccountIRRHistory: React.FC<AccountIRRHistoryProps> = ({ accountId: propAccountId }) => {
  const { accountId: paramAccountId } = useParams<{ accountId: string }>();
  const accountId = propAccountId || paramAccountId;
  const navigate = useNavigate();
  const { api } = useAuth();
  const [account, setAccount] = useState<Account | null>(null);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [irrCalculationResult, setIrrCalculationResult] = useState<IrrCalculationResult | null>(null);
  const [irrHistoryData, setIrrHistoryData] = useState<IRRTableData>({});
  const [irrTableColumns, setIrrTableColumns] = useState<string[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [portfolioIRRData, setPortfolioIRRData] = useState<{[monthYear: string]: number}>({});
  const [previousFundsIRRData, setPreviousFundsIRRData] = useState<{[monthYear: string]: number}>({});
  const [isLoadingPreviousFunds, setIsLoadingPreviousFunds] = useState(false);
  const [showInactiveFundsBreakdown, setShowInactiveFundsBreakdown] = useState(false);
  const [inactiveFundsIRRData, setInactiveFundsIRRData] = useState<IRRTableData>({});

  useEffect(() => {
    if (accountId) {
      console.log('AccountIRRHistory: Fetching data for accountId:', accountId);
      fetchData(accountId);
    } else {
      console.error('AccountIRRHistory: No accountId available for data fetching');
    }
  }, [accountId, api]);

  const fetchData = async (accountId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('AccountIRRHistory: Making API request to complete endpoint for product data');
      
      // Use the same optimized endpoint as ProductOverview that returns all data in one request
      const completeProductResponse = await api.get(`/api/client_products/${accountId}/complete`);
      const completeData = completeProductResponse.data;
      
      console.log('AccountIRRHistory: Complete product data received:', completeData);
      
      // Get the portfolio_id from the complete data
      const portfolioId = completeData.portfolio_id;
      
      if (!portfolioId) {
        console.warn('AccountIRRHistory: No portfolio ID found for this account');
        setError('No portfolio is associated with this product. Please assign a portfolio first.');
        // Set account even if there's an error so we can show product info
        setAccount(completeData);
        setIsLoading(false);
        return;
      }
      
      // Set account data with portfolio information
      setAccount(completeData);
      
      // Fetch portfolio funds and calculate standardized IRR history
      try {
        setIsLoadingHistory(true);
        
        console.log('Processing portfolio funds for standardized IRR history calculation:', portfolioId);
        
        // Get portfolio funds from the complete data (includes fund names)
        const portfolioFunds = completeData.portfolio_funds || [];
        
        // 🔍 DEBUG: Log all portfolio funds from API
        console.log('🔍 DEBUG: ProductIRRHistory all portfolio funds from API:');
        portfolioFunds.forEach((pf: any, index: number) => {
          console.log(`🔍 DEBUG: ProductIRRHistory Fund ${index + 1}: ID=${pf.id}, Name=${pf.fund_name}, Status=${pf.status || 'active'}`);
        });
        
        if (portfolioFunds.length === 0) {
          console.warn('No portfolio funds found for this portfolio');
          setHoldings([]);
          setIrrHistoryData({});
          setIrrTableColumns([]);
          setPortfolioIRRData({});
          setPreviousFundsIRRData({});
          setInactiveFundsIRRData({});
          setIsLoadingHistory(false);
          setIsLoading(false);
          return;
        }
        
        // Process holdings from portfolio funds
        const processedHoldings = portfolioFunds.map((pf: any) => ({
          id: pf.id,
          fund_name: pf.fund_name || 'Unknown Fund',
          irr: undefined,
          portfolio_fund_id: pf.id,
          status: pf.status,
          end_date: pf.end_date
        }));
        
        setHoldings(processedHoldings);
        
        // Filter active and inactive holdings
        const activeHoldings = filterActiveHoldings(processedHoldings);
        const inactiveHoldings = filterInactiveHoldings(processedHoldings);
        
        console.log(`Found ${activeHoldings.length} active holdings and ${inactiveHoldings.length} inactive holdings`);
        
        // Get all unique valuation dates across all funds
        const allValuationDates = new Set<string>();
        const fundValuationMap = new Map<number, string[]>(); // fund_id -> array of valuation dates
        
        for (const fund of portfolioFunds) {
          try {
            const valuationResponse = await api.get(`/fund_valuations?portfolio_fund_id=${fund.id}&order=valuation_date.desc&limit=100000`);
            const valuations = valuationResponse.data || [];
            
            const fundDates = valuations.map((v: any) => v.valuation_date.split('T')[0]); // Extract YYYY-MM-DD
            fundValuationMap.set(fund.id, fundDates);
            
            fundDates.forEach((date: string) => allValuationDates.add(date));
          } catch (err) {
            console.warn(`Could not get valuations for fund ${fund.id}:`, err);
            fundValuationMap.set(fund.id, []);
          }
        }
        
        // Convert to sorted array (most recent first)
        const sortedDates = Array.from(allValuationDates).sort((a, b) => b.localeCompare(a));
        
        // Get all available IRR dates from our enhanced endpoint instead of just valuation dates
        const allIRRDates = new Set<string>();
        
        try {
          const portfolioHistoricalResponse = await getPortfolioHistoricalIRR(parseInt(accountId));
          if (portfolioHistoricalResponse.data && portfolioHistoricalResponse.data.funds_historical_irr) {
            const fundsHistoricalIRRs = portfolioHistoricalResponse.data.funds_historical_irr;
            
            // Collect all unique IRR dates across all funds
            for (const fund of fundsHistoricalIRRs) {
              if (fund.historical_irr && fund.historical_irr.length > 0) {
                for (const irrRecord of fund.historical_irr) {
                  if (irrRecord.irr_result !== null && irrRecord.irr_date) {
                    allIRRDates.add(irrRecord.irr_date);
                  }
                }
              }
            }
          }
        } catch (err) {
          console.warn('Failed to fetch IRR dates, falling back to valuation dates:', err);
        }
        
        // Use IRR dates if available, otherwise fall back to valuation dates
        const availableDates = allIRRDates.size > 0 
          ? Array.from(allIRRDates).sort((a, b) => b.localeCompare(a)) // Most recent first
          : sortedDates;
        
        // For IRR history, we want to show all dates where we have IRR data, not just where all funds have data
        const commonDates = availableDates;
        
        console.log('Available IRR dates found:', commonDates);
        
        // Use all available dates for complete history
        const recentDates = commonDates;
        
        // Fetch stored portfolio IRR data from database instead of calculating in real-time
        const portfolioIRRResults: {[monthYear: string]: number} = {};
        
        try {
          console.log(`🔍 DEBUG: Fetching stored portfolio IRR data for product ${accountId}`);
          
          // Fetch all historical fund IRR data from the database (fixed endpoint)
          const portfolioHistoricalResponse = await getPortfolioHistoricalIRR(parseInt(accountId));
          
          if (portfolioHistoricalResponse.data && portfolioHistoricalResponse.data.funds_historical_irr) {
            const fundsHistoricalIRRs = portfolioHistoricalResponse.data.funds_historical_irr;
            
            console.log(`✅ Found ${fundsHistoricalIRRs.length} funds with stored IRR records`);
            
            // Get actual stored portfolio IRR values (not calculated averages)
            // First, we need to find the portfolio ID for this product
            // Use the portfolioId that was already extracted from completeData
            let portfolioIdForIRR: number | null = portfolioId;
            
            // Debug: Log the portfolio ID we're using
            console.log('🔍 DEBUG: Using portfolio ID for IRR lookup:', portfolioIdForIRR);
            
            // If portfolio_id is still not found, hardcode it for Product 14 as a temporary fix
            if (!portfolioIdForIRR && parseInt(accountId) === 14) {
              portfolioIdForIRR = 193; // We know from our investigation that Product 14 maps to Portfolio 193
              console.log('🔧 DEBUG: Using hardcoded portfolio ID 193 for Product 14');
            }
            
            if (portfolioIdForIRR && typeof portfolioIdForIRR === 'number' && portfolioIdForIRR > 0) {
              console.log(`🔍 Looking for stored portfolio IRR values for portfolio ${portfolioIdForIRR}`);
              
              // Get actual stored portfolio IRR values from portfolio_irr_values table
              try {
                // Import api service to get correct base URL for production
                const { default: api } = await import('../services/api');
                
                const response = await api.get(`/api/historical-irr/portfolio-irr-values/${portfolioIdForIRR}`);
                console.log(`📡 Successfully fetched portfolio IRR data for portfolio ${portfolioIdForIRR}`);
                
                const portfolioIRRData = response.data;
                console.log(`📡 Response status: ${response.status}, received ${portfolioIRRData?.length || 0} portfolio IRR records`);
                
                if (portfolioIRRData && portfolioIRRData.length > 0) {
                  for (const irrRecord of portfolioIRRData) {
                    if (irrRecord.irr_result !== null && irrRecord.date) {
                      const monthYear = formatMonthYear(irrRecord.date + 'T00:00:00Z');
                      portfolioIRRResults[monthYear] = irrRecord.irr_result;
                      console.log(`📊 Stored Portfolio IRR ${monthYear}: ${irrRecord.irr_result}%`);
                    }
                  }
                } else {
                  console.log('📊 No stored portfolio IRR values found - portfolio totals will be empty');
                }
              } catch (err: any) {
                console.error('Failed to fetch stored portfolio IRR values:', err);
                console.log('📊 Portfolio totals will be empty since no stored values are available');
                
                // Log more details about the error (axios error format)
                if (err.response) {
                  console.error('HTTP Error:', err.response.status, err.response.statusText);
                  console.error('Error data:', err.response.data);
                } else if (err.request) {
                  console.error('Network Error:', err.message);
                } else {
                  console.error('Error:', err.message);
                }
              }
            } else {
              console.warn('No valid portfolio ID found - cannot fetch stored portfolio IRR values');
              console.warn('portfolioIdForIRR value:', portfolioIdForIRR, 'type:', typeof portfolioIdForIRR);
            }
            
          } else {
            console.warn('⚠️ No stored fund IRR data found');
          }
        } catch (err) {
          console.error('❌ Failed to fetch stored portfolio IRR data:', err);
        }
        
        // Set the portfolio IRR data
        console.log(`🔍 DEBUG: Portfolio IRR fetch complete. Setting ${Object.keys(portfolioIRRResults).length} results:`, portfolioIRRResults);
        setPortfolioIRRData(portfolioIRRResults);
        
        // Calculate Previous Funds IRR for each common date if there are inactive holdings
        const previousFundsIRRResults: {[monthYear: string]: number} = {};
        if (inactiveHoldings.length > 0) {
          setIsLoadingPreviousFunds(true);
          console.log(`Calculating Previous Funds IRR for ${inactiveHoldings.length} inactive funds`);
          
          const inactiveFundIds = inactiveHoldings.map(h => h.portfolio_fund_id);
          
          for (const date of recentDates) {
            try {
              console.log(`Calculating Previous Funds IRR for date: ${date}`);
              
              const irrResponse = await calculateStandardizedMultipleFundsIRR({
                portfolioFundIds: inactiveFundIds,
                irrDate: date
              });
              
              const irrPercentage = irrResponse.data.irr_percentage;
              const monthYear = formatMonthYear(date + 'T00:00:00Z');
              previousFundsIRRResults[monthYear] = irrPercentage;
              
              console.log(`Previous Funds IRR for ${date}: ${irrPercentage}%`);
            } catch (err) {
              console.warn(`Failed to calculate Previous Funds IRR for date ${date}:`, err);
            }
          }
          setIsLoadingPreviousFunds(false);
        }
        
        // Set the previous funds IRR data
        setPreviousFundsIRRData(previousFundsIRRResults);
        
        // Fetch individual inactive fund IRR data for breakdown from database
        const inactiveFundsData: IRRTableData = {};
        if (inactiveHoldings.length > 0) {
          for (const holding of inactiveHoldings) {
            try {
              console.log(`Fetching stored IRR values for inactive fund ${holding.fund_name} (portfolio_fund_id: ${holding.portfolio_fund_id})`);
              // Get stored IRR values for this inactive fund from portfolio_fund_irr_values table
              const irrResponse = await getFundIRRValues(holding.portfolio_fund_id);
              const irrValues = irrResponse.data || [];
              
              console.log(`Found ${irrValues.length} IRR values for inactive fund ${holding.fund_name}:`, irrValues);
              
              const fundValues: {[monthYear: string]: number} = {};
              
              irrValues.forEach((irr: any) => {
                const monthYear = formatMonthYear(irr.date);
                fundValues[monthYear] = parseFloat(irr.irr);
                console.log(`Added IRR value for ${holding.fund_name} on ${monthYear}: ${irr.irr}%`);
              });
              
              inactiveFundsData[holding.portfolio_fund_id] = {
                fundName: holding.fund_name || `Inactive Fund ${holding.portfolio_fund_id}`,
                values: fundValues
              };
            } catch (err) {
              console.warn(`Failed to fetch IRR values for inactive fund ${holding.fund_name}:`, err);
              inactiveFundsData[holding.portfolio_fund_id] = {
                fundName: holding.fund_name || `Inactive Fund ${holding.portfolio_fund_id}`,
                values: {}
              };
            }
          }
        }
        
        // Set the inactive funds IRR data
        setInactiveFundsIRRData(inactiveFundsData);
        
        // Create columns from the recent dates
        const columns = recentDates.map((date: string) => formatMonthYear(date + 'T00:00:00Z'));
        setIrrTableColumns(columns);
        
        // For individual fund IRR values, we'll use the data from the funds historical IRR endpoint
        // This is more efficient than making individual API calls for each fund
        const tableData: IRRTableData = {};
        
        // Add active funds using data from the funds historical IRR response
        let fundsHistoricalIRRs: any[] = [];
        try {
          const portfolioHistoricalResponse = await getPortfolioHistoricalIRR(parseInt(accountId));
          if (portfolioHistoricalResponse.data && portfolioHistoricalResponse.data.funds_historical_irr) {
            fundsHistoricalIRRs = portfolioHistoricalResponse.data.funds_historical_irr;
          }
        } catch (err) {
          console.warn('Failed to fetch funds historical IRR for individual fund data:', err);
        }

        for (const fund of activeHoldings) {
          const fundValues: {[monthYear: string]: number} = {};
          
          // Find this fund in the historical IRR response
          const fundHistoricalData = fundsHistoricalIRRs.find(
            (f: any) => f.portfolio_fund_id === fund.id
          );
          
          if (fundHistoricalData && fundHistoricalData.historical_irr) {
            fundHistoricalData.historical_irr.forEach((irr: any) => {
              if (irr.irr_result !== null && irr.irr_date) {
                const monthYear = formatMonthYear(irr.irr_date + 'T00:00:00Z');
                fundValues[monthYear] = parseFloat(irr.irr_result);
              }
            });
            console.log(`📊 Loaded ${Object.keys(fundValues).length} IRR values for fund: ${fund.fund_name}`);
          }
          
          tableData[fund.id] = {
            fundName: fund.fund_name || 'Unknown Fund',
            values: fundValues
          };
        }
        
        // Add Previous Funds entry if there are inactive holdings
        if (inactiveHoldings.length > 0) {
          tableData['previous_funds'] = {
            fundName: 'Previous Funds',
            values: previousFundsIRRResults,
            isPreviousFunds: true
          };
        }
        
        setIrrHistoryData(tableData);
        setIsLoadingHistory(false);
      } catch (err) {
        console.error('Error fetching standardized IRR history:', err);
        setError(`Error loading IRR history: ${(err as any).message || 'Unknown error'}`);
        setIsLoadingHistory(false);
        setIsLoadingPreviousFunds(false);
      }
      
      setIsLoading(false);
    } catch (err: any) {
      console.error('AccountIRRHistory: Error fetching data:', err);
      setError(`Error loading data: ${err.message || 'Unknown error'}`);
      setIsLoading(false);
    }
  };

  // Add wrapper function for refreshing data without parameters
  const refreshData = () => {
    if (accountId) {
      console.log('DEBUG - Starting data refresh after activities updated');
      
      // Force a small delay to ensure backend operations have completed
      setTimeout(() => {
        console.log('DEBUG - Executing fetchData after delay');
        fetchData(accountId)
          .then(() => console.log('DEBUG - Data refresh completed successfully'))
          .catch(err => console.error('DEBUG - Error during data refresh:', err));
      }, 500);
    } else {
      console.warn('DEBUG - Cannot refresh data: accountId is missing');
    }
  };

  // Format date only
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Format percentage value with smart decimal places (removes unnecessary zeros)
  const formatPercentage = (value: number | undefined, maxDecimalPlaces: number = 2, forceDecimalPlaces: boolean = false): string => {
    if (value === undefined || value === null) return 'N/A';
    
    if (forceDecimalPlaces) {
      // Always show the specified number of decimal places
      return `${value.toFixed(maxDecimalPlaces)}%`;
    } else {
      // Format to the maximum decimal places, then remove trailing zeros
      const formatted = value.toFixed(maxDecimalPlaces);
      const withoutTrailingZeros = parseFloat(formatted).toString();
      return `${withoutTrailingZeros}%`;
    }
  };

  // Format activity type for display - convert camelCase or snake_case to spaces
  const formatActivityType = (activityType: string): string => {
    if (!activityType) return '';
    
    // Replace underscores with spaces
    let formatted = activityType.replace(/_/g, ' ');
    
    // Add spaces between camelCase words
    formatted = formatted.replace(/([a-z])([A-Z])/g, '$1 $2');
    
    // Capitalize first letter of each word
    return formatted
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-16">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600"></div>
      </div>
    );
  }

  if (error || !account) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4 mt-8">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-red-700 text-base">
              {error || 'Failed to load account details. Please try again later.'}
            </p>
            <button
              onClick={() => navigate('/accounts')}
              className="mt-2 text-red-700 underline"
            >
              Return to Accounts
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">IRR History</h2>
      
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900">Monthly IRR Values</h3>
        {isLoadingPreviousFunds && (
          <div className="text-sm text-gray-600 mt-2">
            <span className="inline-flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Calculating Previous Funds IRR...
            </span>
          </div>
        )}
      </div>
      
      {irrCalculationResult && (
        <div className={`px-4 py-3 rounded-md mb-4 ${
          irrCalculationResult.failed > 0 ? 'bg-yellow-100 border border-yellow-400' : 'bg-green-100 border border-green-400'
        }`}>
          <p className="text-sm font-medium">
            IRR calculation complete for {irrCalculationResult.total_funds} funds on {new Date(irrCalculationResult.calculation_date).toLocaleDateString()}.
            {irrCalculationResult.successful > 0 && ` Successfully calculated ${irrCalculationResult.successful} new IRR values.`}
            {irrCalculationResult.skipped > 0 && ` Skipped ${irrCalculationResult.skipped} funds with existing IRR values.`}
            {irrCalculationResult.failed > 0 && ` Failed to calculate ${irrCalculationResult.failed} IRR values.`}
          </p>
          
          {/* Display detailed errors for failed calculations */}
          {irrCalculationResult.failed > 0 && (
            <div className="mt-2 text-sm">
              <p className="font-medium text-red-700">Error details:</p>
              <ul className="list-disc pl-5 mt-1 space-y-1">
                {irrCalculationResult.details
                  .filter((detail: IrrCalculationDetail) => detail.status === 'error')
                  .map((detail: IrrCalculationDetail, index: number) => (
                    <li key={index} className="text-red-700">
                      <span className="font-medium">Fund ID {detail.portfolio_fund_id}:</span> {detail.message}
                      {detail.date_info && <span className="block mt-1 text-xs"> ({detail.date_info})</span>}
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </div>
      )}
      
      {/* IRR History Table */}
      <div className="mt-4 mb-8">
        {isLoadingHistory ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <span className="ml-2 text-gray-600">Loading IRR history...</span>
          </div>
        ) : Object.keys(irrHistoryData).length === 0 ? (
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-700">
                  No IRR history data available.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                    Fund
                  </th>
                  {irrTableColumns.map(monthYear => (
                    <th key={monthYear} scope="col" className="px-3 py-2 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      {monthYear}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Object.entries(irrHistoryData)
                  .sort(([fundIdA, fundA], [fundIdB, fundB]) => {
                    const fundAName = fundA.fundName || '';
                    const fundBName = fundB.fundName || '';

                    // Previous Funds should come after all other funds but before Cash
                    const aIsPreviousFunds = fundA.isPreviousFunds;
                    const bIsPreviousFunds = fundB.isPreviousFunds;
                    const aIsCash = fundAName === 'Cash';
                    const bIsCash = fundBName === 'Cash';

                    if (aIsCash && !bIsCash) return 1; // A (Cash) comes last
                    if (!aIsCash && bIsCash) return -1; // B (Cash) comes last
                    if (aIsPreviousFunds && !bIsPreviousFunds && !bIsCash) return 1; // A (Previous Funds) comes after regular funds
                    if (!aIsPreviousFunds && bIsPreviousFunds && !aIsCash) return -1; // B (Previous Funds) comes after regular funds
                    
                    // If both are the same type or neither are special, sort alphabetically by name
                    return fundAName.localeCompare(fundBName);
                  })
                  .map(([fundId, fund]) => (
                  <React.Fragment key={fundId}>
                    <tr className={fund.isPreviousFunds ? 'bg-blue-50' : ''}>
                      <td className={`px-3 py-2 whitespace-nowrap text-sm font-medium sticky left-0 z-10 ${
                        fund.isPreviousFunds ? 'text-blue-800 bg-blue-50' : 'text-gray-900 bg-white'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div>
                            {fund.fundName}
                            {fund.isPreviousFunds && (
                              <div className="text-xs text-blue-600 font-normal">
                                Aggregated inactive funds ({Object.keys(inactiveFundsIRRData).length} inactive {Object.keys(inactiveFundsIRRData).length === 1 ? 'fund' : 'funds'})
                              </div>
                            )}
                          </div>
                          {fund.isPreviousFunds && Object.keys(inactiveFundsIRRData).length > 0 && (
                            <button
                              onClick={() => setShowInactiveFundsBreakdown(!showInactiveFundsBreakdown)}
                              className="ml-2 px-2 py-1 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 rounded border border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                              title={showInactiveFundsBreakdown ? "Hide inactive funds breakdown" : "Show inactive funds breakdown"}
                            >
                              {showInactiveFundsBreakdown ? "Hide" : "Show"} Breakdown
                            </button>
                          )}
                        </div>
                      </td>
                      {irrTableColumns.map(monthYear => {
                        const irrValue = fund.values[monthYear];
                        const irrClass = irrValue !== undefined
                          ? irrValue === 0
                            ? 'text-gray-400'  // 0.0% gets gray color
                            : irrValue > 0 
                              ? 'text-green-600'  // Positive values get green
                              : 'text-red-600'    // Negative values get red
                          : 'text-gray-400';     // Undefined/null gets gray
                        
                        return (
                          <td key={`${fundId}-${monthYear}`} className="px-3 py-2 whitespace-nowrap text-sm text-right">
                            <span className={irrClass}>
                              {formatPercentage(irrValue, 1, true)}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                    
                    {/* Show individual inactive funds breakdown if enabled and this is the Previous Funds row */}
                    {fund.isPreviousFunds && showInactiveFundsBreakdown && Object.entries(inactiveFundsIRRData).map(([inactiveFundId, inactiveFund]) => (
                      <tr key={`inactive-${inactiveFundId}`} className="bg-gray-50 border-t border-dashed border-gray-300">
                        <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-600 bg-gray-50 sticky left-0 z-10 pl-8">
                          {inactiveFund.fundName}
                          <div className="text-xs text-gray-500 font-normal">
                            Individual inactive fund
                          </div>
                        </td>
                        {irrTableColumns.map(monthYear => {
                          const irrValue = inactiveFund.values[monthYear];
                          const irrClass = irrValue !== undefined
                            ? irrValue === 0
                              ? 'text-gray-400'  // 0.0% gets gray color
                              : irrValue > 0 
                                ? 'text-green-600'  // Positive values get green
                                : 'text-red-600'    // Negative values get red
                            : 'text-gray-400';     // Undefined/null gets gray
                          
                          return (
                            <td key={`inactive-${inactiveFundId}-${monthYear}`} className="px-3 py-2 whitespace-nowrap text-sm text-right bg-gray-50">
                              <span className={irrClass}>
                                {formatPercentage(irrValue, 1, true)}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
                
                {/* Portfolio IRR Total Row - Always show if we have columns */}
                {irrTableColumns.length > 0 && (
                  <tr className="bg-gray-50 border-t-2 border-gray-300">
                    <td className="px-3 py-2 whitespace-nowrap text-base font-bold text-red-600 sticky left-0 bg-gray-50 z-10">
                      PORTFOLIO TOTAL
                    </td>
                    {irrTableColumns.map(monthYear => {
                      const portfolioIrrValue = portfolioIRRData[monthYear];
                      
                      // Show loading state if we're still loading and have no data
                      const isLoadingThisMonth = isLoadingHistory && portfolioIrrValue === undefined;
                      
                      const irrClass = portfolioIrrValue !== undefined
                        ? portfolioIrrValue >= 0 
                          ? 'text-green-700 font-bold'  // 0.0% and positive values get green (bold)
                          : 'text-red-700 font-bold'    // Negative values get red (bold)
                        : isLoadingThisMonth
                          ? 'text-gray-500'              // Loading state
                          : 'text-gray-400';             // No data available
                      
                      return (
                        <td key={`portfolio-${monthYear}`} className="px-3 py-2 whitespace-nowrap text-sm text-right">
                          <span className={irrClass}>
                            {isLoadingThisMonth ? (
                              <div className="flex items-center justify-end">
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-400"></div>
                              </div>
                            ) : (
                              formatPercentage(portfolioIrrValue, 1, true)
                            )}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AccountIRRHistory;