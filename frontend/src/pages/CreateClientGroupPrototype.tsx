import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusIcon, XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';
import DynamicPageContainer from '../components/DynamicPageContainer';
import { useClientGroupForm } from '../hooks/useClientGroupForm';
import { useCreateClientGroupFlow } from '../hooks/useCreateClientGroupFlow';
import { useAuth } from '../context/AuthContext';
import {
  BaseInput,
  BaseDropdown,
  TextArea,
  ActionButton,
  AddButton,
  EditButton,
  DeleteButton,
  ErrorDisplay,
  Button,
} from '../components/ui';
import {
  TITLE_OPTIONS,
  RELATIONSHIP_STATUS_OPTIONS,
  GENDER_OPTIONS,
  EMPLOYMENT_STATUS_OPTIONS,
  CLIENT_GROUP_TYPES,
  STATUS_OPTIONS,
  AML_RESULT_OPTIONS,
} from '../constants/clientGroup';

/**
 * CreateClientGroupPrototype - Complete refactored form for creating client groups
 *
 * Uses new infrastructure:
 * - useClientGroupForm hook for state management
 * - useCreateClientGroupFlow hook for API orchestration
 * - UI components from components/ui
 * - Constants from constants/clientGroup
 * - Validation from utils/validation
 */
const CreateClientGroupPrototype: React.FC = () => {
  const navigate = useNavigate();
  const { api } = useAuth();

  // Custom hooks for state management
  const {
    clientGroup,
    productOwners,
    validationErrors,
    updateClientGroup,
    addProductOwner,
    updateProductOwner,
    updateProductOwnerAddress,
    removeProductOwner,
    validateAll,
  } = useClientGroupForm();

  const {
    createClientGroup: createClientGroupMutation,
    isLoading,
    error,
    progress,
  } = useCreateClientGroupFlow();

  // Local UI state
  const [isAddingOwner, setIsAddingOwner] = useState(false);
  const [editingOwnerTempId, setEditingOwnerTempId] = useState<string | null>(null);
  const [advisorOptions, setAdvisorOptions] = useState<{ value: string; label: string }[]>([]);

  // Fetch available advisors for dropdown
  useEffect(() => {
    const fetchAdvisors = async () => {
      try {
        const response = await api.get('/advisors');
        const advisors = response.data;
        const options = advisors.map((advisor: any) => ({
          value: advisor.advisor_id.toString(),
          label: advisor.full_name || `${advisor.first_name} ${advisor.last_name}`.trim()
        }));
        setAdvisorOptions(options);
      } catch (err) {
        console.error('Error fetching advisors:', err);
      }
    };
    fetchAdvisors();
  }, [api]);

  /**
   * Handles initiating the "add new product owner" flow
   */
  const handleAddOwner = () => {
    const newOwner = addProductOwner();
    setEditingOwnerTempId(newOwner.tempId);
    setIsAddingOwner(true);
  };

  /**
   * Handles initiating the "edit existing product owner" flow
   */
  const handleEditOwner = (tempId: string) => {
    setEditingOwnerTempId(tempId);
    setIsAddingOwner(true);
  };

  /**
   * Handles saving the current product owner (closes the form)
   */
  const handleSaveOwner = () => {
    setIsAddingOwner(false);
    setEditingOwnerTempId(null);
  };

  /**
   * Handles canceling the current product owner form
   */
  const handleCancelOwner = () => {
    // If editing, don't remove the owner
    // If adding new, remove the last added owner
    if (editingOwnerTempId && productOwners.length > 0) {
      const lastOwner = productOwners[productOwners.length - 1];
      if (lastOwner.tempId === editingOwnerTempId) {
        // This was a newly added owner that wasn't saved yet
        removeProductOwner(editingOwnerTempId);
      }
    }
    setIsAddingOwner(false);
    setEditingOwnerTempId(null);
  };

  /**
   * Handles deleting a product owner
   */
  const handleDeleteOwner = (tempId: string) => {
    if (window.confirm('Are you sure you want to remove this product owner?')) {
      removeProductOwner(tempId);
    }
  };

  /**
   * Handles form submission (creates client group via API)
   */
  const handleSubmit = async () => {
    console.log('🔍 Submit clicked - starting validation');
    console.log('Client Group:', clientGroup);
    console.log('Product Owners:', productOwners);

    // Validate all fields first
    const isValid = validateAll();
    console.log('Validation result:', isValid);

    if (!isValid) {
      console.error('❌ Validation failed - check validation errors');
      console.error('Validation errors:', validationErrors);
      alert('Please fix validation errors before submitting. Check the console for details.');
      return;
    }

    try {
      console.log('✅ Validation passed - creating client group');
      const groupId = await createClientGroupMutation({
        clientGroup,
        productOwners,
      });

      console.log('✅ Client group created with ID:', groupId);
      // Navigate to the created client group
      navigate(`/client-groups/${groupId}`);
    } catch (error) {
      console.error('❌ Failed to create client group:', error);
    }
  };

  // Get the current editing owner (if any)
  const editingOwner = editingOwnerTempId
    ? productOwners.find((po) => po.tempId === editingOwnerTempId)
    : null;

  // Get validation errors for current editing owner
  const ownerErrors = editingOwnerTempId && validationErrors.productOwners
    ? validationErrors.productOwners[editingOwnerTempId]
    : undefined;

  return (
    <DynamicPageContainer maxWidth="1800px" className="py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-normal text-gray-900 font-sans tracking-wide">
          Create New Client Group
        </h1>
        <p className="text-gray-600 mt-1 text-sm">Complete the form to create a new client group</p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6">
          <ErrorDisplay
            error={error.message || 'Failed to create client group'}
            onDismiss={() => {}}
          />
        </div>
      )}

      {/* Client Group Details Section */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Client Group Details</h2>

        <div className="grid grid-cols-2 gap-4">
          <BaseInput
            label="Client Group Name"
            value={clientGroup.name}
            onChange={(e) => updateClientGroup('name', e.target.value)}
            required
            error={validationErrors.clientGroup?.name}
          />

          <BaseDropdown
            label="Type"
            value={clientGroup.type}
            onChange={(val) => updateClientGroup('type', val)}
            options={CLIENT_GROUP_TYPES.map((opt) => ({ value: opt, label: opt }))}
            error={validationErrors.clientGroup?.type}
          />

          <BaseDropdown
            label="Status"
            value={clientGroup.status}
            onChange={(val) => updateClientGroup('status', val)}
            options={STATUS_OPTIONS.map((opt) => ({ value: opt, label: opt }))}
            required
            error={validationErrors.clientGroup?.status}
          />

          <BaseDropdown
            label="Advisor"
            value={clientGroup.advisor_id?.toString() || ''}
            onChange={(val) => updateClientGroup('advisor_id', val ? parseInt(val as string) : null)}
            options={advisorOptions}
            placeholder="Select an advisor"
            helperText="Optional: Assign a specific advisor to this client group"
          />

          <div>
            <label htmlFor="client_start_date" className="block text-sm font-medium text-gray-700 mb-1">
              Client Start Date
            </label>
            <input
              id="client_start_date"
              type="date"
              value={clientGroup.client_start_date}
              onChange={(e) => updateClientGroup('client_start_date', e.target.value)}
              className={`block w-full rounded-md shadow-sm text-sm border ${
                validationErrors.clientGroup?.client_start_date
                  ? 'border-red-500 focus:border-red-600 focus:ring-red-500/10 bg-red-50'
                  : 'border-gray-300 focus:border-primary-700 focus:ring-primary-700/10 bg-white'
              } focus:outline-none focus:ring-4 focus:ring-offset-2 transition-all duration-150 ease-in-out px-3 py-2 h-10 text-gray-900`}
            />
            {validationErrors.clientGroup?.client_start_date && (
              <p className="mt-1 text-xs text-red-600">
                {validationErrors.clientGroup.client_start_date}
              </p>
            )}
            <p className="mt-1 text-xs text-gray-500">Date when the client relationship officially began</p>
          </div>
        </div>
      </div>

      {/* Product Owners Section */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Product Owners ({productOwners.length})
          </h2>
          {!isAddingOwner && (
            <AddButton onClick={handleAddOwner} label="Add Product Owner" />
          )}
        </div>

        {/* List of Added Product Owners */}
        {productOwners.length > 0 && !isAddingOwner && (
          <div className="mb-6">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">DOB</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {productOwners.map((po) => (
                  <tr key={po.tempId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {po.productOwner.title} {po.productOwner.firstname} {po.productOwner.surname}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {po.productOwner.dob}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {po.productOwner.email_1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {po.productOwner.phone_1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <EditButton onClick={() => handleEditOwner(po.tempId)} />
                      <DeleteButton onClick={() => handleDeleteOwner(po.tempId)} className="ml-2" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Product Owner Form */}
        {isAddingOwner && editingOwner && (
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">
              {editingOwnerTempId ? 'Edit Product Owner' : 'Add Product Owner'}
            </h3>

            {/* Personal Details Section */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-700 uppercase mb-4">Personal Details</h4>
              <div className="grid grid-cols-3 gap-4">
                <BaseDropdown
                  label="Title"
                  value={editingOwner.productOwner.title}
                  onChange={(val) => updateProductOwner(editingOwnerTempId!, 'title', val)}
                  options={TITLE_OPTIONS.map((opt) => ({ value: opt, label: opt }))}
                  error={ownerErrors?.title}
                />

                <BaseInput
                  label="First Name"
                  value={editingOwner.productOwner.firstname}
                  onChange={(e) => updateProductOwner(editingOwnerTempId!, 'firstname', e.target.value)}
                  required
                  error={ownerErrors?.firstname}
                />

                <BaseInput
                  label="Middle Names"
                  value={editingOwner.productOwner.middle_names}
                  onChange={(e) => updateProductOwner(editingOwnerTempId!, 'middle_names', e.target.value)}
                  error={ownerErrors?.middle_names}
                />

                <BaseInput
                  label="Surname"
                  value={editingOwner.productOwner.surname}
                  onChange={(e) => updateProductOwner(editingOwnerTempId!, 'surname', e.target.value)}
                  required
                  error={ownerErrors?.surname}
                />

                <BaseInput
                  label="Known As"
                  value={editingOwner.productOwner.known_as}
                  onChange={(e) => updateProductOwner(editingOwnerTempId!, 'known_as', e.target.value)}
                  error={ownerErrors?.known_as}
                />

                <BaseDropdown
                  label="Gender"
                  value={editingOwner.productOwner.gender}
                  onChange={(val) => updateProductOwner(editingOwnerTempId!, 'gender', val)}
                  options={GENDER_OPTIONS.map((opt) => ({ value: opt, label: opt }))}
                  error={ownerErrors?.gender}
                />

                <BaseDropdown
                  label="Relationship Status"
                  value={editingOwner.productOwner.relationship_status}
                  onChange={(val) => updateProductOwner(editingOwnerTempId!, 'relationship_status', val)}
                  options={RELATIONSHIP_STATUS_OPTIONS.map((opt) => ({ value: opt, label: opt }))}
                  error={ownerErrors?.relationship_status}
                />

                <div>
                  <label htmlFor="dob" className="block text-sm font-medium text-gray-700 mb-1">
                    Date of Birth
                  </label>
                  <input
                    id="dob"
                    type="date"
                    value={editingOwner.productOwner.dob}
                    onChange={(e) => updateProductOwner(editingOwnerTempId!, 'dob', e.target.value)}
                    className={`block w-full rounded-md shadow-sm text-sm border ${
                      ownerErrors?.dob
                        ? 'border-red-500 focus:border-red-600 focus:ring-red-500/10 bg-red-50'
                        : 'border-gray-300 focus:border-primary-700 focus:ring-primary-700/10 bg-white'
                    } focus:outline-none focus:ring-4 focus:ring-offset-2 transition-all duration-150 ease-in-out px-3 py-2 h-10 text-gray-900`}
                  />
                  {ownerErrors?.dob && (
                    <p className="mt-1 text-xs text-red-600">{ownerErrors.dob}</p>
                  )}
                </div>

                <BaseInput
                  label="Place of Birth"
                  value={editingOwner.productOwner.place_of_birth}
                  onChange={(e) => updateProductOwner(editingOwnerTempId!, 'place_of_birth', e.target.value)}
                  error={ownerErrors?.place_of_birth}
                />

                <div className="col-span-3">
                  <BaseInput
                    label="Previous Names"
                    value={editingOwner.productOwner.previous_names}
                    onChange={(e) => updateProductOwner(editingOwnerTempId!, 'previous_names', e.target.value)}
                    error={ownerErrors?.previous_names}
                  />
                </div>
              </div>
            </div>

            {/* Contact & Residential Information Section */}
            <div className="mb-6 pt-6 border-t">
              <h4 className="text-sm font-semibold text-gray-700 uppercase mb-4">Contact & Residential Information</h4>
              <div className="grid grid-cols-2 gap-6">
                {/* Left Column - Address */}
                <div className="space-y-4">
                  <h5 className="text-xs font-medium text-gray-600 uppercase">Address</h5>
                  <BaseInput
                    label="Address Line 1"
                    value={editingOwner.address.line_1}
                    onChange={(e) => updateProductOwnerAddress(editingOwnerTempId!, 'line_1', e.target.value)}
                    error={ownerErrors?.address?.line_1}
                  />
                  <BaseInput
                    label="Address Line 2"
                    value={editingOwner.address.line_2}
                    onChange={(e) => updateProductOwnerAddress(editingOwnerTempId!, 'line_2', e.target.value)}
                    error={ownerErrors?.address?.line_2}
                  />
                  <BaseInput
                    label="Address Line 3"
                    value={editingOwner.address.line_3}
                    onChange={(e) => updateProductOwnerAddress(editingOwnerTempId!, 'line_3', e.target.value)}
                    error={ownerErrors?.address?.line_3}
                  />
                  <BaseInput
                    label="Address Line 4"
                    value={editingOwner.address.line_4}
                    onChange={(e) => updateProductOwnerAddress(editingOwnerTempId!, 'line_4', e.target.value)}
                    error={ownerErrors?.address?.line_4}
                  />
                  <BaseInput
                    label="Address Line 5"
                    value={editingOwner.address.line_5}
                    onChange={(e) => updateProductOwnerAddress(editingOwnerTempId!, 'line_5', e.target.value)}
                    error={ownerErrors?.address?.line_5}
                  />
                  <div>
                    <label htmlFor="moved_in_date" className="block text-sm font-medium text-gray-700 mb-1">
                      Moved In Date
                    </label>
                    <input
                      id="moved_in_date"
                      type="date"
                      value={editingOwner.productOwner.moved_in_date}
                      onChange={(e) => updateProductOwner(editingOwnerTempId!, 'moved_in_date', e.target.value)}
                      className={`block w-full rounded-md shadow-sm text-sm border ${
                        ownerErrors?.moved_in_date
                          ? 'border-red-500 focus:border-red-600 focus:ring-red-500/10 bg-red-50'
                          : 'border-gray-300 focus:border-primary-700 focus:ring-primary-700/10 bg-white'
                      } focus:outline-none focus:ring-4 focus:ring-offset-2 transition-all duration-150 ease-in-out px-3 py-2 h-10 text-gray-900`}
                    />
                    {ownerErrors?.moved_in_date && (
                      <p className="mt-1 text-xs text-red-600">{ownerErrors.moved_in_date}</p>
                    )}
                  </div>
                </div>

                {/* Right Column - Contact Information */}
                <div className="space-y-4">
                  <h5 className="text-xs font-medium text-gray-600 uppercase">Contact Details</h5>
                  <BaseInput
                    label="Email 1"
                    type="email"
                    value={editingOwner.productOwner.email_1}
                    onChange={(e) => updateProductOwner(editingOwnerTempId!, 'email_1', e.target.value)}
                    error={ownerErrors?.email_1}
                  />
                  <BaseInput
                    label="Email 2"
                    type="email"
                    value={editingOwner.productOwner.email_2}
                    onChange={(e) => updateProductOwner(editingOwnerTempId!, 'email_2', e.target.value)}
                    error={ownerErrors?.email_2}
                  />
                  <BaseInput
                    label="Phone 1"
                    type="tel"
                    value={editingOwner.productOwner.phone_1}
                    onChange={(e) => updateProductOwner(editingOwnerTempId!, 'phone_1', e.target.value)}
                    error={ownerErrors?.phone_1}
                  />
                  <BaseInput
                    label="Phone 2"
                    type="tel"
                    value={editingOwner.productOwner.phone_2}
                    onChange={(e) => updateProductOwner(editingOwnerTempId!, 'phone_2', e.target.value)}
                    error={ownerErrors?.phone_2}
                  />
                </div>
              </div>
            </div>

            {/* Client Profiling Section */}
            <div className="mb-6 pt-6 border-t">
              <h4 className="text-sm font-semibold text-gray-700 uppercase mb-4">Client Profiling</h4>
              <div className="grid grid-cols-2 gap-4">
                <BaseInput
                  label="Three Words"
                  value={editingOwner.productOwner.three_words}
                  onChange={(e) => updateProductOwner(editingOwnerTempId!, 'three_words', e.target.value)}
                  error={ownerErrors?.three_words}
                />

                <BaseInput
                  label="Share Data With"
                  value={editingOwner.productOwner.share_data_with}
                  onChange={(e) => updateProductOwner(editingOwnerTempId!, 'share_data_with', e.target.value)}
                  error={ownerErrors?.share_data_with}
                />
              </div>
            </div>

            {/* Employment Information Section */}
            <div className="mb-6 pt-6 border-t">
              <h4 className="text-sm font-semibold text-gray-700 uppercase mb-4">Employment Information</h4>
              <div className="grid grid-cols-2 gap-4">
                <BaseDropdown
                  label="Employment Status"
                  value={editingOwner.productOwner.employment_status}
                  onChange={(val) => updateProductOwner(editingOwnerTempId!, 'employment_status', val)}
                  options={EMPLOYMENT_STATUS_OPTIONS.map((opt) => ({ value: opt, label: opt }))}
                  error={ownerErrors?.employment_status}
                />

                <BaseInput
                  label="Occupation"
                  value={editingOwner.productOwner.occupation}
                  onChange={(e) => updateProductOwner(editingOwnerTempId!, 'occupation', e.target.value)}
                  error={ownerErrors?.occupation}
                />
              </div>
            </div>

            {/* Identity & Compliance Section */}
            <div className="mb-6 pt-6 border-t">
              <h4 className="text-sm font-semibold text-gray-700 uppercase mb-4">Identity & Compliance</h4>
              <div className="grid grid-cols-2 gap-4">
                <BaseInput
                  label="National Insurance Number"
                  value={editingOwner.productOwner.ni_number}
                  onChange={(e) => updateProductOwner(editingOwnerTempId!, 'ni_number', e.target.value)}
                  error={ownerErrors?.ni_number}
                />

                <div>
                  <label htmlFor="passport_expiry_date" className="block text-sm font-medium text-gray-700 mb-1">
                    Passport Expiry Date
                  </label>
                  <input
                    id="passport_expiry_date"
                    type="date"
                    value={editingOwner.productOwner.passport_expiry_date}
                    onChange={(e) => updateProductOwner(editingOwnerTempId!, 'passport_expiry_date', e.target.value)}
                    className={`block w-full rounded-md shadow-sm text-sm border ${
                      ownerErrors?.passport_expiry_date
                        ? 'border-red-500 focus:border-red-600 focus:ring-red-500/10 bg-red-50'
                        : 'border-gray-300 focus:border-primary-700 focus:ring-primary-700/10 bg-white'
                    } focus:outline-none focus:ring-4 focus:ring-offset-2 transition-all duration-150 ease-in-out px-3 py-2 h-10 text-gray-900`}
                  />
                  {ownerErrors?.passport_expiry_date && (
                    <p className="mt-1 text-xs text-red-600">{ownerErrors.passport_expiry_date}</p>
                  )}
                </div>

                <BaseDropdown
                  label="AML Result"
                  value={editingOwner.productOwner.aml_result}
                  onChange={(val) => updateProductOwner(editingOwnerTempId!, 'aml_result', val)}
                  options={AML_RESULT_OPTIONS.map((opt) => ({ value: opt, label: opt }))}
                  error={ownerErrors?.aml_result}
                />

                <div>
                  <label htmlFor="aml_date" className="block text-sm font-medium text-gray-700 mb-1">
                    AML Date
                  </label>
                  <input
                    id="aml_date"
                    type="date"
                    value={editingOwner.productOwner.aml_date}
                    onChange={(e) => updateProductOwner(editingOwnerTempId!, 'aml_date', e.target.value)}
                    className={`block w-full rounded-md shadow-sm text-sm border ${
                      ownerErrors?.aml_date
                        ? 'border-red-500 focus:border-red-600 focus:ring-red-500/10 bg-red-50'
                        : 'border-gray-300 focus:border-primary-700 focus:ring-primary-700/10 bg-white'
                    } focus:outline-none focus:ring-4 focus:ring-offset-2 transition-all duration-150 ease-in-out px-3 py-2 h-10 text-gray-900`}
                  />
                  {ownerErrors?.aml_date && (
                    <p className="mt-1 text-xs text-red-600">{ownerErrors.aml_date}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex items-center gap-3 pt-6 border-t">
              <ActionButton
                onClick={handleSaveOwner}
                variant="save"
                size="md"
              >
                Save Product Owner
              </ActionButton>
              <ActionButton
                onClick={handleCancelOwner}
                variant="cancel"
                size="md"
              >
                Cancel
              </ActionButton>
            </div>
          </div>
        )}
      </div>

      {/* Form Actions */}
      <div className="flex items-center justify-end gap-4">
        <Button
          onClick={() => navigate('/client-groups')}
          variant="secondary"
          size="md"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="primary"
          size="md"
          disabled={productOwners.length === 0 || !clientGroup.name.trim() || isLoading}
        >
          {isLoading ? `Creating... (${progress})` : 'Create Client Group'}
        </Button>
      </div>

      {/* Loading Spinner */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <div className="flex items-center gap-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-700"></div>
              <div>
                <p className="font-semibold text-gray-900">Creating Client Group</p>
                <p className="text-sm text-gray-600">Step: {progress}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </DynamicPageContainer>
  );
};

export default CreateClientGroupPrototype;
