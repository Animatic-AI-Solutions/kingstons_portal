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
      pageNumbers: {
        enabled: true,
        position: 'bottom-right',
        format: 'page-only',
        fontSize: '10px',
        color: '#666'
      },
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
   * Get print configuration for use with useReactToPrint hook
   * The actual printing must be done in a React component using useReactToPrint
   */
  getPrintConfiguration(
    contentRef: React.RefObject<HTMLElement>, 
    options?: PrintOptions
  ): {
    contentRef: React.RefObject<HTMLElement>;
    documentTitle: string;
    pageStyle: string;
    onBeforePrint?: () => Promise<void>;
  } {
    const finalOptions = { ...this.options, ...options };
    const documentTitle = finalOptions.documentTitle || 'Report_Export.pdf';
    
    return {
      contentRef,
      documentTitle,
      pageStyle: this.generatePrintStyles(finalOptions),
      onBeforePrint: finalOptions.ensureIRRHistory && this.irrHistoryLoader ? 
        async () => {
          try {
            await this.irrHistoryLoader!();
          } catch (error) {
            console.warn('Failed to load IRR history before printing:', error);
          }
        } : undefined
    };
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
        ${this.getPageNumberingCSS(finalOptions)}
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

  /**
   * Get CSS for page numbering based on options
   */
  private getPageNumberingCSS(options: PrintOptions): string {
    const pageOptions = options.pageNumbers;
    
    // If page numbers are disabled, return empty CSS
    if (!pageOptions?.enabled) {
      return '';
    }
    
    const position = pageOptions.position || 'bottom-right';
    const format = pageOptions.format || 'page-only';
    const fontSize = pageOptions.fontSize || '10px';
    const color = pageOptions.color || '#666';
    const customFormat = pageOptions.customFormat || 'Page {page}';
    
    // Generate content based on format
    let content = '"Page " counter(page)';
    if (format === 'page-total') {
      content = '"Page " counter(page) " of " counter(pages)';
    } else if (format === 'custom' && customFormat) {
      content = `"${customFormat.replace('{page}', '" counter(page) "').replace('{total}', '" counter(pages) "')}"`;
    }
    
    // Generate position-specific CSS
    const positionMap = {
      'top-left': '@top-left',
      'top-center': '@top-center', 
      'top-right': '@top-right',
      'bottom-left': '@bottom-left',
      'bottom-center': '@bottom-center',
      'bottom-right': '@bottom-right'
    };
    
    const cssPosition = positionMap[position];
    
    return `
      /* Initialize page counter */
      body {
        counter-reset: page;
      }
      
      @page {
        counter-increment: page;
        
        /* Page numbers positioned at ${position} */
        ${cssPosition} {
          content: ${content};
          font-size: ${fontSize};
          font-family: Arial, sans-serif;
          color: ${color};
          margin: 0.1in 0.25in;
        }
      }
      
      /* Alternative page numbering for browsers that don't support @page margin boxes */
      .page-number-fallback {
        position: fixed;
        ${position.includes('bottom') ? 'bottom: 0.3in;' : 'top: 0.3in;'}
        ${position.includes('left') ? 'left: 0.3in;' : position.includes('right') ? 'right: 0.3in;' : 'left: 50%; transform: translateX(-50%);'}
        font-size: ${fontSize};
        font-family: Arial, sans-serif;
        color: ${color};
        background: white;
        padding: 2px 4px;
        border-radius: 2px;
        z-index: 1000;
        display: none; /* Hidden by default, shown via JavaScript if needed */
      }
      
      /* Ensure content doesn't overlap with page numbers */
      .report-content {
        ${position.includes('bottom') ? 'padding-bottom: 0.6in;' : 'padding-top: 0.6in;'}
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
   * Configure page numbering options
   */
  setPageNumbering(
    enabled: boolean = true,
    position: 'bottom-left' | 'bottom-center' | 'bottom-right' | 'top-left' | 'top-center' | 'top-right' = 'bottom-right',
    format: 'page-only' | 'page-total' | 'custom' = 'page-only',
    customFormat?: string
  ): void {
    this.options.pageNumbers = {
      enabled,
      position,
      format,
      customFormat,
      fontSize: this.options.pageNumbers?.fontSize || '10px',
      color: this.options.pageNumbers?.color || '#666'
    };
  }

  /**
   * Disable page numbering
   */
  disablePageNumbers(): void {
    if (this.options.pageNumbers) {
      this.options.pageNumbers.enabled = false;
    }
  }

  /**
   * Enable page numbering with default settings
   */
  enablePageNumbers(): void {
    if (!this.options.pageNumbers) {
      this.options.pageNumbers = {
        enabled: true,
        position: 'bottom-right',
        format: 'page-only',
        fontSize: '10px',
        color: '#666'
      };
    } else {
      this.options.pageNumbers.enabled = true;
    }
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