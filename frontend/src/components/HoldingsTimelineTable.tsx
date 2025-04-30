import React from 'react';

interface Fund {
  id: number;
  fund_name: string;
  amount_invested: number;
  market_value: number;
  irr: number;
}

interface Holding {
  id: number;
  portfolio_id?: number;
  portfolio_name?: string;
  status: string;
  start_date: string;
  end_date?: string;
  fund_id?: number;
  fund_name?: string;
  target_weighting?: number;
  units: number;
  market_value: number;
  price_per_unit: number;
  irr?: number;
  activities: any[];
  account_holding_id: number;
  amount_invested?: number;
  amount_invested_held?: number;
  market_value_held?: number;
}

interface HoldingsTimelineTableProps {
  holdings: Holding[];
  onRecordActivity: (holding: Holding) => void;
}

const HoldingsTimelineTable: React.FC<HoldingsTimelineTableProps> = ({
  holdings,
  onRecordActivity
}) => {
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
  };

  const formatPercentage = (value: number): string => {
    return `${(value * 100).toFixed(1)}%`;
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fund</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Date</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End Date</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Units</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Market Value</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IRR</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {holdings.map((holding) => (
            <tr key={holding.id}>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {holding.fund_name || 'Unknown Fund'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {holding.status}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {holding.start_date}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {holding.end_date || '-'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {holding.units}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {formatCurrency(holding.market_value)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {holding.irr ? formatPercentage(holding.irr) : '-'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div className="flex justify-end space-x-2">
                  {/* View IRR History button removed */}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default HoldingsTimelineTable; 