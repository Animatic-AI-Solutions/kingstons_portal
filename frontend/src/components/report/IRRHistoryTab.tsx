/**
 * IRRHistoryTab - Historical IRR display component
 * Part of Phase 2 refactoring - extracted from ReportDisplay component
 * 
 * This component handles the IRR History tab content including:
 * - Historical IRR data display for each product
 * - Fund-level historical IRR breakdown
 * - Previous/inactive funds aggregation
 * - Date-based IRR comparison tables
 */

import React from 'react';
import { useReportStateManager } from '../../hooks/report/useReportStateManager';
import { useReportFormatter } from '../../hooks/report/useReportFormatter';
import type { ReportData, ProductPeriodSummary } from '../../types/reportTypes';
import {
  formatIrrWithPrecision,
  formatWeightedRisk,
} from '../../utils/reportFormatters';
import { normalizeProductType, PRODUCT_TYPE_ORDER } from '../../utils/reportConstants';

interface IRRHistoryTabProps {
  reportData: ReportData;
}

export const IRRHistoryTab: React.FC<IRRHistoryTabProps> = ({ reportData }) => {
  // State management from Phase 1 services
  const {
    state: {
      irrHistoryData,
      customTitles,
      loading
    }
  } = useReportStateManager();

  const loadingIrrHistory = loading.irrHistory;

  // Formatting services from Phase 1
  const { formatFundIrr } = useReportFormatter();

  // Organize products by type with grouped structure for headers
  const organizeProductsByTypeWithHeaders = (products: ProductPeriodSummary[]) => {
    const productTypeOrder = [
      'ISAs',
      'GIAs', 
      'Onshore Bonds',
      'Offshore Bonds',
      'Pensions',
      'Other'
    ];

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

    // Return organized groups
    return productTypeOrder.map(type => ({
      type,
      products: groupedProducts[type] || []
    })).filter(group => group.products.length > 0);
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
    
    return title;
  };

  // Loading state
  if (loadingIrrHistory) {
    return (
      <div className="flex items-center justify-center py-12 print-hide">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading IRR history...</p>
        </div>
      </div>
    );
  }

  // No data state
  if (!irrHistoryData || irrHistoryData.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No IRR history data available.</p>
      </div>
    );
  }

  return (
    <div className="irr-history-section print:block print:mt-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">IRR History</h2>
      </div>
      
      <div className="space-y-8">
        {(() => {
          // Organize products and create mapping for IRR history data
          const organizedProductGroups = organizeProductsByTypeWithHeaders(reportData.productSummaries);
          const organizedProducts = organizedProductGroups.flatMap(group => group.products);
          
          return organizedProducts.map((product, index) => {
            const originalIndex = reportData.productSummaries.findIndex(p => p.id === product.id);
            const productHistory = irrHistoryData[originalIndex];
            
            if (!productHistory) {
              return null;
            }

            // Get all unique dates from both portfolio and fund IRR history
            const allDates = new Set<string>();
            
            // Add portfolio IRR dates
            if (productHistory.portfolio_historical_irr) {
              productHistory.portfolio_historical_irr.forEach((record: any) => {
                allDates.add(record.irr_date);
              });
            }
            
            // Add fund IRR dates
            if (productHistory.funds_historical_irr) {
              productHistory.funds_historical_irr.forEach((fund: any) => {
                if (fund.historical_irr) {
                  fund.historical_irr.forEach((record: any) => {
                    allDates.add(record.irr_date);
                  });
                }
              });
            }
            
            // Sort dates in descending order (most recent first)
            const allSortedDates = Array.from(allDates).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
            
            // Keep only historical dates (excluding the current/latest IRR)
            const sortedDates = allSortedDates.slice(1, 13); // Skip first (current) and take next 12 historical dates
            
            // Create lookup maps for quick access
            const portfolioIrrMap = new Map();
            if (productHistory.portfolio_historical_irr) {
              productHistory.portfolio_historical_irr.forEach((record: any) => {
                portfolioIrrMap.set(record.irr_date, record.irr_result);
              });
            }
            
            const fundIrrMaps = new Map();
            if (productHistory.funds_historical_irr) {
              productHistory.funds_historical_irr.forEach((fund: any) => {
                const fundMap = new Map();
                if (fund.historical_irr) {
                  fund.historical_irr.forEach((record: any) => {
                    fundMap.set(record.irr_date, record.irr_result);
                  });
                }
                fundIrrMaps.set(fund.portfolio_fund_id, fundMap);
              });
            }

            return (
              <div 
                key={index} 
                className={`product-card bg-white shadow-sm rounded-lg border border-gray-200 p-6 w-full print-clean ${product?.status === 'inactive' ? 'opacity-60 bg-gray-50' : ''}`}
                style={{
                  borderLeft: product?.provider_theme_color ? `4px solid ${product.provider_theme_color}` : '4px solid #e5e7eb',
                  borderTop: product?.provider_theme_color ? `1px solid ${product.provider_theme_color}` : undefined,
                  borderRight: product?.provider_theme_color ? `1px solid ${product.provider_theme_color}` : undefined,
                  borderBottom: product?.provider_theme_color ? `1px solid ${product.provider_theme_color}` : undefined,
                }}
              >
                <div className="flex items-center gap-3 mb-4">
                  {product?.provider_theme_color && (
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: product.provider_theme_color }}
                    />
                  )}
                  <h3 className={`text-xl font-semibold ${product?.status === 'inactive' ? 'text-gray-600' : 'text-gray-800'}`}>
                    {generateProductTitle(product, customTitles.get(product.id))}
                    {product?.status === 'inactive' && (
                      <span className="ml-2 text-sm text-red-600 font-medium">(Inactive)</span>
                    )}
                  </h3>
                </div>

                <div className="overflow-x-auto product-table">
                  <table className="w-full table-auto divide-y divide-gray-300 landscape-table">
                    <thead className="bg-gray-100">
                      <tr>
                        <th scope="col" className="px-2 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">
                          Fund Name
                        </th>
                        <th scope="col" className="px-2 py-2 text-right text-xs font-semibold text-gray-700 uppercase tracking-wide">
                          Current "Risk" 1-7 scale, (7 High)
                        </th>
                        <th scope="col" className="px-2 py-2 text-right text-xs font-semibold text-gray-700 uppercase tracking-wide bg-purple-100">
                          Current Average Return p.a.
                        </th>
                        {sortedDates.map((date) => (
                          <th key={date} scope="col" className="px-2 py-2 text-right text-xs font-semibold text-gray-700 uppercase tracking-wide">
                            {(() => {
                              const dateObj = new Date(date);
                              const year = dateObj.getFullYear();
                              const month = dateObj.toLocaleDateString('en-US', { month: 'long' });
                              return `${month} ${year}`;
                            })()}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {/* Fund Rows */}
                      {productHistory.funds_historical_irr && productHistory.funds_historical_irr.length > 0 ? (
                        productHistory.funds_historical_irr.map((fund: any, fundIndex: number) => (
                          <tr key={fundIndex} className={`hover:bg-blue-50 ${fund.fund_status === 'inactive' ? 'opacity-60 bg-gray-50' : ''}`}>
                            <td className="px-2 py-2 text-xs text-left">
                              <div className="flex items-center gap-2">
                                <span className={fund.fund_status === 'inactive' ? 'text-gray-500' : 'text-gray-800'}>
                                  {fund.fund_name}
                                </span>
                                {fund.fund_status === 'inactive' && (
                                  <span className="text-xs text-red-600 font-medium">(Inactive)</span>
                                )}
                              </div>
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
                            <td className="px-2 py-2 text-xs text-right bg-purple-50">
                              {fund.historical_irr && fund.historical_irr.length > 0 ? (
                                <span className="text-xs text-black font-semibold">
                                  {formatFundIrr(fund.historical_irr[0]?.irr_result)}
                                </span>
                              ) : (
                                <span className="text-gray-400">N/A</span>
                              )}
                            </td>
                            {sortedDates.map((date) => {
                              const fundMap = fundIrrMaps.get(fund.portfolio_fund_id);
                              const irrValue = fundMap?.get(date);
                              return (
                                <td key={date} className="px-2 py-2 text-xs text-right">
                                  {irrValue !== null && irrValue !== undefined ? (
                                    <span className="text-xs">
                                      {formatFundIrr(irrValue)}
                                    </span>
                                  ) : (
                                    <span className="text-gray-400">N/A</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3 + sortedDates.length} className="px-2 py-2 text-center text-gray-500">
                            No fund data available for this product
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          }).filter(Boolean);
        })()}
      </div>
    </div>
  );
};

export default IRRHistoryTab; 