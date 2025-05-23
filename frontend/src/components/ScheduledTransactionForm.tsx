import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ScheduledTransactionCreate, 
  createScheduledTransaction 
} from '../services/scheduledTransactions';
import { getClientGroups, getClientProducts, getPortfolioFundsByProduct } from '../services/api';
import Button from './ui/Button';
import SearchableDropdown from './ui/SearchableDropdown';

interface ScheduledTransactionFormProps {
  onTransactionCreated?: () => void;
}

interface ClientGroup {
  id: number;
  name: string;
}

interface ClientProduct {
  id: number;
  product_name: string;
  client_id: number;
}

interface PortfolioFund {
  id: number;
  fund_name: string;
}

/**
 * ScheduledTransactionForm Component
 * 
 * Provides a comprehensive form for creating scheduled transactions
 * with support for investments, withdrawals, and recurring transactions.
 */
const ScheduledTransactionForm: React.FC<ScheduledTransactionFormProps> = ({
  onTransactionCreated
}) => {
  const queryClient = useQueryClient();
  
  // Form state
  const [formData, setFormData] = useState<ScheduledTransactionCreate>({
    portfolio_fund_id: 0,
    transaction_type: 'Investment',
    amount: 0,
    execution_day: 1,
    description: '',
    is_recurring: false,
    recurrence_interval: undefined,
    max_executions: undefined,
  });

  // Selection state for hierarchical dropdowns
  const [selectedClientGroupId, setSelectedClientGroupId] = useState<number | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [selectedPortfolioFundId, setSelectedPortfolioFundId] = useState<number | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch client groups
  const { data: clientGroupsData, isLoading: isLoadingClientGroups } = useQuery({
    queryKey: ['client-groups'],
    queryFn: () => getClientGroups({ status: 'active' }),
  });

  // Fetch products for selected client group
  const { data: productsData, isLoading: isLoadingProducts } = useQuery({
    queryKey: ['client-products', selectedClientGroupId],
    queryFn: () => getClientProducts({ 
      client_id: selectedClientGroupId!, 
      status: 'active' 
    }),
    enabled: !!selectedClientGroupId,
  });

  // Fetch portfolio funds for selected product
  const { data: portfolioFundsData, isLoading: isLoadingPortfolioFunds } = useQuery({
    queryKey: ['portfolio-funds', selectedProductId],
    queryFn: () => getPortfolioFundsByProduct(selectedProductId!),
    enabled: !!selectedProductId,
  });

  // Process data for dropdowns
  const clientGroupOptions = clientGroupsData?.data?.map((group: ClientGroup) => ({
    value: group.id,
    label: group.name,
  })) || [];

  const productOptions = productsData?.data?.map((product: ClientProduct) => ({
    value: product.id,
    label: product.product_name,
  })) || [];

  const portfolioFundOptions = portfolioFundsData?.data?.portfolio_funds?.map((fund: any) => ({
    value: fund.id,
    label: fund.fund_name || 'Unknown Fund',
  })) || [];

  // Update form data when portfolio fund is selected
  useEffect(() => {
    if (selectedPortfolioFundId) {
      setFormData(prev => ({ ...prev, portfolio_fund_id: selectedPortfolioFundId }));
    } else {
      setFormData(prev => ({ ...prev, portfolio_fund_id: 0 }));
    }
  }, [selectedPortfolioFundId]);

  // Reset dependent selections when parent changes
  useEffect(() => {
    setSelectedProductId(null);
    setSelectedPortfolioFundId(null);
  }, [selectedClientGroupId]);

  useEffect(() => {
    setSelectedPortfolioFundId(null);
  }, [selectedProductId]);

  // Create transaction mutation
  const createMutation = useMutation({
    mutationFn: createScheduledTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-transactions'] });
      setFormData({
        portfolio_fund_id: 0,
        transaction_type: 'Investment',
        amount: 0,
        execution_day: 1,
        description: '',
        is_recurring: false,
        recurrence_interval: undefined,
        max_executions: undefined,
      });
      // Reset hierarchical selections
      setSelectedClientGroupId(null);
      setSelectedProductId(null);
      setSelectedPortfolioFundId(null);
      setErrors({});
      onTransactionCreated?.();
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.detail || 'Failed to create scheduled transaction';
      setErrors({ submit: errorMessage });
    },
  });

  // Handle form field changes
  const handleChange = (field: keyof ScheduledTransactionCreate, value: any) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // Clear recurring fields if not recurring
      if (field === 'is_recurring' && !value) {
        updated.recurrence_interval = undefined;
        updated.max_executions = undefined;
      }
      
      // Set default transaction type based on recurring selection
      if (field === 'is_recurring') {
        if (value) {
          updated.transaction_type = prev.transaction_type.includes('Withdrawal') 
            ? 'RegularWithdrawal' 
            : 'RegularInvestment';
        } else {
          updated.transaction_type = prev.transaction_type.includes('Withdrawal') 
            ? 'Withdrawal' 
            : 'Investment';
        }
      }
      
      // Update transaction type when switching between investment/withdrawal
      if (field === 'transaction_type') {
        const isWithdrawal = value.includes('Withdrawal');
        const isCurrentlyRecurring = prev.is_recurring;
        
        if (isWithdrawal && isCurrentlyRecurring) {
          updated.transaction_type = 'RegularWithdrawal';
        } else if (isWithdrawal && !isCurrentlyRecurring) {
          updated.transaction_type = 'Withdrawal';
        } else if (!isWithdrawal && isCurrentlyRecurring) {
          updated.transaction_type = 'RegularInvestment';
        } else {
          updated.transaction_type = 'Investment';
        }
      }
      
      return updated;
    });

    // Clear field-specific errors
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!selectedClientGroupId) {
      newErrors.client_group = 'Please select a client group';
    }

    if (!selectedProductId) {
      newErrors.product = 'Please select a product';
    }

    if (!formData.portfolio_fund_id) {
      newErrors.portfolio_fund_id = 'Please select a portfolio fund';
    }

    if (!formData.amount || formData.amount <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }

    if (!formData.execution_day || formData.execution_day < 1 || formData.execution_day > 31) {
      newErrors.execution_day = 'Execution day must be between 1 and 31';
    }

    if (formData.is_recurring && !formData.recurrence_interval) {
      newErrors.recurrence_interval = 'Please select a recurrence interval';
    }

    if (formData.is_recurring && formData.max_executions && formData.max_executions < 1) {
      newErrors.max_executions = 'Maximum executions must be greater than 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      createMutation.mutate(formData);
    }
  };

  const isInvestment = !formData.transaction_type.includes('Withdrawal');

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl mx-auto">
      {/* Transaction Type Selection */}
      <div>
        <label className="block text-lg font-medium text-gray-700 mb-4">
          Transaction Type
        </label>
        <div className="grid grid-cols-2 gap-6">
          <button
            type="button"
            onClick={() => handleChange('transaction_type', formData.is_recurring ? 'RegularInvestment' : 'Investment')}
            className={`p-8 border-2 rounded-xl text-left transition-all duration-200 flex flex-col ${
              isInvestment
                ? 'border-green-500 bg-green-50 text-green-700 shadow-md'
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <div className="font-bold text-xl">Investment</div>
            <div className="text-gray-500 text-sm mt-2">Add money to your portfolio</div>
          </button>
          <button
            type="button"
            onClick={() => handleChange('transaction_type', formData.is_recurring ? 'RegularWithdrawal' : 'Withdrawal')}
            className={`p-8 border-2 rounded-xl text-left transition-all duration-200 flex flex-col ${
              !isInvestment
                ? 'border-red-500 bg-red-50 text-red-700 shadow-md'
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <div className="font-bold text-xl">Withdrawal</div>
            <div className="text-gray-500 text-sm mt-2">Remove money from your portfolio</div>
          </button>
        </div>
      </div>

      {/* Hierarchical Portfolio Fund Selection */}
      <div className="space-y-6">
        <h3 className="text-lg font-medium text-gray-700 border-b border-gray-200 pb-2">
          Portfolio Fund Selection
        </h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Step 1: Client Group Selection */}
          <div>
            <label htmlFor="client_group" className="block text-sm font-medium text-gray-700 mb-3">
              Client Group *
            </label>
            <SearchableDropdown
              id="client_group"
              options={clientGroupOptions}
              value={selectedClientGroupId || ''}
              onChange={(value) => setSelectedClientGroupId(value as number)}
              placeholder="Select a client group..."
              disabled={isLoadingClientGroups}
              className={errors.client_group ? 'border-red-300' : ''}
            />
            {errors.client_group && (
              <p className="mt-2 text-sm text-red-600">{errors.client_group}</p>
            )}
          </div>

          {/* Step 2: Product Selection */}
          <div className={!selectedClientGroupId ? 'opacity-50' : ''}>
            <label htmlFor="product" className="block text-sm font-medium text-gray-700 mb-3">
              Product *
            </label>
            <SearchableDropdown
              id="product"
              options={productOptions}
              value={selectedProductId || ''}
              onChange={(value) => setSelectedProductId(value as number)}
              placeholder={isLoadingProducts ? "Loading products..." : "Select a product..."}
              disabled={isLoadingProducts || !selectedClientGroupId}
              className={errors.product ? 'border-red-300' : ''}
            />
            {errors.product && (
              <p className="mt-2 text-sm text-red-600">{errors.product}</p>
            )}
          </div>

          {/* Step 3: Portfolio Fund Selection */}
          <div className={!selectedProductId ? 'opacity-50' : ''}>
            <label htmlFor="portfolio_fund" className="block text-sm font-medium text-gray-700 mb-3">
              Portfolio Fund *
            </label>
            <SearchableDropdown
              id="portfolio_fund"
              options={portfolioFundOptions}
              value={selectedPortfolioFundId || ''}
              onChange={(value) => setSelectedPortfolioFundId(value as number)}
              placeholder={isLoadingPortfolioFunds ? "Loading portfolio funds..." : "Select a portfolio fund..."}
              disabled={isLoadingPortfolioFunds || !selectedProductId}
              className={errors.portfolio_fund_id ? 'border-red-300' : ''}
            />
            {errors.portfolio_fund_id && (
              <p className="mt-2 text-sm text-red-600">{errors.portfolio_fund_id}</p>
            )}
          </div>
        </div>
      </div>

      {/* Transaction Details */}
      <div className="space-y-6">
        <h3 className="text-lg font-medium text-gray-700 border-b border-gray-200 pb-2">
          Transaction Details
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Amount */}
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-3">
              Amount *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-gray-500 text-lg">£</span>
              <input
                type="number"
                id="amount"
                value={formData.amount || ''}
                onChange={(e) => handleChange('amount', parseFloat(e.target.value) || 0)}
                className={`w-full pl-10 pr-3 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg ${
                  errors.amount ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="0.00"
                step="0.01"
                min="0"
              />
            </div>
            {errors.amount && (
              <p className="mt-2 text-sm text-red-600">{errors.amount}</p>
            )}
          </div>

          {/* Execution Day */}
          <div>
            <label htmlFor="execution_day" className="block text-sm font-medium text-gray-700 mb-3">
              Execution Day *
            </label>
            <select
              id="execution_day"
              value={formData.execution_day}
              onChange={(e) => handleChange('execution_day', parseInt(e.target.value))}
              className={`w-full px-3 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg ${
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
              <p className="mt-2 text-sm text-red-600">{errors.execution_day}</p>
            )}
            <p className="mt-2 text-sm text-gray-500">
              For months with fewer days, the transaction will execute on the last day of the month.
            </p>
          </div>
        </div>
      </div>

      {/* Recurring Transaction Options */}
      <div className="space-y-6">
        <h3 className="text-lg font-medium text-gray-700 border-b border-gray-200 pb-2">
          Recurring Options
        </h3>
        
        {/* Recurring Transaction Toggle */}
        <div>
          <label className="flex items-center space-x-4">
            <input
              type="checkbox"
              checked={formData.is_recurring}
              onChange={(e) => handleChange('is_recurring', e.target.checked)}
              className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="text-lg font-medium text-gray-700">
              Make this a recurring transaction
            </span>
          </label>
        </div>

        {/* Recurring Options */}
        {formData.is_recurring && (
          <div className="space-y-6 p-6 bg-gray-50 rounded-lg border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="recurrence_interval" className="block text-sm font-medium text-gray-700 mb-3">
                  Recurrence Interval *
                </label>
                <select
                  id="recurrence_interval"
                  value={formData.recurrence_interval || ''}
                  onChange={(e) => handleChange('recurrence_interval', e.target.value as any)}
                  className={`w-full px-3 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg ${
                    errors.recurrence_interval ? 'border-red-300' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select interval...</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly (every 3 months)</option>
                  <option value="annually">Annually (once per year)</option>
                </select>
                {errors.recurrence_interval && (
                  <p className="mt-2 text-sm text-red-600">{errors.recurrence_interval}</p>
                )}
              </div>

              <div>
                <label htmlFor="max_executions" className="block text-sm font-medium text-gray-700 mb-3">
                  Maximum Executions (optional)
                </label>
                <input
                  type="number"
                  id="max_executions"
                  value={formData.max_executions || ''}
                  onChange={(e) => handleChange('max_executions', e.target.value ? parseInt(e.target.value) : undefined)}
                  className={`w-full px-3 py-3 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg ${
                    errors.max_executions ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Leave empty for unlimited"
                  min="1"
                />
                {errors.max_executions && (
                  <p className="mt-2 text-sm text-red-600">{errors.max_executions}</p>
                )}
                <p className="mt-2 text-sm text-gray-500">
                  Leave empty to continue indefinitely until manually stopped.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-lg font-medium text-gray-700 mb-3">
          Description (optional)
        </label>
        <textarea
          id="description"
          value={formData.description || ''}
          onChange={(e) => handleChange('description', e.target.value)}
          rows={4}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
          placeholder="Add a description for this scheduled transaction..."
        />
      </div>

      {/* Submit Button */}
      <div className="flex justify-center pt-6 border-t border-gray-200">
        <Button
          type="submit"
          disabled={createMutation.isPending}
          className="bg-blue-600 hover:bg-blue-700 text-white px-12 py-4 text-lg font-semibold"
        >
          {createMutation.isPending ? 'Creating Transaction...' : 'Schedule Transaction'}
        </Button>
      </div>

      {/* Error Display */}
      {errors.submit && (
        <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-lg text-red-600">{errors.submit}</p>
        </div>
      )}
    </form>
  );
};

export default ScheduledTransactionForm; 