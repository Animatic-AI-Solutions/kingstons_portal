import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  BaseInput, 
  ActionButton, 
  AddButton,
  MultiSelectDropdown,
  InputError 
} from './ui';

interface Product {
  id: number;
  product_name: string;
  client_name?: string;
  provider_name?: string;
}

interface ProductOwner {
  id: number;
  firstname?: string;
  surname?: string;
  known_as: string;
  status: string;
  created_at: string;
}

interface CreateProductOwnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newProductOwner: ProductOwner) => void;
  preselectedProductIds?: number[];
  title?: string;
  includeProductSelection?: boolean;
}

const CreateProductOwnerModal: React.FC<CreateProductOwnerModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  preselectedProductIds = [],
  title = "Create New Product Owner",
  includeProductSelection = true
}) => {
  const { api } = useAuth();
  
  // Form state
  const [formData, setFormData] = useState({
    firstname: '',
    surname: '',
    known_as: ''
  });
  
  // Product selection state
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>(preselectedProductIds);
  
  // UI state
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{[key: string]: string}>({});

  // Fetch available products when modal opens
  useEffect(() => {
    if (isOpen && includeProductSelection) {
      fetchAvailableProducts();
    }
    // Reset selected products to preselected ones when modal opens
    setSelectedProductIds(preselectedProductIds);
  }, [isOpen, includeProductSelection, preselectedProductIds]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({ firstname: '', surname: '', known_as: '' });
      setSelectedProductIds([]);
      setError(null);
      setFieldErrors({});
    }
  }, [isOpen]);

  const fetchAvailableProducts = async () => {
    try {
      const response = await api.get('/client_products');
      setAvailableProducts(response.data || []);
    } catch (err: any) {
      console.error('Error fetching products:', err);
      setError('Failed to load available products. You can still create the product owner without product associations.');
    }
  };

  // Helper function to filter out numbers and special characters, allowing only letters, spaces, hyphens, and apostrophes
  const filterNameInput = (value: string): string => {
    // Only allow letters (a-z, A-Z), spaces, hyphens, and apostrophes (for names like O'Connor, Anne-Marie)
    return value.replace(/[^a-zA-Z\s\-']/g, '');
  };

  // Helper function to prevent restricted characters from being typed
  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow control keys (backspace, delete, arrow keys, etc.)
    if (e.ctrlKey || e.metaKey || e.altKey || 
        ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'Tab', 'Escape', 'Enter'].includes(e.key)) {
      return;
    }
    
    // Allow letters, spaces, hyphens, and apostrophes
    const allowedChars = /^[a-zA-Z\s\-']$/;
    if (!allowedChars.test(e.key)) {
      e.preventDefault();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Filter input for name fields
    const nameFields = ['firstname', 'surname', 'known_as'];
    const filteredValue = nameFields.includes(name) ? filterNameInput(value) : value;
    
    setFormData(prev => ({
      ...prev,
      [name]: filteredValue
    }));
    
    // Clear field error when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = (): boolean => {
    const errors: {[key: string]: string} = {};
    
    // Known as is required
    if (!formData.known_as.trim()) {
      errors.known_as = 'Known as field is required';
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
      // Create the product owner
      const productOwnerData = {
        firstname: formData.firstname.trim() || null,
        surname: formData.surname.trim() || null,
        known_as: formData.known_as.trim(),
        status: 'active'
      };

      const response = await api.post('/product_owners', productOwnerData);
      const newProductOwner = response.data;

      // If products are selected, create associations
      if (includeProductSelection && selectedProductIds.length > 0) {
        const associationPromises = selectedProductIds.map(productId =>
          api.post('/product_owner_products', {
            product_owner_id: newProductOwner.id,
            product_id: productId
          }).catch(err => {
            console.error(`Failed to associate product ${productId}:`, err);
            // Don't throw - we want to continue with other associations
            return null;
          })
        );

        await Promise.all(associationPromises);
      }

      // Call success callback
      onSuccess(newProductOwner);
      
      // Close modal
      onClose();
      
    } catch (err: any) {
      console.error('Error creating product owner:', err);
      
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
        setError('A product owner with this information already exists.');
      } else {
        setError(err.response?.data?.message || err.response?.data?.detail || 'Failed to create product owner. Please try again.');
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

  const productOptions = availableProducts.map(product => ({
    value: product.id,
    label: `${product.product_name}${product.client_name ? ` (${product.client_name})` : ''}${product.provider_name ? ` - ${product.provider_name}` : ''}`
  }));

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

          {/* Name Fields */}
          <div className="space-y-4">
            <h4 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
              Product Owner Details
            </h4>
            
            {/* Known As - Required */}
            <BaseInput
              id="known_as"
              name="known_as"
              type="text"
              label="Known As"
              placeholder="Enter preferred name or nickname"
              value={formData.known_as}
              onChange={handleInputChange}
              onKeyDown={handleNameKeyDown}
              maxLength={50}
              required
              error={fieldErrors.known_as}
              helperText="This will be the primary display name for the product owner (letters, spaces, hyphens, and apostrophes only)"
              leftIcon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              }
              autoFocus
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* First Name - Optional */}
              <BaseInput
                id="firstname"
                name="firstname"
                type="text"
                label="First Name"
                placeholder="Enter first name (optional)"
                value={formData.firstname}
                onChange={handleInputChange}
                onKeyDown={handleNameKeyDown}
                maxLength={50}
                error={fieldErrors.firstname}
                helperText="Optional: Used for formal display when both first and last names are provided (letters, spaces, hyphens, and apostrophes only)"
                leftIcon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                }
              />

              {/* Surname - Optional */}
              <BaseInput
                id="surname"
                name="surname"
                type="text"
                label="Surname"
                placeholder="Enter surname (optional)"
                value={formData.surname}
                onChange={handleInputChange}
                onKeyDown={handleNameKeyDown}
                maxLength={50}
                error={fieldErrors.surname}
                helperText="Optional: Used for formal display when both first and last names are provided (letters, spaces, hyphens, and apostrophes only)"
                leftIcon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                }
              />
            </div>
          </div>

          {/* Product Selection */}
          {includeProductSelection && (
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-gray-900 border-b border-gray-200 pb-2">
                Product Associations
              </h4>
              
              <div>
                <MultiSelectDropdown
                  label="Select Products"
                  options={productOptions}
                  values={selectedProductIds}
                  onChange={(values: (string | number)[]) => {
                    const numberValues = values.map((v: string | number) => 
                      typeof v === 'number' ? v : parseInt(v.toString())
                    );
                    setSelectedProductIds(numberValues);
                  }}
                  placeholder="Search and select products to associate with this product owner"
                  searchable={true}
                  helperText="Optional: You can associate this product owner with specific products now, or do it later"
                />
              </div>
              
              {selectedProductIds.length > 0 && (
                <div className="text-sm text-gray-600">
                  {selectedProductIds.length} product{selectedProductIds.length !== 1 ? 's' : ''} selected
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <ActionButton
              variant="cancel"
              onClick={onClose}
              disabled={isCreating}
            />
            <AddButton
              context="Product Owner"
              design="balanced"
              size="md"
              type="submit"
              loading={isCreating}
              disabled={isCreating || !formData.known_as.trim()}
            />
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateProductOwnerModal; 