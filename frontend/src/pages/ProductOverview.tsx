import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Basic interfaces for type safety
interface Account {
  id: number;
  client_product_id: number;
  client_id: number;
  client_name: string;
  product_name: string;
  status: string;
  start_date: string;
  end_date?: string;
  irr?: number;
  total_value?: number;
  provider_name?: string;
  product_type?: string;
  plan_number?: string;
  is_bespoke?: boolean;
  original_template_id?: number;
  original_template_name?: string;
  current_portfolio?: {
    id: number;
    portfolio_name: string;
    assignment_start_date: string;
  };
}

interface Holding {
  id: number;
  fund_name?: string;
  isin_number?: string;
  target_weighting?: string;
  amount_invested: number;
  market_value: number;
  irr?: number;
  fund_id?: number;
}

interface AccountOverviewProps {
  accountId?: string;
}

const AccountOverview: React.FC<AccountOverviewProps> = ({ accountId: propAccountId }) => {
  const { accountId: paramAccountId } = useParams<{ accountId: string }>();
  const accountId = propAccountId || paramAccountId;
  const navigate = useNavigate();
  const { api } = useAuth();
  const [account, setAccount] = useState<Account | null>(null);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [fundsData, setFundsData] = useState<Map<number, any>>(new Map());
  const [lastValuationDate, setLastValuationDate] = useState<string | null>(null);

  useEffect(() => {
    if (accountId) {
      console.log('AccountOverview: Fetching data for accountId:', accountId);
      fetchData(accountId);
    } else {
      console.error('AccountOverview: No accountId available for data fetching');
    }
  }, [accountId, api]);

  const fetchData = async (accountId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('AccountOverview: Making API request to /client_products/' + accountId);
      
      // First fetch the account to get the portfolio_id
      const accountResponse = await api.get(`/client_products/${accountId}`);
      console.log('AccountOverview: Account data received:', accountResponse.data);
      setAccount(accountResponse.data);
      
      // Get the portfolio_id from the account - first try direct link, then fall back to current_portfolio
      const portfolioId = accountResponse.data.portfolio_id || accountResponse.data.current_portfolio?.id;
      console.log('AccountOverview: Portfolio ID from account:', portfolioId);
      
      if (!portfolioId) {
        console.warn('AccountOverview: No portfolio ID found for this account');
      }
      
      // Now fetch the remaining data in parallel
      const [
        fundsResponse,
        portfolioFundsResponse
      ] = await Promise.all([
        api.get('/funds'),
        portfolioId ? api.get(`/portfolio_funds?portfolio_id=${portfolioId}`) : api.get('/portfolio_funds')
      ]);
      
      console.log('AccountOverview: Account data received:', accountResponse.data);
      setAccount(accountResponse.data);
      
      // Create a map of funds for quick lookups
      const fundsMap = new Map<number, any>(
        fundsResponse.data.map((fund: any) => [fund.id, fund])
      );
      
      // Save funds data for risk factor display
      setFundsData(fundsMap);
      
      console.log('AccountOverview: Portfolio funds data:', portfolioFundsResponse.data);
      
      // With the new schema, portfolio_funds directly contain all the fund info we need
      if (portfolioId && portfolioFundsResponse.data.length > 0) {
        const processedHoldings = portfolioFundsResponse.data.map((pf: any) => {
          // Find fund details
          const fund = fundsMap.get(pf.available_funds_id);
          
          return {
            id: pf.id,
            fund_name: fund?.fund_name || 'Unknown Fund',
            fund_id: fund?.id,
            isin_number: fund?.isin_number || 'N/A',
            target_weighting: pf.weighting,
            amount_invested: pf.amount_invested || 0,
            market_value: pf.market_value || pf.amount_invested || 0, // Use market_value if available, fall back to amount_invested
            irr: pf.irr_result || null
          };
        });
        
        console.log('AccountOverview: Processed holdings from portfolio_funds:', processedHoldings);
        setHoldings(processedHoldings);
      } else {
        // Fallback to product_holdings (legacy approach) if no portfolio_funds are found
        console.log('AccountOverview: No portfolio funds found, falling back to product_holdings');
        const holdingsResponse = await api.get(`/product_holdings?client_product_id=${accountId}`);
        console.log('AccountOverview: Holdings data received:', holdingsResponse.data);
        
        // Process holdings to include fund names - legacy approach
        const processedHoldings = holdingsResponse.data.map((holding: any) => {
          console.log('AccountOverview: Processing holding:', holding);
          
          // Get the portfolio ID from the holding or from the account
          const holdingPortfolioId = holding.portfolio_id || portfolioId;
          
          if (!holdingPortfolioId) {
            console.warn('AccountOverview: No portfolio ID for holding:', holding.id);
            return {
              ...holding,
              fund_name: 'Unknown Fund',
              fund_id: null,
              isin_number: 'N/A'
            };
          }
          
          // Find all portfolio funds for this portfolio
          const relevantPortfolioFunds = portfolioFundsResponse.data.filter((pf: any) =>
            pf.portfolio_id === holdingPortfolioId
          );
          
          console.log('AccountOverview: Relevant portfolio funds for holding:', relevantPortfolioFunds);
          
          // Find a matching portfolio fund
          // Try different matching strategies
          let portfolioFund = relevantPortfolioFunds[0]; // Default to first fund in portfolio if no better match found
          
          // Try to match by fund_id if available
          if (holding.fund_id) {
            const matchByFundId = relevantPortfolioFunds.find((pf: any) =>
              pf.available_funds_id === holding.fund_id
            );
            if (matchByFundId) portfolioFund = matchByFundId;
          }
          
          console.log('AccountOverview: Matched portfolio fund:', portfolioFund);
          
          // Find the fund
          const fund = portfolioFund ? fundsMap.get(portfolioFund.available_funds_id) : null;
          console.log('AccountOverview: Matched fund:', fund);
          
          return {
            ...holding,
            fund_name: fund?.fund_name || holding.fund_name || 'Unknown Fund',
            fund_id: fund?.id || holding.fund_id,
            isin_number: fund?.isin_number || holding.isin_number || 'N/A'
          };
        });
        
        console.log('AccountOverview: Processed holdings with fund names:', processedHoldings);
        setHoldings(processedHoldings || []);
      }
    } catch (err: any) {
      console.error('AccountOverview: Error fetching data:', err);
      setError(err.response?.data?.detail || 'Failed to fetch account details');
    } finally {
      setIsLoading(false);
    }
  };

  // Format currency with commas and 2 decimal places
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Format percentage with 1 decimal place
  const formatPercentage = (value: number | null | undefined): string => {
    if (value === null || value === undefined) {
      return 'N/A';
    }
    return `${value.toFixed(1)}%`;
  };

  // Format date only
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Get fund risk rating for display
  const getFundRiskRating = (fundId: number, fundsMap: Map<number, any>): string => {
    const fund = Array.from(fundsMap.values()).find(fund => fund.id === fundId);
    if (fund && fund.risk_factor !== undefined && fund.risk_factor !== null) {
      return fund.risk_factor.toString();
    }
    return 'N/A';
  };

  // Add function to handle account deletion
  const handleDeleteAccount = async () => {
    if (!accountId) return;
    
    setIsDeleting(true);
    setDeleteError(null);
    
    try {
      // Delete account and related data
      await api.delete(`/client_products/${accountId}`);
      
      // Navigate back to accounts list
      navigate('/products', { 
        state: { 
          notification: {
            type: 'success',
            message: 'Product deleted successfully'
          }
        }
      });
    } catch (err: any) {
      console.error('Error deleting account:', err);
      setDeleteError(err.response?.data?.detail || 'Failed to delete account');
      setIsDeleting(false);
    }
  };

  // Add delete confirmation modal component
  const DeleteConfirmationModal = () => {
    if (!isDeleteModalOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-md w-full p-6">
          <div className="flex items-start">
            <div className="flex-shrink-0 text-red-600">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-medium text-gray-900">Delete Account</h3>
              <div className="mt-2">
                <p className="text-sm text-gray-500">
                  Are you sure you want to delete this account? This action cannot be undone.
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
              onClick={handleDeleteAccount}
              className={`inline-flex justify-center px-4 py-2 text-sm font-medium text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 ${
                isDeleting ? 'bg-red-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {isDeleting ? 'Deleting...' : 'Delete Account'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-16">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600"></div>
      </div>
    );
  }

  if (error || !account) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4 mt-8">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-red-700 text-base">
              {error || 'Failed to load account details. Please try again later.'}
            </p>
            <button
              onClick={() => navigate('/products')}
              className="mt-2 text-red-700 underline"
            >
              Return to Products
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <DeleteConfirmationModal />
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Account Overview</h2>
        
        {/* Fund Summary Table */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <h3 className="text-lg font-semibold">Fund Summary</h3>
          </div>
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full table-fixed divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Fund Name</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">ISIN Number</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Latest Valuation</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Weighting</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Risk Factor</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold">Last IRR</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {holdings.length > 0 ? (
                  holdings.map((holding) => (
                    <tr key={holding.id} className="hover:bg-indigo-50 transition-colors duration-150">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{holding.fund_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{holding.isin_number || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{holding.market_value ? formatCurrency(holding.market_value) : 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{formatPercentage(holding.target_weighting ? parseFloat(holding.target_weighting.toString()) : null)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">{getFundRiskRating(holding.fund_id || 0, fundsData)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {holding.irr !== undefined && holding.irr !== null ? (
                          <span className={`${holding.irr >= 0 ? 'text-green-700' : 'text-red-700'} font-medium`}>
                            {formatPercentage(holding.irr)}
                            <span className="ml-1">{holding.irr >= 0 ? '▲' : '▼'}</span>
                          </span>
                        ) : (
                          <span className="text-gray-500">N/A</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                      No funds found for this account.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Danger Zone */}
        <div className="p-3 mt-2 border-t border-gray-200">
          <div className="flex justify-between items-center p-2 border border-red-200 rounded-md bg-red-50 shadow-sm">
            <div className="flex items-center">
              <div className="flex-shrink-0 h-5 w-5 rounded-md bg-red-100 flex items-center justify-center mr-2">
                <svg className="h-3 w-3 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <span className="text-sm font-medium text-red-700 my-auto">Danger Zone</span>
            </div>
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(true)}
              className="inline-flex items-center px-3 py-1.5 border border-red-300 text-xs font-medium rounded text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200 shadow-sm"
            >
              <svg className="h-3 w-3 mr-1 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default AccountOverview;