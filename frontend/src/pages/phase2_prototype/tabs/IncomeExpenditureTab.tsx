import React, { useState } from 'react';
import { ChevronRightIcon, ChevronDownIcon, PencilSquareIcon, XMarkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
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

  // Track bulk edit modal
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
  const [bulkIncomeAmounts, setBulkIncomeAmounts] = useState<Record<string, number>>({});
  const [bulkExpenditureAmounts, setBulkExpenditureAmounts] = useState<Record<string, number>>({});
  const [searchTerm, setSearchTerm] = useState('');

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

  // Open bulk edit modal and initialize amounts
  const openBulkEdit = () => {
    const incomeAmounts: Record<string, number> = {};
    income.forEach(inc => {
      incomeAmounts[inc.id] = inc.amount;
    });

    const expenditureAmounts: Record<string, number> = {};
    expenditure.forEach(exp => {
      expenditureAmounts[exp.id] = exp.amount;
    });

    setBulkIncomeAmounts(incomeAmounts);
    setBulkExpenditureAmounts(expenditureAmounts);
    setSearchTerm('');
    setIsBulkEditOpen(true);
  };

  // Filter income based on search term
  const filteredIncome = income.filter(inc => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      inc.source.toLowerCase().includes(search) ||
      inc.type.toLowerCase().includes(search) ||
      inc.owner.toLowerCase().includes(search)
    );
  });

  // Filter expenditure based on search term
  const filteredExpenditure = expenditure.filter(exp => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      exp.description.toLowerCase().includes(search) ||
      exp.type.toLowerCase().includes(search)
    );
  });

  // Update amount for income item
  const updateIncomeAmount = (id: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setBulkIncomeAmounts(prev => ({ ...prev, [id]: numValue }));
  };

  // Update amount for expenditure item
  const updateExpenditureAmount = (id: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setBulkExpenditureAmounts(prev => ({ ...prev, [id]: numValue }));
  };

  // Save bulk edit changes
  const saveBulkEdit = () => {
    console.log('Saving bulk edit:', { bulkIncomeAmounts, bulkExpenditureAmounts });
    // TODO: Implement save logic
    setIsBulkEditOpen(false);
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
      {/* Bulk Edit Button */}
      <div className="flex justify-end">
        <button
          onClick={openBulkEdit}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-base font-medium rounded-md hover:bg-primary-700 transition-colors"
        >
          <PencilSquareIcon className="w-5 h-5" />
          Bulk Edit Amounts
        </button>
      </div>

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

      {/* Bulk Edit Modal */}
      {isBulkEditOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Bulk Edit Income & Expenditure Amounts</h2>
                <button
                  onClick={() => setIsBulkEditOpen(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              {/* Search Input */}
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search income or expenditure items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Income Section */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Income {searchTerm && <span className="text-sm font-normal text-gray-600">({filteredIncome.length} of {income.length})</span>}
                </h3>
                {filteredIncome.length > 0 ? (
                  <div className="space-y-3">
                    {filteredIncome.map((inc) => (
                      <div key={inc.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{inc.source}</div>
                          <div className="text-sm text-gray-600">{inc.type} • {inc.owner}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">{inc.frequency}:</span>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">£</span>
                            <input
                              type="number"
                              value={bulkIncomeAmounts[inc.id] || 0}
                              onChange={(e) => updateIncomeAmount(inc.id, e.target.value)}
                              className="w-32 pl-7 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                              step="0.01"
                              min="0"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-500 text-sm">
                    No income items match your search
                  </div>
                )}
              </div>

              {/* Expenditure Section */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  Expenditure {searchTerm && <span className="text-sm font-normal text-gray-600">({filteredExpenditure.length} of {expenditure.length})</span>}
                </h3>
                {filteredExpenditure.length > 0 ? (
                  <div className="space-y-3">
                    {filteredExpenditure.map((exp) => (
                      <div key={exp.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{exp.description}</div>
                          <div className="text-sm text-gray-600">{exp.type}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">{exp.frequency}:</span>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">£</span>
                            <input
                              type="number"
                              value={bulkExpenditureAmounts[exp.id] || 0}
                              onChange={(e) => updateExpenditureAmount(exp.id, e.target.value)}
                              className="w-32 pl-7 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                              step="0.01"
                              min="0"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-500 text-sm">
                    No expenditure items match your search
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-3">
              <button
                onClick={() => setIsBulkEditOpen(false)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveBulkEdit}
                className="px-4 py-2 text-white bg-primary-600 rounded-md hover:bg-primary-700 transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IncomeExpenditureTab;
