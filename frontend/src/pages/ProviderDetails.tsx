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
  client_name?: string;
  product_name: string;
  product_type: string;
  provider_id: number;
  status: string;
  created_at: string;
}

type TabType = 'info' | 'products';

const ProviderDetails: React.FC = () => {
  const { providerId } = useParams<{ providerId: string }>();
  const navigate = useNavigate();
  const { api } = useAuth();
  const [provider, setProvider] = useState<Provider | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('info');
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
      const response = await api.patch(`/available_providers/${providerId}`, formData);
      setProvider(response.data);
      setIsEditing(false);
      setFormData({});
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update provider');
      console.error('Error updating provider:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset form data to current provider data
    if (provider) {
      setFormData(provider);
    }
    setIsEditing(false);
  };

  const handleAddProduct = () => {
    // Navigate to client products page with the provider ID pre-selected
    navigate(`/create-client-products?provider=${providerId}`);
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

  const renderEditForm = () => {
    return (
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Edit Provider</h3>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        <div className="px-4 py-5 sm:p-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-6">
            <div className="sm:col-span-3">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Provider Name
              </label>
              <div className="mt-1">
                <input
                  type="text"
                  name="name"
                  id="name"
                  value={formData.name || ''}
                  onChange={handleChange}
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                />
              </div>
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                Status
              </label>
              <div className="mt-1">
                <select
                  id="status"
                  name="status"
                  value={formData.status || ''}
                  onChange={handleChange}
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="sm:col-span-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Theme Color
              </label>
              
              {isLoadingColors ? (
                <div className="flex justify-left py-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-700"></div>
                  <span className="ml-2 text-sm text-gray-500">Loading available colors...</span>
                </div>
              ) : (
                <>
                  <div className="flex items-center mb-3">
                    <div 
                      className="h-10 w-10 rounded-full border-2 mr-3 shadow-sm" 
                      style={{ 
                        backgroundColor: formData.theme_color, 
                        borderColor: formData.theme_color === '#ffffff' ? '#d1d5db' : formData.theme_color 
                      }}
                    ></div>
                    <span className="text-sm font-medium text-gray-700">
                      {availableColors.find(c => c.value === formData.theme_color)?.name || 'Select a color'}
                    </span>
                  </div>

                  <div className="grid grid-cols-5 gap-3">
                    {availableColors.map((color) => (
                      <button
                        key={color.value}
                        type="button"
                        className={`aspect-square w-9 rounded-full hover:ring-2 hover:ring-offset-2 hover:ring-primary-500 focus:outline-none transition-all duration-200 shadow-sm ${
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
                  <p className="mt-2 text-sm text-gray-500">
                    Select a theme color for this provider. Each provider must have a unique color.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="px-4 py-3 bg-gray-50 text-right sm:px-6 flex justify-end space-x-3">
          <button
            type="button"
            onClick={handleCancel}
            className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveChanges}
            disabled={isSaving || isLoadingColors}
            className={`inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
              isSaving || isLoadingColors ? 'opacity-50 cursor-not-allowed' : 'hover:bg-indigo-700'
            }`}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-center items-center py-16">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  if (error || !provider) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center">
              <Link to="/definitions?tab=providers" className="text-indigo-600 hover:text-indigo-900 mr-2">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">{provider.name}</h1>
            </div>
            <div className="mt-1 flex items-center">
              <span className={`px-2 inline-flex text-sm leading-5 font-semibold rounded-full ${
                provider.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {provider.status}
              </span>
              <span className="mx-2 text-gray-500">•</span>
              <span className="text-gray-500">
                Created {new Date(provider.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
          <div className="mt-4 md:mt-0 flex flex-wrap gap-2">
            {!isEditing ? (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-md text-base font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  Edit Provider
                </button>
                <button
                  onClick={handleDeleteClick}
                  className="bg-red-600 text-white px-4 py-2 rounded-md text-base font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                >
                  Delete
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleCancel}
                  className="bg-white text-gray-700 border border-gray-300 px-4 py-2 rounded-md text-base font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveChanges}
                  disabled={isSaving}
                  className={`bg-indigo-600 text-white px-4 py-2 rounded-md text-base font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                    isSaving ? 'opacity-70 cursor-not-allowed' : ''
                  }`}
                >
                  {isSaving ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </span>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('info')}
            className={`${
              activeTab === 'info'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-base`}
          >
            Info
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`${
              activeTab === 'products'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-base`}
          >
            Products
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white shadow rounded-lg">
        {/* Info Tab */}
        {activeTab === 'info' && (
          <div className="p-6">
            {isEditing ? (
              renderEditForm()
            ) : (
              <div className="space-y-4 max-w-lg">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Provider Name</dt>
                  <dd className="mt-1 text-base text-gray-900">{provider.name}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Status</dt>
                  <dd className="mt-1 text-base text-gray-900">{provider.status}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Created At</dt>
                  <dd className="mt-1 text-base text-gray-900">
                    {new Date(provider.created_at).toLocaleDateString()}
                  </dd>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Products Tab */}
        {activeTab === 'products' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Products</h2>
              <button
                onClick={handleAddProduct}
                className="bg-indigo-600 text-white px-4 py-2 rounded-md text-base font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                Add Client Product
              </button>
            </div>
            
            {products.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No client products found for this provider.</p>
                <button
                  onClick={handleAddProduct}
                  className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Add Your First Client Product
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">
                        Product Name
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">
                        Product Type
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">
                        Client
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 uppercase tracking-wider">
                        Created
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {products.map((product) => (
                      <tr 
                        key={product.id} 
                        className="hover:bg-gray-50 transition-colors duration-150 cursor-pointer"
                        onClick={() => navigate(`/products/${product.id}`)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-base font-medium text-gray-900">{product.product_name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-base text-gray-900">{product.product_type || "N/A"}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-base text-gray-900">{product.client_name || "Unknown"}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-sm leading-5 font-semibold rounded-full ${
                            product.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {product.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-base text-gray-900">
                            {new Date(product.created_at).toLocaleDateString()}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Confirm Delete</h3>
            <p className="text-sm text-gray-500 mb-4">
              Are you sure you want to delete this provider? This action cannot be undone.
              {products.length > 0 && (
                <span className="block mt-2 text-red-600 font-medium">
                  Warning: This provider has {products.length} associated product(s). Deleting it may affect these products.
                </span>
              )}
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={handleCancelDelete}
                className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete Provider'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProviderDetails;
