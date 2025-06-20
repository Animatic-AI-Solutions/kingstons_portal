import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getProviderColor } from '../services/providerColors';
import { EditButton, ActionButton, LapseButton, DeleteButton, AddButton } from '../components/ui';
import api, { getClientGroupProductOwners, calculateStandardizedMultipleFundsIRR, getProductOwners, addClientGroupProductOwner, removeClientGroupProductOwner } from '../services/api';

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
  product_owners?: ClientProductOwner[];
}

interface ClientProductOwner {
  id: number;
  name: string;
  status: string;
  created_at: string;
  association_id?: number; // ID of the client_group_product_owners record
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
  irr?: number | string;
  risk_rating?: number;
  provider_theme_color?: string;
  template_generation_id?: number;
  template_info?: {
    id: number;
    generation_name: string;
    name?: string;
  };
  product_owners?: ProductOwner[];
  fixed_cost?: number;
  percentage_fee?: number;
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
  product_switch_in?: number;
  product_switch_out?: number;
  irr?: number | string;
  status?: string;
  is_virtual_entry?: boolean;
  inactive_fund_count?: number;
  inactive_fund_ids?: number[]; // For Previous Funds entry
}

// Component for calculating Previous Funds IRR
const PreviousFundsIRRDisplay: React.FC<{ inactiveFundIds: number[] }> = ({ inactiveFundIds }) => {
  const [livePreviousFundsIRR, setLivePreviousFundsIRR] = useState<{irr: number, date: string} | null>(null);
  const [isLoadingLivePreviousFundsIRR, setIsLoadingLivePreviousFundsIRR] = useState<boolean>(false);
  const [livePreviousFundsIRRError, setLivePreviousFundsIRRError] = useState<string | null>(null);

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

  useEffect(() => {
    const calculateLivePreviousFundsIRR = async () => {
      console.log('PreviousFundsIRRDisplay received inactiveFundIds:', inactiveFundIds);
      
      // Only calculate if there are inactive fund IDs
      if (inactiveFundIds.length === 0) {
        console.log('No inactive fund IDs provided, skipping IRR calculation');
        setLivePreviousFundsIRR(null);
        setLivePreviousFundsIRRError(null);
        setIsLoadingLivePreviousFundsIRR(false);
        return;
      }

      setIsLoadingLivePreviousFundsIRR(true);
      setLivePreviousFundsIRRError(null);

      try {
        console.log(`Calculating live Previous Funds IRR for ${inactiveFundIds.length} inactive funds`);
        console.log('Inactive fund IDs for live calculation:', inactiveFundIds);
        console.log('🔍 DEBUG: ClientDetails.tsx calling IRR with inactive fund IDs:', inactiveFundIds);
        
        // Use the standardized multiple IRR endpoint with £0 valuation handling
        const response = await calculateStandardizedMultipleFundsIRR({
          portfolioFundIds: inactiveFundIds
        });
        
        console.log('Live Previous Funds IRR response:', response.data);
        
        if (response.data && response.data.success && response.data.irr_percentage !== null) {
          setLivePreviousFundsIRR({
            irr: response.data.irr_percentage,
            date: response.data.calculation_date
          });
        } else {
          setLivePreviousFundsIRR(null);
          setLivePreviousFundsIRRError('No IRR data available');
          console.warn('No live Previous Funds IRR data found');
        }
        
      } catch (err: any) {
        console.error('Error calculating live Previous Funds IRR:', err);
        setLivePreviousFundsIRR(null);
        
        if (err.response?.status === 404) {
          setLivePreviousFundsIRRError('No IRR data available');
        } else {
          setLivePreviousFundsIRRError(err.response?.data?.detail || err.message || 'Error calculating IRR');
        }
      } finally {
        setIsLoadingLivePreviousFundsIRR(false);
      }
    };

    calculateLivePreviousFundsIRR();
  }, [inactiveFundIds]); // Recalculate when inactiveFundIds changes

  if (isLoadingLivePreviousFundsIRR) {
    return <span className="text-xs text-gray-500">Loading...</span>;
  }

  if (livePreviousFundsIRRError) {
    return <span className="text-xs text-red-500" title={livePreviousFundsIRRError}>Error</span>;
  }

  if (livePreviousFundsIRR !== null) {
    return (
      <span className={`font-medium ${
        livePreviousFundsIRR.irr >= 0 ? 'text-green-600' : 'text-red-600'
      }`}>
        {formatPercentage(livePreviousFundsIRR.irr)}
      </span>
    );
  }

  return <span className="text-gray-500">-</span>;
};

// Enhanced ClientHeader component with inline editing
const ClientHeader = ({ 
  client, 
  totalValue, 
  totalIRR, 
  onEditClick,
  isEditing,
  editData,
  onSave,
  onCancel,
  onFieldChange,
  isSaving,
  availableProductOwners,
  onAddProductOwner,
  onRemoveProductOwner
}: { 
  client: Client; 
  totalValue: number;
  totalIRR: number | string;
  onEditClick: () => void;
  isEditing: boolean;
  editData: ClientFormData;
  onSave: () => void;
  onCancel: () => void;
  onFieldChange: (field: keyof ClientFormData, value: string | null) => void;
  isSaving?: boolean;
  availableProductOwners: ClientProductOwner[];
  onAddProductOwner: (productOwnerId: number) => void;
  onRemoveProductOwner: (associationId: number) => void;
}) => {
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatPercentage = (value: number | string | null | undefined): string => {
    if (value === null || value === undefined) {
      return 'N/A';
    }
    if (typeof value === 'string') {
      return value; // Return string values as-is (like "-")
    }
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

  // Input component for inline editing
  const EditableField = ({ 
    label, 
    value, 
    field, 
    type = 'text', 
    options 
  }: { 
    label: string; 
    value: string | null; 
    field: keyof ClientFormData; 
    type?: 'text' | 'select'; 
    options?: { value: string; label: string }[] 
  }) => {
    if (!isEditing) {
      return (
        <div className="flex items-center">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide mr-2">{label}:</span>
          <span className="text-sm font-semibold text-gray-900">
            {value || (field === 'advisor' ? 'Unassigned' : type === 'select' && field === 'type' ? 'Family' : 'N/A')}
          </span>
        </div>
      );
    }

    if (type === 'select' && options) {
      return (
        <div className="flex items-center">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide mr-2 min-w-fit">{label}:</span>
          <select
            value={value || ''}
            onChange={(e) => onFieldChange(field, e.target.value)}
            className="text-sm font-semibold text-gray-900 bg-white border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 min-w-0"
          >
            {options.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      );
    }

    return (
      <div className="flex items-center">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide mr-2 min-w-fit">{label}:</span>
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onFieldChange(field, e.target.value)}
          className="text-sm font-semibold text-gray-900 bg-white border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 min-w-0"
          placeholder={field === 'advisor' ? 'Enter advisor name' : `Enter ${label.toLowerCase()}`}
        />
      </div>
    );
  };

  // Status badge component
  const StatusBadge = () => {
    if (!isEditing) {
      return (
        <div className="flex items-center">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide mr-2">Status:</span>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
            client.status === 'active' 
              ? 'bg-green-100 text-green-800 border border-green-200' 
              : 'bg-gray-100 text-gray-800 border border-gray-200'
          }`}>
            <div className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
              client.status === 'active' ? 'bg-green-500' : 'bg-gray-500'
            }`} />
            {client.status}
          </span>
        </div>
      );
    }

    return (
      <div className="flex items-center">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide mr-2 min-w-fit">Status:</span>
        <select
          value={editData.status}
          onChange={(e) => onFieldChange('status', e.target.value)}
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border focus:outline-none focus:ring-2 focus:ring-primary-500 ${
            editData.status === 'active' 
              ? 'bg-green-100 text-green-800 border-green-200' 
              : 'bg-gray-100 text-gray-800 border-gray-200'
          }`}
        >
          <option value="active">Active</option>
          <option value="dormant">Dormant</option>
        </select>
      </div>
    );
  };

  return (
    <div className="mb-6 bg-white shadow-sm rounded-xl border border-gray-100 overflow-hidden transition-all duration-300 hover:shadow-md">
      {/* Main Header Section */}
      <div className="px-6 py-5">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          {/* Left Side - Client Name and Banner */}
          <div className="flex-1 min-w-0">
            {/* Client Name Row */}
            <div className="mb-5">
              <div className="min-w-0 flex-1">
                {/* Client Name - Editable */}
                {isEditing ? (
                  <input
                    type="text"
                    value={editData.name || ''}
                    onChange={(e) => onFieldChange('name', e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        onSave();
                      } else if (e.key === 'Escape') {
                        e.preventDefault();
                        onCancel();
                      }
                    }}
                    className="text-5xl font-normal text-primary-700 tracking-tight leading-tight bg-transparent border-b-2 border-primary-300 focus:outline-none focus:border-primary-500 w-full max-w-2xl"
                    placeholder="Enter client name"
                    autoFocus
                  />
                ) : (
                  <h1 className="text-5xl font-normal text-primary-700 tracking-tight leading-tight">
                    {client.name}
                  </h1>
                )}
              </div>
            </div>

            {/* Client Information Banner */}
            <div className="w-full lg:w-11/12">
              <div className="bg-gray-50 rounded-lg px-5 py-3 border border-gray-200">
                <div className="flex flex-wrap items-center justify-between gap-6">
                  <div className="flex flex-wrap items-center gap-6">
                    <EditableField 
                      label="Type" 
                      value={isEditing ? editData.type : client.type} 
                      field="type" 
                      type="select"
                      options={[
                        { value: 'Family', label: 'Family' },
                        { value: 'Business', label: 'Business' },
                        { value: 'Trust', label: 'Trust' }
                      ]}
                    />
                    
                                         <EditableField 
                       label="Advisor" 
                       value={isEditing ? editData.advisor : client.advisor} 
                       field="advisor" 
                     />
                     
                     <StatusBadge />
                     
                     {/* Product Owners Section */}
                     <div className="flex items-center">
                       <span className="text-xs font-medium text-gray-500 uppercase tracking-wide mr-2">Product Owners:</span>
                       <div className="flex items-center space-x-2">
                         {client.product_owners && client.product_owners.length > 0 ? (
                           <div className="flex flex-wrap gap-1">
                             {client.product_owners.map((owner) => (
                               <span 
                                 key={owner.id}
                                 className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200"
                               >
                                 {owner.name}
                                                                   {isEditing && owner.association_id && (
                                    <button
                                      onClick={() => onRemoveProductOwner(owner.association_id!)}
                                      className="ml-1 text-blue-600 hover:text-blue-800"
                                    >
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                    </button>
                                  )}
                               </span>
                             ))}
                           </div>
                         ) : (
                           <span className="text-sm text-gray-500">None assigned</span>
                         )}
                         
                         {isEditing && availableProductOwners.length > 0 && (
                           <select
                             onChange={(e) => {
                               if (e.target.value) {
                                 onAddProductOwner(parseInt(e.target.value));
                                 e.target.value = ''; // Reset selection
                               }
                             }}
                             className="text-xs bg-white border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                           >
                             <option value="">+ Add Owner</option>
                             {availableProductOwners.map((owner) => (
                               <option key={owner.id} value={owner.id}>
                                 {owner.name}
                               </option>
                             ))}
                           </select>
                         )}
                       </div>
                     </div>
                    
                    <div className="flex items-center">
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide mr-2">Member Since:</span>
                      <div className="flex items-center text-sm font-semibold text-gray-900">
                        <svg className="w-3 h-3 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {formatDate(client.created_at)}
                      </div>
                    </div>
                  </div>


                  {/* Action Buttons */}
                  {isEditing ? (
                    <div className="flex items-center space-x-2 flex-shrink-0">
                      <button
                        onClick={onCancel}
                        className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-1 shadow-sm"
                      >
                        <svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Cancel
                      </button>
                      <button
                        onClick={onSave}
                        disabled={isSaving}
                        className={`inline-flex items-center px-3 py-1.5 text-xs font-medium text-white border rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 shadow-sm ${
                          isSaving 
                            ? 'bg-primary-400 border-primary-400 cursor-not-allowed' 
                            : 'bg-primary-600 border-primary-600 hover:bg-primary-700'
                        }`}
                      >
                        {isSaving ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-1.5 h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Saving...
                          </>
                        ) : (
                          <>
                            <svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Save
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={onEditClick}
                      className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-primary-700 bg-white border border-primary-200 rounded-md hover:bg-primary-50 hover:border-primary-300 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 shadow-sm flex-shrink-0"
                    >
                      <svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Financial Metrics */}
          <div className="lg:w-72 flex-shrink-0">
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <div className="space-y-6">
                {/* Total Funds Under Management */}
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Total FUM
                  </div>
                  <div className="text-3xl font-bold text-gray-900 tracking-tight">
                    {formatCurrency(totalValue)}
                  </div>
                </div>

                {/* Total IRR */}
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Total IRR
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-2xl font-bold tracking-tight ${
                      typeof totalIRR === 'number' && totalIRR >= 0 
                        ? 'text-green-600' 
                        : 'text-red-600'
                    }`}>
                      {formatPercentage(totalIRR)}
                    </span>
                    {typeof totalIRR === 'number' && (
                      <div className={`w-3 h-3 rounded-full ${
                        totalIRR >= 0 ? 'bg-green-500' : 'bg-red-500'
                      }`} />
                    )}
                  </div>
                </div>
              </div>
            </div>
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
  client?: Client;
}> = ({ 
  account, 
  isExpanded, 
  onToggleExpand, 
  funds, 
  isLoadingFunds,
  client
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
    template_generation_id: account.template_generation_id,
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
  const formatPercentage = (value: number | string | null | undefined): string => {
    if (value === null || value === undefined) {
      return 'N/A';
    }
    if (typeof value === 'string') {
      return value; // Return string values as-is (like "-")
    }
    return `${(value).toFixed(2)}%`;
  };

  // Calculate estimated annual revenue with proper validation logic
  const calculateRevenue = (fixedCost?: number, percentageFee?: number, portfolioValue?: number): string | number => {
    const fixed = fixedCost || 0;
    const percentage = percentageFee || 0;
    const value = portfolioValue || 0;
    
    // If neither cost type is set, return 'None'
    if (!fixed && !percentage) {
      return 'None';
    }
    
    // If only fixed cost is set (no percentage fee)
    if (fixed && !percentage) {
      return fixed;
    }
    
    // If percentage fee is involved (with or without fixed cost)
    if (percentage > 0) {
      // If no valuation available, we need valuation
      if (!value || value <= 0) {
        return 'Latest valuation needed';
      }
      // If valuation exists, calculate properly
      return fixed + ((value * percentage) / 100);
    }
    
    return 'None';
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
        onClick={() => {
          // Use navigate with state to pass previous page info
          window.location.href = `/products/${account.id}/overview?from=${encodeURIComponent('client-details')}&clientId=${client?.id}&clientName=${encodeURIComponent(client?.name || 'Client Details')}`;
        }}
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
                  color: '#374151'
                }}
              >
                {account.template_generation_id 
                  ? (account.template_info?.generation_name || `Generation #${account.template_generation_id}`)
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
            {account.irr !== undefined && account.irr !== null && (
              <div className="flex items-center justify-end mt-1">
                <span className={`text-sm font-medium ${
                  typeof account.irr === 'number' && account.irr >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatPercentage(account.irr)}
                </span>
                <div 
                  className="ml-2 h-2 w-2 rounded-full"
                  style={{ backgroundColor: themeColor }}
                />
              </div>
            )}
            {/* Revenue Display */}
            <div className="mt-2 pt-2 border-t border-gray-200">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Annual Revenue
              </div>
              <div className="text-sm font-semibold mt-1">
                {(() => {
                  const revenue = calculateRevenue(account.fixed_cost, account.percentage_fee, displayValue);
                  if (typeof revenue === 'number') {
                    return <span className="text-green-600">{formatCurrency(revenue)}</span>;
                  } else if (revenue === 'Latest valuation needed') {
                    return <span className="text-orange-600">{revenue}</span>;
                  } else {
                    return <span className="text-gray-500">{revenue}</span>;
                  }
                })()}
              </div>
            </div>
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
              to={`/products/${account.id}/irr-calculation?from=${encodeURIComponent('client-details')}&clientId=${client?.id}&clientName=${encodeURIComponent(client?.name || 'Client Details')}`}
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
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Product Switch In</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Product Switch Out</th>
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
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-right">{formatCurrency(fund.product_switch_in || 0)}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-right">{formatCurrency(fund.product_switch_out || 0)}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-right">{formatCurrency(fund.market_value || 0)}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs font-medium text-right">
                        {fund.is_virtual_entry ? (
                          (() => {
                            console.log('Previous Funds virtual entry:', fund);
                            return <PreviousFundsIRRDisplay inactiveFundIds={fund.inactive_fund_ids || []} />;
                          })()
                        ) : (
                          fund.irr !== undefined && fund.irr !== null ? (
                            typeof fund.irr === 'number' ? (
                              <span className={`font-medium ${
                                fund.irr >= 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {formatPercentage(fund.irr)}
                              </span>
                            ) : fund.irr === "-" ? (
                              <span className="text-gray-500 font-medium">-</span>
                            ) : (
                              <span className="text-gray-500 font-medium">{fund.irr}</span>
                            )
                          ) : (
                            <span className="text-gray-500">-</span>
                          )
                        )}
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
                    <td className="px-3 py-2 whitespace-nowrap text-xs font-medium text-right">
                      {formatCurrency(funds.filter(fund => !fund.is_virtual_entry).reduce((sum, fund) => sum + (fund.product_switch_in || 0), 0))}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs font-medium text-right">
                      {formatCurrency(funds.filter(fund => !fund.is_virtual_entry).reduce((sum, fund) => sum + (fund.product_switch_out || 0), 0))}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs font-medium text-right">
                      {formatCurrency(funds.filter(fund => !fund.is_virtual_entry).reduce((sum, fund) => sum + (fund.market_value || 0), 0))}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs font-medium text-right">
                      {account.irr !== undefined && account.irr !== null ? (
                        typeof account.irr === 'number' ? (
                          <span className={`font-medium ${
                            account.irr >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {formatPercentage(account.irr)}
                          </span>
                        ) : account.irr === "-" ? (
                          <span className="text-gray-500 font-medium">-</span>
                        ) : (
                          <span className="text-gray-500 font-medium">{account.irr}</span>
                        )
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </td>
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
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCorrecting, setIsCorrecting] = useState(false);
  const [availableProductOwners, setAvailableProductOwners] = useState<ClientProductOwner[]>([]);
  const [isEditingProductOwners, setIsEditingProductOwners] = useState(false);
  const [versions, setVersions] = useState<any[]>([]);
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [showRevenueModal, setShowRevenueModal] = useState(false);
  const [revenueFormData, setRevenueFormData] = useState<Record<number, { fixed_cost: string; percentage_fee: string }>>({});
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

  // Simplified product expansion - data is already loaded
  const fetchProductFunds = async (accountId: number) => {
    // Data is already loaded from the bulk endpoint, so just mark as not loading
    setIsLoadingFunds(prev => ({ ...prev, [accountId]: false }));
    
    // If for some reason the data wasn't loaded, log a warning
    if (!expandedProductFunds[accountId]) {
      console.warn(`Fund data not found for product ${accountId} - may need to refresh`);
    }
  };

  // Function to fetch product owners for the client group
  const fetchProductOwners = async () => {
    try {
      if (!clientId) return;

      // Fetch client group's product owners
      const clientProductOwnersResponse = await getClientGroupProductOwners(parseInt(clientId));
      console.log('Client product owners response:', clientProductOwnersResponse.data);
      
      // Fetch all available product owners for the dropdown
      const allProductOwnersResponse = await getProductOwners();
      console.log('All product owners response:', allProductOwnersResponse.data);
      
      // Process client's current product owners
      const currentProductOwners: ClientProductOwner[] = [];
      if (clientProductOwnersResponse.data && Array.isArray(clientProductOwnersResponse.data)) {
        for (const association of clientProductOwnersResponse.data) {
          if (association.product_owner_id) {
            // Find the product owner details
            const productOwner = allProductOwnersResponse.data.find(
              (owner: any) => owner.id === association.product_owner_id
            );
            if (productOwner) {
              currentProductOwners.push({
                id: productOwner.id,
                name: productOwner.name,
                status: productOwner.status,
                created_at: productOwner.created_at,
                association_id: association.id // Store the association ID for deletion
              });
            }
          }
        }
      }

      // Update client with product owners
      setClient(prev => prev ? { ...prev, product_owners: currentProductOwners } : null);
      
      // Set available product owners (excluding already assigned ones)
      const availableOwners = allProductOwnersResponse.data
        .filter((owner: any) => owner.status === 'active')
        .filter((owner: any) => !currentProductOwners.find(current => current.id === owner.id))
        .map((owner: any) => ({
          id: owner.id,
          name: owner.name,
          status: owner.status,
          created_at: owner.created_at
        }));
      
      setAvailableProductOwners(availableOwners);
      
    } catch (err: any) {
      console.error('Error fetching product owners:', err);
    }
  };

  // Optimized data fetching using the new bulk endpoint
  const fetchClientData = async (retryCount = 0) => {
    // Safety check: Don't make API calls if clientId is invalid
    if (!clientId || clientId === 'null' || clientId === 'undefined') {
      console.warn('fetchClientData called with invalid clientId:', clientId);
      setIsLoading(false);
      return;
    }
    
    try {
      setIsLoading(true);
      console.log(`Fetching complete client data for ID: ${clientId} using optimized bulk endpoint`);
      
      // Single API call to get all client group data
      const completeResponse = await api.get(`/client_groups/${clientId}/complete`);
      const completeData = completeResponse.data;
      
      console.log("Complete client data received:", completeData);
      console.log("Performance stats:", completeData.performance_stats);
      
      // Set client data
      setClient(completeData.client_group);
      
      // Process products data
      const processedProducts = completeData.products.map((product: any) => ({
        id: product.id,
        client_id: parseInt(clientId),
        product_name: product.product_name,
        product_type: product.product_type,
        status: product.status,
        start_date: product.start_date,
        end_date: product.end_date,
        portfolio_id: product.portfolio_id,
        portfolio_name: product.portfolio_name,
        provider_id: product.provider_id,
        provider_name: product.provider_name,
        provider_theme_color: product.provider_theme_color,
        total_value: product.total_value,
        irr: product.irr,
        active_fund_count: product.active_fund_count,
        inactive_fund_count: product.inactive_fund_count,
        template_generation_id: product.template_generation_id,
        template_info: product.template_info,
        product_owners: [], // TODO: Add product owners if needed
        fixed_cost: product.fixed_cost,
        percentage_fee: product.percentage_fee
      }));
      
      setClientAccounts(processedProducts);
      
      // Pre-populate fund data for all products to eliminate lazy loading
      const fundDataMap: { [key: number]: ProductFund[] } = {};
      completeData.products.forEach((product: any) => {
        if (product.funds && product.funds.length > 0) {
          fundDataMap[product.id] = product.funds.map((fund: any) => ({
            id: fund.id,
            fund_name: fund.fund_name,
            isin_number: fund.isin_number,
            risk_factor: fund.risk_factor,
            amount_invested: fund.amount_invested,
            market_value: fund.market_value,
            investments: fund.investments,
            withdrawals: fund.withdrawals,
            switch_in: fund.switch_in,
            switch_out: fund.switch_out,
            product_switch_in: fund.product_switch_in,
            product_switch_out: fund.product_switch_out,
            irr: fund.irr,
            status: fund.status,
            is_virtual_entry: fund.is_virtual_entry,
            inactive_fund_count: fund.inactive_fund_count,
            inactive_fund_ids: fund.inactive_fund_ids // Add the missing field for Previous Funds IRR calculation
          }));
        }
      });
      
      setExpandedProductFunds(fundDataMap);
      
      // Calculate total value from processed data
      const totalValue = processedProducts.reduce((sum: number, product: any) => 
        sum + (product.total_value || 0), 0
      );
      
      // Store calculated FUM value
      clientFUMFromView.current = totalValue;
      
      // Fetch the true aggregated IRR using the standardized client group IRR endpoint
      let totalIRR = 0;
      try {
        console.log(`Fetching standardized IRR for client group ${clientId}`);
        const irrResponse = await api.get(`/client_groups/${clientId}/irr`);
        totalIRR = irrResponse.data.irr || 0;
        console.log(`Standardized client group IRR: ${totalIRR}%`);
        console.log('IRR calculation details:', irrResponse.data);
      } catch (irrError) {
        console.error('Error fetching client group IRR:', irrError);
        // Fallback to 0 if IRR calculation fails
        totalIRR = 0;
      }
      
      // Store calculated IRR value
      clientIRRFromAPI.current = totalIRR;
      
      console.log(`Optimized loading complete: ${processedProducts.length} products, ${Object.keys(fundDataMap).length} products with fund data`);
      console.log(`Total Value: ${totalValue}, Standardized Total IRR: ${totalIRR}%`);
      
      // Fetch product owners after setting the client
      await fetchProductOwners();
      
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

  // Data fetching with error retry
  useEffect(() => {
    // Only fetch data if clientId exists and is not null/undefined/string 'null'
    if (clientId && clientId !== 'null' && clientId !== 'undefined') {
      fetchClientData();
    }
  }, [clientId]);

  // Set all products to be expanded when clientAccounts are updated
  useEffect(() => {
    if (clientAccounts.length > 0) {
      // Get all account IDs
      const allAccountIds = clientAccounts.map(account => account.id);
      
      // Set expanded products state
      setExpandedProducts(allAccountIds);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientAccounts]);

  // Calculate totals with memoization for performance
  const { totalFundsUnderManagement, totalIRR } = useMemo(() => {
    // Use the values calculated from the bulk endpoint
    const totalFunds = clientFUMFromView.current || 0;
    const finalIRR = clientIRRFromAPI.current || 0;
    
    console.log("Optimized totals calculation:");
    console.log("Total funds from bulk endpoint:", totalFunds);
    console.log("Total IRR from standardized endpoint:", finalIRR);
    
    return {
      totalFundsUnderManagement: totalFunds,
      totalIRR: finalIRR
    };
  }, [clientFUMFromView.current, clientIRRFromAPI.current]);

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
    if (!client || isSaving) return;

    try {
      // Validate required fields
      if (!formData.name?.trim()) {
        setError('Client name is required');
        return;
      }

      // Set saving state
      setIsSaving(true);
      setError(null);

      // Only send fields that have actually changed
      const changedFields: Partial<ClientFormData> = {};
      
      if (formData.name?.trim() !== client.name) {
        changedFields.name = formData.name?.trim();
      }
      if (formData.status !== client.status) {
        changedFields.status = formData.status;
      }
      
      // Special handling for advisor which could be null
      if (
        (formData.advisor === '' && client.advisor !== null) || 
        (formData.advisor !== client.advisor && formData.advisor !== '')
      ) {
        changedFields.advisor = formData.advisor === '' ? null : formData.advisor?.trim();
      }

      // Handle type field change
      if (formData.type !== client.type) {
        changedFields.type = formData.type;
      }
      
      // Only perform API call if there are changes
      if (Object.keys(changedFields).length > 0) {
        await api.patch(`/client_groups/${clientId}`, changedFields);
        await fetchClientData(); // Refresh client data to reflect changes
        console.log('Client updated successfully');
      }
      
      setIsCorrecting(false);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update client details');
      console.error('Error updating client:', err);
    } finally {
      setIsSaving(false);
    }
  };



  const handleFieldChange = (field: keyof ClientFormData, value: string | null) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
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

  const handleReactivateProduct = async (productId: number, productName: string) => {
    try {
      if (window.confirm(`Are you sure you want to reactivate the product "${productName}"? This will change its status back to active.`)) {
        const response = await api.patch(`client_products/${productId}/reactivate`);
        if (response.data) {
          // Refresh client data to show the reactivated product
          await fetchClientData();
          // Show success notification (you may want to add a toast notification system)
          console.log('Product reactivated successfully');
        }
      }
    } catch (err: any) {
      console.error('Error reactivating product:', err);
      alert(err.response?.data?.detail || 'Failed to reactivate product. Please try again.');
    }
  };

  // Product owner management functions
  const handleAddProductOwner = async (productOwnerId: number) => {
    try {
      if (!clientId) return;
      
      await addClientGroupProductOwner(parseInt(clientId), productOwnerId);
      await fetchProductOwners(); // Refresh product owners
      console.log('Product owner added successfully');
    } catch (err: any) {
      console.error('Error adding product owner:', err);
      setError(err.response?.data?.detail || 'Failed to add product owner');
    }
  };

  const handleRemoveProductOwner = async (associationId: number) => {
    try {
      await removeClientGroupProductOwner(associationId);
      await fetchProductOwners(); // Refresh product owners
      console.log('Product owner removed successfully');
    } catch (err: any) {
      console.error('Error removing product owner:', err);
      setError(err.response?.data?.detail || 'Failed to remove product owner');
    }
  };

  // Handle revenue assignment save
  const handleRevenueAssignmentSave = async (updates: Record<number, { fixed_cost: number | null; percentage_fee: number | null }>) => {
    try {
      // Update each product with new revenue settings
      const updatePromises = Object.entries(updates).map(async ([productId, data]) => {
        console.log(`Processing product ${productId}:`, data);
        
        // Get current product data for comparison
        const currentProduct = clientAccounts.find(p => p.id === parseInt(productId));
        console.log(`Current product data for ${productId}:`, {
          fixed_cost: currentProduct?.fixed_cost,
          percentage_fee: currentProduct?.percentage_fee
        });
        
        // Only send fields that have actual values or need to be cleared
        const updateData: any = {};
        
        // Handle fixed_cost: send null to clear, number to set, skip if unchanged
        if (data.fixed_cost !== null) {
          updateData.fixed_cost = data.fixed_cost;
        } else {
          // Check if we need to explicitly clear it
          if (currentProduct?.fixed_cost) {
            updateData.fixed_cost = null;
          }
        }
        
        // Handle percentage_fee: send null to clear, number to set, skip if unchanged  
        if (data.percentage_fee !== null) {
          updateData.percentage_fee = data.percentage_fee;
        } else {
          // Check if we need to explicitly clear it
          if (currentProduct?.percentage_fee) {
            updateData.percentage_fee = null;
          }
        }
        
        // Only make API call if there's something to update
        if (Object.keys(updateData).length > 0) {
          console.log(`Updating product ${productId} with:`, updateData);
          console.log(`API call: PATCH /client_products/${productId}`, JSON.stringify(updateData, null, 2));
          try {
            return await api.patch(`/client_products/${productId}`, updateData);
          } catch (error: any) {
            console.error(`Failed to update product ${productId}:`, error);
            console.error(`Error response:`, error.response?.data);
            console.error(`Error status:`, error.response?.status);
            throw error;
          }
        } else {
          console.log(`No changes for product ${productId}, skipping update`);
          return Promise.resolve();
        }
      });

      await Promise.all(updatePromises);
      
      // Refresh client data to show updated revenue calculations
      await fetchClientData();
      
      console.log('Revenue assignments updated successfully');
    } catch (err: any) {
      console.error('Error updating revenue assignments:', err);
      console.error('Error details:', err.response?.data);
      setError(err.response?.data?.detail || 'Failed to update revenue assignments');
      throw err; // Re-throw to let modal handle the error
    }
  };

  // Breadcrumb component
  const Breadcrumbs = () => {
    return (
      <nav className="mb-4 flex" aria-label="Breadcrumb">
        <ol className="inline-flex items-center space-x-1 md:space-x-3">
          <li className="inline-flex items-center">
            <Link to="/client_groups" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-primary-700">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"></path>
              </svg>
              Clients
            </Link>
          </li>
          <li aria-current="page">
            <div className="flex items-center">
              <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"></path>
              </svg>
              <span className="ml-1 text-sm font-medium text-primary-700 md:ml-2">{client ? `${client.name}` : 'Client Details'}</span>
            </div>
          </li>
        </ol>
      </nav>
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
              <div className="mt-2">
                <ActionButton
                  variant="cancel"
                  size="sm"
                  onClick={handleBack}
                >
                  Return to Clients
                </ActionButton>
              </div>
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
          isEditing={isCorrecting}
          editData={formData}
          onSave={handleCorrect}
          onCancel={() => setIsCorrecting(false)}
          onFieldChange={handleFieldChange}
          isSaving={isSaving}
          availableProductOwners={availableProductOwners}
          onAddProductOwner={handleAddProductOwner}
          onRemoveProductOwner={handleRemoveProductOwner}
        />


        {/* Client Products Section */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-normal text-gray-900 font-sans tracking-wide">Client Products</h2>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowRevenueModal(true)}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-primary-700 bg-white border border-primary-300 rounded-lg hover:bg-primary-50 hover:border-primary-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 shadow-sm"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
                Assign Fees
              </button>
              
              <Link
                to={`/create-client-group-products?client_id=${clientId}&client_name=${encodeURIComponent(`${client?.name}`)}&returnTo=${encodeURIComponent(`/client_groups/${clientId}`)}`}
              >
                <AddButton
                  context="Product"
                  design="balanced"
                  size="md"
                />
              </Link>
            </div>
          </div>
          
          {!isLoading ? (
            clientAccounts.length > 0 ? (
              <div className="space-y-6">
                {/* Active Products */}
                {clientAccounts.filter(account => account.status === 'active').length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Active Products</h3>
                    <div className="grid grid-cols-1 gap-4">
                      {clientAccounts
                        .filter(account => account.status === 'active')
                        .map(account => (
                          <ProductCard 
                            key={account.id} 
                            account={account} 
                            isExpanded={expandedProducts.includes(account.id)}
                            onToggleExpand={() => toggleProductExpand(account.id)}
                            funds={expandedProductFunds[account.id] || []}
                            isLoadingFunds={isLoadingFunds[account.id] || false}
                            client={client}
                          />
                        ))}
                    </div>
                  </div>
                )}
                
                {/* Lapsed Products */}
                {clientAccounts.filter(account => account.status === 'inactive').length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-500 mb-4">Lapsed Products</h3>
                    <div className="grid grid-cols-1 gap-4 opacity-60">
                      {clientAccounts
                        .filter(account => account.status === 'inactive')
                        .map(account => (
                          <div key={account.id} className="filter grayscale relative">
                            <ProductCard 
                              account={account} 
                              isExpanded={expandedProducts.includes(account.id)}
                              onToggleExpand={() => toggleProductExpand(account.id)}
                              funds={expandedProductFunds[account.id] || []}
                              isLoadingFunds={isLoadingFunds[account.id] || false}
                              client={client}
                            />
                            {/* Reactivate Button Overlay */}
                            <div className="absolute top-4 right-4 z-10">
                              <button
                                onClick={() => handleReactivateProduct(account.id, account.product_name)}
                                className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-200 shadow-sm flex items-center space-x-1 opacity-100"
                                title="Reactivate this product"
                              >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                <span>Reactivate</span>
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-gray-50 p-6 rounded-lg text-center border border-gray-200">
                <div className="text-gray-500 mb-4">No products found for this client.</div>
                <div className="flex justify-center">
                  <Link 
                    to={`/create-client-group-products?client_id=${clientId}&client_name=${encodeURIComponent(`${client?.name}`)}&returnTo=${encodeURIComponent(`/client_groups/${clientId}`)}`}
                  >
                    <AddButton
                      context="Product"
                      design="descriptive"
                      size="md"
                    >
                      Add First Product
                    </AddButton>
                  </Link>
                </div>
              </div>
            )
          ) : (
            <div className="text-gray-500 p-6 text-center">Loading client products...</div>
          )}
        </div>
        

      </div>

      {/* Revenue Assignment Modal */}
      {showRevenueModal && (
        <RevenueAssignmentModal
          isOpen={showRevenueModal}
          onClose={() => setShowRevenueModal(false)}
          clientAccounts={clientAccounts}
          onSave={handleRevenueAssignmentSave}
        />
      )}
    </>
  );
};

// Revenue Assignment Modal Component
const RevenueAssignmentModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  clientAccounts: ClientAccount[];
  onSave: (updates: Record<number, { fixed_cost: number | null; percentage_fee: number | null }>) => void;
}> = ({ isOpen, onClose, clientAccounts, onSave }) => {
  const [formData, setFormData] = useState<Record<number, { fixed_cost: string; percentage_fee: string }>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Initialize form data when modal opens
  useEffect(() => {
    if (isOpen) {
      const initialData: Record<number, { fixed_cost: string; percentage_fee: string }> = {};
      clientAccounts.forEach(account => {
        initialData[account.id] = {
          fixed_cost: account.fixed_cost?.toString() || '',
          percentage_fee: account.percentage_fee?.toString() || ''
        };
      });
      setFormData(initialData);
    }
  }, [isOpen, clientAccounts]);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const handleInputChange = (productId: number, field: 'fixed_cost' | 'percentage_fee', value: string) => {
    setFormData(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [field]: value
      }
    }));
  };

  const calculatePercentageRevenue = (percentageFee: string, totalValue: number): string | number => {
    const fee = parseFloat(percentageFee);
    if (!fee || fee <= 0) return 0;
    if (!totalValue || totalValue <= 0) return 'Latest valuation needed';
    return (totalValue * fee) / 100;
  };

  const calculateTotalRevenue = (fixedCost: string, percentageFee: string, totalValue: number): string | number => {
    const fixed = parseFloat(fixedCost) || 0;
    const percentage = parseFloat(percentageFee) || 0;
    
    // If neither cost type is set
    if (!fixed && !percentage) {
      return 'None';
    }
    
    // If only fixed cost is set (no percentage fee)
    if (fixed && !percentage) {
      return fixed;
    }
    
    // If percentage fee is involved (with or without fixed cost)
    if (percentage > 0) {
      // If no valuation available, we need valuation
      if (!totalValue || totalValue <= 0) {
        return 'Latest valuation needed';
      }
      // If valuation exists, calculate properly
      return fixed + ((totalValue * percentage) / 100);
    }
    
    return 'None';
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updates: Record<number, { fixed_cost: number | null; percentage_fee: number | null }> = {};
      
      Object.entries(formData).forEach(([productId, data]) => {
        const id = parseInt(productId);
        
        // Parse values, treating empty strings as null
        let fixedCost: number | null = null;
        let percentageFee: number | null = null;
        
        if (data.fixed_cost && data.fixed_cost.trim() !== '') {
          const parsed = parseFloat(data.fixed_cost);
          fixedCost = isNaN(parsed) ? null : parsed;
        }
        
        if (data.percentage_fee && data.percentage_fee.trim() !== '') {
          const parsed = parseFloat(data.percentage_fee);
          percentageFee = isNaN(parsed) ? null : parsed;
        }
        
        updates[id] = {
          fixed_cost: fixedCost,
          percentage_fee: percentageFee
        };
        
        console.log(`Form data for product ${id}:`, {
          original: data,
          parsed: updates[id],
          currentProduct: clientAccounts.find(p => p.id === id)
        });
      });
      
      console.log('All updates to be sent:', updates);
      await onSave(updates);
      onClose();
    } catch (error) {
      console.error('Error saving revenue assignments:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Calculate totals
  const totals = clientAccounts.reduce((acc, account) => {
    const productData = formData[account.id];
    if (!productData) return acc;
    
    const fixedCost = parseFloat(productData.fixed_cost) || 0;
    const percentageFee = parseFloat(productData.percentage_fee) || 0;
    const totalValue = account.total_value || 0;
    
    acc.fixedCost += fixedCost;
    acc.totalValue += totalValue;
    
    const percentageRevenue = calculatePercentageRevenue(productData.percentage_fee, totalValue);
    if (typeof percentageRevenue === 'number') {
      acc.percentageRevenue += percentageRevenue;
    }
    
    const totalRevenue = calculateTotalRevenue(productData.fixed_cost, productData.percentage_fee, totalValue);
    if (typeof totalRevenue === 'number') {
      acc.totalRevenue += totalRevenue;
    }
    
    return acc;
  }, { fixedCost: 0, totalValue: 0, percentageRevenue: 0, totalRevenue: 0 });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Revenue Assignment Calculator</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Configure fixed costs and percentage fees for each product to calculate total client group revenue.
          </p>
          
          {/* Revenue Summary */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Revenue</div>
              <div className="text-lg font-bold text-green-600 mt-1">
                {formatCurrency(totals.totalRevenue)}
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Valuation</div>
              <div className="text-lg font-bold text-gray-900 mt-1">
                {formatCurrency(totals.totalValue)}
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Fixed Revenue</div>
              <div className="text-lg font-bold text-blue-600 mt-1">
                {formatCurrency(totals.fixedCost)}
              </div>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Effective Fee Rate</div>
              <div className="text-lg font-bold text-primary-600 mt-1">
                {totals.totalValue > 0 
                  ? `${((totals.totalRevenue / totals.totalValue) * 100).toFixed(2)}%`
                  : 'N/A'
                }
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {totals.totalValue > 0 
                  ? 'of total valuation'
                  : 'No valuation available'
                }
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto max-h-[60vh]">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product Name
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fixed Cost (£)
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Percentage Fee (%)
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Latest Valuation
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Percentage Revenue
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Revenue
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {clientAccounts.map((account) => {
                const productData = formData[account.id] || { fixed_cost: '', percentage_fee: '' };
                const totalValue = account.total_value || 0;
                const percentageRevenue = calculatePercentageRevenue(productData.percentage_fee, totalValue);
                const totalRevenue = calculateTotalRevenue(productData.fixed_cost, productData.percentage_fee, totalValue);
                
                                 return (
                   <tr key={account.id} className="hover:bg-gray-50">
                     <td className="px-4 py-2 whitespace-nowrap">
                       <div className="flex items-center">
                         <div 
                           className="w-2 h-2 rounded-full mr-2"
                           style={{ backgroundColor: account.provider_theme_color || '#6B7280' }}
                         />
                         <div>
                           <div className="text-xs font-medium text-gray-900">{account.product_name}</div>
                           <div className="text-xs text-gray-500">{account.provider_name}</div>
                         </div>
                       </div>
                     </td>
                     <td className="px-4 py-2 whitespace-nowrap text-right">
                       <input
                         type="number"
                         value={productData.fixed_cost}
                         onChange={(e) => handleInputChange(account.id, 'fixed_cost', e.target.value)}
                         placeholder="0.00"
                         min="0"
                         step="0.01"
                         className="w-20 text-xs text-right border border-gray-300 rounded px-1 py-1 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                       />
                     </td>
                     <td className="px-4 py-2 whitespace-nowrap text-right">
                       <input
                         type="number"
                         value={productData.percentage_fee}
                         onChange={(e) => handleInputChange(account.id, 'percentage_fee', e.target.value)}
                         placeholder="0.00"
                         min="0"
                         step="0.01"
                         className="w-20 text-xs text-right border border-gray-300 rounded px-1 py-1 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                       />
                     </td>
                     <td className="px-4 py-2 whitespace-nowrap text-right text-xs font-medium text-gray-900">
                       {totalValue > 0 ? formatCurrency(totalValue) : 'No valuation'}
                     </td>
                     <td className="px-4 py-2 whitespace-nowrap text-right text-xs">
                       {typeof percentageRevenue === 'number' ? (
                         <span className="font-medium text-green-600">{formatCurrency(percentageRevenue)}</span>
                       ) : (
                         <span className="text-orange-600">{percentageRevenue}</span>
                       )}
                     </td>
                     <td className="px-4 py-2 whitespace-nowrap text-right text-xs">
                       {typeof totalRevenue === 'number' ? (
                         <span className="font-semibold text-green-600">{formatCurrency(totalRevenue)}</span>
                       ) : totalRevenue === 'Latest valuation needed' ? (
                         <span className="text-orange-600">{totalRevenue}</span>
                       ) : (
                         <span className="text-gray-500">{totalRevenue}</span>
                       )}
                     </td>
                   </tr>
                 );
              })}
              
                             {/* Totals Row */}
               <tr className="bg-gray-100 font-semibold border-t-2 border-gray-300">
                 <td className="px-4 py-2 whitespace-nowrap text-xs font-bold text-gray-900">
                   TOTALS
                 </td>
                 <td className="px-4 py-2 whitespace-nowrap text-right text-xs font-bold text-gray-900">
                   {formatCurrency(totals.fixedCost)}
                 </td>
                 <td className="px-4 py-2 whitespace-nowrap text-right text-xs text-gray-500">
                   -
                 </td>
                 <td className="px-4 py-2 whitespace-nowrap text-right text-xs font-bold text-gray-900">
                   {formatCurrency(totals.totalValue)}
                 </td>
                 <td className="px-4 py-2 whitespace-nowrap text-right text-xs font-bold text-green-600">
                   {formatCurrency(totals.percentageRevenue)}
                 </td>
                 <td className="px-4 py-2 whitespace-nowrap text-right text-xs font-bold text-green-600">
                   {formatCurrency(totals.totalRevenue)}
                 </td>
               </tr>
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors ${
              isSaving 
                ? 'bg-primary-400 cursor-not-allowed' 
                : 'bg-primary-600 hover:bg-primary-700'
            }`}
          >
            {isSaving ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClientDetails;
