import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import { Radio, Select, Input, Checkbox, DatePicker } from 'antd';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import SearchableDropdown from '../components/ui/SearchableDropdown';

interface Client {
  id: number;
  forname: string | null;
  surname: string | null;
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
  weighting: number; // Will always be 0
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
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  
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
  
  // Add a state for tracking template loading per product
  const [templateLoading, setTemplateLoading] = useState<Record<string, boolean>>({});
  
  // Add refs for product sections
  const productRefs = useRef<Record<string, HTMLDivElement | null>>({});
  
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
        const allFunds = fundsResponse.data;
        
        // Filter out cashline funds - they'll be added automatically
        const nonCashlineFunds = allFunds.filter((fund: Fund) => 
          !fund.fund_name.toLowerCase().includes('cashline')
        );
        
        setFunds(allFunds); // Keep all funds in state for reference
        setFilteredFunds(nonCashlineFunds); // But only show non-cashline funds in the UI
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
      showError('Please select a client first');
      return;
    }
    
    // Create a new empty product with a temporary ID
    const productId = `temp-${Date.now()}`;
    const newProduct: ProductItem = {
      id: productId,
      client_id: clientId,
      provider_id: 0,
      product_type: '',
      product_name: `Product ${products.length + 1}`,
      status: 'active',
      weighting: 0, // Always 0 for new products
      start_date: startDate, // Use the selected start date
      portfolio: {
        name: `Portfolio ${products.length + 1}`, // Set a default portfolio name
        selectedFunds: [],
        type: 'bespoke',
        fundWeightings: {}
      }
    };
    
    // Update products state
    setProducts([...products, newProduct]);
    
    // Scroll to new product after UI updates
    setTimeout(() => {
      if (productRefs.current[productId]) {
        productRefs.current[productId]?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
        
        // Focus on the first input field (product name)
        const nameInput = productRefs.current[productId]?.querySelector('input[type="text"]');
        if (nameInput instanceof HTMLInputElement) {
          nameInput.focus();
        }
      }
    }, 100);
  };

  const handleRemoveProduct = (id: string) => {
    setProducts(prevProducts => prevProducts.filter(product => product.id !== id));
    setError(null);
  };

  const handleProductChange = (productId: string, field: string, value: any) => {
    setProducts(prevProducts => {
      const updatedProducts = prevProducts.map(product => {
        if (product.id === productId) {
          const updatedProduct = { ...product, [field]: value };
          
          // Always keep weighting at 0
          if (field === 'weighting') {
            updatedProduct.weighting = 0;
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
        const isSelected = selectedFunds.includes(fundId);
        let updatedFunds;
        let updatedType = product.portfolio.type;
        
        if (isSelected) {
          // Remove fund
          updatedFunds = selectedFunds.filter(id => id !== fundId);
        } else {
          // Add fund
          updatedFunds = [...selectedFunds, fundId];
        }
        
        // If this is a template portfolio and we're modifying the funds, convert to bespoke
        if (product.portfolio.type === 'template' && product.portfolio.templateId) {
          updatedType = 'bespoke';
          // Show notification that we're converting to bespoke
          showError(`Template portfolio has been converted to bespoke because you modified the fund selection.`);
        }
        
        return {
          ...product,
          portfolio: {
            ...product.portfolio,
            type: updatedType,
            templateId: updatedType === 'bespoke' ? undefined : product.portfolio.templateId,
            selectedFunds: updatedFunds
          }
        };
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

    // Set loading state just for this specific product
    setTemplateLoading(prev => ({ ...prev, [productId]: true }));
    
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
      showError('Failed to load template details. Please try again.');
    } finally {
      // Clear loading state for this product
      setTemplateLoading(prev => ({ ...prev, [productId]: false }));
    }
  };

  // Helper to show error as popup
  const showError = (msg: string) => {
    setError(msg);
    setShowErrorPopup(true);
    setTimeout(() => setShowErrorPopup(false), 4000);
  };

  const validateForm = (): boolean => {
    if (!clientId) {
      showError('Please select a client');
      return false;
    }
    if (products.length === 0) {
      showError('Please add at least one product');
      return false;
    }
    for (const product of products) {
      if (!product.product_name.trim()) {
        showError('All products must have a name');
        return false;
      }
      if (product.provider_id === 0) {
        showError(`Please select a provider for ${product.product_name}`);
        return false;
      }
      if (!product.product_type.trim()) {
        showError(`Please select a product type for ${product.product_name}`);
        return false;
      }
      if (!product.portfolio.name.trim()) {
        showError(`Please enter a portfolio name for product "${product.product_name}"`);
        return false;
      }
      if (product.portfolio.type === 'template') {
        if (!product.portfolio.templateId) {
          showError(`Please select a template portfolio for product "${product.product_name}"`);
          return false;
        }
      } else {
        if (product.portfolio.selectedFunds.length === 0) {
          showError(`Please select at least one fund for the portfolio in product "${product.product_name}"`);
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
      
      // Find the Cashline fund ID (if it exists in our funds list)
      const cashlineFund = funds.find(fund => 
        fund.fund_name.toLowerCase().includes('cashline')
      );
      
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
          if (portfolioId) {
            const fundPromises = product.portfolio.selectedFunds.map(async (fundId) => {
              try {
                await api.post('/portfolio_funds', {
                  portfolio_id: portfolioId,
                  fund_id: fundId,
                  weighting: 0, // Set equal weighting for all funds
                  status: 'active'
                });
                console.log(`Added fund ${fundId} to portfolio ${portfolioId}`);
              } catch (err) {
                console.error(`Error adding fund ${fundId} to portfolio:`, err);
                throw err;
              }
            });
            
            // Add Cashline fund if available
            if (cashlineFund) {
              try {
                await api.post('/portfolio_funds', {
                  portfolio_id: portfolioId,
                  fund_id: cashlineFund.id,
                  weighting: 0, // Set equal weighting
                  status: 'active'
                });
                console.log(`Added Cashline fund ${cashlineFund.id} to portfolio ${portfolioId}`);
              } catch (err) {
                console.error(`Error adding Cashline fund to portfolio:`, err);
                // Continue if Cashline couldn't be added, don't block the rest of the submission
              }
            }

            // Wait for all fund additions to complete
            await Promise.all(fundPromises);
          }
        }

        // Now, create client product with reference to the portfolio
        if (portfolioId) {
          try {
            await api.post('/client_products', {
              client_id: clientId,
              provider_id: product.provider_id,
              product_type: product.product_type,
              product_name: product.product_name,
              portfolio_id: portfolioId,
              status: 'active',
              start_date: formattedStartDate
            });
            console.log(`Created client product for portfolio ${portfolioId}`);
          } catch (err) {
            console.error('Error creating client product:', err);
            throw err;
          }
        }
      }
      
      // Successful completion
      alert('Successfully created client products and portfolios');
      navigate('/products');
    } catch (err: any) {
      console.error('Error in form submission:', err);
      showError(err.response?.data?.detail || 'Failed to create client products');
    } finally {
      setIsSaving(false);
    }
  };

  // Update fund filtering to exclude cashline funds
  const handleFundSearch = (searchTerm: string): void => {
    setFundSearchTerm(searchTerm);
    
    if (!searchTerm) {
      const nonCashlineFunds = funds.filter((fund: Fund) => 
        !fund.fund_name.toLowerCase().includes('cashline') // Exclude any cashline funds
      );
      setFilteredFunds(nonCashlineFunds);
      return;
    }
    
    const term = searchTerm.toLowerCase();
    const filtered = funds.filter((fund: Fund) => 
      (fund.fund_name.toLowerCase().includes(term) || 
      (fund.isin_number && fund.isin_number.toLowerCase().includes(term))) &&
      !fund.fund_name.toLowerCase().includes('cashline') // Also exclude cashline funds from search results
    );
    setFilteredFunds(filtered);
  };

  const renderPortfolioSection = (product: ProductItem): JSX.Element => {
    const isLoadingTemplate = templateLoading[product.id] === true;
    
    return (
      <div className="portfolio-section">
        {/* Show loading overlay when template is loading */}
        {isLoadingTemplate && (
          <div className="absolute inset-0 bg-white bg-opacity-70 flex items-center justify-center z-10">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
          </div>
        )}
        
        {/* Portfolio Type Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Portfolio Type <span className="text-red-500">*</span>
          </label>
          <Radio.Group
            value={product.portfolio.type}
            onChange={(e) => handlePortfolioTypeChange(product.id, e.target.value as 'template' | 'bespoke')}
            disabled={isLoadingTemplate}
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
            <SearchableDropdown
              id={`template-select-${product.id}`}
              options={availableTemplates.map(t => ({ value: t.id.toString(), label: t.name || `Template ${t.id}` }))}
              value={product.portfolio.templateId?.toString() ?? ''}
              onChange={val => handleTemplateSelection(product.id, String(val))}
              placeholder="Select a template"
              className="w-full"
              required
              disabled={isLoadingTemplate}
            />
          </div>
        )}

        {/* Selected Funds Table - Show for both template and bespoke */}
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

        {/* Show fund selection for both template and bespoke portfolios */}
        <div className="fund-selection mt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            {product.portfolio.type === 'template' ? 'Modify Template Funds' : 'Select Funds'}
            {product.portfolio.type === 'template' && (
              <span className="text-xs text-gray-500 ml-2">(modifying will convert to bespoke)</span>
            )}
          </h4>
          <Input
            placeholder="Search funds by name or ISIN"
            value={fundSearchTerm}
            onChange={(e) => handleFundSearch(e.target.value)}
            style={{ marginBottom: '1rem' }}
            disabled={isLoadingTemplate}
          />
          <div className="fund-list max-h-60 overflow-y-auto border rounded-md p-2">
            {filteredFunds.map(fund => (
              <div key={fund.id} className="fund-item hover:bg-gray-50 p-1">
                <Checkbox
                  checked={product.portfolio.selectedFunds.includes(fund.id)}
                  onChange={() => handleFundSelection(product.id, fund.id)}
                  disabled={isLoadingTemplate}
                >
                  {fund.fund_name} ({fund.isin_number})
                </Checkbox>
              </div>
            ))}
          </div>
        </div>
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
      {/* Error Popup (always rendered, floating) */}
      {showErrorPopup && error && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 bg-red-600 text-white px-6 py-3 rounded shadow-lg flex items-center space-x-2">
          <span>{error}</span>
          <button
            className="ml-4 text-white hover:text-gray-200 text-xl font-bold focus:outline-none"
            onClick={() => setShowErrorPopup(false)}
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}
      {/* Main content */}
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
      ) : (
        <div className="bg-white shadow-md rounded-lg p-6">
          <form onSubmit={handleSubmit}>
            {/* Client Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Client <span className="text-red-500">*</span>
              </label>
              {clients.length > 0 ? (
                <SearchableDropdown
                  id="client-select"
                  options={clients.map(c => ({ 
                    value: c.id, 
                    label: `${c.forname || ''} ${c.surname || ''}`.trim() 
                  }))}
                  value={clientId ?? ''}
                  onChange={val => handleClientChange(Number(val))}
                  placeholder="Select a client"
                  className="w-full"
                  required
                />
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
                    <div 
                      key={product.id} 
                      className="border rounded-md p-6 mb-6 bg-gray-50 relative"
                      ref={el => productRefs.current[product.id] = el}
                      id={`product-${product.id}`}
                    >
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
                          <SearchableDropdown
                            id={`provider-select-${product.id}`}
                            options={providers.map(p => ({ value: p.id, label: p.name }))}
                            value={product.provider_id}
                            onChange={val => handleProductChange(product.id, 'provider_id', Number(val))}
                            placeholder="Select a provider"
                            className="w-full"
                            required
                          />
                        </div>

                        {/* Product Type */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Product Type <span className="text-red-500">*</span>
                          </label>
                          <SearchableDropdown
                            id={`product-type-select-${product.id}`}
                            options={[
                              { value: 'ISA', label: 'ISA' },
                              { value: 'JISA', label: 'Junior ISA' },
                              { value: 'SIPP', label: 'SIPP' },
                              { value: 'GIA', label: 'GIA' },
                              { value: 'Offshore Bond', label: 'Offshore Bond' },
                              { value: 'Onshore Bond', label: 'Onshore Bond' },
                              { value: 'Trust', label: 'Trust' },
                              { value: 'Other', label: 'Other' },
                            ]}
                            value={product.product_type}
                            onChange={val => handleProductTypeChange(product.id, String(val))}
                            placeholder="Select product type"
                            className="w-full"
                            required
                          />
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