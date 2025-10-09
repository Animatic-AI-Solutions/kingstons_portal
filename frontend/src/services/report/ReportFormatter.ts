/**
 * ReportFormatter - Centralized formatting service for report display
 * Part of Phase 1 refactoring - extracted from ReportDisplay component
 * 
 * This service manages all formatting logic that was previously handled
 * by wrapper functions in ReportDisplay, integrating with existing
 * formatting utilities and providing configurable options.
 */

import type {
  IReportFormatter,
  FormatterOptions
} from '../../types/reportServices';

import {
  formatCurrencyWithZeroToggle,
  formatWithdrawalAmount,
  formatCurrencyWithVisualSigning,
  formatIrrWithPrecision,
  type ActivityType,
  type VisualSigningResult
} from '../../utils/reportFormatters';

export class ReportFormatter implements IReportFormatter {
  private options: FormatterOptions;

  constructor(initialOptions: FormatterOptions = {}) {
    // Initialize with default options matching original ReportDisplay behavior
    this.options = {
      hideZeros: false,
      visualSigning: false,
      formatWithdrawalsAsNegative: false,
      ...initialOptions
    };
  }

  // =============================================================================
  // CONFIGURATION METHODS
  // =============================================================================

  updateOptions(newOptions: FormatterOptions): void {
    this.options = {
      ...this.options,
      ...newOptions
    };
  }

  getOptions(): FormatterOptions {
    return { ...this.options };
  }

  // =============================================================================
  // FORMATTING METHODS (replacing wrapper functions from ReportDisplay)
  // =============================================================================

  /**
   * Format currency with zero toggle support
   * Replaces formatCurrencyWithZeroToggleWrapper from ReportDisplay (lines 903-905)
   */
  formatCurrencyWithZeroToggle(amount: number | null | undefined): string {
    return formatCurrencyWithZeroToggle(amount, this.options.hideZeros);
  }

  /**
   * Format withdrawal amounts with negative formatting option
   * Replaces formatWithdrawalAmountWrapper from ReportDisplay (lines 908-910)
   */
  formatWithdrawalAmount(amount: number | null | undefined): string {
    return formatWithdrawalAmount(amount, this.options.formatWithdrawalsAsNegative || false);
  }

  /**
   * Format currency with visual signing support
   * Replaces formatCurrencyWithVisualSigningWrapper from ReportDisplay (lines 913-918)
   */
  formatCurrencyWithVisualSigning(
    amount: number | null | undefined, 
    activityType: string
  ): string {
    // Type guard to ensure activityType is valid
    const validActivityType = this.validateActivityType(activityType);
    
    const result = formatCurrencyWithVisualSigning(
      amount, 
      validActivityType, 
      this.options.visualSigning || false, 
      this.options.hideZeros || false
    );

    // Return just the formatted value for backwards compatibility
    // The className can be accessed separately if needed
    return result.value;
  }

  /**
   * Format currency with visual signing and return full result with className
   * Enhanced version that returns both value and CSS class
   */
  formatCurrencyWithVisualSigningFull(
    amount: number | null | undefined, 
    activityType: string
  ): VisualSigningResult {
    const validActivityType = this.validateActivityType(activityType);
    
    return formatCurrencyWithVisualSigning(
      amount, 
      validActivityType, 
      this.options.visualSigning || false, 
      this.options.hideZeros || false
    );
  }

  /**
   * Format fund IRR with no decimal places
   * Replaces formatFundIrr from ReportDisplay (lines 1222-1227)
   */
  formatFundIrr(irr: number | null | undefined): string {
    if (irr === null || irr === undefined) return '-';
    
    // Round to 0 decimal places for fund IRRs (as per original logic)
    return `${Math.round(irr)}%`;
  }

  /**
   * Format product/portfolio IRR with 1 decimal place
   * Uses existing formatIrrWithPrecision utility
   */
  formatProductIrr(irr: number | null | undefined): string {
    return formatIrrWithPrecision(irr);
  }

  // =============================================================================
  // CONVENIENCE METHODS
  // =============================================================================

  /**
   * Toggle zero visibility option
   */
  toggleHideZeros(): boolean {
    this.options.hideZeros = !this.options.hideZeros;
    return this.options.hideZeros;
  }

  /**
   * Toggle visual signing option
   */
  toggleVisualSigning(): boolean {
    this.options.visualSigning = !this.options.visualSigning;
    return this.options.visualSigning;
  }

  /**
   * Set withdrawal formatting option
   */
  setFormatWithdrawalsAsNegative(enabled: boolean): void {
    this.options.formatWithdrawalsAsNegative = enabled;
  }

  /**
   * Get current hide zeros setting
   */
  getHideZeros(): boolean {
    return this.options.hideZeros || false;
  }

  /**
   * Get current visual signing setting
   */
  getVisualSigning(): boolean {
    return this.options.visualSigning || false;
  }

  /**
   * Get current withdrawal formatting setting
   */
  getFormatWithdrawalsAsNegative(): boolean {
    return this.options.formatWithdrawalsAsNegative || false;
  }

  // =============================================================================
  // BATCH FORMATTING METHODS (for performance)
  // =============================================================================

  /**
   * Format multiple currency values at once
   * Useful for table rendering performance
   */
  formatCurrencyBatch(
    amounts: Array<number | null | undefined>,
    method: 'zero-toggle' | 'withdrawal' | 'visual-signing' = 'zero-toggle',
    activityType?: string
  ): string[] {
    switch (method) {
      case 'zero-toggle':
        return amounts.map(amount => this.formatCurrencyWithZeroToggle(amount));
      case 'withdrawal':
        return amounts.map(amount => this.formatWithdrawalAmount(amount));
      case 'visual-signing':
        if (!activityType) {
          throw new Error('activityType is required for visual-signing batch formatting');
        }
        return amounts.map(amount => this.formatCurrencyWithVisualSigning(amount, activityType));
      default:
        return amounts.map(amount => this.formatCurrencyWithZeroToggle(amount));
    }
  }

  /**
   * Format multiple IRR values at once
   */
  formatIrrBatch(
    irrs: Array<number | null | undefined>,
    type: 'fund' | 'product' = 'fund'
  ): string[] {
    if (type === 'fund') {
      return irrs.map(irr => this.formatFundIrr(irr));
    } else {
      return irrs.map(irr => this.formatProductIrr(irr));
    }
  }

  // =============================================================================
  // PRIVATE HELPER METHODS
  // =============================================================================

  /**
   * Validate and normalize activity type
   */
  private validateActivityType(activityType: string): ActivityType {
    const validTypes: ActivityType[] = [
      'investment', 
      'tax_uplift', 
      'product_switch_in', 
      'product_switch_out', 
      'withdrawal', 
      'fund_switch'
    ];

    if (validTypes.includes(activityType as ActivityType)) {
      return activityType as ActivityType;
    }

    // Default fallback to prevent errors
    console.warn(`Invalid activity type: ${activityType}. Defaulting to 'investment'.`);
    return 'investment';
  }
}

// Export factory function for consistent creation
export const createReportFormatter = (options?: FormatterOptions): ReportFormatter => {
  return new ReportFormatter(options);
};

// Export singleton instance for use across the application
let reportFormatterInstance: ReportFormatter | null = null;

export const getReportFormatter = (): ReportFormatter => {
  if (!reportFormatterInstance) {
    reportFormatterInstance = new ReportFormatter();
  }
  return reportFormatterInstance;
};

export default ReportFormatter; 