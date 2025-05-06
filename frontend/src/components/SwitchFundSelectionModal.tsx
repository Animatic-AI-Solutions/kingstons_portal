import React, { useState } from 'react';
import { SearchableDropdown } from './ui';

interface Fund {
  id: number;
  fund_name: string;
}

interface SwitchFundSelectionModalProps {
  funds: Fund[];
  month: string;
  amount: number;
  isSwitchOut: boolean;
  onConfirm: (selectedFundId: number) => void;
  onCancel: () => void;
}

const SwitchFundSelectionModal: React.FC<SwitchFundSelectionModalProps> = ({
  funds,
  month,
  amount,
  isSwitchOut,
  onConfirm,
  onCancel
}) => {
  const [selectedFundId, setSelectedFundId] = useState<number | null>(
    funds.length > 0 ? funds[0].id : null
  );
  
  const title = isSwitchOut 
    ? 'Select Destination Fund for Switch Out' 
    : 'Select Origin Fund for Switch In';
    
  const promptText = isSwitchOut
    ? 'Select the fund this amount will be switched to:'
    : 'Select the fund this amount is being switched from:';

  const handleConfirm = () => {
    if (selectedFundId !== null) {
      onConfirm(selectedFundId);
    }
  };

  // Format month for display (YYYY-MM to Month YYYY)
  const displayMonth = () => {
    const [year, monthStr] = month.split('-');
    const date = new Date(parseInt(year), parseInt(monthStr) - 1, 1);
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  };
  
  // Format currency for display
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 2
    }).format(value);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">{title}</h2>
        
        <div className="mb-4">
          <p className="text-gray-600 mb-2">{promptText}</p>
          <div className="flex items-center mb-2">
            <span className="font-medium mr-2">Amount:</span>
            <span className="text-green-600">{formatCurrency(amount)}</span>
          </div>
          <div className="flex items-center mb-4">
            <span className="font-medium mr-2">Month:</span>
            <span>{displayMonth()}</span>
          </div>
        </div>
        
        {funds.length > 0 ? (
          <div className="mb-6">
            <label htmlFor="fund-select" className="block text-sm font-medium text-gray-700 mb-1">
              Select Fund
            </label>
            <SearchableDropdown
              id="fund-select"
              value={selectedFundId || ''}
              onChange={(value) => setSelectedFundId(typeof value === 'string' ? parseInt(value) : value as number)}
              options={funds.map(fund => ({ value: fund.id, label: fund.fund_name }))}
              placeholder="Select a fund"
              className="w-full"
              required
            />
          </div>
        ) : (
          <div className="mb-6 text-red-500">
            No other funds available for selection.
          </div>
        )}
        
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-300"
            onClick={handleConfirm}
            disabled={selectedFundId === null || funds.length === 0}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default SwitchFundSelectionModal; 