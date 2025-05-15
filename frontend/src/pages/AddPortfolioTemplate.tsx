import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

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
    status: 'active'
  });
  const [availableFunds, setAvailableFunds] = useState<Fund[]>([]);
  const [selectedFunds, setSelectedFunds] = useState<number[]>([]);
  const [fundWeightings, setFundWeightings] = useState<Record<string, number>>({});
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
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch funds');
      console.error('Error fetching funds:', err);
    } finally {
      setIsLoadingFunds(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFundSelection = (fundId: number) => {
    setSelectedFunds(prev => {
      if (prev.includes(fundId)) {
        const newSelected = prev.filter(id => id !== fundId);
        // Remove weighting for unselected fund
        const newWeightings = { ...fundWeightings };
        delete newWeightings[fundId.toString()];
        setFundWeightings(newWeightings);
        return newSelected;
      } else {
        // Set empty weighting (0) for newly selected fund instead of default 0
        setFundWeightings(prev => ({
          ...prev,
          [fundId.toString()]: 0
        }));
        return [...prev, fundId];
      }
    });
  };

  const handleWeightingChange = (fundId: number, weighting: number) => {
    setFundWeightings(prev => ({
      ...prev,
      [fundId.toString()]: weighting
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
          target_weighting: fundWeightings[fundId.toString()] || 0
        }));
        
        // Create the portfolio template
        const portfolioResponse = await api.post('/available_portfolios', {
          name: formData.name,
          funds: fundsData
        });
        
        navigate('/definitions?tab=portfolios');
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
    const totalWeighting = Object.values(fundWeightings).reduce((a, b) => a + b, 0);
    
    // Check if total weighting equals 100%
    if (Math.abs(totalWeighting - 100) > 0.01) {
      setError(`Total fund weighting must equal 100%. Current total: ${totalWeighting.toFixed(2)}%`);
      return false;
    }
    
    return true;
  };

  // Calculate total weighting for the progress bar
  const totalWeighting = useMemo(() => {
    return Object.values(fundWeightings).reduce((a, b) => a + b, 0);
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
        <Link
          to="/definitions?tab=portfolios"
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          <svg className="-ml-1 mr-2 h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Back
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
            <div className="flex flex-col md:flex-row gap-4 md:items-end">
              <div className="flex-1">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Template Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                placeholder="e.g., Conservative ISA Template"
              />
            </div>
              <div className="w-full md:w-1/4">
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                required
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Define a new portfolio template by selecting funds and setting their target weightings. The total weighting must equal 100%.
            </p>
          </div>

          <div className="p-5">
          {/* Fund Selection Section */}
            <div className="rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 sm:px-6 flex justify-between items-center">
                <h3 className="text-base font-medium text-gray-900">Select Funds</h3>
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
                          No funds available. Please add funds before creating a portfolio template.
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
                          {filteredFunds.map((fund) => (
                            <tr 
                              key={fund.id} 
                              className={`hover:bg-indigo-50 transition-colors duration-150 cursor-pointer border-b border-gray-100 ${selectedFunds.includes(fund.id) ? 'bg-blue-50' : ''}`}
                              onClick={() => handleFundSelection(fund.id)}
                            >
                              <td className="px-6 py-3 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={selectedFunds.includes(fund.id)}
                                  onChange={() => {}} // Handled by row click
                                  onClick={(e) => e.stopPropagation()} // Prevent double triggers
                                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                            />
                          </td>
                              <td className="px-6 py-3 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-800 font-sans tracking-tight">{fund.fund_name}</div>
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
                            {selectedFunds.includes(fund.id) && (
                                  <div className="flex items-center">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                      step="0.1"
                                      value={fundWeightings[fund.id.toString()] === 0 ? '' : fundWeightings[fund.id.toString()]}
                                onChange={(e) => handleWeightingChange(
                                  fund.id,
                                  parseFloat(e.target.value) || 0
                                )}
                                      placeholder="Enter %"
                                      className="w-20 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                              />
                                    <span className="ml-2 text-gray-500">%</span>
                                  </div>
                            )}
                          </td>
                        </tr>
                      ))}
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
              to="/definitions?tab=portfolios"
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
                  Saving...
                </span>
              ) : (
                'Save Template'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddPortfolioTemplate;
