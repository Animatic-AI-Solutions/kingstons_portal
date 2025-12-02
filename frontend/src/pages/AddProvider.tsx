import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAvailableColors } from '../services/api';
import { BaseInput, BaseDropdown, ActionButton } from '../components/ui';

interface ProviderFormData {
  name: string;
  status: string;
  theme_color: string;
}

interface ColorOption {
  name: string;
  value: string;
}

const AddProvider: React.FC = () => {
  const navigate = useNavigate();
  const { api } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableColors, setAvailableColors] = useState<ColorOption[]>([]);
  const [isLoadingColors, setIsLoadingColors] = useState(true);
  const [formData, setFormData] = useState<ProviderFormData>({
    name: '',
    status: 'active',
    theme_color: '' // Will be set when colors are loaded
  });

  // Use our predefined 20 color palette instead of fetching from API
  useEffect(() => {
    setIsLoadingColors(true);
    
    // Define our comprehensive 20-color palette
    const colorPalette = [
      // Primary Colors (Vibrant)
      {name: 'Royal Blue', value: '#2563EB'},      // Bright Blue
      {name: 'Crimson Red', value: '#DC2626'},     // Pure Red
      {name: 'Emerald Green', value: '#16A34A'},   // Bright Green
      {name: 'Violet Purple', value: '#8B5CF6'},   // Vibrant Purple
      {name: 'Tangerine Orange', value: '#F97316'}, // Bright Orange
      
      // Secondary Colors (Rich)
      {name: 'Turquoise', value: '#06B6D4'},       // Cyan
      {name: 'Magenta', value: '#D946EF'},         // Hot Pink
      {name: 'Lime Green', value: '#65A30D'},      // Yellow-Green
      {name: 'Coral', value: '#F59E0B'},           // Orange-Yellow
      {name: 'Amethyst', value: '#7C3AED'},        // Deep Purple
      
      // Sophisticated Colors (Professional)
      {name: 'Navy Blue', value: '#1E40AF'},       // Deep Blue
      {name: 'Forest Green', value: '#15803D'},    // Dark Green
      {name: 'Burgundy', value: '#9F1239'},        // Wine Red
      {name: 'Midnight', value: '#1F2937'},        // Dark Gray
      {name: 'Teal', value: '#0F766E'},            // Blue-Green
      
      // Modern Colors (Contemporary)
      {name: 'Sky Blue', value: '#38BDF8'},        // Light Blue
      {name: 'Mint', value: '#4ADE80'},            // Fresh Green
      {name: 'Lavender', value: '#A78BFA'},        // Soft Purple
      {name: 'Peach', value: '#FB923C'},           // Warm Orange
      {name: 'Rose Gold', value: '#F472B6'},       // Pink
    ];
    
    setAvailableColors(colorPalette);
    
    // Set default color to the first color
    if (!formData.theme_color) {
      setFormData(prev => ({
        ...prev,
        theme_color: colorPalette[0].value
      }));
    }
    
    setIsLoadingColors(false);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // New handler for BaseInput components
  const handleProviderNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      name: e.target.value
    }));
  };

  // New handler for BaseDropdown components
  const handleStatusChange = (value: string | number) => {
    setFormData(prev => ({
      ...prev,
      status: String(value)
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
    
    if (!formData.theme_color) {
      setError('Please select a color for the provider');
      return;
    }
    
    try {
      setIsSubmitting(true);
      setError(null);
      await api.post('/available-providers', formData);
      navigate('/definitions?tab=providers');
    } catch (err: any) {
      console.error('Error creating provider:', err);
      setError(err.response?.data?.detail || 'Failed to create provider');
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
        <Link to="/definitions?tab=providers">
          <ActionButton
            variant="cancel"
            size="md"
            design="minimal"
          >
            Back
          </ActionButton>
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
              Enter the details for this investment provider. All providers require a unique name and color.
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
                    {isLoadingColors ? (
                      <div className="flex justify-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-700"></div>
                      </div>
                    ) : (
                      <>
                        {availableColors.length === 0 ? (
                          <div className="text-center py-3 text-gray-500">
                            No colors available. All colors are currently in use.
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center mb-3">
                              <div 
                                className="h-12 w-12 rounded-full border-2 mr-3 shadow-md" 
                                style={{ 
                                  backgroundColor: formData.theme_color, 
                                  borderColor: formData.theme_color === '#ffffff' ? '#d1d5db' : formData.theme_color 
                                }}
                              ></div>
                              <span className="text-sm font-medium text-gray-700">
                                {availableColors.find(c => c.value === formData.theme_color)?.name || 'Select a color'}
                              </span>
                            </div>

                            <div className="grid grid-cols-4 gap-3">
                              {availableColors.map((color) => (
                                <button
                                  key={color.value}
                                  type="button"
                                  className={`aspect-square w-10 rounded-full hover:ring-2 hover:ring-offset-2 hover:ring-primary-500 focus:outline-none transition-all duration-200 shadow-sm ${
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
                              Select a theme color for this provider. Each provider must have a unique color.
                            </p>
                          </>
                        )}
                      </>
                    )}
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
                      <BaseInput
                        label="Provider Name"
                        placeholder="Enter provider name"
                        value={formData.name}
                        onChange={handleProviderNameChange}
                        required
                        helperText="Enter the name of the financial provider"
                      />
                    </div>

                    <div>
                      <BaseDropdown
                        label="Status"
                        options={[
                          { value: 'active', label: 'Active' },
                          { value: 'inactive', label: 'Inactive' }
                        ]}
                        value={formData.status}
                        onChange={handleStatusChange}
                        placeholder="Select status"
                        helperText="Choose whether this provider is active or inactive"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex justify-end space-x-3">
            <Link to="/definitions?tab=providers">
              <ActionButton
                variant="cancel"
                size="md"
              />
            </Link>
            <ActionButton
              variant="add"
              size="md"
              context="Provider"
              design="descriptive"
              type="submit"
              disabled={isSubmitting || isLoadingColors || availableColors.length === 0}
              loading={isSubmitting}
            />
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddProvider;
