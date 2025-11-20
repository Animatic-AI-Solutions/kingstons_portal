import React, { useState, useEffect, useMemo, useRef, Fragment, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { formatCurrency } from '../utils/formatters';
import api, { createFundValuation, calculatePortfolioIRR } from '../services/api';
import BulkMonthActivitiesModal from './BulkMonthActivitiesModal';
import { TransactionCoordinator } from '../services/transactionCoordinator';
import EnhancedMonthHeader from './ui/EnhancedMonthHeader';
import { useFeatureFlags, shouldShowMiniYearSelectors, logFeatureFlagUsage } from '../utils/featureFlags';

/**
 * SIGN CONVENTION FOR TOTALS:
 * + (positive) = Money coming OUT of the fund (outflows: withdrawals, switches out)
 * - (negative) = Money going INTO the fund (inflows: investments, switches in)
 * 
 * This convention ensures totals properly reflect net cash flow from the fund's perspective.
 */

interface Activity {
  id?: number;
  activity_timestamp: string;
  activity_type: string;
  amount: string;
  portfolio_fund_id: number;
  account_holding_id: number;
  units_transacted?: number;
  market_value_held?: number;
  local_date?: string; // New field for timezone-corrected date
}

interface Fund {
  id: number;
  fund_name: string;
  holding_id: number;
  irr?: number;
  start_date?: string;
  isActive?: boolean;
  inactiveHoldingIds?: any[];
  isInactiveBreakdown?: boolean;
  current_value?: number;
}

interface CellEdit {
  fundId: number;
  month: string;
  activityType: string;
  value: string;
  isNew: boolean;
  originalActivityId?: number;
  toDelete?: boolean;
}

interface ProviderSwitch {
  id: number;
  switch_date: string;
  previous_provider_id: number | null;
  new_provider_id: number;
  description: string | null;
  previous_provider_name: string | null;
  new_provider_name: string | null;
}

interface EditableMonthlyActivitiesTableProps {
  funds: Fund[];
  inactiveFundsForTotals?: any[]; // Inactive funds to include in totals calculation only
  activities: Activity[];
  accountHoldingId: number;
  onActivitiesUpdated: () => void;
  productStartDate?: string;
  allFunds?: any[];
  providerSwitches?: ProviderSwitch[];
  portfolioId?: number;
}

interface FundValuation {
  id: number;
  portfolio_fund_id: number;
  valuation_date: string;
  valuation: number;
  created_at: string;
}

// Add new interface for existing month data
interface ExistingMonthData {
  activities: { [activityType: string]: Activity };
  valuations: { [activityType: string]: FundValuation };
}

const ACTIVITY_TYPES = [
  'Investment',
  'RegularInvestment',
      'TaxUplift',
  'ProductSwitchIn',
  'ProductSwitchOut',
  'FundSwitchIn',
  'FundSwitchOut',
  'Withdrawal',
  'Current Value'
];

// Helper function to get the correct date for activity filtering
// Uses local_date if available (timezone-corrected), otherwise falls back to activity_timestamp
const getActivityDate = (activity: Activity): Date => {
  if (activity.local_date) {
    // Use the timezone-corrected local date
    return new Date(activity.local_date + 'T00:00:00.000Z');
  } else {
    // Fall back to the original timestamp logic
    if (activity.activity_timestamp.includes('T')) {
      return new Date(activity.activity_timestamp);
    } else {
      return new Date(activity.activity_timestamp + 'T00:00:00.000Z');
    }
  }
};

// Utility function to throttle expensive operations
const throttle = (func: Function, delay: number) => {
  let timeoutId: number | null = null;
  let lastExecTime = 0;
  
  return function (...args: any[]) {
    const currentTime = Date.now();
    
    if (currentTime - lastExecTime > delay) {
      func(...args);
      lastExecTime = currentTime;
    } else {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = window.setTimeout(() => {
        func(...args);
        lastExecTime = Date.now();
      }, delay);
    }
  };
};

const EditableMonthlyActivitiesTable: React.FC<EditableMonthlyActivitiesTableProps> = ({
  funds,
  inactiveFundsForTotals = [],
  activities,
  accountHoldingId,
  onActivitiesUpdated,
  productStartDate,
  allFunds = [],
  providerSwitches = [],
  portfolioId
}) => {
  const [months, setMonths] = useState<string[]>([]);
  const [allMonths, setAllMonths] = useState<string[]>([]); // Store all months for totals calculation
  // Initialize currentYear with localStorage value if available, otherwise use current year
  const [currentYear, setCurrentYear] = useState<number>(() => {
    const savedYear = localStorage.getItem('irr-calculation-selected-year');
    return savedYear ? parseInt(savedYear) : new Date().getFullYear();
  });
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [pendingEdits, setPendingEdits] = useState<CellEdit[]>([]);
  
  // Add state to track initial load vs year changes
  const [isInitialLoad, setIsInitialLoad] = useState<boolean>(true);
  
  // Feature flags for mini year selectors
  const featureFlags = useFeatureFlags();
  const enableMiniYearSelectors = shouldShowMiniYearSelectors();
  
  // Persist selected year to localStorage
  useEffect(() => {
    localStorage.setItem('irr-calculation-selected-year', currentYear.toString());
  }, [currentYear]);
  
  // Monitor pending edits state for UI updates
  useEffect(() => {
    // Update UI indicators when pending edits change
  }, [pendingEdits]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fundValuations, setFundValuations] = useState<FundValuation[]>([]);
  const [isLoadingValuations, setIsLoadingValuations] = useState(false);
  const [showSwitchFundModal, setShowSwitchFundModal] = useState(false);
  const [activitiesState, setActivities] = useState<Activity[]>(activities);
  const [showInactiveFunds, setShowInactiveFunds] = useState(false);
  
  // Add state to track the currently focused cell
  const [focusedCell, setFocusedCell] = useState<{ fundId: number, activityType: string, monthIndex: number } | null>(null);
  
  // Add state for reactivation loading
  const [reactivatingFunds, setReactivatingFunds] = useState<Set<number>>(new Set());
  
  // State for bulk month activities modal
  const [showBulkMonthModal, setShowBulkMonthModal] = useState(false);
  const [selectedBulkMonth, setSelectedBulkMonth] = useState<string>('');

  // State for tracking which funds are expanded (show all transactions)
  const [expandedFunds, setExpandedFunds] = useState<Set<number>>(new Set());

  // State and ref for sticky header tracking
  const [headerTop, setHeaderTop] = useState<number | null>(null);
  const [tableWidth, setTableWidth] = useState<number>(0);
  const [headerLeft, setHeaderLeft] = useState<number>(0);
  const [columnPositions, setColumnPositions] = useState<{left: number, width: number}[]>([]);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const topScrollRef = useRef<HTMLDivElement>(null);
  const isScrollSyncingRef = useRef<boolean>(false);
  

  
  // Styles for input elements to remove borders
  const noBorderStyles = {
    border: 'none', 
    outline: 'none',
    boxShadow: 'none',
    appearance: 'none',
    WebkitAppearance: 'none',
    MozAppearance: 'none'
  };

  // Memoized indexed lookups for performance optimization
  const fundsById = useMemo(() => {
    const map = new Map();
    funds.forEach(fund => map.set(fund.id, fund));
    return map;
  }, [funds]);

  // Helper function to convert UI activity types to backend format
  const convertActivityTypeForBackend = (uiActivityType: string): string => {
    // Convert UI-friendly activity types to backend format
    switch (uiActivityType) {
      case 'Current Value': return 'Valuation';
      default: return uiActivityType; // Activity types are already in PascalCase format (ProductSwitchIn, etc.)
    }
  };

  const pendingEditsMap = useMemo(() => {
    const map = new Map();
    pendingEdits.forEach(edit => {
      const key = `${edit.fundId}-${edit.month}-${edit.activityType}`;
      map.set(key, edit);
    });
    return map;
  }, [pendingEdits]);

  // Memoized indexed lookups for activities - O(1) lookups instead of O(n) array.find()
  const activitiesIndex = useMemo(() => {
    const index = new Map<string, Activity>();
    activitiesState.forEach(activity => {
      try {
        // Handle different timestamp formats safely - use timezone-corrected date when available
        const date = getActivityDate(activity);
        
        // Validate the date
        if (isNaN(date.getTime())) {
          console.warn(`🚨 Invalid activity timestamp: ${activity.activity_timestamp}`);
          return; // Skip this activity
        }
        
        const activityMonthYear = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
        const key = `${activity.portfolio_fund_id}-${activityMonthYear}-${activity.activity_type}`;
        // Index activity by fund, month, and type for efficient lookups
        index.set(key, activity);
      } catch (error) {
        console.error(`🚨 Error parsing activity timestamp: ${activity.activity_timestamp}`, error);
      }
    });
    return index;
  }, [activitiesState]);

  // Memoized indexed lookups for fund valuations - O(1) lookups
  const fundValuationsIndex = useMemo(() => {
    const index = new Map<string, FundValuation>();
    fundValuations.forEach(valuation => {
      const date = new Date(valuation.valuation_date);
      const valuationMonthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const key = `${valuation.portfolio_fund_id}-${valuationMonthYear}`;
      index.set(key, valuation);
    });
    return index;
  }, [fundValuations]);

  // Memoized indexed lookups for provider switches - O(1) lookups
  const providerSwitchesIndex = useMemo(() => {
    const index = new Map<string, ProviderSwitch>();
    providerSwitches.forEach(providerSwitch => {
      const date = new Date(providerSwitch.switch_date);
      const switchMonthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      index.set(switchMonthYear, providerSwitch);
    });
    return index;
  }, [providerSwitches]);

  // Memoized indexed lookups for inactive funds - O(1) lookups
  const inactiveFundsIndex = useMemo(() => {
    const index = new Map<number, any>();
    if (inactiveFundsForTotals && inactiveFundsForTotals.length > 0) {
      inactiveFundsForTotals.forEach(fund => {
        index.set(fund.id, fund);
      });
    }
    return index;
  }, [inactiveFundsForTotals]);

  // Memoized activity type sign convention lookup - O(1) lookups
  const activityTypeSignMap = useMemo(() => {
    const signMap = new Map<string, 'inflow' | 'outflow' | 'neutral'>();
    
    // Inflows (money INTO fund) - should be negative
    ['Investment', 'RegularInvestment', 'TaxUplift', 'ProductSwitchIn', 'FundSwitchIn'].forEach(type => {
      signMap.set(type, 'inflow');
    });
    
    // Outflows (money OUT OF fund) - should be positive  
    ['Withdrawal', 'ProductSwitchOut', 'FundSwitchOut'].forEach(type => {
      signMap.set(type, 'outflow');
    });
    
    // Neutral (Current Value) - should be positive
    signMap.set('Current Value', 'neutral');
    
    return signMap;
  }, []);

  // Memoized cell values cache - prevents recalculating cell values on every render
  const cellValuesCache = useMemo(() => {
    const cache = new Map<string, string>();
    
    // Get all funds to process (including inactive funds when shown)
    const allFundsToProcess = [...funds];
    
    // If showing inactive funds, add them to the processing list
    if (showInactiveFunds) {
      const previousFundsEntry = funds.find(f => f.isActive === false && f.inactiveHoldingIds && f.inactiveHoldingIds.length > 0);
      if (previousFundsEntry && previousFundsEntry.inactiveHoldingIds) {
        const inactiveFundsToShow = previousFundsEntry.inactiveHoldingIds.map(holding => ({
          id: holding.id,
          fund_name: holding.fund_name || `Inactive Fund ${holding.id}`,
          holding_id: -1,
          isActive: false,
          isInactiveBreakdown: true,
          fund_id: holding.fund_id
        }));
        allFundsToProcess.push(...inactiveFundsToShow);
      }
    }
    
    allFundsToProcess.forEach(fund => {
      allMonths.forEach(month => {
        ACTIVITY_TYPES.forEach(activityType => {
          const key = `${fund.id}-${month}-${activityType}`;
          
          // Check pending edits first
          const pendingEdit = pendingEditsMap.get(key);
          if (pendingEdit) {
            cache.set(key, pendingEdit.value);
            return;
          }

          // Handle "Previous Funds" virtual entry
          if (fund.isActive === false && fund.inactiveHoldingIds && !fund.isInactiveBreakdown) {
            let total = 0;
            
            if (activityType === 'Current Value') {
              fund.inactiveHoldingIds.forEach(inactiveHolding => {
                const valuationKey = `${inactiveHolding.id}-${month}`;
                const valuation = fundValuationsIndex.get(valuationKey);
                if (valuation) {
                  total += valuation.valuation;
                }
              });
            } else {
              const backendType = convertActivityTypeForBackend(activityType);
              fund.inactiveHoldingIds.forEach(inactiveHolding => {
                const activityKey = `${inactiveHolding.id}-${month}-${backendType}`;
                const activity = activitiesIndex.get(activityKey);
                if (activity) {
                  const amount = parseFloat(activity.amount);
                  total += Math.abs(amount);
                }
              });
            }
            
            cache.set(key, total > 0 ? total.toString() : '');
            return;
          }

          // Handle Current Value
          if (activityType === 'Current Value') {
            const valuationKey = `${fund.id}-${month}`;
            const valuation = fundValuationsIndex.get(valuationKey);
            if (valuation) {
              cache.set(key, valuation.valuation.toString());
              return;
            }
            
            // Fallback to activity log
            const activityKey = `${fund.id}-${month}-${convertActivityTypeForBackend(activityType)}`;
            const activity = activitiesIndex.get(activityKey);
            if (activity && activity.market_value_held) {
              cache.set(key, activity.market_value_held.toString());
              return;
            }
            
            cache.set(key, '');
            return;
          }

          // Handle other activity types
          const backendType = convertActivityTypeForBackend(activityType);
          const activityKey = `${fund.id}-${month}-${backendType}`;
          // Lookup activity data using indexed key for O(1) performance
          const activity = activitiesIndex.get(activityKey);
          if (activity) {
            const amount = parseFloat(activity.amount);
            cache.set(key, Math.abs(amount).toString());
          } else {
            cache.set(key, '');
          }
        });
      });
    });
    
    return cache;
      }, [funds, allMonths, activitiesState, fundValuations, pendingEditsMap, activitiesIndex, fundValuationsIndex, showInactiveFunds]);

  // Memoized calculation results - pre-calculate all totals
  const calculationResults = useMemo(() => {
    const results = {
      fundMonthTotals: new Map<string, number>(),
      activityTypeTotals: new Map<string, number>(),
      monthTotals: new Map<string, number>(),
      fundTotals: new Map<string, number>(),
      rowTotals: new Map<string, number>(),
      fundRowTotals: new Map<number, number>()
    };

    // Get all funds to process (including inactive funds when shown)
    const allFundsToProcess = [...funds];
    
    // If showing inactive funds, add them to the processing list
    if (showInactiveFunds) {
      const previousFundsEntry = funds.find(f => f.isActive === false && f.inactiveHoldingIds && f.inactiveHoldingIds.length > 0);
      if (previousFundsEntry && previousFundsEntry.inactiveHoldingIds) {
        const inactiveFundsToShow = previousFundsEntry.inactiveHoldingIds.map(holding => ({
          id: holding.id,
          fund_name: holding.fund_name || `Inactive Fund ${holding.id}`,
          holding_id: -1,
          isActive: false,
          isInactiveBreakdown: true,
          fund_id: holding.fund_id
        }));
        allFundsToProcess.push(...inactiveFundsToShow);
      }
    }

    // Calculate fund month totals for all funds (including inactive ones when shown)
    allFundsToProcess.forEach(fund => {
      // Skip virtual "Previous Funds" entry to avoid double counting
      // Check both id === -1 and the condition used in cellValuesCache
      if (fund.id === -1 || (fund.isActive === false && fund.inactiveHoldingIds && !fund.isInactiveBreakdown)) return;
      
      months.forEach(month => {
        const key = `${fund.id}-${month}`;
        let total = 0;
        
        ACTIVITY_TYPES
          .filter(activityType => activityType !== 'Current Value') // Exclude valuations from monthly totals
          .forEach(activityType => {
            const cellKey = `${fund.id}-${month}-${activityType}`;
            const cellValue = cellValuesCache.get(cellKey) || '';
            const numericValue = parseFloat(cellValue) || 0;
            
            if (numericValue !== 0) {
              const signType = activityTypeSignMap.get(activityType);
              if (signType === 'inflow') {
                total -= numericValue; // Negative for inflows
              } else if (signType === 'outflow') {
                total += numericValue; // Positive for outflows
              } else if (signType === 'neutral' && activityType === 'Current Value') {
                total += numericValue; // Positive for current value
              }
            }
          });
        
        results.fundMonthTotals.set(key, total);
        results.fundTotals.set(key, total); // Same calculation for fundTotals
      });
    });

    // Calculate activity type totals
    ACTIVITY_TYPES.forEach(activityType => {
      months.forEach(month => {
        const key = `${activityType}-${month}`;
        let total = 0;
        
        // Include activities from displayed funds (excluding virtual "Previous Funds" entry)
        funds.forEach(fund => {
          // Skip virtual "Previous Funds" entry to avoid double counting
          // Check both id === -1 and the condition used in cellValuesCache
          if (fund.id === -1 || (fund.isActive === false && fund.inactiveHoldingIds && !fund.isInactiveBreakdown)) return;
          
          const cellKey = `${fund.id}-${month}-${activityType}`;
          const cellValue = cellValuesCache.get(cellKey) || '';
          const numericValue = parseFloat(cellValue.replace(/,/g, '')) || 0;
          
          if (numericValue !== 0) {
            const signType = activityTypeSignMap.get(activityType);
            if (signType === 'inflow') {
              total -= numericValue; // Negative for inflows
            } else if (signType === 'outflow') {
              total += numericValue; // Positive for outflows
            } else if (signType === 'neutral' && activityType === 'Current Value') {
              total += numericValue; // Positive for current value
            }
          }
        });
        
        // Also include activities from inactive funds
        if (inactiveFundsForTotals && inactiveFundsForTotals.length > 0) {
          inactiveFundsForTotals.forEach(inactiveFund => {
            if (activityType === 'Current Value') {
              // Handle valuations using fundValuationsIndex
              const valuationKey = `${inactiveFund.id}-${month}`;
              const valuation = fundValuationsIndex.get(valuationKey);
              if (valuation) {
                total += valuation.valuation;
              }
            } else {
              // Handle other activity types using activitiesIndex
              const backendType = convertActivityTypeForBackend(activityType);
              const activityKey = `${inactiveFund.id}-${month}-${backendType}`;
              const activity = activitiesIndex.get(activityKey);
              
              if (activity) {
                const numericValue = parseFloat(activity.amount);
                if (!isNaN(numericValue)) {
                  const signType = activityTypeSignMap.get(activityType);
                  if (signType === 'inflow') {
                    total -= numericValue; // Negative for inflows
                  } else if (signType === 'outflow') {
                    total += numericValue; // Positive for outflows
                  }
                }
              }
            }
          });
        }
        
        results.activityTypeTotals.set(key, total);
      });
    });

    // Calculate month totals
    months.forEach(month => {
      const total = ACTIVITY_TYPES
        .filter(activityType => activityType !== 'Current Value')
        .reduce((sum, activityType) => {
          const key = `${activityType}-${month}`;
          return sum + (results.activityTypeTotals.get(key) || 0);
        }, 0);
      
      results.monthTotals.set(month, total);
    });

    // Calculate row totals across ALL months for entire product lifetime (not filtered by year)
    // This ensures row totals show cumulative totals across all years, not just the current year
    allFundsToProcess.forEach(fund => {
      ACTIVITY_TYPES.forEach(activityType => {
        const key = `${fund.id}-${activityType}`;
        let total = 0;

        // Use allMonths instead of monthsUpToSelectedYear for row totals
        allMonths.forEach(month => {
          const cellKey = `${fund.id}-${month}-${activityType}`;
          const cellValue = cellValuesCache.get(cellKey) || '';
          const numericValue = parseFloat(cellValue) || 0;
          
          if (numericValue !== 0 && activityType !== 'Current Value') {
            const signType = activityTypeSignMap.get(activityType);
            if (signType === 'inflow') {
              total -= numericValue; // Negative for inflows
            } else if (signType === 'outflow') {
              total += numericValue; // Positive for outflows
            } else if (signType === 'neutral' && activityType === 'Current Value') {
              total += numericValue; // Positive for current value
            }
          }
        });

        results.rowTotals.set(key, total);
      });
    });

    // Calculate fund row totals across ALL months for entire product lifetime (not filtered by year)
    // This ensures fund row totals show cumulative totals across all years, not just the current year
    allFundsToProcess.forEach(fund => {
      // Skip virtual "Previous Funds" entry to avoid double counting
      // Check both id === -1 and the condition used in cellValuesCache
      if (fund.id === -1 || (fund.isActive === false && fund.inactiveHoldingIds && !fund.isInactiveBreakdown)) return;
      
      let total = 0;
      
      ACTIVITY_TYPES.forEach(activityType => {
        if (activityType !== 'Current Value') {
          // Use allMonths instead of monthsUpToSelectedYear for fund row totals
          allMonths.forEach(month => {
            const cellKey = `${fund.id}-${month}-${activityType}`;
            const cellValue = cellValuesCache.get(cellKey) || '';
            const numericValue = parseFloat(cellValue) || 0;
            
            if (numericValue !== 0) {
              const signType = activityTypeSignMap.get(activityType);
              if (signType === 'inflow') {
                total -= numericValue;
              } else if (signType === 'outflow') {
                total += numericValue;
              } else if (signType === 'neutral' && activityType === 'Current Value') {
                total += numericValue;
              }
            }
          });
        }
      });
      
      results.fundRowTotals.set(fund.id, total);
    });

    return results;
      }, [funds, months, allMonths, cellValuesCache, inactiveFundsForTotals, activitiesIndex, activityTypeSignMap, currentYear, showInactiveFunds]);

  // Color management for switch groups
  const SWITCH_COLORS = [
    'border-blue-300 bg-blue-50',
    'border-green-300 bg-green-50', 
    'border-purple-300 bg-purple-50',
    'border-orange-300 bg-orange-50',
    'border-pink-300 bg-pink-50',
    'border-indigo-300 bg-indigo-50',
    'border-yellow-300 bg-yellow-50',
    'border-red-300 bg-red-50'
  ];

  const getSwitchGroupColor = (colorIndex: number): string => {
    return SWITCH_COLORS[colorIndex % SWITCH_COLORS.length];
  };

  

  // Fetch fund valuations for all the funds in the table
  useEffect(() => {
    const fetchFundValuations = async () => {
      setIsLoadingValuations(true);
      try {
        // Get all valuations (no filter, we'll filter in memory)
        const response = await api.get('fund_valuations'); // API interceptor will add the /api prefix
        
        // Check if data is an array, otherwise handle appropriately
        if (Array.isArray(response.data)) {
          setFundValuations(response.data);
        } else if (response.data && typeof response.data === 'object') {
          // If it's an object with a data property that is an array
          setFundValuations(Array.isArray(response.data.data) ? response.data.data : []);
        } else {
          // Fallback to empty array
          setFundValuations([]);
        }
      } catch (err: any) {
        // Set to empty array on error
        console.error("Error fetching fund valuations:", err.message);
        setFundValuations([]);
      } finally {
        setIsLoadingValuations(false);
      }
    };

    fetchFundValuations();
    // Only fetch once on component mount to avoid duplicate API calls
  }, []); // Empty dependency array to only run once

  // Add keyboard shortcut for saving changes
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Ctrl+S or Cmd+S (Mac)
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault(); // Prevent browser save dialog
        
        // Only trigger save if there are pending edits and not already submitting
        if (pendingEdits.length > 0 && !isSubmitting) {
          saveChanges();
        }
      }
    };
    
    // Add the event listener
    window.addEventListener('keydown', handleKeyDown);
    
    // Clean up
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [pendingEdits, isSubmitting]);

  // Sync activitiesState when activities prop changes
  // BUT preserve pending edits to avoid losing user's unsaved input when another user refreshes data
  useEffect(() => {
    // Only update if there are no pending edits (to avoid erasing user's current input)
    if (pendingEdits.length === 0) {
      setActivities(activities);
    }
    // If there are pending edits, we keep the current activitiesState to preserve user input
    // The edits will be applied when the user saves their changes
  }, [activities, pendingEdits.length]);

  // Add click handler to deselect switch cells when clicking elsewhere
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // Handle click outside to close any open modals or dropdowns
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  // Add scroll tracking for sticky header
  useEffect(() => {
    const handleScroll = () => {
      if (tableContainerRef.current && tableRef.current) {
        const containerRect = tableContainerRef.current.getBoundingClientRect();
        const tableRect = tableRef.current.getBoundingClientRect();
        
        // Check if the table container is scrolled past the viewport top
        const shouldStick = containerRect.top <= 0 && containerRect.bottom > 0;
        
        if (shouldStick) {
          // Get exact column positions from the actual table cells
          const headerRow = tableRef.current.querySelector('thead tr');
          const cells = headerRow?.querySelectorAll('th');
          const positions: {left: number, width: number}[] = [];
          
          if (cells && tableContainerRef.current) {
            const containerLeft = containerRect.left;
            const scrollLeft = tableContainerRef.current.scrollLeft;
            
            cells.forEach((cell, index) => {
              const cellRect = cell.getBoundingClientRect();
              
              // For sticky headers, we need to calculate position relative to the table container
              // Use offsetLeft which is stable and doesn't change with viewport scrolling
              let left: number;
              
              if (index === 0) {
                // Activities column is always pinned to the left
                left = 0;
              } else {
                // For other columns, use their offsetLeft position within the table minus scroll
                const cellElement = cell as HTMLElement;
                left = cellElement.offsetLeft - scrollLeft;
              }
              
              positions.push({
                left: left,
                width: cellRect.width
              });
            });
          }
          
          setHeaderTop(0);
          setTableWidth(tableRect.width);
          setHeaderLeft(containerRect.left);
          setColumnPositions(positions);
        } else {
          setHeaderTop(null);
          setTableWidth(0);
          setHeaderLeft(0);
          setColumnPositions([]);
        }
      }
    };

    // Create throttled version of scroll handler to improve performance
    const throttledHandleScroll = throttle(handleScroll, 16); // ~60fps max

    // Handle scroll events on both window and table container
    const tableContainer = tableContainerRef.current;
    
    window.addEventListener('scroll', throttledHandleScroll);
    window.addEventListener('resize', throttledHandleScroll);
    if (tableContainer) {
      tableContainer.addEventListener('scroll', throttledHandleScroll); // Handle horizontal scrolling
    }
    
    // Initial calculation
    handleScroll();
    
    return () => {
      window.removeEventListener('scroll', throttledHandleScroll);
      window.removeEventListener('resize', throttledHandleScroll);
      if (tableContainer) {
        tableContainer.removeEventListener('scroll', throttledHandleScroll);
      }
    };
  }, []);

  // Recalculate column positions when months change (year pagination)
  useEffect(() => {
    const recalculatePositions = () => {
      if (tableContainerRef.current && tableRef.current) {
        const containerRect = tableContainerRef.current.getBoundingClientRect();
        const shouldStick = containerRect.top <= 0 && containerRect.bottom > 0;
        
        if (shouldStick) {
          // Get exact column positions from the actual table cells
          const headerRow = tableRef.current.querySelector('thead tr');
          const cells = headerRow?.querySelectorAll('th');
          const positions: {left: number, width: number}[] = [];
          
          if (cells && tableContainerRef.current) {
            const containerLeft = containerRect.left;
            const scrollLeft = tableContainerRef.current.scrollLeft;
            
            cells.forEach((cell, index) => {
              const cellRect = cell.getBoundingClientRect();
              
              // For sticky headers, we need to calculate position relative to the table container
              // Use offsetLeft which is stable and doesn't change with viewport scrolling
              let left: number;
              
              if (index === 0) {
                // Activities column is always pinned to the left
                left = 0;
              } else {
                // For other columns, use their offsetLeft position within the table minus scroll
                const cellElement = cell as HTMLElement;
                left = cellElement.offsetLeft - scrollLeft;
              }
              
              positions.push({
                left: left,
                width: cellRect.width
              });
            });
          }
          
          setColumnPositions(positions);
          setTableWidth(tableRef.current.getBoundingClientRect().width);
        }
      }
    };

    // Use a small delay to ensure the DOM has updated after months change
    const timeoutId = setTimeout(recalculatePositions, 50);
    
    return () => clearTimeout(timeoutId);
  }, [months]); // Recalculate when months array changes

  // Synchronize scroll between top and bottom scroll bars
  useEffect(() => {
    const topScrollElement = topScrollRef.current;
    const bottomScrollElement = tableContainerRef.current;

    if (!topScrollElement || !bottomScrollElement) return;

    const handleTopScroll = () => {
      if (isScrollSyncingRef.current) return;
      
      isScrollSyncingRef.current = true;
      bottomScrollElement.scrollLeft = topScrollElement.scrollLeft;
      
      // Use a very short timeout to reset the flag
      setTimeout(() => {
        isScrollSyncingRef.current = false;
      }, 0);
    };

    const handleBottomScroll = () => {
      if (isScrollSyncingRef.current) return;
      
      isScrollSyncingRef.current = true;
      topScrollElement.scrollLeft = bottomScrollElement.scrollLeft;
      
      // Use a very short timeout to reset the flag
      setTimeout(() => {
        isScrollSyncingRef.current = false;
      }, 0);
    };

    // Use throttled versions to reduce frequency
    const throttledTopScroll = throttle(handleTopScroll, 16); // ~60fps
    const throttledBottomScroll = throttle(handleBottomScroll, 16); // ~60fps

    topScrollElement.addEventListener('scroll', throttledTopScroll, { passive: true });
    bottomScrollElement.addEventListener('scroll', throttledBottomScroll, { passive: true });

    return () => {
      topScrollElement.removeEventListener('scroll', throttledTopScroll);
      bottomScrollElement.removeEventListener('scroll', throttledBottomScroll);
    };
  }, []);

  // Add beforeunload warning for unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (pendingEdits.length > 0) {
        const message = 'You have unsaved changes in the monthly activities table. Are you sure you want to leave without saving?';
        e.preventDefault();
        e.returnValue = message; // Standard way to show the dialog
        return message; // For older browsers
      }
    };

    // Add the event listener
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Clean up
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [pendingEdits]);

  // Custom navigation blocking using popstate and link interception
  const location = useLocation();
  const navigate = useNavigate();

  // Block browser back/forward navigation when there are unsaved changes
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (pendingEdits.length > 0) {
        const confirmNavigation = window.confirm(
          'You have unsaved changes in the monthly activities table. Are you sure you want to leave without saving?'
        );
        
        if (!confirmNavigation) {
          // Push the current state back to prevent navigation
          window.history.pushState(null, '', window.location.href);
        }
      }
    };

    // Add popstate listener for browser back/forward buttons
    window.addEventListener('popstate', handlePopState);
    
    // Push current state to enable popstate detection
    window.history.pushState(null, '', window.location.href);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [pendingEdits]);

  // Intercept link clicks when there are unsaved changes
  useEffect(() => {
    const handleLinkClick = (event: MouseEvent) => {
      if (pendingEdits.length > 0) {
        const target = event.target as HTMLElement;
        const link = target.closest('a[href]') as HTMLAnchorElement;
        
        if (link && link.href && !link.href.startsWith('mailto:') && !link.href.startsWith('tel:')) {
          // Check if it's an internal link (same origin)
          try {
            const linkUrl = new URL(link.href);
            const currentUrl = new URL(window.location.href);
            
            if (linkUrl.origin === currentUrl.origin && linkUrl.pathname !== currentUrl.pathname) {
              event.preventDefault();
              
              const confirmNavigation = window.confirm(
                'You have unsaved changes in the monthly activities table. Are you sure you want to leave without saving?'
              );
              
              if (confirmNavigation) {
                // Allow navigation by programmatically navigating
                navigate(linkUrl.pathname + linkUrl.search + linkUrl.hash);
              }
            }
          } catch (e) {
            // If URL parsing fails, let the default behavior happen
          }
        }
      }
    };

    // Add click listener to document to catch all link clicks
    document.addEventListener('click', handleLinkClick, true);

    return () => {
      document.removeEventListener('click', handleLinkClick, true);
    };
  }, [pendingEdits, navigate]);

  // Initialize all months from product start date to current month and set up year pagination
  useEffect(() => {
    // Get current date for comparison
    const now = new Date();
    const currentYearValue = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-11
    
    // Determine start date
    let startDate = new Date();
    if (productStartDate) {
      startDate = new Date(productStartDate);
    } else {
      // Default to beginning of current year if no product start date
      startDate = new Date(currentYearValue, 0, 1);
    }
    
    // Start from the product start month/year
    let iterDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const endDate = new Date(currentYearValue, currentMonth, 1);
    
    // Generate all months from product start date to current month
    const allMonthsArray: string[] = [];
    while (iterDate <= endDate) {
      const monthStr = `${iterDate.getFullYear()}-${String(iterDate.getMonth() + 1).padStart(2, '0')}`;
      allMonthsArray.push(monthStr);
      
      // Move to next month
      iterDate.setMonth(iterDate.getMonth() + 1);
    }
    
    // Sort months in ascending order (oldest first)
    const sortedMonths = allMonthsArray.sort();
    setAllMonths(sortedMonths);
    
    // Extract available years
    const years = [...new Set(sortedMonths.map(month => parseInt(month.split('-')[0])))].sort();
    setAvailableYears(years);
    
    // Set initial year to the latest year with data, but respect saved year if it's valid
    if (years.length > 0) {
      const savedYear = localStorage.getItem('irr-calculation-selected-year');
      const savedYearValue = savedYear ? parseInt(savedYear) : null;
      
      if (savedYearValue && years.includes(savedYearValue)) {
        // Use saved year if it's valid (exists in available years)
        setCurrentYear(savedYearValue);
      } else {
        // Use latest year with data if saved year is invalid or doesn't exist
        setCurrentYear(years[years.length - 1]);
      }
    }
  }, [productStartDate]);

  // Filter months by selected year
  useEffect(() => {
    if (allMonths.length > 0) {
      const yearMonths = allMonths.filter(month => 
        parseInt(month.split('-')[0]) === currentYear
      );
      setMonths(yearMonths);
    }
  }, [allMonths, currentYear]);
  
  // No longer auto-focusing the first cell to avoid disrupting user flow
  useEffect(() => {
    if (funds.length > 0 && months.length > 0) {
      // Just initialize focusedCell without actually focusing the input
      const firstFund = funds[0];
      const firstActivityType = ACTIVITY_TYPES[0];
      
      setFocusedCell({
        fundId: firstFund.id,
        activityType: firstActivityType,
        monthIndex: 0
      });
    }
  }, [funds, months]);

  // Auto-scroll to the month with the latest activity when the table loads
  useEffect(() => {
    // Only auto-scroll on initial load, not when year changes
    if (isInitialLoad && months.length > 0 && activities.length > 0 && tableContainerRef.current) {
      // Small delay to ensure the table has rendered
      const scrollTimer = setTimeout(() => {
        if (tableContainerRef.current) {
          // Find the latest activity month
          let latestActivityMonth = '';
          let latestActivityDate = new Date(0); // Start with epoch
          
          activities.forEach(activity => {
            try {
              // Handle different timestamp formats safely
              // Use timezone-corrected date when available
              const activityDate = getActivityDate(activity);
              
              // Validate the date
              if (isNaN(activityDate.getTime())) {
                console.warn(`🚨 Invalid activity timestamp in scroll logic: ${activity.activity_timestamp}`);
                return; // Skip this activity
              }
              
              if (activityDate > latestActivityDate) {
                latestActivityDate = activityDate;
                // Convert to YYYY-MM format to match our months array (using UTC to avoid timezone shifts)
                latestActivityMonth = `${activityDate.getUTCFullYear()}-${String(activityDate.getUTCMonth() + 1).padStart(2, '0')}`;
              }
            } catch (error) {
              console.error(`🚨 Error parsing activity timestamp in scroll logic: ${activity.activity_timestamp}`, error);
            }
          });
          
          // Find the index of the latest activity month in our months array
          const latestMonthIndex = months.findIndex(month => month === latestActivityMonth);
          
          if (latestMonthIndex !== -1) {
            // Calculate approximate scroll position to center the latest activity month
            const monthColumnWidth = 120; // Approximate width of each month column
            const scrollPosition = Math.max(0, (latestMonthIndex * monthColumnWidth) - (tableContainerRef.current.clientWidth / 2));
            tableContainerRef.current.scrollLeft = scrollPosition;
          } else {
            // Fallback: if no activities found or month not in range, scroll to the rightmost position
            tableContainerRef.current.scrollLeft = tableContainerRef.current.scrollWidth;
          }
        }
      }, 100);

      return () => clearTimeout(scrollTimer);
    } else if (isInitialLoad && months.length > 0 && activities.length === 0 && tableContainerRef.current) {
      // If no activities, fallback to scrolling to the rightmost position
      const scrollTimer = setTimeout(() => {
        if (tableContainerRef.current) {
          tableContainerRef.current.scrollLeft = tableContainerRef.current.scrollWidth;
        }
      }, 100);

      return () => clearTimeout(scrollTimer);
    }
  }, [months, activities, isInitialLoad]);

  // Set initial load to false after the first auto-scroll completes
  useEffect(() => {
    if (isInitialLoad && months.length > 0) {
      // Wait for the auto-scroll to complete before marking as no longer initial load
      const timer = setTimeout(() => {
        setIsInitialLoad(false);
      }, 200); // Slightly longer than the auto-scroll timer (100ms)
      
      return () => clearTimeout(timer);
    }
  }, [isInitialLoad, months]);

  // Get fund valuation for a specific fund and month - now uses indexed lookup
  const getFundValuation = (fundId: number, month: string): FundValuation | undefined => {
    // Use indexed lookup for O(1) performance instead of array.find()
    const key = `${fundId}-${month}`;
    return fundValuationsIndex.get(key);
  };

  // Format activity type for display - use abbreviated versions to save space
  const formatActivityType = (activityType: string): string => {
    if (!activityType) return '';
    
    // Abbreviation mapping for period overview table
    const abbreviations: { [key: string]: string } = {
      'Investment': 'Inv.',
      'RegularInvestment': 'Reg. Inv.',
      'TaxUplift': 'Tax',
      'ProductSwitchIn': 'Prod. In',
      'ProductSwitchOut': 'Prod. Out', 
      'FundSwitchIn': 'Fund In',
      'FundSwitchOut': 'Fund Out',
      'Withdrawal': 'With.',
      'Current Value': 'Valuation'
    };
    
    // Return abbreviation if available, otherwise format normally
    if (abbreviations[activityType]) {
      return abbreviations[activityType];
    }
    
    // Fallback to original formatting for any new activity types
    let formatted = activityType.replace(/_/g, ' ');
    formatted = formatted.replace(/([a-z])([A-Z])/g, '$1 $2');
    return formatted
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Get activities for a specific fund, month, and activity type
  const getActivity = (fundId: number, month: string, activityType: string): Activity | undefined => {
    // Convert activity types for matching using our helper function
    const matchType = convertActivityTypeForBackend(activityType);
    

    // Use indexed lookup for O(1) performance instead of array.find()
    const key = `${fundId}-${month}-${matchType}`;
    return activitiesIndex.get(key);
  };

  // Get the cell value for display - now uses memoized cache
  const getCellValue = (fundId: number, month: string, activityType: string): string => {
    const key = `${fundId}-${month}-${activityType}`;
    return cellValuesCache.get(key) || '';
  };

  // New function to evaluate mathematical expressions
  const evaluateExpression = (expression: string): string => {
    // Special case: if expression is "0", return as is
    if (expression === "0") return "0";
    
    // If it's empty, return as is
    if (!expression || expression.trim() === '') return '';
    
    // If it's already a simple number, return as is (formatting happens on blur)
    if (!isNaN(Number(expression))) return expression;
    
    try {
      // Check if the input contains any mathematical operators
      if (/[+\-*/()]/.test(expression)) {
        // Clean the expression to ensure it's safe to evaluate
        // Only allow numbers, operators, decimals, and parentheses
        const cleanExpression = expression.replace(/[^0-9.+\-*/()]/g, '');
        
        // Use Function constructor to safely evaluate the expression
        // This avoids using eval() which can be dangerous
        const result = new Function(`return ${cleanExpression}`)();
        
        // Check if the result is a valid number
        if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
          // Prevent negative results from mathematical expressions
          if (result < 0) {
            return expression; // Return the original expression instead of evaluating to negative
          }
          // Return the result as a string (formatting happens on blur)
          return result.toString();
        }
      }
      
      // If no operators or evaluation failed, return the original expression
      return expression;
    } catch (error) {
      // If evaluation fails (syntax error), return the original expression
      return expression;
    }
  };

  // Update the handleCellBlur function to evaluate expressions and format to 2 decimal places
  const handleCellBlur = (fundId: number, month: string, activityType: string) => {
    // Find the current edit for this cell
    const cellEditIndex = pendingEdits.findIndex(
      edit => edit.fundId === fundId && 
              edit.month === month && 
              edit.activityType === activityType
    );
    
    // If we have a pending edit for this cell, evaluate any expression and format
    if (cellEditIndex !== -1) {
      const currentEdit = pendingEdits[cellEditIndex];
      let processedValue = evaluateExpression(currentEdit.value);
      
      // If the value is a valid number (and not empty), format it to 2 decimal places
      if (processedValue && processedValue.trim() !== '') {
        const num = parseFloat(processedValue);
        if (!isNaN(num) && isFinite(num)) {
          // Final check: prevent negative amounts
          if (num < 0) {
            // Remove the pending edit if it evaluates to negative
            const updatedEdits = pendingEdits.filter(edit => 
              !(edit.fundId === fundId && edit.month === month && edit.activityType === activityType)
            );
            setPendingEdits(updatedEdits);
            return;
          }
          processedValue = num.toFixed(2);
        }
      }
      
      // If the value changed after evaluation/formatting, update the pending edit
      if (processedValue !== currentEdit.value) {
        const updatedEdits = [...pendingEdits];
        updatedEdits[cellEditIndex] = {
          ...currentEdit,
          value: processedValue
        };
        setPendingEdits(updatedEdits);
      }
    }
    
    // Only show the fund selection modal for FundSwitchIn/FundSwitchOut cells with a value
    if ((activityType === 'FundSwitchIn' || activityType === 'FundSwitchOut')) {
      // Get the current value from pendingEdits
      const cellEdit = pendingEdits.find(
        edit => edit.fundId === fundId && 
                edit.month === month && 
                edit.activityType === activityType
      );
      
      if (!cellEdit || !cellEdit.value || cellEdit.value.trim() === '') {
        return; // No value or empty value, no need to show modal
      }
      
      // Check if the value actually changed from the original
      let originalValue = '';
      const activity = getActivity(fundId, month, activityType);
      
      if (activity) {
        originalValue = Math.abs(parseFloat(activity.amount)).toString();
      }
      
      // Only show the modal if the value is different from the original
      // or if this is a new entry (no original activity)
      const valueChanged = !activity || originalValue !== cellEdit.value;
      
      
    }
  };

  // Auto-populate zero valuations up to the earliest non-zero valuation for a fund
  // Only fills zeros for months where other funds in the portfolio have valuations
  const autoPopulateZeroValuations = (fundId: number) => {
    // Find all months that have existing valuations for this specific fund
    const existingValuations = new Map<string, number>();

    // Check both existing fund valuations and pending edits for this fund
    months.forEach(month => {
      // Check existing valuation
      const valuation = getFundValuation(fundId, month);
      if (valuation && valuation.valuation > 0) {
        existingValuations.set(month, valuation.valuation);
      }

      // Check pending edits for valuations
      const pendingEdit = pendingEdits.find(edit =>
        edit.fundId === fundId &&
        edit.month === month &&
        edit.activityType === 'Current Value' &&
        !edit.toDelete
      );
      if (pendingEdit && parseFloat(pendingEdit.value) > 0) {
        existingValuations.set(month, parseFloat(pendingEdit.value));
      }
    });

    // If no non-zero valuations exist for this fund, don't auto-populate
    if (existingValuations.size === 0) {
      return;
    }

    // Find the earliest month with a non-zero valuation for this fund
    const sortedValuationMonths = Array.from(existingValuations.keys()).sort((a, b) => {
      const dateA = new Date(a + '-01');
      const dateB = new Date(b + '-01');
      return dateA.getTime() - dateB.getTime();
    });

    const earliestNonZeroMonth = sortedValuationMonths[0];

    // Check which months have valuations from OTHER funds in the portfolio
    const monthsWithOtherFundValuations = new Set<string>();

    funds.forEach(fund => {
      // Skip the current fund and inactive funds
      if (fund.id === fundId || fund.isActive === false) {
        return;
      }

      months.forEach(month => {
        const valuation = getFundValuation(fund.id, month);
        if (valuation && valuation.valuation !== null && valuation.valuation !== undefined) {
          monthsWithOtherFundValuations.add(month);
        }

        // Also check pending edits for other funds
        const pendingEdit = pendingEdits.find(edit =>
          edit.fundId === fund.id &&
          edit.month === month &&
          edit.activityType === 'Current Value' &&
          !edit.toDelete &&
          edit.value !== ''
        );
        if (pendingEdit) {
          monthsWithOtherFundValuations.add(month);
        }
      });
    });

    // Auto-populate zeros only for months that:
    // 1. Are before the earliest non-zero valuation for this fund
    // 2. Have valuations from other funds in the portfolio
    const newEdits: CellEdit[] = [];

    for (const month of months) {
      const monthDate = new Date(month + '-01');
      const earliestDate = new Date(earliestNonZeroMonth + '-01');

      // Only process months before the earliest non-zero valuation
      if (monthDate >= earliestDate) {
        break;
      }

      // Check if other funds have valuations for this month
      if (!monthsWithOtherFundValuations.has(month)) {
        continue;
      }

      // Check if this month already has a valuation (existing or pending) for this fund
      const hasExistingValuation = getFundValuation(fundId, month);
      const hasPendingEdit = pendingEdits.find(edit =>
        edit.fundId === fundId &&
        edit.month === month &&
        edit.activityType === 'Current Value'
      );

      // Only add zero if no valuation exists and no pending edit exists
      if (!hasExistingValuation && !hasPendingEdit) {
        const newEdit: CellEdit = {
          fundId,
          month,
          activityType: 'Current Value',
          value: '0',
          isNew: true,
          originalActivityId: undefined,
          toDelete: false
        };
        newEdits.push(newEdit);
      }
    }

    // Add all new edits to pending edits
    if (newEdits.length > 0) {
      setPendingEdits(prev => [...prev, ...newEdits]);
    }
  };

  // Update the handleCellValueChange function to allow mathematical operators
  const handleCellValueChangeEnhanced = (fundId: number, month: string, activityType: string, value: string) => {
    // Find the fund to check if it's the Previous Funds entry
    const fund = funds.find(f => f.id === fundId);

    // Don't allow edits to Previous Funds cells
    if (fund && fund.isActive === false) {
      return;
    }

    // Allow necessary characters for math expressions and ensure zeros are handled correctly
    const sanitizedValue = value === "0" ? "0" : (value.trim() === '' ? '' : value);

    // Validate against negative amounts
    if (sanitizedValue !== '') {
      // Try to parse the value to check if it's negative
      const numericValue = parseFloat(sanitizedValue);
      if (!isNaN(numericValue) && numericValue < 0) {
        // Show a brief error message and prevent the negative value
        setError('Negative amounts are not allowed');
        // Clear the error after 3 seconds
        setTimeout(() => {
          setError(null);
        }, 3000);
        return;
      }
    }

    // Get the original value from the database (not from pending edits)
    let originalValue = '';
    let existingId = undefined;

    if (activityType === 'Current Value') {
      const valuation = getFundValuation(fundId, month);
      if (valuation) {
        originalValue = valuation.valuation.toString();
        existingId = valuation.id;
      }
    } else {
      const activity = getActivity(fundId, month, activityType);
      if (activity) {
        originalValue = Math.abs(parseFloat(activity.amount)).toString();
        existingId = activity.id;
      }
    }

    // If the value hasn't actually changed from the original, don't create an edit
    if (sanitizedValue === originalValue) {
      // Remove any existing pending edit for this cell since we're back to the original value
      setPendingEdits(prev => prev.filter(edit =>
        !(edit.fundId === fundId && edit.month === month && edit.activityType === activityType)
      ));
      return;
    }

    // If both the new value and original value are empty, don't create an edit
    if (sanitizedValue === '' && originalValue === '') {
      // Remove any existing pending edit for this cell
      setPendingEdits(prev => prev.filter(edit =>
        !(edit.fundId === fundId && edit.month === month && edit.activityType === activityType)
      ));
      return;
    }

    // Create the new edit
    const newEdit: CellEdit = {
      fundId,
      month,
      activityType,
      value: sanitizedValue,
      isNew: !existingId,
      originalActivityId: existingId,
      toDelete: sanitizedValue === '' && !!existingId
    };

    // Update pending edits by replacing any existing edit for this cell
    setPendingEdits(prev => {
      const filtered = prev.filter(edit =>
        !(edit.fundId === fundId && edit.month === month && edit.activityType === activityType)
      );
      const updated = [...filtered, newEdit];
      return updated;
    });
  };

  // Handle fund selection confirmation
  


  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-GB', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  // Format a month string to a display format
  const formatMonth = (monthStr: string): string => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    const monthAbbr = date.toLocaleDateString('en-GB', { month: 'short' });
    const yearShort = year.slice(-2); // Get last 2 digits of year
    return `${monthAbbr} ${yearShort}`;
  };

  // IRR recalculation is now handled automatically in the backend
  // No manual recalculation function needed

  // NEW: Get complete existing data for a specific month and fund
  const getExistingMonthData = (fundId: number, month: string): ExistingMonthData => {
    const existingActivities: { [activityType: string]: Activity } = {};
    const existingValuations: { [activityType: string]: FundValuation } = {};
    
    // Get all existing activities for this fund/month (exclude 'Current Value')
    ACTIVITY_TYPES.forEach(activityType => {
      if (activityType !== 'Current Value') {
        const existing = getActivity(fundId, month, activityType);
        if (existing) {
          existingActivities[activityType] = existing;
        }
      }
    });
    
    // Get existing valuation for 'Current Value'
    const existingValuation = getFundValuation(fundId, month);
    if (existingValuation) {
      existingValuations['Current Value'] = existingValuation;
    }
    
    return { activities: existingActivities, valuations: existingValuations };
  };

  // NEW: Group edits by month and fund combination
  const groupEditsByMonthAndFund = (edits: CellEdit[]): { [key: string]: CellEdit[] } => {
    const grouped: { [key: string]: CellEdit[] } = {};
    edits.forEach(edit => {
      const key = `${edit.month}_${edit.fundId}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(edit);
    });
    return grouped;
  };

  // NEW: Check if a specific activity type has been edited
  const isActivityTypeEdited = (fundId: number, month: string, activityType: string, edits: CellEdit[]): boolean => {
    return edits.some(edit => 
      edit.fundId === fundId && 
      edit.month === month && 
      edit.activityType === activityType
    );
  };

  // NEW: Get all activity types that should be preserved (not edited and exist)
  const getActivitiesToPreserve = (fundId: number, month: string, monthEdits: CellEdit[]): string[] => {
    const existingData = getExistingMonthData(fundId, month);
    const activitiesToPreserve: string[] = [];
    
    // Check all activity types
    ACTIVITY_TYPES.forEach(activityType => {
      // If this activity type wasn't edited
      if (!isActivityTypeEdited(fundId, month, activityType, monthEdits)) {
        // Check if it exists in current data
        if (activityType === 'Current Value') {
          if (existingData.valuations[activityType]) {
            activitiesToPreserve.push(activityType);
          }
        } else {
          if (existingData.activities[activityType]) {
            activitiesToPreserve.push(activityType);
          }
        }
      }
    });
    
    return activitiesToPreserve;
  };

  // NEW: Enhanced save logic using TransactionCoordinator for proper ordering
  const saveChangesWithPreservation = async () => {
    if (pendingEdits.length === 0) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Group edits by month and fund combination for preservation analysis
      const editsByMonthAndFund = groupEditsByMonthAndFund(pendingEdits);

      // Process each month-fund combination for preservation logging
      for (const [monthFundKey, monthEdits] of Object.entries(editsByMonthAndFund)) {
        const [month, fundIdStr] = monthFundKey.split('_');
        const fundId = parseInt(fundIdStr);

        // Analyze activities to preserve when processing edits
        const activitiesToPreserve = getActivitiesToPreserve(fundId, month, monthEdits);
      }

      // Filter out empty edits (keep deletions)
      const editsToProcess = pendingEdits.filter(edit =>
        edit.value.trim() !== '' || edit.toDelete
      );

      // Process deletions first
      const deletions = editsToProcess.filter(edit => edit.toDelete && edit.originalActivityId);
      const creationsAndUpdates = editsToProcess.filter(edit => !edit.toDelete);

      // Handle deletions
      for (const edit of deletions) {
        if (edit.activityType === 'Current Value') {
          await api.delete(`fund_valuations/${edit.originalActivityId}`);
        } else {
          await api.delete(`holding_activity_logs/${edit.originalActivityId}`);
        }
      }

      // Use TransactionCoordinator for ordered saves
      // This ensures activities are saved before valuations to prevent IRR calculation race conditions
      const result = await TransactionCoordinator.saveActivitiesAndValuations(
        creationsAndUpdates,
        accountHoldingId
      );

      if (!result.success) {
        throw new Error(`Transaction failed: ${result.errors.join(', ')}`);
      }
      
      // Clear pending edits and refresh data
      setPendingEdits([]);
      onActivitiesUpdated();
      
    } catch (error: any) {
      console.error('Error saving activities:', error);
      setError(error.response?.data?.detail || 'Failed to save activities');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update the saveChanges function to use the new preservation logic
  const saveChanges = saveChangesWithPreservation;

  // Memoized getCellClass function with caching for performance optimization
  const getCellClass = useMemo(() => {
    const cache = new Map();
    
    return (fundId: number, month: string, activityType: string, isFirstColumn: boolean = false): string => {
      // Create cache key that includes all dependencies
      const focusKey = focusedCell ? `${focusedCell.fundId}-${focusedCell.activityType}-${focusedCell.monthIndex}` : 'none';
      const editKey = `${pendingEdits.length}`; // Simple way to invalidate when edits change
      const key = `${fundId}-${month}-${activityType}-${isFirstColumn}-${focusKey}-${editKey}`;
      
      if (cache.has(key)) {
        return cache.get(key);
      }
      
    // Base class for all cells - remove fixed width constraints to allow full width usage
    let baseClass = "px-1 py-0 border box-border w-full";
    
      // Use indexed lookup instead of array.find() - O(1) instead of O(n)
      const fund = fundsById.get(fundId);
    const isPreviousFunds = fund && fund.isActive === false;
    
    // Check if this cell is currently focused
    const isFocused = focusedCell && 
                     focusedCell.fundId === fundId && 
                     focusedCell.activityType === activityType && 
                     months[focusedCell.monthIndex] === month;
    
    // Check if this cell is in the same row or column as the focused cell
    const isInFocusedRow = focusedCell && 
                           focusedCell.fundId === fundId && 
                           focusedCell.activityType === activityType;
    const isInFocusedColumn = focusedCell && 
                             months[focusedCell.monthIndex] === month;
    
    // Add focused indicator - bold border all around
    if (isFocused) {
      baseClass += " border-[3px] border-blue-500 bg-blue-50 z-10";
    } else if (isInFocusedRow || isInFocusedColumn) {
      baseClass += " bg-gray-50";
    }
    
      // Use indexed lookup instead of array.find() - O(1) instead of O(n)
      const pendingEdit = pendingEditsMap.get(`${fundId}-${month}-${activityType}`);
    
    // Add edit indicator if there's a pending edit
    if (pendingEdit) {
      baseClass += " bg-yellow-50";
      if (isFocused) {
        baseClass += " border-yellow-400";
      }
    }
    
    // Add subtle indicator for Current Value cells but maintain same base color
    if (activityType === 'Current Value') {
      baseClass += " hover:bg-blue-50 border-b border-blue-200";
      // Override if focused
      if (isFocused) {
        baseClass = baseClass.replace("border-b border-blue-200", "");
      }
    }
    
    // Add specific styling for Previous Funds cells
    if (isPreviousFunds) {
      baseClass += " bg-gray-50 text-gray-500";
    }
    
      // Cache the result
      cache.set(key, baseClass);
    return baseClass;
  };
  }, [fundsById, pendingEditsMap, focusedCell, months, pendingEdits.length]);

  // Handle keyboard navigation
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    fundId: number,
    activityType: string,
    monthIndex: number
  ) => {
    // Only handle arrow keys and Enter key
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Tab'].includes(e.key)) {
      return;
    }
    
    // For Tab key, let the default behavior work
    if (e.key === 'Tab') {
      return;
    }
    
    e.preventDefault(); // Prevent default behavior (scrolling)
    
    const fundIndex = funds.findIndex(f => f.id === fundId);
    const activityTypeIndex = ACTIVITY_TYPES.indexOf(activityType);
    
    // Calculate the new cell to focus based on arrow key or Enter
    let newFundIndex = fundIndex;
    let newActivityTypeIndex = activityTypeIndex;
    let newMonthIndex = monthIndex;
    let navigateToTotals = false;
    let totalsRowType = '';
    
    // Define the totals section structure
    const totalsActivityTypes = ACTIVITY_TYPES.filter(at => at !== 'Current Value');
    const totalsRows = ['header', ...totalsActivityTypes, 'Total Valuation', 'Overall Total'];
    
    switch (e.key) {
      case 'ArrowUp':
        // Move up one activity type, or to the previous fund's last activity
        if (activityTypeIndex > 0) {
          newActivityTypeIndex--;
        } else if (fundIndex > 0) {
          newFundIndex--;
          newActivityTypeIndex = ACTIVITY_TYPES.length - 1;
        }
        break;
      case 'ArrowDown':
      case 'Enter': // Make Enter behave like Down Arrow
        // Move down one activity type, or to the next fund's first activity, or to totals
        if (activityTypeIndex < ACTIVITY_TYPES.length - 1) {
          newActivityTypeIndex++;
        } else if (fundIndex < funds.length - 1) {
          newFundIndex++;
          newActivityTypeIndex = 0;
        } else {
          // We're at the last activity of the last fund, navigate to totals
          navigateToTotals = true;
          totalsRowType = totalsRows[1]; // First activity type in totals (skip header)
        }
        break;
      case 'ArrowLeft':
        // Move to the previous month
        if (monthIndex > 0) {
          newMonthIndex--;
        }
        break;
      case 'ArrowRight':
        // Move to the next month
        if (monthIndex < months.length - 1) {
          newMonthIndex++;
        }
        break;
    }
    
    // Skip inactive funds
    while (newFundIndex < funds.length && 
           funds[newFundIndex].isActive === false &&
           !funds[newFundIndex].isInactiveBreakdown) {
      if (e.key === 'ArrowUp' || e.key === 'Enter' || e.key === 'ArrowDown') {
        // If moving up/down and hit inactive fund, increment the fund index
        newFundIndex += (e.key === 'ArrowUp' ? -1 : 1);
      } else {
        // For other keys, just exit the loop
        break;
      }
    }
    
    // Ensure we're still within valid bounds
    if (newFundIndex < 0) newFundIndex = 0;
    if (newFundIndex >= funds.length) newFundIndex = funds.length - 1;
    
    // Focus the new cell if it's different
    if (navigateToTotals) {
      // Navigate to totals section
      setFocusedCell({
        fundId: -1, // Special value to indicate totals section
        activityType: totalsRowType,
        monthIndex: newMonthIndex
      });
      
      // Auto-scroll to beginning if focusing on the leftmost month
      if (newMonthIndex === 0) {
        scrollToBeginning();
      }
      // Auto-scroll to end if focusing on the rightmost month
      else if (newMonthIndex === months.length - 1) {
        scrollToEnd();
      }
      
      // Focus the totals cell
      setTimeout(() => {
        const totalsCell = document.getElementById(
          `totals-cell-${totalsRowType}-${months[newMonthIndex]}`
        );
        if (totalsCell) {
          totalsCell.focus();
          totalsCell.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 0);
    } else if (
      newFundIndex !== fundIndex ||
      newActivityTypeIndex !== activityTypeIndex ||
      newMonthIndex !== monthIndex
    ) {
      setFocusedCell({
        fundId: funds[newFundIndex].id,
        activityType: ACTIVITY_TYPES[newActivityTypeIndex],
        monthIndex: newMonthIndex
      });
      
      // Auto-scroll to beginning if focusing on the leftmost month
      if (newMonthIndex === 0) {
        scrollToBeginning();
      }
      // Auto-scroll to end if focusing on the rightmost month
      else if (newMonthIndex === months.length - 1) {
        scrollToEnd();
      }
      
      // Find and focus the input element
      setTimeout(() => {
        const newCell = document.getElementById(
          `cell-${funds[newFundIndex].id}-${months[newMonthIndex]}-${ACTIVITY_TYPES[newActivityTypeIndex]}`
        );
        if (newCell) {
          const input = newCell.querySelector('input');
          if (input && !input.disabled) {
            input.focus();
            
            // If it's a double click, select all text to allow immediate typing
            if (e.detail === 2) {
              input.select();
            }
          }
        }
      }, 0);
    }
  };

  // New function to handle keyboard navigation in totals section
  const handleTotalsKeyDown = (
    e: React.KeyboardEvent<HTMLTableCellElement>,
    rowType: string,
    monthIndex: number
  ) => {
    // Only handle arrow keys and Enter key
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Tab'].includes(e.key)) {
      return;
    }
    
    // For Tab key, let the default behavior work
    if (e.key === 'Tab') {
      return;
    }
    
    e.preventDefault();
    
    const totalsActivityTypes = ACTIVITY_TYPES.filter(at => at !== 'Current Value');
    const totalsRows = ['header', ...totalsActivityTypes, 'Total Valuation', 'Overall Total'];
    const currentRowIndex = totalsRows.indexOf(rowType);
    
    let newRowIndex = currentRowIndex;
    let newMonthIndex = monthIndex;
    let navigateToFunds = false;
    
    switch (e.key) {
      case 'ArrowUp':
        if (currentRowIndex > 1) { // Skip header row (index 0)
          newRowIndex--;
        } else if (currentRowIndex === 1) {
          // Navigate back to the last fund's last activity
          navigateToFunds = true;
        }
        break;
      case 'ArrowDown':
      case 'Enter':
        if (currentRowIndex < totalsRows.length - 1) {
          newRowIndex++;
          // Skip header row
          if (newRowIndex === 0) newRowIndex = 1;
        }
        break;
      case 'ArrowLeft':
        if (monthIndex > 0) {
          newMonthIndex--;
        }
        break;
      case 'ArrowRight':
        if (monthIndex < months.length - 1) {
          newMonthIndex++;
        }
        break;
    }
    
    if (navigateToFunds) {
      // Navigate back to the last active fund's last activity
      const lastActiveFund = funds.filter(f => f.isActive !== false && !f.isInactiveBreakdown).pop();
      if (lastActiveFund) {
        setFocusedCell({
          fundId: lastActiveFund.id,
          activityType: ACTIVITY_TYPES[ACTIVITY_TYPES.length - 1],
          monthIndex: newMonthIndex
        });
        
        // Auto-scroll to beginning if focusing on the leftmost month
        if (newMonthIndex === 0) {
          scrollToBeginning();
        }
        // Auto-scroll to end if focusing on the rightmost month
        else if (newMonthIndex === months.length - 1) {
          scrollToEnd();
        }
        
        setTimeout(() => {
          const cell = document.getElementById(
            `cell-${lastActiveFund.id}-${months[newMonthIndex]}-${ACTIVITY_TYPES[ACTIVITY_TYPES.length - 1]}`
          );
          if (cell) {
            const input = cell.querySelector('input');
            if (input && !input.disabled) {
              input.focus();
            }
          }
        }, 0);
      }
    } else if (newRowIndex !== currentRowIndex || newMonthIndex !== monthIndex) {
      const newRowType = totalsRows[newRowIndex];
      setFocusedCell({
        fundId: -1,
        activityType: newRowType,
        monthIndex: newMonthIndex
      });
      
      // Auto-scroll to beginning if focusing on the leftmost month
      if (newMonthIndex === 0) {
        scrollToBeginning();
      }
      // Auto-scroll to end if focusing on the rightmost month
      else if (newMonthIndex === months.length - 1) {
        scrollToEnd();
      }
      
      setTimeout(() => {
        const totalsCell = document.getElementById(
          `totals-cell-${newRowType}-${months[newMonthIndex]}`
        );
        if (totalsCell) {
          totalsCell.focus();
          totalsCell.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 0);
    }
  };

  // Calculate the total for a specific fund and month - now uses memoized results
  const calculateFundMonthTotal = (fundId: number, month: string): number => {
    // Special case for virtual "Previous Funds" entry
    // Check if this is the virtual fund by ID or by finding it in the funds array
    const isVirtualFund = fundId === -1 || funds.some(f => f.id === fundId && f.isActive === false && f.inactiveHoldingIds && !f.isInactiveBreakdown);
    if (isVirtualFund) {
      // Calculate total from actual inactive funds data
      let total = 0;
      if (inactiveFundsForTotals && inactiveFundsForTotals.length > 0) {
        ACTIVITY_TYPES
          .filter(activityType => activityType !== 'Current Value')
          .forEach(activityType => {
            inactiveFundsForTotals.forEach(inactiveFund => {
              const backendType = convertActivityTypeForBackend(activityType);
              const activityKey = `${inactiveFund.id}-${month}-${backendType}`;
              const activity = activitiesIndex.get(activityKey);
              
              if (activity) {
                const numericValue = parseFloat(activity.amount);
                if (!isNaN(numericValue)) {
                  const signType = activityTypeSignMap.get(activityType);
                  if (signType === 'inflow') {
                    total -= numericValue; // Negative for inflows
                  } else if (signType === 'outflow') {
                    total += numericValue; // Positive for outflows
                  }
                }
              }
            });
          });
      }
      return total;
    }
    
    const key = `${fundId}-${month}`;
    return calculationResults.fundMonthTotals.get(key) || 0;
  };

  // Calculate activity type total for a specific month across all funds (current year only)
  const calculateActivityTypeTotal = (activityType: string, month: string): number => {

    const key = `${activityType}-${month}`;
    return calculationResults.activityTypeTotals.get(key) || 0;

  };

  // Calculate activity type total for a specific month across all funds (entire product lifetime)
  const calculateActivityTypeTotalAllTime = (activityType: string, month: string): number => {
    let total = 0;
    
    // Include activities from displayed funds (excluding virtual "Previous Funds" entry)
    funds.forEach(fund => {
      // Skip virtual "Previous Funds" entry to avoid double counting
      // Check both id === -1 and the condition used in cellValuesCache
      if (fund.id === -1 || (fund.isActive === false && fund.inactiveHoldingIds && !fund.isInactiveBreakdown)) return;
      
      const cellKey = `${fund.id}-${month}-${activityType}`;
      const cellValue = cellValuesCache.get(cellKey) || '';
      const numericValue = parseFloat(cellValue.replace(/,/g, '')) || 0;
      
      if (numericValue !== 0) {
        const signType = activityTypeSignMap.get(activityType);
        if (signType === 'inflow') {
          total -= numericValue; // Negative for inflows
        } else if (signType === 'outflow') {
          total += numericValue; // Positive for outflows
        } else if (signType === 'neutral' && activityType === 'Current Value') {
          total += numericValue; // Positive for current value
        }
      }
    });
    
    // Also include activities from inactive funds
    if (inactiveFundsForTotals && inactiveFundsForTotals.length > 0) {
      inactiveFundsForTotals.forEach(inactiveFund => {
        const backendType = convertActivityTypeForBackend(activityType);
        const activityKey = `${inactiveFund.id}-${month}-${backendType}`;
        const activity = activitiesIndex.get(activityKey);
        
        if (activity) {
          const numericValue = parseFloat(activity.amount);
          if (!isNaN(numericValue)) {
            const signType = activityTypeSignMap.get(activityType);
            if (signType === 'inflow') {
              total -= numericValue; // Negative for inflows
            } else if (signType === 'outflow') {
              total += numericValue; // Positive for outflows
            } else if (signType === 'neutral' && activityType === 'Current Value') {
              total += numericValue; // Positive for current value
            }
          }
        }
      });
    }
    
    return total;
  };

  // Calculate total for all activity types and all funds for a specific month (current year only)
  const calculateMonthTotal = (month: string): number => {
    return calculationResults.monthTotals.get(month) || 0;
  };

  // Calculate total for all activity types and all funds for a specific month (entire product lifetime)
  const calculateMonthTotalAllTime = (month: string): number => {
    const total = ACTIVITY_TYPES
      .filter(activityType => activityType !== 'Current Value')
      .reduce((sum, activityType) => {
        return sum + calculateActivityTypeTotalAllTime(activityType, month);
      }, 0);
    
    return total;
  };

  // Calculate row total for a specific activity type across all months (entire product lifetime)
  const calculateActivityTypeRowTotal = (activityType: string): number => {
    // Don't sum valuations (Current Value) across time periods - doesn't make sense
    if (activityType === 'Current Value') {
      return 0;
    }
    
    let total = 0;
    // Use allMonths instead of months to include entire product lifetime
    allMonths.forEach(month => {
      total += calculateActivityTypeTotalAllTime(activityType, month);
    });
    return total;
  };

  // Calculate row total for all activity types across all months (entire product lifetime)
  const calculateOverallRowTotal = (): number => {
    let total = 0;
    // Use allMonths instead of months to include entire product lifetime
    allMonths.forEach(month => {
      total += calculateMonthTotalAllTime(month);
    });
    return total;
  };

  // Format cell value for display - format to 2 decimal places unless actively editing
  const formatCellValue = (value: string, fundId?: number, month?: string, activityType?: string): string => {
    if (!value || value.trim() === '') return '';
    
    // If it contains math operators, return it as-is for editing
    if (/[+\-*/()]/.test(value)) {
      return value;
    }
    
    // Check if this cell is currently being edited (focused)
    const isCurrentlyEditing = fundId && month && activityType && 
      focusedCell && 
      focusedCell.fundId === fundId && 
      focusedCell.activityType === activityType &&
      months[focusedCell.monthIndex] === month;
    
    // If currently editing, return raw value for user input
    if (isCurrentlyEditing) {
      return value;
    }
    
    // For display, format numbers to 2 decimal places
    const num = parseFloat(value);
    if (!isNaN(num) && isFinite(num)) {
      return num.toFixed(2);
    }
    
    return value;
  };

  // Format the total for display with correct signs
  const formatTotal = (total: number): string => {
    // Return '-' for zero values
    if (total === 0) {
      return '-';
    }
    // Round to 2 decimal places and format with commas and 2 decimal places
    const rounded = Math.round(total * 100) / 100;
    return new Intl.NumberFormat('en-GB', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(rounded);
  };

  // Format row totals rounded to 2 decimal places with comma separators
  const formatRowTotal = (total: number): string => {
    // Return '-' for zero values
    if (total === 0) {
      return '-';
    }
    // Round to 2 decimal places and format with commas and 2 decimal places
    const rounded = Math.round(total * 100) / 100;
    return new Intl.NumberFormat('en-GB', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(rounded);
  };

  

  // Get class for activity label cell in first column
  const getActivityLabelClass = (fundId: number, activityType: string) => {
    // Default styling
    let baseClass = "px-1 py-0 font-medium text-gray-500 sticky left-0 z-10";
    
    // Check if this is a focused row
    const isInFocusedRow = focusedCell && 
                          focusedCell.fundId === fundId && 
                          focusedCell.activityType === activityType;
    
    // Add highlighting for focused row
    if (isInFocusedRow) {
      baseClass += " bg-gray-100 font-semibold";
    } else {
      baseClass += " bg-white";
    }
    
    // Get the fund to check if it's an inactive breakdown
    const fund = funds.find(f => f.id === fundId);
    if (fund?.isInactiveBreakdown) {
      baseClass += " bg-gray-50 pl-4";
    }
    
    return baseClass;
  };

  // Helper function to check if a month has a provider switch - now uses indexed lookup
  const getProviderSwitchForMonth = (month: string): ProviderSwitch | undefined => {
    // Use indexed lookup for O(1) performance instead of array.find()
    return providerSwitchesIndex.get(month);
  };

  // Function to toggle fund expansion (show/hide transaction rows)
  const toggleFundExpansion = (fundId: number) => {
    setExpandedFunds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(fundId)) {
        newSet.delete(fundId);
      } else {
        newSet.add(fundId);
      }
      return newSet;
    });
  };

  // Function to expand all funds
  const expandAllFunds = () => {
    const allFundIds = new Set(funds.map(f => f.id));
    setExpandedFunds(allFundIds);
  };

  // Function to collapse all funds
  const collapseAllFunds = () => {
    setExpandedFunds(new Set());
  };

  // Function to reactivate a fund
  const reactivateFund = async (portfolioFundId: number, fundName: string) => {
    try {
      // Add to loading state
      setReactivatingFunds(prev => new Set(prev).add(portfolioFundId));
      
      // Call API to reactivate the fund
      await api.patch(`portfolio_funds/${portfolioFundId}`, {
        status: 'active'
      });

      // Refresh the data
      onActivitiesUpdated();
      
    } catch (err: any) {
      console.error(`Error reactivating fund ${fundName}:`, err);
      setError(err.message || `Failed to reactivate fund: ${fundName}`);
    } finally {
      // Remove from loading state
      setReactivatingFunds(prev => {
        const newSet = new Set(prev);
        newSet.delete(portfolioFundId);
        return newSet;
      });
    }
  };

  // Handle bulk month activities changes
  const handleBulkMonthSave = (bulkData: any) => {
    // Convert bulk data to pending edits format
    const newEdits: CellEdit[] = [];

    Object.keys(bulkData).forEach(fundIdStr => {
      const fundId = parseInt(fundIdStr);
      Object.keys(bulkData[fundId]).forEach(activityType => {
        const value = bulkData[fundId][activityType];

        // Validate activity type to ensure it's in the expected UI format
        if (!ACTIVITY_TYPES.includes(activityType)) {
          console.error(`🔍 BULK SAVE ERROR: Invalid activity type received: "${activityType}"`);
          console.error(`🔍 BULK SAVE ERROR: Expected one of:`, ACTIVITY_TYPES);
          return; // Skip this invalid activity type
        }

        // Get current value to check if this is actually a change
        const currentValue = getCellValue(fundId, selectedBulkMonth, activityType);

        // Only create an edit if the value actually changed
        if (value !== currentValue) {
        // Get existing activity or valuation
        let existingId = undefined;
        if (activityType === 'Current Value') {
          const valuation = getFundValuation(fundId, selectedBulkMonth);
          existingId = valuation?.id;
        } else {
          const activity = getActivity(fundId, selectedBulkMonth, activityType);
          existingId = activity?.id;
        }

        const newEdit: CellEdit = {
          fundId,
          month: selectedBulkMonth,
          activityType, // Keep in UI format - conversion happens in saveChangesWithPreservation
          value: value,
          isNew: !existingId,
          originalActivityId: existingId,
          toDelete: value === '' && !!existingId
        };

        newEdits.push(newEdit);
        }
      });
    });
    
    // Only replace edits for cells that actually changed
    // Remove existing pending edits for the changed cells only
    const unchangedEdits = pendingEdits.filter(edit => {
      if (edit.month !== selectedBulkMonth) return true; // Keep edits for other months
      
      // Check if this cell was changed in the bulk edit
      const wasChanged = newEdits.some(newEdit => 
        newEdit.fundId === edit.fundId && 
        newEdit.activityType === edit.activityType
      );
      
      return !wasChanged; // Keep existing edits for cells that weren't changed
    });
    
    setPendingEdits([...unchangedEdits, ...newEdits]);
  };

  // Handle month header click
  const handleMonthHeaderClick = (month: string) => {
    setSelectedBulkMonth(month);
    setShowBulkMonthModal(true);
  };

  // Calculate fund total for a specific month - now uses memoized results
  const calculateFundTotal = (fundId: number, month: string): number => {
    const key = `${fundId}-${month}`;
    return calculationResults.fundTotals.get(key) || 0;
  };

  // Calculate row total for a specific fund and activity across all displayed months - now uses memoized results
  const calculateRowTotal = (fundId: number, activityType: string): number => {
    const key = `${fundId}-${activityType}`;
    return calculationResults.rowTotals.get(key) || 0;
  };

  // Calculate row total for fund across all activities and months - now uses memoized results
  const calculateFundRowTotal = (fundId: number): number => {
    // Special case for virtual "Previous Funds" entry
    // Check if this is the virtual fund by ID or by finding it in the funds array
    const isVirtualFund = fundId === -1 || funds.some(f => f.id === fundId && f.isActive === false && f.inactiveHoldingIds && !f.isInactiveBreakdown);
    if (isVirtualFund) {
      // Calculate total from actual inactive funds data across all months
      let total = 0;
      if (inactiveFundsForTotals && inactiveFundsForTotals.length > 0) {
        ACTIVITY_TYPES
          .filter(activityType => activityType !== 'Current Value')
          .forEach(activityType => {
            allMonths.forEach(month => {
              inactiveFundsForTotals.forEach(inactiveFund => {
                const backendType = convertActivityTypeForBackend(activityType);
                const activityKey = `${inactiveFund.id}-${month}-${backendType}`;
                const activity = activitiesIndex.get(activityKey);
                
                if (activity) {
                  const numericValue = parseFloat(activity.amount);
                  if (!isNaN(numericValue)) {
                    const signType = activityTypeSignMap.get(activityType);
                    if (signType === 'inflow') {
                      total -= numericValue; // Negative for inflows
                    } else if (signType === 'outflow') {
                      total += numericValue; // Positive for outflows
                    }
                  }
                }
              });
            });
          });
      }
      return total;
    }
    
    return calculationResults.fundRowTotals.get(fundId) || 0;
  };

  // Navigation functions for month pages
  const scrollToBeginning = () => {
    // Scroll both the top scroll bar and table container to the beginning
    if (topScrollRef.current) {
      topScrollRef.current.scrollLeft = 0;
    }
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollLeft = 0;
    }
  };

  const scrollToEnd = () => {
    // Scroll both the top scroll bar and table container to the end
    if (topScrollRef.current) {
      topScrollRef.current.scrollLeft = topScrollRef.current.scrollWidth;
    }
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollLeft = tableContainerRef.current.scrollWidth;
    }
  };

  // Enhanced year change handler with source tracking
  const handleYearChange = useCallback((newYear: number, source: 'main' | 'mini' = 'main') => {
    // Log feature flag usage for debugging
    logFeatureFlagUsage('MiniYearSelector', source === 'mini');
    
    // Update year state
    setIsInitialLoad(false); // Mark as manual year change
    setCurrentYear(newYear);
    
    // Auto-scroll to beginning to show January
    setTimeout(scrollToBeginning, 100);
  }, [currentYear, featureFlags.debugMiniYearSelectors, scrollToBeginning]);

  // Year Pagination Component
  const YearPagination = ({ position = 'top' }: { position?: 'top' | 'bottom' }) => {
    if (availableYears.length <= 1) return null;

    const borderClass = position === 'top' 
      ? 'border-l border-r border-t border-gray-200 rounded-t-lg' 
      : 'border border-gray-200 rounded-b-lg';

    return (
      <div className={`flex flex-col justify-center items-center gap-2 py-3 bg-gray-50 ${borderClass}`}>
        <div className="flex flex-wrap justify-center items-center gap-1">
          {/* Previous button */}
          <button
            onClick={() => {
              const currentIndex = availableYears.indexOf(currentYear);
              if (currentIndex > 0) {
                handleYearChange(availableYears[currentIndex - 1], 'main');
              }
            }}
            disabled={availableYears.indexOf(currentYear) === 0}
            className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-l-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Previous year"
          >
            ‹ Previous
          </button>

          {/* Year buttons */}
          <div className="flex flex-wrap justify-center">
            {availableYears.map((year, index) => (
              <button
                key={year}
                onClick={() => {
                  handleYearChange(year, 'main');
                }}
                className={`px-4 py-2 text-sm font-medium border-t border-b ${
                  index === 0 ? '' : 'border-l-0'
                } ${
                  year === currentYear
                    ? 'bg-blue-600 text-white border-blue-600 z-10 relative'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
                title={`Switch to ${year}`}
              >
                {year}
              </button>
            ))}
          </div>

          {/* Next button */}
          <button
            onClick={() => {
              const currentIndex = availableYears.indexOf(currentYear);
              if (currentIndex < availableYears.length - 1) {
                handleYearChange(availableYears[currentIndex + 1], 'main');
              }
            }}
            disabled={availableYears.indexOf(currentYear) === availableYears.length - 1}
            className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-r-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Next year"
          >
            Next ›
          </button>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="mt-8">
        <div className="flex flex-col gap-3 mb-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <h3 className="text-lg font-semibold text-gray-900">Monthly Activities</h3>

              {/* Expand/Collapse All Button */}
              <button
                onClick={() => {
                  // Check if all funds are currently expanded
                  const allExpanded = funds.every(f => expandedFunds.has(f.id));
                  if (allExpanded) {
                    collapseAllFunds();
                  } else {
                    expandAllFunds();
                  }
                }}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md shadow-sm transition-colors"
                title={funds.every(f => expandedFunds.has(f.id)) ? 'Collapse all funds' : 'Expand all funds'}
              >
                {funds.every(f => expandedFunds.has(f.id)) ? 'Collapse All' : 'Expand All'}
              </button>
            </div>

            {/* Row Total Info */}
            {availableYears.length > 1 && (
              <div className="text-sm text-gray-600">
                <span className="inline-flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  Row totals include all activities for the entire product lifetime ({availableYears[0]} - {availableYears[availableYears.length - 1]})
                </span>
              </div>
            )}
          </div>
            

          </div>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 border-l-4 border-red-500 text-red-700">
            <p>{error}</p>
          </div>
        )}

        {/* Unsaved changes warning */}
        {pendingEdits.length > 0 && (
          <div className="mb-4 p-3 bg-orange-100 border-l-4 border-orange-500 text-orange-700 flex items-center justify-between">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="font-medium">
                You have {pendingEdits.length} unsaved change{pendingEdits.length !== 1 ? 's' : ''} in the monthly activities table.
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm">Save your changes before leaving this page.</span>
              <button
                onClick={saveChanges}
                disabled={isSubmitting}
                className="px-3 py-1 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50 text-sm font-medium transition-colors"
              >
                {isSubmitting ? 'Saving...' : 'Save Now'}
              </button>
            </div>
          </div>
        )}

        {/* Top Year Pagination */}
        <YearPagination position="top" />
        
        {/* Top scroll bar */}
        <div 
          ref={topScrollRef}
          className="overflow-x-auto border-l border-r w-full bg-gray-50"
          style={{ height: '20px', paddingTop: '2px', paddingBottom: '2px' }}
        >
          <div 
            style={{ 
              height: '16px', 
              width: `${120 + (months.length * 100) + 80}px`,
              minWidth: `${120 + (months.length * 100) + 80}px`,
              backgroundColor: 'transparent'
            }}
          />
        </div>
        
        <div 
          ref={tableContainerRef}
          className="overflow-x-auto border-l border-r border-b rounded-b-lg shadow-md w-full" 
          style={{ scrollBehavior: 'smooth' }}
        >
          <div className="relative">
            <table 
              ref={tableRef}
              className="divide-y divide-gray-200 table-auto relative"
              style={{minWidth: `${120 + (months.length * 100) + 80}px`}}
            >
              <colgroup>
                <col className="sticky left-0 z-10" style={{minWidth: '120px'}} />
                {months.map((month, index) => (
                  <col key={`col-${month}`} style={{minWidth: '100px'}} />
                ))}
                <col style={{minWidth: '80px'}} />
              </colgroup>
              <thead 
                className="bg-blue-50 shadow-lg"
                style={{
                  position: headerTop !== null ? 'fixed' : 'sticky',
                  top: headerTop !== null ? `${headerTop}px` : 0,
                  left: headerTop !== null ? `${headerLeft}px` : 'auto',
                  width: headerTop !== null ? `${tableWidth}px` : 'auto',
                  zIndex: headerTop !== null ? 100 : 40,
                  ...(headerTop !== null && { display: 'block' })
                }}
              >
                <tr 
                  className=""
                  style={{
                    ...(headerTop !== null && { 
                      display: 'block',
                      position: 'relative',
                      height: '24px'
                    })
                  }}
                >
                  <th 
                    className="px-1 py-0 text-left font-medium text-gray-800 sticky left-0 top-0 z-30 bg-blue-50 border-b border-gray-300"
                    style={{
                      ...(headerTop !== null && columnPositions[0] ? {
                        position: 'absolute',
                        left: '0px', // Always position Activities column at left edge
                        width: `${columnPositions[0].width}px`,
                        height: '24px',
                        display: 'flex',
                        alignItems: 'center'
                      } : {
                        width: 'auto'
                      })
                    }}
                  >
                    Activity
                  </th>
                  {months.map((month, index) => {
                    const providerSwitch = getProviderSwitchForMonth(month);
                    const columnIndex = index + 1; // +1 because first column is Activity
                    
                    // Use EnhancedMonthHeader if feature flag is enabled
                    if (enableMiniYearSelectors) {
                      return (
                        <EnhancedMonthHeader
                          key={month}
                          month={month}
                          currentYear={currentYear}
                          availableYears={availableYears}
                          onYearChange={(newYear) => handleYearChange(newYear, 'mini')}
                          onMonthHeaderClick={handleMonthHeaderClick}
                          isInFixedMode={headerTop !== null}
                          providerSwitch={providerSwitch}
                          columnIndex={columnIndex}
                          columnPositions={columnPositions}
                          headerTop={headerTop}
                        />
                      );
                    }
                    
                    // Fallback to original header implementation
                    return (
                      <th 
                        key={month} 
                        className="px-1 py-0 text-right font-medium text-gray-800 whitespace-nowrap bg-blue-50 border-b border-gray-300 relative group sticky top-0 z-40 cursor-pointer hover:bg-blue-100"
                        onClick={() => handleMonthHeaderClick(month)}
                        title="Click to bulk edit activities for this month"
                        style={{
                          ...(headerTop !== null && columnPositions[columnIndex] ? {
                            position: 'absolute',
                            left: `${columnPositions[columnIndex].left}px`,
                            width: `${columnPositions[columnIndex].width}px`,
                            height: '24px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 40
                          } : {
                            width: 'auto'
                          })
                        }}
                      >
                        <span className="text-sm">{formatMonth(month)}</span>
                        {providerSwitch && (
                          <div className="absolute -top-1 right-0 w-4 h-4">
                            <div 
                              className="w-3 h-3 bg-indigo-500 rounded-full cursor-help"
                              title={`Provider Switch: ${providerSwitch.previous_provider_name || 'None'} → ${providerSwitch.new_provider_name}`}
                            />
                            {/* Tooltip */}
                            <div className="hidden group-hover:block absolute z-50 w-64 p-2 bg-white rounded-lg shadow-lg border border-gray-200 text-sm text-left -right-2 top-5">
                              <div className="font-medium text-gray-900 mb-1">Provider Switch</div>
                              <div className="text-gray-600">
                                <div>From: {providerSwitch.previous_provider_name || 'None'}</div>
                                <div>To: {providerSwitch.new_provider_name}</div>
                                {providerSwitch.description && (
                                  <div className="mt-1 text-xs italic">{providerSwitch.description}</div>
                                )}
                                <div className="text-xs text-gray-500 mt-1">
                                  {new Date(providerSwitch.switch_date).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </th>
                    );
                  })}
                  <th 
                    className="px-1 py-0 text-right font-medium text-gray-800 whitespace-nowrap bg-blue-50 border-b border-gray-300 sticky top-0 z-40"
                  >
                    <span className="text-sm">Row Total</span>
                  </th>
                </tr>
              </thead>
              {/* Spacer to prevent content jump when header becomes fixed */}
              {headerTop !== null && (
                <thead className="bg-transparent">
                  <tr className="">
                    <th 
                      className="px-1 py-0"
                      style={{
                        width: columnPositions[0] ? `${columnPositions[0].width}px` : 'auto'
                      }}
                    ></th>
                    {months.map((month, index) => {
                      const columnIndex = index + 1;
                      return (
                        <th 
                          key={`spacer-${month}`} 
                          className="px-1 py-0"
                          style={{
                            width: columnPositions[columnIndex] ? `${columnPositions[columnIndex].width}px` : 'auto'
                          }}
                        ></th>
                      );
                    })}
                    <th 
                      className="px-1 py-0"
                      style={{
                        width: '10%'
                      }}
                    ></th>
                  </tr>
                </thead>
              )}
              <tbody className="bg-white divide-y divide-gray-200">
                {(() => {
                  const previousFundsEntry = funds.find(f => f.isActive === false && f.inactiveHoldingIds && f.inactiveHoldingIds.length > 0);
                  let fundsToDisplay = [...funds];
                  
                  if (showInactiveFunds && previousFundsEntry && previousFundsEntry.inactiveHoldingIds) {
                      const inactiveFundsToShow = previousFundsEntry.inactiveHoldingIds.map(holding => ({
                        id: holding.id,
                        fund_name: holding.fund_name || `Inactive Fund ${holding.id}`,
                        holding_id: -1,
                        isActive: false,
                        isInactiveBreakdown: true,
                        fund_id: holding.fund_id
                      }));
                    
                    const previousFundsIndex = fundsToDisplay.findIndex(f => f.id === previousFundsEntry.id);
                    if (previousFundsIndex >= 0) {
                      fundsToDisplay = [
                        ...fundsToDisplay.slice(0, previousFundsIndex + 1),
                        ...inactiveFundsToShow,
                        ...fundsToDisplay.slice(previousFundsIndex + 1)
                      ];
                    }
                  }

                    // Create rows for each fund+activity combination
                    const rows: JSX.Element[] = [];

                    fundsToDisplay.forEach(fund => {
                      // Add fund name row first
                      const isExpanded = expandedFunds.has(fund.id);
                        rows.push(
                        <tr key={`fund-header-${fund.id}${fund.isInactiveBreakdown ? '-breakdown' : ''}`}
                            className={`${fund.isInactiveBreakdown ? 'bg-gray-50' : 'bg-white'} border-t-2 border-gray-300 cursor-pointer hover:bg-gray-50`}
                            onClick={() => toggleFundExpansion(fund.id)}>
                          {/* Activity column - shows fund name */}
                          <td className={`px-1 py-1 text-sm font-semibold ${
                              fund.isActive === false
                                ? fund.isInactiveBreakdown
                                  ? 'text-gray-600'
                                  : 'text-blue-800'
                                : 'text-gray-900'
                            } sticky left-0 z-10 ${
                              fund.isActive === false
                                ? fund.isInactiveBreakdown ? 'bg-gray-50' : 'bg-gray-100'
                                : 'bg-white'
                          }`}>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center">
                                    {/* Chevron icon for expand/collapse */}
                                    <span className="mr-2 text-gray-400">
                                      {isExpanded ? '▼' : '▶'}
                                    </span>
                                    {fund.isInactiveBreakdown && 
                                      <span className="text-gray-400 mr-2">→</span>
                                    }
                                    {fund.fund_name}
                                    {fund.isActive === false && !fund.isInactiveBreakdown && (
                                      <div className="text-xs text-gray-500 font-normal">
                                        ({fund.inactiveHoldingIds?.length || 0} inactive {(fund.inactiveHoldingIds?.length || 0) === 1 ? 'fund' : 'funds'})
                                      </div>
                                    )}
                                  </div>
                                  {fund.isActive === false && !fund.isInactiveBreakdown && fund.inactiveHoldingIds && fund.inactiveHoldingIds.length > 0 && (
                                    <button
                                      onClick={() => setShowInactiveFunds(!showInactiveFunds)}
                                      className="ml-2 px-2 py-1 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 rounded border border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                                    >
                                      {showInactiveFunds ? "Hide" : "Show"} Breakdown
                                    </button>
                                  )}
                                  {fund.isInactiveBreakdown && (
                                    <button
                                      onClick={() => reactivateFund(fund.id, fund.fund_name)}
                                      disabled={reactivatingFunds.has(fund.id)}
                                      className="ml-2 px-2 py-1 text-xs bg-green-50 hover:bg-green-100 text-green-700 rounded border border-green-300 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      {reactivatingFunds.has(fund.id) ? 'Reactivating...' : 'Reactivate'}
                                    </button>
                                  )}
                                  {fund.isActive !== false && !fund.isInactiveBreakdown && (
                                    <button
                                      onClick={() => autoPopulateZeroValuations(fund.id)}
                                      className="ml-2 px-2 py-1 text-xs bg-purple-50 hover:bg-purple-100 text-purple-700 rounded border border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors"
                                      title="Auto-populate zero valuations up to earliest non-zero valuation"
                                    >
                                      Fill Zeros
                                    </button>
                                  )}
                                </div>
                            </td>
                            
                          {/* Empty month data columns for fund header */}
                          {months.map(month => (
                            <td key={`fund-header-${fund.id}-${month}`} 
                                className={`px-1 py-1 ${
                                  fund.isActive === false 
                                    ? fund.isInactiveBreakdown ? 'bg-gray-50' : 'bg-gray-100' 
                                    : 'bg-white'
                                }`}>
                            </td>
                          ))}
                          
                          {/* Empty row total column for fund header */}
                          <td className={`px-1 py-1 border-l border-gray-300 ${
                            fund.isActive === false 
                              ? fund.isInactiveBreakdown ? 'bg-gray-50' : 'bg-gray-100' 
                              : 'bg-white'
                          }`}>
                          </td>
                        </tr>
                      );

                      // Add activity rows (filter to show only Current Value when collapsed)
                      const activityTypesToShow = isExpanded ? ACTIVITY_TYPES : ACTIVITY_TYPES.filter(type => type === 'Current Value');
                      activityTypesToShow.forEach((activityType, activityIndex) => {
                        rows.push(
                          <tr key={`${fund.id}-${activityType}${fund.isInactiveBreakdown ? '-breakdown' : ''}`} 
                              className={`${
                                fund.isInactiveBreakdown ? 'bg-gray-50' : 
                                activityType === 'Current Value' ? 'bg-blue-50' : 
                                'bg-white'
                              } ${
                                activityType === 'Current Value' ? 'border-t border-blue-200' : 'border-t border-gray-100'
                              }`}>
                            {/* Activity type column */}
                            <td className={`px-1 py-0 font-medium text-sm sticky left-0 z-10 pl-4 ${
                              fund.isActive === false 
                                ? fund.isInactiveBreakdown ? 'bg-gray-50' : 'bg-gray-100' 
                                : activityType === 'Current Value' ? 'bg-blue-50' : 'bg-white'
                            } ${
                              activityType === 'Current Value' ? 'text-blue-700 font-semibold' : 'text-gray-500'
                            }`}>
                            {fund.isInactiveBreakdown && 
                              <span className="text-gray-400 mr-2">→</span>
                            }
                            {formatActivityType(activityType)}
                          </td>
                            
                            {/* Month data columns */}
                        {months.map((month, monthIndex) => {
                          const cellValue = getCellValue(fund.id, month, activityType);
                          
                          return (
                            <td 
                                key={`${fund.id}-${month}-${activityType}${fund.isInactiveBreakdown ? '-breakdown' : ''}`} 
                                className={`${getCellClass(fund.id, month, activityType, true)} ${
                                  fund.isInactiveBreakdown ? 'bg-gray-50 opacity-75' : ''
                                } overflow-hidden`}
                                id={`cell-${fund.id}-${month}-${activityType}${fund.isInactiveBreakdown ? '-breakdown' : ''}`}
                              onClick={(e) => {
                                  if (fund.isInactiveBreakdown || fund.isActive === false) return;
                                  
                                setFocusedCell({
                                  fundId: fund.id,
                                  activityType,
                                  monthIndex: months.indexOf(month)
                                });
                                
                                const input = e.currentTarget.querySelector('input');
                                if (input && !input.disabled) {
                                  input.focus();
                                  if (e.detail === 2) {
                                    input.select();
                                  }
                                }
                              }}
                            >
                              <div className="flex justify-center items-center">
                                  <input
                                    type="text"
                                    className={`focus:outline-none bg-transparent text-right border-0 shadow-none w-full ${
                                      !fund.isActive || fund.isInactiveBreakdown ? 'text-gray-500 cursor-not-allowed' : 
                                      activityType === 'Current Value' ? 'text-blue-700 font-semibold' : ''
                                    }`}
                                    value={formatCellValue(cellValue, fund.id, month, activityType)}
                                    disabled={isSubmitting || fund.isActive === false || fund.isInactiveBreakdown}
                                    onChange={(e) => {
                                      if (fund.isActive !== false && !fund.isInactiveBreakdown) {
                                        const value = e.target.value;
                                        
                                        // Allow mathematical expressions - only restrict if it's a plain number with more than 2 decimal places
                                        if (value.includes('.') && !/[+\-*/()]/.test(value)) {
                                          const parts = value.split('.');
                                          if (parts[1] && parts[1].length > 2) {
                                            return;
                                          }
                                        }
                                        
                                        handleCellValueChangeEnhanced(fund.id, month, activityType, value);
                                      }
                                    }}
                                    onBlur={(e) => {
                                      if (fund.isActive !== false && !fund.isInactiveBreakdown) {
                                        handleCellBlur(fund.id, month, activityType);
                                      }
                                    }}
                                    onKeyDown={(e) => {
                                      if (fund.isActive !== false && !fund.isInactiveBreakdown) {
                                        handleKeyDown(e, fund.id, activityType, monthIndex);
                                      }
                                    }}
                                    onFocus={() => {
                                      if (fund.isActive !== false && !fund.isInactiveBreakdown) {
                                        setFocusedCell({
                                          fundId: fund.id,
                                          activityType,
                                          monthIndex: months.indexOf(month)
                                        });
                                      }
                                    }}
                                    tabIndex={fund.isActive === false || fund.isInactiveBreakdown ? -1 : 0}
                                  style={{
                                    border: 'none',
                                    outline: 'none',
                                    boxShadow: 'none',
                                    background: 'transparent',
                                    padding: '0 1px',
                                    fontSize: '0.75rem',
                                    opacity: fund.isActive === false || fund.isInactiveBreakdown ? 0.7 : 1,
                                    width: '100%',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                  }}
                                  inputMode="text"
                                />
                              </div>
                            </td>
                          );
                        })}
                        
                        {/* Row Total column for detailed view */}
                        <td className={`px-1 py-0 text-right text-sm font-bold border-l border-gray-300 ${
                          fund.isActive === false 
                            ? fund.isInactiveBreakdown ? 'bg-gray-50' : 'bg-gray-100' 
                            : 'bg-white'
                        }`}>
                          {(() => {
                            const rowTotal = calculateRowTotal(fund.id, activityType);
                            return (
                              <span className={
                                rowTotal > 0 ? 'text-green-700' : 
                                rowTotal < 0 ? 'text-red-700' : 
                                'text-gray-500'
                              }>
                                {rowTotal !== 0 ? formatRowTotal(rowTotal) : ''}
                              </span>
                            );
                          })()}
                        </td>
                      </tr>
                        );
                      });
                      
                      // Add a totals row for each fund (except inactive breakdown funds)
                      if (!fund.isInactiveBreakdown) {
                        rows.push(
                          <tr key={`total-${fund.id}`} className="bg-gray-100 border-t border-gray-200">
                            <td className="px-1 py-0 font-bold text-sm text-red-700 sticky left-0 z-10 bg-gray-100 pl-4">
                        Monthly Total
                      </td>
                      {months.map(month => {
                        const total = calculateFundMonthTotal(fund.id, month);
                        const formattedTotal = formatTotal(total);
                        
                        return (
                          <td 
                            key={`total-${fund.id}-${month}`} 
                            className="px-1 py-0 text-right text-sm font-bold text-red-700 bg-gray-100"
                          >
                            {formattedTotal}
                          </td>
                        );
                      })}
                      
                      {/* Row Total column for fund total row */}
                      <td className="px-1 py-0 text-right text-sm font-bold text-red-700 border-l border-gray-300 bg-gray-100">
                        {(() => {
                          const rowTotal = calculateFundRowTotal(fund.id);
                          return formatRowTotal(rowTotal);
                        })()}
                      </td>
                    </tr>
                        );
                      }
                    });

                    return rows;
                  })()}

                {/* Grand totals section - totals by activity type across all funds */}
                <tr className="bg-gray-50 border-t-2 border-gray-300 font-semibold">
                  <td className="px-1 py-0 text-gray-900 sticky left-0 z-10 bg-gray-50" style={{minWidth: '120px'}}>
                    Monthly Totals
                  </td>
                  {months.map(month => (
                    <td key={`totals-header-${month}`} className="px-1 py-0 text-right"></td>
                  ))}
                  <td className="px-1 py-0 text-right border-l border-gray-300 bg-gray-50 text-sm font-medium">
                    Row Total
                  </td>
                </tr>

                {/* Activity type total rows */}
                {ACTIVITY_TYPES
                  .filter(activityType => activityType !== 'Current Value') // Exclude Current Value from totals
                  .map(activityType => (
                    <tr key={`totals-${activityType}`} className="bg-white border-t border-gray-200">
                      <td className="px-1 py-0 font-medium text-sm text-gray-500 sticky left-0 z-10 bg-white" style={{minWidth: '120px'}}>
                        {formatActivityType(activityType)}
                      </td>
                      {months.map((month, monthIndex) => {
                        const total = calculateActivityTypeTotal(activityType, month);
                        const formattedTotal = formatTotal(total);
                        
                        return (
                          <td 
                            key={`totals-${activityType}-${month}`}
                            id={`totals-cell-${activityType}-${month}`}
                            className="px-1 py-0 text-right focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 focus:bg-blue-50 focus:z-20 relative"
                            tabIndex={0}
                            onKeyDown={(e) => handleTotalsKeyDown(e, activityType, monthIndex)}
                            onFocus={() => {
                              setFocusedCell({
                                fundId: -1,
                                activityType: activityType,
                                monthIndex: monthIndex
                              });
                            }}
                          >
                            {formattedTotal}
                          </td>
                        );
                      })}
                      <td className="px-1 py-0 text-right border-l border-gray-300 bg-white">
                        {(() => {
                          const rowTotal = calculateActivityTypeRowTotal(activityType);
                          return rowTotal !== 0 ? formatTotal(rowTotal) : '';
                        })()}
                      </td>
                    </tr>
                  ))}

                {/* Valuation total row */}
                <tr className="bg-blue-50 border-t border-blue-200">
                  <td className="px-1 py-0 font-medium text-blue-700 sticky left-0 z-10 bg-blue-50" style={{minWidth: '120px'}}>
                    Total Valuation
                  </td>
                  {months.map((month, monthIndex) => {
                    const total = calculateActivityTypeTotal('Current Value', month);
                    const formattedTotal = formatTotal(total);
                    
                    return (
                      <td 
                        key={`totals-valuation-${month}`}
                        id={`totals-cell-Total Valuation-${month}`}
                        className="px-1 py-0 text-right font-medium text-blue-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-600 focus:bg-blue-100 focus:z-20 relative"
                        tabIndex={0}
                        onKeyDown={(e) => handleTotalsKeyDown(e, 'Total Valuation', monthIndex)}
                        onFocus={() => {
                          setFocusedCell({
                            fundId: -1,
                            activityType: 'Total Valuation',
                            monthIndex: monthIndex
                          });
                        }}
                      >
                        {formattedTotal}
                      </td>
                    );
                  })}
                  <td className="px-1 py-0 text-right border-l border-gray-300 bg-blue-50">
                    {(() => {
                      const rowTotal = calculateActivityTypeRowTotal('Current Value');
                      return rowTotal !== 0 ? formatTotal(rowTotal) : '';
                    })()}
                  </td>
                </tr>

                {/* Grand total row */}
                <tr className="bg-gray-100 border-t border-gray-200">
                  <td className="px-1 py-0 font-bold text-sm text-red-700 sticky left-0 z-10 bg-gray-100" style={{minWidth: '120px'}}>
                    Overall Total
                  </td>
                  {months.map((month, monthIndex) => {
                    const total = calculateMonthTotal(month);
                    const formattedTotal = formatTotal(total);
                    
                    return (
                      <td 
                        key={`grand-total-${month}`}
                        id={`totals-cell-Overall Total-${month}`}
                        className="px-1 py-0 text-right text-sm font-bold text-red-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 focus:bg-blue-50 focus:z-20 relative"
                        tabIndex={0}
                        onKeyDown={(e) => handleTotalsKeyDown(e, 'Overall Total', monthIndex)}
                        onFocus={() => {
                          setFocusedCell({
                            fundId: -1,
                            activityType: 'Overall Total',
                            monthIndex: monthIndex
                          });
                        }}
                      >
                        {formattedTotal}
                      </td>
                    );
                  })}
                  <td className="px-1 py-0 text-right text-sm font-bold text-red-700 border-l border-gray-300 bg-gray-100">
                    {(() => {
                      const rowTotal = calculateOverallRowTotal();
                      return rowTotal !== 0 ? formatTotal(rowTotal) : '';
                    })()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Bottom Year Pagination */}
        <YearPagination position="bottom" />

      </div>
      
      
      
      {/* Bulk Month Activities Modal */}
      {showBulkMonthModal && (
        <BulkMonthActivitiesModal
          isOpen={showBulkMonthModal}
          onClose={() => {
            setShowBulkMonthModal(false);
            setSelectedBulkMonth('');
          }}
          month={selectedBulkMonth}
          funds={funds}
          onSave={handleBulkMonthSave}
          getCurrentValue={(fundId: number, activityType: string) => getCellValue(fundId, selectedBulkMonth, activityType)}
        />
      )}
    </>
  );
};

export default EditableMonthlyActivitiesTable; 