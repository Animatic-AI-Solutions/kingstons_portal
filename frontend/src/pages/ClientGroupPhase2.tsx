import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  CalendarIcon,
  HomeIcon,
} from '@heroicons/react/24/outline';
import DynamicPageContainer from '../components/DynamicPageContainer';

// ============================================================================
// TYPES
// ============================================================================

interface Person {
  id: string;
  // Personal Details (all person information combined)
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
  niNumber: string;
  drivingLicenseExpiry: string;
  passportExpiry: string;
  otherIds: string;
  amlCheck: string;
  safeWords: string[];
  shareDataWith: string;
  // For display
  relationship: string; // Relationship to client group (Husband, Wife, etc.)
}

interface SpecialRelationship {
  id: string;
  name: string;
  dateOfBirth: string;
  relationship: string;
  dependency: string[]; // Array of person names in the client group
  contactDetails: string;
  firmName?: string; // Only for working relationships (accountants, solicitors, etc.)
}

interface HealthItem {
  id: string;
  personId: string;
  healthIssues: string;
  smokerStatus: string;
  medication: string;
  status: 'Active' | 'Historical';
  dateRecorded: string;
}

interface VulnerabilityItem {
  id: string;
  personId: string;
  vulnerabilityDescription: string;
  adjustments: string;
  status: 'Active' | 'Historical';
  dateRecorded: string;
}

interface WillDocument {
  id: string;
  type: 'Will';
  name: string;
  dateOfWill: string;
  dateOfAdvDirective: string;
}

interface LPOADocument {
  id: string;
  type: 'LPOA';
  name: string;
  dateOfHWLPOA: string;
  hwLpoaIsActive: boolean;
  pfLpoaIsActive: boolean;
  dateOfAdvDirective: string;
  dateOfEPA: string;
  epaIsRegistered: boolean;
  other: string;
}

type Document = WillDocument | LPOADocument;

interface RiskAssessment {
  id: string;
  personName: string;
  assessmentType: 'Finemetrica' | 'Manual';
  status: 'Current' | 'Historical';
  // Finemetrica fields
  riskScore?: number; // 1-7
  riskGroup?: string;
  // Manual fields
  date?: string;
  manualRiskScore?: number; // 1-7
  gopDescription?: string;
  reason?: string;
}

interface CapacityToLoss {
  id: string;
  personName: string;
  score: number;
  category: string;
  dateAssessed: string;
  notes: string;
}

interface Asset {
  id: string;
  type: string;
  description: string;
  value: number;
  owner: string;
  isProduct?: boolean;
  productId?: string;
}

interface Liability {
  id: string;
  type: string;
  description: string;
  amount: number;
  monthlyPayment: number;
  owner: string;
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

interface Action {
  id: string;
  title: string;
  description: string;
  assignedTo: 'Client' | 'Advisor';
  dueDate: string;
  status: 'Pending' | 'In Progress' | 'Completed';
  priority: 'High' | 'Medium' | 'Low';
}

interface Meeting {
  id: string;
  meetingType: string;
  meetingMonth: string;
  isBooked: boolean;
  dateHeld?: string;
}

// ============================================================================
// SAMPLE DATA
// ============================================================================

const samplePeople: Person[] = [
  {
    id: '1',
    relationship: 'Husband',
    // Personal Details
    gender: 'Male',
    title: 'Mr',
    forename: 'James',
    middleNames: 'Robert',
    surname: 'Mitchell',
    knownAs: 'Jim',
    previousNames: 'N/A',
    relationshipStatus: 'Married',
    addressLine1: '42 Richmond Gardens',
    addressLine2: 'Richmond',
    addressLine3: 'Surrey',
    addressLine4: '',
    addressLine5: '',
    postcode: 'TW10 6UX',
    emails: ['james.m@email.com', 'j.mitchell@work.com'],
    phoneNumbers: ['07700 900 123', '020 8940 1234'],
    employmentStatus: 'Employed',
    occupation: 'Financial Director',
    dateMovedIn: '15/06/2010',
    dateOfBirth: '15/06/1975',
    placeOfBirth: 'London, UK',
    age: 49,
    niNumber: 'AB 12 34 56 C',
    drivingLicenseExpiry: '15/06/2030',
    passportExpiry: '22/08/2028',
    otherIds: 'UK Voter ID: 123456',
    amlCheck: 'Passed - 15/03/2024',
    safeWords: ['Bluebird', 'Richmond', 'Garden'],
    shareDataWith: 'Sarah Mitchell, Robert Thompson (Accountant)',
  },
  {
    id: '2',
    relationship: 'Wife',
    // Personal Details
    gender: 'Female',
    title: 'Mrs',
    forename: 'Sarah',
    middleNames: 'Jane',
    surname: 'Mitchell',
    knownAs: 'Sarah',
    previousNames: 'Thompson (maiden)',
    relationshipStatus: 'Married',
    addressLine1: '42 Richmond Gardens',
    addressLine2: 'Richmond',
    addressLine3: 'Surrey',
    addressLine4: '',
    addressLine5: '',
    postcode: 'TW10 6UX',
    emails: ['sarah.m@email.com', 's.mitchell@design.co.uk'],
    phoneNumbers: ['07700 900 124', '020 8940 1234'],
    employmentStatus: 'Self-Employed',
    occupation: 'Interior Designer',
    dateMovedIn: '15/06/2010',
    dateOfBirth: '22/09/1977',
    placeOfBirth: 'Bristol, UK',
    age: 47,
    niNumber: 'CD 78 90 12 D',
    drivingLicenseExpiry: '22/09/2029',
    passportExpiry: '10/11/2027',
    otherIds: 'UK Voter ID: 789012',
    amlCheck: 'Passed - 15/03/2024',
    safeWords: ['Sunshine', 'Bristol', 'Design'],
    shareDataWith: 'James Mitchell',
  },
  {
    id: '3',
    relationship: 'Daughter',
    // Personal Details
    gender: 'Female',
    title: 'Miss',
    forename: 'Emma',
    middleNames: 'Louise',
    surname: 'Mitchell',
    knownAs: 'Emma',
    previousNames: 'N/A',
    relationshipStatus: 'Single',
    addressLine1: 'University Halls',
    addressLine2: 'Queens Road',
    addressLine3: 'Bristol',
    addressLine4: '',
    addressLine5: '',
    postcode: 'BS8 1TH',
    emails: ['emma.m@email.com', 'e.mitchell@bristol.ac.uk'],
    phoneNumbers: ['07700 900 125'],
    employmentStatus: 'Student',
    occupation: 'Medical Student',
    dateMovedIn: '15/09/2023',
    dateOfBirth: '10/03/2005',
    placeOfBirth: 'Richmond, UK',
    age: 19,
    niNumber: 'EF 34 56 78 E',
    drivingLicenseExpiry: 'Not held',
    passportExpiry: '05/07/2029',
    otherIds: 'Student ID: UOB987654',
    amlCheck: 'Not required',
    safeWords: ['Rainbow', 'Medicine', 'Student'],
    shareDataWith: 'James Mitchell, Sarah Mitchell',
  },
];

const sampleRelationships: SpecialRelationship[] = [
  {
    id: '1',
    name: 'Robert Thompson',
    dateOfBirth: '15/08/1965',
    relationship: 'Accountant',
    dependency: ['James Mitchell', 'Sarah Mitchell'],
    contactDetails: '020 7123 4567 | r.thompson@accountingfirm.co.uk',
    firmName: 'Thompson & Partners Accountancy'
  },
  {
    id: '2',
    name: 'Mary Johnson',
    dateOfBirth: '22/03/1950',
    relationship: 'Mother-in-law',
    dependency: ['Sarah Mitchell'],
    contactDetails: '07700 900 200 | mary.johnson@email.com',
  },
  {
    id: '3',
    name: 'Elizabeth Baker',
    dateOfBirth: '10/11/1988',
    relationship: 'Solicitor',
    dependency: ['James Mitchell', 'Sarah Mitchell'],
    contactDetails: '020 7456 7890 | e.baker@legalfirm.co.uk',
    firmName: 'Baker & Associates Legal Services'
  },
  {
    id: '4',
    name: 'Michael Mitchell',
    dateOfBirth: '18/07/1945',
    relationship: 'Father',
    dependency: ['James Mitchell'],
    contactDetails: '01932 123 456',
  },
];

const sampleHealthItems: HealthItem[] = [
  {
    id: '1',
    personId: '1',
    healthIssues: 'Type 2 Diabetes, High Cholesterol',
    smokerStatus: 'Non-smoker (quit 2015)',
    medication: 'Metformin 500mg twice daily, Atorvastatin 20mg daily',
    status: 'Active',
    dateRecorded: '01/2023'
  },
  {
    id: '2',
    personId: '1',
    healthIssues: 'High Blood Pressure',
    smokerStatus: 'Non-smoker',
    medication: 'Ramipril 5mg daily',
    status: 'Historical',
    dateRecorded: '06/2020'
  },
  {
    id: '3',
    personId: '2',
    healthIssues: 'Asthma (mild)',
    smokerStatus: 'Never smoked',
    medication: 'Salbutamol inhaler as needed',
    status: 'Active',
    dateRecorded: '03/2022'
  },
];

const sampleVulnerabilities: VulnerabilityItem[] = [
  {
    id: '1',
    personId: '2',
    vulnerabilityDescription: 'Recent health diagnosis affecting decision-making capacity - requires support with complex financial decisions',
    adjustments: 'Ensure all meetings include both clients, provide written summaries of discussions, allow additional time for decision-making',
    status: 'Active',
    dateRecorded: '01/2024'
  },
  {
    id: '2',
    personId: '1',
    vulnerabilityDescription: 'Bereavement - loss of parent impacted emotional wellbeing and financial decisions',
    adjustments: 'Provided additional support during review meetings, deferred major decisions for 6 months',
    status: 'Historical',
    dateRecorded: '08/2020'
  },
];

const sampleDocuments: Document[] = [
  {
    id: '1',
    type: 'Will',
    name: 'Last Will & Testament - James Mitchell',
    dateOfWill: '15/01/2023',
    dateOfAdvDirective: '15/01/2023'
  },
  {
    id: '2',
    type: 'Will',
    name: 'Last Will & Testament - Sarah Mitchell',
    dateOfWill: '15/01/2023',
    dateOfAdvDirective: '15/01/2023'
  },
  {
    id: '3',
    type: 'LPOA',
    name: 'Lasting Power of Attorney - Mitchell Family',
    dateOfHWLPOA: '20/03/2023',
    hwLpoaIsActive: true,
    pfLpoaIsActive: true,
    dateOfAdvDirective: '20/03/2023',
    dateOfEPA: '18/02/2023',
    epaIsRegistered: true,
    other: 'Both James and Sarah have appointed each other as primary attorney with children as replacement attorneys.'
  },
];

const sampleRiskAssessments: RiskAssessment[] = [
  {
    id: '1',
    personName: 'James Mitchell',
    assessmentType: 'Finemetrica',
    riskScore: 5,
    riskGroup: 'Balanced',
    status: 'Current'
  },
  {
    id: '2',
    personName: 'Sarah Mitchell',
    assessmentType: 'Manual',
    date: '12/03/2024',
    manualRiskScore: 4,
    gopDescription: 'Cautious investor with preference for lower volatility',
    reason: 'Client preference for stable returns',
    status: 'Current'
  },
  {
    id: '3',
    personName: 'James Mitchell',
    assessmentType: 'Manual',
    date: '15/03/2023',
    manualRiskScore: 3,
    gopDescription: 'Cautious approach due to market conditions',
    reason: 'Economic uncertainty at time of assessment',
    status: 'Historical'
  },
];

const sampleCapacityToLoss: CapacityToLoss[] = [
  { id: '1', personName: 'James Mitchell', score: 7, category: 'High', dateAssessed: '12/03/2024', notes: 'Strong financial position with diversified assets' },
  { id: '2', personName: 'Sarah Mitchell', score: 6, category: 'Medium-High', dateAssessed: '12/03/2024', notes: 'Stable income from self-employment, moderate reserves' },
  { id: '3', personName: 'Emma Mitchell', score: 3, category: 'Low', dateAssessed: '12/03/2024', notes: 'Student with limited income and assets' },
];

const sampleAssets: Asset[] = [
  { id: '1', type: 'Property', description: 'Primary Residence - Richmond', value: 875000, owner: 'Joint', isProduct: false },
  { id: '2', type: 'ISA', description: 'Stocks & Shares ISA', value: 156000, owner: 'James Mitchell', isProduct: true, productId: 'prod-123' },
  { id: '3', type: 'Pension', description: 'Defined Contribution Pension', value: 425000, owner: 'James Mitchell', isProduct: true, productId: 'prod-456' },
];

const sampleLiabilities: Liability[] = [
  { id: '1', type: 'Mortgage', description: 'Primary Residence Mortgage', amount: 185000, monthlyPayment: 1250, owner: 'Joint' },
  { id: '2', type: 'Loan', description: 'Car Finance', amount: 15000, monthlyPayment: 350, owner: 'James Mitchell' },
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

const sampleActions: Action[] = [
  { id: '1', title: 'Review pension contributions', description: 'Increase monthly pension contributions by £200', assignedTo: 'Client', dueDate: '2024-11-15', status: 'Pending', priority: 'High' },
  { id: '2', title: 'Complete risk assessment questionnaire', description: 'Fill out the updated Finemetrica risk assessment', assignedTo: 'Client', dueDate: '2024-11-01', status: 'In Progress', priority: 'High' },
  { id: '3', title: 'Send portfolio rebalancing proposal', description: 'Prepare and send proposal for portfolio rebalancing based on Q3 performance', assignedTo: 'Advisor', dueDate: '2024-10-20', status: 'In Progress', priority: 'Medium' },
  { id: '4', title: 'Update will documentation', description: 'Schedule meeting with solicitor to update will following property purchase', assignedTo: 'Client', dueDate: '2024-12-01', status: 'Pending', priority: 'Medium' },
  { id: '5', title: 'Prepare annual review pack', description: 'Compile performance reports and valuation summaries for March review', assignedTo: 'Advisor', dueDate: '2024-10-25', status: 'Pending', priority: 'High' },
  { id: '6', title: 'Research ISA transfer options', description: 'Compare ISA providers for potential transfer to reduce fees', assignedTo: 'Advisor', dueDate: '2024-11-10', status: 'Pending', priority: 'Low' },
  { id: '7', title: 'Provide P60 documentation', description: 'Send latest P60 for tax planning purposes', assignedTo: 'Client', dueDate: '2024-10-30', status: 'Completed', priority: 'Medium' },
];

const sampleMeetings: Meeting[] = [
  {
    id: '1',
    meetingType: 'Annual Review',
    meetingMonth: 'March 2024',
    isBooked: true,
    dateHeld: '12/03/2024'
  },
  {
    id: '2',
    meetingType: 'Mid-Year Check-in',
    meetingMonth: 'September 2024',
    isBooked: true,
    dateHeld: undefined
  },
  {
    id: '3',
    meetingType: 'Quarterly Review',
    meetingMonth: 'December 2024',
    isBooked: false,
    dateHeld: undefined
  },
  {
    id: '4',
    meetingType: 'Annual Review',
    meetingMonth: 'March 2023',
    isBooked: true,
    dateHeld: '15/03/2023'
  },
  {
    id: '5',
    meetingType: 'Mid-Year Check-in',
    meetingMonth: 'September 2023',
    isBooked: true,
    dateHeld: '18/09/2023'
  },
];

const clientManagementInfo = {
  leadAdvisor: 'John Anderson',
  typeOfClient: 'Ongoing',
  ongoingClientStartDate: '15/06/2020',
  dateOfClientDeclaration: '10/06/2020',
  dateOfPrivacyDeclaration: '10/06/2020',
  lastFeeAgreement: '01/04/2023',
  feeAchieved: 0.95,
  fixedFee: 15600,
  nextReviewDate: '01/04/2025',
  clientSince: '15/06/2020',
  primaryAdvisor: 'John Anderson',
  meetingsPerYear: 2,
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const ClientGroupPhase2: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('summary');
  const [activeSubTab, setActiveSubTab] = useState('people');
  const [activeHealthTab, setActiveHealthTab] = useState('health');
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showProductInfoPopup, setShowProductInfoPopup] = useState(false);
  const [selectedProductAsset, setSelectedProductAsset] = useState<Asset | null>(null);

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
    // Check if the item is an Asset and if it's a product
    if ('value' in item && item.isProduct) {
      // Show product info popup for assets that are products
      setSelectedProductAsset(item);
      setShowProductInfoPopup(true);
    } else {
      // Show edit popup for regular assets or liabilities
      setSelectedItem(item);
      setIsEditing(false);
    }
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
    { id: 'objectives', label: 'Aims & Objectives', icon: FlagIcon },
    { id: 'basic', label: 'Basic Details', icon: DocumentTextIcon },
    { id: 'assets', label: 'Assets & Liabilities', icon: CurrencyPoundIcon },
    { id: 'income', label: 'Income & Expenditure', icon: BanknotesIcon },
    { id: 'products', label: 'Other Products', icon: ShieldCheckIcon },
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

  // Helper to check if item is a Person
  const isPerson = (item: any): item is Person => {
    return item && 'forename' in item && 'surname' in item && 'niNumber' in item;
  };

  // Render Person Detail View
  const renderPersonDetail = (person: Person) => {
    const fullName = `${person.title} ${person.forename} ${person.middleNames} ${person.surname}`.trim();
    const fullAddress = [
      person.addressLine1,
      person.addressLine2,
      person.addressLine3,
      person.addressLine4,
      person.addressLine5,
      person.postcode
    ].filter(line => line).join(', ');

    const renderField = (label: string, value: string | number | string[], fullWidth = false) => (
      <div className={fullWidth ? 'col-span-2' : ''}>
        <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
        {isEditing ? (
          Array.isArray(value) ? (
            <input
              type="text"
              defaultValue={value.join(', ')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
            />
          ) : (
            <input
              type="text"
              defaultValue={String(value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
            />
          )
        ) : (
          <p className="text-gray-900 text-sm">
            {Array.isArray(value) ? value.join(', ') : String(value)}
          </p>
        )}
      </div>
    );

    return (
      <>
        {/* Header with icon and name */}
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
          <div className="p-3 rounded-full bg-primary-100">
            <UserIcon className="h-6 w-6 text-primary-700" />
          </div>
          <div>
            <h4 className="text-xl font-semibold text-gray-900">{fullName}</h4>
            <p className="text-sm text-gray-500">{person.relationship} • Known as: {person.knownAs}</p>
          </div>
        </div>

        {/* Personal Details Section - Combined */}
        <div className="mb-6">
          <h5 className="text-sm font-semibold text-gray-700 uppercase mb-3 flex items-center gap-2">
            <UserIcon className="w-4 h-4" />
            Personal Details
          </h5>
          <div className="grid grid-cols-2 gap-4">
            {renderField('Title', person.title)}
            {renderField('Gender', person.gender)}
            {renderField('Forename', person.forename)}
            {renderField('Middle Names', person.middleNames)}
            {renderField('Surname', person.surname)}
            {renderField('Known As', person.knownAs)}
            {renderField('Previous Names', person.previousNames, true)}
            {renderField('Relationship Status', person.relationshipStatus, true)}
            {renderField('Date of Birth', person.dateOfBirth)}
            {renderField('Age', person.age)}
            {renderField('Place of Birth', person.placeOfBirth, true)}
            {renderField('Address Line 1', person.addressLine1, true)}
            {renderField('Address Line 2', person.addressLine2, true)}
            {renderField('Address Line 3', person.addressLine3, true)}
            {renderField('Address Line 4', person.addressLine4, true)}
            {renderField('Address Line 5', person.addressLine5, true)}
            {renderField('Postcode', person.postcode)}
            {renderField('Date Moved In', person.dateMovedIn)}
            {renderField('Email Addresses', person.emails, true)}
            {renderField('Phone Numbers', person.phoneNumbers, true)}
            {renderField('Employment Status', person.employmentStatus)}
            {renderField('Occupation', person.occupation)}
            {renderField('National Insurance Number', person.niNumber, true)}
            {renderField('AML Check', person.amlCheck, true)}
            {renderField('Driving License Expiry', person.drivingLicenseExpiry)}
            {renderField('Passport Expiry', person.passportExpiry)}
            {renderField('Other IDs', person.otherIds, true)}
            {renderField('Safe Words (3 words - used to access products on client\'s behalf)', person.safeWords, true)}
            {renderField('Share Data With', person.shareDataWith, true)}
          </div>
        </div>
      </>
    );
  };

  // Render Generic Detail View
  const renderGenericDetail = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {Object.entries(selectedItem).map(([key, value]) => {
        if (key === 'id') return null;
        return (
          <div key={key} className="col-span-1">
            <label className="block text-sm font-medium text-gray-700 mb-2 capitalize">
              {key.replace(/([A-Z])/g, ' $1').trim()}
            </label>
            {isEditing ? (
              <input
                type="text"
                defaultValue={String(value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
              />
            ) : (
              <p className="text-gray-900 text-base">{String(value)}</p>
            )}
          </div>
        );
      })}
    </div>
  );

  // ============================================================================
  // RENDER: Product Info Popup
  // ============================================================================

  const renderProductInfoPopup = () => {
    if (!showProductInfoPopup || !selectedProductAsset) return null;

    const handleNavigateToProduct = () => {
      // Navigate to product details page
      navigate(`/products/${selectedProductAsset.productId}`);
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl border border-gray-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-3 py-2 rounded-t-lg">
            <h3 className="text-xl font-semibold text-white">
              {selectedProductAsset.description}
            </h3>
            <p className="text-primary-100 text-sm mt-1">Product Asset - IRR System Integration</p>
          </div>

          {/* Body */}
          <div className="p-6">
            <div className="mb-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="p-3 rounded-full bg-blue-100">
                  <ShieldCheckIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">
                    IRR System Integration
                  </h4>
                  <p className="text-gray-700 leading-relaxed">
                    This asset is linked to a product in the IRR (Internal Rate of Return) system.
                    You can manage valuations and track performance over time through the product details page.
                  </p>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <h5 className="font-semibold text-blue-900 mb-2">What you can do:</h5>
                <ul className="space-y-2 text-sm text-blue-800">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span><strong>Manually record valuations</strong> - Add new valuation entries to track asset value changes</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span><strong>Manage IRR calculations</strong> - View historical performance and IRR metrics</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">•</span>
                    <span><strong>View product details</strong> - Access full product information and history</span>
                  </li>
                </ul>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h5 className="font-semibold text-gray-900 mb-3">Asset Summary</h5>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Type</p>
                    <p className="font-medium text-gray-900">{selectedProductAsset.type}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Current Value</p>
                    <p className="font-medium text-gray-900">{formatCurrency(selectedProductAsset.value)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Owner</p>
                    <p className="font-medium text-gray-900">{selectedProductAsset.owner}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Product ID</p>
                    <p className="font-medium text-gray-900 font-mono text-xs">{selectedProductAsset.productId}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-3 py-2 rounded-b-lg flex items-center justify-end gap-3">
            <button
              onClick={() => {
                setShowProductInfoPopup(false);
                setSelectedProductAsset(null);
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
            >
              Close
            </button>
            <button
              onClick={handleNavigateToProduct}
              className="px-6 py-2 bg-primary-700 text-white rounded-lg hover:bg-primary-800 transition-colors font-medium shadow-sm"
            >
              Go to Product Details →
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderDetailModal = () => {
    if (!selectedItem) return null;

    const isPersonDetail = isPerson(selectedItem);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-gray-200">
          <div className="sticky top-0 bg-white border-b border-gray-200 px-3 py-2 flex justify-between items-center">
            <h3 className="text-xl font-semibold text-gray-900">
              {isPersonDetail ? 'Person Details' : 'Details'}
            </h3>
            <div className="flex items-center gap-2">
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-700 text-white rounded-lg hover:bg-primary-800 transition-colors shadow-sm"
                >
                  <PencilIcon className="w-4 h-4" />
                  <span className="font-medium">Edit</span>
                </button>
              )}
              {isEditing && (
                <>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"
                  >
                    <CheckIcon className="w-4 h-4" />
                    <span className="font-medium">Save</span>
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                </>
              )}
              <button onClick={closeDetail} className="text-gray-500 hover:text-gray-700 transition-colors p-1">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="p-6">
            {isPersonDetail ? renderPersonDetail(selectedItem as Person) : renderGenericDetail()}
          </div>
        </div>
      </div>
    );
  };

  // ============================================================================
  // RENDER: Summary Tab
  // ============================================================================

  const renderSummary = () => (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">People in Client Group</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {samplePeople.map((person) => {
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
              onClick={() => handleItemClick(person)}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary-100">
                    <UserIcon className="h-5 w-5 text-primary-700" />
                  </div>
                  <div>
                    <h4 className="text-base font-semibold text-gray-900">{fullName}</h4>
                    <p className="text-xs text-gray-500">{person.relationship} • Known as: {person.knownAs}</p>
                  </div>
                </div>
                <ChevronRightIcon className="w-5 h-5 text-gray-400" />
              </div>

              {/* Personal Details - Combined */}
              <div className="mb-4">
                <h5 className="text-xs font-semibold text-gray-700 uppercase mb-2">Personal Details</h5>
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                    <div>
                      <span className="text-gray-500">Gender: </span>
                      <span className="font-medium text-gray-900">{person.gender}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Age: </span>
                      <span className="font-medium text-gray-900">{person.age}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">DOB: </span>
                      <span className="font-medium text-gray-900">{person.dateOfBirth}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Place of Birth: </span>
                      <span className="font-medium text-gray-900">{person.placeOfBirth}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-500">Status: </span>
                      <span className="font-medium text-gray-900">{person.relationshipStatus}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-500">Previous Names: </span>
                      <span className="font-medium text-gray-900">{person.previousNames}</span>
                    </div>
                  </div>

                  <div className="pt-1">
                    <p className="text-xs text-gray-500 mb-0.5">Address</p>
                    <p className="text-xs font-medium text-gray-900 leading-relaxed">{fullAddress}</p>
                    <p className="text-xs text-gray-500 mt-1">Moved in: {person.dateMovedIn}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs pt-1">
                    <div className="col-span-2">
                      <span className="text-gray-500">Email: </span>
                      <span className="font-medium text-gray-900">{person.emails.join(', ')}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-500">Phone: </span>
                      <span className="font-medium text-gray-900">{person.phoneNumbers.join(', ')}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Employment: </span>
                      <span className="font-medium text-gray-900">{person.employmentStatus}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Occupation: </span>
                      <span className="font-medium text-gray-900">{person.occupation}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">NI Number: </span>
                      <span className="font-medium text-gray-900">{person.niNumber}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">AML Check: </span>
                      <span className="font-medium text-green-700">{person.amlCheck}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Driving License: </span>
                      <span className="font-medium text-gray-900">{person.drivingLicenseExpiry}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Passport: </span>
                      <span className="font-medium text-gray-900">{person.passportExpiry}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-500">Other IDs: </span>
                      <span className="font-medium text-gray-900">{person.otherIds}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-500">Safe Words (3 words - for product access): </span>
                      <span className="font-medium text-primary-700">{person.safeWords.join(', ')}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-500">Share Data With: </span>
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
  );

  // ============================================================================
  // RENDER: People Table
  // ============================================================================

  const renderPeopleTable = () => (
    <div className="bg-white rounded-lg shadow-md border border-gray-100 overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Relationship</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Age</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {samplePeople.map((person) => {
            const fullName = `${person.title} ${person.forename} ${person.surname}`;
            return (
              <tr key={person.id} className="hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => handleItemClick(person)}>
                <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{fullName}</td>
                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600">{person.relationship}</td>
                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600">{person.age}</td>
                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600">{person.emails[0]}</td>
                <td className="px-3 py-2 whitespace-nowrap text-right text-sm">
                  <ChevronRightIcon className="w-5 h-5 text-gray-400" />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  // ============================================================================
  // RENDER: Special Relationships
  // ============================================================================

  const renderRelationships = () => (
    <div className="bg-white rounded-lg shadow-md border border-gray-100 overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date of Birth</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Relationship</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dependency</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact Details</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Firm Name</th>
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sampleRelationships.map((rel) => (
            <tr key={rel.id} className="hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => handleItemClick(rel)}>
              <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{rel.name}</td>
              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600">{rel.dateOfBirth}</td>
              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  rel.firmName ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                }`}>
                  {rel.relationship}
                </span>
              </td>
              <td className="px-3 py-2 text-sm text-gray-600">
                {rel.dependency.map((person, idx) => (
                  <span key={idx} className="inline-block mr-1 mb-1">
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                      {person}
                    </span>
                  </span>
                ))}
              </td>
              <td className="px-3 py-2 text-sm text-gray-600">{rel.contactDetails}</td>
              <td className="px-3 py-2 text-sm text-gray-600">
                {rel.firmName ? (
                  <span className="font-medium text-gray-900">{rel.firmName}</span>
                ) : (
                  <span className="text-gray-400 italic">N/A</span>
                )}
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-right text-sm">
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
      {/* Sub-sub-section label */}
      <div className="text-center mb-2">
        <span className="text-xs font-semibold text-primary-600 uppercase tracking-wide">
          View Type
        </span>
      </div>
      {/* Sub-tabs with Option 5 styling - smaller, colored */}
      <div className="flex items-center justify-center mb-4">
        <div className="inline-flex items-center bg-primary-50 rounded-lg p-1 border border-primary-200 shadow-sm">
          <button
            onClick={() => setActiveHealthTab('health')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
              activeHealthTab === 'health'
                ? 'bg-primary-700 text-white shadow-md'
                : 'text-primary-700 hover:bg-primary-100 hover:text-primary-800'
            }`}
          >
            <span className="text-xs font-medium">Health</span>
          </button>
          <button
            onClick={() => setActiveHealthTab('vulnerability')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
              activeHealthTab === 'vulnerability'
                ? 'bg-primary-700 text-white shadow-md'
                : 'text-primary-700 hover:bg-primary-100 hover:text-primary-800'
            }`}
          >
            <span className="text-xs font-medium">Vulnerability</span>
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {samplePeople.map((person) => {
          const counts = activeHealthTab === 'health'
            ? getHealthCounts(person.id)
            : getVulnerabilityCounts(person.id);
          const items = activeHealthTab === 'health'
            ? sampleHealthItems.filter(h => h.personId === person.id)
            : sampleVulnerabilities.filter(v => v.personId === person.id);
          const isExpanded = expandedCards.has(`${activeHealthTab}-${person.id}`);

          return (
            <div key={person.id} className="bg-white rounded-lg shadow-md border border-gray-100 overflow-hidden">
              <div
                className="px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors flex items-center justify-between"
                onClick={() => toggleCardExpanded(`${activeHealthTab}-${person.id}`)}
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="p-2 rounded-full bg-primary-100">
                    <UserIcon className="h-5 w-5 text-primary-700" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">{`${person.title} ${person.forename} ${person.surname}`}</h4>
                    <p className="text-xs text-gray-500">{person.relationship}</p>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-primary-700">{counts.active}</p>
                      <p className="text-xs text-gray-600">Active</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-400">{counts.historical}</p>
                      <p className="text-xs text-gray-600">Historical</p>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronDownIcon className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronRightIcon className="w-5 h-5 text-gray-400" />
                  )}
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
                        {activeHealthTab === 'health' ? (
                          <>
                            <p className="font-medium text-sm text-gray-900 mb-1">
                              {(item as HealthItem).healthIssues}
                            </p>
                            <p className="text-xs text-gray-600">
                              <span className="font-medium">Smoker:</span> {(item as HealthItem).smokerStatus}
                            </p>
                            <p className="text-xs text-gray-600 mt-1">
                              <span className="font-medium">Medication:</span> {(item as HealthItem).medication}
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="font-medium text-sm text-gray-900 mb-1">
                              {(item as VulnerabilityItem).vulnerabilityDescription}
                            </p>
                            <p className="text-xs text-gray-600 mt-1">
                              <span className="font-medium">Adjustments:</span> {(item as VulnerabilityItem).adjustments}
                            </p>
                          </>
                        )}
                        <p className="text-xs text-gray-500 mt-2">{item.dateRecorded}</p>
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
                        {activeHealthTab === 'health' ? (
                          <>
                            <p className="font-medium text-sm text-gray-700 mb-1">
                              {(item as HealthItem).healthIssues}
                            </p>
                            <p className="text-xs text-gray-600">
                              <span className="font-medium">Smoker:</span> {(item as HealthItem).smokerStatus}
                            </p>
                            <p className="text-xs text-gray-600 mt-1">
                              <span className="font-medium">Medication:</span> {(item as HealthItem).medication}
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="font-medium text-sm text-gray-700 mb-1">
                              {(item as VulnerabilityItem).vulnerabilityDescription}
                            </p>
                            <p className="text-xs text-gray-600 mt-1">
                              <span className="font-medium">Adjustments:</span> {(item as VulnerabilityItem).adjustments}
                            </p>
                          </>
                        )}
                        <p className="text-xs text-gray-500 mt-2">{item.dateRecorded}</p>
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
    <div className="space-y-6">
      {/* Wills Section */}
      <div className="bg-white rounded-lg shadow-md border border-gray-100 overflow-hidden">
        <div className="px-3 py-2 bg-gray-50 border-b">
          <h3 className="text-lg font-semibold">Wills</h3>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date of Will</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date of Adv Directive</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sampleDocuments.filter(doc => doc.type === 'Will').map((doc) => (
              <tr key={doc.id} className="hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => handleItemClick(doc)}>
                <td className="px-3 py-2 text-sm font-medium text-gray-900">{doc.name}</td>
                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600">{(doc as WillDocument).dateOfWill}</td>
                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600">{(doc as WillDocument).dateOfAdvDirective}</td>
                <td className="px-3 py-2 whitespace-nowrap text-right text-sm">
                  <ChevronRightIcon className="w-5 h-5 text-gray-400" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* LPOAs Section */}
      <div className="bg-white rounded-lg shadow-md border border-gray-100 overflow-hidden">
        <div className="px-3 py-2 bg-gray-50 border-b">
          <h3 className="text-lg font-semibold">Lasting Powers of Attorney</h3>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date of H&W LPOA</th>
              <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">H&W Active</th>
              <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">P&F Active</th>
              <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">EPA Registered</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sampleDocuments.filter(doc => doc.type === 'LPOA').map((doc) => {
              const lpoa = doc as LPOADocument;
              return (
                <tr key={doc.id} className="hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => handleItemClick(doc)}>
                  <td className="px-3 py-2 text-sm font-medium text-gray-900">{lpoa.name}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600">{lpoa.dateOfHWLPOA}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      lpoa.hwLpoaIsActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {lpoa.hwLpoaIsActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      lpoa.pfLpoaIsActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {lpoa.pfLpoaIsActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      lpoa.epaIsRegistered ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {lpoa.epaIsRegistered ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-right text-sm">
                    <ChevronRightIcon className="w-5 h-5 text-gray-400" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
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
        {/* Current Risk Assessments */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-3 py-2 bg-gray-50 border-b">
            <h3 className="text-lg font-semibold">Current Risk Assessments</h3>
          </div>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Person</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Risk Group</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentAssessments.map((assessment) => (
                <tr key={assessment.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleItemClick(assessment)}>
                  <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{assessment.personName}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      assessment.assessmentType === 'Finemetrica'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {assessment.assessmentType}
                    </span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                    {assessment.assessmentType === 'Finemetrica'
                      ? `${assessment.riskScore}/7`
                      : `${assessment.manualRiskScore}/7`
                    }
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      assessment.riskGroup === 'Balanced' || assessment.gopDescription?.includes('Balanced')
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {assessment.assessmentType === 'Finemetrica'
                        ? assessment.riskGroup
                        : assessment.gopDescription?.split(' ')[0]
                      }
                    </span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-right text-sm">
                    <ChevronRightIcon className="w-5 h-5 text-gray-400" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Historical Risk Assessments */}
        {historicalAssessments.length > 0 && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-3 py-2 bg-gray-50 border-b">
              <h3 className="text-lg font-semibold text-gray-600">Historical Risk Assessments</h3>
            </div>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Person</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Risk Group</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {historicalAssessments.map((assessment) => (
                  <tr key={assessment.id} className="hover:bg-gray-50 cursor-pointer opacity-60" onClick={() => handleItemClick(assessment)}>
                    <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{assessment.personName}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                        {assessment.assessmentType}
                      </span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                      {assessment.assessmentType === 'Finemetrica'
                        ? `${assessment.riskScore}/7`
                        : `${assessment.manualRiskScore}/7`
                      }
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                        {assessment.assessmentType === 'Finemetrica'
                          ? assessment.riskGroup
                          : assessment.gopDescription?.split(' ')[0]
                        }
                      </span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">{assessment.date || '-'}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-right text-sm">
                      <ChevronRightIcon className="w-5 h-5 text-gray-400" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Capacity to Loss */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-3 py-2 bg-gray-50 border-b">
            <h3 className="text-lg font-semibold">Capacity to Loss</h3>
          </div>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Person</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date Assessed</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sampleCapacityToLoss.map((capacity) => (
                <tr key={capacity.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleItemClick(capacity)}>
                  <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{capacity.personName}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 font-semibold">{capacity.score}/10</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      capacity.category.includes('High')
                        ? 'bg-green-100 text-green-800'
                        : capacity.category.includes('Medium')
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {capacity.category}
                    </span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">{capacity.dateAssessed}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-right text-sm">
                    <ChevronRightIcon className="w-5 h-5 text-gray-400" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ============================================================================
  // RENDER: Client Management
  // ============================================================================

  const renderClientManagement = () => (
    <div className="space-y-6">
      {/* Client Information */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Client Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Lead Advisor</p>
            <p className="text-lg font-semibold text-gray-900">{clientManagementInfo.leadAdvisor}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Type of Client</p>
            <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
              {clientManagementInfo.typeOfClient}
            </span>
          </div>
          {clientManagementInfo.typeOfClient === 'Ongoing' && (
            <div>
              <p className="text-sm text-gray-600">Ongoing Client Start Date</p>
              <p className="text-lg font-semibold text-gray-900">{clientManagementInfo.ongoingClientStartDate}</p>
            </div>
          )}
          <div>
            <p className="text-sm text-gray-600">Date of Client Declaration</p>
            <p className="text-lg font-semibold text-gray-900">{clientManagementInfo.dateOfClientDeclaration}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Date of Privacy Declaration</p>
            <p className="text-lg font-semibold text-gray-900">{clientManagementInfo.dateOfPrivacyDeclaration}</p>
          </div>
        </div>
      </div>

      {/* Fee Information */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Fee Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Last Fee Agreement</p>
            <p className="text-lg font-semibold text-gray-900">{clientManagementInfo.lastFeeAgreement}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Fee Achieved</p>
            <p className="text-lg font-semibold text-gray-900">{clientManagementInfo.feeAchieved}%</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Fixed Fee</p>
            <p className="text-lg font-semibold text-gray-900">{formatCurrency(clientManagementInfo.fixedFee)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Next Review Date</p>
            <p className="text-lg font-semibold text-gray-900">{clientManagementInfo.nextReviewDate}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-3 py-2 bg-gray-50 border-b">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Meeting Suite</h3>
            <div className="text-right">
              <p className="text-2xl font-bold text-primary-700">{clientManagementInfo.meetingsPerYear}</p>
              <p className="text-xs text-gray-600">Meetings per Year</p>
            </div>
          </div>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Meeting Type</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Meeting Month</th>
              <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Booked</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date Held</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sampleMeetings.map((meeting) => (
              <tr key={meeting.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleItemClick(meeting)}>
                <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{meeting.meetingType}</td>
                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600">{meeting.meetingMonth}</td>
                <td className="px-3 py-2 whitespace-nowrap text-center">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    meeting.isBooked ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {meeting.isBooked ? 'Booked' : 'Not Booked'}
                  </span>
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600">
                  {meeting.dateHeld ? (
                    <span className="font-medium">{meeting.dateHeld}</span>
                  ) : (
                    <span className="text-gray-400 italic">Not held yet</span>
                  )}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-right text-sm">
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
  // RENDER: Assets & Liabilities
  // ============================================================================

  const renderAssetsLiabilities = () => {
    // Helper to calculate ownership amounts per person
    const getPersonOwnership = (item: Asset | Liability, personName: string): number => {
      const owner = item.owner || '';
      const value = 'value' in item ? item.value : item.amount;

      if (owner === 'Joint') {
        // Split equally among all adult persons (excluding children/students)
        const adults = samplePeople.filter(p => p.employmentStatus !== 'Student');
        return value / adults.length;
      } else if (owner.includes(personName)) {
        return value;
      }
      return 0;
    };

    // Combine assets and liabilities into rows
    const rows = [
      // Assets first
      ...sampleAssets.map(asset => ({
        id: asset.id,
        type: 'asset' as const,
        name: asset.description,
        item: asset,
        isTotal: false
      })),
      // Liabilities second
      ...sampleLiabilities.map(liability => ({
        id: liability.id,
        type: 'liability' as const,
        name: liability.description,
        item: liability,
        isTotal: false
      }))
    ];

    // Calculate totals per person
    const personTotals = samplePeople.map(person => {
      const personName = `${person.forename} ${person.surname}`;
      const assetTotal = sampleAssets.reduce((sum, asset) => sum + getPersonOwnership(asset, personName), 0);
      const liabilityTotal = sampleLiabilities.reduce((sum, liability) => sum + getPersonOwnership(liability, personName), 0);
      return {
        name: personName,
        netWorth: assetTotal - liabilityTotal
      };
    });

    const totalAssets = sampleAssets.reduce((sum, a) => sum + a.value, 0);
    const totalLiabilities = sampleLiabilities.reduce((sum, l) => sum + l.amount, 0);
    const netWorth = totalAssets - totalLiabilities;

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-3 py-2 bg-gray-50 border-b">
            <h3 className="text-lg font-semibold">Assets & Liabilities</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Asset / Liability</th>
                  {samplePeople.map((person) => (
                    <th key={person.id} className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                      {person.forename} {person.surname}
                    </th>
                  ))}
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {/* Asset Rows */}
                {sampleAssets.map((asset, index) => (
                  <tr key={asset.id} className={`hover:bg-gray-50 cursor-pointer ${index === 0 ? 'border-t-2 border-gray-300' : ''}`} onClick={() => handleItemClick(asset)}>
                    <td className="px-3 py-2 text-sm font-medium text-gray-900">
                      <div className="flex items-center gap-2">
                        <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
                        {asset.description}
                      </div>
                    </td>
                    {samplePeople.map((person) => {
                      const personName = `${person.forename} ${person.surname}`;
                      const amount = getPersonOwnership(asset, personName);
                      return (
                        <td key={person.id} className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                          {amount > 0 ? formatCurrency(amount) : '-'}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-right font-semibold">
                      {formatCurrency(asset.value)}
                    </td>
                  </tr>
                ))}

                {/* Assets Total Row */}
                <tr className="bg-green-50 font-bold">
                  <td className="px-3 py-2 text-sm text-gray-900">Total Assets</td>
                  {samplePeople.map((person) => {
                    const personName = `${person.forename} ${person.surname}`;
                    const total = sampleAssets.reduce((sum, asset) => sum + getPersonOwnership(asset, personName), 0);
                    return (
                      <td key={person.id} className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                        {formatCurrency(total)}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                    {formatCurrency(totalAssets)}
                  </td>
                </tr>

                {/* Liability Rows */}
                {sampleLiabilities.map((liability, index) => (
                  <tr key={liability.id} className={`hover:bg-gray-50 cursor-pointer ${index === 0 ? 'border-t-2 border-gray-300' : ''}`} onClick={() => handleItemClick(liability)}>
                    <td className="px-3 py-2 text-sm font-medium text-gray-900">
                      <div className="flex items-center gap-2">
                        <span className="inline-block w-2 h-2 rounded-full bg-red-500"></span>
                        {liability.description}
                      </div>
                    </td>
                    {samplePeople.map((person) => {
                      const personName = `${person.forename} ${person.surname}`;
                      const amount = getPersonOwnership(liability, personName);
                      return (
                        <td key={person.id} className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                          {amount > 0 ? formatCurrency(amount) : '-'}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-right font-semibold">
                      {formatCurrency(liability.amount)}
                    </td>
                  </tr>
                ))}

                {/* Liabilities Total Row */}
                <tr className="bg-red-50 font-bold">
                  <td className="px-3 py-2 text-sm text-gray-900">Total Liabilities</td>
                  {samplePeople.map((person) => {
                    const personName = `${person.forename} ${person.surname}`;
                    const total = sampleLiabilities.reduce((sum, liability) => sum + getPersonOwnership(liability, personName), 0);
                    return (
                      <td key={person.id} className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                        {formatCurrency(total)}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                    {formatCurrency(totalLiabilities)}
                  </td>
                </tr>

                {/* Net Worth Row */}
                <tr className="bg-blue-100 font-bold border-t-2 border-gray-400">
                  <td className="px-3 py-2 text-sm text-gray-900">Net Worth</td>
                  {personTotals.map((person, index) => (
                    <td key={index} className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatCurrency(person.netWorth)}
                    </td>
                  ))}
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                    {formatCurrency(netWorth)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // ============================================================================
  // RENDER: Income & Expenditure
  // ============================================================================

  const renderIncomeExpenditure = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-3 py-2 bg-gray-50 border-b">
          <h3 className="text-lg font-semibold">Income</h3>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Owner</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Frequency</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sampleIncome.map((income) => (
              <tr key={income.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleItemClick(income)}>
                <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{income.source}</td>
                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">{income.owner}</td>
                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">{income.frequency}</td>
                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-right font-semibold">
                  {formatCurrency(income.amount)}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-right text-sm">
                  <ChevronRightIcon className="w-5 h-5 text-gray-400" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-3 py-2 bg-gray-50 border-b">
          <h3 className="text-lg font-semibold">Expenditure</h3>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Frequency</th>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sampleExpenditure.map((exp) => (
              <tr key={exp.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleItemClick(exp)}>
                <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{exp.category}</td>
                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">{exp.frequency}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    exp.essential
                      ? 'bg-red-100 text-red-800'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {exp.essential ? 'Essential' : 'Discretionary'}
                  </span>
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-right font-semibold">
                  {formatCurrency(exp.amount)}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-right text-sm">
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
    <div className="bg-white rounded-lg shadow-md border border-gray-100 overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Provider</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Owner</th>
            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Cover Amount</th>
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sampleProducts.map((product) => (
            <tr key={product.id} className="hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => handleItemClick(product)}>
              <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{product.type}</td>
              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600">{product.provider}</td>
              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600">{product.owner}</td>
              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-right font-semibold">
                {formatCurrency(product.value)}
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-right text-sm">
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

  // ============================================================================
  // RENDER: Actions (Short-term To-Do List)
  // ============================================================================

  const renderActions = () => (
    <div className="space-y-3">
      {/* Client Actions */}
      <div>
        <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <UserIcon className="w-5 h-5 text-blue-600" />
          Client Actions
        </h4>
        <div className="space-y-2">
          {sampleActions.filter(action => action.assignedTo === 'Client').map((action) => (
            <div
              key={action.id}
              className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow cursor-pointer border-l-4 border-blue-500"
              onClick={() => handleItemClick(action)}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <h5 className="text-sm font-semibold text-gray-900">{action.title}</h5>
                  <p className="text-xs text-gray-600 mt-1">{action.description}</p>
                </div>
                <div className="flex items-center gap-2 ml-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    action.priority === 'High'
                      ? 'bg-red-100 text-red-800'
                      : action.priority === 'Medium'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {action.priority}
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-center text-xs mt-2">
                <span className="text-gray-500">Due: {new Date(action.dueDate).toLocaleDateString('en-GB')}</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  action.status === 'Completed'
                    ? 'bg-green-100 text-green-800'
                    : action.status === 'In Progress'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {action.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Advisor Actions */}
      <div>
        <h4 className="text-md font-semibold text-gray-900 mb-3 flex items-center gap-2 mt-6">
          <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          Advisor Actions
        </h4>
        <div className="space-y-2">
          {sampleActions.filter(action => action.assignedTo === 'Advisor').map((action) => (
            <div
              key={action.id}
              className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow cursor-pointer border-l-4 border-primary-600"
              onClick={() => handleItemClick(action)}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <h5 className="text-sm font-semibold text-gray-900">{action.title}</h5>
                  <p className="text-xs text-gray-600 mt-1">{action.description}</p>
                </div>
                <div className="flex items-center gap-2 ml-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    action.priority === 'High'
                      ? 'bg-red-100 text-red-800'
                      : action.priority === 'Medium'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {action.priority}
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-center text-xs mt-2">
                <span className="text-gray-500">Due: {new Date(action.dueDate).toLocaleDateString('en-GB')}</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  action.status === 'Completed'
                    ? 'bg-green-100 text-green-800'
                    : action.status === 'In Progress'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {action.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // ============================================================================
  // RENDER: Objectives (Long-term Goals)
  // ============================================================================

  const renderObjectives = () => (
    <div className="space-y-6">
      {/* Aims & Objectives Section */}
      <div>
        <div className="mb-4">
          <h3 className="text-xl font-semibold text-gray-900">Aims & Objectives</h3>
          <p className="text-sm text-gray-600">Long-term financial goals and targets</p>
        </div>
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
      </div>

      {/* Actions Section */}
      <div>
        <div className="mb-4">
          <h3 className="text-xl font-semibold text-gray-900">Actions</h3>
          <p className="text-sm text-gray-600">Short-term to-do items for client and advisor</p>
        </div>
        {renderActions()}
      </div>
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
      <div className="space-y-6">
        {/* Divider line for visual separation - reduced spacing */}
        <div className="border-t border-gray-200 pt-2">
          {/* Sub-section label */}
          <div className="text-center mb-2">
            <span className="text-xs font-semibold text-primary-600 uppercase tracking-wide">
              Select Section
            </span>
          </div>
          {/* Sub-tabs with visual distinction - smaller, colored */}
          <div className="flex items-center justify-center">
            <div className="inline-flex items-center bg-primary-50 rounded-lg p-1 overflow-x-auto border border-primary-200 shadow-sm">
              {basicDetailsTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveSubTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                    activeSubTab === tab.id
                      ? 'bg-primary-700 text-white shadow-md'
                      : 'text-primary-700 hover:bg-primary-100 hover:text-primary-800'
                  }`}
                >
                  <span className="text-xs font-medium whitespace-nowrap">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
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
    <DynamicPageContainer maxWidth="2000px" className="py-3">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-3xl font-normal text-gray-900 font-sans tracking-wide">Mitchell Family</h1>
        <p className="text-gray-600 mt-1 text-sm">Client Group Management - Phase 2 Prototype</p>
      </div>

      {/* Horizontal Main Tabs */}
      <div className="mb-6">
        <div className="flex items-center justify-center">
          <div className="inline-flex items-center bg-gray-100 rounded-lg p-1">
            {mainTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    if (tab.id === 'basic') setActiveSubTab('people');
                  }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                    activeTab === tab.id
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium whitespace-nowrap">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="pb-8">
        {renderMainContent()}
      </div>

      {/* Product Info Popup */}
      {renderProductInfoPopup()}

      {/* Detail Modal */}
      {renderDetailModal()}
    </DynamicPageContainer>
  );
};

export default ClientGroupPhase2;
