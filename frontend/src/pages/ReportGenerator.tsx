import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { MultiSelectSearchableDropdown } from '../components/ui/SearchableDropdown';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import { calculateStandardizedMultipleFundsIRR, getLatestFundIRRs } from '../services/api';
import { createIRRDataService } from '../services/irrDataService';
import { createValuationDataService } from '../services/valuationDataService';
import { createPortfolioFundsService } from '../services/portfolioFundsService';
import { formatDateFallback, formatCurrencyFallback, formatPercentageFallback } from '../components/reports/shared/ReportFormatters';
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
  name: string;
  type?: string;
}

interface Product {
  id: number;
  product_name: string;
  product_type?: string;
  product_owner_name?: string;
  product_owners?: Array<{ id: number; name: string; }>;
  client_id: number;
  provider_id?: number;
  provider_name?: string;
  provider_theme_color?: string;
  portfolio_id?: number;
  status: string;
  total_value?: number;
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
  total_switch_in: number;
  total_switch_out: number;
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
  total_withdrawal: number;
  total_switch_in: number;
  total_switch_out: number;
  net_flow: number;
  current_valuation: number;
  irr: number | null;
  provider_name?: string;
  provider_theme_color?: string;
  funds?: FundSummary[]; // Add funds array to store individual fund data
  weighted_risk?: number; // Weighted risk based on fund valuations and risk factors
  status?: string; // Product status to determine if it should be greyed out
}

// New interface for fund-level summary data
interface FundSummary {
  id: number;
  available_funds_id: number;
  fund_name: string;
  total_investment: number;
  total_withdrawal: number;
  total_switch_in: number;
  total_switch_out: number;
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

// Main component
const ReportGenerator: React.FC = () => {
  const { api } = useAuth();
  
  // Initialize optimized services
  const irrDataService = useMemo(() => createIRRDataService(api), [api]);
  const valuationService = useMemo(() => createValuationDataService(api), [api]);
  const portfolioFundsService = useMemo(() => createPortfolioFundsService(api), [api]);
  
  // State for data
  const [clientGroups, setClientGroups] = useState<ClientGroup[]>([]);
  const [productOwners, setProductOwners] = useState<ProductOwner[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  
  // State for selections
  const [selectedClientGroupIds, setSelectedClientGroupIds] = useState<(string | number)[]>([]);
  const [selectedProductOwnerIds, setSelectedProductOwnerIds] = useState<(string | number)[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<(string | number)[]>([]);
  
  // New state for valuation date selection
  const [availableValuationDates, setAvailableValuationDates] = useState<string[]>([]);
  const [selectedValuationDate, setSelectedValuationDate] = useState<string | null>(null);
  const [isLoadingValuationDates, setIsLoadingValuationDates] = useState<boolean>(false);
  
  // State for results
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [displayedProductOwners, setDisplayedProductOwners] = useState<ProductOwner[]>([]);
  const [totalValuation, setTotalValuation] = useState<number | null>(null);
  const [totalIRR, setTotalIRR] = useState<number | null>(null);
  const [valuationDate, setValuationDate] = useState<string | null>(null);
  const [earliestTransactionDate, setEarliestTransactionDate] = useState<string | null>(null);
  const [monthlyTransactions, setMonthlyTransactions] = useState<MonthlyTransaction[]>([]);
  
  // New state for product-specific period summaries
  const [productSummaries, setProductSummaries] = useState<ProductPeriodSummary[]>([]);

  // New state to track which product owners come from which client groups
  const [productOwnerToClientGroup, setProductOwnerToClientGroup] = useState<Map<number, number[]>>(new Map());

  // New state to track which products come from which sources (client groups or product owners)
  const [productSources, setProductSources] = useState<Map<number, { clientGroups: number[], productOwners: number[] }>>(new Map());

  // States for excluded items (items that won't be included in the report)
  const [excludedProductIds, setExcludedProductIds] = useState<Set<number>>(new Set());
  const [excludedProductOwnerIds, setExcludedProductOwnerIds] = useState<Set<number>>(new Set());

  // State to track products excluded because their product owner is excluded
  const [cascadeExcludedProductIds, setCascadeExcludedProductIds] = useState<Map<number, number[]>>(new Map());

  // State to track product owner to products relationship
  const [productOwnerToProducts, setProductOwnerToProducts] = useState<Map<number, number[]>>(new Map());

// Formatters now imported from shared components to eliminate duplication

  // Custom formatter that respects truncation setting
  const formatCurrencyWithTruncation = (amount: number | null | undefined): string => {
    if (amount === null || amount === undefined) return '£0';
    
    if (truncateAmounts) {
      return `£${Math.trunc(amount).toLocaleString()}`;
    }
    
    return formatCurrencyFallback(amount);
  };

  // Custom IRR formatter that respects precision setting
  const formatIrrWithPrecision = (irr: number | null | undefined): string => {
    if (irr === null || irr === undefined) return '-';
    
    if (roundIrrToOne) {
      return `${irr.toFixed(1)}%`;
    }
    
    return formatPercentageFallback(irr);
  };

  // Custom withdrawal formatter that respects negative formatting setting
  const formatWithdrawalAmount = (amount: number | null | undefined): string => {
    if (amount === null || amount === undefined) return '-';
    // Don't add minus sign for zero amounts
    if (amount === 0) return formatCurrencyWithTruncation(amount);
    const displayAmount = formatWithdrawalsAsNegative ? -Math.abs(amount) : amount;
    return formatCurrencyWithTruncation(displayAmount);
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
  const [truncateAmounts, setTruncateAmounts] = useState(false);
  const [roundIrrToOne, setRoundIrrToOne] = useState(false);
  const [formatWithdrawalsAsNegative, setFormatWithdrawalsAsNegative] = useState(false);
  const [combineFundSwitches, setCombineFundSwitches] = useState(false);
  
  // State for Previous Funds expansion (per product)
  const [expandedPreviousFunds, setExpandedPreviousFunds] = useState<Set<number>>(new Set());
  
  // State for inactive product detailed view control
  const [showInactiveProductDetails, setShowInactiveProductDetails] = useState<Set<number>>(new Set());
  

  
  // Fetch initial data
  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      try {
        const [
          clientGroupsRes,
          allProductsRes,
          actualProductOwnersRes
        ] = await Promise.all([
          api.get('/client_groups'),
          api.get('/client_products'),
          api.get('/product_owners')
        ]);
        
        setClientGroups(clientGroupsRes.data || []);
        setProducts(allProductsRes.data || []);
        
        if (actualProductOwnersRes && actualProductOwnersRes.data) {
          setProductOwners(actualProductOwnersRes.data.map((owner: any) => ({
            id: owner.id,
            name: owner.name,
          })) || []);
        } else {
          setProductOwners([]);
        }
        
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
  
  // useEffect to update Product Owners displayed in "Related Items"
  useEffect(() => {
    const updateDisplayedOwners = async () => {
      try {
        let ownersToDisplay: ProductOwner[] = [];
        const ownerIdSet = new Set<number>();
        // Create a new map for tracking
        const ownerToClientGroupMap = new Map<number, number[]>();

        // Add directly selected product owners
        if (selectedProductOwnerIds.length > 0) {
          selectedProductOwnerIds.forEach(spo => {
            const fullOwner = productOwners.find(po => po.id === Number(spo));
            if (fullOwner && !ownerIdSet.has(fullOwner.id)) {
              ownersToDisplay.push(fullOwner);
              ownerIdSet.add(fullOwner.id);
              // These are directly selected, so no client group association
              ownerToClientGroupMap.set(fullOwner.id, []);
            }
          });
        }

        // Add product owners related to selected client groups
        if (selectedClientGroupIds.length > 0) {
          for (const scg of selectedClientGroupIds) {
            try {
              // ISSUE FIX: Using the wrong endpoint - the /client_group_product_owners endpoint only returns the junction records
              // The client_group_product_owners endpoint returns junction table records with product_owner_id, not the actual product owners
              
              // First, fetch all associated product owner IDs for this client group
              const associationsResponse = await api.get(`/client_group_product_owners?client_group_id=${Number(scg)}`);
              console.log(`Client Group ${scg} product owner associations:`, associationsResponse.data);
              
              // Check if there are any associations
              if (associationsResponse.data && associationsResponse.data.length > 0) {
                // Extract the product owner IDs from the associations
                const ownerIds = associationsResponse.data.map((assoc: any) => assoc.product_owner_id);
                console.log(`Client Group ${scg} associated product owner IDs:`, ownerIds);
                
                // Fetch details for each product owner
                for (const ownerId of ownerIds) {
                  if (!ownerIdSet.has(ownerId)) {
                    // Look for the owner in existing productOwners array first (to avoid extra API calls)
                    let owner = productOwners.find(po => po.id === ownerId);
                    
                    // If not found in our local cache, fetch the details from API
                    if (!owner) {
                      try {
                        const ownerResponse = await api.get(`/product_owners/${ownerId}`);
                        console.log(`Fetched product owner ${ownerId} details:`, ownerResponse.data);
                        if (ownerResponse.data) {
                          owner = ownerResponse.data;
                        }
                      } catch (err) {
                        console.error(`Failed to fetch product owner ${ownerId} details:`, err);
                        continue; // Skip this owner if we can't fetch details
                      }
                    }
                    
                    if (owner) {
                      ownersToDisplay.push(owner);
                      ownerIdSet.add(ownerId);
                      // Associate this owner with this client group
                      if (!ownerToClientGroupMap.has(ownerId)) {
                        ownerToClientGroupMap.set(ownerId, [Number(scg)]);
                      } else {
                        ownerToClientGroupMap.get(ownerId)?.push(Number(scg));
                      }
                    }
                  } else {
                    // Owner already in set, just update its client group associations
                    if (!ownerToClientGroupMap.has(ownerId)) {
                      ownerToClientGroupMap.set(ownerId, [Number(scg)]);
                    } else {
                      ownerToClientGroupMap.get(ownerId)?.push(Number(scg));
                    }
                  }
                }
              } else {
                console.log(`No product owners associated with client group ${scg}`);
              }
            } catch (err) {
              console.error(`Failed to fetch product owners for client group ${Number(scg)}:`, err);
            }
          }
        }

        // Add product owners related to selected products
        if (selectedProductIds.length > 0) {
          for (const productId of selectedProductIds) {
            try {
              // Find the product's product owner if available
              const product = products.find(p => p.id === Number(productId));
              if (product && product.provider_id) {
                const providerId = product.provider_id;

                // Skip if this owner is already in our set
                if (ownerIdSet.has(providerId)) continue;

                // Look for the provider in existing productOwners array
                let owner = productOwners.find(po => po.id === providerId);
                
                // If not found, fetch the full owner details
                if (!owner) {
                  try {
                    const ownerResponse = await api.get(`/product_owners/${providerId}`);
                    if (ownerResponse.data) {
                      owner = ownerResponse.data;
                    }
                  } catch (err) {
                    console.error(`Failed to fetch product owner ${providerId} details:`, err);
                  }
                }
                
                if (owner) {
                  ownersToDisplay.push(owner);
                  ownerIdSet.add(providerId);
                  // This owner is associated with products, not client groups
                  ownerToClientGroupMap.set(providerId, []);
                }
              }
            } catch (err) {
              console.error(`Failed to fetch product owner for product ${Number(productId)}:`, err);
            }
          }
        }
        
        setDisplayedProductOwners(ownersToDisplay);
        setProductOwnerToClientGroup(ownerToClientGroupMap);
      } catch (err) {
        console.error('Error updating displayed product owners:', err);
      }
    };

    if (productOwners.length > 0 || selectedClientGroupIds.length > 0 || selectedProductIds.length > 0) { // Run if product owners are loaded or any selection exists
      updateDisplayedOwners();
    } else {
      setDisplayedProductOwners([]); // Clear if no selections and no owners loaded
      setProductOwnerToClientGroup(new Map()); // Clear the mapping
    }
  }, [selectedProductOwnerIds, selectedClientGroupIds, selectedProductIds, products, productOwners, api]);

  // NEW useEffect for instant "Related Products" display (REQ 3)
  useEffect(() => {
    const updateRelatedProducts = async () => {
      try {
        let productsToDisplay: Product[] = [];
        const displayedProductIds = new Set<number>();
        // Create a new map for tracking product sources
        const productSourcesMap = new Map<number, { clientGroups: number[], productOwners: number[] }>();
        // Create a map to track which products belong to which product owners
        const ownerToProductsMap = new Map<number, number[]>();
        
        console.log("Updating related products with selections:", {
          selectedProductIds,
          selectedClientGroupIds,
          selectedProductOwnerIds,
          displayedProductOwners: displayedProductOwners.map(po => po.id)
        });

        // 1. Directly selected products
        for (const sp of selectedProductIds) {
          const product = products.find(p => p.id === Number(sp));
          if (product && !displayedProductIds.has(product.id)) {
            productsToDisplay.push(product);
            displayedProductIds.add(product.id);
            // These are directly selected, initialize the sources
            productSourcesMap.set(product.id, { clientGroups: [], productOwners: [] });
          }
        }

        // 2. Products from selected client groups
        if (selectedClientGroupIds.length > 0) {
          const clientGroupIds = selectedClientGroupIds.map(cg => Number(cg));
          const clientGroupProds = products.filter(p => p.client_id && clientGroupIds.includes(p.client_id));
          clientGroupProds.forEach(p => {
            if (!displayedProductIds.has(p.id)) {
              productsToDisplay.push(p);
              displayedProductIds.add(p.id);
              // Initialize with this client group as source
              productSourcesMap.set(p.id, { 
                clientGroups: [p.client_id], 
                productOwners: [] 
              });
            } else {
              // Product already added, but add this client group as a source
              const currentSources = productSourcesMap.get(p.id) || { clientGroups: [], productOwners: [] };
              if (!currentSources.clientGroups.includes(p.client_id)) {
                currentSources.clientGroups.push(p.client_id);
                productSourcesMap.set(p.id, currentSources);
              }
            }
          });
        }

        // 3. Products from selected product owners
        if (selectedProductOwnerIds.length > 0) {
          for (const spo of selectedProductOwnerIds) {
            try {
              const response = await api.get(`/product_owners/${Number(spo)}/products`);
              if (response.data && Array.isArray(response.data)) {
                const ownerSpecificProducts = response.data as Product[];
                
                // Track this product owner's products
                const productIdsForOwner: number[] = [];
                
                ownerSpecificProducts.forEach(p => {
                  productIdsForOwner.push(p.id);
                  
                  if (!displayedProductIds.has(p.id)) {
                    productsToDisplay.push(p); // Add the full product object
                    displayedProductIds.add(p.id);
                    // Initialize with this product owner as source
                    productSourcesMap.set(p.id, { 
                      clientGroups: [], 
                      productOwners: [Number(spo)] 
                    });
                  } else {
                    // Product already added, but add this product owner as a source
                    const currentSources = productSourcesMap.get(p.id) || { clientGroups: [], productOwners: [] };
                    if (!currentSources.productOwners.includes(Number(spo))) {
                      currentSources.productOwners.push(Number(spo));
                      productSourcesMap.set(p.id, currentSources);
                    }
                  }
                });
                
                // Add to the owner->products mapping
                ownerToProductsMap.set(Number(spo), productIdsForOwner);
              }
            } catch (err) {
              console.error(`Failed to fetch products for PO ${Number(spo)} (report gen):`, err);
              // Optionally, show a partial error or decide if report can proceed
            }
          }
        }
        
        // 4. Products from client group product owners (that aren't directly selected)
        for (const owner of displayedProductOwners) {
          // Skip owners that are directly selected (we already processed them)
          if (selectedProductOwnerIds.includes(owner.id)) continue;
          
          try {
            const response = await api.get(`/product_owners/${owner.id}/products`);
            if (response.data && Array.isArray(response.data)) {
              const ownerSpecificProducts = response.data as Product[];
              
              // Track this product owner's products
              const productIdsForOwner: number[] = [];
              
              ownerSpecificProducts.forEach(p => {
                productIdsForOwner.push(p.id);
                
                if (!displayedProductIds.has(p.id)) {
                  productsToDisplay.push(p);
                  displayedProductIds.add(p.id);
                  // Set source as this product owner
                  productSourcesMap.set(p.id, {
                    clientGroups: [],
                    productOwners: [owner.id]
                  });
                } else {
                  // Product already added, add this product owner as a source
                  const currentSources = productSourcesMap.get(p.id) || { clientGroups: [], productOwners: [] };
                  if (!currentSources.productOwners.includes(owner.id)) {
                    currentSources.productOwners.push(owner.id);
                    productSourcesMap.set(p.id, currentSources);
                  }
                }
              });
              
              // Add to the owner->products mapping
              ownerToProductsMap.set(owner.id, productIdsForOwner);
            }
          } catch (err) {
            console.error(`Failed to fetch products for client group's PO ${owner.id}:`, err);
          }
        }
        
        setRelatedProducts(productsToDisplay);
        setProductSources(productSourcesMap);
        setProductOwnerToProducts(ownerToProductsMap);
      } catch (err) {
        console.error('Error updating related products:', err);
      }
    };
    
    // Run when selections change or the main product list is available
    // products.length check ensures we don't run with an empty lookup list
    if (products.length > 0 || selectedProductOwnerIds.length > 0 || displayedProductOwners.length > 0) {
        updateRelatedProducts();
    } else {
        setRelatedProducts([]); // Clear if no relevant selections
        setProductSources(new Map()); // Clear the sources map
        setProductOwnerToProducts(new Map()); // Clear the product owner->products mapping
    }
  }, [selectedProductIds, selectedClientGroupIds, selectedProductOwnerIds, products, displayedProductOwners, api]);

  // Reset exclusion lists when selections change
  useEffect(() => {
    setExcludedProductIds(new Set());
    setExcludedProductOwnerIds(new Set());
  }, [selectedProductIds, selectedClientGroupIds, selectedProductOwnerIds]);

  // Add useEffect to handle cascading exclusion (after the other useEffects):
  useEffect(() => {
    // This effect handles cascading exclusion when product owners are excluded
    console.log("=== EXCLUSION DEBUG ===");
    console.log("Excluded product owner IDs:", Array.from(excludedProductOwnerIds));
    console.log("Product owner -> products map:", Array.from(productOwnerToProducts.entries()));
    console.log("Product owner -> client groups map:", Array.from(productOwnerToClientGroup.entries()));
    
    const newCascadeExcludedProducts = new Map<number, number[]>();
    
    // For each excluded product owner, find and exclude all their products
    excludedProductOwnerIds.forEach(ownerId => {
      const ownerProducts = productOwnerToProducts.get(ownerId) || [];
      console.log(`Products for excluded owner ${ownerId}:`, ownerProducts);
      
      // Add excluded products from this owner
      if (ownerProducts.length > 0) {
        newCascadeExcludedProducts.set(ownerId, ownerProducts);
      }
    });
    
    console.log("Cascade excluded products:", Array.from(newCascadeExcludedProducts.entries()));
    
    setCascadeExcludedProductIds(newCascadeExcludedProducts);
  }, [excludedProductOwnerIds, productOwnerToProducts, productOwnerToClientGroup]);

  // useEffect for tracking selection changes in the debug console
  useEffect(() => {
    console.log("=== SELECTION CHANGED ===");
    console.log("Selected client groups:", selectedClientGroupIds);
    console.log("Selected product owners:", selectedProductOwnerIds);
    console.log("Selected products:", selectedProductIds);
    console.log("Related product owners:", displayedProductOwners.map(po => ({ id: po.id, name: po.name })));
    console.log("Related products:", relatedProducts.map(p => ({ id: p.id, name: p.product_name })));
  }, [selectedClientGroupIds, selectedProductOwnerIds, selectedProductIds, displayedProductOwners, relatedProducts]);
  
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
        
        // Get all excluded product IDs (direct and cascade)
        const allExcludedProductIds = new Set<number>([...excludedProductIds]);
        
        // Add cascade-excluded products
        Array.from(cascadeExcludedProductIds.values()).forEach((productIds: number[]) => {
          productIds.forEach((id: number) => allExcludedProductIds.add(id));
        });
        
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
        
        // If we only have inactive products, still allow them to proceed (they can select any valuation date)
        if (activeFundIds.length === 0 && inactiveProductFundIds.length > 0) {
          // For inactive products, we don't need common valuation dates - they can use any available date
          // Set a default set of available dates (could be empty, letting user select manually)
          setAvailableValuationDates([]);
          setSelectedValuationDate(null);
          setIsLoadingValuationDates(false);
          return;
        } else if (activeFundIds.length === 0) {
          setAvailableValuationDates([]);
          setSelectedValuationDate(null);
          setIsLoadingValuationDates(false);
          return;
        }
        
        // Create a map to track which months each fund has valuations for
        const fundValuationMonths: Map<number, Set<string>> = new Map();
        
        // Initialize the set for each fund
        activeFundIds.forEach(fundId => {
          fundValuationMonths.set(fundId, new Set<string>());
        });
        
        // Get all historical valuations for each fund using batch service
        const batchValuationResult = await valuationService.getBatchHistoricalValuations(activeFundIds);
        
        // Convert batch result to expected format for compatibility
        const valuationResponses = activeFundIds.map(fundId => ({
          data: batchValuationResult.get(fundId) || []
        }));
        
        // Process all valuations to track which months each fund has valuations for
        valuationResponses.forEach((response, index) => {
          const fundId = activeFundIds[index];
          const fundValuations = response.data || [];
          
          fundValuations.forEach((val: any) => {
            if (val.valuation_date) {
              // Extract YYYY-MM from the date
              const dateParts = val.valuation_date.split('-');
              if (dateParts.length >= 2) {
                const yearMonth = `${dateParts[0]}-${dateParts[1]}`;
                // Add this month to this fund's set of valuation months
                fundValuationMonths.get(fundId)?.add(yearMonth);
              }
            }
          });
        });
        
        // Find the intersection of all valuation months
        // (months where ALL funds have valuations)
        let commonValuationMonths: string[] = [];
        
        if (activeFundIds.length > 0) {
          // Start with months from the first fund
          commonValuationMonths = Array.from(fundValuationMonths.get(activeFundIds[0]) || []);
          
          // For each remaining fund, filter to keep only months they also have
          for (let i = 1; i < activeFundIds.length; i++) {
            const fundMonths = fundValuationMonths.get(activeFundIds[i]) || new Set<string>();
            commonValuationMonths = commonValuationMonths.filter(month => fundMonths.has(month));
          }
        }
        
        // Sort chronologically (newest first)
        const sortedDates = commonValuationMonths.sort((a: string, b: string) => b.localeCompare(a));
        
        console.log("Common valuation months (all funds have data):", sortedDates);
        setAvailableValuationDates(sortedDates);
        
        // Set the most recent date as the default selection
        if (sortedDates.length > 0 && !selectedValuationDate) {
          setSelectedValuationDate(sortedDates[0]);
        } else if (sortedDates.length > 0 && selectedValuationDate && !sortedDates.includes(selectedValuationDate)) {
          // If the currently selected date is no longer valid, select the most recent date
          setSelectedValuationDate(sortedDates[0]);
        } else if (sortedDates.length === 0) {
          // If no common dates found, clear selection and show a message
          setSelectedValuationDate(null);
          console.warn("No common valuation dates found for the selected funds");
        }
      } catch (err) {
        console.error("Error fetching available valuation dates:", err);
        setAvailableValuationDates([]);
      } finally {
        setIsLoadingValuationDates(false);
      }
    };
    
    fetchAvailableValuationDates();
  }, [relatedProducts, excludedProductIds, cascadeExcludedProductIds, api, selectedValuationDate]);

  // State to store historical IRR month labels
  const [historicalIRRMonths, setHistoricalIRRMonths] = useState<string[]>([]);
  
  // State for historical IRR years setting
  const [historicalIRRYears, setHistoricalIRRYears] = useState<number>(2);

  // Computed value: Check if any products are effectively selected (after exclusions)
  const hasEffectiveProductSelection = useMemo(() => {
    // Get all excluded product IDs (direct and cascade)
    const allExcludedProductIds = new Set<number>([...excludedProductIds]);
    
    // Add cascade-excluded products
    Array.from(cascadeExcludedProductIds.values()).forEach(productIds => {
      productIds.forEach(id => allExcludedProductIds.add(id));
    });

    // Count effective products from each selection method
    let effectiveProductCount = 0;

    // 1. Directly selected products (not excluded)
    effectiveProductCount += selectedProductIds.filter(p => !allExcludedProductIds.has(Number(p))).length;

    // 2. Products from selected client groups (not excluded)
    if (selectedClientGroupIds.length > 0) {
      const clientGroupIds = selectedClientGroupIds.map(cg => Number(cg));
      const clientGroupProducts = products.filter(p => 
        p.client_id && 
        clientGroupIds.includes(p.client_id) && 
        !allExcludedProductIds.has(p.id)
      );
      effectiveProductCount += clientGroupProducts.length;
    }

    // 3. Products from selected product owners (not excluded)
    // Note: This is an approximation since we don't have the full product owner product list in state
    // But we can use relatedProducts as a proxy since it should contain all relevant products
    if (selectedProductOwnerIds.length > 0) {
      const nonExcludedOwners = selectedProductOwnerIds.filter(ownerId => !excludedProductOwnerIds.has(Number(ownerId)));
      if (nonExcludedOwners.length > 0) {
        // If we have non-excluded product owners, assume they contribute products
        // This is imperfect but will be validated in the actual generateReport function
        const ownerProducts = relatedProducts.filter(p => !allExcludedProductIds.has(p.id));
        effectiveProductCount += ownerProducts.length;
      }
    }

    return effectiveProductCount > 0;
  }, [selectedProductIds, selectedClientGroupIds, selectedProductOwnerIds, excludedProductIds, cascadeExcludedProductIds, excludedProductOwnerIds, products, relatedProducts]);

  // Function to fetch historical IRR data for all funds in products
  // Only includes months where ALL portfolio funds have IRR data
  const fetchAllHistoricalIRRData = async (productIds: number[]): Promise<Map<number, number[]>> => {
    const fundHistoricalIRRMap = new Map<number, number[]>();
    let globalSelectedMonths: string[] = [];
    
    try {
      console.log(`📊 Fetching historical IRR data: ${historicalIRRYears} years (${historicalIRRYears * 12} months) for ${productIds.length} products`);
      
      // Process each product separately to ensure completeness within each portfolio
      for (const productId of productIds) {
        const monthsToRetrieve = historicalIRRYears * 12; // Convert years to months
        const response = await historicalIRRService.getCombinedHistoricalIRR(productId, monthsToRetrieve);
        
        if (!response.funds_historical_irr || response.funds_historical_irr.length === 0) {
          continue;
        }

        // Group historical IRR data by month for each fund
        const fundsByMonth = new Map<string, Map<number, number>>();
        const allFundIds = new Set<number>();
        const latestIRRMonths = new Map<number, string>(); // Track latest IRR month for each fund

        // First pass: identify the latest IRR month for each fund
        response.funds_historical_irr.forEach((fund: any) => {
          if (fund.historical_irr && fund.historical_irr.length > 0) {
            allFundIds.add(fund.portfolio_fund_id);
            
            let latestMonth = '';
            fund.historical_irr.forEach((record: any) => {
              if (record.irr_result !== null && record.irr_date) {
                const dateObj = new Date(record.irr_date);
                const yearMonth = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
                
                // Track the latest month for this fund
                if (yearMonth > latestMonth) {
                  latestMonth = yearMonth;
                }
              }
            });
            
            if (latestMonth) {
              latestIRRMonths.set(fund.portfolio_fund_id, latestMonth);
            }
          }
        });

        // Second pass: group historical IRR data by month, excluding latest month for each fund
        response.funds_historical_irr.forEach((fund: any) => {
          if (fund.historical_irr && fund.historical_irr.length > 0) {
            const fundLatestMonth = latestIRRMonths.get(fund.portfolio_fund_id);
            
            fund.historical_irr.forEach((record: any) => {
              if (record.irr_result !== null && record.irr_date) {
                const dateObj = new Date(record.irr_date);
                const yearMonth = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
                
                // Skip this IRR if it's the latest month for this fund
                if (yearMonth === fundLatestMonth) {
                  console.log(`Excluding latest IRR for fund ${fund.portfolio_fund_id}: ${yearMonth} (${record.irr_result}%)`);
                  return;
                }
                
                if (!fundsByMonth.has(yearMonth)) {
                  fundsByMonth.set(yearMonth, new Map());
                }
                
                fundsByMonth.get(yearMonth)!.set(fund.portfolio_fund_id, record.irr_result);
              }
            });
          }
        });

        // Find months where majority of funds have IRR data (at least 75% coverage)
        const completeMonths: string[] = [];
        const totalFundsInPortfolio = allFundIds.size;
        const requiredCoverage = Math.max(1, Math.ceil(totalFundsInPortfolio * 0.75)); // At least 75% of funds must have data
        
        for (const [yearMonth, fundsData] of fundsByMonth.entries()) {
          if (fundsData.size >= requiredCoverage) {
            completeMonths.push(yearMonth);
          }
        }
        
        console.log(`Product ${productId} coverage: ${totalFundsInPortfolio} total funds, requiring ${requiredCoverage} for inclusion`);

        // Sort months by date (most recent first)
        completeMonths.sort((a, b) => b.localeCompare(a));

        // Take only the first 3 complete months and populate the fund map
        const selectedMonths = completeMonths.slice(0, 3);
        
        // Use the first product's complete months as the global reference
        if (globalSelectedMonths.length === 0 && selectedMonths.length > 0) {
          globalSelectedMonths = selectedMonths;
        }
        
        for (const fundId of allFundIds) {
          const historicalValues: number[] = [];
          
          for (const yearMonth of selectedMonths) {
            const irrValue = fundsByMonth.get(yearMonth)?.get(fundId);
            if (irrValue !== undefined) {
              historicalValues.push(irrValue);
            }
          }
          
          if (historicalValues.length > 0) {
            fundHistoricalIRRMap.set(fundId, historicalValues);
          }
        }

        console.log(`Product ${productId}: Found ${completeMonths.length} complete months, using ${selectedMonths.length} most recent: ${selectedMonths.join(', ')}`);
        
        // Additional debugging for this product
        console.log(`Product ${productId} debug:`, {
          totalFundsInPortfolio: allFundIds.size,
          totalMonthsWithData: fundsByMonth.size,
          fundsWithHistoricalData: response.funds_historical_irr?.length || 0,
          completeMonths: completeMonths,
          selectedMonths: selectedMonths
        });
      }
      
      // Format the month labels for display and store them in state
      if (globalSelectedMonths.length > 0) {
        const monthLabels = globalSelectedMonths.map(yearMonth => {
          const [year, month] = yearMonth.split('-');
          const date = new Date(parseInt(year), parseInt(month) - 1);
          return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
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

  const generateReport = async () => {
    // Check if any products are effectively selected (accounting for exclusions)
    if (!hasEffectiveProductSelection) {
      setDataError('Please select at least one product to generate a report. Products may be excluded if their client group or product owner is excluded.');
      return;
    }
    
    // Additional validation to ensure user has made meaningful selections
    console.log('Report generation validation:');
    console.log(`Selected client groups: ${selectedClientGroupIds.length}`);
    console.log(`Selected product owners: ${selectedProductOwnerIds.length}`);
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
    
    setIsCalculating(true);
    setDataError(null);
    setMonthlyTransactions([]);
    setTotalValuation(null);
    setValuationDate(null);
    setEarliestTransactionDate(null);
    setTotalIRR(null);
    setProductSummaries([]);
    
    try {
      // Get all excluded product IDs (direct and cascade)
      const allExcludedProductIds = new Set<number>([...excludedProductIds]);
      
      // Add cascade-excluded products
      Array.from(cascadeExcludedProductIds.values()).forEach(productIds => {
        productIds.forEach(id => allExcludedProductIds.add(id));
      });

      // --- Step 1: Consolidate all Product IDs for the Report (REQ 1) ---
      const productIdsForReport = new Set<number>();
      // This will store full product objects fetched for product owners if they are not in the main 'products' list
      const additionalProductsData: Product[] = []; 

      // 1a. Add directly selected products (that aren't excluded)
      if (selectedProductIds.length > 0) {
        selectedProductIds
          .filter(p => !allExcludedProductIds.has(Number(p)))
          .forEach(p => productIdsForReport.add(Number(p)));
      }
      
      // 1b. Add products from selected client groups (that aren't excluded)
      if (selectedClientGroupIds.length > 0) {
        const clientGroupIds = selectedClientGroupIds.map(cg => Number(cg));
        const clientGroupAttachedProducts = products.filter(p => 
          p.client_id && 
          clientGroupIds.includes(p.client_id) && 
          !allExcludedProductIds.has(p.id)
        );
        clientGroupAttachedProducts.forEach(p => productIdsForReport.add(p.id));
      }
      
      // 1c. Add products from selected product owners (that aren't excluded)
      if (selectedProductOwnerIds.length > 0) {
        for (const spo of selectedProductOwnerIds) {
          // Skip excluded product owners
          if (excludedProductOwnerIds.has(Number(spo))) continue;
          
          try {
            const response = await api.get(`/product_owners/${Number(spo)}/products`);
            if (response.data && Array.isArray(response.data)) {
              const ownerSpecificProducts = response.data as Product[];
              ownerSpecificProducts
                .filter(p => !allExcludedProductIds.has(p.id))
                .forEach(p => {
                  productIdsForReport.add(p.id);
                  // If this product isn't in our main 'products' list, store its details
                  if (!products.find(mainP => mainP.id === p.id)) {
                      additionalProductsData.push(p);
                  }
                });
            }
          } catch (err) {
            console.error(`Failed to fetch products for PO ${Number(spo)} (report gen):`, err);
            // Optionally, show a partial error or decide if report can proceed
          }
        }
      }
      
      // REMOVED: Auto-inclusion of products from client group product owners
      // Now only explicitly selected items will be included in reports
      // This ensures users have full control over what gets included
      
      const uniqueProductIds = Array.from(productIdsForReport);
      
      if (uniqueProductIds.length === 0) {
        setDataError('No products found for your selection to generate the report.');
        setIsCalculating(false);
        return;
      }
      console.log("Unique Product IDs for report:", uniqueProductIds);

      // Fetch historical IRR data for all products
      console.log("Fetching historical IRR data for products:", uniqueProductIds);
      const historicalIRRMap = await fetchAllHistoricalIRRData(uniqueProductIds);
      console.log("Historical IRR data fetched:", historicalIRRMap.size, "funds with historical data");

      // --- Step 2: Get Portfolio IDs for all selected products ---
      // Combine main products list with any additionally fetched products for a full lookup
      const comprehensiveProductList = [...products, ...additionalProductsData.filter(ap => !products.find(mp => mp.id === ap.id))];

      // Create array to store each product's summary data
      const productSummaryResults: ProductPeriodSummary[] = [];
      let overallValuation = 0;
      let latestValuationDate: string | null = null;

      // Track all missing valuations across products
      const allMissingValuations: {productName: string, fundName: string}[] = [];

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
        let totalInvestment = 0;
        let totalWithdrawal = 0;
        let totalSwitchIn = 0;
        let totalSwitchOut = 0;
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
        
        switch(log.activity_type) {
            case 'Investment': case 'RegularInvestment': case 'GovernmentUplift': case 'ProductSwitchIn':
              totalInvestment += parsedAmount; 
              break;
            case 'Withdrawal': case 'ProductSwitchOut':
              totalWithdrawal += parsedAmount; 
              break;
            case 'SwitchIn': case 'FundSwitchIn': 
              totalSwitchIn += parsedAmount; 
              break;
            case 'SwitchOut': case 'FundSwitchOut': 
              totalSwitchOut += parsedAmount; 
              break;
          }
        });
        
        console.log(`Product ${productDetails.product_name} activity totals:`, {
          totalInvestment,
          totalWithdrawal,
          totalSwitchIn,
          totalSwitchOut,
          productStartDate
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
        
        // Fetch fund IRR values for the selected date
        let fundIRRMap = new Map<number, number | null>();
        if (selectedValuationDate) {
          try {
            const [year, month] = selectedValuationDate.split('-').map(part => parseInt(part));
            const activeFundIdsList = Array.from(activeFundIds);
            
            // Use the new API endpoint to fetch IRR values for the specific month/year
            const irrResponse = await api.post('/portfolio_funds/batch/irr-values-by-date', {
              fund_ids: activeFundIdsList,
              target_month: month,
              target_year: year
            });
            
            if (irrResponse.data && irrResponse.data.data) {
              const irrData = irrResponse.data.data;
              Object.entries(irrData).forEach(([fundId, irrInfo]: [string, any]) => {
                const fundIdNum = parseInt(fundId);
                if (irrInfo && typeof irrInfo.irr === 'number') {
                  fundIRRMap.set(fundIdNum, irrInfo.irr);
                } else {
                  fundIRRMap.set(fundIdNum, null);
                }
              });
            }
          } catch (error) {
            console.error('Error fetching fund IRR values:', error);
            // Continue without IRR values - they'll be set to null
          }
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
          
          // Calculate totals for this fund
          let fundInvestment = 0;
          let fundWithdrawal = 0;
          let fundSwitchIn = 0;
          let fundSwitchOut = 0;
          
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
            
            switch(log.activity_type) {
              case 'Investment': case 'RegularInvestment': case 'GovernmentUplift': case 'ProductSwitchIn':
                fundInvestment += amount; 
                break;
              case 'Withdrawal': case 'ProductSwitchOut':
                fundWithdrawal += amount; 
                break;
              case 'SwitchIn': case 'FundSwitchIn': 
                fundSwitchIn += amount; 
                break;
              case 'SwitchOut': case 'FundSwitchOut': 
                fundSwitchOut += amount; 
                break;
            }
          });
          
          console.log(`Fund ${fundName} activity totals:`, {
            fundInvestment,
            fundWithdrawal,
            fundSwitchIn,
            fundSwitchOut,
            netFlow: fundInvestment - fundWithdrawal + fundSwitchIn - fundSwitchOut
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

          // Add to fund summaries
          fundSummaries.push({
            id: portfolioFund.id,
            available_funds_id: portfolioFund.available_funds_id,
            fund_name: fundName,
            total_investment: fundInvestment,
            total_withdrawal: fundWithdrawal,
            total_switch_in: fundSwitchIn,
            total_switch_out: fundSwitchOut,
            net_flow: fundInvestment - fundWithdrawal + fundSwitchIn - fundSwitchOut,
            current_valuation: fundValuation,
            irr: fundIRR,
            isin_number: isinNumber,
            status: portfolioFund.status || 'active',
            risk_factor: riskFactor, // Use the risk factor from the available fund
            historical_irr: historicalIRRValues // Add historical IRR data
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
                  const portfolioIRRResponse = await api.get(`/api/portfolios/${productDetails.portfolio_id}/latest-irr`);
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
          const totalSwitchIn = inactiveFunds.reduce((sum, fund) => sum + fund.total_switch_in, 0);
          const totalSwitchOut = inactiveFunds.reduce((sum, fund) => sum + fund.total_switch_out, 0);
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
              totalSwitchIn: f.total_switch_in,
              totalSwitchOut: f.total_switch_out,
              netFlow: f.net_flow
            }))
          });
          
          // Create a virtual entry with aggregated values
          const previousFundsEntry = {
            id: -1, // Special ID for virtual fund
            available_funds_id: -1,
            fund_name: 'Previous Funds',
            total_investment: totalInvestment,
            total_withdrawal: totalWithdrawal,
            total_switch_in: totalSwitchIn,
            total_switch_out: totalSwitchOut,
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
        
        // Extract product owner name from product_owners array
        let productOwnerName: string | undefined = undefined;
        if (productDetails.product_owners && Array.isArray(productDetails.product_owners) && productDetails.product_owners.length > 0) {
          if (productDetails.product_owners.length === 1) {
            // Single owner
            productOwnerName = productDetails.product_owners[0].name;
          } else {
            // Multiple owners - join with commas
            productOwnerName = productDetails.product_owners.map((owner: any) => owner.name).join(', ');
          }
        }

        // Add to summary results with fund data
        productSummaryResults.push({
          id: productId,
          product_name: productDetails.product_name,
          product_type: productDetails.product_type,
          product_owner_name: productOwnerName,
          start_date: productStartDate,
          total_investment: totalInvestment,
          total_withdrawal: totalWithdrawal,
          total_switch_in: totalSwitchIn,
          total_switch_out: totalSwitchOut,
          net_flow: totalInvestment - totalWithdrawal + totalSwitchIn - totalSwitchOut,
          current_valuation: productValuation,
          irr: productIRR,
          provider_name: productDetails.provider_name,
          provider_theme_color: productDetails.provider_theme_color,
          funds: finalFundList,
          weighted_risk: productWeightedRisk,
          status: productDetails.status // Add product status for greying out inactive products
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
      if (productSummaryResults.length > 0 && overallValuation > 0) {
        try {
          // Collect all portfolio fund IDs from all products
          // We need to collect from the original fundSummaries arrays, not the finalFundList
          // which excludes inactive funds. We'll need to reconstruct this from the product processing.
          const allPortfolioFundIds: number[] = [];
          
          // Re-process each product to get ALL fund IDs (active and inactive)
          for (const productId of uniqueProductIds) {
            const productDetails = comprehensiveProductList.find(p => p.id === productId);
            if (!productDetails) continue;
            
            const portfolioId = productDetails.portfolio_id;
            if (!portfolioId) continue;
            
            // Get portfolio funds for this product using batch service
            const productPortfolioFunds = await portfolioFundsService.getPortfolioFunds(portfolioId);
            
            // Add ALL portfolio fund IDs (active and inactive)
            productPortfolioFunds.forEach(pf => {
              if (pf.id && pf.id > 0) {
                allPortfolioFundIds.push(pf.id);
              }
            });
          }
          
          if (allPortfolioFundIds.length > 0) {
            console.log('Calculating standardized IRR for portfolio fund IDs:', allPortfolioFundIds);
            
            // Format the selected valuation date for the API call
            let formattedDate: string | undefined = undefined;
        if (selectedValuationDate) {
              // Convert YYYY-MM format to YYYY-MM-DD (last day of month)
          const [year, month] = selectedValuationDate.split('-').map(part => parseInt(part));
              const lastDayOfMonth = new Date(year, month, 0).getDate();
              formattedDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDayOfMonth).padStart(2, '0')}`;
            }
            
            console.log('Using optimized batch IRR service for total IRR:', {
              portfolioFundIds: allPortfolioFundIds,
              irrDate: formattedDate
            });
            
            // Use optimized IRR service for total IRR calculation (eliminates second duplicate)
            const totalIRRData = await irrDataService.getOptimizedIRRData({
              portfolioFundIds: allPortfolioFundIds,
              endDate: formattedDate,
              includeHistorical: false
            });
            
            console.log('Optimized total IRR response:', totalIRRData);
            
            setTotalIRR(totalIRRData.portfolioIRR);
            console.log('✅ Optimized total IRR calculation complete:', totalIRRData.portfolioIRR);
        } else {
            console.warn('No valid portfolio fund IDs found for IRR calculation');
          setTotalIRR(null);
          }
        } catch (irrErr) {
          console.error('Error calculating standardized IRR:', irrErr);
          setTotalIRR(null);
        }
      } else {
        setTotalIRR(null);
      }
      
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
    { key: 'total_switch_in', label: 'Fund Switch In' },
    { key: 'total_switch_out', label: 'Fund Switch Out' },
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
              <div className="dropdown-container">
                <label className="block text-sm font-medium text-gray-700 mb-1">Client Groups</label>
                <MultiSelectSearchableDropdown
                  id="client-groups-dropdown"
                  options={clientGroups.map(cg => ({ value: cg.id, label: cg.name }))}
                  values={selectedClientGroupIds}
                  onChange={setSelectedClientGroupIds}
                  placeholder="Search client groups..."
                  loading={isLoading}
                  className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
                />
              </div>
              
              <div className="dropdown-container">
                <label className="block text-sm font-medium text-gray-700 mb-1">Product Owners</label>
                <MultiSelectSearchableDropdown
                  id="product-owners-dropdown"
                  options={productOwners.map(po => ({ value: po.id, label: po.name }))}
                  values={selectedProductOwnerIds}
                  onChange={setSelectedProductOwnerIds}
                  placeholder="Search product owners..."
                  loading={isLoading}
                  className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
                />
              </div>
              
              <div className="dropdown-container">
                <label className="block text-sm font-medium text-gray-700 mb-1">Products</label>
                <MultiSelectSearchableDropdown
                  id="products-dropdown"
                  options={products.map(p => ({ value: p.id, label: p.product_name }))}
                  values={selectedProductIds}
                  onChange={setSelectedProductIds}
                  placeholder="Search products..."
                  loading={isLoading}
                  className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
                />
              </div>
              
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
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={truncateAmounts}
                    onChange={(e) => setTruncateAmounts(e.target.checked)}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-600">
                    Truncate amounts to whole numbers (excludes IRRs)
                  </span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={roundIrrToOne}
                    onChange={(e) => setRoundIrrToOne(e.target.checked)}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-600">
                    Round IRR values to 1 decimal place (default is 2)
                  </span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={formatWithdrawalsAsNegative}
                    onChange={(e) => setFormatWithdrawalsAsNegative(e.target.checked)}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-600">
                    Format withdrawal amounts as negative values
                  </span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={combineFundSwitches}
                    onChange={(e) => setCombineFundSwitches(e.target.checked)}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-600">
                    Combine fund switch columns into net amount
                  </span>
                </label>
                
                {/* Historical IRR Years Setting */}
                <div className="flex items-center space-x-3">
                  <label htmlFor="historical-irr-years" className="text-sm text-gray-600">
                    Historical IRR years back:
                  </label>
                  <select
                    id="historical-irr-years"
                    value={historicalIRRYears}
                    onChange={(e) => setHistoricalIRRYears(Number(e.target.value))}
                    className="block w-20 px-2 py-1 text-sm border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value={1}>1</option>
                    <option value={2}>2</option>
                    <option value={3}>3</option>
                    <option value={4}>4</option>
                    <option value={5}>5</option>
                  </select>
                  <span className="text-xs text-gray-500">
                    years (up to {historicalIRRYears * 12} months)
                  </span>
                </div>
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
              
              {/* Inactive Product Detail Controls */}
              {productSummaries.some(product => product.status === 'inactive') && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <h5 className="text-sm font-medium text-gray-700 mb-2">Inactive Product Details</h5>
                  <p className="text-xs text-gray-500 mb-2">
                    Choose which inactive products to show detailed cards for (unchecked = summary table only)
                  </p>
                  <div className="space-y-1">
                    {productSummaries
                      .filter(product => product.status === 'inactive')
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
            
            <div className="mt-6">
              <button
                onClick={generateReport}
                disabled={isCalculating || isLoading || !hasEffectiveProductSelection}
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
                This section shows all items included in your report. Click × to exclude an item or ✓ to include it.
                Excluding a product owner will automatically exclude all its products.
              </p>
              <div className="border rounded-lg p-4 bg-gray-50 min-h-[100px]">
                {(displayedProductOwners.length > 0 || relatedProducts.length > 0) ? (
                  <div className="space-y-3">
                    {displayedProductOwners.length > 0 && (
                      <div>
                        <h4 className="text-xs font-medium text-gray-500 uppercase mb-1">Product Owners</h4>
                        {/* Debug info */}
                        {process.env.NODE_ENV === 'development' && (
                          <div className="text-xs text-gray-400 mb-2">
                            Displayed owners: {displayedProductOwners.length}, 
                            Direct selected: {selectedProductOwnerIds.length},
                            Client groups: {selectedClientGroupIds.length}
                          </div>
                        )}
                        <div className="flex flex-wrap gap-2">
                          {displayedProductOwners.map(owner => {
                            // Check the source of this product owner
                            const isDirectlySelected = selectedProductOwnerIds.includes(owner.id);
                            const associatedClientGroups = productOwnerToClientGroup.get(owner.id) || [];
                            const hasClientGroupSource = associatedClientGroups.length > 0;
                            const isExcluded = excludedProductOwnerIds.has(owner.id);
                            
                            console.log(`Product owner ${owner.name} (${owner.id}) status:`, {
                              isDirectlySelected,
                              hasClientGroupSource,
                              associatedClientGroups,
                              isExcluded
                            });
                            
                            // Determine the style based on source
                            let badgeStyle = '';
                            if (isExcluded) {
                              badgeStyle = 'bg-gray-100 text-gray-500';
                            } else if (isDirectlySelected) {
                              badgeStyle = 'bg-blue-100 text-blue-800';
                            } else if (hasClientGroupSource) {
                              // Use a distinct color for client group-sourced product owners
                              badgeStyle = 'bg-purple-100 text-purple-800';
                            } else {
                              badgeStyle = 'bg-blue-100 text-blue-800';
                            }
                            
                            // Determine button action text
                            const buttonTitle = isExcluded 
                              ? `Include ${owner.name}` 
                              : `Exclude ${owner.name}`;
                            
                            return (
                              <span 
                                key={owner.id} 
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeStyle} group cursor-pointer hover:opacity-80 transition-opacity`}
                                title="Click to toggle inclusion/exclusion"
                                onClick={(e) => {
                                  // Handle click on the entire component
                                  e.stopPropagation();
                                  const newExcludedOwners = new Set(excludedProductOwnerIds);
                                  if (isExcluded) {
                                    newExcludedOwners.delete(owner.id);
                                  } else {
                                    newExcludedOwners.add(owner.id);
                                  }
                                  setExcludedProductOwnerIds(newExcludedOwners);
                                }}
                              >
                                {owner.name}
                                {/* Show product count */}
                                {productOwnerToProducts.has(owner.id) && (
                                  <span className={`ml-1 ${isExcluded ? 'text-gray-400' : 'text-blue-600'} text-xs`}>
                                    ({productOwnerToProducts.get(owner.id)?.length || 0})
                                  </span>
                                )}
                                {/* Show a small indicator of source */}
                                {isDirectlySelected && (
                                  <span className={`ml-1 ${isExcluded ? 'text-gray-400' : 'text-blue-600'} text-xs`} title="Directly selected">•</span>
                                )}
                                {hasClientGroupSource && (
                                  <span className={`ml-1 ${isExcluded ? 'text-gray-400' : 'text-purple-600'} text-xs`} title="From client group">◆</span>
                                )}
                                <span 
                                  onClick={(e) => {
                                    // Prevent the parent click handler from firing when clicking the icon
                                    e.stopPropagation();
                                  }}
                                  className={`ml-1.5 ${isExcluded ? 'text-gray-400 hover:text-gray-600' : 'text-blue-400 hover:text-blue-600'} focus:outline-none`}
                                  aria-label={buttonTitle}
                                  title={isExcluded ? "Include product owner" : "Exclude product owner"}
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
                    )}
                    {relatedProducts.length > 0 && (
                      <div>
                        <h4 className="text-xs font-medium text-gray-500 uppercase mb-1">Products</h4>
                        <div className="flex flex-wrap gap-2">
                          {relatedProducts.map(product => {
                            // Check the sources of this product
                            const isDirectlySelected = selectedProductIds.includes(product.id);
                            const sources = productSources.get(product.id) || { clientGroups: [], productOwners: [] };
                            const hasClientGroupSource = sources.clientGroups.length > 0;
                            const hasProductOwnerSource = sources.productOwners.length > 0;
                            
                            // Check if this product is excluded
                            const isDirectlyExcluded = excludedProductIds.has(product.id);
                            
                            // Check if this product is cascade-excluded via its product owner
                            const cascadeExcludedByOwners: number[] = [];
                            Array.from(cascadeExcludedProductIds.entries()).forEach(([ownerId, productIds]) => {
                              if (productIds.includes(product.id)) {
                                cascadeExcludedByOwners.push(ownerId);
                              }
                            });
                            const isCascadeExcluded = cascadeExcludedByOwners.length > 0;
                            
                            // Combined exclusion status
                            const isExcluded = isDirectlyExcluded || isCascadeExcluded;
                            
                            return (
                              <span 
                                key={product.id} 
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isExcluded ? 'bg-gray-100 text-gray-500' : 'bg-green-100 text-green-800'} group cursor-pointer hover:opacity-80 transition-opacity`}
                                title={isCascadeExcluded ? `Excluded via product owner(s): ${cascadeExcludedByOwners.map(ownerId => {
                                  const owner = productOwners.find(po => po.id === ownerId);
                                  return owner ? owner.name : `ID ${ownerId}`;
                                }).join(', ')}` : 'Click to toggle inclusion/exclusion'}
                                onClick={(e) => {
                                  // Handle click on the entire component (but not if cascade-excluded)
                                  if (!isCascadeExcluded) {
                                    e.stopPropagation();
                                    const newExcludedProducts = new Set(excludedProductIds);
                                    if (isDirectlyExcluded) {
                                      newExcludedProducts.delete(product.id);
                                    } else {
                                      newExcludedProducts.add(product.id);
                                    }
                                    setExcludedProductIds(newExcludedProducts);
                                  }
                                }}
                              >
                                {product.product_name}
                                {/* Show small indicators of source */}
                                {isDirectlySelected && (
                                  <span className={`ml-1 ${isExcluded ? 'text-gray-400' : 'text-green-600'} text-xs`} title="Directly selected">•</span>
                                )}
                                {hasClientGroupSource && (
                                  <span className={`ml-1 ${isExcluded ? 'text-gray-400' : 'text-purple-600'} text-xs`} title="From client group">◆</span>
                                )}
                                {hasProductOwnerSource && (
                                  <span className={`ml-1 ${isExcluded ? 'text-gray-400' : 'text-blue-600'} text-xs`} title={`From product owner(s): ${sources.productOwners.map(ownerId => {
                                    const owner = productOwners.find(po => po.id === ownerId);
                                    return owner ? owner.name : `ID ${ownerId}`;
                                  }).join(', ')}`}>■</span>
                                )}
                                {isCascadeExcluded && (
                                  <span className="ml-1 text-gray-400 text-xs font-bold" title={`Excluded because product owner(s) excluded: ${cascadeExcludedByOwners.map(ownerId => {
                                    const owner = productOwners.find(po => po.id === ownerId);
                                    return owner ? owner.name : `ID ${ownerId}`;
                                  }).join(', ')}`}>↑</span>
                                )}
                                <span 
                                  onClick={(e) => {
                                    // Prevent the parent click handler from firing when clicking the icon
                                    e.stopPropagation();
                                  }}
                                  className={`ml-1.5 ${isCascadeExcluded ? 'text-gray-300 cursor-not-allowed' : isExcluded ? 'text-gray-400 hover:text-gray-600' : 'text-green-400 hover:text-green-600'} focus:outline-none`}
                                  aria-label={isExcluded ? `Include ${product.product_name}` : `Exclude ${product.product_name}`}
                                  title={isCascadeExcluded ? "Enable product owner to include this product" : (isExcluded ? "Include product" : "Exclude product")}
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
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Select items to see related entities.</p>
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
                  <span className="mr-1 text-blue-600">■</span> From product owner
                </span>
                <span className="flex items-center">
                  <span className="mr-1 text-gray-400 font-bold">↑</span> Excluded via owner
                </span>
                <span className="ml-auto italic">Hover for details</span>
              </div>
            </div>
            
            {/* Common Valuation Dates Status */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Valuation Data Status</h3>
              <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg border">
                <div className="flex items-center">
                  {availableValuationDates.length > 0 ? (
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
                    {availableValuationDates.length > 0 ? (
                      <>All portfolio funds have common valuation dates</>
                    ) : relatedProducts.length > 0 ? (
                      <>Portfolio funds do not share common valuation dates</>
                    ) : (
                      <>No products selected</>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {isLoadingValuationDates ? (
                      <>Checking valuation data...</>
                    ) : availableValuationDates.length > 0 ? (
                      <>{availableValuationDates.length} common valuation period{availableValuationDates.length !== 1 ? 's' : ''} available</>
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
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-4 border">
                <h3 className="text-sm font-medium text-gray-700 mb-1">Valuation Period</h3>
                {totalValuation !== null ? (
                  <div>
                    <div className="text-2xl font-semibold text-primary-700">{formatCurrencyWithTruncation(totalValuation)}</div>
                    {earliestTransactionDate && valuationDate ? (
                      <div className="text-xs text-gray-500 mt-1">
                        {formatDateFallback(earliestTransactionDate)} - {formatDateFallback(valuationDate)}
                      </div>
                    ) : valuationDate ? (
                      <div className="text-xs text-gray-500 mt-1">as of {formatDateFallback(valuationDate)}</div>
                    ) : null}
                  </div>
                ) : (
                <div className="text-sm text-gray-500">{isCalculating ? 'Calculating...' : 'No valuation data'}</div>
                )}
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4 border">
                <h3 className="text-sm font-medium text-gray-700 mb-1">Annualised Rate of Return per annum</h3>
                {totalIRR !== null ? (
                  <div className={`text-2xl font-semibold ${totalIRR >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatIrrWithPrecision(totalIRR)}
                  </div>
                ) : (
                <div className="text-sm text-gray-500">{isCalculating ? 'Calculating...' : 'No IRR data'}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      
      {/* Product Period Summary Tables */}
      {productSummaries.length > 0 && (
        <div className="mt-8 w-full">
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
                      Government Uplift
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
                      Average Return p.a.
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
                            {formatCurrencyWithTruncation(0)} {/* Government uplift - placeholder for now */}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                            {formatCurrencyWithTruncation(0)} {/* Product switch in - placeholder for now */}
                            </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                            {formatCurrencyWithTruncation(fund.total_switch_out - fund.total_switch_in)}
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
                              // Calculate profit: (valuation + withdrawals + product switch outs + fund switch outs) - (investments + fund switch ins + government uplift + product switch ins)
                              const gains = fund.current_valuation + fund.total_withdrawal + 0 + fund.total_switch_out; // product switch out is 0 for now
                              const costs = fund.total_investment + fund.total_switch_in + 0 + 0; // government uplift and product switch in are 0 for now
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
                                {formatIrrWithPrecision(fund.irr)}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                            {fund.isVirtual && fund.fund_name !== 'Previous Funds' ? (
                              <span className="text-gray-500">-</span>
                            ) : fund.risk_factor !== undefined && fund.risk_factor !== null ? (
                              <span className="px-2 py-1 text-xs font-medium rounded bg-gray-100">
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
                                {formatCurrencyWithTruncation(0)} {/* Government uplift - placeholder for inactive funds */}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-gray-700">
                                {formatCurrencyWithTruncation(0)} {/* Product switch in - placeholder for inactive funds */}
                                </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-gray-700">
                                {formatCurrencyWithTruncation(inactiveFund.total_switch_out - inactiveFund.total_switch_in)}
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
                                  // Calculate profit for inactive funds: (valuation + withdrawals + product switch outs + fund switch outs) - (investments + fund switch ins + government uplift + product switch ins)
                                  const gains = 0 + inactiveFund.total_withdrawal + 0 + inactiveFund.total_switch_out; // valuation is 0 for inactive funds
                                  const costs = inactiveFund.total_investment + inactiveFund.total_switch_in + 0 + 0; // government uplift and product switch in are 0 for now
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
                                    {formatIrrWithPrecision(inactiveFund.irr)}
                                  </span>
                                ) : (
                                  <span className="text-gray-500">-</span>
                                )}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                                {inactiveFund.risk_factor !== undefined && inactiveFund.risk_factor !== null ? (
                                  <span className="px-2 py-1 text-xs font-medium rounded bg-gray-100">
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
                        {formatCurrencyWithTruncation(0)} {/* Government uplift total - placeholder for now */}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                        {formatCurrencyWithTruncation(0)} {/* Product switch in total - placeholder for now */}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                        {formatCurrencyWithTruncation(product.total_switch_out - product.total_switch_in)}
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
                          // Calculate profit for product total: (valuation + withdrawals + product switch outs + fund switch outs) - (investments + fund switch ins + government uplift + product switch ins)
                          const gains = product.current_valuation + product.total_withdrawal + 0 + product.total_switch_out; // product switch out is 0 for now
                          const costs = product.total_investment + product.total_switch_in + 0 + 0; // government uplift and product switch in are 0 for now
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
                          <span className="px-2 py-1 text-xs font-medium rounded bg-gray-200">
                            {product.weighted_risk.toFixed(1)}
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
                      Government Uplift
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
                      Average Return p.a.
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
                        {formatCurrencyWithTruncation(0)} {/* Government uplift - placeholder for now */}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                        {formatCurrencyWithTruncation(0)} {/* Product switch in - placeholder for now */}
                        </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                        {formatCurrencyWithTruncation(product.total_switch_out - product.total_switch_in)}
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
                          // Calculate profit for portfolio summary: (valuation + withdrawals + product switch outs + fund switch outs) - (investments + fund switch ins + government uplift + product switch ins)
                          const gains = product.current_valuation + product.total_withdrawal + 0 + product.total_switch_out; // product switch out is 0 for now
                          const costs = product.total_investment + product.total_switch_in + 0 + 0; // government uplift and product switch in are 0 for now
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
                            {weightedRisk.toFixed(1)}
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
                      {formatCurrencyWithTruncation(0)} {/* Government uplift total - placeholder for now */}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                      {formatCurrencyWithTruncation(0)} {/* Product switch in total - placeholder for now */}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                      {formatCurrencyWithTruncation(productSummaries.reduce((sum, product) => sum + (product.total_switch_out - product.total_switch_in), 0))}
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
                        // Calculate total portfolio profit: (valuation + withdrawals + product switch outs + fund switch outs) - (investments + fund switch ins + government uplift + product switch ins)
                        const totalGains = productSummaries.reduce((sum, product) => sum + product.current_valuation + product.total_withdrawal + 0 + product.total_switch_out, 0); // product switch out is 0 for now
                        const totalCosts = productSummaries.reduce((sum, product) => sum + product.total_investment + product.total_switch_in + 0 + 0, 0); // government uplift and product switch in are 0 for now
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
                              {finalWeightedRisk.toFixed(1)}
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
