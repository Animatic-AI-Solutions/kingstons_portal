import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProviderFormData {
  name: string;
  status: string;
  theme_color: string;
}

const AddProvider: React.FC = () => {
  const navigate = useNavigate();
  const { api } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<ProviderFormData>({
    name: '',
    status: 'active',
    theme_color: '#4F46E5' // Default to primary-700 color
  });

  // Define color options in rainbow order
  const colorOptions = [
    // Reds/Pinks
    { name: 'Red', value: '#ef4444' },
    { name: 'Rose', value: '#f43f5e' },
    { name: 'Pink', value: '#ec4899' },
    { name: 'Magenta', value: '#b22fac' },
    
    // Oranges
    { name: 'Orange', value: '#f97316' },
    { name: 'Amber', value: '#f59e0b' },
    
    // Yellows
    { name: 'Yellow', value: '#eab308' },
    
    // Greens
    { name: 'Lime', value: '#84cc16' },
    { name: 'Green', value: '#22c55e' },
    { name: 'Emerald', value: '#10b981' },
    { name: 'Teal', value: '#14b8a6' },
    
    // Blues
    { name: 'Cyan', value: '#06b6d4' },
    { name: 'Light Blue', value: '#0ea5e9' },
    { name: 'Blue', value: '#2563eb' },
    
    // Purples/Indigos/Violets
    { name: 'Indigo', value: '#4F46E5' },
    { name: 'Violet', value: '#8b5cf6' },
    { name: 'Fuchsia', value: '#d946ef' },
    { name: 'Purple', value: '#7e22ce' },
    
    // Neutrals
    { name: 'Slate', value: '#64748b' },
    { name: 'Gray', value: '#6b7280' }
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleColorSelect = (color: string) => {
    setFormData(prev => ({
      ...prev,
      theme_color: color
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!formData.name.trim()) {
      setError('Provider name is required');
      return;
    }
    
    try {
      setIsSubmitting(true);
      await api.post('/available_providers', formData);
      navigate('/definitions?tab=providers');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create provider');
      console.error('Error creating provider:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
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
              <Link to="/definitions?tab=providers" className="ml-1 text-sm font-medium text-gray-500 hover:text-primary-700 md:ml-2">
                Providers
              </Link>
            </div>
          </li>
          <li aria-current="page">
            <div className="flex items-center">
              <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"></path>
              </svg>
              <span className="ml-1 text-sm font-medium text-primary-700 md:ml-2">Add Provider</span>
            </div>
          </li>
        </ol>
      </nav>

      {/* Header */}
      <div className="flex justify-between items-center mb-8 mt-4">
        <div className="flex items-center">
          <div className="bg-primary-100 p-2 rounded-lg mr-3 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h1 className="text-3xl font-normal text-gray-900 font-sans tracking-wide">Add Provider</h1>
        </div>
        <Link
          to="/definitions?tab=providers"
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
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-medium text-gray-900">Provider Information</h2>
            <p className="mt-1 text-sm text-gray-500">
              Enter the details for this investment provider. All providers require a name and color.
            </p>
          </div>

          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Color picker - Left side */}
              <div className="md:col-span-5 order-2 md:order-1">
                <div className="rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                  <div className="px-3 py-3 bg-gray-50 border-b border-gray-200 sm:px-4">
                    <h3 className="text-base font-medium text-gray-900">Theme Color</h3>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center mb-3">
                      <div 
                        className="h-12 w-12 rounded-full border-2 mr-3 shadow-md" 
                        style={{ backgroundColor: formData.theme_color, borderColor: formData.theme_color === '#ffffff' ? '#d1d5db' : formData.theme_color }}
                      ></div>
                      <span className="text-sm font-medium text-gray-700">
                        {colorOptions.find(c => c.value === formData.theme_color)?.name || 'Custom'}
                      </span>
                    </div>

                    <div className="grid grid-cols-5 gap-3">
                      {colorOptions.map((color) => (
                        <button
                          key={color.value}
                          type="button"
                          className={`aspect-square w-8 rounded-full hover:ring-2 hover:ring-offset-2 hover:ring-primary-500 focus:outline-none transition-all duration-200 shadow-sm ${
                            formData.theme_color === color.value 
                              ? 'ring-2 ring-offset-2 ring-gray-400 scale-110'
                              : ''
                          }`}
                          style={{ backgroundColor: color.value }}
                          onClick={() => handleColorSelect(color.value)}
                          title={color.name}
                        ></button>
                      ))}
                    </div>
                    <p className="mt-3 text-sm text-gray-500">
                      Select a theme color for this provider. This color will be used as a visual identifier.
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Provider details - Right side */}
              <div className="md:col-span-7 order-1 md:order-2 space-y-4">
                <div className="rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                  <div className="px-3 py-3 bg-gray-50 border-b border-gray-200 sm:px-4">
                    <h3 className="text-base font-medium text-gray-900">Provider Details</h3>
                  </div>
                  <div className="p-4">
                    <div className="mb-4">
                      <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                        Provider Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                        required
                      />
                      <p className="mt-1 text-xs text-gray-500">Enter the name of the financial provider</p>
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
                      <p className="mt-1 text-xs text-gray-500">Choose whether this provider is active or inactive</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
            <Link
              to="/definitions?tab=providers"
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
                'Save Provider'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddProvider;
