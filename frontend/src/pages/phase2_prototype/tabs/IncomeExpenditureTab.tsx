import React, { useState } from 'react';
import { ChevronRightIcon, ChevronDownIcon, PlusIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
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
  // Track which expenditure categories are expanded (default: all collapsed)
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

  // Check if all categories are expanded
  const areAllExpanded = expandedCategories.size > 0 &&
    categoryOrder.every(cat => expenditureByCategory[cat] && expandedCategories.has(cat));

  // Toggle all categories (expand or collapse all)
  const toggleAllCategories = () => {
    if (areAllExpanded) {
      // Collapse all
      setExpandedCategories(new Set());
    } else {
      // Expand all - add all existing categories
      const allCategories = new Set(categoryOrder.filter(cat => expenditureByCategory[cat]));
      setExpandedCategories(allCategories);
    }
  };

  // Handle adding new income
  const handleAddIncome = () => {
    console.log('Add new income item');
    // TODO: Implement add income logic
  };

  // Handle adding new expenditure for a category
  const handleAddExpenditure = (category: string) => {
    console.log('Add new expenditure for category:', category);
    // TODO: Implement add expenditure logic
  };

  // Group expenditure by category and calculate totals
  const expenditureByCategory: Record<string, { items: Expenditure[]; total: number; lastUpdated: string }> = {};

  expenditure.forEach((exp) => {
    if (!expenditureByCategory[exp.type]) {
      expenditureByCategory[exp.type] = { items: [], total: 0, lastUpdated: exp.lastUpdated };
    }
    expenditureByCategory[exp.type].items.push(exp);
    // Convert to annual for consistent totaling
    const annualAmount = exp.frequency === 'Monthly' ? exp.amount * 12 : exp.amount;
    expenditureByCategory[exp.type].total += annualAmount;

    // Update lastUpdated to the most recent date
    const currentDate = new Date(exp.lastUpdated.split('/').reverse().join('-'));
    const categoryDate = new Date(expenditureByCategory[exp.type].lastUpdated.split('/').reverse().join('-'));
    if (currentDate > categoryDate) {
      expenditureByCategory[exp.type].lastUpdated = exp.lastUpdated;
    }
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
        <div className="px-3 py-2 bg-gray-50 border-b flex items-center justify-between">
          <h3 className="text-xl font-semibold">Income</h3>
          <button
            onClick={handleAddIncome}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 text-white text-sm font-medium rounded-md hover:bg-primary-700 transition-colors"
          >
            <PlusIcon className="w-4 h-4" />
            Add Income
          </button>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-sm font-bold text-gray-900 uppercase">Type</th>
              <th className="px-3 py-2 text-left text-sm font-bold text-gray-900 uppercase">Source</th>
              <th className="px-3 py-2 text-left text-sm font-bold text-gray-900 uppercase">Owner</th>
              <th className="px-3 py-2 text-left text-sm font-bold text-gray-900 uppercase">Frequency</th>
              <th className="px-3 py-2 text-right text-sm font-bold text-gray-900 uppercase">Annual Amount</th>
              <th className="px-3 py-2 text-left text-sm font-bold text-gray-900 uppercase">Last Updated</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {income.map((inc) => {
              const annualAmount = inc.frequency === 'Monthly' ? inc.amount * 12 : inc.amount;
              return (
                <tr key={inc.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => onIncomeClick(inc)}>
                  <td className="px-3 py-2 whitespace-nowrap text-base text-gray-900">{inc.type}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-base font-medium text-gray-900">{inc.source}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-base text-gray-900">{inc.owner}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-base text-gray-900">{inc.frequency}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-base text-gray-900 text-right font-semibold">
                    {formatMoney(annualAmount)}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-base text-gray-600">{inc.lastUpdated}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-right text-base">
                    <ChevronRightIcon className="w-5 h-5 text-gray-900" />
                  </td>
                </tr>
              );
            })}
            {/* Totals Row */}
            <tr className="bg-primary-50 border-t-2 border-primary-600 font-bold">
              <td className="px-3 py-3 text-base text-gray-900" colSpan={4}>
                Total Income
              </td>
              <td className="px-3 py-3 whitespace-nowrap text-base text-gray-900 text-right">
                {formatMoney(totalIncome)}
              </td>
              <td className="px-3 py-3"></td>
              <td className="px-3 py-3"></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Expenditure Section */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-3 py-2 bg-gray-50 border-b flex items-center justify-between">
          <h3 className="text-xl font-semibold">Expenditure</h3>
          <button
            onClick={toggleAllCategories}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-200 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-300 transition-colors"
          >
            {areAllExpanded ? (
              <>
                <ChevronUpIcon className="w-4 h-4" />
                Collapse All
              </>
            ) : (
              <>
                <ChevronDownIcon className="w-4 h-4" />
                Expand All
              </>
            )}
          </button>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-sm font-bold text-gray-900 uppercase">Category</th>
              <th className="px-3 py-2 text-left text-sm font-bold text-gray-900 uppercase">Items</th>
              <th className="px-3 py-2 text-right text-sm font-bold text-gray-900 uppercase">Total (Annual)</th>
              <th className="px-3 py-2 text-left text-sm font-bold text-gray-900 uppercase">Last Updated</th>
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
                  <tr className="hover:bg-gray-50 transition-colors">
                    <td
                      className="px-3 py-2 whitespace-nowrap text-base font-medium text-gray-900 cursor-pointer"
                      onClick={() => toggleCategory(category)}
                    >
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDownIcon className="w-5 h-5 text-gray-700 inline" />
                        ) : (
                          <ChevronRightIcon className="w-5 h-5 text-gray-700 inline" />
                        )}
                        {category}
                      </div>
                    </td>
                    <td
                      className="px-3 py-2 text-base text-gray-600 cursor-pointer"
                      onClick={() => toggleCategory(category)}
                    >
                      {categoryData.items.length} item{categoryData.items.length !== 1 ? 's' : ''}
                    </td>
                    <td
                      className="px-3 py-2 whitespace-nowrap text-base text-gray-900 text-right font-semibold cursor-pointer"
                      onClick={() => toggleCategory(category)}
                    >
                      {formatMoney(categoryData.total)}
                    </td>
                    <td
                      className="px-3 py-2 whitespace-nowrap text-base text-gray-600 cursor-pointer"
                      onClick={() => toggleCategory(category)}
                    >
                      {categoryData.lastUpdated}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-right text-base">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddExpenditure(category);
                        }}
                        className="flex items-center gap-1 px-2 py-1 bg-primary-600 text-white text-xs font-medium rounded hover:bg-primary-700 transition-colors"
                      >
                        <PlusIcon className="w-3 h-3" />
                        Add
                      </button>
                    </td>
                  </tr>

                  {/* Individual Items (shown when expanded) - Nested Table */}
                  {isExpanded && (
                    <tr>
                      <td colSpan={5} className="px-3 py-2 bg-gray-50">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-white">
                            <tr>
                              <th className="px-2 py-1 text-left text-base font-bold text-gray-900 uppercase tracking-wider">Description</th>
                              <th className="px-2 py-1 text-left text-base font-bold text-gray-900 uppercase tracking-wider">Frequency</th>
                              <th className="px-2 py-1 text-right text-base font-bold text-gray-900 uppercase tracking-wider">Annual Amount</th>
                              <th className="px-2 py-1 text-left text-base font-bold text-gray-900 uppercase tracking-wider">Last Updated</th>
                              <th className="px-2 py-1"></th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {categoryData.items.map((exp) => {
                              const annualAmount = exp.frequency === 'Monthly' ? exp.amount * 12 : exp.amount;
                              return (
                                <tr
                                  key={exp.id}
                                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onExpenditureClick(exp);
                                  }}
                                >
                                  <td className="px-2 py-1.5 text-base font-medium text-gray-900">{exp.description}</td>
                                  <td className="px-2 py-1.5 whitespace-nowrap text-base text-gray-900">{exp.frequency}</td>
                                  <td className="px-2 py-1.5 whitespace-nowrap text-base text-gray-900 text-right font-semibold">
                                    {formatMoney(annualAmount)}
                                  </td>
                                  <td className="px-2 py-1.5 whitespace-nowrap text-base text-gray-600">{exp.lastUpdated}</td>
                                  <td className="px-2 py-1.5 whitespace-nowrap text-right text-base">
                                    <ChevronRightIcon className="w-5 h-5 text-gray-900" />
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
            {/* Totals Row */}
            <tr className="bg-primary-50 border-t-2 border-primary-600 font-bold">
              <td className="px-3 py-3 text-base text-gray-900" colSpan={2}>
                Total Expenditure
              </td>
              <td className="px-3 py-3 whitespace-nowrap text-base text-gray-900 text-right">
                {formatMoney(totalExpenditure)}
              </td>
              <td className="px-3 py-3"></td>
              <td className="px-3 py-3"></td>
            </tr>
          </tbody>
        </table>
      </div>

    </div>
  );
};

export default IncomeExpenditureTab;
