import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNavigationRefresh } from '../hooks/useNavigationRefresh';
import { getProviderColor } from '../services/providerColors';
import { 
  EditButton, 
  ActionButton, 
  LapseButton, 
  DeleteButton, 
  AddButton,
  BaseInput,
  NumberInput,
  BaseDropdown,
  DateInput
} from '../components/ui';
import api, { getClientGroupProductOwners, calculateStandardizedMultipleFundsIRR, getProductOwners, addClientGroupProductOwner, removeClientGroupProductOwner, getProductOwnersForProducts, getStandardizedClientIRR } from '../services/api';
import { useClientDetails } from '../hooks/useClientDetails';
import { useClientMutations } from '../hooks/useClientMutations';
import { getProductOwnerDisplayName } from '../utils/productOwnerUtils';
import { isCashFund } from '../utils/fundUtils';
import { generateProductDisplayName } from '../utils/productTitleUtils';
import DynamicPageContainer from '../components/DynamicPageContainer';


// Enhanced TypeScript interfaces
interface Client {
  id: string;
  name: string | null;
  status: string;
  advisor: string | null; // Legacy text field (will be phased out)
  advisor_id?: number | null; // New advisor relationship field
  advisor_name?: string | null;
  advisor_email?: string | null;
  advisor_first_name?: string | null;
  advisor_last_name?: string | null;
  type: string | null;
  created_at: string;
  updated_at: string;
  age?: number;
  gender?: string;
  product_owners?: ClientProductOwner[];
}

interface ClientProductOwner {
  id: number;
  firstname?: string;
  surname?: string;
  known_as?: string;
  status: string;
  created_at: string;
  association_id?: number; // ID of the client_group_product_owners record
}

interface ClientFormData {
  name: string | null;
  status: string;
  advisor: string | null; // Keep legacy field for compatibility
  advisor_id: number | null; // New advisor relationship field
  type: string | null;
  created_at: string; // Add this field
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
  firstname?: string;
  surname?: string;
  known_as?: string;
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
  tax_uplift?: number;
  withdrawals?: number;
  fund_switch_in?: number;
  fund_switch_out?: number;
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
  const currentRequestRef = useRef<string | null>(null);

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

  // Memoize the fund IDs to prevent unnecessary re-renders
  const memoizedFundIds = useMemo(() => {
    return inactiveFundIds.sort((a, b) => a - b); // Sort for consistent comparison
  }, [inactiveFundIds.join(',')]);

  // Create a cache key for request deduplication
  const cacheKey = useMemo(() => {
    return memoizedFundIds.join(',');
  }, [memoizedFundIds]);

  useEffect(() => {
    const calculateLivePreviousFundsIRR = async () => {
      console.log('PreviousFundsIRRDisplay received inactiveFundIds:', memoizedFundIds);
      
      // Only calculate if there are inactive fund IDs
      if (memoizedFundIds.length === 0) {
        console.log('No inactive fund IDs provided, skipping IRR calculation');
        setLivePreviousFundsIRR(null);
        setLivePreviousFundsIRRError(null);
        setIsLoadingLivePreviousFundsIRR(false);
        return;
      }

      // Skip if the same request is already in progress
      if (currentRequestRef.current === cacheKey) {
        console.log('Same IRR calculation already in progress, skipping duplicate request for:', cacheKey);
        return;
      }

      currentRequestRef.current = cacheKey;
      setIsLoadingLivePreviousFundsIRR(true);
      setLivePreviousFundsIRRError(null);

      try {
        console.log(`Calculating live Previous Funds IRR for ${memoizedFundIds.length} inactive funds`);
        console.log('Inactive fund IDs for live calculation:', memoizedFundIds);
        console.log('🔍 DEBUG: ClientDetails.tsx calling IRR with cache key:', cacheKey);
        
        // Use the standardized multiple IRR endpoint with £0 valuation handling
        const response = await calculateStandardizedMultipleFundsIRR({
          portfolioFundIds: memoizedFundIds
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
          setLivePreviousFundsIRRError('No activity data available for IRR calculation');
        } else {
          setLivePreviousFundsIRRError(err.response?.data?.detail || err.message || 'Error calculating IRR');
        }
      } finally {
        setIsLoadingLivePreviousFundsIRR(false);
        currentRequestRef.current = null;
      }
    };

    calculateLivePreviousFundsIRR();
  }, [cacheKey, memoizedFundIds]); // Use memoized values in dependency array

  if (isLoadingLivePreviousFundsIRR) {
    return <span className="text-xs text-gray-500">Loading...</span>;
  }

  if (livePreviousFundsIRRError) {
    // Show a more user-friendly message for no activity data
    if (livePreviousFundsIRRError.includes('No activity data available')) {
      return <span className="text-xs text-gray-500">No data</span>;
    }
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
  totalRevenue,
  onEditClick,
  isEditing,
  editData,
  onSave,
  onCancel,
  onFieldChange,
  isSaving,
  availableAdvisors,
  handleDelete
}: { 
  client: Client; 
  totalValue: number;
  totalIRR: number | string;
  totalRevenue: number;
  onEditClick: () => void;
  isEditing: boolean;
  editData: ClientFormData;
  onSave: () => void;
  onCancel: () => void;
  onFieldChange: (field: keyof ClientFormData, value: string | null) => void;
  isSaving?: boolean;
  availableAdvisors: { value: string; label: string }[];
  handleDelete: () => void;
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
      return value; // Return string values as-is (like "-" or "Loading...")
    }
    return `${(value).toFixed(2)}%`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const formattedDate = date.toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
    console.log('DEBUG: ClientHeader formatDate - input:', dateString, 'output:', formattedDate);
    return formattedDate;
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
    // If not editing, show display-only version
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

    // If it's a select field with options, render BaseDropdown
    if (type === 'select' && options) {
      return (
        <div className="flex items-center">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide mr-2 min-w-fit">{label}:</span>
          <BaseDropdown
            options={options}
            value={value || ''}
            onChange={(selectedValue) => onFieldChange(field, typeof selectedValue === 'string' ? selectedValue : String(selectedValue))}
            size="sm"
            fullWidth={false}
            className="text-sm font-semibold text-gray-900 min-w-32 w-32"
          />
        </div>
      );
    }

    return (
      <div className="flex items-center">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide mr-2 min-w-fit">{label}:</span>
        <BaseInput
          value={value || ''}
          onChange={(e) => onFieldChange(field, e.target.value)}
          placeholder={field === 'advisor' ? 'Enter advisor name' : `Enter ${label.toLowerCase()}`}
          size="sm"
          className="text-sm font-semibold text-gray-900 min-w-0"
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
        <BaseDropdown
          options={[
            { value: 'active', label: 'Active' },
            { value: 'dormant', label: 'Dormant' }
          ]}
          value={editData.status}
          onChange={(selectedValue) => onFieldChange('status', typeof selectedValue === 'string' ? selectedValue : String(selectedValue))}
          size="sm"
          fullWidth={false}
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border min-w-32 w-32 ${
            editData.status === 'active' 
              ? 'bg-green-100 text-green-800 border-green-200' 
              : 'bg-gray-100 text-gray-800 border-gray-200'
          }`}
        />
      </div>
    );
  };

  return (
    <div className={`mb-6 bg-white shadow-sm rounded-xl border border-gray-100 transition-all duration-300 hover:shadow-md ${
      isEditing ? 'overflow-visible' : 'overflow-hidden'
    }`}>
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
              <div className={`bg-gray-50 rounded-lg px-5 border border-gray-200 transition-all duration-300 ${
                isEditing ? 'py-3 pb-6' : 'py-3'
              }`}>
                <div className="flex flex-wrap items-center justify-between gap-6">
                  <div className={`flex flex-wrap items-center gap-6 ${isEditing ? 'w-full' : ''}`}>
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
                    
                                                                                 {/* Advisor Assignment using BaseDropdown */}
                    {!isEditing ? (
                      <div className="flex items-center">
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide mr-2">Advisor:</span>
                        <div className="flex items-center text-sm font-semibold text-gray-900">
                          {client.advisor_name || 'Unassigned'}
                        </div>
                      </div>
                    ) : (
                      <EditableField 
                        label="Advisor" 
                        value={editData.advisor_id?.toString() || ''} 
                        field="advisor_id" 
                        type="select"
                        options={availableAdvisors}
                      />
                    )}
                     
                     <StatusBadge />
                     
                    
                    {/* Start Date - Only show inline when NOT editing */}
                    {!isEditing && (
                      <div className="flex items-center">
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide mr-2">Client Since:</span>
                        <div className="flex items-center text-sm font-semibold text-gray-900">
                          <svg className="w-3 h-3 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2z" />
                          </svg>
                          {formatDate(client.created_at)}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Start Date - Show on new line when editing */}
                  {isEditing && (
                    <div className="flex items-center w-full mt-4">
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide mr-2">Client Since:</span>
                      <DateInput
                        value={editData.created_at ? new Date(editData.created_at) : undefined}
                        onChange={(date, formattedDate) => {
                          console.log('DateInput onChange:', { date, formattedDate });
                          if (date) {
                            // Convert to ISO string for storage
                            const isoString = date.toISOString();
                            console.log('Setting created_at to:', isoString);
                            onFieldChange('created_at', isoString);
                          } else {
                            console.log('Setting created_at to empty');
                            onFieldChange('created_at', '');
                          }
                        }}
                        placeholder="dd/mm/yyyy"
                        showCalendarIcon={true}
                        size="sm"
                        className="text-sm font-semibold text-gray-900"
                      />
                    </div>
                  )}


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
                    <div className="flex items-center space-x-2 flex-shrink-0">
                      <button
                        onClick={onEditClick}
                        className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-primary-700 bg-white border border-primary-200 rounded-md hover:bg-primary-50 hover:border-primary-300 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 shadow-sm"
                      >
                        <svg className="w-3 h-3 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
                      </button>
                      <DeleteButton
                        size="sm"
                        onClick={() => {
                          if (window.confirm(
                            `Are you sure you want to delete client group "${client.name}"?\n\n` +
                            `This will permanently delete:\n` +
                            `• The client group record\n` +
                            `• All associated products and portfolios\n` +
                            `• All portfolio funds and holdings\n` +
                            `• All investment activity history\n` +
                            `• All valuations and IRR calculations\n` +
                            `• All provider switch records\n\n` +
                            `This action CANNOT be undone!`
                          )) {
                            handleDelete();
                          }
                        }}
                        className="ml-2"
                      >
                        Delete Client
                      </DeleteButton>
                    </div>
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

                {/* Total Revenue */}
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Total Revenue
                  </div>
                  <div className="text-2xl font-bold text-blue-600 tracking-tight">
                    {formatCurrency(totalRevenue)}
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

  // Format currency with zero handling (show "-" for zeros except valuations)
  const formatCurrencyWithZeroHandling = (amount: number, isValuation: boolean = false): string => {
    if (amount === 0 && !isValuation) {
      return '-';
    }
    return formatCurrency(amount);
  };

  // Format percentage with 1 decimal place
  const formatPercentage = (value: number | string | null | undefined): string => {
    if (value === null || value === undefined) {
      return 'N/A';
    }
    if (typeof value === 'string') {
      return value; // Return string values as-is (like "-")
    }
    return `${(value).toFixed(1)}%`;
  };

  // Calculate estimated annual revenue with proper validation logic
  const calculateRevenue = (fixedCost?: number, percentageFee?: number, portfolioValue?: number): string | number => {
    // Ensure all values are properly converted to numbers (not strings)
    const fixed = Number(fixedCost) || 0;
    const percentage = Number(percentageFee) || 0;
    const value = Number(portfolioValue) || 0;
    
    // Revenue calculation with proper number conversion
    
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
      // If valuation exists, calculate properly with explicit number conversion
      const percentageFeeAmount = Number((value * percentage) / 100);
      const totalRevenue = Number(fixed + percentageFeeAmount);
      return totalRevenue;
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

  // Sort funds using the same logic as ProductIRRCalculation page
  const sortedFunds = useMemo(() => {
    if (!funds || funds.length === 0) return [];
    
    const fundsToSort = [...funds];
    
    // Sort funds alphabetically, but place Cash at the end and Previous Funds at the very end
    fundsToSort.sort((a, b) => {
      // Previous Funds entry always goes last (virtual entry)
      if (a.is_virtual_entry) return 1;
      if (b.is_virtual_entry) return -1;
      
      // Cash fund always goes second-to-last (before Previous Funds)
      const aIsCash = isCashFund({ fund_name: a.fund_name, isin_number: a.isin_number || '' } as any);
      const bIsCash = isCashFund({ fund_name: b.fund_name, isin_number: b.isin_number || '' } as any);

      if (aIsCash) return 1; // If a is Cash, it should come after non-Cash, non-Virtual
      if (bIsCash) return -1; // If b is Cash, it should come after non-Cash, non-Virtual
                      
      // All other funds are sorted alphabetically
      return a.fund_name.localeCompare(b.fund_name);
    });
    
    return fundsToSort;
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
              <h3 className="text-lg font-medium text-gray-900">{generateProductDisplayName(account)}</h3>
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
            {account.irr !== undefined && account.irr !== null && account.irr !== "-" && typeof account.irr === 'number' && (
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
              <table className="w-full table-fixed divide-y divide-gray-200 text-xs">
                <colgroup>
                  <col className="w-1/4" />
                  <col className="w-[10%]" />
                  <col className="w-[10%]" />
                  <col className="w-[10%]" />
                  <col className="w-[10%]" />
                  <col className="w-[10%]" />
                  <col className="w-[10%]" />
                  <col className="w-[10%]" />
                  <col className="w-[6%]" />
                </colgroup>
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fund Name</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Investment</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Withdraw.</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Fund In</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Fund Out</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Prod. In</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Prod. Out</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Valuation</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">IRR</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedFunds.map((fund) => (
                    <tr 
                      key={fund.id} 
                      className={`${fund.is_virtual_entry ? 'bg-gray-50' : 'hover:bg-gray-50'}`}
                    >
                      <td className="px-3 py-2 text-xs font-medium text-gray-900 truncate" title={fund.fund_name}>
                        {fund.is_virtual_entry ? (
                          <div className="flex items-center">
                            <span className="truncate">{fund.fund_name.split('(')[0]}</span>
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 flex-shrink-0">
                              {fund.inactive_fund_count}
                            </span>
                          </div>
                        ) : (
                          <span className="truncate block">{fund.fund_name}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-right">{formatCurrencyWithZeroHandling(fund.investments || 0)}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-right">{formatCurrencyWithZeroHandling(fund.withdrawals || 0)}</td>
                                      <td className="px-3 py-2 whitespace-nowrap text-xs text-right">{formatCurrencyWithZeroHandling(fund.fund_switch_in || 0)}</td>
                <td className="px-3 py-2 whitespace-nowrap text-xs text-right">{formatCurrencyWithZeroHandling(fund.fund_switch_out || 0)}</td>
                <td className="px-3 py-2 whitespace-nowrap text-xs text-right">{formatCurrencyWithZeroHandling(fund.product_switch_in || 0)}</td>
                <td className="px-3 py-2 whitespace-nowrap text-xs text-right">{formatCurrencyWithZeroHandling(fund.product_switch_out || 0)}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-right">{formatCurrencyWithZeroHandling(fund.market_value || 0, true)}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-xs font-medium text-right">
                        {fund.is_virtual_entry ? (
                          <PreviousFundsIRRDisplay inactiveFundIds={fund.inactive_fund_ids || []} />
                        ) : (
                          fund.irr !== undefined && fund.irr !== null && fund.irr !== "-" ? (
                            typeof fund.irr === 'number' ? (
                              <span className={`font-medium ${
                                fund.irr >= 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {formatPercentage(fund.irr)}
                              </span>
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
                    <td className="px-3 py-2 text-xs font-medium text-gray-900 truncate">TOTAL</td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs font-medium text-right">
                      {formatCurrencyWithZeroHandling(funds.reduce((sum, fund) => sum + (fund.investments || 0), 0))}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs font-medium text-right">
                      {formatCurrencyWithZeroHandling(funds.reduce((sum, fund) => sum + (fund.withdrawals || 0), 0))}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs font-medium text-right">
                      {formatCurrencyWithZeroHandling(funds.reduce((sum, fund) => sum + (fund.fund_switch_in || 0), 0))}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs font-medium text-right">
                      {formatCurrencyWithZeroHandling(funds.reduce((sum, fund) => sum + (fund.fund_switch_out || 0), 0))}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs font-medium text-right">
                      {formatCurrencyWithZeroHandling(funds.reduce((sum, fund) => sum + (fund.product_switch_in || 0), 0))}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs font-medium text-right">
                      {formatCurrencyWithZeroHandling(funds.reduce((sum, fund) => sum + (fund.product_switch_out || 0), 0))}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs font-medium text-right">
                      {formatCurrencyWithZeroHandling(funds.filter(fund => !fund.is_virtual_entry).reduce((sum, fund) => sum + (fund.market_value || 0), 0), true)}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs font-medium text-right">
                      {account.irr !== undefined && account.irr !== null && account.irr !== "-" ? (
                        typeof account.irr === 'number' ? (
                          <span className={`font-medium ${
                            account.irr >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {formatPercentage(account.irr)}
                          </span>
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
  const { navigateToClientGroups, navigateWithSuccessMessage } = useNavigationRefresh();
  
  // React Query hooks for optimized data fetching
  const { data: clientData, isLoading, error: queryError, invalidateClient } = useClientDetails(clientId);
  const { 
    updateClient, 
    changeClientStatus, 
    deleteClient,
    isUpdating,
    isDeleting,
    isChangingStatus
  } = useClientMutations();

  // Handle 404 errors - redirect to client groups if client not found
  useEffect(() => {
    if (queryError && (queryError as any).response?.status === 404) {
      console.warn(`⚠️ Client ${clientId} not found - redirecting to client groups`);
      navigateWithSuccessMessage(
        '/client_groups',
        'Client not found - it may have been deleted'
      );
    }
  }, [queryError, clientId, navigateWithSuccessMessage]);
  
  // Transform data for component compatibility - the API returns { client_group: {...}, products: [...] }
  const apiResponse = clientData as any;
  const client = apiResponse?.client_group ? {
    id: apiResponse.client_group.id,
    name: apiResponse.client_group.name,
    status: apiResponse.client_group.status,
    advisor: apiResponse.client_group.advisor, // Legacy field
    advisor_id: apiResponse.client_group.advisor_id, // New advisor relationship fields
    advisor_name: apiResponse.client_group.advisor_name,
    advisor_email: apiResponse.client_group.advisor_email,
    advisor_first_name: apiResponse.client_group.advisor_first_name,
    advisor_last_name: apiResponse.client_group.advisor_last_name,
    type: apiResponse.client_group.type,
    created_at: apiResponse.client_group.created_at,
    updated_at: apiResponse.client_group.updated_at,
    age: apiResponse.client_group.age,
    gender: apiResponse.client_group.gender,
    product_owners: apiResponse.client_group.product_owners
  } : null;
  
  // The API returns products directly, not as accounts
  const clientAccounts = apiResponse?.products || [];
  
  // Calculate totals from the products data
  const totalFundsUnderManagement = clientAccounts.reduce((sum: number, product: any) => {
    return sum + (product.total_value || 0);
  }, 0);

  // Calculate total revenue across all products
  const totalRevenue = clientAccounts.reduce((sum: number, product: any) => {
    // Ensure all values are properly converted to numbers (prevent NaN)
    const fixedCost = Number(product.fixed_cost) || 0;
    const percentageFee = Number(product.percentage_fee) || 0;
    const portfolioValue = Number(product.total_value) || 0;
    
    // Calculate revenue for this product
    
    // If neither cost type is set, add 0 to sum
    if (!fixedCost && !percentageFee) {
      return sum;
    }
    
    // If only fixed cost is set (no percentage fee)
    if (fixedCost && !percentageFee) {
      return sum + fixedCost;
    }
    
    // If percentage fee is involved (with or without fixed cost)
    if (percentageFee > 0 && portfolioValue > 0) {
      const percentageFeeAmount = Number((portfolioValue * percentageFee) / 100);
      const productRevenue = Number(fixedCost + percentageFeeAmount);
      return sum + productRevenue;
    }
    
    // If percentage fee but no valuation, just add fixed cost if any
    if (percentageFee > 0 && (!portfolioValue || portfolioValue <= 0)) {
      return sum + fixedCost;
    }
    
    return sum;
  }, 0);
  
  // Debug logging for product owners
  console.log('DEBUG: Client data:', {
    client: client,
    client_product_owners: client?.product_owners,
    clientAccounts: clientAccounts,
    first_account_owners: clientAccounts[0]?.product_owners,
    apiResponse: apiResponse
  });
  
  // State for standardized client IRR
  const [standardizedClientIRR, setStandardizedClientIRR] = useState<number | null>(null);
  const [isLoadingClientIRR, setIsLoadingClientIRR] = useState(false);

  // Fetch standardized client IRR when client data is available
  useEffect(() => {
    const fetchStandardizedClientIRR = async () => {
      if (!clientId || !apiResponse?.client_group) return;
      
      setIsLoadingClientIRR(true);
      try {
        const response = await getStandardizedClientIRR(Number(clientId));
        setStandardizedClientIRR(response.data.irr);
      } catch (error) {
        console.error('Error fetching standardized client IRR:', error);
        setStandardizedClientIRR(null);
      } finally {
        setIsLoadingClientIRR(false);
      }
    };

    fetchStandardizedClientIRR();
  }, [clientId, apiResponse?.client_group]);

  // Use standardized IRR if available, show loading state, or fallback to 0
  const totalIRR = isLoadingClientIRR ? "Loading..." : (standardizedClientIRR !== null ? standardizedClientIRR : 0);
    
  const error = queryError ? (queryError as any).response?.data?.detail || 'Failed to fetch client details' : null;
  const [isCorrecting, setIsCorrecting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [availableAdvisors, setAvailableAdvisors] = useState<{ value: string; label: string }[]>([]);
  const [versions, setVersions] = useState<any[]>([]);
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [showRevenueModal, setShowRevenueModal] = useState(false);
  const [revenueFormData, setRevenueFormData] = useState<Record<number, { fixed_cost: string; percentage_fee: string }>>({});
  const [formData, setFormData] = useState<ClientFormData>({
    name: null,
    status: 'active',
    advisor: null,
    advisor_id: null,
    type: null,
    created_at: ''
  });
  
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



  // React Query handles data fetching automatically
  // No manual fetchClientData function needed

  // React Query automatically handles data fetching when clientId changes
  // No useEffect needed for data fetching

  // Fetch available advisors for dropdown using new API
  useEffect(() => {
    const fetchAvailableAdvisors = async () => {
      try {
        const response = await api.get('/advisors');
        const advisors = response.data;
        
        // Convert to dropdown options format with advisor names and IDs
        const advisorOptions = advisors.map((advisor) => ({
          value: advisor.advisor_id.toString(),
          label: advisor.full_name || `${advisor.first_name} ${advisor.last_name}`.trim()
        }));
        
        setAvailableAdvisors(advisorOptions);
      } catch (error) {
        console.error('Error fetching advisors:', error);
        setAvailableAdvisors([]);
      }
    };

    fetchAvailableAdvisors();
  }, [api]);

  // Set all products to be expanded when clientAccounts are updated and populate funds data
  useEffect(() => {
    if (clientAccounts.length > 0) {
      // Get all account IDs
      const allAccountIds = clientAccounts.map((account: any) => account.id);
      
      // Set expanded products state
      setExpandedProducts(allAccountIds);
      
      // Populate the funds data from the API response (funds are already nested in products)
      const fundsData: Record<number, ProductFund[]> = {};
      clientAccounts.forEach((product: any) => {
        if (product.id && product.funds) {
          fundsData[product.id] = product.funds;
        }
      });
      setExpandedProductFunds(fundsData);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientAccounts]);

  const handleBack = () => {
    navigate('/client_groups');
  };

  const handleMakeDormant = async () => {
    if (!clientId) return;
    changeClientStatus.mutate({ clientId, status: 'dormant' });
  };

  const handleMakeActive = async () => {
    if (!clientId) return;
    changeClientStatus.mutate({ clientId, status: 'active' });
  };

  // Format date for display
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const formattedDate = date.toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
    console.log('DEBUG: formatDate - input:', dateString, 'output:', formattedDate);
    return formattedDate;
  };

  const startCorrection = () => {
    if (!client) return;
    
    console.log('DEBUG: startCorrection - client.created_at:', client.created_at);
    console.log('DEBUG: startCorrection - formatDate result:', formatDate(client.created_at));
    
    // Initialize form data with current client values
    setFormData({
      name: client.name,
      status: client.status,
      advisor: client.advisor,
      advisor_id: client.advisor_id || null,
      type: client.type,
      created_at: client.created_at
    });
    
    console.log('DEBUG: startCorrection - formData.created_at set to:', client.created_at);
    
    // Enter correction mode
    setIsCorrecting(true);
  };

  const handleFieldChange = (field: keyof ClientFormData, value: string | null) => {
    console.log('DEBUG: handleFieldChange - field:', field, 'value:', value);
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCorrect = async () => {
    if (!client || !clientId || isUpdating) return;

      // Validate required fields
      if (!formData.name?.trim()) {
      setLocalError('Client name is required');
        return;
      }

    setLocalError(null);
    
    console.log('DEBUG: handleCorrect - current formData:', formData);
    console.log('DEBUG: handleCorrect - client.created_at:', client.created_at);
    console.log('DEBUG: handleCorrect - formData.created_at:', formData.created_at);

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
      
      // Handle advisor_id field change (new advisor relationship)
      if (formData.advisor_id !== client.advisor_id) {
        changedFields.advisor_id = formData.advisor_id;
      }

      // Handle type field change
      if (formData.type !== client.type) {
        changedFields.type = formData.type;
      }
      
      // Handle created_at field change
      if (formData.created_at !== client.created_at) {
        console.log('DEBUG: handleCorrect - created_at has changed from:', client.created_at, 'to:', formData.created_at);
        changedFields.created_at = formData.created_at;
      }
      
      console.log('DEBUG: handleCorrect - changedFields:', changedFields);
      
      // Only perform API call if there are changes
      if (Object.keys(changedFields).length > 0) {
      updateClient.mutate(
        { id: clientId, updates: changedFields },
        {
          onSuccess: () => {
            setIsCorrecting(false);
        console.log('Client updated successfully');
          },
          onError: (err: any) => {
            setLocalError(err.response?.data?.detail || 'Failed to update client details');
            console.error('Error updating client:', err);
      }
        }
      );
    } else {
      console.log('DEBUG: handleCorrect - no changes detected');
      setIsCorrecting(false);
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

  const handleDelete = async () => {
    if (!client || !clientId) return;
      
    deleteClient.mutate(clientId, {
      onSuccess: () => {
      navigateWithSuccessMessage(
        '/client_groups', 
        `Client group "${client.name}" and all associated data deleted successfully`
      );
      },
      onError: (err: any) => {
        setLocalError(err.response?.data?.detail || 'Failed to delete client group');
      console.error('Error deleting client group:', err);
    }
    });
  };

  const handleReactivateProduct = async (productId: number, productName: string) => {
    try {
      if (window.confirm(`Are you sure you want to reactivate the product "${productName}"? This will change its status back to active.`)) {
        const response = await api.patch(`client_products/${productId}/reactivate`);
        if (response.data) {
          // Refresh client data to show the reactivated product
          invalidateClient();
          // Show success notification (you may want to add a toast notification system)
          console.log('Product reactivated successfully');
        }
      }
    } catch (err: any) {
      console.error('Error reactivating product:', err);
      setLocalError(err.response?.data?.detail || 'Failed to reactivate product. Please try again.');
    }
  };



  // Handle revenue assignment save
  const handleRevenueAssignmentSave = async (updates: Record<number, { fixed_cost: number | null; percentage_fee: number | null }>) => {
    try {
      // Call API to update products with revenue data
      for (const [productId, data] of Object.entries(updates)) {
        await api.patch(`/api/client_products/${productId}`, data);
      }
      
      // Refresh client data to show updated values using React Query
      invalidateClient();
      
      console.log('Revenue assignments saved successfully');
    } catch (error: any) {
      console.error('Error saving revenue assignments:', error);
      setLocalError('Failed to save revenue assignments. Please try again.');
    }
  };

  // Function to organize products by type in the specified order
  const organizeProductsByType = (accounts: ClientAccount[]) => {
    const productTypeOrder = ['ISA', 'GIA', 'Onshore Bond', 'Offshore Bond', 'Pension', 'Other'];
    
    const groupedProducts = accounts.reduce((acc, account) => {
      let productType = account.product_type || 'Other';
      
      // Normalize product type names to match the specified order
      if (productType.toLowerCase().includes('isa')) {
        productType = 'ISA';
      } else if (productType.toLowerCase().includes('gia')) {
        productType = 'GIA';
      } else if (productType.toLowerCase().includes('onshore')) {
        productType = 'Onshore Bond';
      } else if (productType.toLowerCase().includes('offshore')) {
        productType = 'Offshore Bond';
      } else if (productType.toLowerCase().includes('pension') || productType.toLowerCase().includes('sipp')) {
        productType = 'Pension';
      } else if (!productTypeOrder.includes(productType)) {
        productType = 'Other';
      }
      
      if (!acc[productType]) {
        acc[productType] = [];
      }
      acc[productType].push(account);
      return acc;
    }, {} as Record<string, ClientAccount[]>);

    // Return organized groups in the specified order with products sorted alphabetically by provider
    return productTypeOrder.map(type => ({
      type,
      products: (groupedProducts[type] || []).sort((a, b) => {
        const providerA = a.provider_name || '';
        const providerB = b.provider_name || '';
        return providerA.localeCompare(providerB);
      })
    })).filter(group => group.products.length > 0);
  };

  // Breadcrumb component with smart navigation
  const Breadcrumbs = () => {
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
      <DynamicPageContainer 
        maxWidth="2800px"
      >
        <div className="flex justify-center items-center py-16">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600"></div>
        </div>
      </DynamicPageContainer>
    );
  }

  // Error state
  if (error || !client) {
    return (
      <DynamicPageContainer 
        maxWidth="2800px"
      >
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
      </DynamicPageContainer>
    );
  }

  return (
    <DynamicPageContainer 
      maxWidth="2800px"
    >
      {/* Breadcrumbs */}
      <Breadcrumbs />

      {/* Client Header */}
      <ClientHeader 
        client={client}
        totalValue={totalFundsUnderManagement}
        totalIRR={totalIRR}
        totalRevenue={totalRevenue}
        onEditClick={startCorrection}
        isEditing={isCorrecting}
        editData={formData}
        onSave={handleCorrect}
        onCancel={() => setIsCorrecting(false)}
        onFieldChange={handleFieldChange}
        isSaving={updateClient.isPending}
        availableAdvisors={availableAdvisors}
        handleDelete={handleDelete}
      />

      {/* Phase 2: Enhanced 6-Tab Navigation System - Fixed isLoading prop */}
      <Phase2TabNavigation 
        client={client} 
        clientAccounts={clientAccounts}
        isLoading={isLoading}
        expandedProducts={expandedProducts}
        toggleProductExpand={toggleProductExpand}
        expandedProductFunds={expandedProductFunds}
        isLoadingFunds={isLoadingFunds}
        organizeProductsByType={organizeProductsByType}
        handleReactivateProduct={handleReactivateProduct}
        showRevenueModal={showRevenueModal}
        setShowRevenueModal={setShowRevenueModal}
        handleRevenueAssignmentSave={handleRevenueAssignmentSave}
      />
    </DynamicPageContainer>
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

  const handleInputChange = (productId: number, field: 'fixed_cost' | 'percentage_fee', value: number | null) => {
    setFormData(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [field]: value !== null ? value.toString() : ''
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
                           <div className="text-xs font-medium text-gray-900">{generateProductDisplayName(account)}</div>
                         </div>
                       </div>
                     </td>
                     <td className="px-4 py-2 whitespace-nowrap text-right">
                       <NumberInput
                         value={productData.fixed_cost}
                         onChange={(value) => handleInputChange(account.id, 'fixed_cost', value)}
                         placeholder="0.00"
                         min={0}
                         decimalPlaces={2}
                         format="currency"
                         currency="£"
                         size="sm"
                         className="w-20 text-xs text-right"
                       />
                     </td>
                     <td className="px-4 py-2 whitespace-nowrap text-right">
                       <NumberInput
                         value={productData.percentage_fee}
                         onChange={(value) => handleInputChange(account.id, 'percentage_fee', value)}
                         placeholder="0.00"
                         min={0}
                         decimalPlaces={2}
                         format="percentage"
                         size="sm"
                         className="w-20 text-xs text-right"
                       />
                     </td>
                     <td className="px-4 py-2 whitespace-nowrap text-right text-xs font-medium text-gray-900">
                       {totalValue > 0 ? formatCurrency(totalValue) : 'No valuation'}
                     </td>
                     <td className="px-4 py-2 whitespace-nowrap text-right text-xs">
                       {typeof percentageRevenue === 'number' ? (
                         <span className="font-medium text-blue-600">{formatCurrency(percentageRevenue)}</span>
                       ) : percentageRevenue === 'Latest valuation needed' ? (
                         <span className="text-orange-600">{percentageRevenue}</span>
                       ) : (
                         <span className="text-gray-500">{percentageRevenue}</span>
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
                   {totals.totalValue > 0 
                     ? `${((totals.percentageRevenue / totals.totalValue) * 100).toFixed(2)}%`
                     : '0.00%'
                   }
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
          <ActionButton
            variant="cancel"
            onClick={onClose}
          />
          <ActionButton
            variant="save"
            context="Revenue Changes"
            loading={isSaving}
            onClick={handleSave}
          />
        </div>
      </div>
    </div>
  );
};

// Phase 2: Enhanced 5-Tab Navigation Component
const Phase2TabNavigation: React.FC<{ 
  client: Client | null; 
  clientAccounts: ClientAccount[];
  isLoading: boolean;
  expandedProducts: number[];
  toggleProductExpand: (productId: number) => void;
  expandedProductFunds: Record<number, ProductFund[]>;
  isLoadingFunds: Record<number, boolean>;
  organizeProductsByType: (accounts: ClientAccount[]) => { type: string; products: ClientAccount[] }[];
  handleReactivateProduct: (productId: number, productName: string) => void;
  showRevenueModal: boolean;
  setShowRevenueModal: (show: boolean) => void;
  handleRevenueAssignmentSave: (updates: Record<number, { fixed_cost: number | null; percentage_fee: number | null }>) => void;
}> = ({ 
  client, 
  clientAccounts, 
  isLoading,
  expandedProducts,
  toggleProductExpand,
  expandedProductFunds,
  isLoadingFunds,
  organizeProductsByType,
  handleReactivateProduct,
  showRevenueModal,
  setShowRevenueModal,
  handleRevenueAssignmentSave
}) => {
  const [activeTab, setActiveTab] = useState('overview');

  // Mock data for demonstration
  const mockInformationItems = [
    {
      id: 1,
      item_type: 'basic_detail',
      item_category: 'Home Address',
      data_content: {
        address_line_one: '123 Main Street',
        address_line_two: 'Apartment 4B',
        postcode: 'SW1A 1AA',
        country: 'United Kingdom',
        residence_type: 'Primary'
      },
      updated_at: '2024-08-26T14:15:00Z',
      last_edited_by_name: 'John Advisor'
    },
    {
      id: 2,
      item_type: 'assets_liabilities',
      item_category: 'Bank Account',
      data_content: {
        bank: 'Barclays',
        account_type: 'Current Account',
        latest_valuation: 15000,
        valuation_date: '2024-08-26',
        associated_product_owners: {
          association_type: 'joint_ownership',
          '123': 50,
          '456': 50
        }
      },
      updated_at: '2024-08-25T10:30:00Z',
      last_edited_by_name: 'Jane Smith'
    }
  ];

  const mockUnmanagedProducts = [
    {
      id: 1,
      product_name: 'Halifax Cash ISA',
      product_type: 'Cash_ISAs',
      provider_name: 'Halifax',
      latest_valuation: 20000,
      valuation_date: '2024-08-26',
      ownership_details: {
        association_type: 'individual',
        '123': 100
      },
      status: 'active'
    },
    {
      id: 2,
      product_name: 'Santander Current Account',
      product_type: 'Bank_Accounts',
      provider_name: 'Santander',
      latest_valuation: 8500,
      valuation_date: '2024-08-26',
      ownership_details: {
        association_type: 'joint_ownership',
        '123': 50,
        '456': 50
      },
      status: 'active'
    }
  ];

  const tabs = [
    { id: 'overview', label: 'Client Overview', icon: '👤' },
    { id: 'mainlist', label: 'Main List', icon: '📋', badge: mockInformationItems.length },
    { id: 'objectives', label: 'Aims, Objectives, Actions', icon: '🎯' },
    { id: 'networth', label: 'Networth Statement', icon: '📊' },
    { id: 'kyc', label: 'Know Your Customer', icon: '📄' },
    { id: 'managed', label: 'Managed Products', icon: '💼', badge: clientAccounts?.length || 0 }
  ];

  return (
    <div className="mb-8">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 bg-white rounded-t-lg shadow-sm">
        <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600 bg-primary-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-3 border-b-2 font-medium text-sm rounded-t-md transition-all duration-200 flex items-center space-x-2`}
            >
              <span className="text-base">{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.badge && (
                <span className="ml-2 bg-primary-100 text-primary-800 text-xs font-medium px-2 py-1 rounded-full">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-b-lg shadow-sm border border-t-0 border-gray-200 p-6">
        {activeTab === 'overview' && <ClientOverviewTab client={client} clientAccounts={clientAccounts} />}
        {activeTab === 'mainlist' && <MainListTab informationItems={mockInformationItems} />}
        {activeTab === 'objectives' && <ObjectivesTab />}
        {activeTab === 'networth' && <NetworthTab client={client} unmanagedProducts={mockUnmanagedProducts} />}
        {activeTab === 'kyc' && <KYCTab client={client} />}
        {activeTab === 'managed' && (
          <ManagedProductsTab 
            client={client} 
            clientAccounts={clientAccounts}
            isLoading={isLoading}
            expandedProducts={expandedProducts}
            toggleProductExpand={toggleProductExpand}
            expandedProductFunds={expandedProductFunds}
            isLoadingFunds={isLoadingFunds}
            organizeProductsByType={organizeProductsByType}
            handleReactivateProduct={handleReactivateProduct}
            showRevenueModal={showRevenueModal}
            setShowRevenueModal={setShowRevenueModal}
            handleRevenueAssignmentSave={handleRevenueAssignmentSave}
          />
        )}
      </div>
    </div>
  );
};

// Tab Components
const ClientOverviewTab: React.FC<{ client: Client | null; clientAccounts: ClientAccount[] }> = ({ client, clientAccounts }) => {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium text-gray-900">Enhanced Client Overview</h3>
        <span className="text-sm text-gray-500">Phase 2 Preview - Enhanced with product owner cards</span>
      </div>
      
      {/* Product Owner Cards Preview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {/* John Smith Product Owner Card */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
              JS
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">John Smith</h4>
              <p className="text-sm text-gray-600">Primary Client</p>
            </div>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-gray-600 font-medium">Email:</span>
                <div className="text-gray-900">john.smith@email.com</div>
              </div>
              <div>
                <span className="text-gray-600 font-medium">Phone:</span>
                <div className="text-gray-900">07700 900123</div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-gray-600 font-medium">DOB:</span>
                <div className="text-gray-900">15/03/1975</div>
              </div>
              <div>
                <span className="text-gray-600 font-medium">Known As:</span>
                <div className="text-gray-900">John</div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-gray-600 font-medium">Title:</span>
                <div className="text-gray-900">Mr</div>
              </div>
              <div>
                <span className="text-gray-600 font-medium">NI Number:</span>
                <div className="text-gray-900">AB123456C</div>
              </div>
            </div>
            
            <div className="mt-3 pt-2 border-t border-blue-200">
              <div className="mb-2">
                <span className="text-gray-600 font-medium">Security Words:</span>
                <div className="text-gray-900">Summer, London, Football</div>
              </div>
              
              <div className="mb-2">
                <span className="text-gray-600 font-medium">Notes:</span>
                <div className="text-gray-900 text-xs">Prefers morning appointments. Retired teacher.</div>
              </div>
              
              <div className="grid grid-cols-1 gap-1">
                <div>
                  <span className="text-gray-600 font-medium">Next Meeting:</span>
                  <div className="text-gray-900 text-xs">15/09/2024 10:00 AM</div>
                </div>
                <div>
                  <span className="text-gray-600 font-medium">Last T&Cs:</span>
                  <div className="text-gray-900 text-xs">12/01/2024</div>
                </div>
                <div>
                  <span className="text-gray-600 font-medium">Last Fee Agreement:</span>
                  <div className="text-gray-900 text-xs">12/01/2024</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mary Smith Product Owner Card */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
              MS
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">Mary Smith</h4>
              <p className="text-sm text-gray-600">Spouse</p>
            </div>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-gray-600 font-medium">Email:</span>
                <div className="text-gray-900">mary.smith@email.com</div>
              </div>
              <div>
                <span className="text-gray-600 font-medium">Phone:</span>
                <div className="text-gray-900">07700 900124</div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-gray-600 font-medium">DOB:</span>
                <div className="text-gray-900">22/07/1978</div>
              </div>
              <div>
                <span className="text-gray-600 font-medium">Known As:</span>
                <div className="text-gray-900">Mary</div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-gray-600 font-medium">Title:</span>
                <div className="text-gray-900">Mrs</div>
              </div>
              <div>
                <span className="text-gray-600 font-medium">NI Number:</span>
                <div className="text-gray-900">CD789012F</div>
              </div>
            </div>
            
            <div className="mt-3 pt-2 border-t border-purple-200">
              <div className="mb-2">
                <span className="text-gray-600 font-medium">Security Words:</span>
                <div className="text-gray-900">Garden, Paris, Reading</div>
              </div>
              
              <div className="mb-2">
                <span className="text-gray-600 font-medium">Notes:</span>
                <div className="text-gray-900 text-xs">Works from home. Architect. Prefers video calls.</div>
              </div>
              
              <div className="grid grid-cols-1 gap-1">
                <div>
                  <span className="text-gray-600 font-medium">Next Meeting:</span>
                  <div className="text-gray-900 text-xs">15/09/2024 10:00 AM</div>
                </div>
                <div>
                  <span className="text-gray-600 font-medium">Last T&Cs:</span>
                  <div className="text-gray-900 text-xs">12/01/2024</div>
                </div>
                <div>
                  <span className="text-gray-600 font-medium">Last Fee Agreement:</span>
                  <div className="text-gray-900 text-xs">12/01/2024</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Note about existing functionality */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h4 className="text-sm font-medium text-blue-900">Client Overview Enhancement</h4>
            <p className="text-sm text-blue-700 mt-1">
              This tab will display enhanced product owner cards with detailed information, inception dates, and vulnerability indicators. 
              Your existing client products functionality remains unchanged below.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const MainListTab: React.FC<{ informationItems: any[] }> = ({ informationItems }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const itemTypes = [
    { value: 'all', label: 'All Items' },
    { value: 'basic_detail', label: 'Basic Details' },
    { value: 'income_expenditure', label: 'Income & Expenditure' },
    { value: 'assets_liabilities', label: 'Assets & Liabilities' },
    { value: 'protection', label: 'Protection' },
    { value: 'vulnerability_health', label: 'Vulnerability & Health' }
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium text-gray-900">Client Information Items</h3>
        <AddButton onClick={() => setShowCreateModal(true)} context="Information Item" />
      </div>

      {/* Search and Filter */}
      <div className="flex items-center space-x-4 mb-6">
        <div className="flex-1 max-w-md">
          <BaseInput
            placeholder="Search across item types, categories, and content..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>
        <BaseDropdown
          options={itemTypes}
          value={selectedType}
          onChange={setSelectedType}
          className="min-w-40"
        />
      </div>

      {/* Information Items Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900">Information Items</h4>
            <span className="text-sm text-gray-500">{informationItems.length} items</span>
          </div>
        </div>
        
        <div className="divide-y divide-gray-200">
          {informationItems.map((item) => (
            <div key={item.id} className="px-6 py-4 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      item.item_type === 'basic_detail' ? 'bg-blue-100 text-blue-800' :
                      item.item_type === 'assets_liabilities' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {item.item_type.replace('_', ' ')}
                    </span>
                    <h5 className="font-medium text-gray-900">{item.item_category}</h5>
                  </div>
                  
                  <div className="mt-2 text-sm text-gray-600">
                    {item.item_type === 'basic_detail' && (
                      <p>{item.data_content.address_line_one}, {item.data_content.postcode}</p>
                    )}
                    {item.item_type === 'assets_liabilities' && (
                      <p>{item.data_content.bank} - £{item.data_content.latest_valuation?.toLocaleString()}</p>
                    )}
                  </div>
                  
                  <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                    <span>Updated: {new Date(item.updated_at).toLocaleDateString()}</span>
                    <span>By: {item.last_edited_by_name}</span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <EditButton size="sm" />
                  <DeleteButton size="sm" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create Item Modal Preview */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Create Information Item</h3>
            </div>
            <div className="px-6 py-4">
              <p className="text-sm text-gray-600 mb-4">
                This modal will allow creation of new client information items with structured JSON data.
              </p>
              <div className="space-y-4">
                <BaseDropdown
                  options={itemTypes.slice(1)}
                  value=""
                  onChange={() => {}}
                  placeholder="Select item type..."
                />
                <BaseInput
                  placeholder="Item category (e.g., Home Address, Bank Account)"
                  value=""
                  onChange={() => {}}
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <ActionButton variant="cancel" onClick={() => setShowCreateModal(false)}>
                Cancel
              </ActionButton>
              <ActionButton variant="save" onClick={() => setShowCreateModal(false)}>
                Create Item
              </ActionButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ObjectivesTab: React.FC = () => {
  const mockObjectives = [
    { 
      id: 1, 
      title: 'Retirement Planning', 
      description: 'Build a comprehensive retirement portfolio targeting £750,000 by age 65. Focus on maximizing pension contributions and ISA allowances while maintaining appropriate risk levels for long-term growth.',
      priority: 'high', 
      start_date: '2024-01-15',
      target_date: '2030-12-31',
      last_discussed: '2024-08-20',
      status: 'on-target' 
    },
    { 
      id: 2, 
      title: 'House Purchase', 
      description: 'Save for deposit on family home in Surrey area. Target property value £450,000 requiring £90,000 deposit plus stamp duty and legal costs. Maintain funds in accessible investments.',
      priority: 'medium', 
      start_date: '2024-03-10',
      target_date: '2026-06-30',
      last_discussed: '2024-08-15',
      status: 'needs revision' 
    },
    { 
      id: 3, 
      title: 'Children\'s Education Fund', 
      description: 'Establish education savings for two children currently aged 8 and 10. Target £40,000 per child for university costs including accommodation. Utilize Junior ISAs and education-specific savings products.',
      priority: 'medium', 
      start_date: '2024-02-01',
      target_date: '2032-09-01',
      last_discussed: '2024-08-25',
      status: 'on-target' 
    }
  ];

  const mockActions = [
    { 
      id: 1, 
      title: 'Review pension contributions', 
      description: 'Analyze current pension contributions across all schemes including workplace pension and SIPP. Consider increasing contributions to maximize annual allowance and tax efficiency. Review provider performance and fees.',
      objective_id: 1,
      date_created: '2024-08-15',
      target_date: '2024-09-15',
      drop_dead_date: '2024-09-20',
      status: 'todo', 
      assigned_to: 'John Advisor',
      assignment_type: 'advisor'
    },
    { 
      id: 2, 
      title: 'Update risk assessment', 
      description: 'Complete comprehensive risk tolerance questionnaire and capacity for loss assessment. Update client risk profile to reflect recent salary increase and changing family circumstances.',
      objective_id: null,
      date_created: '2024-08-10',
      target_date: '2024-08-30',
      drop_dead_date: '2024-09-05',
      status: 'completed', 
      assigned_to: 'Jane Smith',
      assignment_type: 'advisor'
    },
    { 
      id: 3, 
      title: 'Provide salary documentation', 
      description: 'Gather and provide recent P60s, last 3 months payslips, and employment contract. Client to collect these documents from HR department and scan for secure upload.',
      objective_id: 2,
      date_created: '2024-08-20',
      target_date: '2024-09-20',
      drop_dead_date: '2024-09-25',
      status: 'todo', 
      assigned_to: 'John Smith (Client)',
      assignment_type: 'client'
    },
    { 
      id: 4, 
      title: 'Complete risk questionnaire', 
      description: 'Fill out comprehensive attitude to risk questionnaire online. Client to complete all sections including capacity for loss assessment and investment experience details.',
      objective_id: null,
      date_created: '2024-08-18',
      target_date: '2024-09-25',
      drop_dead_date: '2024-09-30',
      status: 'todo', 
      assigned_to: 'Mary Smith (Client)',
      assignment_type: 'client'
    },
    { 
      id: 5, 
      title: 'Property valuation report', 
      description: 'Independent surveyor to conduct full structural survey and valuation of current property for refinancing purposes. Third-party appointment arranged through mortgage broker.',
      objective_id: 2,
      date_created: '2024-08-25',
      target_date: '2024-10-10',
      drop_dead_date: '2024-10-15',
      status: 'todo', 
      assigned_to: 'ABC Surveyors Ltd',
      assignment_type: 'other'
    },
    { 
      id: 6, 
      title: 'Set up Junior ISAs', 
      description: 'Open Junior ISA accounts for both children and set up monthly contributions. Research education-specific savings products and compare with standard Junior ISA options for optimal tax-efficient growth.',
      objective_id: 3,
      date_created: '2024-08-22',
      target_date: '2024-11-01',
      drop_dead_date: '2024-11-10',
      status: 'todo', 
      assigned_to: 'Sarah Williams',
      assignment_type: 'advisor'
    },
    { 
      id: 7, 
      title: 'Gather bank statements', 
      description: 'Collect and provide last 6 months bank statements for all current accounts, savings accounts, and credit cards. Required for mortgage application and financial planning review.',
      objective_id: 2,
      date_created: '2024-08-05',
      target_date: '2024-08-25',
      drop_dead_date: '2024-08-30',
      status: 'completed', 
      assigned_to: 'John Smith (Client)',
      assignment_type: 'client'
    },
    { 
      id: 8, 
      title: 'Initial portfolio review', 
      description: 'Comprehensive review of existing investment portfolio including performance analysis, risk assessment, and alignment with client objectives. Identified opportunities for optimization.',
      objective_id: 1,
      date_created: '2024-08-01',
      target_date: '2024-08-20',
      drop_dead_date: '2024-08-25',
      status: 'completed', 
      assigned_to: 'John Advisor',
      assignment_type: 'advisor'
    }
  ];

  // Filter actions by status
  const todoActions = mockActions.filter(action => action.status === 'todo');
  const completedActions = mockActions.filter(action => action.status === 'completed');

  // Get actions for each objective
  const getActionsForObjective = (objectiveId: number) => {
    return mockActions.filter(action => action.objective_id === objectiveId);
  };

  // Get unlinked actions (not associated with any objective)
  const unlinkedActions = mockActions.filter(action => action.objective_id === null);

  // State for collapsible sections
  const [expandedObjectives, setExpandedObjectives] = React.useState<Record<number, boolean>>({});

  const toggleObjectiveExpansion = (objectiveId: number) => {
    setExpandedObjectives(prev => ({
      ...prev,
      [objectiveId]: !prev[objectiveId]
    }));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium text-gray-900">Client Aims, Objectives & Actions</h3>
        <div className="flex space-x-2">
          <AddButton context="Objective" size="sm" />
          <AddButton context="Action" size="sm" />
        </div>
      </div>

      {/* Objectives Section */}
      <div className="mb-8">
        <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center">
          <span className="text-lg mr-2">🎯</span>
          Client Objectives
        </h4>
        <div className="space-y-4">
          {mockObjectives.map((objective) => {
            const objectiveActions = getActionsForObjective(objective.id);
            const isExpanded = expandedObjectives[objective.id] || false;
            
            return (
              <div key={objective.id} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h5 className="font-medium text-gray-900">{objective.title}</h5>
                    <p className="mt-2 text-sm text-gray-600 leading-relaxed">{objective.description}</p>
                    
                    {/* Objective Details */}
                    <div className="grid grid-cols-2 gap-4 mt-3 text-sm text-gray-500">
                      <div className="space-y-1">
                        <span>Started: {new Date(objective.start_date).toLocaleDateString()}</span>
                        <span>Target: {new Date(objective.target_date).toLocaleDateString()}</span>
                      </div>
                      <div className="space-y-1">
                        <span>Last Discussed: {new Date(objective.last_discussed).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4 mt-3 text-sm text-gray-500">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        objective.priority === 'high' ? 'bg-red-100 text-red-800' :
                        objective.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {objective.priority} priority
                      </span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        objective.status === 'on-target' ? 'bg-green-100 text-green-800' :
                        objective.status === 'needs revision' ? 'bg-orange-100 text-orange-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {objective.status === 'on-target' ? 'On Target' : 
                         objective.status === 'needs revision' ? 'Needs Revision' : 
                         objective.status}
                      </span>
                    </div>

                    {/* Linked Actions Section */}
                    {objectiveActions.length > 0 && (
                      <div className="mt-4">
                        <button
                          onClick={() => toggleObjectiveExpansion(objective.id)}
                          className="flex items-center space-x-2 text-sm text-primary-600 hover:text-primary-700"
                        >
                          <span className={`transform transition-transform ${isExpanded ? 'rotate-90' : 'rotate-0'}`}>
                            ▶
                          </span>
                          <span>{objectiveActions.length} Linked Action{objectiveActions.length !== 1 ? 's' : ''}</span>
                        </button>
                        
                        {isExpanded && (
                          <div className="mt-3 space-y-3 pl-4 border-l-2 border-primary-100">
                            {objectiveActions.map((action) => (
                              <div key={action.id} className="bg-gray-50 rounded-lg p-3">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <h6 className="font-medium text-gray-900 text-sm">{action.title}</h6>
                                    <p className="mt-1 text-xs text-gray-600">{action.description}</p>
                                    <div className="flex items-center space-x-3 mt-2 text-xs text-gray-500">
                                      <span>Created: {new Date(action.date_created).toLocaleDateString()}</span>
                                      <span>Target: {new Date(action.target_date).toLocaleDateString()}</span>
                                      <span className="text-red-600 font-medium">Drop Dead: {new Date(action.drop_dead_date).toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex items-center space-x-3 mt-1 text-xs text-gray-500">
                                      <span>Assigned to: {action.assigned_to}</span>
                                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${
                                        action.assignment_type === 'advisor' ? 'bg-blue-100 text-blue-800' :
                                        action.assignment_type === 'client' ? 'bg-purple-100 text-purple-800' :
                                        'bg-gray-100 text-gray-800'
                                      }`}>
                                        {action.assignment_type === 'advisor' ? '👨‍💼 Advisor' : 
                                         action.assignment_type === 'client' ? '👤 Client' : 
                                         '🏢 Third Party'}
                                      </span>
                                      {action.status === 'completed' && (
                                        <span className="text-green-600">✓ Completed</span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex space-x-1 ml-2">
                                    <EditButton size="xs" />
                                    <DeleteButton size="xs" />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex space-x-2 ml-4">
                    <EditButton size="sm" />
                    <DeleteButton size="sm" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Unlinked To-Do Actions Section */}
      <div className="mb-8">
        <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center">
          <span className="text-lg mr-2">📋</span>
          Unlinked To-Do Actions
          <span className="ml-3 bg-yellow-100 text-yellow-800 text-xs font-medium px-2 py-1 rounded-full">
            {unlinkedActions.filter(action => action.status === 'todo').length}
          </span>
        </h4>
        <div className="space-y-4">
          {unlinkedActions.filter(action => action.status === 'todo').map((action) => (
            <div key={action.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h5 className="font-medium text-gray-900">{action.title}</h5>
                  <p className="mt-2 text-sm text-gray-600 leading-relaxed">{action.description}</p>
                  <div className="flex items-center space-x-4 mt-3 text-sm text-gray-500">
                    <span>Created: {new Date(action.date_created).toLocaleDateString()}</span>
                    <span>Target: {new Date(action.target_date).toLocaleDateString()}</span>
                    <span className="text-red-600 font-medium">Drop Dead: {new Date(action.drop_dead_date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                    <span>Assigned to: {action.assigned_to}</span>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      action.assignment_type === 'advisor' ? 'bg-blue-100 text-blue-800' :
                      action.assignment_type === 'client' ? 'bg-purple-100 text-purple-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {action.assignment_type === 'advisor' ? '👨‍💼 Advisor' : 
                       action.assignment_type === 'client' ? '👤 Client' : 
                       '🏢 Third Party'}
                    </span>
                  </div>
                </div>
                <div className="flex space-x-2 ml-4">
                  <EditButton size="sm" />
                  <DeleteButton size="sm" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Unlinked Completed Actions Section */}
      <div>
        <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center">
          <span className="text-lg mr-2">✅</span>
          Unlinked Completed Actions
          <span className="ml-3 bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded-full">
            {unlinkedActions.filter(action => action.status === 'completed').length}
          </span>
        </h4>
        <div className="space-y-4">
          {unlinkedActions.filter(action => action.status === 'completed').map((action) => (
            <div key={action.id} className="bg-white border border-gray-200 rounded-lg p-4 opacity-75">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h5 className="font-medium text-gray-900 flex items-center">
                    {action.title}
                    <span className="ml-2 text-green-600">✓</span>
                  </h5>
                  <p className="mt-2 text-sm text-gray-600 leading-relaxed">{action.description}</p>
                  <div className="flex items-center space-x-4 mt-3 text-sm text-gray-500">
                    <span>Created: {new Date(action.date_created).toLocaleDateString()}</span>
                    <span>Target: {new Date(action.target_date).toLocaleDateString()}</span>
                    <span className="text-red-600 font-medium">Drop Dead: {new Date(action.drop_dead_date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                    <span>Assigned to: {action.assigned_to}</span>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      action.assignment_type === 'advisor' ? 'bg-blue-100 text-blue-800' :
                      action.assignment_type === 'client' ? 'bg-purple-100 text-purple-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {action.assignment_type === 'advisor' ? '👨‍💼 Advisor' : 
                       action.assignment_type === 'client' ? '👤 Client' : 
                       '🏢 Third Party'}
                    </span>
                  </div>
                </div>
                <div className="flex space-x-2 ml-4">
                  <EditButton size="sm" />
                  <DeleteButton size="sm" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const NetworthTab: React.FC<{ client: Client | null; unmanagedProducts: any[] }> = ({ client, unmanagedProducts }) => {
  const [showCreateSnapshot, setShowCreateSnapshot] = useState(false);

  // Mock networth data structured by item types and individual items
  const mockNetworthData = {
    item_types: [
      {
        type: 'GIAs',
        items: [
          {
            name: 'Zurich Vista GIA',
            is_managed: true,
            john: 125000,
            mary: 95000,
            joint: 0,
            total: 220000
          }
        ]
      },
      {
        type: 'Cash ISAs',
        items: [
          {
            name: 'Halifax Instant Saver ISA',
            is_managed: false,
            john: 20000,
            mary: 0,
            joint: 0,
            total: 20000
          },
          {
            name: 'Santander Easy Access ISA',
            is_managed: false,
            john: 0,
            mary: 15000,
            joint: 0,
            total: 15000
          }
        ]
      },
      {
        type: 'Bank Accounts',
        items: [
          {
            name: 'Natwest Current Account',
            is_managed: true,
            john: 2250,
            mary: 1750,
            joint: 0,
            total: 4000
          },
          {
            name: 'Barclays (unmanaged)',
            is_managed: false,
            john: 0,
            mary: 0,
            joint: 4500,
            total: 4500
          },
          {
            name: 'Nationwide FlexDirect',
            is_managed: false,
            john: 2000,
            mary: 2500,
            joint: 0,
            total: 4500
          }
        ]
      },
      {
        type: 'Pensions',
        items: [
          {
            name: 'John Workplace Pension',
            is_managed: true,
            john: 85000,
            mary: 0,
            joint: 0,
            total: 85000
          },
          {
            name: 'Mary SIPP',
            is_managed: true,
            john: 0,
            mary: 120000,
            joint: 0,
            total: 120000
          }
        ]
      }
    ],
    summary: {
      managed_total: 425000,
      unmanaged_total: 48000,
      total_assets: 473000,
      total_liabilities: 25000,
      net_worth: 448000
    }
  };

  const mockHistoricalSnapshots = [
    { id: 1, created_at: '2024-08-26T14:30:00Z', net_worth: 475000, created_by: 'John Advisor' },
    { id: 2, created_at: '2024-07-26T10:15:00Z', net_worth: 462000, created_by: 'John Advisor' },
    { id: 3, created_at: '2024-06-26T16:45:00Z', net_worth: 445000, created_by: 'Jane Smith' }
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium text-gray-900">Networth Statement</h3>
        <div className="flex gap-3">
          <ActionButton variant="edit" onClick={() => window.print()}>
            🖨️ Print Statement
          </ActionButton>
          <ActionButton variant="add" onClick={() => setShowCreateSnapshot(true)}>
            📸 Create Snapshot
          </ActionButton>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-sm font-medium text-blue-900">Net Worth</div>
          <div className="text-2xl font-bold text-blue-900">£{mockNetworthData.summary.net_worth.toLocaleString()}</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-sm font-medium text-green-900">Total Assets</div>
          <div className="text-2xl font-bold text-green-900">£{mockNetworthData.summary.total_assets.toLocaleString()}</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-sm font-medium text-red-900">Total Liabilities</div>
          <div className="text-2xl font-bold text-red-900">£{mockNetworthData.summary.total_liabilities.toLocaleString()}</div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="text-sm font-medium text-purple-900">Change Since Last Snapshot</div>
          <div className="text-lg font-bold text-green-600">+£12,500</div>
          <div className="text-sm font-medium text-green-600">+2.8%</div>
          <div className="text-xs text-purple-700 mt-1">Apr 24 to Aug 25</div>
        </div>
      </div>

      {/* Networth Table Preview */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h4 className="font-medium text-gray-900">Current Networth Breakdown</h4>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asset Type & Items</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">John</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Mary</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Joint</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {mockNetworthData.item_types.map((itemType, index) => {
                const typeTotal = itemType.items.reduce((acc, item) => ({
                  john: acc.john + item.john,
                  mary: acc.mary + item.mary,
                  joint: acc.joint + item.joint,
                  total: acc.total + item.total
                }), { john: 0, mary: 0, joint: 0, total: 0 });

                return (
                  <React.Fragment key={index}>
                    {/* Section Header */}
                    <tr className="border-t-2 border-gray-400">
                      <td className="px-6 py-4 text-sm font-bold text-gray-800 uppercase tracking-wide" colSpan={5}>
                        {itemType.type}
                      </td>
                    </tr>
                    
                    {/* Individual Items */}
                    {itemType.items.map((item, itemIndex) => (
                      <tr key={itemIndex} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="px-6 py-3 text-sm text-gray-700 pl-8">
                          <div className="flex items-center gap-2">
                            {item.name}
                            {item.is_managed ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Managed
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                Unmanaged
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-700 text-right">
                          {item.john > 0 ? `£${item.john.toLocaleString()}` : '—'}
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-700 text-right">
                          {item.mary > 0 ? `£${item.mary.toLocaleString()}` : '—'}
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-700 text-right">
                          {item.joint > 0 ? `£${item.joint.toLocaleString()}` : '—'}
                        </td>
                        <td className="px-6 py-3 text-sm font-medium text-gray-900 text-right">
                          £{item.total.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                    
                    {/* Section Total */}
                    <tr className="bg-gray-100 border-b-2 border-gray-300 font-medium">
                      <td className="px-6 py-3 text-sm font-semibold text-gray-900 pl-8 italic">
                        {itemType.type} Total
                      </td>
                      <td className="px-6 py-3 text-sm font-semibold text-gray-900 text-right">
                        {typeTotal.john > 0 ? `£${typeTotal.john.toLocaleString()}` : '—'}
                      </td>
                      <td className="px-6 py-3 text-sm font-semibold text-gray-900 text-right">
                        {typeTotal.mary > 0 ? `£${typeTotal.mary.toLocaleString()}` : '—'}
                      </td>
                      <td className="px-6 py-3 text-sm font-semibold text-gray-900 text-right">
                        {typeTotal.joint > 0 ? `£${typeTotal.joint.toLocaleString()}` : '—'}
                      </td>
                      <td className="px-6 py-3 text-sm font-semibold text-gray-900 text-right">
                        £{typeTotal.total.toLocaleString()}
                      </td>
                    </tr>
                  </React.Fragment>
                );
              })}
              
              {/* Grand Total */}
              <tr className="border-t-4 border-gray-600 bg-gray-50">
                <td className="px-6 py-5 text-base font-bold text-gray-900 uppercase tracking-wide">
                  TOTAL ASSETS
                </td>
                <td className="px-6 py-5 text-base font-bold text-gray-900 text-right">
                  £{mockNetworthData.item_types.reduce((acc, type) => 
                    acc + type.items.reduce((itemAcc, item) => itemAcc + item.john, 0), 0
                  ).toLocaleString()}
                </td>
                <td className="px-6 py-5 text-base font-bold text-gray-900 text-right">
                  £{mockNetworthData.item_types.reduce((acc, type) => 
                    acc + type.items.reduce((itemAcc, item) => itemAcc + item.mary, 0), 0
                  ).toLocaleString()}
                </td>
                <td className="px-6 py-5 text-base font-bold text-gray-900 text-right">
                  £{mockNetworthData.item_types.reduce((acc, type) => 
                    acc + type.items.reduce((itemAcc, item) => itemAcc + item.joint, 0), 0
                  ).toLocaleString()}
                </td>
                <td className="px-6 py-5 text-base font-bold text-gray-900 text-right">
                  £{mockNetworthData.summary.total_assets.toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Historical Snapshots */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-md font-medium text-gray-900">Historical Snapshots</h4>
          <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
            📋 Full table data preserved for each snapshot
          </div>
        </div>
        <div className="space-y-3">
          {mockHistoricalSnapshots.map((snapshot) => (
            <div key={snapshot.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <div className="font-medium text-gray-900">
                    {new Date(snapshot.created_at).toLocaleString()}
                  </div>
                  <div className="text-sm font-semibold text-green-700">
                    Net Worth: £{snapshot.net_worth.toLocaleString()}
                  </div>
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  Created by: {snapshot.created_by} • Complete table breakdown preserved
                </div>
              </div>
              <div className="flex space-x-2">
                <ActionButton variant="edit" size="sm">
                  👁️ View Full Table
                </ActionButton>
                <ActionButton variant="add" size="sm">
                  🖨️ Print PDF
                </ActionButton>
                <ActionButton variant="cancel" size="sm">
                  📊 Compare
                </ActionButton>
              </div>
            </div>
          ))}
        </div>
        
        {/* Snapshot Info Box */}
        <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="text-blue-500 mt-0.5">ℹ️</div>
            <div>
              <h5 className="text-sm font-medium text-gray-900 mb-1">About Historical Snapshots</h5>
              <p className="text-xs text-gray-600">
                Each snapshot preserves the complete networth statement table as it appeared at that moment, including all individual items, ownership breakdown, managed/unmanaged status, and section subtotals. This enables accurate historical comparison and compliance reporting.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Create Snapshot Modal */}
      {showCreateSnapshot && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Create Networth Snapshot</h3>
            </div>
            <div className="px-6 py-4">
              <p className="text-sm text-gray-600 mb-4">
                This will capture the <strong>complete networth statement table</strong> including all asset categories, individual items, ownership breakdown, and management status as of {new Date().toLocaleString()} for audit and compliance purposes.
              </p>
              
              {/* What gets saved */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <h4 className="text-sm font-semibold text-blue-900 mb-2">📊 Complete Data Capture Includes:</h4>
                <ul className="text-xs text-blue-800 space-y-1 ml-4">
                  <li>• Full hierarchical table structure by asset type</li>
                  <li>• Individual item details and managed/unmanaged status</li>
                  <li>• Ownership breakdown (John, Mary, Joint holdings)</li>
                  <li>• Section subtotals and grand totals</li>
                  <li>• Historical comparison capability</li>
                </ul>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Current Statement Summary:</h4>
                <div className="text-sm space-y-2">
                  <div className="flex justify-between">
                    <span>Asset Categories:</span>
                    <span className="font-medium">{mockNetworthData.item_types.length} types</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Individual Items:</span>
                    <span className="font-medium">{mockNetworthData.item_types.reduce((acc, type) => acc + type.items.length, 0)} items</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Assets:</span>
                    <span className="font-medium">£{mockNetworthData.summary.total_assets.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Liabilities:</span>
                    <span className="font-medium">£{mockNetworthData.summary.total_liabilities.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-semibold border-t pt-2">
                    <span>Net Worth:</span>
                    <span>£{mockNetworthData.summary.net_worth.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <ActionButton variant="cancel" onClick={() => setShowCreateSnapshot(false)}>
                Cancel
              </ActionButton>
              <ActionButton variant="save" onClick={() => setShowCreateSnapshot(false)}>
                Create Snapshot
              </ActionButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const KYCTab: React.FC<{ client: Client | null }> = ({ client }) => {
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showKYCReport, setShowKYCReport] = useState(false);
  const [completeness, setCompleteness] = useState(78);
  const [selectedSections, setSelectedSections] = useState({
    personalDetails: true,
    financialPosition: true,
    investmentExperience: false,
    objectives: true
  });

  const handleGenerateReport = () => {
    setShowGenerateModal(false);
    setShowKYCReport(true);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium text-gray-900">Know Your Customer Report</h3>
        <ActionButton variant="add" onClick={() => setShowGenerateModal(true)} className="bg-green-600 hover:bg-green-700">
          Generate KYC Report
        </ActionButton>
      </div>

      {/* Data Completeness */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h4 className="font-medium text-gray-900 mb-4">Data Completeness</h4>
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Overall completeness</span>
              <span>{completeness}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${completeness >= 80 ? 'bg-green-500' : completeness >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                style={{ width: `${completeness}%` }}
              ></div>
            </div>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            completeness >= 80 ? 'bg-green-100 text-green-800' : 
            completeness >= 60 ? 'bg-yellow-100 text-yellow-800' : 
            'bg-red-100 text-red-800'
          }`}>
            {completeness >= 80 ? 'Good' : completeness >= 60 ? 'Fair' : 'Needs work'}
          </div>
        </div>
      </div>

      {/* KYC Sections Preview */}
      <div className="space-y-4">
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <h5 className="font-medium text-gray-900">Personal Details</h5>
          </div>
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Basic information, addresses, employment</p>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="text-xs text-green-600">✓ Complete</span>
                </div>
              </div>
              <div className="text-green-500">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <h5 className="font-medium text-gray-900">Financial Position</h5>
          </div>
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Income, assets, liabilities from managed and unmanaged products</p>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="text-xs text-yellow-600">⚠ Missing some income details</span>
                </div>
              </div>
              <div className="text-yellow-500">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <h5 className="font-medium text-gray-900">Investment Experience</h5>
          </div>
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Investment history, risk tolerance, experience level</p>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="text-xs text-red-600">✗ Incomplete</span>
                </div>
              </div>
              <div className="text-red-500">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Generate KYC Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Generate KYC Report</h3>
            </div>
            <div className="px-6 py-4">
              <p className="text-sm text-gray-600 mb-4">
                Generate a comprehensive KYC report using structured client data with template-based auto-population.
              </p>
              
              <div className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-yellow-800">
                        Data completeness is {completeness}%. Some sections may require manual input.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="flex items-center">
                    <input 
                      type="checkbox" 
                      className="rounded border-gray-300" 
                      checked={selectedSections.personalDetails}
                      onChange={(e) => setSelectedSections(prev => ({...prev, personalDetails: e.target.checked}))}
                    />
                    <span className="ml-2 text-sm text-gray-700">Include personal details section</span>
                  </label>
                  <label className="flex items-center">
                    <input 
                      type="checkbox" 
                      className="rounded border-gray-300" 
                      checked={selectedSections.financialPosition}
                      onChange={(e) => setSelectedSections(prev => ({...prev, financialPosition: e.target.checked}))}
                    />
                    <span className="ml-2 text-sm text-gray-700">Include financial position section</span>
                  </label>
                  <label className="flex items-center">
                    <input 
                      type="checkbox" 
                      className="rounded border-gray-300" 
                      checked={selectedSections.investmentExperience}
                      onChange={(e) => setSelectedSections(prev => ({...prev, investmentExperience: e.target.checked}))}
                    />
                    <span className="ml-2 text-sm text-gray-700">Include investment experience section</span>
                  </label>
                  <label className="flex items-center">
                    <input 
                      type="checkbox" 
                      className="rounded border-gray-300" 
                      checked={selectedSections.objectives}
                      onChange={(e) => setSelectedSections(prev => ({...prev, objectives: e.target.checked}))}
                    />
                    <span className="ml-2 text-sm text-gray-700">Include objectives section</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <ActionButton variant="cancel" onClick={() => setShowGenerateModal(false)}>
                Cancel
              </ActionButton>
              <ActionButton variant="save" onClick={handleGenerateReport}>
                Generate Report
              </ActionButton>
            </div>
          </div>
        </div>
      )}

      {/* KYC Report Display Modal */}
      {showKYCReport && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Know Your Customer (KYC) Report</h3>
              <div className="flex space-x-2">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  🖨️ Print
                </button>
                <button
                  onClick={() => setShowKYCReport(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="px-8 py-6 space-y-8" style={{fontFamily: 'serif'}}>
                
                {/* Report Header */}
                <div className="text-center border-b border-gray-300 pb-6">
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">KNOW YOUR CUSTOMER REPORT</h1>
                  <div className="text-gray-600">
                    <p className="font-semibold">{client?.name || 'John & Mary Smith'}</p>
                    <p className="text-sm">Generated: {new Date().toLocaleDateString('en-GB', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}</p>
                    <p className="text-sm">Advisor: John Advisor</p>
                  </div>
                </div>

                {/* Personal Details Section */}
                {selectedSections.personalDetails && (
                  <div className="space-y-4">
                    <h2 className="text-xl font-bold text-gray-900 border-b border-gray-200 pb-2">1. PERSONAL DETAILS</h2>
                    <div className="grid grid-cols-2 gap-6 text-sm">
                      <div>
                        <h3 className="font-semibold text-gray-800 mb-3">Primary Client</h3>
                        <div className="space-y-2">
                          <div><span className="font-medium">Full Name:</span> John Smith</div>
                          <div><span className="font-medium">Date of Birth:</span> 15th March 1978</div>
                          <div><span className="font-medium">Nationality:</span> British</div>
                          <div><span className="font-medium">Marital Status:</span> Married</div>
                          <div><span className="font-medium">Employment:</span> Senior Software Engineer</div>
                          <div><span className="font-medium">Employer:</span> TechCorp Ltd</div>
                        </div>
                        <h4 className="font-semibold text-gray-800 mt-4 mb-2">Address</h4>
                        <div className="space-y-1 text-sm">
                          <div>123 Main Street</div>
                          <div>Surrey, England</div>
                          <div>SW1A 1AA</div>
                        </div>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-800 mb-3">Spouse/Partner</h3>
                        <div className="space-y-2">
                          <div><span className="font-medium">Full Name:</span> Mary Smith</div>
                          <div><span className="font-medium">Date of Birth:</span> 22nd July 1980</div>
                          <div><span className="font-medium">Nationality:</span> British</div>
                          <div><span className="font-medium">Employment:</span> Marketing Manager</div>
                          <div><span className="font-medium">Employer:</span> Creative Agency Ltd</div>
                        </div>
                        <h4 className="font-semibold text-gray-800 mt-4 mb-2">Contact Information</h4>
                        <div className="space-y-1 text-sm">
                          <div><span className="font-medium">Email:</span> john.smith@email.com</div>
                          <div><span className="font-medium">Phone:</span> +44 7700 900123</div>
                          <div><span className="font-medium">Alternative:</span> mary.smith@email.com</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Financial Position Section */}
                {selectedSections.financialPosition && (
                  <div className="space-y-4">
                    <h2 className="text-xl font-bold text-gray-900 border-b border-gray-200 pb-2">2. FINANCIAL POSITION</h2>
                    <div className="grid grid-cols-2 gap-6 text-sm">
                      <div>
                        <h3 className="font-semibold text-gray-800 mb-3">Income & Employment</h3>
                        <div className="space-y-2">
                          <div><span className="font-medium">John's Salary:</span> £75,000 per annum</div>
                          <div><span className="font-medium">Mary's Salary:</span> £52,000 per annum</div>
                          <div><span className="font-medium">Bonus/Other Income:</span> £8,000 per annum</div>
                          <div><span className="font-medium">Total Household Income:</span> £135,000 per annum</div>
                        </div>
                        <h3 className="font-semibold text-gray-800 mt-4 mb-3">Monthly Expenditure</h3>
                        <div className="space-y-2">
                          <div><span className="font-medium">Mortgage:</span> £2,100</div>
                          <div><span className="font-medium">Household Expenses:</span> £1,800</div>
                          <div><span className="font-medium">Insurance:</span> £450</div>
                          <div><span className="font-medium">Other:</span> £650</div>
                          <div><span className="font-medium">Total Monthly:</span> £5,000</div>
                        </div>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-800 mb-3">Assets</h3>
                        <div className="space-y-2">
                          <div><span className="font-medium">Main Residence:</span> £450,000</div>
                          <div><span className="font-medium">Managed Investments:</span> £425,000</div>
                          <div><span className="font-medium">Bank Accounts:</span> £13,000</div>
                          <div><span className="font-medium">Other Assets:</span> £35,000</div>
                          <div className="font-semibold border-t pt-2"><span className="font-medium">Total Assets:</span> £923,000</div>
                        </div>
                        <h3 className="font-semibold text-gray-800 mt-4 mb-3">Liabilities</h3>
                        <div className="space-y-2">
                          <div><span className="font-medium">Outstanding Mortgage:</span> £275,000</div>
                          <div><span className="font-medium">Credit Cards:</span> £3,500</div>
                          <div><span className="font-medium">Other Loans:</span> £8,500</div>
                          <div className="font-semibold border-t pt-2"><span className="font-medium">Total Liabilities:</span> £287,000</div>
                        </div>
                        <div className="font-bold text-lg mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                          <span className="font-medium">Net Worth:</span> £636,000
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Investment Experience Section */}
                {selectedSections.investmentExperience && (
                  <div className="space-y-4">
                    <h2 className="text-xl font-bold text-gray-900 border-b border-gray-200 pb-2">3. INVESTMENT EXPERIENCE & RISK PROFILE</h2>
                    <div className="space-y-4 text-sm">
                      <div>
                        <h3 className="font-semibold text-gray-800 mb-2">Investment Experience</h3>
                        <p className="mb-2">Both clients have moderate investment experience, having held ISAs and workplace pensions for over 10 years. John has some experience with direct equity investments through a stocks and shares ISA.</p>
                        <div className="space-y-1">
                          <div><span className="font-medium">Investment Period:</span> 10+ years</div>
                          <div><span className="font-medium">Product Knowledge:</span> ISAs, Pensions, Unit Trusts, Some Direct Equities</div>
                          <div><span className="font-medium">Previous Advisor Experience:</span> Yes, 3 years</div>
                        </div>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-800 mb-2">Attitude to Risk</h3>
                        <p className="mb-2">The clients have been assessed as having a <span className="font-semibold">Balanced (5 out of 10)</span> attitude to risk. They understand that investments can fall as well as rise and are comfortable with moderate volatility for potentially higher long-term returns.</p>
                        <div className="space-y-1">
                          <div><span className="font-medium">Risk Rating:</span> 5/10 (Balanced)</div>
                          <div><span className="font-medium">Capacity for Loss:</span> High (due to strong income and asset base)</div>
                          <div><span className="font-medium">Time Horizon:</span> Long-term (15+ years to retirement)</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Objectives Section */}
                {selectedSections.objectives && (
                  <div className="space-y-4">
                    <h2 className="text-xl font-bold text-gray-900 border-b border-gray-200 pb-2">4. OBJECTIVES & FINANCIAL GOALS</h2>
                    <div className="space-y-4 text-sm">
                      <div>
                        <h3 className="font-semibold text-gray-800 mb-2">Primary Objectives</h3>
                        <div className="space-y-3">
                          <div className="border border-gray-200 rounded p-3">
                            <div className="font-semibold text-gray-700">1. Retirement Planning</div>
                            <p className="text-sm mt-1">Build a comprehensive retirement portfolio targeting £750,000 by age 65. Focus on maximizing pension contributions and ISA allowances while maintaining appropriate risk levels for long-term growth.</p>
                            <div className="text-xs text-gray-600 mt-2">
                              <span className="font-medium">Target Date:</span> 2030 • 
                              <span className="font-medium">Priority:</span> High • 
                              <span className="font-medium">Status:</span> <span className="text-green-600 font-semibold">On Target</span>
                            </div>
                          </div>
                          <div className="border border-gray-200 rounded p-3">
                            <div className="font-semibold text-gray-700">2. Children's Education Fund</div>
                            <p className="text-sm mt-1">Establish education savings for two children currently aged 8 and 10. Target £40,000 per child for university costs including accommodation. Utilize Junior ISAs and education-specific savings products.</p>
                            <div className="text-xs text-gray-600 mt-2">
                              <span className="font-medium">Target Date:</span> 2032 • 
                              <span className="font-medium">Priority:</span> Medium • 
                              <span className="font-medium">Status:</span> <span className="text-green-600 font-semibold">On Target</span>
                            </div>
                          </div>
                          <div className="border border-gray-200 rounded p-3">
                            <div className="font-semibold text-gray-700">3. House Purchase</div>
                            <p className="text-sm mt-1">Save for deposit on family home in Surrey area. Target property value £450,000 requiring £90,000 deposit plus stamp duty and legal costs. Maintain funds in accessible investments.</p>
                            <div className="text-xs text-gray-600 mt-2">
                              <span className="font-medium">Target Date:</span> 2026 • 
                              <span className="font-medium">Priority:</span> Medium • 
                              <span className="font-medium">Status:</span> <span className="text-orange-600 font-semibold">Needs Revision</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Regulatory Declaration */}
                <div className="border-t border-gray-300 pt-6 space-y-4 text-xs">
                  <h2 className="text-lg font-bold text-gray-900">REGULATORY DECLARATIONS</h2>
                  <div className="space-y-2 text-gray-700">
                    <p>This Know Your Customer report has been prepared in accordance with the Financial Conduct Authority (FCA) rules and regulations.</p>
                    <p>The information contained in this report has been gathered through client meetings, questionnaires, and supporting documentation provided by the client(s).</p>
                    <p>This report forms part of the client's permanent record and will be updated as circumstances change.</p>
                  </div>
                  <div className="flex justify-between items-end pt-8">
                    <div>
                      <div className="border-b border-gray-400 w-48 mb-2"></div>
                      <p className="text-xs">Client Signature & Date</p>
                    </div>
                    <div>
                      <div className="border-b border-gray-400 w-48 mb-2"></div>
                      <p className="text-xs">Advisor Signature & Date</p>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Managed Products Tab Component - Contains the original client products section
const ManagedProductsTab: React.FC<{ 
  client: Client | null; 
  clientAccounts: ClientAccount[];
  isLoading: boolean;
  expandedProducts: number[];
  toggleProductExpand: (productId: number) => void;
  expandedProductFunds: Record<number, ProductFund[]>;
  isLoadingFunds: Record<number, boolean>;
  organizeProductsByType: (accounts: ClientAccount[]) => { type: string; products: ClientAccount[] }[];
  handleReactivateProduct: (productId: number, productName: string) => void;
  showRevenueModal: boolean;
  setShowRevenueModal: (show: boolean) => void;
  handleRevenueAssignmentSave: (updates: Record<number, { fixed_cost: number | null; percentage_fee: number | null }>) => void;
}> = ({ 
  client, 
  clientAccounts, 
  isLoading,
  expandedProducts, 
  toggleProductExpand, 
  expandedProductFunds, 
  isLoadingFunds, 
  organizeProductsByType, 
  handleReactivateProduct, 
  showRevenueModal, 
  setShowRevenueModal, 
  handleRevenueAssignmentSave 
}) => {
  // Get client ID from URL params
  const { id: clientId } = useParams<{ id: string }>();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium text-gray-900">Managed Products</h3>
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
            {/* Organize products by type */}
            {organizeProductsByType(clientAccounts.filter(account => account.status === 'active')).map(group => (
              <div key={group.type}>
                <h4 className="text-lg font-medium text-gray-900 mb-4">
                  {group.type === 'ISA' ? 'ISAs' : 
                   group.type === 'GIA' ? 'GIAs' : 
                   group.type === 'Onshore Bond' ? 'Onshore Bonds' : 
                   group.type === 'Offshore Bond' ? 'Offshore Bonds' : 
                   group.type === 'Pension' ? 'Pensions' : 
                   'Other'}
                </h4>
                <div className="grid grid-cols-1 gap-4">
                  {group.products.map((account: ClientAccount) => (
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
            ))}
            
            {/* Lapsed Products - Show separately at the bottom */}
            {clientAccounts.filter(account => account.status === 'inactive').length > 0 && (
              <div>
                <h4 className="text-lg font-medium text-gray-500 mb-4">Lapsed Products</h4>
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
          <div className="bg-gray-50 p-8 rounded-lg text-center border border-gray-200">
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

      {/* Revenue Assignment Modal */}
      {showRevenueModal && (
        <RevenueAssignmentModal
          isOpen={showRevenueModal}
          onClose={() => setShowRevenueModal(false)}
          clientAccounts={clientAccounts}
          onSave={handleRevenueAssignmentSave}
        />
      )}
    </div>
  );
};

export default ClientDetails;
