import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  ScheduledTransaction,
  ScheduledTransactionUpdate,
  updateScheduledTransaction
} from '../services/scheduledTransactions';
import Button from './ui/Button';

interface ScheduledTransactionEditModalProps {
  transaction: ScheduledTransaction;
  onClose: () => void;
  onSave: () => void;
}

/**
 * ScheduledTransactionEditModal Component
 * 
 * Modal dialog for editing scheduled transaction properties
 */
const ScheduledTransactionEditModal: React.FC<ScheduledTransactionEditModalProps> = ({
  transaction,
  onClose,
  onSave
}) => {
  const [formData, setFormData] = useState<ScheduledTransactionUpdate>({
    amount: transaction.amount,
    execution_day: transaction.execution_day,
    description: transaction.description || '',
    recurrence_interval: transaction.recurrence_interval,
    max_executions: transaction.max_executions,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: ScheduledTransactionUpdate) => 
      updateScheduledTransaction(transaction.id, data),
    onSuccess: () => {
      onSave();
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.detail || 'Failed to update scheduled transaction';
      setErrors({ submit: errorMessage });
    },
  });

  // Handle form field changes
  const handleChange = (field: keyof ScheduledTransactionUpdate, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear field-specific errors
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.amount || formData.amount <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }

    if (!formData.execution_day || formData.execution_day < 1 || formData.execution_day > 31) {
      newErrors.execution_day = 'Execution day must be between 1 and 31';
    }

    if (transaction.is_recurring && !formData.recurrence_interval) {
      newErrors.recurrence_interval = 'Please select a recurrence interval';
    }

    if (transaction.is_recurring && formData.max_executions && formData.max_executions < 1) {
      newErrors.max_executions = 'Maximum executions must be greater than 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      updateMutation.mutate(formData);
    }
  };

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              Edit Scheduled Transaction
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-6">
          {/* Transaction Info (Read-only) */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Transaction Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Type:</span>
                <div className="font-medium">{transaction.transaction_type}</div>
              </div>
              <div>
                <span className="text-gray-500">Recurring:</span>
                <div className="font-medium">{transaction.is_recurring ? 'Yes' : 'No'}</div>
              </div>
              <div>
                <span className="text-gray-500">Status:</span>
                <div className="font-medium capitalize">{transaction.status}</div>
              </div>
              <div>
                <span className="text-gray-500">Executions:</span>
                <div className="font-medium">
                  {transaction.total_executions}
                  {transaction.max_executions && ` / ${transaction.max_executions}`}
                </div>
              </div>
            </div>
          </div>

          {/* Amount */}
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
              Amount *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500">£</span>
              <input
                type="number"
                id="amount"
                value={formData.amount || ''}
                onChange={(e) => handleChange('amount', parseFloat(e.target.value) || 0)}
                className={`w-full pl-8 pr-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.amount ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="0.00"
                step="0.01"
                min="0"
              />
            </div>
            {errors.amount && (
              <p className="mt-1 text-sm text-red-600">{errors.amount}</p>
            )}
          </div>

          {/* Execution Day */}
          <div>
            <label htmlFor="execution_day" className="block text-sm font-medium text-gray-700 mb-2">
              Execution Day *
            </label>
            <select
              id="execution_day"
              value={formData.execution_day}
              onChange={(e) => handleChange('execution_day', parseInt(e.target.value))}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.execution_day ? 'border-red-300' : 'border-gray-300'
              }`}
            >
              {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                <option key={day} value={day}>
                  Day {day} of the month
                </option>
              ))}
            </select>
            {errors.execution_day && (
              <p className="mt-1 text-sm text-red-600">{errors.execution_day}</p>
            )}
            <p className="mt-1 text-sm text-gray-500">
              Changing the execution day will recalculate the next execution date.
            </p>
          </div>

          {/* Recurring Options - Only show if transaction is recurring */}
          {transaction.is_recurring && (
            <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-medium text-gray-700">Recurring Settings</h3>
              
              <div>
                <label htmlFor="recurrence_interval" className="block text-sm font-medium text-gray-700 mb-2">
                  Recurrence Interval *
                </label>
                <select
                  id="recurrence_interval"
                  value={formData.recurrence_interval || ''}
                  onChange={(e) => handleChange('recurrence_interval', e.target.value as any)}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.recurrence_interval ? 'border-red-300' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select interval...</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly (every 3 months)</option>
                  <option value="annually">Annually (once per year)</option>
                </select>
                {errors.recurrence_interval && (
                  <p className="mt-1 text-sm text-red-600">{errors.recurrence_interval}</p>
                )}
              </div>

              <div>
                <label htmlFor="max_executions" className="block text-sm font-medium text-gray-700 mb-2">
                  Maximum Executions (optional)
                </label>
                <input
                  type="number"
                  id="max_executions"
                  value={formData.max_executions || ''}
                  onChange={(e) => handleChange('max_executions', e.target.value ? parseInt(e.target.value) : undefined)}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.max_executions ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Leave empty for unlimited"
                  min="1"
                />
                {errors.max_executions && (
                  <p className="mt-1 text-sm text-red-600">{errors.max_executions}</p>
                )}
                <p className="mt-1 text-sm text-gray-500">
                  Leave empty to continue indefinitely. Current executions: {transaction.total_executions}
                </p>
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description (optional)
            </label>
            <textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Add a description for this scheduled transaction..."
            />
          </div>

          {/* Error Display */}
          {errors.submit && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{errors.submit}</p>
            </div>
          )}

          {/* Footer */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={updateMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updateMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ScheduledTransactionEditModal; 