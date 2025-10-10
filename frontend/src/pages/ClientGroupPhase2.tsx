import React, { useState } from 'react';
import {
  UserIcon,
  DocumentTextIcon,
  CurrencyPoundIcon,
  BanknotesIcon,
  ShieldCheckIcon,
  FlagIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

// ============================================================================
// TYPES
// ============================================================================

interface Person {
  id: string;
  name: string;
  relationship: string;
  dateOfBirth: string;
  age: number;
  email: string;
  mobile: string;
}

interface SpecialRelationship {
  id: string;
  name: string;
  type: string;
  relationship: string;
  contact: string;
  notes: string;
}

interface HealthItem {
  id: string;
  personId: string;
  condition: string;
  status: 'Active' | 'Historical';
  dateRecorded: string;
  notes: string;
}

interface VulnerabilityItem {
  id: string;
  personId: string;
  type: string;
  status: 'Active' | 'Historical';
  dateRecorded: string;
  description: string;
}

interface Document {
  id: string;
  type: string;
  name: string;
  dateCreated: string;
  lastReviewed: string;
  location: string;
}

interface RiskAssessment {
  id: string;
  personName: string;
  type: string;
  score: string;
  riskProfile: string;
  dateCompleted: string;
  status: 'Current' | 'Historical';
}

interface Asset {
  id: string;
  type: string;
  description: string;
  value: number;
  owner: string;
}

interface Liability {
  id: string;
  type: string;
  description: string;
  amount: number;
  monthlyPayment: number;
}

interface Income {
  id: string;
  source: string;
  amount: number;
  frequency: string;
  owner: string;
}

interface Expenditure {
  id: string;
  category: string;
  amount: number;
  frequency: string;
  essential: boolean;
}

interface Product {
  id: string;
  type: string;
  provider: string;
  value: number;
  owner: string;
}

interface Objective {
  id: string;
  title: string;
  description: string;
  targetDate: string;
  priority: 'High' | 'Medium' | 'Low';
  status: 'In Progress' | 'Completed' | 'Not Started';
}

interface Meeting {
  month: string;
  expectedDate: string;
  actualDate?: string;
  type: string;
  status: 'Scheduled' | 'Completed' | 'Missed';
}

// ============================================================================
// SAMPLE DATA
// ============================================================================

const samplePeople: Person[] = [
  { id: '1', name: 'James Mitchell', relationship: 'Husband', dateOfBirth: '15/06/1975', age: 49, email: 'james.m@email.com', mobile: '07700 900 123' },
  { id: '2', name: 'Sarah Mitchell', relationship: 'Wife', dateOfBirth: '22/09/1977', age: 47, email: 'sarah.m@email.com', mobile: '07700 900 124' },
  { id: '3', name: 'Emma Mitchell', relationship: 'Daughter', dateOfBirth: '10/03/2005', age: 19, email: 'emma.m@email.com', mobile: '07700 900 125' },
];

const sampleRelationships: SpecialRelationship[] = [
  { id: '1', name: 'Robert Thompson', type: 'Accountant', relationship: 'Professional', contact: '020 7123 4567', notes: 'Handles tax returns annually' },
  { id: '2', name: 'Mary Johnson', type: 'Dependent', relationship: 'Mother-in-law', contact: '07700 900 200', notes: 'Requires financial support' },
];

const sampleHealthItems: HealthItem[] = [
  { id: '1', personId: '1', condition: 'Type 2 Diabetes', status: 'Active', dateRecorded: '01/2023', notes: 'Well controlled with medication' },
  { id: '2', personId: '1', condition: 'High Blood Pressure', status: 'Historical', dateRecorded: '06/2020', notes: 'Resolved through lifestyle changes' },
  { id: '3', personId: '2', condition: 'Asthma', status: 'Active', dateRecorded: '03/2022', notes: 'Mild, uses inhaler as needed' },
];

const sampleVulnerabilities: VulnerabilityItem[] = [
  { id: '1', personId: '2', type: 'Health Related', status: 'Active', dateRecorded: '01/2024', description: 'Recent health diagnosis affecting decision-making capacity' },
  { id: '2', personId: '1', type: 'Bereavement', status: 'Historical', dateRecorded: '08/2020', description: 'Loss of parent - now recovered' },
];

const sampleDocuments: Document[] = [
  { id: '1', type: 'Will', name: 'Last Will & Testament - James Mitchell', dateCreated: '15/01/2023', lastReviewed: '15/01/2024', location: 'Office Safe - Box 42A' },
  { id: '2', type: 'Will', name: 'Last Will & Testament - Sarah Mitchell', dateCreated: '15/01/2023', lastReviewed: '15/01/2024', location: 'Office Safe - Box 42A' },
  { id: '3', type: 'LPA', name: 'Lasting Power of Attorney - Health & Welfare', dateCreated: '20/03/2023', lastReviewed: '20/03/2024', location: 'Office Safe - Box 42A' },
];

const sampleRiskAssessments: RiskAssessment[] = [
  { id: '1', personName: 'James Mitchell', type: 'Attitude to Risk', score: '6/10', riskProfile: 'Balanced', dateCompleted: '12/03/2024', status: 'Current' },
  { id: '2', personName: 'Sarah Mitchell', type: 'Attitude to Risk', score: '5/10', riskProfile: 'Cautious', dateCompleted: '12/03/2024', status: 'Current' },
  { id: '3', personName: 'James Mitchell', type: 'Attitude to Risk', score: '5/10', riskProfile: 'Cautious', dateCompleted: '15/03/2023', status: 'Historical' },
];

const sampleAssets: Asset[] = [
  { id: '1', type: 'Property', description: 'Primary Residence - Richmond', value: 875000, owner: 'Joint' },
  { id: '2', type: 'ISA', description: 'Stocks & Shares ISA', value: 156000, owner: 'James Mitchell' },
  { id: '3', type: 'Pension', description: 'Defined Contribution Pension', value: 425000, owner: 'James Mitchell' },
];

const sampleLiabilities: Liability[] = [
  { id: '1', type: 'Mortgage', description: 'Primary Residence Mortgage', amount: 185000, monthlyPayment: 1250 },
  { id: '2', type: 'Loan', description: 'Car Finance', amount: 15000, monthlyPayment: 350 },
];

const sampleIncome: Income[] = [
  { id: '1', source: 'Employment Salary', amount: 75000, frequency: 'Annual', owner: 'James Mitchell' },
  { id: '2', source: 'Employment Salary', amount: 45000, frequency: 'Annual', owner: 'Sarah Mitchell' },
];

const sampleExpenditure: Expenditure[] = [
  { id: '1', category: 'Mortgage', amount: 1250, frequency: 'Monthly', essential: true },
  { id: '2', category: 'Utilities', amount: 350, frequency: 'Monthly', essential: true },
  { id: '3', category: 'Holidays', amount: 5000, frequency: 'Annual', essential: false },
];

const sampleProducts: Product[] = [
  { id: '1', type: 'Life Insurance', provider: 'Legal & General', value: 500000, owner: 'James Mitchell' },
  { id: '2', type: 'Critical Illness', provider: 'Aviva', value: 250000, owner: 'Sarah Mitchell' },
];

const sampleObjectives: Objective[] = [
  { id: '1', title: 'Retirement Planning', description: 'Build sufficient pension pot for retirement at age 65', targetDate: '2040', priority: 'High', status: 'In Progress' },
  { id: '2', title: 'University Funding', description: 'Fund Emma\'s university education', targetDate: '2026', priority: 'High', status: 'In Progress' },
  { id: '3', title: 'Mortgage Free', description: 'Pay off primary residence mortgage', targetDate: '2035', priority: 'Medium', status: 'In Progress' },
];

const sampleMeetings: Meeting[] = [
  { month: 'March 2024', expectedDate: '15/03/2024', actualDate: '12/03/2024', type: 'Annual Review', status: 'Completed' },
  { month: 'September 2024', expectedDate: '15/09/2024', type: 'Mid-Year Check-in', status: 'Scheduled' },
  { month: 'March 2023', expectedDate: '15/03/2023', actualDate: '15/03/2023', type: 'Annual Review', status: 'Completed' },
];

const clientManagementInfo = {
  lastFeeAgreement: '01/04/2023',
  currentFee: '1.0% AUM',
  feeValue: 15600,
  nextReviewDate: '01/04/2025',
  clientSince: '15/06/2020',
  primaryAdvisor: 'John Anderson',
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const ClientGroupPhase2: React.FC = () => {
  const [activeTab, setActiveTab] = useState('summary');
  const [activeSubTab, setActiveSubTab] = useState('people');
  const [activeHealthTab, setActiveHealthTab] = useState('health');
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);

  const toggleCardExpanded = (cardId: string) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(cardId)) {
      newExpanded.delete(cardId);
    } else {
      newExpanded.add(cardId);
    }
    setExpandedCards(newExpanded);
  };

  const handleItemClick = (item: any) => {
    setSelectedItem(item);
    setIsEditing(false);
  };

  const closeDetail = () => {
    setSelectedItem(null);
    setIsEditing(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount);
  };

  const mainTabs = [
    { id: 'summary', label: 'Summary', icon: UserIcon },
    { id: 'basic', label: 'Basic Details', icon: DocumentTextIcon },
    { id: 'assets', label: 'Assets & Liabilities', icon: CurrencyPoundIcon },
    { id: 'income', label: 'Income & Expenditure', icon: BanknotesIcon },
    { id: 'products', label: 'Other Products', icon: ShieldCheckIcon },
    { id: 'objectives', label: 'Aims & Objectives', icon: FlagIcon },
  ];

  const basicDetailsTabs = [
    { id: 'people', label: 'People' },
    { id: 'relationships', label: 'Special Relationships' },
    { id: 'health', label: 'Health & Vulnerability' },
    { id: 'documents', label: 'Documents' },
    { id: 'risk', label: 'Risk' },
    { id: 'management', label: 'Client Management' },
  ];

  // Calculate health/vulnerability counts
  const getHealthCounts = (personId: string) => {
    const items = sampleHealthItems.filter(h => h.personId === personId);
    return {
      active: items.filter(h => h.status === 'Active').length,
      historical: items.filter(h => h.status === 'Historical').length,
    };
  };

  const getVulnerabilityCounts = (personId: string) => {
    const items = sampleVulnerabilities.filter(v => v.personId === personId);
    return {
      active: items.filter(v => v.status === 'Active').length,
      historical: items.filter(v => v.status === 'Historical').length,
    };
  };

  // ============================================================================
  // RENDER: Detail Modal
  // ============================================================================

  const renderDetailModal = () => {
    if (!selectedItem) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
            <h3 className="text-xl font-semibold text-gray-900">Details</h3>
            <div className="flex items-center gap-2">
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <PencilIcon className="w-4 h-4" />
                  Edit
                </button>
              )}
              {isEditing && (
                <>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    <CheckIcon className="w-4 h-4" />
                    Save
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </>
              )}
              <button onClick={closeDetail} className="text-gray-500 hover:text-gray-700">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(selectedItem).map(([key, value]) => {
                if (key === 'id') return null;
                return (
                  <div key={key} className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        defaultValue={String(value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    ) : (
                      <p className="text-gray-900">{String(value)}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ============================================================================
  // RENDER: Summary Tab
  // ============================================================================

  const renderSummary = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Client Group Overview</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-600">Members</p>
            <p className="text-2xl font-bold text-gray-900">{samplePeople.length}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Assets</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(sampleAssets.reduce((sum, a) => sum + a.value, 0))}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Client Since</p>
            <p className="text-2xl font-bold text-gray-900">{clientManagementInfo.clientSince}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-4">
          <button className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left">
            <p className="font-semibold">Schedule Meeting</p>
            <p className="text-sm text-gray-600">Next review due: {clientManagementInfo.nextReviewDate}</p>
          </button>
          <button className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left">
            <p className="font-semibold">Generate Report</p>
            <p className="text-sm text-gray-600">Create client review report</p>
          </button>
        </div>
      </div>
    </div>
  );

  // ============================================================================
  // RENDER: People Table
  // ============================================================================

  const renderPeopleTable = () => (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Relationship</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Age</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
            <th className="px-6 py-3"></th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {samplePeople.map((person) => (
            <tr key={person.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleItemClick(person)}>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{person.name}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{person.relationship}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{person.age}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{person.email}</td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                <ChevronRightIcon className="w-5 h-5 text-gray-400" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // ============================================================================
  // RENDER: Special Relationships
  // ============================================================================

  const renderRelationships = () => (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
            <th className="px-6 py-3"></th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sampleRelationships.map((rel) => (
            <tr key={rel.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleItemClick(rel)}>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{rel.name}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{rel.type}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{rel.contact}</td>
              <td className="px-6 py-4 text-sm text-gray-500">{rel.notes}</td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                <ChevronRightIcon className="w-5 h-5 text-gray-400" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // ============================================================================
  // RENDER: Health & Vulnerability Cards
  // ============================================================================

  const renderHealthVulnerability = () => (
    <div className="space-y-4">
      <div className="flex gap-4 border-b">
        <button
          onClick={() => setActiveHealthTab('health')}
          className={`px-4 py-2 font-medium ${
            activeHealthTab === 'health'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Health
        </button>
        <button
          onClick={() => setActiveHealthTab('vulnerability')}
          className={`px-4 py-2 font-medium ${
            activeHealthTab === 'vulnerability'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Vulnerability
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {samplePeople.map((person) => {
          const counts = activeHealthTab === 'health'
            ? getHealthCounts(person.id)
            : getVulnerabilityCounts(person.id);
          const items = activeHealthTab === 'health'
            ? sampleHealthItems.filter(h => h.personId === person.id)
            : sampleVulnerabilities.filter(v => v.personId === person.id);
          const isExpanded = expandedCards.has(`${activeHealthTab}-${person.id}`);

          return (
            <div key={person.id} className="bg-white rounded-lg shadow">
              <div
                className="p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => toggleCardExpanded(`${activeHealthTab}-${person.id}`)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold text-gray-900">{person.name}</h4>
                    <p className="text-sm text-gray-500">{person.relationship}</p>
                  </div>
                  {isExpanded ? (
                    <ChevronDownIcon className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronRightIcon className="w-5 h-5 text-gray-400" />
                  )}
                </div>
                <div className="mt-3 flex gap-4">
                  <div>
                    <span className="text-2xl font-bold text-blue-600">{counts.active}</span>
                    <span className="text-sm text-gray-600 ml-1">Active</span>
                  </div>
                  <div>
                    <span className="text-2xl font-bold text-gray-400">{counts.historical}</span>
                    <span className="text-sm text-gray-600 ml-1">Historical</span>
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t px-4 py-3 bg-gray-50">
                  <div className="space-y-2">
                    {items.filter(i => i.status === 'Active').map((item) => (
                      <div
                        key={item.id}
                        className="p-3 bg-white rounded border border-gray-200 hover:border-blue-500 cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleItemClick(item);
                        }}
                      >
                        <p className="font-medium text-sm text-gray-900">
                          {activeHealthTab === 'health' ? (item as HealthItem).condition : (item as VulnerabilityItem).type}
                        </p>
                        <p className="text-xs text-gray-500">{item.dateRecorded}</p>
                        <span className="inline-block mt-1 px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
                          Active
                        </span>
                      </div>
                    ))}
                    {items.filter(i => i.status === 'Historical').length > 0 && (
                      <p className="text-xs font-medium text-gray-500 mt-4 mb-2">Historical</p>
                    )}
                    {items.filter(i => i.status === 'Historical').map((item) => (
                      <div
                        key={item.id}
                        className="p-3 bg-gray-100 rounded border border-gray-200 hover:border-blue-500 cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleItemClick(item);
                        }}
                      >
                        <p className="font-medium text-sm text-gray-700">
                          {activeHealthTab === 'health' ? (item as HealthItem).condition : (item as VulnerabilityItem).type}
                        </p>
                        <p className="text-xs text-gray-500">{item.dateRecorded}</p>
                        <span className="inline-block mt-1 px-2 py-1 bg-gray-200 text-gray-700 text-xs font-medium rounded">
                          Historical
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  // ============================================================================
  // RENDER: Documents
  // ============================================================================

  const renderDocuments = () => (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date Created</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Reviewed</th>
            <th className="px-6 py-3"></th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sampleDocuments.map((doc) => (
            <tr key={doc.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleItemClick(doc)}>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{doc.type}</td>
              <td className="px-6 py-4 text-sm text-gray-500">{doc.name}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{doc.dateCreated}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{doc.lastReviewed}</td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                <ChevronRightIcon className="w-5 h-5 text-gray-400" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // ============================================================================
  // RENDER: Risk Assessments
  // ============================================================================

  const renderRiskAssessments = () => {
    const currentAssessments = sampleRiskAssessments.filter(r => r.status === 'Current');
    const historicalAssessments = sampleRiskAssessments.filter(r => r.status === 'Historical');

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b">
            <h3 className="text-lg font-semibold">Current Assessments</h3>
          </div>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Person</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Risk Profile</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentAssessments.map((assessment) => (
                <tr key={assessment.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleItemClick(assessment)}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{assessment.personName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{assessment.type}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{assessment.score}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      assessment.riskProfile === 'Balanced'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {assessment.riskProfile}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{assessment.dateCompleted}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <ChevronRightIcon className="w-5 h-5 text-gray-400" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {historicalAssessments.length > 0 && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b">
              <h3 className="text-lg font-semibold text-gray-600">Historical Assessments</h3>
            </div>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Person</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Risk Profile</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {historicalAssessments.map((assessment) => (
                  <tr key={assessment.id} className="hover:bg-gray-50 cursor-pointer opacity-60" onClick={() => handleItemClick(assessment)}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{assessment.personName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{assessment.type}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{assessment.score}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                        {assessment.riskProfile}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{assessment.dateCompleted}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <ChevronRightIcon className="w-5 h-5 text-gray-400" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  // ============================================================================
  // RENDER: Client Management
  // ============================================================================

  const renderClientManagement = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Fee Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Last Fee Agreement</p>
            <p className="text-lg font-semibold text-gray-900">{clientManagementInfo.lastFeeAgreement}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Current Fee</p>
            <p className="text-lg font-semibold text-gray-900">{clientManagementInfo.currentFee}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Annual Fee Value</p>
            <p className="text-lg font-semibold text-gray-900">{formatCurrency(clientManagementInfo.feeValue)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Next Review Date</p>
            <p className="text-lg font-semibold text-gray-900">{clientManagementInfo.nextReviewDate}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b">
          <h3 className="text-lg font-semibold">Meeting Schedule</h3>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expected Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actual Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sampleMeetings.map((meeting, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{meeting.month}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{meeting.expectedDate}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{meeting.actualDate || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{meeting.type}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    meeting.status === 'Completed'
                      ? 'bg-green-100 text-green-800'
                      : meeting.status === 'Scheduled'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {meeting.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ============================================================================
  // RENDER: Assets & Liabilities
  // ============================================================================

  const renderAssetsLiabilities = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b">
          <h3 className="text-lg font-semibold">Assets</h3>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Owner</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Value</th>
              <th className="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sampleAssets.map((asset) => (
              <tr key={asset.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleItemClick(asset)}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{asset.type}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{asset.description}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{asset.owner}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-semibold">
                  {formatCurrency(asset.value)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                  <ChevronRightIcon className="w-5 h-5 text-gray-400" />
                </td>
              </tr>
            ))}
            <tr className="bg-gray-50 font-bold">
              <td colSpan={3} className="px-6 py-4 text-sm text-gray-900">Total Assets</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                {formatCurrency(sampleAssets.reduce((sum, a) => sum + a.value, 0))}
              </td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b">
          <h3 className="text-lg font-semibold">Liabilities</h3>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Monthly Payment</th>
              <th className="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sampleLiabilities.map((liability) => (
              <tr key={liability.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleItemClick(liability)}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{liability.type}</td>
                <td className="px-6 py-4 text-sm text-gray-500">{liability.description}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-semibold">
                  {formatCurrency(liability.amount)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                  {formatCurrency(liability.monthlyPayment)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                  <ChevronRightIcon className="w-5 h-5 text-gray-400" />
                </td>
              </tr>
            ))}
            <tr className="bg-gray-50 font-bold">
              <td colSpan={2} className="px-6 py-4 text-sm text-gray-900">Total Liabilities</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                {formatCurrency(sampleLiabilities.reduce((sum, l) => sum + l.amount, 0))}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                {formatCurrency(sampleLiabilities.reduce((sum, l) => sum + l.monthlyPayment, 0))}
              </td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="bg-blue-50 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-2">Net Worth</h3>
        <p className="text-3xl font-bold text-blue-900">
          {formatCurrency(
            sampleAssets.reduce((sum, a) => sum + a.value, 0) -
            sampleLiabilities.reduce((sum, l) => sum + l.amount, 0)
          )}
        </p>
      </div>
    </div>
  );

  // ============================================================================
  // RENDER: Income & Expenditure
  // ============================================================================

  const renderIncomeExpenditure = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b">
          <h3 className="text-lg font-semibold">Income</h3>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Owner</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Frequency</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
              <th className="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sampleIncome.map((income) => (
              <tr key={income.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleItemClick(income)}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{income.source}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{income.owner}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{income.frequency}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-semibold">
                  {formatCurrency(income.amount)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                  <ChevronRightIcon className="w-5 h-5 text-gray-400" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b">
          <h3 className="text-lg font-semibold">Expenditure</h3>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Frequency</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
              <th className="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sampleExpenditure.map((exp) => (
              <tr key={exp.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleItemClick(exp)}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{exp.category}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{exp.frequency}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    exp.essential
                      ? 'bg-red-100 text-red-800'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {exp.essential ? 'Essential' : 'Discretionary'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-semibold">
                  {formatCurrency(exp.amount)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                  <ChevronRightIcon className="w-5 h-5 text-gray-400" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ============================================================================
  // RENDER: Other Products
  // ============================================================================

  const renderProducts = () => (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Provider</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Owner</th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cover Amount</th>
            <th className="px-6 py-3"></th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sampleProducts.map((product) => (
            <tr key={product.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleItemClick(product)}>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{product.type}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.provider}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.owner}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-semibold">
                {formatCurrency(product.value)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                <ChevronRightIcon className="w-5 h-5 text-gray-400" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // ============================================================================
  // RENDER: Aims & Objectives
  // ============================================================================

  const renderObjectives = () => (
    <div className="grid grid-cols-1 gap-4">
      {sampleObjectives.map((obj) => (
        <div
          key={obj.id}
          className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() => handleItemClick(obj)}
        >
          <div className="flex justify-between items-start mb-3">
            <h3 className="text-lg font-semibold text-gray-900">{obj.title}</h3>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              obj.priority === 'High'
                ? 'bg-red-100 text-red-800'
                : obj.priority === 'Medium'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-green-100 text-green-800'
            }`}>
              {obj.priority} Priority
            </span>
          </div>
          <p className="text-gray-600 mb-3">{obj.description}</p>
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500">Target: {obj.targetDate}</span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              obj.status === 'Completed'
                ? 'bg-green-100 text-green-800'
                : obj.status === 'In Progress'
                ? 'bg-blue-100 text-blue-800'
                : 'bg-gray-100 text-gray-700'
            }`}>
              {obj.status}
            </span>
          </div>
        </div>
      ))}
    </div>
  );

  // ============================================================================
  // RENDER: Basic Details Content
  // ============================================================================

  const renderBasicDetailsContent = () => {
    switch (activeSubTab) {
      case 'people':
        return renderPeopleTable();
      case 'relationships':
        return renderRelationships();
      case 'health':
        return renderHealthVulnerability();
      case 'documents':
        return renderDocuments();
      case 'risk':
        return renderRiskAssessments();
      case 'management':
        return renderClientManagement();
      default:
        return null;
    }
  };

  // ============================================================================
  // RENDER: Main Content
  // ============================================================================

  const renderMainContent = () => {
    if (activeTab === 'summary') return renderSummary();
    if (activeTab === 'basic') return (
      <div className="space-y-4">
        <div className="flex gap-2 border-b overflow-x-auto">
          {basicDetailsTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`px-4 py-3 font-medium whitespace-nowrap ${
                activeSubTab === tab.id
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {renderBasicDetailsContent()}
      </div>
    );
    if (activeTab === 'assets') return renderAssetsLiabilities();
    if (activeTab === 'income') return renderIncomeExpenditure();
    if (activeTab === 'products') return renderProducts();
    if (activeTab === 'objectives') return renderObjectives();
    return null;
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Mitchell Family</h1>
          <p className="text-gray-600 mt-1">Client Group Management - Phase 2 Prototype</p>
        </div>

        {/* Horizontal Main Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px overflow-x-auto">
              {mainTabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      if (tab.id === 'basic') setActiveSubTab('people');
                    }}
                    className={`group inline-flex items-center px-6 py-4 border-b-2 font-medium text-sm whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className={`w-5 h-5 mr-2 ${
                      activeTab === tab.id ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-500'
                    }`} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Main Content */}
        <div className="pb-8">
          {renderMainContent()}
        </div>
      </div>

      {/* Detail Modal */}
      {renderDetailModal()}
    </div>
  );
};

export default ClientGroupPhase2;
