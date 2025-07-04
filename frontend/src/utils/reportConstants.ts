/**
 * Shared constants for report generation and display
 * Extracted from ReportGenerator.tsx and ReportDisplay.tsx to eliminate code duplication
 */

// Product type ordering for organizing reports
export const PRODUCT_TYPE_ORDER = [
  'ISAs',
  'GIAs', 
  'Onshore Bonds',
  'Offshore Bonds',
  'Pensions',
  'Other'
] as const;

// Product type normalization mapping
export const normalizeProductType = (type: string | undefined): string => {
  if (!type) return 'Other';
  
  const normalized = type.toLowerCase().trim();
  
  // ISA variations
  if (normalized.includes('isa')) return 'ISAs';
  
  // GIA variations
  if (normalized.includes('gia') || normalized === 'general investment account') return 'GIAs';
  
  // Bond variations
  if (normalized.includes('onshore') && normalized.includes('bond')) return 'Onshore Bonds';
  if (normalized.includes('offshore') && normalized.includes('bond')) return 'Offshore Bonds';
  if (normalized.includes('bond') && !normalized.includes('onshore') && !normalized.includes('offshore')) {
    return 'Onshore Bonds'; // Default bonds to onshore
  }
  
  // Pension variations
  if (normalized.includes('pension') || normalized.includes('sipp') || normalized.includes('ssas')) return 'Pensions';
  
  return 'Other';
};

// Default formatting options for reports
export const DEFAULT_FORMATTING_OPTIONS = {
  truncateAmounts: false,
  roundIrrToOne: true,
  formatWithdrawalsAsNegative: false,
  showInactiveProducts: false,
  showPreviousFunds: true
} as const;

// Report tab options
export const REPORT_TABS = {
  SUMMARY: 'summary',
  IRR_HISTORY: 'irr-history'
} as const;

export type ReportTab = typeof REPORT_TABS[keyof typeof REPORT_TABS]; 