import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  BaseInput, 
  NumberInput,
  BaseDropdown,
  ActionButton, 
  AddButton,
  InputError 
} from './ui';

interface Fund {
  id: number;
  fund_name: string;
  isin_number?: string;
  risk_factor?: number;
  fund_cost?: number;
  status: string;
  created_at?: string;
}

interface FundFormData {
  fund_name: string;
  isin_number: string;
  risk_factor: number | null;
  fund_cost: number | null;
  status: string;
}

interface AddFundModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newFund: Fund) => void;
  title?: string;
}

const AddFundModal: React.FC<AddFundModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  title = "Add New Fund"
}) => {
  const { api } = useAuth();
  
  // Form state
  const [formData, setFormData] = useState<FundFormData>({
    fund_name: '',
    isin_number: '',
    risk_factor: null,
    fund_cost: null,
    status: 'active'
  });
  
  // UI state
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{[key: string]: string}>({});

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        fund_name: '',
        isin_number: '',
        risk_factor: null,
        fund_cost: null,
        status: 'active'
      });
      setError(null);
      setFieldErrors({});
    }
  }, [isOpen]);

  const handleFundNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Limit fund name to 60 characters
    if (value.length <= 60) {
      setFormData(prev => ({
        ...prev,
        fund_name: value
      }));
      
      // Clear field error when user starts typing
      if (fieldErrors.fund_name) {
        setFieldErrors(prev => ({
          ...prev,
          fund_name: ''
        }));
      }
    }
  };

  const handleIsinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase(); // Auto-capitalize ISIN
    setFormData(prev => ({
      ...prev,
      isin_number: value
    }));
    
    // Clear field error when user starts typing
    if (fieldErrors.isin_number) {
      setFieldErrors(prev => ({
        ...prev,
        isin_number: ''
      }));
    }
  };

  const handleRiskFactorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setFormData(prev => ({
      ...prev,
      risk_factor: isNaN(value) ? null : value
    }));
    
    // Clear field error when user starts typing
    if (fieldErrors.risk_factor) {
      setFieldErrors(prev => ({
        ...prev,
        risk_factor: ''
      }));
    }
  };

  const handleFundCostChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setFormData(prev => ({
      ...prev,
      fund_cost: isNaN(value) ? null : value
    }));
    
    // Clear field error when user starts typing
    if (fieldErrors.fund_cost) {
      setFieldErrors(prev => ({
        ...prev,
        fund_cost: ''
      }));
    }
  };

  const handleStatusChange = (value: string | number) => {
    setFormData(prev => ({
      ...prev,
      status: String(value)
    }));
  };

  const validateForm = (): boolean => {
    const errors: {[key: string]: string} = {};
    
    // Fund name is required
    if (!formData.fund_name.trim()) {
      errors.fund_name = 'Fund name is required';
    }
    
    // Validate fund name length
    if (formData.fund_name.length > 60) {
      errors.fund_name = 'Fund name must be 60 characters or less';
    }

    // ISIN number is required
    if (!formData.isin_number.trim()) {
      errors.isin_number = 'ISIN number is required';
    }
    
    // Validate risk factor is between 1 and 7
    if (formData.risk_factor !== null && (formData.risk_factor < 1 || formData.risk_factor > 7)) {
      errors.risk_factor = 'Risk factor must be between 1 and 7';
    }
    
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const response = await api.post('/funds', formData);
      const newFund = response.data;

      // Call success callback
      onSuccess(newFund);
      
      // Close modal
      onClose();
      
    } catch (err: any) {
      console.error('Error creating fund:', err);
      
      // Handle specific validation errors
      if (err.response?.status === 422) {
        const validationErrors = err.response.data?.detail;
        if (Array.isArray(validationErrors)) {
          const newFieldErrors: {[key: string]: string} = {};
          validationErrors.forEach((error: any) => {
            if (error.loc && error.loc.length > 1) {
              const fieldName = error.loc[1];
              newFieldErrors[fieldName] = error.msg;
            }
          });
          setFieldErrors(newFieldErrors);
        } else {
          setError('Please check your input and try again.');
        }
      } else if (err.response?.status === 409) {
        setError('A fund with this information already exists.');
      } else {
        setError(err.response?.data?.message || err.response?.data?.detail || 'Failed to create fund. Please try again.');
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onKeyDown={handleKeyDown}>
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
          <ActionButton
            variant="cancel"
            size="icon"
            iconOnly
            onClick={onClose}
            disabled={isCreating}
          />
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <InputError showIcon>
                {error}
              </InputError>
            </div>
          )}

          {/* Fund Information */}
          <div className="space-y-4">
            <h4 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
              Fund Information
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <BaseInput
                id="fund_name"
                name="fund_name"
                type="text"
                label="Fund Name"
                placeholder="Enter fund name"
                value={formData.fund_name}
                onChange={handleFundNameChange}
                required
                maxLength={60}
                error={fieldErrors.fund_name}
                helperText={`Unique identifier for this investment fund (${formData.fund_name.length}/60 characters)`}
                leftIcon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
                autoFocus
              />

              <BaseInput
                id="isin_number"
                name="isin_number"
                type="text"
                label="ISIN Number"
                placeholder="e.g., GB00B3X7QG63"
                value={formData.isin_number}
                onChange={handleIsinChange}
                required
                maxLength={12}
                error={fieldErrors.isin_number}
                helperText="12-character alphanumeric code (auto-capitalized)"
                leftIcon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                }
              />

              <NumberInput
                label="Risk Factor"
                format="decimal"
                value={formData.risk_factor || 0}
                onChange={handleRiskFactorChange}
                min={1}
                max={7}
                step={1}
                showSteppers={true}
                error={fieldErrors.risk_factor}
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
                error={fieldErrors.fund_cost}
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

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <ActionButton
              variant="cancel"
              onClick={onClose}
              disabled={isCreating}
            />
            <AddButton
              context="Fund"
              design="balanced"
              size="md"
              type="submit"
              loading={isCreating}
              disabled={isCreating || !formData.fund_name.trim() || !formData.isin_number.trim()}
            />
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddFundModal; 