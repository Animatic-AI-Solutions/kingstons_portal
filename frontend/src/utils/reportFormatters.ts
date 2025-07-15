/**
 * Shared formatting utilities for report generation and display
 * Extracted from ReportGenerator.tsx and ReportDisplay.tsx to eliminate code duplication
 */

import { formatCurrencyFallback, formatPercentageFallback } from '../components/reports/shared/ReportFormatters';

// Currency formatting options
export interface CurrencyFormattingOptions {
  hideZeros?: boolean;
  formatNegativeAsNegative?: boolean;
}

// Activity types for visual signing
export type ActivityType = 'investment' | 'tax_uplift' | 'product_switch_in' | 'product_switch_out' | 'withdrawal' | 'fund_switch';

// Main currency formatter with truncation
export const formatCurrencyWithTruncation = (
  amount: number | null | undefined,
  options: CurrencyFormattingOptions = {}
): string => {
  if (amount === null || amount === undefined) return '£0';
  
  // Always round to nearest whole number
  const roundedAmount = Math.round(amount);
  
  // Handle negative values to display as -£XXXX
  if (roundedAmount < 0) {
    return `-£${Math.abs(roundedAmount).toLocaleString()}`;
  }
  
  return `£${roundedAmount.toLocaleString()}`;
};

// Currency formatter with zero toggle support
export const formatCurrencyWithZeroToggle = (
  amount: number | null | undefined,
  hideZeros: boolean = false
): string => {
  if (amount === null || amount === undefined) return hideZeros ? '-' : '£0';
  
  const roundedAmount = Math.round(amount);
  if (hideZeros && roundedAmount === 0) return '-';
  
  // Handle negative values to display as -£XXXX
  if (roundedAmount < 0) {
    return `-£${Math.abs(roundedAmount).toLocaleString()}`;
  }
  
  return `£${roundedAmount.toLocaleString()}`;
};

// IRR formatter with consistent 1 decimal place display
export const formatIrrWithPrecision = (irr: number | null | undefined): string => {
  if (irr === null || irr === undefined) return '-';
  
  // Always format to 1 decimal place for consistency
  return `${irr.toFixed(1)}%`;
};

// Withdrawal amount formatter
export const formatWithdrawalAmount = (
  amount: number | null | undefined,
  formatAsNegative: boolean = false
): string => {
  if (amount === null || amount === undefined) return '-';
  if (amount === 0) return formatCurrencyWithTruncation(amount);
  
  const displayAmount = formatAsNegative ? -Math.abs(amount) : amount;
  return formatCurrencyWithTruncation(displayAmount);
};

// Risk factor formatter with consistent decimal handling
export const formatRiskFallback = (risk: number | undefined): string => {
  if (risk === undefined || risk === null) return '-';
  
  // Always round to 1 decimal place
  return risk.toFixed(1);
};

// Individual fund risk formatting (whole numbers only)
export const formatFundRisk = (risk: number | undefined): string => {
  if (risk === undefined || risk === null) return '-';
  
  // Round to whole number (no decimal places)
  return Math.round(risk).toString();
};

// Product and portfolio weighted risk formatting (smart decimal places)
export const formatWeightedRisk = (risk: number | undefined): string => {
  if (risk === undefined || risk === null) return '-';
  
  // Round to 1 decimal place first
  const rounded = Math.round(risk * 10) / 10;
  
  // If it's a whole number, display without decimal places
  if (rounded === Math.floor(rounded)) {
    return rounded.toString();
  }
  
  // Otherwise, display with 1 decimal place
  return rounded.toFixed(1);
};

// Product and portfolio weighted risk formatting (consistent 1 decimal place for totals)
export const formatWeightedRiskConsistent = (risk: number | undefined): string => {
  if (risk === undefined || risk === null) return '-';
  
  // Always format to 1 decimal place for consistency in totals
  return risk.toFixed(1);
};

// Helper functions for visual signing
export const isOutflowActivity = (activityType: ActivityType): boolean => {
  return activityType === 'withdrawal' || activityType === 'product_switch_out';
};

export const isInflowActivity = (activityType: ActivityType): boolean => {
  return activityType === 'investment' || activityType === 'tax_uplift' || activityType === 'product_switch_in';
};

// Visual signing result interface
export interface VisualSigningResult {
  value: string;
  className: string;
}

// Currency formatter with visual signing support
export const formatCurrencyWithVisualSigning = (
  amount: number | null | undefined,
  activityType: ActivityType,
  visualSigning: boolean = false,
  hideZeros: boolean = false
): VisualSigningResult => {
  if (!visualSigning) {
    // In normal view, show outflows as negative values
    if (amount === null || amount === undefined) {
      return {
        value: hideZeros ? '-' : '£0',
        className: ''
      };
    }

    const roundedAmount = Math.round(amount);
    if (hideZeros && roundedAmount === 0) {
      return {
        value: '-',
        className: ''
      };
    }

    // For outflows (withdrawals, product switch out, fund switch out) - show as negative
    if (isOutflowActivity(activityType) || (activityType === 'fund_switch' && roundedAmount < 0)) {
      return {
        value: `-£${Math.abs(roundedAmount).toLocaleString()}`,
        className: ''
      };
    }

    // For all other values, show as positive
    return {
      value: `£${Math.abs(roundedAmount).toLocaleString()}`,
      className: ''
    };
  }

  if (amount === null || amount === undefined) {
    return {
      value: hideZeros ? '-' : '£0',
      className: ''
    };
  }

  const roundedAmount = Math.round(amount);
  if (hideZeros && roundedAmount === 0) {
    return {
      value: '-',
      className: ''
    };
  }

  // If amount is zero, always show black (no color)
  if (roundedAmount === 0) {
    return {
      value: '£0',
      className: ''
    };
  }

  // Special handling for fund switches - show as total activity (neutral black)
  if (activityType === 'fund_switch') {
    return {
      value: `£${Math.abs(roundedAmount).toLocaleString()}`,
      className: 'text-gray-900'
    };
  }

  // For outflows (withdrawals, product switch out) - show as red negative
  if (isOutflowActivity(activityType)) {
    return {
      value: `-£${Math.abs(roundedAmount).toLocaleString()}`,
      className: 'text-red-600'
    };
  }

  // For inflows (investments, gov uplift, product switch in) - show as green positive
  if (isInflowActivity(activityType)) {
    return {
      value: `£${Math.abs(roundedAmount).toLocaleString()}`,
      className: 'text-green-600'
    };
  }

  // Default case
  return {
    value: `£${Math.abs(roundedAmount).toLocaleString()}`,
    className: ''
  };
};

// Calculate net fund switches utility
export const calculateNetFundSwitches = (switchIn: number, switchOut: number): number => {
  return (switchIn || 0) - (switchOut || 0);
}; 