import React, { useState } from 'react';
import { User, FileText, DollarSign, TrendingUp, Shield, X, ChevronRight, Edit2, Save, Plus, UserPlus, Trash2 } from 'lucide-react';

// Types
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
  id: string;
  personName: string;
  smoker: boolean;
  conditions: string;
  medications: string;
  notes: string;
  status: 'Active' | 'Inactive';
  dateRecorded: string;
}

interface VulnerabilityInfo {
  id: string;
  personName: string;
  vulnerabilityType: string;
  description: string;
  supportRequired: string;
  notes: string;
  status: 'Active' | 'Inactive';
  dateRecorded: string;
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

interface RiskAssessment {
  id: string;
  personName: string;
  assessmentType: string;
  dateCompleted: string;
  score: string;
  riskProfile: string;
  assessor: string;
  notes?: string;
  historicalScores?: Array<{
    date: string;
    score: string;
    riskProfile: string;
  }>;
}

interface ClientManagementItem {
  id: string;
  personName: string;
  itemType: string;
  description: string;
  value?: string;
  date?: string;
  notes?: string;
}

interface MeetingSchedule {
  id: string;
  expectedMonths: string[];
  completedMeetings: Array<{
    month: string;
    date: string;
    type: string;
  }>;
  lastFeeAgreementDate: string;
  clientStartDate: string;
  privacyDeclarationDate: string;
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
  }
];

const sampleHealth: HealthInfo[] = [
  {
    id: '1',
    personName: 'James Mitchell',
    smoker: false,
    conditions: 'Mild Hypertension',
    medications: 'Amlodipine 5mg',
    notes: 'Annual health reviews up to date. Maintains active lifestyle.',
    status: 'Active',
    dateRecorded: '15/03/2024'
  },
  {
    id: '2',
    personName: 'Sarah Mitchell',
    smoker: false,
    conditions: 'Type 2 Diabetes',
    medications: 'Metformin 500mg',
    notes: 'Well-controlled diabetes. Regular check-ups with GP.',
    status: 'Active',
    dateRecorded: '22/03/2024'
  },
  {
    id: '3',
    personName: 'James Mitchell',
    smoker: true,
    conditions: 'None',
    medications: 'None',
    notes: 'Quit smoking in 2019.',
    status: 'Inactive',
    dateRecorded: '10/05/2019'
  }
];

const sampleVulnerability: VulnerabilityInfo[] = [
  {
    id: '1',
    personName: 'Sarah Mitchell',
    vulnerabilityType: 'Language Barrier',
    description: 'Prefers communication in English with technical terms explained',
    supportRequired: 'Clear explanations of financial terminology',
    notes: 'Client appreciates written summaries after meetings.',
    status: 'Active',
    dateRecorded: '01/04/2023'
  },
  {
    id: '2',
    personName: 'James Mitchell',
    vulnerabilityType: 'Health',
    description: 'Recent diagnosis may affect decision-making capacity',
    supportRequired: 'Include spouse in all major decisions',
    notes: 'Medical condition being monitored. Regular reviews recommended.',
    status: 'Active',
    dateRecorded: '15/01/2024'
  },
  {
    id: '3',
    personName: 'James Mitchell',
    vulnerabilityType: 'Bereavement',
    description: 'Loss of parent in 2020',
    supportRequired: 'Extra time for decisions',
    notes: 'Client has recovered well. No longer requires additional support.',
    status: 'Inactive',
    dateRecorded: '20/08/2020'
  }
];

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
  }
];

const sampleRiskAssessments: RiskAssessment[] = [
  {
    id: '1',
    personName: 'James Mitchell',
    assessmentType: 'Attitude to Risk',
    dateCompleted: '12/03/2024',
    score: '6/10',
    riskProfile: 'Balanced',
    assessor: 'John Anderson',
    notes: 'Client comfortable with moderate risk. Understands volatility in equity markets.',
    historicalScores: [
      { date: '15/03/2023', score: '5/10', riskProfile: 'Cautious' },
      { date: '20/03/2022', score: '5/10', riskProfile: 'Cautious' },
      { date: '10/04/2021', score: '4/10', riskProfile: 'Cautious' }
    ]
  },
  {
    id: '2',
    personName: 'James Mitchell',
    assessmentType: 'Capacity for Loss',
    dateCompleted: '12/03/2024',
    score: 'High',
    riskProfile: 'Can afford losses',
    assessor: 'John Anderson',
    notes: 'Strong financial position with emergency fund and stable income.',
    historicalScores: [
      { date: '15/03/2023', score: 'High', riskProfile: 'Can afford losses' },
      { date: '20/03/2022', score: 'Medium', riskProfile: 'Moderate capacity' }
    ]
  },
  {
    id: '3',
    personName: 'Sarah Mitchell',
    assessmentType: 'Attitude to Risk',
    dateCompleted: '12/03/2024',
    score: '5/10',
    riskProfile: 'Cautious',
    assessor: 'John Anderson',
    notes: 'Prefers stability over growth. Conservative approach to investing.',
    historicalScores: [
      { date: '15/03/2023', score: '5/10', riskProfile: 'Cautious' },
      { date: '20/03/2022', score: '4/10', riskProfile: 'Cautious' }
    ]
  }
];

const sampleClientManagement: ClientManagementItem[] = [
  {
    id: '1',
    personName: 'James Mitchell',
    itemType: 'Fee Agreement',
    description: 'Annual Advisory Fee',
    value: '1.0% AUM',
    date: '01/04/2023',
    notes: 'Reviewed annually. Includes quarterly reviews and unlimited ad-hoc advice.'
  },
  {
    id: '2',
    personName: 'James Mitchell',
    itemType: 'Advisor',
    description: 'Primary Advisor: John Anderson',
    value: 'Senior Financial Planner',
    date: '15/06/2020',
    notes: 'DipPFS, CFP. Direct line: +44 20 7123 4567'
  },
  {
    id: '3',
    personName: 'Sarah Mitchell',
    itemType: 'Fee Agreement',
    description: 'Annual Advisory Fee',
    value: '1.0% AUM',
    date: '01/04/2023',
    notes: 'Joint fee agreement with spouse.'
  },
  {
    id: '4',
    personName: 'Sarah Mitchell',
    itemType: 'Advisor',
    description: 'Primary Advisor: John Anderson',
    value: 'Senior Financial Planner',
    date: '15/06/2020',
    notes: 'DipPFS, CFP. Direct line: +44 20 7123 4567'
  }
];

const sampleMeetingSchedule: MeetingSchedule = {
  id: '1',
  expectedMonths: ['March', 'September'],
  completedMeetings: [
    { month: 'March', date: '12/03/2024', type: 'Annual Review' }
  ],
  lastFeeAgreementDate: '01/04/2023',
  clientStartDate: '15/06/2020',
  privacyDeclarationDate: '15/06/2020'
};

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
  }
];

const ClientManagementSystem = () => {
  const [activeTab, setActiveTab] = useState('summary');
  const [activeSubTab, setActiveSubTab] = useState('people');
  const [activeHealthSubTab, setActiveHealthSubTab] = useState('health');
  const [expandedPersonId, setExpandedPersonId] = useState<string | null>(null);
  const [expandedManagementPersonId, setExpandedManagementPersonId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [detailType, setDetailType] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [editedItem, setEditedItem] = useState<any>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createStep, setCreateStep] = useState('people');
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null);
  const [editingPersonName, setEditingPersonName] = useState<string>('');
  
  const [people, setPeople] = useState<Person[]>(initialPeople);
  const [relationships, setRelationships] = useState<Relationship[]>(sampleRelationships);
  const [healthRecords, setHealthRecords] = useState<HealthInfo[]>(sampleHealth);
  const [vulnerabilityRecords, setVulnerabilityRecords] = useState<VulnerabilityInfo[]>(sampleVulnerability);
  const [documents, setDocuments] = useState<Document[]>(sampleDocuments);
  const [riskAssessments, setRiskAssessments] = useState<RiskAssessment[]>(sampleRiskAssessments);
  const [clientManagement, setClientManagement] = useState<ClientManagementItem[]>(sampleClientManagement);
  const [meetingSchedule, setMeetingSchedule] = useState<MeetingSchedule>(sampleMeetingSchedule);

  // New client group data
  const [newPeople, setNewPeople] = useState<Person[]>([]);
  const [newRelationships, setNewRelationships] = useState<Relationship[]>([]);
  const [newHealthRecords, setNewHealthRecords] = useState<HealthInfo[]>([]);
  const [newVulnerabilityRecords, setNewVulnerabilityRecords] = useState<VulnerabilityInfo[]>([]);
  const [newDocuments, setNewDocuments] = useState<Document[]>([]);
  const [newRiskAssessments, setNewRiskAssessments] = useState<RiskAssessment[]>([]);
  const [newClientManagement, setNewClientManagement] = useState<ClientManagementItem[]>([]);

  const [tempPerson, setTempPerson] = useState<Person>({
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
    { id: 'documents', label: 'Documents' },
    { id: 'risk', label: 'Risk' },
    { id: 'management', label: 'Client Management' }
  ];

  const createSteps = [
    { id: 'people', label: 'People', required: true },
    { id: 'relationships', label: 'Special Relationships', required: false },
    { id: 'health', label: 'Health & Vulnerability', required: false },
    { id: 'documents', label: 'Documents', required: false },
    { id: 'risk', label: 'Risk Assessments', required: false },
    { id: 'management', label: 'Client Management', required: false }
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

  const handleEditPersonName = (personId: string, currentName: string) => {
    setEditingPersonId(personId);
    setEditingPersonName(currentName);
  };

  const handleSavePersonName = (personId: string) => {
    setPeople(people.map(p => p.id === personId ? {...p, name: editingPersonName} : p));
    setEditingPersonId(null);
    setEditingPersonName('');
  };

  const handleCancelPersonName = () => {
    setEditingPersonId(null);
    setEditingPersonName('');
  };

  const resetCreateModal = () => {
    setNewPeople([]);
    setNewRelationships([]);
    setNewHealthRecords([]);
    setNewVulnerabilityRecords([]);
    setNewDocuments([]);
    setNewRiskAssessments([]);
    setNewClientManagement([]);
    setTempPerson({
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
    setCreateStep('people');
  };

  const handleCreateClientGroup = () => {
    // Add all new items to main lists
    setPeople([...people, ...newPeople]);
    setRelationships([...relationships, ...newRelationships]);
    setHealthRecords([...healthRecords, ...newHealthRecords]);
    setVulnerabilityRecords([...vulnerabilityRecords, ...newVulnerabilityRecords]);
    setDocuments([...documents, ...newDocuments]);
    setRiskAssessments([...riskAssessments, ...newRiskAssessments]);
    setClientManagement([...clientManagement, ...newClientManagement]);
    
    setShowCreateModal(false);
    resetCreateModal();
  };

  const addPersonToNew = () => {
    if (tempPerson.name && tempPerson.relationship && tempPerson.dateOfBirth && tempPerson.age) {
      const id = `temp-${Date.now()}`;
      setNewPeople([...newPeople, { ...tempPerson, id }]);
      setTempPerson({
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
    }
  };

  const removePersonFromNew = (id: string) => {
    setNewPeople(newPeople.filter(p => p.id !== id));
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
              {detailType === 'health' && 'Health Details'}
              {detailType === 'vulnerability' && 'Vulnerability Details'}
              {detailType === 'document' && 'Document Details'}
              {detailType === 'risk' && 'Risk Assessment Details'}
              {detailType === 'management' && 'Client Management Details'}
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

            {detailType === 'health' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Person Name</label>
                    <p className="text-gray-900">{currentItem.personName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      currentItem.status === 'Active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {currentItem.status}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date Recorded</label>
                    <p className="text-gray-900">{currentItem.dateRecorded}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Smoking Status</label>
                    <p className="text-gray-900">{currentItem.smoker ? 'Smoker' : 'Non-smoker'}</p>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Health Conditions</label>
                    <p className="text-gray-900">{currentItem.conditions}</p>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Medications</label>
                    <p className="text-gray-900">{currentItem.medications}</p>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <p className="text-gray-900">{currentItem.notes}</p>
                </div>
              </div>
            )}

            {detailType === 'vulnerability' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Person Name</label>
                    <p className="text-gray-900">{currentItem.personName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      currentItem.status === 'Active'
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {currentItem.status}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Vulnerability Type</label>
                    <p className="text-gray-900">{currentItem.vulnerabilityType}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date Recorded</label>
                    <p className="text-gray-900">{currentItem.dateRecorded}</p>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <p className="text-gray-900">{currentItem.description}</p>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Support Required</label>
                    <p className="text-gray-900">{currentItem.supportRequired}</p>
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

            {detailType === 'risk' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Person Name</label>
                    <p className="text-gray-900">{currentItem.personName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Assessment Type</label>
                    <p className="text-gray-900">{currentItem.assessmentType}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date Completed</label>
                    <p className="text-gray-900">{currentItem.dateCompleted}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Current Score</label>
                    <p className="text-gray-900 font-semibold text-lg">{currentItem.score}</p>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Current Risk Profile</label>
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                      {currentItem.riskProfile}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Assessor</label>
                    <p className="text-gray-900">{currentItem.assessor}</p>
                  </div>
                </div>

                {currentItem.historicalScores && currentItem.historicalScores.length > 0 && (
                  <div className="border-t pt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-3">Historical Scores</label>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <table className="w-full">
                        <thead className="border-b border-gray-200">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Date</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Score</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-700">Risk Profile</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {currentItem.historicalScores.map((historical: any, index: number) => (
                            <tr key={index}>
                              <td className="px-3 py-2 text-sm text-gray-900">{historical.date}</td>
                              <td className="px-3 py-2 text-sm text-gray-900 font-medium">{historical.score}</td>
                              <td className="px-3 py-2">
                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                                  {historical.riskProfile}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <p className="text-gray-900">{currentItem.notes}</p>
                </div>
              </div>
            )}

            {detailType === 'management' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Person Name</label>
                    <p className="text-gray-900">{currentItem.personName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Item Type</label>
                    <p className="text-gray-900">{currentItem.itemType}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                    <p className="text-gray-900">{currentItem.date}</p>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <p className="text-gray-900">{currentItem.description}</p>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
                    <p className="text-gray-900 font-medium">{currentItem.value}</p>
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
        <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto m-4">
          <div className="sticky top-0 bg-white border-b px-6 py-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-900">Create New Client Group</h3>
              <button onClick={() => { setShowCreateModal(false); resetCreateModal(); }} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>
            
            {/* Step navigation */}
            <div className="flex gap-2 overflow-x-auto">
              {createSteps.map(step => (
                <button
                  key={step.id}
                  onClick={() => setCreateStep(step.id)}
                  className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                    createStep === step.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {step.label}
                  {step.required && <span className="text-red-500 ml-1">*</span>}
                </button>
              ))}
            </div>
          </div>
          
          <div className="p-6">
            {/* People Step */}
            {createStep === 'people' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-lg font-semibold mb-4 text-gray-900">Add People <span className="text-red-500">*</span></h4>
                  {newPeople.length > 0 && (
                    <div className="mb-4 space-y-2">
                      {newPeople.map(person => (
                        <div key={person.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                          <div>
                            <p className="font-medium">{person.name}</p>
                            <p className="text-sm text-gray-600">{person.relationship} • {person.dateOfBirth}</p>
                          </div>
                          <button
                            onClick={() => removePersonFromNew(person.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                        <input 
                          type="text" 
                          value={tempPerson.name}
                          onChange={(e) => setTempPerson({...tempPerson, name: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          placeholder="John Smith"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Relationship *</label>
                        <input 
                          type="text" 
                          value={tempPerson.relationship}
                          onChange={(e) => setTempPerson({...tempPerson, relationship: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          placeholder="Primary Client / Spouse"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth *</label>
                        <input 
                          type="text" 
                          value={tempPerson.dateOfBirth}
                          onChange={(e) => setTempPerson({...tempPerson, dateOfBirth: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          placeholder="DD/MM/YYYY"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Age *</label>
                        <input 
                          type="number" 
                          value={tempPerson.age || ''}
                          onChange={(e) => setTempPerson({...tempPerson, age: parseInt(e.target.value) || 0})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          placeholder="45"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input 
                          type="email" 
                          value={tempPerson.email}
                          onChange={(e) => setTempPerson({...tempPerson, email: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          placeholder="john.smith@email.com"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Mobile</label>
                        <input 
                          type="text" 
                          value={tempPerson.mobile}
                          onChange={(e) => setTempPerson({...tempPerson, mobile: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          placeholder="+44 7700 900000"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">National Insurance</label>
                        <input 
                          type="text" 
                          value={tempPerson.nationalInsurance}
                          onChange={(e) => setTempPerson({...tempPerson, nationalInsurance: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          placeholder="AB123456C"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                        <input 
                          type="text" 
                          value={tempPerson.address}
                          onChange={(e) => setTempPerson({...tempPerson, address: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          placeholder="123 Main Street, London, SW1A 1AA"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                        <textarea 
                          value={tempPerson.notes}
                          onChange={(e) => setTempPerson({...tempPerson, notes: e.target.value})}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          placeholder="Additional information..."
                        />
                      </div>
                    </div>
                    <button
                      onClick={addPersonToNew}
                      disabled={!tempPerson.name || !tempPerson.relationship || !tempPerson.dateOfBirth || !tempPerson.age}
                      className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus size={16} />
                      Add Person
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Other steps - simplified placeholders for now */}
            {createStep !== 'people' && (
              <div className="text-center py-12 text-gray-500">
                <p className="text-lg mb-2">{createSteps.find(s => s.id === createStep)?.label}</p>
                <p className="text-sm">This section is optional. You can add items here or skip to create the client group.</p>
              </div>
            )}
          </div>

          <div className="border-t px-6 py-4 flex justify-between">
            <div className="text-sm text-gray-600">
              {newPeople.length} {newPeople.length === 1 ? 'person' : 'people'} added
              {newPeople.length === 0 && <span className="text-red-500 ml-2">At least 1 person required</span>}
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => { setShowCreateModal(false); resetCreateModal(); }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateClientGroup}
                disabled={newPeople.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <UserPlus size={16} />
                Create Client Group
              </button>
            </div>
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
                      {editingPersonId === person.id ? (
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="text"
                            value={editingPersonName}
                            onChange={(e) => setEditingPersonName(e.target.value)}
                            className="text-xl font-semibold text-gray-900 px-3 py-1 border border-gray-300 rounded-lg flex-1"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSavePersonName(person.id)}
                            className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                          >
                            <Save size={18} />
                          </button>
                          <button
                            onClick={handleCancelPersonName}
                            className="p-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                          >
                            <X size={18} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 flex-1">
                          <h3 className="text-xl font-semibold text-gray-900">{person.name}</h3>
                          <button
                            onClick={() => handleEditPersonName(person.id, person.name)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Edit2 size={18} />
                          </button>
                        </div>
                      )}
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
                <div className="flex border-b overflow-x-auto">
                  {subTabs.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveSubTab(tab.id)}
                      className={`px-6 py-3 font-medium transition-colors whitespace-nowrap ${
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
                        {relationships.map(rel => (
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
                    
                    {/* Health/Vulnerability Sub-tabs */}
                    <div className="flex gap-2 mb-4">
                      <button
                        onClick={() => setActiveHealthSubTab('health')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                          activeHealthSubTab === 'health'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        Health
                      </button>
                      <button
                        onClick={() => setActiveHealthSubTab('vulnerability')}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                          activeHealthSubTab === 'vulnerability'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        Vulnerability
                      </button>
                    </div>

                    {/* Health Content */}
                    {activeHealthSubTab === 'health' && (
                      <div>
                        <table className="w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Person Name</th>
                              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Smoker</th>
                              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Conditions</th>
                              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                              <th className="px-4 py-3"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {healthRecords
                              .sort((a, b) => {
                                if (a.status === 'Active' && b.status === 'Inactive') return -1;
                                if (a.status === 'Inactive' && b.status === 'Active') return 1;
                                return 0;
                              })
                              .map((record, index, array) => {
                                const showDivider = index > 0 && array[index - 1].status === 'Active' && record.status === 'Inactive';
                                return (
                                  <React.Fragment key={record.id}>
                                    {showDivider && (
                                      <tr className="bg-gray-100">
                                        <td colSpan={5} className="px-4 py-2 text-sm font-medium text-gray-600">
                                          Past Health Records
                                        </td>
                                      </tr>
                                    )}
                                    <tr 
                                      className={`hover:bg-gray-50 cursor-pointer ${record.status === 'Inactive' ? 'opacity-60' : ''}`}
                                      onClick={() => handleItemClick(record, 'health')}
                                    >
                                      <td className="px-4 py-3 text-sm text-gray-900">{record.personName}</td>
                                      <td className="px-4 py-3 text-sm text-gray-900">{record.smoker ? 'Yes' : 'No'}</td>
                                      <td className="px-4 py-3 text-sm text-gray-900">{record.conditions}</td>
                                      <td className="px-4 py-3">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                          record.status === 'Active'
                                            ? 'bg-green-100 text-green-800'
                                            : 'bg-gray-100 text-gray-600'
                                        }`}>
                                          {record.status}
                                        </span>
                                      </td>
                                      <td className="px-4 py-3 text-sm text-blue-600">
                                        <ChevronRight size={18} />
                                      </td>
                                    </tr>
                                  </React.Fragment>
                                );
                              })}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Vulnerability Content */}
                    {activeHealthSubTab === 'vulnerability' && (
                      <div className="space-y-4">
                        {people.map(person => {
                          const personVulnerabilities = vulnerabilityRecords.filter(v => v.personName === person.name);
                          const activeCount = personVulnerabilities.filter(v => v.status === 'Active').length;
                          const inactiveCount = personVulnerabilities.filter(v => v.status === 'Inactive').length;
                          const isExpanded = expandedPersonId === person.id;

                          return (
                            <div key={person.id} className="border rounded-lg overflow-hidden">
                              <div 
                                className="bg-white p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                                onClick={() => setExpandedPersonId(isExpanded ? null : person.id)}
                              >
                                <div className="flex justify-between items-center">
                                  <div className="flex items-center gap-4">
                                    <div>
                                      <h4 className="text-lg font-semibold text-gray-900">{person.name}</h4>
                                      <p className="text-sm text-gray-600">{person.relationship}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-6">
                                    <div className="text-center">
                                      <div className="text-2xl font-bold text-orange-600">{activeCount}</div>
                                      <div className="text-xs text-gray-600">Active</div>
                                    </div>
                                    <div className="text-center">
                                      <div className="text-2xl font-bold text-gray-400">{inactiveCount}</div>
                                      <div className="text-xs text-gray-600">Inactive</div>
                                    </div>
                                    <ChevronRight 
                                      size={24} 
                                      className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                                    />
                                  </div>
                                </div>
                              </div>

                              {isExpanded && personVulnerabilities.length > 0 && (
                                <div className="border-t bg-gray-50 p-4">
                                  <table className="w-full">
                                    <thead className="bg-gray-100">
                                      <tr>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Type</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Description</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Date Recorded</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Status</th>
                                        <th className="px-4 py-2"></th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 bg-white">
                                      {personVulnerabilities
                                        .sort((a, b) => {
                                          if (a.status === 'Active' && b.status === 'Inactive') return -1;
                                          if (a.status === 'Inactive' && b.status === 'Active') return 1;
                                          return 0;
                                        })
                                        .map((record, index, array) => {
                                          const showDivider = index > 0 && array[index - 1].status === 'Active' && record.status === 'Inactive';
                                          return (
                                            <React.Fragment key={record.id}>
                                              {showDivider && (
                                                <tr className="bg-gray-100">
                                                  <td colSpan={5} className="px-4 py-2 text-xs font-medium text-gray-600">
                                                    Past Vulnerabilities
                                                  </td>
                                                </tr>
                                              )}
                                              <tr 
                                                className={`hover:bg-gray-50 cursor-pointer ${record.status === 'Inactive' ? 'opacity-60' : ''}`}
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleItemClick(record, 'vulnerability');
                                                }}
                                              >
                                                <td className="px-4 py-2 text-sm text-gray-900">{record.vulnerabilityType}</td>
                                                <td className="px-4 py-2 text-sm text-gray-900">{record.description}</td>
                                                <td className="px-4 py-2 text-sm text-gray-900">{record.dateRecorded}</td>
                                                <td className="px-4 py-2">
                                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                    record.status === 'Active'
                                                      ? 'bg-orange-100 text-orange-800'
                                                      : 'bg-gray-100 text-gray-600'
                                                  }`}>
                                                    {record.status}
                                                  </span>
                                                </td>
                                                <td className="px-4 py-2 text-sm text-blue-600">
                                                  <ChevronRight size={16} />
                                                </td>
                                              </tr>
                                            </React.Fragment>
                                          );
                                        })}
                                    </tbody>
                                  </table>
                                </div>
                              )}

                              {isExpanded && personVulnerabilities.length === 0 && (
                                <div className="border-t bg-gray-50 p-6 text-center text-gray-500">
                                  No vulnerabilities recorded for this person
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
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
                        {documents.map(doc => (
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

                {activeSubTab === 'risk' && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-gray-900">Risk Assessments</h3>
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Person Name</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Assessment Type</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Date Completed</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Current Score</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Risk Profile</th>
                          <th className="px-4 py-3"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {riskAssessments.map(assessment => (
                          <tr 
                            key={assessment.id} 
                            className="hover:bg-gray-50 cursor-pointer"
                            onClick={() => handleItemClick(assessment, 'risk')}
                          >
                            <td className="px-4 py-3 text-sm text-gray-900">{assessment.personName}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{assessment.assessmentType}</td>
                            <td className="px-4 py-3 text-sm text-gray-900">{assessment.dateCompleted}</td>
                            <td className="px-4 py-3 text-sm text-gray-900 font-medium">{assessment.score}</td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {assessment.riskProfile}
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

                {activeSubTab === 'management' && (
                  <div className="space-y-6">
                    {/* Meeting Schedule Section */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
                      <h3 className="text-lg font-semibold mb-4 text-gray-900">Meeting Schedule & Key Dates</h3>
                      
                      <div className="grid grid-cols-2 gap-6 mb-6">
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Client Start Date</label>
                          <p className="text-lg font-semibold text-gray-900">{meetingSchedule.clientStartDate}</p>
                        </div>
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Last Fee Agreement Date</label>
                          <p className="text-lg font-semibold text-gray-900">{meetingSchedule.lastFeeAgreementDate}</p>
                        </div>
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Privacy Declaration Date</label>
                          <p className="text-lg font-semibold text-gray-900">{meetingSchedule.privacyDeclarationDate}</p>
                        </div>
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Expected Meeting Months</label>
                          <p className="text-lg font-semibold text-blue-700">{meetingSchedule.expectedMonths.join(', ')}</p>
                        </div>
                      </div>

                      <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <h4 className="text-md font-semibold text-gray-900 mb-3">2024 Meetings Status</h4>
                        <div className="space-y-2">
                          {meetingSchedule.expectedMonths.map(month => {
                            const meeting = meetingSchedule.completedMeetings.find(m => m.month === month);
                            return (
                              <div key={month} className="flex justify-between items-center py-2 border-b last:border-b-0">
                                <span className="font-medium text-gray-700">{month}</span>
                                {meeting ? (
                                  <div className="flex items-center gap-2">
                                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                                      ✓ Completed
                                    </span>
                                    <span className="text-sm text-gray-600">{meeting.date} - {meeting.type}</span>
                                  </div>
                                ) : (
                                  <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm font-medium">
                                    Not completed
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Client Management by Person */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4 text-gray-900">Individual Client Management</h3>
                      <div className="space-y-4">
                        {people.map(person => {
                          const personManagement = clientManagement.filter(m => m.personName === person.name);
                          const isExpanded = expandedManagementPersonId === person.id;

                          return (
                            <div key={person.id} className="border rounded-lg overflow-hidden">
                              <div 
                                className="bg-white p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                                onClick={() => setExpandedManagementPersonId(isExpanded ? null : person.id)}
                              >
                                <div className="flex justify-between items-center">
                                  <div className="flex items-center gap-4">
                                    <div>
                                      <h4 className="text-lg font-semibold text-gray-900">{person.name}</h4>
                                      <p className="text-sm text-gray-600">{person.relationship}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-6">
                                    <div className="text-center">
                                      <div className="text-2xl font-bold text-blue-600">{personManagement.length}</div>
                                      <div className="text-xs text-gray-600">Items</div>
                                    </div>
                                    <ChevronRight 
                                      size={24} 
                                      className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                                    />
                                  </div>
                                </div>
                              </div>

                              {isExpanded && personManagement.length > 0 && (
                                <div className="border-t bg-gray-50 p-4">
                                  <table className="w-full">
                                    <thead className="bg-gray-100">
                                      <tr>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Item Type</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Description</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Value</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Date</th>
                                        <th className="px-4 py-2"></th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 bg-white">
                                      {personManagement.map(item => (
                                        <tr 
                                          key={item.id}
                                          className="hover:bg-gray-50 cursor-pointer"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleItemClick(item, 'management');
                                          }}
                                        >
                                          <td className="px-4 py-2 text-sm text-gray-900">{item.itemType}</td>
                                          <td className="px-4 py-2 text-sm text-gray-900">{item.description}</td>
                                          <td className="px-4 py-2 text-sm text-gray-900 font-medium">{item.value}</td>
                                          <td className="px-4 py-2 text-sm text-gray-900">{item.date}</td>
                                          <td className="px-4 py-2 text-sm text-blue-600">
                                            <ChevronRight size={16} />
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}

                              {isExpanded && personManagement.length === 0 && (
                                <div className="border-t bg-gray-50 p-6 text-center text-gray-500">
                                  No management items for this person
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
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

      {/* Create Client Group Modal */}
      {renderCreateModal()}
    </div>
  );
};

export default ClientManagementSystem;