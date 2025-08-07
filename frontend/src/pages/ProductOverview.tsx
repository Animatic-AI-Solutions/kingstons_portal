import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DatePicker } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';
import { getProductFUM, calculateStandardizedMultipleFundsIRR, lapseProduct, reactivateProduct } from '../services/api';
import { 
  MultiSelectDropdown, 
  AutocompleteSearch, 
  AutocompleteOption,
  BaseInput,
  BaseDropdown,
  DateInput,
  ActionButton
} from '../components/ui';
import { isCashFund } from '../utils/fundUtils';
import { getProductOwnerDisplayName } from '../utils/productOwnerUtils';
import { useSmartNavigation } from '../hooks/useSmartNavigation';




// Basic interfaces for type safety
interface Account {
  id: number;
  client_product_id?: number;
  client_id?: number;
  client_name?: string;
  product_name: string;
  status: string;
  start_date: string;
  end_date?: string;
  plan_number?: string;
  provider_id?: number;
  provider_name?: string;
  provider_theme_color?: string;
  product_type?: string;
  portfolio_id?: number;
  notes?: string;
  total_value?: number;
  irr?: number;
  template_generation_id?: number;
  template_info?: {
    id: number;
    generation_name: string;
    name?: string;
  };
  target_risk?: number;
  is_bespoke?: boolean;
  current_portfolio?: {
    id: number;
    portfolio_name: string;
    assignment_start_date: string;
  };
  portfolio_details?: {
    portfolio_name: string;
    start_date: string;
  };
  fixed_cost?: number;
  percentage_fee?: number;
}

interface Holding {
  id: number;
  fund_name?: string;
  isin_number?: string;
  target_weighting?: string;
  template_weighting?: number;
  amount_invested: number;
  market_value: number;
  irr?: number;
  irr_date?: string;
  fund_id?: number;
  valuation_date?: string;
  isVirtual?: boolean;
  status?: string;
  end_date?: string;
  riskFactor?: number;
  inactiveFunds?: Holding[];
}

interface ProductOwner {
  id: number;
  firstname?: string;
  surname?: string;
  known_as?: string;
  name?: string; // Computed field from backend
  status?: string;
}

interface Provider {
  id: number;
  name: string;
  status?: string;
  theme_color?: string;
}

interface Portfolio {
  id: number;
  portfolio_name: string;
  status?: string;
}

// New interfaces for portfolio fund management
interface Fund {
  id: number;
  fund_name: string;
  isin_number: string;
  risk_factor?: number;
  status?: string;
  fund_cost?: number;
}

interface PortfolioFund {
  id: number;
  portfolio_id: number;
  available_funds_id: number;
  weighting: number;
  start_date: string;
  end_date?: string;
  amount_invested: number;
  status: string;
  fund_name?: string;
  fund_isin?: string;
  fund_risk?: number;
}

interface ProductOverviewProps {
  accountId?: string;
}

const ProductOverview: React.FC<ProductOverviewProps> = ({ accountId: propAccountId }) => {
  const { accountId: paramAccountId } = useParams<{ accountId: string }>();
  const accountId = propAccountId || paramAccountId;
  const navigate = useNavigate();
  const { api } = useAuth();
  const { navigateBack } = useSmartNavigation();
  const [account, setAccount] = useState<Account | null>(null);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  
  // Product type options
  const productTypeOptions = [
    { value: 'ISA', label: 'ISA' },
    { value: 'GIA', label: 'GIA' },
    { value: 'Onshore Bond', label: 'Onshore Bond' },
    { value: 'Offshore Bond', label: 'Offshore Bond' },
    { value: 'Pension', label: 'Pension' },
    { value: 'Other', label: 'Other' }
  ];
  
  // Lapse state
  const [isLapseModalOpen, setIsLapseModalOpen] = useState(false);
  const [isLapsing, setIsLapsing] = useState(false);
  const [lapseError, setLapseError] = useState<string | null>(null);

  // Reactivate state
  const [isReactivateModalOpen, setIsReactivateModalOpen] = useState(false);
  const [isReactivating, setIsReactivating] = useState(false);
  const [reactivateError, setReactivateError] = useState<string | null>(null);
  const [fundsData, setFundsData] = useState<Map<number, any>>(new Map());
  const [lastValuationDate, setLastValuationDate] = useState<string | null>(null);
  const [targetRisk, setTargetRisk] = useState<number | null>(null);
  const [displayedTargetRisk, setDisplayedTargetRisk] = useState<string>("N/A");
  const [productOwners, setProductOwners] = useState<ProductOwner[]>([]);
  const [liveRiskValue, setLiveRiskValue] = useState<number | null>(null);
  
  // Portfolio summary state
  const [portfolioIRR, setPortfolioIRR] = useState<number | null>(null);
  const [portfolioTotalValue, setPortfolioTotalValue] = useState<number | null>(null);
  const [isLoadingPortfolioSummary, setIsLoadingPortfolioSummary] = useState(false);
  
  // Edit mode state and form data
  const [isEditMode, setIsEditMode] = useState(false);
  // const [isEditOwnersMode, setIsEditOwnersMode] = useState(false); // No longer needed - owners editing integrated into main edit mode
  const [providers, setProviders] = useState<Provider[]>([]);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [allProductOwners, setAllProductOwners] = useState<ProductOwner[]>([]);
  const [editFormData, setEditFormData] = useState({
    product_name: '',
    provider_id: '',
    product_type: '',
    plan_number: '',
    target_risk: '',
    start_date: null as Dayjs | null,
    fixed_cost: '' as string,
    percentage_fee: '' as string
  });
  const [editOwnersFormData, setEditOwnersFormData] = useState({
    portfolio_id: '',
    selected_owner_ids: [] as number[]
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittingOwners, setIsSubmittingOwners] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [ownersFormError, setOwnersFormError] = useState<string | null>(null);
  
  // Previous Funds expansion state
  const [isPreviousFundsExpanded, setIsPreviousFundsExpanded] = useState(false);

  // Portfolio fund management state (simplified)
  const [isEditingFunds, setIsEditingFunds] = useState(false);
  const [isSavingFunds, setIsSavingFunds] = useState(false);
  const [fundError, setFundError] = useState<string | null>(null);
  const [fundSearchTerm, setFundSearchTerm] = useState('');
  const [availableFunds, setAvailableFunds] = useState<Fund[]>([]);
  
  // Backup state for target weightings when entering edit mode
  const [originalTargetWeightings, setOriginalTargetWeightings] = useState<Map<number, string>>(new Map());

  // Add caching state for template data to prevent duplicate calls
  const [templateDataCache, setTemplateDataCache] = useState<Map<number, {
    generation: any;
    templateWeightings: Map<number, number>;
  }>>(new Map());

  // Memoize fetchData to prevent unnecessary re-calls
  const memoizedFetchData = useMemo(() => {
    let lastCallTime = 0;
    const cooldownPeriod = 1000; // 1 second cooldown
    
    return async (accountId: string) => {
      const now = Date.now();
      if (now - lastCallTime < cooldownPeriod) {
        console.log('🔄 Preventing duplicate fetchData call within cooldown period');
        return;
      }
      lastCallTime = now;
      
      console.log('ProductOverview: Fetching data for accountId:', accountId);
      await fetchData(accountId);
    };
  }, [api]); // Only depend on api

  useEffect(() => {
    if (accountId) {
      memoizedFetchData(accountId);
    } else {
      console.error('ProductOverview: No accountId available for data fetching');
    }
  }, [accountId, memoizedFetchData]);

  // Call the async function to calculate target risk and update state - runs whenever account changes
  useEffect(() => {

    if (account && holdings.length > 0 && fundsData.size > 0) {

      calculateTargetRisk().then(risk => {
        setDisplayedTargetRisk(risk);
      });
    }

  }, [account?.id, holdings, fundsData]); // Depend on holdings and fundsData as well


  // Calculate live risk whenever holdings change
  useEffect(() => {
    if (holdings.length > 0) {
      const liveRisk = calculateLiveRisk();
      if (liveRisk !== "N/A") {
        setLiveRiskValue(parseFloat(liveRisk));
      } else {
        setLiveRiskValue(null);
      }
    }
  }, [holdings]);

  // Fetch providers and portfolios when entering edit mode
  useEffect(() => {
    const fetchFormOptions = async () => {
      try {
        const [providersRes, portfoliosRes] = await Promise.all([
          api.get('/available_providers'),
          api.get('/portfolios')
        ]);
        
        setProviders(providersRes.data || []);
        setPortfolios(portfoliosRes.data || []);
      } catch (err) {
        console.error('Error fetching form options:', err);
      }
    };

    if (isEditMode) {
      fetchFormOptions();
    }
  }, [isEditMode, api]);

  const fetchData = async (accountId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await api.get(`/api/client_products/${accountId}/complete`);
      const completeData = response.data;

      // Set product owners for this specific product
      if (completeData.product_owners) {
        setProductOwners(completeData.product_owners);
      }

      // Fetch all available product owners for editing
      try {
        const allOwnersResponse = await api.get('/product_owners');
        setAllProductOwners(allOwnersResponse.data);
      } catch (err) {
        console.error('Error fetching all product owners:', err);
      }
      
      console.log('ProductOverview: Complete product data received:', completeData);
      
      // Set account data directly from the response
      setAccount(completeData);
      
      console.log('Product owners loaded:', completeData.product_owners?.length || 0);
      
      // Fetch portfolio summary after account data is loaded
      await fetchPortfolioSummary(accountId, completeData);
      
      // Set fund data map
      const fundsMap = new Map<number, any>();
      if (completeData.portfolio_funds) {
        // Each portfolio fund has fund_details embedded in it
        completeData.portfolio_funds.forEach((pf: any) => {
          if (pf.fund_details) {
            fundsMap.set(pf.fund_details.id, pf.fund_details);
          }
        });
      }
      setFundsData(fundsMap);
      
      // Fetch template weightings if template_generation_id exists (with caching and batch endpoint)
      let templateWeightings = new Map<number, number>();
      if (completeData.template_generation_id) {
        // Check cache first
        const cachedData = templateDataCache.get(completeData.template_generation_id);
        if (cachedData) {
          console.log('✅ Using cached template data for generation:', completeData.template_generation_id);
          templateWeightings = cachedData.templateWeightings;
        } else {
          try {
            console.log('🚀 Fetching fresh template data using batch endpoint for generation:', completeData.template_generation_id);
            
            // Use the new batch endpoint to get both generation and funds in a single call
            const batchResponse = await api.get(`/api/available_portfolios/batch/generation-with-funds/${completeData.template_generation_id}`);
            
            if (batchResponse.data && batchResponse.data.template_weightings) {
              // Convert the template_weightings object to a Map
              Object.entries(batchResponse.data.template_weightings).forEach(([fundId, weighting]) => {
                templateWeightings.set(parseInt(fundId), weighting as number);
              });
            }
            
            // Cache the results
            setTemplateDataCache(prev => new Map(prev).set(completeData.template_generation_id, {
              generation: batchResponse.data.generation,
              templateWeightings: new Map(templateWeightings)
            }));
            
            console.log('✅ Cached template data from batch endpoint for generation:', completeData.template_generation_id);
            console.log(`✅ Reduced 2 API calls to 1 batch call - Funds loaded: ${Object.keys(batchResponse.data.template_weightings || {}).length}`);
          } catch (err) {
            console.warn('Failed to fetch template weightings:', err);
          }
        }
      }
      
      // Process holdings from portfolio_funds
      if (completeData.portfolio_funds && completeData.portfolio_funds.length > 0) {
        const processedHoldings = completeData.portfolio_funds.map((pf: any) => {
          // Standardize weighting value - no conversion needed since database stores percentages
          let standardizedWeighting = pf.target_weighting;
          if (standardizedWeighting !== null && standardizedWeighting !== undefined) {
            standardizedWeighting = typeof standardizedWeighting === 'string' 
              ? parseFloat(standardizedWeighting) 
              : standardizedWeighting;
          }
          
          // Get template weighting for this fund if available
          const templateWeighting = pf.available_funds_id ? templateWeightings.get(pf.available_funds_id) : undefined;
          
          return {
            id: pf.id,
            fund_name: pf.fund_name || 'Unknown Fund',
            fund_id: pf.available_funds_id,
            isin_number: pf.isin_number || 'N/A',
            target_weighting: standardizedWeighting,
            template_weighting: templateWeighting,
            amount_invested: pf.amount_invested || 0,
            market_value: pf.market_value !== undefined ? pf.market_value : pf.amount_invested || 0,
            valuation_date: pf.valuation_date,
            irr: pf.irr_result !== null && pf.irr_result !== undefined ? parseFloat(pf.irr_result) : null,
            irr_date: pf.irr_calculation_date || pf.irr_date,
            status: pf.status || 'active',
            end_date: pf.end_date,
          };
        });
        
        console.log('ProductOverview: Processed holdings:', processedHoldings);
        
        // Filter active and inactive holdings
        // A fund is active if:
        // 1. Status is explicitly 'active' (regardless of dates), OR
        // 2. Status is not 'inactive' AND (no end_date OR end_date is in the future)
        const activeHoldings = processedHoldings.filter(
          (h: Holding) => {
            // If status is explicitly 'active', it's active regardless of dates
            if (h.status === 'active') {
              return true;
            }
            // Otherwise, use the original logic
            return h.status !== 'inactive' && (!h.end_date || new Date(h.end_date) > new Date());
          }
        );
        
        const inactiveHoldings = processedHoldings.filter(
          (h: Holding) => {
            // If status is explicitly 'active', it's never inactive
            if (h.status === 'active') {
              return false;
            }
            // Otherwise, use the original logic
            return h.status === 'inactive' || (h.end_date && new Date(h.end_date) <= new Date());
          }
        );
        
        console.log(`After filtering: ${activeHoldings.length} active, ${inactiveHoldings.length} inactive`);
        
        // Create a virtual "Previous Funds" entry if there are inactive holdings
        const createPreviousFundsEntry = (inactiveHoldings: Holding[]): Holding | null => {
          console.log("Creating Previous Funds entry with", inactiveHoldings.length, "inactive holdings");
          
          if (inactiveHoldings.length === 0) {
            console.log("No inactive holdings found, not creating Previous Funds entry");
            return null;
          }
          
          // Sum up all the values from inactive holdings
          const totalAmountInvested = inactiveHoldings.reduce((sum, holding) => sum + (holding.amount_invested || 0), 0);
          
          // Calculate average risk factor from inactive funds
          let totalRiskFactor = 0;
          let fundsWithRiskFactor = 0;
          
          inactiveHoldings.forEach(holding => {
            const fundId = holding.fund_id || 0;
            if (fundId) {
              const fund = Array.from(fundsData.values()).find(f => f.id === fundId);
              if (fund && fund.risk_factor !== undefined && fund.risk_factor !== null) {
                totalRiskFactor += fund.risk_factor;
                fundsWithRiskFactor++;
              }
            }
          });
          
          // Calculate average risk factor if we have any
          const averageRiskFactor = fundsWithRiskFactor > 0 ? totalRiskFactor / fundsWithRiskFactor : undefined;
          
          console.log("Previous Funds totals:", { 
            totalAmountInvested,
            totalRiskFactor,
            fundsWithRiskFactor,
            averageRiskFactor
          });
          
                  // Create the Previous Funds entry with all required properties for a Holding
        return {
          id: -1, // Virtual ID for Previous Funds
          fund_name: 'Previous Funds',
          isin_number: '',
          amount_invested: totalAmountInvested,
          market_value: 0, // We'll display N/A for this
          isVirtual: true, // Mark as virtual
          status: 'inactive',
          fund_id: 0, 
          target_weighting: undefined,
          valuation_date: undefined,
          irr: undefined,
          riskFactor: averageRiskFactor,
          // Add inactive funds data for expansion
          inactiveFunds: inactiveHoldings
        } as Holding & { inactiveFunds: Holding[] };
        };
        
        const previousFundsEntry = createPreviousFundsEntry(inactiveHoldings);
        
        // Only display active holdings directly
        const displayHoldings = [...activeHoldings];
        
        // Add the Previous Funds entry if it exists
        if (previousFundsEntry) {
          console.log("Adding Previous Funds entry to display holdings");
          displayHoldings.push(previousFundsEntry);
        }
        
        // Sort holdings
        const sortedHoldings = displayHoldings.sort((a, b) => {
          // Previous Funds virtual entry always goes last
          if (a.isVirtual) return 1;
          if (b.isVirtual) return -1;
          
          // Cash fund always goes second-to-last (before Previous Funds)
          const aIsCash = isCashFund({ fund_name: a.fund_name, isin_number: a.isin_number } as any);
          const bIsCash = isCashFund({ fund_name: b.fund_name, isin_number: b.isin_number } as any);

          if (aIsCash) return 1;
          if (bIsCash) return -1;
          
          // All other funds are sorted alphabetically
          return (a.fund_name || '').localeCompare(b.fund_name || '');
        });
        
        setHoldings(sortedHoldings);
      } else {
        // If no portfolio funds found, set empty holdings array
        console.log('ProductOverview: No portfolio funds found for this product');
        setHoldings([]);
      }
      
      // Set target risk if available from template
      if (completeData.template_info?.target_risk) {
        setTargetRisk(completeData.template_info.target_risk);
      } else if (completeData.target_risk) {
        setTargetRisk(completeData.target_risk);
      }
      
      setIsLoading(false);
      
    } catch (err: any) {
      console.error('ProductOverview: Error fetching data:', err);
      setError(`Error loading data: ${err.message || 'Unknown error'}`);
      setIsLoading(false);
    }
  };

  const fetchPortfolioSummary = async (productId: string, completeData: any) => {
    try {
      setIsLoadingPortfolioSummary(true);
      console.log('Fetching portfolio summary for product:', productId);
      
      // Fetch FUM first
      const fumResponse = await getProductFUM(parseInt(productId));
      console.log('FUM response:', fumResponse.data);
      setPortfolioTotalValue(fumResponse.data.fum || 0);
      
      // Fetch portfolio IRR from stored values (using latest_portfolio_irr_values view)
      if (completeData.portfolio_id) {
        try {
          console.log('🚀 Fetching stored portfolio IRR for portfolio:', completeData.portfolio_id);
          
          // Use the optimized endpoint to get stored IRR from latest_portfolio_irr_values view
          const irrResponse = await api.get(`/api/portfolios/${completeData.portfolio_id}/latest-irr`);
          
          console.log('✅ Stored IRR response:', irrResponse.data);
          
                     if (irrResponse.data && irrResponse.data.irr_result !== null) {
             // IRR is stored as percentage in database (e.g., -0.33 for -0.33%), use directly
             const irrPercentage = irrResponse.data.irr_result;
             setPortfolioIRR(irrPercentage);
             console.log(`✅ Portfolio IRR loaded from database: ${irrPercentage.toFixed(2)}%`);
           } else {
            console.warn('⚠️ No stored IRR found for portfolio:', completeData.portfolio_id);
            setPortfolioIRR(null);
          }
        } catch (irrErr) {
          console.error('❌ Error fetching stored portfolio IRR:', irrErr);
          setPortfolioIRR(null);
        }
      } else {
        console.warn('⚠️ No portfolio_id available for IRR lookup');
        setPortfolioIRR(null);
      }
      
      setIsLoadingPortfolioSummary(false);
    } catch (err: any) {
      console.error('Error fetching portfolio summary:', err);
      setIsLoadingPortfolioSummary(false);
      // Don't set error for portfolio summary failure as it's not critical
    }
  };

  // Format currency with commas and 2 decimal places
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Format percentage with 1 decimal place
  const formatPercentage = (value: number | null | undefined): string => {
    if (value === null || value === undefined) {
      return 'N/A';
    }
    
    // Convert to number if it's a string (defensive programming)
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    
    // Check if the conversion resulted in a valid number
    if (isNaN(numValue)) {
      return 'N/A';
    }
    
    return `${numValue.toFixed(1)}%`;
  };

  // Format activity type for display - convert camelCase or snake_case to spaces
  const formatActivityType = (activityType: string): string => {
    if (!activityType) return '';
    
    // Replace underscores with spaces
    let formatted = activityType.replace(/_/g, ' ');
    
    // Add spaces between camelCase words
    formatted = formatted.replace(/([a-z])([A-Z])/g, '$1 $2');
    
    // Capitalize first letter of each word
    return formatted
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Format weighting value - handles both decimal (0.5) and percentage (50) formats
  const formatWeighting = (value: any): string => {
    if (value === null || value === undefined) {
      return 'N/A';
    }
    
    // Convert to number if it's a string
    let numValue = typeof value === 'string' ? parseFloat(value) : value;
    
    // Check if it's already in percentage format (0-100) or decimal format (0-1)
    if (numValue <= 1) {
      // It's in decimal format (0.5 means 50%), convert to percentage
      numValue = numValue * 100;
    }
    
    // Return formatted percentage with 1 decimal place
    return `${numValue.toFixed(1)}%`;
  };

  // Format date only
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateMonthYear = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short'
    });
  };

  // Get fund risk rating for display
  const getFundRiskRating = (fundId: number, fundsMap: Map<number, any>): string => {
    const fund = Array.from(fundsMap.values()).find(fund => fund.id === fundId);
    if (fund && fund.risk_factor !== undefined && fund.risk_factor !== null) {
      return fund.risk_factor.toString();
    }
    return 'N/A';
  };

  // Calculate target risk based on the current portfolio's target weightings
  const calculateTargetRisk = async (): Promise<string> => {
    console.log('DEBUG - calculateTargetRisk called with:', {
      account: !!account,
      holdingsLength: holdings.length,
      fundsDataSize: fundsData.size
    });
    
    if (!account || holdings.length === 0 || fundsData.size === 0) {
      console.log('DEBUG - Early return from calculateTargetRisk:', {
        account: !!account,
        holdingsLength: holdings.length,
        fundsDataSize: fundsData.size
      });
      return "N/A";
    }
    
    let totalWeight = 0;
    let weightedRiskSum = 0;
    let validFundsCount = 0;
    
    console.log('DEBUG - Starting target risk calculation with holdings:', 
      holdings.map(h => ({
        fund_name: h.fund_name,
        fund_id: h.fund_id,
        target_weighting: h.target_weighting,
        isVirtual: h.isVirtual
      }))
    );
    
    console.log('DEBUG - Available funds data:', 
      Array.from(fundsData.values()).map(f => ({
        id: f.id,
        fund_name: f.fund_name,
        risk_factor: f.risk_factor
      }))
    );
    
    // Calculate weighted average risk based on current portfolio's target weightings
    for (const holding of holdings) {
      // Skip virtual holdings (like "Previous Funds")
      if (holding.isVirtual) {
        console.log('DEBUG - Skipping virtual holding:', holding.fund_name);
        continue;
      }
      
      const fundId = holding.fund_id;
      const targetWeighting = holding.target_weighting;
      
      console.log('DEBUG - Processing holding:', {
        fund_name: holding.fund_name,
        fund_id: fundId,
        target_weighting: targetWeighting,
        target_weighting_type: typeof targetWeighting
      });
      
      if (!fundId || targetWeighting === undefined || targetWeighting === null) {
        console.log('DEBUG - Skipping holding due to missing fundId or target_weighting:', {
          fund_name: holding.fund_name,
          fundId,
          targetWeighting
        });
        continue;
      }
      
      // Convert target weighting to decimal if it's in percentage format
      let weight = typeof targetWeighting === 'string' ? parseFloat(targetWeighting) : targetWeighting;
      
      // If weight is in percentage format (>1), convert to decimal
      if (weight > 1) {
        weight = weight / 100;
      }
      
      const fund = Array.from(fundsData.values()).find(f => f.id === fundId);
      
      console.log('DEBUG - Fund lookup result:', {
        fundId,
        fund: fund ? { id: fund.id, name: fund.fund_name, risk_factor: fund.risk_factor } : null
      });
      
      if (fund && fund.risk_factor !== undefined && fund.risk_factor !== null) {
        weightedRiskSum += fund.risk_factor * weight;
        totalWeight += weight;
        validFundsCount++;
        
        console.log('DEBUG - Target risk calculation for fund:', {
          fund_name: fund.fund_name,
          fund_id: fundId,
          risk_factor: fund.risk_factor,
          target_weighting: targetWeighting,
          weight: weight,
          contribution: fund.risk_factor * weight
        });
      } else {
        console.log('DEBUG - Skipping fund due to missing risk_factor:', {
          fund_name: fund?.fund_name || 'Unknown',
          fund_id: fundId,
          risk_factor: fund?.risk_factor
        });
      }
    }
    
    console.log('DEBUG - Final target risk calculation summary:', {
      totalWeight,
      weightedRiskSum,
      validFundsCount
    });
    
    // If we found valid funds with risk factors and weightings, calculate the weighted average
    if (validFundsCount > 0 && totalWeight > 0) {
      const calculatedRisk = weightedRiskSum / totalWeight;
      
      console.log('DEBUG - Final target risk calculation:', {
        totalWeight,
        weightedRiskSum,
        validFundsCount,
        calculatedRisk
      });
      
      // Cache the calculated risk
      setTargetRisk(calculatedRisk);
      
      return calculatedRisk.toFixed(1);
    }
    
    console.log('DEBUG - No valid funds with target weightings and risk factors found');
    setTargetRisk(null);
    return "N/A";
  };

  // Check if all holdings have the same valuation date
  const findCommonValuationDate = (holdings: Holding[]): string | null => {
    // Filter out holdings without valuation dates
    const holdingsWithDates = holdings.filter(h => h.valuation_date !== undefined && h.valuation_date !== null);
    if (holdingsWithDates.length === 0) return null;
    
    // Get all unique dates - using type assertion since we've filtered out undefined values
    const uniqueDates = [...new Set(holdingsWithDates.map(h => h.valuation_date as string))];
    
    // If all have the same date, return it
    if (uniqueDates.length === 1) {
      return uniqueDates[0];
    }
    
    // Otherwise, find the most recent date that all funds share
    // (This would be more complex and require checking date ranges - for now
    // we'll just log the issue and use the current valuation approach)
    if (uniqueDates.length > 1) {
      console.log('Multiple valuation dates found across holdings:', uniqueDates);
    }
    
    return null;
  };

  // Calculate live risk as weighted average of fund risk factors based on valuations
  const calculateLiveRisk = (): string => {
    if (holdings.length === 0 || fundsData.size === 0) return "N/A";
    
    // Check if all valuations are from the same date
    const commonDate = findCommonValuationDate(holdings);
    console.log('Common valuation date for risk calculation:', commonDate);
    
    let totalValue = 0;
    let weightedRiskSum = 0;
    let fundsWithValidValuations = 0;
    
    // Add debug for weighting calculation
    console.log('DEBUG - Starting live risk calculation with holdings:', 
      holdings.map(h => ({
        fund_name: h.fund_name,
        market_value: h.market_value,
        fund_id: h.fund_id,
        valuation_date: h.valuation_date
      }))
    );
    
    // First, calculate total portfolio value from valid holdings
    const holdingsToUse = holdings.filter(h => 
      h.fund_id && 
      h.market_value !== undefined && 
      h.market_value !== null && 
      // If we have a common date, only use holdings with that date
      (!commonDate || (h.valuation_date !== undefined && h.valuation_date !== null && h.valuation_date === commonDate))
    );
    
    if (holdingsToUse.length === 0) {
      console.log('No valid holdings found for risk calculation');
      return "N/A";
    }
    
    // Calculate total value with proper number conversion
    totalValue = holdingsToUse.reduce((sum, h) => sum + Number(h.market_value || 0), 0);
    
    console.log(`🧮 Live risk calc - Total portfolio value: ${totalValue}`);
    
    if (totalValue <= 0) {
      console.log('Total portfolio value is zero or negative');
      return "N/A";
    }
    
    // Now calculate weighted risk
    for (const holding of holdingsToUse) {
      const fundId = holding.fund_id;
      const value = Number(holding.market_value || 0);
      
      if (!fundId) continue;
      
      const fund = Array.from(fundsData.values()).find(f => f.id === fundId);
      
      if (fund && fund.risk_factor !== undefined && fund.risk_factor !== null) {
        const weight = value / totalValue;
        const contribution = fund.risk_factor * weight;
        weightedRiskSum += fund.risk_factor * weight;
        fundsWithValidValuations++;
        
        console.log('DEBUG - Risk calculation for fund:', {
          fund_name: fund.fund_name,
          fund_id: fundId,
          risk_factor: fund.risk_factor,
          value: value,
          weight: weight,
          contribution: contribution
        });
      }
    }
    
    if (fundsWithValidValuations === 0) {
      console.log('No funds with valid risk factors found');
      return "N/A";
    }
    
    // Calculate weighted average and round to 1 decimal place
    const weightedAverage = weightedRiskSum / totalValue;
    console.log('DEBUG - Final risk calculation:', {
      totalValue,
      weightedRiskSum,
      weightedAverage,
      fundsWithValidValuations,
      commonDate
    });
    
    return weightedAverage.toFixed(1);
  };

  // Calculate live weightings based on current market values
  const calculateLiveWeightings = (holdings: Holding[]): Map<number, number> => {
    const weightings = new Map<number, number>();
    
    // First check if all holdings have market values
    const hasAllMarketValues = holdings.every(h => 
      h.market_value !== undefined && h.market_value !== null
    );
    
    if (hasAllMarketValues) {
      // Calculate total portfolio value with proper number conversion
      const totalValue = holdings.reduce((sum, h) => sum + Number(h.market_value || 0), 0);
      
      console.log(`🧮 Weighting calc - Total portfolio value: ${totalValue}`);
      
      // Calculate each fund's proportion of the total
      holdings.forEach(holding => {
        const marketValue = Number(holding.market_value || 0);
        const weighting = totalValue > 0 ? (marketValue / totalValue) * 100 : 0;
        console.log(`🧮 Fund ${holding.fund_name}: Market Value: ${marketValue}, Weighting: ${weighting.toFixed(1)}%`);
        weightings.set(holding.id, weighting);
      });
      
      console.log('Calculated live weightings based on market values:', 
        Object.fromEntries([...weightings.entries()].map(([id, weight]) => {
          const fund = holdings.find(h => h.id === id);
          return [fund?.fund_name || id, weight];
        }))
      );
    } else {
      // Fall back to stored target weightings
      console.log('Some funds missing market values, using stored target weightings');
      holdings.forEach(holding => {
        if (holding.target_weighting !== undefined && holding.target_weighting !== null) {
          const weight = typeof holding.target_weighting === 'string' 
            ? parseFloat(holding.target_weighting) 
            : holding.target_weighting;
          weightings.set(holding.id, weight);
        } else {
          weightings.set(holding.id, 0);
        }
      });
    }
    
    return weightings;
  };
  
  // Memoize the weightings calculation
  const liveWeightings = useMemo(() => calculateLiveWeightings(holdings), [holdings]);


  // Portfolio fund management functions (simplified)
  const fetchAvailableFunds = async () => {
    try {
      const response = await api.get('/funds', { params: { status: 'active' } });
      setAvailableFunds(response.data || []);
    } catch (err: any) {
      console.error('Error fetching available funds:', err);
      setFundError('Failed to load available funds');
    }
  };

  const handleAddFund = async (fundId: number, weighting: number) => {
    try {
      setIsSavingFunds(true);
      setFundError(null);
      
      // Add fund to portfolio using the portfolio_funds endpoint
      await api.post('/portfolio_funds', {
        portfolio_id: account?.portfolio_id,
        available_funds_id: fundId,
        target_weighting: weighting,
        start_date: new Date().toISOString().split('T')[0],
        amount_invested: 0,
        status: 'active'
      });
      
      // Trigger portfolio IRR recalculation after adding fund
      if (account?.portfolio_id) {
        try {
          console.log('🔄 Triggering portfolio IRR recalculation after adding fund...');
          await api.post(`/api/portfolios/${account.portfolio_id}/calculate-irr`);
          console.log('✅ Portfolio IRR recalculation completed');
        } catch (irrErr) {
          console.warn('⚠️ IRR recalculation failed, but continuing with data refresh:', irrErr);
        }
      }
      
      // Refresh the data
      if (accountId) await fetchData(accountId);
      setFundError(null);
    } catch (err: any) {
      console.error('Error adding fund:', err);
      setFundError(err.response?.data?.message || err.response?.data?.detail || 'Failed to add fund');
    } finally {
      setIsSavingFunds(false);
    }
  };

  const handleUpdateFundWeighting = async (fundId: number, newWeighting: number) => {
    try {
      setIsSavingFunds(true);
      setFundError(null);
      
      // Find the portfolio fund record to update
      const portfolioFund = holdings.find(h => h.fund_id === fundId);
      if (!portfolioFund) {
        throw new Error('Portfolio fund not found');
      }
      
      await api.patch(`/portfolio_funds/${portfolioFund.id}`, {
        weighting: newWeighting
      });
      
      // Trigger portfolio IRR recalculation after updating fund weighting
      if (account?.portfolio_id) {
        try {
          console.log('🔄 Triggering portfolio IRR recalculation after updating fund weighting...');
          await api.post(`/api/portfolios/${account.portfolio_id}/calculate-irr`);
          console.log('✅ Portfolio IRR recalculation completed');
        } catch (irrErr) {
          console.warn('⚠️ IRR recalculation failed, but continuing with data refresh:', irrErr);
        }
      }
      
      // Refresh the data
      if (accountId) await fetchData(accountId);
      setFundError(null);
    } catch (err: any) {
      console.error('Error updating fund weighting:', err);
      setFundError(err.response?.data?.message || err.response?.data?.detail || 'Failed to update fund weighting');
    } finally {
      setIsSavingFunds(false);
    }
  };

  const handleRemoveFund = async (fundId: number) => {
    try {
      setIsSavingFunds(true);
      setFundError(null);
      
      // Check if it's an active fund first
      const activePortfolioFund = holdings.find(h => h.fund_id === fundId && h.status === 'active');
      
      if (activePortfolioFund) {
        // Confirm deletion with user since this is permanent
        if (!window.confirm('Are you sure you want to permanently remove this fund from the portfolio? This action cannot be undone and will remove all historical data for this fund.')) {
          setIsSavingFunds(false);
          return;
        }
        
        // Active fund: permanently delete it (changed from soft delete to permanent delete)
        await api.delete(`/portfolio_funds/${activePortfolioFund.id}`);
        
        // Immediately update local state to completely remove the fund
        setHoldings(prevHoldings => 
          prevHoldings.filter(holding => 
            !(holding.fund_id === fundId && holding.status === 'active')
          )
        );
      } else {
        // Check if it's an inactive fund
        const previousFundsEntry = holdings.find(h => h.isVirtual && h.fund_name === 'Previous Funds');
        const inactivePortfolioFund = previousFundsEntry?.inactiveFunds?.find(h => h.fund_id === fundId);
        
        if (inactivePortfolioFund) {
          // Inactive fund: permanently delete it
          await api.delete(`/portfolio_funds/${inactivePortfolioFund.id}`);
          
          // Immediately update local state to remove the inactive fund
          setHoldings(prevHoldings => 
            prevHoldings.map(holding => {
              if (holding.isVirtual && holding.fund_name === 'Previous Funds' && holding.inactiveFunds) {
                return {
                  ...holding,
                  inactiveFunds: holding.inactiveFunds.filter(inactiveFund => inactiveFund.fund_id !== fundId)
                };
              }
              return holding;
            })
          );
        } else {
          throw new Error('Portfolio fund not found');
        }
      }
      
      // Trigger portfolio IRR recalculation after removing fund
      if (account?.portfolio_id) {
        try {
          console.log('🔄 Triggering portfolio IRR recalculation after removing fund...');
          await api.post(`/api/portfolios/${account.portfolio_id}/calculate-irr`);
          console.log('✅ Portfolio IRR recalculation completed');
        } catch (irrErr) {
          console.warn('⚠️ IRR recalculation failed, but continuing with data refresh:', irrErr);
        }
      }
      
      // Refresh the data
      if (accountId) await fetchData(accountId);
      setFundError(null);
    } catch (err: any) {
      console.error('Error removing fund:', err);
      setFundError(err.response?.data?.message || err.response?.data?.detail || 'Failed to remove fund');
    } finally {
      setIsSavingFunds(false);
    }
  };

  // Add function to reactivate a fund from previous funds
  const handleReactivateFund = async (fundId: number) => {
    try {
      setIsSavingFunds(true);
      setFundError(null);
      
      // Find the inactive portfolio fund record to reactivate
      const portfolioFund = holdings.find(h => h.fund_id === fundId && h.status === 'inactive');
      if (!portfolioFund) {
        throw new Error('Inactive portfolio fund not found');
      }
      
      // Reactivate by setting status to active and clearing end_date
      await api.patch(`/portfolio_funds/${portfolioFund.id}`, {
        status: 'active',
        end_date: null,
        target_weighting: 0 // Start with 0% weighting, user can adjust
      });
      
      // Trigger portfolio IRR recalculation after reactivating fund
      if (account?.portfolio_id) {
        try {
          console.log('🔄 Triggering portfolio IRR recalculation after reactivating fund...');
          await api.post(`/api/portfolios/${account.portfolio_id}/calculate-irr`);
          console.log('✅ Portfolio IRR recalculation completed');
        } catch (irrErr) {
          console.warn('⚠️ IRR recalculation failed, but continuing with data refresh:', irrErr);
        }
      }
      
      // Refresh the data
      if (accountId) await fetchData(accountId);
      setFundError(null);
    } catch (err: any) {
      console.error('Error reactivating fund:', err);
      setFundError(err.response?.data?.message || err.response?.data?.detail || 'Failed to reactivate fund');
    } finally {
      setIsSavingFunds(false);
    }
  };

  // Load available funds when editing starts
  useEffect(() => {
    if (isEditingFunds && availableFunds.length === 0) {
      fetchAvailableFunds();
    }
  }, [isEditingFunds]);

  // Filter available funds based on search term
  const filteredAvailableFunds = useMemo(() => {
    if (!fundSearchTerm) return availableFunds;
    return availableFunds.filter(fund => 
      fund.fund_name.toLowerCase().includes(fundSearchTerm.toLowerCase()) ||
      fund.isin_number.toLowerCase().includes(fundSearchTerm.toLowerCase())
    );
  }, [availableFunds, fundSearchTerm]);

  // Get funds that are not already in the portfolio (both active and inactive)
  const fundsNotInPortfolio = useMemo(() => {
    const currentFundIds = holdings.map(h => h.fund_id);
    return availableFunds.filter(fund => !currentFundIds.includes(fund.id));
  }, [availableFunds, holdings]);

  // Convert funds to AutocompleteSearch options
  const fundOptions: AutocompleteOption[] = useMemo(() => {
    return fundsNotInPortfolio.map(fund => ({
      value: fund.id.toString(),
      label: fund.fund_name,
      description: `${fund.isin_number}${fund.risk_factor ? ` • Risk: ${fund.risk_factor}` : ''}`,
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      )
    }));
  }, [fundsNotInPortfolio]);

  // Handle fund selection from AutocompleteSearch
  const handleFundSelection = (option: AutocompleteOption) => {
    const fundId = parseInt(option.value);
    handleAddFund(fundId, 0); // Add with 0% weighting initially
  };

  // Calculate total weighting for validation - only count active funds during editing
  const getTotalWeighting = () => {
    // Only count active funds during editing mode
    const activeFunds = holdings.filter(h => !h.isVirtual && h.status === 'active');
    const activeTotal = activeFunds.reduce((sum, holding) => {
      const weighting = parseFloat(holding.target_weighting || '0');
      return sum + (isNaN(weighting) ? 0 : weighting);
    }, 0);

    // Debug logging to help track weighting calculations
    console.log('🔢 Weighting calculation:', {
      activeFunds: activeFunds.length,
      activeTotal: activeTotal.toFixed(2),
      fundDetails: activeFunds.map(h => ({
        name: h.fund_name,
        weighting: h.target_weighting || '0'
      }))
    });

    // During editing mode, we only want to count active funds
    // Inactive funds are considered "deleted" from the user's perspective
    return activeTotal;
  };

  // Save all fund weightings
  const handleSaveFunds = async () => {
    const totalWeighting = getTotalWeighting();
    if (Math.abs(totalWeighting - 100) > 0.01) {
      setFundError(`Total fund weightings must equal 100%. Current total: ${totalWeighting.toFixed(2)}%`);
      return;
    }

    try {
      setIsSavingFunds(true);
      setFundError(null);
      
      // Update only active fund weightings (inactive funds are not included in weighting validation)
      const activeFundPromises = holdings
        .filter(h => !h.isVirtual && h.fund_id && h.status === 'active')
        .map(holding => {
          const weighting = parseFloat(holding.target_weighting || '0');
          return api.patch(`/portfolio_funds/${holding.id}`, {
            target_weighting: weighting
          });
        });

      await Promise.all(activeFundPromises);
      
      // Trigger portfolio IRR recalculation after updating fund weightings
      if (account?.portfolio_id) {
        try {
          console.log('🔄 Triggering portfolio IRR recalculation after fund weightings update...');
          await api.post(`/api/portfolios/${account.portfolio_id}/calculate-irr`);
          console.log('✅ Portfolio IRR recalculation completed');
        } catch (irrErr) {
          console.warn('⚠️ IRR recalculation failed, but continuing with data refresh:', irrErr);
        }
      }
      
      // Refresh the data (with a small delay to ensure IRR calculation is complete)
      if (accountId) {
        setTimeout(async () => {
          await fetchData(accountId);
        }, 500); // 500ms delay to allow IRR calculation to complete
      }
      setIsEditingFunds(false);
      setFundError(null);
      
      // Clear the backup since changes were saved successfully
      setOriginalTargetWeightings(new Map());
      
    } catch (err: any) {
      console.error('Error saving fund weightings:', err);
      setFundError(err.response?.data?.message || err.response?.data?.detail || 'Failed to save fund weightings');
    } finally {
      setIsSavingFunds(false);
    }
  };

  // Function to start editing funds with backup
  const handleStartEditingFunds = () => {
    // Create backup of current target weightings
    const backup = new Map<number, string>();
    holdings.forEach(holding => {
      if (holding.id && holding.target_weighting) {
        backup.set(holding.id, holding.target_weighting);
      }
    });
    setOriginalTargetWeightings(backup);
    setIsEditingFunds(true);
  };

  // Function to cancel editing and restore original values
  const handleCancelEditingFunds = () => {
    // Restore original target weightings
    setHoldings(prevHoldings => 
      prevHoldings.map(holding => {
        const originalWeighting = originalTargetWeightings.get(holding.id);
        if (originalWeighting !== undefined) {
          return { ...holding, target_weighting: originalWeighting };
        }
        return holding;
      })
    );
    
    // Clear backup and exit edit mode
    setOriginalTargetWeightings(new Map());
    setIsEditingFunds(false);
    setFundError(null);
  };

  // Add function to handle account deletion
  const handleDeleteProduct = async () => {
    if (!accountId) return;
    
    setIsDeleting(true);
    setDeleteError(null);
    
    try {
      // First try to delete all product owner associations for this product
      try {
        // Using the new endpoint to delete all associations in one go
        await api.delete(`/api/product_owner_products/product/${accountId}`);
        console.log('Successfully deleted all product owner associations');
      } catch (assocErr) {
        console.error('Error deleting product owner associations:', assocErr);
        // Continue anyway - it might work if there are no associations
      }
      
      // Now try to delete the product itself
      await api.delete(`/api/client_products/${accountId}`);
      console.log('Product deleted successfully');
      
      // Navigate back using smart breadcrumb-aware navigation
      const successMessage = account?.portfolio_id 
        ? `Product and associated portfolio #${account.portfolio_id} deleted successfully` 
        : 'Product deleted successfully';
      
      navigateBack({
        type: 'success',
        message: successMessage
      }, account?.client_id);
    } catch (err: any) {
      console.error('Error deleting product:', err);
      
      // Check if this is a foreign key constraint error
      if (err.response?.data?.detail && 
          err.response.data.detail.includes('product_owner_products_product_id_fkey')) {
        // This is specifically a product owner association constraint error
        setDeleteError(
          "Unable to delete the product because it still has product owner associations. " +
          "Please try again or contact the system administrator."
        );
      } else if (err.response?.data?.detail) {
        // Some other API error with details
        setDeleteError(err.response.data.detail);
      } else {
        // Generic error
        setDeleteError('Failed to delete product. Please try again later.');
      }
      
      setIsDeleting(false);
    }
  };

  // Add function to handle product lapse
  const handleLapseProduct = async () => {
    if (!accountId) return;
    
    setIsLapsing(true);
    setLapseError(null);
    
    try {
      const response = await lapseProduct(parseInt(accountId));
      console.log('Product lapsed successfully');
      
      // Close the modal
      setIsLapseModalOpen(false);
      setIsLapsing(false);
      
      // Refresh the product data to show updated status and buttons
      await fetchData(accountId);
      
      // Show success message (optional - you could add a toast notification here)
      console.log('Product data refreshed after lapse');
    } catch (err: any) {
      console.error('Error lapsing product:', err);
      
      if (err.response?.data?.detail) {
        setLapseError(err.response.data.detail);
      } else {
        setLapseError('Failed to lapse product. Please try again later.');
      }
      
      setIsLapsing(false);
    }
  };

  // Add function to handle product reactivation
  const handleReactivateProduct = async () => {
    if (!accountId) return;
    
    setIsReactivating(true);
    setReactivateError(null);
    
    try {
      const response = await reactivateProduct(parseInt(accountId));
      console.log('Product reactivated successfully');
      
      // Close the modal
      setIsReactivateModalOpen(false);
      setIsReactivating(false);
      
      // Refresh the product data to show updated status and buttons
      await fetchData(accountId);
      
      // Show success message (optional - you could add a toast notification here)
      console.log('Product data refreshed after reactivation');
    } catch (err: any) {
      console.error('Error reactivating product:', err);
      
      if (err.response?.data?.detail) {
        setReactivateError(err.response.data.detail);
      } else {
        setReactivateError('Failed to reactivate product. Please try again later.');
      }
      
      setIsReactivating(false);
    }
  };

  // Add delete confirmation modal component
  const DeleteConfirmationModal = () => {
    if (!isDeleteModalOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-md w-full p-6">
          <div className="flex items-start">
            <div className="flex-shrink-0 text-red-600">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-medium text-gray-900">Delete Product and Portfolio</h3>
              <div className="mt-2">
                <p className="text-sm text-gray-500">
                  Are you sure you want to delete this product? This action will also delete the associated portfolio and cannot be undone.
                </p>
                {account?.portfolio_id && (
                  <p className="mt-2 text-sm font-medium text-red-600">
                    Warning: Portfolio #{account.portfolio_id} will also be deleted along with all funds, valuations, and IRR data.
                  </p>
                )}
                {deleteError && (
                  <p className="mt-2 text-sm text-red-600">
                    Error: {deleteError}
                  </p>
                )}
              </div>
            </div>
          </div>
          <div className="mt-6 flex space-x-3 justify-end">
            <ActionButton
              variant="cancel"
              size="md"
              disabled={isDeleting}
              onClick={() => setIsDeleteModalOpen(false)}
            />
            <ActionButton
              variant="delete"
              size="md"
              context="Product and Portfolio"
              design="descriptive"
              disabled={isDeleting}
              onClick={handleDeleteProduct}
              loading={isDeleting}
            />
          </div>
        </div>
      </div>
    );
  };

  // Add lapse confirmation modal component
  const LapseConfirmationModal = () => {
    if (!isLapseModalOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-md w-full p-6">
          <div className="flex items-start">
            <div className="flex-shrink-0 text-yellow-600">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-medium text-gray-900">Lapse Product</h3>
              <div className="mt-2">
                <p className="text-sm text-gray-500">
                  Are you sure you want to lapse this product? This will change its status to inactive and set the end date to today.
                </p>
                <p className="mt-2 text-sm text-yellow-600 font-medium">
                  Note: This action can only be performed on products with zero total value and cannot be undone.
                </p>
                {lapseError && (
                  <p className="mt-2 text-sm text-red-600">
                    Error: {lapseError}
                  </p>
                )}
              </div>
            </div>
          </div>
          <div className="mt-6 flex space-x-3 justify-end">
            <button
              type="button"
              disabled={isLapsing}
              onClick={() => setIsLapseModalOpen(false)}
              className="inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isLapsing}
              onClick={handleLapseProduct}
              className={`inline-flex justify-center px-4 py-2 text-sm font-medium text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 ${
                isLapsing ? 'bg-yellow-400 cursor-not-allowed' : 'bg-yellow-600 hover:bg-yellow-700'
              }`}
            >
              {isLapsing ? 'Lapsing...' : 'Lapse Product'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Add reactivate confirmation modal component
  const ReactivateConfirmationModal = () => {
    if (!isReactivateModalOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-md w-full p-6">
          <div className="flex items-start">
            <div className="flex-shrink-0 text-green-600">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-medium text-gray-900">Reactivate Product</h3>
              <div className="mt-2">
                <p className="text-sm text-gray-500">
                  Are you sure you want to reactivate this product? This will change its status to active and clear the end date.
                </p>
                <p className="mt-2 text-sm text-green-600 font-medium">
                  Note: The product will become active again and available for normal operations.
                </p>
                {reactivateError && (
                  <p className="mt-2 text-sm text-red-600">
                    Error: {reactivateError}
                  </p>
                )}
              </div>
            </div>
          </div>
          <div className="mt-6 flex space-x-3 justify-end">
            <button
              type="button"
              disabled={isReactivating}
              onClick={() => setIsReactivateModalOpen(false)}
              className="inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isReactivating}
              onClick={handleReactivateProduct}
              className={`inline-flex justify-center px-4 py-2 text-sm font-medium text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 ${
                isReactivating ? 'bg-green-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {isReactivating ? 'Reactivating...' : 'Reactivate Product'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Toggle edit mode and populate form data
  const toggleEditMode = () => {
    if (!isEditMode && account) {
      // Entering edit mode - populate form with current data (without portfolio_id)
      setEditFormData({
        product_name: account.product_name || '',
        provider_id: account.provider_id?.toString() || '',
        product_type: account.product_type || '',
        plan_number: account.plan_number || '',
        target_risk: account.target_risk?.toString() || '',
        start_date: account.start_date ? dayjs(account.start_date) : null,
        fixed_cost: account.fixed_cost?.toString() ?? '',
        percentage_fee: account.percentage_fee?.toString() ?? ''
      });
      
      // Also populate product owners form data
      setEditOwnersFormData({
        portfolio_id: account.portfolio_id?.toString() || '',
        selected_owner_ids: productOwners.map(owner => owner.id)
      });
    } else {
      // Exiting edit mode - clear any errors
      setFormError(null);
      setOwnersFormError(null);
    }
    setIsEditMode(!isEditMode);
  };

  // Toggle edit owners mode and populate form data
  // const toggleEditOwnersMode = () => {
  //   if (!isEditOwnersMode && account) {
  //     // Entering edit mode - populate form with current data
  //     setEditOwnersFormData({
  //       portfolio_id: account.portfolio_id?.toString() || '',
  //       selected_owner_ids: productOwners.map(owner => owner.id)
  //     });
  //   } else {
  //     // Exiting edit mode - clear any errors
  //     setOwnersFormError(null);
  //   }
  //   setIsEditOwnersMode(!isEditOwnersMode);
  // };

  // Handle form input changes for product details
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle BaseInput changes
  const handleBaseInputChange = (name: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditFormData(prev => ({
      ...prev,
      [name]: e.target.value
    }));
  };

  // Handle BaseDropdown changes
  const handleDropdownChange = (name: string) => (value: string | number) => {
    setEditFormData(prev => ({
      ...prev,
      [name]: value.toString()
    }));
  };

  // Handle DateInput changes
  const handleDateInputChange = (date: Date | null, formatted: string) => {
    setEditFormData(prev => ({
      ...prev,
      start_date: date ? dayjs(date) : null
    }));
  };

  // Handle date changes separately (keep for compatibility)
  const handleDateChange = (date: Dayjs | null) => {
    setEditFormData(prev => ({
      ...prev,
      start_date: date
    }));
  };

  // Handle form input changes for product owners
  const handleOwnersInputChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditOwnersFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle product details form submission
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!accountId) return;

    setIsSubmitting(true);
    setFormError(null);

    try {
      // Validate start date is not in the future
      if (editFormData.start_date) {
        const today = dayjs().startOf('day');
        const selectedDate = editFormData.start_date.startOf('day');
        
        if (selectedDate.isAfter(today)) {
          setFormError('Start date cannot be in the future');
          setIsSubmitting(false);
          return;
        }
      }

      // Validate percentage fee is not over 100%
      if (editFormData.percentage_fee && editFormData.percentage_fee.trim() !== '') {
        const percentageValue = parseFloat(editFormData.percentage_fee);
        if (percentageValue > 100) {
          setFormError('Percentage fee cannot exceed 100%');
          setIsSubmitting(false);
          return;
        }
      }

      const updateData: any = {
        product_name: editFormData.product_name,
        product_type: editFormData.product_type || null,
        plan_number: editFormData.plan_number || null
      };

      // Only include provider_id if a value is selected
      if (editFormData.provider_id) {
        updateData.provider_id = parseInt(editFormData.provider_id);
      }

      // Only include target_risk if a value is provided
      if (editFormData.target_risk) {
        updateData.target_risk = parseFloat(editFormData.target_risk);
      }

      // Include start_date if provided
      if (editFormData.start_date) {
        updateData.start_date = editFormData.start_date.format('YYYY-MM-DD');
      }

      // Include revenue fields - set to null if empty/undefined, otherwise parse as float
      updateData.fixed_cost = editFormData.fixed_cost && editFormData.fixed_cost.trim() !== '' 
        ? parseFloat(editFormData.fixed_cost) 
        : null;
      
      updateData.percentage_fee = editFormData.percentage_fee && editFormData.percentage_fee.trim() !== '' 
        ? parseFloat(editFormData.percentage_fee) 
        : null;

      await api.patch(`/api/client_products/${accountId}`, updateData);
      
      // Also update product owners if they have been modified
      if (editOwnersFormData.selected_owner_ids !== undefined) {
        try {
          // Update product owners
          const ownersUpdateData = {
            portfolio_id: account.portfolio_id,  // Keep existing portfolio
            selected_owner_ids: editOwnersFormData.selected_owner_ids
          };

          await api.patch(`/api/client_products/${accountId}/owners`, ownersUpdateData);
        } catch (ownersErr: any) {
          console.error('Error updating product owners:', ownersErr);
          // Don't fail the whole update if only owners update fails
        }
      }
      
      // Refresh the data
      await fetchData(accountId);
      
      // Exit edit mode
      setIsEditMode(false);
      setFormError(null);
    } catch (err: any) {
      console.error('Error updating product:', err);
      setFormError(err.response?.data?.message || err.response?.data?.detail || 'Failed to update product');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle product owners form submission
  // const handleOwnersSubmit = async (e: React.FormEvent) => {
  //   e.preventDefault();
  //   if (!accountId || !account) return;

  //   setIsSubmittingOwners(true);
  //   setOwnersFormError(null);

  //   try {
  //     const updateData: any = {};

  //     // Only include portfolio_id if a value is selected
  //     if (editOwnersFormData.portfolio_id) {
  //       updateData.portfolio_id = parseInt(editOwnersFormData.portfolio_id);
  //     }

  //     // Update product details if portfolio changed
  //     if (Object.keys(updateData).length > 0) {
  //       await api.patch(`/api/client_products/${accountId}`, updateData);
  //     }

  //     // Update product owners associations
  //     // First, get current associations
  //     const currentOwnerIds = productOwners.map(owner => owner.id);
  //     const newOwnerIds = editOwnersFormData.selected_owner_ids;

  //     // Remove owners that are no longer selected
  //     const ownersToRemove = currentOwnerIds.filter(id => !newOwnerIds.includes(id));
  //     for (const ownerId of ownersToRemove) {
  //       try {
  //         await api.delete(`/api/product_owner_products/${ownerId}/${accountId}`);
  //       } catch (err) {
  //         console.error(`Error removing product owner ${ownerId}:`, err);
  //       }
  //     }

  //     // Add new owners
  //     const ownersToAdd = newOwnerIds.filter(id => !currentOwnerIds.includes(id));
  //     for (const ownerId of ownersToAdd) {
  //       try {
  //         await api.post('/api/product_owner_products', {
  //           product_owner_id: ownerId,
  //           product_id: parseInt(accountId)
  //         });
  //       } catch (err) {
  //         console.error(`Error adding product owner ${ownerId}:`, err);
  //       }
  //     }
      
  //     // Refresh the data
  //     await fetchData(accountId);
      
  //     // Exit edit mode
  //     setIsEditOwnersMode(false);
  //     setOwnersFormError(null);
  //   } catch (err: any) {
  //     console.error('Error updating product owners:', err);
  //     setOwnersFormError(err.response?.data?.message || err.response?.data?.detail || 'Failed to update product owners');
  //   } finally {
  //     setIsSubmittingOwners(false);
  //   }
  // };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-6">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-700"></div>
      </div>
    );
  }

  if (error || !account) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-700">{error || 'Failed to load product details. Please try again later.'}</p>
          </div>
        </div>
      </div>
    );
  }

    return (
    <>
      <DeleteConfirmationModal />
      <LapseConfirmationModal />
      <ReactivateConfirmationModal />
      <div className="flex flex-col space-y-6">

        {/* Modern Compact Product Overview Card */}
        <div className="bg-white shadow-lg rounded-xl border border-gray-200 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
            {/* Left Side - Product Details & Owners */}
            <div className="p-6 border-r border-gray-200">
              {/* Product Details Section */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <svg className="h-5 w-5 text-indigo-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Product Details
                  </h3>
                  <div className="flex space-x-2">
                    {isEditMode ? (

                      <>
                        <ActionButton
                          variant="cancel"
                          size="xs"
                          onClick={toggleEditMode}
                        />
                        <ActionButton
                          variant="save"
                          size="xs"
                          onClick={handleSubmit}
                          disabled={isSubmitting}
                          loading={isSubmitting}
                        />
                      </>
                    ) : (
                      <>
                        <ActionButton
                          variant="edit"
                          size="xs"
                          onClick={toggleEditMode}
                        />
                        {/* Show Lapse button only when total value is zero */}
                        {account.status === 'active' && portfolioTotalValue !== null && portfolioTotalValue <= 0.01 && (
                          <ActionButton
                            variant="lapse"
                            size="xs"
                            onClick={() => setIsLapseModalOpen(true)}
                          >
                            Lapse
                          </ActionButton>
                        )}
                        {/* Show Reactivate button only when product is inactive */}
                        {account.status === 'inactive' && (
                          <ActionButton
                            variant="add"
                            size="xs"
                            onClick={() => setIsReactivateModalOpen(true)}
                          >
                            Reactivate
                          </ActionButton>
                        )}
                        <ActionButton
                          variant="delete"
                          size="xs"
                          onClick={() => setIsDeleteModalOpen(true)}
                          title="Delete Product"
                        />
                      </>
                    )}
                  </div>
                </div>

                {/* Form Error Display */}
                {formError && (
                  <div className="mb-4 p-3 text-sm text-red-700 bg-red-50 rounded-lg border border-red-200">
                    {formError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Product Name - Inline Editable */}
                  <div className="sm:col-span-2">
                    {isEditMode ? (
                      <BaseInput
                        label="Product Name"
                        name="product_name"
                        value={editFormData.product_name}
                        onChange={handleBaseInputChange('product_name')}
                        placeholder="Enter product name"
                        size="sm"
                        required
                      />
                    ) : (
                      <>
                        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Product Name</div>
                        <div className="text-sm font-medium text-gray-900">{account.product_name || 'N/A'}</div>
                      </>
                    )}
                  </div>

                  {/* Client Name - Read Only */}
                  <div>
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Client Name</div>
                    <div className="text-sm font-medium text-gray-900">{account.client_name || 'N/A'}</div>
                  </div>

                  {/* Provider - Inline Editable */}
                  <div>
                    {isEditMode ? (
                      <BaseDropdown
                        label="Provider"
                        options={providers.map(provider => ({ 
                          value: provider.id.toString(), 
                          label: provider.name 
                        }))}
                        value={editFormData.provider_id}
                        onChange={handleDropdownChange('provider_id')}
                        placeholder="Select Provider"
                        size="sm"
                      />
                    ) : (
                      <>
                        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Provider</div>
                        <div className="text-sm font-medium text-gray-900">{account.provider_name || 'N/A'}</div>
                      </>
                    )}
                  </div>

                  {/* Product Type - Inline Editable */}
                  <div>
                    {isEditMode ? (
                      <BaseDropdown
                        label="Product Type"
                        value={editFormData.product_type}
                        onChange={handleDropdownChange('product_type')}
                        options={productTypeOptions}
                        placeholder="Select product type"
                        size="sm"
                      />
                    ) : (
                      <>
                        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Product Type</div>
                        <div className="text-sm font-medium text-gray-900">{account.product_type || 'N/A'}</div>
                      </>
                    )}
                  </div>

                  {/* Plan Number - Inline Editable */}
                  <div>
                    {isEditMode ? (
                      <BaseInput
                        label="Plan Number"
                        name="plan_number"
                        value={editFormData.plan_number}
                        onChange={handleBaseInputChange('plan_number')}
                        placeholder="Enter plan number"
                        size="sm"
                      />
                    ) : (
                      <>
                        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Plan Number</div>
                        <div className="text-sm font-medium text-gray-900">{account.plan_number || 'N/A'}</div>
                      </>
                    )}
                  </div>

                  {/* Portfolio Template - Read Only */}
                  <div>
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Portfolio Template</div>
                    <div className="text-sm font-medium text-gray-900">
                      {account.template_info?.generation_name || 'Bespoke'}
                    </div>
                  </div>

                  {/* Product Owners - Editable in edit mode */}
                  <div className="sm:col-span-2">
                    {isEditMode ? (
                      <div>
                        <label htmlFor="product-owners-select" className="block text-xs font-medium text-gray-700 mb-1">
                          Product Owners
                        </label>
                        <MultiSelectDropdown
                          label=""
                          options={allProductOwners.map(owner => ({
                            value: owner.id,
                            label: getProductOwnerDisplayName(owner)
                          }))}
                          values={editOwnersFormData.selected_owner_ids}
                          onChange={(values) => setEditOwnersFormData(prev => ({
                            ...prev,
                            selected_owner_ids: values as number[]
                          }))}
                          placeholder="Search and select product owners"
                          size="sm"
                          searchable={true}
                        />
                      </div>
                    ) : (
                      <>
                        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Product Owners</div>
                        {productOwners.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {productOwners.map(owner => (
                              <span
                                key={owner.id}
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800"
                              >
                                <svg className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                {getProductOwnerDisplayName(owner)}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs text-gray-500 italic">
                            No product owners assigned
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Start Date - Inline Editable */}
                  <div className="sm:col-span-2">
                    {isEditMode ? (
                      <DateInput
                        label="Start Date"
                        value={editFormData.start_date ? editFormData.start_date.toDate() : undefined}
                        onChange={handleDateInputChange}
                        placeholder="dd/mm/yyyy"
                        showCalendarIcon={true}
                        size="sm"
                      />
                    ) : (
                      <>
                        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Start Date</div>
                        <div className="text-sm font-medium text-gray-900">
                        {account.start_date ? formatDate(account.start_date) : 'N/A'}
                      </div>
                      </>
                    )}
                  </div>

                  {/* Revenue Configuration Section */}
                  <div className="sm:col-span-2 pt-3 border-t border-gray-200">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 flex items-center">
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                      Revenue Configuration
                </div>
                    <div className="grid grid-cols-3 gap-4">
                      {/* Fixed Cost */}
                      <div>
                        {isEditMode ? (
                          <div className="space-y-1">
                            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Fixed Cost (£)</div>
                            <div className="relative">
                              <input
                                type="number"
                                name="fixed_cost"
                                value={editFormData.fixed_cost}
                                onChange={handleInputChange}
                                placeholder="0.00"
                                min="0"
                                step="0.01"
                                className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full text-sm font-medium text-gray-900 border-gray-300 rounded-md py-1.5 px-7"
                              />
                              <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                                <span className="text-gray-500 text-sm">£</span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Fixed Cost (£)</div>
                            <div className="text-sm font-medium text-gray-900">
                              {account.fixed_cost !== null && account.fixed_cost !== undefined ? formatCurrency(account.fixed_cost) : 'Not set'}
                            </div>
                          </>
                        )}
              </div>

                      {/* Percentage Fee */}
                      <div>
                        {isEditMode ? (
                          <div className="space-y-1">
                            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Percentage Fee (%)</div>
                            <div className="relative">
                              <input
                                type="number"
                                name="percentage_fee"
                                value={editFormData.percentage_fee}
                                onChange={handleInputChange}
                                placeholder="0.0"
                                min="0"
                                max="100"
                                step="0.1"
                                className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full text-sm font-medium text-gray-900 border-gray-300 rounded-md py-1.5 pr-7 px-2"
                              />
                              <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
                                <span className="text-gray-500 text-sm">%</span>
                              </div>
                            </div>
                            {/* Show calculated percentage fee amount in edit mode */}
                            {editFormData.percentage_fee && parseFloat(editFormData.percentage_fee) > 0 && portfolioTotalValue > 0 && (
                              <div className="text-xs text-blue-600 font-medium">
                                = {formatCurrency((portfolioTotalValue * parseFloat(editFormData.percentage_fee)) / 100)} annually
                              </div>
                            )}
                          </div>
                        ) : (
                          <>
                            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Percentage Fee (%)</div>
                            <div className="text-sm font-medium text-gray-900">
                              {account.percentage_fee !== null && account.percentage_fee !== undefined ? `${account.percentage_fee}%` : 'Not set'}
                            </div>
                            {/* Show calculated percentage fee amount in view mode */}
                            {account.percentage_fee && account.percentage_fee > 0 && portfolioTotalValue > 0 && (
                              <div className="text-xs text-blue-600 font-medium mt-1">
                                = {formatCurrency((portfolioTotalValue * account.percentage_fee) / 100)} annually
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      {/* Total Revenue Calculation */}
                      <div>
                        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Estimated Annual Revenue</div>
                        <div className="text-sm font-semibold">
                          {(() => {
                            // Safe number conversion with NaN protection
                            const fixedCost = (() => {
                              const value = account.fixed_cost;
                              if (value === null || value === undefined || value === '') return 0;
                              const num = parseFloat(value);
                              return isNaN(num) ? 0 : num;
                            })();
                            
                            const percentageFee = (() => {
                              const value = account.percentage_fee;
                              if (value === null || value === undefined || value === '') return 0;
                              const num = parseFloat(value);
                              return isNaN(num) ? 0 : num;
                            })();
                            
                            const portfolioValue = (() => {
                              const value = portfolioTotalValue;
                              if (value === null || value === undefined || value === '') return 0;
                              const num = parseFloat(value);
                              return isNaN(num) ? 0 : num;
                            })();
                            

                            
                            // If neither cost type is set
                            if (!fixedCost && !percentageFee) {
                              return <span className="text-gray-500">None</span>;
                            }
                            
                            // If only fixed cost is set (no percentage fee)
                            if (fixedCost && !percentageFee) {
                              return <span className="text-green-600">{formatCurrency(fixedCost)}</span>;
                            }
                            
                            // If percentage fee is involved (with or without fixed cost)
                            if (percentageFee > 0) {
                              // If no valuation available, we need valuation
                              if (!portfolioValue || portfolioValue <= 0) {
                                return <span className="text-orange-600">Latest valuation needed</span>;
                              }
                              // If valuation exists, calculate properly with NaN protection
                              const calculatedFee = (portfolioValue * percentageFee) / 100;
                              const totalRevenue = fixedCost + calculatedFee;
                              

                              
                              // Final NaN check
                              if (isNaN(totalRevenue) || !isFinite(totalRevenue)) {
                                return <span className="text-red-600">Calculation Error</span>;
                              }
                              
                              return <span className="text-green-600">{formatCurrency(totalRevenue)}</span>;
                            }
                            
                            return <span className="text-gray-500">None</span>;
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>


            </div>

            {/* Right Side - Product Summary & Risk */}
            <div className="p-6">
              {/* Product Summary Section */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <svg className="h-5 w-5 text-indigo-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Product Summary
                </h3>
                
                {isLoadingPortfolioSummary ? (
                  <div className="flex justify-center items-center py-4">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600"></div>
                    <span className="ml-2 text-sm text-gray-600">Loading...</span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Total Product Value and IRR Cards - Side by Side */}
                    <div className="grid grid-cols-2 gap-3">
                    {/* Total Product Value */}
                      <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                        <div className="text-center">
                          <div className="flex justify-center mb-2">
                            <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                            </svg>
                          </div>
                          <div className="text-xs font-medium text-blue-900 uppercase tracking-wide">
                            Total Product Value
                          </div>
                          <div className="text-lg font-bold text-blue-900 mt-1">
                            {portfolioTotalValue !== null ? formatCurrency(portfolioTotalValue) : 'N/A'}
                          </div>
                          {lastValuationDate && (
                            <div className="text-xs text-blue-700 mt-1">
                              as of {formatDate(lastValuationDate)}
                            </div>
                          )}
                      </div>
                    </div>

                    {/* Total Product IRR */}
                      <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                        <div className="text-center">
                          <div className="flex justify-center mb-2">
                            <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                            </svg>
                          </div>
                          <div className="text-xs font-medium text-green-900 uppercase tracking-wide">
                            Total Product IRR
                          </div>
                          <div className={`text-lg font-bold mt-1 ${
                            portfolioIRR !== null
                              ? portfolioIRR >= 0 
                                ? 'text-green-900' 
                                : 'text-red-600'
                              : 'text-gray-500'
                          }`}>
                            {portfolioIRR !== null ? formatPercentage(portfolioIRR) : 'N/A'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Risk Profile Bars (without separate header) */}
                    <div className="space-y-3 pt-2">
                      {/* Target Risk Bar */}
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <div className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                            Target Risk
                          </div>
                          <div className="text-sm font-semibold text-gray-900">{displayedTargetRisk}</div>
                        </div>
                        {targetRisk !== null && !isNaN(targetRisk) && (
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                              style={{ width: `${Math.min(targetRisk * 10, 100)}%` }}
                            ></div>
                          </div>
                        )}
                      </div>
                      
                      {/* Live Risk Bar */}
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <div className="text-xs font-medium text-gray-700 uppercase tracking-wide">Current Risk</div>
                          <div className="text-sm font-semibold text-gray-900">
                            {liveRiskValue !== null && !isNaN(liveRiskValue) ? liveRiskValue.toFixed(1) : 'N/A'}
                          </div>
                        </div>
                        {liveRiskValue !== null && !isNaN(liveRiskValue) && (
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-green-600 h-2 rounded-full transition-all duration-300" 
                              style={{ width: `${Math.min(liveRiskValue * 10, 100)}%` }}
                            ></div>
                          </div>
                        )}
                      </div>
                      
                      {/* Risk Difference Indicator */}
                      {targetRisk !== null && liveRiskValue !== null && 
                       !isNaN(targetRisk) && !isNaN(liveRiskValue) && (
                        <div className="pt-2 border-t border-gray-200">
                          <div className="flex items-center justify-between">
                            <div className="text-xs font-medium text-gray-700 uppercase tracking-wide">Difference</div>
                            <div className={`text-sm font-semibold ${
                              Math.abs(liveRiskValue - targetRisk) < 0.5 ? 'text-green-600' : 
                              Math.abs(liveRiskValue - targetRisk) < 1.0 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {(liveRiskValue - targetRisk).toFixed(1)}
                              {liveRiskValue > targetRisk ? ' higher' : liveRiskValue < targetRisk ? ' lower' : ' (on target)'}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>


                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Portfolio Fund Summary - Show for ALL products */}
        <div className="bg-white shadow-sm rounded-lg border border-gray-100 p-6 mb-8">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <svg className="h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">Portfolio Fund Summary</h3>
              </div>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                account?.template_info?.generation_name 
                  ? 'bg-blue-100 text-blue-800' 
                  : 'bg-green-100 text-green-800'
              }`}>
                {account?.template_info?.generation_name || 'Bespoke'}
              </span>
            </div>
            
            {/* Edit button for all portfolios */}
            {account && (
              <div className="flex space-x-3">
                {isEditingFunds ? (
                  <>
                    <ActionButton
                      variant="cancel"
                      size="md"
                      onClick={handleCancelEditingFunds}
                      disabled={isSavingFunds}
                    />
                    <ActionButton
                      variant="save"
                      size="md"
                      context="Changes"
                      design="descriptive"
                      onClick={handleSaveFunds}
                      disabled={isSavingFunds || Math.abs(getTotalWeighting() - 100) > 0.01}
                      loading={isSavingFunds}
                    />
                  </>
                ) : (
                  <ActionButton
                    variant="edit"
                    size="md"
                    context="Product Funds"
                    design="descriptive"
                    onClick={handleStartEditingFunds}
                  />
                )}
              </div>
            )}
          </div>

          {/* Error Display */}
          {fundError && (
            <div className="mb-6 rounded-md bg-red-50 p-4 border border-red-200">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-800">{fundError}</p>
                </div>
              </div>
            </div>
          )}

          {/* Weighting Progress Bar - Show when editing any portfolio */}
          {isEditingFunds && account && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-medium text-gray-700">Total Portfolio Weighting</span>
                <span className={`text-sm font-semibold ${
                  Math.abs(getTotalWeighting() - 100) < 0.01 ? 'text-green-600' : 
                  getTotalWeighting() > 100 ? 'text-red-600' : 'text-orange-600'
                }`}>
                  {getTotalWeighting().toFixed(2)}% / 100%
                </span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div 
                  className={`h-3 rounded-full transition-all duration-300 ${
                    Math.abs(getTotalWeighting() - 100) < 0.01 ? 'bg-green-500' : 
                    getTotalWeighting() > 100 ? 'bg-red-500' : 'bg-orange-500'
                  }`}
                  style={{ width: `${Math.min(getTotalWeighting(), 100)}%` }}
                ></div>
              </div>
              
              {Math.abs(getTotalWeighting() - 100) > 0.01 && (
                <p className="text-xs text-gray-600 mt-2">
                  {getTotalWeighting() > 100 
                    ? `Over-allocated by ${(getTotalWeighting() - 100).toFixed(2)}%` 
                    : `Under-allocated by ${(100 - getTotalWeighting()).toFixed(2)}%`}
                </p>
              )}
            </div>
          )}

          {/* Fund Management Tools - For all portfolios when editing */}
          {isEditingFunds && account && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-md font-semibold text-gray-900">Add Funds to Product</h4>
                <span className="text-sm text-gray-500">{fundsNotInPortfolio.length} available funds</span>
              </div>
              
              {/* Fund Search & Selection */}
              <div className="mb-3">
                <AutocompleteSearch
                  label="Search and Add Funds"
                  placeholder="Search funds by name or ISIN..."
                  options={fundOptions}
                  onSelect={handleFundSelection}
                  minSearchLength={1}
                  maxResults={10}
                  allowCustomValue={false}
                  size="md"
                  fullWidth={true}
                  helperText={`${fundsNotInPortfolio.length} available funds to add`}
                  className="focus:!border-indigo-500 focus:!ring-indigo-500/10 hover:!border-indigo-400"
                />
              </div>

              {/* Available Funds Summary */}
              {fundsNotInPortfolio.length === 0 && (
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-center">
                  <svg className="mx-auto h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="mt-2 text-sm font-medium text-gray-900">All Funds Added</h3>
                  <p className="mt-1 text-xs text-gray-500">
                    All available funds are already in this product.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Current Portfolio Funds */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-md font-semibold text-gray-900">Product Fund List</h4>
              {!isEditingFunds && (holdings.filter(h => !h.isVirtual && h.status === 'active').length > 0 || holdings.some(h => h.isVirtual && h.fund_name === 'Previous Funds')) && (
                <span className="text-sm text-gray-500">
                  {(() => {
                    const activeFunds = holdings.filter(h => !h.isVirtual && h.status === 'active').length;
                    const previousFundsEntry = holdings.find(h => h.isVirtual && h.fund_name === 'Previous Funds');
                    const inactiveFunds = previousFundsEntry?.inactiveFunds?.length || 0;
                    const totalEntries = activeFunds + (inactiveFunds > 0 ? 1 : 0); // +1 for Previous Funds virtual entry
                    
                    const parts = [];
                    if (activeFunds > 0) parts.push(`${activeFunds} active`);
                    if (inactiveFunds > 0) parts.push(`1 previous (${inactiveFunds} funds)`);
                    
                    return parts.join(' • ');
                  })()}
                </span>
              )}
            </div>
            
            {holdings.filter(h => !h.isVirtual && h.status === 'active').length > 0 ? (
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fund Name
                      </th>
                      <th scope="col" className="px-6 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ISIN
                      </th>
                      <th scope="col" className="px-6 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Risk Factor
                      </th>
                      <th scope="col" className="px-6 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <div>Valuation</div>
                        {findCommonValuationDate(holdings.filter(h => !h.isVirtual && h.status === 'active')) && (
                          <div className="text-xs text-gray-400 font-normal normal-case mt-1">
                            {formatDateMonthYear(findCommonValuationDate(holdings.filter(h => !h.isVirtual && h.status === 'active'))!)}
                          </div>
                        )}
                      </th>
                      <th scope="col" className="px-6 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actual Weighting %
                      </th>
                      <th scope="col" className="px-6 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Target Weighting %
                      </th>
                      <th scope="col" className="px-6 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <div>IRR</div>
                        {findCommonValuationDate(holdings.filter(h => !h.isVirtual && h.status === 'active')) && (
                          <div className="text-xs text-gray-400 font-normal normal-case mt-1">
                            {formatDateMonthYear(findCommonValuationDate(holdings.filter(h => !h.isVirtual && h.status === 'active'))!)}
                          </div>
                        )}
                      </th>
                      {isEditingFunds && account && (
                        <th scope="col" className="px-6 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {holdings.filter(h => !h.isVirtual && h.status === 'active').map((holding, index) => (
                      <tr key={holding.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-6 py-2 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 truncate">{holding.fund_name}</div>
                        </td>
                        <td className="px-6 py-2 whitespace-nowrap text-right">
                          <div className="text-sm text-gray-500">{holding.isin_number || 'N/A'}</div>
                        </td>
                        <td className="px-6 py-2 whitespace-nowrap text-right">
                          <div className="text-sm text-gray-500">
                            {getFundRiskRating(holding.fund_id || 0, fundsData)}
                          </div>
                        </td>
                        <td className="px-6 py-2 whitespace-nowrap text-sm text-right">
                          {holding.market_value !== undefined && holding.market_value !== null ? (
                            <div className="font-medium">{formatCurrency(holding.market_value)}</div>
                          ) : (
                            <span className="text-gray-500">N/A</span>
                          )}
                        </td>
                        <td className="px-6 py-2 whitespace-nowrap text-sm text-right">
                          {liveWeightings.has(holding.id) ? (
                            <div className="flex items-center justify-end">
                              <span className="font-medium">
                                {liveWeightings.get(holding.id)?.toFixed(1)}%
                              </span>
                              {(() => {
                                const targetWeight = holding.target_weighting ? parseFloat(holding.target_weighting) : 0;
                                return targetWeight > 0;
                              })() && (
                                <span className={`ml-2 text-xs px-1 py-0.5 rounded-full ${
                                  Math.abs((liveWeightings.get(holding.id) || 0) - parseFloat(holding.target_weighting || '0')) < 1
                                    ? 'bg-green-100 text-green-800'
                                    : Math.abs((liveWeightings.get(holding.id) || 0) - parseFloat(holding.target_weighting || '0')) < 3
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {(liveWeightings.get(holding.id) || 0) > parseFloat(holding.target_weighting || '0') ? '+' : ''}
                                  {((liveWeightings.get(holding.id) || 0) - parseFloat(holding.target_weighting || '0')).toFixed(1)}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-500">N/A</span>
                          )}
                        </td>
                        <td className="px-6 py-2 whitespace-nowrap text-right">
                          {isEditingFunds && account ? (
                            <div className="flex items-center justify-end space-x-2">
                              <div className="relative">
                                <input
                                  type="number"
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      e.currentTarget.blur();
                                    }
                                  }}
                                  value={holding.target_weighting || ''}
                                  onChange={(e) => {
                                    const newWeighting = parseFloat(e.target.value) || 0;
                                    // Update the holding in the local state
                                    setHoldings(prev => prev.map(h => 
                                      h.id === holding.id 
                                        ? { ...h, target_weighting: newWeighting.toString() }
                                        : h
                                    ));
                                  }}
                                  className="w-20 pl-2 pr-6 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                  min="0"
                                  max="100"
                                  step="0.01"
                                  placeholder="0.00"
                                />
                                <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
                                  <span className="text-gray-500 text-xs">%</span>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm font-medium text-gray-900">
                              {holding.target_weighting ? parseFloat(holding.target_weighting).toFixed(2) : '0.00'}%
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-2 whitespace-nowrap text-sm text-right">
                          {holding.irr !== undefined && holding.irr !== null ? (
                            <span className={`font-medium ${
                              holding.irr >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {formatPercentage(holding.irr)}
                            </span>
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                        </td>
                        {isEditingFunds && account && !isCashFund({ fund_name: holding.fund_name, isin_number: holding.isin_number } as any) && (
                          <td className="px-6 py-2 whitespace-nowrap text-right">
                            <ActionButton
                              variant="delete"
                              size="icon"
                              onClick={() => handleRemoveFund(holding.fund_id || 0)}
                              title="Permanently remove fund from portfolio"
                            />
                          </td>
                        )}
                      </tr>
                    ))}
                    
                    {/* Previous Funds Virtual Row */}
                    {holdings.some(h => h.isVirtual && h.fund_name === 'Previous Funds') && (
                      <>
                        <tr className="bg-gray-100 border-t-2 border-gray-300">
                          <td className="px-6 py-2 whitespace-nowrap">
                            <div className="flex items-center">
                              <button
                                onClick={() => setIsPreviousFundsExpanded(!isPreviousFundsExpanded)}
                                className="mr-2 p-0.5 rounded hover:bg-gray-200 transition-colors"
                                title={isPreviousFundsExpanded ? 'Collapse previous funds' : 'Expand previous funds'}
                              >
                                {isPreviousFundsExpanded ? (
                                  <ChevronUpIcon className="h-4 w-4 text-gray-500" />
                                ) : (
                                  <ChevronDownIcon className="h-4 w-4 text-gray-500" />
                                )}
                              </button>
                              <div className="text-sm font-medium text-gray-600">Previous Funds</div>
                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-800">
                                {(() => {
                                  const previousFundsEntry = holdings.find(h => h.isVirtual && h.fund_name === 'Previous Funds');
                                  return previousFundsEntry?.inactiveFunds?.length || 0;
                                })()} funds
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-2 whitespace-nowrap text-right">
                            <div className="text-sm text-gray-500">-</div>
                          </td>
                          <td className="px-6 py-2 whitespace-nowrap text-right">
                            <div className="text-sm text-gray-500">-</div>
                          </td>
                          <td className="px-6 py-2 whitespace-nowrap text-sm text-right">
                            <span className="text-gray-500">N/A</span>
                          </td>
                          <td className="px-6 py-2 whitespace-nowrap text-sm text-right">
                            <span className="text-gray-500">-</span>
                          </td>
                          <td className="px-6 py-2 whitespace-nowrap text-right">
                            <span className="text-gray-500">-</span>
                          </td>
                          <td className="px-6 py-2 whitespace-nowrap text-right">
                            <span className="text-gray-500">-</span>
                          </td>
                          {isEditingFunds && account && (
                            <td className="px-6 py-2 whitespace-nowrap text-right">
                              <span className="text-gray-500">-</span>
                            </td>
                          )}
                        </tr>
                        
                        {/* Expanded Individual Inactive Funds */}
                        {isPreviousFundsExpanded && 
                          (() => {
                            const previousFundsEntry = holdings.find(h => h.isVirtual && h.fund_name === 'Previous Funds');
                            return previousFundsEntry?.inactiveFunds || [];
                          })().map((holding, index) => (
                            <tr key={`inactive-${holding.id}`} className="bg-blue-50 border-l-4 border-blue-300">
                              <td className="px-6 py-2 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="ml-8 text-sm text-gray-700">
                                    ↳ {holding.fund_name}
                                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                      Inactive
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-2 whitespace-nowrap text-right">
                                <div className="text-sm text-gray-500">{holding.isin_number || 'N/A'}</div>
                              </td>
                              <td className="px-6 py-2 whitespace-nowrap text-right">
                                <div className="text-sm text-gray-500">
                                  {getFundRiskRating(holding.fund_id || 0, fundsData)}
                                </div>
                              </td>
                              <td className="px-6 py-2 whitespace-nowrap text-right">
                                <div className="text-sm text-gray-500">
                                  {holding.end_date ? formatDate(holding.end_date) : 'N/A'}
                                </div>
                              </td>
                              <td className="px-6 py-2 whitespace-nowrap text-right">
                                <span className="text-sm text-gray-500">-</span>
                              </td>
                              <td className="px-6 py-2 whitespace-nowrap text-right">
                                {isEditingFunds && account ? (
                                  <div className="flex items-center justify-end space-x-2">
                                    <div className="relative">
                                      <input
                                        type="number"
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            e.preventDefault();
                                            e.currentTarget.blur();
                                          }
                                        }}
                                        value={holding.target_weighting || ''}
                                        onChange={(e) => {
                                          const newWeighting = parseFloat(e.target.value) || 0;
                                          // Update the inactive holding in the virtual Previous Funds entry
                                          setHoldings(prev => prev.map(h => {
                                            if (h.isVirtual && h.fund_name === 'Previous Funds' && h.inactiveFunds) {
                                              return {
                                                ...h,
                                                inactiveFunds: h.inactiveFunds.map(inactiveFund => 
                                                  inactiveFund.id === holding.id 
                                                    ? { ...inactiveFund, target_weighting: newWeighting.toString() }
                                                    : inactiveFund
                                                )
                                              };
                                            }
                                            return h;
                                          }));
                                        }}
                                        className="w-16 px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center"
                                        placeholder="0"
                                        min="0"
                                        max="100"
                                        step="0.01"
                                      />
                                      <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-gray-400 pointer-events-none">
                                        %
                                      </span>
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-sm text-gray-500">
                                    {holding.target_weighting ? parseFloat(holding.target_weighting).toFixed(2) : '0.00'}%
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-2 whitespace-nowrap text-right">
                                <span className="text-sm text-gray-500">-</span>
                              </td>
                              {isEditingFunds && account && !isCashFund({ fund_name: holding.fund_name, isin_number: holding.isin_number } as any) && (
                                <td className="px-6 py-2 whitespace-nowrap text-right">
                                  <ActionButton
                                    variant="delete"
                                    size="icon"
                                    onClick={() => handleRemoveFund(holding.fund_id || 0)}
                                    title="Permanently delete inactive fund and all historical data"
                                  />
                                </td>
                              )}
                            </tr>
                          ))
                        }
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No active funds in portfolio</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {account?.template_info?.generation_name 
                    ? 'This template portfolio has no funds configured, but you can customize it by adding funds.'
                    : 'Get started by adding funds to this bespoke portfolio.'
                  }
                </p>
                {!isEditingFunds && account && (
                  <div className="mt-6">
                    <ActionButton
                      variant="add"
                      size="md"
                      context="Funds"
                      design="descriptive"
                      onClick={handleStartEditingFunds}
                    />
                  </div>
                )}
              </div>
            )}
          </div>




        </div>
      </div>
    </>
  );
};

export default ProductOverview;