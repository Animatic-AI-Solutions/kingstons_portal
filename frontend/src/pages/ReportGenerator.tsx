import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import MultiSelectDropdown from '../components/ui/dropdowns/MultiSelectDropdown';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import { calculateStandardizedMultipleFundsIRR, getLatestFundIRRs } from '../services/api';
import { createIRRDataService } from '../services/irrDataService';
import { createValuationDataService } from '../services/valuationDataService';
import { createPortfolioFundsService } from '../services/portfolioFundsService';
import { formatDateFallback, formatCurrencyFallback, formatPercentageFallback } from '../components/reports/shared/ReportFormatters';
import { formatWeightedRisk } from '../utils/reportFormatters';
import historicalIRRService from '../services/historicalIRRService';

// Interfaces for data types
interface ClientGroup {
  id: number;
  name: string;
  advisor?: string | null;
  status: string;
}

interface ProductOwner {
  id: number;
  firstname?: string;
  surname?: string;
  known_as?: string;
  type?: string;
}

interface Product {
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

interface Fund {
  id: number;
  fund_name: string;
  isin_number?: string;
  risk_factor?: number; // Add risk factor field
}

interface PortfolioFund {
  id: number;
  portfolio_id: number;
  available_funds_id: number;
  market_value?: number;
  fund_name?: string;
  status?: string;
  end_date?: string;
}

interface MonthlyTransaction {
  year_month: string;
  total_investment: number;
  total_withdrawal: number;
  total_fund_switch_in: number;
  total_fund_switch_out: number;
  net_flow: number;
  valuation: number;
}

// Add new interface for product period summary
interface ProductPeriodSummary {
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
  funds?: FundSummary[]; // Add funds array to store individual fund data
  weighted_risk?: number; // Weighted risk based on fund valuations and risk factors
  status?: string; // Product status to determine if it should be greyed out
  plan_number?: string; // Plan number for title generation
}

// New interface for fund-level summary data
interface FundSummary {
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
  risk_factor?: number; // Add risk factor field
  inactiveFunds?: FundSummary[]; // Array of individual inactive funds for breakdown
  historical_irr?: number[]; // Array of historical IRR values (most recent first)
  historical_dates?: string[]; // Array of corresponding dates for historical IRRs
}

interface SelectedIRRDate {
  date: string; // YYYY-MM-DD format
  label: string; // "Jan 2024" format
  productIds: number[]; // Which products have data for this date
  isGreyedOut?: boolean; // Whether this date is greyed out due to end valuation date filtering
}

interface ProductIRRSelections {
  [productId: number]: string[]; // Array of selected date strings for each product
}

interface FilteredIRRDate extends SelectedIRRDate {
  isAvailableForProduct: boolean; // Whether this date is available for the current product
}

// IRR Date Selection Grid Component
interface IRRDateSelectionGridProps {
  products: Product[];
  excludedProductIds: Set<number>;
  availableIRRDates: SelectedIRRDate[];
  selectedIRRDates: ProductIRRSelections;
  onSelectionChange: (productId: number, selectedDates: string[]) => void;
  onSelectAllForProduct: (productId: number) => void;
  onClearAllForProduct: (productId: number) => void;
  onSelectRecentForProduct: (productId: number, count: number) => void;
  onSelectAllForAllProducts: () => void;
  onClearAllForAllProducts: () => void;
}

const IRRDateSelectionGrid: React.FC<IRRDateSelectionGridProps> = ({
  products,
  excludedProductIds,
  availableIRRDates,
  selectedIRRDates,
  onSelectionChange,
  onSelectAllForProduct,
  onClearAllForProduct,
  onSelectRecentForProduct,
  onSelectAllForAllProducts,
  onClearAllForAllProducts
}) => {
  const handleDateToggle = (productId: number, dateStr: string, isGreyedOut: boolean) => {
    if (isGreyedOut) return; // Don't allow selection of greyed out dates
    
    const currentSelected = selectedIRRDates[productId] || [];
    const newSelected = currentSelected.includes(dateStr)
      ? currentSelected.filter((d: string) => d !== dateStr)
      : [...currentSelected, dateStr];
    
    onSelectionChange(productId, newSelected);
  };

  const getFilteredDatesForProduct = (productId: number): FilteredIRRDate[] => {
    return availableIRRDates.map(date => ({
      ...date,
      isAvailableForProduct: date.productIds.includes(productId)
    })).filter(date => date.isAvailableForProduct);
  };

  return (
    <div className="mt-4 p-3 bg-blue-50 rounded-lg border">
      <h4 className="text-sm font-medium text-gray-700 mb-2">
        Historical IRR Date Selection
      </h4>
      <p className="text-xs text-gray-500 mb-4">
        Select which historical IRR dates to include in the report. Dates after your selected end valuation date are greyed out and cannot be selected.
      </p>

      {/* Global Action Buttons */}
      <div className="flex gap-2 mb-4 p-3 bg-white rounded-lg border">
        <div className="flex-1">
          <h5 className="text-sm font-medium text-gray-700 mb-2">Apply to All Products:</h5>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onSelectAllForAllProducts}
              className="px-3 py-2 text-sm bg-blue-600 text-white border border-blue-600 rounded hover:bg-blue-700 font-medium"
            >
              Select All Dates for All Products
            </button>
            <button
              type="button"
              onClick={onClearAllForAllProducts}
              className="px-3 py-2 text-sm bg-white text-red-600 border border-red-300 rounded hover:bg-red-50 font-medium"
            >
              Clear All Products
            </button>
          </div>
        </div>
      </div>

      {products.filter(product => !excludedProductIds.has(product.id)).map(product => {
        const productDates = getFilteredDatesForProduct(product.id);
        const selectedDates = selectedIRRDates[product.id] || [];
        const availableCount = productDates.filter(d => !d.isGreyedOut).length;
        const selectedCount = selectedDates.length;

        return (
          <div key={product.id} className="mb-6 p-4 bg-white rounded-lg border">
            {/* Product Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {product.provider_theme_color && (
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: product.provider_theme_color }}
                  />
                )}
                <h5 className="text-sm font-medium text-gray-800">
                  {product.product_name}
                </h5>
              </div>
              <div className="text-xs text-gray-500">
                {selectedCount} of {availableCount} selected
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex gap-2 mb-3">
              <button
                type="button"
                onClick={() => onSelectAllForProduct(product.id)}
                className="px-2 py-1 text-xs bg-blue-100 border border-blue-300 rounded hover:bg-blue-200 font-medium"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={() => onSelectRecentForProduct(product.id, 1)}
                className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50"
              >
                Latest Only
              </button>
              <button
                type="button"
                onClick={() => onClearAllForProduct(product.id)}
                className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 text-red-600"
              >
                Clear All
              </button>
            </div>

            {/* Date Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {productDates.map(date => {
                const isSelected = selectedDates.includes(date.date);
                const isGreyedOut = date.isGreyedOut || false;

                return (
                  <button
                    key={date.date}
                    type="button"
                    onClick={() => handleDateToggle(product.id, date.date, isGreyedOut)}
                    disabled={isGreyedOut}
                    className={`
                      px-2 py-2 text-xs rounded border transition-all duration-150
                      ${isGreyedOut 
                        ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-50' 
                        : isSelected
                          ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-blue-50 hover:border-blue-300'
                      }
                    `}
                    title={isGreyedOut ? 'Date is after selected end valuation date' : ''}
                  >
                    <div className="font-medium">{date.label}</div>
                  </button>
                );
              })}
            </div>

            {productDates.length === 0 && (
              <div className="text-center py-4 text-xs text-gray-500">
                No IRR dates available for this product
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// Main component
const ReportGenerator: React.FC = () => {
  const { api } = useAuth();
  const navigate = useNavigate();
  
  // Initialize optimized services
  const irrDataService = useMemo(() => createIRRDataService(api), [api]);
  const valuationService = useMemo(() => createValuationDataService(api), [api]);
  const portfolioFundsService = useMemo(() => createPortfolioFundsService(api), [api]);
  
  // State for data
  const [clientGroups, setClientGroups] = useState<ClientGroup[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  
  // State for selections
  const [selectedClientGroupIds, setSelectedClientGroupIds] = useState<(string | number)[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<(string | number)[]>([]);
  
  // New state for valuation date selection
  const [availableValuationDates, setAvailableValuationDates] = useState<string[]>([]);
  const [selectedValuationDate, setSelectedValuationDate] = useState<string | null>(null);
  const [isLoadingValuationDates, setIsLoadingValuationDates] = useState<boolean>(false);
  
  // State for results
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [totalValuation, setTotalValuation] = useState<number | null>(null);
  const [totalIRR, setTotalIRR] = useState<number | null>(null);
  const [valuationDate, setValuationDate] = useState<string | null>(null);
  const [earliestTransactionDate, setEarliestTransactionDate] = useState<string | null>(null);
  const [monthlyTransactions, setMonthlyTransactions] = useState<MonthlyTransaction[]>([]);
  
  // New state for product-specific period summaries
  const [productSummaries, setProductSummaries] = useState<ProductPeriodSummary[]>([]);

  // New state to track which products come from which sources (client groups)
  const [productSources, setProductSources] = useState<Map<number, { clientGroups: number[] }>>(new Map());

  // States for excluded items (items that won't be included in the report)
  const [excludedProductIds, setExcludedProductIds] = useState<Set<number>>(new Set());

// Formatters now imported from shared components to eliminate duplication

  // Custom formatter for currency amounts
  const formatCurrencyWithTruncation = (amount: number | null | undefined): string => {
    if (amount === null || amount === undefined) return '£0';
    return formatCurrencyFallback(amount);
  };

  // Custom IRR formatter
  const formatIrrWithPrecision = (irr: number | null | undefined): string => {
    if (irr === null || irr === undefined) return '-';
    return formatPercentageFallback(irr);
  };

  // Custom withdrawal formatter
  const formatWithdrawalAmount = (amount: number | null | undefined): string => {
    if (amount === null || amount === undefined) return '-';
    return formatCurrencyWithTruncation(amount);
  };

  // Local function to format fund IRRs to whole numbers (0 decimal places)
  const formatFundIrr = (irr: number | null | undefined): string => {
    if (irr === null || irr === undefined) return '-';
    // Round to 0 decimal places for fund IRRs (as per original logic)
    return `${Math.round(irr)}%`;
  };

  // Calculate net fund switches (switch in - switch out)
  const calculateNetFundSwitches = (switchIn: number, switchOut: number): number => {
    return (switchIn || 0) - (switchOut || 0);
  };
  
  // Loading and error states
  const [isLoading, setIsLoading] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);
  
  // Report formatting options

  const [showInactiveProducts, setShowInactiveProducts] = useState(false);
  const [showPreviousFunds, setShowPreviousFunds] = useState(true);
  
  // State for Previous Funds expansion (per product)
  const [expandedPreviousFunds, setExpandedPreviousFunds] = useState<Set<number>>(new Set());
  
  // State for inactive product detailed view control
  const [showInactiveProductDetails, setShowInactiveProductDetails] = useState<Set<number>>(new Set());
  
  // New state for IRR date selection (replaces historicalIRRYears)
  const [availableIRRDates, setAvailableIRRDates] = useState<SelectedIRRDate[]>([]);
  const [selectedIRRDates, setSelectedIRRDates] = useState<ProductIRRSelections>({});
  const [historicalIRRMonths, setHistoricalIRRMonths] = useState<string[]>([]);

  
  // Fetch initial data
  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      try {
        // Fetch all basic data
        const [
          clientGroupsRes,
          allProductsRes
        ] = await Promise.all([
          api.get('/client_groups'),
          api.get('/client_products_with_owners')
        ]);
        
        setClientGroups(clientGroupsRes.data || []);
        
        // Set ALL products for the dropdown
        const productsData = allProductsRes.data || [];
        console.log('🔍 [PRODUCTS MAPPING DEBUG] Raw products before setting:', productsData.slice(0, 2));
        setProducts(productsData);
        
        console.log('Fetched all products:', allProductsRes.data?.length || 0, allProductsRes.data);
        console.log('🔍 [PRODUCTS DEBUG] First product structure:', allProductsRes.data?.[0]);
        
        setError(null);
      } catch (err: any) {
        console.error('Error fetching initial data:', err);
        setError(err.response?.data?.detail || 'Failed to load initial data');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchInitialData();
  }, [api]);
  
  // Removed product owner functionality - no longer needed

  // NEW useEffect for instant "Related Products" display - simplified to only handle client groups and products
  useEffect(() => {
    const updateRelatedProducts = async () => {
      try {
        let productsToDisplay: Product[] = [];
        const displayedProductIds = new Set<number>();
        // Create a new map for tracking product sources (only client groups now)
        const productSourcesMap = new Map<number, { clientGroups: number[] }>();
        
        console.log("Updating related products with selections:", {
          selectedProductIds,
          selectedClientGroupIds
        });

        // 1. Directly selected products
        for (const sp of selectedProductIds) {
          const product = products.find(p => p.id === Number(sp));
          if (product && !displayedProductIds.has(product.id)) {
            productsToDisplay.push(product);
            displayedProductIds.add(product.id);
            // These are directly selected, initialize the sources
            productSourcesMap.set(product.id, { clientGroups: [] });
          }
        }

        // 2. Products from selected client groups
        if (selectedClientGroupIds.length > 0) {
          for (const scg of selectedClientGroupIds) {
            try {
              // Fetch products directly associated with this client group using the existing endpoint
              const response = await api.get(`/client_products_with_owners?client_id=${Number(scg)}`);
              console.log(`Client Group ${scg} products:`, response.data);
              
              if (response.data && Array.isArray(response.data)) {
                const clientGroupProducts = response.data as Product[];
                
                clientGroupProducts.forEach(p => {
                  if (!displayedProductIds.has(p.id)) {
                    productsToDisplay.push(p);
                    displayedProductIds.add(p.id);
                    // Set source as this client group
                    productSourcesMap.set(p.id, { clientGroups: [Number(scg)] });
                  } else {
                    // Product already added, add this client group as a source
                    const currentSources = productSourcesMap.get(p.id) || { clientGroups: [] };
                    if (!currentSources.clientGroups.includes(Number(scg))) {
                      currentSources.clientGroups.push(Number(scg));
                      productSourcesMap.set(p.id, currentSources);
                    }
                  }
                });
              } else {
                console.log(`No products found for client group ${scg}`);
              }
            } catch (err) {
              console.error(`Failed to fetch products for client group ${Number(scg)}:`, err);
            }
          }
        }
        
        setRelatedProducts(productsToDisplay);
        setProductSources(productSourcesMap);
      } catch (err) {
        console.error('Error updating related products:', err);
      }
    };
    
    // Run when selections change or the main product list is available
    if (products.length > 0 || selectedClientGroupIds.length > 0) {
        updateRelatedProducts();
    } else {
        setRelatedProducts([]); // Clear if no relevant selections
        setProductSources(new Map()); // Clear the sources map
    }
  }, [selectedProductIds, selectedClientGroupIds, products, api]);

  // Reset exclusion lists when selections change
  useEffect(() => {
    setExcludedProductIds(new Set());
  }, [selectedProductIds, selectedClientGroupIds]);

  // useEffect for tracking selection changes in the debug console
  useEffect(() => {
    console.log("=== SELECTION CHANGED ===");
    console.log("Selected client groups:", selectedClientGroupIds);
    console.log("Selected products:", selectedProductIds);
    console.log("Related products:", relatedProducts.map(p => ({ id: p.id, name: p.product_name })));
  }, [selectedClientGroupIds, selectedProductIds, relatedProducts]);
  
  // New useEffect to fetch available valuation dates from fund valuations
  useEffect(() => {
    const fetchAvailableValuationDates = async () => {
      if (relatedProducts.length === 0) {
        // Clear dates if no products selected
        setAvailableValuationDates([]);
        setSelectedValuationDate(null);
        return;
      }
      
      try {
        setIsLoadingValuationDates(true);
        
        // Get all excluded product IDs (only direct exclusions now)
        const allExcludedProductIds = new Set<number>([...excludedProductIds]);
        
        // Filter out excluded products
        const includedProducts = relatedProducts.filter((p: Product) => !allExcludedProductIds.has(p.id));
        
        if (includedProducts.length === 0) {
          setAvailableValuationDates([]);
          setSelectedValuationDate(null);
          setIsLoadingValuationDates(false);
          return;
        }
        
        // Collect portfolio IDs from included products
        const portfolioIds = includedProducts
          .map((p: Product) => p.portfolio_id)
          .filter((id): id is number => id !== undefined);
        
        if (portfolioIds.length === 0) {
          setAvailableValuationDates([]);
          setSelectedValuationDate(null);
          setIsLoadingValuationDates(false);
          return;
        }
        
        // Collect all portfolio funds for the selected products using batch service
        const batchPortfolioFundsResult = await portfolioFundsService.getBatchPortfolioFunds(portfolioIds);
        const allPortfolioFunds = Array.from(batchPortfolioFundsResult.values()).flat();
        
        if (allPortfolioFunds.length === 0) {
          setAvailableValuationDates([]);
          setSelectedValuationDate(null);
          setIsLoadingValuationDates(false);
          return;
        }
        
        // Get all fund IDs
        const fundIds = allPortfolioFunds.map(fund => fund.id);
        
        // Get all active funds (exclude inactive funds)
        const activeFundIds = allPortfolioFunds
          .filter(fund => fund.status === 'active' || !fund.status)
          .map(fund => fund.id);
        
        // Also collect inactive products (products where all funds are inactive)
        const portfolioFundsByProduct = new Map<number, any[]>();
        includedProducts.forEach(product => {
          if (product.portfolio_id) {
            const productFunds = allPortfolioFunds.filter(fund => {
              const portfolioFundsInProduct = Array.from(batchPortfolioFundsResult.get(product.portfolio_id!) || []);
              return portfolioFundsInProduct.some(pf => pf.id === fund.id);
            });
            portfolioFundsByProduct.set(product.id, productFunds);
          }
        });
        
        // Identify inactive products (products where ALL funds are inactive)
        const inactiveProducts = includedProducts.filter(product => {
          if (product.status === 'inactive') return true;
          const productFunds = portfolioFundsByProduct.get(product.id) || [];
          return productFunds.length > 0 && productFunds.every(fund => fund.status && fund.status !== 'active');
        });
        
        // Get all fund IDs for inactive products
        const inactiveProductFundIds = inactiveProducts.flatMap(product => {
          const productFunds = portfolioFundsByProduct.get(product.id) || [];
          return productFunds.map(fund => fund.id);
        });
        
        console.log('📊 [VALUATION DEBUG] Product analysis:', {
          totalIncludedProducts: includedProducts.length,
          activeFundIds: activeFundIds.length,
          inactiveProducts: inactiveProducts.length,
          inactiveProductFundIds: inactiveProductFundIds.length,
          includedProductStatuses: includedProducts.map(p => ({ id: p.id, name: p.product_name, status: p.status }))
        });
        
        // If we only have inactive products, still allow them to proceed
        if (activeFundIds.length === 0 && inactiveProductFundIds.length > 0) {
          // For inactive products, we assume zero valuations are valid
          // Set a special flag to indicate inactive products are valid for reporting
          console.log('📊 [VALUATION DEBUG] Inactive products detected - assuming zero valuations are valid');
          setAvailableValuationDates(['inactive-products-valid']);
          setSelectedValuationDate(null);
          setIsLoadingValuationDates(false);
          return;
        } else if (activeFundIds.length === 0) {
          console.log('📊 [VALUATION DEBUG] No active funds, no inactive products - clearing dates');
          setAvailableValuationDates([]);
          setSelectedValuationDate(null);
          setIsLoadingValuationDates(false);
          return;
        }
        
        console.log('📊 [VALUATION DEBUG] Active funds detected, proceeding with common date logic', {
          activeFundIds: activeFundIds.length,
          inactiveProductFundIds: inactiveProductFundIds.length,
          includedProducts: includedProducts.length,
          inactiveProducts: inactiveProducts.length
        });
        
        // NEW ELIGIBILITY LOGIC
        // Step 1: Get all valuation dates for each product (active and inactive)
        const productValuationDates = new Map<number, string[]>();
        const productLatestDates = new Map<number, string>();
        let globalLatestDate = '';
        
        // Get all historical valuations for ALL funds (active and inactive)
        const allFundIds = [...activeFundIds, ...inactiveProductFundIds];
        const batchValuationResult = await valuationService.getBatchHistoricalValuations(allFundIds);
        
        // Process valuations for each product
        for (const product of includedProducts) {
          const productFunds = portfolioFundsByProduct.get(product.id) || [];
          const productDates = new Set<string>();
          let productLatest = '';
          
          // Collect all valuation dates for this product's funds
          for (const fund of productFunds) {
            const fundValuations = batchValuationResult.get(fund.id) || [];
          
          fundValuations.forEach((val: any) => {
            if (val.valuation_date) {
              const dateParts = val.valuation_date.split('-');
              if (dateParts.length >= 2) {
                const yearMonth = `${dateParts[0]}-${dateParts[1]}`;
                  productDates.add(yearMonth);
                  
                  // Track latest date for this product
                  if (yearMonth > productLatest) {
                    productLatest = yearMonth;
                  }
                  
                  // Track global latest date
                  if (yearMonth > globalLatestDate) {
                    globalLatestDate = yearMonth;
                  }
              }
            }
          });
          }
          
          productValuationDates.set(product.id, Array.from(productDates).sort());
          if (productLatest) {
            productLatestDates.set(product.id, productLatest);
          }
        }
        
        console.log('📊 [ELIGIBILITY DEBUG] Product valuation analysis:', {
          globalLatestDate,
          productLatestDates: Object.fromEntries(productLatestDates),
          productValuationDates: Object.fromEntries(
            Array.from(productValuationDates.entries()).map(([id, dates]) => [id, dates])
          )
        });
        
        // Step 2: Find eligible dates where all products have valuations (actual or assumed zero)
        const eligibleDates = new Set<string>();
        
        // Generate all possible month candidates up to the global latest date
        const candidateDates: string[] = [];
        if (globalLatestDate) {
          const [latestYear, latestMonth] = globalLatestDate.split('-').map(Number);
          
          // Find earliest date among all products
          let earliestDate = globalLatestDate;
          for (const dates of productValuationDates.values()) {
            if (dates.length > 0 && dates[0] < earliestDate) {
              earliestDate = dates[0];
            }
          }
          
          const [earliestYear, earliestMonth] = earliestDate.split('-').map(Number);
          
          // Generate all months from earliest to latest
          let currentYear = earliestYear;
          let currentMonth = earliestMonth;
          
          while (currentYear < latestYear || (currentYear === latestYear && currentMonth <= latestMonth)) {
            const monthStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
            candidateDates.push(monthStr);
            
            currentMonth++;
            if (currentMonth > 12) {
              currentMonth = 1;
              currentYear++;
            }
          }
        }
        
        // Step 3: Check each candidate date for eligibility
        for (const candidateDate of candidateDates) {
          let allProductsHaveValuation = true;
          
          for (const product of includedProducts) {
            const productDates = productValuationDates.get(product.id) || [];
            const productLatest = productLatestDates.get(product.id) || '';
            const isActiveProduct = product.status !== 'inactive';
            
            // Check if this product has valuation for this date
            const hasActualValuation = productDates.includes(candidateDate);
            const canAssumeZero = !isActiveProduct && candidateDate > productLatest;
            
            if (!hasActualValuation && !canAssumeZero) {
              allProductsHaveValuation = false;
              break;
            }
          }
          
          if (allProductsHaveValuation) {
            eligibleDates.add(candidateDate);
          }
        }
        
        // Sort eligible dates chronologically (newest first)
        const sortedDates = Array.from(eligibleDates).sort((a: string, b: string) => b.localeCompare(a));
        
        console.log('📊 [ELIGIBILITY DEBUG] Final eligible dates:', sortedDates);
        
        // Step 4: Set results based on eligibility
        if (sortedDates.length === 0) {
          console.log('📊 [ELIGIBILITY DEBUG] No eligible dates found - products do not meet report generation criteria');
          setAvailableValuationDates([]);
          setSelectedValuationDate(null);
          setIsLoadingValuationDates(false);
          return;
        }
        
        setAvailableValuationDates(sortedDates);
        
        // Set the most recent date as the default selection
        if (sortedDates.length > 0 && !selectedValuationDate) {
          setSelectedValuationDate(sortedDates[0]);
        } else if (sortedDates.length > 0 && selectedValuationDate && !sortedDates.includes(selectedValuationDate)) {
          // If the currently selected date is no longer valid, select the most recent date
          setSelectedValuationDate(sortedDates[0]);
        } else if (sortedDates.length === 0) {
          // This case is already handled above, but keeping for completeness
          setSelectedValuationDate(null);
        }
      } catch (err) {
        console.error("Error fetching available valuation dates:", err);
        setAvailableValuationDates([]);
      } finally {
        setIsLoadingValuationDates(false);
      }
    };
    
    fetchAvailableValuationDates();
  }, [relatedProducts, excludedProductIds, api, selectedValuationDate]);

  

  // Calculate if we have any effective product selection (simplified for client groups and products only)
  const hasEffectiveProductSelection = useMemo(() => {
    // Get all excluded product IDs (only direct exclusions now)
    const allExcludedProductIds = new Set<number>([...excludedProductIds]);

    // Count effective products from each selection method
    let effectiveProductCount = 0;

    // 1. Directly selected products (not excluded)
    const directlySelectedProducts = selectedProductIds.filter(p => !allExcludedProductIds.has(Number(p)));
    effectiveProductCount += directlySelectedProducts.length;

    // 2. Products from selected client groups (not excluded)
    if (selectedClientGroupIds.length > 0) {
      const effectiveProducts = relatedProducts.filter(p => !allExcludedProductIds.has(p.id));
      effectiveProductCount += effectiveProducts.length;
    }

    // Debug logging for troubleshooting
    console.log('🔍 [SELECTION DEBUG] hasEffectiveProductSelection calculation:', {
      selectedProductIds,
      selectedClientGroupIds,
      excludedProductIds: Array.from(excludedProductIds),
      allExcludedProductIds: Array.from(allExcludedProductIds),
      directlySelectedProducts,
      relatedProductsCount: relatedProducts.length,
      effectiveProductCount,
      hasSelection: effectiveProductCount > 0
    });

    return effectiveProductCount > 0;
  }, [selectedProductIds, selectedClientGroupIds, excludedProductIds, relatedProducts]);

  // Function to filter IRR dates based on end valuation date
  const getFilteredIRRDates = (dates: SelectedIRRDate[], maxDate: string | null): SelectedIRRDate[] => {
    if (!maxDate) return dates.map(date => ({ ...date, isGreyedOut: false }));
    
    const maxDateObj = new Date(maxDate);
    
    return dates.map(date => ({
      ...date,
      isGreyedOut: new Date(date.date) > maxDateObj
    }));
  };

  // Function to auto-update selected dates when end valuation date changes
  const updateSelectedDatesForNewEndDate = (newEndDate: string | null) => {
    if (!newEndDate) return;
    
    const maxDateObj = new Date(newEndDate);
    
    setSelectedIRRDates(prev => {
      const updated: ProductIRRSelections = {};
      
      Object.entries(prev).forEach(([productIdStr, selectedDates]) => {
        const productId = parseInt(productIdStr);
        const validDates = selectedDates.filter((dateStr: string) => {
          return new Date(dateStr) <= maxDateObj;
        });
        updated[productId] = validDates;
      });
      
      return updated;
    });
  };

  // Function to fetch all available IRR dates for products
  const fetchAvailableIRRDates = async (productIds: number[]): Promise<SelectedIRRDate[]> => {
    const allDatesMap = new Map<string, Set<number>>(); // date -> set of product IDs
    
    try {
      console.log(`📊 Fetching available IRR dates for ${productIds.length} products`);
      
      // Fetch historical IRR data for each product (no limit to get all dates)
      for (const productId of productIds) {
        const response = await historicalIRRService.getCombinedHistoricalIRR(productId, 1000); // Large limit to get all data
        
        if (response.funds_historical_irr && response.funds_historical_irr.length > 0) {
          // Extract all unique dates from this product's IRR data
          const productDates = new Set<string>();
          
        response.funds_historical_irr.forEach((fund: any) => {
          if (fund.historical_irr && fund.historical_irr.length > 0) {
            fund.historical_irr.forEach((record: any) => {
              if (record.irr_result !== null && record.irr_date) {
                  productDates.add(record.irr_date);
                }
              });
            }
          });
          
          // Add this product's dates to the global map
          productDates.forEach(date => {
            if (!allDatesMap.has(date)) {
              allDatesMap.set(date, new Set());
            }
            allDatesMap.get(date)!.add(productId);
          });
        }
      }
      
      // Convert to SelectedIRRDate array
      const availableDates: SelectedIRRDate[] = [];
      allDatesMap.forEach((productIds, date) => {
        const dateObj = new Date(date);
        const label = dateObj.toLocaleDateString('en-US', { 
          month: 'long', 
          year: 'numeric' 
        });
        
        availableDates.push({
          date,
          label,
          productIds: Array.from(productIds)
        });
      });
      
      // Sort by date (most recent first)
      availableDates.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      console.log(`Found ${availableDates.length} unique IRR dates across all products`);
      return availableDates;
      
    } catch (error) {
      console.error('Error fetching available IRR dates:', error);
      return [];
    }
  };

  // Function to fetch historical IRR data for selected dates
  const fetchAllHistoricalIRRData = async (
    productIds: number[], 
    selectedDates: ProductIRRSelections
  ): Promise<Map<number, number[]>> => {
    const fundHistoricalIRRMap = new Map<number, number[]>();
    let globalSelectedMonths: string[] = [];
    
    try {
      console.log(`📊 Fetching historical IRR data for selected dates across ${productIds.length} products`);
      
      // Process each product separately using their selected dates
      for (const productId of productIds) {
        const productSelectedDates = selectedDates[productId] || [];
        
        if (productSelectedDates.length === 0) {
          console.log(`Product ${productId}: No dates selected, skipping`);
          continue;
        }
        
        // Fetch all historical IRR data for this product
        const response = await historicalIRRService.getCombinedHistoricalIRR(productId, 1000);
        
        if (!response.funds_historical_irr || response.funds_historical_irr.length === 0) {
          console.log(`Product ${productId}: No historical IRR data available`);
          continue;
        }

        // Group historical IRR data by date for each fund
        const fundsByDate = new Map<string, Map<number, number>>();
        const allFundIds = new Set<number>();

        // Extract IRR data for selected dates only
        response.funds_historical_irr.forEach((fund: any) => {
          if (fund.historical_irr && fund.historical_irr.length > 0) {
            allFundIds.add(fund.portfolio_fund_id);
            
            fund.historical_irr.forEach((record: any) => {
              if (record.irr_result !== null && record.irr_date) {
                // Only include data for selected dates
                if (productSelectedDates.includes(record.irr_date)) {
                  if (!fundsByDate.has(record.irr_date)) {
                    fundsByDate.set(record.irr_date, new Map());
                  }
                  fundsByDate.get(record.irr_date)!.set(fund.portfolio_fund_id, record.irr_result);
                }
              }
            });
          }
        });

        // Sort selected dates (most recent first) for consistent ordering
        const sortedSelectedDates = [...productSelectedDates].sort((a, b) => 
          new Date(b).getTime() - new Date(a).getTime()
        );
        
        // Build the global selected months list (for column headers)
        if (globalSelectedMonths.length === 0 && sortedSelectedDates.length > 0) {
          globalSelectedMonths = sortedSelectedDates.map(date => {
            const dateObj = new Date(date);
            return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
          });
        }
        
        // Populate the fund map with IRR values for selected dates
        for (const fundId of allFundIds) {
          const historicalValues: number[] = [];
          
          for (const date of sortedSelectedDates) {
            const irrValue = fundsByDate.get(date)?.get(fundId);
            if (irrValue !== undefined) {
              historicalValues.push(irrValue);
            } else {
              // If no IRR value for this date, push null/undefined to maintain column alignment
              // This will be handled in the display logic
              historicalValues.push(0); // or use null if the display logic can handle it
            }
          }
          
          if (historicalValues.length > 0) {
            fundHistoricalIRRMap.set(fundId, historicalValues);
          }
        }

        console.log(`Product ${productId}: Using ${sortedSelectedDates.length} selected dates: ${sortedSelectedDates.join(', ')}`);
      }
      
      // Format the month labels for display and store them in state
      if (globalSelectedMonths.length > 0) {
        const monthLabels = globalSelectedMonths.map(yearMonth => {
          const [year, month] = yearMonth.split('-');
          const date = new Date(parseInt(year), parseInt(month) - 1);
          return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        });
        
        setHistoricalIRRMonths(monthLabels);
        console.log('Setting historical IRR month labels:', monthLabels);
      } else {
        // No historical data found - clear historical IRR columns completely
        setHistoricalIRRMonths([]);
        console.log('No historical IRR data found - hiding historical IRR columns');
      }
      
      console.log('Global selected months:', globalSelectedMonths);
      console.log('Total historical IRR map entries:', fundHistoricalIRRMap.size);
      
    } catch (error) {
      console.error('Error fetching historical IRR data:', error);
    }

    return fundHistoricalIRRMap;
  };

  // Function to find the latest common date among all selected IRR dates
  const findLatestCommonIRRDate = (selectedDates: ProductIRRSelections, productIds: number[]): string | null => {
    if (productIds.length === 0) return null;
    
    // Get all dates for the first product
    const firstProductDates = selectedDates[productIds[0]] || [];
    if (firstProductDates.length === 0) return null;
    
    // Find dates that are common to all products
    const commonDates = firstProductDates.filter(date => 
      productIds.every(productId => {
        const productDates = selectedDates[productId] || [];
        return productDates.includes(date);
      })
    );
    
    // If no common dates, return null
    if (commonDates.length === 0) return null;
    
    // Sort common dates in descending order (latest first) and return the latest
    return commonDates.sort((a, b) => b.localeCompare(a))[0];
  };

  // Function to check if the end valuation date validation would fail
  const hasEndValuationDateError = useMemo(() => {
    if (!hasEffectiveProductSelection) return false;
    
    // Get all product IDs that will be included in the report
    const productIdsForReport = new Set<number>();
    if (selectedProductIds.length > 0) {
      selectedProductIds
        .filter(p => !excludedProductIds.has(Number(p)))
        .forEach(p => productIdsForReport.add(Number(p)));
    }
    if (selectedClientGroupIds.length > 0) {
      const clientGroupAttachedProducts = relatedProducts.filter(p => !excludedProductIds.has(p.id));
      clientGroupAttachedProducts.forEach(p => productIdsForReport.add(p.id));
    }
    
    const reportProductIds = Array.from(productIdsForReport);
    
    // Check if end valuation date matches the latest common IRR date
    if (reportProductIds.length > 0 && Object.keys(selectedIRRDates).length > 0 && selectedValuationDate) {
      const latestCommonDate = findLatestCommonIRRDate(selectedIRRDates, reportProductIds);
      
      if (latestCommonDate) {
        // Convert both dates to YYYY-MM format for comparison
        const endValuationYearMonth = selectedValuationDate.substring(0, 7);
        const latestCommonYearMonth = latestCommonDate.substring(0, 7);
        
        return endValuationYearMonth !== latestCommonYearMonth;
      }
    }
    
    return false;
  }, [hasEffectiveProductSelection, selectedProductIds, excludedProductIds, selectedClientGroupIds, relatedProducts, selectedIRRDates, selectedValuationDate]);

  const generateReport = async () => {
    // Check if any products are effectively selected (accounting for exclusions)
    if (!hasEffectiveProductSelection) {
      setDataError('Please select at least one product to generate a report.');
      return;
    }
    
    // Additional validation to ensure user has made meaningful selections
    console.log('Report generation validation:');
    console.log(`Selected client groups: ${selectedClientGroupIds.length}`);
    console.log(`Selected products: ${selectedProductIds.length}`);
    
    // Check for duplicate product selections
    const uniqueSelectedProductIds = new Set(selectedProductIds);
    if (uniqueSelectedProductIds.size !== selectedProductIds.length) {
      setDataError('You have selected some products multiple times. Please ensure each product is only selected once.');
      return;
    }
    
    // Check if selected valuation date is valid
    if (availableValuationDates.length > 0 && !selectedValuationDate) {
      setDataError('Please select an end valuation date for the IRR calculation.');
      return;
    }
    
    // Check if there are any available valuation dates at all
    if (availableValuationDates.length === 0 && !availableValuationDates.includes('inactive-products-valid')) {
      setDataError('Cannot generate report: Products do not have common valuation dates. Please select products with overlapping valuation periods.');
      setIsCalculating(false);
      return;
    }
    
    // Get all product IDs that will be included in the report
    const productIdsForReport = new Set<number>();
    if (selectedProductIds.length > 0) {
      selectedProductIds
        .filter(p => !excludedProductIds.has(Number(p)))
        .forEach(p => productIdsForReport.add(Number(p)));
    }
    if (selectedClientGroupIds.length > 0) {
      const clientGroupAttachedProducts = relatedProducts.filter(p => !excludedProductIds.has(p.id));
      clientGroupAttachedProducts.forEach(p => productIdsForReport.add(p.id));
    }
    
    const reportProductIds = Array.from(productIdsForReport);
    
    setIsCalculating(true);
    setDataError(null);
    setMonthlyTransactions([]);
    setTotalValuation(null);
    setValuationDate(null);
    setEarliestTransactionDate(null);
    setTotalIRR(null);
    setProductSummaries([]);
    
    try {
      // Get all excluded product IDs (only direct exclusions now)
      const allExcludedProductIds = new Set<number>([...excludedProductIds]);

      // --- Step 1: Consolidate all Product IDs for the Report ---
      const productIdsForReport = new Set<number>();

      // 1a. Add directly selected products (that aren't excluded)
      if (selectedProductIds.length > 0) {
        selectedProductIds
          .filter(p => !allExcludedProductIds.has(Number(p)))
          .forEach(p => productIdsForReport.add(Number(p)));
      }
      
      // 1b. Add products from selected client groups (that aren't excluded)
      if (selectedClientGroupIds.length > 0) {
        // Use relatedProducts which contains products from selected client groups
        const clientGroupAttachedProducts = relatedProducts.filter(p => !allExcludedProductIds.has(p.id));
        clientGroupAttachedProducts.forEach(p => productIdsForReport.add(p.id));
      }
      
      const uniqueProductIds = Array.from(productIdsForReport);
      
      // Check if end valuation date matches the latest common IRR date
      if (uniqueProductIds.length > 0 && Object.keys(selectedIRRDates).length > 0) {
        const latestCommonDate = findLatestCommonIRRDate(selectedIRRDates, uniqueProductIds);
        
        if (latestCommonDate && selectedValuationDate) {
          // Convert both dates to YYYY-MM format for comparison
          const endValuationYearMonth = selectedValuationDate.substring(0, 7); // YYYY-MM-DD -> YYYY-MM
          const latestCommonYearMonth = latestCommonDate.substring(0, 7); // YYYY-MM-DD -> YYYY-MM
          
          if (endValuationYearMonth !== latestCommonYearMonth) {
            setDataError(`The end valuation date must be the same as the latest common date selected among the historical IRR dates. Latest common date: ${latestCommonDate.substring(0, 7)}, End valuation date: ${endValuationYearMonth}.`);
            setIsCalculating(false);
            return;
          }
        }
      }
      
      if (uniqueProductIds.length === 0) {
        setDataError('No products found for your selection to generate the report.');
        setIsCalculating(false);
        return;
      }
      console.log("Unique Product IDs for report:", uniqueProductIds);

      // Fetch historical IRR data for all products
      console.log("Fetching historical IRR data for products:", uniqueProductIds);
      const historicalIRRMap = await fetchAllHistoricalIRRData(uniqueProductIds, selectedIRRDates);
      console.log("Historical IRR data fetched:", historicalIRRMap.size, "funds with historical data");

      // --- Step 2: Get Portfolio IDs for all selected products ---
      // Use main products list for lookup
      const comprehensiveProductList = products;

      // Create array to store each product's summary data
      const productSummaryResults: ProductPeriodSummary[] = [];
      let overallValuation = 0;
      let latestValuationDate: string | null = null;

      // Track all missing valuations across products
      const allMissingValuations: {productName: string, fundName: string}[] = [];
      
      // Collect all portfolio fund IDs for total IRR calculation
      const allPortfolioFundIds: number[] = [];

      // Process each product individually
      for (const productId of uniqueProductIds) {
        const productDetails = comprehensiveProductList.find(p => p.id === productId);
        if (!productDetails) continue;
        
        const portfolioId = productDetails.portfolio_id;
        if (!portfolioId) continue;
        
        // Get portfolio funds for this product using batch service
        const productPortfolioFunds = await portfolioFundsService.getPortfolioFunds(portfolioId);
        
        console.log(`Product ${productDetails.product_name} has ${productPortfolioFunds.length} portfolio funds:`, productPortfolioFunds.map(pf => ({ id: pf.id, fund_name: pf.fund_name, status: pf.status })));
        
        if (productPortfolioFunds.length === 0) continue;
        
        // Collect all portfolio fund IDs for total IRR calculation
        productPortfolioFunds.forEach(pf => {
          if (pf.id && pf.id > 0) {
            allPortfolioFundIds.push(pf.id);
          }
        });
        
        // Identify active funds
      const inactiveFundIds = new Set<number>();
        const activeFundIds = new Set<number>();
        productPortfolioFunds.forEach(fund => {
          if (fund.id) {
            if (fund.status && fund.status !== 'active') {
          inactiveFundIds.add(fund.id);
            } else {
              activeFundIds.add(fund.id);
            }
          }
        });
        
        // Skip product if it has no active funds AND is not an inactive product
        if (activeFundIds.size === 0 && (productDetails.status !== 'inactive' && inactiveFundIds.size === 0)) {
          console.log(`Skipping product ${productDetails.product_name} as it has no active funds and is not inactive`);
          continue;
        }
        
        // Log if we're processing an inactive product
        if (activeFundIds.size === 0 && (productDetails.status === 'inactive' || inactiveFundIds.size > 0)) {
          console.log(`Processing inactive product ${productDetails.product_name} with ${inactiveFundIds.size} inactive funds`);
        }
        
        // Get activity logs for all fund IDs
        console.log(`Fetching activity logs for ${productPortfolioFunds.length} portfolio funds:`, productPortfolioFunds.map(pf => pf.id));
        const activityLogsPromises = productPortfolioFunds.map(pf => 
          api.get(`/holding_activity_logs?portfolio_fund_id=${pf.id}`)
      );
      const activityResponses = await Promise.all(activityLogsPromises);
      const allActivityLogs = activityResponses.flatMap(res => res.data);
      
      console.log(`Retrieved ${allActivityLogs.length} total activity logs for product ${productDetails.product_name}`);
      console.log('Sample activities:', allActivityLogs.slice(0, 3));

        // Get latest valuations
      // Instead of using the all_latest_fund_valuations endpoint which only provides the latest valuation,
      // we need to get all historical valuations for each fund to support historical reports
      const latestValuationFromViewMap = new Map<number, { value: number, valuation_date: string }>();
      
      // Track funds missing valuations for the selected date
      const missingValuationFunds: Array<{id: number, name: string}> = [];
      
      // Create a map to track all valuations by fund ID and date
      const allFundValuations = new Map<number, { [dateKey: string]: { value: number, valuation_date: string } }>();
      
                    // Fetch all historical valuations for each fund using batch service
       const productFundIds = productPortfolioFunds.map(pf => pf.id);
        const batchValuationResult = await valuationService.getBatchHistoricalValuations(productFundIds);
        
        // Convert batch result to expected format for compatibility
        const valuationResponses = productPortfolioFunds.map(pf => ({
          data: batchValuationResult.get(pf.id) || []
        }));
      
      // First pass: collect all valuations
      valuationResponses.forEach((response, index) => {
        const fundId = productPortfolioFunds[index].id;
        if (!fundId) return;
        
        const fundValuations = response.data || [];
        if (!allFundValuations.has(fundId)) {
          allFundValuations.set(fundId, {});
        }
        
        const fundValuationsMap = allFundValuations.get(fundId)!;
        
        fundValuations.forEach((val: any) => {
          if (val.valuation != null && val.valuation_date != null) {
            const dateParts = val.valuation_date.split('-');
            
            if (dateParts.length >= 2) {
              const valuationYearMonth = `${dateParts[0]}-${dateParts[1]}`;
              
              // Store this valuation by year-month
              fundValuationsMap[valuationYearMonth] = {
                value: parseFloat(val.valuation),
                valuation_date: val.valuation_date
              };
            }
          }
        });
      });
      
      // Second pass: select the appropriate valuation based on the selected date
      allFundValuations.forEach((valuations, fundId) => {
          // If no valuation date is selected, use the latest valuation
          if (!selectedValuationDate) {
              let latestDate = '';
              let latestValue = 0;
              
              // Find the latest valuation
              Object.entries(valuations).forEach(([dateKey, valData]) => {
                  if (!latestDate || dateKey > latestDate) {
                      latestDate = dateKey;
                      latestValue = valData.value;
                  }
              });
              
              if (latestDate) {
                  latestValuationFromViewMap.set(fundId, {
                      value: latestValue,
                      valuation_date: valuations[latestDate].valuation_date
                  });
              } else if (inactiveFundIds.has(fundId)) {
                  // For inactive funds with no valuation data, assign zero valuation
                  const zeroValuation = {
                      value: 0,
                      valuation_date: new Date().toISOString().split('T')[0]
                  };
                  latestValuationFromViewMap.set(fundId, zeroValuation);
                  console.log(`📊 [VALUATION DEBUG] Assigned zero valuation to inactive fund ${fundId} (no date selected)`);
              }
          } else {
              // Find the valuation closest to (but not exceeding) the selected date
              const availableDates = Object.keys(valuations).sort();
              let selectedValuationFound = false;
              
              // Exact match - use the valuation from the selected month
              if (valuations[selectedValuationDate]) {
                  latestValuationFromViewMap.set(fundId, valuations[selectedValuationDate]);
                  selectedValuationFound = true;
              } else {
                  // Find the most recent valuation that doesn't exceed the selected date
                  for (let i = availableDates.length - 1; i >= 0; i--) {
                      const dateKey = availableDates[i];
                      if (dateKey <= selectedValuationDate) {
                          latestValuationFromViewMap.set(fundId, valuations[dateKey]);
                          selectedValuationFound = true;
                          break;
                      }
                  }
              }
              
              // If no valid valuation found for this date, track this fund
              if (!selectedValuationFound && !inactiveFundIds.has(fundId)) {
                  // Find the fund name for better error messaging
                  const fundInfo = productPortfolioFunds.find(pf => pf.id === fundId);
                  const fundName = fundInfo?.fund_name || `Fund ID: ${fundId}`;
                  missingValuationFunds.push({ id: fundId, name: fundName });
                  console.log(`No valid valuation found for fund ${fundId} (${fundName}) on or before ${selectedValuationDate}`);
              } else if (!selectedValuationFound && inactiveFundIds.has(fundId)) {
                  // For inactive funds with no valuation data, assign zero valuation
                  const zeroValuation = {
                      value: 0,
                      valuation_date: selectedValuationDate || new Date().toISOString().split('T')[0]
                  };
                  latestValuationFromViewMap.set(fundId, zeroValuation);
                  console.log(`📊 [VALUATION DEBUG] Assigned zero valuation to inactive fund ${fundId} for ${selectedValuationDate}`);
              }
          }
      });
      
      // If we're using a selected date and any funds are missing valuations, store them for error reporting
      if (selectedValuationDate && missingValuationFunds.length > 0) {
          // Add to the overall missing valuations list
          missingValuationFunds.forEach(fund => {
              allMissingValuations.push({
                  productName: productDetails.product_name,
                  fundName: fund.name
              });
          });
      }
        
        // Calculate all-time summary for this product
        // Calculate totals for the product - tracking specific activity types
        let totalInvestment = 0;
        let totalRegularInvestment = 0;
        let totalTaxUplift = 0;
        let totalProductSwitchIn = 0;
        let totalProductSwitchOut = 0;
        let totalFundSwitchIn = 0;
        let totalFundSwitchOut = 0;
        let totalWithdrawal = 0;
        let totalSwitchIn = 0; // For backward compatibility
        let totalSwitchOut = 0; // For backward compatibility
        let productValuation = 0;
        let productStartDate: string | null = null;
        
        // Process activity logs
        console.log(`Processing ${allActivityLogs.length} activity logs for product ${productDetails.product_name}`);
      allActivityLogs.forEach((log: any) => {
          if (!log.activity_timestamp || !log.amount) return;
        const parsedAmount = parseFloat(log.amount);
          if (parsedAmount === 0) return;
          
          // Track the earliest activity date as the product's start date
          if (!productStartDate || new Date(log.activity_timestamp) < new Date(productStartDate)) {
            productStartDate = log.activity_timestamp;
          }
        
        // Fixed product-level activity type grouping - separate each activity type properly
        switch(log.activity_type) {
            case 'Investment': case 'RegularInvestment':
              totalInvestment += parsedAmount; 
              break;
            case 'TaxUplift':
              totalTaxUplift += parsedAmount;
              break;
            case 'ProductSwitchIn':
              totalProductSwitchIn += parsedAmount;
              totalSwitchIn += parsedAmount; // For backward compatibility

              break;
            case 'Withdrawal':
              totalWithdrawal += parsedAmount; 
              break;
            case 'ProductSwitchOut':
              totalProductSwitchOut += parsedAmount;
              totalSwitchOut += parsedAmount; // For backward compatibility
              break;
            case 'SwitchIn': case 'FundSwitchIn': 
              totalFundSwitchIn += parsedAmount;
              totalSwitchIn += parsedAmount; // For backward compatibility
              break;
            case 'SwitchOut': case 'FundSwitchOut': 
              totalFundSwitchOut += parsedAmount;
              totalSwitchOut += parsedAmount; // For backward compatibility
              break;
          }
        });
        
        // If no start date found from activity logs, use the selected valuation date as fallback
        if (!productStartDate && selectedValuationDate) {
          productStartDate = selectedValuationDate;
        }
        
        console.log(`Product ${productDetails.product_name} activity totals:`, {
          totalInvestment,
          totalWithdrawal,
          totalSwitchIn,
          totalSwitchOut,
          productStartDate,
          activityLogsCount: allActivityLogs.length
        });
        
        // Calculate current valuation (from active funds, or all funds for inactive products)
        let mostRecentValuationDate: string | null = null;
        productPortfolioFunds.forEach(pf => {
          // Include active funds always, and inactive funds for inactive products
          const shouldInclude = !inactiveFundIds.has(pf.id) || (productDetails.status === 'inactive' || activeFundIds.size === 0);
          
          if (shouldInclude) {
            const latestVal = latestValuationFromViewMap.get(pf.id);
            if (latestVal) {
              productValuation += latestVal.value;
              
              // Track the most recent valuation date
              if (!mostRecentValuationDate || new Date(latestVal.valuation_date) > new Date(mostRecentValuationDate)) {
                mostRecentValuationDate = latestVal.valuation_date;
              }
            }
          }
        });
        
        // REMOVED: Don't treat zero valuation as missing valuation data
        // Zero is a valid valuation - funds can legitimately have zero value
        // The missing valuation check is already handled above in the fund-by-fund validation
        // Only skip products that have NO valuation data at all (already handled above)
        
        // Log zero valuation for debugging but allow the product to proceed
        if (productValuation === 0 && activeFundIds.size > 0 && productDetails.status !== 'inactive') {
          console.log(`Product ${productDetails.product_name} has zero valuation for selected date - this is valid and will be included in the report`);
        }
        
        // Allow inactive products to proceed even with zero valuation
        if (productDetails.status === 'inactive' || (activeFundIds.size === 0 && inactiveFundIds.size > 0)) {
          console.log(`Allowing inactive product ${productDetails.product_name} to proceed with valuation: ${productValuation}`);
        }
        
        // Update overall valuation date (take the latest across all products)
        if (mostRecentValuationDate) {
          if (!latestValuationDate || new Date(mostRecentValuationDate) > new Date(latestValuationDate)) {
            latestValuationDate = mostRecentValuationDate;
          }
        }
        
        // Process fund-level data for this product
        const fundSummaries: FundSummary[] = [];
        
        // Get fund details to access fund names and risk factors
        const fundIdsToFetch = productPortfolioFunds.map(pf => pf.available_funds_id);
        const fundsResponse = await api.get('/funds');
        const fundsData = fundsResponse.data || [];
        
        // Create a map for quick lookup
        const fundDetailsMap = new Map<number, any>();
        fundsData.forEach((fund: any) => {
          if (fund.id) {
            fundDetailsMap.set(fund.id, fund);
          }
        });
        
        // Fetch fund IRR values for the selected date or latest if no date selected
        let fundIRRMap = new Map<number, number | null>();
        
          try {
          const allFundIdsList = Array.from(new Set([...activeFundIds, ...inactiveFundIds]));
          console.log(`🔍 [FUND IRR DEBUG] Fetching IRR values for ${allFundIdsList.length} funds:`, allFundIdsList);
          
          if (selectedValuationDate) {
            // Fetch IRR values for specific date
            const [year, month] = selectedValuationDate.split('-').map(part => parseInt(part));
            console.log(`🔍 [FUND IRR DEBUG] Fetching IRR values for specific date: ${year}-${month}`);
            
            const irrResponse = await api.post('/portfolio_funds/batch/irr-values-by-date', {
              fund_ids: allFundIdsList,
              target_month: month,
              target_year: year
            });
            
            if (irrResponse.data && irrResponse.data.data) {
              const irrData = irrResponse.data.data;
              Object.entries(irrData).forEach(([fundId, irrInfo]: [string, any]) => {
                const fundIdNum = parseInt(fundId);
                if (irrInfo && typeof irrInfo.irr === 'number') {
                  fundIRRMap.set(fundIdNum, irrInfo.irr);
                  console.log(`✅ [FUND IRR DEBUG] Set specific date IRR for fund ${fundIdNum}: ${irrInfo.irr}%`);
                } else {
                  fundIRRMap.set(fundIdNum, null);
                  console.log(`⚠️ [FUND IRR DEBUG] No IRR for fund ${fundIdNum} on specific date`);
                }
              });
            }
          } else {
            // Fetch latest IRR values when no specific date is selected
            console.log(`🔍 [FUND IRR DEBUG] No specific date selected, fetching latest IRR values`);
            
            const latestIRRResponse = await getLatestFundIRRs(allFundIdsList);
            if (latestIRRResponse.data && latestIRRResponse.data.fund_irrs) {
              console.log(`✅ [FUND IRR DEBUG] Latest IRR values fetched:`, latestIRRResponse.data.fund_irrs);
              
              latestIRRResponse.data.fund_irrs.forEach((irrRecord: any) => {
                if (typeof irrRecord.irr_result === 'number') {
                  fundIRRMap.set(irrRecord.fund_id, irrRecord.irr_result);
                  console.log(`✅ [FUND IRR DEBUG] Set latest IRR for fund ${irrRecord.fund_id}: ${irrRecord.irr_result}%`);
                } else {
                  fundIRRMap.set(irrRecord.fund_id, null);
                  console.log(`⚠️ [FUND IRR DEBUG] No latest IRR for fund ${irrRecord.fund_id}`);
                }
              });
            }
            }
          } catch (error) {
          console.error('❌ [FUND IRR DEBUG] Error fetching fund IRR values:', error);
            // Continue without IRR values - they'll be set to null
        }
        
        // Collect activity data per fund
        for (const portfolioFund of productPortfolioFunds) {
          // Skip if no valid ID
          if (!portfolioFund.id) continue;
          
          // Get fund details from the available fund
          const availableFund = fundDetailsMap.get(portfolioFund.available_funds_id);
          const fundName = availableFund?.fund_name || `Fund ${portfolioFund.available_funds_id}`;
          const isinNumber = availableFund?.isin_number;
          const riskFactor = availableFund?.risk_factor; // Get risk factor from available fund
          
          // Get activity logs for this fund
          const fundLogs = allActivityLogs.filter(log => 
            log.portfolio_fund_id === portfolioFund.id
          );
          
          console.log(`Fund ${fundName} (ID: ${portfolioFund.id}) has ${fundLogs.length} activity logs`);
          
          // Calculate totals for this fund - tracking specific activity types
          let fundInvestment = 0;
          let fundRegularInvestment = 0;
          let fundTaxUplift = 0;
          let fundProductSwitchIn = 0;
          let fundProductSwitchOut = 0;
          let fundFundSwitchIn = 0;
          let fundFundSwitchOut = 0;
          let fundWithdrawal = 0;
          let fundSwitchIn = 0; // For backward compatibility
          let fundSwitchOut = 0; // For backward compatibility
          
          // Debug: Log all activities for this fund
          if (fundLogs.length > 0) {
            console.log(`Activities for ${fundName}:`, fundLogs.map(log => ({
              date: log.activity_timestamp,
              type: log.activity_type,
              amount: log.amount,
              portfolio_fund_id: log.portfolio_fund_id
            })));
          }
          
          fundLogs.forEach(log => {
            console.log(`Processing activity for ${fundName}:`, {
              activity_type: log.activity_type,
              raw_amount: log.amount,
              parsed_amount: parseFloat(log.amount),
              amount_check: !log.amount,
              amount_absolute: Math.abs(parseFloat(log.amount || 0)),
              is_zero: Math.abs(parseFloat(log.amount || 0)) < 0.01,
              activity_timestamp: log.activity_timestamp
            });
            
            if (!log.amount) return;
            const amount = parseFloat(log.amount);
            
            // Skip very small amounts (likely rounding errors)
            if (Math.abs(amount) < 0.01) {
              console.log(`Skipping tiny amount for ${fundName}: ${amount}`);
              return;
            }
            
            // Fixed activity type grouping - separate each activity type properly
            switch(log.activity_type) {
              case 'Investment': case 'RegularInvestment':
                fundInvestment += amount; 
                break;
              case 'TaxUplift':
                fundTaxUplift += amount;
                break;
              case 'ProductSwitchIn':
                fundProductSwitchIn += amount;
                fundSwitchIn += amount; // For backward compatibility
                break;
              case 'Withdrawal':
                fundWithdrawal += amount; 
                break;
              case 'ProductSwitchOut':
                fundProductSwitchOut += amount;
                fundSwitchOut += amount; // For backward compatibility
                break;
              case 'SwitchIn': case 'FundSwitchIn': 
                fundFundSwitchIn += amount;
                fundSwitchIn += amount; // For backward compatibility
                break;
              case 'SwitchOut': case 'FundSwitchOut': 
                fundFundSwitchOut += amount;
                fundSwitchOut += amount; // For backward compatibility
                break;
            }
          });
          
          console.log(`Fund ${fundName} activity totals:`, {
            fundInvestment,
            fundRegularInvestment,
            fundTaxUplift,
            fundProductSwitchIn,
            fundProductSwitchOut,
            fundFundSwitchIn,
            fundFundSwitchOut,
            fundWithdrawal,
            netFlow: fundInvestment + fundRegularInvestment + fundTaxUplift + fundProductSwitchIn + fundFundSwitchIn - fundWithdrawal - fundProductSwitchOut - fundFundSwitchOut
          });
          
          // Get current valuation (include inactive funds for inactive products)
          let fundValuation = 0;
          const latestVal = latestValuationFromViewMap.get(portfolioFund.id);
          if (latestVal) {
            fundValuation = latestVal.value;
          } else if (inactiveFundIds.has(portfolioFund.id)) {
            // For inactive funds, try to get the latest valuation even if it doesn't match the selected date
            fundValuation = 0; // Default to 0 for inactive funds without valuations
            console.log(`Using zero valuation for inactive fund ${fundName} (ID: ${portfolioFund.id})`);
          }
          
          // Get fund IRR from the fetched values (preserve zero values)
          const fundIRR = fundIRRMap.has(portfolioFund.id) ? (fundIRRMap.get(portfolioFund.id) ?? null) : null;
          
          // Get historical IRR data for this fund
          const historicalIRRValues = historicalIRRMap.get(portfolioFund.id) || [];
          
          // Get the actual dates corresponding to the historical IRR values
          // These should be the selected dates for the product this fund belongs to
          const productSelectedDates = selectedIRRDates[productId] || [];
          const sortedSelectedDates = [...productSelectedDates].sort((a, b) => 
            new Date(b).getTime() - new Date(a).getTime()
          );

          // Add to fund summaries with proper activity type values
          fundSummaries.push({
            id: portfolioFund.id,
            available_funds_id: portfolioFund.available_funds_id,
            fund_name: fundName,
            total_investment: fundInvestment,
            total_regular_investment: fundRegularInvestment,
            total_tax_uplift: fundTaxUplift,
            total_product_switch_in: fundProductSwitchIn,
            total_product_switch_out: fundProductSwitchOut,
            total_fund_switch_in: fundFundSwitchIn,
            total_fund_switch_out: fundFundSwitchOut,
            total_withdrawal: fundWithdrawal,

            net_flow: fundInvestment + fundRegularInvestment + fundTaxUplift + fundProductSwitchIn + fundFundSwitchIn - fundWithdrawal - fundProductSwitchOut - fundFundSwitchOut,
            current_valuation: fundValuation,
            irr: fundIRR,
            isin_number: isinNumber,
            status: portfolioFund.status || 'active',
            risk_factor: riskFactor, // Use the risk factor from the available fund
            historical_irr: historicalIRRValues, // Add historical IRR data
            historical_dates: sortedSelectedDates // Use actual dates, not formatted labels
          });
        }

        
        // Calculate product IRR using the standardized multiple funds IRR endpoint

        let productIRR: number | null = null;
        
        // For inactive products, try to get the latest portfolio IRR even if valuation is zero
        const isInactiveProduct = productDetails.status === 'inactive' || (activeFundIds.size === 0 && inactiveFundIds.size > 0);
        
        console.log(`🎯 [PRODUCT IRR DEBUG] Product ${productDetails.product_name} (ID: ${productId}) IRR calculation conditions:`, {
          fundSummariesLength: fundSummaries.length,
          productValuation,
          productStatus: productDetails.status,
          activeFundIds: activeFundIds.size,
          inactiveFundIds: inactiveFundIds.size,
          isInactiveProduct,
          shouldCalculateIRR: fundSummaries.length > 0 && (productValuation > 0 || isInactiveProduct)
        });
        
        // Allow IRR calculation for products with funds, regardless of valuation
        // Zero valuation is legitimate and should not prevent IRR calculation
        if (fundSummaries.length > 0) {
          try {
            // Get portfolio fund IDs for this product (excluding only virtual funds)
            const productPortfolioFundIds = fundSummaries
              .filter(fund => !fund.isVirtual && fund.id > 0)
              .map(fund => fund.id);
            
            if (productPortfolioFundIds.length > 0) {
              console.log(`Calculating standardized IRR for product ${productId} with fund IDs:`, productPortfolioFundIds);
              
              // Format the selected valuation date for the API call
              let formattedDate: string | undefined = undefined;
          if (selectedValuationDate) {
                // Convert YYYY-MM format to YYYY-MM-DD (last day of month)
            const [year, month] = selectedValuationDate.split('-').map(part => parseInt(part));
                const lastDayOfMonth = new Date(year, month, 0).getDate();
                formattedDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`;
              }
              
              // Use optimized IRR service for active products, latest portfolio IRR for inactive products
              console.log(`🎯 [PRODUCT IRR DEBUG] Product ${productDetails.product_name} is ${isInactiveProduct ? 'INACTIVE' : 'ACTIVE'} - using ${isInactiveProduct ? 'portfolio IRR endpoint' : 'optimized IRR service'}`);
              
              if (isInactiveProduct) {
                // For inactive products, get the latest portfolio-level IRR
                console.log(`🎯 [PRODUCT IRR DEBUG] Fetching portfolio IRR for INACTIVE product: ${productDetails.product_name} (ID: ${productId})`);
                try {
                  const portfolioIRRResponse = await api.get(`/api/portfolios/${productDetails.portfolio_id}/latest_irr`);
                  if (portfolioIRRResponse.data && typeof portfolioIRRResponse.data.irr_result === 'number') {
                    productIRR = portfolioIRRResponse.data.irr_result;
                    console.log(`Latest portfolio IRR for inactive product ${productId}: ${productIRR}% (date: ${portfolioIRRResponse.data.irr_date})`);
                  } else {
                    console.warn(`No portfolio IRR found for inactive product ${productId}`);
                  }
                } catch (portfolioIRRErr) {
                  console.error(`Error fetching portfolio IRR for inactive product ${productId}:`, portfolioIRRErr);
                  // Fall back to fund-level calculation
                  const optimizedIRRData = await irrDataService.getOptimizedIRRData({
                    portfolioId: productDetails.portfolio_id,
                    portfolioFundIds: productPortfolioFundIds,
                    endDate: formattedDate,
                    includeHistorical: false
                  });
                  productIRR = optimizedIRRData.portfolioIRR;
                }
              } else {
                // For active products, use optimized IRR service
                console.log(`🎯 [REPORT DEBUG] Fetching IRR for active product: ${productDetails.product_name} (ID: ${productId})`);
                console.log(`🎯 [REPORT DEBUG] IRR service params:`, {
                  portfolioId: productDetails.portfolio_id,
                  portfolioFundIds: productPortfolioFundIds,
                  endDate: formattedDate,
                  includeHistorical: false
                });
                
                const optimizedIRRData = await irrDataService.getOptimizedIRRData({
                  portfolioId: productDetails.portfolio_id,
                  portfolioFundIds: productPortfolioFundIds,
                  endDate: formattedDate,
                  includeHistorical: false
                });
                
                console.log(`🎯 [REPORT DEBUG] IRR service response for ${productDetails.product_name}:`, optimizedIRRData);
                
                productIRR = optimizedIRRData.portfolioIRR;
                console.log(`🎯 [REPORT DEBUG] Extracted portfolio IRR: ${productIRR} for ${productDetails.product_name}`);
                console.log(`Optimized IRR for active product ${productId}: ${productIRR}% (source: ${optimizedIRRData.irrDate})`);
              }
          } else {
              console.warn(`No valid portfolio fund IDs found for product ${productId} IRR calculation`);
            }
          } catch (irrErr) {
            console.error(`Error calculating standardized IRR for product ${productId}:`, irrErr);
            productIRR = null;
          }
        }

        // Helper function to create a virtual "Previous Funds" entry
        const createPreviousFundsEntry = async (inactiveFunds: FundSummary[]): Promise<FundSummary | null> => {
          if (inactiveFunds.length === 0) return null;
          
          // Sum up all values from inactive funds
          const totalInvestment = inactiveFunds.reduce((sum, fund) => sum + fund.total_investment, 0);
          const totalWithdrawal = inactiveFunds.reduce((sum, fund) => sum + fund.total_withdrawal, 0);
          const totalSwitchIn = inactiveFunds.reduce((sum, fund) => sum + (fund.total_fund_switch_in || 0) + (fund.total_product_switch_in || 0), 0);
                      const totalSwitchOut = inactiveFunds.reduce((sum, fund) => sum + (fund.total_fund_switch_out || 0) + (fund.total_product_switch_out || 0), 0);
          const totalValuation = inactiveFunds.reduce((sum, fund) => sum + fund.current_valuation, 0);
          
          // Calculate IRR for Previous Funds using standardized multiple portfolio fund endpoint
          let previousFundsIRR: number | null = null;
          
          console.log('🔍 Previous Funds IRR Calculation Debug:');
          console.log('- Inactive funds count:', inactiveFunds.length);
          console.log('- Inactive funds details:', inactiveFunds);
          
          try {
            // Get portfolio fund IDs from inactive funds that have valid IDs
            const inactiveFundIds = inactiveFunds
              .map(fund => fund.id)
              .filter(id => id && id > 0); // Only include valid positive IDs
            
            console.log('- Extracted inactive fund IDs:', inactiveFundIds);
            
            if (inactiveFundIds.length > 0) {
              // Format the selected valuation date for the API call
              let formattedDate: string | undefined = undefined;
              if (selectedValuationDate) {
                // Convert YYYY-MM format to YYYY-MM-DD (last day of month)
                const [year, month] = selectedValuationDate.split('-').map(part => parseInt(part));
                const lastDayOfMonth = new Date(year, month, 0).getDate();
                formattedDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`;
              }
              
              console.log('🚀 Calculating Previous Funds IRR for fund IDs:', inactiveFundIds, 'with date:', formattedDate);
              console.log('🔍 DEBUG: ReportGenerator.tsx calling IRR with inactive fund IDs:', inactiveFundIds);
              
              const irrResponse = await calculateStandardizedMultipleFundsIRR({
                portfolioFundIds: inactiveFundIds,
                irrDate: formattedDate
              });
              
              console.log('📊 Previous Funds IRR API Response:', irrResponse);
              console.log('📊 Response data:', irrResponse.data);
              
              if (irrResponse.data && typeof irrResponse.data.irr_percentage === 'number') {
                previousFundsIRR = irrResponse.data.irr_percentage;
                console.log('✅ Previous Funds IRR calculated successfully:', previousFundsIRR);
              } else {
                console.warn('⚠️ IRR response missing or invalid irr_percentage:', {
                  hasData: !!irrResponse.data,
                  irrPercentage: irrResponse.data?.irr_percentage,
                  irrPercentageType: typeof irrResponse.data?.irr_percentage
                });
              }
            } else {
              console.log('⚠️ No valid inactive fund IDs found for Previous Funds IRR calculation');
            }
          } catch (error) {
            console.error('❌ Error calculating Previous Funds IRR:', error);
            // IRR will remain null if calculation fails
          }
          
          console.log('🎯 Final Previous Funds IRR result:', previousFundsIRR);
          
          // Fetch latest IRRs for individual inactive funds from the view
          try {
            const inactiveFundIdsArray = Array.from(inactiveFundIds);
            if (inactiveFundIdsArray.length > 0) {
              console.log('🔍 Fetching latest IRRs for individual inactive funds...');
              const latestIRRsResponse = await getLatestFundIRRs(inactiveFundIdsArray);
              
              if (latestIRRsResponse.data && latestIRRsResponse.data.fund_irrs) {
                console.log('✅ Latest IRRs fetched successfully:', latestIRRsResponse.data.fund_irrs);
                
                // Map the IRR results back to the inactive funds
                for (const fund of inactiveFunds) {
                  const irrRecord = latestIRRsResponse.data.fund_irrs.find((irr: any) => irr.fund_id === fund.id);
                  if (irrRecord && typeof irrRecord.irr_result === 'number') {
                    fund.irr = irrRecord.irr_result;
                    console.log(`✅ Set IRR for ${fund.fund_name} (ID: ${fund.id}): ${fund.irr}%`);
                  } else {
                    fund.irr = null;
                    console.log(`⚠️ No IRR found for ${fund.fund_name} (ID: ${fund.id})`);
                  }
                  
                  // Add historical IRR data for inactive funds
                  const historicalIRRValues = historicalIRRMap.get(fund.id) || [];
                  fund.historical_irr = historicalIRRValues;
                  
                  // Get the actual dates corresponding to the historical IRR values
                  const productSelectedDates = selectedIRRDates[productId] || [];
                  const sortedSelectedDates = [...productSelectedDates].sort((a, b) => 
                    new Date(b).getTime() - new Date(a).getTime()
                  );
                  fund.historical_dates = sortedSelectedDates;
                }
              }
            }
          } catch (error) {
            console.warn('Failed to fetch latest IRRs for inactive funds:', error);
            // Set all to null if batch fetch fails
            for (const fund of inactiveFunds) {
              fund.irr = null;
            }
          }
          
          // Calculate weighted risk factor for Previous Funds
          // Use net flows, target weightings, or valuations as weights for proper risk calculation
          let weightedRisk: number | undefined = undefined;
          const fundsWithRisk = inactiveFunds.filter(
            fund => fund.risk_factor !== undefined && fund.risk_factor !== null
          );
          
          if (fundsWithRisk.length > 0) {
            // Try different weighting approaches in order of preference
            let totalWeight = 0;
            let weightedRiskSum = 0;
            
            // Approach 1: Use absolute net flow as weights (most meaningful for inactive funds)
            const netFlowWeights = fundsWithRisk.map(fund => Math.abs(fund.net_flow || 0));
            const totalNetFlow = netFlowWeights.reduce((sum, weight) => sum + weight, 0);
            
            if (totalNetFlow > 0) {
              // Use net flow weighting
              fundsWithRisk.forEach((fund, index) => {
                const weight = netFlowWeights[index] / totalNetFlow;
                weightedRiskSum += fund.risk_factor! * weight;
              });
              weightedRisk = weightedRiskSum;
              totalWeight = totalNetFlow;
              console.log('🎯 Using net flow weighting for Previous Funds risk');
            } else {
              // Approach 2: Use total investment as weights
              const investmentWeights = fundsWithRisk.map(fund => Math.abs(fund.total_investment || 0));
              const totalInvestmentWeight = investmentWeights.reduce((sum, weight) => sum + weight, 0);
              
              if (totalInvestmentWeight > 0) {
                fundsWithRisk.forEach((fund, index) => {
                  const weight = investmentWeights[index] / totalInvestmentWeight;
                  weightedRiskSum += fund.risk_factor! * weight;
                });
                weightedRisk = weightedRiskSum;
                totalWeight = totalInvestmentWeight;
                console.log('🎯 Using investment amount weighting for Previous Funds risk');
              } else {
                // Approach 3: Use current valuation as weights (fallback)
                const valuationWeights = fundsWithRisk.map(fund => Math.abs(fund.current_valuation || 0));
                const totalValuationWeight = valuationWeights.reduce((sum, weight) => sum + weight, 0);
                
                if (totalValuationWeight > 0) {
                  fundsWithRisk.forEach((fund, index) => {
                    const weight = valuationWeights[index] / totalValuationWeight;
                    weightedRiskSum += fund.risk_factor! * weight;
                  });
                  weightedRisk = weightedRiskSum;
                  totalWeight = totalValuationWeight;
                  console.log('🎯 Using valuation weighting for Previous Funds risk');
                } else {
                  // Approach 4: Equal weighting as final fallback
                  weightedRisk = fundsWithRisk.reduce(
                    (sum, fund) => sum + fund.risk_factor!, 0
                  ) / fundsWithRisk.length;
                  totalWeight = fundsWithRisk.length;
                  console.log('🎯 Using equal weighting for Previous Funds risk (fallback)');
                }
              }
            }
          }

          console.log('🎯 Previous Funds weighted risk calculation:', {
            totalInactiveFunds: inactiveFunds.length,
            fundsWithRisk: fundsWithRisk.length,
            totalInvestment,
            weightedRisk: weightedRisk ? weightedRisk.toFixed(1) : 'undefined',
            inactiveFundsData: inactiveFunds.map(f => ({ 
              id: f.id, 
              name: f.fund_name, 
              risk: f.risk_factor, 
              totalInvestment: f.total_investment,
              totalWithdrawal: f.total_withdrawal,
                        totalSwitchIn: f.total_fund_switch_in,
          totalSwitchOut: f.total_fund_switch_out,
              netFlow: f.net_flow
            }))
          });
          
          // Create a virtual entry with aggregated values
          const previousFundsEntry = {
            id: -1, // Special ID for virtual fund
            available_funds_id: -1,
            fund_name: 'Previous Funds',
            total_investment: totalInvestment,
            total_regular_investment: totalInvestment,
            total_tax_uplift: 0,
            total_product_switch_in: 0,
            total_product_switch_out: 0,
            total_fund_switch_in: 0,
            total_fund_switch_out: 0,
            total_withdrawal: totalWithdrawal,

            net_flow: totalInvestment - totalWithdrawal + totalSwitchIn - totalSwitchOut,
            current_valuation: totalValuation,
            irr: previousFundsIRR, // Calculate IRR for Previous Funds using standardized endpoint
            isVirtual: true, // Flag to identify this as a virtual entry
            status: 'virtual',
            inactiveFundCount: inactiveFunds.length, // Add count of inactive funds
            risk_factor: weightedRisk, // Use calculated weighted risk instead of just first fund's risk
            inactiveFunds: inactiveFunds // Store individual inactive funds for breakdown
          };
          
          console.log('🎯 Created Previous Funds entry with IRR:', previousFundsEntry.irr);
          console.log('🎯 Created Previous Funds entry with Risk:', previousFundsEntry.risk_factor);
          console.log('🎯 Full Previous Funds entry:', previousFundsEntry);
          
          return previousFundsEntry;
        };
        
        // Separate active and inactive funds
        const activeFunds = fundSummaries.filter(fund => fund.status === 'active');
        const inactiveFunds = fundSummaries.filter(fund => fund.status !== 'active');
        
        console.log(`📊 Fund Status Debug for Product ${productDetails.product_name}:`);
        console.log('- Total fund summaries:', fundSummaries.length);
        console.log('- Active funds:', activeFunds.length);
        console.log('- Inactive funds:', inactiveFunds.length);
        console.log('- All fund statuses:', fundSummaries.map(f => ({ id: f.id, name: f.fund_name, status: f.status })));
        
        // Create the Previous Funds entry if there are inactive funds
        const previousFundsEntry = await createPreviousFundsEntry(inactiveFunds);
        
        // Prepare final fund list - active funds first, then Previous Funds if it exists
        const finalFundList = [...activeFunds];
        if (previousFundsEntry) {
          finalFundList.push(previousFundsEntry);
        }
        
        // Calculate weighted risk for the product using active funds' current valuations as weights
        let productWeightedRisk: number | undefined = undefined;
        const activeFundsWithRiskAndValuation = activeFunds.filter(
          fund => fund.risk_factor !== undefined && fund.risk_factor !== null && fund.current_valuation > 0
        );
        
        if (activeFundsWithRiskAndValuation.length > 0) {
          const totalActiveValuation = activeFundsWithRiskAndValuation.reduce(
            (sum, fund) => sum + fund.current_valuation, 0
          );
          
          if (totalActiveValuation > 0) {
            productWeightedRisk = activeFundsWithRiskAndValuation.reduce(
              (sum, fund) => sum + (fund.risk_factor! * (fund.current_valuation / totalActiveValuation)), 
              0
            );
            
            console.log(`🎯 Product ${productDetails.product_name} weighted risk calculation:`, {
              activeFundsWithRisk: activeFundsWithRiskAndValuation.length,
              totalActiveValuation,
              weightedRisk: productWeightedRisk.toFixed(1),
              fundBreakdown: activeFundsWithRiskAndValuation.map(f => ({
                name: f.fund_name,
                risk: f.risk_factor,
                valuation: f.current_valuation,
                weight: (f.current_valuation / totalActiveValuation * 100).toFixed(1) + '%'
              }))
            });
          }
        }
        
        // Use product_owner_name directly from API response (contains nickname + surname)
        let productOwnerName: string | undefined = productDetails.product_owner_name;

        // Calculate product totals by summing all fund summaries (including inactive funds)
        // This ensures consistency between fund-level and product-level totals
        const productTotalInvestment = fundSummaries.reduce((sum, fund) => sum + fund.total_investment, 0);
        const productTotalRegularInvestment = fundSummaries.reduce((sum, fund) => sum + fund.total_regular_investment, 0);
        const productTotalTaxUplift = fundSummaries.reduce((sum, fund) => sum + fund.total_tax_uplift, 0);
        const productTotalProductSwitchIn = fundSummaries.reduce((sum, fund) => sum + fund.total_product_switch_in, 0);
        const productTotalProductSwitchOut = fundSummaries.reduce((sum, fund) => sum + fund.total_product_switch_out, 0);
        const productTotalFundSwitchIn = fundSummaries.reduce((sum, fund) => sum + fund.total_fund_switch_in, 0);
        const productTotalFundSwitchOut = fundSummaries.reduce((sum, fund) => sum + fund.total_fund_switch_out, 0);
        const productTotalWithdrawal = fundSummaries.reduce((sum, fund) => sum + fund.total_withdrawal, 0);
        const productTotalSwitchIn = fundSummaries.reduce((sum, fund) => sum + fund.total_fund_switch_in, 0);
        const productTotalSwitchOut = fundSummaries.reduce((sum, fund) => sum + fund.total_fund_switch_out, 0);

        console.log(`✅ Product ${productDetails.product_name} corrected totals from fund summaries:`, {
          investment: productTotalInvestment,
          regular_investment: productTotalRegularInvestment,
          tax_uplift: productTotalTaxUplift,
          product_switch_in: productTotalProductSwitchIn,
          product_switch_out: productTotalProductSwitchOut,
          fund_switch_in: productTotalFundSwitchIn,
          fund_switch_out: productTotalFundSwitchOut,
          withdrawal: productTotalWithdrawal
        });

        // Add to summary results with fund data and corrected activity type totals
        productSummaryResults.push({
          id: productId,
          product_name: productDetails.product_name,
          product_type: productDetails.product_type,
          product_owner_name: productOwnerName,
          start_date: productStartDate,
          total_investment: productTotalInvestment,
          total_regular_investment: productTotalRegularInvestment,
          total_tax_uplift: productTotalTaxUplift,
          total_product_switch_in: productTotalProductSwitchIn,
          total_product_switch_out: productTotalProductSwitchOut,
          total_fund_switch_in: productTotalFundSwitchIn,
          total_fund_switch_out: productTotalFundSwitchOut,
          total_withdrawal: productTotalWithdrawal,

          net_flow: productTotalInvestment + productTotalRegularInvestment + productTotalTaxUplift + productTotalProductSwitchIn + productTotalFundSwitchIn - productTotalWithdrawal - productTotalProductSwitchOut - productTotalFundSwitchOut,
          current_valuation: productValuation,
          irr: productIRR,
          provider_name: productDetails.provider_name,
          provider_theme_color: productDetails.provider_theme_color,
          funds: finalFundList,
          weighted_risk: productWeightedRisk,
          status: productDetails.status, // Add product status for greying out inactive products
          plan_number: productDetails.plan_number // Add plan number for title generation
        });
        
        // Add to overall valuation
        overallValuation += productValuation;
      }
      
      // Check for missing valuations across all products before proceeding
      if (allMissingValuations.length > 0) {
        // Format error message with product and fund names
        const missingItemsList = allMissingValuations.map(item => 
          `${item.productName} - ${item.fundName}`
        ).join(', ');
        
        const errorMessage = `Cannot generate report for ${formatDateFallback(selectedValuationDate || '')}. 
The following funds are missing valuation data for this period:
${missingItemsList}

Please select a different valuation date or ensure all active funds have valuation data.`;
        
        setDataError(errorMessage);
        setIsCalculating(false);
        return;
      }
      
      // Check if we have any valid products with valuations
      if (productSummaryResults.length === 0) {
        setDataError(`No products with valid valuations found for ${formatDateFallback(selectedValuationDate || '')}. Please select a different valuation date.`);
        setIsCalculating(false);
        return;
      }
      
      // REMOVED: Don't prevent report generation for zero-value portfolios
      // Zero portfolio value is legitimate and reports should still be generated
      // to show transaction history and how the portfolio reached zero value
      
      // Log zero valuation for debugging but allow the report to proceed
      if (overallValuation === 0) {
        console.log(`Portfolio has zero total value for ${formatDateFallback(selectedValuationDate || '')} - this is valid and the report will be generated`);
      }
      
      // Set state with summary data
      setProductSummaries(productSummaryResults);
      setTotalValuation(overallValuation);
      setValuationDate(latestValuationDate);
      
      // Find the earliest transaction date across all products
      let earliestDate: string | null = null;
      for (const product of productSummaryResults) {
        if (product.start_date && (!earliestDate || new Date(product.start_date) < new Date(earliestDate))) {
          earliestDate = product.start_date;
        }
      }
      
      setEarliestTransactionDate(earliestDate);
      
      // Calculate overall IRR using the standardized multiple funds IRR endpoint
      // IRR can be calculated even with zero current valuation since it's based on cash flows over time
      let calculatedTotalIRR = null;
      if (productSummaryResults.length > 0) {
        try {
          // Deduplicate portfolio fund IDs in case any products share funds
          const uniquePortfolioFundIds = Array.from(new Set(allPortfolioFundIds));
          console.log('Total portfolio fund IDs collected for IRR calculation:', {
            total: allPortfolioFundIds.length,
            unique: uniquePortfolioFundIds.length,
            duplicatesRemoved: allPortfolioFundIds.length - uniquePortfolioFundIds.length
          });
          
          if (uniquePortfolioFundIds.length > 0) {
            console.log('Calculating standardized IRR for portfolio fund IDs:', uniquePortfolioFundIds);
            
            // Format the selected valuation date for the API call
            let formattedDate: string | undefined = undefined;
        if (selectedValuationDate) {
              // Convert YYYY-MM format to YYYY-MM-DD (last day of month)
          const [year, month] = selectedValuationDate.split('-').map(part => parseInt(part));
              const lastDayOfMonth = new Date(year, month, 0).getDate();
              formattedDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`;
            }
            
            console.log('Using optimized batch IRR service for total IRR:', {
              portfolioFundIds: uniquePortfolioFundIds,
              irrDate: formattedDate
            });
            
            // Calculate portfolio total average return using IRR of all selected products
            // This uses the multiple portfolio fund IRR endpoint with all fund IDs from all products
            const totalIRRData = await irrDataService.getOptimizedIRRData({
              portfolioFundIds: uniquePortfolioFundIds,
              endDate: formattedDate,
              includeHistorical: false
            });
            
            console.log('🎯 [TOTAL IRR DEBUG] Optimized total IRR response:', totalIRRData);
            console.log('🎯 [TOTAL IRR DEBUG] portfolioIRR field:', totalIRRData.portfolioIRR);
            console.log('🎯 [TOTAL IRR DEBUG] portfolioIRR type:', typeof totalIRRData.portfolioIRR);
            
            setTotalIRR(totalIRRData.portfolioIRR);
            calculatedTotalIRR = totalIRRData.portfolioIRR;
            console.log('✅ [TOTAL IRR DEBUG] Optimized total IRR calculation complete:', totalIRRData.portfolioIRR);
            
        } else {
            console.warn('No valid portfolio fund IDs found for IRR calculation');
            setTotalIRR(null);
            
            // Navigate to report display page even without total IRR
            const reportDataWithoutIRR = {
              productSummaries: productSummaryResults,
              totalIRR: null,
              totalValuation: overallValuation,
              earliestTransactionDate: earliestDate,
              selectedValuationDate: selectedValuationDate,
              productOwnerNames: (() => {
                console.log('🔍 [PRODUCT OWNER DEBUG] Raw product owner names:', productSummaryResults.map(p => ({ 
                  id: p.id, 
                  name: p.product_name, 
                  owner: p.product_owner_name,
                  ownerType: typeof p.product_owner_name 
                })));
                
                const allNames = productSummaryResults
                  .map(product => product.product_owner_name)
                  .filter(name => name && name.trim() !== '');
                
                console.log('🔍 [PRODUCT OWNER DEBUG] Filtered names:', allNames);
                
                const splitNames = allNames
                  .flatMap(name => name ? name.split(/[,&]/).map(n => n.trim()) : [])
                  .filter(name => name !== '');
                
                console.log('🔍 [PRODUCT OWNER DEBUG] After splitting:', splitNames);
                
                const uniqueNames = Array.from(new Set(splitNames)).sort();
                
                console.log('🔍 [PRODUCT OWNER DEBUG] Final unique names:', uniqueNames);
                
                return uniqueNames;
              })(),
              timePeriod: (() => {
                // Always use the selected valuation date if available
                if (selectedValuationDate) {
                  if (earliestDate) {
                  const startDate = formatDateFallback(earliestDate);
                  const endDate = formatDateFallback(selectedValuationDate);
                  return `${startDate} to ${endDate}`;
                  } else {
                    // If no earliest date found, show period ending with the selected date
                  return `Period ending ${formatDateFallback(selectedValuationDate)}`;
                  }
                } else {
                  return 'Current Period';
                }
              })(),
              // Report settings
              showInactiveProducts,
              showPreviousFunds
            };

            // Navigate to the report display page
            navigate('/report-display', { state: { reportData: reportDataWithoutIRR } });
          }
        } catch (irrErr) {
          console.error('Error calculating standardized IRR:', irrErr);
          setTotalIRR(null);
        }
      } else {
        setTotalIRR(null);
      }

      // Always navigate to report display page after processing
      const finalReportData = {
        productSummaries: productSummaryResults,
        totalIRR: calculatedTotalIRR,
        totalValuation: overallValuation,
        earliestTransactionDate: earliestDate,
        selectedValuationDate: selectedValuationDate,
        productOwnerNames: (() => {
          console.log('🔍 [FINAL PRODUCT OWNER DEBUG] Raw product owner names:', productSummaryResults.map(p => ({ 
            id: p.id, 
            name: p.product_name, 
            owner: p.product_owner_name,
            ownerType: typeof p.product_owner_name 
          })));
          
          const allNames = productSummaryResults
            .map(product => product.product_owner_name)
            .filter(name => name && name.trim() !== '');
          
          console.log('🔍 [FINAL PRODUCT OWNER DEBUG] Filtered names:', allNames);
          
          const splitNames = allNames
            .flatMap(name => name ? name.split(/[,&]/).map(n => n.trim()) : [])
            .filter(name => name !== '');
          
          console.log('🔍 [FINAL PRODUCT OWNER DEBUG] After splitting:', splitNames);
          
          const uniqueNames = Array.from(new Set(splitNames)).sort();
          
          console.log('🔍 [FINAL PRODUCT OWNER DEBUG] Final unique names:', uniqueNames);
          
          return uniqueNames;
        })(),
        timePeriod: (() => {
          // Always use the selected valuation date if available
          if (selectedValuationDate) {
            if (earliestDate) {
            const startDate = formatDateFallback(earliestDate);
            const endDate = formatDateFallback(selectedValuationDate);
            return `${startDate} to ${endDate}`;
            } else {
              // If no earliest date found, show period ending with the selected date
            return `Period ending ${formatDateFallback(selectedValuationDate)}`;
            }
          } else {
            return 'Current Period';
          }
        })(),
        // Report settings
        showInactiveProducts,
        showPreviousFunds,
        showInactiveProductDetails: Array.from(showInactiveProductDetails),
        selectedHistoricalIRRDates: selectedIRRDates,
        availableHistoricalIRRDates: availableIRRDates
      };

      // Navigate to the report display page
      navigate('/report-display', { state: { reportData: finalReportData } });
      
    } catch (err: any) {
      console.error('Error generating report:', err);
      setDataError(err.response?.data?.detail || 'Failed to generate report. Check console for details.');
    } finally {
      setIsCalculating(false);
    }
  };
  
  // Pivoted Table Data Preparation (ensure this is BEFORE the return statement with JSX)
  const transactionRowLabels = [
    { key: 'total_investment', label: 'Investment' },
    { key: 'total_withdrawal', label: 'Withdrawal' },
    { key: 'total_fund_switch_in', label: 'Fund Switch In' },
    { key: 'total_fund_switch_out', label: 'Fund Switch Out' },
    { key: 'valuation', label: 'Valuation' },
  ];

  const columnMonths = useMemo(() => {
    if (!monthlyTransactions || monthlyTransactions.length === 0) return [];
    // Ensure months are sorted chronologically, as they might come from a Set initially
    return monthlyTransactions.map(mt => mt.year_month).sort((a, b) => a.localeCompare(b));
  }, [monthlyTransactions]);

  const pivotedTableData = useMemo(() => {
    if (!monthlyTransactions || monthlyTransactions.length === 0 || columnMonths.length === 0) return [];
    
    const dataMap = new Map<string, MonthlyTransaction>();
    monthlyTransactions.forEach(mt => dataMap.set(mt.year_month, mt));

    return transactionRowLabels.map(rowType => {
      const row: { [key: string]: string | number } = { transactionType: rowType.label };
      let totalForRow = 0;
      columnMonths.forEach(month => {
        const monthData = dataMap.get(month);
        const value = monthData ? monthData[rowType.key as keyof MonthlyTransaction] as number : 0;
        row[month] = value;
        // Only sum transaction types for the 'Total' column, not month-end valuations
        if (rowType.key !== 'valuation') { 
          totalForRow += value;
        }
      });
      // For the 'Valuation' row, the 'Total' column should reflect the latest portfolio valuation summary.
      // It should NOT be a sum of all monthly valuations.
      row['total'] = rowType.key === 'valuation' ? (totalValuation ?? 0) : totalForRow;
      return row;
    });
  }, [monthlyTransactions, columnMonths, transactionRowLabels, totalValuation]); // Added totalValuation dependency

  // Add format function for risk display
  const formatRiskFallback = (risk: number | undefined): string => {
    if (risk === undefined || risk === null) return '-';
    // Round to 1 decimal place if not a whole number
    const rounded = Math.round(risk * 10) / 10;
    return rounded % 1 === 0 ? rounded.toString() : rounded.toFixed(1);
  };

  // Toggle function for Previous Funds expansion
  const togglePreviousFundsExpansion = (productId: number) => {
    setExpandedPreviousFunds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  const toggleInactiveProductDetails = (productId: number) => {
    setShowInactiveProductDetails(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  // Helper function to generate report title information
  const getReportTitleInfo = () => {
    // Get time period
    const timePeriod = (() => {
      if (earliestTransactionDate && selectedValuationDate) {
        const startDate = formatDateFallback(earliestTransactionDate);
        const endDate = formatDateFallback(selectedValuationDate);
        return `${startDate} to ${endDate}`;
      } else if (selectedValuationDate) {
        return `Period ending ${formatDateFallback(selectedValuationDate)}`;
      } else {
        return 'Current Period';
      }
    })();

    // Get unique product owner names from the generated report
    const productOwnerNames = (() => {
      console.log('🔍 [TITLE INFO PRODUCT OWNER DEBUG] Raw product owner names:', productSummaries.map(p => ({ 
        id: p.id, 
        name: p.product_name, 
        owner: p.product_owner_name,
        ownerType: typeof p.product_owner_name 
      })));
      
      const allNames = productSummaries
        .map(product => product.product_owner_name)
        .filter(name => name && name.trim() !== '');
      
      console.log('🔍 [TITLE INFO PRODUCT OWNER DEBUG] Filtered names:', allNames);
      
      const splitNames = allNames
        .flatMap(name => name ? name.split(/[,&]/).map(n => n.trim()) : [])
        .filter(name => name !== '');
      
      console.log('🔍 [TITLE INFO PRODUCT OWNER DEBUG] After splitting:', splitNames);
      
      const uniqueNames = Array.from(new Set(splitNames)).sort();
      
      console.log('🔍 [TITLE INFO PRODUCT OWNER DEBUG] Final unique names:', uniqueNames);
      
      return uniqueNames;
    })();

    return {
      timePeriod,
      productOwnerNames
    };
  };

  // Helper functions for IRR date selection
  const getAvailableDatesForProduct = (productId: number): Array<{value: string, label: string}> => {
    return availableIRRDates
      .filter(date => date.productIds.includes(productId))
      .map(date => ({
        value: date.date,
        label: date.label
      }));
  };

  const handleProductIRRDatesChange = (productId: number, selectedDates: (string | number)[]) => {
    setSelectedIRRDates(prev => ({
      ...prev,
      [productId]: selectedDates.map(d => String(d))
    }));
  };

  const selectCommonDates = () => {
    // Find dates available across ALL included products (not excluded)
    const includedProducts = relatedProducts.filter(product => !excludedProductIds.has(product.id));
    const allProductIds = includedProducts.map(p => p.id);
    const commonDates = availableIRRDates.filter(date => 
      allProductIds.every(productId => date.productIds.includes(productId))
    );
    
    // Select up to 3 most recent common dates for all included products
    const selectedCommonDates = commonDates.slice(0, 3).map(d => d.date);
    
    const newSelections: ProductIRRSelections = {};
    allProductIds.forEach(productId => {
      newSelections[productId] = selectedCommonDates;
    });
    
    setSelectedIRRDates(newSelections);
  };

  const selectRecentDatesForAll = (count: number) => {
    // Select the N most recent dates for each included product (not excluded)
    const newSelections: ProductIRRSelections = {};
    
    const includedProducts = relatedProducts.filter(product => !excludedProductIds.has(product.id));
    includedProducts.forEach(product => {
      const availableDates = getAvailableDatesForProduct(product.id);
      const recentDates = availableDates.slice(0, count).map(d => d.value);
      newSelections[product.id] = recentDates;
    });
    
    setSelectedIRRDates(newSelections);
  };

  const selectAllDatesForAll = () => {
    const newSelections: ProductIRRSelections = {};
    
    relatedProducts
      .filter(product => !excludedProductIds.has(product.id))
      .forEach(product => {
        const availableDates = getAvailableDatesForProduct(product.id)
          .map(option => option.value)
          .filter((dateStr: string) => {
            // Only select dates that are not greyed out
            const date = availableIRRDates.find(d => d.date === dateStr);
            return !date?.isGreyedOut;
          });
        newSelections[product.id] = availableDates;
      });
    
    setSelectedIRRDates(newSelections);
  };

  const clearAllDatesForAll = () => {
    const newSelections: ProductIRRSelections = {};
    
    relatedProducts
      .filter(product => !excludedProductIds.has(product.id))
      .forEach(product => {
        newSelections[product.id] = [];
      });
    
    setSelectedIRRDates(newSelections);
  };

  // New handler functions for the grid component
  const handleGridSelectionChange = (productId: number, selectedDates: string[]) => {
    setSelectedIRRDates(prev => ({
      ...prev,
      [productId]: selectedDates
    }));
  };

  const handleSelectAllForProduct = (productId: number) => {
    const availableDates = getAvailableDatesForProduct(productId)
      .map(option => option.value)
      .filter((dateStr: string) => {
        // Only select dates that are not greyed out
        const date = availableIRRDates.find(d => d.date === dateStr);
        return !date?.isGreyedOut;
      });
    
    setSelectedIRRDates(prev => ({
      ...prev,
      [productId]: availableDates
    }));
  };

  const handleClearAllForProduct = (productId: number) => {
    setSelectedIRRDates(prev => ({
      ...prev,
      [productId]: []
    }));
  };

  const handleSelectRecentForProduct = (productId: number, count: number) => {
    const availableDates = getAvailableDatesForProduct(productId)
      .map(option => option.value)
      .filter((dateStr: string) => {
        // Only select dates that are not greyed out
        const date = availableIRRDates.find(d => d.date === dateStr);
        return !date?.isGreyedOut;
      })
      .slice(0, count); // Take the most recent N dates
    
    setSelectedIRRDates(prev => ({
      ...prev,
      [productId]: availableDates
    }));
  };

  // Effect to clean up IRR date selections for excluded products
  useEffect(() => {
    if (excludedProductIds.size > 0) {
      setSelectedIRRDates(prev => {
        const cleaned = { ...prev };
        excludedProductIds.forEach(productId => {
          delete cleaned[productId];
        });
        return cleaned;
      });
    }
  }, [excludedProductIds]);

  // Effect to fetch available IRR dates when products change
  useEffect(() => {
    const fetchDates = async () => {
      // Only fetch IRR dates for products that are not excluded
      const includedProducts = relatedProducts.filter(product => !excludedProductIds.has(product.id));
      
      if (includedProducts.length > 0) {
        console.log('📊 Fetching available IRR dates for', includedProducts.length, 'products');
        const productIds = includedProducts.map(p => p.id);
        const dates = await fetchAvailableIRRDates(productIds);
        setAvailableIRRDates(dates);
        
        // Auto-select ALL available dates for each product as default
        if (dates.length > 0) {
          selectAllDatesForAll();
        }
      } else {
        // Clear IRR dates if no products are included
        setAvailableIRRDates([]);
        setSelectedIRRDates({});
      }
    };
    
    fetchDates();
  }, [relatedProducts, excludedProductIds]);

  // Effect to handle end valuation date changes and filter IRR dates
  useEffect(() => {
    if (selectedValuationDate && availableIRRDates.length > 0) {
      console.log('📅 End valuation date changed, filtering IRR dates:', selectedValuationDate);
      
      // Filter IRR dates based on the new end valuation date
      const filteredDates = getFilteredIRRDates(availableIRRDates, selectedValuationDate);
      setAvailableIRRDates(filteredDates);
      
      // Auto-update selected dates to remove any that are now greyed out
      updateSelectedDatesForNewEndDate(selectedValuationDate);
    }
  }, [selectedValuationDate]);

  return (
    <div className="mx-auto px-4 sm:px-6 lg:px-8 py-3">
      <h1 className="text-3xl font-normal text-gray-900 font-sans tracking-wide mb-6">
        Report Generator
      </h1>
      
      {/* Error display for initial load errors */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 max-w-7xl mx-auto">
              <p className="text-red-700">{error}</p>
            </div>
      )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-7xl mx-auto">
          {/* Left Side - Selection Panels */}
          <div className="bg-white shadow-sm rounded-lg border border-gray-100 p-6">
            <h2 className="text-lg font-normal text-gray-900 mb-4">Select Items for Report</h2>
            
            <div className="space-y-4">
              <MultiSelectDropdown
                label="Client Groups"
                options={clientGroups.map(group => ({
                  value: group.id,
                  label: group.name
                }))}
                values={selectedClientGroupIds}
                onChange={setSelectedClientGroupIds}
                placeholder="Search client groups..."
                searchable
              />
              
              <MultiSelectDropdown
                label="Products"
                options={products.map(product => ({
                  value: product.id,
                  label: product.product_name
                }))}
                values={selectedProductIds}
                onChange={setSelectedProductIds}
                placeholder="Search products..."
                searchable
              />
              
              {/* Add valuation date dropdown */}
              {availableValuationDates.length > 0 && (
                <div className="dropdown-container mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Valuation Date
                    <span className="text-xs text-gray-500 ml-1">(select the date for IRR calculation)</span>
                  </label>
                  <div className="relative">
                    <select
                      id="valuation-date-dropdown"
                      value={selectedValuationDate || ''}
                      onChange={(e) => setSelectedValuationDate(e.target.value || null)}
                      className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full pl-3 pr-10 py-2 text-sm border-gray-300 rounded-md appearance-none"
                      disabled={isLoadingValuationDates}
                    >
                      {availableValuationDates.map(date => (
                        <option key={date} value={date}>
                          {formatDateFallback(date)}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                      {isLoadingValuationDates ? (
                        <svg className="animate-spin h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L10 5.414 7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3z" clipRule="evenodd" />
                          <path fillRule="evenodd" d="M10 17a1 1 0 01-.707-.293l-3-3a1 1 0 011.414-1.414L10 14.586l2.293-2.293a1 1 0 011.414 1.414l-3 3A1 1 0 0110 17z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {availableValuationDates.length} valuation periods available for selected products
                  </p>
                </div>
              )}
            </div>
            
            {/* Report formatting options */}
            <div className="mt-4 p-3 bg-gray-50 rounded-lg border">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Report Formatting</h4>
              <div className="space-y-2">

                
                {/* Historical IRR Date Selection */}
                {relatedProducts.length > 0 && availableIRRDates.length > 0 && (
                  <IRRDateSelectionGrid
                    products={relatedProducts}
                    excludedProductIds={excludedProductIds}
                    availableIRRDates={availableIRRDates}
                    selectedIRRDates={selectedIRRDates}
                    onSelectionChange={handleGridSelectionChange}
                    onSelectAllForProduct={handleSelectAllForProduct}
                    onClearAllForProduct={handleClearAllForProduct}
                    onSelectRecentForProduct={handleSelectRecentForProduct}
                    onSelectAllForAllProducts={selectAllDatesForAll}
                    onClearAllForAllProducts={clearAllDatesForAll}
                  />
                )}
                
                {/* Inactive Product Detail Controls */}
                {relatedProducts.filter(product => !excludedProductIds.has(product.id) && product.status === 'inactive').length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <h5 className="text-sm font-medium text-gray-700 mb-2">Show Detailed Cards For</h5>
                    <p className="text-xs text-gray-500 mb-2">
                      Choose which inactive products to show detailed cards for (unchecked = summary table only)
                    </p>
                    <div className="space-y-1">
                      {relatedProducts
                        .filter(product => !excludedProductIds.has(product.id) && product.status === 'inactive')
                        .map(product => (
                          <label key={product.id} className="inline-flex items-center w-full">
                            <input
                              type="checkbox"
                              checked={showInactiveProductDetails.has(product.id)}
                              onChange={() => toggleInactiveProductDetails(product.id)}
                              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                            />
                            <span className="ml-2 text-sm text-gray-600">
                              {product.product_name}
                              <span className="ml-1 text-xs text-red-600">(Inactive)</span>
                            </span>
                          </label>
                        ))
                      }
                    </div>
                  </div>
                )}
              </div>
              
              {/* Previous Funds Breakdown Controls */}
              {relatedProducts.length > 0 && relatedProducts.some(product => 
                productSummaries.find(p => p.id === product.id)?.funds?.some(fund => 
                  fund.fund_name === 'Previous Funds' && fund.isVirtual && fund.inactiveFunds && fund.inactiveFunds.length > 0
                )
              ) && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Previous Funds Breakdown</h5>
                  <div className="space-y-1">
                    {relatedProducts
                      .filter(product => !excludedProductIds.has(product.id))
                      .filter(product => 
                        productSummaries.find(p => p.id === product.id)?.funds?.some(fund => 
                          fund.fund_name === 'Previous Funds' && fund.isVirtual && fund.inactiveFunds && fund.inactiveFunds.length > 0
                        )
                      )
                      .map(product => {
                        const productSummary = productSummaries.find(p => p.id === product.id);
                        const previousFund = productSummary?.funds?.find(fund => 
                          fund.fund_name === 'Previous Funds' && fund.isVirtual && fund.inactiveFunds
                        );
                        return (
                          <label key={product.id} className="inline-flex items-center w-full">
                            <input
                              type="checkbox"
                              checked={expandedPreviousFunds.has(product.id)}
                              onChange={() => togglePreviousFundsExpansion(product.id)}
                              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                            />
                            <span className="ml-2 text-sm text-gray-600">
                              {product.product_name} ({previousFund?.inactiveFunds?.length || 0} funds)
                            </span>
                          </label>
                        );
                      })
                    }
                  </div>
                </div>
              )}
              

            </div>
            
            <div className="mt-6">
              <button
                onClick={generateReport}
                disabled={isCalculating || isLoading || !hasEffectiveProductSelection || hasEndValuationDateError}
                title={
                  isCalculating ? "Report is being calculated..." :
                  isLoading ? "Data is loading..." :
                  !hasEffectiveProductSelection ? "Select at least one product to generate a report" :
                  hasEndValuationDateError ? "The end valuation date must match the latest common historical IRR date selection" :
                  "Generate Report"
                }
                className="w-full flex justify-center items-center px-6 py-3 text-base font-medium text-white bg-primary-700 hover:bg-primary-800 rounded-md shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCalculating ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Calculating...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Generate Report
                  </>
                )}
              </button>
              
              {!hasEffectiveProductSelection && !isCalculating && !isLoading && (
                <p className="mt-2 text-sm text-gray-500 text-center">
                  Select at least one product to generate a report
                </p>
              )}
              
              {hasEffectiveProductSelection && hasEndValuationDateError && !isCalculating && !isLoading && (
                <p className="mt-2 text-sm text-orange-600 text-center">
                  End valuation date must match the latest common historical IRR date selection
                </p>
              )}
            </div>
            
            {dataError && (
              <div className="mt-4 bg-red-50 border-l-4 border-red-500 p-3">
                <p className="text-sm text-red-700">{dataError}</p>
              </div>
            )}
          </div>
          
          {/* Right Side - Results Panel */}
          <div className="bg-white shadow-sm rounded-lg border border-gray-100 p-6">
            <h2 className="text-lg font-normal text-gray-900 mb-4">Report Summary</h2>
            
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Related Items</h3>
              <p className="text-xs text-gray-500 mb-2">
                This section shows all products included in your report. Click × to exclude a product or ✓ to include it.
              </p>
              <div className="border rounded-lg p-4 bg-gray-50 min-h-[100px]">
                {relatedProducts.length > 0 ? (
                  <div className="space-y-3">
                    <div>
                      <h4 className="text-xs font-medium text-gray-500 uppercase mb-1">Products</h4>
                      <div className="flex flex-wrap gap-2">
                        {relatedProducts.map(product => {
                          // Check the sources of this product
                          const isDirectlySelected = selectedProductIds.includes(product.id);
                          const sources = productSources.get(product.id) || { clientGroups: [] };
                          const hasClientGroupSource = sources.clientGroups.length > 0;
                          
                          // Check if this product is excluded
                          const isExcluded = excludedProductIds.has(product.id);
                          
                          return (
                            <span 
                              key={product.id} 
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                isExcluded 
                                  ? 'bg-gray-100 text-gray-500' 
                                  : product.status === 'inactive' 
                                    ? 'bg-orange-100 text-orange-800 border border-orange-200' 
                                    : 'bg-green-100 text-green-800'
                              } group cursor-pointer hover:opacity-80 transition-opacity`}
                              title={`${product.status === 'inactive' ? 'Inactive Product - ' : ''}Click to toggle inclusion/exclusion`}
                              onClick={(e) => {
                                e.stopPropagation();
                                const newExcludedProducts = new Set(excludedProductIds);
                                if (isExcluded) {
                                  newExcludedProducts.delete(product.id);
                                } else {
                                  newExcludedProducts.add(product.id);
                                }
                                setExcludedProductIds(newExcludedProducts);
                              }}
                            >
                              {product.product_name}
                              {product.status === 'inactive' && (
                                <span className="ml-1 text-orange-600 font-bold" title="Inactive Product">⚠</span>
                              )}
                              {/* Show small indicators of source */}
                              {isDirectlySelected && (
                                <span className={`ml-1 ${isExcluded ? 'text-gray-400' : 'text-green-600'} text-xs`} title="Directly selected">•</span>
                              )}
                              {hasClientGroupSource && (
                                <span className={`ml-1 ${isExcluded ? 'text-gray-400' : 'text-purple-600'} text-xs`} title="From client group">◆</span>
                              )}
                              <span 
                                onClick={(e) => {
                                  e.stopPropagation();
                                }}
                                className={`ml-1.5 ${isExcluded ? 'text-gray-400 hover:text-gray-600' : 'text-green-400 hover:text-green-600'} focus:outline-none`}
                                aria-label={isExcluded ? `Include ${product.product_name}` : `Exclude ${product.product_name}`}
                                title={isExcluded ? "Include product" : "Exclude product"}
                              >
                                {isExcluded ? (
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                  </svg>
                                ) : (
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </span>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-500">
                      Select client groups or products above to see them here.
                    </p>
                  </div>
                )}
              </div>
              
              <div className="mt-2 flex flex-wrap text-xs text-gray-500 gap-x-3">
                <span className="flex items-center">
                  <span className="mr-1 text-green-600">•</span> Direct selection
                </span>
                <span className="flex items-center">
                  <span className="mr-1 text-purple-600">◆</span> From client group
                </span>
                <span className="flex items-center">
                  <span className="mr-1 text-orange-600 font-bold">⚠</span> Inactive product
                </span>
                <span className="ml-auto italic">Hover for details</span>
              </div>
            </div>
            
            {/* Common Valuation Dates Status */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Valuation Data Status</h3>
              <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg border">
                <div className="flex items-center">
                  {availableValuationDates.length > 0 || availableValuationDates.includes('inactive-products-valid') ? (
                    <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">
                    {availableValuationDates.length > 0 && !availableValuationDates.includes('inactive-products-valid') ? (
                      // Check if we have inactive products mixed with active products
                      relatedProducts.some(p => p.status === 'inactive') ? (
                        <>Common valuation dates available (inactive products assume zero)</>
                      ) : (
                      <>All portfolio funds have common valuation dates</>
                      )
                    ) : availableValuationDates.includes('inactive-products-valid') ? (
                      <>Inactive products detected - zero valuations will be assumed</>
                    ) : relatedProducts.length > 0 ? (
                      <>Portfolio funds do not share common valuation dates</>
                    ) : (
                      <>No products selected</>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {isLoadingValuationDates ? (
                      <>Checking valuation data...</>
                    ) : availableValuationDates.includes('inactive-products-valid') ? (
                      <>Report generation is available for inactive products</>
                    ) : availableValuationDates.length > 0 ? (
                      relatedProducts.some(p => p.status === 'inactive') ? (
                        <>{availableValuationDates.length} common period{availableValuationDates.length !== 1 ? 's' : ''} - inactive products will use zero valuations</>
                      ) : (
                      <>{availableValuationDates.length} common valuation period{availableValuationDates.length !== 1 ? 's' : ''} available</>
                      )
                    ) : relatedProducts.length > 0 ? (
                      <>Date selection will use latest available valuations for each fund</>
                    ) : (
                      <>Select products to check valuation data availability</>
                    )}
                  </div>
                </div>
                {isLoadingValuationDates && (
                  <svg className="animate-spin h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
              </div>
            </div>
            

          </div>
        </div>
      
      {/* Product Period Summary Tables */}
      {productSummaries.length > 0 && (
        <div className="mt-8 w-full">
          {/* Report Title */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Report Summary
            </h1>
            <div className="text-lg text-gray-700 mb-1">
              {getReportTitleInfo().timePeriod}
            </div>
            {getReportTitleInfo().productOwnerNames.length > 0 && (
              <div className="text-md text-gray-600">
                {getReportTitleInfo().productOwnerNames.join(', ')}
              </div>
            )}
          </div>
          
          <h2 className="text-2xl font-normal text-gray-900 font-sans tracking-wide mb-4">
            Product Period Overview
          </h2>
          
          {productSummaries
            .filter(product => {
              // For inactive products, only show if checkbox is checked
              if (product.status === 'inactive') {
                return showInactiveProductDetails.has(product.id);
              }
              // For active products, always show
              return true;
            })
            .map(product => (
            <div key={product.id} className={`mb-8 bg-white shadow-sm rounded-lg border border-gray-200 p-6 w-full min-w-0 ${product.status === 'inactive' ? 'opacity-60 bg-gray-50' : ''}`}>
              <div className="flex items-center gap-3 mb-4">
                {product.provider_theme_color && (
                  <div 
                    className="w-4 h-4 rounded-full" 
                    style={{ backgroundColor: product.provider_theme_color }}
                  />
                )}
                <h3 className={`text-xl font-semibold ${product.status === 'inactive' ? 'text-gray-600' : 'text-gray-800'}`}>
                  {[product.product_type, product.provider_name, product.product_owner_name].filter(Boolean).join(' - ')}
                  {product.status === 'inactive' && (
                    <span className="ml-2 text-sm text-red-600 font-medium">(Inactive)</span>
                  )}
                </h3>
              </div>
              

              
                        <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-100">
                <tr>
                      <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                        Fund Name
                  </th>
                      <th scope="col" className="px-4 py-3 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider">
                        Investment
                    </th>
                    <th scope="col" className="px-4 py-3 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider">
                      Tax Uplift
                      </th>
                    <th scope="col" className="px-4 py-3 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider">
                      Product Switch In
                        </th>
                    <th scope="col" className="px-4 py-3 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider">
                      All Fund Switches
                          </th>
                    <th scope="col" className="px-4 py-3 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider">
                      Product Switch Out
                          </th>
                      <th scope="col" className="px-4 py-3 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider">
                        Withdrawal
                      </th>
                    <th scope="col" className="px-4 py-3 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider bg-green-100">
                        Valuation
                      </th>
                    <th scope="col" className="px-4 py-3 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider bg-blue-100">
                      Profit Made
                      </th>
                    <th scope="col" className="px-4 py-3 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider bg-purple-100">
                      Average Returns p.a.
                      </th>
                      <th scope="col" className="px-4 py-3 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider">
                        Risk
                        </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                    {product.funds && product.funds.length > 0 ? (
                      product.funds.map(fund => (
                        <tr 
                          key={fund.id} 
                          className={`hover:bg-blue-50 ${fund.isVirtual ? 'bg-gray-100 font-medium' : ''}`}
                        >
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-800 text-left">
                            {fund.fund_name}
                            {fund.isVirtual && fund.inactiveFundCount && (
                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-800">
                                {fund.inactiveFundCount} {fund.inactiveFundCount === 1 ? 'fund' : 'funds'}
                              </span>
                            )}
                      </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                            {formatCurrencyWithTruncation(fund.total_investment)}
                        </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                            {formatCurrencyWithTruncation(0)} {/* Tax uplift - placeholder for now */}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                            {formatCurrencyWithTruncation(0)} {/* Product switch in - placeholder for now */}
                            </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                            {formatCurrencyWithTruncation((fund.total_fund_switch_out + fund.total_product_switch_out) - (fund.total_fund_switch_in + fund.total_product_switch_in))}
                              </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                            {formatCurrencyWithTruncation(0)} {/* Product switch out - placeholder for now */}
                              </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                            {formatWithdrawalAmount(fund.total_withdrawal)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-primary-700 text-center bg-green-50">
                            {formatCurrencyWithTruncation(fund.current_valuation)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-center bg-blue-50">
                            {(() => {
                              // Calculate profit: (valuation + withdrawals + product switch outs + fund switch outs) - (investments + fund switch ins + tax uplift + product switch ins)
                              const gains = fund.current_valuation + fund.total_withdrawal + 0 + fund.total_fund_switch_out; // product switch out is 0 for now
                              const costs = fund.total_investment + fund.total_fund_switch_in + fund.total_product_switch_in + 0; // tax uplift is 0 for now
                              const profit = gains - costs;
                              return (
                                <span className={profit >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                                  {formatCurrencyWithTruncation(profit)}
                                </span>
                              );
                            })()}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-center bg-purple-50">
                            {fund.isVirtual && fund.fund_name !== 'Previous Funds' ? (
                              <span className="text-gray-500">-</span>
                            ) : fund.irr !== null ? (
                              <span className={fund.irr >= 0 ? 'text-green-600' : 'text-red-600'}>
                                {formatFundIrr(fund.irr)}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                            {fund.isVirtual && fund.fund_name !== 'Previous Funds' ? (
                              <span className="text-gray-500">-</span>
                            ) : fund.risk_factor !== undefined && fund.risk_factor !== null ? (
                              <span className="text-xs font-medium">
                                {formatRiskFallback(fund.risk_factor)}
                                </span>
                              ) : (
                              <span className="text-gray-500">-</span>
                              )}
                            </td>
                    </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={11} className="px-4 py-4 text-center text-sm text-gray-500">
                          No fund data available
                        </td>
                      </tr>
                    )}
                    
                    {/* Expanded Individual Inactive Funds Breakdown */}
                    {expandedPreviousFunds.has(product.id) && product.funds && (
                      product.funds
                        .filter(fund => fund.fund_name === 'Previous Funds' && fund.isVirtual && fund.inactiveFunds)
                        .flatMap(previousFundsEntry => 
                          previousFundsEntry.inactiveFunds!.map((inactiveFund) => (
                            <tr key={`inactive-${inactiveFund.id}`} className="bg-blue-50 border-l-4 border-blue-300">
                              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-700 text-left">
                                <div className="flex items-center">
                                  <div className="ml-8 text-sm text-gray-700">
                                    ↳ {inactiveFund.fund_name}
                                    <span className="ml-2 text-xs text-red-600">(Inactive)</span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-gray-700">
                                {formatCurrencyWithTruncation(inactiveFund.total_investment)}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-gray-700">
                                {formatCurrencyWithTruncation(0)} {/* Tax uplift - placeholder for inactive funds */}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-gray-700">
                                {formatCurrencyWithTruncation(0)} {/* Product switch in - placeholder for inactive funds */}
                                </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-gray-700">
                                {formatCurrencyWithTruncation((inactiveFund.total_fund_switch_out + inactiveFund.total_product_switch_out) - (inactiveFund.total_fund_switch_in + inactiveFund.total_product_switch_in))}
                                  </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-gray-700">
                                {formatCurrencyWithTruncation(0)} {/* Product switch out - placeholder for inactive funds */}
                                  </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-gray-700">
                                {formatWithdrawalAmount(inactiveFund.total_withdrawal)}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-gray-700 bg-green-50">
                                {formatCurrencyWithTruncation(0)} {/* Inactive funds have £0 current valuation */}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-gray-700 bg-blue-50">
                                {(() => {
                                  // Calculate profit for inactive funds: (valuation + withdrawals + product switch outs + fund switch outs) - (investments + fund switch ins + tax uplift + product switch ins)
                                  const gains = 0 + inactiveFund.total_withdrawal + 0 + (inactiveFund.total_fund_switch_out + inactiveFund.total_product_switch_out); // valuation is 0 for inactive funds
                                  const costs = inactiveFund.total_investment + inactiveFund.total_fund_switch_in + inactiveFund.total_product_switch_in + 0; // tax uplift is 0 for now
                                  const profit = gains - costs;
                                  return (
                                    <span className={profit >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                                      {formatCurrencyWithTruncation(profit)}
                                    </span>
                                  );
                                })()}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-gray-700 bg-purple-50">
                                {inactiveFund.irr !== null ? (
                                  <span className={inactiveFund.irr >= 0 ? 'text-green-600' : 'text-red-600'}>
                                    {formatFundIrr(inactiveFund.irr)}
                                  </span>
                                ) : (
                                  <span className="text-gray-500">-</span>
                                )}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                                {inactiveFund.risk_factor !== undefined && inactiveFund.risk_factor !== null ? (
                                  <span className="text-xs font-medium">
                                    {formatRiskFallback(inactiveFund.risk_factor)}
                                    </span>
                                  ) : (
                                  <span className="text-gray-500">-</span>
                                  )}
                                </td>
                            </tr>
                          ))
                        )
                    )}
                    
                    {/* Product Total Row */}
                    <tr className="bg-gray-100 font-semibold border-t-2 border-gray-400">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800 text-left">
                        PRODUCT TOTAL
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                        {formatCurrencyWithTruncation(product.total_investment)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                        {formatCurrencyWithTruncation(0)} {/* Tax uplift total - placeholder for now */}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                        {formatCurrencyWithTruncation(0)} {/* Product switch in total - placeholder for now */}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                        {formatCurrencyWithTruncation((product.total_fund_switch_out + product.total_product_switch_out) - (product.total_fund_switch_in + product.total_product_switch_in))}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                        {formatCurrencyWithTruncation(0)} {/* Product switch out total - placeholder for now */}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                        {formatWithdrawalAmount(product.total_withdrawal)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-primary-700 text-center bg-green-50">
                        {formatCurrencyWithTruncation(product.current_valuation)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-center bg-blue-50">
                        {(() => {
                          // Calculate profit for product total: (valuation + withdrawals + product switch outs + fund switch outs) - (investments + fund switch ins + tax uplift + product switch ins)
                          const gains = product.current_valuation + product.total_withdrawal + 0 + (product.total_fund_switch_out + product.total_product_switch_out); // product switch out is 0 for now
                          const costs = product.total_investment + (product.total_fund_switch_in + product.total_product_switch_in) + 0 + 0; // tax uplift and product switch in are 0 for now
                          const profit = gains - costs;
                          return (
                            <span className={profit >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                              {formatCurrencyWithTruncation(profit)}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-center bg-purple-50">
                        {product.irr !== null ? (
                          <span className={product.irr >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {formatIrrWithPrecision(product.irr)}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                        {product.weighted_risk !== undefined && product.weighted_risk !== null ? (
                          <span className="text-xs font-medium">
                            {formatWeightedRisk(product.weighted_risk)}
                          </span>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>
                    </tr>
              </tbody>
            </table>
          </div>

            </div>
          ))}
          
          {/* Portfolio Total Summary - moved to bottom */}
          <div className="mt-8 bg-white shadow-sm rounded-lg border border-gray-200 p-6 w-full min-w-0">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Portfolio Total Summary</h3>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-100">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                      Product
                    </th>
                    <th scope="col" className="px-4 py-3 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider">
                      Investment
                    </th>
                    <th scope="col" className="px-4 py-3 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider">
                      Tax Uplift
                    </th>
                    <th scope="col" className="px-4 py-3 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider">
                      Product Switch In
                    </th>
                    <th scope="col" className="px-4 py-3 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider">
                      All Fund Switches
                    </th>
                    <th scope="col" className="px-4 py-3 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider">
                      Product Switch Out
                    </th>
                    <th scope="col" className="px-4 py-3 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider">
                      Withdrawal
                    </th>
                    <th scope="col" className="px-4 py-3 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider bg-green-100">
                      Valuation
                    </th>
                    <th scope="col" className="px-4 py-3 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider bg-blue-100">
                      Profit Made
                    </th>
                    <th scope="col" className="px-4 py-3 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider bg-purple-100">
                      Average Returns p.a.
                    </th>
                    <th scope="col" className="px-4 py-3 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider">
                      Risk
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {/* Individual product rows */}
                  {productSummaries.map(product => {
                    // Calculate weighted risk factor for the product
                    let weightedRisk = 0;
                    let totalWeightedValue = 0;
                    
                    if (product.funds && product.funds.length > 0 && product.current_valuation > 0) {
                      // Only include active funds with risk factors
                      const activeFundsWithRisk = product.funds.filter(
                        fund => !fund.isVirtual && fund.risk_factor !== undefined && fund.current_valuation > 0
                      );
                      
                      if (activeFundsWithRisk.length > 0) {
                        // Calculate total value of funds with risk factors
                        const totalValueWithRisk = activeFundsWithRisk.reduce(
                          (sum, fund) => sum + fund.current_valuation, 0
                        );
                        
                        // Calculate weighted risk
                        if (totalValueWithRisk > 0) {
                          weightedRisk = activeFundsWithRisk.reduce(
                            (sum, fund) => sum + (fund.risk_factor || 0) * (fund.current_valuation / totalValueWithRisk), 
                            0
                          );
                          totalWeightedValue = totalValueWithRisk;
                        }
                      }
                    }
                    
                    return (
                    <tr key={product.id} className={`hover:bg-blue-50 ${product.status === 'inactive' ? 'opacity-50 bg-gray-50' : ''}`}>
                    <td className={`px-4 py-3 whitespace-nowrap text-sm text-left ${product.status === 'inactive' ? 'text-gray-500' : 'text-gray-800'}`}>
                        <div className="flex items-center gap-2">
                          {product.provider_theme_color && (
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: product.provider_theme_color }}
                            />
                          )}
                          {[product.product_type, product.provider_name, product.product_owner_name].filter(Boolean).join(' - ')}
                          {product.status === 'inactive' && (
                            <span className="ml-2 text-xs text-red-600 font-medium">(Inactive)</span>
                          )}
                        </div>
                    </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                        {formatCurrencyWithTruncation(product.total_investment)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                        {formatCurrencyWithTruncation(0)} {/* Tax uplift - placeholder for now */}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                        {formatCurrencyWithTruncation(0)} {/* Product switch in - placeholder for now */}
                        </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                        {formatCurrencyWithTruncation(product.total_fund_switch_out - product.total_fund_switch_in)}
                          </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                        {formatCurrencyWithTruncation(0)} {/* Product switch out - placeholder for now */}
                          </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                        {formatWithdrawalAmount(product.total_withdrawal)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-primary-700 text-center bg-green-50">
                        {formatCurrencyWithTruncation(product.current_valuation)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-center bg-blue-50">
                        {(() => {
                          // Calculate profit for portfolio summary: (valuation + withdrawals + product switch outs + fund switch outs) - (investments + fund switch ins + tax uplift + product switch ins)
                          const gains = product.current_valuation + product.total_withdrawal + 0 + (product.total_fund_switch_out + product.total_product_switch_out); // product switch out is 0 for now
                          const costs = product.total_investment + (product.total_fund_switch_in + product.total_product_switch_in) + 0 + 0; // tax uplift and product switch in are 0 for now
                          const profit = gains - costs;
                          return (
                            <span className={profit >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                              {formatCurrencyWithTruncation(profit)}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-center bg-purple-50">
                        {product.irr !== null ? (
                          <span className={product.irr >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {formatIrrWithPrecision(product.irr)}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                        {totalWeightedValue > 0 ? (
                          <span className="px-2 py-1 text-xs font-medium rounded bg-gray-100">
                            {formatWeightedRisk(weightedRisk)}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                        </td>
                    </tr>
                    );
                  })}
                  
                                    {/* Grand total row */}
                  <tr className="bg-gray-100 font-semibold border-t-2 border-gray-400">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800 text-left">
                      PORTFOLIO TOTAL ({productSummaries.length} {productSummaries.length === 1 ? 'Product' : 'Products'})
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                      {formatCurrencyWithTruncation(productSummaries.reduce((sum, product) => sum + product.total_investment, 0))}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                      {formatCurrencyWithTruncation(0)} {/* Tax uplift total - placeholder for now */}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                      {formatCurrencyWithTruncation(0)} {/* Product switch in total - placeholder for now */}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                      {formatCurrencyWithTruncation(productSummaries.reduce((sum, product) => sum + (product.total_fund_switch_out - product.total_fund_switch_in), 0))}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                      {formatCurrencyWithTruncation(0)} {/* Product switch out total - placeholder for now */}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                      {formatWithdrawalAmount(productSummaries.reduce((sum, product) => sum + product.total_withdrawal, 0))}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-primary-700 text-center bg-green-50">
                      {formatCurrencyWithTruncation(productSummaries.reduce((sum, product) => sum + product.current_valuation, 0))}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-center bg-blue-50">
                      {(() => {
                        // Calculate total portfolio profit: (valuation + withdrawals + product switch outs + fund switch outs) - (investments + fund switch ins + tax uplift + product switch ins)
                        const totalGains = productSummaries.reduce((sum, product) => sum + product.current_valuation + product.total_withdrawal + 0 + (product.total_fund_switch_out + product.total_product_switch_out), 0); // product switch out is 0 for now
                        const totalCosts = productSummaries.reduce((sum, product) => sum + product.total_investment + (product.total_fund_switch_in + product.total_product_switch_in) + 0 + 0, 0); // tax uplift and product switch in are 0 for now
                        const totalProfit = totalGains - totalCosts;
                        return (
                          <span className={totalProfit >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                            {formatCurrencyWithTruncation(totalProfit)}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-center bg-purple-50">
                      {totalIRR !== null ? (
                        <span className={totalIRR >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {formatIrrWithPrecision(totalIRR)}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                      {(() => {
                        // Calculate portfolio-wide weighted risk factor
                        let portfolioWeightedRisk = 0;
                        let portfolioTotalValueWithRisk = 0;
                        
                        // Go through all products and their funds
                        productSummaries.forEach(product => {
                          if (product.funds && product.funds.length > 0) {
                            // Only include active funds with risk factors
                            const activeFundsWithRisk = product.funds.filter(
                              fund => !fund.isVirtual && fund.risk_factor !== undefined && fund.current_valuation > 0
                            );
                            
                            activeFundsWithRisk.forEach(fund => {
                              portfolioTotalValueWithRisk += fund.current_valuation;
                              portfolioWeightedRisk += (fund.risk_factor || 0) * fund.current_valuation;
                            });
                          }
                        });
                        
                        if (portfolioTotalValueWithRisk > 0) {
                          const finalWeightedRisk = portfolioWeightedRisk / portfolioTotalValueWithRisk;
                          return (
                            <span className="px-2 py-1 text-xs font-medium rounded bg-gray-200">
                              {formatWeightedRisk(finalWeightedRisk)}
                            </span>
                          );
                        }
                        return <span className="text-gray-400">-</span>;
                      })()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      
      {isCalculating && (
        <div className="mt-6 flex justify-center">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-700"></div>
            <span className="text-gray-700">Generating your report...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportGenerator;
