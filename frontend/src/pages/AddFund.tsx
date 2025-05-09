import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
              />
            </div>

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
              />
                <p className="mt-1 text-xs text-gray-500">
                  International Securities Identification Number - a unique 12-character alphanumeric code
                </p>
            </div>

            <div>
                <label htmlFor="risk_factor" className="block text-sm font-medium text-gray-700 mb-1">
                Risk Factor (1-7)
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
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              />
                <p className="mt-1 text-xs text-gray-500">
                  Enter a value between 1 (Conservative) and 7 (Aggressive)
                </p>
            </div>

            <div>
                <label htmlFor="fund_cost" className="block text-sm font-medium text-gray-700 mb-1">
                Fund Cost (%)
              </label>
                <div className="relative">
              <input
                type="number"
                id="fund_cost"
                name="fund_cost"
                step="0.0001"
                min="0"
                value={formData.fund_cost === null ? '' : formData.fund_cost}
                onChange={handleChange}
                    className="block w-full border border-gray-300 rounded-md shadow-sm py-2 pl-3 pr-8 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <span className="text-gray-500">%</span>
                  </div>
                </div>
                <p className="mt-1 text-xs text-gray-500">Enter as a percentage, e.g., 0.75 for 0.75%</p>
            </div>

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
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
            <Link
              to="/definitions?tab=funds"
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Cancel
            </Link>
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
                  Saving...
                </span>
              ) : (
                'Save Fund'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddFund;
