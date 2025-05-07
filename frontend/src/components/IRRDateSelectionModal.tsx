import React, { useState } from 'react';
import { Dialog } from '@headlessui/react';

/**
 * Props interface for the IRR Date Selection Modal component
 * @property {boolean} isOpen - Controls visibility of the modal
 * @property {Function} onClose - Callback function to close the modal
 * @property {Function} onCalculateIRR - Callback function to perform the IRR calculation for the selected date
 */
interface IRRDateSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCalculateIRR: (date: string) => Promise<void>;
}

/**
 * Modal component for selecting a month and year to calculate IRR for all funds
 * 
 * This modal allows users to select a month and year for IRR calculation.
 * The date will always be set to the 1st of the selected month.
 */
const IRRDateSelectionModal: React.FC<IRRDateSelectionModalProps> = ({
  isOpen,
  onClose,
  onCalculateIRR
}) => {
  // Get current year and month
  const currentDate = new Date();
  const [year, setYear] = useState<number>(currentDate.getFullYear());
  const [month, setMonth] = useState<number>(currentDate.getMonth() + 1); // JavaScript months are 0-based
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Handles the IRR calculation process
   * 
   * 1. Creates a date for the 1st of the selected month/year
   * 2. Calls the parent component's onCalculateIRR function with the formatted date
   * 3. Closes the modal on successful calculation
   * 4. Displays error messages if calculation errors occur
   */
  const handleCalculate = async () => {
    try {
      setIsCalculating(true);
      setError(null);
      
      // Create date for the 1st of the selected month
      // Format as YYYY-MM-01
      const formattedDate = `${year}-${month.toString().padStart(2, '0')}-01`;
      
      // Call the parent component's calculation function
      await onCalculateIRR(formattedDate);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to calculate IRR');
    } finally {
      setIsCalculating(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      {/* Semi-transparent background overlay */}
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      {/* Modal container - centered on screen */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-sm rounded bg-white p-6">
          {/* Modal title */}
          <Dialog.Title className="text-lg font-medium text-gray-900 mb-4">
            Calculate IRR
          </Dialog.Title>

          <div className="space-y-4">
            {/* Month selection */}
            <div>
              <label htmlFor="month" className="block text-sm font-medium text-gray-700">
                Month
              </label>
              <select
                id="month"
                value={month}
                onChange={(e) => setMonth(parseInt(e.target.value))}
                className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {new Date(2000, m - 1).toLocaleString('default', { month: 'long' })}
                  </option>
                ))}
              </select>
            </div>

            {/* Year selection */}
            <div>
              <label htmlFor="year" className="block text-sm font-medium text-gray-700">
                Year
              </label>
              <select
                id="year"
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
              >
                {Array.from({ length: 10 }, (_, i) => currentDate.getFullYear() - 5 + i).map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            <p className="mt-1 text-sm text-gray-500">
              IRR will be calculated for the 1st day of the selected month
            </p>

            {/* Error display */}
            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">{error}</h3>
                  </div>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="mt-6 flex justify-end space-x-3">
              {/* Cancel button */}
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              {/* Calculate button - disabled during calculation */}
              <button
                type="button"
                onClick={handleCalculate}
                disabled={isCalculating}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {isCalculating ? 'Calculating...' : 'Calculate IRR'}
              </button>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default IRRDateSelectionModal; 