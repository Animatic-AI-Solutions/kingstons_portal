import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getProviderColor } from '../services/providerColors';
import { getClientGroupFUMById, getClientGroupIRR, getProductFUM, getProductIRR } from '../services/api';

// Enhanced TypeScript interfaces
interface Client {
  id: string;
  name: string | null;
  status: string;
  advisor: string | null;
  type: string | null;
  created_at: string;
  updated_at: string;
  age?: number;
  gender?: string;
}

interface ClientFormData {
  name: string | null;
  status: string;
  advisor: string | null;
  type: string | null;
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
  product_owners?: ProductOwner[];
}

// Add ProductOwner interface
interface ProductOwner {
  id: number;
  name: string;
  status: string;
  created_at: string;
}

// Add interface for ProductFund
interface ProductFund {
  id: number;
  fund_name: string;
  isin_number?: string;
  amount_invested?: number;
  market_value?: number;
  investments?: number;
  withdrawals?: number;
  switch_in?: number;
  switch_out?: number;
  irr?: number;
  status?: string;
  is_virtual_entry?: boolean;
  inactive_fund_count?: number;
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
      <Link to="/client_groups" className="absolute left-4 top-4 text-primary-700 hover:text-primary-800 transition-colors duration-200">
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
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
                  Status: <span className={`px-2 py-0.5 text-xs leading-5 font-semibold rounded-full ${
                    client.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>{client.status}</span>
                </div>
                <div className="text-base text-gray-600 font-sans tracking-wide">
                  Type: {client.type || 'Family'}
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

// Product Card Component
const ProductCard: React.FC<{ 
  account: ClientAccount;
  isExpanded: boolean;
  onToggleExpand: () => void; 
  funds: ProductFund[];
  isLoadingFunds: boolean;
}> = ({ 
  account, 
  isExpanded, 
  onToggleExpand, 
  funds, 
  isLoadingFunds 
}) => {
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
    template_info: account.template_info,
    fum: account.total_value,
    irr: account.irr
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

  // Format number as currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Format percentage with 2 decimal places
  const formatPercentage = (value: number): string => {
    return `${(value).toFixed(2)}%`;
  };

  // Calculate total market value from funds if available
  const totalFundValue = useMemo(() => {
    if (funds && funds.length > 0) {
      return funds.filter(fund => !fund.is_virtual_entry).reduce((sum, fund) => sum + (fund.market_value || 0), 0);
    }
    return null;
  }, [funds]);

  // Use either the calculated fund total or the API-provided total_value
  const displayValue = totalFundValue !== null && totalFundValue > 0 
    ? totalFundValue 
    : (account.total_value || 0);

  return (
    <div 
      className="block bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden"
      style={styles.cardStyle}
    >
      {/* Main Content */}
      <div 
        className="block p-4 cursor-pointer"
        onClick={() => window.location.href = `/products/${account.id}/overview`}
      >
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
              {formatCurrency(displayValue)}
            </div>
            {account.irr !== undefined && (
              <div className="flex items-center justify-end mt-1">
                <span className={`text-sm font-medium ${
                  account.irr >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatPercentage(account.irr)}
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
          <div className="flex items-center flex-wrap">
            {account.risk_rating && (
              <div className="flex items-center mr-3">
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
            
            {/* Product Owners */}
            {account.product_owners && account.product_owners.length > 0 && (
              <div className="flex items-center ml-2">
                <span className="text-sm font-medium text-gray-500 mr-1">
                  Owner{account.product_owners.length > 1 ? 's' : ''}:
                </span>
                <div className="flex flex-wrap gap-1">
                  {account.product_owners.map(owner => (
                    <span 
                      key={owner.id}
                      className="px-2 py-0.5 text-xs font-medium rounded-full"
                      style={{ 
                        backgroundColor: `${themeColor}15`, 
                        color: themeColor
                      }}
                    >
                      {owner.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleExpand();
              }}
              className="inline-flex items-center text-xs font-medium text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-200"
            >
              {isExpanded ? (
                <>
                  <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                  Hide Details
                </>
              ) : (
                <>
                  <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                  Show Details
                </>
              )}
            </button>
          </div>
          <div className="flex items-center">
            <Link
              to={`/products/${account.id}/irr-calculation`}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center mr-3 px-2 py-0.5 text-xs font-medium text-white bg-primary-700 rounded-lg shadow-sm hover:bg-primary-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-700 transition-all duration-200"
              style={{ backgroundColor: themeColor }}
            >
              Complete IRR
            </Link>
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
      
      {/* Expandable Fund Table */}
      {isExpanded && (
        <div className="px-4 pb-4">
          {isLoadingFunds ? (
            <div className="py-4 text-center text-sm text-gray-500">
              Loading fund details...
            </div>
          ) : funds.length === 0 ? (
            <div className="py-4 text-center text-sm text-gray-500">
              No fund details available for this product.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200 mt-2">
              <table className="min-w-full divide-y divide-gray-200 text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fund</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Investments</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Withdrawals</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Fund Switch In</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Fund Switch Out</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Product Switch</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Current Valuation</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Most Recent IRR</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {funds.map((fund) => (
                    <tr 
                      key={fund.id} 
                      className={`${fund.is_virtual_entry ? 'bg-gray-50' : 'hover:bg-gray-50'}`}
                    >
                      <td className="px-3 py-2 whitespace-nowrap text-xs font-medium text-gray-900">
                        {fund.is_virtual_entry ? (
                          <div className="flex items-center">
                            <span>{fund.fund_name.split('(')[0]}</span>
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              {fund.inactive_fund_count}
                            </span>
                          </div>
                        ) : (
                          fund.fund_name
                        )}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-right">{formatCurrency(fund.investments || 0)}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-right">{formatCurrency(fund.withdrawals || 0)}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-right">{formatCurrency(fund.switch_in || 0)}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-right">{formatCurrency(fund.switch_out || 0)}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-right">-</td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-right">{formatCurrency(fund.market_value || 0)}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-right">
                        {fund.irr !== undefined ? formatPercentage(fund.irr) : '-'}
                      </td>
                    </tr>
                  ))}
                  
                  {/* Totals row */}
                  <tr className="bg-gray-50 font-medium">
                    <td className="px-3 py-2 whitespace-nowrap text-xs font-medium text-gray-900">TOTAL</td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs font-medium text-right">
                      {formatCurrency(funds.filter(fund => !fund.is_virtual_entry).reduce((sum, fund) => sum + (fund.investments || 0), 0))}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs font-medium text-right">
                      {formatCurrency(funds.filter(fund => !fund.is_virtual_entry).reduce((sum, fund) => sum + (fund.withdrawals || 0), 0))}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs font-medium text-right">
                      {formatCurrency(funds.filter(fund => !fund.is_virtual_entry).reduce((sum, fund) => sum + (fund.switch_in || 0), 0))}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs font-medium text-right">
                      {formatCurrency(funds.filter(fund => !fund.is_virtual_entry).reduce((sum, fund) => sum + (fund.switch_out || 0), 0))}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs font-medium text-right">-</td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs font-medium text-right">
                      {formatCurrency(funds.filter(fund => !fund.is_virtual_entry).reduce((sum, fund) => sum + (fund.market_value || 0), 0))}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs font-medium text-right">-</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
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
    name: null,
    status: 'active',
    advisor: null,
    type: null
  });
  
  // Create the ref to store FUM value from the database view
  const clientFUMFromView = useRef<number | null>(null);
  // Create a ref to store IRR value from the database calculation
  const clientIRRFromAPI = useRef<number | null>(null);
  
  // State for expanded product cards
  const [expandedProducts, setExpandedProducts] = useState<number[]>([]);
  const [expandedProductFunds, setExpandedProductFunds] = useState<Record<number, ProductFund[]>>({});
  const [isLoadingFunds, setIsLoadingFunds] = useState<Record<number, boolean>>({});

  // Toggle expanded state for a product
  const toggleProductExpand = async (accountId: number) => {
    if (expandedProducts.includes(accountId)) {
      // Collapse the product
      setExpandedProducts(expandedProducts.filter(id => id !== accountId));
    } else {
      // Expand the product and load its funds
      setExpandedProducts([...expandedProducts, accountId]);
      
      // If we haven't already loaded this product's fund data
      if (!expandedProductFunds[accountId]) {
        await fetchProductFunds(accountId);
      }
    }
  };

  // Fetch fund details and activities for a product
  const fetchProductFunds = async (accountId: number) => {
    try {
      // Mark as loading
      setIsLoadingFunds(prev => ({ ...prev, [accountId]: true }));
      
      // Get the account
      const account = clientAccounts.find(acc => acc.id === accountId);
      if (!account || !account.portfolio_id) {
        console.error(`No portfolio ID found for account ${accountId}`);
        setExpandedProductFunds(prev => ({ ...prev, [accountId]: [] }));
        setIsLoadingFunds(prev => ({ ...prev, [accountId]: false }));
        return;
      }
      
      // Get the portfolio funds
      const [portfolioFundsResponse, fundsResponse] = await Promise.all([
        api.get(`/portfolio_funds?portfolio_id=${account.portfolio_id}`),
        api.get('/funds')
      ]);
      
      // Create a map of funds for quick lookups
      interface Fund {
        id: number;
        fund_name: string;
        isin_number: string;
        [key: string]: any;
      }
      
      const fundsMap = new Map<number, Fund>(
        fundsResponse.data.map((fund: Fund) => [fund.id, fund])
      );
      
      // Get fund details with portfolio info
      const portfolioFunds = portfolioFundsResponse.data;
      
      // Separate active and inactive funds
      const activeFunds = portfolioFunds.filter((pf: any) => pf.status === 'active');
      const inactiveFunds = portfolioFunds.filter((pf: any) => pf.status !== 'active');
      
      console.log(`Product ${accountId}: Found ${activeFunds.length} active funds and ${inactiveFunds.length} inactive funds`);
      
      // Process active funds
      const activeFundsWithActivities = await Promise.all(
        activeFunds.map(async (pf: any) => {
          // Get all activity logs for this fund - no date restrictions for all-time data
          const activitiesResponse = await api.get('/holding_activity_logs', {
            params: { portfolio_fund_id: pf.id }
          });
          
          const activities = activitiesResponse.data || [];
          
          // Calculate activity totals by type
          const investments = activities
            .filter((activity: any) => 
              activity.activity_type === 'Investment' || 
              activity.activity_type === 'RegularInvestment' || 
              activity.activity_type === 'GovernmentUplift')
            .reduce((sum: number, activity: any) => sum + Math.abs(activity.amount), 0);
            
          const withdrawals = activities
            .filter((activity: any) => activity.activity_type === 'Withdrawal')
            .reduce((sum: number, activity: any) => sum + Math.abs(activity.amount), 0);
            
          const switchIn = activities
            .filter((activity: any) => activity.activity_type === 'SwitchIn')
            .reduce((sum: number, activity: any) => sum + Math.abs(activity.amount), 0);
            
          const switchOut = activities
            .filter((activity: any) => activity.activity_type === 'SwitchOut')
            .reduce((sum: number, activity: any) => sum + Math.abs(activity.amount), 0);
            
          // Get latest valuation
          let marketValue = pf.market_value || 0;
          try {
            const valuationResponse = await api.get(`/fund_valuations/latest/${pf.id}`);
            if (valuationResponse.data && valuationResponse.data.value) {
              marketValue = valuationResponse.data.value;
              console.log(`Fund ${pf.id} latest valuation: ${marketValue}`);
            }
          } catch (err) {
            console.warn(`Failed to fetch valuation for fund ${pf.id}`, err);
          }
            
          // Try to get latest IRR
          let irrValue;
          try {
            const irrResponse = await api.get(`/portfolio_funds/${pf.id}/latest-irr`);
            irrValue = irrResponse.data?.irr;
          } catch (err) {
            console.warn(`Failed to fetch IRR for fund ${pf.id}`, err);
          }
          
          // Get fund details
          const fund = fundsMap.get(pf.available_funds_id);
          
          return {
            id: pf.id,
            fund_name: fund?.fund_name || 'Unknown Fund',
            isin_number: fund?.isin_number || 'N/A',
            amount_invested: pf.amount_invested || 0,
            market_value: marketValue,
            investments,
            withdrawals,
            switch_in: switchIn,
            switch_out: switchOut,
            irr: irrValue,
            status: 'active'
          };
        })
      );
      
      // Handle inactive funds if they exist
      let allFunds: ProductFund[] = [...activeFundsWithActivities];
      
      if (inactiveFunds.length > 0) {
        // Process inactive funds
        const inactiveFundsData = await Promise.all(
          inactiveFunds.map(async (pf: any) => {
            // Get basic fund data
            const fund = fundsMap.get(pf.available_funds_id);
            
            // Get all activity logs for this fund
            const activitiesResponse = await api.get('/holding_activity_logs', {
              params: { portfolio_fund_id: pf.id }
            });
            
            const activities = activitiesResponse.data || [];
            
            // Calculate activity totals by type
            const investments = activities
              .filter((activity: any) => 
                activity.activity_type === 'Investment' || 
                activity.activity_type === 'RegularInvestment' || 
                activity.activity_type === 'GovernmentUplift')
              .reduce((sum: number, activity: any) => sum + Math.abs(activity.amount), 0);
              
            const withdrawals = activities
              .filter((activity: any) => activity.activity_type === 'Withdrawal')
              .reduce((sum: number, activity: any) => sum + Math.abs(activity.amount), 0);
              
            const switchIn = activities
              .filter((activity: any) => activity.activity_type === 'SwitchIn')
              .reduce((sum: number, activity: any) => sum + Math.abs(activity.amount), 0);
              
            const switchOut = activities
              .filter((activity: any) => activity.activity_type === 'SwitchOut')
              .reduce((sum: number, activity: any) => sum + Math.abs(activity.amount), 0);
              
            // Get latest valuation
            let marketValue = pf.market_value || 0;
            try {
              const valuationResponse = await api.get(`/fund_valuations/latest/${pf.id}`);
              if (valuationResponse.data && valuationResponse.data.value) {
                marketValue = valuationResponse.data.value;
              }
            } catch (err) {
              console.warn(`Failed to fetch valuation for inactive fund ${pf.id}`, err);
            }
            
            return {
              id: pf.id,
              fund_name: fund?.fund_name || 'Unknown Fund',
              isin_number: fund?.isin_number || 'N/A',
              amount_invested: pf.amount_invested || 0,
              market_value: marketValue,
              investments,
              withdrawals,
              switch_in: switchIn,
              switch_out: switchOut,
              status: 'inactive'
            };
          })
        );
        
        // Create aggregated "Previous Funds" entry
        if (inactiveFundsData.length > 0) {
          const totalInvestments = inactiveFundsData.reduce((sum, fund) => sum + (fund.investments || 0), 0);
          const totalWithdrawals = inactiveFundsData.reduce((sum, fund) => sum + (fund.withdrawals || 0), 0);
          const totalSwitchIn = inactiveFundsData.reduce((sum, fund) => sum + (fund.switch_in || 0), 0);
          const totalSwitchOut = inactiveFundsData.reduce((sum, fund) => sum + (fund.switch_out || 0), 0);
          const totalMarketValue = inactiveFundsData.reduce((sum, fund) => sum + (fund.market_value || 0), 0);
          
          // Add the "Previous Funds" virtual entry to the list of funds
          allFunds.push({
            id: -1, // Virtual ID for the aggregated entry
            fund_name: `Previous Funds (${inactiveFundsData.length})`,
            isin_number: 'Multiple',
            amount_invested: 0,
            market_value: totalMarketValue,
            investments: totalInvestments,
            withdrawals: totalWithdrawals,
            switch_in: totalSwitchIn,
            switch_out: totalSwitchOut,
            is_virtual_entry: true,
            inactive_fund_count: inactiveFundsData.length,
            status: 'inactive'
          });
          
          console.log(`Created Previous Funds entry for ${inactiveFundsData.length} inactive funds with total value: ${totalMarketValue}`);
        }
      }
      
      // Store the combined funds data
      setExpandedProductFunds(prev => ({ ...prev, [accountId]: allFunds }));
    } catch (err) {
      console.error(`Error fetching fund details for account ${accountId}:`, err);
      setExpandedProductFunds(prev => ({ ...prev, [accountId]: [] }));
    } finally {
      setIsLoadingFunds(prev => ({ ...prev, [accountId]: false }));
    }
  };
  
  // Set all products to be expanded when clientAccounts are updated
  useEffect(() => {
    if (clientAccounts.length > 0) {
      // Get all account IDs
      const allAccountIds = clientAccounts.map(account => account.id);
      
      // Set expanded products state
      setExpandedProducts(allAccountIds);
      
      // Load fund data for any cards that don't have it yet
      allAccountIds.forEach(accountId => {
        if (!expandedProductFunds[accountId]) {
          fetchProductFunds(accountId);
        }
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientAccounts, expandedProductFunds]);

  // Calculate totals with memoization for performance
  const { totalFundsUnderManagement, totalIRR } = useMemo(() => {
    // If we have the FUM directly from the database view, use that value
    const totalFunds = clientFUMFromView.current !== null 
      ? clientFUMFromView.current 
      : clientAccounts.reduce((sum, account) => sum + (account.total_value || 0), 0);
      
    // Debug logs for total value calculation
    console.log("FUNDS DEBUGGING - Total value calculation:");
    console.log("Client accounts:", clientAccounts);
    console.log("Client accounts with total_value:", clientAccounts.map(acc => ({ 
      id: acc.id, 
      product_name: acc.product_name, 
      total_value: acc.total_value,
      irr: acc.irr
    })));
    console.log("FUM from view:", clientFUMFromView.current);
    console.log("Calculated totalFunds:", totalFunds);
    
    // If we have the IRR directly from the API, use that value
    let finalIRR = clientIRRFromAPI.current;
    
    // Only calculate weighted IRR if we don't have it from the API
    if (finalIRR === null) {
      // Calculate weighted IRR from client accounts
      let totalWeightedIRR = 0;
      let totalWeight = 0;
      
      // Add array to store calculation steps for debugging
      interface IrrCalcStep {
        id: number;
        product_name: string;
        irr: number;
        total_value: number;
        weighted_contribution: number;
      }
      
      const irrCalcSteps: IrrCalcStep[] = [];
      
      clientAccounts.forEach(account => {
        if (account.irr !== undefined && account.total_value) {
          const weightedIrrContribution = account.irr * account.total_value;
          totalWeightedIRR += weightedIrrContribution;
          totalWeight += account.total_value;
          
          // Record the calculation step
          irrCalcSteps.push({
            id: account.id,
            product_name: account.product_name,
            irr: account.irr,
            total_value: account.total_value,
            weighted_contribution: weightedIrrContribution
          });
        }
      });
      
      // Debug logs for IRR calculation
      console.log("IRR DEBUGGING - Weighted IRR calculation:");
      console.log("IRR from API:", clientIRRFromAPI.current);
      console.log("IRR Calculation steps:", irrCalcSteps);
      console.log("Total weighted IRR contribution:", totalWeightedIRR);
      console.log("Total weight (sum of total_value):", totalWeight);
      
      finalIRR = totalWeight > 0 ? totalWeightedIRR / totalWeight : 0;
      console.log("Final calculated average IRR:", finalIRR);
    } else {
      console.log("Using IRR from API:", finalIRR);
    }
    
    return {
      totalFundsUnderManagement: totalFunds,
      totalIRR: finalIRR || 0
    };
  }, [clientAccounts, clientFUMFromView.current, clientIRRFromAPI.current]);

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
      const clientResponse = await api.get(`/client_groups/${clientId}`);
      console.log("Client data received:", clientResponse.data);
      setClient(clientResponse.data);
      
      // Fetch FUM summary data for this client group directly from the DB view
      try {
        const fumResponse = await getClientGroupFUMById(Number(clientId));
        console.log("Client group FUM summary:", fumResponse.data);
        if (fumResponse.data && fumResponse.data.fum) {
          // Store the FUM value directly to override calculated value from products
          const fumValue = parseFloat(fumResponse.data.fum);
          console.log("Setting client group FUM value:", fumValue);
          // We'll use this later to override the calculated value
          clientFUMFromView.current = fumValue;
        }
      } catch (fumErr) {
        console.error("Error fetching client group FUM summary:", fumErr);
      }
      
      // Fetch IRR calculation for this client group
      try {
        const irrResponse = await getClientGroupIRR(Number(clientId));
        console.log("Client group IRR calculation:", irrResponse.data);
        if (irrResponse.data && irrResponse.data.irr !== undefined) {
          // Store the IRR value directly to override calculated value from products
          const irrValue = parseFloat(irrResponse.data.irr);
          console.log("Setting client group IRR value:", irrValue);
          // We'll use this later to override the calculated value
          clientIRRFromAPI.current = irrValue;
        }
      } catch (irrErr) {
        console.error("Error fetching client group IRR calculation:", irrErr);
      }
      
      // Fetch client products (was client_accounts previously)
      const accountsResponse = await api.get('/client_products', {
        params: { client_id: clientId }
      });
      
      // Log the raw response to check if data includes total_value and irr
      console.log("DETAILED CLIENT PRODUCTS DATA:", accountsResponse.data);
      
      // Check if products have total_value and irr data directly from API
      const productsWithValues = accountsResponse.data.filter((product: any) => 
        product.total_value !== undefined || product.irr !== undefined
      );
      console.log("Products with total_value or irr directly from API:", productsWithValues);
      
      const accounts = accountsResponse.data || [];
      
      // Enhanced data fetching for accounts - get specific FUM and IRR for each product
      const accountsWithFumAndIRR = await Promise.all(
        accounts.map(async (account: ClientAccount) => {
          try {
            // Log provider and financial data for debugging
            console.log(`Product ${account.id} (${account.product_name}) data:`, {
              provider_id: account.provider_id,
              provider_name: account.provider_name,
              total_value: account.total_value,
              irr: account.irr
            });
            
            // Fetch FUM data for this product
            try {
              const fumResponse = await getProductFUM(account.id);
              console.log(`Product ${account.id} FUM data:`, fumResponse.data);
              if (fumResponse.data && fumResponse.data.fum !== undefined) {
                account.total_value = fumResponse.data.fum;
                console.log(`Updated product ${account.id} total_value to: ${account.total_value}`);
              }
            } catch (fumErr) {
              console.warn(`Failed to fetch FUM for product ${account.id}`, fumErr);
            }
            
            // Fetch IRR data for this product
            try {
              const irrResponse = await getProductIRR(account.id);
              console.log(`Product ${account.id} IRR data:`, irrResponse.data);
              if (irrResponse.data && irrResponse.data.irr !== undefined) {
                account.irr = irrResponse.data.irr;
                console.log(`Updated product ${account.id} IRR to: ${account.irr}`);
              }
            } catch (irrErr) {
              console.warn(`Failed to fetch IRR for product ${account.id}`, irrErr);
            }
            
            // Add product owners for each account
            try {
              // First fetch all product owners
              const productOwnersResponse = await api.get('/product_owners');
              
              if (productOwnersResponse.data && productOwnersResponse.data.length > 0) {
                const productOwners = [];
                
                // For each product owner, check if they own this product
                for (const owner of productOwnersResponse.data) {
                  try {
                    // Get all products for this product owner
                    const ownerProductsResponse = await api.get(`/product_owners/${owner.id}/products`);
                    
                    // Check if this product is in the list of the owner's products
                    const isOwnerOfThisProduct = ownerProductsResponse.data?.some(
                      (p: any) => p.id === account.id
                    );
                    
                    // If this owner owns this product, add it to our list
                    if (isOwnerOfThisProduct) {
                      productOwners.push(owner);
                    }
                  } catch (err) {
                    console.error(`Error checking if owner ${owner.id} has product ${account.id}:`, err);
                  }
                }
                
                account.product_owners = productOwners;
              }
            } catch (ownersErr) {
              console.error(`Error fetching product owners for account ${account.id}:`, ownersErr);
              account.product_owners = [];
            }
            
            return account;
          } catch (err) {
            console.warn(`Error enhancing product data for ${account.id}`, err);
            return account;
          }
        })
      );
      
      console.log("Final client products with FUM and IRR:", accountsWithFumAndIRR);
      console.log("Products with total_value after processing:", accountsWithFumAndIRR.filter(acc => acc.total_value !== undefined).length);
      console.log("Products with IRR after processing:", accountsWithFumAndIRR.filter(acc => acc.irr !== undefined).length);
      
      setClientAccounts(accountsWithFumAndIRR);
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
    navigate('/client_groups');
  };

  const handleMakeDormant = async () => {
    try {
      await api.patch(`/client_groups/${clientId}/status`, { status: 'dormant' });
      // Refresh client data
      fetchClientData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update client status');
      console.error('Error updating client status:', err);
    }
  };

  const handleMakeActive = async () => {
    try {
      await api.patch(`/client_groups/${clientId}/status`, { status: 'active' });
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
      name: client.name,
      status: client.status,
      advisor: client.advisor,
      type: client.type
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
      if (formData.status !== client.status) changedFields.status = formData.status;
      
      // Special handling for advisor which could be null
      if (
        (formData.advisor === '' && client.advisor !== null) || 
        (formData.advisor !== client.advisor && formData.advisor !== '')
      ) {
        changedFields.advisor = formData.advisor === '' ? null : formData.advisor;
      }

      // Handle type field change
      if (formData.type !== client.type) changedFields.type = formData.type;
      
      // Only perform API call if there are changes
      if (Object.keys(changedFields).length > 0) {
        await api.patch(`/client_groups/${clientId}`, changedFields);
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

  const handleDelete = async () => {
    try {
      if (!client) return;
      
      if (window.confirm(`Are you sure you want to delete client ${client.name}? This will also delete all associated products, portfolios, and funds. This action cannot be undone.`)) {
        await api.delete(`/client_groups/${clientId}`);
        navigate('/client_groups', { state: { message: `Client ${client.name} deleted successfully` } });
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete client');
      console.error('Error deleting client:', err);
    }
  };

  // Breadcrumb component
  const Breadcrumbs = () => {
    return (
      <div className="flex items-center space-x-2 text-xs text-gray-500 mb-4">
        <Link to="/client_groups" className="hover:text-gray-700">
          Clients
        </Link>
        <span>/</span>
        <span className="text-gray-900">{client ? `${client.name}` : 'Client Details'}</span>
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
                  <label className="block text-sm font-medium text-gray-700 mb-0.5">Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name || ''}
                    onChange={handleChange}
                    className="block w-full h-10 px-3 py-2 text-base rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 transition-all duration-200"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-0.5">Type</label>
                  <select
                    name="type"
                    value={formData.type || 'Family'}
                    onChange={handleChange}
                    className="block w-full h-10 px-3 py-2 text-base rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 transition-all duration-200"
                  >
                    <option value="Family">Family</option>
                    <option value="Business">Business</option>
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

        {/* Client Products Section */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-normal text-gray-900 font-sans tracking-wide">Client Products</h2>
            
            <Link
              to={`/create-client-group-products?client_id=${clientId}&client_name=${encodeURIComponent(`${client?.name}`)}`}
              className="inline-flex items-center px-4 py-1.5 text-sm font-medium text-white bg-primary-700 rounded-xl shadow-sm hover:bg-primary-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-700 transition-all duration-200"
            >
              <svg className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add New Product
            </Link>
          </div>
          
          {!isLoading ? (
            clientAccounts.length > 0 ? (
              <div className="grid grid-cols-1 gap-4">
                {clientAccounts.map(account => (
                  <ProductCard 
                    key={account.id} 
                    account={account} 
                    isExpanded={expandedProducts.includes(account.id)}
                    onToggleExpand={() => toggleProductExpand(account.id)}
                    funds={expandedProductFunds[account.id] || []}
                    isLoadingFunds={isLoadingFunds[account.id] || false}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-gray-50 p-6 rounded-lg text-center border border-gray-200">
                <div className="text-gray-500 mb-4">No products found for this client.</div>
                <div className="flex justify-center">
                  <Link 
                    to={`/create-client-group-products?client_id=${clientId}&client_name=${encodeURIComponent(`${client?.name}`)}`}
                    className="inline-flex items-center px-4 py-1.5 text-sm font-medium text-white bg-primary-700 rounded-xl shadow-sm hover:bg-primary-800 transition-colors duration-200"
                  >
                    <svg className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add First Product
                  </Link>
                </div>
              </div>
            )
          ) : (
            <div className="text-gray-500 p-6 text-center">Loading client products...</div>
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
          <button
            onClick={handleDelete}
            className="px-4 py-1.5 text-sm font-medium text-white bg-red-600 rounded-xl shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Delete Client
          </button>
        </div>
      </div>
    </>
  );
};

export default ClientDetails;
