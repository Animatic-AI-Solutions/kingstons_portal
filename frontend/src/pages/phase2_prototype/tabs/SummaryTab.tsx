import React from 'react';
import { UserIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { Person } from '../types';

interface SummaryTabProps {
  people: Person[];
  clientOrder: string[];
  draggedPersonId: string | null;
  onPersonClick: (person: Person) => void;
  onDragStart: (personId: string) => void;
  onDragOver: (e: React.DragEvent, targetPersonId: string) => void;
  onDragEnd: () => void;
}

const SummaryTab: React.FC<SummaryTabProps> = ({
  people,
  clientOrder,
  draggedPersonId,
  onPersonClick,
  onDragStart,
  onDragOver,
  onDragEnd
}) => {
  // Get people sorted by client order
  const sortedPeople = [...people].sort((a, b) => {
    const indexA = clientOrder.indexOf(a.id);
    const indexB = clientOrder.indexOf(b.id);
    return indexA - indexB;
  });

  return (
    <div className="space-y-6">
      {/* People in Client Group */}
      <div>
        <h3 className="text-xl font-semibold text-gray-900 mb-4">People in Client Group</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sortedPeople.map((person) => {
            const fullName = `${person.title} ${person.forename} ${person.middleNames} ${person.surname}`.trim();
            const fullAddress = [
              person.addressLine1,
              person.addressLine2,
              person.addressLine3,
              person.addressLine4,
              person.addressLine5,
              person.postcode
            ].filter(line => line).join(', ');

            return (
              <div
                key={person.id}
                className="bg-white shadow-md rounded-lg p-5 border border-gray-100 cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => onPersonClick(person)}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-primary-100">
                      <UserIcon className="h-5 w-5 text-primary-700" />
                    </div>
                    <div>
                      <h4 className="text-xl font-semibold text-gray-900">{fullName}</h4>
                      <p className="text-base text-gray-900">{person.relationship} • Known as: {person.knownAs}</p>
                    </div>
                  </div>
                  <ChevronRightIcon className="w-5 h-5 text-gray-900" />
                </div>

                {/* Personal Details - Combined */}
                <div className="mb-4">
                  <h5 className="text-base font-semibold text-gray-900 uppercase mb-2">Personal Details</h5>
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-base">
                      <div>
                        <span className="font-bold text-blue-600">Gender: </span>
                        <span className="font-medium text-gray-900">{person.gender}</span>
                      </div>
                      <div>
                        <span className="font-bold text-blue-600">Age: </span>
                        <span className="font-medium text-gray-900">{person.age}</span>
                      </div>
                      <div>
                        <span className="font-bold text-blue-600">DOB: </span>
                        <span className="font-medium text-gray-900">{person.dateOfBirth}</span>
                      </div>
                      <div>
                        <span className="font-bold text-blue-600">Place of Birth: </span>
                        <span className="font-medium text-gray-900">{person.placeOfBirth}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="font-bold text-blue-600">Status: </span>
                        <span className="font-medium text-gray-900">{person.relationshipStatus}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="font-bold text-blue-600">Previous Names: </span>
                        <span className="font-medium text-gray-900">{person.previousNames}</span>
                      </div>
                    </div>

                    <div className="pt-1">
                      <p className="text-base font-bold text-blue-600 mb-0.5">Address</p>
                      <p className="text-base font-medium text-gray-900 leading-relaxed">{fullAddress}</p>
                      <p className="text-base text-gray-900 mt-1"><span className="font-bold text-blue-600">Moved in:</span> {person.dateMovedIn}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-base pt-1">
                      <div className="col-span-2">
                        <span className="font-bold text-blue-600">Email: </span>
                        <span className="font-medium text-gray-900">{person.emails.join(', ')}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="font-bold text-blue-600">Phone: </span>
                        <span className="font-medium text-gray-900">{person.phoneNumbers.join(', ')}</span>
                      </div>
                      <div>
                        <span className="font-bold text-blue-600">Employment: </span>
                        <span className="font-medium text-gray-900">{person.employmentStatus}</span>
                      </div>
                      <div>
                        <span className="font-bold text-blue-600">Occupation: </span>
                        <span className="font-medium text-gray-900">{person.occupation}</span>
                      </div>
                      <div>
                        <span className="font-bold text-blue-600">NI Number: </span>
                        <span className="font-medium text-gray-900">{person.niNumber}</span>
                      </div>
                      <div>
                        <span className="font-bold text-blue-600">AML Result: </span>
                        <span className="font-medium text-green-700">{person.amlResult}</span>
                      </div>
                      <div>
                        <span className="font-bold text-blue-600">AML Date: </span>
                        <span className="font-medium text-gray-900">{person.amlDate}</span>
                      </div>
                      <div>
                        <span className="font-bold text-blue-600">Driving License: </span>
                        <span className="font-medium text-gray-900">{person.drivingLicenseExpiry}</span>
                      </div>
                      <div>
                        <span className="font-bold text-blue-600">Passport: </span>
                        <span className="font-medium text-gray-900">{person.passportExpiry}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="font-bold text-blue-600">Other IDs: </span>
                        <span className="font-medium text-gray-900">{person.otherIds}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="font-bold text-blue-600">Safe Words (3 words - for product access): </span>
                        <span className="font-medium text-primary-700">{person.safeWords.join(', ')}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="font-bold text-blue-600">Share Data With: </span>
                        <span className="font-medium text-gray-900">{person.shareDataWith}</span>
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
        <h3 className="text-base font-semibold text-gray-900 mb-2">Client Order</h3>
        <div className="space-y-1">
          {sortedPeople.map((person, index) => {
            const fullName = `${person.title} ${person.forename} ${person.surname}`.trim();
            const isDragging = draggedPersonId === person.id;
            return (
              <div
                key={person.id}
                draggable
                onDragStart={() => onDragStart(person.id)}
                onDragOver={(e) => onDragOver(e, person.id)}
                onDragEnd={onDragEnd}
                className={`flex items-center justify-between bg-gray-50 rounded px-2 py-1.5 border transition-all cursor-move ${
                  isDragging
                    ? 'border-primary-400 bg-primary-50 opacity-50 scale-105'
                    : 'border-gray-200 hover:border-primary-300 hover:bg-gray-100'
                }`}
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
