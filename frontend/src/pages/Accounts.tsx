import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface Account {
  id: number;
  client_id: number;
  client_name?: string;
  account_name: string;
  provider_name?: string;
  product_name?: string;
  portfolio_name?: string;
  status: string;
  start_date: string;
  irr?: number | null;
  irr_date?: string | null;
  total_value?: number;
}

type SortField = 'account_name' | 'client_name' | 'provider_name' | 'product_name' | 'status' | 'start_date' | 'irr' | 'total_value';
type SortOrder = 'asc' | 'desc';

const Accounts: React.FC = () => {
  const navigate = useNavigate();
  const { api } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('account_name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [groupByClient, setGroupByClient] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<{id: number, name: string} | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [providerFilter, setProviderFilter] = useState<string | null>(null);
  const [showProviderFilter, setShowProviderFilter] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [showStatusFilter, setShowStatusFilter] = useState(false);
  const providerFilterRef = useRef<HTMLDivElement>(null);
  const statusFilterRef = useRef<HTMLDivElement>(null);
  
  // Position states for the dropdowns
  const [providerDropdownPosition, setProviderDropdownPosition] = useState({ top: 0, left: 0 });
  const [statusDropdownPosition, setStatusDropdownPosition] = useState({ top: 0, left: 0 });
  
  // Functions to calculate and set dropdown positions
  const updateProviderDropdownPosition = () => {
    if (providerFilterRef.current) {
      const rect = providerFilterRef.current.getBoundingClientRect();
      setProviderDropdownPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX
      });
    }
  };
  
  const updateStatusDropdownPosition = () => {
    if (statusFilterRef.current) {
      const rect = statusFilterRef.current.getBoundingClientRect();
      setStatusDropdownPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX
      });
    }
  };
  
  // Add effect hooks for dropdown positioning
  useEffect(() => {
    if (showProviderFilter) {
      updateProviderDropdownPosition();
      window.addEventListener('scroll', updateProviderDropdownPosition);
      window.addEventListener('resize', updateProviderDropdownPosition);
    }
    
    return () => {
      window.removeEventListener('scroll', updateProviderDropdownPosition);
      window.removeEventListener('resize', updateProviderDropdownPosition);
    };
  }, [showProviderFilter]);
  
  useEffect(() => {
    if (showStatusFilter) {
      updateStatusDropdownPosition();
      window.addEventListener('scroll', updateStatusDropdownPosition);
      window.addEventListener('resize', updateStatusDropdownPosition);
    }
    
    return () => {
      window.removeEventListener('scroll', updateStatusDropdownPosition);
      window.removeEventListener('resize', updateStatusDropdownPosition);
    };
  }, [showStatusFilter]);
  
  // Add click outside handler
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (providerFilterRef.current && !providerFilterRef.current.contains(event.target as Node)) {
        setShowProviderFilter(false);
      }
      if (statusFilterRef.current && !statusFilterRef.current.contains(event.target as Node)) {
        setShowStatusFilter(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchAccounts = async () => {
    try {
      setIsLoading(true);
      console.log("Fetching accounts data...");
      
      // Fetch all required data in parallel
      const [
        accountsRes,
        clientsRes,
        productsRes,
        providersRes,
        portfoliosRes,
        holdingsRes,
        fundRes
      ] = await Promise.all([
        api.get('/client_accounts'),
        api.get('/clients'),
        api.get('/available_products'),
        api.get('/available_providers'),
        api.get('/portfolios'),
        api.get('/account_holdings'),
        api.get('/portfolio_funds')
      ]);
      
      console.log(`Received ${accountsRes.data.length} accounts`);
      
      // Process the accounts data - make sure to only set the actual account data
      const accountsData = accountsRes.data.map((account: any) => {
        // Find client name
        const client = clientsRes.data.find((c: any) => c.id === account.client_id);
        // Find product name
        const product = productsRes.data.find((p: any) => p.id === account.available_products_id);
        // Find provider name
        const provider = product ? providersRes.data.find((p: any) => p.id === product.available_providers_id) : null;
        // Find portfolio
        const holding = holdingsRes.data.find((h: any) => h.client_account_id === account.id);
        const portfolio = holding ? portfoliosRes.data.find((p: any) => p.id === holding.portfolio_id) : null;
        
        // Calculate total value if possible
        let totalValue = undefined;
        if (holding && holding.portfolio_id) {
          const portfolioFunds = fundRes.data.filter((pf: any) => pf.portfolio_id === holding.portfolio_id);
          totalValue = portfolioFunds.reduce((sum: number, pf: any) => sum + (pf.amount_invested || 0), 0);
        }
        
        return {
          ...account,
          client_name: client ? client.name : 'Unknown Client',
          product_name: product ? product.product_name : 'Unknown Product',
          provider_name: provider ? provider.name : 'Unknown Provider',
          portfolio_name: portfolio ? portfolio.name : undefined,
          total_value: totalValue
        };
      });
      
      setAccounts(accountsData);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch accounts');
      console.error('Error fetching accounts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, [api]);

  const handleSortFieldChange = (field: SortField) => {
    if (field === sortField) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleAccountClick = (accountId: number) => {
    navigate(`/accounts/${accountId}`);
  };

  const handleDeleteClientAccounts = (clientName: string) => {
    // Find the client ID from accounts
    const clientAccount = accounts.find(account => account.client_name === clientName);
    if (clientAccount) {
      setClientToDelete({
        id: clientAccount.client_id,
        name: clientName
      });
      setShowDeleteConfirm(true);
    }
  };

  const handleConfirmDelete = async () => {
    if (!clientToDelete) return;
    
    try {
      setIsDeleting(true);
      
      // Call API to delete all accounts, portfolios, and products for this client
      await api.delete(`/clients/${clientToDelete.id}/accounts`);
      
      // Refresh the accounts list
      await fetchAccounts();
      
      // Close the modal
      setShowDeleteConfirm(false);
      setClientToDelete(null);
    } catch (err: any) {
      console.error('Error deleting client accounts:', err);
      setError(err.response?.data?.detail || 'Failed to delete client accounts');
    } finally {
      setIsDeleting(false);
    }
  };

  // Format currency with commas and 2 decimal places
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Format percentage with 1 decimal place
  const formatPercentage = (value: number | null | undefined): string => {
    if (value === null || value === undefined) {
      return 'N/A';
    }
    return `${value.toFixed(1)}%`;
  };

  const filteredAndSortedAccounts = accounts
    .filter(account => 
      (account.account_name && account.account_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (account.client_name && account.client_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (account.provider_name && account.provider_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (account.product_name && account.product_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      account.status.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .filter(account => 
      providerFilter === null || 
      (account.provider_name && account.provider_name.toLowerCase() === providerFilter.toLowerCase())
    )
    .filter(account => 
      statusFilter === null || 
      (account.status.toLowerCase() === statusFilter.toLowerCase())
    )
    .sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];
      
      // Handle string comparisons
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      // Handle undefined values
      if (aValue === undefined) return 1;
      if (bValue === undefined) return -1;
      
      // Compare values
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

  // Extract unique provider names and statuses
  const providers = [...new Set(accounts
    .map(account => account.provider_name)
    .filter(provider => provider !== undefined && provider !== null))] as string[];
    
  const statuses = [...new Set(accounts
    .map(account => account.status)
    .filter(status => status !== null))] as string[];

  // Group accounts by client if the option is selected
  const groupedAccounts = groupByClient
    ? filteredAndSortedAccounts.reduce((groups: Record<string, Account[]>, account) => {
        const clientName = account.client_name || 'Unknown Client';
        if (!groups[clientName]) {
          groups[clientName] = [];
        }
        groups[clientName].push(account);
        return groups;
      }, {})
    : {};

  // Add a new handler function to navigate to the create client accounts page
  const handleCreateClientAccounts = () => {
    navigate('/create-client-accounts');
  };

  return (
    <div className="container mx-auto px-4 py-3">
      <div className="flex justify-between items-center mb-3">
        <h1 className="text-3xl font-normal text-gray-900 font-sans tracking-wide">Accounts</h1>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={groupByClient}
              onChange={(e) => setGroupByClient(e.target.checked)}
              className="form-checkbox h-5 w-5 text-blue-600"
            />
            <span>Group by Client</span>
          </label>
            <button
              onClick={handleCreateClientAccounts}
            className="bg-primary-700 text-white px-4 py-1.5 rounded-xl font-medium hover:bg-primary-800 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-700 focus:ring-offset-2 shadow-sm flex items-center gap-1"
            >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Create Account
            </button>
          </div>
        </div>

      <div className="bg-white shadow rounded-lg p-4 overflow-visible">
        {/* Search and Sort Controls */}
        <div className="flex flex-col sm:flex-row gap-3 mb-3">
          {/* Search Bar */}
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search accounts..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors duration-200"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Sort controls can be updated in the next edit */}
        </div>

        {/* Account List */}
        <div className="mt-6">
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : error ? (
            <div className="text-red-600 text-center py-4">{error}</div>
          ) : filteredAndSortedAccounts.length === 0 ? (
            <div className="text-gray-500 text-center py-4">No accounts found</div>
          ) : groupByClient ? (
            // Grouped by client view
            <div className="space-y-4">
              {Object.entries(groupedAccounts).map(([clientName, clientAccounts]) => (
                <div key={clientName} className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                    <div>
                      <h3 className="text-base font-medium text-gray-900 font-sans tracking-tight">{clientName}</h3>
                      <p className="text-sm text-gray-500">{clientAccounts.length} account(s)</p>
                    </div>
                    <button
                      onClick={() => handleDeleteClientAccounts(clientName)}
                      className="text-red-600 hover:text-red-800 text-sm font-medium flex items-center"
                      title="Delete all accounts for this client"
                    >
                      <svg className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v10m4-10v10m5-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete All
                    </button>
                  </div>
                  <div className="overflow-x-auto overflow-visible">
                    <table className="min-w-full table-fixed divide-y divide-gray-200">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="w-[20%] px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300">
                            <div className="flex items-center group cursor-pointer hover:bg-indigo-50 rounded py-1 px-1 transition-colors duration-150" onClick={() => handleSortFieldChange('product_name')} title="Click to sort by Product">
                            Product
                              <span className="ml-1 text-gray-400 group-hover:text-indigo-500">
                                {sortField === 'product_name' ? (
                                  sortOrder === 'asc' ? (
                                    <svg className="h-4 w-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                    </svg>
                                  ) : (
                                    <svg className="h-4 w-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                  )
                                ) : (
                                  <svg className="h-4 w-4 opacity-0 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4" />
                                  </svg>
                                )}
                              </span>
                            </div>
                          </th>
                          <th className="w-[20%] px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300">
                            <div className="flex items-center justify-start relative" ref={providerFilterRef}>
                              <div className="flex items-center cursor-pointer hover:bg-indigo-50 rounded py-1 px-1 transition-colors duration-150" onClick={() => handleSortFieldChange('provider_name')} title="Click to sort by Provider">
                                <span>Provider</span>
                                <span className="ml-1 text-gray-400 group-hover:text-indigo-500">
                                  {sortField === 'provider_name' ? (
                                    sortOrder === 'asc' ? (
                                      <svg className="h-4 w-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                      </svg>
                                    ) : (
                                      <svg className="h-4 w-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                      </svg>
                                    )
                                  ) : (
                                    <svg className="h-4 w-4 opacity-0 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4" />
                                    </svg>
                                  )}
                                </span>
                              </div>
                              <div className="flex items-center ml-1">
                                {providerFilter && (
                                  <span className="mr-1 px-1.5 py-0.5 text-xs rounded-full bg-indigo-100 text-indigo-800">
                                    {providerFilter}
                                  </span>
                                )}
                                <button 
                                  onClick={() => {
                                    updateProviderDropdownPosition();
                                    setShowProviderFilter(!showProviderFilter);
                                  }}
                                  className={`${providerFilter ? 'text-indigo-600' : 'text-gray-500'} hover:text-indigo-600 focus:outline-none flex items-center`}
                                  aria-label="Filter providers"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                  </svg>
                                </button>
                              </div>
                              
                              {showProviderFilter && (
                                <div className="fixed z-50 w-48 bg-white rounded-md shadow-xl border border-gray-200 py-1 text-left" style={{ top: providerDropdownPosition.top, left: providerDropdownPosition.left }}>
                                  <button 
                                    onClick={() => {
                                      setProviderFilter(null);
                                      setShowProviderFilter(false);
                                    }}
                                    className={`block w-full px-4 py-2 text-sm text-left hover:bg-gray-100 ${providerFilter === null ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700'}`}
                                  >
                                    All Providers
                                  </button>
                                  {providers.map(provider => (
                                    <button 
                                      key={provider}
                                      onClick={() => {
                                        setProviderFilter(provider);
                                        setShowProviderFilter(false);
                                      }}
                                      className={`block w-full px-4 py-2 text-sm text-left hover:bg-gray-100 ${providerFilter === provider ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700'}`}
                                    >
                                      {provider}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </th>
                          <th className="w-[20%] px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300">
                            <div className="flex items-center group cursor-pointer hover:bg-indigo-50 rounded py-1 px-1 transition-colors duration-150" onClick={() => handleSortFieldChange('total_value')} title="Click to sort by Value">
                            Value
                              <span className="ml-1 text-gray-400 group-hover:text-indigo-500">
                                {sortField === 'total_value' ? (
                                  sortOrder === 'asc' ? (
                                    <svg className="h-4 w-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                    </svg>
                                  ) : (
                                    <svg className="h-4 w-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                  )
                                ) : (
                                  <svg className="h-4 w-4 opacity-0 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4" />
                                  </svg>
                                )}
                              </span>
                            </div>
                          </th>
                          <th className="w-[20%] px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300">
                            <div className="flex items-center group cursor-pointer hover:bg-indigo-50 rounded py-1 px-1 transition-colors duration-150" onClick={() => handleSortFieldChange('irr')} title="Click to sort by IRR">
                              IRR
                              <span className="ml-1 text-gray-400 group-hover:text-indigo-500">
                                {sortField === 'irr' ? (
                                  sortOrder === 'asc' ? (
                                    <svg className="h-4 w-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                    </svg>
                                  ) : (
                                    <svg className="h-4 w-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                  )
                                ) : (
                                  <svg className="h-4 w-4 opacity-0 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4" />
                                  </svg>
                                )}
                              </span>
                            </div>
                          </th>
                          <th className="w-[20%] px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300">
                            <div className="flex items-center justify-start relative" ref={statusFilterRef}>
                              <div className="flex items-center cursor-pointer hover:bg-indigo-50 rounded py-1 px-1 transition-colors duration-150" onClick={() => handleSortFieldChange('status')} title="Click to sort by Status">
                                <span>Status</span>
                                <span className="ml-1 text-gray-400 group-hover:text-indigo-500">
                                  {sortField === 'status' ? (
                                    sortOrder === 'asc' ? (
                                      <svg className="h-4 w-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                      </svg>
                                    ) : (
                                      <svg className="h-4 w-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                      </svg>
                                    )
                                  ) : (
                                    <svg className="h-4 w-4 opacity-0 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4" />
                                    </svg>
                                  )}
                                </span>
                              </div>
                              <div className="flex items-center ml-1">
                                {statusFilter && (
                                  <span className="mr-1 px-1.5 py-0.5 text-xs rounded-full bg-indigo-100 text-indigo-800">
                                    {statusFilter}
                                  </span>
                                )}
                                <button 
                                  onClick={() => {
                                    updateStatusDropdownPosition();
                                    setShowStatusFilter(!showStatusFilter);
                                  }}
                                  className={`${statusFilter ? 'text-indigo-600' : 'text-gray-500'} hover:text-indigo-600 focus:outline-none flex items-center`}
                                  aria-label="Filter statuses"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                                  </svg>
                                </button>
                              </div>
                              
                              {showStatusFilter && (
                                <div className="fixed z-50 w-48 bg-white rounded-md shadow-xl border border-gray-200 py-1 text-left" style={{ top: statusDropdownPosition.top, left: statusDropdownPosition.left }}>
                                  <button 
                                    onClick={() => {
                                      setStatusFilter(null);
                                      setShowStatusFilter(false);
                                    }}
                                    className={`block w-full px-4 py-2 text-sm text-left hover:bg-gray-100 ${statusFilter === null ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700'}`}
                                  >
                                    All Statuses
                                  </button>
                                  {statuses.map(status => (
                                    <button 
                                      key={status}
                                      onClick={() => {
                                        setStatusFilter(status);
                                        setShowStatusFilter(false);
                                      }}
                                      className={`block w-full px-4 py-2 text-sm text-left hover:bg-gray-100 ${statusFilter === status ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700'}`}
                                    >
                                      {status}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {clientAccounts.map((account) => (
                          <tr 
                            key={account.id} 
                            className="hover:bg-indigo-50 transition-colors duration-150 cursor-pointer border-b border-gray-100"
                            onClick={() => handleAccountClick(account.id)}
                          >
                            <td className="px-6 py-3 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-800 font-sans tracking-tight">{account.product_name}</div>
                              <div className="text-xs text-gray-500 font-sans">
                                Account: {account.account_name}
                              </div>
                            </td>
                            <td className="px-6 py-3 whitespace-nowrap">
                              <div className="text-sm text-gray-600 font-sans">{account.provider_name || 'Unknown'}</div>
                            </td>
                            <td className="px-6 py-3 whitespace-nowrap">
                              {account.total_value !== undefined ? (
                                <div className="text-sm font-medium text-indigo-600">
                                  {formatCurrency(account.total_value)}
                                </div>
                              ) : (
                                <div className="text-sm text-gray-500">N/A</div>
                              )}
                            </td>
                            <td className="px-6 py-3 whitespace-nowrap">
                              {account.irr !== undefined && account.irr !== null ? (
                                <div>
                                  <div className={`text-sm font-medium ${(account.irr ?? 0) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                                    {formatPercentage(account.irr)}
                                    <span className="ml-1">
                                      {(account.irr ?? 0) >= 0 ? '▲' : '▼'}
                                    </span>
                                  </div>
                                  {account.irr_date && (
                                    <div className="text-xs text-gray-500 mt-1">
                                      as of {new Date(account.irr_date).toLocaleDateString()}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="text-sm text-gray-500">-</div>
                              )}
                            </td>
                            <td className="px-6 py-3 whitespace-nowrap">
                              <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                account.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                              }`}>
                                {account.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            // Regular table view
            <div className="overflow-x-auto overflow-visible">
              <table className="min-w-full table-fixed divide-y divide-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="w-[20%] px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300">
                      <div className="flex items-center group cursor-pointer hover:bg-indigo-50 rounded py-1 px-1 transition-colors duration-150" onClick={() => handleSortFieldChange('client_name')} title="Click to sort by Client">
                      Client
                        <span className="ml-1 text-gray-400 group-hover:text-indigo-500">
                          {sortField === 'client_name' ? (
                            sortOrder === 'asc' ? (
                              <svg className="h-4 w-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                              </svg>
                            ) : (
                              <svg className="h-4 w-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            )
                          ) : (
                            <svg className="h-4 w-4 opacity-0 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4" />
                            </svg>
                          )}
                        </span>
                      </div>
                    </th>
                    <th className="w-[16%] px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300">
                      <div className="flex items-center group cursor-pointer hover:bg-indigo-50 rounded py-1 px-1 transition-colors duration-150" onClick={() => handleSortFieldChange('product_name')} title="Click to sort by Product">
                      Product
                        <span className="ml-1 text-gray-400 group-hover:text-indigo-500">
                          {sortField === 'product_name' ? (
                            sortOrder === 'asc' ? (
                              <svg className="h-4 w-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                              </svg>
                            ) : (
                              <svg className="h-4 w-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            )
                          ) : (
                            <svg className="h-4 w-4 opacity-0 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4" />
                            </svg>
                          )}
                        </span>
                      </div>
                    </th>
                    <th className="w-[16%] px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300">
                      <div className="flex items-center justify-start relative" ref={providerFilterRef}>
                        <div className="flex items-center cursor-pointer hover:bg-indigo-50 rounded py-1 px-1 transition-colors duration-150" onClick={() => handleSortFieldChange('provider_name')} title="Click to sort by Provider">
                          <span>Provider</span>
                          <span className="ml-1 text-gray-400 group-hover:text-indigo-500">
                            {sortField === 'provider_name' ? (
                              sortOrder === 'asc' ? (
                                <svg className="h-4 w-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                </svg>
                              ) : (
                                <svg className="h-4 w-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              )
                            ) : (
                              <svg className="h-4 w-4 opacity-0 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4" />
                              </svg>
                            )}
                          </span>
                        </div>
                        <div className="flex items-center ml-1">
                          {providerFilter && (
                            <span className="mr-1 px-1.5 py-0.5 text-xs rounded-full bg-indigo-100 text-indigo-800">
                              {providerFilter}
                            </span>
                          )}
                          <button 
                            onClick={() => {
                              updateProviderDropdownPosition();
                              setShowProviderFilter(!showProviderFilter);
                            }}
                            className={`${providerFilter ? 'text-indigo-600' : 'text-gray-500'} hover:text-indigo-600 focus:outline-none flex items-center`}
                            aria-label="Filter providers"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>
                        
                        {showProviderFilter && (
                          <div className="fixed z-50 w-48 bg-white rounded-md shadow-xl border border-gray-200 py-1 text-left" style={{ top: providerDropdownPosition.top, left: providerDropdownPosition.left }}>
                            <button 
                              onClick={() => {
                                setProviderFilter(null);
                                setShowProviderFilter(false);
                              }}
                              className={`block w-full px-4 py-2 text-sm text-left hover:bg-gray-100 ${providerFilter === null ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700'}`}
                            >
                              All Providers
                            </button>
                            {providers.map(provider => (
                              <button 
                                key={provider}
                                onClick={() => {
                                  setProviderFilter(provider);
                                  setShowProviderFilter(false);
                                }}
                                className={`block w-full px-4 py-2 text-sm text-left hover:bg-gray-100 ${providerFilter === provider ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700'}`}
                              >
                                {provider}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </th>
                    <th className="w-[16%] px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300">
                      <div className="flex items-center group cursor-pointer hover:bg-indigo-50 rounded py-1 px-1 transition-colors duration-150" onClick={() => handleSortFieldChange('total_value')} title="Click to sort by Value">
                      Value
                        <span className="ml-1 text-gray-400 group-hover:text-indigo-500">
                          {sortField === 'total_value' ? (
                            sortOrder === 'asc' ? (
                              <svg className="h-4 w-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                              </svg>
                            ) : (
                              <svg className="h-4 w-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            )
                          ) : (
                            <svg className="h-4 w-4 opacity-0 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4" />
                            </svg>
                          )}
                        </span>
                      </div>
                    </th>
                    <th className="w-[16%] px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300">
                      <div className="flex items-center group cursor-pointer hover:bg-indigo-50 rounded py-1 px-1 transition-colors duration-150" onClick={() => handleSortFieldChange('irr')} title="Click to sort by IRR">
                        IRR
                        <span className="ml-1 text-gray-400 group-hover:text-indigo-500">
                          {sortField === 'irr' ? (
                            sortOrder === 'asc' ? (
                              <svg className="h-4 w-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                              </svg>
                            ) : (
                              <svg className="h-4 w-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            )
                          ) : (
                            <svg className="h-4 w-4 opacity-0 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4" />
                            </svg>
                          )}
                        </span>
                      </div>
                    </th>
                    <th className="w-[16%] px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300">
                      <div className="flex items-center justify-start relative" ref={statusFilterRef}>
                        <div className="flex items-center cursor-pointer hover:bg-indigo-50 rounded py-1 px-1 transition-colors duration-150" onClick={() => handleSortFieldChange('status')} title="Click to sort by Status">
                          <span>Status</span>
                          <span className="ml-1 text-gray-400 group-hover:text-indigo-500">
                            {sortField === 'status' ? (
                              sortOrder === 'asc' ? (
                                <svg className="h-4 w-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                </svg>
                              ) : (
                                <svg className="h-4 w-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              )
                            ) : (
                              <svg className="h-4 w-4 opacity-0 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4" />
                              </svg>
                            )}
                          </span>
                        </div>
                        <div className="flex items-center ml-1">
                          {statusFilter && (
                            <span className="mr-1 px-1.5 py-0.5 text-xs rounded-full bg-indigo-100 text-indigo-800">
                              {statusFilter}
                            </span>
                          )}
                          <button 
                            onClick={() => {
                              updateStatusDropdownPosition();
                              setShowStatusFilter(!showStatusFilter);
                            }}
                            className={`${statusFilter ? 'text-indigo-600' : 'text-gray-500'} hover:text-indigo-600 focus:outline-none flex items-center`}
                            aria-label="Filter statuses"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>
                        
                        {showStatusFilter && (
                          <div className="fixed z-50 w-48 bg-white rounded-md shadow-xl border border-gray-200 py-1 text-left" style={{ top: statusDropdownPosition.top, left: statusDropdownPosition.left }}>
                            <button 
                              onClick={() => {
                                setStatusFilter(null);
                                setShowStatusFilter(false);
                              }}
                              className={`block w-full px-4 py-2 text-sm text-left hover:bg-gray-100 ${statusFilter === null ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700'}`}
                            >
                              All Statuses
                            </button>
                            {statuses.map(status => (
                              <button 
                                key={status}
                                onClick={() => {
                                  setStatusFilter(status);
                                  setShowStatusFilter(false);
                                }}
                                className={`block w-full px-4 py-2 text-sm text-left hover:bg-gray-100 ${statusFilter === status ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700'}`}
                              >
                                {status}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAndSortedAccounts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-500 border-b border-gray-200">
                        No accounts found
                      </td>
                    </tr>
                  ) : (
                    filteredAndSortedAccounts.map((account) => (
                    <tr 
                      key={account.id} 
                        className="hover:bg-indigo-50 transition-colors duration-150 cursor-pointer border-b border-gray-100"
                      onClick={() => handleAccountClick(account.id)}
                    >
                        <td className="px-6 py-3 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-800 font-sans tracking-tight">{account.client_name}</div>
                          <div className="text-xs text-gray-500 font-sans">
                          Account: {account.account_name}
                        </div>
                      </td>
                        <td className="px-6 py-3 whitespace-nowrap">
                          <div className="text-sm text-gray-600 font-sans">{account.product_name}</div>
                        </td>
                        <td className="px-6 py-3 whitespace-nowrap">
                          <div className="text-sm text-gray-600 font-sans">{account.provider_name || 'Unknown'}</div>
                      </td>
                        <td className="px-6 py-3 whitespace-nowrap">
                          {account.total_value !== undefined ? (
                            <div className="text-sm font-medium text-indigo-600">
                              {formatCurrency(account.total_value)}
                            </div>
                          ) : (
                            <div className="text-sm text-gray-500">N/A</div>
                        )}
                      </td>
                        <td className="px-6 py-3 whitespace-nowrap">
                          {account.irr !== undefined && account.irr !== null ? (
                          <div>
                              <div className={`text-sm font-medium ${(account.irr ?? 0) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                              {formatPercentage(account.irr)}
                              <span className="ml-1">
                                {(account.irr ?? 0) >= 0 ? '▲' : '▼'}
                              </span>
                            </div>
                            {account.irr_date && (
                              <div className="text-xs text-gray-500 mt-1">
                                as of {new Date(account.irr_date).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                          ) : (
                            <div className="text-sm text-gray-500">-</div>
                        )}
                      </td>
                        <td className="px-6 py-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          account.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {account.status}
                        </span>
                      </td>
                    </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="relative mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg leading-6 font-medium text-gray-900 mt-4">Delete All Accounts</h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-500">
                  Are you sure you want to delete all accounts for "{clientToDelete?.name}"?
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  This will delete all accounts, portfolios, and products associated with this client.
                  <span className="font-medium"> This action cannot be undone.</span>
                </p>
              </div>
              <div className="flex justify-center gap-4 mt-4">
                <button 
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setClientToDelete(null);
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-800 text-base font-medium rounded-md shadow-sm hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-300"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className={`px-4 py-2 bg-red-600 text-white text-base font-medium rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 ${isDeleting ? 'opacity-75 cursor-not-allowed' : ''}`}
                >
                  {isDeleting ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Deleting...
                    </span>
                  ) : "Delete All"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Accounts;
