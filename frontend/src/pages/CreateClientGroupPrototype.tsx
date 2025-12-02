import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import DynamicPageContainer from '../components/DynamicPageContainer';

// ============================================================================
// TYPES
// ============================================================================

interface PersonFormData {
  id: string;
  // Personal Information
  gender: string;
  title: string;
  forename: string;
  middleNames: string;
  surname: string;
  knownAs: string;
  previousNames: string;
  relationshipStatus: string;
  addressLine1: string;
  addressLine2: string;
  addressLine3: string;
  addressLine4: string;
  addressLine5: string;
  postcode: string;
  emails: string[];
  phoneNumbers: string[];
  employmentStatus: string;
  occupation: string;
  dateMovedIn: string;
  dateOfBirth: string;
  placeOfBirth: string;
  age: number;
  // Regulatory Information
  niNumber: string;
  drivingLicenseExpiry: string;
  passportExpiry: string;
  otherIds: string;
  amlCheck: string;
  safeWords: string[];
  shareDataWith: string;
  // Relationship to client group
  relationship: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const CreateClientGroupPrototype: React.FC = () => {
  const navigate = useNavigate();
  const [clientGroupName, setClientGroupName] = useState('');
  const [people, setPeople] = useState<PersonFormData[]>([]);
  const [isAddingPerson, setIsAddingPerson] = useState(false);
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null);

  // Form state for adding/editing a person
  const [formData, setFormData] = useState<PersonFormData>(getEmptyPersonForm());

  function getEmptyPersonForm(): PersonFormData {
    return {
      id: Date.now().toString(),
      gender: '',
      title: '',
      forename: '',
      middleNames: '',
      surname: '',
      knownAs: '',
      previousNames: '',
      relationshipStatus: '',
      addressLine1: '',
      addressLine2: '',
      addressLine3: '',
      addressLine4: '',
      addressLine5: '',
      postcode: '',
      emails: [],
      phoneNumbers: [],
      employmentStatus: '',
      occupation: '',
      dateMovedIn: '',
      dateOfBirth: '',
      placeOfBirth: '',
      age: 0,
      niNumber: '',
      drivingLicenseExpiry: '',
      passportExpiry: '',
      otherIds: '',
      amlCheck: '',
      safeWords: [],
      shareDataWith: '',
      relationship: '',
    };
  }

  const handleInputChange = (field: keyof PersonFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleArrayInputChange = (field: 'emails' | 'phoneNumbers' | 'safeWords', value: string) => {
    const array = value.split(',').map(item => item.trim()).filter(item => item);
    setFormData(prev => ({ ...prev, [field]: array }));
  };

  // Calculate age from date of birth
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

  // Validate that all required fields are filled
  const isPersonFormValid = (): boolean => {
    const required = [
      'gender', 'title', 'forename', 'surname', 'knownAs', 'relationshipStatus',
      'addressLine1', 'postcode', 'employmentStatus', 'occupation',
      'dateOfBirth', 'placeOfBirth', 'niNumber', 'relationship'
    ];

    for (const field of required) {
      if (!formData[field as keyof PersonFormData]) {
        return false;
      }
    }

    // Check arrays
    if (formData.emails.length === 0 || formData.phoneNumbers.length === 0) {
      return false;
    }

    return true;
  };

  const handleAddPerson = () => {
    setIsAddingPerson(true);
    setEditingPersonId(null);
    setFormData(getEmptyPersonForm());
  };

  const handleEditPerson = (person: PersonFormData) => {
    setEditingPersonId(person.id);
    setIsAddingPerson(true);
    setFormData({ ...person });
  };

  const handleSavePerson = () => {
    if (!isPersonFormValid()) {
      alert('Please fill in all required fields');
      return;
    }

    // Update age based on date of birth
    const age = calculateAge(formData.dateOfBirth);
    const personToSave = { ...formData, age };

    if (editingPersonId) {
      // Update existing person
      setPeople(prev => prev.map(p => p.id === editingPersonId ? personToSave : p));
    } else {
      // Add new person
      setPeople(prev => [...prev, personToSave]);
    }

    // Reset form
    setIsAddingPerson(false);
    setEditingPersonId(null);
    setFormData(getEmptyPersonForm());
  };

  const handleCancelPerson = () => {
    setIsAddingPerson(false);
    setEditingPersonId(null);
    setFormData(getEmptyPersonForm());
  };

  const handleDeletePerson = (personId: string) => {
    if (window.confirm('Are you sure you want to remove this person?')) {
      setPeople(prev => prev.filter(p => p.id !== personId));
    }
  };

  const handleCreateClientGroup = () => {
    if (people.length === 0) {
      alert('Please add at least one person to the client group');
      return;
    }

    if (!clientGroupName.trim()) {
      alert('Please enter a client group name');
      return;
    }

    // For prototype, just navigate to Phase 2 page
    // In real implementation, this would save to database first
    alert(`Client Group "${clientGroupName}" created with ${people.length} ${people.length === 1 ? 'person' : 'people'}!`);
    navigate('/client-groups-phase2');
  };

  const renderField = (
    label: string,
    field: keyof PersonFormData,
    type: string = 'text',
    required: boolean = false
  ) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        value={formData[field] as string}
        onChange={(e) => handleInputChange(field, e.target.value)}
        onBlur={(e) => {
          if (field === 'dateOfBirth' && e.target.value) {
            const age = calculateAge(e.target.value);
            handleInputChange('age', age);
          }
        }}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
      />
    </div>
  );

  const renderArrayField = (
    label: string,
    field: 'emails' | 'phoneNumbers' | 'safeWords',
    required: boolean = false
  ) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
        <span className="text-xs text-gray-500 ml-2">(comma-separated)</span>
      </label>
      <input
        type="text"
        value={formData[field].join(', ')}
        onChange={(e) => handleArrayInputChange(field, e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
      />
    </div>
  );

  const renderSelectField = (
    label: string,
    field: keyof PersonFormData,
    options: string[],
    required: boolean = false
  ) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <select
        value={formData[field] as string}
        onChange={(e) => handleInputChange(field, e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
      >
        <option value="">Select...</option>
        {options.map(option => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </div>
  );

  return (
    <DynamicPageContainer maxWidth="1800px" className="py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-normal text-gray-900 font-sans tracking-wide">
          Create New Client Group
        </h1>
        <p className="text-gray-600 mt-1 text-sm">Add people to create a new client group</p>
      </div>

      {/* Client Group Name */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Client Group Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={clientGroupName}
          onChange={(e) => setClientGroupName(e.target.value)}
          placeholder="e.g., Smith Family, Johnson Trust"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
        />
      </div>

      {/* People in Client Group */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            People in Client Group ({people.length})
          </h2>
          {!isAddingPerson && (
            <button
              onClick={handleAddPerson}
              className="flex items-center gap-2 px-4 py-2 bg-primary-700 text-white rounded-lg hover:bg-primary-800 transition-colors"
            >
              <PlusIcon className="w-5 h-5" />
              Add Person
            </button>
          )}
        </div>

        {/* List of Added People */}
        {people.length > 0 && !isAddingPerson && (
          <div className="mb-6">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Relationship</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Age</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {people.map((person) => (
                  <tr key={person.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {person.title} {person.forename} {person.surname}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{person.relationship}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{person.age}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{person.emails[0]}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <button
                        onClick={() => handleEditPerson(person)}
                        className="text-primary-600 hover:text-primary-800 mr-3"
                      >
                        <PencilIcon className="w-5 h-5 inline" />
                      </button>
                      <button
                        onClick={() => handleDeletePerson(person.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <TrashIcon className="w-5 h-5 inline" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Add/Edit Person Form */}
        {isAddingPerson && (
          <div className="border-t pt-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-full bg-primary-100">
                <UserIcon className="h-6 w-6 text-primary-700" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                {editingPersonId ? 'Edit Person' : 'Add New Person'}
              </h3>
            </div>

            {/* Personal Information */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-700 uppercase mb-4">Personal Information</h4>
              <div className="grid grid-cols-2 gap-4">
                {renderSelectField('Gender', 'gender', ['Male', 'Female', 'Other'], true)}
                {renderSelectField('Title', 'title', ['Mr', 'Mrs', 'Miss', 'Ms', 'Dr', 'Prof'], true)}
                {renderField('Forename', 'forename', 'text', true)}
                {renderField('Middle Names', 'middleNames')}
                {renderField('Surname', 'surname', 'text', true)}
                {renderField('Known As', 'knownAs', 'text', true)}
                <div className="col-span-2">
                  {renderField('Previous Names', 'previousNames')}
                </div>
                <div className="col-span-2">
                  {renderSelectField('Relationship Status', 'relationshipStatus', ['Single', 'Married', 'Divorced', 'Widowed', 'Civil Partnership'], true)}
                </div>
                <div className="col-span-2">
                  {renderField('Address Line 1', 'addressLine1', 'text', true)}
                </div>
                <div className="col-span-2">
                  {renderField('Address Line 2', 'addressLine2')}
                </div>
                <div className="col-span-2">
                  {renderField('Address Line 3', 'addressLine3')}
                </div>
                <div className="col-span-2">
                  {renderField('Address Line 4', 'addressLine4')}
                </div>
                <div className="col-span-2">
                  {renderField('Address Line 5', 'addressLine5')}
                </div>
                {renderField('Postcode', 'postcode', 'text', true)}
                {renderField('Date Moved In', 'dateMovedIn', 'date')}
                {renderField('Date of Birth', 'dateOfBirth', 'date', true)}
                {renderField('Age', 'age', 'number')}
                <div className="col-span-2">
                  {renderField('Place of Birth', 'placeOfBirth', 'text', true)}
                </div>
                <div className="col-span-2">
                  {renderArrayField('Email Addresses', 'emails', true)}
                </div>
                <div className="col-span-2">
                  {renderArrayField('Phone Numbers', 'phoneNumbers', true)}
                </div>
                {renderSelectField('Employment Status', 'employmentStatus', ['Employed', 'Self-Employed', 'Unemployed', 'Retired', 'Student'], true)}
                {renderField('Occupation', 'occupation', 'text', true)}
              </div>
            </div>

            {/* Regulatory Information */}
            <div className="mb-6 pt-6 border-t">
              <h4 className="text-sm font-semibold text-gray-700 uppercase mb-4">Regulatory Information</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  {renderField('National Insurance Number', 'niNumber', 'text', true)}
                </div>
                <div className="col-span-2">
                  {renderField('AML Check', 'amlCheck')}
                </div>
                {renderField('Driving License Expiry', 'drivingLicenseExpiry', 'date')}
                {renderField('Passport Expiry', 'passportExpiry', 'date')}
                <div className="col-span-2">
                  {renderField('Other IDs', 'otherIds')}
                </div>
                <div className="col-span-2">
                  {renderArrayField('Safe Words', 'safeWords')}
                </div>
                <div className="col-span-2">
                  {renderField('Share Data With', 'shareDataWith')}
                </div>
              </div>
            </div>

            {/* Relationship to Client Group */}
            <div className="mb-6 pt-6 border-t">
              <h4 className="text-sm font-semibold text-gray-700 uppercase mb-4">Client Group Relationship</h4>
              <div className="grid grid-cols-2 gap-4">
                {renderSelectField('Relationship', 'relationship', ['Husband', 'Wife', 'Partner', 'Son', 'Daughter', 'Father', 'Mother', 'Other'], true)}
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex items-center gap-3 pt-6 border-t">
              <button
                onClick={handleSavePerson}
                disabled={!isPersonFormValid()}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-colors ${
                  isPersonFormValid()
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                <CheckIcon className="w-5 h-5" />
                {editingPersonId ? 'Update Person' : 'Add Person'}
              </button>
              <button
                onClick={handleCancelPerson}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                <XMarkIcon className="w-5 h-5 inline mr-2" />
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Client Group Button */}
      <div className="flex items-center justify-end gap-4">
        <button
          onClick={() => navigate('/reporting')}
          className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleCreateClientGroup}
          disabled={people.length === 0 || !clientGroupName.trim()}
          className={`px-6 py-3 rounded-lg transition-colors ${
            people.length > 0 && clientGroupName.trim()
              ? 'bg-primary-700 text-white hover:bg-primary-800'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          Create Client Group
        </button>
      </div>
    </DynamicPageContainer>
  );
};

export default CreateClientGroupPrototype;
