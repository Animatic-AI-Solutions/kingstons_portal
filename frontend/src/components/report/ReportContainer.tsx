/**
 * ReportContainer - Main layout container for report display
 * Part of Phase 2 refactoring - extracted from ReportDisplay component
 * 
 * This component provides the main layout structure including:
 * - Navigation header with back button and action controls
 * - Report title and metadata
 * - Tab navigation between Summary and IRR History
 * - Print functionality integration
 */

import React, { useRef, useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { PrinterIcon, EyeIcon, EyeSlashIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline';
import { useReportStateManager } from '../../hooks/report/useReportStateManager';
import { PrintService } from '../../services/report/PrintService';
import { REPORT_TABS, type ReportTab } from '../../utils/reportConstants';
import type { ReportData } from '../../types/reportTypes';
import ProductTitleModal from './ProductTitleModal';
import ProductOwnerModal from './ProductOwnerModal';
import PrintInstructionsModal from '../ui/PrintInstructionsModal';
import { formatFamilyNames, testFamilyNameFormatting } from '../../utils/familyNameFormatter';

// Extend window interface for development testing
declare global {
  interface Window {
    familyFormatterTestRun?: boolean;
  }
}

interface ReportContainerProps {
  reportData: ReportData;
  children: React.ReactNode;
  clientGroups?: Array<{ id: number; name: string }>;
}

export const ReportContainer: React.FC<ReportContainerProps> = React.memo(({
  reportData,
  children,
  clientGroups = []
}) => {
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);
  const [showPrintInstructions, setShowPrintInstructions] = useState(false);
  
  // State management from Phase 1 services
  const {
    state: {
      activeTab,
      hideZeros,
      visualSigning,
      hideCashIRR,
      customTitles,
      customProductOwnerNames,
      loading,
      realTimeTotalIRR,
      irrHistoryData
    },
    actions: {
      setActiveTab,
      setHideZeros,
      setVisualSigning,
      setHideCashIRR,
      setShowTitleModal,
      setShowProductOwnerModal,
      setIrrHistoryData
    }
  } = useReportStateManager();

  // PERFORMANCE OPTIMIZATION: Memoized computed values
  const reportTitle = useMemo(() => 
    `Report_${reportData.timePeriod?.replace(/\s+/g, '_') || 'Export'}.pdf`,
    [reportData.timePeriod]
  );

  // Initialize print service with comprehensive options
  const printService = useMemo(() => {
    const service = new PrintService({
      orientation: 'landscape',
      margins: {
        top: '1.2in',
        right: '0.05in',
        bottom: '0.2in',
        left: '0.05in'
      },
      preserveColors: true,
      customStyles: `
        /* Print-only Company Logo Header */
        .print-logo-header {
          display: none;
        }
        
        @media print {
          .print-logo-header {
            display: block !important;
            text-align: center;
            margin-bottom: 2rem;
            padding-bottom: 1rem;
            border-bottom: 2px solid #1f2937;
          }
          
          .print-logo-header h1 {
            font-size: 24px !important;
            font-weight: bold;
            color: #1f2937 !important;
            margin: 0 !important;
          }
          
          .print-logo-header p {
            font-size: 14px !important;
            color: #6b7280 !important;
            margin: 0.5rem 0 0 0 !important;
          }
        }
      `
    });
    
    return service;
  }, []);

  // React-to-print configuration with comprehensive print service
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: reportTitle,
    pageStyle: printService.generatePrintStyles(),
    onBeforePrint: async () => {
      // Note: History loading is handled by individual components
      return Promise.resolve();
    },
    onAfterPrint: () => {
      // Print process completed
    },
    onPrintError: (errorLocation, error) => {
      console.error('❌ [PRINT] Print error at', errorLocation, ':', error);
    }
  });

  const productOwnerDisplay = useMemo(() => {
    // Use custom names if they exist, otherwise use the properly formatted names from reportData
    if (customProductOwnerNames) {
      return customProductOwnerNames;
    }

    if (reportData.productOwnerNames.length === 0) {
      return '';
    }

    // reportData.productOwnerNames now contains properly formatted names with known_as support
    // from the extractProductOwners function, format them with family grouping logic

    // Run tests only once on development
    if (process.env.NODE_ENV === 'development' && !window.familyFormatterTestRun) {
      testFamilyNameFormatting();
      window.familyFormatterTestRun = true;
    }

    // Use productOwnerOrder if it exists to maintain the user's specified order
    let orderedNames = reportData.productOwnerNames;
    if (reportData.productOwnerOrder && reportData.productOwnerOrder.length > 0) {
      // Order the names according to productOwnerOrder
      // Only include names that are in both arrays (in case of data inconsistency)
      const nameSet = new Set(reportData.productOwnerNames);
      orderedNames = reportData.productOwnerOrder.filter(name => nameSet.has(name));

      // Add any names that are in productOwnerNames but not in productOwnerOrder (shouldn't happen, but defensive)
      const orderedSet = new Set(orderedNames);
      const remainingNames = reportData.productOwnerNames.filter(name => !orderedSet.has(name));
      orderedNames = [...orderedNames, ...remainingNames];
    }

    const result = formatFamilyNames(orderedNames);
    return result;
  }, [reportData.productOwnerNames, reportData.productOwnerOrder, customProductOwnerNames]);

  // PERFORMANCE OPTIMIZATION: Memoized event handlers
  const handleBackToGenerator = useCallback(() => {
    navigate('/report-generator');
  }, [navigate]);

  const handleTabChange = useCallback((tab: ReportTab) => {
    setActiveTab(tab);
  }, [setActiveTab]);

  const toggleVisualSigning = useCallback(() => {
    setVisualSigning(!visualSigning);
  }, [visualSigning, setVisualSigning]);

  const toggleHideZeros = useCallback(() => {
    setHideZeros(!hideZeros);
  }, [hideZeros, setHideZeros]);

  const toggleHideCashIRR = useCallback(() => {
    setHideCashIRR(!hideCashIRR);
  }, [hideCashIRR, setHideCashIRR]);

  const openTitleModal = useCallback(() => {
    setShowTitleModal(true);
  }, [setShowTitleModal]);

  const openProductOwnerModal = useCallback(() => {
    setShowProductOwnerModal(true);
  }, [setShowProductOwnerModal]);

  const openPrintInstructions = useCallback(() => {
    setShowPrintInstructions(true);
  }, []);

  const closePrintInstructions = useCallback(() => {
    setShowPrintInstructions(false);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 print:bg-white">
      {/* Header with navigation and actions */}
      <header 
        className="bg-white shadow-sm border-b border-gray-200 print-hide"
        role="banner"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
                      <div className="flex items-center">
            {/* Breadcrumb Navigation */}
            <nav aria-label="Breadcrumb">
              <ol className="inline-flex items-center space-x-1 md:space-x-3">
                <li className="inline-flex items-center">
                  <button
                    onClick={() => navigate('/')}
                    className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded-md px-2 py-1"
                  >
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                      <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"></path>
                    </svg>
                    Home
                  </button>
                </li>

                <li>
                  <div className="flex items-center">
                    <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"></path>
                    </svg>
                    <button
                      onClick={handleBackToGenerator}
                      className="ml-1 text-sm font-medium text-gray-500 hover:text-primary-700 md:ml-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded-md px-2 py-1"
                    >
                      Report Generator
                    </button>
                  </div>
                </li>
                <li aria-current="page">
                  <div className="flex items-center">
                    <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"></path>
                    </svg>
                    <span className="ml-1 text-sm font-medium text-primary-700 md:ml-2">Report Display</span>
                  </div>
                </li>
              </ol>
            </nav>

            {/* Client Group Navigation Buttons */}
            {clientGroups.length > 0 && (
              <div className="ml-8 flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-500 mr-2">Client Groups:</span>
                {clientGroups.map((clientGroup) => (
                  <button
                    key={clientGroup.id}
                    onClick={() => navigate(`/client_groups/${clientGroup.id}`, {
                      state: {
                        from: 'report-display',
                        clientGroupName: clientGroup.name,
                        useHistoryBack: true
                      }
                    })}
                    className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                    title={`Navigate to ${clientGroup.name}`}
                  >
                    <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    {clientGroup.name}
                  </button>
                ))}
              </div>
            )}
          </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={toggleVisualSigning}
                className={`flex items-center px-4 py-2 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
                  visualSigning 
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
                aria-label={`${visualSigning ? 'Disable' : 'Enable'} visual signing`}
              >
                {visualSigning ? (
                  <EyeSlashIcon className="h-4 w-4 mr-2" aria-hidden="true" />
                ) : (
                  <EyeIcon className="h-4 w-4 mr-2" aria-hidden="true" />
                )}
                <span className="text-sm font-medium">
                  {visualSigning ? 'Normal View' : 'Visual Signing'}
                </span>
              </button>
              <button
                onClick={toggleHideZeros}
                className={`flex items-center px-4 py-2 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
                  hideZeros
                    ? 'bg-orange-600 text-white hover:bg-orange-700'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
                aria-label={`${hideZeros ? 'Show' : 'Hide'} zero values`}
              >
                <span className="text-sm font-medium">
                  {hideZeros ? 'Show Zeros' : 'Hide Zeros'}
                </span>
              </button>
              <button
                onClick={toggleHideCashIRR}
                className={`flex items-center px-4 py-2 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
                  hideCashIRR
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
                aria-label={`${hideCashIRR ? 'Show' : 'Hide'} Cash fund IRRs`}
              >
                <span className="text-sm font-medium">
                  {hideCashIRR ? 'Show Cash IRR' : 'Hide Cash IRR'}
                </span>
              </button>
              <div className="flex items-center space-x-2">
                <button
                  onClick={openPrintInstructions}
                  className="flex items-center px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                  aria-label="View print instructions"
                  title="How to get the best print quality"
                >
                  <QuestionMarkCircleIcon className="h-4 w-4" aria-hidden="true" />
                </button>
                <button
                  onClick={handlePrint}
                  className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  aria-label="Print report"
                >
                  <PrinterIcon className="h-4 w-4 mr-2" aria-hidden="true" />
                  Print Report
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Report Content */}
      <div ref={printRef} className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 print:bg-white print:p-4 print-content-container">
        
        {/* Print-only Company Logo Header */}
        <div className="hidden print:block mb-3 text-center">
          <img
            src="/images/Company logo.svg"
            alt="Kingstons Logo"
            className="mx-auto h-16 w-auto mb-2"
          />
        </div>

        {/* Report Header */}
        <div className="text-center mb-3">
          <div className="relative inline-block">
            <h1 className="text-3xl font-light text-slate-800 mb-1 tracking-wide roboto-title-large">
              Investment Summary
            </h1>
            <div className="w-full h-0.5 bg-gradient-to-r from-blue-600 to-purple-600 mb-4"></div>
          </div>
          <div className="text-lg font-medium text-slate-700 mb-2 tracking-wide roboto-title-medium">
            {reportData.timePeriod}
          </div>
          {productOwnerDisplay && (
            <div className="text-base text-slate-700 font-light roboto-title-small">
              {productOwnerDisplay}
            </div>
          )}
        </div>

        {/* Edit Controls */}
        <div className="mb-6 print-hide">
          <div className="flex justify-center gap-4">
            <button
              onClick={openTitleModal}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              aria-label="Edit product titles"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit Product Titles
              {customTitles.size > 0 && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {customTitles.size} custom
                </span>
              )}
            </button>
            
            <button
              onClick={openProductOwnerModal}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
              aria-label="Edit product owner names"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Edit Product Owners
              {customProductOwnerNames && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  custom
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8 print-hide tab-navigation">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8" aria-label="Report tabs" role="tablist">
              <button
                onClick={() => handleTabChange(REPORT_TABS.SUMMARY)}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
                  activeTab === REPORT_TABS.SUMMARY
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                role="tab"
                aria-selected={activeTab === REPORT_TABS.SUMMARY}
                aria-controls="summary-tab-panel"
              >
                Investment Summary
              </button>
              <button
                onClick={() => handleTabChange(REPORT_TABS.IRR_HISTORY)}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
                  activeTab === REPORT_TABS.IRR_HISTORY
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                role="tab"
                aria-selected={activeTab === REPORT_TABS.IRR_HISTORY}
                aria-controls="irr-history-tab-panel"
              >
                History
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="tab-content print:block">
          {children}
        </div>
        
        {/* Print-only page footer - appears on every printed page */}
        <div className="print-page-footer"></div>
      </div>

      {/* Product Title Modal */}
      <ProductTitleModal reportData={reportData} />
      
      {/* Product Owner Modal */}
      <ProductOwnerModal reportData={reportData} />

      {/* Print Instructions Modal */}
      <PrintInstructionsModal 
        isOpen={showPrintInstructions}
        onClose={closePrintInstructions}
      />
    </div>
  );
});

ReportContainer.displayName = 'ReportContainer';

export default ReportContainer; 