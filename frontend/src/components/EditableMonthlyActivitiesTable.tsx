import React, { useState, useEffect } from 'react';
import { formatCurrency } from '../utils/formatters';
import api, { createFundValuation } from '../services/api';
import SwitchFundSelectionModal from './SwitchFundSelectionModal';

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
}

interface Fund {
  id: number;
  fund_name: string;
  holding_id: number;
  irr?: number;
  start_date?: string;
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

interface EditableMonthlyActivitiesTableProps {
  funds: Fund[];
  activities: Activity[];
  accountHoldingId: number;
  onActivitiesUpdated: () => void;
  selectedYear?: number;
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

const ACTIVITY_TYPES = [
  'Investment',
  'RegularInvestment',
  'GovernmentUplift',
  'Switch In',
  'Switch Out',
  'Withdrawal',
  'Current Value'
];

const EditableMonthlyActivitiesTable: React.FC<EditableMonthlyActivitiesTableProps> = ({
  funds,
  activities,
  accountHoldingId,
  onActivitiesUpdated,
  selectedYear
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
  
  // Add state to track the currently focused cell
  const [focusedCell, setFocusedCell] = useState<{ fundId: number, activityType: string, monthIndex: number } | null>(null);
  
  // Styles for input elements to remove borders
  const noBorderStyles = {
    border: 'none', 
    outline: 'none',
    boxShadow: 'none',
    appearance: 'none',
    WebkitAppearance: 'none',
    MozAppearance: 'none'
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
      } catch (err) {
        // Set to empty array on error
        setFundValuations([]);
      } finally {
        setIsLoadingValuations(false);
      }
    };

    fetchFundValuations();
    // Add onActivitiesUpdated to dependency array to refresh when data changes
  }, [onActivitiesUpdated]);

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
  
  // Add effect to focus the first cell after rendering
  useEffect(() => {
    if (funds.length > 0 && months.length > 0) {
      // Wait for the DOM to be fully rendered
      setTimeout(() => {
        const firstFund = funds[0];
        const firstMonth = months[0];
        const firstActivityType = ACTIVITY_TYPES[0];
        
        // Try to find and focus the first input
        const firstCell = document.getElementById(`cell-${firstFund.id}-${firstMonth}-${firstActivityType}`);
        if (firstCell) {
          const input = firstCell.querySelector('input');
          if (input && !input.disabled) {
            input.focus();
            // Make sure the first cell is visible
            firstCell.scrollIntoView({
              behavior: 'auto',
              block: 'nearest',
              inline: 'nearest'
            });
            setFocusedCell({
              fundId: firstFund.id,
              activityType: firstActivityType,
              monthIndex: 0
            });
          }
        }
      }, 100);
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
      case 'Switch In': return 'SwitchIn';
      case 'Switch Out': return 'SwitchOut';
      case 'Current Value': return 'Valuation';
      default: return uiActivityType;
    }
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

  // Handle cell value change
  const handleCellValueChange = (fundId: number, month: string, activityType: string, value: string) => {
    // Validate value (must be a number)
    if (value !== '' && isNaN(Number(value))) {
      return;
    }

    // Find any existing activity or valuation
    let originalValue = '';
    let originalId;
    let originalRelatedFund;
    
    if (activityType === 'Current Value') {
      const valuation = getFundValuation(fundId, month);
      if (valuation) {
        originalValue = valuation.value.toString();
        originalId = valuation.id;
      }
    } else {
      const activity = getActivity(fundId, month, activityType);
      if (activity) {
        originalValue = Math.abs(parseFloat(activity.amount)).toString();
        originalId = activity.id;
        originalRelatedFund = activity.related_fund;
      }
    }
    
    // Check if there's already a pending edit for this cell
    const existingEditIndex = pendingEdits.findIndex(
      edit => edit.fundId === fundId && 
              edit.month === month && 
              edit.activityType === activityType
    );
    
    // If this is the same as the original value, remove the pending edit
    if (originalValue && value === originalValue && existingEditIndex !== -1) {
      const updatedEdits = [...pendingEdits];
      updatedEdits.splice(existingEditIndex, 1);
      setPendingEdits(updatedEdits);
      return;
    }
    
    // If value is empty and there's an original activity, mark for deletion
    if (value === '' && originalId) {
      const newEdit: CellEdit = {
        fundId,
        month,
        activityType,
        value: '',
        isNew: false,
        originalActivityId: originalId,
        toDelete: true, // Mark this activity for deletion
        linkedFundId: originalRelatedFund
      };
      
      if (existingEditIndex !== -1) {
        // Update existing edit
        const updatedEdits = [...pendingEdits];
        updatedEdits[existingEditIndex] = newEdit;
        setPendingEdits(updatedEdits);
      } else {
        // Add new edit
        setPendingEdits([...pendingEdits, newEdit]);
      }
      return;
    }
    
    // Otherwise update or add a pending edit
    const newEdit: CellEdit = {
      fundId,
      month,
      activityType,
      value,
      isNew: !originalId,
      originalActivityId: originalId,
      linkedFundId: originalRelatedFund
    };
    
    if (existingEditIndex !== -1) {
      // Update existing edit
      const updatedEdits = [...pendingEdits];
      updatedEdits[existingEditIndex] = newEdit;
      setPendingEdits(updatedEdits);
    } else {
      // Add new edit
      setPendingEdits([...pendingEdits, newEdit]);
    }

    // No longer show the fund selection modal immediately
    // We'll do that in the onBlur handler instead
  };

  // Update the handleCellBlur function to check if the value actually changed
  const handleCellBlur = (fundId: number, month: string, activityType: string) => {
    // Only show the fund selection modal for Switch In/Out cells with a value
    if ((activityType === 'Switch In' || activityType === 'Switch Out')) {
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
      
      if (valueChanged) {
        setSwitchSelectionData({
          originFundId: activityType === 'Switch Out' ? fundId : 0,
          destinationFundId: activityType === 'Switch In' ? fundId : 0,
          month,
          amount: parseFloat(cellEdit.value),
          isEditingOrigin: activityType === 'Switch Out'
        });
        setShowSwitchFundModal(true);
      }
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
        activityType: 'Switch In',
        value: switchSelectionData.amount.toString(),
        isNew: true,
        originalActivityId: undefined,
        linkedFundId: originFundId // Store the linked fund ID
      };
      
      // Update the switch-out edit to include the linked fund
      const switchOutIndex = pendingEdits.findIndex(
        edit => edit.fundId === originFundId && 
                edit.month === switchSelectionData.month && 
                edit.activityType === 'Switch Out'
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
                  edit.activityType === 'Switch In'
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
        activityType: 'Switch Out',
        value: switchSelectionData.amount.toString(),
        isNew: true,
        originalActivityId: undefined,
        linkedFundId: destinationFundId // Store the linked fund ID
      };
      
      // Update the switch-in edit to include the linked fund
      const switchInIndex = pendingEdits.findIndex(
        edit => edit.fundId === destinationFundId && 
                edit.month === switchSelectionData.month && 
                edit.activityType === 'Switch In'
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
                  edit.activityType === 'Switch Out'
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

  // Convert a month string to a display format
  const formatMonth = (monthStr: string): string => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('en-GB', { year: 'numeric', month: 'short' }).toUpperCase();
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
      // Case 1: Deletion (empty values)
      if (amount < 0) {
        // Delete Switch In activity if it exists
        if (switchIn?.originalActivityId) {
          await api.delete(`holding_activity_logs/${switchIn.originalActivityId}`);
        }
        
        // Delete Switch Out activity if it exists
        if (switchOut?.originalActivityId) {
          await api.delete(`holding_activity_logs/${switchOut.originalActivityId}`);
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
        ? getActivity(targetId, month, 'Switch In')
        : null;
      
      const existingSwitchOut = !switchOut?.originalActivityId 
        ? getActivity(sourceId, month, 'Switch Out')
        : null;
      
      // For new switch activities
      if ((!switchIn?.originalActivityId && !existingSwitchIn) || 
          (!switchOut?.originalActivityId && !existingSwitchOut)) {
        
        // Step 1: Create Switch Out first with skip_fund_update=true (don't update fund amounts yet)
        const switchOutActivity = {
          portfolio_fund_id: sourceId,
          account_holding_id: accountHoldingId,
          activity_type: convertActivityTypeForBackend('Switch Out'),
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
          activity_type: convertActivityTypeForBackend('Switch In'),
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
            activity_type: convertActivityTypeForBackend('Switch Out'),
            activity_timestamp: formattedDate,
            amount: amount.toString(),
            related_fund: targetId
          };
          
          await api.post('holding_activity_logs?skip_fund_update=true', switchOutActivity);
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
            activity_type: convertActivityTypeForBackend('Switch In'),
            activity_timestamp: formattedDate,
            amount: amount.toString(),
            related_fund: sourceId
          };
          
          await api.post('holding_activity_logs', switchInActivity);
        }
      }
      
    } catch (err: any) {
      throw err;
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
        if (edit.activityType !== 'Switch In' && edit.activityType !== 'Switch Out') {
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
        if (edit.activityType === 'Switch In') {
          switchPairs[pairKey].switchIn = edit;
        } else {
          switchPairs[pairKey].switchOut = edit;
        }
      });
      
      // 2. Process all regular (non-switch) activities first
      for (const edit of nonEmptyEdits) {
        // Skip switch activities as they'll be processed together
        if (edit.activityType === 'Switch In' || edit.activityType === 'Switch Out') {
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
            await api.post('holding_activity_logs', activityData);
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
      for (const edit of nonEmptyEdits) {
        if (edit.activityType !== 'Current Value') continue;
        
        try {
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
          
          // If both edits are empty, delete both activities
          if ((!switchIn || switchIn.value.trim() === '') && 
              (!switchOut || switchOut.value.trim() === '')) {
            // Delete both activities if they exist
            if (switchIn?.originalActivityId) {
              await api.delete(`holding_activity_logs/${switchIn.originalActivityId}`);
            }
            
            if (switchOut?.originalActivityId) {
              await api.delete(`holding_activity_logs/${switchOut.originalActivityId}`);
            }
            
            // Also check for existing activities that might not be in the edits
            const sourceId = switchOut?.fundId || switchIn?.linkedFundId;
            const targetId = switchIn?.fundId || switchOut?.linkedFundId;
            
            if (sourceId && targetId) {
              const month = (switchIn || switchOut)?.month || '';
              
              const existingSwitchIn = getActivity(targetId, month, 'Switch In');
              if (existingSwitchIn?.id && existingSwitchIn.id !== switchIn?.originalActivityId) {
                await api.delete(`holding_activity_logs/${existingSwitchIn.id}`);
              }
              
              const existingSwitchOut = getActivity(sourceId, month, 'Switch Out');
              if (existingSwitchOut?.id && existingSwitchOut.id !== switchOut?.originalActivityId) {
                await api.delete(`holding_activity_logs/${existingSwitchOut.id}`);
              }
            }
          }
          // If at least one edit has a value, process the pair
          else if ((switchIn && switchIn.value.trim() !== '') || 
                   (switchOut && switchOut.value.trim() !== '')) {
            // Use the non-empty value, or if both have values, prefer the switch in value
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
      for (const edit of emptyEdits) {
        // Skip switch activities as they were processed together
        if (edit.activityType === 'Switch In' || edit.activityType === 'Switch Out') {
          continue;
        }
        
        // Skip "Current Value" activities as they're handled differently
        if (edit.activityType === 'Current Value') {
          // Delete valuation if it exists
          const valuation = getFundValuation(edit.fundId, edit.month);
          if (valuation) {
            await api.delete(`fund_valuations/${valuation.id}`);
          }
          continue;
        }
        
        try {
          if (edit.originalActivityId) {
            // Delete existing activity
            await api.delete(`holding_activity_logs/${edit.originalActivityId}`);
          }
        } catch (err: any) {
          setError(err.message || 'Failed to delete activity');
          setIsSubmitting(false);
          return;
        }
      }
      
      // Clear pending edits and refresh data
      setPendingEdits([]);
      onActivitiesUpdated();
      
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving changes');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get class for cell
  const getCellClass = (fundId: number, month: string, activityType: string, isFirstColumn: boolean = false): string => {
    // Base class for all cells
    let baseClass = "px-4 py-2 border box-border min-w-[100px] max-w-none";
    
    // Check if there's a pending edit for this cell
    const pendingEdit = pendingEdits.find(
      edit => edit.fundId === fundId && 
              edit.month === month && 
              edit.activityType === activityType
    );
    
    // Add edit indicator if there's a pending edit
    if (pendingEdit) {
      baseClass += " bg-yellow-50";
    }
    
    // Add special class for switch cells with linked funds
    if ((activityType === 'Switch In' || activityType === 'Switch Out') && 
        pendingEdit && pendingEdit.linkedFundId) {
      baseClass += " border-blue-300 border-2";
    }
    
    // Add subtle indicator for Current Value cells but maintain same base color
    if (activityType === 'Current Value') {
      baseClass += " hover:bg-blue-50 border-b border-blue-200";
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
    // Only handle arrow keys
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      return;
    }
    
    e.preventDefault(); // Prevent default behavior (scrolling)
    
    const fundIndex = funds.findIndex(f => f.id === fundId);
    const activityTypeIndex = ACTIVITY_TYPES.indexOf(activityType);
    
    // Calculate the new cell to focus based on arrow key
    let newFundIndex = fundIndex;
    let newActivityTypeIndex = activityTypeIndex;
    let newMonthIndex = monthIndex;
    
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
        // Move down one activity type, or to the next fund's first activity
        if (activityTypeIndex < ACTIVITY_TYPES.length - 1) {
          newActivityTypeIndex++;
        } else if (fundIndex < funds.length - 1) {
          newFundIndex++;
          newActivityTypeIndex = 0;
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
    
    // Focus the new cell if it's different
    if (
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
            
            // Get the scrollable container
            const scrollContainer = newCell.closest('.overflow-x-auto');
            if (scrollContainer) {
              // Get cell and container dimensions
              const cellRect = newCell.getBoundingClientRect();
              const containerRect = scrollContainer.getBoundingClientRect();
              
              // Different scrolling logic based on direction
              switch (e.key) {
                case 'ArrowLeft': {
                  // For left navigation, ensure the cell is fully visible
                  // We need a larger padding for left movement to account for the sticky first column
                  const firstColumnWidth = 200; // Approximate width of the first column
                  const isPartiallyVisible = cellRect.left < (containerRect.left + firstColumnWidth);
                  
                  if (isPartiallyVisible) {
                    // Scroll to ensure the cell is visible with padding
                    const scrollOffset = scrollContainer.scrollLeft - (containerRect.left + firstColumnWidth - cellRect.left + 20);
                    scrollContainer.scrollTo({
                      left: Math.max(0, scrollOffset),
                      behavior: 'smooth'
                    });
                  }
                  break;
                }
                case 'ArrowRight': {
                  // For right navigation, check if cell is partially out of view
                  const isPartiallyVisible = cellRect.right > (containerRect.right - 20);
                  
                  if (isPartiallyVisible) {
                    // Scroll to ensure the cell is visible with padding
                    const scrollOffset = scrollContainer.scrollLeft + (cellRect.right - containerRect.right + 20);
                    scrollContainer.scrollTo({
                      left: scrollOffset,
                      behavior: 'smooth'
                    });
                  }
                  break;
                }
                default: {
                  // For up/down navigation, use standard scrollIntoView
                  newCell.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest',
                    inline: 'nearest'
                  });
                }
              }
            }
          }
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
              activityType === 'Switch In') {
            return total + parseFloat(cellValue);
          } else if (activityType === 'Withdrawal' || activityType === 'Switch Out') {
            return total - parseFloat(cellValue);
          }
        }
        return total;
      }, 0);
  };

  // Format the total for display with correct signs
  const formatTotal = (total: number): string => {
    return total === 0 ? '' : formatCurrency(total);
  };

  return (
    <>
      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Monthly Activities</h3>
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
        
        <div className="overflow-x-auto border rounded-lg shadow-sm max-w-full" style={{ scrollBehavior: 'smooth' }}>
          <div className="relative">
            <table className="w-full divide-y divide-gray-200 table-auto relative sticky-table">
              <colgroup>
                <col className="w-48 sticky left-0 z-10" />
                {months.map((month, index) => (
                  <col key={`col-${month}`} className="w-auto" />
                ))}
              </colgroup>
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 sticky left-0 z-10 bg-gray-50 shadow-[5px_0_5px_-5px_rgba(0,0,0,0.1)]">Fund / Activity</th>
                  {months.map(month => (
                    <th key={month} className="px-4 py-3 text-center text-sm font-medium text-gray-700 whitespace-nowrap">
                      {formatMonth(month)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {funds.map(fund => (
                  <React.Fragment key={fund.id}>
                    {/* Fund name row */}
                    <tr className="bg-gray-50 border-t border-gray-200">
                      <td className="px-4 py-3 font-semibold text-gray-900 sticky left-0 z-10 bg-gray-50 shadow-[5px_0_5px_-5px_rgba(0,0,0,0.1)]">
                        {fund.fund_name}
                      </td>
                      {months.map(month => (
                        <td key={`fund-header-${fund.id}-${month}`} className="bg-gray-50"></td>
                      ))}
                    </tr>
                    
                    {/* Activity type rows */}
                    {ACTIVITY_TYPES.map(activityType => (
                      <tr key={`${fund.id}-${activityType}`}>
                        <td className="px-4 py-2 font-medium text-gray-500 sticky left-0 z-10 bg-white shadow-[5px_0_5px_-5px_rgba(0,0,0,0.1)]">
                          {formatActivityType(activityType)}
                        </td>
                        {months.map((month, monthIndex) => {
                          const cellValue = getCellValue(fund.id, month, activityType);
                          const linkedFundName = getLinkedFundName(fund.id, month, activityType);
                          
                          return (
                            <td 
                              key={`${fund.id}-${month}-${activityType}`} 
                              className={getCellClass(fund.id, month, activityType, false)}
                              title={linkedFundName ? 
                                `${activityType === 'Switch In' ? 'From' : 'To'}: ${linkedFundName}` : 
                                undefined}
                              id={`cell-${fund.id}-${month}-${activityType}`}
                              onClick={() => {
                                // Update focused cell state
                                setFocusedCell({
                                  fundId: fund.id,
                                  activityType,
                                  monthIndex: months.indexOf(month)
                                });
                                // Focus the input element
                                const input = document.getElementById(`cell-${fund.id}-${month}-${activityType}`)?.querySelector('input');
                                if (input && !input.disabled) {
                                  input.focus();
                                }
                              }}
                            >
                              <div className="flex justify-center items-center">
                                <input
                                  type="text"
                                  className="focus:outline-none bg-transparent text-center border-0 shadow-none w-auto min-w-0"
                                  value={cellValue}
                                  disabled={isSubmitting}
                                  onChange={(e) => {
                                    handleCellValueChange(fund.id, month, activityType, e.target.value);
                                    // Adjust width to fit content
                                    e.target.style.width = (e.target.value.length + 2) + 'ch';
                                  }}
                                  onBlur={(e) => handleCellBlur(fund.id, month, activityType)}
                                  onKeyDown={(e) => handleKeyDown(e, fund.id, activityType, monthIndex)}
                                  tabIndex={0}
                                  style={{
                                    border: 'none',
                                    outline: 'none',
                                    boxShadow: 'none',
                                    background: 'transparent',
                                    padding: '0 2px',
                                    width: (cellValue.length + 2) + 'ch',
                                    minWidth: '4ch'
                                  }}
                                />
                              </div>
                              {linkedFundName && (
                                <div className="text-xs text-blue-600 text-center mt-1">
                                  {activityType === 'Switch In' ? 'From' : 'To'}: {linkedFundName}
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                    
                    {/* Total row for each fund */}
                    <tr className="bg-gray-100 border-t border-gray-200">
                      <td className="px-4 py-2 font-semibold text-red-600 sticky left-0 z-10 bg-gray-100 shadow-[5px_0_5px_-5px_rgba(0,0,0,0.1)]">
                        Total
                      </td>
                      {months.map(month => {
                        const total = calculateFundMonthTotal(fund.id, month);
                        const formattedTotal = formatTotal(total);
                        
                        return (
                          <td 
                            key={`total-${fund.id}-${month}`} 
                            className="px-4 py-2 text-center font-semibold text-red-600"
                          >
                            {formattedTotal}
                          </td>
                        );
                      })}
                    </tr>
                  </React.Fragment>
                ))}
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
    </>
  );
};

export default EditableMonthlyActivitiesTable; 