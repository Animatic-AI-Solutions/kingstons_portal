import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Modal } from 'antd';
import { BaseInput, ActionButton } from '../components/ui';
import { getProductOwnerDisplayName, ProductOwner } from '../utils/productOwnerUtils';

interface Product {
  id: number;
  product_name: string;
  client_name: string;
  provider_name: string;
  status: string;
  start_date: string;
  product_type: string;
}

interface ProductOwnerFormData {
  firstname: string;
  surname: string;
  known_as: string;
  status: string;
}

const ProductOwnerDetails: React.FC = () => {
  const { productOwnerId } = useParams<{ productOwnerId: string }>();
  const navigate = useNavigate();
  const { api } = useAuth();
  
  const [productOwner, setProductOwner] = useState<ProductOwner | null>(null);
  const [associatedProducts, setAssociatedProducts] = useState<Product[]>([]);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);
  const [isAddingProducts, setIsAddingProducts] = useState(false);
  const [removingProductId, setRemovingProductId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [formData, setFormData] = useState<ProductOwnerFormData>({
    firstname: '',
    surname: '',
    known_as: '',
    status: 'active'
  });
  
  const [originalFormData, setOriginalFormData] = useState<ProductOwnerFormData>({
    firstname: '',
    surname: '',
    known_as: '',
    status: 'active'
  });

  const fetchProductOwnerDetails = async () => {
    try {
      if (!productOwnerId || productOwnerId === 'undefined') {
        setError('Invalid product owner ID: parameter is missing or undefined');
        setIsLoading(false);
        return;
      }
      
      const numericId = parseInt(productOwnerId, 10);
      if (isNaN(numericId)) {
        setError(`Invalid product owner ID: ${productOwnerId} is not a valid number`);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      
      const response = await api.get(`/api/product_owners/${numericId}`);
      const ownerData = response.data;
      
      setProductOwner(ownerData);
      
      // Set form data
      const formDataValues = {
        firstname: ownerData.firstname || '',
        surname: ownerData.surname || '',
        known_as: ownerData.known_as || '',
        status: ownerData.status || 'active'
      };
      
      setFormData(formDataValues);
      setOriginalFormData(formDataValues);
      
      // Fetch associated products
      await fetchAssociatedProducts(numericId);
      
      setIsLoading(false);
    } catch (apiError: any) {
      let errorMessage = 'Failed to fetch product owner details';
      if (apiError.response?.data?.detail) {
        errorMessage = apiError.response.data.detail;
      } else if (apiError.message) {
        errorMessage = apiError.message;
      }
      
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  const fetchAssociatedProducts = async (ownerId: number) => {
    try {
      const response = await api.get(`/api/product_owners/${ownerId}/products`);
      setAssociatedProducts(response.data || []);
    } catch (err: any) {
      console.error('Error fetching associated products:', err);
      setAssociatedProducts([]);
    }
  };

  const fetchAvailableProducts = async () => {
    try {
      setIsLoadingProducts(true);
      const response = await api.get('/api/client_products_with_owners');
      
      // Filter out products that are already associated with this product owner
      const currentProductIds = associatedProducts.map(p => p.id);
      const availableProductsList = response.data.filter((product: any) => 
        !currentProductIds.includes(product.id)
      );
      
      setAvailableProducts(availableProductsList);
    } catch (err: any) {
      console.error('Error fetching available products:', err);
      setAvailableProducts([]);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  const handleAddProducts = async () => {
    if (!productOwner || selectedProductIds.length === 0) return;
    
    try {
      setIsAddingProducts(true);
      
      // Create associations for each selected product
      const promises = selectedProductIds.map(productId =>
        api.post('/api/product_owner_products', {
          product_owner_id: productOwner.id,
          product_id: productId
        })
      );
      
      await Promise.all(promises);
      
      // Refresh the associated products list
      await fetchAssociatedProducts(productOwner.id);
      
      // Close modal and reset selection
      setShowAddProductModal(false);
      setSelectedProductIds([]);
      
      console.log('Products added successfully');
    } catch (error: any) {
      console.error('Error adding products:', error);
      alert('Failed to add products. Please try again.');
    } finally {
      setIsAddingProducts(false);
    }
  };

  const handleRemoveProduct = async (productId: number) => {
    if (!productOwner || removingProductId === productId) return;
    
    // Show confirmation dialog
    const productToRemove = associatedProducts.find(p => p.id === productId);
    const confirmMessage = `Are you sure you want to remove "${productToRemove?.product_name}" from ${getProductOwnerDisplayName(productOwner)}?\n\nThis will only remove the association - the product itself will not be deleted.`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }
    
    try {
      setRemovingProductId(productId);
      
      // Call the new specific endpoint to delete the association
      await api.delete(`/api/product_owner_products/${productOwner.id}/${productId}`);
      
      // Refresh the associated products list
      await fetchAssociatedProducts(productOwner.id);
      
      console.log('Product association removed successfully');
    } catch (error: any) {
      console.error('Error removing product association:', error);
      let errorMessage = 'Failed to remove product association. Please try again.';
      
      if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      }
      
      alert(errorMessage);
    } finally {
      setRemovingProductId(null);
    }
  };

  const handleShowAddProductModal = async () => {
    setShowAddProductModal(true);
    setSearchQuery(''); // Reset search when opening modal
    await fetchAvailableProducts();
  };

  // Filter products based on search query
  const filteredAvailableProducts = React.useMemo(() => {
    if (!searchQuery.trim()) return availableProducts;
    
    const query = searchQuery.toLowerCase();
    return availableProducts.filter(product => 
      product.product_name.toLowerCase().includes(query) ||
      product.client_name.toLowerCase().includes(query)
    );
  }, [availableProducts, searchQuery]);

  useEffect(() => {
    if (productOwnerId) {
      fetchProductOwnerDetails();
    }
  }, [productOwnerId, api]);

  const handleBack = () => {
    navigate('/product_owners');
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setFormData(originalFormData);
    setIsEditing(false);
  };

  const handleSaveChanges = async () => {
    if (!productOwner) return;
    
    // Validate that known_as is not empty
    if (!formData.known_as.trim()) {
      alert('Known As field is required');
      return;
    }
    
    try {
      setIsSaving(true);
      
      const updateData = {
        firstname: formData.firstname.trim() || null,
        surname: formData.surname.trim() || null,
        known_as: formData.known_as.trim(),
        status: formData.status
      };
      
      const response = await api.patch(`/api/product_owners/${productOwner.id}`, updateData);
      
      setProductOwner(response.data);
      
      // Update form data with the actual saved values
      const savedFormData = {
        firstname: response.data.firstname || '',
        surname: response.data.surname || '',
        known_as: response.data.known_as || '',
        status: response.data.status || 'active'
      };
      
      setFormData(savedFormData);
      setOriginalFormData(savedFormData);
      setIsEditing(false);
      
      console.log('Product owner updated successfully');
    } catch (error: any) {
      console.error('Error updating product owner:', error);
      alert('Failed to update product owner. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!productOwner) return;
    
    try {
      setIsDeleting(true);
      await api.delete(`/api/product_owners/${productOwner.id}`);
      
      console.log('Product owner deleted successfully');
      navigate('/product_owners');
    } catch (error: any) {
      console.error('Error deleting product owner:', error);
      alert('Failed to delete product owner. Please try again.');
      setIsDeleting(false);
    }
  };

  const handleChange = (field: keyof ProductOwnerFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
  };

  const hasChanges = () => {
    return JSON.stringify(formData) !== JSON.stringify(originalFormData);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
              <div className="mt-4">
                <button
                  onClick={handleBack}
                  className="bg-red-100 text-red-800 px-3 py-1 rounded text-sm hover:bg-red-200"
                >
                  Back to Product Owners
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!productOwner) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-gray-500">Product owner not found.</p>
          <button
            onClick={handleBack}
            className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
          >
            Back to Product Owners
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      
      {/* Breadcrumbs */}
      <nav className="mb-4 flex" aria-label="Breadcrumb">
        <ol className="inline-flex items-center space-x-1 md:space-x-3">
          <li className="inline-flex items-center">
            <button
              onClick={handleBack}
              className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-primary-700"
            >
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"></path>
              </svg>
              Product Owners
            </button>
            <svg className="w-6 h-6 text-gray-400 ml-1" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"></path>
            </svg>
          </li>
          <li aria-current="page">
            <div className="flex items-center">
              <span className="ml-1 text-sm font-medium text-primary-700 md:ml-2">
                {productOwner ? getProductOwnerDisplayName(productOwner) : 'Product Owner Details'}
              </span>
            </div>
          </li>
        </ol>
      </nav>

      {/* Header */}
      <div className="mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {getProductOwnerDisplayName(productOwner)}
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details */}
        <div className="lg:col-span-2">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900">Product Owner Information</h2>
              
              <div className="flex items-center space-x-2">
                {isEditing ? (
                  <>
                    <ActionButton
                      variant="cancel"
                      size="sm"
                      onClick={handleCancelEdit}
                      disabled={isSaving}
                    />
                    <ActionButton
                      variant="save"
                      size="sm"
                      context="Changes"
                      design="descriptive"
                      onClick={handleSaveChanges}
                      disabled={isSaving || !hasChanges()}
                      loading={isSaving}
                    />
                  </>
                ) : (
                  <>
                    <ActionButton
                      variant="edit"
                      size="sm"
                      onClick={handleEdit}
                    />
                    <ActionButton
                      variant="delete"
                      size="sm"
                      onClick={() => setShowDeleteModal(true)}
                    />
                  </>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <BaseInput
                label="Known As"
                value={formData.known_as}
                onChange={handleChange('known_as')}
                disabled={!isEditing}
                required
                size="sm"
                fullWidth
                helperText="Primary display name (required)"
              />
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={handleChange('status')}
                  disabled={!isEditing}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-50 disabled:text-gray-500"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              
              <BaseInput
                label="First Name"
                value={formData.firstname}
                onChange={handleChange('firstname')}
                disabled={!isEditing}
                size="sm"
                fullWidth
                helperText="Optional"
              />
              
              <BaseInput
                label="Surname"
                value={formData.surname}
                onChange={handleChange('surname')}
                disabled={!isEditing}
                size="sm"
                fullWidth
                helperText="Optional"
              />
            </div>
            
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-900 mb-2">System Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                <div>
                  <span className="font-medium">ID:</span> {productOwner.id}
                </div>
                <div>
                  <span className="font-medium">Created:</span> {productOwner.created_at ? formatDate(productOwner.created_at) : 'N/A'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Associated Products */}
        <div>
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900">
                Associated Products ({associatedProducts.length})
              </h2>
              <button
                onClick={handleShowAddProductModal}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Products
              </button>
            </div>
            
            {associatedProducts.length > 0 ? (
              <div className="space-y-3">
                {associatedProducts.map((product) => (
                  <div
                    key={product.id}
                    className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 cursor-pointer" onClick={() => navigate(`/products/${product.id}`)}>
                        <div className="font-medium text-sm text-gray-900 truncate">
                          {product.product_name}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {product.client_name}
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-gray-500">
                            {product.provider_name}
                          </span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            product.status === 'active' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {product.status}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveProduct(product.id);
                        }}
                        disabled={removingProductId === product.id}
                        className={`ml-3 transition-colors ${
                          removingProductId === product.id 
                            ? 'text-gray-400 cursor-not-allowed' 
                            : 'text-red-400 hover:text-red-600'
                        }`}
                        title={removingProductId === product.id ? "Removing..." : "Remove product"}
                      >
                        {removingProductId === product.id ? (
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m13-8l-2 2m0 0l-2-2m2 2v6" />
                </svg>
                <p className="mt-2 text-sm text-gray-500">No products assigned</p>
                <button
                  onClick={handleShowAddProductModal}
                  className="mt-3 inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Add Products
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Products Modal */}
      {showAddProductModal && (
        <Modal
          title="Add Products to Product Owner"
          open={showAddProductModal}
          onCancel={() => {
            setShowAddProductModal(false);
            setSelectedProductIds([]);
          }}
          onOk={handleAddProducts}
          confirmLoading={isAddingProducts}
          okText="Add Selected Products"
          okButtonProps={{ disabled: selectedProductIds.length === 0 }}
          maskClosable={false}
          centered
          width={800}
        >
          <div className="py-4">
            <p className="text-gray-700 mb-4">
              Select products to assign to <strong>{getProductOwnerDisplayName(productOwner)}</strong>:
            </p>
            
            {/* Search Input */}
            <div className="mb-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Search by client group or product name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    <svg className="h-4 w-4 text-gray-400 hover:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              {searchQuery && (
                <p className="mt-2 text-sm text-gray-500">
                  Showing {filteredAvailableProducts.length} of {availableProducts.length} products
                </p>
              )}
            </div>
            
            {isLoadingProducts ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              </div>
            ) : filteredAvailableProducts.length > 0 ? (
              <div className="max-h-96 overflow-y-auto space-y-2">
                {filteredAvailableProducts.map((product) => (
                  <div
                    key={product.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedProductIds.includes(product.id)
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => {
                      setSelectedProductIds(prev => 
                        prev.includes(product.id)
                          ? prev.filter(id => id !== product.id)
                          : [...prev, product.id]
                      );
                    }}
                  >
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedProductIds.includes(product.id)}
                        onChange={() => {}} // Handled by div onClick
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded mr-3"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-sm text-gray-900">
                          {product.product_name}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Client: {product.client_name} • Provider: {product.provider_name}
                        </div>
                        <div className="flex items-center mt-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            product.status === 'active' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {product.status}
                          </span>
                          <span className="ml-2 text-xs text-gray-500">
                            {product.product_type}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m13-8l-2 2m0 0l-2-2m2 2v6" />
                </svg>
                {searchQuery ? (
                  <>
                    <p className="mt-2 text-sm text-gray-500">No products found matching "{searchQuery}"</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Try adjusting your search terms or clear the search to see all available products
                    </p>
                    <button
                      onClick={() => setSearchQuery('')}
                      className="mt-3 inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Clear Search
                    </button>
                  </>
                ) : (
                  <>
                    <p className="mt-2 text-sm text-gray-500">No available products to assign</p>
                    <p className="text-xs text-gray-400 mt-1">
                      All products may already be assigned to this product owner
                    </p>
                  </>
                )}
              </div>
            )}
            
            {selectedProductIds.length > 0 && (
              <div className="mt-4 p-3 bg-indigo-50 border border-indigo-200 rounded">
                <p className="text-sm text-indigo-800">
                  <strong>{selectedProductIds.length}</strong> product{selectedProductIds.length !== 1 ? 's' : ''} selected
                </p>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <Modal
          title="Delete Product Owner"
          open={showDeleteModal}
          onCancel={() => setShowDeleteModal(false)}
          onOk={handleDelete}
          confirmLoading={isDeleting}
          okText="Delete"
          okButtonProps={{ danger: true }}
          maskClosable={false}
          centered
        >
          <div className="py-4">
            <p className="text-gray-700">
              Are you sure you want to delete <strong>{getProductOwnerDisplayName(productOwner)}</strong>?
            </p>
            <p className="text-sm text-gray-500 mt-2">
              This action cannot be undone. The product owner will be removed from all associated products.
            </p>
            {associatedProducts.length > 0 && (
              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-sm text-yellow-800">
                  <strong>Warning:</strong> This product owner is currently associated with {associatedProducts.length} product(s).
                </p>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ProductOwnerDetails; 