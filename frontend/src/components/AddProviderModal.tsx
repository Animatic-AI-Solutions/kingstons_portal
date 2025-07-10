import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  BaseInput, 
  BaseDropdown,
  ActionButton 
} from './ui';

interface Provider {
  id: number;
  name: string;
  status: string;
  theme_color?: string;
}

interface ProviderFormData {
  name: string;
  status: string;
  theme_color: string;
}

interface ColorOption {
  name: string;
  value: string;
}

interface AddProviderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newProvider: Provider) => void;
  title?: string;
}

const AddProviderModal: React.FC<AddProviderModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  title = "Add New Provider"
}) => {
  const { api } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableColors, setAvailableColors] = useState<ColorOption[]>([]);
  const [isLoadingColors, setIsLoadingColors] = useState(true);
  const [formData, setFormData] = useState<ProviderFormData>({
    name: '',
    status: 'active',
    theme_color: ''
  });

  // Color palette
  useEffect(() => {
    if (!isOpen) return;

    setIsLoadingColors(true);
    
    const colorPalette = [
      // Primary Colors (Vibrant)
      {name: 'Royal Blue', value: '#2563EB'},
      {name: 'Crimson Red', value: '#DC2626'},
      {name: 'Emerald Green', value: '#16A34A'},
      {name: 'Violet Purple', value: '#8B5CF6'},
      {name: 'Tangerine Orange', value: '#F97316'},
      
      // Secondary Colors (Rich)
      {name: 'Turquoise', value: '#06B6D4'},
      {name: 'Magenta', value: '#D946EF'},
      {name: 'Lime Green', value: '#65A30D'},
      {name: 'Coral', value: '#F59E0B'},
      {name: 'Amethyst', value: '#7C3AED'},
      
      // Sophisticated Colors (Professional)
      {name: 'Navy Blue', value: '#1E40AF'},
      {name: 'Forest Green', value: '#15803D'},
      {name: 'Burgundy', value: '#9F1239'},
      {name: 'Midnight', value: '#1F2937'},
      {name: 'Teal', value: '#0F766E'},
      
      // Modern Colors (Contemporary)
      {name: 'Sky Blue', value: '#38BDF8'},
      {name: 'Mint', value: '#4ADE80'},
      {name: 'Lavender', value: '#A78BFA'},
      {name: 'Peach', value: '#FB923C'},
      {name: 'Rose Gold', value: '#F472B6'},
    ];
    
    setAvailableColors(colorPalette);
    
    if (!formData.theme_color) {
      setFormData(prev => ({
        ...prev,
        theme_color: colorPalette[0].value
      }));
    }
    
    setIsLoadingColors(false);
  }, [isOpen]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: '',
        status: 'active',
        theme_color: availableColors[0]?.value || '#2563EB'
      });
      setError(null);
    }
  }, [isOpen]);

  const handleProviderNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      name: e.target.value
    }));
    if (error) setError(null);
  };

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
      const response = await api.post('/api/available_providers', formData);
      onSuccess(response.data);
      onClose();
    } catch (err: any) {
      console.error('Error creating provider:', err);
      setError(err.response?.data?.detail || 'Failed to create provider');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-40">
      <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded"
            disabled={isSubmitting}
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-3 bg-red-50 border-l-4 border-red-500 p-4">
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
        <form onSubmit={handleSubmit} className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 overflow-visible">
            {/* Color picker - Left side */}
            <div className="md:col-span-5 order-2 md:order-1">
              <div className="rounded-lg border border-gray-200 shadow-sm overflow-visible">
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
              <div className="rounded-lg border border-gray-200 shadow-sm overflow-visible">
                <div className="px-3 py-3 bg-gray-50 border-b border-gray-200 sm:px-4">
                  <h3 className="text-base font-medium text-gray-900">Provider Details</h3>
                </div>
                <div className="p-4 overflow-visible">
                  <div className="mb-4">
                    <BaseInput
                      label="Provider Name"
                      placeholder="Enter provider name"
                      value={formData.name}
                      onChange={handleProviderNameChange}
                      required
                      helperText="Enter the name of the financial provider"
                      autoFocus
                    />
                  </div>

                  <div className="overflow-visible">
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

          {/* Footer Actions */}
          <div className="mt-6 flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <ActionButton
              variant="cancel"
              size="md"
              onClick={onClose}
              disabled={isSubmitting}
            />
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

export default AddProviderModal; 