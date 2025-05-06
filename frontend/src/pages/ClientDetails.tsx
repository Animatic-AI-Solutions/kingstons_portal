import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Enhanced TypeScript interfaces
interface Client {
  id: string;
  name: string;
  relationship: string;
  status: string;
  advisor: string | null;
  created_at: string;
  updated_at: string;
  age?: number;
  gender?: string;
}

interface ClientFormData {
  name: string;
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
}

// Extracted component for client header
const ClientHeader = ({ 
  client, 
  totalValue, 
  totalIRR, 
  onEditClick, 
  onDeleteClick 
}: { 
  client: Client; 
  totalValue: number;
  totalIRR: number;
  onEditClick: () => void;
  onDeleteClick: () => void;
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
      <Link to="/clients" className="absolute left-4 top-4 text-indigo-600 hover:text-indigo-900 transition-colors duration-200">
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
      </Link>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between p-6">
        <div>
          <div className="flex items-center">
            <div className="pl-9">
              <h1 className="text-4xl font-normal text-gray-900 font-sans tracking-wide">
                {client.name}
              </h1>
              <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1">
                <div className="text-base text-gray-600 font-sans tracking-wide">
                  Age: {client.age || '?'}
                </div>
                <div className="text-base text-gray-600 font-sans tracking-wide">
                  Gender: {client.gender || '?'}
                </div>
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
              className="bg-indigo-700 text-white px-4 py-1.5 rounded-xl font-medium hover:bg-indigo-800 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-700 focus:ring-offset-2 shadow-sm flex-1 text-center"
            >
              Edit Details
            </button>
            <button
              onClick={onDeleteClick}
              className="bg-red-600 text-white px-4 py-1.5 rounded-xl font-medium hover:bg-red-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 shadow-sm flex-1 text-center"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Extracted component for product cards
const ProductCard = ({ account }: { account: ClientAccount }) => {
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

  // Provider-specific styling with more prominent approach
  const providerStyles: {[key: string]: { border: string, accent: string, light: string }} = {
    'AJ Bell': { border: 'border-red-500', accent: 'bg-red-500', light: 'bg-red-50' },
    'Prudential': { border: 'border-red-400', accent: 'bg-red-400', light: 'bg-red-50' },
    'Fidelity': { border: 'border-blue-500', accent: 'bg-blue-500', light: 'bg-blue-50' },
    'Wealthtime': { border: 'border-gray-500', accent: 'bg-gray-500', light: 'bg-gray-50' },
    'Aviva': { border: 'border-yellow-500', accent: 'bg-yellow-500', light: 'bg-yellow-50' },
    'Scottish Widows': { border: 'border-indigo-500', accent: 'bg-indigo-500', light: 'bg-indigo-50' },
    'Royal London': { border: 'border-purple-500', accent: 'bg-purple-500', light: 'bg-purple-50' },
    'Standard Life': { border: 'border-green-500', accent: 'bg-green-500', light: 'bg-green-50' },
    'Aegon': { border: 'border-orange-500', accent: 'bg-orange-500', light: 'bg-orange-50' },
    'Default': { border: 'border-gray-300', accent: 'bg-gray-300', light: 'bg-gray-50' }
  };

  const getProviderStyle = (providerName: string | undefined) => {
    // Add debugging to see what's coming from the API
    console.log(`Provider name received: "${providerName}"`);
    
    if (!providerName) {
      console.log('No provider name provided, using default style');
      return providerStyles['Default'];
    }
    
    // Check for direct match first
    if (providerStyles[providerName]) {
      console.log(`Direct match found for: ${providerName}`);
      return providerStyles[providerName];
    }
    
    // Try case-insensitive matching
    const lowerCaseProviderName = providerName.toLowerCase();
    
    // Find a case-insensitive match in the keys
    for (const key of Object.keys(providerStyles)) {
      if (key.toLowerCase() === lowerCaseProviderName) {
        console.log(`Case-insensitive match found for "${providerName}" → "${key}"`);
        return providerStyles[key];
      }
    }
    
    // Look for partial matches (e.g., if API returns "AJ Bell Investments" but we only have "AJ Bell")
    for (const key of Object.keys(providerStyles)) {
      if (key !== 'Default' && 
          (lowerCaseProviderName.includes(key.toLowerCase()) || 
           key.toLowerCase().includes(lowerCaseProviderName))) {
        console.log(`Partial match found for "${providerName}" → "${key}"`);
        return providerStyles[key];
      }
    }
    
    console.log(`No match found for "${providerName}", using default style`);
    return providerStyles['Default'];
  };

  const style = getProviderStyle(account.provider_name);

  // Calculate value change for period indicator
  const hasValueIncreased = account.total_value && account.previous_value 
    ? account.total_value > account.previous_value
    : account.irr ? account.irr >= 0 : true;

  return (
    <Link 
      to={`/accounts/${account.id}`} 
      className={`group bg-white p-6 rounded-lg border-4 ${style.border} shadow-sm hover:shadow-lg transition-all duration-300 relative overflow-hidden`}
    >
      {/* Provider accent color bar */}
      <div className={`absolute top-0 left-0 w-full h-2 ${style.accent}`} />
      
      {/* Left side accent bar */}
      <div className={`absolute top-0 left-0 h-full w-1 ${style.accent}`} />
      
      <div className="relative">
        {account.provider_name && (
          <div className={`absolute -top-4 -right-4 px-2 py-1 text-xs font-semibold rounded-md bg-white ${style.border} shadow-sm`}>
            {account.provider_name}
          </div>
        )}
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <h3 className="text-2xl font-semibold font-sans tracking-wide group-hover:text-indigo-700 transition-colors duration-200">
              {account.product_name}
            </h3>
            <p className="text-gray-600">{account.product_type || 'Unknown Product'}</p>
            {account.risk_rating && (
              <div className="flex items-center mt-1">
                <span className="text-xs text-gray-500 mr-1">Risk:</span>
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <div 
                      key={rating} 
                      className={`w-2 h-2 rounded-full mx-0.5 ${
                        rating <= account.risk_rating! ? 'bg-indigo-600' : 'bg-gray-200'
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="text-right">
            <p className="text-4xl font-semibold text-gray-900">
              {formatCurrency(account.total_value || 0)}
            </p>
            <p className={`text-lg font-medium ${hasValueIncreased ? 'text-green-700' : 'text-red-700'} flex items-center justify-end`}>
              {account.irr !== undefined ? (
                <>
                  {formatPercentage(account.irr)}
                  <span className="ml-1">{hasValueIncreased ? '▲' : '▼'}</span>
                </>
              ) : 'N/A'}
            </p>
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
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [versions, setVersions] = useState<any[]>([]);
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [formData, setFormData] = useState<ClientFormData>({
    name: '',
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
      
      const accounts = accountsResponse.data || [];
      
      // Enhanced data fetching for accounts - get IRR for each account
      const accountsWithIRR = await Promise.all(
        accounts.map(async (account: ClientAccount) => {
          try {
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

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await api.delete(`/clients/${clientId}`);
      navigate('/clients', { 
        state: { notification: { type: 'success', message: 'Client deleted successfully' } }
      });
    } catch (err: any) {
      setDeleteError(err.response?.data?.detail || 'Failed to delete client');
      console.error('Error deleting client:', err);
      setIsDeleting(false);
    }
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

  const handleVersionHistory = async () => {
    try {
      const response = await api.post(`/client-versions?client_id=${clientId}`);
      setVersions(response.data);
      setShowVersionModal(true);
    } catch (err: any) {
      console.error('Error fetching version history:', err);
    }
  };

  const startCorrection = () => {
    if (!client) return;
    
    // Initialize form data with current client values
    setFormData({
      name: client.name,
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
      
      if (formData.name !== client.name) changedFields.name = formData.name;
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

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Delete Confirmation Modal component
  const DeleteConfirmationModal = () => {
    if (!isDeleteModalOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
          <div className="flex items-start">
            <div className="flex-shrink-0 text-red-600">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-medium text-gray-900">Delete Client</h3>
              <div className="mt-2">
                <p className="text-sm text-gray-500">
                  Are you sure you want to delete this client? This action cannot be undone and will delete all accounts and portfolios associated with this client.
                </p>
                {deleteError && (
                  <p className="mt-2 text-sm text-red-600">
                    Error: {deleteError}
                  </p>
                )}
              </div>
            </div>
          </div>
          <div className="mt-6 flex space-x-3 justify-end">
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => setIsDeleteModalOpen(false)}
              className="inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={handleDelete}
              className={`inline-flex justify-center px-4 py-2 text-sm font-medium text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 ${
                isDeleting ? 'bg-red-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {isDeleting ? 'Deleting...' : 'Delete Client'}
            </button>
          </div>
        </div>
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
      <DeleteConfirmationModal />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Client Header */}
        <ClientHeader 
          client={client}
          totalValue={totalFundsUnderManagement}
          totalIRR={totalIRR}
          onEditClick={startCorrection}
          onDeleteClick={() => setIsDeleteModalOpen(true)}
        />

        {/* Products Section */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-normal text-gray-900 font-sans tracking-wide">Client Products</h2>
            
            <Link
              to={`/accounts/new?client=${clientId}`}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-700 rounded-md shadow-sm hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-700 transition-all duration-200"
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
                  to={`/accounts/new?client=${clientId}`}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-700 rounded-md shadow-sm hover:bg-indigo-800 transition-colors duration-200"
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
        
        {/* Client Edit Form (when in correction mode) */}
        {isCorrecting && (
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-xl font-normal text-gray-900 font-sans tracking-wide mb-4">Edit Client Details</h2>
            
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                    <input
                      type="text"
                      name="name"
                  value={formData.name}
                      onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Relationship</label>
                    <select
                      name="relationship"
                  value={formData.relationship}
                      onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    >
                      <option value="Relationship">Relationship</option>
                      <option value="Single">Single</option>
                      <option value="Trust">Trust</option>
                    </select>
          </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="active">Active</option>
                  <option value="dormant">Dormant</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Advisor</label>
                    <input
                      type="text"
                      name="advisor"
                  value={formData.advisor || ''}
                      onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
          </div>
        </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setIsCorrecting(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button
                onClick={handleCorrect}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-700 rounded-md shadow-sm hover:bg-indigo-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        )}
        
        {/* Additional Action Buttons - preserving existing buttons */}
        <div className="mb-6 flex space-x-4">
          {client.status !== 'dormant' && (
              <button
              onClick={handleMakeDormant}
              className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-md shadow-sm hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
              >
              Set Dormant
              </button>
          )}
              <button
                onClick={handleVersionHistory}
            className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-md shadow-sm hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
              >
                Version History
              </button>
        </div>
      </div>
    </>
  );
};

export default ClientDetails;
