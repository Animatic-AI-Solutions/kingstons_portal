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
import DynamicPageContainer from '../components/phase2/client-groups/DynamicPageContainer';


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
  association_id?: number; // ID of the client-group-product-owners record
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
  valuation_date?: string;
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
  fixed_fee_direct?: number;
  fixed_fee_facilitated?: number;
  percentage_fee_facilitated?: number;
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
        console.log(`Calculating live Previous Funds IRR for ${memoizedFundIds.length} inactive funds (display only, NOT storing)`);
        console.log('Inactive fund IDs for live calculation:', memoizedFundIds);
        console.log('🔍 DEBUG: ClientDetails.tsx calling IRR with cache key:', cacheKey);

        // CRITICAL: Use storeResult: false to prevent overwriting portfolio IRRs
        // This calculates IRR for inactive funds only for display purposes
        const response = await calculateStandardizedMultipleFundsIRR({
          portfolioFundIds: memoizedFundIds,
          storeResult: false  // CRITICAL: Don't overwrite portfolio IRRs with inactive-only IRR!
        });

        console.log('Live Previous Funds IRR response (NOT STORED):', response.data);
        
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
  const navigate = useNavigate();

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

                {/* Generate Report Button */}
                <div className="pt-4 border-t border-gray-200">
                  <button
                    onClick={() => {
                      navigate('/report-generator', {
                        state: {
                          preSelectedClientGroupId: client.id,
                          preSelectedClientGroupName: client.name
                        }
                      });
                    }}
                    className="w-full inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-200 shadow-sm"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Generate Report
                  </button>
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
    irr: account.irr,
    valuation_date: account.valuation_date
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
  const calculateRevenue = (fixedFeeDirect?: number, fixedFeeFacilitated?: number, percentageFeeFacilitated?: number, portfolioValue?: number): string | number => {
    // Ensure all values are properly converted to numbers (not strings)
    const direct = Number(fixedFeeDirect) || 0;
    const facilitated = Number(fixedFeeFacilitated) || 0;
    const percentage = Number(percentageFeeFacilitated) || 0;
    const value = Number(portfolioValue) || 0;
    
    // Revenue calculation with proper number conversion
    
    // If no fee types are set, return 'None'
    if (!direct && !facilitated && !percentage) {
      return 'None';
    }
    
    // If only fixed fees are set (no percentage fee)
    if ((direct || facilitated) && !percentage) {
      return direct + facilitated;
    }
    
    // If percentage fee is involved (with or without fixed fees)
    if (percentage > 0) {
      // Check if valuation data is actually missing (null/undefined) vs genuinely zero
      if (portfolioValue === null || portfolioValue === undefined) {
        return 'Latest valuation needed';
      }
      // If valuation exists (including zero), calculate properly
      const percentageFeeFacilitatedAmount = Number((value * percentage) / 100);
      const totalRevenue = Number(direct + facilitated + percentageFeeFacilitatedAmount);
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
            {account.valuation_date && (
              <div className="text-xs text-gray-500 mt-0.5">
                As of {new Date(account.valuation_date).toLocaleDateString('en-GB', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })}
              </div>
            )}
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
                  const revenue = calculateRevenue(account.fixed_fee_direct, account.fixed_fee_facilitated, account.percentage_fee_facilitated, displayValue);
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
        '/client-groups',
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
    const fixedFeeFacilitated = Number(product.fixed_fee_facilitated) || 0;
    const percentageFeeFacilitated = Number(product.percentage_fee_facilitated) || 0;
    const portfolioValue = Number(product.total_value) || 0;
    
    // Calculate revenue for this product
    
    // If neither cost type is set, add 0 to sum
    if (!fixedFeeFacilitated && !percentageFeeFacilitated) {
      return sum;
    }
    
    // If only fixed cost is set (no percentage fee)
    if (fixedFeeFacilitated && !percentageFeeFacilitated) {
      return sum + fixedFeeFacilitated;
    }
    
    // If percentage fee is involved (with or without fixed cost)
    if (percentageFeeFacilitated > 0 && portfolioValue > 0) {
      const percentageFeeFacilitatedAmount = Number((portfolioValue * percentageFeeFacilitated) / 100);
      const productRevenue = Number(fixedFeeFacilitated + percentageFeeFacilitatedAmount);
      return sum + productRevenue;
    }
    
    // If percentage fee but no valuation, just add fixed cost if any
    if (percentageFeeFacilitated > 0 && (!portfolioValue || portfolioValue <= 0)) {
      return sum + fixedFeeFacilitated;
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
  const [revenueFormData, setRevenueFormData] = useState<Record<number, { fixed_fee_direct: string; fixed_fee_facilitated: string; percentage_fee_facilitated: string }>>({});
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
    navigate('/client-groups');
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
        '/client-groups', 
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
        const response = await api.patch(`/client-products/${productId}/reactivate`);
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
  const handleRevenueAssignmentSave = async (updates: Record<number, { fixed_fee_direct: number | null; fixed_fee_facilitated: number | null; percentage_fee_facilitated: number | null }>) => {
    try {
      // Call API to update products with revenue data
      for (const [productId, data] of Object.entries(updates)) {
        await api.patch(`/client-products/${productId}`, data);
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
    // Check if navigated from report display
    const fromReportDisplay = location.state?.from === 'report-display';

    return (
      <nav className="mb-4 flex" aria-label="Breadcrumb">
        <ol className="inline-flex items-center space-x-1 md:space-x-3">
          <li className="inline-flex items-center">
            <button
              onClick={fromReportDisplay ? () => navigate(-1) : navigateToClientGroups}
              className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 rounded"
            >
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"></path>
              </svg>
              {fromReportDisplay ? 'Back to Report' : 'Clients'}
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
              to={`/create-client-group-products?client_id=${clientId}&client_name=${encodeURIComponent(`${client?.name}`)}&returnTo=${encodeURIComponent(`/client-groups/${clientId}`)}`}
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
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    {group.type === 'ISA' ? 'ISAs' : 
                     group.type === 'GIA' ? 'GIAs' : 
                     group.type === 'Onshore Bond' ? 'Onshore Bonds' : 
                     group.type === 'Offshore Bond' ? 'Offshore Bonds' : 
                     group.type === 'Pension' ? 'Pensions' : 
                     'Other'}
                  </h3>
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
                  to={`/create-client-group-products?client_id=${clientId}&client_name=${encodeURIComponent(`${client?.name}`)}&returnTo=${encodeURIComponent(`/client-groups/${clientId}`)}`}
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
      

      {/* Revenue Assignment Modal */}
      {showRevenueModal && (
        <RevenueAssignmentModal
          isOpen={showRevenueModal}
          onClose={() => setShowRevenueModal(false)}
          clientAccounts={clientAccounts}
          onSave={handleRevenueAssignmentSave}
        />
      )}
    </DynamicPageContainer>
  );
};

// Revenue Assignment Modal Component
const RevenueAssignmentModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  clientAccounts: ClientAccount[];
  onSave: (updates: Record<number, { fixed_fee_direct: number | null; fixed_fee_facilitated: number | null; percentage_fee_facilitated: number | null }>) => void;
}> = ({ isOpen, onClose, clientAccounts, onSave }) => {
  const [formData, setFormData] = useState<Record<number, { fixed_fee_direct: string; fixed_fee_facilitated: string; percentage_fee_facilitated: string }>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Initialize form data when modal opens
  useEffect(() => {
    if (isOpen) {
      const initialData: Record<number, { fixed_fee_direct: string; fixed_fee_facilitated: string; percentage_fee_facilitated: string }> = {};
      clientAccounts.forEach(account => {
        initialData[account.id] = {
          fixed_fee_direct: account.fixed_fee_direct?.toString() || '',
          fixed_fee_facilitated: account.fixed_fee_facilitated?.toString() || '',
          percentage_fee_facilitated: account.percentage_fee_facilitated?.toString() || ''
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

  const handleInputChange = (productId: number, field: 'fixed_fee_direct' | 'fixed_fee_facilitated' | 'percentage_fee_facilitated', value: number | null) => {
    setFormData(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [field]: value !== null ? value.toString() : ''
      }
    }));
  };

  const calculatePercentageRevenue = (percentageFeeFacilitated: string, totalValue: number): string | number => {
    const fee = parseFloat(percentageFeeFacilitated);
    if (!fee || fee <= 0) return 0;
    if (totalValue === null || totalValue === undefined) return 'Latest valuation needed';
    return (totalValue * fee) / 100;
  };

  const calculateTotalRevenue = (fixedFeeDirect: string, fixedFeeFacilitated: string, percentageFeeFacilitated: string, totalValue: number): string | number => {
    const direct = parseFloat(fixedFeeDirect) || 0;
    const facilitated = parseFloat(fixedFeeFacilitated) || 0;
    const percentage = parseFloat(percentageFeeFacilitated) || 0;
    
    // If no fee types are set
    if (!direct && !facilitated && !percentage) {
      return 'None';
    }
    
    // If only fixed fees are set (no percentage fee)
    if ((direct || facilitated) && !percentage) {
      return direct + facilitated;
    }
    
    // If percentage fee is involved (with or without fixed fees)
    if (percentage > 0) {
      // Check if valuation data is actually missing (null/undefined) vs genuinely zero
      if (totalValue === null || totalValue === undefined) {
        return 'Latest valuation needed';
      }
      // If valuation exists (including zero), calculate properly
      return direct + facilitated + ((totalValue * percentage) / 100);
    }
    
    return 'None';
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updates: Record<number, { fixed_fee_direct: number | null; fixed_fee_facilitated: number | null; percentage_fee_facilitated: number | null }> = {};
      
      Object.entries(formData).forEach(([productId, data]) => {
        const id = parseInt(productId);
        
        // Parse values, treating empty strings as null
        let fixedFeeDirect: number | null = null;
        let fixedFeeFacilitated: number | null = null;
        let percentageFeeFacilitated: number | null = null;
        
        if (data.fixed_fee_direct && data.fixed_fee_direct.trim() !== '') {
          const parsed = parseFloat(data.fixed_fee_direct);
          fixedFeeDirect = isNaN(parsed) ? null : parsed;
        }
        
        if (data.fixed_fee_facilitated && data.fixed_fee_facilitated.trim() !== '') {
          const parsed = parseFloat(data.fixed_fee_facilitated);
          fixedFeeFacilitated = isNaN(parsed) ? null : parsed;
        }
        
        if (data.percentage_fee_facilitated && data.percentage_fee_facilitated.trim() !== '') {
          const parsed = parseFloat(data.percentage_fee_facilitated);
          percentageFeeFacilitated = isNaN(parsed) ? null : parsed;
        }
        
        updates[id] = {
          fixed_fee_direct: fixedFeeDirect,
          fixed_fee_facilitated: fixedFeeFacilitated,
          percentage_fee_facilitated: percentageFeeFacilitated
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
    
    const fixedFeeFacilitated = parseFloat(productData.fixed_fee_facilitated) || 0;
    const percentageFeeFacilitated = parseFloat(productData.percentage_fee_facilitated) || 0;
    const totalValue = account.total_value || 0;
    
    acc.fixedFeeFacilitated += fixedFeeFacilitated;
    acc.totalValue += totalValue;
    
    const percentageRevenue = calculatePercentageRevenue(productData.percentage_fee_facilitated, totalValue);
    if (typeof percentageRevenue === 'number') {
      acc.percentageRevenue += percentageRevenue;
    }
    
    const totalRevenue = calculateTotalRevenue(productData.fixed_fee_facilitated, productData.percentage_fee_facilitated, totalValue);
    if (typeof totalRevenue === 'number') {
      acc.totalRevenue += totalRevenue;
    }
    
    return acc;
  }, { fixedFeeFacilitated: 0, totalValue: 0, percentageRevenue: 0, totalRevenue: 0 });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-start justify-center p-4 pt-16">
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
                {formatCurrency(totals.fixedFeeFacilitated)}
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
                  Fixed Fee Direct (£)
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fixed Fee Facilitated (£)
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Percentage Fee Facilitated (%)
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Latest Valuation
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Percentage Revenue Facilitated
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Revenue
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {clientAccounts.map((account) => {
                const productData = formData[account.id] || { fixed_fee_direct: '', fixed_fee_facilitated: '', percentage_fee_facilitated: '' };
                const totalValue = account.total_value || 0;
                const percentageRevenue = calculatePercentageRevenue(productData.percentage_fee_facilitated, totalValue);
                const totalRevenue = calculateTotalRevenue(productData.fixed_fee_direct, productData.fixed_fee_facilitated, productData.percentage_fee_facilitated, totalValue);
                
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
                         value={productData.fixed_fee_direct}
                         onChange={(value) => handleInputChange(account.id, 'fixed_fee_direct', value)}
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
                         value={productData.fixed_fee_facilitated}
                         onChange={(value) => handleInputChange(account.id, 'fixed_fee_facilitated', value)}
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
                         value={productData.percentage_fee_facilitated}
                         onChange={(value) => handleInputChange(account.id, 'percentage_fee_facilitated', value)}
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
                   {formatCurrency(totals.fixedFeeFacilitated)}
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

export default ClientDetails;
