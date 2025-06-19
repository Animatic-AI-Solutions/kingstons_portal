import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, PrinterIcon } from '@heroicons/react/24/outline';
import { useReactToPrint } from 'react-to-print';
import { formatDateFallback, formatCurrencyFallback, formatPercentageFallback } from '../components/reports/shared/ReportFormatters';
import { createIRRDataService } from '../services/irrDataService';
import api from '../services/api';

// Interfaces for data types (copied from ReportGenerator)
interface ProductPeriodSummary {
  id: number;
  product_name: string;
  product_type?: string;
  product_owner_name?: string;
  start_date: string | null;
  total_investment: number;
  total_withdrawal: number;
  total_switch_in: number;
  total_switch_out: number;
  net_flow: number;
  current_valuation: number;
  irr: number | null;
  provider_name?: string;
  provider_theme_color?: string;
  funds?: FundSummary[];
  weighted_risk?: number;
  status?: string;
}

interface FundSummary {
  id: number;
  available_funds_id: number;
  fund_name: string;
  total_investment: number;
  total_withdrawal: number;
  total_switch_in: number;
  total_switch_out: number;
  net_flow: number;
  current_valuation: number;
  irr: number | null;
  isin_number?: string;
  status: string;
  isVirtual?: boolean;
  inactiveFundCount?: number;
  risk_factor?: number;
  inactiveFunds?: FundSummary[];
  historical_irr?: number[];
  historical_dates?: string[];
}

interface ReportData {
  productSummaries: ProductPeriodSummary[];
  totalIRR: number | null;
  totalValuation: number | null;
  earliestTransactionDate: string | null;
  selectedValuationDate: string | null;
  productOwnerNames: string[];
  timePeriod: string;
  // Report settings
  truncateAmounts: boolean;
  roundIrrToOne: boolean;
  formatWithdrawalsAsNegative: boolean;
  showInactiveProducts: boolean;
  showPreviousFunds: boolean;
}

const ReportDisplay: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [reportData, setReportData] = useState<ReportData | null>(null);
  
  // Create IRR data service instance
  const irrDataService = useMemo(() => createIRRDataService(api), []);
  const [activeTab, setActiveTab] = useState<'summary' | 'irr-history'>('summary');
  const [irrHistoryData, setIrrHistoryData] = useState<any>(null);
  const [loadingIrrHistory, setLoadingIrrHistory] = useState(false);

  const [showInactiveProductDetails, setShowInactiveProductDetails] = useState<Set<number>>(new Set());
  
  // Real-time total IRR calculation
  const [realTimeTotalIRR, setRealTimeTotalIRR] = useState<number | null>(null);
  const [loadingTotalIRR, setLoadingTotalIRR] = useState(false);

  // Create ref for the printable content
  const printRef = useRef<HTMLDivElement>(null);

  // React-to-print implementation with landscape orientation - MUST be before any conditional returns
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Report_${reportData?.timePeriod.replace(/\s+/g, '_') || 'Export'}.pdf`,
    onBeforePrint: async () => {
      // Ensure IRR history is loaded before printing
      if (!irrHistoryData) {
        await fetchIrrHistory();
      }
    },
    pageStyle: `
      @media print {
        @page {
          margin: 0.75in;
          size: A4 landscape;
        }
        
        /* Hide interactive elements */
        .print-hide {
          display: none !important;
        }
        
        /* Force page break before IRR History */
        .irr-history-section {
          page-break-before: always;
          break-before: page;
        }
        
        /* Prevent page breaks inside product cards */
        .product-card {
          page-break-inside: avoid;
          break-inside: avoid;
          margin-bottom: 1rem;
        }
        
        /* Prevent table breaks */
        .product-table {
          page-break-inside: avoid;
          break-inside: avoid;
        }
        
        /* Clean up styling for print */
        .print-clean {
          box-shadow: none !important;
          border: 1px solid #e5e7eb !important;
        }
        
        /* Optimize for landscape layout */
        body {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        
        /* Make tables more compact for landscape */
        .landscape-table {
          font-size: 10px;
        }
        
        .landscape-table th,
        .landscape-table td {
          padding: 4px 6px;
        }
      }
    `
  });

  const fetchIrrHistory = async () => {
    if (!reportData || loadingIrrHistory) return;
    
    setLoadingIrrHistory(true);
    try {
      const productIds = reportData.productSummaries.map(p => p.id);
      const historyPromises = productIds.map(async (productId) => {
        const response = await fetch(`/api/historical-irr/combined/${productId}?limit=24`);
        if (!response.ok) throw new Error(`Failed to fetch IRR history for product ${productId}`);
        return await response.json();
      });
      
      const historyResults = await Promise.all(historyPromises);
      setIrrHistoryData(historyResults);
    } catch (error) {
      console.error('Error fetching IRR history:', error);
    } finally {
      setLoadingIrrHistory(false);
    }
  };

  const calculateRealTimeTotalIRR = async () => {
    if (!reportData || loadingTotalIRR) return;
    
    setLoadingTotalIRR(true);
    try {
      // Collect all portfolio fund IDs from all products
      const allPortfolioFundIds: number[] = [];
      
      reportData.productSummaries.forEach(product => {
        if (product.funds) {
          product.funds.forEach(fund => {
            if (!fund.isVirtual && fund.id) {
              allPortfolioFundIds.push(fund.id);
            }
          });
        }
      });

      console.log('🎯 [REAL-TIME TOTAL IRR] Calculating with portfolio fund IDs:', allPortfolioFundIds);
      
      if (allPortfolioFundIds.length === 0) {
        console.warn('⚠️ [REAL-TIME TOTAL IRR] No portfolio fund IDs found');
        setRealTimeTotalIRR(null);
        return;
      }

      // Convert partial date (YYYY-MM) to full date (YYYY-MM-DD) by using last day of month
      let endDate: string | undefined = undefined;
      if (reportData.selectedValuationDate) {
        if (reportData.selectedValuationDate.includes('-') && reportData.selectedValuationDate.split('-').length === 2) {
          // Partial date format (YYYY-MM) - convert to last day of month
          const [year, month] = reportData.selectedValuationDate.split('-');
          const lastDayOfMonth = new Date(parseInt(year), parseInt(month), 0).getDate();
          endDate = `${year}-${month.padStart(2, '0')}-${lastDayOfMonth.toString().padStart(2, '0')}`;
          console.log(`🔄 [REAL-TIME TOTAL IRR] Converted partial date ${reportData.selectedValuationDate} to full date ${endDate}`);
        } else {
          // Already a full date
          endDate = reportData.selectedValuationDate;
        }
      }

      // Use the optimized IRR service to calculate total IRR
      const totalIRRData = await irrDataService.getOptimizedIRRData({
        portfolioFundIds: allPortfolioFundIds,
        endDate: endDate,
        includeHistorical: false
      });

      console.log('🎯 [REAL-TIME TOTAL IRR] Response:', totalIRRData);
      
      if (totalIRRData.portfolioIRR !== null && totalIRRData.portfolioIRR !== undefined) {
        setRealTimeTotalIRR(totalIRRData.portfolioIRR);
        console.log('✅ [REAL-TIME TOTAL IRR] Calculated:', totalIRRData.portfolioIRR);
      } else {
        setRealTimeTotalIRR(null);
        console.warn('⚠️ [REAL-TIME TOTAL IRR] No IRR result returned');
      }
    } catch (error) {
      console.error('❌ [REAL-TIME TOTAL IRR] Error calculating total IRR:', error);
      setRealTimeTotalIRR(null);
    } finally {
      setLoadingTotalIRR(false);
    }
  };

  const handleTabChange = (tab: 'summary' | 'irr-history') => {
    setActiveTab(tab);
    if (tab === 'irr-history' && !irrHistoryData) {
      fetchIrrHistory();
    }
  };

  useEffect(() => {
    // Get report data from navigation state
    if (location.state && location.state.reportData) {
      console.log('🔍 [REPORT DISPLAY DEBUG] Received report data with', location.state.reportData.productSummaries.length, 'products');
      
      setReportData(location.state.reportData);
    } else {
      // If no report data, redirect back to report generator
      navigate('/report-generator');
    }
  }, [location.state, navigate]);

  // Calculate real-time total IRR when report data is loaded
  useEffect(() => {
    if (reportData) {
      calculateRealTimeTotalIRR();
    }
  }, [reportData]);

  if (!reportData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading report...</p>
        </div>
      </div>
    );
  }

  // Formatting functions based on report settings
  const formatCurrencyWithTruncation = (amount: number | null | undefined): string => {
    if (amount === null || amount === undefined) return '£0';
    
    // Always round to nearest whole number
    return `£${Math.round(amount).toLocaleString()}`;
  };

  const formatIrrWithPrecision = (irr: number | null | undefined): string => {
    if (irr === null || irr === undefined) return '-';
    
    // Always round to 1 decimal place
      return `${irr.toFixed(1)}%`;
  };

  const formatWithdrawalAmount = (amount: number | null | undefined): string => {
    if (amount === null || amount === undefined) return '-';
    if (amount === 0) return formatCurrencyWithTruncation(amount);
    const displayAmount = reportData.formatWithdrawalsAsNegative ? -Math.abs(amount) : amount;
    return formatCurrencyWithTruncation(displayAmount);
  };

  const formatRiskFallback = (risk: number | undefined): string => {
    if (risk === undefined) return '-';
    
    // Always round to 1 decimal place
    return risk.toFixed(1);
  };



  const toggleInactiveProductDetails = (productId: number) => {
    setShowInactiveProductDetails(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  const handleBackToGenerator = () => {
    navigate('/report-generator');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with navigation and actions */}
      <div className="bg-white shadow-sm border-b border-gray-200 print-hide">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={handleBackToGenerator}
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeftIcon className="h-5 w-5 mr-2" />
                Back to Report Generator
              </button>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handlePrint}
                className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
              >
                <PrinterIcon className="h-4 w-4 mr-2" />
                Print Report
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Report Content */}
      <div ref={printRef} className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Report Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Report Summary
          </h1>
          <div className="text-lg text-gray-700 mb-1">
            {reportData.timePeriod}
          </div>
          {reportData.productOwnerNames.length > 0 && (
            <div className="text-md text-gray-600">
              {reportData.productOwnerNames.join(', ')}
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="mb-8 print-hide">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              <button
                onClick={() => handleTabChange('summary')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'summary'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Report Summary
              </button>
              <button
                onClick={() => handleTabChange('irr-history')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'irr-history'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                IRR History
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {/* Report Summary Section - Always visible in print */}
        <div className={`${activeTab === 'summary' ? '' : 'hidden'} print:block`}>
          {/* Portfolio Total Average Return */}
          <div className="mb-8 bg-white shadow-sm rounded-lg border border-gray-200 p-6 product-card print-clean">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Portfolio Performance</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="text-sm font-medium text-purple-700 mb-1">Portfolio Total Average Return (Real-time)</div>
                {loadingTotalIRR ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                    <div className="text-sm text-purple-600">Calculating...</div>
                  </div>
                ) : realTimeTotalIRR !== null ? (
                  <div className={`text-2xl font-bold ${realTimeTotalIRR >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatIrrWithPrecision(realTimeTotalIRR)}
                  </div>
                ) : (
                  <div className="text-2xl font-bold text-gray-400">N/A</div>
                )}
              </div>
              {reportData.totalValuation !== null && (
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="text-sm font-medium text-green-700 mb-1">Total Portfolio Value</div>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrencyWithTruncation(reportData.totalValuation)}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mb-8">
            {reportData.productSummaries
              .filter(product => {
                // For inactive products, only show detailed cards if the checkbox was checked
                if (product.status === 'inactive') {
                  return reportData.showInactiveProducts || showInactiveProductDetails.has(product.id);
                }
                return true;
              })
              .map(product => (
                <div key={product.id} className={`mb-8 bg-white shadow-sm rounded-lg border border-gray-200 p-6 w-full product-card print-clean ${product.status === 'inactive' ? 'opacity-60 bg-gray-50' : ''}`}>
                  <div className="flex items-center gap-3 mb-4">
                    {product.provider_theme_color && (
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: product.provider_theme_color }}
                      />
                    )}
                    <h3 className={`text-xl font-semibold ${product.status === 'inactive' ? 'text-gray-600' : 'text-gray-800'}`}>
                      {[product.product_type, product.provider_name, product.product_owner_name].filter(Boolean).join(' - ')}
                      {product.status === 'inactive' && (
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
                          <th scope="col" className="px-2 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wide">
                            Investment
                          </th>
                          <th scope="col" className="px-2 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wide">
                            Gov. Uplift
                          </th>
                          <th scope="col" className="px-2 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wide">
                            Prod. Switch In
                          </th>
                          <th scope="col" className="px-2 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wide">
                            Fund Switches
                          </th>
                          <th scope="col" className="px-2 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wide">
                            Prod. Switch Out
                          </th>
                          <th scope="col" className="px-2 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wide">
                            Withdrawal
                          </th>
                          <th scope="col" className="px-2 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wide bg-green-100">
                            Valuation
                          </th>
                          <th scope="col" className="px-2 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wide bg-blue-100">
                            Profit Made
                          </th>
                          <th scope="col" className="px-2 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wide bg-purple-100">
                            Return p.a.
                          </th>
                          <th scope="col" className="px-2 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wide">
                            Risk
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {product.funds && product.funds.length > 0 ? (
                          <>
                            {product.funds.map(fund => (
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
                                  <td className="px-2 py-2 text-xs text-center">
                                    {formatCurrencyWithTruncation(fund.total_investment)}
                                  </td>
                                  <td className="px-2 py-2 text-xs text-center">
                                    {formatCurrencyWithTruncation(0)}
                                  </td>
                                  <td className="px-2 py-2 text-xs text-center">
                                    {formatCurrencyWithTruncation(0)}
                                  </td>
                                  <td className="px-2 py-2 text-xs text-center">
                                    {formatCurrencyWithTruncation(fund.total_switch_out - fund.total_switch_in)}
                                  </td>
                                  <td className="px-2 py-2 text-xs text-center">
                                    {formatCurrencyWithTruncation(0)}
                                  </td>
                                  <td className="px-2 py-2 text-xs text-center">
                                    {formatWithdrawalAmount(fund.total_withdrawal)}
                                  </td>
                                  <td className="px-2 py-2 text-xs font-semibold text-primary-700 text-center bg-green-50">
                                    {formatCurrencyWithTruncation(fund.current_valuation)}
                                  </td>
                                  <td className="px-2 py-2 text-xs text-center bg-blue-50">
                                    {(() => {
                                      const gains = fund.current_valuation + fund.total_withdrawal + 0 + fund.total_switch_out;
                                      const costs = fund.total_investment + fund.total_switch_in + 0 + 0;
                                      const profit = gains - costs;
                                      return (
                                        <span className={profit >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                                          {formatCurrencyWithTruncation(profit)}
                                        </span>
                                      );
                                    })()}
                                  </td>
                                  <td className="px-2 py-2 text-xs text-center bg-purple-50">
                                    {fund.irr !== null && fund.irr !== undefined ? (
                                      <span className={fund.irr >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                                        {formatIrrWithPrecision(fund.irr)}
                                      </span>
                                    ) : (
                                      <span className="text-gray-400">N/A</span>
                                    )}
                                  </td>
                                  <td className="px-2 py-2 text-xs text-center">
                                    {fund.fund_name === 'Previous Funds' ? (
                                      <span className="text-gray-500">N/A</span>
                                    ) : fund.risk_factor !== undefined && fund.risk_factor !== null ? (
                                      <span className="px-1 py-0.5 text-xs font-medium rounded bg-gray-100">
                                        {formatRiskFallback(fund.risk_factor)}
                                      </span>
                                    ) : (
                                      <span className="text-gray-400">-</span>
                                    )}
                                  </td>
                                </tr>
                              </React.Fragment>
                            ))}

                            {/* Product Total Row */}
                            <tr className="bg-gray-100 font-semibold border-t-2 border-gray-300">
                              <td className="px-2 py-2 text-xs text-gray-800 text-left">
                                Total
                              </td>
                              <td className="px-2 py-2 text-xs text-center">
                                {formatCurrencyWithTruncation(product.funds.reduce((sum, fund) => sum + fund.total_investment, 0))}
                              </td>
                              <td className="px-2 py-2 text-xs text-center">
                                {formatCurrencyWithTruncation(0)}
                              </td>
                              <td className="px-2 py-2 text-xs text-center">
                                {formatCurrencyWithTruncation(0)}
                              </td>
                              <td className="px-2 py-2 text-xs text-center">
                                {formatCurrencyWithTruncation(product.funds.reduce((sum, fund) => sum + (fund.total_switch_out - fund.total_switch_in), 0))}
                              </td>
                              <td className="px-2 py-2 text-xs text-center">
                                {formatCurrencyWithTruncation(0)}
                              </td>
                              <td className="px-2 py-2 text-xs text-center">
                                {formatWithdrawalAmount(product.funds.reduce((sum, fund) => sum + fund.total_withdrawal, 0))}
                              </td>
                              <td className="px-2 py-2 text-xs font-semibold text-primary-700 text-center bg-green-50">
                                {formatCurrencyWithTruncation(product.funds.reduce((sum, fund) => sum + fund.current_valuation, 0))}
                              </td>
                              <td className="px-2 py-2 text-xs text-center bg-blue-50">
                                {(() => {
                                  const totalGains = product.funds.reduce((sum, fund) => sum + (fund.current_valuation + fund.total_withdrawal + 0 + fund.total_switch_out), 0);
                                  const totalCosts = product.funds.reduce((sum, fund) => sum + (fund.total_investment + fund.total_switch_in + 0 + 0), 0);
                                  const totalProfit = totalGains - totalCosts;
                                  return (
                                    <span className={totalProfit >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                                      {formatCurrencyWithTruncation(totalProfit)}
                                    </span>
                                  );
                                })()}
                              </td>
                              <td className="px-2 py-2 text-xs text-center bg-purple-50">
                                {product.irr !== null && product.irr !== undefined ? (
                                  <span className={product.irr >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                                    {formatIrrWithPrecision(product.irr)}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">N/A</span>
                                )}
                              </td>
                              <td className="px-2 py-2 text-xs text-center">
                                {(() => {
                                  const fundsWithRisk = product.funds.filter(fund => 
                                    fund.risk_factor !== undefined && 
                                    fund.risk_factor !== null && 
                                    !fund.isVirtual
                                  );
                                  
                                  if (fundsWithRisk.length === 0) {
                                    return <span className="text-gray-400">N/A</span>;
                                  }
                                  
                                  let weightedRisk = 0;
                                  let totalWeight = 0;
                                  
                                  fundsWithRisk.forEach(fund => {
                                    const weight = fund.current_valuation || 0;
                                    weightedRisk += (fund.risk_factor! * weight);
                                    totalWeight += weight;
                                  });
                                  
                                  if (totalWeight === 0) {
                                    return <span className="text-gray-400">N/A</span>;
                                  }
                                  
                                  const avgRisk = weightedRisk / totalWeight;
                                  return (
                                    <span className="px-1 py-0.5 text-xs font-medium rounded bg-gray-200">
                                      {formatRiskFallback(avgRisk)}
                                    </span>
                                  );
                                })()}
                              </td>
                            </tr>
                          </>
                        ) : (
                          <tr>
                            <td colSpan={11} className="px-2 py-2 text-center text-gray-500">
                              No funds available for this product
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
          </div>

          {/* Summary Table */}
          <div className="mt-12 product-card print-clean">
            <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Portfolio Summary</h2>
              <div className="overflow-x-auto product-table">
                <table className="w-full table-auto divide-y divide-gray-300 landscape-table">
                  <thead className="bg-gray-100">
                    <tr>
                      <th scope="col" className="px-2 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">
                        Product
                      </th>
                      <th scope="col" className="px-2 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wide">
                        Investment
                      </th>
                      <th scope="col" className="px-2 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wide">
                        Gov. Uplift
                      </th>
                      <th scope="col" className="px-2 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wide">
                        Prod. Switch In
                      </th>
                      <th scope="col" className="px-2 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wide">
                        Fund Switches
                      </th>
                      <th scope="col" className="px-2 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wide">
                        Prod. Switch Out
                      </th>
                      <th scope="col" className="px-2 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wide">
                        Withdrawal
                      </th>
                      <th scope="col" className="px-2 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wide bg-green-100">
                        Valuation
                      </th>
                      <th scope="col" className="px-2 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wide bg-blue-100">
                        Profit Made
                      </th>
                      <th scope="col" className="px-2 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wide bg-purple-100">
                        Return p.a.
                      </th>
                      <th scope="col" className="px-2 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wide">
                        Risk
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reportData.productSummaries
                      .filter(product => {
                        // Show all products that are in the report data - if they were selected in the generator, they should appear
                        // The filtering already happened in the ReportGenerator, so we show everything passed to us
                        return true;
                      })
                      .map(product => {
                        const totalGains = product.total_withdrawal + product.current_valuation + product.total_switch_out;
                        const totalCosts = product.total_investment + product.total_switch_in;
                        const profit = totalGains - totalCosts;
                        
                        return (
                          <tr key={product.id} className={`hover:bg-blue-50 ${product.status === 'inactive' ? 'opacity-50 bg-gray-50' : ''}`}>
                            <td className={`px-2 py-2 whitespace-nowrap text-xs text-left ${product.status === 'inactive' ? 'text-gray-500' : 'text-gray-800'}`}>
                              <div className="flex items-center gap-2">
                                {product.provider_theme_color && (
                                  <div 
                                    className="w-3 h-3 rounded-full" 
                                    style={{ backgroundColor: product.provider_theme_color }}
                                  />
                                )}
                                {[product.product_type, product.provider_name, product.product_owner_name].filter(Boolean).join(' - ')}
                                {product.status === 'inactive' && (
                                  <span className="ml-2 text-xs text-red-600 font-medium">(Inactive)</span>
                                )}
                              </div>
                            </td>
                            <td className="px-2 py-2 whitespace-nowrap text-xs text-center">
                              {formatCurrencyWithTruncation(product.total_investment)}
                            </td>
                            <td className="px-2 py-2 whitespace-nowrap text-xs text-center">
                              {formatCurrencyWithTruncation(0)}
                            </td>
                            <td className="px-2 py-2 whitespace-nowrap text-xs text-center">
                              {formatCurrencyWithTruncation(0)}
                            </td>
                            <td className="px-2 py-2 whitespace-nowrap text-xs text-center">
                              {formatCurrencyWithTruncation(product.total_switch_out - product.total_switch_in)}
                            </td>
                            <td className="px-2 py-2 whitespace-nowrap text-xs text-center">
                              {formatCurrencyWithTruncation(0)}
                            </td>
                            <td className="px-2 py-2 whitespace-nowrap text-xs text-center">
                              {formatWithdrawalAmount(product.total_withdrawal)}
                            </td>
                            <td className="px-2 py-2 whitespace-nowrap text-xs font-semibold text-primary-700 text-center bg-green-50">
                              {formatCurrencyWithTruncation(product.current_valuation)}
                            </td>
                            <td className="px-2 py-2 whitespace-nowrap text-xs text-center bg-blue-50">
                              <span className={profit >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                                {formatCurrencyWithTruncation(profit)}
                              </span>
                            </td>
                            <td className="px-2 py-2 whitespace-nowrap text-xs text-center bg-purple-50">
                              {product.irr !== null && product.irr !== undefined ? (
                                <span className={product.irr >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                                  {formatIrrWithPrecision(product.irr)}
                                </span>
                              ) : (
                                <span className="text-gray-400">N/A</span>
                              )}
                            </td>
                            <td className="px-2 py-2 whitespace-nowrap text-xs text-center">
                              {product.weighted_risk !== undefined && product.weighted_risk !== null ? (
                                <span className="px-1 py-0.5 text-xs font-medium rounded bg-gray-100">
                                  {formatRiskFallback(product.weighted_risk)}
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
        </div>

        {/* IRR History Section - Force page break before */}
        <div className={`irr-history-section ${activeTab === 'irr-history' ? '' : 'hidden'} print:block`}>
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">IRR History</h2>
          </div>
          
          {loadingIrrHistory ? (
            <div className="flex items-center justify-center py-12 print-hide">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading IRR history...</p>
              </div>
            </div>
          ) : irrHistoryData ? (
            <div className="space-y-8">
              {irrHistoryData.map((productHistory: any, index: number) => {
                const product = reportData.productSummaries[index];
                
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
                const sortedDates = Array.from(allDates).sort((a, b) => new Date(b).getTime() - new Date(a).getTime()).slice(0, 12);
                
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
                  <div key={index} className={`product-card bg-white shadow-sm rounded-lg border border-gray-200 p-6 w-full print-clean ${product?.status === 'inactive' ? 'opacity-60 bg-gray-50' : ''}`}>
                    <div className="flex items-center gap-3 mb-4">
                      {product?.provider_theme_color && (
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: product.provider_theme_color }}
                        />
                      )}
                      <h3 className={`text-xl font-semibold ${product?.status === 'inactive' ? 'text-gray-600' : 'text-gray-800'}`}>
                        {[product?.product_type, product?.provider_name, product?.product_owner_name].filter(Boolean).join(' - ')}
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
                            <th scope="col" className="px-2 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wide">
                              Risk
                            </th>
                            <th scope="col" className="px-2 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wide bg-purple-100">
                              Avg Return
                            </th>
                            {sortedDates.map((date) => (
                              <th key={date} scope="col" className="px-2 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wide">
                                {(() => {
                                  const dateObj = new Date(date);
                                  const year = dateObj.getFullYear();
                                  const month = dateObj.toLocaleDateString('en-US', { month: 'long' });
                                  return `${year} ${month}`;
                                })()}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {/* Fund Rows */}
                          {productHistory.funds_historical_irr && productHistory.funds_historical_irr.length > 0 ? (
                            (() => {
                              // Separate active and inactive funds
                              const activeFunds = productHistory.funds_historical_irr.filter((fund: any) => 
                                fund.fund_status === 'active' || fund.fund_status === null
                              );
                              const inactiveFunds = productHistory.funds_historical_irr.filter((fund: any) => 
                                fund.fund_status === 'inactive'
                              );
                              
                              // Create aggregated Previous Funds entry if there are inactive funds
                              const processedFunds = [...activeFunds];
                              
                              if (inactiveFunds.length > 0) {
                                // Aggregate IRR data from all inactive funds
                                const aggregatedIrrMap = new Map();
                                
                                inactiveFunds.forEach((fund: any) => {
                                  if (fund.historical_irr) {
                                    fund.historical_irr.forEach((record: any) => {
                                      const date = record.irr_date;
                                      if (!aggregatedIrrMap.has(date)) {
                                        aggregatedIrrMap.set(date, []);
                                      }
                                      if (record.irr_result !== null && record.irr_result !== undefined) {
                                        aggregatedIrrMap.get(date).push(record.irr_result);
                                      }
                                    });
                                  }
                                });
                                
                                // Calculate average IRR for each date
                                const previousFundsIrrMap = new Map();
                                aggregatedIrrMap.forEach((irrs, date) => {
                                  if (irrs.length > 0) {
                                    const avgIrr = irrs.reduce((sum: number, irr: number) => sum + irr, 0) / irrs.length;
                                    previousFundsIrrMap.set(date, avgIrr);
                                  }
                                });
                                
                                // Create Previous Funds entry
                                const previousFundsEntry = {
                                  portfolio_fund_id: 'previous_funds',
                                  fund_name: 'Previous Funds',
                                  fund_status: 'inactive',
                                  risk_factor: null,
                                  isin_number: null,
                                  historical_irr: Array.from(previousFundsIrrMap.entries()).map(([date, irr]) => ({
                                    irr_date: date,
                                    irr_result: irr
                                  })),
                                  isVirtual: true,
                                  inactiveFundCount: inactiveFunds.length
                                };
                                
                                // Update fundIrrMaps to include Previous Funds data
                                fundIrrMaps.set('previous_funds', previousFundsIrrMap);
                                
                                processedFunds.push(previousFundsEntry);
                              }
                              
                              return processedFunds.map((fund: any, fundIndex: number) => {
                                const fundIrrMap = fundIrrMaps.get(fund.portfolio_fund_id) || new Map();
                                
                                return (
                                  <tr key={fundIndex} className={`hover:bg-blue-50 ${fund.isVirtual ? 'bg-gray-100 font-medium' : ''}`}>
                                    <td className="px-2 py-2 text-xs font-medium text-gray-800 text-left">
                                      {fund.fund_name}
                                      {fund.isVirtual && fund.inactiveFundCount && (
                                        <span className="ml-2 inline-flex items-center px-1 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-800">
                                          {fund.inactiveFundCount} {fund.inactiveFundCount === 1 ? 'fund' : 'funds'}
                                        </span>
                                      )}
                                    </td>
                                    <td className="px-2 py-2 text-xs text-center">
                                      {fund.fund_name === 'Previous Funds' ? (
                                        <span className="text-gray-500">N/A</span>
                                      ) : fund.risk_factor !== null && fund.risk_factor !== undefined ? (
                                        <span className="px-1 py-0.5 text-xs font-medium rounded bg-gray-100">
                                          {fund.risk_factor.toFixed(1)}
                                        </span>
                                      ) : (
                                        <span className="text-gray-400">-</span>
                                      )}
                                    </td>
                                    <td className="px-2 py-2 text-xs text-center bg-purple-50">
                                      {(() => {
                                        // Calculate average IRR for this fund
                                        if (fund.historical_irr && fund.historical_irr.length > 0) {
                                          const validIrrs = fund.historical_irr.filter((record: any) => 
                                            record.irr_result !== null && record.irr_result !== undefined
                                          );
                                          if (validIrrs.length > 0) {
                                            const avgIrr = validIrrs.reduce((sum: number, record: any) => sum + record.irr_result, 0) / validIrrs.length;
                                            return (
                                              <span className={avgIrr >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                                                {avgIrr.toFixed(1)}%
                                              </span>
                                            );
                                          }
                                        }
                                        return <span className="text-gray-400">N/A</span>;
                                      })()}
                                    </td>
                                    {sortedDates.map((date) => (
                                      <td key={date} className="px-2 py-2 text-xs text-center">
                                        {(() => {
                                          const irrValue = fundIrrMap.get(date);
                                          if (irrValue !== null && irrValue !== undefined) {
                                            return (
                                              <span className={irrValue >= 0 ? 'text-green-600' : 'text-red-600'}>
                                                {irrValue.toFixed(1)}%
                                              </span>
                                            );
                                          }
                                          return <span className="text-gray-400">N/A</span>;
                                        })()}
                                      </td>
                                    ))}
                                  </tr>
                                );
                              });
                            })()
                          ) : (
                            <tr>
                              <td colSpan={3 + sortedDates.length} className="px-2 py-2 text-center text-gray-500">
                                No IRR history available for this product
                              </td>
                            </tr>
                          )}

                          {/* Product Total Row */}
                          <tr className="bg-gray-100 font-semibold border-t-2 border-gray-300">
                            <td className="px-2 py-2 text-xs text-gray-800 text-left">
                              Product Total
                            </td>
                            <td className="px-2 py-2 text-xs text-center">
                              {(() => {
                                // Calculate weighted risk for this product's funds (excluding inactive funds)
                                // Use fund valuations from the report summary data for weighting
                                let weightedRisk = 0;
                                let totalWeightedValue = 0;
                                
                                if (productHistory.funds_historical_irr && product?.funds) {
                                  // Create a map of fund names to their current valuations from report summary
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
                                    <span className="px-1 py-0.5 text-xs font-medium rounded bg-gray-200">
                                      {weightedRisk.toFixed(1)}
                                    </span>
                                  );
                                } else {
                                  // Check if we have funds with risk factors but zero valuations
                                  const fundsWithRiskFactors = productHistory.funds_historical_irr?.filter(
                                    (fund: any) => fund.risk_factor !== undefined && 
                                           fund.risk_factor !== null && 
                                           fund.fund_status !== 'inactive' &&
                                           !fund.fund_name?.includes('Previous Funds')
                                  ) || [];
                                  
                                  if (fundsWithRiskFactors.length > 0) {
                                    // If we have funds with risk factors but zero total valuation, show 0.0
                                    return (
                                      <span className="px-1 py-0.5 text-xs font-medium rounded bg-gray-200">
                                        0.0
                                      </span>
                                    );
                                  } else {
                                    // If no funds have risk factors, show N/A
                                    return <span className="text-gray-400">N/A</span>;
                                  }
                                }
                              })()}
                            </td>
                            <td className="px-2 py-2 text-xs text-center bg-purple-50">
                              {(() => {
                                // Calculate average IRR across all portfolio IRR values
                                if (productHistory.portfolio_historical_irr && productHistory.portfolio_historical_irr.length > 0) {
                                  const validIrrs = productHistory.portfolio_historical_irr.filter((record: any) => 
                                    record.irr_result !== null && record.irr_result !== undefined
                                  );
                                  if (validIrrs.length > 0) {
                                    const avgIrr = validIrrs.reduce((sum: number, record: any) => sum + record.irr_result, 0) / validIrrs.length;
                                    return (
                                      <span className={avgIrr >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                                        {avgIrr.toFixed(1)}%
                                      </span>
                                    );
                                  }
                                }
                                return <span className="text-gray-400">N/A</span>;
                              })()}
                            </td>
                            {sortedDates.map((date) => (
                              <td key={date} className="px-2 py-2 text-xs text-center">
                                {(() => {
                                  const portfolioIrr = portfolioIrrMap.get(date);
                                  if (portfolioIrr !== null && portfolioIrr !== undefined) {
                                    return (
                                      <span className={portfolioIrr >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                                        {portfolioIrr.toFixed(1)}%
                                      </span>
                                    );
                                  }
                                  return <span className="text-gray-400">N/A</span>;
                                })()}
                              </td>
                            ))}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 print-hide">
              Click "IRR History" tab to load historical data
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportDisplay;