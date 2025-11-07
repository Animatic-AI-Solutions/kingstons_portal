// ============================================================================
// SAMPLE DATA FOR CLIENT GROUP PHASE 2 PROTOTYPE
// ============================================================================

import {
  Person,
  SpecialRelationship,
  HealthItem,
  VulnerabilityItem,
  Document,
  RiskAssessment,
  CapacityToLoss,
  Asset,
  Liability,
  Income,
  Expenditure,
  Product,
  Objective,
  Action,
  AssignedMeeting,
  MeetingInstance,
  OtherClientGroup,
  DefinedBenefitPension,
  Trusteeship,
  ClientGroupFees
} from './types';

// ============================================================================
// ASSET CATEGORY ORDERING
// ============================================================================

// Define the order for asset category subsections
export const ASSET_CATEGORY_ORDER = [
  'Cash Accounts',
  'Fixed Rate Bonds',
  'NS & I',
  'Cash ISAs',
  'LISAs',
  'S&S ISAs',
  'Onshore Bonds',
  'Offshore Bonds',
  'VCT/EIS/Tax Efficient Products',
  'Individual Equities',
  'Pensions',
  'Other Products',
  'Other Assets',
  'Property and Land',
  'Business Interests'
];

// Define the order for liability category subsections
export const LIABILITY_CATEGORY_ORDER = [
  'Mortgages',
  'Other Liabilities'
];

export const samplePeople: Person[] = [
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
    primaryEmail: 'james.m@email.com',
    secondaryEmail: 'j.mitchell@work.com',
    primaryPhone: '07700 900 123',
    secondaryPhone: '020 8940 1234',
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
    primaryEmail: 'sarah.m@email.com',
    secondaryEmail: 's.mitchell@design.co.uk',
    primaryPhone: '07700 900 124',
    secondaryPhone: '020 8940 1234',
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
    primaryEmail: 'emma.m@email.com',
    secondaryEmail: 'e.mitchell@bristol.ac.uk',
    primaryPhone: '07700 900 125',
    secondaryPhone: '',
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

export const sampleRelationships: SpecialRelationship[] = [
  {
    id: '1',
    type: 'professional',
    name: 'Robert Thompson',
    dateOfBirth: '15/08/1965',
    relationship: 'Accountant',
    dependency: ['James Mitchell', 'Sarah Mitchell'],
    address: '45 Chancery Lane, London, WC2A 1JR',
    contactDetails: '020 7123 4567 | r.thompson@accountingfirm.co.uk',
    firmName: 'Thompson & Partners Accountancy',
    status: 'Active',
    notes: 'Handles tax returns and business accounts. Annual review in March.',
  },
  {
    id: '2',
    type: 'personal',
    name: 'Mary Johnson',
    dateOfBirth: '22/03/1950',
    age: 74,
    relationship: 'Mother-in-law',
    isDependency: false,
    associatedPerson: ['Sarah Mitchell'],
    address: '12 Maple Drive, Weybridge, KT13 8PL',
    contactDetails: '07700 900 200 | mary.johnson@email.com',
    status: 'Active',
    notes: 'Lives nearby. Emergency contact for Sarah.',
  },
  {
    id: '3',
    type: 'professional',
    name: 'Elizabeth Baker',
    dateOfBirth: '10/11/1988',
    relationship: 'Solicitor',
    dependency: ['James Mitchell', 'Sarah Mitchell'],
    address: '128 High Street, Guildford, GU1 3HJ',
    contactDetails: '020 7456 7890 | e.baker@legalfirm.co.uk',
    firmName: 'Baker & Associates Legal Services',
    status: 'Active',
    notes: 'Manages wills and estate planning. Last consultation Feb 2024.',
  },
  {
    id: '4',
    type: 'personal',
    name: 'Michael Mitchell',
    dateOfBirth: '18/07/1945',
    age: 79,
    relationship: 'Father',
    isDependency: true,
    associatedPerson: ['James Mitchell'],
    address: 'Oakwood Care Facility, 22 Park Road, Walton-on-Thames, KT12 1NQ',
    contactDetails: '01932 123 456',
    status: 'Lapsed',
    notes: 'Retired. Beneficiary on James\'s life insurance policy. Moved to care facility October 2023.',
  },
];

export const sampleHealthItems: HealthItem[] = [
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
    id: 'vape-1',
    personId: '1',
    name: 'Non-vaper',
    type: 'Vaping Status',
    dateOfDiagnosis: 'N/A',
    medication: [],
    status: 'Active',
    dateRecorded: '01/2015',
    notes: 'Has never vaped. Quit smoking and did not transition to vaping.',
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
    status: 'Lapsed',
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
    id: 'vape-2',
    personId: '2',
    name: 'Occasional vaper',
    type: 'Vaping Status',
    dateOfDiagnosis: 'N/A',
    medication: [],
    status: 'Active',
    dateRecorded: '06/2023',
    notes: 'Uses vaping device occasionally at social events. Approximately 2-3 times per month.',
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
  {
    id: 'smoke-3',
    personId: '3',
    name: 'Never smoked',
    type: 'Smoking Status',
    dateOfDiagnosis: 'N/A',
    medication: [],
    status: 'Active',
    dateRecorded: '09/2023',
    notes: 'Non-smoker. Health-conscious university student.',
  },
  {
    id: 'vape-3',
    personId: '3',
    name: 'Never vaped',
    type: 'Vaping Status',
    dateOfDiagnosis: 'N/A',
    medication: [],
    status: 'Active',
    dateRecorded: '09/2023',
    notes: 'Non-vaper. Has never used vaping products.',
  },
];

export const sampleVulnerabilities: VulnerabilityItem[] = [
  {
    id: '1',
    personId: '2',
    vulnerabilityDescription: 'Recent health diagnosis affecting decision-making capacity - requires support with complex financial decisions',
    adjustments: 'Ensure all meetings include both clients, provide written summaries of discussions, allow additional time for decision-making',
    diagnosed: true,
    status: 'Active',
    dateRecorded: '01/2024',
    notes: 'Review adjustments quarterly. Sarah prefers written communication for important decisions.',
  },
  {
    id: '2',
    personId: '1',
    vulnerabilityDescription: 'Bereavement - loss of parent impacted emotional wellbeing and financial decisions',
    adjustments: 'Provided additional support during review meetings, deferred major decisions for 6 months',
    diagnosed: false,
    status: 'Lapsed',
    dateRecorded: '08/2020',
    notes: 'Father passed away August 2020. Client has fully recovered and resumed normal decision-making capacity.',
  },
];

export const sampleDocuments: Document[] = [
  {
    id: '1',
    type: 'Will',
    people: ['James Mitchell'],
    status: 'Signed',
    date: '15/01/2023',
    notes: 'Updated will following birth of grandchildren. Original held at solicitors office. Copy provided to executor.'
  },
  {
    id: '2',
    type: 'Will',
    people: ['Sarah Mitchell'],
    status: 'Signed',
    date: '15/01/2023',
    notes: 'Mirror will to James. Emma appointed as executor with backup executor specified.'
  },
  {
    id: '3',
    type: 'Advance Directive',
    people: ['James Mitchell', 'Sarah Mitchell'],
    status: 'Signed',
    date: '15/01/2023',
    notes: 'Both clients have specified healthcare preferences. GP and family members have been notified.'
  },
  {
    id: '4',
    type: 'LPA H&W',
    people: ['James Mitchell', 'Sarah Mitchell'],
    status: 'Registered',
    date: '20/03/2023',
    notes: 'Both James and Sarah have appointed each other as primary attorney with children as replacement attorneys. Documents registered with OPG.'
  },
  {
    id: '5',
    type: 'LPA P&F',
    people: ['James Mitchell', 'Sarah Mitchell'],
    status: 'Registered',
    date: '20/03/2023',
    notes: 'Both James and Sarah have appointed each other as primary attorney for property and financial affairs. Documents registered with OPG.'
  },
  {
    id: '6',
    type: 'EPA',
    people: ['James Mitchell'],
    status: 'Lapsed',
    date: '18/02/2015',
    notes: 'Previous EPA superseded by LPA documents in 2023. Retained for records.'
  },
  {
    id: '7',
    type: 'Will',
    people: ['James Mitchell'],
    status: 'Lapsed',
    date: '10/05/2020',
    notes: 'Previous will superseded by 2023 version. Retained for records.'
  },
  {
    id: '8',
    type: 'General Power of Attorney',
    people: ['Sarah Mitchell'],
    status: 'Signed',
    date: '05/06/2024',
    notes: 'Temporary GPOA granted to James Mitchell for property sale while Sarah is abroad. Valid for 6 months.'
  },
  {
    id: '9',
    type: 'Other',
    people: ['James Mitchell', 'Sarah Mitchell'],
    status: 'Signed',
    date: '12/09/2023',
    notes: 'Deed of Variation - Estate planning document to redirect inheritance from late parent. Approved by all beneficiaries.',
    other: 'Deed of Variation'
  },
];

export const sampleRiskAssessments: RiskAssessment[] = [
  {
    id: '1',
    personName: 'James Mitchell',
    assessmentType: 'Finemetrica',
    riskScore: 5,
    riskGroup: 'More Adventurous',
    rawResult: 68,
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
    rawResult: 52,
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
    rawResult: 38,
    status: 'Lapsed'
  },
];

export const sampleCapacityToLoss: CapacityToLoss[] = [
  { id: '1', personName: 'James Mitchell', score: 7, category: 'High', dateAssessed: '12/03/2024', status: 'Active', notes: 'Strong financial position with diversified assets' },
  { id: '2', personName: 'Sarah Mitchell', score: 6, category: 'Medium-High', dateAssessed: '12/03/2024', status: 'Active', notes: 'Stable income from self-employment, moderate reserves' },
  { id: '3', personName: 'Emma Mitchell', score: 3, category: 'Low', dateAssessed: '12/03/2024', status: 'Active', notes: 'Student with limited income and assets' },
  { id: '4', personName: 'James Mitchell', score: 5, category: 'Medium', dateAssessed: '15/03/2023', status: 'Lapsed', notes: 'Previous assessment before portfolio rebalancing. Financial position has since improved.' },
];

export const sampleAssets: Asset[] = [
  // Cash Accounts
  {
    id: 'cash-1',
    type: 'Current Account',
    category: 'Cash Accounts',
    description: 'Barclays Premier Current Account',
    value: 12500,
    owner: 'James Mitchell',
    ownershipType: 'sole',
    isProduct: false
  },
  {
    id: 'cash-2',
    type: 'Current Account',
    category: 'Cash Accounts',
    description: 'HSBC Advance Current Account',
    value: 8750,
    owner: 'Sarah Mitchell',
    ownershipType: 'sole',
    isProduct: false
  },
  {
    id: 'cash-3',
    type: 'Savings Account',
    category: 'Cash Accounts',
    description: 'Joint Savings Account - Emergency Fund',
    value: 45000,
    owner: 'Joint',
    ownershipType: 'joint',
    isProduct: false
  },
  {
    id: 'cash-4',
    type: 'Savings Account',
    category: 'Cash Accounts',
    description: 'Marcus Savings Account',
    value: 18500,
    owner: 'Sarah Mitchell',
    ownershipType: 'sole',
    isProduct: false
  },

  // Fixed Rate Bonds
  {
    id: 'frb-1',
    type: 'Fixed Rate Bond',
    category: 'Fixed Rate Bonds',
    description: '5 Year Fixed Rate Bond - Atom Bank',
    value: 50000,
    owner: 'James Mitchell',
    ownershipType: 'sole',
    isProduct: false
  },
  {
    id: 'frb-2',
    type: 'Fixed Rate Bond',
    category: 'Fixed Rate Bonds',
    description: '3 Year Fixed Rate Bond - Shawbrook Bank',
    value: 30000,
    owner: 'Sarah Mitchell',
    ownershipType: 'sole',
    isProduct: false
  },

  // NS & I
  {
    id: 'nsi-1',
    type: 'Premium Bonds',
    category: 'NS & I',
    description: 'Premium Bonds',
    value: 50000,
    owner: 'James Mitchell',
    ownershipType: 'sole',
    isProduct: false
  },
  {
    id: 'nsi-2',
    type: 'Premium Bonds',
    category: 'NS & I',
    description: 'Premium Bonds',
    value: 35000,
    owner: 'Sarah Mitchell',
    ownershipType: 'sole',
    isProduct: false
  },
  {
    id: 'nsi-3',
    type: 'Index-Linked Savings',
    category: 'NS & I',
    description: 'Index-Linked Savings Certificates',
    value: 25000,
    owner: 'Joint',
    ownershipType: 'joint',
    isProduct: false
  },

  // Cash ISAs
  {
    id: 'cisa-1',
    type: 'Cash ISA',
    category: 'Cash ISAs',
    description: 'Nationwide Cash ISA',
    value: 20000,
    owner: 'James Mitchell',
    ownershipType: 'sole',
    isProduct: false
  },
  {
    id: 'cisa-2',
    type: 'Cash ISA',
    category: 'Cash ISAs',
    description: 'Coventry Building Society Cash ISA',
    value: 15000,
    owner: 'Sarah Mitchell',
    ownershipType: 'sole',
    isProduct: false
  },

  // LISAs
  {
    id: 'lisa-1',
    type: 'LISA',
    category: 'LISAs',
    description: 'Lifetime ISA - Moneybox',
    value: 12000,
    owner: 'Emma Mitchell',
    ownershipType: 'sole',
    isProduct: false
  },

  // S&S ISAs
  {
    id: 'sisa-1',
    type: 'Stocks & Shares ISA',
    category: 'S&S ISAs',
    description: 'Vanguard S&S ISA - Global All Cap',
    value: 156000,
    owner: 'James Mitchell',
    ownershipType: 'sole',
    isProduct: true,
    productId: 'prod-123'
  },
  {
    id: 'sisa-2',
    type: 'Stocks & Shares ISA',
    category: 'S&S ISAs',
    description: 'Fidelity S&S ISA - Sustainable Portfolio',
    value: 98500,
    owner: 'Sarah Mitchell',
    ownershipType: 'sole',
    isProduct: true,
    productId: 'prod-789'
  },
  {
    id: 'sisa-3',
    type: 'Stocks & Shares ISA',
    category: 'S&S ISAs',
    description: 'AJ Bell S&S ISA - Dividend Growth',
    value: 42000,
    owner: 'James Mitchell',
    ownershipType: 'sole',
    isProduct: true,
    productId: 'prod-790'
  },

  // Onshore Bonds
  {
    id: 'onb-1',
    type: 'Investment Bond',
    category: 'Onshore Bonds',
    description: 'Prudential Investment Bond',
    value: 125000,
    owner: 'James Mitchell',
    ownershipType: 'sole',
    isProduct: true,
    productId: 'prod-345'
  },
  {
    id: 'onb-2',
    type: 'Investment Bond',
    category: 'Onshore Bonds',
    description: 'Aviva Managed Portfolio Bond',
    value: 85000,
    owner: 'Sarah Mitchell',
    ownershipType: 'sole',
    isProduct: true,
    productId: 'prod-346'
  },

  // Offshore Bonds
  {
    id: 'offb-1',
    type: 'Offshore Bond',
    category: 'Offshore Bonds',
    description: 'RL360 International Portfolio Bond',
    value: 175000,
    owner: 'In Common',
    ownershipType: 'in-common',
    ownershipPercentages: {
      'James Mitchell': 60,
      'Sarah Mitchell': 40
    },
    isProduct: true,
    productId: 'prod-567'
  },

  // VCT/EIS/Tax Efficient Products
  {
    id: 'vct-1',
    type: 'VCT',
    category: 'VCT/EIS/Tax Efficient Products',
    description: 'Octopus Titan VCT',
    value: 45000,
    owner: 'James Mitchell',
    ownershipType: 'sole',
    isProduct: false
  },
  {
    id: 'eis-1',
    type: 'EIS',
    category: 'VCT/EIS/Tax Efficient Products',
    description: 'Pembroke EIS Portfolio',
    value: 35000,
    owner: 'Sarah Mitchell',
    ownershipType: 'sole',
    isProduct: false
  },
  {
    id: 'eis-2',
    type: 'EIS',
    category: 'VCT/EIS/Tax Efficient Products',
    description: 'Blackfinch Ventures EIS',
    value: 28000,
    owner: 'James Mitchell',
    ownershipType: 'sole',
    isProduct: false
  },

  // Individual Equities
  {
    id: 'eq-1',
    type: 'Shares',
    category: 'Individual Equities',
    description: 'FTSE 100 Share Portfolio',
    value: 68000,
    owner: 'James Mitchell',
    ownershipType: 'sole',
    isProduct: false
  },
  {
    id: 'eq-2',
    type: 'Shares',
    category: 'Individual Equities',
    description: 'US Tech Stocks - Direct Holdings',
    value: 52000,
    owner: 'Sarah Mitchell',
    ownershipType: 'sole',
    isProduct: false
  },
  {
    id: 'eq-3',
    type: 'Shares',
    category: 'Individual Equities',
    description: 'Inherited Share Portfolio',
    value: 34500,
    owner: 'James Mitchell',
    ownershipType: 'sole',
    isProduct: false
  },

  // Pensions
  {
    id: 'pen-1',
    type: 'SIPP',
    category: 'Pensions',
    description: 'AJ Bell SIPP',
    value: 425000,
    owner: 'James Mitchell',
    ownershipType: 'sole',
    isProduct: true,
    productId: 'prod-456'
  },
  {
    id: 'pen-2',
    type: 'Workplace Pension',
    category: 'Pensions',
    description: 'Company Defined Contribution Pension',
    value: 185000,
    owner: 'James Mitchell',
    ownershipType: 'sole',
    isProduct: true,
    productId: 'prod-457'
  },
  {
    id: 'pen-3',
    type: 'SIPP',
    category: 'Pensions',
    description: 'Hargreaves Lansdown SIPP',
    value: 245000,
    owner: 'Sarah Mitchell',
    ownershipType: 'sole',
    isProduct: true,
    productId: 'prod-458'
  },
  {
    id: 'pen-4',
    type: 'Final Salary Pension',
    category: 'Pensions',
    description: 'DB Pension (Transfer Value)',
    value: 380000,
    owner: 'James Mitchell',
    ownershipType: 'sole',
    isProduct: false
  },
  {
    id: 'pen-5',
    type: 'Personal Pension',
    category: 'Pensions',
    description: 'Aviva Personal Pension',
    value: 92000,
    owner: 'Sarah Mitchell',
    ownershipType: 'sole',
    isProduct: true,
    productId: 'prod-459'
  },

  // Other Products
  {
    id: 'oth-1',
    type: 'GIA',
    category: 'Other Products',
    description: 'General Investment Account - Vanguard',
    value: 145000,
    owner: 'Joint',
    ownershipType: 'joint',
    isProduct: true,
    productId: 'prod-678'
  },
  {
    id: 'oth-2',
    type: 'Unit Trust',
    category: 'Other Products',
    description: 'Fundsmith Equity Fund',
    value: 78000,
    owner: 'James Mitchell',
    ownershipType: 'sole',
    isProduct: true,
    productId: 'prod-679'
  },
  {
    id: 'oth-3',
    type: 'OEIC',
    category: 'Other Products',
    description: 'Baillie Gifford Global Discovery',
    value: 56000,
    owner: 'Sarah Mitchell',
    ownershipType: 'sole',
    isProduct: true,
    productId: 'prod-680'
  },

  // Other Assets
  {
    id: 'oas-1',
    type: 'Collectibles',
    category: 'Other Assets',
    description: 'Art Collection',
    value: 45000,
    owner: 'Joint',
    ownershipType: 'joint',
    isProduct: false
  },
  {
    id: 'oas-2',
    type: 'Vehicle',
    category: 'Other Assets',
    description: 'BMW 5 Series',
    value: 38000,
    owner: 'James Mitchell',
    ownershipType: 'sole',
    isProduct: false
  },
  {
    id: 'oas-3',
    type: 'Vehicle',
    category: 'Other Assets',
    description: 'Audi Q5',
    value: 32000,
    owner: 'Sarah Mitchell',
    ownershipType: 'sole',
    isProduct: false
  },
  {
    id: 'oas-4',
    type: 'Jewelry',
    category: 'Other Assets',
    description: 'Jewelry & Watches',
    value: 28000,
    owner: 'Joint',
    ownershipType: 'joint',
    isProduct: false
  },

  // Property and Land
  {
    id: 'prop-1',
    type: 'Primary Residence',
    category: 'Property and Land',
    description: 'Primary Residence - Richmond',
    value: 875000,
    owner: 'Joint',
    ownershipType: 'joint',
    isProduct: false
  },
  {
    id: 'prop-2',
    type: 'Buy-to-Let',
    category: 'Property and Land',
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
  {
    id: 'prop-3',
    type: 'Buy-to-Let',
    category: 'Property and Land',
    description: 'Buy-to-Let Apartment - Manchester',
    value: 235000,
    owner: 'James Mitchell',
    ownershipType: 'sole',
    isProduct: false
  },
  {
    id: 'prop-4',
    type: 'Holiday Home',
    category: 'Property and Land',
    description: 'Holiday Cottage - Cornwall',
    value: 385000,
    owner: 'Joint',
    ownershipType: 'joint',
    isProduct: false
  },
  {
    id: 'prop-5',
    type: 'Land',
    category: 'Property and Land',
    description: 'Agricultural Land - Yorkshire (5 acres)',
    value: 125000,
    owner: 'James Mitchell',
    ownershipType: 'sole',
    isProduct: false
  },

  // Business Interests
  {
    id: 'bus-1',
    type: 'Limited Company',
    category: 'Business Interests',
    description: 'Mitchell Consulting Ltd (80% shareholding)',
    value: 450000,
    owner: 'Sarah Mitchell',
    ownershipType: 'sole',
    isProduct: false
  },
  {
    id: 'bus-2',
    type: 'Partnership',
    category: 'Business Interests',
    description: 'Richmond Business Partners LLP (40% share)',
    value: 285000,
    owner: 'James Mitchell',
    ownershipType: 'sole',
    isProduct: false
  },

  // Children's Assets - Emma Mitchell
  {
    id: 'child-1',
    type: 'Junior ISA',
    category: 'Cash ISAs',
    description: 'Junior ISA - Nationwide',
    value: 8500,
    owner: 'Emma Mitchell',
    ownershipType: 'sole',
    isProduct: false
  },
  {
    id: 'child-2',
    type: 'Savings Account',
    category: 'Cash Accounts',
    description: 'Children\'s Savings Account',
    value: 2400,
    owner: 'Emma Mitchell',
    ownershipType: 'sole',
    isProduct: false
  },
  {
    id: 'child-3',
    type: 'Premium Bonds',
    category: 'NS & I',
    description: 'Premium Bonds',
    value: 5000,
    owner: 'Emma Mitchell',
    ownershipType: 'sole',
    isProduct: false
  },
];

export const sampleLiabilities: Liability[] = [
  // Mortgages
  {
    id: 'mort-1',
    type: 'Residential Mortgage',
    category: 'Mortgages',
    description: 'Primary Residence Mortgage - Richmond',
    amount: 185000,
    monthlyPayment: 1250,
    owner: 'Joint',
    ownershipType: 'joint'
  },
  {
    id: 'mort-2',
    type: 'Buy-to-Let Mortgage',
    category: 'Mortgages',
    description: 'BTL Mortgage - Brighton Property',
    amount: 225000,
    monthlyPayment: 1050,
    owner: 'In Common',
    ownershipType: 'in-common',
    ownershipPercentages: {
      'James Mitchell': 60,
      'Sarah Mitchell': 40
    }
  },
  {
    id: 'mort-3',
    type: 'Buy-to-Let Mortgage',
    category: 'Mortgages',
    description: 'BTL Mortgage - Manchester Apartment',
    amount: 118000,
    monthlyPayment: 625,
    owner: 'James Mitchell',
    ownershipType: 'sole'
  },
  {
    id: 'mort-4',
    type: 'Second Home Mortgage',
    category: 'Mortgages',
    description: 'Holiday Cottage Mortgage - Cornwall',
    amount: 95000,
    monthlyPayment: 685,
    owner: 'Joint',
    ownershipType: 'joint'
  },

  // Other Liabilities - Car Finance
  {
    id: 'car-1',
    type: 'Car Finance',
    category: 'Other Liabilities',
    description: 'BMW 5 Series Finance',
    amount: 15000,
    monthlyPayment: 425,
    owner: 'James Mitchell',
    ownershipType: 'sole'
  },
  {
    id: 'car-2',
    type: 'Car Finance',
    category: 'Other Liabilities',
    description: 'Audi Q5 Finance',
    amount: 12500,
    monthlyPayment: 385,
    owner: 'Sarah Mitchell',
    ownershipType: 'sole'
  },

  // Other Liabilities - Personal Loans
  {
    id: 'loan-1',
    type: 'Personal Loan',
    category: 'Other Liabilities',
    description: 'Home Improvement Loan',
    amount: 22000,
    monthlyPayment: 450,
    owner: 'Joint',
    ownershipType: 'joint'
  },
  {
    id: 'loan-2',
    type: 'Business Loan',
    category: 'Other Liabilities',
    description: 'Business Development Loan',
    amount: 45000,
    monthlyPayment: 950,
    owner: 'Sarah Mitchell',
    ownershipType: 'sole'
  },

  // Other Liabilities - Credit Cards
  {
    id: 'cc-1',
    type: 'Credit Card',
    category: 'Other Liabilities',
    description: 'American Express Platinum',
    amount: 3500,
    monthlyPayment: 350,
    owner: 'James Mitchell',
    ownershipType: 'sole'
  },
  {
    id: 'cc-2',
    type: 'Credit Card',
    category: 'Other Liabilities',
    description: 'John Lewis Partnership Card',
    amount: 2200,
    monthlyPayment: 220,
    owner: 'Sarah Mitchell',
    ownershipType: 'sole'
  },
  {
    id: 'cc-3',
    type: 'Credit Card',
    category: 'Other Liabilities',
    description: 'Joint Barclaycard',
    amount: 1800,
    monthlyPayment: 180,
    owner: 'Joint',
    ownershipType: 'joint'
  },

  // Other Liabilities - Director's Loan Account
  {
    id: 'dla-1',
    type: 'Director\'s Loan',
    category: 'Other Liabilities',
    description: 'Director\'s Loan Account - Mitchell Consulting Ltd',
    amount: 18000,
    monthlyPayment: 0,
    owner: 'Sarah Mitchell',
    ownershipType: 'sole'
  },

  // Children's Liabilities - Emma Mitchell
  {
    id: 'child-loan-1',
    type: 'Personal Loan',
    category: 'Other Liabilities',
    description: 'University Expenses Loan',
    amount: 3500,
    monthlyPayment: 150,
    owner: 'Emma Mitchell',
    ownershipType: 'sole'
  },
];

// ============================================================================
// BUSINESS CLIENT GROUP - ASSETS & LIABILITIES
// ============================================================================

// Business Assets - Mitchell Consulting Ltd
export const sampleBusinessAssets: Asset[] = [
  // Cash Accounts
  {
    id: 'biz-cash-1',
    type: 'Business Current Account',
    category: 'Cash Accounts',
    description: 'Barclays Business Current Account',
    value: 85000,
    owner: 'Mitchell Consulting Ltd',
    ownershipType: 'sole',
    isProduct: false
  },
  {
    id: 'biz-cash-2',
    type: 'Business Savings Account',
    category: 'Cash Accounts',
    description: 'Business Reserve Account',
    value: 42000,
    owner: 'Mitchell Consulting Ltd',
    ownershipType: 'sole',
    isProduct: false
  },

  // Other Assets
  {
    id: 'biz-asset-1',
    type: 'Equipment',
    category: 'Other Assets',
    description: 'Office Equipment & IT Hardware',
    value: 18500,
    owner: 'Mitchell Consulting Ltd',
    ownershipType: 'sole',
    isProduct: false
  },
  {
    id: 'biz-asset-2',
    type: 'Furniture & Fixtures',
    category: 'Other Assets',
    description: 'Office Furniture & Fixtures',
    value: 12000,
    owner: 'Mitchell Consulting Ltd',
    ownershipType: 'sole',
    isProduct: false
  },
  {
    id: 'biz-asset-3',
    type: 'Vehicles',
    category: 'Other Assets',
    description: 'Company Vehicle - Mercedes Sprinter Van',
    value: 28000,
    owner: 'Mitchell Consulting Ltd',
    ownershipType: 'sole',
    isProduct: false
  },
  {
    id: 'biz-asset-4',
    type: 'Accounts Receivable',
    category: 'Other Assets',
    description: 'Outstanding Client Invoices',
    value: 65000,
    owner: 'Mitchell Consulting Ltd',
    ownershipType: 'sole',
    isProduct: false
  },
  {
    id: 'biz-asset-5',
    type: 'Inventory',
    category: 'Other Assets',
    description: 'Stock & Materials',
    value: 8500,
    owner: 'Mitchell Consulting Ltd',
    ownershipType: 'sole',
    isProduct: false
  },

  // Property and Land
  {
    id: 'biz-prop-1',
    type: 'Commercial Property',
    category: 'Property and Land',
    description: 'Office Premises - Richmond Business Park',
    value: 385000,
    owner: 'Mitchell Consulting Ltd',
    ownershipType: 'sole',
    isProduct: false
  },

  // Business Interests (if the business owns shares in other companies)
  {
    id: 'biz-invest-1',
    type: 'Investment',
    category: 'Other Products',
    description: 'Business Investment Account',
    value: 25000,
    owner: 'Mitchell Consulting Ltd',
    ownershipType: 'sole',
    isProduct: true,
    productId: 'prod-biz-001'
  },
];

// Business Liabilities - Mitchell Consulting Ltd
export const sampleBusinessLiabilities: Liability[] = [
  // Mortgages
  {
    id: 'biz-mort-1',
    type: 'Commercial Mortgage',
    category: 'Mortgages',
    description: 'Office Premises Mortgage',
    amount: 195000,
    monthlyPayment: 1450,
    owner: 'Mitchell Consulting Ltd',
    ownershipType: 'sole'
  },

  // Other Liabilities
  {
    id: 'biz-loan-1',
    type: 'Business Loan',
    category: 'Other Liabilities',
    description: 'Business Development Loan',
    amount: 75000,
    monthlyPayment: 1250,
    owner: 'Mitchell Consulting Ltd',
    ownershipType: 'sole'
  },
  {
    id: 'biz-loan-2',
    type: 'Equipment Finance',
    category: 'Other Liabilities',
    description: 'IT Equipment Finance Agreement',
    amount: 8500,
    monthlyPayment: 285,
    owner: 'Mitchell Consulting Ltd',
    ownershipType: 'sole'
  },
  {
    id: 'biz-loan-3',
    type: 'Vehicle Finance',
    category: 'Other Liabilities',
    description: 'Company Vehicle Finance',
    amount: 12000,
    monthlyPayment: 350,
    owner: 'Mitchell Consulting Ltd',
    ownershipType: 'sole'
  },
  {
    id: 'biz-overdraft-1',
    type: 'Overdraft',
    category: 'Other Liabilities',
    description: 'Business Overdraft Facility (utilized)',
    amount: 15000,
    monthlyPayment: 0,
    owner: 'Mitchell Consulting Ltd',
    ownershipType: 'sole'
  },
  {
    id: 'biz-cc-1',
    type: 'Business Credit Card',
    category: 'Other Liabilities',
    description: 'American Express Business Gold',
    amount: 4500,
    monthlyPayment: 450,
    owner: 'Mitchell Consulting Ltd',
    ownershipType: 'sole'
  },
  {
    id: 'biz-payable-1',
    type: 'Accounts Payable',
    category: 'Other Liabilities',
    description: 'Outstanding Supplier Invoices',
    amount: 28000,
    monthlyPayment: 0,
    owner: 'Mitchell Consulting Ltd',
    ownershipType: 'sole'
  },
  {
    id: 'biz-tax-1',
    type: 'Tax Liability',
    category: 'Other Liabilities',
    description: 'Corporation Tax Provision',
    amount: 32000,
    monthlyPayment: 0,
    owner: 'Mitchell Consulting Ltd',
    ownershipType: 'sole'
  },
  {
    id: 'biz-vat-1',
    type: 'VAT Liability',
    category: 'Other Liabilities',
    description: 'VAT Payable',
    amount: 18000,
    monthlyPayment: 0,
    owner: 'Mitchell Consulting Ltd',
    ownershipType: 'sole'
  },
];

// ============================================================================
// DEFINED BENEFIT PENSIONS - Family
// ============================================================================

export const sampleDefinedBenefitPensions: DefinedBenefitPension[] = [
  {
    id: 'db-1',
    schemeName: 'NHS Pension Scheme',
    provider: 'NHS Business Services Authority',
    members: ['Sarah Mitchell'],
    pensionType: 'Defined Benefit',
    estimatedAnnualIncome: 18500,
    retirementAge: 67,
    notes: 'Based on 15 years service, career average scheme'
  },
  {
    id: 'db-2',
    schemeName: 'Local Government Pension Scheme',
    provider: 'West Yorkshire Pension Fund',
    members: ['James Mitchell'],
    pensionType: 'Defined Benefit',
    estimatedAnnualIncome: 12800,
    retirementAge: 65,
    notes: 'Deferred pension from previous employment, 8 years service'
  },
  {
    id: 'db-3',
    schemeName: 'Teachers\' Pension Scheme',
    provider: 'Teachers\' Pensions',
    members: ['Sarah Mitchell'],
    pensionType: 'Hybrid',
    estimatedAnnualIncome: 8400,
    retirementAge: 67,
    notes: 'Previous teaching role, 5 years service'
  }
];

// ============================================================================
// DEFINED BENEFIT PENSIONS - Business
// ============================================================================

export const sampleBusinessDefinedBenefitPensions: DefinedBenefitPension[] = [
  {
    id: 'biz-db-1',
    schemeName: 'Mitchell Consulting Executive Pension',
    provider: 'Aviva',
    members: ['James Mitchell'],
    pensionType: 'Hybrid',
    estimatedAnnualIncome: 22000,
    retirementAge: 65,
    notes: 'Company executive pension scheme with DB and DC elements'
  }
];

// ============================================================================
// TRUSTEESHIPS - Family
// ============================================================================

export const sampleTrusteeships: Trusteeship[] = [
  {
    id: 'trust-1',
    trustName: 'Mitchell Family Trust',
    trustType: 'Discretionary Trust',
    dateEstablished: '2015-03-15',
    trustees: ['James Mitchell', 'Sarah Mitchell', 'Robert Wilson (Professional Trustee)'],
    beneficiaries: {
      'James Mitchell': 150000,
      'Sarah Mitchell': 150000,
      'Emma Mitchell': 200000
    },
    status: 'Active',
    notes: 'Established for inheritance tax planning and providing for Emma\'s future'
  },
  {
    id: 'trust-2',
    trustName: 'Education Trust Fund',
    trustType: 'Bare Trust',
    dateEstablished: '2018-09-01',
    trustees: ['James Mitchell', 'Sarah Mitchell'],
    beneficiaries: {
      'Emma Mitchell': 85000
    },
    status: 'Active',
    notes: 'Set up for Emma\'s university education and early career support'
  },
  {
    id: 'trust-3',
    trustName: 'Life Insurance Trust',
    trustType: 'Life Interest Trust',
    dateEstablished: '2012-11-20',
    trustees: ['James Mitchell', 'David Thompson (Professional Trustee)'],
    beneficiaries: {
      'Sarah Mitchell': 250000,
      'Emma Mitchell': 150000
    },
    status: 'Active',
    notes: 'Holds life insurance policies outside of estate for IHT purposes'
  }
];

// ============================================================================
// TRUSTEESHIPS - Business
// ============================================================================

export const sampleBusinessTrusteeships: Trusteeship[] = [
  {
    id: 'biz-trust-1',
    trustName: 'Mitchell Consulting Employee Benefit Trust',
    trustType: 'Employee Benefit Trust',
    dateEstablished: '2019-06-01',
    trustees: ['James Mitchell', 'Sarah Mitchell', 'John Davies (Professional Trustee)'],
    beneficiaries: {
      'James Mitchell': 180000,
      'Sarah Mitchell': 120000
    },
    status: 'Active',
    notes: 'Employee ownership trust for key management retention'
  }
];

export const sampleIncome: Income[] = [
  { id: '1', type: 'Net Pay', source: 'Kingston & Associates Ltd', amount: 75000, frequency: 'Annual', owner: 'James Mitchell' },
  { id: '2', type: 'Net Pay', source: 'Self-Employed Consultancy', amount: 45000, frequency: 'Annual', owner: 'Sarah Mitchell' },
  { id: '3', type: 'Investment Income', source: 'Stocks & Shares ISA', amount: 3500, frequency: 'Annual', owner: 'James Mitchell' },
  { id: '4', type: 'State Benefits', source: 'Child Benefit', amount: 1248, frequency: 'Annual', owner: 'Sarah Mitchell' },
];

export const sampleExpenditure: Expenditure[] = [
  { id: '1', type: 'Home', description: 'Mortgage Payment', amount: 1250, frequency: 'Monthly', essential: true },
  { id: '2', type: 'Home', description: 'Utilities (Gas, Electric, Water)', amount: 350, frequency: 'Monthly', essential: true },
  { id: '3', type: 'Home', description: 'Council Tax', amount: 185, frequency: 'Monthly', essential: true },
  { id: '4', type: 'Personal', description: 'Groceries & Food Shopping', amount: 450, frequency: 'Monthly', essential: true },
  { id: '5', type: 'Children', description: 'School Fees - Emma', amount: 850, frequency: 'Monthly', essential: true },
  { id: '6', type: 'Car(s) and Travel', description: 'Car Insurance & Tax', amount: 95, frequency: 'Monthly', essential: true },
  { id: '7', type: 'Financial', description: 'Life Insurance Premiums', amount: 125, frequency: 'Monthly', essential: true },
  { id: '8', type: 'Discretionary', description: 'Holidays & Travel', amount: 5000, frequency: 'Annual', essential: false },
  { id: '9', type: 'Discretionary', description: 'Dining Out & Entertainment', amount: 300, frequency: 'Monthly', essential: false },
];

export const sampleProducts: Product[] = [
  {
    id: '1',
    provider: 'Legal & General',
    policyNumber: 'LG-2019-847261',
    coverType: 'Life Insurance',
    termType: 'Level',
    livesAssured: ['James Mitchell'],
    sumAssured: 500000,
    duration: '25 years',
    startDate: '15/03/2019',
    monthlyPayment: 45.50,
    endDate: '15/03/2044',
    investmentElement: false,
    surrenderRelease: 'N/A',
    inTrust: true,
    trustNotes: 'Policy written in trust for Sarah and children. Discretionary trust established with Sarah as primary beneficiary and children as contingent beneficiaries.',
    notes: 'Covers mortgage and provides additional family security. Premium guaranteed for full term. Annual review scheduled for March.'
  },
  {
    id: '2',
    provider: 'Aviva',
    policyNumber: 'AV-2020-934712',
    coverType: 'Critical Illness',
    termType: 'Decreasing',
    livesAssured: ['Sarah Mitchell'],
    sumAssured: 250000,
    duration: '20 years',
    startDate: '01/06/2020',
    monthlyPayment: 62.80,
    endDate: '01/06/2040',
    investmentElement: false,
    surrenderRelease: 'N/A',
    inTrust: false,
    notes: 'Decreasing cover aligned with buy-to-let mortgage. Sum assured reduces annually. Covers major illnesses including cancer, heart attack, and stroke. Consider putting in trust.'
  },
  {
    id: '3',
    provider: 'Prudential',
    policyNumber: 'PRU-2018-562384',
    coverType: 'Whole of Life',
    termType: 'Level',
    livesAssured: ['James Mitchell', 'Sarah Mitchell'],
    sumAssured: 150000,
    duration: 'Whole of Life',
    startDate: '10/09/2018',
    monthlyPayment: 125.00,
    endDate: 'N/A',
    investmentElement: true,
    surrenderRelease: '18500',
    inTrust: true,
    trustNotes: 'Written in discretionary trust for children. Joint life second death policy for IHT planning purposes.',
    notes: 'Investment element currently valued at £18,500. Premiums reviewable every 10 years - next review September 2028.'
  }
];

export const sampleObjectives: Objective[] = [
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
  {
    id: '5',
    title: 'Maintain Financial Health',
    description: 'Ongoing review and optimization of financial position',
    targetDate: 'N/A',
    priority: 'Medium',
    status: 'Not Started',
    notes: 'Continuous objective without specific target date. Regular reviews scheduled through annual meetings.'
  },
];

export const sampleActions: Action[] = [
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

export const assignedMeetings: AssignedMeeting[] = [
  {
    id: 'am1',
    name: 'Review 1',
    meetingType: 'Review',
    expectedMonth: 'March',
    status: 'Active',
    notes: 'Annual portfolio review and financial planning session. Typically covers investment performance, goal progress, and any necessary adjustments to strategy.'
  },
  {
    id: 'am2',
    name: 'Update 1',
    meetingType: 'Update',
    expectedMonth: 'September',
    status: 'Active',
    notes: 'Mid-year check-in to review portfolio performance and address any questions or concerns. Shorter format than annual review.'
  },
  {
    id: 'am3',
    name: 'Update 2',
    meetingType: 'Update',
    expectedMonth: 'November',
    status: 'Active',
    notes: 'End-of-year planning meeting to discuss tax planning opportunities and preparation for next year.'
  },
  {
    id: 'am4',
    name: 'Update 3',
    meetingType: 'Update',
    expectedMonth: 'June',
    status: 'Lapsed',
    notes: 'Previously held mid-year update in June. Discontinued from FY 2025 onwards as client preferred fewer, more comprehensive meetings.'
  },
  {
    id: 'am5',
    name: 'Review 2',
    meetingType: 'Review',
    expectedMonth: 'October',
    status: 'Lapsed',
    notes: 'Secondary annual review discontinued after FY 2024. Client found single annual review in March sufficient for their needs.'
  },
];

export const meetingInstances: MeetingInstance[] = [
  // FY 2026 (Aug 2025 - Jul 2026) - Current year, realistic mix of statuses
  {
    id: 'mi1',
    assignedMeetingId: 'am2',
    name: 'Update 1',
    meetingType: 'Update',
    year: 2026,
    dateBookedFor: '17/09/2025',
    status: 'Complete',
    dateActuallyHeld: '17/09/2025',
    notes: 'Completed September update. Reviewed portfolio performance and discussed market outlook. Client expressed satisfaction with returns.'
  },
  {
    id: 'mi2',
    assignedMeetingId: 'am3',
    name: 'Update 2',
    meetingType: 'Update',
    year: 2026,
    dateBookedFor: '20/11/2025',
    status: 'Booked',
    notes: 'Year-end planning session booked for November. Will discuss tax planning and pension contributions before year end.'
  },
  // Note: March 2026 Review will auto-populate as "Planned" (am1)

  // FY 2025 (Aug 2024 - Jul 2025) - All complete (past year)
  {
    id: 'mi3',
    assignedMeetingId: 'am1',
    name: 'Review 1',
    meetingType: 'Review',
    year: 2025,
    dateBookedFor: '12/03/2025',
    status: 'Complete',
    dateActuallyHeld: '12/03/2025',
    notes: 'Annual review completed. Discussed pension consolidation and increased ISA contributions. Client happy with portfolio performance. Action: Research pension transfer values.'
  },
  {
    id: 'mi4',
    assignedMeetingId: 'am2',
    name: 'Update 1',
    meetingType: 'Update',
    year: 2025,
    dateBookedFor: '15/09/2024',
    status: 'Complete',
    dateActuallyHeld: '15/09/2024',
    notes: 'Mid-year update completed. Market volatility discussion and rebalancing considerations addressed. Client comfortable with strategy.'
  },
  {
    id: 'mi5',
    assignedMeetingId: 'am3',
    name: 'Update 2',
    meetingType: 'Update',
    year: 2025,
    dateBookedFor: '18/11/2024',
    status: 'Complete',
    dateActuallyHeld: '18/11/2024',
    notes: 'End of year planning completed. Maximized pension contributions and ISA allowance. Client to provide P60 in April.'
  },

  // FY 2024 (Aug 2023 - Jul 2024) - All complete (previous year)
  {
    id: 'mi6',
    assignedMeetingId: 'am1',
    name: 'Review 1',
    meetingType: 'Review',
    year: 2024,
    dateBookedFor: '10/03/2024',
    status: 'Complete',
    dateActuallyHeld: '15/03/2024',
    notes: 'Meeting rescheduled due to client illness. Discussed retirement planning and inheritance tax mitigation. Agreed to increase equity allocation by 10%.'
  },
  {
    id: 'mi7',
    assignedMeetingId: 'am4',
    name: 'Update 3',
    meetingType: 'Update',
    year: 2024,
    dateBookedFor: '18/06/2024',
    status: 'Complete',
    dateActuallyHeld: '18/06/2024',
    notes: 'June update meeting - last one before this meeting type was discontinued. Client feedback led to streamlining meeting schedule.'
  },
  {
    id: 'mi8',
    assignedMeetingId: 'am2',
    name: 'Update 1',
    meetingType: 'Update',
    year: 2024,
    dateBookedFor: '12/09/2023',
    status: 'Complete',
    dateActuallyHeld: '18/09/2023',
    notes: 'Portfolio rebalancing completed as planned. Discussed upcoming changes to pension allowances. Client expressed concern about market conditions - provided reassurance.'
  },
  {
    id: 'mi9',
    assignedMeetingId: 'am5',
    name: 'Review 2',
    meetingType: 'Review',
    year: 2024,
    dateBookedFor: '15/10/2023',
    status: 'Complete',
    dateActuallyHeld: '15/10/2023',
    notes: 'October review - last instance before discontinuation. Client agreed that single annual review in March would be more efficient.'
  },
  {
    id: 'mi10',
    assignedMeetingId: 'am3',
    name: 'Update 2',
    meetingType: 'Update',
    year: 2024,
    dateBookedFor: '14/11/2023',
    status: 'Complete',
    dateActuallyHeld: '15/11/2023',
    notes: 'Tax planning session. Reviewed capital gains position and ISA usage. Recommended additional pension contributions before year end. Client to confirm by end of month.'
  },
];

export const clientManagementInfo = {
  leadAdvisor: 'John Anderson',
  typeOfClient: 'Ongoing',
  ongoingClientStartDate: '15/06/2020',
  dateOfClientDeclaration: '10/06/2020',
  dateOfPrivacyDeclaration: '10/06/2020',
  lastFeeAgreement: '01/04/2023',
  feeAchieved: 0.95, // Percentage fee charged
  fixedFee: 15600,
  totalFUM: 1850000, // Total Funds Under Management
  nextReviewDate: '01/04/2025',
  clientSince: '15/06/2020',
  primaryAdvisor: 'John Anderson',
  meetingsPerYear: 2,
};

export const otherClientGroups: OtherClientGroup[] = [
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
// CLIENT GROUP FEES
// ============================================================================

export const clientGroupFees: ClientGroupFees[] = [
  {
    clientGroupId: 'main',
    clientGroupName: 'Mitchell Family',
    fixedFeeDirect: 15600,
    fixedFeeFacilitated: 0,
    percentageFee: 17575, // 0.95% of £1,850,000
    totalRevenue: 33175
  },
  {
    clientGroupId: 'trust-1',
    clientGroupName: 'Mitchell Family Trust',
    fixedFeeDirect: 0,
    fixedFeeFacilitated: 2400,
    percentageFee: 0,
    totalRevenue: 2400
  },
  {
    clientGroupId: 'trust-2',
    clientGroupName: 'Education Trust Fund',
    fixedFeeDirect: 0,
    fixedFeeFacilitated: 1200,
    percentageFee: 0,
    totalRevenue: 1200
  },
  {
    clientGroupId: 'trust-3',
    clientGroupName: 'Life Insurance Trust',
    fixedFeeDirect: 0,
    fixedFeeFacilitated: 800,
    percentageFee: 0,
    totalRevenue: 800
  },
  {
    clientGroupId: 'business-1',
    clientGroupName: 'Mitchell Consulting Ltd',
    fixedFeeDirect: 5000,
    fixedFeeFacilitated: 0,
    percentageFee: 0,
    totalRevenue: 5000
  }
];
