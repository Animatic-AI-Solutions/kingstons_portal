import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { useAccountDetails, Holding, Account, ActivityLog } from '../hooks/useAccountDetails';
import EditableMonthlyActivitiesTable from '../components/EditableMonthlyActivitiesTable';
import YearNavigator from '../components/YearNavigator';
import FundDetailCard from '../components/FundDetailCard';
import AccountDetailsSkeleton from '../components/AccountDetailsSkeleton';
import { calculatePortfolioIRR } from '../services/api';

interface AccountData {
  account: Account | null;
  holdings: Holding[];
  activities: ActivityLog[];
}

interface IrrData {
  [fundId: number]: {
    value: number;
    calculationDate: string;
  };
}

/**
 * Optimized Account Details page component
 * Uses React Query for efficient data fetching and caching
 * Implements progressive loading with skeleton UI
 */
const OptimizedAccountDetails: React.FC = () => {
  const { accountId } = useParams<{ accountId: string }>();
  const navigate = useNavigate();
  const { api } = useAuth();
  
  // State for UI
  const [activeTab, setActiveTab] = useState<'info' | 'holdings' | 'activity'>('info');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isCalculatingIRR, setIsCalculatingIRR] = useState(false);
  const [irrResult, setIrrResult] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  
  // Use the custom hook to fetch account data
  const { 
    data, 
    isLoading, 
    error, 
    refreshData 
  } = useAccountDetails(accountId);
  
  // Early destructuring of data
  const accountData = data as AccountData;
  const [account, setAccount] = useState<Account | null>(null);
  
  // Set account data when it's loaded
  useEffect(() => {
    if (accountData?.account) {
      setAccount(accountData.account);
    }
  }, [accountData?.account]);
  
  // Access holdings from accountData
  const holdings = accountData?.holdings || [];
  const activities = accountData?.activities || [];

  // Filter activities by selected year
  const filterActivitiesByYear = (year: number) => {
    return activities.filter((activity: ActivityLog) => {
      const activityDate = new Date(activity.activity_timestamp);
      return activityDate.getFullYear() === year;
    });
  };
  
  // Calculate filtered activities based on selected year
  const yearFilteredActivities = filterActivitiesByYear(selectedYear);

  // Use React Query to fetch the latest fund valuations for all holdings
  const { data: fundValuations, isLoading: isLoadingValuations } = useQuery({
    queryKey: ['all_fund_valuations', holdings.map((h: Holding) => h.id)],
    queryFn: async () => {
      if (holdings.length === 0) return {};
      
      // Create a map to store valuations by portfolio fund ID
      const valuationsMap: Record<number, number> = {};
      
      // Fetch valuations for each holding in parallel
      await Promise.all(
        holdings.map(async (holding: Holding) => {
          try {
            const response = await api.get(`/fund_valuations/latest/${holding.id}`);
            if (response.data && response.data.value !== undefined) {
              valuationsMap[holding.id] = response.data.value;
            }
          } catch (error) {
            console.error(`Error fetching valuation for fund ${holding.id}:`, error);
            // Default to 0 if there's an error
            valuationsMap[holding.id] = 0;
          }
        })
      );
      
      return valuationsMap;
    },
    enabled: holdings.length > 0 && activeTab === 'holdings',
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });

  // Use React Query to fetch the latest IRR values for all holdings
  const { data: irrValues, isLoading: isLoadingIrr } = useQuery({
    queryKey: ['all_irr_values', holdings.map((h: Holding) => h.id)],
    queryFn: async () => {
      if (holdings.length === 0) return {};
      
      // Create a map to store IRR values by portfolio fund ID
      const irrMap: IrrData = {};
      
      // Fetch IRR values for each holding in parallel
      await Promise.all(
        holdings.map(async (holding: Holding) => {
          try {
            const response = await api.get(`/portfolio_funds/${holding.id}/latest-irr`);
            if (response.data) {
              irrMap[holding.id] = {
                value: response.data.irr || 0,
                calculationDate: response.data.calculation_date || new Date().toISOString()
              };
            }
          } catch (error) {
            console.error(`Error fetching IRR for fund ${holding.id}:`, error);
            // Default to 0 if there's an error
            irrMap[holding.id] = {
              value: 0,
              calculationDate: new Date().toISOString()
            };
          }
        })
      );
      
      return irrMap;
    },
    enabled: holdings.length > 0 && activeTab === 'holdings',
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });
  
  // Get the current value for a holding
  const getHoldingCurrentValue = (holdingId: number): number => {
    if (fundValuations && fundValuations[holdingId] !== undefined) {
      return fundValuations[holdingId];
    }
    return 0;
  };

  // Get the latest IRR for a holding
  const getHoldingIRR = (holdingId: number): number => {
    if (irrValues && irrValues[holdingId]?.value !== undefined) {
      return irrValues[holdingId].value;
    }
    // Fallback to the IRR from holdings data
    const holding = holdings.find(h => h.id === holdingId);
    return holding?.irr || 0;
  };

  // Get the IRR calculation date for a holding
  const getHoldingIRRDate = (holdingId: number): string => {
    if (irrValues && irrValues[holdingId]?.calculationDate) {
      return irrValues[holdingId].calculationDate;
    }
    // Fallback to the IRR calculation date from holdings data
    const holding = holdings.find(h => h.id === holdingId);
    return holding?.irr_calculation_date || '';
  };

  // Calculate total portfolio value
  const totalPortfolioValue = useMemo(() => {
    if (holdings.length === 0 || !fundValuations) return 0;
    
    return holdings.reduce((total: number, holding: Holding) => {
      return total + getHoldingCurrentValue(holding.id);
    }, 0);
  }, [holdings, fundValuations]);

  // Update account.total_value when totalPortfolioValue changes
  useEffect(() => {
    if (account && totalPortfolioValue > 0 && account.total_value !== totalPortfolioValue) {
      setAccount({
        ...account,
        total_value: totalPortfolioValue
      });
    }
  }, [totalPortfolioValue]);

  // Format functions
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatPercentage = (value: number, isAlreadyPercentage: boolean = false): string => {
    if (isAlreadyPercentage) {
      return `${value.toFixed(2)}%`;
    }
    return `${(value * 100).toFixed(2)}%`;
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };
  
  // Handle IRR calculation
  const handleCalculateIRR = async () => {
    if (!accountId || !data?.account?.current_portfolio?.id) return;
    
    setIsCalculatingIRR(true);
    
    try {
      const portfolioId = data.account.current_portfolio.id;
      const response = await calculatePortfolioIRR(portfolioId);
      setIrrResult(response);
      
      // Refresh data to get updated IRR values
      refreshData();
    } catch (err) {
      console.error('Error calculating IRR:', err);
    } finally {
      setIsCalculatingIRR(false);
    }
  };
  
  // Function to update activities
  const handleActivitiesUpdated = () => {
    refreshData();
  };
  
  // Handle account deletion
  const handleDeleteAccount = async () => {
    if (!accountId) return;
    
    setIsDeleting(true);
    setDeleteError(null);
    
    try {
      // Implement account deletion logic here
      // await api.delete(`/client_accounts/${accountId}`);
      navigate('/accounts');
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete account');
      setIsDeleting(false);
    }
  };
  
  // If loading, show skeleton UI
  if (isLoading) {
    return <AccountDetailsSkeleton />;
  }
  
  // If error, show error message
  if (error || !data) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">
                {error ? (typeof error === 'object' && 'message' in error ? (error as any).message : 'An error occurred') : 'Failed to load account data'}
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={() => refreshData()}
          className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
        >
          Retry Loading
        </button>
      </div>
    );
  }
  
  // Get active holding
  const activeHolding = holdings.find(h => h.status === 'active');
  
  // Guard against null account
  if (!account) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4">
          <p className="text-yellow-700">Account data is loading or not available</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header section with account name and actions */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{account.account_name}</h1>
          <p className="text-sm text-gray-500">Client: {account.client_name}</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={handleCalculateIRR}
            disabled={isCalculatingIRR}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCalculatingIRR ? 'Calculating...' : 'Calculate IRR'}
          </button>
          <button
            onClick={() => setIsDeleteModalOpen(true)}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Delete Account
          </button>
        </div>
      </div>
      
      {/* Navigation tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            className={`pb-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'info'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('info')}
          >
            Account Info
          </button>
          <button
            className={`pb-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'holdings'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('holdings')}
          >
            IRR
          </button>
          <button
            className={`pb-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'activity'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            onClick={() => setActiveTab('activity')}
          >
            Activity
          </button>
        </nav>
      </div>
      
      {/* Account Info Tab */}
      {activeTab === 'info' && (
        <div>
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Account Details</h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-500">Account Type</p>
                <p className="font-medium">{account.product_name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Provider</p>
                <p className="font-medium">{account.provider_name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <p className="font-medium capitalize">{account.status || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Start Date</p>
                <p className="font-medium">{formatDate(account.start_date)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Current Portfolio</p>
                <p className="font-medium">
                  {account.current_portfolio?.portfolio_name || 'No Portfolio Assigned'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">IRR</p>
                <p className="font-medium">{account.irr ? formatPercentage(account.irr, true) : 'Not Calculated'}</p>
              </div>
            </div>
          </div>
          
          {/* Current Holdings Section */}
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Current Holdings</h2>
            {holdings.length === 0 ? (
              <p className="text-gray-500">No holdings found</p>
            ) : (
              <div className="space-y-4">
                {holdings.map(holding => (
                  <FundDetailCard 
                    key={holding.id} 
                    holding={holding} 
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* IRR Tab */}
      {activeTab === 'holdings' && (
        <div>
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Portfolio Performance</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-50 p-4 rounded">
                <p className="text-sm text-gray-500">Total Value</p>
                <p className="text-xl font-medium">{formatCurrency(account.total_value || 0)}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded">
                <p className="text-sm text-gray-500">IRR</p>
                <p className="text-xl font-medium">{account.irr ? formatPercentage(account.irr, true) : 'N/A'}</p>
              </div>
            </div>
            
            {/* IRR Calculation Result */}
            {irrResult && (
              <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-4">
                <p className="text-green-700">
                  IRR calculation completed: {irrResult.successful} successful, {irrResult.skipped} skipped, {irrResult.failed} failed
                </p>
              </div>
            )}
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fund
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Invested
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Current Value
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      IRR
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Updated
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {holdings.map(holding => (
                    <tr key={holding.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{holding.fund_name}</div>
                        <div className="text-sm text-gray-500">ISIN: {holding.isin_number}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatCurrency(holding.amount_invested)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isLoadingValuations ? (
                          <div className="animate-pulse h-4 w-20 bg-gray-200 rounded"></div>
                        ) : (
                          <div className="text-sm text-gray-900">{formatCurrency(getHoldingCurrentValue(holding.id))}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isLoadingIrr ? (
                          <div className="animate-pulse h-4 w-20 bg-gray-200 rounded"></div>
                        ) : (
                          <div className="text-sm text-gray-900">
                            {getHoldingIRR(holding.id) ? formatPercentage(getHoldingIRR(holding.id), true) : 'N/A'}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {getHoldingIRRDate(holding.id) ? formatDate(getHoldingIRRDate(holding.id)) : 'N/A'}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Monthly Activities Table - Moved from Activity tab */}
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">Monthly Activities</h2>
            <YearNavigator 
              selectedYear={selectedYear} 
              onYearChange={setSelectedYear} 
            />
            
            {activeHolding && activeHolding.account_holding_id && (
              <EditableMonthlyActivitiesTable
                funds={holdings.map(h => ({
                  id: h.id,
                  fund_name: h.fund_name || 'Unknown Fund',
                  holding_id: h.account_holding_id,
                  irr: h.irr || 0,
                  start_date: h.start_date
                }))}
                activities={yearFilteredActivities as any}
                accountHoldingId={activeHolding.account_holding_id}
                onActivitiesUpdated={handleActivitiesUpdated}
                selectedYear={selectedYear}
              />
            )}
          </div>
        </div>
      )}
      
      {/* Activity Tab */}
      {activeTab === 'activity' && (
        <div>
          <div className="bg-white shadow rounded-lg p-6 mt-4">
            <h2 className="text-xl font-semibold mb-4">Account Activity Log</h2>
            <p className="text-gray-500">
              The monthly activities table has been moved to the IRR tab for better workflow. 
              Please switch to the IRR tab to view and edit monthly activities.
            </p>
          </div>
        </div>
      )}
      
      {/* Delete Account Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Delete Account</h3>
            <p className="text-gray-500 mb-4">
              Are you sure you want to delete this account? This action cannot be undone.
            </p>
            
            {deleteError && (
              <div className="bg-red-50 border-l-4 border-red-500 p-2 mb-4">
                <p className="text-sm text-red-700">{deleteError}</p>
              </div>
            )}
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OptimizedAccountDetails; 