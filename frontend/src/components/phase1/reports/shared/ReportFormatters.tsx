// Remove duplicate formatters from ReportGenerator.tsx (Lines 143-179)
// Import from existing utils/formatters.ts instead
export {
  formatCurrency,
  formatDate,
  formatPercentage
} from '../../../../utils/formatters';

// Add report-specific formatters only
export const formatIRRDisplay = (irr: number | null): string => {
  if (irr === null || irr === undefined) return 'N/A';
  return `${irr.toFixed(2)}%`;
};

export const formatRiskFactor = (risk: number | undefined): string => {
  if (risk === undefined || risk === null) return 'N/A';
  return risk.toString();
};

// Fallback formatters for backwards compatibility (to be removed after migration)
export const formatDateFallback = (dateString: string | null): string => {
  if (!dateString) return '-';
  
  // Handle YYYY-MM format (year-month only)
  const parts = dateString.split('-');
  if (parts.length === 2) {
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]);
    if (isNaN(year) || isNaN(month)) return dateString;
    const dateObj = new Date(year, month - 1);
    if (isNaN(dateObj.getTime())) return dateString;
    return dateObj.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  }
  
  // Handle full dates (YYYY-MM-DD)
  if (parts.length === 3) {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  }
  
  return dateString;
};

export const formatCurrencyFallback = (amount: number | null): string => {
  if (amount === null || amount === undefined) return '-';
  
  // Handle negative values to display as -£XXXX instead of £-XXXX
  if (amount < 0) {
    const positiveAmount = Math.abs(amount);
    const formatted = new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(positiveAmount);
    return `-${formatted}`;
  }
  
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

export const formatPercentageFallback = (value: number | null): string => {
  if (value === null || value === undefined) return '-';
  return `${value.toFixed(2)}%`;
}; 