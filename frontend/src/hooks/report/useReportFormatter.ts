/**
 * useReportFormatter - React hook for ReportFormatter integration
 * Part of Phase 1 refactoring - provides React integration for centralized formatting
 * 
 * This hook replaces the formatting wrapper functions that were in ReportDisplay
 * and provides a clean interface to the centralized formatter service.
 */

import { useMemo, useCallback } from 'react';
import { createReportFormatter } from '../../services/report/ReportFormatter';
import type { UseReportFormatter, FormatterOptions } from '../../types/reportServices';

/**
 * Custom hook that provides access to ReportFormatter with configurable options
 * Automatically handles option updates and provides memoized formatting functions
 */
export const useReportFormatter = (
  initialOptions?: FormatterOptions
): UseReportFormatter => {
  // Create formatter instance with initial options
  const formatter = useMemo(() => {
    return createReportFormatter(initialOptions);
  }, []); // Empty dependency array - we manage options separately

  // Update options when they change
  const updateOptions = useCallback((newOptions: FormatterOptions) => {
    formatter.updateOptions(newOptions);
  }, [formatter]);

  // Memoized formatting functions
  const formatCurrencyWithZeroToggle = useCallback((
    amount: number | null | undefined
  ): string => {
    return formatter.formatCurrencyWithZeroToggle(amount);
  }, [formatter]);

  const formatWithdrawalAmount = useCallback((
    amount: number | null | undefined
  ): string => {
    return formatter.formatWithdrawalAmount(amount);
  }, [formatter]);

  const formatCurrencyWithVisualSigning = useCallback((
    amount: number | null | undefined,
    activityType: string
  ): string => {
    return formatter.formatCurrencyWithVisualSigning(amount, activityType);
  }, [formatter]);

  const formatFundIrr = useCallback((
    irr: number | null | undefined
  ): string => {
    return formatter.formatFundIrr(irr);
  }, [formatter]);

  // Additional formatting methods
  const formatProductIrr = useCallback((
    irr: number | null | undefined
  ): string => {
    return formatter.formatProductIrr(irr);
  }, [formatter]);

  // Convenience toggle methods
  const toggleHideZeros = useCallback((): boolean => {
    return formatter.toggleHideZeros();
  }, [formatter]);

  const toggleVisualSigning = useCallback((): boolean => {
    return formatter.toggleVisualSigning();
  }, [formatter]);

  // Current options getter
  const getCurrentOptions = useCallback((): FormatterOptions => {
    return formatter.getOptions();
  }, [formatter]);

  // Batch formatting methods for performance
  const formatCurrencyBatch = useCallback((
    amounts: Array<number | null | undefined>,
    method: 'zero-toggle' | 'withdrawal' | 'visual-signing' = 'zero-toggle',
    activityType?: string
  ): string[] => {
    return formatter.formatCurrencyBatch(amounts, method, activityType);
  }, [formatter]);

  const formatIrrBatch = useCallback((
    irrs: Array<number | null | undefined>,
    type: 'fund' | 'product' = 'fund'
  ): string[] => {
    return formatter.formatIrrBatch(irrs, type);
  }, [formatter]);

  return {
    // Core formatting methods (matching IReportFormatter interface)
    formatCurrencyWithZeroToggle,
    formatWithdrawalAmount,
    formatCurrencyWithVisualSigning,
    formatFundIrr,
    
    // Extended formatting methods
    formatProductIrr,
    
    // Configuration methods
    updateOptions,
    options: getCurrentOptions(),
    
    // Convenience methods
    toggleHideZeros,
    toggleVisualSigning,
    
    // Batch methods for performance
    formatCurrencyBatch,
    formatIrrBatch,
    
    // Individual option getters
    getHideZeros: () => formatter.getHideZeros(),
    getVisualSigning: () => formatter.getVisualSigning(),
    getFormatWithdrawalsAsNegative: () => formatter.getFormatWithdrawalsAsNegative(),
  };
};

/**
 * Hook for components that need formatting with synchronized state
 * This version automatically syncs with ReportStateManager options
 */
export const useReportFormatterWithState = () => {
  // This will be implemented once we integrate with ReportStateManager
  // For now, return the standard formatter
  return useReportFormatter();
};

/**
 * Hook for read-only formatting operations
 * Useful for display components that don't need to modify options
 */
export const useReportFormatterReadOnly = (options?: FormatterOptions) => {
  const formatter = useMemo(() => {
    return createReportFormatter(options);
  }, [options]);

  return {
    formatCurrencyWithZeroToggle: (amount: number | null | undefined) =>
      formatter.formatCurrencyWithZeroToggle(amount),
    formatWithdrawalAmount: (amount: number | null | undefined) =>
      formatter.formatWithdrawalAmount(amount),
    formatCurrencyWithVisualSigning: (amount: number | null | undefined, activityType: string) =>
      formatter.formatCurrencyWithVisualSigning(amount, activityType),
    formatFundIrr: (irr: number | null | undefined) =>
      formatter.formatFundIrr(irr),
    formatProductIrr: (irr: number | null | undefined) =>
      formatter.formatProductIrr(irr),
    options: formatter.getOptions(),
  };
};

export default useReportFormatter; 