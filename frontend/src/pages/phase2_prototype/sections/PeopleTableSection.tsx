import React from 'react';
import { ChevronRightIcon } from '@heroicons/react/24/outline';
import { Person } from '../types';

interface PeopleTableSectionProps {
  people: Person[];
  clientOrder: string[];
  onPersonClick: (person: Person) => void;
}

const PeopleTableSection: React.FC<PeopleTableSectionProps> = ({
  people,
  clientOrder,
  onPersonClick
}) => {
  // Get people sorted by client order
  const sortedPeople = [...people].sort((a, b) => {
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
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sortedPeople.map((person) => {
            const fullName = `${person.title} ${person.forename} ${person.surname}`;
            return (
              <tr
                key={person.id}
                className="hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => onPersonClick(person)}
              >
                <td className="px-3 py-2 whitespace-nowrap text-base font-medium text-gray-900">{fullName}</td>
                <td className="px-3 py-2 whitespace-nowrap text-base text-gray-900">{person.relationship}</td>
                <td className="px-3 py-2 whitespace-nowrap text-base text-gray-900">{person.age}</td>
                <td className="px-3 py-2 whitespace-nowrap text-base text-gray-900">{person.dateOfBirth}</td>
                <td className="px-3 py-2 whitespace-nowrap text-base text-gray-900">{person.primaryEmail}</td>
                <td className="px-3 py-2 whitespace-nowrap text-right text-base">
                  <ChevronRightIcon className="w-5 h-5 text-gray-900" />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default PeopleTableSection;
