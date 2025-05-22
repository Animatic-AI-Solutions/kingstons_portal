import React, { useState, useEffect, Fragment } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import YearNavigator from '../components/YearNavigator';
import EditableMonthlyActivitiesTable from '../components/EditableMonthlyActivitiesTable';
import IRRCalculationModal from '../components/IRRCalculationModal';
import IRRDateSelectionModal from '../components/IRRDateSelectionModal';
import { calculatePortfolioIRRForDate, calculatePortfolioTotalIRR } from '../services/api';
import { Dialog, Transition } from '@headlessui/react';
import { formatCurrency, formatPercentage } from '../utils/formatters';

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
  console.log('Calculating total regular investments...');
  console.log(`Activities count: ${activities.length}, Holdings count: ${holdings.length}`);
  
  const activeHoldings = holdings.filter(h => h.status !== 'inactive' && !h.isVirtual);
  const total = activeHoldings.reduce((total, holding) => {
    const amount = calculateRegularInvestments(activities, holding.id);
    console.log(`Regular investments for holding ${holding.id} (${holding.fund_name}): ${amount}`);
    return total + amount;
  }, 0);
  
  console.log(`Total regular investments: ${total}`);
  return total;
};

const calculateTotalGovernmentUplifts = (activities: ActivityLog[], holdings: Holding[]): number => {
  console.log('Calculating total government uplifts...');
  
  const activeHoldings = holdings.filter(h => h.status !== 'inactive' && !h.isVirtual);
  const total = activeHoldings.reduce((total, holding) => {
    const amount = calculateGovernmentUplifts(activities, holding.id);
    console.log(`Government uplifts for holding ${holding.id} (${holding.fund_name}): ${amount}`);
    return total + amount;
  }, 0);
  
  console.log(`Total government uplifts: ${total}`);
  return total;
};

const calculateTotalSwitchIns = (activities: ActivityLog[], holdings: Holding[]): number => {
  console.log('Calculating total fund switch ins...');
  
  const activeHoldings = holdings.filter(h => h.status !== 'inactive' && !h.isVirtual);
  const total = activeHoldings.reduce((total, holding) => {
    const amount = calculateSwitchIns(activities, holding.id);
    console.log(`Fund switch ins for holding ${holding.id} (${holding.fund_name}): ${amount}`);
    return total + amount;
  }, 0);
  
  console.log(`Total fund switch ins: ${total}`);
  return total;
};

const calculateTotalSwitchOuts = (activities: ActivityLog[], holdings: Holding[]): number => {
  console.log('Calculating total fund switch outs...');
  
  const activeHoldings = holdings.filter(h => h.status !== 'inactive' && !h.isVirtual);
  const total = activeHoldings.reduce((total, holding) => {
    const amount = calculateSwitchOuts(activities, holding.id);
    console.log(`Fund switch outs for holding ${holding.id} (${holding.fund_name}): ${amount}`);
    return total + amount;
  }, 0);
  
  console.log(`Total fund switch outs: ${total}`);
  return total;
};

const calculateTotalWithdrawals = (activities: ActivityLog[], holdings: Holding[]): number => {
  console.log('Calculating total withdrawals...');
  
  const activeHoldings = holdings.filter(h => h.status !== 'inactive' && !h.isVirtual);
  const total = activeHoldings.reduce((total, holding) => {
    const amount = calculateWithdrawals(activities, holding.id);
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

// Calculate the weighted average IRR for the total row
const calculateTotalWeightedIRR = (holdings: Holding[]): { irr: number | null, irr_calculation_date: string | undefined } => {
  let totalWeightedIRR = 0;
  let totalWeight = 0;
  let latestCalculationDate: string | undefined = undefined;
  
  // Find funds with both IRR and market value
  const validHoldings = holdings.filter(h => 
    h.irr !== undefined && h.irr !== null && 
    h.market_value !== undefined && h.market_value > 0
  );
  
  if (validHoldings.length === 0) {
    return { irr: null, irr_calculation_date: undefined };
  }
  
  // Calculate weighted IRR
  for (const holding of validHoldings) {
    const weightedIrrContribution = (holding.irr || 0) * holding.market_value;
    totalWeightedIRR += weightedIrrContribution;
    totalWeight += holding.market_value;
    
    // Track the latest IRR calculation date
    if (holding.irr_calculation_date) {
      if (!latestCalculationDate || new Date(holding.irr_calculation_date) > new Date(latestCalculationDate)) {
        latestCalculationDate = holding.irr_calculation_date;
      }
    }
  }
  
  // Calculate the weighted average IRR
  const avgIRR = totalWeight > 0 ? totalWeightedIRR / totalWeight : null;
  
  return {
    irr: avgIRR,
    irr_calculation_date: latestCalculationDate
  };
};

const calculateTotalValueMinusWithdrawals = (holdings: Holding[], activities: ActivityLog[]): number => {
  const activeHoldings = holdings.filter(h => h.status !== 'inactive' && !h.isVirtual);
  return activeHoldings.reduce((total, holding) => 
    total + calculateValueMinusWithdrawals(holding.market_value || 0, activities, holding.id), 0);
};

const calculateTotalInvestmentsPlusSwitchIns = (activities: ActivityLog[], holdings: Holding[]): number => {
  const activeHoldings = holdings.filter(h => h.status !== 'inactive' && !h.isVirtual);
  return activeHoldings.reduce((total, holding) => total + calculateInvestmentsPlusSwitchIns(activities, holding.id), 0);
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
  
  const activeHoldings = holdings.filter(h => h.status !== 'inactive' && !h.isVirtual);
  const total = activeHoldings.reduce((total, holding) => {
    const amount = calculateInvestments(activities, holding.id);
    console.log(`Investments for holding ${holding.id} (${holding.fund_name}): ${amount}`);
    return total + amount;
  }, 0);
  
  console.log(`Total investments: ${total}`);
  return total;
};

// Function to calculate IRR using the Newton-Raphson method
const calculateIRR = (cashFlows: {date: Date, amount: number}[], maxIterations = 100, precision = 0.000001): number | null => {
  if (cashFlows.length < 2) {
    return null; // Need at least 2 cash flows to calculate IRR
  }
  
  // Make sure cash flows are sorted by date
  cashFlows.sort((a, b) => a.date.getTime() - b.date.getTime());
  
  // Check if we have both negative and positive cash flows
  const hasNegative = cashFlows.some(cf => cf.amount < 0);
  const hasPositive = cashFlows.some(cf => cf.amount > 0);
  
  if (!hasNegative || !hasPositive) {
    return null; // Need both investments (negative) and returns (positive) for IRR calculation
  }
  
  // IRR calculation using Newton-Raphson method
  // Initial guess - start with a reasonable rate (5%)
  let rate = 0.05;
  
  for (let iteration = 0; iteration < maxIterations; iteration++) {
    // Calculate NPV and its derivative at current rate
    let npv = 0;
    let derivativeNpv = 0;
    const firstDate = cashFlows[0].date;
    
    for (let i = 0; i < cashFlows.length; i++) {
      const daysDiff = (cashFlows[i].date.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24);
      const yearFraction = daysDiff / 365;
      
      // NPV calculation
      npv += cashFlows[i].amount / Math.pow(1 + rate, yearFraction);
      
      // Derivative of NPV
      derivativeNpv += -yearFraction * cashFlows[i].amount / Math.pow(1 + rate, yearFraction + 1);
    }
    
    // Break if we've reached desired precision
    if (Math.abs(npv) < precision) {
      return rate * 100; // Convert to percentage
    }
    
    // Newton-Raphson update
    const newRate = rate - npv / derivativeNpv;
    
    // Handle non-convergence
    if (!isFinite(newRate) || isNaN(newRate)) {
      break;
    }
    
    rate = newRate;
  }
  
  return rate * 100; // Convert to percentage
};

// Function to calculate total IRR from monthly activities and current value
const calculateTotalIRR = (activities: ActivityLog[], holdings: Holding[]): { irr: number | null, irr_calculation_date: string | undefined } => {
  console.log("Calculating total IRR from monthly activities across all funds");
  
  // Get the total current value across all active holdings
  const activeHoldings = holdings.filter(h => h.status !== 'inactive' && !h.isVirtual);
  const totalCurrentValue = activeHoldings.reduce((sum, h) => sum + (h.market_value || 0), 0);
  
  if (totalCurrentValue <= 0 || activities.length === 0) {
    console.log("Cannot calculate IRR: No current value or activities");
    return { irr: null, irr_calculation_date: undefined };
  }
  
  // Group activities by month to get net cash flow for each month
  const monthlyNetCashFlows = new Map<string, number>();
  const monthlyDates = new Map<string, Date>();
  
  activities.forEach(activity => {
    // Skip activities for inactive funds
    const holding = holdings.find(h => h.id === activity.portfolio_fund_id);
    if (holding?.status === 'inactive' || holding?.isVirtual) return;
    
    const date = new Date(activity.activity_timestamp);
    const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    // Initialize if needed
    if (!monthlyNetCashFlows.has(monthYear)) {
      monthlyNetCashFlows.set(monthYear, 0);
      monthlyDates.set(monthYear, new Date(date.getFullYear(), date.getMonth(), 15)); // Use middle of month
    }
    
    // Add to net cash flow (negative for investments, positive for withdrawals)
    let cashFlowAmount = 0;
    
    switch (activity.activity_type) {
      case 'Investment':
      case 'RegularInvestment':
      case 'GovernmentUplift':
      case 'SwitchIn':
        cashFlowAmount = -Math.abs(activity.amount); // Negative - money going in
        break;
      case 'Withdrawal':
      case 'SwitchOut':
        cashFlowAmount = Math.abs(activity.amount); // Positive - money coming out
        break;
      default:
        // Ignore other activity types
        break;
    }
    
    const currentTotal = monthlyNetCashFlows.get(monthYear) || 0;
    monthlyNetCashFlows.set(monthYear, currentTotal + cashFlowAmount);
  });
  
  // Convert to array of cash flows
  const cashFlows: {date: Date, amount: number}[] = [];
  
  // Add each month's net cash flow
  monthlyNetCashFlows.forEach((amount, monthYear) => {
    if (amount !== 0) { // Only include non-zero cash flows
      cashFlows.push({
        date: monthlyDates.get(monthYear)!,
        amount: amount
      });
    }
  });
  
  // Add current total value as the final cash flow
  const currentDate = new Date();
  cashFlows.push({
    date: currentDate,
    amount: totalCurrentValue
  });
  
  console.log("Cash flows for IRR calculation:", cashFlows);
  
  // Calculate IRR
  const irr = calculateIRR(cashFlows);
  
  // Find the most recent valuation date among all holdings for the "as of" date
  const latestValuationDates = activeHoldings
    .filter(h => h.valuation_date)
    .map(h => h.valuation_date)
    .sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime());
  
  const latestValuationDate = latestValuationDates.length > 0 ? latestValuationDates[0] : undefined;
  
  return {
    irr: irr,
    irr_calculation_date: latestValuationDate
  };
};

// Add functions to calculate activity totals for inactive funds

// Calculate the total investments for inactive funds
const calculateInactiveFundsInvestments = (activities: ActivityLog[], inactiveHoldings: Holding[]): number => {
  return inactiveHoldings.reduce((total, holding) => {
    return total + calculateInvestments(activities, holding.id);
  }, 0);
};

// Calculate the total regular investments for inactive funds
const calculateInactiveFundsRegularInvestments = (activities: ActivityLog[], inactiveHoldings: Holding[]): number => {
  return inactiveHoldings.reduce((total, holding) => {
    return total + calculateRegularInvestments(activities, holding.id);
  }, 0);
};

// Calculate the total government uplifts for inactive funds
const calculateInactiveFundsGovernmentUplifts = (activities: ActivityLog[], inactiveHoldings: Holding[]): number => {
  return inactiveHoldings.reduce((total, holding) => {
    return total + calculateGovernmentUplifts(activities, holding.id);
  }, 0);
};

// Calculate the total fund switch ins for inactive funds
const calculateInactiveFundsSwitchIns = (activities: ActivityLog[], inactiveHoldings: Holding[]): number => {
  return inactiveHoldings.reduce((total, holding) => {
    return total + calculateSwitchIns(activities, holding.id);
  }, 0);
};

// Calculate the total fund switch outs for inactive funds
const calculateInactiveFundsSwitchOuts = (activities: ActivityLog[], inactiveHoldings: Holding[]): number => {
  return inactiveHoldings.reduce((total, holding) => {
    return total + calculateSwitchOuts(activities, holding.id);
  }, 0);
};

// Calculate the total withdrawals for inactive funds
const calculateInactiveFundsWithdrawals = (activities: ActivityLog[], inactiveHoldings: Holding[]): number => {
  return inactiveHoldings.reduce((total, holding) => {
    return total + calculateWithdrawals(activities, holding.id);
  }, 0);
};

// Calculate the total market value for inactive funds
const calculateInactiveFundsMarketValue = (inactiveHoldings: Holding[]): number => {
  return inactiveHoldings.reduce((total, holding) => {
    return total + (holding.market_value || 0);
  }, 0);
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
  const [deactivating, setDeactivating] = useState<boolean>(false);
  const [deactivationError, setDeactivationError] = useState<string | null>(null);
  const [showDeactivationConfirm, setShowDeactivationConfirm] = useState<boolean>(false);
  const [fundToDeactivate, setFundToDeactivate] = useState<{id: number, name: string, market_value: number} | null>(null);
  const [totalIRRData, setTotalIRRData] = useState<{
    irr_percentage: number | null;
    valuation_date?: string;
    status: string;
  } | null>(null);
  const [latestValuationDate, setLatestValuationDate] = useState<string | null>(null);
  const [isTotalIrrLoading, setIsTotalIrrLoading] = useState(false);
  const [totalIrr, setTotalIrr] = useState<number | null>(null);
  const [totalIrrCalculationDate, setTotalIrrCalculationDate] = useState<string | undefined>(undefined);
  const [totalIrrError, setTotalIrrError] = useState<string | null>(null);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [isProviderSwitchModalOpen, setIsProviderSwitchModalOpen] = useState<boolean>(false);
  const [availableProviders, setAvailableProviders] = useState<Array<{id: number, name: string}>>([]);
  const [selectedProvider, setSelectedProvider] = useState<number | null>(null);
  const [isSwitchingProvider, setIsSwitchingProvider] = useState(false);
  
  useEffect(() => {
    if (accountId) {
      console.log('AccountIRRCalculation: Fetching data for accountId:', accountId);
      fetchData(accountId);
    } else {
      console.error('AccountIRRCalculation: No accountId available for data fetching');
    }
  }, [accountId, api]);

  useEffect(() => {
    if (account?.portfolio_id && !isLoading && holdings.length > 0) {
      console.log(`ProductIRRCalculation: Year changed to ${selectedYear}, recalculating total IRR`);
      fetchTotalIRR().catch(err => {
        console.error('Error calculating total IRR after year change:', err);
      });
    }
  }, [account?.portfolio_id, selectedYear, holdings.length]);

  // Generate list of available years for filtering
  useEffect(() => {
    if (activityLogs.length > 0) {
      const currentYear = new Date().getFullYear();
      // Start from earliest activity log year or account start year
      let earliestYear = currentYear;
      
      if (account?.start_date) {
        const accountStartYear = new Date(account.start_date).getFullYear();
        earliestYear = Math.min(earliestYear, accountStartYear);
      }
      
      // Check activity logs for even earlier dates
      activityLogs.forEach(log => {
        if (log.activity_timestamp) {
          const logYear = new Date(log.activity_timestamp).getFullYear();
          earliestYear = Math.min(earliestYear, logYear);
        }
      });
      
      // Generate list of years from earliest to current
      const years: number[] = [];
      for (let year = earliestYear; year <= currentYear; year++) {
        years.push(year);
      }
      
      setAvailableYears(years.reverse()); // Most recent first
      
      // If selectedYear isn't set, default to current year
      if (!selectedYear) {
        setSelectedYear(currentYear);
      }
    }
  }, [activityLogs, account?.start_date, selectedYear]);

  const fetchData = async (accountId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('ProductIRRCalculation: Starting optimized data fetch for account ID:', accountId);
      
      // First fetch the account/product to get the portfolio_id
      const accountResponse = await api.get(`/client_products/${accountId}`);
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
            target_weighting: portfolioFund.weighting?.toString()
          };
          
          processedHoldings.push(holding);
        });
      }
      
      // Set state with the processed data
      setHoldings(processedHoldings);
      setAllFunds(completeData.all_funds || []);
      setActivityLogs(activityData.activity_logs || []);
      
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
      
      setIsLoading(false);
      
      // Calculate the total IRR once data is loaded
      if (accountResponse.data.portfolio_id) {
        console.log('ProductIRRCalculation: Calculating total IRR after data load');
        await fetchTotalIRR();
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load data. Please try again later.');
      setIsLoading(false);
    }
  };

    const fetchTotalIRR = async () => {
    if (!account?.portfolio_id || !selectedYear) {
      console.warn('Cannot fetch total IRR: missing portfolio ID or year');
      return Promise.resolve();
    }

    try {
      console.log(`ProductIRRCalculation: Fetching total IRR for portfolio ${account.portfolio_id} for year ${selectedYear}`);
      setIsTotalIrrLoading(true);
      setTotalIrrError(null);
      
      // Use the backend endpoint for portfolio total IRR calculation
      const response = await calculatePortfolioTotalIRR(account.portfolio_id, selectedYear);
      
      console.log('ProductIRRCalculation: Total IRR response from backend:', response.data);
      
      if (response.data.status === 'success') {
        // Backend calculation was successful
        setTotalIrr(response.data.irr_percentage || null);
        setTotalIrrCalculationDate(response.data.valuation_date);
        console.log(`ProductIRRCalculation: Using backend calculated IRR: ${response.data.irr_percentage}%`);
      } else {
        // Backend calculation failed
        console.error('Backend IRR calculation error:', response.data.error);
        setTotalIrrError(response.data.error || 'Failed to calculate total IRR');
        setTotalIrr(null);
      }
      
      setIsTotalIrrLoading(false);
      return Promise.resolve();
    } catch (error) {
      console.error('Error calculating total IRR:', error);
      setTotalIrrError('Failed to calculate total IRR');
      setTotalIrr(null);
      setIsTotalIrrLoading(false);
      return Promise.reject(error);
    }
  };

  // Update the refreshData function to also refresh the total IRR data
  const refreshData = () => {
    if (accountId) {
      console.log('DEBUG - Starting data refresh after activities updated');
      
      // Force a small delay to ensure backend operations have completed
      setTimeout(() => {
        console.log('DEBUG - Executing fetchData after delay');
        fetchData(accountId)
          .then(() => {
            console.log('DEBUG - Data refresh completed successfully');
            // Also refresh the total IRR calculation after data is refreshed
            if (account?.portfolio_id) {
              fetchTotalIRR();
            }
          })
          .catch(err => console.error('DEBUG - Error during data refresh:', err));
      }, 500);
    } else {
      console.warn('DEBUG - Cannot refresh data: accountId is missing');
    }
  };

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
      await api.patch(`/client_products/${account.id}`, {
        provider_id: selectedProvider
      });
      
      // Refresh the data after provider switch
      await fetchData(accountId as string);
      setIsProviderSwitchModalOpen(false);
      setSelectedProvider(null);
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
          {/* Notes Section */}
          <div className="col-span-12 bg-white shadow-sm rounded-lg border border-gray-200 p-4 mb-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Notes</h3>
            </div>
            <div className="relative">
              <textarea
                value={account?.notes || ''}
                onChange={(e) => {
                  if (account) {
                    const updatedAccount = { ...account, notes: e.target.value };
                    setAccount(updatedAccount);
                    // Use sendBeacon to save the notes when the user types
                    const blob = new Blob([JSON.stringify({ notes: e.target.value })], { type: 'application/json' });
                    navigator.sendBeacon(`/api/client_products/${account.id}/notes`, blob);
                  }
                }}
                onBlur={(e) => {
                  if (account) {
                    // Also save on blur for browsers that don't support sendBeacon
                    api.post(`client_products/${account.id}/notes`, { notes: e.target.value })
                      .catch(error => console.error('Failed to save notes:', error));
                  }
                }}
                placeholder="Enter any notes about this product..."
                className="w-full h-24 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>
          </div>

          {/* Total IRR Section - Moved to top */}
          <div className="col-span-12 bg-white shadow-sm rounded-lg border border-gray-200 p-4 mb-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Total IRR for {selectedYear}</h2>
              <div className="flex space-x-2">
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="border border-gray-300 rounded p-1 text-sm"
                >
                  {availableYears.map((year: number) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
                <button
                  onClick={fetchTotalIRR}
                  className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors"
                  disabled={isTotalIrrLoading}
                >
                  {isTotalIrrLoading ? 'Calculating...' : 'Refresh'}
                </button>
              </div>
            </div>
            
            {totalIrrError && (
              <div className="text-red-600 mb-2">{totalIrrError}</div>
            )}
            
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-12 md:col-span-6 bg-gray-50 p-4 rounded-lg">
                <div className="text-center">
                  <div className="text-lg font-semibold text-gray-500 mb-1">Total IRR</div>
                  <div className="text-3xl font-bold text-blue-600">
                    {isTotalIrrLoading ? (
                      <span className="text-gray-400">Calculating...</span>
                    ) : totalIrr !== null ? (
                      `${formatPercentage(totalIrr)}`
                    ) : (
                      <span className="text-gray-400">N/A</span>
                    )}
                  </div>
                  {totalIrrCalculationDate && (
                    <div className="text-xs text-gray-500 mt-1">
                      Calculated as of {formatDate(totalIrrCalculationDate)}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="col-span-12 md:col-span-6 bg-gray-50 p-4 rounded-lg">
                <div className="text-sm mb-3 text-gray-500">Performance Summary</div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-xs text-gray-500">Market Value</div>
                    <div className="font-semibold">{formatCurrency(calculateTotalValue(filterActiveHoldings(holdings)))}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Total Invested</div>
                    <div className="font-semibold">{formatCurrency(calculateTotalAmountInvested(filterActiveHoldings(holdings)))}</div>
                  </div>
                  {latestValuationDate && (
                    <div className="col-span-2 text-xs text-gray-500 mt-2">
                      Last valuation date: {formatDate(latestValuationDate)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Current Holdings Summary */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center">
                <h2 className="text-xl font-semibold text-gray-900">Period Overview</h2>
                <div className="ml-6">
                  <YearNavigator
                    selectedYear={selectedYear}
                    onYearChange={(year) => {
                      console.log(`Year changed to ${year}`);
                      setSelectedYear(year);
                    }}
                  />
                </div>
              </div>
            </div>
            
            {(() => {
              // Filter activities by the selected year
              console.log(`Filtering activities for period overview by year: ${selectedYear}`);
              const filteredActivities = filterActivitiesByYear(activityLogs, selectedYear);
              console.log(`After year filtering: ${filteredActivities.length} activities for ${selectedYear}`);
              
              return (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Name</th>
                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">ISIN</th>
                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Investments</th>
                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Regular Investments</th>
                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Government Uplifts</th>
                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Fund Switch Ins</th>
                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Fund Switch Outs</th>
                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Withdrawals</th>
                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Most Recent Value</th>
                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Most Recent IRR</th>
                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">Actions</th>
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
                        const previousFundsEntry = createPreviousFundsEntry(inactiveHoldings, filteredActivities);
                        
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
                        
                        // Sort holdings alphabetically with Cashline and Previous Funds special cases
                        return (
                          <>
                            {displayHoldings.sort((a, b) => {
                              // Previous Funds virtual entry always goes last
                              if (a.isVirtual) return 1;
                              if (b.isVirtual) return -1;
                              
                              // Cashline always goes second-to-last (before Previous Funds)
                              if (a.fund_name === 'Cashline') return 1;
                              if (b.fund_name === 'Cashline') return -1;
                              
                              // All other funds are sorted alphabetically
                              return (a.fund_name || '').localeCompare(b.fund_name || '');
                            }).map((holding) => {
                              console.log(`Rendering sorted holding: ${holding.id} (${holding.fund_name}), isVirtual: ${holding.isVirtual}`);
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
                                    {holding.isVirtual 
                                      ? formatCurrency(calculateInactiveFundsInvestments(filteredActivities, inactiveHoldings))
                                      : formatCurrency(calculateInvestments(filteredActivities, holding.id))}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className={`text-sm ${holding.isVirtual ? "font-medium text-blue-800" : "text-gray-900"}`}>
                                    {holding.isVirtual 
                                      ? formatCurrency(calculateInactiveFundsRegularInvestments(filteredActivities, inactiveHoldings))
                                      : formatCurrency(calculateRegularInvestments(filteredActivities, holding.id))}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className={`text-sm ${holding.isVirtual ? "font-medium text-blue-800" : "text-gray-900"}`}>
                                    {holding.isVirtual
                                      ? formatCurrency(calculateInactiveFundsGovernmentUplifts(filteredActivities, inactiveHoldings))
                                      : formatCurrency(calculateGovernmentUplifts(filteredActivities, holding.id))}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className={`text-sm ${holding.isVirtual ? "font-medium text-blue-800" : "text-gray-900"}`}>
                                    {holding.isVirtual
                                      ? formatCurrency(calculateInactiveFundsSwitchIns(filteredActivities, inactiveHoldings))
                                      : formatCurrency(calculateSwitchIns(filteredActivities, holding.id))}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className={`text-sm ${holding.isVirtual ? "font-medium text-blue-800" : "text-gray-900"}`}>
                                    {holding.isVirtual
                                      ? formatCurrency(calculateInactiveFundsSwitchOuts(filteredActivities, inactiveHoldings))
                                      : formatCurrency(calculateSwitchOuts(filteredActivities, holding.id))}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className={`text-sm ${holding.isVirtual ? "font-medium text-blue-800" : "text-gray-900"}`}>
                                    {holding.isVirtual
                                      ? formatCurrency(calculateInactiveFundsWithdrawals(filteredActivities, inactiveHoldings))
                                      : formatCurrency(calculateWithdrawals(filteredActivities, holding.id))}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div className={`text-sm ${holding.isVirtual ? "font-medium text-blue-800" : "text-gray-900"}`}>
                                    {holding.isVirtual ? (
                                      <span>N/A</span>
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
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <div>
                                    <div className={`text-sm ${
                                      holding.irr !== undefined 
                                        ? (holding.irr >= 0 
                                          ? (holding.isVirtual ? "font-medium text-green-700" : "text-green-700") 
                                          : (holding.isVirtual ? "font-medium text-red-700" : "text-red-700"))
                                        : "text-gray-500"
                                    }`}>
                                      {holding.isVirtual ? (
                                        <span>N/A</span>
                                      ) : (
                                        holding.irr !== undefined ? (
                                          <>
                                            {Math.abs(holding.irr) > 1 
                                              ? `${holding.irr.toFixed(1)}%` 
                                              : formatPercentage(holding.irr)}
                                            <span className="ml-1">
                                              {holding.irr >= 0 ? '▲' : '▼'}
                                            </span>
                                          </>
                                        ) : 'N/A'
                                      )}
                                    </div>
                                    {holding.irr_calculation_date && !holding.isVirtual && (
                                      <div className="text-xs text-gray-500 mt-1">
                                        as of {formatDate(holding.irr_calculation_date)}
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  {!holding.isVirtual && holding.status !== 'inactive' && (
                                    <button
                                      onClick={() => {
                                        setFundToDeactivate({
                                          id: holding.id,
                                          name: holding.fund_name || 'Unknown Fund',
                                          market_value: holding.market_value || 0
                                        });
                                        setShowDeactivationConfirm(true);
                                      }}
                                      className="px-2 py-1 text-xs font-medium rounded text-red-600 border border-red-200 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                                      title="Deactivate Fund"
                                    >
                                      Deactivate
                                    </button>
                                  )}
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
                            {formatCurrency(calculateTotalInvestments(filteredActivities, holdings))}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-bold text-red-600">
                            {formatCurrency(calculateTotalRegularInvestments(filteredActivities, holdings))}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-bold text-red-600">
                            {formatCurrency(calculateTotalGovernmentUplifts(filteredActivities, holdings))}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-bold text-red-600">
                            {formatCurrency(calculateTotalSwitchIns(filteredActivities, holdings))}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-bold text-red-600">
                            {formatCurrency(calculateTotalSwitchOuts(filteredActivities, holdings))}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-bold text-red-600">
                            {formatCurrency(calculateTotalWithdrawals(filteredActivities, holdings))}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-bold text-red-600">
                            {formatCurrency(calculateTotalValue(holdings))}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {/* Total IRR calculation from properly calculated data */}
                          {(() => {
                            return totalIrr !== null ? (
                              <div>
                                <div className={`text-sm font-bold ${
                                  totalIrr >= 0 ? 'text-green-700' : 'text-red-700'
                                }`}>
                                  {formatPercentage(totalIrr)}
                                  <span className="ml-1">
                                    {totalIrr >= 0 ? '▲' : '▼'}
                                  </span>
                                </div>
                                {totalIrrCalculationDate && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    as of {formatDate(totalIrrCalculationDate)}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-sm text-gray-500">N/A</span>
                            );
                          })()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap"></td>
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
              <div className="flex items-center"> {/* Container for buttons */}
                {/* Added Recurring Investment Button */}
                <button
                  onClick={() => {}} // Non-functional
                  className="mr-2 px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
                >
                  Recurring Investment
                </button>
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
                <button
                  onClick={() => setIsProviderSwitchModalOpen(true)}
                  className="mr-2 px-4 py-2 bg-indigo-600 text-white font-medium rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Provider Switch
                </button>
              </div>
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
              
              // Create a virtual "Previous Funds" entry for the EditableMonthlyActivitiesTable
              const previousFundsEntry = inactiveHoldings.length > 0 ? {
                id: -1,
                holding_id: -1,
                fund_name: 'Previous Funds',
                irr: undefined, // Set to undefined as we'll always display N/A
                isActive: false,
                isVirtual: true,
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
                // Previous Funds entry always goes last
                if (a.id === -1) return 1;
                if (b.id === -1) return -1;
                
                // Cashline always goes second-to-last (before Previous Funds)
                if (a.fund_name === 'Cashline') return 1;
                if (b.fund_name === 'Cashline') return -1;
                
                // All other funds are sorted alphabetically
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

          {/* Total IRR Section has been moved to the top of the page */}
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
      
      {/* Deactivation Confirmation Dialog */}
      <Transition appear show={showDeactivationConfirm} as={Fragment}>
        <Dialog 
          as="div" 
          className="relative z-10" 
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

          <div className="fixed inset-0 overflow-y-auto">
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
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-lg bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900"
                  >
                    Deactivate Fund
                  </Dialog.Title>
                  
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      Are you sure you want to deactivate <span className="font-semibold">{fundToDeactivate?.name}</span>?
                    </p>
                    
                    {fundToDeactivate && fundToDeactivate.market_value > 0 && (
                      <div className="mt-2 p-2 bg-red-50 text-red-700 rounded border border-red-200 text-sm">
                        Warning: This fund has a valuation of {formatCurrency(fundToDeactivate.market_value)}. 
                        Deactivating a fund with a non-zero valuation is not recommended.
                      </div>
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
                      onClick={() => fundToDeactivate && deactivatePortfolioFund(fundToDeactivate.id)}
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
                        'Deactivate Fund'
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
          className="relative z-10" 
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

          <div className="fixed inset-0 overflow-y-auto">
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
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-lg bg-white p-6 text-left align-middle shadow-xl transition-all">
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
                      disabled={!selectedProvider || isSwitchingProvider}
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
    </div>
  );
};

export default AccountIRRCalculation;