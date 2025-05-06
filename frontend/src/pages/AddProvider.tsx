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
    theme_color: '#b22fac' // Default magenta/purple color
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
    { name: 'Indigo', value: '#4f46e5' },
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
      navigate('/definitions/providers');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create provider');
      console.error('Error creating provider:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

      <div className="mb-6">
        <div className="flex items-center">
          <Link to="/definitions/providers" className="text-indigo-600 hover:text-indigo-900 mr-2">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Add Provider</h1>

        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-red-700 text-base">{error}</p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            {/* Color picker - Left side */}
            <div className="md:col-span-5 order-2 md:order-1">
              <div className="h-full bg-gray-50 p-5 rounded-lg border border-gray-100">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Theme Color
                </label>
                <div className="flex items-center mb-4">
                  <div 
                    className="h-12 w-12 rounded-full border-2 mr-3 shadow-md" 
                    style={{ backgroundColor: formData.theme_color, borderColor: formData.theme_color === '#ffffff' ? '#d1d5db' : formData.theme_color }}
                  ></div>
                  <span className="text-sm font-medium text-gray-700">
                    {colorOptions.find(c => c.value === formData.theme_color)?.name || 'Custom'}
                  </span>
                </div>

                <div className="grid grid-cols-5 gap-4">
                  {colorOptions.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      className={`aspect-square w-10 rounded-full hover:ring-2 hover:ring-offset-2 hover:ring-fuchsia-500 focus:outline-none transition-all duration-200 shadow-sm ${
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
                <p className="mt-4 text-sm text-gray-500">Select a theme color for this provider</p>
              </div>
            </div>
            
            {/* Provider details - Right side */}
            <div className="md:col-span-7 order-1 md:order-2 space-y-10 py-3">
              <div className="bg-gray-50 p-6 rounded-lg border border-gray-100">
                <label htmlFor="name" className="block text-lg font-medium text-gray-700 mb-3">
                  Provider Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-4 px-4 text-base focus:outline-none focus:ring-fuchsia-500 focus:border-fuchsia-500"
                  required
                />
                <p className="mt-3 text-sm text-gray-500">Enter the name of the financial provider</p>
              </div>

              <div className="bg-gray-50 p-6 rounded-lg border border-gray-100">
                <label htmlFor="status" className="block text-lg font-medium text-gray-700 mb-3">
                  Status
                </label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="block w-full border border-gray-300 rounded-md shadow-sm py-4 px-4 text-base focus:outline-none focus:ring-fuchsia-500 focus:border-fuchsia-500"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
                <p className="mt-3 text-sm text-gray-500">Choose whether this provider is active or inactive</p>
              </div>
            </div>
          </div>

          <div className="mt-10 flex justify-end">
            <Link

              to="/definitions/providers"
              className="mr-4 bg-white py-3 px-6 border border-gray-300 rounded-md shadow-sm text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"

            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`bg-primary-700 text-white px-6 py-3 rounded-xl font-medium hover:bg-primary-800 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-700 focus:ring-offset-2 shadow-sm ${
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
