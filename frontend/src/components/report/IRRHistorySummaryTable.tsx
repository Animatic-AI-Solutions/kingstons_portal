import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useReportStateManager } from '../../hooks/report/useReportStateManager';
import { IRRHistorySummaryService, type IRRHistorySummaryRequest, type ProductIRRHistory, type PortfolioIRRHistory } from '../../services/irrHistorySummaryService';
import { formatWeightedRisk } from '../../utils/reportFormatters';
import { generateEffectiveProductTitle, sortProductsByOwnerOrder } from '../../utils/productTitleUtils';
import { normalizeProductType, PRODUCT_TYPE_ORDER } from '../../utils/reportConstants';
import type { ReportData, ProductPeriodSummary } from '../../types/reportTypes';
import api from '../../services/api';

interface IRRHistorySummaryTableProps {
  productIds: number[];
  selectedDates: string[]; // YYYY-MM-DD format - DEPRECATED: kept for backward compatibility
  perProductDates?: Record<number, string[]>; // NEW: Per-product date selections
  clientGroupIds?: number[];
  className?: string;
  realTimeTotalIRR?: number | null; // Current total IRR calculated properly with all cash flows
  reportData?: ReportData; // Add reportData to access risk information
}

interface SummaryTableData {
  productRows: ProductIRRHistory[];
  portfolioTotals: PortfolioIRRHistory[];
  dateHeaders: string[];
}

const IRRHistorySummaryTable: React.FC<IRRHistorySummaryTableProps> = ({
  productIds,
  selectedDates,
  perProductDates,
  clientGroupIds,
  className = '',
  realTimeTotalIRR,
  reportData
}) => {
  const [tableData, setTableData] = useState<SummaryTableData>({
    productRows: [],
    portfolioTotals: [],
    dateHeaders: []
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create service instance once
  const irrSummaryService = useMemo(() => new IRRHistorySummaryService(api), []);

  // INTERNAL MEMOIZATION: Stabilize props to prevent duplicate useEffect triggers
  const memoizedProductIds = useMemo(
    () => productIds,
    [productIds.length, productIds.join(',')]
  );

  const memoizedSelectedDates = useMemo(
    () => selectedDates,
    [selectedDates.length, selectedDates.join(',')]
  );

  // NEW: Helper function to determine if a date should be shown for a specific product
  const shouldShowDateForProduct = useCallback((productId: number, date: string): boolean => {
    if (!perProductDates) {
      // Fallback to old behavior if perProductDates not provided
      return true;
    }
    const productDates = perProductDates[productId] || [];
    return productDates.includes(date);
  }, [perProductDates]);

  const memoizedClientGroupIds = useMemo(
    () => clientGroupIds,
    [clientGroupIds?.length, clientGroupIds?.join(',')]
  );

  // Debug: Track memoization effectiveness
  useEffect(() => {
    console.log('🎯 [IRR SUMMARY MEMOIZATION] ProductIds memoized:', {
      rawLength: productIds.length,
      memoizedLength: memoizedProductIds.length,
      sameReference: productIds === memoizedProductIds
    });
  }, [memoizedProductIds]);

  useEffect(() => {
    console.log('🎯 [IRR SUMMARY MEMOIZATION] SelectedDates memoized:', {
      rawLength: selectedDates.length,
      memoizedLength: memoizedSelectedDates.length,
      sameReference: selectedDates === memoizedSelectedDates
    });
  }, [memoizedSelectedDates]);

  // Get custom titles from state manager
  const {
    state: { customTitles }
  } = useReportStateManager();

  // Function to get effective product title for IRR history product
  const getEffectiveProductTitle = (irrProduct: ProductIRRHistory): string => {
    // Find the corresponding product summary to get full product details
    const productSummary = reportData?.productSummaries.find(p => p.id === irrProduct.product_id);
    
    if (productSummary) {
      // Use the utility function with the full product details
      return generateEffectiveProductTitle(productSummary, customTitles, {
        omitOwner: reportData?.productOwnerOrder && reportData.productOwnerOrder.length <= 1
      });
    }
    
    // Fallback: use the original display name if product summary not found
    return irrProduct.provider_name 
      ? `${irrProduct.product_name} - ${irrProduct.provider_name}`
      : irrProduct.product_name;
  };

  // Organize products by type in the same order as SummaryTab, with inactive/lapsed products at the bottom
  const organizeProductsByType = (products: ProductIRRHistory[]): ProductIRRHistory[] => {
    if (!reportData?.productSummaries) {
      // Fallback to simple status sorting if no reportData, but still apply cash/previous funds ordering
      const activeProducts = products.filter(product =>
        product.status !== 'inactive' && product.status !== 'lapsed'
      );
      const inactiveProducts = products.filter(product =>
        product.status === 'inactive' || product.status === 'lapsed'
      );
      
      // Apply cash and previous funds ordering to both active and inactive products
      const sortedActiveProducts = applyCashAndPreviousFundsOrdering([...activeProducts]);
      const sortedInactiveProducts = applyCashAndPreviousFundsOrdering([...inactiveProducts]);
      
      return [...sortedActiveProducts, ...sortedInactiveProducts];
    }

    // Create a map of product ID to product summary for quick lookup
    const productSummaryMap = new Map(reportData.productSummaries.map(p => [p.id, p]));

    // Group products by normalized type
    const groupedProducts: { [key: string]: ProductIRRHistory[] } = {};
    
    products.forEach(product => {
      const productSummary = productSummaryMap.get(product.product_id);
      if (productSummary) {
        const normalizedType = normalizeProductType(productSummary.product_type);
        if (!groupedProducts[normalizedType]) {
          groupedProducts[normalizedType] = [];
        }
        groupedProducts[normalizedType].push(product);
      } else {
        // CRITICAL FIX: Don't silently drop products without product summaries
        // This was causing AJ1055J (Product 37) to be filtered out
        console.warn(`⚠️ [IRR SUMMARY] Product ${product.product_id} (${product.product_name}) not found in product summaries - including anyway`);
        
        // Create a fallback group for products without summaries
        const fallbackType = 'Other';
        if (!groupedProducts[fallbackType]) {
          groupedProducts[fallbackType] = [];
        }
        groupedProducts[fallbackType].push(product);
      }
    });

    // Sort products within each type by custom product owner order, with special ordering for ISAs
    Object.keys(groupedProducts).forEach(type => {
      if (type === 'ISAs') {
        // Special sorting for ISAs: ISA products first, then JISA products, then by custom owner order
        groupedProducts[type].sort((a, b) => {
          const productA = productSummaryMap.get(a.product_id);
          const productB = productSummaryMap.get(b.product_id);
          
          if (!productA || !productB) return 0;
          
          const typeA = productA.product_type?.toLowerCase().trim() || '';
          const typeB = productB.product_type?.toLowerCase().trim() || '';
          
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
        // Convert to ProductPeriodSummary for sorting, then back to ProductIRRHistory
        const summariesToSort = groupedProducts[type].map(p => productSummaryMap.get(p.product_id)).filter(Boolean) as ProductPeriodSummary[];
        const sortedSummaries = sortProductsByOwnerOrder(summariesToSort, reportData.productOwnerOrder || []);
        groupedProducts[type] = sortedSummaries.map(summary =>
          groupedProducts[type].find(p => p.product_id === summary.id)!
        );
      } else {
        // Standard sorting by custom product owner order for other product types
        // Convert to ProductPeriodSummary for sorting, then back to ProductIRRHistory
        const summariesToSort = groupedProducts[type].map(p => productSummaryMap.get(p.product_id)).filter(Boolean) as ProductPeriodSummary[];
        const sortedSummaries = sortProductsByOwnerOrder(summariesToSort, reportData.productOwnerOrder || []);
        groupedProducts[type] = sortedSummaries.map(summary =>
          groupedProducts[type].find(p => p.product_id === summary.id)!
        );
      }
      
      // Apply cash and previous funds ordering within each product type
      groupedProducts[type] = applyCashAndPreviousFundsOrdering(groupedProducts[type]);
    });

    // Return products in the specified order
    const orderedProducts: ProductIRRHistory[] = [];
    
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

  // Helper function to apply cash and previous funds ordering (same logic as SummaryTab)
  const applyCashAndPreviousFundsOrdering = (products: ProductIRRHistory[]): ProductIRRHistory[] => {
    return [...products].sort((a, b) => {
      // First: Check if either is "Previous Funds" entry - these go last
      const aIsPreviousFunds = a.product_name.includes('Previous Funds');
      const bIsPreviousFunds = b.product_name.includes('Previous Funds');
      if (aIsPreviousFunds && !bIsPreviousFunds) return 1;
      if (!aIsPreviousFunds && bIsPreviousFunds) return -1;
      if (aIsPreviousFunds && bIsPreviousFunds) return 0;
      
      // Second: Check if either is "Cash" - cash goes after regular funds but before Previous Funds
      const aIsCash = a.product_name.toLowerCase().includes('cash');
      const bIsCash = b.product_name.toLowerCase().includes('cash');
      if (aIsCash && !bIsCash) return 1;
      if (!aIsCash && bIsCash) return -1;
      
      // Third: Regular products maintain their original order (no additional sorting)
      return 0;
    });
  };

  // Fetch IRR history summary data
  useEffect(() => {
    console.log('🔄 [IRR SUMMARY TABLE] useEffect triggered:', {
      productIdsLength: memoizedProductIds.length,
      selectedDatesLength: memoizedSelectedDates.length,
      clientGroupIds: memoizedClientGroupIds,
      productIds: memoizedProductIds.slice(0, 3),
      selectedDates: memoizedSelectedDates.slice(0, 2)
    });
    
    const fetchSummaryData = async () => {
      if (memoizedProductIds.length === 0 || memoizedSelectedDates.length === 0) {
        console.log('⚠️ [IRR SUMMARY TABLE] Early return - empty productIds or selectedDates');
        setTableData({ productRows: [], portfolioTotals: [], dateHeaders: [] });
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Debug: Check for duplicate product IDs
        const uniqueProductIds = [...new Set(memoizedProductIds)];
        if (uniqueProductIds.length !== memoizedProductIds.length) {
          console.warn('⚠️ [IRR SUMMARY TABLE] Duplicate product IDs detected!', {
            original: memoizedProductIds,
            unique: uniqueProductIds,
            duplicateCount: memoizedProductIds.length - uniqueProductIds.length
          });
        }

        console.log('🔍 [IRR SUMMARY TABLE] Request details:', {
          productIds: memoizedProductIds,
          uniqueProductIds: uniqueProductIds,
          selectedDates: memoizedSelectedDates.sort(),
          clientGroupIds: memoizedClientGroupIds
        });

        const request: IRRHistorySummaryRequest = {
          product_ids: uniqueProductIds, // Use deduplicated product IDs
          selected_dates: memoizedSelectedDates.sort(), // Sort dates chronologically
          client_group_ids: memoizedClientGroupIds
        };

        console.log('🔍 [IRR HISTORY SUMMARY] Fetching data with request:', request);

        const response = await irrSummaryService.getIRRHistorySummary(request);

        console.log('🔍 [IRR SUMMARY TABLE] Backend response analysis:', {
          productRowsCount: response.data.product_irr_history.length,
          portfolioTotalsCount: response.data.portfolio_irr_history.length,
          productRowsSample: response.data.product_irr_history.slice(0, 3),
          uniqueProductIdsInResponse: [...new Set(response.data.product_irr_history.map(row => row.product_id))],
          requestedProductIds: uniqueProductIds
        });

        // Sort dates for consistent column ordering (most recent first)
        const sortedDates = [...memoizedSelectedDates].sort((a, b) => b.localeCompare(a));
        
        // Backend now returns flat rows (one per product-date combination)
        const productRows = response.data.product_irr_history || [];
        
        // No need for deduplication since backend now returns correct flat structure
        console.log('✅ [IRR SUMMARY TABLE] Received flat rows from backend:', {
          totalRows: productRows.length,
          expectedRows: uniqueProductIds.length * memoizedSelectedDates.length,
          structure: 'flat'
        });

        const newTableData = {
          productRows: productRows,
          portfolioTotals: response.data.portfolio_irr_history,
          dateHeaders: sortedDates
        };
        
        console.log('🔍 [IRR SUMMARY TABLE] Setting table data:', newTableData);
        
        setTableData(newTableData);
      } catch (err: any) {
        console.error('❌ [IRR SUMMARY TABLE] Failed to fetch IRR history summary:', err);
        setError(err.message || 'Failed to load IRR history summary');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSummaryData();
  }, [memoizedProductIds, memoizedSelectedDates, memoizedClientGroupIds, irrSummaryService]);

  // Get IRR value for a specific product and date from flat rows
  const getIRRValueForProductAndDate = (productId: number, date: string): number | null => {
    console.log(`🔍 [IRR SUMMARY DEBUG] Looking for productId: ${productId}, date: ${date}`);
    console.log(`🔍 [IRR SUMMARY DEBUG] Available productRows:`, tableData.productRows.map(row => ({
      product_id: row.product_id,
      irr_date: row.irr_date,
      irr_result: row.irr_result,
      product_name: row.product_name
    })));
    
    const flatRow = tableData.productRows.find((row: any) => 
      row.product_id === productId && row.irr_date === date
    ) as any;
    
    console.log(`🔍 [IRR SUMMARY DEBUG] Found row for productId ${productId}, date ${date}:`, flatRow ? {
      product_id: flatRow.product_id,
      product_name: flatRow.product_name,
      irr_date: flatRow.irr_date,
      irr_result: flatRow.irr_result,
      portfolio_id: flatRow.portfolio_id
    } : null);
    
    const result = flatRow ? flatRow.irr_result : null;
    console.log(`🔍 [IRR SUMMARY DEBUG] Returning IRR for productId ${productId}, date ${date}: ${result}`);
    
    return result;
  };

  // Get unique products from flat rows (including Previous Funds entries)
  const getUniqueProducts = () => {
    if (!tableData.productRows || tableData.productRows.length === 0) return [];
    
    const productMap = new Map();
    tableData.productRows.forEach((row: any) => {
      // CRITICAL FIX: Use product_id as the unique key instead of product_name
      // This prevents products with the same name (like multiple "Investment Plan" products)
      // from overwriting each other in the Map
      const uniqueKey = row.product_id;
      
      if (!productMap.has(uniqueKey)) {
        productMap.set(uniqueKey, {
          product_id: row.product_id,
          product_name: row.product_name,
          provider_name: row.provider_name,
          provider_theme_color: row.provider_theme_color,
          status: row.status
        });
      }
    });
    
    return Array.from(productMap.values());
  };

  // Get portfolio IRR for a specific date - backend already filters for portfolios with valuations
  const getPortfolioIRRForDate = (date: string): number | null => {
    // Always use backend calculated portfolio IRR for consistency
    // Backend only includes portfolios that have valuations for that specific date
    const portfolioData = tableData.portfolioTotals.find(data => data.date === date);
    const backendIRR = portfolioData ? portfolioData.portfolio_irr : null;
    
    if (backendIRR !== null) {
      console.log(`📊 [IRR SUMMARY] Using backend IRR for date ${date}: ${backendIRR}% (calculated from portfolios with valuations)`);
    } else {
      console.log(`⚠️ [IRR SUMMARY] No portfolio IRR data available for ${date} (no portfolios had valuations)`);
    }
    
    return backendIRR;
  };

  // Get risk for a specific product
  const getProductRisk = (productId: number): number | null => {
    if (!reportData?.productSummaries) return null;
    
    const product = reportData.productSummaries.find(p => p.id === productId);
    return product?.weighted_risk || null;
  };

  // Calculate client group weight risk for the portfolio total
  const calculateClientGroupWeightRisk = (): number | null => {
    if (!reportData?.productSummaries) return null;
    
    // Get products that are in the current table
    const relevantProducts = reportData.productSummaries.filter(p => 
      memoizedProductIds.includes(p.id)
    );
    
    let totalValue = 0;
    let weightedRiskSum = 0;
    let hasAnyRisk = false;
    
    relevantProducts.forEach(product => {
      const productValue = product.current_valuation || 0;
      const productRisk = product.weighted_risk;
      
      if (productValue > 0 && productRisk !== undefined && productRisk !== null) {
        totalValue += productValue;
        weightedRiskSum += (productValue * productRisk);
        hasAnyRisk = true;
      }
    });
    
    if (!hasAnyRisk || totalValue === 0) return null;
    
    const calculatedRisk = weightedRiskSum / totalValue;
    
    console.log(`🎯 [CLIENT GROUP RISK] Calculated client group weight risk:`, {
      productCount: relevantProducts.length,
      totalValue,
      weightedRiskSum,
      calculatedRisk: calculatedRisk.toFixed(1),
      productBreakdown: relevantProducts.map(p => ({
        name: p.product_name,
        value: p.current_valuation,
        risk: p.weighted_risk,
        weight: p.current_valuation / totalValue
      }))
    });
    
    return calculatedRisk;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={className}>
        <div className="flex items-center justify-center py-8">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="text-gray-600">Loading History Summary...</span>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={className}>
        <div className="text-center py-4">
          <div className="text-red-600 mb-2">
            <svg className="h-8 w-8 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-medium text-red-800 mb-2">Error Loading History Summary</h3>
          </div>
          <p className="text-sm text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (tableData.productRows.length === 0) {
    return (
      <div className={className}>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          History Summary
        </h3>
        <div className="text-center py-8">
          <div className="text-gray-400 mb-2">
            <svg className="h-12 w-12 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            No IRR History Data Available
          </div>
          <p className="text-sm text-gray-500 mb-4">
            {memoizedProductIds.length === 0 && memoizedSelectedDates.length === 0 
              ? "Select products and historical IRR dates to view the summary table."
              : memoizedProductIds.length === 0 
                ? "No products selected for the report."
                : memoizedSelectedDates.length === 0
                  ? "No historical IRR dates selected."
                  : "No IRR data found for the selected products and dates."
            }
          </p>
          <div className="text-xs text-gray-400">
            <p>Debug Info:</p>
            <p>Products: {memoizedProductIds.length} | Dates: {memoizedSelectedDates.length}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`irr-history-section ${className}`}>
      <div className="mb-4 product-card print-clean">
        <div className="px-2 py-2">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">History Summary</h2>
          <div className="overflow-x-auto product-table">
            <table className="w-full table-fixed divide-y divide-gray-300 landscape-table irr-history-table">
              <colgroup>
                <col className="w-[30%]" />
                <col className="w-[10%]" />
                {tableData.dateHeaders.map((_, index) => (
                  <col key={index} className="w-[15%]" />
                ))}
              </colgroup>
              
              <thead className="bg-gray-100">
                {/* Table Header */}
                <tr>
                  {/* Product Name Column */}
                  <th 
                    scope="col" 
                    className="px-2 py-2 text-left text-[10px] font-semibold text-gray-700 uppercase tracking-wide"
                  >
                    Product
                  </th>
                  
                  {/* Current Risk Column */}
                  <th 
                    scope="col" 
                    className="px-2 py-2 text-center text-[10px] font-semibold text-gray-700 uppercase tracking-wide"
                  >
                    Current "Risk" 1-7 scale, (7 High)
                  </th>
                  
                  {/* Date Columns */}
                  {tableData.dateHeaders.map((date, index) => {
                    // Check if this is the most recent (first) date since dates are sorted newest first
                    const isCurrentYear = index === 0;
                    return (
                      <th
                        key={date}
                        scope="col"
                        className={`px-2 py-2 text-right text-[10px] font-semibold text-gray-700 uppercase tracking-wide ${
                          isCurrentYear ? 'bg-purple-100' : ''
                        }`}
                      >
                        {(() => {
                          const dateObj = new Date(date);
                          const year = dateObj.getFullYear();
                          const month = dateObj.toLocaleDateString('en-US', { month: 'short' });
                          return `${month} ${year}`;
                        })()}
                      </th>
                    );
                  })}
                </tr>
              </thead>

              {/* Table Body */}
              <tbody className="bg-white divide-y divide-gray-200">
                {/* Product Rows */}
                {organizeProductsByType(getUniqueProducts()).map((product, index) => {
                  // Determine if this product should be greyed out (same logic as SummaryTab)
                  const isLapsed = product.status === 'inactive' || product.status === 'lapsed';
                  
                  return (
                    <tr key={`product-${product.product_id}-${index}`} className={`hover:bg-blue-50 ${isLapsed ? 'opacity-50 bg-gray-50' : ''}`}>
                      {/* Product Name Cell */}
                      <td className={`text-left px-2 py-2 ${isLapsed ? 'text-gray-500' : 'text-gray-800'}`}>
                        <div className="flex items-start gap-1.5">
                          {/* Provider Color Indicator */}
                          {product.provider_theme_color && (
                            <div 
                              className="w-2.5 h-2.5 rounded-full mt-0.5 flex-shrink-0" 
                              style={{ backgroundColor: product.provider_theme_color }}
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm leading-tight">
                              {getEffectiveProductTitle(product)}
                              {isLapsed && (
                                <span className="ml-2 text-sm text-red-600 font-medium">(Lapsed)</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Current Risk Cell */}
                      <td className="px-2 py-2 text-base text-right">
                        {(() => {
                          const productRisk = getProductRisk(product.product_id);
                          return productRisk !== null ? (
                            formatWeightedRisk(productRisk)
                          ) : (
                            <span className="text-gray-400">N/A</span>
                          );
                        })()}
                      </td>

                      {/* IRR Value Cells */}
                      {tableData.dateHeaders.map((date, index) => {
                        // NEW: Check if this date should be shown for this product
                        const shouldShow = shouldShowDateForProduct(product.product_id, date);
                        const irrValue = shouldShow ? getIRRValueForProductAndDate(product.product_id, date) : null;
                        
                        // Check if this is the most recent (first) date since dates are sorted newest first
                        const isCurrentYear = index === 0;
                        // Use 'total' format type for active products (1 decimal place), 'inactive' for inactive products (smart decimal places)
                        const formatType = isLapsed ? 'inactive' : 'total';
                        return (
                          <td
                            key={`${product.product_id}-${date}`}
                            className={`px-2 py-2 text-base text-right ${
                              isCurrentYear ? 'bg-purple-50' : ''
                            }`}
                          >
                            {irrValue !== null ? (
                              <span className={irrValue >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                                {IRRHistorySummaryService.formatIRRValue(irrValue, formatType)}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}

                {/* Portfolio Total Row - Matches Investment Totals Style */}
                <tr className="bg-gray-50 border-t-2 border-gray-300">
                  {/* Total Label */}
                  <td className="px-2 py-2 text-base font-bold text-black text-left">
                    Portfolio Total
                  </td>

                  {/* Current Client Group Weight Risk Cell */}
                  <td className="px-2 py-2 text-base font-bold text-black text-right">
                    {(() => {
                      const clientGroupRisk = calculateClientGroupWeightRisk();
                      return clientGroupRisk !== null ? (
                        formatWeightedRisk(clientGroupRisk)
                      ) : (
                        <span className="text-gray-400">N/A</span>
                      );
                    })()}
                  </td>

                  {/* Portfolio IRR Cells */}
                  {tableData.dateHeaders.map((date, index) => {
                    const portfolioIRR = getPortfolioIRRForDate(date);
                    // Check if this is the most recent (first) date since dates are sorted newest first
                    const isCurrentYear = index === 0;
                    return (
                      <td
                        key={`portfolio-${date}`}
                        className={`px-2 py-2 text-base font-bold text-right text-black ${
                          isCurrentYear ? 'bg-purple-100' : ''
                        }`}
                      >
                        {portfolioIRR !== null ? (
                          IRRHistorySummaryService.formatIRRValue(portfolioIRR, 'total')
                        ) : (
                          '-'
                        )}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IRRHistorySummaryTable; 