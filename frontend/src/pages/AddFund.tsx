import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BaseInput, NumberInput, BaseDropdown, ActionButton } from '../components/ui';

interface FundFormData {
  fund_name: string;
  isin_number: string;
  risk_factor: number | null;
  fund_cost: number | null;
  status: string;
}

interface DuplicateIsinWarning {
  isChecking: boolean;
  isDuplicate: boolean;
  duplicateFund?: {
    id: number;
    name: string;
    status: string;
  };
  message?: string;
}

const AddFund: React.FC = () => {
  const navigate = useNavigate();
  const { api } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<DuplicateIsinWarning>({
    isChecking: false,
    isDuplicate: false
  });
  const isinCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [formData, setFormData] = useState<FundFormData>({
    fund_name: '',
    isin_number: '',
    risk_factor: null,
    fund_cost: null,
    status: 'active'
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    
    if (name === 'risk_factor') {
      setFormData(prev => ({
        ...prev,
        risk_factor: value === '' ? null : Number(value)
      }));
    } else if (name === 'fund_cost') {
      setFormData(prev => ({
        ...prev,
        fund_cost: value === '' ? null : Number(value)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // New handlers for BaseInput components
  const handleFundNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Limit fund name to 30 characters
    if (value.length <= 30) {
    setFormData(prev => ({
      ...prev,
        fund_name: value
    }));
    }
  };

  // Debounced ISIN duplicate check function
  const checkIsinDuplicate = useCallback(async (isin: string) => {
    if (!isin.trim() || isin.length < 3) {
      setDuplicateWarning({
        isChecking: false,
        isDuplicate: false
      });
      return;
    }

    setDuplicateWarning(prev => ({ ...prev, isChecking: true }));

    try {
      const response = await api.get(`/funds/check-isin/${encodeURIComponent(isin.trim().toUpperCase())}`);
      const data = response.data;

      setDuplicateWarning({
        isChecking: false,
        isDuplicate: data.is_duplicate,
        duplicateFund: data.duplicate_fund,
        message: data.message
      });
    } catch (error) {
      console.error('Error checking ISIN duplicate:', error);
      setDuplicateWarning({
        isChecking: false,
        isDuplicate: false,
        message: 'Unable to check for duplicates'
      });
    }
  }, [api]);

  const handleIsinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase(); // Auto-capitalize ISIN
    setFormData(prev => ({
      ...prev,
      isin_number: value
    }));

    // Clear any existing timeout
    if (isinCheckTimeoutRef.current) {
      clearTimeout(isinCheckTimeoutRef.current);
    }

    // Set new timeout for debounced duplicate check (800ms delay)
    isinCheckTimeoutRef.current = setTimeout(() => {
      checkIsinDuplicate(value);
    }, 800);
  };

  // New handlers for NumberInput components
  const handleRiskFactorChange = (value: number | null) => {
    setFormData(prev => ({
      ...prev,
      risk_factor: value
    }));
  };

  const handleFundCostChange = (value: number | null) => {
    setFormData(prev => ({
      ...prev,
      fund_cost: value
    }));
  };

  // New handler for BaseDropdown
  const handleStatusChange = (value: string | number) => {
    setFormData(prev => ({
      ...prev,
      status: String(value)
    }));
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (isinCheckTimeoutRef.current) {
        clearTimeout(isinCheckTimeoutRef.current);
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.fund_name?.trim()) {
      setError('Fund name is required');
      return;
    }

    // Validate fund name length
    if (formData.fund_name.length > 60) {
      setError('Fund name must be 60 characters or less');
      return;
    }

    // Validate risk factor is between 1 and 7
    if (formData.risk_factor !== null && (formData.risk_factor < 1 || formData.risk_factor > 7)) {
      setError('Risk factor must be between 1 and 7');
      return;
    }
    
    try {
      setIsSubmitting(true);
      await api.post('/funds', formData);
      navigate('/definitions?tab=funds');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create fund');
      console.error('Error creating fund:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-700"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb Navigation */}
      <nav className="mb-8 flex" aria-label="Breadcrumb">
        <ol className="inline-flex items-center space-x-1 md:space-x-3">
          <li className="inline-flex items-center">
            <Link to="/definitions" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-primary-700">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"></path>
              </svg>
              Definitions
            </Link>
          </li>
          <li>
            <div className="flex items-center">
              <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"></path>
              </svg>
              <Link to="/definitions?tab=funds" className="ml-1 text-sm font-medium text-gray-500 hover:text-primary-700 md:ml-2">
                Funds
              </Link>
            </div>
          </li>
          <li aria-current="page">
            <div className="flex items-center">
              <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"></path>
              </svg>
              <span className="ml-1 text-sm font-medium text-primary-700 md:ml-2">Add Fund</span>
            </div>
          </li>
        </ol>
      </nav>

      {/* Header */}
      <div className="flex justify-between items-center mb-8 mt-4">
        <div className="flex items-center">
          <div className="bg-primary-100 p-2 rounded-lg mr-3 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-3xl font-normal text-gray-900 font-sans tracking-wide">Add Fund</h1>
        </div>
        <Link
          to="/definitions?tab=funds"
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          <svg className="-ml-1 mr-2 h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Back
        </Link>
      </div>

      {/* Main Content */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden border border-gray-200">
          {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-0">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-red-700 text-sm font-medium">{error}</p>
              </div>
            </div>
            </div>
          )}

        <form onSubmit={handleSubmit}>
          <div className="p-6 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-medium text-gray-900">Fund Information</h2>
            <p className="mt-1 text-sm text-gray-500">
              Enter the details for this investment fund. Required fields are marked with an asterisk (*).
            </p>
          </div>

          <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <BaseInput
              label="Fund Name"
              placeholder="Enter fund name"
              value={formData.fund_name}
              onChange={handleFundNameChange}
              required
              maxLength={60}
              helperText={`Unique identifier for this investment fund (${formData.fund_name.length}/60 characters)`}
            />

            <BaseInput
              label="ISIN Number"
              placeholder="e.g., GB00B3X7QG63"
              value={formData.isin_number}
              onChange={handleIsinChange}
              required
              maxLength={12}
              helperText="12-character alphanumeric code (auto-capitalized)"
              rightIcon={
                duplicateWarning.isChecking ? (
                  <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-primary-600 rounded-full"></div>
                ) : duplicateWarning.isDuplicate ? (
                  <svg className="h-4 w-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                ) : formData.isin_number.length >= 3 ? (
                  <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : null
              }
            />

            {/* ISIN Duplicate Warning */}
            {duplicateWarning.isDuplicate && (
              <div className="md:col-span-2 bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-md">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <div className="ml-3 flex-1">
                    <h4 className="text-sm font-medium text-amber-800">
                      Duplicate ISIN Warning
                    </h4>
                    <div className="mt-1 text-sm text-amber-700">
                      <p>
                        This ISIN already exists for fund: <strong>{duplicateWarning.duplicateFund?.name}</strong>
                        {duplicateWarning.duplicateFund?.status === 'inactive' && ' (inactive)'}
                      </p>
                      <p className="mt-1 text-xs">
                        You can still save this fund if intentional, but please verify this is not a mistake.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <NumberInput
              label="Risk Factor"
              format="decimal"
              value={formData.risk_factor || 0}
              onChange={handleRiskFactorChange}
              min={1}
              max={7}
              step={1}
              showSteppers={true}
              helperText="1 = Conservative, 7 = Aggressive"
            />

            <NumberInput
              label="Fund Cost"
              format="percentage"
              value={formData.fund_cost || 0}
              onChange={handleFundCostChange}
              min={0}
              step={0.01}
              decimalPlaces={2}
              helperText="Enter as percentage, e.g., 0.75"
            />

            <BaseDropdown
              label="Status"
              options={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' }
              ]}
              value={formData.status}
              onChange={handleStatusChange}
              placeholder="Select status"
            />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
            <Link to="/definitions?tab=funds">
              <ActionButton
                variant="cancel"
                size="md"
              />
            </Link>
            <ActionButton
              variant="save"
              size="md"
              context="Fund"
              design="descriptive"
              type="submit"
              disabled={isSubmitting}
              loading={isSubmitting}
            />
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddFund;
