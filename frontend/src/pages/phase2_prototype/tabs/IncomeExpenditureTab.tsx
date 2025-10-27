import React, { useState } from 'react';
import { ChevronRightIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { formatMoney } from '../../../utils/formatMoney';
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
  // Track which expenditure categories are expanded
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Toggle category expansion
  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  // Group expenditure by category and calculate totals
  const expenditureByCategory: Record<string, { items: Expenditure[]; total: number }> = {};

  expenditure.forEach((exp) => {
    if (!expenditureByCategory[exp.type]) {
      expenditureByCategory[exp.type] = { items: [], total: 0 };
    }
    expenditureByCategory[exp.type].items.push(exp);
    // Convert to annual for consistent totaling
    const annualAmount = exp.frequency === 'Monthly' ? exp.amount * 12 : exp.amount;
    expenditureByCategory[exp.type].total += annualAmount;
  });

  // Define category order
  const categoryOrder: Array<Expenditure['type']> = [
    'Home',
    'Personal',
    'Pets',
    'Children',
    'Financial',
    'Rental & Second Homes',
    'Car(s) and Travel',
    'Discretionary'
  ];

  // Calculate total income (normalize to annual)
  const totalIncome = income.reduce((sum, inc) => {
    const annualAmount = inc.frequency === 'Monthly' ? inc.amount * 12 : inc.amount;
    return sum + annualAmount;
  }, 0);

  // Calculate total expenditure (sum of all category totals)
  const totalExpenditure = Object.values(expenditureByCategory).reduce(
    (sum, category) => sum + category.total,
    0
  );

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
                  {formatMoney(inc.amount)}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-right text-base">
                  <ChevronRightIcon className="w-5 h-5 text-gray-900" />
                </td>
              </tr>
            ))}
            {/* Totals Row */}
            <tr className="bg-primary-50 border-t-2 border-primary-600 font-bold">
              <td className="px-3 py-3 text-base text-gray-900" colSpan={4}>
                Total Income
              </td>
              <td className="px-3 py-3 whitespace-nowrap text-base text-gray-900 text-right">
                {formatMoney(totalIncome)} <span className="text-sm font-normal text-gray-600">/ year</span>
              </td>
              <td className="px-3 py-3"></td>
            </tr>
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
              <th className="px-3 py-2 text-left text-sm font-bold text-gray-900 uppercase">Category</th>
              <th className="px-3 py-2 text-left text-sm font-bold text-gray-900 uppercase">Description</th>
              <th className="px-3 py-2 text-left text-sm font-bold text-gray-900 uppercase">Frequency</th>
              <th className="px-3 py-2 text-left text-sm font-bold text-gray-900 uppercase">Essential</th>
              <th className="px-3 py-2 text-right text-sm font-bold text-gray-900 uppercase">Amount</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {categoryOrder.map((category) => {
              const categoryData = expenditureByCategory[category];
              if (!categoryData) return null;

              const isExpanded = expandedCategories.has(category);

              return (
                <React.Fragment key={category}>
                  {/* Category Row (Expandable) */}
                  <tr
                    className="bg-gray-50 hover:bg-gray-100 cursor-pointer font-semibold"
                    onClick={() => toggleCategory(category)}
                  >
                    <td className="px-3 py-2 whitespace-nowrap text-base text-gray-900">
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDownIcon className="w-5 h-5 text-gray-700" />
                        ) : (
                          <ChevronRightIcon className="w-5 h-5 text-gray-700" />
                        )}
                        {category}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-base text-gray-600">
                      {categoryData.items.length} item{categoryData.items.length !== 1 ? 's' : ''}
                    </td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2 whitespace-nowrap text-base text-gray-900 text-right font-bold">
                      {formatMoney(categoryData.total)} <span className="text-sm text-gray-600">/ year</span>
                    </td>
                    <td className="px-3 py-2"></td>
                  </tr>

                  {/* Individual Items (shown when expanded) */}
                  {isExpanded && categoryData.items.map((exp) => (
                    <tr
                      key={exp.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        onExpenditureClick(exp);
                      }}
                    >
                      <td className="px-3 py-2 whitespace-nowrap text-base text-gray-900 pl-10">
                        {/* Indented to show hierarchy */}
                      </td>
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
                        {formatMoney(exp.amount)} <span className="text-sm text-gray-600">/ {exp.frequency.toLowerCase()}</span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-right text-base">
                        <ChevronRightIcon className="w-5 h-5 text-gray-900" />
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
            {/* Totals Row */}
            <tr className="bg-primary-50 border-t-2 border-primary-600 font-bold">
              <td className="px-3 py-3 text-base text-gray-900" colSpan={4}>
                Total Expenditure
              </td>
              <td className="px-3 py-3 whitespace-nowrap text-base text-gray-900 text-right">
                {formatMoney(totalExpenditure)} <span className="text-sm font-normal text-gray-600">/ year</span>
              </td>
              <td className="px-3 py-3"></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default IncomeExpenditureTab;
