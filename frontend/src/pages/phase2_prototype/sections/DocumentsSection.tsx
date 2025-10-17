import React from 'react';
import { ChevronRightIcon } from '@heroicons/react/24/outline';
import { Document, Person } from '../types';

interface DocumentsSectionProps {
  documents: Document[];
  people: Person[];
  clientOrder: string[];
  onDocumentClick: (document: Document) => void;
}

const DocumentsSection: React.FC<DocumentsSectionProps> = ({
  documents,
  people,
  clientOrder,
  onDocumentClick
}) => {
  // Sort documents based on client order
  // For documents with multiple people, use the earliest person in client order
  const sortedDocuments = [...documents].sort((a, b) => {
    // Get the highest priority person (earliest in client order) for each document
    const getHighestPriorityIndex = (doc: Document) => {
      const peopleNames = doc.people;
      const indices = peopleNames.map(name => {
        const person = people.find(p => `${p.title} ${p.forename} ${p.surname}`.trim() === name);
        return person ? clientOrder.indexOf(person.id) : Infinity;
      });
      return Math.min(...indices);
    };

    return getHighestPriorityIndex(a) - getHighestPriorityIndex(b);
  });

  return (
    <div className="space-y-6">
      {/* Legal Documents - Single Table */}
      <div className="bg-white rounded-lg shadow-md border border-gray-100 overflow-hidden">
        <div className="px-3 py-2 bg-gray-50 border-b">
          <h3 className="text-xl font-semibold">Legal Documents</h3>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-sm font-bold text-gray-900 uppercase tracking-wider">Name</th>
              <th className="px-3 py-2 text-left text-sm font-bold text-gray-900 uppercase tracking-wider">Type</th>
              <th className="px-3 py-2 text-left text-sm font-bold text-gray-900 uppercase tracking-wider">Person</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedDocuments.map((doc) => (
              <tr key={doc.id} className="hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => onDocumentClick(doc)}>
                <td className="px-3 py-2 text-base font-medium text-gray-900">{doc.name}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                    doc.type === 'Will' ? 'bg-blue-100 text-blue-800' :
                    doc.type === 'Advance Directive' ? 'bg-purple-100 text-purple-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {doc.type}
                  </span>
                </td>
                <td className="px-3 py-2 text-base text-gray-900">{doc.people.join(', ')}</td>
                <td className="px-3 py-2 whitespace-nowrap text-right text-base">
                  <ChevronRightIcon className="w-5 h-5 text-gray-900" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DocumentsSection;
