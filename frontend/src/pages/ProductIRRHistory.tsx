import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getFundIRRValues, getBatchFundIRRValues, calculateStandardizedMultipleFundsIRR } from '../services/api';

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
            const valuationResponse = await api.get(`/fund_valuations?portfolio_fund_id=${fund.id}&order=valuation_date.desc`);
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
        
        // Find dates where ALL funds have valuations
        const commonDates: string[] = [];
        for (const date of sortedDates) {
          const allFundsHaveValuation = portfolioFunds.every((fund: any) => {
            const fundDates = fundValuationMap.get(fund.id) || [];
            return fundDates.some((fundDate: string) => fundDate <= date); // Fund has valuation on or before this date
          });
          
          if (allFundsHaveValuation) {
            commonDates.push(date);
          }
        }
        
        console.log('Common valuation dates for portfolio IRR calculation:', commonDates);
        
        // Calculate portfolio IRR for each common date
        const portfolioIRRResults: {[monthYear: string]: number} = {};
        const portfolioFundIds = portfolioFunds.map((pf: any) => pf.id);
        console.log('🔍 DEBUG: ProductIRRHistory portfolioFundIds being sent to IRR API:', portfolioFundIds);
        
        // Limit to last 24 months for performance
        const recentDates = commonDates.slice(0, 24);
        
        for (const date of recentDates) {
          try {
            console.log(`Calculating portfolio IRR for date: ${date}`);
            
            const irrResponse = await calculateStandardizedMultipleFundsIRR({
              portfolioFundIds,
              irrDate: date
            });
            
            const irrPercentage = irrResponse.data.irr_percentage;
            const monthYear = formatMonthYear(date + 'T00:00:00Z'); // Add time for proper date parsing
            portfolioIRRResults[monthYear] = irrPercentage;
            
            console.log(`Portfolio IRR for ${date}: ${irrPercentage}%`);
          } catch (err) {
            console.warn(`Failed to calculate portfolio IRR for date ${date}:`, err);
          }
        }
        
        // Set the portfolio IRR data
        setPortfolioIRRData(portfolioIRRResults);
        
        // Calculate Previous Funds IRR for each common date if there are inactive holdings
        const previousFundsIRRResults: {[monthYear: string]: number} = {};
        if (inactiveHoldings.length > 0) {
          setIsLoadingPreviousFunds(true);
          console.log(`Calculating Previous Funds IRR for ${inactiveHoldings.length} inactive funds`);
          
          const inactiveFundIds = inactiveHoldings.map(h => h.id);
          
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
        
        // Create columns from the dates we calculated
        const columns = recentDates.map((date: string) => formatMonthYear(date + 'T00:00:00Z'));
        setIrrTableColumns(columns);
        
        // For individual fund IRR values, we'll use the existing IRR values from the database
        // This maintains compatibility with the existing IRR calculation and storage system
        const tableData: IRRTableData = {};
        
        // Add active funds
        for (const fund of activeHoldings) {
          try {
            // Get stored IRR values for this fund
            const irrResponse = await getFundIRRValues(fund.id);
            const irrValues = irrResponse.data || [];
            
            const fundValues: {[monthYear: string]: number} = {};
            
            irrValues.forEach((irr: any) => {
              const monthYear = formatMonthYear(irr.date);
              fundValues[monthYear] = parseFloat(irr.irr);
            });
            
            tableData[fund.id] = {
              fundName: fund.fund_name || 'Unknown Fund',
              values: fundValues
            };
          } catch (err) {
            console.warn(`Failed to get IRR values for fund ${fund.id}:`, err);
            tableData[fund.id] = {
              fundName: fund.fund_name || 'Unknown Fund',
              values: {}
            };
          }
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

  // Format percentage value
  const formatPercentage = (value: number | undefined): string => {
    if (value === undefined || value === null) return '-';
    return `${value.toFixed(2)}%`;
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
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                    Fund
                  </th>
                  {irrTableColumns.map(monthYear => (
                    <th key={monthYear} scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
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
                  <tr key={fundId} className={fund.isPreviousFunds ? 'bg-blue-50' : ''}>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium sticky left-0 z-10 ${
                      fund.isPreviousFunds ? 'text-blue-800 bg-blue-50' : 'text-gray-900 bg-white'
                    }`}>
                      {fund.fundName}
                      {fund.isPreviousFunds && (
                        <div className="text-xs text-blue-600 font-normal">
                          Aggregated inactive funds
                        </div>
                      )}
                    </td>
                    {irrTableColumns.map(monthYear => {
                      const irrValue = fund.values[monthYear];
                      const irrClass = irrValue !== undefined
                        ? irrValue >= 0 
                          ? 'text-green-600' 
                          : 'text-red-600'
                        : 'text-gray-400';
                      
                      return (
                        <td key={`${fundId}-${monthYear}`} className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={irrClass}>
                            {formatPercentage(irrValue)}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
                
                {/* Portfolio IRR Total Row */}
                {Object.keys(portfolioIRRData).length > 0 && (
                  <tr className="bg-gray-50 border-t-2 border-gray-300">
                    <td className="px-6 py-4 whitespace-nowrap text-base font-bold text-red-600 sticky left-0 bg-gray-50 z-10">
                      PORTFOLIO TOTAL
                    </td>
                    {irrTableColumns.map(monthYear => {
                      const portfolioIrrValue = portfolioIRRData[monthYear];
                      const irrClass = portfolioIrrValue !== undefined
                        ? portfolioIrrValue >= 0 
                          ? 'text-green-700 font-bold' 
                          : 'text-red-700 font-bold'
                        : 'text-gray-400';
                      
                      return (
                        <td key={`portfolio-${monthYear}`} className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={irrClass}>
                            {formatPercentage(portfolioIrrValue)}
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