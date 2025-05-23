import axios from 'axios';

/**
 * Scheduled Transactions API Service
 * 
 * This service provides methods for managing scheduled financial transactions
 * including one-time and recurring investments and withdrawals.
 */

// Use the same axios instance pattern as the main API service
const api = axios.create({
  baseURL: '',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add the same interceptors as main API service
api.interceptors.request.use(
  (config) => {
    if (config.url && !config.url.startsWith('/api/')) {
      config.url = `/api${config.url.startsWith('/') ? '' : '/'}${config.url}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Type definitions for scheduled transactions
 */
export interface ScheduledTransaction {
  id: number;
  portfolio_fund_id: number;
  transaction_type: 'Investment' | 'RegularInvestment' | 'Withdrawal' | 'RegularWithdrawal';
  amount: number;
  execution_day: number;
  next_execution_date: string;
  is_recurring: boolean;
  recurrence_interval?: 'monthly' | 'quarterly' | 'annually';
  status: 'active' | 'paused' | 'cancelled' | 'completed';
  last_executed_date?: string;
  total_executions: number;
  max_executions?: number;
  description?: string;
  created_by?: number;
  created_at: string;
  updated_at: string;
}

export interface ScheduledTransactionCreate {
  portfolio_fund_id: number;
  transaction_type: 'Investment' | 'RegularInvestment' | 'Withdrawal' | 'RegularWithdrawal';
  amount: number;
  execution_day: number;
  description?: string;
  is_recurring: boolean;
  recurrence_interval?: 'monthly' | 'quarterly' | 'annually';
  max_executions?: number;
}

export interface ScheduledTransactionUpdate {
  transaction_type?: 'Investment' | 'RegularInvestment' | 'Withdrawal' | 'RegularWithdrawal';
  amount?: number;
  execution_day?: number;
  description?: string;
  recurrence_interval?: 'monthly' | 'quarterly' | 'annually';
  max_executions?: number;
}

export interface ScheduledTransactionExecution {
  id: number;
  scheduled_transaction_id: number;
  execution_date: string;
  execution_timestamp: string;
  status: 'success' | 'failed' | 'skipped';
  executed_amount: number;
  activity_log_id?: number;
  error_message?: string;
  notes?: string;
}

export interface ExecutePendingResponse {
  message: string;
  executed: number;
  failed?: number;
  execution_date: string;
}

/**
 * SCHEDULED TRANSACTIONS API ENDPOINTS
 */

/**
 * Creates a new scheduled transaction
 * @param data - Transaction data to create
 * @returns Promise with created transaction data
 */
export const createScheduledTransaction = (data: ScheduledTransactionCreate) => {
  return api.post<ScheduledTransaction>('scheduled_transactions', data);
};

/**
 * Fetches all scheduled transactions with optional filtering
 * @param params - Optional filter parameters
 * @returns Promise with array of scheduled transactions
 */
export const getScheduledTransactions = (params?: {
  portfolio_fund_id?: number;
  status?: string;
  transaction_type?: string;
}) => {
  return api.get<ScheduledTransaction[]>('scheduled_transactions', { params });
};

/**
 * Fetches a specific scheduled transaction by ID
 * @param transactionId - ID of the transaction to fetch
 * @returns Promise with transaction data
 */
export const getScheduledTransaction = (transactionId: number) => {
  return api.get<ScheduledTransaction>(`scheduled_transactions/${transactionId}`);
};

/**
 * Updates an existing scheduled transaction
 * @param transactionId - ID of the transaction to update
 * @param data - Updated transaction data
 * @returns Promise with updated transaction data
 */
export const updateScheduledTransaction = (
  transactionId: number, 
  data: ScheduledTransactionUpdate
) => {
  return api.patch<ScheduledTransaction>(`scheduled_transactions/${transactionId}`, data);
};

/**
 * Cancels a scheduled transaction (soft delete)
 * @param transactionId - ID of the transaction to cancel
 * @returns Promise with success message
 */
export const cancelScheduledTransaction = (transactionId: number) => {
  return api.delete<{ message: string }>(`scheduled_transactions/${transactionId}`);
};

/**
 * Pauses an active scheduled transaction
 * @param transactionId - ID of the transaction to pause
 * @returns Promise with success message
 */
export const pauseScheduledTransaction = (transactionId: number) => {
  return api.post<{ message: string }>(`scheduled_transactions/${transactionId}/pause`);
};

/**
 * Resumes a paused scheduled transaction
 * @param transactionId - ID of the transaction to resume
 * @returns Promise with success message
 */
export const resumeScheduledTransaction = (transactionId: number) => {
  return api.post<{ message: string }>(`scheduled_transactions/${transactionId}/resume`);
};

/**
 * Fetches execution history for a scheduled transaction
 * @param transactionId - ID of the transaction
 * @returns Promise with array of execution records
 */
export const getTransactionExecutions = (transactionId: number) => {
  return api.get<ScheduledTransactionExecution[]>(`scheduled_transactions/${transactionId}/executions`);
};

/**
 * Executes all pending scheduled transactions for a given date
 * @param targetDate - Optional date to execute for (YYYY-MM-DD), defaults to today
 * @returns Promise with execution summary
 */
export const executePendingTransactions = (targetDate?: string) => {
  const params = targetDate ? { target_date: targetDate } : {};
  return api.post<ExecutePendingResponse>('scheduled_transactions/execute_pending', null, { params });
}; 