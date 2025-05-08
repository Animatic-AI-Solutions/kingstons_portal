import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getFundIRRValues } from '../services/api';

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
      
      console.log('AccountIRRHistory: Making API request to /client_products/' + accountId);
      
      // First fetch the account to get the portfolio_id
      const accountResponse = await api.get(`/client_products/${accountId}`);
      console.log('AccountIRRHistory: Account data received:', accountResponse.data);
      
      // Get the portfolio_id from the account
      const portfolioId = accountResponse.data.portfolio_id;
      
      if (!portfolioId) {
        console.warn('AccountIRRHistory: No portfolio ID found for this account');
        setError('No portfolio is associated with this product. Please assign a portfolio first.');
        // Set account even if there's an error so we can show product info
        setAccount(accountResponse.data);
        setIsLoading(false);
        return;
      }
      
      // Get portfolio details if we have a portfolio_id
      if (portfolioId) {
        const portfolioResponse = await api.get(`/portfolios/${portfolioId}`);
        if (portfolioResponse.data) {
          // Merge portfolio data into account object
          accountResponse.data.portfolio_name = portfolioResponse.data.portfolio_name;
        }
      }
      
      // Set account data with portfolio information
      setAccount(accountResponse.data);
      
      // Now fetch the remaining data in parallel
      const [
        fundsResponse,
        portfolioFundsResponse,
        activitiesResponse
      ] = await Promise.all([
        api.get('/funds'),
        api.get(`/portfolio_funds?portfolio_id=${portfolioId}`),
        api.get(`/holding_activity_logs?product_id=${accountId}`)
      ]);
      
      console.log('AccountIRRHistory: Portfolio funds data:', portfolioFundsResponse.data);
      console.log('AccountIRRHistory: Activity logs received:', activitiesResponse.data);
      
      // Create a map of funds for quick lookups
      const fundsMap = new Map<number, any>(
        fundsResponse.data.map((fund: any) => [fund.id, fund])
      );
      
      // Process portfolio funds as our holdings directly instead of using product_holdings
      const processedHoldings = portfolioFundsResponse.data.map((portfolioFund: any) => {
        console.log('AccountIRRHistory: Processing portfolio fund:', portfolioFund);
        
        // Find the fund
        const fund = fundsMap.get(portfolioFund.available_funds_id);
        console.log('AccountIRRHistory: Matched fund:', fund);
        
        return {
          id: portfolioFund.id,
          fund_name: fund?.fund_name || 'Unknown Fund',
          irr: null, // We'll calculate this separately
          portfolio_fund_id: portfolioFund.id
        };
      });
      
      setHoldings(processedHoldings);
      setActivityLogs(activitiesResponse.data);
      
      // Get IRR history for portfolio funds
      if (portfolioFundsResponse.data.length > 0) {
        fetchIRRHistory(portfolioFundsResponse.data, fundsMap);
      }
      
      setIsLoading(false);
    } catch (err: any) {
      console.error('AccountIRRHistory: Error fetching data:', err);
      setError(`Error loading data: ${err.message || 'Unknown error'}`);
      setIsLoading(false);
    }
  };
  
  // Fetch IRR history data for all portfolio funds
  const fetchIRRHistory = async (portfolioFunds: any[], fundsMap: Map<number, any>) => {
    try {
      setIsLoadingHistory(true);
      
      // Get all portfolio fund IDs
      const portfolioFundIds = portfolioFunds.map(pf => pf.id);
      
      if (portfolioFundIds.length === 0) {
        console.log('No portfolio funds found for IRR history');
        setIsLoadingHistory(false);
        return;
      }
      
      // Get IRR history for all portfolio funds
      console.log('Fetching IRR history for portfolio funds:', portfolioFundIds);
      
      // Build the IRR history data structure
      const tableData: IRRTableData = {};
      const seenMonths = new Set<string>();
      
      // Process each portfolio fund to get its IRR history
      for (const portfolioFund of portfolioFunds) {
        const fundId = portfolioFund.id;
        const fundName = fundsMap.get(portfolioFund.available_funds_id)?.fund_name || 'Unknown Fund';
        
        // Get IRR values for this fund
        try {
          const response = await getFundIRRValues(fundId);
          const irrValues: IRRValue[] = response.data || [];
          
          if (irrValues && irrValues.length > 0) {
            // Add fund to table data
            tableData[fundId] = {
              fundName,
              values: {}
            };
            
            // Process each IRR value
            irrValues.forEach((irr: IRRValue) => {
              const monthYear = formatMonthYear(irr.date);
              seenMonths.add(monthYear);
              
              // Store the IRR value
              tableData[fundId].values[monthYear] = irr.irr;
            });
          }
        } catch (err) {
          console.error(`Error fetching IRR values for fund ${fundId}:`, err);
        }
      }
      
      // Convert seen months to array and sort chronologically
      const months = Array.from(seenMonths).sort((a, b) => {
        const dateA = new Date(a);
        const dateB = new Date(b);
        return dateB.getTime() - dateA.getTime(); // Most recent first
      });
      
      // Update state
      setIrrHistoryData(tableData);
      setIrrTableColumns(months);
      
    } catch (err) {
      console.error('Error fetching IRR history:', err);
    } finally {
      setIsLoadingHistory(false);
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
    return date.toLocaleDateString('en-US', {
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
                {Object.entries(irrHistoryData).map(([fundId, fund]) => (
                  <tr key={fundId}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-white z-10">
                      {fund.fundName}
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
                            {irrValue !== undefined && (
                              <span className="ml-1">
                                {irrValue >= 0 ? '▲' : '▼'}
                              </span>
                            )}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AccountIRRHistory;