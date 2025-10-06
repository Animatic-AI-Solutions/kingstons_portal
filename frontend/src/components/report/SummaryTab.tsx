/**
 * SummaryTab - Investment summary display component
 * Part of Phase 2 refactoring - extracted from ReportDisplay component
 * 
 * This component handles the summary tab content including:
 * - Portfolio performance cards (Total Returns, Portfolio Value, Profit Made)
 * - Investment summary table with all products
 * - Individual product cards with fund breakdowns
 * - Product organization and formatting
 * - Visual signing and zero hiding functionality
 */

import React, { useState, useEffect } from 'react';
import { useReportStateManager } from '../../hooks/report/useReportStateManager';
import { useReportFormatter } from '../../hooks/report/useReportFormatter';
import type { ReportData, ProductPeriodSummary } from '../../types/reportTypes';
import {
  formatCurrencyWithTruncation,
  formatIrrWithPrecision,
  formatWeightedRisk,
  formatWeightedRiskConsistent,
} from '../../utils/reportFormatters';
import { normalizeProductType, PRODUCT_TYPE_ORDER } from '../../utils/reportConstants';
import { generateEffectiveProductTitle, sortProductsByOwnerOrder } from '../../utils/productTitleUtils';

interface SummaryTabProps {
  reportData: ReportData;
  className?: string;
}

const SummaryTab: React.FC<SummaryTabProps> = ({ reportData, className = '' }) => {
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [productExpansion, setProductExpansion] = useState<{ [key: string]: boolean }>({});

  // State management from Phase 1 services
  const {
    state: {
      realTimeTotalIRR,
      portfolioIrrValues,
      customTitles,
      hideZeros,
      visualSigning,
      loading,
      showInactiveProductDetails
    },
    utils: {
      toggleInactiveProductDetails
    }
  } = useReportStateManager();

  // Formatting services from Phase 1 - synchronized with state
  const {
    formatCurrencyWithZeroToggle,
    formatCurrencyWithVisualSigning,
    formatWithdrawalAmount,
    updateOptions
  } = useReportFormatter();

  // Update formatter options when state changes
  React.useEffect(() => {
    updateOptions({
      hideZeros,
      visualSigning,
      formatWithdrawalsAsNegative: false
    });
  }, [hideZeros, visualSigning, updateOptions]);

  // Organize products by type in the specified order, with inactive/lapsed products at the bottom
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

    // Sort products within each type by custom product owner order, with special ordering for ISAs
    Object.keys(groupedProducts).forEach(type => {
      if (type === 'ISAs') {
        // Special sorting for ISAs: ISA products first, then JISA products, then by custom owner order
        groupedProducts[type].sort((a, b) => {
          const typeA = a.product_type?.toLowerCase().trim() || '';
          const typeB = b.product_type?.toLowerCase().trim() || '';
          
          // Check if products are JISA
          const isJISA_A = typeA === 'jisa';
          const isJISA_B = typeB === 'jisa';
          
          // If one is JISA and the other is not, non-JISA comes first
          if (isJISA_A && !isJISA_B) return 1;
          if (!isJISA_A && isJISA_B) return -1;
          
          // If both are same type (both JISA or both ISA), sort by custom product owner order
          return 0; // Will be handled by the custom owner order sort below
        });
        
        // Apply custom owner order after ISA/JISA sorting
        console.log(`🔍 [SUMMARY TAB DEBUG] Sorting ${type} (ISA/JISA) products by owner order:`, {
          productsCount: groupedProducts[type].length,
          productOwnerOrder: reportData.productOwnerOrder,
          productOwnerOrderLength: reportData.productOwnerOrder?.length || 0,
          productNames: groupedProducts[type].map(p => p.product_name),
          productOwnerNames: groupedProducts[type].map(p => p.product_owner_name)
        });
        groupedProducts[type] = sortProductsByOwnerOrder(groupedProducts[type], reportData.productOwnerOrder || []);
        console.log(`🔍 [SUMMARY TAB DEBUG] After sorting ${type} (ISA/JISA) products:`, {
          sortedProductNames: groupedProducts[type].map(p => p.product_name),
          sortedProductOwnerNames: groupedProducts[type].map(p => p.product_owner_name)
        });
      } else {
        // Standard sorting by custom product owner order for other product types
        console.log(`🔍 [SUMMARY TAB DEBUG] Sorting ${type} products by owner order:`, {
          productsCount: groupedProducts[type].length,
          productOwnerOrder: reportData.productOwnerOrder,
          productOwnerOrderLength: reportData.productOwnerOrder?.length || 0,
          productNames: groupedProducts[type].map(p => p.product_name),
          productOwnerNames: groupedProducts[type].map(p => p.product_owner_name)
        });
        groupedProducts[type] = sortProductsByOwnerOrder(groupedProducts[type], reportData.productOwnerOrder || []);
        console.log(`🔍 [SUMMARY TAB DEBUG] After sorting ${type} products:`, {
          sortedProductNames: groupedProducts[type].map(p => p.product_name),
          sortedProductOwnerNames: groupedProducts[type].map(p => p.product_owner_name)
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

    // Apply status-based sorting: active products first, then inactive/lapsed at the bottom
    // while maintaining original relative order within each group
    const activeProducts = orderedProducts.filter(product => 
      product.status !== 'inactive' && product.status !== 'lapsed'
    );
    const inactiveProducts = orderedProducts.filter(product => 
      product.status === 'inactive' || product.status === 'lapsed'
    );
    
    // Return active products first, then inactive/lapsed products
    return [...activeProducts, ...inactiveProducts];
  };

  // Local function to format fund IRRs to whole numbers (0 decimal places)
  const formatFundIrr = (irr: number | null | undefined): string => {
    if (irr === null || irr === undefined) return '-';
    // Round to 0 decimal places for fund IRRs (as per original logic)
    return `${Math.round(irr)}%`;
  };

  // Format currency with visual signing wrapper
  const formatCurrencyWithVisualSigningWrapper = (
    amount: number | null | undefined, 
    activityType: string
  ) => {
    if (visualSigning) {
      // Get the full result including className when visual signing is enabled
      const result = formatCurrencyWithVisualSigning(amount, activityType);
      return {
        value: result,
        className: amount !== null && amount !== undefined && amount >= 0 ? 'text-green-600' : 'text-red-600'
      };
    } else {
      // Use standard formatting when visual signing is disabled
      return {
        value: formatCurrencyWithZeroToggle(amount),
        className: ''
      };
    }
  };

  return (
    <div className="print:block report-section" id="summary-tab-panel" role="tabpanel" aria-labelledby="summary-tab">
      {/* Portfolio Performance Cards */}
      <div className="mb-0 print:mb-0 bg-white px-2 py-2 print:px-1 print:pt-1 print:pb-0 product-card print-clean investment-performance-container">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:gap-1 portfolio-performance-grid">

          {/* Total Portfolio Value */}
          {reportData.totalValuation !== null && (
            <div className="bg-green-50 rounded-lg p-3 print:p-0.5 print:rounded-sm portfolio-performance-card relative flex flex-col print:flex-row print:items-center justify-center items-center h-16 print:h-4">
              <div className="text-sm print:text-[9px] print:mr-1 font-medium text-green-700 mb-2 print:mb-0">Total Portfolio Value:</div>
              <div className="text-2xl print:text-[10px] font-bold text-black">
                {formatCurrencyWithTruncation(reportData.totalValuation)}
              </div>
            </div>
          )}

          {/* Total Profit Made */}
          <div className="bg-blue-50 rounded-lg p-3 print:p-0.5 print:rounded-sm portfolio-performance-card relative flex flex-col print:flex-row print:items-center justify-center items-center h-16 print:h-4">
            <div className="text-sm print:text-[9px] print:mr-1 font-medium text-blue-700 mb-2 print:mb-0">Total Profit Made:</div>
            {(() => {
              const totalGains = reportData.productSummaries.reduce((sum, product) =>
                sum + (product.current_valuation || 0) + (product.total_withdrawal || 0) + (product.total_product_switch_out || 0) + (product.total_fund_switch_out || 0), 0
              );
              const totalCosts = reportData.productSummaries.reduce((sum, product) =>
                sum + (product.total_investment || 0) + (product.total_regular_investment || 0) + (product.total_tax_uplift || 0) + (product.total_product_switch_in || 0) + (product.total_fund_switch_in || 0), 0
              );
              const totalProfit = totalGains - totalCosts;
              return (
                <div className="text-2xl print:text-[10px] font-bold text-black">
                  {formatCurrencyWithTruncation(totalProfit)}
                </div>
              );
            })()}
          </div>

          {/* Total Current Average Returns */}
          <div className="bg-purple-50 rounded-lg p-3 print:p-0.5 print:rounded-sm portfolio-performance-card relative flex flex-col print:flex-row print:items-center justify-center items-center h-16 print:h-4">
            <div className="text-sm print:text-[9px] print:mr-1 font-medium text-purple-700 mb-2 print:mb-0">Total Current Average Returns:</div>
            {loading.totalIRR ? (
              <div className="flex items-center gap-2 print:gap-0.5">
                <div className="animate-spin rounded-full h-3 w-3 print:h-1.5 print:w-1.5 border-b-2 print:border-b-1 border-purple-600"></div>
                <div className="text-xs print:text-[8px] text-purple-600">Calculating...</div>
              </div>
            ) : realTimeTotalIRR !== null && realTimeTotalIRR !== undefined && !isNaN(realTimeTotalIRR) ? (
              <div className="text-2xl print:text-[10px] font-bold text-black">
                {formatIrrWithPrecision(realTimeTotalIRR)}
              </div>
            ) : (
              <div className="text-2xl print:text-[10px] font-bold text-black">N/A</div>
            )}
          </div>
        </div>
      </div>

      {/* Investment Summary Table - Detailed overview */}
      <div className="mt-0 mb-2 product-card print-clean investment-summary-spacing">
        <div className="bg-white px-2 py-2">
          <h2 className="text-lg font-semibold text-gray-900 mb-2 print:mb-1">Investment Summary</h2>
          <div className="overflow-x-auto product-table">
            <table className="w-full table-fixed divide-y divide-gray-300 landscape-table portfolio-summary-table">
              <colgroup>
                <col className="w-[28%]" />
                <col className="w-[8%]" />
                <col className="w-[8%]" />
                <col className="w-[7%]" />
                <col className="w-[7%]" />
                <col className="w-[10%]" />
                <col className="w-[8%]" />
                <col className="w-[8%]" />
                <col className="w-[8%]" />
                <col className="w-[4%]" />
              </colgroup>
              <thead className="bg-gray-100">
                <tr>
                  <th scope="col" className="px-2 py-2 text-left text-[10px] font-semibold text-gray-700 uppercase tracking-wide">
                    Product
                  </th>
                  <th scope="col" className="px-2 py-2 text-right text-[10px] font-semibold text-gray-700 uppercase tracking-wide">
                    Investment
                  </th>
                  <th scope="col" className="px-2 py-2 text-right text-[10px] font-semibold text-gray-700 uppercase tracking-wide">
                    <div className="leading-tight">
                      Tax<br />Uplift
                    </div>
                  </th>
                  <th scope="col" className="px-2 py-2 text-right text-[10px] font-semibold text-gray-700 uppercase tracking-wide">
                    <div className="leading-tight">
                      Product<br />Switch In
                    </div>
                  </th>
                  <th scope="col" className="px-2 py-2 text-right text-[10px] font-semibold text-gray-700 uppercase tracking-wide">
                    <div className="leading-tight">
                      Product<br />Switch Out
                    </div>
                  </th>
                  <th scope="col" className="px-2 py-2 text-right text-[10px] font-semibold text-gray-700 uppercase tracking-wide">
                    Withdrawal
                  </th>
                  <th scope="col" className="px-2 py-2 text-right text-[10px] font-semibold text-gray-700 uppercase tracking-wide bg-green-100">
                    Valuation
                  </th>
                  <th scope="col" className="px-2 py-2 text-right text-[10px] font-semibold text-gray-700 uppercase tracking-wide bg-blue-100">
                    <div className="leading-tight">
                      Profit<br />Made
                    </div>
                  </th>
                  <th scope="col" className="px-2 py-2 text-right text-[10px] font-semibold text-gray-700 uppercase tracking-wide bg-purple-100">
                    <div className="leading-tight">
                      Average<br />Return P.A.
                    </div>
                  </th>
                  <th scope="col" className="px-2 py-2 text-right text-[10px] font-semibold text-gray-700 uppercase tracking-wide">
                    Risk
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {organizeProductsByType(reportData.productSummaries)
                  .map(product => {
                    const totalGains = (product.current_valuation || 0) + (product.total_withdrawal || 0) + (product.total_product_switch_out || 0) + (product.total_fund_switch_out || 0);
                    const totalCosts = (product.total_investment || 0) + (product.total_regular_investment || 0) + (product.total_tax_uplift || 0) + (product.total_product_switch_in || 0) + (product.total_fund_switch_in || 0);
                    const profit = totalGains - totalCosts;
                    
                    // Determine if this inactive product should be greyed out
                    const isInactive = product.status === 'inactive';
                    
                    return (
                      <tr key={product.id} className={`hover:bg-blue-50 ${isInactive ? 'opacity-50 bg-gray-50' : ''}`}>
                        <td className={`product-name-cell text-left px-2 py-2 ${isInactive ? 'text-gray-500' : 'text-gray-800'}`}>
                          <div className="flex items-start gap-1.5">
                            {product.provider_theme_color && (
                              <div 
                                className="w-2.5 h-2.5 rounded-full mt-0.5 flex-shrink-0" 
                                style={{ backgroundColor: product.provider_theme_color }}
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="text-xs leading-tight">
                                {generateEffectiveProductTitle(product, customTitles, { 
                                  omitOwner: reportData.productOwnerOrder && reportData.productOwnerOrder.length <= 1 
                                })}
                                {product.status === 'inactive' && (
                                  <span className="ml-2 text-xs text-red-600 font-medium">(Lapsed)</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap text-base text-right">
                          {(() => {
                            const totalInvestment = product.total_investment || 0;
                            const totalRegularInvestment = product.total_regular_investment || 0;
                            const investmentSum = totalInvestment + totalRegularInvestment;
                            
                            
                            const formatted = formatCurrencyWithVisualSigningWrapper(investmentSum, 'investment');
                            return <span className={formatted.className}>{formatted.value}</span>;
                          })()}
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap text-base text-right">
                          {(() => {
                            const formatted = formatCurrencyWithVisualSigningWrapper(product.total_tax_uplift || 0, 'tax_uplift');
                            return <span className={formatted.className}>{formatted.value}</span>;
                          })()}
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap text-base text-right">
                          {(() => {
                            const formatted = formatCurrencyWithVisualSigningWrapper(product.total_product_switch_in || 0, 'product_switch_in');
                            return <span className={formatted.className}>{formatted.value}</span>;
                          })()}
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap text-base text-right">
                          {(() => {
                            const formatted = formatCurrencyWithVisualSigningWrapper(product.total_product_switch_out || 0, 'product_switch_out');
                            return <span className={formatted.className}>{formatted.value}</span>;
                          })()}
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap text-base text-right">
                          {(() => {
                            const formatted = formatCurrencyWithVisualSigningWrapper(product.total_withdrawal || 0, 'withdrawal');
                            return <span className={formatted.className}>{formatted.value}</span>;
                          })()}
                        </td>
                        <td className="px-2 py-2 text-base font-semibold text-primary-700 text-right bg-green-50">
                          {formatCurrencyWithTruncation(product.current_valuation || 0)}
                        </td>
                        <td className="px-2 py-2 text-base text-right bg-blue-50">
                          <span className={profit >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                            {formatCurrencyWithTruncation(profit)}
                          </span>
                        </td>
                        <td className="px-2 py-2 text-base text-right bg-purple-50">
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
                        <td className="px-2 py-2 whitespace-nowrap text-base text-right">
                          {product.weighted_risk !== undefined && product.weighted_risk !== null ? (
                            formatWeightedRiskConsistent(product.weighted_risk)
                          ) : (
                            <span className="text-gray-400">N/A</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                
                {/* Investment Totals Row - Matches Product Card Style */}
                <tr className="bg-gray-50 border-t-2 border-gray-300">
                  <td className="px-1 py-2 text-base font-bold text-black text-left">
                    Investment Totals
                  </td>
                  <td className="px-2 py-2 text-base font-bold text-right text-black">
                    {(() => {
                      const totalAmount = reportData.productSummaries.reduce((sum, product) =>
                        sum + (product.total_investment || 0) + (product.total_regular_investment || 0), 0
                      );
                      return formatCurrencyWithTruncation(totalAmount);
                    })()}
                  </td>
                  <td className="px-2 py-2 text-base font-bold text-right text-black">
                    {(() => {
                      const totalAmount = reportData.productSummaries.reduce((sum, product) =>
                        sum + (product.total_tax_uplift || 0), 0
                      );
                      return formatCurrencyWithTruncation(totalAmount);
                    })()}
                  </td>
                  <td className="px-2 py-2 text-base font-bold text-right text-black">
                    {(() => {
                      const totalAmount = reportData.productSummaries.reduce((sum, product) =>
                        sum + (product.total_product_switch_in || 0), 0
                      );
                      return formatCurrencyWithTruncation(totalAmount);
                    })()}
                  </td>
                  <td className="px-2 py-2 text-base font-bold text-right text-black">
                    {(() => {
                      const totalAmount = reportData.productSummaries.reduce((sum, product) =>
                        sum + (product.total_product_switch_out || 0), 0
                      );
                      return formatCurrencyWithTruncation(totalAmount);
                    })()}
                  </td>
                  <td className="px-2 py-2 text-base font-bold text-right text-black">
                    {(() => {
                      const totalAmount = reportData.productSummaries.reduce((sum, product) =>
                        sum + (product.total_withdrawal || 0), 0
                      );
                      return formatCurrencyWithTruncation(totalAmount);
                    })()}
                  </td>
                  <td className="px-2 py-2 text-base font-bold text-right bg-green-100 text-black">
                    {formatCurrencyWithTruncation(
                      reportData.productSummaries.reduce((sum, product) =>
                        sum + (product.current_valuation || 0), 0
                      )
                    )}
                  </td>
                  <td className="px-2 py-2 text-base font-bold text-right bg-blue-100 text-black">
                    {(() => {
                      const totalGains = reportData.productSummaries.reduce((sum, product) =>
                        sum + (product.current_valuation || 0) + (product.total_withdrawal || 0) + (product.total_product_switch_out || 0) + (product.total_fund_switch_out || 0), 0
                      );
                      const totalCosts = reportData.productSummaries.reduce((sum, product) =>
                        sum + (product.total_investment || 0) + (product.total_regular_investment || 0) + (product.total_tax_uplift || 0) + (product.total_product_switch_in || 0) + (product.total_fund_switch_in || 0), 0
                      );
                      const totalProfit = totalGains - totalCosts;
                      return formatCurrencyWithTruncation(totalProfit);
                    })()}
                  </td>
                  <td className="px-2 py-2 text-base font-bold text-right bg-purple-100 text-black">
                    {realTimeTotalIRR !== null && realTimeTotalIRR !== undefined && !isNaN(realTimeTotalIRR) ? (
                      formatIrrWithPrecision(realTimeTotalIRR)
                    ) : (
                      'N/A'
                    )}
                  </td>
                  <td className="px-2 py-2 text-base font-bold text-right text-black">
                    {(() => {
                      // Calculate weighted risk across all products
                      // IMPORTANT: Include both active funds' risk and inactive funds' risk from "Previous Funds" virtual entry
                      let totalRiskWeightedValue = 0;
                      let totalValue = 0;

                      console.log('🔍 Investment Total Risk Calculation Debug:');

                      reportData.productSummaries.forEach((product, index) => {
                        console.log(`Product ${index}:`, {
                          name: product.product_name,
                          weighted_risk: product.weighted_risk,
                          current_valuation: product.current_valuation,
                          funds_count: product.funds?.length
                        });

                        // Add active funds' weighted risk contribution
                        if (product.weighted_risk !== undefined && product.weighted_risk !== null) {
                          const productValue = product.current_valuation || 0;
                          const contribution = product.weighted_risk * productValue;
                          console.log(`  - Active funds contribution: ${product.weighted_risk} × ${productValue} = ${contribution}`);
                          totalRiskWeightedValue += contribution;
                          totalValue += productValue;
                        }

                        // Add inactive funds' weighted risk contribution from "Previous Funds" virtual entry
                        if (product.funds) {
                          const previousFundsEntry = product.funds.find(fund => fund.isVirtual && fund.fund_name === 'Previous Funds');
                          console.log(`  - Previous Funds entry found:`, previousFundsEntry ? {
                            risk_factor: previousFundsEntry.risk_factor,
                            current_valuation: previousFundsEntry.current_valuation
                          } : 'None');

                          if (previousFundsEntry && previousFundsEntry.risk_factor !== undefined && previousFundsEntry.risk_factor !== null) {
                            const previousFundsValue = previousFundsEntry.current_valuation || 0;
                            const contribution = previousFundsEntry.risk_factor * previousFundsValue;
                            console.log(`  - Inactive funds contribution: ${previousFundsEntry.risk_factor} × ${previousFundsValue} = ${contribution}`);
                            totalRiskWeightedValue += contribution;
                            totalValue += previousFundsValue;
                          }
                        }
                      });

                      console.log('Investment Total Risk Result:', {
                        totalRiskWeightedValue,
                        totalValue,
                        finalRisk: totalValue > 0 ? totalRiskWeightedValue / totalValue : 'N/A'
                      });

                      if (totalValue > 0) {
                        return formatWeightedRiskConsistent(totalRiskWeightedValue / totalValue);
                      } else {
                        return 'N/A';
                      }
                    })()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Print-only Warning Text - appears only in print view */}
      <div className="hidden print:block mt-0.5 mb-1 px-2">
        <div className="disclaimer-text">
          <p>
            The original investment, percentage rate of return and profit measures result from the products displayed in the report and not
            previous investments unless a provider switch has been completed.
            The method of calculating percentage returns is based on the timing of your investments, withdrawals and switches to the nearest
            full month and may result in under or over estimates of these returns over shorter time periods.
            Please note that past performance is not any guarantee of future performance and your capital is at risk in the products displayed.
            The Kingstons risk scores used are a guide and risk takes many different forms.
            In general, the product returns are calculated including all ongoing charges for advice, investment charges and provider or platform
            fees. They do not include initial advice fees and ongoing advice fees where these ongoing fees are paid directly to Kingstons.
            Variations may occur in cash and individual fund percentage returns due to the way product and platform providers take fees.
          </p>
        </div>
      </div>

      {/* Individual Product Cards */}
      <div className="mb-8 print:mb-4 print:break-before-page">
        {organizeProductsByType(reportData.productSummaries)
          .filter(product => {
            // Filter out inactive products when checkbox is unchecked
            if (product.status === 'inactive') {
              // Only show inactive products if:
              // 1. showInactiveProducts is true globally, OR
              // 2. this specific product is checked in showInactiveProductDetails
              const shouldShow = reportData.showInactiveProducts || showInactiveProductDetails.has(product.id);
              
              console.log(`🔍 [PRODUCT CARD FILTER DEBUG] Product ${product.id} (${product.product_name}):`, {
                status: product.status,
                showInactiveProducts: reportData.showInactiveProducts,
                hasInShowInactiveProductDetails: showInactiveProductDetails.has(product.id),
                showInactiveProductDetailsSet: Array.from(showInactiveProductDetails),
                shouldShow,
                reportDataShowInactiveProductDetails: reportData.showInactiveProductDetails
              });
              
              return shouldShow;
            }
            // Always show active products
            return true;
          })
          .map((product, index) => {
            const totalGains = (product.current_valuation || 0) + (product.total_withdrawal || 0) + (product.total_product_switch_out || 0) + (product.total_fund_switch_out || 0);
            const totalCosts = (product.total_investment || 0) + (product.total_regular_investment || 0) + (product.total_tax_uplift || 0) + (product.total_product_switch_in || 0) + (product.total_fund_switch_in || 0);
            const profit = totalGains - totalCosts;

            // Determine if this inactive product should be greyed out
            const isInactive = product.status === 'inactive';

            return (
              <div
                key={`${product.id}-${index}`}
                className={`mb-4 bg-white shadow-sm rounded-lg border border-gray-200 w-full product-card print-clean summary-product-card ${isInactive ? 'opacity-60 bg-gray-50' : ''}`}
                style={{
                  borderLeft: product.provider_theme_color ? `4px solid ${product.provider_theme_color}` : '4px solid #e5e7eb',
                  borderTop: product.provider_theme_color ? `1px solid ${product.provider_theme_color}` : undefined,
                  borderRight: product.provider_theme_color ? `1px solid ${product.provider_theme_color}` : undefined,
                  borderBottom: product.provider_theme_color ? `1px solid ${product.provider_theme_color}` : undefined,
                }}
              >
                <div className="px-2 pt-1 pb-0">
                  <div className="flex items-center gap-3 mb-0">
                    {product.provider_theme_color && (
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: product.provider_theme_color }}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className={`text-xl font-semibold flex-1 min-w-0 ${isInactive ? 'text-gray-600' : 'text-gray-800'}`}>
                          {generateEffectiveProductTitle(product, customTitles, { 
                            omitOwner: reportData.productOwnerOrder && reportData.productOwnerOrder.length <= 1 
                          })}
                        </h3>
                        {product.status === 'inactive' && (
                          <span className="text-sm text-red-600 font-medium whitespace-nowrap">(Lapsed)</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Fund Breakdown Table */}
                <div className="px-2 pt-0 pb-2">
                  <div className="overflow-x-auto product-table">
                  <table className="w-full table-fixed divide-y divide-gray-300 landscape-table product-fund-table">
                    <colgroup>
                      <col className="w-[22%]" />
                      <col className="w-[7%]" />
                      <col className="w-[7%]" />
                      <col className="w-[7%]" />
                      <col className="w-[7%]" />
                      <col className="w-[6%]" />
                      <col className="w-[9%]" />
                      <col className="w-[8%]" />
                      <col className="w-[8%]" />
                      <col className="w-[8%]" />
                      <col className="w-[5%]" />
                    </colgroup>
                    <thead className="bg-gray-100">
                      <tr>
                        <th scope="col" className="px-2 py-2 text-left text-[10px] font-semibold text-gray-700 uppercase tracking-wide">
                          Fund Name
                        </th>
                        <th scope="col" className="px-2 py-2 text-right text-[10px] font-semibold text-gray-700 uppercase tracking-wide">
                          Investment
                        </th>
                        <th scope="col" className="px-2 py-2 text-right text-[10px] font-semibold text-gray-700 uppercase tracking-wide">
                          <div className="leading-tight">
                            Tax<br />Uplift
                          </div>
                        </th>
                        <th scope="col" className="px-2 py-2 text-right text-[10px] font-semibold text-gray-700 uppercase tracking-wide">
                          <div className="leading-tight">
                            Product<br />Switch In
                          </div>
                        </th>
                        <th scope="col" className="px-2 py-2 text-right text-[10px] font-semibold text-gray-700 uppercase tracking-wide">
                          <div className="leading-tight">
                            Fund<br />Switches
                          </div>
                        </th>
                        <th scope="col" className="px-2 py-2 text-right text-[10px] font-semibold text-gray-700 uppercase tracking-wide">
                          <div className="leading-tight">
                            Product<br />Switch Out
                          </div>
                        </th>
                        <th scope="col" className="px-2 py-2 text-right text-[10px] font-semibold text-gray-700 uppercase tracking-wide">
                          Withdrawal
                        </th>
                        <th scope="col" className="px-2 py-2 text-right text-[10px] font-semibold text-gray-700 uppercase tracking-wide bg-green-100">
                          Valuation
                        </th>
                        <th scope="col" className="px-2 py-2 text-right text-[10px] font-semibold text-gray-700 uppercase tracking-wide bg-blue-100">
                          Profit Made
                        </th>
                        <th scope="col" className="px-2 py-2 text-right text-[10px] font-semibold text-gray-700 uppercase tracking-wide bg-purple-100">
                          Average Returns p.a.
                        </th>
                        <th scope="col" className="px-2 py-2 text-right text-[10px] font-semibold text-gray-700 uppercase tracking-wide">
                          Risk
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {product.funds && product.funds.length > 0 ? (
                        <>
                          {product.funds
                            .sort((a, b) => {
                              // First: Check if either is "Previous Funds" (virtual) - these go last
                              if (a.isVirtual && !b.isVirtual) return 1;
                              if (!a.isVirtual && b.isVirtual) return -1;
                              if (a.isVirtual && b.isVirtual) return 0;
                              
                              // Second: Check if either is "Cash" - cash goes after regular funds but before Previous Funds
                              const aIsCash = a.fund_name.toLowerCase().includes('cash');
                              const bIsCash = b.fund_name.toLowerCase().includes('cash');
                              if (aIsCash && !bIsCash) return 1;
                              if (!aIsCash && bIsCash) return -1;
                              
                              // Third: Regular funds in alphabetical order
                              return a.fund_name.localeCompare(b.fund_name);
                            })
                            .map(fund => {
                              const fundGains = (fund.current_valuation || 0) + (fund.total_withdrawal || 0) + (fund.total_product_switch_out || 0) + (fund.total_fund_switch_out || 0);
                              const fundCosts = (fund.total_investment || 0) + (fund.total_regular_investment || 0) + (fund.total_tax_uplift || 0) + (fund.total_product_switch_in || 0) + (fund.total_fund_switch_in || 0);
                              const fundProfit = fundGains - fundCosts;
                              
                              return (
                                <React.Fragment key={fund.id}>
                                  <tr 
                                    className={`hover:bg-blue-50 ${fund.isVirtual ? 'bg-gray-100 font-medium' : ''}`}
                                  >
                                    <td className="px-2 py-2 text-xs font-medium text-gray-800 text-left">
                                      {fund.fund_name}
                                      {fund.isVirtual && fund.inactiveFundCount && fund.fund_name !== 'Previous Funds' && (
                                        <span className="ml-2 inline-flex items-center px-1 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-800">
                                          {fund.inactiveFundCount} {fund.inactiveFundCount === 1 ? 'fund' : 'funds'}
                                        </span>
                                      )}
                                    </td>
                                    <td className="px-2 py-2 text-xs text-right">
                                      {(() => {
                                        const formatted = formatCurrencyWithVisualSigningWrapper((fund.total_investment || 0) + (fund.total_regular_investment || 0), 'investment');
                                        return <span className={formatted.className}>{formatted.value}</span>;
                                      })()}
                                    </td>
                                    <td className="px-2 py-2 text-xs text-right">
                                      {(() => {
                                        const formatted = formatCurrencyWithVisualSigningWrapper(fund.total_tax_uplift || 0, 'tax_uplift');
                                        return <span className={formatted.className}>{formatted.value}</span>;
                                      })()}
                                    </td>
                                    <td className="px-2 py-2 text-xs text-right">
                                      {(() => {
                                        const formatted = formatCurrencyWithVisualSigningWrapper(fund.total_product_switch_in || 0, 'product_switch_in');
                                        return <span className={formatted.className}>{formatted.value}</span>;
                                      })()}
                                    </td>
                                    <td className="px-2 py-2 text-xs text-right">
                                      {(() => {
                                        const netFundSwitch = (fund.total_fund_switch_in || 0) - (fund.total_fund_switch_out || 0);
                                        const formatted = formatCurrencyWithVisualSigningWrapper(netFundSwitch, 'fund_switch');
                                        return <span className={formatted.className}>{formatted.value}</span>;
                                      })()}
                                    </td>
                                    <td className="px-2 py-2 text-xs text-right">
                                      {(() => {
                                        const formatted = formatCurrencyWithVisualSigningWrapper(fund.total_product_switch_out || 0, 'product_switch_out');
                                        return <span className={formatted.className}>{formatted.value}</span>;
                                      })()}
                                    </td>
                                    <td className="px-2 py-2 text-xs text-right">
                                      {(() => {
                                        const formatted = formatCurrencyWithVisualSigningWrapper(fund.total_withdrawal || 0, 'withdrawal');
                                        return <span className={formatted.className}>{formatted.value}</span>;
                                      })()}
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
                                          {formatFundIrr(fund.irr)}
                                        </span>
                                      ) : (
                                        <span className="text-black font-bold">N/A</span>
                                      )}
                                    </td>
                                    <td className="px-2 py-2 text-xs text-right">
                                      {fund.risk_factor !== undefined && fund.risk_factor !== null ? (
                                        formatWeightedRisk(fund.risk_factor)
                                      ) : (
                                        'N/A'
                                      )}
                                    </td>
                                  </tr>
                                </React.Fragment>
                              );
                            })}
                          
                          {/* Product Total Row */}
                          <tr className="bg-gray-50 border-t-2 border-gray-300">
                            <td className="px-2 py-2 text-xs font-bold text-black text-left">
                              Total
                            </td>
                            <td className="px-2 py-2 text-xs font-bold text-right text-black">
                              {formatCurrencyWithTruncation((product.total_investment || 0) + (product.total_regular_investment || 0))}
                            </td>
                            <td className="px-2 py-2 text-xs font-bold text-right text-black">
                              {formatCurrencyWithTruncation(product.total_tax_uplift || 0)}
                            </td>
                            <td className="px-2 py-2 text-xs font-bold text-right text-black">
                              {formatCurrencyWithTruncation(product.total_product_switch_in || 0)}
                            </td>
                            <td className="px-2 py-2 text-xs font-bold text-right text-black">
                              {formatCurrencyWithTruncation((product.total_fund_switch_in || 0) - (product.total_fund_switch_out || 0))}
                            </td>
                            <td className="px-2 py-2 text-xs font-bold text-right text-black">
                              {formatCurrencyWithTruncation(product.total_product_switch_out || 0)}
                            </td>
                            <td className="px-2 py-2 text-xs font-bold text-right text-black">
                              {formatCurrencyWithTruncation(product.total_withdrawal || 0)}
                            </td>
                            <td className="px-2 py-2 text-xs font-bold text-right bg-green-100 text-black">
                              {formatCurrencyWithTruncation(product.current_valuation || 0)}
                            </td>
                            <td className="px-2 py-2 text-xs font-bold text-right bg-blue-100 text-black">
                              {formatCurrencyWithTruncation(profit)}
                            </td>
                            <td className="px-2 py-2 text-xs font-bold text-right bg-purple-100 text-black">
                              {(() => {
                                const productIrr = portfolioIrrValues.get(product.id);
                                if (productIrr !== null && productIrr !== undefined) {
                                  return formatIrrWithPrecision(productIrr);
                                }
                                return 'N/A';
                              })()}
                            </td>
                            <td className="px-2 py-2 text-xs font-bold text-right text-black">
                              {product.weighted_risk !== undefined && product.weighted_risk !== null ? (
                                formatWeightedRiskConsistent(product.weighted_risk)
                              ) : (
                                'N/A'
                              )}
                            </td>
                          </tr>
                        </>
                      ) : (
                        <tr>
                          <td colSpan={11} className="px-2 py-4 text-center text-gray-500">
                            No fund data available for this product
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                  </div>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
};

export default SummaryTab; 