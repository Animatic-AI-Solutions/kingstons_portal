/**
 * usePrintService - React hook for PrintService integration
 * Part of Phase 1 refactoring - provides React integration for report printing
 * 
 * This hook replaces the printing functions that were in ReportDisplay
 * and provides a clean interface to the centralized print service.
 */

import { useMemo, useCallback, useState } from 'react';
import * as React from 'react';
import { useReactToPrint } from 'react-to-print';
import { createPrintService } from '../../services/report/PrintService';
import type { 
  UsePrintService, 
  PrintOptions,
  PrintPreparationResult
} from '../../types/reportServices';
import type { ReportData } from '../../types/reportTypes';

/**
 * Custom hook that provides access to PrintService with React integration
 * Automatically handles loading states and provides memoized printing functions
 */
export const usePrintService = (
  initialOptions?: PrintOptions
): UsePrintService => {
  // Create service instance with initial options
  const service = useMemo(() => {
    return createPrintService(initialOptions);
  }, []); // Only create once - options can be updated via updateOptions

  // Local loading and error states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Update options when they change
  const updateOptions = useCallback((newOptions: PrintOptions) => {
    service.updateOptions(newOptions);
  }, [service]);

  // Simple function to get print configuration for use with components' own useReactToPrint
  const getPrintConfiguration = useCallback((
    contentRef: React.RefObject<HTMLElement>,
    options?: PrintOptions
  ) => {
    return service.getPrintConfiguration(contentRef, options);
  }, [service]);

  const prepareForPrint = useCallback(async (
    reportData: ReportData,
    options?: PrintOptions
  ): Promise<PrintPreparationResult> => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await service.prepareForPrint(reportData, options);
      if (!result.success && result.error) {
        setError(new Error(result.error));
      }
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      console.error('Error preparing for print:', error);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  }, [service]);

  // Utility methods (synchronous, no loading state needed)
  const generatePrintStyles = useCallback((
    options?: PrintOptions
  ): string => {
    return service.generatePrintStyles(options);
  }, [service]);

  const generateDocumentTitle = useCallback((
    reportData?: ReportData
  ): string => {
    return service.generateDocumentTitle(reportData);
  }, [service]);

  const validateOptions = useCallback((
    options: PrintOptions
  ): { valid: boolean; errors: string[] } => {
    return service.validateOptions(options);
  }, [service]);

  const setIRRHistoryLoader = useCallback((
    loader: () => Promise<any>
  ): void => {
    service.setIRRHistoryLoader(loader);
  }, [service]);

  // Page numbering methods
  const setPageNumbering = useCallback((
    enabled: boolean = true,
    position: 'bottom-left' | 'bottom-center' | 'bottom-right' | 'top-left' | 'top-center' | 'top-right' = 'bottom-right',
    format: 'page-only' | 'page-total' | 'custom' = 'page-only',
    customFormat?: string
  ): void => {
    service.setPageNumbering(enabled, position, format, customFormat);
  }, [service]);

  const disablePageNumbers = useCallback((): void => {
    service.disablePageNumbers();
  }, [service]);

  const enablePageNumbers = useCallback((): void => {
    service.enablePageNumbers();
  }, [service]);

  // Current options getter
  const getCurrentOptions = useCallback((): PrintOptions => {
    return service.getDefaultOptions();
  }, [service]);

  return {
    // Core methods
    getPrintConfiguration,
    prepareForPrint,
    
    // State
    isLoading,
    error,
    options: getCurrentOptions(),
    
    // Configuration
    updateOptions,
    
    // Page numbering
    setPageNumbering,
    disablePageNumbers,
    enablePageNumbers,
    
    // Utility methods
    generatePrintStyles,
    generateDocumentTitle,
    validateOptions,
    setIRRHistoryLoader,
  };
};

/**
 * Hook for components that need print functionality with pre-configured options
 * Useful for standardizing print behavior across components
 */
export const usePrintServiceWithDefaults = (
  reportData?: ReportData,
  irrHistoryLoader?: () => Promise<any>
) => {
  const defaultOptions: PrintOptions = useMemo(() => ({
    orientation: 'landscape',
    ensureIRRHistory: true,
    preserveColors: true,
    documentTitle: reportData ? `Report_${reportData.timePeriod?.replace(/\s+/g, '_') || 'Export'}.pdf` : undefined
  }), [reportData]);

  const printService = usePrintService(defaultOptions);

  // Set IRR history loader if provided
  useMemo(() => {
    if (irrHistoryLoader) {
      printService.setIRRHistoryLoader(irrHistoryLoader);
    }
  }, [irrHistoryLoader, printService]);

  return printService;
};

/**
 * Hook for read-only print operations
 * Useful for components that only need to generate styles or validate options
 */
export const usePrintServiceReadOnly = (options?: PrintOptions) => {
  const service = useMemo(() => {
    return createPrintService(options);
  }, [options]);

  return {
    generatePrintStyles: (printOptions?: PrintOptions) =>
      service.generatePrintStyles(printOptions),
    generateDocumentTitle: (reportData?: ReportData) =>
      service.generateDocumentTitle(reportData),
    validateOptions: (printOptions: PrintOptions) =>
      service.validateOptions(printOptions),
    options: service.getDefaultOptions(),
  };
};

export default usePrintService; 