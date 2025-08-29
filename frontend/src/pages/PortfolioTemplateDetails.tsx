import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePortfolioTemplateDetails } from '../hooks/usePortfolioTemplates';
import DynamicPageContainer from '../components/DynamicPageContainer';
import StandardTable, { ColumnConfig } from '../components/StandardTable';
import { Button, DeleteButton, ActionButton, AddButton, EditButton } from '../components/ui';
import { generateProductDisplayName } from '../utils/productTitleUtils';
import toast from 'react-hot-toast';

interface PortfolioTemplate {
  id: number;
  name: string;
  created_at: string;
  funds: PortfolioTemplateFund[];
  generation_id?: number;
  generation_version?: number;
  generation_name?: string;
  weighted_risk?: number | null;
}

interface PortfolioTemplateFund {
  id: number;
  portfolio_id: number;
  fund_id: number;
  target_weighting: number;
  available_funds: {
    id: number;
    fund_name: string;
    isin_number?: string;
    risk_factor?: number;
    fund_cost?: number;
    status?: string;
  };
}

interface Generation {
  id: number;
  generation_name: string;
  description?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface NewGenerationFormData {
  generation_name: string;
  description: string;
  copy_from_generation_id?: number;
}

interface LinkedProduct {
  id: number;
  product_name: string;
  product_type?: string;
  plan_number?: string;
  start_date: string;
  end_date?: string;
  status: string;
  client_id: number;
  provider_id?: number;
  portfolio_id?: number;
  template_generation_id?: number;
  link_type: 'portfolio' | 'direct';
  provider_name?: string;
  product_owners?: Array<{
    id: number;
    firstname?: string;
    surname?: string;
    known_as?: string;
  }>;
  client_groups?: {
    id: number;
    name: string;
    advisor?: string;
  };
  available_providers?: {
    id: number;
    name: string;
    theme_color?: string;
  };
  portfolios?: {
    id: number;
    portfolio_name: string;
    template_generation_id?: number;
  };
}

const PortfolioTemplateDetails: React.FC = () => {
  const { portfolioId } = useParams<{ portfolioId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { api } = useAuth();
  
  // Get generation ID from URL parameters
  const generationIdFromUrl = searchParams.get('generation');
  
  // Use optimized custom hook for data fetching
  const { 
    data: portfolioData, 
    isLoading, 
    error: dataError,
    refetch: refetchPortfolioData 
  } = usePortfolioTemplateDetails(portfolioId);
  
  // Extract data from hook result
  const template = portfolioData?.template || null;
  const generations = portfolioData?.generations || [];
  const linkedProducts = portfolioData?.linkedProducts || [];
  
  // Local state for UI interactions
  const [selectedGeneration, setSelectedGeneration] = useState<Generation | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<PortfolioTemplate>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAddGenerationModal, setShowAddGenerationModal] = useState(false);
  const [newGenerationFormData, setNewGenerationFormData] = useState<NewGenerationFormData>({
    generation_name: '',
    description: ''
  });
  const [isSubmittingGeneration, setIsSubmittingGeneration] = useState(false);
  const [productsCount] = useState(0); // Placeholder for products count
  const [hasProductsUsingTemplate, setHasProductsUsingTemplate] = useState(false);
  const [isCheckingProducts, setIsCheckingProducts] = useState(false);
  const [generationProductCounts, setGenerationProductCounts] = useState<Record<number, number>>({});
  
  // New state for optimistic updates
  const [localGenerations, setLocalGenerations] = useState<Generation[]>([]);
  const [deletingGenerationIds, setDeletingGenerationIds] = useState<Set<number>>(new Set());
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Simplified refresh function using the custom hook
  const refreshAllData = useCallback(async () => {
    if (!portfolioId || portfolioId === 'undefined') return;
    
    try {
      setError(null);
      console.log('🔄 Refreshing portfolio template data...');
      await refetchPortfolioData();
      console.log('✅ Portfolio template data refreshed successfully');
    } catch (error) {
      console.error('❌ Error refreshing portfolio template data:', error);
      setError('Failed to refresh data');
    }
  }, [portfolioId, refetchPortfolioData]);

  // Sync local state with React Query data
  useEffect(() => {
    if (generations && generations.length > 0) {
      setLocalGenerations(generations);
    }
  }, [generations]);

  // Check for refresh needed when location state indicates return from edit
  useEffect(() => {
    const locationState = location.state as any;
    if (locationState?.refreshNeeded) {
      console.log('🔄 Refresh requested via navigation state');
      refreshAllData();
      
      // Clear the state to prevent unnecessary refreshes
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, refreshAllData, navigate, location.pathname]);

  // Add window focus event listener to refresh data when returning to page
  useEffect(() => {
    const handleWindowFocus = () => {
      console.log('🔄 Window focused - checking if refresh needed');
      // Only refresh if the component is mounted and has been idle for a bit
      setTimeout(() => {
        if (portfolioId && portfolioId !== 'undefined') {
          refreshAllData();
        }
      }, 500);
    };

    window.addEventListener('focus', handleWindowFocus);
    
    return () => {
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [portfolioId, refreshAllData]);


  // Initial data load
  useEffect(() => {
    if (portfolioId && portfolioId !== 'undefined') {
      refreshAllData();
    } else {
      setError('No portfolio template ID provided');
    }
  }, [portfolioId, refreshAllData]);

  // When a generation is selected, fetch the funds for that generation
  useEffect(() => {
    if (selectedGeneration && selectedGeneration.id && !deletingGenerationIds.has(selectedGeneration.id)) {
      fetchFundsForGeneration(selectedGeneration.id);
    }
  }, [selectedGeneration, deletingGenerationIds]);

  // Function to check if any products are using any generation of this template
  const checkForProductsUsingTemplate = useCallback(async () => {
    if (generations.length === 0) {
      console.log('🔍 No generations to check for products');
      return;
    }
    
    setIsCheckingProducts(true);
    
    try {
      let totalProductsCount = 0;
      const counts: Record<number, number> = {};
      
      // Use the linkedProducts data that's already fetched instead of making API calls
      for (const generation of generations) {
        // Count products linked to this specific generation
        const productsForGeneration = linkedProducts.filter(product => 
          product.template_generation_id === generation.id
        );
        
        const count = productsForGeneration.length;
        counts[generation.id] = count;
        totalProductsCount += count;
        
      }
      
      setGenerationProductCounts(counts);
      setHasProductsUsingTemplate(totalProductsCount > 0);
    } catch (err) {
      console.error('❌ Error checking for products using template:', err);
      // On error, assume there might be products to be safe
      setHasProductsUsingTemplate(true);
    } finally {
      setIsCheckingProducts(false);
    }
  }, [generations, linkedProducts]);

  // When generations are loaded, check if any products are using them
  useEffect(() => {
    if (generations.length > 0) {
      checkForProductsUsingTemplate();
    }
  }, [generations, checkForProductsUsingTemplate]);

  // Auto-select generation from URL parameter or default to first active generation
  useEffect(() => {
    if (generations.length > 0) {
      let generationToSelect = null;
      
      // If there's a generation ID in the URL, try to find and select it
      if (generationIdFromUrl) {
        const generationFromUrl = generations.find(g => g.id === parseInt(generationIdFromUrl));
        if (generationFromUrl) {
          generationToSelect = generationFromUrl;
        } else {
        }
      }
      
      // If no generation from URL or not found, select the first active generation
      if (!generationToSelect) {
        const activeGeneration = generations.find(g => g.status === 'active');
        generationToSelect = activeGeneration || generations[0];
      }
      
      // Only set if different from current selection
      if (generationToSelect && (!selectedGeneration || selectedGeneration.id !== generationToSelect.id)) {
        setSelectedGeneration(generationToSelect);
      }
    }
  }, [generations, generationIdFromUrl, selectedGeneration]);



  const fetchFundsForGeneration = async (generationId: number) => {
    try {
      // This will update the template state with the funds for the selected generation
      console.log(`Fetching funds for generation ${generationId}`);
      const response = await api.get(`/available_portfolios/${portfolioId}`, {
        params: { generation_id: generationId }
      });
      
      console.log('Response from fetchFundsForGeneration:', response.data);
      console.log('Weighted risk in generation response:', response.data?.weighted_risk);
      
      if (response.data) {
        // Trigger a refetch to update the template data
        await refetchPortfolioData();
        console.log('Template updated with generation data');
      }
    } catch (err: any) {
      console.error('Error fetching funds for generation:', err);
    }
  };





  // Add window focus event listener to refresh data when returning to page
  useEffect(() => {
    const handleWindowFocus = () => {
      console.log('🔄 Window focused - checking if refresh needed');
      // Only refresh if the component is mounted and has been idle for a bit
      setTimeout(() => {
        if (portfolioId && portfolioId !== 'undefined') {
          refreshAllData();
        }
      }, 500);
    };

    window.addEventListener('focus', handleWindowFocus);
    
    return () => {
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [portfolioId, refreshAllData]);

  const handleBack = () => {
    // Check if we came from the generations page
    if (generationIdFromUrl) {
      // If we have a generation ID in the URL, we likely came from the generations page
      navigate('/definitions/portfolio-templates');
    } else {
      // Otherwise go back to the regular templates page
      navigate('/definitions/portfolio-templates');
    }
  };

  const handleDeleteClick = () => {
    if (hasProductsUsingTemplate) {
      // Don't show modal if products are using this template
      return;
    }
    setShowDeleteConfirm(true);
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  const handleConfirmDelete = async () => {
    try {
      setIsDeleting(true);
      
      // ULTRA-SAFE DELETION: Multiple validation layers to ensure we only delete products linked to THIS template
      
      // Step 1: Validate and filter products with extreme caution
      console.log(`🔒 SAFETY CHECK: Template ID ${portfolioId} deletion requested`);
      console.log(`🔒 RELATIONSHIP CHAIN: Template → Generations → Products`);
      console.log(`🔒 Template ${portfolioId} has ${generations.length} generations:`, generations.map(g => `${g.id}:${g.generation_name}`));
      console.log(`🔒 linkedProducts contains ${linkedProducts.length} products from API endpoint /available_portfolios/${portfolioId}/linked-products`);
      
      // Create a set of generation IDs that belong to THIS template for ultra-fast lookup
      const thisTemplateGenerationIds = new Set(generations.map(gen => gen.id));
      console.log(`🔒 Generation IDs belonging to template ${portfolioId}:`, Array.from(thisTemplateGenerationIds));
      
      // First filter: Only products that have template_generation_id matching THIS template's generations
      const templateLinkedProducts = linkedProducts.filter(product => {
        const hasTemplateGenerationId = product.template_generation_id !== null && product.template_generation_id !== undefined;
        const belongsToThisTemplate = hasTemplateGenerationId && thisTemplateGenerationIds.has(product.template_generation_id);
        
        if (hasTemplateGenerationId && belongsToThisTemplate) {
          const generation = generations.find(g => g.id === product.template_generation_id);
          console.log(`✅ Product ${product.id} (${product.product_name}) → Generation ${product.template_generation_id} (${generation?.generation_name}) → Template ${portfolioId}`);
        } else if (hasTemplateGenerationId && !belongsToThisTemplate) {
          console.log(`❌ Product ${product.id} (${product.product_name}) belongs to generation ${product.template_generation_id} which is NOT part of template ${portfolioId}`);
        } else {
          console.log(`⚠️ Product ${product.id} (${product.product_name}) has no template_generation_id - skipping`);
        }
        
        return belongsToThisTemplate;
      });
      
      // Second validation: Double-check each product's relationship chain
      const productsToDelete: any[] = [];
      console.log(`🔒 SECOND VALIDATION: Double-checking each product's Template → Generation → Product relationship...`);
      
      for (const product of templateLinkedProducts) {
        // Verify the complete relationship chain: Template ${portfolioId} → Generation → Product
        const matchingGeneration = generations.find(gen => gen.id === product.template_generation_id);
        
        if (matchingGeneration) {
          console.log(`🔒 VALIDATED CHAIN: Template ${portfolioId} → Generation ${matchingGeneration.id} (${matchingGeneration.generation_name}) → Product ${product.id} (${product.product_name})`);
          productsToDelete.push({
            ...product,
            _validation: {
              templateId: portfolioId,
              generationId: matchingGeneration.id,
              generationName: matchingGeneration.generation_name,
              validationTimestamp: new Date().toISOString()
            }
          });
        } else {
          console.error(`❌ CRITICAL SAFETY VIOLATION: Product ${product.id} has template_generation_id ${product.template_generation_id} but this doesn't match any generation of template ${portfolioId}`);
          console.error(`❌ Available generations for template ${portfolioId}:`, generations.map(g => `${g.id}:${g.generation_name}`));
        }
      }
      
      // Third validation: Confirm we're not about to delete ALL products in the system
      if (productsToDelete.length > 10) {
        const proceed = window.confirm(`⚠️ SAFETY WARNING: You're about to delete ${productsToDelete.length} products. This seems like a lot. Are you absolutely sure this template has ${productsToDelete.length} linked products?`);
        if (!proceed) {
          setIsDeleting(false);
          return;
        }
      }
      
      console.log(`🗑️ FINAL COUNT: Deleting ${productsToDelete.length} client_products that are definitively linked to template ${portfolioId}`);
      
      // Step 1: Delete validated client_products with full relationship chain logging
      for (const product of productsToDelete) {
        try {
          const validation = product._validation;
          console.log(`🗑️ DELETING VALIDATED PRODUCT: Template ${validation.templateId} → Generation ${validation.generationId} (${validation.generationName}) → Product ${product.id} (${product.product_name})`);
          console.log(`🗑️ Validation timestamp: ${validation.validationTimestamp}`);
          
          await api.delete(`/client_products/${product.id}`);
          
          console.log(`✅ Successfully deleted client_product ${product.id} that belonged to template ${validation.templateId} via generation ${validation.generationName}`);
        } catch (productDeleteErr: any) {
          const validation = product._validation;
          console.error(`❌ Failed to delete client_product ${product.id} (Template ${validation.templateId} → Generation ${validation.generationName}):`, productDeleteErr.response?.data?.detail || productDeleteErr.message);
          // Continue with other products even if one fails, but log the error with full context
        }
      }
      
      // Step 2: Delete all portfolios and their client_product references
      for (const generation of generations) {
        try {
          // Get portfolios for this generation
          const portfoliosResponse = await api.get('/portfolios', {
            params: {
              template_generation_id: generation.id
            }
          });
          
          const portfolios = portfoliosResponse.data?.portfolios || portfoliosResponse.data || [];
          
          // For each portfolio, first delete any client_products that reference it
          for (const portfolio of portfolios) {
            try {
              
              // Get client_products that reference this portfolio
              try {
                // Try multiple approaches to find client_products that reference this portfolio
                let clientProducts: any[] = [];
                
                // Approach 1: Try with portfolio_id parameter
                try {
                  const clientProductsResponse = await api.get('/client_products', {
                    params: { portfolio_id: portfolio.id }
                  });
                  clientProducts = clientProductsResponse.data?.client_products || clientProductsResponse.data || [];
                } catch (err) {
                }
                
                // Approach 2: Get all client_products and filter by portfolio_id
                if (clientProducts.length === 0) {
                  try {
                    const allClientProductsResponse = await api.get('/client_products');
                    const allClientProducts = allClientProductsResponse.data?.client_products || allClientProductsResponse.data || [];
                    clientProducts = allClientProducts.filter((cp: any) => cp.portfolio_id === portfolio.id);
                  } catch (err) {
                  }
                }
                
                // Approach 3: Try to force delete using portfolio endpoint 
                if (clientProducts.length === 0) {
                  try {
                    await api.delete(`/portfolios/${portfolio.id}/client_products`);
                  } catch (err) {
                  }
                }
                
                // Delete found client_products individually
                for (const clientProduct of clientProducts) {
                  try {
                    await api.delete(`/client_products/${clientProduct.id}`);
                  } catch (clientProductErr: any) {
                    console.warn(`⚠️ Failed to delete client_product ${clientProduct.id}:`, clientProductErr.response?.data?.detail || clientProductErr.message);
                    // Try alternative deletion method
                    try {
                      await api.post(`/client_products/${clientProduct.id}/force_delete`);
                    } catch (forceErr) {
                      console.warn(`⚠️ Force delete also failed for client_product ${clientProduct.id}`);
                    }
                  }
                }
              } catch (clientProductsErr: any) {
                console.warn(`⚠️ Failed to get client_products for portfolio ${portfolio.id}:`, clientProductsErr.response?.data?.detail || clientProductsErr.message);
              }
              
              try {
                await api.delete(`/portfolios/${portfolio.id}`);
              } catch (portfolioDeleteErr: any) {
                console.warn(`⚠️ Initial portfolio delete failed for ${portfolio.id}:`, portfolioDeleteErr.response?.data?.detail || portfolioDeleteErr.message);
                
                // Try force delete if normal delete fails
                try {
                  await api.delete(`/portfolios/${portfolio.id}?force=true`);
                } catch (forceDeleteErr: any) {
                  console.warn(`⚠️ Force delete also failed for portfolio ${portfolio.id}:`, forceDeleteErr.response?.data?.detail || forceDeleteErr.message);
                  
                  // Final attempt: try cascade delete
                  try {
                    await api.delete(`/portfolios/${portfolio.id}?cascade=true`);
                  } catch (cascadeErr) {
                    console.error(`❌ All deletion methods failed for portfolio ${portfolio.id}`);
                    throw cascadeErr; // Re-throw to be caught by outer try-catch
                  }
                }
              }
            } catch (portfolioDeleteErr: any) {
              console.warn(`⚠️ Failed to delete portfolio ${portfolio.id}:`, portfolioDeleteErr.response?.data?.detail || portfolioDeleteErr.message);
              // Continue with other portfolios even if one fails
            }
          }
        } catch (err) {
          console.warn(`Failed to get portfolios for generation ${generation.id}:`, err);
        }
      }
      
      // Step 3: Delete all generations of the template
      for (const generation of generations) {
        try {
          try {
            await api.delete(`/available_portfolios/${portfolioId}/generations/${generation.id}`);
          } catch (generationDeleteErr: any) {
            console.warn(`⚠️ Initial generation delete failed for ${generation.id}:`, generationDeleteErr.response?.data?.detail || generationDeleteErr.message);
            
            // Try force delete if normal delete fails
            try {
              await api.delete(`/available_portfolios/${portfolioId}/generations/${generation.id}?force=true`);
            } catch (forceDeleteErr: any) {
              console.warn(`⚠️ Force delete also failed for generation ${generation.id}:`, forceDeleteErr.response?.data?.detail || forceDeleteErr.message);
              
              // Final attempt: try cascade delete
              try {
                await api.delete(`/available_portfolios/${portfolioId}/generations/${generation.id}?cascade=true`);
              } catch (cascadeErr) {
                console.error(`❌ All deletion methods failed for generation ${generation.id}`);
                throw cascadeErr; // Re-throw to be caught by outer try-catch
              }
            }
          }
        } catch (generationDeleteErr: any) {
          console.warn(`⚠️ Failed to delete generation ${generation.id}:`, generationDeleteErr.response?.data?.detail || generationDeleteErr.message);
          // Continue with other generations even if one fails
        }
      }
      
      // Step 4: Finally, delete the template itself
      try {
        await api.delete(`/available_portfolios/${portfolioId}`);
      } catch (templateDeleteErr: any) {
        console.warn(`⚠️ Initial template delete failed:`, templateDeleteErr.response?.data?.detail || templateDeleteErr.message);
        
        // Try force delete if normal delete fails
        try {
          await api.delete(`/available_portfolios/${portfolioId}?force=true`);
        } catch (forceDeleteErr: any) {
          console.warn(`⚠️ Force delete also failed for template:`, forceDeleteErr.response?.data?.detail || forceDeleteErr.message);
          
          // Final attempt: try cascade delete
          try {
            await api.delete(`/available_portfolios/${portfolioId}?cascade=true`);
          } catch (cascadeErr) {
            console.error(`❌ All deletion methods failed for template ${portfolioId}`);
            throw cascadeErr;
          }
        }
      }
      
      navigate('/definitions/portfolio-templates');
    } catch (err: any) {
      console.error('❌ Error during cascade deletion:', err);
      if (err.response?.data?.detail) {
        const detail = err.response.data.detail;
        if (typeof detail === 'string' && detail.includes('foreign key constraint')) {
          setError('Cannot delete template: There are still references in the database that could not be automatically removed. Please contact support.');
        } else if (Array.isArray(detail)) {
          setError(detail.map(item => typeof item === 'object' ? 
            (item.msg || JSON.stringify(item)) : String(item)).join(', '));
        } else if (typeof detail === 'object') {
          setError(JSON.stringify(detail));
        } else {
          setError(String(detail));
        }
      } else {
        setError('Failed to delete portfolio template and associated data');
      }
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveChanges = async () => {
    // Check if any changes were made
    const hasChanges = Object.keys(formData).some(key => {
      const currentValue = formData[key as keyof PortfolioTemplate];
      const originalValue = template?.[key as keyof PortfolioTemplate];
      return currentValue !== originalValue;
    });

    if (!hasChanges) {
      setIsEditing(false);
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      
      const response = await api.put(`/available_portfolios/${portfolioId}`, formData);
      
      if (response.data) {
        // Refresh the data to get the updated template
        await refetchPortfolioData();
        setIsEditing(false);
        console.log('Portfolio template updated successfully');
      }
    } catch (err: any) {
      console.error('Error updating portfolio template:', err);
      if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError('Failed to update portfolio template');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData(template || {});
    setIsEditing(false);
    setError(null);
  };

  // Initialize form data when template changes
  useEffect(() => {
    if (template) {
      setFormData(template);
    }
  }, [template]);

  const handleGenerationSelect = (generation: Generation) => {
    setSelectedGeneration(generation);
    
    // Update URL parameters to reflect the selected generation
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('generation', generation.id.toString());
    const newUrl = `${location.pathname}?${newSearchParams.toString()}`;
    navigate(newUrl, { replace: true });
  };

  const handleActivateGeneration = async (generationId: number) => {
    if (!generationId) return;
    
    try {
      setError(null);
      
      // Call the API to activate the generation
      await api.patch(`/available_portfolios/${portfolioId}/generations/${generationId}`, {
        status: 'active'
      });
      
      // Refresh the generations list
      await refreshAllData();
      
      // Show success message (could be implemented with a toast notification)
      console.log('Generation activated successfully');
      
    } catch (err: any) {
      console.error('Error activating generation:', err);
      if (err.response?.data?.detail) {
        setError(typeof err.response.data.detail === 'string' 
          ? err.response.data.detail 
          : 'Failed to activate generation');
      } else {
        setError('Failed to activate generation');
      }
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const calculateWeightedRisk = () => {
    // Use the weighted risk from the API response if available
    if (template?.weighted_risk !== null && template?.weighted_risk !== undefined) {
      return template.weighted_risk;
    }
    
    // Return null to show N/A if no weighted risk is available
    return null;
  };

  // Function to get color based on risk value (1-7 scale) - green to red gradient
  const getRiskColor = (riskValue: number): { textClass: string; bgClass: string } => {
    if (riskValue <= 0) return { textClass: 'text-gray-500', bgClass: 'bg-gray-300' }; // N/A case
    
    // Clamp the value between 1 and 7
    const clampedRisk = Math.max(1, Math.min(7, riskValue));
    
    // Calculate color intensity based on position between 1 and 7
    // 1 = green, 7 = red, smooth gradient in between
    const normalizedRisk = (clampedRisk - 1) / 6; // 0 to 1 scale
    
    if (normalizedRisk <= 0.16) {
      // Risk 1.0-2.0: Green
      return { textClass: 'text-green-600', bgClass: 'bg-green-500' };
    } else if (normalizedRisk <= 0.33) {
      // Risk 2.0-3.0: Yellow-green
      return { textClass: 'text-lime-600', bgClass: 'bg-lime-500' };
    } else if (normalizedRisk <= 0.5) {
      // Risk 3.0-4.0: Yellow
      return { textClass: 'text-yellow-600', bgClass: 'bg-yellow-500' };
    } else if (normalizedRisk <= 0.66) {
      // Risk 4.0-5.0: Orange
      return { textClass: 'text-orange-600', bgClass: 'bg-orange-500' };
    } else if (normalizedRisk <= 0.83) {
      // Risk 5.0-6.0: Red-orange
      return { textClass: 'text-red-500', bgClass: 'bg-red-400' };
    } else {
      // Risk 6.0-7.0: Red
      return { textClass: 'text-red-600', bgClass: 'bg-red-500' };
    }
  };


  const handleDeleteGenerationClick = async (generation: Generation) => {
    // Check if generation has linked products
    const productCount = generationProductCounts[generation.id] || 0;
    if (productCount > 0) {
      setError(`Cannot delete generation "${generation.generation_name || 'Unnamed Generation'}" - ${productCount} product${productCount === 1 ? '' : 's'} are using this generation.`);
      return;
    }
    
    // Show confirmation toast
    toast((t) => (
      <div className="flex items-center space-x-3 p-2">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900">
            Delete "{generation.generation_name}"?
          </p>
          <p className="text-xs text-gray-500">This action cannot be undone</p>
        </div>
        <button
          className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded text-sm font-medium transition-colors"
          onClick={() => {
            toast.dismiss(t.id);
            handleOptimisticDelete(generation);
          }}
        >
          Delete
        </button>
        <button
          className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-1.5 rounded text-sm font-medium transition-colors"
          onClick={() => toast.dismiss(t.id)}
        >
          Cancel
        </button>
      </div>
    ), { 
      duration: 6000,
      position: 'top-center',
      style: {
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
      }
    });
  };

  // Add optimistic delete function
  const handleOptimisticDelete = async (generation: Generation) => {
    // Store original state for rollback
    const originalGenerations = [...localGenerations];
    const originalSelected = selectedGeneration;
    
    try {
      // 1. IMMEDIATE UI UPDATE - Add to deleting set for visual feedback
      setDeletingGenerationIds(prev => new Set([...prev, generation.id]));
      
      // 2. Remove from local state optimistically
      const updatedGenerations = localGenerations.filter(g => g.id !== generation.id);
      setLocalGenerations(updatedGenerations);
      
      // 3. Handle selection update if deleted generation was selected
      if (selectedGeneration?.id === generation.id) {
        // Find the first active generation that isn't being deleted
        const newSelection = updatedGenerations.find(g => 
          g.status === 'active' && !deletingGenerationIds.has(g.id)
        ) || updatedGenerations[0] || null;
        setSelectedGeneration(newSelection);
      }
      
      // 4. Show success toast with undo option
      const undoToastId = toast.success(
        (t) => (
          <div className="flex items-center space-x-3">
            <span className="text-sm">Generation "{generation.generation_name}" deleted</span>
            <button
              className="underline text-blue-600 hover:text-blue-800 text-sm font-medium"
              onClick={() => {
                // Rollback changes
                setLocalGenerations(originalGenerations);
                setSelectedGeneration(originalSelected);
                setDeletingGenerationIds(prev => {
                  const newSet = new Set(prev);
                  newSet.delete(generation.id);
                  return newSet;
                });
                toast.dismiss(t.id);
                toast('Deletion cancelled', { duration: 2000, icon: 'ℹ️' });
              }}
            >
              Undo
            </button>
          </div>
        ),
        { duration: 5000 }
      );

      // 5. Background API call
      await api.delete(`/available_portfolios/${portfolioId}/generations/${generation.id}`);
      
      // 6. Success - remove from deleting set and sync with server
      setDeletingGenerationIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(generation.id);
        return newSet;
      });
      
      // 7. Optional: Soft refresh to ensure data consistency (non-blocking)
      setTimeout(() => {
        refetchPortfolioData();
      }, 1000);
      
      console.log('✅ Generation deleted successfully');
      
    } catch (err: any) {
      // ROLLBACK on API failure
      console.error('❌ Failed to delete generation:', err);
      
      // Restore original state
      setLocalGenerations(originalGenerations);
      setSelectedGeneration(originalSelected);
      setDeletingGenerationIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(generation.id);
        return newSet;
      });
      
      // Clear any error state
      setError(null);
      
      // Show error toast
      toast.error(
        `Failed to delete "${generation.generation_name}". Please try again.`,
        { duration: 4000 }
      );
      
      setError('Failed to delete generation. Please try again.');
    }
  };



  // Column configuration for StandardTable
  const fundsColumns: ColumnConfig[] = [
    {
      key: 'fund_name',
      label: 'Fund Name',
      dataType: 'text',
      alignment: 'left',
      control: 'sort'
    },
    {
      key: 'isin_number',
      label: 'ISIN',
      dataType: 'text',
      alignment: 'left',
      control: 'sort'
    },
    {
      key: 'target_weighting',
      label: 'Target %',
      dataType: 'percentage',
      alignment: 'left',
      control: 'sort'
    },
    {
      key: 'risk_factor',
      label: 'Risk',
      dataType: 'number',
      alignment: 'left',
      control: 'sort'
    }
  ];

  // Transform funds data for StandardTable
  const transformedFundsData = template?.funds ? template.funds.map(fund => ({
    id: fund.id,
    fund_name: fund.available_funds?.fund_name || `Fund ID: ${fund.fund_id}`,
    isin_number: fund.available_funds?.isin_number || 'N/A',
    target_weighting: fund.target_weighting / 100, // Convert to decimal for percentage formatting
    risk_factor: fund.available_funds?.risk_factor || 0
  })) : [];

  if (isLoading) {
    return (
      <DynamicPageContainer maxWidth="2800px" className="py-4">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600"></div>
        </div>
      </DynamicPageContainer>
    );
  }

  if (error) {
    return (
      <DynamicPageContainer maxWidth="2800px" className="py-4">
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-red-700 text-base">
                {typeof error === 'string' ? error : 'An error occurred while fetching portfolio template details'}
              </p>
            </div>
          </div>
        </div>
        <Button
          onClick={handleBack}
          variant="secondary"
          size="md"
        >
          Back to Portfolios
        </Button>
      </DynamicPageContainer>
    );
  }

  if (!template) {
    return (
      <DynamicPageContainer maxWidth="2800px" className="py-4">
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-yellow-700 text-base">Portfolio template not found</p>
            </div>
          </div>
        </div>
        <Button
          onClick={handleBack}
          variant="secondary"
          size="md"
        >
          Back to Portfolios
        </Button>
      </DynamicPageContainer>
    );
  }

  const weightedRisk = calculateWeightedRisk();

  return (
    <DynamicPageContainer maxWidth="2800px" className="py-4">
      {/* Clean page layout without color strip */}
      
      {/* Breadcrumbs */}
      <nav className="mb-4 flex" aria-label="Breadcrumb">
        <ol className="inline-flex items-center space-x-1 md:space-x-3">
          <li className="inline-flex items-center">
            <button
              onClick={handleBack}
              className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"></path>
              </svg>
              Portfolios
            </button>
          </li>
          <li aria-current="page">
            <div className="flex items-center">
              <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"></path>
              </svg>
              <span className="ml-1 text-sm font-medium text-gray-700 md:ml-2">{template ? template.name : 'Portfolio Template Details'}</span>
            </div>
          </li>
        </ol>
      </nav>

      {/* Header Card */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 mb-4">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Portfolio Icon */}
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              
              <div>
                <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold text-gray-900">
                  {template?.name || 'Unnamed Template'}
                </h1>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <div className="flex items-center gap-2">
                {!isEditing ? (
                  <>
                    <EditButton
                      context="Template"
                      design="balanced"
                      onClick={() => setIsEditing(true)}
                    />
                    <DeleteButton
                      onClick={() => {
                        // Delete button clicked
                        handleDeleteClick();
                      }}
                      disabled={hasProductsUsingTemplate || isCheckingProducts}
                      context="Template"
                      size="md"
                      loading={isCheckingProducts}
                    />
                  </>
                ) : (
                  <>
                    <ActionButton
                      variant="cancel"
                      onClick={handleCancel}
                    />
                    <ActionButton
                      variant="save"
                      loading={isSaving}
                      onClick={handleSaveChanges}
                    />
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Priority Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        {/* Template Name Card */}
        <div className={`bg-white shadow-sm rounded-lg border p-4 ${isEditing ? 'border-indigo-300 ring-1 ring-indigo-300' : 'border-gray-100'}`}>
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Template Name</div>
          <div className="mt-1">
            {isEditing ? (
              <input
                type="text"
                name="name"
                value={formData.name || ''}
                onChange={handleChange}
                className="block w-full text-lg font-semibold border-0 p-0 focus:ring-0 focus:border-0 bg-transparent"
                placeholder="Enter template name"
              />
            ) : (
              <div className="text-lg font-semibold text-gray-900">{template?.name || 'Unnamed'}</div>
            )}
          </div>
        </div>

        {/* Created Date Card */}
        <div className={`bg-white shadow-sm rounded-lg border p-4 ${isEditing ? 'border-indigo-300 ring-1 ring-indigo-300' : 'border-gray-100'}`}>
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Created Date</div>
          <div className="mt-1">
            {isEditing ? (
              <input
                type="date"
                name="created_at"
                value={formData.created_at ? new Date(formData.created_at).toISOString().split('T')[0] : ''}
                onChange={handleChange}
                className="block w-full text-lg font-semibold border-0 p-0 focus:ring-0 focus:border-0 bg-transparent"
              />
            ) : (
              <div className="text-lg font-semibold text-gray-900">{formatDate(template?.created_at)}</div>
            )}
          </div>
        </div>

        {/* Generations Card (Read-only) */}
        <div className="bg-white shadow-sm rounded-lg border border-gray-100 p-4">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Generations</div>
          <div className="mt-1 text-lg font-semibold text-gray-900">{generations?.length || 0}</div>
        </div>

        {/* Linked Products Card (Read-only) */}
        <div className="bg-white shadow-sm rounded-lg border border-gray-100 p-4">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Linked Products</div>
          <div className="mt-1 text-lg font-semibold text-gray-900">{linkedProducts?.length || 0}</div>
        </div>
      </div>

      {/* Save/Cancel buttons when editing */}
      {isEditing && (
        <div className="mb-4 space-y-3">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
          <div className="flex justify-end space-x-3">
            <ActionButton
              variant="cancel"
              onClick={handleCancel}
            />
            <ActionButton
              variant="save"
              loading={isSaving}
              onClick={handleSaveChanges}
            />
          </div>
        </div>
      )}


      {/* Generations Section */}
              {localGenerations.length > 0 && (
        <div className="bg-white shadow-sm rounded-lg border border-gray-100 mb-4">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Portfolio Generations</h2>
              <AddButton 
                onClick={() => navigate(`/add-generation/${portfolioId}`)}
                size="md"
                context="Generation"
              />
            </div>
          </div>
          
          <div className="p-6">
            <div className="mb-4">
              <nav className="flex space-x-2 px-2 py-2 bg-gray-50 rounded-lg" role="tablist">
                {localGenerations.map((generation) => (
                  <div
                    key={generation.id}
                    className={`relative transition-all duration-300 ${
                      deletingGenerationIds.has(generation.id) 
                        ? 'opacity-50 scale-95' 
                        : 'opacity-100 scale-100'
                    }`}
                  >
                    <button
                      onClick={() => handleGenerationSelect(generation)}
                      disabled={deletingGenerationIds.has(generation.id)}
                      className={`${
                        selectedGeneration?.id === generation.id
                          ? 'bg-teal-600 text-white shadow-sm'
                          : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                      } ${
                        deletingGenerationIds.has(generation.id)
                          ? 'cursor-not-allowed bg-red-50 text-red-700'
                          : ''
                      } rounded-lg px-4 py-2 font-medium text-sm transition-all duration-200 ease-in-out relative`}
                      role="tab"
                    >
                      {generation.generation_name || 'Unnamed Generation'}
                      {generation.status !== 'active' && !deletingGenerationIds.has(generation.id) && (
                        <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                          generation.status === 'draft' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {generation.status}
                        </span>
                      )}
                      {deletingGenerationIds.has(generation.id) && (
                        <div className="absolute inset-0 flex items-center justify-center bg-red-100 bg-opacity-75 rounded-lg">
                          <div className="flex items-center space-x-1 text-red-700">
                            <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            <span className="text-xs font-medium">Deleting...</span>
                          </div>
                        </div>
                      )}
                    </button>
                  </div>
                ))}
              </nav>
            </div>
            
            {selectedGeneration && (
              <div className="mt-3">
                <div className="bg-gray-50 rounded-md border border-gray-200 p-4 mb-3">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-3">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 flex items-center">
                        {selectedGeneration.generation_name || 'Unnamed Generation'}
                        <span className={`ml-3 px-2 py-0.5 text-xs rounded-full ${
                          selectedGeneration.status === 'active' ? 'bg-green-100 text-green-800' :
                          selectedGeneration.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {selectedGeneration.status.charAt(0).toUpperCase() + selectedGeneration.status.slice(1)}
                        </span>
                      </h3>
                      {selectedGeneration.description && (
                        <p className="text-sm text-gray-600 mt-1">{selectedGeneration.description}</p>
                      )}
                    </div>
                    
                    <div className="mt-2 md:mt-0 flex space-x-2">
                      <Link
                        to={`/edit-generation/${portfolioId}/${selectedGeneration.id}`}
                        className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                      >
                        <svg className="h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        Edit
                      </Link>
                      
                      {selectedGeneration.status === 'draft' && (
                        <Button
                          onClick={() => handleActivateGeneration(selectedGeneration.id)}
                          variant="primary"
                          size="sm"
                        >
                          Activate
                        </Button>
                      )}
                      
                      <DeleteButton
                        onClick={() => handleDeleteGenerationClick(selectedGeneration)}
                        disabled={isCheckingProducts || (generationProductCounts[selectedGeneration.id] || 0) > 0}
                        context="Generation"
                        size="sm"
                        loading={isCheckingProducts}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-3 rounded-md shadow-sm">
                      <p className="text-xs font-semibold text-gray-500 uppercase">Created</p>
                      <p className="text-sm text-gray-800 mt-1">{formatDate(selectedGeneration.created_at)}</p>
                    </div>
                    <div className="bg-white p-3 rounded-md shadow-sm">
                      <p className="text-xs font-semibold text-gray-500 uppercase">Risk Level</p>
                      <div className="flex items-center mt-1">
                        <span className={`text-sm font-medium mr-2 transition-colors duration-200 ${
                          weightedRisk !== null ? getRiskColor(weightedRisk).textClass : 'text-gray-500'
                        }`}>
                          {weightedRisk !== null ? `${weightedRisk}/7` : 'N/A'}
                        </span>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div 
                            className={`h-2.5 rounded-full transition-colors duration-200 ${
                              weightedRisk !== null ? getRiskColor(weightedRisk).bgClass : 'bg-gray-300'
                            }`}
                            style={{ width: `${weightedRisk !== null ? (weightedRisk / 7) * 100 : 0}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Funds Table */}
                <div className="mt-3">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Funds</h3>
                  {transformedFundsData.length > 0 ? (
                    <StandardTable
                      data={transformedFundsData}
                      columns={fundsColumns}
                      className="cursor-pointer"
                    />
                  ) : (
                    <div className="text-gray-500 text-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                      No funds in this template generation
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Linked Products by Generation */}
      {localGenerations.length > 0 && (
        <div className="bg-white shadow-sm rounded-lg border border-gray-100 mb-4">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Linked Products by Generation</h2>
            <p className="text-sm text-gray-600 mt-1">
              Products that are using each generation of this template
            </p>
          </div>
          
          <div className="p-6 space-y-4">
            {localGenerations.map((generation) => {
              const linkedProductsForGeneration = linkedProducts.filter(product => 
                product.template_generation_id === generation.id
              );
              
              return (
                <div key={generation.id} className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-sm font-medium text-gray-900">
                          {generation.generation_name || 'Unnamed Generation'}
                        </h3>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          generation.status === 'active' ? 'bg-green-100 text-green-800' :
                          generation.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {generation.status.charAt(0).toUpperCase() + generation.status.slice(1)}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        {linkedProductsForGeneration.length} product{linkedProductsForGeneration.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4">
                    {linkedProductsForGeneration.length > 0 ? (
                      <div className="space-y-3">
                        {linkedProductsForGeneration.map((product) => (
                          <div key={product.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-md bg-gray-50">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <Link
                                  to={`/products/${product.id}`}
                                  className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                                >
                                  {generateProductDisplayName(product)}
                                </Link>
                                <span className={`px-2 py-0.5 text-xs rounded ${
                                  product.status === 'active' 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {product.status}
                                </span>
                              </div>
                            </div>
                            <div className="ml-4">
                              <Link
                                to={`/products/${product.id}`}
                                className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                              >
                                View Product
                              </Link>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 text-gray-500">
                        <svg className="mx-auto h-8 w-8 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="text-sm font-medium">No products linked</p>
                        <p className="text-xs text-gray-400 mt-1">
                          No products are currently using this generation
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                    <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Delete Portfolio Template</h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500 mb-3">
                        Are you sure you want to delete this portfolio template? This action cannot be undone.
                      </p>
                      
                      {/* Show exactly which products will be deleted */}
                      <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-3">
                        <p className="text-sm text-red-800 font-medium">🚨 PRODUCTS TO BE DELETED:</p>
                        {(() => {
                          const productsToDelete = linkedProducts.filter(product => 
                            generations.some(gen => gen.id === product.template_generation_id)
                          );
                          
                          if (productsToDelete.length === 0) {
                            return <p className="text-xs text-red-700 mt-1">✅ No products will be deleted - safe to proceed</p>;
                          }
                          
                          return (
                            <div className="mt-2 max-h-32 overflow-y-auto">
                              {productsToDelete.map((product, index) => {
                                const generation = generations.find(g => g.id === product.template_generation_id);
                                return (
                                  <div key={product.id} className="text-xs text-red-700 py-1 px-2 bg-red-100 rounded mb-1">
                                    <strong>{index + 1}. {product.product_name}</strong>
                                    {product.product_type && <span className="text-red-600"> ({product.product_type})</span>}
                                    <br />
                                    <span className="text-red-500">Generation: {generation?.generation_name || `ID: ${product.template_generation_id}`}</span>
                                  </div>
                                );
                              })}
                              {productsToDelete.length > 5 && (
                                <p className="text-xs text-red-800 font-medium mt-2">
                                  ⚠️ {productsToDelete.length} products will be permanently deleted!
                                </p>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                      
                      <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                        <p className="text-sm text-yellow-800 font-medium">⚠️ This will also cascade delete:</p>
                        <ul className="text-xs text-yellow-700 mt-1 ml-4">
                          <li>• All portfolios associated with this template</li>
                          <li>• All {generations.length} generation(s): {generations.map(g => g.generation_name || `Gen ${g.id}`).join(', ')}</li>
                          <li>• The template itself: "{template?.name}"</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <Button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  variant="danger"
                  size="sm"
                  className="w-full sm:ml-3 sm:w-auto"
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </Button>
                <Button
                  type="button"
                  onClick={handleCancelDelete}
                  disabled={isDeleting}
                  variant="secondary"
                  size="sm"
                  className="mt-3 w-full sm:mt-0 sm:ml-3 sm:w-auto"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}


    </DynamicPageContainer>
  );
};

export default PortfolioTemplateDetails; 