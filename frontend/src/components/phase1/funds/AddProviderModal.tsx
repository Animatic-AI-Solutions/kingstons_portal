import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { 
  BaseInput, 
  BaseDropdown,
  ActionButton 
} from '../../ui';

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
  const [formData, setFormData] = useState<ProviderFormData>({
    name: '',
    status: 'active',
    theme_color: ''
  });

  // Initialize default color
  useEffect(() => {
    if (!isOpen) return;

    if (!formData.theme_color) {
      setFormData(prev => ({
        ...prev,
        theme_color: '#2563EB' // Default to Royal Blue
      }));
    }
  }, [isOpen]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: '',
        status: 'active',
        theme_color: '#2563EB' // Default to Royal Blue
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

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      theme_color: e.target.value
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
      const response = await api.post('/available-providers', formData);
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
                <div className="p-6">
                  {/* Color Preview Circle */}
                  <div className="flex flex-col items-center mb-6">
                    <div
                      className="h-32 w-32 rounded-full border-4 shadow-lg mb-4 transition-all duration-200"
                      style={{
                        backgroundColor: formData.theme_color,
                        borderColor: formData.theme_color
                      }}
                    ></div>
                    <span className="text-lg font-semibold text-gray-900 font-mono">
                      {formData.theme_color.toUpperCase()}
                    </span>
                  </div>

                  {/* Color Picker Input */}
                  <div className="space-y-4">
                    <div className="flex flex-col items-center">
                      <label htmlFor="color-picker" className="block text-sm font-medium text-gray-700 mb-2">
                        Choose Your Color
                      </label>
                      <input
                        id="color-picker"
                        type="color"
                        value={formData.theme_color}
                        onChange={handleColorChange}
                        className="h-16 w-full rounded-lg cursor-pointer border-2 border-gray-300 hover:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all"
                        style={{ colorScheme: 'light' }}
                      />
                    </div>

                    {/* Manual Hex Input */}
                    <div>
                      <label htmlFor="hex-input" className="block text-sm font-medium text-gray-700 mb-1">
                        Or Enter Hex Code
                      </label>
                      <input
                        id="hex-input"
                        type="text"
                        value={formData.theme_color}
                        onChange={handleColorChange}
                        placeholder="#2563EB"
                        maxLength={7}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>

                    <p className="text-sm text-gray-500 text-center">
                      Select a unique theme color for this provider using the color picker or enter a hex code.
                    </p>
                  </div>
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
              disabled={isSubmitting}
              loading={isSubmitting}
            />
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddProviderModal; 