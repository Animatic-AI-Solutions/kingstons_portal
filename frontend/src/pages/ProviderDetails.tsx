import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAvailableColors } from '../services/api';

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
      const response = await getAvailableColors();
      let colors = response.data;
      
      // If the provider already has a color, add it to the available colors
      if (provider?.theme_color) {
        const currentColorExists = colors.some((c: ColorOption) => c.value === provider.theme_color);
        if (!currentColorExists) {
          const colorName = getColorNameByValue(provider.theme_color) || 'Current Color';
          colors = [{ name: colorName, value: provider.theme_color }, ...colors];
        }
      }
      
      setAvailableColors(colors);
    } catch (err: any) {
      console.error('Error fetching available colors:', err);
      
      // Use a diverse set of fallback colors
      const fallbackColors = [
        // Vibrant / Pure Colors
        {name: 'Blue', value: '#2563EB'},         // Bright Blue
        {name: 'Red', value: '#DC2626'},          // Pure Red
        {name: 'Green', value: '#16A34A'},        // Bright Green
        {name: 'Purple', value: '#8B5CF6'},       // Vibrant Purple
        {name: 'Orange', value: '#F97316'},       // Bright Orange
        
        // Light / Soft Colors
        {name: 'Sky Blue', value: '#38BDF8'},     // Light Blue
        {name: 'Mint', value: '#4ADE80'},         // Light Green
        {name: 'Lavender', value: '#C4B5FD'},     // Soft Purple
        {name: 'Peach', value: '#FDBA74'},        // Soft Orange
        {name: 'Rose', value: '#FDA4AF'},         // Soft Pink
        
        // Deep / Dark Colors
        {name: 'Navy', value: '#1E40AF'},         // Deep Blue
        {name: 'Forest', value: '#15803D'},       // Forest Green
        {name: 'Maroon', value: '#9F1239'},       // Deep Red
        {name: 'Indigo', value: '#4338CA'},       // Deep Purple
        {name: 'Slate', value: '#334155'},        // Dark Slate
      ];
      
      // If the provider already has a color, add it to the fallback colors
      let colorsWithCurrent = [...fallbackColors];
      if (provider?.theme_color) {
        const currentColorExists = colorsWithCurrent.some(c => c.value === provider.theme_color);
        if (!currentColorExists) {
          const colorName = getColorNameByValue(provider.theme_color) || 'Current Color';
          colorsWithCurrent = [{ name: colorName, value: provider.theme_color }, ...colorsWithCurrent];
        }
      }
      
      setAvailableColors(colorsWithCurrent);
    } finally {
      setIsLoadingColors(false);
    }
  };

  const getColorNameByValue = (value: string): string | undefined => {
    const colorNames: Record<string, string> = {
      // Vibrant / Pure Colors
      '#2563EB': 'Blue',
      '#DC2626': 'Red',
      '#16A34A': 'Green',
      '#8B5CF6': 'Purple',
      '#F97316': 'Orange',
      
      // Light / Soft Colors
      '#38BDF8': 'Sky Blue',
      '#4ADE80': 'Mint',
      '#C4B5FD': 'Lavender',
      '#FDBA74': 'Peach',
      '#FDA4AF': 'Rose',
      
      // Deep / Dark Colors
      '#1E40AF': 'Navy',
      '#15803D': 'Forest',
      '#9F1239': 'Maroon',
      '#4338CA': 'Indigo',
      '#334155': 'Slate',
      
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
    try {
      setIsSaving(true);
      await api.put(`/available_providers/${providerId}`, formData);
      setProvider({ ...provider!, ...formData });
      setIsEditing(false);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData(provider || {});
    setIsEditing(false);
    setError(null);
  };

  const handleAddProduct = () => {
    // Navigate to client products page with the provider ID pre-selected
    navigate(`/create-client-products?provider=${providerId}&returnTo=${encodeURIComponent(`/definitions/providers/${providerId}`)}`);
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
      navigate('/definitions?tab=providers', { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete provider');
    } finally {
      setIsDeleting(false);
    }
  };

  const renderEditForm = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
            Provider Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name || ''}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
            Status
          </label>
          <select
            id="status"
            name="status"
            value={formData.status || ''}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Theme Color
        </label>
        {isLoadingColors ? (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-8 gap-3">
            {availableColors.map((color) => (
              <button
                key={color.value}
                type="button"
                onClick={() => handleColorSelect(color.value)}
                className={`w-10 h-10 rounded-lg border-2 transition-all duration-200 hover:scale-110 ${
                  formData.theme_color === color.value
                    ? 'border-gray-800 ring-2 ring-gray-300'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                style={{ backgroundColor: color.value }}
                title={color.name}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-4">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  if (error || !provider) {
    return (
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-4">
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
                onClick={() => navigate('/definitions?tab=providers')}
                className="mt-2 text-red-700 underline"
              >
                Return to Providers
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="max-w-7xl mx-auto px-4 lg:px-8 py-4 border-l-8"
      style={{ 
        borderLeftColor: provider.theme_color || '#FB7185'
      }}
    >
      {/* Sidebar Color Strip implemented via left border */}
      
      {/* Breadcrumbs */}
      <nav className="mb-4 flex" aria-label="Breadcrumb">
        <ol className="inline-flex items-center space-x-1 md:space-x-3">
          <li className="inline-flex items-center">
            <Link 
              to="/definitions?tab=providers" 
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
        <div className="px-6 py-4">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start space-x-4">
              {/* Provider Color Indicator */}
              <div 
                className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm flex-shrink-0"
                style={{ backgroundColor: provider.theme_color || '#6B7280' }}
              >
                {provider.name.charAt(0).toUpperCase()}
              </div>
              
              <div className="flex-1">
                <h1 className="text-2xl font-semibold text-gray-900">{provider.name}</h1>
                
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded ${
                    provider.status === 'active' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {provider.status}
                  </span>
                  <span className="inline-flex items-center text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                    <div 
                      className="w-3 h-3 rounded-full border border-gray-300 mr-1"
                      style={{ backgroundColor: provider.theme_color || '#6B7280' }}
                    />
                    {getColorNameByValue(provider.theme_color || '') || 'Default'}
                  </span>
                  <span className="inline-flex items-center text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                    {products.length} Product{products.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="mt-4 lg:mt-0 flex flex-wrap gap-2 lg:flex-col lg:items-end">
              {!isEditing ? (
                <>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </button>
                  <button
                    onClick={handleDeleteClick}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleCancel}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveChanges}
                    disabled={isSaving}
                    className={`inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors ${
                      isSaving ? 'opacity-70 cursor-not-allowed' : ''
                    }`}
                  >
                    {isSaving ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Saving...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Save Changes
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Priority Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        <div className="bg-white shadow-sm rounded-lg border border-gray-100 p-4">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Status</div>
          <div className="mt-1 text-lg font-semibold text-gray-900">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              provider.status === 'active' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-gray-100 text-gray-800'
            }`}>
              {provider.status}
            </span>
          </div>
        </div>
        
        <div className="bg-white shadow-sm rounded-lg border border-gray-100 p-4">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Theme Color</div>
          <div className="mt-1 flex items-center space-x-2">
            <div 
              className="w-4 h-4 rounded-full border border-gray-300"
              style={{ backgroundColor: provider.theme_color || '#6B7280' }}
            />
            <span className="text-sm font-medium text-gray-900">
              {getColorNameByValue(provider.theme_color || '') || 'Default'}
            </span>
          </div>
        </div>
        
        <div className="bg-white shadow-sm rounded-lg border border-gray-100 p-4">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Created Date</div>
          <div className="mt-1 text-lg font-semibold text-gray-900">
            {new Date(provider.created_at).toLocaleDateString('en-GB', {
              year: 'numeric',
              month: 'short',
              day: 'numeric'
            })}
          </div>
        </div>
        
        <div className="bg-white shadow-sm rounded-lg border border-gray-100 p-4">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Products</div>
          <div className="mt-1 text-lg font-semibold text-gray-900">{products.length}</div>
        </div>
      </div>

      {/* Edit Form */}
      {isEditing && (
        <div className="bg-white shadow-sm rounded-lg border border-gray-100 mb-4">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Edit Provider Details</h2>
          </div>
          <div className="p-6">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}
            {renderEditForm()}
          </div>
        </div>
      )}

      {/* Products Section */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Client Products</h2>
              <p className="text-sm text-gray-500 mt-1">
                Products using this provider across all clients
              </p>
            </div>
            <button
              onClick={handleAddProduct}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Product
            </button>
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
              <div className="mt-6">
                <button
                  onClick={handleAddProduct}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Your First Product
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300">
                      Product Name
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300">
                      Client Group
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {products.map((product) => (
                    <tr 
                      key={product.id} 
                      className="hover:bg-indigo-50 transition-colors duration-150 cursor-pointer border-b border-gray-100"
                      onClick={() => navigate(`/products/${product.id}`)}
                    >
                      <td className="px-6 py-3 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-800 font-sans tracking-tight">{product.product_name}</div>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-600 font-sans">{product.product_type || "N/A"}</div>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-600 font-sans">{product.client_name || "Unknown"}</div>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          product.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {product.status}
                        </span>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-600 font-sans">
                          {new Date(product.created_at).toLocaleDateString('en-GB', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
                  <button
                    onClick={handleCancelDelete}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
                    disabled={isDeleting}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Deleting...
                      </>
                    ) : (
                      'Delete Provider'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProviderDetails;
