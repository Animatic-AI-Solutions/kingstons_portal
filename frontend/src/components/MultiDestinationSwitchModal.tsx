import React, { useState, useEffect, useMemo } from 'react';
import { SearchableDropdown } from './ui';

interface Fund {
  id: number;
  fund_name: string;
}

interface SwitchDestination {
  fundId: number;
  fundName: string;
  amount: number;
  isSelected: boolean;
}

interface MultiDestinationSwitchModalProps {
  sourceFund: Fund;
  availableFunds: Fund[];
  totalAmount: number;
  month: string;
  existingDestinations?: SwitchDestination[];
  onConfirm: (destinations: SwitchDestination[], sourceAmount: number) => void;
  onCancel: () => void;
}

const MultiDestinationSwitchModal: React.FC<MultiDestinationSwitchModalProps> = ({
  sourceFund,
  availableFunds,
  totalAmount,
  month,
  existingDestinations = [],
  onConfirm,
  onCancel
}) => {
  const [destinations, setDestinations] = useState<SwitchDestination[]>([]);
  const [sourceAmount, setSourceAmount] = useState<number>(totalAmount);

  // Memoize existing destinations to prevent infinite loops
  const memoizedExistingDestinations = useMemo(() => {
    return existingDestinations || [];
  }, [JSON.stringify(existingDestinations || [])]);

  // Initialize destinations from available funds
  useEffect(() => {
    if (availableFunds.length === 0) {
      setDestinations([]);
      return;
    }

    // Update source amount when totalAmount changes
    setSourceAmount(totalAmount);

    // Create destinations array with all available funds
    const initialDestinations = availableFunds.map(fund => {
      const existing = memoizedExistingDestinations.find(d => d.fundId === fund.id);
      return {
        fundId: fund.id,
        fundName: fund.fund_name,
        amount: existing?.amount || 0,
        isSelected: existing?.isSelected || false
      };
    });
    
    // Only update if destinations actually changed - use proper comparison
    setDestinations(prev => {
      // If no previous state, initialize
      if (prev.length === 0 && initialDestinations.length > 0) {
        return initialDestinations;
      }
      
      // If lengths differ, update
      if (prev.length !== initialDestinations.length) {
        return initialDestinations;
      }
      
      // Check for actual changes by comparing fund data properly (not by index)
      const hasChanges = initialDestinations.some(newDest => {
        const prevDest = prev.find(p => p.fundId === newDest.fundId);
        return !prevDest || 
               prevDest.amount !== newDest.amount || 
               prevDest.isSelected !== newDest.isSelected ||
               prevDest.fundName !== newDest.fundName;
      });
      
      return hasChanges ? initialDestinations : prev;
    });
  }, [availableFunds, memoizedExistingDestinations]);

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatMonth = (monthStr: string): string => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  const getTotalAllocated = (): number => {
    return destinations
      .filter(d => d.isSelected)
      .reduce((sum, d) => sum + d.amount, 0);
  };

  const getRemaining = (): number => {
    return sourceAmount - getTotalAllocated();
  };

  // Calculate total allocated
  const totalAllocated = destinations.reduce((sum, dest) => 
    dest.isSelected ? sum + dest.amount : sum, 0
  );

  // Validation
  const isValid = totalAllocated > 0 && Math.abs(totalAllocated - sourceAmount) < 0.01;
  const selectedDestinations = destinations.filter(dest => dest.isSelected && dest.amount > 0);

  const handleDestinationToggle = (fundId: number) => {
    setDestinations(prev => prev.map(dest => 
      dest.fundId === fundId 
        ? { ...dest, isSelected: !dest.isSelected, amount: dest.isSelected ? 0 : dest.amount }
        : dest
    ));
  };

  const handleAmountChange = (fundId: number, amount: number) => {
    setDestinations(prev => prev.map(dest => 
      dest.fundId === fundId 
        ? { 
            ...dest, 
            amount: Math.max(0, amount),
            isSelected: amount > 0 // Automatically select when amount > 0, deselect when 0
          }
        : dest
    ));
  };

  const handleRemoveDestination = (fundId: number) => {
    setDestinations(prev => prev.map(dest => 
      dest.fundId === fundId 
        ? { ...dest, isSelected: false, amount: 0 }
        : dest
    ));
  };

  const handleConfirm = () => {
    if (selectedDestinations.length === 0) {
      alert('Please select at least one destination fund with an amount greater than 0.');
      return;
    }

    if (!isValid) {
      alert(`Total allocated amount (£${totalAllocated.toFixed(2)}) must equal the source amount (£${sourceAmount.toFixed(2)}).`);
      return;
    }

    // Update the source amount in the destinations and confirm
    const updatedDestinations = selectedDestinations.map(dest => ({
      ...dest,
      sourceAmount // Add source amount to each destination for the parent to use
    }));
    
    onConfirm(updatedDestinations, sourceAmount); // Pass both destinations and new source amount
  };

  const allocated = getTotalAllocated();
  const remaining = getRemaining();
  const isOverAllocated = allocated > sourceAmount;
  const isUnderAllocated = allocated < sourceAmount;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">
              Edit Fund Switch
            </h3>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Source amount section */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Switch from: {sourceFund.fund_name}
              </label>
              <div className="flex items-center space-x-2">
                <span className="text-gray-500">£</span>
                <input
                  type="number"
                  value={sourceAmount === 0 ? '' : sourceAmount.toString()}
                  onChange={(e) => {
                    const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                    setSourceAmount(isNaN(value) ? 0 : value);
                  }}
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter amount to switch"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
            
            {/* Delete button */}
            <button
              onClick={() => {
                if (confirm(`Are you sure you want to delete this entire fund switch?\n\nThis will remove the switch from ${sourceFund.fund_name} and all destination amounts.`)) {
                  onConfirm([], 0); // Pass empty array and 0 for source amount to indicate deletion
                }
              }}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md transition-colors flex items-center space-x-2"
              title="Delete entire switch"
            >
              <span>🗑️</span>
              <span>Delete</span>
            </button>
          </div>
        </div>

        <div className="px-6 py-4">
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              Select destination funds and amounts:
            </h4>
          </div>
          <div className="space-y-3 max-h-60 overflow-y-auto">
            {destinations.map((dest) => (
              <div key={dest.fundId} className="flex items-center space-x-3 p-3 border rounded-lg">
                <input
                  type="checkbox"
                  checked={dest.isSelected}
                  onChange={() => handleDestinationToggle(dest.fundId)}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <div className="flex-1">
                  <span className="text-sm font-medium text-gray-700">{dest.fundName}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500">£</span>
                  <div className="relative flex items-center">
                    <input
                      type="number"
                      value={dest.amount === 0 ? '' : dest.amount.toString()}
                      onChange={(e) => {
                        const inputValue = e.target.value;
                        const numericValue = inputValue === '' ? 0 : parseFloat(inputValue);
                        const amount = isNaN(numericValue) ? 0 : numericValue;
                        handleAmountChange(dest.fundId, amount);
                      }}
                      onFocus={(e) => {
                        // Select all text when clicking on the input for easy editing
                        e.target.select();
                      }}
                      onKeyDown={(e) => {
                        // Allow easy clearing with Delete or Backspace on empty field
                        if ((e.key === 'Delete' || e.key === 'Backspace') && e.currentTarget.value === '') {
                          handleAmountChange(dest.fundId, 0);
                        }
                        // Allow Enter to confirm and move to next field
                        if (e.key === 'Enter') {
                          e.currentTarget.blur();
                        }
                      }}
                      className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 pr-6"
                      placeholder="0"
                      min="0"
                      step="1"
                    />
                    {/* Clear button - only show when there's a value */}
                    {dest.amount > 0 && (
                      <button
                        type="button"
                        onClick={() => handleAmountChange(dest.fundId, 0)}
                        className="absolute right-1 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs w-4 h-4 flex items-center justify-center"
                        title="Clear amount"
                      >
                        ×
                      </button>
                    )}
                  </div>
                  {dest.isSelected && (
                    <button
                      onClick={() => handleRemoveDestination(dest.fundId)}
                      className="text-red-500 hover:text-red-700 p-1"
                      title="Remove destination"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <span className="font-medium">Allocated:</span>
            <span className={`font-semibold ${
              isOverAllocated ? 'text-red-600' : 
              isUnderAllocated ? 'text-orange-600' : 
              'text-green-600'
            }`}>
              {formatCurrency(allocated)} / {formatCurrency(sourceAmount)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-medium">Remaining:</span>
            <span className={`font-semibold ${
              remaining === 0 ? 'text-green-600' : 
              remaining < 0 ? 'text-red-600' : 
              'text-orange-600'
            }`}>
              {formatCurrency(remaining)}
            </span>
          </div>
          {isOverAllocated && (
            <div className="mt-2 text-sm text-red-600">
              ⚠️ Over-allocated by {formatCurrency(Math.abs(remaining))}
            </div>
          )}
          {isUnderAllocated && remaining > 0 && (
            <div className="mt-2 text-sm text-orange-600">
              ⚠️ Under-allocated by {formatCurrency(remaining)}
            </div>
          )}
          {remaining === 0 && allocated > 0 && (
            <div className="mt-2 text-sm text-green-600">
              ✅ Perfectly allocated
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className={`px-4 py-2 rounded-md transition-colors ${
              isValid
                ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
            onClick={handleConfirm}
            disabled={!isValid}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default MultiDestinationSwitchModal; 