import React, { useState } from 'react';
import { ChevronRightIcon, TrashIcon, XCircleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { Person } from '../types';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';

interface PeopleTableSectionProps {
  people: Person[];
  clientOrder: string[];
  onPersonClick: (person: Person) => void;
  onDelete?: (person: Person) => void;
  onLapse?: (person: Person) => void;
  onReactivate?: (person: Person) => void;
}

const PeopleTableSection: React.FC<PeopleTableSectionProps> = ({
  people,
  clientOrder,
  onPersonClick,
  onDelete,
  onLapse,
  onReactivate
}) => {
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [personToDelete, setPersonToDelete] = useState<Person | null>(null);

  // Get people sorted by status first (Active at top, Lapsed/Deceased at bottom), then by client order
  const sortedPeople = [...people].sort((a, b) => {
    const statusOrder = { 'Active': 0, 'Lapsed': 1, 'Deceased': 2 };
    const statusA = statusOrder[a.status || 'Active'] || 0;
    const statusB = statusOrder[b.status || 'Active'] || 0;

    // Sort by status first
    if (statusA !== statusB) {
      return statusA - statusB;
    }

    // Within the same status, sort by client order
    const indexA = clientOrder.indexOf(a.id);
    const indexB = clientOrder.indexOf(b.id);
    return indexA - indexB;
  });

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-100 overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left text-sm font-bold text-gray-900 uppercase tracking-wider">Name</th>
            <th className="px-3 py-2 text-left text-sm font-bold text-gray-900 uppercase tracking-wider">Relationship</th>
            <th className="px-3 py-2 text-left text-sm font-bold text-gray-900 uppercase tracking-wider">Age</th>
            <th className="px-3 py-2 text-left text-sm font-bold text-gray-900 uppercase tracking-wider">DOB</th>
            <th className="px-3 py-2 text-left text-sm font-bold text-gray-900 uppercase tracking-wider">Contact</th>
            <th className="px-3 py-2 text-left text-sm font-bold text-gray-900 uppercase tracking-wider">Status</th>
            <th className="px-3 py-2 text-left text-sm font-bold text-gray-900 uppercase tracking-wider">Actions</th>
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sortedPeople.map((person) => {
            const fullName = `${person.title} ${person.forename} ${person.surname}`;
            const status = person.status || 'Active';
            const isInactive = status === 'Lapsed' || status === 'Deceased' || status === 'Historical';

            return (
              <tr
                key={person.id}
                className={`hover:bg-gray-50 cursor-pointer transition-colors ${
                  isInactive ? 'opacity-50 grayscale-[30%]' : ''
                }`}
                onClick={() => onPersonClick(person)}
              >
                <td className="px-3 py-2 whitespace-nowrap text-base font-medium text-gray-900">{fullName}</td>
                <td className="px-3 py-2 whitespace-nowrap text-base text-gray-900">{person.relationship}</td>
                <td className="px-3 py-2 whitespace-nowrap text-base text-gray-900">{person.age}</td>
                <td className="px-3 py-2 whitespace-nowrap text-base text-gray-900">{person.dateOfBirth}</td>
                <td className="px-3 py-2 whitespace-nowrap text-base text-gray-900">{person.primaryEmail}</td>
                <td className="px-3 py-2 whitespace-nowrap text-base text-gray-900">
                  <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                    status === 'Active'
                      ? 'bg-green-100 text-green-800'
                      : status === 'Deceased'
                      ? 'bg-gray-300 text-gray-900'
                      : 'bg-gray-200 text-gray-900'
                  }`}>
                    {status}
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
                              onReactivate(person);
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
                              setPersonToDelete(person);
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
                              onLapse(person);
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
          })}
        </tbody>
      </table>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setPersonToDelete(null);
        }}
        onConfirm={() => {
          if (personToDelete && onDelete) {
            onDelete(personToDelete);
            setPersonToDelete(null);
          }
        }}
        itemName={personToDelete ? `${personToDelete.title} ${personToDelete.forename} ${personToDelete.surname}` : ''}
        itemType="Person"
      />
    </div>
  );
};

export default PeopleTableSection;
