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
  ChevronLeftIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  CalendarIcon,
  HomeIcon,
  PlusIcon,
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
  amlResult: string;
  amlDate: string;
  safeWords: string[];
  shareDataWith: string;
  notes: string;
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
  notes: string;
}

interface HealthItem {
  id: string;
  personId: string;
  name: string;
  type: string;
  dateOfDiagnosis: string;
  medication: string[];
  status: 'Active' | 'Historical';
  dateRecorded: string;
  notes: string;
}

interface VulnerabilityItem {
  id: string;
  personId: string;
  vulnerabilityDescription: string;
  adjustments: string;
  status: 'Active' | 'Historical';
  dateRecorded: string;
  notes: string;
}

interface Document {
  id: string;
  type: 'Will' | 'Advance Directive' | 'LPOA';
  name: string;
  people: string[]; // Associated people from client group
  notes: string;
  // Will fields
  dateOfWill?: string;
  dateOfAdvDirective?: string;
  // LPOA fields
  dateOfHWLPOA?: string;
  hwLpoaIsActive?: boolean;
  pfLpoaIsActive?: boolean;
  dateOfEPA?: string;
  epaIsRegistered?: boolean;
  other?: string;
}

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
  ownershipType: 'sole' | 'joint' | 'in-common';
  ownershipPercentages?: Record<string, number>; // For in-common: { "James Mitchell": 60, "Sarah Mitchell": 40 }
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
  ownershipType: 'sole' | 'joint' | 'in-common';
  ownershipPercentages?: Record<string, number>; // For in-common: { "James Mitchell": 60, "Sarah Mitchell": 40 }
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
  provider: string;
  policyNumber: string;
  coverType: string;
  termType: string;
  livesAssured: string[];
  sumAssured: number;
  duration: string;
  startDate: string;
  monthlyPayment: number;
  endDate: string;
  investmentElement: boolean;
  surrenderValue?: number;
  inTrust: boolean;
  notes: string;
}

interface Objective {
  id: string;
  title: string;
  description: string;
  targetDate: string;
  priority: 'High' | 'Medium' | 'Low';
  status: 'Completed' | 'Not Started';
  notes: string;
}

interface Action {
  id: string;
  title: string;
  description: string;
  assignedTo: 'Client' | 'Advisor';
  dueDate: string;
  status: 'Pending' | 'In Progress' | 'Completed';
  priority: 'High' | 'Medium' | 'Low';
  notes: string;
}

interface AssignedMeeting {
  id: string;
  meetingType: 'Annual Review' | 'Additional Review' | 'Misc';
  expectedMonth: string; // e.g., "March" - when this meeting should happen each year
  notes: string;
}

interface MeetingInstance {
  id: string;
  assignedMeetingId: string; // Reference to the assigned meeting
  meetingType: 'Annual Review' | 'Additional Review' | 'Misc';
  year: number;
  dateBookedFor?: string; // e.g., "12/03/2024"
  hasBeenHeld: boolean;
  dateActuallyHeld?: string; // e.g., "15/03/2024"
  notes: string;
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
    amlResult: 'Passed',
    amlDate: '15/03/2024',
    safeWords: ['Bluebird', 'Richmond', 'Garden'],
    shareDataWith: 'Sarah Mitchell, Robert Thompson (Accountant)',
    notes: 'Primary contact for financial matters. Prefers email communication.',
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
    amlResult: 'Passed',
    amlDate: '15/03/2024',
    safeWords: ['Sunshine', 'Bristol', 'Design'],
    shareDataWith: 'James Mitchell',
    notes: 'Joint account holder. Interested in sustainable investments.',
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
    amlResult: 'Not required',
    amlDate: '',
    safeWords: ['Rainbow', 'Medicine', 'Student'],
    shareDataWith: 'James Mitchell, Sarah Mitchell',
    notes: 'University student. Parents managing account until graduation.',
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
    firmName: 'Thompson & Partners Accountancy',
    notes: 'Handles tax returns and business accounts. Annual review in March.',
  },
  {
    id: '2',
    name: 'Mary Johnson',
    dateOfBirth: '22/03/1950',
    relationship: 'Mother-in-law',
    dependency: ['Sarah Mitchell'],
    contactDetails: '07700 900 200 | mary.johnson@email.com',
    notes: 'Lives nearby. Emergency contact for Sarah.',
  },
  {
    id: '3',
    name: 'Elizabeth Baker',
    dateOfBirth: '10/11/1988',
    relationship: 'Solicitor',
    dependency: ['James Mitchell', 'Sarah Mitchell'],
    contactDetails: '020 7456 7890 | e.baker@legalfirm.co.uk',
    firmName: 'Baker & Associates Legal Services',
    notes: 'Manages wills and estate planning. Last consultation Feb 2024.',
  },
  {
    id: '4',
    name: 'Michael Mitchell',
    dateOfBirth: '18/07/1945',
    relationship: 'Father',
    dependency: ['James Mitchell'],
    contactDetails: '01932 123 456',
    notes: 'Retired. Beneficiary on James\'s life insurance policy.',
  },
];

const sampleHealthItems: HealthItem[] = [
  {
    id: 'smoke-1',
    personId: '1',
    name: 'Non-smoker (quit 2015)',
    type: 'Smoking Status',
    dateOfDiagnosis: 'N/A',
    medication: [],
    status: 'Active',
    dateRecorded: '01/2015',
    notes: 'Successfully quit smoking in 2015 after 10 years.',
  },
  {
    id: '1',
    personId: '1',
    name: 'Type 2 Diabetes',
    type: 'Chronic Condition',
    dateOfDiagnosis: '15/03/2023',
    medication: ['Metformin 500mg twice daily', 'Atorvastatin 20mg daily'],
    status: 'Active',
    dateRecorded: '01/2023',
    notes: 'Managing well with medication. HbA1c levels stable. Regular GP checkups every 3 months.',
  },
  {
    id: '2',
    personId: '1',
    name: 'High Blood Pressure',
    type: 'Cardiovascular',
    dateOfDiagnosis: '10/06/2020',
    medication: ['Ramipril 5mg daily'],
    status: 'Historical',
    dateRecorded: '06/2020',
    notes: 'Resolved through lifestyle changes and weight loss. No longer requires medication.',
  },
  {
    id: 'smoke-2',
    personId: '2',
    name: 'Never smoked',
    type: 'Smoking Status',
    dateOfDiagnosis: 'N/A',
    medication: [],
    status: 'Active',
    dateRecorded: '01/2020',
    notes: 'Non-smoker.',
  },
  {
    id: '3',
    personId: '2',
    name: 'Asthma',
    type: 'Respiratory',
    dateOfDiagnosis: '22/03/2022',
    medication: ['Salbutamol inhaler as needed', 'Beclometasone preventer inhaler'],
    status: 'Active',
    dateRecorded: '03/2022',
    notes: 'Mild asthma, well controlled. Rarely needs reliever inhaler.',
  },
];

const sampleVulnerabilities: VulnerabilityItem[] = [
  {
    id: '1',
    personId: '2',
    vulnerabilityDescription: 'Recent health diagnosis affecting decision-making capacity - requires support with complex financial decisions',
    adjustments: 'Ensure all meetings include both clients, provide written summaries of discussions, allow additional time for decision-making',
    status: 'Active',
    dateRecorded: '01/2024',
    notes: 'Review adjustments quarterly. Sarah prefers written communication for important decisions.',
  },
  {
    id: '2',
    personId: '1',
    vulnerabilityDescription: 'Bereavement - loss of parent impacted emotional wellbeing and financial decisions',
    adjustments: 'Provided additional support during review meetings, deferred major decisions for 6 months',
    status: 'Historical',
    dateRecorded: '08/2020',
    notes: 'Father passed away August 2020. Client has fully recovered and resumed normal decision-making capacity.',
  },
];

const sampleDocuments: Document[] = [
  {
    id: '1',
    type: 'Will',
    name: 'Last Will & Testament - James Mitchell',
    people: ['James Mitchell'],
    notes: 'Updated will following birth of grandchildren. Original held at solicitors office. Copy provided to executor.',
    dateOfWill: '15/01/2023',
    dateOfAdvDirective: '15/01/2023'
  },
  {
    id: '2',
    type: 'Will',
    name: 'Last Will & Testament - Sarah Mitchell',
    people: ['Sarah Mitchell'],
    notes: 'Mirror will to James. Emma appointed as executor with backup executor specified.',
    dateOfWill: '15/01/2023',
    dateOfAdvDirective: '15/01/2023'
  },
  {
    id: '3',
    type: 'Advance Directive',
    name: 'Advance Healthcare Directive - Mitchell Family',
    people: ['James Mitchell', 'Sarah Mitchell'],
    notes: 'Both clients have specified healthcare preferences. GP and family members have been notified.',
    dateOfAdvDirective: '15/01/2023'
  },
  {
    id: '4',
    type: 'LPOA',
    name: 'Lasting Power of Attorney - Mitchell Family',
    people: ['James Mitchell', 'Sarah Mitchell'],
    notes: 'Both James and Sarah have appointed each other as primary attorney with children as replacement attorneys. Documents registered with OPG.',
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
    riskGroup: 'More Adventurous',
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
  {
    id: '1',
    type: 'Property',
    description: 'Primary Residence - Richmond',
    value: 875000,
    owner: 'Joint',
    ownershipType: 'joint',
    isProduct: false
  },
  {
    id: '2',
    type: 'ISA',
    description: 'Stocks & Shares ISA',
    value: 156000,
    owner: 'James Mitchell',
    ownershipType: 'sole',
    isProduct: true,
    productId: 'prod-123'
  },
  {
    id: '3',
    type: 'Pension',
    description: 'Defined Contribution Pension',
    value: 425000,
    owner: 'James Mitchell',
    ownershipType: 'sole',
    isProduct: true,
    productId: 'prod-456'
  },
  {
    id: '4',
    type: 'Investment',
    description: 'Buy-to-Let Property - Brighton',
    value: 450000,
    owner: 'In Common',
    ownershipType: 'in-common',
    ownershipPercentages: {
      'James Mitchell': 60,
      'Sarah Mitchell': 40
    },
    isProduct: false
  },
];

const sampleLiabilities: Liability[] = [
  {
    id: '1',
    type: 'Mortgage',
    description: 'Primary Residence Mortgage',
    amount: 185000,
    monthlyPayment: 1250,
    owner: 'Joint',
    ownershipType: 'joint'
  },
  {
    id: '2',
    type: 'Loan',
    description: 'Car Finance',
    amount: 15000,
    monthlyPayment: 350,
    owner: 'James Mitchell',
    ownershipType: 'sole'
  },
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
  {
    id: '1',
    provider: 'Legal & General',
    policyNumber: 'LG-2019-847261',
    coverType: 'Life Insurance',
    termType: 'Level Term',
    livesAssured: ['James Mitchell'],
    sumAssured: 500000,
    duration: '25 years',
    startDate: '15/03/2019',
    monthlyPayment: 45.50,
    endDate: '15/03/2044',
    investmentElement: false,
    inTrust: true,
    notes: 'Policy written in trust for Sarah and children. Covers mortgage and provides additional family security. Premium guaranteed for full term. Annual review scheduled for March.'
  },
  {
    id: '2',
    provider: 'Aviva',
    policyNumber: 'AV-2020-934712',
    coverType: 'Critical Illness',
    termType: 'Decreasing Term',
    livesAssured: ['Sarah Mitchell'],
    sumAssured: 250000,
    duration: '20 years',
    startDate: '01/06/2020',
    monthlyPayment: 62.80,
    endDate: '01/06/2040',
    investmentElement: false,
    inTrust: false,
    notes: 'Decreasing cover aligned with buy-to-let mortgage. Sum assured reduces annually. Covers major illnesses including cancer, heart attack, and stroke. Consider putting in trust.'
  },
  {
    id: '3',
    provider: 'Prudential',
    policyNumber: 'PRU-2018-562384',
    coverType: 'Whole of Life',
    termType: 'Whole of Life',
    livesAssured: ['James Mitchell', 'Sarah Mitchell'],
    sumAssured: 150000,
    duration: 'Whole of Life',
    startDate: '10/09/2018',
    monthlyPayment: 125.00,
    endDate: 'N/A',
    investmentElement: true,
    surrenderValue: 18500,
    inTrust: true,
    notes: 'Joint life second death policy for IHT planning. Investment element currently valued at £18,500. Written in discretionary trust for children. Premiums reviewable every 10 years - next review September 2028.'
  }
];

const sampleObjectives: Objective[] = [
  {
    id: '1',
    title: 'Retirement Planning',
    description: 'Build sufficient pension pot for retirement at age 65',
    targetDate: '2040',
    priority: 'High',
    status: 'Not Started',
    notes: 'Current projections show on track to meet target. Reviewed contribution levels in March 2024. Consider increasing contributions if salary increases as expected.'
  },
  {
    id: '2',
    title: 'University Funding',
    description: 'Fund Emma\'s university education',
    targetDate: '2026',
    priority: 'High',
    status: 'Not Started',
    notes: 'JISA and savings accounts set up. Currently £45,000 accumulated. Need approximately £60,000 for 3-year course. On track to meet target.'
  },
  {
    id: '3',
    title: 'Mortgage Free',
    description: 'Pay off primary residence mortgage',
    targetDate: '2035',
    priority: 'Medium',
    status: 'Not Started',
    notes: 'Standard repayment schedule in place. Consider overpayments when bonuses received. Current outstanding balance £285,000.'
  },
  {
    id: '4',
    title: 'Emergency Fund',
    description: 'Build 6 months living expenses emergency fund',
    targetDate: '2023',
    priority: 'High',
    status: 'Completed',
    notes: 'Completed September 2023. £35,000 accumulated in easy access savings account with Marcus by Goldman Sachs. Receiving 5.15% interest.'
  },
];

const sampleActions: Action[] = [
  {
    id: '1',
    title: 'Review pension contributions',
    description: 'Increase monthly pension contributions by £200',
    assignedTo: 'Client',
    dueDate: '2024-11-15',
    status: 'Pending',
    priority: 'High',
    notes: 'Client confirmed salary increase. Need to update pension contribution mandate to £700/month. Send forms by email.'
  },
  {
    id: '2',
    title: 'Complete risk assessment questionnaire',
    description: 'Fill out the updated Finemetrica risk assessment',
    assignedTo: 'Client',
    dueDate: '2024-11-01',
    status: 'In Progress',
    priority: 'High',
    notes: 'Link sent to client on 15/10/2024. Follow up if not completed by 28/10/2024. Required for annual review.'
  },
  {
    id: '3',
    title: 'Send portfolio rebalancing proposal',
    description: 'Prepare and send proposal for portfolio rebalancing based on Q3 performance',
    assignedTo: 'Advisor',
    dueDate: '2024-10-20',
    status: 'In Progress',
    priority: 'Medium',
    notes: 'Performance analysis complete. Recommending shift from UK equity to global equity. Draft proposal in progress.'
  },
  {
    id: '4',
    title: 'Update will documentation',
    description: 'Schedule meeting with solicitor to update will following property purchase',
    assignedTo: 'Client',
    dueDate: '2024-12-01',
    status: 'Pending',
    priority: 'Medium',
    notes: 'New property completion 01/09/2024. Client intends to leave this property to Emma. Solicitor contact: Thompson & Partners.'
  },
  {
    id: '5',
    title: 'Prepare annual review pack',
    description: 'Compile performance reports and valuation summaries for March review',
    assignedTo: 'Advisor',
    dueDate: '2024-10-25',
    status: 'Pending',
    priority: 'High',
    notes: 'Include IRR calculations, benchmark comparisons, and fee analysis. Print and bind 2 copies for meeting.'
  },
  {
    id: '6',
    title: 'Research ISA transfer options',
    description: 'Compare ISA providers for potential transfer to reduce fees',
    assignedTo: 'Advisor',
    dueDate: '2024-11-10',
    status: 'Pending',
    priority: 'Low',
    notes: 'Current platform fee 0.35%. Research Vanguard, AJ Bell, and Interactive Investor. Focus on low-cost passive options.'
  },
  {
    id: '7',
    title: 'Provide P60 documentation',
    description: 'Send latest P60 for tax planning purposes',
    assignedTo: 'Client',
    dueDate: '2024-10-30',
    status: 'Completed',
    priority: 'Medium',
    notes: 'Received 28/10/2024. Documents filed in client folder. Tax calculations updated to reflect actual income.'
  },
];

// Assigned meetings - the template/plan for recurring meetings
const assignedMeetings: AssignedMeeting[] = [
  {
    id: 'am1',
    meetingType: 'Annual Review',
    expectedMonth: 'March',
    notes: 'Annual portfolio review and financial planning session. Typically covers investment performance, goal progress, and any necessary adjustments to strategy.'
  },
  {
    id: 'am2',
    meetingType: 'Additional Review',
    expectedMonth: 'September',
    notes: 'Mid-year check-in to review portfolio performance and address any questions or concerns. Shorter format than annual review.'
  },
  {
    id: 'am3',
    meetingType: 'Misc',
    expectedMonth: 'November',
    notes: 'End-of-year planning meeting to discuss tax planning opportunities and preparation for next year.'
  },
];

// Meeting instances - actual occurrences of assigned meetings in specific years
const meetingInstances: MeetingInstance[] = [
  // 2024
  {
    id: 'mi1',
    assignedMeetingId: 'am1',
    meetingType: 'Annual Review',
    year: 2024,
    dateBookedFor: '12/03/2024',
    hasBeenHeld: true,
    dateActuallyHeld: '12/03/2024',
    notes: 'Comprehensive review completed. Discussed pension consolidation and increased ISA contributions. Client happy with portfolio performance. Action: Research pension transfer values.'
  },
  {
    id: 'mi2',
    assignedMeetingId: 'am2',
    meetingType: 'Additional Review',
    year: 2024,
    dateBookedFor: '15/09/2024',
    hasBeenHeld: false,
    dateActuallyHeld: undefined,
    notes: 'Scheduled for mid-September. Agenda to include market volatility discussion and rebalancing considerations.'
  },
  // 2023
  {
    id: 'mi3',
    assignedMeetingId: 'am1',
    meetingType: 'Annual Review',
    year: 2023,
    dateBookedFor: '10/03/2023',
    hasBeenHeld: true,
    dateActuallyHeld: '15/03/2023',
    notes: 'Meeting rescheduled due to client illness. Discussed retirement planning and inheritance tax mitigation. Agreed to increase equity allocation by 10%.'
  },
  {
    id: 'mi4',
    assignedMeetingId: 'am2',
    meetingType: 'Additional Review',
    year: 2023,
    dateBookedFor: '12/09/2023',
    hasBeenHeld: true,
    dateActuallyHeld: '18/09/2023',
    notes: 'Portfolio rebalancing completed as planned. Discussed upcoming changes to pension allowances. Client expressed concern about market conditions - provided reassurance.'
  },
  {
    id: 'mi5',
    assignedMeetingId: 'am3',
    meetingType: 'Misc',
    year: 2023,
    dateBookedFor: '14/11/2023',
    hasBeenHeld: true,
    dateActuallyHeld: '15/11/2023',
    notes: 'Tax planning session. Reviewed capital gains position and ISA usage. Recommended additional pension contributions before year end. Client to confirm by end of month.'
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

// Sample data for other client groups (for importing assets/liabilities)
interface OtherClientGroup {
  id: string;
  name: string;
  people: { id: string; name: string }[];
  assets: Asset[];
  liabilities: Liability[];
}

const otherClientGroups: OtherClientGroup[] = [
  {
    id: 'cg1',
    name: 'Thompson Family',
    people: [
      { id: 'p1', name: 'David Thompson' },
      { id: 'p2', name: 'Emily Thompson' }
    ],
    assets: [
      {
        id: 'a1',
        type: 'Property',
        description: 'Holiday Home - Cornwall',
        value: 425000,
        owner: 'Joint',
        ownershipType: 'joint',
        isProduct: false
      },
      {
        id: 'a2',
        type: 'Investment',
        description: 'Stocks & Shares ISA',
        value: 85000,
        owner: 'David Thompson',
        ownershipType: 'sole',
        isProduct: false
      }
    ],
    liabilities: [
      {
        id: 'l1',
        type: 'Mortgage',
        description: 'Holiday Home Mortgage',
        amount: 125000,
        monthlyPayment: 850,
        owner: 'Joint',
        ownershipType: 'joint'
      }
    ]
  },
  {
    id: 'cg2',
    name: 'Wilson Estate',
    people: [
      { id: 'p1', name: 'Robert Wilson' }
    ],
    assets: [
      {
        id: 'a1',
        type: 'Property',
        description: 'Commercial Property - Manchester',
        value: 650000,
        owner: 'Robert Wilson',
        ownershipType: 'sole',
        isProduct: false
      },
      {
        id: 'a2',
        type: 'Cash',
        description: 'Business Account',
        value: 125000,
        owner: 'Robert Wilson',
        ownershipType: 'sole',
        isProduct: false
      }
    ],
    liabilities: []
  },
  {
    id: 'cg3',
    name: 'Brown Partnership',
    people: [
      { id: 'p1', name: 'Michael Brown' },
      { id: 'p2', name: 'Lisa Brown' },
      { id: 'p3', name: 'Amanda Brown' }
    ],
    assets: [
      {
        id: 'a1',
        type: 'Investment',
        description: 'Investment Portfolio - Vanguard',
        value: 340000,
        owner: 'In Common',
        ownershipType: 'in-common',
        ownershipPercentages: {
          'Michael Brown': 50,
          'Lisa Brown': 30,
          'Amanda Brown': 20
        },
        isProduct: false
      }
    ],
    liabilities: []
  }
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const ClientGroupPhase2: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('summary');
  const [activeSubTab, setActiveSubTab] = useState('people');
  const [activeHealthTab, setActiveHealthTab] = useState('health');
  const [activeRelationshipTab, setActiveRelationshipTab] = useState<'personal' | 'professional'>('personal');
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [showProductInfoPopup, setShowProductInfoPopup] = useState(false);
  const [selectedProductAsset, setSelectedProductAsset] = useState<Asset | null>(null);
  // Client order - controls display order of people
  const [clientOrder, setClientOrder] = useState<string[]>(samplePeople.map(p => p.id));
  const [draggedPersonId, setDraggedPersonId] = useState<string | null>(null);
  // Assets & Liabilities - controls which people are included in the table
  const [includedPeople, setIncludedPeople] = useState<Set<string>>(new Set(samplePeople.map(p => p.id)));
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedClientGroup, setSelectedClientGroup] = useState<string | null>(null);

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
    }
  };

  const closeDetail = () => {
    setSelectedItem(null);
  };

  const handleSave = () => {
    // TODO: Implement save logic here
    console.log('Saving changes:', selectedItem);
    setSelectedItem(null);
  };

  // Client order drag and drop handlers
  const handleDragStart = (personId: string) => {
    setDraggedPersonId(personId);
  };

  const handleDragOver = (e: React.DragEvent, targetPersonId: string) => {
    e.preventDefault();

    if (!draggedPersonId || draggedPersonId === targetPersonId) return;

    const draggedIndex = clientOrder.indexOf(draggedPersonId);
    const targetIndex = clientOrder.indexOf(targetPersonId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const newOrder = [...clientOrder];
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedPersonId);
    setClientOrder(newOrder);
  };

  const handleDragEnd = () => {
    setDraggedPersonId(null);
  };

  // Get people sorted by client order
  const getSortedPeople = () => {
    return [...samplePeople].sort((a, b) => {
      const indexA = clientOrder.indexOf(a.id);
      const indexB = clientOrder.indexOf(b.id);
      return indexA - indexB;
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount);
  };

  const getRiskGroupLabel = (riskScore: number): string => {
    const riskGroups: Record<number, string> = {
      1: 'Very Minimal',
      2: 'Minimal',
      3: 'Modest',
      4: 'Medium',
      5: 'More Adventurous',
      6: 'Adventurous',
      7: 'Speculative'
    };
    return riskGroups[riskScore] || 'Unknown';
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
    { id: 'documents', label: 'Legal Documents' },
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

    const handleTextareaResize = (e: React.FormEvent<HTMLTextAreaElement>) => {
      const textarea = e.currentTarget;
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
    };

    const renderField = (label: string, value: string | number | string[], fullWidth = false) => (
      <div className={`flex items-start py-1.5 px-2 hover:bg-gray-50 border-b border-gray-100 ${fullWidth ? 'col-span-2' : ''}`}>
        <label className="text-xs font-medium text-gray-600 w-36 flex-shrink-0 pt-0.5">{label}:</label>
        {Array.isArray(value) ? (
          <textarea
            defaultValue={value.join(', ')}
            onInput={handleTextareaResize}
            ref={(el) => {
              if (el) {
                el.style.height = 'auto';
                el.style.height = el.scrollHeight + 'px';
              }
            }}
            className="flex-1 px-2 py-0.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-primary-500 focus:border-primary-500 resize-none overflow-hidden"
          />
        ) : (
          <textarea
            defaultValue={String(value)}
            onInput={handleTextareaResize}
            ref={(el) => {
              if (el) {
                el.style.height = 'auto';
                el.style.height = el.scrollHeight + 'px';
              }
            }}
            className="flex-1 px-2 py-0.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-primary-500 focus:border-primary-500 resize-none overflow-hidden"
          />
        )}
      </div>
    );

    return (
      <>
        {/* Header with icon and name - Compact */}
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-200">
          <div className="p-2 rounded-full bg-primary-100">
            <UserIcon className="h-5 w-5 text-primary-700" />
          </div>
          <div>
            <h4 className="text-base font-semibold text-gray-900">{fullName}</h4>
            <p className="text-xs text-gray-500">{person.relationship} • Known as: {person.knownAs}</p>
          </div>
        </div>

        {/* Personal Details Section - Combined & Compact */}
        <div className="mb-2">
          <h5 className="text-xs font-semibold text-gray-700 uppercase mb-2 flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
            <UserIcon className="w-3 h-3" />
            Personal Details
          </h5>
          <div className="grid grid-cols-2 divide-x divide-gray-200 border border-gray-200 rounded bg-white">
            {renderField('Title', person.title)}
            {renderField('Gender', person.gender)}
            {renderField('Forename', person.forename)}
            {renderField('Middle Names', person.middleNames)}
            {renderField('Surname', person.surname)}
            {renderField('Known As', person.knownAs)}
            {renderField('Previous Names', person.previousNames)}
            {renderField('Relationship Status', person.relationshipStatus)}
            {renderField('Date of Birth', person.dateOfBirth)}
            {renderField('Age', person.age)}
            {renderField('Place of Birth', person.placeOfBirth)}
            {renderField('Date Moved In', person.dateMovedIn)}
            {/* Address block - all in left column with other fields in right column */}
            {renderField('Address Line 1', person.addressLine1)}
            {renderField('Email Addresses', person.emails)}
            {renderField('Address Line 2', person.addressLine2)}
            {renderField('Phone Numbers', person.phoneNumbers)}
            {renderField('Address Line 3', person.addressLine3)}
            {renderField('Employment Status', person.employmentStatus)}
            {renderField('Address Line 4', person.addressLine4)}
            {renderField('Occupation', person.occupation)}
            {renderField('Address Line 5', person.addressLine5)}
            {renderField('NI Number', person.niNumber)}
            {renderField('Postcode', person.postcode)}
            {renderField('AML Result', person.amlResult)}
            {renderField('AML Date', person.amlDate)}
            {/* Remaining fields */}
            {renderField('Driving License Expiry', person.drivingLicenseExpiry)}
            {renderField('Passport Expiry', person.passportExpiry)}
            {renderField('Other IDs', person.otherIds)}
            {renderField('Safe Words (3 words)', person.safeWords)}
            {renderField('Share Data With', person.shareDataWith)}
          </div>
        </div>

        {/* Notes Section */}
        <div className="mb-2">
          <h5 className="text-xs font-semibold text-gray-700 uppercase mb-2 flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
            Notes
          </h5>
          <div className="border border-gray-200 rounded bg-white p-2">
            <textarea
              defaultValue={person.notes}
              rows={3}
              className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-primary-500 focus:border-primary-500 resize-none"
              placeholder="Additional information or context..."
            />
          </div>
        </div>
      </>
    );
  };

  // Render Generic Detail View - Compact table-like style
  const renderGenericDetail = () => {
    const entries = Object.entries(selectedItem);
    const regularFields = entries.filter(([key]) => key !== 'id' && key !== 'notes');
    const notesField = entries.find(([key]) => key === 'notes');

    const handleTextareaResize = (e: React.FormEvent<HTMLTextAreaElement>) => {
      const textarea = e.currentTarget;
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
    };

    return (
      <>
        <div className="grid grid-cols-2 divide-x divide-gray-200 border border-gray-200 rounded bg-white">
          {regularFields.map(([key, value]) => {
            const label = key.replace(/([A-Z])/g, ' $1').trim();
            const capitalizedLabel = label.charAt(0).toUpperCase() + label.slice(1);

            return (
              <div key={key} className="flex items-start py-1.5 px-2 hover:bg-gray-50 border-b border-gray-100">
                <label className="text-xs font-medium text-gray-600 w-36 flex-shrink-0 pt-0.5">{capitalizedLabel}:</label>
                {Array.isArray(value) ? (
                  <textarea
                    defaultValue={value.join(', ')}
                    onInput={handleTextareaResize}
                    ref={(el) => {
                      if (el) {
                        el.style.height = 'auto';
                        el.style.height = el.scrollHeight + 'px';
                      }
                    }}
                    className="flex-1 px-2 py-0.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-primary-500 focus:border-primary-500 resize-none overflow-hidden"
                  />
                ) : (
                  <textarea
                    defaultValue={String(value)}
                    onInput={handleTextareaResize}
                    ref={(el) => {
                      if (el) {
                        el.style.height = 'auto';
                        el.style.height = el.scrollHeight + 'px';
                      }
                    }}
                    className="flex-1 px-2 py-0.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-primary-500 focus:border-primary-500 resize-none overflow-hidden"
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Notes Section */}
        {notesField && (
          <div className="mt-2">
            <h5 className="text-xs font-semibold text-gray-700 uppercase mb-2 flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
              Notes
            </h5>
            <div className="border border-gray-200 rounded bg-white p-2">
              <textarea
                defaultValue={String(notesField[1])}
                onInput={handleTextareaResize}
                ref={(el) => {
                  if (el) {
                    el.style.height = 'auto';
                    el.style.height = el.scrollHeight + 'px';
                  }
                }}
                className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-primary-500 focus:border-primary-500 resize-none overflow-hidden min-h-[4rem]"
                placeholder="Additional information or context..."
              />
            </div>
          </div>
        )}
      </>
    );
  };

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

              <div className="bg-gray-50 rounded-lg p-2">
                <h5 className="text-xs font-semibold text-gray-700 uppercase mb-2 px-2">Asset Summary</h5>
                <div className="grid grid-cols-2 divide-x divide-gray-200 border border-gray-200 rounded bg-white">
                  <div className="flex items-start py-1.5 px-2 hover:bg-gray-50 border-b border-gray-100">
                    <label className="text-xs font-medium text-gray-600 w-32 flex-shrink-0 pt-0.5">Type:</label>
                    <span className="text-gray-900 text-xs flex-1 break-words">{selectedProductAsset.type}</span>
                  </div>
                  <div className="flex items-start py-1.5 px-2 hover:bg-gray-50 border-b border-gray-100">
                    <label className="text-xs font-medium text-gray-600 w-32 flex-shrink-0 pt-0.5">Current Value:</label>
                    <span className="text-gray-900 text-xs flex-1 break-words">{formatCurrency(selectedProductAsset.value)}</span>
                  </div>
                  <div className="flex items-start py-1.5 px-2 hover:bg-gray-50">
                    <label className="text-xs font-medium text-gray-600 w-32 flex-shrink-0 pt-0.5">Owner:</label>
                    <span className="text-gray-900 text-xs flex-1 break-words">{selectedProductAsset.owner}</span>
                  </div>
                  <div className="flex items-start py-1.5 px-2 hover:bg-gray-50">
                    <label className="text-xs font-medium text-gray-600 w-32 flex-shrink-0 pt-0.5">Product ID:</label>
                    <span className="text-gray-900 text-xs flex-1 font-mono break-words">{selectedProductAsset.productId}</span>
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
        <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto border border-gray-200">
          <div className="sticky top-0 bg-white border-b border-gray-200 px-3 py-1.5 flex justify-between items-center">
            <h3 className="text-base font-semibold text-gray-900">
              {isPersonDetail ? 'Person Details' : 'Details'}
            </h3>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleSave}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
              >
                <CheckIcon className="w-3 h-3" />
                <span>Save</span>
              </button>
              <button onClick={closeDetail} className="text-gray-500 hover:text-gray-700 transition-colors p-0.5">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="p-3">
            {isPersonDetail ? renderPersonDetail(selectedItem as Person) : renderGenericDetail()}
          </div>
        </div>
      </div>
    );
  };

  // ============================================================================
  // RENDER: Summary Tab
  // ============================================================================

  const renderSummary = () => {
    const sortedPeople = getSortedPeople();

    return (
      <div className="space-y-6">
        {/* People in Client Group */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">People in Client Group</h3>
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
                      <span className="text-gray-500">AML Result: </span>
                      <span className="font-medium text-green-700">{person.amlResult}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">AML Date: </span>
                      <span className="font-medium text-gray-900">{person.amlDate}</span>
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

        {/* Client Order Section */}
        <div className="bg-white rounded-lg shadow-md border border-gray-100 p-3">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Client Order</h3>
          <div className="space-y-1">
            {sortedPeople.map((person, index) => {
              const fullName = `${person.title} ${person.forename} ${person.surname}`.trim();
              const isDragging = draggedPersonId === person.id;
              return (
                <div
                  key={person.id}
                  draggable
                  onDragStart={() => handleDragStart(person.id)}
                  onDragOver={(e) => handleDragOver(e, person.id)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center justify-between bg-gray-50 rounded px-2 py-1.5 border transition-all cursor-move ${
                    isDragging
                      ? 'border-primary-400 bg-primary-50 opacity-50 scale-105'
                      : 'border-gray-200 hover:border-primary-300 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-500 w-5">{index + 1}.</span>
                    <div className="p-1 rounded-full bg-primary-100">
                      <UserIcon className="h-3 w-3 text-primary-700" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-900">{fullName}</p>
                    </div>
                  </div>
                  <div className="text-gray-400">
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

  // ============================================================================
  // RENDER: People Table
  // ============================================================================

  const renderPeopleTable = () => {
    const sortedPeople = getSortedPeople();

    return (
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
            {sortedPeople.map((person) => {
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
  };

  // ============================================================================
  // RENDER: Special Relationships
  // ============================================================================

  const renderRelationships = () => {
    // Filter relationships based on active tab
    // Professional relationships have firmName, personal ones don't
    const filteredRelationships = sampleRelationships.filter(rel => {
      if (activeRelationshipTab === 'professional') {
        return rel.firmName; // Has firmName = professional
      } else {
        return !rel.firmName; // No firmName = personal
      }
    });

    return (
      <div className="space-y-4">
        {/* Relationship Type Tabs */}
        <div className="text-center mb-2">
          <span className="text-xs font-semibold text-primary-600 uppercase tracking-wide">
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
              <span className="text-xs font-medium">Personal</span>
            </button>
            <button
              onClick={() => setActiveRelationshipTab('professional')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all ${
                activeRelationshipTab === 'professional'
                  ? 'bg-primary-700 text-white shadow-md'
                  : 'text-primary-700 hover:bg-primary-100 hover:text-primary-800'
              }`}
            >
              <span className="text-xs font-medium">Professional</span>
            </button>
          </div>
        </div>

        {/* Relationships Table */}
        <div className="bg-white rounded-lg shadow-md border border-gray-100 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date of Birth</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Relationship</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dependency</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact Details</th>
                {activeRelationshipTab === 'professional' && (
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Firm Name</th>
                )}
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRelationships.length > 0 ? (
                filteredRelationships.map((rel) => (
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
                    {activeRelationshipTab === 'professional' && (
                      <td className="px-3 py-2 text-sm text-gray-600">
                        <span className="font-medium text-gray-900">{rel.firmName}</span>
                      </td>
                    )}
                    <td className="px-3 py-2 whitespace-nowrap text-right text-sm">
                      <ChevronRightIcon className="w-5 h-5 text-gray-400" />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={activeRelationshipTab === 'professional' ? 7 : 6} className="px-3 py-8 text-center text-sm text-gray-500">
                    No {activeRelationshipTab} relationships found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // ============================================================================
  // RENDER: Health & Vulnerability Cards
  // ============================================================================

  const renderHealthVulnerability = () => {
    const sortedPeople = getSortedPeople();

    return (
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

        <div className="bg-white rounded-lg shadow-md border border-gray-100 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Relationship</th>
                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Active</th>
                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Historical</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedPeople.map((person) => {
              const counts = activeHealthTab === 'health'
                ? getHealthCounts(person.id)
                : getVulnerabilityCounts(person.id);
              const unsortedItems = activeHealthTab === 'health'
                ? sampleHealthItems.filter(h => h.personId === person.id)
                : sampleVulnerabilities.filter(v => v.personId === person.id);

              // Sort items so smoking status always appears first for health items
              const items = activeHealthTab === 'health'
                ? unsortedItems.sort((a, b) => {
                    const aIsSmoking = (a as HealthItem).type === 'Smoking Status';
                    const bIsSmoking = (b as HealthItem).type === 'Smoking Status';
                    if (aIsSmoking && !bIsSmoking) return -1;
                    if (!aIsSmoking && bIsSmoking) return 1;
                    return 0;
                  })
                : unsortedItems;

              const isExpanded = expandedCards.has(`${activeHealthTab}-${person.id}`);
              const fullName = `${person.title} ${person.forename} ${person.surname}`;

              return (
                <React.Fragment key={person.id}>
                  <tr
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => toggleCardExpanded(`${activeHealthTab}-${person.id}`)}
                  >
                    <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{fullName}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600">{person.relationship}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-center">
                      <span className="inline-flex items-center justify-center min-w-[24px] px-2 py-0.5 text-sm font-semibold text-primary-700 bg-primary-50 rounded">
                        {counts.active}
                      </span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-center">
                      <span className="inline-flex items-center justify-center min-w-[24px] px-2 py-0.5 text-sm font-semibold text-gray-500 bg-gray-100 rounded">
                        {counts.historical}
                      </span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-right text-sm">
                      {isExpanded ? (
                        <ChevronDownIcon className="w-5 h-5 text-gray-400 inline" />
                      ) : (
                        <ChevronRightIcon className="w-5 h-5 text-gray-400 inline" />
                      )}
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan={5} className="px-3 py-2 bg-gray-50">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-white">
                            <tr>
                              {activeHealthTab === 'health' ? (
                                <>
                                  <th className="px-2 py-1 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Condition</th>
                                  <th className="px-2 py-1 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                  <th className="px-2 py-1 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Diagnosed</th>
                                  <th className="px-2 py-1 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Medication</th>
                                  <th className="px-2 py-1 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Recorded</th>
                                  <th className="px-2 py-1 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                </>
                              ) : (
                                <>
                                  <th className="px-2 py-1 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Description</th>
                                  <th className="px-2 py-1 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Adjustments</th>
                                  <th className="px-2 py-1 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Recorded</th>
                                  <th className="px-2 py-1 text-left text-sm font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                </>
                              )}
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {items.map((item) => (
                              <tr
                                key={item.id}
                                className={`hover:bg-gray-50 cursor-pointer transition-colors ${
                                  item.status === 'Historical' ? 'opacity-40' : ''
                                }`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleItemClick(item);
                                }}
                              >
                                {activeHealthTab === 'health' ? (
                                  <>
                                    <td className="px-2 py-1.5 text-sm text-gray-900">{(item as HealthItem).name}</td>
                                    <td className="px-2 py-1.5 text-sm text-gray-600 italic">{(item as HealthItem).type}</td>
                                    <td className="px-2 py-1.5 text-sm text-gray-600">{(item as HealthItem).dateOfDiagnosis}</td>
                                    <td className="px-2 py-1.5 text-sm text-gray-600">
                                      {(item as HealthItem).medication.length > 0 ? (item as HealthItem).medication.join(', ') : 'None'}
                                    </td>
                                    <td className="px-2 py-1.5 text-sm text-gray-500">{item.dateRecorded}</td>
                                    <td className="px-2 py-1.5 text-sm">
                                      <span className={`px-1.5 py-0.5 rounded font-medium ${
                                        item.status === 'Active'
                                          ? 'bg-green-100 text-green-800'
                                          : 'bg-gray-200 text-gray-700'
                                      }`}>
                                        {item.status}
                                      </span>
                                    </td>
                                  </>
                                ) : (
                                  <>
                                    <td className="px-2 py-1.5 text-sm text-gray-900">{(item as VulnerabilityItem).vulnerabilityDescription}</td>
                                    <td className="px-2 py-1.5 text-sm text-gray-600">{(item as VulnerabilityItem).adjustments}</td>
                                    <td className="px-2 py-1.5 text-sm text-gray-500">{item.dateRecorded}</td>
                                    <td className="px-2 py-1.5 text-sm">
                                      <span className={`px-1.5 py-0.5 rounded font-medium ${
                                        item.status === 'Active'
                                          ? 'bg-green-100 text-green-800'
                                          : 'bg-gray-200 text-gray-700'
                                      }`}>
                                        {item.status}
                                      </span>
                                    </td>
                                  </>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
    );
  };

  // ============================================================================
  // RENDER: Documents
  // ============================================================================

  const renderDocuments = () => {
    // Sort documents based on client order
    // For documents with multiple people, use the earliest person in client order
    const sortedDocuments = [...sampleDocuments].sort((a, b) => {
      // Get the highest priority person (earliest in client order) for each document
      const getHighestPriorityIndex = (doc: Document) => {
        const peopleNames = doc.people;
        const indices = peopleNames.map(name => {
          const person = samplePeople.find(p => `${p.title} ${p.forename} ${p.surname}`.trim() === name);
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
            <h3 className="text-lg font-semibold">Legal Documents</h3>
          </div>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Person</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedDocuments.map((doc) => (
              <tr key={doc.id} className="hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => handleItemClick(doc)}>
                <td className="px-3 py-2 text-sm font-medium text-gray-900">{doc.name}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    doc.type === 'Will' ? 'bg-blue-100 text-blue-800' :
                    doc.type === 'Advance Directive' ? 'bg-purple-100 text-purple-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {doc.type}
                  </span>
                </td>
                <td className="px-3 py-2 text-sm text-gray-600">{doc.people.join(', ')}</td>
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
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
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
                      assessment.assessmentType === 'Finemetrica'
                        ? (assessment.riskScore && assessment.riskScore <= 3
                            ? 'bg-green-100 text-green-800'
                            : assessment.riskScore && assessment.riskScore <= 5
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-orange-100 text-orange-800')
                        : (assessment.manualRiskScore && assessment.manualRiskScore <= 3
                            ? 'bg-green-100 text-green-800'
                            : assessment.manualRiskScore && assessment.manualRiskScore <= 5
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-orange-100 text-orange-800')
                    }`}>
                      {assessment.assessmentType === 'Finemetrica'
                        ? getRiskGroupLabel(assessment.riskScore || 0)
                        : getRiskGroupLabel(assessment.manualRiskScore || 0)
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
                          ? getRiskGroupLabel(assessment.riskScore || 0)
                          : getRiskGroupLabel(assessment.manualRiskScore || 0)
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

        {/* Capacity for Loss */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-3 py-2 bg-gray-50 border-b">
            <h3 className="text-lg font-semibold">Capacity for Loss</h3>
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

  const renderClientManagement = () => {
    // Group meeting instances by year
    const instancesByYear = meetingInstances.reduce((acc, instance) => {
      if (!acc[instance.year]) {
        acc[instance.year] = [];
      }
      acc[instance.year].push(instance);
      return acc;
    }, {} as Record<number, MeetingInstance[]>);

    // Sort years in descending order (most recent first)
    const sortedYears = Object.keys(instancesByYear).map(Number).sort((a, b) => b - a);

    return (
    <div className="space-y-6">
      {/* Meeting Suite */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Meeting Suite</h3>
            <button className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 text-white text-sm font-medium rounded-md hover:bg-primary-700 transition-colors">
              <PlusIcon className="w-4 h-4" />
              Create Meeting
            </button>
          </div>
        </div>

        <div className="p-4 space-y-6">
          {/* Assigned Meetings */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Assigned Meetings</h4>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Meeting Type</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Expected Month</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {assignedMeetings.map((meeting) => (
                    <tr key={meeting.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleItemClick(meeting)}>
                      <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{meeting.meetingType}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600">{meeting.expectedMonth}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-right text-sm">
                        <ChevronRightIcon className="w-5 h-5 text-gray-400" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Meeting Instances by Year */}
          <div>
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Meeting History</h4>
            <div className="space-y-4">
              {sortedYears.map((year) => {
                const yearInstances = instancesByYear[year];

                return (
                  <div key={year} className="border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
                      <h5 className="text-sm font-semibold text-gray-900">{year}</h5>
                    </div>
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Meeting Type</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date Booked For</th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date Actually Held</th>
                          <th className="px-3 py-2"></th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {yearInstances.map((instance) => (
                          <tr key={instance.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleItemClick(instance)}>
                            <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{instance.meetingType}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600">
                              {instance.dateBookedFor || <span className="text-gray-400 italic">Not booked</span>}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-center">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                instance.hasBeenHeld ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                              }`}>
                                {instance.hasBeenHeld ? 'Held' : 'Booked'}
                              </span>
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600">
                              {instance.dateActuallyHeld ? (
                                <span className="font-medium">{instance.dateActuallyHeld}</span>
                              ) : (
                                <span className="text-gray-400 italic">-</span>
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
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Client & Fee Information */}
      <div className="bg-white rounded-lg shadow p-3">
        <h3 className="text-sm font-semibold mb-2">Client & Fee Information</h3>
        <div className="grid grid-cols-3 gap-x-4 gap-y-2">
          <div>
            <p className="text-xs text-gray-600">Lead Advisor</p>
            <p className="text-sm font-semibold text-gray-900">{clientManagementInfo.leadAdvisor}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Type of Client</p>
            <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {clientManagementInfo.typeOfClient}
            </span>
          </div>
          {clientManagementInfo.typeOfClient === 'Ongoing' && (
            <div>
              <p className="text-xs text-gray-600">Ongoing Client Start Date</p>
              <p className="text-sm font-semibold text-gray-900">{clientManagementInfo.ongoingClientStartDate}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-gray-600">Date of Client Declaration</p>
            <p className="text-sm font-semibold text-gray-900">{clientManagementInfo.dateOfClientDeclaration}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Date of Privacy Declaration</p>
            <p className="text-sm font-semibold text-gray-900">{clientManagementInfo.dateOfPrivacyDeclaration}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Last Fee Agreement</p>
            <p className="text-sm font-semibold text-gray-900">{clientManagementInfo.lastFeeAgreement}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Fee Achieved</p>
            <p className="text-sm font-semibold text-gray-900">{clientManagementInfo.feeAchieved}%</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Fixed Fee</p>
            <p className="text-sm font-semibold text-gray-900">{formatCurrency(clientManagementInfo.fixedFee)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Next Review Date</p>
            <p className="text-sm font-semibold text-gray-900">{clientManagementInfo.nextReviewDate}</p>
          </div>
        </div>
      </div>
    </div>
    );
  };

  // ============================================================================
  // RENDER: Assets & Liabilities
  // ============================================================================

  const renderAssetsLiabilities = () => {
    // Filter people based on selection and sort by client order
    const displayedPeople = samplePeople
      .filter(p => includedPeople.has(p.id))
      .sort((a, b) => {
        const indexA = clientOrder.indexOf(a.id);
        const indexB = clientOrder.indexOf(b.id);
        return indexA - indexB;
      });

    // Toggle person inclusion
    const togglePersonInclusion = (personId: string) => {
      const newIncluded = new Set(includedPeople);
      if (newIncluded.has(personId)) {
        newIncluded.delete(personId);
      } else {
        newIncluded.add(personId);
      }
      setIncludedPeople(newIncluded);
    };

    // Helper to calculate ownership amounts per person
    const getPersonOwnership = (item: Asset | Liability, personName: string): number => {
      const value = 'value' in item ? item.value : item.amount;

      if (item.ownershipType === 'sole') {
        // Sole ownership - only the named owner has 100%
        return item.owner.includes(personName) ? value : 0;
      } else if (item.ownershipType === 'joint') {
        // Joint ownership - not counted in individual columns (shown in Joint column)
        return 0;
      } else if (item.ownershipType === 'in-common') {
        // In-common ownership - use specified percentages
        const percentage = item.ownershipPercentages?.[personName] || 0;
        return (value * percentage) / 100;
      }
      return 0;
    };

    // Helper to get joint ownership amount
    const getJointOwnership = (item: Asset | Liability): number => {
      const value = 'value' in item ? item.value : item.amount;
      return item.ownershipType === 'joint' ? value : 0;
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

    // Calculate totals per person (only for displayed people)
    const personTotals = displayedPeople.map(person => {
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

    // Get sorted people for controls (by client order)
    const sortedPeople = [...samplePeople].sort((a, b) => {
      const indexA = clientOrder.indexOf(a.id);
      const indexB = clientOrder.indexOf(b.id);
      return indexA - indexB;
    });

    return (
      <div className="space-y-4">
        {/* Control Section */}
        <div className="bg-white rounded-lg shadow p-3 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-gray-900">Include People</h4>
            <div className="flex gap-2">
              <button
                onClick={() => setIncludedPeople(new Set(samplePeople.map(p => p.id)))}
                className="text-xs px-2 py-1 bg-primary-100 text-primary-700 rounded hover:bg-primary-200 transition-colors"
              >
                Select All
              </button>
              <button
                onClick={() => setIncludedPeople(new Set())}
                className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
              >
                Clear All
              </button>
              <button
                onClick={() => setShowImportModal(true)}
                className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors flex items-center gap-1"
              >
                <PlusIcon className="w-3 h-3" />
                Import from Other Client
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {sortedPeople.map(person => {
              const fullName = `${person.title} ${person.forename} ${person.surname}`.trim();
              const isIncluded = includedPeople.has(person.id);
              return (
                <button
                  key={person.id}
                  onClick={() => togglePersonInclusion(person.id)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    isIncluded
                      ? 'bg-primary-600 text-white hover:bg-primary-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {fullName}
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-3 py-2 bg-gray-50 border-b">
            <h3 className="text-lg font-semibold">Assets & Liabilities</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Asset / Liability</th>
                  {displayedPeople.map((person) => (
                    <th key={person.id} className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                      {person.forename} {person.surname}
                    </th>
                  ))}
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Joint</th>
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
                    {displayedPeople.map((person) => {
                      const personName = `${person.forename} ${person.surname}`;
                      const amount = getPersonOwnership(asset, personName);
                      return (
                        <td key={person.id} className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                          {amount > 0 ? formatCurrency(amount) : '-'}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                      {getJointOwnership(asset) > 0 ? formatCurrency(getJointOwnership(asset)) : '-'}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-right font-semibold">
                      {formatCurrency(asset.value)}
                    </td>
                  </tr>
                ))}

                {/* Assets Total Row */}
                <tr className="bg-green-50 font-bold">
                  <td className="px-3 py-2 text-sm text-gray-900">Total Assets</td>
                  {displayedPeople.map((person) => {
                    const personName = `${person.forename} ${person.surname}`;
                    const total = sampleAssets.reduce((sum, asset) => sum + getPersonOwnership(asset, personName), 0);
                    return (
                      <td key={person.id} className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                        {formatCurrency(total)}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                    {formatCurrency(sampleAssets.reduce((sum, asset) => sum + getJointOwnership(asset), 0))}
                  </td>
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
                    {displayedPeople.map((person) => {
                      const personName = `${person.forename} ${person.surname}`;
                      const amount = getPersonOwnership(liability, personName);
                      return (
                        <td key={person.id} className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                          {amount > 0 ? formatCurrency(amount) : '-'}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                      {getJointOwnership(liability) > 0 ? formatCurrency(getJointOwnership(liability)) : '-'}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-right font-semibold">
                      {formatCurrency(liability.amount)}
                    </td>
                  </tr>
                ))}

                {/* Liabilities Total Row */}
                <tr className="bg-red-50 font-bold">
                  <td className="px-3 py-2 text-sm text-gray-900">Total Liabilities</td>
                  {displayedPeople.map((person) => {
                    const personName = `${person.forename} ${person.surname}`;
                    const total = sampleLiabilities.reduce((sum, liability) => sum + getPersonOwnership(liability, personName), 0);
                    return (
                      <td key={person.id} className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                        {formatCurrency(total)}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                    {formatCurrency(sampleLiabilities.reduce((sum, liability) => sum + getJointOwnership(liability), 0))}
                  </td>
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
                    {formatCurrency(
                      sampleAssets.reduce((sum, asset) => sum + getJointOwnership(asset), 0) -
                      sampleLiabilities.reduce((sum, liability) => sum + getJointOwnership(liability), 0)
                    )}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                    {formatCurrency(netWorth)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Import Modal */}
        {showImportModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowImportModal(false)}>
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="px-6 py-4 bg-gray-50 border-b flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Import Asset/Liability from Other Client Group</h3>
                <button onClick={() => setShowImportModal(false)} className="text-gray-400 hover:text-gray-600">
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
                {!selectedClientGroup ? (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Select Client Group</h4>
                    <div className="space-y-2">
                      {otherClientGroups.map(group => (
                        <button
                          key={group.id}
                          onClick={() => setSelectedClientGroup(group.id)}
                          className="w-full text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
                        >
                          <div className="font-medium text-gray-900">{group.name}</div>
                          <div className="text-sm text-gray-600 mt-1">
                            {group.people.map(p => p.name).join(', ')}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {group.assets.length} asset{group.assets.length !== 1 ? 's' : ''}, {group.liabilities.length} liability{group.liabilities.length !== 1 ? 'ies' : ''}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="mb-4 flex items-center gap-2">
                      <button
                        onClick={() => setSelectedClientGroup(null)}
                        className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                      >
                        <ChevronLeftIcon className="w-4 h-4" />
                        Back to Client Groups
                      </button>
                    </div>

                    {(() => {
                      const group = otherClientGroups.find(g => g.id === selectedClientGroup);
                      if (!group) return null;

                      return (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900 mb-1">{group.name}</h4>
                          <p className="text-sm text-gray-600 mb-4">Select an asset or liability to import (people will be imported automatically)</p>

                          {group.assets.length > 0 && (
                            <div className="mb-6">
                              <h5 className="text-sm font-semibold text-gray-700 mb-2">Assets</h5>
                              <div className="space-y-2">
                                {group.assets.map(asset => (
                                  <button
                                    key={asset.id}
                                    onClick={() => {
                                      alert(`Import functionality: Would import "${asset.description}" with associated people`);
                                      setShowImportModal(false);
                                      setSelectedClientGroup(null);
                                    }}
                                    className="w-full text-left px-4 py-3 bg-green-50 hover:bg-green-100 rounded-lg border border-green-200 transition-colors"
                                  >
                                    <div className="flex justify-between items-start">
                                      <div className="flex-1">
                                        <div className="font-medium text-gray-900">{asset.description}</div>
                                        <div className="text-sm text-gray-600 mt-1">
                                          Type: {asset.type} • Owner: {asset.owner}
                                        </div>
                                      </div>
                                      <div className="text-sm font-semibold text-gray-900">
                                        {formatCurrency(asset.value)}
                                      </div>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {group.liabilities.length > 0 && (
                            <div>
                              <h5 className="text-sm font-semibold text-gray-700 mb-2">Liabilities</h5>
                              <div className="space-y-2">
                                {group.liabilities.map(liability => (
                                  <button
                                    key={liability.id}
                                    onClick={() => {
                                      alert(`Import functionality: Would import "${liability.description}" with associated people`);
                                      setShowImportModal(false);
                                      setSelectedClientGroup(null);
                                    }}
                                    className="w-full text-left px-4 py-3 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition-colors"
                                  >
                                    <div className="flex justify-between items-start">
                                      <div className="flex-1">
                                        <div className="font-medium text-gray-900">{liability.description}</div>
                                        <div className="text-sm text-gray-600 mt-1">
                                          Type: {liability.type} • Owner: {liability.owner}
                                        </div>
                                      </div>
                                      <div className="text-sm font-semibold text-gray-900">
                                        {formatCurrency(liability.amount)}
                                      </div>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
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
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cover Type</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Provider</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Policy Number</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lives Assured</th>
            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Sum Assured</th>
            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Monthly Payment</th>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Term</th>
            <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">In Trust</th>
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sampleProducts.map((product) => (
            <tr key={product.id} className="hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => handleItemClick(product)}>
              <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{product.coverType}</td>
              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600">{product.provider}</td>
              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600 font-mono">{product.policyNumber}</td>
              <td className="px-3 py-2 text-sm text-gray-600">
                {product.livesAssured.join(', ')}
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-right font-semibold">
                {formatCurrency(product.sumAssured)}
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                {formatCurrency(product.monthlyPayment)}
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-600">
                {product.startDate} - {product.endDate}
              </td>
              <td className="px-3 py-2 whitespace-nowrap text-sm text-center">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  product.inTrust
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {product.inTrust ? 'Yes' : 'No'}
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
  );

  // ============================================================================
  // RENDER: Aims & Objectives
  // ============================================================================

  // ============================================================================
  // RENDER: Actions (Short-term To-Do List)
  // ============================================================================

  const renderActions = () => {
    const activeActions = sampleActions.filter(action => action.status !== 'Completed');
    const completedActions = sampleActions.filter(action => action.status === 'Completed');

    return (
    <div className="space-y-4">
      {/* Client Actions */}
      <div>
        <h4 className="text-base font-semibold text-gray-900 mb-2 flex items-center gap-2">
          <UserIcon className="w-5 h-5 text-blue-600" />
          Client Actions
        </h4>
        <div className="space-y-1.5">
          {activeActions.filter(action => action.assignedTo === 'Client').map((action) => (
            <div
              key={action.id}
              className="bg-white rounded-lg shadow p-3 hover:shadow-md transition-shadow cursor-pointer border-l-4 border-blue-500"
              onClick={() => handleItemClick(action)}
            >
              <div className="flex justify-between items-start mb-1.5">
                <div className="flex-1">
                  <h5 className="text-sm font-semibold text-gray-900">{action.title}</h5>
                  <p className="text-sm text-gray-600 mt-1">{action.description}</p>
                </div>
                <div className="flex items-center gap-1.5 ml-2">
                  <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${
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
              <div className="flex justify-between items-center text-sm mt-2">
                <span className="text-gray-500">Due: {new Date(action.dueDate).toLocaleDateString('en-GB')}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Advisor Actions */}
      <div>
        <h4 className="text-base font-semibold text-gray-900 mb-2 flex items-center gap-2">
          <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          Advisor Actions
        </h4>
        <div className="space-y-1.5">
          {activeActions.filter(action => action.assignedTo === 'Advisor').map((action) => (
            <div
              key={action.id}
              className="bg-white rounded-lg shadow p-3 hover:shadow-md transition-shadow cursor-pointer border-l-4 border-primary-600"
              onClick={() => handleItemClick(action)}
            >
              <div className="flex justify-between items-start mb-1.5">
                <div className="flex-1">
                  <h5 className="text-sm font-semibold text-gray-900">{action.title}</h5>
                  <p className="text-sm text-gray-600 mt-1">{action.description}</p>
                </div>
                <div className="flex items-center gap-1.5 ml-2">
                  <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${
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
              <div className="flex justify-between items-center text-sm mt-2">
                <span className="text-gray-500">Due: {new Date(action.dueDate).toLocaleDateString('en-GB')}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Historical Actions */}
      <div className="opacity-60">
        <h4 className="text-base font-semibold text-gray-600 mb-2 flex items-center gap-2">
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Historical Actions
        </h4>
        <div className="space-y-1.5">
          {completedActions.map((action) => (
            <div
              key={action.id}
              className="bg-gray-50 rounded-lg shadow p-3 hover:shadow-md transition-shadow cursor-pointer border-l-4 border-gray-400"
              onClick={() => handleItemClick(action)}
            >
              <div className="flex justify-between items-start mb-1.5">
                <div className="flex-1">
                  <h5 className="text-sm font-semibold text-gray-700">{action.title}</h5>
                  <p className="text-sm text-gray-500 mt-1">{action.description}</p>
                </div>
                <div className="flex items-center gap-1.5 ml-2">
                  <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${
                    action.assignedTo === 'Client' ? 'bg-gray-200 text-gray-700' : 'bg-gray-200 text-gray-700'
                  }`}>
                    {action.assignedTo}
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-center text-sm mt-2">
                <span className="text-gray-500">Completed: {new Date(action.dueDate).toLocaleDateString('en-GB')}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
    );
  };

  // ============================================================================
  // RENDER: Objectives (Long-term Goals)
  // ============================================================================

  const renderObjectives = () => {
    const activeObjectives = sampleObjectives.filter(obj => obj.status !== 'Completed');
    const completedObjectives = sampleObjectives.filter(obj => obj.status === 'Completed');

    return (
    <div className="space-y-6">
      {/* Aims & Objectives Section */}
      <div>
        <div className="mb-3">
          <h3 className="text-lg font-semibold text-gray-900">Aims & Objectives</h3>
          <p className="text-sm text-gray-600">Long-term financial goals and targets</p>
        </div>
        <div className="grid grid-cols-1 gap-2">
          {activeObjectives.map((obj) => (
            <div
              key={obj.id}
              className="bg-white rounded-lg shadow p-3 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => handleItemClick(obj)}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-base font-semibold text-gray-900">{obj.title}</h3>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  obj.priority === 'High'
                    ? 'bg-red-100 text-red-800'
                    : obj.priority === 'Medium'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-green-100 text-green-800'
                }`}>
                  {obj.priority} Priority
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-2">{obj.description}</p>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">Target: {obj.targetDate}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Historical Aims and Objectives */}
      {completedObjectives.length > 0 && (
        <div className="opacity-60">
          <div className="mb-3">
            <h3 className="text-lg font-semibold text-gray-600">Historical Aims and Objectives</h3>
            <p className="text-sm text-gray-500">Completed long-term goals</p>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {completedObjectives.map((obj) => (
              <div
                key={obj.id}
                className="bg-gray-50 rounded-lg shadow p-3 hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => handleItemClick(obj)}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-base font-semibold text-gray-700">{obj.title}</h3>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-700">
                    {obj.priority} Priority
                  </span>
                </div>
                <p className="text-sm text-gray-500 mb-2">{obj.description}</p>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Target: {obj.targetDate}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
  };

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
