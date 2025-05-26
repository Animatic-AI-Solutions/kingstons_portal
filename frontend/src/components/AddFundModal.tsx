import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.fund_name?.trim()) {
      setError('Fund name is required');
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
            {/* Fund Name */}
            <div>
              <label htmlFor="fund_name" className="block text-sm font-medium text-gray-700 mb-1">
                Fund Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="fund_name"
                name="fund_name"
                value={formData.fund_name}
                onChange={handleChange}
                required
                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                placeholder="Enter fund name"
              />
            </div>

            {/* ISIN Number */}
            <div>
              <label htmlFor="isin_number" className="block text-sm font-medium text-gray-700 mb-1">
                ISIN Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="isin_number"
                name="isin_number"
                value={formData.isin_number}
                onChange={handleChange}
                required
                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                placeholder="e.g., GB00B3X7QG63"
              />
              <p className="mt-1 text-xs text-gray-500">
                12-character alphanumeric code
              </p>
            </div>

            {/* Risk Factor */}
            <div>
              <label htmlFor="risk_factor" className="block text-sm font-medium text-gray-700 mb-1">
                Risk Factor (1-7) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="risk_factor"
                name="risk_factor"
                min="1"
                max="7"
                step="1"
                value={formData.risk_factor === null ? '' : formData.risk_factor}
                onChange={handleChange}
                required
                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                placeholder="1-7"
              />
              <p className="mt-1 text-xs text-gray-500">
                1 = Conservative, 7 = Aggressive
              </p>
            </div>

            {/* Fund Cost */}
            <div>
              <label htmlFor="fund_cost" className="block text-sm font-medium text-gray-700 mb-1">
                Fund Cost (%) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  id="fund_cost"
                  name="fund_cost"
                  step="0.0001"
                  min="0"
                  value={formData.fund_cost === null || formData.fund_cost === undefined ? '' : formData.fund_cost}
                  onChange={handleChange}
                  required
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 pl-3 pr-8 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  placeholder="0.75"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <span className="text-gray-500">%</span>
                </div>
              </div>
              <p className="mt-1 text-xs text-gray-500">Enter as percentage, e.g., 0.75</p>
            </div>

            {/* Status */}
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`bg-primary-700 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 shadow-sm transition-colors duration-200 ${
                isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
              }`}
            >
              {isSubmitting ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating...
                </span>
              ) : (
                'Create Fund'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddFundModal; 