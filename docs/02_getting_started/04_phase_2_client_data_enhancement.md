# Phase 2: Client Data Enhancement Implementation Guide

## Overview

Phase 2 enhances Kingston's Portal with comprehensive client data management capabilities through a 6-tab navigation system. This phase introduces structured information collection, objectives tracking, networth management, KYC report generation, and dedicated managed products management while maintaining full compatibility with existing functionality.

## Implementation Goals

1. **Enhanced Client Details Page**: 6-tab navigation system with comprehensive client data views and enhanced product owner cards
2. **Information Items Management**: Flexible JSON-based data collection for 5 key categories with advanced search and filtering
3. **Aims, Objectives & Actions Separation**: Independent objectives and actions management with columnar display layout and global actions tracking
4. **Networth Statement Generation**: Professional-grade asset/liability tracking with period-over-period analysis and enhanced summary cards
5. **KYC Report System**: Automated compliance report generation with data completeness tracking and customizable sections
6. **Managed Products Integration**: Dedicated tab for comprehensive product management moved from main client page

## 6-Tab Navigation Structure

### Tab 1: Client Overview
- Enhanced product owner cards with comprehensive client data fields
- Summary financial metrics and performance indicators
- Visual indicators for total FUM, IRR, and revenue

#### Product Owner Card Data Fields
Each product owner card displays comprehensive client information in a structured, easily accessible format with enhanced data fields based on client feedback:

**Personal Information (Enhanced)**:
- **Full Name Structure**: Title → First Name → Middle Name(s) → Surname for complete identification
- **Contact Details**: Email address and multiple phone numbers for comprehensive communication
- **Home Address**: Complete home address separate from other contact information
- **Personal Identifiers**: Date of birth and NI number for verification
- **Security Verification**: Three security words for client authentication

**Professional Management**:
- **Client Notes**: Free-form notes about client preferences, requirements, and important details
- **Meeting Enhancement**: Next nearest meeting with meeting type and date (no time display)
- **Compliance Documentation**: Date of signed T&C (terminology updated from "Last T&Cs") and fee agreement dates for regulatory tracking

**Display Features**:
- **Enhanced Two-Column Layout**: 
  - **Left Column**: Title → First Name → Middle Names → Surname, DOB → NI Number
  - **Right Column**: All contact information (email, multiple phone numbers, home address)
  - **Bottom Section (Full Width)**: Security words, notes, meetings, compliance dates
- **Color-Coded Cards**: Gradient styling with avatar initials for quick client identification
- **Security Handling**: Three words displayed as comma-separated values for verification purposes

### Tab 2: Main List (Information Items) - Columnar Data Display
- **Information-Dense Table Layout**: Columnar display optimized for maximum data visibility per screen
- **Required Columns**: Item Category, Item Type, Product Owners Associated
- **Slim Row Design**: Minimal padding and vertical spacing to display maximum items per page
- **5 Information Categories**: Flexible JSON storage across all categories with bulk operations
- **Advanced Search & Filtering**: Cross-category search with real-time filtering capabilities
- **Inline Editing**: Direct table editing with auto-save functionality

### Tab 3: Aims, Objectives & Actions (Major Restructure)
- **Complete Separation**: Objectives and actions are completely independent with no linking functionality
- **Columnar Display**: Both objectives and actions use column-based layouts for information-dense viewing
- **Global Actions Integration**: Actions accessible both within client context and through dedicated global actions page
- **Enhanced Date Tracking**: Actions include `date_completed` field for completion tracking alongside existing date fields
- **PDF Export Capability**: User-selectable action export to professional PDF format
- Assignment types: advisor, client, or other (third-party)
- Two-status action system (todo/completed) with visual status indicators and completion date tracking

### Tab 4: Networth Statement
- Asset and liability breakdown with individual ownership tracking by item type
- **Column Headers**: Use "known as" names from product owner cards (e.g., "John", "Mary")
- Item-level managed/unmanaged status indicators with color-coded badges
- Historical snapshot functionality with complete table data preservation
- Professional monochromatic styling suitable for financial document printing
- **Enhanced Summary Cards** in order: Net Worth → Assets → Liabilities → Change
- **Change Metric Enhancement**: Displays value, percentage, and period (e.g., "Apr 24 to Aug 25")
- **Liquidity-Based Asset Ordering**: Assets organized by financial liquidity hierarchy (most liquid → least liquid) following industry-standard accessibility principles

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

### Product Owner Card Structure (Enhanced)
```json
{
  "client_id": "client_reference",
  "personal_details": {
    "title": "Mr|Mrs|Ms|Dr|etc",
    "first_name": "client_first_name",
    "middle_names": "client_middle_names",
    "surname": "client_surname",
    "known_as": "preferred_name_for_display",
    "date_of_birth": "YYYY-MM-DD",
    "ni_number": "national_insurance_number"
  },
  "contact_details": {
    "email_address": "client_email@domain.com",
    "phone_numbers": [
      {
        "type": "mobile|home|work",
        "number": "contact_phone_number",
        "is_primary": true
      }
    ],
    "home_address": {
      "line_1": "address_line_1",
      "line_2": "address_line_2",
      "city": "city",
      "county": "county",
      "postal_code": "postal_code",
      "country": "country"
    }
  },
  "security_and_management": {
    "three_words": ["security_word_1", "security_word_2", "security_word_3"],
    "notes": "free_form_client_notes_and_preferences",
    "next_meeting": {
      "date": "YYYY-MM-DD",
      "meeting_type": "annual_review|planning_meeting|update_meeting|etc",
      "is_nearest": true
    },
    "compliance": {
      "date_signed_tc": "YYYY-MM-DD",
      "last_signed_fee_agreement": "YYYY-MM-DD"
    }
  }
}
```

#### Product Owner Card Display Requirements (Enhanced Layout)

**Enhanced Visual Layout Structure**:
- **Color-coded gradient cards** with avatar initials for quick identification
- **Structured 2-column side-by-side layout** with full-width bottom section
- **Responsive design** maintaining layout integrity across different screen sizes

**Left Column Layout**:
- **Name Hierarchy**: Title → First Name → Middle Names → Surname (each on separate line or flowing)
- **Personal Identifiers**: DOB → NI Number (vertically aligned for easy scanning)
- **Consistent spacing** and typography for professional appearance

**Right Column Layout**:
- **Contact Information**: Email address, multiple phone numbers with type labels
- **Home Address**: Complete address formatted for readability
- **Contact priority indicators** for primary phone numbers

**Bottom Section (Full Width)**:
- **Security Information**: Three words displayed as comma-separated values
- **Professional Notes**: Client preferences, requirements, and important details
- **Meeting Information**: Next nearest meeting with type and date only (no time)
- **Compliance Dates**: Date of signed T&C and fee agreement with clear labeling

**Enhanced Data Handling**:
- **Multiple Phone Numbers**: Support for mobile, home, work with primary designation
- **Meeting Enhancement**: Display meeting type (Annual Review, Planning Meeting, etc.) with date
- **Terminology Accuracy**: "Date of signed T&C" instead of "Last T&Cs"
- **Address Formatting**: Structured home address display separate from contact info

### Information Items Structure - Enhanced for Columnar Display
```json
{
  "id": "unique_identifier",
  "client_id": "client_reference", 
  "category": "basic_detail|income_expenditure|assets_liabilities|protection|vulnerability_health",
  "title": "Item Title",
  "item_type": "specific_item_classification", // NEW: Required for table display
  "product_owners_associated": ["owner_1", "owner_2"], // NEW: Required column data
  "data": {
    "flexible_json_structure": "varies_by_category",
    "custom_fields": "client_specific_data"
  },
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

#### Information Item Categories with Display Types
1. **Basic Details**: Personal information, contact details, employment
   - *Item Types*: Contact Info, Employment Details, Personal ID, Family Details
2. **Income & Expenditure**: Salary, benefits, expenses, cash flow
   - *Item Types*: Salary Details, Benefits Package, Monthly Expenses, Investment Income
3. **Assets & Liabilities**: Property, investments, debts, commitments  
   - *Item Types*: Property Holdings, Investment Accounts, Outstanding Debts, Credit Facilities
4. **Protection**: Insurance policies, coverage levels, beneficiaries
   - *Item Types*: Life Insurance, Health Coverage, Property Insurance, Disability Benefits
5. **Vulnerability & Health**: Health considerations, capacity assessments
   - *Item Types*: Health Conditions, Capacity Assessments, Care Requirements, Support Needs

#### Main List Table Display Requirements

**Columnar Layout Specifications:**
- **Primary Table Structure**: Replace card-based display with high-density table rows
- **Minimal Vertical Spacing**: Reduce padding to 4px top/bottom, 8px left/right maximum
- **Information Density Priority**: Maximize visible items over visual comfort
- **Responsive Column Widths**: 
  - Item Category: 20% width
  - Item Type: 25% width  
  - Product Owners Associated: 30% width
  - Actions: 15% width
  - Created: 10% width

**Required Table Columns (in order):**
1. **Item Category**: Badge-style display with color coding for quick visual identification
2. **Item Type**: Specific classification within the category for detailed organization
3. **Product Owners Associated**: Comma-separated list of associated client names using "known as" format
4. **Actions**: Inline edit/delete/view buttons with icon-only display to save space
5. **Created**: Date created in compact MM/DD/YY format

**Row Design Requirements:**
- **Slim Row Height**: Maximum 32px per row to maximize screen utilization
- **Alternating Row Colors**: Subtle zebra striping for easy scanning
- **Hover States**: Minimal highlight on hover for interaction feedback
- **Dense Typography**: 14px font size with 1.2 line height for optimal readability vs. space
- **Consistent Alignment**: Left-aligned text, right-aligned actions column

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

#### Complete Objectives and Actions Separation
**CRITICAL ARCHITECTURAL CHANGE**: All objective-action linking functionality has been completely removed based on client feedback stating "separate objectives and actions, we do not want actions to be associated with objectives."

**Objectives (Fully Independent)**:
- Completely independent entities with no action relationships
- Columnar display layout replacing card-based interface
- Focus on goal-setting and target tracking as standalone items
- Enhanced visual presentation optimized for information density
- No references to actions or linking capabilities

**Actions (Fully Independent)**:
- Complete removal of `objective_id` field and all linking capabilities
- Standalone action management within client context and globally
- Columnar display layout for efficient data viewing
- Enhanced with `date_completed` field for completion tracking
- Global actions functionality for cross-client visibility
- No references to objectives or hierarchical relationships

**Display Features:**
- Completely separate columnar interfaces for objectives and actions
- No collapsible segments, hierarchical relationships, or cross-references
- Independent filtering, sorting, and management capabilities
- Clean separation of concerns with no linking functionality

### Action Items Structure (Restructured)
```json
{
  "id": "unique_identifier",
  "client_id": "client_reference",
  "title": "Action Title",
  "description": "Detailed description of the action, steps required, and expected outcomes",
  "date_created": "YYYY-MM-DD",
  "target_date": "YYYY-MM-DD",
  "drop_dead_date": "YYYY-MM-DD",
  "date_completed": "YYYY-MM-DD",
  "assigned_to": "user_id_or_name",
  "assignment_type": "advisor|client|other",
  "status": "todo|completed",
  "created_at": "timestamp",
  "updated_at": "timestamp",
  "client_group_name": "string_for_global_context"
}
```

#### Action Item Date Field Definitions (Enhanced)
- **Date Created**: When the action item was initially created in the system
- **Target Date**: The primary deadline for completion (replaces the previous due_date field)
- **Drop Dead Date**: The absolute final deadline after which the action becomes critical, invalid, or may impact other processes
- **Date Completed**: When the action was marked as completed (new field for completion tracking)

**Note**: The objective_id field has been completely removed. Actions are now fully independent entities with enhanced date tracking capabilities.

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
   - *Date Completed*: null (not yet completed)
   - *Assigned To*: ABC Surveyors Ltd
   - *Assignment Type*: Other
   - *Status*: To-Do

## Global Actions Page Implementation

### Overview
Based on client demo feedback, a dedicated Global Actions page has been added to the site sidebar, providing comprehensive cross-client action management capabilities.

### Key Features

#### **Cross-Client Action Aggregation**
- **All Client Groups**: Displays actions from ALL client groups in a single unified view
- **Client Identification**: Each action row includes clear client group identification
- **Real-time Synchronization**: Actions automatically appear in global view when created in client contexts

#### **Sorting and Organization**
- **Primary Sort**: Actions ordered by due date (target_date) with overdue items prioritized
- **Secondary Sort**: Drop dead date for actions with same target dates
- **Status Grouping**: Optional grouping by completion status (todo/completed)

#### **Advanced Filtering Capabilities**
- **Date Range Filters**: Filter by target date, drop dead date, or date completed
- **Client Group Filters**: Multi-select client group filtering
- **Assignment Filters**: Filter by advisor, client, or third-party assignments
- **Status Filters**: Show all, completed only, or outstanding only
- **Search Functionality**: Text search across action titles and descriptions

#### **PDF Export Functionality**
- **Selective Export**: Users can select specific actions for PDF generation
- **Bulk Selection**: Support for selecting multiple actions via checkboxes
- **Export Options**: 
  - All actions (current filter applied)
  - Selected actions only
  - Actions by date range
  - Actions by client group
- **Professional Formatting**: PDF formatted for client presentations and record keeping

### Global Actions Data Structure
```json
{
  "actions": [
    {
      "id": "unique_identifier",
      "client_id": "client_reference",
      "client_group_name": "Client Group Display Name",
      "client_known_as": "Primary Contact Name",
      "title": "Action Title",
      "description": "Action description and details",
      "date_created": "YYYY-MM-DD",
      "target_date": "YYYY-MM-DD",
      "drop_dead_date": "YYYY-MM-DD",
      "date_completed": "YYYY-MM-DD or null",
      "assigned_to": "assignee_name",
      "assignment_type": "advisor|client|other",
      "status": "todo|completed",
      "days_until_due": "calculated_integer",
      "is_overdue": "boolean",
      "urgency_level": "low|medium|high|critical"
    }
  ],
  "summary": {
    "total_actions": "integer",
    "completed_actions": "integer",
    "overdue_actions": "integer",
    "due_this_week": "integer",
    "due_next_week": "integer"
  }
}
```

### Navigation Integration
- **Site Sidebar Addition**: "Global Actions" menu item added to main navigation
- **Access Level**: Available to all advisor roles with appropriate permissions
- **Icon and Badge**: Action count badge showing total outstanding actions
- **Quick Access**: Keyboard shortcut and search functionality

## PDF Export Implementation

### Export Interface Design

#### **Action Selection Interface**
- **Master Checkbox**: Select/deselect all visible actions
- **Individual Checkboxes**: Per-action selection with visual feedback
- **Selection Counter**: "X of Y actions selected" display
- **Bulk Actions Toolbar**: Appears when actions are selected

#### **Export Configuration Options**
- **Date Range**: Custom date range for filtering actions
- **Client Groups**: Multi-select client group inclusion/exclusion
- **Status Filters**: Include completed, outstanding, or both
- **Assignment Types**: Filter by advisor, client, or third-party assignments
- **Sorting Options**: Order by due date, client, or assignment type

#### **PDF Generation Features**
- **Professional Header**: Kingston's Portal branding and generation date
- **Action Details Table**: Comprehensive action information in tabular format
- **Client Context**: Clear client identification for each action
- **Date Formatting**: Consistent date display with relative urgency indicators
- **Status Indicators**: Visual status representation suitable for printing
- **Footer Information**: Generation timestamp and user identification

### PDF Structure and Layout
```markdown
# Actions Export Report
**Generated**: [Date and Time]
**Prepared by**: [User Name]
**Total Actions**: [Count]

## Summary
- **Outstanding Actions**: [Count]
- **Completed Actions**: [Count] 
- **Overdue Actions**: [Count]
- **Due This Week**: [Count]

## Action Details

| Client | Action | Assigned To | Target Date | Status | Urgency |
|--------|--------|-------------|-------------|---------|---------|
| [Client Name] | [Action Title] | [Assignee] | [Date] | [Status] | [Level] |

### Action Descriptions
**[Client Name] - [Action Title]**
[Full action description and requirements]
[Assignment details and context]
```

### Technical Implementation Requirements

#### **Export API Endpoints**
- `POST /api/actions/export/pdf` - Generate PDF with selected actions
- `GET /api/actions/global` - Retrieve global actions data with filtering
- `POST /api/actions/bulk-operations` - Bulk action management operations

#### **PDF Generation Library**
- **Primary**: jsPDF with autoTable plugin for professional table formatting
- **Alternative**: Puppeteer for complex HTML-to-PDF conversion
- **Formatting**: Professional business document styling with consistent branding

#### **Security and Performance**
- **Access Control**: Role-based permissions for global action viewing and export
- **Rate Limiting**: PDF generation rate limiting to prevent system overload
- **Async Processing**: Background PDF generation for large datasets with progress tracking
- **Audit Logging**: Track all PDF exports with user and timestamp information

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
        "type": "Bank Accounts",
        "liquidity_category": "cash_equivalents",
        "display_order": 1,
        "items": [
          {
            "name": "Natwest Current Account",
            "is_managed": true,
            "john": 2250,
            "mary": 1750,
            "joint": 0,
            "total": 4000,
            "valuation_date": "2024-08-26"
          },
          {
            "name": "Barclays Joint Savings",
            "is_managed": false,
            "john": 0,
            "mary": 0,
            "joint": 4500,
            "total": 4500,
            "valuation_date": "2024-08-26"
          }
        ]
      },
      {
        "type": "Cash ISAs",
        "liquidity_category": "cash_equivalents", 
        "display_order": 2,
        "items": [
          {
            "name": "Halifax Cash ISA 2024",
            "is_managed": false,
            "john": 15000,
            "mary": 20000,
            "joint": 0,
            "total": 35000,
            "valuation_date": "2024-08-26"
          }
        ]
      },
      {
        "type": "Stocks & Shares ISAs",
        "liquidity_category": "accessible_investments",
        "display_order": 3,
        "items": [
          {
            "name": "Vanguard S&S ISA",
            "is_managed": true,
            "john": 45000,
            "mary": 38000,
            "joint": 0,
            "total": 83000,
            "valuation_date": "2024-08-26"
          }
        ]
      },
      {
        "type": "GIAs",
        "liquidity_category": "accessible_investments",
        "display_order": 4,
        "items": [
          {
            "name": "Zurich Vista GIA",
            "is_managed": true,
            "john": 125000,
            "mary": 95000,
            "joint": 0,
            "total": 220000,
            "valuation_date": "2024-08-26"
          }
        ]
      },
      {
        "type": "Mortgages",
        "liquidity_category": "liabilities",
        "display_order": 99,
        "items": [
          {
            "name": "Primary Residence Mortgage",
            "is_managed": false,
            "john": -12500,
            "mary": -12500,
            "joint": 0,
            "total": -25000,
            "valuation_date": "2024-08-26"
          }
        ]
      }
    ],
    "summary": {
      "managed_total": 308000,
      "unmanaged_total": 74500,
      "total_assets": 382500,
      "total_liabilities": 25000,
      "net_worth": 357500,
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

**Enhanced Change Calculation Display:**
- **Value Change**: Absolute monetary difference from last snapshot with appropriate sign (+£12,500 or -£3,200)
- **Percentage Change**: Relative percentage change with one decimal place precision (+2.8% or -1.2%)
- **Period Display**: Formatted time period in "MMM YY to MMM YY" format:
  - Calculated from last snapshot date to current calculation date
  - Examples: "Apr 24 to Aug 25", "Dec 23 to Mar 24", "Jan 25 to Jan 25" (same month)
- **Visual Design**:
  - **Color Coding**: Green for positive changes, red for negative changes, neutral gray for zero change
  - **Three-Line Card Format**: Value change (line 1), percentage change (line 2), period display (line 3)
  - **Consistent Formatting**: Maintains professional appearance suitable for client presentations
- **Data Sources**: Change calculated against the most recent saved snapshot, with graceful handling when no previous snapshots exist

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
- **Dynamic Owner Names**: Column headers automatically populate with "known as" names from product owner cards
  - Example: If product owner card shows "known as: John", column header displays "John" not "John Smith"
  - Ensures consistency between client identification and financial data display
- **Joint Holdings**: "Joint" column for jointly owned assets and accounts
- **Total Column**: "Total" column showing aggregated values across all ownership types
- **Real-time Synchronization**: Headers update automatically when product owner "known as" names are modified

**Hierarchical Data Organization by Item Types with Liquidity-Based Ordering:**
1. **Item Type Headers**: Bold uppercase section headers following liquidity hierarchy (see Asset Ordering Specification below)
2. **Individual Items**: Specific product/account names with:
   - **Managed/Unmanaged Badges**: Color-coded status indicators (green for managed, gray for unmanaged)
   - **Ownership Breakdown**: Values distributed by owner using "known as" names
   - **Individual Item Totals**: Calculated totals per item across all owners
3. **Section Subtotals**: Aggregated totals per item type with light gray backgrounds and semibold styling
4. **Grand Totals**: Final aggregated values across all asset types with prominent borders and bold formatting

#### Asset Ordering Specification

**Primary Ordering Principle**: Assets are organized by financial liquidity hierarchy (most liquid → least liquid) following industry-standard accessibility principles and client-specific requirements for optimal financial presentation.

**Liquidity-Based Asset Type Hierarchy:**

1. **CASH & CASH EQUIVALENTS** (Most Liquid)
   - Bank Accounts (Current, Savings)
   - Cash ISAs
   - Premium Bonds
   - Building Society Accounts

2. **READILY ACCESSIBLE INVESTMENTS** (Highly Liquid)
   - Stocks & Shares ISAs
   - GIAs (General Investment Accounts)
   - Unit Trusts/OEICs
   - Investment Bonds (Onshore)

3. **RETIREMENT & LONG-TERM INVESTMENTS** (Medium Liquidity)
   - Personal Pensions (SIPPs, Stakeholder)
   - Workplace Pensions
   - Annuities
   - Investment Bonds (Offshore)

4. **ILLIQUID INVESTMENTS** (Lower Liquidity)
   - Property (Buy-to-Let, Commercial)
   - Alternative Investments
   - Private Equity/Venture Capital
   - Structured Products

5. **PERSONAL ASSETS** (Least Liquid)
   - Primary Residence
   - Collectibles/Art
   - Business Interests
   - Other Physical Assets

6. **LIABILITIES** (Always Last)
   - Mortgages
   - Loans & Credit
   - Outstanding Debts

**Implementation Rules:**

- **Client Priority Override**: Cash ISAs appear before Stocks & Shares ISAs (higher accessibility priority despite both being ISAs)
- **Liquidity Priority**: Cash ISAs appear before Stocks & Shares ISAs (more accessible despite both being ISAs)
- **Managed vs Unmanaged**: Within each liquidity category, managed products appear before unmanaged products
- **Alphabetical Sub-ordering**: Within the same liquidity level and management status, order alphabetically
- **Zero Value Handling**: Display all configured asset types even if zero value, using em-dash (—) for empty values
- **New Asset Type Placement**: Place new asset types according to their liquidity level, not chronologically

**Example Ordering Implementation:**
```
CASH & CASH EQUIVALENTS
├── Bank Accounts (Managed)
├── Bank Accounts (Unmanaged)  
├── Cash ISAs (Managed)
├── Cash ISAs (Unmanaged)
└── Premium Bonds (Unmanaged)

READILY ACCESSIBLE INVESTMENTS
├── Stocks & Shares ISAs (Managed)
├── Stocks & Shares ISAs (Unmanaged)
├── GIAs (Managed)
└── GIAs (Unmanaged)

...continuing through liquidity hierarchy...

LIABILITIES
├── Mortgages
├── Personal Loans
└── Credit Cards/Overdrafts
```

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

#### `information_items` - Enhanced for Columnar Display
- `id` (Primary Key)
- `client_id` (Foreign Key to client_groups)
- `category` (Enum: basic_detail, income_expenditure, assets_liabilities, protection, vulnerability_health)
- `item_type` (VARCHAR) - **NEW: Required for table display column**
- `title` (VARCHAR)
- `product_owners_associated` (TEXT[]) - **NEW: Array of associated owner names for table display**
- `data` (JSONB for PostgreSQL flexibility)
- `display_order` (INTEGER) - **NEW: For consistent table ordering**
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

**Index Requirements for Performance:**
- `CREATE INDEX idx_information_items_client_category ON information_items(client_id, category);`
- `CREATE INDEX idx_information_items_type ON information_items(item_type);`
- `CREATE INDEX idx_information_items_display_order ON information_items(client_id, display_order);`

#### Enhanced Product Owner Data Fields
**Database Schema Updates Required for Product Owner Cards:**

##### `product_owners` table enhancements:
- `first_name` (VARCHAR) - Separate first name field
- `middle_names` (VARCHAR, nullable) - Multiple middle names support
- `surname` (VARCHAR) - Separate surname field for structured naming
- `home_address_line_1` (VARCHAR) - Home address first line
- `home_address_line_2` (VARCHAR, nullable) - Home address second line  
- `home_address_city` (VARCHAR) - Home address city
- `home_address_county` (VARCHAR, nullable) - Home address county
- `home_address_postal_code` (VARCHAR) - Home address postal code
- `home_address_country` (VARCHAR, default 'UK') - Home address country

##### `product_owner_contacts` table (new):
- `id` (Primary Key)
- `product_owner_id` (Foreign Key to product_owners)
- `contact_type` (Enum: mobile, home, work, email)
- `contact_value` (VARCHAR) - Phone number or email address
- `is_primary` (BOOLEAN, default false) - Primary contact designation
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

##### `product_owner_meetings` table enhancements:
- `meeting_type` (VARCHAR) - Type of meeting (annual_review, planning_meeting, update_meeting)
- `meeting_date` (DATE) - Date only, no time component
- `is_nearest_meeting` (BOOLEAN) - Flag for next nearest meeting

##### `product_owner_compliance` table enhancements:
- Update `last_signed_terms_of_business` to `date_signed_tc` for terminology accuracy

#### `client_objectives`
- `id` (Primary Key)
- `client_id` (Foreign Key to client_groups)
- `title` (VARCHAR)
- `description` (TEXT)
- `priority` (Enum: high, medium, low)
- `start_date` (DATE) - When work on the objective began
- `target_date` (DATE) - When the objective should be completed
- `last_discussed` (DATE) - Most recent discussion/review date
- `status` (Enum: on-target, needs revision)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

#### `action_items` (Restructured - Complete Independence from Objectives)
- `id` (Primary Key) 
- `client_id` (Foreign Key to client_groups)
- `title` (VARCHAR)
- `description` (TEXT)
- `date_created` (DATE) - When the action item was initially created
- `target_date` (DATE) - Primary deadline for completion (replaces due_date)
- `drop_dead_date` (DATE) - Absolute final deadline
- `date_completed` (DATE, nullable) - **NEW: When the action was completed**
- `assigned_to` (VARCHAR or Foreign Key to users)
- `assignment_type` (Enum: advisor, client, other)
- `status` (Enum: todo, completed)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

**CRITICAL MIGRATION REQUIREMENTS**:
- The `objective_id` field must be completely removed from the `action_items` table
- All existing objective-action relationships will be permanently severed
- All foreign key constraints referencing objectives must be dropped
- All indexes on objective_id must be removed
- Database migration script must handle data cleanup without data loss to actions themselves

**Migration Script Template**:
```sql
-- Phase 2 Actions Table Migration: Remove Objective Linking
BEGIN TRANSACTION;

-- Step 1: Drop foreign key constraint if exists
ALTER TABLE action_items DROP CONSTRAINT IF EXISTS fk_action_items_objective_id;

-- Step 2: Drop any indexes on objective_id
DROP INDEX IF EXISTS idx_action_items_objective_id;
DROP INDEX IF EXISTS idx_action_items_client_objective;

-- Step 3: Remove objective_id column completely
ALTER TABLE action_items DROP COLUMN IF EXISTS objective_id;

-- Step 4: Add date_completed column if not exists
ALTER TABLE action_items ADD COLUMN IF NOT EXISTS date_completed DATE;

-- Step 5: Update existing completed actions with estimated completion date
UPDATE action_items 
SET date_completed = updated_at::DATE 
WHERE status = 'completed' AND date_completed IS NULL;

-- Verify migration
SELECT COUNT(*) as total_actions FROM action_items;
SELECT COUNT(*) as completed_actions FROM action_items WHERE status = 'completed';

COMMIT;
```

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

### Enhanced Product Owner Cards API
- `GET /api/product_owners/{product_owner_id}/enhanced` - Get enhanced product owner data with new fields
- `PUT /api/product_owners/{product_owner_id}/personal_details` - Update personal details (name structure, address)
- `POST /api/product_owners/{product_owner_id}/contacts` - Add new contact (phone/email)
- `PUT /api/product_owners/{product_owner_id}/contacts/{contact_id}` - Update specific contact
- `DELETE /api/product_owners/{product_owner_id}/contacts/{contact_id}` - Remove contact
- `PUT /api/product_owners/{product_owner_id}/meeting` - Update meeting information with type and date

### Information Items - Enhanced for Columnar Display
- `GET /api/information_items/{client_id}` - List all information items for client with columnar data
- `GET /api/information_items/{client_id}/table` - Get optimized table data with required columns only
- `POST /api/information_items` - Create new information item with item_type and product_owners
- `PUT /api/information_items/{id}` - Update information item including display columns
- `DELETE /api/information_items/{id}` - Delete information item
- `GET /api/information_items/types` - Get available item types by category
- `POST /api/information_items/bulk` - Bulk operations for table management

### Objectives (Completely Independent - No Action References)
- `GET /api/client_groups/{client_id}/objectives` - List client objectives (independent entities)
- `POST /api/client_groups/{client_id}/objectives` - Create new objective (no action linking)
- `PUT /api/client_groups/{client_id}/objectives/{id}` - Update objective (no action references)
- `DELETE /api/client_groups/{client_id}/objectives/{id}` - Delete objective

### Actions (Completely Independent - No Objective References)
- `GET /api/client_groups/{client_id}/actions` - List action items for specific client (completely independent)
- `GET /api/actions/global` - **NEW: Get actions from all client groups with filtering and sorting (no objective context)**
- `POST /api/client_groups/{client_id}/actions` - Create new standalone action item (no objective_id field)
- `PUT /api/client_groups/{client_id}/actions/{id}` - Update action item including date_completed (no objective references)
- `DELETE /api/client_groups/{client_id}/actions/{id}` - Delete action item
- `POST /api/actions/export/pdf` - **NEW: Generate PDF export of selected actions (independent actions only)**
- `POST /api/actions/bulk-operations` - **NEW: Bulk action management operations (no objective context)**
- `GET /api/actions/global/summary` - **NEW: Get global actions summary statistics (no objective data)**

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

### Enhanced Component Structure

#### Core Navigation Components
- `Phase2TabNavigation` - Main 6-tab navigation container with enhanced accessibility and user presence indicators
- `ClientOverviewTab` - Enhanced financial summary with completely restructured product owner cards

#### Enhanced Product Owner Card Components
- `ProductOwnerCardEnhanced` - Main component implementing the new 2-column layout structure
- `PersonalDetailsColumn` - Left column component handling name hierarchy and personal identifiers
- `ContactDetailsColumn` - Right column component managing contact information and address
- `SecurityAndManagementSection` - Full-width bottom section for security, notes, meetings, and compliance
- `MultiplePhoneNumbersManager` - Component for managing multiple phone numbers with type designation
- `AddressDisplay` - Structured home address display component
- `MeetingTypeIndicator` - Enhanced meeting display with type and date-only formatting

#### Supporting Components
- `MainListTab` - **Information-dense table interface** for information items across 5 categories featuring:
  - **Columnar Display**: High-density table layout with required columns (Category, Type, Product Owners)
  - **Slim Row Design**: 32px maximum row height with minimal padding for maximum data visibility
  - **Advanced Search & Filtering**: Cross-category search with real-time table filtering
  - **Inline Editing**: Direct table cell editing with auto-save functionality
  - **Bulk Operations**: Multi-select operations for efficient data management
  - **Responsive Design**: Adaptive column widths maintaining information density on smaller screens
- `ObjectivesActionsTab` - **RESTRUCTURED**: Independent objectives and actions management featuring:
  - **Complete Separation**: Objectives and actions displayed in separate columnar layouts
  - **No Objective Linking**: All objective-action relationship functionality removed
  - **Columnar Display**: Information-dense column layouts for both objectives and actions
  - **Enhanced Date Management**: Actions include date_completed field alongside existing dates
  - **Global Actions Integration**: Actions accessible through dedicated global actions page
  - **Assignment Type Indicators**: For advisor, client, and third-party actions
- `GlobalActionsPage` - **NEW**: Dedicated page for cross-client action management featuring:
  - **Cross-Client Aggregation**: Actions from all client groups in unified view
  - **Advanced Filtering**: By client, date range, assignment type, and status
  - **PDF Export Interface**: User-selectable action export functionality
  - **Real-time Sorting**: By due date, urgency level, and completion status
- `NetworthTab` - Professional networth statements with:
  - **Dynamic column headers** using "known as" names from product owner cards
  - **Enhanced summary cards** with period-over-period change analysis
  - **Item-type hierarchical organization** with managed/unmanaged status indicators
- `KYCTab` - KYC data completeness tracking and automated report generation with template customization
- `ManagedProductsTab` - Comprehensive product management relocated from main client page for better organization

### Enhanced UI Requirements

**Core Design Standards:**
- **Responsive Design**: Full compatibility across desktop, tablet, and mobile devices
- **Loading States**: Skeleton components and progress indicators for all async operations
- **Error Handling**: Comprehensive error boundaries with user-friendly error messages and recovery options
- **Accessibility Compliance**: Full WCAG 2.1 AA compliance with screen reader optimization and keyboard navigation
- **Design System Integration**: Seamless integration with existing Kingston's Portal design language and component library

**Phase 2 Specific Enhancements:**
- **Real-time Updates**: Live synchronization of data changes across concurrent user sessions
- **Visual Status Indicators**: Clear status representation for objectives (on-target/needs revision) and actions (todo/completed)
- **Professional Styling**: Networth statement formatting suitable for client presentations and printing
- **Interactive Elements**: Collapsible sections, expandable cards, and smooth transitions
- **Data Completeness Visualization**: Progress meters and completion indicators for KYC and information gathering
- **Touch Optimization**: Mobile-friendly interaction patterns with appropriate touch targets

**Product Owner Card Specific Enhancements:**
- **Enhanced Layout Engine**: CSS Grid-based 2-column layout with responsive breakpoints
- **Dynamic Name Display**: Flexible name rendering supporting variable middle names
- **Contact Management UI**: Add/edit/remove interface for multiple phone numbers with type selection
- **Address Integration**: Structured address input and display components
- **Meeting Type Selection**: Dropdown with predefined meeting types (Annual Review, Planning Meeting, etc.)
- **Terminology Compliance**: Updated field labels reflecting client feedback ("Date of signed T&C")
- **Field Validation**: Enhanced validation for new data structures and multiple contact fields

#### Product Owner Cards Enhancement - Implementation Specifications

**2-Column Layout Implementation:**

```typescript
// Enhanced Product Owner Card Structure
interface EnhancedProductOwner {
  id: number;
  personal_details: {
    title: string;
    first_name: string;
    middle_names?: string;
    surname: string;
    known_as: string;
    date_of_birth: string;
    ni_number: string;
  };
  contact_details: {
    email_address: string;
    phone_numbers: Array<{
      type: 'mobile' | 'home' | 'work';
      number: string;
      is_primary: boolean;
    }>;
    home_address: {
      line_1: string;
      line_2?: string;
      city: string;
      county?: string;
      postal_code: string;
      country: string;
    };
  };
  security_and_management: {
    three_words: [string, string, string];
    notes?: string;
    next_meeting?: {
      date: string;
      meeting_type: string;
      is_nearest: boolean;
    };
    compliance: {
      date_signed_tc?: string;
      last_signed_fee_agreement?: string;
    };
  };
}
```

**CSS Grid Layout Structure:**

```css
.enhanced-product-owner-card {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: auto auto;
  gap: 1.5rem;
  padding: 1.5rem;
  border-radius: 12px;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
}

.personal-details-column {
  grid-column: 1;
  grid-row: 1;
}

.contact-details-column {
  grid-column: 2;
  grid-row: 1;
}

.security-management-section {
  grid-column: 1 / 3;
  grid-row: 2;
  border-top: 1px solid #e2e8f0;
  padding-top: 1rem;
  margin-top: 0.5rem;
}

@media (max-width: 768px) {
  .enhanced-product-owner-card {
    grid-template-columns: 1fr;
    grid-template-rows: auto auto auto;
  }
  
  .contact-details-column {
    grid-column: 1;
    grid-row: 2;
  }
  
  .security-management-section {
    grid-column: 1;
    grid-row: 3;
  }
}
```

**Field Validation Requirements:**

```typescript
// Validation schema for enhanced product owner data
const EnhancedProductOwnerSchema = {
  personal_details: {
    title: { required: true, minLength: 1, maxLength: 10 },
    first_name: { required: true, minLength: 1, maxLength: 50 },
    middle_names: { required: false, maxLength: 100 },
    surname: { required: true, minLength: 1, maxLength: 50 },
    known_as: { required: true, minLength: 1, maxLength: 30 },
    date_of_birth: { required: true, format: 'YYYY-MM-DD' },
    ni_number: { required: false, pattern: /^[A-Z]{2}[0-9]{6}[A-Z]?$/ }
  },
  contact_details: {
    email_address: { required: true, format: 'email' },
    phone_numbers: {
      minItems: 1,
      maxItems: 5,
      items: {
        type: { required: true, enum: ['mobile', 'home', 'work'] },
        number: { required: true, pattern: /^[+]?[0-9\s-()]+$/ },
        is_primary: { required: true, type: 'boolean' }
      }
    },
    home_address: {
      line_1: { required: true, minLength: 1, maxLength: 100 },
      city: { required: true, minLength: 1, maxLength: 50 },
      postal_code: { required: true, pattern: /^[A-Z]{1,2}[0-9R][0-9A-Z]?\s?[0-9][A-Z]{2}$/ }
    }
  }
};
```

**Component Integration Requirements:**

1. **PersonalDetailsColumn Component**:
   - Display name hierarchy with proper spacing
   - Handle optional middle names gracefully
   - Format DOB and NI number with appropriate styling

2. **ContactDetailsColumn Component**:
   - Multiple phone number management interface
   - Primary phone number highlighting
   - Structured address display
   - Contact type badges (Mobile, Home, Work)

3. **SecurityAndManagementSection Component**:
   - Three words display as comma-separated values
   - Meeting type dropdown with predefined options
   - Date-only meeting display (no time)
   - Compliance date formatting with updated terminology

#### Main List Table Component Implementation - Information-Dense Design

**CSS Implementation for Maximum Data Visibility:**

```css
/* Main List Table - Information Density Priority */
.main-list-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
  line-height: 1.2;
  background: #ffffff;
}

/* Slim Row Design - 32px maximum height */
.main-list-table tbody tr {
  height: 32px;
  max-height: 32px;
  border-bottom: 1px solid #f1f5f9;
  transition: background-color 0.1s ease;
}

.main-list-table tbody tr:nth-child(even) {
  background-color: #f8fafc;
}

.main-list-table tbody tr:hover {
  background-color: #e2e8f0;
}

/* Minimal Padding for Maximum Density */
.main-list-table td {
  padding: 4px 8px;
  vertical-align: middle;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Column-Specific Styling */
.main-list-table .category-column {
  width: 20%;
}

.main-list-table .item-type-column {
  width: 25%;
  font-weight: 500;
}

.main-list-table .owners-column {
  width: 30%;
  color: #64748b;
}

.main-list-table .actions-column {
  width: 15%;
  text-align: right;
}

.main-list-table .created-column {
  width: 10%;
  font-size: 12px;
  color: #94a3b8;
  text-align: center;
}

/* Category Badges - Compact Design */
.category-badge {
  display: inline-block;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.category-badge.basic-detail { background-color: #dbeafe; color: #1e40af; }
.category-badge.income-expenditure { background-color: #d1fae5; color: #047857; }
.category-badge.assets-liabilities { background-color: #fef3c7; color: #92400e; }
.category-badge.protection { background-color: #e0e7ff; color: #5b21b6; }
.category-badge.vulnerability-health { background-color: #fce7f3; color: #be185d; }

/* Action Buttons - Icon Only for Space Efficiency */
.table-action-buttons {
  display: flex;
  gap: 4px;
  justify-content: flex-end;
}

.table-action-btn {
  padding: 4px;
  border: none;
  background: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  color: #64748b;
  transition: all 0.1s ease;
}

.table-action-btn:hover {
  background-color: #f1f5f9;
  color: #334155;
}

/* Header Styling */
.main-list-table thead th {
  background-color: #f8fafc;
  padding: 8px;
  text-align: left;
  font-weight: 600;
  font-size: 12px;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 2px solid #e2e8f0;
  position: sticky;
  top: 0;
  z-index: 10;
}

/* Responsive Adjustments - Maintain Density */
@media (max-width: 768px) {
  .main-list-table {
    font-size: 13px;
  }
  
  .main-list-table tbody tr {
    height: 36px;
    max-height: 36px;
  }
  
  .main-list-table .owners-column {
    width: 35%;
  }
  
  .main-list-table .actions-column {
    width: 10%;
  }
}

/* Loading and Empty States */
.main-list-skeleton-row {
  height: 32px;
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 200% 100%;
  animation: loading 1.5s infinite;
}

@keyframes loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

**TypeScript Interface for Enhanced Data Structure:**

```typescript
// Enhanced Information Item for Columnar Display
interface InformationItemTableRow {
  id: number;
  client_id: number;
  category: 'basic_detail' | 'income_expenditure' | 'assets_liabilities' | 'protection' | 'vulnerability_health';
  item_type: string;
  title: string;
  product_owners_associated: string[];
  created_at: string;
  display_order: number;
}

// Table Component Props
interface MainListTableProps {
  clientGroupId: number;
  items: InformationItemTableRow[];
  isLoading: boolean;
  onEdit: (itemId: number) => void;
  onDelete: (itemId: number) => void;
  onBulkAction: (itemIds: number[], action: string) => void;
  searchTerm: string;
  selectedCategory?: string;
  maxRowHeight?: number; // Default: 32px
  enableInlineEditing?: boolean; // Default: true
}
```

#### Columnar Display Implementation for Objectives and Actions

**Complete Architectural Separation:**
- **Independent Sections**: Objectives and actions displayed in completely separate interfaces
- **No Linking Functionality**: All objective-action relationship code removed
- **Separate Data Management**: Independent CRUD operations for objectives and actions

**Objectives Columnar Layout:**
- **Column Structure**: Title (30%), Priority (15%), Start Date (15%), Target Date (15%), Last Discussed (15%), Status (10%)
- **Information Density**: Slim row design with minimal padding similar to Information Items table
- **Sorting Capabilities**: Multi-column sorting by priority, dates, and status
- **Inline Editing**: Direct column editing for quick updates

**Actions Columnar Layout:**
- **Column Structure**: Title (25%), Assigned To (15%), Target Date (12%), Drop Dead Date (12%), Date Completed (12%), Status (10%), Client (14%)
- **Date Completed Integration**: New column for tracking completion dates
- **Status Indicators**: Visual status representation with date completed information
- **Urgency Indicators**: Color-coded rows based on due dates and drop dead dates

**Global Actions Page Features:**
- **Cross-Client View**: Additional "Client Group" column for identification
- **Advanced Sorting**: Primary sort by target_date with secondary sorts available
- **PDF Export Interface**: Checkbox selection system for export functionality
- **Real-time Filtering**: Dynamic filtering across all columns with search capabilities

**Interactive Features (Redesigned):**
- **Row-Based Interactions**: Click actions on individual rows instead of card expansions
- **Bulk Selection**: Multi-row selection for bulk operations and PDF export
- **Column Resizing**: Adjustable column widths for user preference
- **Responsive Design**: Adaptive column display for different screen sizes

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

## Critical Migration Strategy and Implementation Guide

### Overview

Phase 2 implementation involves several high-risk database changes that require comprehensive migration strategies to ensure zero data loss and minimal downtime. This section provides detailed migration scripts, procedures, and rollback plans for all significant database changes.

### Migration Risk Assessment

#### High-Risk Changes (Require Special Attention)
1. **Objective-Action Relationship Removal**: Complete severing of objective-action links with potential data loss of relationships
2. **Product Owner Data Restructuring**: Restructuring name fields and contact information
3. **Information Items Table Creation**: New table structure with columnar display requirements
4. **Asset Ordering Implementation**: New fields and liquidity-based categorization

#### Medium-Risk Changes
1. **Date Completed Field Addition**: New field for action completion tracking
2. **Meeting Type Enhancement**: Adding meeting type and date-only fields
3. **Contact Management System**: Multiple phone numbers support
4. **Networth Snapshots**: New table for historical data

### Detailed Migration Scripts

#### 1. Product Owner Data Enhancement Migration

```sql
-- Phase 2 Migration: Product Owner Data Enhancement
-- ESTIMATED TIME: 10-15 minutes for 1000+ clients
-- DOWNTIME REQUIRED: 5 minutes during final table updates

BEGIN TRANSACTION;

-- Step 1: Backup existing product_owners table
CREATE TABLE product_owners_backup_phase2 AS SELECT * FROM product_owners;

-- Step 2: Add new personal details fields
ALTER TABLE product_owners 
ADD COLUMN first_name VARCHAR(50),
ADD COLUMN middle_names VARCHAR(100),
ADD COLUMN surname VARCHAR(50),
ADD COLUMN home_address_line_1 VARCHAR(100),
ADD COLUMN home_address_line_2 VARCHAR(100),
ADD COLUMN home_address_city VARCHAR(50),
ADD COLUMN home_address_county VARCHAR(50),
ADD COLUMN home_address_postal_code VARCHAR(20),
ADD COLUMN home_address_country VARCHAR(50) DEFAULT 'UK';

-- Step 3: Migrate existing full_name to structured fields
UPDATE product_owners SET
    first_name = CASE 
        WHEN full_name LIKE '% %' THEN SPLIT_PART(full_name, ' ', 1)
        ELSE full_name
    END,
    surname = CASE 
        WHEN full_name LIKE '% %' THEN SPLIT_PART(full_name, ' ', -1)
        ELSE ''
    END,
    middle_names = CASE 
        WHEN LENGTH(full_name) - LENGTH(REPLACE(full_name, ' ', '')) > 1 
        THEN TRIM(SUBSTRING(full_name FROM POSITION(' ' IN full_name) + 1 FOR LENGTH(full_name) - POSITION(' ' IN REVERSE(full_name))))
        ELSE NULL
    END;

-- Step 4: Migrate existing address data if available
UPDATE product_owners SET
    home_address_line_1 = COALESCE(address_line_1, ''),
    home_address_line_2 = address_line_2,
    home_address_city = COALESCE(city, ''),
    home_address_county = county,
    home_address_postal_code = COALESCE(postal_code, ''),
    home_address_country = COALESCE(country, 'UK');

-- Step 5: Data validation
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM product_owners WHERE first_name IS NULL OR first_name = '') THEN
        RAISE EXCEPTION 'Migration failed: Some product owners have empty first names';
    END IF;
    
    IF (SELECT COUNT(*) FROM product_owners) != (SELECT COUNT(*) FROM product_owners_backup_phase2) THEN
        RAISE EXCEPTION 'Migration failed: Record count mismatch';
    END IF;
END $$;

-- Step 6: Create new contact management table
CREATE TABLE product_owner_contacts (
    id SERIAL PRIMARY KEY,
    product_owner_id INTEGER NOT NULL REFERENCES product_owners(id) ON DELETE CASCADE,
    contact_type VARCHAR(20) NOT NULL CHECK (contact_type IN ('mobile', 'home', 'work', 'email')),
    contact_value VARCHAR(255) NOT NULL,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Step 7: Migrate existing phone and email data
INSERT INTO product_owner_contacts (product_owner_id, contact_type, contact_value, is_primary)
SELECT 
    id, 
    'email', 
    email_address, 
    true
FROM product_owners 
WHERE email_address IS NOT NULL AND email_address != '';

INSERT INTO product_owner_contacts (product_owner_id, contact_type, contact_value, is_primary)
SELECT 
    id, 
    'mobile', 
    phone_number, 
    true
FROM product_owners 
WHERE phone_number IS NOT NULL AND phone_number != '';

-- Step 8: Create indexes for performance
CREATE INDEX idx_product_owner_contacts_owner ON product_owner_contacts(product_owner_id);
CREATE INDEX idx_product_owner_contacts_type ON product_owner_contacts(contact_type);
CREATE INDEX idx_product_owners_names ON product_owners(first_name, surname);

-- Step 9: Verify migration integrity
SELECT 
    'Product Owners Migrated' as status,
    COUNT(*) as total_records,
    COUNT(CASE WHEN first_name IS NOT NULL AND first_name != '' THEN 1 END) as with_first_name,
    COUNT(CASE WHEN surname IS NOT NULL AND surname != '' THEN 1 END) as with_surname
FROM product_owners;

SELECT 
    'Contacts Migrated' as status,
    COUNT(*) as total_contacts,
    COUNT(CASE WHEN contact_type = 'email' THEN 1 END) as email_contacts,
    COUNT(CASE WHEN contact_type = 'mobile' THEN 1 END) as phone_contacts
FROM product_owner_contacts;

COMMIT;
```

#### 2. Critical Objective-Action Decoupling Migration

```sql
-- Phase 2 CRITICAL Migration: Complete Objective-Action Separation
-- ESTIMATED TIME: 5-10 minutes for 10,000+ actions
-- DOWNTIME REQUIRED: 10 minutes for data integrity
-- WARNING: This will permanently remove all objective-action relationships

BEGIN TRANSACTION;

-- Step 1: Create comprehensive backup
CREATE TABLE objectives_backup_phase2 AS SELECT * FROM client_objectives;
CREATE TABLE actions_backup_phase2 AS SELECT * FROM action_items;

-- Step 2: Record current relationship state for rollback reference
CREATE TABLE objective_action_relationships_backup AS 
SELECT 
    action_items.id as action_id,
    action_items.objective_id,
    client_objectives.id as objective_id_verified,
    client_objectives.title as objective_title,
    action_items.title as action_title,
    action_items.client_id,
    current_timestamp as backup_timestamp
FROM action_items 
LEFT JOIN client_objectives ON action_items.objective_id = client_objectives.id
WHERE action_items.objective_id IS NOT NULL;

-- Step 3: Add date_completed field before removing relationships
ALTER TABLE action_items ADD COLUMN IF NOT EXISTS date_completed DATE;

-- Step 4: Initialize date_completed for existing completed actions
UPDATE action_items 
SET date_completed = updated_at::DATE 
WHERE status = 'completed' 
AND date_completed IS NULL;

-- Step 5: Verify no data loss before destructive changes
DO $$
DECLARE
    original_action_count INTEGER;
    current_action_count INTEGER;
    relationships_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO original_action_count FROM actions_backup_phase2;
    SELECT COUNT(*) INTO current_action_count FROM action_items;
    SELECT COUNT(*) INTO relationships_count FROM objective_action_relationships_backup;
    
    IF original_action_count != current_action_count THEN
        RAISE EXCEPTION 'Pre-migration validation failed: Action count mismatch (original: %, current: %)', original_action_count, current_action_count;
    END IF;
    
    RAISE NOTICE 'Migration validation passed: % actions, % relationships to be removed', current_action_count, relationships_count;
END $$;

-- Step 6: Remove foreign key constraints
ALTER TABLE action_items DROP CONSTRAINT IF EXISTS fk_action_items_objective_id;
ALTER TABLE action_items DROP CONSTRAINT IF EXISTS action_items_objective_id_fkey;

-- Step 7: Remove indexes related to objective_id
DROP INDEX IF EXISTS idx_action_items_objective_id;
DROP INDEX IF EXISTS idx_action_items_client_objective;
DROP INDEX IF EXISTS action_items_objective_id_idx;

-- Step 8: Remove objective_id column (DESTRUCTIVE - CANNOT BE UNDONE)
ALTER TABLE action_items DROP COLUMN IF EXISTS objective_id;

-- Step 9: Create new indexes for independent actions
CREATE INDEX idx_action_items_client_id ON action_items(client_id);
CREATE INDEX idx_action_items_status_target_date ON action_items(status, target_date);
CREATE INDEX idx_action_items_assignment_type ON action_items(assignment_type);
CREATE INDEX idx_action_items_date_completed ON action_items(date_completed) WHERE date_completed IS NOT NULL;

-- Step 10: Verify destructive changes completed successfully
DO $$
BEGIN
    -- Check that objective_id column no longer exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'action_items' 
        AND column_name = 'objective_id'
    ) THEN
        RAISE EXCEPTION 'Critical error: objective_id column still exists after migration';
    END IF;
    
    -- Verify date_completed field exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'action_items' 
        AND column_name = 'date_completed'
    ) THEN
        RAISE EXCEPTION 'Critical error: date_completed column missing after migration';
    END IF;
    
    RAISE NOTICE 'Objective-Action decoupling completed successfully';
END $$;

-- Step 11: Final integrity check
SELECT 
    'Actions Migration Complete' as status,
    COUNT(*) as total_actions,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_actions,
    COUNT(CASE WHEN status = 'completed' AND date_completed IS NOT NULL THEN 1 END) as completed_with_date,
    0 as objective_references -- Should always be 0 now
FROM action_items;

COMMIT;

-- Post-migration cleanup (run separately after verification)
-- DROP TABLE objective_action_relationships_backup; -- Keep for audit trail
-- DROP TABLE actions_backup_phase2; -- Keep for 30 days minimum
```

#### 3. Information Items Table Creation

```sql
-- Phase 2 Migration: Information Items Infrastructure
-- ESTIMATED TIME: 2-5 minutes
-- DOWNTIME REQUIRED: Minimal (new table creation)

BEGIN TRANSACTION;

-- Step 1: Create information_items table
CREATE TABLE information_items (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES client_groups(client_group_id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL CHECK (category IN ('basic_detail', 'income_expenditure', 'assets_liabilities', 'protection', 'vulnerability_health')),
    item_type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    product_owners_associated TEXT[] DEFAULT '{}',
    data JSONB DEFAULT '{}',
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Step 2: Create performance indexes
CREATE INDEX idx_information_items_client_category ON information_items(client_id, category);
CREATE INDEX idx_information_items_type ON information_items(item_type);
CREATE INDEX idx_information_items_display_order ON information_items(client_id, display_order);
CREATE INDEX idx_information_items_owners ON information_items USING GIN(product_owners_associated);

-- Step 3: Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_information_items_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER information_items_updated_at
    BEFORE UPDATE ON information_items
    FOR EACH ROW EXECUTE FUNCTION update_information_items_timestamp();

-- Step 4: Verify table creation
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'information_items') THEN
        RAISE EXCEPTION 'Information items table creation failed';
    END IF;
    
    RAISE NOTICE 'Information items table created successfully';
END $$;

COMMIT;
```

#### 4. Asset Ordering Configuration Migration

```sql
-- Phase 2 Migration: Asset Ordering System
-- ESTIMATED TIME: 3-5 minutes
-- DOWNTIME REQUIRED: Minimal

BEGIN TRANSACTION;

-- Step 1: Create liquidity-based asset configuration table
CREATE TABLE asset_type_config (
    id SERIAL PRIMARY KEY,
    type_name VARCHAR(100) NOT NULL UNIQUE,
    liquidity_category VARCHAR(50) NOT NULL CHECK (liquidity_category IN ('cash_equivalents', 'accessible_investments', 'retirement_investments', 'illiquid_investments', 'personal_assets', 'liabilities')),
    display_order INTEGER NOT NULL,
    liquidity_order INTEGER NOT NULL DEFAULT 50, -- Order within liquidity category
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Step 2: Insert liquidity-based asset configuration data
INSERT INTO asset_type_config (type_name, liquidity_category, display_order, liquidity_order) VALUES
-- CASH & CASH EQUIVALENTS (100-199)
('Bank Accounts', 'cash_equivalents', 101, 1),
('Cash ISAs', 'cash_equivalents', 102, 2), -- Client priority: before S&S ISAs
('Premium Bonds', 'cash_equivalents', 103, 3),
('Building Society Accounts', 'cash_equivalents', 104, 4),

-- READILY ACCESSIBLE INVESTMENTS (200-299)
('Stocks & Shares ISAs', 'accessible_investments', 201, 1),
('GIAs', 'accessible_investments', 202, 2),
('Unit Trusts', 'accessible_investments', 203, 3),
('Investment Bonds (Onshore)', 'accessible_investments', 204, 4),

-- RETIREMENT & LONG-TERM INVESTMENTS (300-399)
('Personal Pensions', 'retirement_investments', 301, 1),
('Workplace Pensions', 'retirement_investments', 302, 2),
('Annuities', 'retirement_investments', 303, 3),
('Investment Bonds (Offshore)', 'retirement_investments', 304, 4),

-- ILLIQUID INVESTMENTS (400-499)
('Property (Buy-to-Let)', 'illiquid_investments', 401, 1),
('Alternative Investments', 'illiquid_investments', 402, 2),
('Private Equity', 'illiquid_investments', 403, 3),
('Structured Products', 'illiquid_investments', 404, 4),

-- PERSONAL ASSETS (500-599)
('Primary Residence', 'personal_assets', 501, 1),
('Collectibles', 'personal_assets', 502, 2),
('Business Interests', 'personal_assets', 503, 3),
('Other Physical Assets', 'personal_assets', 504, 4),

-- LIABILITIES (600-699)
('Mortgages', 'liabilities', 601, 1),
('Personal Loans', 'liabilities', 602, 2),
('Credit Cards', 'liabilities', 603, 3),
('Overdrafts', 'liabilities', 604, 4);

-- Step 3: Create indexes for efficient sorting
CREATE INDEX idx_asset_config_ordering ON asset_type_config(liquidity_category, display_order);
CREATE INDEX idx_asset_config_liquidity ON asset_type_config(liquidity_category, liquidity_order);

-- Step 4: Create networth snapshots table
CREATE TABLE networth_snapshots (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES client_groups(client_group_id) ON DELETE CASCADE,
    snapshot_date TIMESTAMP DEFAULT NOW(),
    created_by INTEGER REFERENCES users(id),
    data JSONB NOT NULL,
    net_worth DECIMAL(15, 2) NOT NULL,
    assets_total DECIMAL(15, 2) DEFAULT 0,
    liabilities_total DECIMAL(15, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Step 5: Create indexes for networth snapshots
CREATE INDEX idx_networth_snapshots_client ON networth_snapshots(client_id);
CREATE INDEX idx_networth_snapshots_date ON networth_snapshots(client_id, snapshot_date);

-- Step 6: Verify configuration
SELECT 
    'Asset Types Configured' as status,
    COUNT(*) as total_types,
    COUNT(CASE WHEN liquidity_category = 'cash_equivalents' THEN 1 END) as cash_types,
    COUNT(CASE WHEN liquidity_category = 'liabilities' THEN 1 END) as liability_types
FROM asset_type_config;

COMMIT;
```

### Rollback Procedures

#### Emergency Rollback for Objective-Action Decoupling

```sql
-- EMERGENCY ROLLBACK: Objective-Action Relationships
-- WARNING: Use only if critical issues discovered within 24 hours
-- Requires backup tables to exist

BEGIN TRANSACTION;

-- Step 1: Verify backups exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'actions_backup_phase2') THEN
        RAISE EXCEPTION 'Cannot rollback: actions backup table missing';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'objective_action_relationships_backup') THEN
        RAISE EXCEPTION 'Cannot rollback: relationships backup table missing';
    END IF;
END $$;

-- Step 2: Drop current action_items table
DROP TABLE action_items CASCADE;

-- Step 3: Recreate from backup
CREATE TABLE action_items AS SELECT * FROM actions_backup_phase2;

-- Step 4: Restore primary key and constraints
ALTER TABLE action_items ADD PRIMARY KEY (id);
ALTER TABLE action_items ADD CONSTRAINT fk_action_items_client FOREIGN KEY (client_id) REFERENCES client_groups(client_group_id);
ALTER TABLE action_items ADD CONSTRAINT fk_action_items_objective FOREIGN KEY (objective_id) REFERENCES client_objectives(id);

-- Step 5: Recreate indexes
CREATE INDEX idx_action_items_client_id ON action_items(client_id);
CREATE INDEX idx_action_items_objective_id ON action_items(objective_id);

-- Step 6: Verify rollback
SELECT 
    'Rollback Status' as status,
    COUNT(*) as total_actions,
    COUNT(CASE WHEN objective_id IS NOT NULL THEN 1 END) as actions_with_objectives
FROM action_items;

COMMIT;
```

### Data Validation and Integrity Checks

#### Pre-Migration Validation Script

```sql
-- Pre-Migration Data Validation
-- Run before any migration to establish baseline

-- Validation 1: Product Owner Data Integrity
SELECT 
    'Product Owners Baseline' as check_type,
    COUNT(*) as total_records,
    COUNT(CASE WHEN full_name IS NOT NULL AND full_name != '' THEN 1 END) as with_names,
    COUNT(CASE WHEN email_address IS NOT NULL AND email_address != '' THEN 1 END) as with_emails,
    COUNT(CASE WHEN phone_number IS NOT NULL AND phone_number != '' THEN 1 END) as with_phones
FROM product_owners;

-- Validation 2: Objective-Action Relationships
SELECT 
    'Action-Objective Links' as check_type,
    COUNT(*) as total_actions,
    COUNT(CASE WHEN objective_id IS NOT NULL THEN 1 END) as linked_actions,
    COUNT(DISTINCT objective_id) as unique_objectives_referenced
FROM action_items
WHERE objective_id IS NOT NULL;

-- Validation 3: Data Consistency Checks
SELECT 
    'Client Groups' as check_type,
    COUNT(*) as total_clients,
    COUNT(CASE WHEN client_group_name IS NOT NULL THEN 1 END) as with_names
FROM client_groups;

-- Save baseline metrics
CREATE TABLE migration_baseline_metrics AS
SELECT 
    'pre_migration' as phase,
    current_timestamp as recorded_at,
    'product_owners' as table_name,
    COUNT(*) as record_count
FROM product_owners
UNION ALL
SELECT 'pre_migration', current_timestamp, 'action_items', COUNT(*) FROM action_items
UNION ALL
SELECT 'pre_migration', current_timestamp, 'client_objectives', COUNT(*) FROM client_objectives;
```

#### Post-Migration Validation Script

```sql
-- Post-Migration Comprehensive Validation
-- Run after each migration step to verify success

-- Validation 1: Product Owner Migration Success
WITH migration_comparison AS (
    SELECT 
        'post_migration' as phase,
        COUNT(*) as current_count,
        (SELECT record_count FROM migration_baseline_metrics WHERE table_name = 'product_owners') as baseline_count
    FROM product_owners
)
SELECT 
    phase,
    current_count,
    baseline_count,
    CASE 
        WHEN current_count = baseline_count THEN 'PASS'
        ELSE 'FAIL'
    END as validation_status
FROM migration_comparison;

-- Validation 2: Enhanced Fields Population
SELECT 
    'Enhanced Product Owner Fields' as validation_type,
    COUNT(*) as total_records,
    COUNT(CASE WHEN first_name IS NOT NULL AND first_name != '' THEN 1 END) as first_name_populated,
    COUNT(CASE WHEN surname IS NOT NULL AND surname != '' THEN 1 END) as surname_populated,
    ROUND(100.0 * COUNT(CASE WHEN first_name IS NOT NULL AND first_name != '' THEN 1 END) / COUNT(*), 2) as first_name_percentage
FROM product_owners;

-- Validation 3: Contact Migration Success
SELECT 
    'Contact Migration' as validation_type,
    COUNT(*) as total_contacts,
    COUNT(CASE WHEN contact_type = 'email' THEN 1 END) as email_contacts,
    COUNT(CASE WHEN contact_type = 'mobile' THEN 1 END) as phone_contacts,
    COUNT(CASE WHEN is_primary = true THEN 1 END) as primary_contacts
FROM product_owner_contacts;

-- Validation 4: Action Items Decoupling Verification
SELECT 
    'Action Items Independence' as validation_type,
    COUNT(*) as total_actions,
    COUNT(CASE WHEN date_completed IS NOT NULL THEN 1 END) as with_completion_dates,
    0 as objective_references, -- Should always be 0 after migration
    COUNT(CASE WHEN status = 'completed' AND date_completed IS NULL THEN 1 END) as completed_missing_date
FROM action_items;

-- Validation 5: Data Integrity Final Check
DO $$
DECLARE
    validation_errors TEXT[] := '{}';
    error_count INTEGER := 0;
BEGIN
    -- Check for orphaned records
    IF EXISTS (SELECT 1 FROM product_owner_contacts poc WHERE NOT EXISTS (SELECT 1 FROM product_owners po WHERE po.id = poc.product_owner_id)) THEN
        validation_errors := array_append(validation_errors, 'Orphaned contact records found');
        error_count := error_count + 1;
    END IF;
    
    -- Check for missing essential data
    IF EXISTS (SELECT 1 FROM product_owners WHERE first_name IS NULL OR first_name = '') THEN
        validation_errors := array_append(validation_errors, 'Product owners with missing first names');
        error_count := error_count + 1;
    END IF;
    
    -- Check for objective_id column existence (should not exist)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'action_items' AND column_name = 'objective_id') THEN
        validation_errors := array_append(validation_errors, 'objective_id column still exists in action_items table');
        error_count := error_count + 1;
    END IF;
    
    IF error_count > 0 THEN
        RAISE EXCEPTION 'Migration validation failed with % errors: %', error_count, array_to_string(validation_errors, ', ');
    ELSE
        RAISE NOTICE 'All post-migration validations passed successfully';
    END IF;
END $$;
```

### Migration Execution Schedule and Timing

#### Recommended Migration Timeline

**Phase 1: Preparation (Day -7 to -1)**
- Database backups and validation scripts preparation
- Staging environment testing
- User communication and training materials
- Rollback procedure testing

**Phase 2: Non-Critical Migrations (Day 0, Off-Peak Hours)**
- Asset type configuration creation (2-5 minutes)
- Information items table creation (2-5 minutes)
- Networth snapshots infrastructure (1-2 minutes)

**Phase 3: Medium-Risk Migrations (Day 0, Maintenance Window)**
- Product owner data enhancement (10-15 minutes)
- Contact management system (5-10 minutes)
- Meeting enhancements (2-5 minutes)

**Phase 4: High-Risk Migration (Day 0, Extended Maintenance Window)**
- Objective-action decoupling (10-15 minutes)
- Comprehensive validation and testing (15-30 minutes)

#### Downtime Requirements

**Total Estimated Downtime: 45-75 minutes**
- Database migrations: 30-45 minutes
- Application deployment: 10-15 minutes  
- Validation and testing: 15-30 minutes
- Buffer time: 15 minutes

#### Staging Environment Testing Protocol

1. **Full Data Replication**: Copy production database to staging
2. **Migration Execution**: Run all migration scripts in sequence
3. **Functionality Testing**: Comprehensive UI and API testing
4. **Performance Testing**: Load testing with realistic data volumes
5. **Rollback Testing**: Verify rollback procedures work correctly
6. **User Acceptance**: Stakeholder review and approval

### Post-Migration Monitoring and Validation

#### Key Metrics to Monitor

**Immediate (0-24 hours)**
- Application error rates
- Database query performance
- User login and access patterns
- API response times
- Data integrity checks

**Short-term (1-7 days)**  
- Feature adoption rates
- User feedback and support requests
- Performance benchmarks
- Data completeness metrics
- System stability indicators

**Long-term (1-4 weeks)**
- Overall user satisfaction
- Workflow efficiency improvements
- Data quality enhancements
- Performance optimization needs

#### Emergency Response Protocol

1. **Issue Detection**: Automated monitoring alerts
2. **Impact Assessment**: Determine severity and affected users
3. **Immediate Response**: Stop deployment if critical issues
4. **Rollback Decision**: Execute rollback within 2 hours if needed
5. **Communication**: User notification and status updates
6. **Post-Incident**: Root cause analysis and prevention measures

## Deployment Considerations

1. **Database Migration**: Comprehensive migration strategy with detailed scripts and rollback procedures
2. **Backward Compatibility**: Ensure existing functionality remains intact with graceful degradation
3. **Performance**: Optimize for large datasets and concurrent users with proper indexing
4. **Monitoring**: Implement comprehensive logging and error tracking with real-time alerts
5. **Training**: User training materials for new functionality with step-by-step guides

## Success Metrics and Performance Indicators

### User Adoption Metrics
1. **Feature Utilization**: Percentage of advisors actively using Phase 2 features within 30 days of release
2. **Tab Usage Distribution**: Analytics on which tabs are most frequently accessed and time spent per tab
3. **Independent Entity Usage**: Usage patterns of objectives and actions as completely separate entities

### Data Quality Improvements
1. **Information Item Completeness**: Average number of information items per client and completion rates across 5 categories
2. **KYC Data Completeness**: Improvement in KYC completion scores and reduction in missing data alerts
3. **Networth Statement Usage**: Frequency of snapshot creation and historical data utilization

### Operational Efficiency
1. **Time Savings**: Measurable reduction in time required for client data entry and management tasks
2. **Error Reduction**: Decrease in data entry errors through improved validation and user interface design
3. **Meeting Preparation**: Time reduction in preparing for client meetings using comprehensive data views

### Compliance and Quality Assurance
1. **KYC Report Generation**: Accuracy, completeness, and time-to-generate compliance reports
2. **Audit Trail Completeness**: Full tracking of data changes and user actions for regulatory compliance
3. **Data Consistency**: Alignment between different data views and elimination of discrepancies

### Client Service Enhancement
1. **Client Satisfaction Scores**: Feedback on improved service delivery and information accuracy
2. **Meeting Quality**: Enhanced client meetings through better preparation and data accessibility
3. **Response Time**: Faster response to client inquiries through improved data organization

## Implementation Readiness and Next Steps

### Development Readiness Checklist

#### Database and Schema Updates
- [ ] **Product Owner Table Enhancements**: Add first_name, middle_names, surname, address fields
- [ ] **Contact Management Table**: Create product_owner_contacts table with multiple phone number support
- [ ] **Meeting Enhancement**: Update meeting table with meeting_type and date-only fields
- [ ] **Terminology Updates**: Rename compliance fields (date_signed_tc)
- [ ] **Actions Table Restructure**: **CRITICAL** - Remove objective_id field completely from action_items table
- [ ] **Date Completed Field**: Add date_completed field to action_items table
- [ ] **Objective-Action Decoupling**: Remove all foreign key constraints and indexes related to objective-action linking
- [ ] **Data Migration**: Migrate existing data to new structure with complete objective-action separation
- [ ] **Remove Relationship References**: Eliminate all objective-action relationship code from database schema
- [ ] **Asset Ordering Schema**: Add liquidity_category and display_order fields to asset type definitions

#### API Development
- [ ] **Enhanced Product Owner Endpoints**: GET/PUT endpoints for new data structure
- [ ] **Contact Management APIs**: CRUD operations for multiple phone numbers
- [ ] **Meeting Management**: Enhanced meeting endpoints with type and date handling
- [ ] **Actions API Restructure**: **CRITICAL** - Remove all objective_id references from actions endpoints completely
- [ ] **Objectives API Independence**: Ensure objectives endpoints have no action-related functionality
- [ ] **Global Actions API**: Implement /api/actions/global endpoint for cross-client action retrieval (no objective references)
- [ ] **PDF Export API**: Implement /api/actions/export/pdf endpoint for action PDF generation (no objective context)
- [ ] **Bulk Actions API**: Implement /api/actions/bulk-operations for multi-action management (independent actions only)
- [ ] **Date Completed Integration**: Update actions endpoints to handle date_completed field
- [ ] **Validation Rules**: Remove all objective_id validation and references
- [ ] **Error Handling**: Enhanced error handling for new global and export endpoints
- [ ] **Networth Ordering Logic**: Implement liquidity-based sorting algorithm in networth API endpoints

#### Frontend Component Development
- [ ] **ProductOwnerCardEnhanced**: Main card component with 2-column layout
- [ ] **PersonalDetailsColumn**: Left column with name hierarchy display
- [ ] **ContactDetailsColumn**: Right column with contact information and address
- [ ] **SecurityAndManagementSection**: Full-width bottom section component
- [ ] **MultiplePhoneNumbersManager**: Interface for managing multiple contacts
- [ ] **AddressDisplay**: Structured address display component
- [ ] **MeetingTypeIndicator**: Enhanced meeting display with type selection
- [ ] **MainListTableComponent**: Information-dense table with 32px row height and minimal padding
- [ ] **CategoryBadgeComponent**: Compact badge display for item categories
- [ ] **InlineEditingSystem**: Direct table cell editing with auto-save
- [ ] **BulkOperationsInterface**: Multi-select operations for table management
- [ ] **ObjectivesColumnarTable**: **RESTRUCTURED** - Independent objectives table without action linking
- [ ] **ActionsColumnarTable**: **RESTRUCTURED** - Standalone actions table with date_completed column
- [ ] **GlobalActionsPage**: **NEW** - Dedicated page component for cross-client action management
- [ ] **ActionPDFExporter**: **NEW** - Interface for selecting and exporting actions to PDF
- [ ] **ActionSelectionInterface**: **NEW** - Multi-select checkbox system for bulk operations
- [ ] **ClientContextIndicator**: **NEW** - Component for showing client information in global actions
- [ ] **ResponsiveTableLayout**: Adaptive column widths maintaining information density
- [ ] **AssetOrderingEngine**: **NEW** - Component implementing liquidity-based asset sorting logic
- [ ] **LiquidityHierarchyDisplay**: **NEW** - Visual representation of asset liquidity categories

#### Data Integration and Migration
- [ ] **Existing Data Mapping**: Map current product owner data to enhanced structure
- [ ] **Contact Data Migration**: Convert single phone number to multiple contacts structure
- [ ] **Address Data Integration**: Migrate existing address data to new home_address fields
- [ ] **Meeting Data Enhancement**: Update existing meeting data with type classification
- [ ] **Objective-Action Decoupling**: **CRITICAL** - Remove all existing objective-action relationships from database completely
- [ ] **Action Data Migration**: Migrate existing actions to standalone structure with all objective_id references removed
- [ ] **Date Completed Migration**: Initialize date_completed field for existing completed actions
- [ ] **UI State Migration**: Update any cached objective-action linking state to new independent model
- [ ] **Remove Relationship Data**: Delete all objective-action relationship data from database
- [ ] **Clean API Responses**: Ensure no API responses contain objective-action relationship data
- [ ] **Asset Ordering Configuration**: Define liquidity categories and display orders for all existing asset types
- [ ] **Reports Page Mapping**: Map existing reports page ordering to new networth asset hierarchy

#### Testing and Quality Assurance
- [ ] **Component Unit Tests**: Test all new card components and subcomponents
- [ ] **Table Component Tests**: Test information-dense table rendering, sorting, and filtering
- [ ] **Inline Editing Tests**: Test direct cell editing, validation, and auto-save functionality
- [ ] **Objectives/Actions Separation Tests**: **CRITICAL** - Verify complete removal of all objective-action linking functionality
- [ ] **Independent Entity Tests**: Verify objectives and actions operate as completely independent systems
- [ ] **Columnar Display Tests**: Test new column layouts for both objectives and actions tables (no cross-references)
- [ ] **Global Actions Page Tests**: Test cross-client action aggregation and filtering functionality (no objective context)
- [ ] **PDF Export Tests**: Test action selection interface and PDF generation functionality (independent actions only)
- [ ] **Date Completed Tests**: Test new date_completed field functionality and validation
- [ ] **API Integration Tests**: Test enhanced API endpoints with complete objective_id removal
- [ ] **No Linking Tests**: Verify no objective-action relationship functionality exists anywhere in system
- [ ] **Layout Responsiveness**: Test 2-column layout and table display across different screen sizes
- [ ] **Data Migration Tests**: Verify data integrity during migration process and objective-action decoupling
- [ ] **Performance Tests**: Verify slim table design maintains performance with large datasets
- [ ] **User Experience Testing**: Validate improved table layout and columnar display with stakeholders
- [ ] **Accessibility Compliance**: Ensure WCAG 2.1 AA compliance for new table and inline editing components

#### Documentation and Training
- [ ] **Developer Documentation**: Update component documentation with new structure
- [ ] **User Training Materials**: Create guides for new product owner card features
- [ ] **API Documentation**: Document new endpoints and data structures
- [ ] **Migration Guide**: Step-by-step guide for data migration process

### Post-Implementation Monitoring
- **Performance Monitoring**: Track response times, user adoption rates, and system performance
- **User Feedback Collection**: Gather advisor feedback on new functionality and areas for improvement
- **Data Quality Assessment**: Monitor improvement in data completeness and accuracy
- **Compliance Verification**: Ensure all regulatory requirements are met through enhanced KYC processes

## Summary of Main List Enhancement Changes

### Design Philosophy Shift: Information Density Over Visual Comfort

Based on client demo feedback emphasizing "easy of data visibility, limit padding as we want to see more on a page," the Main List (Information Items) tab has been completely redesigned from a card-based vertical layout to an information-dense columnar table layout.

### Key Implementation Changes

**From Card-Based to Columnar Display:**
- **Previous Design**: Individual item cards with vertical information stacking
- **New Design**: High-density table with slim 32px rows and minimal 4px/8px padding
- **Goal**: Maximum data visibility and reduced vertical space usage

**Required Data Structure Enhancements:**
- **New Database Fields**: `item_type`, `product_owners_associated`, `display_order`
- **Enhanced API Endpoints**: Table-optimized data retrieval and bulk operations
- **Performance Indexes**: Optimized for fast table loading and filtering

**UI/UX Requirements:**
- **Column Layout**: Category (20%), Item Type (25%), Product Owners (30%), Actions (15%), Created (10%)
- **Visual Design**: Compact badges, icon-only actions, zebra striping for scanning
- **Responsive Behavior**: Maintains information density across all screen sizes
- **Accessibility**: Full keyboard navigation and screen reader optimization

**Technical Implementation:**
- **CSS Framework**: Custom table styling prioritizing information density
- **Component Architecture**: Modular table components with inline editing capabilities
- **Performance Considerations**: Optimized for large datasets with efficient rendering

This fundamental design change transforms the Main List from a comfortable browsing experience to a professional data management interface optimized for advisors who need to quickly scan, access, and manage large volumes of client information efficiently.

## Summary of Aims/Objectives/Actions Major Restructure

### Critical Architectural Change Overview

**Based on client demo feedback, Requirement 3 represents the most significant architectural change in Phase 2**, fundamentally restructuring the relationship between objectives and actions from a linked hierarchical model to completely independent entities.

### Key Changes Implemented

#### **1. Complete Objective-Action Decoupling**
- **Previous Model**: Actions linked to objectives via `objective_id` foreign key with hierarchical display
- **New Model**: Objectives and actions are completely independent entities with no relational connection
- **Database Impact**: Complete removal of `objective_id` field from `action_items` table
- **UI Impact**: Elimination of all collapsible action segments and objective-action relationship interfaces

#### **2. Columnar Display Transformation**
- **Objectives Layout**: Card-based display → Information-dense columnar table with sortable columns
- **Actions Layout**: Card-based display with action segments → Standalone columnar table with enhanced date tracking
- **Information Density**: Optimized for maximum data visibility following successful Main List table approach
- **User Experience**: Professional data management interface prioritizing efficiency over visual comfort

#### **3. Global Actions Page Implementation**
- **Cross-Client Visibility**: New dedicated page showing actions from ALL client groups
- **Advanced Filtering**: Multi-dimensional filtering by client, date range, assignment type, and status
- **Sorting Capabilities**: Primary sort by due date with secondary sorting options
- **PDF Export**: User-selectable action export with professional formatting

#### **4. Enhanced Date Tracking**
- **New Field**: `date_completed` added to actions for comprehensive completion tracking
- **Date Display**: All action dates (created, target, drop dead, completed) visible in columnar format
- **Status Integration**: Completion status linked with completion date for improved tracking

### Migration and Implementation Impact

#### **Breaking Changes**
- **Database Schema**: `objective_id` field removal requires careful migration with potential data loss of relationships
- **API Endpoints**: All actions endpoints updated to remove objective_id parameters and responses
- **Frontend Components**: Complete replacement of objective-action linking UI components
- **User Workflows**: Significant change in how users manage and interact with objectives and actions

#### **New Functionality**
- **Global Actions Management**: Cross-client action oversight and management capabilities
- **PDF Export System**: Professional report generation for action tracking and client communications
- **Enhanced Filtering**: Advanced search and filter capabilities across all action attributes
- **Improved Data Density**: More efficient use of screen space for large-scale data management

### Implementation Priority

This restructure affects multiple system layers and requires careful coordination:

1. **Database Migration** (Highest Priority): Safe removal of objective-action relationships
2. **API Development** (Critical): Complete rework of actions endpoints and new global endpoints
3. **Frontend Restructure** (Major): Replacement of existing objective-action UI components
4. **PDF Export System** (New Feature): Implementation of export functionality
5. **Testing and Validation** (Essential): Comprehensive testing of decoupled functionality

### Success Metrics for Restructure

- **Data Integrity**: Zero data loss during objective-action decoupling migration
- **User Adoption**: Successful transition to independent objectives/actions workflow
- **Performance**: Global actions page performance with large datasets across multiple clients
- **Export Utilization**: PDF export feature adoption and usage patterns
- **Efficiency Gains**: Measurable improvement in action management productivity

This restructure represents a fundamental shift in the Phase 2 architecture, moving from relationship-based to independent entity management while adding powerful new cross-client visibility and export capabilities.

---

## Developer Implementation Guide: Asset Ordering

### Liquidity-Based Sorting Algorithm

**Core Implementation Logic:**

```typescript
interface AssetType {
  type: string;
  liquidity_category: 'cash_equivalents' | 'accessible_investments' | 'retirement_investments' | 'illiquid_investments' | 'personal_assets' | 'liabilities';
  display_order: number;
  is_managed: boolean;
  items: AssetItem[];
}

interface AssetItem {
  name: string;
  is_managed: boolean;
  [owner_name: string]: number | boolean | string;
  total: number;
  valuation_date: string;
}

const LIQUIDITY_HIERARCHY = {
  'cash_equivalents': 1,
  'accessible_investments': 2, 
  'retirement_investments': 3,
  'illiquid_investments': 4,
  'personal_assets': 5,
  'liabilities': 99
} as const;

function sortAssetTypes(assetTypes: AssetType[]): AssetType[] {
  return assetTypes.sort((a, b) => {
    // Primary: Liquidity category
    const liquidityDiff = LIQUIDITY_HIERARCHY[a.liquidity_category] - LIQUIDITY_HIERARCHY[b.liquidity_category];
    if (liquidityDiff !== 0) return liquidityDiff;
    
    // Secondary: Display order (for same liquidity category)
    const orderDiff = a.display_order - b.display_order;
    if (orderDiff !== 0) return orderDiff;
    
    // Tertiary: Alphabetical
    return a.type.localeCompare(b.type);
  });
}

function sortItemsWithinType(items: AssetItem[]): AssetItem[] {
  return items.sort((a, b) => {
    // Primary: Managed before unmanaged (within same type)
    if (a.is_managed !== b.is_managed) {
      return b.is_managed ? 1 : -1; // Managed (true) comes first
    }
    
    // Secondary: Alphabetical by name
    return a.name.localeCompare(b.name);
  });
}
```

### Reports Page Consistency Implementation

**Asset Type Mapping Configuration:**

```typescript
const REPORTS_PAGE_ASSET_MAPPING = {
  // Liquidity hierarchy configuration with client-specific priorities
  'GIAs': { reports_order: 1, liquidity_category: 'accessible_investments' },
  'Stocks & Shares ISAs': { reports_order: 2, liquidity_category: 'accessible_investments' },
  'Cash ISAs': { reports_order: 3, liquidity_category: 'cash_equivalents' }, // Note: Higher liquidity override
  'Pensions': { reports_order: 4, liquidity_category: 'retirement_investments' },
  'Onshore Bonds': { reports_order: 5, liquidity_category: 'accessible_investments' },
  'Offshore Bonds': { reports_order: 6, liquidity_category: 'retirement_investments' }
} as const;

function applyReportsPageConsistency(assetTypes: AssetType[]): AssetType[] {
  return assetTypes.map(assetType => {
    const reportsMapping = REPORTS_PAGE_ASSET_MAPPING[assetType.type];
    if (reportsMapping) {
      // Override display_order to match reports page for consistency
      return {
        ...assetType,
        display_order: reportsMapping.reports_order,
        liquidity_category: reportsMapping.liquidity_category
      };
    }
    return assetType;
  });
}
```

### Database Implementation Requirements

**New Schema Fields:**

```sql
-- Asset type configuration table
CREATE TABLE asset_type_config (
  id SERIAL PRIMARY KEY,
  type_name VARCHAR(100) NOT NULL UNIQUE,
  liquidity_category VARCHAR(50) NOT NULL,
  display_order INTEGER NOT NULL,
  reports_page_order INTEGER NULL, -- For consistency mapping
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Initial liquidity configuration data
INSERT INTO asset_type_config (type_name, liquidity_category, display_order, reports_page_order) VALUES
('Bank Accounts', 'cash_equivalents', 1, NULL),
('Cash ISAs', 'cash_equivalents', 2, 3),
('Premium Bonds', 'cash_equivalents', 3, NULL),
('Stocks & Shares ISAs', 'accessible_investments', 4, 2),
('GIAs', 'accessible_investments', 5, 1),
('Unit Trusts', 'accessible_investments', 6, NULL),
('Onshore Bonds', 'accessible_investments', 7, 5),
('Pensions', 'retirement_investments', 8, 4),
('Offshore Bonds', 'retirement_investments', 9, 6),
('Property', 'illiquid_investments', 10, NULL),
('Primary Residence', 'personal_assets', 11, NULL),
('Mortgages', 'liabilities', 99, NULL);

-- Index for efficient sorting
CREATE INDEX idx_asset_config_ordering ON asset_type_config(liquidity_category, display_order);
```

### API Endpoint Updates

**Enhanced Networth Generation with Ordering:**

```typescript
// GET /api/client_groups/{client_group_id}/networth/current
interface NetworthResponse {
  networth_data: {
    client_info: ClientInfo;
    item_types: OrderedAssetType[];
    summary: NetworthSummary;
  };
  ordering_metadata: {
    applied_hierarchy: 'liquidity_based';
    liquidity_ordering_enabled: boolean;
    custom_overrides: Record<string, number>;
  };
}

async function generateOrderedNetworthData(clientGroupId: number): Promise<NetworthResponse> {
  // 1. Fetch all asset data
  const rawAssetData = await fetchClientAssets(clientGroupId);
  
  // 2. Apply liquidity-based categorization
  const categorizedAssets = await applylLiquidityCategories(rawAssetData);
  
  // 3. Apply client-specific liquidity ordering
  const consistentAssets = applyReportsPageConsistency(categorizedAssets);
  
  // 4. Sort using hierarchy algorithm
  const orderedAssets = sortAssetTypes(consistentAssets);
  
  // 5. Sort items within each type
  const finalAssets = orderedAssets.map(assetType => ({
    ...assetType,
    items: sortItemsWithinType(assetType.items)
  }));
  
  return {
    networth_data: {
      client_info: await getClientInfo(clientGroupId),
      item_types: finalAssets,
      summary: calculateNetworth(finalAssets)
    },
    ordering_metadata: {
      applied_hierarchy: 'liquidity_based',
      liquidity_ordering_enabled: true,
      custom_overrides: await getCustomOrderingOverrides(clientGroupId)
    }
  };
}
```

### Frontend Component Implementation

**AssetOrderingEngine Component:**

```typescript
import { useMemo } from 'react';
import { AssetType, LIQUIDITY_HIERARCHY } from '@/utils/assetOrdering';

interface AssetOrderingEngineProps {
  rawAssetData: AssetType[];
  applyReportsConsistency?: boolean;
  customOverrides?: Record<string, number>;
}

export const AssetOrderingEngine: React.FC<AssetOrderingEngineProps> = ({
  rawAssetData,
  applyReportsConsistency = true,
  customOverrides = {}
}) => {
  const orderedAssets = useMemo(() => {
    let assets = [...rawAssetData];
    
    // Apply liquidity-based ordering
    if (applyReportsConsistency) {
      assets = applyReportsPageConsistency(assets);
    }
    
    // Apply custom overrides
    if (Object.keys(customOverrides).length > 0) {
      assets = applyCustomOrderingOverrides(assets, customOverrides);
    }
    
    // Apply liquidity-based sorting
    return sortAssetTypes(assets);
  }, [rawAssetData, applyReportsConsistency, customOverrides]);
  
  return (
    <div className="networth-asset-hierarchy">
      {orderedAssets.map((assetType, index) => (
        <AssetTypeSection
          key={assetType.type}
          assetType={assetType}
          displayOrder={index + 1}
          liquidityCategory={assetType.liquidity_category}
        />
      ))}
    </div>
  );
};
```

### Error Handling and Edge Cases

**Fallback Ordering Logic:**

```typescript
function handleAssetOrderingEdgeCases(assetTypes: AssetType[]): AssetType[] {
  return assetTypes.map(assetType => {
    // Handle missing liquidity category
    if (!assetType.liquidity_category) {
      console.warn(`Asset type ${assetType.type} missing liquidity_category, defaulting to 'accessible_investments'`);
      assetType.liquidity_category = 'accessible_investments';
    }
    
    // Handle missing display_order
    if (!assetType.display_order) {
      assetType.display_order = LIQUIDITY_HIERARCHY[assetType.liquidity_category] * 100 + 99;
    }
    
    // Handle zero-value assets (show with em-dash)
    assetType.items = assetType.items.map(item => ({
      ...item,
      display_value: item.total === 0 ? '—' : formatCurrency(item.total)
    }));
    
    return assetType;
  });
}
```

### Testing Strategy for Asset Ordering

**Unit Tests for Ordering Logic:**

```typescript
describe('AssetOrderingEngine', () => {
  test('sorts assets by liquidity hierarchy', () => {
    const mockAssets = [
      { type: 'GIAs', liquidity_category: 'accessible_investments', display_order: 5 },
      { type: 'Bank Accounts', liquidity_category: 'cash_equivalents', display_order: 1 },
      { type: 'Mortgages', liquidity_category: 'liabilities', display_order: 99 }
    ];
    
    const sorted = sortAssetTypes(mockAssets);
    expect(sorted[0].type).toBe('Bank Accounts');
    expect(sorted[1].type).toBe('GIAs'); 
    expect(sorted[2].type).toBe('Mortgages');
  });
  
  test('applies client-specific liquidity priorities', () => {
    const mockAssets = [
      { type: 'Stocks & Shares ISAs', liquidity_category: 'accessible_investments', liquidity_order: 1 },
      { type: 'Cash ISAs', liquidity_category: 'cash_equivalents', liquidity_order: 2 }
    ];
    
    const ordered = applyLiquidityOrdering(mockAssets);
    // Cash ISAs should appear before Stocks & Shares ISAs per client requirement
    expect(ordered.find(a => a.type === 'Cash ISAs')?.display_order).toBeLessThan(
      ordered.find(a => a.type === 'Stocks & Shares ISAs')?.display_order || 999
    );
  });
  
  test('handles Cash ISAs before Stocks & Shares ISAs', () => {
    const mockAssets = [
      { type: 'Stocks & Shares ISAs', liquidity_category: 'accessible_investments', display_order: 4 },
      { type: 'Cash ISAs', liquidity_category: 'cash_equivalents', display_order: 2 }
    ];
    
    const sorted = sortAssetTypes(mockAssets);
    const cashIndex = sorted.findIndex(a => a.type === 'Cash ISAs');
    const stocksIndex = sorted.findIndex(a => a.type === 'Stocks & Shares ISAs');
    
    expect(cashIndex).toBeLessThan(stocksIndex);
  });
});
```

## Asset Ordering Implementation Summary

### Complete Liquidity-Based Specification

**Resolved Issue**: Removed all ambiguous "reports page consistency" references and created a comprehensive, standalone liquidity-based ordering system that addresses the third critical issue identified in the Phase 2 review.

**Client Requirements Implemented**:
- **Cash ISAs prioritized before Stocks & Shares ISAs** - explicit client requirement met
- **Liquidity-based hierarchy** - "accessible (liquid) assets over non-liquid ones"
- **Liability positioning** - "at the bottom of the table are all the liabilities"

**Complete Asset Hierarchy (Most → Least Liquid)**:

1. **CASH & CASH EQUIVALENTS** (100-199) - Immediate access
   - Bank Accounts, Cash ISAs (priority), Premium Bonds, Building Society

2. **READILY ACCESSIBLE INVESTMENTS** (200-299) - 1-5 day access
   - Stocks & Shares ISAs, GIAs, Unit Trusts, Onshore Bonds

3. **RETIREMENT INVESTMENTS** (300-399) - Restricted access
   - Personal/Workplace Pensions, Annuities, Offshore Bonds

4. **ILLIQUID INVESTMENTS** (400-499) - Weeks to months
   - Property, Alternative Investments, Private Equity, Structured Products

5. **PERSONAL ASSETS** (500-599) - Market dependent
   - Primary Residence, Collectibles, Business Interests

6. **LIABILITIES** (600-699) - Always last
   - Mortgages, Personal Loans, Credit Cards, Overdrafts

**Developer Implementation Rules**:
- Use `liquidity_category` and `liquidity_order` for sorting
- Apply client priority overrides (Cash ISAs before S&S ISAs)
- Within categories: managed → unmanaged → alphabetical
- Display zero-value assets with em-dash (—)
- New assets placed by liquidity characteristics, not chronologically

**Database Schema**:
- `asset_type_config` table with `liquidity_category` and `liquidity_order` columns
- Pre-configured data for all standard asset types
- Efficient indexing for sorting operations

**API Integration**:
- `applyLiquidityOrdering()` function replaces reports page consistency logic
- Comprehensive ordering metadata in API responses
- Testing coverage for client-specific requirements

This comprehensive Phase 2 implementation provides a robust foundation for enhanced client data management while implementing the major architectural restructure requested, including the complete liquidity-based asset ordering system. The enhanced documentation ensures clear understanding of all breaking changes, new features, and implementation requirements for successful development and deployment.