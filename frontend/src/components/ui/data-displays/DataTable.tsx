import React from 'react';

interface DataTableProps {
  data: Array<{
    id: string;
    name: string;
    amount: number;
  }>;
  title: string;
  totalAmount?: number; // Optional: Full dataset total (if different from displayed items total)
}

const DataTable: React.FC<DataTableProps> = ({ data, title, totalAmount }) => {
  // Calculate total for percentage calculations (use provided totalAmount or calculate from data)
  const total = totalAmount || data.reduce((sum, item) => sum + item.amount, 0);
  
  // Calculate displayed items total for debugging
  const displayedTotal = data.reduce((sum, item) => sum + item.amount, 0);
  
  // DEBUGGING: Log table data
  console.log(`📋 ${title} Table - Full Total: £${total.toLocaleString()}, Displayed (Top 5): £${displayedTotal.toLocaleString()}, Items: ${data.length}`);

  // Truncate names to prevent horizontal scrolling
  const truncateName = (name: string, maxLength: number = 12) => {
    if (name.length <= maxLength) return name;
    return name.substring(0, maxLength) + '...';
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Format percentage
  const formatPercentage = (amount: number, total: number) => {
    if (total === 0) return '0.0%';
    return `${((amount / total) * 100).toFixed(1)}%`;
  };

  return (
    <div className="bg-white shadow-md rounded-lg overflow-hidden border border-gray-100">
      {/* Header */}
      <div className="bg-primary-700 px-6 py-4">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
      </div>
      
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/2">
                Name
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">
                Amount
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">
                Percentage
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.length > 0 ? (
              data.map((item, index) => (
                <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap w-1/2">
                    <div 
                      className="text-sm font-medium text-gray-900 cursor-help" 
                      title={item.name}
                    >
                      {truncateName(item.name)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right w-1/4">
                    <div className="text-sm text-gray-900">{formatCurrency(item.amount)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right w-1/4">
                    <div className="text-sm font-medium text-primary-600">
                      {formatPercentage(item.amount, total)}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500">
                  No data available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Footer with total */}
      {data.length > 0 && (
        <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-900">Total:</span>
            <span className="text-sm font-bold text-primary-700">{formatCurrency(total)}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable; 