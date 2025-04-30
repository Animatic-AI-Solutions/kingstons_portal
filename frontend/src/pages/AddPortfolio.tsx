import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface Product {
  id: number;
  product_name: string;
  product_type: string;
  status: string;
}

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
  available_products_id: number | null;
}

interface PortfolioFund {
  fund_id: number;
  target_weighting: number;
}

const AddPortfolio: React.FC = () => {
  const navigate = useNavigate();
  const { api } = useAuth();
  const [formData, setFormData] = useState<TemplatePortfolioFormData>({
    name: '',
    available_products_id: null,
    status: 'active'
  });
  const [products, setProducts] = useState<Product[]>([]);
  const [availableFunds, setAvailableFunds] = useState<Fund[]>([]);
  const [selectedFunds, setSelectedFunds] = useState<number[]>([]);
  const [fundWeightings, setFundWeightings] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isLoadingFunds, setIsLoadingFunds] = useState(false);

  useEffect(() => {
    fetchProducts();
    fetchAllFunds();
  }, []);

  const fetchProducts = async () => {
    try {
      setIsLoadingProducts(true);
      const response = await api.get('/available_products', {
        params: { status: 'active' }
      });
      setProducts(response.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch products');
      console.error('Error fetching products:', err);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  const fetchAllFunds = async () => {
    try {
      setIsLoadingFunds(true);
      const response = await api.get('/funds', {
        params: { status: 'active' }
      });
      setAvailableFunds(response.data);
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
      [name]: value === '' ? null : value
    }));
  };

  const handleProductChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const productId = e.target.value === '' ? null : parseInt(e.target.value, 10);
    setFormData(prev => ({
      ...prev,
      available_products_id: productId,
    }));
    setSelectedFunds([]);
    setFundWeightings({});
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
        // Set default weighting for newly selected fund
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
          available_funds_id: fundId,
          target_weighting: parseFloat(fundWeightings[fundId] || '0')
        }));
        
        // Create the portfolio template
        const portfolioResponse = await api.post('/available_portfolios', {
          name: formData.name,
          available_products_id: formData.available_products_id !== null ? formData.available_products_id : null,
          status: formData.status,
          funds: fundsData
        });
        
        navigate('/portfolios');
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to create portfolio template');
        console.error('Error creating portfolio template:', err);
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
    
    if (!formData.available_products_id) {
      setError('Please select a product');
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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Create Portfolio Template</h1>
        <button
          onClick={() => navigate('/portfolios')}
          className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
        >
          Cancel
        </button>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Template Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="e.g., Conservative ISA Template"
              />
            </div>

            <div>
              <label htmlFor="available_products_id" className="block text-sm font-medium text-gray-700">
                Product
              </label>
              <select
                id="available_products_id"
                name="available_products_id"
                value={formData.available_products_id || ''}
                onChange={handleProductChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="">Select a product</option>
                {products.map(product => (
                  <option key={product.id} value={product.id}>
                    {product.product_name} ({product.product_type})
                  </option>
                ))}
              </select>
              {isLoadingProducts && (
                <div className="mt-2 text-sm text-gray-500">Loading products...</div>
              )}
            </div>

            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                Status
              </label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Fund Selection Section */}
          {formData.available_products_id && (
            <div className="mt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Select Funds</h3>
              
              {isLoadingFunds ? (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
              ) : availableFunds.length === 0 ? (
                <div className="text-gray-500 text-center py-4">No funds available</div>
              ) : (
                <div className="space-y-6">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Select
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Fund Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            ISIN
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Risk Factor
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Target Weighting (%)
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {availableFunds.map((fund) => (
                          <tr key={fund.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <input
                                type="checkbox"
                                checked={selectedFunds.includes(fund.id)}
                                onChange={() => handleFundSelection(fund.id)}
                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{fund.fund_name}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500">{fund.isin_number || 'N/A'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-500">{fund.risk_factor || 'N/A'}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                fund.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {fund.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {selectedFunds.includes(fund.id) && (
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.01"
                                  value={fundWeightings[fund.id.toString()] || 0}
                                  onChange={(e) => handleWeightingChange(
                                    fund.id,
                                    parseFloat(e.target.value) || 0
                                  )}
                                  className="w-20 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                />
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-gray-500">
                      {selectedFunds.length} fund(s) selected
                    </div>
                    <div className={`text-sm ${
                      selectedFunds.length > 0 && Math.abs(Object.values(fundWeightings).reduce((a, b) => a + b, 0) - 100) > 0.01 
                        ? 'text-red-500 font-medium' 
                        : 'text-gray-500'
                    }`}>
                      Total weighting: {Object.values(fundWeightings).reduce((a, b) => a + b, 0).toFixed(2)}%
                      {selectedFunds.length > 0 && Math.abs(Object.values(fundWeightings).reduce((a, b) => a + b, 0) - 100) > 0.01 && 
                        <span className="ml-2">(Must equal 100%)</span>
                      }
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Creating...' : 'Create Template'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddPortfolio;
