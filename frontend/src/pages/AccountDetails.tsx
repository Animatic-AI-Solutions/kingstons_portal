import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import EditableMonthlyActivitiesTable from '../components/EditableMonthlyActivitiesTable';
import YearNavigator from '../components/YearNavigator';
import { calculatePortfolioIRR } from '../services/api';

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
  client_name: string;
  account_name: string;
  status: string;
  start_date: string;
  end_date?: string;
  weighting?: number;
  irr?: number;
  total_value?: number;
  provider_name?: string;
  product_name?: string;
  plan_number?: string; // Plan number for the account
  is_bespoke?: boolean; // Whether this is a bespoke portfolio
  original_template_id?: number; // ID of the original template if not bespoke
  original_template_name?: string; // Name of the original template
  current_portfolio?: {
    id: number;
    portfolio_name: string;
    assignment_start_date: string;
  };
  portfolio_id?: number;
  holdings?: any[];
  portfolio_funds?: any[];
}

interface Activity {
  id: number;
  activity_timestamp: string;  // matches date type
  activity_type: string;
  amount: string;  // matches numeric(18,5)
}

interface Fund {
  id: number;
  fund_name: string;
  amount_invested: number;  // matches double precision
  market_value: number;    // calculated
  irr: number;            // calculated
  activities: Activity[];
  isin_number?: string;
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
  target_weighting?: string;  // matches numeric(8,4)
  amount_invested: number;    // matches double precision
  
  // Calculated fields (not in database)
  units: number;
  market_value: number;
  irr?: number;
  activities: Activity[];
  account_holding_id: number;
  irr_calculation_date?: string;
  isin?: string;  // ISIN number for the fund
  risk_level?: string;  // Risk level of the fund
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

interface PortfolioFund {
  id: number;
  portfolio_id: number;
  available_funds_id: number;
  target_weighting?: number;
  start_date: string;
  end_date?: string;
  amount_invested?: number;
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

type TabType = 'info' | 'holdings' | 'activity'; // 'holdings' tab is displayed as 'IRR'

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

// Get fund risk rating for display
const getFundRiskRating = (fundId: number, fundsMap: Map<number, any>): string => {
  // Find the fund in the fundsMap
  const fund = Array.from(fundsMap.values()).find(fund => fund.id === fundId);
  
  // If we have risk_factor data, display it
  if (fund && fund.risk_factor !== undefined && fund.risk_factor !== null) {
    return fund.risk_factor.toString();
  }
  
  // Default to unknown risk factor
  return 'N/A';
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

const calculateTotalInvestments = (activities: ActivityLog[], holdings: Holding[]): number => {
  return holdings.reduce((total, holding) => total + calculateInvestments(activities, holding.id), 0);
};

const AccountDetails: React.FC = () => {
  const { accountId } = useParams<{ accountId: string }>();
  const navigate = useNavigate();
  const { api } = useAuth();
  const [account, setAccount] = useState<Account | null>(null);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('info');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [fundsData, setFundsData] = useState<Map<number, any>>(new Map());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [isCalculatingIRR, setIsCalculatingIRR] = useState(false);
  const [irrCalculationResult, setIrrCalculationResult] = useState<IrrCalculationResult | null>(null);

  useEffect(() => {
    if (accountId) {
      fetchData(accountId);
    }
  }, [accountId]);

  const fetchData = async (accountId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Fetch all required data in parallel
      const [
        accountResponse,
        clientsResponse,
        productsResponse,
        holdingsResponse,
        portfoliosResponse,
        portfolioFundsResponse,
        providersResponse,
        fundsResponse,
        activityLogsResponse
      ] = await Promise.all([
        api.get(`/client_accounts/${accountId}`),
        api.get('/clients'),
        api.get('/available_products'),
        api.get(`/account_holdings?client_account_id=${accountId}`),
        api.get('/portfolios'),
        api.get('/portfolio_funds'),
        api.get('/available_providers'),
        api.get('/funds'),
        api.get(`/holding_activity_logs?client_account_id=${accountId}`)
      ]);

      // Create maps for quick lookups with proper typing
      const clientsMap = new Map<number, Client>(
        clientsResponse.data.map((client: Client) => [client.id, client])
      );
      const productsMap = new Map<number, Product>(
        productsResponse.data.map((product: Product) => [product.id, product])
      );
      const portfoliosMap = new Map<number, Portfolio>(
        portfoliosResponse.data.map((portfolio: Portfolio) => [portfolio.id, portfolio])
      );
      const providersMap = new Map<number, Provider>(
        providersResponse.data.map((provider: Provider) => [provider.id, provider])
      );
      const fundsMap = new Map<number, any>(
        fundsResponse.data.map((fund: any) => [fund.id, fund])
      );
      
      // Save funds data for risk factor display
      setFundsData(fundsMap);

      // Get the base account data
      const accountData = accountResponse.data;
      
      // Enrich with client info
      const client = clientsMap.get(accountData.client_id);
      accountData.client_name = client?.name || 'Unknown Client';

      // If the account has a template ID, fetch the template name
      if (accountData.original_template_id) {
        try {
          const templateResponse = await api.get(`/available_portfolios/${accountData.original_template_id}`);
          if (templateResponse.data) {
            accountData.original_template_name = templateResponse.data.name || 'Unknown Template';
          }
        } catch (error) {
          console.error('Error fetching template details:', error);
          accountData.original_template_name = 'Unknown Template';
        }
      }

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
      const currentHolding = holdingsResponse.data.find((h: AccountHolding) => h.status === 'active');
      if (currentHolding && currentHolding.portfolio_id) {
        const portfolio = portfoliosMap.get(currentHolding.portfolio_id);
        accountData.current_portfolio = {
          id: currentHolding.portfolio_id,
          portfolio_name: portfolio?.portfolio_name || 'Unknown Portfolio',
          assignment_start_date: currentHolding.start_date
        };

        // Get portfolio funds for the current portfolio
        const portfolioFunds = portfolioFundsResponse.data
          .filter((pf: PortfolioFund) => pf.portfolio_id === currentHolding.portfolio_id);
        
        // Calculate total value based on most recent month where all funds have valuations
        let totalValue = 0;
        if (portfolioFunds.length > 0) {
          try {
            // Fetch valuations for all portfolio funds
            const valuationPromises = portfolioFunds.map((pf: PortfolioFund) => 
              api.get(`/fund_valuations?portfolio_fund_id=${pf.id}`)
            );
            
            const valuationResponses = await Promise.all(valuationPromises);
            
            // Create a map of fund ID to valuations, sorted by date (newest first)
            const fundValuationsMap: Map<number, any[]> = new Map();
            
            portfolioFunds.forEach((pf: PortfolioFund, index: number) => {
              const valuations = valuationResponses[index].data;
              if (valuations && valuations.length > 0) {
                // Sort valuations by date in descending order
                fundValuationsMap.set(pf.id, valuations.sort((a: any, b: any) => 
                  new Date(b.valuation_date).getTime() - new Date(a.valuation_date).getTime()
                ));
              } else {
                fundValuationsMap.set(pf.id, []);
              }
            });
            
            // Find the most recent month where all funds have valuations
            let foundCommonMonth = false;
            
            // Start with the newest month from any fund
            let currentMonth: string | null = null;
            let mostRecentValuationDate: string | null = null;
            
            // Find the most recent valuation date from any fund
            for (const [_, valuations] of fundValuationsMap.entries()) {
              if (valuations.length > 0) {
                const valueDate = new Date(valuations[0].valuation_date);
                // Store the most recent valuation date
                if (!mostRecentValuationDate || new Date(valuations[0].valuation_date).getTime() > new Date(mostRecentValuationDate).getTime()) {
                  mostRecentValuationDate = valuations[0].valuation_date;
                }
                // Format as YYYY-MM
                const monthStr = `${valueDate.getFullYear()}-${(valueDate.getMonth() + 1).toString().padStart(2, '0')}`;
                
                if (!currentMonth || monthStr > currentMonth) {
                  currentMonth = monthStr;
                }
              }
            }
            
            // Set the most recent valuation date for display in the header
            setLastValuationDate(mostRecentValuationDate);
            console.log('DEBUG - Most recent valuation date:', mostRecentValuationDate);
            
            // Keep checking months, from newest to oldest, until we find one where all funds have valuations
            while (currentMonth && !foundCommonMonth) {
              const [yearStr, monthStr] = currentMonth.split('-');
              const year = parseInt(yearStr);
              const month = parseInt(monthStr);
              
              // Check if all funds have a valuation for this month
              let allFundsHaveValuation = true;
              let totalForMonth = 0;
              
              for (const [fundId, valuations] of fundValuationsMap.entries()) {
                let fundHasValuation = false;
                
                for (const valuation of valuations) {
                  const valueDate = new Date(valuation.valuation_date);
                  
                  if (valueDate.getFullYear() === year && valueDate.getMonth() + 1 === month) {
                    fundHasValuation = true;
                    totalForMonth += valuation.value;
                    break;
                  }
                }
                
                if (!fundHasValuation) {
                  allFundsHaveValuation = false;
                  break;
                }
              }
              
              if (allFundsHaveValuation) {
                foundCommonMonth = true;
                totalValue = totalForMonth;
              } else {
                // Move to previous month
                if (month === 1) {
                  currentMonth = `${year - 1}-12`;
                } else {
                  currentMonth = `${year}-${(month - 1).toString().padStart(2, '0')}`;
                }
              }
            }
            
            console.log(`Calculated total value ${totalValue} from ${foundCommonMonth ? currentMonth : 'no common month'}`);
          } catch (error) {
            console.error('Error calculating total value from fund valuations:', error);
            // Fallback to amount_invested calculation if valuations fail
            totalValue = portfolioFunds.reduce((sum: number, fund: PortfolioFund) => {
              return sum + (fund.amount_invested || 0);
            }, 0);
          }
        } else {
          // No portfolio funds, total value is 0
          totalValue = 0;
        }

        // Get activity logs for these portfolio funds
        const fundActivities = activityLogsResponse.data.filter((log: any) => 
          portfolioFunds.some((pf: PortfolioFund) => pf.id === log.portfolio_fund_id)
        );

        // Get the account's IRR using the new endpoint
        let accountIrr = 0;
        try {
          const irrResponse = await api.get(`/analytics/account/${accountId}/irr`);
          if (irrResponse.data?.irr !== undefined) {
            accountIrr = irrResponse.data.irr;
          }
        } catch (error) {
          console.error(`Error fetching account IRR:`, error);
        }

        // Set the enriched account data with IRR from the endpoint
        setAccount({
          ...accountData,
          total_value: totalValue,
          irr: accountIrr
        });

        // Process each portfolio fund
        accountData.portfolio_funds = portfolioFunds.map((pf: PortfolioFund) => {
          const fund = fundsMap.get(pf.available_funds_id);
          const activities = fundActivities.filter((log: any) => log.portfolio_fund_id === pf.id);

          // Calculate total units and value
          let totalUnits = 0;
          let totalValue = 0;
          let totalAmountInvested = pf.amount_invested || 0; // Start with amount from portfolio_funds

          activities.forEach((activity: any) => {
            if (activity.units_transacted) {
              totalUnits += activity.units_transacted;
            }
            if (activity.market_value_held) {
              totalValue = activity.market_value_held;
            }
            if (activity.cash_flow_amount) {
              totalAmountInvested += activity.cash_flow_amount;
            }
          });

          return {
            id: pf.id,
            portfolio_id: pf.portfolio_id,
            available_funds_id: pf.available_funds_id,
            target_weighting: pf.target_weighting,
            start_date: pf.start_date,
            end_date: pf.end_date,
            fund_name: fund?.fund_name || 'Unknown Fund',
            amount_invested: totalAmountInvested,
            market_value: totalValue,
            irr: 0 // This would need to be calculated based on the performance data
          };
        });
      }

      // Process holdings for the timeline table
      const holdingsWithDetails = await Promise.all(holdingsResponse.data.map(async (holding: AccountHolding) => {
        if (!holding.portfolio_id) {
          return {
            ...holding,
            portfolio_name: 'No Portfolio',
            fund_name: 'No Fund',
            activities: [],
            irr: 0,
            market_value: 0,
            units: 0,
            price_per_unit: 0
          };
        }

        // Get portfolio funds for this holding's portfolio
        const portfolioFunds = portfolioFundsResponse.data
          .filter((pf: PortfolioFund) => pf.portfolio_id === holding.portfolio_id);

        // Get activity logs for these portfolio funds
        const activities = activityLogsResponse.data
          .filter((log: ActivityLog) => 
            portfolioFunds.some((pf: PortfolioFund) => pf.id === log.portfolio_fund_id)
          );

        // Get the portfolio name
        const portfolio = portfoliosMap.get(holding.portfolio_id);

        // Process each fund's activities
        const fundsWithDetails = await Promise.all(portfolioFunds.map(async (pf: PortfolioFund) => {
          const fund = fundsMap.get(pf.available_funds_id);
          const fundActivities = activities.filter((log: ActivityLog) => log.portfolio_fund_id === pf.id);

          let fundUnits = 0;
          let fundValue = 0;
          let fundAmountInvested = pf.amount_invested || 0;

          fundActivities.forEach((activity: ActivityLog) => {
            if (activity.units_transacted) {
              fundUnits += activity.units_transacted;
            }
            if (activity.market_value_held) {
              fundValue = activity.market_value_held;
            }
            if (activity.cash_flow_amount) {
              fundAmountInvested += activity.cash_flow_amount;
            }
          });

          // Get the latest fund valuation to update the current value
          try {
            const latestValuationResponse = await api.get(`/fund_valuations/latest/${pf.id}`);
            if (latestValuationResponse.data && latestValuationResponse.data.value) {
              // Use the latest valuation for current value, overriding any value from activity logs
              fundValue = latestValuationResponse.data.value;
            }
          } catch (error) {
            // If no valuation exists, keep the value from activity logs
            console.log(`No valuation found for fund ${pf.id}, using value from activities`);
          }

          // Fetch the IRR value for this fund
          let irrValue = 0;
          let irrCalculationDate = undefined;
          try {
            const irrResponse = await api.get(`/portfolio_funds/${pf.id}/latest-irr`);
            irrValue = irrResponse.data?.irr || 0;
            irrCalculationDate = irrResponse.data?.calculation_date;
          } catch (error) {
            console.error(`Error fetching IRR for fund ${pf.id}:`, error);
          }

          return {
            id: pf.id,
            portfolio_id: holding.portfolio_id,
            portfolio_name: portfolio?.portfolio_name || 'Unknown Portfolio',
            fund_id: pf.available_funds_id,
            fund_name: fund?.fund_name || 'Unknown Fund',
            isin_number: fund?.isin_number || 'N/A',
            target_weighting: pf.target_weighting,
            status: holding.status,
            start_date: pf.start_date,
            end_date: pf.end_date,
            units: fundUnits,
            market_value: fundValue,
            price_per_unit: fundUnits > 0 ? fundValue / fundUnits : 0,
            amount_invested: fundAmountInvested,
            activities: fundActivities,
            account_holding_id: holding.id,
            irr: irrValue,
            irr_calculation_date: irrCalculationDate
          };
        }));

        return fundsWithDetails;
      }));

      // Flatten the array of arrays into a single array of holdings
      const flattenedHoldings = holdingsWithDetails.flat();
      setHoldings(flattenedHoldings);
      setActivityLogs(activityLogsResponse.data);
      
      // We will NOT automatically set selectedYear based on earliest activity
      // This ensures we always show the current year by default, and let users
      // navigate to past years manually via the year navigation component
      
    } catch (err: any) {
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

  const handleRecordActivity = async (
    accountHoldingId: number,
    portfolioFundId: number,
    activityType: 'Investment' | 'Withdrawal' | 'Switch' | 'GovernmentUplift' | 'RegularInvestment',
    amount: string,
    activityDate: Date,
    targetPortfolioFundId?: number,
    currentValuation?: string
  ): Promise<void> => {
    if (!accountId) {
      throw new Error('Account ID is required');
    }

    try {
      // Format the date as YYYY-MM-DD
      const year = activityDate.getFullYear();
      const month = String(activityDate.getMonth() + 1).padStart(2, '0');
      const day = String(activityDate.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;

      if (activityType === 'Switch' && targetPortfolioFundId) {
        // For switches with valuation
        if (currentValuation) {
          console.log(`Processing switch with valuation: ${currentValuation}`);
          
          // Get the source fund details
          const sourceFundResponse = await api.get(`/portfolio_funds/${portfolioFundId}`);
          const sourceFund = sourceFundResponse.data;
          const originalInvestment = sourceFund.amount_invested || 0;
          
          // Calculate units to transfer based on valuation
          const switchAmount = parseFloat(amount);
          const valuationAmount = parseFloat(currentValuation);
          
          // Calculate the percentage of units to transfer
          // Percentage = amount to switch / current valuation
          const unitsPercentage = switchAmount / valuationAmount;
          
          // Calculate remaining units in source fund
          // New investment = Original investment × (1 - percentage)
          const newSourceInvestment = originalInvestment * (1 - unitsPercentage);
          
          console.log(`Original investment: ${originalInvestment}, Switch amount: ${switchAmount}, Valuation: ${valuationAmount}`);
          console.log(`Units percentage: ${unitsPercentage}, New source investment: ${newSourceInvestment}`);
          
          // Get target fund current investment
          const targetFundResponse = await api.get(`/portfolio_funds/${targetPortfolioFundId}`);
          const targetFund = targetFundResponse.data;
          const targetInvestment = targetFund.amount_invested || 0;
          
          // Update the funds directly
          await api.patch(`/portfolio_funds/${portfolioFundId}`, {
            amount_invested: newSourceInvestment
          });
          
          await api.patch(`/portfolio_funds/${targetPortfolioFundId}`, {
            amount_invested: targetInvestment + switchAmount
          });
          
          // Create switch activity logs for record-keeping (without updating fund values again)
          const sourceActivity = {
            account_holding_id: accountHoldingId,
            portfolio_fund_id: portfolioFundId,
            activity_type: 'Switch',
            amount: (-switchAmount).toString(), // Negative for source fund
            activity_timestamp: formattedDate,
            target_portfolio_fund_id: targetPortfolioFundId
          };
          
          const targetActivity = {
            account_holding_id: accountHoldingId,
            portfolio_fund_id: targetPortfolioFundId,
            activity_type: 'Switch',
            amount: amount, // Positive for target fund
            activity_timestamp: formattedDate,
            target_portfolio_fund_id: portfolioFundId
          };
          
          // We no longer need to skip fund updates since the backend is properly handling amount_invested
          await api.post('/holding_activity_logs', sourceActivity);
          await api.post('/holding_activity_logs', targetActivity);
        } else {
          // Fallback to original method if no valuation provided
          const sourceActivity = {
            account_holding_id: accountHoldingId,
            portfolio_fund_id: portfolioFundId,
            activity_type: 'Switch',
            amount: (-parseFloat(amount)).toString(), // Convert to negative string for source fund
            activity_timestamp: formattedDate,
            target_portfolio_fund_id: targetPortfolioFundId
          };

          const targetActivity = {
            account_holding_id: accountHoldingId,
            portfolio_fund_id: targetPortfolioFundId,
            activity_type: 'Switch',
            amount: amount, // Keep as string for target fund
            activity_timestamp: formattedDate,
            target_portfolio_fund_id: portfolioFundId
          };

          await api.post('/holding_activity_logs', sourceActivity);
          await api.post('/holding_activity_logs', targetActivity);
        }
      } else {
        // Single activity log for other types
        const activityLog = {
          account_holding_id: accountHoldingId,
          portfolio_fund_id: portfolioFundId,
          activity_type: activityType,
          amount: amount, // Keep as string
          activity_timestamp: formattedDate,
          target_portfolio_fund_id: targetPortfolioFundId
        };

        await api.post('/holding_activity_logs', activityLog);
      }

      await fetchData(accountId); // Refresh the data
    } catch (error) {
      console.error('Error recording activity:', error);
      throw error;
    }
  };

  const handleCloseHolding = (holdingId: number) => {
    // In a real implementation, this would call an API to close the holding
    alert(`Close Holding ${holdingId} functionality would be implemented here`);
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

  // Format date and time
  const formatDateTime = (dateTimeString: string): string => {
    const date = new Date(dateTimeString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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

  // Get a unique color for each provider
  const getProviderColor = (providerName: string | undefined): string => {
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
  };

  // Helper function to convert hex to rgba for opacity control
  const hexToRgba = (hex: string, alpha: number): string => {
    // Remove the hash if it exists
    hex = hex.replace('#', '');
    
    // Parse the hex values to get r, g, b
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    // Return rgba
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  // Add function to handle account deletion
  const handleDeleteAccount = async () => {
    if (!accountId) return;
    
    setIsDeleting(true);
    setDeleteError(null);
    
    try {
      // Step 1: Get all related data for this account
      const accountIdNum = parseInt(accountId);
      
      // Get all account holdings for this account
      const holdingsResponse = await api.get('/account_holdings', {
        params: { client_account_id: accountIdNum }
      });
      
      // Get any holding activity logs for this account's holdings
      const accountHoldingIds = holdingsResponse.data ? 
        holdingsResponse.data.map((h: any) => h.id) : [];
      
      // Get all activity logs linked to these holdings
      const activityLogsPromises = accountHoldingIds.map((holdingId: number) => 
        api.get('/holding_activity_logs', {
          params: { account_holding_id: holdingId }
        })
      );
      
      const activityLogsResponses = await Promise.all(activityLogsPromises);
      const allActivityLogs = activityLogsResponses.flatMap(r => r.data || []);
      
      // Step 2: Get portfolio ID to delete if needed
      let portfolioIdToDelete = null;
      if (account?.current_portfolio) {
        portfolioIdToDelete = account.current_portfolio.id;
      }
      
      // Step 3: Delete in reverse order to avoid foreign key constraint issues
      
      // 3.1: First delete all activity logs
      const deleteActivityPromises = allActivityLogs.map((log: any) => 
        api.delete(`/holding_activity_logs/${log.id}`)
      );
      
      if (deleteActivityPromises.length > 0) {
        await Promise.all(deleteActivityPromises);
      }
      
      // 3.2: Delete all account holdings
      const deleteHoldingPromises = holdingsResponse.data ? 
        holdingsResponse.data.map((holding: any) => 
          api.delete(`/account_holdings/${holding.id}`)
        ) : [];
      
      if (deleteHoldingPromises.length > 0) {
        await Promise.all(deleteHoldingPromises);
      }
      
      // Step 4: Now delete the account (should work now that all references are gone)
      await api.delete(`/client_accounts/${accountId}`);
      
      // Step 5: If there was a portfolio, delete it last
      if (portfolioIdToDelete) {
        try {
          // Get portfolio funds to delete
          const portfolioFundsResponse = await api.get('/portfolio_funds', {
            params: { portfolio_id: portfolioIdToDelete }
          });
          
          // Delete all portfolio_funds entries
          if (portfolioFundsResponse.data && portfolioFundsResponse.data.length > 0) {
            const deletePortfolioFundPromises = portfolioFundsResponse.data.map((pf: any) => 
              api.delete(`/portfolio_funds/${pf.id}`)
            );
            
            await Promise.all(deletePortfolioFundPromises);
          }
          
          // Finally delete the portfolio
          await api.delete(`/portfolios/${portfolioIdToDelete}`);
        } catch (portfolioError: any) {
          console.error('Error deleting portfolio:', portfolioError);
          // Continue with the redirect even if portfolio deletion fails
        }
      }
      
      // Navigate back to accounts list
      navigate('/accounts', { 
        state: { 
          notification: {
            type: 'success',
            message: 'Account deleted successfully'
          }
        }
      });
    } catch (err: any) {
      console.error('Error deleting account:', err);
      setDeleteError(err.response?.data?.detail || 'Failed to delete account');
      setIsDeleting(false);
    }
  };

  // Add delete confirmation modal component
  const DeleteConfirmationModal = () => {
    if (!isDeleteModalOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-md w-full p-6">
          <div className="flex items-start">
            <div className="flex-shrink-0 text-red-600">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-medium text-gray-900">Delete Account</h3>
              <div className="mt-2">
                <p className="text-sm text-gray-500">
                  Are you sure you want to delete this account? This action cannot be undone.
                </p>
                {account?.current_portfolio && (
                  <p className="mt-2 text-sm font-medium text-red-600">
                    Warning: The associated portfolio "{account.current_portfolio.portfolio_name}" will also be deleted.
                  </p>
                )}
                {deleteError && (
                  <p className="mt-2 text-sm text-red-600">
                    Error: {deleteError}
                  </p>
                )}
              </div>
            </div>
          </div>
          <div className="mt-6 flex space-x-3 justify-end">
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => setIsDeleteModalOpen(false)}
              className="inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={handleDeleteAccount}
              className={`inline-flex justify-center px-4 py-2 text-sm font-medium text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 ${
                isDeleting ? 'bg-red-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {isDeleting ? 'Deleting...' : 'Delete Account'}
            </button>
          </div>
        </div>
      </div>
    );
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

  // Add delete confirmation modal component
  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-center items-center py-16">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  if (error || !account) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
      </div>
    );
  }

  return (
    <>
      <DeleteConfirmationModal />
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div 
        className="mb-6 shadow-sm rounded-lg border border-gray-100 relative overflow-hidden animate-fadeIn"
        style={{
          background: account && account.provider_name 
            ? `linear-gradient(105deg, ${hexToRgba(getProviderColor(account.provider_name), 0.15)}, white 85%)` 
            : 'white'
        }}
      >
        <Link to="/accounts" className="absolute left-4 top-4 text-indigo-600 hover:text-indigo-900 transition-colors duration-200">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between p-6">
          <div>
            <div className="flex items-center">
              <div className="pl-9">
                <h1 className="text-4xl font-normal text-gray-900 font-sans tracking-wide">
                  {account.client_name}'s {account.account_name}
                  {account.provider_name && (
                    <span className="ml-3 inline-flex items-center bg-white bg-opacity-70 rounded-full px-3 py-0.5 shadow-sm">
                      <div 
                        className="h-3 w-3 rounded-full mr-2 flex-shrink-0" 
                        style={{ backgroundColor: getProviderColor(account.provider_name) }}
                      ></div>
                      <span className="text-base font-medium" style={{ color: hexToRgba(getProviderColor(account.provider_name), 0.9) }}>
                        {account.provider_name}
                      </span>
                    </span>
                  )}
                </h1>
            <div className="mt-0 flex flex-col space-y-1">
                  <div className="flex items-center">
                  <Link to={`/clients/${account.client_id}`} className="text-base font-medium text-gray-600 hover:text-primary-700 transition-colors duration-200 font-sans tracking-wide">
                    Client: {account.client_name}
              </Link>
                  <span className="mx-2 text-gray-400">•</span>
                  <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
                account.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {account.status}
              </span>
            </div>
                  
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="font-medium">Portfolio Type:</span>
                    <span className="ml-1">
                      {account.is_bespoke === true ? (
                        <span className="text-purple-700">Bespoke</span>
                      ) : account.is_bespoke === false ? (
                        <span className="text-blue-700">{account.original_template_name || 'Template'}</span>
                      ) : (
                        'N/A'
                      )}
                    </span>
          </div>
                  
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="font-medium">Plan Number:</span>
                    <span className="ml-1">{account.plan_number || 'N/A'}</span>
                  </div>
                  
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="font-medium">Start Date:</span>
                    <span className="ml-1">{formatDate(account.start_date)}</span>
                  </div>
                  
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="font-medium">Total Invested:</span>
                    <span className="ml-1">{formatCurrency(calculateTotalAmountInvested(holdings))}</span>
                  </div>
            </div>
          </div>
          </div>
        </div>

          <div className="flex flex-col gap-4 mt-4 md:mt-0 w-64">
            {/* Key Metrics stacked vertically */}
            <div className="py-3 pb-0">
              <div className="flex flex-col items-end">
                <span className="text-5xl font-semibold text-gray-900 font-sans tracking-tight">
                  {account.total_value ? formatCurrency(account.total_value) : 'N/A'}
                </span>
                <span className="text-sm font-semibold text-gray-600 mt-1">
                  {lastValuationDate ? `Valued: ${formatDate(lastValuationDate)}` : 'Valuation date not available'}
                </span>
              </div>
            </div>

            {/* Empty space where the duplicate valuation date was */}
            <div className="py-1"></div>

            <div className="py-1">
              <div className="flex justify-end">
                <span className={`text-2xl font-semibold ${account.irr && account.irr >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              {account.irr !== undefined ? (
                <>
                  {formatPercentage(account.irr / 100)}
                  <span className="ml-1">
                    {account.irr >= 0 ? '▲' : '▼'}
                  </span>
                </>
              ) : 'N/A'}
                </span>
            </div>
          </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <nav className="flex space-x-2 px-2 py-2 bg-gray-50 rounded-lg">
          <button
            onClick={() => setActiveTab('info')}
            className={`${
              activeTab === 'info'
                ? 'bg-primary-700 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
            } rounded-lg px-4 py-2 font-medium text-base transition-all duration-200 ease-in-out`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('holdings')}
            className={`${
              activeTab === 'holdings'
                ? 'bg-primary-700 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
            } rounded-lg px-4 py-2 font-medium text-base transition-all duration-200 ease-in-out`}
          >
            IRR Calculation
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`${
              activeTab === 'activity'
                ? 'bg-primary-700 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
            } rounded-lg px-4 py-2 font-medium text-base transition-all duration-200 ease-in-out`}
          >
            IRR History
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white shadow rounded-lg">
        {/* Info Tab */}
        {activeTab === 'info' && (
          <div className="p-6">
            {/* Fund Summary Table */}
            <div className="mb-8">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0 h-8 w-8 rounded-md bg-primary-100 flex items-center justify-center mr-3">
                  <svg className="h-5 w-5 text-primary-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-primary-800 font-sans tracking-wide leading-none my-auto">Fund Summary</h2>
              </div>
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full table-fixed divide-y divide-gray-200">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="w-[20%] px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300">
                        <div className="flex items-center group cursor-pointer hover:bg-indigo-50 rounded py-1 px-1 transition-colors duration-150">
                          Fund Name
                          <span className="ml-1 text-gray-400 group-hover:text-indigo-500">
                            <svg className="h-4 w-4 opacity-0 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4" />
                            </svg>
                          </span>
                        </div>
                      </th>
                      <th className="w-[15%] px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300">
                        <div className="flex items-center group cursor-pointer hover:bg-indigo-50 rounded py-1 px-1 transition-colors duration-150">
                          ISIN Number
                          <span className="ml-1 text-gray-400 group-hover:text-indigo-500">
                            <svg className="h-4 w-4 opacity-0 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4" />
                            </svg>
                          </span>
                        </div>
                      </th>
                      <th className="w-[15%] px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300">
                        <div className="flex items-center group cursor-pointer hover:bg-indigo-50 rounded py-1 px-1 transition-colors duration-150">
                          Latest Valuation
                          <span className="ml-1 text-gray-400 group-hover:text-indigo-500">
                            <svg className="h-4 w-4 opacity-0 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4" />
                            </svg>
                          </span>
                        </div>
                      </th>
                      <th className="w-[15%] px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300">
                        <div className="flex items-center group cursor-pointer hover:bg-indigo-50 rounded py-1 px-1 transition-colors duration-150">
                          Weighting
                          <span className="ml-1 text-gray-400 group-hover:text-indigo-500">
                            <svg className="h-4 w-4 opacity-0 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4" />
                            </svg>
                          </span>
                        </div>
                      </th>
                      <th className="w-[15%] px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300">
                        <div className="flex items-center group cursor-pointer hover:bg-indigo-50 rounded py-1 px-1 transition-colors duration-150">
                          Risk Factor
                          <span className="ml-1 text-gray-400 group-hover:text-indigo-500">
                            <svg className="h-4 w-4 opacity-0 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4" />
                            </svg>
                          </span>
                        </div>
                      </th>
                      <th className="w-[20%] px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300">
                        <div className="flex items-center group cursor-pointer hover:bg-indigo-50 rounded py-1 px-1 transition-colors duration-150">
                          Last IRR
                          <span className="ml-1 text-gray-400 group-hover:text-indigo-500">
                            <svg className="h-4 w-4 opacity-0 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4" />
                            </svg>
                          </span>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {holdings
                      .slice()
                      .sort((a, b) => {
                        // Place 'Cashline' fund at the end
                        if (a.fund_name === 'Cashline' || a.isin_number === 'CASHLINE') return 1;
                        if (b.fund_name === 'Cashline' || b.isin_number === 'CASHLINE') return -1;
                        // Sort the rest alphabetically
                        return (a.fund_name || '').localeCompare(b.fund_name || '');
                      })
                      .map((holding) => (
                      <tr key={holding.id} className="cursor-pointer hover:bg-indigo-50 transition-colors duration-150">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {holding.fund_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {holding.isin_number || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {holding.market_value ? formatCurrency(holding.market_value) : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          {holding.target_weighting !== undefined ? formatPercentage(parseFloat(holding.target_weighting)) : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            holding.risk_level === 'low' ? 'bg-green-100 text-green-800' : 
                            holding.risk_level === 'medium' ? 'bg-yellow-100 text-yellow-800' : 
                            holding.risk_level === 'high' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {getFundRiskRating(holding.fund_id || 0, fundsData) || 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {holding.irr !== undefined ? (
                            <span className={`text-sm ${holding.irr >= 0 ? 'text-green-700' : 'text-red-700'} font-medium`}>
                              {formatPercentage(holding.irr / 100)}
                              <span className="ml-1">
                                {holding.irr >= 0 ? '▲' : '▼'}
                              </span>
                            </span>
                          ) : (
                            <span className="text-sm text-gray-500">N/A</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {holdings.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                          No funds found for this account.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
            <div className="flex items-center mb-6 pb-2 border-b border-gray-200">
              <div className="flex-shrink-0 h-8 w-8 rounded-md bg-primary-100 flex items-center justify-center mr-3">
                <svg className="h-5 w-5 text-primary-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                </svg>
            </div>
              <h2 className="text-xl font-semibold text-primary-800 font-sans tracking-wide leading-none my-auto">Account Information</h2>
              {/* Add account name if available */}
              {account.account_name && (
                <div className="ml-auto flex items-center">
                  <span className="text-sm font-medium text-gray-500 mr-2">Account:</span>
                  <span className="text-sm font-bold text-gray-900 bg-gray-100 px-3 py-1 rounded-full">
                    {account.account_name}
                  </span>
                </div>
              )}
            </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Account Details Section */}
                <div className="bg-gray-50 rounded-lg p-5">
                  <h3 className="text-lg font-medium text-gray-900 mb-4 pb-2 border-b border-gray-200">Account Details</h3>
                <dl className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center">
                      <dt className="w-full sm:w-1/3 text-sm font-medium text-gray-600 mb-1 sm:mb-0">Product:</dt>
                      <dd className="w-full sm:w-2/3 text-sm font-semibold text-gray-900">{account.product_name}</dd>
                  </div>
                    <div className="flex flex-col sm:flex-row sm:items-center">
                      <dt className="w-full sm:w-1/3 text-sm font-medium text-gray-600 mb-1 sm:mb-0">Provider:</dt>
                      <dd className="w-full sm:w-2/3 text-sm font-semibold text-gray-900">{account.provider_name}</dd>
                  </div>
                    <div className="flex flex-col sm:flex-row sm:items-center">
                      <dt className="w-full sm:w-1/3 text-sm font-medium text-gray-600 mb-1 sm:mb-0">Portfolio Type:</dt>
                      <dd className="w-full sm:w-2/3 text-sm font-semibold text-gray-900">
                        {account.is_bespoke === true ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            Bespoke
                          </span>
                        ) : account.is_bespoke === false ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {account.original_template_name || 'Template-based'}
                          </span>
                        ) : (
                          'N/A'
                        )}
                      </dd>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center">
                      <dt className="w-full sm:w-1/3 text-sm font-medium text-gray-600 mb-1 sm:mb-0">Plan Number:</dt>
                      <dd className="w-full sm:w-2/3 text-sm font-semibold text-gray-900">
                      {account.plan_number || 'N/A'}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

              {/* Portfolio Section */}
              <div className="mt-8 border-t border-gray-200 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Fund Information</h3>
                {account.current_portfolio ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 table-fixed">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="w-1/6 px-4 py-3 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Fund Name</th>
                          <th className="w-1/6 px-4 py-3 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">ISIN</th>
                          <th className="w-1/6 px-4 py-3 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Last Valuation</th>
                          <th className="w-1/6 px-4 py-3 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Weighting %</th>
                          <th className="w-1/6 px-4 py-3 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Risk Level</th>
                          <th className="w-1/6 px-4 py-3 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Last IRR</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {holdings.length > 0 ? (
                          holdings.map((holding) => (
                            <tr key={holding.id}>
                              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{holding.fund_name}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{holding.isin_number || 'N/A'}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{holding.market_value ? formatCurrency(holding.market_value) : 'N/A'}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{holding.target_weighting ? formatPercentage(parseFloat(holding.target_weighting)) : 'N/A'}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{holding.risk_level || 'N/A'}</td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm">
                                <span className={`${holding.irr && holding.irr >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                  {holding.irr !== undefined ? (
                                    <>
                                      {formatPercentage(holding.irr / 100)}
                                      <span className="ml-1">
                                        {holding.irr >= 0 ? '▲' : '▼'}
                                      </span>
                                    </>
                                  ) : 'N/A'}
                                </span>
                              </td>
                            </tr>
                          ))

                        ) : (
                          'N/A'
                        )}
                      </dd>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center">
                      <dt className="w-full sm:w-1/3 text-sm font-medium text-gray-600 mb-1 sm:mb-0">Start Date:</dt>
                      <dd className="w-full sm:w-2/3 text-sm font-semibold text-gray-900">{formatDate(account.start_date)}</dd>
                    </div>
                    {account.end_date && (
                      <div className="flex flex-col sm:flex-row sm:items-center">
                        <dt className="w-full sm:w-1/3 text-sm font-medium text-gray-600 mb-1 sm:mb-0">End Date:</dt>
                        <dd className="w-full sm:w-2/3 text-sm font-semibold text-gray-900">{formatDate(account.end_date)}</dd>
                      </div>
                    )}
                    <div className="flex flex-col sm:flex-row sm:items-center">
                      <dt className="w-full sm:w-1/3 text-sm font-medium text-gray-600 mb-1 sm:mb-0">Status:</dt>
                      <dd className="w-full sm:w-2/3 text-sm font-semibold text-gray-900">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          account.status === 'Active' ? 'bg-green-100 text-green-800' :
                          account.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                          account.status === 'Closed' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          <span className={`mr-1.5 h-2 w-2 rounded-full ${
                            account.status === 'Active' ? 'bg-green-500' :
                            account.status === 'Pending' ? 'bg-yellow-500' :
                            account.status === 'Closed' ? 'bg-red-500' :
                            'bg-gray-500'
                          }`}></span>
                          {account.status || 'Unknown'}
                        </span>
                      </dd>
                    </div>
                    {account.is_bespoke === false && account.original_template_id && (
                      <div className="flex flex-col sm:flex-row sm:items-center">
                        <dt className="w-full sm:w-1/3 text-sm font-medium text-gray-600 mb-1 sm:mb-0">Template:</dt>
                        <dd className="w-full sm:w-2/3 text-sm font-semibold text-gray-900">
                          <Link 
                            to={`/portfolio-templates/${account.original_template_id}`} 
                            className="inline-flex items-center text-indigo-600 hover:text-indigo-900 transition-colors duration-150"
                          >
                            View Details
                            <svg className="ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </Link>
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>
              </div>
              
              {/* Account Value Summary */}
              {account.total_value !== undefined && (
                <div className="mt-6 pt-5 border-t border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-indigo-50 rounded-lg p-4 text-center">
                      <p className="text-xs font-medium text-indigo-700 uppercase mb-1">Total Value</p>
                      <p className="text-2xl font-bold text-indigo-800">{formatCurrency(account.total_value)}</p>
                    </div>
                    
                    {account.irr !== undefined && (
                      <div className={`${account.irr >= 0 ? 'bg-green-50' : 'bg-red-50'} rounded-lg p-4 text-center`}>
                        <p className={`text-xs font-medium ${account.irr >= 0 ? 'text-green-700' : 'text-red-700'} uppercase mb-1`}>
                          Performance (IRR)
                        </p>
                        <p className={`text-2xl font-bold flex justify-center items-center ${account.irr >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                          {formatPercentage(account.irr / 100)}
                          <span className="ml-1 text-lg">
                            {account.irr >= 0 ? '▲' : '▼'}
                          </span>
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Danger Zone */}
              <div className="p-3 mt-2 border-t border-gray-200">
                <div className="flex justify-between items-center p-2 border border-red-200 rounded-md bg-red-50 shadow-sm">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-5 w-5 rounded-md bg-red-100 flex items-center justify-center mr-2">
                      <svg className="h-3 w-3 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                    <span className="text-sm font-medium text-red-700 my-auto">Danger Zone</span>
                </div>
                        <button
                          type="button"
                          onClick={() => setIsDeleteModalOpen(true)}
                    className="inline-flex items-center px-3 py-1.5 border border-red-300 text-xs font-medium rounded text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200 shadow-sm"
                    title={`Warning: Once you delete an account, there is no going back. ${account.portfolio_id ? 'This will also delete the associated portfolio.' : ''}`}
                        >
                    <svg className="h-3 w-3 mr-1 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                          Delete Account
                        </button>
                  </div>
                </div>
          </div>
        )}

        {/* Holdings Tab */}
        {activeTab === 'holdings' && (
          <div className="p-6">
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
                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">
                            Name
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">
                            ISIN
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">
                            Investments
                        </th>
                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">
                            Regular Investments
                        </th>
                          <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">
                            Government Uplifts
                          </th>
                          <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">
                            Switch Ins
                          </th>
                          <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">
                            Switch Outs
                          </th>
                          <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">
                            Withdrawals
                          </th>
                          <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">
                            Most Recent Value
                          </th>
                          <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">
                            Value Minus Withdrawals
                          </th>
                          <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">
                            Investments + Switch Ins
                          </th>
                          <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">
                            Most Recent IRR
                          </th>
                          <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">
                            Risk
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {holdings
                        .slice()
                          .sort((a, b) => {
                            // Place 'Cashline' fund at the end
                            if (a.fund_name === 'Cashline') return 1;
                            if (b.fund_name === 'Cashline') return -1;
                            // Sort the rest alphabetically
                            return (a.fund_name || '').localeCompare(b.fund_name || '');
                          })
                        .map((holding) => (
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
                              <div className="text-sm text-gray-900">{formatCurrency(calculateValueMinusWithdrawals(holding.market_value || 0, activityLogs, holding.id))}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{formatCurrency(calculateInvestmentsPlusSwitchIns(activityLogs, holding.id))}</div>
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
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{getFundRiskRating(holding.fund_id || 0, fundsData)}</div>
                          </td>
                        </tr>
                      ))}
                      
                      {/* Totals Row */}
                      <tr className="bg-gray-50 font-semibold">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-base font-bold text-gray-900">Totals</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {/* No ISIN for totals */}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-bold text-gray-900">{formatCurrency(calculateTotalAmountInvested(holdings))}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-bold text-gray-900">{formatCurrency(calculateTotalRegularInvestments(activityLogs, holdings))}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-bold text-gray-900">{formatCurrency(calculateTotalGovernmentUplifts(activityLogs, holdings))}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-bold text-gray-900">{formatCurrency(calculateTotalSwitchIns(activityLogs, holdings))}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-bold text-gray-900">{formatCurrency(calculateTotalSwitchOuts(activityLogs, holdings))}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-bold text-gray-900">{formatCurrency(calculateTotalWithdrawals(activityLogs, holdings))}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-bold text-gray-900">{formatCurrency(calculateTotalValue(holdings))}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-bold text-gray-900">{formatCurrency(calculateTotalValueMinusWithdrawals(holdings, activityLogs))}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-bold text-gray-900">{formatCurrency(calculateTotalInvestmentsPlusSwitchIns(activityLogs, holdings))}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {/* No average IRR calculation */}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {/* No risk rating for totals */}
                        </td>
                      </tr>
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
        )}

        {/* Activity Log Tab */}
        {activeTab === 'activity' && (
          <div className="p-6">
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
              
              <YearNavigator 
                selectedYear={selectedYear}
                onYearChange={(year) => setSelectedYear(year)}
              />
            
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
        )}
      </div>
    </div>
    </>
  );
};

export default AccountDetails;
