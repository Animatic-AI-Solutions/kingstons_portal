import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import FilterDropdown from '../components/ui/FilterDropdown';

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
  
  // Filter states
  const [selectedOwners, setSelectedOwners] = useState<(string | number)[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<(string | number)[]>([]);

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

  // Generate filter options
  const ownerOptions = Array.from(new Set(productsWithOwners.map(p => p.product_owner_name)))
    .map(owner => ({ value: owner, label: owner }));
  
  const typeOptions = Array.from(new Set(productsWithOwners.map(p => p.product_type)))
    .map(type => ({ value: type, label: type }));

  // Filter products based on selected filters
  const filteredProducts = productsWithOwners.filter(product => {
    const ownerMatch = selectedOwners.length === 0 || selectedOwners.includes(product.product_owner_name);
    const typeMatch = selectedTypes.length === 0 || selectedTypes.includes(product.product_type);
    return ownerMatch && typeMatch;
  });

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
    try {
      // Validate fund name length
      if (formData.fund_name && formData.fund_name.length > 30) {
        setError('Fund name must be 30 characters or less');
        return;
      }

      // Validate risk factor if provided
      if (formData.risk_factor !== undefined && formData.risk_factor !== null) {
        if (formData.risk_factor < 1 || formData.risk_factor > 7) {
          setError('Risk factor must be between 1 and 7');
          return;
        }
      }

      const response = await api.put(`/funds/${fund?.id}`, formData);
      
      if (response.data) {
        setFund(response.data);
        setIsEditing(false);
        setFormData({});
        setOriginalFormData({});
        setError(null);
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Failed to update fund';
      setError(errorMessage);
      console.error('Error updating fund:', err);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Apply character limit for fund_name
    if (name === 'fund_name' && value.length > 30) {
      return; // Don't update if exceeding 30 characters
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // CSV Export function
  const exportToCSV = () => {
    if (productsWithOwners.length === 0) {
      alert('No data to export');
      return;
    }

    // Define the CSV headers
    const headers = [
      'Product Name',
      'Product Owner',
      'Portfolio',
      'Product Type',
      'Weighting (%)',
      'Start Date',
      'Status'
    ];

    // Convert data to CSV format
    const csvData = filteredProducts.map(product => [
      product.product_name,
      product.product_owner_name,
      product.portfolio_name,
      product.product_type,
      product.weighting.toString(),
      new Date(product.start_date).toLocaleDateString(),
      product.product_status
    ]);

    // Combine headers and data
    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field.replace(/"/g, '""')}"`).join(','))
      .join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      
      // Create filename with fund name and current date
      const fundName = fund?.fund_name || 'fund';
      const date = new Date().toISOString().split('T')[0];
      link.setAttribute('download', `${fundName}_products_${date}.csv`);
      
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 lg:px-8 py-4">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 lg:px-8 py-4">
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
      <div className="container mx-auto px-4 lg:px-8 py-4">
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
    <div className="w-full min-h-screen mx-auto px-4 lg:px-8 py-4">

      
      {/* Breadcrumbs */}
      <nav className="mb-4 flex" aria-label="Breadcrumb">
        <ol className="inline-flex items-center space-x-1 md:space-x-3">
          <li className="inline-flex items-center">
            <button
              onClick={handleBack}
              className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-primary-700"
            >
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"></path>
              </svg>
              Funds
            </button>
            <svg className="w-6 h-6 text-gray-400 ml-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"></path>
            </svg>
          </li>
          <li aria-current="page">
            <div className="flex items-center">
              <span className="ml-1 text-sm font-medium text-primary-700 md:ml-2">{fund ? fund.fund_name : 'Fund Details'}</span>
            </div>
          </li>
        </ol>
      </nav>

      {/* Header Card */}
      <div className="bg-white shadow-sm rounded-lg border-2 border-purple-500 mb-4">
        <div className="px-6 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <div className="flex items-start space-x-4">
              {/* Fund Icon */}
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">{fund.fund_name}</h1>
              </div>
            </div>
            
            {/* Action buttons */}
            <div className="flex space-x-2 mt-4 sm:mt-0">
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
      </div>

      {/* Priority Stats with Inline Editing */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        {/* Fund Name Card */}
        <div className={`bg-white shadow-sm rounded-lg border p-4 ${isEditing ? 'border-indigo-300 ring-1 ring-indigo-300' : 'border-gray-100'}`}>
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Fund Name</div>
          <div className="mt-1">
            {isEditing ? (
              <div>
                <input
                  type="text"
                  name="fund_name"
                  value={formData.fund_name || ''}
                  onChange={handleChange}
                  maxLength={30}
                  className="block w-full text-lg font-semibold border-0 p-0 focus:ring-0 focus:border-0 bg-transparent"
                  placeholder="Enter fund name"
                />
                <div className="text-xs text-gray-400 mt-1">
                  {(formData.fund_name || '').length}/30 characters
                </div>
              </div>
            ) : (
              <div className="text-lg font-semibold text-gray-900">{fund.fund_name}</div>
            )}
          </div>
        </div>

        {/* ISIN Number Card */}
        <div className={`bg-white shadow-sm rounded-lg border p-4 ${isEditing ? 'border-indigo-300 ring-1 ring-indigo-300' : 'border-gray-100'}`}>
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">ISIN Number</div>
          <div className="mt-1">
            {isEditing ? (
              <input
                type="text"
                name="isin_number"
                value={formData.isin_number || ''}
                onChange={handleChange}
                className="block w-full text-lg font-semibold border-0 p-0 focus:ring-0 focus:border-0 bg-transparent"
                placeholder="Enter ISIN number"
              />
            ) : (
              <div className="text-lg font-semibold text-gray-900">{fund.isin_number}</div>
            )}
          </div>
        </div>

        {/* Risk Factor Card */}
        <div className={`bg-white shadow-sm rounded-lg border p-4 ${isEditing ? 'border-indigo-300 ring-1 ring-indigo-300' : 'border-gray-100'}`}>
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Risk Factor</div>
          <div className="mt-1">
            {isEditing ? (
              <input
                type="number"
                name="risk_factor"
                min="1"
                max="7"
                step="1"
                value={formData.risk_factor !== null && formData.risk_factor !== undefined ? formData.risk_factor : ''}
                onChange={handleChange}
                className="block w-full text-lg font-semibold border-0 p-0 focus:ring-0 focus:border-0 bg-transparent"
                placeholder="1-7"
              />
            ) : (
              <div className="text-lg font-semibold text-gray-900">
                {fund.risk_factor !== null ? (
                  <div className="flex items-center">
                    <span>{fund.risk_factor}</span>
                    <span className="ml-1 text-xs text-gray-500">/7</span>
                    <div className="ml-2 flex space-x-0.5">
                      {[...Array(7)].map((_, i) => (
                        <div 
                          key={i} 
                          className={`h-1.5 w-1.5 rounded-full ${
                            i < (fund.risk_factor || 0) 
                              ? 'bg-purple-600' 
                              : 'bg-gray-200'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <span className="text-gray-400 text-sm italic">Not set</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Fund Cost Card */}
        <div className={`bg-white shadow-sm rounded-lg border p-4 ${isEditing ? 'border-indigo-300 ring-1 ring-indigo-300' : 'border-gray-100'}`}>
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Fund Cost</div>
          <div className="mt-1">
            {isEditing ? (
              <div className="flex items-center">
                <input
                  type="number"
                  name="fund_cost"
                  min="0"
                  step="0.01"
                  value={formData.fund_cost !== null && formData.fund_cost !== undefined ? formData.fund_cost : ''}
                  onChange={handleChange}
                  className="block w-full text-lg font-semibold border-0 p-0 focus:ring-0 focus:border-0 bg-transparent"
                  placeholder="0.00"
                />
                <span className="text-lg font-semibold text-gray-900 ml-1">%</span>
              </div>
            ) : (
              <div className="text-lg font-semibold text-gray-900">
                {fund.fund_cost !== null ? (
                  <span>{fund.fund_cost}%</span>
                ) : (
                  <span className="text-gray-400 text-sm italic">Not set</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Save/Cancel buttons when editing */}
      {isEditing && (
        <div className="mb-4 flex justify-end space-x-3">
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
      )}

      {/* Products Table */}
      <div className="space-y-4">
          <div className="bg-white shadow-sm rounded-lg border border-gray-100">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Products Using This Fund</h2>
              {filteredProducts.length > 0 && (
                <button
                  onClick={exportToCSV}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                >
                  <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export CSV
                </button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300">
                      <div className="flex flex-col gap-2">
                        <span>Owners</span>
                        <FilterDropdown
                          id="owner-filter"
                          options={ownerOptions}
                          value={selectedOwners}
                          onChange={setSelectedOwners}
                          placeholder="All Owners"
                          className="w-full"
                        />
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300">
                      <div className="flex flex-col gap-2">
                        <span>Type</span>
                        <FilterDropdown
                          id="type-filter"
                          options={typeOptions}
                          value={selectedTypes}
                          onChange={setSelectedTypes}
                          placeholder="All Types"
                          className="w-full"
                        />
                      </div>
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300">
                      Weighting
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300">
                      Start Date
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6">
                        <div className="text-center text-sm text-gray-500 italic">
                          {productsWithOwners.length === 0 
                            ? "No products are currently using this fund"
                            : "No products match the selected filters"
                          }
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((product) => (
                      <tr key={product.product_id} className="hover:bg-indigo-50 transition-colors duration-150 cursor-pointer border-b border-gray-100">
                        <td className="px-6 py-3 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-800 font-sans tracking-tight">{product.product_name}</div>
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap">
                          <span className="text-sm text-gray-600 font-sans">{product.product_owner_name}</span>
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap">
                          <span className="text-sm text-gray-600 font-sans">{product.product_type}</span>
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap">
                          <div className="text-sm text-gray-600 font-sans">{product.weighting}%</div>
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap">
                          <div className="text-sm text-gray-600 font-sans">
                            {new Date(product.start_date).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            product.product_status === 'active' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {product.product_status}
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
          <div className="text-xs text-gray-500 text-right">
            Created: {new Date(fund.created_at).toLocaleString()}
          </div>
        </div>
    </div>
  );
};

export default FundDetails;
