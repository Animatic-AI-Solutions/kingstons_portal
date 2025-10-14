/**
 * ReportDisplayPage - Page wrapper for the refactored report display system
 * Integrates the old data loading logic with new refactored components
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createIRRDataService } from '../services/irrDataService';
import historicalIRRService from '../services/historicalIRRService';
import api from '../services/api';

import { ReportContainer, SummaryTab, IRRHistoryTab, ReportErrorBoundary } from '../components/report';
import { useReportStateManager } from '../hooks/report/useReportStateManager';
import { useIRRCalculationService } from '../hooks/report/useIRRCalculationService';
import { REPORT_TABS } from '../utils/reportConstants';
import type { ReportData } from '../types/reportTypes';

const ReportDisplayPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Local state for data loading
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  
  // Create IRR data service instance
  const irrDataService = useMemo(() => createIRRDataService(api), []);
  
  // State management from refactored services
  const {
    state: { activeTab },
    actions: { setReportData: setStateReportData, setPortfolioIrrValues, setIrrHistoryData, setRealTimeTotalIRR, setCustomProductOwnerNames }
  } = useReportStateManager();
  
  // IRR calculation service
  const {
    processHistoricalIRRData
  } = useIRRCalculationService(api);

  // Flag to track if data has been initialized
  const hasInitialized = useRef(false);

  // Memoize reportData to prevent unnecessary re-renders of child components
  const memoizedReportData = useMemo(() => reportData, [reportData]);

  // Reset custom product owner names when component unmounts (cleanup)
  useEffect(() => {
    return () => {
      // Reset custom product owner names when leaving the report page
      setCustomProductOwnerNames(null);
      console.log('🔄 [REPORT DISPLAY CLEANUP] Reset custom product owner names on unmount');
    };
  }, [setCustomProductOwnerNames]);

  // Initialize report data from location state (fixed to prevent infinite loop)
  useEffect(() => {
    // Prevent multiple initializations
    if (hasInitialized.current) return;

    const initializeReportData = async () => {
      console.log('🔍 [REPORT DISPLAY DEBUG] Initializing report data...');

      // Reset custom product owner names to prevent caching across different reports
      setCustomProductOwnerNames(null);
      console.log('🔄 [REPORT DISPLAY DEBUG] Reset custom product owner names on init');

      if (!location.state || !location.state.reportData) {
        console.error('❌ No report data found in location state');
        navigate('/reporting');
        return;
      }

      const data = location.state.reportData as ReportData;
      const clientGroupIds = location.state.clientGroupIds as (string | number)[];
      console.log('🔍 [REPORT DISPLAY DEBUG] Received report data with', data.productSummaries?.length, 'products');
      
      setReportData(data);
      setStateReportData(data);
      setIsInitialLoading(false);
      hasInitialized.current = true;
      
      // Initialize IRR data loading (background processes)
      if (data.productSummaries?.length > 0) {
        try {
          // Extract portfolio IRR values directly from reportData (already fetched in ReportGenerator)
          const portfolioIrrValues = new Map<number, number>();
          data.productSummaries.forEach(product => {
            if (product.irr !== null && product.irr !== undefined) {
              portfolioIrrValues.set(product.id, product.irr);
            }
          });
          console.log('🎯 [OPTIMIZATION] Using pre-fetched portfolio IRR values from reportData:', Object.fromEntries(portfolioIrrValues));
          setPortfolioIrrValues(portfolioIrrValues);
          
          // Process historical IRR data if available
          const historicalIrrData = await processHistoricalIRRData(data);
          setIrrHistoryData(historicalIrrData);
          console.log('🔍 [IRR HISTORY DEBUG] Processed historical IRR data:', {
            length: historicalIrrData.length,
            sample: historicalIrrData[0]
          });
          
          // Calculate real-time total IRR using all activities from all products selected
          try {
            console.log('🔍 ========== TOTAL IRR CALCULATION DEBUG START ==========');
            console.log(`🔍 [TOTAL IRR] Total products in productSummaries: ${data.productSummaries.length}`);

            // Log all products and their details
            data.productSummaries.forEach((product, index) => {
              console.log(`🔍 [PRODUCT ${index + 1}] Product ID: ${product.id}, Name: ${product.product_name}, Status: ${product.status}`);
              console.log(`   └─ IRR: ${product.irr !== null && product.irr !== undefined ? product.irr + '%' : 'N/A'}`);
              console.log(`   └─ Has funds: ${!!product.funds}, Funds count: ${product.funds?.length || 0}`);

              if (product.funds && product.funds.length > 0) {
                product.funds.forEach((fund, fIndex) => {
                  if (fund.isVirtual) {
                    console.log(`   └─ [FUND ${fIndex + 1}] ${fund.fund_name} (VIRTUAL) - Inactive funds: ${fund.inactiveFunds?.length || 0}`);
                    if (fund.inactiveFunds && fund.inactiveFunds.length > 0) {
                      fund.inactiveFunds.forEach((inactiveFund, ifIndex) => {
                        console.log(`      └─ [INACTIVE ${ifIndex + 1}] ID: ${inactiveFund.id}, Name: ${inactiveFund.fund_name}`);
                      });
                    }
                  } else {
                    console.log(`   └─ [FUND ${fIndex + 1}] ID: ${fund.id}, Name: ${fund.fund_name}`);
                  }
                });
              }
            });

            // Extract all portfolio fund IDs from all selected products
            // IMPORTANT: Include funds from ALL products (active, inactive, and lapsed)
            // IMPORTANT: Include both active funds AND inactive funds (from Previous Funds virtual entry)
            const allPortfolioFundIds: number[] = [];

            console.log('🔍 [TOTAL IRR] Starting fund ID collection...');

            data.productSummaries.forEach(product => {
              if (product.funds) {
                product.funds.forEach(fund => {
                  if (fund.isVirtual && fund.inactiveFunds) {
                    // Extract inactive fund IDs from "Previous Funds" virtual entry
                    console.log(`✅ [TOTAL IRR] Collecting inactive funds from Previous Funds virtual entry in product ${product.id}`);
                    fund.inactiveFunds.forEach(inactiveFund => {
                      if (inactiveFund.id > 0) {
                        allPortfolioFundIds.push(inactiveFund.id);
                        console.log(`   ✅ Added inactive fund ID: ${inactiveFund.id} (${inactiveFund.fund_name})`);
                      }
                    });
                  } else if (!fund.isVirtual && fund.id > 0) {
                    // Add active fund IDs
                    allPortfolioFundIds.push(fund.id);
                    console.log(`   ✅ Added active fund ID: ${fund.id} (${fund.fund_name}) from product ${product.id}`);
                  }
                });
              }
            });

            console.log(`🎯 [TOTAL IRR] Collected ${allPortfolioFundIds.length} total fund IDs for IRR calculation`);
            console.log(`🎯 [TOTAL IRR] Fund IDs:`, allPortfolioFundIds);
            
            if (allPortfolioFundIds.length > 0) {
              // Get the end date from report data (use latest valuation date)
              let endDate: string | undefined = undefined;
              if (data.selectedValuationDate) {
                // Convert YYYY-MM format to YYYY-MM-DD (last day of month)
                const [year, month] = data.selectedValuationDate.split('-').map(part => parseInt(part));
                const lastDayOfMonth = new Date(year, month, 0).getDate();
                endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`;
              }
              
              console.log(`🎯 [TOTAL IRR] Using end date for real-time IRR: ${endDate}`);
              console.log(`🎯 [TOTAL IRR] Calling IRR API with ${allPortfolioFundIds.length} fund IDs...`);

              // Calculate real-time total IRR using all portfolio fund IDs
              const totalIRRData = await irrDataService.getOptimizedIRRData({
                portfolioFundIds: allPortfolioFundIds,
                endDate: endDate,
                includeHistorical: false
              });

              console.log('✅ [TOTAL IRR] API Response:', totalIRRData);
              console.log(`✅ [TOTAL IRR] Calculated Total IRR: ${totalIRRData.portfolioIRR}%`);

              // Compare with individual product IRRs
              console.log('🔍 [TOTAL IRR] Individual Product IRRs for comparison:');
              data.productSummaries.forEach((product, index) => {
                const productIRR = product.irr !== null && product.irr !== undefined ? product.irr : 'N/A';
                console.log(`   Product ${index + 1} (${product.product_name}, Status: ${product.status}): ${productIRR}%`);
              });

              setRealTimeTotalIRR(totalIRRData.portfolioIRR);
              console.log('🔍 ========== TOTAL IRR CALCULATION DEBUG END ==========');
            } else {
              console.warn('❌ No portfolio fund IDs found for total IRR calculation');
              setRealTimeTotalIRR(null);
            }
          } catch (irrError) {
            console.error('❌ Error calculating real-time total IRR:', irrError);
            setRealTimeTotalIRR(null);
          }
        } catch (error) {
          console.error('❌ Error loading IRR data:', error);
        }
      }
    };

    initializeReportData();
  }, [location.state, navigate]); // Using ref to prevent multiple initialization, so function dependencies not needed

  // Authentication check
  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  // Loading state
  if (isInitialLoading || !reportData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading report data...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (!reportData.productSummaries || reportData.productSummaries.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Data Available</h2>
          <p className="text-gray-600 mb-4">No products found for the selected time period.</p>
          <button
            onClick={() => navigate('/reporting')}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
          >
            Back to Report Generator
          </button>
        </div>
      </div>
    );
  }

  return (
    <ReportErrorBoundary>
      <ReportContainer reportData={reportData}>
        {/* Summary Tab - Always rendered for print, conditionally displayed for screen */}
        <div className={`${activeTab === REPORT_TABS.SUMMARY ? '' : 'hidden print:block'}`}>
          <SummaryTab reportData={memoizedReportData} />
        </div>
        
        {/* IRR History Tab - Always rendered for print, conditionally displayed for screen */}
        <div className={`${activeTab === REPORT_TABS.IRR_HISTORY ? '' : 'hidden print:block'}`}>
          <IRRHistoryTab reportData={memoizedReportData} />
        </div>
      </ReportContainer>
    </ReportErrorBoundary>
  );
};

export default ReportDisplayPage; 