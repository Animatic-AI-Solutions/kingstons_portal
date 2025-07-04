/**
 * Unit tests for ReportFormatter
 * Part of Phase 1 refactoring - ensures formatting logic works correctly
 */

import { ReportFormatter, createReportFormatter, getReportFormatter } from '../../../services/report/ReportFormatter';
import type { FormatterOptions } from '../../../types/reportServices';

describe('ReportFormatter', () => {
  let formatter: ReportFormatter;

  beforeEach(() => {
    formatter = new ReportFormatter();
  });

  describe('Initial Configuration', () => {
    it('should initialize with default options', () => {
      const options = formatter.getOptions();
      
      expect(options.hideZeros).toBe(false);
      expect(options.visualSigning).toBe(false);
      expect(options.formatWithdrawalsAsNegative).toBe(false);
    });

    it('should initialize with custom options', () => {
      const customOptions: FormatterOptions = {
        hideZeros: true,
        visualSigning: true,
        formatWithdrawalsAsNegative: true
      };
      
      const customFormatter = new ReportFormatter(customOptions);
      const options = customFormatter.getOptions();
      
      expect(options.hideZeros).toBe(true);
      expect(options.visualSigning).toBe(true);
      expect(options.formatWithdrawalsAsNegative).toBe(true);
    });
  });

  describe('Currency Formatting with Zero Toggle', () => {
    it('should format currency amounts correctly', () => {
      expect(formatter.formatCurrencyWithZeroToggle(1000)).toBe('£1,000');
      expect(formatter.formatCurrencyWithZeroToggle(1500.75)).toBe('£1,501');
      expect(formatter.formatCurrencyWithZeroToggle(-500)).toBe('-£500');
      expect(formatter.formatCurrencyWithZeroToggle(0)).toBe('£0');
    });

    it('should handle null and undefined values', () => {
      expect(formatter.formatCurrencyWithZeroToggle(null)).toBe('£0');
      expect(formatter.formatCurrencyWithZeroToggle(undefined)).toBe('£0');
    });

    it('should hide zeros when option is enabled', () => {
      formatter.updateOptions({ hideZeros: true });
      
      expect(formatter.formatCurrencyWithZeroToggle(0)).toBe('-');
      expect(formatter.formatCurrencyWithZeroToggle(null)).toBe('-');
      expect(formatter.formatCurrencyWithZeroToggle(undefined)).toBe('-');
      expect(formatter.formatCurrencyWithZeroToggle(1000)).toBe('£1,000');
    });
  });

  describe('IRR Formatting', () => {
    it('should format fund IRR with no decimals', () => {
      expect(formatter.formatFundIrr(10.7)).toBe('11%');
      expect(formatter.formatFundIrr(5.4)).toBe('5%');
      expect(formatter.formatFundIrr(-2.8)).toBe('-3%');
      expect(formatter.formatFundIrr(0)).toBe('0%');
      expect(formatter.formatFundIrr(null)).toBe('-');
      expect(formatter.formatFundIrr(undefined)).toBe('-');
    });

    it('should format product IRR with 1 decimal place', () => {
      expect(formatter.formatProductIrr(10.75)).toBe('10.8%');
      expect(formatter.formatProductIrr(5.44)).toBe('5.4%');
      expect(formatter.formatProductIrr(0)).toBe('0.0%');
      expect(formatter.formatProductIrr(null)).toBe('-');
      expect(formatter.formatProductIrr(undefined)).toBe('-');
    });
  });

  describe('Option Management', () => {
    it('should toggle hide zeros option', () => {
      expect(formatter.getHideZeros()).toBe(false);
      
      const result1 = formatter.toggleHideZeros();
      expect(result1).toBe(true);
      expect(formatter.getHideZeros()).toBe(true);
      
      const result2 = formatter.toggleHideZeros();
      expect(result2).toBe(false);
      expect(formatter.getHideZeros()).toBe(false);
    });

    it('should toggle visual signing option', () => {
      expect(formatter.getVisualSigning()).toBe(false);
      
      const result1 = formatter.toggleVisualSigning();
      expect(result1).toBe(true);
      expect(formatter.getVisualSigning()).toBe(true);
      
      const result2 = formatter.toggleVisualSigning();
      expect(result2).toBe(false);
      expect(formatter.getVisualSigning()).toBe(false);
    });
  });

  describe('Visual Signing Formatting', () => {
    it('should handle invalid activity types gracefully', () => {
      expect(() => formatter.formatCurrencyWithVisualSigning(1000, 'invalid_type')).not.toThrow();
      expect(formatter.formatCurrencyWithVisualSigning(1000, 'invalid_type')).toBe('£1,000');
    });

    it('should return full visual signing result', () => {
      const result = formatter.formatCurrencyWithVisualSigningFull(1000, 'investment');
      
      expect(result).toHaveProperty('value');
      expect(result).toHaveProperty('className');
      expect(typeof result.value).toBe('string');
      expect(typeof result.className).toBe('string');
    });
  });
});

describe('Factory Functions', () => {
  describe('createReportFormatter', () => {
    it('should create new instances with options', () => {
      const options: FormatterOptions = { hideZeros: true };
      const formatter = createReportFormatter(options);
      
      expect(formatter.getHideZeros()).toBe(true);
    });
  });

  describe('getReportFormatter singleton', () => {
    it('should return the same instance', () => {
      const instance1 = getReportFormatter();
      const instance2 = getReportFormatter();
      
      expect(instance1).toBe(instance2);
    });
  });
}); 