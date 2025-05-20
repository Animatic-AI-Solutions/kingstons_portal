import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface Portfolio {
  id: number;
  created_at: string;
  name: string | null;
}

interface PortfolioFund {
  id: number;
  portfolio_id: number;
  available_funds_id: number;
  weighting: number;
}

interface Fund {
  id: number;
  fund_name: string;
  isin_number: string;
  risk_factor: number | null;
  fund_cost: number | null;
  status: string;
  created_at: string;
  portfolio_id?: number | null;
}

interface ProductWithOwner {
  product_id: number;
  product_name: string;
  product_type: string;
  product_status: string;
  product_owner_name: string;
  portfolio_name: string;
  weighting: number;
  start_date: string;
}

interface PortfolioFundWithRelations {
  id: number;
  weighting: number;
  portfolio: {
    id: number;
    portfolio_name: string;
    client_products: Array<{
      id: number;
      product_name: string;
      product_type: string;
      status: string;
      start_date: string;
      product_owner_products: Array<{
        product_owners: {
          id: number;
          name: string;
        } | null;
      }>;
    }>;
  };
}

const FundDetails: React.FC = () => {
  const { fundId: id } = useParams<{ fundId: string }>();
  const { portfolioId } = useParams<{ portfolioId: string }>();
  const navigate = useNavigate();
  const { api } = useAuth();
  const [fund, setFund] = useState<Fund | null>(null);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [linkedPortfolios, setLinkedPortfolios] = useState<Portfolio[]>([]);
  const [productsWithOwners, setProductsWithOwners] = useState<ProductWithOwner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Fund>>({});
  const [originalFormData, setOriginalFormData] = useState<Partial<Fund>>({});
  const [portfolioName, setPortfolioName] = useState<string>('');

  const fetchFundDetails = async () => {
    try {
      // Validate the ID parameter
      if (!id || id === 'undefined') {
        setError('Invalid fund ID: parameter is missing or undefined');
        setIsLoading(false);
        return;
      }
      
      // Convert to numeric ID and verify
      const numericId = parseInt(id, 10);
      
      if (isNaN(numericId)) {
        setError(`Invalid fund ID: ${id} is not a valid number`);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      
      try {
        const response = await api.get(`/funds/${numericId}`, {
          params: { portfolio_id: portfolioId }
        });
        
        setFund(response.data);
        setIsLoading(false);
      } catch (apiError: any) {
        let errorMessage = 'Failed to fetch fund details';
        if (apiError.response?.data?.detail) {
          errorMessage = apiError.response.data.detail;
        } else if (apiError.message) {
          errorMessage = apiError.message;
        }
        
        setError(errorMessage);
        setIsLoading(false);
      }
    } catch (err: any) {
      setError('An unexpected error occurred while loading fund details');
      setIsLoading(false);
    }
  };

  const fetchPortfolios = async () => {
    try {
      const response = await api.get('/available_portfolios');
      setPortfolios(response.data);
    } catch (err: any) {
      console.error('Error fetching portfolios:', err);
    }
  };

  const fetchLinkedPortfolios = async (fundId: number) => {
    try {
      // Ensure fundId is a number
      const numericFundId = Number(fundId);
      if (isNaN(numericFundId)) {
        return;
      }
      
      try {
        // Use the path parameter endpoint
        const portfolioFundsResponse = await api.get(`/available_portfolios/available_portfolio_funds/by-fund/${numericFundId}`);
        
        if (portfolioFundsResponse.data && portfolioFundsResponse.data.length > 0) {
          const portfolioIds = portfolioFundsResponse.data.map((pf: any) => pf.portfolio_id);
          
          // Get portfolio details for each linked portfolio
          const linkedPortfoliosData = portfolios.filter(p => portfolioIds.includes(p.id));
          setLinkedPortfolios(linkedPortfoliosData);
        } else {
          setLinkedPortfolios([]);
        }
      } catch (apiError: any) {
        // Gracefully handle the error - don't show linked portfolios section
        setLinkedPortfolios([]);
      }
    } catch (err: any) {
      // Clear linked portfolios on error
      setLinkedPortfolios([]);
    }
  };

  const fetchProductsWithOwners = async (fundId: number) => {
    try {
      // Use the correct API endpoint from our services
      const response = await api.get(`funds/${fundId}/products-with-owners`);
      
      if (response.data) {
        // Transform the data to match our ProductWithOwner interface
        const transformedData: ProductWithOwner[] = response.data.map((item: any) => ({
          product_id: item.product_id,
          product_name: item.product_name,
          product_type: item.product_type,
          product_status: item.status,
          product_owner_name: item.product_owner_name || 'No Owner',
          portfolio_name: item.portfolio_name,
          weighting: item.weighting || 0,
          start_date: item.start_date,
        }));
        setProductsWithOwners(transformedData);
      }
    } catch (err) {
      console.error('Error fetching products with owners:', err);
    }
  };

  useEffect(() => {
    if (id) {
      fetchFundDetails();
      fetchPortfolios();
    }
  }, [id, portfolioId, api]);

  useEffect(() => {
    if (id && portfolios.length > 0) {
      fetchLinkedPortfolios(parseInt(id));
      fetchProductsWithOwners(parseInt(id));
    }
  }, [id, portfolios]);

  useEffect(() => {
    if (fund && portfolios.length > 0 && fund.portfolio_id) {
      const portfolio = portfolios.find(p => p.id === fund.portfolio_id);
      if (portfolio) {
        setPortfolioName(portfolio.name || '');
      }
    }
  }, [fund, portfolios]);

  const handleBack = () => {
    navigate('/definitions?tab=funds');
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this fund? This action cannot be undone.')) {
      return;
    }

    try {
      await api.delete(`/funds/${id}`);
      alert('Fund deleted successfully');
      navigate('/definitions?tab=funds');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete fund');
      console.error('Error deleting fund:', err);
    }
  };

  const handleChangeStatus = async (newStatus: string) => {
    if (!fund) return;

    const confirmMessage = `Are you sure you want to change the fund status to ${newStatus}?`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      await api.patch(`/funds/${id}`, { status: newStatus });
      await fetchFundDetails();
    } catch (err: any) {
      setError(err.response?.data?.detail || `Failed to change fund status to ${newStatus}`);
      console.error(`Error changing fund status:`, err);
    }
  };

  const handleEdit = () => {
    if (!fund) return;
    
    setOriginalFormData({
      fund_name: fund.fund_name,
      isin_number: fund.isin_number,
      risk_factor: fund.risk_factor,
      fund_cost: fund.fund_cost,
      portfolio_id: fund.portfolio_id
    });
    
    setFormData({
      fund_name: fund.fund_name,
      isin_number: fund.isin_number,
      risk_factor: fund.risk_factor,
      fund_cost: fund.fund_cost,
      portfolio_id: fund.portfolio_id
    });
    
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setFormData({});
  };

  const handleSaveChanges = async () => {
    if (!fund) return;

    // Check if any changes were made
    const hasChanges = Object.keys(formData).some(key => {
      const formValue = formData[key as keyof typeof formData];
      const originalValue = originalFormData[key as keyof typeof originalFormData];
      return formValue !== originalValue;
    });

    if (!hasChanges) {
      // No changes were made, just exit edit mode
      setIsEditing(false);
      setFormData({});
      return;
    }

    // Validate risk factor is between 1 and 7
    if (formData.risk_factor !== undefined && 
        formData.risk_factor !== null && 
        (formData.risk_factor < 1 || formData.risk_factor > 7)) {
      setError('Risk factor must be between 1 and 7');
      return;
    }

    try {
      await api.patch(`/funds/${id}`, formData);
      await fetchFundDetails();
      setIsEditing(false);
      setFormData({});
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update fund');
      console.error('Error updating fund:', err);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (name === 'provider_id' || name === 'portfolio_id') {
      setFormData(prev => ({
        ...prev,
        [name]: value === '' ? null : Number(value)
      }));
    } else if (name === 'risk_factor') {
      setFormData(prev => ({
        ...prev,
        [name]: value === '' ? null : Number(value)
      }));
    } else if (name === 'fund_cost') {
      setFormData(prev => ({
        ...prev,
        [name]: value === '' ? null : parseFloat(value)
      }));
    } else if (type === 'checkbox') {
      const target = e.target as HTMLInputElement;
      setFormData(prev => ({
        ...prev,
        [name]: target.checked
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-md shadow-sm">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-red-700 font-medium">{error}</p>
            </div>
          </div>
        </div>
        <div className="mt-4">
          <button
            onClick={handleBack}
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
          >
            Back to Funds
          </button>
        </div>
      </div>
    );
  }

  if (!fund) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-6 rounded-md shadow-sm">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-yellow-700 font-medium">Fund not found</p>
            </div>
          </div>
        </div>
        <div className="mt-4">
          <button
            onClick={handleBack}
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
          >
            Back to Funds
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header with back button */}
      <div className="mb-8">
        <button
          onClick={handleBack}
          className="inline-flex items-center text-sm text-gray-600 hover:text-indigo-600 mb-4 transition-colors"
        >
          <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Funds
        </button>
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-200 pb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{fund.fund_name}</h1>
            <div className="flex flex-wrap items-center gap-4">
              <span className="inline-flex items-center text-sm text-gray-500 bg-gray-100 px-2.5 py-1 rounded-md">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                </svg>
                ISIN: {fund.isin_number}
              </span>
              <span className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full ${
                fund.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {fund.status.charAt(0).toUpperCase() + fund.status.slice(1)}
              </span>
              {fund.risk_factor && (
                <span className="inline-flex items-center text-sm bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Risk: {fund.risk_factor}/7
                </span>
              )}
              {fund.fund_cost !== null && (
                <span className="inline-flex items-center text-sm bg-amber-50 text-amber-700 px-2.5 py-1 rounded-md">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Cost: {fund.fund_cost}%
                </span>
              )}
            </div>
          </div>
          
          {/* Action buttons */}
          <div className="flex space-x-3 mt-4 sm:mt-0">
            {!isEditing && (
              <>
                <button
                  onClick={handleEdit}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                >
                  <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                >
                  <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {isEditing ? (
        // Edit form with improved styling
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Edit Fund Details</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="fund_name" className="block text-sm font-medium text-gray-700">
                  Fund Name
                </label>
                <input
                  type="text"
                  name="fund_name"
                  id="fund_name"
                  value={formData.fund_name || ''}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="isin_number" className="block text-sm font-medium text-gray-700">
                  ISIN Number
                </label>
                <input
                  type="text"
                  name="isin_number"
                  id="isin_number"
                  value={formData.isin_number || ''}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="risk_factor" className="block text-sm font-medium text-gray-700">
                  Risk Factor (1-7)
                </label>
                <input
                  type="number"
                  name="risk_factor"
                  id="risk_factor"
                  min="1"
                  max="7"
                  step="1"
                  value={formData.risk_factor !== null && formData.risk_factor !== undefined ? formData.risk_factor : ''}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="fund_cost" className="block text-sm font-medium text-gray-700">
                  Fund Cost (%)
                </label>
                <input
                  type="number"
                  name="fund_cost"
                  id="fund_cost"
                  min="0"
                  step="0.01"
                  value={formData.fund_cost !== null && formData.fund_cost !== undefined ? formData.fund_cost : ''}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                type="button"
                onClick={handleCancelEdit}
                className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveChanges}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      ) : (
        // View mode with improved styling
        <div className="space-y-8">
          {/* Fund Details Card */}
          <div className="bg-white shadow-lg rounded-lg overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Fund Details</h2>
              {fund.status === 'active' ? (
                <button
                  onClick={() => handleChangeStatus('inactive')}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                  Set as Inactive
                </button>
              ) : (
                <button
                  onClick={() => handleChangeStatus('active')}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Set as Active
                </button>
              )}
            </div>
            
            <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <div className="text-sm font-medium text-gray-500">Fund Name</div>
                <div className="mt-1 text-base text-gray-900 font-medium">{fund.fund_name}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500">ISIN Number</div>
                <div className="mt-1 text-base text-gray-900 font-medium">{fund.isin_number}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500">Risk Factor</div>
                <div className="mt-1 text-base text-gray-900">
                  {fund.risk_factor !== null ? (
                    <div className="flex items-center">
                      <span className="text-base font-medium">{fund.risk_factor}</span>
                      <span className="ml-2 text-xs text-gray-500">(out of 7)</span>
                      <div className="ml-2 flex space-x-0.5">
                        {[...Array(7)].map((_, i) => (
                          <div 
                            key={i} 
                            className={`h-1.5 w-1.5 rounded-full ${
                              i < (fund.risk_factor || 0) 
                                ? 'bg-indigo-600' 
                                : 'bg-gray-200'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <span className="text-gray-500 italic">Not set</span>
                  )}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500">Fund Cost</div>
                <div className="mt-1 text-base text-gray-900">
                  {fund.fund_cost !== null ? (
                    <span className="font-medium">{fund.fund_cost}%</span>
                  ) : (
                    <span className="text-gray-500 italic">Not set</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Products Table */}
          <div className="bg-white shadow-lg rounded-lg overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Products Using This Fund</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr className="bg-gray-50">
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Owner
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Portfolio
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Weighting
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Start Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {productsWithOwners.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-sm text-gray-500 bg-gray-50 italic">
                        No products are currently using this fund
                      </td>
                    </tr>
                  ) : (
                    productsWithOwners.map((product) => (
                      <tr key={product.product_id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <a 
                            href={`/definitions/products/${product.product_id}`}
                            className="text-sm font-medium text-indigo-600 hover:text-indigo-900 hover:underline transition-colors"
                          >
                            {product.product_name}
                          </a>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 mr-3">
                              {product.product_owner_name.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </div>
                            <span className="text-sm text-gray-900">{product.product_owner_name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {product.portfolio_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm px-2.5 py-1 rounded-md bg-blue-50 text-blue-700">
                            {product.product_type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div 
                              className="bg-indigo-600 h-2.5 rounded-full" 
                              style={{ width: `${Math.min(product.weighting * 100, 100)}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-gray-500 mt-1 block">{product.weighting}%</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(product.start_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            product.product_status === 'active' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {product.product_status.charAt(0).toUpperCase() + product.product_status.slice(1)}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Created At Info */}
          <div className="text-sm text-gray-500 text-right">
            Created: {new Date(fund.created_at).toLocaleString()}
          </div>
        </div>
      )}
    </div>
  );
};

export default FundDetails;
