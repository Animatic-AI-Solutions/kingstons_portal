import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { BaseInput, NumberInput, BaseDropdown, ActionButton } from './ui';

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
  onFundAdded: (fund: any) => void;
}

const AddFundModal: React.FC<AddFundModalProps> = ({ isOpen, onClose, onFundAdded }) => {
  const { api } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<FundFormData>({
    fund_name: '',
    isin_number: '',
    risk_factor: null,
    fund_cost: 0,
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

  const handleIsinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      isin_number: e.target.value.toUpperCase() // Auto-capitalize ISIN
    }));
  };

  // New handlers for NumberInput components
  const handleRiskFactorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setFormData(prev => ({
      ...prev,
      risk_factor: isNaN(value) ? null : value
    }));
  };

  const handleFundCostChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setFormData(prev => ({
      ...prev,
      fund_cost: isNaN(value) ? null : value
    }));
  };

  // New handler for BaseDropdown
  const handleStatusChange = (value: string | number) => {
    setFormData(prev => ({
      ...prev,
      status: String(value)
    }));
  };

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

    if (!formData.isin_number?.trim()) {
      setError('ISIN number is required');
      return;
    }

    if (formData.risk_factor === null) {
      setError('Risk factor is required');
      return;
    }

    if (formData.fund_cost === null || formData.fund_cost === undefined) {
      setError('Fund cost is required');
      return;
    }

    // Validate risk factor is between 1 and 7
    if (formData.risk_factor < 1 || formData.risk_factor > 7) {
      setError('Risk factor must be between 1 and 7');
      return;
    }
    
    try {
      setIsSubmitting(true);
      setError(null);
      const response = await api.post('/funds', formData);
      
      // Call the callback with the new fund data
      onFundAdded(response.data);
      
      // Reset form and close modal
      setFormData({
        fund_name: '',
        isin_number: '',
        risk_factor: null,
        fund_cost: 0,
        status: 'active'
      });
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create fund');
      console.error('Error creating fund:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    // Reset form when closing
    setFormData({
      fund_name: '',
      isin_number: '',
      risk_factor: null,
      fund_cost: 0,
      status: 'active'
    });
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Add New Fund</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 focus:outline-none"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Error display */}
        {error && (
          <div className="mx-6 mt-4 bg-red-50 border-l-4 border-red-500 p-4">
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
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
            />

            <NumberInput
              label="Risk Factor"
              format="decimal"
              value={formData.risk_factor || 0}
              onChange={handleRiskFactorChange}
              min={1}
              max={7}
              step={1}
              required
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
              required
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

          {/* Footer Actions */}
          <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
            <ActionButton
              variant="cancel"
              size="md"
              onClick={handleClose}
            />
            <ActionButton
              variant="add"
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

export default AddFundModal; 