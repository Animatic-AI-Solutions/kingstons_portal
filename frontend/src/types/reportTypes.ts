/**
 * Shared types for report generation and display functionality
 * Extracted from ReportGenerator.tsx and ReportDisplay.tsx to eliminate code duplication
 */

// Core data interfaces
export interface ProductPeriodSummary {
  id: number;
  product_name: string;
  product_type?: string;
  product_owner_name?: string;
  start_date: string | null;
  total_investment: number;
  total_regular_investment: number;
  total_tax_uplift: number;
  total_product_switch_in: number;
  total_product_switch_out: number;
  total_fund_switch_in: number;
  total_fund_switch_out: number;
  total_withdrawal: number;
  net_flow: number;
  current_valuation: number;
  irr: number | null;
  provider_name?: string;
  provider_theme_color?: string;
  funds?: FundSummary[];
  weighted_risk?: number;
  status?: string;
  plan_number?: string;
}

export interface FundSummary {
  id: number;
  available_funds_id: number;
  fund_name: string;
  total_investment: number;
  total_regular_investment: number;
  total_tax_uplift: number;
  total_product_switch_in: number;
  total_product_switch_out: number;
  total_fund_switch_in: number;
  total_fund_switch_out: number;
  total_withdrawal: number;
  net_flow: number;
  current_valuation: number;
  irr: number | null;
  isin_number?: string;
  status: string;
  isVirtual?: boolean;
  inactiveFundCount?: number;
  risk_factor?: number;
  inactiveFunds?: FundSummary[];
  historical_irr?: number[];
  historical_dates?: string[];
}

export interface SelectedIRRDate {
  date: string; // YYYY-MM-DD format
  label: string; // "Jan 2024" format
  productIds: number[]; // Which products have data for this date
  isGreyedOut?: boolean; // Whether this date is greyed out due to end valuation date filtering
}

export interface ProductIRRSelections {
  [productId: number]: string[]; // Array of selected date strings for each product
}

// Report data interface (used by ReportDisplay)
export interface ReportData {
  productSummaries: ProductPeriodSummary[];
  totalIRR: number | null;
  totalValuation: number | null;
  earliestTransactionDate: string | null;
  selectedValuationDate: string | null;
  productOwnerNames: string[];
  productOwnerOrder?: string[]; // Custom order for product owners
  timePeriod: string;
  // Report settings
  truncateAmounts?: boolean;
  roundIrrToOne?: boolean;
  formatWithdrawalsAsNegative?: boolean;
  showInactiveProducts: boolean;
  showPreviousFunds: boolean;
  showInactiveProductDetails?: number[];
  selectedHistoricalIRRDates?: ProductIRRSelections;
  availableHistoricalIRRDates?: SelectedIRRDate[];
}

// Generator-specific interfaces
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
  type?: string;
}

export interface Product {
  id: number;
  product_name: string;
  product_type?: string;
  product_owner_name?: string;
  product_owners?: Array<{ id: number; firstname?: string; surname?: string; known_as?: string; }>;
  client_id: number;
  provider_id?: number;
  provider_name?: string;
  provider_theme_color?: string;
  portfolio_id?: number;
  status: string;
  total_value?: number;
  plan_number?: string;
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

export interface FilteredIRRDate extends SelectedIRRDate {
  isAvailableForProduct: boolean;
}

// Component prop interfaces
export interface IRRDateSelectionGridProps {
  products: Product[];
  excludedProductIds: Set<number>;
  availableIRRDates: SelectedIRRDate[];
  selectedIRRDates: ProductIRRSelections;
  onSelectionChange: (productId: number, selectedDates: string[]) => void;
  onSelectAllForProduct: (productId: number) => void;
  onClearAllForProduct: (productId: number) => void;
  onSelectRecentForProduct: (productId: number, count: number) => void;
} 