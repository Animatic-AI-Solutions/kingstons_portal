/**
 * Tests for shared report formatting utilities
 * Following TDD approach as outlined in project testing strategy
 */

import {
  formatCurrencyWithTruncation,
  formatCurrencyWithZeroToggle,
  formatIrrWithPrecision,
  formatWithdrawalAmount,
  formatRiskFallback,
  formatFundRisk,
  formatWeightedRisk,
  isOutflowActivity,
  isInflowActivity,
  formatCurrencyWithVisualSigning,
  calculateNetFundSwitches,
  type ActivityType,
  type VisualSigningResult
} from '../utils/reportFormatters';

describe('Currency Formatting', () => {
  describe('formatCurrencyWithTruncation', () => {
    it('should format positive amounts correctly', () => {
      expect(formatCurrencyWithTruncation(1000)).toBe('£1,000');
      expect(formatCurrencyWithTruncation(1234.56)).toBe('£1,235');
      expect(formatCurrencyWithTruncation(0)).toBe('£0');
    });

    it('should format negative amounts correctly', () => {
      expect(formatCurrencyWithTruncation(-1000)).toBe('-£1,000');
      expect(formatCurrencyWithTruncation(-1234.56)).toBe('-£1,235');
    });

    it('should handle null and undefined values', () => {
      expect(formatCurrencyWithTruncation(null)).toBe('£0');
      expect(formatCurrencyWithTruncation(undefined)).toBe('£0');
    });

    it('should round to nearest whole number', () => {
      expect(formatCurrencyWithTruncation(1234.4)).toBe('£1,234');
      expect(formatCurrencyWithTruncation(1234.5)).toBe('£1,235');
      expect(formatCurrencyWithTruncation(1234.6)).toBe('£1,235');
    });
  });

  describe('formatCurrencyWithZeroToggle', () => {
    it('should format normally when hideZeros is false', () => {
      expect(formatCurrencyWithZeroToggle(1000, false)).toBe('£1,000');
      expect(formatCurrencyWithZeroToggle(0, false)).toBe('£0');
      expect(formatCurrencyWithZeroToggle(null, false)).toBe('£0');
    });

    it('should hide zeros when hideZeros is true', () => {
      expect(formatCurrencyWithZeroToggle(1000, true)).toBe('£1,000');
      expect(formatCurrencyWithZeroToggle(0, true)).toBe('-');
      expect(formatCurrencyWithZeroToggle(null, true)).toBe('-');
      expect(formatCurrencyWithZeroToggle(undefined, true)).toBe('-');
    });
  });
});

describe('IRR Formatting', () => {
  describe('formatIrrWithPrecision', () => {
    it('should format IRR values with 1 decimal place', () => {
      expect(formatIrrWithPrecision(5.67)).toBe('5.7%');
      expect(formatIrrWithPrecision(10)).toBe('10.0%');
      expect(formatIrrWithPrecision(0)).toBe('0.0%');
      expect(formatIrrWithPrecision(-3.45)).toBe('-3.5%');
    });

    it('should handle null and undefined values', () => {
      expect(formatIrrWithPrecision(null)).toBe('-');
      expect(formatIrrWithPrecision(undefined)).toBe('-');
    });
  });
});

describe('Withdrawal Formatting', () => {
  describe('formatWithdrawalAmount', () => {
    it('should format withdrawal amounts normally by default', () => {
      expect(formatWithdrawalAmount(1000)).toBe('£1,000');
      expect(formatWithdrawalAmount(0)).toBe('£0');
    });

    it('should format as negative when specified', () => {
      expect(formatWithdrawalAmount(1000, true)).toBe('-£1,000');
      expect(formatWithdrawalAmount(0, true)).toBe('£0');
    });

    it('should handle null and undefined values', () => {
      expect(formatWithdrawalAmount(null)).toBe('-');
      expect(formatWithdrawalAmount(undefined)).toBe('-');
    });
  });
});

describe('Risk Formatting', () => {
  describe('formatRiskFallback', () => {
    it('should format risk with 1 decimal place', () => {
      expect(formatRiskFallback(3.45)).toBe('3.5');
      expect(formatRiskFallback(5)).toBe('5.0');
      expect(formatRiskFallback(0)).toBe('0.0');
    });

    it('should handle undefined and null values', () => {
      expect(formatRiskFallback(undefined)).toBe('-');
      expect(formatRiskFallback(null as any)).toBe('-');
    });
  });

  describe('formatFundRisk', () => {
    it('should format fund risk as whole numbers', () => {
      expect(formatFundRisk(3.45)).toBe('3');
      expect(formatFundRisk(5.67)).toBe('6');
      expect(formatFundRisk(5)).toBe('5');
    });

    it('should handle undefined and null values', () => {
      expect(formatFundRisk(undefined)).toBe('-');
      expect(formatFundRisk(null as any)).toBe('-');
    });
  });

  describe('formatWeightedRisk', () => {
    it('should format weighted risk with smart decimal places', () => {
      expect(formatWeightedRisk(3.45)).toBe('3.5');
      expect(formatWeightedRisk(5)).toBe('5');
      expect(formatWeightedRisk(3.0)).toBe('3');
      expect(formatWeightedRisk(2.75)).toBe('2.8');
    });

    it('should handle undefined and null values', () => {
      expect(formatWeightedRisk(undefined)).toBe('-');
      expect(formatWeightedRisk(null as any)).toBe('-');
    });
  });
});

describe('Activity Type Classification', () => {
  describe('isOutflowActivity', () => {
    it('should identify outflow activities correctly', () => {
      expect(isOutflowActivity('withdrawal')).toBe(true);
      expect(isOutflowActivity('product_switch_out')).toBe(true);
      expect(isOutflowActivity('investment')).toBe(false);
      expect(isOutflowActivity('tax_uplift')).toBe(false);
      expect(isOutflowActivity('product_switch_in')).toBe(false);
      expect(isOutflowActivity('fund_switch')).toBe(false);
    });
  });

  describe('isInflowActivity', () => {
    it('should identify inflow activities correctly', () => {
      expect(isInflowActivity('investment')).toBe(true);
      expect(isInflowActivity('tax_uplift')).toBe(true);
      expect(isInflowActivity('product_switch_in')).toBe(true);
      expect(isInflowActivity('withdrawal')).toBe(false);
      expect(isInflowActivity('product_switch_out')).toBe(false);
      expect(isInflowActivity('fund_switch')).toBe(false);
    });
  });
});

describe('Visual Signing Currency Formatting', () => {
  describe('formatCurrencyWithVisualSigning', () => {
    it('should format normally when visual signing is off', () => {
      const result = formatCurrencyWithVisualSigning(1000, 'investment', false);
      expect(result.value).toBe('£1,000');
      expect(result.className).toBe('');
    });

    it('should show outflows as negative in normal mode', () => {
      const result = formatCurrencyWithVisualSigning(1000, 'withdrawal', false);
      expect(result.value).toBe('-£1,000');
      expect(result.className).toBe('');
    });

    it('should apply color classes when visual signing is on', () => {
      // Inflow activities should be green
      const inflowResult = formatCurrencyWithVisualSigning(1000, 'investment', true);
      expect(inflowResult.value).toBe('£1,000');
      expect(inflowResult.className).toBe('text-green-600');

      // Outflow activities should be red
      const outflowResult = formatCurrencyWithVisualSigning(1000, 'withdrawal', true);
      expect(outflowResult.value).toBe('-£1,000');
      expect(outflowResult.className).toBe('text-red-600');

      // Fund switches should be neutral
      const fundSwitchResult = formatCurrencyWithVisualSigning(1000, 'fund_switch', true);
      expect(fundSwitchResult.value).toBe('£1,000');
      expect(fundSwitchResult.className).toBe('text-gray-900');
    });

    it('should handle zero values correctly', () => {
      const normalResult = formatCurrencyWithVisualSigning(0, 'investment', true, false);
      expect(normalResult.value).toBe('£0');
      expect(normalResult.className).toBe('');

      const hideZerosResult = formatCurrencyWithVisualSigning(0, 'investment', true, true);
      expect(hideZerosResult.value).toBe('-');
      expect(hideZerosResult.className).toBe('');
    });

    it('should handle null and undefined values', () => {
      const nullResult = formatCurrencyWithVisualSigning(null, 'investment', true);
      expect(nullResult.value).toBe('£0');
      expect(nullResult.className).toBe('');

      const undefinedResult = formatCurrencyWithVisualSigning(undefined, 'investment', true);
      expect(undefinedResult.value).toBe('£0');
      expect(undefinedResult.className).toBe('');
    });
  });
});

describe('Utility Functions', () => {
  describe('calculateNetFundSwitches', () => {
    it('should calculate net fund switches correctly', () => {
      expect(calculateNetFundSwitches(1000, 500)).toBe(500);
      expect(calculateNetFundSwitches(500, 1000)).toBe(-500);
      expect(calculateNetFundSwitches(0, 0)).toBe(0);
    });

    it('should handle null and undefined values as zero', () => {
      expect(calculateNetFundSwitches(1000, null as any)).toBe(1000);
      expect(calculateNetFundSwitches(null as any, 500)).toBe(-500);
      expect(calculateNetFundSwitches(undefined as any, undefined as any)).toBe(0);
    });
  });
}); 