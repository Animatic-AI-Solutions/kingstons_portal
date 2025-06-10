import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

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
  version_number: number;
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

const PortfolioTemplateDetails: React.FC = () => {
  const { portfolioId } = useParams<{ portfolioId: string }>();
  const navigate = useNavigate();
  const { api } = useAuth();
  const [template, setTemplate] = useState<PortfolioTemplate | null>(null);
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [selectedGeneration, setSelectedGeneration] = useState<Generation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
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

  useEffect(() => {
    if (portfolioId && portfolioId !== 'undefined') {
      fetchPortfolioTemplate();
      fetchGenerations();
    } else {
      setError('No portfolio template ID provided');
      setIsLoading(false);
    }
  }, [portfolioId]);

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

  const fetchPortfolioTemplate = async () => {
    try {
      setIsLoading(true);
      console.log(`Fetching portfolio template with ID: ${portfolioId}`);
      const response = await api.get(`/available_portfolios/${portfolioId}`);
      console.log('Portfolio template data received:', response.data);
      
      setTemplate(response.data);
    } catch (err: any) {
      console.error('Error fetching portfolio template:', err);
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
        setError('Failed to fetch portfolio template');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fetchGenerations = async () => {
    try {
      const response = await api.get(`/available_portfolios/${portfolioId}/generations`);
      console.log('Generations data received:', response.data);
      
      if (response.data && response.data.length > 0) {
        setGenerations(response.data);
        // Select the first generation by default
        setSelectedGeneration(response.data[0]);
      }
    } catch (err: any) {
      console.error('Error fetching generations:', err);
    }
  };

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
        setTemplate(response.data);
        console.log('Template updated with generation data');
      }
    } catch (err: any) {
      console.error('Error fetching funds for generation:', err);
    }
  };

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

  const formatPercentage = (value: number | null) => {
    if (value === null || value === undefined) return 'N/A';
    return `${value.toFixed(2)}%`;
  };

  const handleGenerationSelect = (generation: Generation) => {
    setSelectedGeneration(generation);
  };

  const handleActivateGeneration = async (generationId: number) => {
    if (!generationId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Call the API to activate the generation
      await api.patch(`/available_portfolios/${portfolioId}/generations/${generationId}`, {
        status: 'active'
      });
      
      // Refresh the generations list
      await fetchGenerations();
      
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
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
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
      setError(`Cannot delete generation "${generation.generation_name || `Version ${generation.version_number}`}" - ${productCount} product${productCount === 1 ? '' : 's'} are using this generation.`);
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
      await fetchGenerations();
      
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
        <button
          onClick={handleBack}
          className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
        >
          Back to Portfolios
        </button>
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
        <button
          onClick={handleBack}
          className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
        >
          Back to Portfolios
        </button>
      </div>
    );
  }

  const weightedRisk = calculateWeightedRisk();

  return (
    <div className="container mx-auto px-4 lg:px-8 py-4 border-l-8 border-teal-500 bg-gradient-to-r from-teal-50/30 to-transparent">
      {/* Sidebar Color Strip implemented via left border and subtle background gradient */}
      
      {/* Breadcrumbs */}
      <nav className="mb-4 flex" aria-label="Breadcrumb">
        <ol className="inline-flex items-center space-x-1 md:space-x-3">
          <li className="inline-flex items-center">
            <button
              onClick={handleBack}
              className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-teal-700 transition-colors"
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
              <span className="ml-1 text-sm font-medium text-teal-700 md:ml-2">{template ? template.name : 'Portfolio Template Details'}</span>
            </div>
          </li>
        </ol>
      </nav>

      {/* Header Card */}
      <div className="bg-white shadow-sm rounded-lg border-2 border-teal-500 mb-4">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Portfolio Icon */}
              <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">
                  {template?.name || 'Unnamed Template'}
                </h1>
              </div>
            </div>
            
            <div className="relative">
              <button
                onClick={handleDeleteClick}
                disabled={hasProductsUsingTemplate || isCheckingProducts}
                className={`px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  hasProductsUsingTemplate || isCheckingProducts
                    ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                    : 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
                } transition-colors`}
                title={hasProductsUsingTemplate ? 'Cannot delete template - products are using this template' : 'Delete Template'}
              >
                {isCheckingProducts ? 'Checking...' : 'Delete Template'}
              </button>
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
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Products Using Template</div>
          <div className="mt-1 text-lg font-semibold text-gray-900">{productsCount}</div>
        </div>
        <div className="bg-white shadow-sm rounded-lg border border-gray-100 p-4">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Generations</div>
          <div className="mt-1 text-lg font-semibold text-gray-900">{generations?.length || 0}</div>
        </div>
      </div>

      {/* Generations Section */}
      {generations.length > 0 && (
        <div className="bg-white shadow-sm rounded-lg border border-gray-100 mb-4">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Portfolio Generations</h2>
              <Link
                to={`/add-generation/${portfolioId}`}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
              >
                <svg className="h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Generation
              </Link>
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
                    {generation.generation_name || `Version ${generation.version_number}`}
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
                        {selectedGeneration.generation_name || `Version ${selectedGeneration.version_number}`}
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
                        <button
                          onClick={() => handleActivateGeneration(selectedGeneration.id)}
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                        >
                          <svg className="h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Activate
                        </button>
                      )}
                      
                      <button
                        onClick={() => handleDeleteGenerationClick(selectedGeneration)}
                        disabled={isCheckingProducts || (generationProductCounts[selectedGeneration.id] || 0) > 0}
                        className={`inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${
                          isCheckingProducts || (generationProductCounts[selectedGeneration.id] || 0) > 0
                            ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                            : 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
                        }`}
                        title={
                          isCheckingProducts 
                            ? 'Checking for products using this generation...'
                            : (generationProductCounts[selectedGeneration.id] || 0) > 0
                            ? `Cannot delete - ${generationProductCounts[selectedGeneration.id]} product(s) are using this generation`
                            : 'Delete Generation'
                        }
                      >
                        <svg className="h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="bg-white p-3 rounded-md shadow-sm">
                      <p className="text-xs font-semibold text-gray-500 uppercase">Created</p>
                      <p className="text-sm text-gray-800 mt-1">{formatDate(selectedGeneration.created_at)}</p>
                    </div>
                    <div className="bg-white p-3 rounded-md shadow-sm">
                      <p className="text-xs font-semibold text-gray-500 uppercase">Version</p>
                      <p className="text-sm text-gray-800 mt-1">{selectedGeneration.version_number}</p>
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
                  {template?.funds && template.funds.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300">
                              Fund Name
                            </th>
                            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300">
                              ISIN
                            </th>
                            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300">
                              Target %
                            </th>
                            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300">
                              Risk
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {template.funds.slice().sort((a, b) => 
                            (a.available_funds?.fund_name || '').localeCompare(b.available_funds?.fund_name || '')
                          ).map((fund) => (
                            <tr key={fund.id} className="hover:bg-indigo-50 transition-colors duration-150 cursor-pointer border-b border-gray-100">
                              <td className="px-6 py-3 whitespace-nowrap">
                                {fund.available_funds ? (
                                  <div className="text-sm font-medium text-gray-800 font-sans tracking-tight">
                                    {fund.available_funds.fund_name}
                                  </div>
                                ) : (
                                  <div className="text-sm font-medium text-gray-800 font-sans tracking-tight">{`Fund ID: ${fund.fund_id}`}</div>
                                )}
                              </td>
                              <td className="px-6 py-3 whitespace-nowrap">
                                <div className="text-sm text-gray-600 font-sans">{fund.available_funds?.isin_number || 'N/A'}</div>
                              </td>
                              <td className="px-6 py-3 whitespace-nowrap">
                                <div className="text-sm text-gray-600 font-sans">{formatPercentage(fund.target_weighting)}</div>
                              </td>
                              <td className="px-6 py-3 whitespace-nowrap">
                                <div className="text-sm text-gray-600 font-sans">{fund.available_funds?.risk_factor || 'N/A'}</div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
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
                <button
                  type="button"
                  className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm ${
                    isDeleting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-700'
                  } transition-colors`}
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm transition-colors"
                  onClick={handleCancelDelete}
                  disabled={isDeleting}
                >
                  Cancel
                </button>
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
                        Are you sure you want to delete generation "{generationToDelete.generation_name || `Version ${generationToDelete.version_number}`}"? This action cannot be undone.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm ${
                    isDeletingGeneration ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-700'
                  } transition-colors`}
                  onClick={handleConfirmDeleteGeneration}
                  disabled={isDeletingGeneration}
                >
                  {isDeletingGeneration ? 'Deleting...' : 'Delete'}
                </button>
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm transition-colors"
                  onClick={handleCancelDeleteGeneration}
                  disabled={isDeletingGeneration}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PortfolioTemplateDetails; 