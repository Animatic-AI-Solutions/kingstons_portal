import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useReportStateManager } from '../../../../hooks/report/useReportStateManager';
import { IRRHistorySummaryService, type IRRHistorySummaryRequest, type ProductIRRHistory, type PortfolioIRRHistory } from '../../../../services/irrHistorySummaryService';
import { formatWeightedRisk } from '../../../../utils/reportFormatters';
import { generateEffectiveProductTitle, sortProductsByOwnerOrder } from '../../../../utils/productTitleUtils';
import { normalizeProductType, PRODUCT_TYPE_ORDER } from '../../../../utils/reportConstants';
import type { ReportData, ProductPeriodSummary } from '../../../../types/reportTypes';
import api from '../../../../services/api';

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
    const fetchSummaryData = async () => {
      if (memoizedProductIds.length === 0 || memoizedSelectedDates.length === 0) {
        setTableData({ productRows: [], portfolioTotals: [], dateHeaders: [] });
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Check for duplicate product IDs
        const uniqueProductIds = [...new Set(memoizedProductIds)];

        const request: IRRHistorySummaryRequest = {
          product_ids: uniqueProductIds, // Use deduplicated product IDs
          selected_dates: memoizedSelectedDates.sort(), // Sort dates chronologically
          client_group_ids: memoizedClientGroupIds
        };

        const response = await irrSummaryService.getIRRHistorySummary(request);

        // Sort dates for consistent column ordering (most recent first)
        const sortedDates = [...memoizedSelectedDates].sort((a, b) => b.localeCompare(a));

        // Backend now returns flat rows (one per product-date combination)
        const productRows = response.data.product_irr_history || [];

        const newTableData = {
          productRows: productRows,
          portfolioTotals: response.data.portfolio_irr_history,
          dateHeaders: sortedDates
        };

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
    const flatRow = tableData.productRows.find((row: any) =>
      row.product_id === productId && row.irr_date === date
    ) as any;

    return flatRow ? flatRow.irr_result : null;
  };

  // Get the most recent NON-NULL IRR value for a product (for carrying forward to future dates)
  const getMostRecentIRRForProduct = (productId: number): { irr: number; date: string } | null => {
    // Get all IRR entries for this product that have non-null IRR values
    const productRows = tableData.productRows.filter((row: any) =>
      row.product_id === productId && row.irr_result !== null && row.irr_result !== undefined
    );

    console.log(`[IRR CARRY-FORWARD] Product ${productId} has ${productRows.length} non-null IRR entries:`,
      productRows.map((r: any) => ({ date: r.irr_date, irr: r.irr_result }))
    );

    if (productRows.length === 0) {
      console.log(`[IRR CARRY-FORWARD] Product ${productId} - No non-null IRR entries found`);
      return null;
    }

    // Sort by date descending (most recent first) and get the first entry with non-null IRR
    const sortedRows = productRows.sort((a: any, b: any) => b.irr_date.localeCompare(a.irr_date));
    const mostRecent = sortedRows[0] as any;

    console.log(`[IRR CARRY-FORWARD] Product ${productId} - Most recent non-null IRR:`,
      { date: mostRecent.irr_date, irr: mostRecent.irr_result }
    );

    return {
      irr: mostRecent.irr_result,
      date: mostRecent.irr_date
    };
  };

  // Get IRR value for a product and date, with carry-forward logic
  // Carry forward means: if a date is MORE RECENT than the most recent non-null IRR, show that IRR
  const getIRRValueWithCarryForward = (productId: number, date: string): number | null => {
    console.log(`[IRR CARRY-FORWARD] Requesting IRR for product ${productId}, date ${date}`);

    // First, try to get the exact non-null IRR for this date
    const exactIRR = getIRRValueForProductAndDate(productId, date);
    if (exactIRR !== null) {
      console.log(`[IRR CARRY-FORWARD] Found exact IRR: ${exactIRR}`);
      return exactIRR;
    }

    console.log(`[IRR CARRY-FORWARD] No exact IRR found, checking for carry-forward...`);

    // Get the most recent non-null IRR
    const mostRecentIRR = getMostRecentIRRForProduct(productId);
    if (!mostRecentIRR) {
      console.log(`[IRR CARRY-FORWARD] No non-null IRR data available for product ${productId}`);
      return null;
    }

    console.log(`[IRR CARRY-FORWARD] Comparing dates: requested=${date}, mostRecent=${mostRecentIRR.date}`);
    console.log(`[IRR CARRY-FORWARD] Date comparison: date > mostRecentIRR.date = ${date > mostRecentIRR.date}`);

    // If the requested date is more recent than the most recent non-null IRR date, carry forward
    if (date > mostRecentIRR.date) {
      console.log(`[IRR CARRY-FORWARD] ✅ Carrying forward IRR ${mostRecentIRR.irr} from ${mostRecentIRR.date} to ${date}`);
      return mostRecentIRR.irr;
    }

    // Otherwise (date is older than available data), return null to show dash
    console.log(`[IRR CARRY-FORWARD] ❌ Date ${date} is not more recent than most recent IRR date, returning null`);
    return null;
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
    return portfolioData ? portfolioData.portfolio_irr : null;
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

    return weightedRiskSum / totalValue;
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
    <div className={`irr-history-summary ${className}`}>
      <div className="mb-4 bg-white shadow-sm rounded-lg border border-gray-200 w-full product-card print-clean"
        style={{
          borderLeft: '4px solid #6b7280', // Dark grey left border like product cards
          borderTop: '1px solid #6b7280',   // Dark grey top border
          borderRight: '1px solid #6b7280', // Dark grey right border  
          borderBottom: '1px solid #6b7280' // Dark grey bottom border
        }}
      >
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
                {(() => {
                  // Separate active and lapsed products
                  const organizedProducts = organizeProductsByType(getUniqueProducts());
                  const activeProducts = organizedProducts.filter(p => p.status !== 'inactive' && p.status !== 'lapsed');
                  const lapsedProducts = organizedProducts.filter(p => p.status === 'inactive' || p.status === 'lapsed');

                  // Create aggregated "Previous Products" virtual row
                  const previousProductsRow = lapsedProducts.length > 0 ? {
                    product_id: 'previous-products-virtual',
                    isVirtual: true,
                    product_name: 'Previous Products',
                    lapsedProductCount: lapsedProducts.length,
                    provider_theme_color: null,
                    status: 'virtual',
                    lapsedProductIds: lapsedProducts.map(p => p.product_id)
                  } : null;

                  // Combine active products with Previous Products row
                  const productsToDisplay = [...activeProducts];
                  if (previousProductsRow) {
                    productsToDisplay.push(previousProductsRow as any);
                  }

                  return productsToDisplay.map((product: any, index) => {
                    // Determine if this is the virtual Previous Products row
                    const isVirtual = product.isVirtual;
                    const isLapsed = !isVirtual && (product.status === 'inactive' || product.status === 'lapsed');

                    return (
                      <tr key={`product-${product.product_id}-${index}`} className={`hover:bg-blue-50 ${isVirtual ? 'bg-gray-100 font-medium' : isLapsed ? 'opacity-50 bg-gray-50' : ''}`}>
                      {/* Product Name Cell */}
                      <td className={`text-left px-2 py-2 ${isVirtual ? 'text-gray-800 font-medium' : isLapsed ? 'text-gray-500' : 'text-gray-800'}`}>
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
                              {isVirtual ? (
                                <>
                                  {product.product_name}
                                  {product.lapsedProductCount && (
                                    <span className="ml-2 inline-flex items-center px-1 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-800">
                                      {product.lapsedProductCount} {product.lapsedProductCount === 1 ? 'product' : 'products'}
                                    </span>
                                  )}
                                </>
                              ) : (
                                <>
                                  {getEffectiveProductTitle(product)}
                                  {isLapsed && (
                                    <span className="ml-2 text-sm text-red-600 font-medium">(Lapsed)</span>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Current Risk Cell */}
                      <td className="px-2 py-2 text-base text-right">
                        {(() => {
                          if (isVirtual) {
                            // Previous Products row always shows 0 risk (no current valuation in lapsed products)
                            return formatWeightedRisk(0);
                          }
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
                        const isCurrentYear = index === 0;

                        // For virtual Previous Products row, calculate aggregated IRR from all lapsed products
                        if (isVirtual && product.lapsedProductIds) {
                          const lapsedIrrs: number[] = [];
                          product.lapsedProductIds.forEach((productId: number) => {
                            // Use carry-forward logic for lapsed products too
                            const irr = getIRRValueWithCarryForward(productId, date);
                            if (irr !== null) {
                              lapsedIrrs.push(irr);
                            }
                          });

                          const avgIrr = lapsedIrrs.length > 0
                            ? lapsedIrrs.reduce((sum, irr) => sum + irr, 0) / lapsedIrrs.length
                            : null;

                          return (
                            <td
                              key={`${product.product_id}-${date}`}
                              className={`px-2 py-2 text-base text-right ${isCurrentYear ? 'bg-purple-50' : ''}`}
                            >
                              {avgIrr !== null ? (
                                <span className={avgIrr >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                                  {IRRHistorySummaryService.formatIRRValue(avgIrr, 'total')}
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                          );
                        }

                        // For regular products, get individual IRR with carry-forward logic
                        // Always use carry-forward logic regardless of per-product date selection
                        const irrValue = getIRRValueWithCarryForward(product.product_id, date);
                        const formatType = isLapsed ? 'inactive' : 'total';

                        return (
                          <td
                            key={`${product.product_id}-${date}`}
                            className={`px-2 py-2 text-base text-right ${isCurrentYear ? 'bg-purple-50' : ''}`}
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
                  });
                })()}

                {/* Portfolio Total Row - Matches Investment Totals Style */}
                <tr className="bg-gray-50 border-t-2 border-gray-300">
                  {/* Total Label */}
                  <td className="text-left px-2 py-2 text-black">
                    <div className="flex items-start gap-1.5">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm leading-tight font-bold">
                          Portfolio Total
                        </div>
                      </div>
                    </div>
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