import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePortfolioTemplateDetails } from '../hooks/usePortfolioTemplates';
import StandardTable, { ColumnConfig } from '../components/StandardTable';
import { Button, DeleteButton, ActionButton, AddButton } from '../components/ui';

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
  const { api } = useAuth();
  
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
  const [showDeleteGenerationConfirm, setShowDeleteGenerationConfirm] = useState(false);
  const [generationToDelete, setGenerationToDelete] = useState<Generation | null>(null);
  const [isDeletingGeneration, setIsDeletingGeneration] = useState(false);
  const [generationProductCounts, setGenerationProductCounts] = useState<Record<number, number>>({});
  const [migrationNotes, setMigrationNotes] = useState<Record<number, string>>({});
  const [expandedArchivedGenerations, setExpandedArchivedGenerations] = useState<Set<number>>(new Set<number>());

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

  // Load migration notes from localStorage
  useEffect(() => {
    if (portfolioId && portfolioId !== 'undefined') {
      try {
        const savedNotes = localStorage.getItem(`migrationNotes_${portfolioId}`);
        if (savedNotes) {
          setMigrationNotes(JSON.parse(savedNotes));
        }
      } catch (error) {
        console.warn('Failed to load migration notes from localStorage:', error);
      }
    }
  }, [portfolioId]);

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
    if (selectedGeneration && selectedGeneration.id) {
      fetchFundsForGeneration(selectedGeneration.id);
    }
  }, [selectedGeneration]);

  // When generations are loaded, check if any products are using them
  useEffect(() => {
    if (generations.length > 0) {
      checkForProductsUsingTemplate();
    }
  }, [generations]);



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
    navigate('/definitions/portfolio-templates');
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
      await api.delete(`/available_portfolios/${portfolioId}`);
      navigate('/definitions/portfolio-templates');
    } catch (err: any) {
      console.error('Error deleting portfolio template:', err);
      if (err.response?.data?.detail) {
        const detail = err.response.data.detail;
        if (Array.isArray(detail)) {
          setError(detail.map(item => typeof item === 'object' ? 
            (item.msg || JSON.stringify(item)) : String(item)).join(', '));
        } else if (typeof detail === 'object') {
          setError(JSON.stringify(detail));
        } else {
          setError(String(detail));
        }
      } else {
        setError('Failed to delete portfolio template');
      }
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };



  const handleGenerationSelect = (generation: Generation) => {
    setSelectedGeneration(generation);
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
    // Debug logging
    console.log('calculateWeightedRisk called with:', {
      template: template,
      weighted_risk: template?.weighted_risk,
      typeof_weighted_risk: typeof template?.weighted_risk
    });
    
    // Use the weighted risk from the API response if available
    if (template?.weighted_risk !== null && template?.weighted_risk !== undefined) {
      console.log('Returning weighted risk:', template.weighted_risk);
      return template.weighted_risk;
    }
    
    console.log('Weighted risk is null/undefined, returning null');
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

  // Helper functions for archived generations and migration tracking
  const getArchivedGenerations = () => {
    return generations.filter(gen => gen.status !== 'active');
  };

  const getProductsForGeneration = (generationId: number) => {
    return linkedProducts.filter(product => product.template_generation_id === generationId);
  };

  const toggleArchivedGenerationExpansion = (generationId: number) => {
    const newExpanded = new Set(expandedArchivedGenerations);
    if (newExpanded.has(generationId)) {
      newExpanded.delete(generationId);
    } else {
      newExpanded.add(generationId);
    }
    setExpandedArchivedGenerations(newExpanded);
  };

  const updateMigrationNote = (productId: number, note: string) => {
    const newNotes = {
      ...migrationNotes,
      [productId]: note
    };
    setMigrationNotes(newNotes);
    
    // Persist to localStorage
    try {
      localStorage.setItem(`migrationNotes_${portfolioId}`, JSON.stringify(newNotes));
    } catch (error) {
      console.warn('Failed to save migration notes to localStorage:', error);
    }
  };

  const getMigrationPriority = (product: LinkedProduct) => {
    // Determine migration priority based on product status and age
    if (product.status === 'inactive') return 'low';
    if (product.end_date && new Date(product.end_date) < new Date()) return 'low';
    
    // Check if product was created recently (within last 90 days)
    const startDate = new Date(product.start_date);
    const now = new Date();
    const daysDiff = (now.getTime() - startDate.getTime()) / (1000 * 3600 * 24);
    
    if (daysDiff > 365) return 'high';
    if (daysDiff > 180) return 'medium';
    return 'low';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Function to check if any products are using any generation of this template
  const checkForProductsUsingTemplate = async () => {
    if (generations.length === 0) return;
    
    setIsCheckingProducts(true);
    try {
      let totalProductsCount = 0;
      const counts: Record<number, number> = {};
      
      // Check each generation for products
      for (const generation of generations) {
        try {
          const response = await api.get('/portfolios', {
            params: {
              template_generation_id: generation.id,
              count_only: true
            }
          });
          
          const count = response.data?.count || 0;
          counts[generation.id] = count;
          totalProductsCount += count;
          
          if (count > 0) {
            console.log(`Found ${count} portfolios using generation ${generation.generation_name || generation.id}`);
          }
        } catch (err) {
          console.warn(`Failed to check products for generation ${generation.id}:`, err);
          counts[generation.id] = 0;
        }
      }
      
      setGenerationProductCounts(counts);
      setHasProductsUsingTemplate(totalProductsCount > 0);
      console.log(`Total portfolios using this template: ${totalProductsCount}`);
    } catch (err) {
      console.error('Error checking for products using template:', err);
      // On error, assume there might be products to be safe
      setHasProductsUsingTemplate(true);
    } finally {
      setIsCheckingProducts(false);
    }
  };

  const handleDeleteGenerationClick = (generation: Generation) => {
    const productCount = generationProductCounts[generation.id] || 0;
    
    if (productCount > 0) {
              setError(`Cannot delete generation "${generation.generation_name || 'Unnamed Generation'}" - ${productCount} product${productCount === 1 ? '' : 's'} are using this generation.`);
      return;
    }
    
    setGenerationToDelete(generation);
    setShowDeleteGenerationConfirm(true);
    setError(null); // Clear any existing errors
  };

  const handleCancelDeleteGeneration = () => {
    setShowDeleteGenerationConfirm(false);
    setGenerationToDelete(null);
  };

  const handleConfirmDeleteGeneration = async () => {
    if (!generationToDelete) return;
    
    try {
      setIsDeletingGeneration(true);
      setError(null);
      
      // Call the API to delete the generation
      await api.delete(`/available_portfolios/${portfolioId}/generations/${generationToDelete.id}`);
      
      // Refresh the generations list
      await refreshAllData();
      
      // If the deleted generation was selected, select the first available generation
      if (selectedGeneration?.id === generationToDelete.id) {
        const remainingGenerations = generations.filter(g => g.id !== generationToDelete.id);
        if (remainingGenerations.length > 0) {
          setSelectedGeneration(remainingGenerations[0]);
        } else {
          setSelectedGeneration(null);
        }
      }
      
      console.log('Generation deleted successfully');
      
    } catch (err: any) {
      console.error('Error deleting generation:', err);
      if (err.response?.data?.detail) {
        setError(typeof err.response.data.detail === 'string' 
          ? err.response.data.detail 
          : 'Failed to delete generation');
      } else {
        setError('Failed to delete generation');
      }
    } finally {
      setIsDeletingGeneration(false);
      setShowDeleteGenerationConfirm(false);
      setGenerationToDelete(null);
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
      <div className="container mx-auto px-4 lg:px-8 py-4">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 lg:px-8 py-4">
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
      </div>
    );
  }

  if (!template) {
    return (
      <div className="container mx-auto px-4 lg:px-8 py-4">
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
      </div>
    );
  }

  const weightedRisk = calculateWeightedRisk();

  return (
    <div className="container mx-auto px-4 lg:px-8 py-4">
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
              <DeleteButton
                onClick={handleDeleteClick}
                disabled={hasProductsUsingTemplate || isCheckingProducts}
                context="Template"
                size="md"
                loading={isCheckingProducts}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Priority Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        <div className="bg-white shadow-sm rounded-lg border border-gray-100 p-4">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Template Name</div>
          <div className="mt-1 text-lg font-semibold text-gray-900">{template?.name || 'Unnamed'}</div>
        </div>
        <div className="bg-white shadow-sm rounded-lg border border-gray-100 p-4">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Created Date</div>
          <div className="mt-1 text-lg font-semibold text-gray-900">{formatDate(template?.created_at)}</div>
        </div>
        <div className="bg-white shadow-sm rounded-lg border border-gray-100 p-4">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Generations</div>
          <div className="mt-1 text-lg font-semibold text-gray-900">{generations?.length || 0}</div>
        </div>
        <div className="bg-white shadow-sm rounded-lg border border-gray-100 p-4">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Migration Status</div>
          <div className="mt-1">
            {(() => {
              const archivedGenerations = getArchivedGenerations();
              const productsNeedingMigration = archivedGenerations.reduce((total, gen) => 
                total + getProductsForGeneration(gen.id).length, 0
              );
              
              if (archivedGenerations.length === 0) {
                return <div className="text-lg font-semibold text-green-700">All Current</div>;
              } else if (productsNeedingMigration === 0) {
                return <div className="text-lg font-semibold text-green-700">Complete</div>;
              } else {
                return (
                  <div className="flex items-center">
                    <div className="text-lg font-semibold text-orange-700">{productsNeedingMigration}</div>
                    <div className="text-xs text-gray-500 ml-1">need migration</div>
                  </div>
                );
              }
            })()}
          </div>
        </div>
      </div>

      {/* Archived Generations Migration Checklist */}
      {getArchivedGenerations().length > 0 && (
        <div className="bg-white shadow-sm rounded-lg border border-gray-100 mb-4">
          <div className="px-3 py-2 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-gray-900 flex items-center">
                  <svg className="h-3 w-3 text-orange-500 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Migration Checklist - Archived Generations
                </h2>
                <p className="text-xs text-gray-600 mt-0.5">
                  Products still using archived generations need to be migrated to the active generation for optimal fund composition
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <div className="text-xs text-gray-500">
                  {getArchivedGenerations().length} archived generation{getArchivedGenerations().length !== 1 ? 's' : ''}
                </div>
                <Button
                  onClick={() => {
                    const archivedGenerations = getArchivedGenerations();
                    const allExpanded = archivedGenerations.every(gen => expandedArchivedGenerations.has(gen.id));
                    
                    if (allExpanded) {
                      setExpandedArchivedGenerations(new Set<number>());
                    } else {
                      setExpandedArchivedGenerations(new Set(archivedGenerations.map(gen => gen.id)));
                    }
                  }}
                  variant="secondary"
                  size="sm"
                >
                  {getArchivedGenerations().every(gen => expandedArchivedGenerations.has(gen.id)) ? 'Collapse All' : 'Expand All'}
                </Button>
              </div>
            </div>
          </div>
          
          <div className="p-3 space-y-2">
            {getArchivedGenerations().map((generation) => {
              const productsUsingGeneration = getProductsForGeneration(generation.id);
              const isExpanded = expandedArchivedGenerations.has(generation.id);
              
              return (
                <div key={generation.id} className="border border-gray-200 rounded-md overflow-hidden">
                  <div 
                    className="bg-gray-50 px-2 py-1.5 cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => toggleArchivedGenerationExpansion(generation.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5">
                        <svg 
                          className={`h-3 w-3 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} 
                          fill="none" 
                          viewBox="0 0 24 24" 
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        <div>
                          <h3 className="text-xs font-medium text-gray-900 flex items-center">
                            {generation.generation_name || 'Unnamed Generation'}
                            <span className={`ml-1.5 px-1 py-0.5 text-xs rounded-full ${
                              generation.status === 'draft' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {generation.status}
                            </span>
                          </h3>
                          <p className="text-xs text-gray-500">
                            Created {formatDate(generation.created_at)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <div className="text-right">
                          <div className="text-xs font-medium text-gray-900">
                            {productsUsingGeneration.length} product{productsUsingGeneration.length !== 1 ? 's' : ''}
                          </div>
                          <div className="text-xs text-gray-500">
                            {productsUsingGeneration.length > 0 ? 'Need migration' : 'Fully migrated'}
                          </div>
                        </div>
                        <div className={`h-1.5 w-1.5 rounded-full ${
                          productsUsingGeneration.length === 0 ? 'bg-green-500' : 'bg-orange-500'
                        }`}></div>
                      </div>
                    </div>
                  </div>
                  
                  {isExpanded && productsUsingGeneration.length > 0 && (
                    <div className="border-t border-gray-200 bg-white p-2">
                      <div className="mb-1.5">
                        <h4 className="text-xs font-medium text-gray-900 mb-0.5">
                          Products requiring migration ({productsUsingGeneration.length})
                        </h4>
                        <p className="text-xs text-gray-600 mb-1.5">
                          These products are still using the archived generation and should be migrated to maintain optimal fund composition.
                        </p>
                      </div>
                      
                      <div className="space-y-1.5">
                        {productsUsingGeneration.map((product) => {
                          const priority = getMigrationPriority(product);
                          const priorityColor = getPriorityColor(priority);
                          
                          return (
                            <div key={product.id} className="border border-gray-200 rounded p-1.5 bg-gray-50">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-1.5 mb-0.5">
                                    <Link
                                      to={`/products/${product.id}`}
                                      state={{
                                        from: 'portfolio-template',
                                        portfolioId: portfolioId,
                                        portfolioName: template?.name || 'Portfolio Template',
                                        breadcrumb: [
                                          { name: 'Portfolio Templates', path: '/definitions/portfolio-templates' },
                                          { name: template?.name || 'Template', path: `/definitions/portfolio-templates/${portfolioId}` }
                                        ]
                                      }}
                                      className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
                                    >
                                      {product.product_name}
                                    </Link>
                                    <span className={`px-1 py-0.5 text-xs rounded border ${priorityColor}`}>
                                      {priority} priority
                                    </span>
                                    <span className={`px-1 py-0.5 text-xs rounded ${
                                      product.status === 'active' 
                                        ? 'bg-green-100 text-green-800' 
                                        : 'bg-red-100 text-red-800'
                                    }`}>
                                      {product.status}
                                    </span>
                                  </div>
                                  
                                  <div className="grid grid-cols-2 gap-1.5 text-xs text-gray-600 mb-1">
                                    <div>
                                      <span className="font-medium">Client:</span> {product.client_groups?.name || 'Unknown'}
                                    </div>
                                    <div>
                                      <span className="font-medium">Provider:</span> {product.available_providers?.name || 'N/A'}
                                    </div>
                                    <div>
                                      <span className="font-medium">Start Date:</span> {formatDate(product.start_date)}
                                    </div>
                                    <div>
                                      <span className="font-medium">Product Type:</span> {product.product_type || 'N/A'}
                                    </div>
                                  </div>
                                  
                                  <div className="mt-0.5">
                                    <label htmlFor={`migration-note-${product.id}`} className="block text-xs font-medium text-gray-700 mb-0.5">
                                      Migration Notes:
                                    </label>
                                    <textarea
                                      id={`migration-note-${product.id}`}
                                      rows={1}
                                      value={migrationNotes[product.id] || ''}
                                      onChange={(e) => updateMigrationNote(product.id, e.target.value)}
                                      placeholder="Add notes about migration status, timeline, or issues..."
                                      className="w-full text-xs border border-gray-300 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                  </div>
                                </div>
                                
                                <div className="ml-2 flex flex-col space-y-0.5">
                                  <Link
                                    to={`/products/${product.id}`}
                                    state={{
                                      from: 'portfolio-template',
                                      portfolioId: portfolioId,
                                      portfolioName: template?.name || 'Portfolio Template',
                                      breadcrumb: [
                                        { name: 'Portfolio Templates', path: '/definitions/portfolio-templates' },
                                        { name: template?.name || 'Template', path: `/definitions/portfolio-templates/${portfolioId}` }
                                      ]
                                    }}
                                    className="inline-flex items-center px-1.5 py-0.5 border border-transparent text-xs font-medium rounded text-blue-600 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                                  >
                                    View
                                  </Link>
                                  <button
                                    onClick={() => {
                                      // This could open a migration wizard or navigate to edit product
                                      console.log(`Initiating migration for product ${product.id}`);
                                    }}
                                    className="inline-flex items-center px-1.5 py-0.5 border border-transparent text-xs font-medium rounded text-green-600 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                                  >
                                    Migrate
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      
                      {productsUsingGeneration.length > 0 && (
                        <div className="mt-1.5 p-1.5 bg-blue-50 border border-blue-200 rounded">
                          <div className="flex items-start">
                            <svg className="h-2.5 w-2.5 text-blue-500 mt-0.5 mr-1.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div className="text-xs text-blue-800">
                              <p className="font-medium mb-0.5">Migration Recommendation:</p>
                              <p>
                                Review each product and migrate to the active generation to ensure optimal fund composition. 
                                High priority products should be migrated first, especially those with active status.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {isExpanded && productsUsingGeneration.length === 0 && (
                    <div className="border-t border-gray-200 bg-white p-2">
                      <div className="flex items-center justify-center py-1">
                        <div className="text-center">
                          <svg className="mx-auto h-4 w-4 text-green-500 mb-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <p className="text-xs font-medium text-green-800">Migration Complete</p>
                          <p className="text-xs text-green-600 mt-0.5">
                            No products are using this archived generation
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Generations Section */}
      {generations.length > 0 && (
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
                {generations.map((generation) => (
                  <button
                    key={generation.id}
                    onClick={() => handleGenerationSelect(generation)}
                    className={`${
                      selectedGeneration?.id === generation.id
                        ? 'bg-teal-600 text-white shadow-sm'
                        : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                    } rounded-lg px-4 py-2 font-medium text-sm transition-all duration-200 ease-in-out`}
                    role="tab"
                  >
                    {generation.generation_name || 'Unnamed Generation'}
                    {generation.status !== 'active' && (
                      <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                        generation.status === 'draft' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {generation.status}
                      </span>
                    )}
                  </button>
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
                      <p className="text-sm text-gray-500">
                        Are you sure you want to delete this portfolio template? This action cannot be undone.
                      </p>
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

      {/* Delete Generation Confirmation Modal */}
      {showDeleteGenerationConfirm && generationToDelete && (
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
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Delete Generation</h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Are you sure you want to delete generation "{generationToDelete.generation_name || 'Unnamed Generation'}"? This action cannot be undone.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <Button
                  type="button"
                  onClick={handleConfirmDeleteGeneration}
                  disabled={isDeletingGeneration}
                  variant="danger"
                  size="sm"
                  className="w-full sm:ml-3 sm:w-auto"
                >
                  {isDeletingGeneration ? 'Deleting...' : 'Delete'}
                </Button>
                <Button
                  type="button"
                  onClick={handleCancelDeleteGeneration}
                  disabled={isDeletingGeneration}
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
    </div>
  );
};

export default PortfolioTemplateDetails; 