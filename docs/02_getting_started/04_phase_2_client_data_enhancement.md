# Phase 2: Client Data Enhancement Implementation Guide

## Overview

Phase 2 enhances Kingston's Portal with comprehensive client data management capabilities through a 6-tab navigation system. This phase introduces structured information collection, objectives tracking, networth management, KYC report generation, and dedicated managed products management while maintaining full compatibility with existing functionality.

## Implementation Goals

1. **Enhanced Client Details Page**: 6-tab navigation with comprehensive client data views
2. **Information Items Management**: Flexible JSON-based data collection for 5 key categories
3. **Objectives & Actions Tracking**: Goal-setting and task management for client relationships
4. **Networth Statement Generation**: Comprehensive asset/liability tracking with historical snapshots and complete data preservation
5. **KYC Report System**: Automated compliance report generation with data completeness tracking
6. **Managed Products Integration**: Dedicated tab for comprehensive product management with full functionality preservation

## 6-Tab Navigation Structure

### Tab 1: Client Overview
- Enhanced product owner cards with comprehensive client data fields
- Summary financial metrics and performance indicators
- Visual indicators for total FUM, IRR, and revenue

#### Product Owner Card Data Fields
Each product owner card displays the following detailed information:
- **Contact Information**: Email address and phone number
- **Personal Details**: Date of birth, known as (preferred name), title, NI number
- **Security Information**: Three security words for client verification
- **Notes**: Free-form notes about client preferences and details
- **Meeting Information**: Next scheduled meeting date and time
- **Compliance Tracking**: Last signed terms of business and fee agreement dates

### Tab 2: Main List (Information Items)
- 5 information item categories with flexible JSON storage
- Advanced search, filtering, and management capabilities
- Modal-based creation and editing workflows

### Tab 3: Aims, Objectives & Actions
- Comprehensive objective tracking with detailed descriptions
- Action item management with assignment and due date tracking
- Priority and status management for planning workflows
- Two-status action system (todo/completed)

### Tab 4: Networth Statement
- Asset and liability breakdown with individual ownership tracking
- Item-level managed/unmanaged status indicators
- Historical snapshot functionality with complete table data preservation
- Professional styling suitable for financial document printing
- Summary cards with visual indicators in order: Net Worth, Total Assets, Total Liabilities, Change Since Last Snapshot

### Tab 5: Know Your Customer (KYC)
- Data completeness tracking with visual progress indicators
- Section-based KYC data organization
- Automated report generation with template-based population
- Compliance status monitoring

### Tab 6: Managed Products
- Dedicated space for comprehensive product management
- Product organization by type (ISAs, GIAs, Bonds, Pensions, etc.)
- Expandable product cards with fund details and real-time loading
- Lapsed product management with reactivation functionality
- Revenue assignment and fee management
- Product creation and management workflows

## Data Structures

### Product Owner Card Structure
```json
{
  "client_id": "client_reference",
  "email_address": "client_email@domain.com",
  "phone_number": "contact_phone_number",
  "three_words": ["security_word_1", "security_word_2", "security_word_3"],
  "date_of_birth": "YYYY-MM-DD",
  "known_as": "preferred_name",
  "title": "Mr|Mrs|Ms|Dr|etc",
  "ni_number": "national_insurance_number",
  "notes": "free_form_client_notes_and_preferences",
  "next_meeting": "YYYY-MM-DD HH:MM",
  "last_signed_terms_of_business": "YYYY-MM-DD",
  "last_signed_fee_agreement": "YYYY-MM-DD"
}
```

#### Product Owner Card Display Requirements
- **Visual Layout**: Color-coded gradient cards with avatar initials
- **Data Organization**: Two-column grid layout for compact information display
- **Security Handling**: Three words displayed as comma-separated values for client verification
- **Meeting Information**: Next meeting displayed with date and time formatting
- **Compliance Tracking**: Last signed documents with clear date formatting for regulatory compliance
- **Notes Section**: Flexible text area for advisor notes and client preferences

### Information Items Structure
```json
{
  "id": "unique_identifier",
  "client_id": "client_reference", 
  "category": "basic_detail|income_expenditure|assets_liabilities|protection|vulnerability_health",
  "title": "Item Title",
  "data": {
    "flexible_json_structure": "varies_by_category",
    "custom_fields": "client_specific_data"
  },
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

#### Information Item Categories
1. **Basic Details**: Personal information, contact details, employment
2. **Income & Expenditure**: Salary, benefits, expenses, cash flow
3. **Assets & Liabilities**: Property, investments, debts, commitments  
4. **Protection**: Insurance policies, coverage levels, beneficiaries
5. **Vulnerability & Health**: Health considerations, capacity assessments

### Client Objective Structure
```json
{
  "id": "unique_identifier",
  "client_id": "client_reference",
  "title": "Objective Title",
  "description": "Detailed description explaining the objective, target amounts, strategy, and approach",
  "priority": "high|medium|low",
  "start_date": "YYYY-MM-DD",
  "target_date": "YYYY-MM-DD",
  "last_discussed": "YYYY-MM-DD",
  "status": "on-target|needs revision",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

#### Objective Date Field Definitions
- **Start Date**: When work on the objective began
- **Target Date**: When the objective should be completed
- **Last Discussed**: Most recent date this objective was reviewed or discussed with the client

#### Objective Status System
- **on-target**: Objective is progressing as planned and on track to meet targets
- **needs revision**: Objective requires review and potential adjustment to strategy, timeline, or targets

#### Example Client Objectives

1. **Retirement Planning**
   - *Description*: "Build a comprehensive retirement portfolio targeting £750,000 by age 65. Focus on maximizing pension contributions and ISA allowances while maintaining appropriate risk levels for long-term growth."
   - *Priority*: High
   - *Start Date*: 2024-01-15
   - *Target Date*: 2030-12-31
   - *Last Discussed*: 2024-08-20
   - *Status*: On Target

2. **House Purchase**
   - *Description*: "Save for deposit on family home in Surrey area. Target property value £450,000 requiring £90,000 deposit plus stamp duty and legal costs. Maintain funds in accessible investments."
   - *Priority*: Medium
   - *Start Date*: 2024-03-10
   - *Target Date*: 2026-06-30
   - *Last Discussed*: 2024-08-15
   - *Status*: Needs Revision

3. **Children's Education Fund**
   - *Description*: "Establish education savings for two children currently aged 8 and 10. Target £40,000 per child for university costs including accommodation. Utilize Junior ISAs and education-specific savings products."
   - *Priority*: Medium
   - *Start Date*: 2024-02-01
   - *Target Date*: 2032-09-01
   - *Last Discussed*: 2024-08-25
   - *Status*: On Target

#### Objective-Action Linking
Objectives can have multiple actions linked to them through the `objective_id` field in the Action Items structure. This creates a hierarchical relationship where:

- **Linked Actions**: Actions associated with a specific objective via `objective_id`
- **Unlinked Actions**: Standalone actions with `objective_id = null`

**Display Features:**
- Linked actions appear as collapsible segments within their parent objective card
- Each objective shows the count of linked actions with expand/collapse functionality
- Unlinked actions appear in separate "Unlinked Actions" sections
- Actions maintain full functionality (edit, delete, status tracking) in both contexts

### Action Items Structure
```json
{
  "id": "unique_identifier",
  "client_id": "client_reference",
  "objective_id": "optional_objective_reference",
  "title": "Action Title",
  "description": "Detailed description of the action, steps required, and expected outcomes",
  "date_created": "YYYY-MM-DD",
  "target_date": "YYYY-MM-DD",
  "drop_dead_date": "YYYY-MM-DD",
  "assigned_to": "user_id_or_name",
  "assignment_type": "advisor|client|other",
  "status": "todo|completed",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

#### Action Item Date Field Definitions
- **Date Created**: When the action item was initially created
- **Target Date**: The official deadline for completion
- **Drop Dead Date**: The absolute final deadline after which the action becomes critical or invalid

#### Example Action Items

1. **Review Pension Contributions** (*👨‍💼 Advisor*)
   - *Description*: "Analyze current pension contributions across all schemes including workplace pension and SIPP. Consider increasing contributions to maximize annual allowance and tax efficiency. Review provider performance and fees."
   - *Date Created*: 2024-08-15
   - *Target Date*: 2024-09-15
   - *Drop Dead Date*: 2024-09-20
   - *Assigned To*: John Advisor
   - *Assignment Type*: Advisor
   - *Status*: To-Do

2. **Provide Salary Documentation** (*👤 Client*)
   - *Description*: "Gather and provide recent P60s, last 3 months payslips, and employment contract. Client to collect these documents from HR department and scan for secure upload."
   - *Date Created*: 2024-08-20
   - *Target Date*: 2024-09-20
   - *Drop Dead Date*: 2024-09-25
   - *Assigned To*: John Smith (Client)
   - *Assignment Type*: Client
   - *Status*: To-Do

3. **Complete Risk Questionnaire** (*👤 Client*)
   - *Description*: "Fill out comprehensive attitude to risk questionnaire online. Client to complete all sections including capacity for loss assessment and investment experience details."
   - *Date Created*: 2024-08-18
   - *Target Date*: 2024-09-25
   - *Drop Dead Date*: 2024-09-30
   - *Assigned To*: Mary Smith (Client)
   - *Assignment Type*: Client
   - *Status*: To-Do

4. **Property Valuation Report** (*🏢 Third Party*)
   - *Description*: "Independent surveyor to conduct full structural survey and valuation of current property for refinancing purposes. Third-party appointment arranged through mortgage broker."
   - *Date Created*: 2024-08-25
   - *Target Date*: 2024-10-10
   - *Drop Dead Date*: 2024-10-15
   - *Assigned To*: ABC Surveyors Ltd
   - *Assignment Type*: Other
   - *Status*: To-Do

### Networth Snapshot Structure

#### Data Organization by Item Types
The networth statement organizes data hierarchically by item types, with individual items and subtotals. The managed/unmanaged status is specified at the individual item level to allow mixed management status within the same item type category. Data keys correspond to the product owner's "known as" names for display purposes:

```json
{
  "id": "unique_identifier",
  "client_id": "client_reference", 
  "snapshot_date": "YYYY-MM-DD HH:MM:SS",
  "created_by": "user_id",
  "data": {
    "item_types": [
      {
        "type": "GIAs",
        "items": [
          {
            "name": "Zurich Vista GIA",
            "is_managed": true,
            "john": 125000,
            "mary": 95000,
            "joint": 0,
            "total": 220000
          }
        ]
      },
      {
        "type": "Bank Accounts",
        "items": [
          {
            "name": "Natwest Current Account",
            "is_managed": true,
            "john": 2250,
            "mary": 1750,
            "joint": 0,
            "total": 4000
          },
          {
            "name": "Barclays (unmanaged)",
            "is_managed": false,
            "john": 0,
            "mary": 0,
            "joint": 4500,
            "total": 4500
          }
        ]
      }
    ],
    "summary": {
      "managed_total": 425000,
      "unmanaged_total": 48000,
      "total_assets": 473000,
      "total_liabilities": 25000,
      "net_worth": 448000,
      "change_since_last": {
        "value": 12500,
        "percentage": 2.8,
        "last_snapshot_date": "2024-04-15",
        "last_snapshot_net_worth": 435500,
        "period_display": "Apr 24 to Aug 25",
        "current_date": "2025-08-28"
      }
    }
  }
}
```

#### Summary Cards Display Requirements

**Card Order and Layout:**
1. **Net Worth**: Primary metric, highlighted in blue, showing calculated net worth (assets minus liabilities)
2. **Total Assets**: Sum of all asset values, highlighted in green  
3. **Total Liabilities**: Sum of all liability values, highlighted in red
4. **Change Since Last Snapshot**: Comparison with previous snapshot, highlighted in purple

**Change Calculation Display:**
- **Value Change**: Absolute monetary difference from last snapshot (e.g., "+£12,500")
- **Percentage Change**: Relative percentage change from last snapshot (e.g., "+2.8%")
- **Period Display**: Time period showing "MMM YY to MMM YY" format from last snapshot to current date (e.g., "Apr 24 to Aug 25")
- **Color Coding**: Green for positive changes, red for negative changes
- **Historical Reference**: Change calculated against the most recent saved snapshot
- **Three-Line Format**: Value change, percentage change, and period display for complete context

#### Table Display Requirements

**Professional Styling Standards:**
- **Section Headers**: Bold uppercase text, dark gray borders, no background colors
- **Individual Items**: Clean indentation, light gray text, hover effects
- **Managed/Unmanaged Indicators**: Color-coded badges (green for managed, gray for unmanaged)
- **Section Subtotals**: Light gray backgrounds, semibold italic text, clear borders  
- **Grand Totals**: Prominent borders, bold text, professional hierarchy
- **Monochromatic Design**: Gray color scheme suitable for financial documents
- **Typography**: Consistent font weights and right-aligned monetary values

**Column Header Requirements:**
- **Product Owner Names**: Column headers use "known as" names from product owner cards (e.g., "John", "Mary") rather than full legal names
- **Joint Holdings**: "Joint" column for jointly owned assets
- **Total Column**: Aggregated total values across all ownership types
- **Consistent Naming**: Column headers must match the known-as field from the client's product owner information

**Hierarchical Structure:**
1. Item type header (e.g., "GIAS", "BANK ACCOUNTS")
2. Individual items with specific names, managed/unmanaged status badges, and ownership breakdown
3. Section subtotal with calculated totals per item type
4. Grand total across all asset types with ownership distribution

**Complete Data Preservation:**
- **Historical Snapshots**: Full table structure and data preserved for retrospective viewing
- **Print Capability**: Professional styling suitable for printed financial documents
- **Audit Trail**: Complete data capture including individual item details, ownership breakdown, and management status
- **Comparison Support**: Historical snapshots enable period-over-period analysis
```

### KYC Data Structure
```json
{
  "client_id": "client_reference",
  "personal_details": {
    "completeness": "percentage",
    "data": "structured_personal_information"
  },
  "financial_position": {
    "completeness": "percentage", 
    "data": "income_assets_liabilities_from_information_items"
  },
  "investment_experience": {
    "completeness": "percentage",
    "data": "risk_tolerance_experience_level"
  },
  "objectives": {
    "completeness": "percentage",
    "data": "linked_to_objectives_table"
  },
  "overall_completeness": "calculated_average",
  "last_updated": "timestamp"
}
```

### Managed Products Integration
The Managed Products tab provides dedicated access to all client product management functionality, moved from the main client details page for better organization and focused user experience.

#### Key Features:
- **Product Organization**: Automatic grouping by product type (ISAs, GIAs, Onshore Bonds, Offshore Bonds, Pensions, Other)
- **Expandable Product Cards**: Click to expand and view detailed fund breakdowns with real-time loading
- **Revenue Management**: Integrated "Assign Fees" functionality for fixed costs and percentage fees
- **Product Lifecycle**: Support for active and lapsed products with reactivation capabilities
- **Creation Workflows**: Direct links to product creation with proper return navigation
- **Real-time Data**: Full integration with existing API endpoints and state management

#### Product Card Structure:
- Provider-themed styling with color-coded borders
- Financial metrics display (total value, IRR, revenue)
- Fund details on expansion with loading states
- Product owner information
- Status indicators and management actions

## Database Schema Requirements

### New Tables

#### `information_items`
- `id` (Primary Key)
- `client_id` (Foreign Key to client_groups)
- `category` (Enum: basic_detail, income_expenditure, assets_liabilities, protection, vulnerability_health)
- `title` (VARCHAR)
- `data` (JSONB for PostgreSQL flexibility)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

#### `client_objectives`
- `id` (Primary Key)
- `client_id` (Foreign Key to client_groups)
- `title` (VARCHAR)
- `description` (TEXT)
- `priority` (Enum: high, medium, low)
- `start_date` (DATE)
- `target_date` (DATE)
- `last_discussed` (DATE)
- `status` (Enum: on-target, needs revision)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

#### `action_items`
- `id` (Primary Key) 
- `client_id` (Foreign Key to client_groups)
- `objective_id` (Foreign Key to client_objectives, nullable)
- `title` (VARCHAR)
- `description` (TEXT)
- `date_created` (DATE)
- `target_date` (DATE)
- `drop_dead_date` (DATE)
- `assigned_to` (VARCHAR or Foreign Key to users)
- `assignment_type` (Enum: advisor, client, other)
- `status` (Enum: todo, completed)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

#### `networth_snapshots`
- `id` (Primary Key)
- `client_id` (Foreign Key to client_groups)
- `snapshot_date` (TIMESTAMP)
- `created_by` (Foreign Key to users)
- `data` (JSONB containing full networth breakdown)
- `net_worth` (DECIMAL for quick access)
- `created_at` (TIMESTAMP)

#### `kyc_data`
- `client_id` (Primary Key, Foreign Key to client_groups)
- `personal_details_completeness` (INTEGER 0-100)
- `financial_position_completeness` (INTEGER 0-100)
- `investment_experience_completeness` (INTEGER 0-100)
- `objectives_completeness` (INTEGER 0-100)
- `overall_completeness` (INTEGER 0-100, calculated)
- `data` (JSONB containing structured KYC information)
- `last_updated` (TIMESTAMP)

## API Endpoints

### Information Items
- `GET /api/information_items/{client_id}` - List all information items for client
- `POST /api/information_items` - Create new information item
- `PUT /api/information_items/{id}` - Update information item
- `DELETE /api/information_items/{id}` - Delete information item

### Objectives
- `GET /api/objectives/{client_id}` - List client objectives
- `POST /api/objectives` - Create new objective
- `PUT /api/objectives/{id}` - Update objective
- `DELETE /api/objectives/{id}` - Delete objective

### Actions
- `GET /api/actions/{client_id}` - List action items for client
- `POST /api/actions` - Create new action item
- `PUT /api/actions/{id}` - Update action item
- `DELETE /api/actions/{id}` - Delete action item

### Networth
- `GET /api/networth/{client_id}` - Get current networth calculation
- `GET /api/networth/{client_id}/snapshots` - List historical snapshots
- `POST /api/networth/{client_id}/snapshot` - Create networth snapshot
- `GET /api/networth/snapshot/{id}` - Get specific snapshot

### KYC
- `GET /api/kyc/{client_id}` - Get KYC data and completeness
- `PUT /api/kyc/{client_id}` - Update KYC data
- `POST /api/kyc/{client_id}/report` - Generate KYC report

## Frontend Implementation

### Component Structure
- `Phase2TabNavigation` - Main 6-tab navigation container
- `ClientOverviewTab` - Enhanced financial summary and metrics display
- `MainListTab` - Information items management across 5 categories
- `ObjectivesTab` - Objectives and actions tracking with assignment types, objective-action linking, and collapsible action segments
- `NetworthTab` - Networth display, snapshot management, and print functionality
- `KYCTab` - KYC data completeness tracking and report generation
- `ManagedProductsTab` - Comprehensive product management with full functionality preservation

### UI Requirements
- Responsive design for all screen sizes
- Loading states for all async operations
- Error handling and user feedback
- Accessibility compliance (WCAG 2.1 AA)
- Consistent styling with existing Kingston's Portal design system

#### Objective-Action Linking UI Features
- **Collapsible Action Segments**: Expandable/collapsible sections within objective cards showing linked actions
- **Action Count Indicators**: Clear display of linked action counts with visual expand/collapse controls
- **Hierarchical Display**: Visual hierarchy showing objective-action relationships with indentation and borders
- **Status Integration**: Completed action indicators within linked action segments
- **Separate Unlinked Actions**: Clear separation of standalone actions in dedicated sections
- **Interactive Controls**: Click-to-expand functionality with smooth transitions and visual feedback

## Security Considerations

1. **Data Privacy**: All client data encrypted at rest and in transit
2. **Access Control**: Role-based permissions for viewing/editing client data
3. **Audit Trail**: Full logging of data changes with user attribution
4. **Data Validation**: Strict input validation for all JSON data structures
5. **Compliance**: GDPR and financial services regulation compliance

## Testing Strategy

### Unit Tests
- Component rendering and interaction tests
- API endpoint functionality tests
- Data validation and transformation tests

### Integration Tests
- Full user workflow testing
- Database operation testing
- Cross-tab data consistency testing

### User Acceptance Testing
- Advisor workflow validation
- Client data accuracy verification
- Report generation quality assurance

## Deployment Considerations

1. **Database Migration**: Careful migration of existing client data
2. **Backward Compatibility**: Ensure existing functionality remains intact
3. **Performance**: Optimize for large datasets and concurrent users
4. **Monitoring**: Implement comprehensive logging and error tracking
5. **Training**: User training materials for new functionality

## Success Metrics

1. **User Adoption**: Percentage of advisors using Phase 2 features
2. **Data Quality**: Completeness of client information items
3. **Efficiency**: Time savings in client data management
4. **Compliance**: KYC report generation accuracy and completeness
5. **Client Satisfaction**: Feedback on enhanced client service capabilities

This Phase 2 implementation provides a comprehensive foundation for enhanced client data management while maintaining the flexibility to adapt to evolving business requirements.