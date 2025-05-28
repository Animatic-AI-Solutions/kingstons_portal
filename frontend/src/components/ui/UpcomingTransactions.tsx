import React, { useState, useEffect } from 'react';
import { getUpcomingScheduledTransactions } from '../../services/api';
import { getScheduledTransaction, ScheduledTransaction } from '../../services/scheduledTransactions';
import ScheduledTransactionEditModal from '../ScheduledTransactionEditModal';
import { 
  CalendarIcon, 
  ArrowUpIcon, 
  ArrowDownIcon,
  ClockIcon,
  PencilIcon
} from '@heroicons/react/24/outline';

interface UpcomingTransaction {
  id: number;
  transaction_type: string;
  amount: number;
  next_execution_date: string;
  execution_day: number;
  is_recurring: boolean;
  recurrence_interval: string | null;
  description: string | null;
  fund_name: string;
  fund_code: string;
  client_name: string;
  client_type: string;
  product_name: string;
  portfolio_fund_id: number;
  client_product_id: number;
  client_group_id: number;
}

const UpcomingTransactions: React.FC = () => {
  const [transactions, setTransactions] = useState<UpcomingTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTransaction, setEditingTransaction] = useState<ScheduledTransaction | null>(null);
  const [loadingTransactionId, setLoadingTransactionId] = useState<number | null>(null);

  useEffect(() => {
    fetchUpcomingTransactions();
  }, []);

  const fetchUpcomingTransactions = async () => {
    try {
      setLoading(true);
      const response = await getUpcomingScheduledTransactions({ days_ahead: 7, limit: 5 });
      setTransactions(response.data || []);
    } catch (err: any) {
      console.error('Error fetching upcoming transactions:', err);
      
      // Instead of showing an error, treat this as "no transactions available"
      // This handles cases where:
      // 1. There are no scheduled transactions in the database
      // 2. The database query fails due to missing tables/data
      // 3. Network issues
      setTransactions([]);
      
      // Log the actual error for debugging but don't show it to user
      console.warn('Upcoming transactions could not be loaded, showing empty state instead');
    } finally {
      setLoading(false);
    }
  };

  const handleTransactionClick = async (transactionId: number) => {
    try {
      setLoadingTransactionId(transactionId);
      const response = await getScheduledTransaction(transactionId);
      setEditingTransaction(response.data);
    } catch (error) {
      console.error('Error fetching transaction details:', error);
      // Could show a toast notification here
    } finally {
      setLoadingTransactionId(null);
    }
  };

  const handleModalClose = () => {
    setEditingTransaction(null);
  };

  const handleModalSave = () => {
    setEditingTransaction(null);
    // Refresh the upcoming transactions list
    fetchUpcomingTransactions();
  };

  const getTransactionIcon = (type: string) => {
    const iconClass = "h-3 w-3";
    switch (type) {
      case 'Investment':
      case 'RegularInvestment':
        return <ArrowDownIcon className={`${iconClass} text-green-600`} />;
      case 'Withdrawal':
      case 'RegularWithdrawal':
        return <ArrowUpIcon className={`${iconClass} text-red-600`} />;
      default:
        return <CalendarIcon className={`${iconClass} text-gray-600`} />;
    }
  };

  const getTransactionTypeLabel = (type: string) => {
    switch (type) {
      case 'Investment':
        return 'Investment';
      case 'RegularInvestment':
        return 'Regular Investment';
      case 'Withdrawal':
        return 'Withdrawal';
      case 'RegularWithdrawal':
        return 'Regular Withdrawal';
      default:
        return type;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-900">Upcoming Transactions</h3>
          <ClockIcon className="h-4 w-4 text-gray-400" />
        </div>
        <div className="space-y-1.5">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="flex items-center space-x-2">
                <div className="h-6 w-6 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-2.5 bg-gray-200 rounded w-3/4 mb-0.5"></div>
                  <div className="h-2 bg-gray-200 rounded w-1/2"></div>
                </div>
                <div className="h-2.5 bg-gray-200 rounded w-10"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-900">Upcoming Transactions</h3>
        <ClockIcon className="h-4 w-4 text-gray-400" />
      </div>

      {transactions.length === 0 ? (
        <div className="text-center py-4">
          <CalendarIcon className="h-6 w-6 text-gray-300 mx-auto mb-1" />
          <p className="text-gray-500 text-xs mb-0.5">No upcoming transactions in the next 7 days</p>
          <p className="text-gray-400 text-xs">
            Scheduled transactions will appear here when they're due within the next week
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {transactions.map((transaction) => (
            <div
              key={transaction.id}
              onClick={() => handleTransactionClick(transaction.id)}
              className="flex items-center space-x-2 p-1.5 rounded hover:bg-gray-50 transition-colors duration-150 cursor-pointer group border border-transparent hover:border-gray-200"
            >
              {/* Transaction Icon */}
              <div className="flex-shrink-0">
                <div className="h-6 w-6 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-gray-200 transition-colors">
                  {loadingTransactionId === transaction.id ? (
                    <div className="animate-spin h-3 w-3 border border-gray-300 border-t-blue-600 rounded-full"></div>
                  ) : (
                    getTransactionIcon(transaction.transaction_type)
                  )}
                </div>
              </div>

              {/* Transaction Details */}
              <div className="flex-1 min-w-0 leading-tight">
                <div className="flex items-center space-x-1.5">
                  <p className="text-xs font-medium text-gray-900 truncate">
                    {getTransactionTypeLabel(transaction.transaction_type)}
                  </p>
                  {transaction.is_recurring && (
                    <span className="inline-flex items-center px-1 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      {transaction.recurrence_interval}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-600 truncate">
                  {transaction.client_name} • {transaction.product_name}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {transaction.fund_name} ({transaction.fund_code})
                </p>
                {transaction.description && (
                  <p className="text-xs text-gray-500 truncate italic">
                    {transaction.description}
                  </p>
                )}
              </div>

              {/* Amount and Date */}
              <div className="flex-shrink-0 text-right">
                <p className="text-xs font-semibold text-gray-900">
                  {formatCurrency(transaction.amount)}
                </p>
                <p className="text-xs text-gray-500">
                  {formatDate(transaction.next_execution_date)}
                </p>
              </div>

              {/* Edit Icon (appears on hover) */}
              <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <PencilIcon className="h-3 w-3 text-gray-400" />
              </div>
            </div>
          ))}

          {/* View All Link */}
          <div className="pt-1.5 border-t border-gray-100">
            <button
              onClick={() => window.location.href = '/scheduler'}
              className="w-full text-center text-xs text-blue-600 hover:text-blue-800 font-medium py-1 hover:bg-blue-50 rounded transition-colors duration-150"
            >
              View All Scheduled Transactions
            </button>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingTransaction && (
        <ScheduledTransactionEditModal
          transaction={editingTransaction}
          onClose={handleModalClose}
          onSave={handleModalSave}
        />
      )}
    </div>
  );
};

export default UpcomingTransactions; 