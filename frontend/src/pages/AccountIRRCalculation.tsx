import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import YearNavigator from '../components/YearNavigator';
import EditableMonthlyActivitiesTable from '../components/EditableMonthlyActivitiesTable';
import { calculatePortfolioIRR } from '../services/api';

interface Account {
  id: number;
  client_account_id: number;
  client_name: string;
  account_name: string;
  current_portfolio?: {
    id: number;
    portfolio_name: string;
    assignment_start_date: string;
  };
}

interface Holding {
  id: number;
  fund_id?: number;
  fund_name?: string;
  isin_number?: string;
  target_weighting?: string;
  amount_invested: number;
  market_value: number;
  irr?: number;
  irr_calculation_date?: string;
  account_holding_id: number;
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

// Helper function to convert ActivityLog[] to Activity[]
const convertActivityLogs = (logs: ActivityLog[]): any[] => {
  return logs.map(log => ({
    ...log,
    amount: log.amount.toString() // Convert number to string
  }));
};

// Helper functions to calculate activity totals by type
const calculateActivityTotalByType = (activities: ActivityLog[], type: string, fundId: number): number => {
  return activities
    .filter(activity => activity.portfolio_fund_id === fundId && activity.activity_type === type)
    .reduce((total, activity) => total + Math.abs(activity.amount), 0);
};

const calculateInvestments = (activities: ActivityLog[], fundId: number): number => {
  return calculateActivityTotalByType(activities, 'Investment', fundId);
};

const calculateRegularInvestments = (activities: ActivityLog[], fundId: number): number => {
  return calculateActivityTotalByType(activities, 'RegularInvestment', fundId);
};

const calculateGovernmentUplifts = (activities: ActivityLog[], fundId: number): number => {
  return calculateActivityTotalByType(activities, 'GovernmentUplift', fundId);
};

const calculateSwitchIns = (activities: ActivityLog[], fundId: number): number => {
  return calculateActivityTotalByType(activities, 'SwitchIn', fundId);
};

const calculateSwitchOuts = (activities: ActivityLog[], fundId: number): number => {
  return calculateActivityTotalByType(activities, 'SwitchOut', fundId);
};

const calculateWithdrawals = (activities: ActivityLog[], fundId: number): number => {
  return calculateActivityTotalByType(activities, 'Withdrawal', fundId);
};

const calculateInvestmentsPlusSwitchIns = (activities: ActivityLog[], fundId: number): number => {
  const investments = calculateInvestments(activities, fundId);
  const regularInvestments = calculateRegularInvestments(activities, fundId);
  const governmentUplifts = calculateGovernmentUplifts(activities, fundId);
  const switchIns = calculateSwitchIns(activities, fundId);
  
  return investments + regularInvestments + governmentUplifts + switchIns;
};

const calculateValueMinusWithdrawals = (marketValue: number, activities: ActivityLog[], fundId: number): number => {
  const withdrawals = calculateWithdrawals(activities, fundId);
  const switchOuts = calculateSwitchOuts(activities, fundId);
  
  return marketValue + withdrawals + switchOuts;
};

// Helper functions to calculate totals for the Period Overview table
const calculateTotalAmountInvested = (holdings: Holding[]): number => {
  return holdings.reduce((total, holding) => total + (holding.amount_invested || 0), 0);
};

const calculateTotalRegularInvestments = (activities: ActivityLog[], holdings: Holding[]): number => {
  return holdings.reduce((total, holding) => total + calculateRegularInvestments(activities, holding.id), 0);
};

const calculateTotalGovernmentUplifts = (activities: ActivityLog[], holdings: Holding[]): number => {
  return holdings.reduce((total, holding) => total + calculateGovernmentUplifts(activities, holding.id), 0);
};

const calculateTotalSwitchIns = (activities: ActivityLog[], holdings: Holding[]): number => {
  return holdings.reduce((total, holding) => total + calculateSwitchIns(activities, holding.id), 0);
};

const calculateTotalSwitchOuts = (activities: ActivityLog[], holdings: Holding[]): number => {
  return holdings.reduce((total, holding) => total + calculateSwitchOuts(activities, holding.id), 0);
};

const calculateTotalWithdrawals = (activities: ActivityLog[], holdings: Holding[]): number => {
  return holdings.reduce((total, holding) => total + calculateWithdrawals(activities, holding.id), 0);
};

const calculateTotalValue = (holdings: Holding[]): number => {
  return holdings.reduce((total, holding) => total + (holding.market_value || 0), 0);
};

const calculateTotalValueMinusWithdrawals = (holdings: Holding[], activities: ActivityLog[]): number => {
  return holdings.reduce((total, holding) => 
    total + calculateValueMinusWithdrawals(holding.market_value || 0, activities, holding.id), 0);
};

const calculateTotalInvestmentsPlusSwitchIns = (activities: ActivityLog[], holdings: Holding[]): number => {
  return holdings.reduce((total, holding) => total + calculateInvestmentsPlusSwitchIns(activities, holding.id), 0);
};

// Add this new function to filter activity logs by year
const filterActivitiesByYear = (activities: ActivityLog[], year: number): ActivityLog[] => {
  return activities.filter(activity => {
    const activityDate = new Date(activity.activity_timestamp);
    return activityDate.getFullYear() === year;
  });
};

interface AccountIRRCalculationProps {
  accountId?: string;
}

const AccountIRRCalculation: React.FC<AccountIRRCalculationProps> = ({ accountId: propAccountId }) => {
  const { accountId: paramAccountId } = useParams<{ accountId: string }>();
  const accountId = propAccountId || paramAccountId;
  const navigate = useNavigate();
  const { api } = useAuth();
  const [account, setAccount] = useState<Account | null>(null);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [isCalculatingIRR, setIsCalculatingIRR] = useState(false);
  const [irrCalculationResult, setIrrCalculationResult] = useState<IrrCalculationResult | null>(null);

  useEffect(() => {
    if (accountId) {
      console.log('AccountIRRCalculation: Fetching data for accountId:', accountId);
      fetchData(accountId);
    } else {
      console.error('AccountIRRCalculation: No accountId available for data fetching');
    }
  }, [accountId, api]);

  const fetchData = async (accountId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('AccountIRRCalculation: Making API request to /client_accounts/' + accountId);
      
      // First fetch the account to get the portfolio_id
      const accountResponse = await api.get(`/client_accounts/${accountId}`);
      console.log('AccountIRRCalculation: Account data received:', accountResponse.data);
      setAccount(accountResponse.data);
      
      // Get the portfolio_id from the account
      const portfolioId = accountResponse.data.current_portfolio?.id;
      console.log('AccountIRRCalculation: Portfolio ID from account:', portfolioId);
      
      if (!portfolioId) {
        console.warn('AccountIRRCalculation: No portfolio ID found for this account');
      }
      
      // Now fetch the remaining data in parallel
      const [
        holdingsResponse,
        activityLogsResponse,
        fundsResponse,
        portfolioFundsResponse
      ] = await Promise.all([
        api.get(`/account_holdings?client_account_id=${accountId}`),
        api.get(`/holding_activity_logs?client_account_id=${accountId}`),
        api.get('/funds'),
        portfolioId ? api.get(`/portfolio_funds?portfolio_id=${portfolioId}`) : api.get('/portfolio_funds')
      ]);
      
      console.log('AccountIRRCalculation: Account data received:', accountResponse.data);
      setAccount(accountResponse.data);
      
      console.log('AccountIRRCalculation: Holdings data received:', holdingsResponse.data);
      console.log('AccountIRRCalculation: Activity logs received:', activityLogsResponse.data);
      
      // Create a map of funds for quick lookups
      const fundsMap = new Map<number, any>(
        fundsResponse.data.map((fund: any) => [fund.id, fund])
      );
      
      console.log('AccountIRRCalculation: Portfolio funds data:', portfolioFundsResponse.data);
      
      // Create a map of portfolio funds for quick lookups
      const portfolioFundsMap = new Map<number, any>(
        portfolioFundsResponse.data.map((pf: any) => [pf.id, pf])
      );
      
      // Process holdings to include fund names
      const processedHoldings = holdingsResponse.data.map((holding: any) => {
        console.log('AccountIRRCalculation: Processing holding:', holding);
        
        // Get the portfolio ID from the holding or from the account
        const portfolioId = holding.portfolio_id || accountResponse.data.current_portfolio?.id;
        
        if (!portfolioId) {
          console.warn('AccountIRRCalculation: No portfolio ID for holding:', holding.id);
          return {
            ...holding,
            fund_name: 'Unknown Fund',
            isin_number: 'N/A'
          };
        }
        
        // Find all portfolio funds for this portfolio
        const relevantPortfolioFunds = portfolioFundsResponse.data.filter((pf: any) =>
          pf.portfolio_id === portfolioId
        );
        
        console.log('AccountIRRCalculation: Relevant portfolio funds for holding:', relevantPortfolioFunds);
        
        // Find the specific portfolio fund for this holding
        // Try different matching strategies
        let portfolioFund = null;
        
        // Strategy 1: Direct ID match
        portfolioFund = relevantPortfolioFunds.find((pf: any) => pf.id === holding.id);
        
        // Strategy 2: Match by portfolio_id and fund_id if available
        if (!portfolioFund && holding.fund_id) {
          portfolioFund = relevantPortfolioFunds.find((pf: any) =>
            pf.available_funds_id === holding.fund_id
          );
        }
        
        // Strategy 3: If we still don't have a match, try to match by name
        if (!portfolioFund && holding.fund_name) {
          const fundId = Array.from(fundsMap.values()).find(
            (fund: any) => fund.fund_name === holding.fund_name
          )?.id;
          
          if (fundId) {
            portfolioFund = relevantPortfolioFunds.find((pf: any) =>
              pf.available_funds_id === fundId
            );
          }
        }
        
        console.log('AccountIRRCalculation: Matched portfolio fund:', portfolioFund);
        
        // Find the fund
        const fund = portfolioFund ? fundsMap.get(portfolioFund.available_funds_id) : null;
        console.log('AccountIRRCalculation: Matched fund:', fund);
        
        return {
          ...holding,
          fund_name: fund?.fund_name || holding.fund_name || 'Unknown Fund',
          isin_number: fund?.isin_number || holding.isin_number || 'N/A'
        };
      });
      
      console.log('AccountIRRCalculation: Processed holdings with fund names:', processedHoldings);
      setHoldings(processedHoldings || []);
      setActivityLogs(activityLogsResponse.data || []);
      
    } catch (err: any) {
      console.error('AccountIRRCalculation: Error fetching data:', err);
      setError(err.response?.data?.detail || 'Failed to fetch account details');
    } finally {
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

  // Format currency with commas and 2 decimal places
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Format percentage with 1 decimal place
  const formatPercentage = (value: number): string => {
    return `${(value * 100).toFixed(1)}%`;
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

  // Add handler for IRR calculation
  const handleCalculateIRR = async () => {
    if (!account || !account.current_portfolio) {
      alert('No active portfolio assigned to this account');
      return;
    }
    
    const portfolioId = account.current_portfolio.id;
    
    try {
      setIsCalculatingIRR(true);
      setIrrCalculationResult(null);
      
      const response = await calculatePortfolioIRR(portfolioId);
      setIrrCalculationResult(response.data);
      
      // Refresh the data to show updated IRR values
      fetchData(accountId as string);
    } catch (err: any) {
      console.error('Error calculating IRR:', err);
      const errorMessage = err.response?.data?.detail || 'Failed to calculate IRR values';
      alert(`Error: ${errorMessage}`);
    } finally {
      setIsCalculatingIRR(false);
    }
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
    <div className="bg-white shadow rounded-lg p-6" style={{ border: '2px solid red' }}>
      <h2 className="text-xl font-semibold mb-4">IRR Calculation</h2>
      <div style={{ backgroundColor: '#ffeeee', padding: '10px', marginBottom: '10px' }}>
        <p><strong>Debug Info:</strong></p>
        <p>Account ID: {accountId}</p>
        <p>Account Name: {account?.account_name}</p>
        <p>Holdings Count: {holdings.length}</p>
        <p>Activity Logs Count: {activityLogs.length}</p>
      </div>
      
      {account.current_portfolio && (
        <div className="bg-gray-50 p-4 rounded-md mb-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Current Portfolio</h3>
            <p className="text-base text-gray-700">
              <Link to={`/portfolios/${account.current_portfolio.id}`} className="text-indigo-600 hover:text-indigo-900">
                {account.current_portfolio.portfolio_name}
              </Link>
              <span className="text-gray-500 ml-2">
                (Since {formatDate(account.current_portfolio.assignment_start_date)})
              </span>
            </p>
          </div>
        </div>
      )}
      
      {holdings.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No holdings found for this account.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Current Holdings Summary */}
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Period Overview for {selectedYear}</h2>
            
            <YearNavigator 
              selectedYear={selectedYear}
              onYearChange={(year) => setSelectedYear(year)}
            />
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 table-fixed">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">ISIN</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Investments</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Regular Investments</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Government Uplifts</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Switch Ins</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Switch Outs</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Withdrawals</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Most Recent Value</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Most Recent IRR</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {holdings.map((holding) => (
                  <tr key={holding.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-base font-medium text-gray-900">{holding.fund_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {holding.isin_number || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatCurrency(holding.amount_invested || 0)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatCurrency(calculateRegularInvestments(activityLogs, holding.id))}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatCurrency(calculateGovernmentUplifts(activityLogs, holding.id))}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatCurrency(calculateSwitchIns(activityLogs, holding.id))}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatCurrency(calculateSwitchOuts(activityLogs, holding.id))}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatCurrency(calculateWithdrawals(activityLogs, holding.id))}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatCurrency(holding.market_value || 0)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className={`text-sm ${holding.irr && holding.irr >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                          {holding.irr !== undefined ? (
                            <>
                              {formatPercentage(holding.irr / 100)}
                              <span className="ml-1">
                                {holding.irr >= 0 ? '▲' : '▼'}
                              </span>
                            </>
                          ) : 'N/A'}
                        </div>
                        {holding.irr_calculation_date && (
                          <div className="text-xs text-gray-500 mt-1">
                            as of {formatDate(holding.irr_calculation_date)}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Monthly Activities Table */}
          <div className="mt-10">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Monthly Activities</h2>
              <button 
                onClick={handleCalculateIRR}
                disabled={isCalculatingIRR || !account?.current_portfolio}
                className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isCalculatingIRR ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Calculating IRRs...
                  </>
                ) : (
                  'Calculate Latest IRRs'
                )}
              </button>
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
            
            <EditableMonthlyActivitiesTable 
              funds={holdings.map(holding => ({
                id: holding.id,
                holding_id: holding.account_holding_id,
                fund_name: holding.fund_name || 'Unknown Fund',
                irr: holding.irr
              })).sort((a, b) => {
                // Place 'Cashline' fund at the end
                if (a.fund_name === 'Cashline') return 1;
                if (b.fund_name === 'Cashline') return -1;
                // Sort the rest alphabetically
                return a.fund_name.localeCompare(b.fund_name);
              })}
              activities={convertActivityLogs(activityLogs)}
              accountHoldingId={holdings.length > 0 ? holdings[0].account_holding_id : 0}
              onActivitiesUpdated={refreshData}
              selectedYear={selectedYear}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountIRRCalculation;