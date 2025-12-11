import React, { useState, useEffect } from 'react';
import { UserIcon } from '@heroicons/react/24/outline';
import api from '../../../services/api';
import { formatDateShort } from '../../../utils/formatters';

interface SummaryTabProps {
  clientGroupId: string;
}

interface ProductOwner {
  id: number;
  status: string;
  firstname: string;
  surname: string;
  known_as: string;
  title: string;
  middle_names: string;
  relationship_status: string;
  gender: string;
  previous_names: string;
  dob: string;
  place_of_birth: string;
  email_1: string;
  email_2: string;
  phone_1: string;
  phone_2: string;
  moved_in_date: string;
  address_id: number | null;
  three_words: string;
  share_data_with: string;
  employment_status: string;
  occupation: string;
  passport_expiry_date: string;
  ni_number: string;
  aml_result: string;
  aml_date: string;
  created_at: string;
  // Address fields (joined from address table)
  address_line_1?: string;
  address_line_2?: string;
  address_line_3?: string;
  address_line_4?: string;
  address_line_5?: string;
}

/**
 * SummaryTab - Overview of client group with product owner cards
 *
 * Shows:
 * - Cards for each product owner with detailed information
 * - Draggable client order section at the bottom
 */
const SummaryTab: React.FC<SummaryTabProps> = ({ clientGroupId }) => {
  const [productOwners, setProductOwners] = useState<ProductOwner[]>([]);
  const [clientOrder, setClientOrder] = useState<number[]>([]);
  const [originalOrder, setOriginalOrder] = useState<number[]>([]);
  const [draggedPersonId, setDraggedPersonId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [orderChanged, setOrderChanged] = useState(false);

  // Fetch product owners for this client group
  useEffect(() => {
    const fetchProductOwners = async () => {
      try {
        setIsLoading(true);
        const response = await api.get(`/client-groups/${clientGroupId}/product-owners`);
        setProductOwners(response.data);
        const order = response.data.map((po: ProductOwner) => po.id);
        setClientOrder(order);
        setOriginalOrder(order);
        setOrderChanged(false);
      } catch (err: any) {
        console.error('Failed to fetch product owners:', err);
        setError(err.response?.data?.detail || 'Failed to load product owners');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProductOwners();
  }, [clientGroupId]);

  // Detect if order has changed
  useEffect(() => {
    const hasChanged = JSON.stringify(clientOrder) !== JSON.stringify(originalOrder);
    setOrderChanged(hasChanged);
  }, [clientOrder, originalOrder]);

  // Save the new order to the backend
  const handleSaveOrder = async () => {
    try {
      setIsSaving(true);
      setError(null);

      // Create array of updates with display_order
      const updates = clientOrder.map((productOwnerId, index) => ({
        product_owner_id: productOwnerId,
        display_order: index + 1, // 1-indexed
      }));

      await api.put(`/client-groups/${clientGroupId}/product-owner-order`, { order: updates });

      // Update original order to match current
      setOriginalOrder([...clientOrder]);
      setOrderChanged(false);
    } catch (err: any) {
      console.error('Failed to save order:', err);
      setError(err.response?.data?.detail || 'Failed to save order');
    } finally {
      setIsSaving(false);
    }
  };

  // Get people sorted by client order
  const sortedPeople = [...productOwners].sort((a, b) => {
    const indexA = clientOrder.indexOf(a.id);
    const indexB = clientOrder.indexOf(b.id);
    return indexA - indexB;
  });

  // Drag and drop handlers
  const handleDragStart = (personId: number) => {
    setDraggedPersonId(personId);
  };

  const handleDragOver = (e: React.DragEvent, targetPersonId: number) => {
    e.preventDefault();

    if (!draggedPersonId || draggedPersonId === targetPersonId) return;

    const draggedIndex = clientOrder.indexOf(draggedPersonId);
    const targetIndex = clientOrder.indexOf(targetPersonId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newOrder = [...clientOrder];
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedPersonId);
    setClientOrder(newOrder);
  };

  const handleDragEnd = () => {
    setDraggedPersonId(null);
  };

  // Calculate age from DOB
  const calculateAge = (dob: string): number => {
    if (!dob) return 0;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <p className="text-red-700 text-center">{error}</p>
      </div>
    );
  }

  if (productOwners.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-12">
        <p className="text-gray-500 text-center text-lg">No product owners found for this client group</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* People in Client Group */}
      <div>
        <h3 className="text-xl font-semibold text-gray-900 mb-4">People in Client Group</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sortedPeople.map((person) => {
            const fullName = [person.title, person.firstname, person.middle_names, person.surname]
              .filter(Boolean)
              .join(' ');
            const status = person.status || 'active';
            const isInactive = status === 'lapsed' || status === 'deceased' || status === 'historical';
            const age = calculateAge(person.dob);

            return (
              <div
                key={person.id}
                className={`bg-white shadow-md rounded-lg p-5 border border-gray-100 ${
                  isInactive ? 'opacity-50 grayscale-[30%]' : ''
                }`}
              >
                {/* Header */}
                <div className="flex items-center mb-4 pb-3 border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-primary-100">
                      <UserIcon className="h-5 w-5 text-primary-700" />
                    </div>
                    <div>
                      <h4 className="text-xl font-semibold text-gray-900">{fullName}</h4>
                      <p className="text-base text-gray-900">Known as: {person.known_as || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Personal Details - Combined */}
                <div className="mb-4">
                  <h5 className="text-base font-semibold text-gray-900 uppercase mb-2">Personal Details</h5>
                  <div className="space-y-2">
                    {/* Section 1: Basic Info */}
                    <div className="grid grid-cols-2 gap-x-3 text-base pb-3 border-b border-gray-200">
                      <div className="space-y-1">
                        <div>
                          <span className="font-bold text-blue-600">Gender: </span>
                          <span className="font-medium text-gray-900">{person.gender || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="font-bold text-blue-600">DOB: </span>
                          <span className="font-medium text-gray-900">{person.dob ? formatDateShort(person.dob) : 'N/A'}</span>
                        </div>
                        <div>
                          <span className="font-bold text-blue-600">Age: </span>
                          <span className="font-medium text-gray-900">{age || 'N/A'}</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div>
                          <span className="font-bold text-blue-600">Previous Names: </span>
                          <span className="font-medium text-gray-900">{person.previous_names || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="font-bold text-blue-600">Status: </span>
                          <span className="font-medium text-gray-900">{person.relationship_status || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="font-bold text-blue-600">Place of Birth: </span>
                          <span className="font-medium text-gray-900">{person.place_of_birth || 'N/A'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Section 2: Address & Contact Details */}
                    <div className="grid grid-cols-2 gap-x-3 text-base pt-3 pb-3 border-b border-gray-200">
                      <div>
                        <p className="text-base font-bold text-blue-600 mb-0.5">Address</p>
                        <div className="text-base font-medium text-gray-900 leading-relaxed">
                          {person.address_line_1 && <div>{person.address_line_1}</div>}
                          {person.address_line_2 && <div>{person.address_line_2}</div>}
                          {person.address_line_3 && <div>{person.address_line_3}</div>}
                          {person.address_line_4 && <div>{person.address_line_4}</div>}
                          {person.address_line_5 && <div>{person.address_line_5}</div>}
                          {!person.address_line_1 && <div>N/A</div>}
                        </div>
                        <p className="text-base text-gray-900 mt-1">
                          <span className="font-bold text-blue-600">Moved in:</span> {person.moved_in_date ? formatDateShort(person.moved_in_date) : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <div className="space-y-1">
                          <div>
                            <span className="font-bold text-blue-600">Email 1: </span>
                            <span className="font-medium text-gray-900">{person.email_1 || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="font-bold text-blue-600">Email 2: </span>
                            <span className="font-medium text-gray-900">{person.email_2 || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="font-bold text-blue-600">Phone 1: </span>
                            <span className="font-medium text-gray-900">{person.phone_1 || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="font-bold text-blue-600">Phone 2: </span>
                            <span className="font-medium text-gray-900">{person.phone_2 || 'N/A'}</span>
                          </div>
                        </div>
                        <div className="pt-2 space-y-1">
                          <div>
                            <span className="font-bold text-blue-600">3 words: </span>
                            <span className="font-medium text-primary-700">{person.three_words || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="font-bold text-blue-600">Share Data With: </span>
                            <span className="font-medium text-gray-900">{person.share_data_with || 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Section 3: Employment & Documents */}
                    <div className="grid grid-cols-2 gap-x-3 text-base pt-3">
                      <div className="space-y-1">
                        <div>
                          <span className="font-bold text-blue-600">Employment Status: </span>
                          <span className="font-medium text-gray-900">{person.employment_status || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="font-bold text-blue-600">Occupation: </span>
                          <span className="font-medium text-gray-900">{person.occupation || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="font-bold text-blue-600">NI Number: </span>
                          <span className="font-medium text-gray-900">{person.ni_number || 'N/A'}</span>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div>
                          <span className="font-bold text-blue-600">Passport: </span>
                          <span className="font-medium text-gray-900">{person.passport_expiry_date ? formatDateShort(person.passport_expiry_date) : 'N/A'}</span>
                        </div>
                        <div>
                          <span className="font-bold text-blue-600">AML Result: </span>
                          <span className="font-medium text-green-700">{person.aml_result || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="font-bold text-blue-600">AML Date: </span>
                          <span className="font-medium text-gray-900">{person.aml_date ? formatDateShort(person.aml_date) : 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Client Order Section */}
      <div className="bg-white rounded-lg shadow-md border border-gray-100 p-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-base font-semibold text-gray-900">Client Order</h3>
          <button
            onClick={handleSaveOrder}
            disabled={!orderChanged || isSaving}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              orderChanged && !isSaving
                ? 'bg-primary-600 text-white hover:bg-primary-700 shadow-sm'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isSaving ? 'Saving...' : 'Save Order'}
          </button>
        </div>
        <div className="space-y-1">
          {sortedPeople.map((person, index) => {
            const fullName = [person.title, person.firstname, person.surname]
              .filter(Boolean)
              .join(' ');
            const isDragging = draggedPersonId === person.id;
            const status = person.status || 'active';
            const isInactive = status === 'lapsed' || status === 'deceased' || status === 'historical';
            return (
              <div
                key={person.id}
                draggable
                onDragStart={() => handleDragStart(person.id)}
                onDragOver={(e) => handleDragOver(e, person.id)}
                onDragEnd={handleDragEnd}
                className={`flex items-center justify-between bg-gray-50 rounded px-2 py-1.5 border transition-all cursor-move ${
                  isDragging
                    ? 'border-primary-400 bg-primary-50 opacity-50 scale-105'
                    : 'border-gray-200 hover:border-primary-300 hover:bg-gray-100'
                } ${isInactive ? 'opacity-50 grayscale-[30%]' : ''}`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900 w-5">{index + 1}.</span>
                  <div className="p-1 rounded-full bg-primary-100">
                    <UserIcon className="h-3 w-3 text-primary-700" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{fullName}</p>
                  </div>
                </div>
                <div className="text-gray-900">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                  </svg>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SummaryTab;
