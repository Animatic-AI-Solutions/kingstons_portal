import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Modal } from 'antd';
import AddFundModal from '../components/AddFundModal';

import { useAuth } from '../context/AuthContext';
import { Radio, Select, Input, Checkbox, DatePicker } from 'antd';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import SearchableDropdown from '../components/ui/SearchableDropdown';

interface Client {
  id: number;
  name: string | null;
  status: string;
  advisor: string | null;
  type: string | null;
}

interface Provider {
  id: number;
  name: string;
  status: string;
}

interface ProductOwner {
  id: number;
  name: string;
  status: string;
  created_at: string;
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
  plan_number?: string; // Add plan number field
  product_owner_ids: number[]; // Changed from product_owner_id to product_owner_ids array
  portfolio: {
    id?: number; // Portfolio ID when created or selected
    name: string;
    selectedFunds: number[];
    type: 'template' | 'bespoke';
    templateId?: number;
    generationId?: number; // Added field to store the selected generation ID
    fundWeightings: Record<string, string>;
  };
}

interface PortfolioTemplate {
  id: number;
  created_at: string;
  name: string | null;
}

interface PortfolioGeneration {
  id: number;
  version_number: number;
  generation_name: string;
  description?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

// Interface for dropdown option
// interface Option {
//   id: string;
//   name: string;
// }

const CreateClientProducts: React.FC = (): JSX.Element => {
  const navigate = useNavigate();
  const location = useLocation();
  const { api } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [productOwners, setProductOwners] = useState<ProductOwner[]>([]);
  const [funds, setFunds] = useState<Fund[]>([]);
  const [availableTemplates, setAvailableTemplates] = useState<PortfolioTemplate[]>([]);
  const [templateGenerations, setTemplateGenerations] = useState<Record<string, PortfolioGeneration[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  
  // Get client info from URL parameters
  const searchParams = new URLSearchParams(location.search);
  const urlClientId = searchParams.get('client_id');
  const clientName = searchParams.get('client_name');
  
  // Form state
  const [selectedClientId, setSelectedClientId] = useState<number | null>(urlClientId ? parseInt(urlClientId) : null);
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
  const [generationLoading, setGenerationLoading] = useState<Record<string, boolean>>({});
  
  // Add refs for product sections
  const productRefs = useRef<Record<string, HTMLDivElement | null>>({});
  
  // Create a state for toast notifications that won't disrupt the UI flow
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  
  // Add state for the create product owner modal
  const [showCreateProductOwnerModal, setShowCreateProductOwnerModal] = useState(false);
  const [newProductOwnerName, setNewProductOwnerName] = useState('');
  const [isCreatingProductOwner, setIsCreatingProductOwner] = useState(false);
  const [currentProductId, setCurrentProductId] = useState<string>('');
  
  // Add Fund Modal state
  const [isAddFundModalOpen, setIsAddFundModalOpen] = useState(false);
  const [addFundForProductId, setAddFundForProductId] = useState<string | null>(null);
  
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
          portfoliosRes,
          productOwnersRes
        ] = await Promise.all([
          api.get('/client_groups'),
          api.get('/available_providers'),
          api.get('/funds'),
          api.get('/available_portfolios'),
          api.get('/api/product_owners')
        ]);
        
        setClients(clientsRes.data);
        setProviders(providersRes.data);
        setFunds(fundsRes.data);
        setAvailableTemplates(portfoliosRes.data);
        setProductOwners(productOwnersRes.data);
        
        // Set defaults
        if (clientsRes.data.length > 0) {
          setSelectedClientId(clientsRes.data[0].id);
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
        
        // Filter out cash funds - they'll be added automatically or handled by backend
        const nonCashFunds = allFunds.filter((fund: Fund) => 
          !(fund.fund_name === 'Cash' && fund.isin_number === 'N/A')
        );
        
        setFunds(allFunds); // Keep all funds in state for reference
        setFilteredFunds(nonCashFunds); // But only show non-cash funds in the UI
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
    setSelectedClientId(clientId);
    
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
    if (!selectedClientId) {
      setError('Please select a client first');
      return;
    }
    
    // Create a new empty product with a temporary ID
    const productId = `temp-${Date.now()}`;
    const newProduct: ProductItem = {
      id: productId,
      client_id: selectedClientId,
      provider_id: 0,
      product_type: '',
      product_name: `Product ${products.length + 1}`,
      status: 'active',
      weighting: 0,
      product_owner_ids: [],
      portfolio: {
        name: `Portfolio for Product ${products.length + 1}`,
        selectedFunds: [],
        type: 'bespoke',
        fundWeightings: {}
      }
    };
    
    setProducts([...products, newProduct]);
    
    // Scroll to the new product section after it's rendered
    setTimeout(() => {
      productRefs.current[productId]?.scrollIntoView({ behavior: 'smooth' });
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
          // Show a toast notification instead of an error
          showToastMessage(`Template portfolio has been converted to bespoke because you modified the fund selection.`);
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
      // First, clear any existing generation selection for this product
      const updatedProducts = products.map(product => {
        if (product.id === productId) {
          return {
            ...product,
            portfolio: {
              ...product.portfolio,
              templateId: parseInt(templateId),
              generationId: undefined, // Clear the generation selection
              selectedFunds: [], // Clear the selected funds
              name: product.portfolio.name // Keep the existing portfolio name
            }
          };
        }
        return product;
      });
      
      setProducts(updatedProducts);

      // Fetch generations for this template
      const generationsResponse = await api.get(`/available_portfolios/${templateId}/generations`);
      const generationsData = generationsResponse.data;
      
      // Store the generations for this template
      setTemplateGenerations(prev => ({
        ...prev,
        [templateId]: generationsData
      }));

      // Log what we've fetched
      console.log(`Fetched ${generationsData.length} generations for template ${templateId}`);
    } catch (err) {
      console.error('Error loading template generations:', err);
      showError('Failed to load template generations. Please try again.');
    } finally {
      // Clear loading state for this product
      setTemplateLoading(prev => ({ ...prev, [productId]: false }));
    }
  };

  // Add new function to handle generation selection
  const handleGenerationSelection = async (productId: string, generationId: string): Promise<void> => {
    if (!generationId) {
      return;
    }

    // Set loading state just for this specific product
    setGenerationLoading(prev => ({ ...prev, [productId]: true }));
    
    try {
      // Find the product
      const product = products.find(p => p.id === productId);
      if (!product || !product.portfolio.templateId) {
        throw new Error('Product or template ID not found');
      }

      // Fetch template details with specific generation ID
      const response = await api.get(`/available_portfolios/${product.portfolio.templateId}?generation_id=${generationId}`);
      const templateData = response.data;
      
      // Get funds in the template generation
      const templateFunds = templateData.funds || [];
      const fundIds = templateFunds.map((fund: any) => fund.fund_id);
      
      // Update the product's portfolio with generation information
      const updatedProducts = products.map(p => {
        if (p.id === productId) {
          return {
            ...p,
            portfolio: {
              ...p.portfolio,
              generationId: parseInt(generationId),
              // Update name if it hasn't been customized
              name: p.portfolio.name || `${templateData.name || `Template ${p.portfolio.templateId}`} for ${p.product_name}`,
              selectedFunds: fundIds,
              fundWeightings: {}
            }
          };
        }
        return p;
      });
      
      setProducts(updatedProducts);
    } catch (err) {
      console.error('Error loading generation details:', err);
      showError('Failed to load generation details. Please try again.');
    } finally {
      // Clear loading state for this product
      setGenerationLoading(prev => ({ ...prev, [productId]: false }));
    }
  };

  // Helper to show error as popup
  const showToastMessage = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 4000);
  };

  // Keep showError for critical errors that should block the UI
  const showError = (msg: string) => {
    // Make sure msg is always a string to avoid React errors with objects
    const errorMessage = typeof msg === 'object' ? JSON.stringify(msg) : msg;
    setError(errorMessage);
    setShowErrorPopup(true);
    setTimeout(() => setShowErrorPopup(false), 4000);
  };

  const validateForm = (): boolean => {
    // Client must be selected
    if (!selectedClientId) {
      setError('Please select a client');
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
        if (!product.portfolio.generationId) {
          showError(`Please select a generation for the template portfolio in product "${product.product_name}"`);
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
      
      // Find the Cash fund ID (if it exists in our funds list)
      // This might not be strictly necessary if backend handles it, but good for consistency
      const cashFund = funds.find(fund => 
        fund.fund_name === 'Cash' && fund.isin_number === 'N/A'
      );
      
      for (const product of products) {
        let portfolioId: number | undefined;

        // First, create the portfolio if needed
        if (product.portfolio.type === 'template' && product.portfolio.templateId && product.portfolio.generationId) {
          // Create portfolio from template generation
          const templateResponse = await api.post('/portfolios/from_template', {
            template_id: product.portfolio.templateId,
            generation_id: product.portfolio.generationId, // Send the generation ID to the API
            portfolio_name: product.portfolio.name,
            status: 'active',
            start_date: formattedStartDate
          });
          portfolioId = templateResponse.data.id;
          console.log(`Created portfolio from template generation with ID: ${portfolioId}`);
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
                // Check the API schema - it might be expecting a different field naming or format
                const fundData = {
                  portfolio_id: portfolioId,
                  available_funds_id: fundId, // Changed from fund_id to available_funds_id to match DB schema
                  weighting: 1, // Try using 1 instead of 0
                  status: 'active',
                  start_date: formattedStartDate // Add start date if required by API
                };
                
                console.log(`Adding fund ${fundId} to portfolio ${portfolioId} with data:`, fundData);
                await api.post('/portfolio_funds', fundData);
                console.log(`Added fund ${fundId} to portfolio ${portfolioId}`);
              } catch (err: any) { // Type the error as any to access response property
                console.error(`Error adding fund ${fundId} to portfolio:`, err);
                // Log the response data from the error to help debug
                if (err.response && err.response.data) {
                  console.error('API Error details:', err.response.data);
                }
                throw err;
              }
            });
            
            // We DON'T need to add the Cash fund here as it's automatically added by the 
            // backend when a portfolio is created (in the /portfolios POST endpoint)
            // This was causing the Cash fund to be added twice
            
            // Wait for all fund additions to complete
            await Promise.all(fundPromises);
          }
        }

        // Now, create client product with reference to the portfolio
        if (portfolioId) {
          try {
            const clientProductResponse = await api.post('/client_products', {
              client_id: selectedClientId,
              provider_id: product.provider_id,
              product_type: product.product_type,
              product_name: product.product_name,
              portfolio_id: portfolioId,
              status: 'active',
              start_date: formattedStartDate,
              plan_number: product.plan_number || null
            });
            
            const createdProductId = clientProductResponse.data.id;
            console.log(`Created client product with ID ${createdProductId} for portfolio ${portfolioId}`);
            
            // If product owners were selected, create the associations
            if (product.product_owner_ids.length > 0) {
              try {
                // Create associations one by one
                for (const ownerId of product.product_owner_ids) {
                  await api.post('/api/product_owner_products', null, {
                    params: {
                      product_owner_id: ownerId,
                      product_id: createdProductId
                    }
                  });
                }
                console.log(`Created associations between product ${createdProductId} and product owners ${product.product_owner_ids.join(', ')}`);
              } catch (err: any) {
                console.error('Error creating product owner associations:', err);
                if (err.response && err.response.data) {
                  console.error('API Error details:', err.response.data);
                }
                // Continue if the associations couldn't be created, don't block the rest of the submission
              }
            }
          } catch (err: any) { // Type the error as any
            console.error('Error creating client product:', err);
            if (err.response && err.response.data) {
              console.error('API Error details:', err.response.data);
            }
            throw err;
          }
        }
      }
      
      // Successful completion
      alert('Successfully created client products and portfolios');
      navigate(`/client-details/${selectedClientId}`);
    } catch (err: any) { // Type the error as any
      console.error('Error in form submission:', err);
      
      // Better error handling to show more details
      let errorMessage = 'Failed to create client products';
      if (err.response && err.response.data) {
        if (err.response.data.detail && Array.isArray(err.response.data.detail)) {
          // Format detailed validation errors
          errorMessage = err.response.data.detail.map((detail: any) => 
            `${detail.loc ? detail.loc.join('.') + ': ' : ''}${detail.msg}`
          ).join(', ');
        } else if (typeof err.response.data.detail === 'string') {
          errorMessage = err.response.data.detail;
        }
      }
      
      showError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  // Update fund filtering to exclude cash funds
  const handleFundSearch = (searchTerm: string): void => {
    setFundSearchTerm(searchTerm);
    
    if (!searchTerm) {
      const nonCashFunds = funds.filter((fund: Fund) => 
        !(fund.fund_name === 'Cash' && fund.isin_number === 'N/A') // Exclude Cash fund
      );
      setFilteredFunds(nonCashFunds);
      return;
    }
    
    const term = searchTerm.toLowerCase();
    const filtered = funds.filter((fund: Fund) => 
      (fund.fund_name.toLowerCase().includes(term) || 
      (fund.isin_number && fund.isin_number.toLowerCase().includes(term))) &&
      !(fund.fund_name === 'Cash' && fund.isin_number === 'N/A') // Also exclude Cash fund from search results
    );
    setFilteredFunds(filtered);
  };

  const renderPortfolioSection = (product: ProductItem): JSX.Element => {
    const isLoadingTemplate = templateLoading[product.id] === true;
    const isLoadingGeneration = generationLoading[product.id] === true;
    const isEitherLoading = isLoadingTemplate || isLoadingGeneration;
    const templateId = product.portfolio.templateId;
    const generations = templateId ? templateGenerations[templateId.toString()] || [] : [];
    
    return (
      <div className="portfolio-section">
        {/* Show loading overlay when template or generation is loading */}
        {isEitherLoading && (
          <div className="absolute inset-0 bg-white bg-opacity-70 flex items-center justify-center z-10">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
          </div>
        )}
        
        {/* Portfolio Name - Moved above Portfolio Type */}
        <div className="mb-4">
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
        
        {/* Portfolio Type Selection */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Portfolio Type <span className="text-red-500">*</span>
          </label>
          <Radio.Group
            value={product.portfolio.type}
            onChange={(e) => handlePortfolioTypeChange(product.id, e.target.value as 'template' | 'bespoke')}
            disabled={isEitherLoading}
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
              disabled={isEitherLoading}
            />
          </div>
        )}

        {/* Generation Selection - Show after template is selected */}
        {product.portfolio.type === 'template' && product.portfolio.templateId && generations.length > 0 && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Generation <span className="text-red-500">*</span>
            </label>
            <SearchableDropdown
              id={`generation-select-${product.id}`}
              options={generations.map(g => ({ 
                value: g.id.toString(), 
                label: g.generation_name || `Version ${g.version_number}` 
              }))}
              value={product.portfolio.generationId?.toString() ?? ''}
              onChange={val => handleGenerationSelection(product.id, String(val))}
              placeholder="Select a generation"
              className="w-full"
              required
              disabled={isEitherLoading}
            />
            <div className="text-xs text-gray-500 mt-1">
              Select a specific generation of this template
            </div>
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
          <div className="flex gap-2 mb-3">
            <div className="flex-1">
              <Input
                placeholder="Search funds by name or ISIN"
                value={fundSearchTerm}
                onChange={(e) => handleFundSearch(e.target.value)}
                disabled={isEitherLoading}
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setAddFundForProductId(product.id);
                setIsAddFundModalOpen(true);
              }}
              className="bg-primary-600 text-white px-3 py-2 rounded hover:bg-primary-700 transition-colors duration-150 inline-flex items-center justify-center gap-1"
              title="Add new fund"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Fund
            </button>
          </div>
          <div className="fund-list max-h-60 overflow-y-auto border rounded-md p-2">
            {filteredFunds.map(fund => (
              <div key={fund.id} className="fund-item hover:bg-gray-50 p-1">
                <Checkbox
                  checked={product.portfolio.selectedFunds.includes(fund.id)}
                  onChange={() => handleFundSelection(product.id, fund.id)}
                  disabled={isEitherLoading}
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

  // Add a function to handle creating a new product owner
  const handleCreateProductOwner = async () => {
    if (!newProductOwnerName.trim()) {
      showError('Please enter a name for the product owner');
      return;
    }

    setIsCreatingProductOwner(true);
    try {
      // Create a new product owner
      const response = await api.post('/api/product_owners', {
        name: newProductOwnerName,
        status: 'active'
      });

      const newProductOwner = response.data;
      
      // Add to the list of product owners
      setProductOwners(prevOwners => [...prevOwners, newProductOwner]);
      
      // Add this product owner to the current product's selected owners
      if (currentProductId) {
        const currentProduct = products.find(p => p.id === currentProductId);
        if (currentProduct) {
          const updatedOwnerIds = [...currentProduct.product_owner_ids, newProductOwner.id];
          handleProductChange(currentProductId, 'product_owner_ids', updatedOwnerIds);
        }
      }
      
      // Close the modal and reset
      setShowCreateProductOwnerModal(false);
      setNewProductOwnerName('');
      showToastMessage(`Product owner "${newProductOwnerName}" created successfully!`);
    } catch (error) {
      console.error('Error creating product owner:', error);
      showError('Failed to create product owner. Please try again.');
    } finally {
      setIsCreatingProductOwner(false);
    }
  };

  // Add a function to open the create product owner modal
  const openCreateProductOwnerModal = (productId: string) => {
    setCurrentProductId(productId);
    setShowCreateProductOwnerModal(true);
  };

  // Add function to handle when a new fund is added
  const handleFundAdded = (newFund: Fund) => {
    // Add the new fund to the available funds
    setFunds(prev => [...prev, newFund]);
    setFilteredFunds(prev => [...prev, newFund]);
    
    // Automatically add the fund to the product that opened the modal
    if (addFundForProductId) {
      setProducts(prevProducts => prevProducts.map(product => {
        if (product.id === addFundForProductId) {
          return {
            ...product,
            portfolio: {
              ...product.portfolio,
              selectedFunds: [...product.portfolio.selectedFunds, newFund.id]
            }
          };
        }
        return product;
      }));
    }
    
    // Show success message  
    showToastMessage(`Fund "${newFund.fund_name}" has been created and added to your product!`);
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Toast notification */}
      {showToast && (
        <div className="fixed top-4 right-4 z-50 bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 rounded shadow-md">
          <div className="flex">
            <div className="py-1">
              <svg className="h-6 w-6 text-blue-500 mr-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="font-bold">Notification</p>
              <p className="text-sm">{toastMessage}</p>
            </div>
            <button 
              onClick={() => setShowToast(false)} 
              className="ml-auto text-blue-500 hover:text-blue-700"
            >
              <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-4 mt-4">
        <div className="flex items-center">
          <div className="bg-primary-100 p-2 rounded-lg mr-3 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h1 className="text-3xl font-normal text-gray-900 font-sans tracking-wide">Create Client Products</h1>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-700"></div>
          </div>
        ) : error ? (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
            <p>{error}</p>
          </div>
        ) : (
          <div className="bg-white shadow-md rounded-lg p-4">
            <form onSubmit={handleSubmit}>
              {/* Client Selection and Start Date in horizontal layout */}
              <div className="flex gap-4 mb-4">
                {/* Client Selection */}
                <div className="w-1/2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Client Name <span className="text-red-500">*</span>
                  </label>
                  {clients.length > 0 ? (
                    <Select
                      showSearch
                      value={selectedClientId || undefined}
                      onChange={(value) => handleClientChange(value)}
                      placeholder="Search for a client"
                      optionFilterProp="children"
                      filterOption={(input, option) =>
                        (option?.children as unknown as string)
                          .toLowerCase()
                          .includes(input.toLowerCase())
                      }
                      className="w-full"
                    >
                      {clients.map(client => (
                        <Select.Option key={client.id} value={client.id}>
                          {client.name}
                        </Select.Option>
                      ))}
                    </Select>
                  ) : (
                    <div className="text-gray-500">No clients available. Please add a client first.</div>
                  )}
                </div>

                {/* Start Date Selection */}
                <div className="w-1/2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <DatePicker
                    value={startDate}
                    onChange={(date) => setStartDate(date as Dayjs)}
                    className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md h-[38px]"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              {/* Product List */}
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                  <h2 className="text-lg font-medium">Products</h2>
                  <button
                    type="button"
                    onClick={handleAddProduct}
                    className="bg-primary-700 text-white px-3 py-1.5 rounded-xl font-medium hover:bg-primary-800 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-700 focus:ring-offset-2 shadow-sm flex items-center gap-1"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add Client Product
                  </button>
                </div>

                {products.length === 0 ? (
                  <div className="text-center py-6 text-gray-500">
                    No products added yet. Click the button above to add a product.
                  </div>
                ) : (
                  <div className="space-y-4">
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
                            className="text-gray-400 hover:text-red-500 transition-colors duration-200"
                          >
                            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>

                        {/* Product Owner Selection - Moved above Product Name */}
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Product Owners
                          </label>
                          <div className="flex space-x-2">
                            <div className="flex-grow">
                              <Select
                                mode="multiple"
                                showSearch
                                allowClear
                                placeholder="Select product owners"
                                className="w-full"
                                value={product.product_owner_ids}
                                onChange={(selectedValues: any) => {
                                  // Handle the create new option case
                                  if (selectedValues.includes('create-new')) {
                                    // Filter out the 'create-new' value
                                    const actualOwnerIds = selectedValues.filter((v: any) => v !== 'create-new');
                                    handleProductChange(product.id, 'product_owner_ids', actualOwnerIds);
                                    openCreateProductOwnerModal(product.id);
                                  } else {
                                    handleProductChange(product.id, 'product_owner_ids', selectedValues);
                                  }
                                }}
                              >
                                {productOwners.map(p => (
                                  <Select.Option key={p.id} value={p.id}>
                                    {p.name}
                                  </Select.Option>
                                ))}
                                <Select.Option key="create-new" value="create-new">
                                  + Create new product owner
                                </Select.Option>
                              </Select>
                            </div>
                            <button
                              type="button"
                              onClick={() => openCreateProductOwnerModal(product.id)}
                              className="bg-primary-600 text-white p-2 rounded hover:bg-primary-700 transition-colors duration-150 inline-flex items-center justify-center"
                              title="Create new product owner"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                              </svg>
                            </button>
                          </div>
                        </div>

                        {/* Product Name Field */}
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Product Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={product.product_name}
                            onChange={(e) => handleProductChange(product.id, 'product_name', e.target.value)}
                            className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            placeholder="Enter product name"
                            required
                          />
                        </div>

                        {/* Provider and Product Type Selection in horizontal layout */}
                        <div className="flex gap-4 mb-3">
                          {/* Provider Selection */}
                          <div className="w-1/2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
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

                          {/* Product Type Selection */}
                          <div className="w-1/2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
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
                        </div>

                        {/* Portfolio Configuration */}
                        <div className="mt-6 border-t pt-6 col-span-2">
                          <h4 className="text-lg font-medium mb-4">Portfolio Configuration</h4>

                          {renderPortfolioSection(product)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="mt-6 flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="bg-primary-700 text-white px-4 py-2 rounded-xl font-medium hover:bg-primary-800 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-700 focus:ring-offset-2 shadow-sm"
                >
                  {isSaving ? 'Saving...' : 'Save Products'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Create Product Owner Modal */}
      {showCreateProductOwnerModal && (
        <Modal
          title="Create New Product Owner"
          open={showCreateProductOwnerModal}
          onCancel={() => setShowCreateProductOwnerModal(false)}
          onOk={handleCreateProductOwner}
          confirmLoading={isCreatingProductOwner}
          okText="Create Product Owner"
          maskClosable={false}
          centered
          className="product-owner-modal"
        >
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Product Owner Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={newProductOwnerName}
              onChange={(e) => setNewProductOwnerName(e.target.value)}
              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
              placeholder="Enter product owner name"
              required
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleCreateProductOwner();
                }
              }}
              autoFocus
            />
          </div>
        </Modal>
      )}

      {/* Add Fund Modal */}
      <AddFundModal
        isOpen={isAddFundModalOpen}
        onClose={() => {
          setIsAddFundModalOpen(false);
          setAddFundForProductId(null);
        }}
        onFundAdded={handleFundAdded}
      />
    </div>
  );
};

export default CreateClientProducts; 