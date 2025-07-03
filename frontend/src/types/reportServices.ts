/**
 * Service interfaces and types for report functionality
 * Part of Phase 1 refactoring - extracting services from ReportDisplay
 */

import * as React from 'react';
import { REPORT_TABS } from '../utils/reportConstants';
import type { 
  ReportData, 
  ProductPeriodSummary, 
  SelectedIRRDate, 
  ProductIRRSelections 
} from './reportTypes';

// Report Tab Types
export type ReportTab = typeof REPORT_TABS[keyof typeof REPORT_TABS];

// Loading States Interface
export interface LoadingStates {
  reportData: boolean;
  irrHistory: boolean;
  totalIRR: boolean;
  portfolioIRR: boolean;
}

// Report State Interface
export interface ReportState {
  // Core data
  reportData: ReportData | null;
  irrHistoryData: any | null;
  
  // UI State
  activeTab: ReportTab;
  showInactiveProductDetails: Set<number>;
  
  // IRR State
  realTimeTotalIRR: number | null;
  portfolioIrrValues: Map<number, number>;
  
  // Display Options
  hideZeros: boolean;
  visualSigning: boolean;
  
  // Title Management
  customTitles: Map<number, string>;
  showTitleModal: boolean;
  modalTitles: Map<number, string>;
  modalHasChanges: boolean;
  
  // Loading States
  loading: LoadingStates;
}

// State Update Actions
export interface StateUpdateActions {
  setReportData: (data: ReportData | null) => void;
  setActiveTab: (tab: ReportTab) => void;
  setIrrHistoryData: (data: any) => void;
  setShowInactiveProductDetails: (productIds: Set<number>) => void;
  setRealTimeTotalIRR: (irr: number | null) => void;
  setPortfolioIrrValues: (values: Map<number, number>) => void;
  setHideZeros: (hide: boolean) => void;
  setVisualSigning: (enabled: boolean) => void;
  setCustomTitles: (titles: Map<number, string>) => void;
  setShowTitleModal: (show: boolean) => void;
  setModalTitles: (titles: Map<number, string>) => void;
  setModalHasChanges: (hasChanges: boolean) => void;
  setLoading: (key: keyof LoadingStates, loading: boolean) => void;
}

// Report State Manager Interface
export interface IReportStateManager extends StateUpdateActions {
  // State Getters
  getState(): ReportState;
  getReportData(): ReportData | null;
  getActiveTab(): ReportTab;
  getIrrHistoryData(): any | null;
  getShowInactiveProductDetails(): Set<number>;
  getRealTimeTotalIRR(): number | null;
  getPortfolioIrrValues(): Map<number, number>;
  getHideZeros(): boolean;
  getVisualSigning(): boolean;
  getCustomTitles(): Map<number, string>;
  getShowTitleModal(): boolean;
  getModalTitles(): Map<number, string>;
  getModalHasChanges(): boolean;
  getLoadingStates(): LoadingStates;
  
  // Utility Methods
  toggleInactiveProductDetails(productId: number): void;
  resetAllTitles(): void;
  resetModalState(): void;
  
  // Subscription Management (for React integration)
  subscribe(callback: () => void): () => void;
  unsubscribe(callback: () => void): void;
}

// Formatter Options Interface
export interface FormatterOptions {
  hideZeros?: boolean;
  visualSigning?: boolean;
  formatWithdrawalsAsNegative?: boolean;
}

// Report Formatter Interface
export interface IReportFormatter {
  // Configuration
  updateOptions(options: FormatterOptions): void;
  getOptions(): FormatterOptions;
  
  // Formatting Methods
  formatCurrencyWithZeroToggle(amount: number | null | undefined): string;
  formatWithdrawalAmount(amount: number | null | undefined): string;
  formatCurrencyWithVisualSigning(
    amount: number | null | undefined, 
    activityType: string
  ): string;
  formatFundIrr(irr: number | null | undefined): string;
}

// =============================================================================
// IRR CALCULATION TYPES (Day 4)
// =============================================================================

export interface IRRCalculationOptions {
  enableLogging?: boolean;
  cacheResults?: boolean;
  retryAttempts?: number;
  timeout?: number;
}

export interface IRRCalculationResult {
  success: boolean;
  irr: number | null;
  error?: string;
  metadata?: {
    fundCount?: number;
    irrDate?: string;
    method?: string;
    [key: string]: any;
  };
}

export type PortfolioIRRMap = Map<number, number>;

export interface IRRHistoryData {
  product_id: number;
  product_name: string;
  portfolio_historical_irr: Array<{
    irr_date: string;
    irr_result: number | null;
  }>;
  funds_historical_irr: Array<{
    portfolio_fund_id: number;
    fund_name: string;
    fund_status: string;
    risk_factor: number | null;
    isin_number: string | null;
    historical_irr: Array<{
      irr_date: string;
      irr_result: number | null;
    }>;
    isVirtual?: boolean;
    inactiveFundCount?: number;
  }>;
}

export interface IIRRCalculationService {
  // Configuration
  updateOptions(options: IRRCalculationOptions): void;
  getOptions(): IRRCalculationOptions;

  // Core IRR Methods
  fetchPortfolioIrrValues(productSummaries: ProductPeriodSummary[]): Promise<PortfolioIRRMap>;
  processHistoricalIRRData(reportData: ReportData): Promise<IRRHistoryData[]>;
  calculateRealTimeTotalIRR(reportData: ReportData): Promise<IRRCalculationResult>;

  // Utility Methods
  extractPortfolioFundIds(reportData: ReportData): number[];
  normalizeIRRDate(date: string): string;

  // Integration Methods
  getStoredPortfolioIRR(portfolioId: number): Promise<number | null>;
  getHistoricalIRR(productId: number, limit?: number): Promise<any>;
  calculateHistoricalIRR(portfolioFundIds: number[], endDate?: string): Promise<number | null>;
}

export interface UseIRRCalculationService {
  // Core methods
  fetchPortfolioIrrValues: (productSummaries: ProductPeriodSummary[]) => Promise<PortfolioIRRMap>;
  processHistoricalIRRData: (reportData: ReportData) => Promise<IRRHistoryData[]>;
  calculateRealTimeTotalIRR: (reportData: ReportData) => Promise<IRRCalculationResult>;

  // Configuration
  updateOptions: (options: IRRCalculationOptions) => void;
  options: IRRCalculationOptions;

  // Utility methods
  extractPortfolioFundIds: (reportData: ReportData) => number[];
  normalizeIRRDate: (date: string) => string;

  // Integration methods
  getStoredPortfolioIRR: (portfolioId: number) => Promise<number | null>;
  getHistoricalIRR: (productId: number, limit?: number) => Promise<any>;
  calculateHistoricalIRR: (portfolioFundIds: number[], endDate?: string) => Promise<number | null>;
}

// Print Configuration Interface
export interface PrintConfiguration {
  margin: string;
  size: string;
  orientation: 'portrait' | 'landscape';
  includePageNumbers: boolean;
  includeDate: boolean;
}

// =============================================================================
// PRINT SERVICE INTERFACES (Phase 1 Day 5)
// =============================================================================

/**
 * Configuration options for the PrintService
 */
export interface PrintOptions {
  /** Custom document title for the printed PDF */
  documentTitle?: string;
  /** Page orientation - defaults to landscape */
  orientation?: 'portrait' | 'landscape';
  /** Page margins */
  margins?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
  /** Whether to load IRR history before printing */
  ensureIRRHistory?: boolean;
  /** Custom CSS styles to apply during printing */
  customStyles?: string;
  /** Whether to preserve provider theme colors in print */
  preserveColors?: boolean;
  /** Page numbering options */
  pageNumbers?: {
    /** Whether to show page numbers - defaults to true */
    enabled?: boolean;
    /** Position of page numbers - defaults to bottom-right */
    position?: 'bottom-left' | 'bottom-center' | 'bottom-right' | 'top-left' | 'top-center' | 'top-right';
    /** Format of page numbers - defaults to "Page X" */
    format?: 'page-only' | 'page-total' | 'custom';
    /** Custom format string (use {page} and {total} placeholders) */
    customFormat?: string;
    /** Font size for page numbers - defaults to 10px */
    fontSize?: string;
    /** Font color for page numbers - defaults to #666 */
    color?: string;
  };
}

/**
 * Print preparation result
 */
export interface PrintPreparationResult {
  success: boolean;
  error?: string;
  irrHistoryLoaded?: boolean;
}

/**
 * Print service interface for handling report printing
 */
export interface IPrintService {
  /**
   * Get print configuration for use with useReactToPrint hook
   */
  getPrintConfiguration(
    contentRef: React.RefObject<HTMLElement>, 
    options?: PrintOptions
  ): {
    contentRef: React.RefObject<HTMLElement>;
    documentTitle: string;
    pageStyle: string;
    onBeforePrint?: () => Promise<void>;
  };
  
  /**
   * Prepare report for printing (load required data)
   */
  prepareForPrint(reportData: ReportData, options?: PrintOptions): Promise<PrintPreparationResult>;
  
  /**
   * Generate print CSS styles
   */
  generatePrintStyles(options?: PrintOptions): string;
  
  /**
   * Get default print options
   */
  getDefaultOptions(): PrintOptions;
  
  /**
   * Update print options
   */
  updateOptions(newOptions: PrintOptions): void;
  
  /**
   * Configure page numbering options
   */
  setPageNumbering(
    enabled?: boolean,
    position?: 'bottom-left' | 'bottom-center' | 'bottom-right' | 'top-left' | 'top-center' | 'top-right',
    format?: 'page-only' | 'page-total' | 'custom',
    customFormat?: string
  ): void;
  
  /**
   * Disable page numbering
   */
  disablePageNumbers(): void;
  
  /**
   * Enable page numbering with default settings
   */
  enablePageNumbers(): void;
}

/**
 * React hook interface for PrintService
 */
export interface UsePrintService {
  /** Get print configuration for use with useReactToPrint */
  getPrintConfiguration: (contentRef: React.RefObject<HTMLElement>, options?: PrintOptions) => {
    contentRef: React.RefObject<HTMLElement>;
    documentTitle: string;
    pageStyle: string;
    onBeforePrint?: () => Promise<void>;
  };
  
  /** Prepare report for printing */
  prepareForPrint: (reportData: ReportData, options?: PrintOptions) => Promise<PrintPreparationResult>;
  
  /** Loading state */
  isLoading: boolean;
  
  /** Error state */
  error: Error | null;
  
  /** Current print options */
  options: PrintOptions;
  
  /** Update options */
  updateOptions: (newOptions: PrintOptions) => void;
  
  /** Configure page numbering options */
  setPageNumbering: (
    enabled?: boolean,
    position?: 'bottom-left' | 'bottom-center' | 'bottom-right' | 'top-left' | 'top-center' | 'top-right',
    format?: 'page-only' | 'page-total' | 'custom',
    customFormat?: string
  ) => void;
  
  /** Disable page numbering */
  disablePageNumbers: () => void;
  
  /** Enable page numbering with default settings */
  enablePageNumbers: () => void;
  
  /** Generate print styles */
  generatePrintStyles: (options?: PrintOptions) => string;
  
  /** Generate document title based on report data */
  generateDocumentTitle: (reportData?: ReportData) => string;
  
  /** Validate print options */
  validateOptions: (options: PrintOptions) => { valid: boolean; errors: string[] };
  
  /** Set IRR history loader function */
  setIRRHistoryLoader: (loader: () => Promise<any>) => void;
}

// Service Event Types
export type StateChangeEvent = {
  type: 'state_change';
  property: keyof ReportState;
  newValue: any;
  oldValue: any;
};

export type ServiceErrorEvent = {
  type: 'service_error';
  service: string;
  method: string;
  error: Error;
};

// Service Observer Interface
export interface IServiceObserver {
  onStateChange?(event: StateChangeEvent): void;
  onServiceError?(event: ServiceErrorEvent): void;
}

// Combined Service Container Interface
export interface IReportServices {
  stateManager: IReportStateManager;
  formatter: IReportFormatter;
  irrCalculation: IIRRCalculationService;
  print: IPrintService;
}

// Hook Return Types
export interface UseReportStateManager {
  state: ReportState;
  actions: StateUpdateActions;
  utils: {
    toggleInactiveProductDetails: (productId: number) => void;
    resetAllTitles: () => void;
    resetModalState: () => void;
  };
}

export interface UseReportFormatter {
  formatCurrencyWithZeroToggle: (amount: number | null | undefined) => string;
  formatWithdrawalAmount: (amount: number | null | undefined) => string;
  formatCurrencyWithVisualSigning: (
    amount: number | null | undefined, 
    activityType: string
  ) => string;
  formatFundIrr: (irr: number | null | undefined) => string;
  formatProductIrr: (irr: number | null | undefined) => string;
  updateOptions: (options: FormatterOptions) => void;
  options: FormatterOptions;
  toggleHideZeros: () => boolean;
  toggleVisualSigning: () => boolean;
  formatCurrencyBatch: (
    amounts: Array<number | null | undefined>,
    method?: 'zero-toggle' | 'withdrawal' | 'visual-signing',
    activityType?: string
  ) => string[];
  formatIrrBatch: (
    irrs: Array<number | null | undefined>,
    type?: 'fund' | 'product'
  ) => string[];
  getHideZeros: () => boolean;
  getVisualSigning: () => boolean;
  getFormatWithdrawalsAsNegative: () => boolean;
}

