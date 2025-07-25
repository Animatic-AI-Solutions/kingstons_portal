/**
 * IRRHistoryTab - Enhanced Historical IRR display component (Phase 2)
 * 
 * This component now includes:
 * - Interactive line charts with Recharts
 * - Table/Chart view toggle
 * - CSV export functionality
 * - Enhanced performance optimizations
 * - Fund comparison tools
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import IRRHistorySummaryTable from './IRRHistorySummaryTable';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { 
  ChartBarIcon, 
  TableCellsIcon, 
  ArrowDownTrayIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';

import { useReportStateManager } from '../../hooks/report/useReportStateManager';
import { useReportFormatter } from '../../hooks/report/useReportFormatter';
import type { ReportData, ProductPeriodSummary } from '../../types/reportTypes';
import {
  formatIrrWithPrecision,
  formatWeightedRisk,
  formatWeightedRiskConsistent,
  formatCurrencyWithTruncation
} from '../../utils/reportFormatters';
import { generateEffectiveProductTitle, extractPlanNumber, sortProductsByOwnerOrder } from '../../utils/productTitleUtils';
import { normalizeProductType, PRODUCT_TYPE_ORDER } from '../../utils/reportConstants';
import { useIRRCalculationService } from '../../hooks/report/useIRRCalculationService';
import api from '../../services/api';

// Local function to format fund IRRs with consistent 1 decimal place display
const formatFundIrr = (irr: number | null | undefined): string => {
  if (irr === null || irr === undefined || isNaN(irr)) return '-';
  
  // Always format to 1 decimal place for consistency
  return `${irr.toFixed(1)}%`;
};

// Helper function for chart tick formatting (1 decimal place, consistent)
const formatChartTick = (value: number): string => {
  if (isNaN(value)) return '0.0%';
  return `${value.toFixed(1)}%`;
};

interface IRRHistoryTabProps {
  reportData: ReportData;
}

type ViewMode = 'table' | 'chart';
type ChartType = 'line' | 'area';

export const IRRHistoryTab: React.FC<IRRHistoryTabProps> = ({ reportData }) => {
  const {
    state: {
      irrHistoryData,
      customTitles: stableCustomTitles,
      hideZeros,
      loading,
      showInactiveProductDetails,
      portfolioIrrValues
    }
  } = useReportStateManager();
  
  // Track calculated Previous Funds IRR values for each product and date
  const [previousFundsIRRData, setPreviousFundsIRRData] = useState<Map<string, Map<string, number | null>>>(new Map());
  const [previousFundsCalculationComplete, setPreviousFundsCalculationComplete] = useState<Set<number>>(new Set());

  // Debug logging to understand data state
  console.log('🔍 [IRR HISTORY DEBUG] Component loaded with:', {
    hasReportData: !!reportData,
    productCount: reportData?.productSummaries?.length || 0,
    hasIrrHistoryData: !!irrHistoryData,
    irrHistoryDataLength: irrHistoryData?.length || 0,
    loadingState: loading,
    firstProductSample: reportData?.productSummaries?.[0],
    irrHistoryDataSample: irrHistoryData?.[0]
  });

  // Local state for Phase 2 enhancements
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [chartType, setChartType] = useState<ChartType>('line');
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [showAllFunds, setShowAllFunds] = useState(false);

  // Formatting services from Phase 1 (moved up to fix hooks ordering)
  const { formatCurrencyWithZeroToggle, updateOptions } = useReportFormatter();

  // MOVED: Memoize expensive prop calculations to prevent infinite re-renders (moved before early returns)
  const memoizedProductIds = useMemo(
    () => reportData?.productSummaries?.map(p => p.id) || [],
    [reportData?.productSummaries]
  );

  const memoizedSelectedDates = useMemo(
    () => reportData?.availableHistoricalIRRDates?.map(d => d.date) || [],
    [reportData?.availableHistoricalIRRDates]
  );

  // Add CSS for IRR history table column alignment and widths
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      /* IRR History Tables - Fixed column widths for vertical alignment */
      .irr-history-table {
        table-layout: fixed !important;
        width: 100% !important;
      }
      
      .irr-history-table th,
      .irr-history-table td {
        word-wrap: break-word !important;
        overflow-wrap: break-word !important;
      }
      
      /* Fund Name column - 25% width for ~40 characters */
      .irr-history-table th:nth-child(1) {
        width: 25% !important;
        text-align: left !important;
        max-width: 0 !important;
        white-space: nowrap !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
      }
      
      .irr-history-table td:nth-child(1) {
        width: 25% !important;
        text-align: left !important;
        max-width: 0 !important;
        white-space: nowrap !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
      }
      
      /* Risk column - 5% width (thinner) */
      .irr-history-table th:nth-child(2) {
        width: 5% !important;
        text-align: right !important;
      }
      
      .irr-history-table td:nth-child(2) {
        width: 5% !important;
        text-align: right !important;
      }
      
      /* Current Average Return column - 8% width */
      .irr-history-table th:nth-child(3) {
        width: 8% !important;
        text-align: right !important;
      }
      
      .irr-history-table td:nth-child(3) {
        width: 8% !important;
        text-align: right !important;
      }
      
      /* Historical IRR columns - distribute remaining 62% evenly */
      .irr-history-table th:nth-child(n+4) {
        width: 6.2% !important;
        text-align: right !important;
        padding-right: 8px !important;
      }
      
      .irr-history-table td:nth-child(n+4) {
        width: 6.2% !important;
        text-align: right !important;
        padding-right: 8px !important;
      }
      
      /* Print-specific styles */
      @media print {
        .irr-history-table {
          font-size: 9px !important;
        }
        
        .irr-history-table th,
        .irr-history-table td {
          font-size: 8px !important;
          line-height: 1.0 !important;
          padding: 1px 2px !important;
        }
        
        /* Ensure Fund Name column wraps properly in print */
        .irr-history-table th:nth-child(1),
        .irr-history-table td:nth-child(1) {
          white-space: normal !important;
          overflow: visible !important;
          text-overflow: clip !important;
        }
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Update formatter options when hideZeros state changes (same pattern as SummaryTab)
  useEffect(() => {
    updateOptions({
      hideZeros,
      visualSigning: false, // IRRHistoryTab doesn't use visual signing
      formatWithdrawalsAsNegative: false
    });
  }, [hideZeros, updateOptions]);

  const loadingIrrHistory = loading.irrHistory;

  // Get custom titles from state manager
  const {
    state: { customTitles }
  } = useReportStateManager();

  // Generate product title (simple function to avoid useCallback complexity)
  const getProductTitle = (product: ProductPeriodSummary | undefined): string => {
    if (!product) return 'Unknown Product';
    return generateEffectiveProductTitle(product, customTitles);
  };

  // Process chart data for visualization
  const chartData = useMemo(() => {
    if (!irrHistoryData || irrHistoryData.length === 0) return [];

    // Organize products first (inline to avoid dependency issues)
    const productTypeOrder = [
      'ISAs', 'GIAs', 'Onshore Bonds', 'Offshore Bonds', 'Pensions', 'Other'
    ];

    const groupedProducts: { [key: string]: any[] } = {};
    reportData.productSummaries.forEach(product => {
      const normalizedType = normalizeProductType(product.product_type);
      if (!groupedProducts[normalizedType]) {
        groupedProducts[normalizedType] = [];
      }
      groupedProducts[normalizedType].push(product);
    });

    // Sort and flatten
    const organizedProducts = productTypeOrder
      .map(type => groupedProducts[type] || [])
      .flat()
      .filter(Boolean);

    // Get all unique dates
    const allDates = new Set<string>();
    
    organizedProducts.forEach((product, index) => {
      const originalIndex = reportData.productSummaries.findIndex(p => p.id === product.id);
      const productHistory = irrHistoryData[originalIndex];
      
      if (productHistory?.portfolio_historical_irr) {
        productHistory.portfolio_historical_irr.forEach((record: any) => {
          allDates.add(record.irr_date);
        });
      }
    });

    // Sort dates chronologically
    const sortedDates = Array.from(allDates).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    // Create chart data points
    return sortedDates.map(date => {
      const dataPoint: any = {
        date,
        formattedDate: new Date(date).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short' 
        })
      };

      organizedProducts.forEach((product, index) => {
        const originalIndex = reportData.productSummaries.findIndex(p => p.id === product.id);
        const productHistory = irrHistoryData[originalIndex];
        
        // Generate title inline using stable custom titles
        const customTitle = stableCustomTitles.get(product.id);
        let productKey;
        if (customTitle && customTitle.trim()) {
          productKey = customTitle.trim();
        } else {
          // Standard format: Provider - Product Type - Product Owner Name (consistent with SummaryTab)
          const parts = [];
          
          if (product.provider_name) {
            parts.push(product.provider_name);
          }
          
          if (product.product_type) {
            // Simplify bond types to just "Bond"
            const simplifiedType = product.product_type.toLowerCase().includes('bond') ? 'Bond' : product.product_type;
            parts.push(simplifiedType);
          }
          
          if (product.product_owner_name) {
            // Check if the product_owner_name contains multiple names (comma-separated or other delimiters)
            const ownerNames = product.product_owner_name.split(/[,&]/).map((name: string) => name.trim());
            if (ownerNames.length > 1) {
              // For multiple owners, show "Joint"
              parts.push('Joint');
            } else {
              // For single owner, extract just the nickname (first word)
              const nameParts = product.product_owner_name.trim().split(' ');
              const nickname = nameParts[0]; // Take first part (nickname)
              parts.push(nickname);
            }
          }
          
          productKey = parts.length > 0 ? parts.join(' - ') : 'Unknown Product';
          
          // Add plan number if available
          const planNumber = extractPlanNumber(product);
          if (planNumber) {
            productKey += ` - ${planNumber}`;
          }
        }
        
        if (productHistory?.portfolio_historical_irr) {
          const record = productHistory.portfolio_historical_irr.find((r: any) => r.irr_date === date);
          if (record && record.irr_result !== null && record.irr_result !== undefined) {
            const irrValue = parseFloat(record.irr_result);
            dataPoint[productKey] = !isNaN(irrValue) ? irrValue : null;
          } else {
            dataPoint[productKey] = null;
          }
        }
      });

      return dataPoint;
    });
  }, [irrHistoryData, reportData.productSummaries, stableCustomTitles]);

  // Get products for chart selection
  const productsForChart = useMemo(() => {
    const productTypeOrder = [
      'ISAs', 'GIAs', 'Onshore Bonds', 'Offshore Bonds', 'Pensions', 'Other'
    ];

    const groupedProducts: { [key: string]: any[] } = {};
    reportData.productSummaries.forEach(product => {
      const normalizedType = normalizeProductType(product.product_type);
      if (!groupedProducts[normalizedType]) {
        groupedProducts[normalizedType] = [];
      }
      groupedProducts[normalizedType].push(product);
    });

    // Sort and flatten
    return productTypeOrder
      .map(type => groupedProducts[type] || [])
      .flat()
      .filter(Boolean);
  }, [reportData.productSummaries]);

  // Debug chart data processing
  console.log('🔍 [IRR HISTORY DEBUG] Chart data processing:', {
    chartDataLength: chartData.length,
    chartDataSample: chartData[0],
    productsForChartLength: productsForChart.length
  });

  // Toggle product selection for chart
  const toggleProductSelection = useCallback((productId: string) => {
    setSelectedProducts(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(productId)) {
        newSelection.delete(productId);
      } else {
        newSelection.add(productId);
      }
      return newSelection;
    });
  }, []);

  // Select all products
  const selectAllProducts = useCallback(() => {
    const allProductTitles = productsForChart.map(product => {
      const customTitle = stableCustomTitles.get(product.id);
      if (customTitle && customTitle.trim()) {
        return customTitle.trim();
      }
      // Standard format: Provider - Product Type - Product Owner Name [Plan Number]
      const parts = [];
      
      if (product.provider_name) {
        parts.push(product.provider_name);
      }
      
      if (product.product_type) {
        // Simplify bond types to just "Bond"
        const simplifiedType = product.product_type.toLowerCase().includes('bond') ? 'Bond' : product.product_type;
        parts.push(simplifiedType);
      }
      
      if (product.product_owner_name) {
        // Check if the product_owner_name contains multiple names (comma-separated or other delimiters)
        const ownerNames = product.product_owner_name.split(/[,&]/).map((name: string) => name.trim());
        if (ownerNames.length > 1) {
          // For multiple owners, show "Joint"
          parts.push('Joint');
        } else {
          // For single owner, extract just the nickname (first word)
          const nameParts = product.product_owner_name.trim().split(' ');
          const nickname = nameParts[0]; // Take first part (nickname)
          parts.push(nickname);
        }
      }
      
      let title = parts.length > 0 ? parts.join(' - ') : 'Unknown Product';
      
      // Add plan number if available
      const planNumber = extractPlanNumber(product);
      if (planNumber) {
        title += ` - ${planNumber}`;
      }
      
      return title;
    });
    setSelectedProducts(new Set(allProductTitles));
  }, [productsForChart, stableCustomTitles]);

  // Deselect all products
  const deselectAllProducts = useCallback(() => {
    setSelectedProducts(new Set());
  }, []);

  // Export to CSV functionality
  const exportToCSV = useCallback(() => {
    if (!irrHistoryData || irrHistoryData.length === 0) {
      alert('No IRR history data to export');
      return;
    }

    const productTypeOrder = [
      'ISAs', 'GIAs', 'Onshore Bonds', 'Offshore Bonds', 'Pensions', 'Other'
    ];

    const groupedProducts: { [key: string]: any[] } = {};
    reportData.productSummaries.forEach(product => {
      const normalizedType = normalizeProductType(product.product_type);
      if (!groupedProducts[normalizedType]) {
        groupedProducts[normalizedType] = [];
      }
      groupedProducts[normalizedType].push(product);
    });

    // Sort and flatten
    const organizedProducts = productTypeOrder
      .map(type => groupedProducts[type] || [])
      .flat()
      .filter(Boolean);

    // Get all unique dates
    const allDates = new Set<string>();
    organizedProducts.forEach((product, index) => {
      const originalIndex = reportData.productSummaries.findIndex(p => p.id === product.id);
      const productHistory = irrHistoryData[originalIndex];
      
      if (productHistory?.portfolio_historical_irr) {
        productHistory.portfolio_historical_irr.forEach((record: any) => {
          allDates.add(record.irr_date);
        });
      }
    });

    const sortedDates = Array.from(allDates).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    // Create CSV headers (inline title generation)
    const headers = ['Date', ...organizedProducts.map(product => {
      const customTitle = stableCustomTitles.get(product.id);
      if (customTitle && customTitle.trim()) {
        return customTitle.trim();
      }
      // Standard format: Provider - Product Type - Product Owner Name [Plan Number]
      const parts = [];
      
      if (product.provider_name) {
        parts.push(product.provider_name);
      }
      
      if (product.product_type) {
        // Simplify bond types to just "Bond"
        const simplifiedType = product.product_type.toLowerCase().includes('bond') ? 'Bond' : product.product_type;
        parts.push(simplifiedType);
      }
      
      if (product.product_owner_name) {
        // Check if the product_owner_name contains multiple names (comma-separated or other delimiters)
        const ownerNames = product.product_owner_name.split(/[,&]/).map((name: string) => name.trim());
        if (ownerNames.length > 1) {
          // For multiple owners, show "Joint"
          parts.push('Joint');
        } else {
          // For single owner, extract just the nickname (first word)
          const nameParts = product.product_owner_name.trim().split(' ');
          const nickname = nameParts[0]; // Take first part (nickname)
          parts.push(nickname);
        }
      }
      
      let title = parts.length > 0 ? parts.join(' - ') : 'Unknown Product';
      
      // Add plan number if available
      const planNumber = extractPlanNumber(product);
      if (planNumber) {
        title += ` - ${planNumber}`;
      }
      
      return title;
    })];

    // Create CSV data
    const csvData = sortedDates.map(date => {
      const row = [new Date(date).toLocaleDateString('en-US')];
      
      organizedProducts.forEach((product, index) => {
        const originalIndex = reportData.productSummaries.findIndex(p => p.id === product.id);
        const productHistory = irrHistoryData[originalIndex];
        
        if (productHistory?.portfolio_historical_irr) {
          const record = productHistory.portfolio_historical_irr.find((r: any) => r.irr_date === date);
          if (record && record.irr_result !== null && record.irr_result !== undefined) {
            const irrValue = parseFloat(record.irr_result);
            row.push(!isNaN(irrValue) ? formatIrrWithPrecision(irrValue) : 'N/A');
          } else {
            row.push('N/A');
          }
        } else {
          row.push('N/A');
        }
      });
      
      return row;
    });

    // Convert to CSV format
    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    // Create download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    const date = new Date().toISOString().split('T')[0];
    link.setAttribute('download', `IRR_History_Export_${date}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [irrHistoryData, reportData.productSummaries, stableCustomTitles]);

  // Generate dynamic colors for chart lines
  const generateColor = useCallback((index: number) => {
    const colors = [
      '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
      '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'
    ];
    return colors[index % colors.length];
  }, []);

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900 mb-2">{label}</p>
                     {payload.map((entry: any, index: number) => (
             <p key={index} className="text-sm" style={{ color: entry.color }}>
                               {entry.dataKey}: {entry.value ? formatIrrWithPrecision(entry.value) : 'N/A'}
             </p>
           ))}
        </div>
      );
    }
    return null;
  };

  // Calculate Previous Funds IRR using standardized endpoint
  const calculatePreviousFundsIRR = async (inactiveFundIds: number[], irrDate: string): Promise<number | null> => {
    try {
      console.log(`🔄 [Previous Funds IRR] Calculating for date ${irrDate} with fund IDs:`, inactiveFundIds);
      
      // Convert date format to YYYY-MM-DD as expected by API
      let fullIrrDate = irrDate;
      if (irrDate && typeof irrDate === 'string') {
        if (irrDate.length === 7) { // Format: YYYY-MM
          const [year, month] = irrDate.split('-');
          const lastDayOfMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
          fullIrrDate = `${year}-${month}-${lastDayOfMonth.toString().padStart(2, '0')}`;
        } else if (irrDate.includes('T')) {
          // Convert ISO format (YYYY-MM-DDTHH:MM:SS) to YYYY-MM-DD
          fullIrrDate = irrDate.split('T')[0];
        }
      }
      
      console.log(`🔄 [Previous Funds IRR] Using full date: ${fullIrrDate}`);
      
      // Call the standardized multiple portfolio funds IRR endpoint
      const response = await api.post('/portfolio_funds/multiple/irr', {
        portfolio_fund_ids: inactiveFundIds,
        irr_date: fullIrrDate
      });
      
      console.log(`🔄 [Previous Funds IRR] API Response for ${irrDate}:`, response.data);
      
      // Fix: Properly handle zero values - only convert undefined to null
      const irrResult = response.data?.irr_percentage !== undefined ? response.data.irr_percentage : null;
      return irrResult;
    } catch (error) {
      console.error(`❌ [Previous Funds IRR] Error calculating for ${irrDate}:`, error);
      return null;
    }
  };

  // Effect to calculate Previous Funds IRR when data is available
  useEffect(() => {
    const calculateAllPreviousFundsIRR = async () => {
      if (!irrHistoryData || irrHistoryData.length === 0) return;
      
      const newPreviousFundsIRRData = new Map<string, Map<string, number | null>>();
      const completedProducts = new Set<number>();
      
      for (const productHistory of irrHistoryData) {
        // Skip if already calculated for this product
        if (previousFundsCalculationComplete.has(productHistory.product_id)) {
          continue;
        }
        
        const inactiveFunds = productHistory.funds_historical_irr?.filter((fund: any) => 
          fund.fund_status === 'inactive') || [];
        
        if (inactiveFunds.length > 0) {
          console.log(`🔄 [Previous Funds] Calculating IRR for product ${productHistory.product_id} with ${inactiveFunds.length} inactive funds`);
          
          // Extract portfolio fund IDs from inactive funds
          const inactiveFundIds = inactiveFunds
            .map((fund: any) => fund.portfolio_fund_id)
            .filter((id: any) => id !== null && id !== undefined);
          
          if (inactiveFundIds.length > 0) {
            // Get all unique dates from the historical IRR data
            const allDates = new Set<string>();
            inactiveFunds.forEach((fund: any) => {
              if (fund.historical_irr) {
                fund.historical_irr.forEach((record: any) => {
                  allDates.add(record.irr_date);
                });
              }
            });
            
            const sortedDates = Array.from(allDates).sort();
            const productIRRMap = new Map<string, number | null>();
            
            // Calculate IRR for each date
            for (const date of sortedDates) {
              const irrResult = await calculatePreviousFundsIRR(inactiveFundIds, date);
              productIRRMap.set(date, irrResult);
            }
            
            newPreviousFundsIRRData.set(`product_${productHistory.product_id}`, productIRRMap);
            completedProducts.add(productHistory.product_id);
          }
        }
      }
      
      // Update state if we have new data
      if (newPreviousFundsIRRData.size > 0) {
        setPreviousFundsIRRData(prev => {
          const updated = new Map(prev);
          newPreviousFundsIRRData.forEach((value, key) => {
            updated.set(key, value);
          });
          return updated;
        });
        
        setPreviousFundsCalculationComplete(prev => {
          const updated = new Set(prev);
          completedProducts.forEach(id => updated.add(id));
          return updated;
        });
      }
    };
    
    calculateAllPreviousFundsIRR();
  }, [irrHistoryData]); // Only depend on irrHistoryData

  // Show loading state if data is being loaded
  if (loadingIrrHistory) {
    return (
      <div className="irr-history-section print:block print:mt-8">
        <div className="flex items-center justify-center py-12">
        <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading IRR history data...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show no data message if no IRR history data is available
  if (!irrHistoryData || irrHistoryData.length === 0) {
    return (
      <div className="irr-history-section print:block print:mt-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">History</h2>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <p className="text-yellow-700 mb-2">No IRR history data available</p>
          <p className="text-sm text-yellow-600">
            This may be because the portfolios are too new or historical IRR data hasn't been calculated yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="irr-history-section print:block print:mt-8 report-section" id="irr-history-tab-panel" role="tabpanel" aria-labelledby="history-tab">
      {/* Header with controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">History</h2>
        
        <div className="flex items-center gap-4 print-hide">
          {/* View Mode Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'table'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <TableCellsIcon className="h-4 w-4 inline mr-2" />
              Table
            </button>
            <button
              onClick={() => setViewMode('chart')}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'chart'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <ChartBarIcon className="h-4 w-4 inline mr-2" />
              Chart
            </button>
          </div>

          {/* Export Button */}
          <button
            onClick={exportToCSV}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <ArrowDownTrayIcon className="h-4 w-4 inline mr-2" />
            Export CSV
          </button>
        </div>
      </div>
      
      {/* Chart View */}
      {viewMode === 'chart' && (
        <div className="mb-8 irr-history-chart print-hide">
          {/* Chart Controls */}
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              {/* Chart Type Toggle */}
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-gray-700">Chart Type:</span>
                <div className="flex bg-white rounded-lg p-1 border">
                  <button
                    onClick={() => setChartType('line')}
                    className={`px-3 py-1 rounded text-sm ${
                      chartType === 'line'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Line
                  </button>
                  <button
                    onClick={() => setChartType('area')}
                    className={`px-3 py-1 rounded text-sm ${
                      chartType === 'area'
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Area
                  </button>
                </div>
              </div>

              {/* Product Selection Controls */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">Products:</span>
                <button
                  onClick={selectAllProducts}
                  className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                >
                  <EyeIcon className="h-3 w-3 inline mr-1" />
                  All
                </button>
                <button
                  onClick={deselectAllProducts}
                  className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                >
                  <EyeSlashIcon className="h-3 w-3 inline mr-1" />
                  None
                </button>
                <span className="text-xs text-gray-500">
                  ({selectedProducts.size} selected)
                </span>
              </div>
            </div>

            {/* Product Selection Grid */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 product-selection-grid">
              {productsForChart.map((product, index) => {
                const productTitle = getProductTitle(product);
                const isSelected = selectedProducts.has(productTitle);
                return (
                  <label
                    key={product.id}
                    className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                      isSelected ? 'bg-blue-50 border border-blue-200' : 'bg-white border border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleProductSelection(productTitle)}
                      className="rounded"
                    />
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: generateColor(index) }}
                    />
                    <span className="text-sm text-gray-700 truncate">
                      {productTitle}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Chart Display */}
          {selectedProducts.size > 0 ? (
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <ResponsiveContainer width="100%" height={400}>
                {chartType === 'line' ? (
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="formattedDate"
                      tick={{ fontSize: 12 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      tickFormatter={formatChartTick}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    {Array.from(selectedProducts).map((productTitle, index) => (
                      <Line
                        key={productTitle}
                        type="monotone"
                        dataKey={productTitle}
                        stroke={generateColor(index)}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        connectNulls={false}
                      />
                    ))}
                  </LineChart>
                ) : (
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="formattedDate"
                      tick={{ fontSize: 12 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      tickFormatter={formatChartTick}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    {Array.from(selectedProducts).map((productTitle, index) => (
                      <Area
                        key={productTitle}
                        type="monotone"
                        dataKey={productTitle}
                        stackId="1"
                        stroke={generateColor(index)}
                        fill={generateColor(index)}
                        fillOpacity={0.6}
                      />
                    ))}
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Select products above to view chart</p>
            </div>
          )}
        </div>
      )}

      {/* Table View */}
      <div className={`mb-8 irr-history-table ${viewMode === 'table' ? '' : 'hidden print:block'}`}>
        {(() => {
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
                groupedProducts[type] = sortProductsByOwnerOrder(groupedProducts[type], reportData.productOwnerOrder || []);
              } else {
                // Standard sorting by custom product owner order for other product types
                groupedProducts[type] = sortProductsByOwnerOrder(groupedProducts[type], reportData.productOwnerOrder || []);
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
          
          // Use the same organization as SummaryTab
          const organizedProducts = organizeProductsByType(reportData.productSummaries);
          
          // Filter out inactive products when checkbox is unchecked
          const filteredProducts = organizedProducts.filter(product => {
            if (product.status === 'inactive') {
              // Only show inactive products if:
              // 1. showInactiveProducts is true globally, OR
              // 2. this specific product is checked in showInactiveProductDetails
              const shouldShow = reportData.showInactiveProducts || showInactiveProductDetails.has(product.id);
              
              console.log(`🔍 [IRR HISTORY FILTER DEBUG] Product ${product.id} (${product.product_name}):`, {
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
          });
          
          console.log(`📊 [IRR HISTORY DEBUG] Filtered products:`, {
            totalProducts: organizedProducts.length,
            filteredProducts: filteredProducts.length,
            inactiveProducts: organizedProducts.filter(p => p.status === 'inactive').length,
            showInactiveProducts: reportData.showInactiveProducts,
            showInactiveProductDetails: Array.from(showInactiveProductDetails),
            originalIds: organizedProducts.map(p => p.id),
            filteredIds: filteredProducts.map(p => p.id)
          });
          
          // ✅ GLOBAL DATE CALCULATION - Calculate dates across ALL products first
          const globalAllDates = new Set<string>();
          
          // Collect ALL dates from ALL products
          irrHistoryData.forEach((productHistory) => {
            // Add portfolio IRR dates
            if (productHistory.portfolio_historical_irr) {
              productHistory.portfolio_historical_irr.forEach((record: any) => {
                globalAllDates.add(record.irr_date);
              });
            }
            
            // Add fund IRR dates
            if (productHistory.funds_historical_irr) {
              productHistory.funds_historical_irr.forEach((fund: any) => {
                if (fund.historical_irr) {
                  fund.historical_irr.forEach((record: any) => {
                    globalAllDates.add(record.irr_date);
                  });
                }
              });
            }
          });
          
          // Sort all global dates (most recent first for display)
          const globalSortedDates = Array.from(globalAllDates).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
          
          // Get the global set of historical dates (excluding current which is first)
          // Take at least 8 columns with most recent dates first
          const globalHistoricalDates = globalSortedDates.slice(1, Math.max(9, globalSortedDates.length)); // Skip first (current) and take next dates
          
          console.log(`🌍 [GLOBAL DATES DEBUG] Calculated global historical dates:`, {
            totalGlobalDates: globalAllDates.size,
            allGlobalDatesArray: Array.from(globalAllDates),
            globalHistoricalDates,
            historicalDateCount: globalHistoricalDates.length
          });
          
          return filteredProducts.map((product: ProductPeriodSummary, index: number) => {
            // Find the corresponding IRR history data for this product
            const productHistory = irrHistoryData.find((ph: any) => ph.product_id === product.id);
            
            console.log(`🔍 [IRR HISTORY DEBUG] Processing product ${index}:`, {
              productId: product.id,
              productName: product.product_name,
              hasProduct: !!product,
              hasProductHistory: !!productHistory,
              productHistoryStructure: productHistory ? Object.keys(productHistory) : 'N/A'
            });
            
            if (!productHistory) {
              console.log(`⚠️ [IRR HISTORY DEBUG] No product history for product ${product.id}`);
              return null;
            }

            // ✅ USE GLOBAL DATES for all products (not per-product calculation)
            const sortedDates = globalHistoricalDates;
            
            console.log(`🔍 [IRR HISTORY DEBUG] Product ${productHistory.product_id} using GLOBAL dates:`, {
              productId: productHistory.product_id,
              globalHistoricalDates: sortedDates,
              globalDateCount: sortedDates.length
            });
            
            // Create lookup maps for quick access
            const portfolioIrrMap = new Map();
            if (productHistory.portfolio_historical_irr) {
              productHistory.portfolio_historical_irr.forEach((record: any) => {
                portfolioIrrMap.set(record.irr_date, record.irr_result);
              });
            }
            
            // Build fund-level IRR maps from portfolio_fund_irr_values table data
            const fundIrrMaps = new Map();
            if (productHistory.funds_historical_irr) {
              productHistory.funds_historical_irr.forEach((fund: any) => {
                const fundMap = new Map();
                if (fund.historical_irr) {
                  // Store ALL historical IRR data for this fund (table contains all dates)
                  fund.historical_irr.forEach((record: any) => {
                    fundMap.set(record.irr_date, record.irr_result);
                  });
                  
                  console.log(`💰 [FUND IRR DEBUG] Fund ${fund.fund_name} (ID: ${fund.portfolio_fund_id}):`, {
                    totalRecords: fund.historical_irr.length,
                    selectedDatesCount: sortedDates.length,
                    recordsForSelectedDates: sortedDates.map(date => ({
                      date: date,
                      irr: fundMap.get(date),
                      hasData: fundMap.has(date)
                    })),
                    dataSource: 'portfolio_fund_irr_values table'
                  });
                }
                fundIrrMaps.set(fund.portfolio_fund_id, fundMap);
              });
            }

            return (
              <div 
                key={index} 
                className={`mb-8 bg-white shadow-sm rounded-lg border border-gray-200 p-6 w-full product-card print-clean ${product?.status === 'inactive' ? 'opacity-60 bg-gray-50' : ''}`}
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
                    {getProductTitle(product)}
                    {product?.status === 'inactive' && (
                      <span className="ml-2 text-sm text-red-600 font-medium">(Lapsed)</span>
                    )}
                  </h3>
                </div>

                <div className="overflow-x-auto product-table">
                  <table className="w-full table-fixed divide-y divide-gray-300 landscape-table irr-history-table">
                    <thead className="bg-gray-100">
                      <tr>
                        <th scope="col" className="px-2 py-2 text-left text-[10px] font-semibold text-gray-700 uppercase tracking-wide">
                          Fund Name
                        </th>
                        <th scope="col" className="px-2 py-2 text-center text-[10px] font-semibold text-gray-700 uppercase tracking-wide">
                          Current "Risk" 1-7 scale, (7 High)
                        </th>
                        <th scope="col" className="px-2 py-2 text-center text-[10px] font-semibold text-gray-700 uppercase tracking-wide bg-purple-100">
                          <div className="leading-tight">
                            Current Average<br />
                            Return p.a.
                          </div>
                        </th>
                        {sortedDates.map((date) => (
                          <th key={date} scope="col" className="px-2 py-2 text-left text-[10px] font-semibold text-gray-700 uppercase tracking-wide">
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
                      {(() => {
                        console.log(`🔍 [FUND ROWS DEBUG] Product ${productHistory.product_id} funds_historical_irr:`, {
                          hasFundsHistoricalIrr: !!productHistory.funds_historical_irr,
                          fundsHistoricalIrrLength: productHistory.funds_historical_irr?.length || 0,
                          fundsHistoricalIrrStructure: productHistory.funds_historical_irr ? 
                            productHistory.funds_historical_irr.map((f: any) => ({
                              fund_name: f.fund_name,
                              fund_status: f.fund_status,
                              portfolio_fund_id: f.portfolio_fund_id,
                              hasHistoricalIrr: !!f.historical_irr,
                              historicalIrrLength: f.historical_irr?.length || 0
                            })) : 'N/A'
                        });
                        
                        return productHistory.funds_historical_irr && productHistory.funds_historical_irr.length > 0;
                      })() ? (
                        (() => {
                          // Use the same logic as SummaryTab - get inactive funds from reportData.productSummaries
                          const currentProduct = reportData.productSummaries.find(p => p.id === productHistory.product_id);
                          
                          // Find inactive funds using SummaryTab logic
                          const inactiveFundsFromSummary = currentProduct?.funds?.filter((fund: any) => 
                            fund.status === 'inactive'
                          ) || [];
                          
                          // Check if Previous Funds virtual entry already exists in SummaryTab data
                          const existingPreviousFunds = currentProduct?.funds?.find((fund: any) => 
                            fund.isVirtual && fund.fund_name === 'Previous Funds'
                          );
                          
                          console.log(`🔍 [FUND STRUCTURE DEBUG] Product ${productHistory.product_id}:`, {
                            currentProductExists: !!currentProduct,
                            totalFundsInSummary: currentProduct?.funds?.length || 0,
                            inactiveFundsCount: inactiveFundsFromSummary.length,
                            existingPreviousFunds: !!existingPreviousFunds,
                            inactiveFundNames: inactiveFundsFromSummary.map((f: any) => f.fund_name),
                            existingPreviousFundsDetails: existingPreviousFunds ? {
                              name: existingPreviousFunds.fund_name,
                              isVirtual: existingPreviousFunds.isVirtual,
                              inactiveFundCount: existingPreviousFunds.inactiveFundCount
                            } : null,
                            allFundStatuses: currentProduct?.funds?.map((f: any) => ({
                              name: f.fund_name,
                              status: f.status,
                              isVirtual: f.isVirtual
                            })) || []
                          });
                          
                          // Get active funds from historical IRR data (matching current active funds)
                          const activeFunds = productHistory.funds_historical_irr.filter((histFund: any) => {
                            const correspondingFund = currentProduct?.funds?.find((summaryFund: any) => 
                              summaryFund.fund_name === histFund.fund_name && summaryFund.status !== 'inactive'
                            );
                            return !!correspondingFund;
                          });
                          
                          // Create aggregated Previous Funds entry if there are inactive funds
                          const processedFunds = [...activeFunds];
                          
                          // Check if Previous Funds entry already exists in the historical data
                          const existingPreviousFundsInHistory = processedFunds.find((fund: any) => 
                            fund.fund_name === 'Previous Funds' || fund.isVirtual
                          );
                          
                          if (inactiveFundsFromSummary.length > 0 && !existingPreviousFunds && !existingPreviousFundsInHistory) {
                            console.log(`🔍 [Previous Funds DEBUG] Product ${productHistory.product_id} has ${inactiveFundsFromSummary.length} inactive funds`);
                            
                            // Get calculated IRR data for this product
                            const productKey = `product_${productHistory.product_id}`;
                            const productPreviousFundsIRR = previousFundsIRRData.get(productKey);
                            
                            console.log(`🔍 [Previous Funds DEBUG] Product ${productHistory.product_id} calculated IRR data:`, {
                              productKey,
                              hasCalculatedData: !!productPreviousFundsIRR,
                              calculatedDataSize: productPreviousFundsIRR?.size || 0,
                              previousFundsIRRDataKeys: Array.from(previousFundsIRRData.keys()),
                              isCalculationComplete: previousFundsCalculationComplete.has(productHistory.product_id)
                            });
                            
                            // Always create Previous Funds entry, even if IRR calculation is still pending
                            // Aggregate historical IRR data manually from inactive funds
                            const aggregatedIrrMap = new Map();
                            
                            // If we have calculated data, use it; otherwise trigger async calculation
                            if (productPreviousFundsIRR && productPreviousFundsIRR.size > 0) {
                              console.log(`✅ [Previous Funds DEBUG] Using calculated aggregated IRR data for product ${productHistory.product_id}`);
                              productPreviousFundsIRR.forEach((irr, date) => {
                                aggregatedIrrMap.set(date, irr);
                              });
                            } else {
                              // Trigger async calculation of aggregated IRR for historical dates
                              console.log(`🔍 [Previous Funds DEBUG] Triggering async aggregated IRR calculation for inactive funds`);
                              
                              // Get portfolio fund IDs from inactive funds
                              const inactiveFundIds = inactiveFundsFromSummary
                                .map((fund: any) => fund.portfolio_fund_id || fund.id)
                                .filter((id: any) => id !== null && id !== undefined);
                              
                              console.log(`🔍 [Previous Funds DEBUG] Inactive fund IDs for aggregation:`, inactiveFundIds);
                              
                              // Get all historical dates that we need to calculate for
                              const historicalDates = new Set();
                              productHistory.funds_historical_irr.forEach((fund: any) => {
                                if (fund.historical_irr) {
                                  fund.historical_irr.forEach((record: any) => {
                                    historicalDates.add(record.irr_date);
                                  });
                                }
                              });
                              
                              console.log(`🔍 [Previous Funds DEBUG] Historical dates to calculate:`, Array.from(historicalDates));
                              
                              // Trigger async calculation for each historical date
                              const calculateHistoricalAggregatedIRR = async () => {
                                const productKey = `product_${productHistory.product_id}`;
                                const dateIrrMap = new Map();
                                
                                for (const date of Array.from(historicalDates)) {
                                  try {
                                    // Convert date format to YYYY-MM-DD as expected by API
                                    let fullIrrDate = date;
                                    if (date && typeof date === 'string') {
                                      if (date.match(/^\d{4}-\d{2}$/)) {
                                        // Convert YYYY-MM to YYYY-MM-DD
                                        fullIrrDate = `${date}-01`;
                                      } else if (date.includes('T')) {
                                        // Convert ISO format (YYYY-MM-DDTHH:MM:SS) to YYYY-MM-DD
                                        fullIrrDate = date.split('T')[0];
                                      }
                                    }
                                    
                                    console.log(`🔍 [Previous Funds DEBUG] Calculating aggregated IRR for ${date}`);
                                    
                                    const response = await api.post('/portfolio_funds/multiple/irr', {
                                      portfolio_fund_ids: inactiveFundIds,
                                      irr_date: fullIrrDate
                                    });
                                    
                                    if (response.data.success && response.data.irr_percentage !== null) {
                                      console.log(`✅ [Previous Funds DEBUG] Calculated aggregated IRR for ${date}: ${response.data.irr_percentage}%`);
                                      dateIrrMap.set(date, response.data.irr_percentage);
                                    } else {
                                      console.log(`❌ [Previous Funds DEBUG] Failed to calculate IRR for ${date}:`, response.data);
                                    }
                                  } catch (error) {
                                    console.log(`❌ [Previous Funds DEBUG] Error calculating IRR for ${date}:`, error);
                                  }
                                }
                                
                                // Update the previousFundsIRRData state with calculated values
                                setPreviousFundsIRRData(prev => {
                                  const updated = new Map(prev);
                                  updated.set(productKey, dateIrrMap);
                                  return updated;
                                });
                                
                                // Mark calculation as complete
                                setPreviousFundsCalculationComplete(prev => {
                                  const updated = new Set(prev);
                                  updated.add(productHistory.product_id);
                                  return updated;
                                });
                                
                                console.log(`✅ [Previous Funds DEBUG] Completed aggregated IRR calculations for product ${productHistory.product_id}`);
                              };
                              
                              // Start calculation if not already running
                              if (!previousFundsCalculationComplete.has(productHistory.product_id)) {
                                calculateHistoricalAggregatedIRR();
                              }
                              
                              // For now, use empty aggregated map (will be populated by async calculation)
                              // This will trigger a re-render when the calculation completes
                            }
                            
                            console.log(`🔍 [Previous Funds DEBUG] Product ${productHistory.product_id} aggregated IRR map size:`, aggregatedIrrMap.size);
                            
                            // Create Previous Funds entry
                            const previousFundsEntry = {
                              portfolio_fund_id: 'previous_funds',
                              fund_name: 'Previous Funds',
                              fund_status: 'inactive',
                              risk_factor: null,
                              isin_number: null,
                              historical_irr: Array.from(aggregatedIrrMap.entries()).map(([date, irr]) => ({
                                irr_date: date,
                                irr_result: irr
                              })),
                              isVirtual: true,
                              inactiveFundCount: inactiveFundsFromSummary.length
                            };
                            
                            // Note: fundIrrMaps.set removed to prevent infinite re-render loop
                            // Previous Funds IRR data will be accessed directly from previousFundsIRRData state
                            
                            processedFunds.push(previousFundsEntry);
                            
                            console.log(`✅ [Previous Funds DEBUG] Added Previous Funds entry for product ${productHistory.product_id} with ${aggregatedIrrMap.size} historical dates`);
                          } else if (existingPreviousFunds && !existingPreviousFundsInHistory) {
                            // If Previous Funds entry already exists in SummaryTab data, use it
                            console.log(`✅ [Previous Funds DEBUG] Using existing Previous Funds entry for product ${productHistory.product_id}`);
                            
                            // Create IRR data from existing aggregated data if available
                            const previousFundsEntry = {
                              portfolio_fund_id: 'previous_funds',
                              fund_name: 'Previous Funds',
                              fund_status: 'inactive',
                              risk_factor: null,
                              isin_number: null,
                              historical_irr: [], // Will be populated with aggregated data
                              isVirtual: true,
                              inactiveFundCount: existingPreviousFunds.inactiveFundCount || 0
                            };
                            
                            // Note: fundIrrMaps.set removed to prevent infinite re-render loop
                            // Previous Funds IRR data will be accessed directly from previousFundsIRRData state
                            processedFunds.push(previousFundsEntry);
                          } else if (existingPreviousFundsInHistory) {
                            console.log(`🔍 [Previous Funds DEBUG] Previous Funds entry already exists in historical data for product ${productHistory.product_id} - calculating IRR values`);
                            
                            // Even though Previous Funds entry exists, we need to calculate its IRR values for each historical date
                            const inactiveFundsFromSummary: any[] = currentProduct?.funds?.filter((fund: any) => 
                              fund.status === 'inactive'
                            ) || [];
                            
                            console.log(`🔍 [Previous Funds DEBUG] Product ${productHistory.product_id} inactive funds detection:`, {
                              currentProductFunds: currentProduct?.funds?.length || 0,
                              currentProductFundsDetails: currentProduct?.funds?.map((f: any) => ({
                                name: f.fund_name,
                                status: f.status,
                                isVirtual: f.isVirtual,
                                portfolioFundId: f.portfolio_fund_id || f.id
                              })) || [],
                              inactiveFundsFromSummary: inactiveFundsFromSummary.length,
                              inactiveFundsDetails: inactiveFundsFromSummary.map((f: any) => ({
                                name: f.fund_name,
                                portfolioFundId: f.portfolio_fund_id || f.id
                              })),
                              existingPreviousFunds: existingPreviousFunds ? {
                                name: existingPreviousFunds.fund_name,
                                isVirtual: existingPreviousFunds.isVirtual,
                                inactiveFundCount: existingPreviousFunds.inactiveFundCount,
                                portfolioFundIds: (existingPreviousFunds as any).portfolioFundIds
                              } : null
                            });
                            
                            // Look for Previous Funds entry in historical data itself
                            const historicalPreviousFunds = productHistory.funds_historical_irr?.find((fund: any) => 
                              fund.fund_name === 'Previous Funds' || fund.isVirtual
                            );
                            
                            // Enhanced debugging with JSON.stringify to see full object content
                            if (historicalPreviousFunds) {
                              console.log(`🔍 [Previous Funds DEBUG] Historical Previous Funds FULL OBJECT:`, JSON.stringify(historicalPreviousFunds, null, 2));
                              console.log(`🔍 [Previous Funds DEBUG] Historical Previous Funds properties:`, Object.keys(historicalPreviousFunds));
                            }
                            
                            if (existingPreviousFunds) {
                              console.log(`🔍 [Previous Funds DEBUG] Existing Previous Funds FULL OBJECT:`, JSON.stringify(existingPreviousFunds, null, 2));
                              console.log(`🔍 [Previous Funds DEBUG] Existing Previous Funds properties:`, Object.keys(existingPreviousFunds));
                            }
                            
                            // Also log all historical funds for comparison
                            console.log(`🔍 [Previous Funds DEBUG] All Historical Funds:`, 
                              JSON.stringify(productHistory.funds_historical_irr?.map((f: any) => ({
                                name: f.fund_name,
                                portfolio_fund_id: f.portfolio_fund_id,
                                isVirtual: f.isVirtual,
                                fund_id: f.fund_id,
                                allKeys: Object.keys(f)
                              })) || [], null, 2)
                            );
                            
                            // Try to get portfolio fund IDs from multiple sources
                            let portfolioFundIds = [];
                            
                            // First, try from inactive funds in summary
                            if (inactiveFundsFromSummary.length > 0) {
                              portfolioFundIds = inactiveFundsFromSummary
                                .map((fund: any) => fund.portfolio_fund_id || fund.id)
                                .filter((id: any) => id !== null && id !== undefined && id > 0);
                              console.log(`✅ [Previous Funds DEBUG] Found ${portfolioFundIds.length} portfolio fund IDs from inactive funds in summary`);
                            }
                            
                            // Check if historical Previous Funds entry already has IRR data we can use
                            if (portfolioFundIds.length === 0 && historicalPreviousFunds && historicalPreviousFunds.historical_irr && historicalPreviousFunds.historical_irr.length > 0) {
                              console.log(`✅ [Previous Funds DEBUG] Using existing IRR data from historical Previous Funds entry`);
                              
                              // Use the existing historical IRR data directly
                              const aggregatedIrrMap = new Map();
                              historicalPreviousFunds.historical_irr.forEach((record: any) => {
                                if (record.irr_date && record.irr_result !== null && record.irr_result !== undefined) {
                                  aggregatedIrrMap.set(record.irr_date, record.irr_result);
                                }
                              });
                              
                              console.log(`✅ [Previous Funds DEBUG] Loaded ${aggregatedIrrMap.size} historical IRR values from existing Previous Funds entry:`, 
                                Array.from(aggregatedIrrMap.entries()).map(([date, irr]) => ({ date, irr }))
                              );
                              
                              // Note: fundIrrMaps.set removed to prevent infinite re-render loop
                              // Previous Funds IRR data will be accessed directly from previousFundsIRRData state
                              
                              console.log(`✅ [Previous Funds DEBUG] Using existing historical IRR data for Previous Funds - no API calculation needed`);
                              
                              // Skip the portfolio fund ID search since we already have the calculated data
                              portfolioFundIds = []; // Set to empty to skip further calculation
                            }
                            
                            // If no existing IRR data, try to extract from existing Previous Funds entry
                            if (portfolioFundIds.length === 0 && existingPreviousFunds) {
                              // First check for inactiveFunds array which contains the original portfolio fund IDs
                              if ((existingPreviousFunds as any).inactiveFunds && Array.isArray((existingPreviousFunds as any).inactiveFunds)) {
                                portfolioFundIds = (existingPreviousFunds as any).inactiveFunds
                                  .map((fund: any) => fund.id) // Use 'id' which is the portfolio fund ID
                                  .filter((id: any) => id !== null && id !== undefined && id > 0);
                                
                                console.log(`✅ [Previous Funds DEBUG] Found ${portfolioFundIds.length} portfolio fund IDs from inactiveFunds array:`, {
                                  portfolioFundIds,
                                  inactiveFundsDetails: (existingPreviousFunds as any).inactiveFunds.map((f: any) => ({
                                    name: f.fund_name,
                                    portfolioFundId: f.id,
                                    status: f.status
                                  }))
                                });
                              }
                              // Fallback: Check if Previous Funds entry has stored portfolio fund IDs
                              else if ((existingPreviousFunds as any).portfolioFundIds && Array.isArray((existingPreviousFunds as any).portfolioFundIds)) {
                                portfolioFundIds = (existingPreviousFunds as any).portfolioFundIds;
                                console.log(`✅ [Previous Funds DEBUG] Found ${portfolioFundIds.length} portfolio fund IDs from portfolioFundIds property`);
                              } 
                              // Last resort: Search historical data for missing funds
                              else if (existingPreviousFunds.inactiveFundCount && existingPreviousFunds.inactiveFundCount > 0) {
                                console.log(`🔍 [Previous Funds DEBUG] Previous Funds indicates ${existingPreviousFunds.inactiveFundCount} inactive funds, searching historical data...`);
                                
                                // Look for funds in historical data that aren't in current active funds
                                const activeFundNames = currentProduct?.funds?.filter((f: any) => f.status !== 'inactive').map((f: any) => f.fund_name) || [];
                                const historicalFundNames = productHistory.funds_historical_irr?.map((f: any) => f.fund_name) || [];
                                const potentialInactiveFunds = productHistory.funds_historical_irr?.filter((f: any) => 
                                  !activeFundNames.includes(f.fund_name) && f.fund_name !== 'Previous Funds'
                                ) || [];
                                
                                portfolioFundIds = potentialInactiveFunds
                                  .map((fund: any) => fund.portfolio_fund_id)
                                  .filter((id: any) => id !== null && id !== undefined);
                                
                                console.log(`🔍 [Previous Funds DEBUG] Found potential inactive funds from historical data:`, {
                                  activeFundNames,
                                  historicalFundNames,
                                  potentialInactiveFunds: potentialInactiveFunds.map((f: any) => ({ name: f.fund_name, portfolioFundId: f.portfolio_fund_id })),
                                  extractedPortfolioFundIds: portfolioFundIds
                                });
                              }
                            }
                            
                            console.log(`🔍 [Previous Funds DEBUG] Final portfolio fund IDs for aggregation:`, portfolioFundIds);
                            
                            if (portfolioFundIds.length > 0) {
                              // Get calculated IRR data for this product
                              const productKey = `product_${productHistory.product_id}`;
                              const productPreviousFundsIRR = previousFundsIRRData.get(productKey);
                              
                              console.log(`🔍 [Previous Funds DEBUG] Product ${productHistory.product_id} existing calculated IRR data:`, {
                                productKey,
                                hasCalculatedData: !!productPreviousFundsIRR,
                                calculatedDataSize: productPreviousFundsIRR?.size || 0,
                                isCalculationComplete: previousFundsCalculationComplete.has(productHistory.product_id)
                              });
                              
                              // Create aggregated IRR map
                              const aggregatedIrrMap = new Map();
                              
                              if (productPreviousFundsIRR && productPreviousFundsIRR.size > 0) {
                                console.log(`✅ [Previous Funds DEBUG] Using existing calculated aggregated IRR data for product ${productHistory.product_id}`);
                                productPreviousFundsIRR.forEach((irr, date) => {
                                  aggregatedIrrMap.set(date, irr);
                                });
                              } else {
                                // Trigger async calculation of aggregated IRR for historical dates
                                console.log(`🔍 [Previous Funds DEBUG] Triggering async aggregated IRR calculation for existing Previous Funds entry`);
                                
                                console.log(`🔍 [Previous Funds DEBUG] Portfolio fund IDs for aggregation:`, portfolioFundIds);
                                
                                // Get all historical dates that we need to calculate for
                                const historicalDates = new Set();
                                productHistory.funds_historical_irr.forEach((fund: any) => {
                                  if (fund.historical_irr) {
                                    fund.historical_irr.forEach((record: any) => {
                                      historicalDates.add(record.irr_date);
                                    });
                                  }
                                });
                                
                                console.log(`🔍 [Previous Funds DEBUG] Historical dates to calculate for existing entry:`, Array.from(historicalDates));
                                
                                // Trigger async calculation for each historical date
                                const calculateHistoricalAggregatedIRR = async () => {
                                  const productKey = `product_${productHistory.product_id}`;
                                  const dateIrrMap = new Map();
                                  
                                  for (const date of Array.from(historicalDates)) {
                                    try {
                                      // Convert date format to YYYY-MM-DD as expected by API
                                      let fullIrrDate = date;
                                      if (date && typeof date === 'string') {
                                        if (date.match(/^\d{4}-\d{2}$/)) {
                                          // Convert YYYY-MM to YYYY-MM-DD
                                          fullIrrDate = `${date}-01`;
                                        } else if (date.includes('T')) {
                                          // Convert ISO format (YYYY-MM-DDTHH:MM:SS) to YYYY-MM-DD
                                          fullIrrDate = date.split('T')[0];
                                        }
                                      }
                                      
                                      console.log(`🔍 [Previous Funds DEBUG] Calculating aggregated IRR for existing entry ${date} with fund IDs:`, portfolioFundIds);
                                      
                                      const response = await api.post('/portfolio_funds/multiple/irr', {
                                        portfolio_fund_ids: portfolioFundIds,
                                        irr_date: fullIrrDate
                                      });
                                      
                                      if (response.data.success && response.data.irr_percentage !== null) {
                                        console.log(`✅ [Previous Funds DEBUG] Calculated aggregated IRR for existing entry ${date}: ${response.data.irr_percentage}%`);
                                        dateIrrMap.set(date, response.data.irr_percentage);
                                      } else {
                                        console.log(`❌ [Previous Funds DEBUG] Failed to calculate IRR for existing entry ${date}:`, response.data);
                                      }
                                    } catch (error) {
                                      console.log(`❌ [Previous Funds DEBUG] Error calculating IRR for existing entry ${date}:`, error);
                                    }
                                  }
                                  
                                  // Update the previousFundsIRRData state with calculated values
                                  setPreviousFundsIRRData(prev => {
                                    const updated = new Map(prev);
                                    updated.set(productKey, dateIrrMap);
                                    return updated;
                                  });
                                  
                                  // Mark calculation as complete
                                  setPreviousFundsCalculationComplete(prev => new Set(prev).add(productHistory.product_id));
                                  
                                  console.log(`✅ [Previous Funds DEBUG] Completed aggregated IRR calculations for existing Previous Funds entry ${productHistory.product_id}`);
                                };
                                
                                // Start calculation if not already running
                                if (!previousFundsCalculationComplete.has(productHistory.product_id)) {
                                  calculateHistoricalAggregatedIRR();
                                }
                              }
                              
                              // Note: fundIrrMaps.set removed to prevent infinite re-render loop
                              // Previous Funds IRR data will be accessed directly from previousFundsIRRData state
                              
                              console.log(`✅ [Previous Funds DEBUG] Skipped fundIrrMaps update to prevent infinite re-render, data available via previousFundsIRRData with ${aggregatedIrrMap.size} historical dates`);
                            } else {
                              console.log(`❌ [Previous Funds DEBUG] No portfolio fund IDs found for Previous Funds calculation`);
                            }
                          }
                          
                          const fundRows = processedFunds.map((fund: any, fundIndex: number) => {
                            // For Previous Funds, use previousFundsIRRData state; for regular funds, use fundIrrMaps
                            let fundIrrMap: Map<string, number>;
                            if (fund.isVirtual && fund.fund_name === 'Previous Funds') {
                              const productKey = `product_${productHistory.product_id}`;
                              fundIrrMap = previousFundsIRRData.get(productKey) || new Map();
                            } else {
                              fundIrrMap = fundIrrMaps.get(fund.portfolio_fund_id) || new Map();
                            }
                            
                            return (
                              <tr key={fundIndex} className={`hover:bg-blue-50 ${fund.isVirtual ? 'bg-gray-100 font-medium' : ''}`}>
                                <td className="px-2 py-2 text-xs font-medium text-gray-800 text-left">
                                  {fund.fund_name}
                                  {fund.isVirtual && fund.inactiveFundCount && fund.fund_name !== 'Previous Funds' && (
                                    <span className="ml-2 inline-flex items-center px-1 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-800">
                                      {fund.inactiveFundCount} {fund.inactiveFundCount === 1 ? 'fund' : 'funds'}
                                </span>
                                )}
                            </td>
                            <td className="px-2 py-2 text-xs text-right">
                              {fund.risk_factor !== undefined && fund.risk_factor !== null ? (
                                    formatWeightedRisk(fund.risk_factor)
                                  ) : (
                                    <span className="text-gray-400">N/A</span>
                                  )}
                                </td>
                                <td className="px-2 py-2 text-xs text-right bg-purple-50">
                                  {(() => {
                                    // For Previous Funds, get IRR from the existing Previous Funds entry in SummaryTab data
                                    if (fund.isVirtual && fund.fund_name === 'Previous Funds') {
                                      // First check if the Previous Funds entry from SummaryTab has an IRR value
                                      if (existingPreviousFunds && existingPreviousFunds.irr !== null && existingPreviousFunds.irr !== undefined) {
                                        return (
                                          <span className={existingPreviousFunds.irr >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                                            {formatFundIrr(existingPreviousFunds.irr)}
                                          </span>
                                        );
                                      }
                                      
                                      // Fallback: look for Previous Funds in current product funds
                                      const currentProduct = reportData.productSummaries.find(p => p.id === productHistory.product_id);
                                      if (currentProduct && currentProduct.funds) {
                                        const previousFundsFromSummary = currentProduct.funds.find((f: any) => 
                                          f.isVirtual && f.fund_name === 'Previous Funds'
                                        );
                                        if (previousFundsFromSummary && previousFundsFromSummary.irr !== null && previousFundsFromSummary.irr !== undefined) {
                                          return (
                                            <span className={previousFundsFromSummary.irr >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                                              {formatFundIrr(previousFundsFromSummary.irr)}
                                            </span>
                                          );
                                        }
                                      }
                                      
                                      return <span className="text-gray-500">N/A</span>;
                                    }
                                    
                                    // Find current IRR for this fund from the main reportData
                                    const currentProduct = reportData.productSummaries.find(p => p.id === productHistory.product_id);
                                    if (currentProduct && currentProduct.funds) {
                                      const currentFund = currentProduct.funds.find((f: any) => f.fund_name === fund.fund_name);
                                      if (currentFund && currentFund.irr !== null && currentFund.irr !== undefined) {
                                        return (
                                          <span className={currentFund.irr >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                                            {formatFundIrr(currentFund.irr)}
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
                                          <span className={irrValue >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                                            {formatFundIrr(irrValue)}
                                          </span>
                                        );
                                      }
                                      return <span className="text-gray-400">-</span>;
                                    })()}
                                  </td>
                                ))}
                          </tr>
                            );
                          });

                          // Add product total row
                          const productForTotal = reportData.productSummaries.find(p => p.id === productHistory.product_id);
                          
                          // Use updated IRR from portfolioIrrValues if available, otherwise fall back to reportData
                          let productIrr = portfolioIrrValues.has(productHistory.product_id) 
                            ? portfolioIrrValues.get(productHistory.product_id) 
                            : productForTotal?.irr;
                          
                          // Debug: Log current IRR value extraction
                          console.log(`🔍 [IRR HISTORY] Product ${productHistory.product_id} current IRR debug:`, {
                            productFound: !!productForTotal,
                            rawIrrValueFromReportData: productForTotal?.irr,
                            hasUpdatedIrrInState: portfolioIrrValues.has(productHistory.product_id),
                            updatedIrrFromState: portfolioIrrValues.get(productHistory.product_id),
                            finalProductIrr: productIrr,
                            irrType: typeof productIrr,
                            isNull: productIrr === null,
                            isUndefined: productIrr === undefined,
                            isZero: productIrr === 0
                          });
                          
                                    // Calculate total weighted risk including Previous Funds
          let totalWeightedRisk: number | undefined = undefined;
          if (productForTotal && productForTotal.funds && productForTotal.funds.length > 0) {
            let totalValue = 0;
            let weightedRiskSum = 0;
            
            productForTotal.funds.forEach(fund => {
              const fundValue = fund.current_valuation || 0;
              const fundRisk = fund.risk_factor;
              
              // For Previous Funds (virtual funds), use total_investment as weight since current_valuation is 0
              if (fund.isVirtual && fund.fund_name === 'Previous Funds') {
                const previousFundsWeight = fund.total_investment || 0;
                if (previousFundsWeight > 0 && fundRisk !== undefined && fundRisk !== null) {
                  totalValue += previousFundsWeight;
                  weightedRiskSum += (previousFundsWeight * fundRisk);
                }
              } else {
                // For active funds, use current_valuation as weight
                if (fundValue > 0 && fundRisk !== undefined && fundRisk !== null) {
                  totalValue += fundValue;
                  weightedRiskSum += (fundValue * fundRisk);
                }
              }
            });
            
            if (totalValue > 0) {
              totalWeightedRisk = weightedRiskSum / totalValue;
              
              console.log(`🔍 [RISK DEBUG] Product ${productHistory.product_id} total risk calculation:`, {
                originalProductRisk: productForTotal?.weighted_risk,
                calculatedTotalRisk: totalWeightedRisk,
                fundCount: productForTotal.funds.length,
                totalValue,
                fundsIncluded: productForTotal.funds.map(f => ({
                  name: f.fund_name,
                  value: f.current_valuation,
                  risk: f.risk_factor,
                  isVirtual: f.isVirtual,
                  weight: f.isVirtual ? f.total_investment : f.current_valuation
                }))
              });
            }
          }
                          
                          // Fallback to product weighted risk if calculation fails
                          const productWeightedRisk = totalWeightedRisk !== undefined ? totalWeightedRisk : productForTotal?.weighted_risk;
                          
                          // Get historical IRR data for the product - ONLY for selected dates
                          // Data comes from portfolio_irr_values table via portfolio_historical_irr
                          
                          // Normalize selected dates to YYYY-MM-DD format for comparison
                          const normalizedSelectedDates = sortedDates.map(date => {
                            if (date.includes('T')) {
                              return date.split('T')[0];
                            } else if (date.includes(' ')) {
                              return date.split(' ')[0];
                            }
                            return date;
                          });
                          
                          const productHistoricalIrrMap = new Map<string, number>();
                          if (productHistory?.portfolio_historical_irr) {
                            console.log(`🔍 [PRODUCT IRR DEBUG] Product ${productHistory.product_id} - Raw historical IRR data:`, {
                              productId: productHistory.product_id,
                              selectedDatesFromReport: sortedDates,
                              normalizedSelectedDates: normalizedSelectedDates,
                              rawRecordCount: productHistory.portfolio_historical_irr.length,
                              rawRecords: productHistory.portfolio_historical_irr.map((r: any) => ({
                                date: r.irr_date,
                                irr: r.irr_result,
                                dataSource: 'portfolio_irr_values table'
                              })),
                              // DETAILED RAW DATA DEBUG
                              rawRecordsWithTypes: productHistory.portfolio_historical_irr.map((r: any) => ({
                                date: r.irr_date,
                                dateType: typeof r.irr_date,
                                irr: r.irr_result,
                                irrType: typeof r.irr_result,
                                irrParsed: !isNaN(parseFloat(r.irr_result)) ? parseFloat(r.irr_result) : null,
                                originalRecord: r
                              })),
                              uniqueRawIrrValues: [...new Set(productHistory.portfolio_historical_irr.map((r: any) => r.irr_result))],
                              hasVariedRawData: new Set(productHistory.portfolio_historical_irr.map((r: any) => r.irr_result)).size > 1,
                              // EXACT IRR VALUES BY DATE
                              exactIrrsByDate: productHistory.portfolio_historical_irr.reduce((acc: any, record: any) => {
                                let normalizedDate = record.irr_date;
                                if (normalizedDate.includes('T')) {
                                  normalizedDate = normalizedDate.split('T')[0];
                                } else if (normalizedDate.includes(' ')) {
                                  normalizedDate = normalizedDate.split(' ')[0];
                                }
                                acc[normalizedDate] = {
                                  rawIrr: record.irr_result,
                                  parsedIrr: !isNaN(parseFloat(record.irr_result)) ? parseFloat(record.irr_result) : null,
                                  rawDate: record.irr_date
                                };
                                return acc;
                              }, {})
                            });
                            
                            // 🚨 CRITICAL DEBUG: Check if all IRR values are actually the same
                            const allIrrValues = productHistory.portfolio_historical_irr.map((r: any) => {
                              const parsed = parseFloat(r.irr_result);
                              return !isNaN(parsed) ? parsed : null;
                            }).filter(v => v !== null);
                            const uniqueIrrValues = [...new Set(allIrrValues)];
                            if (uniqueIrrValues.length === 1) {
                              console.warn(`🚨 [DATA QUALITY WARNING] Product ${productHistory.product_id} has IDENTICAL IRR values for ALL dates:`, {
                                repeatedIrrValue: uniqueIrrValues[0],
                                dateCount: productHistory.portfolio_historical_irr.length,
                                allDatesWithSameIrr: productHistory.portfolio_historical_irr.map((r: any) => ({
                                  date: r.irr_date,
                                  irr: r.irr_result
                                })),
                                possibleIssues: [
                                  'Backend is not calculating historical IRRs correctly',
                                  'Database contains duplicate/static IRR values', 
                                  'IRR calculation service is returning current IRR for all historical dates'
                                ]
                              });
                            } else {
                              console.log(`✅ [DATA QUALITY CHECK] Product ${productHistory.product_id} has VARIED IRR values:`, {
                                uniqueIrrValues,
                                totalRecords: allIrrValues.length,
                                irrRange: {
                                  min: Math.min(...allIrrValues),
                                  max: Math.max(...allIrrValues)
                                }
                              });
                            }
                            
                            // ONLY store IRR data for the selected dates (not all historical data)
                            productHistory.portfolio_historical_irr.forEach((record: any) => {
                              // Normalize the database date format to YYYY-MM-DD
                              // Handle both formats: '2024-12-01T00:00:00' and '2024-12-01 00:00:00'
                              let normalizedDbDate = record.irr_date;
                              if (normalizedDbDate.includes('T')) {
                                normalizedDbDate = normalizedDbDate.split('T')[0];
                              } else if (normalizedDbDate.includes(' ')) {
                                normalizedDbDate = normalizedDbDate.split(' ')[0];
                              }
                              
                              // ONLY include if this date is in the normalized selected dates
                              if (normalizedSelectedDates.includes(normalizedDbDate)) {
                                const irrValue = parseFloat(record.irr_result);
                                // Store using the normalized date for consistency, but only if not NaN
                                if (!isNaN(irrValue)) {
                                  productHistoricalIrrMap.set(normalizedDbDate, irrValue);
                                }
                              }
                            });
                            
                            // Debug: Show what we actually found for selected dates
                            console.log(`🔍 [PRODUCT IRR DEBUG] Product ${productHistory.product_id} - Filtered for selected dates:`, {
                              originalSelectedDates: sortedDates,
                              normalizedSelectedDates: normalizedSelectedDates,
                              foundDates: Array.from(productHistoricalIrrMap.keys()),
                              missingDates: normalizedSelectedDates.filter(date => !productHistoricalIrrMap.has(date)),
                              selectedDateIRRs: normalizedSelectedDates.map(date => ({
                                date: date,
                                irr: productHistoricalIrrMap.get(date),
                                found: productHistoricalIrrMap.has(date)
                              })),
                              dataSource: 'portfolio_irr_values table - filtered',
                              // DETAILED IRR VALUES DEBUG
                              allIrrValues: Array.from(productHistoricalIrrMap.entries()).map(([date, irr]) => ({
                                date,
                                irr,
                                irrType: typeof irr
                              })),
                              uniqueIrrValues: [...new Set(Array.from(productHistoricalIrrMap.values()))],
                              hasDifferentIrrValues: new Set(Array.from(productHistoricalIrrMap.values())).size > 1
                            });
                            
                            // Check for date mismatches and available vs selected dates
                            if (productHistory.portfolio_historical_irr.length > 0) {
                              const availableDates = productHistory.portfolio_historical_irr.map((r: any) => {
                                let normalizedDate = r.irr_date;
                                if (normalizedDate.includes('T')) {
                                  normalizedDate = normalizedDate.split('T')[0];
                                } else if (normalizedDate.includes(' ')) {
                                  normalizedDate = normalizedDate.split(' ')[0];
                                }
                                return normalizedDate;
                              });
                              
                              const missingSelectedDates = normalizedSelectedDates.filter((date: string) => !availableDates.includes(date));
                              const availableButNotSelected = availableDates.filter((date: string) => !normalizedSelectedDates.includes(date));
                              
                              console.log(`🔍 [DATE ANALYSIS] Product ${productHistory.product_id} date comparison:`, {
                                selectedDates: normalizedSelectedDates,
                                availableDates: availableDates,
                                missingSelectedDates,
                                availableButNotSelected,
                                hasDateMismatch: missingSelectedDates.length > 0 || availableButNotSelected.length > 0
                              });
                              
                              if (missingSelectedDates.length > 0) {
                                console.warn(`⚠️ [DATE MISMATCH WARNING] Product ${productHistory.product_id} selected dates not found in database:`, {
                                  missingSelectedDates,
                                  availableDatesInDatabase: availableDates,
                                  selectedDatesFromReport: normalizedSelectedDates,
                                  availableButNotSelected,
                                  suggestion: availableButNotSelected.length > 0 ? `Consider using these available dates: ${availableButNotSelected.join(', ')}` : 'No alternative dates available'
                                });
                              }
                            }
                            
                            if (productHistoricalIrrMap.size === 0) {
                              console.warn(`⚠️ [PRODUCT IRR WARNING] Product ${productHistory.product_id} has no IRR data for any selected dates. 
Original selected dates: ${sortedDates.join(', ')}
Normalized selected dates: ${normalizedSelectedDates.join(', ')}
Available database dates: ${productHistory.portfolio_historical_irr.map((r: any) => r.irr_date).join(', ')}`);
                            }
                          }

                          const productTotalRow = (
                            <tr key="product-total" className="bg-gray-50 border-t-2 border-gray-300">
                              <td className="px-2 py-2 text-xs font-bold text-black text-left">
                                Total
                              </td>
                              <td className="px-2 py-2 text-xs font-bold text-right text-black">
                                {productWeightedRisk !== undefined && productWeightedRisk !== null ? (
                                  formatWeightedRiskConsistent(productWeightedRisk)
                                ) : (
                                  '-'
                                )}
                              </td>
                              <td className="px-2 py-2 text-xs font-bold text-right bg-purple-100 text-black">
                                {(() => {
                                  console.log(`🔍 [IRR HISTORY] Product ${productHistory.product_id} display logic:`, {
                                    productIrr,
                                    isNotNull: productIrr !== null,
                                    isNotUndefined: productIrr !== undefined,
                                    bothChecksPass: productIrr !== null && productIrr !== undefined,
                                    willShowValue: productIrr !== null && productIrr !== undefined
                                  });
                                  
                                  if (productIrr !== null && productIrr !== undefined) {
                                    return formatIrrWithPrecision(productIrr);
                                  } else {
                                    return '-';
                                  }
                                })()}
                              </td>
                              {sortedDates.map((date, index) => {
                                // Get the corresponding normalized date for lookup
                                const normalizedDate = normalizedSelectedDates[index];
                                return (
                                  <td key={date} className="px-2 py-2 text-xs font-bold text-left text-black">
                                    {(() => {
                                      const historicalIrr = productHistoricalIrrMap.get(normalizedDate);
                                      if (historicalIrr !== null && historicalIrr !== undefined) {
                                        return formatIrrWithPrecision(historicalIrr);
                                      }
                                      return '-';
                                    })()}
                                  </td>
                                );
                              })}
                            </tr>
                          );

                          return [...fundRows, productTotalRow];
                        })()
                      ) : (
                        <tr>
                          <td colSpan={3 + sortedDates.length} className="px-2 py-4 text-center text-gray-500">
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
        
        {/* History Summary Table */}
        <IRRHistorySummaryTable
          productIds={memoizedProductIds}
          selectedDates={memoizedSelectedDates}
          clientGroupIds={undefined}
          realTimeTotalIRR={reportData?.totalIRR}
          reportData={reportData}
          className="mt-8"
        />
      </div>
    </div>
  );
};

export default IRRHistoryTab; 