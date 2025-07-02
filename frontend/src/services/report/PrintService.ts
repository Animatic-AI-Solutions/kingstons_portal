/**
 * PrintService - Centralized report printing functionality
 * Part of Phase 1 refactoring - extracted from ReportDisplay component
 * 
 * This service handles all report printing logic including:
 * - Print preparation and data loading
 * - CSS styling for landscape printing
 * - Print layout optimization
 * - Integration with react-to-print
 */

import * as React from 'react';
import { useReactToPrint } from 'react-to-print';
import type {
  IPrintService,
  PrintOptions,
  PrintPreparationResult
} from '../../types/reportServices';
import type { ReportData } from '../../types/reportTypes';

export class PrintService implements IPrintService {
  private options: PrintOptions;
  private irrHistoryLoader?: () => Promise<any>;

  constructor(initialOptions: PrintOptions = {}) {
    this.options = {
      orientation: 'landscape',
      margins: {
        top: '0.2in',
        right: '0.05in',
        bottom: '0.2in',
        left: '0.05in'
      },
      ensureIRRHistory: true,
      preserveColors: true,
      ...initialOptions
    };
  }

  // =============================================================================
  // CONFIGURATION METHODS
  // =============================================================================

  updateOptions(newOptions: PrintOptions): void {
    this.options = {
      ...this.options,
      ...newOptions
    };
  }

  getDefaultOptions(): PrintOptions {
    return { ...this.options };
  }

  /**
   * Set the IRR history loader function
   * This will be called when IRR history needs to be loaded before printing
   */
  setIRRHistoryLoader(loader: () => Promise<any>): void {
    this.irrHistoryLoader = loader;
  }

  // =============================================================================
  // PRINT METHODS
  // =============================================================================

  /**
   * Print the report using react-to-print
   * Extracted from ReportDisplay handlePrint function
   */
  async printReport(
    contentRef: React.RefObject<HTMLElement>, 
    options?: PrintOptions
  ): Promise<void> {
    const finalOptions = { ...this.options, ...options };
    const documentTitle = finalOptions.documentTitle || 'Report_Export.pdf';
    
    return new Promise((resolve, reject) => {
      try {
        const printFunction = useReactToPrint({
          contentRef,
          documentTitle,
          onBeforePrint: async () => {
            if (finalOptions.ensureIRRHistory && this.irrHistoryLoader) {
              try {
                await this.irrHistoryLoader();
              } catch (error) {
                console.warn('Failed to load IRR history before printing:', error);
              }
            }
          },
          onAfterPrint: () => {
            resolve();
          },
          onPrintError: (errorLocation, error) => {
            console.error('Print error at', errorLocation, ':', error);
            reject(new Error(`Print failed: ${error.message}`));
          },
          pageStyle: this.generatePrintStyles(finalOptions)
        });

        printFunction();
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  /**
   * Prepare report for printing by loading required data
   */
  async prepareForPrint(
    reportData: ReportData,
    options?: PrintOptions
  ): Promise<PrintPreparationResult> {
    const finalOptions = { ...this.options, ...options };
    
    try {
      let irrHistoryLoaded = false;
      
      if (finalOptions.ensureIRRHistory && this.irrHistoryLoader) {
        await this.irrHistoryLoader();
        irrHistoryLoaded = true;
      }
      
      return {
        success: true,
        irrHistoryLoaded
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error during print preparation'
      };
    }
  }

  // =============================================================================
  // PRINT STYLING METHODS
  // =============================================================================

  /**
   * Generate comprehensive print CSS styles
   * Extracted from ReportDisplay pageStyle configuration
   */
  generatePrintStyles(options?: PrintOptions): string {
    const finalOptions = { ...this.options, ...options };
    const { orientation, margins, preserveColors, customStyles } = finalOptions;
    
    const marginString = `${margins?.top || '0.2in'} ${margins?.right || '0.05in'} ${margins?.bottom || '0.2in'} ${margins?.left || '0.05in'}`;
    const pageSize = orientation === 'portrait' ? 'A4 portrait' : 'A4 landscape';
    
    return `
      @media print {
        @page {
          margin: ${marginString};
          size: ${pageSize};
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
          overflow: visible !important;
        }
        
        /* Clean up styling for print */
        .print-clean {
          box-shadow: none !important;
        }
        
        ${preserveColors ? this.getColorPreservationCSS() : ''}
        ${this.getTableOptimizationCSS()}
        ${this.getLayoutOptimizationCSS()}
        ${customStyles || ''}
      }
    `;
  }

  /**
   * Get CSS for preserving provider theme colors in print
   */
  private getColorPreservationCSS(): string {
    return `
      /* Preserve provider theme color borders in print */
      .print-clean[style*="border"] {
        /* Don't override inline border styles that contain provider colors */
      }
      
      /* Default border for elements without provider theme colors */
      .print-clean:not([style*="border"]) {
        border: 1px solid #e5e7eb !important;
      }
      
      /* Optimize for landscape layout */
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    `;
  }

  /**
   * Get CSS for table optimization in print layout
   */
  private getTableOptimizationCSS(): string {
    return `
      /* Make tables more compact for landscape */
      .landscape-table {
        font-size: 11px;
        width: 100% !important;
        table-layout: fixed;
      }
      
      .landscape-table th,
      .landscape-table td {
        padding: 1px 4px;
        font-size: 10px;
        line-height: 1.0;
        word-wrap: break-word;
        overflow-wrap: break-word;
        vertical-align: middle;
      }
      
      /* Portfolio Summary specific optimizations */
      .portfolio-summary-table {
        font-size: 13px !important;
      }
      
      .portfolio-summary-table th,
      .portfolio-summary-table td {
        padding: 2px 3px !important;
        font-size: 12px !important;
        line-height: 1.2 !important;
        vertical-align: middle !important;
      }
      
      /* Allow header text to wrap, but keep data cells nowrap */
      .portfolio-summary-table th {
        white-space: normal !important;
        word-wrap: break-word !important;
        text-align: center !important;
        height: auto !important;
        min-height: 32px !important;
      }
      
      .portfolio-summary-table td {
        white-space: nowrap !important;
      }
      
      /* Make first column (Product) wider, others narrower */
      .portfolio-summary-table th:first-child,
      .portfolio-summary-table td:first-child {
        width: 25% !important;
        white-space: normal !important;
        word-wrap: break-word !important;
        text-align: left !important;
      }
      
      .portfolio-summary-table th:not(:first-child),
      .portfolio-summary-table td:not(:first-child) {
        width: 7.5% !important;
      }
      
      ${this.getProductFundTableCSS()}
    `;
  }

  /**
   * Get CSS for product fund tables optimization
   */
  private getProductFundTableCSS(): string {
    return `
      /* Product Fund Tables - Fixed column widths for vertical alignment */
      .product-card .landscape-table:not(.portfolio-summary-table) {
        table-layout: fixed !important;
        width: 100% !important;
        font-size: 11px !important;
      }
      
      .product-card .landscape-table:not(.portfolio-summary-table) th,
      .product-card .landscape-table:not(.portfolio-summary-table) td {
        font-size: 10px !important;
        line-height: 1.0 !important;
        padding: 1px 4px !important;
        vertical-align: middle !important;
      }
      
      .product-card .landscape-table:not(.portfolio-summary-table) th:nth-child(1),
      .product-card .landscape-table:not(.portfolio-summary-table) td:nth-child(1) {
        width: 20% !important; /* Fund Name */
      }
      
      .product-card .landscape-table:not(.portfolio-summary-table) th:nth-child(2),
      .product-card .landscape-table:not(.portfolio-summary-table) td:nth-child(2) {
        width: 8% !important; /* Investment */
      }
      
      .product-card .landscape-table:not(.portfolio-summary-table) th:nth-child(3),
      .product-card .landscape-table:not(.portfolio-summary-table) td:nth-child(3) {
        width: 8% !important; /* Gov. Uplift */
      }
      
      .product-card .landscape-table:not(.portfolio-summary-table) th:nth-child(4),
      .product-card .landscape-table:not(.portfolio-summary-table) td:nth-child(4) {
        width: 8% !important; /* Prod. Switch In */
      }
      
      .product-card .landscape-table:not(.portfolio-summary-table) th:nth-child(5),
      .product-card .landscape-table:not(.portfolio-summary-table) td:nth-child(5) {
        width: 8% !important; /* Fund Switches */
      }
      
      .product-card .landscape-table:not(.portfolio-summary-table) th:nth-child(6),
      .product-card .landscape-table:not(.portfolio-summary-table) td:nth-child(6) {
        width: 8% !important; /* Prod. Switch Out */
      }
      
      .product-card .landscape-table:not(.portfolio-summary-table) th:nth-child(7),
      .product-card .landscape-table:not(.portfolio-summary-table) td:nth-child(7) {
        width: 8% !important; /* Withdrawal */
      }
      
      .product-card .landscape-table:not(.portfolio-summary-table) th:nth-child(8),
      .product-card .landscape-table:not(.portfolio-summary-table) td:nth-child(8) {
        width: 10% !important; /* Valuation */
      }
      
      .product-card .landscape-table:not(.portfolio-summary-table) th:nth-child(9),
      .product-card .landscape-table:not(.portfolio-summary-table) td:nth-child(9) {
        width: 10% !important; /* Profit Made */
      }
      
      .product-card .landscape-table:not(.portfolio-summary-table) th:nth-child(10),
      .product-card .landscape-table:not(.portfolio-summary-table) td:nth-child(10) {
        width: 8% !important; /* Return p.a. */
      }
      
      .product-card .landscape-table:not(.portfolio-summary-table) th:nth-child(11),
      .product-card .landscape-table:not(.portfolio-summary-table) td:nth-child(11) {
        width: 6% !important; /* Risk */
      }
    `;
  }

  /**
   * Get CSS for layout optimization in print
   */
  private getLayoutOptimizationCSS(): string {
    return `
      /* Ensure Portfolio Performance cards stay side by side in print */
      .portfolio-performance-grid {
        display: grid !important;
        grid-template-columns: 1fr 1fr 1fr !important;
        gap: 1rem !important;
      }
      
      .portfolio-performance-card {
        page-break-inside: avoid;
        break-inside: avoid;
      }
      
      /* Product card styling optimizations */
      .product-card.print-clean {
        margin-bottom: 1.5rem !important;
        border-radius: 0 !important;
      }
      
      .product-card.print-clean:not([style*="border"]),
      .product-card.print-clean:not([style*="border"]) .border {
        border: 1px solid #d1d5db !important;
      }
      
      /* Preserve provider theme color borders and ensure colors are printed */
      .product-card.print-clean[style*="border"] {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      
      /* Right-align most number columns in print, but center colored columns */
      .landscape-table td:not(.text-center):not(.colored-cell) {
        text-align: right !important;
      }
      
      /* Center colored columns in print */
      .landscape-table td.colored-cell,
      .landscape-table td.text-center {
        text-align: center !important;
      }
    `;
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  /**
   * Generate document title based on report data
   */
  generateDocumentTitle(reportData?: ReportData): string {
    if (!reportData?.timePeriod) {
      return 'Report_Export.pdf';
    }
    
    return `Report_${reportData.timePeriod.replace(/\s+/g, '_')}.pdf`;
  }

  /**
   * Validate print options
   */
  validateOptions(options: PrintOptions): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (options.orientation && !['portrait', 'landscape'].includes(options.orientation)) {
      errors.push('Invalid orientation. Must be "portrait" or "landscape"');
    }
    
    if (options.margins) {
      const marginKeys = ['top', 'right', 'bottom', 'left'] as const;
      for (const key of marginKeys) {
        const margin = options.margins[key];
        if (margin && !/^\d+(\.\d+)?(in|cm|mm|px)$/.test(margin)) {
          errors.push(`Invalid margin format for ${key}. Use format like "0.5in", "1cm", etc.`);
        }
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// Export factory function for consistent creation
export const createPrintService = (options?: PrintOptions): PrintService => {
  return new PrintService(options);
};

// Export singleton instance for use across the application
let printServiceInstance: PrintService | null = null;

export const getPrintService = (): PrintService => {
  if (!printServiceInstance) {
    printServiceInstance = new PrintService();
  }
  return printServiceInstance;
};

export default PrintService; 