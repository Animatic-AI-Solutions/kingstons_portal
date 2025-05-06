import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface Provider {
  id: number;
  name: string;
}

interface Product {
  id: number;
  name: string;
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
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Fund>>({});
  const [originalFormData, setOriginalFormData] = useState<Partial<Fund>>({});
  const [providerName, setProviderName] = useState<string>('');
  const [productName, setProductName] = useState<string>('');

  const fetchFundDetails = async () => {
    try {
      setIsLoading(true);
      const response = await api.get(`/funds/${id}`, {
        params: { portfolio_id: portfolioId }
      });
      setFund(response.data);
      
      // If we have a provider_id from the portfolio context, fetch provider details
      if (response.data.provider_id) {
        const providerResponse = await api.get(`/providers/${response.data.provider_id}`);
        setProvider(providerResponse.data);
      }
      
      setIsLoading(false);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch fund details');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFundDetails();
    fetchProducts();
  }, [id, portfolioId, api]);

  const fetchProducts = async () => {
    try {
      const response = await api.get('/available_products');
      setProducts(response.data);
    } catch (err: any) {
      console.error('Error fetching products:', err);
    }
  };

  useEffect(() => {
    if (fund && products.length > 0 && fund.portfolio_id) {
      const product = products.find(p => p.id === fund.portfolio_id);
      if (product) {
        setProductName(product.name);
      }
    }
  }, [fund, products]);

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
              <p className="text-yellow-700">Fund not found.</p>
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          <button onClick={handleBack} className="text-indigo-600 mr-2 inline-flex items-center">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="ml-1">Back to Funds</span>
          </button>
        </h1>
        <div className="flex space-x-4">
          {!isEditing && (
            <>
              <button
                onClick={handleEdit}
                className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                Edit
              </button>
              <button
                onClick={handleDelete}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                Delete
              </button>
              {fund.status === 'active' && (
                <button
                  onClick={() => handleChangeStatus('dormant')}
                  className="bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2"
                >
                  Set Dormant
                </button>
              )}
              {fund.status === 'dormant' && (
                <button
                  onClick={() => handleChangeStatus('active')}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                >
                  Set Active
                </button>
              )}
              {fund.status !== 'inactive' && (
                <button
                  onClick={() => handleChangeStatus('inactive')}
                  className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                >
                  Set Inactive
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4">
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
        )}

        {isEditing ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="fund_name" className="block text-sm font-medium text-gray-700">
                  Fund Name
                </label>
                <input
                  type="text"
                  id="fund_name"
                  name="fund_name"
                  value={formData.fund_name || ''}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="isin_number" className="block text-sm font-medium text-gray-700">
                  ISIN Number
                </label>
                <input
                  type="text"
                  id="isin_number"
                  name="isin_number"
                  value={formData.isin_number || ''}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="provider_id" className="block text-sm font-medium text-gray-700">
                  Provider
                </label>
                <input
                  type="text"
                  id="provider_name"
                  name="provider_name"
                  value={provider?.name || ''}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="risk_factor" className="block text-sm font-medium text-gray-700">
                  Risk Factor (0-7)
                </label>
                <input
                  type="number"
                  id="risk_factor"
                  name="risk_factor"
                  min="0"
                  max="7"
                  value={formData.risk_factor === null ? '' : formData.risk_factor}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="fund_cost" className="block text-sm font-medium text-gray-700">
                  Fund Cost (%)
                </label>
                <input
                  type="number"
                  id="fund_cost"
                  name="fund_cost"
                  step="0.0001"
                  min="0"
                  value={formData.fund_cost === null ? '' : formData.fund_cost}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
              {products.length > 0 && (
                <div>
                  <label htmlFor="portfolio_id" className="block text-sm font-medium text-gray-700">
                    Associated Product
                  </label>
                  <input
                    type="text"
                    id="portfolio_name"
                    name="portfolio_name"
                    value={productName || ''}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
              )}
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleCancelEdit}
                className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveChanges}
                className="inline-flex justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Save Changes
              </button>
            </div>
          </div>
        ) : (
          <div>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6">
              <div>
                <dt className="text-sm font-medium text-gray-500">Fund Name</dt>
                <dd className="mt-1 text-lg text-gray-900">{fund.fund_name || 'N/A'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">ISIN Number</dt>
                <dd className="mt-1 text-lg text-gray-900">{fund.isin_number || 'N/A'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Provider</dt>
                <dd className="mt-1 text-lg text-gray-900">{provider?.name || 'N/A'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Risk Factor</dt>
                <dd className="mt-1 text-lg text-gray-900">{fund.risk_factor || 'N/A'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Fund Cost</dt>
                <dd className="mt-1 text-lg text-gray-900">
                  {fund.fund_cost !== null ? `${fund.fund_cost.toFixed(4)}%` : 'N/A'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="mt-1">
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      fund.status === 'active' ? 'bg-green-100 text-green-800' : 
                    fund.status === 'dormant' ? 'bg-yellow-100 text-yellow-800' : 
                    'bg-gray-100 text-gray-800'
                    }`}>
                    {fund.status}
                  </span>
                </dd>
              </div>
              {productName && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Associated Product</dt>
                  <dd className="mt-1 text-lg text-gray-900">{productName}</dd>
                </div>
              )}
              <div>
                <dt className="text-sm font-medium text-gray-500">Created</dt>
                <dd className="mt-1 text-lg text-gray-900">
                  {new Date(fund.created_at).toLocaleDateString()}
                </dd>
              </div>
            </dl>
          </div>
        )}
      </div>
    </div>
  );
};

export default FundDetails;
