import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';

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

interface BulkActivityData {
  [fundId: number]: {
    [activityType: string]: string;
  };
}

interface BulkMonthActivitiesModalProps {
  isOpen: boolean;
  onClose: () => void;
  month: string;
  funds: Fund[];
  onSave: (bulkData: any) => void;
  getCurrentValue: (fundId: number, activityType: string) => string;
}

interface FocusedCell {
  fundIndex: number;
  activityIndex: number;
}

// Custom styles to override global CSS
const modalStyles = `
  .bulk-activity-modal * {
    box-sizing: border-box !important;
  }
  
  .bulk-activity-modal .bulk-activity-modal-table {
    border-collapse: separate !important;
    border-spacing: 0 !important;
    background-color: white !important;
  }
  
  .bulk-activity-modal .bulk-activity-modal-thead {
    background-color: rgb(249 250 251) !important;
  }
  
  .bulk-activity-modal .bulk-activity-modal-th {
    background-color: rgb(249 250 251) !important;
    border-bottom: 2px solid rgb(209 213 219) !important;
    padding: 8px 12px !important;
    font-size: 11px !important;
    font-weight: 500 !important;
    color: rgb(107 114 128) !important;
    text-transform: uppercase !important;
    letter-spacing: 0.05em !important;
  }
  
  .bulk-activity-modal .bulk-activity-modal-tbody {
    background-color: white !important;
  }
  
  .bulk-activity-modal .bulk-activity-modal-row {
    background-color: white !important;
    transition: background-color 0.15s ease-in-out !important;
  }
  
  .bulk-activity-modal .bulk-activity-modal-row:hover,
  .bulk-activity-modal .bulk-activity-modal-row:focus-within,
  .bulk-activity-modal .bulk-activity-modal-row.focused-row,
  .bulk-activity-modal tbody .bulk-activity-modal-row:focus-within,
  .bulk-activity-modal tbody .bulk-activity-modal-row.focused-row {
    background-color: rgb(237 233 254) !important; /* Medium purple hover, focus, and keyboard navigation */
  }

  /* Additional debug styles to ensure visibility */
  .bulk-activity-modal .bulk-activity-modal-row:has(input:focus) {
    background-color: rgb(237 233 254) !important;
    border: 2px solid rgb(139 92 246) !important;
  }

  /* Data attribute based styling for more reliability */
  .bulk-activity-modal .bulk-activity-modal-row[data-focused-row="true"] {
    background-color: rgb(237 233 254) !important;
  }

  /* Force override any other background colors */
  .bulk-activity-modal tbody tr.bulk-activity-modal-row.focused-row,
  .bulk-activity-modal tbody tr.bulk-activity-modal-row[data-focused-row="true"] {
    background-color: rgb(237 233 254) !important;
  }

  /* Ultra high specificity rule */
  .bulk-activity-modal table tbody tr.bulk-activity-modal-row[data-focused-row="true"] {
    background-color: rgb(237 233 254) !important;
    background: rgb(237 233 254) !important;
  }
  
  .bulk-activity-modal .bulk-activity-modal-td {
    border-bottom: 1px solid rgb(209 213 219) !important;
    padding: 6px 12px !important;
    font-size: 11px !important;
  }
  
  .bulk-activity-modal .bulk-activity-modal-input {
    border: 1px solid rgb(209 213 219) !important;
    border-radius: 4px !important;
    padding: 4px 8px !important;
    font-size: 11px !important;
    text-align: center !important;
    background-color: white !important;
    transition: all 0.15s ease-in-out !important;
  }
  
  .bulk-activity-modal .bulk-activity-modal-input:hover {
    background-color: rgb(250 245 255) !important; /* Light purple input hover */
    border-color: rgb(156 163 175) !important;
  }
  
  .bulk-activity-modal .bulk-activity-modal-input:focus {
    outline: none !important;
    border-color: rgb(59 130 246) !important;
    box-shadow: 0 0 0 1px rgb(59 130 246) !important;
    background-color: white !important;
  }
  
  .bulk-activity-modal .bulk-activity-modal-totals-row {
    font-weight: 600 !important;
    transition: background-color 0.15s ease-in-out !important;
  }

  .bulk-activity-modal .bulk-activity-modal-totals-td {
    padding: 8px 12px !important;
    font-size: 11px !important;
    font-weight: 600 !important;
  }
`;

// Add styles to document head
if (typeof document !== 'undefined') {
  const styleElement = document.getElementById('bulk-modal-styles');
  if (!styleElement) {
    const style = document.createElement('style');
    style.id = 'bulk-modal-styles';
    style.innerHTML = modalStyles;
    document.head.appendChild(style);
  }
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

const BulkMonthActivitiesModal: React.FC<BulkMonthActivitiesModalProps> = ({
  isOpen,
  onClose,
  month,
  funds,
  onSave,
  getCurrentValue
}) => {
  const [bulkData, setBulkData] = useState<BulkActivityData>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [focusedCell, setFocusedCell] = useState<{ fundIndex: number; activityIndex: number } | null>(null);
  const [selectedActivities, setSelectedActivities] = useState<Set<string>>(new Set());
  const [inputErrors, setInputErrors] = useState<{ [key: string]: string }>({});

  // Handle case where funds might be undefined/null and filter active funds
  const activeFunds = funds ? funds.filter(fund => 
    fund.isActive !== false && !fund.isInactiveBreakdown
  ) : [];

  // Convert UI-friendly activity types to backend format (same as main table)
  const convertActivityTypeForBackend = (uiActivityType: string): string => {
    switch (uiActivityType) {
          case 'ProductSwitchIn': return 'ProductSwitchIn';
    case 'ProductSwitchOut': return 'ProductSwitchOut';
    case 'FundSwitchIn': return 'FundSwitchIn';
    case 'FundSwitchOut': return 'FundSwitchOut';
      case 'Current Value': return 'Valuation';
      default: return uiActivityType;
    }
  };

  // Initialize bulk data when modal opens or month changes
  useEffect(() => {
    if (isOpen) {
      const initialData: BulkActivityData = {};
      
      activeFunds.forEach(fund => {
        initialData[fund.id] = {};
        ACTIVITY_TYPES.forEach(activityType => {
          initialData[fund.id][activityType] = getCurrentValue(fund.id, activityType) || '';
        });
      });
      
      setBulkData(initialData);
      setHasChanges(false);
      
      // Set initial focus to first cell and focus it
      setFocusedCell({ fundIndex: 0, activityIndex: 0 });
      
      // Focus the first input field after a short delay
      setTimeout(() => {
        const firstInput = document.getElementById('bulk-input-0-0') as HTMLInputElement;
        if (firstInput) {
          firstInput.focus();
        }
      }, 100);
    }
  }, [isOpen, month, funds, getCurrentValue]);

  // Clear focused cell when activities change to prevent focus issues
  useEffect(() => {
    setFocusedCell(null);
  }, [selectedActivities]);

  const formatMonth = (monthStr: string): string => {
    if (!monthStr) return '';
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('en-GB', { year: 'numeric', month: 'long' });
  };

  // Format activity type for display (same as main table)
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

  // Format currency for display with comma separators and no abbreviations
  const formatCurrency = (value: number): string => {
    // Use toLocaleString with UK formatting for comma separators
    // Round to 2 decimal places for consistent display
    const formatted = value.toLocaleString('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2 // Round all values to 2 decimal places
    });
    
    return formatted;
  };

  // Enhanced expression evaluation with validation (adapted from main table)
  const evaluateExpression = (expression: string, fundId: number, activityType: string): { result: string; error: string | null } => {
    // Special case: if expression is "0", we should keep it as "0"
    if (expression === "0") return { result: "0", error: null };
    
    // If it's empty, return as is
    if (!expression || expression.trim() === '') return { result: '', error: null };
    
    // Check for alphabetic characters first (a-z, A-Z)
    const alphabeticChars = expression.match(/[a-zA-Z]/g);
    if (alphabeticChars) {
      const uniqueAlphabetic = [...new Set(alphabeticChars)].join(', ');
      return { result: expression, error: `Letters not allowed: ${uniqueAlphabetic}` };
    }
    
    // Check for other invalid characters (excluding numbers, operators, decimals, parentheses, spaces)
    const invalidChars = expression.match(/[^0-9.+\-*/()\\s]/g);
    if (invalidChars) {
      const uniqueInvalidChars = [...new Set(invalidChars)].join(', ');
      return { result: expression, error: `Invalid characters: ${uniqueInvalidChars}` };
    }
    
    // If it's already a valid number, validate it's not negative
    if (!isNaN(Number(expression))) {
      const num = Number(expression);
      if (num < 0) {
        return { result: expression, error: "Values cannot be negative" };
      }
      return { result: expression, error: null };
    }
    
    try {
      // Check if the input contains any mathematical operators
      if (/[+\-*/()]/.test(expression)) {
        // Clean the expression to ensure it's safe to evaluate
        // Only allow numbers, operators, decimals, and parentheses
        const cleanExpression = expression.replace(/[^0-9.+\-*/()]/g, '');
        
        // Check if cleaning removed characters (would indicate invalid input)
        if (cleanExpression.length !== expression.replace(/\s/g, '').length) {
          return { result: expression, error: "Contains invalid characters for mathematical expression" };
        }
        
        // Check for division by zero before evaluation
        if (/\/\s*0(?![0-9.])/.test(cleanExpression)) {
          return { result: expression, error: "Cannot divide by zero" };
        }
        
        // Check for empty operators (like 5++3, 5**3, etc.)
        if (/[+\-*/]{2,}/.test(cleanExpression.replace(/\s/g, ''))) {
          return { result: expression, error: "Invalid operator sequence" };
        }
        
        // Check for operators at beginning or end
        if (/^[+\-*/]/.test(cleanExpression.trim()) || /[+\-*/]$/.test(cleanExpression.trim())) {
          return { result: expression, error: "Expression cannot start or end with an operator" };
        }
        
        // Use Function constructor to safely evaluate the expression
        // This avoids using eval() which can be dangerous
        const result = new Function(`return ${cleanExpression}`)();
        
        // Check if the result is a valid number
        if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
          // Check for negative results
          if (result < 0) {
            return { result: expression, error: "Result cannot be negative" };
          }
          
          // Handle zero case explicitly
          if (result === 0) return { result: "0", error: null };
          
          // Check if the original expression had a decimal point
          const hadDecimalPoint = expression.includes('.');
          
          // Preserve decimal format if the original expression had one
          // or if the result has a fractional part
          if (hadDecimalPoint || result % 1 !== 0) {
            // Format with 2 decimal places if result has a fractional part
            const formatted = result % 1 !== 0 ? result.toFixed(2) : result.toFixed(1);
            return { result: formatted, error: null };
          } else {
            // Return as an integer otherwise
            return { result: result.toFixed(0), error: null };
          }
        } else {
          return { result: expression, error: "Invalid mathematical expression" };
        }
      }
      
      // If no operators, return the original expression
      return { result: expression, error: null };
    } catch (error) {
      // If evaluation fails (syntax error), return error
      return { result: expression, error: "Invalid mathematical expression" };
    }
  };

  // Generate unique key for input field errors
  const getInputKey = (fundId: number, activityType: string): string => {
    return `${fundId}-${activityType}`;
  };

  // Handle input blur with expression evaluation
  const handleInputBlur = (fundId: number, activityType: string) => {
    const currentValue = bulkData[fundId]?.[activityType] || '';
    const inputKey = getInputKey(fundId, activityType);
    
    if (currentValue.trim()) {
      const { result, error } = evaluateExpression(currentValue, fundId, activityType);
      
      if (error) {
        // Set error state but keep original value
        setInputErrors(prev => ({ ...prev, [inputKey]: error }));
      } else {
        // Clear error and update value if it changed
        setInputErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[inputKey];
          return newErrors;
        });
        
        if (result !== currentValue) {
          setBulkData(prev => ({
            ...prev,
            [fundId]: {
              ...prev[fundId],
              [activityType]: result
            }
          }));
        }
      }
    } else {
      // Clear error for empty values
      setInputErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[inputKey];
        return newErrors;
      });
    }
  };

  const handleValueChange = (fundId: number, activityType: string, value: string) => {
    setBulkData(prev => ({
      ...prev,
      [fundId]: {
        ...prev[fundId],
        [activityType]: value
      }
    }));
    setHasChanges(true);
    
    // Clear any existing error when user starts typing
    const inputKey = getInputKey(fundId, activityType);
    setInputErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[inputKey];
      return newErrors;
    });
  };

  const handleSave = () => {
    // Check for input validation errors first
    if (Object.keys(inputErrors).length > 0) {
      alert('Please fix all validation errors before saving.');
      return;
    }

    // Check if switch activities are balanced before saving
    const { hasWarning } = getSwitchBalanceWarning();
    if (hasWarning) {
              alert('Cannot save: FundSwitchIn and FundSwitchOut amounts must match.');
      return;
    }

    // Only include funds and activities that have changed
    const changedData: BulkActivityData = {};
    
    Object.keys(bulkData).forEach(fundIdStr => {
      const fundId = parseInt(fundIdStr);
      Object.keys(bulkData[fundId]).forEach(activityType => {
        const currentValue = bulkData[fundId][activityType];
        const originalValue = getCurrentValue(fundId, activityType) || '';
        
        if (currentValue !== originalValue) {
          if (!changedData[fundId]) {
            changedData[fundId] = {};
          }
          // Keep activity types in UI format for compatibility with main table
          changedData[fundId][activityType] = currentValue;
          
          // Track changes for bulk activity processing
        }
      });
    });
    
    onSave(changedData);
    onClose();
  };

  const handleCancel = () => {
    if (hasChanges) {
      if (confirm('You have unsaved changes. Are you sure you want to cancel?')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    fundIndex: number,
    activityIndex: number
  ) => {
    // Handle Enter key for expression evaluation
    if (e.key === 'Enter') {
      e.preventDefault();
      
      // Get the current fund and activity type
      const fund = activeFunds[fundIndex];
      const activityType = getDisplayedActivities()[activityIndex];
      
      // Evaluate the current expression
      handleInputBlur(fund.id, activityType);
      
      // Then move to next cell
      let newFundIndex = fundIndex;
      let newActivityIndex = activityIndex;
      
      // Move down one fund, stay in same activity column
      if (fundIndex < activeFunds.length - 1) {
        newFundIndex = fundIndex + 1;
      } else {
        // Wrap to top fund
        newFundIndex = 0;
      }
      
      // Update focused cell state
      setFocusedCell({
        fundIndex: newFundIndex,
        activityIndex: newActivityIndex
      });
      
      // Focus the new input field
      setTimeout(() => {
        const newInput = document.getElementById(`bulk-input-${newFundIndex}-${newActivityIndex}`) as HTMLInputElement;
        if (newInput) {
          newInput.focus();
          newInput.select(); // Select all text for easy replacement
        }
      }, 0);
      
      return;
    }

    // Only handle arrow keys and Tab for navigation
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
      return;
    }

    // For Tab key, let the default behavior work
    if (e.key === 'Tab') {
      return;
    }

    e.preventDefault(); // Prevent default behavior (scrolling)

    let newFundIndex = fundIndex;
    let newActivityIndex = activityIndex;

    switch (e.key) {
      case 'ArrowUp':
        // Move up one fund, stay in same activity column
        if (fundIndex > 0) {
          newFundIndex = fundIndex - 1;
        } else {
          // Wrap to bottom fund
          newFundIndex = activeFunds.length - 1;
        }
        break;
      case 'ArrowDown':
        // Move down one fund, stay in same activity column
        if (fundIndex < activeFunds.length - 1) {
          newFundIndex = fundIndex + 1;
        } else {
          // Wrap to top fund
          newFundIndex = 0;
        }
        break;
      case 'ArrowLeft':
        // Move to previous activity type, same fund
        if (activityIndex > 0) {
          newActivityIndex = activityIndex - 1;
        } else {
          // Wrap to last activity type
          newActivityIndex = getDisplayedActivities().length - 1;
        }
        break;
      case 'ArrowRight':
        // Move to next activity type, same fund
        if (activityIndex < getDisplayedActivities().length - 1) {
          newActivityIndex = activityIndex + 1;
        } else {
          // Wrap to first activity type
          newActivityIndex = 0;
        }
        break;
    }

    // Update focused cell state
    setFocusedCell({
      fundIndex: newFundIndex,
      activityIndex: newActivityIndex
    });

    // Focus the new input field after a short delay
    setTimeout(() => {
      const newInput = document.getElementById(`bulk-input-${newFundIndex}-${newActivityIndex}`) as HTMLInputElement;
      if (newInput) {
        newInput.focus();
        newInput.select(); // Select all text for easy replacement
      }
    }, 0);
  };

  // Calculate totals for each activity type
  const calculateActivityTotal = (activityType: string): number => {
    return activeFunds.reduce((total, fund) => {
      const value = bulkData[fund.id]?.[activityType] || '';
      const numValue = parseFloat(value);
      
      if (!isNaN(numValue)) {
        // Withdrawals should be subtracted from totals
        if (activityType === 'Withdrawal') {
          return total - numValue;
        } 
        // Switch activities are shown as total amounts (neutral for net calculations)
        else if (activityType === 'FundSwitchIn' || activityType === 'FundSwitchOut') {
          return total + numValue;
        } 
        // All other activities including Current Value/Valuations are added to totals
        else {
          return total + numValue;
        }
      }
      return total;
    }, 0);
  };

  // Check if switch activities are balanced
  const getSwitchBalanceWarning = (): { hasWarning: boolean; message: string } => {
    const warnings: string[] = [];

    // Check Fund Switch balance
    const hasFundSwitchIn = selectedActivities.has('FundSwitchIn');
    const hasFundSwitchOut = selectedActivities.has('FundSwitchOut');

    if (hasFundSwitchIn && hasFundSwitchOut) {
      const fundSwitchOutTotal = calculateActivityTotal('FundSwitchOut');
      const fundSwitchInTotal = calculateActivityTotal('FundSwitchIn');

      // Use tolerance-based comparison to handle floating-point precision issues
      // 0.01 tolerance (1 penny) is appropriate for financial calculations
      const tolerance = 0.01;
      const difference = Math.abs(fundSwitchOutTotal - fundSwitchInTotal);

      // Only show warning if both have values and they don't match within tolerance
      if ((fundSwitchOutTotal > 0 || fundSwitchInTotal > 0) && difference > tolerance) {
        warnings.push(`Fund Switch activities are unbalanced. Difference: ${formatCurrency(difference)}`);
      }
    }

    // Portfolio balance validation logic

    if (warnings.length > 0) {
      return {
        hasWarning: true,
        message: warnings.join(' | ')
      };
    }

    return { hasWarning: false, message: '' };
  };

  // Check if totals row should show green (balanced transfers)
  const shouldShowGreenTotals = (): boolean => {
    // Only check if exactly 2 activities are selected
    if (selectedActivities.size !== 2) {
      return false;
    }

    const activitiesArray = Array.from(selectedActivities);
    const tolerance = 0.01;

    // Check if it's ProductSwitchIn and ProductSwitchOut
    const hasProductSwitchPair =
      activitiesArray.includes('ProductSwitchIn') &&
      activitiesArray.includes('ProductSwitchOut');

    if (hasProductSwitchPair) {
      const productSwitchInTotal = calculateActivityTotal('ProductSwitchIn');
      const productSwitchOutTotal = calculateActivityTotal('ProductSwitchOut');
      const difference = Math.abs(productSwitchInTotal - productSwitchOutTotal);

      // Return true if both have values and they match within tolerance
      return (productSwitchInTotal > 0 || productSwitchOutTotal > 0) && difference <= tolerance;
    }

    // Check if it's FundSwitchIn and FundSwitchOut
    const hasFundSwitchPair =
      activitiesArray.includes('FundSwitchIn') &&
      activitiesArray.includes('FundSwitchOut');

    if (hasFundSwitchPair) {
      const fundSwitchInTotal = calculateActivityTotal('FundSwitchIn');
      const fundSwitchOutTotal = calculateActivityTotal('FundSwitchOut');
      const difference = Math.abs(fundSwitchInTotal - fundSwitchOutTotal);

      // Return true if both have values and they match within tolerance
      return (fundSwitchInTotal > 0 || fundSwitchOutTotal > 0) && difference <= tolerance;
    }

    return false;
  };

  // Handle activity selection
  const toggleActivity = (activityType: string) => {
    setSelectedActivities(prev => {
      const newSet = new Set(prev);
      if (newSet.has(activityType)) {
        newSet.delete(activityType);
      } else {
        newSet.add(activityType);
      }
      return newSet;
    });
  };

  // Toggle all activities
  const toggleAllActivities = () => {
    if (selectedActivities.size === ACTIVITY_TYPES.length) {
      setSelectedActivities(new Set());
    } else {
      setSelectedActivities(new Set(ACTIVITY_TYPES));
    }
  };

  // Get filtered activity types based on selection
  const getDisplayedActivities = () => {
    return ACTIVITY_TYPES.filter(activity => selectedActivities.has(activity));
  };

  // Dynamic width calculation functions for tiered scaling
  const getInputWidth = (activityCount: number): number => {
    if (activityCount === 1 || activityCount === 2) {
      return 100; // 100px for 1 or 2 activities
    } else if (activityCount >= 3 && activityCount <= 6) {
      return 110; // Comfortable medium size for 3-6 activities
    } else if (activityCount >= 7 && activityCount <= 8) {
      return 100; // Efficient size for 7-8 activities (all fit without scrolling)
    } else {
      return 80; // Compact for 9+ activities
    }
  };

  const getColumnWidth = (activityCount: number): number => {
    return getInputWidth(activityCount) + 24; // +24px for px-3 padding on both sides
  };

  const getInputWidthClass = (activityCount: number): string => {
    const width = getInputWidth(activityCount);
    return `w-[${width}px]`;
  };

  const getColumnWidthClass = (activityCount: number): string => {
    const width = getColumnWidth(activityCount);
    return `w-[${width}px]`;
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleCancel}>
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
          <div className="flex min-h-full items-center justify-center p-2 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="bulk-activity-modal w-full max-w-[95vw] transform overflow-hidden rounded-lg bg-white p-6 text-left align-middle shadow-xl transition-all">
                {/* Modal Title */}
                <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 mb-4">
                  Bulk Edit Activities for {formatMonth(month)}
                </Dialog.Title>

                {/* Activity Selection */}
                <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-medium text-gray-700 uppercase tracking-wide">Select Activities:</h4>
                    <button
                      type="button"
                      onClick={toggleAllActivities}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded hover:bg-blue-50"
                    >
                      {selectedActivities.size === ACTIVITY_TYPES.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                  
                  <div className="flex flex-wrap gap-1">
                    {ACTIVITY_TYPES.map(activityType => (
                      <button
                        key={activityType}
                        type="button"
                        onClick={() => toggleActivity(activityType)}
                        className={`px-2 py-1 text-xs font-medium rounded transition-colors duration-150 ${
                          selectedActivities.has(activityType)
                            ? 'bg-blue-100 text-blue-800 border border-blue-300 hover:bg-blue-200'
                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {formatActivityType(activityType)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Table Container - Full Height Display */}
                <div className="border border-gray-300 rounded-lg bg-white">
                  {selectedActivities.size > 0 ? (
                      <div className="overflow-x-auto">
                      <table className="bulk-activity-modal-table w-full border-separate border-spacing-0 !divide-y-0">
                        <thead className="bulk-activity-modal-thead bg-gray-50 sticky top-0">
                          <tr className="bulk-activity-modal-header-row border-b-2 border-gray-300">
                            <th className="bulk-activity-modal-th px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48 bg-gray-50 border-b-2 border-gray-300">
                                Fund Name
                              </th>
                              {getDisplayedActivities().map(activityType => (
                                <th
                                  key={activityType}
                                className={`bulk-activity-modal-th px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 border-b-2 border-gray-300 ${getColumnWidthClass(getDisplayedActivities().length)}`}
                                >
                                  {formatActivityType(activityType)}
                                </th>
                              ))}
                            </tr>
                          </thead>
                        <tbody className="bulk-activity-modal-tbody bg-white !divide-y-0">
                            {activeFunds.map((fund, index) => (
                            <tr 
                              key={fund.id} 
                              data-focused-row={focusedCell?.fundIndex === index ? 'true' : 'false'}
                              className={`bulk-activity-modal-row transition-colors duration-150 border-b border-gray-300 ${
                                focusedCell?.fundIndex === index ? 'focused-row' : ''
                              } ${index === 0 ? 'border-t-2 border-gray-300' : ''}`}
                            >
                              <td className="bulk-activity-modal-td px-4 py-1.5 text-xs font-medium text-gray-900 truncate border-b border-gray-300" title={fund.fund_name}>
                                  {fund.fund_name}
                                </td>
                                {getDisplayedActivities().map(activityType => (
                                <td key={`${fund.id}-${activityType}`} className="bulk-activity-modal-td px-3 py-1.5 text-center border-b border-gray-300">
                                  <input
                                    type="text"
                                    id={`bulk-input-${index}-${getDisplayedActivities().indexOf(activityType)}`}
                                    autoComplete="off"
                                    className={`bulk-activity-modal-input ${getInputWidthClass(getDisplayedActivities().length)} px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 text-center transition-colors duration-150 ${
                                      inputErrors[getInputKey(fund.id, activityType)]
                                        ? 'border-red-500 bg-red-50 focus:ring-red-500 focus:border-red-500' // Error state
                                        : focusedCell?.fundIndex === index && focusedCell?.activityIndex === getDisplayedActivities().indexOf(activityType)
                                          ? 'border-blue-500 ring-1 ring-blue-500' // Focused state
                                          : 'border-gray-300 hover:bg-purple-50 focus:ring-blue-500 focus:border-blue-500' // Normal state
                                    }`}
                                    value={bulkData[fund.id]?.[activityType] || ''}
                                    onChange={(e) => handleValueChange(fund.id, activityType, e.target.value)}
                                    onFocus={() => {
                                      setFocusedCell({ fundIndex: index, activityIndex: getDisplayedActivities().indexOf(activityType) });
                                    }}
                                    onKeyDown={(e) => handleKeyDown(e, index, getDisplayedActivities().indexOf(activityType))}
                                    onBlur={(e) => handleInputBlur(fund.id, activityType)}
                                  />
                                  {/* Error message display */}
                                  {inputErrors[getInputKey(fund.id, activityType)] && (
                                    <div className="mt-1">
                                      <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1 shadow-sm">
                                        {inputErrors[getInputKey(fund.id, activityType)]}
                                      </div>
                                    </div>
                                  )}
                                </td>
                              ))}
                              </tr>
                            ))}
                            
                            {/* Totals row */}
                          <tr className={`bulk-activity-modal-totals-row border-t-2 font-semibold transition-colors duration-150 ${
                            shouldShowGreenTotals()
                              ? 'bg-green-50 border-green-200 hover:bg-green-100'
                              : 'bg-red-50 border-red-200 hover:bg-red-100'
                          }`}>
                            <td className={`bulk-activity-modal-totals-td px-4 py-2 text-xs font-bold border-t-2 ${
                              shouldShowGreenTotals()
                                ? 'text-green-700 border-green-200'
                                : 'text-red-700 border-red-200'
                            }`}>
                                TOTALS
                              </td>
                              {getDisplayedActivities().map(activityType => {
                                const total = calculateActivityTotal(activityType);
                                const isCurrentValue = activityType === 'Current Value';
                                  const isSwitchActivity = activityType === 'FundSwitchIn' || activityType === 'FundSwitchOut' || activityType === 'ProductSwitchIn' || activityType === 'ProductSwitchOut';
  const isWithdrawal = activityType === 'Withdrawal' || activityType === 'ProductSwitchOut';
  const isInvestment = activityType === 'Investment' || activityType === 'RegularInvestment' || activityType === 'TaxUplift' || activityType === 'ProductSwitchIn';
                                
                                return (
                                  <td
                                    key={`total-${activityType}`}
                                  className={`bulk-activity-modal-totals-td px-3 py-2 text-center text-xs font-semibold border-t-2 ${
                                      shouldShowGreenTotals() ? 'border-green-200' : 'border-red-200'
                                    } ${
                                      isSwitchActivity
                                      ? 'text-orange-600' // Switch activities shown in orange (neutral movements)
                                        : isCurrentValue
                                        ? 'text-blue-700' // Current value/valuation in blue
                                        : isWithdrawal
                                          ? 'text-red-700' // Withdrawals in red (outflows)
                                          : isInvestment
                                            ? 'text-green-700' // Investments in green (inflows)
                                          : total === 0
                                              ? 'text-gray-500' // Zero values in gray
                                            : total > 0
                                              ? 'text-green-700'
                                              : 'text-red-700'
                                    }`}
                                  >
                                    {total !== 0 ? formatCurrency(total) : ''}
                                  </td>
                                );
                              })}
                            </tr>
                          </tbody>
                        </table>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500" style={{ minHeight: '200px' }}>
                      <div className="text-center">
                        <svg className="mx-auto h-8 w-8 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <p className="text-xs font-medium">Select activity types above to begin entering data</p>
                        <p className="text-xs text-gray-400 mt-1">Choose one or more activities from the checkboxes above</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex justify-between items-center">
                  <div className="text-xs text-gray-500">
                    {(() => {
                      const { hasWarning } = getSwitchBalanceWarning();
                      const hasValidationErrors = Object.keys(inputErrors).length > 0;
                      
                      if (hasValidationErrors) {
                        return (
                          <div className="flex items-center text-red-600">
                            <svg className="h-3 w-3 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            <span className="font-medium">Please fix validation errors</span>
                          </div>
                        );
                      } else if (hasWarning) {
                        const { message } = getSwitchBalanceWarning();
                        return (
                          <div className="flex items-center text-yellow-600">
                            <svg className="h-3 w-3 mr-1.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            <span className="font-medium text-xs leading-tight">{message}</span>
                          </div>
                        );
                      } else if (hasChanges) {
                        return (
                          <span className="text-yellow-600 font-medium">
                            You have unsaved changes
                          </span>
                        );
                      }
                      return null;
                    })()}
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      className="inline-flex justify-center rounded border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      onClick={handleCancel}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className={`inline-flex justify-center rounded border border-transparent px-3 py-1.5 text-xs font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                        !hasChanges || getSwitchBalanceWarning().hasWarning || Object.keys(inputErrors).length > 0
                          ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
                      }`}
                      onClick={handleSave}
                      disabled={!hasChanges || getSwitchBalanceWarning().hasWarning || Object.keys(inputErrors).length > 0}
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default BulkMonthActivitiesModal;