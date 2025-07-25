import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAvailableColors } from '../services/api';
import DynamicPageContainer from '../components/DynamicPageContainer';
import { EditButton, DeleteButton, ActionButton } from '../components/ui';
import StandardTable, { ColumnConfig } from '../components/StandardTable';

interface Provider {
  id: number;
  name: string;
  status: string;
  theme_color?: string;
  created_at: string;
}

interface ColorOption {
  name: string;
  value: string;
}

interface Product {
  id: number;
  client_id: number;
  client_name?: string; // This is actually the client group name from the API
  product_name: string;
  product_type: string;
  provider_id: number;
  status: string;
  created_at: string;
}

const ProviderDetails: React.FC = () => {
  const { providerId } = useParams<{ providerId: string }>();
  const navigate = useNavigate();
  const { api } = useAuth();
  const [provider, setProvider] = useState<Provider | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Provider>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [availableColors, setAvailableColors] = useState<ColorOption[]>([]);
  const [isLoadingColors, setIsLoadingColors] = useState(false);

  useEffect(() => {
    fetchProvider();
  }, [providerId]);

  useEffect(() => {
    if (isEditing) {
      fetchAvailableColors();
    }
  }, [isEditing, provider]);

  const fetchAvailableColors = async () => {
    try {
      setIsLoadingColors(true);
      
      // Use a comprehensive set of colors (30 colors)
      const comprehensiveColors = [
        // Vibrant / Primary Colors (Row 1)
        {name: 'Blue', value: '#2563EB'},         // Bright Blue
        {name: 'Red', value: '#DC2626'},          // Pure Red
        {name: 'Green', value: '#16A34A'},        // Bright Green
        {name: 'Purple', value: '#8B5CF6'},       // Vibrant Purple
        {name: 'Orange', value: '#F97316'},       // Bright Orange
        
        // Extended Primary Colors (Row 2)
        {name: 'Cyan', value: '#0891B2'},         // Cyan
        {name: 'Pink', value: '#EC4899'},         // Hot Pink
        {name: 'Yellow', value: '#EAB308'},       // Bright Yellow
        {name: 'Teal', value: '#0D9488'},         // Teal
        {name: 'Emerald', value: '#059669'},      // Emerald
        
        // Light / Soft Colors (Row 3)
        {name: 'Sky Blue', value: '#38BDF8'},     // Light Blue
        {name: 'Mint', value: '#4ADE80'},         // Light Green
        {name: 'Lavender', value: '#C4B5FD'},     // Soft Purple
        {name: 'Peach', value: '#FDBA74'},        // Soft Orange
        {name: 'Rose', value: '#FDA4AF'},         // Soft Pink
        
        // Additional Light Colors (Row 4)
        {name: 'Light Cyan', value: '#67E8F9'},   // Light Cyan
        {name: 'Coral', value: '#FCA5A5'},        // Light Coral
        {name: 'Lime', value: '#84CC16'},         // Light Lime
        {name: 'Soft Teal', value: '#5EEAD4'},    // Soft Teal
        {name: 'Amber', value: '#FBBF24'},        // Light Amber
        
        // Deep / Dark Colors (Row 5)
        {name: 'Navy', value: '#1E40AF'},         // Deep Blue
        {name: 'Forest', value: '#15803D'},       // Forest Green
        {name: 'Maroon', value: '#9F1239'},       // Deep Red
        {name: 'Indigo', value: '#4338CA'},       // Deep Purple
        {name: 'Slate', value: '#334155'},        // Dark Slate
        
        // Extended Dark Colors (Row 6)
        {name: 'Deep Teal', value: '#0F766E'},    // Deep Teal
        {name: 'Burgundy', value: '#991B1B'},     // Burgundy
        {name: 'Olive', value: '#65A30D'},        // Olive Green
        {name: 'Midnight', value: '#1E293B'},     // Midnight Blue
        {name: 'Chocolate', value: '#92400E'},    // Dark Brown
      ];
      
      // If the provider already has a color that's not in our list, add it
      let colors = [...comprehensiveColors];
      if (provider?.theme_color) {
        const currentColorExists = colors.some(c => c.value === provider.theme_color);
        if (!currentColorExists) {
          const colorName = getColorNameByValue(provider.theme_color) || 'Current Color';
          colors = [{ name: colorName, value: provider.theme_color }, ...colors];
        }
      }
      
      setAvailableColors(colors);
    } catch (err: any) {
      console.error('Error setting up available colors:', err);
    } finally {
      setIsLoadingColors(false);
    }
  };

  const getColorNameByValue = (value: string): string | undefined => {
    const colorNames: Record<string, string> = {
      // Vibrant / Primary Colors (Row 1)
      '#2563EB': 'Blue',
      '#DC2626': 'Red',
      '#16A34A': 'Green',
      '#8B5CF6': 'Purple',
      '#F97316': 'Orange',
      
      // Extended Primary Colors (Row 2)
      '#0891B2': 'Cyan',
      '#EC4899': 'Pink',
      '#EAB308': 'Yellow',
      '#0D9488': 'Teal',
      '#059669': 'Emerald',
      
      // Light / Soft Colors (Row 3)
      '#38BDF8': 'Sky Blue',
      '#4ADE80': 'Mint',
      '#C4B5FD': 'Lavender',
      '#FDBA74': 'Peach',
      '#FDA4AF': 'Rose',
      
      // Additional Light Colors (Row 4)
      '#67E8F9': 'Light Cyan',
      '#FCA5A5': 'Coral',
      '#84CC16': 'Lime',
      '#5EEAD4': 'Soft Teal',
      '#FBBF24': 'Amber',
      
      // Deep / Dark Colors (Row 5)
      '#1E40AF': 'Navy',
      '#15803D': 'Forest',
      '#9F1239': 'Maroon',
      '#4338CA': 'Indigo',
      '#334155': 'Slate',
      
      // Extended Dark Colors (Row 6)
      '#0F766E': 'Deep Teal',
      '#991B1B': 'Burgundy',
      '#65A30D': 'Olive',
      '#1E293B': 'Midnight',
      '#92400E': 'Chocolate',
      
      // Legacy colors (for backward compatibility)
      '#4F46E5': 'Blue (Legacy)',
      '#EA580C': 'Orange (Legacy)',
      '#7C3AED': 'Purple (Legacy)',
      '#0369A1': 'Light Blue (Legacy)',
      '#B45309': 'Yellow (Legacy)',
      '#0D9488': 'Teal (Legacy)',
      '#BE185D': 'Pink (Legacy)',
      '#475569': 'Slate (Legacy)',
      '#059669': 'Emerald (Legacy)',
      '#D97706': 'Yellow (Legacy)',
      '#9333EA': 'Fuchsia (Legacy)',
      '#0E7490': 'Cyan (Legacy)',
      '#6D28D9': 'Violet (Legacy)',
      '#92400E': 'Amber (Legacy)',
      '#B91C1C': 'Red (Legacy)',
      '#7E22CE': 'Purple (Legacy)',
      '#C2410C': 'Orange (Legacy)',
      '#0F766E': 'Teal (Legacy)',
      '#3730A3': 'Indigo (Legacy)',
      '#047857': 'Emerald (Legacy)',
      '#0284C7': 'Sky (Legacy)',
      '#E11D48': 'Rose (Legacy)',
    };
    return colorNames[value];
  };

  const fetchProvider = async () => {
    try {
      setIsLoading(true);
      // Get provider details
      const providerResponse = await api.get(`/available_providers/${providerId}`);
      
      try {
        // Get products for this provider (using client_products table now)
        const productsResponse = await api.get(`/client_products`, {
          params: { provider_id: providerId }
        });
        
        setProducts(productsResponse.data);
      } catch (productErr: any) {
        console.error('Error fetching provider products:', productErr);
        // Set empty products array if there's an error
        setProducts([]);
      }
      
      setProvider(providerResponse.data);
      setFormData(providerResponse.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch provider details');
    } finally {
      setIsLoading(false);
    }
  };

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

  const handleSaveChanges = async () => {
    // Check if any changes were made
    const hasChanges = Object.keys(formData).some(key => {
      const formValue = (formData as any)[key];
      const originalValue = (provider as any)[key];
      return formValue !== originalValue && formValue !== '';
    });

    if (!hasChanges) {
      // No changes were made, just exit edit mode
      setIsEditing(false);
      setFormData({});
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      await api.patch(`/available_providers/${providerId}`, formData);
      await fetchProvider();
      setIsEditing(false);
      setFormData({});
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({});
    setIsEditing(false);
    setError(null);
  };



  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this provider? This cannot be undone.')) {
      return;
    }

    try {
      setIsDeleting(true);
      await api.delete(`/available_providers/${providerId}`);
      navigate('/definitions/providers', { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete provider');
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle product row click
  const handleProductClick = (product: Product) => {
    navigate(`/products/${product.id}`, {
      state: {
        from: {
          pathname: `/definitions/providers/${providerId}`,
          label: provider?.name || 'Provider Details'
        }
      }
    });
  };

  // Column configuration for products table
  const productColumns: ColumnConfig[] = [
    {
      key: 'product_name',
      label: 'Product Name',
      dataType: 'text',
      alignment: 'left',
      control: 'sort'
    },
    {
      key: 'product_type',
      label: 'Type',
      dataType: 'category',
      alignment: 'left',
      control: 'filter',
      format: (value) => value || 'N/A'
    },
    {
      key: 'client_name',
      label: 'Client Group',
      dataType: 'text',
      alignment: 'left',
      control: 'sort',
      format: (value) => value || 'Unknown'
    },
    {
      key: 'status',
      label: 'Status',
      dataType: 'category',
      alignment: 'left',
      control: 'filter'
    },
    {
      key: 'created_at',
      label: 'Created',
      dataType: 'date',
      alignment: 'left',
      control: 'sort'
    }
  ];



  if (isLoading) {
    return (
      <DynamicPageContainer maxWidth="2800px" className="py-4">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600"></div>
        </div>
      </DynamicPageContainer>
    );
  }

  if (error || !provider) {
    return (
      <DynamicPageContainer maxWidth="2800px" className="py-4">
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mt-8">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-red-700 text-base">
                {error || 'Failed to load provider details. Please try again later.'}
              </p>
              <button
                onClick={() => navigate('/definitions/providers')}
                className="mt-2 text-red-700 underline"
              >
                Return to Providers
              </button>
            </div>
          </div>
        </div>
      </DynamicPageContainer>
    );
  }

  return (
    <DynamicPageContainer maxWidth="2800px" className="py-4">
      {/* Breadcrumbs */}
      <nav className="mb-4 flex" aria-label="Breadcrumb">
        <ol className="inline-flex items-center space-x-1 md:space-x-3">
          <li className="inline-flex items-center">
            <Link 
              to="/definitions/providers" 
              className="inline-flex items-center text-sm font-medium text-gray-500 transition-colors duration-200"
              onMouseEnter={(e) => e.currentTarget.style.color = provider.theme_color || '#EC4899'}
              onMouseLeave={(e) => e.currentTarget.style.color = ''}
            >
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"></path>
              </svg>
              Providers
            </Link>
          </li>
          <li aria-current="page">
            <div className="flex items-center">
              <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"></path>
              </svg>
              <span 
                className="ml-1 text-sm font-medium md:ml-2"
                style={{ color: provider.theme_color || '#EC4899' }}
              >
                {provider.name}
              </span>
            </div>
          </li>
        </ol>
      </nav>

      {/* Header Card */}
      <div 
        className="bg-white shadow-sm rounded-lg border-2 mb-4"
        style={{ borderColor: provider.theme_color || '#FB7185' }}
      >
        <div className="px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {/* Provider Color Indicator */}
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-sm flex-shrink-0"
                style={{ backgroundColor: provider.theme_color || '#6B7280' }}
              >
                {provider.name.charAt(0).toUpperCase()}
              </div>
              
              <h1 className="text-xl font-semibold text-gray-900">{provider.name}</h1>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {!isEditing ? (
                <>
                  <EditButton
                    context="Provider"
                    design="balanced"
                    onClick={() => setIsEditing(true)}
                  />
                  <DeleteButton
                    context="Provider"
                    design="balanced"
                    onClick={handleDeleteClick}
                  />
                </>
              ) : (
                <>
                  <ActionButton
                    variant="cancel"
                    onClick={handleCancel}
                  />
                  <ActionButton
                    variant="save"
                    loading={isSaving}
                    onClick={handleSaveChanges}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Priority Stats with Inline Editing */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        {/* Provider Name Card */}
        <div className={`bg-white shadow-sm rounded-lg border p-4 ${isEditing ? 'border-indigo-300 ring-1 ring-indigo-300' : 'border-gray-100'}`}>
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Provider Name</div>
          <div className="mt-1">
            {isEditing ? (
              <input
                type="text"
                name="name"
                value={formData.name || ''}
                onChange={handleChange}
                className="block w-full text-lg font-semibold border-0 p-0 focus:ring-0 focus:border-0 bg-transparent"
                placeholder="Enter provider name"
              />
            ) : (
              <div className="text-lg font-semibold text-gray-900">{provider.name}</div>
            )}
          </div>
        </div>

        {/* Status Card */}
        <div className={`bg-white shadow-sm rounded-lg border p-4 ${isEditing ? 'border-indigo-300 ring-1 ring-indigo-300' : 'border-gray-100'}`}>
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Status</div>
          <div className="mt-1">
            {isEditing ? (
              <select
                name="status"
                value={formData.status || ''}
                onChange={handleChange}
                className="block w-full text-lg font-semibold border-0 p-0 focus:ring-0 focus:border-0 bg-transparent"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            ) : (
              <div className="text-lg font-semibold text-gray-900">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  provider.status === 'active' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {provider.status}
                </span>
              </div>
            )}
          </div>
        </div>
        
        {/* Theme Color Card */}
        <div className={`bg-white shadow-sm rounded-lg border p-4 ${isEditing ? 'border-indigo-300 ring-1 ring-indigo-300' : 'border-gray-100'}`}>
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Theme Color</div>
          <div className="mt-1">
            {isEditing ? (
              <div className="space-y-2">
                {isLoadingColors ? (
                  <div className="flex items-center justify-center py-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                  </div>
                ) : (
                  <div className="grid grid-cols-6 gap-1">
                    {availableColors.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        onClick={() => handleColorSelect(color.value)}
                        className={`w-6 h-6 rounded border transition-all duration-200 hover:scale-110 ${
                          formData.theme_color === color.value
                            ? 'border-gray-800 ring-1 ring-gray-300'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                        style={{ backgroundColor: color.value }}
                        title={color.name}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <div 
                  className="w-4 h-4 rounded-full border border-gray-300"
                  style={{ backgroundColor: provider.theme_color || '#6B7280' }}
                />
                <span className="text-sm font-medium text-gray-900">
                  {getColorNameByValue(provider.theme_color || '') || 'Default'}
                </span>
              </div>
            )}
          </div>
        </div>
        
        {/* Total Products Card */}
        <div className="bg-white shadow-sm rounded-lg border border-gray-100 p-4">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Products</div>
          <div className="mt-1 text-lg font-semibold text-gray-900">{products.length}</div>
        </div>
      </div>

      {/* Save/Cancel buttons when editing */}
      {isEditing && (
        <div className="mb-4 space-y-3">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
          <div className="flex justify-end space-x-3">
            <ActionButton
              variant="cancel"
              onClick={handleCancel}
            />
            <ActionButton
              variant="save"
              loading={isSaving}
              onClick={handleSaveChanges}
            />
          </div>
        </div>
      )}

      {/* Products Section */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Client Products</h2>
            <p className="text-sm text-gray-500 mt-1">
              Products using this provider across all clients
            </p>
          </div>
        </div>
        
        <div className="p-6">
          {products.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No products found</h3>
              <p className="mt-1 text-sm text-gray-500">
                No client products are currently using this provider.
              </p>
            </div>
          ) : (
            <StandardTable
              data={products}
              columns={productColumns}
              className="cursor-pointer"
              onRowClick={handleProductClick}
            />
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Delete Provider</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Are you sure you want to delete "{provider.name}"? This action cannot be undone.
                  {products.length > 0 && (
                    <span className="block mt-2 text-red-600 font-medium">
                      Warning: This provider has {products.length} associated product{products.length !== 1 ? 's' : ''}. Deleting it may affect these products.
                    </span>
                  )}
                </p>
                <div className="flex justify-end gap-3">
                  <ActionButton
                    variant="cancel"
                    onClick={handleCancelDelete}
                    disabled={isDeleting}
                  />
                  <DeleteButton
                    context="Provider"
                    design="descriptive"
                    loading={isDeleting}
                    onClick={handleDelete}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </DynamicPageContainer>
  );
};

export default ProviderDetails;
