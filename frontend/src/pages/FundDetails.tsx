import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface Provider {
  id: number;
  name: string;
}

interface Portfolio {
  id: number;
  name: string;
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
  provider_id?: number | null;
  portfolio_id?: number | null;
}

const FundDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { portfolioId } = useParams<{ portfolioId: string }>();
  const navigate = useNavigate();
  const { api } = useAuth();
  const [fund, setFund] = useState<Fund | null>(null);
  const [provider, setProvider] = useState<Provider | null>(null);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [linkedPortfolios, setLinkedPortfolios] = useState<Portfolio[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Fund>>({});
  const [originalFormData, setOriginalFormData] = useState<Partial<Fund>>({});
  const [providerName, setProviderName] = useState<string>('');
  const [portfolioName, setPortfolioName] = useState<string>('');

  const fetchFundDetails = async () => {
    try {
      if (!id || id === 'undefined') {
        setError('Invalid fund ID');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const response = await api.get(`/funds/${id}`, {
        params: { portfolio_id: portfolioId }
      });
      setFund(response.data);
      
      // If we have a provider_id from the portfolio context, fetch provider details
      if (response.data.provider_id) {
        try {
          const providerResponse = await api.get(`/available_providers/${response.data.provider_id}`);
          setProvider(providerResponse.data);
        } catch (err) {
          console.error('Error fetching provider details:', err);
        }
      }
      
      setIsLoading(false);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch fund details');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFundDetails();
    fetchPortfolios();
    if (id) {
      fetchLinkedPortfolios(parseInt(id));
    }
  }, [id, portfolioId, api]);

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
      // Find all portfolio templates that use this fund
      const portfolioFundsResponse = await api.get('/available_portfolio_funds', {
        params: { fund_id: fundId }
      });
      
      if (portfolioFundsResponse.data && portfolioFundsResponse.data.length > 0) {
        const portfolioIds = portfolioFundsResponse.data.map((pf: any) => pf.portfolio_id);
        
        // Get portfolio details for each linked portfolio
        const linkedPortfoliosData = portfolios.filter(p => portfolioIds.includes(p.id));
        setLinkedPortfolios(linkedPortfoliosData);
      }
    } catch (err: any) {
      console.error('Error fetching linked portfolios:', err);
    }
  };

  useEffect(() => {
    if (fund && portfolios.length > 0 && fund.portfolio_id) {
      const portfolio = portfolios.find(p => p.id === fund.portfolio_id);
      if (portfolio) {
        setPortfolioName(portfolio.name);
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
      provider_id: fund.provider_id,
      fund_name: fund.fund_name,
      isin_number: fund.isin_number,
      risk_factor: fund.risk_factor,
      fund_cost: fund.fund_cost,
      portfolio_id: fund.portfolio_id
    });
    
    setFormData({
      provider_id: fund.provider_id,
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

    // Validate risk factor is between 0 and 7
    if (formData.risk_factor !== undefined && 
        formData.risk_factor !== null && 
        (formData.risk_factor < 0 || formData.risk_factor > 7)) {
      setError('Risk factor must be between 0 and 7');
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
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border-l-4 border-red-500 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        </div>
        <div className="mt-4">
          <button
            onClick={handleBack}
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
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
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-yellow-700">Fund not found</p>
            </div>
          </div>
        </div>
        <div className="mt-4">
          <button
            onClick={handleBack}
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Back to Funds
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header with back button */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <button
            onClick={handleBack}
            className="inline-flex items-center text-sm text-gray-600 hover:text-indigo-600 mb-2"
          >
            <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Funds
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{fund.fund_name}</h1>
          <p className="text-sm text-gray-500">ISIN: {fund.isin_number}</p>
        </div>
        
        {/* Action buttons */}
        <div className="flex space-x-3">
          {!isEditing && (
            <>
              <button
                onClick={handleEdit}
                className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Edit
              </button>
              <button
                onClick={handleDelete}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      {isEditing ? (
        // Edit form
        <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6">
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
                className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
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
                className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label htmlFor="risk_factor" className="block text-sm font-medium text-gray-700">
                Risk Factor (0-7)
              </label>
              <input
                type="number"
                name="risk_factor"
                id="risk_factor"
                min="0"
                max="7"
                step="1"
                value={formData.risk_factor !== null && formData.risk_factor !== undefined ? formData.risk_factor : ''}
                onChange={handleChange}
                className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
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
                className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
              />
            </div>
            
            <div className="sm:col-span-2 flex justify-end space-x-3 mt-4">
              <button
                type="button"
                onClick={handleCancelEdit}
                className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveChanges}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      ) : (
        // View mode
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="border-t border-gray-200">
            <dl>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Fund Name</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{fund.fund_name}</dd>
              </div>
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">ISIN Number</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{fund.isin_number}</dd>
              </div>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Risk Factor</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {fund.risk_factor !== null ? fund.risk_factor : 'Not set'}
                </dd>
              </div>
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Fund Cost</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {fund.fund_cost !== null ? `${fund.fund_cost}%` : 'Not set'}
                </dd>
              </div>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="mt-1 text-sm sm:mt-0 sm:col-span-2">
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    fund.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {fund.status}
                  </span>
                  
                  {/* Status change buttons */}
                  <div className="mt-2">
                    {fund.status === 'active' ? (
                      <button
                        onClick={() => handleChangeStatus('inactive')}
                        className="text-xs text-red-600 hover:text-red-900 underline"
                      >
                        Set as Inactive
                      </button>
                    ) : (
                      <button
                        onClick={() => handleChangeStatus('active')}
                        className="text-xs text-green-600 hover:text-green-900 underline"
                      >
                        Set as Active
                      </button>
                    )}
                  </div>
                </dd>
              </div>
              {provider && (
                <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Provider</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {provider.name}
                  </dd>
                </div>
              )}
              
              {linkedPortfolios.length > 0 && (
                <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Used in Portfolio Templates</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    <ul className="border border-gray-200 rounded-md divide-y divide-gray-200">
                      {linkedPortfolios.map(portfolio => (
                        <li key={portfolio.id} className="pl-3 pr-4 py-3 flex items-center justify-between text-sm">
                          <div className="w-0 flex-1 flex items-center">
                            <span className="ml-2 flex-1 w-0 truncate">{portfolio.name}</span>
                          </div>
                          <div className="ml-4 flex-shrink-0">
                            <a 
                              href={`/definitions/portfolio-templates/${portfolio.id}`} 
                              className="font-medium text-indigo-600 hover:text-indigo-500"
                            >
                              View
                            </a>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </dd>
                </div>
              )}
              
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Created At</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {new Date(fund.created_at).toLocaleString()}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      )}
    </div>
  );
};

export default FundDetails;
