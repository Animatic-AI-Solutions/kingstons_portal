/**
 * SummaryTab - Investment summary display component
 * Part of Phase 2 refactoring - extracted from ReportDisplay component
 * 
 * This component handles the summary tab content including:
 * - Portfolio performance cards (Total Returns, Portfolio Value, Profit Made)
 * - Investment summary table with all products
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
    },
    actions
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

  // Format currency with visual signing wrapper
  const formatCurrencyWithVisualSigningWrapper = (
    amount: number | null | undefined, 
    activityType: string
  ) => {
    const value = formatCurrencyWithVisualSigning(amount, activityType);
    return { value, className: '' }; // Visual signing styling handled in the formatter
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
            {realTimeTotalIRR !== null ? (
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
                sum + product.current_valuation + product.total_withdrawal + product.total_product_switch_out + product.total_fund_switch_out, 0
              );
              const totalCosts = reportData.productSummaries.reduce((sum, product) => 
                sum + product.total_investment + product.total_regular_investment + product.total_tax_uplift + product.total_product_switch_in + product.total_fund_switch_in, 0
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

      {/* Edit Titles Button */}
      <div className="mb-6 print-hide">
        <div className="flex justify-center">
          <button
            onClick={() => actions.setShowTitleModal(true)}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit Product Titles
            {customTitles.size > 0 && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {customTitles.size} custom
              </span>
            )}
          </button>
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
                {organizeProductsByType(reportData.productSummaries)
                  .filter(() => true) // Show all products in report data
                  .map(product => {
                    const totalGains = product.current_valuation + product.total_withdrawal + product.total_product_switch_out + product.total_fund_switch_out;
                    const totalCosts = product.total_investment + product.total_regular_investment + product.total_tax_uplift + product.total_product_switch_in + product.total_fund_switch_in;
                    const profit = totalGains - totalCosts;
                    
                    return (
                      <tr key={product.id} className={`hover:bg-blue-50 ${product.status === 'inactive' ? 'opacity-50 bg-gray-50' : ''}`}>
                        {/* Product Name */}
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

                        {/* Investment */}
                        <td className="px-2 py-2 whitespace-nowrap text-xs text-right">
                          {(() => {
                            const formatted = formatCurrencyWithVisualSigningWrapper(product.total_investment + product.total_regular_investment, 'investment');
                            return <span className={formatted.className}>{formatted.value}</span>;
                          })()}
                        </td>

                        {/* Tax Uplift */}
                        <td className="px-2 py-2 whitespace-nowrap text-xs text-right">
                          {(() => {
                            const formatted = formatCurrencyWithVisualSigningWrapper(product.total_tax_uplift, 'tax_uplift');
                            return <span className={formatted.className}>{formatted.value}</span>;
                          })()}
                        </td>

                        {/* Product Switch In */}
                        <td className="px-2 py-2 whitespace-nowrap text-xs text-right">
                          {(() => {
                            const formatted = formatCurrencyWithVisualSigningWrapper(product.total_product_switch_in, 'product_switch_in');
                            return <span className={formatted.className}>{formatted.value}</span>;
                          })()}
                        </td>

                        {/* Fund Switches */}
                        <td className="px-2 py-2 whitespace-nowrap text-xs text-right">
                          {(() => {
                            const formatted = formatCurrencyWithVisualSigningWrapper(product.total_fund_switch_in + product.total_fund_switch_out, 'fund_switch');
                            return <span className={formatted.className}>{formatted.value}</span>;
                          })()}
                        </td>

                        {/* Product Switch Out */}
                        <td className="px-2 py-2 whitespace-nowrap text-xs text-right">
                          {(() => {
                            const formatted = formatCurrencyWithVisualSigningWrapper(product.total_product_switch_out, 'product_switch_out');
                            return <span className={formatted.className}>{formatted.value}</span>;
                          })()}
                        </td>

                        {/* Withdrawal */}
                        <td className="px-2 py-2 whitespace-nowrap text-xs text-right">
                          {(() => {
                            const formatted = formatCurrencyWithVisualSigningWrapper(product.total_withdrawal, 'withdrawal');
                            return <span className={formatted.className}>{formatted.value}</span>;
                          })()}
                        </td>

                        {/* Valuation */}
                        <td className="px-2 py-2 text-xs font-semibold text-primary-700 text-right bg-green-50">
                          {formatCurrencyWithTruncation(product.current_valuation)}
                        </td>

                        {/* Profit Made */}
                        <td className="px-2 py-2 text-xs text-right bg-blue-50">
                          <span className={profit >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                            {formatCurrencyWithTruncation(profit)}
                          </span>
                        </td>

                        {/* Average Returns */}
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

                        {/* Risk */}
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
                
                {/* Portfolio Totals Row */}
                <tr className="bg-gray-100 font-semibold border-t-2 border-gray-400">
                  <td className="px-2 py-2 text-xs text-left text-gray-800">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold">PORTFOLIO TOTALS</span>
                    </div>
                  </td>
                  <td className="px-2 py-2 text-xs font-bold text-right text-black">
                    {(() => {
                      const totalAmount = reportData.productSummaries.reduce((sum, product) => 
                        sum + product.total_investment + product.total_regular_investment, 0
                      );
                      const formatted = formatCurrencyWithVisualSigningWrapper(totalAmount, 'investment');
                      return <span className="text-black font-bold">{formatted.value}</span>;
                    })()}
                  </td>
                  <td className="px-2 py-2 text-xs font-bold text-right text-black">
                    {(() => {
                      const totalAmount = reportData.productSummaries.reduce((sum, product) => 
                        sum + product.total_tax_uplift, 0
                      );
                      const formatted = formatCurrencyWithVisualSigningWrapper(totalAmount, 'tax_uplift');
                      return <span className="text-black font-bold">{formatted.value}</span>;
                    })()}
                  </td>
                  <td className="px-2 py-2 text-xs font-bold text-right text-black">
                    {(() => {
                      const totalAmount = reportData.productSummaries.reduce((sum, product) => 
                        sum + product.total_product_switch_in, 0
                      );
                      const formatted = formatCurrencyWithVisualSigningWrapper(totalAmount, 'product_switch_in');
                      return <span className="text-black font-bold">{formatted.value}</span>;
                    })()}
                  </td>
                  <td className="px-2 py-2 text-xs font-bold text-right text-black">
                    {(() => {
                      const totalAmount = reportData.productSummaries.reduce((sum, product) => 
                        sum + product.total_fund_switch_in + product.total_fund_switch_out, 0
                      );
                      const formatted = formatCurrencyWithVisualSigningWrapper(totalAmount, 'fund_switch');
                      return <span className="text-black font-bold">{formatted.value}</span>;
                    })()}
                  </td>
                  <td className="px-2 py-2 text-xs font-bold text-right text-black">
                    {(() => {
                      const totalAmount = reportData.productSummaries.reduce((sum, product) => 
                        sum + product.total_product_switch_out, 0
                      );
                      const formatted = formatCurrencyWithVisualSigningWrapper(totalAmount, 'product_switch_out');
                      return <span className="text-black font-bold">{formatted.value}</span>;
                    })()}
                  </td>
                  <td className="px-2 py-2 text-xs font-bold text-right text-black">
                    {(() => {
                      const totalAmount = reportData.productSummaries.reduce((sum, product) => 
                        sum + product.total_withdrawal, 0
                      );
                      const formatted = formatCurrencyWithVisualSigningWrapper(totalAmount, 'withdrawal');
                      return <span className="text-black font-bold">{formatted.value}</span>;
                    })()}
                  </td>
                  <td className="px-2 py-2 text-xs font-bold text-right text-black bg-green-50">
                    {formatCurrencyWithTruncation(reportData.totalValuation)}
                  </td>
                  <td className="px-2 py-2 text-xs font-bold text-right text-black bg-blue-50">
                    {(() => {
                      const totalGains = reportData.productSummaries.reduce((sum, product) => 
                        sum + product.current_valuation + product.total_withdrawal + product.total_product_switch_out + product.total_fund_switch_out, 0
                      );
                      const totalCosts = reportData.productSummaries.reduce((sum, product) => 
                        sum + product.total_investment + product.total_regular_investment + product.total_tax_uplift + product.total_product_switch_in + product.total_fund_switch_in, 0
                      );
                      const totalProfit = totalGains - totalCosts;
                      return (
                        <span className={totalProfit >= 0 ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                          {formatCurrencyWithTruncation(totalProfit)}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-2 py-2 text-xs font-bold text-right text-black bg-purple-50">
                    {realTimeTotalIRR !== null ? (
                      <span className={realTimeTotalIRR >= 0 ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                        {formatIrrWithPrecision(realTimeTotalIRR)}
                      </span>
                    ) : (
                      <span className="text-gray-400 font-bold">N/A</span>
                    )}
                  </td>
                  <td className="px-2 py-2 text-xs font-bold text-right text-black">
                    {(() => {
                      // Calculate weighted average risk across all products
                      const totalValue = reportData.productSummaries.reduce((sum, product) => sum + product.current_valuation, 0);
                      if (totalValue === 0) return <span className="text-gray-400 font-bold">N/A</span>;
                      
                      const weightedRisk = reportData.productSummaries.reduce((sum, product) => {
                        const weight = product.current_valuation / totalValue;
                        const risk = product.weighted_risk ?? 0;
                        return sum + (risk * weight);
                      }, 0);
                      
                      return <span className="text-black font-bold">{formatWeightedRisk(weightedRisk)}</span>;
                    })()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Edit Titles Button - MISSING FUNCTIONALITY */}
      <div className="mb-6 print-hide">
        <div className="flex justify-center">
          <button
            onClick={() => actions.setShowTitleModal(true)}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit Product Titles
            {customTitles.size > 0 && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {customTitles.size} custom
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SummaryTab; 