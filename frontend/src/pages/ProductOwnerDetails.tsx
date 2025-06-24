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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
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
    
    try {
      setIsSaving(true);
      
      const updateData = {
        firstname: formData.firstname.trim() || null,
        surname: formData.surname.trim() || null,
        known_as: formData.known_as.trim() || null,
        status: formData.status
      };
      
      const response = await api.patch(`/api/product_owners/${productOwner.id}`, updateData);
      
      setProductOwner(response.data);
      setOriginalFormData(formData);
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
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={handleBack}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {getProductOwnerDisplayName(productOwner)}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Product Owner Details
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {isEditing ? (
              <>
                <ActionButton
                  variant="cancel"
                  size="md"
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                />
                <ActionButton
                  variant="save"
                  size="md"
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
                  size="md"
                  onClick={handleEdit}
                />
                <ActionButton
                  variant="delete"
                  size="md"
                  onClick={() => setShowDeleteModal(true)}
                />
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details */}
        <div className="lg:col-span-2">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Product Owner Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <BaseInput
                label="First Name"
                value={formData.firstname}
                onChange={handleChange('firstname')}
                disabled={!isEditing}
                required
                size="sm"
                fullWidth
              />
              
              <BaseInput
                label="Surname"
                value={formData.surname}
                onChange={handleChange('surname')}
                disabled={!isEditing}
                size="sm"
                fullWidth
              />
              
              <BaseInput
                label="Known As"
                value={formData.known_as}
                onChange={handleChange('known_as')}
                disabled={!isEditing}
                size="sm"
                fullWidth
                helperText="Preferred name or nickname"
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
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Associated Products ({associatedProducts.length})
            </h2>
            
            {associatedProducts.length > 0 ? (
              <div className="space-y-3">
                {associatedProducts.map((product) => (
                  <div
                    key={product.id}
                    className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/products/${product.id}`)}
                  >
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
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m13-8l-2 2m0 0l-2-2m2 2v6" />
                </svg>
                <p className="mt-2 text-sm text-gray-500">No products assigned</p>
              </div>
            )}
          </div>
        </div>
      </div>

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