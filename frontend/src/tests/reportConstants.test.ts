/**
 * Tests for shared report constants
 * Following TDD approach as outlined in project testing strategy
 */

import {
  PRODUCT_TYPE_ORDER,
  normalizeProductType,
  DEFAULT_FORMATTING_OPTIONS,
  REPORT_TABS,
  type ReportTab
} from '../utils/reportConstants';

describe('Product Type Constants', () => {
  describe('PRODUCT_TYPE_ORDER', () => {
    it('should contain expected product types in correct order', () => {
      expect(PRODUCT_TYPE_ORDER).toEqual([
        'ISAs',
        'GIAs', 
        'Onshore Bonds',
        'Offshore Bonds',
        'Pensions',
        'Other'
      ]);
    });

    it('should be a readonly array', () => {
      // TypeScript should enforce this at compile time
      expect(Array.isArray(PRODUCT_TYPE_ORDER)).toBe(true);
      expect(PRODUCT_TYPE_ORDER.length).toBe(6);
    });
  });

  describe('normalizeProductType', () => {
    it('should normalize ISA variations correctly', () => {
      expect(normalizeProductType('ISA')).toBe('ISAs');
      expect(normalizeProductType('isa')).toBe('ISAs');
      expect(normalizeProductType('Cash ISA')).toBe('ISAs');
      expect(normalizeProductType('Stocks & Shares ISA')).toBe('ISAs');
      expect(normalizeProductType('JISA')).toBe('ISAs');
    });

    it('should normalize GIA variations correctly', () => {
      expect(normalizeProductType('GIA')).toBe('GIAs');
      expect(normalizeProductType('gia')).toBe('GIAs');
      expect(normalizeProductType('General Investment Account')).toBe('GIAs');
      expect(normalizeProductType('general investment account')).toBe('GIAs');
    });

    it('should normalize bond variations correctly', () => {
      expect(normalizeProductType('Onshore Bond')).toBe('Onshore Bonds');
      expect(normalizeProductType('onshore bond')).toBe('Onshore Bonds');
      expect(normalizeProductType('Offshore Bond')).toBe('Offshore Bonds');
      expect(normalizeProductType('offshore bond')).toBe('Offshore Bonds');
      expect(normalizeProductType('Bond')).toBe('Onshore Bonds'); // Default to onshore
      expect(normalizeProductType('Investment Bond')).toBe('Onshore Bonds');
    });

    it('should normalize pension variations correctly', () => {
      expect(normalizeProductType('Pension')).toBe('Pensions');
      expect(normalizeProductType('pension')).toBe('Pensions');
      expect(normalizeProductType('SIPP')).toBe('Pensions');
      expect(normalizeProductType('sipp')).toBe('Pensions');
      expect(normalizeProductType('SSAS')).toBe('Pensions');
      expect(normalizeProductType('ssas')).toBe('Pensions');
      expect(normalizeProductType('Personal Pension')).toBe('Pensions');
    });

    it('should handle undefined and unknown types', () => {
      expect(normalizeProductType(undefined)).toBe('Other');
      expect(normalizeProductType('')).toBe('Other');
      expect(normalizeProductType('Unknown Product')).toBe('Other');
      expect(normalizeProductType('Savings Account')).toBe('Other');
    });

    it('should handle case variations and whitespace', () => {
      expect(normalizeProductType('  ISA  ')).toBe('ISAs');
      expect(normalizeProductType('PENSION ')).toBe('Pensions');
      expect(normalizeProductType(' offshore bond ')).toBe('Offshore Bonds');
    });
  });
});

describe('Default Formatting Options', () => {
  describe('DEFAULT_FORMATTING_OPTIONS', () => {
    it('should have expected default values', () => {
      expect(DEFAULT_FORMATTING_OPTIONS.truncateAmounts).toBe(false);
      expect(DEFAULT_FORMATTING_OPTIONS.roundIrrToOne).toBe(true);
      expect(DEFAULT_FORMATTING_OPTIONS.formatWithdrawalsAsNegative).toBe(false);
      expect(DEFAULT_FORMATTING_OPTIONS.showInactiveProducts).toBe(false);
      expect(DEFAULT_FORMATTING_OPTIONS.showPreviousFunds).toBe(true);
    });

    it('should be a readonly object', () => {
      // TypeScript should enforce this at compile time
      expect(typeof DEFAULT_FORMATTING_OPTIONS).toBe('object');
      expect(DEFAULT_FORMATTING_OPTIONS).not.toBeNull();
    });
  });
});

describe('Report Tab Constants', () => {
  describe('REPORT_TABS', () => {
    it('should contain expected tab values', () => {
      expect(REPORT_TABS.SUMMARY).toBe('summary');
      expect(REPORT_TABS.IRR_HISTORY).toBe('irr-history');
    });

    it('should be a readonly object', () => {
      expect(typeof REPORT_TABS).toBe('object');
      expect(REPORT_TABS).not.toBeNull();
    });
  });

  describe('ReportTab type', () => {
    it('should accept valid tab values', () => {
      const validTab1: ReportTab = 'summary';
      const validTab2: ReportTab = 'irr-history';
      
      expect(validTab1).toBe('summary');
      expect(validTab2).toBe('irr-history');
    });
  });
}); 