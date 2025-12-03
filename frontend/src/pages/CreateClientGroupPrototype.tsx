import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusIcon, XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';
import DynamicPageContainer from '../components/DynamicPageContainer';
import { useClientGroupForm } from '../hooks/useClientGroupForm';
import { useCreateClientGroupFlow } from '../hooks/useCreateClientGroupFlow';
import {
  BaseInput,
  DateInput,
  BaseDropdown,
  TextArea,
  ActionButton,
  AddButton,
  EditButton,
  DeleteButton,
  ErrorDisplay,
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

  /**
   * Handles initiating the "add new product owner" flow
   */
  const handleAddOwner = () => {
    addProductOwner();
    const newOwner = productOwners[productOwners.length];
    if (newOwner) {
      setEditingOwnerTempId(newOwner.tempId);
    }
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
    // Validate all fields first
    const isValid = validateAll();
    if (!isValid) {
      return;
    }

    try {
      const groupId = await createClientGroupMutation({
        clientGroup,
        productOwners,
      });

      // Navigate to the created client group
      navigate(`/client-groups/${groupId}`);
    } catch (error) {
      console.error('Failed to create client group:', error);
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
            required
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

          <DateInput
            label="Ongoing Start Date"
            value={clientGroup.ongoing_start}
            onChange={(e) => updateClientGroup('ongoing_start', e.target.value)}
            error={validationErrors.clientGroup?.ongoing_start}
          />

          <DateInput
            label="Client Declaration Date"
            value={clientGroup.client_declaration}
            onChange={(e) => updateClientGroup('client_declaration', e.target.value)}
            error={validationErrors.clientGroup?.client_declaration}
          />

          <DateInput
            label="Privacy Declaration Date"
            value={clientGroup.privacy_declaration}
            onChange={(e) => updateClientGroup('privacy_declaration', e.target.value)}
            error={validationErrors.clientGroup?.privacy_declaration}
          />

          <DateInput
            label="Full Fee Agreement Date"
            value={clientGroup.full_fee_agreement}
            onChange={(e) => updateClientGroup('full_fee_agreement', e.target.value)}
            error={validationErrors.clientGroup?.full_fee_agreement}
          />

          <DateInput
            label="Last Satisfactory Discussion Date"
            value={clientGroup.last_satisfactory_discussion}
            onChange={(e) => updateClientGroup('last_satisfactory_discussion', e.target.value)}
            error={validationErrors.clientGroup?.last_satisfactory_discussion}
          />

          <div className="col-span-2">
            <TextArea
              label="Notes"
              value={clientGroup.notes}
              onChange={(e) => updateClientGroup('notes', e.target.value)}
              rows={3}
              error={validationErrors.clientGroup?.notes}
            />
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
                  required
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
                  required
                  error={ownerErrors?.known_as}
                />

                <BaseDropdown
                  label="Gender"
                  value={editingOwner.productOwner.gender}
                  onChange={(val) => updateProductOwner(editingOwnerTempId!, 'gender', val)}
                  options={GENDER_OPTIONS.map((opt) => ({ value: opt, label: opt }))}
                  required
                  error={ownerErrors?.gender}
                />

                <BaseDropdown
                  label="Relationship Status"
                  value={editingOwner.productOwner.relationship_status}
                  onChange={(val) => updateProductOwner(editingOwnerTempId!, 'relationship_status', val)}
                  options={RELATIONSHIP_STATUS_OPTIONS.map((opt) => ({ value: opt, label: opt }))}
                  required
                  error={ownerErrors?.relationship_status}
                />

                <DateInput
                  label="Date of Birth"
                  value={editingOwner.productOwner.dob}
                  onChange={(e) => updateProductOwner(editingOwnerTempId!, 'dob', e.target.value)}
                  required
                  error={ownerErrors?.dob}
                />

                <BaseInput
                  label="Place of Birth"
                  value={editingOwner.productOwner.place_of_birth}
                  onChange={(e) => updateProductOwner(editingOwnerTempId!, 'place_of_birth', e.target.value)}
                  required
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

            {/* Contact Information Section */}
            <div className="mb-6 pt-6 border-t">
              <h4 className="text-sm font-semibold text-gray-700 uppercase mb-4">Contact Information</h4>
              <div className="grid grid-cols-2 gap-4">
                <BaseInput
                  label="Email 1"
                  type="email"
                  value={editingOwner.productOwner.email_1}
                  onChange={(e) => updateProductOwner(editingOwnerTempId!, 'email_1', e.target.value)}
                  required
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
                  required
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

            {/* Residential Information Section */}
            <div className="mb-6 pt-6 border-t">
              <h4 className="text-sm font-semibold text-gray-700 uppercase mb-4">Residential Information</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <BaseInput
                    label="Address Line 1"
                    value={editingOwner.address.line_1}
                    onChange={(e) => updateProductOwnerAddress(editingOwnerTempId!, 'line_1', e.target.value)}
                    required
                    error={ownerErrors?.address?.line_1}
                  />
                </div>
                <div className="col-span-2">
                  <BaseInput
                    label="Address Line 2"
                    value={editingOwner.address.line_2}
                    onChange={(e) => updateProductOwnerAddress(editingOwnerTempId!, 'line_2', e.target.value)}
                    error={ownerErrors?.address?.line_2}
                  />
                </div>
                <div className="col-span-2">
                  <BaseInput
                    label="Address Line 3"
                    value={editingOwner.address.line_3}
                    onChange={(e) => updateProductOwnerAddress(editingOwnerTempId!, 'line_3', e.target.value)}
                    error={ownerErrors?.address?.line_3}
                  />
                </div>
                <div className="col-span-2">
                  <BaseInput
                    label="Address Line 4"
                    value={editingOwner.address.line_4}
                    onChange={(e) => updateProductOwnerAddress(editingOwnerTempId!, 'line_4', e.target.value)}
                    error={ownerErrors?.address?.line_4}
                  />
                </div>
                <div className="col-span-2">
                  <BaseInput
                    label="Address Line 5"
                    value={editingOwner.address.line_5}
                    onChange={(e) => updateProductOwnerAddress(editingOwnerTempId!, 'line_5', e.target.value)}
                    error={ownerErrors?.address?.line_5}
                  />
                </div>

                <DateInput
                  label="Moved In Date"
                  value={editingOwner.productOwner.moved_in_date}
                  onChange={(e) => updateProductOwner(editingOwnerTempId!, 'moved_in_date', e.target.value)}
                  error={ownerErrors?.moved_in_date}
                />
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
                  required
                  error={ownerErrors?.employment_status}
                />

                <BaseInput
                  label="Occupation"
                  value={editingOwner.productOwner.occupation}
                  onChange={(e) => updateProductOwner(editingOwnerTempId!, 'occupation', e.target.value)}
                  required
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
                  required
                  error={ownerErrors?.ni_number}
                />

                <DateInput
                  label="Passport Expiry Date"
                  value={editingOwner.productOwner.passport_expiry_date}
                  onChange={(e) => updateProductOwner(editingOwnerTempId!, 'passport_expiry_date', e.target.value)}
                  error={ownerErrors?.passport_expiry_date}
                />

                <BaseDropdown
                  label="AML Result"
                  value={editingOwner.productOwner.aml_result}
                  onChange={(val) => updateProductOwner(editingOwnerTempId!, 'aml_result', val)}
                  options={AML_RESULT_OPTIONS.map((opt) => ({ value: opt, label: opt }))}
                  error={ownerErrors?.aml_result}
                />

                <DateInput
                  label="AML Date"
                  value={editingOwner.productOwner.aml_date}
                  onChange={(e) => updateProductOwner(editingOwnerTempId!, 'aml_date', e.target.value)}
                  error={ownerErrors?.aml_date}
                />
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex items-center gap-3 pt-6 border-t">
              <ActionButton
                onClick={handleSaveOwner}
                variant="success"
                icon={<CheckIcon className="w-5 h-5" />}
                label="Save Product Owner"
              />
              <ActionButton
                onClick={handleCancelOwner}
                variant="secondary"
                icon={<XMarkIcon className="w-5 h-5" />}
                label="Cancel"
              />
            </div>
          </div>
        )}
      </div>

      {/* Form Actions */}
      <div className="flex items-center justify-end gap-4">
        <ActionButton
          onClick={() => navigate('/reporting')}
          variant="secondary"
          label="Cancel"
        />
        <ActionButton
          onClick={handleSubmit}
          variant="primary"
          disabled={productOwners.length === 0 || !clientGroup.name.trim() || isLoading}
          label={isLoading ? `Creating... (${progress})` : 'Create Client Group'}
        />
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
