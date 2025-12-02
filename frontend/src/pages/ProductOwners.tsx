import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Modal } from 'antd';

import { getProductOwnerDisplayName, ProductOwner } from '../utils/productOwnerUtils';
import FilterSearch from '../components/ui/search/FilterSearch';
import FilterDropdown from '../components/ui/dropdowns/FilterDropdown';
import { BaseInput, MultiSelectDropdown, ActionButton } from '../components/ui';
import StandardTable, { ColumnConfig } from '../components/StandardTable';
import DynamicPageContainer from '../components/DynamicPageContainer';

interface Product {
  id: number;
  product_name: string;
  client_id: number;
  status: string;
}

const ProductOwners: React.FC = () => {
  const navigate = useNavigate();
  const { api } = useAuth();
  const [productOwners, setProductOwners] = useState<ProductOwner[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Create modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newProductOwnerData, setNewProductOwnerData] = useState({
    firstname: '',
    surname: '',
    known_as: '',
    selectedProducts: [] as number[]
  });

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [productOwnersResponse, productsResponse] = await Promise.all([
          api.get('/product-owners'),
          api.get('/client-products')
        ]);

        const owners = productOwnersResponse.data || [];
        console.log('🔍 Received product owners from API:', owners.length);

        // Check if Steven Smart is in the data
        const stevenSmart = owners.find((po: ProductOwner) =>
          po.known_as?.toLowerCase().includes('steven') ||
          po.firstname?.toLowerCase().includes('steven') ||
          po.surname?.toLowerCase().includes('smart')
        );

        if (stevenSmart) {
          console.log('🔍 Steven Smart found in API response:', stevenSmart);
        } else {
          console.warn('🔍 Steven Smart NOT found in API response');
          console.log('🔍 All product owners:', owners.map((po: ProductOwner) => ({
            id: po.id,
            firstname: po.firstname,
            surname: po.surname,
            known_as: po.known_as,
            status: po.status
          })));
        }

        setProductOwners(owners);
        setProducts(productsResponse.data || []);
      } catch (err) {
        setError('Failed to fetch data');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [api]);

  const handleRowClick = (productOwner: ProductOwner) => {
    navigate(`/product-owners/${productOwner.id}`);
  };

  const handleCreateProductOwner = async () => {
    if (!newProductOwnerData.known_as.trim()) {
      alert('Known As field is required');
      return;
    }

    setIsCreating(true);
    try {
      console.log('Creating product owner with data:', {
        firstname: newProductOwnerData.firstname.trim() || null,
        surname: newProductOwnerData.surname.trim() || null,
        known_as: newProductOwnerData.known_as.trim(),
        status: 'active'
      });

      // Create the product owner
      const response = await api.post('/product-owners', {
        firstname: newProductOwnerData.firstname.trim() || null,
        surname: newProductOwnerData.surname.trim() || null,
        known_as: newProductOwnerData.known_as.trim(),
        status: 'active'
      });

      console.log('Product owner creation response:', response);
      const newProductOwner = response.data;
      console.log('New product owner data:', newProductOwner);
      
      // Add to the list of product owners
      setProductOwners(prev => [...prev, newProductOwner]);

      // If products are selected, assign the product owner to them
      if (newProductOwnerData.selectedProducts.length > 0) {
        console.log('Assigning to products:', newProductOwnerData.selectedProducts);
        const assignmentPromises = newProductOwnerData.selectedProducts.map(productId => {
          console.log(`Assigning product owner ${newProductOwner.id} to product ${productId}`);
          return api.post('/product-owner-products', {
            product_owner_id: newProductOwner.id,
            product_id: productId
          });
        });

        const assignmentResults = await Promise.all(assignmentPromises);
        console.log('Assignment results:', assignmentResults);
      }

      console.log('Product owner created successfully');
      
      // Close modal and reset form
      setShowCreateModal(false);
      resetForm();
      alert('Product owner created successfully!');
      
    } catch (error: any) {
      console.error('Error creating product owner:', error);
      console.error('Error details:', error.response?.data);
      alert('Failed to create product owner. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const resetForm = () => {
    setNewProductOwnerData({
      firstname: '',
      surname: '',
      known_as: '',
      selectedProducts: []
    });
  };

  const handleOpenCreateModal = () => {
    setShowCreateModal(true);
  };

  const handleCloseCreateModal = () => {
    setShowCreateModal(false);
    resetForm();
  };



  // Apply search filtering only - StandardTable will handle column filtering and sorting
  const searchFilteredProductOwners = productOwners.filter(po => 
    searchQuery === '' || 
        (po.firstname?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (po.surname?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (po.known_as?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  // Column configuration for StandardTable
  const columns: ColumnConfig[] = [
    {
      key: 'firstname',
      label: 'First Name',
      dataType: 'text',
      alignment: 'left',
      control: 'sort'
    },
    {
      key: 'surname',
      label: 'Surname',
      dataType: 'text',
      alignment: 'left',
      control: 'sort'
    },
    {
      key: 'known_as',
      label: 'Known As',
      dataType: 'text',
      alignment: 'left',
      control: 'sort'
    },
    {
      key: 'status',
      label: 'Status',
      dataType: 'category',
      alignment: 'left',
      control: 'filter'
    }
  ];



  return (
    <DynamicPageContainer 
      maxWidth="2800px"
      className="py-3"
    >
      <div className="flex justify-between items-center mb-3">
        <h1 className="text-3xl font-normal text-gray-900 font-sans tracking-wide">Product Owners</h1>
        <div className="flex items-center gap-4">
          <button
            onClick={handleOpenCreateModal}
            className="bg-primary-700 text-white px-4 py-1.5 rounded-xl font-medium hover:bg-primary-800 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-700 focus:ring-offset-2 shadow-sm flex items-center gap-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Create Product Owner
          </button>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-4">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="flex-1">
            <FilterSearch
              placeholder="Filter by name..."
              onFilter={setSearchQuery}
              showResultCount={true}
              resultCount={searchFilteredProductOwners.length}
              filterLabel="Product Owner"
            />
          </div>
        </div>
        {isLoading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                  </div>
        ) : error ? (
          <div className="text-red-600 text-center py-4">{error}</div>
        ) : searchFilteredProductOwners.length === 0 ? (
          <div className="text-gray-500 text-center py-4">No product owners found</div>
        ) : (
          <StandardTable
            data={searchFilteredProductOwners}
            columns={columns}
            className="cursor-pointer"
            onRowClick={(productOwner) => handleRowClick(productOwner)}
          />
        )}
      </div>

      {/* Create Product Owner Modal */}
      {showCreateModal && (
        <Modal
          title="Create New Product Owner"
          open={showCreateModal}
          onCancel={handleCloseCreateModal}
          onOk={handleCreateProductOwner}
          confirmLoading={isCreating}
          okText="Create Product Owner"
          maskClosable={false}
          centered
          className="product-owner-modal"
        >
          <div className="space-y-4">
            <BaseInput
              label="Known As"
              value={newProductOwnerData.known_as}
              onChange={(e) => setNewProductOwnerData(prev => ({ ...prev, known_as: e.target.value }))}
              placeholder="Enter preferred name or nickname"
              required
              size="sm"
              fullWidth
              autoFocus
              helperText="This is the primary display name and is required"
            />
            <BaseInput
              label="First Name"
              value={newProductOwnerData.firstname}
              onChange={(e) => setNewProductOwnerData(prev => ({ ...prev, firstname: e.target.value }))}
              placeholder="Enter first name (optional)"
              size="sm"
              fullWidth
            />
            <BaseInput
              label="Surname"
              value={newProductOwnerData.surname}
              onChange={(e) => setNewProductOwnerData(prev => ({ ...prev, surname: e.target.value }))}
              placeholder="Enter surname (optional)"
              size="sm"
              fullWidth
            />
            <MultiSelectDropdown
              label="Assign to Products (Optional)"
              options={products.map(product => ({ 
                value: product.id.toString(), 
                label: product.product_name 
              }))}
              values={newProductOwnerData.selectedProducts.map(id => id.toString())}
              onChange={(values) => {
                const numericValues = values.map(v => parseInt(String(v)));
                setNewProductOwnerData(prev => ({ ...prev, selectedProducts: numericValues }));
              }}
              placeholder="Select products to assign this owner to..."
              size="sm"
              fullWidth
            />
          </div>
        </Modal>
      )}
    </DynamicPageContainer>
  );
};

export default ProductOwners; 