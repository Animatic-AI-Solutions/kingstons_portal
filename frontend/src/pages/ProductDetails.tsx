import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface Provider {
  id: number;
  name: string;
}

interface Portfolio {
  id: number;
  portfolio_name: string;
  status: string;
  created_at: string;
}

interface Product {
  id: number;
  available_providers_id: number | null;
  status: string;
  created_at: string;
  product_name: string;
  product_type: string;
}

interface Fund {
  id: number;
  fund_name: string;
  isin_number: string;
  risk_factor: number | null;
  fund_cost: number | null;
  status: string;
  created_at: string;
}

interface ProductFund {
  id: number;
  available_products_id: number;
  available_funds_id: number;
  target_weighting: number | null;
  created_at: string;
}

interface PortfolioFund {
  portfolio_id: number;
  fund_id: number;
  target_weighting: number;
  amount_invested: number | null;
}

const ProductDetails: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { api } = useAuth();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [provider, setProvider] = useState<Provider | null>(null);
  const [linkedPortfolios, setLinkedPortfolios] = useState<Portfolio[]>([]);
  const [linkedFunds, setLinkedFunds] = useState<Fund[]>([]);
  const [productFunds, setProductFunds] = useState<ProductFund[]>([]);
  const [availableFunds, setAvailableFunds] = useState<Fund[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Product>>({});
  
  // States for fund management
  const [isAddingFund, setIsAddingFund] = useState(false);
  const [selectedFundId, setSelectedFundId] = useState<number | null>(null);
  const [fundWeighting, setFundWeighting] = useState<number>(0);
  const [fundError, setFundError] = useState<string | null>(null);

  useEffect(() => {
    if (productId) {
      fetchProductDetails();
    }
  }, [productId]);
  
  const fetchProductDetails = async () => {
    try {
      setIsLoading(true);
      console.log(`Fetching product details for ID: ${productId}`);
      
      // Get product details
      const productResponse = await api.get(`/available_products/${productId}`);
      const productData = productResponse.data;
      setProduct(productData);
      
      // Get provider details
      const providerResponse = await api.get(`/available_providers/${productData.available_providers_id}`);
      setProvider(providerResponse.data);
      
      // Get funds for this product
      const productFundsResponse = await api.get('/product_funds', {
        params: { available_products_id: productId }
      });
      
      // Get all available funds for reference
      const fundsResponse = await api.get('/funds');
      
      // Get accounts using this product
      const accountsResponse = await api.get('/client_accounts', {
        params: { available_products_id: productId }
      });
      
      // Get portfolio assignments for these accounts
      const portfolioAssignmentsResponse = await api.get('/client_account_portfolio_assignments', {
        params: { available_products_id: productId }
      });
      
      // Get clients for these accounts
      const clientIds = [...new Set(accountsResponse.data.map((account: any) => account.client_id))];
      const clientsPromises = (clientIds as number[]).map((clientId: number) => 
        api.get(`/clients/${clientId}`)
      );
      const clientsResponses = await Promise.all(clientsPromises);
      const clientsData = clientsResponses.map(response => response.data);
      
      // Get portfolio details for all assignments
      const portfolioIds = [...new Set(portfolioAssignmentsResponse.data
        .map((assignment: any) => assignment.portfolio_id)
        .filter(Boolean))];
      
      const portfolioFundsPromise = api.get('/portfolio_funds', {
        params: { portfolio_ids: portfolioIds.join(',') }
      });
      
      // Combine all the data
      const combinedData = {
        product: productData,
        provider: providerResponse.data,
        productFunds: productFundsResponse.data,
        allFunds: fundsResponse.data,
        accounts: accountsResponse.data,
        portfolioAssignments: portfolioAssignmentsResponse.data,
        clients: clientsData,
        portfolioFunds: (await portfolioFundsPromise).data
      };
      
      // Process the data
      processProductData(combinedData);
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching product details:', error);
      setError('Failed to load product details. Please try again.');
      setIsLoading(false);
    }
  };

  // Process the data returned from API calls
  const processProductData = (data: any) => {
    // Set product funds
    setProductFunds(data.productFunds || []);
    
    // Set available funds for the dropdown
    setAvailableFunds(data.allFunds || []);
    
    // Process linked portfolios
    const portfolioIds = [...new Set(data.portfolioAssignments
      .map((assignment: any) => assignment.portfolio_id)
      .filter(Boolean))];
    
    // Get portfolios info from the portfolio funds data
    const portfolios: Portfolio[] = [];
    const uniquePortfolioIds = new Set<number>();
    
    // Extract unique portfolios from portfolio funds
    if (data.portfolioFunds && Array.isArray(data.portfolioFunds)) {
      data.portfolioFunds.forEach((pf: any) => {
        if (pf.portfolio_id && !uniquePortfolioIds.has(pf.portfolio_id) && 
            portfolioIds.includes(pf.portfolio_id)) {
          uniquePortfolioIds.add(pf.portfolio_id);
          if (pf.portfolio_name) {
            portfolios.push({
              id: pf.portfolio_id,
              portfolio_name: pf.portfolio_name,
              status: pf.status || 'active',
              created_at: pf.created_at || new Date().toISOString()
            });
          }
        }
      });
    }
    
    setLinkedPortfolios(portfolios);
    
    // Process linked funds
    const fundIds = new Set<number>();
    
    // Add product funds
    if (data.productFunds && Array.isArray(data.productFunds)) {
      data.productFunds.forEach((pf: any) => {
        if (pf.available_funds_id) {
          fundIds.add(pf.available_funds_id);
        }
      });
    }
    
    // Add portfolio funds
    if (data.portfolioFunds && Array.isArray(data.portfolioFunds)) {
      data.portfolioFunds.forEach((pf: any) => {
        if (pf.fund_id) {
          fundIds.add(pf.fund_id);
        }
      });
    }
    
    // Get fund details from all funds
    const funds = data.allFunds
      .filter((fund: any) => fundIds.has(fund.id))
      .map((fund: Fund) => fund);
    
    setLinkedFunds(funds);
  };

  const handleBack = () => {
    navigate('/products');
  };

  const handleToggleStatus = async () => {
    if (!product) return;
    
    try {
      await api.patch(`/available_products/${productId}`, {
        status: product.status === 'active' ? 'inactive' : 'active'
      });
      
      // Refresh product details
      fetchProductDetails();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update product status');
      console.error('Error updating product status:', err);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (name === 'available_providers_id') {
      setFormData(prev => ({
        ...prev,
        [name]: value === '' ? null : Number(value)
      }));
    } else if (type === 'checkbox') {
      const target = e.target as HTMLInputElement;
      setFormData(prev => ({
        ...prev,
        status: target.checked ? 'active' : 'inactive'
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };
  
  const handleSaveChanges = async () => {
    if (!product || !formData) return;
    
    try {
      await api.patch(`/available_products/${productId}`, formData);
      
      // Reset form and refresh data
      setIsEditing(false);
      setFormData({});
      fetchProductDetails();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update product');
      console.error('Error updating product:', err);
    }
  };
  
  const handleAddFund = async () => {
    if (!selectedFundId || !productId) {
      setFundError("Please select a fund and specify a weighting");
      return;
    }
    
    try {
      await api.post('/product_funds', {
        available_products_id: parseInt(productId),
        available_funds_id: selectedFundId,
        target_weighting: fundWeighting
      });
      
      setIsAddingFund(false);
      setSelectedFundId(null);
      setFundWeighting(0);
      setFundError(null);
      
      // Refresh product details
      fetchProductDetails();
    } catch (err: any) {
      setFundError(err.response?.data?.detail || 'Failed to add fund to product');
      console.error('Error adding fund to product:', err);
    }
  };
  
  const handleRemoveFund = async (productFundId: number) => {
    try {
      await api.delete(`/product_funds/${productFundId}`);
      
      // Refresh product details
      fetchProductDetails();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to remove fund from product');
      console.error('Error removing fund from product:', err);
    }
  };
  
  const handleUpdateFundWeighting = async (productFundId: number, newWeighting: number) => {
    try {
      await api.patch(`/product_funds/${productFundId}`, {
        target_weighting: newWeighting
      });
      
      // Refresh product details
      fetchProductDetails();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update fund weighting');
      console.error('Error updating fund weighting:', err);
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
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
          {error}
        </div>
        <button
          onClick={handleBack}
          className="mt-4 bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
        >
          Back to Products
        </button>
      </div>
    );
  }
  
  if (!product) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-md">
          Product not found
        </div>
        <button
          onClick={handleBack}
          className="mt-4 bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
        >
          Back to Products
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Product Details</h1>
          <button
            onClick={handleBack}
            className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            Back to Products
          </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md mb-6">
          {error}
        </div>
      )}

      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Product Information</h2>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Name</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {isEditing ? (
                    <input
                      type="text"
                      name="product_name"
                      value={formData.product_name !== undefined ? formData.product_name : product.product_name}
                      onChange={handleChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  ) : (
                    product.product_name
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Product Type</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {isEditing ? (
                    <input
                      type="text"
                      name="product_type"
                      value={formData.product_type !== undefined ? formData.product_type : product.product_type}
                      onChange={handleChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  ) : (
                    product.product_type
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Provider</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {provider ? provider.name : 'None'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    product.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {product.status}
                    </span>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Created Date</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(product.created_at).toLocaleDateString()}
                </dd>
              </div>
            </dl>

            <div className="mt-6 flex space-x-4">
          {isEditing ? (
            <>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setFormData({});
                }}
                className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveChanges}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              >
                Save Changes
              </button>
            </>
          ) : (
            <>
              <button
                    onClick={handleToggleStatus}
                    className={`${product.status === 'active' ? 'bg-orange-600 hover:bg-orange-700 focus:ring-orange-500' : 'bg-green-600 hover:bg-green-700 focus:ring-green-500'} text-white px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2`}
              >
                    {product.status === 'active' ? 'Deactivate' : 'Activate'}
              </button>
              <button
                onClick={() => {
                  // Initialize form data with current product values
                      setFormData({
                    product_name: product.product_name,
                        product_type: product.product_type,
                        available_providers_id: product.available_providers_id,
                        status: product.status
                      });
                  setIsEditing(true);
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Edit Product
              </button>
            </>
          )}
        </div>
      </div>

          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Portfolios Under Management</h2>
            {linkedPortfolios.length === 0 ? (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-md">
                No portfolios are linked to this product.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Portfolio Name
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {linkedPortfolios.map((portfolio) => (
                      <tr key={portfolio.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/portfolios/${portfolio.id}`)}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {portfolio.portfolio_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            portfolio.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {portfolio.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(portfolio.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Funds Under Management Section */}
      <div className="bg-white shadow rounded-lg p-6 mt-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Funds Under Management</h2>
        
        {linkedFunds.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-md">
            No funds are linked to this product's portfolios.
          </div>
        ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fund Name
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ISIN
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Risk Factor
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fund Cost
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                {linkedFunds.map((fund) => (
                  <tr key={fund.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {fund.fund_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {fund.isin_number || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {fund.risk_factor || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {fund.fund_cost !== null ? `${fund.fund_cost.toFixed(4)}%` : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        fund.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                        {fund.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
          </div>
        )}
      </div>
      
      {/* Product Funds Management Section */}
      <div className="bg-white shadow rounded-lg p-6 mt-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Fund Allocations</h2>
          <button 
            onClick={() => setIsAddingFund(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Add Fund
          </button>
        </div>
        
        {fundError && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md mb-4">
            {fundError}
          </div>
        )}
        
        {isAddingFund && (
          <div className="bg-gray-50 p-4 rounded-md mb-6">
            <h3 className="text-md font-medium text-gray-900 mb-2">Add Fund to Product</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Fund
                </label>
                <select
                  value={selectedFundId || ''}
                  onChange={(e) => setSelectedFundId(e.target.value ? parseInt(e.target.value) : null)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="">Select a fund</option>
                  {availableFunds
                    .filter(fund => 
                      !productFunds.some(pf => pf.available_funds_id === fund.id)
                    )
                    .map(fund => (
                      <option key={fund.id} value={fund.id}>
                        {fund.fund_name}
                      </option>
                    ))
                  }
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Weighting (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={fundWeighting}
                  onChange={(e) => setFundWeighting(parseFloat(e.target.value) || 0)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              
              <div className="flex items-end">
                <div className="flex space-x-2">
                  <button
                    onClick={() => setIsAddingFund(false)}
                    className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddFund}
                    className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                  >
                    Add Fund
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {productFunds.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-md">
            This product has no funds associated with it. Add funds to enable portfolio creation with this product.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fund Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Target Weighting
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {productFunds.map((productFund) => {
                  const fund = availableFunds.find(f => f.id === productFund.available_funds_id);
                  return (
                    <tr key={productFund.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {fund?.fund_name || `Fund ID: ${productFund.available_funds_id}`}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          defaultValue={productFund.target_weighting || 0}
                          onBlur={(e) => {
                            const newValue = parseFloat(e.target.value) || 0;
                            if (newValue !== productFund.target_weighting) {
                              handleUpdateFundWeighting(productFund.id, newValue);
                            }
                          }}
                          className="block w-36 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleRemoveFund(productFund.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
                
                {/* Summary Row */}
                <tr className="bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                    Total Allocation
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                    {productFunds.reduce((sum, pf) => sum + (pf.target_weighting || 0), 0).toFixed(2)}%
                    {Math.abs(productFunds.reduce((sum, pf) => sum + (pf.target_weighting || 0), 0) - 100) > 0.01 && (
                      <span className="ml-2 text-yellow-600">(Not 100%)</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  </td>
                </tr>
              </tbody>
            </table>
            
            <div className="mt-4 text-sm text-gray-600">
              <p>These fund allocations will be used as default weightings when creating portfolios with this product.</p>
              <p>The total allocation should ideally sum to 100% for accurate distribution of investments.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductDetails;
