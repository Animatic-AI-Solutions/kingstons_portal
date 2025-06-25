import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNavigationRefresh } from '../hooks/useNavigationRefresh';
import { 
  BaseInput, 
  InputLabel, 
  InputError,
  ActionButton,
  AddButton
} from '../components/ui';
import SearchableDropdown from '../components/ui/SearchableDropdown';
import { MultiSelectDropdown, CreatableDropdown, BaseDropdown } from '../components/ui';
import CreateProductOwnerModal from '../components/CreateProductOwnerModal';
import { getProductOwnerDisplayName } from '../utils/productOwnerUtils';

interface ClientFormData {
  name: string;
  status: string;
  advisor: string | null;
  type: string;
}

interface ProductOwner {
  id: number;
  firstname?: string;
  surname?: string;
  known_as?: string;
  status: string;
  created_at: string;
}

const AddClient: React.FC = () => {
  const navigate = useNavigate();
  const { api } = useAuth();
  const { navigateWithSuccessMessage, navigateToClientGroups } = useNavigationRefresh();
  const [formData, setFormData] = useState<ClientFormData>({
    name: '',
    status: 'active',
    advisor: null,
    type: 'Family'
  });
  const [productOwners, setProductOwners] = useState<ProductOwner[]>([]);
  const [selectedProductOwners, setSelectedProductOwners] = useState<number[]>([]);
  const [showCreateProductOwnerModal, setShowCreateProductOwnerModal] = useState<boolean>(false);
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

  const handleCreateAdvisor = async (advisorName: string) => {
    try {
      // For now, we'll add the advisor to the local list since there's no specific advisor API endpoint
      // In a real implementation, you might want to create an advisor record in the database
      const newAdvisor = advisorName.trim();
      
      if (!newAdvisor) {
        throw new Error('Advisor name cannot be empty');
      }

      // Add to the local advisors list if it doesn't exist
      if (!advisors.includes(newAdvisor)) {
        setAdvisors(prevAdvisors => [...prevAdvisors, newAdvisor]);
      }

      // Return the option object for the CreatableDropdown
      return {
        value: newAdvisor,
        label: newAdvisor
      };
    } catch (err) {
      console.error('Error creating advisor:', err);
      setError('Failed to create advisor. Please try again.');
      // Return a fallback option instead of null
      return {
        value: advisorName.trim(),
        label: advisorName.trim()
      };
    }
  };

  const handleCreateProductOwner = async (newProductOwner: ProductOwner) => {
    // Add to the list of product owners
    setProductOwners(prevOwners => [...prevOwners, newProductOwner]);
    
    // Select the newly created product owner
    setSelectedProductOwners(prevSelected => [...prevSelected, newProductOwner.id]);
    
    // Close the modal and reset
    setShowCreateProductOwnerModal(false);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      console.log('Creating client with data:', formData);
      
      const response = await api.post('/client_groups', formData);
      const newClientId = response.data.id;
      
      console.log('Client created successfully:', response.data);
      
      // Create product owner associations if any are selected
      if (selectedProductOwners.length > 0) {
        console.log('Creating product owner associations...');
        for (const productOwnerId of selectedProductOwners) {
          try {
            await api.post('/client_group_product_owners', {
              client_group_id: newClientId,
              product_owner_id: productOwnerId
            });
            console.log(`Associated product owner ${productOwnerId} with client ${newClientId}`);
          } catch (err: any) {
            console.error(`Failed to associate product owner ${productOwnerId}:`, err);
            // Continue with other associations even if one fails
          }
        }
      }
      
      // Navigate back to clients list with success message and refresh data
      navigateWithSuccessMessage(
        '/client_groups',
        `Client group "${formData.name}" created successfully`
      );
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
    label: getProductOwnerDisplayName(po)
  }));

  return (
    <div className="container mx-auto px-4 py-3">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-normal text-gray-900 font-sans tracking-wide">Add New Client Group</h1>
        <ActionButton
          variant="cancel"
          onClick={navigateToClientGroups}
        />
      </div>

      <div className="bg-white shadow-lg rounded-lg p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <InputError showIcon>
                {error}
              </InputError>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <BaseInput
              id="name"
              name="name"
              type="text"
              label="Client Group Name"
              placeholder="Enter client group name"
              value={formData.name}
              onChange={handleChange}
              required
              autoComplete="off"
              error={error && !formData.name ? 'Client name is required' : undefined}
              helperText="This will be the primary identifier for the client group"
              leftIcon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              }
            />

            <div>
              <CreatableDropdown
                label="Advisor"
                options={advisorOptions}
                value={formData.advisor || ''}
                onChange={(value) => setFormData(prev => ({ ...prev, advisor: value as string || null }))}
                onCreateOption={handleCreateAdvisor}
                placeholder="Select or create advisor"
                createLabel="Create advisor"
                helperText="Optional: Assign a specific advisor to this client group"
              />
            </div>

            <div>
              <BaseDropdown
                label="Client Group Type"
                options={typeOptions}
                value={formData.type}
                onChange={(value) => setFormData(prev => ({ ...prev, type: value as string }))}
                placeholder="Select client group type"
                required
                helperText="Choose the type that best describes this client group"
              />
            </div>

            <div>
              <BaseDropdown
                label="Status"
                options={statusOptions}
                value={formData.status}
                onChange={(value) => setFormData(prev => ({ ...prev, status: value as string }))}
                placeholder="Select status"
                required
                helperText="Set the current operational status of the client group"
              />
            </div>
          </div>

          {/* Product Owners Section */}
          <div className="border-t border-gray-200 pt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Product Owners</h3>
              <AddButton
                context="Product Owner"
                design="balanced"
                size="md"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowCreateProductOwnerModal(true);
                }}
              />
            </div>
            
            <div className="space-y-3">
              <MultiSelectDropdown
                label=""
                options={productOwnerOptions}
                values={selectedProductOwners}
                onChange={(values: (string | number)[]) => {
                  const numberValues = values.map((v: string | number) => typeof v === 'number' ? v : parseInt(v.toString()));
                  setSelectedProductOwners(numberValues);
                }}
                placeholder="Search and select product owners"
                searchable={true}
                fullWidth={true}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <ActionButton
              variant="cancel"
              onClick={navigateToClientGroups}
              className="min-w-[140px]"
            />
            <ActionButton
              variant="save"
              onClick={(e) => {
                e.preventDefault();
                handleSubmit(e);
              }}
              loading={isSubmitting}
              disabled={isSubmitting}
              className="min-w-[140px]"
            />
          </div>
        </form>
      </div>

      {/* Create Product Owner Modal */}
      {showCreateProductOwnerModal && (
        <CreateProductOwnerModal
          isOpen={showCreateProductOwnerModal}
          onClose={() => {
            setShowCreateProductOwnerModal(false);
            setError(null);
          }}
          onSuccess={handleCreateProductOwner}
          includeProductSelection={false}
          title="Create New Product Owner"
        />
      )}
    </div>
  );
};

export default AddClient;
