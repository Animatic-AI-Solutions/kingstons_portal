import React, { useState, useEffect, useMemo, useRef } from 'react';
import { formatCurrency } from '../utils/formatters';
import api from '../services/api';
import BulkMonthActivitiesModal from './BulkMonthActivitiesModal';

interface Activity {
  id?: number;
  activity_timestamp: string;
  activity_type: string;
  amount: string;
  portfolio_fund_id: number;
  account_holding_id: number;
  units_transacted?: number;
  market_value_held?: number;
}

interface Fund {
  id: number;
  fund_name: string;
  holding_id: number;
  irr?: number;
  start_date?: string;
  isActive?: boolean;
  inactiveHoldingIds?: any[];
  isInactiveBreakdown?: boolean;
}

interface CellEdit {
  fundId: number;
  month: string;
  activityType: string;
  value: string;
  isNew: boolean;
  originalActivityId?: number;
  toDelete?: boolean;
}

interface SimplifiedActivitiesTableProps {
  funds: Fund[];
  activities: Activity[];
  accountHoldingId: number;
  onActivitiesUpdated: () => void;
  selectedYear?: number;
}

const ACTIVITY_TYPES = [
  'Investment',
  'RegularInvestment', 
  'GovernmentUplift',
  'ProductSwitchIn',
  'ProductSwitchOut',
  'FundSwitchIn',
  'FundSwitchOut',
  'Withdrawal',
  'Current Value'
];

const SimplifiedActivitiesTable: React.FC<SimplifiedActivitiesTableProps> = ({
  funds,
  activities,
  accountHoldingId,
  onActivitiesUpdated,
  selectedYear
}) => {
  const [months, setMonths] = useState<string[]>([]);
  const [pendingEdits, setPendingEdits] = useState<CellEdit[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showInactiveFunds, setShowInactiveFunds] = useState(false);
  const [isCompactView, setIsCompactView] = useState(false);

  // Generate months for the selected year
  useEffect(() => {
    const currentYear = selectedYear || new Date().getFullYear();
    const monthsList = [];
    
    for (let month = 1; month <= 12; month++) {
      monthsList.push(`${currentYear}-${String(month).padStart(2, '0')}`);
    }
    
    setMonths(monthsList);
  }, [selectedYear]);

  // Simplified save function - all activities saved uniformly
  const saveChanges = async () => {
    if (pendingEdits.length === 0) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const editsToProcess = pendingEdits.filter(edit => 
        edit.value.trim() !== '' || edit.toDelete
      );

      // Process deletions
      const deletions = editsToProcess.filter(edit => edit.toDelete && edit.originalActivityId);
      for (const edit of deletions) {
        await api.delete(`holding_activity_logs/${edit.originalActivityId}`);
      }

      // Process creations and updates
      const creationsAndUpdates = editsToProcess.filter(edit => !edit.toDelete);
      for (const edit of creationsAndUpdates) {
        if (edit.value.trim() === '') continue;

        const activityData = {
          product_id: accountHoldingId,
          portfolio_fund_id: edit.fundId,
          activity_timestamp: `${edit.month}-01`,
          activity_type: edit.activityType,
          amount: parseFloat(edit.value)
        };

        if (edit.isNew) {
          await api.post('holding_activity_logs', activityData);
        } else if (edit.originalActivityId) {
          await api.patch(`holding_activity_logs/${edit.originalActivityId}`, activityData);
        }
      }

      setPendingEdits([]);
      onActivitiesUpdated();

    } catch (error: any) {
      console.error('Error saving activities:', error);
      setError(error.response?.data?.detail || 'Failed to save activities');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get cell value for display
  const getCellValue = (fundId: number, month: string, activityType: string): string => {
    // Check pending edits first
    const pendingEdit = pendingEdits.find(
      edit => edit.fundId === fundId && 
               edit.month === month && 
               edit.activityType === activityType
    );
    
    if (pendingEdit) {
      return pendingEdit.toDelete ? '' : pendingEdit.value;
    }

    // Find existing activity
    const activity = activities.find(a => {
      const activityDate = new Date(a.activity_timestamp);
      const activityMonth = `${activityDate.getFullYear()}-${String(activityDate.getMonth() + 1).padStart(2, '0')}`;
      
      return a.portfolio_fund_id === fundId && 
             activityMonth === month && 
             a.activity_type === activityType;
    });

    return activity ? activity.amount : '';
  };

  // Handle cell value changes
  const handleCellChange = (fundId: number, month: string, activityType: string, value: string) => {
    // Remove existing edit for this cell
    const filteredEdits = pendingEdits.filter(
      edit => !(edit.fundId === fundId && edit.month === month && edit.activityType === activityType)
    );

    // Find existing activity
    const existingActivity = activities.find(a => {
      const activityDate = new Date(a.activity_timestamp);
      const activityMonth = `${activityDate.getFullYear()}-${String(activityDate.getMonth() + 1).padStart(2, '0')}`;
      
      return a.portfolio_fund_id === fundId && 
             activityMonth === month && 
             a.activity_type === activityType;
    });

    if (value.trim() === '') {
      // If clearing value and activity exists, mark for deletion
      if (existingActivity?.id) {
        filteredEdits.push({
          fundId,
          month,
          activityType,
          value: '',
          isNew: false,
          originalActivityId: existingActivity.id,
          toDelete: true
        });
      }
    } else {
      // Add or update activity
      filteredEdits.push({
        fundId,
        month,
        activityType,
        value,
        isNew: !existingActivity,
        originalActivityId: existingActivity?.id
      });
    }

    setPendingEdits(filteredEdits);
  };

  // Format activity type for display
  const formatActivityType = (activityType: string): string => {
    const typeMap: { [key: string]: string } = {
      'Investment': 'Investment',
      'RegularInvestment': 'Regular Investment',
      'GovernmentUplift': 'Government Uplift',
        'ProductSwitchIn': 'Product Switch In',
  'ProductSwitchOut': 'Product Switch Out',
  'FundSwitchIn': 'Switch In',
  'FundSwitchOut': 'Switch Out',
      'Withdrawal': 'Withdrawal',
    
      'Current Value': 'Current Value'
    };
    return typeMap[activityType] || activityType;
  };

  // Format month for display
  const formatMonth = (month: string): string => {
    const date = new Date(month + '-01');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const year = date.getFullYear().toString().slice(-2);
    return `${monthNames[date.getMonth()]} ${year}`;
  };

  return (
    <>
      <div className="space-y-4">
        {/* Controls */}
        <div className="flex justify-between items-center">
          <div className="flex space-x-4">
            <button
              onClick={() => setIsCompactView(!isCompactView)}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded border"
            >
              {isCompactView ? 'Detailed View' : 'Compact View'}
            </button>
            <button
              onClick={() => setShowInactiveFunds(!showInactiveFunds)}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded border"
            >
              {showInactiveFunds ? 'Hide' : 'Show'} Inactive Funds
            </button>
          </div>
          
          {pendingEdits.length > 0 && (
            <div className="flex space-x-2">
              <span className="text-sm text-gray-600">
                {pendingEdits.length} pending change{pendingEdits.length !== 1 ? 's' : ''}
              </span>
              <button
                onClick={saveChanges}
                disabled={isSubmitting}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={() => setPendingEdits([])}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 border border-gray-300">
            <thead className="bg-blue-50">
              <tr>
                <th className="px-1 py-0 text-left font-medium text-gray-800 border-b border-gray-300">
                  Fund
                </th>
                <th className="px-1 py-0 text-left font-medium text-gray-800 border-b border-gray-300">
                  Activity
                </th>
                {months.map(month => (
                  <th 
                    key={month}
                    className="px-1 py-0 text-center font-medium text-gray-800 border-b border-gray-300"
                  >
                    {formatMonth(month)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {/* Render fund rows */}
              {funds
                .filter(fund => fund.isActive || showInactiveFunds)
                .map(fund => 
                  ACTIVITY_TYPES.map((activityType, activityIndex) => (
                    <tr key={`${fund.id}-${activityType}`} className="hover:bg-gray-50">
                      <td className="px-1 py-0 font-medium text-gray-900">
                        {activityIndex === 0 ? fund.fund_name : ''}
                      </td>
                      <td className="px-1 py-0 text-gray-700">
                        {formatActivityType(activityType)}
                      </td>
                      {months.map(month => {
                        const value = getCellValue(fund.id, month, activityType);
                        return (
                          <td key={month} className="px-1 py-0">
                            <input
                              type="text"
                              value={value}
                              onChange={(e) => handleCellChange(fund.id, month, activityType, e.target.value)}
                              className="w-full text-center border-none focus:ring-2 focus:ring-blue-500 rounded px-1"
                              placeholder="0"
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default SimplifiedActivitiesTable; 