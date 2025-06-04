interface Fund {
  id: number;
  fund_name?: string;
  isin_number?: string;
  [key: string]: any;
}

/**
 * Identifies the cash fund from a list of funds
 * Uses name and ISIN combination but handles potential duplicates
 * Returns the first cash fund found or null if none exists
 */
export const findCashFund = (funds: Fund[]): Fund | null => {
  const cashFunds = funds.filter(f => 
    f.fund_name === 'Cash' && f.isin_number === 'N/A'
  );
  
  if (cashFunds.length === 0) {
    return null;
  }
  
  // If multiple cash funds exist, log a warning and return the first one
  if (cashFunds.length > 1) {
    console.warn(`Found ${cashFunds.length} cash funds. Using the first one (ID: ${cashFunds[0].id})`);
  }
  
  return cashFunds[0];
};

/**
 * Checks if a fund is a cash fund
 */
export const isCashFund = (fund: Fund): boolean => {
  return fund.fund_name === 'Cash' && fund.isin_number === 'N/A';
};

/**
 * Filters out cash funds from a fund list
 */
export const excludeCashFunds = (funds: Fund[]): Fund[] => {
  return funds.filter(fund => !isCashFund(fund));
};

/**
 * Checks if two funds have the same ISIN (for duplicate detection)
 */
export const hasSameISIN = (fund1: Fund, fund2: Fund): boolean => {
  return fund1.isin_number === fund2.isin_number;
};

/**
 * Groups funds by ISIN number to identify duplicates
 */
export const groupFundsByISIN = (funds: Fund[]): Map<string, Fund[]> => {
  const groups = new Map<string, Fund[]>();
  
  funds.forEach(fund => {
    const isin = fund.isin_number || 'Unknown';
    if (!groups.has(isin)) {
      groups.set(isin, []);
    }
    groups.get(isin)!.push(fund);
  });
  
  return groups;
};

/**
 * Gets a display name for a fund that includes ID if there are ISIN duplicates
 */
export const getFundDisplayName = (fund: Fund, allFunds: Fund[]): string => {
  const fundsWithSameISIN = allFunds.filter(f => 
    f.isin_number === fund.isin_number && f.id !== fund.id
  );
  
  if (fundsWithSameISIN.length > 0) {
    return `${fund.fund_name} (ID: ${fund.id})`;
  }
  
  return fund.fund_name || `Fund ${fund.id}`;
}; 