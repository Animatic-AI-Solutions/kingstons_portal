import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface FundFormData {
  fund_name: string;
  isin_number: string;
  risk_factor: number | null;
  fund_cost: number | null;
  status: string;
}

const AddFund: React.FC = () => {
  const navigate = useNavigate();
  const { api } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.fund_name?.trim()) {
      setError('Fund name is required');
      return;
    }

    // Validate risk factor is between 0 and 7
    if (formData.risk_factor !== null && (formData.risk_factor < 0 || formData.risk_factor > 7)) {
      setError('Risk factor must be between 0 and 7');
      return;
    }
    
    try {
      setIsSubmitting(true);
      await api.post('/funds', formData);
      navigate('/definitions/funds');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create fund');
      console.error('Error creating fund:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Add New Fund</h1>
        <button
          onClick={() => navigate('/funds')}
          className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
        >
          Cancel
        </button>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="fund_name" className="block text-sm font-medium text-gray-700">
                Fund Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="fund_name"
                name="fund_name"
                value={formData.fund_name}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="isin_number" className="block text-sm font-medium text-gray-700">
                ISIN Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="isin_number"
                name="isin_number"
                value={formData.isin_number}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="risk_factor" className="block text-sm font-medium text-gray-700">
                Risk Factor (0-7)
              </label>
              <input
                type="number"
                id="risk_factor"
                name="risk_factor"
                min="0"
                max="7"
                value={formData.risk_factor === null ? '' : formData.risk_factor}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="fund_cost" className="block text-sm font-medium text-gray-700">
                Fund Cost (%)
              </label>
              <input
                type="number"
                id="fund_cost"
                name="fund_cost"
                step="0.0001"
                min="0"
                value={formData.fund_cost === null ? '' : formData.fund_cost}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
              <p className="mt-1 text-sm text-gray-500">Enter as a percentage, e.g., 0.75 for 0.75%</p>
            </div>

            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                Status
              </label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Creating...' : 'Create Fund'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddFund;
