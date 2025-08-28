# Phase 2: Client Data Enhancement Implementation Guide

## Overview

Phase 2 enhances Kingston's Portal with comprehensive client data management capabilities through a 5-tab navigation system. This phase introduces structured information collection, objectives tracking, networth management, and KYC report generation while maintaining compatibility with existing managed product functionality.

## Implementation Goals

1. **Enhanced Client Details Page**: 5-tab navigation with comprehensive client data views
2. **Information Items Management**: Flexible JSON-based data collection for 5 key categories
3. **Objectives & Actions Tracking**: Goal-setting and task management for client relationships
4. **Networth Statement Generation**: Comprehensive asset/liability tracking with historical snapshots
5. **KYC Report System**: Automated compliance report generation with data completeness tracking

## 5-Tab Navigation Structure

### Tab 1: Client Overview
- Enhanced product owner cards with detailed functionality explanations
- Integration with existing managed products system
- Visual indicators for product performance and revenue

### Tab 2: Main List (Information Items)
- 5 information item categories with flexible JSON storage
- Advanced search, filtering, and management capabilities
- Modal-based creation and editing workflows

### Tab 3: Aims, Objectives & Actions
- Comprehensive objective tracking with detailed descriptions
- Action item management with assignment and due date tracking
- Priority and status management for planning workflows

### Tab 4: Networth Statement
- Asset and liability breakdown with ownership tracking
- Historical snapshot functionality for audit trails
- Integration of both managed and unmanaged products
- Summary cards with visual indicators

### Tab 5: Know Your Customer (KYC)
- Data completeness tracking with visual progress indicators
- Section-based KYC data organization
- Automated report generation with template-based population
- Compliance status monitoring

## Data Structures

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
  "target_date": "YYYY-MM-DD",
  "status": "planning|in_progress|completed|cancelled",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

#### Example Client Objectives

1. **Retirement Planning**
   - *Description*: "Build a comprehensive retirement portfolio targeting £750,000 by age 65. Focus on maximizing pension contributions and ISA allowances while maintaining appropriate risk levels for long-term growth."
   - *Priority*: High
   - *Target Date*: 2030-12-31
   - *Status*: In Progress

2. **House Purchase**
   - *Description*: "Save for deposit on family home in Surrey area. Target property value £450,000 requiring £90,000 deposit plus stamp duty and legal costs. Maintain funds in accessible investments."
   - *Priority*: Medium  
   - *Target Date*: 2026-06-30
   - *Status*: Planning

3. **Children's Education Fund**
   - *Description*: "Establish education savings for two children currently aged 8 and 10. Target £40,000 per child for university costs including accommodation. Utilize Junior ISAs and education-specific savings products."
   - *Priority*: Medium
   - *Target Date*: 2032-09-01
   - *Status*: Planning

### Action Items Structure
```json
{
  "id": "unique_identifier",
  "client_id": "client_reference",
  "objective_id": "optional_objective_reference",
  "title": "Action Title",
  "description": "Detailed description of the action, steps required, and expected outcomes",
  "due_date": "YYYY-MM-DD",
  "assigned_to": "user_id_or_name",
  "assignment_type": "advisor|client|other",
  "status": "todo|completed",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

#### Example Action Items

1. **Review Pension Contributions** (*👨‍💼 Advisor*)
   - *Description*: "Analyze current pension contributions across all schemes including workplace pension and SIPP. Consider increasing contributions to maximize annual allowance and tax efficiency. Review provider performance and fees."
   - *Due Date*: 2024-09-15
   - *Assigned To*: John Advisor
   - *Assignment Type*: Advisor
   - *Status*: To-Do

2. **Provide Salary Documentation** (*👤 Client*)
   - *Description*: "Gather and provide recent P60s, last 3 months payslips, and employment contract. Client to collect these documents from HR department and scan for secure upload."
   - *Due Date*: 2024-09-20
   - *Assigned To*: John Smith (Client)
   - *Assignment Type*: Client
   - *Status*: To-Do

3. **Complete Risk Questionnaire** (*👤 Client*)
   - *Description*: "Fill out comprehensive attitude to risk questionnaire online. Client to complete all sections including capacity for loss assessment and investment experience details."
   - *Due Date*: 2024-09-25
   - *Assigned To*: Mary Smith (Client)
   - *Assignment Type*: Client
   - *Status*: To-Do

4. **Property Valuation Report** (*🏢 Third Party*)
   - *Description*: "Independent surveyor to conduct full structural survey and valuation of current property for refinancing purposes. Third-party appointment arranged through mortgage broker."
   - *Due Date*: 2024-10-10
   - *Assigned To*: ABC Surveyors Ltd
   - *Assignment Type*: Other
   - *Status*: To-Do

### Networth Snapshot Structure

#### Data Organization by Item Types
The networth statement organizes data hierarchically by item types, with individual items and subtotals. The managed/unmanaged status is specified at the individual item level to allow mixed management status within the same item type category:

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
      "net_worth": 448000
    }
  }
}
```

#### Table Display Requirements

**Professional Styling Standards:**
- **Section Headers**: Bold uppercase text, dark gray borders, no background colors
- **Individual Items**: Clean indentation, light gray text, hover effects
- **Section Subtotals**: Light gray backgrounds, semibold italic text, clear borders  
- **Grand Totals**: Prominent borders, bold text, professional hierarchy
- **Monochromatic Design**: Gray color scheme suitable for financial documents
- **Typography**: Consistent font weights and right-aligned monetary values

**Hierarchical Structure:**
1. Item type header (e.g., "GIAS", "BANK ACCOUNTS")
2. Individual items with specific names and ownership breakdown
3. Section subtotal with calculated totals per item type
4. Grand total across all asset types with ownership distribution
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
- `target_date` (DATE)
- `status` (Enum: planning, in_progress, completed, cancelled)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

#### `action_items`
- `id` (Primary Key) 
- `client_id` (Foreign Key to client_groups)
- `objective_id` (Foreign Key to client_objectives, nullable)
- `title` (VARCHAR)
- `description` (TEXT)
- `due_date` (DATE)
- `status` (Enum: pending, in_progress, completed, cancelled)
- `assigned_to` (VARCHAR or Foreign Key to users)
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
- `Phase2TabNavigation` - Main tab container
- `ClientOverviewTab` - Enhanced product display
- `MainListTab` - Information items management
- `ObjectivesTab` - Objectives and actions tracking
- `NetworthTab` - Networth display and snapshot management
- `KYCTab` - KYC data and report generation

### UI Requirements
- Responsive design for all screen sizes
- Loading states for all async operations
- Error handling and user feedback
- Accessibility compliance (WCAG 2.1 AA)
- Consistent styling with existing Kingston's Portal design system

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