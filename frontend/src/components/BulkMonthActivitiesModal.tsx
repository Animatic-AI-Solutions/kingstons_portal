import React, { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { formatCurrency } from '../utils/formatters';

interface Fund {
  id: number;
  fund_name: string;
  holding_id: number;
  irr?: number;
  start_date?: string;
  isActive?: boolean;
  inactiveHoldingIds?: any[];
  isInactiveBreakdown?: boolean;
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
  onSave: (bulkData: BulkActivityData) => void;
  getCurrentValue: (fundId: number, activityType: string) => string;
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

  // Initialize bulk data when modal opens or month changes
  useEffect(() => {
    if (isOpen) {
      const initialData: BulkActivityData = {};
      
      // Filter out inactive funds and breakdown funds
      const activeFunds = funds.filter(fund => 
        fund.isActive !== false && !fund.isInactiveBreakdown
      );
      
      activeFunds.forEach(fund => {
        initialData[fund.id] = {};
        ACTIVITY_TYPES.forEach(activityType => {
          initialData[fund.id][activityType] = getCurrentValue(fund.id, activityType);
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
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('en-GB', { year: 'numeric', month: 'long' });
  };

  const formatActivityType = (activityType: string): string => {
    if (!activityType) return '';
    
    if (activityType === 'Current Value') {
      return 'Valuation';
    }
    
    let formatted = activityType.replace(/_/g, ' ');
    formatted = formatted.replace(/([a-z])([A-Z])/g, '$1 $2');
    
    return formatted
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
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
  };

  const handleSave = () => {
    // Check if switch activities are balanced before saving
    const { hasWarning } = getSwitchBalanceWarning();
    if (hasWarning) {
      alert('Cannot save: Fund Switch In and Fund Switch Out amounts must match.');
      return;
    }

    // Only include funds and activities that have changed
    const changedData: BulkActivityData = {};
    
    Object.keys(bulkData).forEach(fundIdStr => {
      const fundId = parseInt(fundIdStr);
      Object.keys(bulkData[fundId]).forEach(activityType => {
        const currentValue = bulkData[fundId][activityType];
        const originalValue = getCurrentValue(fundId, activityType);
        
        if (currentValue !== originalValue) {
          if (!changedData[fundId]) {
            changedData[fundId] = {};
          }
          changedData[fundId][activityType] = currentValue;
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
    // Only handle arrow keys, Enter, and Tab
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'Tab'].includes(e.key)) {
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
          newFundIndex = funds.length - 1;
        }
        break;
      case 'ArrowDown':
      case 'Enter': // Make Enter behave like Down Arrow
        // Move down one fund, stay in same activity column
        if (fundIndex < funds.length - 1) {
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

    // Focus the new input element
    setTimeout(() => {
      const newInput = document.getElementById(
        `bulk-input-${newFundIndex}-${newActivityIndex}`
      ) as HTMLInputElement;
      if (newInput) {
        newInput.focus();
        // Select all text for easy replacement
        newInput.select();
      }
    }, 0);
  };

  // Calculate totals for each activity type
  const calculateActivityTotal = (activityType: string): number => {
    return Object.keys(bulkData).reduce((total, fundIdStr) => {
      const fundId = parseInt(fundIdStr);
      const value = bulkData[fundId]?.[activityType] || '';
      const numValue = parseFloat(value);
      
      if (!isNaN(numValue)) {
        if (activityType === 'Withdrawal' || activityType === 'RegularWithdrawal') {
          return total - numValue;
        } else if (activityType === 'Fund Switch In' || activityType === 'Fund Switch Out') {
          // For switch activities, show the total amount being switched
          // (these will be displayed but marked as neutral since they don't affect net position)
          return total + numValue;
        } else if (activityType !== 'Current Value') {
          return total + numValue;
        }
      }
      return total;
    }, 0);
  };

  // Check if switch activities are balanced
  const getSwitchBalanceWarning = (): { hasWarning: boolean; message: string } => {
    // Only check balance if both switch activities are selected
    const hasSwithIn = selectedActivities.has('Fund Switch In');
    const hasSwitchOut = selectedActivities.has('Fund Switch Out');
    
    if (!hasSwithIn || !hasSwitchOut) {
      return { hasWarning: false, message: '' };
    }

    const switchOutTotal = calculateActivityTotal('Fund Switch Out');
    const switchInTotal = calculateActivityTotal('Fund Switch In');
    
    // Only show warning if both have values and they don't match
    if ((switchOutTotal > 0 || switchInTotal > 0) && switchOutTotal !== switchInTotal) {
      const difference = Math.abs(switchOutTotal - switchInTotal);
      return {
        hasWarning: true,
        message: `Switch activities are unbalanced. Fund Switch Out: ${formatCurrency(switchOutTotal)}, Fund Switch In: ${formatCurrency(switchInTotal)}. Difference: ${formatCurrency(difference)}`
      };
    }
    
    return { hasWarning: false, message: '' };
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

  const activeFunds = funds.filter(fund => 
    fund.isActive !== false && !fund.isInactiveBreakdown
  );

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
              <Dialog.Panel className="w-full max-w-6xl transform overflow-hidden rounded-lg bg-white p-6 text-left align-middle shadow-xl transition-all">
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

                {/* Table Container - Fixed Height to Prevent Shifting */}
                <div className="border rounded-lg bg-white" style={{ minHeight: '300px' }}>
                  {selectedActivities.size > 0 ? (
                    <div className="max-h-[80vh] overflow-y-auto">
                      <div className="overflow-x-auto">
                        <table className="w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50 sticky top-0">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-40">
                                Fund Name
                              </th>
                              {getDisplayedActivities().map(activityType => (
                                <th
                                  key={activityType}
                                  className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-24"
                                >
                                  {formatActivityType(activityType)}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {activeFunds.map((fund, index) => (
                              <tr key={fund.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                <td className="px-3 py-1.5 text-xs font-medium text-gray-900 truncate" title={fund.fund_name}>
                                  {fund.fund_name}
                                </td>
                                {getDisplayedActivities().map(activityType => (
                                  <td key={`${fund.id}-${activityType}`} className="px-2 py-1.5 text-center">
                                    <input
                                      type="text"
                                      id={`bulk-input-${index}-${getDisplayedActivities().indexOf(activityType)}`}
                                      className={`w-full px-1.5 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-center ${
                                        focusedCell?.fundIndex === index && focusedCell?.activityIndex === getDisplayedActivities().indexOf(activityType)
                                          ? 'ring-1 ring-blue-500 border-blue-500'
                                          : ''
                                      }`}
                                      value={bulkData[fund.id]?.[activityType] || ''}
                                      onChange={(e) => handleValueChange(fund.id, activityType, e.target.value)}
                                      onFocus={() => setFocusedCell({ fundIndex: index, activityIndex: getDisplayedActivities().indexOf(activityType) })}
                                      onKeyDown={(e) => handleKeyDown(e, index, getDisplayedActivities().indexOf(activityType))}
                                      placeholder="0"
                                    />
                                  </td>
                                ))}
                              </tr>
                            ))}
                            
                            {/* Totals row */}
                            <tr className="bg-blue-50 border-t-2 border-blue-200 font-semibold">
                              <td className="px-3 py-2 text-xs font-bold text-blue-900">
                                TOTALS
                              </td>
                              {getDisplayedActivities().map(activityType => {
                                const total = calculateActivityTotal(activityType);
                                const isCurrentValue = activityType === 'Current Value';
                                const isSwitchActivity = activityType === 'Fund Switch In' || activityType === 'Fund Switch Out';
                                
                                return (
                                  <td
                                    key={`total-${activityType}`}
                                    className={`px-2 py-2 text-center text-xs font-semibold ${
                                      isSwitchActivity 
                                        ? 'text-orange-600' // Switch activities shown in orange to indicate they're movements, not net changes
                                        : isCurrentValue 
                                          ? 'text-blue-700' 
                                          : total === 0 
                                            ? 'text-gray-500' 
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
                      if (hasWarning) {
                        return (
                          <div className="flex items-center text-yellow-600">
                            <svg className="h-3 w-3 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            <span className="font-medium">Switch In and Switch Out do not match</span>
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
                        !hasChanges || getSwitchBalanceWarning().hasWarning
                          ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
                      }`}
                      onClick={handleSave}
                      disabled={!hasChanges || getSwitchBalanceWarning().hasWarning}
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