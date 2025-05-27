import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { getProviderColor } from '../services/providerColors';
import { MultiSelectSearchableDropdown } from '../components/ui/SearchableDropdown';

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

interface SelectedItem {
  id: number;
  name: string;
}

// Add new interface for product period summary
interface ProductPeriodSummary {
  id: number;
  product_name: string;
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
}

// Main component
const ReportGenerator: React.FC = () => {
  const { api } = useAuth();
  
  // State for data
  const [clientGroups, setClientGroups] = useState<ClientGroup[]>([]);
  const [productOwners, setProductOwners] = useState<ProductOwner[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [fundData, setFundData] = useState<Fund[]>([]);
  const [portfolioFunds, setPortfolioFunds] = useState<PortfolioFund[]>([]);
  
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

// Fallback formatters - replace with your actual implementations if they exist elsewhere
const formatDateFallback = (dateString: string | null): string => {
  if (!dateString) return '-';
  
  // Handle YYYY-MM format (year-month only)
  const parts = dateString.split('-');
  if (parts.length === 2) {
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]);
    if (isNaN(year) || isNaN(month)) return dateString;
    const dateObj = new Date(year, month - 1);
    if (isNaN(dateObj.getTime())) return dateString;
    return dateObj.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
  }
  
  // Handle full dates (YYYY-MM-DD)
  if (parts.length === 3) {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
  }
  
  return dateString;
};

const formatCurrencyFallback = (amount: number | null): string => {
  if (amount === null || amount === undefined) return '-';
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

const formatPercentageFallback = (value: number | null): string => {
  if (value === null || value === undefined) return '-';
  return `${value.toFixed(2)}%`;
};
  
  // Loading and error states
  const [isLoading, setIsLoading] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);
  
  // Fetch initial data
  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      try {
        const [
          clientGroupsRes,
          allProductsRes,
          fundsRes,
          actualProductOwnersRes
        ] = await Promise.all([
          api.get('/client_groups'),
          api.get('/client_products'),
          api.get('/funds'),
          api.get('/product_owners')
        ]);
        
        setClientGroups(clientGroupsRes.data || []);
        setProducts(allProductsRes.data || []);
        setFundData(fundsRes.data || []);
        
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
        
        // Collect all portfolio funds for the selected products
        const portfolioFundsPromises = portfolioIds.map((portfolioId: number) => 
          api.get(`/portfolio_funds?portfolio_id=${portfolioId}`)
        );
        
        const portfolioFundsResponses = await Promise.all(portfolioFundsPromises);
        const allPortfolioFunds = portfolioFundsResponses.flatMap(res => res.data);
        
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
        
        if (activeFundIds.length === 0) {
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
        
        // Get all historical valuations for each fund (not just the latest)
        const valuationPromises = activeFundIds.map(fundId =>
          api.get(`/fund_valuations`, { params: { portfolio_fund_id: fundId } })
        );
        
        const valuationResponses = await Promise.all(valuationPromises);
        
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

  const calculateIRR = (cashFlows: {date: Date, amount: number}[], maxIterations = 100, precision = 0.000001): number | null => {
    if (cashFlows.length < 2 || cashFlows.filter(cf => cf.amount !== 0).length < 2) {
      console.warn("IRR calculation requires at least two non-zero cash flows.");
      return null;
    }
    const sortedFlows = [...cashFlows].sort((a, b) => a.date.getTime() - b.date.getTime());
    const firstFlowDate = sortedFlows[0].date;
  
    let rate = 0.1; // Initial guess
    for (let i = 0; i < maxIterations; i++) {
      let npv = 0;
      let derivative = 0;
      for (const flow of sortedFlows) {
        const years = (flow.date.getTime() - firstFlowDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
        npv += flow.amount / Math.pow(1 + rate, years);
        if (rate > -1) { 
          derivative += -years * flow.amount / Math.pow(1 + rate, years + 1);
        } else {
          return null; 
        }
      }
      if (Math.abs(npv) < precision) return rate * 100; 
      if (derivative === 0) return null; 
      rate -= npv / derivative;
      if (rate < -0.99) rate = -0.99; 
    }
    console.warn("IRR did not converge after max iterations.");
    return null; 
  };

  const generateReport = async () => {
    if (selectedClientGroupIds.length === 0 && selectedProductOwnerIds.length === 0 && selectedProductIds.length === 0) {
      setDataError('Please select at least one client group, product owner, or product to generate a report.');
      return;
    }
    
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
      
      // Add code to also get products from client-group product owners that aren't directly selected
      // but are shown in the related items and not excluded
      const clientGroupRelatedOwnerIds = Array.from(productOwnerToClientGroup.entries())
        .filter(([ownerId, clientGroups]) => 
          // Owner must be from client groups (not directly selected)
          !selectedProductOwnerIds.includes(ownerId) && 
          // Owner must not be excluded
          !excludedProductOwnerIds.has(ownerId) &&
          // Must have client groups associated
          clientGroups.length > 0
        )
        .map(([ownerId]) => ownerId);

      // Fetch products from these client-group related owners
      for (const ownerId of clientGroupRelatedOwnerIds) {
        try {
          const response = await api.get(`/product_owners/${ownerId}/products`);
          if (response.data && Array.isArray(response.data)) {
            const ownerProducts = response.data as Product[];
            ownerProducts
              .filter(p => !allExcludedProductIds.has(p.id))
              .forEach(p => {
                productIdsForReport.add(p.id);
                if (!products.find(mainP => mainP.id === p.id)) {
                  additionalProductsData.push(p);
                }
              });
          }
        } catch (err) {
          console.error(`Failed to fetch products for client group's PO ${ownerId}:`, err);
        }
      }
      
      const uniqueProductIds = Array.from(productIdsForReport);
      
      if (uniqueProductIds.length === 0) {
        setDataError('No products found for your selection to generate the report.');
        setIsCalculating(false);
        return;
      }
      console.log("Unique Product IDs for report:", uniqueProductIds);

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
        
        // Get portfolio funds for this product
        const portfolioFundsResponse = await api.get(`/portfolio_funds?portfolio_id=${portfolioId}`);
        const productPortfolioFunds = portfolioFundsResponse.data as PortfolioFund[];
        
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
        
        // Skip product if it has no active funds
        if (activeFundIds.size === 0) {
          console.log(`Skipping product ${productDetails.product_name} as it has no active funds`);
          continue;
        }
        
        // Get activity logs for all fund IDs
        const activityLogsPromises = productPortfolioFunds.map(pf => 
          api.get(`/holding_activity_logs?portfolio_fund_id=${pf.id}`)
      );
      const allActivityLogs = (await Promise.all(activityLogsPromises)).flatMap(res => res.data);

        // Get latest valuations
      // Instead of using the all_latest_fund_valuations endpoint which only provides the latest valuation,
      // we need to get all historical valuations for each fund to support historical reports
      const latestValuationFromViewMap = new Map<number, { value: number, valuation_date: string }>();
      
      // Track funds missing valuations for the selected date
      const missingValuationFunds: Array<{id: number, name: string}> = [];
      
      // Create a map to track all valuations by fund ID and date
      const allFundValuations = new Map<number, { [dateKey: string]: { value: number, valuation_date: string } }>();
      
      // Fetch all historical valuations for each fund
      const valuationPromises = productPortfolioFunds.map(pf => 
        api.get(`/fund_valuations?portfolio_fund_id=${pf.id}`)
      );
      
      const valuationResponses = await Promise.all(valuationPromises);
      
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
          if (val.value != null && val.valuation_date != null) {
            const dateParts = val.valuation_date.split('-');
            
            if (dateParts.length >= 2) {
              const valuationYearMonth = `${dateParts[0]}-${dateParts[1]}`;
              
              // Store this valuation by year-month
              fundValuationsMap[valuationYearMonth] = {
                value: parseFloat(val.value),
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
      allActivityLogs.forEach((log: any) => {
          if (!log.activity_timestamp || !log.amount) return;
        const parsedAmount = parseFloat(log.amount);
          if (parsedAmount === 0) return;
          
          // Track the earliest activity date as the product's start date
          if (!productStartDate || new Date(log.activity_timestamp) < new Date(productStartDate)) {
            productStartDate = log.activity_timestamp;
          }
        
        switch(log.activity_type) {
            case 'Investment': case 'RegularInvestment': case 'GovernmentUplift': 
              totalInvestment += parsedAmount; 
              break;
            case 'Withdrawal': case 'RegularWithdrawal':
              totalWithdrawal += parsedAmount; 
              break;
            case 'SwitchIn': 
              totalSwitchIn += parsedAmount; 
              break;
            case 'SwitchOut': 
              totalSwitchOut += parsedAmount; 
              break;
          }
        });
        
        // Calculate current valuation (only from active funds)
        let mostRecentValuationDate: string | null = null;
        productPortfolioFunds.forEach(pf => {
          if (!inactiveFundIds.has(pf.id)) {
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
        
        // Check if this product has zero valuation but has active funds
        if (productValuation === 0 && activeFundIds.size > 0) {
          // Add zero-valuation product to missing valuations list
          activeFundIds.forEach(fundId => {
            const fundInfo = productPortfolioFunds.find(pf => pf.id === fundId);
            const fundName = fundInfo?.fund_name || `Fund ID: ${fundId}`;
            
            allMissingValuations.push({
              productName: productDetails.product_name,
              fundName: fundName
            });
          });
          
          console.log(`Product ${productDetails.product_name} has zero valuation for selected date`);
          continue; // Skip this product
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
          
          // Calculate totals for this fund
          let fundInvestment = 0;
          let fundWithdrawal = 0;
          let fundSwitchIn = 0;
          let fundSwitchOut = 0;
          
          fundLogs.forEach(log => {
            if (!log.amount) return;
            const amount = parseFloat(log.amount);
            
            switch(log.activity_type) {
              case 'Investment': case 'RegularInvestment': case 'GovernmentUplift': 
                fundInvestment += amount; 
                break;
              case 'Withdrawal': case 'RegularWithdrawal':
                fundWithdrawal += amount; 
                break;
              case 'SwitchIn': 
                fundSwitchIn += amount; 
                break;
              case 'SwitchOut': 
                fundSwitchOut += amount; 
                break;
            }
          });
          
          // Get current valuation
          let fundValuation = 0;
          if (!inactiveFundIds.has(portfolioFund.id)) {
            const latestVal = latestValuationFromViewMap.get(portfolioFund.id);
              if (latestVal) {
              fundValuation = latestVal.value;
            }
          }
          
          // Get fund IRR from the fetched values
          const fundIRR = fundIRRMap.get(portfolioFund.id) || null;
          
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
            risk_factor: riskFactor // Use the risk factor from the available fund
          });
        }

        // Calculate product IRR using the cash flow aggregation method
        let productIRR: number | null = null;
        
        if (fundSummaries.length > 0 && productValuation > 0) {
          // Group all activity logs by month across all funds in this product
          const monthlyNetCashFlows = new Map<string, number>();
          const monthlyDates = new Map<string, Date>();
          
          // Create a flattened array of all activity logs for this product
          const allActiveLogs = allActivityLogs.filter(log => {
            // Only include logs from active funds
            const fundId = log.portfolio_fund_id;
            if (inactiveFundIds.has(fundId)) {
              return false;
            }
            
            // Apply date filtering if a valuation date is selected
            if (selectedValuationDate && log.activity_timestamp) {
              const logDate = new Date(log.activity_timestamp);
              const logYearMonth = `${logDate.getFullYear()}-${String(logDate.getMonth() + 1).padStart(2, '0')}`;
              
              // Only include logs from selected month or earlier
              return logYearMonth <= selectedValuationDate;
            }
            
            return true;
          });
          
          // Process each log to build monthly cash flows
          allActiveLogs.forEach(log => {
            if (!log.activity_timestamp || !log.amount) return;
            
            const date = new Date(log.activity_timestamp);
            const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            
            // Initialize if needed
            if (!monthlyNetCashFlows.has(monthYear)) {
              monthlyNetCashFlows.set(monthYear, 0);
              monthlyDates.set(monthYear, new Date(date.getFullYear(), date.getMonth(), 15)); // Middle of month
            }
            
            // Categorize and add to net cash flow
            let cashFlowAmount = 0;
            const amount = parseFloat(log.amount);
            
            switch(log.activity_type) {
              case 'Investment':
              case 'RegularInvestment':
              case 'GovernmentUplift':
              case 'SwitchIn':
                cashFlowAmount = -Math.abs(amount); // Negative - money going in
                break;
              case 'Withdrawal':
              case 'RegularWithdrawal':
              case 'SwitchOut':
                cashFlowAmount = Math.abs(amount); // Positive - money coming out
                break;
              default:
                // Ignore other activity types
                break;
            }
            
            const currentTotal = monthlyNetCashFlows.get(monthYear) || 0;
            monthlyNetCashFlows.set(monthYear, currentTotal + cashFlowAmount);
          });
          
          // Convert to array of cash flows for IRR calculation
          const cashFlows: {date: Date, amount: number}[] = [];
          
          // Add each month's net cash flow
          monthlyNetCashFlows.forEach((amount, monthYear) => {
            if (amount !== 0) { // Only include non-zero cash flows
              cashFlows.push({
                date: monthlyDates.get(monthYear)!,
                amount: amount
              });
            }
          });
          
          // Add valuation as the final cash flow
          // If we have a selected valuation date, use the last day of that month 
          // instead of current date
          let finalCashflowDate = new Date(); // Default to current date
          if (selectedValuationDate) {
            const [year, month] = selectedValuationDate.split('-').map(part => parseInt(part));
            
            // Create date for the last day of the selected month
            // (month is 0-indexed in JS Date, so we use the next month's 0th day 
            // which is the last day of current month)
            finalCashflowDate = new Date(year, month, 0);
          }
          
          cashFlows.push({
            date: finalCashflowDate,
            amount: productValuation
          });
          
          // Calculate IRR using the Newton-Raphson method
          if (cashFlows.length >= 2) {
            productIRR = calculateIRR(cashFlows);
            console.log(`Calculated IRR for product ${productId} using cash flow aggregation: ${productIRR}`);
          } else {
            console.warn(`Insufficient cash flows to calculate IRR for product ${productId}`);
          }
        }

        // Helper function to create a virtual "Previous Funds" entry
        const createPreviousFundsEntry = (inactiveFunds: FundSummary[]): FundSummary | null => {
          if (inactiveFunds.length === 0) return null;
          
          // Sum up all values from inactive funds
          const totalInvestment = inactiveFunds.reduce((sum, fund) => sum + fund.total_investment, 0);
          const totalWithdrawal = inactiveFunds.reduce((sum, fund) => sum + fund.total_withdrawal, 0);
          const totalSwitchIn = inactiveFunds.reduce((sum, fund) => sum + fund.total_switch_in, 0);
          const totalSwitchOut = inactiveFunds.reduce((sum, fund) => sum + fund.total_switch_out, 0);
          const totalValuation = inactiveFunds.reduce((sum, fund) => sum + fund.current_valuation, 0);
          
          // Create a virtual entry with aggregated values
          return {
            id: -1, // Special ID for virtual fund
            available_funds_id: -1,
            fund_name: 'Previous Funds',
            total_investment: totalInvestment,
            total_withdrawal: totalWithdrawal,
            total_switch_in: totalSwitchIn,
            total_switch_out: totalSwitchOut,
            net_flow: totalInvestment - totalWithdrawal + totalSwitchIn - totalSwitchOut,
            current_valuation: totalValuation,
            irr: null, // Don't calculate IRR for Previous Funds
            isVirtual: true, // Flag to identify this as a virtual entry
            status: 'virtual',
            inactiveFundCount: inactiveFunds.length, // Add count of inactive funds
            risk_factor: inactiveFunds[0]?.risk_factor // Add risk factor of inactive funds
          };
        };
        
        // Separate active and inactive funds
        const activeFunds = fundSummaries.filter(fund => fund.status === 'active');
        const inactiveFunds = fundSummaries.filter(fund => fund.status !== 'active');
        
        // Create the Previous Funds entry if there are inactive funds
        const previousFundsEntry = createPreviousFundsEntry(inactiveFunds);
        
        // Prepare final fund list - active funds first, then Previous Funds if it exists
        const finalFundList = [...activeFunds];
        if (previousFundsEntry) {
          finalFundList.push(previousFundsEntry);
        }
        
        // Add to summary results with fund data
        productSummaryResults.push({
          id: productId,
          product_name: productDetails.product_name,
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
          funds: finalFundList
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
      
      // Check if total valuation is zero
      if (overallValuation === 0) {
        setDataError(`Total portfolio value is zero for ${formatDateFallback(selectedValuationDate || '')}. Cannot calculate returns on a zero-value portfolio.`);
        setIsCalculating(false);
        return;
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
      
      // Calculate overall IRR using the cash flow aggregation method
      if (productSummaryResults.length > 0 && overallValuation > 0) {
        // Collect all activity logs across all products
        const allActivityLogs: any[] = [];
        
        // Get all unique months where any activity occurred
        const monthlyNetCashFlows = new Map<string, number>();
        const monthlyDates = new Map<string, Date>();
        
        // Process all activity logs for all products
        for (const product of productSummaryResults) {
          // Skip products without valid funds
          if (!product.funds || product.funds.length === 0) continue;
          
          // Go through each fund's activity logs
          for (const fund of product.funds) {
            // Skip virtual/inactive funds
            if (fund.isVirtual) continue;
            
            // Get logs for this fund from the API and process them
            try {
              const logsResponse = await api.get(`/holding_activity_logs?portfolio_fund_id=${fund.id}`);
              const fundLogs = logsResponse.data || [];
              
              // Filter logs by the selected valuation date
              const filteredLogs = fundLogs.filter((log: any) => {
                if (!log.activity_timestamp) return false;
                
                // If a valuation date is selected, only include logs up to that date
                if (selectedValuationDate) {
                  const logDate = new Date(log.activity_timestamp);
                  const logYearMonth = `${logDate.getFullYear()}-${String(logDate.getMonth() + 1).padStart(2, '0')}`;
                  return logYearMonth <= selectedValuationDate;
                }
                
                return true;
              });
              
              filteredLogs.forEach((log: any) => {
                if (!log.activity_timestamp || !log.amount) return;
                
                // Process each log entry
                const date = new Date(log.activity_timestamp);
                const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                
                // Initialize if needed
                if (!monthlyNetCashFlows.has(monthYear)) {
                  monthlyNetCashFlows.set(monthYear, 0);
                  monthlyDates.set(monthYear, new Date(date.getFullYear(), date.getMonth(), 15)); // Middle of month
                }
                
                // Add to net cash flow (negative for investments, positive for withdrawals)
                let cashFlowAmount = 0;
                
                switch(log.activity_type) {
                  case 'Investment':
                  case 'RegularInvestment':
                  case 'GovernmentUplift':
                  case 'SwitchIn':
                    cashFlowAmount = -Math.abs(parseFloat(log.amount)); // Negative - money going in
                    break;
                  case 'Withdrawal':
                  case 'RegularWithdrawal':
                  case 'SwitchOut':
                    cashFlowAmount = Math.abs(parseFloat(log.amount)); // Positive - money coming out
                    break;
                  default:
                    // Ignore other activity types
                    break;
                }
                
                const currentTotal = monthlyNetCashFlows.get(monthYear) || 0;
                monthlyNetCashFlows.set(monthYear, currentTotal + cashFlowAmount);
              });
            } catch (err) {
              console.warn(`Failed to get activity logs for fund ${fund.id}`, err);
            }
          }
        }
        
        // Convert to array of cash flows
        const cashFlows: {date: Date, amount: number}[] = [];
        
        // Add each month's net cash flow
        monthlyNetCashFlows.forEach((amount, monthYear) => {
          if (amount !== 0) { // Only include non-zero cash flows
            cashFlows.push({
              date: monthlyDates.get(monthYear)!,
              amount: amount
            });
          }
        });
        
        // Add current total valuation as the final cash flow
        let finalCashflowDate = new Date(); // Default to current date
        
        // If we have a selected valuation date, use the last day of that month
        if (selectedValuationDate) {
          const [year, month] = selectedValuationDate.split('-').map(part => parseInt(part));
          
          // Create date for the last day of the selected month
          finalCashflowDate = new Date(year, month, 0);
        }
        
        cashFlows.push({
          date: finalCashflowDate,
          amount: overallValuation
        });
        
        // Calculate IRR using the Newton-Raphson method
        if (cashFlows.length >= 2) {
          const calculatedIRR = calculateIRR(cashFlows);
          setTotalIRR(calculatedIRR);
          console.log('Calculated total IRR using cash flow aggregation:', calculatedIRR);
        } else {
          setTotalIRR(null);
          console.warn('Insufficient cash flows to calculate IRR');
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
    // Assuming risk is on a 1-10 scale
    return risk.toString();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-normal text-gray-900 font-sans tracking-wide mb-6">
        Report Generator
      </h1>
      
      {/* Error display for initial load errors */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
              <p className="text-red-700">{error}</p>
            </div>
      )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            
            <div className="mt-6">
              <button
                onClick={generateReport}
                disabled={isCalculating || isLoading}
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
                              <span key={owner.id} className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badgeStyle} group`}>
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
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // Toggle exclusion instead of removing sources
                                    const newExcludedOwners = new Set(excludedProductOwnerIds);
                                    if (isExcluded) {
                                      newExcludedOwners.delete(owner.id);
                                    } else {
                                      newExcludedOwners.add(owner.id);
                                    }
                                    setExcludedProductOwnerIds(newExcludedOwners);
                                  }}
                                  className={`ml-1.5 ${isExcluded ? 'text-gray-400 hover:text-gray-600' : 'text-blue-400 hover:text-blue-600'} focus:outline-none`}
                                  aria-label={buttonTitle}
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
                                </button>
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
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isExcluded ? 'bg-gray-100 text-gray-500' : 'bg-green-100 text-green-800'} group`}
                                title={isCascadeExcluded ? `Excluded via product owner(s): ${cascadeExcludedByOwners.map(ownerId => {
                                  const owner = productOwners.find(po => po.id === ownerId);
                                  return owner ? owner.name : `ID ${ownerId}`;
                                }).join(', ')}` : ''}
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
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // Toggle direct exclusion
                                    const newExcludedProducts = new Set(excludedProductIds);
                                    if (isDirectlyExcluded) {
                                      newExcludedProducts.delete(product.id);
                                    } else {
                                      newExcludedProducts.add(product.id);
                                    }
                                    setExcludedProductIds(newExcludedProducts);
                                  }}
                                  // Disable the button if cascade-excluded (can only re-include by including the owner)
                                  disabled={isCascadeExcluded}
                                  className={`ml-1.5 ${isCascadeExcluded ? 'text-gray-300 cursor-not-allowed' : isExcluded ? 'text-gray-400 hover:text-gray-600' : 'text-green-400 hover:text-green-600'} focus:outline-none`}
                                  aria-label={isExcluded ? `Include ${product.product_name}` : `Exclude ${product.product_name}`}
                                  title={isCascadeExcluded ? "Enable product owner to include this product" : ""}
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
                                </button>
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
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-4 border">
                <h3 className="text-sm font-medium text-gray-700 mb-1">Valuation Period</h3>
                {totalValuation !== null ? (
                  <div>
                    <div className="text-2xl font-semibold text-primary-700">{formatCurrencyFallback(totalValuation)}</div>
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
                    {formatPercentageFallback(totalIRR)}
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
        <div className="mt-8">
          <h2 className="text-2xl font-normal text-gray-900 font-sans tracking-wide mb-4">
            Product Period Overview
          </h2>
          
          {/* New overall totals table */}
          <div className="mb-8 bg-white shadow-sm rounded-lg border border-gray-200 p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Portfolio Total Summary</h3>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-100">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                      Product
                    </th>
                    <th scope="col" className="px-4 py-3 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider">
                      Risk
                    </th>
                    <th scope="col" className="px-4 py-3 text-right text-sm font-semibold text-gray-700 uppercase tracking-wider">
                      Investment
                    </th>
                    <th scope="col" className="px-4 py-3 text-right text-sm font-semibold text-gray-700 uppercase tracking-wider">
                      Withdrawal
                    </th>
                    <th scope="col" className="px-4 py-3 text-right text-sm font-semibold text-gray-700 uppercase tracking-wider">
                      Fund Switch In
                    </th>
                    <th scope="col" className="px-4 py-3 text-right text-sm font-semibold text-gray-700 uppercase tracking-wider">
                      Fund Switch Out
                    </th>
                    <th scope="col" className="px-4 py-3 text-right text-sm font-semibold text-gray-700 uppercase tracking-wider">
                      Valuation
                    </th>
                    <th scope="col" className="px-4 py-3 text-right text-sm font-semibold text-gray-700 uppercase tracking-wider">
                      Annualised Rate of Return per annum
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
                    <tr key={product.id} className="hover:bg-blue-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800">
                        <div className="flex items-center gap-2">
                          {product.provider_theme_color && (
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: product.provider_theme_color }}
                            />
                          )}
                          {product.product_name}
                        </div>
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
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                        {formatCurrencyFallback(product.total_investment)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                        {formatCurrencyFallback(product.total_withdrawal)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                        {formatCurrencyFallback(product.total_switch_in)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                        {formatCurrencyFallback(product.total_switch_out)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-primary-700 text-right">
                        {formatCurrencyFallback(product.current_valuation)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                        {product.irr !== null ? (
                          <span className={product.irr >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {formatPercentageFallback(product.irr)}
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
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800">
                      PORTFOLIO TOTAL ({productSummaries.length} {productSummaries.length === 1 ? 'Product' : 'Products'})
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
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                      {formatCurrencyFallback(productSummaries.reduce((sum, product) => sum + product.total_investment, 0))}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                      {formatCurrencyFallback(productSummaries.reduce((sum, product) => sum + product.total_withdrawal, 0))}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                      {formatCurrencyFallback(productSummaries.reduce((sum, product) => sum + product.total_switch_in, 0))}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                      {formatCurrencyFallback(productSummaries.reduce((sum, product) => sum + product.total_switch_out, 0))}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-primary-700 text-right">
                      {formatCurrencyFallback(productSummaries.reduce((sum, product) => sum + product.current_valuation, 0))}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                      {totalIRR !== null ? (
                        <span className={totalIRR >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {formatPercentageFallback(totalIRR)}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          
          {productSummaries.map(product => (
            <div key={product.id} className="mb-8 bg-white shadow-sm rounded-lg border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                {product.provider_theme_color && (
                  <div 
                    className="w-4 h-4 rounded-full" 
                    style={{ backgroundColor: product.provider_theme_color }}
                  />
                )}
                <h3 className="text-xl font-semibold text-gray-800">
                  {product.product_name}
                  {product.provider_name && (
                    <span className="text-sm font-normal text-gray-500 ml-2">
                      ({product.provider_name})
                    </span>
                  )}
                </h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-3 border">
                  <div className="text-xs font-medium text-gray-500 uppercase mb-1">Current Valuation</div>
                  <div className="text-lg font-semibold text-primary-700">
                    {formatCurrencyFallback(product.current_valuation)}
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-3 border">
                  <div className="text-xs font-medium text-gray-500 uppercase mb-1">Annualised Rate of Return per annum</div>
                  {product.irr !== null ? (
                    <div className={`text-lg font-semibold ${product.irr >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatPercentageFallback(product.irr)}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">Not available</div>
                  )}
                </div>
                
                <div className="bg-gray-50 rounded-lg p-3 border">
                  <div className="text-xs font-medium text-gray-500 uppercase mb-1">Time Period</div>
                  <div className="text-lg font-semibold text-gray-700">
                    {product.start_date && valuationDate ? (
                      <>{formatDateFallback(product.start_date)} - {formatDateFallback(valuationDate)}</>
                    ) : product.start_date ? (
                      <>{formatDateFallback(product.start_date)} - Current</>
                    ) : (
                      'N/A'
                    )}
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-3 border">
                  <div className="text-xs font-medium text-gray-500 uppercase mb-1">Net Investment</div>
                  <div className="text-lg font-semibold text-gray-700">
                    {formatCurrencyFallback(product.net_flow)}
                  </div>
                </div>
              </div>
              
          <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-100">
                <tr>
                      <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">
                        Fund Name
                  </th>
                      <th scope="col" className="px-4 py-3 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider">
                        Risk
                      </th>
                      <th scope="col" className="px-4 py-3 text-right text-sm font-semibold text-gray-700 uppercase tracking-wider">
                        Investment
                    </th>
                      <th scope="col" className="px-4 py-3 text-right text-sm font-semibold text-gray-700 uppercase tracking-wider">
                        Withdrawal
                      </th>
                      <th scope="col" className="px-4 py-3 text-right text-sm font-semibold text-gray-700 uppercase tracking-wider">
                        Fund Switch In
                      </th>
                      <th scope="col" className="px-4 py-3 text-right text-sm font-semibold text-gray-700 uppercase tracking-wider">
                        Fund Switch Out
                      </th>
                      <th scope="col" className="px-4 py-3 text-right text-sm font-semibold text-gray-700 uppercase tracking-wider">
                        Valuation
                      </th>
                      <th scope="col" className="px-4 py-3 text-right text-sm font-semibold text-gray-700 uppercase tracking-wider">
                        Annualised Rate of Return per annum
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                    {product.funds && product.funds.length > 0 ? (
                      product.funds.map(fund => (
                        <tr key={fund.id} className={`hover:bg-blue-50 ${fund.isVirtual ? 'bg-gray-100 font-medium' : ''}`}>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-800">
                            {fund.fund_name}
                            {fund.isVirtual && fund.inactiveFundCount && (
                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-800">
                                {fund.inactiveFundCount} {fund.inactiveFundCount === 1 ? 'fund' : 'funds'}
                              </span>
                            )}
                            {fund.isin_number && (
                              <span className="block text-xs text-gray-500">{fund.isin_number}</span>
                            )}
                      </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                            {fund.isVirtual ? (
                              <span className="text-gray-500">-</span>
                            ) : (
                              <span className="px-2 py-1 text-xs font-medium rounded bg-gray-100">
                                {formatRiskFallback(fund.risk_factor)}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                            {formatCurrencyFallback(fund.total_investment)}
                        </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                            {formatCurrencyFallback(fund.total_withdrawal)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                            {formatCurrencyFallback(fund.total_switch_in)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                            {formatCurrencyFallback(fund.total_switch_out)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-primary-700 text-right">
                            {formatCurrencyFallback(fund.current_valuation)}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                            {fund.isVirtual ? (
                              <span className="text-gray-500">-</span>
                            ) : fund.irr !== null ? (
                              <span className={fund.irr >= 0 ? 'text-green-600' : 'text-red-600'}>
                                {formatPercentageFallback(fund.irr)}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                      </td>
                    </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="px-4 py-4 text-center text-sm text-gray-500">
                          No fund data available
                        </td>
                      </tr>
                    )}
                    
                    {/* Product Total Row */}
                    <tr className="bg-gray-100 font-semibold border-t-2 border-gray-400">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-800">
                        PRODUCT TOTAL
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                        {/* Risk not applicable for totals */}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                        {formatCurrencyFallback(product.total_investment)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                        {formatCurrencyFallback(product.total_withdrawal)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                        {formatCurrencyFallback(product.total_switch_in)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                        {formatCurrencyFallback(product.total_switch_out)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-primary-700 text-right">
                        {formatCurrencyFallback(product.current_valuation)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                        {product.irr !== null ? (
                          <span className={product.irr >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {formatPercentageFallback(product.irr)}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
              </tbody>
            </table>
          </div>
            </div>
          ))}
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