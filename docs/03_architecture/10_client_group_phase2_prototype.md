# Client Group Phase 2 Prototype

## Overview

The **Client Group Phase 2 Prototype** is a comprehensive reimagining of the client group management interface, designed to provide a more intuitive and feature-rich experience for managing wealth management clients. This prototype represents a significant advancement in data organization and user experience design.

**Location**: `frontend/src/pages/ClientGroupPhase2.tsx`

## Key Features

### 1. Horizontal Tab Navigation

Unlike the traditional sidebar navigation, Phase 2 uses a **horizontal tab-based navigation** system that provides better space utilization and clearer context switching.

**Main Navigation Tabs**:
- **Summary**: Overview of all people in the client group with comprehensive details
- **Basic Details**: Detailed information across 6 sub-sections
- **Assets & Liabilities**: Financial position overview
- **Income & Expenditure**: Cash flow management
- **Other Products**: Insurance and protection products
- **Aims & Objectives**: Client goals and targets

### 2. Comprehensive Person Data Structure

The prototype implements a **30+ field person data structure** organized into Personal and Regulatory sections:

#### Personal Information (18 fields)
```typescript
interface Person {
  // Identity
  gender: string;
  title: string;
  forename: string;
  middleNames: string;
  surname: string;
  knownAs: string;
  previousNames: string;

  // Status & Demographics
  relationshipStatus: string;
  dateOfBirth: string;
  placeOfBirth: string;
  age: number;

  // Address
  addressLine1: string;
  addressLine2: string;
  addressLine3: string;
  addressLine4: string;
  addressLine5: string;
  postcode: string;
  dateMovedIn: string;

  // Contact & Employment
  emails: string[];
  phoneNumbers: string[];
  employmentStatus: string;
  occupation: string;
}
```

#### Regulatory Information (7 fields)
```typescript
interface Person {
  niNumber: string;
  drivingLicenseExpiry: string;
  passportExpiry: string;
  otherIds: string;
  amlCheck: string;
  safeWords: string[];
  shareDataWith: string;
}
```

### 3. Advanced Data Management

#### Special Relationships
**Comprehensive relationship tracking** with dependency management:

```typescript
interface SpecialRelationship {
  name: string;
  dateOfBirth: string;
  relationship: string;
  dependency: string[];           // Multiple people dependencies
  contactDetails: string;
  firmName?: string;              // For professional relationships
}
```

**Features**:
- Professional vs. personal relationship differentiation
- Firm name tracking for accountants, solicitors, etc.
- Multiple dependency tracking (who in the client group depends on this person)
- Visual badges for quick identification

#### Health & Vulnerability Tracking

**Active and Historical tracking** with comprehensive medical information:

**Health Items**:
```typescript
interface HealthItem {
  healthIssues: string;           // Type 2 Diabetes, etc.
  smokerStatus: string;           // Non-smoker, smoker, quit date
  medication: string;             // Current medications
  status: 'Active' | 'Historical';
  dateRecorded: string;
}
```

**Vulnerability Items**:
```typescript
interface VulnerabilityItem {
  vulnerabilityDescription: string;  // Detailed description
  adjustments: string;               // Support adjustments made
  status: 'Active' | 'Historical';
  dateRecorded: string;
}
```

**UI Features**:
- Expandable cards per person
- Toggle between Health and Vulnerability views
- Active/Historical status separation
- Count badges showing active and historical items

#### Document Management

**Specialized document types** with proper field structures:

**Wills**:
```typescript
interface WillDocument {
  type: 'Will';
  name: string;
  dateOfWill: string;
  dateOfAdvDirective: string;
}
```

**Lasting Powers of Attorney (LPOA)**:
```typescript
interface LPOADocument {
  type: 'LPOA';
  name: string;
  dateOfHWLPOA: string;              // Health & Welfare LPOA
  hwLpoaIsActive: boolean;           // H&W Active status
  pfLpoaIsActive: boolean;           // Property & Finance Active status
  dateOfAdvDirective: string;
  dateOfEPA: string;
  epaIsRegistered: boolean;
  other: string;                     // Multiline notes
}
```

**Display Features**:
- Separate tables for Wills and LPOAs
- Status badges for active/inactive states
- EPA registration tracking

### 4. Risk Assessment System

**Dual assessment type support** with proper 1-7 scoring:

#### Finemetrica Assessments
```typescript
interface FinemetricaAssessment {
  assessmentType: 'Finemetrica';
  riskScore: number;              // 1-7 scale
  riskGroup: string;              // Balanced, Conservative, etc.
  status: 'Current' | 'Historical';
}
```

#### Manual Assessments
```typescript
interface ManualAssessment {
  assessmentType: 'Manual';
  date: string;
  manualRiskScore: number;        // 1-7 scale
  gopDescription: string;         // Goals of Portfolio
  reason: string;
  status: 'Current' | 'Historical';
}
```

**Capacity to Loss Tracking**:
```typescript
interface CapacityToLoss {
  personName: string;
  score: number;                  // 1-10 scale
  category: string;               // High, Medium-High, Medium, Low
  dateAssessed: string;
  notes: string;
}
```

### 5. Client Management Suite

#### Client Information
**Lead advisor and client status tracking**:
- Lead Advisor
- Type of Client (Ongoing, One-off, etc.)
- Ongoing Client Start Date (conditional display)
- Date of Client Declaration
- Date of Privacy Declaration

#### Fee Information
- Last Fee Agreement
- Current Fee Structure
- Annual Fee Value
- Next Review Date

#### Meeting Suite
**Comprehensive meeting management**:
```typescript
interface Meeting {
  meetingType: string;            // Annual Review, Mid-Year Check-in
  meetingMonth: string;           // March 2024, etc.
  isBooked: boolean;              // Booking status
  dateHeld?: string;              // Actual meeting date
}
```

**Features**:
- Number of meetings per year displayed prominently
- Booking status badges (Booked/Not Booked)
- Date held tracking with "Not held yet" indicator
- Historical meeting records

### 6. Financial Data Management

#### Assets & Liabilities
**Comprehensive financial position tracking**:
- Asset types (Property, ISA, Pension, etc.)
- Ownership tracking (Joint, Individual)
- Current valuations
- Liability details with monthly payments
- Net worth calculation

#### Income & Expenditure
**Cash flow management**:
- Income sources by owner
- Expenditure by category
- Essential vs. Discretionary classification
- Frequency tracking (Annual, Monthly)

## UI/UX Design Patterns

### 1. Consistent Visual Design
**Matches main site aesthetics**:
- Tailwind CSS utility classes
- Primary color scheme (primary-700, primary-100)
- Shadow and border styling consistency
- Responsive grid layouts

### 2. Interactive Elements
**Enhanced user interactions**:
- Hover effects on clickable items
- Expandable/collapsible cards
- Modal dialogs for detailed views
- Status badges with color coding
- Loading states and skeletons

### 3. Data Display Strategies

**Tables**:
- Sortable columns
- Clickable rows
- Right-aligned chevron indicators
- Sticky headers for scrolling

**Cards**:
- Compact information display
- Click to expand functionality
- Visual hierarchy with icons
- Count badges for status indicators

**Forms** (in detail modals):
- Two-column grid layouts
- Inline editing capabilities
- Edit/Save/Cancel workflow
- Organized sections with headers

## Component Architecture

### Main Component Structure
```
ClientGroupPhase2
├── State Management
│   ├── activeTab (main navigation)
│   ├── activeSubTab (basic details sub-navigation)
│   ├── activeHealthTab (health/vulnerability toggle)
│   ├── expandedCards (card expansion state)
│   └── selectedItem (modal state)
├── Render Functions
│   ├── renderSummary()
│   ├── renderPeopleTable()
│   ├── renderRelationships()
│   ├── renderHealthVulnerability()
│   ├── renderDocuments()
│   ├── renderRiskAssessments()
│   ├── renderClientManagement()
│   ├── renderAssetsLiabilities()
│   ├── renderIncomeExpenditure()
│   ├── renderProducts()
│   └── renderObjectives()
└── Detail Modal
    ├── renderPersonDetail() (30+ fields)
    └── renderGenericDetail() (other items)
```

### State Management Patterns
```typescript
// Tab navigation state
const [activeTab, setActiveTab] = useState('summary');
const [activeSubTab, setActiveSubTab] = useState('people');

// Card expansion tracking
const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

// Modal management
const [selectedItem, setSelectedItem] = useState<any>(null);
const [isEditing, setIsEditing] = useState(false);
```

## Data Flow Architecture

### 1. Sample Data Pattern
**Comprehensive realistic data** for prototype demonstration:
- 3 sample people (Husband, Wife, Daughter)
- 4 special relationships (2 professional, 2 family)
- 3 health items + 2 vulnerability items
- 3 documents (2 Wills, 1 LPOA)
- 3 risk assessments
- 3 capacity to loss entries
- 5 meetings
- Full financial data (assets, liabilities, income, expenditure)
- 3 objectives

### 2. Data Aggregation
**Calculated values and counts**:
```typescript
// Health/vulnerability counts per person
const getHealthCounts = (personId: string) => {
  const items = sampleHealthItems.filter(h => h.personId === personId);
  return {
    active: items.filter(h => h.status === 'Active').length,
    historical: items.filter(h => h.status === 'Historical').length,
  };
};

// Net worth calculation
const netWorth =
  sampleAssets.reduce((sum, a) => sum + a.value, 0) -
  sampleLiabilities.reduce((sum, l) => sum + l.amount, 0);
```

## Integration Points

### 1. Route Configuration
**Sidebar integration** in `Sidebar.tsx`:
```typescript
{
  type: 'link',
  path: '/client_groups_phase2',
  label: 'Phase 2 Prototype',
  icon: <ArchiveBoxIcon />
}
```

**App routing** in `App.tsx`:
```typescript
<Route
  path="/client_groups_phase2"
  element={<AppLayout><ClientGroupPhase2 /></AppLayout>}
/>
```

### 2. Component Dependencies
**Imported components**:
- `@heroicons/react/24/outline` - Icon library
- `DynamicPageContainer` - Page layout wrapper
- Tailwind CSS - Styling framework

### 3. Future API Integration
**Prepared for backend connection**:
```typescript
// Current: Static sample data
const samplePeople: Person[] = [...];

// Future: API integration
const { data: people, isLoading, error } = useQuery(
  ['clientGroup', clientId, 'people'],
  () => api.get(`/client_groups/${clientId}/people`)
);
```

## Design Decisions

### 1. Horizontal Tabs vs. Sidebar
**Rationale**: Main application already has a sidebar for primary navigation. Using horizontal tabs for secondary navigation:
- Reduces navigation clutter
- Provides better visual hierarchy
- Maximizes content area
- Clearer context within client group

### 2. Expandable Cards for Health/Vulnerability
**Rationale**: Health and vulnerability data can be voluminous:
- Cards show summary counts without overwhelming
- Expand to show full details when needed
- Easy toggle between Active and Historical
- Clear visual separation per person

### 3. Separate Tables for Wills and LPOAs
**Rationale**: Different document types have different fields:
- Avoids empty cells in unified table
- Allows specialized column headers
- Better clarity for document-specific information
- Easier to scan and understand

### 4. Modal for Detailed Views
**Rationale**: Comprehensive data display without navigation:
- In-place editing without page changes
- Maintains context within client group
- Smooth transition to edit mode
- Consistent pattern across all data types

## Performance Considerations

### 1. Efficient State Management
**Minimal re-renders**:
- Set-based expanded card tracking
- Memoizable render functions
- Localized state updates

### 2. Conditional Rendering
**Only render active tab content**:
```typescript
const renderMainContent = () => {
  if (activeTab === 'summary') return renderSummary();
  if (activeTab === 'basic') return renderBasicDetailsContent();
  // ... other tabs
};
```

### 3. Optimized Data Filtering
**Pre-filtered data**:
```typescript
// Filter once, use multiple times
const activeHealthItems = sampleHealthItems.filter(h => h.status === 'Active');
const historicalHealthItems = sampleHealthItems.filter(h => h.status === 'Historical');
```

## Future Enhancements

### 1. API Integration
- Connect to real backend endpoints
- Implement CRUD operations
- Add optimistic updates
- Error handling and retry logic

### 2. Advanced Features
- Document upload and management
- Meeting scheduling integration
- Email/SMS notifications
- Calendar integration
- Export to PDF

### 3. User Experience
- Search and filter across all data
- Sorting on all tables
- Bulk operations
- Keyboard shortcuts
- Drag-and-drop reordering

### 4. Reporting
- Client summary reports
- Health and vulnerability reports
- Meeting attendance reports
- Financial position snapshots

## Testing Strategy

### 1. Component Testing
```typescript
describe('ClientGroupPhase2', () => {
  test('renders summary tab by default', () => {
    render(<ClientGroupPhase2 />);
    expect(screen.getByText('People in Client Group')).toBeInTheDocument();
  });

  test('switches between tabs correctly', () => {
    render(<ClientGroupPhase2 />);
    fireEvent.click(screen.getByText('Basic Details'));
    expect(screen.getByText('People')).toBeInTheDocument();
  });

  test('expands health cards when clicked', () => {
    render(<ClientGroupPhase2 />);
    fireEvent.click(screen.getByText('Health'));
    fireEvent.click(screen.getByText('James Mitchell'));
    expect(screen.getByText('Type 2 Diabetes')).toBeInTheDocument();
  });
});
```

### 2. Integration Testing
- Tab navigation flow
- Modal open/close/edit cycles
- Data filtering and display
- Conditional rendering logic

### 3. Accessibility Testing
- Keyboard navigation
- Screen reader compatibility
- ARIA labels and roles
- Focus management

## Migration Path

### Phase 1 → Phase 2 Transition
When moving from current client management to Phase 2:

1. **Data Migration**:
   - Map existing client data to new Person structure
   - Migrate health notes to structured health items
   - Convert document records to typed documents
   - Preserve all historical data

2. **User Training**:
   - Provide comparison guides
   - Highlight new features
   - Offer parallel access during transition

3. **Feature Parity**:
   - Ensure all Phase 1 features available in Phase 2
   - Add deprecation warnings in Phase 1
   - Gradual rollout with feature flags

## Conclusion

The Client Group Phase 2 Prototype represents a significant advancement in client management capabilities, providing:

- **Comprehensive data structures** for wealth management
- **Intuitive navigation** with horizontal tabs
- **Rich data display** with expandable cards and detailed modals
- **Professional UI/UX** matching site standards
- **Extensible architecture** for future enhancements

This prototype serves as a foundation for the next generation of client management in Kingston's Portal, demonstrating best practices in React/TypeScript development and modern UI design patterns.
