/**
 * ReportDisplayPage - Page wrapper for the refactored report display system
 * Integrates the old data loading logic with new refactored components
 */

import React, { useState, useEffect, useMemo } from 'react';
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
    processHistoricalIRRData,
    calculateRealTimeTotalIRR
  } = useIRRCalculationService(api);

  // Initialize report data from location state (same as old ReportDisplay)
  useEffect(() => {
    const initializeReportData = async () => {
      console.log('🔍 [REPORT DISPLAY DEBUG] Initializing report data...');
      
      if (!location.state || !location.state.reportData) {
        console.error('❌ No report data found in location state');
        navigate('/reporting');
        return;
      }

      const data = location.state.reportData as ReportData;
      console.log('🔍 [REPORT DISPLAY DEBUG] Received report data with', data.productSummaries?.length, 'products');
      
      setReportData(data);
      setStateReportData(data);
      setIsInitialLoading(false);
      
      // Initialize IRR data loading (background processes)
      if (data.productSummaries?.length > 0) {
        try {
          // Load portfolio IRR values
          const portfolioIrrValues = await fetchPortfolioIrrValues(data.productSummaries);
          setPortfolioIrrValues(portfolioIrrValues);
          
          // Process historical IRR data if available
          const historicalIrrData = await processHistoricalIRRData(data);
          setIrrHistoryData(historicalIrrData);
          
          // Calculate real-time total IRR
          const totalIrrResult = await calculateRealTimeTotalIRR(data);
          if (totalIrrResult.success && totalIrrResult.irr !== null) {
            setRealTimeTotalIRR(totalIrrResult.irr);
          }
        } catch (error) {
          console.error('❌ Error loading IRR data:', error);
        }
      }
    };

    initializeReportData();
  }, [location.state, navigate, setStateReportData, fetchPortfolioIrrValues, processHistoricalIRRData, calculateRealTimeTotalIRR]);

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
        {activeTab === REPORT_TABS.SUMMARY && (
          <SummaryTab reportData={reportData} />
        )}
        {activeTab === REPORT_TABS.IRR_HISTORY && (
          <IRRHistoryTab reportData={reportData} />
        )}
      </ReportContainer>
    </ReportErrorBoundary>
  );
};

export default ReportDisplayPage; 