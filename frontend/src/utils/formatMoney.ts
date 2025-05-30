/**
 * Global money formatting function for display purposes
 * @param amount - The number to format
 * @param showDecimals - True to show 2 decimal places, false for no decimals
 * @param showPoundSign - True to show £ symbol, false to omit it
 * @returns Formatted money string with proper comma separators
 */
export const formatMoney = (
  amount: number | null | undefined,
  showDecimals: boolean = true,
  showPoundSign: boolean = true
): string => {
  // Handle null, undefined, or NaN values
  if (amount === null || amount === undefined || isNaN(amount)) {
    return showPoundSign ? '£0' : '0';
  }

  // Determine decimal places
  const decimals = showDecimals ? 2 : 0;
  
  // Format the number with commas and specified decimal places
  const formattedNumber = new Intl.NumberFormat('en-GB', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: true
  }).format(amount);

  // Add pound sign if requested
  return showPoundSign ? `£${formattedNumber}` : formattedNumber;
};

// Convenience functions for common use cases
export const formatMoneyWithDecimals = (amount: number | null | undefined): string => 
  formatMoney(amount, true, true);

export const formatMoneyWithoutDecimals = (amount: number | null | undefined): string => 
  formatMoney(amount, false, true);

export const formatMoneyNoSymbol = (amount: number | null | undefined): string => 
  formatMoney(amount, true, false);

export const formatMoneyNoSymbolNoDecimals = (amount: number | null | undefined): string => 
  formatMoney(amount, false, false); 