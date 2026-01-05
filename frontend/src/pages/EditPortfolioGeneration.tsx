import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import DynamicPageContainer from '../components/phase2/client-groups/DynamicPageContainer';
import { findCashFund, isCashFund } from '../utils/fundUtils';
import { DateInput, BaseInput } from '../components/ui';
import FundSelectionManager from '../components/phase1/funds/generation/FundSelectionManager';

interface Fund {
  id: number;
  fund_name: string;
  isin_number?: string;
  risk_factor?: number;
  fund_cost?: number;
  status: string;
  created_at?: string;
}

interface GenerationFormData {
  generation_name: string;
  description: string;
  created_at: string; // ISO date string for generation creation date
}

interface PortfolioFund {
  fund_id: number;
  target_weighting: number;
}

interface PortfolioTemplate {
  id: number;
  name: string;
  created_at: string;
}

interface Generation {
  id: number;
  generation_name: string;
  description?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

const EditPortfolioGeneration: React.FC = () => {
  const { portfolioId, generationId } = useParams<{ portfolioId: string, generationId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { api } = useAuth();
  
  const [formData, setFormData] = useState<GenerationFormData>({
    generation_name: '',
    description: '',
    created_at: '' // Initialize creation date to empty string
  });
  
  const [portfolio, setPortfolio] = useState<PortfolioTemplate | null>(null);
  const [generation, setGeneration] = useState<Generation | null>(null);
  const [availableFunds, setAvailableFunds] = useState<Fund[]>([]);
  const [selectedFunds, setSelectedFunds] = useState<number[]>([]);
  const [fundWeightings, setFundWeightings] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingFunds, setIsLoadingFunds] = useState(false);
  const [isLoadingPortfolio, setIsLoadingPortfolio] = useState(true);
  const [isLoadingGeneration, setIsLoadingGeneration] = useState(true);
  const [fundSearchTerm, setFundSearchTerm] = useState('');

  useEffect(() => {
    if (portfolioId && generationId) {
      fetchPortfolioDetails();
      fetchGenerationDetails();
      fetchAllFunds();
    }
  }, [portfolioId, generationId]);

  const fetchPortfolioDetails = async () => {
    try {
      setIsLoadingPortfolio(true);
      const response = await api.get(`/available-portfolios/${portfolioId}`);
      setPortfolio(response.data);
    } catch (err: any) {
      console.error('Error fetching portfolio details:', err);
      setError('Failed to fetch portfolio template details');
    } finally {
      setIsLoadingPortfolio(false);
    }
  };

  const fetchGenerationDetails = async () => {
    try {
      setIsLoadingGeneration(true);
      
      // Fetch the generation details
      const genResponse = await api.get(`/available-portfolios/${portfolioId}/generations`);
      const generations = genResponse.data;
      const currentGeneration = generations.find((gen: Generation) => gen.id === parseInt(generationId || '0'));
      
      if (currentGeneration) {
        setGeneration(currentGeneration);
        setFormData({
          generation_name: currentGeneration.generation_name || '',
          description: currentGeneration.description || '',
          created_at: currentGeneration.created_at || ''
        });
        
        // Fetch funds for this specific generation
        const fundsResponse = await api.get(`/available-portfolios/${portfolioId}`, {
          params: { generation_id: generationId }
        });
        
        if (fundsResponse.data && fundsResponse.data.funds && fundsResponse.data.funds.length > 0) {
          // Process the funds to pre-populate selection and weightings
          const fundIds = fundsResponse.data.funds.map((fund: any) => fund.fund_id);
          const weightings: Record<string, string> = {};
          
          fundsResponse.data.funds.forEach((fund: any) => {
            weightings[fund.fund_id.toString()] = fund.target_weighting.toString();
          });
          
          // Ensure cash fund is always included
          const cashFund = findCashFund(availableFunds);
          if (cashFund && !fundIds.includes(cashFund.id)) {
            fundIds.push(cashFund.id);
            weightings[cashFund.id.toString()] = '0';
          }
          
          setSelectedFunds(fundIds);
          setFundWeightings(weightings);
        }
      } else {
        setError(`Generation with ID ${generationId} not found`);
      }
    } catch (err: any) {
      console.error('Error fetching generation details:', err);
      setError('Failed to load generation details');
    } finally {
      setIsLoadingGeneration(false);
    }
  };

  const fetchAllFunds = async () => {
    try {
      setIsLoadingFunds(true);
      const response = await api.get('/funds', {
        params: { status: 'active' }
      });
      // Sort funds alphabetically by fund_name
      const sortedFunds = response.data.sort((a: Fund, b: Fund) => 
        a.fund_name.localeCompare(b.fund_name)
      );
      setAvailableFunds(sortedFunds);
      
      // If no funds are selected yet, automatically select the cash fund
      if (selectedFunds.length === 0) {
        const cashFund = findCashFund(sortedFunds);
        if (cashFund) {
          setSelectedFunds([cashFund.id]);
          setFundWeightings({
            [cashFund.id.toString()]: '0'
          });
        }
      }
    } catch (err: any) {
      setError('Failed to fetch funds');
      console.error('Error fetching funds:', err);
    } finally {
      setIsLoadingFunds(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handler for creation date change
  const handleCreationDateChange = (date: Date | null, formatted: string) => {
    setFormData(prev => ({
      ...prev,
      created_at: date ? date.toISOString() : ''
    }));
  };

  const handleFundSelection = (fundId: number) => {
    const fund = availableFunds.find(f => f.id === fundId);
    
    // Prevent deselection of cash fund
    if (fund && isCashFund(fund) && selectedFunds.includes(fundId)) {
      // Show a brief message or just ignore the action
      return;
    }
    
    // Clear errors when user makes changes
    if (error) {
      setError(null);
    }
    
    setSelectedFunds(prev => {
      if (prev.includes(fundId)) {
        const newSelected = prev.filter(id => id !== fundId);
        // Remove weighting for unselected fund
        const newWeightings = { ...fundWeightings };
        delete newWeightings[fundId.toString()];
        setFundWeightings(newWeightings);
        return newSelected;
      } else {
        // Set empty weighting for newly selected fund
        setFundWeightings(prev => ({
          ...prev,
          [fundId.toString()]: ''
        }));
        return [...prev, fundId];
      }
    });
  };

  const handleWeightingChange = (fundId: number, weighting: string) => {
    // Clear errors when user makes changes
    if (error) {
      setError(null);
    }
    
    // Allow empty string for clearing the field
    if (weighting === '') {
      setFundWeightings(prev => ({
        ...prev,
        [fundId.toString()]: ''
      }));
      return;
    }
    
    // Remove any non-numeric characters except decimal point
    const cleanedValue = weighting.replace(/[^0-9.]/g, '');
    
    // Prevent multiple decimal points
    const parts = cleanedValue.split('.');
    if (parts.length > 2) {
      return; // Invalid: multiple decimal points
    }
    
    // Limit to 2 decimal places
    if (parts.length === 2 && parts[1].length > 2) {
      return; // Invalid: too many decimal places
    }
    
    // Convert to number to validate range
    const numValue = parseFloat(cleanedValue);
    
    // Allow partial inputs during typing (e.g., "10." for "10.0")
    if (!isNaN(numValue) && numValue > 100) {
      return; // Invalid: exceeds 100%
    }
    
    setFundWeightings(prev => ({
      ...prev,
      [fundId.toString()]: cleanedValue
    }));
  };

  const handleClearAllFunds = () => {
    // Clear errors when user makes changes
    if (error) {
      setError(null);
    }
    
    setSelectedFunds([]);
    setFundWeightings({});
    
    // Re-add cash fund if it exists
    const cashFund = findCashFund(availableFunds);
    if (cashFund) {
      setSelectedFunds([cashFund.id]);
      setFundWeightings({ [cashFund.id.toString()]: '0' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      try {
        setIsSubmitting(true);
        setError(null);
        
        // Prepare the funds data
        const fundsData = selectedFunds.map(fundId => ({
          fund_id: fundId,
          target_weighting: parseFloat(fundWeightings[fundId.toString()] || '0')
        }));
        
        // Update the generation details
        await api.patch(`/available-portfolios/${portfolioId}/generations/${generationId}`, {
          generation_name: formData.generation_name,
          description: formData.description,
          created_at: formData.created_at, // Include creation date in update
          funds: fundsData
        });
        
        // Invalidate React Query cache for portfolio template details to ensure fresh data
        await queryClient.invalidateQueries({
          queryKey: ['portfolio-template-details', portfolioId]
        });
        
        // Navigate back to the template details page
        navigate(`/definitions/portfolio-templates/${portfolioId}`);
      } catch (err: any) {
        console.error('Error updating portfolio generation:', err);
        if (err.response?.data?.detail) {
          const detail = err.response.data.detail;
          if (Array.isArray(detail)) {
            setError(detail.map(item => item.msg || String(item)).join(', '));
          } else {
            setError(String(detail));
          }
        } else {
          setError('Failed to update portfolio generation');
        }
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const validateForm = () => {
    if (!formData.generation_name.trim()) {
      setError('Generation name is required');
      return false;
    }
    
    // Validate fund weightings
    if (selectedFunds.length === 0) {
      setError('Please select at least one fund');
      return false;
    }
    
    // Calculate total weighting
    const totalWeighting = Object.values(fundWeightings).reduce((a, b) => {
      const numValue = parseFloat(b) || 0;
      return a + numValue;
    }, 0);
    
    // Check if total weighting equals 100%
    if (Math.abs(totalWeighting - 100) > 0.01) {
      setError(`Total fund weighting must equal 100%. Current total: ${totalWeighting.toFixed(2)}%`);
      return false;
    }
    
    return true;
  };

  // Initialize form data when template changes
  useEffect(() => {
    if (generation) {
      setFormData({
        generation_name: generation.generation_name || '',
        description: generation.description || '',
        created_at: generation.created_at || ''
      });
    }
  }, [generation]);

  if (isLoadingPortfolio || isLoadingGeneration) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-700"></div>
      </div>
    );
  }

  if (!generation) {
    return (
      <DynamicPageContainer maxWidth="2800px" className="py-8">
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-red-700 text-sm font-medium">Generation not found or could not be loaded.</p>
            </div>
          </div>
        </div>
        <button
          onClick={() => navigate(`/definitions/portfolio-templates/${portfolioId}`, {
            state: { refreshNeeded: true }
          })}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          <svg className="-ml-1 mr-2 h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Back to Template
        </button>
      </DynamicPageContainer>
    );
  }

  return (
    <DynamicPageContainer maxWidth="2800px" className="py-8">
      {/* Breadcrumb Navigation */}
      <nav className="mb-8 flex" aria-label="Breadcrumb">
        <ol className="inline-flex items-center space-x-1 md:space-x-3">
          <li className="inline-flex items-center">
            <Link to="/definitions/portfolio-templates" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-primary-700">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"></path>
              </svg>
              Portfolio Templates
            </Link>
          </li>
          <li>
            <div className="flex items-center">
              <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"></path>
              </svg>
              <button 
                onClick={() => navigate(`/definitions/portfolio-templates/${portfolioId}`, {
                  state: { refreshNeeded: true }
                })}
                className="ml-1 text-sm font-medium text-gray-500 hover:text-primary-700 md:ml-2"
              >
                {portfolio?.name || 'Template'}
              </button>
            </div>
          </li>
          <li aria-current="page">
            <div className="flex items-center">
              <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"></path>
              </svg>
              <span className="ml-1 text-sm font-medium text-primary-700 md:ml-2">Edit Generation</span>
            </div>
          </li>
        </ol>
      </nav>

      {/* Header */}
      <div className="flex justify-between items-center mb-8 mt-4">
        <div className="flex items-center">
          <div className="bg-primary-100 p-2 rounded-lg mr-3 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </div>
          <h1 className="text-3xl font-normal text-gray-900 font-sans tracking-wide">
            Edit Generation: {generation.generation_name}
          </h1>
        </div>
        <button
          onClick={() => navigate(`/definitions/portfolio-templates/${portfolioId}`, {
            state: { refreshNeeded: true }
          })}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          <svg className="-ml-1 mr-2 h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Back
        </button>
      </div>

      {/* Main Content */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden border border-gray-200">
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-0">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-red-700 text-sm font-medium">{error}</p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="w-full">
                  <BaseInput
                    label="Generation Name"
                    required
                    id="generation_name"
                    name="generation_name"
                    value={formData.generation_name}
                    onChange={handleChange}
                    placeholder="e.g., Q2 2023 Conservative Allocation"
                  />
                </div>
                <div className="w-full">
                  <DateInput
                    label="Creation Date"
                    id="created_at"
                    name="created_at"
                    value={formData.created_at}
                    onChange={handleCreationDateChange}
                    placeholder="Select creation date"
                    helperText="Leave empty to use current date/time"
                    required={false}
                  />
                </div>
                <div className="w-full">
                  <BaseInput
                    label="Description"
                    id="description"
                    name="description"
                    value={formData.description || ''}
                    onChange={handleChange}
                    placeholder="Enter a detailed description of this portfolio generation"
                  />
                </div>
              </div>
              
              <div className="mt-2">
                <div className="flex items-center">
                  <div className="text-sm text-gray-600">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      generation.status === 'active' ? 'bg-green-100 text-green-800' :
                      generation.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      Status: {generation.status.charAt(0).toUpperCase() + generation.status.slice(1)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Fund Selection Section */}
          <div className="p-5">
            <div className="rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 sm:px-6">
                <h3 className="text-base font-medium text-gray-900">Edit Funds</h3>
              </div>
              
              <div className="p-4">
                {isLoadingFunds ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-700"></div>
                  </div>
                ) : availableFunds.length === 0 ? (
                  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-yellow-700">
                          No funds available. Please add funds before editing this portfolio generation.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <FundSelectionManager
                    availableFunds={availableFunds}
                    selectedFunds={selectedFunds}
                    fundWeightings={fundWeightings}
                    onFundSelect={handleFundSelection}
                    onFundDeselect={handleFundSelection}
                    onWeightingChange={handleWeightingChange}
                    onClearAll={handleClearAllFunds}
                    searchQuery={fundSearchTerm}
                    onSearchChange={setFundSearchTerm}
                    isLoading={isLoadingFunds}
                    error={error}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
            <Link
              to={`/definitions/portfolio-templates/${portfolioId}`}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`bg-primary-700 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 shadow-sm transition-colors duration-200 ${
                isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {isSubmitting ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Updating...
                </span>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </DynamicPageContainer>
  );
};

export default EditPortfolioGeneration; 