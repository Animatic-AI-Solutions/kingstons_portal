import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ScheduledTransaction,
  getScheduledTransactions,
  pauseScheduledTransaction,
  resumeScheduledTransaction,
  cancelScheduledTransaction
} from '../services/scheduledTransactions';
import Button from './ui/Button';
import ScheduledTransactionEditModal from './ScheduledTransactionEditModal';

/**
 * ScheduledTransactionsList Component
 * 
 * Displays a list of scheduled transactions with management capabilities
 * including pause, resume, edit, and cancel operations.
 */
const ScheduledTransactionsList: React.FC = () => {
  const queryClient = useQueryClient();
  const [editingTransaction, setEditingTransaction] = useState<ScheduledTransaction | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'paused' | 'completed'>('all');

  // Fetch scheduled transactions
  const { data: transactionsData, isLoading, error } = useQuery({
    queryKey: ['scheduled-transactions', filter],
    queryFn: () => getScheduledTransactions(filter === 'all' ? {} : { status: filter }),
  });

  // Mutation for pausing transactions
  const pauseMutation = useMutation({
    mutationFn: pauseScheduledTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-transactions'] });
    },
  });

  // Mutation for resuming transactions
  const resumeMutation = useMutation({
    mutationFn: resumeScheduledTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-transactions'] });
    },
  });

  // Mutation for cancelling transactions
  const cancelMutation = useMutation({
    mutationFn: cancelScheduledTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled-transactions'] });
    },
  });

  const transactions = transactionsData?.data || [];

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Get status badge styling
  const getStatusBadge = (status: string) => {
    const baseClasses = 'px-2 py-1 text-xs font-medium rounded-full';
    
    switch (status) {
      case 'active':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'paused':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case 'cancelled':
        return `${baseClasses} bg-red-100 text-red-800`;
      case 'completed':
        return `${baseClasses} bg-blue-100 text-blue-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  // Get transaction type styling and label
  const getTransactionTypeInfo = (type: string) => {
    switch (type) {
      case 'Investment':
        return { label: 'One-time Investment', color: 'text-green-600' };
      case 'RegularInvestment':
        return { label: 'Recurring Investment', color: 'text-green-700' };
      case 'Withdrawal':
        return { label: 'One-time Withdrawal', color: 'text-red-600' };
      case 'RegularWithdrawal':
        return { label: 'Recurring Withdrawal', color: 'text-red-700' };
      default:
        return { label: type, color: 'text-gray-600' };
    }
  };

  // Handle action clicks
  const handlePause = (id: number) => {
    if (window.confirm('Are you sure you want to pause this scheduled transaction?')) {
      pauseMutation.mutate(id);
    }
  };

  const handleResume = (id: number) => {
    resumeMutation.mutate(id);
  };

  const handleCancel = (id: number) => {
    if (window.confirm('Are you sure you want to cancel this scheduled transaction? This action cannot be undone.')) {
      cancelMutation.mutate(id);
    }
  };

  const handleEdit = (transaction: ScheduledTransaction) => {
    setEditingTransaction(transaction);
  };

  const handleEditComplete = () => {
    setEditingTransaction(null);
    queryClient.invalidateQueries({ queryKey: ['scheduled-transactions'] });
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 bg-gray-200 rounded-lg"></div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">Failed to load scheduled transactions.</p>
        <Button 
          onClick={() => queryClient.invalidateQueries({ queryKey: ['scheduled-transactions'] })}
          className="mt-4"
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter Controls */}
      <div className="flex space-x-2">
        {['all', 'active', 'paused', 'completed'].map((filterOption) => (
          <button
            key={filterOption}
            onClick={() => setFilter(filterOption as any)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              filter === filterOption
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
          </button>
        ))}
      </div>

      {/* Transactions List */}
      {transactions.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No scheduled transactions found.</p>
          <p className="text-gray-400 mt-2">
            {filter === 'all' 
              ? 'Create your first scheduled transaction using the form above.'
              : `No ${filter} transactions found.`
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {transactions.map((transaction) => {
            const typeInfo = getTransactionTypeInfo(transaction.transaction_type);
            
            return (
              <div
                key={transaction.id}
                className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 space-y-3">
                    {/* Header Row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <h3 className={`text-lg font-medium ${typeInfo.color}`}>
                          {typeInfo.label}
                        </h3>
                        <span className={getStatusBadge(transaction.status)}>
                          {transaction.status}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-gray-900">
                          {formatCurrency(transaction.amount)}
                        </div>
                      </div>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Execution Day:</span>
                        <div className="font-medium">Day {transaction.execution_day}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Next Execution:</span>
                        <div className="font-medium">
                          {formatDate(transaction.next_execution_date)}
                        </div>
                      </div>
                      {transaction.is_recurring && (
                        <>
                          <div>
                            <span className="text-gray-500">Interval:</span>
                            <div className="font-medium capitalize">
                              {transaction.recurrence_interval}
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-500">Executions:</span>
                            <div className="font-medium">
                              {transaction.total_executions}
                              {transaction.max_executions && ` / ${transaction.max_executions}`}
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Description */}
                    {transaction.description && (
                      <div className="text-sm text-gray-600">
                        <span className="text-gray-500">Description:</span> {transaction.description}
                      </div>
                    )}

                    {/* Last Execution */}
                    {transaction.last_executed_date && (
                      <div className="text-sm text-gray-600">
                        <span className="text-gray-500">Last Executed:</span> {formatDate(transaction.last_executed_date)}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col space-y-2 ml-6">
                    {transaction.status === 'active' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(transaction)}
                          className="min-w-20"
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handlePause(transaction.id)}
                          disabled={pauseMutation.isPending}
                          className="min-w-20"
                        >
                          {pauseMutation.isPending ? 'Pausing...' : 'Pause'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCancel(transaction.id)}
                          disabled={cancelMutation.isPending}
                          className="min-w-20 text-red-600 border-red-300 hover:bg-red-50"
                        >
                          {cancelMutation.isPending ? 'Cancelling...' : 'Cancel'}
                        </Button>
                      </>
                    )}

                    {transaction.status === 'paused' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(transaction)}
                          className="min-w-20"
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleResume(transaction.id)}
                          disabled={resumeMutation.isPending}
                          className="min-w-20 bg-green-600 hover:bg-green-700 text-white"
                        >
                          {resumeMutation.isPending ? 'Resuming...' : 'Resume'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCancel(transaction.id)}
                          disabled={cancelMutation.isPending}
                          className="min-w-20 text-red-600 border-red-300 hover:bg-red-50"
                        >
                          {cancelMutation.isPending ? 'Cancelling...' : 'Cancel'}
                        </Button>
                      </>
                    )}

                    {(transaction.status === 'cancelled' || transaction.status === 'completed') && (
                      <div className="text-sm text-gray-500 text-center py-2 min-w-20">
                        No actions available
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Modal */}
      {editingTransaction && (
        <ScheduledTransactionEditModal
          transaction={editingTransaction}
          onClose={() => setEditingTransaction(null)}
          onSave={handleEditComplete}
        />
      )}
    </div>
  );
};

export default ScheduledTransactionsList; 