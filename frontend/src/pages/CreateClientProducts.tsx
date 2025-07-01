import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate, useLocation, useSearchParams, Link } from 'react-router-dom';
import AddFundModal from '../components/AddFundModal';
import CreateProductOwnerModal from '../components/CreateProductOwnerModal';

import { useAuth } from '../context/AuthContext';
import { Radio, Select, Input, Checkbox } from 'antd';
import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import SearchableDropdown from '../components/ui/SearchableDropdown';
import { BaseInput, NumberInput, DateInput, BaseDropdown, MultiSelectDropdown, AutocompleteSearch, AutocompleteOption, ActionButton, AddButton, DeleteButton } from '../components/ui';
import { getProviderColor } from '../services/providerColors';
import { findCashFund, isCashFund } from '../utils/fundUtils';
import { useNavigationRefresh } from '../hooks/useNavigationRefresh';
import { getProductOwnerDisplayName } from '../utils/productOwnerUtils';

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
  firstname?: string;
  surname?: string;
  known_as?: string;
  name?: string; // Computed field from backend
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
  start_date: dayjs.Dayjs; // Required field - each product has its own start date
  plan_number?: string; // Add plan number field
  product_owner_ids: number[]; // Changed from product_owner_id to product_owner_ids array
  fixed_cost?: number; // Fixed annual cost for revenue calculation
  percentage_fee?: number; // Percentage fee for revenue calculation
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
  const [searchParams] = useSearchParams();
  const { api } = useAuth();
  const { navigateToClientGroups } = useNavigationRefresh();
  
  // Add custom styles for validation errors
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .product-owners-error .ant-select-selector {
        border-color: #dc2626 !important;
        box-shadow: 0 0 0 2px rgba(220, 38, 38, 0.2) !important;
      }
      .product-owners-error .ant-select-selector:hover {
        border-color: #dc2626 !important;
      }
      .product-owners-error .ant-select-focused .ant-select-selector {
        border-color: #dc2626 !important;
        box-shadow: 0 0 0 2px rgba(220, 38, 38, 0.2) !important;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);
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
  const [currentProductId, setCurrentProductId] = useState<string>('');
  
  // Add Fund Modal state
  const [isAddFundModalOpen, setIsAddFundModalOpen] = useState(false);
  const [addFundForProductId, setAddFundForProductId] = useState<string | null>(null);
  
  // Add validation error states for field-level validation
  const [validationErrors, setValidationErrors] = useState<Record<string, Record<string, string>>>({});
  const [weightingErrors, setWeightingErrors] = useState<Record<string, Record<string, string>>>({});
  
  // Computed state to check if form is valid for submit button
  const isFormValid = React.useMemo(() => {
    if (!selectedClientId || products.length === 0) return false;
    
    // Check if any product lacks required fields
    return products.every(product => {
      // Check required fields
      const hasProvider = !!product.provider_id;
      const hasProductType = !!product.product_type;
      const hasStartDate = !!product.start_date;
      const hasProductOwners = product.product_owner_ids && product.product_owner_ids.length > 0;
      
      // Portfolio validation
      let hasValidPortfolio = false;
      if (product.portfolio.type === 'template') {
        hasValidPortfolio = !!product.portfolio.templateId && !!product.portfolio.generationId;
      } else {
        hasValidPortfolio = product.portfolio.selectedFunds.length > 0;
      }
      
      return hasProvider && hasProductType && hasStartDate && hasProductOwners && hasValidPortfolio;
    });
  }, [selectedClientId, products]);
  
  // Helper function to get missing required fields for validation message
  const getMissingFields = React.useMemo(() => {
    if (!selectedClientId || products.length === 0) return [];
    
    const missing: string[] = [];
    products.forEach((product, index) => {
      // Only show validation errors for products that have been partially filled out
      // This prevents showing errors immediately when a new empty product is added
      const hasAnyData = product.provider_id > 0 || 
                        product.product_type.trim() || 
                        product.product_name.trim() || 
                        product.product_owner_ids.length > 0 ||
                        product.portfolio.selectedFunds.length > 0 ||
                        product.portfolio.templateId;
      
      // Skip validation display for completely empty products
      if (!hasAnyData) return;
      
      // Simple product naming without dependency on generateProductName function
      const productName = product.product_name.trim() || `Product ${index + 1}`;
      const issues = [];
      
      if (!product.provider_id) issues.push('Provider');
      if (!product.product_type) issues.push('Product Type');
      if (!product.start_date) issues.push('Start Date');
      if (!product.product_owner_ids || product.product_owner_ids.length === 0) issues.push('Product Owner');
      
      if (product.portfolio.type === 'template') {
        if (!product.portfolio.templateId) issues.push('Portfolio Template');
        if (!product.portfolio.generationId) issues.push('Portfolio Generation');
      } else {
        if (product.portfolio.selectedFunds.length === 0) issues.push('Portfolio Funds');
      }
      
      if (issues.length > 0) {
        missing.push(`${productName}: ${issues.join(', ')}`);
      }
    });
    
    return missing;
  }, [selectedClientId, products]);
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle shortcuts when not typing in inputs
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      // Ctrl+Enter or Cmd+Enter - Save products
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter' && !isSaving && products.length > 0 && isFormValid) {
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
          start_date: dayjs().startOf('month'), // Reset to first day of current month for new product
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
        
        // Don't generate a name if the product is completely empty (no meaningful details)
        const hasProductDetails = product.provider_id > 0 || 
                                 product.product_type.trim() || 
                                 product.product_name.trim() || 
                                 product.product_owner_ids.length > 0;
        
        if (shouldUpdate && hasProductDetails) {
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
        
        // Set defaults only if no URL client parameter is provided
        if (!urlClientId && clientsRes.data.length > 0) {
          setSelectedClientId(clientsRes.data[0].id);
        }
        
        console.log("Data fetched successfully for CreateClientProducts");
      } catch (err: any) {
        console.error('Error fetching data:', err);
        showError(err.response?.data?.detail || 'Failed to fetch data');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
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



  // Create client options for AutocompleteSearch
  const clientOptions: AutocompleteOption[] = React.useMemo(() => {
    return clients.map(client => ({
      value: client.id.toString(),
      label: client.name || 'Unnamed Client'
    }));
  }, [clients]);

  // Handle client selection from AutocompleteSearch
  const handleClientSelect = (option: AutocompleteOption) => {
    const clientId = parseInt(option.value);
    handleClientChange(clientId);
  };

  const handleAddProduct = () => {
    if (!selectedClientId) {
      showError('Please select a client first');
      return;
    }
    
    // Create a new empty product with a temporary ID
    const productId = `temp-${Date.now()}`;
    
    // Find cash fund to preselect it
    const cashFund = findCashFund(funds);
    const initialSelectedFunds = cashFund ? [cashFund.id] : [];
    const initialFundWeightings = cashFund ? { [cashFund.id.toString()]: '0' } : {};
    
    const newProduct: ProductItem = {
      id: productId,
      client_id: selectedClientId,
      provider_id: 0,
      product_type: '',
      product_name: '',
      status: 'active',
      start_date: dayjs().startOf('month'), // Default to first day of current month
      plan_number: '', // Initialize as empty string
      product_owner_ids: [],
      portfolio: {
        name: '', // Will be generated when product details are filled
        selectedFunds: initialSelectedFunds,
        type: 'bespoke',
        fundWeightings: initialFundWeightings
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
            generationId: updatedType === 'bespoke' ? undefined : product.portfolio.generationId,
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
    const cashFund = findCashFund(funds);
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
    const cashFund = findCashFund(funds);
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

  // Function to generate product name based on provider, product type, and owners
  const generateProductName = (product: ProductItem): string => {
    // Get provider name
    const provider = providers.find(p => p.id === product.provider_id);
    const providerName = provider ? provider.name : '';

    // Get product type
    const productType = product.product_type;

    // Get product owner names
    const ownerNames = product.product_owner_ids
      .map(ownerId => {
        const owner = productOwners.find(o => o.id === ownerId);
        return owner ? getProductOwnerDisplayName(owner) : '';
      })
      .filter(name => name.length > 0);

    // Generate name in order: Provider → Product Type → Product Owner Names
    if (ownerNames.length === 0) {
      // No owners - just use provider and product type
      return `${providerName} ${productType}`.trim();
    } else if (ownerNames.length === 1) {
      // Single owner - format: "Provider ProductType Owner"
      return `${providerName} ${productType} ${ownerNames[0]}`.trim();
    } else {
      // Multiple owners - format: "Provider ProductType Joint (Owner1, Owner2, Owner3)"
      const ownersList = ownerNames.join(', ');
      return `${providerName} ${productType} Joint (${ownersList})`.trim();
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

  // Helper function to check if a product is completely filled out
  const isProductComplete = (product: ProductItem): boolean => {
    // Check basic required fields
    if (!product.provider_id || !product.product_type || !product.start_date) {
      return false;
    }
    
    // Check product owners (at least one required)
    if (!product.product_owner_ids || product.product_owner_ids.length === 0) {
      return false;
    }
    
    // Check portfolio configuration - must have a type selected
    if (!product.portfolio.type) {
      return false;
    }
    
    // For template portfolios, need template and generation selected
    if (product.portfolio.type === 'template') {
      if (!product.portfolio.templateId || !product.portfolio.generationId) {
        return false;
      }
    }
    
    // For bespoke portfolios, need at least one fund selected (but weightings are optional for completion)
    if (product.portfolio.type === 'bespoke') {
      if (!product.portfolio.selectedFunds || product.portfolio.selectedFunds.length === 0) {
        return false;
      }
    }
    
    return true;
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

        // If switching to bespoke, automatically include Cash fund
        if (type === 'bespoke') {
          const cashFund = findCashFund(funds);
          if (cashFund) {
            updatedPortfolio.selectedFunds = [cashFund.id];
            updatedPortfolio.fundWeightings[cashFund.id.toString()] = '0';
          }

          // If there are already selected funds, merge them with Cash fund
          if (product.portfolio.selectedFunds.length > 0) {
            // Add existing funds if they're not Cash (to avoid duplicates)
            product.portfolio.selectedFunds.forEach(fundId => {
              const fund = funds.find(f => f.id === fundId);
              if (fund && !isCashFund(fund) && !updatedPortfolio.selectedFunds.includes(fundId)) {
                updatedPortfolio.selectedFunds.push(fundId);
                updatedPortfolio.fundWeightings[fundId.toString()] = '';
              }
            });
          }
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
    console.log('Showing error:', errorMessage); // Debug log
    setError(errorMessage); // Only set for popup display
    setShowErrorPopup(true);
    setTimeout(() => {
      setShowErrorPopup(false);
      setError(''); // Clear error after hiding popup
    }, 6000); // Increased timeout to 6 seconds
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

    // Check for product owner assignments across all products first
    const productsWithoutOwners = products.filter(p => !p.product_owner_ids || p.product_owner_ids.length === 0);
    if (productsWithoutOwners.length > 0) {
      const productNames = productsWithoutOwners.map(p => 
        p.product_name.trim() || generateProductName(p)
      ).join(', ');
      showError(`Please assign at least one product owner to: ${productNames}`);
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

      // Start date validation
      if (!product.start_date) {
        productErrors.start_date = 'Start date is required';
        hasErrors = true;
      }

      // Product owner validation - at least one must be assigned
      if (!product.product_owner_ids || product.product_owner_ids.length === 0) {
        productErrors.productOwners = 'Please assign at least one product owner';
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
          productErrors.funds = 'Please select at least one fund for the portfolio';
          hasErrors = true;
        }
        
        // Flexible weighting validation: Allow no weightings OR weightings that don't exceed 100%
        const hasAnyWeightings = product.portfolio.selectedFunds.some(fundId => {
          const weighting = product.portfolio.fundWeightings[fundId.toString()];
          return weighting && weighting.trim() !== '';
        });
        
        // Check Cash fund weighting too
        const cashFund = findCashFund(funds);
        const hasCashWeighting = cashFund && product.portfolio.fundWeightings[cashFund.id.toString()]?.trim();
        
        // If user has entered any weightings, validate them
        if (hasAnyWeightings || hasCashWeighting) {
        const totalWeighting = calculateTotalFundWeighting(product);
          
          // Allow under 100% but prevent over 100%
          if (totalWeighting > 100) {
            productErrors.weightings = `Fund weightings cannot exceed 100%. Current total: ${totalWeighting.toFixed(1)}%`;
            hasErrors = true;
          }
        
          // Validate individual weighting values
        for (const fundId of product.portfolio.selectedFunds) {
          const weighting = product.portfolio.fundWeightings[fundId.toString()];
            
            if (weighting && weighting.trim() !== '') {
              const weightValue = parseFloat(weighting);
              if (isNaN(weightValue) || weightValue < 0 || weightValue > 100) {
                productWeightingErrors[fundId.toString()] = 'Must be between 0 and 100';
                hasErrors = true;
              }
            }
          }
          
          // Validate Cash fund weighting if provided
          if (cashFund && hasCashWeighting) {
          const cashWeighting = product.portfolio.fundWeightings[cashFund.id.toString()];
            const cashWeightValue = parseFloat(cashWeighting);
            if (isNaN(cashWeightValue) || cashWeightValue < 0 || cashWeightValue > 100) {
              productErrors.cashWeighting = 'Cash fund weighting must be between 0 and 100%';
              hasErrors = true;
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
      
      // Show a clear error message with specific details
      const errorCount = Object.keys(newValidationErrors).length + Object.keys(newWeightingErrors).length;
      
      // Collect specific error messages (avoid duplicates with Set)
      const errorSet = new Set<string>();
      
      Object.values(newValidationErrors).forEach(productErrors => {
        Object.values(productErrors).forEach(errorMsg => {
          errorSet.add(errorMsg);
        });
      });
      
      Object.values(newWeightingErrors).forEach(productErrors => {
        Object.values(productErrors).forEach(errorMsg => {
          errorSet.add(errorMsg);
        });
      });
      
      const errorMessages = Array.from(errorSet);
      
      // Only show unique, meaningful error messages
      const uniqueErrors = errorMessages.filter(msg => msg && msg.trim().length > 0);
      const errorSummary = uniqueErrors.length > 0 
        ? `Please fix the following errors: ${uniqueErrors.slice(0, 3).join(', ')}${uniqueErrors.length > 3 ? ' and others' : ''}`
        : 'Please complete all required fields before saving.';
      
      showError(errorSummary);
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
    
    try {
      // Find the Cash fund ID (if it exists in our funds list)
      // This might not be strictly necessary if backend handles it, but good for consistency
      const cashFund = findCashFund(funds);
      
      for (const product of products) {
        // Format the product-specific start date with dayjs
        const formattedStartDate = product.start_date.format('YYYY-MM-DD');
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
              target_risk: targetRisk,
              template_generation_id: product.portfolio.type === 'template' ? product.portfolio.generationId : null,
              fixed_cost: product.fixed_cost || null,
              percentage_fee: product.percentage_fee || null
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

      // Navigate to client details page
      navigate(`/clients/${selectedClientId}`);

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
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      // Ensure we don't lose user progress by preserving form state
      try {
        showError(errorMessage);
      } catch (displayErr) {
        console.error('Error displaying error message:', displayErr);
        // Fallback error display
        alert(`Error: ${errorMessage}`);
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Update fund filtering to exclude cash funds
  const handleFundSearch = (searchTerm: string): void => {
    setFundSearchTerm(searchTerm);
  };

  // Compute filtered funds dynamically
  const getFilteredFunds = (): Fund[] => {
    let filtered = funds.filter((fund: Fund) => !isCashFund(fund));
    
    if (fundSearchTerm) {
      const term = fundSearchTerm.toLowerCase();
      filtered = filtered.filter((fund: Fund) => 
        fund.fund_name.toLowerCase().includes(term) || 
        (fund.isin_number && fund.isin_number.toLowerCase().includes(term))
      );
    }
    
    // Sort alphabetically by fund name
    return filtered.sort((a: Fund, b: Fund) => a.fund_name.localeCompare(b.fund_name));
  };

  // Add function to render fund selection component with aligned headers
  const renderFundSelectionComponent = (product: ProductItem, isEitherLoading: boolean): JSX.Element => {
    return (
      <div className="space-y-2">
        {/* Side-by-side Layout with Headers, Search, and Lists */}
        <div className="grid grid-cols-2 gap-2 sm:gap-4">
          {/* Selected Funds Section - Left Side */}
          <div className="space-y-1">
            {/* Empty space to push Selected Funds section down */}
            <div className="h-6"></div>
            
            {/* Selected Funds Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <h4 className="text-xs font-medium text-gray-700">Selected Funds</h4>
                <div className="bg-primary-100 text-primary-800 px-2 py-0.5 rounded-full text-xs font-medium" title="Number of selected funds">
                  Funds: {product.portfolio.selectedFunds.length}
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
                  }`} title="Total portfolio weighting percentage">
                    Weight: {calculateTotalFundWeighting(product).toFixed(1)}%
                  </div>
                )}
                {/* Portfolio Risk - Inline */}
                {product.portfolio.selectedFunds.length > 0 && (
                  <div className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs font-medium" title="Portfolio risk level calculated from selected funds">
                    Risk: {(() => {
                      const risk = calculateTargetRiskFromFunds(product);
                      return risk ? risk.toFixed(1) : 'N/A';
                    })()}
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
            <div className="h-80 sm:h-96 lg:h-[450px] overflow-y-auto border rounded bg-white">
              {product.portfolio.selectedFunds.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-gray-500">
                  No funds selected
                </div>
              ) : (
                <div className="p-0.5 sm:p-1 space-y-0.5 sm:space-y-1">
                  {/* Other selected funds (non-cash) */}
                  {product.portfolio.selectedFunds.map((fundId) => {
                    const fund = funds.find(f => f.id === fundId);
                    // Skip Cash fund as it's shown at the bottom for bespoke
                    if (product.portfolio.type === 'bespoke' && fund && isCashFund(fund)) {
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
                  
                  {/* Cash fund for bespoke portfolios - always last */}
                  {product.portfolio.type === 'bespoke' && (() => {
                    const cashFund = findCashFund(funds);
                    if (cashFund && product.portfolio.selectedFunds.includes(cashFund.id)) {
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
                </div>
              )}
            </div>
          </div>

          {/* Available Funds Section - Right Side */}
          <div className="space-y-1">
            {/* Empty space to push Available Funds title down */}
            <div className="h-6"></div>
            
            {/* Available Funds Header */}
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
            <BaseInput
              placeholder="Search funds..."
              value={fundSearchTerm}
              onChange={(e) => handleFundSearch(e.target.value)}
              disabled={isEitherLoading}
              size="sm"
              fullWidth
              leftIcon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              }
            />
            
            {/* Fund validation errors */}
            {validationErrors[product.id]?.funds && (
              <div className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded border border-red-200">
                {validationErrors[product.id].funds}
              </div>
            )}
            {validationErrors[product.id]?.weightings && (
              <div className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded border border-red-200">
                {validationErrors[product.id].weightings}
              </div>
            )}
            {validationErrors[product.id]?.cashWeighting && (
              <div className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded border border-red-200">
                {validationErrors[product.id].cashWeighting}
              </div>
            )}
            
            {/* Available Fund List */}
            <div className={`h-80 sm:h-96 lg:h-[450px] overflow-y-auto border rounded p-2 bg-gray-50 ${
              validationErrors[product.id]?.funds ? 'border-red-500 bg-red-50' : 'border-gray-200'
            }`}>
              {getFilteredFunds().length === 0 ? (
                <div className="text-xs text-gray-500 text-center py-4">
                  No funds found. Try adjusting your search.
                </div>
              ) : (
                <div className="space-y-0.5">
                  {getFilteredFunds().map(fund => (
                    <div 
                      key={fund.id} 
                      className="flex items-center space-x-2 p-2 hover:bg-white rounded text-xs cursor-pointer transition-colors"
                      onClick={(e) => {
                        // Only handle the click if it's not on the checkbox itself
                        if (e.target !== e.currentTarget.querySelector('input[type="checkbox"]')) {
                          handleFundSelection(product.id, fund.id);
                        }
                      }}
                    >
                      <Checkbox
                        checked={product.portfolio.selectedFunds.includes(fund.id)}
                        onChange={() => handleFundSelection(product.id, fund.id)}
                        disabled={isEitherLoading}
                        onClick={(e) => e.stopPropagation()} // Prevent the div click when clicking the checkbox
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
        </div>


      </div>
    );
  };

  const renderPortfolioSection = (product: ProductItem): JSX.Element => {
    const isLoadingTemplate = templateLoading[product.id] === true;
    const isLoadingGeneration = generationLoading[product.id] === true;
    const isEitherLoading = isLoadingTemplate || isLoadingGeneration;
    const templateId = product.portfolio.templateId;
    const generations = templateId ? templateGenerations[templateId.toString()] || [] : [];
    
    return (
      <div className="portfolio-section space-y-0.5 sm:space-y-1">
        {/* Show loading overlay when template or generation is loading */}
        {isEitherLoading && (
          <div className="absolute inset-0 bg-white bg-opacity-70 flex items-center justify-center z-10 rounded">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
          </div>
        )}
        
        {/* Portfolio Configuration Row */}
        <div className="grid grid-cols-2 gap-1 sm:gap-2">
          {/* Portfolio Name - Auto-generated */}
          <div>
            <BaseInput
              label="Portfolio Name"
              value={product.portfolio.name}
              onChange={(e) => {
                // Allow manual override of portfolio name
                handlePortfolioNameChange(product.id, e.target.value);
              }}
              placeholder="Auto-generated"
              size="sm"
              fullWidth
              error={validationErrors[product.id]?.portfolioName}
            />
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
          <div className="grid grid-cols-2 gap-1 sm:gap-2">
            <div>
            <BaseDropdown
              label="Select Template"
              options={availableTemplates.map(t => ({ value: t.id.toString(), label: t.name || `Template ${t.id}` }))}
              value={product.portfolio.templateId?.toString() ?? ''}
              onChange={(value) => handleTemplateSelection(product.id, String(value))}
              placeholder="Select template"
              error={validationErrors[product.id]?.template}
              required
              size="sm"
              fullWidth
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
            <BaseDropdown
              label="Select Generation"
              options={generations.map(g => ({ 
                value: g.id.toString(), 
                label: g.generation_name || `Version ${g.version_number}` 
              }))}
              value={product.portfolio.generationId?.toString() ?? ''}
              onChange={(value) => handleGenerationSelection(product.id, String(value))}
              placeholder="Select generation"
              error={validationErrors[product.id]?.generation}
              required
              size="sm"
              fullWidth
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

        {renderFundSelectionComponent(product, isEitherLoading)}
      </div>
    );
  };

  // Add a function to handle creating a new product owner
  const handleCreateProductOwner = async (newProductOwner: ProductOwner) => {
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
    const displayName = getProductOwnerDisplayName(newProductOwner);
    showToastMessage(`Product owner "${displayName}" created successfully!`);
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

  // Breadcrumb component with smart navigation
  const Breadcrumbs = () => {
    const selectedClient = clients.find(c => c.id === selectedClientId);
    
    return (
      <nav className="mb-4 flex" aria-label="Breadcrumb">
        <ol className="inline-flex items-center space-x-1 md:space-x-3">
          <li className="inline-flex items-center">
            <button 
              onClick={navigateToClientGroups}
              className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 rounded"
            >
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"></path>
              </svg>
              Clients
            </button>
          </li>
          {selectedClient && (
            <li>
              <div className="flex items-center">
                <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"></path>
                </svg>
                <Link to={`/client_groups/${selectedClient.id}`} className="ml-1 text-sm font-medium text-gray-500 hover:text-primary-700 md:ml-2">
                  {selectedClient.name}
                </Link>
              </div>
            </li>
          )}
          <li aria-current="page">
            <div className="flex items-center">
              <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"></path>
              </svg>
              <span className="ml-1 text-sm font-medium text-primary-700 md:ml-2">Create Products</span>
            </div>
          </li>
        </ol>
      </nav>
    );
  };

  return (
    <div className="max-w-6xl mx-auto px-3 py-1">
      {/* Breadcrumbs */}
      <Breadcrumbs />
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
            <ActionButton
              variant="cancel"
              size="icon"
              iconOnly
              onClick={() => setShowToast(false)}
            />
          </div>
        </div>
      )}

      {/* Error popup notification */}
      {showErrorPopup && (
        <div className="fixed top-4 right-4 z-50 bg-red-100 border-l-4 border-red-500 text-red-700 p-3 rounded shadow-md">
          <div className="flex items-center">
            <div className="py-1">
              <svg className="h-5 w-5 text-red-500 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-sm">Error</p>
              <p className="text-xs">{error}</p>
            </div>
            <ActionButton
              variant="cancel"
              size="icon"
              iconOnly
              onClick={() => setShowErrorPopup(false)}
            />
          </div>
        </div>
      )}



      <div className="space-y-1">
        {isLoading ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-700"></div>
          </div>
        ) : (
          <div className="bg-white shadow-sm rounded-lg border border-gray-200">
            <form onSubmit={handleSubmit} className="p-4">
              {/* Client Selection - Inline */}
              <div className="mb-4">
                  {clients.length > 0 ? (
                    <AutocompleteSearch
                      label="Client Name"
                      placeholder="Type to search clients..."
                      options={clientOptions}
                      onSelect={handleClientSelect}
                      value={selectedClientId ? clients.find(c => c.id === selectedClientId)?.name || '' : ''}
                      minSearchLength={0}
                      maxResults={10}
                      allowCustomValue={false}
                      required
                      size="md"
                      fullWidth={true}
                      helperText={`${clients.length} clients available`}
                    />
                  ) : (
                      <div className="text-gray-500 text-sm bg-gray-100 p-2 rounded">
                        No clients available. Please add a client first.
                      </div>
                  )}
              </div>

              {/* Step 2: Products Section - Only show after client selected */}
              {selectedClientId && (
                <div className="space-y-1">
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
                                start_date: dayjs().startOf('month'), // Reset to first day of current month for new product
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
                  <AddButton
                    context="Product"
                    design="balanced"
                    size="md"
                    onClick={handleAddProduct}
                  />
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
                    <div className="space-y-1">
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
                            <div className="p-0.5 sm:p-1">
                                                                                              <div className="flex items-center justify-between mb-0.5 sm:mb-1">
                                                                  <div className="flex items-center space-x-2 sm:space-x-3">
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
                                  ) : isProductComplete(product) ? (
                                    <div className="w-2 h-2 bg-green-500 rounded-full" title="Complete" />
                                  ) : (
                                    <div className="w-2 h-2 bg-yellow-500 rounded-full" title="Incomplete" />
                                  )}
                            <DeleteButton
                              context="Product"
                              design="balanced"
                              size="sm"
                              onClick={() => handleRemoveProduct(product.id)}
                            />
                          </div>
                        </div>

                              {/* Compact configuration form - always visible for incomplete products */}
                              {isExpanded && (
                                <div className="space-y-2 pt-0.5 sm:pt-1 border-t border-gray-100">
                                                                      {/* Row 1: Provider, Product Type, Product Name */}
                                    <div className="grid grid-cols-3 gap-1 sm:gap-2">
                                    <div>
                            <BaseDropdown
                              label="Provider"
                              options={providers.map(p => ({ value: p.id.toString(), label: p.name }))}
                              value={product.provider_id ? product.provider_id.toString() : ''}
                              onChange={(value) => handleProductChange(product.id, 'provider_id', Number(value))}
                              placeholder="Select provider"
                              error={validationErrors[product.id]?.provider}
                              required
                              size="sm"
                              fullWidth
                            />
                          </div>

                                    <div>
                            <BaseDropdown
                              label="Product Type"
                              options={[
                                { value: 'ISA', label: 'ISA' },
                                { value: 'GIA', label: 'GIA' },
                                { value: 'Offshore Bond', label: 'Offshore Bond' },
                                { value: 'Onshore Bond', label: 'Onshore Bond' },
                                { value: 'Pension', label: 'Pension' },
                                { value: 'Other', label: 'Other' },
                              ]}
                              value={product.product_type}
                              onChange={(value) => handleProductTypeChange(product.id, String(value))}
                              placeholder="Select type"
                              error={validationErrors[product.id]?.productType}
                              required
                              size="sm"
                              fullWidth
                            />
                          </div>

                                    <div>
                                      <BaseInput
                                        label="Product Name"
                                        helperText="(optional)"
                                        value={product.product_name}

                                        onChange={(e) => handleProductChange(product.id, 'product_name', e.target.value)}
                                        className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full text-sm border-gray-300 rounded-md h-8"
                                        placeholder="e.g. Smoothed Savings Pension Fund"
                                      />
                          </div>
                        </div>

                                  {/* Row 2: Start Date and Plan Number */}
                                  <div className="grid grid-cols-2 gap-1 sm:gap-2">
                                    <div>
                                      <DateInput
                                        label="Start Date"
                                        placeholder="dd/mm/yyyy"
                                        value={product.start_date ? product.start_date.toDate() : undefined}
                                        onChange={(date) => {
                                          if (date) {
                                            // Convert to first day of the month and create dayjs object
                                            const firstOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
                                            const dayjsDate = dayjs(firstOfMonth);
                                            handleProductChange(product.id, 'start_date', dayjsDate);
                                          } else {
                                            handleProductChange(product.id, 'start_date', dayjs().startOf('month'));
                                          }
                                        }}
                                        size="sm"
                                        required
                                        error={validationErrors[product.id]?.start_date}
                                        helperText="Product start date (will be set to 1st of the selected month)"
                                      />
                                    </div>

                                    <div>
                                      <BaseInput
                                        label="Plan Number"
                                        placeholder="Enter plan number (e.g., PLAN001, P-123)"
                                        value={typeof product.plan_number === 'string' ? product.plan_number : ''}
                                        onChange={(e) => {
                                          // Get the string value from the event
                                          handleProductChange(product.id, 'plan_number', e.target.value);
                                        }}
                                        size="sm"
                                        autoComplete="off"
                                        leftIcon={
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                                          </svg>
                                        }
                                      />
                                    </div>
                                  </div>

                                  {/* Row 3: Revenue Configuration */}
                                  <div className="bg-gray-50 p-3 rounded-md border border-gray-200">
                                    <h5 className="text-xs font-medium text-gray-700 mb-2 flex items-center">
                                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                      </svg>
                                      Revenue Configuration (Optional)
                                    </h5>
                                    <div className="grid grid-cols-2 gap-2">
                                      <div>
                                        <NumberInput
                                          label="Fixed Cost (£)"
                                          placeholder="e.g. 500"
                                          value={product.fixed_cost}
                                          onChange={(e) => {
                                            const value = e.target.value;
                                            const numericValue = value === '' ? undefined : parseFloat(value);
                                            handleProductChange(product.id, 'fixed_cost', numericValue);
                                          }}
                                          size="sm"
                                          fullWidth
                                          min={0}
                                          leftIcon={
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                                            </svg>
                                          }
                                          helperText="Annual fixed fee"
                                        />
                                      </div>
                                      <div>
                                        <NumberInput
                                          label="Percentage Fee (%)"
                                          placeholder="e.g. 1.5"
                                          value={product.percentage_fee}
                                          onChange={(e) => {
                                            const value = e.target.value;
                                            const numericValue = value === '' ? undefined : parseFloat(value);
                                            handleProductChange(product.id, 'percentage_fee', numericValue);
                                          }}
                                          size="sm"
                                          fullWidth
                                          min={0}
                                          max={100}
                                          step={0.1}
                                          leftIcon={
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                            </svg>
                                          }
                                          helperText="% of portfolio value"
                                        />
                                      </div>
                                    </div>
                                  </div>

                                  {/* Row 4: Product Owners */}
                                  <div>
                                    <div className="flex items-end space-x-2">
                                      <div className="flex-grow">
                                        <MultiSelectDropdown
                                          label="Product Owners"
                                                                    options={productOwners.map(owner => ({ 
                            value: owner.id.toString(), 
                            label: getProductOwnerDisplayName(owner)
                          }))}
                                          values={product.product_owner_ids.map(id => id.toString())}
                                          onChange={(values) => {
                                            const numericValues = values.map(v => parseInt(String(v)));
                                            handleProductChange(product.id, 'product_owner_ids', numericValues);
                                            // Clear validation error when user selects product owners
                                            if (numericValues.length > 0 && validationErrors[product.id]?.productOwners) {
                                              const newErrors = { ...validationErrors };
                                              if (newErrors[product.id]) {
                                                delete newErrors[product.id].productOwners;
                                                if (Object.keys(newErrors[product.id]).length === 0) {
                                                  delete newErrors[product.id];
                                                }
                                              }
                                              setValidationErrors(newErrors);
                                            }
                                          }}
                                          placeholder="Search and select product owners (required)"
                                          error={validationErrors[product.id]?.productOwners}
                                          required
                                          size="sm"
                                          fullWidth
                                        />
                                      </div>
                                      <AddButton
                                        context="Product Owner"
                                        size="sm"
                                        iconOnly
                                        onClick={() => openCreateProductOwnerModal(product.id)}
                                        title="Create new product owner"
                                      />
                                    </div>
                                  </div>

                                  {/* Portfolio Configuration */}
                                  <div className="border-t border-gray-200">
                                    <h4 className="text-sm font-medium text-gray-900 mb-2 mt-2">Portfolio Configuration</h4>
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
                <div className="mt-1 sm:mt-2 flex justify-end space-x-1 sm:space-x-2">
                  <ActionButton
                    variant="cancel"
                    size="md"
                    onClick={() => navigate(returnPath)}
                  >
                    Cancel
                  </ActionButton>
                  <ActionButton
                    variant="save"
                    size="md"
                    type="submit"
                    disabled={isSaving || !isFormValid}
                    loading={isSaving}
                    title={!isFormValid ? 'Please complete all required fields for all products' : ''}
                  >
                    {!isSaving && `Create ${products.length} Product${products.length !== 1 ? 's' : ''} for ${clients.find(c => c.id === selectedClientId)?.name || 'Client'}`}
                  </ActionButton>
                {!isFormValid && products.length > 0 && (
                  <div className="text-xs text-red-600 mt-2 max-h-24 overflow-y-auto">
                    <div className="font-medium mb-1">Missing required fields:</div>
                    {getMissingFields.length > 0 ? (
                      <ul className="space-y-1">
                        {getMissingFields.map((field, index) => (
                          <li key={index} className="text-xs">• {field}</li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-xs">Please ensure all products have: Provider, Product Type, at least one Product Owner, and Portfolio configuration</div>
                    )}
                  </div>
                )}
              </div>
              )}
            </form>
          </div>
        )}
      </div>

      {/* Create Product Owner Modal */}
      {showCreateProductOwnerModal && (
        <CreateProductOwnerModal
          isOpen={showCreateProductOwnerModal}
          onClose={() => {
            setShowCreateProductOwnerModal(false);
          }}
          onSuccess={handleCreateProductOwner}
          includeProductSelection={false}
          title="Create New Product Owner"
        />
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