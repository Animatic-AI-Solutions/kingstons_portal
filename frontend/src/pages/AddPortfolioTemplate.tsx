import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import DynamicPageContainer from '../components/phase2/client-groups/DynamicPageContainer';
import { BaseInput, BaseDropdown, TextArea, ActionButton, DateInput } from '../components/ui';
import { findCashFund, isCashFund } from '../utils/fundUtils';

interface Fund {
  id: number;
  fund_name: string;
  isin_number?: string;
  risk_factor?: number;
  fund_cost?: number;
  status: string;
  created_at?: string;
}

interface TemplatePortfolioFormData {
  name: string;
  status: string;
  generation_name: string;
  description: string;
  created_at: string; // ISO date string for template creation date
}

interface PortfolioFund {
  fund_id: number;
  target_weighting: number;
}

const AddPortfolioTemplate: React.FC = () => {
  const navigate = useNavigate();
  const { api } = useAuth();
  const [formData, setFormData] = useState<TemplatePortfolioFormData>({
    name: '',
    status: 'active',
    generation_name: '',
    description: '',
    created_at: '' // Initialize creation date to empty string
  });
  const [availableFunds, setAvailableFunds] = useState<Fund[]>([]);
  const [selectedFunds, setSelectedFunds] = useState<number[]>([]);
  const [fundWeightings, setFundWeightings] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingFunds, setIsLoadingFunds] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Only fetch funds since products are no longer needed for templates
    fetchAllFunds();
  }, []);

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
      
      // Auto-select Cash fund if it exists
      const cashFund = findCashFund(sortedFunds);
      if (cashFund) {
        setSelectedFunds(prev => {
          // Check if cash fund is already selected to prevent duplicates
          if (!prev.includes(cashFund.id)) {
            return [...prev, cashFund.id];
          }
          return prev;
        });
        setFundWeightings(prev => {
          // Only add weighting if it doesn't already exist
          if (!prev[cashFund.id.toString()]) {
            return {
          ...prev,
          [cashFund.id.toString()]: '0'
            };
          }
          return prev;
        });
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch funds');
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

  // New handlers for BaseInput components
  const handleTemplateNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      name: e.target.value
    }));
  };

  const handleGenerationNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      generation_name: e.target.value
    }));
  };

  // New handler for TextArea component
  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      description: e.target.value
    }));
  };

  // New handler for BaseDropdown component
  const handleStatusChange = (value: string | number) => {
    setFormData(prev => ({
      ...prev,
      status: String(value)
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
    setSelectedFunds(prev => {
      if (prev.includes(fundId)) {
        // Check if this is the Cash fund - prevent removal
        const fund = availableFunds.find(f => f.id === fundId);
        if (fund && isCashFund(fund)) {
          // Show a toast message instead of removing
          alert('Cash fund cannot be removed from portfolio templates.');
          return prev;
        }
        
        const newSelected = prev.filter(id => id !== fundId);
        // Remove weighting for unselected fund
        const newWeightings = { ...fundWeightings };
        delete newWeightings[fundId.toString()];
        setFundWeightings(newWeightings);
        return newSelected;
      } else {
        // Set appropriate weighting for newly selected fund
        const fund = availableFunds.find(f => f.id === fundId);
        const initialWeighting = fund && isCashFund(fund) ? '0' : '';
        
        setFundWeightings(prev => ({
          ...prev,
          [fundId.toString()]: initialWeighting
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
        
        // Create the portfolio template
        const portfolioResponse = await api.post('/available-portfolios', {
          name: formData.name,
          generation_name: formData.generation_name,
          description: formData.description,
          created_at: formData.created_at, // Include creation date for template and first generation
          funds: fundsData
        });
        
        // Navigate to the template details page using the returned portfolio ID
        const newPortfolioId = portfolioResponse.data.id;
        navigate(`/definitions/portfolio-templates/${newPortfolioId}`);
      } catch (err: any) {
        console.error('Error creating portfolio template:', err);
        if (err.response?.data?.detail) {
          // Safely handle detail that might be an array or string
          const detail = err.response.data.detail;
          if (Array.isArray(detail)) {
            setError(detail.map(item => item.msg || String(item)).join(', '));
          } else {
            setError(String(detail));
          }
        } else {
          setError('Failed to create portfolio template');
        }
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('Portfolio template name is required');
      return false;
    }
    
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

  // Calculate weighted risk when total weighting is 100%
  const weightedRisk = useMemo(() => {
    // Only calculate if total weighting equals 100%
    if (Math.abs(totalWeighting - 100) > 0.01) {
      return null;
    }

    let totalWeightedRisk = 0;
    let totalValidWeighting = 0;

    selectedFunds.forEach(fundId => {
      const fund = availableFunds.find(f => f.id === fundId);
      const weighting = parseFloat(fundWeightings[fundId.toString()] || '0');
      
      if (fund && fund.risk_factor !== undefined && fund.risk_factor !== null && weighting > 0) {
        totalWeightedRisk += (fund.risk_factor * weighting);
        totalValidWeighting += weighting;
      }
    });

    // Return the weighted average risk, or null if no valid risk data
    return totalValidWeighting > 0 ? totalWeightedRisk / totalValidWeighting : null;
  }, [selectedFunds, fundWeightings, availableFunds, totalWeighting]);

  // Sort selected funds: alphabetical order for non-cash funds, cash funds always last
  const sortedSelectedFunds = useMemo(() => {
    const selectedFundObjects = selectedFunds.map(fundId => 
      availableFunds.find(f => f.id === fundId)
    ).filter(Boolean) as Fund[];
    
    // Separate cash funds from non-cash funds
    const cashFunds = selectedFundObjects.filter(fund => isCashFund(fund));
    const nonCashFunds = selectedFundObjects
      .filter(fund => !isCashFund(fund))
      .sort((a, b) => a.fund_name.localeCompare(b.fund_name));
    
    // Return non-cash funds first (alphabetical), then cash funds
    return [...nonCashFunds, ...cashFunds].map(fund => fund.id);
  }, [selectedFunds, availableFunds]);

  // Determine progress bar color based on total
  const getProgressBarColor = () => {
    if (Math.abs(totalWeighting - 100) < 0.01) return 'bg-green-500'; // Perfect at 100%
    if (totalWeighting > 100) return 'bg-red-500'; // Too high
    if (totalWeighting > 90) return 'bg-yellow-500'; // Close to target
    return 'bg-blue-500'; // Still collecting
  };

  // Filter funds based on search query and exclude Cash funds
  const filteredFunds = useMemo(() => {
    // First filter out Cash funds
    let filtered = availableFunds.filter(fund => !isCashFund(fund));
    
    // Then apply search filter if there's a search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(fund => 
        (fund.fund_name && fund.fund_name.toLowerCase().includes(query)) || 
        (fund.isin_number && fund.isin_number.toLowerCase().includes(query))
      );
    }
    
    return filtered;
  }, [availableFunds, searchQuery]);

  return (
    <DynamicPageContainer maxWidth="2800px" className="py-8">
      {/* Breadcrumb Navigation */}
      <nav className="mb-8 flex" aria-label="Breadcrumb">
        <ol className="inline-flex items-center space-x-1 md:space-x-3">
          <li className="inline-flex items-center">
            <Link to="/definitions" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-primary-700">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"></path>
              </svg>
              Definitions
            </Link>
          </li>
          <li>
            <div className="flex items-center">
              <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"></path>
              </svg>
              <Link to="/definitions?tab=portfolios" className="ml-1 text-sm font-medium text-gray-500 hover:text-primary-700 md:ml-2">
                Portfolios
              </Link>
            </div>
          </li>
          <li aria-current="page">
            <div className="flex items-center">
              <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"></path>
              </svg>
              <span className="ml-1 text-sm font-medium text-primary-700 md:ml-2">Add Portfolio Template</span>
            </div>
          </li>
        </ol>
      </nav>

      {/* Header */}
      <div className="flex justify-between items-center mb-8 mt-4">
        <div className="flex items-center">
          <div className="bg-primary-100 p-2 rounded-lg mr-3 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h1 className="text-3xl font-normal text-gray-900 font-sans tracking-wide">Create Portfolio Template</h1>
        </div>
        <Link to="/definitions?tab=portfolios">
          <ActionButton
            variant="cancel"
            size="md"
            design="minimal"
          >
            Back
          </ActionButton>
        </Link>
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
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-3">
                  <BaseInput
                    label="Template Name"
                    placeholder="e.g., Conservative ISA Template"
                    value={formData.name}
                    onChange={handleTemplateNameChange}
                    required
                    helperText="Enter a descriptive name for this portfolio template"
                  />
                </div>
                <div className="md:col-span-1">
                  <BaseDropdown
                    label="Status"
                    options={[
                      { value: 'active', label: 'Active' },
                      { value: 'inactive', label: 'Inactive' }
                    ]}
                    value={formData.status}
                    onChange={handleStatusChange}
                    placeholder="Select status"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="w-full">
                  <BaseInput
                    label="Generation Name"
                    placeholder="e.g., Initial Version 2024"
                    value={formData.generation_name}
                    onChange={handleGenerationNameChange}
                    helperText="A name for this specific version of the template"
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
                  <TextArea
                    label="Description"
                    placeholder="Enter a detailed description of this portfolio template generation"
                    value={formData.description}
                    onChange={handleDescriptionChange}
                    rows={2}
                  />
                </div>
              </div>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Define a new portfolio template by selecting funds and setting their target weightings. The total weighting must equal 100%.
            </p>
          </div>

          <div className="p-5">
          {/* Fund Selection Section */}
            <div className="rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 sm:px-6">
                <h3 className="text-base font-medium text-gray-900">Select Funds</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Choose funds and set their target weightings. The total weighting must equal 100%.
                </p>
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
                          No funds available. Please add funds before creating a portfolio template.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Side-by-side Layout with Headers, Search, and Lists */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* Selected Funds Section - Left Side */}
                      <div className="space-y-2">
                        {/* Selected Funds Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <h4 className="text-sm font-medium text-gray-700">Selected Funds</h4>
                            <div className="bg-primary-100 text-primary-800 px-2 py-0.5 rounded-full text-xs font-medium">
                              {selectedFunds.length}
                            </div>
                            <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              (() => {
                                const totalWeight = totalWeighting;
                                if (Math.abs(totalWeight - 100) < 0.01) return 'bg-green-100 text-green-800';
                                if (totalWeight > 100) return 'bg-red-100 text-red-800';
                                if (totalWeight > 0) return 'bg-blue-100 text-blue-800';
                                return 'bg-gray-100 text-gray-600';
                              })()
                            }`}>
                              {totalWeighting.toFixed(1)}%
                            </div>
                            {Math.abs(totalWeighting - 100) < 0.01 && weightedRisk !== null && weightedRisk !== undefined && (
                              <div className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                <span className="flex items-center space-x-1">
                                  <span>Risk: {weightedRisk.toFixed(1)}</span>
                                  <div className={`w-2 h-2 rounded-full ${
                                    weightedRisk <= 2 ? 'bg-green-500' :
                                    weightedRisk <= 4 ? 'bg-blue-500' :
                                    weightedRisk <= 6 ? 'bg-yellow-500' : 'bg-red-500'
                                  }`}></div>
                                </span>
                              </div>
                            )}
                          </div>
                          {selectedFunds.length > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedFunds([]);
                                setFundWeightings({});
                              }}
                              className="text-gray-400 hover:text-red-500 text-xs font-medium"
                              title="Clear all"
                            >
                              Clear all
                            </button>
                          )}
                        </div>

                        {/* Selected Funds Display */}
                        <div className="h-[500px] sm:h-[600px] lg:h-[700px] xl:h-[800px] overflow-y-auto border rounded bg-white">
                          {selectedFunds.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-sm text-gray-500">
                              <div className="text-center">
                                <div className="mx-auto w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mb-3">
                                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                  </svg>
                                </div>
                                <p className="text-sm font-medium">No funds selected</p>
                                <p className="text-xs">Choose funds from the list on the right</p>
                              </div>
                            </div>
                          ) : (
                                                        <div className="p-1 space-y-1">
                              {sortedSelectedFunds.map((fundId) => {
                                const fund = availableFunds.find(f => f.id === fundId);
                                if (!fund) return null;
                                
                                const isCash = isCashFund(fund);
                                
                                return (
                                  <div key={`selected-${fundId}`} className={`border rounded-md p-2 transition-colors ${
                                    isCash 
                                      ? 'bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200 hover:from-blue-100 hover:to-blue-150' 
                                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                                  }`}>
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center space-x-2 flex-1 min-w-0">
                                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                          isCash ? 'bg-blue-500' : 'bg-primary-500'
                                        }`}></div>
                                        <div className="min-w-0 flex-1">
                                          <div className="flex items-center justify-between">
                                            <div className="min-w-0 flex-1">
                                              <div className={`text-xs font-medium truncate ${
                                                isCash ? 'text-blue-900' : 'text-gray-900'
                                              }`} title={fund.fund_name}>
                                                {fund.fund_name}
                                                {isCash && <span className="ml-1 text-blue-600">(Auto)</span>}
                                              </div>
                                              <div className="flex items-center space-x-2 text-xs">
                                                {fund.isin_number && (
                                                  <span className={`truncate ${
                                                    isCash ? 'text-blue-600' : 'text-gray-500'
                                                  }`} title={fund.isin_number}>
                                                    {fund.isin_number}
                                                  </span>
                                                )}
                                                {fund.risk_factor !== undefined && fund.risk_factor !== null && (
                                                  <span className={`flex items-center ${
                                                    isCash ? 'text-blue-600' : 'text-gray-600'
                                                  }`}>
                                                    Risk: {fund.risk_factor}
                                                    <span className={`ml-1 w-1.5 h-1.5 rounded-full ${
                                                      fund.risk_factor <= 2 ? 'bg-green-500' : 
                                                      fund.risk_factor <= 4 ? 'bg-blue-500' : 
                                                      fund.risk_factor <= 6 ? 'bg-yellow-500' : 
                                                      'bg-red-500'
                                                    }`}></span>
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                            
                                            <div className="flex items-center space-x-1 flex-shrink-0 ml-2">
                                              <input
                                                type="text"
                                                value={fundWeightings[fundId.toString()] || ''}
                                                onChange={(e) => handleWeightingChange(fundId, e.target.value)}
                                                className={`w-12 text-xs text-center border rounded px-1 py-0.5 focus:ring-1 ${
                                                  isCash 
                                                    ? 'border-blue-300 focus:ring-blue-500 focus:border-blue-500 bg-white' 
                                                    : 'border-gray-300 focus:ring-primary-500 focus:border-primary-500'
                                                }`}
                                                placeholder="0"
                                              />
                                              <span className={`text-xs ${
                                                isCash ? 'text-blue-700' : 'text-gray-500'
                                              }`}>%</span>
                                              <button
                                                type="button"
                                                onClick={() => handleFundSelection(fundId)}
                                                className={`p-0.5 rounded transition-colors ${
                                                  isCash 
                                                    ? 'text-blue-300 cursor-not-allowed' 
                                                    : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
                                                }`}
                                                title={isCash ? "Cash fund cannot be removed" : "Remove fund"}
                                                disabled={isCash}
                                              >
                                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                        
                        {/* Selected Funds Summary */}
                        <div className="bg-gray-50 p-3 rounded-lg border">
                          <div className="flex justify-between items-center">
                            <div className="text-sm text-gray-600">
                              {selectedFunds.length} fund(s) selected
                            </div>
                            <div className={`text-sm font-medium ${
                              Math.abs(totalWeighting - 100) < 0.01
                                ? 'text-green-600' 
                                : totalWeighting > 100
                                  ? 'text-red-600'
                                  : 'text-gray-600'
                            }`}>
                              Total: {totalWeighting.toFixed(2)}%
                              {selectedFunds.length > 0 && Math.abs(totalWeighting - 100) > 0.01 && 
                                <span className="ml-2 text-xs">(Must equal 100%)</span>
                              }
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Available Funds Section - Right Side */}
                      <div className="space-y-2">
                        {/* Available Funds Header */}
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium text-gray-700">
                            Available Funds
                          </h4>
                        </div>
                        
                        {/* Fund Search */}
                        <BaseInput
                          placeholder="Search funds by name or ISIN..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          size="sm"
                          fullWidth
                          leftIcon={
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                          }
                          rightIcon={searchQuery && (
                            <button
                              type="button"
                              className="text-gray-400 hover:text-gray-600 focus:outline-none"
                              onClick={() => setSearchQuery('')}
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                        />
                        
                        {/* Available Fund List */}
                        <div className="h-[500px] sm:h-[600px] lg:h-[700px] xl:h-[800px] overflow-y-auto border rounded p-2 bg-gray-50">
                          {filteredFunds.length === 0 ? (
                            <div className="text-sm text-gray-500 text-center py-8">
                              <div className="mx-auto w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mb-3">
                                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                              </div>
                              <p className="font-medium">No funds found</p>
                              <p className="text-xs">Try adjusting your search terms</p>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              {filteredFunds.map(fund => (
                                <div 
                                  key={`available-${fund.id}`} 
                                  className={`flex items-center space-x-3 p-2 rounded cursor-pointer transition-colors ${
                                    selectedFunds.includes(fund.id)
                                      ? 'bg-primary-50 border border-primary-200'
                                      : 'hover:bg-white border border-transparent'
                                  }`}
                                  onClick={() => handleFundSelection(fund.id)}
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedFunds.includes(fund.id)}
                                    onChange={() => handleFundSelection(fund.id)}
                                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-gray-900 truncate" title={fund.fund_name}>
                                      {fund.fund_name}
                                    </div>
                                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                                      {fund.isin_number && (
                                        <span title={fund.isin_number} className="truncate">
                                          {fund.isin_number}
                                        </span>
                                      )}
                                      {fund.risk_factor !== undefined && fund.risk_factor !== null && (
                                        <span className="flex items-center">
                                          Risk: {fund.risk_factor}
                                          <span className={`ml-1 w-2 h-2 rounded-full ${
                                            fund.risk_factor <= 2 ? 'bg-green-500' : 
                                            fund.risk_factor <= 4 ? 'bg-blue-500' : 
                                            fund.risk_factor <= 6 ? 'bg-yellow-500' : 
                                            'bg-red-500'
                                          }`}></span>
                                        </span>
                                      )}
                                      <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                                        fund.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                      }`}>
                                        {fund.status}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
            <Link to="/definitions?tab=portfolios">
              <ActionButton
                variant="cancel"
                size="md"
              />
            </Link>
            <ActionButton
              variant="save"
              size="md"
              context="Template"
              design="descriptive"
              type="submit"
              disabled={isSubmitting}
              loading={isSubmitting}
            />
          </div>
        </form>
      </div>
    </DynamicPageContainer>
  );
};

export default AddPortfolioTemplate;
