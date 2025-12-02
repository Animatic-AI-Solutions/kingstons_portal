import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Radio, Select, Input, Form, Button, message, RadioChangeEvent, DatePicker } from 'antd';
import type { SelectValue } from 'antd/es/select';
import moment from 'moment';
import type { Moment } from 'moment';
import api from '../services/api';
import AddFundModal from '../components/AddFundModal';
import '../styles/PortfolioTemplate.css';
import DynamicPageContainer from '../components/DynamicPageContainer';

interface Client {
  id: number;
  name: string;
}

interface Provider {
  id: number;
  name: string;
  status: string;
}

interface Portfolio {
  id: number;
  portfolio_name: string;
  status: string;
}

interface Product {
  id: number;
  product_name: string;
  product_type: string;
  available_providers_id: number;
  status: string;
}

interface ProductItem {
  id: string; // Temporary id for UI
  name: string;
  productType: string;
  portfolio_id: number | 'new';
  provider_id: number;
  allocation: number;
  portfolioType: 'template' | 'bespoke';
  templateId?: number;
  // For new portfolio creation
  newPortfolio?: {
    name: string;
    status: string;
    // Fund management
    selectedFunds: number[];
    fundWeightings: Record<string, string>; // Fund ID to weighting percentage
    isFromTemplate?: boolean;
  };
}

interface Fund {
  id: number;
  fund_name: string;
  status: string;
  isin_number: string;
}

interface PortfolioMode {
  type: 'template' | 'bespoke';
  templateId?: number;
  customName?: string;
}

interface TemplatePortfolio {
  id: number;
  name: string;
}

const AddAccount: React.FC = () => {
  const navigate = useNavigate();
  const { api } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [availableFunds, setAvailableFunds] = useState<Record<string, Fund[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingFunds, setIsLoadingFunds] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<moment.Moment>(moment()); // Default to today

  // Form state
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [portfolioMode, setPortfolioMode] = useState<PortfolioMode>({
    type: 'bespoke'
  });
  const [availableTemplates, setAvailableTemplates] = useState<TemplatePortfolio[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);

  // State for fund modal
  const [isAddFundModalOpen, setIsAddFundModalOpen] = useState(false);
  const [fundSearchTerms, setFundSearchTerms] = useState<Record<string, string>>({});

  // State for fund dropdown display
  const [showFundDropdowns, setShowFundDropdowns] = useState<Record<string, boolean>>({});

  // Fetch necessary data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        console.log("Fetching data for AddAccount...");
        
        // Fetch all necessary data in parallel
        const [clientsResponse, providersResponse, portfoliosResponse] = await Promise.all([
          api.get('/client_groups'),
          api.get('/available_providers'),
          api.get('/portfolios')
        ]);
        
        setClients(clientsResponse.data);
        setProviders(providersResponse.data);
        setPortfolios(portfoliosResponse.data);
        
        // Set defaults
        if (clientsResponse.data.length > 0) {
          setSelectedClientId(clientsResponse.data[0].id);
        }
        
        // Don't try to automatically set provider or fetch products here
        
        console.log("Data fetched successfully for AddAccount");
      } catch (err: any) {
        console.error('Error fetching data:', err);
        setError(err.response?.data?.detail || 'Failed to fetch data');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [api]);

  useEffect(() => {
    // Fetch available portfolio templates
    const fetchTemplates = async () => {
      try {
        const templates = await api.get('/available_portfolios');
        setAvailableTemplates(templates.data);
      } catch (error) {
        console.error('Error loading templates:', error);
      }
    };
    fetchTemplates();
  }, []);

  useEffect(() => {
    // Fetch template details when one is selected
    const fetchTemplateDetails = async () => {
      if (portfolioMode.templateId) {
        try {
          const details = await api.get(`/available_portfolios/${portfolioMode.templateId}`);
          setSelectedTemplate(details.data);
        } catch (error) {
          console.error('Error loading template details:', error);
        }
      }
    };
    if (portfolioMode.templateId) {
      fetchTemplateDetails();
    }
  }, [portfolioMode.templateId]);

  const handleAddProduct = () => {
    // Create a new empty product with a unique temporary ID
    const newProduct: ProductItem = {
      id: `temp-${Date.now()}`,
      name: `Product ${products.length + 1}`,
      productType: 'Investment',
      portfolio_id: 'new', // Always create a new portfolio
      provider_id: 0, // No provider selected by default
      allocation: 0,
      portfolioType: 'bespoke',
      newPortfolio: {
        name: '',
        status: 'active',
        selectedFunds: [],
        fundWeightings: {},
        isFromTemplate: false
      }
    };
    setProducts([...products, newProduct]);
  };

  const handleRemoveProduct = (id: string) => {
    setProducts(products.filter(product => product.id !== id));
  };

  const handleProductChange = (id: string, field: keyof ProductItem, value: any) => {
    setProducts(products.map(product => {
      if (product.id === id) {
        // When provider changes, fetch funds for this provider
        if (field === 'provider_id') {
          fetchFundsForProvider(value, product.id);
        }
        
        return { ...product, [field]: value };
      }
      return product;
    }));
  };

  const handleNewPortfolioChange = (productId: string, field: string, value: string) => {
    setProducts(products.map(product => {
      if (product.id === productId && product.newPortfolio) {
        return {
          ...product,
          newPortfolio: {
            ...product.newPortfolio,
            [field]: value
          }
        };
      }
      return product;
    }));
  };

  const fetchFundsForProvider = async (providerId: number, productId: string) => {
    if (!providerId) return;
    
    // If we already have funds for this provider, don't fetch again
    if (availableFunds[providerId]) return;
    
    setIsLoadingFunds(prev => ({ ...prev, [productId]: true }));
    
    try {
      const response = await api.get('/funds');
      
      // Filter out the cash fund (it should not be user-selectable)
      const filteredFunds = response.data.filter((fund: Fund) => !(fund.fund_name === "Cash" && fund.isin_number === "N/A"));
      
      setAvailableFunds(prev => ({
        ...prev,
        [providerId]: filteredFunds
      }));
    } catch (err: any) {
      console.error('Error fetching funds:', err);
      // Don't show error to user, just set empty array
      setAvailableFunds(prev => ({
        ...prev,
        [providerId]: []
      }));
    } finally {
      setIsLoadingFunds(prev => ({ ...prev, [productId]: false }));
    }
  };

  const handleFundSelection = (productId: string, fundId: number) => {
    setProducts(products.map(product => {
      if (product.id === productId && product.newPortfolio) {
        const selectedFunds = [...product.newPortfolio.selectedFunds];
        const fundWeightings = { ...product.newPortfolio.fundWeightings };
        
        if (selectedFunds.includes(fundId)) {
          // Remove fund
          const newSelectedFunds = selectedFunds.filter(id => id !== fundId);
          delete fundWeightings[fundId.toString()];
          
          // Recalculate equal weightings for remaining funds
          if (newSelectedFunds.length > 0) {
            const equalWeight = (100 / newSelectedFunds.length).toFixed(2);
            newSelectedFunds.forEach(id => {
              fundWeightings[id.toString()] = equalWeight;
            });
          }
          
          return {
            ...product,
            newPortfolio: {
              ...product.newPortfolio,
              selectedFunds: newSelectedFunds,
              fundWeightings
            }
          };
        } else {
          // Add fund
          const newSelectedFunds = [...selectedFunds, fundId];
          
          // Calculate equal weightings
          const equalWeight = (100 / newSelectedFunds.length).toFixed(2);
          const newWeightings: Record<string, string> = {};
          
          newSelectedFunds.forEach(id => {
            newWeightings[id.toString()] = equalWeight;
          });
          
          return {
            ...product,
            newPortfolio: {
              ...product.newPortfolio,
              selectedFunds: newSelectedFunds,
              fundWeightings: newWeightings
            }
          };
        }
      }
      return product;
    }));
  };

  const handleFundWeightingChange = (productId: string, fundId: number, value: string) => {
    // Ensure value is a valid number
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < 0 || numValue > 100) {
      return;
    }
    
    setProducts(products.map(product => {
      if (product.id === productId && product.newPortfolio) {
        return {
          ...product,
          newPortfolio: {
            ...product.newPortfolio,
            fundWeightings: {
              ...product.newPortfolio.fundWeightings,
              [fundId.toString()]: value
            }
          }
        };
      }
      return product;
    }));
  };

  // Add a helper function to check if a product has a complete portfolio
  const isPortfolioComplete = (product: ProductItem): boolean => {
    if (!product.newPortfolio) return false;
    if (!product.newPortfolio.name) return false;
    if (!product.provider_id) return false;
    if (product.newPortfolio.selectedFunds.length === 0) return false;
    
    // Check if fund weightings sum to 100%
    const totalWeight = Object.values(product.newPortfolio.fundWeightings)
      .reduce((sum, weight) => sum + parseFloat(weight || '0'), 0);
    if (Math.abs(totalWeight - 100) > 0.01) return false;
    
    return true;
  };

  // Add a function to check if all products have complete portfolios
  const areAllPortfoliosComplete = (): boolean => {
    if (products.length === 0) return false;
    return products.every(isPortfolioComplete);
  };

  const validateForm = (): boolean => {
    if (!selectedClientId) {
      setError('Please select a client');
      return false;
    }
    
    if (products.length === 0) {
      setError('Please add at least one product');
      return false;
    }
    
    for (const product of products) {
      if (!product.name) {
        setError('Please enter a name for all products');
        return false;
      }
      
      if (product.allocation <= 0) {
        setError(`Allocation for ${product.name} must be greater than 0%`);
        return false;
      }
      
      if (!product.provider_id) {
        setError(`Please select a provider for ${product.name}`);
        return false;
      }
      
      // Portfolio validation - mandatory
      if (!product.newPortfolio || !product.newPortfolio.name) {
        setError(`Please enter a name for the portfolio in ${product.name}`);
        return false;
      }
      
      // Validate fund selections - mandatory
      if (!product.newPortfolio.selectedFunds || product.newPortfolio.selectedFunds.length === 0) {
        setError(`Please select at least one fund for the portfolio in ${product.name}`);
        return false;
      }
      
      // Validate fund weightings sum to 100%
      const totalWeight = Object.values(product.newPortfolio.fundWeightings)
        .reduce((sum, weight) => sum + parseFloat(weight || '0'), 0);
      
      if (Math.abs(totalWeight - 100) > 0.01) {
        setError(`Fund weightings in ${product.name} must sum to 100% (current: ${totalWeight.toFixed(2)}%)`);
        return false;
      }
    }

    // Total allocation should be 100%
    const totalAllocation = products.reduce((sum, product) => sum + product.allocation, 0);
    if (Math.abs(totalAllocation - 100) > 0.01) {
      setError(`Total allocation (${totalAllocation}%) must equal 100%`);
      return false;
    }

    return true;
  };

  const handlePortfolioTypeChange = async (productId: string, type: 'template' | 'bespoke') => {
    setProducts(products.map(product => {
      if (product.id === productId) {
        return {
          ...product,
          portfolioType: type,
          templateId: undefined,
          newPortfolio: {
            name: '',
            status: 'active',
            selectedFunds: [],
            fundWeightings: {},
            isFromTemplate: type === 'template'
          }
        };
      }
      return product;
    }));
  };

  const handleTemplateSelection = async (productId: string, templateId: number) => {
    try {
      const response = await api.get(`/available_portfolios/${templateId}`);
      const template = response.data;
      
      setProducts(products.map(product => {
        if (product.id === productId) {
          return {
            ...product,
            portfolioType: 'template' as const,
            templateId,
            newPortfolio: {
              name: template.name,
              status: 'active',
              selectedFunds: template.funds.map((f: any) => f.available_fund),
              fundWeightings: template.funds.reduce((acc: Record<string, string>, f: any) => {
                acc[f.available_fund] = f.target_weighting.toString();
                return acc;
              }, {}),
              isFromTemplate: true
            }
          };
        }
        return product;
      }));
    } catch (error) {
      console.error('Error loading template details:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate the form data
    if (!validateForm()) {
      return;
    }

    // Start loading
    setIsSaving(true);

    try {
      // First, create an account for this client
      const accountData = {
        client_id: selectedClientId,
        product_name: products[0].name,
        status: 'active',
        start_date: startDate.format('YYYY-MM-DD'),
        provider_id: products[0].provider_id,
        product_type: products[0].productType,
        skip_portfolio_creation: true // Don't create portfolio automatically
      };

      const response = await api.post('/client_products', accountData);
      const newAccountId = response.data.id;

      // Create a portfolio if selected
      if (products[0].portfolioType === 'template' && products[0].templateId) {
        // Create portfolio from template
        const portfolioResponse = await api.post('/portfolios/from_template', {
          template_id: products[0].templateId,
          portfolio_name: products[0].newPortfolio?.name || `${products[0].name} Portfolio`
        });
        
        // Attach the portfolio to the account
        await api.post('/product_portfolio_assignments', {
          product_id: newAccountId,
          portfolio_id: portfolioResponse.data.id,
          start_date: startDate.format('YYYY-MM-DD')
        });
      } else if (products[0].portfolioType === 'bespoke' && products[0].newPortfolio) {
        // For custom portfolios, explicitly include the selected start date
        const portfolioData = {
          portfolio_name: products[0].newPortfolio.name || `${products[0].name} Portfolio`,
          status: 'active',
          start_date: startDate.format('YYYY-MM-DD')
        };
        
        // Create the portfolio with the selected start date
        const portfolioResponse = await api.post('/portfolios', portfolioData);
        
        // Add funds to portfolio with the same date
        if (products[0].newPortfolio.selectedFunds && products[0].newPortfolio.selectedFunds.length > 0) {
          for (const fundId of products[0].newPortfolio.selectedFunds) {
            const weighting = parseFloat(products[0].newPortfolio.fundWeightings[fundId] || '0');
            if (weighting > 0) {
              await api.post('/portfolio_funds', {
                portfolio_id: portfolioResponse.data.id,
                available_funds_id: fundId,
                target_weighting: weighting,
                start_date: startDate.format('YYYY-MM-DD'),
                amount_invested: 0 // Will be updated later
              });
            }
          }
        }

        // Attach the portfolio to the account
        await api.post('/product_portfolio_assignments', {
          product_id: newAccountId,
          portfolio_id: portfolioResponse.data.id,
          start_date: startDate.format('YYYY-MM-DD')
        });
      }

      // Navigate back to accounts page with a success message
      message.success('Product created successfully!');
      navigate('/products', {
        state: {
          notification: {
            type: 'success',
            message: 'Product created successfully!'
          }
        }
      });
    } catch (error: any) {
      console.error('Error creating product:', error);
      setError(error.response?.data?.detail || 'Failed to create product.');
    } finally {
      setIsSaving(false);
    }
  };

  const renderPortfolioSelection = () => {
    return (
      <div className="portfolio-selection">
        <Form.Item label="Portfolio Type" className="template-selection">
          <Radio.Group
            value={portfolioMode.type}
            onChange={(e: RadioChangeEvent) => setPortfolioMode({ type: e.target.value })}
          >
            <Radio value="template">Use Template Portfolio</Radio>
            <Radio value="bespoke">Create Custom Portfolio</Radio>
          </Radio.Group>
        </Form.Item>

        {portfolioMode.type === 'template' && (
          <>
            <Form.Item label="Select Template">
              <Select
                className="w-full"
                placeholder="Choose a portfolio template"
                onChange={(value: SelectValue) => setPortfolioMode({
                  ...portfolioMode,
                  templateId: value as number
                })}
              >
                {availableTemplates.map(template => (
                  <Select.Option key={template.id} value={template.id}>
                    {template.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            {selectedTemplate && (
              <div className="template-details">
                <h3 className="text-lg font-semibold mb-4">Template Funds</h3>
                <table className="funds-table">
                  <thead>
                    <tr>
                      <th>Fund Name</th>
                      <th>Target Weighting</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedTemplate.funds.map((fund: any) => (
                      <tr key={fund.id}>
                        <td>{fund.fund?.fund_name || 'Unknown Fund'}</td>
                        <td>{fund.target_weighting}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
        </div>
            )}

            <Form.Item label="Portfolio Name" className="custom-name-input">
              <Input
                placeholder="Enter a name for this portfolio"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPortfolioMode({
                  ...portfolioMode,
                  customName: e.target.value
                })}
              />
            </Form.Item>
          </>
        )}
      </div>
    );
  };

  // Add this new function to render the portfolio section
  const renderPortfolioSection = (product: ProductItem) => {
  return (
      <div className="portfolio-section mt-4 border-t pt-4">
        <h3 className="text-lg font-semibold mb-4">Portfolio Configuration</h3>
        
        {/* Portfolio Type Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Portfolio Type
          </label>
          <Radio.Group
            value={product.portfolioType}
            onChange={(e) => handlePortfolioTypeChange(product.id, e.target.value)}
          >
            <Radio value="template">Use Template Portfolio</Radio>
            <Radio value="bespoke">Create Custom Portfolio</Radio>
          </Radio.Group>
      </div>

        {/* Template Selection */}
        {product.portfolioType === 'template' && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Template
            </label>
            <Select
              className="w-full"
              placeholder="Choose a portfolio template"
              value={product.templateId}
              onChange={(value) => handleTemplateSelection(product.id, value)}
            >
              {availableTemplates.map(template => (
                <Select.Option key={template.id} value={template.id}>
                  {template.name}
                </Select.Option>
              ))}
            </Select>

            {/* Show selected template funds */}
            {product.newPortfolio?.isFromTemplate && (
              <div className="mt-4">
                <h4 className="text-md font-medium mb-2">Template Funds</h4>
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 text-left">Fund Name</th>
                      <th className="px-4 py-2 text-right">Target Weighting</th>
                    </tr>
                  </thead>
                  <tbody>
                    {product.newPortfolio.selectedFunds.map((fundId) => {
                      const fund = availableFunds[product.provider_id]?.find(f => f.id === fundId);
                      return (
                        <tr key={fundId} className="border-b">
                          <td className="px-4 py-2">{fund?.fund_name || 'Unknown Fund'}</td>
                          <td className="px-4 py-2 text-right">
                            {product.newPortfolio?.fundWeightings[fundId]}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
            </div>
            )}
        </div>
      )}

        {/* Portfolio Name */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Portfolio Name
              </label>
          <Input
            placeholder="Enter portfolio name"
            value={product.newPortfolio?.name || ''}
            onChange={(e) => handleNewPortfolioChange(product.id, 'name', e.target.value)}
          />
            </div>

        {/* Show fund selection only for bespoke portfolios */}
        {product.portfolioType === 'bespoke' && (
          <div className="fund-selection">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Select Funds</h4>
            
            {/* Fund search and add button row */}
            <div className="flex gap-2 mb-3">
              <div className="flex-1">
                <Input
                  placeholder="Search funds by name or ISIN"
                  value={fundSearchTerms[product.id] || ''}
                  onChange={(e) => handleFundSearch(product.id, e.target.value)}
                  className="w-full"
                />
              </div>
              <Button
                type="primary"
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                }
                onClick={() => setIsAddFundModalOpen(true)}
                className="flex items-center"
                title="Add new fund"
              >
                Add Fund
              </Button>
            </div>

            {/* Loading state */}
            {isLoadingFunds[product.id] && (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
              </div>
            )}

            {/* Fund selection list */}
            {!isLoadingFunds[product.id] && product.provider_id && availableFunds[product.provider_id] && (
              <div className="border rounded-md max-h-60 overflow-y-auto">
                {availableFunds[product.provider_id]
                  .filter(fund => {
                    const searchTerm = fundSearchTerms[product.id]?.toLowerCase() || '';
                    return fund.fund_name.toLowerCase().includes(searchTerm) ||
                           fund.isin_number.toLowerCase().includes(searchTerm);
                  })
                  .map(fund => (
                    <div
                      key={fund.id}
                      className={`p-3 border-b border-gray-200 last:border-b-0 hover:bg-gray-50 cursor-pointer ${
                        product.newPortfolio?.selectedFunds.includes(fund.id) ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => handleFundSelection(product.id, fund.id)}
                    >
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={product.newPortfolio?.selectedFunds.includes(fund.id) || false}
                          onChange={() => handleFundSelection(product.id, fund.id)}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded mr-3"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">{fund.fund_name}</div>
                          <div className="text-xs text-gray-500">{fund.isin_number}</div>
                        </div>
                        {product.newPortfolio?.selectedFunds.includes(fund.id) && (
                          <div className="ml-2">
                            <input
                              type="number"
                              placeholder="Weight %"
                              value={product.newPortfolio?.fundWeightings?.[fund.id] || ''}
                              onChange={(e) => handleFundWeightingChange(product.id, fund.id, e.target.value)}
                              className="w-20 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              onClick={(e) => e.stopPropagation()}
                              min="0"
                              max="100"
                              step="0.01"
                            />
                            <span className="text-xs text-gray-500 ml-1">%</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                }
                
                {/* No funds message */}
                {availableFunds[product.provider_id]?.length === 0 && (
                  <div className="p-4 text-center text-gray-500">
                    No funds available for this provider
                  </div>
                )}
                
                {/* No search results */}
                {availableFunds[product.provider_id]?.length > 0 && 
                 availableFunds[product.provider_id]
                   .filter(fund => {
                     const searchTerm = fundSearchTerms[product.id]?.toLowerCase() || '';
                     return fund.fund_name.toLowerCase().includes(searchTerm) ||
                            fund.isin_number.toLowerCase().includes(searchTerm);
                   }).length === 0 && (
                  <div className="p-4 text-center text-gray-500">
                    No funds match your search criteria
                  </div>
                )}
              </div>
            )}

            {/* Selected funds summary */}
            {product.newPortfolio && product.newPortfolio.selectedFunds.length > 0 && (
              <div className="mt-3 p-3 bg-gray-50 rounded-md">
                <div className="text-xs font-medium text-gray-700 mb-2">
                  Selected Funds ({product.newPortfolio.selectedFunds.length})
                </div>
                <div className="space-y-1">
                  {product.newPortfolio.selectedFunds.map(fundId => {
                    const fund = availableFunds[product.provider_id]?.find(f => f.id === fundId);
                    const weight = product.newPortfolio?.fundWeightings?.[fundId];
                    return (
                      <div key={fundId} className="flex justify-between text-xs">
                        <span className="text-gray-600">{fund?.fund_name || 'Unknown Fund'}</span>
                        <span className="text-gray-500">{weight ? `${weight}%` : 'No weight'}</span>
                      </div>
                    );
                  })}
                </div>
                
                {/* Total weighting display */}
                {(() => {
                  const totalWeight = product.newPortfolio?.selectedFunds.reduce((sum, fundId) => {
                    const weight = parseFloat(product.newPortfolio?.fundWeightings?.[fundId] || '0');
                    return sum + (isNaN(weight) ? 0 : weight);
                  }, 0) || 0;
                  
                  return (
                    <div className={`mt-2 pt-2 border-t border-gray-200 text-xs font-medium ${
                      Math.abs(totalWeight - 100) < 0.01 ? 'text-green-600' : 
                      totalWeight > 100 ? 'text-red-600' : 'text-yellow-600'
                    }`}>
                      Total: {totalWeight.toFixed(2)}% 
                      {Math.abs(totalWeight - 100) < 0.01 && ' ✓'}
                      {totalWeight > 100 && ' (exceeds 100%)'}
                      {totalWeight < 100 && totalWeight > 0 && ' (incomplete)'}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Instruction message */}
            {!product.provider_id && (
              <div className="p-4 text-center text-gray-500 bg-gray-50 rounded-md">
                Please select a provider first to see available funds
              </div>
            )}
          </div>
        )}
            </div>
    );
  };

  // Update the renderProduct function to use the new portfolio section
  const renderProduct = (product: ProductItem, index: number) => {
    return (
      <div key={product.id} className="product-item border rounded-lg p-4 mb-4">
                    <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Product {index + 1}</h3>
          <Button
            type="link"
            danger
                        onClick={() => handleRemoveProduct(product.id)}
          >
            Remove
          </Button>
                    </div>

        {/* Product Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
                      {/* Product Name */}
                      <div>
                        <label htmlFor={`product-name-${product.id}`} className="block text-sm font-medium text-gray-700 mb-1">
                          Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          id={`product-name-${product.id}`}
                          value={product.name}
                          onChange={(e) => handleProductChange(product.id, 'name', e.target.value)}
                          className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          required
                        />
                      </div>

                      {/* Product Type */}
                      <div>
                        <label htmlFor={`product-type-${product.id}`} className="block text-sm font-medium text-gray-700 mb-1">
                          Product Type <span className="text-red-500">*</span>
                        </label>
                        <select
                          id={`product-type-${product.id}`}
                          value={product.productType || 'Investment'}
                          onChange={(e) => handleProductChange(product.id, 'productType', e.target.value)}
                          className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          required
                        >
                          <option value="Investment">Investment</option>
                          <option value="Pension">Pension</option>
                          <option value="Savings">Savings</option>
                          <option value="ISA">ISA</option>
                          <option value="Bond">Bond</option>
                        </select>
                      </div>

                      {/* Provider Selection */}
                      <div>
                        <label htmlFor={`provider-${product.id}`} className="block text-sm font-medium text-gray-700 mb-1">
                          Provider <span className="text-red-500">*</span>
                        </label>
                        <select
                          id={`provider-${product.id}`}
                          value={product.provider_id || ''}
                          onChange={(e) => handleProductChange(product.id, 'provider_id', parseInt(e.target.value))}
                          className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          required
                        >
                          <option value="">Select a provider</option>
                          {providers.map((provider) => (
                            <option key={provider.id} value={provider.id}>{provider.name}</option>
                          ))}
                        </select>
                      </div>

                      {/* Allocation */}
                      <div>
                        <label htmlFor={`allocation-${product.id}`} className="block text-sm font-medium text-gray-700 mb-1">
                          Allocation (%) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          id={`allocation-${product.id}`}
                          value={product.allocation || ''}
                          onChange={(e) => handleProductChange(product.id, 'allocation', parseFloat(e.target.value) || 0)}
                          className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                          min="0"
                          max="100"
                          step="0.01"
                          required
                        />
                      </div>
                    </div>

        {/* Portfolio Section */}
        {renderPortfolioSection(product)}
                    </div>
    );
  };

  const handleFundAdded = (newFund: Fund) => {
    // Add the new fund to the availableFunds for all providers
    setAvailableFunds(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(providerId => {
        updated[providerId] = [...updated[providerId], newFund];
      });
      return updated;
    });
    
    // Show success message
    message.success(`Fund "${newFund.fund_name}" has been created successfully!`);
  };

  const handleFundSearch = (productId: string, searchTerm: string) => {
    setFundSearchTerms(prev => ({
      ...prev,
      [productId]: searchTerm
    }));
  };

  if (isLoading) {
    return (
      <div 
        className="w-full mx-auto py-10"
        style={{ 
          maxWidth: '2800px',
          paddingLeft: '8px',
          paddingRight: '8px'
        }}
      >
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600"></div>
                          </div>
                        </div>
    );
  }

  return (
    <DynamicPageContainer 
      maxWidth="2800px"
      className="py-10"
      customPadding="px-4 sm:px-6 lg:px-4 xl:px-2"
    >
      <div 
        className="w-full mx-auto py-10"
        style={{ 
          maxWidth: '2800px',
          paddingLeft: '8px',
          paddingRight: '8px'
        }}
      >
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-normal text-gray-900 font-sans tracking-wide">Create New Account</h1>
        <button 
          onClick={() => navigate('/accounts')}
          className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
        >
          Cancel
        </button>
      </div>
                          
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
                              <div className="flex">
                                <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                  </svg>
                                </div>
                                <div className="ml-3">
              <p className="text-red-700 text-sm">{error}</p>
                                    </div>
                                  </div>
                                </div>
                              )}

      <div className="bg-white shadow rounded-lg p-6">
        <Form onFinish={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
            {/* Client Selection */}
            <div>
              <label htmlFor="client" className="block text-sm font-medium text-gray-700 mb-1">
                Client <span className="text-red-500">*</span>
              </label>
              <select
                id="client"
                value={selectedClientId || ''}
                onChange={(e) => setSelectedClientId(e.target.value ? parseInt(e.target.value) : null)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                required
              >
                <option value="">Select a client</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>{client.name}</option>
                ))}
              </select>
            </div>

            {/* Account Name */}
            <div>
              <label htmlFor="accountName" className="block text-sm font-medium text-gray-700 mb-1">
                Account Name <span className="text-red-500">*</span>
              </label>
              <Form.Item name="accountName" noStyle rules={[{ required: true, message: 'Please enter an account name' }]}>
                <Input 
                  id="accountName"
                  placeholder="Enter account name"
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </Form.Item>
            </div>
            
            {/* Start Date */}
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
                Start Date <span className="text-red-500">*</span>
              </label>
              <DatePicker 
                id="startDate"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                value={startDate}
                onChange={(date) => setStartDate(date || moment())}
              />
              <p className="mt-1 text-sm text-gray-500">
                This date will be used for the account, portfolio, and all funds
              </p>
            </div>
          </div>

          {/* Products Section */}
          <div className="mt-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Products & Portfolios</h2>
              <button
                type="button"
                onClick={handleAddProduct}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                Add Product
              </button>
                    </div>

            {products.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-md border border-gray-200">
                <p className="text-gray-500">No products added yet. Click "Add Product" to start.</p>
                  </div>
            ) : (
              <div className="space-y-4">
                {products.map((product, index) => renderProduct(product, index))}
              </div>
            )}
          </div>

          {/* Add portfolio selection section */}
          {renderPortfolioSelection()}

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSaving || !areAllPortfoliosComplete() || products.length === 0}
              className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
                isSaving || !areAllPortfoliosComplete() || products.length === 0
                ? 'bg-indigo-400 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
              }`}
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating Accounts...
                </>
              ) : !areAllPortfoliosComplete() ? (
                'Complete All Portfolios to Continue'
              ) : (
                'Create Accounts'
              )}
            </button>
          </div>
        </Form>
      </div>

      {/* Add Fund Modal */}
      <AddFundModal
        isOpen={isAddFundModalOpen}
        onClose={() => setIsAddFundModalOpen(false)}
        onSuccess={handleFundAdded}
      />
    </DynamicPageContainer>
  );
};

export default AddAccount; 