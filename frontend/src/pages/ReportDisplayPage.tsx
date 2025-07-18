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
    actions: { setReportData: setStateReportData, setPortfolioIrrValues, setIrrHistoryData, setRealTimeTotalIRR }
  } = useReportStateManager();
  
  // IRR calculation service
  const {
    fetchPortfolioIrrValues,
    processHistoricalIRRData
  } = useIRRCalculationService(api);

  // Flag to track if data has been initialized
  const hasInitialized = useRef(false);

  // Initialize report data from location state (fixed to prevent infinite loop)
  useEffect(() => {
    // Prevent multiple initializations
    if (hasInitialized.current) return;

    const initializeReportData = async () => {
      console.log('🔍 [REPORT DISPLAY DEBUG] Initializing report data...');
      
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
          // Load portfolio IRR values
          const portfolioIrrValues = await fetchPortfolioIrrValues(data.productSummaries);
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
            // Extract all portfolio fund IDs from all selected products
            const allPortfolioFundIds: number[] = [];
            data.productSummaries.forEach(product => {
              if (product.funds) {
                product.funds.forEach(fund => {
                  // Filter out virtual funds and ensure valid ID (same logic as ReportGenerator)
                  if (!fund.isVirtual && fund.id > 0) {
                    allPortfolioFundIds.push(fund.id);
                  }
                });
              }
            });
            
            console.log(`🎯 [REPORT DISPLAY] Calculating real-time total IRR for ${allPortfolioFundIds.length} portfolio funds:`, allPortfolioFundIds);
            
            if (allPortfolioFundIds.length > 0) {
              // Get the end date from report data (use latest valuation date)
              let endDate: string | undefined = undefined;
              if (data.selectedValuationDate) {
                // Convert YYYY-MM format to YYYY-MM-DD (last day of month)
                const [year, month] = data.selectedValuationDate.split('-').map(part => parseInt(part));
                const lastDayOfMonth = new Date(year, month, 0).getDate();
                endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`;
              }
              
              console.log(`🎯 [REPORT DISPLAY] Using end date for real-time IRR: ${endDate}`);
              
              // Calculate real-time total IRR using all portfolio fund IDs
              const totalIRRData = await irrDataService.getOptimizedIRRData({
                portfolioFundIds: allPortfolioFundIds,
                endDate: endDate,
                includeHistorical: false
              });
              
              console.log('🎯 [REPORT DISPLAY] Real-time total IRR response:', totalIRRData);
              setRealTimeTotalIRR(totalIRRData.portfolioIRR);
              console.log(`🎯 [REPORT DISPLAY] Set real-time total IRR: ${totalIRRData.portfolioIRR}%`);
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
          <SummaryTab reportData={reportData} />
        </div>
        
        {/* IRR History Tab - Always rendered for print, conditionally displayed for screen */}
        <div className={`${activeTab === REPORT_TABS.IRR_HISTORY ? '' : 'hidden print:block'}`}>
          <IRRHistoryTab reportData={reportData} />
        </div>
      </ReportContainer>
    </ReportErrorBoundary>
  );
};

export default ReportDisplayPage; 