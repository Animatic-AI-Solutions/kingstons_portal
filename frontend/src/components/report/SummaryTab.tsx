/**
 * SummaryTab - Investment summary display component
 * Part of Phase 2 refactoring - extracted from ReportDisplay component
 * 
 * This component handles the summary tab content including:
 * - Portfolio performance cards (Total Returns, Portfolio Value, Profit Made)
 * - Investment summary table with all products
 * - Individual product cards with fund breakdowns
 * - Product organization and formatting
 */

import React from 'react';
import { useReportStateManager } from '../../hooks/report/useReportStateManager';
import { useReportFormatter } from '../../hooks/report/useReportFormatter';
import type { ReportData, ProductPeriodSummary } from '../../types/reportTypes';
import {
  formatCurrencyWithTruncation,
  formatIrrWithPrecision,
  formatWeightedRisk,
} from '../../utils/reportFormatters';
import { normalizeProductType, PRODUCT_TYPE_ORDER } from '../../utils/reportConstants';

interface SummaryTabProps {
  reportData: ReportData;
}

export const SummaryTab: React.FC<SummaryTabProps> = ({ reportData }) => {
  // State management from Phase 1 services
  const {
    state: {
      realTimeTotalIRR,
      portfolioIrrValues,
      customTitles
    }
  } = useReportStateManager();

  // Formatting services from Phase 1
  const {
    formatCurrencyWithVisualSigning
  } = useReportFormatter();

  // Organize products by type in the specified order
  const organizeProductsByType = (products: ProductPeriodSummary[]) => {
    // Group products by normalized type
    const groupedProducts: { [key: string]: ProductPeriodSummary[] } = {};
    
    products.forEach(product => {
      const normalizedType = normalizeProductType(product.product_type);
      if (!groupedProducts[normalizedType]) {
        groupedProducts[normalizedType] = [];
      }
      groupedProducts[normalizedType].push(product);
    });

    // Sort products within each type by provider name, with special ordering for ISAs
    Object.keys(groupedProducts).forEach(type => {
      if (type === 'ISAs') {
        // Special sorting for ISAs: ISA products first, then JISA products, then by provider
        groupedProducts[type].sort((a, b) => {
          const typeA = a.product_type?.toLowerCase().trim() || '';
          const typeB = b.product_type?.toLowerCase().trim() || '';
          
          // Check if products are JISA
          const isJISA_A = typeA === 'jisa';
          const isJISA_B = typeB === 'jisa';
          
          // If one is JISA and the other is not, non-JISA comes first
          if (isJISA_A && !isJISA_B) return 1;
          if (!isJISA_A && isJISA_B) return -1;
          
          // If both are same type (both JISA or both ISA), sort by provider
          const providerA = a.provider_name || '';
          const providerB = b.provider_name || '';
          return providerA.localeCompare(providerB);
        });
      } else {
        // Standard sorting by provider name for other product types
        groupedProducts[type].sort((a, b) => {
          const providerA = a.provider_name || '';
          const providerB = b.provider_name || '';
          return providerA.localeCompare(providerB);
        });
      }
    });

    // Return products in the specified order
    const orderedProducts: ProductPeriodSummary[] = [];
    
    PRODUCT_TYPE_ORDER.forEach(type => {
      if (groupedProducts[type]) {
        orderedProducts.push(...groupedProducts[type]);
      }
    });

    return orderedProducts;
  };

  // Extract plan number from product
  const extractPlanNumber = (product: ProductPeriodSummary): string | null => {
    const productName = product.product_name || '';
    
    // Try to match plan number patterns
    const patterns = [
      /Plan Number[:\s]*([A-Z0-9\-\/]+)/i,
      /Plan[:\s]*([A-Z0-9\-\/]+)/i,
      /Policy[:\s]*([A-Z0-9\-\/]+)/i,
    ];
    
    for (const pattern of patterns) {
      const match = productName.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }
    
    return null;
  };

  // Generate product title
  const generateProductTitle = (product: ProductPeriodSummary, customTitle?: string): string => {
    if (customTitle && customTitle.trim()) {
      return customTitle.trim();
    }

    // Standard format: Provider - Product Type [Plan Number if available]
    let title = `${product.provider_name || 'Unknown Provider'}`;
    
    if (product.product_type) {
      title += ` - ${product.product_type}`;
    }
    
    const planNumber = extractPlanNumber(product);
    if (planNumber) {
      title += ` [${planNumber}]`;
    }
    
    return title;
  };

  return (
    <div className="print:block">
      {/* Portfolio Performance Cards */}
      <div className="mb-6 bg-white shadow-sm rounded-lg border border-gray-200 p-4 product-card print-clean">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Investment Performance</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 portfolio-performance-grid">
          
          {/* Total Current Average Returns */}
          <div className="bg-purple-50 rounded-lg p-3 portfolio-performance-card relative flex flex-col justify-center items-center h-24">
            <div className="text-sm font-medium text-purple-700 mb-2">Total Current Average Returns</div>
            {realTimeTotalIRR !== null && realTimeTotalIRR !== undefined ? (
              <div className="text-2xl font-bold text-black">
                {formatIrrWithPrecision(realTimeTotalIRR)}
              </div>
            ) : (
              <div className="text-2xl font-bold text-black">N/A</div>
            )}
          </div>

          {/* Total Portfolio Value */}
          {reportData.totalValuation !== null && (
            <div className="bg-green-50 rounded-lg p-3 portfolio-performance-card relative flex flex-col justify-center items-center h-24">
              <div className="text-sm font-medium text-green-700 mb-2">Total Portfolio Value</div>
              <div className="text-2xl font-bold text-black">
                {formatCurrencyWithTruncation(reportData.totalValuation)}
              </div>
            </div>
          )}

          {/* Total Profit Made */}
          <div className="bg-blue-50 rounded-lg p-3 portfolio-performance-card relative flex flex-col justify-center items-center h-24">
            <div className="text-sm font-medium text-blue-700 mb-2">Total Profit Made</div>
            {(() => {
              const totalGains = reportData.productSummaries.reduce((sum, product) => 
                sum + (product.current_valuation || 0) + (product.total_withdrawal || 0) + (product.total_product_switch_out || 0) + (product.total_fund_switch_out || 0), 0
              );
              const totalCosts = reportData.productSummaries.reduce((sum, product) => 
                sum + (product.total_investment || 0) + (product.total_regular_investment || 0) + (product.total_tax_uplift || 0) + (product.total_product_switch_in || 0) + (product.total_fund_switch_in || 0), 0
              );
              const totalProfit = totalGains - totalCosts;
              return (
                <div className="text-2xl font-bold text-black">
                  {formatCurrencyWithTruncation(totalProfit)}
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Investment Summary Table */}
      <div className="mb-8 product-card print-clean">
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Investment Summary</h2>
          <div className="overflow-x-auto product-table">
            <table className="w-full table-fixed divide-y divide-gray-300 landscape-table portfolio-summary-table">
              <colgroup>
                <col className="w-[28%]" />
                <col className="w-[7%]" />
                <col className="w-[7%]" />
                <col className="w-[7%]" />
                <col className="w-[7%]" />
                <col className="w-[7%]" />
                <col className="w-[7%]" />
                <col className="w-[8%]" />
                <col className="w-[8%]" />
                <col className="w-[9%]" />
                <col className="w-[5%]" />
              </colgroup>
              <thead className="bg-gray-100">
                <tr>
                  <th scope="col" className="px-1 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    Product
                  </th>
                  <th scope="col" className="px-1 py-2 text-right text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    Investment
                  </th>
                  <th scope="col" className="px-1 py-2 text-right text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    <div className="leading-tight">
                      Tax<br />Uplift
                    </div>
                  </th>
                  <th scope="col" className="px-1 py-2 text-right text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    <div className="leading-tight">
                      Product<br />Switch In
                    </div>
                  </th>
                  <th scope="col" className="px-1 py-2 text-right text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    <div className="leading-tight">
                      Fund<br />Switches
                    </div>
                  </th>
                  <th scope="col" className="px-1 py-2 text-right text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    <div className="leading-tight">
                      Product<br />Switch Out
                    </div>
                  </th>
                  <th scope="col" className="px-1 py-2 text-right text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    Withdrawal
                  </th>
                  <th scope="col" className="px-1 py-2 text-right text-xs font-semibold text-gray-700 uppercase tracking-wide bg-green-100">
                    Valuation
                  </th>
                  <th scope="col" className="px-1 py-2 text-right text-xs font-semibold text-gray-700 uppercase tracking-wide bg-blue-100">
                    <div className="leading-tight">
                      Profit<br />Made
                    </div>
                  </th>
                  <th scope="col" className="px-1 py-2 text-right text-xs font-semibold text-gray-700 uppercase tracking-wide bg-purple-100">
                    <div className="leading-tight">
                      Average Returns<br />p.a.
                    </div>
                  </th>
                  <th scope="col" className="px-1 py-2 text-right text-xs font-semibold text-gray-700 uppercase tracking-wide">
                    Risk
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {organizeProductsByType(reportData.productSummaries).map(product => {
                  const totalGains = (product.current_valuation || 0) + (product.total_withdrawal || 0) + (product.total_product_switch_out || 0) + (product.total_fund_switch_out || 0);
                  const totalCosts = (product.total_investment || 0) + (product.total_regular_investment || 0) + (product.total_tax_uplift || 0) + (product.total_product_switch_in || 0) + (product.total_fund_switch_in || 0);
                  const profit = totalGains - totalCosts;
                  
                  return (
                    <tr key={product.id} className={`hover:bg-blue-50 ${product.status === 'inactive' ? 'opacity-50 bg-gray-50' : ''}`}>
                      <td className={`product-name-cell text-left ${product.status === 'inactive' ? 'text-gray-500' : 'text-gray-800'}`}>
                        <div className="flex items-start gap-1.5">
                          {product.provider_theme_color && (
                            <div 
                              className="w-2.5 h-2.5 rounded-full mt-0.5 flex-shrink-0" 
                              style={{ backgroundColor: product.provider_theme_color }}
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-xs leading-tight">
                              {generateProductTitle(product, customTitles.get(product.id))}
                              {product.status === 'inactive' && (
                                <span className="block text-xs text-red-600 font-medium">(Inactive)</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap text-xs text-right">
                        {formatCurrencyWithTruncation((product.total_investment || 0) + (product.total_regular_investment || 0))}
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap text-xs text-right">
                        {formatCurrencyWithTruncation(product.total_tax_uplift || 0)}
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap text-xs text-right">
                        {formatCurrencyWithTruncation(product.total_product_switch_in || 0)}
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap text-xs text-right">
                        {formatCurrencyWithTruncation((product.total_fund_switch_in || 0) + (product.total_fund_switch_out || 0))}
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap text-xs text-right">
                        {formatCurrencyWithTruncation(product.total_product_switch_out || 0)}
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap text-xs text-right">
                        {formatCurrencyWithTruncation(product.total_withdrawal || 0)}
                      </td>
                      <td className="px-2 py-2 text-xs font-semibold text-primary-700 text-right bg-green-50">
                        {formatCurrencyWithTruncation(product.current_valuation || 0)}
                      </td>
                      <td className="px-2 py-2 text-xs text-right bg-blue-50">
                        <span className={profit >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                          {formatCurrencyWithTruncation(profit)}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-xs text-right bg-purple-50">
                        {(() => {
                          const portfolioIrr = portfolioIrrValues.get(product.id);
                          if (portfolioIrr !== null && portfolioIrr !== undefined) {
                            return (
                              <span className={portfolioIrr >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                                {formatIrrWithPrecision(portfolioIrr)}
                              </span>
                            );
                          }
                          return <span className="text-gray-400">N/A</span>;
                        })()}
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap text-xs text-right">
                        {product.weighted_risk !== undefined && product.weighted_risk !== null ? (
                          <span className="text-xs">
                            {formatWeightedRisk(product.weighted_risk)}
                          </span>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Product Cards */}
      <div className="space-y-6">
        {organizeProductsByType(reportData.productSummaries).map((product, index) => {
          const totalGains = (product.current_valuation || 0) + (product.total_withdrawal || 0) + (product.total_product_switch_out || 0) + (product.total_fund_switch_out || 0);
          const totalCosts = (product.total_investment || 0) + (product.total_regular_investment || 0) + (product.total_tax_uplift || 0) + (product.total_product_switch_in || 0) + (product.total_fund_switch_in || 0);
          const profit = totalGains - totalCosts;
          
          return (
            <div 
              key={index} 
              className={`product-card bg-white shadow-sm rounded-lg border border-gray-200 p-6 w-full print-clean ${product.status === 'inactive' ? 'opacity-60 bg-gray-50' : ''}`}
              style={{
                borderLeft: product.provider_theme_color ? `4px solid ${product.provider_theme_color}` : '4px solid #e5e7eb',
                borderTop: product.provider_theme_color ? `1px solid ${product.provider_theme_color}` : undefined,
                borderRight: product.provider_theme_color ? `1px solid ${product.provider_theme_color}` : undefined,
                borderBottom: product.provider_theme_color ? `1px solid ${product.provider_theme_color}` : undefined,
              }}
            >
              <div className="flex items-center gap-3 mb-4">
                {product.provider_theme_color && (
                  <div 
                    className="w-4 h-4 rounded-full" 
                    style={{ backgroundColor: product.provider_theme_color }}
                  />
                )}
                <h3 className={`text-xl font-semibold ${product.status === 'inactive' ? 'text-gray-600' : 'text-gray-800'}`}>
                  {generateProductTitle(product, customTitles.get(product.id))}
                  {product.status === 'inactive' && (
                    <span className="ml-2 text-sm text-red-600 font-medium">(Inactive)</span>
                  )}
                </h3>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrencyWithTruncation(product.current_valuation || 0)}
                  </div>
                  <div className="text-sm text-gray-600">Current Valuation</div>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrencyWithTruncation(profit)}
                  </div>
                  <div className="text-sm text-gray-600">Profit Made</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {(() => {
                      const productIrr = portfolioIrrValues.get(product.id);
                      if (productIrr !== null && productIrr !== undefined) {
                        return formatIrrWithPrecision(productIrr);
                      }
                      return 'N/A';
                    })()}
                  </div>
                  <div className="text-sm text-gray-600">Current IRR</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {product.weighted_risk !== undefined && product.weighted_risk !== null ? (
                      formatWeightedRisk(product.weighted_risk)
                    ) : (
                      'N/A'
                    )}
                  </div>
                  <div className="text-sm text-gray-600">Risk Level</div>
                </div>
              </div>

              {/* Fund Breakdown Table */}
              <div className="overflow-x-auto product-table">
                <table className="w-full table-auto divide-y divide-gray-300 landscape-table">
                  <thead className="bg-gray-100">
                    <tr>
                      <th scope="col" className="px-2 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">
                        Fund Name
                      </th>
                      <th scope="col" className="px-2 py-2 text-right text-xs font-semibold text-gray-700 uppercase tracking-wide">
                        Investment
                      </th>
                      <th scope="col" className="px-2 py-2 text-right text-xs font-semibold text-gray-700 uppercase tracking-wide">
                        Withdrawal
                      </th>
                      <th scope="col" className="px-2 py-2 text-right text-xs font-semibold text-gray-700 uppercase tracking-wide bg-green-100">
                        Valuation
                      </th>
                      <th scope="col" className="px-2 py-2 text-right text-xs font-semibold text-gray-700 uppercase tracking-wide bg-blue-100">
                        Profit
                      </th>
                      <th scope="col" className="px-2 py-2 text-right text-xs font-semibold text-gray-700 uppercase tracking-wide bg-purple-100">
                        IRR
                      </th>
                      <th scope="col" className="px-2 py-2 text-right text-xs font-semibold text-gray-700 uppercase tracking-wide">
                        Risk
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {product.funds && product.funds.length > 0 ? (
                      (() => {
                        // Separate active and inactive funds
                        const activeFunds = product.funds.filter(fund => fund.status === 'active' || fund.status === null);
                        const inactiveFunds = product.funds.filter(fund => fund.status === 'inactive');
                        
                        const fundRows = [];
                        
                        // Add active funds
                        activeFunds.forEach((fund, fundIndex) => {
                          const fundGains = (fund.current_valuation || 0) + (fund.total_withdrawal || 0) + (fund.total_fund_switch_out || 0);
                          const fundCosts = (fund.total_investment || 0) + (fund.total_regular_investment || 0) + (fund.total_tax_uplift || 0) + (fund.total_fund_switch_in || 0);
                          const fundProfit = fundGains - fundCosts;
                          
                          fundRows.push(
                            <tr key={`active-${fundIndex}`} className="hover:bg-blue-50">
                              <td className="px-2 py-2 text-xs text-gray-800 text-left font-medium">
                                {fund.fund_name}
                                {fund.isin_number && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    ISIN: {fund.isin_number}
                                  </div>
                                )}
                              </td>
                              <td className="px-2 py-2 text-xs text-right">
                                {formatCurrencyWithTruncation((fund.total_investment || 0) + (fund.total_regular_investment || 0) + (fund.total_tax_uplift || 0) + (fund.total_fund_switch_in || 0))}
                              </td>
                              <td className="px-2 py-2 text-xs text-right">
                                {formatCurrencyWithTruncation((fund.total_withdrawal || 0) + (fund.total_fund_switch_out || 0))}
                              </td>
                              <td className="px-2 py-2 text-xs font-semibold text-primary-700 text-right bg-green-50">
                                {formatCurrencyWithTruncation(fund.current_valuation || 0)}
                              </td>
                              <td className="px-2 py-2 text-xs text-right bg-blue-50">
                                <span className={fundProfit >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                                  {formatCurrencyWithTruncation(fundProfit)}
                                </span>
                              </td>
                              <td className="px-2 py-2 text-xs text-right bg-purple-50">
                                {fund.irr !== null && fund.irr !== undefined ? (
                                  <span className={fund.irr >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                                    {formatIrrWithPrecision(fund.irr)}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">N/A</span>
                                )}
                              </td>
                              <td className="px-2 py-2 text-xs text-right">
                                {fund.risk_factor !== undefined && fund.risk_factor !== null ? (
                                  <span className="text-xs">
                                    {formatWeightedRisk(fund.risk_factor)}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">N/A</span>
                                )}
                              </td>
                            </tr>
                          );
                        });
                        
                        // Add inactive funds if any
                        if (inactiveFunds.length > 0) {
                          // Create aggregated Previous Funds entry
                          const aggregatedInvestment = inactiveFunds.reduce((sum, fund) => sum + (fund.total_investment || 0) + (fund.total_regular_investment || 0) + (fund.total_tax_uplift || 0) + (fund.total_fund_switch_in || 0), 0);
                          const aggregatedWithdrawal = inactiveFunds.reduce((sum, fund) => sum + (fund.total_withdrawal || 0) + (fund.total_fund_switch_out || 0), 0);
                          const aggregatedValuation = inactiveFunds.reduce((sum, fund) => sum + (fund.current_valuation || 0), 0);
                          const aggregatedProfit = aggregatedValuation + aggregatedWithdrawal - aggregatedInvestment;
                          
                          fundRows.push(
                            <tr key="previous-funds" className="hover:bg-blue-50 opacity-60">
                              <td className="px-2 py-2 text-xs text-gray-600 text-left font-medium">
                                Previous Funds ({inactiveFunds.length})
                              </td>
                              <td className="px-2 py-2 text-xs text-right text-gray-600">
                                {formatCurrencyWithTruncation(aggregatedInvestment)}
                              </td>
                              <td className="px-2 py-2 text-xs text-right text-gray-600">
                                {formatCurrencyWithTruncation(aggregatedWithdrawal)}
                              </td>
                              <td className="px-2 py-2 text-xs text-right text-gray-600 bg-green-50">
                                {formatCurrencyWithTruncation(aggregatedValuation)}
                              </td>
                              <td className="px-2 py-2 text-xs text-right text-gray-600 bg-blue-50">
                                <span className={aggregatedProfit >= 0 ? 'text-green-600' : 'text-red-600'}>
                                  {formatCurrencyWithTruncation(aggregatedProfit)}
                                </span>
                              </td>
                              <td className="px-2 py-2 text-xs text-right text-gray-600 bg-purple-50">
                                N/A
                              </td>
                              <td className="px-2 py-2 text-xs text-right text-gray-600">
                                N/A
                              </td>
                            </tr>
                          );
                        }
                        
                        return fundRows;
                      })()
                    ) : (
                      <tr>
                        <td colSpan={7} className="px-2 py-2 text-center text-gray-500">
                          No funds available for this product
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SummaryTab; 