import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getProductFUM, getProductIRR } from '../services/api';

// Basic interfaces for type safety
interface Account {
  id: number;
  client_product_id: number;
  client_id: number;
  client_name: string;
  product_name: string;
  status: string;
  start_date: string;
  end_date?: string;
  irr?: number;
  total_value?: number;
  provider_name?: string;
  provider_id?: number;
  product_type?: string;
  plan_number?: string;
  is_bespoke?: boolean;
  original_template_id?: number;
  original_template_name?: string;
  target_risk?: number;
  portfolio_id?: number;
  notes?: string;
  current_portfolio?: {
    id: number;
    portfolio_name: string;
    assignment_start_date: string;
  };
  template_info?: {
    id: number;
    name: string;
    created_at: string;
  };
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
}

interface ProductOwner {
  id: number;
  name: string;
  type?: string;
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

interface ProductOverviewProps {
  accountId?: string;
}

const ProductOverview: React.FC<ProductOverviewProps> = ({ accountId: propAccountId }) => {
  const { accountId: paramAccountId } = useParams<{ accountId: string }>();
  const accountId = propAccountId || paramAccountId;
  const navigate = useNavigate();
  const { api } = useAuth();
  const [account, setAccount] = useState<Account | null>(null);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
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
  const [providers, setProviders] = useState<Provider[]>([]);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [formData, setFormData] = useState({
    product_name: '',
    provider_id: '',
    portfolio_id: '',
    product_type: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (accountId) {
      console.log('ProductOverview: Fetching data for accountId:', accountId);
      fetchData(accountId);
    } else {
      console.error('ProductOverview: No accountId available for data fetching');
    }
  }, [accountId, api]);

  // Call the async function to calculate target risk and update state
  useEffect(() => {
    if (account) {
      calculateTargetRisk().then(risk => {
        setDisplayedTargetRisk(risk);
      });
    }
  }, [account, api]);

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

  // Initialize form data when account data is loaded
  useEffect(() => {
    if (account) {
      setFormData({
        product_name: account.product_name || '',
        provider_id: account.provider_id?.toString() || '',
        portfolio_id: account.current_portfolio?.id?.toString() || account.portfolio_id?.toString() || '',
        product_type: account.product_type || ''
      });
    }
  }, [account]);

  // Fetch providers and portfolios for edit form
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
      
      console.log('ProductOverview: Making API request to optimized endpoint for product data');
      
      // Use the new optimized endpoint that returns all data in one request
      const completeProductResponse = await api.get(`/api/client_products/${accountId}/complete`);
      const completeData = completeProductResponse.data;
      
      console.log('ProductOverview: Complete product data received:', completeData);
      
      // Set account data directly from the response
      setAccount(completeData);
      
      // Set product owners directly from the response
      setProductOwners(completeData.product_owners || []);
      console.log('Product owners loaded:', completeData.product_owners?.length || 0);
      
      // Fetch portfolio summary
      await fetchPortfolioSummary(accountId);
      
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
      
      // Fetch template weightings if original_template_id exists
      let templateWeightings = new Map<number, number>();
      if (completeData.original_template_id) {
        try {
          // Get the generation template details using the new endpoint
          const generationResponse = await api.get(`/api/available_portfolios/generations/${completeData.original_template_id}`);
          const generationData = generationResponse.data || {};
          
          // Get the funds associated with this generation using path parameter
          const templateFundsResponse = await api.get(`/api/available_portfolios/available_portfolio_funds/generation/${completeData.original_template_id}`);
          const templateFunds = templateFundsResponse.data || [];
          
          // Check if funds array exists in the response
          if (templateFunds && Array.isArray(templateFunds) && templateFunds.length > 0) {
            console.log('Template generation funds found:', templateFunds.length);
            
            // Create a map of fund_id to template weighting
            templateFunds.forEach((tf: any) => {
              if (tf.fund_id && tf.target_weighting !== undefined && tf.target_weighting !== null) {
                templateWeightings.set(tf.fund_id, tf.target_weighting);
                console.log(`Added template weighting for fund ${tf.fund_id}: ${tf.target_weighting}%`);
              }
            });
            
            console.log('Fetched template weightings:', Object.fromEntries([...templateWeightings.entries()]));
          } else {
            console.warn('No funds found in template generation data');
          }
        } catch (err) {
          console.error('Error fetching template generation weightings:', err);
        }
      }
      
      // Process holdings from portfolio_funds
      if (completeData.portfolio_funds && completeData.portfolio_funds.length > 0) {
        const processedHoldings = completeData.portfolio_funds.map((pf: any) => {
          // Standardize weighting value
          let standardizedWeighting = pf.weighting;
          if (standardizedWeighting !== null && standardizedWeighting !== undefined) {
            let numValue = typeof standardizedWeighting === 'string' 
              ? parseFloat(standardizedWeighting) 
              : standardizedWeighting;
            
            // If it's in decimal format (0-1), convert to percentage (0-100)
            if (numValue <= 1 && numValue > 0) {
              standardizedWeighting = numValue * 100;
            }
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
            irr: pf.irr_result,
            irr_date: pf.irr_calculation_date || pf.irr_date,
            status: pf.status || 'active',
            end_date: pf.end_date,
          };
        });
        
        console.log('ProductOverview: Processed holdings:', processedHoldings);
        
        // Filter active and inactive holdings
        const activeHoldings = processedHoldings.filter(
          (h: Holding) => h.status !== 'inactive' && (!h.end_date || new Date(h.end_date) > new Date())
        );
        
        const inactiveHoldings = processedHoldings.filter(
          (h: Holding) => h.status === 'inactive' || (h.end_date && new Date(h.end_date) <= new Date())
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
            riskFactor: averageRiskFactor
          } as Holding;
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
          
          // Cash fund (name 'Cash', ISIN 'N/A') always goes second-to-last (before Previous Funds)
          const aIsCash = a.fund_name === 'Cash' && a.isin_number === 'N/A';
          const bIsCash = b.fund_name === 'Cash' && b.isin_number === 'N/A';

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

  const fetchPortfolioSummary = async (productId: string) => {
    try {
      setIsLoadingPortfolioSummary(true);
      console.log('Fetching portfolio summary for product:', productId);
      
      // Fetch FUM and IRR data in parallel
      const [fumResponse, irrResponse] = await Promise.all([
        getProductFUM(parseInt(productId)),
        getProductIRR(parseInt(productId))
      ]);
      
      console.log('FUM response:', fumResponse.data);
      console.log('IRR response:', irrResponse.data);
      
      setPortfolioTotalValue(fumResponse.data.fum || 0);
      setPortfolioIRR(irrResponse.data.irr || 0);
      
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
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Format percentage with 1 decimal place
  const formatPercentage = (value: number | null | undefined): string => {
    if (value === null || value === undefined) {
      return 'N/A';
    }
    return `${value.toFixed(1)}%`;
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

  // Get fund risk rating for display
  const getFundRiskRating = (fundId: number, fundsMap: Map<number, any>): string => {
    const fund = Array.from(fundsMap.values()).find(fund => fund.id === fundId);
    if (fund && fund.risk_factor !== undefined && fund.risk_factor !== null) {
      return fund.risk_factor.toString();
    }
    return 'N/A';
  };

  // Calculate target risk based on the original portfolio template
  const calculateTargetRisk = async (): Promise<string> => {
    if (!account) return "N/A";
    
    // If account has target_risk already set, use that
    if (account.target_risk !== undefined && account.target_risk !== null) {
      setTargetRisk(account.target_risk);
      return account.target_risk.toString();
    }
    
    // If we have a template ID, fetch the template and calculate the weighted risk
    if (account.original_template_id) {
      try {
        // Get the generation by ID using the new endpoint
        const generationResponse = await api.get(`/api/available_portfolios/generations/${account.original_template_id}`);
        const generationData = generationResponse.data || {};
        
        // Get the funds associated with this generation using path parameter
        const templateFundsResponse = await api.get(`/api/available_portfolios/available_portfolio_funds/generation/${account.original_template_id}`);
        const templateFunds = templateFundsResponse.data || [];
        
        // Check if there are funds in the response
        if (templateFunds && Array.isArray(templateFunds) && templateFunds.length > 0) {
          let totalWeight = 0;
          let weightedRiskSum = 0;
          let validFundsCount = 0;
          
          // We need to fetch fund details for each fund to get risk factors
          const fundDetailsPromises = templateFunds.map((fund: any) => {
            if (fund.fund_id) {
              return api.get(`/api/funds/${fund.fund_id}`);
            }
            return Promise.resolve(null);
          });
          
          const fundDetailsResponses = await Promise.all(fundDetailsPromises);
          const fundDetails = fundDetailsResponses
            .filter((response: any) => response !== null)
            .map((response: any) => response.data);
          
          // Create a map for quick lookup
          const fundDetailsMap = new Map();
          fundDetails.forEach((fund: any) => {
            if (fund && fund.id) {
              fundDetailsMap.set(fund.id, fund);
            }
          });
          
          // Calculate weighted average of risk factors
          for (const fund of templateFunds) {
            if (fund.fund_id) {
              const fundDetail = fundDetailsMap.get(fund.fund_id);
              
              if (fundDetail && 
                  fundDetail.risk_factor !== undefined && 
                  fundDetail.risk_factor !== null) {
                
                const risk = fundDetail.risk_factor;
                const weight = fund.target_weighting || 0;
                
                weightedRiskSum += risk * weight;
                totalWeight += weight;
                validFundsCount++;
                console.log(`Fund ${fundDetail.fund_name}: risk=${risk}, weight=${weight}`);
              }
            }
          }
          
          // If we found valid funds with risk factors, calculate the weighted average
          if (validFundsCount > 0 && totalWeight > 0) {
            const calculatedRisk = weightedRiskSum / totalWeight;
            
            // Cache the calculated risk
            setTargetRisk(calculatedRisk);
            
            // Also update the account object
            setAccount(prev => {
              if (!prev) return prev;
              return {
                ...prev,
                target_risk: calculatedRisk
              };
            });
            
            console.log(`Calculated target risk: ${calculatedRisk.toFixed(1)} from ${validFundsCount} funds`);
            return calculatedRisk.toFixed(1);
          }
        } else {
          console.warn("No funds found in template generation response");
          return "N/A";
        }
      } catch (err) {
        console.error("Error calculating target risk:", err);
      }
    }
    
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
    
    // Calculate total value
    totalValue = holdingsToUse.reduce((sum, h) => sum + h.market_value, 0);
    
    if (totalValue <= 0) {
      console.log('Total portfolio value is zero or negative');
      return "N/A";
    }
    
    // Now calculate weighted risk
    for (const holding of holdingsToUse) {
      const fundId = holding.fund_id;
      const value = holding.market_value;
      
      if (!fundId) continue;
      
      const fund = Array.from(fundsData.values()).find(f => f.id === fundId);
      
      if (fund && fund.risk_factor !== undefined && fund.risk_factor !== null) {
        weightedRiskSum += fund.risk_factor * value;
        fundsWithValidValuations++;
        
        console.log('DEBUG - Risk calculation for fund:', {
          fund_name: fund.fund_name,
          fund_id: fundId,
          risk_factor: fund.risk_factor,
          value: value,
          weight: value / totalValue,
          contribution: fund.risk_factor * (value / totalValue)
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
      // Calculate total portfolio value
      const totalValue = holdings.reduce((sum, h) => sum + h.market_value, 0);
      
      // Calculate each fund's proportion of the total
      holdings.forEach(holding => {
        const weighting = totalValue > 0 ? (holding.market_value / totalValue) * 100 : 0;
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
      
      // Navigate back to products list
      navigate('/products', { 
        state: { 
          notification: {
            type: 'success',
            message: account?.portfolio_id 
              ? `Product and associated portfolio #${account.portfolio_id} deleted successfully` 
              : 'Product deleted successfully'
          }
        }
      });
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
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => setIsDeleteModalOpen(false)}
              className="inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={handleDeleteProduct}
              className={`inline-flex justify-center px-4 py-2 text-sm font-medium text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 ${
                isDeleting ? 'bg-red-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {isDeleting ? 'Deleting...' : 'Delete Product and Portfolio'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Toggle edit mode
  const toggleEditMode = () => {
    setIsEditMode(!isEditMode);
    setFormError(null);
    
    // Reset form data when entering edit mode
    if (!isEditMode && account) {
      setFormData({
        product_name: account.product_name || '',
        provider_id: account.provider_id?.toString() || '',
        portfolio_id: account.current_portfolio?.id?.toString() || account.portfolio_id?.toString() || '',
        product_type: account.product_type || ''
      });
    }
  };

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Update the existing handleSubmit to set initialNotes after a successful save
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!accountId) return;
    
    try {
      setIsSubmitting(true);
      setFormError(null);
      
      const updateData = {
        product_name: formData.product_name,
        provider_id: formData.provider_id ? parseInt(formData.provider_id) : null,
        portfolio_id: formData.portfolio_id ? parseInt(formData.portfolio_id) : null,
        product_type: formData.product_type
      };
      
      await api.patch(`/api/client_products/${accountId}`, updateData);
      await fetchData(accountId);
      setIsEditMode(false);
      
    } catch (err: any) {
      console.error('Error updating product:', err);
      setFormError(err.response?.data?.detail || 'Failed to update product');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Product Edit Form Component
  const ProductEditForm = () => {
    return (
      <div className="bg-white shadow-sm rounded-lg border border-gray-100 mb-6 p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Edit Product Details</h3>
          <button
            onClick={toggleEditMode}
            className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
        
        {formError && (
          <div className="mb-4 p-2 text-sm text-red-700 bg-red-100 rounded-md">
            {formError}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="product_name" className="block text-sm font-medium text-gray-700 mb-1">
                Product Name
              </label>
              <input
                type="text"
                id="product_name"
                name="product_name"
                value={formData.product_name}
                onChange={handleInputChange}
                className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
                required
              />
            </div>
            
            <div>
              <label htmlFor="provider_id" className="block text-sm font-medium text-gray-700 mb-1">
                Provider
              </label>
              <select
                id="provider_id"
                name="provider_id"
                value={formData.provider_id}
                onChange={handleInputChange}
                className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
              >
                <option value="">Select Provider</option>
                {providers.map(provider => (
                  <option key={provider.id} value={provider.id}>
                    {provider.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="portfolio_id" className="block text-sm font-medium text-gray-700 mb-1">
                Portfolio
              </label>
              <select
                id="portfolio_id"
                name="portfolio_id"
                value={formData.portfolio_id}
                onChange={handleInputChange}
                className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
              >
                <option value="">Select Portfolio</option>
                {portfolios.map(portfolio => (
                  <option key={portfolio.id} value={portfolio.id}>
                    {portfolio.portfolio_name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="product_type" className="block text-sm font-medium text-gray-700 mb-1">
                Product Type
              </label>
              <input
                type="text"
                id="product_type"
                name="product_type"
                value={formData.product_type}
                onChange={handleInputChange}
                className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
              />
            </div>
          </div>
          
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    );
  };

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
      <div className="flex flex-col space-y-6">
        {/* Page Header and Edit/Delete Buttons */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{account.product_name}</h2>
          </div>
          <div className="flex space-x-3">
            {isEditMode ? (
              <button
                onClick={() => {
                  setIsEditMode(false);
                  // Reset form data if canceling edit
                  if (account) {
                    setFormData({
                      product_name: account.product_name || '',
                      provider_id: account.provider_id?.toString() || '',
                      portfolio_id: account.current_portfolio?.id?.toString() || account.portfolio_id?.toString() || '',
                      product_type: account.product_type || ''
                    });
                  }
                }}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Cancel
              </button>
            ) : (
              <>
                <button
                  onClick={toggleEditMode}
                  className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  Edit Product
                </button>
                <button
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="inline-flex items-center px-3 py-2 border border-red-300 shadow-sm text-sm leading-4 font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Delete
                </button>
              </>
            )}
          </div>
        </div>

        {/* Edit Form (conditionally displayed) */}
        {isEditMode && <ProductEditForm />}

        {/* Product Info Grid - Ensure this div is properly closed after adding Product Owners */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-md">
          <div>
            <div className="text-sm font-medium text-gray-500">Client Name</div>
            <div className="text-base font-medium text-gray-900 mt-1">{account.client_name || 'N/A'}</div>
          </div>
          
          <div>
            <div className="text-sm font-medium text-gray-500">Provider</div>
            <div className="text-base font-medium text-gray-900 mt-1">{account.provider_name || 'N/A'}</div>
          </div>
          
          <div>
            <div className="text-sm font-medium text-gray-500">Product Type</div>
            <div className="text-base font-medium text-gray-900 mt-1">{account.product_type || 'N/A'}</div>
          </div>
          
          <div>
            <div className="text-sm font-medium text-gray-500">Portfolio Template</div>
            <div className="text-base font-medium text-gray-900 mt-1">
              {account.original_template_name || account.template_info?.name || 'Bespoke'}
            </div>
          </div>
          
          <div>
            <div className="text-sm font-medium text-gray-500">Target Risk</div>
            <div className="text-base font-medium text-gray-900 mt-1">{displayedTargetRisk}</div>
          </div>
          
          <div>
            <div className="text-sm font-medium text-gray-500">Start Date</div>
            <div className="text-base font-medium text-gray-900 mt-1">
              {account.start_date ? formatDate(account.start_date) : 'N/A'}
            </div>
          </div>

          {/* Product Owners Section - Moved into the grid */}
          {productOwners.length > 0 && (
            <div className="md:col-span-3 bg-white shadow-sm rounded-lg border border-gray-100 p-4 mt-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Product Owners</h3>
              <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {productOwners.map(owner => (
                  <li key={owner.id} className="flex items-center p-2 bg-gray-50 rounded">
                    <svg className="h-5 w-5 text-primary-600 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="text-sm font-medium">{owner.name}</span>
                    {owner.type && <span className="ml-2 text-xs text-gray-500">({owner.type})</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div> {/* This is the closing div for "Product Info Grid" */}

        {/* Portfolio Summary */}
        <div className="bg-white shadow-sm rounded-lg border border-gray-100 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Portfolio Summary</h3>
          
          {isLoadingPortfolioSummary ? (
            <div className="flex justify-center items-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
              <span className="ml-2 text-gray-600">Loading portfolio summary...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Total Portfolio Value */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-blue-900">
                      Total Portfolio Value
                    </div>
                    <div className="text-2xl font-bold text-blue-900">
                      {portfolioTotalValue !== null ? formatCurrency(portfolioTotalValue) : 'N/A'}
                    </div>
                    {lastValuationDate && (
                      <div className="text-xs text-blue-700 mt-1">
                        as of {formatDate(lastValuationDate)}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Total Portfolio IRR */}
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-green-900">
                      Total Portfolio IRR
                    </div>
                    <div className={`text-2xl font-bold ${
                      portfolioIRR !== null
                        ? portfolioIRR >= 0 
                          ? 'text-green-900' 
                          : 'text-red-600'
                        : 'text-gray-500'
                    }`}>
                      {portfolioIRR !== null ? formatPercentage(portfolioIRR) : 'N/A'}
                    </div>
                    <div className="text-xs text-green-700 mt-1">
                      Calculated from total portfolio cash flows
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Risk Comparison Bars */}
        <div className="bg-white shadow-sm rounded-lg border border-gray-100 p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Risk Profile Comparison</h3>
          <div className="flex flex-col space-y-4">
            {/* Target Risk Bar */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <div className="text-sm font-medium text-gray-700">
                  Target Risk ({account.original_template_name || account.template_info?.name || 'Bespoke'})
                </div>
                <div className="text-sm font-semibold">{displayedTargetRisk}</div>
              </div>
              {targetRisk !== null && !isNaN(targetRisk) && (
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-blue-600 h-2.5 rounded-full" 
                    style={{ width: `${Math.min(targetRisk * 10, 100)}%` }}
                  ></div>
                </div>
              )}
            </div>
            
            {/* Live Risk Bar */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <div className="text-sm font-medium text-gray-700">Current Risk (Based on Valuations)</div>
                <div className="text-sm font-semibold">{liveRiskValue !== null && !isNaN(liveRiskValue) ? liveRiskValue.toFixed(1) : 'N/A'}</div>
              </div>
              {liveRiskValue !== null && !isNaN(liveRiskValue) && (
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-green-600 h-2.5 rounded-full" 
                    style={{ width: `${Math.min(liveRiskValue * 10, 100)}%` }}
                  ></div>
                </div>
              )}
            </div>
            
            {/* Risk Difference Indicator */}
            {targetRisk !== null && liveRiskValue !== null && 
             !isNaN(targetRisk) && !isNaN(liveRiskValue) && (
              <div className="pt-2 border-t border-gray-200 mt-2">
                <div className="flex items-center">
                  <div className="text-sm font-medium text-gray-700">Difference:</div>
                  <div className={`ml-2 text-sm font-semibold ${
                    Math.abs(liveRiskValue - targetRisk) < 0.5 ? 'text-green-600' : 
                    Math.abs(liveRiskValue - targetRisk) < 1.0 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {(liveRiskValue - targetRisk).toFixed(1)}
                    {liveRiskValue > targetRisk ? ' higher' : liveRiskValue < targetRisk ? ' lower' : ' (on target)'}
                  </div>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {Math.abs(liveRiskValue - targetRisk) < 0.5 
                    ? 'The portfolio is well-aligned with its target risk profile.'
                    : Math.abs(liveRiskValue - targetRisk) < 1.0
                    ? 'The portfolio is slightly off target. Consider minor rebalancing.'
                    : 'The portfolio has significantly deviated from its target risk. Rebalancing recommended.'}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Fund Summary Table */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <h3 className="text-lg font-semibold">Fund Summary</h3>
          </div>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full table-fixed divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Fund Name</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">ISIN Number</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Valuation</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Weighting</th>
                  {account.original_template_id && (
                    <th className="px-6 py-3 text-left text-sm font-semibold">Target Weighting</th>
                  )}
                  <th className="px-6 py-3 text-left text-sm font-semibold">Risk Factor</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">IRR</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {holdings.length > 0 ? (
                  holdings.map((holding) => (
                    <tr key={holding.id} className={`hover:bg-indigo-50 transition-colors duration-150 ${holding.isVirtual ? "bg-gray-100 border-t border-gray-300" : ""}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className={`text-sm ${holding.isVirtual ? "font-semibold text-blue-800" : "font-medium text-gray-900"}`}>
                            {holding.fund_name}
                            {holding.isVirtual && (
                              <div className="text-xs text-gray-500 mt-1">
                                (Inactive funds)
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{holding.isin_number || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {holding.isVirtual ? (
                          <span className="text-blue-800 font-medium">N/A</span>
                        ) : (
                          holding.market_value !== undefined && holding.market_value !== null
                            ? (
                              <div>
                                <div>{formatCurrency(holding.market_value)}</div>
                                {holding.valuation_date && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    as of {formatDate(holding.valuation_date)}
                                  </div>
                                )}
                              </div>
                            ) 
                            : 'N/A'
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {holding.isVirtual ? (
                          <span className="text-blue-800 font-medium">N/A</span>
                        ) : (
                          liveWeightings.has(holding.id)
                            ? `${liveWeightings.get(holding.id)?.toFixed(1)}%` 
                            : 'N/A'
                        )}
                      </td>
                      {account.original_template_id && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {holding.isVirtual ? (
                            <span className="text-blue-800 font-medium">N/A</span>
                          ) : (
                            holding.template_weighting !== undefined 
                              ? `${typeof holding.template_weighting === 'number' && holding.template_weighting <= 1 
                                  ? (holding.template_weighting * 100).toFixed(1) 
                                  : parseFloat(String(holding.template_weighting)).toFixed(1)}%` 
                              : 'N/A'
                          )}
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {holding.isVirtual ? (
                          holding.riskFactor !== undefined ? (
                            <span className="text-blue-800 font-medium">{holding.riskFactor.toFixed(1)}</span>
                          ) : (
                            <span className="text-blue-800 font-medium">N/A</span>
                          )
                        ) : (
                          getFundRiskRating(holding.fund_id || 0, fundsData)
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {holding.isVirtual ? (
                          <span className="text-blue-800 font-medium">N/A</span>
                        ) : (
                          holding.irr !== undefined && holding.irr !== null ? (
                            <div>
                              <span className={`${holding.irr >= 0 ? 'text-green-700' : 'text-red-700'} font-medium`}>
                                {formatPercentage(holding.irr)}
                              </span>
                              {holding.irr_date && (
                                <div className="text-xs text-gray-500 mt-1">
                                  as of {formatDate(holding.irr_date)}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-500">N/A</span>
                          )
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={account.original_template_id ? 7 : 6} className="px-6 py-4 text-center text-sm text-gray-500">
                      No funds found in this product.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div> {/* This is the closing div for the main content wrapper started after isEditMode && <ProductEditForm /> and before Product Info Grid. */}
    </>
  );
};

export default ProductOverview;