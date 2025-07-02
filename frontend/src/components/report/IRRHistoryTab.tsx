/**
 * IRRHistoryTab - IRR history display component
 * Part of Phase 2 refactoring - extracted from ReportDisplay component
 * 
 * This component handles the IRR history tab content including:
 * - Historical IRR data tables for each product
 * - Fund-level IRR history
 * - Date-based IRR comparisons
 */

import React from 'react';
import { useReportStateManager } from '../../hooks/report/useReportStateManager';
import type { ReportData } from '../../types/reportTypes';
import {
  formatFundRisk,
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
      portfolioIrrValues,
      customTitles,
      loading
    }
  } = useReportStateManager();

  const loadingIrrHistory = loading.irrHistory;

  // Organize products by type with headers (same logic as ReportDisplay)
  const organizeProductsByTypeWithHeaders = (products: any[]) => {
    const productTypeOrder = [
      'ISAs',
      'GIAs', 
      'Onshore Bonds',
      'Offshore Bonds',
      'Pensions',
      'Other'
    ];

    // Group products by normalized type
    const groupedProducts: { [key: string]: any[] } = {};
    
    products.forEach(product => {
      const normalizedType = normalizeProductType(product.product_type);
      if (!groupedProducts[normalizedType]) {
        groupedProducts[normalizedType] = [];
      }
      groupedProducts[normalizedType].push(product);
    });

    // Sort products within each type by provider name
    Object.keys(groupedProducts).forEach(type => {
      groupedProducts[type].sort((a, b) => {
        const providerA = a.provider_name || '';
        const providerB = b.provider_name || '';
        return providerA.localeCompare(providerB);
      });
    });

    // Return organized structure
    const result: { type: string; products: any[] }[] = [];
    productTypeOrder.forEach(type => {
      if (groupedProducts[type]) {
        result.push({
          type,
          products: groupedProducts[type]
        });
      }
    });

    return result;
  };

  // Extract plan number from product
  const extractPlanNumber = (product: any): string | null => {
    const productName = product.product_name || '';
    
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
  const generateProductTitle = (product: any, customTitle?: string): string => {
    if (customTitle && customTitle.trim()) {
      return customTitle.trim();
    }

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
    <div className="print:hidden irr-history-section">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">IRR History</h2>
      </div>
      
      {loadingIrrHistory ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading IRR history...</p>
          </div>
        </div>
      ) : irrHistoryData ? (
        <div className="space-y-8">
          {(() => {
            const organizedProductGroups = organizeProductsByTypeWithHeaders(reportData.productSummaries);
            const organizedProducts = organizedProductGroups.flatMap(group => group.products);
            
            return organizedProducts.map((product, index) => {
              const originalIndex = reportData.productSummaries.findIndex(p => p.id === product.id);
              const productHistory = irrHistoryData[originalIndex];

              if (!productHistory) {
                return null;
              }

              // Get all unique dates from historical IRR data
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
              
              // Sort dates and get historical dates (exclude most recent)
              const allSortedDates = Array.from(allDates).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
              const sortedDates = allSortedDates.slice(1, 13); // Take 12 historical dates
              
              // Create lookup maps for IRR data
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
                        {productHistory.funds_historical_irr && productHistory.funds_historical_irr.length > 0 ? (
                          productHistory.funds_historical_irr
                            .filter((fund: any) => fund.fund_status === 'active' || fund.fund_status === null)
                            .map((fund: any, fundIndex: number) => {
                              const fundIrrMap = fundIrrMaps.get(fund.portfolio_fund_id) || new Map();
                              
                              return (
                                <tr key={fundIndex} className="hover:bg-blue-50">
                                  <td className="px-2 py-2 text-xs font-medium text-gray-800 text-left">
                                    {fund.fund_name}
                                  </td>
                                  <td className="px-2 py-2 text-xs text-right">
                                    {fund.risk_factor !== null && fund.risk_factor !== undefined ? (
                                      <span className="text-xs">
                                        {formatFundRisk(fund.risk_factor)}
                                      </span>
                                    ) : (
                                      <span className="text-gray-400">-</span>
                                    )}
                                  </td>
                                  <td className="px-2 py-2 text-xs text-right bg-purple-50">
                                    {(() => {
                                      if (fund.historical_irr && fund.historical_irr.length > 0) {
                                        const sortedIrrs = fund.historical_irr
                                          .filter((record: any) => record.irr_result !== null && record.irr_result !== undefined)
                                          .sort((a: any, b: any) => new Date(b.irr_date).getTime() - new Date(a.irr_date).getTime());
                                        
                                        if (sortedIrrs.length > 0) {
                                          const currentIrr = sortedIrrs[0].irr_result;
                                          return (
                                            <span className={currentIrr >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                                              {Math.round(currentIrr)}%
                                            </span>
                                          );
                                        }
                                      }
                                      return <span className="text-gray-400">N/A</span>;
                                    })()}
                                  </td>
                                  {sortedDates.map((date) => (
                                    <td key={date} className="px-2 py-2 text-xs text-right">
                                      {(() => {
                                        const irrValue = fundIrrMap.get(date);
                                        if (irrValue !== null && irrValue !== undefined) {
                                          return (
                                            <span className={irrValue >= 0 ? 'text-green-600' : 'text-red-600'}>
                                              {Math.round(irrValue)}%
                                            </span>
                                          );
                                        }
                                        return <span className="text-gray-400">N/A</span>;
                                      })()}
                                    </td>
                                  ))}
                                </tr>
                              );
                            })
                        ) : (
                          <tr>
                            <td colSpan={3 + sortedDates.length} className="px-2 py-2 text-center text-gray-500">
                              No IRR history available for this product
                            </td>
                          </tr>
                        )}

                        {/* Product Total Row */}
                        <tr className="bg-gray-100 font-semibold border-t-2 border-gray-300">
                          <td className="px-2 py-2 text-xs font-bold text-gray-800 text-left">
                            TOTAL
                          </td>
                          <td className="px-2 py-2 text-xs font-bold text-right text-gray-800">
                            {(() => {
                              // Calculate weighted risk for active funds
                              let weightedRisk = 0;
                              let totalWeightedValue = 0;
                              
                              if (productHistory.funds_historical_irr && product?.funds) {
                                const fundValuationMap = new Map();
                                product.funds.forEach((summaryFund: any) => {
                                  if (!summaryFund.isVirtual) {
                                    fundValuationMap.set(summaryFund.fund_name, summaryFund.current_valuation || 0);
                                  }
                                });
                                
                                const fundsWithRisk = productHistory.funds_historical_irr.filter(
                                  (fund: any) => fund.risk_factor !== undefined && 
                                         fund.risk_factor !== null && 
                                         fund.fund_status !== 'inactive' &&
                                         !fund.fund_name?.includes('Previous Funds')
                                );
                                
                                fundsWithRisk.forEach((fund: any) => {
                                  const valuation = fundValuationMap.get(fund.fund_name) || 0;
                                  weightedRisk += fund.risk_factor * valuation;
                                  totalWeightedValue += valuation;
                                });
                                
                                weightedRisk = totalWeightedValue > 0 ? weightedRisk / totalWeightedValue : 0;
                              }
                              
                              if (totalWeightedValue > 0) {
                                return (
                                  <span className="text-xs font-bold">
                                    {weightedRisk.toFixed(1)}
                                  </span>
                                );
                              } else {
                                return <span className="text-gray-400 font-bold">N/A</span>;
                              }
                            })()}
                          </td>
                          <td className="px-2 py-2 text-xs font-bold text-right text-gray-800 bg-purple-50">
                            {(() => {
                              const currentIrr = portfolioIrrValues.get(product.id);
                              if (currentIrr !== null && currentIrr !== undefined) {
                                return (
                                  <span className="text-black font-bold">
                                    {currentIrr.toFixed(1)}%
                                  </span>
                                );
                              }
                              return <span className="text-gray-400 font-bold">N/A</span>;
                            })()}
                          </td>
                          {sortedDates.map((date) => (
                            <td key={date} className="px-2 py-2 text-xs font-bold text-right text-gray-800">
                              {(() => {
                                const portfolioIrr = portfolioIrrMap.get(date);
                                if (portfolioIrr !== null && portfolioIrr !== undefined) {
                                  return (
                                    <span className="text-black font-bold">
                                      {portfolioIrr.toFixed(1)}%
                                    </span>
                                  );
                                }
                                return <span className="text-gray-400 font-bold">N/A</span>;
                              })()}
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            });
          })()}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <p>No IRR history data available.</p>
          <p className="text-sm mt-2">Click "Load IRR History" to fetch historical performance data.</p>
        </div>
      )}
    </div>
  );
};

export default IRRHistoryTab; 