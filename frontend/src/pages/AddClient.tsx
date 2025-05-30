import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SearchableDropdown, { MultiSelectSearchableDropdown } from '../components/ui/SearchableDropdown';

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
  const [advisors, setAdvisors] = useState<string[]>([]);

  // Fetch existing product owners and advisors on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch product owners
        const productOwnersResponse = await api.get('/product_owners');
        setProductOwners(productOwnersResponse.data);

        // Fetch existing client groups to get unique advisor names
        const clientGroupsResponse = await api.get('/client_groups');
        const uniqueAdvisors = [...new Set(
          clientGroupsResponse.data
            .map((client: any) => client.advisor)
            .filter((advisor: string) => advisor !== null && advisor.trim() !== '')
        )] as string[];
        setAdvisors(uniqueAdvisors);
      } catch (err) {
        console.error('Error fetching data:', err);
      }
    };

    fetchData();
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
      setError(null);
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

  // Prepare options for dropdowns
  const advisorOptions = advisors.map(advisor => ({
    value: advisor,
    label: advisor
  }));

  const typeOptions = [
    { value: 'Family', label: 'Family' },
    { value: 'Business', label: 'Business' },
    { value: 'Trust', label: 'Trust' }
  ];

  const statusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'dormant', label: 'Dormant' }
  ];

  const productOwnerOptions = productOwners.map(po => ({
    value: po.id,
    label: po.name
  }));

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

      <div className="bg-white shadow-lg rounded-lg p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Client Group Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                placeholder="Enter client group name"
              />
            </div>

            <div>
              <label htmlFor="advisor" className="block text-sm font-medium text-gray-700 mb-1">
                Advisor
              </label>
              <SearchableDropdown
                id="advisor"
                options={advisorOptions}
                value={formData.advisor || ''}
                onChange={(value) => setFormData(prev => ({ ...prev, advisor: value as string || null }))}
                placeholder="Select or type advisor name"
                className="mt-1"
              />
            </div>

            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                Client Group Type <span className="text-red-500">*</span>
              </label>
              <SearchableDropdown
                id="type"
                options={typeOptions}
                value={formData.type}
                onChange={(value) => setFormData(prev => ({ ...prev, type: value as string }))}
                placeholder="Select client group type"
                className="mt-1"
                required
              />
            </div>

            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                Status <span className="text-red-500">*</span>
              </label>
              <SearchableDropdown
                id="status"
                options={statusOptions}
                value={formData.status}
                onChange={(value) => setFormData(prev => ({ ...prev, status: value as string }))}
                placeholder="Select status"
                className="mt-1"
                required
              />
            </div>
          </div>

          {/* Product Owners Section */}
          <div className="border-t border-gray-200 pt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Product Owners</h3>
              <button
                type="button"
                onClick={() => setShowCreateProductOwnerModal(true)}
                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-primary-700 bg-primary-50 rounded-md hover:bg-primary-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors duration-200"
              >
                <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Create New
              </button>
            </div>
            
            <div className="space-y-3">
              <MultiSelectSearchableDropdown
                id="product-owners"
                options={productOwnerOptions}
                values={selectedProductOwners}
                onChange={setSelectedProductOwners}
                placeholder="Search and select product owners"
                className="w-full"
              />
              
              {/* Selected Product Owners Tags */}
              {selectedProductOwners.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedProductOwners.map(id => {
                    const owner = productOwners.find(po => po.id === id);
                    return owner ? (
                      <div key={id} className="inline-flex items-center bg-primary-50 text-primary-700 rounded-full px-3 py-1 text-sm font-medium">
                        {owner.name}
                        <button
                          type="button"
                          onClick={() => setSelectedProductOwners(prev => prev.filter(poId => poId !== id))}
                          className="ml-2 text-primary-500 hover:text-primary-700 focus:outline-none"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ) : null;
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-primary-700 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-primary-800 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-700 disabled:opacity-50 disabled:cursor-not-allowed font-sans tracking-wide shadow-sm"
            >
              {isSubmitting ? 'Creating...' : 'Create Client Group'}
            </button>
          </div>
        </form>
      </div>

      {/* Create Product Owner Modal */}
      {showCreateProductOwnerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Create New Product Owner</h3>
              <button
                type="button"
                onClick={() => {
                  setShowCreateProductOwnerModal(false);
                  setNewProductOwnerName('');
                  setError(null);
                }}
                className="text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-md"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Product Owner Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newProductOwnerName}
                onChange={(e) => setNewProductOwnerName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
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
                onClick={() => {
                  setShowCreateProductOwnerModal(false);
                  setNewProductOwnerName('');
                  setError(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateProductOwner}
                disabled={isCreatingProductOwner || !newProductOwnerName.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-700 rounded-md hover:bg-primary-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
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
