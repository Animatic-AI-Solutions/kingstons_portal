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

interface Product {
  id: number;
  product_name: string;
  product_type: string;
  available_providers_id: number;
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

interface AccountItem {
  id: string; // Temporary ID for UI
  client_id: number;
  available_products_id: number;
  account_name: string;
  status: string;
  weighting: number;
  start_date?: dayjs.Dayjs; // Use dayjs type
  portfolio: {
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

const CreateClientAccounts: React.FC = (): JSX.Element => {
  const navigate = useNavigate();
  const { api } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [funds, setFunds] = useState<Fund[]>([]);
  const [availableTemplates, setAvailableTemplates] = useState<PortfolioTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [clientId, setClientId] = useState<number | null>(null);
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [providerProducts, setProviderProducts] = useState<Record<number, Product[]>>({});
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
        console.log("Fetching data for CreateClientAccounts...");
        
        // Fetch all necessary data in parallel
        const [
          clientsRes,
          providersRes,
          productsRes,
          fundsRes,
          portfoliosRes
        ] = await Promise.all([
          api.get('/clients'),
          api.get('/available_providers'),
          api.get('/available_products'),
          api.get('/funds'),
          api.get('/available_portfolios')
        ]);
        
        setClients(clientsRes.data);
        setProviders(providersRes.data);
        setProducts(productsRes.data);
        setFunds(fundsRes.data);
        setAvailableTemplates(portfoliosRes.data);
        
        // Set defaults
        if (clientsRes.data.length > 0) {
          setClientId(clientsRes.data[0].id);
        }
        
        console.log("Data fetched successfully for CreateClientAccounts");
      } catch (err: any) {
        console.error('Error fetching data:', err);
        setError(err.response?.data?.detail || 'Failed to fetch data');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [api]);

  // Add a new useEffect to load funds for accounts that already have a product selected
  useEffect(() => {
    // Only load funds for accounts that have a product selected but don't have funds loaded yet
    accounts.forEach(account => {
      if (account.available_products_id > 0 && !availableFundsByProvider[account.available_products_id]) {
        loadFundsForProduct(account.available_products_id, account.id);
      }
    });
  }, [accounts.map(account => account.available_products_id).join(',')]); // Only re-run when product selections change

  const handleClientChange = (clientId: number) => {
    setClientId(clientId);
    
    // Reset accounts when client changes
    if (accounts.length > 0) {
      if (window.confirm('Changing client will clear all current accounts. Continue?')) {
        setAccounts([]);
      } else {
        return;
      }
    }
  };

  const handleAddAccount = () => {
    if (!clientId) {
      setError('Please select a client first');
      return;
    }
    
    // Create a new empty account with a temporary ID
    const newAccount: AccountItem = {
      id: `temp-${Date.now()}`,
      client_id: clientId,
      available_products_id: 0,
      account_name: `Account ${accounts.length + 1}`,
      status: 'active',
      weighting: 0, // Set default weighting to 0
      start_date: startDate, // Use the selected start date
      portfolio: {
        name: '',
        selectedFunds: [],
        type: 'bespoke',
        fundWeightings: {}
      }
    };
    
    setAccounts([...accounts, newAccount]);
  };

  const handleRemoveAccount = (id: string) => {
    setAccounts(prevAccounts => prevAccounts.filter(account => account.id !== id));
    setError(null);
  };

  // Update account amounts based on total amount and weightings
  const updateAccountAmounts = () => {
    if (accounts.length === 0) return;
    
    setAccounts(accounts.map(account => ({
      ...account,
      weighting: account.weighting
    })));
  };

  const handleAccountChange = (accountId: string, field: string, value: any) => {
    setAccounts(prevAccounts => {
      const updatedAccounts = prevAccounts.map(account => {
        if (account.id === accountId) {
          const updatedAccount = { ...account, [field]: value };
          
          // If weighting is changed, recalculate the total_amount based on the weighting
          if (field === 'weighting') {
            updatedAccount.weighting = value;
          }
          
          return updatedAccount;
        }
        return account;
      });
      
      return updatedAccounts;
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
    if (!searchTerm.trim()) return products;
    
    const term = searchTerm.toLowerCase();
    return products.filter(product => 
      product.product_name.toLowerCase().includes(term) || 
      product.product_type.toLowerCase().includes(term)
    );
  };

  const handleSelectProduct = (accountId: string, productId: number, productName: string) => {
    handleAccountChange(accountId, 'available_products_id', productId);
    toggleProductDropdown(accountId, false);
    // Load funds for the selected product
    loadFundsForProduct(productId, accountId);
  };

  // Add handlers for fund selection
  const handlePortfolioNameChange = (accountId: string, name: string) => {
    setAccounts(prevAccounts => prevAccounts.map(account => {
      if (account.id === accountId) {
        return {
          ...account,
          portfolio: {
            ...account.portfolio,
            name: name
          }
        };
      }
      return account;
    }));
  };
  
  const handleFundSelection = (accountId: string, fundId: number) => {
    setAccounts(prevAccounts => prevAccounts.map(account => {
      if (account.id === accountId) {
        const selectedFunds = [...account.portfolio.selectedFunds];
        if (selectedFunds.includes(fundId)) {
          // Remove fund
          return {
            ...account,
            portfolio: {
              ...account.portfolio,
              selectedFunds: selectedFunds.filter(id => id !== fundId)
            }
          };
        } else {
          // Add fund
          return {
            ...account,
            portfolio: {
              ...account.portfolio,
              selectedFunds: [...selectedFunds, fundId]
            }
          };
        }
      }
      return account;
    }));
  };
  
  const calculateTotalFundWeighting = (account: AccountItem): number => {
    return account.portfolio.selectedFunds.length;
  };
  
  const loadFundsForProduct = async (productId: number, accountId: string) => {
    if (!productId) return;
    
    setIsLoadingFunds(prev => ({ ...prev, [accountId]: true }));
    
    try {
      const fundsResponse = await api.get('/funds');
      
      // Update availableFundsByProvider with all funds
      setAvailableFundsByProvider(prev => ({
        ...prev,
        [productId]: fundsResponse.data
      }));
    } catch (err) {
      console.error('Error loading funds:', err);
      // Set empty array for this product if there's an error
      setAvailableFundsByProvider(prev => ({
        ...prev,
        [productId]: []
      }));
    } finally {
      setIsLoadingFunds(prev => ({ ...prev, [accountId]: false }));
    }
  };

  // Add these new handler functions after handleFundSelection
  const handlePortfolioTypeChange = (accountId: string, type: 'template' | 'bespoke'): void => {
    setAccounts(prevAccounts => prevAccounts.map(account => {
      if (account.id === accountId) {
        return {
          ...account,
          portfolio: {
            ...account.portfolio,
            type,
            templateId: undefined,
            selectedFunds: []
          }
        };
      }
      return account;
    }));
  };

  const handleTemplateSelection = async (accountId: string, templateId: string): Promise<void> => {
    try {
      const numericTemplateId = templateId ? parseInt(templateId, 10) : undefined;
      
      if (numericTemplateId) {
        // Fetch template details
        const response = await api.get(`/available_portfolios/${numericTemplateId}`);
        const template = response.data;

        // Update the account with template details
        setAccounts(prevAccounts => prevAccounts.map(account => {
          if (account.id === accountId) {
            return {
              ...account,
              portfolio: {
                ...account.portfolio,
                templateId: numericTemplateId,
                name: template.name,
                selectedFunds: template.funds.map((f: { fund_id: number }) => f.fund_id)
              }
            };
          }
          return account;
        }));
      } else {
        // Clear template selection
        setAccounts(prevAccounts => prevAccounts.map(account => {
          if (account.id === accountId) {
            return {
              ...account,
              portfolio: {
                ...account.portfolio,
                templateId: undefined,
                selectedFunds: []
              }
            };
          }
          return account;
        }));
      }
    } catch (error) {
      console.error('Error loading template details:', error);
      setError('Failed to load template details. Please try again.');
    }
  };

  const validateForm = (): boolean => {
    // Client must be selected
    if (!clientId) {
      setError('Please select a client');
      return false;
    }

    // At least one account must be added
    if (accounts.length === 0) {
      setError('Please add at least one account');
      return false;
    }

    // All accounts must have required fields
    for (const account of accounts) {
      if (!account.account_name.trim()) {
        setError('All accounts must have a name');
        return false;
      }
      
      if (account.available_products_id === 0) {
        setError(`Please select a product for ${account.account_name}`);
        return false;
      }
      
      // Portfolio validation
      if (!account.portfolio.name.trim()) {
        setError(`Please enter a portfolio name for account "${account.account_name}"`);
        return false;
      }
      
      // For template portfolios, check if a template is selected
      if (account.portfolio.type === 'template') {
        if (!account.portfolio.templateId) {
          setError(`Please select a template portfolio for account "${account.account_name}"`);
          return false;
        }
      } else {
        // For bespoke portfolios, check fund selection
        if (account.portfolio.selectedFunds.length === 0) {
          setError(`Please select at least one fund for the portfolio in account "${account.account_name}"`);
          return false;
        }
      }
    }

    return true;
  };

  // Update the handleSubmit function to handle template-based portfolios
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
      
      for (const account of accounts) {
        let portfolioId: number;

        if (account.portfolio.type === 'template' && account.portfolio.templateId) {
          // Create portfolio from template
          const templateResponse = await api.post('/portfolios/from_template', {
            template_id: account.portfolio.templateId,
            portfolio_name: account.portfolio.name,
            status: 'active',
            start_date: formattedStartDate
          });
          portfolioId = templateResponse.data.id;
        } else {
          // Create a bespoke portfolio
          const portfolioResponse = await api.post('/portfolios', {
            portfolio_name: account.portfolio.name,
            status: 'active',
            start_date: formattedStartDate
          });
          portfolioId = portfolioResponse.data.id;
          
          // Add funds for bespoke portfolio
          for (const fundId of account.portfolio.selectedFunds) {
            await api.post('/portfolio_funds', {
              portfolio_id: portfolioId,
              available_funds_id: fundId,
              target_weighting: parseFloat(account.portfolio.fundWeightings[fundId] || '0'),
              value: 0,
              start_date: formattedStartDate
            });
          }
        }

        // Create the client account
        const accountResponse = await api.post('/client_accounts', {
          client_id: account.client_id,
          available_products_id: account.available_products_id,
          account_name: account.account_name,
          status: account.status,
          start_date: formattedStartDate,
          weighting: account.weighting / 100
        });
        
        const accountId = accountResponse.data.id;
        
        // Link the account to the portfolio
        await api.post('/account_holdings', {
          client_account_id: accountId,
          portfolio_id: portfolioId,
          status: 'active',
          start_date: formattedStartDate
        });
      }

      // Navigate to accounts page after successful creation
      navigate('/accounts');
    } catch (err: any) {
      console.error('Error creating accounts:', err);
      setError(err.response?.data?.detail || 'Failed to create accounts. Please try again.');
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

  const renderPortfolioSection = (account: AccountItem): JSX.Element => {
    return (
      <div className="space-y-4">
        {/* Portfolio Type Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Portfolio Type <span className="text-red-500">*</span>
          </label>
          <div className="flex space-x-4">
            <label className="inline-flex items-center">
              <input
                type="radio"
                className="form-radio"
                name={`portfolio-type-${account.id}`}
                value="template"
                checked={account.portfolio.type === 'template'}
                onChange={(e) => handlePortfolioTypeChange(account.id, e.target.value as 'template' | 'bespoke')}
              />
              <span className="ml-2">Template</span>
            </label>
            <label className="inline-flex items-center">
              <input
                type="radio"
                className="form-radio"
                name={`portfolio-type-${account.id}`}
                value="bespoke"
                checked={account.portfolio.type === 'bespoke'}
                onChange={(e) => handlePortfolioTypeChange(account.id, e.target.value as 'template' | 'bespoke')}
              />
              <span className="ml-2">Bespoke</span>
            </label>
          </div>
        </div>

        {/* Template Selection */}
        {account.portfolio.type === 'template' && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Template <span className="text-red-500">*</span>
            </label>
            <select
              value={account.portfolio.templateId || ''}
              onChange={(e) => handleTemplateSelection(account.id, e.target.value)}
              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
              required
            >
              <option value="">Select a template</option>
              {availableTemplates.map(template => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Show selected funds for template portfolios */}
        {account.portfolio.type === 'template' && account.portfolio.templateId && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Selected Funds</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fund Name
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {account.portfolio.selectedFunds.map((fundId) => {
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

        {/* Portfolio Name */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Portfolio Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={account.portfolio.name}
            onChange={(e) => handlePortfolioNameChange(account.id, e.target.value)}
            className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
            required
          />
        </div>

        {/* Show fund selection only for bespoke portfolios */}
        {account.portfolio.type === 'bespoke' && account.available_products_id > 0 && (
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
                    checked={account.portfolio.selectedFunds.includes(fund.id)}
                    onChange={() => handleFundSelection(account.id, fund.id)}
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
        <h1 className="text-3xl font-bold">Create Client Accounts</h1>
        <button
          onClick={() => navigate('/accounts')}
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          Back to Accounts
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

            {/* Account List */}
            <div className="space-y-6">
              <div className="flex justify-between items-center pb-4 border-b border-gray-200">
                <h2 className="text-xl font-medium">Accounts</h2>
                <button
                  type="button"
                  onClick={handleAddAccount}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  Add Account
                </button>
              </div>

              {accounts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No accounts added yet. Click "Add Account" to create a new account.</p>
                </div>
              ) : (
                <div>
                  {accounts.map((account) => (
                    <div key={account.id} className="border rounded-md p-6 mb-6 bg-gray-50">
                      {/* Account Header */}
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-medium">{account.account_name}</h3>
                        <button
                          type="button"
                          onClick={() => handleRemoveAccount(account.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Remove
                        </button>
                      </div>

                      {/* Account Form */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Account Name */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Account Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={account.account_name}
                            onChange={(e) => handleAccountChange(account.id, 'account_name', e.target.value)}
                            className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            required
                          />
                        </div>

                        {/* Product Selection */}
                        <div className="product-dropdown-container relative">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Product <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={productSearchTerms[account.id] || ''}
                            onClick={() => toggleProductDropdown(account.id, true)}
                            onChange={(e) => handleProductSearch(account.id, e.target.value)}
                            placeholder="Search for a product..."
                            className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                          />
                          {showProductDropdowns[account.id] && (
                            <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base overflow-auto">
                              {getFilteredProducts(productSearchTerms[account.id] || '').map(product => (
                                <div
                                  key={product.id}
                                  className="cursor-pointer hover:bg-gray-100 py-2 px-4"
                                  onClick={() => handleSelectProduct(account.id, product.id, product.product_name)}
                                >
                                  {product.product_name}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Portfolio Name */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Portfolio Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={account.portfolio.name}
                            onChange={(e) => handlePortfolioNameChange(account.id, e.target.value)}
                            className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            required
                          />
                        </div>

                        {/* Account Weighting */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Account Weighting (%)
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={account.weighting}
                            onChange={(e) => handleAccountChange(account.id, 'weighting', parseFloat(e.target.value))}
                            className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                          />
                        </div>
                      </div>

                      {/* Portfolio Configuration */}
                      {account.available_products_id > 0 && (
                        <div className="mt-6 border-t pt-6">
                          <h4 className="text-lg font-medium mb-4">Portfolio Configuration</h4>
                          {renderPortfolioSection(account)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Form Actions */}
            <div className="mt-8 flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => navigate('/accounts')}
                className="px-6 py-3 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving || accounts.length === 0}
                className="px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {isSaving ? 'Creating...' : 'Create Accounts'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default CreateClientAccounts; 