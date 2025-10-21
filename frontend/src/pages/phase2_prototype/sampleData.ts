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
  OtherClientGroup
} from './types';

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
    name: 'Robert Thompson',
    dateOfBirth: '15/08/1965',
    relationship: 'Accountant',
    dependency: ['James Mitchell', 'Sarah Mitchell'],
    contactDetails: '020 7123 4567 | r.thompson@accountingfirm.co.uk',
    firmName: 'Thompson & Partners Accountancy',
    status: 'Active',
    notes: 'Handles tax returns and business accounts. Annual review in March.',
  },
  {
    id: '2',
    name: 'Mary Johnson',
    dateOfBirth: '22/03/1950',
    relationship: 'Mother-in-law',
    dependency: ['Sarah Mitchell'],
    contactDetails: '07700 900 200 | mary.johnson@email.com',
    status: 'Active',
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
    status: 'Active',
    notes: 'Manages wills and estate planning. Last consultation Feb 2024.',
  },
  {
    id: '4',
    name: 'Michael Mitchell',
    dateOfBirth: '18/07/1945',
    relationship: 'Father',
    dependency: ['James Mitchell'],
    contactDetails: '01932 123 456',
    status: 'Historical',
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

export const sampleVulnerabilities: VulnerabilityItem[] = [
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

export const sampleDocuments: Document[] = [
  {
    id: '1',
    type: 'Will',
    name: 'Last Will & Testament - James Mitchell',
    people: ['James Mitchell'],
    status: 'Active',
    notes: 'Updated will following birth of grandchildren. Original held at solicitors office. Copy provided to executor.',
    dateOfWill: '15/01/2023',
    dateOfAdvDirective: '15/01/2023'
  },
  {
    id: '2',
    type: 'Will',
    name: 'Last Will & Testament - Sarah Mitchell',
    people: ['Sarah Mitchell'],
    status: 'Active',
    notes: 'Mirror will to James. Emma appointed as executor with backup executor specified.',
    dateOfWill: '15/01/2023',
    dateOfAdvDirective: '15/01/2023'
  },
  {
    id: '3',
    type: 'Advance Directive',
    name: 'Advance Healthcare Directive - Mitchell Family',
    people: ['James Mitchell', 'Sarah Mitchell'],
    status: 'Active',
    notes: 'Both clients have specified healthcare preferences. GP and family members have been notified.',
    dateOfAdvDirective: '15/01/2023'
  },
  {
    id: '4',
    type: 'LPOA',
    name: 'Lasting Power of Attorney - Mitchell Family',
    people: ['James Mitchell', 'Sarah Mitchell'],
    status: 'Active',
    notes: 'Both James and Sarah have appointed each other as primary attorney with children as replacement attorneys. Documents registered with OPG.',
    dateOfHWLPOA: '20/03/2023',
    hwLpoaIsActive: true,
    pfLpoaIsActive: true,
    dateOfAdvDirective: '20/03/2023',
    dateOfEPA: '18/02/2023',
    epaIsRegistered: true,
    other: 'Both James and Sarah have appointed each other as primary attorney with children as replacement attorneys.'
  },
  {
    id: '5',
    type: 'Will',
    name: 'Last Will & Testament - James Mitchell (2020)',
    people: ['James Mitchell'],
    status: 'Historical',
    notes: 'Previous will superseded by 2023 version. Retained for records.',
    dateOfWill: '10/05/2020',
    dateOfAdvDirective: '10/05/2020'
  },
];

export const sampleRiskAssessments: RiskAssessment[] = [
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

export const sampleCapacityToLoss: CapacityToLoss[] = [
  { id: '1', personName: 'James Mitchell', score: 7, category: 'High', dateAssessed: '12/03/2024', status: 'Active', notes: 'Strong financial position with diversified assets' },
  { id: '2', personName: 'Sarah Mitchell', score: 6, category: 'Medium-High', dateAssessed: '12/03/2024', status: 'Active', notes: 'Stable income from self-employment, moderate reserves' },
  { id: '3', personName: 'Emma Mitchell', score: 3, category: 'Low', dateAssessed: '12/03/2024', status: 'Active', notes: 'Student with limited income and assets' },
  { id: '4', personName: 'James Mitchell', score: 5, category: 'Medium', dateAssessed: '15/03/2023', status: 'Historical', notes: 'Previous assessment before portfolio rebalancing. Financial position has since improved.' },
];

export const sampleAssets: Asset[] = [
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

export const sampleLiabilities: Liability[] = [
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

export const meetingInstances: MeetingInstance[] = [
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

export const clientManagementInfo = {
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
