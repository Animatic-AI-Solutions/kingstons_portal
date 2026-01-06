import React, { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { BaseDropdown } from '../../ui';

/**
 * Props interface for the IRR Calculation Modal component
 * @property {boolean} isOpen - Controls visibility of the modal
 * @property {Function} onClose - Callback function to close the modal
 * @property {string} fundName - Name of the fund for which IRR is being calculated
 * @property {number} portfolioFundId - ID of the portfolio-fund relationship
 * @property {Function} onCalculateIRR - Callback function to perform the IRR calculation
 */
interface IRRCalculationModalProps {
  isOpen: boolean;
  onClose: () => void;
  fundName: string;
  portfolioFundId: number;
  onCalculateIRR: (portfolioFundId: number, month: number, year: number, valuation: number) => Promise<void>;
}

/**
 * Modal component for calculating Internal Rate of Return (IRR) for a specific fund
 * 
 * This modal allows users to enter a month, year, and valuation amount to calculate
 * the IRR for a specific fund in a portfolio. The IRR calculation is performed by
 * the parent component through the onCalculateIRR callback.
 */
const IRRCalculationModal: React.FC<IRRCalculationModalProps> = ({
  isOpen,
  onClose,
  fundName,
  portfolioFundId,
  onCalculateIRR
}) => {
  // Initialize form state with current month and year
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [valuation, setValuation] = useState<string>('');
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Handles the IRR calculation process
   * 
   * 1. Validates the input valuation amount
   * 2. Calls the parent component's onCalculateIRR function with the form data
   * 3. Closes the modal on successful calculation
   * 4. Displays error messages if validation fails or calculation errors occur
   */
  const handleCalculate = async () => {
    try {
      setIsCalculating(true);
      setError(null);
      
      // Validate valuation input
      const valuationNumber = parseFloat(valuation);
      if (isNaN(valuationNumber) || valuationNumber < 0) {
        throw new Error('Please enter a valid valuation amount');
      }

      // Validate that valuation matches double precision constraints
      if (valuationNumber > Number.MAX_SAFE_INTEGER || !Number.isFinite(valuationNumber)) {
        throw new Error('Valuation amount is too large or invalid');
      }

      // Call the parent component's calculation function
      await onCalculateIRR(portfolioFundId, month, year, valuationNumber);
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
      <div className="fixed inset-0 flex items-start justify-center p-4 pt-16">
        <Dialog.Panel className="mx-auto max-w-sm rounded bg-white p-6">
          {/* Modal title */}
          <Dialog.Title className="text-lg font-medium text-gray-900 mb-4">
            Calculate IRR for {fundName}
          </Dialog.Title>

          <div className="space-y-4">
            {/* Month selection dropdown */}
            <div>
              <label htmlFor="month" className="block text-sm font-medium text-gray-700">
                Month
              </label>
              <BaseDropdown
                id="month"
                value={month}
                onChange={(value) => setMonth(typeof value === 'string' ? parseInt(value) : value as number)}
                options={Array.from({ length: 12 }, (_, i) => i + 1).map((m) => ({
                  value: m,
                  label: new Date(2000, m - 1).toLocaleString('default', { month: 'long' })
                }))}
                placeholder="Select month"
                className="mt-1"
                required
              />
            </div>

            {/* Year input field */}
            <div>
              <label htmlFor="year" className="block text-sm font-medium text-gray-700">
                Year
              </label>
              <input
                type="number"
                id="year"
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                min={2000}
                max={new Date().getFullYear()}
              />
            </div>

            {/* Valuation input field */}
            <div>
              <label htmlFor="valuation" className="block text-sm font-medium text-gray-700">
                Valuation
              </label>
              <input
                type="number"
                id="valuation"
                value={valuation}
                onChange={(e) => setValuation(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                min="0"
                step="0.01"
                placeholder="Enter current valuation"
              />
              <p className="mt-1 text-sm text-gray-500">
                Please enter a valid number with up to 2 decimal places
              </p>
            </div>

            {/* Error message display */}
            {error && (
              <div className="text-red-600 text-sm">{error}</div>
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

export default IRRCalculationModal; 