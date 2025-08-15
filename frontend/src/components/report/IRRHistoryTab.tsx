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
  // Debug logging to understand data state (memoized to reduce spam)
  useEffect(() => {
    console.log('🔍 [IRR HISTORY DEBUG] Component loaded with:', {
      hasReportData: !!reportData,
      productCount: reportData?.productSummaries?.length || 0,
      hasIrrHistoryData: !!irrHistoryData,
      irrHistoryDataLength: irrHistoryData?.length || 0,
      loadingState: loading,
      firstProductSample: reportData?.productSummaries?.[0],
      irrHistoryDataSample: irrHistoryData?.[0]
    });
  }, [!!reportData, reportData?.productSummaries?.length, !!irrHistoryData, irrHistoryData?.length, loading]);
  // Local state for Phase 2 enhancements
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [chartType, setChartType] = useState<ChartType>('line');
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [showAllFunds, setShowAllFunds] = useState(false);
  // Formatting services from Phase 1 (moved up to fix hooks ordering)
  const { formatCurrencyWithZeroToggle, updateOptions } = useReportFormatter();
  // MOVED: Memoize expensive prop calculations to prevent infinite re-renders (moved before early returns)
  // Using stable dependencies instead of JSON.stringify to prevent unnecessary re-computations
  const memoizedProductIds = useMemo(
    () => reportData?.productSummaries?.map(p => p.id) || [],
    [
      reportData?.productSummaries?.length,
      reportData?.productSummaries?.[0]?.id,
      reportData?.productSummaries?.[reportData.productSummaries.length - 1]?.id
    ]
  );
  const memoizedSelectedDates = useMemo(
    () => {
      // Extract unique dates that were actually selected by the user
      if (!reportData?.selectedHistoricalIRRDates) {
        return [];
      }
      const allSelectedDates = new Set<string>();
      Object.values(reportData.selectedHistoricalIRRDates).forEach(dates => {
        dates.forEach(date => allSelectedDates.add(date));
      });
      const uniqueSelectedDates = Array.from(allSelectedDates).sort();
      console.log('🎯 [IRR HISTORY] Using actual user-selected dates:', uniqueSelectedDates);
      return uniqueSelectedDates;
    },
    [
      reportData?.selectedHistoricalIRRDates,
      // Create a stable dependency by stringifying the selections
      JSON.stringify(reportData?.selectedHistoricalIRRDates)
    ]
  );
  // Memoize reportData to prevent unnecessary prop changes
  const memoizedReportData = useMemo(
    () => reportData,
    [
      reportData?.productSummaries?.length,
      reportData?.availableHistoricalIRRDates?.length,
      reportData?.selectedHistoricalIRRDates,
      reportData?.productOwnerOrder?.length
    ]
  );
  // Memoize totalIRR to prevent unnecessary prop changes
  const memoizedTotalIRR = useMemo(
    () => reportData?.totalIRR,
    [reportData?.totalIRR]
  );
  // Debug: Track when memoized values change
  useEffect(() => {
    console.log('🔧 [MEMOIZATION DEBUG] ProductIds changed:', memoizedProductIds);
  }, [memoizedProductIds]);
  useEffect(() => {
    console.log('🔧 [MEMOIZATION DEBUG] SelectedDates changed:', memoizedSelectedDates);
  }, [memoizedSelectedDates]);
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
        /* Product card containers - prevent breaking across pages */
        .product-card {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
          margin-bottom: 20px !important;
        }
        
        /* Table container improvements */
        .product-table {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
        
        /* More reasonable font sizes for print */
        .irr-history-table {
          font-size: 10px !important;
          table-layout: auto !important; /* Let browser calculate optimal widths */
          width: 100% !important;
        }
        
        .irr-history-table th,
        .irr-history-table td {
          font-size: 9px !important;
          line-height: 1.2 !important;
          padding: 2px 4px !important; /* More reasonable padding */
        }
        
        /* Fund Name column - allow proper text wrapping */
        .irr-history-table th:nth-child(1),
        .irr-history-table td:nth-child(1) {
          white-space: normal !important;
          overflow: visible !important;
          text-overflow: clip !important;
          min-width: 120px !important; /* Ensure minimum readable width */
          max-width: none !important;
        }
        
        /* Risk column - ensure it doesn't get too narrow */
        .irr-history-table th:nth-child(2),
        .irr-history-table td:nth-child(2) {
          min-width: 40px !important;
        }
        
        /* Current Average Return column */
        .irr-history-table th:nth-child(3),
        .irr-history-table td:nth-child(3) {
          min-width: 60px !important;
        }
        
        /* Historical IRR columns - ensure consistent width */
        .irr-history-table th:nth-child(n+4),
        .irr-history-table td:nth-child(n+4) {
          min-width: 55px !important;
          text-align: right !important;
          padding-right: 6px !important;
        }
        
        /* Override colgroup percentages for print */
        .irr-history-table colgroup col {
          width: auto !important;
        }
        
        /* Keep minimal styling for headers */
        .irr-history-table th {
          font-weight: bold !important;
        }
        
        /* Handle long product titles better in print */
        .product-card h3 {
          font-size: 11px !important;
          line-height: 1.3 !important;
          margin-bottom: 8px !important;
        }
        
        /* History Summary Table specific print styling - align columns with product cards */
        .irr-history-section .irr-history-table {
          /* History Summary has different column structure - no "Current Average Return" column */
          /* Need to adjust widths to match product card alignment */
        }
        
        .irr-history-section .irr-history-table th:nth-child(1),
        .irr-history-section .irr-history-table td:nth-child(1) {
          min-width: 120px !important; /* Product name - same as Fund Name */
        }
        
        .irr-history-section .irr-history-table th:nth-child(2),
        .irr-history-section .irr-history-table td:nth-child(2) {
          min-width: 100px !important; /* Risk column - wider to compensate for missing Current Average Return */
        }
        
        .irr-history-section .irr-history-table th:nth-child(n+3),
        .irr-history-section .irr-history-table td:nth-child(n+3) {
          min-width: 55px !important; /* Historical dates - same as product cards */
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
  // Calculate Previous Funds IRR using specialized historical endpoint
    const calculatePreviousFundsHistoricalIRR = async (inactiveFundIds: number[], historicalDates: string[]): Promise<Map<string, number | null>> => {
    try {
      console.log(`🔍 [Previous Funds IRR] Starting calculation for ${inactiveFundIds.length} inactive funds:`, inactiveFundIds);
      console.log(`🔍 [Previous Funds IRR] Will attempt to calculate IRR for ${historicalDates.length} dates:`, historicalDates);
      
      // Convert date formats to YYYY-MM-DD as expected by API (same logic as ProductIRRHistory)
      const fullIrrDates = historicalDates.map(irrDate => {
      if (irrDate && typeof irrDate === 'string') {
        if (irrDate.length === 7) { // Format: YYYY-MM
          const [year, month] = irrDate.split('-');
          const lastDayOfMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
            return `${year}-${month}-${lastDayOfMonth.toString().padStart(2, '0')}`;
        } else if (irrDate.includes('T')) {
          // Convert ISO format (YYYY-MM-DDTHH:MM:SS) to YYYY-MM-DD
            return irrDate.split('T')[0];
          }
        }
        return irrDate;
      });
      
      // Use the same approach as ProductIRRHistory - call the existing endpoint for each date
      // Let the backend determine if it has enough data (activities + valuations) to calculate IRR
      const irrMap = new Map<string, number | null>();
      
      for (let i = 0; i < fullIrrDates.length; i++) {
        const fullDate = fullIrrDates[i];
        const originalDate = historicalDates[i];
        
        console.log(`🔍 [Previous Funds IRR] Calculating for date ${originalDate} (${fullDate}) with fund IDs:`, inactiveFundIds);
        
        try {
          // Use the same API call as ProductIRRHistory
      const response = await api.post('/portfolio_funds/multiple/irr', {
        portfolio_fund_ids: inactiveFundIds,
            irr_date: fullDate
          });
          
          console.log(`🔍 [Previous Funds IRR] API response for ${originalDate}:`, {
            success: response.data?.success,
            irr_percentage: response.data?.irr_percentage,
            irr_decimal: response.data?.irr_decimal,
            calculation_date: response.data?.calculation_date,
            portfolio_fund_ids: response.data?.portfolio_fund_ids
          });
          
          if (response.data?.irr_percentage !== undefined && response.data.irr_percentage !== null) {
            irrMap.set(originalDate, response.data.irr_percentage);
            console.log(`✅ [Previous Funds IRR] Successfully calculated IRR for ${originalDate}: ${response.data.irr_percentage}%`);
          } else {
            irrMap.set(originalDate, null);
            console.log(`⚠️ [Previous Funds IRR] No valid IRR returned for ${originalDate} - likely insufficient data (activities/valuations)`);
          }
        } catch (dateError) {
          console.error(`❌ [Previous Funds IRR] Error calculating IRR for date ${fullDate}:`, dateError);
          irrMap.set(originalDate, null);
        }
      }
      
      return irrMap;
    } catch (error) {
      console.error(`Error calculating Previous Funds historical IRR:`, error);
      return new Map();
    }
  };
  // Effect to calculate Previous Funds IRR using our new historical endpoint
  useEffect(() => {
    const calculatePreviousFundsIRR = async () => {
      console.log(`🔄 [Previous Funds] useEffect triggered`, {
        hasIrrHistoryData: !!irrHistoryData,
        irrHistoryDataLength: irrHistoryData?.length,
        hasProductSummaries: !!reportData?.productSummaries,
        productSummariesLength: reportData?.productSummaries?.length
      });
      
      if (!irrHistoryData || irrHistoryData.length === 0) {
        console.log(`❌ [Previous Funds] Early return: no irrHistoryData`);
        return;
      }
      if (!reportData?.productSummaries) {
        console.log(`❌ [Previous Funds] Early return: no productSummaries`);
        return;
      }
      // Extract selected dates from reportData
      const selectedDates = reportData?.selectedHistoricalIRRDates 
        ? Array.from(new Set(Object.values(reportData.selectedHistoricalIRRDates).flat()))
        : [];
      if (!selectedDates || selectedDates.length === 0) {
        console.log(`❌ [Previous Funds] Early return: no selectedDates`, selectedDates);
        return;
      }
      
      console.log(`🔄 [Previous Funds] Starting calculation with ${selectedDates.length} dates:`, selectedDates);
      // Find products that have funds requiring dynamic IRR calculation
      const productsWithDynamicFunds = [];
      for (const productHistory of irrHistoryData) {
        const currentProduct = reportData.productSummaries.find(p => p.id === productHistory.product_id);
        if (currentProduct) {
          console.log(`🔍 [Previous Funds] Analyzing product ${productHistory.product_id}:`, {
            productName: currentProduct.product_name,
            totalFunds: currentProduct.funds?.length || 0,
            fundDetails: currentProduct.funds?.map((f: any) => ({
              name: f.fund_name,
              status: f.status,
              isVirtual: f.isVirtual,
              id: f.id || f.portfolio_fund_id,
              portfolio_fund_id: f.portfolio_fund_id
            })) || []
          });
          
          // Check specifically for Previous Funds (NOT Historical Funds - treat as regular fund)
          const historicalFundsCheck = currentProduct.funds?.filter((f: any) =>
            f.fund_name === 'Previous Funds'
          ) || [];
          console.log(`🔍 [Previous Funds] Product ${productHistory.product_id} - Historical/Previous Funds check:`, {
            foundHistoricalFunds: historicalFundsCheck.length,
            historicalFundsDetails: historicalFundsCheck.map((f: any) => ({
              name: f.fund_name,
              status: f.status,
              isVirtual: f.isVirtual,
              id: f.id || f.portfolio_fund_id,
              portfolio_fund_id: f.portfolio_fund_id,
              shouldBeIncluded: f.fund_name === 'Historical Funds' || f.fund_name === 'Previous Funds',
              statusCheck: f.status === 'inactive',
              virtualCheck: !f.isVirtual,
              combinedCheck: (f.status === 'inactive' && !f.isVirtual) || ((f.fund_name === 'Historical Funds' || f.fund_name === 'Previous Funds') && !f.isVirtual),
              allKeys: Object.keys(f),
              rawFundObject: f
            }))
          });
          
          // Also check ALL funds to see if there's a "Historical Funds" we're missing
          console.log(`🔍 [Previous Funds] Product ${productHistory.product_id} - ALL FUNDS CHECK:`, {
            totalFunds: currentProduct.funds?.length || 0,
            allFundNames: currentProduct.funds?.map((f: any) => f.fund_name) || [],
            historicalFundsInAll: currentProduct.funds?.filter((f: any) => f.fund_name === 'Historical Funds') || [],
            previousFundsInAll: currentProduct.funds?.filter((f: any) => f.fund_name === 'Previous Funds') || []
          });
          
          // Look for funds that need dynamic calculation - either inactive funds or "Historical Funds"/"Previous Funds"
          const dynamicFunds = [];
          // First, get actual inactive funds
          const inactiveFunds = currentProduct.funds?.filter((fund: any) => 
            fund.status === 'inactive' && !fund.isVirtual
          ) || [];
          dynamicFunds.push(...inactiveFunds);
          
          console.log(`🔍 [Previous Funds] Product ${productHistory.product_id} inactive funds:`, {
            count: inactiveFunds.length,
            funds: inactiveFunds.map((f: any) => ({ name: f.fund_name, status: f.status, isVirtual: f.isVirtual }))
          });
                    // Also look for funds named "Previous Funds" that should be calculated dynamically
                    // Note: We include these regardless of isVirtual status because they represent real aggregated inactive funds
                    // Historical Funds should be treated as regular individual funds, not aggregated
                    const historicalFunds = currentProduct.funds?.filter((fund: any) =>
                      fund.fund_name === 'Previous Funds'
                    ) || [];
          dynamicFunds.push(...historicalFunds);
          
          console.log(`🔍 [Previous Funds] Product ${productHistory.product_id} historical funds:`, {
            count: historicalFunds.length,
            funds: historicalFunds.map((f: any) => ({ name: f.fund_name, status: f.status, isVirtual: f.isVirtual }))
          });
          
          console.log(`🔍 [Previous Funds] Product ${productHistory.product_id} total dynamic funds:`, {
            count: dynamicFunds.length,
            funds: dynamicFunds.map((f: any) => ({ name: f.fund_name, status: f.status, isVirtual: f.isVirtual }))
          });
          if (dynamicFunds.length > 0) {
            // For "Previous Funds" or "Historical Funds", we need to find the actual inactive fund IDs
            // The virtual fund entry might have ID -1, so we need to look for real inactive funds
            let actualInactiveFundIds: number[] = [];
            
            if (dynamicFunds.some((f: any) => (f.fund_name === 'Previous Funds' || f.fund_name === 'Historical Funds') && (f.id === -1 || f.portfolio_fund_id === -1))) {
              // This is a virtual "Previous Funds" entry, get the real inactive fund IDs from the virtual fund's inactiveFunds property
              const virtualFund = dynamicFunds.find((f: any) => f.fund_name === 'Previous Funds' || f.fund_name === 'Historical Funds');
              
              if (virtualFund && virtualFund.inactiveFunds && Array.isArray(virtualFund.inactiveFunds)) {
                // Use the inactive funds stored in the virtual fund entry
                actualInactiveFundIds = virtualFund.inactiveFunds
                  .map((fund: any) => fund.portfolio_fund_id || fund.id)
                  .filter((id: any) => id !== null && id !== undefined && id !== -1);
                  
                console.log(`🔍 [Previous Funds] Product ${productHistory.product_id} - Found virtual Previous/Historical Funds with stored inactive funds:`, {
                  virtualFund: {
                    name: virtualFund.fund_name,
                    id: virtualFund.id,
                    hasInactiveFunds: !!virtualFund.inactiveFunds,
                    inactiveFundsCount: virtualFund.inactiveFunds?.length || 0
                  },
                  inactiveFunds: virtualFund.inactiveFunds.map((f: any) => ({
                    name: f.fund_name,
                    id: f.id,
                    portfolio_fund_id: f.portfolio_fund_id,
                    status: f.status
                  })),
                  actualInactiveFundIds: actualInactiveFundIds
                });
              } else {
                // Fallback: look for actual inactive funds in the product
                const allInactiveFunds = currentProduct.funds?.filter((fund: any) => 
                  fund.status === 'inactive' && fund.id !== -1 && fund.portfolio_fund_id !== -1
                ) || [];
                
                actualInactiveFundIds = allInactiveFunds
                  .map((fund: any) => fund.portfolio_fund_id || fund.id)
                  .filter((id: any) => id !== null && id !== undefined && id !== -1);
                  
                console.log(`🔍 [Previous Funds] Product ${productHistory.product_id} - Virtual fund has no inactiveFunds property, using fallback search:`, {
                  virtualFund: virtualFund,
                  allInactiveFunds: allInactiveFunds.length,
                  actualInactiveFundIds: actualInactiveFundIds,
                  inactiveFundDetails: allInactiveFunds.map((f: any) => ({
                    name: f.fund_name,
                    id: f.id,
                    portfolio_fund_id: f.portfolio_fund_id,
                    status: f.status
                  }))
                });
              }
            } else {
              // Use the fund IDs from the dynamic funds directly
              actualInactiveFundIds = dynamicFunds
                .map((fund: any) => fund.portfolio_fund_id || fund.id || fund.available_funds_id)
                .filter((id: any) => id !== null && id !== undefined && id !== -1);
                
              console.log(`🔍 [Previous Funds] Product ${productHistory.product_id} - Using direct fund IDs:`, {
                dynamicFunds: dynamicFunds.length,
                extractedIds: actualInactiveFundIds
              });
            }
            
            const dynamicFundIds = actualInactiveFundIds;
            
            console.log(`🔍 [Previous Funds] Product ${productHistory.product_id} extracted fund IDs:`, {
              originalCount: dynamicFunds.length,
              extractedIds: dynamicFundIds,
              filteredCount: dynamicFundIds.length
            });
            if (dynamicFundIds.length > 0) {
              productsWithDynamicFunds.push({
                productId: productHistory.product_id,
                inactiveFundIds: dynamicFundIds // Keep same property name for compatibility
              });
            }
          }
         }
       }
      console.log(`🔍 [Previous Funds] Final analysis:`, {
        totalProductsAnalyzed: irrHistoryData.length,
        productsWithDynamicFunds: productsWithDynamicFunds.length,
        dynamicFundDetails: productsWithDynamicFunds
      });
      
      if (productsWithDynamicFunds.length === 0) {
        console.log(`❌ [Previous Funds] No products with dynamic funds found - exiting`);
        return;
      }
      console.log(`🔄 [Previous Funds] Starting IRR calculations for ${productsWithDynamicFunds.length} products`);
      
      try {
          const newPreviousFundsIRRData = new Map<string, Map<string, number | null>>();
          const completedProducts = new Set<number>();
        // Calculate IRR for each product's dynamic funds
        for (const { productId, inactiveFundIds } of productsWithDynamicFunds) {
          console.log(`🔄 [Previous Funds] Calculating IRR for product ${productId} with fund IDs:`, inactiveFundIds);
          
          try {
            // Use our new historical IRR calculation function
            const dateIrrMap = await calculatePreviousFundsHistoricalIRR(inactiveFundIds, selectedDates);
            
            console.log(`🔍 [Previous Funds] Product ${productId} IRR calculation result:`, {
              mapSize: dateIrrMap.size,
              dates: Array.from(dateIrrMap.keys()),
              values: Array.from(dateIrrMap.entries()),
              detailedValues: Array.from(dateIrrMap.entries()).map(([date, irr]) => `${date}: ${irr}%`)
            });
            
            if (dateIrrMap.size > 0) {
              newPreviousFundsIRRData.set(`product_${productId}`, dateIrrMap);
            completedProducts.add(productId);
              console.log(`✅ [Previous Funds] Successfully stored IRR data for product ${productId}`);
            } else {
              console.log(`⚠️ [Previous Funds] No IRR data calculated for product ${productId}`);
            }
          } catch (error) {
            console.error(`❌ [Previous Funds] Error calculating IRR for product ${productId}:`, error);
          }
        }
        // Update state with calculated data
        console.log(`🔍 [Previous Funds] Final state update:`, {
          newDataSize: newPreviousFundsIRRData.size,
          completedProductsCount: completedProducts.size,
          completedProducts: Array.from(completedProducts),
          allCalculatedData: Array.from(newPreviousFundsIRRData.entries()).map(([key, map]) => ({
            key,
            dates: Array.from(map.keys()),
            values: Array.from(map.entries()),
            detailedValues: Array.from(map.entries()).map(([date, irr]) => `${date}: ${irr}%`)
          }))
        });
        
          if (newPreviousFundsIRRData.size > 0) {
            setPreviousFundsIRRData(newPreviousFundsIRRData);
            setPreviousFundsCalculationComplete(completedProducts);
          console.log(`✅ [Previous Funds] State updated successfully with ${newPreviousFundsIRRData.size} products`);
        } else {
          console.log(`⚠️ [Previous Funds] No data to update - newPreviousFundsIRRData is empty`);
        }
      } catch (error) {
        console.error('Error in Previous Funds calculation process:', error);
      }
    };
    calculatePreviousFundsIRR();
  }, [irrHistoryData, reportData?.selectedHistoricalIRRDates, reportData?.productSummaries]); // Depend on all relevant data
  // Memoize the expensive table processing to prevent multiple renders
  const memoizedTableData = useMemo(() => {
    if (!reportData?.productSummaries || !irrHistoryData) {
      return [];
    }
    // Organize products by type function (moved from IIFE)
    const organizeProductsByType = (products: ProductPeriodSummary[]) => {
      const groupedProducts: { [key: string]: ProductPeriodSummary[] } = {};
      products.forEach(product => {
        const normalizedType = normalizeProductType(product.product_type);
        if (!groupedProducts[normalizedType]) {
          groupedProducts[normalizedType] = [];
        }
        groupedProducts[normalizedType].push(product);
      });
      Object.keys(groupedProducts).forEach(type => {
        if (type === 'ISAs') {
          groupedProducts[type].sort((a, b) => {
            const typeA = a.product_type?.toLowerCase().trim() || '';
            const typeB = b.product_type?.toLowerCase().trim() || '';
            const isJISA_A = typeA === 'jisa';
            const isJISA_B = typeB === 'jisa';
            if (isJISA_A && !isJISA_B) return 1;
            if (!isJISA_A && isJISA_B) return -1;
            return 0;
          });
          groupedProducts[type] = sortProductsByOwnerOrder(groupedProducts[type], reportData.productOwnerOrder || []);
        } else {
          groupedProducts[type] = sortProductsByOwnerOrder(groupedProducts[type], reportData.productOwnerOrder || []);
        }
      });
      const orderedProducts: ProductPeriodSummary[] = [];
      PRODUCT_TYPE_ORDER.forEach(type => {
        if (groupedProducts[type]) {
          orderedProducts.push(...groupedProducts[type]);
        }
      });
      const activeProducts = orderedProducts.filter(product => 
        product.status !== 'inactive' && product.status !== 'lapsed'
      );
      const inactiveProducts = orderedProducts.filter(product => 
        product.status === 'inactive' || product.status === 'lapsed'
      );
      return [...activeProducts, ...inactiveProducts];
    };
    const organizedProducts = organizeProductsByType(reportData.productSummaries);
    const filteredProducts = organizedProducts.filter(product => {
      if (product.status === 'inactive') {
        return reportData.showInactiveProducts || showInactiveProductDetails.has(product.id);
      }
      return true;
    });
    return filteredProducts;
  }, [
    reportData?.productSummaries, 
    irrHistoryData, 
    showInactiveProductDetails, 
    reportData?.showInactiveProducts, 
    reportData?.productOwnerOrder,
    loading.portfolioIRR
  ]);
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
          // Use the memoized filtered products to avoid expensive recalculation
          const filteredProducts = memoizedTableData;
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
          return filteredProducts.map((product: ProductPeriodSummary, index: number) => {
            // Find the corresponding IRR history data for this product
            const productHistory = irrHistoryData.find((ph: any) => ph.product_id === product.id);
            if (!productHistory) {
              return null;
            }
            // ✅ USE GLOBAL DATES for all products (not per-product calculation)
            const sortedDates = globalHistoricalDates;
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
                }
                fundIrrMaps.set(fund.portfolio_fund_id, fundMap);
              });
            }
            return (
              <div 
                key={index} 
                className={`mb-8 bg-white shadow-sm rounded-lg border border-gray-200 w-full product-card print-clean ${product?.status === 'inactive' ? 'opacity-60 bg-gray-50' : ''}`}
                style={{
                  borderLeft: product?.provider_theme_color ? `4px solid ${product.provider_theme_color}` : '4px solid #e5e7eb',
                  borderTop: product?.provider_theme_color ? `1px solid ${product.provider_theme_color}` : undefined,
                  borderRight: product?.provider_theme_color ? `1px solid ${product.provider_theme_color}` : undefined,
                  borderBottom: product?.provider_theme_color ? `1px solid ${product.provider_theme_color}` : undefined,
                }}
              >
                <div className="px-2 py-2">
                  <div className="flex items-center gap-3 mb-2">
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
                </div>
                <div className="px-2 py-2">
                  <div className="overflow-x-auto product-table">
                  <table className="w-full table-fixed divide-y divide-gray-300 landscape-table irr-history-table">
                    <colgroup>
                      <col className="w-[30%]" />
                      <col className="w-[10%]" />
                      <col className="w-[15%]" />
                      {sortedDates.map((_, index) => (
                        <col key={index} className="w-[15%]" />
                      ))}
                    </colgroup>
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
                            // Get calculated IRR data for this product
                            const productKey = `product_${productHistory.product_id}`;
                            const productPreviousFundsIRR = previousFundsIRRData.get(productKey);
                            // Always create Previous Funds entry, even if IRR calculation is still pending
                            // Aggregate historical IRR data manually from inactive funds
                            const aggregatedIrrMap = new Map();
                            // If we have calculated data, use it; otherwise trigger async calculation
                            if (productPreviousFundsIRR && productPreviousFundsIRR.size > 0) {
                              productPreviousFundsIRR.forEach((irr, date) => {
                                aggregatedIrrMap.set(date, irr);
                              });
                            } else {
                              // Trigger async calculation of aggregated IRR for historical dates
                              // Get portfolio fund IDs from inactive funds
                              const inactiveFundIds = inactiveFundsFromSummary
                                .map((fund: any) => fund.portfolio_fund_id || fund.id)
                                .filter((id: any) => id !== null && id !== undefined);
                              // Get all historical dates that we need to calculate for
                              const historicalDates = new Set();
                              productHistory.funds_historical_irr.forEach((fund: any) => {
                                if (fund.historical_irr) {
                                  fund.historical_irr.forEach((record: any) => {
                                    historicalDates.add(record.irr_date);
                                  });
                                }
                              });
                              // Trigger async calculation using batch historical IRR endpoint
                              const calculateHistoricalAggregatedIRR = async () => {
                                const productKey = `product_${productHistory.product_id}`;
                                try {
                                  // Use the new batch historical IRR calculation function
                                  const dateIrrMap = await calculatePreviousFundsHistoricalIRR(
                                    inactiveFundIds, 
                                    Array.from(historicalDates) as string[]
                                  );
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
                                } catch (error) {
                                  console.error(`Error in batch IRR calculation:`, error);
                                }
                              };
                              // Start calculation if not already running
                              if (!previousFundsCalculationComplete.has(productHistory.product_id)) {
                                calculateHistoricalAggregatedIRR();
                              }
                              // For now, use empty aggregated map (will be populated by async calculation)
                              // This will trigger a re-render when the calculation completes
                            }
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
                          } else if (existingPreviousFunds && !existingPreviousFundsInHistory) {
                            // If Previous Funds entry already exists in SummaryTab data, use it
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
                            // Even though Previous Funds entry exists, we need to calculate its IRR values for each historical date
                            const inactiveFundsFromSummary: any[] = currentProduct?.funds?.filter((fund: any) => 
                              fund.status === 'inactive'
                            ) || [];
                            // Look for Previous Funds entry in historical data itself
                            const historicalPreviousFunds = productHistory.funds_historical_irr?.find((fund: any) => 
                              fund.fund_name === 'Previous Funds' || fund.isVirtual
                            );
                            // Enhanced debugging with JSON.stringify to see full object content
                            if (historicalPreviousFunds) {
                            }
                            if (existingPreviousFunds) {
                            }
                            // Also log all historical funds for comparison
                            // Try to get portfolio fund IDs from multiple sources
                            let portfolioFundIds = [];
                            // First, try from inactive funds in summary
                            if (inactiveFundsFromSummary.length > 0) {
                              portfolioFundIds = inactiveFundsFromSummary
                                .map((fund: any) => fund.portfolio_fund_id || fund.id)
                                .filter((id: any) => id !== null && id !== undefined && id > 0);
                            }
                            // Check if historical Previous Funds entry already has IRR data we can use
                            if (portfolioFundIds.length === 0 && historicalPreviousFunds && historicalPreviousFunds.historical_irr && historicalPreviousFunds.historical_irr.length > 0) {
                              // Use the existing historical IRR data directly
                              const aggregatedIrrMap = new Map();
                              historicalPreviousFunds.historical_irr.forEach((record: any) => {
                                if (record.irr_date && record.irr_result !== null && record.irr_result !== undefined) {
                                  aggregatedIrrMap.set(record.irr_date, record.irr_result);
                                }
                              });
                              // Note: fundIrrMaps.set removed to prevent infinite re-render loop
                              // Previous Funds IRR data will be accessed directly from previousFundsIRRData state
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
                              }
                              // Fallback: Check if Previous Funds entry has stored portfolio fund IDs
                              else if ((existingPreviousFunds as any).portfolioFundIds && Array.isArray((existingPreviousFunds as any).portfolioFundIds)) {
                                portfolioFundIds = (existingPreviousFunds as any).portfolioFundIds;
                              } 
                              // Last resort: Search historical data for missing funds
                              else if (existingPreviousFunds.inactiveFundCount && existingPreviousFunds.inactiveFundCount > 0) {
                                // Look for funds in historical data that aren't in current active funds
                                const activeFundNames = currentProduct?.funds?.filter((f: any) => f.status !== 'inactive').map((f: any) => f.fund_name) || [];
                                const historicalFundNames = productHistory.funds_historical_irr?.map((f: any) => f.fund_name) || [];
                                const potentialInactiveFunds = productHistory.funds_historical_irr?.filter((f: any) => 
                                  !activeFundNames.includes(f.fund_name) && f.fund_name !== 'Previous Funds'
                                ) || [];
                                portfolioFundIds = potentialInactiveFunds
                                  .map((fund: any) => fund.portfolio_fund_id)
                                  .filter((id: any) => id !== null && id !== undefined);
                              }
                            }
                            if (portfolioFundIds.length > 0) {
                              // Get calculated IRR data for this product
                              const productKey = `product_${productHistory.product_id}`;
                              const productPreviousFundsIRR = previousFundsIRRData.get(productKey);
                              // Create aggregated IRR map
                              const aggregatedIrrMap = new Map();
                              if (productPreviousFundsIRR && productPreviousFundsIRR.size > 0) {
                                productPreviousFundsIRR.forEach((irr, date) => {
                                  aggregatedIrrMap.set(date, irr);
                                });
                              } else {
                                // Trigger async calculation of aggregated IRR for historical dates
                                // Get all historical dates that we need to calculate for
                                const historicalDates = new Set();
                                productHistory.funds_historical_irr.forEach((fund: any) => {
                                  if (fund.historical_irr) {
                                    fund.historical_irr.forEach((record: any) => {
                                      historicalDates.add(record.irr_date);
                                    });
                                  }
                                });
                                // Trigger async calculation using batch historical IRR endpoint
                                const calculateHistoricalAggregatedIRR = async () => {
                                  const productKey = `product_${productHistory.product_id}`;
                                  try {
                                    // Use the new batch historical IRR calculation function
                                    const dateIrrMap = await calculatePreviousFundsHistoricalIRR(
                                      portfolioFundIds, 
                                      Array.from(historicalDates) as string[]
                                    );
                                  // Update the previousFundsIRRData state with calculated values
                                  setPreviousFundsIRRData(prev => {
                                    const updated = new Map(prev);
                                    updated.set(productKey, dateIrrMap);
                                    return updated;
                                  });
                                  // Mark calculation as complete
                                  setPreviousFundsCalculationComplete(prev => new Set(prev).add(productHistory.product_id));
                                  } catch (error) {
                                    console.error(`Error in batch IRR calculation for existing entry:`, error);
                                  }
                                };
                                // Start calculation if not already running
                                if (!previousFundsCalculationComplete.has(productHistory.product_id)) {
                                  calculateHistoricalAggregatedIRR();
                                }
                              }
                              // Note: fundIrrMaps.set removed to prevent infinite re-render loop
                              // Previous Funds IRR data will be accessed directly from previousFundsIRRData state
                            } else {
                            }
                          }
                          
                          // Sort funds to match SummaryTab ordering: cash funds last (unless Previous Funds exist)
                          const sortedProcessedFunds = [...processedFunds].sort((a, b) => {
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
                          });
                          
                          const fundRows = sortedProcessedFunds.map((fund: any, fundIndex: number) => {
                            // For Previous Funds, use previousFundsIRRData state; for regular funds, use fundIrrMaps
                            let fundIrrMap: Map<string, number | null>; // Changed type to allow null
                            // Determine if this fund should use the dynamically calculated previousFundsIRRData
                            // Note: Only Previous Funds should use dynamic calculation, Historical Funds are treated as regular individual funds
                            const shouldUseDynamicIRR =
                                (fund.status === 'inactive' && !fund.isVirtual) ||
                                (fund.fund_name === 'Previous Funds');
                            if (shouldUseDynamicIRR) {
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
              </div>
            );
          }).filter(Boolean);
        })()}
        {/* History Summary Table */}
        <IRRHistorySummaryTable
          productIds={memoizedProductIds}
          selectedDates={memoizedSelectedDates}
          clientGroupIds={undefined}
          realTimeTotalIRR={memoizedTotalIRR}
          reportData={memoizedReportData}
          className="mt-8"
        />
      </div>
    </div>
  );
};
export default IRRHistoryTab; 