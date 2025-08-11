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
        top: '1.2in',
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
        
        /* CRITICAL: Color preservation must come first */
        ${preserveColors ? this.getColorPreservationCSS() : ''}
        
        /* Hide interactive elements */
        .print-hide {
          display: none !important;
        }
        
        /* Force page break before main IRR History section only, not nested ones */
        .irr-history-section:not(.irr-history-section .irr-history-section) {
          page-break-before: always;
          break-before: page;
        }
        
        /* Keep History Summary with History cards */
        .irr-history-section .irr-history-section {
          page-break-before: avoid !important;
          break-before: avoid !important;
        }
        
        /* Prevent page breaks inside product cards */
        .product-card {
          page-break-inside: avoid;
          break-inside: avoid;
          margin-bottom: 1.5rem !important;
          border-radius: 0.5rem !important;
          background-color: white !important;
          padding: 1.5rem !important;
        }
        
        /* Override spacing specifically for IRR History cards */
        .irr-history-section .product-card {
          margin-bottom: 0.125rem !important;
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
        
        ${this.getTableOptimizationCSS()}
        ${this.getLayoutOptimizationCSS()}
        ${this.getPageNumberingCSS(finalOptions)}
        ${this.getPrintVisibilityCSS()}
        ${customStyles || ''}
      }
    `;
  }

  /**
   * Get CSS for preserving provider theme colors in print
   */
  private getColorPreservationCSS(): string {
    return `
      /* Critical: Force browsers to preserve all colors and backgrounds in print */
      *, *::before, *::after {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      
      /* Extra emphasis for key elements */
      html, body {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      
      /* Ensure all divs preserve their styling */
      div, span, section, article {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      
      /* Critical: Do not override any inline styles on product cards */
      .product-card[style] {
        /* This selector targets cards WITH inline styles - preserve them exactly */
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
        margin-bottom: 1.5rem !important;
      }
      
      .portfolio-performance-card {
        background-color: inherit !important;
        border-radius: 0.5rem !important;
        padding: 0.75rem !important;
        text-align: center !important;
        height: 6rem !important;
        display: flex !important;
        flex-direction: column !important;
        justify-content: center !important;
        align-items: center !important;
      }
      
      .portfolio-performance-card div:first-child {
        font-size: 0.875rem !important;
        font-weight: 500 !important;
        margin-bottom: 0.5rem !important;
      }
      
      .portfolio-performance-card div:last-child {
        font-size: 1.5rem !important;
        font-weight: 700 !important;
        color: black !important;
      }
      
      /* Remove gap completely between ALL titles and tables */
      h1, h2, h3, h4, h5, h6 {
        margin-bottom: 0 !important;
        margin-top: 0 !important;
      }
      
      /* Product card spacing */
      .product-card {
        margin-bottom: 1.5rem !important;
      }
      
      /* Force all product titles to have no margin */
      .product-card h3,
      .product-card .text-xl,
      .product-card .font-semibold {
        margin-bottom: 0 !important;
        margin-top: 0 !important;
      }
      
      /* Remove gaps for all table containers */
      .product-table,
      .overflow-x-auto,
      .overflow-x-auto table,
      table {
        margin-top: 0 !important;
        margin-bottom: 0 !important;
      }
      
      /* IRR History section - more specific targeting */
      .irr-history-section h2,
      .irr-history-section .text-2xl,
      .irr-history-section .font-bold {
        margin-bottom: 0 !important;
        margin-top: 0 !important;
      }
      
      .irr-history-section .product-card h3,
      .irr-history-section .product-card .text-xl,
      .irr-history-section .product-card .font-semibold {
        margin-bottom: 0 !important;
        margin-top: 0 !important;
      }
      
      /* Force gap removal on div containers */
      .mb-4, .mb-6, .mb-8 {
        margin-bottom: 0.5rem !important;
      }
      
      /* Override for IRR History section - tighter spacing */
      .irr-history-section .mb-8 {
        margin-bottom: 0.125rem !important;
      }
      
      /* Specific targeting for headings in cards */
      .bg-white h2,
      .bg-white h3,
      .shadow-sm h2,
      .shadow-sm h3 {
        margin-bottom: 0 !important;
      }
      
      /* Reduce section spacing - make everything more compact */
      .product-card.print-clean {
        margin-bottom: 0.5rem !important;
        padding: 0.75rem !important;
      }
      
      /* Reduce spacing between main sections */
      .mb-8.product-card {
        margin-bottom: 0.5rem !important;
      }
      
      /* Super tight spacing for IRR History cards */
      .irr-history-section .product-card.print-clean,
      .irr-history-section .mb-8.product-card {
        margin-bottom: 0.125rem !important;
      }
      
      /* Compact the main report content container */
      .w-full.mx-auto.px-4 {
        padding-top: 1rem !important;
        padding-bottom: 1rem !important;
      }
      
      /* Reduce spacing in IRR History section for maximum density */
      .irr-history-section .product-card {
        margin-bottom: 0.125rem !important;
        padding: 0.75rem !important;
      }
      
      /* Make Portfolio Performance section more compact */
      .portfolio-performance-grid {
        margin-bottom: 0.5rem !important;
      }
      
      /* Clean up styling for print - remove shadows but preserve all borders */
      .product-card.print-clean,
      .bg-white.shadow-sm,
      .border.border-gray-200,
      .shadow-sm.rounded-lg {
        box-shadow: none !important;
        background: white !important;
        /* Explicitly do NOT override border properties - inline styles must take precedence */
      }
      
      /* Right-align most number columns in print, but center colored columns */
      .landscape-table th:not(:first-child):not(.bg-green-100):not(.bg-blue-100):not(.bg-purple-100),
      .landscape-table td:not(:first-child):not(.bg-green-50):not(.bg-blue-50):not(.bg-purple-50):not(.bg-green-100):not(.bg-blue-100):not(.bg-purple-100) {
        text-align: right !important;
      }
      
      /* Center colored columns in print */
      .landscape-table th.bg-green-100,
      .landscape-table th.bg-blue-100, 
      .landscape-table th.bg-purple-100,
      .landscape-table td.bg-green-50,
      .landscape-table td.bg-blue-50,
      .landscape-table td.bg-purple-50,
      .landscape-table td.bg-green-100,
      .landscape-table td.bg-blue-100,
      .landscape-table td.bg-purple-100 {
        text-align: center !important;
      }
      
      /* Keep Fund Name column left-aligned */
      .landscape-table th:first-child,
      .landscape-table td:first-child {
        text-align: left !important;
      }
      
      /* Portfolio Summary Table Styling */
      .portfolio-summary-table {
        width: 100% !important;
        table-layout: fixed !important;
      }
      
      .portfolio-summary-table colgroup col:nth-child(1) { width: 28% !important; }
      .portfolio-summary-table colgroup col:nth-child(2) { width: 7% !important; }
      .portfolio-summary-table colgroup col:nth-child(3) { width: 7% !important; }
      .portfolio-summary-table colgroup col:nth-child(4) { width: 7% !important; }
      .portfolio-summary-table colgroup col:nth-child(5) { width: 7% !important; }
      .portfolio-summary-table colgroup col:nth-child(6) { width: 7% !important; }
      .portfolio-summary-table colgroup col:nth-child(7) { width: 7% !important; }
      .portfolio-summary-table colgroup col:nth-child(8) { width: 8% !important; }
      .portfolio-summary-table colgroup col:nth-child(9) { width: 8% !important; }
      .portfolio-summary-table colgroup col:nth-child(10) { width: 9% !important; }
      .portfolio-summary-table colgroup col:nth-child(11) { width: 5% !important; }
      
      /* IRR History Section Styling */
      .irr-history-section {
        margin-top: 2rem !important;
      }
      
      .irr-history-section h2 {
        font-size: 1.5rem !important;
        font-weight: 700 !important;
        color: #1f2937 !important;
        margin-bottom: 1.5rem !important;
      }
      
      /* Provider Color Dot Styling */
      .product-card .w-4.h-4.rounded-full {
        width: 1rem !important;
        height: 1rem !important;
        border-radius: 50% !important;
        flex-shrink: 0 !important;
      }
      
      /* Table Header Background Colors */
      .bg-green-100 {
        background-color: #dcfce7 !important;
      }
      
      .bg-blue-100 {
        background-color: #dbeafe !important;
      }
      
      .bg-purple-100 {
        background-color: #f3e8ff !important;
      }
      
      .bg-green-50 {
        background-color: #f0fdf4 !important;
      }
      
      .bg-blue-50 {
        background-color: #eff6ff !important;
      }
      
      .bg-purple-50 {
        background-color: #faf5ff !important;
      }
      
      /* Product Name Cell Styling */
      .product-name-cell {
        padding: 0.5rem 0.25rem !important;
        vertical-align: top !important;
      }
      
      .product-name-cell .w-2\.5.h-2\.5.rounded-full {
        width: 0.625rem !important;
        height: 0.625rem !important;
        border-radius: 50% !important;
        margin-top: 0.125rem !important;
        flex-shrink: 0 !important;
      }
    `;
  }

  /**
   * Get CSS for page numbering based on options
   */
  private getPageNumberingCSS(options: PrintOptions): string {
    const pageOptions = options.pageNumbers;
    
    // Generate current date string
    const currentDate = new Date().toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    let pageNumberCSS = '';
    
    // If page numbers are enabled, add page number styling
    if (pageOptions?.enabled) {
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
      
      pageNumberCSS = `
        /* Page numbers positioned at ${position} */
        ${cssPosition} {
          content: ${content};
          font-size: ${fontSize};
          font-family: Arial, sans-serif;
          color: ${color};
          margin: 0.1in 0.25in;
        }
      `;
    }
    
    return `
      /* Initialize page counter */
      body {
        counter-reset: page;
      }
      
      @page {
        counter-increment: page;
        
        /* Current date on bottom left of each page */
        @bottom-left {
          content: "${currentDate}";
          font-size: 10px;
          font-family: Arial, sans-serif;
          color: #666;
          margin: 0.1in 0.25in;
        }
        
        ${pageNumberCSS}
      }
      
      /* Ensure content doesn't overlap with page footer */
      .report-content {
        padding-bottom: 0.6in;
      }
    `;
  }

  /**
   * Get CSS for print-specific visibility and layout
   */
  private getPrintVisibilityCSS(): string {
    return `
      /* Print both tabs regardless of active state */
      @media print {
        /* Hide tab navigation during print */
        .tab-navigation {
          display: none !important;
        }
        
        /* Show both tab contents during print */
        .tab-content {
          display: block !important;
        }
        
        /* Hide print button and other controls */
        .print-hide {
          display: none !important;
        }
        
        /* Force both tabs to be visible during print */
        #summary-tab-panel {
          display: block !important;
          page-break-after: page;
        }
        
        #irr-history-tab-panel {
          display: block !important;
          page-break-before: page;
        }
        
        /* Ensure IRR History section is visible */
        .irr-history-section {
          display: block !important;
        }
        
        /* Hide chart controls during print */
        .chart-controls {
          display: none !important;
        }
        
        /* Hide product selection grid during print */
        .product-selection-grid {
          display: none !important;
        }
        
        /* Show table view for IRR History during print */
        .irr-history-table {
          display: block !important;
        }
        
        /* Hide chart view during print */
        .irr-history-chart {
          display: none !important;
        }
        
        /* Ensure proper spacing between sections */
        .report-section {
          margin-bottom: 2rem !important;
        }
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