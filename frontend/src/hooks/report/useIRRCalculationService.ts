/**
 * useIRRCalculationService - React hook for IRRCalculationService integration
 * Part of Phase 1 refactoring - provides React integration for IRR calculations
 * 
 * This hook replaces the IRR calculation functions that were in ReportDisplay
 * and provides a clean interface to the centralized IRR calculation service.
 */

import { useMemo, useCallback, useState } from 'react';
import { AxiosInstance } from 'axios';
import { createIRRCalculationService } from '../../services/report/IRRCalculationService';
import type { 
  UseIRRCalculationService, 
  IRRCalculationOptions,
  IRRCalculationResult,
  PortfolioIRRMap,
  IRRHistoryData
} from '../../types/reportServices';
import type {
  ProductPeriodSummary,
  ReportData
} from '../../types/reportTypes';

/**
 * Custom hook that provides access to IRRCalculationService with React integration
 * Automatically handles loading states and provides memoized calculation functions
 */
export const useIRRCalculationService = (
  api: AxiosInstance,
  initialOptions?: IRRCalculationOptions
): UseIRRCalculationService => {
  // Create service instance with API and initial options
  const service = useMemo(() => {
    return createIRRCalculationService(api, initialOptions);
  }, [api]); // Only recreate if API instance changes

  // Local loading and error states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Update options when they change
  const updateOptions = useCallback((newOptions: IRRCalculationOptions) => {
    service.updateOptions(newOptions);
  }, [service]);

  // Memoized IRR calculation functions with error handling and loading states
  const fetchPortfolioIrrValues = useCallback(async (
    productSummaries: ProductPeriodSummary[]
  ): Promise<PortfolioIRRMap> => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await service.fetchPortfolioIrrValues(productSummaries);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      console.error('Error in fetchPortfolioIrrValues:', error);
      return new Map();
    } finally {
      setIsLoading(false);
    }
  }, [service]);

  const processHistoricalIRRData = useCallback(async (
    reportData: ReportData
  ): Promise<IRRHistoryData[]> => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await service.processHistoricalIRRData(reportData);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      console.error('Error in processHistoricalIRRData:', error);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [service]);

  const calculateRealTimeTotalIRR = useCallback(async (
    reportData: ReportData
  ): Promise<IRRCalculationResult> => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await service.calculateRealTimeTotalIRR(reportData);
      if (!result.success && result.error) {
        setError(new Error(result.error));
      }
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      console.error('Error in calculateRealTimeTotalIRR:', error);
      return { success: false, irr: null, error: error.message };
    } finally {
      setIsLoading(false);
    }
  }, [service]);

  // Utility methods (synchronous, no loading state needed)
  const extractPortfolioFundIds = useCallback((
    reportData: ReportData
  ): number[] => {
    return service.extractPortfolioFundIds(reportData);
  }, [service]);

  const normalizeIRRDate = useCallback((
    date: string
  ): string => {
    return service.normalizeIRRDate(date);
  }, [service]);

  // Integration methods with error handling
  const getStoredPortfolioIRR = useCallback(async (
    portfolioId: number
  ): Promise<number | null> => {
    try {
      setError(null);
      return await service.getStoredPortfolioIRR(portfolioId);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      console.error('Error in getStoredPortfolioIRR:', error);
      return null;
    }
  }, [service]);

  const getHistoricalIRR = useCallback(async (
    productId: number,
    limit: number = 12
  ): Promise<any> => {
    try {
      setError(null);
      return await service.getHistoricalIRR(productId, limit);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      console.error('Error in getHistoricalIRR:', error);
      return null;
    }
  }, [service]);

  const calculateHistoricalIRR = useCallback(async (
    portfolioFundIds: number[],
    endDate?: string
  ): Promise<number | null> => {
    try {
      setError(null);
      return await service.calculateHistoricalIRR(portfolioFundIds, endDate);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      console.error('Error in calculateHistoricalIRR:', error);
      return null;
    }
  }, [service]);

  // Current options getter
  const getCurrentOptions = useCallback((): IRRCalculationOptions => {
    return service.getOptions();
  }, [service]);

  return {
    // Core methods
    fetchPortfolioIrrValues,
    processHistoricalIRRData,
    calculateRealTimeTotalIRR,
    
    // Configuration
    updateOptions,
    options: getCurrentOptions(),
    
    // Utility methods
    extractPortfolioFundIds,
    normalizeIRRDate,
    
    // Integration methods
    getStoredPortfolioIRR,
    getHistoricalIRR,
    calculateHistoricalIRR,
  };
};

/**
 * Hook for components that need IRR calculations with synchronized state
 * This version will automatically sync with ReportStateManager when integrated
 */
export const useIRRCalculationServiceWithState = (api: AxiosInstance) => {
  // This will be implemented once we integrate with ReportStateManager
  // For now, return the standard service
  return useIRRCalculationService(api);
};

/**
 * Hook for read-only IRR operations
 * Useful for display components that don't need to trigger calculations
 */
export const useIRRCalculationServiceReadOnly = (
  api: AxiosInstance, 
  options?: IRRCalculationOptions
) => {
  const service = useMemo(() => {
    return createIRRCalculationService(api, options);
  }, [api, options]);

  return {
    extractPortfolioFundIds: (reportData: ReportData) =>
      service.extractPortfolioFundIds(reportData),
    normalizeIRRDate: (date: string) =>
      service.normalizeIRRDate(date),
    options: service.getOptions(),
  };
};

export default useIRRCalculationService; 