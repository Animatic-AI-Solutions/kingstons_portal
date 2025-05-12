import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import YearNavigator from '../components/YearNavigator';
import EditableMonthlyActivitiesTable from '../components/EditableMonthlyActivitiesTable';
import { formatCurrency, formatPercentage } from '../utils/formatters';
import IRRCalculationModal from '../components/IRRCalculationModal';
import IRRDateSelectionModal from '../components/IRRDateSelectionModal';
import { calculatePortfolioIRRForDate } from '../services/api';

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
  fund_id?: number;
  fund_name?: string;
  isin_number?: string;
  target_weighting?: string;
  amount_invested: number;
  market_value: number;
  irr?: number;
  irr_calculation_date?: string;
  account_holding_id: number;
  isVirtual?: boolean;
  inactiveHoldingIds?: Array<{
    id: number;
    fund_id?: number;
    fund_name?: string;
  }>;
  end_date?: string;
  status?: string;
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

// Helper to filter active/inactive holdings
const filterActiveHoldings = (holdings: Holding[]): Holding[] => {
  // Log all holdings for debugging
  console.log("All holdings before filtering:", holdings.map(h => ({
    id: h.id,
    fund_name: h.fund_name,
    status: h.status,
    end_date: h.end_date
  })));
  
  const activeHoldings = holdings.filter(holding => holding.status === 'active' || !holding.status);
  
  console.log("Active holdings after filtering:", activeHoldings.map(h => ({
    id: h.id,
    fund_name: h.fund_name,
    status: h.status
  })));
  
  return activeHoldings;
};

const filterInactiveHoldings = (holdings: Holding[]): Holding[] => {
  const today = new Date();
  
  // Log before filtering
  console.log("Filtering inactive holdings from:", holdings.length, "holdings");
  
  // Before filtering, log the exact values for debugging
  console.log("All holdings status values:", holdings.map(h => ({ 
    id: h.id, 
    name: h.fund_name, 
    statusValue: h.status, 
    statusType: typeof h.status,
    statusLowerCase: h.status?.toLowerCase?.(),
    statusExactCompare: h.status === 'inactive',
    statusLooseCompare: h.status?.toLowerCase?.() === 'inactive'
  })));
  
  const inactiveHoldings = holdings.filter(holding => {
    // Check if status is explicitly set to 'inactive' with string comparison
    const rawStatus = holding.status;
    const statusString = typeof rawStatus === 'string' ? rawStatus.toLowerCase() : String(rawStatus).toLowerCase();
    const isStatusInactive = statusString === 'inactive';
    
    // Check if end_date exists and is in the past
    const hasEndDatePassed = holding.end_date && new Date(holding.end_date) <= today;
    
    // Debug log for each holding with more details
    console.log(`Holding ID ${holding.id} (${holding.fund_name}):`, {
      rawStatus,
      statusString,
      isStatusInactive,
      end_date: holding.end_date,
      hasEndDatePassed,
      isInactive: isStatusInactive || hasEndDatePassed
    });
    
    // Return true if either condition is met
    return isStatusInactive || hasEndDatePassed;
  });
  
  console.log("Found inactive holdings:", inactiveHoldings.map(h => ({
    id: h.id,
    fund_name: h.fund_name,
    status: h.status,
    end_date: h.end_date
  })));
  
  return inactiveHoldings;
};

// Create a virtual "Previous Funds" entry that aggregates all inactive funds
const createPreviousFundsEntry = (inactiveHoldings: Holding[], activityLogs: ActivityLog[]): Holding | null => {
  console.log("Creating Previous Funds entry with", inactiveHoldings.length, "inactive holdings");
  
  if (inactiveHoldings.length === 0) {
    console.log("No inactive holdings found, not creating Previous Funds entry");
    return null;
  }
  
  // Sum up all the values from inactive holdings
  const totalAmountInvested = inactiveHoldings.reduce((sum, holding) => sum + (holding.amount_invested || 0), 0);
  const totalMarketValue = inactiveHoldings.reduce((sum, holding) => sum + (holding.market_value || 0), 0);
  
  console.log("Previous Funds totals:", { totalAmountInvested, totalMarketValue });
  
  // Calculate IRR as sum of all fund IRRs minus (100 * number of funds)
  const holdingsWithIRR = inactiveHoldings.filter(h => h.irr !== undefined);
  let calculatedIRR = undefined;
  
  if (holdingsWithIRR.length > 0) {
    // Sum all IRRs of inactive funds
    const totalIRR = holdingsWithIRR.reduce((sum, h) => sum + (h.irr || 0), 0);
    // Subtract 100 times the number of funds
    calculatedIRR = totalIRR - (100 * holdingsWithIRR.length);
    console.log("Calculated Previous Funds IRR:", calculatedIRR, "from", holdingsWithIRR.length, "funds with IRR values");
  }
  
  // Find the most recent IRR calculation date among inactive holdings
  const sortedDates = inactiveHoldings
    .filter(h => h.irr_calculation_date)
    .map(h => h.irr_calculation_date)
    .sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime());
  
  const latestCalculationDate = sortedDates.length > 0 ? sortedDates[0] : undefined;
  
  const previousFundsEntry = {
    id: -1, // Special ID for the virtual fund
    fund_name: 'Previous Funds', // Distinctive name
    amount_invested: totalAmountInvested,
    market_value: totalMarketValue,
    irr: calculatedIRR,
    irr_calculation_date: latestCalculationDate,
    account_holding_id: -1,
    isVirtual: true, // Flag to identify this as a virtual entry
    // Store the detailed information about inactive holdings
    inactiveHoldingIds: inactiveHoldings.map(h => ({
      id: h.id, // Portfolio fund ID
      fund_id: h.fund_id, // The actual fund ID to match with allFunds
      fund_name: h.fund_name // Include the fund name directly
    })),
    status: 'previous_funds' // Special status to identify this as an aggregation of inactive funds
  } as Holding;
  
  console.log("Created Previous Funds entry:", previousFundsEntry);
  return previousFundsEntry;
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
  const [selectedPortfolioFundId, setSelectedPortfolioFundId] = useState<number | null>(null);
  const [selectedFundName, setSelectedFundName] = useState<string>('');
  const [isIRRModalOpen, setIsIRRModalOpen] = useState<boolean>(false);
  const [isDateSelectionModalOpen, setIsDateSelectionModalOpen] = useState<boolean>(false);
  const [dateSelectionResult, setDateSelectionResult] = useState<any>(null);
  const [allFunds, setAllFunds] = useState<any[]>([]);

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
      
      console.log('AccountIRRCalculation: Making API request to /client_products/' + accountId);
      
      // First fetch the account/product to get the portfolio_id
      const accountResponse = await api.get(`/client_products/${accountId}`);
      console.log('AccountIRRCalculation: Account/product data received:', accountResponse.data);
      
      // Get the portfolio_id from the account
      const portfolioId = accountResponse.data.portfolio_id;
      console.log('AccountIRRCalculation: Using portfolio ID:', portfolioId);
      
      if (!portfolioId) {
        console.error('AccountIRRCalculation: No portfolio ID found for this product');
        setError('No portfolio is associated with this product. Please assign a portfolio first.');
        setIsLoading(false);
        // Set account even if there's an error so we can show product info
        setAccount(accountResponse.data);
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
      
      console.log('Making API call to portfolio_funds with explicit select=*');
      // Fetch portfolio funds directly using the portfolio_id - explicitly select all fields including status
      const portfolioFundsResponse = await api.get(`/portfolio_funds?portfolio_id=${portfolioId}&select=*`);
      console.log('Full raw API response for portfolio_funds:', portfolioFundsResponse);
      console.log('AccountIRRCalculation: Portfolio funds data:', portfolioFundsResponse.data);
      
      // Enhanced logging for portfolio funds data
      if (portfolioFundsResponse.data && portfolioFundsResponse.data.length > 0) {
        console.log('Detailed portfolio funds data:');
        portfolioFundsResponse.data.forEach((fund: any, index: number) => {
          console.log(`Fund ${index + 1}: ID=${fund.id}, Name=${fund.fund_name}, Status=${fund.status}, `,
                      `End date=${fund.end_date}, Available funds ID=${fund.available_funds_id}`);
        });
      }
      
      // DEBUGGING: Direct check for fund ID 66 if it exists in the response
      const fund66 = portfolioFundsResponse.data.find((fund: any) => fund.id === 66);
      if (fund66) {
        try {
          console.log('SPECIAL DEBUG: Found fund 66 in the API response, checking details directly');
          console.log('Fund 66 from list endpoint:', fund66);
          
          // Make a direct API call to get just this fund's details
          const direct66Response = await api.get('/portfolio_funds/66');
          console.log('Direct API call for fund 66:', direct66Response.data);
          
          // Check if status fields match
          if (fund66.status !== direct66Response.data.status) {
            console.error('STATUS MISMATCH DETECTED between list API and direct API:', {
              listStatus: fund66.status,
              directStatus: direct66Response.data.status
            });
          }
        } catch (err) {
          console.error('Error in direct check for fund 66:', err);
        }
      }
      
      if (!portfolioFundsResponse.data || portfolioFundsResponse.data.length === 0) {
        console.warn('AccountIRRCalculation: No portfolio funds found for portfolio ID:', portfolioId);
        setError('This portfolio has no funds assigned to it. Please add funds to the portfolio first.');
        setIsLoading(false);
        return;
      }
      
      // Get funds and activity logs
      const [fundsResponse, activitiesResponse] = await Promise.all([
        api.get('/funds'),
        api.get(`/holding_activity_logs?portfolio_id=${portfolioId}`)
      ]);
      
      console.log('AccountIRRCalculation: Funds data:', fundsResponse.data);
      console.log('AccountIRRCalculation: Activity logs received:', activitiesResponse.data);
      
      // Store the complete list of funds for reference
      setAllFunds(fundsResponse.data || []);
      
      // Create a map of funds for quick lookups
      const fundsMap = new Map<number, any>(
        fundsResponse.data.map((fund: any) => [fund.id, fund])
      );
      
      // Process portfolio funds as holdings
      const processedHoldings = await Promise.all(portfolioFundsResponse.data.map(async (portfolioFund: any, index: number) => {
        // Get fund details
        const fund = fundsMap.get(portfolioFund.available_funds_id);
        
        // Fetch latest IRR for this fund
        let latestIrr: number | undefined = undefined;
        let latestIrrDate: string | undefined = undefined;
        try {
          const irrResp = await api.get(`/portfolio_funds/${portfolioFund.id}/latest-irr`);
          if (irrResp.data && irrResp.data.irr !== undefined) {
            latestIrr = irrResp.data.irr;
            latestIrrDate = irrResp.data.calculation_date;
          }
        } catch (err) {
          // Ignore error, fallback to undefined
        }
        
        // Use the status directly from the portfolio_fund record and make sure it's a string
        // Log detailed info for debugging status issues
        console.log(`Portfolio fund ${portfolioFund.id} raw data:`, {
          id: portfolioFund.id,
          fund_name: fund?.fund_name,
          status: portfolioFund.status,
          status_type: typeof portfolioFund.status,
          raw_obj: JSON.stringify(portfolioFund),
          end_date: portfolioFund.end_date
        });
        
        // Try multiple approaches to get the status
        let status = 'active'; // Default to active if nothing else is found
        
        // 1. Try direct status property
        if (portfolioFund.status !== undefined && portfolioFund.status !== null) {
          status = String(portfolioFund.status).toLowerCase();
          console.log(`Using direct status from API: ${status}`);
        } 
        // 2. Try searching the raw object for status properties
        else if (typeof portfolioFund === 'object') {
          // Look for any property that might contain 'status'
          Object.entries(portfolioFund).forEach(([key, value]) => {
            console.log(`Checking field: ${key} = ${value}, type = ${typeof value}`);
            if (key.toLowerCase().includes('status') && value) {
              status = String(value).toLowerCase();
              console.log(`Found status in field ${key}: ${status}`);
            }
          });
        }
        
        // 3. Alternative way to check for specific API endpoints
        console.log('Alternative check for inactive status:', {
          endpoint: `/portfolio_funds/${portfolioFund.id}/status`,
          portfolio_id: portfolioId
        });
        
        console.log(`Portfolio fund ${portfolioFund.id} (${fund?.fund_name || 'Unknown'}): final processed status = ${status}`);
        
        return {
          id: portfolioFund.id, // Use portfolio_fund.id as the holding ID
          portfolio_id: portfolioId,
          fund_id: portfolioFund.available_funds_id,
          fund_name: fund?.fund_name || 'Unknown Fund',
          isin_number: fund?.isin_number || 'N/A',
          target_weighting: portfolioFund.weighting,
          amount_invested: portfolioFund.amount_invested || 0,
          market_value: portfolioFund.market_value || portfolioFund.amount_invested || 0,
          irr: latestIrr,
          irr_calculation_date: latestIrrDate,
          account_holding_id: parseInt(accountId), // Use client_product_id as account_holding_id
          status: status, // Use the carefully processed status value
          end_date: portfolioFund.end_date // Include the end_date from the portfolio_fund record
        };
      }));
      
      console.log('AccountIRRCalculation: Processed holdings:', processedHoldings);
      setHoldings(processedHoldings || []);
      setActivityLogs(activitiesResponse.data || []);
      
    } catch (err: any) {
      console.error('AccountIRRCalculation: Error fetching data:', err);
      setError(err.response?.data?.detail || 'Failed to fetch product details');
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
    if (value === null || value === undefined) {
      return 'N/A';
    }
    return `${value.toFixed(1)}%`;
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

  // Add handler for IRR calculation
  const handleCalculateIRR = () => {
    if (!account || !account.portfolio_id) {
      alert('No active portfolio assigned to this account');
      return;
    }
    
    setIsDateSelectionModalOpen(true);
  };

  // Add a new handler for date selection modal
  const handleCalculateIRRWithDate = async (date: string) => {
    if (!account || !account.portfolio_id) {
      alert('No active portfolio assigned to this account');
      return;
    }
    
    const portfolioId = account.portfolio_id;
    
    try {
      setIsCalculatingIRR(true);
      setDateSelectionResult(null);
      
      // Use the service function instead of direct API call
      const response = await calculatePortfolioIRRForDate(portfolioId, date);
      setDateSelectionResult(response.data);
      
      // Refresh the data to show updated IRR values
      fetchData(accountId as string);
      
      // If there are missing valuations, alert the user
      if (response.data.missing_valuations && response.data.missing_valuations.length > 0) {
        const missingFunds = response.data.missing_valuations.map((item: any) => 
          item.fund_name || `Fund ID ${item.portfolio_fund_id}`
        ).join(', ');
        
        alert(`Warning: The following funds don't have valuations for the selected date: ${missingFunds}`);
      }
    } catch (err: any) {
      console.error('Error calculating IRR for date:', err);
      const errorMessage = err.response?.data?.detail || 'Failed to calculate IRR values';
      alert(`Error: ${errorMessage}`);
    } finally {
      setIsCalculatingIRR(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error || !account) {
    return (
      <div className="text-center p-8">
        <div className="text-red-600 mb-4">{error || 'Failed to load account details. Please try again later.'}</div>
        <button 
          onClick={() => navigate(-1)} 
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h2 className="text-xl font-semibold mb-4">IRR Calculation</h2>
      
      {holdings.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No holdings found for this account.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Current Holdings Summary */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center">
                <h2 className="text-xl font-semibold text-gray-900">Period Overview</h2>
                <div className="ml-6">
                  <YearNavigator
                    selectedYear={selectedYear}
                    onYearChange={setSelectedYear}
                  />
                </div>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
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
                  {/* First separate active and inactive holdings */}
                  {(() => {
                    console.log("Starting to process holdings for display");
                    
                    const activeHoldings = filterActiveHoldings(holdings);
                    const inactiveHoldings = filterInactiveHoldings(holdings);
                    
                    console.log(`After filtering: ${activeHoldings.length} active, ${inactiveHoldings.length} inactive`);
                    
                    // Create the Previous Funds entry if there are inactive holdings
                    const previousFundsEntry = createPreviousFundsEntry(inactiveHoldings, activityLogs);
                    
                    // Only display active holdings directly
                    const displayHoldings = [...activeHoldings];
                    
                    // Log inactive funds that were filtered out
                    if (inactiveHoldings.length > 0) {
                      console.log("Inactive holdings excluded from direct display:", 
                        inactiveHoldings.map(h => `${h.id} (${h.fund_name}): status=${h.status}, end_date=${h.end_date}`));
                    }
                    
                    // Add the Previous Funds entry if it exists
                    if (previousFundsEntry) {
                      console.log("Adding Previous Funds entry to display holdings");
                      displayHoldings.push(previousFundsEntry);
                    } else {
                      console.log("No Previous Funds entry was created");
                    }
                    
                    console.log(`Final display holdings count: ${displayHoldings.length}`);
                    
                    return (
                      <>
                        {displayHoldings.map((holding) => {
                          console.log(`Rendering holding: ${holding.id} (${holding.fund_name}), isVirtual: ${holding.isVirtual}`);
                          return (
                          <tr key={holding.id} className={holding.isVirtual ? "bg-gray-100 border-t border-gray-300" : ""}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className={holding.isVirtual ? "ml-4 font-medium" : "ml-4"}>
                                  <div className={`text-sm ${holding.isVirtual ? "font-semibold text-blue-800" : "font-medium text-gray-900"}`}>
                                    {holding.fund_name}
                                    {holding.status === 'inactive' && !holding.isVirtual && (
                                      <span className="ml-2 text-xs text-red-600 font-normal">(Inactive)</span>
                                    )}
                                  </div>
                                  {holding.isVirtual && inactiveHoldings.length > 0 && (
                                    <div className="text-xs text-gray-500 mt-1">
                                      ({inactiveHoldings.length} inactive {inactiveHoldings.length === 1 ? 'fund' : 'funds'})
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{holding.isin_number || 'N/A'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className={`text-sm ${holding.isVirtual ? "font-medium text-blue-800" : "text-gray-900"}`}>
                                {formatCurrency(holding.amount_invested)}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className={`text-sm ${holding.isVirtual ? "font-medium text-blue-800" : "text-gray-900"}`}>
                                {holding.isVirtual 
                                  ? formatCurrency(calculateTotalRegularInvestments(activityLogs, inactiveHoldings))
                                  : formatCurrency(calculateRegularInvestments(activityLogs, holding.id))}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className={`text-sm ${holding.isVirtual ? "font-medium text-blue-800" : "text-gray-900"}`}>
                                {holding.isVirtual
                                  ? formatCurrency(calculateTotalGovernmentUplifts(activityLogs, inactiveHoldings))
                                  : formatCurrency(calculateGovernmentUplifts(activityLogs, holding.id))}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className={`text-sm ${holding.isVirtual ? "font-medium text-blue-800" : "text-gray-900"}`}>
                                {holding.isVirtual
                                  ? formatCurrency(calculateTotalSwitchIns(activityLogs, inactiveHoldings))
                                  : formatCurrency(calculateSwitchIns(activityLogs, holding.id))}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className={`text-sm ${holding.isVirtual ? "font-medium text-blue-800" : "text-gray-900"}`}>
                                {holding.isVirtual
                                  ? formatCurrency(calculateTotalSwitchOuts(activityLogs, inactiveHoldings))
                                  : formatCurrency(calculateSwitchOuts(activityLogs, holding.id))}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className={`text-sm ${holding.isVirtual ? "font-medium text-blue-800" : "text-gray-900"}`}>
                                {holding.isVirtual
                                  ? formatCurrency(calculateTotalWithdrawals(activityLogs, inactiveHoldings))
                                  : formatCurrency(calculateWithdrawals(activityLogs, holding.id))}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className={`text-sm ${holding.isVirtual ? "font-medium text-blue-800" : "text-gray-900"}`}>
                                {formatCurrency(holding.market_value || 0)}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className={`text-sm ${
                                  holding.irr !== undefined 
                                    ? (holding.irr >= 0 
                                      ? (holding.isVirtual ? "font-medium text-green-700" : "text-green-700") 
                                      : (holding.isVirtual ? "font-medium text-red-700" : "text-red-700"))
                                    : "text-gray-500"
                                }`}>
                                  {holding.irr !== undefined ? (
                                    <>
                                      {holding.isVirtual || Math.abs(holding.irr) > 1 
                                        ? `${holding.irr.toFixed(1)}%` 
                                        : formatPercentage(holding.irr)}
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
                        )})}
                      </>
                    );
                  })()}
                  
                  {/* Total Row */}
                  <tr className="bg-gray-50 font-medium">
                    <td className="px-6 py-4 whitespace-nowrap text-base font-bold text-red-600">
                      TOTAL
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap"></td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-red-600">
                        {formatCurrency(calculateTotalAmountInvested(holdings))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-red-600">
                        {formatCurrency(calculateTotalRegularInvestments(activityLogs, holdings))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-red-600">
                        {formatCurrency(calculateTotalGovernmentUplifts(activityLogs, holdings))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-red-600">
                        {formatCurrency(calculateTotalSwitchIns(activityLogs, holdings))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-red-600">
                        {formatCurrency(calculateTotalSwitchOuts(activityLogs, holdings))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-red-600">
                        {formatCurrency(calculateTotalWithdrawals(activityLogs, holdings))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-bold text-red-600">
                        {formatCurrency(calculateTotalValue(holdings))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {/* No total IRR calculation */}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Monthly Activities Table */}
          <div className="mt-10">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Monthly Activities</h2>
              <button 
                onClick={handleCalculateIRR}
                disabled={isCalculatingIRR || !account?.portfolio_id}
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
                  'Calculate Monthly IRR'
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
            
            {activityLogs.length === 0 ? (
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-blue-700">
                      No fund activities found for this product. You can add monthly activities using the table below. 
                      Add fund values, investments, withdrawals and other transactions to calculate IRR.
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
            
            {/* Separate active and inactive holdings for the table */}
            {(() => {
              const activeHoldings = filterActiveHoldings(holdings);
              const inactiveHoldings = filterInactiveHoldings(holdings);
              
              // Log which holdings are identified as inactive
              console.log('Inactive holdings identified:');
              inactiveHoldings.forEach(holding => {
                console.log(`Inactive holding: ID=${holding.id}, Fund name=${holding.fund_name}, Status=${holding.status}, End date=${holding.end_date}`);
              });
              
              // Calculate IRR as sum of all fund IRRs minus (100 * number of funds)
              let previousFundsIRR = undefined;
              const holdingsWithIRR = inactiveHoldings.filter(h => h.irr !== undefined);
              
              if (holdingsWithIRR.length > 0) {
                // Sum all IRRs of inactive funds
                const totalIRR = holdingsWithIRR.reduce((sum, h) => sum + (h.irr || 0), 0);
                // Subtract 100 times the number of funds
                previousFundsIRR = totalIRR - (100 * holdingsWithIRR.length);
                console.log("Calculated Previous Funds IRR for activities table:", previousFundsIRR, "from", holdingsWithIRR.length, "funds with IRR values");
              }
              
              // Create a virtual "Previous Funds" entry for the EditableMonthlyActivitiesTable
              const previousFundsEntry = inactiveHoldings.length > 0 ? {
                id: -1,
                holding_id: -1,
                fund_name: 'Previous Funds',
                irr: previousFundsIRR, // Use the calculated IRR
                isActive: false,
                inactiveHoldingIds: inactiveHoldings.map(h => ({
                  id: h.id,
                  fund_id: h.fund_id,
                  fund_name: h.fund_name
                }))
              } : null;
              
              // Prepare the list of funds for the table
              const tableFunds = [...activeHoldings.map(holding => ({
                id: holding.id,
                holding_id: holding.account_holding_id,
                fund_name: holding.fund_name || 'Unknown Fund',
                irr: holding.irr,
                isActive: true
              }))];
              
              // Add the Previous Funds virtual entry if there are inactive funds
              if (previousFundsEntry) {
                tableFunds.push(previousFundsEntry);
              }
              
              // Sort funds alphabetically, but place Cashline at the end and Previous Funds at the very end
              tableFunds.sort((a, b) => {
                if (a.id === -1) return 1; // Previous Funds goes last
                if (b.id === -1) return -1;
                if (a.fund_name === 'Cashline') return 1;
                if (b.fund_name === 'Cashline') return -1;
                return (a.fund_name || '').localeCompare(b.fund_name || '');
              });
              
              // Filter activities by year
              const yearFilteredActivities = filterActivitiesByYear(activityLogs, selectedYear);
              
              return (
                <div className="overflow-x-auto">
                  <EditableMonthlyActivitiesTable 
                    funds={tableFunds}
                    activities={convertActivityLogs(yearFilteredActivities)}
                    accountHoldingId={accountId ? parseInt(accountId) : 0}
                    onActivitiesUpdated={refreshData}
                    selectedYear={selectedYear}
                    allFunds={allFunds} // Pass all funds from the API instead of just holdings
                  />
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Add the IRRDateSelectionModal component */}
      <IRRDateSelectionModal 
        isOpen={isDateSelectionModalOpen}
        onClose={() => setIsDateSelectionModalOpen(false)}
        onCalculateIRR={handleCalculateIRRWithDate}
      />
      
      {/* Add the IRRCalculationModal component */}
      <IRRCalculationModal
        isOpen={isIRRModalOpen}
        onClose={() => setIsIRRModalOpen(false)}
        fundName={selectedFundName}
        portfolioFundId={selectedPortfolioFundId || 0}
        onCalculateIRR={async (portfolioFundId: number, month: number, year: number, valuation: number) => {
          try {
            console.log(`Calculate IRR for fund ${portfolioFundId}, ${month}/${year}, valuation: ${valuation}`);
          } catch (err: any) {
            console.error('Error in individual fund IRR calculation:', err);
          }
        }}
      />
    </div>
  );
};

export default AccountIRRCalculation;