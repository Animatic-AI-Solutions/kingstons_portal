import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import { Radio, Select, Input, Checkbox, DatePicker } from 'antd';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';

interface Client {
  id: number;
  name: string;
  initial_investment: number | null;
}

interface Provider {
  id: number;
  name: string;
  status: string;
}

interface Fund {
  id: number;
  fund_name: string;
  isin_number: string;
  risk_factor: number;
  fund_cost: number;
  status: string;
}

interface ProductItem {
  id: string; // Temporary ID for UI
  client_id: number;
  provider_id: number;
  product_type: string;
  product_name: string;
  status: string;
  weighting: number;
  start_date?: dayjs.Dayjs; // Use dayjs type
  portfolio: {
    id?: number; // Portfolio ID when created or selected
    name: string;
    selectedFunds: number[];
    type: 'template' | 'bespoke';
    templateId?: number;
    fundWeightings: Record<string, string>;
  };
}

interface PortfolioTemplate {
  id: number;
  created_at: string;
  name: string | null;
}

const CreateClientProducts: React.FC = (): JSX.Element => {
  const navigate = useNavigate();
  const { api } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [funds, setFunds] = useState<Fund[]>([]);
  const [availableTemplates, setAvailableTemplates] = useState<PortfolioTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [clientId, setClientId] = useState<number | null>(null);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [providerProducts, setProviderProducts] = useState<Record<number, any>>({});
  const [availableFundsByProvider, setAvailableFundsByProvider] = useState<Record<number, Fund[]>>({});
  const [isLoadingFunds, setIsLoadingFunds] = useState<Record<string, boolean>>({});
  const [showFundDropdowns, setShowFundDropdowns] = useState<Record<string, boolean>>({});
  
  // Product search state
  const [productSearchTerms, setProductSearchTerms] = useState<Record<string, string>>({});
  const [showProductDropdowns, setShowProductDropdowns] = useState<Record<string, boolean>>({});

  // Fund search state
  const [fundSearchTerm, setFundSearchTerm] = useState<string>('');
  const [filteredFunds, setFilteredFunds] = useState<Fund[]>([]);
  
  // Start date state
  const [startDate, setStartDate] = useState<dayjs.Dayjs>(dayjs());
  
  // Click outside handler for dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Check if the click was outside a dropdown
      const dropdowns = document.querySelectorAll('.product-dropdown-container');
      let clickedOutside = true;
      
      dropdowns.forEach(dropdown => {
        if (dropdown.contains(event.target as Node)) {
          clickedOutside = false;
        }
      });
      
      if (clickedOutside) {
        setShowProductDropdowns({});
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fetch necessary data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        console.log("Fetching data for CreateClientProducts...");
        
        // Fetch all necessary data in parallel
        const [
          clientsRes,
          providersRes,
          fundsRes,
          portfoliosRes
        ] = await Promise.all([
          api.get('/clients'),
          api.get('/available_providers'),
          api.get('/funds'),
          api.get('/available_portfolios')
        ]);
        
        setClients(clientsRes.data);
        setProviders(providersRes.data);
        setFunds(fundsRes.data);
        setAvailableTemplates(portfoliosRes.data);
        
        // Set defaults
        if (clientsRes.data.length > 0) {
          setClientId(clientsRes.data[0].id);
        }
        
        console.log("Data fetched successfully for CreateClientProducts");
      } catch (err: any) {
        console.error('Error fetching data:', err);
        setError(err.response?.data?.detail || 'Failed to fetch data');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [api]);

  // Add a new useEffect to load all available funds on component mount
  useEffect(() => {
    const loadAllFunds = async () => {
      try {
        setIsLoading(true);
        const fundsResponse = await api.get('/funds');
        setFunds(fundsResponse.data);
        setFilteredFunds(fundsResponse.data);
      } catch (err) {
        console.error('Error loading all funds:', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadAllFunds();
  }, [api]);

  // Add a new useEffect to load funds for products that already have a provider selected
  useEffect(() => {
    // Only load funds for products that have a provider selected but don't have funds loaded yet
    products.forEach(product => {
      loadFundsForProduct(product.provider_id, product.id);
    });
  }, [products.map(product => product.provider_id).join(',')]); // Only re-run when provider selections change

  // Modify the function to load funds regardless of provider selection
  const loadFundsForProduct = async (providerId: number, productId: string) => {
    // We don't need to check for providerId existence anymore since funds should be available regardless
    setIsLoadingFunds(prev => ({ ...prev, [productId]: true }));
    
    try {
      // We already have funds loaded in the component state, so we can just use those
      // This function now only tracks loading state for UI purposes
      setIsLoadingFunds(prev => ({ ...prev, [productId]: false }));
    } catch (err) {
      console.error('Error processing funds for product:', err);
      setIsLoadingFunds(prev => ({ ...prev, [productId]: false }));
    }
  };

  const handleClientChange = (clientId: number) => {
    setClientId(clientId);
    
    // Reset products when client changes
    if (products.length > 0) {
      if (window.confirm('Changing client will clear all current products. Continue?')) {
        setProducts([]);
      } else {
        return;
      }
    }
  };

  const handleAddProduct = () => {
    if (!clientId) {
      setError('Please select a client first');
      return;
    }
    
    // Create a new empty product with a temporary ID
    const newProduct: ProductItem = {
      id: `temp-${Date.now()}`,
      client_id: clientId,
      provider_id: 0,
      product_type: '',
      product_name: `Product ${products.length + 1}`,
      status: 'active',
      weighting: 0, // Set default weighting to 0
      start_date: startDate, // Use the selected start date
      portfolio: {
        name: `Portfolio ${products.length + 1}`, // Set a default portfolio name
        selectedFunds: [],
        type: 'bespoke',
        fundWeightings: {}
      }
    };
    
    setProducts([...products, newProduct]);
  };

  const handleRemoveProduct = (id: string) => {
    setProducts(prevProducts => prevProducts.filter(product => product.id !== id));
    setError(null);
  };

  // Update product amounts based on total amount and weightings
  const updateProductAmounts = () => {
    if (products.length === 0) return;
    
    setProducts(products.map(product => ({
      ...product,
      weighting: product.weighting
    })));
  };

  const handleProductChange = (productId: string, field: string, value: any) => {
    setProducts(prevProducts => {
      const updatedProducts = prevProducts.map(product => {
        if (product.id === productId) {
          const updatedProduct = { ...product, [field]: value };
          
          // If weighting is changed, recalculate the total_amount based on the weighting
          if (field === 'weighting') {
            updatedProduct.weighting = value;
          }
          
          return updatedProduct;
        }
        return product;
      });
      
      return updatedProducts;
    });
  };

  const handleProductSearch = (id: string, searchTerm: string) => {
    setProductSearchTerms({
      ...productSearchTerms,
      [id]: searchTerm
    });
  };

  const toggleProductDropdown = (id: string, show?: boolean) => {
    setShowProductDropdowns({
      ...showProductDropdowns,
      [id]: show !== undefined ? show : !showProductDropdowns[id]
    });
  };

  const getFilteredProducts = (searchTerm: string) => {
    if (!searchTerm.trim()) return providers;
    
    const term = searchTerm.toLowerCase();
    return providers.filter(provider => 
      provider.name.toLowerCase().includes(term)
    );
  };

  const handleSelectProvider = (productId: string, providerId: number, providerName: string) => {
    handleProductChange(productId, 'provider_id', providerId);
    // Update the search terms with the selected provider name
    setProductSearchTerms(prev => ({
      ...prev,
      [productId]: providerName
    }));
    toggleProductDropdown(productId, false);
    // We don't need to load funds for the selected provider anymore
    // since all funds are loaded on component mount
  };

  const handleProductTypeChange = (productId: string, productType: string) => {
    handleProductChange(productId, 'product_type', productType);
  };

  // Add handlers for fund selection
  const handlePortfolioNameChange = (productId: string, name: string) => {
    setProducts(prevProducts => prevProducts.map(product => {
      if (product.id === productId) {
        return {
          ...product,
          portfolio: {
            ...product.portfolio,
            name: name
          }
        };
      }
      return product;
    }));
  };
  
  const handleFundSelection = (productId: string, fundId: number) => {
    setProducts(prevProducts => prevProducts.map(product => {
      if (product.id === productId) {
        const selectedFunds = [...product.portfolio.selectedFunds];
        if (selectedFunds.includes(fundId)) {
          // Remove fund
          return {
            ...product,
            portfolio: {
              ...product.portfolio,
              selectedFunds: selectedFunds.filter(id => id !== fundId)
            }
          };
        } else {
          // Add fund
          return {
            ...product,
            portfolio: {
              ...product.portfolio,
              selectedFunds: [...selectedFunds, fundId]
            }
          };
        }
      }
      return product;
    }));
  };
  
  const calculateTotalFundWeighting = (product: ProductItem): number => {
    return product.portfolio.selectedFunds.length;
  };
  
  // Portfolio configuration functions
  const handlePortfolioTypeChange = (productId: string, type: 'template' | 'bespoke'): void => {
    setProducts(prevProducts => prevProducts.map(product => {
      if (product.id === productId) {
        return {
          ...product,
          portfolio: {
            ...product.portfolio,
            type,
            templateId: undefined,
            selectedFunds: []
          }
        };
      }
      return product;
    }));
  };

  const handleTemplateSelection = async (productId: string, templateId: string): Promise<void> => {
    if (!templateId) {
      return;
    }

    setIsLoading(true);
    try {
      // Fetch template details
      const response = await api.get(`/available_portfolios/${templateId}`);
      const templateData = response.data;
      
      // Get funds in the template
      const templateFunds = templateData.funds || [];
      const fundIds = templateFunds.map((fund: any) => fund.fund_id);
      
      // Update the product's portfolio with template information
      const updatedProducts = products.map(product => {
        if (product.id === productId) {
          return {
            ...product,
            portfolio: {
              ...product.portfolio,
              templateId: parseInt(templateId),
              name: `${templateData.name || `Template ${templateId}`} for ${product.product_name}`,
              selectedFunds: fundIds,
              fundWeightings: {}
            }
          };
        }
        return product;
      });
      
      setProducts(updatedProducts);
    } catch (err) {
      console.error('Error loading template:', err);
      alert('Failed to load template details. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = (): boolean => {
    // Client must be selected
    if (!clientId) {
      setError('Please select a client');
      return false;
    }

    // At least one product must be added
    if (products.length === 0) {
      setError('Please add at least one product');
      return false;
    }

    // All products must have required fields
    for (const product of products) {
      if (!product.product_name.trim()) {
        setError('All products must have a name');
        return false;
      }
      
      if (product.provider_id === 0) {
        setError(`Please select a provider for ${product.product_name}`);
        return false;
      }
      
      if (!product.product_type.trim()) {
        setError(`Please select a product type for ${product.product_name}`);
        return false;
      }
      
      // Portfolio validation
      if (!product.portfolio.name.trim()) {
        setError(`Please enter a portfolio name for product "${product.product_name}"`);
        return false;
      }
      
      // For template portfolios, check if a template is selected
      if (product.portfolio.type === 'template') {
        if (!product.portfolio.templateId) {
          setError(`Please select a template portfolio for product "${product.product_name}"`);
          return false;
        }
      } else {
        // For bespoke portfolios, check fund selection
        if (product.portfolio.selectedFunds.length === 0) {
          setError(`Please select at least one fund for the portfolio in product "${product.product_name}"`);
          return false;
        }
      }
    }

    return true;
  };

  // Update the handleSubmit function to use the new schema with provider_id and product_type.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSaving(true);
    setError('');
    
    try {
      // Format the selected start date with dayjs
      const formattedStartDate = startDate.format('YYYY-MM-DD');
      
      for (const product of products) {
        let portfolioId: number | undefined;

        // First, create the portfolio if needed
        if (product.portfolio.type === 'template' && product.portfolio.templateId) {
          // Create portfolio from template
          const templateResponse = await api.post('/portfolios/from_template', {
            template_id: product.portfolio.templateId,
            portfolio_name: product.portfolio.name,
            status: 'active',
            start_date: formattedStartDate
          });
          portfolioId = templateResponse.data.id;
          console.log(`Created portfolio from template with ID: ${portfolioId}`);
        } else if (product.portfolio.type === 'bespoke') {
          // Create a bespoke portfolio
          const portfolioResponse = await api.post('/portfolios', {
            portfolio_name: product.portfolio.name,
            status: 'active',
            start_date: formattedStartDate
          });
          portfolioId = portfolioResponse.data.id;
          console.log(`Created bespoke portfolio with ID: ${portfolioId}`);
          
          // Add funds for bespoke portfolio
          for (const fundId of product.portfolio.selectedFunds) {
            await api.post('/portfolio_funds', {
              portfolio_id: portfolioId,
              available_funds_id: fundId,
              weighting: 0, // Default to equal weights
              start_date: formattedStartDate // Add the start_date field which is required
            });
          }
        } else if (product.portfolio.id) {
          // Use existing portfolio if already set
          portfolioId = product.portfolio.id;
          console.log(`Using existing portfolio with ID: ${portfolioId}`);
        }
        
        // Create client product with direct portfolio_id link
        const clientProductData = {
          client_id: product.client_id,
          provider_id: product.provider_id,
          product_type: product.product_type,
          product_name: product.product_name,
          status: product.status,
          start_date: formattedStartDate,
          portfolio_id: portfolioId // Link directly to portfolio
        };
        
        console.log("Creating client product with data:", clientProductData);
        
        // Create the client product
        const productResponse = await api.post('/client_products', clientProductData);
        console.log(`Created client product with ID: ${productResponse.data.id}`);
      }
      
      // Show success message and navigate back
      alert('Client products and portfolios created successfully!');
      navigate('/products');
    } catch (error: any) {
      console.error('Error saving client products:', error);
      setError(error.response?.data?.detail || 'Failed to save client products');
    } finally {
      setIsSaving(false);
    }
  };

  // Add fund search functionality
  const handleFundSearch = (searchTerm: string): void => {
    setFundSearchTerm(searchTerm);
    if (!searchTerm.trim()) {
      setFilteredFunds(funds);
      return;
    }
    
    const term = searchTerm.toLowerCase();
    const filtered = funds.filter((fund: Fund) => 
      fund.fund_name.toLowerCase().includes(term) || 
      (fund.isin_number && fund.isin_number.toLowerCase().includes(term))
    );
    setFilteredFunds(filtered);
  };

  const renderPortfolioSection = (product: ProductItem): JSX.Element => {
    return (
      <div className="portfolio-section">
        {/* Portfolio Type Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Portfolio Type <span className="text-red-500">*</span>
          </label>
          <Radio.Group
            value={product.portfolio.type}
            onChange={(e) => handlePortfolioTypeChange(product.id, e.target.value as 'template' | 'bespoke')}
          >
            <Radio value="bespoke">Bespoke Portfolio</Radio>
            <Radio value="template">Template Portfolio</Radio>
          </Radio.Group>
        </div>

        {/* Template Selection - Only show if template type is selected */}
        {product.portfolio.type === 'template' && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Template <span className="text-red-500">*</span>
            </label>
            <Select
              style={{ width: '100%' }}
              placeholder="Select a template"
              value={product.portfolio.templateId?.toString()}
              onChange={(value) => handleTemplateSelection(product.id, value)}
            >
              <Select.Option value="">-- Select Template --</Select.Option>
              {availableTemplates.map(template => (
                <Select.Option key={template.id} value={template.id.toString()}>
                  {template.name || `Template ${template.id}`}
                </Select.Option>
              ))}
            </Select>
          </div>
        )}

        {/* Selected Funds Table - Show for both template and bespoke, but read-only for template */}
        {product.portfolio.selectedFunds.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Selected Funds</h4>
            <div className="border rounded-md overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fund Name
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {product.portfolio.selectedFunds.map((fundId) => {
                    const fund = funds.find(f => f.id === fundId);
                    return (
                      <tr key={fundId}>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                          {fund?.fund_name || 'Unknown Fund'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Show fund selection only for bespoke portfolios */}
        {product.portfolio.type === 'bespoke' && (
          <div className="fund-selection">
            <h4>Select Funds</h4>
            <Input
              placeholder="Search funds by name or ISIN"
              value={fundSearchTerm}
              onChange={(e) => handleFundSearch(e.target.value)}
              style={{ marginBottom: '1rem' }}
            />
            <div className="fund-list">
              {filteredFunds.map(fund => (
                <div key={fund.id} className="fund-item">
                  <Checkbox
                    checked={product.portfolio.selectedFunds.includes(fund.id)}
                    onChange={() => handleFundSelection(product.id, fund.id)}
                  >
                    {fund.fund_name} ({fund.isin_number})
                  </Checkbox>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-center items-center py-16">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Create Client Products</h1>
        <button
          onClick={() => navigate('/products')}
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          Back to Products
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
        </div>
      ) : error ? (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6">
          <p>{error}</p>
        </div>
      ) : (
        <div className="bg-white shadow-md rounded-lg p-6">
          <form onSubmit={handleSubmit}>
            {/* Client Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Client <span className="text-red-500">*</span>
              </label>
              {clients.length > 0 ? (
                <select
                  value={clientId || ''}
                  onChange={(e) => handleClientChange(parseInt(e.target.value))}
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  required
                >
                  <option value="">Select a client</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="text-gray-500">No clients available. Please add a client first.</div>
              )}
            </div>

            {/* Start Date Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date <span className="text-red-500">*</span>
              </label>
              <DatePicker
                value={startDate}
                onChange={(date) => setStartDate(date as Dayjs)}
                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
              />
            </div>

            {/* Product List */}
            <div className="space-y-6">
              <div className="flex justify-between items-center pb-4 border-b border-gray-200">
                <h2 className="text-xl font-medium">Products</h2>
                <button
                  type="button"
                  onClick={handleAddProduct}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  Add Client Product
                </button>
              </div>

              {products.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No products added yet. Click "Add Client Product" to create a new product.</p>
                </div>
              ) : (
                <div>
                  {products.map((product) => (
                    <div key={product.id} className="border rounded-md p-6 mb-6 bg-gray-50">
                      {/* Product Header */}
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-medium">{product.product_name}</h3>
                        <button
                          type="button"
                          onClick={() => handleRemoveProduct(product.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Remove
                        </button>
                      </div>

                      {/* Product Form */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Product Name */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Product Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={product.product_name}
                            onChange={(e) => handleProductChange(product.id, 'product_name', e.target.value)}
                            className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            required
                          />
                        </div>

                        {/* Provider Selection */}
                        <div className="product-dropdown-container relative">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Provider <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={productSearchTerms[product.id] || ''}
                            onClick={() => toggleProductDropdown(product.id, true)}
                            onChange={(e) => handleProductSearch(product.id, e.target.value)}
                            placeholder="Search for a provider..."
                            className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                          />
                          {showProductDropdowns[product.id] && (
                            <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base overflow-auto">
                              {getFilteredProducts(productSearchTerms[product.id] || '').map(provider => (
                                <div
                                  key={provider.id}
                                  className="cursor-pointer hover:bg-gray-100 py-2 px-4"
                                  onClick={() => handleSelectProvider(product.id, provider.id, provider.name)}
                                >
                                  {provider.name}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Product Type */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Product Type <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={product.product_type}
                            onChange={(e) => handleProductTypeChange(product.id, e.target.value)}
                            className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            required
                          >
                            <option value="">Select product type</option>
                            <option value="ISA">ISA</option>
                            <option value="JISA">Junior ISA</option>
                            <option value="SIPP">SIPP</option>
                            <option value="GIA">GIA</option>
                            <option value="Offshore Bond">Offshore Bond</option>
                            <option value="Onshore Bond">Onshore Bond</option>
                            <option value="Trust">Trust</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>

                        {/* Portfolio Name */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Portfolio Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={product.portfolio.name}
                            onChange={(e) => handlePortfolioNameChange(product.id, e.target.value)}
                            className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            required
                          />
                        </div>

                        {/* Product Weighting */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Product Weighting (%)
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={product.weighting}
                            onChange={(e) => handleProductChange(product.id, 'weighting', parseFloat(e.target.value))}
                            className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                          />
                        </div>

                        {/* Portfolio Configuration */}
                        <div className="mt-6 border-t pt-6 col-span-2">
                          <h4 className="text-lg font-medium mb-4">Portfolio Configuration</h4>
                          {renderPortfolioSection(product)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Form Actions */}
            <div className="mt-8 flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => navigate('/products')}
                className="px-6 py-3 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Products'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default CreateClientProducts; 