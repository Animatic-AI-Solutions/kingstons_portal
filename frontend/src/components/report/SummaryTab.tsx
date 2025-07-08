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
    // First, check if plan_number field exists
    if (product.plan_number) {
      console.log(`🔍 Plan number from field for product ${product.id}: ${product.plan_number}`);
      return product.plan_number;
    }
    
    // Fallback: try to extract from product_name if it contains plan-like patterns
    if (product.product_name) {
      const patterns = [
        /Plan Number[:\s]*([A-Z0-9\-\/]+)/i,
        /Plan[:\s]*([A-Z0-9\-\/]+)/i,
        /Policy[:\s]*([A-Z0-9\-\/]+)/i,
      ];
      
      for (const pattern of patterns) {
        const match = product.product_name.match(pattern);
        if (match) {
          console.log(`🔍 Plan number from regex for product ${product.id}: ${match[1].trim()}`);
          return match[1].trim();
        }
      }
    }
    
    console.log(`🔍 No plan number found for product ${product.id}. Fields: plan_number=${product.plan_number}, product_name=${product.product_name}`);
    return null;
  };

  // Generate product title
  const generateProductTitle = (product: ProductPeriodSummary, customTitle?: string): string => {
    if (customTitle && customTitle.trim()) {
      return customTitle.trim();
    }

    // Standard format: Provider - Product Type - Product Owner Name [Plan Number]
    let title = `${product.provider_name || 'Unknown Provider'}`;
    
    if (product.product_type) {
      // Simplify bond types to just "Bond"
      const simplifiedType = product.product_type.toLowerCase().includes('bond') ? 'Bond' : product.product_type;
      title += ` - ${simplifiedType}`;
    }
    
    if (product.product_owner_name) {
      // Check if the product_owner_name contains multiple names (comma-separated or other delimiters)
      const ownerNames = product.product_owner_name.split(/[,&]/).map((name: string) => name.trim());
      if (ownerNames.length > 1) {
        // For multiple owners, show "Joint"
        title += ` - Joint`;
      } else {
        // For single owner, extract just the nickname (first word)
        const nameParts = product.product_owner_name.trim().split(' ');
        const nickname = nameParts[0]; // Take first part (nickname)
        title += ` - ${nickname}`;
      }
    }
    
    // Add plan number if available
    const planNumber = extractPlanNumber(product);
    if (planNumber) {
      title += ` [${planNumber}]`;
    }
    
    return title;
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
      <div className="mb-2 bg-white px-2 py-2 product-card print-clean investment-performance-container">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Investment Performance</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 portfolio-performance-grid">
          
          {/* Total Current Average Returns */}
          <div className="bg-purple-50 rounded-lg p-3 portfolio-performance-card relative flex flex-col justify-center items-center h-24">
            <div className="text-sm font-medium text-purple-700 mb-2">Total Current Average Returns</div>
            {loading.totalIRR ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-purple-600"></div>
                <div className="text-xs text-purple-600">Calculating...</div>
              </div>
            ) : realTimeTotalIRR !== null && realTimeTotalIRR !== undefined ? (
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

      {/* Investment Summary Table - Detailed overview */}
      <div className="mb-4 product-card print-clean">
        <div className="bg-white px-2 py-2">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Investment Summary</h2>
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
                  <th scope="col" className="px-1 py-2 text-left text-[10px] font-semibold text-gray-700 uppercase tracking-wide">
                    Product
                  </th>
                  <th scope="col" className="px-1 py-2 text-right text-[10px] font-semibold text-gray-700 uppercase tracking-wide">
                    Investment
                  </th>
                  <th scope="col" className="px-1 py-2 text-right text-[10px] font-semibold text-gray-700 uppercase tracking-wide">
                    <div className="leading-tight">
                      Tax<br />Uplift
                    </div>
                  </th>
                  <th scope="col" className="px-1 py-2 text-right text-[10px] font-semibold text-gray-700 uppercase tracking-wide">
                    <div className="leading-tight">
                      Product<br />Switch In
                    </div>
                  </th>
                  <th scope="col" className="px-1 py-2 text-right text-[10px] font-semibold text-gray-700 uppercase tracking-wide">
                    <div className="leading-tight">
                      Fund<br />Switches
                    </div>
                  </th>
                  <th scope="col" className="px-1 py-2 text-right text-[10px] font-semibold text-gray-700 uppercase tracking-wide">
                    <div className="leading-tight">
                      Product<br />Switch Out
                    </div>
                  </th>
                  <th scope="col" className="px-1 py-2 text-right text-[10px] font-semibold text-gray-700 uppercase tracking-wide">
                    Withdrawal
                  </th>
                  <th scope="col" className="px-1 py-2 text-right text-[10px] font-semibold text-gray-700 uppercase tracking-wide bg-green-100">
                    Valuation
                  </th>
                  <th scope="col" className="px-1 py-2 text-right text-[10px] font-semibold text-gray-700 uppercase tracking-wide bg-blue-100">
                    <div className="leading-tight">
                      Profit<br />Made
                    </div>
                  </th>
                  <th scope="col" className="px-1 py-2 text-right text-[10px] font-semibold text-gray-700 uppercase tracking-wide bg-purple-100">
                    <div className="leading-tight">
                      Average Returns<br />p.a.
                    </div>
                  </th>
                  <th scope="col" className="px-1 py-2 text-right text-[10px] font-semibold text-gray-700 uppercase tracking-wide">
                    Current Risk
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {organizeProductsByType(reportData.productSummaries)
                  .filter(product => {
                    // Show all products that are in the report data
                    return true;
                  })
                  .map(product => {
                    const totalGains = (product.current_valuation || 0) + (product.total_withdrawal || 0) + (product.total_product_switch_out || 0) + (product.total_fund_switch_out || 0);
                    const totalCosts = (product.total_investment || 0) + (product.total_regular_investment || 0) + (product.total_tax_uplift || 0) + (product.total_product_switch_in || 0) + (product.total_fund_switch_in || 0);
                    const profit = totalGains - totalCosts;
                    
                    return (
                      <tr key={product.id} className={`hover:bg-blue-50 ${product.status === 'inactive' ? 'opacity-50 bg-gray-50' : ''}`}>
                        <td className={`product-name-cell text-left px-1 py-2 ${product.status === 'inactive' ? 'text-gray-500' : 'text-gray-800'}`}>
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
                        <td className="px-2 py-2 whitespace-nowrap text-sm text-right">
                          {(() => {
                            const formatted = formatCurrencyWithVisualSigningWrapper((product.total_investment || 0) + (product.total_regular_investment || 0), 'investment');
                            return <span className={formatted.className}>{formatted.value}</span>;
                          })()}
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap text-sm text-right">
                          {(() => {
                            const formatted = formatCurrencyWithVisualSigningWrapper(product.total_tax_uplift || 0, 'tax_uplift');
                            return <span className={formatted.className}>{formatted.value}</span>;
                          })()}
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap text-sm text-right">
                          {(() => {
                            const formatted = formatCurrencyWithVisualSigningWrapper(product.total_product_switch_in || 0, 'product_switch_in');
                            return <span className={formatted.className}>{formatted.value}</span>;
                          })()}
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap text-sm text-right">
                          {(() => {
                            const netSwitches = (product.total_fund_switch_in || 0) + (product.total_fund_switch_out || 0);
                            const formatted = formatCurrencyWithVisualSigningWrapper(netSwitches, 'fund_switch');
                            return <span className={formatted.className}>{formatted.value}</span>;
                          })()}
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap text-sm text-right">
                          {(() => {
                            const formatted = formatCurrencyWithVisualSigningWrapper(product.total_product_switch_out || 0, 'product_switch_out');
                            return <span className={formatted.className}>{formatted.value}</span>;
                          })()}
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap text-sm text-right">
                          {(() => {
                            const formatted = formatCurrencyWithVisualSigningWrapper(product.total_withdrawal || 0, 'withdrawal');
                            return <span className={formatted.className}>{formatted.value}</span>;
                          })()}
                        </td>
                        <td className="px-2 py-2 text-sm font-semibold text-primary-700 text-right bg-green-50">
                          {formatCurrencyWithTruncation(product.current_valuation || 0)}
                        </td>
                        <td className="px-2 py-2 text-sm text-right bg-blue-50">
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
                            formatWeightedRisk(product.weighted_risk)
                          ) : (
                            <span className="text-gray-400">N/A</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                
                {/* Investment Totals Row - Matches Product Card Style */}
                <tr className="bg-gray-50 border-t-2 border-gray-300">
                  <td className="px-1 py-2 text-xs font-bold text-black text-left">
                    Investment Totals
                  </td>
                  <td className="px-2 py-2 text-sm font-bold text-right text-black">
                    {(() => {
                      const totalAmount = reportData.productSummaries.reduce((sum, product) => 
                        sum + (product.total_investment || 0) + (product.total_regular_investment || 0), 0
                      );
                      return formatCurrencyWithTruncation(totalAmount);
                    })()}
                  </td>
                  <td className="px-2 py-2 text-sm font-bold text-right text-black">
                    {(() => {
                      const totalAmount = reportData.productSummaries.reduce((sum, product) => 
                        sum + (product.total_tax_uplift || 0), 0
                      );
                      return formatCurrencyWithTruncation(totalAmount);
                    })()}
                  </td>
                  <td className="px-2 py-2 text-sm font-bold text-right text-black">
                    {(() => {
                      const totalAmount = reportData.productSummaries.reduce((sum, product) => 
                        sum + (product.total_product_switch_in || 0), 0
                      );
                      return formatCurrencyWithTruncation(totalAmount);
                    })()}
                  </td>
                  <td className="px-2 py-2 text-sm font-bold text-right text-black">
                    {(() => {
                      const totalAmount = reportData.productSummaries.reduce((sum, product) => 
                        sum + (product.total_fund_switch_in || 0) + (product.total_fund_switch_out || 0), 0
                      );
                      return formatCurrencyWithTruncation(totalAmount);
                    })()}
                  </td>
                  <td className="px-2 py-2 text-sm font-bold text-right text-black">
                    {(() => {
                      const totalAmount = reportData.productSummaries.reduce((sum, product) => 
                        sum + (product.total_product_switch_out || 0), 0
                      );
                      return formatCurrencyWithTruncation(totalAmount);
                    })()}
                  </td>
                  <td className="px-2 py-2 text-sm font-bold text-right text-black">
                    {(() => {
                      const totalAmount = reportData.productSummaries.reduce((sum, product) => 
                        sum + (product.total_withdrawal || 0), 0
                      );
                      return formatCurrencyWithTruncation(totalAmount);
                    })()}
                  </td>
                  <td className="px-2 py-2 text-sm font-bold text-right bg-green-100 text-black">
                    {formatCurrencyWithTruncation(
                      reportData.productSummaries.reduce((sum, product) => 
                        sum + (product.current_valuation || 0), 0
                      )
                    )}
                  </td>
                  <td className="px-2 py-2 text-sm font-bold text-right bg-blue-100 text-black">
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
                  <td className="px-2 py-2 text-xs font-bold text-right bg-purple-100 text-black">
                    {realTimeTotalIRR !== null && realTimeTotalIRR !== undefined ? (
                      formatIrrWithPrecision(realTimeTotalIRR)
                    ) : (
                      'N/A'
                    )}
                  </td>
                  <td className="px-2 py-2 text-xs font-bold text-right text-black">
                    {(() => {
                      // Calculate weighted risk across all products
                      let weightedRisk = 0;
                      let totalValue = 0;
                      
                      reportData.productSummaries.forEach(product => {
                        if (product.weighted_risk !== undefined && product.weighted_risk !== null) {
                          const productValue = product.current_valuation || 0;
                          weightedRisk += product.weighted_risk * productValue;
                          totalValue += productValue;
                        }
                      });
                      
                      if (totalValue > 0) {
                        return formatWeightedRisk(weightedRisk / totalValue);
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

      {/* Individual Product Cards */}
      <div className="mb-8 print:break-before-page">
        {organizeProductsByType(reportData.productSummaries)
          .filter(product => {
            // For inactive products, only show detailed cards if the checkbox was checked
            if (product.status === 'inactive') {
              return reportData.showInactiveProducts || showInactiveProductDetails.has(product.id);
            }
            return true;
          })
          .map((product, index) => {
            const totalGains = (product.current_valuation || 0) + (product.total_withdrawal || 0) + (product.total_product_switch_out || 0) + (product.total_fund_switch_out || 0);
            const totalCosts = (product.total_investment || 0) + (product.total_regular_investment || 0) + (product.total_tax_uplift || 0) + (product.total_product_switch_in || 0) + (product.total_fund_switch_in || 0);
            const profit = totalGains - totalCosts;

            return (
              <div
                key={`${product.id}-${index}`}
                className={`mb-8 bg-white shadow-sm rounded-lg border border-gray-200 p-6 w-full product-card print-clean ${product.status === 'inactive' ? 'opacity-60 bg-gray-50' : ''}`}
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
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className={`text-xl font-semibold flex-1 min-w-0 ${product.status === 'inactive' ? 'text-gray-600' : 'text-gray-800'}`}>
                        {generateProductTitle(product, customTitles.get(product.id))}
                      </h3>
                      {product.status === 'inactive' && (
                        <span className="text-sm text-red-600 font-medium whitespace-nowrap">(Inactive)</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Fund Breakdown Table */}
                <div className="overflow-x-auto product-table">
                  <table className="w-full table-fixed divide-y divide-gray-300 landscape-table product-fund-table">
                    <colgroup>
                      <col className="w-[22%]" />
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
                                        const formatted = formatCurrencyWithVisualSigningWrapper((fund.total_fund_switch_in || 0) + (fund.total_fund_switch_out || 0), 'fund_switch');
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
                              {formatCurrencyWithTruncation((product.total_fund_switch_in || 0) + (product.total_fund_switch_out || 0))}
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
                                formatWeightedRisk(product.weighted_risk)
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
            );
          })}
      </div>
    </div>
  );
};

export default SummaryTab; 