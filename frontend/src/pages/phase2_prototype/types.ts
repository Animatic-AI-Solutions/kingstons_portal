// ============================================================================
// TYPE DEFINITIONS FOR CLIENT GROUP PHASE 2 PROTOTYPE
// ============================================================================

export interface Person {
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
  primaryEmail: string;
  secondaryEmail: string;
  primaryPhone: string;
  secondaryPhone: string;
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

export interface SpecialRelationship {
  id: string;
  name: string;
  dateOfBirth: string;
  age?: number; // For personal relationships
  relationship: string;
  // Personal relationship fields
  isDependency?: boolean; // For personal relationships - yes/no
  associatedPerson?: string[]; // For personal relationships - which people in client group
  // Professional relationship fields
  dependency?: string[]; // For professional relationships - Array of person names in the client group
  firmName?: string; // Only for professional relationships
  contactDetails: string;
  status: 'Active' | 'Historical';
  notes: string;
}

export interface HealthItem {
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

export interface VulnerabilityItem {
  id: string;
  personId: string;
  vulnerabilityDescription: string;
  adjustments: string;
  status: 'Active' | 'Historical';
  dateRecorded: string;
  notes: string;
}

export interface Document {
  id: string;
  type: 'Will' | 'Advance Directive' | 'LPOA';
  name: string;
  people: string[]; // Associated people from client group
  status: 'Active' | 'Historical';
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

export interface RiskAssessment {
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

export interface CapacityToLoss {
  id: string;
  personName: string;
  score: number;
  category: string;
  dateAssessed: string;
  status: 'Active' | 'Historical';
  notes: string;
}

export interface Asset {
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

export interface Liability {
  id: string;
  type: string;
  description: string;
  amount: number;
  monthlyPayment: number;
  owner: string;
  ownershipType: 'sole' | 'joint' | 'in-common';
  ownershipPercentages?: Record<string, number>; // For in-common: { "James Mitchell": 60, "Sarah Mitchell": 40 }
}

export interface Income {
  id: string;
  type: 'Net Pay' | 'Secondary Wage' | 'Self Employment Profit' | 'Own Limited Company Dividends' | 'Investment Income' | 'Share Income' | 'Pension Income' | 'State Pension' | 'State Benefits' | 'Other Income';
  source: string;
  amount: number;
  frequency: string;
  owner: string;
}

export interface Expenditure {
  id: string;
  type: 'Home' | 'Personal' | 'Pets' | 'Children' | 'Financial' | 'Rental & Second Homes' | 'Car(s) and Travel' | 'Discretionary';
  description: string;
  amount: number;
  frequency: string;
  essential: boolean;
}

export interface Product {
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

export interface Objective {
  id: string;
  title: string;
  description: string;
  targetDate: string;
  priority: 'High' | 'Medium' | 'Low';
  status: 'Completed' | 'Not Started';
  notes: string;
}

export interface Action {
  id: string;
  title: string;
  description: string;
  assignedTo: 'Client' | 'Advisor';
  dueDate: string;
  status: 'Pending' | 'In Progress' | 'Completed';
  priority: 'High' | 'Medium' | 'Low';
  notes: string;
}

export interface AssignedMeeting {
  id: string;
  meetingType: 'Annual Review' | 'Additional Review' | 'Misc';
  expectedMonth: string; // e.g., "March" - when this meeting should happen each year
  notes: string;
}

export interface MeetingInstance {
  id: string;
  assignedMeetingId: string; // Reference to the assigned meeting
  meetingType: 'Annual Review' | 'Additional Review' | 'Misc';
  year: number;
  dateBookedFor?: string; // e.g., "12/03/2024"
  hasBeenHeld: boolean;
  dateActuallyHeld?: string; // e.g., "15/03/2024"
  notes: string;
}

export interface OtherClientGroup {
  id: string;
  name: string;
  people: { id: string; name: string }[];
  assets: Asset[];
  liabilities: Liability[];
}
