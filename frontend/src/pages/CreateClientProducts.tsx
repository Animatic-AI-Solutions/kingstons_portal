import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Modal } from 'antd';
import AddFundModal from '../components/AddFundModal';

import { useAuth } from '../context/AuthContext';
import { Radio, Select, Input, Checkbox, DatePicker } from 'antd';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import SearchableDropdown from '../components/ui/SearchableDropdown';
import { getProviderColor } from '../services/providerColors';

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
  theme_color?: string;
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
  
  // Add state to track where the user came from
  const [returnPath, setReturnPath] = useState<string>('/products'); // Default fallback
  
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
  
  // Add validation error states for field-level validation
  const [validationErrors, setValidationErrors] = useState<Record<string, Record<string, string>>>({});
  const [weightingErrors, setWeightingErrors] = useState<Record<string, Record<string, string>>>({});
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle shortcuts when not typing in inputs
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      // Ctrl+Enter or Cmd+Enter - Save products
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && !isSaving && products.length > 0) {
        event.preventDefault();
        const form = document.querySelector('form') as HTMLFormElement;
        if (form) {
          form.requestSubmit();
        }
      }
      
      // Ctrl+D or Cmd+D - Duplicate last product
      if ((event.ctrlKey || event.metaKey) && event.key === 'd' && products.length > 0) {
        event.preventDefault();
        const lastProduct = products[products.length - 1];
        const newProduct = {
          ...lastProduct,
          id: `temp-${Date.now()}`,
          product_name: '',
          portfolio: {
            ...lastProduct.portfolio,
            name: '', // Will be auto-generated based on product details
            selectedFunds: [],
            fundWeightings: {}
          }
        };
        setProducts([...products, newProduct]);
        showToastMessage('Product duplicated! 📋');
      }
      
      // Ctrl+Shift+A or Cmd+Shift+A - Add new product
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'A' && selectedClientId) {
        event.preventDefault();
        handleAddProduct();
        showToastMessage('New product added! ✨');
      }
      
      // Escape - Close modals
      if (event.key === 'Escape') {
        if (showCreateProductOwnerModal) {
          setShowCreateProductOwnerModal(false);
        }
        if (isAddFundModalOpen) {
          setIsAddFundModalOpen(false);
          setAddFundForProductId(null);
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [products, isSaving, selectedClientId, showCreateProductOwnerModal, isAddFundModalOpen]);
  
  // Add useEffect to determine return path based on where user came from
  useEffect(() => {
    // Check URL parameters first for explicit return path
    const searchParams = new URLSearchParams(location.search);
    const returnTo = searchParams.get('returnTo');
    
    if (returnTo) {
      setReturnPath(decodeURIComponent(returnTo));
    } else {
      // Fallback to referrer-based detection
      const referrer = document.referrer;
      
      if (referrer) {
        try {
          const referrerUrl = new URL(referrer);
          const referrerPath = referrerUrl.pathname;
          
          // Determine return path based on referrer
          if (referrerPath.includes('/client_groups/') && !referrerPath.includes('/add')) {
            // Came from a client details page
            setReturnPath(referrerPath);
          } else if (referrerPath.includes('/products') && !referrerPath.includes('/add')) {
            // Came from products page
            setReturnPath('/products');
          } else {
            // Default to products page
            setReturnPath('/products');
          }
        } catch (error) {
          console.log('Could not parse referrer URL, using default return path');
          setReturnPath('/products');
        }
      }
    }
  }, [location.search]);

  // Auto-update portfolio names when product details change
  useEffect(() => {
    setProducts(prevProducts => 
      prevProducts.map(product => {
        // Only auto-update if portfolio name is empty or matches the old generated pattern
        const currentName = product.portfolio.name;
        const shouldUpdate = !currentName || 
                           currentName.startsWith('Portfolio for Product') || 
                           currentName === generatePortfolioName(product);
        
        if (shouldUpdate) {
          const newName = generatePortfolioName(product);
          return {
            ...product,
            portfolio: {
              ...product.portfolio,
              name: newName
            }
          };
        }
        return product;
      })
    );
  }, [
    // Dependencies: update when these product details change
    products.map(p => `${p.provider_id}-${p.product_type}-${p.product_name}-${p.product_owner_ids.join(',')}`).join('|'),
    providers,
    productOwners
  ]);

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

        // Sort funds alphabetically by fund name
        nonCashFunds.sort((a: Fund, b: Fund) => a.fund_name.localeCompare(b.fund_name));
        
        setFunds(allFunds); // Keep all funds in state for reference
        setFilteredFunds(nonCashFunds); // But only show non-cash funds in the UI, sorted alphabetically
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
      product_name: '',
      status: 'active',
      product_owner_ids: [],
      portfolio: {
        name: '', // Will be generated when product details are filled
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
        let updatedWeightings = { ...product.portfolio.fundWeightings };
        
        // Check if this is the Cash fund - prevent removal
        const fund = funds.find(f => f.id === fundId);
        if (fund?.fund_name === 'Cash' && fund?.isin_number === 'N/A') {
          // Don't allow removal of Cash fund, but allow adding it if not already selected
          if (!isSelected) {
            updatedFunds = [...selectedFunds, fundId];
            // Add default weighting for Cash fund (0%)
            if (product.portfolio.type === 'bespoke') {
              updatedWeightings[fundId.toString()] = '0';
            }
          } else {
            // Trying to remove Cash fund - show message and return unchanged
            showToastMessage('Cash fund cannot be removed from portfolios.');
            return product;
          }
        } else {
          if (isSelected) {
            // Remove fund
            updatedFunds = selectedFunds.filter(id => id !== fundId);
            // Remove weighting for this fund
            delete updatedWeightings[fundId.toString()];
          } else {
            // Add fund
            updatedFunds = [...selectedFunds, fundId];
            // Add default weighting for bespoke portfolios
            if (product.portfolio.type === 'bespoke') {
              updatedWeightings[fundId.toString()] = '';
            }
          }
        }
        
        // If this is a template portfolio and we're modifying the funds, convert to bespoke
        if (product.portfolio.type === 'template' && product.portfolio.templateId) {
          updatedType = 'bespoke';
          // Initialize weightings for all selected funds when converting to bespoke
          updatedWeightings = {};
          updatedFunds.forEach(id => {
            const fundForWeighting = funds.find(f => f.id === id);
            // Initialize weighting for all funds, including Cash fund (default to 0)
            if (fundForWeighting?.fund_name === 'Cash' && fundForWeighting?.isin_number === 'N/A') {
              updatedWeightings[id.toString()] = '0';
            } else {
              updatedWeightings[id.toString()] = '';
            }
          });
          // Show a toast notification instead of an error
          showToastMessage(`Template portfolio has been converted to bespoke because you modified the fund selection.`);
        }
        
        return {
          ...product,
          portfolio: {
            ...product.portfolio,
            type: updatedType,
            templateId: updatedType === 'bespoke' ? undefined : product.portfolio.templateId,
            selectedFunds: updatedFunds,
            fundWeightings: updatedWeightings
          }
        };
      }
      return product;
    }));
  };
  
  // Add function to handle weighting changes
  const handleWeightingChange = (productId: string, fundId: number, weighting: string) => {
    setProducts(prevProducts => prevProducts.map(product => {
      if (product.id === productId) {
        return {
          ...product,
          portfolio: {
            ...product.portfolio,
            fundWeightings: {
              ...product.portfolio.fundWeightings,
              [fundId.toString()]: weighting
            }
          }
        };
      }
      return product;
    }));
    
    // Clear validation errors for this specific field when user starts typing
    if (weightingErrors[productId]?.[fundId.toString()]) {
      setWeightingErrors(prev => {
        const newErrors = { ...prev };
        if (newErrors[productId]) {
          const productErrors = { ...newErrors[productId] };
          delete productErrors[fundId.toString()];
          
          if (Object.keys(productErrors).length === 0) {
            delete newErrors[productId];
          } else {
            newErrors[productId] = productErrors;
          }
        }
        return newErrors;
      });
    }
  };
  
  const calculateTotalFundWeighting = (product: ProductItem): number => {
    if (product.portfolio.type !== 'bespoke') {
      return 100; // Template portfolios are assumed to be 100%
    }
    
    let total = 0;
    
    // Add weightings from selected funds
    total += product.portfolio.selectedFunds.reduce((sum, fundId) => {
      const weighting = product.portfolio.fundWeightings[fundId.toString()];
      const numValue = weighting ? parseFloat(weighting) : 0;
      return sum + (isNaN(numValue) ? 0 : numValue);
    }, 0);
    
    // For bespoke portfolios, also include Cash fund weighting if it's not in selectedFunds
    const cashFund = funds.find(f => f.fund_name === 'Cash' && f.isin_number === 'N/A');
    if (cashFund && !product.portfolio.selectedFunds.includes(cashFund.id)) {
      const cashWeighting = product.portfolio.fundWeightings[cashFund.id.toString()];
      const cashValue = cashWeighting ? parseFloat(cashWeighting) : 0;
      total += isNaN(cashValue) ? 0 : cashValue;
    }
    
    return total;
  };

  // Add function to calculate target risk from weighted average
  const calculateTargetRiskFromFunds = (product: ProductItem): number | null => {
    if (product.portfolio.type !== 'bespoke') {
      return null;
    }

    let totalWeightedRisk = 0;
    let totalWeight = 0;

    // Calculate from selected funds
    for (const fundId of product.portfolio.selectedFunds) {
      const fund = funds.find(f => f.id === fundId);
      const weighting = product.portfolio.fundWeightings[fundId.toString()];
      const weightValue = weighting ? parseFloat(weighting) : 0;

      if (fund && !isNaN(weightValue) && weightValue > 0) {
        totalWeightedRisk += fund.risk_factor * weightValue;
        totalWeight += weightValue;
      }
    }
    
    // For bespoke portfolios, also include Cash fund if it's not in selectedFunds
    const cashFund = funds.find(f => f.fund_name === 'Cash' && f.isin_number === 'N/A');
    if (cashFund && !product.portfolio.selectedFunds.includes(cashFund.id)) {
      const cashWeighting = product.portfolio.fundWeightings[cashFund.id.toString()];
      const cashWeightValue = cashWeighting ? parseFloat(cashWeighting) : 0;
      
      if (!isNaN(cashWeightValue) && cashWeightValue > 0) {
        totalWeightedRisk += cashFund.risk_factor * cashWeightValue;
        totalWeight += cashWeightValue;
      }
    }

    return totalWeight > 0 ? totalWeightedRisk / totalWeight : null;
  };

  // Function to generate product name based on owners, provider, and product type
  const generateProductName = (product: ProductItem): string => {
    // Get product owner names
    const ownerNames = product.product_owner_ids
      .map(ownerId => {
        const owner = productOwners.find(o => o.id === ownerId);
        return owner ? owner.name : '';
      })
      .filter(name => name.length > 0);

    // Get provider name
    const provider = providers.find(p => p.id === product.provider_id);
    const providerName = provider ? provider.name : '';

    // Get product type
    const productType = product.product_type;

    // Generate name based on number of owners
    if (ownerNames.length === 0) {
      // No owners - just use provider and product type
      return `${providerName} ${productType}`.trim();
    } else if (ownerNames.length === 1) {
      // Single owner - format: "Owner Provider ProductType"
      return `${ownerNames[0]} ${providerName} ${productType}`.trim();
    } else {
      // Multiple owners - format: "Joint (Owner1, Owner2, Owner3) Provider ProductType"
      const ownersList = ownerNames.join(', ');
      return `Joint (${ownersList}) ${providerName} ${productType}`.trim();
    }
  };

  // Function to generate portfolio name based on product
  const generatePortfolioName = (product: ProductItem): string => {
    // Get the product name (either custom or auto-generated)
    const productName = product.product_name.trim() || generateProductName(product);
    
    // If no meaningful product name can be generated, use a default
    if (!productName || productName.trim() === '') {
      return `Portfolio for Product`;
    }
    
    return `Portfolio for ${productName}`;
  };

  // Portfolio configuration functions
  const handlePortfolioTypeChange = (productId: string, type: 'template' | 'bespoke'): void => {
    setProducts(prevProducts => prevProducts.map(product => {
      if (product.id === productId) {
        const updatedPortfolio = {
          ...product.portfolio,
          type,
          templateId: undefined,
          selectedFunds: [] as number[],
          fundWeightings: {} as Record<string, string>
        };

        // If switching to bespoke and there are already selected funds, initialize weightings
        if (type === 'bespoke' && product.portfolio.selectedFunds.length > 0) {
          updatedPortfolio.selectedFunds = product.portfolio.selectedFunds;
          product.portfolio.selectedFunds.forEach(fundId => {
            const fund = funds.find(f => f.id === fundId);
            // Initialize Cash fund with 0, others with empty string
            if (fund?.fund_name === 'Cash' && fund?.isin_number === 'N/A') {
              updatedPortfolio.fundWeightings[fundId.toString()] = '0';
            } else {
              updatedPortfolio.fundWeightings[fundId.toString()] = '';
            }
          });
        }

        return {
          ...product,
          portfolio: updatedPortfolio
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
    // Clear previous validation errors
    setValidationErrors({});
    setWeightingErrors({});
    
    let hasErrors = false;
    const newValidationErrors: Record<string, Record<string, string>> = {};
    const newWeightingErrors: Record<string, Record<string, string>> = {};

    if (!selectedClientId) {
      showError('Please select a client');
      return false;
    }

    if (products.length === 0) {
      showError('Please add at least one product');
      return false;
    }

    for (const product of products) {
      const productErrors: Record<string, string> = {};
      const productWeightingErrors: Record<string, string> = {};
      
      // Product name validation removed - will be auto-generated if empty
      
      if (!product.provider_id) {
        productErrors.provider = 'Please select a provider';
        hasErrors = true;
      }

      if (!product.product_type) {
        productErrors.productType = 'Please select a product type';
        hasErrors = true;
      }

      // Portfolio name validation - use auto-generated name if empty
      const portfolioName = product.portfolio.name || generatePortfolioName(product);
      if (!portfolioName.trim()) {
        productErrors.portfolioName = 'Please enter a portfolio name';
        hasErrors = true;
      }

      if (product.portfolio.type === 'template') {
        if (!product.portfolio.templateId) {
          productErrors.template = 'Please select a template portfolio';
          hasErrors = true;
        }
        if (!product.portfolio.generationId) {
          productErrors.generation = 'Please select a generation for the template portfolio';
          hasErrors = true;
        }
      } else {
        // Bespoke portfolio validations
        if (product.portfolio.selectedFunds.length === 0) {
          showError(`Please select at least one fund for the portfolio in the product`);
          return false;
        }
        
        // Flexible weighting validation: Allow no weightings OR weightings that don't exceed 100%
        const hasAnyWeightings = product.portfolio.selectedFunds.some(fundId => {
          const weighting = product.portfolio.fundWeightings[fundId.toString()];
          return weighting && weighting.trim() !== '';
        });
        
        // Check Cash fund weighting too
        const cashFund = funds.find(f => f.fund_name === 'Cash' && f.isin_number === 'N/A');
        const hasCashWeighting = cashFund && product.portfolio.fundWeightings[cashFund.id.toString()]?.trim();
        
        // If user has entered any weightings, validate them
        if (hasAnyWeightings || hasCashWeighting) {
        const totalWeighting = calculateTotalFundWeighting(product);
          
          // Allow under 100% but prevent over 100%
          if (totalWeighting > 100) {
            showError(`Fund weightings cannot exceed 100%. Current total: ${totalWeighting.toFixed(1)}%. You can leave some weightings empty for partial allocation.`);
          return false;
        }
        
          // Validate individual weighting values
        for (const fundId of product.portfolio.selectedFunds) {
          const weighting = product.portfolio.fundWeightings[fundId.toString()];
            
            if (weighting && weighting.trim() !== '') {
              const weightValue = parseFloat(weighting);
              if (isNaN(weightValue) || weightValue <= 0 || weightValue > 100) {
                productWeightingErrors[fundId.toString()] = 'Must be between 0.01 and 100';
                hasErrors = true;
              }
            }
          }
          
          // Validate Cash fund weighting if provided
          if (cashFund && hasCashWeighting) {
          const cashWeighting = product.portfolio.fundWeightings[cashFund.id.toString()];
            const cashWeightValue = parseFloat(cashWeighting);
            if (isNaN(cashWeightValue) || cashWeightValue < 0 || cashWeightValue > 100) {
              showError(`Cash fund weighting must be between 0 and 100%.`);
              return false;
            }
          }
        }
      }
      
      // Store errors for this product
      if (Object.keys(productErrors).length > 0) {
        newValidationErrors[product.id] = productErrors;
      }
      if (Object.keys(productWeightingErrors).length > 0) {
        newWeightingErrors[product.id] = productWeightingErrors;
      }
    }

    // Set the validation errors (this will trigger re-render with highlighted fields)
    setValidationErrors(newValidationErrors);
    setWeightingErrors(newWeightingErrors);
    
    // If there are errors, scroll to the first product with errors
    if (hasErrors) {
      const firstErrorProductId = Object.keys(newValidationErrors)[0] || Object.keys(newWeightingErrors)[0];
      if (firstErrorProductId) {
        setTimeout(() => {
          productRefs.current[firstErrorProductId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      }
      
      // Show a gentle error message without clearing form data
      showToastMessage('Please fix the highlighted errors before saving.');
      return false;
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

        // Generate product name if it's empty
        const finalProductName = product.product_name.trim() || generateProductName(product);

        // Generate portfolio name using the new auto-generation system
        const finalPortfolioName = product.portfolio.name.trim() || `Portfolio for ${finalProductName}`;

        // First, create the portfolio if needed
        if (product.portfolio.type === 'template' && product.portfolio.templateId && product.portfolio.generationId) {
          // Create portfolio from template generation
          const templateResponse = await api.post('/portfolios/from_template', {
            template_id: product.portfolio.templateId,
            generation_id: product.portfolio.generationId, // Send the generation ID to the API
            portfolio_name: finalPortfolioName,
            status: 'active',
            start_date: formattedStartDate
          });
          portfolioId = templateResponse.data.id;
          console.log(`Created portfolio from template generation with ID: ${portfolioId}`);
        } else if (product.portfolio.type === 'bespoke') {
          // Create a bespoke portfolio
          const portfolioResponse = await api.post('/portfolios', {
            portfolio_name: finalPortfolioName,
            status: 'active',
            start_date: formattedStartDate
          });
          portfolioId = portfolioResponse.data.id;
          console.log(`Created bespoke portfolio with ID: ${portfolioId}`);
          
          // Add funds for bespoke portfolio
          if (portfolioId) {
            // Only add the explicitly selected funds (not Cash fund)
            const fundPromises = product.portfolio.selectedFunds.map(async (fundId) => {
              try {
                // Get the weighting for this fund
                const weighting = product.portfolio.fundWeightings[fundId.toString()];
                const weightingValue = weighting ? parseFloat(weighting) : 0;
                
                const fundData = {
                  portfolio_id: portfolioId,
                  available_funds_id: fundId,
                  target_weighting: weightingValue, // Keep as percentage, don't convert to decimal
                  status: 'active',
                  start_date: formattedStartDate
                };
                
                console.log(`Adding fund ${fundId} to portfolio ${portfolioId} with data:`, fundData);
                await api.post('/portfolio_funds', fundData);
                console.log(`Added fund ${fundId} to portfolio ${portfolioId}`);
              } catch (err: any) {
                console.error(`Error adding fund ${fundId} to portfolio:`, err);
                if (err.response && err.response.data) {
                  console.error('API Error details:', err.response.data);
                }
                throw err;
              }
            });
            
            // Wait for all fund additions to complete
            await Promise.all(fundPromises);
            
            // Update Cash fund weighting if user has entered a custom value
            if (cashFund) {
              const cashWeighting = product.portfolio.fundWeightings[cashFund.id.toString()];
              
              if (cashWeighting && cashWeighting.trim() !== '') {
                try {
                  const cashWeightingValue = parseFloat(cashWeighting);
                  
                  // Get the automatically created Cash fund entry to update it
                  const portfolioFundsResponse = await api.get(`/portfolio_funds`, {
                    params: { portfolio_id: portfolioId }
                  });
                  
                  const cashFundEntry = portfolioFundsResponse.data.find((pf: any) => 
                    pf.available_funds_id === cashFund.id
                  );
                  
                  if (cashFundEntry) {
                    // Update the existing Cash fund entry
                    await api.patch(`/portfolio_funds/${cashFundEntry.id}`, {
                      target_weighting: cashWeightingValue // Keep as percentage, don't convert to decimal
                    });
                    console.log(`Updated Cash fund weighting to ${cashWeightingValue}% for portfolio ${portfolioId}`);
                  }
                } catch (err: any) {
                  console.error(`Error updating Cash fund weighting:`, err);
                  // Don't throw here as this is not critical
                }
              }
            } else {
              console.log(`No cash fund found in funds list`);
            }
          }
        }

        // Now, create client product with reference to the portfolio
        if (portfolioId) {
          try {
            // Calculate target risk for bespoke portfolios
            let targetRisk = null;
            if (product.portfolio.type === 'bespoke') {
              targetRisk = calculateTargetRiskFromFunds(product);
            }
            
            const clientProductResponse = await api.post('/client_products', {
              client_id: selectedClientId,
              provider_id: product.provider_id,
              product_type: product.product_type,
              product_name: finalProductName,
              portfolio_id: portfolioId,
              status: 'active',
              start_date: formattedStartDate,
              plan_number: product.plan_number || null,
              target_risk: targetRisk
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

      navigate(returnPath);

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
      // Sort alphabetically by fund name
      nonCashFunds.sort((a: Fund, b: Fund) => a.fund_name.localeCompare(b.fund_name));
      setFilteredFunds(nonCashFunds);
      return;
    }
    
    const term = searchTerm.toLowerCase();
    const filtered = funds.filter((fund: Fund) => 
      (fund.fund_name.toLowerCase().includes(term) || 
      (fund.isin_number && fund.isin_number.toLowerCase().includes(term))) &&
      !(fund.fund_name === 'Cash' && fund.isin_number === 'N/A') // Also exclude Cash fund from search results
    );
    
    // Sort search results alphabetically by fund name
    filtered.sort((a: Fund, b: Fund) => a.fund_name.localeCompare(b.fund_name));
    setFilteredFunds(filtered);
  };

  const renderPortfolioSection = (product: ProductItem): JSX.Element => {
    const isLoadingTemplate = templateLoading[product.id] === true;
    const isLoadingGeneration = generationLoading[product.id] === true;
    const isEitherLoading = isLoadingTemplate || isLoadingGeneration;
    const templateId = product.portfolio.templateId;
    const generations = templateId ? templateGenerations[templateId.toString()] || [] : [];
    
    return (
      <div className="portfolio-section space-y-3">
        {/* Show loading overlay when template or generation is loading */}
        {isEitherLoading && (
          <div className="absolute inset-0 bg-white bg-opacity-70 flex items-center justify-center z-10 rounded">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
          </div>
        )}
        
        {/* Portfolio Configuration Row */}
        <div className="grid grid-cols-2 gap-3">
          {/* Portfolio Name - Auto-generated */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
            Portfolio Name <span className="text-red-500">*</span>
              <span className="text-gray-400">(auto-generated)</span>
          </label>
          <input
            type="text"
              value={(() => {
                // Auto-generate portfolio name based on product name
                const productName = product.product_name.trim() || generateProductName(product);
                return product.portfolio.name.trim() || `Portfolio for ${productName || 'Product'}`;
              })()}
              onChange={(e) => {
                // Allow manual override of portfolio name
                const value = e.target.value;
                handlePortfolioNameChange(product.id, value);
              }}
              className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full text-sm border-gray-300 rounded-md h-8"
              placeholder="Auto-generated"
          />
          {validationErrors[product.id]?.portfolioName && (
            <div className="text-xs text-red-600 mt-1">
              {validationErrors[product.id].portfolioName}
            </div>
          )}
        </div>
        
        {/* Portfolio Type Selection */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
            Portfolio Type <span className="text-red-500">*</span>
          </label>
          <Radio.Group
            value={product.portfolio.type}
            onChange={(e) => handlePortfolioTypeChange(product.id, e.target.value as 'template' | 'bespoke')}
            disabled={isEitherLoading}
              size="middle"
              className="flex space-x-4"
          >
              <Radio value="bespoke" className="text-sm">Bespoke</Radio>
              <Radio value="template" className="text-sm">Template</Radio>
          </Radio.Group>
          </div>
        </div>

        {/* Template Selection Row - Only show if template type is selected */}
        {product.portfolio.type === 'template' && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
              Select Template <span className="text-red-500">*</span>
            </label>
            <SearchableDropdown
              id={`template-select-${product.id}`}
              options={availableTemplates.map(t => ({ value: t.id.toString(), label: t.name || `Template ${t.id}` }))}
              value={product.portfolio.templateId?.toString() ?? ''}
              onChange={val => handleTemplateSelection(product.id, String(val))}
              placeholder="Select template"
              className={`w-full text-sm ${validationErrors[product.id]?.template ? 'border-red-500' : ''}`}
              required
              disabled={isEitherLoading}
              loading={isLoadingTemplate || availableTemplates.length === 0}
            />
            {validationErrors[product.id]?.template && (
              <div className="text-xs text-red-600 mt-1">
                {validationErrors[product.id].template}
              </div>
            )}
          </div>

        {/* Generation Selection - Show after template is selected */}
            {product.portfolio.templateId && generations.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
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
              placeholder="Select generation"
              className={`w-full text-sm ${validationErrors[product.id]?.generation ? 'border-red-500' : ''}`}
              required
              disabled={isEitherLoading}
              loading={isLoadingGeneration || (!!product.portfolio.templateId && generations.length === 0)}
            />
            {validationErrors[product.id]?.generation && (
              <div className="text-xs text-red-600 mt-1">
                {validationErrors[product.id].generation}
              </div>
            )}
            </div>
            )}
          </div>
        )}

        {/* Side-by-side Fund Selection Layout */}
        <div className="grid grid-cols-2 gap-4">
          {/* Left Column - Available Funds */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className={`text-xs font-medium ${
                validationErrors[product.id]?.funds ? 'text-red-600' : 'text-gray-700'
              }`}>
                Available Funds
                {product.portfolio.type === 'bespoke' && <span className="text-red-500 ml-1">*</span>}
              </h4>
            <button
              type="button"
              onClick={() => {
                setAddFundForProductId(product.id);
                setIsAddFundModalOpen(true);
              }}
                className="bg-primary-600 text-white px-2 py-1 rounded text-xs hover:bg-primary-700 transition-colors duration-150 inline-flex items-center gap-1"
              title="Add new fund"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
                Add
            </button>
          </div>
            
            {/* Fund Search */}
            <Input
              placeholder="Search funds..."
              value={fundSearchTerm}
              onChange={(e) => handleFundSearch(e.target.value)}
              disabled={isEitherLoading}
              size="middle"
              className="w-full"
            />
            
            {/* Available Fund List */}
            <div className={`h-48 overflow-y-auto border rounded p-2 bg-gray-50 ${
              validationErrors[product.id]?.funds ? 'border-red-500 bg-red-50' : 'border-gray-200'
          }`}>
              {filteredFunds.length === 0 ? (
                <div className="text-xs text-gray-500 text-center py-4">
                  No funds found. Try adjusting your search.
                </div>
              ) : (
                <div className="space-y-1">
            {filteredFunds.map(fund => (
                    <div 
                      key={fund.id} 
                      className="flex items-center space-x-2 p-2 hover:bg-white rounded text-xs cursor-pointer transition-colors"
                      onClick={() => handleFundSelection(product.id, fund.id)}
                    >
                <Checkbox
                  checked={product.portfolio.selectedFunds.includes(fund.id)}
                  onChange={() => handleFundSelection(product.id, fund.id)}
                  disabled={isEitherLoading}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 truncate" title={fund.fund_name}>
                          {fund.fund_name}
                        </div>
                        {fund.isin_number && (
                          <div className="text-gray-500 truncate" title={fund.isin_number}>
                            {fund.isin_number}
                          </div>
                        )}
                      </div>
              </div>
            ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Selected Funds */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <h4 className="text-xs font-medium text-gray-700">Selected Funds</h4>
                <div className="bg-primary-100 text-primary-800 px-2 py-0.5 rounded-full text-xs font-medium">
                  {product.portfolio.selectedFunds.length}
                </div>
                {product.portfolio.type === 'bespoke' && (
                  <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    (() => {
                      const totalWeight = calculateTotalFundWeighting(product);
                      if (totalWeight > 100) return 'bg-red-100 text-red-800';
                      if (totalWeight === 100) return 'bg-green-100 text-green-800';
                      if (totalWeight > 0) return 'bg-blue-100 text-blue-800';
                      return 'bg-gray-100 text-gray-600';
                    })()
                  }`}>
                    {calculateTotalFundWeighting(product).toFixed(1)}%
                  </div>
                )}
              </div>
              {product.portfolio.selectedFunds.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setProducts(prev => prev.map(p => p.id === product.id ? {
                      ...p,
                      portfolio: {
                        ...p.portfolio,
                        selectedFunds: [],
                        fundWeightings: {}
                      }
                    } : p));
                  }}
                  className="text-gray-400 hover:text-red-500 text-xs"
                  title="Clear all"
                >
                  Clear all
                </button>
              )}
            </div>

            {/* Selected Funds Display */}
            <div className="h-48 overflow-y-auto border rounded bg-white">
              {product.portfolio.selectedFunds.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-gray-500">
                  No funds selected
                </div>
              ) : (
                <div className="p-2 space-y-2">
                  {/* Cash fund for bespoke portfolios */}
                  {product.portfolio.type === 'bespoke' && (() => {
                    const cashFund = funds.find(f => f.fund_name === 'Cash' && f.isin_number === 'N/A');
                    if (cashFund) {
                      return (
                        <div key={`cash-${cashFund.id}`} className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded p-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2 flex-1 min-w-0">
                              <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-medium text-blue-900">{cashFund.fund_name}</div>
                                <div className="text-xs text-blue-700">Auto-included</div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-1 flex-shrink-0">
                              <input
                                type="text"
                                value={product.portfolio.fundWeightings[cashFund.id.toString()] || '0'}
                                onChange={(e) => handleWeightingChange(product.id, cashFund.id, e.target.value)}
                                className="w-12 text-xs text-center border border-blue-300 rounded px-1 py-0.5 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                                placeholder="0"
                              />
                              <span className="text-xs text-blue-700">%</span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}
                  
                  {/* Other selected funds */}
                  {product.portfolio.selectedFunds.map((fundId) => {
                    const fund = funds.find(f => f.id === fundId);
                    // Skip Cash fund as it's shown above for bespoke
                    if (product.portfolio.type === 'bespoke' && fund?.fund_name === 'Cash' && fund?.isin_number === 'N/A') {
                      return null;
                    }
                    
                    return (
                      <div key={fundId} className="bg-gray-50 border border-gray-200 rounded p-2 hover:bg-gray-100 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2 flex-1 min-w-0">
                            <div className="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0"></div>
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-medium text-gray-900 truncate" title={fund?.fund_name}>
                                {fund?.fund_name || 'Unknown Fund'}
                              </div>
                              {fund?.isin_number && (
                                <div className="text-xs text-gray-500 truncate" title={fund.isin_number}>
                                  {fund.isin_number}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-1 flex-shrink-0">
                            {product.portfolio.type === 'bespoke' && (
                              <>
                                <input
                                  type="text"
                                  value={product.portfolio.fundWeightings[fundId.toString()] || ''}
                                  onChange={(e) => handleWeightingChange(product.id, fundId, e.target.value)}
                                  className={`w-12 text-xs text-center border rounded px-1 py-0.5 focus:ring-1 focus:ring-primary-500 focus:border-primary-500 ${
                                    weightingErrors[product.id]?.[fundId.toString()]
                                    ? 'border-red-500 bg-red-50'
                                    : 'border-gray-300'
                                  }`}
                                  placeholder="0"
                                />
                                <span className="text-xs text-gray-500">%</span>
                              </>
                            )}
                            <button
                              type="button"
                              onClick={() => handleFundSelection(product.id, fundId)}
                              className="text-gray-400 hover:text-red-500 p-0.5 rounded hover:bg-red-50 transition-colors"
                              title="Remove fund"
                            >
                              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </div>
                        
                        {/* Show weighting errors */}
                        {weightingErrors[product.id]?.[fundId.toString()] && (
                          <div className="mt-1 text-xs text-red-600 bg-red-50 px-1 py-0.5 rounded">
                            {weightingErrors[product.id][fundId.toString()]}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Portfolio Risk Summary */}
            {product.portfolio.selectedFunds.length > 0 && (
              <div className="bg-gray-50 rounded border border-gray-200 p-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">Portfolio Risk:</span>
                  <span className="font-medium text-gray-900">
                    {(() => {
                      const risk = calculateTargetRiskFromFunds(product);
                      return risk ? risk.toFixed(1) : 'N/A';
                    })()}
                  </span>
                </div>
              </div>
            )}
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
      <div className="max-w-7xl mx-auto px-3 py-3">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-3 border-primary-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-3 py-1">
      {/* Toast notification */}
      {showToast && (
        <div className="fixed top-4 right-4 z-50 bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-3 rounded shadow-md">
          <div className="flex items-center">
            <div className="py-1">
              <svg className="h-5 w-5 text-blue-500 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-sm">Notification</p>
              <p className="text-xs">{toastMessage}</p>
            </div>
            <button 
              onClick={() => setShowToast(false)} 
              className="ml-auto text-blue-500 hover:text-blue-700"
            >
              <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Compact Header */}
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center">
          <div className="bg-primary-100 p-2 rounded-lg mr-3 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h1 className="text-2xl font-normal text-gray-900 font-sans tracking-wide">Create Client Products</h1>
          
          {/* Keyboard shortcuts help */}
          <div className="ml-4 relative group">
            <button
              type="button"
              className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
              title="Keyboard shortcuts"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
              </svg>
            </button>
            <div className="invisible group-hover:visible absolute left-0 top-8 z-50 bg-gray-900 text-white text-xs rounded-lg p-3 shadow-lg w-64">
              <div className="font-medium mb-2">Keyboard Shortcuts:</div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span>Save products</span>
                  <span className="text-gray-300">Ctrl+Enter</span>
                </div>
                <div className="flex justify-between">
                  <span>Duplicate last product</span>
                  <span className="text-gray-300">Ctrl+D</span>
                </div>
                <div className="flex justify-between">
                  <span>Add new product</span>
                  <span className="text-gray-300">Ctrl+Shift+A</span>
                </div>
                <div className="flex justify-between">
                  <span>Close modals</span>
                  <span className="text-gray-300">Escape</span>
                </div>
              </div>
            </div>
        </div>
      </div>

        {/* Floating Summary */}
        {products.length > 0 && (
          <div className="bg-white rounded-full shadow-lg px-4 py-2 border border-gray-200">
            <div className="flex items-center space-x-2">
              <div className="text-center">
                <div className="text-lg font-bold text-primary-700">{products.length}</div>
                <div className="text-xs text-gray-600">Product{products.length !== 1 ? 's' : ''}</div>
              </div>
              {selectedClientId && (
                <div className="text-sm text-gray-500 ml-2">
                  for {clients.find(c => c.id === selectedClientId)?.name}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-700"></div>
          </div>
        ) : error ? (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 mb-4 rounded">
            <p className="text-sm">{error}</p>
          </div>
        ) : (
          <div className="bg-white shadow-sm rounded-lg border border-gray-200">
            <form onSubmit={handleSubmit} className="p-4">
              {/* Step 1: Client Selection and Start Date - Compact Layout */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200">
                <h2 className="text-lg font-medium mb-3 text-gray-900">Client & Start Date</h2>
                <div className="grid grid-cols-2 gap-4">
                {/* Client Selection */}
                  <div>
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
                        size="middle"
                    >
                      {clients.map(client => (
                        <Select.Option key={client.id} value={client.id}>
                          {client.name}
                        </Select.Option>
                      ))}
                    </Select>
                  ) : (
                      <div className="text-gray-500 text-sm bg-gray-100 p-2 rounded">
                        No clients available. Please add a client first.
                      </div>
                  )}
                </div>

                {/* Start Date Selection */}
                  <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <DatePicker
                    value={startDate}
                    onChange={(date) => setStartDate(date as Dayjs)}
                      className="w-full"
                      size="middle"
                      format="DD/MM/YYYY"
                  />
                  </div>
                </div>
              </div>

              {/* Step 2: Products Section - Only show after client selected */}
              {selectedClientId && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h2 className="text-lg font-medium text-gray-900">Products</h2>
                    <div className="flex items-center space-x-2">
                      {/* Quick Actions */}
                      {products.length > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            if (products.length > 0) {
                              const lastProduct = products[products.length - 1];
                              const newProduct = {
                                ...lastProduct,
                                id: `temp-${Date.now()}`,
                                product_name: '',
                                portfolio: {
                                  ...lastProduct.portfolio,
                                  name: '', // Will be auto-generated based on product details
                                  selectedFunds: [],
                                  fundWeightings: {}
                                }
                              };
                              setProducts([...products, newProduct]);
                            }
                          }}
                          className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 shadow-sm flex items-center gap-1"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          Duplicate Last
                        </button>
                      )}
                  <button
                    type="button"
                    onClick={handleAddProduct}
                        className="bg-primary-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-primary-800 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-700 focus:ring-offset-2 shadow-sm flex items-center gap-1"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                        Add Product
                  </button>
                    </div>
                </div>

                {products.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="mx-auto w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mb-3">
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                      <p className="text-sm font-medium">No products added yet</p>
                      <p className="text-xs">Click "Add Product" above to create your first product</p>
                  </div>
                ) : (
                    <div className="space-y-3">
                      {products.map((product, index) => {
                        const provider = providers.find(p => p.id === product.provider_id);
                        const themeColor = getProviderColor(product.provider_id, provider?.name, provider?.theme_color);
                        const isExpanded = true; // Always keep products editable
                        
                        return (
                      <div 
                        key={product.id} 
                            className="bg-white rounded-lg shadow-sm border-2 transition-all duration-200 hover:shadow-md"
                            style={{ 
                              borderColor: product.provider_id ? themeColor : '#E5E7EB',
                              borderLeftWidth: '6px'
                            }}
                        ref={el => productRefs.current[product.id] = el}
                        id={`product-${product.id}`}
                      >
                            {/* Compact Product Header */}
                            <div className="p-3">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center space-x-3">
                                  <div 
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: themeColor }}
                                  />
                                  <h3 className="text-sm font-medium text-gray-900">
                                    {product.product_name.trim() || generateProductName(product) || `Product ${index + 1}`}
                          </h3>
                                  {provider && (
                                    <span className="text-xs text-gray-500">
                                      {provider.name}
                                    </span>
                                  )}
                                  {product.product_type && (
                                    <span 
                                      className="px-2 py-0.5 text-xs font-medium rounded-full"
                                      style={{ 
                                        backgroundColor: `${themeColor}15`,
                                        color: themeColor
                                      }}
                                    >
                                      {product.product_type}
                                    </span>
                                  )}
                            </div>
                                <div className="flex items-center space-x-1">
                                  {/* Validation status indicator */}
                                  {validationErrors[product.id] && Object.keys(validationErrors[product.id]).length > 0 ? (
                                    <div className="w-2 h-2 bg-red-500 rounded-full" title="Has validation errors" />
                                  ) : product.provider_id && product.product_type ? (
                                    <div className="w-2 h-2 bg-green-500 rounded-full" title="Complete" />
                                  ) : (
                                    <div className="w-2 h-2 bg-yellow-500 rounded-full" title="Incomplete" />
                                  )}
                            <button
                              type="button"
                                    onClick={() => handleRemoveProduct(product.id)}
                                    className="text-gray-400 hover:text-red-500 transition-colors duration-200 p-1"
                            >
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </div>

                              {/* Compact configuration form - always visible for incomplete products */}
                              {isExpanded && (
                                <div className="space-y-3 pt-3 border-t border-gray-100">
                                  {/* Row 1: Provider, Product Type, Product Name */}
                                  <div className="grid grid-cols-3 gap-3">
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-1">
                              Provider <span className="text-red-500">*</span>
                            </label>
                            <SearchableDropdown
                              id={`provider-select-${product.id}`}
                              options={providers.map(p => ({ value: p.id, label: p.name }))}
                              value={product.provider_id}
                              onChange={val => handleProductChange(product.id, 'provider_id', Number(val))}
                                        placeholder="Select provider"
                                        className={`w-full text-sm ${validationErrors[product.id]?.provider ? 'border-red-500' : ''}`}
                              required
                            />
                            {validationErrors[product.id]?.provider && (
                              <div className="text-xs text-red-600 mt-1">
                                {validationErrors[product.id].provider}
                              </div>
                            )}
                          </div>

                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-1">
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
                                { value: 'Pension', label: 'Pension' },
                                { value: 'Other', label: 'Other' },
                              ]}
                              value={product.product_type}
                              onChange={val => handleProductTypeChange(product.id, String(val))}
                                        placeholder="Select type"
                                        className={`w-full text-sm ${validationErrors[product.id]?.productType ? 'border-red-500' : ''}`}
                              required
                            />
                            {validationErrors[product.id]?.productType && (
                              <div className="text-xs text-red-600 mt-1">
                                {validationErrors[product.id].productType}
                              </div>
                            )}
                          </div>

                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-1">
                                        Product Name <span className="text-gray-400">(optional)</span>
                                      </label>
                                      <input
                                        type="text"
                                        value={product.product_name}
                                        onChange={(e) => handleProductChange(product.id, 'product_name', e.target.value)}
                                        className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full text-sm border-gray-300 rounded-md h-8"
                                        placeholder="Auto-generated"
                                      />
                          </div>
                        </div>

                                  {/* Row 2: Product Owners */}
                                  <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                      Product Owners
                                    </label>
                                    <div className="flex space-x-2">
                                      <div className="flex-grow">
                                        <Select
                                          mode="multiple"
                                          showSearch
                                          value={product.product_owner_ids}
                                          onChange={(values: number[]) => {
                                            handleProductChange(product.id, 'product_owner_ids', values);
                                          }}
                                          placeholder="Search and select product owners"
                                          className="w-full"
                                          size="middle"
                                          allowClear
                                          maxTagCount="responsive"
                                          optionFilterProp="children"
                                          placement="bottomLeft"
                                          listHeight={200}
                                          filterOption={(input, option) =>
                                            (option?.children as unknown as string)
                                              .toLowerCase()
                                              .includes(input.toLowerCase())
                                          }
                                          dropdownRender={(menu) => (
                                            <div className="max-h-48">
                                              <div className="max-h-40 overflow-y-auto">
                                                {menu}
                                              </div>
                                              <div className="border-t border-gray-200 p-1">
                                                <button
                                                  type="button"
                                                  onClick={() => openCreateProductOwnerModal(product.id)}
                                                  className="w-full text-left px-2 py-1 text-xs text-primary-600 hover:bg-primary-50 rounded flex items-center space-x-1"
                                                >
                                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                                  </svg>
                                                  <span>Create new product owner</span>
                                                </button>
                                              </div>
                                            </div>
                                          )}
                                        >
                                          {productOwners.map(owner => (
                                            <Select.Option key={owner.id} value={owner.id}>
                                              {owner.name}
                                            </Select.Option>
                                          ))}
                                        </Select>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={() => openCreateProductOwnerModal(product.id)}
                                        className="bg-primary-600 text-white p-1.5 rounded hover:bg-primary-700 transition-colors duration-150 inline-flex items-center justify-center"
                                        title="Create new product owner"
                                      >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                        </svg>
                                      </button>
                                    </div>
                                  </div>

                                  {/* Portfolio Configuration */}
                                  <div className="border-t pt-3">
                                    <h4 className="text-sm font-medium text-gray-900 mb-2">Portfolio Configuration</h4>
                          {renderPortfolioSection(product)}
                        </div>
                      </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
              )}

              {/* Submit Button - Context-aware */}
              {selectedClientId && products.length > 0 && (
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => navigate(returnPath)}
                    className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2"
                  >
                    Cancel
                  </button>
                <button
                  type="submit"
                  disabled={isSaving}
                    className="bg-primary-700 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-primary-800 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-700 focus:ring-offset-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isSaving ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Saving...
                      </div>
                    ) : (
                      `Create ${products.length} Product${products.length !== 1 ? 's' : ''} for ${clients.find(c => c.id === selectedClientId)?.name || 'Client'}`
                    )}
                </button>
              </div>
              )}
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
              className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full text-sm border-gray-300 rounded-md h-8"
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
      {isAddFundModalOpen && (
      <AddFundModal
        isOpen={isAddFundModalOpen}
        onClose={() => {
          setIsAddFundModalOpen(false);
          setAddFundForProductId(null);
        }}
        onFundAdded={handleFundAdded}
      />
      )}
    </div>
  );
};

export default CreateClientProducts;