import React from 'react';
import { ChevronRightIcon } from '@heroicons/react/24/outline';
import { Income, Expenditure } from '../types';

interface IncomeExpenditureTabProps {
  income: Income[];
  expenditure: Expenditure[];
  onIncomeClick: (income: Income) => void;
  onExpenditureClick: (expenditure: Expenditure) => void;
}

const IncomeExpenditureTab: React.FC<IncomeExpenditureTabProps> = ({
  income,
  expenditure,
  onIncomeClick,
  onExpenditureClick
}) => {
  // Helper function to format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Income Section */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-3 py-2 bg-gray-50 border-b">
          <h3 className="text-xl font-semibold">Income</h3>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-sm font-bold text-gray-900 uppercase">Type</th>
              <th className="px-3 py-2 text-left text-sm font-bold text-gray-900 uppercase">Source</th>
              <th className="px-3 py-2 text-left text-sm font-bold text-gray-900 uppercase">Owner</th>
              <th className="px-3 py-2 text-left text-sm font-bold text-gray-900 uppercase">Frequency</th>
              <th className="px-3 py-2 text-right text-sm font-bold text-gray-900 uppercase">Amount</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {income.map((inc) => (
              <tr key={inc.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => onIncomeClick(inc)}>
                <td className="px-3 py-2 whitespace-nowrap text-base text-gray-900">{inc.type}</td>
                <td className="px-3 py-2 whitespace-nowrap text-base font-medium text-gray-900">{inc.source}</td>
                <td className="px-3 py-2 whitespace-nowrap text-base text-gray-900">{inc.owner}</td>
                <td className="px-3 py-2 whitespace-nowrap text-base text-gray-900">{inc.frequency}</td>
                <td className="px-3 py-2 whitespace-nowrap text-base text-gray-900 text-right font-semibold">
                  {formatCurrency(inc.amount)}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-right text-base">
                  <ChevronRightIcon className="w-5 h-5 text-gray-900" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Expenditure Section */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-3 py-2 bg-gray-50 border-b">
          <h3 className="text-xl font-semibold">Expenditure</h3>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-sm font-bold text-gray-900 uppercase">Type</th>
              <th className="px-3 py-2 text-left text-sm font-bold text-gray-900 uppercase">Description</th>
              <th className="px-3 py-2 text-left text-sm font-bold text-gray-900 uppercase">Frequency</th>
              <th className="px-3 py-2 text-left text-sm font-bold text-gray-900 uppercase">Essential</th>
              <th className="px-3 py-2 text-right text-sm font-bold text-gray-900 uppercase">Amount</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {expenditure.map((exp) => (
              <tr key={exp.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => onExpenditureClick(exp)}>
                <td className="px-3 py-2 whitespace-nowrap text-base text-gray-900">{exp.type}</td>
                <td className="px-3 py-2 text-base font-medium text-gray-900">{exp.description}</td>
                <td className="px-3 py-2 whitespace-nowrap text-base text-gray-900">{exp.frequency}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                    exp.essential
                      ? 'bg-red-100 text-red-800'
                      : 'bg-gray-100 text-gray-900'
                  }`}>
                    {exp.essential ? 'Yes' : 'No'}
                  </span>
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-base text-gray-900 text-right font-semibold">
                  {formatCurrency(exp.amount)}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-right text-base">
                  <ChevronRightIcon className="w-5 h-5 text-gray-900" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default IncomeExpenditureTab;
