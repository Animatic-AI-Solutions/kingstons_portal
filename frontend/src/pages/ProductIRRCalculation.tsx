import React, { useState, useEffect, Fragment, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import EditableMonthlyActivitiesTable from '../components/EditableMonthlyActivitiesTable';
import IRRCalculationModal from '../components/IRRCalculationModal';
import PresenceIndicator from '../components/PresenceIndicator';
import PresenceNotifications from '../components/PresenceNotifications';
import ConcurrentUserModal from '../components/ui/ConcurrentUserModal';
import { useConcurrentUserDetection } from '../hooks/useConcurrentUserDetection';
import { usePresenceWithNotifications } from '../hooks/usePresenceWithNotifications';
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
  const matchingActivities = activities.filter(activity => {
    const typeMatches = activity.activity_type === type;
    const fundMatches = activity.portfolio_fund_id === fundId;
    
    return typeMatches && fundMatches;
  });
  
  const total = matchingActivities.reduce((total, activity) => total + Math.abs(activity.amount), 0);
  
  return total;
};

const calculateInvestments = (activities: ActivityLog[], fundId: number): number => {
  return calculateActivityTotalByType(activities, 'Investment', fundId);
};

const calculateRegularInvestments = (activities: ActivityLog[], fundId: number): number => {
  return calculateActivityTotalByType(activities, 'RegularInvestment', fundId);
};

const calculateTaxUplifts = (activities: ActivityLog[], fundId: number): number => {
  return calculateActivityTotalByType(activities, 'TaxUplift', fundId);
};

const calculateSwitchIns = (activities: ActivityLog[], fundId: number): number => {
  return calculateActivityTotalByType(activities, 'FundSwitchIn', fundId);
};

const calculateSwitchOuts = (activities: ActivityLog[], fundId: number): number => {
  return calculateActivityTotalByType(activities, 'FundSwitchOut', fundId);
};

const calculateProductSwitchIns = (activities: ActivityLog[], fundId: number): number => {
  return calculateActivityTotalByType(activities, 'ProductSwitchIn', fundId);
};

const calculateProductSwitchOuts = (activities: ActivityLog[], fundId: number): number => {
  return calculateActivityTotalByType(activities, 'ProductSwitchOut', fundId);
};

const calculateWithdrawals = (activities: ActivityLog[], fundId: number): number => {
  return calculateActivityTotalByType(activities, 'Withdrawal', fundId);
};



const calculateInvestmentsPlusSwitchIns = (activities: ActivityLog[], fundId: number): number => {
  const investments = calculateInvestments(activities, fundId);
  const regularInvestments = calculateRegularInvestments(activities, fundId);
      const taxUplifts = calculateTaxUplifts(activities, fundId);
    const switchIns = calculateSwitchIns(activities, fundId);
    const productSwitchIns = calculateProductSwitchIns(activities, fundId);
    
    return investments + regularInvestments + taxUplifts + switchIns + productSwitchIns;
};

const calculateValueMinusWithdrawals = (marketValue: number, activities: ActivityLog[], fundId: number): number => {
  const withdrawals = calculateWithdrawals(activities, fundId);
  const switchOuts = calculateSwitchOuts(activities, fundId);
  const productSwitchOuts = calculateProductSwitchOuts(activities, fundId);
  
  return marketValue + withdrawals + switchOuts + productSwitchOuts;
};

// Helper functions to calculate totals for the Period Overview table
const calculateTotalAmountInvested = (holdings: Holding[]): number => {
  return holdings.reduce((total, holding) => {
    // Convert amount_invested to number (it might come as string from database)
    const amountInvested = holding.amount_invested || 0;
    const numericAmountInvested = typeof amountInvested === 'string' ? parseFloat(amountInvested) : amountInvested;
    
    // Skip if conversion failed
    if (isNaN(numericAmountInvested)) {
      return total;
    }
    
    return total + numericAmountInvested;
  }, 0);
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

// Helper function to detect non-common valuation dates
const detectNonCommonValuationDates = (holdings: Holding[]): {
  hasNonCommonDates: boolean;
  nonCommonFunds: Array<{ fund_name: string; valuation_date: string }>;
  commonDates: string[];
} => {
  // Filter to only active holdings (ignore inactive ones)
  const allActiveHoldings = filterActiveHoldings(holdings);

  // IMPORTANT: Exclude Cash funds from valuation date completeness check
  // Cash funds are included in portfolio IRR calculations but don't need their own IRR
  // and shouldn't block portfolio IRR calculation due to different valuation dates
  const activeHoldings = allActiveHoldings.filter(h =>
    !isCashFund({ fund_name: h.fund_name, isin_number: h.isin_number, id: h.id })
  );

  console.log('🔍 Valuation Date Detection Debug:', {
    totalHoldings: holdings.length,
    allActiveHoldings: allActiveHoldings.length,
    activeHoldingsExcludingCash: activeHoldings.length,
    excludedCashFunds: allActiveHoldings.length - activeHoldings.length,
    holdingsData: activeHoldings.map(h => ({
      id: h.id,
      fund_name: h.fund_name,
      valuation_date: h.valuation_date,
      market_value: h.market_value,
      status: h.status
    }))
  });
  
  if (activeHoldings.length === 0) {
    console.log('🔍 No active holdings found');
    return { hasNonCommonDates: false, nonCommonFunds: [], commonDates: [] };
  }
  
  // NEW: Get ALL unique valuation dates across all funds (including those with multiple valuations)
  // This is the key change - we need to check completeness for each date
  const allValuationDatesSet = new Set<string>();
  activeHoldings.forEach(holding => {
    if (holding.valuation_date && holding.market_value !== null && holding.market_value !== undefined) {
      allValuationDatesSet.add(holding.valuation_date);
    }
  });
  
  const allValuationDates = Array.from(allValuationDatesSet).sort((a, b) => b.localeCompare(a));
  
  console.log('🔍 All unique valuation dates found:', allValuationDates);

  // If no dates found, no issue
  if (allValuationDates.length === 0) {
    console.log('🔍 No funds have valuations');
    return { hasNonCommonDates: false, nonCommonFunds: [], commonDates: [] };
  }
  
  // NEW: Check each date for completeness - do ALL active funds have a valuation for this date?
  const incompleteDates: string[] = [];
  const completeDates: string[] = [];
  const incompleteDetails: Array<{ date: string; missingFunds: string[] }> = [];
  
  allValuationDates.forEach(date => {
    const fundsWithThisDate = activeHoldings.filter(holding => 
      holding.valuation_date === date && 
      holding.market_value !== null && 
      holding.market_value !== undefined
    );
    
    const fundsWithoutThisDate = activeHoldings.filter(holding => 
      holding.valuation_date !== date || 
      holding.market_value === null || 
      holding.market_value === undefined
    );
    
    console.log(`🔍 Date ${date} completeness:`, {
      totalActiveFunds: activeHoldings.length,
      fundsWithThisDate: fundsWithThisDate.length,
      fundsWithoutThisDate: fundsWithoutThisDate.length,
      missingFunds: fundsWithoutThisDate.map(f => f.fund_name)
    });
    
    if (fundsWithThisDate.length > 0 && fundsWithoutThisDate.length > 0) {
      // INCOMPLETE DATE: Some funds have this date, others don't
      incompleteDates.push(date);
      incompleteDetails.push({
        date,
        missingFunds: fundsWithoutThisDate.map(f => f.fund_name || 'Unknown Fund')
      });
    } else if (fundsWithThisDate.length === activeHoldings.length) {
      // COMPLETE DATE: All funds have this date
      completeDates.push(date);
    }
    // If fundsWithThisDate.length === 0, no funds have this date (shouldn't happen due to our filter)
  });

  console.log('🔍 Date completeness analysis:', {
    completeDates: completeDates.length,
    incompleteDates: incompleteDates.length,
    incompleteDetails
  });

  // If we found incomplete dates, show warning
  if (incompleteDates.length > 0) {
    // Create the list of funds that are missing valuations for incomplete dates
    const nonCommonFunds: Array<{ fund_name: string; valuation_date: string }> = [];

    incompleteDetails.forEach(({ date, missingFunds }) => {
      missingFunds.forEach(fundName => {
        nonCommonFunds.push({
          fund_name: fundName,
          valuation_date: `Missing for ${new Date(date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`
        });
      });
    });

    console.log('⚠️ [VALUATION CHECK] INCOMPLETE VALUATION DATES DETECTED:', {
      incompleteDates,
      affectedFunds: nonCommonFunds.length,
      details: incompleteDetails
    });
    console.log('⚠️ [VALUATION CHECK] Portfolio IRR CAN still be calculated for complete dates:', completeDates);

    return {
      hasNonCommonDates: true,
      nonCommonFunds,
      commonDates: completeDates
    };
  }

  // Legacy logic: Check for funds with no valuations at all
  const fundsWithoutAnyValuations = activeHoldings.filter(holding =>
    !holding.valuation_date || holding.market_value === null || holding.market_value === undefined
  );

  if (fundsWithoutAnyValuations.length > 0) {
    const nonCommonFunds = fundsWithoutAnyValuations.map(holding => {
      let displayText = 'No valuation date';
      if (holding.valuation_date) {
        if (holding.market_value === null || holding.market_value === undefined) {
          displayText = 'No valuation amount';
        }
      }
      
      return {
        fund_name: holding.fund_name || 'Unknown Fund',
        valuation_date: displayText
      };
    });
    
    console.log('🔍 Some funds have no valuations at all');
    return {
      hasNonCommonDates: true,
      nonCommonFunds,
      commonDates: completeDates
    };
  }

  // All dates are complete - no warnings needed
  console.log('🔍 All valuation dates are complete across all funds');
  console.log('✅ [VALUATION CHECK] PASSED - Common dates found:', completeDates);
  console.log('✅ [VALUATION CHECK] Portfolio IRR can be calculated for these dates:', completeDates);
  return {
    hasNonCommonDates: false,
    nonCommonFunds: [],
    commonDates: completeDates
  };
};

// Create a virtual "Previous Funds" entry that aggregates all inactive funds
const createPreviousFundsEntry = (inactiveHoldings: Holding[], activityLogs: ActivityLog[]): Holding | null => {
  console.log("Creating Previous Funds entry with", inactiveHoldings.length, "inactive holdings");
  
  if (inactiveHoldings.length === 0) {
    console.log("No inactive holdings found, not creating Previous Funds entry");
    return null;
  }
  
  // Sum up all the values from inactive holdings
  const totalAmountInvested = inactiveHoldings.reduce((sum, holding) => {
    const amountInvested = holding.amount_invested || 0;
    const numericAmount = typeof amountInvested === 'string' ? parseFloat(amountInvested) : amountInvested;
    return sum + (isNaN(numericAmount) ? 0 : numericAmount);
  }, 0);
  
  const totalMarketValue = inactiveHoldings.reduce((sum, holding) => {
    const marketValue = holding.market_value || 0;
    const numericValue = typeof marketValue === 'string' ? parseFloat(marketValue) : marketValue;
    return sum + (isNaN(numericValue) ? 0 : numericValue);
  }, 0);
  
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

const calculatePreviousFundsTaxUplifts = (activities: ActivityLog[], inactiveHoldings: Holding[]): number => {
  return inactiveHoldings.reduce((total, holding) => {
    return total + calculateTaxUplifts(activities, holding.id);
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
  // Include ALL real holdings (active and inactive) but exclude virtual entries
  const allRealHoldings = holdings.filter(h => !h.isVirtual);
  const total = allRealHoldings.reduce((total, holding) => {
    const amount = calculateRegularInvestments(activities, holding.id);
    return total + amount;
  }, 0);
  
  return total;
};

const calculateTotalTaxUplifts = (activities: ActivityLog[], holdings: Holding[]): number => {
  // Include ALL real holdings (active and inactive) but exclude virtual entries
  const allRealHoldings = holdings.filter(h => !h.isVirtual);
  const total = allRealHoldings.reduce((total, holding) => {
    const amount = calculateTaxUplifts(activities, holding.id);
    return total + amount;
  }, 0);
  
  return total;
};

const calculateTotalSwitchIns = (activities: ActivityLog[], holdings: Holding[]): number => {
  // Include ALL real holdings (active and inactive) but exclude virtual entries
  const allRealHoldings = holdings.filter(h => !h.isVirtual);
  const total = allRealHoldings.reduce((total, holding) => {
    const amount = calculateSwitchIns(activities, holding.id);
    return total + amount;
  }, 0);
  
  return total;
};

const calculateTotalSwitchOuts = (activities: ActivityLog[], holdings: Holding[]): number => {
  // Include ALL real holdings (active and inactive) but exclude virtual entries
  const allRealHoldings = holdings.filter(h => !h.isVirtual);
  const total = allRealHoldings.reduce((total, holding) => {
    const amount = calculateSwitchOuts(activities, holding.id);
    return total + amount;
  }, 0);
  
  return total;
};

const calculateTotalProductSwitchIns = (activities: ActivityLog[], holdings: Holding[]): number => {
  // Include ALL real holdings (active and inactive) but exclude virtual entries
  const allRealHoldings = holdings.filter(h => !h.isVirtual);
  const total = allRealHoldings.reduce((total, holding) => {
    const amount = calculateProductSwitchIns(activities, holding.id);
    return total + amount;
  }, 0);
  
  return total;
};

const calculateTotalProductSwitchOuts = (activities: ActivityLog[], holdings: Holding[]): number => {
  // Include ALL real holdings (active and inactive) but exclude virtual entries
  const allRealHoldings = holdings.filter(h => !h.isVirtual);
  const total = allRealHoldings.reduce((total, holding) => {
    const amount = calculateProductSwitchOuts(activities, holding.id);
    return total + amount;
  }, 0);
  
  return total;
};

const calculateTotalWithdrawals = (activities: ActivityLog[], holdings: Holding[]): number => {
  // Include ALL real holdings (active and inactive) but exclude virtual entries
  const allRealHoldings = holdings.filter(h => !h.isVirtual);
  const total = allRealHoldings.reduce((total, holding) => {
    const amount = calculateActivityTotalByType(activities, 'Withdrawal', holding.id);
    return total + amount;
  }, 0);
  
  return total;
};



const calculateTotalValue = (holdings: Holding[]): number => {
  return holdings.reduce((total, holding) => {
    // Skip Previous Funds virtual entry and inactive holdings when calculating total market value
    if (holding.isVirtual || holding.status === 'inactive') {
      return total;
    }
    
    // Convert market_value to number (it might come as string from database)
    const marketValue = holding.market_value || 0;
    const numericMarketValue = typeof marketValue === 'string' ? parseFloat(marketValue) : marketValue;
    
    // Skip if conversion failed
    if (isNaN(numericMarketValue)) {
      return total;
    }
    
    return total + numericMarketValue;
  }, 0);
};



const calculateTotalValueMinusWithdrawals = (holdings: Holding[], activities: ActivityLog[]): number => {
  // Include ALL real holdings (active and inactive) but exclude virtual entries
  const allRealHoldings = holdings.filter(h => !h.isVirtual);
  return allRealHoldings.reduce((total, holding) => {
    // Convert market_value to number (it might come as string from database)
    const marketValue = holding.market_value || 0;
    const numericMarketValue = typeof marketValue === 'string' ? parseFloat(marketValue) : marketValue;
    
    // Skip if conversion failed
    if (isNaN(numericMarketValue)) {
      return total;
    }
    
    return total + calculateValueMinusWithdrawals(numericMarketValue, activities, holding.id);
  }, 0);
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
    // Only include activities of type 'Investment' for this column
    // Regular investments and tax uplifts have their own separate columns
    const amount = calculateInvestments(activities, holding.id);
    console.log(`Investments only for holding ${holding.id} (${holding.fund_name}): ${amount}`);
    return total + amount;
  }, 0);
  
  console.log(`Total investments (Investment type only): ${total}`);
  return total;
};

interface AccountIRRCalculationProps {
  accountId?: string;
}

// Move PreviousFundsIRRDisplay outside main component to prevent recreating on each render
const PreviousFundsIRRDisplay: React.FC<{ 
  inactiveHoldings: Holding[]; 
  latestValuationDate: string | null;
  activityLogs: ActivityLog[]; // Add activityLogs as dependency since IRR depends on cash flows
}> = React.memo(({ inactiveHoldings, latestValuationDate, activityLogs }) => {
  const [livePreviousFundsIRR, setLivePreviousFundsIRR] = useState<number | null>(null);
  const [isLoadingLivePreviousFundsIRR, setIsLoadingLivePreviousFundsIRR] = useState(false);

  // Format date for display (month and year only)
  const formatDateMonthYear = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short'
    });
  };

  // Memoize the inactive fund IDs to prevent unnecessary recalculations
  const inactiveFundIds = useMemo(() => 
    inactiveHoldings.map(h => h.id), 
    [inactiveHoldings]
  );

  // Memoize relevant activities for the inactive funds
  const relevantActivities = useMemo(() => {
    const activities = activityLogs.filter(activity => 
      inactiveFundIds.includes(activity.portfolio_fund_id)
    );
    
    // Sort by timestamp and fund ID for consistent comparison
    return activities.sort((a, b) => {
      const timeCompare = a.activity_timestamp.localeCompare(b.activity_timestamp);
      if (timeCompare !== 0) return timeCompare;
      return a.portfolio_fund_id - b.portfolio_fund_id;
    });
  }, [activityLogs, inactiveFundIds]);

  // Create a simple cache key based on fund IDs and activity count/sum
  const cacheKey = useMemo(() => {
    const fundIdsStr = inactiveFundIds.sort().join(',');
    const activitySum = relevantActivities.reduce((sum, activity) => sum + activity.amount, 0);
    const activityCount = relevantActivities.length;
    return `${fundIdsStr}-${activityCount}-${activitySum}`;
  }, [inactiveFundIds, relevantActivities]);

  const calculateLivePreviousFundsIRR = useCallback(async () => {
    if (inactiveFundIds.length === 0) {
      console.log('PreviousFundsIRRDisplay: No inactive funds, skipping calculation');
      return;
    }
    
    console.log(`PreviousFundsIRRDisplay: Starting IRR calculation for funds [${inactiveFundIds.join(', ')}]`);
    console.log(`PreviousFundsIRRDisplay: Cache key: ${cacheKey}`);
    
    setIsLoadingLivePreviousFundsIRR(true);
    try {
      const response = await calculateStandardizedMultipleFundsIRR({
        portfolioFundIds: inactiveFundIds
      });
      
      if (response.data && response.data.irr_percentage !== undefined) {
        console.log(`PreviousFundsIRRDisplay: IRR calculation completed: ${response.data.irr_percentage}%`);
        // API returns a percentage value (like 5.2 for 5.2%) ready for display
        setLivePreviousFundsIRR(response.data.irr_percentage);
      }
    } catch (error) {
      console.error('PreviousFundsIRRDisplay: Error calculating IRR:', error);
      setLivePreviousFundsIRR(null);
    } finally {
      setIsLoadingLivePreviousFundsIRR(false);
    }
  }, [inactiveFundIds, cacheKey]);

  // Only recalculate when the cache key changes
  useEffect(() => {
    calculateLivePreviousFundsIRR();
  }, [calculateLivePreviousFundsIRR]);

  if (isLoadingLivePreviousFundsIRR) {
    return <span className="text-xs text-gray-500 text-right">Loading...</span>;
  }

  if (livePreviousFundsIRR !== null) {
    return (
      <>
        <div className={`font-medium text-right ${
          livePreviousFundsIRR >= 0 ? 'text-green-700' : 'text-red-700'
        }`}>
          {/* API returns percentage values (e.g., 5.2 for 5.2%), so display directly with % sign */}
          {livePreviousFundsIRR.toFixed(1)}%
          <span className="ml-1">
            {livePreviousFundsIRR >= 0 ? '▲' : '▼'}
          </span>
        </div>
        {livePreviousFundsIRR !== null && (
          <div className="text-xs text-gray-600 mt-1 text-right">
            {latestValuationDate ? formatDateMonthYear(latestValuationDate) : 'N/A'}
          </div>
        )}
      </>
    );
  }

  return <span className="text-gray-500 text-right">N/A</span>;
}, (prevProps, nextProps) => {
  // Custom comparison function for React.memo
  // Only re-render if the actual data that affects IRR calculation has changed
  
  // Compare inactive holdings
  if (prevProps.inactiveHoldings.length !== nextProps.inactiveHoldings.length) {
    console.log('PreviousFundsIRRDisplay: Re-rendering due to inactive holdings count change');
    return false;
  }
  
  const prevFundIds = prevProps.inactiveHoldings.map(h => h.id).sort();
  const nextFundIds = nextProps.inactiveHoldings.map(h => h.id).sort();
  if (JSON.stringify(prevFundIds) !== JSON.stringify(nextFundIds)) {
    console.log('PreviousFundsIRRDisplay: Re-rendering due to fund IDs change');
    return false;
  }
  
  // Compare relevant activities
  const prevRelevantActivities = prevProps.activityLogs.filter(activity => 
    prevFundIds.includes(activity.portfolio_fund_id)
  );
  const nextRelevantActivities = nextProps.activityLogs.filter(activity => 
    nextFundIds.includes(activity.portfolio_fund_id)
  );
  
  if (prevRelevantActivities.length !== nextRelevantActivities.length) {
    console.log('PreviousFundsIRRDisplay: Re-rendering due to activity count change');
    return false;
  }
  
  // Simple comparison of activity sums (if activities changed, sum will likely change)
  const prevActivitySum = prevRelevantActivities.reduce((sum, activity) => sum + activity.amount, 0);
  const nextActivitySum = nextRelevantActivities.reduce((sum, activity) => sum + activity.amount, 0);
  
  if (prevActivitySum !== nextActivitySum) {
    console.log('PreviousFundsIRRDisplay: Re-rendering due to activity sum change');
    return false;
  }
  
  // Compare valuation date
  if (prevProps.latestValuationDate !== nextProps.latestValuationDate) {
    console.log('PreviousFundsIRRDisplay: Re-rendering due to valuation date change');
    return false;
  }
  
  // If we get here, props are effectively the same
  console.log('PreviousFundsIRRDisplay: Skipping re-render - props unchanged');
  return true;
});

const AccountIRRCalculation: React.FC<AccountIRRCalculationProps> = ({ accountId: propAccountId }) => {
  const { accountId: paramAccountId } = useParams<{ accountId: string }>();
  const accountId = propAccountId || paramAccountId;
  const navigate = useNavigate();
  const { api } = useAuth();
  const queryClient = useQueryClient();
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
  const [hasUnsavedNotes, setHasUnsavedNotes] = useState(false);
  
  // Notes state - will be loaded from database
  const [notes, setNotes] = useState<string>('');
  const [lastSavedNotes, setLastSavedNotes] = useState<string>('');
  const [isNotesSaving, setIsNotesSaving] = useState(false);
  
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

    // Valuation date indicator tooltip state
  const [showValuationTooltip, setShowValuationTooltip] = useState(false);

  // Concurrent user detection
  const {
    showConcurrentUserModal,
    currentUsers,
    handleConfirmProceed,
    handleCancel,
    isCheckingPresence
  } = useConcurrentUserDetection({
    pageIdentifier: `irr-calculation-product-${accountId}`,
    pageName: 'IRR Calculation',
    onlyForProductPages: false
  });

  // Presence with notifications
  const {
    users: presenceUsers,
    isConnected: presenceConnected,
    notifications,
    dismissNotification,
    dismissAllNotifications
  } = usePresenceWithNotifications({
    pageIdentifier: `irr-calculation:product-${accountId}`,
    enabled: true,
    showNotifications: true,
    notificationDuration: 4000
  });

  // Memoize inactiveHoldings to prevent unnecessary recalculations and re-renders
  const inactiveHoldings = useMemo(() => 
    filterInactiveHoldings(holdings), 
    [holdings]
  );

  // Memoize non-common valuation dates detection
  const valuationDateInfo = useMemo(() => 
    detectNonCommonValuationDates(holdings), 
    [holdings]
  );

  useEffect(() => {
    if (accountId) {
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
    if (paramAccountId && account) {
      // Notes are now loaded directly from database in account object
      // No localStorage needed - each product has its own notes
      setInitialNotes(account.notes || '');
    }
  }, [account?.id]);

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
            setTotalPortfolioIRRError(null); // Clear error state - this is a successful "no data" response
            console.log('No portfolio IRR data found - this is normal when no IRR has been calculated');
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
        // Convert IRR to number (it comes from database as string)
        const numericIRR = typeof holding.irr === 'string' ? parseFloat(holding.irr) : holding.irr;
        
        mappedIRRs[holding.id] = {
          irr: numericIRR,
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

  // Load notes from localStorage when component mounts and account data is available
  useEffect(() => {
    if (paramAccountId && account) {
      // Notes are now loaded directly from database in account object
      // No localStorage needed - each product has its own notes
      setInitialNotes(account.notes || '');
    }
  }, [account?.id]);

  // Handle clicking outside tooltip to close it
  useEffect(() => {
    const handleClickOutside = (event: Event) => {
      const target = event.target as Element;
      if (showValuationTooltip && !target.closest('.valuation-tooltip-container')) {
        setShowValuationTooltip(false);
      }
    };

    if (showValuationTooltip) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showValuationTooltip]);

  // Save notes to localStorage when tab becomes hidden (but no beforeunload warning)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && account?.notes) {
        // Notes are now auto-saved to database on blur - no localStorage needed
        // Each product has its own notes in the database
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [account?.notes]);


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
        // Initialize notes from account data - each product has its own notes
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
      
      // Set account data with portfolio information - each product has its own notes
      setAccount(accountResponse.data);
      setInitialNotes(accountResponse.data.notes || '');
      
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
      // Clear single fund IRR cache to ensure fresh data
      setSingleFundIRRs({});
      setIsLoadingSingleFundIRRs(false);
      
      // Force a small delay to ensure backend operations have completed
      setTimeout(async () => {
        try {
          await fetchData(accountId);
          
          // After the main data fetch, explicitly refresh IRR values from views
          // to ensure the Period Overview table shows the latest calculated IRRs
          
          // Fetch latest portfolio IRR for totals row
          if (account?.portfolio_id) {
            try {
              const response = await getLatestPortfolioIRR(account.portfolio_id);
              
              if (response.data && response.data.irr_result !== null && response.data.irr_result !== undefined) {
                setTotalPortfolioIRR(response.data.irr_result);
                setTotalPortfolioIRRDate(response.data.irr_date);
              } else {
                setTotalPortfolioIRR(null);
                setTotalPortfolioIRRDate(undefined);
              }
            } catch (irrError) {
              console.error('Error fetching latest portfolio IRR:', irrError);
              // Clear the IRR data on error (e.g., 404 when no IRR exists)
              setTotalPortfolioIRR(null);
              setTotalPortfolioIRRDate(undefined);
            }
          }
          
          // Force a second fetch with a longer delay to ensure all IRR calculations
          // have been completed and stored in the database views
          setTimeout(async () => {
            try {
              // Re-fetch the complete portfolio data to get updated IRR values
              if (account?.portfolio_id) {
                const completePortfolioResponse = await api.get(`/portfolios/${account.portfolio_id}/complete`);
                const completeData = completePortfolioResponse.data;
                
                // Update holdings with latest IRR values
                if (completeData.portfolio_funds && completeData.portfolio_funds.length > 0) {
                  const updatedHoldings: Holding[] = [];
                  
                  completeData.portfolio_funds.forEach((portfolioFund: any) => {
                    const holding: Holding = {
                      id: portfolioFund.id,
                      fund_id: portfolioFund.available_funds_id,
                      fund_name: portfolioFund.fund_name,
                      isin_number: portfolioFund.isin_number,
                      amount_invested: portfolioFund.amount_invested || 0,
                      market_value: portfolioFund.market_value || 0,
                      irr: portfolioFund.irr_result, // This should now have the latest IRR value
                      irr_calculation_date: portfolioFund.irr_date,
                      account_holding_id: portfolioFund.id,
                      product_id: account?.id,
                      status: portfolioFund.status || 'active',
                      valuation_date: portfolioFund.valuation_date,
                      target_weighting: portfolioFund.target_weighting?.toString()
                    };
                    
                    updatedHoldings.push(holding);
                  });
                  
                  setHoldings(updatedHoldings);
                }
              }
              
            } catch (refreshError) {
              console.error('Error during second IRR refresh:', refreshError);
            }
          }, 3000); // 3 second delay for second refresh
          
        } catch (fetchError) {
          console.error('Error during main data refresh:', fetchError);
        }
      }, 1000); // 1 second delay for initial refresh
    }
  }, [accountId, account?.portfolio_id, api, fetchData]);

  // Function to trigger single fund IRR recalculation when activities change
  const triggerSingleFundIRRRecalculation = useCallback(async (portfolioFundIds: number[]) => {
    if (!api) return;

    // IMPORTANT: Filter out Cash funds - they should never have their own IRR calculated
    // Cash funds can still be included in portfolio IRR calculations
    const nonCashFundIds = portfolioFundIds.filter(fundId => {
      const holding = holdings.find(h => h.id === fundId);
      if (!holding) return true; // Keep if holding not found (defensive)

      const isCash = isCashFund({
        fund_name: holding.fund_name,
        isin_number: holding.isin_number,
        id: holding.id
      });

      if (isCash) {
        console.log(`⏭️ Skipping IRR calculation for Cash fund (ID: ${fundId})`);
      }

      return !isCash;
    });

    console.log(`📊 IRR Calculation: ${portfolioFundIds.length} funds requested, ${nonCashFundIds.length} non-Cash funds will be calculated`);

    if (nonCashFundIds.length === 0) {
      console.log('⏭️ No non-Cash funds to calculate IRR for');
      return;
    }

    try {
      const promises = nonCashFundIds.map(async (fundId) => {
        try {
          const response = await calculateStandardizedSingleFundIRR({ portfolioFundId: fundId });
          return response.data;
        } catch (error) {
          console.error(`Error recalculating IRR for fund ${fundId}:`, error);
          return null;
        }
      });

      await Promise.all(promises);

    } catch (error) {
      console.error('Error during single fund IRR recalculation:', error);
    }
  }, [api, holdings]);

  const triggerPortfolioIRRRecalculation = useCallback(async () => {
    console.log('🚀 [PORTFOLIO IRR] triggerPortfolioIRRRecalculation CALLED');

    if (!api) {
      console.log('❌ [PORTFOLIO IRR] API not available');
      return;
    }

    if (!account?.portfolio_id) {
      console.log('❌ [PORTFOLIO IRR] No portfolio_id available');
      return;
    }

    console.log(`✅ [PORTFOLIO IRR] Starting calculation for portfolio ${account.portfolio_id}`);

    try {
      const activeHoldings = filterActiveHoldings(holdings);
      console.log(`📋 [PORTFOLIO IRR] Active holdings count: ${activeHoldings.length}`, activeHoldings.map(h => ({
        id: h.id,
        fund_name: h.fund_name,
        isin: h.isin_number,
        valuation_date: h.valuation_date,
        market_value: h.market_value
      })));

      // IMPORTANT: Include ALL active funds (including Cash) in portfolio IRR calculation
      // The backend will naturally handle funds without valuations by skipping them
      // This allows Cash valuations to be included when they exist, while not blocking
      // portfolio IRR calculation when Cash doesn't have a valuation
      const portfolioFundIds = activeHoldings.map(h => h.id);

      const cashFunds = activeHoldings.filter(h =>
        isCashFund({
          fund_name: h.fund_name,
          isin_number: h.isin_number,
          id: h.id
        })
      );

      console.log(`📊 [PORTFOLIO IRR] Portfolio IRR Calculation Summary:`);
      console.log(`   - Total active holdings: ${activeHoldings.length}`);
      console.log(`   - Cash funds (will be included if they have valuations): ${cashFunds.length}`);
      if (cashFunds.length > 0) {
        cashFunds.forEach(cf => {
          const hasValuation = cf.valuation_date && cf.market_value !== null && cf.market_value !== undefined;
          console.log(`   💵 Cash fund ${cf.fund_name} (ID: ${cf.id}): ${hasValuation ? `Has valuation (${cf.valuation_date}, £${cf.market_value})` : 'No valuation'}`);
        });
      }
      console.log(`   - All funds to include: ${portfolioFundIds.length}`);
      console.log(`   - Fund IDs: [${portfolioFundIds.join(', ')}]`);

      if (portfolioFundIds.length === 0) {
        console.log('⏭️ [PORTFOLIO IRR] No active funds to calculate portfolio IRR for');
        return null;
      }

      console.log(`🔄 [PORTFOLIO IRR] Calling calculateStandardizedMultipleFundsIRR with ${portfolioFundIds.length} funds...`);

      const response = await calculateStandardizedMultipleFundsIRR({
        portfolioFundIds
      });

      console.log(`✅ [PORTFOLIO IRR] Calculation successful!`, response.data);
      return response.data;
    } catch (error) {
      console.error('❌ [PORTFOLIO IRR] Error during portfolio IRR recalculation:', error);
      console.error('❌ [PORTFOLIO IRR] Error details:', {
        message: error.message,
        stack: error.stack,
        response: error.response?.data
      });
      return null;
    }
  }, [api, account?.portfolio_id, holdings]);



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
  const formatPercentage = (value: number | null | undefined): string => {
    if (value === null || value === undefined) {
      return 'N/A';
    }
    
    // Convert to number if it's a string (defensive programming)
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    
    // Check if the conversion resulted in a valid number
    if (isNaN(numValue)) {
      return 'N/A';
    }
    
    return `${numValue.toFixed(1)}%`;
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

  // Format date for Period Overview table (month and year only)
  const formatDateMonthYear = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short'
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
      
      // Track unsaved changes
      setHasUnsavedNotes(e.target.value !== initialNotes);
      
      // Notes are now saved to database on blur - no localStorage needed
      
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
      setHasUnsavedNotes(false);
      
      // Notes are now saved to database only - no localStorage needed
      
      console.log('Notes saved successfully');
    } catch (err) {
      console.error('Error saving notes:', err);
      setNotesError('Failed to save notes. Your changes may not be preserved.');
    } finally {
      setIsSavingNotes(false);
    }
  };

  // Manual save notes function
  const handleManualSave = async () => {
    if (!account || !hasUnsavedNotes) return;
    await handleNotesBlur();
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
          <div className={`text-right ${
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
            <div className="text-xs text-gray-500 mt-1 text-right">
              {formatDateMonthYear(viewIRR.date)}
            </div>
          )}
        </>
      );
    }

    // Fallback to database IRR if no view value (for backward compatibility)
    if (fund.irr !== undefined && fund.irr !== null) {
      // Convert to number if it's a string (defensive programming)
      const numericIRR = typeof fund.irr === 'string' ? parseFloat(fund.irr) : fund.irr;
      
      // Skip if conversion failed
      if (isNaN(numericIRR)) {
        return <span className="text-xs text-gray-500">N/A</span>;
      }
      
      return (
        <>
          <div className={`text-right ${
            numericIRR >= 0 ? 'text-green-700' : 'text-red-700'
          }`}>
            {Math.abs(numericIRR) > 1 
              ? `${numericIRR.toFixed(1)}%` 
              : formatPercentage(numericIRR)}
            <span className="ml-1">
              {numericIRR >= 0 ? '▲' : '▼'}
            </span>
          </div>
          {fund.irr_calculation_date && (
            <div className="text-xs text-gray-500 mt-1 text-right">
              {formatDateMonthYear(fund.irr_calculation_date)}
            </div>
          )}
        </>
      );
    }

    // If no IRR available, show N/A
    return (
      <span className="text-gray-500 text-right">N/A</span>
    );
  };

  // Component to display live Previous Funds IRR (calculates every render)


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

  // Show loading while checking for concurrent users
  if (isCheckingPresence) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600"></div>
          <span className="ml-3 text-lg text-gray-600">Checking for other users...</span>
        </div>
      </div>
    );
  }

  // Filter other users (excluding current user) - using presence users for consistency
  const otherUsers = presenceUsers;

  // Main return statement for the component
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header with concurrent user warning */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">IRR Calculation</h2>
        <div className="flex items-center space-x-4">
          {/* Concurrent user warning indicator */}
          {otherUsers.length > 0 && (
            <div className="flex items-center bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
              <svg className="w-5 h-5 text-yellow-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium text-yellow-800">
                {otherUsers.length === 1 ? 'Another user' : `${otherUsers.length} other users`} currently editing
              </span>
            </div>
          )}
          <PresenceIndicator 
            pageIdentifier={`irr-calculation:product-${accountId}`}
            className="flex-shrink-0"
          />
        </div>
      </div>

      {/* Presence Notifications */}
      <PresenceNotifications
        notifications={notifications}
        onDismiss={dismissNotification}
        onDismissAll={dismissAllNotifications}
      />

      {/* Concurrent User Modal */}
      <ConcurrentUserModal
        isOpen={showConcurrentUserModal}
        onConfirm={handleConfirmProceed}
        onCancel={handleCancel}
        currentUsers={currentUsers}
        pageName="IRR Calculation"
      />
      
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
              <div className="flex items-center space-x-2">
                {isSavingNotes && (
                  <span className="text-xs text-gray-500">Saving...</span>
                )}
              </div>
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
                {/* Valuation Date Indicator */}
                {valuationDateInfo.hasNonCommonDates && (
                  <div className="ml-3 flex items-center valuation-tooltip-container">
                    <div className="flex items-center space-x-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                      <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 18.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <div className="text-sm">
                        <span className="font-medium text-amber-800">Valuation Date Alert</span>
                        <div className="text-amber-700">
                          {valuationDateInfo.nonCommonFunds.length} fund{valuationDateInfo.nonCommonFunds.length > 1 ? 's have' : ' has'} missing valuation dates
                        </div>
                      </div>
                      <div className="relative">
                        <button
                          type="button"
                          className="text-amber-600 hover:text-amber-800 focus:outline-none"
                          title="View details"
                          onClick={() => setShowValuationTooltip(!showValuationTooltip)}
                          onBlur={() => setTimeout(() => setShowValuationTooltip(false), 150)}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </button>
                        {showValuationTooltip && (
                          <div className="absolute z-10 w-80 p-4 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg right-0">
                            <div className="text-sm text-gray-800">
                              {/* First show common valuation dates */}
                              {valuationDateInfo.commonDates.length > 0 && (
                                <div className="mb-3 pb-2 border-b border-gray-200">
                                  <div className="font-medium mb-1">Common valuation dates across portfolio:</div>
                                  <div className="text-green-700 text-xs">
                                    {valuationDateInfo.commonDates.map(date => formatDateMonthYear(date)).join(', ')}
                                  </div>
                                </div>
                              )}
                              
                              {/* Then show funds with issues */}
                              <div className="font-medium mb-2">
                                {valuationDateInfo.nonCommonFunds.some(f => f.valuation_date === 'No valuation date') 
                                  ? 'Portfolio funds missing valuation dates:' 
                                  : 'Portfolio funds with different valuation dates:'}
                              </div>
                              {valuationDateInfo.nonCommonFunds.map((fund, index) => (
                                <div key={index} className="flex justify-between items-center py-1 border-b border-gray-100 last:border-b-0">
                                  <span className="text-gray-900 font-medium">{fund.fund_name}</span>
                                  <span className={`text-xs font-medium ${fund.valuation_date === 'No valuation date' ? 'text-red-600' : 'text-amber-600'}`}>
                                    {fund.valuation_date === 'No valuation date' ? fund.valuation_date : formatDateMonthYear(fund.valuation_date)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
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
                        <th className="px-1 py-1 text-right text-xs font-medium text-gray-700 uppercase tracking-wider w-16" title="Total Investments">INV.</th>
                        <th className="px-1 py-1 text-right text-xs font-medium text-gray-700 uppercase tracking-wider w-16" title="Regular Investments">REG. INV.</th>
                        <th className="px-1 py-1 text-right text-xs font-medium text-gray-700 uppercase tracking-wider w-16" title="Tax Uplifts">TAX UPLIFTS</th>
                        <th className="px-1 py-1 text-right text-xs font-medium text-gray-700 uppercase tracking-wider w-16" title="Fund Switch Ins">FUND SWITCH IN</th>
                        <th className="px-1 py-1 text-right text-xs font-medium text-gray-700 uppercase tracking-wider w-16" title="Fund Switch Outs">FUND SWITCH OUT</th>
                        <th className="px-1 py-1 text-right text-xs font-medium text-gray-700 uppercase tracking-wider w-16" title="Product Switch Ins">PROD SWITCH IN</th>
                        <th className="px-1 py-1 text-right text-xs font-medium text-gray-700 uppercase tracking-wider w-16" title="Product Switch Outs">PROD SWITCH OUT</th>
                        <th className="px-1 py-1 text-right text-xs font-medium text-gray-700 uppercase tracking-wider w-16" title="Withdrawals">WITH.</th>
                        <th className="px-1 py-1 text-right text-xs font-medium text-gray-700 uppercase tracking-wider w-20" title="Most Recent Valuation">Valuation</th>
                        <th className="px-1 py-1 text-right text-xs font-medium text-gray-700 uppercase tracking-wider w-20" title="Profit Made">Profit Made</th>
                        <th className="px-1 py-1 text-right text-xs font-medium text-gray-700 uppercase tracking-wider w-16" title="Most Recent IRR">IRR</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {(() => {
                        const activeHoldings = filterActiveHoldings(holdings);
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
                                className={`${
                                  holding.isVirtual ? "bg-gray-100 border-t border-gray-300 cursor-pointer hover:bg-gray-200" : 
                                  isBulkDeactivationMode && !holding.isVirtual && holding.status !== 'inactive' ? "cursor-pointer hover:bg-gray-50" :
                                  ""
                                }`}
                                onClick={(e) => {
                                  if (holding.isVirtual) {
                                    togglePreviousFundsExpansion();
                                  } else if (isBulkDeactivationMode && !holding.isVirtual && holding.status !== 'inactive') {
                                    // Only toggle if we didn't click on the checkbox itself
                                    const target = e.target as HTMLElement;
                                    if (!target.closest('input[type="checkbox"]')) {
                                      toggleFundSelection(holding.id);
                                    }
                                  }
                                }}
                              >
                                {isBulkDeactivationMode && (
                                  <td className="px-1 py-1 whitespace-nowrap text-center">
                                    {!holding.isVirtual && holding.status !== 'inactive' ? (
                                      <input
                                        type="checkbox"
                                        className="rounded border-gray-300 text-red-600 shadow-sm focus:border-red-300 focus:ring focus:ring-red-200 focus:ring-opacity-50"
                                        checked={selectedFundsForDeactivation.has(holding.id)}
                                        onChange={() => toggleFundSelection(holding.id)}
                                        onClick={(e) => e.stopPropagation()}
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
                                  <div className={`text-sm text-right ${holding.isVirtual ? "font-medium text-blue-800" : "text-gray-900"}`}>
                                    {holding.isVirtual 
                                      ? formatCurrency(calculatePreviousFundsInvestments(allTimeActivities, inactiveHoldings))
                                      : formatCurrency(calculateInvestments(allTimeActivities, holding.id))}
                                  </div>
                                </td>
                                <td className="px-1 py-1 whitespace-nowrap">
                                  <div className={`text-sm text-right ${holding.isVirtual ? "font-medium text-blue-800" : "text-gray-900"}`}>
                                    {holding.isVirtual 
                                      ? formatCurrency(calculatePreviousFundsRegularInvestments(allTimeActivities, inactiveHoldings))
                                      : formatCurrency(calculateRegularInvestments(allTimeActivities, holding.id))}
                                  </div>
                                </td>
                                <td className="px-1 py-1 whitespace-nowrap">
                                  <div className={`text-sm text-right ${holding.isVirtual ? "font-medium text-blue-800" : "text-gray-900"}`}>
                                    {holding.isVirtual
                                      ? formatCurrency(calculatePreviousFundsTaxUplifts(allTimeActivities, inactiveHoldings))
: formatCurrency(calculateTaxUplifts(allTimeActivities, holding.id))}
                                  </div>
                                </td>
                                <td className="px-1 py-1 whitespace-nowrap">
                                  <div className={`text-sm text-right ${holding.isVirtual ? "font-medium text-blue-800" : "text-gray-900"}`}>
                                    {holding.isVirtual
                                      ? formatCurrency(calculatePreviousFundsSwitchIns(allTimeActivities, inactiveHoldings))
                                      : formatCurrency(calculateSwitchIns(allTimeActivities, holding.id))}
                                  </div>
                                </td>
                                <td className="px-1 py-1 whitespace-nowrap">
                                  <div className={`text-sm text-right ${holding.isVirtual ? "font-medium text-blue-800" : "text-gray-900"}`}>
                                    {holding.isVirtual
                                      ? formatCurrency(calculatePreviousFundsSwitchOuts(allTimeActivities, inactiveHoldings))
                                      : formatCurrency(calculateSwitchOuts(allTimeActivities, holding.id))}
                                  </div>
                                </td>
                                <td className="px-1 py-1 whitespace-nowrap">
                                  <div className={`text-sm text-right ${holding.isVirtual ? "font-medium text-blue-800" : "text-gray-900"}`}>
                                    {holding.isVirtual
                                      ? formatCurrency(calculatePreviousFundsProductSwitchIns(allTimeActivities, inactiveHoldings))
                                      : formatCurrency(calculateProductSwitchIns(allTimeActivities, holding.id))}
                                  </div>
                                </td>
                                <td className="px-1 py-1 whitespace-nowrap">
                                  <div className={`text-sm text-right ${holding.isVirtual ? "font-medium text-blue-800" : "text-gray-900"}`}>
                                    {holding.isVirtual
                                      ? formatCurrency(calculatePreviousFundsProductSwitchOuts(allTimeActivities, inactiveHoldings))
                                      : formatCurrency(calculateProductSwitchOuts(allTimeActivities, holding.id))}
                                  </div>
                                </td>
                                <td className="px-1 py-1 whitespace-nowrap">
                                  <div className={`text-sm text-right ${holding.isVirtual ? "font-medium text-blue-800" : "text-gray-900"}`}>
                                    {holding.isVirtual
                                      ? formatCurrency(calculatePreviousFundsWithdrawals(allTimeActivities, inactiveHoldings))
                                      : formatCurrency(calculateWithdrawals(allTimeActivities, holding.id))}
                                  </div>
                                </td>
                                <td className="px-1 py-1 whitespace-nowrap">
                                  <div className={`text-sm text-right ${holding.isVirtual ? "font-medium text-blue-800" : "text-gray-900"}`}>
                                    {holding.isVirtual ? (
                                      formatCurrency(0)
                                    ) : (
                                      holding.market_value !== undefined && holding.market_value !== null ? (
                                        <div>
                                          <div>{formatCurrency(holding.market_value)}</div>
                                          {holding.valuation_date && (
                                            <div className="text-xs text-gray-500 mt-1">
                                              {formatDateMonthYear(holding.valuation_date)}
                                            </div>
                                          )}
                                        </div>
                                      ) : 'N/A'
                                    )}
                                  </div>
                                </td>
                                <td className="px-1 py-1 whitespace-nowrap">
                                  <div className={`text-sm text-right ${holding.isVirtual ? "font-medium text-blue-800" : "text-gray-900"}`}>
                                    {holding.isVirtual ? (
                                      (() => {
                                        const valuation = 0;
                                        const investments = calculatePreviousFundsInvestments(allTimeActivities, inactiveHoldings);
                                        const regularInvestments = calculatePreviousFundsRegularInvestments(allTimeActivities, inactiveHoldings);
                                        const taxUplifts = calculatePreviousFundsTaxUplifts(allTimeActivities, inactiveHoldings);
                                        const fundSwitchIn = calculatePreviousFundsSwitchIns(allTimeActivities, inactiveHoldings);
                                        const fundSwitchOut = calculatePreviousFundsSwitchOuts(allTimeActivities, inactiveHoldings);
                                        const productSwitchIn = calculatePreviousFundsProductSwitchIns(allTimeActivities, inactiveHoldings);
                                        const productSwitchOut = calculatePreviousFundsProductSwitchOuts(allTimeActivities, inactiveHoldings);
                                        const withdrawals = calculatePreviousFundsWithdrawals(allTimeActivities, inactiveHoldings);

                                        const profit = valuation - (investments + regularInvestments + taxUplifts + fundSwitchIn + productSwitchIn) + (withdrawals + fundSwitchOut + productSwitchOut);
                                        return formatCurrency(profit);
                                      })()
                                    ) : (
                                      holding.market_value !== undefined && holding.market_value !== null ? (
                                        (() => {
                                          const valuation = holding.market_value;
                                          const investments = calculateInvestments(allTimeActivities, holding.id);
                                          const regularInvestments = calculateRegularInvestments(allTimeActivities, holding.id);
                                          const taxUplifts = calculateTaxUplifts(allTimeActivities, holding.id);
                                          const fundSwitchIn = calculateSwitchIns(allTimeActivities, holding.id);
                                          const fundSwitchOut = calculateSwitchOuts(allTimeActivities, holding.id);
                                          const productSwitchIn = calculateProductSwitchIns(allTimeActivities, holding.id);
                                          const productSwitchOut = calculateProductSwitchOuts(allTimeActivities, holding.id);
                                          const withdrawals = calculateWithdrawals(allTimeActivities, holding.id);

                                          const profit = valuation - (investments + regularInvestments + taxUplifts + fundSwitchIn + productSwitchIn) + (withdrawals + fundSwitchOut + productSwitchOut);
                                          return formatCurrency(profit);
                                        })()
                                      ) : 'N/A'
                                    )}
                                  </div>
                                </td>
                                <td className="px-1 py-1 whitespace-nowrap">
                                  <div className="text-right">
                                      {holding.isVirtual ? (
                                      // Use live Previous Funds IRR component
                                      <PreviousFundsIRRDisplay
                                        inactiveHoldings={inactiveHoldings}
                                        latestValuationDate={latestValuationDate}
                                        activityLogs={activityLogs}
                                      />
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
                                    <div className="text-sm text-right text-gray-700">
                                      {formatCurrency(calculateInvestments(allTimeActivities, inactiveHolding.id))}
                                    </div>
                                  </td>
                                  <td className="px-1 py-1 whitespace-nowrap">
                                    <div className="text-sm text-right text-gray-700">
                                      {formatCurrency(calculateRegularInvestments(allTimeActivities, inactiveHolding.id))}
                                    </div>
                                  </td>
                                  <td className="px-1 py-1 whitespace-nowrap">
                                    <div className="text-sm text-right text-gray-700">
                                      {formatCurrency(calculateTaxUplifts(allTimeActivities, inactiveHolding.id))}
                                    </div>
                                  </td>
                                  <td className="px-1 py-1 whitespace-nowrap">
                                    <div className="text-sm text-right text-gray-700">
                                      {formatCurrency(calculateSwitchIns(allTimeActivities, inactiveHolding.id))}
                                    </div>
                                  </td>
                                  <td className="px-1 py-1 whitespace-nowrap">
                                    <div className="text-sm text-right text-gray-700">
                                      {formatCurrency(calculateSwitchOuts(allTimeActivities, inactiveHolding.id))}
                                    </div>
                                  </td>
                                  <td className="px-1 py-1 whitespace-nowrap">
                                    <div className="text-sm text-right text-gray-700">
                                      {formatCurrency(calculateProductSwitchIns(allTimeActivities, inactiveHolding.id))}
                                    </div>
                                  </td>
                                  <td className="px-1 py-1 whitespace-nowrap">
                                    <div className="text-sm text-right text-gray-700">
                                      {formatCurrency(calculateProductSwitchOuts(allTimeActivities, inactiveHolding.id))}
                                    </div>
                                  </td>
                                  <td className="px-1 py-1 whitespace-nowrap">
                                    <div className="text-sm text-right text-gray-700">
                                      {formatCurrency(calculateWithdrawals(allTimeActivities, inactiveHolding.id))}
                                    </div>
                                  </td>
                                  <td className="px-1 py-1 whitespace-nowrap">
                                    <div className="text-sm text-right text-gray-700">
                                      {formatCurrency(0)}
                                    </div>
                                  </td>
                                  <td className="px-1 py-1 whitespace-nowrap">
                                    <div className="text-sm text-right text-gray-700">
                                      {(() => {
                                        const valuation = 0;
                                        const investments = calculateInvestments(allTimeActivities, inactiveHolding.id);
                                        const regularInvestments = calculateRegularInvestments(allTimeActivities, inactiveHolding.id);
                                        const taxUplifts = calculateTaxUplifts(allTimeActivities, inactiveHolding.id);
                                        const fundSwitchIn = calculateSwitchIns(allTimeActivities, inactiveHolding.id);
                                        const fundSwitchOut = calculateSwitchOuts(allTimeActivities, inactiveHolding.id);
                                        const productSwitchIn = calculateProductSwitchIns(allTimeActivities, inactiveHolding.id);
                                        const productSwitchOut = calculateProductSwitchOuts(allTimeActivities, inactiveHolding.id);
                                        const withdrawals = calculateWithdrawals(allTimeActivities, inactiveHolding.id);

                                        const profit = valuation - (investments + regularInvestments + taxUplifts + fundSwitchIn + productSwitchIn) + (withdrawals + fundSwitchOut + productSwitchOut);
                                        return formatCurrency(profit);
                                      })()}
                                    </div>
                                  </td>
                                  <td className="px-1 py-1 whitespace-nowrap">
                                    <div className="text-sm text-right text-gray-700">
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
                          <div className="ml-4 text-base font-bold text-red-700">TOTAL</div>
                        </td>
                        <td className="px-1 py-1 whitespace-nowrap">
                          <div className="text-sm text-right font-bold text-red-700">
                            {formatCurrency(calculateTotalInvestments(allTimeActivities, holdings))}
                          </div>
                        </td>
                        <td className="px-1 py-1 whitespace-nowrap">
                          <div className="text-sm text-right font-bold text-red-700">
                            {formatCurrency(calculateTotalRegularInvestments(allTimeActivities, holdings))}
                          </div>
                        </td>
                        <td className="px-1 py-1 whitespace-nowrap">
                          <div className="text-sm text-right font-bold text-red-700">
                            {formatCurrency(calculateTotalTaxUplifts(allTimeActivities, holdings))}
                          </div>
                        </td>
                        <td className="px-1 py-1 whitespace-nowrap">
                          <div className="text-sm text-right font-bold text-red-700">
                            {formatCurrency(calculateTotalSwitchIns(allTimeActivities, holdings))}
                          </div>
                        </td>
                        <td className="px-1 py-1 whitespace-nowrap">
                          <div className="text-sm text-right font-bold text-red-700">
                            {formatCurrency(calculateTotalSwitchOuts(allTimeActivities, holdings))}
                          </div>
                        </td>
                        <td className="px-1 py-1 whitespace-nowrap">
                          <div className="text-sm text-right font-bold text-red-700">
                            {formatCurrency(calculateTotalProductSwitchIns(allTimeActivities, holdings))}
                          </div>
                        </td>
                        <td className="px-1 py-1 whitespace-nowrap">
                          <div className="text-sm text-right font-bold text-red-700">
                            {formatCurrency(calculateTotalProductSwitchOuts(allTimeActivities, holdings))}
                          </div>
                        </td>
                        <td className="px-1 py-1 whitespace-nowrap">
                          <div className="text-sm text-right font-bold text-red-700">
                            {formatCurrency(calculateTotalWithdrawals(allTimeActivities, holdings))}
                          </div>
                        </td>
                        <td className="px-1 py-1 whitespace-nowrap">
                          <div className="text-sm text-right font-bold text-red-700">
                            <div>{formatCurrency(calculateTotalValue(holdings))}</div>
                            {latestValuationDate && (
                              <div className="text-xs text-gray-500 mt-1">
                                {formatDateMonthYear(latestValuationDate)}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-1 py-1 whitespace-nowrap">
                          <div className="text-sm text-right font-bold text-red-700">
                            {(() => {
                              const totalValuation = calculateTotalValue(holdings);
                              const totalInvestments = calculateTotalInvestments(allTimeActivities, holdings);
                              const totalRegularInvestments = calculateTotalRegularInvestments(allTimeActivities, holdings);
                              const totalTaxUplifts = calculateTotalTaxUplifts(allTimeActivities, holdings);
                              const totalFundSwitchIn = calculateTotalSwitchIns(allTimeActivities, holdings);
                              const totalFundSwitchOut = calculateTotalSwitchOuts(allTimeActivities, holdings);
                              const totalProductSwitchIn = calculateTotalProductSwitchIns(allTimeActivities, holdings);
                              const totalProductSwitchOut = calculateTotalProductSwitchOuts(allTimeActivities, holdings);
                              const totalWithdrawals = calculateTotalWithdrawals(allTimeActivities, holdings);

                              const totalProfit = totalValuation - (totalInvestments + totalRegularInvestments + totalTaxUplifts + totalFundSwitchIn + totalProductSwitchIn) + (totalWithdrawals + totalFundSwitchOut + totalProductSwitchOut);
                              return formatCurrency(totalProfit);
                            })()}
                          </div>
                        </td>
                        <td className="px-1 py-1 whitespace-nowrap">
                          {isTotalPortfolioIRRLoading ? (
                            <span className="text-sm text-gray-500 text-right">Loading...</span>
                          ) : totalPortfolioIRRError ? (
                            <span className="text-sm text-red-500 text-right" title={totalPortfolioIRRError}>Error</span>
                          ) : totalPortfolioIRR !== null ? (
                            <div className="text-right">
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
                                  {formatDateMonthYear(totalPortfolioIRRDate)}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500 text-right">N/A</span>
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
              console.log('🔄 [ACTIVITIES UPDATED] onActivitiesUpdated callback triggered', { affectedFundIds });
              try {
                // Trigger single fund IRR recalculation for affected funds
                if (affectedFundIds && affectedFundIds.length > 0) {
                  console.log('📊 [ACTIVITIES UPDATED] Triggering single fund IRR recalculation for funds:', affectedFundIds);
                  await triggerSingleFundIRRRecalculation(affectedFundIds);
                  console.log('✅ [ACTIVITIES UPDATED] Single fund IRR recalculation complete');
                }

                // IMPORTANT: Also trigger portfolio IRR recalculation
                // This ensures the portfolio-level IRR is updated after any transaction changes
                console.log('📊 [ACTIVITIES UPDATED] Triggering portfolio IRR recalculation...');
                await triggerPortfolioIRRRecalculation();
                console.log('✅ [ACTIVITIES UPDATED] Portfolio IRR recalculation complete');

                // Refresh the data to get updated IRRs from views
                console.log('🔄 [ACTIVITIES UPDATED] Refreshing data...');
                await refreshData();
                console.log('✅ [ACTIVITIES UPDATED] Data refresh complete');

                // CRITICAL: Invalidate React Query cache to ensure fresh data on navigation
                // This fixes the issue where navigating away and back shows stale cached IRR values
                console.log('🗑️ [CACHE INVALIDATION] ==================== STARTING CACHE INVALIDATION ====================');
                console.log('🗑️ [CACHE INVALIDATION] Account ID:', accountId);
                console.log('🗑️ [CACHE INVALIDATION] Client Group ID:', account?.client_group_id);

                // Get current cache state BEFORE invalidation
                const cachedProductData = queryClient.getQueryData(['product-details', accountId]);
                console.log('🗑️ [CACHE INVALIDATION] Current cached product data:', cachedProductData);

                // Invalidate product details cache (useProductDetails hook)
                console.log('🗑️ [CACHE INVALIDATION] Invalidating product-details cache with key:', ['product-details', accountId]);
                await queryClient.invalidateQueries({ queryKey: ['product-details', accountId] });
                console.log('✅ [CACHE INVALIDATION] Product details cache invalidated');

                // Invalidate client details cache if we have the client group ID
                if (account?.client_group_id) {
                  const clientKey = ['clients', account.client_group_id.toString()];
                  console.log('🗑️ [CACHE INVALIDATION] Invalidating client details cache with key:', clientKey);
                  await queryClient.invalidateQueries({ queryKey: clientKey });
                  console.log('✅ [CACHE INVALIDATION] Client details cache invalidated');
                }

                // Invalidate client list cache to refresh dashboard/list views
                console.log('🗑️ [CACHE INVALIDATION] Invalidating client list cache with key:', ['clients']);
                await queryClient.invalidateQueries({ queryKey: ['clients'] });
                console.log('✅ [CACHE INVALIDATION] Client list cache invalidated');

                // Verify cache state AFTER invalidation
                const cachedProductDataAfter = queryClient.getQueryData(['product-details', accountId]);
                console.log('🗑️ [CACHE INVALIDATION] Cached product data after invalidation:', cachedProductDataAfter);

                console.log('✅ [CACHE INVALIDATION] ==================== CACHE INVALIDATION COMPLETE ====================');

              } catch (error) {
                console.error('❌ [ACTIVITIES UPDATED] Error in onActivitiesUpdated callback:', error);
                // Still try to refresh data and invalidate cache even if IRR recalculation fails
                try {
                  await refreshData();

                  // Invalidate cache even on error to ensure consistency
                  console.log('🗑️ [CACHE INVALIDATION ERROR PATH] Invalidating caches after error...');
                  await queryClient.invalidateQueries({ queryKey: ['product-details', accountId] });
                  if (account?.client_group_id) {
                    await queryClient.invalidateQueries({ queryKey: ['clients', account.client_group_id.toString()] });
                  }
                  await queryClient.invalidateQueries({ queryKey: ['clients'] });
                  console.log('✅ [CACHE INVALIDATION ERROR PATH] Cache invalidation complete');
                } catch (refreshError) {
                  console.error('❌ [ACTIVITIES UPDATED] refreshData() also failed:', refreshError);
                }
              }
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