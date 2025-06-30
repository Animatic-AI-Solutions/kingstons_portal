// Shared interfaces for the report system

export interface ClientGroup {
  id: number;
  name: string;
  advisor?: string | null;
  status: string;
}

export interface ProductOwner {
  id: number;
  firstname?: string;
  surname?: string;
  known_as?: string;
  status: string;
  created_at: string;
}

export interface Product {
  id: number;
  product_name: string;
  client_id: number;
  provider_id?: number;
  provider_name?: string;
  provider_theme_color?: string;
  portfolio_id?: number;
  status: string;
  total_value?: number;
}

export interface Fund {
  id: number;
  fund_name: string;
  isin_number?: string;
  risk_factor?: number;
}

export interface PortfolioFund {
  id: number;
  portfolio_id: number;
  available_funds_id: number;
  market_value?: number;
  fund_name?: string;
  status?: string;
  end_date?: string;
}

export interface MonthlyTransaction {
  year_month: string;
  total_investment: number;
  total_withdrawal: number;
  total_fund_switch_in: number;
  total_fund_switch_out: number;
  net_flow: number;
  valuation: number;
}

export interface FundSummary {
  id: number;
  available_funds_id: number;
  fund_name: string;
  total_investment: number;
  total_withdrawal: number;
  total_fund_switch_in: number;
  total_fund_switch_out: number;
  net_flow: number;
  current_valuation: number;
  irr: number | null;
  isin_number?: string;
  status: string;
  isVirtual?: boolean;
  inactiveFundCount?: number;
  risk_factor?: number;
}

export interface ProductPeriodSummary {
  id: number;
  product_name: string;
  start_date: string | null;
  total_investment: number;
  total_withdrawal: number;
  total_fund_switch_in: number;
  total_fund_switch_out: number;
  net_flow: number;
  current_valuation: number;
  irr: number | null;
  provider_name?: string;
  provider_theme_color?: string;
  funds?: FundSummary[];
}

// Report-specific types
export interface ReportFilters {
  selectedClientGroupIds: (string | number)[];
  selectedProductOwnerIds: (string | number)[];
  selectedProductIds: (string | number)[];
  selectedValuationDate: string | null;
  excludedProductIds: Set<number>;
  excludedProductOwnerIds: Set<number>;
}

export interface ReportData {
  relatedProducts: Product[];
  displayedProductOwners: ProductOwner[];
  totalValuation: number | null;
  totalIRR: number | null;
  valuationDate: string | null;
  earliestTransactionDate: string | null;
  monthlyTransactions: MonthlyTransaction[];
  productSummaries: ProductPeriodSummary[];
}

export interface ReportLoadingStates {
  isLoading: boolean;
  isCalculating: boolean;
  isLoadingValuationDates: boolean;
}

export interface ReportErrors {
  error: string | null;
  dataError: string | null;
}

// IRR-related types (imported from IRR service)
export interface IRRDataSet {
  portfolioIRR: number | null;
  fundIRRs: Array<{
    fund_id: number;
    irr_result: number | null;
    irr_date: string;
  }>;
  historicalIRR?: number | null;
  irrDate: string | null;
} 