import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getProviderColor } from '../services/providerColors';

// Enhanced TypeScript interfaces
interface Client {
  id: string;
  forname: string | null;
  surname: string | null;
  relationship: string;
  status: string;
  advisor: string | null;
  created_at: string;
  updated_at: string;
  age?: number;
  gender?: string;
}

interface ClientFormData {
  forname: string | null;
  surname: string | null;
  relationship: string;
  status: string;
  advisor: string | null;
}

interface ClientAccount {
  id: number;
  client_id: number;
  product_name: string;
  status: string;
  start_date: string;
  end_date?: string;
  weighting?: number;
  plan_number?: string;
  provider_id?: number;
  provider_name?: string;
  product_type?: string;
  portfolio_id?: number;
  total_value?: number;
  previous_value?: number;
  irr?: number;
  risk_rating?: number;
  provider_theme_color?: string;
  original_template_id?: number;
  original_template_name?: string;
  template_info?: {
    id: number;
    name: string;
    created_at: string;
  };
}

// Extracted component for client header
const ClientHeader = ({ 
  client, 
  totalValue, 
  totalIRR, 
  onEditClick
}: { 
  client: Client; 
  totalValue: number;
  totalIRR: number;
  onEditClick: () => void;
}) => {
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatPercentage = (value: number): string => {
    return `${(value).toFixed(2)}%`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="mb-6 bg-white shadow-sm rounded-lg border border-gray-100 relative transition-all duration-300 hover:shadow-md">
      <Link to="/clients" className="absolute left-4 top-4 text-primary-700 hover:text-primary-800 transition-colors duration-200">
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
      </Link>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between p-6">
        <div>
          <div className="flex items-center">
            <div className="pl-9">
              <h1 className="text-4xl font-normal text-gray-900 font-sans tracking-wide">
                {client.forname} {client.surname}
              </h1>
              <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1">
                <div className="text-base text-gray-600 font-sans tracking-wide">
                  Status: <span className={`px-2 py-0.5 text-xs leading-5 font-semibold rounded-full ${
                    client.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>{client.status}</span>
                </div>
                <div className="text-base text-gray-600 font-sans tracking-wide">
                  Relationship: {client.relationship}
                </div>
                <div className="text-base text-gray-600 font-sans tracking-wide">
                  Advisor: {client.advisor || 'Not assigned'}
                </div>
                <div className="text-base text-gray-600 font-sans tracking-wide">
                  Member since: {formatDate(client.created_at)}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 mt-4 md:mt-0 w-64">
          {/* Total Funds */}
          <div className="py-3 pb-0">
            <div className="text-sm font-medium text-gray-500">Total Funds Under Management</div>
            <div className="mt-1 flex justify-end">
              <span className="text-5xl font-semibold text-gray-900 font-sans tracking-tight">
                {formatCurrency(totalValue)}
              </span>
            </div>
          </div>

          {/* Total IRR with enhanced visualization */}
          <div className="py-1">
            <div className="text-sm font-medium text-gray-500">Total IRR Number</div>
            <div className="flex justify-end items-center">
              <span className={`text-2xl font-semibold ${totalIRR >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {formatPercentage(totalIRR)}
                <span className="ml-1">
                  {totalIRR >= 0 ? '▲' : '▼'}
                </span>
              </span>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex space-x-2 mt-2">
            <button
              onClick={onEditClick}
              className="bg-primary-700 text-white px-4 py-1.5 rounded-xl font-medium hover:bg-primary-800 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-700 focus:ring-offset-2 shadow-sm flex-1 text-center"
            >
              Edit Details
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Formatting functions
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatPercentage = (value: number): string => {
    return `${(value).toFixed(2)}%`;
  };

// Product Card Component
const ProductCard: React.FC<{ account: ClientAccount }> = ({ account }) => {
  // Use the provider color service instead of direct fallback
  const themeColor = getProviderColor(
    account.provider_id, 
    account.provider_name, 
    account.provider_theme_color
  );
  
  // Log to debug theme color and template info
  console.log(`Product card for ${account.product_name}:`, {
    provider: account.provider_name, 
    provider_id: account.provider_id,
    provider_theme_color: account.provider_theme_color,
    using_color: themeColor,
    original_template_id: account.original_template_id,
    original_template_name: account.original_template_name,
    template_info: account.template_info
  });
  
  // Memoize style objects for performance
  const styles = useMemo(() => ({
    themeVars: {
      '--theme-color': themeColor,
      '--theme-color-light': `${themeColor}15`,
    } as React.CSSProperties,
    cardStyle: {
      border: `3px solid ${themeColor}`,
      borderLeft: `10px solid ${themeColor}`,
      borderRadius: '0.5rem',
      overflow: 'hidden'
    },
    headerStyle: {
      borderBottom: `2px solid ${themeColor}15`,
      paddingBottom: '0.5rem'
    },
    providerDot: {
      backgroundColor: themeColor,
      width: '12px',
      height: '12px',
      borderRadius: '50%',
      display: 'inline-block',
      marginRight: '8px',
      verticalAlign: 'middle'
    }
  }), [themeColor]);

  return (
    <Link 
      to={`/accounts/${account.id}`} 
      className="block bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden"
      style={styles.cardStyle}
    >
      {/* Main Content */}
      <div className="p-4">
        <div className="flex items-center justify-between" style={styles.headerStyle}>
          {/* Left side - Product Info */}
          <div>
            <div className="flex items-center">
              <h3 className="text-lg font-medium text-gray-900">{account.product_name}</h3>
              <span 
                className="ml-3 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                style={{ 
                  backgroundColor: `${themeColor}15`,
                  color: themeColor
                }}
              >
                {account.original_template_id 
                  ? (account.template_info?.name || account.original_template_name || `Template #${account.original_template_id}`)
                  : 'Bespoke'}
              </span>
            </div>
            <div className="flex items-center mt-1">
              <span style={styles.providerDot}></span>
              <p className="text-base text-gray-600 font-medium">{account.provider_name || 'Unknown Provider'}</p>
            </div>
            {account.plan_number && (
              <p className="text-sm text-gray-500 mt-0.5">Plan: {account.plan_number}</p>
            )}
          </div>

          {/* Right side - Key Metrics */}
          <div className="text-right">
            <div className="text-xl font-light text-gray-900">
              {formatCurrency(account.total_value || 0)}
            </div>
            {account.irr !== undefined && (
              <div className="flex items-center justify-end mt-1">
                <span className={`text-sm font-medium ${
                  account.irr >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatPercentage(account.irr)}
                  <span className="ml-1">
                    {account.irr >= 0 ? '▲' : '▼'}
                  </span>
                </span>
                <div 
                  className="ml-2 h-2 w-2 rounded-full"
                  style={{ backgroundColor: themeColor }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Bottom row - Additional Info */}
        <div className="mt-3 flex justify-between items-center">
          <div className="flex items-center">
            {account.risk_rating && (
              <div className="flex items-center">
                <span className="text-sm font-medium text-gray-900 mr-2">
                  Risk: {account.risk_rating}
                </span>
                <div className="h-2 w-16 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full"
                    style={{ 
                      width: `${(account.risk_rating) * 10}%`,
                      backgroundColor: themeColor
                    }}
                  />
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center">
            <span 
              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
              style={{ 
                backgroundColor: `${themeColor}15`,
                color: themeColor
              }}
            >
              {account.status}
            </span>
            <span className="ml-3 text-xs text-gray-500">
              Started: {new Date(account.start_date).toLocaleDateString('en-GB', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              })}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
};

// Main component
const ClientDetails: React.FC = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { api } = useAuth();
  const [client, setClient] = useState<Client | null>(null);
  const [clientAccounts, setClientAccounts] = useState<ClientAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCorrecting, setIsCorrecting] = useState(false);
  const [versions, setVersions] = useState<any[]>([]);
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [formData, setFormData] = useState<ClientFormData>({
    forname: null,
    surname: null,
    relationship: '',
    status: 'active',
    advisor: null
  });

  // Calculate totals with memoization for performance
  const { totalFundsUnderManagement, totalIRR } = useMemo(() => {
    const totalFunds = clientAccounts.reduce((sum, account) => 
      sum + (account.total_value || 0), 0);
      
    // Calculate weighted IRR
    let totalWeightedIRR = 0;
    let totalWeight = 0;
    
    clientAccounts.forEach(account => {
      if (account.irr !== undefined && account.total_value) {
        totalWeightedIRR += account.irr * account.total_value;
        totalWeight += account.total_value;
      }
    });
    
    const avgIRR = totalWeight > 0 ? totalWeightedIRR / totalWeight : 0;
    
    return {
      totalFundsUnderManagement: totalFunds,
      totalIRR: avgIRR
    };
  }, [clientAccounts]);

  // Add a direct check for provider theme colors
  useEffect(() => {
    // Direct check of provider colors via API
    const checkProviderColors = async () => {
      try {
        console.log("Performing direct provider theme color check...");
        const providersResponse = await api.get('/available_providers');
        console.log("All providers with theme colors:", providersResponse.data);
        
        if (clientAccounts.length > 0) {
          // Check for any providers with null theme colors
          const providersWithNullColors = providersResponse.data.filter(
            (p: any) => p.theme_color === null
          );
          console.log("Providers with null theme colors:", providersWithNullColors);
          
          // Check if provider IDs in client accounts match the stored data
          clientAccounts.forEach(account => {
            const matchingProvider = providersResponse.data.find(
              (p: any) => p.id === account.provider_id
            );
            console.log(`Provider check for ${account.product_name}:`, {
              provider_id: account.provider_id,
              matched_provider: matchingProvider,
              theme_color_in_provider: matchingProvider?.theme_color,
              theme_color_in_account: account.provider_theme_color,
              is_theme_color_missing: account.provider_theme_color !== matchingProvider?.theme_color
            });
          });
        }
      } catch (err) {
        console.error("Error checking provider colors:", err);
      }
    };
    
    if (clientAccounts.length > 0) {
      checkProviderColors();
    }
  }, [clientAccounts, api]);

  // Data fetching with error retry
  useEffect(() => {
    if (clientId) {
    fetchClientData();
    }
  }, [clientId]);

  const fetchClientData = async (retryCount = 0) => {
    try {
      setIsLoading(true);
      console.log(`Fetching client data for ID: ${clientId}`);
      
      // Fetch client details
      const clientResponse = await api.get(`/clients/${clientId}`);
      console.log("Client data received:", clientResponse.data);
      setClient(clientResponse.data);
      
      // Fetch client products (was client_accounts previously)
      const accountsResponse = await api.get('/client_products', {
        params: { client_id: clientId }
      });
      
      // Log the raw response to check if theme colors are included
      console.log("Raw client products API response:", accountsResponse.data);
      
      const accounts = accountsResponse.data || [];
      
      // Enhanced data fetching for accounts - get IRR for each account
      const accountsWithIRR = await Promise.all(
        accounts.map(async (account: ClientAccount) => {
          try {
            // Log provider data for debugging
            console.log(`Provider data from API for product ${account.id}:`, {
              provider_id: account.provider_id,
              provider_name: account.provider_name,
              provider_theme_color: account.provider_theme_color // Check if this value exists
            });
            
            // Update analytics endpoint to use portfolio_id instead
            const portfolioId = account.portfolio_id;
            if (!portfolioId) {
              console.warn(`No portfolio_id found for product ${account.id}`);
              return account;
            }
            
            const irrResponse = await api.get(`/analytics/portfolio/${portfolioId}/irr`);
            return {
              ...account,
              irr: irrResponse.data?.irr !== undefined ? irrResponse.data.irr : undefined
            };
          } catch (err) {
            console.warn(`Failed to fetch IRR for product ${account.id}`, err);
            return account;
          }
        })
      );
      
      console.log("Final client products with IRR:", accountsWithIRR);
      setClientAccounts(accountsWithIRR);
      setError(null);
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Failed to fetch client data';
      setError(errorMessage);
      console.error('Error fetching client data:', err);
      
      // Implement retry logic for transient errors
      if (retryCount < 2) {
        console.log(`Retrying data fetch (attempt ${retryCount + 1})...`);
        setTimeout(() => fetchClientData(retryCount + 1), 1000 * (retryCount + 1));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/clients');
  };

  const handleMakeDormant = async () => {
    try {
      await api.patch(`/clients/${clientId}/status`, { status: 'dormant' });
      // Refresh client data
      fetchClientData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update client status');
      console.error('Error updating client status:', err);
    }
  };

  const handleMakeActive = async () => {
    try {
      await api.patch(`/clients/${clientId}/status`, { status: 'active' });
      // Refresh client data
      fetchClientData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update client status');
      console.error('Error updating client status:', err);
    }
  };

  const startCorrection = () => {
    if (!client) return;
    
    // Initialize form data with current client values
    setFormData({
      forname: client.forname,
      surname: client.surname,
      relationship: client.relationship,
      status: client.status,
      advisor: client.advisor
    });
    
    // Enter correction mode
    setIsCorrecting(true);
  };

  const handleCorrect = async () => {
    if (!client) return;

    try {
      // Only send fields that have actually changed
      const changedFields: Partial<ClientFormData> = {};
      
      if (formData.forname !== client.forname) changedFields.forname = formData.forname;
      if (formData.surname !== client.surname) changedFields.surname = formData.surname;
      if (formData.relationship !== client.relationship) changedFields.relationship = formData.relationship;
      if (formData.status !== client.status) changedFields.status = formData.status;
      
      // Special handling for advisor which could be null
      if (
        (formData.advisor === '' && client.advisor !== null) || 
        (formData.advisor !== client.advisor && formData.advisor !== '')
      ) {
        changedFields.advisor = formData.advisor === '' ? null : formData.advisor;
      }
      
      // Only perform API call if there are changes
      if (Object.keys(changedFields).length > 0) {
        await api.patch(`/clients/${clientId}`, changedFields);
        await fetchClientData();
      }
      
      setIsCorrecting(false);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to correct client');
      console.error('Error correcting client:', err);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleVersionHistory = async () => {
    try {
      const response = await api.post(`/client-versions?client_id=${clientId}`);
      setVersions(response.data);
      setShowVersionModal(true);
    } catch (err: any) {
      console.error('Error fetching version history:', err);
    }
  };

  // Breadcrumb component
  const Breadcrumbs = () => {
    return (
      <div className="flex items-center space-x-2 text-xs text-gray-500 mb-4">
        <Link to="/clients" className="hover:text-gray-700">
          Clients
        </Link>
        <span>/</span>
        <span className="text-gray-900">{client ? `${client.forname} ${client?.surname}` : 'Client Details'}</span>
      </div>
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-center items-center py-16">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !client) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mt-8">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-red-700 text-base">
                {error || 'Failed to load client details. Please try again later.'}
              </p>
          <button
            onClick={handleBack}
                className="mt-2 text-red-700 underline"
          >
                Return to Clients
          </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumbs */}
        <Breadcrumbs />

        {/* Client Header */}
        <ClientHeader 
          client={client}
          totalValue={totalFundsUnderManagement}
          totalIRR={totalIRR}
          onEditClick={startCorrection}
        />

        {/* Client Edit Form (when in correction mode) */}
        {isCorrecting && (
          <div className="bg-white shadow-sm rounded-lg border border-gray-100 mb-4">
            <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-base font-medium text-gray-900">Edit Client Details</h2>
              <div className="flex space-x-2">
                <button
                  onClick={() => setIsCorrecting(false)}
                  className="px-2.5 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCorrect}
                  className="px-2.5 py-1 text-sm font-medium text-white bg-primary-700 rounded-lg shadow-sm hover:bg-primary-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-700 transition-all duration-200"
                >
                  Save Changes
                </button>
              </div>
            </div>
            
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-0.5">First Name</label>
                  <input
                    type="text"
                    name="forname"
                    value={formData.forname || ''}
                    onChange={handleChange}
                    className="block w-full h-10 px-3 py-2 text-base rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 transition-all duration-200"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-0.5">Last Name</label>
                  <input
                    type="text"
                    name="surname"
                    value={formData.surname || ''}
                    onChange={handleChange}
                    className="block w-full h-10 px-3 py-2 text-base rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 transition-all duration-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-0.5">Relationship</label>
                  <select
                    name="relationship"
                    value={formData.relationship}
                    onChange={handleChange}
                    className="block w-full h-10 px-3 py-2 text-base rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 transition-all duration-200"
                  >
                    <option value="Relationship">Relationship</option>
                    <option value="Single">Single</option>
                    <option value="Trust">Trust</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-0.5">Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="block w-full h-10 px-3 py-2 text-base rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 transition-all duration-200"
                  >
                    <option value="active">Active</option>
                    <option value="dormant">Dormant</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-0.5">Advisor</label>
                  <input
                    type="text"
                    name="advisor"
                    value={formData.advisor || ''}
                    onChange={handleChange}
                    className="block w-full h-10 px-3 py-2 text-base rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 transition-all duration-200"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Products Section */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-normal text-gray-900 font-sans tracking-wide">Client Products</h2>
            
            <Link
              to={`/create-client-products?client_id=${clientId}&client_name=${encodeURIComponent(`${client?.forname} ${client?.surname}`)}`}
              className="inline-flex items-center px-4 py-1.5 text-sm font-medium text-white bg-primary-700 rounded-xl shadow-sm hover:bg-primary-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-700 transition-all duration-200"
            >
              <svg className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add New Product
            </Link>
          </div>
          
          {clientAccounts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {clientAccounts.map(account => (
                <ProductCard key={account.id} account={account} />
              ))}
            </div>
          ) : (
            <div className="bg-gray-50 p-6 rounded-lg text-center border border-gray-200">
              <div className="text-gray-500 mb-4">No products found for this client.</div>
              <div className="flex justify-center">
                <Link 
                  to={`/create-client-products?client_id=${clientId}&client_name=${encodeURIComponent(`${client?.forname} ${client?.surname}`)}`}
                  className="inline-flex items-center px-4 py-1.5 text-sm font-medium text-white bg-primary-700 rounded-xl shadow-sm hover:bg-primary-800 transition-colors duration-200"
                >
                  <svg className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add First Product
                </Link>
              </div>
            </div>
          )}
        </div>
        
        {/* Additional Action Buttons */}
        <div className="mb-6 flex space-x-4">
          {client.status === 'active' ? (
            <button
              onClick={handleMakeDormant}
              className="px-4 py-1.5 text-sm font-medium text-white bg-orange-600 rounded-xl shadow-sm hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
            >
              Set Dormant
            </button>
          ) : (
            <button
              onClick={handleMakeActive}
              className="px-4 py-1.5 text-sm font-medium text-white bg-green-600 rounded-xl shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              Set Active
            </button>
          )}
          <button
            onClick={handleVersionHistory}
            className="px-4 py-1.5 text-sm font-medium text-white bg-yellow-600 rounded-xl shadow-sm hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
          >
            Version History
          </button>
        </div>
      </div>
    </>
  );
};

export default ClientDetails;
