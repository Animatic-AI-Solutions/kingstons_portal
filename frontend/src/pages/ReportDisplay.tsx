import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, PrinterIcon } from '@heroicons/react/24/outline';
import { formatDateFallback, formatCurrencyFallback, formatPercentageFallback } from '../components/reports/shared/ReportFormatters';

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

  const [showInactiveProductDetails, setShowInactiveProductDetails] = useState<Set<number>>(new Set());

  useEffect(() => {
    // Get report data from navigation state
    if (location.state && location.state.reportData) {
      setReportData(location.state.reportData);
    } else {
      // If no report data, redirect back to report generator
      navigate('/report-generator');
    }
  }, [location.state, navigate]);

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
    
    if (reportData.truncateAmounts) {
      return `£${Math.trunc(amount).toLocaleString()}`;
    }
    
    return formatCurrencyFallback(amount);
  };

  const formatIrrWithPrecision = (irr: number | null | undefined): string => {
    if (irr === null || irr === undefined) return '-';
    
    if (reportData.roundIrrToOne) {
      return `${irr.toFixed(1)}%`;
    }
    
    return formatPercentageFallback(irr);
  };

  const formatWithdrawalAmount = (amount: number | null | undefined): string => {
    if (amount === null || amount === undefined) return '-';
    if (amount === 0) return formatCurrencyWithTruncation(amount);
    const displayAmount = reportData.formatWithdrawalsAsNegative ? -Math.abs(amount) : amount;
    return formatCurrencyWithTruncation(displayAmount);
  };

  const formatRiskFallback = (risk: number | undefined): string => {
    if (risk === undefined) return '-';
    
    // If it's a whole number, display without decimal places
    if (Number.isInteger(risk)) {
      return risk.toString();
    }
    
    // Otherwise, round to 1 decimal place
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

  const handlePrint = () => {
    window.print();
  };

  const handleBackToGenerator = () => {
    navigate('/report-generator');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with navigation and actions */}
      <div className="bg-white shadow-sm border-b border-gray-200 print:hidden">
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
      <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

        {/* Portfolio Total Average Return */}
        {reportData.totalIRR !== null && (
          <div className="mb-8 bg-white shadow-sm rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Portfolio Performance</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="text-sm font-medium text-purple-700 mb-1">Portfolio Total Average Return</div>
                <div className={`text-2xl font-bold ${reportData.totalIRR >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatIrrWithPrecision(reportData.totalIRR)}
                </div>
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
        )}

        {/* Product Period Overview */}
        <div className="mb-8">
          <h2 className="text-2xl font-normal text-gray-900 font-sans tracking-wide mb-4">
            Product Period Overview
          </h2>
          
          {reportData.productSummaries
            .filter(product => {
              // For inactive products, only show if they should be shown
              if (product.status === 'inactive') {
                return reportData.showInactiveProducts || showInactiveProductDetails.has(product.id);
              }
              return true;
            })
            .map(product => (
            <div key={product.id} className={`mb-8 bg-white shadow-sm rounded-lg border border-gray-200 p-6 w-full ${product.status === 'inactive' ? 'opacity-60 bg-gray-50' : ''}`}>
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

              <div className="overflow-x-auto">
                <table className="w-full table-auto divide-y divide-gray-300">
                  <thead className="bg-gray-100">
                    <tr>
                      <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                        Fund Name
                      </th>
                      <th scope="col" className="px-4 py-3 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider">
                        Investment
                      </th>
                      <th scope="col" className="px-4 py-3 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider">
                        Government Uplift
                      </th>
                      <th scope="col" className="px-4 py-3 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider">
                        Product Switch In
                      </th>
                      <th scope="col" className="px-4 py-3 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider">
                        All Fund Switches
                      </th>
                      <th scope="col" className="px-4 py-3 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider">
                        Product Switch Out
                      </th>
                      <th scope="col" className="px-4 py-3 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider">
                        Withdrawal
                      </th>
                      <th scope="col" className="px-4 py-3 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider bg-green-100">
                        Valuation
                      </th>
                      <th scope="col" className="px-4 py-3 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider bg-blue-100">
                        Profit Made
                      </th>
                      <th scope="col" className="px-4 py-3 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider bg-purple-100">
                        Average Return p.a.
                      </th>
                      <th scope="col" className="px-4 py-3 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider">
                        Risk
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {product.funds && product.funds.length > 0 ? (
                      product.funds.map(fund => (
                        <React.Fragment key={fund.id}>
                          <tr 
                            className={`hover:bg-blue-50 ${fund.isVirtual ? 'bg-gray-100 font-medium' : ''}`}
                          >
                            <td className="px-4 py-3 text-sm font-medium text-gray-800 text-left">
                              {fund.fund_name}
                              {fund.isVirtual && fund.inactiveFundCount && (
                                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-800">
                                  {fund.inactiveFundCount} {fund.inactiveFundCount === 1 ? 'fund' : 'funds'}
                                </span>
                              )}

                            </td>
                            <td className="px-4 py-3 text-sm text-center">
                              {formatCurrencyWithTruncation(fund.total_investment)}
                            </td>
                            <td className="px-4 py-3 text-sm text-center">
                              {formatCurrencyWithTruncation(0)}
                            </td>
                            <td className="px-4 py-3 text-sm text-center">
                              {formatCurrencyWithTruncation(0)}
                            </td>
                            <td className="px-4 py-3 text-sm text-center">
                              {formatCurrencyWithTruncation(fund.total_switch_out - fund.total_switch_in)}
                            </td>
                            <td className="px-4 py-3 text-sm text-center">
                              {formatCurrencyWithTruncation(0)}
                            </td>
                            <td className="px-4 py-3 text-sm text-center">
                              {formatWithdrawalAmount(fund.total_withdrawal)}
                            </td>
                            <td className="px-4 py-3 text-sm font-semibold text-primary-700 text-center bg-green-50">
                              {formatCurrencyWithTruncation(fund.current_valuation)}
                            </td>
                            <td className="px-4 py-3 text-sm text-center bg-blue-50">
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
                            <td className="px-4 py-3 text-sm text-center bg-purple-50">
                              {fund.isVirtual && fund.fund_name !== 'Previous Funds' ? (
                                <span className="text-gray-500">-</span>
                              ) : fund.irr !== null ? (
                                <span className={fund.irr >= 0 ? 'text-green-600' : 'text-red-600'}>
                                  {formatIrrWithPrecision(fund.irr)}
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm text-center">
                              {fund.isVirtual && fund.fund_name !== 'Previous Funds' ? (
                                <span className="text-gray-500">-</span>
                              ) : fund.risk_factor !== undefined && fund.risk_factor !== null ? (
                                <span className="px-2 py-1 text-xs font-medium rounded bg-gray-100">
                                  {formatRiskFallback(fund.risk_factor)}
                                </span>
                              ) : (
                                <span className="text-gray-500">-</span>
                              )}
                            </td>
                          </tr>

                        </React.Fragment>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={11} className="px-4 py-4 text-center text-sm text-gray-500">
                          No fund data available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>

        {/* Portfolio Summary Table - Moved to end */}
        {reportData.productSummaries.length > 0 && (
          <div className="mb-8 bg-white shadow-sm rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Portfolio Summary</h2>
            <div className="overflow-x-auto">
              <table className="w-full table-auto divide-y divide-gray-300">
                <thead className="bg-gray-100">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                      Product
                    </th>
                    <th scope="col" className="px-4 py-3 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider">
                      Investment
                    </th>
                    <th scope="col" className="px-4 py-3 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider">
                      Government Uplift
                    </th>
                    <th scope="col" className="px-4 py-3 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider">
                      Product Switch In
                    </th>
                    <th scope="col" className="px-4 py-3 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider">
                      All Fund Switches
                    </th>
                    <th scope="col" className="px-4 py-3 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider">
                      Product Switch Out
                    </th>
                    <th scope="col" className="px-4 py-3 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider">
                      Withdrawal
                    </th>
                    <th scope="col" className="px-4 py-3 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider bg-green-100">
                      Valuation
                    </th>
                    <th scope="col" className="px-4 py-3 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider bg-blue-100">
                      Profit Made
                    </th>
                    <th scope="col" className="px-4 py-3 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider bg-purple-100">
                      Average Return p.a.
                    </th>
                    <th scope="col" className="px-4 py-3 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider">
                      Risk
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reportData.productSummaries
                    .filter(product => {
                      // For inactive products, only show if they should be shown
                      if (product.status === 'inactive') {
                        return reportData.showInactiveProducts || showInactiveProductDetails.has(product.id);
                      }
                      return true;
                    })
                    .map(product => {
                      // Calculate weighted risk for this product
                      let weightedRisk = 0;
                      let totalWeightedValue = 0;
                      
                      if (product.funds && product.funds.length > 0) {
                        // Include portfolio funds with risk factors (including zero valuations)
                        const fundsWithRisk = product.funds.filter(
                          fund => fund.risk_factor !== undefined && 
                                 fund.risk_factor !== null && 
                                 fund.current_valuation >= 0 &&
                                 !fund.isVirtual
                        );
                        
                        if (fundsWithRisk.length > 0) {
                          // Calculate total value of funds with risk factors
                          const totalValueWithRisk = fundsWithRisk.reduce(
                            (sum, fund) => sum + fund.current_valuation, 0
                          );
                          
                          // Calculate weighted average risk based on fund valuations
                          if (totalValueWithRisk > 0) {
                            const riskSum = fundsWithRisk.reduce(
                              (sum, fund) => sum + ((fund.risk_factor || 0) * fund.current_valuation), 
                              0
                            );
                            weightedRisk = riskSum / totalValueWithRisk;
                            totalWeightedValue = totalValueWithRisk;
                          } else {
                            // If all funds have zero valuation, weighted risk should be zero
                            weightedRisk = 0;
                            totalWeightedValue = 1; // Set to 1 to indicate we have a valid risk calculation (zero)
                          }
                        }
                      }
                      
                      return (
                        <tr key={product.id} className={`hover:bg-blue-50 ${product.status === 'inactive' ? 'opacity-50 bg-gray-50' : ''}`}>
                          <td className={`px-4 py-3 whitespace-nowrap text-sm text-left ${product.status === 'inactive' ? 'text-gray-500' : 'text-gray-800'}`}>
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
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                            {formatCurrencyWithTruncation(product.total_investment)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                            {formatCurrencyWithTruncation(0)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                            {formatCurrencyWithTruncation(0)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                            {formatCurrencyWithTruncation(product.total_switch_out - product.total_switch_in)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                            {formatCurrencyWithTruncation(0)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                            {formatWithdrawalAmount(product.total_withdrawal)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-primary-700 text-center bg-green-50">
                            {formatCurrencyWithTruncation(product.current_valuation)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-center bg-blue-50">
                            {(() => {
                              const gains = product.current_valuation + product.total_withdrawal + 0 + product.total_switch_out;
                              const costs = product.total_investment + product.total_switch_in + 0 + 0;
                              const profit = gains - costs;
                              return (
                                <span className={profit >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                                  {formatCurrencyWithTruncation(profit)}
                                </span>
                              );
                            })()}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-center bg-purple-50">
                            {product.irr !== null ? (
                              <span className={product.irr >= 0 ? 'text-green-600' : 'text-red-600'}>
                                {formatIrrWithPrecision(product.irr)}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                            {totalWeightedValue > 0 ? (
                              <span className="px-2 py-1 text-xs font-medium rounded bg-gray-100">
                                {Number.isInteger(weightedRisk) ? weightedRisk.toString() : weightedRisk.toFixed(1)}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  
                  {/* Grand total row */}
                  <tr className="bg-gray-100 font-semibold border-t-2 border-gray-400">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800 text-left">
                      PORTFOLIO TOTAL ({reportData.productSummaries.length} {reportData.productSummaries.length === 1 ? 'Product' : 'Products'})
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                      {formatCurrencyWithTruncation(reportData.productSummaries.reduce((sum, product) => sum + product.total_investment, 0))}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                      {formatCurrencyWithTruncation(0)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                      {formatCurrencyWithTruncation(0)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                      {formatCurrencyWithTruncation(reportData.productSummaries.reduce((sum, product) => sum + (product.total_switch_out - product.total_switch_in), 0))}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                      {formatCurrencyWithTruncation(0)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                      {formatWithdrawalAmount(reportData.productSummaries.reduce((sum, product) => sum + product.total_withdrawal, 0))}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-primary-700 text-center bg-green-50">
                      {formatCurrencyWithTruncation(reportData.productSummaries.reduce((sum, product) => sum + product.current_valuation, 0))}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-center bg-blue-50">
                      {(() => {
                        const totalGains = reportData.productSummaries.reduce((sum, product) => sum + product.current_valuation + product.total_withdrawal + 0 + product.total_switch_out, 0);
                        const totalCosts = reportData.productSummaries.reduce((sum, product) => sum + product.total_investment + product.total_switch_in + 0 + 0, 0);
                        const totalProfit = totalGains - totalCosts;
                        return (
                          <span className={totalProfit >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                            {formatCurrencyWithTruncation(totalProfit)}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-center bg-purple-50">
                      {reportData.totalIRR !== null ? (
                        <span className={reportData.totalIRR >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {formatIrrWithPrecision(reportData.totalIRR)}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                      {(() => {
                        // Calculate portfolio-wide weighted risk factor
                        let portfolioWeightedRisk = 0;
                        let portfolioTotalValueWithRisk = 0;
                        
                        // Go through all products and their funds
                        reportData.productSummaries.forEach((product, index) => {
                          if (product.funds && product.funds.length > 0) {
                            // Include portfolio funds with risk factors (including zero valuations)
                            const fundsWithRisk = product.funds.filter(
                              fund => fund.risk_factor !== undefined && 
                                     fund.risk_factor !== null && 
                                     fund.current_valuation >= 0 &&
                                     !fund.isVirtual
                            );
                            
                            fundsWithRisk.forEach(fund => {
                              const contribution = (fund.risk_factor || 0) * fund.current_valuation;
                              portfolioTotalValueWithRisk += fund.current_valuation;
                              portfolioWeightedRisk += contribution;
                            });
                          }
                        });
                        
                        if (portfolioTotalValueWithRisk > 0) {
                          const finalWeightedRisk = portfolioWeightedRisk / portfolioTotalValueWithRisk;
                          return (
                            <span className="px-2 py-1 text-xs font-medium rounded bg-gray-200">
                              {Number.isInteger(finalWeightedRisk) ? finalWeightedRisk.toString() : finalWeightedRisk.toFixed(1)}
                            </span>
                          );
                        } else {
                          // Check if we have funds with risk factors but zero valuations
                          let totalFundsWithRisk = 0;
                          
                          reportData.productSummaries.forEach(product => {
                            if (product.funds && product.funds.length > 0) {
                              const fundsWithRisk = product.funds.filter(
                                fund => fund.risk_factor !== undefined && 
                                       fund.risk_factor !== null && 
                                       fund.current_valuation >= 0 &&
                                       !fund.isVirtual
                              );
                              
                              totalFundsWithRisk += fundsWithRisk.length;
                            }
                          });
                          
                          if (totalFundsWithRisk > 0) {
                            // If we have funds with risk factors but all have zero valuation, show 0
                            return (
                              <span className="px-2 py-1 text-xs font-medium rounded bg-gray-200">
                                0
                              </span>
                            );
                          }
                        }
                        
                        return <span className="text-gray-400">-</span>;
                      })()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportDisplay;