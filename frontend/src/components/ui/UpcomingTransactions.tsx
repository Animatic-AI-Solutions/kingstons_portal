import React from 'react';
import { 
  CalendarIcon, 
  ClockIcon
} from '@heroicons/react/24/outline';

/**
 * UpcomingTransactions Component
 * 
 * Displays a placeholder for upcoming transactions.
 * Previously showed scheduled transactions, but that feature has been removed.
 */
const UpcomingTransactions: React.FC = () => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-900">Upcoming Transactions</h3>
        <ClockIcon className="h-4 w-4 text-gray-400" />
      </div>

      <div className="text-center py-4">
        <CalendarIcon className="h-6 w-6 text-gray-300 mx-auto mb-1" />
        <p className="text-gray-500 text-xs mb-0.5">No upcoming transactions</p>
        <p className="text-gray-400 text-xs">
          Transaction scheduling feature is not currently available
        </p>
      </div>
    </div>
  );
};

export default UpcomingTransactions; 