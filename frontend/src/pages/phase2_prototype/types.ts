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
  type: 'professional' | 'personal'; // Type of special relationship
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
  address?: string; // Address for the special relationship
  contactDetails: string;
  status: 'Active' | 'Lapsed';
  notes: string;
}

export interface HealthItem {
  id: string;
  personId?: string;
  relationshipId?: string;
  name: string;
  type: string;
  dateOfDiagnosis: string;
  medication: string[];
  status: 'Active' | 'Lapsed';
  dateRecorded: string;
  notes: string;
}

export interface VulnerabilityItem {
  id: string;
  personId?: string;
  relationshipId?: string;
  vulnerabilityDescription: string;
  adjustments: string;
  diagnosed: boolean; // Whether the condition is officially diagnosed
  status: 'Active' | 'Lapsed';
  dateRecorded: string;
  notes: string;
}

export interface Document {
  id: string;
  type: 'Will' | 'LPA H&W' | 'LPA P&F' | 'EPA' | 'Advance Directive' | 'General Power of Attorney' | 'Other';
  people: string[]; // Associated people from client group
  status: 'Signed' | 'Pending' | 'Unknown' | 'Lapsed' | 'Pending Reg' | 'Registered' | 'In Use';
  // Status usage by document type:
  // - Will: Signed, Pending, Unknown, Lapsed
  // - Advance Directive: Signed, Pending, Lapsed, Unknown
  // - General Power of Attorney: Signed, Lapsed, Unknown
  // - LPA H&W: Pending Reg, Registered, In Use, Lapsed, Unknown
  // - LPA P&F: Pending Reg, Registered, In Use, Lapsed, Unknown
  // - EPA: Signed, In Use, Lapsed, Unknown
  // - Other: In Use, Lapsed, Signed, Unknown
  date: string; // General date field for the document
  notes: string;
  // Other fields
  other?: string;
}

export interface RiskAssessment {
  id: string;
  personName: string;
  assessmentType: 'Finemetrica' | 'Manual';
  status: 'Current' | 'Lapsed';
  rawResult?: number; // Raw result out of 100
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
  status: 'Active' | 'Lapsed';
  notes: string;
}

export interface Asset {
  id: string;
  type: string;
  category: string; // Asset subsection category for grouping (Cash Accounts, Pensions, etc.)
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
  category: string; // Liability subsection category for grouping (Mortgages, Other Liabilities)
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
  surrenderRelease: string;
  inTrust: boolean;
  trustNotes?: string;
  notes: string;
}

export interface DefinedBenefitPension {
  id: string;
  schemeName: string;
  provider: string;
  members: string[]; // Array of person names who are members
  pensionType: 'Defined Benefit' | 'Hybrid';
  estimatedAnnualIncome: number;
  retirementAge: number;
  notes: string;
}

export interface Trusteeship {
  id: string;
  trustName: string;
  trustType: string;
  dateEstablished: string;
  trustees: string[]; // Array of trustee names
  beneficiaries: Record<string, number>; // { "James Mitchell": 50000, "Sarah Mitchell": 50000 }
  status: 'Active' | 'Dissolved';
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
  name: string; // Generic name like "Update 1", "Update 2"
  meetingType: 'Update' | 'Review';
  expectedMonth: string; // e.g., "March" - when this meeting should happen each year
  status: 'Active' | 'Lapsed';
  notes: string;
}

export interface MeetingInstance {
  id: string;
  assignedMeetingId: string; // Reference to the assigned meeting
  name: string; // Generic name like "Update 1", "Update 2"
  meetingType: 'Update' | 'Review';
  year: number;
  dateBookedFor?: string; // e.g., "12/03/2024"
  status: 'Planned' | 'Booked' | 'Complete' | 'Declined' | 'Moved';
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

export interface ClientGroupFees {
  clientGroupId: string;
  clientGroupName: string;
  fixedFeeDirect: number;
  fixedFeeFacilitated: number;
  percentageFee: number;
  totalRevenue: number;
}
