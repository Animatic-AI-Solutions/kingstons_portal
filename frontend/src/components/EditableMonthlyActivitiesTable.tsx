import React, { useState, useEffect, useMemo, useRef } from 'react';
import { formatCurrency } from '../utils/formatters';
import api, { createFundValuation } from '../services/api';
import SwitchFundSelectionModal from './SwitchFundSelectionModal';
import SwitchTooltip from './SwitchTooltip';
import MultiDestinationSwitchModal from './MultiDestinationSwitchModal';
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
  target_portfolio_fund_id?: number;
  related_fund?: number;
  switch_group_id?: string;
}

interface Fund {
  id: number;
  fund_name: string;
  holding_id: number;
  irr?: number;
  start_date?: string;
  isActive?: boolean;
  inactiveHoldingIds?: any[]; // Updated to handle objects instead of just IDs
  isInactiveBreakdown?: boolean;
}

interface CellEdit {
  fundId: number;
  month: string;
  activityType: string;
  value: string;
  isNew: boolean;
  originalActivityId?: number;
  targetFundId?: number;
  linkedFundId?: number;
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
  activities: Activity[];
  accountHoldingId: number;
  onActivitiesUpdated: () => void;
  selectedYear?: number;
  allFunds?: any[]; // Add property to receive the full list of all funds
  providerSwitches?: ProviderSwitch[]; // Add provider switches prop
}

interface FundValuation {
  id: number;
  portfolio_fund_id: number;
  valuation_date: string;
  value: number;
  created_at: string;
}

interface SwitchSelectionData {
  originFundId: number;
  destinationFundId: number;
  month: string;
  amount: number;
  isEditingOrigin: boolean;
}

interface SwitchDestination {
  fundId: number;
  fundName: string;
  amount: number;
  isSelected: boolean;
}

interface SwitchGroup {
  id: string;
  sourceAmount: number;
  sourceFundId: number;
  sourceFundName: string;
  destinations: SwitchDestination[];
  month: string;
  colorIndex: number;
}

const ACTIVITY_TYPES = [
  'Investment',
  'RegularInvestment',
  'GovernmentUplift',
  'Fund Switch In',
  'Fund Switch Out',
  'Withdrawal',
  'RegularWithdrawal',
  'Current Value'
];

const EditableMonthlyActivitiesTable: React.FC<EditableMonthlyActivitiesTableProps> = ({
  funds,
  activities,
  accountHoldingId,
  onActivitiesUpdated,
  selectedYear,
  allFunds = [], // Default to empty array
  providerSwitches = [] // Default to empty array
}) => {
  const [months, setMonths] = useState<string[]>([]);
  const [pendingEdits, setPendingEdits] = useState<CellEdit[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fundValuations, setFundValuations] = useState<FundValuation[]>([]);
  const [isLoadingValuations, setIsLoadingValuations] = useState(false);
  const [showSwitchFundModal, setShowSwitchFundModal] = useState(false);
  const [switchSelectionData, setSwitchSelectionData] = useState<SwitchSelectionData | null>(null);
  const [activitiesState, setActivities] = useState<Activity[]>(activities);
  const [showInactiveFunds, setShowInactiveFunds] = useState(false);
  
  // Add state to track the currently focused cell
  const [focusedCell, setFocusedCell] = useState<{ fundId: number, activityType: string, monthIndex: number } | null>(null);
  
  // Add state for reactivation loading
  const [reactivatingFunds, setReactivatingFunds] = useState<Set<number>>(new Set());
  
  // New state for enhanced switch functionality
  const [switchGroups, setSwitchGroups] = useState<SwitchGroup[]>([]);
  const [showMultiDestinationModal, setShowMultiDestinationModal] = useState(false);
  const [multiDestinationData, setMultiDestinationData] = useState<{
    sourceFund: Fund;
    totalAmount: number;
    month: string;
    existingGroup?: SwitchGroup;
  } | null>(null);
  
  // Add state to track selected switch cell for showing delete button
  const [selectedSwitchCell, setSelectedSwitchCell] = useState<{
    fundId: number;
    month: string;
    activityType: string;
  } | null>(null);
  
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
  
  // Memoize available funds to prevent infinite loops in modal
  const availableFundsForSwitch = useMemo(() => {
    if (!multiDestinationData) return [];
    return funds.filter(f => f.id !== multiDestinationData.sourceFund.id);
  }, [funds, multiDestinationData?.sourceFund?.id]);
  
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

  // Build switch groups from activities and pending edits
  const buildSwitchGroups = (): SwitchGroup[] => {
    const groups: { [key: string]: SwitchGroup } = {};
    let colorIndex = 0;

    // Process existing activities
    activities.forEach(activity => {
      if ((activity.activity_type === 'SwitchOut' || activity.activity_type === 'SwitchIn') && 
          activity.related_fund && activity.switch_group_id) {
        
        const date = new Date(activity.activity_timestamp);
        const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!groups[activity.switch_group_id]) {
          const sourceFund = funds.find(f => f.id === (activity.activity_type === 'SwitchOut' ? activity.portfolio_fund_id : activity.related_fund));
          groups[activity.switch_group_id] = {
            id: activity.switch_group_id,
            sourceAmount: 0,
            sourceFundId: activity.activity_type === 'SwitchOut' ? activity.portfolio_fund_id : activity.related_fund,
            sourceFundName: sourceFund?.fund_name || 'Unknown Fund',
            destinations: [],
            month,
            colorIndex: colorIndex++
          };
        }

        const group = groups[activity.switch_group_id];
        const amount = Math.abs(parseFloat(activity.amount));

        if (activity.activity_type === 'SwitchOut') {
          group.sourceAmount = amount;
        } else if (activity.activity_type === 'SwitchIn') {
          const destFund = funds.find(f => f.id === activity.portfolio_fund_id);
          const existingDest = group.destinations.find(d => d.fundId === activity.portfolio_fund_id);
          
          if (!existingDest && destFund) {
            group.destinations.push({
              fundId: activity.portfolio_fund_id,
              fundName: destFund.fund_name,
              amount,
              isSelected: true
            });
          }
        }
      }
    });

    // Process pending edits
    pendingEdits.forEach(edit => {
      if ((edit.activityType === 'Fund Switch Out' || edit.activityType === 'Fund Switch In') && 
          edit.linkedFundId && edit.value && edit.value.trim() !== '') {
        
        // Create a temporary group ID for pending edits
        const tempGroupId = `temp-${edit.fundId}-${edit.linkedFundId}-${edit.month}`;
        
        if (!groups[tempGroupId]) {
          const sourceFundId = edit.activityType === 'Fund Switch Out' ? edit.fundId : edit.linkedFundId;
          const sourceFund = funds.find(f => f.id === sourceFundId);
          
          groups[tempGroupId] = {
            id: tempGroupId,
            sourceAmount: 0,
            sourceFundId,
            sourceFundName: sourceFund?.fund_name || 'Unknown Fund',
            destinations: [],
            month: edit.month,
            colorIndex: colorIndex++
          };
        }

        const group = groups[tempGroupId];
        const amount = parseFloat(edit.value);

        if (edit.activityType === 'Fund Switch Out') {
          group.sourceAmount = amount;
        } else if (edit.activityType === 'Fund Switch In') {
          const destFund = funds.find(f => f.id === edit.fundId);
          const existingDest = group.destinations.find(d => d.fundId === edit.fundId);
          
          if (!existingDest && destFund) {
            group.destinations.push({
              fundId: edit.fundId,
              fundName: destFund.fund_name,
              amount,
              isSelected: true
            });
          }
        }
      }
    });

    return Object.values(groups);
  };

  // Update switch groups when activities or pending edits change
  useEffect(() => {
    setSwitchGroups(buildSwitchGroups());
  }, [activities, pendingEdits, funds]);

  // Find switch group for a specific cell
  const getSwitchGroupForCell = (fundId: number, month: string, activityType: string): SwitchGroup | null => {
    return switchGroups.find(group => {
      if (group.month !== month) return false;
      
      if (activityType === 'Fund Switch Out' && group.sourceFundId === fundId) {
        return true;
      }
      
      if (activityType === 'Fund Switch In' && group.destinations.some(d => d.fundId === fundId)) {
        return true;
      }
      
      return false;
    }) || null;
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
    // Add onActivitiesUpdated to dependency array to refresh when data changes
  }, [onActivitiesUpdated]);

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

  // Add click handler to deselect switch cells when clicking elsewhere
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // Check if the click was outside any switch cell
      const target = e.target as HTMLElement;
      if (!target.closest('[data-switch-cell]')) {
        setSelectedSwitchCell(null);
      }
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

  // Initialize months based solely on the selected year
  useEffect(() => {
    // The months are sorted in ascending order (January to December)
    const uniqueMonths = new Set<string>();
    
    // Get current date for comparison
    const now = new Date();
    const currentYear = now.getFullYear();
    
    // Use selectedYear if provided, otherwise use current year
    const yearToUse = selectedYear || currentYear;
    
    // Always start from January
    const startMonth = 0;
    // End at current month for current year, or December for past years
    const endMonth = yearToUse === currentYear ? now.getMonth() : 11; // 0-11 for Jan-Dec
    
    // Generate all months from January to either December or current month
    for (let month = startMonth; month <= endMonth; month++) {
      const monthStr = `${yearToUse}-${String(month + 1).padStart(2, '0')}`;
      uniqueMonths.add(monthStr);
    }
    
    // Sort months in ascending order (oldest first)
    const sortedMonths = Array.from(uniqueMonths).sort();
    setMonths(sortedMonths);
  }, [selectedYear]);
  
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
      case 'Fund Switch In': return 'SwitchIn';
      case 'Fund Switch Out': return 'SwitchOut';
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
    
    return activities.find(activity => {
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
        return valuation.value.toString();
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
      
      if (valueChanged && activityType === 'Fund Switch Out') {
        // For Fund Switch Out, show the multi-destination modal
        const sourceFund = funds.find(f => f.id === fundId);
        if (sourceFund) {
          const existingGroup = getSwitchGroupForCell(fundId, month, activityType);
          
          setMultiDestinationData({
            sourceFund,
            totalAmount: parseFloat(cellEdit.value),
            month,
            existingGroup: existingGroup || undefined
          });
          setShowMultiDestinationModal(true);
        }
      } else if (valueChanged && activityType === 'Fund Switch In') {
        // For Fund Switch In, still use the old modal for now (or we could disable this)
        // This case is less common since users typically start with Switch Out
        setSwitchSelectionData({
          originFundId: 0,
          destinationFundId: fundId,
          month,
          amount: parseFloat(cellEdit.value),
          isEditingOrigin: false
        });
        setShowSwitchFundModal(true);
      }
    }
  };

  // Update the handleCellValueChange function to allow mathematical operators
  const handleCellValueChange = (fundId: number, month: string, activityType: string, value: string) => {
    // Find the fund to check if it's the Previous Funds entry
    const fund = funds.find(f => f.id === fundId);
    
    // Don't allow edits to Previous Funds cells
    if (fund && fund.isActive === false) {
      return;
    }

    // Allow necessary characters for math expressions and ensure zeros are handled correctly
    const sanitizedValue = value === "0" ? "0" : (value.trim() === '' ? '' : value);
    
    // Get existing activity or valuation
    let existingId = undefined;
    if (activityType === 'Current Value') {
      // For Current Value, check if a valuation exists
      const valuation = getFundValuation(fundId, month);
      existingId = valuation?.id;
    } else {
      // For regular activities, get the activity ID
      const activity = getActivity(fundId, month, activityType);
      existingId = activity?.id;
    }
    
    // Check for existing pending edit
    const existingEditIndex = pendingEdits.findIndex(
      edit => edit.fundId === fundId && edit.month === month && edit.activityType === activityType
    );
    
    // If there's an existing edit, update it
    if (existingEditIndex !== -1) {
      const newEdits = [...pendingEdits];
    
      // If the value is empty and the original existed, mark for deletion
      if (sanitizedValue === '' && existingId) {
        newEdits[existingEditIndex] = {
          ...newEdits[existingEditIndex],
          value: sanitizedValue,
          toDelete: true
        };
      } else if (sanitizedValue === '' && !existingId) {
        // If the value is empty and there was no original, remove the edit
        newEdits.splice(existingEditIndex, 1);
      } else {
        // Otherwise update the value
        newEdits[existingEditIndex] = {
          ...newEdits[existingEditIndex],
          value: sanitizedValue,
          toDelete: false
        };
      }
      
      setPendingEdits(newEdits);
    }
    // If there's no existing edit and the value differs from the current value
    else if (sanitizedValue !== getCellValue(fundId, month, activityType)) {
      const newEdit: CellEdit = {
        fundId,
        month,
        activityType,
        value: sanitizedValue,
        isNew: !existingId,
        originalActivityId: existingId,
        toDelete: sanitizedValue === '' && !!existingId
      };
      
      setPendingEdits([...pendingEdits, newEdit]);
    }
  };

  // Handle fund selection confirmation
  const handleFundSelectionConfirm = (selectedFundId: number) => {
    if (!switchSelectionData) return;
    
    // Update the state based on which side of the switch we're editing
    if (switchSelectionData.isEditingOrigin) {
      // We were editing a switch-out, so now add a switch-in for the selected fund
      const destinationFundId = selectedFundId;
      const originFundId = switchSelectionData.originFundId;
      
      // Add/update switch-in for the selected destination fund
      const switchInEdit: CellEdit = {
        fundId: destinationFundId,
        month: switchSelectionData.month,
        activityType: 'Fund Switch In',
        value: switchSelectionData.amount.toString(),
        isNew: true,
        originalActivityId: undefined,
        linkedFundId: originFundId // Store the linked fund ID
      };
      
      // Update the switch-out edit to include the linked fund
      const switchOutIndex = pendingEdits.findIndex(
        edit => edit.fundId === originFundId && 
                edit.month === switchSelectionData.month && 
                edit.activityType === 'Fund Switch Out'
      );
      
      if (switchOutIndex !== -1) {
        const updatedEdits = [...pendingEdits];
        updatedEdits[switchOutIndex] = {
          ...updatedEdits[switchOutIndex],
          linkedFundId: destinationFundId
        };
        
        // Add the switch-in edit if it doesn't exist
        const switchInIndex = pendingEdits.findIndex(
          edit => edit.fundId === destinationFundId && 
                  edit.month === switchSelectionData.month && 
                  edit.activityType === 'Fund Switch In'
        );
        
        if (switchInIndex === -1) {
          updatedEdits.push(switchInEdit);
        } else {
          updatedEdits[switchInIndex] = switchInEdit;
        }
        
        setPendingEdits(updatedEdits);
      }
    } else {
      // We were editing a switch-in, so now add a switch-out for the selected fund
      const originFundId = selectedFundId;
      const destinationFundId = switchSelectionData.destinationFundId;
      
      // Add/update switch-out for the selected origin fund
      const switchOutEdit: CellEdit = {
        fundId: originFundId,
        month: switchSelectionData.month,
        activityType: 'Fund Switch Out',
        value: switchSelectionData.amount.toString(),
        isNew: true,
        originalActivityId: undefined,
        linkedFundId: destinationFundId // Store the linked fund ID
      };
      
      // Update the switch-in edit to include the linked fund
      const switchInIndex = pendingEdits.findIndex(
        edit => edit.fundId === destinationFundId && 
                edit.month === switchSelectionData.month && 
                edit.activityType === 'Fund Switch In'
      );
      
      if (switchInIndex !== -1) {
        const updatedEdits = [...pendingEdits];
        updatedEdits[switchInIndex] = {
          ...updatedEdits[switchInIndex],
          linkedFundId: originFundId
        };
        
        // Add the switch-out edit if it doesn't exist
        const switchOutIndex = pendingEdits.findIndex(
          edit => edit.fundId === originFundId && 
                  edit.month === switchSelectionData.month && 
                  edit.activityType === 'Fund Switch Out'
        );
        
        if (switchOutIndex === -1) {
          updatedEdits.push(switchOutEdit);
        } else {
          updatedEdits[switchOutIndex] = switchOutEdit;
        }
        
        setPendingEdits(updatedEdits);
      }
    }
    
    // Close the modal
    setShowSwitchFundModal(false);
    setSwitchSelectionData(null);
  };

  // Handle multi-destination switch confirmation
  const handleMultiDestinationConfirm = (destinations: SwitchDestination[], sourceAmount: number) => {
    if (!multiDestinationData) return;

    const { sourceFund, month, existingGroup } = multiDestinationData;

    // Handle deletion case (empty destinations array)
    if (destinations.length === 0 || sourceAmount === 0) {
      // Clear all pending edits for this switch group
      const filteredEdits = pendingEdits.filter(edit => {
        if (edit.month !== month) return true;
        
        // Remove existing switch out from source fund
        if (edit.activityType === 'Fund Switch Out' && edit.fundId === sourceFund.id) {
          return false;
        }
        
        // Remove existing switch ins from any destinations
        if (edit.activityType === 'Fund Switch In' && existingGroup?.destinations.some(d => d.fundId === edit.fundId)) {
          return false;
        }
        
        return true;
      });

      // Mark existing activities for deletion
      if (existingGroup) {
        const existingActivities = activities.filter(a => a.switch_group_id === existingGroup.id);
        const deletionEdits: CellEdit[] = existingActivities.map(activity => ({
          fundId: activity.portfolio_fund_id,
          month,
          activityType: activity.activity_type === 'SwitchOut' ? 'Fund Switch Out' : 'Fund Switch In',
          value: '',
          isNew: false,
          originalActivityId: activity.id,
          toDelete: true
        }));
        filteredEdits.push(...deletionEdits);
      }

      setPendingEdits(filteredEdits);
      setShowMultiDestinationModal(false);
      setMultiDestinationData(null);
      return;
    }

    // Normal update case
    const groupId = existingGroup?.id || `switch-${sourceFund.id}-${month}-${Date.now()}`;

    // Clear existing pending edits for this switch group
    const filteredEdits = pendingEdits.filter(edit => {
      if (edit.month !== month) return true;
      
      // Remove existing switch out from source fund
      if (edit.activityType === 'Fund Switch Out' && edit.fundId === sourceFund.id) {
        return false;
      }
      
      // Remove existing switch ins to any of the new destinations
      if (edit.activityType === 'Fund Switch In' && 
          destinations.some(d => d.fundId === edit.fundId)) {
        return false;
      }
      
      return true;
    });

    // If editing existing group, mark old activities for deletion
    if (existingGroup) {
      const existingActivities = activities.filter(a => a.switch_group_id === existingGroup.id);
      const deletionEdits: CellEdit[] = existingActivities.map(activity => ({
        fundId: activity.portfolio_fund_id,
        month,
        activityType: activity.activity_type === 'SwitchOut' ? 'Fund Switch Out' : 'Fund Switch In',
        value: '',
        isNew: false,
        originalActivityId: activity.id,
        toDelete: true
      }));
      filteredEdits.push(...deletionEdits);
    }

    // Use the sourceAmount from the modal instead of calculating from destinations
    const totalAmount = sourceAmount;

    // Add switch out from source fund
    const switchOutEdit: CellEdit = {
      fundId: sourceFund.id,
      month,
      activityType: 'Fund Switch Out',
      value: totalAmount.toString(),
      isNew: true,
      linkedFundId: destinations[0]?.fundId // Link to first destination
    };

    // Add switch ins to destination funds
    const switchInEdits: CellEdit[] = destinations.map(dest => ({
      fundId: dest.fundId,
      month,
      activityType: 'Fund Switch In',
      value: dest.amount.toString(),
      isNew: true,
      linkedFundId: sourceFund.id
    }));

    setPendingEdits([...filteredEdits, switchOutEdit, ...switchInEdits]);
    setShowMultiDestinationModal(false);
    setMultiDestinationData(null);
  };

  // Function to clear/delete a switch group
  const clearSwitchGroup = (switchGroup: SwitchGroup) => {
    if (!confirm(`Are you sure you want to delete this fund switch?\n\nFrom: ${switchGroup.sourceFundName}\nTo: ${switchGroup.destinations.map(d => d.fundName).join(', ')}\nTotal Amount: ${formatCurrency(switchGroup.sourceAmount)}`)) {
      return;
    }

    // Remove all pending edits for this switch group (both switch out and switch in)
    const newPendingEdits = pendingEdits.filter(edit => {
      // Remove the switch out edit from source fund
      if (edit.activityType === 'Fund Switch Out' && 
          edit.fundId === switchGroup.sourceFundId && 
          edit.month === switchGroup.month) {
        return false;
      }
      // Remove all switch in edits from destination funds
      if (edit.activityType === 'Fund Switch In' && 
          edit.month === switchGroup.month &&
          switchGroup.destinations.some(d => d.fundId === edit.fundId)) {
        return false;
      }
      return true;
    });

    // Mark ALL existing activities in the switch group for deletion
    const switchGroupActivities = activities.filter(activity => 
      activity.switch_group_id === switchGroup.id ||
      // Also catch activities that might not have switch_group_id but are part of this switch
      (activity.activity_type === 'SwitchOut' && 
       activity.portfolio_fund_id === switchGroup.sourceFundId &&
       activity.activity_timestamp.startsWith(switchGroup.month)) ||
      (activity.activity_type === 'SwitchIn' && 
       switchGroup.destinations.some(d => d.fundId === activity.portfolio_fund_id) &&
       activity.activity_timestamp.startsWith(switchGroup.month))
    );

    const deletionEdits: CellEdit[] = switchGroupActivities.map(activity => {
      const date = new Date(activity.activity_timestamp);
      const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      return {
        fundId: activity.portfolio_fund_id,
        month,
        activityType: activity.activity_type === 'SwitchOut' ? 'Fund Switch Out' : 'Fund Switch In',
        value: '',
        isNew: false,
        originalActivityId: activity.id,
        toDelete: true
      };
    });

    // Also add deletions for any destination fund switch-ins that might exist as pending edits
    const additionalDeletions: CellEdit[] = [];
    switchGroup.destinations.forEach(dest => {
      // Check if there's an existing activity for this destination that we haven't marked for deletion
      const existingActivity = getActivity(dest.fundId, switchGroup.month, 'Fund Switch In');
      if (existingActivity && !deletionEdits.some(edit => edit.originalActivityId === existingActivity.id)) {
        additionalDeletions.push({
          fundId: dest.fundId,
          month: switchGroup.month,
          activityType: 'Fund Switch In',
          value: '',
          isNew: false,
          originalActivityId: existingActivity.id,
          toDelete: true
        });
      }
    });

    setPendingEdits([...newPendingEdits, ...deletionEdits, ...additionalDeletions]);
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
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

  // Helper function to recalculate IRR for a specific fund and month
  const recalculateIRRForFundAndMonth = async (fundId: number, month: string): Promise<void> => {
    try {
      // Parse the month string to get year and month
      const [year, monthNum] = month.split('-');
      
      // Ensure month number is padded with leading zero if needed
      const paddedMonth = monthNum.padStart(2, '0');
      
      // Format the date - we'll use the first day of the month as that's what the backend expects
      const formattedDate = `${year}-${paddedMonth}-01`;
      
      console.log(`Triggering IRR recalculation for fund ${fundId} and date ${formattedDate}`);
      
      // Call the portfolio_funds endpoint to recalculate IRR
      try {
        const response = await api.post(`portfolio_funds/${fundId}/recalculate_irr?valuation_date=${formattedDate}`);
        
        console.log(`IRR recalculation completed for fund ${fundId}, month ${month}:`, response.data);
        
        // Verify the IRR update was successful by fetching the latest IRR value
        try {
          await new Promise(resolve => setTimeout(resolve, 200));
          const irrResponse = await api.get(`portfolio_funds/${fundId}/latest-irr`);
          console.log(`Verified latest IRR for fund ${fundId}:`, irrResponse.data);
        } catch (verifyErr) {
          console.error(`Error verifying IRR for fund ${fundId}:`, verifyErr);
        }
        
        return;
      } catch (apiErr: any) {
        // Log API-specific errors but don't throw
        console.error(`API error recalculating IRR for fund ${fundId}, month ${month}:`, 
          apiErr.response?.data?.detail || apiErr.message);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || err.message;
      console.error(`Error recalculating IRR for fund ${fundId}, month ${month}:`, errorMessage);
      // Don't throw the error - we don't want to interrupt the overall save process
      // Just log it for debugging
    }
  };

  // Save all pending edits
  const saveChanges = async () => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Get all edits that have a non-empty value
      const nonEmptyEdits = pendingEdits.filter(edit => edit.value.trim() !== '');
      
      // Get all edits that have an empty value but correspond to an existing activity
      const emptyEdits = pendingEdits.filter(edit => 
        edit.value.trim() === '' && 
        edit.originalActivityId !== undefined && 
        !edit.toDelete
      );
      
      // Track processed pairs to avoid duplicate processing
      const processedSwitchPairs = new Set<string>();
      
      // Group switch edits by their pairs to process them together
      const switchPairs: Record<string, { switchIn: CellEdit | null, switchOut: CellEdit | null }> = {};
      
      // 1. First gather all switch operations and group them into pairs
      [...nonEmptyEdits, ...emptyEdits].forEach(edit => {
        if (edit.activityType !== 'Fund Switch In' && edit.activityType !== 'Fund Switch Out') {
          return;
        }
        
        const linkedFundId = edit.linkedFundId;
        if (!linkedFundId) {
          return;
        }
        
        // Create a consistent pair key to identify the switch pair
        const fundIds = [edit.fundId, linkedFundId].sort((a, b) => a - b);
        const pairKey = `${fundIds[0]}-${fundIds[1]}-${edit.month}`;
        
        if (!switchPairs[pairKey]) {
          switchPairs[pairKey] = {
            switchIn: null,
            switchOut: null
          };
        }
        
        // Store the edit in its appropriate place
        if (edit.activityType === 'Fund Switch In') {
          switchPairs[pairKey].switchIn = edit;
        } else {
          switchPairs[pairKey].switchOut = edit;
        }
      });
      
      // 2. Process all regular (non-switch) activities first
      for (const edit of nonEmptyEdits) {
        // Skip switch activities as they'll be processed together
        if (edit.activityType === 'Fund Switch In' || edit.activityType === 'Fund Switch Out') {
          continue;
        }
        
        // Skip "Current Value" activities as they're handled differently
        if (edit.activityType === 'Current Value') {
          continue;
        }
        
        try {
          const amount = parseFloat(edit.value);
          if (isNaN(amount) || amount < 0) {
            throw new Error(`Invalid amount: ${edit.value} for ${edit.activityType}`);
          }
        
          const [year, month] = edit.month.split('-');
          const formattedDate = `${year}-${month}-01`;
          
          const activityData = {
            portfolio_fund_id: edit.fundId,
            account_holding_id: accountHoldingId,
            activity_type: convertActivityTypeForBackend(edit.activityType),
            activity_timestamp: formattedDate,
            amount: amount.toString()
          };
          
          if (edit.isNew) {
            // Create new activity
            try {
            await api.post('holding_activity_logs', activityData);
              
              // Check if we have a valuation for this month
              const valuation = getFundValuation(edit.fundId, edit.month);
              
              // Only recalculate IRR if we have a valuation for this month
              if (valuation) {
                console.log(`Found valuation for ${edit.month}, recalculating IRR`);
                
                // Add a small delay to ensure activity is processed before IRR calculation
                await new Promise(resolve => setTimeout(resolve, 300));
                
                // Try to recalculate IRR for the current month
                try {
                  await recalculateIRRForFundAndMonth(edit.fundId, edit.month);
                  
                  // Only proceed to future months if current month succeeded
                  const affectedMonthIndex = months.findIndex(m => m === edit.month);
                  if (affectedMonthIndex !== -1) {
                    for (let i = affectedMonthIndex + 1; i < months.length; i++) {
                      // Check if future month has a valuation
                      const futureValuation = getFundValuation(edit.fundId, months[i]);
                      if (futureValuation) {
                        await recalculateIRRForFundAndMonth(edit.fundId, months[i]);
                      }
                    }
                  }
                } catch (irrError) {
                  console.error(`Error recalculating IRR: ${irrError}`);
                  // Continue with save process even if IRR calc fails
                }
              } else {
                console.log(`No valuation found for ${edit.month}, skipping IRR recalculation`);
              }
            } catch (err: any) { // Fix: Properly type the error as 'any'
              setError(err.message || `Failed to process ${edit.activityType} activity`);
              setIsSubmitting(false);
              return;
            }
          } else if (edit.originalActivityId) {
            // For existing activities, we need to ensure the amount_invested is updated correctly.
            // First we get the original activity to see the original amount
            
            // Get the original activity to see the difference in amount
            const originalActivity = await api.get(`holding_activity_logs/${edit.originalActivityId}`);
            const originalAmount = parseFloat(originalActivity.data.amount || '0');
            
            // Ensure we're applying the correct fund update
            if (amount !== originalAmount) {
              await api.patch(`holding_activity_logs/${edit.originalActivityId}?reverse_before_update=true`, activityData);
            } else {
              // No change in amount, simple update
              await api.patch(`holding_activity_logs/${edit.originalActivityId}`, activityData);
            }
          }
        } catch (err: any) {
          setError(err.message || `Failed to process ${edit.activityType} activity`);
          setIsSubmitting(false);
          return;
        }
      }
      
      // 3. Process "Current Value" edits
      for (const edit of pendingEdits) {
        if (edit.activityType !== 'Current Value') continue;
        
        try {
          // Check if the value is empty
          if (edit.value.trim() === '') {
            // Check if we have a valuation for this month
            const valuation = getFundValuation(edit.fundId, edit.month);
            if (valuation) {
              console.log(`Updating Current Value ${valuation.id} with empty value to trigger deletion`);
              // Update with empty string to trigger deletion on backend
              const response = await api.patch(`fund_valuations/${valuation.id}`, {
                value: ''
              });
              console.log(`Update response for empty Current Value:`, response.data);
              
              // Trigger IRR recalculation for this fund and month
              await recalculateIRRForFundAndMonth(edit.fundId, edit.month);
            } else {
              console.log(`No existing valuation found for fund ${edit.fundId}, month ${edit.month} to delete`);
            }
            continue;
          }
          
          const amount = parseFloat(edit.value);
          if (isNaN(amount) || amount < 0) {
            throw new Error(`Invalid amount: ${edit.value} for Current Value`);
          }
          
          const [year, month] = edit.month.split('-');
          const formattedDate = `${year}-${month}-01`;
          
          // Check if we already have a valuation for this month
          const existingValuation = getFundValuation(edit.fundId, edit.month);
          
          if (existingValuation) {
            // Update existing valuation
            await api.patch(`fund_valuations/${existingValuation.id}`, {
              value: amount
            });
          } else {
            // Create new valuation
            await createFundValuation({
              portfolio_fund_id: edit.fundId,
              valuation_date: formattedDate,
              value: amount
            });
          }
          
          // Trigger IRR recalculation for this fund and month
          await recalculateIRRForFundAndMonth(edit.fundId, edit.month);
        } catch (err: any) {
          setError(err.message || 'Failed to save valuation');
          setIsSubmitting(false);
          return;
        }
      }
      
      // 4. Process switch pairs
      for (const [pairKey, pair] of Object.entries(switchPairs)) {
        if (processedSwitchPairs.has(pairKey)) continue;
        
        try {
          const switchIn = pair.switchIn;
          const switchOut = pair.switchOut;
          
          // If both edits are empty, update both activities with empty values
          if ((!switchIn || switchIn.value.trim() === '') && 
              (!switchOut || switchOut.value.trim() === '')) {
            // Update both activities with empty values if they exist
            if (switchIn?.originalActivityId) {
              const [year, month] = switchIn.month.split('-');
              const formattedDate = `${year}-${month}-01`;
              
              await api.patch(`holding_activity_logs/${switchIn.originalActivityId}`, {
                portfolio_fund_id: switchIn.fundId,
                account_holding_id: accountHoldingId,
                activity_type: convertActivityTypeForBackend('Fund Switch In'),
                activity_timestamp: formattedDate,
                amount: "",  // Empty string to trigger our is_effectively_empty check
                related_fund: switchIn.linkedFundId
              });
            }
            
            if (switchOut?.originalActivityId) {
              const [year, month] = switchOut.month.split('-');
              const formattedDate = `${year}-${month}-01`;
              
              await api.patch(`holding_activity_logs/${switchOut.originalActivityId}`, {
                portfolio_fund_id: switchOut.fundId,
                account_holding_id: accountHoldingId,
                activity_type: convertActivityTypeForBackend('Fund Switch Out'),
                activity_timestamp: formattedDate,
                amount: "",  // Empty string to trigger our is_effectively_empty check
                related_fund: switchOut.linkedFundId
              });
            }
            
            // Also check for existing activities that might not be in the edits
            const sourceId = switchOut?.fundId || switchIn?.linkedFundId;
            const targetId = switchIn?.fundId || switchOut?.linkedFundId;
            
            if (sourceId && targetId) {
              const month = (switchIn || switchOut)?.month || '';
              const [year, monthNum] = month.split('-');
              const formattedDate = `${year}-${monthNum}-01`;
              
              const existingSwitchIn = getActivity(targetId, month, 'Fund Switch In');
              if (existingSwitchIn?.id && existingSwitchIn.id !== switchIn?.originalActivityId) {
                const switchInData = {
                  portfolio_fund_id: targetId,
                  account_holding_id: accountHoldingId,
                  activity_type: convertActivityTypeForBackend('Fund Switch In'),
                  activity_timestamp: formattedDate,
                  amount: "",  // Empty string to trigger our is_effectively_empty check
                  related_fund: sourceId
                };
                
                console.log(`Updating existing SwitchIn activity ${existingSwitchIn.id} with empty value:`, switchInData);
                const response = await api.patch(`holding_activity_logs/${existingSwitchIn.id}`, switchInData);
                console.log(`Existing SwitchIn update response:`, response.data);
              }
              
              const existingSwitchOut = getActivity(sourceId, month, 'Fund Switch Out');
              if (existingSwitchOut?.id && existingSwitchOut.id !== switchOut?.originalActivityId) {
                const switchOutData = {
                  portfolio_fund_id: sourceId,
                  account_holding_id: accountHoldingId,
                  activity_type: convertActivityTypeForBackend('Fund Switch Out'),
                  activity_timestamp: formattedDate,
                  amount: "",  // Empty string to trigger our is_effectively_empty check
                  related_fund: targetId
                };
                
                console.log(`Updating existing SwitchOut activity ${existingSwitchOut.id} with empty value:`, switchOutData);
                const response = await api.patch(`holding_activity_logs/${existingSwitchOut.id}`, switchOutData);
                console.log(`Existing SwitchOut update response:`, response.data);
              }
            }
          }
          // If at least one edit has a value, process the pair
          else if ((switchIn && switchIn.value.trim() !== '') || 
                   (switchOut && switchOut.value.trim() !== '')) {
            // Use the non-empty value, or if both have values, prefer the fund switch in value
            let amount = 0;
            if (switchIn && switchIn.value.trim() !== '') {
              amount = parseFloat(switchIn.value);
            } else if (switchOut && switchOut.value.trim() !== '') {
              amount = parseFloat(switchOut.value);
            }
            
            if (isNaN(amount) || amount < 0) {
              throw new Error(`Invalid amount: ${amount} for switch operation`);
            }
            
            const month = (switchIn || switchOut)?.month || '';
            
            // Pass the switch pair to processSwitchPair which will handle the logic
            // for checking existing activities, creating or updating as needed
            await processSwitchPair(switchIn, switchOut, month, amount);
          }
          
          processedSwitchPairs.add(pairKey);
        } catch (err: any) {
          setError(err.message || 'Failed to process switch operation');
          setIsSubmitting(false);
          return;
        }
      }
      
      // 5. Process deletions from empty cells that had activities
      for (const edit of pendingEdits.filter(e => e.toDelete || (e.value.trim() === '' && e.originalActivityId))) {
        // Skip switch activities as they were processed together
        if (edit.activityType === 'Fund Switch In' || edit.activityType === 'Fund Switch Out') {
          continue;
        }
        
        // Skip "Current Value" activities as they're handled differently and already processed above
        if (edit.activityType === 'Current Value') {
          continue;
        }
        
        try {
          if (edit.originalActivityId) {
            // MODIFICATION: Instead of deleting, update with empty amount
            // This will trigger our backend logic to handle empty values
            const [year, month] = edit.month.split('-');
            const formattedDate = `${year}-${month}-01`;
            
            const emptyActivityData = {
              portfolio_fund_id: edit.fundId,
              account_holding_id: accountHoldingId,
              activity_type: convertActivityTypeForBackend(edit.activityType),
              activity_timestamp: formattedDate,
              amount: ""  // Empty string to trigger our is_effectively_empty check
            };
            
            console.log(`Updating activity ${edit.originalActivityId} with empty value:`, emptyActivityData);
            
            // Use regular update to trigger the empty value handling
            const response = await api.patch(`holding_activity_logs/${edit.originalActivityId}`, emptyActivityData);
            console.log(`Update response:`, response.data);
          }
        } catch (err: any) {
          console.error(`Error updating empty activity:`, err);
          setError(err.message || 'Failed to update empty activity');
          setIsSubmitting(false);
          return;
        }
      }
      
      // After all processing is done, we need to ensure all IRR values are updated
      // Collect all funds that need IRR recalculation
      const fundsToRecalculateIRR = new Set<number>();
      
      // Add all funds from processed edits
      for (const edit of pendingEdits) {
        if (edit.fundId) {
          fundsToRecalculateIRR.add(edit.fundId);
        }
        if (edit.linkedFundId) {
          fundsToRecalculateIRR.add(edit.linkedFundId);
        }
      }
      
      // Force an additional delay to ensure all valuation records are committed
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Recalculate IRR for all impacted funds for all months
      for (const fundId of fundsToRecalculateIRR) {
        for (const month of months) {
          // Check if there's a valuation for this month before trying to recalculate IRR
          const valuation = getFundValuation(fundId, month);
          if (valuation) {
            await recalculateIRRForFundAndMonth(fundId, month);
          }
        }
      }
      
      // Clear pending edits and refresh data
      setPendingEdits([]);
      
      // Add a larger delay before triggering the data refresh to ensure
      // all IRR calculations have completed on the backend
      setTimeout(() => {
      onActivitiesUpdated();
      }, 800);
      
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving changes');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get class for cell
  const getCellClass = (fundId: number, month: string, activityType: string, isFirstColumn: boolean = false): string => {
    // Base class for all cells - remove fixed width constraints to allow full width usage
    let baseClass = "px-2 py-1 border box-border w-full h-8";
    
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
    
    // Check for switch group styling
    const switchGroup = getSwitchGroupForCell(fundId, month, activityType);
    if (switchGroup && (activityType === 'Fund Switch In' || activityType === 'Fund Switch Out')) {
      const switchColor = getSwitchGroupColor(switchGroup.colorIndex);
      baseClass += ` ${switchColor}`;
    }
    
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
    
    // Add special class for switch cells with linked funds (legacy support)
    if ((activityType === 'Fund Switch In' || activityType === 'Fund Switch Out') && 
        pendingEdit && pendingEdit.linkedFundId) {
      baseClass += " border-blue-300 border-2";
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
  
  // Get the name of the linked fund for a switch cell
  const getLinkedFundName = (fundId: number, month: string, activityType: string): string | null => {
    const pendingEdit = pendingEdits.find(
      edit => edit.fundId === fundId && 
              edit.month === month && 
              edit.activityType === activityType
    );
    
    if (!pendingEdit || !pendingEdit.linkedFundId) return null;
    
    const linkedFund = funds.find(f => f.id === pendingEdit.linkedFundId);
    if (!linkedFund) return null;
    
    return linkedFund.fund_name;
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
                     activityType === 'RegularWithdrawal' || 
                     activityType === 'Fund Switch Out') {
            return total - parseFloat(cellValue);
          }
        }
        return total;
      }, 0);
  };

  // Calculate total for all funds by activity type for a specific month
  const calculateActivityTypeTotal = (activityType: string, month: string): number => {
    // Special handling for Switch activities
    if (activityType === 'Fund Switch In' || activityType === 'Fund Switch Out') {
      // For totals purposes, we don't include Switch activities in the totals
      // because they have a net effect of 0 across all funds
      // (money is just moving between funds within the same account)
      return 0;
    }

    return funds
      .filter(fund => fund.isActive !== false) // Only include active funds
      .reduce((total, fund) => {
        const cellValue = getCellValue(fund.id, month, activityType);
        if (cellValue && !isNaN(parseFloat(cellValue))) {
          // For withdrawals, use negative values
          if (activityType === 'Withdrawal' || activityType === 'RegularWithdrawal') {
            return total - parseFloat(cellValue);
          } 
          // For all other activities, use positive values
          else {
            return total + parseFloat(cellValue);
          }
        }
        return total;
      }, 0);
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
    // Return empty string for zero
    if (total === 0) return '';
    
    // Format the number without thousands separators to save space
    // Keep 2 decimal places for non-zero decimal parts, otherwise show as integer
    const hasDecimal = total % 1 !== 0;
    const formatted = hasDecimal ? total.toFixed(2) : total.toFixed(0);
    
    // Add currency symbol
    return `£${formatted}`;
  };

  // Add this new function for properly handling switch pairs
  const processSwitchPair = async (
    switchIn: CellEdit | null, 
    switchOut: CellEdit | null, 
    month: string,
    amount: number
  ): Promise<void> => {
    if (!switchIn && !switchOut) {
      return;
    }

    const formattedDate = `${month.split('-')[0]}-${month.split('-')[1]}-01`;
    
    try {
      // Case 1: Empty values - update with empty values instead of deleting
      if (amount < 0) {
        // Update Switch In activity with empty value if it exists
        if (switchIn?.originalActivityId) {
          const switchInData = {
            portfolio_fund_id: switchIn.fundId,
            account_holding_id: accountHoldingId,
            activity_type: convertActivityTypeForBackend('Fund Switch In'),
            activity_timestamp: formattedDate,
            amount: "",  // Empty string to trigger our is_effectively_empty check
            related_fund: switchIn.linkedFundId
          };
          
          console.log(`Updating SwitchIn activity ${switchIn.originalActivityId} with empty value:`, switchInData);
          const response = await api.patch(`holding_activity_logs/${switchIn.originalActivityId}`, switchInData);
          console.log(`SwitchIn update response:`, response.data);
        }
        
        // Update Switch Out activity with empty value if it exists
        if (switchOut?.originalActivityId) {
          const switchOutData = {
            portfolio_fund_id: switchOut.fundId,
            account_holding_id: accountHoldingId,
            activity_type: convertActivityTypeForBackend('Fund Switch Out'),
            activity_timestamp: formattedDate,
            amount: "",  // Empty string to trigger our is_effectively_empty check
            related_fund: switchOut.linkedFundId
          };
          
          console.log(`Updating SwitchOut activity ${switchOut.originalActivityId} with empty value:`, switchOutData);
          const response = await api.patch(`holding_activity_logs/${switchOut.originalActivityId}`, switchOutData);
          console.log(`SwitchOut update response:`, response.data);
        }
        
        return;
      }
      
      // Case 2: Creating or updating switch pair
      // First determine the source (out) and target (in) fund IDs
      const sourceId = switchOut?.fundId || switchIn?.linkedFundId;
      const targetId = switchIn?.fundId || switchOut?.linkedFundId;
      
      if (!sourceId || !targetId) {
        throw new Error('Missing fund information for switch operation');
      }
      
      // Check if activities already exist for this month, fund and activity type
      const existingSwitchIn = !switchIn?.originalActivityId 
        ? getActivity(targetId, month, 'Fund Switch In')
        : null;
      
      const existingSwitchOut = !switchOut?.originalActivityId 
        ? getActivity(sourceId, month, 'Fund Switch Out')
        : null;
      
      // For new switch activities
      if ((!switchIn?.originalActivityId && !existingSwitchIn) || 
          (!switchOut?.originalActivityId && !existingSwitchOut)) {
        
        // Step 1: Create Switch Out first with skip_fund_update=true (don't update fund amounts yet)
        const switchOutActivity = {
          portfolio_fund_id: sourceId,
          account_holding_id: accountHoldingId,
          activity_type: convertActivityTypeForBackend('Fund Switch Out'),
          activity_timestamp: formattedDate,
          amount: amount.toString(),
          related_fund: targetId
        };
        
        // If an existing switch out exists but wasn't identified in the edit
        if (existingSwitchOut) {
          await api.patch(`holding_activity_logs/${existingSwitchOut.id}?skip_fund_update=true`, switchOutActivity);
        } else {
          await api.post('holding_activity_logs?skip_fund_update=true', switchOutActivity);
        }
        
        // Step 2: Create Switch In with skip_fund_update=false (update both funds)
        const switchInActivity = {
          portfolio_fund_id: targetId,
          account_holding_id: accountHoldingId,
          activity_type: convertActivityTypeForBackend('Fund Switch In'),
          activity_timestamp: formattedDate,
          amount: amount.toString(),
          related_fund: sourceId
        };
        
        // If an existing switch in exists but wasn't identified in the edit
        if (existingSwitchIn) {
          await api.patch(`holding_activity_logs/${existingSwitchIn.id}`, switchInActivity);
        } else {
          await api.post('holding_activity_logs', switchInActivity);
        }
        
        // Recalculate IRR for both funds for this month and future months
        // since this is a new switch operation
        const recalculateIRR = async (fundId: number) => {
          // First recalculate IRR for the current month
          await recalculateIRRForFundAndMonth(fundId, month);
          
          // Then recalculate IRR for all future months
          const affectedMonthIndex = months.findIndex(m => m === month);
          if (affectedMonthIndex !== -1) {
            for (let i = affectedMonthIndex + 1; i < months.length; i++) {
              await recalculateIRRForFundAndMonth(fundId, months[i]);
            }
          }
        };
        
        // Recalculate for both source and target funds
        await recalculateIRR(sourceId);
        await recalculateIRR(targetId);
      } 
      // For updating existing switch activities
      else {
        // Update Switch Out activity
        if (switchOut?.originalActivityId || existingSwitchOut) {
          const switchOutId = switchOut?.originalActivityId || existingSwitchOut?.id;
          
          // First reverse the existing amount from the fund amounts
          const switchOutActivity = {
            portfolio_fund_id: sourceId,
            activity_timestamp: formattedDate,
            amount: amount.toString(),
            related_fund: targetId
          };
          
          await api.patch(`holding_activity_logs/${switchOutId}?skip_fund_update=true`, switchOutActivity);
        } else if (sourceId) {
          // Create a new Switch Out if it doesn't exist but should
          const switchOutActivity = {
            portfolio_fund_id: sourceId,
            account_holding_id: accountHoldingId,
            activity_type: convertActivityTypeForBackend('Fund Switch Out'),
            activity_timestamp: formattedDate,
            amount: amount.toString(),
            related_fund: targetId
          };
          
          await api.post('holding_activity_logs?skip_fund_update=true', switchOutActivity);
          
          // Recalculate IRR for source fund since this is a new activity
          await recalculateIRRForFundAndMonth(sourceId, month);
          
          // Also recalculate for future months
          const affectedMonthIndex = months.findIndex(m => m === month);
          if (affectedMonthIndex !== -1) {
            for (let i = affectedMonthIndex + 1; i < months.length; i++) {
              await recalculateIRRForFundAndMonth(sourceId, months[i]);
            }
          }
        }
        
        // Update Switch In activity - this will apply the updated amounts to both funds
        if (switchIn?.originalActivityId || existingSwitchIn) {
          const switchInId = switchIn?.originalActivityId || existingSwitchIn?.id;
          
          const switchInActivity = {
            portfolio_fund_id: targetId,
            activity_timestamp: formattedDate,
            amount: amount.toString(),
            related_fund: sourceId
          };
          
          await api.patch(`holding_activity_logs/${switchInId}`, switchInActivity);
        } else if (targetId) {
          // Create a new Switch In if it doesn't exist but should
          const switchInActivity = {
            portfolio_fund_id: targetId,
            account_holding_id: accountHoldingId,
            activity_type: convertActivityTypeForBackend('Fund Switch In'),
            activity_timestamp: formattedDate,
            amount: amount.toString(),
            related_fund: sourceId
          };
          
          await api.post('holding_activity_logs', switchInActivity);
          
          // Recalculate IRR for target fund since this is a new activity
          await recalculateIRRForFundAndMonth(targetId, month);
          
          // Also recalculate for future months
          const affectedMonthIndex = months.findIndex(m => m === month);
          if (affectedMonthIndex !== -1) {
            for (let i = affectedMonthIndex + 1; i < months.length; i++) {
              await recalculateIRRForFundAndMonth(targetId, months[i]);
            }
          }
        }
      }
      
    } catch (err: any) {
      throw err;
    }
  };

  // Get class for activity label cell in first column
  const getActivityLabelClass = (fundId: number, activityType: string) => {
    // Default styling
    let baseClass = "px-2 py-1 font-medium text-gray-500 sticky left-0 z-10 h-8";
    
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
      baseClass += " bg-gray-50 pl-6";
    }
    
    // Add shadow effect
    baseClass += " shadow-[5px_0_5px_-5px_rgba(0,0,0,0.1)]";
    
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
      });
    });
    
    // Remove existing pending edits for this month and add new ones
    const filteredEdits = pendingEdits.filter(edit => edit.month !== selectedBulkMonth);
    setPendingEdits([...filteredEdits, ...newEdits]);
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
        if (activityType === 'Withdrawal' || activityType === 'RegularWithdrawal') {
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

  return (
    <>
      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
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
          {pendingEdits.length > 0 && (
            <button
              onClick={saveChanges}
              disabled={isSubmitting}
              className="px-4 py-2 bg-green-600 text-white font-medium rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : `Confirm Changes (${pendingEdits.length})`}
            </button>
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
                <col className="w-[20%] sticky left-0 z-10" />
                {months.map((month, index) => (
                  <col key={`col-${month}`} className={`w-[${80 / months.length}%]`} />
                ))}
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
                  className="h-8"
                  style={{
                    ...(headerTop !== null && { 
                      display: 'block',
                      position: 'relative',
                      height: '32px'
                    })
                  }}
                >
                  <th 
                    className="px-2 py-1 text-left font-medium text-gray-800 sticky left-0 top-0 z-30 bg-blue-50 shadow-[5px_0_5px_-5px_rgba(0,0,0,0.1)] border-b border-gray-300"
                    style={{
                      ...(headerTop !== null && columnPositions[0] ? {
                        position: 'absolute',
                        left: `${columnPositions[0].left}px`,
                        width: `${columnPositions[0].width}px`,
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center'
                      } : {
                        width: 'auto'
                      })
                    }}
                  >
                    Fund / Activity
                  </th>
                  {months.map((month, index) => {
                    const providerSwitch = getProviderSwitchForMonth(month);
                    const columnIndex = index + 1; // +1 because first column is Fund/Activity
                    
                    return (
                      <th 
                        key={month} 
                        className="px-1 py-1 text-center font-medium text-gray-800 whitespace-nowrap bg-blue-50 border-b border-gray-300 relative group sticky top-0 z-20 cursor-pointer hover:bg-blue-100"
                        onClick={() => handleMonthHeaderClick(month)}
                        title="Click to bulk edit activities for this month"
                        style={{
                          ...(headerTop !== null && columnPositions[columnIndex] ? {
                            position: 'absolute',
                            left: `${columnPositions[columnIndex].left}px`,
                            width: `${columnPositions[columnIndex].width}px`,
                            height: '32px',
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
                </tr>
              </thead>
              {/* Spacer to prevent content jump when header becomes fixed */}
              {headerTop !== null && (
                <thead className="bg-transparent">
                  <tr className="h-8">
                    <th 
                      className="px-2 py-1"
                      style={{
                        width: columnPositions[0] ? `${columnPositions[0].width}px` : 'auto'
                      }}
                    ></th>
                    {months.map((month, index) => {
                      const columnIndex = index + 1;
                      return (
                        <th 
                          key={`spacer-${month}`} 
                          className="px-1 py-1"
                          style={{
                            width: columnPositions[columnIndex] ? `${columnPositions[columnIndex].width}px` : 'auto'
                          }}
                        ></th>
                      );
                    })}
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
                          className={`h-8 ${
                            fund.isActive === false 
                              ? fund.isInactiveBreakdown 
                                ? 'bg-gray-50 border-t border-dashed border-gray-300' 
                                : 'bg-gray-100 border-t border-gray-300'
                              : 'bg-white border-t border-gray-200'
                          }`}>
                        <td className={`px-2 py-1 font-semibold ${
                          fund.isActive === false 
                            ? fund.isInactiveBreakdown 
                              ? 'text-gray-600 pl-6' 
                              : 'text-blue-800' 
                            : 'text-gray-900'
                        } sticky left-0 z-10 ${
                          fund.isActive === false 
                            ? fund.isInactiveBreakdown ? 'bg-gray-50' : 'bg-gray-100' 
                            : 'bg-white'
                        } shadow-[5px_0_5px_-5px_rgba(0,0,0,0.1)]`}>
                          <div className="flex items-center justify-between">
                            <div>
                              {fund.isInactiveBreakdown && 
                                <span className="text-gray-400 mr-2">→</span>
                              }
                              {fund.fund_name}
                              <div className="text-xs text-red-600 font-normal">
                                Total Activities
                              </div>
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
                        {months.map(month => {
                          const total = calculateFundTotal(fund.id, month);
                          return (
                            <td key={`compact-${fund.id}-${month}`} 
                                className={`px-1 py-1 text-center text-sm font-medium ${
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
                      </tr>
                    ));
                  })()
                ) : (
                  // Detailed view - current implementation
                  (() => {
                    // First get any inactive funds that might need to be displayed
                  // If we're showing the inactive funds breakdown, we need to find the previous funds entry
                  const previousFundsEntry = funds.find(f => f.isActive === false && f.inactiveHoldingIds && f.inactiveHoldingIds.length > 0);
                  
                  // Find all funds that should be displayed
                  let fundsToDisplay = [...funds];
                  
                  // If showing inactive funds and we have a previous funds entry with inactive funds
                  if (showInactiveFunds && previousFundsEntry && previousFundsEntry.inactiveHoldingIds) {
                    // Now inactiveHoldingIds is an array of objects with id, fund_id, and fund_name
                    const inactiveFundsToShow = previousFundsEntry.inactiveHoldingIds.map(holding => {
                      // The holding already has the fund_name, so we can use it directly
                      return {
                        id: holding.id, // This is the portfolio_fund_id
                        fund_name: holding.fund_name || `Inactive Fund ${holding.id}`,
                        holding_id: -1,
                        isActive: false,
                        isInactiveBreakdown: true,
                        // Preserve the original fund_id for reference
                        fund_id: holding.fund_id
                      };
                    });
                    
                    // Insert inactive funds after the Previous Funds entry
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
                    <React.Fragment key={`${fund.id}${fund.isInactiveBreakdown ? '-breakdown' : ''}`}>
                    {/* Fund name row */}
                        <tr className={`h-8 ${
                        fund.isActive === false 
                          ? fund.isInactiveBreakdown 
                            ? 'bg-gray-50 border-t border-dashed border-gray-300' 
                            : 'bg-gray-100 border-t border-gray-300'
                          : 'bg-gray-50 border-t border-gray-200'
                      }`}>
                          <td className={`px-2 py-1 font-semibold ${
                          fund.isActive === false 
                            ? fund.isInactiveBreakdown 
                              ? 'text-gray-600 pl-6' // Indent inactive breakdown funds
                              : 'text-blue-800' 
                            : 'text-gray-900'
                        } sticky left-0 z-10 ${
                          fund.isActive === false 
                            ? fund.isInactiveBreakdown ? 'bg-gray-50' : 'bg-gray-100' 
                            : 'bg-gray-50'
                        } shadow-[5px_0_5px_-5px_rgba(0,0,0,0.1)] h-10`}>
                          <div className="flex items-center justify-between">
                            <div>
                              {fund.isInactiveBreakdown && 
                                <span className="text-gray-400 mr-2">→</span>
                              }
                        {fund.fund_name}
                              {fund.isActive === false && !fund.isInactiveBreakdown && (
                                <div className="text-xs text-gray-500 font-normal mt-1">
                                  ({fund.inactiveHoldingIds?.length || 0} inactive {(fund.inactiveHoldingIds?.length || 0) === 1 ? 'fund' : 'funds'} - not editable)
                                </div>
                              )}
                              {fund.isInactiveBreakdown && (
                                <div className="text-xs text-gray-500 font-normal">
                                  (inactive)
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
                      {months.map(month => (
                            <td key={`fund-name-${month}`} 
                                className={`px-1 py-1 bg-transparent ${
                            fund.isActive === false 
                              ? fund.isInactiveBreakdown ? 'bg-gray-50' : 'bg-gray-100' 
                              : 'bg-gray-50'
                                }`}>
                            </td>
                      ))}
                    </tr>
                    
                    {/* Activity type rows */}
                    {ACTIVITY_TYPES.map(activityType => (
                        <tr key={`${fund.id}-${activityType}${fund.isInactiveBreakdown ? '-breakdown' : ''}`} 
                            className={`h-10 ${fund.isInactiveBreakdown ? 'bg-gray-50' : ''}`}>
                          <td className={getActivityLabelClass(fund.id, activityType)}>
                            {fund.isInactiveBreakdown && 
                              <span className="text-gray-400 mr-2">→</span>
                            }
                            {formatActivityType(activityType)}
                          </td>
                        {months.map((month, monthIndex) => {
                          const cellValue = getCellValue(fund.id, month, activityType);
                          const linkedFundName = getLinkedFundName(fund.id, month, activityType);
                          const switchGroup = getSwitchGroupForCell(fund.id, month, activityType);
                          
                          return (
                            <td 
                                key={`${fund.id}-${month}-${activityType}${fund.isInactiveBreakdown ? '-breakdown' : ''}`} 
                                className={`${getCellClass(fund.id, month, activityType, true)} ${
                                  fund.isInactiveBreakdown ? 'bg-gray-50 opacity-75' : ''
                                }`}
                              title={linkedFundName ? 
                                `${activityType === 'Fund Switch In' ? 'From' : 'To'}: ${linkedFundName}` : 
                                undefined}
                                id={`cell-${fund.id}-${month}-${activityType}${fund.isInactiveBreakdown ? '-breakdown' : ''}`}
                              onClick={(e) => {
                                  // Don't focus inactive breakdown cells
                                  if (fund.isInactiveBreakdown || fund.isActive === false) return;
                                  
                                // Update focused cell state
                                setFocusedCell({
                                  fundId: fund.id,
                                  activityType,
                                  monthIndex: months.indexOf(month)
                                });
                                
                                // Focus the input element
                                const input = e.currentTarget.querySelector('input');
                                if (input && !input.disabled) {
                                  input.focus();
                                  
                                  // If it's a double click, select all text to allow immediate typing
                                  if (e.detail === 2) {
                                    input.select();
                                  }
                                }
                              }}
                            >
                              <div className="flex justify-center items-center">
                                {/* Check if this is a switch cell with a group */}
                                {(activityType === 'Fund Switch In' || activityType === 'Fund Switch Out') && 
                                 cellValue && cellValue.trim() !== '' && switchGroup ? (
                                  <SwitchTooltip
                                    switchGroup={switchGroup}
                                    isSource={activityType === 'Fund Switch Out'}
                                    currentFundId={fund.id}
                                  >
                                    <div 
                                      className="flex items-center justify-center w-full cursor-pointer"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        
                                        // Open modal for editing the switch (for both in and out)
                                        if (fund.isActive !== false && !fund.isInactiveBreakdown) {
                                          setMultiDestinationData({
                                            sourceFund: funds.find(f => f.id === switchGroup.sourceFundId) || fund,
                                            totalAmount: switchGroup.sourceAmount,
                                            month,
                                            existingGroup: switchGroup
                                          });
                                          setShowMultiDestinationModal(true);
                                        }
                                      }}
                                    >
                                      <div className="flex items-center">
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
                                        handleCellValueChange(fund.id, month, activityType, value);

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
                                            padding: '0 2px',
                                            width: (cellValue.length + 1) + 'ch',
                                            minWidth: '7ch',
                                            maxWidth: '8ch',
                                            fontSize: '0.875rem',
                                            opacity: fund.isActive === false || fund.isInactiveBreakdown ? 0.7 : 1,
                                            pointerEvents: 'none' // Prevent direct input editing, force modal use
                                          }}
                                          inputMode="text"
                                        />
                                        <span className="text-gray-400 text-xs ml-1">...</span>
                                      </div>
                                    </div>
                                  </SwitchTooltip>
                                ) : (
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
                                        handleCellValueChange(fund.id, month, activityType, value);
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
                                    padding: '0 4px',
                                    width: '100%',
                                    fontSize: '0.875rem',
                                    opacity: fund.isActive === false || fund.isInactiveBreakdown ? 0.7 : 1
                                  }}
                                  inputMode="text"
                                />
                                )}
                              </div>
                                {linkedFundName && !fund.isInactiveBreakdown && (
                                <div className="text-xs text-blue-600 text-center mt-1">
                                  {activityType === 'Fund Switch In' ? 'From' : 'To'}: {linkedFundName}
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                    
                      {/* Don't show totals for inactive breakdown funds */}
                      {!fund.isInactiveBreakdown && (
                    <tr className="h-10 bg-gray-100 border-t border-gray-200">
                      <td className="px-3 py-1 font-semibold text-red-600 sticky left-0 z-10 bg-gray-100 shadow-[5px_0_5px_-5px_rgba(0,0,0,0.1)]">
                            {fund.isInactiveBreakdown && 
                              <span className="text-gray-400 mr-2">→</span>
                            }
                        Total
                      </td>
                      {months.map(month => {
                        const total = calculateFundMonthTotal(fund.id, month);
                        const formattedTotal = formatTotal(total);
                        
                        return (
                          <td 
                                key={`total-${fund.id}-${month}${fund.isInactiveBreakdown ? '-breakdown' : ''}`} 
                            className="px-2 py-1 text-center font-semibold text-red-600 h-10"
                          >
                            {formattedTotal}
                          </td>
                        );
                      })}
                    </tr>
                      )}
                  </React.Fragment>
                  ));
                  })()
                )}

                {/* Grand totals section - totals by activity type across all funds */}
                <tr className="h-10 bg-gray-50 border-t-2 border-gray-300 font-semibold">
                  <td className="px-3 py-2 text-gray-900 sticky left-0 z-10 bg-gray-50 shadow-[5px_0_5px_-5px_rgba(0,0,0,0.1)]">
                    Monthly Totals
                  </td>
                  {months.map(month => (
                    <td key={`totals-header-${month}`} className="px-2 py-1 text-center"></td>
                  ))}
                </tr>

                {/* Activity type total rows */}
                {ACTIVITY_TYPES
                  .filter(activityType => activityType !== 'Current Value') // Exclude Current Value from totals
                  .map(activityType => (
                    <tr key={`totals-${activityType}`} className="h-10 bg-white border-t border-gray-200">
                      <td className="px-3 py-1 font-medium text-gray-500 sticky left-0 z-10 bg-white shadow-[5px_0_5px_-5px_rgba(0,0,0,0.1)]">
                        {formatActivityType(activityType)}
                      </td>
                      {months.map((month, monthIndex) => {
                        const total = calculateActivityTypeTotal(activityType, month);
                        const formattedTotal = formatTotal(total);
                        
                        return (
                          <td 
                            key={`totals-${activityType}-${month}`}
                            id={`totals-cell-${activityType}-${month}`}
                            className="px-2 py-1 text-center h-10 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 focus:bg-blue-50 focus:z-20 relative"
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
                    </tr>
                  ))}

                {/* Valuation total row */}
                <tr className="h-10 bg-blue-50 border-t border-blue-200">
                  <td className="px-3 py-1 font-medium text-blue-700 sticky left-0 z-10 bg-blue-50 shadow-[5px_0_5px_-5px_rgba(0,0,0,0.1)]">
                    Total Valuation
                  </td>
                  {months.map((month, monthIndex) => {
                    const total = calculateActivityTypeTotal('Current Value', month);
                    const formattedTotal = formatTotal(total);
                    
                    return (
                      <td 
                        key={`totals-valuation-${month}`}
                        id={`totals-cell-Total Valuation-${month}`}
                        className="px-2 py-1 text-center font-medium text-blue-700 h-10 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-600 focus:bg-blue-100 focus:z-20 relative"
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
                </tr>

                {/* Grand total row */}
                <tr className="h-10 bg-gray-100 border-t border-gray-200">
                  <td className="px-3 py-1 font-semibold text-red-600 sticky left-0 z-10 bg-gray-100 shadow-[5px_0_5px_-5px_rgba(0,0,0,0.1)]">
                    Overall Total
                  </td>
                  {months.map((month, monthIndex) => {
                    const total = calculateMonthTotal(month);
                    const formattedTotal = formatTotal(total);
                    
                    return (
                      <td 
                        key={`grand-total-${month}`}
                        id={`totals-cell-Overall Total-${month}`}
                        className="px-2 py-1 text-center font-semibold text-red-600 h-10 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 focus:bg-blue-50 focus:z-20 relative"
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
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      {/* Fund selection modal */}
      {showSwitchFundModal && switchSelectionData && (
        <SwitchFundSelectionModal
          funds={funds.filter(f => 
            switchSelectionData.isEditingOrigin 
              ? f.id !== switchSelectionData.originFundId 
              : f.id !== switchSelectionData.destinationFundId
          )}
          month={switchSelectionData.month}
          amount={switchSelectionData.amount}
          isSwitchOut={switchSelectionData.isEditingOrigin}
          onConfirm={handleFundSelectionConfirm}
          onCancel={() => {
            setShowSwitchFundModal(false);
            setSwitchSelectionData(null);
          }}
        />
      )}
      {showMultiDestinationModal && multiDestinationData && (
        <MultiDestinationSwitchModal
          sourceFund={multiDestinationData.sourceFund}
          availableFunds={availableFundsForSwitch}
          totalAmount={multiDestinationData.totalAmount}
          month={multiDestinationData.month}
          existingDestinations={multiDestinationData.existingGroup?.destinations}
          onConfirm={handleMultiDestinationConfirm}
          onCancel={() => {
            setShowMultiDestinationModal(false);
            setMultiDestinationData(null);
          }}
        />
      )}
      
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