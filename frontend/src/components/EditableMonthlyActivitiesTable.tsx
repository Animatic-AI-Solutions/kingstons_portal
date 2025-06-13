import React, { useState, useEffect, useMemo, useRef, Fragment } from 'react';
import { formatCurrency } from '../utils/formatters';
import api, { createFundValuation, calculatePortfolioIRR } from '../services/api';
import BulkMonthActivitiesModal from './BulkMonthActivitiesModal';

interface Activity {
  id?: number;
  activity_timestamp: string;
  activity_type: string;
  amount: string;
  portfolio_fund_id: number;
  account_holding_id: number;
  units_transacted?: number;
  market_value_held?: number;
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
  'GovernmentUplift',
  'Product Switch In',
  'Product Switch Out',
  'Fund Switch In',
  'Fund Switch Out',
  'Withdrawal',
  'Current Value'
];

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
  const [allAvailableMonths, setAllAvailableMonths] = useState<string[]>([]);
  const [currentMonthPage, setCurrentMonthPage] = useState(0);
  const [monthsPerPage] = useState(12); // Show 12 months at a time
  const [pendingEdits, setPendingEdits] = useState<CellEdit[]>([]);
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
  
  // State for compact view toggle
  const [isCompactView, setIsCompactView] = useState(false);
  
  // State and ref for sticky header tracking
  const [headerTop, setHeaderTop] = useState<number | null>(null);
  const [tableWidth, setTableWidth] = useState<number>(0);
  const [headerLeft, setHeaderLeft] = useState<number>(0);
  const [columnPositions, setColumnPositions] = useState<{left: number, width: number}[]>([]);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  

  
  // Styles for input elements to remove borders
  const noBorderStyles = {
    border: 'none', 
    outline: 'none',
    boxShadow: 'none',
    appearance: 'none',
    WebkitAppearance: 'none',
    MozAppearance: 'none'
  };

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
  useEffect(() => {
    setActivities(activities);
  }, [activities]);

  // Add click handler to deselect switch cells when clicking elsewhere
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // This can be removed as we no longer have switch cells
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
            cells.forEach(cell => {
              const cellRect = cell.getBoundingClientRect();
              positions.push({
                left: cellRect.left - containerLeft,
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

    // Handle scroll events on both window and table container
    const tableContainer = tableContainerRef.current;
    
    window.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleScroll);
    if (tableContainer) {
      tableContainer.addEventListener('scroll', handleScroll); // Handle horizontal scrolling
    }
    
    // Initial calculation
    handleScroll();
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      if (tableContainer) {
        tableContainer.removeEventListener('scroll', handleScroll);
      }
    };
  }, []);

  // Initialize all available months and set up pagination
  useEffect(() => {
    // Get current date for comparison
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-11
    
    // Determine start date
    let startDate = new Date();
    if (productStartDate) {
      startDate = new Date(productStartDate);
    } else {
      // Default to beginning of current year if no product start date
      startDate = new Date(currentYear, 0, 1);
    }
    
    // Start from the product start month/year
    let iterDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const endDate = new Date(currentYear, currentMonth, 1);
    
    // Generate all months from product start date to current month
    const allMonths: string[] = [];
    while (iterDate <= endDate) {
      const monthStr = `${iterDate.getFullYear()}-${String(iterDate.getMonth() + 1).padStart(2, '0')}`;
      allMonths.push(monthStr);
      
      // Move to next month
      iterDate.setMonth(iterDate.getMonth() + 1);
    }
    
    // Sort months in ascending order (oldest first)
    const sortedMonths = allMonths.sort();
    setAllAvailableMonths(sortedMonths);
    
    // Start by showing the most recent months (last page)
    const totalPages = Math.ceil(sortedMonths.length / monthsPerPage);
    const lastPageIndex = Math.max(0, totalPages - 1);
    setCurrentMonthPage(lastPageIndex);
  }, [productStartDate, monthsPerPage]);

  // Update displayed months when page changes
  useEffect(() => {
    const startIndex = currentMonthPage * monthsPerPage;
    const endIndex = startIndex + monthsPerPage;
    const pageMonths = allAvailableMonths.slice(startIndex, endIndex);
    setMonths(pageMonths);
  }, [allAvailableMonths, currentMonthPage, monthsPerPage]);
  
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

  // Get fund valuation for a specific fund and month
  const getFundValuation = (fundId: number, month: string): FundValuation | undefined => {
    const [year, monthNum] = month.split('-');
    const monthStart = `${year}-${monthNum}-01`;
    const monthPrefix = `${year}-${monthNum}`;
    
    // Only proceed with find if fundValuations is an array
    const foundValuation = Array.isArray(fundValuations) 
      ? fundValuations.find(valuation => {
          const match = valuation.portfolio_fund_id === fundId && 
                       valuation.valuation_date.startsWith(monthPrefix);
          return match;
        })
      : undefined;
      
    return foundValuation;
  };

  // Add this helper function before the formatMonth function
  const convertActivityTypeForBackend = (uiActivityType: string): string => {
    // Convert UI-friendly activity types to backend format
    switch (uiActivityType) {
      case 'Product Switch In': return 'ProductSwitchIn';
      case 'Product Switch Out': return 'ProductSwitchOut';
      case 'Fund Switch In': return 'FundSwitchIn';
      case 'Fund Switch Out': return 'FundSwitchOut';
      case 'Current Value': return 'Valuation';
      default: return uiActivityType;
    }
  };

  // Format activity type for display - convert camelCase or snake_case to spaces
  const formatActivityType = (activityType: string): string => {
    if (!activityType) return '';
    
    // Handle specific case for Current Value -> Valuation
    if (activityType === 'Current Value') {
      return 'Valuation';
    }
    
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

  // Get activities for a specific fund, month, and activity type
  const getActivity = (fundId: number, month: string, activityType: string): Activity | undefined => {
    // Convert activity types for matching using our helper function
    const matchType = convertActivityTypeForBackend(activityType);
    
    // Use activitiesState instead of activities prop for fresh data
    return activitiesState.find(activity => {
      const date = new Date(activity.activity_timestamp);
      const activityMonthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      return activity.portfolio_fund_id === fundId && 
             activityMonthYear === month && 
             activity.activity_type === matchType;
    });
  };

  // Get the cell value for display
  const getCellValue = (fundId: number, month: string, activityType: string): string => {
    // First check if there's a pending edit for this cell
    const pendingEdit = pendingEdits.find(
      edit => edit.fundId === fundId && 
              edit.month === month && 
              edit.activityType === activityType
    );
    
    if (pendingEdit) {
      return pendingEdit.value;
    }
    
    // For "Current Value" cells, check fund_valuations first
    if (activityType === 'Current Value') {
      const valuation = getFundValuation(fundId, month);
      if (valuation) {
        return valuation.valuation.toString();
      }
      
      // Fallback to activity log if no valuation found
      const activity = getActivity(fundId, month, activityType);
      if (activity && activity.market_value_held) {
        return activity.market_value_held.toString();
      }
      
      return '';
    }
    
    // For other activity types, use activity logs
    const activity = getActivity(fundId, month, activityType);
    if (activity) {
      // For regular activities, return the amount (absolute value for withdrawals and switch out)
      const amount = parseFloat(activity.amount);
      return Math.abs(amount).toString();
    }
    
    return '';
  };

  // New function to evaluate mathematical expressions
  const evaluateExpression = (expression: string): string => {
    // Special case: if expression is "0", we should keep it as "0"
    if (expression === "0") return "0";
    
    // If it's empty or already a valid number, return as is
    if (!expression || expression.trim() === '') return '';
    
    // If it's already a number, just return it
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
          // Handle zero case explicitly
          if (result === 0) return "0";
          
          // Check if the original expression had a decimal point
          const hadDecimalPoint = expression.includes('.');
          
          // Preserve decimal format if the original expression had one
          // or if the result has a fractional part
          if (hadDecimalPoint || result % 1 !== 0) {
            // Format with 2 decimal places if result has a fractional part
            return result % 1 !== 0 ? result.toFixed(2) : result.toFixed(1);
          } else {
            // Return as an integer otherwise
            return result.toFixed(0);
          }
        }
      }
      
      // If no operators or evaluation failed, return the original expression
      return expression;
    } catch (error) {
      // If evaluation fails (syntax error), return the original expression
      console.log('Error evaluating expression:', error);
      return expression;
    }
  };

  // Update the handleCellBlur function to evaluate expressions
  const handleCellBlur = (fundId: number, month: string, activityType: string) => {
    // Find the current edit for this cell
    const cellEditIndex = pendingEdits.findIndex(
      edit => edit.fundId === fundId && 
              edit.month === month && 
              edit.activityType === activityType
    );
    
    // If we have a pending edit for this cell, evaluate any expression
    if (cellEditIndex !== -1) {
      const currentEdit = pendingEdits[cellEditIndex];
      const evaluatedValue = evaluateExpression(currentEdit.value);
      
      // If the value changed after evaluation, update the pending edit
      if (evaluatedValue !== currentEdit.value) {
        const updatedEdits = [...pendingEdits];
        updatedEdits[cellEditIndex] = {
          ...currentEdit,
          value: evaluatedValue
        };
        setPendingEdits(updatedEdits);
      }
    }
    
    // Only show the fund selection modal for Fund Switch In/Out cells with a value
    if ((activityType === 'Fund Switch In' || activityType === 'Fund Switch Out')) {
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
    
    // Get current value to check if this is actually a change
    const currentValue = getCellValue(fundId, month, activityType);
    
    // If the value hasn't actually changed, don't create an edit
    if (sanitizedValue === currentValue) {
      // Remove any existing pending edit for this cell
      setPendingEdits(prev => prev.filter(edit => 
        !(edit.fundId === fundId && edit.month === month && edit.activityType === activityType)
      ));
      return;
    }
    
    // Get existing activity or valuation
    let existingId = undefined;
    if (activityType === 'Current Value') {
      const valuation = getFundValuation(fundId, month);
      existingId = valuation?.id;
    } else {
      const activity = getActivity(fundId, month, activityType);
      existingId = activity?.id;
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
    setPendingEdits(prev => [
      ...prev.filter(edit => 
        !(edit.fundId === fundId && edit.month === month && edit.activityType === activityType)
      ),
      newEdit
    ]);
  };

  // Handle fund selection confirmation
  


  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-GB', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
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

  // NEW: Enhanced save logic that preserves existing data
  const saveChangesWithPreservation = async () => {
    if (pendingEdits.length === 0) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // Group edits by month and fund combination
      const editsByMonthAndFund = groupEditsByMonthAndFund(pendingEdits);
      
      // Process each month-fund combination
      for (const [monthFundKey, monthEdits] of Object.entries(editsByMonthAndFund)) {
        const [month, fundIdStr] = monthFundKey.split('_');
        const fundId = parseInt(fundIdStr);
        
        // Log preservation analysis for debugging
        const activitiesToPreserve = getActivitiesToPreserve(fundId, month, monthEdits);
        console.log(`Month ${month}, Fund ${fundId}: Preserving activities:`, activitiesToPreserve);
        console.log(`Month ${month}, Fund ${fundId}: Processing edits:`, monthEdits.map(e => e.activityType));
      }
      
      // Process the actual edits (existing logic)
      const editsToProcess = pendingEdits.filter(edit => 
        edit.value.trim() !== '' || edit.toDelete
      );

      // Group edits by operation (existing logic)
      const deletions = editsToProcess.filter(edit => edit.toDelete && edit.originalActivityId);
      const creationsAndUpdates = editsToProcess.filter(edit => !edit.toDelete);

      // Process deletions
      for (const edit of deletions) {
        if (edit.activityType === 'Current Value') {
          await api.delete(`fund_valuations/${edit.originalActivityId}`);
        } else {
          await api.delete(`holding_activity_logs/${edit.originalActivityId}`);
        }
      }

      // Process creations and updates
      for (const edit of creationsAndUpdates) {
        if (edit.value.trim() === '') continue;

        if (edit.activityType === 'Current Value') {
          // Handle fund valuations
          const valuationData = {
            portfolio_fund_id: edit.fundId,
            valuation_date: `${edit.month}-01`,
            valuation: parseFloat(edit.value)
          };

          if (edit.isNew) {
            await createFundValuation(valuationData);
          } else if (edit.originalActivityId) {
            await api.patch(`fund_valuations/${edit.originalActivityId}`, valuationData);
          }
        } else {
          // Handle regular activities with uniform structure
          const activityData = {
              portfolio_fund_id: edit.fundId,
              account_holding_id: accountHoldingId,
              activity_type: convertActivityTypeForBackend(edit.activityType),
            activity_timestamp: `${edit.month}-01`,
            amount: edit.value
          };

          if (edit.isNew) {
            await api.post('holding_activity_logs', activityData);
          } else if (edit.originalActivityId) {
            await api.patch(`holding_activity_logs/${edit.originalActivityId}`, activityData);
          }
        }
      }
      
      // Trigger IRR recalculation for affected funds after all edits are saved
      console.log('Triggering IRR recalculation for affected funds...');
      const affectedFundIds = [...new Set(pendingEdits.map(edit => edit.fundId))];
      
      if (portfolioId && affectedFundIds.length > 0) {
        try {
          // Trigger portfolio-level IRR recalculation since activities were updated
          console.log(`Triggering portfolio IRR recalculation for portfolio ${portfolioId}`);
          await calculatePortfolioIRR(portfolioId);
          console.log(`Portfolio IRR recalculation completed for portfolio ${portfolioId}`);
        } catch (irrError) {
          console.warn(`Failed to trigger portfolio IRR recalculation for portfolio ${portfolioId}:`, irrError);
          // Don't fail the entire save operation if IRR recalculation fails
        }
      } else if (!portfolioId) {
        console.warn('Portfolio ID not available for IRR recalculation');
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

  // Get class for cell
  const getCellClass = (fundId: number, month: string, activityType: string, isFirstColumn: boolean = false): string => {
    // Base class for all cells - remove fixed width constraints to allow full width usage
    let baseClass = "px-1 py-0 border box-border w-full";
    
    // Get the fund to check if it's the Previous Funds entry
    const fund = funds.find(f => f.id === fundId);
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
    
    // Check if there's a pending edit for this cell
    const pendingEdit = pendingEdits.find(
      edit => edit.fundId === fundId && 
              edit.month === month && 
              edit.activityType === activityType
    );
    
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
    
    return baseClass;
  };

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

  // Calculate the total for a specific fund and month
  const calculateFundMonthTotal = (fundId: number, month: string): number => {
    // Sum up all non-zero values for each activity type for this fund and month
    // Skip "Current Value" as it's not part of the sum total
    return ACTIVITY_TYPES
      .filter(activityType => activityType !== 'Current Value') // Exclude Current Value from totals
      .reduce((total, activityType) => {
        const cellValue = getCellValue(fundId, month, activityType);
        if (cellValue && !isNaN(parseFloat(cellValue))) {
          // For investments, add positive values
          // For withdrawals and switch outs, subtract (they reduce the total)
                        if (activityType === 'Investment' || 
                  activityType === 'RegularInvestment' || 
                  activityType === 'GovernmentUplift' || 
                  activityType === 'Fund Switch In') {
                return total + parseFloat(cellValue);
              } else if (activityType === 'Withdrawal' || 
                         activityType === 'Fund Switch Out') {
                return total - parseFloat(cellValue);
              }
        }
        return total;
      }, 0);
  };

  // Calculate total for all funds for a specific activity type
  const calculateActivityTypeTotal = (activityType: string, month: string): number => {
    let total = 0;
    
    // Include activities from displayed funds (active funds + Previous Funds virtual entry)
    funds.forEach(fund => {
      const value = getCellValue(fund.id, month, activityType);
      if (value) {
        const numericValue = parseFloat(value.replace(/,/g, ''));
        if (!isNaN(numericValue)) {
                        // Apply correct sign based on activity type
              if (activityType === 'Fund Switch Out' || 
                  activityType === 'Withdrawal') {
                total -= numericValue; // Subtract for outflows
              } else {
                total += numericValue; // Add for inflows
              }
        }
      }
    });
    
    // ALSO include activities from inactive funds (for totals calculation only)
    if (inactiveFundsForTotals && inactiveFundsForTotals.length > 0) {
      console.log(`Including ${inactiveFundsForTotals.length} inactive funds in ${activityType} totals for ${month}`);
      
      inactiveFundsForTotals.forEach(inactiveFund => {
        // Get activities for this inactive fund and month/activity type
        const inactiveFundActivities = activitiesState.filter(activity => 
          activity.portfolio_fund_id === inactiveFund.id &&
          activity.activity_timestamp.startsWith(month) &&
          convertActivityTypeForBackend(activityType) === activity.activity_type
        );
        
        if (inactiveFundActivities.length > 0) {
          console.log(`Found ${inactiveFundActivities.length} ${activityType} activities for inactive fund ${inactiveFund.fund_name} in ${month}`);
        }
        
        // Sum up the activities for this inactive fund
        inactiveFundActivities.forEach(activity => {
          const numericValue = parseFloat(activity.amount);
          if (!isNaN(numericValue)) {
            console.log(`Adding ${numericValue} from inactive fund ${inactiveFund.fund_name} to ${activityType} total for ${month}`);
            // Apply correct sign based on activity type
            if (activityType === 'Fund Switch Out' || 
                activityType === 'Withdrawal') {
              total -= numericValue; // Subtract for outflows
            } else {
              total += numericValue; // Add for inflows
            }
          }
        });
      });
    }
    
    return total;
  };

  // Calculate total for all activity types and all funds for a specific month
  const calculateMonthTotal = (month: string): number => {
    return ACTIVITY_TYPES
      .filter(activityType => activityType !== 'Current Value') // Exclude Current Value from totals
      .reduce((total, activityType) => {
        return total + calculateActivityTypeTotal(activityType, month);
      }, 0);
  };

  // Format cell value for display - more compact for the table view
  const formatCellValue = (value: string): string => {
    // Special case: if value is "0", we should display it
    if (value === "0") return "0";
    
    if (!value || value.trim() === '') return '';
    
    // If it contains math operators, return it as-is for editing
    if (/[+\-*/()]/.test(value)) {
      return value;
    }
    
    // Preserve decimal point and trailing zeros during editing
    // This is important for financial values where the user might want to 
    // explicitly differentiate between e.g., "10" and "10.0"
    if (value.includes('.')) {
      // If the string representation has a decimal point, preserve it exactly as typed
      return value;
    }
    
    // Try to parse as number
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    
    // For non-decimal values, format without decimal places
      return num.toFixed(0);
  };

  // Format the total for display with correct signs
  const formatTotal = (total: number): string => {
    // Format the number without thousands separators to save space
    // Keep 2 decimal places for non-zero decimal parts, otherwise show as integer
    const hasDecimal = total % 1 !== 0;
    const formatted = hasDecimal ? total.toFixed(2) : total.toFixed(0);
    
    // Return without currency symbol
    return formatted;
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

  // Helper function to check if a month has a provider switch
  const getProviderSwitchForMonth = (month: string): ProviderSwitch | undefined => {
    if (!providerSwitches) return undefined;
    
    return providerSwitches.find(ps => {
      const switchDate = new Date(ps.switch_date);
      const switchMonth = `${switchDate.getFullYear()}-${String(switchDate.getMonth() + 1).padStart(2, '0')}`;
      return switchMonth === month;
    });
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
      
      console.log(`Successfully reactivated fund: ${fundName} (ID: ${portfolioFundId})`);
      
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
          activityType,
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

  // Calculate fund total for a specific month (for compact view)
  const calculateFundTotal = (fundId: number, month: string): number => {
    let total = 0;
    
    ACTIVITY_TYPES.forEach(activityType => {
      const cellValue = getCellValue(fundId, month, activityType);
      const numericValue = parseFloat(cellValue) || 0;
      
      if (numericValue !== 0) {
                    if (activityType === 'Withdrawal') {
              total -= numericValue;
            } else if (activityType === 'Fund Switch Out') {
              total -= numericValue;
            } else if (activityType !== 'Current Value') {
              total += numericValue;
            }
      }
    });
    
    return total;
  };

  // Calculate row total for a specific fund and activity across all displayed months
  const calculateRowTotal = (fundId: number, activityType: string): number => {
    let total = 0;

    months.forEach(month => {
      const cellValue = getCellValue(fundId, month, activityType);
      const numericValue = parseFloat(cellValue) || 0;
      
      if (numericValue !== 0) {
        total += numericValue;
      }
    });

    return total;
  };

  // Calculate row total for fund across all activities and months (for compact view)
  const calculateFundRowTotal = (fundId: number): number => {
    let total = 0;

    months.forEach(month => {
      const monthTotal = calculateFundTotal(fundId, month);
      total += monthTotal;
    });

    return total;
  };

  // Navigation functions for month pages
  const goToPreviousMonths = () => {
    setCurrentMonthPage(prev => Math.max(0, prev - 1));
  };

  const goToNextMonths = () => {
    const totalPages = Math.ceil(allAvailableMonths.length / monthsPerPage);
    setCurrentMonthPage(prev => Math.min(totalPages - 1, prev + 1));
  };

  const goToFirstMonths = () => {
    setCurrentMonthPage(0);
  };

  const goToLatestMonths = () => {
    const totalPages = Math.ceil(allAvailableMonths.length / monthsPerPage);
    setCurrentMonthPage(Math.max(0, totalPages - 1));
  };

  const canGoToPrevious = currentMonthPage > 0;
  const canGoToNext = currentMonthPage < Math.ceil(allAvailableMonths.length / monthsPerPage) - 1;
  const totalPages = Math.ceil(allAvailableMonths.length / monthsPerPage);
  const currentPage = currentMonthPage + 1;

  return (
    <>
      <div className="mt-8">
        <div className="flex flex-col gap-3 mb-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <h3 className="text-lg font-semibold text-gray-900">Monthly Activities</h3>
              <button
                onClick={() => setIsCompactView(!isCompactView)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md shadow-sm transition-colors ${
                  isCompactView
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                title={isCompactView ? 'Switch to detailed view' : 'Switch to compact view (totals only)'}
              >
                {isCompactView ? 'Detailed View' : 'Compact View'}
              </button>
            </div>
            
              <button
                onClick={saveChanges}
                disabled={isSubmitting || pendingEdits.length === 0}
                className={`
                  relative px-4 py-2 font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200 ease-in-out
                  ${pendingEdits.length > 0 
                    ? 'bg-orange-500 text-white hover:bg-orange-600 focus:ring-orange-500 transform hover:scale-105 animate-pulse shadow-lg border-2 border-orange-400' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }
                  ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}
                `}
                title={pendingEdits.length > 0 ? `Save ${pendingEdits.length} pending changes` : 'No changes to save'}
              >
                <div className="flex items-center space-x-2">
                  {/* Save icon */}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  
                  <span>
                    {isSubmitting 
                      ? 'Saving...' 
                      : pendingEdits.length > 0 
                        ? `Save Changes` 
                        : 'Save Changes'
                    }
                  </span>
                  
                  {/* Change count badge */}
                  {pendingEdits.length > 0 && !isSubmitting && (
                    <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-orange-100 bg-orange-700 rounded-full animate-bounce">
                      {pendingEdits.length}
                    </span>
                  )}
                  
                  {/* Loading spinner */}
                  {isSubmitting && (
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                </div>
                
                {/* Glowing effect when changes are pending */}
                {pendingEdits.length > 0 && !isSubmitting && (
                  <div className="absolute inset-0 rounded-md bg-orange-400 opacity-20 animate-ping"></div>
                )}
              </button>
            </div>
            
            {/* Month Navigation */}
            {allAvailableMonths.length > monthsPerPage && (
              <div className="flex justify-center">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">
                    Page {currentPage} of {totalPages} ({allAvailableMonths.length} months total)
                  </span>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={goToFirstMonths}
                      disabled={!canGoToPrevious}
                      className="p-1.5 text-gray-500 hover:text-gray-700 disabled:text-gray-300 disabled:cursor-not-allowed"
                      title="Go to first months"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7M21 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <button
                      onClick={goToPreviousMonths}
                      disabled={!canGoToPrevious}
                      className="p-1.5 text-gray-500 hover:text-gray-700 disabled:text-gray-300 disabled:cursor-not-allowed"
                      title="Previous months"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <button
                      onClick={goToNextMonths}
                      disabled={!canGoToNext}
                      className="p-1.5 text-gray-500 hover:text-gray-700 disabled:text-gray-300 disabled:cursor-not-allowed"
                      title="Next months"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                    <button
                      onClick={goToLatestMonths}
                      disabled={!canGoToNext}
                      className="p-1.5 text-gray-500 hover:text-gray-700 disabled:text-gray-300 disabled:cursor-not-allowed"
                      title="Go to latest months"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M3 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 border-l-4 border-red-500 text-red-700">
            <p>{error}</p>
          </div>
        )}
        
        <div 
          ref={tableContainerRef}
          className="overflow-x-auto border rounded-lg shadow-md w-full" 
          style={{ scrollBehavior: 'smooth' }}
        >
          <div className="relative">
            <table 
              ref={tableRef}
              className="w-full divide-y divide-gray-200 table-fixed relative"
            >
              <colgroup>
                <col className="w-[15%] sticky left-0 z-10" />
                <col className="w-[15%] sticky left-0 z-10" />
                {months.map((month, index) => (
                  <col key={`col-${month}`} className={`w-[${60 / months.length}%]`} />
                ))}
                <col className="w-[10%]" />
              </colgroup>
              <thead 
                className="bg-blue-50 shadow-lg"
                style={{
                  position: headerTop !== null ? 'fixed' : 'sticky',
                  top: headerTop !== null ? `${headerTop}px` : 0,
                  left: headerTop !== null ? `${headerLeft}px` : 'auto',
                  width: headerTop !== null ? `${tableWidth}px` : 'auto',
                  zIndex: headerTop !== null ? 100 : 20,
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
                        left: `${columnPositions[0].left}px`,
                        width: `${columnPositions[0].width}px`,
                        height: '24px',
                        display: 'flex',
                        alignItems: 'center'
                      } : {
                        width: 'auto'
                      })
                    }}
                  >
                    Fund
                  </th>
                  <th 
                    className="px-1 py-0 text-left font-medium text-gray-800 sticky top-0 z-30 bg-blue-50 border-b border-gray-300"
                    style={{
                      ...(headerTop !== null && columnPositions[1] ? {
                        position: 'absolute',
                        left: `${columnPositions[1].left}px`,
                        width: `${columnPositions[1].width}px`,
                        height: '24px',
                        display: 'flex',
                        alignItems: 'center'
                      } : {
                        width: 'auto',
                        left: columnPositions[0] ? `${columnPositions[0].width}px` : 'auto'
                      })
                    }}
                  >
                    Activity
                  </th>
                  {months.map((month, index) => {
                    const providerSwitch = getProviderSwitchForMonth(month);
                    const columnIndex = index + 2; // +2 because first two columns are Fund and Activity
                    
                    return (
                      <th 
                        key={month} 
                        className="px-1 py-0 text-center font-medium text-gray-800 whitespace-nowrap bg-blue-50 border-b border-gray-300 relative group sticky top-0 z-20 cursor-pointer hover:bg-blue-100"
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
                            justifyContent: 'center'
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
                    className="px-1 py-0 text-center font-medium text-gray-800 whitespace-nowrap bg-blue-50 border-b border-gray-300 sticky top-0 z-20"
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
                    <th 
                      className="px-1 py-0"
                      style={{
                        width: columnPositions[1] ? `${columnPositions[1].width}px` : 'auto'
                      }}
                    ></th>
                    {months.map((month, index) => {
                      const columnIndex = index + 2;
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
                {isCompactView ? (
                  // Compact view - only show fund totals
                  (() => {
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
                  
                  return fundsToDisplay.map(fund => (
                      <tr key={`compact-${fund.id}${fund.isInactiveBreakdown ? '-breakdown' : ''}`} 
                          className={`${
                        fund.isActive === false 
                          ? fund.isInactiveBreakdown 
                            ? 'bg-gray-50 border-t border-dashed border-gray-300' 
                            : 'bg-gray-100 border-t border-gray-300'
                              : 'bg-white border-t border-gray-200'
                      }`}>
                        {/* Fund name column */}
                        <td className={`px-1 py-0 font-semibold ${
                          fund.isActive === false 
                            ? fund.isInactiveBreakdown 
                              ? 'text-gray-600 pl-4' 
                              : 'text-blue-800' 
                            : 'text-gray-900'
                        } sticky left-0 z-10 ${
                          fund.isActive === false 
                            ? fund.isInactiveBreakdown ? 'bg-gray-50' : 'bg-gray-100' 
                            : 'bg-white'
                        }`}>
                          <div className="flex items-center justify-between">
                            <div>
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
                                title={showInactiveFunds ? "Hide inactive funds" : "Show inactive funds breakdown"}
                              >
                                {showInactiveFunds ? "Hide" : "Show"} Breakdown
                              </button>
                            )}
                            {fund.isInactiveBreakdown && (
                              <button
                                onClick={() => reactivateFund(fund.id, fund.fund_name)}
                                disabled={reactivatingFunds.has(fund.id)}
                                className="ml-2 px-2 py-1 text-xs bg-green-50 hover:bg-green-100 text-green-700 rounded border border-green-300 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Reactivate this fund"
                              >
                                {reactivatingFunds.has(fund.id) ? 'Reactivating...' : 'Reactivate'}
                              </button>
                            )}
                          </div>
                      </td>
                        
                        {/* Activity column - shows "Total Activities" */}
                        <td className={`px-1 py-0 font-medium text-red-600 sticky left-0 z-10 ${
                            fund.isActive === false 
                              ? fund.isInactiveBreakdown ? 'bg-gray-50' : 'bg-gray-100' 
                            : 'bg-white'
                        }`}>
                          {fund.isInactiveBreakdown && 
                            <span className="text-gray-400 mr-2">→</span>
                          }
                          Total Activities
                        </td>
                        
                        {/* Month data columns */}
                        {months.map(month => {
                          const total = calculateFundTotal(fund.id, month);
                          return (
                            <td key={`compact-${fund.id}-${month}`} 
                                className={`px-1 py-0 text-center text-sm font-medium ${
                                  fund.isActive === false 
                                    ? fund.isInactiveBreakdown ? 'bg-gray-50' : 'bg-gray-100' 
                                    : 'bg-white'
                                } ${
                                  total > 0 ? 'text-green-700' : 
                                  total < 0 ? 'text-red-700' : 
                                  'text-gray-500'
                                }`}>
                              {total !== 0 ? formatCurrency(total) : ''}
                            </td>
                          );
                        })}
                        
                        {/* Row Total column for compact view */}
                        <td className={`px-1 py-0 text-center text-sm font-bold border-l border-gray-300 ${
                          fund.isActive === false 
                            ? fund.isInactiveBreakdown ? 'bg-gray-50' : 'bg-gray-100' 
                            : 'bg-white'
                        }`}>
                          {(() => {
                            const rowTotal = calculateFundRowTotal(fund.id);
                            return (
                              <span className={
                                rowTotal > 0 ? 'text-green-700' : 
                                rowTotal < 0 ? 'text-red-700' : 
                                'text-gray-500'
                              }>
                                {rowTotal !== 0 ? formatCurrency(rowTotal) : ''}
                              </span>
                            );
                          })()}
                        </td>
                    </tr>
                    ));
                  })()
                ) : (
                  // Detailed view - each fund+activity combination as separate row
                  (() => {
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
                      ACTIVITY_TYPES.forEach((activityType, activityIndex) => {
                        const isFirstActivity = activityIndex === 0;
                        
                        rows.push(
                        <tr key={`${fund.id}-${activityType}${fund.isInactiveBreakdown ? '-breakdown' : ''}`} 
                              className={`${fund.isInactiveBreakdown ? 'bg-gray-50' : 'bg-white'} border-t border-gray-100`}>
                            {/* Fund name column - only show on first activity row */}
                            <td className={`px-1 py-0 ${
                              fund.isActive === false 
                                ? fund.isInactiveBreakdown 
                                  ? 'text-gray-600' 
                                  : 'text-blue-800' 
                                : 'text-gray-900'
                            } sticky left-0 z-10 ${
                              fund.isActive === false 
                                ? fund.isInactiveBreakdown ? 'bg-gray-50' : 'bg-gray-100' 
                                : 'bg-white'
                            } ${isFirstActivity ? 'font-semibold border-t border-gray-200' : ''}`}>
                              {isFirstActivity && (
                                <div className="flex items-center justify-between">
                                  <div>
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
                                </div>
                              )}
                            </td>
                            
                            {/* Activity type column */}
                            <td className={`px-1 py-0 font-medium text-gray-500 sticky left-0 z-10 ${
                              fund.isActive === false 
                                ? fund.isInactiveBreakdown ? 'bg-gray-50' : 'bg-gray-100' 
                                : 'bg-white'
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
                                }`}
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
                                    className={`focus:outline-none bg-transparent text-center border-0 shadow-none w-auto min-w-0 ${!fund.isActive || fund.isInactiveBreakdown ? 'text-gray-500 cursor-not-allowed' : ''}`}
                                    value={formatCellValue(cellValue)}
                                    disabled={isSubmitting || fund.isActive === false || fund.isInactiveBreakdown}
                                    onChange={(e) => {
                                      if (fund.isActive !== false && !fund.isInactiveBreakdown) {
                                        const value = e.target.value;
                                        if (value.includes('.')) {
                                          const parts = value.split('.');
                                          if (parts[1] && parts[1].length > 2) {
                                            return;
                                          }
                                        }
                                        handleCellValueChangeEnhanced(fund.id, month, activityType, value);
                                        e.target.style.width = (value.length + 1) + 'ch';
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
                                    width: '100%',
                                    fontSize: '0.875rem',
                                    opacity: fund.isActive === false || fund.isInactiveBreakdown ? 0.7 : 1
                                  }}
                                  inputMode="text"
                                />
                              </div>
                            </td>
                          );
                        })}
                        
                        {/* Row Total column for detailed view */}
                        <td className={`px-1 py-0 text-center text-sm font-bold border-l border-gray-300 ${
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
                                {rowTotal !== 0 ? formatCurrency(rowTotal) : ''}
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
                            <td className="px-1 py-0 font-semibold text-red-600 sticky left-0 z-10 bg-gray-100">
                              {/* Empty for fund name */}
                            </td>
                            <td className="px-1 py-0 font-semibold text-red-600 sticky left-0 z-10 bg-gray-100">
                        Total
                      </td>
                      {months.map(month => {
                        const total = calculateFundMonthTotal(fund.id, month);
                        const formattedTotal = formatTotal(total);
                        
                        return (
                          <td 
                                  key={`total-${fund.id}-${month}`} 
                                  className="px-1 py-0 text-center font-semibold text-red-600"
                          >
                            {formattedTotal}
                          </td>
                        );
                      })}
                      
                      {/* Row Total column for fund total row */}
                      <td className="px-1 py-0 text-center font-semibold text-red-600 border-l border-gray-300 bg-gray-100">
                        {(() => {
                          const rowTotal = calculateFundRowTotal(fund.id);
                          return formatTotal(rowTotal);
                        })()}
                      </td>
                    </tr>
                        );
                      }
                    });
                    
                    return rows;
                  })()
                )}

                {/* Grand totals section - totals by activity type across all funds */}
                <tr className="bg-gray-50 border-t-2 border-gray-300 font-semibold">
                  <td className="px-1 py-0 text-gray-900 sticky left-0 z-10 bg-gray-50">
                    {/* Empty for fund column */}
                  </td>
                  <td className="px-1 py-0 text-gray-900 sticky left-0 z-10 bg-gray-50">
                    Monthly Totals
                  </td>
                  {months.map(month => (
                    <td key={`totals-header-${month}`} className="px-1 py-0 text-center"></td>
                  ))}
                  <td className="px-1 py-0 text-center border-l border-gray-300 bg-gray-50"></td>
                </tr>

                {/* Activity type total rows */}
                {ACTIVITY_TYPES
                  .filter(activityType => activityType !== 'Current Value') // Exclude Current Value from totals
                  .map(activityType => (
                    <tr key={`totals-${activityType}`} className="bg-white border-t border-gray-200">
                      <td className="px-1 py-0 font-medium text-gray-500 sticky left-0 z-10 bg-white">
                        {/* Empty for fund column */}
                      </td>
                      <td className="px-1 py-0 font-medium text-gray-500 sticky left-0 z-10 bg-white">
                        {formatActivityType(activityType)}
                      </td>
                      {months.map((month, monthIndex) => {
                        const total = calculateActivityTypeTotal(activityType, month);
                        const formattedTotal = formatTotal(total);
                        
                        return (
                          <td 
                            key={`totals-${activityType}-${month}`}
                            id={`totals-cell-${activityType}-${month}`}
                            className="px-1 py-0 text-center focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 focus:bg-blue-50 focus:z-20 relative"
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
                      
                      {/* Row Total column for activity type totals */}
                      <td className="px-1 py-0 text-center font-medium text-gray-500 border-l border-gray-300 bg-white">
                        {(() => {
                          let activityRowTotal = 0;
                          months.forEach(month => {
                            const monthTotal = calculateActivityTypeTotal(activityType, month);
                            activityRowTotal += monthTotal;
                          });
                          return formatTotal(activityRowTotal);
                        })()}
                      </td>
                    </tr>
                  ))}

                {/* Valuation total row */}
                <tr className="bg-blue-50 border-t border-blue-200">
                  <td className="px-1 py-0 font-medium text-blue-700 sticky left-0 z-10 bg-blue-50">
                    {/* Empty for fund column */}
                  </td>
                  <td className="px-1 py-0 font-medium text-blue-700 sticky left-0 z-10 bg-blue-50">
                    Total Valuation
                  </td>
                  {months.map((month, monthIndex) => {
                    const total = calculateActivityTypeTotal('Current Value', month);
                    const formattedTotal = formatTotal(total);
                    
                    return (
                      <td 
                        key={`totals-valuation-${month}`}
                        id={`totals-cell-Total Valuation-${month}`}
                        className="px-1 py-0 text-center font-medium text-blue-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-600 focus:bg-blue-100 focus:z-20 relative"
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
                  
                  {/* Row Total column for valuation total */}
                  <td className="px-1 py-0 text-center font-medium text-blue-700 border-l border-gray-300 bg-blue-50">
                    {(() => {
                      let valuationRowTotal = 0;
                      months.forEach(month => {
                        const monthTotal = calculateActivityTypeTotal('Current Value', month);
                        valuationRowTotal += monthTotal;
                      });
                      return formatTotal(valuationRowTotal);
                    })()}
                  </td>
                </tr>

                {/* Grand total row */}
                <tr className="bg-gray-100 border-t border-gray-200">
                  <td className="px-1 py-0 font-semibold text-red-600 sticky left-0 z-10 bg-gray-100">
                    {/* Empty for fund column */}
                  </td>
                  <td className="px-1 py-0 font-semibold text-red-600 sticky left-0 z-10 bg-gray-100">
                    Overall Total
                  </td>
                  {months.map((month, monthIndex) => {
                    const total = calculateMonthTotal(month);
                    const formattedTotal = formatTotal(total);
                    
                    return (
                      <td 
                        key={`grand-total-${month}`}
                        id={`totals-cell-Overall Total-${month}`}
                        className="px-1 py-0 text-center font-semibold text-red-600 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 focus:bg-blue-50 focus:z-20 relative"
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
                  
                  {/* Row Total column for grand total */}
                  <td className="px-1 py-0 text-center font-semibold text-red-600 border-l border-gray-300 bg-gray-100">
                    {(() => {
                      let grandRowTotal = 0;
                      months.forEach(month => {
                        const monthTotal = calculateMonthTotal(month);
                        grandRowTotal += monthTotal;
                      });
                      return formatTotal(grandRowTotal);
                    })()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Bottom Pagination Controls */}
        {allAvailableMonths.length > monthsPerPage && (
          <div className="flex justify-center mt-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">
                Page {currentPage} of {totalPages} ({allAvailableMonths.length} months total)
              </span>
              <div className="flex items-center space-x-1">
                <button
                  onClick={goToFirstMonths}
                  disabled={!canGoToPrevious}
                  className="p-1.5 text-gray-500 hover:text-gray-700 disabled:text-gray-300 disabled:cursor-not-allowed"
                  title="Go to first months"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7M21 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={goToPreviousMonths}
                  disabled={!canGoToPrevious}
                  className="p-1.5 text-gray-500 hover:text-gray-700 disabled:text-gray-300 disabled:cursor-not-allowed"
                  title="Previous months"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  onClick={goToNextMonths}
                  disabled={!canGoToNext}
                  className="p-1.5 text-gray-500 hover:text-gray-700 disabled:text-gray-300 disabled:cursor-not-allowed"
                  title="Next months"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                <button
                  onClick={goToLatestMonths}
                  disabled={!canGoToNext}
                  className="p-1.5 text-gray-500 hover:text-gray-700 disabled:text-gray-300 disabled:cursor-not-allowed"
                  title="Go to latest months"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M3 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}
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