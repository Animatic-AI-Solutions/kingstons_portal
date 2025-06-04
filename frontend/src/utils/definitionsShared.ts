// Shared interfaces and types for Definitions pages
export interface Provider {
  id: number;
  name: string;
  status: string;
  type?: string;
  created_at: string;
  updated_at?: string;
  theme_color?: string;
  product_count?: number;
}

export interface Fund {
  id: number;
  provider_id: number | null;
  fund_name: string;
  isin_number: string;
  risk_factor: number | null;
  fund_cost: number | null;
  status: string;
  created_at: string;
  provider_name?: string;
}

export interface Portfolio {
  id: number;
  name: string;
  type?: string;
  risk?: string;
  performance?: number;
  weighted_risk?: number;
  allocation_count?: number;
  created_at: string;
  status?: string;
  funds?: {
    id: number;
    fund_id: number;
    target_weighting: number;
    available_funds?: {
      id: number;
      fund_name: string;
      risk_factor?: number;
    };
  }[];
  averageRisk?: number;
  portfolioCount?: number;
}

export type SortOrder = 'asc' | 'desc';
export type ProviderSortField = 'name' | 'status' | 'created_at' | 'product_count';
export type FundSortField = 'fund_name' | 'risk_factor' | 'isin_number' | 'fund_cost' | 'created_at';
export type PortfolioSortField = 'name' | 'weighted_risk' | 'created_at' | 'averageRisk' | 'portfolioCount';

// Shared utility functions
export const getErrorMessage = (error: any): string => {
  return error?.response?.data?.detail || error?.message || 'An unknown error occurred';
};

export const getProviderColor = (providerName: string): string => {
  const colors = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
    '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'
  ];
  let hash = 0;
  for (let i = 0; i < providerName.length; i++) {
    hash = providerName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

export const getRiskLevel = (riskValue: number): string => {
  if (riskValue < 2) return 'Very Low';
  if (riskValue < 3) return 'Low';
  if (riskValue < 5) return 'Medium';
  if (riskValue < 7) return 'High';
  return 'Very High';
};

export const getFundRiskLevel = (fund: Fund): string => {
  const risk = fund.risk_factor;
  if (risk === null || risk === undefined) return 'Unrated';
  return getRiskLevel(risk);
};

export const calculateAverageRisk = (portfolio: Portfolio): number => {
  if (!portfolio.funds || portfolio.funds.length === 0) return 0;
  
  let totalWeightedRisk = 0;
  let totalWeight = 0;
  
  portfolio.funds.forEach(fund => {
    if (fund.available_funds?.risk_factor && fund.target_weighting) {
      totalWeightedRisk += fund.available_funds.risk_factor * (fund.target_weighting / 100);
      totalWeight += fund.target_weighting / 100;
    }
  });
  
  return totalWeight > 0 ? totalWeightedRisk / totalWeight : 0;
};

export const getRiskRange = (portfolio: Portfolio): string => {
  const averageRisk = calculateAverageRisk(portfolio);
  if (averageRisk === 0) return 'N/A';
  return getRiskLevel(averageRisk);
}; 