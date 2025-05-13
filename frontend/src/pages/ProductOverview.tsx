import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

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
  amount_invested: number;
  market_value: number;
  irr?: number;
  fund_id?: number;
  valuation_date?: string;
}

interface ProductOwner {
  id: number;
  name: string;
  type?: string;
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

  const fetchData = async (accountId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('ProductOverview: Making API request to /api/client_products/' + accountId);
      
      // First fetch the account to get the portfolio_id
      const accountResponse = await api.get(`/api/client_products/${accountId}`);
      console.log('ProductOverview: Product data received:', accountResponse.data);
      
      // Debug provider data
      console.log('DEBUG - Provider data in account:', {
        provider_id: accountResponse.data.provider_id,
        provider_name: accountResponse.data.provider_name
      });
      
      // Get provider details if we have a provider_id but no provider_name
      if (accountResponse.data.provider_id && !accountResponse.data.provider_name) {
        try {
          const providerResponse = await api.get(`/api/available_providers?id=eq.${accountResponse.data.provider_id}`);
          if (providerResponse.data && providerResponse.data.length > 0 && providerResponse.data[0].name) {
            // Update the account data with provider name
            accountResponse.data.provider_name = providerResponse.data[0].name;
            console.log('DEBUG - Updated provider name from API:', providerResponse.data[0].name);
          }
        } catch (providerErr) {
          console.error('Error fetching provider details:', providerErr);
        }
      }
      
      setAccount(accountResponse.data);
      
      // Fetch product owners for this product
      try {
        // First fetch all product owners
        const productOwnersResponse = await api.get('/api/product_owners');
        
        if (productOwnersResponse.data && productOwnersResponse.data.length > 0) {
          // Since there's no GET endpoint for product_owner_products, 
          // we'll check each product owner to see if it owns this product
          const productOwners = [];
          
          // For each product owner, check if they own this product
          for (const owner of productOwnersResponse.data) {
            try {
              // Get all products for this product owner
              const ownerProductsResponse = await api.get(`/api/product_owners/${owner.id}/products`);
              
              // Check if this product is in the list of the owner's products
              const isOwnerOfThisProduct = ownerProductsResponse.data?.some(
                (product: any) => product.id === parseInt(accountId)
              );
              
              // If this owner owns this product, add it to our list
              if (isOwnerOfThisProduct) {
                productOwners.push(owner);
              }
            } catch (err) {
              console.error(`Error checking if owner ${owner.id} has product ${accountId}:`, err);
            }
          }
          
          setProductOwners(productOwners);
          console.log('Product owners found:', productOwners.length);
        } else {
          console.log('No product owners found');
          setProductOwners([]);
        }
      } catch (ownersErr) {
        console.error('Error fetching product owners:', ownersErr);
        // Set empty array to avoid UI errors
        setProductOwners([]);
      }
      
      // Get the portfolio_id from the account - first try direct link, then fall back to current_portfolio
      const portfolioId = accountResponse.data.portfolio_id || accountResponse.data.current_portfolio?.id;
      console.log('ProductOverview: Portfolio ID from product:', portfolioId);
      
      if (!portfolioId) {
        console.warn('ProductOverview: No portfolio ID found for this product');
      }
      
      // Now fetch the remaining data in parallel
      const [
        fundsResponse,
        portfolioFundsResponse
      ] = await Promise.all([
        api.get('/funds'),
        portfolioId ? api.get(`/api/portfolio_funds?portfolio_id=${portfolioId}`) : api.get('/api/portfolio_funds')
      ]);
      
      console.log('ProductOverview: Product data received:', accountResponse.data);
      setAccount(accountResponse.data);
      
      // If the product is based on a portfolio template, try to get the target risk
      if (accountResponse.data.original_template_id) {
        try {
          const templateResponse = await api.get(`/api/available_portfolios/${accountResponse.data.original_template_id}`);
          if (templateResponse.data && templateResponse.data.target_risk) {
            setTargetRisk(templateResponse.data.target_risk);
            
            // Update the account object with target risk
            setAccount(prev => {
              if (!prev) return prev;
              return {
                ...prev,
                target_risk: templateResponse.data.target_risk
              };
            });
          }
        } catch (templateErr) {
          console.error('Error fetching portfolio template:', templateErr);
        }
      }
      
      // Create a map of funds for quick lookups
      const fundsMap = new Map<number, any>(
        fundsResponse.data.map((fund: any) => [fund.id, fund])
      );
      
      // Save funds data for risk factor display
      setFundsData(fundsMap);
      
      console.log('ProductOverview: Portfolio funds data:', portfolioFundsResponse.data);
      
      // With the new schema, portfolio_funds directly contain all the fund info we need
      if (portfolioId && portfolioFundsResponse.data.length > 0) {
        // Process portfolio funds and fetch their latest valuations if needed
        const portfolioFundsWithValuations = await Promise.all(
          portfolioFundsResponse.data.map(async (pf: any) => {
            try {
              // Try to get the latest valuation for this fund
              const valuationResponse = await api.get(
                `/api/fund_valuations?portfolio_fund_id=${pf.id}&order=valuation_date.desc&limit=1`
              );
              
              console.log(`DEBUG - Latest valuation for fund ${pf.id}:`, valuationResponse.data);
              
              // If we have a valuation, use it
              if (valuationResponse.data && valuationResponse.data.length > 0) {
                const valuation = valuationResponse.data[0];
                // Store the value in the portfolio fund (it could be zero, but that's valid)
                pf.market_value = valuation.value;
                pf.valuation_date = valuation.valuation_date;
              } else {
                console.log(`DEBUG - No valuations found for fund ${pf.id}`);
              }
              
              // Fetch the latest IRR for this fund
              try {
                const irrResponse = await api.get(
                  `/api/portfolio_funds/${pf.id}/irr-values`
                );
                
                console.log(`DEBUG - Latest IRR for fund ${pf.id}:`, irrResponse.data);
                
                if (irrResponse.data && irrResponse.data.length > 0) {
                  // Sort by date descending to ensure we get the most recent
                  const sortedIrrValues = [...irrResponse.data].sort(
                    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
                  );
                  pf.irr_result = sortedIrrValues[0].irr;
                }
              } catch (irrErr) {
                console.error(`Error fetching IRR for fund ${pf.id}:`, irrErr);
              }
              
              return pf;
            } catch (err) {
              console.error(`Error fetching valuation for fund ${pf.id}:`, err);
              return pf;
            }
          })
        );
        
        console.log('DEBUG - Portfolio funds with valuations:', portfolioFundsWithValuations);
        
        const processedHoldings = portfolioFundsWithValuations.map((pf: any) => {
          // Find fund details
          const fund = fundsMap.get(pf.available_funds_id);
          
          // Debug weighting value
          console.log('DEBUG - Fund weighting:', {
            fund_name: fund?.fund_name,
            weighting_raw: pf.weighting,
            weighting_type: typeof pf.weighting
          });
          
          // Standardize weighting value - convert to percentage if decimal
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
          
          // Log market value for debugging
          console.log('DEBUG - Fund market value:', {
            fund_name: fund?.fund_name,
            fund_id: pf.available_funds_id,
            market_value: pf.market_value,
            amount_invested: pf.amount_invested,
            valuation_date: pf.valuation_date
          });
          
          return {
            id: pf.id,
            fund_name: fund?.fund_name || 'Unknown Fund',
            fund_id: fund?.id,
            isin_number: fund?.isin_number || 'N/A',
            target_weighting: standardizedWeighting,
            amount_invested: pf.amount_invested || 0,
            // For market value, use the fetched valuation if available, otherwise fall back to amount_invested
            market_value: pf.market_value !== undefined ? pf.market_value : pf.amount_invested || 0,
            valuation_date: pf.valuation_date,
            irr: pf.irr_result !== undefined ? pf.irr_result : null
          };
        });
        
        console.log('ProductOverview: Processed holdings from portfolio_funds:', processedHoldings);
        setHoldings(processedHoldings);
      } else {
        // If no portfolio funds found, set empty holdings array
        console.log('ProductOverview: No portfolio funds found for this product');
        setHoldings([]);
      }
    } catch (err: any) {
      console.error('ProductOverview: Error fetching data:', err);
      setError(err.response?.data?.detail || 'Failed to fetch product details');
    } finally {
      setIsLoading(false);
    }
  };

  // Format currency with commas and 2 decimal places
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
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
    return date.toLocaleDateString('en-US', {
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
    
    // First check if we've already fetched a target risk
    if (targetRisk !== null) {
      return targetRisk.toString();
    }
    
    // If account has target_risk already set, use that
    if (account.target_risk !== undefined && account.target_risk !== null) {
      return account.target_risk.toString();
    }
    
    // If we have a template ID, fetch the template and calculate the weighted risk
    if (account.original_template_id) {
      try {
        // Get the template details directly - it often already has the funds in the response
        const templateResponse = await api.get(`/api/available_portfolios/${account.original_template_id}`);
        const templateData = templateResponse.data || {};
        
        // Check if there are funds in the template response
        if (templateData.funds && templateData.funds.length > 0) {
          let totalWeight = 0;
          let weightedRiskSum = 0;
          let validFundsCount = 0;
          
          // Calculate weighted average of risk factors
          for (const fund of templateData.funds) {
            // The risk factor may already be in the fund data via the available_funds nested object
            if (fund.available_funds && 
                fund.available_funds.risk_factor !== undefined && 
                fund.available_funds.risk_factor !== null) {
              
              const risk = fund.available_funds.risk_factor;
              const weight = fund.target_weighting || 0;
              
              weightedRiskSum += risk * weight;
              totalWeight += weight;
              validFundsCount++;
              console.log(`Fund ${fund.available_funds.fund_name}: risk=${risk}, weight=${weight}`);
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
          console.warn("No funds found in template response, trying alternative endpoint");
          
          // Alternatively, try to get the funds through the specific endpoint
          try {
            // We need to use the by-fund endpoint to avoid validation issues
            const fundsInTemplateResponse = await api.get(`/api/available_portfolios/${account.original_template_id}/funds`);
            const templateFunds = fundsInTemplateResponse.data || [];
            
            if (templateFunds.length === 0) {
              console.warn("No funds found in template");
              return "N/A";
            }
            
            let totalWeight = 0;
            let weightedRiskSum = 0;
            let validFundsCount = 0;
            
            // Calculate weighted average of risk factors
            for (const fund of templateFunds) {
              // We may need to fetch the fund details if not already included
              if (fund.fund_id) {
                const fundResponse = await api.get(`/api/funds/${fund.fund_id}`);
                const fundData = fundResponse.data;
                
                if (fundData && fundData.risk_factor !== null && fundData.risk_factor !== undefined) {
                  const weight = fund.target_weighting || 0;
                  weightedRiskSum += fundData.risk_factor * weight;
                  totalWeight += weight;
                  validFundsCount++;
                  console.log(`Fund ${fundData.fund_name}: risk=${fundData.risk_factor}, weight=${weight}`);
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
              
              console.log(`Calculated target risk: ${calculatedRisk.toFixed(1)} from ${validFundsCount} funds (alt method)`);
              return calculatedRisk.toFixed(1);
            }
          } catch (innerErr) {
            console.error("Error fetching template funds via alternative endpoint:", innerErr);
          }
        }
      } catch (err) {
        console.error("Error calculating target risk:", err);
      }
    }
    
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
    if (holdings.length === 0) return "N/A";
    
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
    
    // Now calculate weighted risk
    for (const holding of holdingsToUse) {
      const fundId = holding.fund_id;
      const value = holding.market_value;
      const fund = Array.from(fundsData.values()).find(f => f.id === fundId);
      
      if (fund && fund.risk_factor !== undefined && fund.risk_factor !== null) {
        weightedRiskSum += fund.risk_factor * value;
        fundsWithValidValuations++;
        
        console.log('DEBUG - Risk calculation for fund:', {
          fund_name: fund.fund_name,
          fund_id: fundId,
          risk_factor: fund.risk_factor,
          value: value,
          contribution: fund.risk_factor * value,
          included: true,
          valuation_date: holding.valuation_date
        });
      }
    }
    
    // If no funds have valid risk factors, return N/A
    if (fundsWithValidValuations === 0) return "N/A";
    
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
            message: 'Product deleted successfully'
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
              <h3 className="text-lg font-medium text-gray-900">Delete Product</h3>
              <div className="mt-2">
                <p className="text-sm text-gray-500">
                  Are you sure you want to delete this product? This action cannot be undone.
                </p>
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
              {isDeleting ? 'Deleting...' : 'Delete Product'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-16">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600"></div>
      </div>
    );
  }

  if (error || !account) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4 mt-8">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-red-700 text-base">
              {error || 'Failed to load product details. Please try again later.'}
            </p>
            <button
              onClick={() => navigate('/products')}
              className="mt-2 text-red-700 underline"
            >
              Return to Products
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <DeleteConfirmationModal />
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Product Overview</h2>
        
        {/* Product Details */}
        <div className="mb-8 bg-gray-50 p-4 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Product Details</h3>
              <div className="space-y-2">
                <div>
                  <span className="text-gray-600 font-medium">Product Name:</span>{" "}
                  <span className="text-gray-900">{account.product_name}</span>
                </div>
                <div>
                  <span className="text-gray-600 font-medium">Status:</span>{" "}
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    account.status === 'active' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {account.status ? account.status.charAt(0).toUpperCase() + account.status.slice(1) : "Unknown"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600 font-medium">Provider:</span>{" "}
                  <span className="text-gray-900">
                    {account.provider_name ? account.provider_name : 
                     account.provider_id ? `Provider ID: ${account.provider_id}` : 
                     "No Provider"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600 font-medium">Template:</span>{" "}
                  <span className="text-gray-900">
                    {account.original_template_id 
                      ? (account.template_info?.name || account.original_template_name || `Template #${account.original_template_id}`)
                      : "Bespoke"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600 font-medium">Start Date:</span>{" "}
                  <span className="text-gray-900">
                    {account.start_date ? formatDate(account.start_date) : "N/A"}
                  </span>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Risk Profile</h3>
              <div className="space-y-4">
                <div>
                  <span className="text-gray-600 font-medium">Target Risk:</span>{" "}
                  <span className="text-gray-900 font-semibold">
                    {displayedTargetRisk}
                  </span>
                  {displayedTargetRisk !== "N/A" && (
                    <div className="mt-1 bg-gray-200 h-2 w-full rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-600" 
                        style={{ 
                          width: `${Math.min(100, (Number(displayedTargetRisk) / 10) * 100)}%` 
                        }}
                      ></div>
                    </div>
                  )}
                </div>
                <div>
                  <span className="text-gray-600 font-medium">Current Risk:</span>{" "}
                  <span className="text-gray-900 font-semibold">
                    {calculateLiveRisk()}
                  </span>
                  {calculateLiveRisk() !== "N/A" && (
                    <div className="mt-1 bg-gray-200 h-2 w-full rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-600" 
                        style={{ 
                          width: `${Math.min(100, (Number(calculateLiveRisk()) / 10) * 100)}%` 
                        }}
                      ></div>
                    </div>
                  )}
                </div>
                {calculateLiveRisk() !== "N/A" && displayedTargetRisk !== "N/A" && 
                  Number(calculateLiveRisk()) !== Number(displayedTargetRisk) && (
                  <div className="mt-2 text-amber-600 text-sm font-medium flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Current risk differs from target risk. Consider rebalancing.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Product Owners Section */}
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Product Owners</h3>
          {productOwners.length > 0 ? (
            <div className="bg-white shadow overflow-hidden sm:rounded-lg border border-gray-200">
              <ul className="divide-y divide-gray-200">
                {productOwners.map((owner) => (
                  <li key={owner.id} className="px-4 py-3 sm:px-6">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-900">{owner.name}</span>
                      {owner.type && (
                        <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                          {owner.type}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic">No product owners assigned</p>
          )}
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
                  <th className="px-6 py-3 text-left text-sm font-semibold">Latest Valuation</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Weighting</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Risk Factor</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Last IRR</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {holdings.length > 0 ? (
                  holdings.map((holding) => (
                    <tr key={holding.id} className="hover:bg-indigo-50 transition-colors duration-150">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{holding.fund_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{holding.isin_number || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {holding.market_value !== undefined && holding.market_value !== null
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
                          : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {liveWeightings.has(holding.id)
                          ? `${liveWeightings.get(holding.id)?.toFixed(1)}%` 
                          : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{getFundRiskRating(holding.fund_id || 0, fundsData)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {holding.irr !== undefined && holding.irr !== null ? (
                          <span className={`${holding.irr >= 0 ? 'text-green-700' : 'text-red-700'} font-medium`}>
                            {formatPercentage(holding.irr)}
                            <span className="ml-1">{holding.irr >= 0 ? '▲' : '▼'}</span>
                          </span>
                        ) : (
                          <span className="text-gray-500">N/A</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                      No funds found for this product.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Danger Zone */}
        <div className="p-3 mt-2 border-t border-gray-200">
          <div className="flex justify-between items-center p-2 border border-red-200 rounded-md bg-red-50 shadow-sm">
            <div className="flex items-center">
              <div className="flex-shrink-0 h-5 w-5 rounded-md bg-red-100 flex items-center justify-center mr-2">
                <svg className="h-3 w-3 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <span className="text-sm font-medium text-red-700 my-auto">Danger Zone</span>
            </div>
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(true)}
              className="inline-flex items-center px-3 py-1.5 border border-red-300 text-xs font-medium rounded text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200 shadow-sm"
            >
              <svg className="h-3 w-3 mr-1 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Delete Product
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default ProductOverview;