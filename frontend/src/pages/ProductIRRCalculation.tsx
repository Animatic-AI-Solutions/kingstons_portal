import React, { useState, useEffect, Fragment, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import EditableMonthlyActivitiesTable from '../components/EditableMonthlyActivitiesTable';
import IRRCalculationModal from '../components/IRRCalculationModal';
import { calculatePortfolioIRRForDate, calculatePortfolioIRR, getLatestPortfolioIRR, calculateStandardizedMultipleFundsIRR, calculateStandardizedSingleFundIRR } from '../services/api';
import { Dialog, Transition } from '@headlessui/react';
import { formatCurrency, formatPercentage } from '../utils/formatters';
import { isCashFund } from '../utils/fundUtils';

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
  provider_id?: number;
  provider_name?: string;
  provider_theme_color?: string;
  product_type?: string;
  portfolio_id?: number;
  portfolio_name?: string;
  notes?: string;
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
  product_id?: number;
  isVirtual?: boolean;
  inactiveHoldingIds?: Array<{
    id: number;
    fund_id?: number;
    fund_name?: string;
  }>;
  end_date?: string;
  status?: string;
  valuation_date?: string;
}

interface ActivityLog {
  id: number;
  product_id: number;
  portfolio_fund_id: number;
  activity_timestamp: string;
  activity_type: string;
  amount: number;
  units_transacted?: number;
  market_value_held?: number;
  cash_flow_amount?: number;
  account_holding_id?: number; // Keep for backward compatibility
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
  // Add debug logging to help diagnose filtering issues
  console.log(`calculateActivityTotalByType: Searching for type='${type}' and fundId=${fundId}`);
  console.log(`Total activity logs to search: ${activities.length}`);
  
  if (activities.length > 0) {
    console.log('First activity log as reference:', {
      id: activities[0].id,
      portfolio_fund_id: activities[0].portfolio_fund_id,
      activity_type: activities[0].activity_type,
      amount: activities[0].amount
    });
  }
  
  const matchingActivities = activities.filter(activity => {
    const typeMatches = activity.activity_type === type;
    const fundMatches = activity.portfolio_fund_id === fundId;
    
    if (activity.portfolio_fund_id === fundId) {
      console.log(`Found activity with matching fundId ${fundId}, type: ${activity.activity_type}, matches type filter: ${typeMatches}`);
    }
    
    return typeMatches && fundMatches;
  });
  
  console.log(`calculateActivityTotalByType: found ${matchingActivities.length} ${type} activities for fund ${fundId}`);
  
  if (matchingActivities.length > 0) {
    console.log(`Sample activity for ${type}:`, matchingActivities[0]);
  }
  
  const total = matchingActivities.reduce((total, activity) => total + Math.abs(activity.amount), 0);
  console.log(`Total amount for ${type} activities in fund ${fundId}: ${total}`);
  
  return total;
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
  return calculateActivityTotalByType(activities, 'FundSwitchIn', fundId);
};

const calculateSwitchOuts = (activities: ActivityLog[], fundId: number): number => {
  return calculateActivityTotalByType(activities, 'FundSwitchOut', fundId);
};

const calculateProductSwitchIns = (activities: ActivityLog[], fundId: number): number => {
  return calculateActivityTotalByType(activities, 'Product Switch In', fundId);
};

const calculateProductSwitchOuts = (activities: ActivityLog[], fundId: number): number => {
  return calculateActivityTotalByType(activities, 'Product Switch Out', fundId);
};

const calculateWithdrawals = (activities: ActivityLog[], fundId: number): number => {
  return calculateActivityTotalByType(activities, 'Withdrawal', fundId);
};



const calculateInvestmentsPlusSwitchIns = (activities: ActivityLog[], fundId: number): number => {
  const investments = calculateInvestments(activities, fundId);
  const regularInvestments = calculateRegularInvestments(activities, fundId);
  const governmentUplifts = calculateGovernmentUplifts(activities, fundId);
  const switchIns = calculateSwitchIns(activities, fundId);
  const productSwitchIns = calculateProductSwitchIns(activities, fundId);
  
  return investments + regularInvestments + governmentUplifts + switchIns + productSwitchIns;
};

const calculateValueMinusWithdrawals = (marketValue: number, activities: ActivityLog[], fundId: number): number => {
  const withdrawals = calculateWithdrawals(activities, fundId);
  const switchOuts = calculateSwitchOuts(activities, fundId);
  const productSwitchOuts = calculateProductSwitchOuts(activities, fundId);
  
  return marketValue + withdrawals + switchOuts + productSwitchOuts;
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
  // Log before filtering
  console.log("Filtering inactive holdings from:", holdings.length, "holdings");
  
  // Before filtering, log the exact values for debugging
  console.log("All holdings status values:", holdings.map(h => ({ 
    id: h.id, 
    name: h.fund_name, 
    statusValue: h.status, 
    statusType: typeof h.status,
    statusLowerCase: h.status?.toLowerCase?.()
  })));
  
  const inactiveHoldings = holdings.filter(holding => {
    // ONLY check if status is explicitly set to 'inactive' with string comparison
    const rawStatus = holding.status;
    const statusString = typeof rawStatus === 'string' ? rawStatus.toLowerCase() : String(rawStatus).toLowerCase();
    const isStatusInactive = statusString === 'inactive';
    
    // Debug log for each holding with more details
    console.log(`Holding ID ${holding.id} (${holding.fund_name}):`, {
      rawStatus,
      statusString,
      isStatusInactive,
      // Still log end_date for reference but don't use it
      end_date: holding.end_date,
      isInactive: isStatusInactive // Only using status now
    });
    
    // ONLY return true if status is inactive
    return isStatusInactive;
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
  
  // Don't calculate IRR for Previous Funds as we'll always display N/A
  
  // Find the most recent IRR calculation date among inactive holdings
  const sortedDates = inactiveHoldings
    .filter(h => h.irr_calculation_date)
    .map(h => h.irr_calculation_date)
    .sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime());
  
  const latestCalculationDate = sortedDates.length > 0 ? sortedDates[0] : undefined;
  
  // Find the most recent valuation date among inactive holdings
  const sortedValuationDates = inactiveHoldings
    .filter(h => h.valuation_date)
    .map(h => h.valuation_date)
    .sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime());
  
  const latestValuationDate = sortedValuationDates.length > 0 ? sortedValuationDates[0] : undefined;
  
  const previousFundsEntry = {
    id: -1, // Special ID for the virtual fund
    fund_name: 'Previous Funds', // Distinctive name
    amount_invested: totalAmountInvested,
    market_value: totalMarketValue, // Include market value for consistency
    irr: undefined, // Don't set an IRR value since we'll display N/A
    irr_calculation_date: latestCalculationDate,
    valuation_date: latestValuationDate, // Add valuation date for the virtual fund
    account_holding_id: -1,
    product_id: -1, // Set product_id for virtual entry
    isVirtual: true, // Flag to identify this as a virtual entry
    isin_number: 'N/A', // Added to satisfy type requirements
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

// Helper functions to calculate Previous Funds totals from inactive holdings
const calculatePreviousFundsInvestments = (activities: ActivityLog[], inactiveHoldings: Holding[]): number => {
  return inactiveHoldings.reduce((total, holding) => {
    return total + calculateInvestments(activities, holding.id);
  }, 0);
};

const calculatePreviousFundsRegularInvestments = (activities: ActivityLog[], inactiveHoldings: Holding[]): number => {
  return inactiveHoldings.reduce((total, holding) => {
    return total + calculateRegularInvestments(activities, holding.id);
  }, 0);
};

const calculatePreviousFundsGovernmentUplifts = (activities: ActivityLog[], inactiveHoldings: Holding[]): number => {
  return inactiveHoldings.reduce((total, holding) => {
    return total + calculateGovernmentUplifts(activities, holding.id);
  }, 0);
};

const calculatePreviousFundsSwitchIns = (activities: ActivityLog[], inactiveHoldings: Holding[]): number => {
  return inactiveHoldings.reduce((total, holding) => {
    return total + calculateSwitchIns(activities, holding.id);
  }, 0);
};

const calculatePreviousFundsSwitchOuts = (activities: ActivityLog[], inactiveHoldings: Holding[]): number => {
  return inactiveHoldings.reduce((total, holding) => {
    return total + calculateSwitchOuts(activities, holding.id);
  }, 0);
};

const calculatePreviousFundsProductSwitchIns = (activities: ActivityLog[], inactiveHoldings: Holding[]): number => {
  return inactiveHoldings.reduce((total, holding) => {
    return total + calculateProductSwitchIns(activities, holding.id);
  }, 0);
};

const calculatePreviousFundsProductSwitchOuts = (activities: ActivityLog[], inactiveHoldings: Holding[]): number => {
  return inactiveHoldings.reduce((total, holding) => {
    return total + calculateProductSwitchOuts(activities, holding.id);
  }, 0);
};



const calculatePreviousFundsWithdrawals = (activities: ActivityLog[], inactiveHoldings: Holding[]): number => {
  return inactiveHoldings.reduce((total, holding) => {
    return total + calculateWithdrawals(activities, holding.id);
  }, 0);
};

const calculateTotalRegularInvestments = (activities: ActivityLog[], holdings: Holding[]): number => {
  console.log('Calculating total regular investments...');
  console.log(`Activities count: ${activities.length}, Holdings count: ${holdings.length}`);
  
  // Include ALL real holdings (active and inactive) but exclude virtual entries
  const allRealHoldings = holdings.filter(h => !h.isVirtual);
  const total = allRealHoldings.reduce((total, holding) => {
    const amount = calculateRegularInvestments(activities, holding.id);
    console.log(`Regular investments for holding ${holding.id} (${holding.fund_name}): ${amount}`);
    return total + amount;
  }, 0);
  
  console.log(`Total regular investments: ${total}`);
  return total;
};

const calculateTotalGovernmentUplifts = (activities: ActivityLog[], holdings: Holding[]): number => {
  console.log('Calculating total government uplifts...');
  
  // Include ALL real holdings (active and inactive) but exclude virtual entries
  const allRealHoldings = holdings.filter(h => !h.isVirtual);
  const total = allRealHoldings.reduce((total, holding) => {
    const amount = calculateGovernmentUplifts(activities, holding.id);
    console.log(`Government uplifts for holding ${holding.id} (${holding.fund_name}): ${amount}`);
    return total + amount;
  }, 0);
  
  console.log(`Total government uplifts: ${total}`);
  return total;
};

const calculateTotalSwitchIns = (activities: ActivityLog[], holdings: Holding[]): number => {
  console.log('Calculating total fund switch ins...');
  
  // Include ALL real holdings (active and inactive) but exclude virtual entries
  const allRealHoldings = holdings.filter(h => !h.isVirtual);
  const total = allRealHoldings.reduce((total, holding) => {
    const amount = calculateSwitchIns(activities, holding.id);
    console.log(`Fund switch ins for holding ${holding.id} (${holding.fund_name}): ${amount}`);
    return total + amount;
  }, 0);
  
  console.log(`Total fund switch ins: ${total}`);
  return total;
};

const calculateTotalSwitchOuts = (activities: ActivityLog[], holdings: Holding[]): number => {
  console.log('Calculating total fund switch outs...');
  
  // Include ALL real holdings (active and inactive) but exclude virtual entries
  const allRealHoldings = holdings.filter(h => !h.isVirtual);
  const total = allRealHoldings.reduce((total, holding) => {
    const amount = calculateSwitchOuts(activities, holding.id);
    console.log(`Fund switch outs for holding ${holding.id} (${holding.fund_name}): ${amount}`);
    return total + amount;
  }, 0);
  
  console.log(`Total fund switch outs: ${total}`);
  return total;
};

const calculateTotalProductSwitchIns = (activities: ActivityLog[], holdings: Holding[]): number => {
  console.log('Calculating total product switch ins...');
  
  // Include ALL real holdings (active and inactive) but exclude virtual entries
  const allRealHoldings = holdings.filter(h => !h.isVirtual);
  const total = allRealHoldings.reduce((total, holding) => {
    const amount = calculateProductSwitchIns(activities, holding.id);
    console.log(`Product switch ins for holding ${holding.id} (${holding.fund_name}): ${amount}`);
    return total + amount;
  }, 0);
  
  console.log(`Total product switch ins: ${total}`);
  return total;
};

const calculateTotalProductSwitchOuts = (activities: ActivityLog[], holdings: Holding[]): number => {
  console.log('Calculating total product switch outs...');
  
  // Include ALL real holdings (active and inactive) but exclude virtual entries
  const allRealHoldings = holdings.filter(h => !h.isVirtual);
  const total = allRealHoldings.reduce((total, holding) => {
    const amount = calculateProductSwitchOuts(activities, holding.id);
    console.log(`Product switch outs for holding ${holding.id} (${holding.fund_name}): ${amount}`);
    return total + amount;
  }, 0);
  
  console.log(`Total product switch outs: ${total}`);
  return total;
};

const calculateTotalWithdrawals = (activities: ActivityLog[], holdings: Holding[]): number => {
  console.log('Calculating total withdrawals...');
  
  // Include ALL real holdings (active and inactive) but exclude virtual entries
  const allRealHoldings = holdings.filter(h => !h.isVirtual);
  const total = allRealHoldings.reduce((total, holding) => {
    const amount = calculateActivityTotalByType(activities, 'Withdrawal', holding.id);
    console.log(`Withdrawals for holding ${holding.id} (${holding.fund_name}): ${amount}`);
    return total + amount;
  }, 0);
  
  console.log(`Total withdrawals: ${total}`);
  return total;
};



const calculateTotalValue = (holdings: Holding[]): number => {
  return holdings.reduce((total, holding) => {
    // Skip Previous Funds virtual entry and inactive holdings when calculating total market value
    if (holding.isVirtual || holding.status === 'inactive') {
      return total;
    }
    return total + (holding.market_value || 0);
  }, 0);
};



const calculateTotalValueMinusWithdrawals = (holdings: Holding[], activities: ActivityLog[]): number => {
  // Include ALL real holdings (active and inactive) but exclude virtual entries
  const allRealHoldings = holdings.filter(h => !h.isVirtual);
  return allRealHoldings.reduce((total, holding) => 
    total + calculateValueMinusWithdrawals(holding.market_value || 0, activities, holding.id), 0);
};

const calculateTotalInvestmentsPlusSwitchIns = (activities: ActivityLog[], holdings: Holding[]): number => {
  // Include ALL real holdings (active and inactive) but exclude virtual entries
  const allRealHoldings = holdings.filter(h => !h.isVirtual);
  return allRealHoldings.reduce((total, holding) => total + calculateInvestmentsPlusSwitchIns(activities, holding.id), 0);
};

// Add this new function to filter activity logs by year
const filterActivitiesByYear = (activities: ActivityLog[], year: number): ActivityLog[] => {
  console.log(`Filtering activities for year ${year}...`);
  console.log(`Total activities before filtering: ${activities.length}`);
  
  const filteredActivities = activities.filter(activity => {
    // Convert activity_timestamp to a Date object
    const activityDate = new Date(activity.activity_timestamp);
    const activityYear = activityDate.getFullYear();
    const matches = activityYear === year;
    return matches;
  });
  
  console.log(`Total activities after filtering for year ${year}: ${filteredActivities.length}`);
  
  if (filteredActivities.length > 0) {
    console.log('Sample filtered activity:', filteredActivities[0]);
  } else {
    console.warn(`No activities found for year ${year}`);
  }
  
  return filteredActivities;
};

const calculateTotalInvestments = (activities: ActivityLog[], holdings: Holding[]): number => {
  console.log('Calculating total investments...');
  
  // Include ALL real holdings (active and inactive) but exclude virtual entries
  const allRealHoldings = holdings.filter(h => !h.isVirtual);
  const total = allRealHoldings.reduce((total, holding) => {
    const amount = calculateInvestments(activities, holding.id);
    console.log(`Investments for holding ${holding.id} (${holding.fund_name}): ${amount}`);
    return total + amount;
  }, 0);
  
  console.log(`Total investments: ${total}`);
  return total;
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

  const [selectedPortfolioFundId, setSelectedPortfolioFundId] = useState<number | null>(null);
  const [selectedFundName, setSelectedFundName] = useState<string>('');
  const [isIRRModalOpen, setIsIRRModalOpen] = useState<boolean>(false);

  const [allFunds, setAllFunds] = useState<any[]>([]);
  const [deactivating, setDeactivating] = useState<boolean>(false);
  const [deactivationError, setDeactivationError] = useState<string | null>(null);
  const [showDeactivationConfirm, setShowDeactivationConfirm] = useState<boolean>(false);
  const [fundToDeactivate, setFundToDeactivate] = useState<{id: number, name: string, market_value: number} | null>(null);
  const [selectedFundsForDeactivation, setSelectedFundsForDeactivation] = useState<Set<number>>(new Set());
  const [isBulkDeactivationMode, setIsBulkDeactivationMode] = useState<boolean>(false);
  const [fundsToDeactivate, setFundsToDeactivate] = useState<Array<{id: number, name: string, market_value: number}>>([]);
  const [latestValuationDate, setLatestValuationDate] = useState<string | null>(null);
  const [isProviderSwitchModalOpen, setIsProviderSwitchModalOpen] = useState<boolean>(false);
  const [availableProviders, setAvailableProviders] = useState<Array<{id: number, name: string}>>([]);
  const [selectedProvider, setSelectedProvider] = useState<number | null>(null);
  const [isSwitchingProvider, setIsSwitchingProvider] = useState(false);
  const [switchDescription, setSwitchDescription] = useState<string>('');
  const [providerSwitches, setProviderSwitches] = useState<any[]>([]);
  const [switchDate, setSwitchDate] = useState<string>('');
  const [initialNotes, setInitialNotes] = useState<string>('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [notesError, setNotesError] = useState<string | null>(null);
  
  // State for total portfolio IRR from backend
  const [totalPortfolioIRR, setTotalPortfolioIRR] = useState<number | null>(null);
  const [totalPortfolioIRRDate, setTotalPortfolioIRRDate] = useState<string | undefined>(undefined);
  const [isTotalPortfolioIRRLoading, setIsTotalPortfolioIRRLoading] = useState<boolean>(false);
  const [totalPortfolioIRRError, setTotalPortfolioIRRError] = useState<string | null>(null);
  
  // Previous Funds expansion state
  const [isPreviousFundsExpanded, setIsPreviousFundsExpanded] = useState<boolean>(false);

  // Unified single fund IRR state (for both active and inactive funds)
  const [singleFundIRRs, setSingleFundIRRs] = useState<{[fundId: number]: {irr: number, date: string} | null}>({});
  const [isLoadingSingleFundIRRs, setIsLoadingSingleFundIRRs] = useState(false);

  // Manual IRR recalculation state
  const [isRecalculatingAllIRRs, setIsRecalculatingAllIRRs] = useState(false);

  useEffect(() => {
    if (accountId) {
      console.log('AccountIRRCalculation: Fetching data for accountId:', accountId);
      fetchData(accountId);
    } else {
      console.error('AccountIRRCalculation: No accountId available for data fetching');
    }
  }, [accountId, api]);

  useEffect(() => {
    const today = new Date();
    const currentMonthYear = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    setSwitchDate(currentMonthYear);
  }, []);

  // Removed availableYears useEffect since we're no longer using year selection

  useEffect(() => {
    if (account) {
      setInitialNotes(account.notes || '');
    }
  }, [account]);

  // useEffect to fetch total portfolio IRR from backend (all time)
  useEffect(() => {
    const fetchTotalPortfolioIRR = async () => {
      if (account?.portfolio_id) {
        setIsTotalPortfolioIRRLoading(true);
        setTotalPortfolioIRRError(null);
        try {
          console.log(`Fetching total portfolio IRR for portfolio ${account.portfolio_id}`);
          // Ensure api is available before calling
          if (!api) {
            console.error("API service is not available for fetching total portfolio IRR.");
            setTotalPortfolioIRRError("API service not available.");
            setIsTotalPortfolioIRRLoading(false);
            return;
          }
          const response = await getLatestPortfolioIRR(account.portfolio_id);
          console.log('Latest portfolio IRR response:', response.data);
          // The latest IRR endpoint returns the IRR data directly
          if (response.data && response.data.irr_result !== null && response.data.irr_result !== undefined) {
            setTotalPortfolioIRR(response.data.irr_result);
            setTotalPortfolioIRRDate(response.data.irr_date);
          } else {
            setTotalPortfolioIRR(null);
            setTotalPortfolioIRRDate(undefined);
            setTotalPortfolioIRRError('No portfolio IRR data available');
            console.error('No portfolio IRR data found');
          }
        } catch (err: any) {
          console.error('API Call Error fetching latest portfolio IRR:', err);
          setTotalPortfolioIRR(null);
          setTotalPortfolioIRRDate(undefined);
          // Handle 404 errors specifically (no IRR data available)
          if (err.response?.status === 404) {
            setTotalPortfolioIRRError('No portfolio IRR calculated yet. Click "Calculate Latest IRRs" to generate.');
          } else {
            setTotalPortfolioIRRError(err.response?.data?.detail || err.message || 'An unknown error occurred while fetching portfolio IRR.');
          }
        } finally {
          setIsTotalPortfolioIRRLoading(false);
        }
      } else {
        setTotalPortfolioIRR(null);
        setTotalPortfolioIRRDate(undefined);
        setIsTotalPortfolioIRRLoading(false);
        setTotalPortfolioIRRError(null);
      }
    };

    fetchTotalPortfolioIRR();
  }, [account?.portfolio_id, api]); // Removed holdings and activityLogs to prevent duplicate fetching

  // Effect to map IRR data from holdings to singleFundIRRs state (no additional API calls)
  useEffect(() => {
    if (holdings.length === 0) {
      setSingleFundIRRs({});
      setIsLoadingSingleFundIRRs(false);
      return;
    }
    
    console.log(`Mapping IRR values from holdings data for ${holdings.length} funds`);
    
    // Map IRR values from holdings data (already fetched in fetchData)
    const mappedIRRs: {[fundId: number]: {irr: number, date: string} | null} = {};
    
    holdings.forEach(holding => {
      if (holding.isVirtual) return; // Skip virtual entries
      
      if (holding.irr !== undefined && holding.irr !== null && holding.irr_calculation_date) {
        mappedIRRs[holding.id] = {
          irr: holding.irr,
          date: holding.irr_calculation_date
        };
        console.log(`Mapped IRR for fund ${holding.id} (${holding.fund_name}):`, mappedIRRs[holding.id]);
      } else {
        mappedIRRs[holding.id] = null;
        console.log(`No IRR data for fund ${holding.id} (${holding.fund_name})`);
      }
    });
    
    setSingleFundIRRs(mappedIRRs);
    setIsLoadingSingleFundIRRs(false);
  }, [holdings]); // Only depends on holdings, no API calls needed


  const fetchData = async (accountId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('ProductIRRCalculation: Starting optimized data fetch for account ID:', accountId);
      
      // First fetch the account/product to get the portfolio_id
      const accountResponse = await api.get(`/api/client_products/${accountId}/complete`);
      console.log('ProductIRRCalculation: Account/product data received:', accountResponse.data);
      
      // Get the portfolio_id from the account
      const portfolioId = accountResponse.data.portfolio_id;
      console.log('ProductIRRCalculation: Using portfolio ID:', portfolioId);
      
      if (!portfolioId) {
        console.error('ProductIRRCalculation: No portfolio ID found for this product');
        setError('No portfolio is associated with this product. Please assign a portfolio first.');
        setIsLoading(false);
        // Set account even if there's an error so we can show product info
        setAccount(accountResponse.data);
        // Initialize notes from account data
        setInitialNotes(accountResponse.data.notes || '');
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
      
      // Use the new optimized endpoints to get all data at once
      console.log('ProductIRRCalculation: Fetching complete portfolio data with new optimized endpoint');
      
      const [completePortfolioResponse, activityLogsResponse] = await Promise.all([
        api.get(`/portfolios/${portfolioId}/complete`),
        api.get(`/portfolios/${portfolioId}/activity_logs`)
      ]);
      
      const completeData = completePortfolioResponse.data;
      const activityData = activityLogsResponse.data;
      
      console.log('ProductIRRCalculation: Complete portfolio data received:', completeData);
      console.log('ProductIRRCalculation: Complete activity logs received:', activityData);
      
      // Process portfolio funds as holdings
      const processedHoldings: Holding[] = [];
      
      if (completeData.portfolio_funds && completeData.portfolio_funds.length > 0) {
        completeData.portfolio_funds.forEach((portfolioFund: any) => {
          const holding: Holding = {
            id: portfolioFund.id,
            fund_id: portfolioFund.available_funds_id,
            fund_name: portfolioFund.fund_name,
            isin_number: portfolioFund.isin_number,
            amount_invested: portfolioFund.amount_invested || 0,
            market_value: portfolioFund.market_value || 0,
            irr: portfolioFund.irr_result,
            irr_calculation_date: portfolioFund.irr_date,
            account_holding_id: portfolioFund.id,
            product_id: accountResponse.data.id,
            status: portfolioFund.status || 'active',
            valuation_date: portfolioFund.valuation_date,
            target_weighting: portfolioFund.target_weighting?.toString()
          };
          
          // Debug logging for IRR data
          if (portfolioFund.status === 'inactive') {
            console.log(`Inactive fund ${portfolioFund.fund_name} (ID: ${portfolioFund.id}):`, {
              irr_result: portfolioFund.irr_result,
              irr_date: portfolioFund.irr_date,
              status: portfolioFund.status
            });
          }
          
          processedHoldings.push(holding);
        });
      }
      
      // Set state with the processed data
      setHoldings(processedHoldings);
      setAllFunds(completeData.all_funds || []);
      setActivityLogs(activityData.activity_logs || []);
      
      // Individual fund IRRs (including inactive funds) will come from the 
      // singleFundIRRs state populated by fetchSingleFundIRRsFromView.
      // No need to calculate them here on page reload.
      
      // Find the latest valuation date
      let latestDate: string | null = null;
      processedHoldings.forEach(holding => {
        if (holding.valuation_date && (!latestDate || holding.valuation_date > latestDate)) {
          latestDate = holding.valuation_date;
        }
      });
      
      if (latestDate) {
        setLatestValuationDate(latestDate);
      }
      
      // Fetch provider switches
      await fetchProviderSwitches(accountId);
      
      setIsLoading(false);
      

    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load data. Please try again later.');
      setIsLoading(false);
    }
  };



  const refreshData = useCallback(async () => {
    if (accountId) {
      console.log('DEBUG - Starting data refresh after activities updated');
      
      // Clear single fund IRR cache to ensure fresh data
      setSingleFundIRRs({});
      setIsLoadingSingleFundIRRs(false);
      
      // Force a small delay to ensure backend operations have completed
      setTimeout(async () => {
        console.log('DEBUG - Executing fetchData after delay');
        try {
          await fetchData(accountId);
            console.log('DEBUG - Data refresh completed successfully');
        } catch (err) {
          console.error('DEBUG - Error during data refresh:', err);
        }
      }, 500);
    } else {
      console.warn('DEBUG - Cannot refresh data: accountId is missing');
    }
  }, [accountId]);

  // Function to trigger single fund IRR recalculation when activities change
  const triggerSingleFundIRRRecalculation = useCallback(async (portfolioFundIds: number[]) => {
    if (!api) return;
    
    console.log('Triggering single fund IRR recalculation for funds:', portfolioFundIds);
    
    try {
      // Use StandardisedSingleFundIRR for each affected fund
      const recalculationPromises = portfolioFundIds.map(async (fundId) => {
        try {
          console.log(`Recalculating IRR for fund ${fundId}`);
          await calculateStandardizedSingleFundIRR({ portfolioFundId: fundId });
          console.log(`IRR recalculation completed for fund ${fundId}`);
        } catch (error) {
          console.error(`Error recalculating IRR for fund ${fundId}:`, error);
        }
      });
      
      await Promise.all(recalculationPromises);
      
      // Trigger portfolio IRR recalculation if we have a portfolio ID
      if (account?.portfolio_id) {
        console.log('Triggering portfolio IRR recalculation');
        try {
          await calculatePortfolioIRR(account.portfolio_id);
          console.log('Portfolio IRR recalculation completed');
        } catch (error) {
          console.error('Error recalculating portfolio IRR:', error);
        }
      }
      
    } catch (error) {
      console.error('Error in IRR recalculation process:', error);
    }
  }, [api, account?.portfolio_id]);

  // Function to manually recalculate all IRRs for testing
  const recalculateAllIRRs = useCallback(async () => {
    if (!api || !account?.portfolio_id) {
      console.warn('Cannot recalculate IRRs: missing API or portfolio ID');
      return;
    }

    setIsRecalculatingAllIRRs(true);
    
    try {
      console.log('=== MANUAL IRR RECALCULATION STARTED ===');
      
      // Get all real holdings (both active and inactive, excluding virtual entries)
      const allRealHoldings = holdings.filter(h => !h.isVirtual);
      console.log(`Recalculating IRRs for ${allRealHoldings.length} funds:`, 
        allRealHoldings.map(h => `${h.id}: ${h.fund_name} (${h.status})`));

      // Step 1: Recalculate single fund IRRs for ALL real funds (active + inactive)
      console.log('Step 1: Recalculating single fund IRRs...');
      const singleFundPromises = allRealHoldings.map(async (fund) => {
        try {
          console.log(`Recalculating single fund IRR for ${fund.id}: ${fund.fund_name} (${fund.status})`);
          const response = await calculateStandardizedSingleFundIRR({ 
            portfolioFundId: fund.id 
          });
          console.log(`✓ Single fund IRR completed for ${fund.id}: ${fund.fund_name}`, response.data);
          return { success: true, fundId: fund.id, fundName: fund.fund_name };
        } catch (error) {
          console.error(`✗ Single fund IRR failed for ${fund.id}: ${fund.fund_name}`, error);
          return { success: false, fundId: fund.id, fundName: fund.fund_name, error };
        }
      });

      const singleFundResults = await Promise.all(singleFundPromises);
      const successfulSingleFunds = singleFundResults.filter(r => r.success);
      const failedSingleFunds = singleFundResults.filter(r => !r.success);
      
      console.log(`Single fund IRRs completed: ${successfulSingleFunds.length} successful, ${failedSingleFunds.length} failed`);
      if (failedSingleFunds.length > 0) {
        console.warn('Failed single fund IRRs:', failedSingleFunds);
      }

      // Step 2: Recalculate Previous Funds total IRR (inactive funds only)
      const inactiveHoldings = filterInactiveHoldings(holdings);
      if (inactiveHoldings.length > 0) {
        console.log(`Step 2: Recalculating Previous Funds IRR for ${inactiveHoldings.length} inactive funds...`);
        try {
          const inactiveFundIds = inactiveHoldings.map(h => h.id);
          const previousFundsResponse = await calculateStandardizedMultipleFundsIRR({
            portfolioFundIds: inactiveFundIds
          });
          console.log('✓ Previous Funds IRR calculation completed:', previousFundsResponse.data);
        } catch (error) {
          console.error('✗ Previous Funds IRR calculation failed:', error);
        }
      } else {
        console.log('Step 2: No inactive funds found, skipping Previous Funds IRR calculation');
      }

      // Step 3: Force recalculate total portfolio IRR using multiple fund calculation
      console.log('Step 3: Recalculating total portfolio IRR using multiple fund calculation...');
      try {
        // Use the multiple fund IRR calculation for ALL funds (active + inactive) to get portfolio IRR
        const allFundIds = allRealHoldings.map(h => h.id);
        console.log(`Recalculating portfolio IRR for all ${allFundIds.length} funds:`, allFundIds);
        
        const portfolioIRRResponse = await calculateStandardizedMultipleFundsIRR({
          portfolioFundIds: allFundIds
        });
        console.log('✓ Total portfolio IRR calculation completed:', portfolioIRRResponse.data);
        
        // Step 3b: Store the calculated portfolio IRR in the database
        if (portfolioIRRResponse.data?.irr_percentage !== undefined) {
          console.log('Step 3b: Storing portfolio IRR in database...');
          try {
            const storeResponse = await api.post(`/portfolio_irr_values`, {
              portfolio_id: account.portfolio_id,
              irr_result: portfolioIRRResponse.data.irr_percentage,
              calculation_date: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD format
              calculation_method: 'multiple_fund_standardized'
            });
            console.log('✓ Portfolio IRR stored successfully:', storeResponse.data);
          } catch (storeError) {
            console.error('✗ Failed to store portfolio IRR:', storeError);
          }
        }
      } catch (error) {
        console.error('✗ Total portfolio IRR calculation failed:', error);
      }

      // Step 4: Refresh all data to fetch updated IRRs from views
      console.log('Step 4: Refreshing data to fetch updated IRRs...');
      await refreshData();
      
      console.log('=== MANUAL IRR RECALCULATION COMPLETED ===');
      
    } catch (error) {
      console.error('Error during manual IRR recalculation:', error);
    } finally {
      setIsRecalculatingAllIRRs(false);
    }
  }, [api, account?.portfolio_id, holdings, refreshData]);

  // Format currency with commas and 2 decimal places
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
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
    return date.toLocaleDateString('en-GB', {
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


  // Add the function to update a portfolio fund's status to inactive
  const deactivatePortfolioFund = async (portfolioFundId: number) => {
    try {
      setDeactivating(true);
      setDeactivationError(null);
      
      // First, check if the latest valuation is zero
      const fundToCheck = holdings.find(holding => holding.id === portfolioFundId);
      
      if (!fundToCheck) {
        throw new Error('Fund not found');
      }
      
      if (fundToCheck.market_value > 0) {
        throw new Error('Cannot deactivate a fund with a non-zero valuation. Please set the latest valuation to zero first.');
      }
      
      // Update the portfolio fund status to 'inactive'
      await api.patch(`/portfolio_funds/${portfolioFundId}`, {
        status: 'inactive'
      });
      
      // Refresh the data to show the updated status
      fetchData(accountId as string);
      
      // Close the confirmation modal
      setShowDeactivationConfirm(false);
      setFundToDeactivate(null);
      
    } catch (err: any) {
      console.error('Error deactivating portfolio fund:', err);
      setDeactivationError(err.message || 'Failed to deactivate fund');
    } finally {
      setDeactivating(false);
    }
  };

  // Bulk deactivation function
  const deactivateMultiplePortfolioFunds = async (fundIds: number[]) => {
    try {
      setDeactivating(true);
      setDeactivationError(null);
      
      // Check if any selected funds have non-zero valuations
      const fundsWithValue = fundIds
        .map(id => holdings.find(holding => holding.id === id))
        .filter(fund => fund && fund.market_value > 0);
      
      if (fundsWithValue.length > 0) {
        const fundNames = fundsWithValue.map(fund => fund!.fund_name).join(', ');
        throw new Error(`Cannot deactivate funds with non-zero valuations: ${fundNames}. Please set their latest valuations to zero first.`);
      }
      
      // Deactivate all selected funds in parallel
      const deactivationPromises = fundIds.map(fundId =>
        api.patch(`/portfolio_funds/${fundId}`, { status: 'inactive' })
      );
      
      await Promise.all(deactivationPromises);
      
      // Refresh the data to show the updated status
      fetchData(accountId as string);
      
      // Close the confirmation modal and reset selection
      setShowDeactivationConfirm(false);
      setFundsToDeactivate([]);
      setSelectedFundsForDeactivation(new Set());
      setIsBulkDeactivationMode(false);
      
    } catch (err: any) {
      console.error('Error deactivating portfolio funds:', err);
      setDeactivationError(err.message || 'Failed to deactivate funds');
    } finally {
      setDeactivating(false);
    }
  };

  // Toggle fund selection for bulk deactivation
  const toggleFundSelection = (fundId: number) => {
    const newSelection = new Set(selectedFundsForDeactivation);
    if (newSelection.has(fundId)) {
      newSelection.delete(fundId);
    } else {
      newSelection.add(fundId);
    }
    setSelectedFundsForDeactivation(newSelection);
  };

  // Select all active funds for deactivation
  const selectAllActiveFunds = () => {
    const activeFunds = holdings.filter(holding => 
      !holding.isVirtual && holding.status !== 'inactive'
    );
    setSelectedFundsForDeactivation(new Set(activeFunds.map(fund => fund.id)));
  };

  // Clear all selections
  const clearFundSelections = () => {
    setSelectedFundsForDeactivation(new Set());
  };

  // Start bulk deactivation flow
  const startBulkDeactivation = () => {
    if (selectedFundsForDeactivation.size === 0) return;
    
    const selectedFunds = Array.from(selectedFundsForDeactivation)
      .map(id => holdings.find(holding => holding.id === id))
      .filter(fund => fund)
      .map(fund => ({
        id: fund!.id,
        name: fund!.fund_name || 'Unknown Fund',
        market_value: fund!.market_value || 0
      }));
    
    setFundsToDeactivate(selectedFunds);
    setShowDeactivationConfirm(true);
  };

  // Add this after the fetchData function
  const fetchAvailableProviders = async () => {
    try {
      const response = await api.get('/available_providers');
      setAvailableProviders(response.data);
    } catch (error) {
      console.error('Error fetching providers:', error);
    }
  };

  // Add this function to handle provider switch
  const handleProviderSwitch = async () => {
    if (!selectedProvider || !account) return;
    
    try {
      setIsSwitchingProvider(true);
      
      // Store the previous provider ID before switching
      const previousProviderId = account.provider_id;
      
      // First, update the client_product with the new provider
      await api.patch(`/client_products/${account.id}`, {
        provider_id: selectedProvider
      });
      
      // Parse the month-year string to create a date object for the 1st of the month
      const [year, month] = switchDate.split('-').map(num => parseInt(num));
      const switchDateObj = new Date(year, month - 1, 1); // JavaScript months are 0-indexed
      
      // Then create an entry in the provider_switch_log table
      await api.post('/provider_switch_log', {
        client_product_id: account.id,
        switch_date: switchDateObj.toISOString(),
        previous_provider_id: previousProviderId,
        new_provider_id: selectedProvider,
        description: switchDescription.trim() || 'No description' // Use default if empty
      });
      
      // Refresh the data after provider switch
      await fetchData(accountId as string);
      setIsProviderSwitchModalOpen(false);
      setSelectedProvider(null);
      setSwitchDescription(''); // Reset description
    } catch (error) {
      console.error('Error switching provider:', error);
      alert('Failed to switch provider. Please try again.');
    } finally {
      setIsSwitchingProvider(false);
    }
  };

  // Add this useEffect to fetch providers when modal opens
  useEffect(() => {
    if (isProviderSwitchModalOpen) {
      fetchAvailableProviders();
    }
  }, [isProviderSwitchModalOpen]);

  // Add a function to fetch provider switches
  const fetchProviderSwitches = async (productId: string) => {
    try {
      const response = await api.get(`/client_products/${productId}/provider_switches`);
      setProviderSwitches(response.data || []);
      console.log('Provider switches loaded:', response.data);
    } catch (error) {
      console.error('Error fetching provider switches:', error);
      setProviderSwitches([]);
    }
  };

  // Handle notes change
  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (account) {
      const updatedAccount = { ...account, notes: e.target.value };
      setAccount(updatedAccount);
      
      // Clear any previous error
      setNotesError(null);
    }
  };

  // Save notes when textarea loses focus
  const handleNotesBlur = async () => {
    if (!account || account.notes === initialNotes) return;

    try {
      setIsSavingNotes(true);
      await api.patch(`/api/client_products/${account.id}`, { notes: account.notes });
      setInitialNotes(account.notes || '');
      console.log('Notes saved successfully');
    } catch (err) {
      console.error('Error saving notes:', err);
      setNotesError('Failed to save notes. Your changes may not be preserved.');
    } finally {
      setIsSavingNotes(false);
    }
  };

  // Toggle Previous Funds expansion
  const togglePreviousFundsExpansion = () => {
    setIsPreviousFundsExpanded(!isPreviousFundsExpanded);
  };

  // Unified function to get IRR display for any fund (active or inactive)
  const getSingleFundIRRDisplay = (fund: Holding) => {
    const viewIRR = singleFundIRRs[fund.id];
    const isLoading = isLoadingSingleFundIRRs;

    if (isLoading) {
      return (
        <span className="text-xs text-gray-500">Loading...</span>
      );
    }

    if (viewIRR && viewIRR.irr !== null) {
      return (
        <>
          <div className={`${
            viewIRR.irr >= 0 ? 'text-green-700' : 'text-red-700'
          }`}>
            {Math.abs(viewIRR.irr) > 1 
              ? `${viewIRR.irr.toFixed(1)}%` 
              : formatPercentage(viewIRR.irr)}
            <span className="ml-1">
              {viewIRR.irr >= 0 ? '▲' : '▼'}
            </span>
          </div>
          {viewIRR.date && (
            <div className="text-xs text-gray-500 mt-1">
              as of {formatDate(viewIRR.date)}
            </div>
          )}
        </>
      );
    }

    // Fallback to database IRR if no view value (for backward compatibility)
    if (fund.irr !== undefined && fund.irr !== null) {
      return (
        <>
          <div className={`${
            fund.irr >= 0 ? 'text-green-700' : 'text-red-700'
          }`}>
            {Math.abs(fund.irr) > 1 
              ? `${fund.irr.toFixed(1)}%` 
              : formatPercentage(fund.irr)}
            <span className="ml-1">
              {fund.irr >= 0 ? '▲' : '▼'}
            </span>
          </div>
          {fund.irr_calculation_date && (
            <div className="text-xs text-gray-500 mt-1">
              as of {formatDate(fund.irr_calculation_date)}
            </div>
          )}
        </>
      );
    }

    // If no IRR available, show N/A
    return (
      <span className="text-gray-500">N/A</span>
    );
  };

  // Component to display live Previous Funds IRR (calculates every render)
  const PreviousFundsIRRDisplay: React.FC<{ inactiveHoldings: Holding[] }> = ({ inactiveHoldings }) => {
    const [livePreviousFundsIRR, setLivePreviousFundsIRR] = useState<{irr: number, date: string} | null>(null);
    const [isLoadingLivePreviousFundsIRR, setIsLoadingLivePreviousFundsIRR] = useState<boolean>(true); // Start with loading state
    const [livePreviousFundsIRRError, setLivePreviousFundsIRRError] = useState<string | null>(null);

    useEffect(() => {
      const calculateLivePreviousFundsIRR = async () => {
        if (inactiveHoldings.length === 0) {
          setLivePreviousFundsIRR(null);
          setLivePreviousFundsIRRError(null);
          setIsLoadingLivePreviousFundsIRR(false);
          return;
        }

        setIsLoadingLivePreviousFundsIRR(true);
        setLivePreviousFundsIRRError(null);

        try {
          console.log(`Calculating live Previous Funds IRR for ${inactiveHoldings.length} inactive funds`);
          
          // Get portfolio fund IDs for inactive holdings
          const inactiveFundIds = inactiveHoldings.map(h => h.id);
          console.log('Inactive fund IDs for live calculation:', inactiveFundIds);
          
          // Use the standardized multiple IRR endpoint with £0 valuation handling
          const response = await calculateStandardizedMultipleFundsIRR({
            portfolioFundIds: inactiveFundIds
          });
          
          console.log('Live Previous Funds IRR response:', response.data);
          
          if (response.data && response.data.success && response.data.irr_percentage !== null) {
            setLivePreviousFundsIRR({
              irr: response.data.irr_percentage,
              date: response.data.calculation_date
            });
          } else {
            setLivePreviousFundsIRR(null);
            setLivePreviousFundsIRRError('No IRR data available for previous funds');
            console.warn('No live Previous Funds IRR data found');
          }
          
        } catch (err: any) {
          console.error('Error calculating live Previous Funds IRR:', err);
          setLivePreviousFundsIRR(null);
          
          if (err.response?.status === 404) {
            setLivePreviousFundsIRRError('No IRR data available for previous funds');
          } else {
            setLivePreviousFundsIRRError(err.response?.data?.detail || err.message || 'Error calculating Previous Funds IRR');
          }
    } finally {
          setIsLoadingLivePreviousFundsIRR(false);
        }
      };

      calculateLivePreviousFundsIRR();
    }, [inactiveHoldings]); // Recalculate every time inactiveHoldings changes

    if (isLoadingLivePreviousFundsIRR) {
      return <span className="text-xs text-gray-500">Loading...</span>;
    }

    if (livePreviousFundsIRRError) {
      return <span className="text-xs text-red-500" title={livePreviousFundsIRRError}>Error</span>;
    }

    if (livePreviousFundsIRR !== null) {
      return (
        <>
          <div className={`font-medium ${
            livePreviousFundsIRR.irr >= 0 ? 'text-green-700' : 'text-red-700'
          }`}>
            {Math.abs(livePreviousFundsIRR.irr) > 1 
              ? `${livePreviousFundsIRR.irr.toFixed(1)}%` 
              : formatPercentage(livePreviousFundsIRR.irr)}
            <span className="ml-1">
              {livePreviousFundsIRR.irr >= 0 ? '▲' : '▼'}
            </span>
          </div>
          {livePreviousFundsIRR.date && (
            <div className="text-xs text-gray-500 mt-1">
              as of {formatDate(livePreviousFundsIRR.date)}
            </div>
          )}
        </>
      );
    }

    return <span className="text-gray-500">N/A</span>;
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

  // Main return statement for the component
  return (
    <div className="container mx-auto px-4 py-8">
      <h2 className="text-xl font-semibold mb-4">IRR Calculation</h2>
      
      {holdings.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No holdings found for this account.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Notes Section */}
          <div className="col-span-12 bg-white shadow-sm rounded-lg border border-gray-200 p-4 mb-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Notes</h3>
              {isSavingNotes && (
                <span className="text-xs text-gray-500">Saving...</span>
              )}
            </div>
            <div className="relative">
              <textarea
                value={account?.notes || ''}
                onChange={handleNotesChange}
                onBlur={handleNotesBlur}
                placeholder="Enter any notes about this product..."
                className="w-full h-24 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
              {notesError && (
                <div className="mt-1 text-xs text-red-600">{notesError}</div>
              )}
            </div>
          </div>

          {/* Current Holdings Summary */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center">
                <h2 className="text-xl font-semibold text-gray-900">Period Overview (All Time)</h2>
              </div>
              <div className="flex items-center space-x-3">
                {!isBulkDeactivationMode ? (
                  <button
                    onClick={() => setIsBulkDeactivationMode(true)}
                    className="px-3 py-2 text-sm font-medium rounded text-red-600 border border-red-200 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                  >
                    Bulk Deactivate
                  </button>
                ) : (
                  <>
                    <span className="text-sm text-gray-600">
                      {selectedFundsForDeactivation.size} fund{selectedFundsForDeactivation.size !== 1 ? 's' : ''} selected
                    </span>
                    <button
                      onClick={selectAllActiveFunds}
                      className="px-2 py-1 text-xs font-medium rounded text-blue-600 border border-blue-200 hover:bg-blue-50"
                    >
                      Select All
                    </button>
                    <button
                      onClick={clearFundSelections}
                      className="px-2 py-1 text-xs font-medium rounded text-gray-600 border border-gray-200 hover:bg-gray-50"
                    >
                      Clear
                    </button>
                    <button
                      onClick={startBulkDeactivation}
                      disabled={selectedFundsForDeactivation.size === 0}
                      className="px-3 py-2 text-sm font-medium rounded text-white bg-red-600 hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed"
                    >
                      Deactivate Selected ({selectedFundsForDeactivation.size})
                    </button>
                    <button
                      onClick={() => {
                        setIsBulkDeactivationMode(false);
                        setSelectedFundsForDeactivation(new Set());
                      }}
                      className="px-3 py-2 text-sm font-medium rounded text-gray-600 border border-gray-200 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>
            </div>
            
            {(() => {
              const allTimeActivities = activityLogs; // Use all activities instead of year-filtered
              return (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {isBulkDeactivationMode && (
                          <th className="px-1 py-1 text-center text-xs font-medium text-gray-700 uppercase tracking-wider w-8">
                            <input
                              type="checkbox"
                              className="rounded border-gray-300 text-red-600 shadow-sm focus:border-red-300 focus:ring focus:ring-red-200 focus:ring-opacity-50"
                              checked={selectedFundsForDeactivation.size > 0 && selectedFundsForDeactivation.size === holdings.filter(h => !h.isVirtual && h.status !== 'inactive').length}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  selectAllActiveFunds();
                                } else {
                                  clearFundSelections();
                                }
                              }}
                            />
                          </th>
                        )}
                        <th className="px-1 py-1 text-left text-xs font-medium text-gray-700 uppercase tracking-wider w-24" title="Fund Name">Name</th>
                        <th className="px-1 py-1 text-left text-xs font-medium text-gray-700 uppercase tracking-wider w-16" title="Total Investments">INV.</th>
                        <th className="px-1 py-1 text-left text-xs font-medium text-gray-700 uppercase tracking-wider w-16" title="Regular Investments">REG. INV.</th>
                        <th className="px-1 py-1 text-left text-xs font-medium text-gray-700 uppercase tracking-wider w-16" title="Government Uplifts">GOV. UPLIFTS</th>
                        <th className="px-1 py-1 text-left text-xs font-medium text-gray-700 uppercase tracking-wider w-16" title="Fund Switch Ins">FUND SWITCH IN</th>
                        <th className="px-1 py-1 text-left text-xs font-medium text-gray-700 uppercase tracking-wider w-16" title="Fund Switch Outs">FUND SWITCH OUT</th>
                        <th className="px-1 py-1 text-left text-xs font-medium text-gray-700 uppercase tracking-wider w-16" title="Product Switch Ins">PROD SWITCH IN</th>
                        <th className="px-1 py-1 text-left text-xs font-medium text-gray-700 uppercase tracking-wider w-16" title="Product Switch Outs">PROD SWITCH OUT</th>
                        <th className="px-1 py-1 text-left text-xs font-medium text-gray-700 uppercase tracking-wider w-16" title="Withdrawals">WITH.</th>
                        <th className="px-1 py-1 text-left text-xs font-medium text-gray-700 uppercase tracking-wider w-20" title="Most Recent Valuation">Valuation</th>
                        <th className="px-1 py-1 text-left text-xs font-medium text-gray-700 uppercase tracking-wider w-16" title="Most Recent IRR">IRR</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {(() => {
                        const activeHoldings = filterActiveHoldings(holdings);
                        const inactiveHoldings = filterInactiveHoldings(holdings);
                        const previousFundsEntry = createPreviousFundsEntry(inactiveHoldings, allTimeActivities);
                        const displayHoldings = [...activeHoldings];
                        if (previousFundsEntry) {
                          displayHoldings.push(previousFundsEntry);
                        }
                        return (
                          <>
                            {displayHoldings.sort((a, b) => {
                              if (a.isVirtual) return 1;
                              if (b.isVirtual) return -1;
                              
                              // Cash fund always goes second-to-last (before Previous Funds)
                              const aIsCash = isCashFund({ fund_name: a.fund_name, isin_number: a.isin_number } as any);
                              const bIsCash = isCashFund({ fund_name: b.fund_name, isin_number: b.isin_number } as any);

                              if (aIsCash && !b.isVirtual) return 1; // Cash before virtual if b is not virtual
                              if (bIsCash && !a.isVirtual) return -1; // Similar for b
                              // If one is cash and other is virtual, cash comes before virtual
                              if (aIsCash && b.isVirtual) return -1;
                              if (bIsCash && a.isVirtual) return 1;
                              // If both are cash, or neither is cash and neither is virtual, use name compare
                              if (aIsCash && bIsCash) return (a.fund_name || '').localeCompare(b.fund_name || '');

                              return (a.fund_name || '').localeCompare(b.fund_name || '');
                            }).map((holding) => (
                              <tr 
                                key={holding.id} 
                                className={holding.isVirtual ? "bg-gray-100 border-t border-gray-300 cursor-pointer hover:bg-gray-200" : ""}
                                onClick={holding.isVirtual ? togglePreviousFundsExpansion : undefined}
                              >
                                {isBulkDeactivationMode && (
                                  <td className="px-1 py-1 whitespace-nowrap text-center">
                                    {!holding.isVirtual && holding.status !== 'inactive' ? (
                                      <input
                                        type="checkbox"
                                        className="rounded border-gray-300 text-red-600 shadow-sm focus:border-red-300 focus:ring focus:ring-red-200 focus:ring-opacity-50"
                                        checked={selectedFundsForDeactivation.has(holding.id)}
                                        onChange={() => toggleFundSelection(holding.id)}
                                      />
                                    ) : (
                                      <span className="text-gray-400">—</span>
                                    )}
                                  </td>
                                )}
                                <td className="px-1 py-1 whitespace-nowrap">
                                  <div className="flex items-center">
                                    {holding.isVirtual && (
                                      <div className="mr-2">
                                        <svg
                                          className={`w-4 h-4 transform transition-transform duration-200 ${isPreviousFundsExpanded ? 'rotate-90' : ''}`}
                                          fill="none"
                                          stroke="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                      </div>
                                    )}
                                    <div className={holding.isVirtual ? "ml-2 font-medium" : "ml-4"}>
                                      <div className={`text-sm ${holding.isVirtual ? "font-semibold text-blue-800" : "font-medium text-gray-900"}`}>
                                        {holding.fund_name}
                                        {holding.status === 'inactive' && !holding.isVirtual && (
                                          <span className="ml-2 text-xs text-red-600 font-normal">(Inactive)</span>
                                        )}
                                      </div>
                                      {holding.isVirtual && inactiveHoldings.length > 0 && (
                                        <div className="text-xs text-gray-500 mt-1">
                                          ({inactiveHoldings.length} inactive {inactiveHoldings.length === 1 ? 'fund' : 'funds'}) - Click to expand
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-1 py-1 whitespace-nowrap">
                                  <div className={`text-sm ${holding.isVirtual ? "font-medium text-blue-800" : "text-gray-900"}`}>
                                    {holding.isVirtual 
                                      ? formatCurrency(calculatePreviousFundsInvestments(allTimeActivities, inactiveHoldings))
                                      : formatCurrency(calculateInvestments(allTimeActivities, holding.id))}
                                  </div>
                                </td>
                                <td className="px-1 py-1 whitespace-nowrap">
                                  <div className={`text-sm ${holding.isVirtual ? "font-medium text-blue-800" : "text-gray-900"}`}>
                                    {holding.isVirtual 
                                      ? formatCurrency(calculatePreviousFundsRegularInvestments(allTimeActivities, inactiveHoldings))
                                      : formatCurrency(calculateRegularInvestments(allTimeActivities, holding.id))}
                                  </div>
                                </td>
                                <td className="px-1 py-1 whitespace-nowrap">
                                  <div className={`text-sm ${holding.isVirtual ? "font-medium text-blue-800" : "text-gray-900"}`}>
                                    {holding.isVirtual
                                      ? formatCurrency(calculatePreviousFundsGovernmentUplifts(allTimeActivities, inactiveHoldings))
                                      : formatCurrency(calculateGovernmentUplifts(allTimeActivities, holding.id))}
                                  </div>
                                </td>
                                <td className="px-1 py-1 whitespace-nowrap">
                                  <div className={`text-sm ${holding.isVirtual ? "font-medium text-blue-800" : "text-gray-900"}`}>
                                    {holding.isVirtual
                                      ? formatCurrency(calculatePreviousFundsSwitchIns(allTimeActivities, inactiveHoldings))
                                      : formatCurrency(calculateSwitchIns(allTimeActivities, holding.id))}
                                  </div>
                                </td>
                                <td className="px-1 py-1 whitespace-nowrap">
                                  <div className={`text-sm ${holding.isVirtual ? "font-medium text-blue-800" : "text-gray-900"}`}>
                                    {holding.isVirtual
                                      ? formatCurrency(calculatePreviousFundsSwitchOuts(allTimeActivities, inactiveHoldings))
                                      : formatCurrency(calculateSwitchOuts(allTimeActivities, holding.id))}
                                  </div>
                                </td>
                                <td className="px-1 py-1 whitespace-nowrap">
                                  <div className={`text-sm ${holding.isVirtual ? "font-medium text-blue-800" : "text-gray-900"}`}>
                                    {holding.isVirtual
                                      ? formatCurrency(calculatePreviousFundsProductSwitchIns(allTimeActivities, inactiveHoldings))
                                      : formatCurrency(calculateProductSwitchIns(allTimeActivities, holding.id))}
                                  </div>
                                </td>
                                <td className="px-1 py-1 whitespace-nowrap">
                                  <div className={`text-sm ${holding.isVirtual ? "font-medium text-blue-800" : "text-gray-900"}`}>
                                    {holding.isVirtual
                                      ? formatCurrency(calculatePreviousFundsProductSwitchOuts(allTimeActivities, inactiveHoldings))
                                      : formatCurrency(calculateProductSwitchOuts(allTimeActivities, holding.id))}
                                  </div>
                                </td>
                                <td className="px-1 py-1 whitespace-nowrap">
                                  <div className={`text-sm ${holding.isVirtual ? "font-medium text-blue-800" : "text-gray-900"}`}>
                                    {holding.isVirtual
                                      ? formatCurrency(calculatePreviousFundsWithdrawals(allTimeActivities, inactiveHoldings))
                                      : formatCurrency(calculateWithdrawals(allTimeActivities, holding.id))}
                                  </div>
                                </td>
                                <td className="px-1 py-1 whitespace-nowrap">
                                  <div className={`text-sm ${holding.isVirtual ? "font-medium text-blue-800" : "text-gray-900"}`}>
                                    {holding.isVirtual ? (
                                      formatCurrency(0)
                                    ) : (
                                      holding.market_value !== undefined && holding.market_value !== null ? (
                                        <div>
                                          <div>{formatCurrency(holding.market_value)}</div>
                                          {holding.valuation_date && (
                                            <div className="text-xs text-gray-500 mt-1">
                                              as of {formatDate(holding.valuation_date)}
                                            </div>
                                          )}
                                        </div>
                                      ) : 'N/A'
                                    )}
                                  </div>
                                </td>
                                <td className="px-1 py-1 whitespace-nowrap">
                                  <div>
                                      {holding.isVirtual ? (
                                      // Use live Previous Funds IRR component
                                      <PreviousFundsIRRDisplay inactiveHoldings={inactiveHoldings} />
                                    ) : (
                                      // Use unified single fund IRR display
                                      getSingleFundIRRDisplay(holding)
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                            
                            {/* Expanded Individual Inactive Funds */}
                            {isPreviousFundsExpanded && inactiveHoldings.length > 0 && (
                              inactiveHoldings.map((inactiveHolding) => (
                                <tr key={`inactive-${inactiveHolding.id}`} className="bg-blue-50 border-l-4 border-blue-300">
                                  {isBulkDeactivationMode && (
                                    <td className="px-1 py-1 whitespace-nowrap text-center">
                                      <span className="text-gray-400">—</span>
                                    </td>
                                  )}
                                  <td className="px-1 py-1 whitespace-nowrap">
                                    <div className="flex items-center">
                                      <div className="ml-8 text-sm text-gray-700">
                                        ↳ {inactiveHolding.fund_name}
                                        <span className="ml-2 text-xs text-red-600">(Inactive)</span>
                                        {inactiveHolding.end_date && (
                                          <div className="text-xs text-gray-500 mt-1">
                                            Ended: {formatDate(inactiveHolding.end_date)}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-1 py-1 whitespace-nowrap">
                                    <div className="text-sm text-gray-700">
                                      {formatCurrency(calculateInvestments(allTimeActivities, inactiveHolding.id))}
                                    </div>
                                  </td>
                                  <td className="px-1 py-1 whitespace-nowrap">
                                    <div className="text-sm text-gray-700">
                                      {formatCurrency(calculateRegularInvestments(allTimeActivities, inactiveHolding.id))}
                                    </div>
                                  </td>
                                  <td className="px-1 py-1 whitespace-nowrap">
                                    <div className="text-sm text-gray-700">
                                      {formatCurrency(calculateGovernmentUplifts(allTimeActivities, inactiveHolding.id))}
                                    </div>
                                  </td>
                                  <td className="px-1 py-1 whitespace-nowrap">
                                    <div className="text-sm text-gray-700">
                                      {formatCurrency(calculateSwitchIns(allTimeActivities, inactiveHolding.id))}
                                    </div>
                                  </td>
                                  <td className="px-1 py-1 whitespace-nowrap">
                                    <div className="text-sm text-gray-700">
                                      {formatCurrency(calculateSwitchOuts(allTimeActivities, inactiveHolding.id))}
                                    </div>
                                  </td>
                                  <td className="px-1 py-1 whitespace-nowrap">
                                    <div className="text-sm text-gray-700">
                                      {formatCurrency(calculateProductSwitchIns(allTimeActivities, inactiveHolding.id))}
                                    </div>
                                  </td>
                                  <td className="px-1 py-1 whitespace-nowrap">
                                    <div className="text-sm text-gray-700">
                                      {formatCurrency(calculateProductSwitchOuts(allTimeActivities, inactiveHolding.id))}
                                    </div>
                                  </td>
                                  <td className="px-1 py-1 whitespace-nowrap">
                                    <div className="text-sm text-gray-700">
                                      {formatCurrency(calculateWithdrawals(allTimeActivities, inactiveHolding.id))}
                                    </div>
                                  </td>
                                  <td className="px-1 py-1 whitespace-nowrap">
                                    <div className="text-sm text-gray-700">
                                      {formatCurrency(0)}
                                    </div>
                                  </td>
                                  <td className="px-1 py-1 whitespace-nowrap">
                                    <div className="text-sm text-gray-700">
                                      {getSingleFundIRRDisplay(inactiveHolding)}
                                    </div>
                                  </td>
                                </tr>
                              ))
                            )}
                          </>
                        );
                      })()}
                      
                      {/* Total Row - Updated to use state for total portfolio IRR */}
                      <tr className="bg-gray-50 font-medium">
                        {isBulkDeactivationMode && (
                          <td className="px-1 py-1 whitespace-nowrap">
                            {/* Empty cell for checkbox column in total row */}
                          </td>
                        )}
                        <td className="px-1 py-1 whitespace-nowrap">
                          <div className="ml-4 text-base font-bold text-red-600">TOTAL</div>
                        </td>
                        <td className="px-1 py-1 whitespace-nowrap">
                          <div className="text-sm font-bold text-red-600">
                            {formatCurrency(calculateTotalInvestments(allTimeActivities, holdings))}
                          </div>
                        </td>
                        <td className="px-1 py-1 whitespace-nowrap">
                          <div className="text-sm font-bold text-red-600">
                            {formatCurrency(calculateTotalRegularInvestments(allTimeActivities, holdings))}
                          </div>
                        </td>
                        <td className="px-1 py-1 whitespace-nowrap">
                          <div className="text-sm font-bold text-red-600">
                            {formatCurrency(calculateTotalGovernmentUplifts(allTimeActivities, holdings))}
                          </div>
                        </td>
                        <td className="px-1 py-1 whitespace-nowrap">
                          <div className="text-sm font-bold text-red-600">
                            {formatCurrency(calculateTotalSwitchIns(allTimeActivities, holdings))}
                          </div>
                        </td>
                        <td className="px-1 py-1 whitespace-nowrap">
                          <div className="text-sm font-bold text-red-600">
                            {formatCurrency(calculateTotalSwitchOuts(allTimeActivities, holdings))}
                          </div>
                        </td>
                        <td className="px-1 py-1 whitespace-nowrap">
                          <div className="text-sm font-bold text-red-600">
                            {formatCurrency(calculateTotalProductSwitchIns(allTimeActivities, holdings))}
                          </div>
                        </td>
                        <td className="px-1 py-1 whitespace-nowrap">
                          <div className="text-sm font-bold text-red-600">
                            {formatCurrency(calculateTotalProductSwitchOuts(allTimeActivities, holdings))}
                          </div>
                        </td>
                        <td className="px-1 py-1 whitespace-nowrap">
                          <div className="text-sm font-bold text-red-600">
                            {formatCurrency(calculateTotalWithdrawals(allTimeActivities, holdings))}
                          </div>
                        </td>
                        <td className="px-1 py-1 whitespace-nowrap">
                          <div className="text-sm font-bold text-red-600">
                            {formatCurrency(calculateTotalValue(holdings))}
                          </div>
                        </td>
                        <td className="px-1 py-1 whitespace-nowrap">
                          {isTotalPortfolioIRRLoading ? (
                            <span className="text-sm text-gray-500">Loading...</span>
                          ) : totalPortfolioIRRError ? (
                            <span className="text-sm text-red-500" title={totalPortfolioIRRError}>Error</span>
                          ) : totalPortfolioIRR !== null ? (
                            <div>
                              <div className={`text-sm font-bold ${
                                totalPortfolioIRR >= 0 ? 'text-green-700' : 'text-red-700'
                              }`}>
                                {formatPercentage(totalPortfolioIRR)}
                                <span className="ml-1">
                                  {totalPortfolioIRR >= 0 ? '▲' : '▼'}
                                </span>
                              </div>
                              {totalPortfolioIRRDate && (
                                <div className="text-xs text-gray-500 mt-1">
                                  as of {formatDate(totalPortfolioIRRDate)}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500">N/A</span>
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>

          {/* Monthly Activities Table */}
          <div className="mt-10">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Monthly Activities</h2>
              <div className="flex items-center space-x-3">
                <button
                  onClick={recalculateAllIRRs}
                  disabled={isRecalculatingAllIRRs}
                  className="px-4 py-2 bg-green-600 text-white font-medium rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-green-300 disabled:cursor-not-allowed flex items-center"
                >
                  {isRecalculatingAllIRRs ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Recalculating...
                    </>
                  ) : (
                    'Recalculate All IRRs'
                  )}
                </button>
                <button
                  onClick={() => setIsProviderSwitchModalOpen(true)}
                  className="px-4 py-2 bg-indigo-600 text-white font-medium rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Provider Switch
                </button>
              </div>
            </div>

            
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
              
              // Create a virtual "Previous Funds" entry for the EditableMonthlyActivitiesTable
              const previousFundsEntry = inactiveHoldings.length > 0 ? {
                id: -1,
                holding_id: -1,
                fund_name: 'Previous Funds',
                irr: undefined, // Set to undefined as we'll always display N/A
                isActive: false,
                isVirtual: true,
                isin_number: 'N/A', // Added to satisfy type requirements
                inactiveHoldingIds: inactiveHoldings.map(h => ({
                  id: h.id,
                  fund_id: h.fund_id,
                  fund_name: h.fund_name
                }))
              } : null;
              
              // Prepare the list of funds for the table - only show active funds + Previous Funds virtual entry
              const tableFunds = [...activeHoldings.map(holding => ({
                id: holding.id,
                holding_id: holding.account_holding_id,
                fund_name: holding.fund_name || 'Unknown Fund',
                isin_number: holding.isin_number || 'N/A', // Make sure ISIN is included
                irr: holding.irr,
                isActive: true
              }))];
              
              // Add the Previous Funds virtual entry if there are inactive funds
              if (previousFundsEntry) {
                tableFunds.push(previousFundsEntry);
              }

              // Sort funds alphabetically, but place Cash at the end and Previous Funds at the very end
              tableFunds.sort((a, b) => {
                // Previous Funds entry always goes last
                if (a.id === -1) return 1;
                if (b.id === -1) return -1;
                
                // Cash fund always goes second-to-last (before Previous Funds)
                const aIsCash = isCashFund({ fund_name: a.fund_name, isin_number: a.isin_number } as any);
                const bIsCash = isCashFund({ fund_name: b.fund_name, isin_number: b.isin_number } as any);

                if (aIsCash) return 1; // If a is Cash, it should come after non-Cash, non-Virtual
                if (bIsCash) return -1; // If b is Cash, it should come after non-Cash, non-Virtual
                                
                // All other funds are sorted alphabetically
                return a.fund_name.localeCompare(b.fund_name);
              });
              
              // Use all activities instead of year-filtered
              const allActivities = activityLogs;
              
              return (
                <div className="overflow-x-auto">
                  <EditableMonthlyActivitiesTable
                    funds={tableFunds}
                    inactiveFundsForTotals={inactiveHoldings}  // Pass inactive funds separately for totals calculation
                    activities={convertActivityLogs(allActivities)}
                    accountHoldingId={accountId ? parseInt(accountId) : 0}
                    onActivitiesUpdated={async (affectedFundIds?: number[]) => {
                      // Trigger single fund IRR recalculation for affected funds
                      if (affectedFundIds && affectedFundIds.length > 0) {
                        await triggerSingleFundIRRRecalculation(affectedFundIds);
                      }
                      // Refresh the data to get updated IRRs from views
                      await refreshData();
                    }}
                    productStartDate={account?.start_date} // Pass product start date instead of selectedYear
                    allFunds={allFunds} // Pass all funds from the API instead of just holdings
                    providerSwitches={providerSwitches} // Pass provider switches
                    portfolioId={account?.portfolio_id} // Pass portfolio ID for IRR recalculation
                  />
                </div>
              );
            })()}
          </div>
        </div>
      )}


      
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
      
      {/* Deactivation Confirmation Dialog */}
      <Transition appear show={showDeactivationConfirm} as={Fragment}>
        <Dialog 
          as="div" 
          className="relative z-50" 
          onClose={() => setShowDeactivationConfirm(false)}
        >
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto z-50">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-lg bg-white p-6 text-left align-middle shadow-xl transition-all z-50">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900"
                  >
                    {fundsToDeactivate.length > 0 ? `Deactivate ${fundsToDeactivate.length} Fund${fundsToDeactivate.length !== 1 ? 's' : ''}` : 'Deactivate Fund'}
                  </Dialog.Title>
                  
                  <div className="mt-2">
                    {fundsToDeactivate.length > 0 ? (
                      <>
                        <p className="text-sm text-gray-500 mb-3">
                          Are you sure you want to deactivate the following {fundsToDeactivate.length} fund{fundsToDeactivate.length !== 1 ? 's' : ''}?
                        </p>
                        <div className="max-h-60 overflow-y-auto">
                          <ul className="space-y-2">
                            {fundsToDeactivate.map((fund) => (
                              <li key={fund.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                                <span className="font-medium text-sm">{fund.name}</span>
                                <span className="text-xs text-gray-500">{formatCurrency(fund.market_value)}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        {fundsToDeactivate.some(fund => fund.market_value > 0) && (
                          <div className="mt-3 p-2 bg-red-50 text-red-700 rounded border border-red-200 text-sm">
                            Warning: Some funds have non-zero valuations. 
                            Deactivating funds with non-zero valuations is not recommended.
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-gray-500">
                          Are you sure you want to deactivate <span className="font-semibold">{fundToDeactivate?.name}</span>?
                        </p>
                        
                        {fundToDeactivate && fundToDeactivate.market_value > 0 && (
                          <div className="mt-2 p-2 bg-red-50 text-red-700 rounded border border-red-200 text-sm">
                            Warning: This fund has a valuation of {formatCurrency(fundToDeactivate.market_value)}. 
                            Deactivating a fund with a non-zero valuation is not recommended.
                          </div>
                        )}
                      </>
                    )}
                    
                    {deactivationError && (
                      <div className="mt-2 p-2 bg-red-50 text-red-700 rounded border border-red-200 text-sm">
                        {deactivationError}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex justify-end space-x-3">
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-transparent bg-gray-100 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2"
                      onClick={() => setShowDeactivationConfirm(false)}
                    >
                      Cancel
                    </button>
                    
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:bg-red-300 disabled:cursor-not-allowed"
                      onClick={() => {
                        if (fundsToDeactivate.length > 0) {
                          deactivateMultiplePortfolioFunds(fundsToDeactivate.map(f => f.id));
                        } else if (fundToDeactivate) {
                          deactivatePortfolioFund(fundToDeactivate.id);
                        }
                      }}
                      disabled={deactivating}
                    >
                      {deactivating ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Deactivating...
                        </>
                      ) : (
                        fundsToDeactivate.length > 0 
                          ? `Deactivate ${fundsToDeactivate.length} Fund${fundsToDeactivate.length !== 1 ? 's' : ''}` 
                          : 'Deactivate Fund'
                      )}
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
      {/* Provider Switch Modal */}
      <Transition appear show={isProviderSwitchModalOpen} as={Fragment}>
        <Dialog 
          as="div" 
          className="relative z-50" 
          onClose={() => setIsProviderSwitchModalOpen(false)}
        >
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto z-50">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-lg bg-white p-6 text-left align-middle shadow-xl transition-all z-50">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900"
                  >
                    Switch Provider
                  </Dialog.Title>
                  
                  <div className="mt-4">
                    {/* Current Provider Info */}
                    <div className="mb-4 p-3 bg-gray-50 rounded-md">
                      <div className="text-sm font-medium text-gray-500">Current Provider</div>
                      <div className="text-base font-medium text-gray-900">
                        {account?.provider_name || 'No Provider Assigned'}
                      </div>
                    </div>

                    <label htmlFor="provider" className="block text-sm font-medium text-gray-700">
                      Select New Provider
                    </label>
                    <select
                      id="provider"
                      className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                      value={selectedProvider || ''}
                      onChange={(e) => setSelectedProvider(Number(e.target.value))}
                    >
                      <option value="">Select a provider...</option>
                      {availableProviders
                        .filter(provider => provider.id !== account?.provider_id) // Filter out current provider
                        .map((provider) => (
                          <option key={provider.id} value={provider.id}>
                            {provider.name}
                          </option>
                      ))}
                    </select>
                    
                    {/* Add switch date field */}
                    <div className="mt-4">
                      <label htmlFor="switchDate" className="block text-sm font-medium text-gray-700">
                        Switch Month
                      </label>
                      <input
                        type="month"
                        id="switchDate"
                        className="mt-1 block w-full pl-3 pr-3 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                        value={switchDate}
                        onChange={(e) => setSwitchDate(e.target.value)}
                      />
                    </div>
                    
                    {/* Add description field */}
                    <div className="mt-4">
                      <label htmlFor="switchDescription" className="block text-sm font-medium text-gray-700">
                        Reason for Switch
                      </label>
                      <textarea
                        id="switchDescription"
                        className="mt-1 block w-full pl-3 pr-3 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                        rows={3}
                        placeholder="Enter reason for provider switch (optional)"
                        value={switchDescription}
                        onChange={(e) => setSwitchDescription(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end space-x-3">
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-transparent bg-gray-100 px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2"
                      onClick={() => setIsProviderSwitchModalOpen(false)}
                    >
                      Cancel
                    </button>
                    
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:bg-indigo-300 disabled:cursor-not-allowed"
                      onClick={handleProviderSwitch}
                      disabled={!selectedProvider || isSwitchingProvider || !switchDate}
                    >
                      {isSwitchingProvider ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Switching...
                        </>
                      ) : (
                        'Switch Provider'
                      )}
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div> // This is the main closing div for the component's return
  );
};

export default AccountIRRCalculation;