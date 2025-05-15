import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ClientFormData {
  name: string;
  status: string;
  advisor: string | null;
  type: string;
}

interface ProductOwner {
  id: number;
  name: string;
  status: string;
  created_at: string;
}

const AddClient: React.FC = () => {
  const navigate = useNavigate();
  const { api } = useAuth();
  const [formData, setFormData] = useState<ClientFormData>({
    name: '',
    status: 'active',
    advisor: null,
    type: 'Family'
  });
  const [productOwners, setProductOwners] = useState<ProductOwner[]>([]);
  const [selectedProductOwners, setSelectedProductOwners] = useState<number[]>([]);
  const [newProductOwnerName, setNewProductOwnerName] = useState<string>('');
  const [showCreateProductOwnerModal, setShowCreateProductOwnerModal] = useState<boolean>(false);
  const [isCreatingProductOwner, setIsCreatingProductOwner] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch existing product owners on component mount
  useEffect(() => {
    const fetchProductOwners = async () => {
      try {
        const response = await api.get('/product_owners');
        setProductOwners(response.data);
      } catch (err) {
        console.error('Error fetching product owners:', err);
      }
    };

    fetchProductOwners();
  }, [api]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value === '' ? null : value
    }));
  };

  const handleCreateProductOwner = async () => {
    if (!newProductOwnerName.trim()) {
      setError('Please enter a name for the product owner');
      return;
    }

    setIsCreatingProductOwner(true);
    try {
      // Create a new product owner
      const response = await api.post('/product_owners', {
        name: newProductOwnerName,
        status: 'active'
      });

      const newProductOwner = response.data;
      
      // Add to the list of product owners
      setProductOwners(prevOwners => [...prevOwners, newProductOwner]);
      
      // Select the newly created product owner
      setSelectedProductOwners(prevSelected => [...prevSelected, newProductOwner.id]);
      
      // Close the modal and reset
      setShowCreateProductOwnerModal(false);
      setNewProductOwnerName('');
    } catch (err) {
      console.error('Error creating product owner:', err);
      setError('Failed to create product owner. Please try again.');
    } finally {
      setIsCreatingProductOwner(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Validate form data
    if (!formData.name?.trim()) {
      setError('Client name is required');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Create the client group
      const response = await api.post('/client_groups', formData);
      const newClientGroup = response.data;
      
      // If there are selected product owners, create associations
      if (selectedProductOwners.length > 0) {
        for (const productOwnerId of selectedProductOwners) {
          try {
            await api.post('/client_group_product_owners', {
              client_group_id: newClientGroup.id,
              product_owner_id: productOwnerId
            });
          } catch (err) {
            console.error(`Error associating product owner ${productOwnerId} with client group:`, err);
            // Continue with other associations even if one fails
          }
        }
      }
      
      // Redirect to clients list
      navigate('/client_groups');
    } catch (err: any) {
      setError(`Failed to create client: ${JSON.stringify(err.response?.data || err.message)}`);
      console.error('Error creating client:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-3">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-normal text-gray-900 font-sans tracking-wide">Add New Client Group</h1>
        <button
          onClick={() => navigate('/client_groups')}
          className="bg-gray-200 text-gray-700 px-5 py-2 rounded-xl font-medium hover:bg-gray-300 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 font-sans tracking-wide shadow-sm"
        >
          Cancel
        </button>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Client Group Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="advisor" className="block text-sm font-medium text-gray-700">
                Advisor
              </label>
              <input
                type="text"
                id="advisor"
                name="advisor"
                value={formData.advisor || ''}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700">
                Client Group Type
              </label>
              <select
                id="type"
                name="type"
                value={formData.type}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="Family">Family</option>
                <option value="Business">Business</option>
                <option value="Trust">Trust</option>
              </select>
            </div>

            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                Status
              </label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="dormant">Dormant</option>
              </select>
            </div>
          </div>

          {/* Product Owners Section */}
          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Product Owners</h3>
            <div className="flex flex-wrap gap-2 mb-3">
              {selectedProductOwners.map(id => {
                const owner = productOwners.find(po => po.id === id);
                return owner ? (
                  <div key={id} className="inline-flex items-center bg-indigo-50 text-indigo-700 rounded-full px-3 py-1 text-sm">
                    {owner.name}
                    <button
                      type="button"
                      onClick={() => setSelectedProductOwners(prev => prev.filter(poId => poId !== id))}
                      className="ml-1 text-indigo-500 hover:text-indigo-700"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : null;
              })}
              {selectedProductOwners.length === 0 && (
                <div className="text-gray-500 text-sm">No product owners selected</div>
              )}
            </div>
            
            <div className="flex space-x-2">
              <select
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                value=""
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "create-new") {
                    setShowCreateProductOwnerModal(true);
                  } else if (value && !selectedProductOwners.includes(Number(value))) {
                    setSelectedProductOwners(prev => [...prev, Number(value)]);
                  }
                  e.target.value = ""; // Reset the select after selection
                }}
              >
                <option value="">Select a product owner</option>
                {productOwners
                  .filter(po => !selectedProductOwners.includes(po.id))
                  .map(po => (
                    <option key={po.id} value={po.id}>
                      {po.name}
                    </option>
                  ))
                }
                <option value="create-new">+ Create new product owner</option>
              </select>
              <button
                type="button"
                onClick={() => setShowCreateProductOwnerModal(true)}
                className="bg-primary-600 text-white p-2 rounded hover:bg-primary-700 transition-colors duration-150 inline-flex items-center justify-center"
                title="Create new product owner"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-primary-700 text-white px-5 py-2 rounded-xl font-medium hover:bg-primary-800 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-700 disabled:opacity-50 disabled:cursor-not-allowed font-sans tracking-wide shadow-sm"
            >
              {isSubmitting ? 'Creating...' : 'Create Client Group'}
            </button>
          </div>
        </form>
      </div>

      {/* Create Product Owner Modal */}
      {showCreateProductOwnerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Create New Product Owner</h3>
              <button
                type="button"
                onClick={() => setShowCreateProductOwnerModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Product Owner Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newProductOwnerName}
                onChange={(e) => setNewProductOwnerName(e.target.value)}
                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                placeholder="Enter product owner name"
                required
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleCreateProductOwner();
                  }
                }}
                autoFocus
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowCreateProductOwnerModal(false)}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateProductOwner}
                disabled={isCreatingProductOwner}
                className="bg-primary-700 text-white px-4 py-2 rounded-md hover:bg-primary-800 disabled:opacity-50"
              >
                {isCreatingProductOwner ? 'Creating...' : 'Create Product Owner'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddClient;
