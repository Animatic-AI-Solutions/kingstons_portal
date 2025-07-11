import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { findCashFund, isCashFund } from '../utils/fundUtils';
import { DateInput } from '../components/ui';

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
  const [searchQuery, setSearchQuery] = useState('');

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
      const response = await api.get(`/available_portfolios/${portfolioId}`);
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
      const genResponse = await api.get(`/available_portfolios/${portfolioId}/generations`);
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
        const fundsResponse = await api.get(`/available_portfolios/${portfolioId}`, {
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
        await api.patch(`/available_portfolios/${portfolioId}/generations/${generationId}`, {
          generation_name: formData.generation_name,
          description: formData.description,
          created_at: formData.created_at, // Include creation date in update
          funds: fundsData
        });
        
        // Navigate back to the template details page with refresh flag
        navigate(`/definitions/portfolio-templates/${portfolioId}`, {
          state: { refreshNeeded: true }
        });
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

  // Calculate total weighting for the progress bar
  const totalWeighting = useMemo(() => {
    return Object.values(fundWeightings).reduce((a, b) => {
      const numValue = parseFloat(b) || 0;
      return a + numValue;
    }, 0);
  }, [fundWeightings]);

  // Determine progress bar color based on total
  const getProgressBarColor = () => {
    if (Math.abs(totalWeighting - 100) < 0.01) return 'bg-green-500'; // Perfect at 100%
    if (totalWeighting > 100) return 'bg-red-500'; // Too high
    if (totalWeighting > 90) return 'bg-yellow-500'; // Close to target
    return 'bg-blue-500'; // Still collecting
  };

  // Filter funds based on search query
  const filteredFunds = useMemo(() => {
    if (!searchQuery.trim()) return availableFunds;
    
    const query = searchQuery.toLowerCase();
    return availableFunds.filter(fund => 
      (fund.fund_name && fund.fund_name.toLowerCase().includes(query)) || 
      (fund.isin_number && fund.isin_number.toLowerCase().includes(query))
    );
  }, [availableFunds, searchQuery]);

  if (isLoadingPortfolio || isLoadingGeneration) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-700"></div>
      </div>
    );
  }

  if (!generation) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                  <label htmlFor="generation_name" className="block text-sm font-medium text-gray-700 mb-1">
                    Generation Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="generation_name"
                    name="generation_name"
                    value={formData.generation_name}
                    onChange={handleChange}
                    required
                    className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
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
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description || ''}
                    onChange={handleChange}
                    rows={2}
                    className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
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
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 sm:px-6 flex justify-between items-center">
                <h3 className="text-base font-medium text-gray-900">Edit Funds</h3>
                <div className="flex items-center">
                  <span className="text-sm text-gray-500 mr-2">Allocation: </span>
                  <div className="w-56 bg-gray-200 rounded-full h-2.5 flex-grow">
                    <div 
                      className={`h-2.5 rounded-full ${getProgressBarColor()}`} 
                      style={{ width: `${Math.min(totalWeighting, 100)}%` }}
                    ></div>
                  </div>
                  <span className={`ml-2 text-sm font-medium ${
                    Math.abs(totalWeighting - 100) < 0.01 ? 'text-green-700' : 
                    totalWeighting > 100 ? 'text-red-700' : 'text-gray-700'
                  }`}>
                    {totalWeighting.toFixed(1)}%
                  </span>
                </div>
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
                  <div className="space-y-4">
                    {/* Search Bar */}
                    <div className="mb-2">
                      <div className="relative">
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search funds by name or ISIN..."
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-primary-700 focus:border-primary-700 transition-colors duration-200"
                          aria-label="Search funds"
                        />
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        </div>
                        {searchQuery && (
                          <button
                            type="button"
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                            onClick={() => setSearchQuery('')}
                          >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-100">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300">
                              Select
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300">
                              Fund Name
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300">
                              ISIN
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300">
                              Risk Factor
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300">
                              Status
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300">
                              Target Weighting (%)
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {filteredFunds.map((fund) => {
                            const isCash = isCashFund(fund);
                            const isSelected = selectedFunds.includes(fund.id);
                            
                            return (
                            <tr 
                              key={fund.id} 
                                className={`transition-all duration-150 ${
                                  isCash ? 'bg-blue-50 border-blue-200' : 
                                  isSelected ? 'bg-blue-50 border-blue-200' : 
                                  'hover:bg-gray-50 hover:border-gray-200 cursor-pointer'
                                } border-b border-gray-100`}
                                onClick={() => !isCash && handleFundSelection(fund.id)}
                            >
                              <td className="px-6 py-3 whitespace-nowrap">
                                  <div className="flex items-center">
                                <input
                                  type="checkbox"
                                      checked={isSelected}
                                      onChange={() => !isCash && handleFundSelection(fund.id)}
                                      disabled={isCash}
                                      className={`h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded ${
                                        isCash ? 'cursor-not-allowed opacity-75' : 'pointer-events-none'
                                      }`}
                                    />
                                    {isCash && (
                                      <span className="ml-2 text-xs text-blue-600 font-medium">Required</span>
                                    )}
                                  </div>
                              </td>
                              <td className="px-6 py-3 whitespace-nowrap">
                                  <div className={`text-sm font-medium font-sans tracking-tight ${
                                    isCash ? 'text-blue-800' : 'text-gray-800'
                                  }`}>
                                    {fund.fund_name}
                                    {isCash && <span className="ml-2 text-xs text-blue-600 font-normal">(Always included)</span>}
                                  </div>
                              </td>
                              <td className="px-6 py-3 whitespace-nowrap">
                                <div className="text-sm text-gray-600 font-sans">{fund.isin_number || 'N/A'}</div>
                              </td>
                              <td className="px-6 py-3 whitespace-nowrap">
                                <div className="text-sm text-gray-600 font-sans">
                                  {fund.risk_factor !== undefined && fund.risk_factor !== null ? (
                                    <span className="flex items-center">
                                      {fund.risk_factor}
                                      <span className={`ml-1.5 w-2 h-2 rounded-full ${
                                        fund.risk_factor <= 2 ? 'bg-green-500' : 
                                        fund.risk_factor <= 4 ? 'bg-blue-500' : 
                                        fund.risk_factor <= 6 ? 'bg-yellow-500' : 
                                        'bg-red-500'
                                      }`}></span>
                                    </span>
                                  ) : 'N/A'}
                                </div>
                              </td>
                              <td className="px-6 py-3 whitespace-nowrap">
                                <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  fund.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                  {fund.status}
                                </span>
                              </td>
                              <td className="px-6 py-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                  {isSelected && (
                                  <div className="flex items-center">
                                    <input
                                      type="text"
                                      value={fundWeightings[fund.id.toString()] || ''}
                                      onChange={(e) => handleWeightingChange(
                                        fund.id,
                                        e.target.value
                                      )}
                                      onKeyDown={(e) => {
                                        // Prevent form submission when Enter is pressed
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          // Optionally blur the field to simulate moving to next field
                                          e.currentTarget.blur();
                                        }
                                      }}
                                      placeholder="0.00"
                                      className="w-20 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                                    />
                                  </div>
                                )}
                                  {!isSelected && (
                                  <span className="text-gray-400 text-sm">Click to select</span>
                                )}
                              </td>
                            </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    
                    <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg">
                      <div className="text-sm text-gray-500">
                        {selectedFunds.length} fund(s) selected
                      </div>
                      <div className={`text-sm ${
                        Math.abs(totalWeighting - 100) < 0.01
                          ? 'text-green-600 font-medium' 
                          : totalWeighting > 100
                            ? 'text-red-600 font-medium'
                            : 'text-gray-600'
                      }`}>
                        Total weighting: {totalWeighting.toFixed(2)}%
                        {selectedFunds.length > 0 && Math.abs(totalWeighting - 100) > 0.01 && 
                          <span className="ml-2 text-sm">(Must equal 100%)</span>
                        }
                      </div>
                    </div>
                  </div>
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
    </div>
  );
};

export default EditPortfolioGeneration; 