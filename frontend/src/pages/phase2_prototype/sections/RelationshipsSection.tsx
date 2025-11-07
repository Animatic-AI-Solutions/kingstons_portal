import React, { useState } from 'react';
import { ChevronRightIcon, TrashIcon, XCircleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { SpecialRelationship } from '../types';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';

interface RelationshipsSectionProps {
  relationships: SpecialRelationship[];
  onRelationshipClick: (relationship: SpecialRelationship) => void;
  onDelete?: (relationship: SpecialRelationship) => void;
  onLapse?: (relationship: SpecialRelationship) => void;
  onReactivate?: (relationship: SpecialRelationship) => void;
}

const RelationshipsSection: React.FC<RelationshipsSectionProps> = ({
  relationships,
  onRelationshipClick,
  onDelete,
  onLapse,
  onReactivate
}) => {
  const [activeRelationshipTab, setActiveRelationshipTab] = useState<'personal' | 'professional'>('personal');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [relationshipToDelete, setRelationshipToDelete] = useState<SpecialRelationship | null>(null);

  // Filter relationships based on active tab, then sort by status (Active first, Lapsed, then Deceased)
  const filteredRelationships = relationships
    .filter(rel => rel.type === activeRelationshipTab)
    .sort((a, b) => {
      // Sort Active before Lapsed before Deceased
      const statusOrder = { 'Active': 0, 'Lapsed': 1, 'Deceased': 2 };
      const statusA = statusOrder[a.status] || 0;
      const statusB = statusOrder[b.status] || 0;
      return statusA - statusB;
    });

  return (
    <div className="space-y-4">
      {/* Relationship Type Tabs */}
      <div className="text-center mb-2">
        <span className="text-sm font-semibold text-primary-600 uppercase tracking-wide">
          Relationship Type
        </span>
      </div>
      <div className="flex items-center justify-center mb-4">
        <div className="inline-flex items-center bg-primary-50 rounded-lg p-1 border border-primary-200 shadow-sm">
          <button
            onClick={() => setActiveRelationshipTab('personal')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
              activeRelationshipTab === 'personal'
                ? 'bg-primary-700 text-white shadow-md'
                : 'text-primary-700 hover:bg-primary-100 hover:text-primary-800'
            }`}
          >
            <span className="text-sm font-medium">Personal</span>
          </button>
          <button
            onClick={() => setActiveRelationshipTab('professional')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
              activeRelationshipTab === 'professional'
                ? 'bg-primary-700 text-white shadow-md'
                : 'text-primary-700 hover:bg-primary-100 hover:text-primary-800'
            }`}
          >
            <span className="text-sm font-medium">Professional</span>
          </button>
        </div>
      </div>

      {/* Relationships Table */}
      <div className="bg-white rounded-lg shadow-md border border-gray-100 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-sm font-bold text-gray-900 uppercase tracking-wider">Name</th>
              {activeRelationshipTab === 'personal' && (
                <>
                  <th className="px-3 py-2 text-left text-sm font-bold text-gray-900 uppercase tracking-wider">Date of Birth</th>
                  <th className="px-3 py-2 text-left text-sm font-bold text-gray-900 uppercase tracking-wider">Age</th>
                </>
              )}
              <th className="px-3 py-2 text-left text-sm font-bold text-gray-900 uppercase tracking-wider">Relationship</th>
              {activeRelationshipTab === 'personal' && (
                <th className="px-3 py-2 text-left text-sm font-bold text-gray-900 uppercase tracking-wider">Dependency</th>
              )}
              <th className="px-3 py-2 text-left text-sm font-bold text-gray-900 uppercase tracking-wider">
                {activeRelationshipTab === 'professional' ? 'Relationship With' : 'Associated Person(s)'}
              </th>
              {activeRelationshipTab === 'personal' && (
                <th className="px-3 py-2 text-left text-sm font-bold text-gray-900 uppercase tracking-wider">Contact Details</th>
              )}
              {activeRelationshipTab === 'professional' && (
                <>
                  <th className="px-3 py-2 text-left text-sm font-bold text-gray-900 uppercase tracking-wider">Phone Number</th>
                  <th className="px-3 py-2 text-left text-sm font-bold text-gray-900 uppercase tracking-wider">Email</th>
                  <th className="px-3 py-2 text-left text-sm font-bold text-gray-900 uppercase tracking-wider">Firm Name</th>
                </>
              )}
              <th className="px-3 py-2 text-left text-sm font-bold text-gray-900 uppercase tracking-wider">Status</th>
              <th className="px-3 py-2 text-left text-sm font-bold text-gray-900 uppercase tracking-wider">Actions</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredRelationships.length > 0 ? (
              filteredRelationships.map((rel) => {
                const isInactive = rel.status === 'Lapsed' || rel.status === 'Deceased';
                return (
                <tr
                  key={rel.id}
                  className={`hover:bg-gray-50 cursor-pointer transition-colors ${
                    isInactive ? 'opacity-60' : ''
                  }`}
                  onClick={() => onRelationshipClick(rel)}
                >
                  <td className="px-3 py-2 whitespace-nowrap text-base font-medium text-gray-900">{rel.name}</td>
                  {activeRelationshipTab === 'personal' && (
                    <>
                      <td className="px-3 py-2 whitespace-nowrap text-base text-gray-900">{rel.dateOfBirth}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-base text-gray-900">{rel.age || '-'}</td>
                    </>
                  )}
                  <td className="px-3 py-2 whitespace-nowrap text-base text-gray-900">
                    <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                      isInactive
                        ? 'bg-gray-200 text-gray-900'
                        : rel.type === 'professional'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {rel.relationship}
                    </span>
                  </td>
                  {activeRelationshipTab === 'personal' && (
                    <td className="px-3 py-2 text-base text-gray-900">
                      {rel.isDependency !== undefined ? (rel.isDependency ? 'Yes' : 'No') : '-'}
                    </td>
                  )}
                  <td className="px-3 py-2 text-base text-gray-900">
                    {activeRelationshipTab === 'professional' ? (
                      rel.dependency?.map((person, idx) => (
                        <span key={idx} className="inline-block mr-1 mb-1">
                          <span className="px-2 py-1 bg-gray-100 text-gray-900 rounded text-sm">
                            {person}
                          </span>
                        </span>
                      ))
                    ) : (
                      rel.associatedPerson && rel.associatedPerson.length > 0 ? (
                        rel.associatedPerson.map((person, idx) => (
                          <span key={idx} className="inline-block mr-1 mb-1">
                            <span className="px-2 py-1 bg-gray-100 text-gray-900 rounded text-sm">
                              {person}
                            </span>
                          </span>
                        ))
                      ) : '-'
                    )}
                  </td>
                  {activeRelationshipTab === 'personal' && (
                    <td className="px-3 py-2 text-base text-gray-900">{rel.contactDetails || '-'}</td>
                  )}
                  {activeRelationshipTab === 'professional' && (
                    <>
                      <td className="px-3 py-2 text-base text-gray-900">{rel.phoneNumber || '-'}</td>
                      <td className="px-3 py-2 text-base text-gray-900">{rel.email || '-'}</td>
                      <td className="px-3 py-2 text-base text-gray-900">
                        <span className="font-medium text-gray-900">{rel.firmName || '-'}</span>
                      </td>
                    </>
                  )}
                  <td className="px-3 py-2 whitespace-nowrap text-base text-gray-900">
                    <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                      rel.status === 'Active'
                        ? 'bg-green-100 text-green-800'
                        : rel.status === 'Deceased'
                        ? 'bg-gray-300 text-gray-900'
                        : 'bg-gray-200 text-gray-900'
                    }`}>
                      {rel.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-base">
                    <div className="flex items-center gap-2">
                      {isInactive ? (
                        <>
                          {onReactivate && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onReactivate(rel);
                              }}
                              className="p-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                              title="Reactivate"
                            >
                              <ArrowPathIcon className="w-4 h-4" />
                            </button>
                          )}
                          {onDelete && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setRelationshipToDelete(rel);
                                setDeleteModalOpen(true);
                              }}
                              className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                              title="Delete"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          )}
                        </>
                      ) : (
                        <>
                          {onLapse && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onLapse(rel);
                              }}
                              className="p-1 text-orange-600 hover:text-orange-700 hover:bg-orange-50 rounded transition-colors"
                              title="Lapse"
                            >
                              <XCircleIcon className="w-4 h-4" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-right text-base">
                    <ChevronRightIcon className="w-5 h-5 text-gray-900" />
                  </td>
                </tr>
              );
              })
            ) : (
              <tr>
                <td colSpan={activeRelationshipTab === 'professional' ? 9 : 10} className="px-3 py-8 text-center text-base text-gray-900">
                  No {activeRelationshipTab} relationships found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setRelationshipToDelete(null);
        }}
        onConfirm={() => {
          if (relationshipToDelete && onDelete) {
            onDelete(relationshipToDelete);
            setRelationshipToDelete(null);
          }
        }}
        itemName={relationshipToDelete?.name || ''}
        itemType="Special Relationship"
      />
    </div>
  );
};

export default RelationshipsSection;
