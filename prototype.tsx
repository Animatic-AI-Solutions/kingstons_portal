import React, { useState } from 'react';
import { User, FileText, DollarSign, TrendingUp, Shield, X, ChevronRight, Edit2, Save, Plus, UserPlus } from 'lucide-react';

// Types
interface Client {
  id: string;
  name: string;
  nationalInsurance: string;
  address: string;
  phone: string;
  safeWords: [string, string, string];
}

interface Person {
  id: string;
  name: string;
  age: number;
  dateOfBirth: string;
  relationship: string;
  email?: string;
  mobile?: string;
  nationalInsurance?: string;
  address?: string;
  notes?: string;
}

interface Relationship {
  id: string;
  name: string;
  type: string;
  dateOfBirth: string;
  contact?: string;
  notes?: string;
}

interface HealthInfo {
  smoker: boolean;
  conditions: string[];
  medications: string[];
  notes: string;
}

interface Document {
  id: string;
  type: string;
  name: string;
  dateCreated: string;
  status: string;
  location?: string;
  expiryDate?: string;
  notes?: string;
}

interface Asset {
  id: string;
  type: string;
  description: string;
  value: number;
  institution: string;
  accountNumber?: string;
  acquisitionDate?: string;
  notes?: string;
}

interface Liability {
  id: string;
  type: string;
  description: string;
  amount: number;
  interestRate: number;
  monthlyPayment?: number;
  endDate?: string;
  notes?: string;
}

interface IncomeItem {
  id: string;
  source: string;
  amount: number;
  frequency: string;
  taxStatus?: string;
  notes?: string;
}

interface ExpenditureItem {
  id: string;
  category: string;
  amount: number;
  frequency: string;
  essential?: boolean;
  notes?: string;
}

interface ProtectionProduct {
  id: string;
  type: string;
  provider: string;
  coverAmount: number;
  premium: number;
  startDate: string;
  status: string;
  policyNumber?: string;
  renewalDate?: string;
  notes?: string;
}

// Sample Data
const initialPeople: Person[] = [
  { 
    id: '1', 
    name: 'James Mitchell', 
    age: 52, 
    dateOfBirth: '15/03/1972', 
    relationship: 'Primary Client',
    email: 'james.mitchell@email.com',
    mobile: '+44 7700 900123',
    nationalInsurance: 'AB123456C',
    address: '42 Oakwood Drive, Richmond, London, TW9 4AE',
    notes: 'IT Consultant, prefers email contact'
  },
  { 
    id: '2', 
    name: 'Sarah Mitchell', 
    age: 49, 
    dateOfBirth: '22/07/1975', 
    relationship: 'Spouse',
    email: 'sarah.mitchell@email.com',
    mobile: '+44 7700 900456',
    nationalInsurance: 'CD789012E',
    address: '42 Oakwood Drive, Richmond, London, TW9 4AE',
    notes: 'Marketing Director, available weekday evenings'
  },
  { 
    id: '3', 
    name: 'Emily Mitchell', 
    age: 21, 
    dateOfBirth: '10/09/2003', 
    relationship: 'Daughter',
    email: 'emily.mitchell@uni.ac.uk',
    mobile: '+44 7700 900789',
    nationalInsurance: 'EF345678G',
    address: 'University of Manchester, Oxford Road, Manchester, M13 9PL',
    notes: 'University student, studying Economics'
  },
  { 
    id: '4', 
    name: 'Thomas Mitchell', 
    age: 18, 
    dateOfBirth: '03/12/2006', 
    relationship: 'Son',
    email: 'thomas.mitchell@email.com',
    mobile: '+44 7700 900012',
    nationalInsurance: 'GH901234I',
    address: '42 Oakwood Drive, Richmond, London, TW9 4AE',
    notes: 'Gap year, planning to study Medicine'
  }
];

const sampleRelationships: Relationship[] = [
  { 
    id: '1', 
    name: 'Emily Mitchell', 
    type: 'Dependent Child', 
    dateOfBirth: '10/09/2003',
    contact: '+44 7700 900789',
    notes: 'Financial support for university tuition and accommodation'
  },
  { 
    id: '2', 
    name: 'Thomas Mitchell', 
    type: 'Dependent Child', 
    dateOfBirth: '03/12/2006',
    contact: '+44 7700 900012',
    notes: 'Financial support during gap year'
  },
  { 
    id: '3', 
    name: 'Margaret Foster', 
    type: 'Elderly Parent', 
    dateOfBirth: '14/02/1948',
    contact: '+44 20 8765 4321',
    notes: 'Sarah\'s mother, requires occasional care assistance'
  }
];

const sampleHealth: HealthInfo = {
  smoker: false,
  conditions: ['Type 2 Diabetes (Sarah)', 'Mild Hypertension (James)'],
  medications: ['Metformin 500mg (Sarah)', 'Amlodipine 5mg (James)'],
  notes: 'Annual health reviews up to date. Both clients maintain active lifestyle.'
};

const sampleDocuments: Document[] = [
  { 
    id: '1', 
    type: 'Will', 
    name: 'Last Will & Testament - James Mitchell', 
    dateCreated: '15/01/2023', 
    status: 'Current',
    location: 'Office Safe - Box 42A',
    expiryDate: 'N/A',
    notes: 'Reviewed annually, beneficiaries are spouse and children'
  },
  { 
    id: '2', 
    type: 'Will', 
    name: 'Last Will & Testament - Sarah Mitchell', 
    dateCreated: '15/01/2023', 
    status: 'Current',
    location: 'Office Safe - Box 42A',
    expiryDate: 'N/A',
    notes: 'Mirror will with James, includes charitable bequest'
  },
  { 
    id: '3', 
    type: 'LPA', 
    name: 'Lasting Power of Attorney (Property) - James', 
    dateCreated: '20/03/2023', 
    status: 'Registered',
    location: 'OPG Registration',
    expiryDate: 'N/A',
    notes: 'Attorney: Sarah Mitchell, Replacement: Emily Mitchell'
  },
  { 
    id: '4', 
    type: 'LPA', 
    name: 'Lasting Power of Attorney (Health) - Sarah', 
    dateCreated: '20/03/2023', 
    status: 'Registered',
    location: 'OPG Registration',
    expiryDate: 'N/A',
    notes: 'Attorney: James Mitchell, Replacement: Emily Mitchell'
  }
];

const sampleAssets: Asset[] = [
  { 
    id: '1', 
    type: 'Property', 
    description: 'Primary Residence', 
    value: 875000, 
    institution: 'Owned Outright',
    accountNumber: 'N/A',
    acquisitionDate: '12/05/2008',
    notes: '4-bed detached house, Richmond. Last valued June 2024'
  },
  { 
    id: '2', 
    type: 'ISA', 
    description: 'Stocks & Shares ISA', 
    value: 156000, 
    institution: 'Hargreaves Lansdown',
    accountNumber: 'HL-8273645',
    acquisitionDate: '01/04/2015',
    notes: 'Global equity tracker fund, 80% stocks 20% bonds'
  },
  { 
    id: '3', 
    type: 'Pension', 
    description: 'SIPP - James', 
    value: 425000, 
    institution: 'AJ Bell',
    accountNumber: 'AJB-55382910',
    acquisitionDate: '15/09/2010',
    notes: 'Self-invested personal pension, diversified portfolio'
  },
  { 
    id: '4', 
    type: 'Pension', 
    description: 'Workplace Pension - Sarah', 
    value: 218000, 
    institution: 'Legal & General',
    accountNumber: 'LG-WP-773821',
    acquisitionDate: '01/03/2012',
    notes: 'Employer contributes 8%, employee contributes 5%'
  },
  { 
    id: '5', 
    type: 'Investment', 
    description: 'GIA Portfolio', 
    value: 94000, 
    institution: 'Vanguard',
    accountNumber: 'VG-992847',
    acquisitionDate: '10/11/2018',
    notes: 'General Investment Account, monthly contributions £500'
  }
];

const sampleLiabilities: Liability[] = [
  { 
    id: '1', 
    type: 'Mortgage', 
    description: 'Buy-to-Let Property', 
    amount: 185000, 
    interestRate: 4.2,
    monthlyPayment: 950,
    endDate: '15/07/2035',
    notes: '2-bed flat in Manchester, rented out for £1,450/month'
  },
  { 
    id: '2', 
    type: 'Loan', 
    description: 'Car Finance', 
    amount: 12500, 
    interestRate: 3.9,
    monthlyPayment: 285,
    endDate: '20/02/2027',
    notes: 'Tesla Model 3, 3 years remaining'
  }
];

const sampleIncome: IncomeItem[] = [
  { 
    id: '1', 
    source: 'Salary - James (IT Consultant)', 
    amount: 85000, 
    frequency: 'Annual',
    taxStatus: 'PAYE',
    notes: 'Includes performance bonus, usually paid in March'
  },
  { 
    id: '2', 
    source: 'Salary - Sarah (Marketing Director)', 
    amount: 72000, 
    frequency: 'Annual',
    taxStatus: 'PAYE',
    notes: 'Plus company car benefit (£6,500 taxable value)'
  },
  { 
    id: '3', 
    source: 'Rental Income', 
    amount: 1450, 
    frequency: 'Monthly',
    taxStatus: 'Self Assessment',
    notes: 'Buy-to-let property, managed by letting agent'
  },
  { 
    id: '4', 
    source: 'Investment Dividends', 
    amount: 3200, 
    frequency: 'Annual',
    taxStatus: 'Self Assessment',
    notes: 'From ISA and GIA holdings, varies annually'
  }
];

const sampleExpenditure: ExpenditureItem[] = [
  { 
    id: '1', 
    category: 'Mortgage (BTL)', 
    amount: 950, 
    frequency: 'Monthly',
    essential: true,
    notes: 'Fixed rate ends 2028, consider remortgage options'
  },
  { 
    id: '2', 
    category: 'Household Bills', 
    amount: 450, 
    frequency: 'Monthly',
    essential: true,
    notes: 'Gas, electricity, water, council tax'
  },
  { 
    id: '3', 
    category: 'Insurance Premiums', 
    amount: 285, 
    frequency: 'Monthly',
    essential: true,
    notes: 'Home, car, life, and health insurance combined'
  },
  { 
    id: '4', 
    category: 'Living Expenses', 
    amount: 2800, 
    frequency: 'Monthly',
    essential: true,
    notes: 'Food, transport, clothing, etc.'
  },
  { 
    id: '5', 
    category: 'Leisure & Travel', 
    amount: 1200, 
    frequency: 'Monthly',
    essential: false,
    notes: 'Dining out, holidays, entertainment'
  }
];

const sampleProducts: ProtectionProduct[] = [
  { 
    id: '1', 
    type: 'Life Insurance', 
    provider: 'Legal & General', 
    coverAmount: 500000, 
    premium: 45, 
    startDate: '01/04/2020', 
    status: 'Active',
    policyNumber: 'LG-LIFE-382910',
    renewalDate: '01/04/2030',
    notes: 'Joint life policy, decreasing term to match mortgage'
  },
  { 
    id: '2', 
    type: 'Critical Illness', 
    provider: 'Aviva', 
    coverAmount: 250000, 
    premium: 78, 
    startDate: '01/04/2020', 
    status: 'Active',
    policyNumber: 'AV-CI-551289',
    renewalDate: '01/04/2035',
    notes: 'Covers 50+ critical illnesses, accelerated payment'
  },
  { 
    id: '3', 
    type: 'Income Protection', 
    provider: 'LV=', 
    coverAmount: 60000, 
    premium: 92, 
    startDate: '15/06/2021', 
    status: 'Active',
    policyNumber: 'LV-IP-664521',
    renewalDate: '15/06/2026',
    notes: 'Covers 70% of income, 4-week deferred period'
  }
];

const ClientManagementSystem = () => {
  const [activeTab, setActiveTab] = useState('summary');
  const [activeSubTab, setActiveSubTab] = useState('people');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [detailType, setDetailType] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [editedItem, setEditedItem] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [people, setPeople] = useState<Person[]>(initialPeople);
  const [newPerson, setNewPerson] = useState<Person>({
    id: '',
    name: '',
    age: 0,
    dateOfBirth: '',
    relationship: '',
    email: '',
    mobile: '',
    nationalInsurance: '',
    address: '',
    notes: ''
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount);
  };

  const tabs = [
    { id: 'summary', label: 'Summary', icon: User },
    { id: 'basic', label: 'Basic Details', icon: FileText },
    { id: 'assets', label: 'Assets & Liabilities', icon: DollarSign },
    { id: 'income', label: 'Income & Expenditure', icon: TrendingUp },
    { id: 'products', label: 'Other Products', icon: Shield }
  ];

  const subTabs = [
    { id: 'people', label: 'People' },
    { id: 'relationships', label: 'Special Relationships' },
    { id: 'health', label: 'Health & Vulnerability' },
    { id: 'documents', label: 'Documents' }
  ];

  const handleItemClick = (item: any, type: string) => {
    setSelectedItem(item);
    setEditedItem({...item});
    setDetailType(type);
    setIsEditing(false);
  };

  const closeDetailView = () => {
    setSelectedItem(null);
    setDetailType('');
    setIsEditing(false);
    setEditedItem(null);
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = () => {
    if (detailType === 'person') {
      setPeople(people.map(p => p.id === editedItem.id ? editedItem : p));
      setSelectedItem(editedItem);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedItem({...selectedItem});
    setIsEditing(false);
  };

  const handleCreatePerson = () => {
    const id = (Math.max(...people.map(p => parseInt(p.id)), 0) + 1).toString();
    const personToAdd = { ...newPerson, id };
    setPeople([...people, personToAdd]);
    setShowCreateModal(false);
    setNewPerson({
      id: '',
      name: '',
      age: 0,
      dateOfBirth: '',
      relationship: '',
      email: '',
      mobile: '',
      nationalInsurance: '',
      address: '',
      notes: ''
    });
  };

  const renderDetailPanel = () => {
    if (!selectedItem) return null;

    const currentItem = isEditing ? editedItem : selectedItem;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
          <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
            <h3 className="text-xl font-semibold text-gray-900">
              {detailType === 'person' && 'Person Details'}
              {detailType === 'relationship' && 'Relationship Details'}
              {detailType === 'document' && 'Document Details'}
              {detailType === 'asset' && 'Asset Details'}
              {detailType === 'liability' && 'Liability Details'}
              {detailType === 'income' && 'Income Details'}
              {detailType === 'expenditure' && 'Expenditure Details'}
              {detailType === 'product' && 'Protection Product Details'}
            </h3>
            <div className="flex items-center gap-2">
              {!isEditing && (
                <button 
                  onClick={handleEdit}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Edit2 size={16} />
                  Edit
                </button>
              )}
              {isEditing && (
                <>
                  <button 
                    onClick={handleSave}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    <Save size={16} />
                    Save
                  </button>
                  <button 
                    onClick={handleCancel}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </>
              )}
              <button onClick={closeDetailView} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>
          </div>
          
          <div className="p-6">
            {detailType === 'person' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    {isEditing ? (
                      <input 
                        type="text" 
                        value={currentItem.name}
                        onChange={(e) => setEditedItem({...editedItem, name: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    ) : (
                      <p className="text-gray-900">{currentItem.name}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Relationship</label>
                    {isEditing ? (
                      <input 
                        type="text" 
                        value={currentItem.relationship}
                        onChange={(e) => setEditedItem({...editedItem, relationship: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    ) : (
                      <p className="text-gray-900">{currentItem.relationship}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                    {isEditing ? (
                      <input 
                        type="text" 
                        value={currentItem.dateOfBirth}
                        onChange={(e) => setEditedItem({...editedItem, dateOfBirth: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    ) : (
                      <p className="text-gray-900">{currentItem.dateOfBirth}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                    {isEditing ? (
                      <input 
                        type="number" 
                        value={currentItem.age}
                        onChange={(e) => setEditedItem({...editedItem, age: parseInt(e.target.value)})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    ) : (
                      <p className="text-gray-900">{currentItem.age}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    {isEditing ? (
                      <input 
                        type="email" 
                        value={currentItem.email}
                        onChange={(e) => setEditedItem({...editedItem, email: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    ) : (
                      <p className="text-gray-900">{currentItem.email}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mobile</label>
                    {isEditing ? (
                      <input 
                        type="text" 
                        value={currentItem.mobile}
                        onChange={(e) => setEditedItem({...editedItem, mobile: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    ) : (
                      <p className="text-gray-900">{currentItem.mobile}</p>
                    )}
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">National Insurance</label>
                    {isEditing ? (
                      <input 
                        type="text" 
                        value={currentItem.nationalInsurance}
                        onChange={(e) => setEditedItem({...editedItem, nationalInsurance: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    ) : (
                      <p className="text-gray-900">{currentItem.nationalInsurance}</p>
                    )}
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                    {isEditing ? (
                      <input 
                        type="text" 
                        value={currentItem.address}
                        onChange={(e) => setEditedItem({...editedItem, address: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    ) : (
                      <p className="text-gray-900">{currentItem.address}</p>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  {isEditing ? (
                    <textarea 
                      value={currentItem.notes}
                      onChange={(e) => setEditedItem({...editedItem, notes: e.target.value})}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  ) : (
                    <p className="text-gray-900">{currentItem.notes}</p>
                  )}
                </div>
              </div>
            )}

            {detailType === 'relationship' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <p className="text-gray-900">{currentItem.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <p className="text-gray-900">{currentItem.type}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                    <p className="text-gray-900">{currentItem.dateOfBirth}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact</label>
                    <p className="text-gray-900">{currentItem.contact}</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <p className="text-gray-900">{currentItem.notes}</p>
                </div>
              </div>
            )}

            {detailType === 'document' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <p className="text-gray-900">{currentItem.type}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      currentItem.status === 'Current' || currentItem.status === 'Registered' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {currentItem.status}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Document Name</label>
                    <p className="text-gray-900">{currentItem.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date Created</label>
                    <p className="text-gray-900">{currentItem.dateCreated}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                    <p className="text-gray-900">{currentItem.expiryDate}</p>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                    <p className="text-gray-900">{currentItem.location}</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <p className="text-gray-900">{currentItem.notes}</p>
                </div>
              </div>
            )}

            {detailType === 'asset' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <p className="text-gray-900">{currentItem.type}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
                    <p className="text-gray-900 font-semibold text-lg">{formatCurrency(currentItem.value)}</p>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <p className="text-gray-900">{currentItem.description}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Institution</label>
                    <p className="text-gray-900">{currentItem.institution}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                    <p className="text-gray-900">{currentItem.accountNumber}</p>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Acquisition Date</label>
                    <p className="text-gray-900">{currentItem.acquisitionDate}</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <p className="text-gray-900">{currentItem.notes}</p>
                </div>
              </div>
            )}

            {detailType === 'liability' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <p className="text-gray-900">{currentItem.type}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                    <p className="text-gray-900 font-semibold text-lg">{formatCurrency(currentItem.amount)}</p>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <p className="text-gray-900">{currentItem.description}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Interest Rate</label>
                    <p className="text-gray-900">{currentItem.interestRate}%</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Payment</label>
                    <p className="text-gray-900">{formatCurrency(currentItem.monthlyPayment)}</p>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                    <p className="text-gray-900">{currentItem.endDate}</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <p className="text-gray-900">{currentItem.notes}</p>
                </div>
              </div>
            )}

            {detailType === 'income' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                    <p className="text-gray-900">{currentItem.source}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                    <p className="text-gray-900 font-semibold text-lg">{formatCurrency(currentItem.amount)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
                    <p className="text-gray-900">{currentItem.frequency}</p>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tax Status</label>
                    <p className="text-gray-900">{currentItem.taxStatus}</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <p className="text-gray-900">{currentItem.notes}</p>
                </div>
              </div>
            )}

            {detailType === 'expenditure' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <p className="text-gray-900">{currentItem.category}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Essential</label>
                    <p className="text-gray-900">{currentItem.essential ? 'Yes' : 'No'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                    <p className="text-gray-900 font-semibold text-lg">{formatCurrency(currentItem.amount)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
                    <p className="text-gray-900">{currentItem.frequency}</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <p className="text-gray-900">{currentItem.notes}</p>
                </div>
              </div>
            )}

            {detailType === 'product' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <p className="text-gray-900">{currentItem.type}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                      {currentItem.status}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
                    <p className="text-gray-900">{currentItem.provider}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Policy Number</label>
                    <p className="text-gray-900">{currentItem.policyNumber}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cover Amount</label>
                    <p className="text-gray-900 font-semibold text-lg">{formatCurrency(currentItem.coverAmount)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Premium</label>
                    <p className="text-gray-900">{formatCurrency(currentItem.premium)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <p className="text-gray-900">{currentItem.startDate}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Renewal Date</label>
                    <p className="text-gray-900">{currentItem.renewalDate}</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <p className="text-gray-900">{currentItem.notes}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderCreateModal = () => {
    if (!showCreateModal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
          <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
            <h3 className="text-xl font-semibold text-gray-900">Create New Person</h3>
            <button onClick={() => setShowCreateModal(false)} className="text-gray-500 hover:text-gray-700">
              <X size={24} />
            </button>
          </div>
          
          <div className="p-6">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input 
                    type="text" 
                    value={newPerson.name}
                    onChange={(e) => setNewPerson({...newPerson, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="John Smith"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Relationship *</label>
                  <input 
                    type="text" 
                    value={newPerson.relationship}
                    onChange={(e) => setNewPerson({...newPerson, relationship: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Primary Client / Spouse / Child"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth *</label>
                  <input 
                    type="text" 
                    value={newPerson.dateOfBirth}
                    onChange={(e) => setNewPerson({...newPerson, dateOfBirth: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="DD/MM/YYYY"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Age *</label>
                  <input 
                    type="number" 
                    value={newPerson.age || ''}
                    onChange={(e) => setNewPerson({...newPerson, age: parseInt(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="45"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input 
                    type="email" 
                    value={newPerson.email}
                    onChange={(e) => setNewPerson({...newPerson, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="john.smith@email.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mobile</label>
                  <input 
                    type="text" 
                    value={newPerson.mobile}
                    onChange={(e) => setNewPerson({...newPerson, mobile: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="+44 7700 900000"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">National Insurance</label>
                  <input 
                    type="text" 
                    value={newPerson.nationalInsurance}
                    onChange={(e) => setNewPerson({...newPerson, nationalInsurance: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="AB123456C"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <input 
                    type="text" 
                    value={newPerson.address}
                    onChange={(e) => setNewPerson({...newPerson, address: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="123 Main Street, London, SW1A 1AA"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea 
                  value={newPerson.notes}
                  onChange={(e) => setNewPerson({...newPerson, notes: e.target.value})}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Additional information..."
                />
              </div>
            </div>
          </div>

          <div className="border-t px-6 py-4 flex justify-end gap-3">
            <button 
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
            >
              Cancel
            </button>
            <button 
              onClick={handleCreatePerson}
              disabled={!newPerson.name || !newPerson.relationship || !newPerson.dateOfBirth || !newPerson.age}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <UserPlus size={16} />
              Create Person
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left Sidebar */}
      <div className="w-64 bg-blue-900 text-white flex flex-col">
        <div className="p-6 border-b border-blue-800">
          <h1 className="text-xl font-bold">Client Management</h1>
          <p className="text-blue-200 text-sm mt-1">Wealth Portal</p>
        </div>
        
        <nav className="flex-1 p-4">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  if (tab.id === 'basic') {
                    setActiveSubTab('people');
                  }
                }}
                className={`w-full flex items-center px-4 py-3 mb-2 rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-700 text-white'
                    : 'text-blue-200 hover:bg-blue-800'
                }`}
              >
                <Icon size={20} className="mr-3" />
                <span>{tab.label}</span>
                {activeTab === tab.id && <ChevronRight size={18} className="ml-auto" />}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-blue-800">
          <button 
            onClick={() => setShowCreateModal(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus size={20} />
            Create Client Group
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-6">
          {/* Summary Tab */}
          {activeTab === 'summary' && (
            <div>
              <h2 className="text-2xl font-semibold mb-6 text-gray-900">Client Group Summary</h2>
              <div className="grid gap-6">
                {people.map(person => (
                  <div key={person.id} className="bg-white rounded-lg shadow p-6">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-xl font-semibold text-gray-900">{person.name}</h3>
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                        {person.relationship}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                        <p className="text-gray-900">{person.dateOfBirth} (Age {person.age})</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">National Insurance</label>
                        <p className="text-gray-900">{person.nationalInsurance}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <p className="text-gray-900">{person.email}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Mobile</label>
                        <p className="text-gray-900">{person.mobile}</p>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                        <p className="text-gray-900">{person.address}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Basic Details Tab */}
          {activeTab === 'basic' && (
            <div>
              {/* Sub-tabs */}
              <div className="bg-white rounded-t-lg shadow">
                <div className="flex border-b">
                  {subTabs.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveSubTab(tab.id)}
                      className={`px-6 py-3 font-medium transition-colors ${
                        activeSubTab === tab.id
                          ? 'border-b-2 border-blue-600 text-blue-600'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sub-tab Content */}
              <div className="bg-white rounded-b-lg shadow p-6">
                {activeSubTab === 'people' && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-gray-900">Client Group Members</h3>
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Name</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Age</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Date of Birth</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Relationship</th>
                          <th className="px-4 py-3"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {people.map(person => (
                          <tr 
                            key={person.id} 
                            className="hover:bg-gray-50 cursor-pointer"
                            onClick={() => handleItemClick(person, 'person')}
                          >
                            <td className="px-4 py-3 text-sm text-gray-900">{person.name}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{person.age}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{person.dateOfBirth}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{person.relationship}</td>
                            <td className="px-4 py-3 text-sm text-blue-600">
                              <ChevronRight size={18} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {activeSubTab === 'relationships' && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-gray-900">Special Relationships</h3>
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Name</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Type</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Date of Birth</th>
                          <th className="px-4 py-3"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {sampleRelationships.map(rel => (
                          <tr 
                            key={rel.id} 
                            className="hover:bg-gray-50 cursor-pointer"
                            onClick={() => handleItemClick(rel, 'relationship')}
                          >
                            <td className="px-4 py-3 text-sm text-gray-900">{rel.name}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{rel.type}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{rel.dateOfBirth}</td>
                            <td className="px-4 py-3 text-sm text-blue-600">
                              <ChevronRight size={18} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {activeSubTab === 'health' && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-gray-900">Health & Vulnerability Information</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Smoking Status</label>
                        <p className="text-gray-900">{sampleHealth.smoker ? 'Smoker' : 'Non-smoker'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Health Conditions</label>
                        <ul className="list-disc list-inside space-y-1">
                          {sampleHealth.conditions.map((condition, idx) => (
                            <li key={idx} className="text-gray-900">{condition}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Medications</label>
                        <ul className="list-disc list-inside space-y-1">
                          {sampleHealth.medications.map((med, idx) => (
                            <li key={idx} className="text-gray-900">{med}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Additional Notes</label>
                        <p className="text-gray-900">{sampleHealth.notes}</p>
                      </div>
                    </div>
                  </div>
                )}

                {activeSubTab === 'documents' && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-gray-900">Legal Documents</h3>
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Type</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Document Name</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Date Created</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                          <th className="px-4 py-3"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {sampleDocuments.map(doc => (
                          <tr 
                            key={doc.id} 
                            className="hover:bg-gray-50 cursor-pointer"
                            onClick={() => handleItemClick(doc, 'document')}
                          >
                            <td className="px-4 py-3 text-sm text-gray-900">{doc.type}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{doc.name}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{doc.dateCreated}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                doc.status === 'Current' || doc.status === 'Registered' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {doc.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-blue-600">
                              <ChevronRight size={18} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Assets & Liabilities Tab */}
          {activeTab === 'assets' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Assets</h3>
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Type</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Description</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Value</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Institution</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {sampleAssets.map(asset => (
                      <tr 
                        key={asset.id} 
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleItemClick(asset, 'asset')}
                      >
                        <td className="px-4 py-3 text-sm text-gray-900">{asset.type}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{asset.description}</td>
                        <td className="px-4 py-3 text-sm text-right text-gray-900 font-medium">
                          {formatCurrency(asset.value)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">{asset.institution}</td>
                        <td className="px-4 py-3 text-sm text-blue-600">
                          <ChevronRight size={18} />
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-blue-50 font-semibold">
                      <td colSpan={2} className="px-4 py-3 text-sm text-gray-900">Total Assets</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900">
                        {formatCurrency(sampleAssets.reduce((sum, asset) => sum + asset.value, 0))}
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Liabilities</h3>
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Type</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Description</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Amount</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Interest Rate</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {sampleLiabilities.map(liability => (
                      <tr 
                        key={liability.id} 
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleItemClick(liability, 'liability')}
                      >
                        <td className="px-4 py-3 text-sm text-gray-900">{liability.type}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{liability.description}</td>
                        <td className="px-4 py-3 text-sm text-right text-gray-900 font-medium">
                          {formatCurrency(liability.amount)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-900">{liability.interestRate}%</td>
                        <td className="px-4 py-3 text-sm text-blue-600">
                          <ChevronRight size={18} />
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-red-50 font-semibold">
                      <td colSpan={2} className="px-4 py-3 text-sm text-gray-900">Total Liabilities</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900">
                        {formatCurrency(sampleLiabilities.reduce((sum, liability) => sum + liability.amount, 0))}
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-gray-900">Net Worth</h3>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(
                      sampleAssets.reduce((sum, asset) => sum + asset.value, 0) -
                      sampleLiabilities.reduce((sum, liability) => sum + liability.amount, 0)
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Income & Expenditure Tab */}
          {activeTab === 'income' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Income</h3>
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Source</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Amount</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Frequency</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {sampleIncome.map(income => (
                      <tr 
                        key={income.id} 
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleItemClick(income, 'income')}
                      >
                        <td className="px-4 py-3 text-sm text-gray-900">{income.source}</td>
                        <td className="px-4 py-3 text-sm text-right text-gray-900 font-medium">
                          {formatCurrency(income.amount)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">{income.frequency}</td>
                        <td className="px-4 py-3 text-sm text-blue-600">
                          <ChevronRight size={18} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-900">Expenditure</h3>
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Category</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Amount</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Frequency</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {sampleExpenditure.map(expense => (
                      <tr 
                        key={expense.id} 
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleItemClick(expense, 'expenditure')}
                      >
                        <td className="px-4 py-3 text-sm text-gray-900">{expense.category}</td>
                        <td className="px-4 py-3 text-sm text-right text-gray-900 font-medium">
                          {formatCurrency(expense.amount)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">{expense.frequency}</td>
                        <td className="px-4 py-3 text-sm text-blue-600">
                          <ChevronRight size={18} />
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-gray-50 font-semibold">
                      <td className="px-4 py-3 text-sm text-gray-900">Total Monthly Expenditure</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900">
                        {formatCurrency(sampleExpenditure.reduce((sum, exp) => sum + exp.amount, 0))}
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Other Products Tab */}
          {activeTab === 'products' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Protection Products</h3>
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Type</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Provider</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Cover Amount</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Premium</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sampleProducts.map(product => (
                    <tr 
                      key={product.id} 
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleItemClick(product, 'product')}
                    >
                      <td className="px-4 py-3 text-sm text-gray-900">{product.type}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{product.provider}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900 font-medium">
                        {formatCurrency(product.coverAmount)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-900">
                        {formatCurrency(product.premium)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {product.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-blue-600">
                        <ChevronRight size={18} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Detail Panel Modal */}
      {renderDetailPanel()}

      {/* Create Person Modal */}
      {renderCreateModal()}
    </div>
  );
};

export default ClientManagementSystem;