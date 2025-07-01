import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Modal } from 'antd';

import { getProductOwnerDisplayName, ProductOwner } from '../utils/productOwnerUtils';
import FilterSearch from '../components/ui/search/FilterSearch';
import FilterDropdown from '../components/ui/dropdowns/FilterDropdown';
import { BaseInput, MultiSelectDropdown, ActionButton } from '../components/ui';

interface Product {
  id: number;
  product_name: string;
  client_id: number;
  status: string;
}

type SortField = 'firstname' | 'surname' | 'known_as' | 'status';
type SortOrder = 'asc' | 'desc';

const ProductOwners: React.FC = () => {
  const navigate = useNavigate();
  const { api } = useAuth();
  const [productOwners, setProductOwners] = useState<ProductOwner[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('firstname');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);

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
          api.get('/api/product_owners'),
          api.get('/api/client_products')
        ]);
        
        setProductOwners(productOwnersResponse.data || []);
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
    navigate(`/product_owners/${productOwner.id}`);
  };

  const handleSortFieldChange = (field: SortField) => {
    if (field === sortField) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
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
      const response = await api.post('/api/product_owners', {
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
          return api.post('/api/product_owner_products', {
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



  const filteredAndSortedProductOwners = productOwners
    .filter(po => 
        (po.firstname?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (po.surname?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (po.known_as?.toLowerCase() || '').includes(searchQuery.toLowerCase())
    )
    .filter(po =>
      statusFilter.length === 0 ||
      (po.status && statusFilter.includes(po.status))
    )
    .sort((a, b) => {
      const aValue = String(a[sortField] || '').toLowerCase();
      const bValue = String(b[sortField] || '').toLowerCase();
      return sortOrder === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    });



  return (
    <div className="container mx-auto px-4 py-3">
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
              resultCount={filteredAndSortedProductOwners.length}
              filterLabel="Product Owner"
            />
          </div>
        </div>
        <div className="overflow-x-auto overflow-visible">
          <table className="min-w-full table-fixed divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="w-[25%] px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300">
                  <div className="flex items-center group cursor-pointer hover:bg-indigo-50 rounded py-1 px-1 transition-colors duration-150" onClick={() => handleSortFieldChange('firstname')} title="Click to sort by First Name">
                    First Name
                    <span className="ml-1 text-gray-400 group-hover:text-indigo-500">
                      {sortField === 'firstname' ? (
                        sortOrder === 'asc' ? (
                          <svg className="h-4 w-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        ) : (
                          <svg className="h-4 w-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        )
                      ) : (
                        <svg className="h-4 w-4 opacity-0 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4" />
                        </svg>
                      )}
                    </span>
                  </div>
                </th>
                <th className="w-[25%] px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300">
                  <div className="flex items-center group cursor-pointer hover:bg-indigo-50 rounded py-1 px-1 transition-colors duration-150" onClick={() => handleSortFieldChange('surname')} title="Click to sort by Surname">
                    Surname
                    <span className="ml-1 text-gray-400 group-hover:text-indigo-500">
                      {sortField === 'surname' ? (
                        sortOrder === 'asc' ? (
                          <svg className="h-4 w-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        ) : (
                          <svg className="h-4 w-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        )
                      ) : (
                        <svg className="h-4 w-4 opacity-0 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4" />
                        </svg>
                      )}
                    </span>
                  </div>
                </th>
                <th className="w-[30%] px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300">
                  <div className="flex items-center group cursor-pointer hover:bg-indigo-50 rounded py-1 px-1 transition-colors duration-150" onClick={() => handleSortFieldChange('known_as')} title="Click to sort by Known As">
                    Known As
                    <span className="ml-1 text-gray-400 group-hover:text-indigo-500">
                      {sortField === 'known_as' ? (
                        sortOrder === 'asc' ? (
                          <svg className="h-4 w-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                        ) : (
                          <svg className="h-4 w-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        )
                      ) : (
                        <svg className="h-4 w-4 opacity-0 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4" />
                        </svg>
                      )}
                    </span>
                  </div>
                </th>
                <th className="w-[20%] px-6 py-3 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-indigo-300">
                  <div className="flex flex-col items-start">
                    <span className="flex items-center group cursor-pointer" onClick={() => handleSortFieldChange('status')}>
                      Status
                      <span className="ml-1 text-gray-400 group-hover:text-indigo-500">
                        {sortField === 'status' ? (
                          sortOrder === 'asc' ? (
                            <svg className="h-4 w-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          ) : (
                            <svg className="h-4 w-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          )
                        ) : (
                          <svg className="h-4 w-4 opacity-0 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4" />
                          </svg>
                        )}
                      </span>
                    </span>
                    <FilterDropdown
                      id="status-filter"
                      options={[
                        { value: 'active', label: 'Active' },
                        { value: 'inactive', label: 'Inactive' }
                      ]}
                      value={statusFilter}
                      onChange={(vals) => setStatusFilter(vals.filter(v => typeof v === 'string'))}
                      placeholder="All Statuses"
                      className="min-w-[140px] mt-1"
                    />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr><td colSpan={4} className="text-center py-4">Loading...</td></tr>
              ) : error ? (
                <tr><td colSpan={4} className="text-center py-4 text-red-500">{error}</td></tr>
              ) : (
                filteredAndSortedProductOwners.map(po => (
                  <tr 
                    key={po.id} 
                    onClick={() => handleRowClick(po)} 
                    className="hover:bg-indigo-50 transition-colors duration-150 cursor-pointer border-b border-gray-100"
                  >
                    <td className="px-6 py-3 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-800 font-sans tracking-tight">{po.firstname || '-'}</div>
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-800 font-sans tracking-tight">{po.surname || '-'}</div>
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap">
                      <div className="text-sm text-gray-600 font-sans tracking-tight">{po.known_as || '-'}</div>
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        po.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {po.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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
    </div>
  );
};

export default ProductOwners; 