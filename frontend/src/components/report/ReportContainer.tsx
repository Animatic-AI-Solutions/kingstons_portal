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

import React, { useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import { ArrowLeftIcon, PrinterIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { useReportStateManager } from '../../hooks/report/useReportStateManager';
import { usePrintServiceReadOnly } from '../../hooks/report/usePrintService';
import { REPORT_TABS, type ReportTab } from '../../utils/reportConstants';
import type { ReportData } from '../../types/reportTypes';
import ProductTitleModal from './ProductTitleModal';

interface ReportContainerProps {
  reportData: ReportData;
  children: React.ReactNode;
}

export const ReportContainer: React.FC<ReportContainerProps> = React.memo(({
  reportData,
  children
}) => {
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);
  
  // State management from Phase 1 services
  const {
    state: {
      activeTab,
      hideZeros,
      visualSigning,
      customTitles
    },
    actions: {
      setActiveTab,
      setHideZeros,
      setVisualSigning
    }
  } = useReportStateManager();

  // PERFORMANCE OPTIMIZATION: Memoized computed values
  const reportTitle = useMemo(() => 
    `Report_${reportData.timePeriod?.replace(/\s+/g, '_') || 'Export'}.pdf`,
    [reportData.timePeriod]
  );

  // Print service for styling only
  const { generatePrintStyles } = usePrintServiceReadOnly({
    orientation: 'landscape',
    preserveColors: true
  });

  // React-to-print configuration with proper error handling
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: reportTitle,
    pageStyle: `
      @media print {
        @page {
          size: landscape;
          margin: 0.5in;
        }
        
        body {
          -webkit-print-color-adjust: exact !important;
          color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        
        .print-hide {
          display: none !important;
        }
        
        .print-clean {
          box-shadow: none !important;
          border-radius: 0 !important;
        }
        
        .product-card {
          page-break-inside: avoid;
          break-inside: avoid;
          margin-bottom: 20px;
        }
        
        .product-table table {
          page-break-inside: auto;
          break-inside: auto;
        }
        
        .product-table tr {
          page-break-inside: avoid;
          break-inside: avoid;
        }
        
        .landscape-table {
          width: 100% !important;
          font-size: 8px !important;
        }
        
        .portfolio-performance-grid {
          display: grid !important;
          grid-template-columns: repeat(3, 1fr) !important;
          gap: 1rem !important;
        }
        
        .portfolio-performance-card {
          background: #f8f9fa !important;
          border: 1px solid #dee2e6 !important;
          padding: 0.75rem !important;
        }
        
        /* Preserve theme colors */
        .bg-purple-50 { background-color: #faf5ff !important; }
        .bg-green-50 { background-color: #f0fdf4 !important; }
        .bg-blue-50 { background-color: #eff6ff !important; }
        .bg-purple-100 { background-color: #e9d5ff !important; }
        .bg-green-100 { background-color: #dcfce7 !important; }
        .bg-blue-100 { background-color: #dbeafe !important; }
        
        /* Text colors */
        .text-purple-700 { color: #7c3aed !important; }
        .text-green-700 { color: #15803d !important; }
        .text-blue-700 { color: #1d4ed8 !important; }
        .text-green-600 { color: #16a34a !important; }
        .text-red-600 { color: #dc2626 !important; }
        .text-purple-600 { color: #9333ea !important; }
        .text-blue-600 { color: #2563eb !important; }
        .text-primary-700 { color: #1d4ed8 !important; }
      }
    `,
    onBeforePrint: () => {
      console.log('🖨️ Starting print process...');
      return Promise.resolve();
    },
    onAfterPrint: () => {
      console.log('✅ Print process completed');
    },
    onPrintError: (errorLocation, error) => {
      console.error('❌ Print error at', errorLocation, ':', error);
    }
  });

  const productOwnerDisplay = useMemo(() => 
    reportData.productOwnerNames.length > 0 ? reportData.productOwnerNames.join(', ') : '',
    [reportData.productOwnerNames]
  );

  // PERFORMANCE OPTIMIZATION: Memoized event handlers
  const handleBackToGenerator = useCallback(() => {
    navigate('/reporting');
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with navigation and actions */}
      <header 
        className="bg-white shadow-sm border-b border-gray-200 print-hide"
        role="banner"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={handleBackToGenerator}
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded-md px-2 py-1"
                aria-label="Go back to report generator"
              >
                <ArrowLeftIcon className="h-5 w-5 mr-2" aria-hidden="true" />
                Back to Report Generator
              </button>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={toggleVisualSigning}
                className={`flex items-center px-4 py-2 rounded-md transition-colors ${
                  visualSigning 
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {visualSigning ? (
                  <EyeSlashIcon className="h-4 w-4 mr-2" />
                ) : (
                  <EyeIcon className="h-4 w-4 mr-2" />
                )}
                <span className="text-sm font-medium">
                  {visualSigning ? 'Normal View' : 'Visual Signing'}
                </span>
              </button>
              <button
                onClick={toggleHideZeros}
                className={`flex items-center px-4 py-2 rounded-md transition-colors ${
                  hideZeros 
                    ? 'bg-orange-600 text-white hover:bg-orange-700' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <span className="text-sm font-medium">
                  {hideZeros ? 'Show Zeros' : 'Hide Zeros'}
                </span>
              </button>
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
      </header>

      {/* Report Content */}
      <div ref={printRef} className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Print-only Company Logo Header */}
        <div className="hidden print:block mb-8 text-center">
          <img 
            src="/images/Company logo.svg" 
            alt="Kingstons Logo" 
            className="mx-auto h-16 w-auto mb-6"
          />
        </div>

        {/* Report Header */}
        <div className="text-center mb-6">
          <div className="relative inline-block">
            <h1 className="text-4xl font-light text-slate-800 mb-1 tracking-wide">
              Investment Summary
            </h1>
            <div className="w-full h-0.5 bg-gradient-to-r from-blue-600 to-purple-600 mb-4"></div>
          </div>
          <div className="text-lg font-light text-slate-700 mb-2 tracking-wide">
            {reportData.timePeriod}
          </div>
          {productOwnerDisplay && (
            <div className="text-base text-slate-500 font-normal">
              {productOwnerDisplay}
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="mb-8 print-hide">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              <button
                onClick={() => handleTabChange(REPORT_TABS.SUMMARY)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === REPORT_TABS.SUMMARY
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Investment Summary
              </button>
              <button
                onClick={() => handleTabChange(REPORT_TABS.IRR_HISTORY)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === REPORT_TABS.IRR_HISTORY
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
        {children}
      </div>

      {/* Product Title Modal */}
      <ProductTitleModal reportData={reportData} />
    </div>
  );
});

export default ReportContainer; 