import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { calculatePortfolioIRR } from '../services/api';
import { isCashFund } from '../utils/fundUtils';

interface Portfolio {
  id: number;
  portfolio_name: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

interface PortfolioFund {
  id: number;
  portfolio_id: number;
  available_funds_id: number;
  target_weighting: number;
  amount_invested: number;
  start_date: string;
  end_date: string | null;
  fund_details?: Fund;
}

interface Fund {
  id: number;
  fund_name: string;
  status: string;
  isin_number: string;
}

interface Product {
  id: number;
  product_name: string;
  product_type: string;
  status: string;
  available_providers_id: number;
}

interface PortfolioAssignment {
  id: number;
  client_product_id: number;
  portfolio_id: number;
  status: string;
  start_date: string;
  end_date?: string;
  account_name?: string;
  product_name?: string;
  client_name?: string;
  product?: Product;
}

interface IrrCalculationDetail {
  portfolio_fund_id: number;
  status: 'calculated' | 'skipped' | 'error';
  message: string;
  irr_value?: number;
  existing_irr?: number;
  date_info?: string;
}

interface IrrCalculationResult {
  portfolio_id: number;
  calculation_date: string;
  total_funds: number;
  successful: number;
  skipped: number;
  failed: number;
  details: IrrCalculationDetail[];
}

const PortfolioDetails: React.FC = () => {
  const { portfolioId } = useParams<{ portfolioId: string }>();
  const navigate = useNavigate();
  const { api } = useAuth();
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [portfolioFunds, setPortfolioFunds] = useState<PortfolioFund[]>([]);
  const [assignedAccounts, setAssignedAccounts] = useState<PortfolioAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isCalculatingIRR, setIsCalculatingIRR] = useState(false);
  const [calculationResult, setCalculationResult] = useState<IrrCalculationResult | null>(null);

  useEffect(() => {
    fetchPortfolio();
  }, [portfolioId]);

  useEffect(() => {
    if (portfolioId) {
      fetchPortfolioFunds();
      fetchAssignedAccounts();
    }
  }, [portfolioId]);

  const fetchPortfolioFunds = async () => {
    try {
      const response = await api.get(`/portfolio_funds`, {
        params: { portfolio_id: portfolioId }
      });
      
      const fundsWithDetails = await Promise.all(
        response.data.map(async (portfolioFund: PortfolioFund) => {
          try {
            // Fetch fund details for each portfolio fund
            const fundResponse = await api.get(`/funds/${portfolioFund.available_funds_id}`);
            return {
              ...portfolioFund,
              fund_details: fundResponse.data
            };
            } catch (err) {
            console.error(`Error fetching fund ${portfolioFund.available_funds_id}:`, err);
            return {
              ...portfolioFund,
              fund_details: {
                id: portfolioFund.available_funds_id,
                fund_name: `Unknown Fund (ID: ${portfolioFund.available_funds_id})`,
                status: 'unknown',
                isin_number: ''
              }
              };
            }
          })
        );
        
      setPortfolioFunds(fundsWithDetails);
    } catch (err: any) {
      console.error('Error fetching portfolio funds:', err);
      setPortfolioFunds([]);
    }
  };

  const fetchAssignedAccounts = async () => {
    try {
      try {
        // First try the dedicated endpoint
        const response = await api.get(`/portfolios/${portfolioId}/assigned_accounts`);
        
        if (response.data && response.data.length > 0) {
          const accountsWithDetails = await Promise.all(
            response.data.map(async (assignment: any) => {
              try {
                // Fetch account details
                const accountResponse = await api.get(`/client_products/${assignment.client_product_id}`);
                const account = accountResponse.data;
                
                // Fetch client details
                const clientResponse = await api.get(`/client_groups/${account.client_id}`);
                const client = clientResponse.data;
                
                // Fetch product details
                const productResponse = await api.get(`/available_products/${account.available_products_id}`);
                const product = productResponse.data;
                
                return {
                  ...assignment,
                  account_name: account.account_name,
                  client_name: client.name,
                  product: product
                };
              } catch (err) {
                console.error(`Error fetching details for account ${assignment.client_product_id}:`, err);
                return {
                  ...assignment,
                  account_name: `Account ${assignment.client_product_id}`,
                  client_name: 'Unknown Client'
                };
              }
            })
          );
          
          setAssignedAccounts(accountsWithDetails);
        } else {
          setAssignedAccounts([]);
        }
      } catch (err: any) {
        // If the endpoint fails with a 500 error, we'll use an alternative approach
        console.error('Error fetching assigned accounts from endpoint:', err);
        
        try {
          // Attempt to find assignments using the product_portfolio_assignments endpoint
          const response = await api.get('/product_portfolio_assignments', {
            params: {
                portfolio_id: portfolioId,
                active_only: true
            }
          });
          
          if (response.data && response.data.length > 0) {
            const accountsWithDetails = await Promise.all(
              response.data.map(async (assignment: any) => {
                try {
                  // Fetch account details
                  const accountResponse = await api.get(`/client_products/${assignment.client_product_id}`);
                  const account = accountResponse.data;
                  
                  // Fetch client details
                  const clientResponse = await api.get(`/client_groups/${account.client_id}`);
                  const client = clientResponse.data;
                  
                  // Fetch product details
                  const productResponse = await api.get(`/available_products/${account.available_products_id}`);
                  const product = productResponse.data;
                  
                  return {
                    ...assignment,
                    account_name: account.account_name,
                    client_name: client.name,
                    product: product
                  };
                } catch (err) {
                  console.error(`Error fetching details for account ${assignment.client_product_id}:`, err);
                  return {
                    ...assignment,
                    account_name: `Account ${assignment.client_product_id}`,
                    client_name: 'Unknown Client'
                  };
                }
              })
            );
            
            setAssignedAccounts(accountsWithDetails);
          } else {
            setAssignedAccounts([]);
          }
        } catch (fallbackErr) {
          console.error('Error fetching from fallback endpoint:', fallbackErr);
          setAssignedAccounts([]);
        }
      }
    } catch (err: any) {
      console.error('Error in fetchAssignedAccounts:', err);
      // Don't show error to user, just set empty array
      setAssignedAccounts([]);
    }
  };

  const fetchPortfolio = async () => {
    try {
      setIsLoading(true);
      const response = await api.get(`/portfolios/${portfolioId}`);
      setPortfolio(response.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch portfolio details');
      console.error('Error fetching portfolio details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const handleBack = () => {
    navigate('/portfolios');
  };

  const handleEdit = () => {
    navigate(`/portfolios/${portfolioId}/edit`);
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  const handleConfirmDelete = async () => {
    try {
      setIsDeleting(true);
      await api.delete(`/portfolios/${portfolioId}`);
      navigate('/portfolios', { replace: true });
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Failed to delete portfolio';
      setError(errorMessage);
      console.error('Error deleting portfolio:', err);
      setShowDeleteConfirm(false);
      // Display the error for a few seconds
      setTimeout(() => {
        setError(null);
      }, 5000);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCalculateIRR = async () => {
    if (!portfolioId) return;
    
    try {
      setIsCalculatingIRR(true);
      setCalculationResult(null);
      
      const response = await calculatePortfolioIRR(parseInt(portfolioId));
      setCalculationResult(response.data);
      
      // Refresh the data to show updated IRR values
      fetchPortfolioFunds();
    } catch (err: any) {
      console.error('Error calculating IRR:', err);
      const errorMessage = err.response?.data?.detail || 'Failed to calculate IRR values';
      alert(`Error: ${errorMessage}`);
    } finally {
      setIsCalculatingIRR(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  if (!portfolio) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
          {error || 'Portfolio not found'}
        </div>
        <div className="mt-4">
          <button
            onClick={handleBack}
            className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            Back to Portfolios
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-normal text-gray-900 font-sans tracking-wide">{portfolio?.portfolio_name || 'Portfolio'}</h1>
        <div className="flex gap-2">
          <button
            onClick={handleBack}
            className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            Back
          </button>
          <button
            onClick={handleEdit}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Edit
          </button>
          <button
            onClick={handleDeleteClick}
            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            Delete
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
        <div className="px-4 py-5 sm:px-6 bg-gray-50">
          <h2 className="text-lg font-medium text-gray-900">Portfolio Details</h2>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
          <div>
              <dt className="text-sm font-medium text-gray-500">Name</dt>
              <dd className="mt-1 text-sm text-gray-900">{portfolio.portfolio_name}</dd>
          </div>
          <div>
              <dt className="text-sm font-medium text-gray-500">Status</dt>
              <dd className="mt-1 text-sm text-gray-900">
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                  portfolio.status === 'active' ? 'bg-green-100 text-green-800' :
                  portfolio.status === 'inactive' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {portfolio.status}
                </span>
              </dd>
          </div>
            {assignedAccounts.length > 0 && (
          <div>
                <dt className="text-sm font-medium text-gray-500">Linked Product</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  <Link 
                    to={{
                      pathname: `/products/${assignedAccounts[0].client_product_id}`,
                      search: `?from=${encodeURIComponent('portfolio-details')}&portfolioId=${portfolioId}&portfolioName=${encodeURIComponent(portfolio?.portfolio_name || 'Portfolio Details')}`
                    }}
                    className="text-indigo-600 hover:text-indigo-900"
                  >
                    {assignedAccounts[0].product_name || `Product ${assignedAccounts[0].client_product_id}`}
                    {assignedAccounts[0].client_name && ` (${assignedAccounts[0].client_name})`}
                  </Link>
                </dd>
          </div>
            )}
          <div>
              <dt className="text-sm font-medium text-gray-500">Start Date</dt>
              <dd className="mt-1 text-sm text-gray-900">{formatDate(portfolio.start_date)}</dd>
          </div>
          <div>
              <dt className="text-sm font-medium text-gray-500">End Date</dt>
              <dd className="mt-1 text-sm text-gray-900">{formatDate(portfolio.end_date)}</dd>
            </div>
          </dl>
          </div>
        </div>

      {/* Funds Section */}
      <div className="mt-8">
        <div className="flex flex-row justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold">Portfolio Funds</h2>
          <div className="flex space-x-2">
            <button 
              onClick={handleCalculateIRR}
              disabled={isCalculatingIRR}
              className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isCalculatingIRR ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Calculating...
                </>
              ) : (
                'Calculate Latest IRRs'
              )}
            </button>
            <button
              onClick={handleBack}
              className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Back
            </button>
            <button
              onClick={handleEdit}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Edit
            </button>
            <button
              onClick={handleDeleteClick}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              Delete
            </button>
          </div>
        </div>
        
        {calculationResult && (
          <div className={`px-4 py-3 rounded-md mb-4 ${
            calculationResult.failed > 0 ? 'bg-yellow-100 border border-yellow-400' : 'bg-green-100 border border-green-400'
          }`}>
            <p className="text-sm font-medium">
              IRR calculation complete for {calculationResult.total_funds} funds on {new Date(calculationResult.calculation_date).toLocaleDateString()}.
              {calculationResult.successful > 0 && ` Successfully calculated ${calculationResult.successful} new IRR values.`}
              {calculationResult.skipped > 0 && ` Skipped ${calculationResult.skipped} funds with existing IRR values.`}
              {calculationResult.failed > 0 && ` Failed to calculate ${calculationResult.failed} IRR values.`}
            </p>
            
            {/* Display detailed errors for failed calculations */}
            {calculationResult.failed > 0 && (
              <div className="mt-2 text-sm">
                <p className="font-medium text-red-700">Error details:</p>
                <ul className="list-disc pl-5 mt-1 space-y-1">
                  {calculationResult.details
                    .filter((detail: IrrCalculationDetail) => detail.status === 'error')
                    .map((detail: IrrCalculationDetail, index: number) => (
                      <li key={index} className="text-red-700">
                        <span className="font-medium">Fund ID {detail.portfolio_fund_id}:</span> {detail.message}
                        {detail.date_info && <span className="block mt-1 text-xs"> ({detail.date_info})</span>}
                      </li>
                    ))}
                </ul>
              </div>
            )}
          </div>
        )}
        
          {portfolioFunds.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fund Name
                      </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Weighting (%)
                      </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Value (£)
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Start Date
                    </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                  {portfolioFunds.map((portfolioFund) => {
                    // Check if this is the cash fund
                    const isCash = portfolioFund.fund_details && isCashFund(portfolioFund.fund_details);
                    
                    return (
                      <tr 
                        key={portfolioFund.id} 
                        className={isCash ? 'cash-fund' : ''}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {isCash && <span className="cash-badge">Cash</span>}
                          {portfolioFund.fund_details?.fund_name || `Fund ${portfolioFund.available_funds_id}`}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {portfolioFund.target_weighting.toFixed(2)}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {portfolioFund.amount_invested !== null && portfolioFund.amount_invested !== undefined 
                            ? `£${portfolioFund.amount_invested.toLocaleString('en-UK', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`
                            : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            portfolioFund.fund_details?.status === 'active' ? 'bg-green-100 text-green-800' :
                            portfolioFund.fund_details?.status === 'inactive' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {portfolioFund.fund_details?.status || 'unknown'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(portfolioFund.start_date)}
                        </td>
                      </tr>
                    );
                  })}
                  </tbody>
                </table>
              </div>
          ) : (
            <div className="px-6 py-4 text-sm text-gray-500">
              No funds are associated with this portfolio.
            </div>
            )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed z-10 inset-0 overflow-y-auto" aria-labelledby="modal-title" role="dialog">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div>
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                  <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="mt-3 text-center sm:mt-5">
                  <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                    Delete Portfolio
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
              Are you sure you want to delete this portfolio? This action cannot be undone.
                      {assignedAccounts.length > 0 && (
                        <span className="block mt-2 text-red-600 font-semibold">
                          Warning: This portfolio is currently assigned to {assignedAccounts.length} account(s).
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:col-start-2 sm:text-sm"
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              <button
                  type="button"
                onClick={handleCancelDelete}
                disabled={isDeleting}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:col-start-1 sm:text-sm"
              >
                Cancel
              </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PortfolioDetails;
